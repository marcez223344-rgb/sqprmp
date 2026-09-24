import { lessonNeedsAccess } from "@/lib/progress/lesson-lock";

/**
 * The course-wide numbers shown at the top of /ruta (overall progress, the facts line and the
 * «Continuar» target). Pure so the counting rules are unit-tested rather than read off JSX.
 *
 * Only published sections and lessons count. At launch several sections are still «Próximamente»;
 * counting their lessons in the denominator would make the overall bar look stuck for reasons the
 * learner cannot act on.
 */

interface SummaryLesson {
  slug: string;
  kind: string;
  title: string;
  estimated_minutes: number;
  is_free: boolean;
  is_published: boolean;
  status: string;
}

interface SummarySection {
  slug: string;
  number: number;
  title: string;
  is_published: boolean;
  certificate_slug: string | null;
  lessons: SummaryLesson[];
}

export interface PathSummary {
  sectionsTotal: number;
  sectionsPublished: number;
  lessons: number;
  exercises: number;
  certificates: number;
  minutes: number;
  completedLessons: number;
  percent: number;
  /** First section, in path order, that still has a published lesson to finish. */
  next: {
    sectionNumber: number;
    sectionTitle: string;
    lessonSlug: string;
    lessonTitle: string;
  } | null;
  /** The next section whose completion issues a certificate, from `next` onwards. */
  nextCertificate: { sectionNumber: number; sectionTitle: string } | null;
}

const isExercise = (kind: string) => kind === "exercise" || kind === "challenge";

export function publishedLessons<L extends { is_published: boolean }>(lessons: L[]): L[] {
  return lessons.filter((l) => l.is_published);
}

/** Sum of the published lessons' estimates; the path shows it rounded, never as a promise. */
export function sectionMinutes(section: { lessons: SummaryLesson[] }): number {
  return publishedLessons(section.lessons).reduce((a, l) => a + l.estimated_minutes, 0);
}

export function summarizePath(sections: SummarySection[], hasAccess: boolean): PathSummary {
  const live = sections.filter((s) => s.is_published);
  const lessons = live.flatMap((s) => publishedLessons(s.lessons));
  const completedLessons = lessons.filter((l) => l.status === "completed").length;

  // «Continuar» points at the first unfinished lesson of the first unfinished section, preferring
  // one the learner can open: sending someone with free access to a paywall when an open lesson
  // sits two rows further down would be a dead end. If everything left is premium, the paywall is
  // the honest next step, so the first unfinished lesson is used.
  let next: PathSummary["next"] = null;
  let nextIndex = -1;
  for (const [i, s] of live.entries()) {
    const pending = publishedLessons(s.lessons).filter((l) => l.status !== "completed");
    const open = pending.find(
      (l) => !lessonNeedsAccess({ isFree: l.is_free, mode: "learner", hasAccess }),
    );
    const target = open ?? pending[0];
    if (!target) continue;
    next = {
      sectionNumber: s.number,
      sectionTitle: s.title,
      lessonSlug: target.slug,
      lessonTitle: target.title,
    };
    nextIndex = i;
    break;
  }

  const certificateSection =
    nextIndex >= 0 ? live.slice(nextIndex).find((s) => s.certificate_slug) : undefined;

  return {
    sectionsTotal: sections.length,
    sectionsPublished: live.length,
    lessons: lessons.length,
    exercises: lessons.filter((l) => isExercise(l.kind)).length,
    certificates: new Set(sections.flatMap((s) => (s.certificate_slug ? [s.certificate_slug] : [])))
      .size,
    minutes: lessons.reduce((a, l) => a + l.estimated_minutes, 0),
    completedLessons,
    percent: lessons.length ? Math.round((completedLessons / lessons.length) * 100) : 0,
    next,
    nextCertificate: certificateSection
      ? { sectionNumber: certificateSection.number, sectionTitle: certificateSection.title }
      : null,
  };
}
