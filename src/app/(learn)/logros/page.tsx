import { CircleCheck, Lock, type LucideIcon } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import {
  BADGE_TIER_COUNT,
  BADGE_TIER_NUMERAL,
  BADGE_INK,
  badgeCardClasses,
  badgeContainerClasses,
} from "@/components/progress/badge-styles";
import { SectionHeader } from "@/components/ui/section-header";
import {
  badgeCategories,
  badgeCategoryIcon,
  getBadgeVisual,
  type BadgeCategory,
  type BadgeTier,
} from "@/config/badges";
import { requireOnboardedProfile } from "@/lib/auth/session";
import { getDashboard } from "@/lib/progress/queries";
import { cn } from "@/lib/utils/cn";

export async function generateMetadata() {
  const t = await getTranslations("badges");
  return { title: t("title") };
}

interface BadgeCardProps {
  slug: string;
  title: string;
  description: string;
  icon: LucideIcon;
  category: BadgeCategory;
  tier: BadgeTier;
  earned: boolean;
  stateText: string;
  tierLabel: string;
}

/**
 * Card anatomy per the 2026-09-23 review §5.4. Locked cards keep the real badge icon (thinner
 * stroke, neutral ink) with a padlock micro-chip, so the learner can see what is still ahead;
 * the state is always stated in words as well.
 */
function BadgeCard({
  slug,
  title,
  description,
  icon: Icon,
  category,
  tier,
  earned,
  stateText,
  tierLabel,
}: BadgeCardProps) {
  const StateIcon = earned ? CircleCheck : Lock;
  return (
    <li
      id={slug}
      // scroll-mt keeps the card clear of the header when linked to as /logros#slug.
      className={cn("flex scroll-mt-24 gap-3 rounded-lg border p-4", badgeCardClasses(earned))}
    >
      <span
        aria-hidden="true"
        className={cn(
          "relative flex size-11 shrink-0 items-center justify-center rounded-full border",
          badgeContainerClasses(category, tier, earned),
        )}
      >
        <Icon className="size-5" strokeWidth={earned ? 1.75 : 1.25} />
        {earned ? null : (
          <Lock className="border-border bg-surface absolute -right-0.5 -bottom-0.5 size-4 rounded-full border p-0.5" />
        )}
      </span>
      <div className="min-w-0 space-y-1">
        <div className="flex items-baseline gap-2">
          <h3 className="font-heading text-base font-semibold">{title}</h3>
          <span className={cn("text-[11px] font-semibold", BADGE_INK[category])}>
            {BADGE_TIER_NUMERAL[tier]}
            <span className="sr-only"> {tierLabel}</span>
          </span>
        </div>
        <p className="text-muted text-sm">{description}</p>
        <p
          className={cn(
            "inline-flex items-center gap-1.5 text-xs",
            earned ? "text-success-ink" : "text-muted",
          )}
        >
          <StateIcon aria-hidden="true" className="size-3.5 shrink-0" />
          {stateText}
        </p>
      </div>
    </li>
  );
}

export default async function BadgesPage() {
  const profile = await requireOnboardedProfile("/logros");
  const [d, t, format] = await Promise.all([
    getDashboard(profile),
    getTranslations("badges"),
    getFormatter(),
  ]);
  const earned = d.badges.filter((b) => b.earned_at).length;
  const total = d.badges.length;
  const overallPercent = total ? Math.round((earned / total) * 100) : 0;

  // Grouped by family, tier I → III inside each family. Earned badges are deliberately not
  // sorted first: the next target must stay next to the last one earned.
  const groups = badgeCategories
    .map((category) => ({
      category,
      badges: d.badges
        .map((b) => ({ ...b, visual: getBadgeVisual(b.slug) }))
        .filter((b) => b.visual.category === category)
        .sort((a, b) => a.visual.tier - b.visual.tier),
    }))
    .filter((g) => g.badges.length > 0);

  return (
    <div className="container-page max-w-4xl space-y-10 py-10">
      <header className="space-y-3">
        <h1 className="text-3xl">{t("title")}</h1>
        <p className="text-muted">{t("summary", { earned, total })}</p>
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={overallPercent}
          aria-label={t("overallProgressLabel")}
          className="bg-surface-2 border-border/60 h-2 w-full max-w-sm overflow-hidden rounded-full border"
        >
          <div
            className="bg-success-ink h-full rounded-full"
            style={{ width: `${overallPercent}%` }}
          />
        </div>
      </header>

      {groups.map((group) => {
        const groupEarned = group.badges.filter((b) => b.earned_at).length;
        const groupTotal = group.badges.length;
        const groupPercent = Math.round((groupEarned / groupTotal) * 100);
        const categoryName = t(`categories.${group.category}`);
        return (
          <section key={group.category} aria-labelledby={`insignias-${group.category}`}>
            <SectionHeader
              as="h2"
              icon={badgeCategoryIcon(group.category)}
              title={categoryName}
              headingProps={{ id: `insignias-${group.category}` }}
              titleClassName="text-xl"
              aside={
                <span className="text-muted text-sm">
                  {t("groupProgress", { earned: groupEarned, total: groupTotal })}
                </span>
              }
            />
            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={groupPercent}
              aria-label={t("groupProgressLabel", { category: categoryName })}
              className="bg-surface-2 border-border/60 mb-4 h-1.5 w-full overflow-hidden rounded-full border"
            >
              <div
                className="bg-success-ink h-full rounded-full"
                style={{ width: `${groupPercent}%` }}
              />
            </div>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {group.badges.map((b) => (
                <BadgeCard
                  key={b.slug}
                  slug={b.slug}
                  title={b.title}
                  description={b.description}
                  icon={b.visual.icon}
                  category={b.visual.category}
                  tier={b.visual.tier}
                  earned={Boolean(b.earned_at)}
                  stateText={
                    b.earned_at
                      ? t("earnedOn", {
                          date: format.dateTime(new Date(b.earned_at), { dateStyle: "medium" }),
                        })
                      : t("locked")
                  }
                  tierLabel={t("tierLabel", {
                    tier: b.visual.tier,
                    total: BADGE_TIER_COUNT,
                    category: categoryName,
                  })}
                />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
