"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { CircleCheck, CircleX, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { MarkdownClient } from "@/components/workspace/markdown-client";
import {
  ANSWER_STATE_STYLES,
  REVEALED_CORRECT_ROW,
  REVIEW_RAIL,
  type AnswerState,
} from "@/components/ui/answer-state";
import { Button, buttonVariants } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { CATEGORY_STYLES, SectionHeader } from "@/components/ui/section-header";
import type { LearnerAnswer } from "@/lib/quizzes/grading";
import type { QuestionFeedback, QuizQuestion, QuizResult } from "@/lib/quizzes/service";
import {
  answerQuestionAction,
  answerReviewQuestionAction,
  finishQuizAction,
} from "@/lib/quizzes/actions";
import { cn } from "@/lib/utils/cn";

interface Props {
  questions: QuizQuestion[];
  mode: "quiz" | "review";
  lessonSlug?: string;
  passThresholdPercent?: number;
  nextHref?: Route | null;
}

/**
 * One question at a time with immediate server-graded feedback (D-34). The runner never holds an
 * answer key: `feedback` only ever arrives from the server, and only for a question that has
 * already been answered.
 *
 * Every colour, tint, icon and row state comes from the shared design primitives
 * (`ui/section-header`, `ui/callout`, `ui/answer-state`) so the quiz cannot drift from the
 * workspace; docs/reviews/2026-09-23-visual-hierarchy.md §4 is the specification.
 */
export function QuizRunner(props: Props) {
  const router = useRouter();
  const [nonce, setNonce] = useState(0);
  const [retrying, startRetry] = useTransition();
  const signature = props.questions.map((q) => q.id).join("|");
  // Retrying needs a new server-side sample, so it re-renders the page. Both updates run in one
  // transition: the fresh questions and the remount commit together, with no flash of the
  // finished attempt in between.
  const retry = () => {
    startRetry(() => {
      router.refresh();
      setNonce((n) => n + 1);
    });
  };
  return <Attempt key={`${signature}:${nonce}`} {...props} onRetry={retry} retrying={retrying} />;
}

type Feedbacks = Record<string, QuestionFeedback>;

