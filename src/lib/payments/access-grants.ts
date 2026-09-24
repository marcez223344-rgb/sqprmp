/**
 * Admin access grants: the two things "dar acceso" can mean.
 *
 * `comp`    — courtesy / scholarship. Nobody paid. The entitlement is `source = 'admin'` and the
 *             directory and metrics show it as "otorgado". It is not revenue and must never be
 *             counted as such.
 * `payment` — the learner paid outside the app (bank transfer, D-32). The entitlement is
 *             `source = 'purchase'` and an approved `purchases` row carries the amount, currency
 *             and the bank reference, so revenue is real revenue.
 *
 * Before 2026-09-24 the admin form had no way to say which of the two had happened, so a
 * confirmed transfer was filed as "otorgado" and disappeared from the revenue figures (owner
 * feedback item 22). Pure module: no Supabase import, so the date arithmetic is unit-testable and
 * shared by the server action and the form preview.
 */
export const ACCESS_GRANT_KINDS = ["comp", "payment"] as const;
export type AccessGrantKind = (typeof ACCESS_GRANT_KINDS)[number];

/** Longest access an admin may hand out in one go (10 years ≈ "forever" with an audit trail). */
export const MAX_ACCESS_DAYS = 3650;

/**
 * The end date implied by a number of days of access. `null` days means no end date at all
 * (lifetime), which is what the product sells — so the form derives and shows this instead of
 * asking for the same fact twice (owner feedback item 18).
 */
export function accessEndsAt(days: number | null, from: Date = new Date()): Date | null {
  if (days === null || !Number.isFinite(days) || days <= 0) return null;
  const end = new Date(from.getTime());
  end.setUTCDate(end.getUTCDate() + Math.floor(days));
  return end;
}

/** Days between today and a chosen end date, for an admin who thinks in dates rather than days. */
export function daysUntil(endsAt: Date, from: Date = new Date()): number {
  const ms = endsAt.getTime() - from.getTime();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

/** `null` (lifetime) or a whole number of days inside the allowed range; anything else is invalid. */
export function parseAccessDays(raw: unknown): { ok: true; days: number | null } | { ok: false } {
  if (raw === null || raw === undefined || raw === "") return { ok: true, days: null };
  const n = typeof raw === "number" ? raw : Number(String(raw).trim());
  if (!Number.isInteger(n) || n < 1 || n > MAX_ACCESS_DAYS) return { ok: false };
  return { ok: true, days: n };
}
