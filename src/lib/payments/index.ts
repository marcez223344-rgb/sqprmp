import "server-only";
import type { PaymentProviderId } from "@/config/pricing";
import { serverEnv } from "@/lib/env/server";
import { hotmartProvider } from "./providers/hotmart";
import { manualProvider } from "./providers/manual";
import type { PaymentProvider } from "./types";

const registry: Record<PaymentProviderId, PaymentProvider | null> = {
  manual: manualProvider,
  hotmart: hotmartProvider,
  mercadopago: null, // Phase 6b
};

/** Providers enabled by PAYMENT_PROVIDERS (env) intersected with what is implemented. */
export function enabledProviders(): PaymentProvider[] {
  const wanted = serverEnv().PAYMENT_PROVIDERS as PaymentProviderId[];
  return wanted.map((id) => registry[id]).filter((p): p is PaymentProvider => Boolean(p));
}

export function getProvider(id: string): PaymentProvider | null {
  return enabledProviders().find((p) => p.id === id) ?? null;
}
