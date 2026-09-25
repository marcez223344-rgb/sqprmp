"use server";

import { revalidatePath } from "next/cache";
import { limits } from "@/config/limits";
import { getCurrentProfile } from "@/lib/auth/session";
import { notifyOwnerAfterResponse } from "@/lib/notifications/owner";
import { reportInputSchema } from "@/lib/reports/schemas";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type ReportActionResult =
  | { ok: true }
  | {
      ok: false;
      error: "unauthorized" | "validation" | "rate_limited" | "not_found" | "unknown";
      /** Zod message codes per field, translated by the form (`workspace.report.errors.*`). */
      fieldErrors?: Record<string, string>;
    };

async function isRateLimited(key: string) {
  const { data, error } = await createAdminClient().rpc("consume_rate_limit", {
    p_key: key,
    p_capacity: limits.rateLimits.exerciseReport.capacity,
    p_refill_per_second: limits.rateLimits.exerciseReport.refillPerSecond,
  });
  // Fail closed, like every other bucket: a limiter error is treated as limited.
  return Boolean(error) || data === false;
}

/**
 * «Reportar un problema con este ejercicio» (D-42). The report is private: it is written with the
 * learner's own session, so RLS (`exercise_reports: owner inserts own`) is what guarantees the row
 * carries their id, and only admins can read it back besides them.
 */
export async function reportExerciseProblemAction(raw: unknown): Promise<ReportActionResult> {
  const profile = await getCurrentProfile();
  if (!profile || profile.deleted_at || !profile.onboarding_completed_at)
    return { ok: false, error: "unauthorized" };

  const parsed = reportInputSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".");
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, error: "validation", fieldErrors };
  }

  if (await isRateLimited(`exercise-report:${profile.id}`))
    return { ok: false, error: "rate_limited" };

  const supabase = await createClient();
  // Only exercises a learner can see can be reported; the slug is resolved again by the database.
  const { data: exercise } = await supabase
    .from("exercises_public")
    .select("id, slug, title")
    .eq("id", parsed.data.exerciseId)
    .maybeSingle();
  if (!exercise?.id || !exercise.slug) return { ok: false, error: "not_found" };

  const { error } = await supabase.from("exercise_reports").insert({
    user_id: profile.id,
    exercise_id: exercise.id,
    exercise_slug: exercise.slug,
    category: parsed.data.category,
    note: parsed.data.note,
    learner_sql: parsed.data.sql,
  });
  if (error) return { ok: false, error: "unknown" };

  // Owner alert (D-43): only after the row exists, and after the response, so an email problem
  // can neither slow nor fail the learner's report. No SQL and no email address in it.
  const { alias } = profile;
  const { note, category } = parsed.data;
  const { slug, title } = exercise;
  notifyOwnerAfterResponse(async () => ({
    type: "exercise_report",
    alias,
    exerciseTitle: title ?? null,
    exerciseSlug: slug,
    category,
    note,
  }));

  revalidatePath("/admin/reportes");
  revalidatePath("/admin");
  return { ok: true };
}
