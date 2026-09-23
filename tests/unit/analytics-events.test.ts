import { describe, expect, it } from "vitest";
import { analyticsEvents, parseAnalyticsEvent } from "@/lib/analytics/events";

describe("analytics event spec", () => {
  it("covers every event listed in docs/ANALYTICS.md", () => {
    expect(Object.keys(analyticsEvents).sort()).toEqual(
      [
        "badge_earned",
        "certificate_issued",
        "checkout_started",
        "exercise_completed",
        "exercise_started",
        "exercise_submitted",
        "hint_requested",
        "lesson_viewed",
        "onboarding_completed",
        "onboarding_step_completed",
        "page_viewed",
        "paywall_viewed",
        "promo_redeemed",
        "purchase_completed",
        "query_run",
        "quiz_question_answered",
        "quiz_submitted",
        "review_session_started",
        "section_completed",
        "signup_completed",
        "signup_started",
        "solution_revealed",
        "streak_frozen",
      ].sort(),
    );
  });

  it("accepts valid properties and rejects unknown keys (no PII leaks by accident)", () => {
    expect(
      parseAnalyticsEvent("quiz_submitted", {
        lesson_slug: "select-quiz",
        score: 8,
        total: 10,
        passed: true,
      }),
    ).toEqual({ lesson_slug: "select-quiz", score: 8, total: 10, passed: true });
    expect(
      parseAnalyticsEvent("quiz_submitted", {
        lesson_slug: "select-quiz",
        score: 8,
        total: 10,
        passed: true,
        email: "x@y.z",
      }),
    ).toBeNull();
  });

  it("rejects malformed values", () => {
    expect(
      parseAnalyticsEvent("hint_requested", { exercise_slug: "Bad Slug", level: 1 }),
    ).toBeNull();
    expect(
      parseAnalyticsEvent("hint_requested", { exercise_slug: "ok-slug", level: 4 }),
    ).toBeNull();
    expect(parseAnalyticsEvent("paywall_viewed", { trigger: "other" })).toBeNull();
    expect(parseAnalyticsEvent("query_run", { engine: "server", status: "ok" })).toBeNull();
  });

  it("returns null for unknown event names", () => {
    expect(parseAnalyticsEvent("nope" as never, {})).toBeNull();
  });
});
