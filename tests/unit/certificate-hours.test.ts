import { describe, expect, it } from "vitest";
import { content } from "@/content";
import {
  computeProgramHours,
  roundProgramHours,
  timedItemsFromContent,
  type HoursContent,
} from "@/lib/certificates/hours";
import { limits } from "@/config/limits";
import { displayedProgramHours, programHoursForSections } from "@/lib/certificates/program-hours";
import { quizLengthForSection } from "@/lib/quizzes/length";

describe("roundProgramHours", () => {
  it("rounds the total to the nearest whole hour, half up", () => {
    expect(roundProgramHours(89)).toBe(1);
    expect(roundProgramHours(90)).toBe(2);
    expect(roundProgramHours(149)).toBe(2);
    expect(roundProgramHours(150)).toBe(3);
  });

  it("never prints zero hours when something was counted, and zero when nothing was", () => {
    expect(roundProgramHours(5)).toBe(1);
    expect(roundProgramHours(0)).toBe(0);
    expect(roundProgramHours(Number.NaN)).toBe(0);
  });
});

describe("computeProgramHours", () => {
  const items = [
    { section: "a", slug: "a-1", minutes: 50 },
    { section: "a", slug: "a-2", minutes: 40 },
    { section: "b", slug: "b-1", minutes: 30.5 },
    { section: "c", slug: "c-1", minutes: 600 },
  ];

  it("sums only the required sections and rounds once, on the total", () => {
    const r = computeProgramHours(["a", "b"], items);
    expect(r.minutes).toBeCloseTo(120.5);
    expect(r.hours).toBe(2);
    expect(r.missingSections).toEqual([]);
    expect(r.missingItems).toEqual([]);
  });

  it("is the same for every call with the same sections (no per-learner input)", () => {
    expect(computeProgramHours(["b", "a"], items)).toEqual(computeProgramHours(["a", "b"], items));
  });

  it("reports a required section absent from the content instead of inventing its time", () => {
    const r = computeProgramHours(["a", "zzz"], items);
    expect(r.minutes).toBe(90);
    expect(r.missingSections).toEqual(["zzz"]);
  });

  it("counts an item without a usable estimate as zero and lists it", () => {
    const r = computeProgramHours(
      ["a"],
      [
        { section: "a", slug: "ok", minutes: 60 },
        { section: "a", slug: "none", minutes: null },
        { section: "a", slug: "neg", minutes: -5 },
        { section: "a", slug: "inf", minutes: Number.POSITIVE_INFINITY },
      ],
    );
    expect(r.minutes).toBe(60);
    expect(r.hours).toBe(1);
    expect(r.missingItems).toEqual(["none", "neg", "inf"]);
  });

  it("returns zero hours for an empty requirement", () => {
    expect(computeProgramHours([], items).hours).toBe(0);
  });
});

describe("timedItemsFromContent", () => {
  const fixture: HoursContent = {
    sections: [
      { slug: "s1", is_published: true },
      { slug: "s2", is_published: false },
    ],
    lessons: [
      { slug: "t1", section: "s1", kind: "theory", is_published: true, estimated_minutes: 10 },
      { slug: "t2", section: "s1", kind: "theory", is_published: false, estimated_minutes: 99 },
      { slug: "t3", section: "s2", kind: "theory", is_published: true, estimated_minutes: 99 },
    ],
    exercises: [
      { slug: "e1", section: "s1", is_published: true, estimated_minutes: 8 },
      { slug: "e2", section: "s1", is_published: false, estimated_minutes: 99 },
    ],
    questions: [
      ...Array.from({ length: 10 }, () => ({
        section: "s1",
        is_published: true,
        estimated_seconds: 60,
      })),
      { section: "s1", is_published: false, estimated_seconds: 600 },
    ],
  };

  it("takes published theory and exercises, and the quiz as served length × mean seconds", () => {
    const items = timedItemsFromContent(fixture, () => 6);
    expect(items).toEqual([
      { section: "s1", slug: "t1", minutes: 10 },
      { section: "s1", slug: "e1", minutes: 8 },
      { section: "s1", slug: "s1-quiz", minutes: 6 },
    ]);
  });

  it("marks the quiz as missing when any published question has no estimate", () => {
    const items = timedItemsFromContent(
      {
        ...fixture,
        questions: [
          { section: "s1", is_published: true, estimated_seconds: 60 },
          { section: "s1", is_published: true, estimated_seconds: null },
        ],
      },
      () => 2,
    );
    expect(items.find((i) => i.slug === "s1-quiz")?.minutes).toBeNull();
  });
});

describe("program hours over the real content", () => {
  it("has an estimate for every item of every published section", () => {
    const items = timedItemsFromContent(content, quizLengthForSection);
    const published = content.sections.filter((s) => s.is_published).map((s) => s.slug);
    const r = computeProgramHours(published, items);
    expect(r.missingItems).toEqual([]);
    expect(r.missingSections).toEqual([]);
    expect(r.hours).toBeGreaterThan(0);
  });

  it("gives a positive whole number of hours for each level's sections", () => {
    const levels = new Map<string, string[]>();
    for (const s of content.sections)
      if (s.is_published) levels.set(s.level, [...(levels.get(s.level) ?? []), s.slug]);
    for (const slugs of levels.values()) {
      const { hours } = programHoursForSections(slugs);
      expect(Number.isInteger(hours)).toBe(true);
      expect(hours).toBeGreaterThan(0);
    }
  });
});

describe("displayedProgramHours (which certificates print the hours)", () => {
  const published = content.sections.filter((s) => s.is_published).map((s) => s.slug);

  it("shows them only on the final certificate by default (owner, 2026-09-25)", () => {
    expect(limits.certificates.programHoursShownFor).toEqual(["analista-sql-profesional"]);
    expect(displayedProgramHours("analista-sql-profesional", published)).toBe(
      programHoursForSections(published).hours,
    );
    for (const slug of ["fundamentos-sql", "sql-analisis-negocio", "sql-analitico-avanzado"])
      expect(displayedProgramHours(slug, published)).toBe(0);
  });

  it("follows the configured list, not a hardcoded slug", () => {
    expect(
      displayedProgramHours("fundamentos-sql", published, ["fundamentos-sql"]),
    ).toBeGreaterThan(0);
    expect(displayedProgramHours("analista-sql-profesional", published, [])).toBe(0);
  });
});
