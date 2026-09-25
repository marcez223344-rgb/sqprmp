import "server-only";
import { createHash } from "node:crypto";
import { cache } from "react";
import type { FeedbackCategory } from "@/content/schemas/common";
import { limits } from "@/config/limits";
import { workerEngine } from "@/lib/sandbox/engines/worker-engine";
import type { SandboxOutcome } from "@/lib/sandbox/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { ExpectedColumn } from "@/lib/validation/compare";
import type { FeedbackItem } from "@/lib/validation/feedback";
import { gradeSubmission, type StoredValidationRules } from "@/lib/validation/grade";
import { syncExerciseLessonProgress } from "@/lib/progress/lesson-sync";
import { awardExerciseCompletion, touchActivity, type AwardOutcome } from "@/lib/rewards/service";
import { settleSectionCompletion } from "@/lib/quizzes/service";
import { track } from "@/lib/analytics/track";
import { isSolutionUnlockable } from "./unlock";
import type { Database, Json, Profile } from "@/types/database";

type ExercisePublic = Database["public"]["Views"]["exercises_public"]["Row"];
type ProgressRow = Database["public"]["Tables"]["exercise_progress"]["Row"];

export interface ExerciseWorkspaceData {
  exercise: ExercisePublic & { id: string; slug: string };
  lessonSlug: string | null;
  section: { slug: string; number: number; title: string };
  dataset: { slug: string; version: number; title: string; today: string | null };
  schema: {
    name: string;
    description: string;
    columns: {
      name: string;
      data_type: string;
      description: string;
      is_pk: boolean;
      fk_ref: string | null;
    }[];
  }[];
  progress: ProgressRow | null;
  hints: { level: number; body_md: string }[];
  solution: {
    sql: string;
    explanation_md: string;
    alternatives: { label: string; sql: string }[];
  } | null;
  access: "ok" | "locked" | "unavailable";
  freeUsed: number;
  /** False for the always-free intro sections; the free counter is meaningless there. */
  gated: boolean;
  freeLimit: number;
  nextLessonSlug: string | null;
  theoryLessonSlug: string | null;
}

/** Everything the workspace page needs, with secrets only included when already unlocked. */
export const getExerciseWorkspace = cache(
  async (slug: string, profile: Profile): Promise<ExerciseWorkspaceData | null> => {
    const supabase = await createClient();
    const { data: exercise } = await supabase
      .from("exercises_public")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();
    if (!exercise?.id || !exercise.slug || !exercise.section_id || !exercise.dataset_id)
      return null;
    const exerciseId = exercise.id;

    const [
      { data: section },
      { data: dataset },
      { data: tables },
      { data: progress },
      { data: accessValue },
      { data: freeUsed },
      { data: gated },
      { data: lessons },
    ] = await Promise.all([
      supabase
        .from("sections")
        .select("slug, number, title")
        .eq("id", exercise.section_id)
        .single(),
      supabase
        .from("datasets")
        .select("slug, version, title")
        .eq("id", exercise.dataset_id)
        .single(),
      supabase
        .from("dataset_tables")
        .select(
          "id, name, description, sort_order, dataset_columns(name, data_type, description, is_pk, fk_ref, sort_order)",
        )
        .eq("dataset_id", exercise.dataset_id)
        .order("sort_order"),
      supabase
        .from("exercise_progress")
        .select("*")
        .eq("user_id", profile.id)
        .eq("exercise_id", exerciseId)
        .maybeSingle(),
      supabase.rpc("can_access_exercise", {
        p_user_id: profile.id,
        p_exercise_id: exerciseId,
        p_free_limit: limits.freeExerciseLimit,
      }),
      supabase.rpc("free_exercises_used", { p_user_id: profile.id }),
      supabase.rpc("exercise_is_gated", { p_exercise_id: exercise.id }),
      supabase
        .from("lessons_public")
        .select("slug, kind, sort_order, ref_slug")
        .eq("section_id", exercise.section_id)
        .order("sort_order"),
    ]);
    if (!section || !dataset) return null;

    const access = (accessValue as "ok" | "locked" | "unavailable" | null) ?? "unavailable";
    const admin = createAdminClient();

    // Hints already unlocked and the solution (only after reveal) are read with the admin client.
    let hints: { level: number; body_md: string }[] = [];
    let solution: ExerciseWorkspaceData["solution"] = null;
    if (access === "ok" && progress) {
      if (progress.hints_used > 0) {
        const { data } = await admin
          .from("exercise_hints")
          .select("level, body_md")
          .eq("exercise_id", exerciseId)
          .lte("level", progress.hints_used)
          .order("level");
        hints = data ?? [];
      }
      if (progress.solution_revealed_at) solution = await readSolution(exerciseId);
    }

    const sorted = (lessons ?? []).filter((l) => l.slug);
    const thisIndex = sorted.findIndex((l) => l.kind !== "quiz" && l.ref_slug === exercise.slug);
    const nextLessonSlug = thisIndex >= 0 ? (sorted[thisIndex + 1]?.slug ?? null) : null;

    return {
      exercise: exercise as ExercisePublic & { id: string; slug: string },
      lessonSlug: thisIndex >= 0 ? (sorted[thisIndex]?.slug ?? null) : null,
      section,
      dataset: { ...dataset, today: null },
      schema: (tables ?? []).map((t) => ({
        name: t.name,
        description: t.description,
        columns: [...(t.dataset_columns ?? [])]
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((c) => ({
            name: c.name,
            data_type: c.data_type,
            description: c.description,
            is_pk: c.is_pk,
            fk_ref: c.fk_ref,
          })),
      })),
      progress: progress ?? null,
      hints,
      solution,
      access,
      freeUsed: typeof freeUsed === "number" ? freeUsed : 0,
      gated: gated !== false,
      freeLimit: limits.freeExerciseLimit,
      nextLessonSlug,
      theoryLessonSlug: exercise.theory_ref_slug,
    };
  },
);

