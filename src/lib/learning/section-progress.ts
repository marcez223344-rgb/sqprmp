import { publishedLessons } from "@/lib/curriculum/path-summary";

/**
 * How far a learner is through one section. The single definition behind every section
 * percentage: the /ruta cards and the banner at the top of each lesson page (D-42).
 *
 * Each published item of the section counts as one: a theory lesson, an exercise (or challenge)
 * and the quiz weigh the same. That is what /ruta has counted since F1, because exercises and the
 * quiz are rows of `lessons` like theory is; the breakdown only splits the same count by kind so
 * the learner sees where the missing items are. A quiz item is completed only when it was passed
 * (`finalize_quiz_attempt` marks the lesson completed on a pass, never on a failed attempt).
 *
 * Unpublished items are left out of both sides, as in `summarizePath`: a lesson the learner cannot
 * open must not hold the bar below 100 %.
 */

export interface ProgressLesson {
  kind: string;
  is_published: boolean;
  status: string;
}

export interface ProgressCount {
  done: number;
  total: number;
}

export interface SectionProgress extends ProgressCount {
  percent: number;
  theory: ProgressCount;
  exercises: ProgressCount;
  quizzes: ProgressCount;
}

type Bucket = "theory" | "exercises" | "quizzes";

function bucketFor(kind: string): Bucket {
  if (kind === "exercise" || kind === "challenge") return "exercises";
  if (kind === "quiz") return "quizzes";
  // Any future kind still counts, with the reading material, rather than silently vanishing.
  return "theory";
}

export function sectionProgress(lessons: ProgressLesson[]): SectionProgress {
  const counts: Record<Bucket, ProgressCount> = {
    theory: { done: 0, total: 0 },
    exercises: { done: 0, total: 0 },
    quizzes: { done: 0, total: 0 },
  };
  for (const l of publishedLessons(lessons)) {
    const bucket = counts[bucketFor(l.kind)];
    bucket.total += 1;
    if (l.status === "completed") bucket.done += 1;
  }
  const total = counts.theory.total + counts.exercises.total + counts.quizzes.total;
  const done = counts.theory.done + counts.exercises.done + counts.quizzes.done;
  return {
    done,
    total,
    // Rounded like /ruta always was, but never to 100 while an item is still open.
    percent: total ? Math.min(Math.round((done / total) * 100), done < total ? 99 : 100) : 0,
    ...counts,
  };
}
