import type { Route } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  ListChecks,
  Lock,
  SquareTerminal,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { limits } from "@/config/limits";
import { CompleteLessonButton } from "@/components/learn/complete-lesson-button";
import { Markdown } from "@/components/learn/markdown";
import { QuizRunner } from "@/components/quiz/quiz-runner";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { canReadLesson } from "@/lib/auth/entitlements";
import { requireOnboardedProfile } from "@/lib/auth/session";
import { getLessonBySlug, getPremiumLessonBody } from "@/lib/curriculum/queries";
import { recordLessonView } from "@/lib/curriculum/progress";
import { getQuiz } from "@/lib/quizzes/service";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils/cn";

// Lesson kind gets a small marker so the path list and the lesson page agree visually
// (docs/DESIGN_SYSTEM.md §6).
const KIND_ICON: Record<string, LucideIcon> = {
  theory: BookOpen,
  exercise: SquareTerminal,
  quiz: ListChecks,
  challenge: Trophy,
};

export async function generateMetadata({ params }: PageProps<"/leccion/[slug]">) {
  const { slug } = await params;
  const detail = await getLessonBySlug(slug);
  return { title: detail?.lesson.title ?? "Lección" };
}

export default async function LessonPage({ params }: PageProps<"/leccion/[slug]">) {
  const { slug } = await params;
  const profile = await requireOnboardedProfile(`/leccion/${slug}`);
  const detail = await getLessonBySlug(slug);
  if (!detail) notFound();
  const { lesson, section, siblings, questionCount } = detail;
  const t = await getTranslations("lesson");
  const KindIcon = KIND_ICON[lesson.kind ?? "theory"] ?? BookOpen;

  // Exercise lessons live in the workspace; access is decided there (count-based free limit).
  if ((lesson.kind === "exercise" || lesson.kind === "challenge") && lesson.ref_slug) {
    redirect(`/ejercicio/${lesson.ref_slug}`);
  }

  const access = await canReadLesson(profile, lesson);
  if (access === "unavailable") notFound();

  const index = siblings.findIndex((l) => l.slug === lesson.slug);
  const prev = index > 0 ? siblings[index - 1] : undefined;
  const next = index >= 0 && index < siblings.length - 1 ? siblings[index + 1] : undefined;

  let body: string | null = null;
  let status: "not_started" | "in_progress" | "completed" = "not_started";
  if (access === "ok") {
    body = lesson.is_free ? lesson.body_md_free : await getPremiumLessonBody(lesson.id);
    // Viewing records progress (idempotent); completion is an explicit learner action.
    await recordLessonView(lesson.slug, lesson.kind ?? "theory", profile.id);
    const supabase = await createClient();
    const { data: progress } = await supabase
      .from("lesson_progress")
      .select("status")
      .eq("user_id", profile.id)
      .eq("lesson_id", lesson.id)
      .maybeSingle();
    if (progress?.status === "completed") status = "completed";
    else status = "in_progress";
  }
  const quiz =
    access === "ok" && lesson.kind === "quiz" ? await getQuiz(profile, lesson.slug) : null;

  return (
    <div className="container-page max-w-3xl space-y-8 py-10">
      <nav aria-label={t("breadcrumb")} className="text-muted text-sm">
        <Link href="/ruta" className="hover:text-text">
          {t("path")}
        </Link>
        <span aria-hidden="true"> / </span>
        <span>
          {t("sectionNumber", { number: section.number })} · {section.title}
        </span>
      </nav>

      <header className="space-y-3">
        <p className="border-border bg-surface-2 text-muted inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold tracking-wide uppercase">
          <KindIcon aria-hidden="true" className="text-primary size-4" />
          {t(`kind.${lesson.kind ?? "theory"}`)}
          <span aria-hidden="true">·</span>
          {t("minutes", { minutes: lesson.estimated_minutes ?? 0 })}
        </p>
        <h1 className="text-3xl">{lesson.title}</h1>
      </header>

      {access === "locked" ? (
        /* Same paywall shape as the workspace: the thin card did not say what had happened. */
        <section
          aria-labelledby="paywall-title"
          className="border-primary/40 bg-primary/5 space-y-4 rounded-lg border-2 p-6"
        >
          <p className="text-primary inline-flex items-center gap-2 text-xs font-semibold tracking-wide uppercase">
            <Lock aria-hidden="true" className="size-4" />
            {t("locked.eyebrow")}
          </p>
          <h2 id="paywall-title" className="text-2xl">
            {t("locked.title")}
          </h2>
          <p className="max-w-prose">{t("locked.body")}</p>
          <p className="text-muted max-w-prose text-sm">{t("locked.freeSections")}</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/precios" className={cn(buttonVariants())}>
              {t("locked.cta")}
            </Link>
            <Link href="/ruta" className={cn(buttonVariants({ variant: "ghost" }))}>
              {t("locked.secondaryCta")}
            </Link>
          </div>
        </section>
      ) : lesson.kind === "quiz" && quiz ? (
        <section className="space-y-4" aria-labelledby="quiz-heading">
          <p id="quiz-heading" className="inline-flex items-center gap-2 text-sm font-semibold">
            <ListChecks aria-hidden="true" className="size-4" />
            {t("quiz.title", { count: Math.min(limits.quiz.questionsPerAttempt, questionCount) })}
          </p>
          <p className="text-muted text-sm">
            {t("quiz.intro", { percent: quiz.passThresholdPercent })}
            {quiz.lastAttempt
              ? " " +
                t("quiz.lastAttempt", {
                  score: quiz.lastAttempt.score,
                  total: quiz.lastAttempt.total,
                })
              : ""}
          </p>
          <QuizRunner
            questions={quiz.questions}
            mode="quiz"
            lessonSlug={lesson.slug}
            passThresholdPercent={quiz.passThresholdPercent}
            nextHref={next ? (`/leccion/${next.slug}` as Route) : "/ruta"}
          />
        </section>
      ) : lesson.kind === "quiz" ? (
        <Card>
          <p className="text-muted">{t("quiz.empty")}</p>
        </Card>
      ) : lesson.kind === "theory" && body ? (
        <article>
          <Markdown>{body}</Markdown>
        </article>
      ) : (
        <Card>
          <p className="text-muted">{t("exercise.soon")}</p>
        </Card>
      )}

      {access === "ok" && lesson.kind === "theory" ? (
        <CompleteLessonButton slug={lesson.slug} completed={status === "completed"} />
      ) : null}

      <nav
        aria-label={t("pagination")}
        className="border-border flex flex-wrap items-center justify-between gap-3 border-t pt-6"
      >
        {prev ? (
          <Link href={`/leccion/${prev.slug}`} className={cn(buttonVariants({ variant: "ghost" }))}>
            <ArrowLeft aria-hidden="true" />
            {prev.title}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            href={`/leccion/${next.slug}`}
            className={cn(buttonVariants({ variant: "secondary" }))}
          >
            {next.title}
            <ArrowRight aria-hidden="true" />
          </Link>
        ) : (
          <Link href="/ruta" className={cn(buttonVariants({ variant: "secondary" }))}>
            {t("backToPath")}
          </Link>
        )}
      </nav>
    </div>
  );
}
