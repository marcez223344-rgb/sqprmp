import { z } from "zod";

export const slugSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug must be kebab-case")
  .min(2)
  .max(80);

export const difficultySchema = z.enum(["very_easy", "easy", "intermediate", "advanced", "expert"]);
export type Difficulty = z.infer<typeof difficultySchema>;

export const levelSchema = z.enum(["beginner", "intermediate", "advanced", "expert"]);
export type Level = z.infer<typeof levelSchema>;

export const lessonKindSchema = z.enum(["theory", "exercise", "quiz", "challenge"]);
export type LessonKind = z.infer<typeof lessonKindSchema>;

/** Markdown body in es-419. Kept short: lessons ≤ 900 words are enforced separately. */
export const markdownSchema = z.string().min(1);

/** Stable identifier used by the feedback engine (docs/CONTENT_GUIDELINES.md §3). */
export const feedbackCategorySchema = z.enum([
  "syntax",
  "wrong_columns",
  "wrong_column_order",
  "row_count",
  "cell_values",
  "wrong_order",
  "duplicates",
  "missing_filter",
  "join_condition",
  "aggregation_level",
  "null_handling",
  "date_boundary",
  "required_concept_missing",
  "prohibited_pattern",
  "performance",
  "readability",
]);
export type FeedbackCategory = z.infer<typeof feedbackCategorySchema>;

/** SQL concepts recognized by the validator (required/prohibited checks). */
export const sqlConceptSchema = z.enum([
  "select",
  "where",
  "distinct",
  "order_by",
  "limit",
  "alias",
  "case",
  "null_handling",
  "text_functions",
  "numeric_functions",
  "date_functions",
  "aggregate",
  "group_by",
  "having",
  "inner_join",
  "outer_join",
  "self_join",
  "subquery",
  "cte",
  "set_operations",
  "conditional_aggregation",
  "window_function",
  "ranking",
  "lag_lead",
]);
export type SqlConcept = z.infer<typeof sqlConceptSchema>;

export function wordCount(markdown: string): number {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*_`|-]/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
}
