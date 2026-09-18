/**
 * Runs ad-hoc SQL against a built dataset snapshot (author tooling for writing exercises).
 * Usage: npx tsx scripts/dataset-query.ts <dataset-slug> "<sql>" [more sql...]
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { loadDatasetInto } from "../src/lib/sandbox/core/engine-core.mjs";

const [slug, ...queries] = process.argv.slice(2);
if (!slug || queries.length === 0) {
  console.error('usage: tsx scripts/dataset-query.ts <slug> "<sql>" ...');
  process.exit(1);
}
const dir = join(process.cwd(), "public", "datasets", slug, "v1");
const manifest = JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8")) as {
  schemaFile: string;
  tables: { name: string; file: string }[];
};
async function main() {
  const pg = new PGlite();
  await pg.waitReady;
  await loadDatasetInto(pg, {
    schemaSql: readFileSync(join(dir, manifest.schemaFile), "utf8"),
    tables: manifest.tables.map((t) => ({
      name: t.name,
      csv: readFileSync(join(dir, t.file), "utf8"),
    })),
  });
  for (const sql of queries) {
    console.log(`\n-- ${sql}`);
    try {
      const r = await pg.query(sql);
      console.table(r.rows.slice(0, 25));
      if (r.rows.length > 25) console.log(`... ${r.rows.length} rows`);
    } catch (e) {
      console.error((e as Error).message);
    }
  }
  await pg.close();
}

void main();
