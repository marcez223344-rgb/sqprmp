import type { PaymentProviderId } from "@/config/pricing";

export type PaymentStatus =
  "pending" | "approved" | "rejected" | "refunded" | "chargeback" | "cancelled";

export interface CheckoutRequest {
  userId: string;
  userEmail: string;
  priceId: string;
  amountMinor: number;
  currency: string;
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutResult {
  /** Where to send the learner (hosted checkout) or null for manual instructions. */
  redirectUrl: string | null;
  providerRef?: string;
}

export interface VerifiedWebhook {
  valid: boolean;
  eventId: string;
  eventType: string;
  paymentRef: string | null;
  status: PaymentStatus | null;
  amountMinor: number | null;
  currency: string | null;
  buyerEmail: string | null;
  /** Our user id when the provider echoes it back (tracking parameter). */
  userIdHint: string | null;
  payload: Record<string, unknown>;
}

export interface FetchedPayment {
  status: PaymentStatus;
  amountMinor: number | null;
  currency: string | null;
  buyerEmail: string | null;
}

export interface PaymentProvider {
  id: PaymentProviderId;
  createCheckout(req: CheckoutRequest): Promise<CheckoutResult>;
  verifyWebhook(rawBody: string, headers: Headers): Promise<VerifiedWebhook>;
  /** Re-fetches the payment from the provider API; null when the API is unavailable. */
  fetchPayment(paymentRef: string): Promise<FetchedPayment | null>;
}
