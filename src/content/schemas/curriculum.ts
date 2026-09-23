import { z } from "zod";
import { limits } from "@/config/limits";
import { levelSchema, lessonKindSchema, markdownSchema, slugSchema, wordCount } from "./common";

export const LESSON_MAX_WORDS = 900;

export const courseSchema = z.object({
  slug: slugSchema,
  title: z.string().min(3).max(120),
  description: z.string().min(10).max(600),
  sort_order: z.number().int().nonnegative(),
  is_published: z.boolean(),
});
export type CourseDef = z.infer<typeof courseSchema>;

export const sectionSchema = z.object({
  slug: slugSchema,
  course: slugSchema,
  number: z.number().int().positive(),
  level: levelSchema,
  title: z.string().min(3).max(120),
  summary: z.string().min(20).max(600),
  objectives: z.array(z.string().min(10).max(200)).min(3).max(6),
  /**
   * Questions served in one attempt at this section's quiz (D-37). Omitted means
   * `limits.quiz.questionsPerAttempt`. The value must be one of `limits.quiz.lengthsAllowed` and
   * the section's published bank must be at least `value + limits.quiz.minUnseenOnRetry`
   * (checked in src/content/load.ts).
   */
  quiz_questions: z
    .number()
    .int()
    .refine((n) => (limits.quiz.lengthsAllowed as readonly number[]).includes(n), {
      message: `quiz length must be one of ${limits.quiz.lengthsAllowed.join(", ")} (see limits.quiz.lengthsAllowed)`,
    })
    .optional(),
  /** Section slug that must be completed before this one (linear inside a level). */
  requires: slugSchema.nullable(),
  /** Whether the theory (not the gated exercises) is available without an entitlement. */
  is_free_theory: z.boolean(),
  /** Outline-only sections are visible on the path but not startable. */
  is_published: z.boolean(),
  certificate: slugSchema.nullable(),
});
export type SectionDef = z.infer<typeof sectionSchema>;

export const lessonSchema = z
  .object({
    slug: slugSchema,
    section: slugSchema,
    kind: lessonKindSchema,
    title: z.string().min(3).max(120),
    sort_order: z.number().int().nonnegative(),
    estimated_minutes: z.number().int().min(1).max(60),
    /** Theory lessons carry markdown; exercise/quiz/challenge lessons reference content by slug. */
    body_md: markdownSchema.optional(),
    /** Exercise or quiz reference (slug) for non-theory lessons. */
    ref: slugSchema.optional(),
    dataset: slugSchema.optional(),
    is_free: z.boolean(),
    is_published: z.boolean(),
    prerequisites: z.array(slugSchema).default([]),
  })
  .superRefine((lesson, ctx) => {
    if (lesson.kind === "theory") {
      if (!lesson.body_md) {
        ctx.addIssue({ code: "custom", path: ["body_md"], message: "theory lessons need body_md" });
      } else if (wordCount(lesson.body_md) > LESSON_MAX_WORDS) {
        ctx.addIssue({
          code: "custom",
          path: ["body_md"],
          message: `lesson exceeds ${LESSON_MAX_WORDS} words (${wordCount(lesson.body_md)})`,
        });
      }
    } else if (!lesson.ref) {
      ctx.addIssue({ code: "custom", path: ["ref"], message: `${lesson.kind} lessons need ref` });
    }
  });
export type LessonDef = z.output<typeof lessonSchema>;

export const datasetColumnSchema = z.object({
  name: z.string().regex(/^[a-z_][a-z0-9_]*$/),
  data_type: z.string().min(2).max(40),
  description: z.string().min(3).max(300),
  is_pk: z.boolean().default(false),
  fk_ref: z
    .string()
    .regex(/^[a-z_][a-z0-9_]*\.[a-z_][a-z0-9_]*$/)
    .nullable()
    .default(null),
});

export const datasetTableSchema = z.object({
  name: z.string().regex(/^[a-z_][a-z0-9_]*$/),
  description: z.string().min(3).max(400),
  columns: z.array(datasetColumnSchema).min(1),
});

export const datasetSchema = z.object({
  slug: slugSchema,
  version: z.number().int().positive(),
  title: z.string().min(3).max(80),
  domain: z.string().min(3).max(80),
  description: z.string().min(20).max(800),
  tables: z.array(datasetTableSchema).min(1),
  is_active: z.boolean(),
});
export type DatasetDef = z.infer<typeof datasetSchema>;
