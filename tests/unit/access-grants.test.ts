import { describe, expect, it } from "vitest";
import {
  ACCESS_GRANT_KINDS,
  accessEndsAt,
  daysUntil,
  MAX_ACCESS_DAYS,
  parseAccessDays,
} from "@/lib/payments/access-grants";
import { lessonNeedsAccess } from "@/lib/progress/lesson-lock";
import {
  generatePromoCode,
  hasAmbiguousCharacters,
  normalizePromoCode,
  PROMO_CODE_ALPHABET,
  PROMO_CODE_PATTERN,
} from "@/lib/payments/promo-code";
import { limits } from "@/config/limits";

describe("access grant kinds", () => {
  it("keeps a courtesy grant and a confirmed payment apart", () => {
    // The whole point of owner feedback item 22: these are two different facts about money.
    expect(ACCESS_GRANT_KINDS).toEqual(["comp", "payment"]);
  });
});

describe("accessEndsAt", () => {
  const from = new Date("2026-09-24T12:00:00.000Z");

  it("derives the end date from the days of access", () => {
    expect(accessEndsAt(30, from)?.toISOString().slice(0, 10)).toBe("2026-10-24");
  });

  it("treats no days as lifetime, not as zero days", () => {
    expect(accessEndsAt(null, from)).toBeNull();
  });

  it("refuses to invent an end date from a nonsense value", () => {
    expect(accessEndsAt(0, from)).toBeNull();
    expect(accessEndsAt(Number.NaN, from)).toBeNull();
  });

  it("round-trips with daysUntil", () => {
    const end = accessEndsAt(90, from);
    expect(end).not.toBeNull();
    expect(daysUntil(end as Date, from)).toBe(90);
  });
});

describe("parseAccessDays", () => {
  it("accepts an empty value as lifetime", () => {
    expect(parseAccessDays("")).toEqual({ ok: true, days: null });
    expect(parseAccessDays(null)).toEqual({ ok: true, days: null });
  });

  it("accepts whole days inside the range", () => {
    expect(parseAccessDays("30")).toEqual({ ok: true, days: 30 });
    expect(parseAccessDays(MAX_ACCESS_DAYS)).toEqual({ ok: true, days: MAX_ACCESS_DAYS });
  });

  it("rejects fractions, zero and anything past the ceiling", () => {
    expect(parseAccessDays("1.5").ok).toBe(false);
    expect(parseAccessDays(0).ok).toBe(false);
    expect(parseAccessDays(MAX_ACCESS_DAYS + 1).ok).toBe(false);
    expect(parseAccessDays("treinta").ok).toBe(false);
  });
});

describe("promo codes", () => {
  it("never uses a character that is confused when read out loud", () => {
    expect(PROMO_CODE_ALPHABET).not.toMatch(/[OIL01]/);
    for (let i = 0; i < 200; i += 1) {
      expect(hasAmbiguousCharacters(generatePromoCode())).toBe(false);
    }
  });

  it("generates a code the database will accept", () => {
    for (let i = 0; i < 50; i += 1) {
      expect(generatePromoCode()).toMatch(PROMO_CODE_PATTERN);
      expect(generatePromoCode("BECA")).toMatch(PROMO_CODE_PATTERN);
    }
  });

  it("uses the configured length and grouping", () => {
    const code = generatePromoCode();
    expect(code.replace(/-/g, "")).toHaveLength(limits.promoCodes.generatedLength);
    expect(code.split("-")[0]).toHaveLength(limits.promoCodes.groupSize);
  });

  it("keeps a human prefix in front", () => {
    expect(generatePromoCode("BECA").startsWith("BECA-")).toBe(true);
  });

  it("is not guessable by repetition", () => {
    const codes = new Set(Array.from({ length: 500 }, () => generatePromoCode()));
    expect(codes.size).toBe(500);
  });

  it("normalizes what an admin types by hand", () => {
    expect(normalizePromoCode("  beca verano ")).toBe("BECA-VERANO");
    expect(normalizePromoCode("beca__verano")).toBe("BECA-VERANO");
    expect(normalizePromoCode("-beca--verano-")).toBe("BECA-VERANO");
  });
});

describe("lessonNeedsAccess", () => {
  it("never padlocks a free lesson", () => {
    expect(lessonNeedsAccess({ isFree: true, mode: "learner", hasAccess: false })).toBe(false);
    expect(lessonNeedsAccess({ isFree: true, mode: "public", hasAccess: false })).toBe(false);
  });

  it("padlocks premium lessons for a signed-out visitor", () => {
    expect(lessonNeedsAccess({ isFree: false, mode: "public", hasAccess: false })).toBe(true);
  });

  it("padlocks premium lessons for a learner without access", () => {
    expect(lessonNeedsAccess({ isFree: false, mode: "learner", hasAccess: false })).toBe(true);
  });

  it("shows no padlock once the learner has access (owner feedback item 24)", () => {
    expect(lessonNeedsAccess({ isFree: false, mode: "learner", hasAccess: true })).toBe(false);
  });
});
