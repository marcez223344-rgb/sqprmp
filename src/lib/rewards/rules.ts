import { limits } from "@/config/limits";

/**
 * Pure reward rules (docs/CONTENT_GUIDELINES.md §6). The database RPC enforces idempotency,
 * the daily cap and streaks; these functions decide the amounts. Level curve mirrors
 * `public.level_for_xp` in the gamification migration.
 */
export interface ExerciseRewardConfig {
  xp: number;
  coins: number;
  solution_reveal_xp_percent: number;
}

export interface ExerciseRewardInput {
  config: ExerciseRewardConfig;
  hintsUsed: number;
  solutionRevealed: boolean;
}

export function computeExerciseReward({
  config,
  hintsUsed,
  solutionRevealed,
}: ExerciseRewardInput): {
  xp: number;
  coins: number;
  penaltyPercent: number;
} {
  const hintPenalty = Math.min(
    hintsUsed * limits.hints.xpPenaltyPercentPerHint,
    limits.hints.maxXpPenaltyPercent,
  );
  if (solutionRevealed) {
    return {
      xp: Math.round((config.xp * config.solution_reveal_xp_percent) / 100),
      coins: 0,
      penaltyPercent: 100 - config.solution_reveal_xp_percent,
    };
  }
  return {
    xp: Math.round((config.xp * (100 - hintPenalty)) / 100),
    coins: config.coins,
    penaltyPercent: hintPenalty,
  };
}

/** XP required to *reach* level n (level 1 = 0, 2 = 100, 3 = 300, 4 = 600, 5 = 1000 …). */
export function xpForLevel(level: number): number {
  return (100 * level * (level - 1)) / 2;
}

export function levelForXp(xp: number): number {
  return Math.max(1, Math.floor((1 + Math.sqrt(1 + (8 * Math.max(xp, 0)) / 100)) / 2));
}

export function levelProgress(xp: number): {
  level: number;
  current: number;
  needed: number;
  percent: number;
} {
  const level = levelForXp(xp);
  const base = xpForLevel(level);
  const next = xpForLevel(level + 1);
  const current = xp - base;
  const needed = next - base;
  return { level, current, needed, percent: Math.min(100, Math.round((current / needed) * 100)) };
}

/** Calendar date (YYYY-MM-DD) of an instant in the learner's timezone; drives streaks and caps. */
export function activityDateFor(instant: Date, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(instant);
  } catch {
    return instant.toISOString().slice(0, 10);
  }
}

/** Deterministic ledger keys so the same event can never pay twice. */
export const rewardKeys = {
  exerciseCompleted: (exerciseId: string) => `exercise_completed:${exerciseId}`,
  quizPassed: (lessonId: string) => `quiz_passed:${lessonId}`,
  sectionCompleted: (sectionId: string) => `section_completed:${sectionId}`,
  badge: (slug: string) => `badge:${slug}`,
};

/** Streak status for the UI, computed from the stored streak and today's date. */
export function streakStatus(
  streak: { current_length: number; last_activity_date: string | null; freezes_available: number },
  today: string,
): { length: number; activeToday: boolean; atRisk: boolean; protectedByFreeze: boolean } {
  if (!streak.last_activity_date || streak.current_length === 0) {
    return { length: 0, activeToday: false, atRisk: false, protectedByFreeze: false };
  }
  const gapDays = Math.round(
    (Date.parse(today) - Date.parse(streak.last_activity_date)) / 86_400_000,
  );
  if (gapDays <= 0)
    return {
      length: streak.current_length,
      activeToday: true,
      atRisk: false,
      protectedByFreeze: false,
    };
  if (gapDays === 1)
    return {
      length: streak.current_length,
      activeToday: false,
      atRisk: true,
      protectedByFreeze: false,
    };
  if (gapDays === 2 && streak.freezes_available > 0)
    return {
      length: streak.current_length,
      activeToday: false,
      atRisk: true,
      protectedByFreeze: true,
    };
  return { length: 0, activeToday: false, atRisk: false, protectedByFreeze: false };
}
