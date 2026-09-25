import { courseLevels, type CourseLevelKey } from "@/config/course-levels";

export interface CourseLevelGroup<S> {
  level: CourseLevelKey;
  sections: S[];
}

/**
 * Groups sections by the six course levels, keeping level order and the order the sections came
 * in. Levels with no section are dropped; a section whose slug no level lists is dropped too (the
 * unit test keeps that from happening for the real registry).
 */
export function groupByCourseLevel<S extends { slug: string }>(
  sections: readonly S[],
): CourseLevelGroup<S>[] {
  return courseLevels
    .map((level) => {
      const slugs: readonly string[] = level.sectionSlugs;
      return { level: level.key, sections: sections.filter((s) => slugs.includes(s.slug)) };
    })
    .filter((g) => g.sections.length > 0);
}
