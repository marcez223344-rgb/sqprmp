import { beforeAll, describe, expect, it } from "vitest";

beforeAll(() => {
  Object.assign(process.env, {
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "placeholder-publishable-key-for-tests",
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    SUPABASE_SECRET_KEY: "placeholder-service-key-for-tests-not-real",
    SANDBOX_SIGNING_SECRET: "0".repeat(32),
    CERTIFICATE_SIGNING_SECRET: "0".repeat(32),
    CRON_SECRET: "0".repeat(32),
    PAYMENT_PROVIDERS: "manual,hotmart",
    HOTMART_WEBHOOK_HOTTOK: "hottok-test-secret",
    HOTMART_CHECKOUT_URL: "https://pay.hotmart.com/ABC123?off=xyz",
  });
});

const sample = {
  id: "evt-123",
  event: "PURCHASE_APPROVED",
  version: "2.0.0",
  data: {
    product: { id: 1, name: "SQL Academy" },
    buyer: { email: "ana@ejemplo.lat", name: "Ana" },
    purchase: {
      transaction: "HP16015479281022",
      status: "APPROVED",
      price: { value: 20, currency_value: "USD" },
      origin: { sck: "6a4d5b3c-1234-4abc-9def-0123456789ab" },
      offer: { code: "xyz" },
      order_date: 1700000000000,
      approved_date: 1700000001000,
    },
  },
};

describe("hotmart provider", () => {
  it("accepts the shared token only (constant-time compare) and maps the payload", async () => {
    const { hotmartProvider } = await import("@/lib/payments/providers/hotmart");
    const ok = await hotmartProvider.verifyWebhook(
      JSON.stringify(sample),
      new Headers({ "x-hotmart-hottok": "hottok-test-secret" }),
    );
    expect(ok.valid).toBe(true);
    expect(ok.eventId).toBe("evt-123");
    expect(ok.status).toBe("approved");
    expect(ok.paymentRef).toBe("HP16015479281022");
    expect(ok.amountMinor).toBe(2000);
    expect(ok.currency).toBe("USD");
    expect(ok.userIdHint).toBe("6a4d5b3c-1234-4abc-9def-0123456789ab");
    expect(ok.buyerEmail).toBe("ana@ejemplo.lat");
    // Buyer name is not kept in the audit payload.
    expect(JSON.stringify(ok.payload)).not.toContain("Ana");

    const bad = await hotmartProvider.verifyWebhook(
      JSON.stringify(sample),
      new Headers({ "x-hotmart-hottok": "wrong" }),
    );
    expect(bad.valid).toBe(false);
    const missing = await hotmartProvider.verifyWebhook(JSON.stringify(sample), new Headers());
    expect(missing.valid).toBe(false);
  });

  it("treats malformed bodies as invalid without throwing", async () => {
    const { hotmartProvider } = await import("@/lib/payments/providers/hotmart");
    const r = await hotmartProvider.verifyWebhook(
      "{not json",
      new Headers({ "x-hotmart-hottok": "hottok-test-secret" }),
    );
    expect(r.valid).toBe(false);
    expect(r.eventType).toBe("malformed");
  });

  it("maps refund and chargeback events", async () => {
    const { hotmartProvider } = await import("@/lib/payments/providers/hotmart");
    const cases = [
      ["PURCHASE_REFUNDED", "refunded"],
      ["PURCHASE_CHARGEBACK", "chargeback"],
      ["PURCHASE_CANCELED", "cancelled"],
      ["SOMETHING_NEW", null],
    ] as const;
    for (const [event, status] of cases) {
      const r = await hotmartProvider.verifyWebhook(
        JSON.stringify({ ...sample, event }),
        new Headers({ "x-hotmart-hottok": "hottok-test-secret" }),
      );
      expect(r.status).toBe(status);
    }
  });

  it("builds a hosted checkout URL carrying our user id", async () => {
    const { hotmartProvider } = await import("@/lib/payments/providers/hotmart");
    const r = await hotmartProvider.createCheckout({
      userId: "u-1",
      userEmail: "a@b.c",
      priceId: "p",
      amountMinor: 2000,
      currency: "USD",
      successUrl: "x",
      cancelUrl: "y",
    });
    expect(r.redirectUrl).toContain("https://pay.hotmart.com/ABC123");
    expect(r.redirectUrl).toContain("sck=u-1");
  });

  it("returns null from fetchPayment when API credentials are absent", async () => {
    const { hotmartProvider } = await import("@/lib/payments/providers/hotmart");
    expect(await hotmartProvider.fetchPayment("HP1")).toBeNull();
  });
});
