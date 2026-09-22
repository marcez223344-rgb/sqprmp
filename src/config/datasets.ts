/**
 * Visual identity of the practice datasets: one icon and one accent per dataset,
 * declared as data (no React imports in config). `src/components/datasets/dataset-badge.tsx`
 * maps `icon` to a lucide component and `accent` to the `--color-dataset-*` tokens.
 * Colors live in `src/app/globals.css`; see docs/DESIGN_SYSTEM.md §2 and §6.
 */
export const datasetIconNames = ["store", "wallet", "delivery", "music"] as const;
export type DatasetIconName = (typeof datasetIconNames)[number];

export const datasetAccents = ["marketplace", "fintech", "delivery", "music"] as const;
export type DatasetAccent = (typeof datasetAccents)[number];

export interface DatasetIdentity {
  /** Matches `datasets.slug` in the database and `src/content/datasets/*`. */
  slug: string;
  icon: DatasetIconName;
  accent: DatasetAccent;
  /** Key under `datasets.domain.*` in src/messages/es-419.json. */
  domainKey: string;
}

export const datasetIdentities: readonly DatasetIdentity[] = [
  { slug: "tiendaviva", icon: "store", accent: "marketplace", domainKey: "marketplace" },
  { slug: "bolsillo", icon: "wallet", accent: "fintech", domainKey: "fintech" },
  { slug: "pidelo", icon: "delivery", accent: "delivery", domainKey: "delivery" },
  { slug: "ritmo", icon: "music", accent: "music", domainKey: "music" },
] as const;

/** Unknown slugs fall back to a neutral marker so a new dataset never breaks a screen. */
export function getDatasetIdentity(slug: string): DatasetIdentity | null {
  return datasetIdentities.find((d) => d.slug === slug) ?? null;
}
