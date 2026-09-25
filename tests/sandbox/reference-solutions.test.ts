import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadContent } from "@/content/load";
import { datasetDirFor, workerEngine } from "@/lib/sandbox/engines/worker-engine";
import type { SandboxCell, SandboxColumn } from "@/lib/sandbox/types";
import { gradeSubmission } from "@/lib/validation/grade";

/**
 * Every exercise's reference and alternative solutions, submitted through `gradeSubmission` —
 * the function `submitExercise` calls — against the expected results in the committed seed
 * (supabase/seed/0003_expected_results.sql, what `content:apply` writes to production). A
 * solution the product itself publishes must never be graded wrong (owner feedback round 6,
 * item 11). This also catches a seed that drifted from the authored content, which
 * `content:verify` cannot: it regenerates the seed rather than checking it, and is not part of
 * `npm run quality`.
 */

interface SeedExpected {
  version: number;
  columns: SandboxColumn[];
  rows: SandboxCell[][];
}

function readExpectedSeed(): Map<string, SeedExpected> {
  const text = readFileSync(
    join(process.cwd(), "supabase", "seed", "0003_expected_results.sql"),
    "utf8",
  );
  const out = new Map<string, SeedExpected>();
  const re =
    /where slug = \$(v\d+)\$([\s\S]*?)\$\1\$\), (\d+), \$(v\d+)\$([\s\S]*?)\$\4\$::jsonb, \$(v\d+)\$([\s\S]*?)\$\6\$::jsonb/g;
  for (const m of text.matchAll(re)) {
    out.set(m[2]!, {
      version: Number(m[3]),
      columns: JSON.parse(m[5]!) as SandboxColumn[],
      rows: JSON.parse(m[7]!) as SandboxCell[][],
    });
  }
  return out;
}

/**
 * Alternative solutions shown to learners after the solution is revealed («Alternativa: …», with a
 * copy button) whose result is identical to the reference, but which the grader rejects because
 * the exercise's `validation_rules.required_concepts` names a concept the alternative does not
 * use. A learner who submits one is told «Este ejercicio espera que uses: …» about a query the
 * product itself published as valid. Found by this test on 2026-09-25 (29 cases) and resolved the
 * same day per exercise: the alternative was removed when the required concept is what the
 * exercise teaches, the requirement was dropped when it was incidental. Keep this list empty; a
 * new entry needs the same pedagogy decision, not a quarantine. The test enforces exact equality.
 */
const KNOWN_CONCEPT_BLOCKED_ALTERNATIVES: readonly string[] = [];

/**
 * Correctness, not speed: under a loaded machine (a full `npm run quality` runs test files in
 * parallel) the slowest published solutions took 3–9 s against a 5 s production budget, so the
 * real limit made this test flaky. Speed is a separate content problem, reported, not asserted.
 */
const CORRECTNESS_TIMEOUT_MS = 60_000;

const loaded = loadContent();
const expectedBySlug = readExpectedSeed();
const datasetsBuilt = loaded.exercises.every((ex) =>
  existsSync(join(datasetDirFor(ex.dataset), "manifest.json")),
);

const cases = loaded.exercises.flatMap((ex) => [
  { exercise: ex, label: "reference_solution", alternative: null, sql: ex.reference_solution },
  ...ex.alternative_solutions.map((alt) => ({
    exercise: ex,
    label: `alternative «${alt.label}»`,
    alternative: alt.label,
    sql: alt.sql,
  })),
]);

type Exercise = (typeof loaded.exercises)[number];

function grade(ex: Exercise, sql: string) {
  const expected = expectedBySlug.get(ex.slug)!;
  return gradeSubmission({
    engine: workerEngine,
    dataset: ex.dataset,
    sql,
    allowedStatements: ex.allowed_statements,
    expected,
    expectedColumns: ex.expected_columns,
    validationRules: ex.validation_rules,
    commonMistakeCategories: ex.common_mistakes.map((m) => m.category),
    improvementConditions: ex.improvement_feedback,
    hardTimeoutMs: CORRECTNESS_TIMEOUT_MS,
  });
}

describe.skipIf(!datasetsBuilt)("every published solution is graded correct", () => {
  it("the expected-results seed has one row per exercise, at the exercise's dataset version", () => {
    const missing = loaded.exercises.filter((ex) => !expectedBySlug.has(ex.slug));
    expect(missing.map((ex) => ex.slug)).toEqual([]);
    const wrongVersion = loaded.exercises.filter(
      (ex) => expectedBySlug.get(ex.slug)?.version !== ex.dataset.version,
    );
    expect(wrongVersion.map((ex) => ex.slug)).toEqual([]);
  });

  it(`grades all ${cases.length} reference and alternative solutions as correct`, async () => {
    const failures: string[] = [];
    const conceptBlocked: string[] = [];
    for (const c of cases) {
      if (!expectedBySlug.has(c.exercise.slug)) continue; // reported by the test above
      const r = await grade(c.exercise, c.sql);
      if (r.correct) continue;
      const blocking = r.feedback.filter((f) => f.severity === "blocking");
      if (
        c.label !== "reference_solution" &&
        blocking.length > 0 &&
        blocking.every((f) => f.category === "required_concept_missing")
      ) {
        conceptBlocked.push(`${c.exercise.slug} | ${c.alternative}`);
        continue;
      }
      const why = r.outcome.ok
        ? blocking
            .map((f) => `${f.messageKey}${f.params ? JSON.stringify(f.params) : ""}`)
            .join("; ")
        : `${r.outcome.code}: ${r.outcome.message}`;
      failures.push(`${c.exercise.slug} (${c.label}): ${why}`);
    }
    expect(failures).toEqual([]);
    // Quarantine, not acceptance: see KNOWN_CONCEPT_BLOCKED_ALTERNATIVES. Exact equality, so a new
    // case fails here and a fixed one has to be removed from the list.
    expect(conceptBlocked.sort()).toEqual([...KNOWN_CONCEPT_BLOCKED_ALTERNATIVES].sort());
  }, 600_000);
});

describe.skipIf(!datasetsBuilt)("pedidos-primera-quincena-marzo (round 6, item 11)", () => {
  const ex = loaded.exercises.find((e) => e.slug === "pedidos-primera-quincena-marzo")!;

  it("accepts the reference solution exactly as the learner pasted it in production", async () => {
    const r = await grade(
      ex,
      "SELECT id, created_at, total_amount\nFROM orders\nWHERE created_at >= '2025-03-01'\n  AND created_at < '2025-03-16';",
    );
    expect(r.correct).toBe(true);
  }, 60_000);

  it("explains the date boundary when the last day is cut at midnight with <=", async () => {
    // The attempt recorded in production before the reference: 479 rows instead of 510, 31 short
    // (6 %), which was above the old 5 % threshold, so only the bare row count was shown.
    const r = await grade(
      ex,
      "SELECT\n  id,created_at, total_amount\n  FROM orders\nWHERE created_at >= '2025-03-01'\nAND created_at <= '2025-03-15'",
    );
    expect(r.correct).toBe(false);
    expect(r.outcome.ok && r.outcome.rowCount).toBe(479);
    expect(r.feedback.map((f) => f.category)).toContain("date_boundary");
  }, 60_000);
});
