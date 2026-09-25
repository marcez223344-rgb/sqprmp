import "server-only";
import type { OwnerEvent } from "@/lib/notifications/owner-email";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * The redemption the learner just made, read back with the admin client after the response
 * (`promo_codes` is admin-only). `redeem_promo` returns the kind and value but not the canonical
 * code or its remaining uses, and a learner can redeem a given code only once, so their newest
 * redemption is the one that just happened.
 */
export async function loadPromoRedemptionEvent(userId: string): Promise<OwnerEvent | null> {
  const { data, error } = await createAdminClient()
    .from("promo_redemptions")
    .select(
      "created_at, promo_codes(code, kind, access_days, discount_percent, max_redemptions, redemptions_count), profiles!promo_redemptions_user_id_fkey(alias)",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data?.promo_codes) return null;
  const code = data.promo_codes as {
    code: string;
    kind: string;
    access_days: number | null;
    discount_percent: number | null;
    max_redemptions: number | null;
    redemptions_count: number;
  };
  return {
    type: "promo_redemption",
    alias: (data.profiles as { alias: string | null } | null)?.alias ?? null,
    code: code.code,
    kind: code.kind,
    accessDays: code.access_days,
    discountPercent: code.discount_percent,
    maxRedemptions: code.max_redemptions,
    redemptionsCount: code.redemptions_count,
  };
}
