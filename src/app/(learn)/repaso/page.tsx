import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { QuizRunner } from "@/components/quiz/quiz-runner";
import { buttonVariants } from "@/components/ui/button";
import { requireOnboardedProfile } from "@/lib/auth/session";
import { track } from "@/lib/analytics/track";
import { getReviewQuestions } from "@/lib/quizzes/service";
import { cn } from "@/lib/utils/cn";

export async function generateMetadata() {
  const t = await getTranslations("review");
  return { title: t("title") };
}

export default async function ReviewPage() {
  const profile = await requireOnboardedProfile("/repaso");
  const [questions, t] = await Promise.all([
    getReviewQuestions(profile),
    getTranslations("review"),
  ]);
  await track(
    "review_session_started",
    { question_count: questions.length },
    { userId: profile.id },
  );
  return (
    <div className="container-page max-w-3xl space-y-6 py-10">
      <header className="space-y-1">
        <h1 className="text-3xl">{t("title")}</h1>
        <p className="text-muted">{t("subtitle")}</p>
      </header>
      {questions.length === 0 ? (
        <div className="border-border bg-surface space-y-3 rounded-lg border p-5">
          <p className="text-muted">{t("empty")}</p>
          <Link href="/ruta" className={cn(buttonVariants({ variant: "secondary" }), "w-fit")}>
            {t("backToPath")}
          </Link>
        </div>
      ) : (
        <>
          <p className="text-sm font-medium">{t("count", { count: questions.length })}</p>
          <QuizRunner questions={questions} mode="review" nextHref="/ruta" />
        </>
      )}
    </div>
  );
}
