import { describe, expect, it } from "vitest";
import {
  activityDateFor,
  computeExerciseReward,
  levelForXp,
  levelProgress,
  rewardKeys,
  streakStatus,
  xpForLevel,
} from "@/lib/rewards/rules";

const config = { xp: 40, coins: 8, solution_reveal_xp_percent: 25 };

describe("computeExerciseReward", () => {
  it("pays full reward without hints", () => {
    expect(computeExerciseReward({ config, hintsUsed: 0, solutionRevealed: false })).toEqual({
      xp: 40,
      coins: 8,
      penaltyPercent: 0,
    });
  });
  it("applies 10% per hint capped at 30%", () => {
    expect(computeExerciseReward({ config, hintsUsed: 1, solutionRevealed: false }).xp).toBe(36);
    expect(computeExerciseReward({ config, hintsUsed: 3, solutionRevealed: false }).xp).toBe(28);
    expect(
      computeExerciseReward({ config, hintsUsed: 9, solutionRevealed: false }).penaltyPercent,
    ).toBe(30);
  });
  it("keeps 25% XP and no coins after a solution reveal", () => {
    expect(computeExerciseReward({ config, hintsUsed: 2, solutionRevealed: true })).toEqual({
      xp: 10,
      coins: 0,
      penaltyPercent: 75,
    });
  });
});

describe("level curve", () => {
  it("matches the SQL function (100·n·(n−1)/2)", () => {
    expect(xpForLevel(1)).toBe(0);
    expect(xpForLevel(2)).toBe(100);
    expect(xpForLevel(4)).toBe(600);
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(99)).toBe(1);
    expect(levelForXp(100)).toBe(2);
    expect(levelForXp(600)).toBe(4);
    expect(levelForXp(999)).toBe(4);
    expect(levelForXp(1000)).toBe(5);
  });
  it("reports progress within the level", () => {
    expect(levelProgress(150)).toEqual({ level: 2, current: 50, needed: 200, percent: 25 });
  });
});

describe("activityDateFor", () => {
  it("uses the learner timezone, not UTC", () => {
    const instant = new Date("2026-03-02T01:30:00Z");
    expect(activityDateFor(instant, "America/Argentina/Buenos_Aires")).toBe("2026-03-01");
    expect(activityDateFor(instant, "UTC")).toBe("2026-03-02");
    expect(activityDateFor(instant, "Not/AZone")).toBe("2026-03-02");
  });
});

describe("streakStatus", () => {
  const base = { current_length: 4, last_activity_date: "2026-03-10", freezes_available: 1 };
  it("is active today, at risk after one day, protected by a freeze on day two, lost after", () => {
    expect(streakStatus(base, "2026-03-10")).toMatchObject({ length: 4, activeToday: true });
    expect(streakStatus(base, "2026-03-11")).toMatchObject({
      length: 4,
      atRisk: true,
      protectedByFreeze: false,
    });
    expect(streakStatus(base, "2026-03-12")).toMatchObject({ length: 4, protectedByFreeze: true });
    expect(streakStatus({ ...base, freezes_available: 0 }, "2026-03-12")).toMatchObject({
      length: 0,
    });
    expect(streakStatus(base, "2026-03-20")).toMatchObject({ length: 0 });
  });
});

describe("rewardKeys", () => {
  it("are stable per subject", () => {
    expect(rewardKeys.exerciseCompleted("abc")).toBe("exercise_completed:abc");
    expect(rewardKeys.badge("racha-7")).toBe("badge:racha-7");
  });
});
