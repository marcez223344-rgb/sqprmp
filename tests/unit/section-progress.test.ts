import { describe, expect, it } from "vitest";
import { sectionProgress, type ProgressLesson } from "@/lib/learning/section-progress";

const item = (kind: string, over: Partial<ProgressLesson> = {}): ProgressLesson => ({
  kind,
  is_published: true,
  status: "not_started",
  ...over,
});
const done = { status: "completed" };

describe("sectionProgress", () => {
  it("counts each lesson, exercise and quiz as one item", () => {
    const p = sectionProgress([
      item("theory", done),
      item("theory", done),
      item("theory", done),
      item("theory"),
      item("exercise", done),
      item("challenge", done),
      item("exercise"),
      item("exercise"),
      item("exercise"),
      item("quiz", done),
    ]);
    expect(p.theory).toEqual({ done: 3, total: 4 });
    expect(p.exercises).toEqual({ done: 2, total: 5 });
    expect(p.quizzes).toEqual({ done: 1, total: 1 });
    expect(p).toMatchObject({ done: 6, total: 10, percent: 60 });
  });

  it("does not count in-progress items or a quiz that was not passed", () => {
    const p = sectionProgress([
      item("theory", { status: "in_progress" }),
      item("exercise", { status: "in_progress" }),
      item("quiz", { status: "in_progress" }),
    ]);
    expect(p).toMatchObject({ done: 0, total: 3, percent: 0 });
  });

  it("leaves unpublished items out of both sides", () => {
    const p = sectionProgress([item("theory", done), item("exercise", { is_published: false })]);
    expect(p).toMatchObject({ done: 1, total: 1, percent: 100 });
    expect(p.exercises).toEqual({ done: 0, total: 0 });
  });

  it("is zero, not a division by zero, for a section with nothing published", () => {
    expect(sectionProgress([])).toMatchObject({ done: 0, total: 0, percent: 0 });
  });

  it("rounds like /ruta but never shows 100 % with an item still open", () => {
    expect(
      sectionProgress([item("theory", done), item("theory", done), item("quiz")]).percent,
    ).toBe(67);
    const many = [...Array.from({ length: 199 }, () => item("exercise", done)), item("quiz")];
    expect(sectionProgress(many).percent).toBe(99);
  });

  it("keeps an unknown kind in the count, with the reading material", () => {
    const p = sectionProgress([item("case_study", done), item("quiz")]);
    expect(p.theory).toEqual({ done: 1, total: 1 });
    expect(p.total).toBe(2);
  });
});
