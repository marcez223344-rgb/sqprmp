"use client";

import { useTranslations } from "next-intl";
import { Callout } from "@/components/ui/callout";
import { CATEGORY_STYLES, type SectionCategory } from "@/components/ui/section-header";
import { cn } from "@/lib/utils/cn";

/** Phases the browser can actually observe while grading a submission. */
export type SubmitStage = "idle" | "validating" | "executing";

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
  const message = running
    ? t(`submitProgress.${stage}` as never)
    : verdict
      ? t(`verdict.${verdict}` as never)
      : "";

  return (
    <div className="space-y-2">
      <p role="status" aria-live="polite" className="text-muted min-h-5 text-xs">
        {message}
      </p>
      {running ? (
        <div
          role="progressbar"
          aria-label={t("submitProgress.label")}
          className="bg-surface-2 h-1 w-full overflow-hidden rounded-full"
        >
          <div className="bg-primary h-full w-1/2 animate-pulse motion-reduce:w-full motion-reduce:animate-none" />
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
