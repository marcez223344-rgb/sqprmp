import Link from "next/link";
import { notFound } from "next/navigation";
import { Lock, Unlock } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { track } from "@/lib/analytics/track";
import { DatasetBadge } from "@/components/datasets/dataset-badge";
import { ExerciseWorkspace } from "@/components/workspace/exercise-workspace";
import { LockedWorkspace } from "@/components/workspace/locked-workspace";
import { hasActiveEntitlement } from "@/lib/auth/entitlements";
import { requireOnboardedProfile } from "@/lib/auth/session";
import { ensureExerciseStarted, getExerciseWorkspace } from "@/lib/exercises/service";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({ params }: PageProps<"/ejercicio/[slug]">) {
  const { slug } = await params;
  // The tab said "Ejercicio · catalogo-de-categorias"; a learner with several tabs open reads the
  // slug, not the exercise. Fall back to the generic word rather than to the slug.
  const supabase = await createClient();
  const { data } = await supabase
    .from("exercises_public")
    .select("title")
    .eq("slug", slug)
    .maybeSingle();
  return { title: data?.title ?? "Ejercicio" };
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
  // A learner who paid has no allowance to report; showing a count to them is noise.
  const entitled = await hasActiveEntitlement(profile);
  // A locked exercise means the allowance is spent; an unopened one is about to spend a slot.
  const usedSlots = Math.min(
    data.access === "locked" ? data.freeLimit : data.freeUsed + (data.progress ? 0 : 1),
    data.freeLimit,
  );
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
        {/* Two regimes coexist (limits.ts): exercises in the free sections never consume the
            allowance, gated ones do. The badge used to show only a bare count, which made a
            learner with nine finished exercises think the limit was broken. */}
        {data.gated && !entitled ? (
          <div className="space-y-1 text-right">
            <p className="border-border bg-surface-2 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium">
              <Lock aria-hidden="true" className="size-3.5" />
              {t("regime.countedBadge", { used: usedSlots, limit: data.freeLimit })}
            </p>
            <p className="text-muted max-w-xs text-xs">{t("regime.countedDetail")}</p>
          </div>
        ) : !data.gated ? (
          <div className="space-y-1 text-right">
            <p className="border-success/40 bg-success/10 text-success-ink inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium">
              <Unlock aria-hidden="true" className="size-3.5" />
              {t("regime.freeBadge")}
            </p>
            <p className="text-muted max-w-xs text-xs">{t("regime.freeDetail")}</p>
          </div>
        ) : null}
      </header>

      {data.access === "locked" ? (
        <LockedWorkspace
          scenarioMd={data.exercise.scenario_md ?? ""}
          businessQuestionMd={data.exercise.business_question_md ?? ""}
          freeLimit={data.freeLimit}
        />
      ) : (
        <ExerciseWorkspace data={data} userId={profile.id} />
      )}
    </div>
  );
}
