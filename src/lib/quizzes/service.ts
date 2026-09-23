import "server-only";
import { limits } from "@/config/limits";
import { track } from "@/lib/analytics/track";
import { activityDateFor, rewardKeys } from "@/lib/rewards/rules";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Json, Profile } from "@/types/database";
import {
  gradeAnswer,
  shuffle,
  type AnswerKey,
  type LearnerAnswer,
  type QuestionType,
} from "./grading";
import { sampleQuestions } from "./sampling";

/** Feedback for a question the learner has already answered in this attempt (answers are final). */
export interface QuestionFeedback {
  given: LearnerAnswer;
  correct: boolean;
  correctAnswer: LearnerAnswer;
  explanation_md: string;
  whyIncorrect_md: string | null;
}

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
  /**
   * Present only for questions already answered in the current attempt, so a reload resumes with
   * the locked questions and their feedback still visible. Never set for unanswered questions:
   * that is what keeps the answer key out of the browser (CLAUDE.md rule 7).
   */
  feedback?: QuestionFeedback | null;
}

export interface QuizData {
  lessonId: string;
  lessonSlug: string;
  sectionId: string;
  sectionTitle: string;
  /** The attempt's sample, in attempt order. */
  questions: QuizQuestion[];
  /** Size of the section's bank, for copy that explains why a retry asks other questions. */
  bankSize: number;
  lastAttempt: { score: number; total: number; passed: boolean; submitted_at: string } | null;
  passThresholdPercent: number;
}

interface BankQuestion {
  id: string;
  slug: string;
  type: QuestionType;
  difficulty: string;
  topic: string;
  prompt_md: string;
  code_md: string | null;
  options: { key: string; body_md: string }[];
  pairs: { left: string[]; right: string[] } | null;
  estimated_seconds: number;
}

type QuestionRow = {
  id: string | null;
  slug: string | null;
  type: string | null;
  difficulty: string | null;
  topic: string | null;
  prompt_md: string | null;
  code_md: string | null;
  estimated_seconds: number | null;
};

/** `matching` sides, read with the service role: `pairs` is the grading key (security F-1). */
type MatchingSides = Map<string, { left: string[]; right: string[] }>;

type OptionRow = {
  question_id: string | null;
  key: string | null;
  body_md: string | null;
  sort_order: number | null;
};

/** Hydrates public question rows (no answers, no explanations) into deliverable questions. */
function hydrate(
  questions: QuestionRow[],
  options: OptionRow[],
  sides: MatchingSides,
): BankQuestion[] {
  const byQuestion = new Map<string, { key: string; body_md: string; sort_order: number }[]>();
  for (const o of options) {
    if (!o.question_id || !o.key || !o.body_md) continue;
    const list = byQuestion.get(o.question_id) ?? [];
    list.push({ key: o.key, body_md: o.body_md, sort_order: o.sort_order ?? 0 });
    byQuestion.set(o.question_id, list);
  }
  return questions
    .filter((q) => q.id && q.slug && q.type)
    .map((q) => {
      const opts = byQuestion.get(q.id as string) ?? [];
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
            ? [...opts].sort((a, b) => a.sort_order - b.sort_order)
            : shuffle(opts),
        pairs: sides.get(q.id as string) ?? null,
        estimated_seconds: q.estimated_seconds ?? 45,
      };
    });
}

/**
 * Left labels and shuffled right candidates for `matching` questions.
 *
 * `theory_questions.pairs` is the answer key, so it is readable only by the service role and never
 * reaches the browser paired: the learner receives the two columns separately, the right one
 * shuffled (security review F-1).
 */
async function matchingSides(questionIds: string[]): Promise<MatchingSides> {
  const out: MatchingSides = new Map();
  if (!questionIds.length) return out;
  const { data, error } = await createAdminClient()
    .from("theory_questions")
    .select("id, pairs")
    .in("id", questionIds)
    .eq("type", "matching");
  if (error) throw new Error(`matching questions unavailable: ${error.message}`);
  for (const row of data ?? []) {
    if (!Array.isArray(row.pairs)) continue;
    const pairs = row.pairs as { left: string; right: string }[];
    out.set(row.id, { left: pairs.map((p) => p.left), right: shuffle(pairs.map((p) => p.right)) });
  }
  return out;
}

