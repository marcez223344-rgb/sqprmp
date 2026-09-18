import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { limits } from "@/config/limits";
import { requireOnboardedProfile } from "@/lib/auth/session";
import { cn } from "@/lib/utils/cn";

export async function generateMetadata() {
  const t = await getTranslations("app");
  return { title: t("nav.dashboard") };
}

/**
 * Dashboard shell. Progress, streaks, goals and continue-card get real data in Phase 5;
 * the curriculum entry point arrives in Phase 3. Everything shown here is honest about that.
 */
export default async function DashboardPage() {
  const profile = await requireOnboardedProfile("/aprender");
  const t = await getTranslations("dashboard");
  const tc = await getTranslations("common");

  return (
    <div className="container-page space-y-8 py-10">
      <header className="space-y-1">
        <h1 className="text-3xl">
          {t("welcome", { name: profile.display_name ?? `@${profile.alias}` })}
        </h1>
        <p className="text-muted">
          {t("weeklyGoal", { minutes: profile.weekly_goal_minutes ?? 0 })}
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="space-y-3 md:col-span-2">
          <p className="text-accent text-sm font-semibold tracking-wide uppercase">
            {tc("comingSoon")}
          </p>
          <h2 className="text-xl">{t("continue.title")}</h2>
          <p className="text-muted">{t("continue.body", { count: limits.freeExerciseLimit })}</p>
          <Link href="/ruta" className={cn(buttonVariants({ variant: "secondary" }), "w-fit")}>
            {t("continue.cta")}
            <ArrowRight aria-hidden="true" />
          </Link>
        </Card>
        <Card className="space-y-2">
          <h2 className="text-lg">{t("stats.title")}</h2>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-muted">{t("stats.xp")}</dt>
              <dd className="font-heading text-2xl font-bold">0</dd>
            </div>
            <div>
              <dt className="text-muted">{t("stats.streak")}</dt>
              <dd className="font-heading text-2xl font-bold">0</dd>
            </div>
          </dl>
          <p className="text-muted text-xs">{t("stats.note")}</p>
        </Card>
      </div>
    </div>
  );
}
