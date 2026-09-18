/** Deterministic parameters for the Bolsillo dataset. Changing anything here = new version. */
export const config = {
  slug: "bolsillo",
  version: 1,
  seed: 20260919,
  volumes: {
    users: 4000,
    merchants: 300,
    transactions: 28000,
  },
} as const;
