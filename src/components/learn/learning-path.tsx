import Link from "next/link";
import {
  ArrowRight,
  Award,
  BarChart3,
  BookOpen,
  Briefcase,
  Check,
  ChevronRight,
  CircleDashed,
  CircleDot,
  Clock,
  Layers,
  ListChecks,
  Network,
  Shapes,
  Sprout,
  SquareTerminal,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import {
  ProgressChip,
  ProgressMarker,
  PROGRESS_STATE_STYLES,
  progressRailClasses,
  type ProgressState,
} from "@/components/progress/progress-state";
import type { CourseLevelKey } from "@/config/course-levels";
import { groupByCourseLevel } from "@/lib/curriculum/course-levels";
import { sectionMinutes } from "@/lib/curriculum/path-summary";
import type { PathLesson, PathSection } from "@/lib/curriculum/queries";
import { lessonNeedsAccess } from "@/lib/progress/lesson-lock";
import { cn } from "@/lib/utils/cn";

/** The section-level names of the shared states: `available` is `not_started` with its own word. */
type SectionState = "completed" | "in_progress" | "available" | "soon";

const SECTION_PROGRESS_STATE: Record<SectionState, ProgressState> = {
  completed: "completed",
  in_progress: "in_progress",
  available: "not_started",
  soon: "soon",
};

const LEVEL_ICON: Record<CourseLevelKey, LucideIcon> = {
  n1: Sprout,
  n2: Shapes,
  n3: Layers,
  n4: Network,
  n5: BarChart3,
  n6: Briefcase,
};

/**
 * Chip icons. Four different silhouettes on purpose: a bare check, a dot inside a ring, an open
 * book and a dashed ring. The previous set was three circles (`CheckCircle2`, `PlayCircle`,
 * `Circle`) whose only difference was a 3 px mark in the middle.
 */
const STATE_CHIP_ICON: Record<SectionState, LucideIcon> = {
  completed: Check,
  in_progress: CircleDot,
  available: BookOpen,
  soon: CircleDashed,
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
 * authenticated /ruta page. Status is always marker + word (never colour alone); the vocabulary
 * lives in `src/components/progress/progress-state.tsx` and is documented in DESIGN_SYSTEM §5c.
 */
/**
 * `hasAccess` is the same answer the server gate gives (`has_active_entitlement`), passed in by the
 * page. It exists because the padlock used to be drawn from `lesson.is_free` alone: a learner who
 * had just been granted access still saw padlocks on every premium lesson, while the lessons
 * opened normally — the badge said one thing and the gate did another (owner feedback item 24).
 * The gate stays where it is; only the display was lying.
 */
export async function LearningPath({
  sections,
  mode,
  hasAccess = false,
}: {
  sections: PathSection[];
  mode: "public" | "learner";
  hasAccess?: boolean;
}) {
  const t = await getTranslations("path");
  const byLevel = groupByCourseLevel(sections);

  // The focal card: the first section the learner can actually continue with. A published section
  // with no published lesson yet has nothing to continue, and skipping it keeps this cue on the
  // same section as the «Continuar» button above the path (`summarizePath`).
  const currentSlug =
    mode === "learner"
      ? (sections.find((s) => {
          const published = s.lessons.filter((l) => l.is_published).length;
          const state = sectionState(s, published);
          return published > 0 && (state === "in_progress" || state === "available");
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
                // In `public` mode nobody has progress, so every published card reads as untouched.
                const progressState: ProgressState =
                  mode === "public" && state !== "soon"
                    ? "not_started"
                    : SECTION_PROGRESS_STATE[state];
                const styles = PROGRESS_STATE_STYLES[progressState];
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
                        <ProgressMarker
                          size="lg"
                          state={progressState}
                          number={s.number}
                          label={t(`state.${state}`)}
                        />
                        <div className="min-w-0 space-y-1">
                          <p className="text-muted text-xs font-semibold tracking-wide uppercase">
                            {t("sectionNumber", { number: s.number })}
                            {s.is_free_theory ? ` · ${t("freeTheory")}` : ""}
                          </p>
                          {/* Only the section in progress is bold: at 39 cards the eye needs one
                              target, not three competing weights. */}
                          <h3
                            className={cn(
                              "text-lg",
                              styles.emphasised && "font-bold",
                              isCurrent && "text-xl",
                            )}
                          >
                            {s.title}
                          </h3>
                          <p className="text-muted max-w-prose text-sm">{s.summary}</p>
                          <SectionFacts section={s} sections={sections} t={t} />
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <ProgressChip
                          state={progressState}
                          icon={STATE_CHIP_ICON[state]}
                          label={`${t(`state.${state}`)}${
                            mode === "learner" && state !== "soon" && total > 0
                              ? ` · ${s.completed_lessons}/${total}`
                              : ""
                          }`}
                        />
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
                          {t("progress", { done: s.completed_lessons, total, percent })}
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
                          <LessonRow
                            key={l.id}
                            lesson={l}
                            mode={mode}
                            hasAccess={hasAccess}
                            t={t}
                          />
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
  hasAccess,
  t,
}: {
  lesson: PathLesson;
  mode: "public" | "learner";
  hasAccess: boolean;
  t: Awaited<ReturnType<typeof getTranslations<"path">>>;
}) {
  const Icon = LESSON_ICON[lesson.kind] ?? BookOpen;
  const locked = mode === "public" || !lesson.is_published;
  const needsAccess = lessonNeedsAccess({ isFree: lesson.is_free, mode, hasAccess });
  const done = mode === "learner" && lesson.status === "completed";
  const started = mode === "learner" && lesson.status === "in_progress";

  /**
   * Precedence: work already done outranks the padlock (an expired entitlement must not erase a
   * completed lesson), and the padlock outranks "sin empezar" — those two are the pair most at risk
   * of collapsing into each other, which is why `locked` is the one state drawn with a dashed rail
   * and a glyph instead of an empty marker.
   */
  const state: ProgressState = done
    ? "completed"
    : needsAccess
      ? "locked"
      : started
        ? "in_progress"
        : "not_started";
  const label = needsAccess && !done ? t("premiumLesson") : t(`lessonStatus.${lesson.status}`);

  const inner = (
    <span
      className={cn(
        "flex min-h-11 items-center justify-between gap-3 px-4 py-3 text-sm",
        progressRailClasses(state),
      )}
    >
      <span className="flex min-w-0 items-center gap-2">
        <ProgressMarker state={state} label={label} />
        <Icon aria-hidden="true" className="text-muted size-4 shrink-0" />
        <span className="sr-only">{t(`lessonKind.${lesson.kind}` as never)}: </span>
        {/* The in-progress row is the only bold line in a list of up to 347 rows: that is the whole
            hierarchy. Completed rows keep their weight and recede through the rail. */}
        <span className={cn("truncate", state === "in_progress" ? "font-bold" : "font-medium")}>
          {lesson.title}
        </span>
      </span>
      <span className="text-muted flex shrink-0 items-center gap-3 text-xs">
        <span className="hidden sm:inline">
          {t("minutes", { minutes: lesson.estimated_minutes })}
        </span>
        {/* Only «En curso» spends a word here. «Completada» and «Sin empezar» are carried by the
            marker and the rail, and their label travels with the marker for screen readers. */}
        {state === "in_progress" ? (
          <span className="text-primary font-semibold">{t("lessonStatus.in_progress")}</span>
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

/**
 * Time and prerequisite under the section summary. Both come from data that already existed but
 * was never shown: lesson estimates (summed) and `requires_section_id`. The time is an estimate,
 * so it is written as one ("~95 min"), never as a promise.
 */
function SectionFacts({
  section,
  sections,
  t,
}: {
  section: PathSection;
  sections: PathSection[];
  t: Awaited<ReturnType<typeof getTranslations<"path">>>;
}) {
  const minutes = section.is_published ? sectionMinutes(section) : 0;
  const required = section.requires_section_id
    ? sections.find((x) => x.id === section.requires_section_id)
    : undefined;
  if (!minutes && !required) return null;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const time =
    hours === 0
      ? t("sectionTime.minutes", { minutes })
      : rest === 0
        ? t("sectionTime.hours", { hours })
        : t("sectionTime.hoursMinutes", { hours, minutes: rest });
  return (
    <p className="text-muted flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-xs">
      {minutes ? (
        <span className="inline-flex items-center gap-1">
          <Clock aria-hidden="true" className="size-3.5 shrink-0" />
          {time}
        </span>
      ) : null}
      {required ? (
        <span>{t("requires", { number: required.number, title: required.title })}</span>
      ) : null}
    </p>
  );
}
