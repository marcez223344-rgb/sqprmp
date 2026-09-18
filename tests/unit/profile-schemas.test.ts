import { describe, expect, it } from "vitest";
import {
  aliasSchema,
  onboardingSchema,
  profileToFormInput,
  profileUpdateSchema,
} from "@/lib/profile/schemas";

const validOnboarding = {
  display_name: "Ana",
  alias: "Ana_Datos",
  avatar_id: "6a4d5b3c-1234-4abc-9def-0123456789ab",
  country: "AR",
  birth_date: "1995-04-12",
  gender: "",
  sql_level: "beginner",
  main_goal: "first_job",
  weekly_goal_minutes: "120",
  accept_terms: true,
  accept_privacy: true,
};

describe("aliasSchema", () => {
  it("normalizes to lowercase and enforces the pattern", () => {
    expect(aliasSchema.parse("  Ana_01 ")).toBe("ana_01");
    expect(aliasSchema.safeParse("an").success).toBe(false);
    expect(aliasSchema.safeParse("ana-datos").success).toBe(false);
    expect(aliasSchema.safeParse("a".repeat(21)).success).toBe(false);
  });
});

describe("onboardingSchema", () => {
  it("accepts a complete payload and coerces types", () => {
    const parsed = onboardingSchema.parse(validOnboarding);
    expect(parsed.alias).toBe("ana_datos");
    expect(parsed.weekly_goal_minutes).toBe(120);
    expect(parsed.birth_date).toBe("1995-04-12");
  });
  it("rejects minors with a stable error key", () => {
    const thisYear = new Date().getFullYear();
    const result = onboardingSchema.safeParse({
      ...validOnboarding,
      birth_date: `${thisYear - 17}-01-01`,
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("min_age");
  });
  it("requires both consents", () => {
    const result = onboardingSchema.safeParse({ ...validOnboarding, accept_privacy: false });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["accept_privacy"]);
  });
  it("rejects invalid dates and unknown countries", () => {
    expect(onboardingSchema.safeParse({ ...validOnboarding, birth_date: "nope" }).success).toBe(
      false,
    );
    expect(onboardingSchema.safeParse({ ...validOnboarding, country: "ZZ" }).success).toBe(false);
  });
});

describe("profileUpdateSchema / profileToFormInput", () => {
  it("falls back safely for unexpected stored values", () => {
    const input = profileToFormInput({
      display_name: null,
      certificate_name: null,
      avatar_id: null,
      country: "??",
      gender: "unknown",
      sql_level: null,
      main_goal: "legacy",
      weekly_goal_minutes: null,
      timezone: "America/Lima",
      leaderboard_opt_in: false,
    });
    expect(input.country).toBe("XX");
    expect(input.gender).toBe("");
    expect(input.sql_level).toBe("beginner");
    expect(input.main_goal).toBe("improve");
    expect(input.weekly_goal_minutes).toBe(120);
  });
  it("validates a round-tripped profile", () => {
    const input = profileToFormInput({
      display_name: "Ana",
      certificate_name: "Ana Pérez",
      avatar_id: "6a4d5b3c-1234-4abc-9def-0123456789ab",
      country: "MX",
      gender: "female",
      sql_level: "advanced",
      main_goal: "interviews",
      weekly_goal_minutes: 180,
      timezone: "America/Mexico_City",
      leaderboard_opt_in: true,
    });
    expect(profileUpdateSchema.safeParse(input).success).toBe(true);
  });
});
