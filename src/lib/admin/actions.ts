"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { limits } from "@/config/limits";
import { track } from "@/lib/analytics/track";
import { searchLearnersAdmin } from "@/lib/admin/queries";
import { getCurrentProfile } from "@/lib/auth/session";
import { ACCESS_GRANT_KINDS, MAX_ACCESS_DAYS } from "@/lib/payments/access-grants";
import { generatePromoCode } from "@/lib/payments/promo-code";
import { promoCodeInputSchema } from "@/lib/payments/promo-schema";
import { createAdminClient } from "@/lib/supabase/admin";

type Result = { ok: true } | { ok: false; error: string };
type ResultWith<T> = { ok: true; data: T } | { ok: false; error: string };

async function requireAdminProfile() {
  const profile = await getCurrentProfile();
  return profile && profile.role === "admin" && !profile.deleted_at ? profile : null;
}

/** Token bucket shared with the learner-facing actions; admin calls are user-triggered too. */
async function limited(key: string, rule: { capacity: number; refillPerSecond: number }) {
  const { data, error } = await createAdminClient().rpc("consume_rate_limit", {
    p_key: key,
    p_capacity: rule.capacity,
    p_refill_per_second: rule.refillPerSecond,
  });
  return Boolean(error) || data === false;
}

export async function reviewManualPurchaseAction(
  rawId: unknown,
  rawApprove: unknown,
  rawNote: unknown,
): Promise<Result> {
  const admin = await requireAdminProfile();
  if (!admin) return { ok: false, error: "unauthorized" };
  const parsed = z
    .object({ id: z.uuid(), approve: z.boolean(), note: z.string().trim().max(500).optional() })
    .safeParse({ id: rawId, approve: rawApprove === true, note: rawNote ?? undefined });
  if (!parsed.success) return { ok: false, error: "validation" };
  const { error } = await createAdminClient().rpc("review_manual_purchase", {
    p_purchase_id: parsed.data.id,
    p_actor: admin.id,
    p_approve: parsed.data.approve,
    p_note: parsed.data.note ?? null,
  });
  if (error) return { ok: false, error: "unknown" };
  if (parsed.data.approve) {
    const { data: p } = await createAdminClient()
      .from("purchases")
      .select("user_id, currency, amount_minor, prices(products(slug))")
      .eq("id", parsed.data.id)
      .maybeSingle();
    if (p)
      await track(
        "purchase_completed",
        {
          product_slug:
            (p.prices as { products: { slug: string } | null } | null)?.products?.slug ?? null,
          provider: "manual",
          currency: p.currency,
          amount_minor: p.amount_minor,
        },
        { userId: p.user_id },
      );
  }
  revalidatePath("/admin/accesos");
  revalidatePath("/acceso");
  revalidatePath("/ruta");
  return { ok: true };
}

/**
 * Gives a learner access, saying which of the two things happened (owner feedback item 22):
 *
 *   kind = "comp"    beca / cortesía — nobody paid. Entitlement source `admin` ("otorgado").
 *   kind = "payment" the learner transferred the money outside the app. An approved purchase is
 *                    recorded with the amount, the currency and the bank reference, and the
 *                    entitlement is sourced from it ("pagado"), so revenue figures are truthful.
 *
 * The learner is chosen by id from the picker; the alias field is gone (item 21). Both branches
 * are audit-logged inside `admin_grant_access`.
 */
export async function grantAccessAction(raw: unknown): Promise<Result> {
  const admin = await requireAdminProfile();
  if (!admin) return { ok: false, error: "unauthorized" };
  const parsed = z
    .object({
      userId: z.uuid(),
      kind: z.enum(ACCESS_GRANT_KINDS),
      days: z.preprocess(
        (v) => (v === "" || v === null || v === undefined ? null : v),
        z.coerce.number().int().min(1).max(MAX_ACCESS_DAYS).nullable(),
      ),
      reference: z.preprocess(
        (v) => (typeof v === "string" ? v.trim() : v),
        z
          .string()
          .max(60)
          .regex(/^[A-Za-z0-9 ._/-]*$/)
          .optional(),
      ),
      reason: z.string().trim().min(3).max(500),
    })
    .safeParse(raw);
  if (!parsed.success) return { ok: false, error: "validation" };
  if (await limited(`admin-grant:${admin.id}`, limits.rateLimits.checkout))
    return { ok: false, error: "rate_limited" };

  const client = createAdminClient();
  const { error } = await client.rpc("admin_grant_access", {
    p_user_id: parsed.data.userId,
    p_kind: parsed.data.kind,
    p_access_days: parsed.data.days,
    p_actor: admin.id,
    p_reason: parsed.data.reason,
    p_price_id: null,
    p_amount_minor: null,
    p_currency: null,
    p_reference: parsed.data.reference || null,
  });
  if (error) return { ok: false, error: error.code === "P0002" ? "user_not_found" : "unknown" };

  // The funnel event is emitted with the figures actually written, never with placeholders: an
  // invented amount would show up as revenue in the analytics and nowhere in the books.
  if (parsed.data.kind === "payment") {
    const { data: purchase } = await client
      .from("purchases")
      .select("amount_minor, currency, prices(products(slug))")
      .eq("user_id", parsed.data.userId)
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (purchase)
      await track(
        "purchase_completed",
        {
          product_slug:
            (purchase.prices as { products: { slug: string } | null } | null)?.products?.slug ??
            null,
          provider: "manual",
          currency: purchase.currency,
          amount_minor: purchase.amount_minor,
        },
        { userId: parsed.data.userId },
      );
  }
  revalidatePath("/admin/accesos");
  revalidatePath("/admin/usuarios");
  // The learner's own pages read the entitlement on the server, but their cached RSC payloads
  // would otherwise keep the pre-grant answer until the client router cache expires.
  revalidatePath("/acceso");
  revalidatePath("/ruta");
  revalidatePath("/aprender");
  return { ok: true };
}

