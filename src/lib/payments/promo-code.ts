import { limits } from "@/config/limits";

/**
 * Promo / scholarship codes.
 *
 * A code is read out loud on a call, written on paper, or retyped from a screenshot, so the
 * alphabet excludes every pair that is confused in those situations: O/0, I/1/L, and the
 * lowercase forms (codes are compared case-insensitively — migration 20260922140000 — so the
 * canonical form is uppercase). What is left is 30 symbols; ambiguity is designed out rather
 * than explained away in a hint.
 */
export const PROMO_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** Shape accepted by `create_promo_code`: groups of uppercase letters/digits joined by hyphens. */
export const PROMO_CODE_PATTERN = /^[A-Z0-9-]{4,40}$/;

/** Cryptographically strong when available; `Math.random` only as a last resort in tests. */
function randomBytes(count: number): Uint8Array {
  const out = new Uint8Array(count);
  const c = globalThis.crypto;
  if (c?.getRandomValues) {
    c.getRandomValues(out);
    return out;
  }
  for (let i = 0; i < count; i += 1) out[i] = Math.floor(Math.random() * 256);
  return out;
}

/**
 * A code such as `BECA-7KQF-2XMR`: an optional human prefix plus `limits.promoCodes.generatedLength`
 * random characters, hyphenated in groups so the eye does not lose its place.
 *
 * Rejection sampling keeps every symbol equally likely; a plain modulo would make the first
 * `256 % 31` symbols slightly more common, which is a small bias but a free one to avoid.
 */
export function generatePromoCode(prefix = "", length = limits.promoCodes.generatedLength): string {
  const chars: string[] = [];
  const max = Math.floor(256 / PROMO_CODE_ALPHABET.length) * PROMO_CODE_ALPHABET.length;
  while (chars.length < length) {
    for (const byte of randomBytes(length)) {
      if (chars.length === length) break;
      if (byte >= max) continue;
      chars.push(PROMO_CODE_ALPHABET[byte % PROMO_CODE_ALPHABET.length]);
    }
  }
  const groups: string[] = [];
  for (let i = 0; i < chars.length; i += limits.promoCodes.groupSize) {
    groups.push(chars.slice(i, i + limits.promoCodes.groupSize).join(""));
  }
  const clean = normalizePromoCode(prefix);
  return (clean ? [clean, ...groups] : groups).join("-");
}

/** Uppercases, trims and collapses the separators an admin may type by hand. */
export function normalizePromoCode(code: string): string {
  return code
    .trim()
    .toUpperCase()
    .replace(/[\s_]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
}

/** Characters a human could have meant but that the alphabet does not use. */
export function hasAmbiguousCharacters(code: string): boolean {
  return /[OIL01]/.test(normalizePromoCode(code));
}
