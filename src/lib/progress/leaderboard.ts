import "server-only";
import { cache } from "react";
import { features } from "@/config/features";
import { limits } from "@/config/limits";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Profile } from "@/types/database";
import {
  hasEnoughParticipants,
  splitEntries,
  type LeaderboardEntry,
  type LeaderboardPeriod,
} from "./leaderboard-rules";

/**
 * Opt-in XP ranking (D-35).
 *
 * Privacy: `profiles.leaderboard_opt_in` (dated by `leaderboard_opt_in_at`) is the consent record.
 * The filter lives inside the `leaderboard` RPC, not here and not in a widened RLS policy, so there
 * is no query shape — from the browser or from this module — that returns a learner who did not opt
 * in. The RPC exposes alias, avatar, level and XP; display name, email, country and gender never
 * leave the server. What is disclosed, and to whom, is written down in docs/SECURITY.md §7.2.
 *
 * Execute on both RPCs is revoked from `authenticated` (security review 2026-09-23, F-3): a signed-in
 * learner could otherwise read the board straight through PostgREST while the feature was off. They
 * are called here with the admin client, which has no JWT, so the caller is passed explicitly — it
 * drives the "is this me" flag and the timezone of the weekly window. The functions also check the
 * flag themselves and return nothing while it is off, so forgetting `isLeaderboardEnabled()` leaks
 * nothing.
 */
export {
  LEADERBOARD_PERIODS,
  parsePeriod,
  periodParam,
  hasEnoughParticipants,
  splitEntries,
  type LeaderboardEntry,
  type LeaderboardPeriod,
} from "./leaderboard-rules";

export interface LeaderboardView {
  period: LeaderboardPeriod;
  /** The visible top, in rank order. */
  top: LeaderboardEntry[];
  /**
   * The learner's own row when it is not already inside `top`, so the page can pin it at the bottom
   * instead of asking them to scroll a board they are not on.
   */
  self: LeaderboardEntry | null;
  participants: number;
  enough: boolean;
  /** False when the learner has not opted in: they are absent from the board by design. */
  participating: boolean;
}

/**
 * DB flag rows override `src/config/features.ts`; read with the admin client because a flag row may
 * not be public. The database is the authoritative switch: `leaderboards_enabled()` in SQL knows
 * only the row, so turning the feature on means writing the row (what the admin flags page does).
 * Flipping the static default to `true` without a row would render the page over an empty board.
 */
export const isLeaderboardEnabled = cache(async (): Promise<boolean> => {
  const { data } = await createAdminClient()
    .from("feature_flags")
    .select("enabled")
    .eq("key", "leaderboards")
    .maybeSingle();
  return data?.enabled ?? features.leaderboards;
});

export async function getLeaderboard(
  profile: Profile,
  period: LeaderboardPeriod,
): Promise<LeaderboardView> {
  const admin = createAdminClient();
  const [{ data: rows }, { data: participants }] = await Promise.all([
    admin.rpc("leaderboard", {
      p_user_id: profile.id,
      p_period: period,
      p_limit: limits.leaderboard.topN,
    }),
    admin.rpc("leaderboard_participants", { p_user_id: profile.id, p_period: period }),
  ]);
  const entries: LeaderboardEntry[] = (rows ?? []).map((r) => ({
    rank: r.rank_position,
    alias: r.alias,
    avatarPath: r.avatar_path,
    level: r.level,
    xp: r.xp,
    isSelf: r.is_self,
  }));
  const { top, self } = splitEntries(entries, limits.leaderboard.topN);
  const count = typeof participants === "number" ? participants : entries.length;
  return {
    period,
    top,
    self,
    participants: count,
    enough: hasEnoughParticipants(count),
    participating: profile.leaderboard_opt_in,
  };
}
