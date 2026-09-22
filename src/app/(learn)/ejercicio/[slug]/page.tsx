import Link from "next/link";
import { notFound } from "next/navigation";
import { Lock } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { track } from "@/lib/analytics/track";
import { DatasetBadge } from "@/components/datasets/dataset-badge";
import { ExerciseWorkspace } from "@/components/workspace/exercise-workspace";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { requireOnboardedProfile } from "@/lib/auth/session";
import { ensureExerciseStarted, getExerciseWorkspace } from "@/lib/exercises/service";
import { cn } from "@/lib/utils/cn";

export async function generateMetadata({ params }: PageProps<"/ejercicio/[slug]">) {
  const { slug } = await params;
  return { title: `Ejercicio · ${slug}` };
}

export default async function ExercisePage({ params }: PageProps<"/ejercicio/[slug]">) {
  const { slug } = await params;
  const profile = await requireOnboardedProfile(`/ejercicio/${slug}`);
  const data = await getExerciseWorkspace(slug, profile);
  if (!data || data.access === "unavailable") notFound();
  const t = await getTranslations("workspace");

  if (data.access === "ok" && !data.progress) {
    // Opening a gated exercise consumes one free slot (D-01); recorded server-side, idempotent.
    await ensureExerciseStarted(profile, data.exercise.id);
  }

  const difficulty = data.exercise.difficulty ?? "easy";
  if (data.access === "locked")
    await track(
      "paywall_viewed",
      { trigger: "limit_reached", exercise_slug: data.exercise.slug },
      { userId: profile.id },
    );

  return (
    <div className="container-page space-y-6 py-8">
      <nav aria-label={t("breadcrumb")} className="text-muted text-sm">
        <Link href="/ruta" className="hover:text-text">
          {t("path")}
        </Link>
        <span aria-hidden="true"> / </span>
        <span>
          {t("sectionNumber", { number: data.section.number })} · {data.section.title}
        </span>
      </nav>

      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-2">
          <p className="text-muted text-xs font-semibold tracking-wide uppercase">
            {t("difficulty.label")}: {t(`difficulty.${difficulty}` as never)} ·{" "}
            {t("minutes", { minutes: data.exercise.estimated_minutes ?? 0 })}
          </p>
          <h1 className="text-3xl">{data.exercise.title}</h1>
          <DatasetBadge slug={data.dataset.slug} title={data.dataset.title} />
        </div>
        {/* The counter is only true for gated exercises; on a free one it wrongly suggested the
            learner was spending an allowance. */}
        {data.access === "ok" && !data.gated ? (
          <p className="border-success/40 bg-success/10 text-success-ink rounded-full border px-3 py-1 text-xs font-medium">
            {t("freeExercise")}
          </p>
        ) : data.access === "ok" &&
          data.gated &&
          data.freeLimit > 0 &&
          !profile.role.includes("admin") ? (
          <p className="text-muted text-xs">
            {t("freeCounter", {
              used: Math.min(data.freeUsed + (data.progress ? 0 : 1), data.freeLimit),
              limit: data.freeLimit,
            })}
          </p>
        ) : null}
      </header>

      {data.access === "locked" ? (
        <Card className="space-y-3">
          <p className="inline-flex items-center gap-2 text-sm font-semibold">
            <Lock aria-hidden="true" className="size-4" />
            {t("locked.title")}
          </p>
          <p className="text-muted">{t("locked.body", { limit: data.freeLimit })}</p>
          <Link href="/precios" className={cn(buttonVariants(), "w-fit")}>
            {t("locked.cta")}
          </Link>
        </Card>
      ) : (
        <ExerciseWorkspace data={data} />
      )}
    </div>
  );
}
