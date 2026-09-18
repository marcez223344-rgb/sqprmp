/** Shape of public/datasets/<slug>/v<n>/manifest.json (also mirrored in src/datasets/manifest.json). */
export interface DatasetManifest {
  slug: string;
  version: number;
  today: string;
  schemaFile: string;
  tables: { name: string; file: string; rows: number; sha256: string }[];
  /** SHA-256 over schema + every table hash, in order. Stable across builds. */
  contentHash: string;
  builtAt: string;
}

export function datasetPublicDir(slug: string, version: number): string {
  return `/datasets/${slug}/v${version}`;
}
