import { z } from "zod";
import { difficultySchema, markdownSchema, slugSchema } from "./common";

export const questionTypeSchema = z.enum([
  "single",
  "multiple",
  "true_false",
  "fill_blank",
  "query_interpretation",
  "error_diagnosis",
  "matching",
  "scenario",
]);
export type QuestionType = z.infer<typeof questionTypeSchema>;

const optionSchema = z.object({
  key: z.string().regex(/^[a-h]$/),
  body_md: markdownSchema,
  is_correct: z.boolean(),
  why_incorrect_md: markdownSchema.optional(),
});

const pairSchema = z.object({ left: z.string().min(1), right: z.string().min(1) });

export const questionSchema = z
  .object({
    slug: slugSchema,
    section: slugSchema,
    lesson: slugSchema,
    type: questionTypeSchema,
    difficulty: difficultySchema,
    topic: z.string().min(3).max(80),
    tags: z.array(z.string().min(2).max(40)).min(1),
    estimated_seconds: z.number().int().min(10).max(600),
    prompt_md: markdownSchema,
    code_md: z.string().nullable().default(null),
    options: z.array(optionSchema).min(2).max(8).optional(),
    /** fill_blank: accepted answers (case-insensitive by default). */
    answer: z
      .object({
        accepted: z.array(z.string().min(1)).min(1),
        case_sensitive: z.boolean().default(false),
      })
      .optional(),
    /** matching: pairs to match. */
    pairs: z.array(pairSchema).min(2).max(8).optional(),
    explanation_md: markdownSchema,
    is_published: z.boolean(),
  })
  .superRefine((q, ctx) => {
    const optionTypes = new Set([
      "single",
      "multiple",
      "true_false",
      "query_interpretation",
      "error_diagnosis",
      "scenario",
    ]);
    if (optionTypes.has(q.type)) {
      if (!q.options) {
        ctx.addIssue({ code: "custom", path: ["options"], message: `${q.type} requires options` });
        return;
      }
      const correct = q.options.filter((o) => o.is_correct).length;
      if (q.type === "multiple" ? correct < 1 : correct !== 1) {
        ctx.addIssue({
          code: "custom",
          path: ["options"],
          message: "wrong number of correct options",
        });
      }
      if (q.type === "true_false" && q.options.length !== 2) {
        ctx.addIssue({
          code: "custom",
          path: ["options"],
          message: "true_false needs exactly 2 options",
        });
      }
      for (const o of q.options) {
        if (!o.is_correct && !o.why_incorrect_md) {
          ctx.addIssue({
            code: "custom",
            path: ["options", o.key],
            message: "distractors need why_incorrect_md",
          });
        }
      }
      const keys = q.options.map((o) => o.key);
      if (new Set(keys).size !== keys.length) {
        ctx.addIssue({ code: "custom", path: ["options"], message: "duplicate option keys" });
      }
    }
    if (q.type === "fill_blank" && !q.answer) {
      ctx.addIssue({ code: "custom", path: ["answer"], message: "fill_blank requires answer" });
    }
    if (q.type === "matching" && !q.pairs) {
      ctx.addIssue({ code: "custom", path: ["pairs"], message: "matching requires pairs" });
    }
    if ((q.type === "query_interpretation" || q.type === "error_diagnosis") && !q.code_md) {
      ctx.addIssue({ code: "custom", path: ["code_md"], message: `${q.type} requires code_md` });
    }
  });

/** Authored shape (defaults optional). */
export type QuestionDef = z.input<typeof questionSchema>;
export type Question = z.output<typeof questionSchema>;
