"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { track } from "@/lib/analytics/track";
import { countries } from "@/config/countries";
import { legal } from "@/config/legal";
import { limits } from "@/config/limits";
import { safeNextPath } from "@/lib/auth/redirect";
import { getCurrentUser } from "@/lib/auth/session";
import { aliasSchema, onboardingSchema, profileUpdateSchema } from "@/lib/profile/schemas";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type ActionResult<T = undefined> =
  { ok: true; data?: T } | { ok: false; error: string; fieldErrors?: Record<string, string> };

async function isRateLimited(key: string, rule: { capacity: number; refillPerSecond: number }) {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("consume_rate_limit", {
    p_key: key,
    p_capacity: rule.capacity,
    p_refill_per_second: rule.refillPerSecond,
  });
  // Fail closed: if the limiter itself errors, treat as limited.
  return Boolean(error) || data === false;
}

function fieldErrorsFrom(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return fieldErrors;
}

/** Live alias availability for the onboarding form. */
export async function checkAlias(raw: unknown): Promise<ActionResult<{ available: boolean }>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthorized" };

  const parsed = aliasSchema.safeParse(raw);
  if (!parsed.success) return { ok: true, data: { available: false } };

  if (await isRateLimited(`alias:${user.id}`, limits.rateLimits.aliasCheck)) {
    return { ok: false, error: "rate_limited" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("check_alias_available", { candidate: parsed.data });
  if (error) return { ok: false, error: "unknown" };
  return { ok: true, data: { available: data === true } };
}

export async function completeOnboarding(raw: unknown, next?: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthorized" };

  const parsed = onboardingSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "validation", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const v = parsed.data;
  const timezone = countries.find((c) => c.code === v.country)?.timezone ?? "UTC";
  const supabase = await createClient();
  const { error } = await supabase.rpc("complete_onboarding", {
    payload: {
      display_name: v.display_name,
      alias: v.alias,
      avatar_id: v.avatar_id,
      country: v.country,
      birth_date: v.birth_date,
      gender: v.gender || null,
      sql_level: v.sql_level,
      main_goal: v.main_goal,
      weekly_goal_minutes: v.weekly_goal_minutes,
      timezone,
      accept_terms: v.accept_terms,
      accept_privacy: v.accept_privacy,
      terms_version: legal.termsVersion,
      privacy_version: legal.privacyVersion,
    },
  });

  if (error) {
    // The RPC raises with a stable machine code in `detail` (see migration 20260918180000).
    const detail = error.details ?? "";
    if (detail.includes("alias_unavailable")) {
      return { ok: false, error: "validation", fieldErrors: { alias: "alias_taken" } };
    }
    if (detail.includes("avatar_invalid")) {
      return { ok: false, error: "validation", fieldErrors: { avatar_id: "avatar_invalid" } };
    }
    if (detail.includes("consent_required")) {
      return { ok: false, error: "validation", fieldErrors: { accept_terms: "consent_required" } };
    }
    return { ok: false, error: "unknown" };
  }
  await track(
    "onboarding_completed",
    {
      sql_level: v.sql_level ?? null,
      main_goal: v.main_goal ?? null,
      weekly_goal_minutes: v.weekly_goal_minutes ?? null,
      age_band: ageBand(v.birth_date),
    },
    { userId: user.id },
  );

  redirect(safeNextPath(next));
}

export async function updateProfile(raw: unknown): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthorized" };

  const parsed = profileUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "validation", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const v = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: v.display_name,
      certificate_name: v.certificate_name,
      avatar_id: v.avatar_id,
      country: v.country,
      gender: v.gender || null,
      sql_level: v.sql_level,
      main_goal: v.main_goal,
      weekly_goal_minutes: v.weekly_goal_minutes,
      timezone: v.timezone,
      leaderboard_opt_in: v.leaderboard_opt_in,
    })
    .eq("id", user.id);
  if (error) return { ok: false, error: "unknown" };
  return { ok: true };
}

const requestTypeSchema = z.enum(["export", "deletion"]);

export async function requestDataAction(rawType: unknown): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthorized" };
  const type = requestTypeSchema.safeParse(rawType);
  if (!type.success) return { ok: false, error: "validation" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("data_requests")
    .insert({ user_id: user.id, type: type.data });
  if (error) {
    // Unique partial index: one pending request per type.
    if (error.code === "23505") return { ok: false, error: "already_pending" };
    return { ok: false, error: "unknown" };
  }
  return { ok: true };
}

export async function cancelDataRequest(rawId: unknown): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthorized" };
  const id = z.uuid().safeParse(rawId);
  if (!id.success) return { ok: false, error: "validation" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("data_requests")
    .update({ status: "cancelled" })
    .eq("id", id.data)
    .eq("user_id", user.id)
    .eq("status", "pending");
  if (error) return { ok: false, error: "unknown" };
  return { ok: true };
}

/** Coarse age band for analytics; the birth date itself is never sent. */
function ageBand(birthDate: Date | string | null | undefined): string | null {
  if (!birthDate) return null;
  const d = birthDate instanceof Date ? birthDate : new Date(birthDate);
  if (Number.isNaN(d.getTime())) return null;
  const age = Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000));
  if (age < 25) return "18-24";
  if (age < 35) return "25-34";
  if (age < 45) return "35-44";
  return "45+";
}