/** Learner picker for the admin forms. Admin-only, rate limited, never returns an email. */
export async function searchLearnersAction(
  rawQuery: unknown,
): Promise<
  ResultWith<
    { id: string; alias: string | null; displayName: string | null; entitlement: string }[]
  >
> {
  const admin = await requireAdminProfile();
  if (!admin) return { ok: false, error: "unauthorized" };
  const parsed = z
    .string()
    .trim()
    .min(limits.admin.learnerPickerMinChars)
    .max(60)
    .regex(/^[\p{L}\p{N} ._-]*$/u)
    .safeParse(rawQuery);
  if (!parsed.success) return { ok: true, data: [] };
  if (await limited(`admin-search:${admin.id}`, limits.rateLimits.adminSearch))
    return { ok: false, error: "rate_limited" };
  return { ok: true, data: await searchLearnersAdmin(parsed.data) };
}

export async function revokeEntitlementAction(rawId: unknown, rawReason: unknown): Promise<Result> {
  const admin = await requireAdminProfile();
  if (!admin) return { ok: false, error: "unauthorized" };
  const parsed = z
    .object({ id: z.uuid(), reason: z.string().trim().min(3).max(500) })
    .safeParse({ id: rawId, reason: rawReason });
  if (!parsed.success) return { ok: false, error: "validation" };
  const { error } = await createAdminClient().rpc("revoke_entitlement", {
    p_entitlement_id: parsed.data.id,
    p_actor: admin.id,
    p_reason: parsed.data.reason,
  });
  if (error) return { ok: false, error: "unknown" };
  revalidatePath("/admin/accesos");
  return { ok: true };
}

const reasonSchema = z.string().trim().min(3).max(500);

export async function reconcilePaymentEventAction(
  rawEventId: unknown,
  rawAlias: unknown,
  rawPriceId: unknown,
  rawReason: unknown,
): Promise<Result> {
  const admin = await requireAdminProfile();
  if (!admin) return { ok: false, error: "unauthorized" };
  const parsed = z
    .object({
      eventId: z.uuid(),
      alias: z.string().trim().toLowerCase().min(3).max(20),
      priceId: z.uuid(),
      reason: reasonSchema,
    })
    .safeParse({ eventId: rawEventId, alias: rawAlias, priceId: rawPriceId, reason: rawReason });
  if (!parsed.success) return { ok: false, error: "validation" };
  const client = createAdminClient();
  const { data: target } = await client
    .from("profiles")
    .select("id")
    .eq("alias", parsed.data.alias)
    .is("deleted_at", null)
    .maybeSingle();
  if (!target) return { ok: false, error: "user_not_found" };
  const { error } = await client.rpc("reconcile_payment_event", {
    p_event_id: parsed.data.eventId,
    p_actor: admin.id,
    p_user_id: target.id,
    p_price_id: parsed.data.priceId,
    p_reason: parsed.data.reason,
  });
  if (error) return { ok: false, error: error.code === "P0001" ? "not_reconcilable" : "unknown" };
  revalidatePath("/admin/pagos");
  return { ok: true };
}

export async function revokeCertificateAction(
  rawPublicId: unknown,
  rawReason: unknown,
): Promise<Result> {
  const admin = await requireAdminProfile();
  if (!admin) return { ok: false, error: "unauthorized" };
  const parsed = z
    .object({ publicId: z.string().regex(/^DMSA-\d{4}-[A-Z0-9]{8}$/), reason: reasonSchema })
    .safeParse({ publicId: rawPublicId, reason: rawReason });
  if (!parsed.success) return { ok: false, error: "validation" };
  const { error } = await createAdminClient().rpc("revoke_certificate", {
    p_public_id: parsed.data.publicId,
    p_actor: admin.id,
    p_reason: parsed.data.reason,
  });
  if (error) return { ok: false, error: "unknown" };
  revalidatePath("/admin/certificados");
  return { ok: true };
}