async function readSolution(exerciseId: string): Promise<ExerciseWorkspaceData["solution"]> {
  const admin = createAdminClient();
  const [{ data: solutions }, { data: ex }] = await Promise.all([
    admin
      .from("exercise_solutions")
      .select("sql, is_reference, approach_label, sort_order")
      .eq("exercise_id", exerciseId)
      .order("sort_order"),
    admin.from("exercises").select("expert_explanation_md").eq("id", exerciseId).single(),
  ]);
  const reference = solutions?.find((s) => s.is_reference);
  if (!reference || !ex) return null;
  return {
    sql: reference.sql,
    explanation_md: ex.expert_explanation_md,
    alternatives: (solutions ?? [])
      .filter((s) => !s.is_reference)
      .map((s) => ({ label: s.approach_label ?? "Alternativa", sql: s.sql })),
  };
}

/** Records that the learner opened a gated exercise (consumes a free slot; idempotent). */
export async function ensureExerciseStarted(profile: Profile, exerciseId: string): Promise<void> {
  const { error } = await createAdminClient().rpc("start_exercise", {
    p_user_id: profile.id,
    p_exercise_id: exerciseId,
  });
  // Swallowing this silently made every later access check look like a paywall: without the
  // progress row the learner appears never to have opened the exercise.
  if (error) console.error("[exercises] start_exercise failed", error.message);
  // The learning path reads lesson rows, so an exercise that was started has to show up there too.
  await syncExerciseLessonProgress(profile.id, exerciseId, false);
}

/**
 * The access check every learner-triggered action runs first.
 *
 * A failed call is not a paywall. Telling someone to pay because an RPC broke is the worst
 * possible error message, and it is exactly what the three actions below used to do, because a
 * null result is `!== "ok"`. Failures now come back as "unavailable" and are logged.
 */
async function checkAccess(
  profile: Profile,
  exerciseId: string,
): Promise<"ok" | "locked" | "unavailable" | "failed"> {
  const { data, error } = await createAdminClient().rpc("can_access_exercise", {
    p_user_id: profile.id,
    p_exercise_id: exerciseId,
    p_free_limit: limits.freeExerciseLimit,
  });
  if (error || data === null) {
    console.error("[exercises] can_access_exercise failed", error?.message ?? "null result");
    return "failed";
  }
  return data as "ok" | "locked" | "unavailable";
}

export interface SubmitResult {
  outcome: SandboxOutcome;
  correct: boolean;
  firstCompletion: boolean;
  feedback: FeedbackItem[];
  attemptsCount: number;
  genuineAttemptsCount: number;
  solutionUnlockable: boolean;
  reward: AwardOutcome | null;
}

async function exerciseSlug(exerciseId: string): Promise<string> {
  const { data } = await createAdminClient()
    .from("exercises")
    .select("slug")
    .eq("id", exerciseId)
    .single();
  return data?.slug ?? "unknown";
}

async function consume(
  key: string,
  rule: { capacity: number; refillPerSecond: number },
): Promise<boolean> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("consume_rate_limit", {
    p_key: key,
    p_capacity: rule.capacity,
    p_refill_per_second: rule.refillPerSecond,
  });
  return !error && data === true;
}

