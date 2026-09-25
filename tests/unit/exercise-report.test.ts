import { beforeEach, describe, expect, it, vi } from "vitest";
import { limits } from "@/config/limits";
import { REPORT_CATEGORIES, reportFormSchema, reportInputSchema } from "@/lib/reports/schemas";
import type { Profile } from "@/types/database";

/**
 * D-42: «Reportar un problema con este ejercicio». The schema is shared by the form and the server
 * action; the action tests pin the rules the database cannot see from the request: who is asking,
 * the rate limit, and that the stored user id is the session's, never one sent by the browser.
 */

const EXERCISE = "11111111-1111-4111-8111-111111111111";
const LEARNER = "22222222-2222-4222-8222-222222222222";
const OTHER = "33333333-3333-4333-8333-333333333333";
const note = "El resultado esperado no coincide con el enunciado.";

describe("reportFormSchema", () => {
  it("accepts every category the database accepts", () => {
    for (const category of REPORT_CATEGORIES)
      expect(reportFormSchema.safeParse({ category, note }).success).toBe(true);
  });

  it("refuses an unknown or missing category with the code the form translates", () => {
    for (const category of ["spam", undefined, ""]) {
      const r = reportFormSchema.safeParse({ category, note });
      expect(r.success).toBe(false);
      expect(r.error?.issues[0]?.message).toBe("category_required");
    }
  });

  it("trims the note and enforces the configured bounds", () => {
    const short = "x".repeat(limits.exerciseReport.noteMinLength - 1);
    expect(
      reportFormSchema.safeParse({ category: "other", note: `  ${short}  ` }).error?.issues[0]
        ?.message,
    ).toBe("note_too_short");
    const long = "x".repeat(limits.exerciseReport.noteMaxLength + 1);
    expect(
      reportFormSchema.safeParse({ category: "other", note: long }).error?.issues[0]?.message,
    ).toBe("note_too_long");
    const ok = reportFormSchema.safeParse({ category: "other", note: `  ${note}  ` });
    expect(ok.success && ok.data.note).toBe(note);
  });

  it("counts the minimum in characters, like Postgres char_length, not UTF-16 units", () => {
    // Five emoji are ten UTF-16 units but five characters: the CHECK constraint would refuse them.
    const r = reportFormSchema.safeParse({ category: "other", note: "😀😀😀😀😀" });
    expect(r.success).toBe(false);
  });
});

describe("reportInputSchema", () => {
  const base = { category: "marked_wrong", note, exerciseId: EXERCISE };

  it("requires a valid exercise id", () => {
    expect(reportInputSchema.safeParse({ ...base, exerciseId: "select-basico" }).success).toBe(
      false,
    );
  });

  it("stores an empty editor as no SQL", () => {
    const r = reportInputSchema.safeParse({ ...base, sql: "   \n " });
    expect(r.success && r.data.sql).toBeNull();
    const missing = reportInputSchema.safeParse(base);
    expect(missing.success && missing.data.sql).toBeNull();
  });

  it("cuts an overlong query to the cap instead of refusing the report", () => {
    const sql = "select 1 -- " + "x".repeat(limits.exerciseReport.sqlMaxChars);
    const r = reportInputSchema.safeParse({ ...base, sql });
    expect(r.success).toBe(true);
    expect(r.success && r.data.sql?.length).toBe(limits.exerciseReport.sqlMaxChars);
  });

  it("refuses a payload far beyond anything typed in the editor", () => {
    const sql = "x".repeat(limits.exerciseReport.sqlMaxChars * 4 + 1);
    expect(reportInputSchema.safeParse({ ...base, sql }).success).toBe(false);
  });
});

// --- Server action --------------------------------------------------------------------------

let profile: Partial<Profile> | null = null;
let rateLimitAllowed: boolean | null = true;
let exerciseRow: { id: string; slug: string; title?: string } | null = {
  id: EXERCISE,
  slug: "select-basico",
};
let insertError: { code: string } | null = null;
const inserted: unknown[] = [];

