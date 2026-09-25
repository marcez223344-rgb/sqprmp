import { describe, expect, it } from "vitest";
import { limits } from "@/config/limits";
import { passThreshold } from "@/lib/quizzes/grading";
import {
  freshnessTier,
  sampleQuestions,
  type QuizHistory,
  type Sampleable,
} from "@/lib/quizzes/sampling";

/** A bank shaped like the real ones: 10 questions, three difficulties, four topics. */
function bank(): Sampleable[] {
  return [
    { id: "1", difficulty: "very_easy", topic: "select" },
    { id: "2", difficulty: "very_easy", topic: "select" },
    { id: "3", difficulty: "very_easy", topic: "alias" },
    { id: "4", difficulty: "easy", topic: "select" },
    { id: "5", difficulty: "easy", topic: "where" },
    { id: "6", difficulty: "easy", topic: "where" },
    { id: "7", difficulty: "easy", topic: "null" },
    { id: "8", difficulty: "intermediate", topic: "where" },
    { id: "9", difficulty: "intermediate", topic: "null" },
    { id: "10", difficulty: "intermediate", topic: "alias" },
  ];
}

/** Deterministic RNG so the assertions describe the rule, not a lucky draw. */
function seeded(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

const size = limits.quiz.questionsPerAttempt;

describe("sampleQuestions", () => {
  it("serves exactly the configured number of questions", () => {
    expect(sampleQuestions(bank(), size, seeded(1))).toHaveLength(size);
  });

  it("never repeats a question", () => {
    for (let seed = 1; seed <= 50; seed++) {
      const ids = sampleQuestions(bank(), size, seeded(seed)).map((q) => q.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("covers every difficulty present in the bank (no six-easy-questions quiz)", () => {
    for (let seed = 1; seed <= 50; seed++) {
      const picked = sampleQuestions(bank(), size, seeded(seed));
      expect(new Set(picked.map((q) => q.difficulty))).toEqual(
        new Set(["very_easy", "easy", "intermediate"]),
      );
    }
  });

  it("spreads across topics before repeating one", () => {
    for (let seed = 1; seed <= 50; seed++) {
      const topics = sampleQuestions(bank(), size, seeded(seed)).map((q) => q.topic);
      // Four topics exist and six questions are served, so at least four distinct topics must
      // appear and no topic may be picked a third time.
      expect(new Set(topics).size).toBeGreaterThanOrEqual(4);
      for (const topic of new Set(topics))
        expect(topics.filter((x) => x === topic).length).toBeLessThanOrEqual(2);
    }
  });

  it("delivers easy first", () => {
    const order = ["very_easy", "easy", "intermediate", "advanced", "expert"];
    const picked = sampleQuestions(bank(), size, seeded(7));
    const ranks = picked.map((q) => order.indexOf(q.difficulty));
    expect([...ranks].sort((a, b) => a - b)).toEqual(ranks);
  });

  it("serves a bank smaller than the sample whole, easy first", () => {
    const small: Sampleable[] = [
      { id: "b", difficulty: "intermediate", topic: "x" },
      { id: "a", difficulty: "very_easy", topic: "y" },
    ];
    expect(sampleQuestions(small, size, seeded(3)).map((q) => q.id)).toEqual(["a", "b"]);
  });

  it("is deterministic for a given random source and varies across attempts", () => {
    const a = sampleQuestions(bank(), size, seeded(11)).map((q) => q.id);
    const b = sampleQuestions(bank(), size, seeded(11)).map((q) => q.id);
    expect(a).toEqual(b);
    const seeds = new Set<string>();
    for (let seed = 1; seed <= 20; seed++)
      seeds.add(
        sampleQuestions(bank(), size, seeded(seed))
          .map((q) => q.id)
          .join(),
      );
    // A retry has to be able to ask a different set; that is the point of sampling.
    expect(seeds.size).toBeGreaterThan(1);
  });

  it("keeps unknown difficulty values in the sample instead of dropping them", () => {
    const withUnknown = [...bank(), { id: "11", difficulty: "brutal", topic: "ventanas" }];
    const seen = new Set<string>();
    for (let seed = 1; seed <= 40; seed++)
      for (const q of sampleQuestions(withUnknown, size, seeded(seed))) seen.add(q.difficulty);
    expect(seen.has("brutal")).toBe(true);
  });

  it("returns nothing for a non-positive size", () => {
    expect(sampleQuestions(bank(), 0, seeded(1))).toEqual([]);
  });
});

describe("sampleQuestions on a retry (round 6, items 7/10)", () => {
  const history = (seen: string[], wrong: string[] = []): QuizHistory => ({
    seen: new Set([...seen, ...wrong]),
    wrong: new Set(wrong),
  });

  it("ranks never-served before answered-wrong before the rest", () => {
    const h = history(["1", "2"], ["3"]);
    expect(freshnessTier("9", h)).toBe(0);
    expect(freshnessTier("3", h)).toBe(1);
    expect(freshnessTier("1", h)).toBe(2);
    expect(freshnessTier("1")).toBe(0);
  });

  it("serves only unseen questions while enough remain", () => {
    // 10-question bank, first attempt saw four: six unseen are left for a six-question retry.
    const h = history(["1", "4", "8", "5"]);
    for (let seed = 1; seed <= 50; seed++) {
      const ids = sampleQuestions(bank(), size, seeded(seed), h).map((q) => q.id);
      expect(ids.sort()).toEqual(["10", "2", "3", "6", "7", "9"]);
    }
  });

  it("fills the remaining slots with wrong answers before questions already answered right", () => {
    // Unseen: 9, 10. Wrong: 1, 5, 8. Answered right: 2, 3, 4, 6, 7.
    const h = history(["2", "3", "4", "6", "7"], ["1", "5", "8"]);
    for (let seed = 1; seed <= 50; seed++) {
      const ids = new Set(sampleQuestions(bank(), size, seeded(seed), h).map((q) => q.id));
      for (const id of ["9", "10", "1", "5", "8"]) expect(ids.has(id)).toBe(true);
      expect(ids.size).toBe(size);
    }
  });

  it("repeats only once the unseen and wrong ones are used up, still covering difficulties", () => {
    // Everything was seen and nothing was wrong: a plain stratified sample, no question dropped.
    const all = bank().map((q) => q.id);
    for (let seed = 1; seed <= 20; seed++) {
      const picked = sampleQuestions(bank(), size, seeded(seed), history(all));
      expect(picked).toHaveLength(size);
      expect(new Set(picked.map((q) => q.difficulty)).size).toBe(3);
    }
  });

  it("keeps difficulty coverage inside the unseen questions", () => {
    // Nine unseen, three of each difficulty: coverage still applies within the fresh tier.
    const h = history(["1"]);
    for (let seed = 1; seed <= 50; seed++) {
      const picked = sampleQuestions(bank(), size, seeded(seed), h);
      expect(picked.map((q) => q.id)).not.toContain("1");
      expect(new Set(picked.map((q) => q.difficulty))).toEqual(
        new Set(["very_easy", "easy", "intermediate"]),
      );
    }
  });

  it("without history, gives the same sample as the plain stratified draw", () => {
    const empty = history([]);
    for (let seed = 1; seed <= 20; seed++)
      expect(sampleQuestions(bank(), size, seeded(seed), empty).map((q) => q.id)).toEqual(
        sampleQuestions(bank(), size, seeded(seed)).map((q) => q.id),
      );
  });

  it("with the D-37 bank floor, two consecutive attempts share no question", () => {
    // Bank = length + minUnseenOnRetry is the smallest bank allowed; a first attempt of `size`
    // leaves at least minUnseenOnRetry questions for the retry, and they are all served.
    const first = sampleQuestions(bank(), size, seeded(5)).map((q) => q.id);
    const retry = sampleQuestions(bank(), size, seeded(6), history(first)).map((q) => q.id);
    const unseen = bank().length - first.length;
    expect(unseen).toBeGreaterThanOrEqual(limits.quiz.minUnseenOnRetry);
    expect(retry.filter((id) => !first.includes(id))).toHaveLength(Math.min(unseen, size));
  });
});

describe("D-33 consequences of a six-question quiz", () => {
  const threshold = limits.rewards.quizPassThresholdPercent;

  it("needs five of six correct to pass", () => {
    expect(passThreshold(5, size, threshold)).toBe(true);
    expect(passThreshold(4, size, threshold)).toBe(false);
  });

  it("any passing attempt also clears the certificate minimum score", () => {
    for (let score = 0; score <= size; score++)
      if (passThreshold(score, size, threshold))
        expect(score * 100 >= limits.certificates.minQuizScorePercent * size).toBe(true);
  });

  it("the most XP one quiz can pay stays far below the daily cap", () => {
    const max = size * limits.rewards.quizXpPerCorrect + limits.rewards.quizPassBonusXp;
    expect(max).toBeLessThan(limits.rewards.dailyXpCap);
  });
});