async function loadBank(sectionId: string): Promise<BankQuestion[]> {
  const supabase = await createClient();
  const { data: questions } = await supabase
    .from("questions_public")
    .select("*")
    .eq("section_id", sectionId);
  const ids = (questions ?? []).map((q) => q.id).filter((x): x is string => Boolean(x));
  const [{ data: options }, sides] = await Promise.all([
    ids.length
      ? supabase.from("question_options_public").select("*").in("question_id", ids)
      : Promise.resolve({ data: [] }),
    matchingSides(ids),
  ]);
  return hydrate((questions ?? []) as QuestionRow[], (options ?? []) as OptionRow[], sides);
}

async function publishedQuizLesson(lessonSlug: string) {
  const supabase = await createClient();
  const { data: lesson } = await supabase
    .from("lessons_public")
    .select("id, slug, section_id, kind, is_published")
    .eq("slug", lessonSlug)
    .maybeSingle();
  if (!lesson?.id || !lesson.section_id || lesson.kind !== "quiz" || !lesson.is_published)
    return null;
  return { id: lesson.id, slug: lesson.slug as string, sectionId: lesson.section_id };
}

/**
 * Starts or resumes the learner's attempt at a section quiz and returns its questions.
 *
 * D-33: the attempt holds a stratified sample of the bank (`limits.quiz.questionsPerAttempt`),
 * frozen server-side, so reloading cannot re-roll it and a retry gets a different sample.
 * D-34: questions already answered in this attempt come back with their feedback attached; the
 * unanswered ones carry no answer key.
 */
