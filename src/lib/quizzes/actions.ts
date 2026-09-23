"use server";

import { z } from "zod";
import { limits } from "@/config/limits";
import { getCurrentProfile } from "@/lib/auth/session";
import {
  answerQuizQuestion,
  consumeQuizBudget,
  finalizeQuiz,
  gradeReviewQuestion,
  type QuestionFeedback,
  type QuizResult,
} from "@/lib/quizzes/service";
import { touchActivity } from "@/lib/rewards/service";

const answerSchema = z.union([
  z.string().max(500),
  z.array(z.string().max(10)).max(10),
  z.record(z.string().max(200), z.string().max(200)),
  z.null(),
]);
const lessonSlugSchema = z.string().regex(/^[a-z0-9-]{2,80}$/);

export type AnswerActionResult =
  | { ok: true; feedback: QuestionFeedback; answeredCount: number; total: number }
  | { ok: false; error: string };

/**
 * Grades one question of the learner's open attempt and reveals the answer for that question only
 * (D-34). The answer is recorded first and cannot be replaced.
 */
export async function answerQuestionAction(
  rawLessonSlug: unknown,
  rawQuestionId: unknown,
  rawAnswer: unknown,
): Promise<AnswerActionResult> {
  const profile = await getCurrentProfile();
  if (!profile || !profile.onboarding_completed_at) return { ok: false, error: "unauthorized" };
  const slug = lessonSlugSchema.safeParse(rawLessonSlug);
  const questionId = z.uuid().safeParse(rawQuestionId);
  const answer = answerSchema.safeParse(rawAnswer);
  if (!slug.success || !questionId.success || !answer.success)
    return { ok: false, error: "validation" };

  const outcome = await answerQuizQuestion(profile, slug.data, questionId.data, answer.data);
  if (!outcome.ok) return { ok: false, error: outcome.error };
  await touchActivity(profile);
  return {
    ok: true,
    feedback: outcome.feedback,
    answeredCount: outcome.answeredCount,
    total: outcome.total,
  };
}

/** Closes the attempt; the score is recomputed server-side from the recorded answers. */
export async function finishQuizAction(
  rawLessonSlug: unknown,
): Promise<{ ok: true; result: QuizResult } | { ok: false; error: string }> {
  const profile = await getCurrentProfile();
  if (!profile || !profile.onboarding_completed_at) return { ok: false, error: "unauthorized" };
  const slug = lessonSlugSchema.safeParse(rawLessonSlug);
  if (!slug.success) return { ok: false, error: "validation" };
  // Closing an attempt re-runs finalize + award + section check + badge evaluation, so it is rate
  // limited even though nothing can be paid twice (security review F-6).
  if (!(await consumeQuizBudget(`quiz_finish:${profile.id}`, limits.rateLimits.quizAnswer)))
    return { ok: false, error: "rate_limited" };
  try {
    const result = await finalizeQuiz(profile, slug.data);
    if (!result) return { ok: false, error: "not_found" };
    await touchActivity(profile);
    return { ok: true, result };
  } catch (e) {
    // `finalize_quiz_attempt` refuses an attempt with unanswered questions; anything else is an
    // infrastructure problem and must not be reported to the learner as their own mistake.
    const message = e instanceof Error ? e.message : "";
    return { ok: false, error: message.includes("incomplete") ? "incomplete" : "unavailable" };
  }
}

/** Review practice: graded, never recorded, never rewarded. */
export async function answerReviewQuestionAction(
  rawQuestionId: unknown,
  rawAnswer: unknown,
): Promise<AnswerActionResult> {
  const profile = await getCurrentProfile();
  // Same bar as every other learner action (security review F-2).
  if (!profile || !profile.onboarding_completed_at) return { ok: false, error: "unauthorized" };
  const questionId = z.uuid().safeParse(rawQuestionId);
  const answer = answerSchema.safeParse(rawAnswer);
  if (!questionId.success || !answer.success) return { ok: false, error: "validation" };
  const feedback = await gradeReviewQuestion(profile, questionId.data, answer.data);
  if (!feedback) return { ok: false, error: "not_found" };
  await touchActivity(profile);
  return { ok: true, feedback, answeredCount: 0, total: 0 };
}
