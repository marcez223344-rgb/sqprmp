import { z } from "zod";
import { limits } from "@/config/limits";
import {
  difficultySchema,
  feedbackCategorySchema,
  markdownSchema,
  slugSchema,
  sqlConceptSchema,
} from "./common";

export const expectedColumnSchema = z.object({
  name: z.string().regex(/^[a-z_][a-z0-9_]*$/),
  type: z.enum(["text", "integer", "numeric", "boolean", "date", "timestamp", "any"]),
});

export const validationRulesSchema = z.object({
  order_matters: z.boolean().default(false),
  numeric_tolerance: z.number().nonnegative().default(0.01),
  allow_extra_columns: z.boolean().default(false),
  dedupe: z.boolean().default(false),
  required_concepts: z.array(sqlConceptSchema).default([]),
  prohibited_patterns: z.array(z.string().min(1)).default([]),
  max_execution_ms: z.number().int().positive().default(limits.sandbox.statementTimeoutMs),
});

export const hintSchema = z.object({
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  body_md: markdownSchema,
  coin_cost: z.number().int().nonnegative(),
  xp_penalty_percent: z.number().int().min(0).max(100),
});

export const commonMistakeSchema = z.object({
  category: feedbackCategorySchema,
  description_md: markdownSchema,
});

export const improvementFeedbackSchema = z.object({
  condition: z.enum([
    "uses_select_star",
    "missing_alias_on_aggregate",
    "no_table_alias_in_join",
    "uses_between_for_timestamps",
    "uses_implicit_join",
    "uppercase_inconsistent",
  ]),
  message_key: z.string().min(3),
});

export const exerciseSchema = z
  .object({
    slug: slugSchema,
    section: slugSchema,
    title: z.string().min(3).max(120),
    difficulty: difficultySchema,
    estimated_minutes: z.number().int().min(1).max(60),
    concepts: z.array(sqlConceptSchema).min(1),
    prerequisites: z.array(slugSchema).default([]),
    dataset: z.object({ slug: slugSchema, version: z.number().int().positive() }),
    tables_used: z.array(z.string().regex(/^[a-z_][a-z0-9_]*$/)).min(1),
    scenario_md: markdownSchema,
    business_question_md: markdownSchema,
    learning_objective: z.string().min(10).max(300),
    theory_ref: slugSchema,
    expected_columns: z.array(expectedColumnSchema).min(1),
    validation_rules: validationRulesSchema,
    reference_solution: z.string().min(10),
    alternative_solutions: z
      .array(z.object({ label: z.string().min(2), sql: z.string().min(10) }))
      .default([]),
    hints: z.array(hintSchema).length(limits.hints.levels),
    common_mistakes: z.array(commonMistakeSchema).min(3),
    expert_explanation_md: markdownSchema,
    improvement_feedback: z.array(improvementFeedbackSchema).default([]),
    reward: z.object({
      xp: z.number().int().positive(),
      coins: z.number().int().nonnegative(),
      solution_reveal_xp_percent: z.number().int().min(0).max(100),
    }),
    solution_unlock: z.object({
      min_attempts: z.number().int().positive(),
      min_hints: z.number().int().positive(),
      min_minutes: z.number().int().positive(),
      allow_explicit: z.boolean(),
    }),
    allowed_statements: z
      .array(z.enum(["select", "insert", "update", "delete"]))
      .min(1)
      .default(["select"]),
    is_published: z.boolean(),
    notes: z.string().optional(),
  })
  .superRefine((ex, ctx) => {
    const levels = ex.hints.map((h) => h.level);
    if (new Set(levels).size !== ex.hints.length || !levels.includes(1) || !levels.includes(3)) {
      ctx.addIssue({ code: "custom", path: ["hints"], message: "hints must be levels 1, 2 and 3" });
    }
    const defaults = limits.rewards.byDifficulty[ex.difficulty];
    if ((ex.reward.xp !== defaults.xp || ex.reward.coins !== defaults.coins) && !ex.notes) {
      ctx.addIssue({
        code: "custom",
        path: ["reward"],
        message: `reward differs from defaults for ${ex.difficulty}; add a justification in notes`,
      });
    }
    // Hint 3 must not be the full solution.
    const normalize = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();
    const hint3 = ex.hints.find((h) => h.level === 3);
    if (hint3 && normalize(hint3.body_md).includes(normalize(ex.reference_solution))) {
      ctx.addIssue({
        code: "custom",
        path: ["hints"],
        message: "hint 3 leaks the reference solution",
      });
    }
  });

/** Authored shape (defaults optional). */
export type ExerciseDef = z.input<typeof exerciseSchema>;
export type Exercise = z.output<typeof exerciseSchema>;

/** Default reward/unlock helpers so authored files stay short. */
export function defaultReward(difficulty: ExerciseDef["difficulty"]) {
  const d = limits.rewards.byDifficulty[difficulty];
  return {
    xp: d.xp,
    coins: d.coins,
    solution_reveal_xp_percent: limits.solutionUnlock.xpPercentAfterReveal,
  };
}

export const defaultSolutionUnlock = {
  min_attempts: limits.solutionUnlock.minGenuineAttempts,
  min_hints: limits.solutionUnlock.minHintsRequested,
  min_minutes: limits.solutionUnlock.minMinutesElapsed,
  allow_explicit: limits.solutionUnlock.allowExplicitReveal,
} as const;

export function defaultHintMeta(level: 1 | 2 | 3) {
  return {
    coin_cost: limits.hints.coinCostByLevel[level - 1],
    xp_penalty_percent: limits.hints.xpPenaltyPercentPerHint,
  };
}
