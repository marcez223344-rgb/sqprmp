"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Callout } from "@/components/ui/callout";
import { CATEGORY_STYLES, type SectionCategory } from "@/components/ui/section-header";
import { cn } from "@/lib/utils/cn";

/** Phases the browser can actually observe while grading a submission, in order. */
export const SUBMIT_STAGES = ["validating", "executing"] as const;

export type SubmitStage = "idle" | (typeof SUBMIT_STAGES)[number];

/**
 * Completed steps of the submission, as a fraction of the steps the browser can observe.
 *
 * The bar used to be a half-width pulse that never moved: it looked like progress and carried
 * none (owner feedback 2026-09-24). Faking a percentage would be worse, so the bar advances only
 * on the two transitions we genuinely know about — local check done, server phase running.
 */
export function submitProgress(stage: SubmitStage): {
  /** Steps finished; the fill of the bar. */
  completed: number;
  /** Step being worked on right now (1-based), 0 when idle. */
  current: number;
  total: number;
} {
  const total = SUBMIT_STAGES.length;
  const index = SUBMIT_STAGES.indexOf(stage as (typeof SUBMIT_STAGES)[number]);
  if (index < 0) return { completed: 0, current: 0, total };
  return { completed: index, current: index + 1, total };
}

export type SubmitVerdict = "correct" | "incorrect" | "not_executed";

/** The verdict vocabulary of docs/DESIGN_SYSTEM.md §5; nothing here picks its own colours. */
const VERDICT_CATEGORY: Record<SubmitVerdict, SectionCategory> = {
  correct: "feedback-correct",
  incorrect: "feedback-incorrect",
  not_executed: "pitfall",
};

/**
 * Status of the submission, right under the editor.
 *
 * The verdict used to appear only at the bottom of the page, out of sight of a learner whose eyes
 * were on the editor (owner feedback, 2026-09-23). Both the progress and the verdict now live
 * next to the editor, and a single live region narrates them in order.
 */
export function SubmitStatus({
  stage,
  verdict,
  onShowDetail,
}: {
  stage: SubmitStage;
  /** Verdict of the last submission, or `null` when nothing has been submitted yet. */
  verdict: SubmitVerdict | null;
  onShowDetail: () => void;
}) {
  const t = useTranslations("workspace");
  const running = stage !== "idle";
  const progress = submitProgress(stage);
  const message = running
    ? t("submitProgress.running", {
        step: progress.current,
        total: progress.total,
        phase: t(`submitProgress.${stage}` as never),
      })
    : verdict
      ? t(`verdict.${verdict}` as never)
      : "";

  return (
    <div className="space-y-2">
      <p
        role="status"
        aria-live="polite"
        className="text-muted flex min-h-5 items-center gap-2 text-xs"
      >
        {running ? (
          <Loader2
            aria-hidden="true"
            className="size-3.5 shrink-0 motion-safe:animate-spin motion-reduce:animate-none"
          />
        ) : null}
        {message}
      </p>
      {running ? (
        <div
          role="progressbar"
          aria-label={t("submitProgress.label")}
          aria-valuemin={0}
          aria-valuemax={progress.total}
          aria-valuenow={progress.completed}
          aria-valuetext={t("submitProgress.step", {
            step: progress.current,
            total: progress.total,
          })}
          className="bg-surface-2 h-1 w-full overflow-hidden rounded-full"
        >
          <div
            className="bg-primary h-full motion-safe:transition-[width] motion-safe:duration-300"
            style={{ width: `${(progress.completed / progress.total) * 100}%` }}
          />
        </div>
      ) : null}
      {!running && verdict ? (
        /* Same verdict grammar as the feedback panel and the quiz: one vocabulary, one meaning. */
        <Callout
          category={VERDICT_CATEGORY[verdict]}
          className="p-3"
          title={t(`verdict.${verdict}` as never)}
          titleClassName={cn(
            "font-sans text-sm font-semibold",
            CATEGORY_STYLES[VERDICT_CATEGORY[verdict]].ink,
          )}
          aside={
            <button
              type="button"
              onClick={onShowDetail}
              className="text-primary min-h-11 text-sm underline underline-offset-4"
            >
              {t("verdictDetail")}
            </button>
          }
        />
      ) : null}
    </div>
  );
}
