import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { limits } from "@/config/limits";
import { cn } from "@/lib/utils/cn";

export async function generateMetadata() {
  const t = await getTranslations("howItWorks");
  return { title: t("title") };
}

/** Product walkthrough; numbers come from src/config/limits so the page never drifts from behavior. */
export default async function HowItWorksPage() {
  const t = await getTranslations("howItWorks");
  const steps = ["signin", "learn", "run", "submit", "hints", "progress", "certify"] as const;
  return (
    <div className="container-page max-w-3xl space-y-10 py-12">
      <header className="space-y-3">
        <h1 className="text-4xl">{t("title")}</h1>
        <p className="text-muted max-w-prose text-lg">{t("intro")}</p>
      </header>

      <ol className="space-y-4">
        {steps.map((key, i) => (
          <li key={key}>
            <Card className="flex gap-4">
              <span
                aria-hidden="true"
                className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-full font-semibold"
              >
                {i + 1}
              </span>
              <div>
                <h2 className="text-lg font-semibold">{t(`steps.${key}.title`)}</h2>
                <p className="text-muted mt-1">
                  {t(`steps.${key}.body`, {
                    free: limits.freeExerciseLimit,
                    hints: limits.hints.levels,
                    pass: limits.rewards.quizPassThresholdPercent,
                    timeout: Math.round(limits.sandbox.hardTimeoutMs / 1000),
                  })}
                </p>
              </div>
            </Card>
          </li>
        ))}
      </ol>

      <section className="space-y-3" aria-labelledby="seguridad">
        <h2 id="seguridad" className="text-2xl">
          {t("safety.title")}
        </h2>
        <p className="text-muted">{t("safety.body")}</p>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link href="/demo" className={cn(buttonVariants({ variant: "secondary" }))}>
          {t("ctaDemo")}
        </Link>
        <Link href="/ingresar" className={cn(buttonVariants())}>
          {t("ctaStart")}
          <ArrowRight aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
