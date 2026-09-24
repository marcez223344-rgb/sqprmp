import { describe, expect, it } from "vitest";
import { countries, OTHER_COUNTRY_CODE } from "@/config/countries";
import { hasStartedLearning } from "@/lib/progress/start-state";
import { onboardingSchema } from "@/lib/profile/schemas";
import { submitProgress, SUBMIT_STAGES } from "@/components/workspace/submit-status";

describe("country list", () => {
  it("is alphabetical so any country is where the learner expects it", () => {
    const names = countries.filter((c) => c.code !== OTHER_COUNTRY_CODE).map((c) => c.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, "es")));
  });

  it("keeps the catch-all option last and España in the list", () => {
    expect(countries.at(-1)?.code).toBe(OTHER_COUNTRY_CODE);
    expect(countries.map((c) => c.code)).toContain("ES");
    // España sorts before Estados Unidos, where a learner looking for it will stop reading.
    const codes = countries.map((c) => c.code);
    expect(codes.indexOf("ES")).toBeLessThan(codes.indexOf("US"));
  });
});

describe("leaderboard opt-in during onboarding", () => {
  const base = {
    display_name: "Ada",
    alias: "ada_sql",
    avatar_id: "3f1a3a3e-6f1f-4a4b-9b64-3f6b9b0a1c2d",
    country: "AR",
    birth_date: "1990-01-01",
    sql_level: "beginner",
    main_goal: "improve",
    weekly_goal_minutes: 120,
    accept_terms: true,
    accept_privacy: true,
  };

  it("defaults to off when the learner does not tick it", () => {
    const parsed = onboardingSchema.parse(base);
    expect(parsed.leaderboard_opt_in).toBe(false);
  });

  it("is honoured when the learner ticks it", () => {
    const parsed = onboardingSchema.parse({ ...base, leaderboard_opt_in: true });
    expect(parsed.leaderboard_opt_in).toBe(true);
  });
});

describe("hasStartedLearning", () => {
  it("is false only for an account that has touched nothing", () => {
    expect(
      hasStartedLearning({
        exerciseProgressCount: 0,
        lessonProgressCount: 0,
        exercisesCompleted: 0,
      }),
    ).toBe(false);
  });

  it("counts an exercise opened but not solved, and a lesson opened", () => {
    expect(
      hasStartedLearning({
        exerciseProgressCount: 1,
        lessonProgressCount: 0,
        exercisesCompleted: 0,
      }),
    ).toBe(true);
    expect(
      hasStartedLearning({
        exerciseProgressCount: 0,
        lessonProgressCount: 1,
        exercisesCompleted: 0,
      }),
    ).toBe(true);
  });
});

describe("submitProgress", () => {
  it("advances one observable step at a time and never invents progress", () => {
    expect(submitProgress("idle")).toEqual({ completed: 0, current: 0, total: 2 });
    expect(submitProgress("validating")).toEqual({ completed: 0, current: 1, total: 2 });
    expect(submitProgress("executing")).toEqual({ completed: 1, current: 2, total: 2 });
    expect(SUBMIT_STAGES).toHaveLength(2);
  });
});
