import { describe, expect, it } from "vitest";
import { limits } from "@/config/limits";
import { promoCodeInputSchema } from "@/lib/payments/promo-schema";

/**
 * The rule under test is the one the owner asked for on 2026-09-24: a promo code is capped unless
 * somebody explicitly asked for an unlimited one. These cases run against the schema the server
 * action uses, not against the form, because the form is not what protects the endpoint.
 */
const base = {
  code: "",
  kind: "scholarship",
  accessDays: "30",
  discountPercent: "",
  expiresAt: "",
  note: "",
};

describe("promoCodeInputSchema", () => {
  it("accepts a capped code", () => {
    const r = promoCodeInputSchema.safeParse({ ...base, maxRedemptions: "5" });
    expect(r.success).toBe(true);
    expect(r.success && r.data.maxRedemptions).toBe(5);
  });

  it("rejects an omitted cap: an empty field is not a licence to give the course away", () => {
    const r = promoCodeInputSchema.safeParse({ ...base, maxRedemptions: "" });
    expect(r.success).toBe(false);
    expect(
      r.success === false && r.error.issues.some((i) => i.message === "max_redemptions_required"),
    ).toBe(true);
  });

  it("rejects a missing cap field, which is what a hand-made request sends", () => {
    const r = promoCodeInputSchema.safeParse(base);
    expect(r.success).toBe(false);
  });

  it("allows an unlimited code only with the explicit flag", () => {
    const r = promoCodeInputSchema.safeParse({ ...base, maxRedemptions: "", unlimited: true });
    expect(r.success).toBe(true);
    expect(r.success && r.data.maxRedemptions).toBeNull();
  });

  it("accepts the checkbox wire value 'on' as the explicit flag", () => {
    const r = promoCodeInputSchema.safeParse({ ...base, maxRedemptions: "", unlimited: "on" });
    expect(r.success && r.data.maxRedemptions).toBeNull();
  });

  it("does not treat an arbitrary truthy value as the flag", () => {
    const r = promoCodeInputSchema.safeParse({ ...base, maxRedemptions: "", unlimited: "1" });
    expect(r.success).toBe(false);
  });

  it("lets the explicit flag win over a number left behind by the disabled field", () => {
    const r = promoCodeInputSchema.safeParse({ ...base, maxRedemptions: "3", unlimited: true });
    expect(r.success && r.data.maxRedemptions).toBeNull();
  });

  it("refuses a cap below one or above the configured ceiling", () => {
    expect(promoCodeInputSchema.safeParse({ ...base, maxRedemptions: "0" }).success).toBe(false);
    expect(
      promoCodeInputSchema.safeParse({
        ...base,
        maxRedemptions: String(limits.promoCodes.maxRedemptionsCap + 1),
      }).success,
    ).toBe(false);
  });

  it("still requires the value that matches the kind", () => {
    expect(
      promoCodeInputSchema.safeParse({ ...base, accessDays: "", maxRedemptions: "1" }).success,
    ).toBe(false);
    expect(
      promoCodeInputSchema.safeParse({
        ...base,
        kind: "discount",
        accessDays: "",
        discountPercent: "50",
        maxRedemptions: "1",
      }).success,
    ).toBe(true);
  });

  it("keeps an expiry optional: a capped code is bounded by its cap", () => {
    const r = promoCodeInputSchema.safeParse({ ...base, maxRedemptions: "1", expiresAt: "" });
    expect(r.success && r.data.expiresAt).toBeNull();
  });
});
