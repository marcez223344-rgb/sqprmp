import "server-only";
import { timingSafeEqual } from "node:crypto";
import { serverEnv } from "@/lib/env/server";
import type { PaymentProvider, PaymentStatus } from "../types";

/**
 * Hotmart (Merchant of Record). Sandbox until the owner approves production (D-05).
 *
 * Checkout: hosted page `HOTMART_CHECKOUT_URL` (product/offer link from the Hotmart panel); we
 * append `sck=<userId>` so the webhook echoes our user id in `purchase.origin.sck`.
 * Webhook 2.0: JSON body with a `hottok` shared secret in the `X-HOTMART-HOTTOK` header (Hotmart
 * does not sign payloads; the token is compared in constant time). Every event is stored and the
 * purchase is re-fetched from the Sales API before granting access (docs/SECURITY.md §6).
 * Field mapping below follows Hotmart's Webhook 2.0 payload; verify against a real sandbox event
 * in the Phase 6 runbook (docs/PAYMENTS.md) before enabling production.
 */
const STATUS_BY_EVENT: Record<string, PaymentStatus> = {
  PURCHASE_APPROVED: "approved",
  PURCHASE_COMPLETE: "approved",
  PURCHASE_REFUNDED: "refunded",
  PURCHASE_CHARGEBACK: "chargeback",
  PURCHASE_CANCELED: "cancelled",
  PURCHASE_BILLET_PRINTED: "pending",
  PURCHASE_PROTEST: "pending",
  PURCHASE_DELAYED: "pending",
  PURCHASE_EXPIRED: "cancelled",
};

const STATUS_BY_API: Record<string, PaymentStatus> = {
  APPROVED: "approved",
  COMPLETE: "approved",
  REFUNDED: "refunded",
  CHARGEBACK: "chargeback",
  CANCELLED: "cancelled",
  CANCELED: "cancelled",
  EXPIRED: "cancelled",
  STARTED: "pending",
  PRINTED_BILLET: "pending",
  WAITING_PAYMENT: "pending",
  PROTESTED: "pending",
  DELAYED: "pending",
};

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

function baseUrl(env: string | undefined): { auth: string; api: string } {
  return env === "production"
    ? { auth: "https://api-sec-vlc.hotmart.com", api: "https://developers.hotmart.com" }
    : { auth: "https://api-sec-vlc.hotmart.com", api: "https://sandbox.hotmart.com" };
}

export const hotmartProvider: PaymentProvider = {
  id: "hotmart",

  async createCheckout(req) {
    const env = serverEnv();
    if (!env.HOTMART_CHECKOUT_URL) return { redirectUrl: null };
    const url = new URL(env.HOTMART_CHECKOUT_URL);
    url.searchParams.set("sck", req.userId);
    url.searchParams.set("email", req.userEmail);
    return { redirectUrl: url.toString() };
  },

  async verifyWebhook(rawBody, headers) {
    const env = serverEnv();
    const token = headers.get("x-hotmart-hottok") ?? "";
    const valid =
      Boolean(env.HOTMART_WEBHOOK_HOTTOK) && safeEqual(token, env.HOTMART_WEBHOOK_HOTTOK ?? "");
    let payload: Record<string, unknown> = {};
    try {
      payload = JSON.parse(rawBody) as Record<string, unknown>;
    } catch {
      return {
        valid: false,
        eventId: `malformed-${Date.now()}`,
        eventType: "malformed",
        paymentRef: null,
        status: null,
        amountMinor: null,
        currency: null,
        buyerEmail: null,
        userIdHint: null,
        payload: {},
      };
    }
    const data = (payload.data ?? {}) as Record<string, unknown>;
    const purchase = (data.purchase ?? {}) as Record<string, unknown>;
    const price = (purchase.price ?? {}) as Record<string, unknown>;
    const origin = (purchase.origin ?? {}) as Record<string, unknown>;
    const buyer = (data.buyer ?? {}) as Record<string, unknown>;
    const eventType = String(payload.event ?? "unknown");
    const transaction = typeof purchase.transaction === "string" ? purchase.transaction : null;
    const value = typeof price.value === "number" ? price.value : Number(price.value);
    return {
      valid,
      eventId: String(payload.id ?? `${transaction ?? "no-tx"}:${eventType}`),
      eventType,
      paymentRef: transaction,
      status: STATUS_BY_EVENT[eventType] ?? null,
      amountMinor: Number.isFinite(value) ? Math.round(value * 100) : null,
      currency: typeof price.currency_value === "string" ? price.currency_value : null,
      buyerEmail: typeof buyer.email === "string" ? buyer.email : null,
      userIdHint: typeof origin.sck === "string" ? origin.sck : null,
      // Strip anything that is not needed for audit (no card data exists in Hotmart payloads).
      payload: {
        id: payload.id,
        event: eventType,
        version: payload.version,
        transaction,
        product: data.product,
        purchase: {
          status: purchase.status,
          order_date: purchase.order_date,
          approved_date: purchase.approved_date,
          price,
          offer: purchase.offer,
        },
      },
    };
  },

  async fetchPayment(paymentRef) {
    const env = serverEnv();
    if (!env.HOTMART_CLIENT_ID || !env.HOTMART_CLIENT_SECRET) return null;
    const urls = baseUrl(env.HOTMART_ENV);
    const basic = Buffer.from(`${env.HOTMART_CLIENT_ID}:${env.HOTMART_CLIENT_SECRET}`).toString(
      "base64",
    );
    const tokenRes = await fetch(
      `${urls.auth}/security/oauth/token?grant_type=client_credentials`,
      {
        method: "POST",
        headers: { Authorization: `Basic ${basic}` },
        cache: "no-store",
      },
    );
    if (!tokenRes.ok) return null;
    const { access_token } = (await tokenRes.json()) as { access_token?: string };
    if (!access_token) return null;
    const salesRes = await fetch(
      `${urls.api}/payments/api/v1/sales/history?transaction=${encodeURIComponent(paymentRef)}`,
      {
        headers: { Authorization: `Bearer ${access_token}` },
        cache: "no-store",
      },
    );
    if (!salesRes.ok) return null;
    const body = (await salesRes.json()) as {
      items?: {
        purchase?: { status?: string; price?: { value?: number; currency_code?: string } };
        buyer?: { email?: string };
      }[];
    };
    const item = body.items?.[0];
    if (!item?.purchase?.status) return null;
    return {
      status: STATUS_BY_API[item.purchase.status] ?? "pending",
      amountMinor:
        typeof item.purchase.price?.value === "number"
          ? Math.round(item.purchase.price.value * 100)
          : null,
      currency: item.purchase.price?.currency_code ?? null,
      buyerEmail: item.buyer?.email ?? null,
    };
  },
};
