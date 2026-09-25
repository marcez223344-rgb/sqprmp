import Link from "next/link";
import {
  ArrowRight,
  Award,
  CircleCheck,
  Coins,
  Flame,
  Gauge,
  Lock,
  RefreshCw,
  ShieldCheck,
  SquareTerminal,
  Star,
  Target,
} from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import { badgeCardClasses, badgeContainerClasses } from "@/components/progress/badge-styles";
import { GoalsForm } from "@/components/progress/goals-form";
import { Meter, StatTile } from "@/components/progress/stat-tile";
import { XpExplainer } from "@/components/progress/xp-explainer";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { buttonVariants } from "@/components/ui/button";
import { getBadgeVisual } from "@/config/badges";
import { limits } from "@/config/limits";
import { hasActiveEntitlement } from "@/lib/auth/entitlements";
import { requireOnboardedProfile } from "@/lib/auth/session";
import { publishedLessons } from "@/lib/curriculum/path-summary";
import { getLearningPath } from "@/lib/curriculum/queries";
import { getDashboard } from "@/lib/progress/queries";
import { cn } from "@/lib/utils/cn";

/**
 * Badges previewed on the dashboard: enough to show the latest ones earned and what comes next,
 * few enough that the card stays a preview of /logros rather than a copy of it.
 */
const BADGE_PREVIEW_COUNT = 6;

export async function generateMetadata() {
  const t = await getTranslations("app");
  return { title: t("nav.dashboard") };
}

