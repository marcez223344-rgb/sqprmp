import { z } from "zod";
import { limits } from "@/config/limits";
import { MAX_ACCESS_DAYS } from "@/lib/payments/access-grants";
import { normalizePromoCode, PROMO_CODE_PATTERN } from "@/lib/payments/promo-code";

/**
 * The input contract for creating a promo / scholarship code, kept out of the server action so it
 * can be unit-tested on its own and so the form and the action cannot drift apart.
 *
 * The rule it enforces (owner decision, 2026-09-24): **a code is capped unless somebody said
 * otherwise in so many words.** `max_redemptions = null` means unlimited in
 * `redeem_promo` — the exhaustion check is skipped entirely — and a leaked unlimited scholarship
 * code gives the whole course away to everyone who reads the message. The per-user guard in
 * `redeem_promo` only stops the *same* person redeeming twice, so an uncapped code is bounded by
 * nothing but how far the message travels.
 *
 * Therefore an empty "canjes máximos" is not "no limit": it is invalid. Unlimited exists only as
 * `unlimited: true`, which the form sends from a separate checkbox and which no accidental
 * submission produces. The check lives here rather than only in the form because a server action
 * is an HTTP endpoint: anything that can authenticate as an admin can post to it directly.
 */

const MAX_DISCOUNT_PERCENT = 100;

/** Empty string / missing → null, so an untouched form field never becomes a silent 0. */
const optionalInt = (max: number) =>
  z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? null : v),
    z.coerce.number().int().min(1).max(max).nullable(),
  );

/** HTML checkboxes arrive as `"on"`; a direct caller may send a real boolean. */
const checkbox = z.preprocess((v) => v === true || v === "on" || v === "true", z.boolean());

export const promoCodeInputSchema = z
  .object({
    // Empty means "generate one": the admin should not have to invent an unambiguous string.
    code: z.preprocess(
      (v) => normalizePromoCode(typeof v === "string" ? v : ""),
      z.string().regex(PROMO_CODE_PATTERN).or(z.literal("")),
    ),
    kind: z.enum(["scholarship", "discount"]),
    accessDays: optionalInt(MAX_ACCESS_DAYS),
    discountPercent: optionalInt(MAX_DISCOUNT_PERCENT),
    maxRedemptions: optionalInt(limits.promoCodes.maxRedemptionsCap),
    unlimited: checkbox,
    expiresAt: z.preprocess((v) => (v === "" ? null : v), z.iso.date().nullable()),
    note: z.string().trim().max(300),
  })
  .refine((v) => (v.kind === "scholarship" ? v.accessDays !== null : v.discountPercent !== null), {
    message: "kind_fields",
  })
  // No cap and no explicit "sin límite" is the accident this exists to refuse.
  .refine((v) => v.unlimited || v.maxRedemptions !== null, { message: "max_redemptions_required" })
  .transform((v) => ({
    ...v,
    // Ticking "sin límite" wins over whatever number the disabled field may still carry, so the
    // two controls can never describe two different codes.
    maxRedemptions: v.unlimited ? null : v.maxRedemptions,
  }));

export type PromoCodeInput = z.output<typeof promoCodeInputSchema>;
