/**
 * Checks the figures that exercise prose states about the dataset against the exercise's own
 * reference solution, executed on the committed dataset snapshot. No hand-written expectations:
 * the truth comes from the query the learner is asked to write.
 *
 * The rule — what the prose has to be saying for a figure to be treated as a row count:
 *   1. The opening figure of `expert_explanation_md` when the field follows CONTENT_GUIDELINES
 *      §10 rule A ("El resultado de la consulta da N …"), or the older bare "N filas …" opening
 *      that rule replaced. The first cardinal of that opening sentence, spelled out or in digits,
 *      is the claim. Explanations that open some other way make no claim here.
 *   2. A sentence whose subject is the query itself: "la consulta devuelve N filas", "el
 *      resultado tiene N filas".
 * Everything else is left alone, because in these exercises a bare "N filas" mid-paragraph is
 * nearly always the size of a source table, of a CTE, of one bucket of the result, or of a wrong
 * variant the text warns about ("sin los paréntesis obtendrías 952 filas"): reading all of them
 * as row counts produced 95 disagreements, none of which was a content bug. Also never a claim:
 * figures inside inline code spans and fenced blocks (SQL literals), a leading percentage, and a
 * statement of grain ("una fila por pedido"). When the reference solution returns exactly one
 * row, the opening figure may instead be one of that row's values, which is how an aggregate
 * explanation quotes its own measure.
 *
 * Escape hatch: `src/content/exercise-figure-exceptions.ts` exempts one phrase, quoted verbatim,
 * per entry. It cannot exempt a §10 rule A opener, and an entry that stops matching fails.
 *
 * Usage: npm run content:figures [-- exercise-slug]
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { loadContent } from "../src/content/load";
import { exerciseFigureExceptions } from "../src/content/exercise-figure-exceptions";
import { loadDatasetInto } from "../sandbox-runtime/engine-core.mjs";
import { rowCountClaims, type RowCountClaim } from "./lib/prose-figures";

const only = process.argv[2];

const loaded = loadContent();
if (loaded.issues.length) {
  console.error("content:figures — fix content:validate issues first");
  process.exit(1);
}

const instances = new Map<string, Promise<PGlite>>();

async function engineFor(slug: string, version: number): Promise<PGlite> {
  const key = `${slug}@${version}`;
  let p = instances.get(key);
  if (!p) {
    p = (async () => {
      const dir = join(process.cwd(), "public", "datasets", slug, `v${version}`);
      if (!existsSync(join(dir, "manifest.json")))
        throw new Error(`dataset ${key} not built; run npm run datasets:build`);
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
    instances.set(key, p);
  }
  return p;
}

const usedExceptions = new Set<FigureExceptionKey>();
type FigureExceptionKey = string;
const exceptionKey = (exercise: string, field: string, phrase: string) =>
  `${exercise}\u0000${field}\u0000${phrase}`;
const exceptions = new Set(
  exerciseFigureExceptions.map((e) => exceptionKey(e.exercise, e.field, e.phrase)),
);

function isExempt(slug: string, claim: RowCountClaim): boolean {
  if (claim.kind === "opener") return false;
  const key = exceptionKey(slug, claim.field, claim.phrase);
  if (!exceptions.has(key)) return false;
  usedExceptions.add(key);
  return true;
}

/** Numbers in a single-row result, so an aggregate explanation can quote its own measures. */
function numericCells(row: unknown[]): Set<number> {
  const out = new Set<number>();
  for (const cell of row) {
    if (cell === null || cell === undefined) continue;
    const n = typeof cell === "number" ? cell : Number(String(cell));
    if (Number.isFinite(n)) out.add(n);
  }
  return out;
}

async function main() {
  let failures = 0;
  let checkedExercises = 0;
  let checkedClaims = 0;

  for (const ex of loaded.exercises) {
    if (only && only !== ex.slug) continue;
    const label = `${ex.section}/${ex.slug}`;

    const claims = rowCountClaims([
      { field: "expert_explanation_md", text: ex.expert_explanation_md ?? "" },
      { field: "scenario_md", text: ex.scenario_md ?? "" },
    ]).filter((c) => !isExempt(ex.slug, c));

    if (claims.length === 0) {
      checkedExercises++;
      continue;
    }

    let rows: number;
    let singleRowFigures = new Set<number>();
    try {
      const pg = await engineFor(ex.dataset.slug, ex.dataset.version);
      const res = await pg.query<unknown[]>(ex.reference_solution, [], { rowMode: "array" });
      rows = res.rows.length;
      if (rows === 1) singleRowFigures = numericCells(res.rows[0]);
    } catch (err) {
      console.error(`  ✗ ${label}: reference solution failed: ${(err as Error).message}`);
      failures++;
      continue;
    }

    for (const claim of claims) {
      const ok =
        claim.value === rows ||
        (claim.kind === "opener" && rows === 1 && singleRowFigures.has(claim.value));
      if (ok) {
        checkedClaims++;
        continue;
      }
      console.error(
        `  ✗ ${label} · ${claim.field}: the prose says ${claim.value}, the reference solution returns ${rows} row(s)\n      "${claim.phrase}"`,
      );
      failures++;
    }
    checkedExercises++;
  }

  for (const p of instances.values()) await (await p).close();

  if (!only) {
    for (const e of exerciseFigureExceptions) {
      const key = exceptionKey(e.exercise, e.field, e.phrase);
      if (!usedExceptions.has(key)) {
        console.error(
          `  ✗ ${e.exercise} · ${e.field}: the exception "${e.phrase}" matches nothing — the prose changed; remove or update it`,
        );
        failures++;
      }
    }
  }

  if (failures) {
    console.error(
      `content:figures — FAILED (${failures} problem(s), ${checkedClaims} figure(s) verified). Fix the prose, or register the figure in src/content/exercise-figure-exceptions.ts if it does not count result rows.`,
    );
    process.exit(1);
  }
  console.log(
    `content:figures — OK (${checkedClaims} row-count figure(s) across ${checkedExercises} exercise(s) verified against the reference solutions).`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
