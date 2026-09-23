import {
  Award,
  BookCheck,
  Brain,
  CalendarCheck,
  CalendarRange,
  Crown,
  Flame,
  Library,
  Medal,
  Rocket,
  Sparkles,
  Star,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

/**
 * Visual identity of the badges: one icon, one family and one tier per badge.
 *
 * `/logros` used to render `Award` for all twelve badges, which is why they all looked the same
 * (owner feedback, twice). The database already stores an icon per badge
 * (`supabase/migrations/20260918210000_gamification.sql`); this map is the authoritative source
 * for rendering and resolves six icon collisions that the seeded names would create:
 *
 * - `veinte-ejercicios`: `flame` → `TrendingUp`. `Flame` is the streak language everywhere else.
 * - `racha-30`: `trophy` → `Flame`. `Trophy` is the **desafío** lesson kind (DESIGN_SYSTEM §6),
 *   and the 30-day streak is where a flame is actually the payoff.
 * - `seccion-completa`: `check-circle` → `BookCheck`. `CircleCheck` is the universal correct marker.
 * - `tres-secciones`: `layers` → `Library`. `Layers` is the intermediate **level** icon.
 * - `nivel-5`: `award` → `Medal`. `Award` belongs to the badges feature itself (page, nav, card):
 *   a member of a set must not wear the set's own symbol.
 * - unknown slugs: `Award` as a deliberate fallback, so a badge added in the database later
 *   renders a real card instead of a blank one.
 *
 * A follow-up migration should reconcile `badges.icon` with this table so the two cannot disagree.
 * Unlike the other config files this one imports lucide components directly (the review and the
 * owner asked for slug → component here); it is not re-exported from `src/config/index.ts`, so
 * nothing pulls the icon set in just by importing config.
 */
export const badgeCategories = [
  "practica",
  "autonomia",
  "dominio",
  "constancia",
  "nivel",
  "otras",
] as const;

export type BadgeCategory = (typeof badgeCategories)[number];

/** 1 → 3 inside a family. Tier is also a Roman numeral chip, never tint alone. */
export type BadgeTier = 1 | 2 | 3;

export interface BadgeVisual {
  icon: LucideIcon;
  category: BadgeCategory;
  tier: BadgeTier;
}

export const badgeVisuals: Readonly<Record<string, BadgeVisual>> = {
  "primera-consulta": { icon: Sparkles, category: "practica", tier: 1 },
  "cinco-ejercicios": { icon: Rocket, category: "practica", tier: 2 },
  "veinte-ejercicios": { icon: TrendingUp, category: "practica", tier: 3 },
  "sin-pistas-cinco": { icon: Brain, category: "autonomia", tier: 2 },
  "seccion-completa": { icon: BookCheck, category: "dominio", tier: 1 },
  "tres-secciones": { icon: Library, category: "dominio", tier: 2 },
  "racha-3": { icon: CalendarCheck, category: "constancia", tier: 1 },
  "racha-7": { icon: CalendarRange, category: "constancia", tier: 2 },
  "racha-30": { icon: Flame, category: "constancia", tier: 3 },
  "nivel-3": { icon: Star, category: "nivel", tier: 1 },
  "nivel-5": { icon: Medal, category: "nivel", tier: 2 },
  "nivel-10": { icon: Crown, category: "nivel", tier: 3 },
};

/** A badge the config does not know yet: real card, neutral family, never a crash. */
export const fallbackBadgeVisual: BadgeVisual = { icon: Award, category: "otras", tier: 1 };

export function getBadgeVisual(slug: string): BadgeVisual {
  return badgeVisuals[slug] ?? fallbackBadgeVisual;
}

/** Icon that leads a family group: the tier-III member, or the family's only member. */
export function badgeCategoryIcon(category: BadgeCategory): LucideIcon {
  const members = Object.values(badgeVisuals).filter((b) => b.category === category);
  const lead = members.find((b) => b.tier === 3) ?? members[members.length - 1];
  return lead?.icon ?? Award;
}
