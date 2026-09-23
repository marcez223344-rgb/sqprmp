import { limits } from "@/config/limits";

/**
 * Pure rules for the opt-in ranking (D-35): which window is being shown, whether the board has
 * enough participants to mean anything, and how the caller's own row is positioned.
 */
export const LEADERBOARD_PERIODS = ["week", "all"] as const;
export type LeaderboardPeriod = (typeof LEADERBOARD_PERIODS)[number];

/** Spanish query values, so the URL reads as the UI does (`/ranking?periodo=semana`). */
const PERIOD_BY_PARAM: Record<string, LeaderboardPeriod> = { semana: "week", historico: "all" };
const PARAM_BY_PERIOD: Record<LeaderboardPeriod, string> = { week: "semana", all: "historico" };

/**
 * Unknown or missing values fall back to the weekly board; never trust the query string. The
 * default is deliberate: a lifetime board is decided by whoever started first, a 7-day board is
 * winnable this week by everyone.
 */
export function parsePeriod(raw: unknown): LeaderboardPeriod {
  return (typeof raw === "string" && PERIOD_BY_PARAM[raw]) || "week";
}

export function periodParam(period: LeaderboardPeriod): string {
  return PARAM_BY_PERIOD[period];
}

/** A board with almost nobody in it is not a ranking; the page says so instead. */
export function hasEnoughParticipants(participants: number): boolean {
  return participants >= limits.leaderboard.minParticipants;
}

export interface LeaderboardEntry {
  rank: number;
  alias: string;
  avatarPath: string | null;
  level: number;
  xp: number;
  isSelf: boolean;
}

/**
 * Splits the RPC rows into the visible top and the caller's own detached row, which the RPC returns
 * even when it falls outside the top.
 */
export function splitEntries(
  entries: LeaderboardEntry[],
  topN: number,
): { top: LeaderboardEntry[]; self: LeaderboardEntry | null } {
  const top = entries.filter((e) => e.rank <= topN);
  const inTop = top.some((e) => e.isSelf);
  const self = inTop ? null : (entries.find((e) => e.isSelf) ?? null);
  return { top, self };
}