function Attempt({
  questions,
  mode,
  lessonSlug,
  passThresholdPercent = 80,
  nextHref,
  onRetry,
  retrying,
}: Props & { onRetry: () => void; retrying: boolean }) {
  const t = useTranslations("quiz");
  const initial = useMemo<Feedbacks>(() => {
    const seed: Feedbacks = {};
    for (const q of questions) if (q.feedback) seed[q.id] = q.feedback;
    return seed;
  }, [questions]);
  const [feedbacks, setFeedbacks] = useState<Feedbacks>(initial);
  const [index, setIndex] = useState(() => {
    const firstOpen = questions.findIndex((q) => !q.feedback);
    return firstOpen === -1 ? Math.max(0, questions.length - 1) : firstOpen;
  });
  const [draft, setDraft] = useState<LearnerAnswer>(null);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const advanceRef = useRef<HTMLButtonElement | null>(null);
  const [returnFocus, setReturnFocus] = useState(0);

  // Disabling the button while the answer is graded drops focus to the body, which strands a
  // keyboard user; focus returns to the same control once it becomes "next question".
  useEffect(() => {
    if (returnFocus > 0) advanceRef.current?.focus();
  }, [returnFocus]);

  const current = questions[index];
  const feedback = current ? feedbacks[current.id] : undefined;
  const answered = questions.filter((q) => feedbacks[q.id]);
  const correctSoFar = answered.filter((q) => feedbacks[q.id]?.correct).length;
  const isLast = index === questions.length - 1;

  if (questions.length === 0) return <p className="text-muted text-sm">{t("empty")}</p>;

  if (result) {
    return (
      <QuizResultView
        questions={questions}
        feedbacks={feedbacks}
        result={result}
        mode={mode}
        passThresholdPercent={passThresholdPercent}
        nextHref={nextHref}
        onRetry={onRetry}
        retrying={retrying}
      />
    );
  }

  if (!current) return null;

  const verdictId = `verdict-${current.id}`;

  const check = () => {
    setError(null);
    startTransition(async () => {
      const r =
        mode === "quiz" && lessonSlug
          ? await answerQuestionAction(lessonSlug, current.id, draft)
          : await answerReviewQuestionAction(current.id, draft);
      if (r.ok) {
        setFeedbacks((f) => ({ ...f, [current.id]: r.feedback }));
        setReturnFocus((n) => n + 1);
      } else setError(errorMessage(t, r.error));
    });
  };

  const goNext = () => {
    setDraft(null);
    setIndex((i) => Math.min(questions.length - 1, i + 1));
  };

  const finish = () => {
    setError(null);
    startTransition(async () => {
      if (mode === "review") {
        setResult(localResult(questions, feedbacks, passThresholdPercent));
        return;
      }
      if (!lessonSlug) return;
      const r = await finishQuizAction(lessonSlug);
      if (r.ok) setResult(r.result);
      else setError(errorMessage(t, r.error));
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-muted flex items-center justify-between text-sm">
        <span>{t("progress", { current: index + 1, total: questions.length })}</span>
        <span>{t("answered", { answered: answered.length, total: questions.length })}</span>
      </div>
      {/* One segment per question: neutral, correct or incorrect. Decorative; the text above and
          the running tally below carry the same information. */}
      <div
        className="flex gap-1"
        role="progressbar"
        aria-valuenow={index + 1}
        aria-valuemin={1}
        aria-valuemax={questions.length}
        aria-label={t("progressLabel")}
      >
        {questions.map((q) => {
          const f = feedbacks[q.id];
          return (
            <span
              key={q.id}
              aria-hidden="true"
              className={cn(
                "h-1.5 flex-1 rounded-full",
                !f ? "bg-surface-2" : f.correct ? "bg-success-ink/60" : "bg-danger/60",
              )}
            />
          );
        })}
      </div>
      <p className="sr-only">{t("tally", { correct: correctSoFar, answered: answered.length })}</p>

      <section
        aria-labelledby={`q-${current.id}`}
        data-question-id={current.id}
        className="border-border bg-surface rounded-lg border p-5"
      >
        <p className="text-muted mb-1 text-xs font-semibold tracking-[0.06em] uppercase">
          {t(`types.${current.type}`)} · {current.topic}
        </p>
        <h2 id={`q-${current.id}`} className="sr-only">
          {t("progress", { current: index + 1, total: questions.length })}
        </h2>
        <MarkdownClient>{current.prompt_md}</MarkdownClient>
        {current.code_md ? <MarkdownClient>{current.code_md}</MarkdownClient> : null}
        <div className="mt-4">
          <AnswerInput
            question={current}
            value={feedback ? feedback.given : draft}
            onChange={setDraft}
            feedback={feedback ?? null}
            describedBy={feedback ? verdictId : undefined}
          />
        </div>
        {/* Inserted after the inputs so the announcement order is answer → verdict → why. The
            wrapper carries the id because `aria-describedby` must resolve to the whole verdict,
            not only to its eyebrow. */}
        {feedback ? (
          <div id={verdictId} className="mt-4">
            <QuestionVerdict
              question={current}
              feedback={feedback}
              recorded={mode === "quiz"}
              labelId={`${verdictId}-label`}
            />
          </div>
        ) : null}
      </section>

      {error ? (
        <p role="alert" className="text-danger text-sm">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-end gap-3">
        {/* One button in one place: its label changes so the focus ring never jumps. */}
        <Button
          ref={advanceRef}
          onClick={!feedback ? check : isLast ? finish : goNext}
          disabled={pending || (!feedback && !isAnswered(draft, current))}
        >
          {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
          {!feedback ? t("check") : isLast ? t("seeResult") : t("nextQuestion")}
        </Button>
      </div>
      {!feedback && !isAnswered(draft, current) ? (
        <p className="text-muted text-xs">{t("answerToContinue")}</p>
      ) : null}
    </div>
  );
}

/** The state of the question currently on screen, in the shared four-state vocabulary. */
function answerStateOf(feedback: QuestionFeedback | null, chosen: boolean): AnswerState {
  if (!feedback) return chosen ? "selected" : "pending";
  return feedback.correct ? "answered-correct" : "answered-incorrect";
}

/** Verdict for the question just answered: icon + word + one surface change, never colour alone. */
function QuestionVerdict({
  question,
  feedback,
  recorded,
  labelId,
}: {
  question: QuizQuestion;
  feedback: QuestionFeedback;
  recorded: boolean;
  labelId: string;
}) {
  const t = useTranslations("quiz");
  const state = ANSWER_STATE_STYLES[answerStateOf(feedback, true)];
  // The two explanation callouts are siblings of the verdict, not children: each block then makes
  // exactly one surface change over the card, instead of stacking a tint on a tint (which is where
  // `--color-muted` stops passing 4.5:1).
  return (
    <>
      <Callout
        live
        labelId={labelId}
        category={state.verdict ?? "neutral"}
        as="h3"
        eyebrow={feedback.correct ? t("correct") : t("incorrect")}
      >
        {/* Option-based questions reveal the right answer on the rows themselves. */}
        {!feedback.correct && !question.options.length ? (
          <p className="text-sm">
            <span className="text-muted text-xs tracking-[0.06em] uppercase">
              {t("correctAnswer")}
            </span>{" "}
            <span className="font-mono">{formatAnswer(feedback.correctAnswer, question)}</span>
          </p>
        ) : null}
        {recorded ? <p className="text-muted mt-3 text-xs">{t("answerRecorded")}</p> : null}
      </Callout>
      {feedback.whyIncorrect_md ? (
        <Callout category="pitfall" as="h4" eyebrow={t("whyIncorrect")} className="mt-3 text-sm">
          <MarkdownClient>{feedback.whyIncorrect_md}</MarkdownClient>
        </Callout>
      ) : null}
      {feedback.explanation_md ? (
        <Callout category="concept" as="h4" eyebrow={t("explanation")} className="mt-3 text-sm">
          <MarkdownClient>{feedback.explanation_md}</MarkdownClient>
        </Callout>
      ) : null}
    </>
  );
}

/**
 * Result screen (item 16). Three bounded sections with real headings: the verdict, which carries
 * the actions so the learner never scrolls past the review to continue; the per-question review;
 * and a repeat of the actions at the bottom.
 *
 * Focus lands on the verdict region itself (not on its heading and not on a button): the owner
 * reported result messages appearing off-screen while his eyes were elsewhere, and the region is
 * what has to be read — announce, then let him choose.
 */
function QuizResultView({
  questions,
  feedbacks,
  result,
  mode,
  passThresholdPercent,
  nextHref,
  onRetry,
  retrying,
}: {
  questions: QuizQuestion[];
  feedbacks: Feedbacks;
  result: QuizResult;
  mode: "quiz" | "review";
  passThresholdPercent: number;
  nextHref?: Route | null;
  onRetry: () => void;
  retrying: boolean;
}) {
  const t = useTranslations("quiz");
  const verdictRef = useRef<HTMLElement | null>(null);
  const { score, total, passed } = result;
  const byId = new Map(result.graded.map((g) => [g.questionId, g]));
  const wrong = questions.filter((q) => !(byId.get(q.id) ?? feedbacks[q.id])?.correct).length;
  const category = passed ? "feedback-correct" : "pitfall";

  useEffect(() => {
    verdictRef.current?.focus();
  }, []);

  const actions = (
    <div className="flex flex-wrap gap-3">
      {nextHref ? (
        <Link href={nextHref} className={cn(buttonVariants())}>
          {t("continue")}
        </Link>
      ) : null}
      <Button variant="secondary" onClick={onRetry} disabled={retrying}>
        {retrying ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
        {mode === "quiz" ? t("retryNewSample") : t("retry")}
      </Button>
      {mode === "quiz" ? (
        <Link href="/repaso" className={cn(buttonVariants({ variant: "ghost" }))}>
          {t("goReview")}
        </Link>
      ) : null}
    </div>
  );

  return (
    <div className="space-y-8">
      <section
        ref={verdictRef}
        id="quiz-resultado"
        tabIndex={-1}
        role="status"
        aria-labelledby="quiz-resultado-h"
        className={cn(
          // Tint, border colour, icon and ink all come from the category; the 2 px border and the
          // inset ring are the only additions, and they are what makes this the loudest block on
          // the screen (review §4.1) without introducing a second surface change.
          "space-y-3 rounded-lg border-2 p-5 ring-1 ring-inset",
          CATEGORY_STYLES[category].surface,
          passed ? "ring-success-ink/15" : "ring-warning/15",
        )}
      >
        <SectionHeader
          wrapper="div"
          className="mb-0"
          category={category}
          eyebrow={
            mode === "review"
              ? t("resultHeading")
              : passed
                ? t("verdictPassed")
                : t("verdictFailed")
          }
          title={t("score", { score, total })}
          as="h2"
          headingProps={{ id: "quiz-resultado-h" }}
          titleClassName="text-3xl font-bold"
          containerClassName="bg-surface"
        />
        <p className="text-sm">
          {mode === "quiz"
            ? passed
              ? t("passed", { percent: passThresholdPercent })
              : t("failed", { percent: passThresholdPercent })
            : t("reviewDone")}
        </p>
        {result.reward?.awarded || result.sectionCompleted ? (
          <ul className="flex flex-wrap gap-2 text-xs font-medium">
            {result.reward?.awarded ? (
              <li className="border-border bg-surface rounded-full border px-3 py-1">
                {t("reward", { xp: result.reward.xp })}
              </li>
            ) : null}
            {result.sectionCompleted ? (
              <li className="border-border bg-surface rounded-full border px-3 py-1">
                {t("sectionCompleted")}
              </li>
            ) : null}
          </ul>
        ) : null}
        {actions}
      </section>

      <section aria-labelledby="quiz-review-heading" className="space-y-3">
        <div className="border-border border-t pt-4">
          <h2 id="quiz-review-heading" className="font-heading text-lg leading-snug">
            {t("reviewHeading")}
          </h2>
          {wrong > 0 ? (
            <p className="text-muted mt-1 text-sm">{t("reviewHint", { count: wrong })}</p>
          ) : null}
        </div>
        <ol className="space-y-4">
          {questions.map((q, i) => {
            const g = byId.get(q.id) ?? feedbacks[q.id];
            const correct = g?.correct ?? false;
            return (
              <li
                key={q.id}
                className={cn(
                  "rounded-md border p-4 pl-5",
                  REVIEW_RAIL[correct ? "correct" : "incorrect"],
                )}
              >
                <SectionHeader
                  wrapper="div"
                  category={correct ? "feedback-correct" : "feedback-incorrect"}
                  eyebrow={`${t("questionN", { n: i + 1 })} · ${correct ? t("correct") : t("incorrect")}`}
                  as="h3"
                  containerClassName="bg-surface"
                />
                <MarkdownClient>{q.prompt_md}</MarkdownClient>
                {q.code_md ? <MarkdownClient>{q.code_md}</MarkdownClient> : null}
                <dl className="mt-3 space-y-1 text-sm">
                  <dt className="text-muted text-xs tracking-[0.06em] uppercase">
                    {t("yourAnswer")}
                  </dt>
                  <dd className="font-mono">{formatAnswer(g?.given, q)}</dd>
                  {!correct ? (
                    <>
                      <dt className="text-muted text-xs tracking-[0.06em] uppercase">
                        {t("correctAnswer")}
                      </dt>
                      <dd className="font-mono">{formatAnswer(g?.correctAnswer, q)}</dd>
                    </>
                  ) : null}
                </dl>
                {g?.whyIncorrect_md ? (
                  <Callout
                    category="pitfall"
                    as="h4"
                    eyebrow={t("whyIncorrect")}
                    className="mt-3 p-3 text-sm"
                  >
                    <MarkdownClient>{g.whyIncorrect_md}</MarkdownClient>
                  </Callout>
                ) : null}
                {g?.explanation_md ? (
                  <Callout
                    category="concept"
                    as="h4"
                    eyebrow={t("explanation")}
                    className="mt-3 p-3 text-sm"
                  >
                    <MarkdownClient>{g.explanation_md}</MarkdownClient>
                  </Callout>
                ) : null}
              </li>
            );
          })}
        </ol>
      </section>

      <section aria-labelledby="quiz-next-heading" className="space-y-3">
        <div className="border-border border-t pt-4">
          <h2 id="quiz-next-heading" className="font-heading text-lg leading-snug">
            {t("nextHeading")}
          </h2>
        </div>
        {actions}
      </section>
    </div>
  );
}

function localResult(
  questions: QuizQuestion[],
  feedbacks: Feedbacks,
  passThresholdPercent: number,
): QuizResult {
  const graded = questions
    .filter((q) => feedbacks[q.id])
    .map((q) => ({ questionId: q.id, ...feedbacks[q.id]! }));
  const score = graded.filter((g) => g.correct).length;
  const total = graded.length;
  return {
    score,
    total,
    passed: total > 0 && score * 100 >= passThresholdPercent * total,
    graded,
    reward: null,
    sectionCompleted: false,
    newBadges: [],
  };
}

const KNOWN_ERRORS = new Set([
  "unauthorized",
  "validation",
  "not_found",
  "no_attempt",
  "rate_limited",
  "incomplete",
  "unavailable",
]);
function errorMessage(t: ReturnType<typeof useTranslations<"quiz">>, code: string): string {
  return KNOWN_ERRORS.has(code) ? t(`errors.${code as "unknown"}`) : t("errors.unknown");
}

function isAnswered(v: LearnerAnswer, q: QuizQuestion): boolean {
  if (v === null || v === undefined) return false;
  if (q.type === "multiple") return Array.isArray(v) && v.length > 0;
  if (q.type === "matching")
    return (
      typeof v === "object" &&
      !Array.isArray(v) &&
      (q.pairs?.left ?? []).every((l) => Boolean(v[l]))
    );
  if (q.type === "fill_blank") return typeof v === "string" && v.trim().length > 0;
  return typeof v === "string" && v.length > 0;
}

function formatAnswer(v: LearnerAnswer, q: QuizQuestion): string {
  if (v === null || v === undefined) return "—";
  const label = (key: string) => q.options.find((o) => o.key === key)?.body_md ?? key;
  if (Array.isArray(v)) return v.map(label).join(" · ");
  if (typeof v === "object")
    return Object.entries(v)
      .map(([l, r]) => `${l} → ${r}`)
      .join(" · ");
  return q.options.length ? label(v) : v;
}

/** True when `key` is part of the (already revealed) correct answer. */
function isCorrectOption(feedback: QuestionFeedback | null, key: string): boolean {
  if (!feedback) return false;
  const answer = feedback.correctAnswer;
  return Array.isArray(answer) ? answer.includes(key) : answer === key;
}

function AnswerInput({
  question,
  value,
  onChange,
  feedback,
  describedBy,
}: {
  question: QuizQuestion;
  value: LearnerAnswer;
  onChange: (v: LearnerAnswer) => void;
  feedback: QuestionFeedback | null;
  describedBy?: string;
}) {
  const t = useTranslations("quiz");
  const locked = Boolean(feedback);

  /**
   * Row appearance and marker for one option, from the shared four-state table: the chosen row
   * keeps a 2 px rail, the revealed correct row is dashed, and each marker is paired with an
   * `sr-only` label — three channels, so the reveal survives greyscale.
   */
  const optionRow = (key: string, chosen: boolean) => {
    const state = ANSWER_STATE_STYLES[answerStateOf(feedback, chosen)];
    const marker = (Icon: typeof CircleCheck, label: string, ink: string) => (
      <span className="ml-auto inline-flex items-center gap-1">
        <Icon aria-hidden="true" className={cn("size-4", ink)} />
        <span className="sr-only">{label}</span>
      </span>
    );
    if (!locked) return { className: chosen ? state.row : state.otherRows, marker: null };
    const right = isCorrectOption(feedback, key);
    if (chosen && state.marker)
      return {
        className: state.row,
        marker: marker(
          state.marker,
          right ? t("markers.yoursCorrect") : t("markers.yoursIncorrect"),
          right
            ? CATEGORY_STYLES["feedback-correct"].ink
            : CATEGORY_STYLES["feedback-incorrect"].ink,
        ),
      };
    if (right)
      return {
        className: REVEALED_CORRECT_ROW,
        marker: marker(
          CircleCheck,
          t("markers.correctOption"),
          CATEGORY_STYLES["feedback-correct"].ink,
        ),
      };
    return { className: state.otherRows, marker: null };
  };

  switch (question.type) {
    case "multiple":
      return (
        <fieldset className="space-y-2" disabled={locked} aria-describedby={describedBy}>
          <legend className="sr-only">{t("selectMany")}</legend>
          {question.options.map((o) => {
            const selected = Array.isArray(value) && value.includes(o.key);
            const row = optionRow(o.key, selected);
            return (
              <label
                key={o.key}
                className={cn(
                  "flex items-start gap-3 rounded-md border p-3 text-sm",
                  locked ? "cursor-default" : "cursor-pointer",
                  row.className,
                )}
              >
                <input
                  type="checkbox"
                  className="mt-0.5 size-4"
                  checked={selected}
                  disabled={locked}
                  onChange={(e) => {
                    const arr = Array.isArray(value) ? [...value] : [];
                    onChange(e.target.checked ? [...arr, o.key] : arr.filter((k) => k !== o.key));
                  }}
                />
                <span className="prose-dm text-sm">
                  <MarkdownClient>{o.body_md}</MarkdownClient>
                </span>
                {row.marker}
              </label>
            );
          })}
        </fieldset>
      );
    case "fill_blank":
      return (
        <label className="block text-sm">
          <span className="mb-1 block font-medium">{t("fillBlank")}</span>
          <input
            className="input font-mono"
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value)}
            maxLength={200}
            autoComplete="off"
            disabled={locked}
            aria-describedby={describedBy}
          />
        </label>
      );
    case "matching": {
      const map = typeof value === "object" && value && !Array.isArray(value) ? value : {};
      const right =
        feedback && typeof feedback.correctAnswer === "object" && feedback.correctAnswer
          ? (feedback.correctAnswer as Record<string, string>)
          : null;
      return (
        <div className="space-y-2">
          {(question.pairs?.left ?? []).map((left) => {
            const ok = right ? map[left] === right[left] : null;
            const ink = ok
              ? CATEGORY_STYLES["feedback-correct"].ink
              : CATEGORY_STYLES["feedback-incorrect"].ink;
            return (
              <label key={left} className="flex flex-wrap items-center gap-2 text-sm">
                <span className="w-48 font-mono">{left}</span>
                <select
                  className="input h-9 w-56"
                  value={map[left] ?? ""}
                  disabled={locked}
                  aria-describedby={describedBy}
                  onChange={(e) => onChange({ ...map, [left]: e.target.value })}
                >
                  <option value="">{t("choose")}</option>
                  {(question.pairs?.right ?? []).map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                {locked && ok !== null ? (
                  <span className={cn("inline-flex items-center gap-1 text-xs", ink)}>
                    {ok ? (
                      <CircleCheck aria-hidden="true" className="size-4" />
                    ) : (
                      <CircleX aria-hidden="true" className="size-4" />
                    )}
                    <span>
                      {ok ? t("correct") : `${t("correctAnswer")}: ${right?.[left] ?? "—"}`}
                    </span>
                  </span>
                ) : null}
              </label>
            );
          })}
        </div>
      );
    }
    default:
      return (
        <fieldset className="space-y-2" disabled={locked} aria-describedby={describedBy}>
          <legend className="sr-only">{t("selectOne")}</legend>
          {question.options.map((o) => {
            const row = optionRow(o.key, value === o.key);
            return (
              <label
                key={o.key}
                className={cn(
                  "flex items-start gap-3 rounded-md border p-3 text-sm",
                  locked ? "cursor-default" : "cursor-pointer",
                  row.className,
                )}
              >
                <input
                  type="radio"
                  name={`q-${question.id}`}
                  className="mt-0.5 size-4"
                  checked={value === o.key}
                  disabled={locked}
                  onChange={() => onChange(o.key)}
                />
                <span className="prose-dm text-sm">
                  <MarkdownClient>{o.body_md}</MarkdownClient>
                </span>
                {row.marker}
              </label>
            );
          })}
        </fieldset>
      );
  }
}
