import { describe, expect, it } from "vitest";
import { sectionMinutes, summarizePath } from "@/lib/curriculum/path-summary";

type Lesson = Parameters<typeof sectionMinutes>[0]["lessons"][number];

const lesson = (slug: string, over: Partial<Lesson> = {}): Lesson => ({
  slug,
  kind: "theory",
  title: slug,
  estimated_minutes: 10,
  is_free: true,
  is_published: true,
  status: "not_started",
  ...over,
});

const section = (
  number: number,
  lessons: Lesson[],
  over: { is_published?: boolean; certificate_slug?: string | null } = {},
) => ({
  slug: `s${number}`,
  number,
  title: `Sección ${number}`,
  is_published: over.is_published ?? true,
  certificate_slug: over.certificate_slug ?? null,
  lessons,
});

describe("summarizePath", () => {
  it("counts only published sections and lessons", () => {
    const s = summarizePath(
      [
        section(1, [
          lesson("a", { status: "completed" }),
          lesson("b", { kind: "exercise" }),
          lesson("hidden", { is_published: false }),
        ]),
        section(2, [lesson("c"), lesson("d")], { is_published: false }),
      ],
      false,
    );
    expect(s.sectionsTotal).toBe(2);
    expect(s.sectionsPublished).toBe(1);
    expect(s.lessons).toBe(2);
    expect(s.exercises).toBe(1);
    expect(s.completedLessons).toBe(1);
    expect(s.percent).toBe(50);
    expect(s.minutes).toBe(20);
  });

  it("points «Continuar» at the first unfinished lesson of the first unfinished section", () => {
    const s = summarizePath(
      [
        section(1, [lesson("a", { status: "completed" })]),
        section(2, [lesson("b", { status: "completed" }), lesson("c"), lesson("d")]),
      ],
      false,
    );
    expect(s.next).toMatchObject({ sectionNumber: 2, lessonSlug: "c" });
  });

  it("prefers a lesson the learner can open over a premium one", () => {
    const sections = [section(1, [lesson("premium", { is_free: false }), lesson("free")])];
    expect(summarizePath(sections, false).next?.lessonSlug).toBe("free");
    expect(summarizePath(sections, true).next?.lessonSlug).toBe("premium");
  });

  it("falls back to the paywall when every pending lesson is premium", () => {
    const s = summarizePath([section(1, [lesson("p1", { is_free: false })])], false);
    expect(s.next?.lessonSlug).toBe("p1");
  });

  it("has no next step once every published lesson is completed", () => {
    const s = summarizePath([section(1, [lesson("a", { status: "completed" })])], false);
    expect(s.next).toBeNull();
    expect(s.nextCertificate).toBeNull();
    expect(s.percent).toBe(100);
  });

  it("names the next certificate from the current section onwards", () => {
    const s = summarizePath(
      [
        section(1, [lesson("a", { status: "completed" })], { certificate_slug: "n1" }),
        section(2, [lesson("b")]),
        section(3, [lesson("c")], { certificate_slug: "n2" }),
      ],
      false,
    );
    expect(s.nextCertificate).toEqual({ sectionNumber: 3, sectionTitle: "Sección 3" });
    expect(s.certificates).toBe(2);
  });

  it("does not divide by zero on an empty path", () => {
    expect(summarizePath([], false).percent).toBe(0);
  });
});

describe("sectionMinutes", () => {
  it("adds up published lessons only", () => {
    expect(
      sectionMinutes({
        lessons: [
          lesson("a", { estimated_minutes: 12 }),
          lesson("b", { estimated_minutes: 8, is_published: false }),
        ],
      }),
    ).toBe(12);
  });
});
