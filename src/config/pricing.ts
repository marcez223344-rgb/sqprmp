/**
 * Products and prices (D-05, D-06). Amounts are in minor units of the currency.
 * The database `products`/`prices` tables are seeded from this file; the app reads
 * from the database at runtime so admins can adjust without a deploy later.
 */
export type ProductKind = "lifetime" | "subscription" | "promo";
export type PaymentProviderId = "manual" | "hotmart" | "mercadopago";

export interface PriceConfig {
  provider: PaymentProviderId;
  currency: string;
  amountMinor: number;
  /** ISO 3166-1 alpha-2; undefined = any country. */
  country?: string;
  interval: "one_time" | "month" | "year";
}

export interface ProductConfig {
  slug: string;
  kind: ProductKind;
  title: string;
  description: string;
  accessDays: number | null; // null = lifetime
  isActive: boolean;
  prices: PriceConfig[];
}

export const products: ProductConfig[] = [
  {
    slug: "full-lifetime",
    kind: "lifetime",
    title: "Acceso completo de por vida",
    description: "Todo el currículo, ejercicios, quizzes y certificados, sin vencimiento.",
    accessDays: null,
    isActive: true,
    prices: [
      // D-17 (owner, 2026-09-23): one price, no founder cohort. US$20 stays.
      // ARS 29.900 is set as an independent round number rather than an FX conversion, so a
      // devaluation does not turn it into an odd figure (US$20 × blue 1.545 ≈ ARS 30.900).
      { provider: "manual", currency: "USD", amountMinor: 2000, interval: "one_time" },
      {
        provider: "manual",
        currency: "ARS",
        amountMinor: 2990000,
        country: "AR",
        interval: "one_time",
      },
      { provider: "hotmart", currency: "USD", amountMinor: 2000, interval: "one_time" },
    ],
  },
  {
    slug: "full-monthly",
    kind: "subscription",
    title: "Suscripción mensual",
    description: "Modelada para el futuro; no se vende en el MVP.",
    accessDays: 30,
    isActive: false,
    prices: [],
  },
  {
    slug: "full-annual",
    kind: "subscription",
    title: "Suscripción anual",
    description: "Modelada para el futuro; no se vende en el MVP.",
    accessDays: 365,
    isActive: false,
    prices: [],
  },
];

/**
 * Payment channels enabled at launch, in display order (docs/PAYMENTS.md §3).
 *
 * D-32 (owner, 2026-09-23): launch with manual transfer only. Bank transfer plus Mercado Pago
 * covers Argentina, which is the first market, and Hotmart is unusable anyway without payout
 * eligibility and credentials. Re-adding "hotmart" here is the whole change when that arrives.
 */
export const enabledPaymentProviders: PaymentProviderId[] = ["manual"];

/** Manual transfer instructions are owner-provided; placeholders until Phase 6. */
export const manualTransferChannels = [
  { id: "bank_ars", label: "Transferencia bancaria (ARS)", currency: "ARS", countries: ["AR"] },
  { id: "mercadopago_ars", label: "Mercado Pago (ARS)", currency: "ARS", countries: ["AR"] },
  { id: "wallbit_usd", label: "Wallbit (USD)", currency: "USD", countries: [] },
] as const;

/**
 * Manual transfer instructions shown to learners (not secrets; owner fills them in before
 * launch — placeholders are clearly marked in the UI until then).
 */
export const manualTransferInstructions: Record<
  (typeof manualTransferChannels)[number]["id"],
  { holder: string; lines: string[] }
> = {
  // Owner-supplied 2026-09-23. The holder is the account's legal name, spelled exactly as the
  // sender's banking app shows it on the confirmation screen — not the trade name. Someone about
  // to transfer money compares those two strings character by character, and a mismatch there
  // reads as a scam even when the CBU is right.
  bank_ars: {
    holder: "Marcelo Hernan Pisner",
    lines: ["Banco Galicia", "Alias: MarceloPisner", "CBU: 0070040530004041083717"],
  },
  mercadopago_ars: {
    holder: "Marcelo Hernan Pisner",
    lines: ["Mercado Pago", "Alias: marc.hern.pis", "CVU: 0000003100024616194588"],
  },
  wallbit_usd: { holder: "Data Minds Solutions", lines: ["Wallbit TAG: PENDIENTE-DE-CONFIGURAR"] },
};

/** Marker for details the owner has not supplied yet. */
const PLACEHOLDER = "PENDIENTE-DE-CONFIGURAR";

/**
 * A channel is offered only once its details are real.
 *
 * The placeholders above were rendering verbatim on `/precios`, so every visitor read
 * "PENDIENTE-DE-CONFIGURAR" as the payment instructions. A half-configured channel is worse than
 * a missing one: it cannot be paid and it makes the whole site look unfinished. Channels
 * reappear on their own as soon as the real values land in `manualTransferInstructions`.
 */
export function transferChannelIsReady(id: (typeof manualTransferChannels)[number]["id"]): boolean {
  return !manualTransferInstructions[id].lines.some((line) => line.includes(PLACEHOLDER));
}

/** The manual channels that can actually be paid right now, in display order. */
export const readyTransferChannels = manualTransferChannels.filter((c) =>
  transferChannelIsReady(c.id),
);
