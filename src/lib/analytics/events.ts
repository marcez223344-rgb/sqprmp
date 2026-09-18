import { z } from "zod";

/**
 * First-party analytics event spec (docs/ANALYTICS.md). Properties are validated before
 * being stored; anything not listed here is rejected. No PII, no raw SQL, no emails.
 */
const slug = z.string().regex(/^[a-z0-9-]{2,80}$/);
const provider = z.enum(["google"]);

export const analyticsEvents = {
  page_viewed: z.object({
    path: z.string().max(200),
    referrer_domain: z.string().max(120).nullable(),
  }),
  signup_started: z.object({ provider }),
  signup_completed: z.object({ provider, country: z.string().length(2).nullable() }),
  onboarding_step_completed: z.object({ step: z.number().int().min(1).max(3) }),
  onboarding_completed: z.object({
    sql_level: z.string().max(40).nullable(),
    main_goal: z.string().max(40).nullable(),
    weekly_goal_minutes: z.number().int().nullable(),
    age_band: z.string().max(10).nullable(),
  }),
  exercise_started: z.object({
    exercise_slug: slug,
    difficulty: z.string().max(20),
    is_free: z.boolean(),
  }),
  query_run: z.object({
    exercise_slug: slug.nullable(),
    engine: z.enum(["browser", "server"]),
    status: z.enum(["ok", "error"]),
    duration_ms: z.number().int().nonnegative().nullable(),
    sqlstate: z.string().max(5).nullable(),
  }),
  exercise_submitted: z.object({
    exercise_slug: slug,
    status: z.enum(["correct", "incorrect", "error"]),
    attempt_number: z.number().int().positive(),
    feedback_categories: z.array(z.string().max(40)).max(20),
  }),
  exercise_completed: z.object({
    exercise_slug: slug,
    attempts: z.number().int().positive(),
    hints_used: z.number().int().min(0).max(3),
    solution_revealed: z.boolean(),
    minutes: z.number().nonnegative().nullable(),
  }),
  hint_requested: z.object({ exercise_slug: slug, level: z.number().int().min(1).max(3) }),
  solution_revealed: z.object({ exercise_slug: slug, reason: z.string().max(40) }),
  lesson_viewed: z.object({ lesson_slug: slug, kind: z.string().max(20) }),
  quiz_submitted: z.object({
    lesson_slug: slug,
    score: z.number().int().nonnegative(),
    total: z.number().int().positive(),
    passed: z.boolean(),
  }),
  review_session_started: z.object({ question_count: z.number().int().nonnegative() }),
  section_completed: z.object({ section_slug: slug }),
  certificate_issued: z.object({ requirement_slug: slug }),
  paywall_viewed: z.object({
    trigger: z.enum(["limit_reached", "locked_lesson", "pricing_page"]),
    exercise_slug: slug.optional(),
  }),
  checkout_started: z.object({
    product_slug: slug,
    provider: z.string().max(20),
    currency: z.string().length(3),
  }),
  purchase_completed: z.object({
    product_slug: slug.nullable(),
    provider: z.string().max(20),
    currency: z.string().length(3),
    amount_minor: z.number().int().nonnegative(),
  }),
  promo_redeemed: z.object({ kind: z.string().max(20) }),
  streak_frozen: z.object({ length: z.number().int().nonnegative() }),
  badge_earned: z.object({ badge_slug: slug }),
} as const;

export type AnalyticsEventName = keyof typeof analyticsEvents;
export type AnalyticsProps<N extends AnalyticsEventName> = z.infer<(typeof analyticsEvents)[N]>;

/** Validates a (name, properties) pair; returns null when the event is unknown or invalid. */
export function parseAnalyticsEvent<N extends AnalyticsEventName>(
  name: N,
  props: unknown,
): AnalyticsProps<N> | null {
  const schema = analyticsEvents[name];
  if (!schema) return null;
  const parsed = schema.strict().safeParse(props);
  return parsed.success ? (parsed.data as AnalyticsProps<N>) : null;
}
