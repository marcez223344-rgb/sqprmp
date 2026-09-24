import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Award, RefreshCw } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { LearningPath } from "@/components/learn/learning-path";
import { Meter } from "@/components/progress/stat-tile";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { hasActiveEntitlement } from "@/lib/auth/entitlements";
import { requireOnboardedProfile } from "@/lib/auth/session";
import { summarizePath } from "@/lib/curriculum/path-summary";
import { getLearningPath } from "@/lib/curriculum/queries";
import { cn } from "@/lib/utils/cn";

export async function generateMetadata() {
  const t = await getTranslations("path");
  return { title: t("title") };
}

export default async function PathPage() {
  const profile = await requireOnboardedProfile("/ruta");
  // The padlocks are drawn from the same answer the server gate gives, never from `is_free` alone.
  const [sections, t, hasAccess] = await Promise.all([
    getLearningPath(profile.id),
    getTranslations("path"),
    hasActiveEntitlement(profile),
  ]);
  const summary = summarizePath(sections, hasAccess);
  const hasStarted = sections.some((s) => s.lessons.some((l) => l.status !== "not_started"));
  const progressText = t("summary.progress", {
    done: summary.completedLessons,
    total: summary.lessons,
    percent: summary.percent,
  });
  const hours = Math.round(summary.minutes / 60);

  return (
    <div className="container-page max-w-4xl space-y-8 py-10">
      <header className="space-y-2">
        <h1 className="text-3xl">{t("title")}</h1>
        <p className="text-muted">{t("intro")}</p>
      </header>

      {/* The next step and the whole-course numbers in one place, above the syllabus: the page used
          to open straight into 39 section cards with no button to click. */}
      <Card className="space-y-5">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">{t("summary.title")}</h2>
          <Meter
            tone="primary"
            percent={summary.percent}
            label={t("summary.title")}
            valueText={progressText}
          />
          <p className="text-muted text-sm">{progressText}</p>
          {summary.nextCertificate ? (
            <p className="text-muted inline-flex items-center gap-1.5 text-sm">
              <Award aria-hidden="true" className="text-accent-ink size-4 shrink-0" />
              {t("summary.nextCertificate", {
                number: summary.nextCertificate.sectionNumber,
                title: summary.nextCertificate.sectionTitle,
              })}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          {summary.next ? (
            <div className="min-w-0 space-y-1">
              <Link
                href={`/leccion/${summary.next.lessonSlug}`}
                className={cn(
                  buttonVariants(),
                  "h-auto min-h-10 w-fit text-left whitespace-normal",
                )}
              >
                {t(hasStarted ? "summary.continue" : "summary.start", {
                  title: summary.next.lessonTitle,
                })}
                <ArrowRight aria-hidden="true" />
              </Link>
              <p className="text-muted text-xs">
                {t("sectionNumber", { number: summary.next.sectionNumber })} ·{" "}
                {summary.next.sectionTitle}
              </p>
            </div>
          ) : (
            <p className="text-sm font-medium">{t("summary.allDone")}</p>
          )}
          <Link
            href="/repaso"
            className="text-primary inline-flex items-center gap-1.5 text-sm underline underline-offset-4"
          >
            <RefreshCw aria-hidden="true" className="size-4" />
            {t("summary.review")}
          </Link>
        </div>

        <dl className="border-border grid grid-cols-2 gap-x-6 gap-y-3 border-t pt-4 text-sm sm:grid-cols-5">
          <Fact
            label={t("summary.facts.sections")}
            value={t("summary.facts.sectionsValue", {
              published: summary.sectionsPublished,
              total: summary.sectionsTotal,
            })}
          />
          <Fact label={t("summary.facts.lessons")} value={summary.lessons} />
          <Fact label={t("summary.facts.exercises")} value={summary.exercises} />
          <Fact label={t("summary.facts.certificates")} value={summary.certificates} />
          {/* Under half an hour of published content rounds to zero: no fact beats a false one. */}
          {hours > 0 ? (
            <Fact label={t("summary.facts.time")} value={t("summary.facts.timeValue", { hours })} />
          ) : null}
        </dl>
      </Card>

      <LearningPath sections={sections} mode="learner" hasAccess={hasAccess} />
    </div>
  );
}

function Fact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-muted text-xs">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}
