import type { FeedbackCategory, SqlConcept } from "@/content/schemas/common";
import { gateSql, type AllowedStatement } from "@/lib/sandbox/gate";
import type { DatasetRef, SandboxEngine, SandboxOutcome } from "@/lib/sandbox/types";
import {
  compareResults,
  type ExpectedColumn,
  type ResultSet,
  type ValidationRules,
} from "./compare";
import { buildFeedback, type FeedbackItem } from "./feedback";

export type StoredValidationRules = Partial<ValidationRules> & {
  required_concepts?: SqlConcept[];
  prohibited_patterns?: string[];
};

export interface GradeInput {
  engine: SandboxEngine;
  dataset: DatasetRef;
  sql: string;
  allowedStatements: AllowedStatement[];
  /** The stored expected result (`exercise_expected_results.columns/rows`). */
  expected: Pick<ResultSet, "columns" | "rows">;
  expectedColumns: ExpectedColumn[];
  validationRules: StoredValidationRules;
  commonMistakeCategories: FeedbackCategory[];
  improvementConditions: { condition: string; message_key: string }[];
  /** Tests only: submissions always run under `limits.sandbox.hardTimeoutMs`. */
  hardTimeoutMs?: number;
}

export interface GradeOutcome {
  outcome: SandboxOutcome;
  correct: boolean;
  feedback: FeedbackItem[];
}

/**
 * The graded verdict for one submission: execute in the isolated engine, compare with the stored
 * expected result, build feedback. `submitExercise` and the reference-solution regression test
 * (tests/sandbox/reference-solutions.test.ts) both call this, so the test proves what learners get.
 */
export async function gradeSubmission(input: GradeInput): Promise<GradeOutcome> {
  const outcome = await input.engine.execute(input.dataset, input.sql, {
    allowedStatements: input.allowedStatements,
    hardTimeoutMs: input.hardTimeoutMs,
  });
  if (!outcome.ok) return { outcome, correct: false, feedback: [] };

  const gate = gateSql(input.sql, input.allowedStatements);
  const rules = {
    order_matters: false,
    numeric_tolerance: 0.01,
    allow_extra_columns: false,
    dedupe: false,
    ...input.validationRules,
  };
  const compare = compareResults(
    { columns: outcome.columns, rows: outcome.rows, truncated: outcome.truncated },
    { columns: input.expected.columns, rows: input.expected.rows },
    input.expectedColumns,
    rules,
  );
  const built = buildFeedback({
    sql: input.sql,
    statement: gate.ast!,
    functions: gate.functions,
    compare,
    requiredConcepts: rules.required_concepts ?? [],
    prohibitedPatterns: rules.prohibited_patterns ?? [],
    commonMistakeCategories: input.commonMistakeCategories,
    improvementConditions: input.improvementConditions,
  });
  return { outcome, correct: built.correct, feedback: built.items };
}
