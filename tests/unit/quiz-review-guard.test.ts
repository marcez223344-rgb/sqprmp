import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Profile } from "@/types/database";

/**
 * Regression tests for security review F-2 (2026-09-23): `gradeReviewQuestion` used to reveal
 * `correctAnswer`, the explanation and the distractor rationale for *any* published question to any
 * signed-in learner, which turned review practice into an answer-key oracle for the whole bank.
 * Review now means reviewing something the learner actually answered.
 */

/** Minimal thenable stand-in for a PostgREST query builder: every method chains, awaiting resolves. */
function query(result: unknown): unknown {
  const target = { then: (res: (v: unknown) => unknown) => Promise.resolve(result).then(res) };
  return new Proxy(target, {
    get(t, prop) {
      if (prop === "then") return t.then;
      return () => query(result);
    },
  });
}

const tables: Record<string, unknown> = {};
const rpcs: Record<string, unknown> = {};

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => query(tables[table] ?? { data: null, error: null }),
    rpc: (name: string) => query(rpcs[name] ?? { data: null, error: null }),
  }),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: (table: string) => query(tables[table] ?? { data: null, error: null }),
  }),
}));
vi.mock("@/lib/analytics/track", () => ({ track: vi.fn() }));

const { gradeReviewQuestion } = await import("@/lib/quizzes/service");

const QUESTION = "11111111-1111-1111-1111-111111111111";
const profile = { id: "22222222-2222-2222-2222-222222222222", timezone: "UTC" } as Profile;

function publishedQuestion() {
  tables.questions_public = { data: { id: QUESTION }, error: null };
  tables.theory_questions = {
    data: [
      {
        id: QUESTION,
        type: "single",
        answer: null,
        pairs: null,
        explanation_md: "PISTA DE LA EXPLICACIÓN",
      },
    ],
    error: null,
  };
  tables.question_options = {
    data: [
      { question_id: QUESTION, key: "a", is_correct: false, why_incorrect_md: "por esto no" },
      { question_id: QUESTION, key: "b", is_correct: true, why_incorrect_md: null },
    ],
    error: null,
  };
}

beforeEach(() => {
  for (const key of Object.keys(tables)) delete tables[key];
  for (const key of Object.keys(rpcs)) delete rpcs[key];
  rpcs.consume_rate_limit = { data: true, error: null };
});

describe("gradeReviewQuestion", () => {
  it("refuses a question the learner never answered (F-2)", async () => {
    publishedQuestion();
    tables.quiz_answers = { data: null, error: null };
    expect(await gradeReviewQuestion(profile, QUESTION, "b")).toBeNull();
  });

  it("reveals the answer only for a question already answered", async () => {
    publishedQuestion();
    tables.quiz_answers = { data: { question_id: QUESTION }, error: null };
    const feedback = await gradeReviewQuestion(profile, QUESTION, "b");
    expect(feedback).not.toBeNull();
    expect(feedback?.correct).toBe(true);
    expect(feedback?.correctAnswer).toBe("b");
    expect(feedback?.explanation_md).toBe("PISTA DE LA EXPLICACIÓN");
  });

  it("returns the distractor rationale for the option the learner picked", async () => {
    publishedQuestion();
    tables.quiz_answers = { data: { question_id: QUESTION }, error: null };
    const feedback = await gradeReviewQuestion(profile, QUESTION, "a");
    expect(feedback?.correct).toBe(false);
    expect(feedback?.whyIncorrect_md).toBe("por esto no");
  });

  it("refuses an unpublished or unknown question without touching the answer key", async () => {
    tables.questions_public = { data: null, error: null };
    tables.quiz_answers = { data: { question_id: QUESTION }, error: null };
    expect(await gradeReviewQuestion(profile, QUESTION, "b")).toBeNull();
  });

  it("refuses when the rate limit is exhausted", async () => {
    publishedQuestion();
    tables.quiz_answers = { data: { question_id: QUESTION }, error: null };
    rpcs.consume_rate_limit = { data: false, error: null };
    expect(await gradeReviewQuestion(profile, QUESTION, "b")).toBeNull();
  });
});
