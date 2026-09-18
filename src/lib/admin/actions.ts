"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
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
