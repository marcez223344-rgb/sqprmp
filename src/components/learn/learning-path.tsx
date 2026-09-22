import Link from "next/link";
import {
  ArrowRight,
  Award,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Circle,
  CircleDashed,
  Layers,
  ListChecks,
  Lock,
  Network,
  PlayCircle,
  Sprout,
  SquareTerminal,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { LEVEL_ORDER, type PathLesson, type PathSection } from "@/lib/curriculum/queries";
import { cn } from "@/lib/utils/cn";

type SectionState = "completed" | "in_progress" | "available" | "soon";

const LEVEL_ICON: Record<(typeof LEVEL_ORDER)[number], LucideIcon> = {
  beginner: Sprout,
  intermediate: Layers,
  advanced: Network,
  expert: BarChart3,
};

const STATE_ICON: Record<SectionState, LucideIcon> = {
  completed: CheckCircle2,
  in_progress: PlayCircle,
  available: BookOpen,
  soon: CircleDashed,
};

/**
 * State styling. Every state also carries an icon and a text label, so color is never the only
 * channel; tints stay light enough to keep text above 4.5:1 (a blanket opacity once dropped the
 * muted text below it — docs/reviews/2026-09-18-accessibility.md).
 */
const STATE_STYLES: Record<SectionState, { card: string; chip: string; badge: string }> = {
  completed: {
    card: "border-success-ink/40 bg-success-ink/5",
    chip: "border-success-ink/40 bg-success-ink/10 text-success-ink",
    badge: "border-success-ink/40 bg-success-ink/10 text-success-ink",
  },
  in_progress: {
    card: "border-primary/40 bg-surface",
    chip: "border-primary/40 bg-primary/10 text-primary",
    badge: "border-primary/40 bg-primary/10 text-primary",
  },
  available: {
    card: "border-border bg-surface",
    chip: "border-border bg-surface-2 text-text",
    badge: "border-border bg-surface-2 text-muted",
  },
  soon: {
    card: "border-border bg-surface border-dashed",
    chip: "border-border bg-surface text-muted border-dashed",
    badge: "border-border bg-surface text-muted border-dashed",
  },
};

const LESSON_ICON: Record<string, LucideIcon> = {
  theory: BookOpen,
  exercise: SquareTerminal,
  quiz: ListChecks,
  challenge: Trophy,
};

function sectionState(s: PathSection, publishedLessons: number): SectionState {
  if (!s.is_published) return "soon";
  if (publishedLessons > 0 && s.completed_lessons === publishedLessons) return "completed";
  return s.completed_lessons > 0 ? "in_progress" : "available";
}

/**
 * Shared by the public /curriculo page (no progress, no links into lessons for anon) and the
 * authenticated /ruta page. Status is always icon + text (never color alone).
 */
export async function LearningPath({
  sections,
  mode,
}: {
  sections: PathSection[];
  mode: "public" | "learner";
}) {
  const t = await getTranslations("path");
  const byLevel = LEVEL_ORDER.map((level) => ({
    level,
    sections: sections.filter((s) => s.level === level),
  })).filter((g) => g.sections.length);

  // The focal card: the first section the learner can actually continue with.
  const currentSlug =
    mode === "learner"
      ? (sections.find((s) => {
          const state = sectionState(s, s.lessons.filter((l) => l.is_published).length);
          return state === "in_progress" || state === "available";
        })?.slug ?? null)
      : null;

  return (
    <div className="space-y-14">
      {byLevel.map((group) => {
        const LevelIcon = LEVEL_ICON[group.level];
        const levelDone = group.sections.filter(
          (s) => sectionState(s, s.lessons.filter((l) => l.is_published).length) === "completed",
        ).length;
        return (
          <section key={group.level} aria-labelledby={`nivel-${group.level}`}>
            <div className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span
                aria-hidden="true"
                className="border-border bg-surface-2 text-muted flex size-9 shrink-0 items-center justify-center rounded-full border"
              >
                <LevelIcon className="size-5" />
              </span>
              <h2 id={`nivel-${group.level}`} className="text-2xl">
                {t(`levels.${group.level}`)}
              </h2>
              {mode === "learner" ? (
                <span className="text-muted text-sm">
                  {t("levelProgress", { done: levelDone, total: group.sections.length })}
                </span>
              ) : null}
            </div>

            <ol className="space-y-4">
              {group.sections.map((s) => {
                const total = s.lessons.filter((l) => l.is_published).length;
                const state = sectionState(s, total);
                const StateIcon = STATE_ICON[state];
                const styles = STATE_STYLES[state];
                const isCurrent = mode === "learner" && s.slug === currentSlug;
                const percent = total > 0 ? Math.round((s.completed_lessons / total) * 100) : 0;
                return (
                  <li
                    key={s.id}
                    className={cn(
                      "rounded-lg border p-5",
                      styles.card,
                      isCurrent && "ring-primary/45 shadow-sm ring-2",
                    )}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <span
                          aria-hidden="true"
                          className={cn(
                            "flex size-10 shrink-0 items-center justify-center rounded-full border text-sm font-bold",
                            styles.badge,
                          )}
                        >
                          {state === "completed" ? <CheckCircle2 className="size-5" /> : s.number}
                        </span>
                        <div className="min-w-0 space-y-1">
                          <p className="text-muted text-xs font-semibold tracking-wide uppercase">
                            {t("sectionNumber", { number: s.number })}
                            {s.is_free_theory ? ` · ${t("freeTheory")}` : ""}
                          </p>
                          <h3
                            className={cn(
                              "text-lg",
                              state === "completed" && "text-success-ink",
                              isCurrent && "text-xl",
                            )}
                          >
                            {s.title}
                          </h3>
                          <p className="text-muted max-w-prose text-sm">{s.summary}</p>
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
                            styles.chip,
                          )}
                        >
                          <StateIcon aria-hidden="true" className="size-4" />
                          {t(`state.${state}`)}
                          {mode === "learner" && state !== "soon" && total > 0
                            ? ` · ${s.completed_lessons}/${total}`
                            : ""}
                        </span>
                        {isCurrent ? (
                          <span className="text-primary inline-flex items-center gap-1 text-xs font-semibold">
                            {t("current")}
                            <ArrowRight aria-hidden="true" className="size-3.5" />
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {mode === "learner" && state !== "soon" && total > 0 ? (
                      <div className="mt-4 space-y-1.5">
                        <div
                          role="progressbar"
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={percent}
                          aria-label={t("progressAria", { number: s.number, percent })}
                          className="bg-surface-2 border-border/60 h-2 w-full overflow-hidden rounded-full border"
                        >
                          <div
                            className={cn(
                              "h-full rounded-full",
                              state === "completed" ? "bg-success-ink" : "bg-primary",
                            )}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <p className="text-muted text-xs">
                          {t("progress", { done: s.completed_lessons, total })}
                        </p>
                      </div>
                    ) : null}

                    {s.certificate_slug ? (
                      <p className="text-muted mt-3 inline-flex items-center gap-1.5 text-xs">
                        <Award aria-hidden="true" className="text-accent-ink size-4" />
                        {t("certificateMilestone")}
                      </p>
                    ) : null}

                    {s.is_published && s.lessons.length ? (
                      <ul className="divide-border border-border mt-4 divide-y overflow-hidden rounded-md border">
                        {s.lessons.map((l) => (
                          <LessonRow key={l.id} lesson={l} mode={mode} t={t} />
                        ))}
                      </ul>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}
    </div>
  );
}

function LessonRow({
  lesson,
  mode,
  t,
}: {
  lesson: PathLesson;
  mode: "public" | "learner";
  t: Awaited<ReturnType<typeof getTranslations<"path">>>;
}) {
  const Icon = LESSON_ICON[lesson.kind] ?? BookOpen;
  const locked = mode === "public" || !lesson.is_published;
  const done = mode === "learner" && lesson.status === "completed";
  const started = mode === "learner" && lesson.status === "in_progress";

  const inner = (
    <span
      className={cn(
        "flex min-h-11 items-center justify-between gap-3 border-l-2 px-4 py-3 text-sm",
        done
          ? "border-l-success-ink bg-success-ink/5"
          : started
            ? "border-l-primary"
            : "border-l-transparent",
      )}
    >
      <span className="flex min-w-0 items-center gap-2">
        <Icon
          aria-hidden="true"
          className={cn("size-4 shrink-0", done ? "text-success-ink" : "text-muted")}
        />
        <span className="sr-only">{t(`lessonKind.${lesson.kind}` as never)}: </span>
        <span className={cn("truncate", done ? "font-semibold" : "font-medium")}>
          {lesson.title}
        </span>
        {!lesson.is_free ? (
          <>
            <Lock aria-hidden="true" className="text-muted size-3.5 shrink-0" />
            <span className="sr-only">{t("premiumLesson")}</span>
          </>
        ) : null}
      </span>
      <span className="text-muted flex shrink-0 items-center gap-3 text-xs">
        <span className="hidden sm:inline">
          {t("minutes", { minutes: lesson.estimated_minutes })}
        </span>
        {mode === "learner" ? (
          <span
            className={cn(
              "inline-flex items-center gap-1 font-medium",
              done ? "text-success-ink" : started ? "text-primary" : "text-muted",
            )}
          >
            {done ? (
              <CheckCircle2 aria-hidden="true" className="size-4" />
            ) : started ? (
              <PlayCircle aria-hidden="true" className="size-4" />
            ) : (
              <Circle aria-hidden="true" className="size-4" />
            )}
            {t(`lessonStatus.${lesson.status}`)}
          </span>
        ) : null}
        {!locked ? <ChevronRight aria-hidden="true" className="size-4" /> : null}
      </span>
    </span>
  );

  return (
    <li>
      {locked ? (
        <div aria-disabled="true">{inner}</div>
      ) : (
        <Link href={`/leccion/${lesson.slug}`} className="hover:bg-surface-2 block">
          {inner}
        </Link>
      )}
    </li>
  );
}
