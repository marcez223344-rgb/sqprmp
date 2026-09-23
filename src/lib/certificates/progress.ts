import type { LessonStatus } from "@/lib/progress/lesson-status";

/**
 * Display-only progress for the certificates page.
 *
 * Eligibility is and stays a server rule (`certificate_eligible`), and a section is "completed"
 * only when it has a `section_progress` row. But a learner with six solved exercises was shown
 * "0 de 8 secciones completadas" and nothing else (owner feedback, 2026-09-23), so the page also
 * needs the partial picture: how many exercises of a section are done, whether the theory and the
 * quiz are still pending, and a requirement-level number that moves after every single exercise.
 *
 * Counted units are the *published* lessons of the section, which is exactly what /ruta shows.
 */
export interface SectionProgressSummary {
  lessonsDone: number;
  lessonsTotal: number;
  exercisesDone: number;
  exercisesTotal: number;
  quizzesDone: number;
  quizzesTotal: number;
  /** Every published lesson of the section, whatever its kind. */
  unitsDone: number;
  unitsTotal: number;
}

export interface SummarizableLesson {
  kind: string;
  is_published: boolean;
  status: LessonStatus;
}

const EXERCISE_KINDS = new Set(["exercise", "challenge"]);

export function summarizeSectionProgress(lessons: SummarizableLesson[]): SectionProgressSummary {
  const s: SectionProgressSummary = {
    lessonsDone: 0,
    lessonsTotal: 0,
    exercisesDone: 0,
    exercisesTotal: 0,
    quizzesDone: 0,
    quizzesTotal: 0,
    unitsDone: 0,
    unitsTotal: 0,
  };
  for (const l of lessons) {
    if (!l.is_published) continue;
    const done = l.status === "completed";
    s.unitsTotal += 1;
    if (done) s.unitsDone += 1;
    if (EXERCISE_KINDS.has(l.kind)) {
      s.exercisesTotal += 1;
      if (done) s.exercisesDone += 1;
    } else if (l.kind === "quiz") {
      s.quizzesTotal += 1;
      if (done) s.quizzesDone += 1;
    } else {
      s.lessonsTotal += 1;
      if (done) s.lessonsDone += 1;
    }
  }
  return s;
}

/**
 * Requirement-level percentage over all the units of its sections. Rounded down so it can never
 * read 100 % while something is still pending.
 */
export function requirementPercent(sections: SectionProgressSummary[]): number {
  const total = sections.reduce((a, s) => a + s.unitsTotal, 0);
  if (total === 0) return 0;
  const done = sections.reduce((a, s) => a + s.unitsDone, 0);
  return Math.floor((done * 100) / total);
}
