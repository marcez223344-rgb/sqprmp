/**
 * Pure rules for projecting exercise progress onto the lesson rows the learning path reads.
 *
 * Solving an exercise writes `exercise_progress`; `/ruta` reads `lesson_progress`. Until this rule
 * existed, an exercise lesson stayed "sin empezar" no matter how many times the learner solved it
 * (owner feedback 2026-09-23). These functions mirror the SQL in
 * `sync_exercise_lesson_progress`, so the same rule applies whether the status is being written or
 * derived while reading.
 */
export type LessonStatus = "not_started" | "in_progress" | "completed";
export type ExerciseStatus = "in_progress" | "completed";

const RANK: Record<LessonStatus, number> = { not_started: 0, in_progress: 1, completed: 2 };

/** Lesson status implied by an exercise's progress row (absent row → never started). */
export function lessonStatusForExercise(
  exerciseStatus: ExerciseStatus | string | null | undefined,
): LessonStatus {
  if (exerciseStatus === "completed") return "completed";
  if (exerciseStatus === "in_progress") return "in_progress";
  return "not_started";
}

/** Progress never goes backwards: the further-along status wins. */
export function mergeLessonStatus(a: LessonStatus, b: LessonStatus): LessonStatus {
  return RANK[a] >= RANK[b] ? a : b;
}