export default async function DashboardPage() {
  const profile = await requireOnboardedProfile("/aprender");
  const [d, t, format, path, entitled] = await Promise.all([
    getDashboard(profile),
    getTranslations("dashboard"),
    getFormatter(),
    getLearningPath(profile.id),
    // Decided on the server from the same check the exercise gate uses: a learner who paid, has a
    // scholarship or is an admin has no free allowance to track (owner feedback, round 6 item 5).
    hasActiveEntitlement(profile),
  ]);
  const earnedBadges = d.badges
    .filter((b) => b.earned_at)
    .sort((a, b) => (b.earned_at ?? "").localeCompare(a.earned_at ?? ""));
  // Latest earned first, then the next ones still ahead, so the card is never empty and a locked
  // badge is always stated as locked in words, not only by a paler colour.
  const previewBadges = [...earnedBadges, ...d.badges.filter((b) => !b.earned_at)].slice(
    0,
    BADGE_PREVIEW_COUNT,
  );
  // Built from the parts that actually have a value: a learner with no history used to see a
  // dangling "·" because the longest-streak half of the line was meaningless at zero.
  const streakFacts = [
    t("streak.protectionCount", { count: d.streak.freezesAvailable }),
    d.streak.longest > 0 ? t("streak.longest", { days: d.streak.longest }) : null,
  ].filter((part): part is string => Boolean(part));
  const xpToNextLevel = Math.max(d.level.needed - d.level.current, 0);
  // Same lesson counting as /ruta (published lessons only), so the two pages never disagree.
  const continueSection = d.continueTarget
    ? path.find((s) => s.slug === d.continueTarget?.sectionSlug)
    : undefined;
  const continueLessons = continueSection ? publishedLessons(continueSection.lessons) : [];
  const continueDone = continueLessons.filter((l) => l.status === "completed").length;
  const continuePercent = continueLessons.length
    ? Math.round((continueDone / continueLessons.length) * 100)
    : 0;
  const continueProgressText = continueSection
    ? t("continue.sectionProgress", {
        number: continueSection.number,
        done: continueDone,
        total: continueLessons.length,
        percent: continuePercent,
      })
    : "";

  return (
    <div className="container-page space-y-8 py-10">
      <header className="space-y-1">
        <h1 className="text-3xl">
          {t("welcome", { name: profile.display_name ?? `@${profile.alias}` })}
        </h1>
        <p className="text-muted">{t("subtitle", { level: d.level.level })}</p>
      </header>

      {/*
        The five numbers the learner checks every visit, and the only place they appear: level, XP
        and coins used to be printed here *and* in a stats card at the same weight, so nothing said
        which was the summary. A bare number does not motivate; the distance to the next threshold
        does, so each tile that has a real threshold carries it in words (and, where a threshold
        exists, a meter). Coins have no threshold and deliberately stay a plain number.
      */}
      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatTile
          label={t("tiles.level")}
          value={d.level.level}
          icon={Gauge}
          tone="achievement"
          meter={
            xpToNextLevel > 0 ? (
              <Meter
                tone="achievement"
                percent={d.level.percent}
                label={t("stats.levelProgress")}
                valueText={t("tiles.toNextLevel", {
                  xp: xpToNextLevel,
                  level: d.level.level + 1,
                })}
              />
            ) : null
          }
          caption={
            xpToNextLevel > 0
              ? t("tiles.toNextLevel", { xp: xpToNextLevel, level: d.level.level + 1 })
              : null
          }
        />
        <StatTile
          label={t("tiles.xp")}
          value={d.xpTotal}
          icon={Star}
          tone="primary"
          caption={t("tiles.xpToday", { xp: d.today.xp })}
        />
        <StatTile label={t("tiles.coins")} value={d.coins} icon={Coins} tone="neutral" />
        <StatTile
          label={t("tiles.streakDays")}
          value={d.streak.length}
          icon={Flame}
          tone="warm"
          caption={
            d.streak.activeToday
              ? t("streak.activeToday")
              : d.streak.length > 0
                ? t("tiles.streakNext", { days: d.streak.length + 1 })
                : t("streak.start")
          }
        />
        <StatTile
          label={t("stats.exercises")}
          value={d.exercisesCompleted}
          icon={SquareTerminal}
          tone="primary"
        />
      </dl>
      <XpExplainer className="-mt-4" />

      <div className="grid gap-6 md:grid-cols-3">
        {/* The focal card: the only action on this page that matters, with the same treatment the
            continuable section gets on /ruta. */}
        <Card className="ring-primary/45 space-y-3 ring-2 md:col-span-2">
          {d.hasStarted && continueSection && continueLessons.length > 0 ? (
            <div className="space-y-1.5">
              <p className="text-muted text-xs font-semibold tracking-wide uppercase">
                {continueProgressText}
              </p>
              <Meter
                tone="primary"
                percent={continuePercent}
                label={t("continue.sectionProgressLabel", { title: continueSection.title })}
                valueText={continueProgressText}
              />
            </div>
          ) : null}
          {/* "Continuar" on an account that has done nothing is a lie the learner notices
              (owner feedback 2026-09-24): the first visit invites, later visits resume. */}
          <h2 className="text-xl">{d.hasStarted ? t("continue.title") : t("continue.titleNew")}</h2>
          {d.continueTarget ? (
            <>
              {!d.hasStarted ? (
                <p className="text-muted text-sm">{t("continue.introNew")}</p>
              ) : null}
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
                {d.hasStarted ? t("continue.cta") : t("continue.ctaNew")}
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
          {d.freeLimit > 0 && !entitled ? (
            <div className="text-muted space-y-1 text-xs">
              <p>{t("freeCounter", { used: d.freeUsed, limit: d.freeLimit })}</p>
              {/* Without this line, "4 de 5 usados" next to "Ejercicios 6" reads as a bug. */}
              {d.freeSectionTitles.length > 0 ? (
                <p>{t("freeCounterSections", { sections: format.list(d.freeSectionTitles) })}</p>
              ) : null}
            </div>
          ) : null}
        </Card>

        {/* Review is a finished feature that nobody found behind a nav link. */}
        <Card className="space-y-3">
          <SectionHeader as="h2" icon={RefreshCw} title={t("review.title")} />
          <p className="text-muted text-sm">{t("review.body")}</p>
          <Link href="/repaso" className={cn(buttonVariants({ variant: "secondary" }), "w-fit")}>
            {t("review.cta")}
            <ArrowRight aria-hidden="true" />
          </Link>
        </Card>

        {/* Streak: the day count is in the tile row, so this card carries only what the tile
            cannot — today's state and how the protection works. */}
        <Card className="space-y-2">
          <SectionHeader as="h2" icon={Flame} title={t("streak.title")} />
          <p className="text-sm font-medium">
            {d.streak.activeToday
              ? t("streak.activeToday")
              : d.streak.protectedByFreeze
                ? t("streak.protected")
                : d.streak.atRisk
                  ? t("streak.atRisk")
                  : t("streak.start")}
          </p>
          <p className="text-muted inline-flex items-center gap-1 text-xs">
            <ShieldCheck aria-hidden="true" className="size-3.5 shrink-0" />
            {streakFacts.join(" · ")}
          </p>
          <p className="text-muted text-xs">
            {t("streak.protectionHow", { max: limits.streaks.freezesPerMonth })}
          </p>
        </Card>

        {/* Goals */}
        <Card className="space-y-3">
          <SectionHeader as="h2" icon={Target} title={t("goals.title")} />
          <Goal label={t("goals.daily")} value={d.today.xp} target={d.today.target} unit="XP" />
          <Goal
            label={t("goals.weekly")}
            value={d.week.minutes}
            target={d.week.target}
            unit="min"
          />
          <GoalsForm goals={d.goals} />
        </Card>

        {/* Badges: the same identity as /logros, so one badge looks like itself everywhere. The
            pills used to be text-only with a `title` attribute nobody on a keyboard could read. */}
        <Card className="space-y-3">
          <SectionHeader as="h2" icon={Award} title={t("badges.title")} />
          <p className="text-muted text-sm">
            {t("badges.count", { earned: earnedBadges.length, total: d.badges.length })}
          </p>
          {earnedBadges.length === 0 ? (
            <p className="text-muted text-xs">{t("badges.none")}</p>
          ) : null}
          {/* Names are printed, not hidden behind icon-only chips: several badges share a family
              hue and their icons were hard to tell apart (owner feedback, round 6 item 2). Earned
              vs locked is carried by the icon, the border style and the words, never colour alone. */}
          <ul className="space-y-2">
            {previewBadges.map((b) => {
              const visual = getBadgeVisual(b.slug);
              const BadgeIcon = visual.icon;
              const earned = Boolean(b.earned_at);
              const StateIcon = earned ? CircleCheck : Lock;
              return (
                <li
                  key={b.slug}
                  className={cn(
                    "flex items-start gap-3 rounded-md border p-2",
                    badgeCardClasses(earned),
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "relative flex size-9 shrink-0 items-center justify-center rounded-full border",
                      badgeContainerClasses(visual.category, visual.tier, earned),
                    )}
                  >
                    <BadgeIcon className="size-4.5" strokeWidth={earned ? 1.75 : 1.25} />
                  </span>
                  <div className="min-w-0 space-y-0.5">
                    <Link
                      href={{ pathname: "/logros", hash: b.slug }}
                      className="text-sm font-semibold underline-offset-4 hover:underline"
                    >
                      {b.title}
                    </Link>
                    <p className="text-muted text-xs">{b.description}</p>
                    <p
                      className={cn(
                        "inline-flex items-center gap-1 text-xs",
                        earned ? "text-success-ink" : "text-muted",
                      )}
                    >
                      <StateIcon aria-hidden="true" className="size-3.5 shrink-0" />
                      {earned ? t("badges.earned") : t("badges.locked")}
                    </p>
                  </div>
                </li>
              );
            })}
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
                  <Meter tone="success" percent={pct} label={m.sectionTitle} />
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <nav aria-label={t("links.label")} className="flex flex-wrap gap-4 text-sm">
        <Link href="/ruta" className="text-primary underline underline-offset-4">
          {t("links.path")}
        </Link>
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
      <Meter tone="warm" percent={pct} label={label} valueText={`${value}/${target} ${unit}`} />
    </div>
  );
}
