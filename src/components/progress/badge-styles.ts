import type { BadgeCategory, BadgeTier } from "@/config/badges";

/**
 * Badge family → hue (identity), tier → tint strength (progression). Colour is never the only
 * channel: the family is also a group heading, the tier is also a Roman numeral with an `sr-only`
 * sentence, and tier III adds a ring. Every class string is written out because Tailwind cannot
 * see interpolated names (same reason as `src/components/datasets/dataset-badge.tsx`).
 *
 * Tier II and III tints (14 %+ light, 20 %+ dark) appear **only** on the icon container, which
 * holds no text: over those tints `--color-muted` drops below 4.5:1 (review 2026-09-23 §7.3).
 */
export const BADGE_INK: Record<BadgeCategory, string> = {
  practica: "text-primary",
  autonomia: "text-info",
  dominio: "text-success-ink",
  constancia: "text-accent-ink",
  nivel: "text-achievement",
  otras: "text-muted",
};

const CONTAINER: Record<BadgeCategory, Record<BadgeTier, string>> = {
  practica: {
    1: "border-primary/30 bg-primary/10 dark:bg-primary/14 text-primary",
    2: "border-primary/45 bg-primary/14 dark:bg-primary/20 text-primary",
    3: "border-primary/60 bg-primary/18 dark:bg-primary/26 text-primary ring-1 ring-inset ring-primary/25",
  },
  autonomia: {
    1: "border-info/30 bg-info/10 dark:bg-info/14 text-info",
    2: "border-info/45 bg-info/14 dark:bg-info/20 text-info",
    3: "border-info/60 bg-info/18 dark:bg-info/26 text-info ring-1 ring-inset ring-info/25",
  },
  dominio: {
    1: "border-success-ink/30 bg-success-ink/10 dark:bg-success-ink/14 text-success-ink",
    2: "border-success-ink/45 bg-success-ink/14 dark:bg-success-ink/20 text-success-ink",
    3: "border-success-ink/60 bg-success-ink/18 dark:bg-success-ink/26 text-success-ink ring-1 ring-inset ring-success-ink/25",
  },
  constancia: {
    1: "border-accent-ink/30 bg-accent-ink/10 dark:bg-accent-ink/14 text-accent-ink",
    2: "border-accent-ink/45 bg-accent-ink/14 dark:bg-accent-ink/20 text-accent-ink",
    3: "border-accent-ink/60 bg-accent-ink/18 dark:bg-accent-ink/26 text-accent-ink ring-1 ring-inset ring-accent-ink/25",
  },
  nivel: {
    1: "border-achievement/30 bg-achievement/10 dark:bg-achievement/14 text-achievement",
    2: "border-achievement/45 bg-achievement/14 dark:bg-achievement/20 text-achievement",
    3: "border-achievement/60 bg-achievement/18 dark:bg-achievement/26 text-achievement ring-1 ring-inset ring-achievement/25",
  },
  otras: {
    1: "border-border bg-surface-2 text-muted",
    2: "border-border bg-surface-2 text-muted",
    3: "border-border bg-surface-2 text-muted",
  },
};

/** Locked keeps the real icon, in neutral ink: the learner should see *what* is not earned yet. */
const LOCKED_CONTAINER = "border-border bg-surface-2 text-muted";

export function badgeContainerClasses(
  category: BadgeCategory,
  tier: BadgeTier,
  earned: boolean,
): string {
  return earned ? CONTAINER[category][tier] : LOCKED_CONTAINER;
}

/**
 * Earned vs locked differs in three channels — icon, border style and text — and never in
 * opacity: a blanket `opacity-70` dropped the muted line to 3.11:1 (the same bug the
 * 2026-09-18 review removed from `/ruta`).
 */
export function badgeCardClasses(earned: boolean): string {
  return earned ? "border-border bg-surface shadow-sm" : "border-border border-dashed bg-surface";
}

export const BADGE_TIER_NUMERAL: Record<BadgeTier, string> = { 1: "I", 2: "II", 3: "III" };

export const BADGE_TIER_COUNT = 3;
