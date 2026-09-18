/** Deterministic parameters for the TiendaViva dataset. Changing anything here = new version. */
export const config = {
  slug: "tiendaviva",
  version: 1,
  seed: 20260918,
  volumes: {
    customers: 3000,
    sellers: 180,
    products: 1500,
    orders: 18000,
  },
} as const;
