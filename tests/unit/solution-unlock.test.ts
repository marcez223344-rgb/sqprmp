import { describe, expect, it } from "vitest";
import { limits } from "@/config/limits";
import { isSolutionUnlockable, solutionUnlockableNow } from "@/lib/exercises/unlock";

const fresh = {
  genuine_attempts_count: 1,
  hints_used: 0,
  started_at: new Date().toISOString(),
  status: "in_progress",
};

describe("solution unlock rule", () => {
  it("stays locked right after the first attempt", () => {
    expect(isSolutionUnlockable(fresh)).toBe(false);
  });

  it("unlocks with the configured number of hints", () => {
    expect(
      isSolutionUnlockable({ ...fresh, hints_used: limits.solutionUnlock.minHintsRequested }),
    ).toBe(true);
  });

  it("unlocks with the configured number of genuine attempts", () => {
    expect(
      isSolutionUnlockable({
        ...fresh,
        genuine_attempts_count: limits.solutionUnlock.minGenuineAttempts,
      }),
    ).toBe(true);
  });

  // Regression: the workspace kept offering the penalised "quiero verla igual" path after the
  // learner had taken the two hints, because it only looked at the snapshot from the last
  // submission (hints_used = 0 at that point). CI: 05-exercise.spec.ts, "Ver la solución explicada".
  it("counts hints taken after the last submission", () => {
    expect(
      solutionUnlockableNow({
        progress: fresh,
        lastSubmissionUnlockable: false,
        hintsTaken: limits.solutionUnlock.minHintsRequested,
      }),
    ).toBe(true);
  });

  it("trusts the server answer while the hint threshold is not reached", () => {
    expect(
      solutionUnlockableNow({ progress: fresh, lastSubmissionUnlockable: false, hintsTaken: 1 }),
    ).toBe(false);
    expect(
      solutionUnlockableNow({ progress: fresh, lastSubmissionUnlockable: true, hintsTaken: 0 }),
    ).toBe(true);
  });

  it("falls back to the page snapshot before the first submission", () => {
    expect(
      solutionUnlockableNow({
        progress: { ...fresh, status: "completed" },
        lastSubmissionUnlockable: null,
        hintsTaken: 0,
      }),
    ).toBe(true);
    expect(
      solutionUnlockableNow({ progress: null, lastSubmissionUnlockable: null, hintsTaken: 0 }),
    ).toBe(false);
  });
});
