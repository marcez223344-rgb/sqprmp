import { describe, expect, it } from "vitest";
import { limits } from "@/config/limits";
import {
  products,
  enabledPaymentProviders,
  readyTransferChannels,
  manualTransferInstructions,
  type PaymentProviderId,
} from "@/config/pricing";
import { buildCsp, generateNonce } from "@/lib/security/csp";

describe("config/limits", () => {
  it("free limit follows decision D-01", () => {
    expect(limits.freeExerciseLimit).toBe(5);
  });
  it("hint penalties never exceed the cap", () => {
    const total = limits.hints.levels * limits.hints.xpPenaltyPercentPerHint;
    expect(Math.min(total, limits.hints.maxXpPenaltyPercent)).toBeLessThanOrEqual(30);
  });
  it("reward table is monotonic by difficulty", () => {
    const d = limits.rewards.byDifficulty;
    expect(d.very_easy.xp).toBeLessThan(d.easy.xp);
    expect(d.easy.xp).toBeLessThan(d.intermediate.xp);
    expect(d.intermediate.xp).toBeLessThan(d.advanced.xp);
    expect(d.advanced.xp).toBeLessThan(d.expert.xp);
  });
});

describe("config/pricing", () => {
  it("has exactly one active product for the MVP and it is lifetime", () => {
    const active = products.filter((p) => p.isActive);
    expect(active).toHaveLength(1);
    expect(active[0]?.kind).toBe("lifetime");
    expect(active[0]?.accessDays).toBeNull();
  });
  it("only enables approved providers (D-05)", () => {
    // Asserts the rule, not the current list: which providers are on is an owner decision that
    // moves (D-32 dropped Hotmart for launch), but enabling one that was never approved is a
    // regression at any time.
    const approved: PaymentProviderId[] = ["manual", "hotmart"];
    expect(enabledPaymentProviders.every((p) => approved.includes(p))).toBe(true);
    expect(enabledPaymentProviders).toContain("manual");
  });
  it("offers a transfer channel only once its details are real (D-32)", () => {
    // The placeholders rendered verbatim on /precios for a while; readyTransferChannels is what
    // stops that, and a channel that still has one must never be offered.
    for (const channel of readyTransferChannels) {
      const { lines } = manualTransferInstructions[channel.id];
      expect(lines.some((l) => l.includes("PENDIENTE-DE-CONFIGURAR"))).toBe(false);
    }
    expect(readyTransferChannels.length).toBeGreaterThan(0);
  });
});

describe("security/csp", () => {
  it("includes nonce and wasm allowance, no unsafe-inline scripts in production", () => {
    const nonce = generateNonce();
    const csp = buildCsp(nonce, false);
    expect(csp).toContain(`'nonce-${nonce}'`);
    expect(csp).toContain("'wasm-unsafe-eval'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp.match(/script-src[^;]*/)?.[0]).not.toContain("'unsafe-inline'");
    expect(csp).not.toContain("'unsafe-eval'");
  });
  it("allows eval only in development", () => {
    expect(buildCsp("n", true)).toContain("'unsafe-eval'");
  });
});
