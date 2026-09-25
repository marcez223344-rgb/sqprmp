import { ChevronDown, Info } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { limits } from "@/config/limits";
import { xpForLevel } from "@/lib/rewards/rules";
import { cn } from "@/lib/utils/cn";

/**
 * «XP total» was a number nobody had explained (owner feedback, round 6 item 1). A native
 * disclosure keeps the dashboard compact and is keyboard- and screen-reader-operable without any
 * script. Every amount is read from `limits` and the level curve, so the text cannot drift from
 * what `award_reward` actually pays.
 */
export async function XpExplainer({ className }: { className?: string }) {
  const t = await getTranslations("dashboard.xpInfo");
  const perDifficulty = Object.values(limits.rewards.byDifficulty).map((r) => r.xp);
  return (
    <details className={cn("group border-border bg-surface rounded-md border", className)}>
      <summary className="flex min-h-11 list-none items-center gap-2 px-4 py-2 text-sm font-medium [&::-webkit-details-marker]:hidden">
        <Info aria-hidden="true" className="text-primary size-4 shrink-0" />
        {t("summary")}
        <ChevronDown
          aria-hidden="true"
          className="text-muted ml-auto size-4 shrink-0 transition-transform group-open:rotate-180"
        />
      </summary>
      <div className="text-muted space-y-2 px-4 pb-4 text-sm">
        <p>{t("intro")}</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            {t("exercise", {
              min: Math.min(...perDifficulty),
              max: Math.max(...perDifficulty),
              hintPercent: limits.hints.xpPenaltyPercentPerHint,
              maxPercent: limits.hints.maxXpPenaltyPercent,
              revealPercent: limits.solutionUnlock.xpPercentAfterReveal,
            })}
          </li>
          <li>
            {t("quiz", {
              pass: limits.rewards.quizPassThresholdPercent,
              perCorrect: limits.rewards.quizXpPerCorrect,
              bonus: limits.rewards.quizPassBonusXp,
            })}
          </li>
          <li>{t("section", { xp: limits.rewards.sectionCompletedXp })}</li>
          <li>{t("rules", { cap: limits.rewards.dailyXpCap })}</li>
        </ul>
        <p>{t("levels", { level2: xpForLevel(2), level3: xpForLevel(3) })}</p>
      </div>
    </details>
  );
}
