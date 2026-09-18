import "server-only";
import { z } from "zod";
import { limits } from "@/config/limits";
import { serverEnv } from "@/lib/env/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Json, Profile } from "@/types/database";
import { getProvider } from "./index";
import type { PaymentStatus } from "./types";

/** Global per-provider bucket so a flood cannot exhaust the function. */
export async function webhookRateLimited(providerId: string): Promise<boolean> {
  const { data, error } = await createAdminClient().rpc("consume_rate_limit", {
    p_key: `webhook:${providerId}`,
    p_capacity: limits.rateLimits.webhook.capacity,
    p_refill_per_second: limits.rateLimits.webhook.refillPerSecond,
  });
  return Boolean(error) || data === false;
}

export type WebhookOutcome =
  | "processed"
  | "duplicate"
  | "invalid_signature"
  | "unmatched"
  | "ignored"
  | "provider_unknown"
  | "unverified";

/**
 * Webhook pipeline (docs/SECURITY.md §6): verify → persist idempotently → re-fetch from the
 * provider API → apply in one transaction. Access is never granted from the webhook body alone
 * unless HOTMART_SKIP_REFETCH is set (non-production only).
 */
export async function processWebhook(
  providerId: string,
  rawBody: string,
  headers: Headers,
): Promise<WebhookOutcome> {
  const provider = getProvider(providerId);
  if (!provider) return "provider_unknown";
  const admin = createAdminClient();
  const env = serverEnv();
  const verified = await provider.verifyWebhook(rawBody, headers);

  // Persist first (audit), even when invalid; apply only when valid.
  if (!verified.valid) {
    await admin.rpc("apply_payment_event", {
      p_provider: provider.id,
      p_event_id: verified.eventId,
      p_event_type: verified.eventType,
      p_payload: verified.payload as Json,
      p_signature_valid: false,
      p_payment_ref: verified.paymentRef,
      p_status: verified.status,
      p_amount_minor: verified.amountMinor,
      p_currency: verified.currency,
      p_user_id: null,
      p_price_id: null,
    });
    return "invalid_signature";
  }

  let status: PaymentStatus | null = verified.status;
  let amountMinor = verified.amountMinor;
  let currency = verified.currency;
  let buyerEmail = verified.buyerEmail;
  if (verified.paymentRef && status) {
    const fetched = await provider.fetchPayment(verified.paymentRef);
    if (fetched) {
      status = fetched.status;
      amountMinor = fetched.amountMinor ?? amountMinor;
      currency = fetched.currency ?? currency;
      buyerEmail = fetched.buyerEmail ?? buyerEmail;
    } else if (!(env.NODE_ENV !== "production" && env.HOTMART_SKIP_REFETCH)) {
      // Store the event for reprocessing but do not grant anything.
      await admin.rpc("apply_payment_event", {
        p_provider: provider.id,
        p_event_id: verified.eventId,
        p_event_type: verified.eventType,
        p_payload: verified.payload as Json,
        p_signature_valid: true,
        p_payment_ref: verified.paymentRef,
        p_status: "pending",
        p_amount_minor: amountMinor,
        p_currency: currency,
        p_user_id: null,
        p_price_id: null,
      });
      return "unverified";
    }
  }
  if (!status) return "ignored";

  // Match the buyer: our user id echoed by the provider, else the buyer email.
  let userId: string | null = null;
  const hint = z.uuid().safeParse(verified.userIdHint);
  if (hint.success) {
    const { data } = await admin.from("profiles").select("id").eq("id", hint.data).maybeSingle();
    userId = data?.id ?? null;
  }
  if (!userId && buyerEmail) {
    const { data } = await admin.rpc("user_id_by_email", { p_email: buyerEmail });
    userId = (data as string | null) ?? null;
  }
  const { data: price } = await admin
    .from("prices")
    .select("id")
    .eq("provider", provider.id)
    .eq("is_active", true)
    .order("created_at")
    .limit(1)
    .maybeSingle();

  const { data: result } = await admin.rpc("apply_payment_event", {
    p_provider: provider.id,
    p_event_id: verified.eventId,
    p_event_type: verified.eventType,
    p_payload: verified.payload as Json,
    p_signature_valid: true,
    p_payment_ref: verified.paymentRef,
    p_status: status,
    p_amount_minor: amountMinor,
    p_currency: currency,
    p_user_id: userId,
    p_price_id: price?.id ?? null,
  });
  return (result as WebhookOutcome | null) ?? "ignored";
}

export interface AccessStatus {
  entitled: boolean;
  entitlement: { source: string; ends_at: string | null; starts_at: string } | null;
  pendingPurchase: {
    id: string;
    reference_code: string | null;
    channel: string | null;
    amount_minor: number;
    currency: string;
    created_at: string;
  } | null;
  purchases: {
    id: string;
    provider: string;
    status: string;
    amount_minor: number;
    currency: string;
    created_at: string;
    reference_code: string | null;
  }[];
  freeUsed: number;
  freeLimit: number;
}

export async function getAccessStatus(profile: Profile): Promise<AccessStatus> {
  const supabase = await createClient();
  const [{ data: entitlements }, { data: purchases }, { data: freeUsed }] = await Promise.all([
    supabase
      .from("entitlements")
      .select("source, starts_at, ends_at, revoked_at")
      .eq("user_id", profile.id)
      .is("revoked_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("purchases")
      .select("id, provider, status, amount_minor, currency, created_at, reference_code, channel")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false }),
    supabase.rpc("free_exercises_used", { p_user_id: profile.id }),
  ]);
  const active =
    (entitlements ?? []).find((e) => !e.ends_at || Date.parse(e.ends_at) > Date.now()) ?? null;
  const pending = (purchases ?? []).find((p) => p.status === "pending") ?? null;
  return {
    entitled: profile.role === "admin" || Boolean(active),
    entitlement: active
      ? { source: active.source, ends_at: active.ends_at, starts_at: active.starts_at }
      : null,
    pendingPurchase: pending
      ? {
          id: pending.id,
          reference_code: pending.reference_code,
          channel: pending.channel,
          amount_minor: pending.amount_minor,
          currency: pending.currency,
          created_at: pending.created_at,
        }
      : null,
    purchases: (purchases ?? []).map((p) => ({
      id: p.id,
      provider: p.provider,
      status: p.status,
      amount_minor: p.amount_minor,
      currency: p.currency,
      created_at: p.created_at,
      reference_code: p.reference_code,
    })),
    freeUsed: typeof freeUsed === "number" ? freeUsed : 0,
    freeLimit: limits.freeExerciseLimit,
  };
}

export interface CatalogPrice {
  id: string;
  provider: string;
  currency: string;
  amount_minor: number;
  country: string | null;
}

export async function getCatalog(): Promise<{
  product: { slug: string; title: string; description: string } | null;
  prices: CatalogPrice[];
}> {
  const supabase = await createClient();
  const { data: product } = await supabase
    .from("products")
    .select("id, slug, title, description")
    .eq("kind", "lifetime")
    .eq("is_active", true)
    .maybeSingle();
  if (!product) return { product: null, prices: [] };
  const { data: prices } = await supabase
    .from("prices")
    .select("id, provider, currency, amount_minor, country")
    .eq("product_id", product.id)
    .eq("is_active", true);
  return {
    product: { slug: product.slug, title: product.title, description: product.description },
    prices: (prices ?? []).filter((p) => p.amount_minor > 0),
  };
}
