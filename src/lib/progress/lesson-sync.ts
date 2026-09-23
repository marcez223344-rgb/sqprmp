import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export {
  lessonStatusForExercise,
  mergeLessonStatus,
  type ExerciseStatus,
  type LessonStatus,
} from "./lesson-status";

/**
 * Writes the lesson row behind an exercise. Idempotent and monotonic in SQL, so callers may invoke
 * it on every start and on every first completion without checking anything first.
 *
 * A failure here is logged, not thrown: the learner's exercise progress is already persisted and
 * the learning path also derives the status when reading, so this must never break a submission.
 */
export async function syncExerciseLessonProgress(
  userId: string,
  exerciseId: string,
  completed: boolean,
): Promise<void> {
  const { error } = await createAdminClient().rpc("sync_exercise_lesson_progress", {
    p_user_id: userId,
    p_exercise_id: exerciseId,
    p_completed: completed,
  });
  if (error) console.error("[progress] sync_exercise_lesson_progress failed", error.message);
}