const scheduled: (() => Promise<unknown>)[] = [];

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/notifications/owner", () => ({
  notifyOwnerAfterResponse: (load: () => Promise<unknown>) => scheduled.push(load),
}));
vi.mock("@/lib/auth/session", () => ({ getCurrentProfile: async () => profile }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    rpc: async () =>
      rateLimitAllowed === null
        ? { data: null, error: { message: "down" } }
        : { data: rateLimitAllowed, error: null },
  }),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: (table: string) => {
      if (table === "exercises_public") {
        const chain = {
          select: () => chain,
          eq: () => chain,
          maybeSingle: async () => ({ data: exerciseRow, error: null }),
        };
        return chain;
      }
      return {
        insert: async (row: unknown) => {
          inserted.push(row);
          return { error: insertError };
        },
      };
    },
  }),
}));

const { reportExerciseProblemAction } = await import("@/lib/reports/actions");

describe("reportExerciseProblemAction", () => {
  beforeEach(() => {
    profile = { id: LEARNER, onboarding_completed_at: "2026-09-01T00:00:00Z", deleted_at: null };
    rateLimitAllowed = true;
    exerciseRow = { id: EXERCISE, slug: "select-basico", title: "Selección básica" };
    insertError = null;
    inserted.length = 0;
    scheduled.length = 0;
  });

  const input = {
    category: "data_error",
    note,
    exerciseId: EXERCISE,
    sql: "select * from pedidos",
  };

  it("refuses a visitor without a session or without onboarding", async () => {
    profile = null;
    expect(await reportExerciseProblemAction(input)).toEqual({ ok: false, error: "unauthorized" });
    profile = { id: LEARNER, onboarding_completed_at: null, deleted_at: null };
    expect(await reportExerciseProblemAction(input)).toEqual({ ok: false, error: "unauthorized" });
    expect(inserted).toHaveLength(0);
  });

  it("returns field errors for an invalid form without touching the database", async () => {
    const r = await reportExerciseProblemAction({ ...input, note: "mal" });
    expect(r).toMatchObject({
      ok: false,
      error: "validation",
      fieldErrors: { note: "note_too_short" },
    });
    expect(inserted).toHaveLength(0);
  });

  it("stops at the rate limit, and fails closed when the limiter errors", async () => {
    rateLimitAllowed = false;
    expect(await reportExerciseProblemAction(input)).toEqual({ ok: false, error: "rate_limited" });
    rateLimitAllowed = null;
    expect(await reportExerciseProblemAction(input)).toEqual({ ok: false, error: "rate_limited" });
    expect(inserted).toHaveLength(0);
  });

  it("refuses an exercise the learner cannot see", async () => {
    exerciseRow = null;
    expect(await reportExerciseProblemAction(input)).toEqual({ ok: false, error: "not_found" });
    expect(inserted).toHaveLength(0);
  });

  it("stores the session's user id, never one sent by the browser", async () => {
    const r = await reportExerciseProblemAction({ ...input, userId: OTHER, user_id: OTHER });
    expect(r).toEqual({ ok: true });
    expect(inserted).toEqual([
      {
        user_id: LEARNER,
        exercise_id: EXERCISE,
        exercise_slug: "select-basico",
        category: "data_error",
        note,
        learner_sql: "select * from pedidos",
      },
    ]);
  });

  it("reports a database failure as a generic error, and alerts nobody", async () => {
    insertError = { code: "23514" };
    expect(await reportExerciseProblemAction(input)).toEqual({ ok: false, error: "unknown" });
    expect(scheduled).toHaveLength(0);
  });

  it("schedules the owner alert only after the row is stored, with alias but no SQL (D-43)", async () => {
    profile = { ...profile, alias: "ana_datos" };
    expect(await reportExerciseProblemAction(input)).toEqual({ ok: true });
    expect(scheduled).toHaveLength(1);
    const event = await scheduled[0]!();
    expect(event).toEqual({
      type: "exercise_report",
      alias: "ana_datos",
      exerciseTitle: "Selección básica",
      exerciseSlug: "select-basico",
      category: "data_error",
      note,
    });
    expect(JSON.stringify(event)).not.toContain("select * from pedidos");
  });

  it("does not alert for a refused report", async () => {
    rateLimitAllowed = false;
    await reportExerciseProblemAction(input);
    exerciseRow = null;
    rateLimitAllowed = true;
    await reportExerciseProblemAction(input);
    expect(scheduled).toHaveLength(0);
  });
});
