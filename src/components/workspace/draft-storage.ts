/**
 * Browser-side storage of unsent SQL drafts (security review 2026-09-23, F-8).
 *
 * The text is the learner's own work and holds no credentials, so keeping a copy in
 * `localStorage` is acceptable (`docs/SECURITY.md` §7.1) — it is what stops a finished query from
 * disappearing on an accidental navigation. Two rules make it safe on a shared machine:
 *
 * 1. Keys are namespaced by user id, so a second account in the same browser can never read or
 *    resume the first one's drafts, even if the cleanup below fails.
 * 2. Every draft is swept when a session ends (sign-out, and on the sign-in page for sessions that
 *    ended without a clean sign-out), because the sign-out route is a server POST and cannot touch
 *    browser storage by itself.
 *
 * Every access is wrapped: `localStorage` throws in private mode and when the quota is full.
 */

const PREFIX = "dms.draft.";

export interface StoredDraft {
  sql: string;
  savedAt: string;
}

function storageKey(userId: string, slug: string): string {
  return `${PREFIX}${userId}.${slug}`;
}

/** Keys written before drafts were namespaced: `dms.draft.<slug>`, with no owner. */
function isLegacyKey(key: string): boolean {
  return key.startsWith(PREFIX) && key.split(".").length === 3;
}

export function readLocalDraft(userId: string, slug: string): StoredDraft | null {
  try {
    const raw = window.localStorage.getItem(storageKey(userId, slug));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const { sql, savedAt } = parsed as Partial<StoredDraft>;
    if (typeof sql !== "string" || typeof savedAt !== "string") return null;
    return { sql, savedAt };
  } catch {
    return null;
  }
}

export function writeLocalDraft(userId: string, slug: string, sql: string): void {
  try {
    const payload: StoredDraft = { sql, savedAt: new Date().toISOString() };
    window.localStorage.setItem(storageKey(userId, slug), JSON.stringify(payload));
  } catch {
    // Private mode or full quota: the server copy is still the durable one.
  }
}

/** Removes every draft in this browser. Called when a session ends. */
export function clearDraftStorage(): void {
  try {
    for (const key of Object.keys(window.localStorage)) {
      if (key.startsWith(PREFIX)) window.localStorage.removeItem(key);
    }
  } catch {
    // Nothing to do: if storage is unreadable there is nothing stored either.
  }
}

/**
 * Drops drafts written before keys carried an owner. They are deleted rather than migrated: an
 * un-namespaced draft cannot be attributed to anyone, and handing it to whoever signs in next is
 * the leak this change exists to close. The server copy (`exercise_progress.draft_sql`) is the
 * durable one, so the only text at risk is what was typed in the seconds before the deploy.
 */
export function purgeLegacyDrafts(): void {
  try {
    for (const key of Object.keys(window.localStorage)) {
      if (isLegacyKey(key)) window.localStorage.removeItem(key);
    }
  } catch {
    // Same as above.
  }
}

/**
 * Which draft wins on mount. The browser copy is written 1.5 s after the last keystroke and the
 * server copy only on a longer pause or when the page is left, so the browser copy is often the
 * newer one; a missing or unparsable timestamp never beats the server.
 */
export function newerLocalDraft(
  local: StoredDraft | null,
  serverSql: string,
  serverSavedAt: string | null,
): string | null {
  if (!local || !local.sql.trim() || local.sql === serverSql) return null;
  const localAt = Date.parse(local.savedAt);
  if (!Number.isFinite(localAt)) return null;
  const serverAt = serverSavedAt ? Date.parse(serverSavedAt) : 0;
  if (localAt <= (Number.isFinite(serverAt) ? serverAt : 0)) return null;
  return local.sql;
}