export async function setFeatureFlagAction(
  rawKey: unknown,
  rawEnabled: unknown,
  rawIsPublic: unknown,
  rawReason: unknown,
): Promise<Result> {
  const admin = await requireAdminProfile();
  if (!admin) return { ok: false, error: "unauthorized" };
  const parsed = z
    .object({
      key: z.string().regex(/^[a-z][a-zA-Z0-9_]{1,60}$/),
      enabled: z.boolean(),
      isPublic: z.boolean(),
      reason: reasonSchema,
    })
    .safeParse({
      key: rawKey,
      enabled: rawEnabled === true,
      isPublic: rawIsPublic === true,
      reason: rawReason,
    });
  if (!parsed.success) return { ok: false, error: "validation" };
  const { error } = await createAdminClient().rpc("set_feature_flag", {
    p_key: parsed.data.key,
    p_enabled: parsed.data.enabled,
    p_is_public: parsed.data.isPublic,
    p_actor: admin.id,
    p_reason: parsed.data.reason,
  });
  if (error) return { ok: false, error: "unknown" };
  revalidatePath("/admin/flags");
  return { ok: true };
}

export async function createPromoCodeAction(raw: unknown): Promise<ResultWith<{ code: string }>> {
  const admin = await requireAdminProfile();
  if (!admin) return { ok: false, error: "unauthorized" };
  // `promoCodeInputSchema` is the only place the redemption cap rule lives, and it refuses a null
  // cap that is not accompanied by an explicit `unlimited` (see src/lib/payments/promo-schema.ts).
  const parsed = promoCodeInputSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.some((i) => i.message === "max_redemptions_required")
        ? "max_redemptions_required"
        : "validation",
    };
  }
  if (await limited(`admin-promo:${admin.id}`, limits.rateLimits.checkout))
    return { ok: false, error: "rate_limited" };
  const v = parsed.data;
  const code = v.code || generatePromoCode(v.kind === "scholarship" ? "BECA" : "DMSA");
  const { error } = await createAdminClient().rpc("create_promo_code", {
    p_code: code,
    p_kind: v.kind,
    p_access_days: v.kind === "scholarship" ? v.accessDays : null,
    p_discount_percent: v.kind === "discount" ? v.discountPercent : null,
    p_max_redemptions: v.maxRedemptions,
    p_expires_at: v.expiresAt ? `${v.expiresAt}T23:59:59Z` : null,
    p_note: v.note || null,
    p_actor: admin.id,
  });
  if (error) return { ok: false, error: error.code === "23505" ? "duplicate" : "unknown" };
  revalidatePath("/admin/promos");
  return { ok: true, data: { code } };
}

export async function setPromoCodeActiveAction(
  rawId: unknown,
  rawActive: unknown,
): Promise<Result> {
  const admin = await requireAdminProfile();
  if (!admin) return { ok: false, error: "unauthorized" };
  const parsed = z
    .object({ id: z.uuid(), active: z.boolean() })
    .safeParse({ id: rawId, active: rawActive === true });
  if (!parsed.success) return { ok: false, error: "validation" };
  const { error } = await createAdminClient().rpc("set_promo_code_active", {
    p_id: parsed.data.id,
    p_active: parsed.data.active,
    p_actor: admin.id,
  });
  if (error) return { ok: false, error: "unknown" };
  revalidatePath("/admin/promos");
  return { ok: true };
}

/**
 * «Marcar resuelto» on a learner's exercise report (D-42). The update and the audit row are
 * written together inside `admin_resolve_exercise_report`, with the admin's reason.
 */
export async function resolveExerciseReportAction(
  rawId: unknown,
  rawReason: unknown,
): Promise<Result> {
  const admin = await requireAdminProfile();
  if (!admin) return { ok: false, error: "unauthorized" };
  const parsed = z
    .object({ id: z.uuid(), reason: reasonSchema })
    .safeParse({ id: rawId, reason: rawReason });
  if (!parsed.success) return { ok: false, error: "validation" };
  const { error } = await createAdminClient().rpc("admin_resolve_exercise_report", {
    p_report_id: parsed.data.id,
    p_actor: admin.id,
    p_reason: parsed.data.reason,
  });
  if (error) return { ok: false, error: error.code === "P0002" ? "not_found" : "unknown" };
  revalidatePath("/admin/reportes");
  revalidatePath("/admin");
  return { ok: true };
}
