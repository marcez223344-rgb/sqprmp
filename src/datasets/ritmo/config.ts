/** Deterministic parameters for the Ritmo dataset. Changing anything here = new version. */
export const config = {
  slug: "ritmo",
  version: 1,
  seed: 20260922,
  volumes: {
    users: 5000,
    artists: 320,
    /** Target number of plays before the planted duplicates are added. */
    plays: 150000,
  },
} as const;

/**
 * Markets served by Ritmo. `utcOffset` drives the evening listening peak (the dataset stores
 * UTC timestamps, so the peak must be shifted per country) and `price` is the monthly price in
 * minor units of the local currency for each paid plan.
 */
export const markets = [
  {
    code: "MX",
    currency: "MXN",
    utcOffset: -6,
    weight: 26,
    price: { premium: 11900, familiar: 19900 },
  },
  {
    code: "BR",
    currency: "BRL",
    utcOffset: -3,
    weight: 24,
    price: { premium: 2190, familiar: 3490 },
  },
  {
    code: "AR",
    currency: "ARS",
    utcOffset: -3,
    weight: 18,
    price: { premium: 299000, familiar: 479000 },
  },
  {
    code: "CO",
    currency: "COP",
    utcOffset: -5,
    weight: 14,
    price: { premium: 1690000, familiar: 2490000 },
  },
  {
    code: "CL",
    currency: "CLP",
    utcOffset: -4,
    weight: 10,
    price: { premium: 549000, familiar: 799000 },
  },
  {
    code: "PE",
    currency: "PEN",
    utcOffset: -5,
    weight: 8,
    price: { premium: 2490, familiar: 3790 },
  },
] as const;

export type MarketCode = (typeof markets)[number]["code"];
export type PaidPlan = "premium" | "familiar";
