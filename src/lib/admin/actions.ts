"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { track } from "@/lib/analytics/track";
import { getCurrentProfile } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";

type Result = { ok: true } | { ok: false; error: string };

async function requireAdminProfile() {
  const profile = await getCurrentProfile();
  return profile && profile.role === "admin" && !profile.deleted_at ? profile : null;
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
  return { ok: true };
}

export async function grantAccessByAliasAction(
  rawAlias: unknown,
  rawDays: unknown,
  rawReason: unknown,
): Promise<Result> {
  const admin = await requireAdminProfile();
  if (!admin) return { ok: false, error: "unauthorized" };
  const parsed = z
    .object({
      alias: z.string().trim().toLowerCase().min(3).max(20),
      days: z.coerce.number().int().min(1).max(3650).nullable(),
      reason: z.string().trim().min(3).max(500),
    })
    .safeParse({
      alias: rawAlias,
      days: rawDays === "" || rawDays === null || rawDays === undefined ? null : rawDays,
      reason: rawReason,
    });
  if (!parsed.success) return { ok: false, error: "validation" };
  const client = createAdminClient();
  const { data: target } = await client
    .from("profiles")
    .select("id")
    .eq("alias", parsed.data.alias)
    .is("deleted_at", null)
    .maybeSingle();
  if (!target) return { ok: false, error: "user_not_found" };
  const { error } = await client.rpc("grant_entitlement", {
    p_user_id: target.id,
    p_source: "admin",
    p_source_id: null,
    p_access_days: parsed.data.days,
    p_created_by: admin.id,
    p_reason: parsed.data.reason,
  });
  if (error) return { ok: false, error: "unknown" };
  revalidatePath("/admin/accesos");
  return { ok: true };
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

const optionalInt = (max: number) =>
  z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? null : v),
    z.coerce.number().int().min(1).max(max).nullable(),
  );

export async function createPromoCodeAction(raw: unknown): Promise<Result> {
  const admin = await requireAdminProfile();
  if (!admin) return { ok: false, error: "unauthorized" };
  const parsed = z
    .object({
      code: z
        .string()
        .trim()
        .toUpperCase()
        .regex(/^[A-Z0-9-]{4,40}$/),
      kind: z.enum(["scholarship", "discount"]),
      accessDays: optionalInt(3650),
      discountPercent: optionalInt(100),
      maxRedemptions: optionalInt(100000),
      expiresAt: z.preprocess((v) => (v === "" ? null : v), z.iso.date().nullable()),
      note: z.string().trim().max(300),
    })
    .refine(
      (v) => (v.kind === "scholarship" ? v.accessDays !== null : v.discountPercent !== null),
      { message: "kind_fields" },
    )
    .safeParse(raw);
  if (!parsed.success) return { ok: false, error: "validation" };
  const v = parsed.data;
  const { error } = await createAdminClient().rpc("create_promo_code", {
    p_code: v.code,
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
  return { ok: true };
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
