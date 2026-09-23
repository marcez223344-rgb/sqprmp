import { z } from "zod";

/**
 * Shapes and URL-parameter parsing for the admin user directory and the audience statistics.
 * Pure module: no Supabase import, so the sorting whitelist and the tiny-dataset rules are
 * unit-testable. The queries themselves live in ./queries.ts and aggregate in Postgres.
 */

/** Columns the directory can be ordered by. Anything else falls back to the signup date. */
export const SORT_KEYS = [
  "alias",
  "display_name",
  "country",
  "age",
  "created_at",
  "onboarded",
  "role",
  "entitlement",
  "exercises_started",
  "exercises_completed",
  "level",
  "xp_total",
  "last_activity",
] as const;
export type SortKey = (typeof SORT_KEYS)[number];

/** Access classes returned by admin_user_directory / admin_user_stats. */
export const ENTITLEMENT_STATUSES = ["free", "paid", "promo", "granted", "admin"] as const;
export type EntitlementStatus = (typeof ENTITLEMENT_STATUSES)[number];

/** Filterable subset: "admin" is a role, not something you grant. */
export const ENTITLEMENT_FILTERS = ["free", "paid", "promo", "granted"] as const;

export const AGE_BRACKETS = ["18_24", "25_34", "35_44", "45_plus", "unknown"] as const;
export const COMPLETION_BUCKETS = ["0", "1_2", "3_5", "6_10", "11_plus"] as const;

/** Rows per page. Server-side paginated, so this is the only thing the browser ever receives. */
export const DIRECTORY_PAGE_SIZE = 25;

/**
 * Below this many learners, a percentage or a median says more about who happened to sign up
 * this week than about the product, so the UI shows the raw counts and states that there is not
 * enough data instead of printing a ratio.
 */
export const MIN_LEARNERS_FOR_RATES = 10;

export interface AdminUserRow {
  id: string;
  alias: string | null;
  displayName: string | null;
  country: string | null;
  /** Derived in Postgres from profiles.birth_date; the birth date itself never leaves the DB. */
  age: number | null;
  createdAt: string;
  onboarded: boolean;
  role: string;
  entitlement: EntitlementStatus;
  exercisesStarted: number;
  exercisesCompleted: number;
  level: number;
  xpTotal: number;
  lastActivity: string | null;
  isDeleted: boolean;
}

export interface AdminUserStats {
  generated_at: string;
  learners_total: number;
  by_country: { country: string; learners: number; activated: number; with_access: number }[];
  by_age_bracket: { bracket: string; learners: number }[];
  by_signup_month: { month: string; learners: number; activated: number; with_access: number }[];
  by_entitlement: { status: string; learners: number }[];
  activation: {
    started_any: number;
    completed_any: number;
    completed_median: number | null;
    completed_p90: number | null;
    distribution: { bucket: string; learners: number }[];
  };
  friction: {
    free_limit_reached_unpaid: number;
    /** Finished attempts: the denominator of quiz_pass_rate. */
    quiz_attempts_submitted: number;
    /** Opened and never finished: the abandonment signal, never part of the pass rate. */
    quiz_attempts_open: number;
    quiz_pass_rate: number | null;
    certificate_holders: number;
  };
}

export interface DirectoryParams {
  search: string;
  country: string;
  entitlement: string;
  includeDeleted: boolean;
  sort: SortKey;
  desc: boolean;
  page: number;
}

/** `%`, `_` and `\` would otherwise act as ILIKE wildcards inside the search term. */
export function escapeLikeTerm(term: string): string {
  return term.replace(/[\\%_]/g, (c) => `\\${c}`);
}

const schema = z.object({
  q: z
    .string()
    .trim()
    .max(80)
    .regex(/^[\p{L}\p{N} @._+-]*$/u)
    .catch(""),
  pais: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^([A-Z]{2})?$/)
    .catch(""),
  acceso: z.enum(ENTITLEMENT_FILTERS).optional(),
  borrados: z.enum(["1", ""]).catch(""),
  orden: z.enum(SORT_KEYS).catch("created_at"),
  dir: z.enum(["asc", "desc"]).catch("desc"),
  pagina: z.coerce.number().int().min(1).max(10000).catch(1),
});

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

/**
 * Parses the listing controls out of the query string. Every field degrades to its default
 * instead of failing, so a hand-edited or stale URL still renders the first page.
 */
export function parseDirectoryParams(
  params: Record<string, string | string[] | undefined>,
): DirectoryParams {
  const raw = {
    q: first(params.q),
    pais: first(params.pais),
    acceso: (ENTITLEMENT_FILTERS as readonly string[]).includes(first(params.acceso))
      ? first(params.acceso)
      : undefined,
    borrados: first(params.borrados) === "1" ? "1" : "",
    orden: first(params.orden),
    dir: first(params.dir),
    pagina: first(params.pagina) || 1,
  };
  const p = schema.parse(raw);
  return {
    search: p.q,
    country: p.pais,
    entitlement: p.acceso ?? "",
    includeDeleted: p.borrados === "1",
    sort: p.orden,
    desc: p.dir === "desc",
    page: p.pagina,
  };
}

/**
 * Query string (without the leading `?`) for the same listing with some controls replaced.
 * Defaults are omitted so the canonical first page has no query string at all.
 */
export function directoryQuery(
  current: DirectoryParams,
  patch: Partial<DirectoryParams> = {},
  extra: Record<string, string> = {},
): string {
  const next = { ...current, ...patch };
  const sp = new URLSearchParams();
  if (next.search) sp.set("q", next.search);
  if (next.country) sp.set("pais", next.country);
  if (next.entitlement) sp.set("acceso", next.entitlement);
  if (next.includeDeleted) sp.set("borrados", "1");
  if (next.sort !== "created_at") sp.set("orden", next.sort);
  if (!next.desc) sp.set("dir", "asc");
  if (next.page > 1) sp.set("pagina", String(next.page));
  for (const [key, value] of Object.entries(extra)) sp.set(key, value);
  return sp.toString();
}

/** Same, as a typed route for `next/link`. */
export function directoryHref(
  current: DirectoryParams,
  patch: Partial<DirectoryParams> = {},
  extra: Record<string, string> = {},
): "/admin/usuarios" | `/admin/usuarios?${string}` {
  const qs = directoryQuery(current, patch, extra);
  return qs ? `/admin/usuarios?${qs}` : "/admin/usuarios";
}

/** Clicking the active column flips the direction; a new column starts descending. */
export function nextSortState(
  current: DirectoryParams,
  key: SortKey,
): { sort: SortKey; desc: boolean; page: number } {
  return { sort: key, desc: current.sort === key ? !current.desc : true, page: 1 };
}

/** `aria-sort` value for a column header. */
export function ariaSortFor(
  current: DirectoryParams,
  key: SortKey,
): "ascending" | "descending" | "none" {
  if (current.sort !== key) return "none";
  return current.desc ? "descending" : "ascending";
}

/**
 * Percentages are only meaningful once the denominator is worth dividing by. Returns null so the
 * caller renders "not enough data yet" rather than a number the owner would act on.
 */
export function ratio(part: number, total: number, min = MIN_LEARNERS_FOR_RATES): number | null {
  if (total < min || total <= 0) return null;
  return Math.round((part / total) * 100);
}

/** Bar width for the inline (decorative) bars in the statistics tables. */
export function barPercent(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.max(2, Math.round((value / max) * 100));
}
