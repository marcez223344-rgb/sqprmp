/** Deterministic parameters for the Pídelo dataset. Changing anything here = new version. */
export const config = {
  slug: "pidelo",
  version: 1,
  seed: 20260920,
  volumes: {
    restaurants: 400,
    customers: 5000,
    couriers: 600,
    orders: 21000,
  },
} as const;
