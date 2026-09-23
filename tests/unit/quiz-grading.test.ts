import { describe, expect, it } from "vitest";
import {
  gradeAnswer,
  passThreshold,
  scorePercent,
  shuffle,
  type AnswerKey,
} from "@/lib/quizzes/grading";

describe("gradeAnswer", () => {
  it("grades single-choice family by exact option key", () => {
    const key: AnswerKey = { type: "single", correctOptionKeys: ["b"] };
    expect(gradeAnswer(key, "b")).toBe(true);
    expect(gradeAnswer(key, "a")).toBe(false);
    expect(gradeAnswer(key, ["b"])).toBe(false);
    expect(gradeAnswer(key, null)).toBe(false);
    for (const type of [
      "true_false",
      "query_interpretation",
      "error_diagnosis",
      "scenario",
    ] as const)
      expect(gradeAnswer({ ...key, type }, "b")).toBe(true);
  });

  it("rejects single-choice keys with multiple correct options (content error, never a free pass)", () => {
    expect(gradeAnswer({ type: "single", correctOptionKeys: ["a", "b"] }, "a")).toBe(false);
  });

  it("multiple requires the exact set, order-insensitive, duplicates ignored", () => {
    const key: AnswerKey = { type: "multiple", correctOptionKeys: ["a", "c"] };
    expect(gradeAnswer(key, ["c", "a"])).toBe(true);
    expect(gradeAnswer(key, ["a", "a", "c"])).toBe(true);
    expect(gradeAnswer(key, ["a"])).toBe(false);
    expect(gradeAnswer(key, ["a", "b", "c"])).toBe(false);
    expect(gradeAnswer(key, "a")).toBe(false);
  });

  it("fill_blank normalizes whitespace and case unless case_sensitive", () => {
    const key: AnswerKey = {
      type: "fill_blank",
      correctOptionKeys: [],
      accepted: { accepted: ["customer_id", "id_cliente"] },
    };
    expect(gradeAnswer(key, "  Customer_ID ")).toBe(true);
    expect(gradeAnswer(key, "id  cliente")).toBe(false);
    expect(gradeAnswer(key, "id_cliente")).toBe(true);
    const strict: AnswerKey = {
      ...key,
      accepted: { accepted: ["SELECT"], case_sensitive: true },
    };
    expect(gradeAnswer(strict, "select")).toBe(false);
    expect(gradeAnswer(strict, "SELECT")).toBe(true);
    expect(gradeAnswer({ ...key, accepted: null }, "x")).toBe(false);
  });

  it("matching requires every pair, case-insensitive on the right side", () => {
    const key: AnswerKey = {
      type: "matching",
      correctOptionKeys: [],
      pairs: [
        { left: "PK", right: "Clave primaria" },
        { left: "FK", right: "Clave foránea" },
      ],
    };
    expect(gradeAnswer(key, { PK: "clave primaria", FK: "Clave foránea" })).toBe(true);
    expect(gradeAnswer(key, { PK: "Clave foránea", FK: "Clave primaria" })).toBe(false);
    expect(gradeAnswer(key, { PK: "Clave primaria" })).toBe(false);
    expect(gradeAnswer(key, ["PK"])).toBe(false);
  });
});

describe("passThreshold", () => {
  it("passes at or above the percentage and never on empty quizzes", () => {
    expect(passThreshold(8, 10, 80)).toBe(true);
    expect(passThreshold(7, 10, 80)).toBe(false);
    expect(passThreshold(4, 5, 80)).toBe(true);
    expect(passThreshold(0, 0, 80)).toBe(false);
  });
});

describe("scorePercent", () => {
  it("reports the share of correct answers", () => {
    expect(scorePercent(6, 6)).toBe(100);
    expect(scorePercent(5, 6)).toBe(83);
    expect(scorePercent(4, 6)).toBe(66);
    expect(scorePercent(0, 6)).toBe(0);
    expect(scorePercent(0, 0)).toBe(0);
  });

  /** The percentage sits next to the verdict on the result screen: it must never contradict it. */
  it("never shows the threshold as reached on a failed attempt", () => {
    for (let total = 1; total <= 40; total++) {
      for (let score = 0; score <= total; score++) {
        const shown = scorePercent(score, total);
        expect(shown >= 80).toBe(passThreshold(score, total, 80));
      }
    }
  });
});

describe("shuffle", () => {
  it("is a permutation and deterministic for a fixed RNG", () => {
    let seed = 42;
    const rng = () => {
      seed = (seed * 1664525 + 1013904223) % 2 ** 32;
      return seed / 2 ** 32;
    };
    const items = [1, 2, 3, 4, 5, 6];
    const out = shuffle(items, rng);
    expect([...out].sort()).toEqual(items);
    expect(items).toEqual([1, 2, 3, 4, 5, 6]);
    seed = 42;
    expect(shuffle(items, rng)).toEqual(out);
  });
});
