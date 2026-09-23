import { describe, expect, it } from "vitest";
import { badgeCategoryIcon, badgeVisuals, getBadgeVisual } from "./badges";

/**
 * Regression: `/logros` rendered `Award` for all twelve badges, so every badge looked the same
 * (owner feedback, twice). The icons must stay distinct from each other and from the icons the
 * design system reserves for other meanings.
 */
describe("badge visuals", () => {
  const slugs = Object.keys(badgeVisuals);

  it("covers the twelve seeded badges", () => {
    expect(slugs).toHaveLength(12);
  });

  it("gives every badge a distinct icon", () => {
    const names = slugs.map((s) => getBadgeVisual(s).icon.displayName);
    expect(names.every(Boolean)).toBe(true);
    expect(new Set(names).size).toBe(12);
  });

  it("keeps the icons reserved for other meanings out of the badge set", () => {
    // Trophy = desafío lesson kind, Layers = intermediate level, CircleCheck/CheckCircle2 = the
    // universal correct marker, Award = the badges feature itself.
    const reserved = ["Trophy", "Layers", "CircleCheck", "CheckCircle2", "Award"];
    const names = slugs.map((s) => getBadgeVisual(s).icon.displayName);
    for (const name of reserved) expect(names).not.toContain(name);
  });

  it("falls back to Award for an unknown slug instead of crashing the page", () => {
    const fallback = getBadgeVisual("insignia-que-no-existe-todavia");
    expect(fallback.icon.displayName).toBe("Award");
    expect(fallback.category).toBe("otras");
    expect(fallback.tier).toBe(1);
  });

  it("leads each family with its tier-III member", () => {
    expect(badgeCategoryIcon("constancia").displayName).toBe("Flame");
    expect(badgeCategoryIcon("nivel").displayName).toBe("Crown");
    // A family without a tier III still gets a real icon.
    expect(badgeCategoryIcon("autonomia").displayName).toBe("Brain");
  });

  it("keeps tiers inside a family unique and ordered 1..3", () => {
    const byCategory = new Map<string, number[]>();
    for (const slug of slugs) {
      const v = getBadgeVisual(slug);
      byCategory.set(v.category, [...(byCategory.get(v.category) ?? []), v.tier]);
    }
    for (const tiers of byCategory.values()) {
      expect(new Set(tiers).size).toBe(tiers.length);
      expect(tiers.every((t) => t >= 1 && t <= 3)).toBe(true);
    }
  });
});
