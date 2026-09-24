import { z } from "zod";
import { countryCodes } from "@/config/countries";
import { limits } from "@/config/limits";

export const sqlLevels = ["none", "beginner", "intermediate", "advanced"] as const;
export const mainGoals = [
  "first_job",
  "improve",
  "career_change",
  "business",
  "interviews",
  "advanced_practice",
] as const;
export const genders = ["female", "male", "non_binary", "other", "prefer_not_to_say"] as const;
export const weeklyGoals = [60, 120, 180, 300] as const;

export const aliasSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(limits.alias.minLength, "alias_length")
  .max(limits.alias.maxLength, "alias_length")
  .regex(limits.alias.pattern, "alias_pattern");

function minBirthDate() {
  const d = new Date();
  d.setFullYear(d.getFullYear() - limits.profile.minAge);
  return d;
}

export const identityStepSchema = z.object({
  display_name: z
    .string()
    .trim()
    .min(1, "required")
    .max(limits.profile.displayNameMaxLength, "too_long"),
  alias: aliasSchema,
  avatar_id: z.uuid("avatar_invalid"),
});

export const aboutStepSchema = z.object({
  country: z.enum(countryCodes),
  birth_date: z
    .string("required")
    .min(1, "required")
    .transform((s) => new Date(s))
    .pipe(z.date("invalid_date").max(minBirthDate(), "min_age"))
    .transform((d) => d.toISOString().slice(0, 10)),
  gender: z.enum(genders).or(z.literal("")).optional(),
  sql_level: z.enum(sqlLevels),
  main_goal: z.enum(mainGoals),
  weekly_goal_minutes: z.coerce.number("choose").int().min(30, "choose").max(1200, "choose"),
});

export const consentStepSchema = z.object({
  accept_terms: z.literal(true, { error: "consent_required" }),
  accept_privacy: z.literal(true, { error: "consent_required" }),
  // Publishing alias, avatar, level, XP and weekly practice to other learners is never a default
  // (D-35): an absent value means "no".
  leaderboard_opt_in: z.boolean().default(false),
});

export const onboardingSchema = identityStepSchema
  .extend(aboutStepSchema.shape)
  .extend(consentStepSchema.shape);
export type OnboardingInput = z.input<typeof onboardingSchema>;
export type OnboardingValues = z.output<typeof onboardingSchema>;

export const profileUpdateSchema = z.object({
  display_name: z
    .string()
    .trim()
    .min(1, "required")
    .max(limits.profile.displayNameMaxLength, "too_long"),
  certificate_name: z.string().trim().min(1, "required").max(80, "too_long"),
  avatar_id: z.uuid("avatar_invalid"),
  country: z.enum(countryCodes),
  gender: z.enum(genders).or(z.literal("")).optional(),
  sql_level: z.enum(sqlLevels),
  main_goal: z.enum(mainGoals),
  weekly_goal_minutes: z.coerce.number("choose").int().min(30, "choose").max(1200, "choose"),
  timezone: z.string().min(1, "required").max(64, "too_long"),
  leaderboard_opt_in: z.boolean(),
});
export type ProfileUpdateInput = z.input<typeof profileUpdateSchema>;
export type ProfileUpdateValues = z.output<typeof profileUpdateSchema>;

/** Coerces a stored profile row into safe form defaults (unknown values fall back). */
export function profileToFormInput(p: {
  display_name: string | null;
  certificate_name: string | null;
  avatar_id: string | null;
  country: string | null;
  gender: string | null;
  sql_level: string | null;
  main_goal: string | null;
  weekly_goal_minutes: number | null;
  timezone: string;
  leaderboard_opt_in: boolean;
}): ProfileUpdateInput {
  const pick = <T extends readonly string[]>(list: T, value: string | null, fallback: T[number]) =>
    (list as readonly string[]).includes(value ?? "") ? (value as T[number]) : fallback;
  return {
    display_name: p.display_name ?? "",
    certificate_name: p.certificate_name ?? p.display_name ?? "",
    avatar_id: p.avatar_id ?? "",
    country: pick(countryCodes, p.country, "XX"),
    gender: (genders as readonly string[]).includes(p.gender ?? "")
      ? (p.gender as (typeof genders)[number])
      : "",
    sql_level: pick(sqlLevels, p.sql_level, "beginner"),
    main_goal: pick(mainGoals, p.main_goal, "improve"),
    weekly_goal_minutes: p.weekly_goal_minutes ?? 120,
    timezone: p.timezone,
    leaderboard_opt_in: p.leaderboard_opt_in,
  };
}
