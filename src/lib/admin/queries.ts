import "server-only";
import { features } from "@/config/features";
import { limits } from "@/config/limits";
import { createAdminClient } from "@/lib/supabase/admin";

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
  if (filter.target) q = q.eq("target_id", filter.target);
  const { data } = await q;
  return data ?? [];
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
    { data: progress },
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
    admin.from("exercise_progress").select("status").eq("user_id", userId),
  ]);
  if (!profile) return null;
  return {
    profile,
    entitlements: ents ?? [],
    purchases: purchases ?? [],
    certificates: certs ?? [],
    totals: totals ?? null,
    exercisesStarted: progress?.length ?? 0,
    exercisesCompleted: (progress ?? []).filter((p) => p.status === "completed").length,
  };
}
