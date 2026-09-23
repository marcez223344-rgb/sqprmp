import { describe, expect, it } from "vitest";
import { limits } from "@/config/limits";
import {
  lessonStatusForExercise,
  mergeLessonStatus,
  type LessonStatus,
} from "@/lib/progress/lesson-status";
import {
  hasEnoughParticipants,
  LEADERBOARD_PERIODS,
  parsePeriod,
  periodParam,
  splitEntries,
  type LeaderboardEntry,
} from "@/lib/progress/leaderboard-rules";

describe("lessonStatusForExercise", () => {
  it("maps an exercise progress row to the lesson status shown on the path", () => {
    expect(lessonStatusForExercise("completed")).toBe("completed");
    expect(lessonStatusForExercise("in_progress")).toBe("in_progress");
  });
  it("treats a missing row as never started", () => {
    expect(lessonStatusForExercise(null)).toBe("not_started");
    expect(lessonStatusForExercise(undefined)).toBe("not_started");
  });
  it("does not invent progress from an unknown status", () => {
    expect(lessonStatusForExercise("archived")).toBe("not_started");
  });
});

describe("mergeLessonStatus", () => {
  const statuses: LessonStatus[] = ["not_started", "in_progress", "completed"];

  it("never downgrades a completed lesson", () => {
    for (const s of statuses) {
      expect(mergeLessonStatus("completed", s)).toBe("completed");
      expect(mergeLessonStatus(s, "completed")).toBe("completed");
    }
  });
  it("prefers in_progress over not_started", () => {
    expect(mergeLessonStatus("not_started", "in_progress")).toBe("in_progress");
    expect(mergeLessonStatus("in_progress", "not_started")).toBe("in_progress");
  });
  it("is idempotent and order-independent", () => {
    for (const a of statuses)
      for (const b of statuses) {
        expect(mergeLessonStatus(a, b)).toBe(mergeLessonStatus(b, a));
        expect(mergeLessonStatus(a, a)).toBe(a);
      }
  });
  it("reproduces the bug's fix: a solved exercise completes its lesson even with no lesson row", () => {
    expect(mergeLessonStatus("not_started", lessonStatusForExercise("completed"))).toBe(
      "completed",
    );
  });
});

describe("leaderboard periods", () => {
  it("defaults to the weekly board for anything unexpected", () => {
    expect(parsePeriod(undefined)).toBe("week");
    expect(parsePeriod("")).toBe("week");
    expect(parsePeriod("otro")).toBe("week");
    expect(parsePeriod(["semana"])).toBe("week");
    expect(parsePeriod(7)).toBe("week");
  });
  it("accepts the two documented values", () => {
    expect(parsePeriod("semana")).toBe("week");
    expect(parsePeriod("historico")).toBe("all");
  });
  it("round-trips every period through its URL value", () => {
    for (const p of LEADERBOARD_PERIODS) expect(parsePeriod(periodParam(p))).toBe(p);
  });
});

describe("hasEnoughParticipants", () => {
  it("refuses to call two rows a ranking", () => {
    expect(hasEnoughParticipants(0)).toBe(false);
    expect(hasEnoughParticipants(2)).toBe(false);
    expect(hasEnoughParticipants(limits.leaderboard.minParticipants - 1)).toBe(false);
  });
  it("accepts the configured minimum", () => {
    expect(hasEnoughParticipants(limits.leaderboard.minParticipants)).toBe(true);
    expect(hasEnoughParticipants(limits.leaderboard.minParticipants + 50)).toBe(true);
  });
});

describe("splitEntries", () => {
  const entry = (rank: number, alias: string, isSelf = false): LeaderboardEntry => ({
    rank,
    alias,
    avatarPath: null,
    level: 1,
    xp: 100 - rank,
    isSelf,
  });

  it("keeps the caller inside the top without repeating the row", () => {
    const { top, self } = splitEntries([entry(1, "ada", true), entry(2, "bruno")], 3);
    expect(top).toHaveLength(2);
    expect(self).toBeNull();
  });
  it("detaches the caller's row when it is outside the top", () => {
    const { top, self } = splitEntries(
      [entry(1, "ada"), entry(2, "bruno"), entry(41, "cora", true)],
      2,
    );
    expect(top.map((e) => e.alias)).toEqual(["ada", "bruno"]);
    expect(self?.alias).toBe("cora");
  });
  it("returns no self row for a learner who is not on the board", () => {
    const { top, self } = splitEntries([entry(1, "ada"), entry(2, "bruno")], 25);
    expect(top).toHaveLength(2);
    expect(self).toBeNull();
  });
  it("handles an empty board", () => {
    expect(splitEntries([], 25)).toEqual({ top: [], self: null });
  });
});
