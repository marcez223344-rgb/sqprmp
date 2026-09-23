import "server-only";
import { features } from "@/config/features";
import { limits } from "@/config/limits";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  DIRECTORY_PAGE_SIZE,
  escapeLikeTerm,
  type AdminUserRow,
  type AdminUserStats,
  type DirectoryParams,
  type EntitlementStatus,
} from "@/lib/admin/directory";

/** Admin-only reads (the caller must have passed requireAdmin()). */
export async function getAccessAdminData() {
  const admin = createAdminClient();
  const [{ data: pending }, { data: entitlements }] = await Promise.all([
    admin
      .from("purchases")
      .select(
        "id, user_id, reference_code, channel, amount_minor, currency, created_at, profiles!purchases_user_id_fkey(alias, display_name)",
      )
      .eq("status", "pending")
      .order("created_at"),
    admin
      .from("entitlements")
      .select(
        "id, user_id, source, starts_at, ends_at, revoked_at, revoked_reason, profiles!entitlements_user_id_fkey(alias)",
      )
      .order("created_at", { ascending: false })
      .limit(50),
  ]);
  return { pending: pending ?? [], entitlements: entitlements ?? [] };
}

export interface AdminMetrics {
  generated_at: string;
  signups: { total: number; last_7d: number; last_30d: number; onboarded: number };
  learning: {
    started_exercise: number;
    completed_exercise: number;
    free_limit_reached: number;
    sections_completed: number;
    certificates_issued: number;
    quiz_pass_rate: number;
  };
  engagement: {
    wau: number;
    mau: number;
    retention_d1: number;
    retention_d7: number;
    retention_d30: number;
  };
  monetization: {
    entitled: number;
    purchases_pending: number;
    purchases_approved: number;
    refunds: number;
    revenue: Record<string, number>;
    unmatched_events: number;
    promo_redemptions: number;
  };
  hardest_exercises: { slug: string; attempts: number; solvers: number; attempters: number }[];
  frequent_sqlstates: { sqlstate: string; count: number }[];
  sections: { number: number; slug: string; completions: number }[];
}

export async function getAdminMetrics(): Promise<AdminMetrics | null> {
  const { data, error } = await createAdminClient().rpc("admin_metrics", {
    p_free_limit: limits.freeExerciseLimit,
  });
  if (error || !data) return null;
  return data as unknown as AdminMetrics;
}

export async function getPaymentEventsAdmin() {
  const admin = createAdminClient();
  const [{ data: events }, { data: prices }] = await Promise.all([
    admin
      .from("payment_events")
      .select(
        "id, provider, provider_event_id, event_type, signature_valid, status, amount_minor, currency, payment_ref, processed_at, processing_error, reconciled_at, received_at",
      )
      .order("received_at", { ascending: false })
      .limit(100),
    admin
      .from("prices")
      .select("id, provider, currency, amount_minor, products(slug)")
      .eq("is_active", true)
      .neq("provider", "manual"),
  ]);
  return { events: events ?? [], prices: prices ?? [] };
}

export async function getCertificatesAdmin() {
  const { data } = await createAdminClient()
    .from("certificates")
    .select(
      "public_id, recipient_name, issued_at, revoked_at, revoked_reason, profiles!certificates_user_id_fkey(alias), certificate_requirements(title)",
    )
    .order("issued_at", { ascending: false })
    .limit(200);
  return data ?? [];
}

export async function getFeatureFlagsAdmin() {
  const { data } = await createAdminClient()
    .from("feature_flags")
    .select("key, enabled, is_public, updated_at")
    .order("key");
  const stored = new Map((data ?? []).map((f) => [f.key, f]));
  // Static defaults from src/config/features.ts are listed even before a DB row exists.
  return Object.entries(features).map(([key, fallback]) => {
    const row = stored.get(key);
    return {
      key,
      enabled: row?.enabled ?? fallback,
      isPublic: row?.is_public ?? false,
      updatedAt: row?.updated_at ?? null,
      fromDb: Boolean(row),
    };
  });
}

