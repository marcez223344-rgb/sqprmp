import "server-only";
import type { PaymentProvider } from "../types";

/**
 * Manual transfers (bank/Mercado Pago in ARS, Wallbit in USD): no hosted checkout and no
 * webhooks. The learner creates a pending purchase with a reference code and the admin
 * approves it (RPC `review_manual_purchase`). This adapter only documents the shape.
 */
export const manualProvider: PaymentProvider = {
  id: "manual",
  async createCheckout() {
    return { redirectUrl: null };
  },
  async verifyWebhook(rawBody) {
    return {
      valid: false,
      eventId: `manual-${Date.now()}`,
      eventType: "unsupported",
      paymentRef: null,
      status: null,
      amountMinor: null,
      currency: null,
      buyerEmail: null,
      userIdHint: null,
      payload: { rawLength: rawBody.length },
    };
  },
  async fetchPayment() {
    return null;
  },
};
