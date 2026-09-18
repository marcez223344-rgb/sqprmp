/**
 * Regenerates every dataset in memory, runs its consistency checks and asserts that the
 * content hash equals the committed manifest (determinism). Does not write files.
 * Usage: npm run datasets:verify [-- slug]
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { datasetModules } from "../src/datasets";
import { toCsv } from "../src/datasets/_shared/types";

const only = process.argv[2];
const committedPath = join(process.cwd(), "src", "datasets", "manifest.json");
const committed: Record<string, { version: number; contentHash: string }> = existsSync(
  committedPath,
)
  ? JSON.parse(readFileSync(committedPath, "utf8"))
  : {};
const sha = (s: string) => createHash("sha256").update(s).digest("hex");
let failed = false;

for (const [slug, mod] of Object.entries(datasetModules)) {
  if (only && only !== slug) continue;
  const ds = mod.generate();
  const results = mod.verify(ds);
  for (const r of results) {
    if (!r.ok) failed = true;
    console.log(`  ${r.ok ? "✓" : "✗"} ${slug}: ${r.name}${r.detail ? ` (${r.detail})` : ""}`);
  }
  const hashes = [sha(ds.schemaSql.trim()), ...ds.tables.map((t) => sha(toCsv(t)))];
  const contentHash = sha(hashes.join("|"));
  const expected = committed[slug];
  if (!expected) {
    console.error(`  ✗ ${slug}: no committed manifest; run npm run datasets:build`);
    failed = true;
  } else if (expected.contentHash !== contentHash || expected.version !== ds.version) {
    console.error(
      `  ✗ ${slug}: content hash drifted (${expected.contentHash.slice(0, 12)} → ${contentHash.slice(0, 12)}); bump the version or rebuild`,
    );
    failed = true;
  } else {
    console.log(`  ✓ ${slug}: deterministic (hash ${contentHash.slice(0, 12)}, v${ds.version})`);
  }
}

if (failed) {
  console.error("datasets:verify — FAILED");
  process.exit(1);
}
console.log("datasets:verify — OK.");