export async function getPromoCodesAdmin() {
  const { data } = await createAdminClient()
    .from("promo_codes")
    .select(
      "id, code, kind, access_days, discount_percent, max_redemptions, redemptions_count, expires_at, is_active, note, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(200);
  return data ?? [];
}

export async function getAuditLogsAdmin(filter: { action?: string; target?: string } = {}) {
  let q = createAdminClient()
    .from("audit_logs")
    .select("id, actor_id, actor_role, action, target_table, target_id, diff, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (filter.action) q = q.ilike("action", `${filter.action}%`);
  // The target filter accepts either a row id or a table name; matching only the id made typing
  // "entitlements" look like an empty log. The caller validates the value against
  // /^[A-Za-z0-9:_-]{0,80}$/, so it cannot break out of the `or` expression.
  if (filter.target) q = q.or(`target_id.eq.${filter.target},target_table.eq.${filter.target}`);
  const { data } = await q;
  return data ?? [];
}

/**
 * Server-paginated user directory. Filtering, sorting, the per-user aggregates and the total row
 * count all happen inside admin_user_directory (one round trip); nothing is aggregated here, and
 * no email or birth date is part of the payload.
 */
export async function listUsersAdmin(
  params: DirectoryParams,
): Promise<{ rows: AdminUserRow[]; total: number }> {
  const { data, error } = await createAdminClient().rpc("admin_user_directory", {
    p_search: params.search ? escapeLikeTerm(params.search) : null,
    p_country: params.country || null,
    p_entitlement: params.entitlement || null,
    p_include_deleted: params.includeDeleted,
    p_sort: params.sort,
    p_desc: params.desc,
    p_limit: DIRECTORY_PAGE_SIZE,
    p_offset: (params.page - 1) * DIRECTORY_PAGE_SIZE,
  });
  if (error || !data) return { rows: [], total: 0 };
  return {
    total: data.length > 0 ? Number(data[0].total_count) : 0,
    rows: data.map((r) => ({
      id: r.id,
      alias: r.alias,
      displayName: r.display_name,
      country: r.country,
      age: r.age,
      createdAt: r.created_at,
      onboarded: r.onboarded,
      role: r.role,
      entitlement: r.entitlement as EntitlementStatus,
      exercisesStarted: r.exercises_started,
      exercisesCompleted: r.exercises_completed,
      level: r.level,
      xpTotal: r.xp_total,
      lastActivity: r.last_activity,
      isDeleted: r.is_deleted,
    })),
  };
}

/** Audience, activation and friction aggregates for /admin/metricas. */
export async function getUserStatsAdmin(): Promise<AdminUserStats | null> {
  const { data, error } = await createAdminClient().rpc("admin_user_stats", {
    p_free_limit: limits.freeExerciseLimit,
  });
  if (error || !data) return null;
  return data as unknown as AdminUserStats;
}

export async function findUsersAdmin(query: string) {
  const { data } = await createAdminClient().rpc("admin_find_user", { p_query: query });
  return data ?? [];
}

export async function getUserDetailAdmin(userId: string) {
  const admin = createAdminClient();
  const [
    { data: profile },
    { data: ents },
    { data: purchases },
    { data: certs },
    { data: totals },
    { data: directory },
    { data: found },
  ] = await Promise.all([
    admin
      .from("profiles")
      .select(
        "id, alias, display_name, role, country, created_at, onboarding_completed_at, deleted_at",
      )
      .eq("id", userId)
      .maybeSingle(),
    admin
      .from("entitlements")
      .select("id, source, starts_at, ends_at, revoked_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    admin
      .from("purchases")
      .select("id, provider, status, amount_minor, currency, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    admin
      .from("certificates")
      .select("public_id, issued_at, revoked_at, certificate_requirements(title)")
      .eq("user_id", userId),
    admin
      .from("user_totals")
      .select("xp_total, coin_balance, level")
      .eq("user_id", userId)
      .maybeSingle(),
    // The aggregates (age, access class, progress counts, last activity) come from the same
    // Postgres function as the listing, so the detail card cannot drift from the table.
    admin.rpc("admin_user_directory", {
      p_search: userId,
      p_include_deleted: true,
      p_limit: 1,
    }),
    // Email is looked up here on purpose: it is shown in the per-person detail only, never in
    // the listing or any aggregate.
    admin.rpc("admin_find_user", { p_query: userId }),
  ]);
  if (!profile) return null;
  const row = directory?.[0] ?? null;
  return {
    profile,
    email: found?.[0]?.email ?? null,
    entitlements: ents ?? [],
    purchases: purchases ?? [],
    certificates: certs ?? [],
    totals: totals ?? null,
    age: row?.age ?? null,
    entitlement: (row?.entitlement ?? "free") as EntitlementStatus,
    lastActivity: row?.last_activity ?? null,
    exercisesStarted: row?.exercises_started ?? 0,
    exercisesCompleted: row?.exercises_completed ?? 0,
  };
}
