"use server";

import { z } from "zod";
import { limits } from "@/config/limits";
import { getCurrentProfile } from "@/lib/auth/session";
import {
  requestHint,
  revealSolution,
  submitExercise,
  type SubmitResult,
} from "@/lib/exercises/service";
import { createClient } from "@/lib/supabase/server";

const idSchema = z.uuid();
const sqlSchema = z.string().max(limits.sandbox.maxSqlBytes);

export type SubmitActionResult =
  | { ok: true; result: SubmitResult }
  | {
      ok: false;
      error:
        "unauthorized" | "locked" | "rate_limited" | "not_found" | "validation" | "unavailable";
    };

export async function submitExerciseAction(
  rawExerciseId: unknown,
  rawSql: unknown,
  rawPreviousSql: unknown,
): Promise<SubmitActionResult> {
  const profile = await getCurrentProfile();
  if (!profile || !profile.onboarding_completed_at) return { ok: false, error: "unauthorized" };
  const id = idSchema.safeParse(rawExerciseId);
  const sql = sqlSchema.safeParse(rawSql);
  const previous = z
    .string()
    .max(limits.sandbox.maxSqlBytes)
    .nullable()
    .safeParse(rawPreviousSql ?? null);
  if (!id.success || !sql.success || !previous.success) return { ok: false, error: "validation" };

  const result = await submitExercise(profile, id.data, sql.data, previous.data);
  if ("error" in result) return { ok: false, error: result.error };
  return { ok: true, result };
}

export async function requestHintAction(rawExerciseId: unknown, rawLevel: unknown) {
  const profile = await getCurrentProfile();
  if (!profile) return { ok: false as const, error: "unauthorized" as const };
  const id = idSchema.safeParse(rawExerciseId);
  const level = z.number().int().min(1).max(limits.hints.levels).safeParse(rawLevel);
  if (!id.success || !level.success) return { ok: false as const, error: "validation" as const };
  const r = await requestHint(profile, id.data, level.data);
  if ("error" in r) return { ok: false as const, error: r.error };
  return { ok: true as const, hint: r.hint };
}

export async function revealSolutionAction(rawExerciseId: unknown, rawExplicit: unknown) {
  const profile = await getCurrentProfile();
  if (!profile) return { ok: false as const, error: "unauthorized" as const };
  const id = idSchema.safeParse(rawExerciseId);
  if (!id.success) return { ok: false as const, error: "validation" as const };
  const r = await revealSolution(profile, id.data, rawExplicit === true);
  if ("error" in r) return { ok: false as const, error: r.error };
  return { ok: true as const, solution: r.solution };
}

export async function saveDraftAction(rawExerciseId: unknown, rawSql: unknown) {
  const profile = await getCurrentProfile();
  if (!profile) return { ok: false as const, error: "unauthorized" as const };
  const id = idSchema.safeParse(rawExerciseId);
  const sql = sqlSchema.safeParse(rawSql);
  if (!id.success || !sql.success) return { ok: false as const, error: "validation" as const };
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_exercise_draft", {
    p_exercise_id: id.data,
    p_sql: sql.data,
  });
  return error ? { ok: false as const, error: "unknown" as const } : { ok: true as const };
}

export async function saveQueryAction(
  rawExerciseId: unknown,
  rawDatasetSlug: unknown,
  rawTitle: unknown,
  rawSql: unknown,
) {
  const profile = await getCurrentProfile();
  if (!profile) return { ok: false as const, error: "unauthorized" as const };
  const parsed = z
    .object({
      exerciseId: idSchema.nullable(),
      datasetSlug: z.string().regex(/^[a-z0-9-]{2,40}$/),
      title: z.string().trim().min(1).max(120),
      sql: sqlSchema.min(1),
    })
    .safeParse({
      exerciseId: rawExerciseId ?? null,
      datasetSlug: rawDatasetSlug,
      title: rawTitle,
      sql: rawSql,
    });
  if (!parsed.success) return { ok: false as const, error: "validation" as const };
  const supabase = await createClient();
  const { error } = await supabase.from("saved_queries").insert({
    user_id: profile.id,
    exercise_id: parsed.data.exerciseId,
    dataset_slug: parsed.data.datasetSlug,
    title: parsed.data.title,
    sql: parsed.data.sql,
  });
  return error ? { ok: false as const, error: "unknown" as const } : { ok: true as const };
}
