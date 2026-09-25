import { describe, expect, it } from "vitest";
import { badgeCategoryIcon, badgeVisuals, getBadgeVisual } from "./badges";

/**
 * Regression: `/logros` rendered `Award` for all twelve badges, so every badge looked the same
 * (owner feedback, twice). The icons must stay distinct from each other and from the icons the
 * design system reserves for other meanings.
 */
describe("badge visuals", () => {
  const slugs = Object.keys(badgeVisuals);

  it("covers the thirteen seeded badges", () => {
    expect(slugs).toHaveLength(13);
  });

  it("gives every badge a distinct icon", () => {
    const names = slugs.map((s) => getBadgeVisual(s).icon.displayName);
    expect(names.every(Boolean)).toBe(true);
    expect(new Set(names).size).toBe(13);
  });

  it("keeps the icons reserved for other meanings out of the badge set", () => {
    // Trophy = desafío lesson kind, Layers = intermediate level, CircleCheck/CheckCircle2 = the
    // universal correct marker, Award = the badges feature itself, ShieldCheck = certificates and
    // their verification.
    const reserved = ["Trophy", "Layers", "CircleCheck", "CheckCircle2", "Award", "ShieldCheck"];
    const names = slugs.map((s) => getBadgeVisual(s).icon.displayName);
    for (const name of reserved) expect(names).not.toContain(name);
  });

  it("gives «Verificador de IA» its own icon, not the certificate ShieldCheck", () => {
    const v = getBadgeVisual("verificador-de-ia");
    expect(v.icon.displayName).toBe("SearchCheck");
    expect(v).toMatchObject({ category: "autonomia", tier: 3 });
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
    expect(badgeCategoryIcon("autonomia").displayName).toBe("SearchCheck");
    // A family without a tier III still gets a real icon.
    expect(badgeCategoryIcon("dominio").displayName).toBe("Library");
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