/**
 * Graded submission. Order (docs/SQL_SANDBOX.md §4): authorize → rate limit → gate →
 * execute in the isolated engine → compare with stored expected result → feedback → persist.
 */
export async function submitExercise(
  profile: Profile,
  exerciseId: string,
  sql: string,
  previousSql: string | null,
): Promise<
  SubmitResult | { error: "unauthorized" | "locked" | "rate_limited" | "not_found" | "unavailable" }
> {
  const admin = createAdminClient();
  const access = await checkAccess(profile, exerciseId);
  if (access === "failed") return { error: "unavailable" };
  if (access === "unavailable") return { error: "not_found" };
  if (access !== "ok") return { error: "locked" };
  if (!(await consume(`submit:${profile.id}`, limits.rateLimits.submit)))
    return { error: "rate_limited" };

  const [{ data: ex }, { data: expected }] = await Promise.all([
    admin
      .from("exercises")
      .select(
        "id, slug, section_id, dataset_id, dataset_version, allowed_statements, expected_columns, validation_rules, common_mistakes, improvement_feedback, reward_config, datasets(slug)",
      )
      .eq("id", exerciseId)
      .single(),
    admin
      .from("exercise_expected_results")
      .select("columns, rows")
      .eq("exercise_id", exerciseId)
      .maybeSingle(),
  ]);
  if (!ex || !expected) return { error: "not_found" };
  const datasetSlug = (ex.datasets as { slug: string } | null)?.slug;
  if (!datasetSlug) return { error: "not_found" };

  await ensureExerciseStarted(profile, exerciseId);

  const allowed = (ex.allowed_statements ?? ["select"]) as (
    "select" | "insert" | "update" | "delete"
  )[];
  const { outcome, correct, feedback } = await gradeSubmission({
    engine: workerEngine,
    dataset: { slug: datasetSlug, version: ex.dataset_version },
    sql,
    allowedStatements: allowed,
    expected: { columns: expected.columns as never, rows: expected.rows as never },
    expectedColumns: ex.expected_columns as unknown as ExpectedColumn[],
    validationRules: ex.validation_rules as StoredValidationRules,
    commonMistakeCategories: ((ex.common_mistakes as { category: FeedbackCategory }[]) ?? []).map(
      (m) => m.category,
    ),
    improvementConditions:
      (ex.improvement_feedback as { condition: string; message_key: string }[]) ?? [],
  });
  const sqlHash = createHash("sha256").update(sql).digest("hex");
  const isGenuine = Boolean(sql.trim()) && sql.trim() !== (previousSql ?? "").trim();

  const status = !outcome.ok ? "error" : correct ? "correct" : "incorrect";
  const { data: recorded } = await admin.rpc("record_attempt", {
    p_user_id: profile.id,
    p_exercise_id: exerciseId,
    p_sql: sql,
    p_status: status,
    p_feedback: feedback as unknown as Json,
    p_execution_ms: outcome.ok ? outcome.durationMs : null,
    p_row_count: outcome.ok ? outcome.rowCount : null,
    p_is_genuine: isGenuine && outcome.ok,
  });
  const rec = recorded?.[0];
  await admin.rpc("log_query_execution", {
    p_user_id: profile.id,
    p_attempt_id: rec?.attempt_id ?? null,
    p_dataset_slug: datasetSlug,
    p_engine: "server",
    p_sql_sha256: sqlHash,
    p_sql_length: sql.length,
    p_duration_ms: outcome.ok ? outcome.durationMs : null,
    p_status: outcome.ok
      ? "ok"
      : outcome.code === "timeout"
        ? "timeout"
        : outcome.code === "gate"
          ? "gate"
          : "error",
    p_sqlstate: outcome.ok ? null : (outcome.sqlstate ?? null),
  });

  const { data: progress } = await admin
    .from("exercise_progress")
    .select("*")
    .eq("user_id", profile.id)
    .eq("exercise_id", exerciseId)
    .single();
  await touchActivity(profile);
  await track(
    "exercise_submitted",
    {
      exercise_slug: ex.slug,
      status,
      attempt_number: rec?.attempts_count ?? 1,
      feedback_categories: feedback.map((f) => f.category),
    },
    { userId: profile.id },
  );

  // Rewards are paid exactly once per exercise (ledger key), server-side, after persistence.
  let reward: AwardOutcome | null = null;
  if (rec?.first_completion && progress) {
    // First completion is also what completes the lesson on the learning path.
    await syncExerciseLessonProgress(profile.id, exerciseId, true);
    const cfg = ex.reward_config as {
      xp?: number;
      coins?: number;
      solution_reveal_xp_percent?: number;
    } | null;
    reward = await awardExerciseCompletion(
      profile,
      exerciseId,
      {
        xp: cfg?.xp ?? 0,
        coins: cfg?.coins ?? 0,
        solution_reveal_xp_percent:
          cfg?.solution_reveal_xp_percent ?? limits.solutionUnlock.xpPercentAfterReveal,
      },
      progress.hints_used,
      Boolean(progress.solution_revealed_at),
    );
    await track(
      "exercise_completed",
      {
        exercise_slug: ex.slug,
        attempts: progress.attempts_count,
        hints_used: progress.hints_used,
        solution_revealed: Boolean(progress.solution_revealed_at),
        minutes: Math.round((Date.now() - Date.parse(progress.started_at)) / 60_000),
      },
      { userId: profile.id },
    );
    for (const badge of reward?.newBadges ?? [])
      await track("badge_earned", { badge_slug: badge }, { userId: profile.id });
    // Section completion is evaluated after every first completion (idempotent reward).
    if (ex.section_id) await settleSectionCompletion(profile, ex.section_id);
  }

  return {
    outcome,
    correct,
    firstCompletion: Boolean(rec?.first_completion),
    feedback,
    attemptsCount: rec?.attempts_count ?? 0,
    genuineAttemptsCount: rec?.genuine_attempts_count ?? 0,
    solutionUnlockable: progress ? isSolutionUnlockable(progress) : false,
    reward,
  };
}

