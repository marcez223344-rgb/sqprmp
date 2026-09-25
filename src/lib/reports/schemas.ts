import { z } from "zod";
import { limits } from "@/config/limits";

/**
 * Categories of a private exercise report (D-42). The same list is a CHECK constraint on
 * `exercise_reports.category` (migration 20260925150000); keep them in sync.
 */
export const REPORT_CATEGORIES = [
  "confusing_statement",
  "marked_wrong",
  "data_error",
  "other",
] as const;
export type ReportCategory = (typeof REPORT_CATEGORIES)[number];

export const REPORT_STATUSES = ["open", "resolved"] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

/**
 * What the learner fills in. Used by the form (zodResolver) and by the server action, so the
 * message codes (`category_required`, `note_too_short`, `note_too_long`) are the ones the form
 * translates.
 */
export const reportFormSchema = z.object({
  category: z.enum(REPORT_CATEGORIES, { error: "category_required" }),
  // Counted in code points, like Postgres `char_length`: `.min()` counts UTF-16 units, so five
  // emoji would pass here and then fail the CHECK constraint with a generic error.
  note: z
    .string()
    .trim()
    .refine((s) => [...s].length >= limits.exerciseReport.noteMinLength, "note_too_short")
    .refine((s) => s.length <= limits.exerciseReport.noteMaxLength, "note_too_long"),
});
export type ReportFormValues = z.infer<typeof reportFormSchema>;

/**
 * Longest SQL the endpoint will even look at. The attachment is context, so an overlong query is
 * cut to `sqlMaxChars` instead of making the whole report fail; beyond this it is not a query
 * someone typed but a payload, and it is refused.
 */
const SQL_REFUSE_ABOVE_CHARS = limits.exerciseReport.sqlMaxChars * 4;

/** Full server-side input: the form plus the exercise and the editor contents. */
export const reportInputSchema = reportFormSchema.extend({
  exerciseId: z.uuid(),
  sql: z
    .string()
    .max(SQL_REFUSE_ABOVE_CHARS)
    .nullish()
    .transform((v) => {
      const trimmed = (v ?? "").trim();
      return trimmed ? trimmed.slice(0, limits.exerciseReport.sqlMaxChars) : null;
    }),
});
export type ReportInput = z.infer<typeof reportInputSchema>;
