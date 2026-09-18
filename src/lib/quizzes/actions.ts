"use server";

import { z } from "zod";
import { getCurrentProfile } from "@/lib/auth/session";
import {
  gradeQuiz,
  gradeReview,
  type QuizResult,
  type GradedQuestion,
} from "@/lib/quizzes/service";
import { touchActivity } from "@/lib/rewards/service";

const answerSchema = z.union([
  z.string().max(500),
  z.array(z.string().max(10)).max(10),
  z.record(z.string().max(200), z.string().max(200)),
  z.null(),
]);
const answersSchema = z
  .record(z.uuid(), answerSchema)
  .refine((r) => Object.keys(r).length <= 60, "too many answers");

export async function submitQuizAction(
  rawLessonSlug: unknown,
  rawAnswers: unknown,
): Promise<{ ok: true; result: QuizResult } | { ok: false; error: string }> {
  const profile = await getCurrentProfile();
  if (!profile || !profile.onboarding_completed_at) return { ok: false, error: "unauthorized" };
  const slug = z
    .string()
    .regex(/^[a-z0-9-]{2,80}$/)
    .safeParse(rawLessonSlug);
  const answers = answersSchema.safeParse(rawAnswers);
  if (!slug.success || !answers.success) return { ok: false, error: "validation" };
  const result = await gradeQuiz(profile, slug.data, answers.data);
  if (!result) return { ok: false, error: "not_found" };
  await touchActivity(profile);
  return { ok: true, result };
}

export async function submitReviewAction(
  rawAnswers: unknown,
): Promise<{ ok: true; graded: GradedQuestion[] } | { ok: false; error: string }> {
  const profile = await getCurrentProfile();
  if (!profile) return { ok: false, error: "unauthorized" };
  const answers = answersSchema.safeParse(rawAnswers);
  if (!answers.success) return { ok: false, error: "validation" };
  const graded = await gradeReview(profile, answers.data);
  await touchActivity(profile);
  return { ok: true, graded };
}
