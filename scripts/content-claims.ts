/**
 * Checks every numeric claim the lesson prose makes about the datasets (src/content/lesson-claims.ts).
 *
 * For each claim: the `prose` string must still appear verbatim in the lesson's body_md, and the
 * numbers inside it — ignoring inline code spans, which hold SQL literals and not data claims —
 * must equal, in order, the single row returned by the claim's query against the committed
 * dataset snapshot. Exit code 1 on any drift, so `npm run quality` catches a dataset
 * regeneration or a careless prose edit before a learner does.
 *
 * Usage: npm run content:claims [-- lesson-slug]
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { content } from "../src/content/index";
import { lessonClaims } from "../src/content/lesson-claims";
import { loadDatasetInto } from "../sandbox-runtime/engine-core.mjs";
import { proseNumbers } from "./lib/prose-figures";
import type { LessonDef } from "../src/content/schemas/curriculum";

const only = process.argv[2];

const bodyBySlug = new Map<string, string>(
  (content.lessons as LessonDef[])
    .filter((l): l is LessonDef & { body_md: string } => typeof l.body_md === "string")
    .map((l) => [l.slug, l.body_md]),
);

const engines = new Map<string, Promise<PGlite>>();

function engineFor(slug: string): Promise<PGlite> {
  let p = engines.get(slug);
  if (!p) {
    p = (async () => {
      const dir = join(process.cwd(), "public", "datasets", slug, "v1");
      if (!existsSync(join(dir, "manifest.json")))
        throw new Error(`dataset ${slug} not built; run npm run datasets:build`);
      const manifest = JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8")) as {
        schemaFile: string;
        tables: { name: string; file: string }[];
      };
      const pg = new PGlite();
      await pg.waitReady;
      await loadDatasetInto(pg, {
        schemaSql: readFileSync(join(dir, manifest.schemaFile), "utf8"),
        tables: manifest.tables.map((t) => ({
          name: t.name,
          csv: readFileSync(join(dir, t.file), "utf8"),
        })),
      });
      // The sandbox runs in UTC; the prose figures assume the same session setting.
      await pg.exec("SET TIME ZONE 'UTC';");
      return pg;
    })();
    engines.set(slug, p);
  }
  return p;
}

function resultNumbers(row: unknown[]): number[] {
  return row.map((v) => Number(v));
}

const same = (a: number, b: number) => Number.isFinite(a) && Number.isFinite(b) && a === b;

async function main() {
  let failures = 0;
  let checked = 0;

  for (const claim of lessonClaims) {
    if (only && only !== claim.lesson) continue;
    const label = `${claim.lesson} · ${claim.about}`;

    const body = bodyBySlug.get(claim.lesson);
    if (body === undefined) {
      console.error(`  ✗ ${label}: no such lesson`);
      failures++;
      continue;
    }
    if (!body.includes(claim.prose)) {
      console.error(
        `  ✗ ${label}: the prose no longer says "${claim.prose}" — update the claim or the lesson`,
      );
      failures++;
      continue;
    }

    const expected = proseNumbers(claim.prose);
    if (expected.length === 0) {
      console.error(`  ✗ ${label}: no figure found in "${claim.prose}"`);
      failures++;
      continue;
    }

    let actual: number[];
    try {
      const pg = await engineFor(claim.dataset);
      // Array row mode: several columns legitimately share the name `count`.
      const res = await pg.query<unknown[]>(claim.sql, [], { rowMode: "array" });
      if (res.rows.length !== 1) {
        console.error(`  ✗ ${label}: the query returned ${res.rows.length} rows, expected 1`);
        failures++;
        continue;
      }
      actual = resultNumbers(res.rows[0]);
    } catch (err) {
      console.error(`  ✗ ${label}: query failed: ${(err as Error).message}`);
      failures++;
      continue;
    }

    if (actual.length !== expected.length) {
      console.error(
        `  ✗ ${label}: the prose states ${expected.length} figure(s) but the query returns ${actual.length} column(s)`,
      );
      failures++;
      continue;
    }

    const wrong = expected.map((e, i) => !same(e, actual[i]));
    if (wrong.some(Boolean)) {
      console.error(
        `  ✗ ${label}: prose says ${expected.join(", ")} — the data says ${actual.join(", ")}\n      "${claim.prose}"`,
      );
      failures++;
      continue;
    }

    checked++;
  }

  for (const p of engines.values()) await (await p).close();

  if (failures) {
    console.error(
      `content:claims — FAILED (${failures} claim(s) drifted, ${checked} verified). Re-run the query, then fix the lesson prose.`,
    );
    process.exit(1);
  }
  console.log(`content:claims — OK (${checked} numeric claim(s) verified against the snapshots).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
