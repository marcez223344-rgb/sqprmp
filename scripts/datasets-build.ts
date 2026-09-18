/**
 * Generates every registered dataset deterministically and writes
 * public/datasets/<slug>/v<n>/{schema.sql, <table>.csv, manifest.json}.
 * Also records content hashes in src/datasets/manifest.json (committed) so
 * `datasets:verify` can prove determinism without rebuilding.
 * Usage: npm run datasets:build [-- slug]
 */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { datasetModules } from "../src/datasets";
import type { DatasetManifest } from "../src/datasets/manifest";
import { toCsv } from "../src/datasets/_shared/types";

const only = process.argv[2];
const root = process.cwd();
const committedPath = join(root, "src", "datasets", "manifest.json");
const committed: Record<
  string,
  { version: number; contentHash: string; rows: Record<string, number> }
> = existsSync(committedPath) ? JSON.parse(readFileSync(committedPath, "utf8")) : {};

const sha = (s: string) => createHash("sha256").update(s).digest("hex");

for (const [slug, mod] of Object.entries(datasetModules)) {
  if (only && only !== slug) continue;
  const t0 = Date.now();
  const ds = mod.generate();
  const failures = mod.verify(ds).filter((v) => !v.ok);
  if (failures.length) {
    console.error(`datasets:build — ${slug} failed verification:`);
    for (const f of failures) console.error(`  ✗ ${f.name}${f.detail ? ` (${f.detail})` : ""}`);
    process.exit(1);
  }

  const dir = join(root, "public", "datasets", slug, `v${ds.version}`);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "schema.sql"), ds.schemaSql.trim() + "\n");
  const hashes: string[] = [sha(ds.schemaSql.trim())];
  const tables: DatasetManifest["tables"] = [];
  const rows: Record<string, number> = {};
  for (const table of ds.tables) {
    const csv = toCsv(table);
    const file = `${table.name}.csv`;
    writeFileSync(join(dir, file), csv);
    const h = sha(csv);
    hashes.push(h);
    tables.push({ name: table.name, file, rows: table.rows.length, sha256: h });
    rows[table.name] = table.rows.length;
  }
  const manifest: DatasetManifest = {
    slug,
    version: ds.version,
    today: ds.today,
    schemaFile: "schema.sql",
    tables,
    contentHash: sha(hashes.join("|")),
    builtAt: new Date().toISOString(),
  };
  writeFileSync(join(dir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  committed[slug] = { version: ds.version, contentHash: manifest.contentHash, rows };
  const bytes = tables.reduce((a, t) => a + Buffer.byteLength(readFileSync(join(dir, t.file))), 0);
  console.log(
    `datasets:build — ${slug} v${ds.version}: ${tables.length} tables, ${Object.values(rows).reduce((a, b) => a + b, 0)} rows, ${(bytes / 1024 / 1024).toFixed(2)} MB CSV, ${Date.now() - t0} ms, hash ${manifest.contentHash.slice(0, 12)}`,
  );
}

writeFileSync(committedPath, JSON.stringify(committed, null, 2) + "\n");
