import { describe, expect, it } from "vitest";
import { courseLevels } from "@/config/course-levels";
import { loadContent } from "@/content/load";
import { groupByCourseLevel } from "@/lib/curriculum/course-levels";

describe("course levels (docs/CURRICULUM.md §1)", () => {
  const sections = [...loadContent().sections].sort((a, b) => a.number - b.number);
  const assigned = courseLevels.flatMap((l) => [...l.sectionSlugs]);

  it("has six levels, none empty", () => {
    expect(courseLevels.map((l) => l.key)).toEqual(["n1", "n2", "n3", "n4", "n5", "n6"]);
    for (const level of courseLevels) expect(level.sectionSlugs.length).toBeGreaterThan(0);
  });

  it("puts every section of the registry in exactly one level", () => {
    for (const s of sections) {
      expect(
        assigned.filter((slug) => slug === s.slug),
        s.slug,
      ).toHaveLength(1);
    }
  });

  it("names no unknown slug", () => {
    const known = new Set(sections.map((s) => s.slug));
    expect(assigned.filter((slug) => !known.has(slug))).toEqual([]);
  });

  it("keeps levels contiguous and in path order", () => {
    expect(assigned).toEqual(sections.map((s) => s.slug));
  });

  it("groups sections in level order and drops empty levels", () => {
    const groups = groupByCourseLevel([
      { slug: "sql-con-ia" },
      { slug: "select" },
      { slug: "case" },
      { slug: "no-existe" },
    ]);
    expect(groups).toEqual([
      { level: "n1", sections: [{ slug: "select" }] },
      { level: "n2", sections: [{ slug: "case" }] },
      { level: "n6", sections: [{ slug: "sql-con-ia" }] },
    ]);
  });
});
