/**
 * The number on the header's «Admin» link (D-43): open exercise reports plus code redemptions the
 * admin has not seen yet. Pure rules here; the reads live in `src/lib/admin/queries.ts`.
 *
 * «Seen» needs no table: an httpOnly cookie holds the moment the admin last opened /admin/promos.
 * There is one admin today, and a second one on another browser simply has their own mark.
 */

export const PROMOS_SEEN_COOKIE = "dm_admin_promos_seen";

/**
 * The stored mark, or null when there is none or it cannot be trusted. A mark in the future would
 * hide every redemption until that date, so it is ignored rather than honoured.
 */
export function parseSeenAt(raw: string | undefined | null, now: Date = new Date()): string | null {
  if (!raw) return null;
  const at = new Date(raw);
  if (Number.isNaN(at.getTime()) || at.getTime() > now.getTime()) return null;
  return at.toISOString();
}

/** Whether a redemption arrived after the admin's last visit (no mark = everything is new). */
export function isUnseen(createdAt: string, seenAt: string | null): boolean {
  if (!seenAt) return true;
  return new Date(createdAt).getTime() > new Date(seenAt).getTime();
}

/**
 * A count that could not be read is left out rather than guessed: the badge then under-reports
 * until the next page load, which is better than a number that is not true.
 */
export function attentionTotal(openReports: number | null, unseenRedemptions: number | null) {
  return Math.max(0, openReports ?? 0) + Math.max(0, unseenRedemptions ?? 0);
}
