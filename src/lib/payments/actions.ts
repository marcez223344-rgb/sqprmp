"use server";

import type { Route } from "next";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { track } from "@/lib/analytics/track";
import { limits } from "@/config/limits";
import { manualTransferChannels, transferChannelIsReady } from "@/config/pricing";
import { clientEnv } from "@/lib/env/client";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth/session";
import { loadPromoRedemptionEvent } from "@/lib/notifications/events";
import { notifyOwnerAfterResponse } from "@/lib/notifications/owner";
import { getProvider } from "@/lib/payments/index";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type Result<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

async function limited(
  key: string,
  rule: { capacity: number; refillPerSecond: number },
): Promise<boolean> {
  const { data, error } = await createAdminClient().rpc("consume_rate_limit", {
    p_key: key,
    p_capacity: rule.capacity,
    p_refill_per_second: rule.refillPerSecond,
  });
  return Boolean(error) || data === false;
}

const channelIds = manualTransferChannels.map((c) => c.id) as [string, ...string[]];

export async function createManualPurchaseAction(
  rawPriceId: unknown,
  rawChannel: unknown,
): Promise<Result<{ referenceCode: string }>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthorized" };
  const parsed = z
    .object({ priceId: z.uuid(), channel: z.enum(channelIds) })
    .safeParse({ priceId: rawPriceId, channel: rawChannel });
  if (!parsed.success) return { ok: false, error: "validation" };
  // The UI hides channels whose transfer details are still placeholders, but the channel id
  // arrives from the browser: a purchase must never be opened against an unpayable channel.
  if (!transferChannelIsReady(parsed.data.channel as (typeof manualTransferChannels)[number]["id"]))
    return { ok: false, error: "validation" };
  if (await limited(`checkout:${user.id}`, limits.rateLimits.checkout))
    return { ok: false, error: "rate_limited" };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_manual_purchase", {
    p_price_id: parsed.data.priceId,
    p_channel: parsed.data.channel,
  });
  if (error) {
    const detail = error.details ?? "";
    return {
      ok: false,
      error: detail.includes("already_entitled")
        ? "already_entitled"
        : detail.includes("pending_exists")
          ? "pending_exists"
          : "unknown",
    };
  }
  const row = data?.[0];
  if (!row) return { ok: false, error: "unknown" };
  const { data: priceRow } = await supabase
    .from("prices")
    .select("currency, products(slug)")
    .eq("id", parsed.data.priceId)
    .maybeSingle();
  await track(
    "checkout_started",
    {
      product_slug: (priceRow?.products as { slug: string } | null)?.slug ?? "unknown",
      provider: "manual",
      currency: priceRow?.currency ?? "USD",
    },
    { userId: user.id },
  );
  revalidatePath("/acceso");
  return { ok: true, data: { referenceCode: row.reference_code } };
}

export async function cancelManualPurchaseAction(rawId: unknown): Promise<Result> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthorized" };
  const id = z.uuid().safeParse(rawId);
  if (!id.success) return { ok: false, error: "validation" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_manual_purchase", { p_purchase_id: id.data });
  if (error) return { ok: false, error: "unknown" };
  revalidatePath("/acceso");
  return { ok: true };
}

export async function redeemPromoAction(
  rawCode: unknown,
): Promise<Result<{ kind: string; access_days: number | null; discount_percent: number | null }>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthorized" };
  const code = z.string().trim().min(3).max(40).safeParse(rawCode);
  if (!code.success) return { ok: false, error: "validation" };
  if (await limited(`promo:${user.id}`, limits.rateLimits.promo))
    return { ok: false, error: "rate_limited" };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("redeem_promo", { p_code: code.data });
  if (error) {
    const detail = error.details ?? "";
    const known = ["promo_invalid", "promo_expired", "promo_exhausted", "promo_used"].find((k) =>
      detail.includes(k),
    );
    return { ok: false, error: known ?? "unknown" };
  }
  const row = data?.[0];
  await track("promo_redeemed", { kind: row?.kind ?? "discount" }, { userId: user.id });
  // Owner alert (D-43), after the redemption is committed and after the response.
  const userId = user.id;
  notifyOwnerAfterResponse(() => loadPromoRedemptionEvent(userId));
  revalidatePath("/admin/promos");
  revalidatePath("/acceso");
  return {
    ok: true,
    data: {
      kind: row?.kind ?? "discount",
      access_days: row?.access_days ?? null,
      discount_percent: row?.discount_percent ?? null,
    },
  };
}

/** Hosted checkout: builds the provider URL (with our user id as tracking) and redirects. */
export async function startHostedCheckoutAction(formData: FormData) {
  const profile = await getCurrentProfile();
  const user = await getCurrentUser();
  if (!profile || !user?.email) redirect("/ingresar?next=%2Fprecios");
  const parsed = z
    .object({ providerId: z.enum(["hotmart", "mercadopago"]), priceId: z.uuid() })
    .safeParse({
      providerId: formData.get("provider")?.toString(),
      priceId: formData.get("price")?.toString(),
    });
  if (!parsed.success) redirect("/precios?error=validation");
  if (await limited(`checkout:${user.id}`, limits.rateLimits.checkout))
    redirect("/precios?error=rate_limited");
  const provider = getProvider(parsed.data.providerId);
  if (!provider) redirect("/precios?error=provider");
  const supabase = await createClient();
  const { data: price } = await supabase
    .from("prices")
    .select("id, amount_minor, currency, products(slug)")
    .eq("id", parsed.data.priceId)
    .eq("provider", provider.id)
    .eq("is_active", true)
    .maybeSingle();
  if (!price) redirect("/precios?error=price");
  const appUrl = clientEnv().NEXT_PUBLIC_APP_URL;
  const result = await provider.createCheckout({
    userId: user.id,
    userEmail: user.email,
    priceId: price.id,
    amountMinor: price.amount_minor,
    currency: price.currency,
    successUrl: `${appUrl}/acceso?checkout=success`,
    cancelUrl: `${appUrl}/precios?checkout=cancel`,
  });
  if (!result.redirectUrl) redirect("/precios?error=provider_not_configured");
  await track(
    "checkout_started",
    {
      product_slug: (price.products as { slug: string } | null)?.slug ?? "unknown",
      provider: provider.id,
      currency: price.currency,
    },
    { userId: user.id },
  );
  // External hosted checkout URL.
  redirect(result.redirectUrl as Route);
}

/**
 * Dismisses the "your access is active" notice. Acknowledging is the learner's own record, so it
 * goes through a definer RPC scoped to `auth.uid()`; nothing about access itself is writable here.
 */
export async function acknowledgeAccessNoticeAction(): Promise<Result> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthorized" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("acknowledge_entitlements");
  if (error) return { ok: false, error: "unknown" };
  revalidatePath("/acceso");
  return { ok: true };
}
