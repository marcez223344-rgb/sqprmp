import Link from "next/link";
import {
  ArrowRight,
  Award,
  Coins,
  Flame,
  Gauge,
  RefreshCw,
  Snowflake,
  Star,
  Target,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { GoalsForm } from "@/components/progress/goals-form";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { requireOnboardedProfile } from "@/lib/auth/session";
import { getDashboard } from "@/lib/progress/queries";
import { cn } from "@/lib/utils/cn";

export async function generateMetadata() {
  const t = await getTranslations("app");
  return { title: t("nav.dashboard") };
}

export default async function DashboardPage() {
  const profile = await requireOnboardedProfile("/aprender");
  const [d, t] = await Promise.all([getDashboard(profile), getTranslations("dashboard")]);
  const earnedBadges = d.badges.filter((b) => b.earned_at);

  return (
    <div className="container-page space-y-8 py-10">
      <header className="space-y-1">
        <h1 className="text-3xl">
          {t("welcome", { name: profile.display_name ?? `@${profile.alias}` })}
        </h1>
        <p className="text-muted">{t("subtitle", { level: d.level.level })}</p>
      </header>

      {/* Four numbers the learner checks every visit, before anything else on the page. */}
      <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { key: "level", value: d.level.level, Icon: Gauge },
          { key: "xp", value: d.xpTotal, Icon: Star },
          { key: "coins", value: d.coins, Icon: Coins },
          { key: "streakDays", value: d.streak.length, Icon: Flame },
        ].map(({ key, value, Icon }) => (
          <div key={key} className="border-border bg-surface rounded-lg border p-4">
            <dt className="text-muted inline-flex items-center gap-2 text-sm">
              <Icon aria-hidden="true" className="text-primary size-4" />
              {t(`tiles.${key}`)}
            </dt>
            <dd className="font-heading mt-1 text-3xl font-bold">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Continue */}
        <Card className="space-y-3 md:col-span-2">
          <h2 className="text-xl">{t("continue.title")}</h2>
          {d.continueTarget ? (
            <>
              <p className="text-muted">
                {d.continueTarget.sectionTitle} · {d.continueTarget.title}
              </p>
              <Link
                href={
                  d.continueTarget.kind === "exercise"
                    ? `/ejercicio/${d.continueTarget.slug}`
                    : `/leccion/${d.continueTarget.slug}`
                }
                className={cn(buttonVariants(), "w-fit")}
              >
                {t("continue.cta")}
                <ArrowRight aria-hidden="true" />
              </Link>
            </>
          ) : (
            <>
              <p className="text-muted">{t("continue.empty")}</p>
              <Link href="/ruta" className={cn(buttonVariants(), "w-fit")}>
                {t("continue.start")}
                <ArrowRight aria-hidden="true" />
              </Link>
            </>
          )}
          {d.freeLimit > 0 && profile.role !== "admin" ? (
            <p className="text-muted text-xs">
              {t("freeCounter", { used: d.freeUsed, limit: d.freeLimit })}
            </p>
          ) : null}
        </Card>

        {/* Review is a finished feature that nobody found behind a nav link. */}
        <Card className="space-y-3">
          <h2 className="inline-flex items-center gap-2 text-lg">
            <RefreshCw aria-hidden="true" className="text-info size-5" />
            {t("review.title")}
          </h2>
          <p className="text-muted text-sm">{t("review.body")}</p>
          <Link href="/repaso" className={cn(buttonVariants({ variant: "secondary" }), "w-fit")}>
            {t("review.cta")}
            <ArrowRight aria-hidden="true" />
          </Link>
        </Card>

        {/* Level + XP */}
        <Card className="space-y-3">
          <h2 className="text-lg">{t("stats.title")}</h2>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-muted">{t("stats.level")}</dt>
              <dd className="font-heading text-2xl font-bold">{d.level.level}</dd>
            </div>
            <div>
              <dt className="text-muted">{t("stats.xp")}</dt>
              <dd className="font-heading text-2xl font-bold">{d.xpTotal}</dd>
            </div>
            <div>
              <dt className="text-muted">{t("stats.coins")}</dt>
              <dd className="font-heading text-2xl font-bold">{d.coins}</dd>
            </div>
            <div>
              <dt className="text-muted">{t("stats.exercises")}</dt>
              <dd className="font-heading text-2xl font-bold">{d.exercisesCompleted}</dd>
            </div>
          </dl>
          <div>
            <div className="text-muted mb-1 flex justify-between text-xs">
              <span>{t("stats.nextLevel", { level: d.level.level + 1 })}</span>
              <span>
                {d.level.current}/{d.level.needed} XP
              </span>
            </div>
            <div
              className="bg-surface-2 h-2 rounded-full"
              role="progressbar"
              aria-valuenow={d.level.percent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={t("stats.levelProgress")}
            >
              <div
                className="bg-primary h-2 rounded-full"
                style={{ width: `${d.level.percent}%` }}
              />
            </div>
          </div>
        </Card>

        {/* Streak */}
        <Card className="space-y-2">
          <h2 className="inline-flex items-center gap-2 text-lg">
            <Flame aria-hidden="true" className="text-accent size-5" />
            {t("streak.title")}
          </h2>
          <p className="font-heading text-3xl font-bold">
            {t("streak.days", { days: d.streak.length })}
          </p>
          <p className="text-muted text-sm">
            {d.streak.activeToday
              ? t("streak.activeToday")
              : d.streak.protectedByFreeze
                ? t("streak.protected")
                : d.streak.atRisk
                  ? t("streak.atRisk")
                  : t("streak.start")}
          </p>
          <p className="text-muted inline-flex items-center gap-1 text-xs">
            <Snowflake aria-hidden="true" className="size-3.5" />
            {t("streak.freezes", { count: d.streak.freezesAvailable })} ·{" "}
            {t("streak.longest", { days: d.streak.longest })}
          </p>
        </Card>

        {/* Goals */}
        <Card className="space-y-3">
          <h2 className="inline-flex items-center gap-2 text-lg">
            <Target aria-hidden="true" className="text-primary size-5" />
            {t("goals.title")}
          </h2>
          <Goal label={t("goals.daily")} value={d.today.xp} target={d.today.target} unit="XP" />
          <Goal
            label={t("goals.weekly")}
            value={d.week.minutes}
            target={d.week.target}
            unit="min"
          />
          <GoalsForm goals={d.goals} />
        </Card>

        {/* Badges */}
        <Card className="space-y-3">
          <h2 className="inline-flex items-center gap-2 text-lg">
            <Award aria-hidden="true" className="text-warning size-5" />
            {t("badges.title")}
          </h2>
          <p className="text-muted text-sm">
            {t("badges.count", { earned: earnedBadges.length, total: d.badges.length })}
          </p>
          <ul className="flex flex-wrap gap-2">
            {earnedBadges.slice(0, 6).map((b) => (
              <li
                key={b.slug}
                className="border-border bg-surface-2 rounded-full border px-3 py-1 text-xs"
                title={b.description}
              >
                {b.title}
              </li>
            ))}
            {earnedBadges.length === 0 ? (
              <li className="text-muted text-xs">{t("badges.none")}</li>
            ) : null}
          </ul>
          <Link href="/logros" className="text-primary text-sm underline underline-offset-4">
            {t("badges.all")}
          </Link>
        </Card>
      </div>

      {/* Mastery */}
      <Card>
        <h2 className="mb-4 text-xl">{t("mastery.title")}</h2>
        {d.mastery.length === 0 ? (
          <p className="text-muted text-sm">{t("mastery.empty")}</p>
        ) : (
          <ul className="space-y-3">
            {d.mastery.map((m) => {
              const pct = Math.round((m.completed / m.total) * 100);
              return (
                <li key={m.sectionSlug}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>
                      {m.number}. {m.sectionTitle}
                    </span>
                    <span className="text-muted">
                      {m.completed}/{m.total} · {pct}%
                    </span>
                  </div>
                  <div
                    className="bg-surface-2 h-2 rounded-full"
                    role="progressbar"
                    aria-valuenow={pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={m.sectionTitle}
                  >
                    <div className="bg-success h-2 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <nav aria-label={t("links.label")} className="flex flex-wrap gap-4 text-sm">
        <Link href="/historial" className="text-primary underline underline-offset-4">
          {t("links.history")}
        </Link>
        <Link href="/consultas" className="text-primary underline underline-offset-4">
          {t("links.savedQueries")}
        </Link>
        <Link href="/logros" className="text-primary underline underline-offset-4">
          {t("links.badges")}
        </Link>
      </nav>
    </div>
  );
}

function Goal({
  label,
  value,
  target,
  unit,
}: {
  label: string;
  value: number;
  target: number;
  unit: string;
}) {
  const pct = Math.min(100, Math.round((value / Math.max(target, 1)) * 100));
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span>{label}</span>
        <span className="text-muted">
          {value}/{target} {unit}
        </span>
      </div>
      <div
        className="bg-surface-2 h-2 rounded-full"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div className="bg-accent h-2 rounded-full" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
