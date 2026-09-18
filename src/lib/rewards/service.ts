import "server-only";
import { limits } from "@/config/limits";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json, Profile } from "@/types/database";
import {
  activityDateFor,
  computeExerciseReward,
  rewardKeys,
  type ExerciseRewardConfig,
} from "./rules";

export interface AwardOutcome {
  awarded: boolean;
  xp: number;
  coins: number;
  xpTotal: number;
  level: number;
  streakLength: number;
  newBadges: string[];
}

/**
 * Awards the completion reward exactly once (ledger key = exercise id), then evaluates badges.
 * Amounts come from the exercise's reward_config and the learner's hint/reveal usage.
 */
export async function awardExerciseCompletion(
  profile: Profile,
  exerciseId: string,
  rewardConfig: ExerciseRewardConfig,
  hintsUsed: number,
  solutionRevealed: boolean,
): Promise<AwardOutcome> {
  const admin = createAdminClient();
  const amount = computeExerciseReward({ config: rewardConfig, hintsUsed, solutionRevealed });
  const activityDate = activityDateFor(new Date(), profile.timezone);
  const { data } = await admin.rpc("award_reward", {
    p_user_id: profile.id,
    p_event_key: rewardKeys.exerciseCompleted(exerciseId),
    p_source: "exercise",
    p_xp: amount.xp,
    p_coins: amount.coins,
    p_metadata: {
      exercise_id: exerciseId,
      hints_used: hintsUsed,
      solution_revealed: solutionRevealed,
      penalty_percent: amount.penaltyPercent,
    } as Json,
    p_activity_date: activityDate,
    p_daily_xp_cap: limits.rewards.dailyXpCap,
  });
  const row = data?.[0];
  const { data: badges } = await admin.rpc("evaluate_badges", { p_user_id: profile.id });
  return {
    awarded: Boolean(row?.awarded),
    xp: row?.xp_awarded ?? 0,
    coins: row?.coins_awarded ?? 0,
    xpTotal: row?.xp_total ?? 0,
    level: row?.level ?? 1,
    streakLength: row?.streak_length ?? 0,
    newBadges: (badges as unknown as string[] | null) ?? [],
  };
}

/** Counts active minutes (bounded heuristic) for goals; safe to call on any learner action. */
export async function touchActivity(profile: Profile): Promise<void> {
  const admin = createAdminClient();
  await admin.rpc("touch_daily_activity", {
    p_user_id: profile.id,
    p_activity_date: activityDateFor(new Date(), profile.timezone),
    p_max_gap_minutes: 5,
  });
}
