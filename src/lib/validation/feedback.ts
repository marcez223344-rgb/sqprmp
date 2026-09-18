import type { Statement } from "pgsql-ast-parser";
import type { FeedbackCategory, SqlConcept } from "@/content/schemas/common";
import type { CompareOutcome } from "./compare";
import { detectConcepts, detectImprovements } from "./concepts";

export interface FeedbackItem {
  category: FeedbackCategory;
  /** Key under `feedback.messages` in the message catalog. */
  messageKey: string;
  params?: Record<string, string | number>;
  severity: "blocking" | "warning" | "tip";
}

export interface FeedbackInput {
  sql: string;
  statement: Statement;
  functions: string[];
  compare: CompareOutcome;
  requiredConcepts: SqlConcept[];
  prohibitedPatterns: string[];
  /** Categories the author flagged as common mistakes for this exercise. */
  commonMistakeCategories: FeedbackCategory[];
  improvementConditions: { condition: string; message_key: string }[];
}

/**
 * Turns comparator findings + AST heuristics into categorized, educational feedback
 * (never just "incorrecto"). Blocking items explain why the answer is not accepted;
 * warnings point at likely misconceptions; tips are readability improvements.
 */
export function buildFeedback(input: FeedbackInput): {
  items: FeedbackItem[];
  concepts: SqlConcept[];
  correct: boolean;
} {
  const items: FeedbackItem[] = [];
  const concepts = detectConcepts(input.statement, input.functions);

  for (const f of input.compare.findings) {
    items.push({
      category: f.category,
      messageKey: f.messageKey,
      params: f.params,
      severity: "blocking",
    });
  }

  const missingConcepts = input.requiredConcepts.filter((c) => !concepts.has(c));
  if (missingConcepts.length) {
    items.push({
      category: "required_concept_missing",
      messageKey: "required_concept_missing",
      params: { concepts: missingConcepts.join(", ") },
      severity: "blocking",
    });
  }
  for (const pattern of input.prohibitedPatterns) {
    let re: RegExp | null = null;
    try {
      re = new RegExp(pattern, "i");
    } catch {
      re = null;
    }
    if (re?.test(input.sql)) {
      items.push({
        category: "prohibited_pattern",
        messageKey: "prohibited_pattern",
        params: { pattern },
        severity: "blocking",
      });
    }
  }

  const { stats } = input.compare;
  const rowDelta = stats.actualRows - stats.expectedRows;
  const hasJoin = concepts.has("inner_join") || concepts.has("outer_join");
  const mistakes = new Set(input.commonMistakeCategories);

  // Heuristics ordered from most to least specific.
  if (rowDelta > 0 && !concepts.has("where") && input.requiredConcepts.includes("where")) {
    items.push({ category: "missing_filter", messageKey: "missing_filter", severity: "warning" });
  } else if (
    rowDelta > 0 &&
    hasJoin &&
    stats.expectedRows > 0 &&
    stats.actualRows >= stats.expectedRows * 2
  ) {
    items.push({
      category: "join_condition",
      messageKey: "join_multiplies_rows",
      params: { actual: stats.actualRows, expected: stats.expectedRows },
      severity: "warning",
    });
  } else if (rowDelta !== 0 && concepts.has("group_by") && mistakes.has("aggregation_level")) {
    items.push({
      category: "aggregation_level",
      messageKey: "aggregation_level",
      severity: "warning",
    });
  } else if (rowDelta !== 0 && Math.abs(rowDelta) <= Math.max(3, stats.expectedRows * 0.05)) {
    if (mistakes.has("date_boundary") && /<=|between/i.test(input.sql)) {
      items.push({ category: "date_boundary", messageKey: "date_boundary", severity: "warning" });
    } else if (mistakes.has("null_handling")) {
      items.push({ category: "null_handling", messageKey: "null_handling", severity: "warning" });
    }
  }
  if (
    stats.actualDuplicates > 0 &&
    mistakes.has("duplicates") &&
    !items.some((i) => i.category === "duplicates")
  ) {
    items.push({ category: "duplicates", messageKey: "duplicates_hint", severity: "warning" });
  }
  if (rowDelta < 0 && concepts.has("inner_join") && mistakes.has("join_condition")) {
    items.push({
      category: "join_condition",
      messageKey: "inner_join_drops_rows",
      severity: "warning",
    });
  }

  const improvements = detectImprovements(input.sql, input.statement, concepts);
  for (const cond of improvements) {
    const configured = input.improvementConditions.find((c) => c.condition === cond);
    items.push({
      category: "readability",
      messageKey: configured?.message_key ?? `improve.${cond}`,
      severity: "tip",
    });
  }

  const correct = input.compare.correct && !items.some((i) => i.severity === "blocking");
  return { items, concepts: [...concepts], correct };
}
