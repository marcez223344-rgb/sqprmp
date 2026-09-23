/**
 * Every numeric business rule lives here. Never inline these numbers elsewhere.
 * Values reflect approved decisions in docs/DECISIONS.md.
 */
export const limits = {
  /** D-01: distinct gated exercises a learner may complete without an entitlement. */
  freeExerciseLimit: 5,
  /**
   * Sections whose exercises are always free, on top of `freeExerciseLimit`. Without these, a
   * visitor could not try a single exercise without spending part of an invisible allowance,
   * and the learning path showed no "free" marker anywhere (owner feedback, 2026-09-22).
   */
  freeExerciseSections: ["tablas-filas-columnas-tipos", "select"] as string[],

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

  quiz: {
    /**
     * D-33: a section quiz serves a random sample of its question bank, not the whole bank.
     * Ten questions read as an exam; six read as a check and leave the bank deep enough that a
     * retry asks different questions.
     */
    questionsPerAttempt: 6,
  },

  rewards: {
    dailyXpCap: 600,
    quizXpPerCorrect: 5,
    quizPassBonusXp: 20,
    quizPassThresholdPercent: 80,
    sectionCompletedXp: 50,
    sectionCompletedCoins: 10,
    byDifficulty: {
      very_easy: { xp: 10, coins: 2 },
      easy: { xp: 20, coins: 4 },
      intermediate: { xp: 40, coins: 8 },
      advanced: { xp: 70, coins: 14 },
      expert: { xp: 120, coins: 25 },
    },
  },

  leaderboard: {
    /** Rows shown per board; the learner's own row is added when it falls outside them. */
    topN: 25,
    /**
     * Below this many ranked participants the board says so instead of rendering a table: a
     * two-row ranking is noise, not information (D-35).
     */
    minParticipants: 5,
    /** Days counted by the weekly board, including today, in the learner's timezone. */
    weeklyWindowDays: 7,
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
    /** Style and readability feedback built from the learner's own query (src/lib/validation/style.ts). */
    feedback: {
      /** Style items shown per submission, most important first. A wall of nitpicks teaches nothing. */
      maxStyleItems: 4,
      /** Below this many characters of code a single-line query needs no line breaks. */
      oneLineMinChars: 90,
      /** Clauses besides FROM (WHERE, GROUP BY, JOIN, …) that make one line worth splitting. */
      oneLineMinClauses: 2,
      /** Keywords needed before commenting on keyword case at all. */
      minKeywordsForCaseTip: 3,
      /** Lines needed before indentation consistency is worth mentioning. */
      minLinesForIndentTip: 3,
      /** Longest query offered back to the learner re-indented, in characters. */
      maxFormattedSqlChars: 1200,
    },
  },

  rateLimits: {
    submit: { capacity: 30, refillPerSecond: 30 / 300 },
    /**
     * Per-question quiz grading reveals one answer at a time, so the bucket sizes the number
     * of answers a learner can burn, not the number of quizzes. A 6-question attempt costs 6;
     * 20 is three full attempts per 5 minutes and far short of harvesting a 12-question bank.
     * Applied to both answering and finishing an attempt (security review F-6, 2026-09-23:
     * finishing re-runs finalize + award + section check + badge evaluation).
     */
    quizAnswer: { capacity: 20, refillPerSecond: 20 / 300 },
    /** Review practice reveals answers for questions already answered once (F-7). */
    quizReview: { capacity: 30, refillPerSecond: 30 / 300 },
    hint: { capacity: 20, refillPerSecond: 20 / 300 },
    aliasCheck: { capacity: 10, refillPerSecond: 10 / 60 },
    checkout: { capacity: 5, refillPerSecond: 5 / 600 },
    verification: { capacity: 60, refillPerSecond: 1 },
    webhook: { capacity: 600, refillPerSecond: 10 },
    promo: { capacity: 5, refillPerSecond: 5 / 600 },
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