export async function getQuiz(profile: Profile, lessonSlug: string): Promise<QuizData | null> {
  const lesson = await publishedQuizLesson(lessonSlug);
  if (!lesson) return null;
  const supabase = await createClient();
  const [{ data: section }, bank, { data: lastAttempt }] = await Promise.all([
    supabase.from("sections").select("title").eq("id", lesson.sectionId).single(),
    loadBank(lesson.sectionId),
    supabase
      .from("quiz_attempts")
      .select("score, total, passed, submitted_at")
      .eq("user_id", profile.id)
      .eq("lesson_id", lesson.id)
      .eq("status", "submitted")
      .order("submitted_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (!bank.length) return null;

  const byId = new Map(bank.map((q) => [q.id, q]));
  const admin = createAdminClient();
  let attempt = await startAttempt(lesson.id, profile.id, bank);
  // The stored sample can name a question that has since been unpublished. Rather than leave the
  // learner with an attempt that can never be completed, the open attempt is discarded (no reward
  // has been paid yet) and a fresh sample is drawn.
  if (attempt.questionIds.some((id) => !byId.has(id))) {
    await admin.rpc("discard_quiz_attempt", {
      p_user_id: profile.id,
      p_attempt_id: attempt.attemptId,
    });
    attempt = await startAttempt(lesson.id, profile.id, bank);
  }

  const questions: QuizQuestion[] = attempt.questionIds
    .map((id) => byId.get(id))
    .filter((q): q is BankQuestion => Boolean(q));
  const feedback = await recordedFeedback(profile.id, attempt.attemptId);
  return {
    lessonId: lesson.id,
    lessonSlug: lesson.slug,
    sectionId: lesson.sectionId,
    sectionTitle: section?.title ?? "",
    questions: questions.map((q) => ({ ...q, feedback: feedback.get(q.id) ?? null })),
    bankSize: bank.length,
    lastAttempt: lastAttempt?.submitted_at
      ? {
          score: lastAttempt.score,
          total: lastAttempt.total,
          passed: lastAttempt.passed,
          submitted_at: lastAttempt.submitted_at,
        }
      : null,
    passThresholdPercent: limits.rewards.quizPassThresholdPercent,
  };
}

async function startAttempt(
  lessonId: string,
  userId: string,
  bank: BankQuestion[],
): Promise<{ attemptId: string; questionIds: string[] }> {
  const proposed = sampleQuestions(bank, limits.quiz.questionsPerAttempt).map((q) => q.id);
  const { data, error } = await createAdminClient().rpc("start_quiz_attempt", {
    p_user_id: userId,
    p_lesson_id: lessonId,
    p_question_ids: proposed,
  });
  const row = data?.[0];
  if (error || !row?.attempt_id)
    throw new Error(`quiz attempt unavailable: ${error?.message ?? "no attempt"}`);
  return { attemptId: row.attempt_id, questionIds: row.question_ids ?? [] };
}

/** Feedback for the answers already recorded in this attempt. */
async function recordedFeedback(
  userId: string,
  attemptId: string,
): Promise<Map<string, QuestionFeedback>> {
  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("quiz_answers")
    .select("question_id, answer, is_correct")
    .eq("quiz_attempt_id", attemptId)
    .eq("user_id", userId);
  const out = new Map<string, QuestionFeedback>();
  if (!rows?.length) return out;
  const keys = await answerKeys(rows.map((r) => r.question_id));
  for (const row of rows) {
    const key = keys.get(row.question_id);
    if (!key) continue;
    const given = row.answer as LearnerAnswer;
    out.set(row.question_id, buildFeedback(key, given, row.is_correct));
  }
  return out;
}

function buildFeedback(
  key: AnswerKey & { explanation_md: string; whyByKey: Record<string, string> },
  given: LearnerAnswer,
  correct: boolean,
): QuestionFeedback {
  const chosen = typeof given === "string" ? given : null;
  return {
    given,
    correct,
    correctAnswer: correctAnswerFor(key),
    explanation_md: key.explanation_md,
    whyIncorrect_md: !correct && chosen ? (key.whyByKey[chosen] ?? null) : null,
  };
}

export interface GradedQuestion extends QuestionFeedback {
  questionId: string;
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
  const [{ data: questions, error: questionsError }, { data: options, error: optionsError }] =
    await Promise.all([
      admin
        .from("theory_questions")
        .select("id, type, answer, pairs, explanation_md")
        .in("id", questionIds),
      admin
        .from("question_options")
        .select("question_id, key, is_correct, why_incorrect_md")
        .in("question_id", questionIds),
    ]);
  // These reads are privileged (the answer key is never exposed to the browser). Swallowing an
  // error here graded every question as wrong and showed "Respuesta correcta: —": an
  // infrastructure failure presented to the learner as their own mistake.
  if (questionsError || optionsError)
    throw new Error(
      `answer key unavailable: ${questionsError?.message ?? optionsError?.message ?? "unknown"}`,
    );
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

/** Token-bucket consumption; exported so server actions can guard before doing any work. */
export async function consumeQuizBudget(
  key: string,
  rule: { capacity: number; refillPerSecond: number },
): Promise<boolean> {
  const { data, error } = await createAdminClient().rpc("consume_rate_limit", {
    p_key: key,
    p_capacity: rule.capacity,
    p_refill_per_second: rule.refillPerSecond,
  });
  return !error && data === true;
}

export type AnswerOutcome =
  | { ok: true; feedback: QuestionFeedback; answeredCount: number; total: number }
  | {
      ok: false;
      error: "not_found" | "no_attempt" | "already_answered" | "rate_limited" | "unavailable";
    };

/**
 * Grades exactly one question of the learner's open attempt.
 *
 * D-34: the answer is recorded before the feedback is returned and cannot be replaced, which is
 * what makes it safe to reveal the correct answer immediately. Order: rate limit → resolve the
 * attempt → the question must belong to the attempt's sample → grade → record → reveal.
 */
export async function answerQuizQuestion(
  profile: Profile,
  lessonSlug: string,
  questionId: string,
  answer: LearnerAnswer,
): Promise<AnswerOutcome> {
  if (!(await consumeQuizBudget(`quiz_answer:${profile.id}`, limits.rateLimits.quizAnswer)))
    return { ok: false, error: "rate_limited" };

  const lesson = await publishedQuizLesson(lessonSlug);
  if (!lesson) return { ok: false, error: "not_found" };
  const admin = createAdminClient();
  const { data: attempt } = await admin
    .from("quiz_attempts")
    .select("id, question_ids")
    .eq("user_id", profile.id)
    .eq("lesson_id", lesson.id)
    .eq("status", "in_progress")
    .maybeSingle();
  if (!attempt?.id) return { ok: false, error: "no_attempt" };
  if (!attempt.question_ids.includes(questionId)) return { ok: false, error: "not_found" };

  // The question must still be one the learner is allowed to see.
  const supabase = await createClient();
  const { data: visible } = await supabase
    .from("questions_public")
    .select("id")
    .eq("id", questionId)
    .maybeSingle();
  if (!visible?.id) return { ok: false, error: "not_found" };

  const keys = await answerKeys([questionId]);
  const key = keys.get(questionId);
  if (!key) return { ok: false, error: "unavailable" };
  const correct = gradeAnswer(key, answer);

  const { data, error } = await admin.rpc("record_quiz_answer", {
    p_user_id: profile.id,
    p_attempt_id: attempt.id,
    p_question_id: questionId,
    p_answer: (answer ?? null) as Json,
    p_is_correct: correct,
  });
  const row = data?.[0];
  if (error || !row) return { ok: false, error: "unavailable" };
  if (!row.recorded) {
    // Already answered (double click, or a second tab): return the stored answer's feedback
    // instead of the new one, so the learner sees exactly what was counted.
    const { data: stored } = await admin
      .from("quiz_answers")
      .select("answer, is_correct")
      .eq("quiz_attempt_id", attempt.id)
      .eq("question_id", questionId)
      .maybeSingle();
    if (!stored) return { ok: false, error: "unavailable" };
    return {
      ok: true,
      feedback: buildFeedback(key, stored.answer as LearnerAnswer, stored.is_correct),
      answeredCount: row.answered_count,
      total: row.total,
    };
  }
  await track(
    "quiz_question_answered",
    { lesson_slug: lessonSlug, question_type: key.type, correct },
    { userId: profile.id },
  );
  return {
    ok: true,
    feedback: buildFeedback(key, answer, correct),
    answeredCount: row.answered_count,
    total: row.total,
  };
}

/**
 * Closes the attempt and pays the reward. The score comes from `finalize_quiz_attempt`, which
 * counts the recorded answers in SQL; nothing the browser sends can change it. The reward keeps
 * its per-lesson `event_key`, so retrying a passed quiz pays nothing.
 */
export async function finalizeQuiz(
  profile: Profile,
  lessonSlug: string,
): Promise<QuizResult | null> {
  const lesson = await publishedQuizLesson(lessonSlug);
  if (!lesson) return null;
  const admin = createAdminClient();
  const { data: attempts } = await admin
    .from("quiz_attempts")
    .select("id, status, question_ids, submitted_at")
    .eq("user_id", profile.id)
    .eq("lesson_id", lesson.id)
    .order("status", { ascending: true }) // 'in_progress' sorts before 'submitted'
    .order("submitted_at", { ascending: false, nullsFirst: true })
    .limit(1);
  const attempt = attempts?.[0];
  if (!attempt?.id) return null;

  const { data, error } = await admin.rpc("finalize_quiz_attempt", {
    p_user_id: profile.id,
    p_attempt_id: attempt.id,
    p_pass_threshold_percent: limits.rewards.quizPassThresholdPercent,
  });
  const row = data?.[0];
  // `detail = 'incomplete'` is the one case the learner can act on (a question is unanswered).
  if (error || !row)
    throw new Error(`quiz could not be closed: ${error?.details ?? error?.message ?? "no result"}`);
  const { score, total, passed, already_submitted: alreadySubmitted } = row;

  const graded = await gradedForAttempt(profile.id, attempt.id);
  let reward: QuizResult["reward"] = null;
  let sectionCompleted = false;
  let newBadges: string[] = [];
  if (passed) {
    const { data: awardData } = await admin.rpc("award_reward", {
      p_user_id: profile.id,
      p_event_key: rewardKeys.quizPassed(lesson.id),
      p_source: "quiz",
      p_xp: score * limits.rewards.quizXpPerCorrect + limits.rewards.quizPassBonusXp,
      p_coins: 0,
      p_metadata: { lesson_id: lesson.id, score, total } as Json,
      p_activity_date: activityDateFor(new Date(), profile.timezone),
      p_daily_xp_cap: limits.rewards.dailyXpCap,
    });
    const awarded = awardData?.[0];
    reward = { xp: awarded?.xp_awarded ?? 0, coins: 0, awarded: Boolean(awarded?.awarded) };
    sectionCompleted = await settleSectionCompletion(profile, lesson.sectionId);
    const { data: badges } = await admin.rpc("evaluate_badges", { p_user_id: profile.id });
    newBadges = (badges as unknown as string[] | null) ?? [];
  }
  if (!alreadySubmitted)
    await track(
      "quiz_submitted",
      { lesson_slug: lessonSlug, score, total, passed },
      { userId: profile.id },
    );
  for (const badge of newBadges)
    await track("badge_earned", { badge_slug: badge }, { userId: profile.id });
  return { score, total, passed, graded, reward, sectionCompleted, newBadges };
}

async function gradedForAttempt(userId: string, attemptId: string): Promise<GradedQuestion[]> {
  const { data: rows } = await createAdminClient()
    .from("quiz_answers")
    .select("question_id, answer, is_correct, answered_at")
    .eq("quiz_attempt_id", attemptId)
    .eq("user_id", userId)
    .order("answered_at", { ascending: true });
  if (!rows?.length) return [];
  const keys = await answerKeys(rows.map((r) => r.question_id));
  const graded: GradedQuestion[] = [];
  for (const row of rows) {
    const key = keys.get(row.question_id);
    if (!key) continue;
    graded.push({
      questionId: row.question_id,
      ...buildFeedback(key, row.answer as LearnerAnswer, row.is_correct),
    });
  }
  return graded;
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
  const awarded = Boolean(data?.[0]?.awarded);
  if (awarded) {
    const { data: section } = await admin
      .from("sections")
      .select("slug")
      .eq("id", sectionId)
      .single();
    await track(
      "section_completed",
      { section_slug: section?.slug ?? "unknown" },
      { userId: profile.id },
    );
  }
  return awarded;
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
  const [{ data: questions }, { data: options }, sides] = await Promise.all([
    supabase.from("questions_public").select("*").in("id", wrongIds),
    supabase.from("question_options_public").select("*").in("question_id", wrongIds),
    matchingSides(wrongIds),
  ]);
  return shuffle(
    hydrate((questions ?? []) as QuestionRow[], (options ?? []) as OptionRow[], sides),
  ) as QuizQuestion[];
}

/**
 * Grades one review question. Review is retrieval practice: nothing is recorded and nothing is
 * paid, so the answer is not final and the learner may try the same question again later.
 */
export async function gradeReviewQuestion(
  profile: Profile,
  questionId: string,
  answer: LearnerAnswer,
): Promise<QuestionFeedback | null> {
  if (!(await consumeQuizBudget(`quiz_review:${profile.id}`, limits.rateLimits.quizReview)))
    return null;
  const supabase = await createClient();
  const { data: visible } = await supabase
    .from("questions_public")
    .select("id")
    .eq("id", questionId)
    .maybeSingle();
  if (!visible?.id) return null;
  // Review means reviewing something you answered. Without this check the endpoint reveals the
  // answer key of any published question to any signed-in learner (security review F-2), which
  // would defeat the per-attempt reveal control that D-34 rests on.
  const { data: own } = await createAdminClient()
    .from("quiz_answers")
    .select("question_id")
    .eq("user_id", profile.id)
    .eq("question_id", questionId)
    .limit(1)
    .maybeSingle();
  if (!own) return null;
  const key = (await answerKeys([questionId])).get(questionId);
  if (!key) return null;
  return buildFeedback(key, answer, gradeAnswer(key, answer));
}
