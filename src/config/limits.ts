/**
 * Every numeric business rule lives here. Never inline these numbers elsewhere.
 * Values reflect approved decisions in docs/DECISIONS.md.
 */
export const limits = {
  /** D-01: distinct gated exercises a learner may complete without an entitlement. */
  freeExerciseLimit: 5,

  hints: {
    levels: 3,
    xpPenaltyPercentPerHint: 10,
    maxXpPenaltyPercent: 30,
    coinCostByLevel: [0, 1, 2] as const,
  },

  solutionUnlock: {
    minGenuineAttempts: 3,
    minHintsRequested: 2,
    minMinutesElapsed: 10,
    allowExplicitReveal: true,
    /** Percentage of the exercise XP kept when the solution was revealed before completion. */
    xpPercentAfterReveal: 25,
  },

  rewards: {
    dailyXpCap: 600,
    quizXpPerCorrect: 5,
    quizPassBonusXp: 20,
    quizPassThresholdPercent: 80,
    byDifficulty: {
      very_easy: { xp: 10, coins: 2 },
      easy: { xp: 20, coins: 4 },
      intermediate: { xp: 40, coins: 8 },
      advanced: { xp: 70, coins: 14 },
      expert: { xp: 120, coins: 25 },
    },
  },

  streaks: {
    freezesPerMonth: 1,
    /** Minimum XP in a day for it to count toward the streak. */
    minDailyXpForStreak: 10,
  },

  sandbox: {
    maxSqlBytes: 8 * 1024,
    maxRows: 1000,
    maxColumns: 100,
    maxCellBytes: 2 * 1024,
    statementTimeoutMs: 3000,
    hardTimeoutMs: 5000,
    workerMemoryMb: 256,
    workerPoolSize: 2,
  },

  rateLimits: {
    submit: { capacity: 30, refillPerSecond: 30 / 300 },
    hint: { capacity: 20, refillPerSecond: 20 / 300 },
    aliasCheck: { capacity: 10, refillPerSecond: 10 / 60 },
    checkout: { capacity: 5, refillPerSecond: 5 / 600 },
    verification: { capacity: 60, refillPerSecond: 1 },
  },

  alias: {
    minLength: 3,
    maxLength: 20,
    pattern: /^[a-z0-9_]+$/,
    changesPerYear: 2,
  },

  profile: {
    minAge: 18,
    displayNameMaxLength: 60,
  },

  certificates: {
    minQuizScorePercent: 80,
  },
} as const;

export type Difficulty = keyof typeof limits.rewards.byDifficulty;
