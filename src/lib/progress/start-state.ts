/**
 * Has this learner started the course at all?
 *
 * The dashboard's main card says "continue" or "start" from this answer, so it has to mean
 * "touched something", not "finished something": someone who opened an exercise yesterday and
 * solved nothing is continuing, not starting (owner feedback 2026-09-24, item 10).
 */
export interface StartSignals {
  /** Rows in `exercise_progress` (any status, including `in_progress`). */
  exerciseProgressCount: number;
  /** Rows in `lesson_progress` (a lesson opened counts as started). */
  lessonProgressCount: number;
  /** Exercises with status `completed`. */
  exercisesCompleted: number;
}

export function hasStartedLearning(s: StartSignals): boolean {
  return s.exerciseProgressCount > 0 || s.lessonProgressCount > 0 || s.exercisesCompleted > 0;
}
