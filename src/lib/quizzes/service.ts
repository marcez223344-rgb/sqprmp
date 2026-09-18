import "server-only";
import { limits } from "@/config/limits";
import { activityDateFor, rewardKeys } from "@/lib/rewards/rules";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Json, Profile } from "@/types/database";
import {
  gradeAnswer,
  passThreshold,
  shuffle,
  type AnswerKey,
  type LearnerAnswer,
  type QuestionType,
} from "./grading";

export interface QuizQuestion {
  id: string;
  slug: string;
  type: QuestionType;
  difficulty: string;
  topic: string;
  prompt_md: string;
  code_md: string | null;
  options: { key: string; body_md: string }[];
  /** matching: left labels and shuffled right candidates. */
  pairs: { left: string[]; right: string[] } | null;
  estimated_seconds: number;
}

export interface QuizData {
  lessonId: string;
  lessonSlug: string;
  sectionId: string;
  sectionTitle: string;
  questions: QuizQuestion[];
  lastAttempt: { score: number; total: number; passed: boolean; submitted_at: string } | null;
  passThresholdPercent: number;
}

/** Questions for a section quiz, shuffled, without any correct answers or explanations. */
export async function getQuiz(profile: Profile, lessonSlug: string): Promise<QuizData | null> {
  const supabase = await createClient();
  const { data: lesson } = await supabase
    .from("lessons_public")
    .select("id, slug, section_id, kind, is_published")
    .eq("slug", lessonSlug)
    .maybeSingle();
  if (!lesson?.id || !lesson.section_id || lesson.kind !== "quiz" || !lesson.is_published)
    return null;
  const [{ data: section }, { data: questions }, { data: lastAttempt }] = await Promise.all([
    supabase.from("sections").select("title").eq("id", lesson.section_id).single(),
    supabase.from("questions_public").select("*").eq("section_id", lesson.section_id),
    supabase
      .from("quiz_attempts")
      .select("score, total, passed, submitted_at")
      .eq("user_id", profile.id)
      .eq("lesson_id", lesson.id)
      .order("submitted_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  const ids = (questions ?? []).map((q) => q.id).filter((x): x is string => Boolean(x));
  const { data: options } = ids.length
    ? await supabase.from("question_options_public").select("*").in("question_id", ids)
    : { data: [] };
  const byQuestion = new Map<string, { key: string; body_md: string; sort_order: number }[]>();
  for (const o of options ?? []) {
    if (!o.question_id || !o.key || !o.body_md) continue;
    const list = byQuestion.get(o.question_id) ?? [];
    list.push({ key: o.key, body_md: o.body_md, sort_order: o.sort_order ?? 0 });
    byQuestion.set(o.question_id, list);
  }
  const list: QuizQuestion[] = shuffle(
    (questions ?? [])
      .filter((q) => q.id && q.slug && q.type)
      .map((q) => {
        const pairs = Array.isArray(q.pairs)
          ? (q.pairs as { left: string; right: string }[])
          : null;
        return {
          id: q.id as string,
          slug: q.slug as string,
          type: q.type as QuestionType,
          difficulty: q.difficulty ?? "easy",
          topic: q.topic ?? "",
          prompt_md: q.prompt_md ?? "",
          code_md: q.code_md,
          // true/false keeps its logical order; everything else is shuffled per delivery.
          options:
            q.type === "true_false"
              ? (byQuestion.get(q.id as string) ?? []).sort((a, b) => a.sort_order - b.sort_order)
              : shuffle(byQuestion.get(q.id as string) ?? []),
          pairs: pairs
            ? { left: pairs.map((p) => p.left), right: shuffle(pairs.map((p) => p.right)) }
            : null,
          estimated_seconds: q.estimated_seconds ?? 45,
        };
      }),
  );
  return {
    lessonId: lesson.id,
    lessonSlug: lesson.slug as string,
    sectionId: lesson.section_id,
    sectionTitle: section?.title ?? "",
    questions: list,
    lastAttempt: lastAttempt ?? null,
    passThresholdPercent: limits.rewards.quizPassThresholdPercent,
  };
}

export interface GradedQuestion {
  questionId: string;
  correct: boolean;
  correctAnswer: LearnerAnswer;
  explanation_md: string;
  whyIncorrect_md: string | null;
}

export interface QuizResult {
  score: number;
  total: number;
  passed: boolean;
  graded: GradedQuestion[];
  reward: { xp: number; coins: number; awarded: boolean } | null;
  sectionCompleted: boolean;
  newBadges: string[];
}

async function answerKeys(
  questionIds: string[],
): Promise<Map<string, AnswerKey & { explanation_md: string; whyByKey: Record<string, string> }>> {
  const admin = createAdminClient();
  const [{ data: questions }, { data: options }] = await Promise.all([
    admin
      .from("theory_questions")
      .select("id, type, answer, pairs, explanation_md")
      .in("id", questionIds),
    admin
      .from("question_options")
      .select("question_id, key, is_correct, why_incorrect_md")
      .in("question_id", questionIds),
  ]);
  const map = new Map<
    string,
    AnswerKey & { explanation_md: string; whyByKey: Record<string, string> }
  >();
  for (const q of questions ?? []) {
    const opts = (options ?? []).filter((o) => o.question_id === q.id);
    map.set(q.id, {
      type: q.type as QuestionType,
      correctOptionKeys: opts.filter((o) => o.is_correct).map((o) => o.key),
      accepted: (q.answer as AnswerKey["accepted"]) ?? null,
      pairs: (q.pairs as AnswerKey["pairs"]) ?? null,
      explanation_md: q.explanation_md,
      whyByKey: Object.fromEntries(
        opts.filter((o) => o.why_incorrect_md).map((o) => [o.key, o.why_incorrect_md as string]),
      ),
    });
  }
  return map;
}

function correctAnswerFor(key: AnswerKey): LearnerAnswer {
  if (key.type === "multiple") return key.correctOptionKeys;
  if (key.type === "fill_blank") return key.accepted?.accepted[0] ?? "";
  if (key.type === "matching")
    return Object.fromEntries((key.pairs ?? []).map((p) => [p.left, p.right]));
  return key.correctOptionKeys[0] ?? "";
}

/** Grades and, unless `review`, records the attempt and pays rewards exactly once per lesson. */
export async function gradeQuiz(
  profile: Profile,
  lessonSlug: string,
  answers: Record<string, LearnerAnswer>,
  review = false,
): Promise<QuizResult | null> {
  const quiz = await getQuiz(profile, lessonSlug);
  if (!quiz) return null;
  const keys = await answerKeys(quiz.questions.map((q) => q.id));
  const graded: GradedQuestion[] = [];
  for (const q of quiz.questions) {
    const key = keys.get(q.id);
    if (!key) continue;
    const given = answers[q.id];
    const correct = gradeAnswer(key, given);
    const chosen = typeof given === "string" ? given : null;
    graded.push({
      questionId: q.id,
      correct,
      correctAnswer: correctAnswerFor(key),
      explanation_md: key.explanation_md,
      whyIncorrect_md: !correct && chosen ? (key.whyByKey[chosen] ?? null) : null,
    });
  }
  const score = graded.filter((g) => g.correct).length;
  const total = graded.length;
  const passed = passThreshold(score, total, quiz.passThresholdPercent);
  if (review)
    return { score, total, passed, graded, reward: null, sectionCompleted: false, newBadges: [] };

  const admin = createAdminClient();
  await admin.rpc("record_quiz_attempt", {
    p_user_id: profile.id,
    p_lesson_id: quiz.lessonId,
    p_score: score,
    p_total: total,
    p_passed: passed,
    p_answers: graded.map((g) => ({
      question_id: g.questionId,
      answer: answers[g.questionId] ?? null,
      is_correct: g.correct,
    })) as unknown as Json,
  });

  let reward: QuizResult["reward"] = null;
  let sectionCompleted = false;
  let newBadges: string[] = [];
  if (passed) {
    const activityDate = activityDateFor(new Date(), profile.timezone);
    const { data } = await admin.rpc("award_reward", {
      p_user_id: profile.id,
      p_event_key: rewardKeys.quizPassed(quiz.lessonId),
      p_source: "quiz",
      p_xp: score * limits.rewards.quizXpPerCorrect + limits.rewards.quizPassBonusXp,
      p_coins: 0,
      p_metadata: { lesson_id: quiz.lessonId, score, total } as Json,
      p_activity_date: activityDate,
      p_daily_xp_cap: limits.rewards.dailyXpCap,
    });
    const row = data?.[0];
    reward = { xp: row?.xp_awarded ?? 0, coins: 0, awarded: Boolean(row?.awarded) };
    sectionCompleted = await settleSectionCompletion(profile, quiz.sectionId);
    const { data: badges } = await admin.rpc("evaluate_badges", { p_user_id: profile.id });
    newBadges = (badges as unknown as string[] | null) ?? [];
  }
  return { score, total, passed, graded, reward, sectionCompleted, newBadges };
}

/** Checks completion and pays the section reward once. Shared with exercise completions. */
export async function settleSectionCompletion(
  profile: Profile,
  sectionId: string,
): Promise<boolean> {
  const admin = createAdminClient();
  const { data: done } = await admin.rpc("check_section_completion", {
    p_user_id: profile.id,
    p_section_id: sectionId,
  });
  if (!done) return false;
  const { data } = await admin.rpc("award_reward", {
    p_user_id: profile.id,
    p_event_key: rewardKeys.sectionCompleted(sectionId),
    p_source: "section",
    p_xp: limits.rewards.sectionCompletedXp,
    p_coins: limits.rewards.sectionCompletedCoins,
    p_metadata: { section_id: sectionId } as Json,
    p_activity_date: activityDateFor(new Date(), profile.timezone),
    p_daily_xp_cap: limits.rewards.dailyXpCap,
  });
  return Boolean(data?.[0]?.awarded);
}

/** Questions answered incorrectly in the learner's most recent answer, for review sessions. */
export async function getReviewQuestions(profile: Profile, max = 20): Promise<QuizQuestion[]> {
  const supabase = await createClient();
  const { data: answers } = await supabase
    .from("quiz_answers")
    .select("question_id, is_correct, answered_at")
    .eq("user_id", profile.id)
    .order("answered_at", { ascending: false })
    .limit(500);
  const latest = new Map<string, boolean>();
  for (const a of answers ?? [])
    if (!latest.has(a.question_id)) latest.set(a.question_id, a.is_correct);
  const wrongIds = [...latest.entries()]
    .filter(([, ok]) => !ok)
    .map(([id]) => id)
    .slice(0, max);
  if (!wrongIds.length) return [];
  const [{ data: questions }, { data: options }] = await Promise.all([
    supabase.from("questions_public").select("*").in("id", wrongIds),
    supabase.from("question_options_public").select("*").in("question_id", wrongIds),
  ]);
  return shuffle(
    (questions ?? [])
      .filter((q) => q.id && q.slug && q.type)
      .map((q) => {
        const pairs = Array.isArray(q.pairs)
          ? (q.pairs as { left: string; right: string }[])
          : null;
        const opts = (options ?? [])
          .filter((o) => o.question_id === q.id && o.key && o.body_md)
          .map((o) => ({ key: o.key as string, body_md: o.body_md as string }));
        return {
          id: q.id as string,
          slug: q.slug as string,
          type: q.type as QuestionType,
          difficulty: q.difficulty ?? "easy",
          topic: q.topic ?? "",
          prompt_md: q.prompt_md ?? "",
          code_md: q.code_md,
          options: q.type === "true_false" ? opts : shuffle(opts),
          pairs: pairs
            ? { left: pairs.map((p) => p.left), right: shuffle(pairs.map((p) => p.right)) }
            : null,
          estimated_seconds: q.estimated_seconds ?? 45,
        };
      }),
  );
}

/** Review sessions grade without recording attempts (retrieval practice, no rewards). */
export async function gradeReview(
  profile: Profile,
  answers: Record<string, LearnerAnswer>,
): Promise<GradedQuestion[]> {
  const ids = Object.keys(answers);
  if (!ids.length) return [];
  // Only questions the learner is allowed to see (published) are graded.
  const supabase = await createClient();
  const { data: visible } = await supabase.from("questions_public").select("id").in("id", ids);
  const allowed = new Set((visible ?? []).map((q) => q.id));
  const keys = await answerKeys(ids.filter((id) => allowed.has(id)));
  const graded: GradedQuestion[] = [];
  for (const [id, key] of keys) {
    const given = answers[id];
    const correct = gradeAnswer(key, given);
    const chosen = typeof given === "string" ? given : null;
    graded.push({
      questionId: id,
      correct,
      correctAnswer: correctAnswerFor(key),
      explanation_md: key.explanation_md,
      whyIncorrect_md: !correct && chosen ? (key.whyByKey[chosen] ?? null) : null,
    });
  }
  void profile;
  return graded;
}
