import "server-only";
import { timingSafeEqual } from "node:crypto";
import { limits } from "@/config/limits";
import { serverEnv } from "@/lib/env/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Reports what the privileged client actually sees for one exercise: whether it can read the
 * exercise at all, whether the exercise is gated, and what `can_access_exercise` answers.
 *
 * Returns error text from Postgres verbatim; it contains no learner data and no secrets, and it is
 * the only way to tell a real paywall from a broken service-role key on a deployment.
 */
export async function accessHealth(
  authorization: string | null,
  slug: string,
): Promise<{ status: number; body: Record<string, unknown> }> {
  if (!authorized(authorization)) return { status: 401, body: { error: "unauthorized" } };
  const admin = createAdminClient();
  // Shape only, never the value: enough to tell "the new key never reached this build" from
  // "the key reached it and the project rejects it", which look identical from the UI.
  const key = serverEnv().SUPABASE_SECRET_KEY;
  const keyShape = {
    kind: key.startsWith("sb_secret_")
      ? "sb_secret"
      : key.startsWith("ey")
        ? "legacy_jwt"
        : "other",
    length: key.length,
    build: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
  };

  const { data: exercise, error: exerciseError } = await admin
    .from("exercises")
    .select("id, slug, lesson_id, is_published")
    .eq("slug", slug)
    .maybeSingle();
  if (exerciseError || !exercise)
    return {
      status: 503,
      body: {
        ok: false,
        step: "read_exercise",
        error: exerciseError?.message ?? "not found",
        keyShape,
      },
    };

  const { data: lesson } = await admin
    .from("lessons")
    .select("slug, is_free, section_id")
    .eq("id", exercise.lesson_id ?? "")
    .maybeSingle();
  const { data: gated, error: gatedError } = await admin.rpc("exercise_is_gated", {
    p_exercise_id: exercise.id,
  });
  const { count: hintCount } = await admin
    .from("exercise_hints")
    .select("level", { count: "exact", head: true })
    .eq("exercise_id", exercise.id);

  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .order("created_at")
    .limit(1)
    .maybeSingle();
  let access: { value: unknown; error: string | null } | null = null;
  if (profile) {
    const { data, error } = await admin.rpc("can_access_exercise", {
      p_user_id: profile.id,
      p_exercise_id: exercise.id,
      p_free_limit: limits.freeExerciseLimit,
    });
    access = { value: data, error: error?.message ?? null };
  }

  return {
    status: 200,
    body: {
      ok: true,
      keyShape,
      slug: exercise.slug,
      is_published: exercise.is_published,
      lesson: lesson ? { slug: lesson.slug, is_free: lesson.is_free } : null,
      gated,
      gatedError: gatedError?.message ?? null,
      hints: hintCount ?? 0,
      access,
    },
  };
}

function authorized(authorization: string | null): boolean {
  const expected = `Bearer ${serverEnv().CRON_SECRET}`;
  if (!authorization || authorization.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(authorization), Buffer.from(expected));
}
