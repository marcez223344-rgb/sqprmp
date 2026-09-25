import { getTranslations } from "next-intl/server";
import { Meter } from "@/components/progress/stat-tile";
import type { SectionProgress } from "@/lib/learning/section-progress";
import { cn } from "@/lib/utils/cn";

/**
 * The learner's progress in the section they are working in, at the top of its pages (D-42,
 * owner feedback round 6 item 8). The numbers come from `sectionProgress`, the same function the
 * /ruta cards use. The percentage is printed as text as well as drawn, so it is not carried by
 * the bar alone; the bar has no transition, so there is nothing to reduce for reduced motion.
 */
export async function SectionProgressBanner({
  progress,
  sectionNumber,
  className,
}: {
  progress: SectionProgress;
  sectionNumber: number;
  className?: string;
}) {
  // Nothing published yet: a «0 %» over an empty section would read as the learner's shortfall.
  if (progress.total === 0) return null;
  const t = await getTranslations("path.sectionProgress");
  const { theory, exercises, quizzes } = progress;

  const parts = [
    theory.total > 0 ? t("theory", { ...theory }) : null,
    exercises.total > 0 ? t("exercises", { ...exercises }) : null,
    quizzes.total === 1
      ? t(quizzes.done === 1 ? "quizPassed" : "quizPending")
      : quizzes.total > 1
        ? t("quizzes", { ...quizzes })
        : null,
  ].filter((part): part is string => Boolean(part));
  const breakdown = parts.join(" · ");
  const complete = progress.done === progress.total;
  const title = t("title", { percent: progress.percent });

  return (
    <section
      aria-label={t("label", { number: sectionNumber })}
      className={cn("border-border bg-surface space-y-2 rounded-lg border p-4", className)}
    >
      <p className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="text-sm font-semibold">{title}</span>
        {complete ? (
          <span className="text-success-ink text-xs font-semibold">{t("complete")}</span>
        ) : null}
      </p>
      <Meter
        tone={complete ? "success" : "primary"}
        percent={progress.percent}
        label={t("label", { number: sectionNumber })}
        valueText={`${title}. ${breakdown}`}
      />
      <p className="text-muted text-xs">{breakdown}</p>
    </section>
  );
}