export async function requestHint(
  profile: Profile,
  exerciseId: string,
  level: number,
): Promise<
  | { hint: { level: number; body_md: string } }
  | { error: "unauthorized" | "locked" | "rate_limited" | "sequence" | "not_found" | "unavailable" }
> {
  const admin = createAdminClient();
  const access = await checkAccess(profile, exerciseId);
  if (access === "failed") return { error: "unavailable" };
  if (access !== "ok") return { error: access === "unavailable" ? "not_found" : "locked" };
  // Opening the hint panel must not depend on the page having created the progress row first;
  // unlock_hint writes against it.
  await ensureExerciseStarted(profile, exerciseId);
  if (!(await consume(`hint:${profile.id}`, limits.rateLimits.hint)))
    return { error: "rate_limited" };
  const { data, error } = await admin.rpc("unlock_hint", {
    p_user_id: profile.id,
    p_exercise_id: exerciseId,
    p_level: level,
  });
  if (error) return { error: error.details?.includes("hint_sequence") ? "sequence" : "not_found" };
  const row = data?.[0];
  if (!row) return { error: "not_found" };
  await track(
    "hint_requested",
    { exercise_slug: await exerciseSlug(exerciseId), level },
    { userId: profile.id },
  );
  return { hint: { level, body_md: row.body_md } };
}

export async function revealSolution(
  profile: Profile,
  exerciseId: string,
  explicit: boolean,
): Promise<
  | { solution: NonNullable<ExerciseWorkspaceData["solution"]> }
  | { error: "unauthorized" | "locked" | "not_unlockable" | "not_found" | "unavailable" }
> {
  const admin = createAdminClient();
  const access = await checkAccess(profile, exerciseId);
  if (access === "failed") return { error: "unavailable" };
  if (access !== "ok") return { error: access === "unavailable" ? "not_found" : "locked" };
  await ensureExerciseStarted(profile, exerciseId);
  const { data: progress } = await admin
    .from("exercise_progress")
    .select("*")
    .eq("user_id", profile.id)
    .eq("exercise_id", exerciseId)
    .single();
  if (!progress) return { error: "not_found" };
  const unlockable = isSolutionUnlockable(progress);
  if (!unlockable && !(explicit && limits.solutionUnlock.allowExplicitReveal))
    return { error: "not_unlockable" };
  const reason =
    progress.status === "completed"
      ? "attempts"
      : progress.genuine_attempts_count >= limits.solutionUnlock.minGenuineAttempts
        ? "attempts"
        : progress.hints_used >= limits.solutionUnlock.minHintsRequested
          ? "hints"
          : unlockable
            ? "time"
            : "explicit";
  await admin.rpc("reveal_solution", {
    p_user_id: profile.id,
    p_exercise_id: exerciseId,
    p_reason: reason,
  });
  const solution = await readSolution(exerciseId);
  if (!solution) return { error: "not_found" };
  await track(
    "solution_revealed",
    { exercise_slug: await exerciseSlug(exerciseId), reason },
    { userId: profile.id },
  );
  return { solution };
}
