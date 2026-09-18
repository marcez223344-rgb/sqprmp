import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/** Admin-only reads (the caller must have passed requireAdmin()). */
export async function getAccessAdminData() {
  const admin = createAdminClient();
  const [{ data: pending }, { data: entitlements }] = await Promise.all([
    admin
      .from("purchases")
      .select(
        "id, user_id, reference_code, channel, amount_minor, currency, created_at, profiles!purchases_user_id_fkey(alias, display_name)",
      )
      .eq("status", "pending")
      .order("created_at"),
    admin
      .from("entitlements")
      .select(
        "id, user_id, source, starts_at, ends_at, revoked_at, revoked_reason, profiles!entitlements_user_id_fkey(alias)",
      )
      .order("created_at", { ascending: false })
      .limit(50),
  ]);
  return { pending: pending ?? [], entitlements: entitlements ?? [] };
}
