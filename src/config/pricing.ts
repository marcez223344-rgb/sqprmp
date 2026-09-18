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
      // D-06: ≈ US$20. Local ARS amount is set by the owner before Phase 6 launch.
      { provider: "manual", currency: "USD", amountMinor: 2000, interval: "one_time" },
      { provider: "manual", currency: "ARS", amountMinor: 0, country: "AR", interval: "one_time" },
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

/** Payment channels enabled at launch, in display order (docs/PAYMENTS.md §3). */
export const enabledPaymentProviders: PaymentProviderId[] = ["manual", "hotmart"];

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
  bank_ars: {
    holder: "Data Minds Solutions",
    lines: ["Alias: PENDIENTE-DE-CONFIGURAR", "CBU: PENDIENTE-DE-CONFIGURAR"],
  },
  mercadopago_ars: {
    holder: "Data Minds Solutions",
    lines: ["Alias Mercado Pago: PENDIENTE-DE-CONFIGURAR"],
  },
  wallbit_usd: { holder: "Data Minds Solutions", lines: ["Wallbit TAG: PENDIENTE-DE-CONFIGURAR"] },
};
