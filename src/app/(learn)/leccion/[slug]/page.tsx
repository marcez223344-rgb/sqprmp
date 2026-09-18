import type { Route } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, ListChecks, Lock } from "lucide-react";
import { getTranslations } from "next-intl/server";
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
    await recordLessonView(lesson.slug);
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

      <header className="space-y-2">
        <p className="text-muted text-xs font-semibold tracking-wide uppercase">
          {t(`kind.${lesson.kind ?? "theory"}`)} ·{" "}
          {t("minutes", { minutes: lesson.estimated_minutes ?? 0 })}
        </p>
        <h1 className="text-3xl">{lesson.title}</h1>
      </header>

      {access === "locked" ? (
        <Card className="space-y-3">
          <p className="inline-flex items-center gap-2 text-sm font-semibold">
            <Lock aria-hidden="true" className="size-4" />
            {t("locked.title")}
          </p>
          <p className="text-muted">{t("locked.body")}</p>
          <Link href="/precios" className={cn(buttonVariants(), "w-fit")}>
            {t("locked.cta")}
          </Link>
        </Card>
      ) : lesson.kind === "quiz" && quiz ? (
        <section className="space-y-4" aria-labelledby="quiz-heading">
          <p id="quiz-heading" className="inline-flex items-center gap-2 text-sm font-semibold">
            <ListChecks aria-hidden="true" className="size-4" />
            {t("quiz.title", { count: questionCount })}
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
