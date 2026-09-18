"use client";

import type { Route } from "next";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { MarkdownClient } from "@/components/workspace/markdown-client";
import { Button, buttonVariants } from "@/components/ui/button";
import type { LearnerAnswer } from "@/lib/quizzes/grading";
import type { GradedQuestion, QuizQuestion, QuizResult } from "@/lib/quizzes/service";
import { submitQuizAction, submitReviewAction } from "@/lib/quizzes/actions";
import { cn } from "@/lib/utils/cn";

interface Props {
  questions: QuizQuestion[];
  mode: "quiz" | "review";
  lessonSlug?: string;
  passThresholdPercent?: number;
  nextHref?: Route | null;
}

type Answers = Record<string, LearnerAnswer>;

export function QuizRunner({
  questions,
  mode,
  lessonSlug,
  passThresholdPercent = 80,
  nextHref,
}: Props) {
  const t = useTranslations("quiz");
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [result, setResult] = useState<{ graded: GradedQuestion[]; summary?: QuizResult } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const current = questions[index];
  const answered = useMemo(
    () => questions.filter((q) => isAnswered(answers[q.id], q)).length,
    [answers, questions],
  );

  if (questions.length === 0) {
    return <p className="text-muted text-sm">{t("empty")}</p>;
  }

  if (result) {
    const byId = new Map(result.graded.map((g) => [g.questionId, g]));
    const score = result.graded.filter((g) => g.correct).length;
    const total = result.graded.length;
    const passed = result.summary?.passed ?? score * 100 >= passThresholdPercent * total;
    return (
      <div className="space-y-6">
        <div
          className={cn(
            "rounded-lg border p-5",
            passed ? "border-success/40 bg-success/10" : "border-warning/40 bg-warning/10",
          )}
          role="status"
        >
          <p className="font-heading text-2xl font-bold">{t("score", { score, total })}</p>
          <p className="text-sm">
            {mode === "quiz"
              ? passed
                ? t("passed", { percent: passThresholdPercent })
                : t("failed", { percent: passThresholdPercent })
              : t("reviewDone")}
          </p>
          {result.summary?.reward?.awarded ? (
            <p className="text-muted mt-1 text-sm">
              {t("reward", { xp: result.summary.reward.xp })}
            </p>
          ) : null}
          {result.summary?.sectionCompleted ? (
            <p className="mt-1 text-sm font-medium">{t("sectionCompleted")}</p>
          ) : null}
        </div>
        <ol className="space-y-4">
          {questions.map((q, i) => {
            const g = byId.get(q.id);
            return (
              <li key={q.id} className="border-border bg-surface rounded-lg border p-4">
                <p className="mb-2 inline-flex items-center gap-2 text-sm font-medium">
                  {g?.correct ? (
                    <CheckCircle2 aria-hidden="true" className="text-success size-4" />
                  ) : (
                    <XCircle aria-hidden="true" className="text-danger size-4" />
                  )}
                  {t("questionN", { n: i + 1 })} · {g?.correct ? t("correct") : t("incorrect")}
                </p>
                <MarkdownClient>{q.prompt_md}</MarkdownClient>
                {q.code_md ? <MarkdownClient>{q.code_md}</MarkdownClient> : null}
                <p className="mt-2 text-sm">
                  <strong>{t("yourAnswer")}:</strong> {formatAnswer(answers[q.id], q)}
                </p>
                {!g?.correct ? (
                  <p className="text-sm">
                    <strong>{t("correctAnswer")}:</strong> {formatAnswer(g?.correctAnswer, q)}
                  </p>
                ) : null}
                {g?.whyIncorrect_md ? (
                  <div className="border-danger/30 bg-danger/5 mt-2 rounded-md border p-3 text-sm">
                    <MarkdownClient>{g.whyIncorrect_md}</MarkdownClient>
                  </div>
                ) : null}
                {g?.explanation_md ? (
                  <div className="border-info/30 bg-info/5 mt-2 rounded-md border p-3 text-sm">
                    <MarkdownClient>{g.explanation_md}</MarkdownClient>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="secondary"
            onClick={() => {
              setResult(null);
              setAnswers({});
              setIndex(0);
            }}
          >
            {t("retry")}
          </Button>
          {nextHref ? (
            <Link href={nextHref} className={cn(buttonVariants())}>
              {t("continue")}
            </Link>
          ) : null}
          {mode === "quiz" ? (
            <Link href="/repaso" className={cn(buttonVariants({ variant: "ghost" }))}>
              {t("goReview")}
            </Link>
          ) : null}
        </div>
      </div>
    );
  }

  if (!current) return null;

  const submit = () => {
    setError(null);
    startTransition(async () => {
      if (mode === "quiz" && lessonSlug) {
        const r = await submitQuizAction(lessonSlug, answers);
        if (r.ok) setResult({ graded: r.result.graded, summary: r.result });
        else setError(errorMessage(t, r.error));
      } else {
        const r = await submitReviewAction(answers);
        if (r.ok) setResult({ graded: r.graded });
        else setError(errorMessage(t, r.error));
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-muted flex items-center justify-between text-sm">
        <span>{t("progress", { current: index + 1, total: questions.length })}</span>
        <span>{t("answered", { answered, total: questions.length })}</span>
      </div>
      <div
        className="bg-surface-2 h-1.5 rounded-full"
        role="progressbar"
        aria-valuenow={index + 1}
        aria-valuemin={1}
        aria-valuemax={questions.length}
        aria-label={t("progressLabel")}
      >
        <div
          className="bg-primary h-1.5 rounded-full"
          style={{ width: `${((index + 1) / questions.length) * 100}%` }}
        />
      </div>

      <section
        aria-labelledby={`q-${current.id}`}
        data-question-id={current.id}
        className="border-border bg-surface rounded-lg border p-5"
      >
        <p className="text-muted mb-1 text-xs font-semibold tracking-wide uppercase">
          {t(`types.${current.type}`)} · {current.topic}
        </p>
        <h2 id={`q-${current.id}`} className="sr-only">
          {t("questionN", { n: index + 1 })}
        </h2>
        <MarkdownClient>{current.prompt_md}</MarkdownClient>
        {current.code_md ? <MarkdownClient>{current.code_md}</MarkdownClient> : null}
        <div className="mt-4">
          <AnswerInput
            question={current}
            value={answers[current.id]}
            onChange={(v) => setAnswers((a) => ({ ...a, [current.id]: v }))}
          />
        </div>
      </section>

      {error ? (
        <p role="alert" className="text-danger text-sm">
          {error}
        </p>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <Button
          variant="ghost"
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0 || pending}
        >
          {t("prev")}
        </Button>
        {index < questions.length - 1 ? (
          <Button
            onClick={() => setIndex((i) => Math.min(questions.length - 1, i + 1))}
            disabled={pending}
          >
            {t("next")}
          </Button>
        ) : (
          <Button onClick={submit} disabled={pending || answered < questions.length}>
            {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
            {t("submit")}
          </Button>
        )}
      </div>
      {answered < questions.length && index === questions.length - 1 ? (
        <p className="text-muted text-xs">{t("answerAll")}</p>
      ) : null}
    </div>
  );
}

const KNOWN_ERRORS = new Set(["unauthorized", "validation", "not_found"]);
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

function AnswerInput({
  question,
  value,
  onChange,
}: {
  question: QuizQuestion;
  value: LearnerAnswer;
  onChange: (v: LearnerAnswer) => void;
}) {
  const t = useTranslations("quiz");
  switch (question.type) {
    case "multiple":
      return (
        <fieldset className="space-y-2">
          <legend className="sr-only">{t("selectMany")}</legend>
          {question.options.map((o) => {
            const selected = Array.isArray(value) && value.includes(o.key);
            return (
              <label
                key={o.key}
                className={cn(
                  "flex cursor-pointer gap-3 rounded-md border p-3 text-sm",
                  selected ? "border-primary bg-primary/10" : "border-border",
                )}
              >
                <input
                  type="checkbox"
                  className="mt-0.5 size-4"
                  checked={selected}
                  onChange={(e) => {
                    const arr = Array.isArray(value) ? [...value] : [];
                    onChange(e.target.checked ? [...arr, o.key] : arr.filter((k) => k !== o.key));
                  }}
                />
                <span className="prose-dm text-sm">
                  <MarkdownClient>{o.body_md}</MarkdownClient>
                </span>
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
          />
        </label>
      );
    case "matching": {
      const map = typeof value === "object" && value && !Array.isArray(value) ? value : {};
      return (
        <div className="space-y-2">
          {(question.pairs?.left ?? []).map((left) => (
            <label key={left} className="flex flex-wrap items-center gap-2 text-sm">
              <span className="w-48 font-mono">{left}</span>
              <select
                className="input h-9 w-56"
                value={map[left] ?? ""}
                onChange={(e) => onChange({ ...map, [left]: e.target.value })}
              >
                <option value="">{t("choose")}</option>
                {(question.pairs?.right ?? []).map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      );
    }
    default:
      return (
        <fieldset className="space-y-2">
          <legend className="sr-only">{t("selectOne")}</legend>
          {question.options.map((o) => (
            <label
              key={o.key}
              className={cn(
                "flex cursor-pointer gap-3 rounded-md border p-3 text-sm",
                value === o.key ? "border-primary bg-primary/10" : "border-border",
              )}
            >
              <input
                type="radio"
                name={`q-${question.id}`}
                className="mt-0.5 size-4"
                checked={value === o.key}
                onChange={() => onChange(o.key)}
              />
              <span className="prose-dm text-sm">
                <MarkdownClient>{o.body_md}</MarkdownClient>
              </span>
            </label>
          ))}
        </fieldset>
      );
  }
}
