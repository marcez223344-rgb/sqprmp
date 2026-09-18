import Link from "next/link";
import {
  Award,
  BookOpen,
  CheckCircle2,
  CircleDashed,
  Lock,
  ListChecks,
  PlayCircle,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { LEVEL_ORDER, type PathSection } from "@/lib/curriculum/queries";
import { cn } from "@/lib/utils/cn";

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

  return (
    <div className="space-y-12">
      {byLevel.map((group) => (
        <section key={group.level} aria-labelledby={`nivel-${group.level}`}>
          <h2 id={`nivel-${group.level}`} className="mb-4 text-2xl">
            {t(`levels.${group.level}`)}
          </h2>
          <ol className="space-y-4">
            {group.sections.map((s) => {
              const total = s.lessons.filter((l) => l.is_published).length;
              const state = !s.is_published
                ? "soon"
                : total > 0 && s.completed_lessons === total
                  ? "completed"
                  : s.completed_lessons > 0
                    ? "in_progress"
                    : "available";
              const StateIcon =
                state === "completed"
                  ? CheckCircle2
                  : state === "in_progress"
                    ? PlayCircle
                    : state === "soon"
                      ? CircleDashed
                      : BookOpen;
              return (
                <li
                  key={s.id}
                  className={cn(
                    "border-border bg-surface rounded-lg border p-5",
                    state === "soon" && "opacity-80",
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-muted text-xs font-semibold tracking-wide uppercase">
                        {t("sectionNumber", { number: s.number })}
                        {s.is_free_theory ? ` · ${t("freeTheory")}` : ""}
                      </p>
                      <h3 className="text-lg">{s.title}</h3>
                      <p className="text-muted max-w-prose text-sm">{s.summary}</p>
                    </div>
                    <span className="border-border inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs">
                      <StateIcon aria-hidden="true" className="size-4" />
                      {t(`state.${state}`)}
                      {mode === "learner" && state !== "soon" && total > 0
                        ? ` · ${s.completed_lessons}/${total}`
                        : ""}
                    </span>
                  </div>

                  {s.certificate_slug ? (
                    <p className="text-muted mt-3 inline-flex items-center gap-1.5 text-xs">
                      <Award aria-hidden="true" className="size-4" />
                      {t("certificateMilestone")}
                    </p>
                  ) : null}

                  {s.is_published && s.lessons.length ? (
                    <ul className="divide-border border-border mt-4 divide-y rounded-md border">
                      {s.lessons.map((l) => {
                        const Icon =
                          l.kind === "quiz"
                            ? ListChecks
                            : l.kind === "exercise"
                              ? PlayCircle
                              : BookOpen;
                        const locked = mode === "public" || !l.is_published;
                        const inner = (
                          <span className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                            <span className="flex items-center gap-2">
                              <Icon aria-hidden="true" className="text-muted size-4" />
                              <span>{l.title}</span>
                              {!l.is_free ? (
                                <Lock aria-hidden="true" className="text-muted size-3.5" />
                              ) : null}
                            </span>
                            <span className="text-muted flex items-center gap-3 text-xs">
                              <span>{t("minutes", { minutes: l.estimated_minutes })}</span>
                              {mode === "learner" ? (
                                <span className="inline-flex items-center gap-1">
                                  {l.status === "completed" ? (
                                    <CheckCircle2
                                      aria-hidden="true"
                                      className="text-success size-4"
                                    />
                                  ) : null}
                                  {t(`lessonStatus.${l.status}`)}
                                </span>
                              ) : null}
                            </span>
                          </span>
                        );
                        return (
                          <li key={l.id}>
                            {locked ? (
                              <div aria-disabled="true">{inner}</div>
                            ) : (
                              <Link
                                href={`/leccion/${l.slug}`}
                                className="hover:bg-surface-2 block rounded-md"
                              >
                                {inner}
                              </Link>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}
