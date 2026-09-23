import { describe, expect, it } from "vitest";
import {
  requirementPercent,
  summarizeSectionProgress,
  type SummarizableLesson,
} from "@/lib/certificates/progress";

const lesson = (
  kind: string,
  status: SummarizableLesson["status"],
  is_published = true,
): SummarizableLesson => ({ kind, status, is_published });

describe("summarizeSectionProgress", () => {
  it("counts theory, exercises and the quiz separately", () => {
    const s = summarizeSectionProgress([
      lesson("theory", "completed"),
      lesson("theory", "not_started"),
      lesson("exercise", "completed"),
      lesson("exercise", "in_progress"),
      lesson("challenge", "completed"),
      lesson("quiz", "not_started"),
    ]);
    expect(s).toMatchObject({
      lessonsDone: 1,
      lessonsTotal: 2,
      exercisesDone: 2,
      exercisesTotal: 3,
      quizzesDone: 0,
      quizzesTotal: 1,
      unitsDone: 3,
      unitsTotal: 6,
    });
  });

  it("ignores unpublished lessons, which no learner can complete", () => {
    const s = summarizeSectionProgress([
      lesson("exercise", "completed"),
      lesson("exercise", "not_started", false),
    ]);
    expect(s.exercisesTotal).toBe(1);
    expect(s.unitsTotal).toBe(1);
  });

  it("returns an empty summary for a section with no published content", () => {
    expect(summarizeSectionProgress([]).unitsTotal).toBe(0);
  });
});

describe("requirementPercent", () => {
  /** The point of the change: one finished exercise must move the number off zero. */
  it("moves as soon as a single unit is completed", () => {
    const before = requirementPercent([
      summarizeSectionProgress([...Array(10)].map(() => lesson("exercise", "not_started"))),
    ]);
    const after = requirementPercent([
      summarizeSectionProgress([
        lesson("exercise", "completed"),
        ...[...Array(9)].map(() => lesson("exercise", "not_started")),
      ]),
    ]);
    expect(before).toBe(0);
    expect(after).toBe(10);
  });

  it("adds up across the sections of the requirement", () => {
    const a = summarizeSectionProgress([
      lesson("theory", "completed"),
      lesson("quiz", "completed"),
    ]);
    const b = summarizeSectionProgress([
      lesson("exercise", "completed"),
      lesson("exercise", "not_started"),
    ]);
    expect(requirementPercent([a, b])).toBe(75);
  });

  it("never rounds up to 100 while something is pending", () => {
    const lessons = [...Array(200)].map((_, i) =>
      lesson("exercise", i === 0 ? "not_started" : "completed"),
    );
    expect(requirementPercent([summarizeSectionProgress(lessons)])).toBe(99);
  });

  it("is zero when the requirement has no published content yet", () => {
    expect(requirementPercent([])).toBe(0);
  });
});
