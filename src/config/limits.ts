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
     * D-37 made the sample size per section (`quiz_questions` in src/content/sections.ts), because
     * how many items are needed depends on how much of the section's evidence the quiz has to
     * carry — a property of the content. This value is the default for a section that declares
     * nothing, and the policy below is what a declared value must respect.
     */
    questionsPerAttempt: 6,
    /**
     * Lengths a section may declare (D-37). With `rewards.quizPassThresholdPercent` = 80 a learner
     * may miss floor(L/5) questions, so the bar actually applied is ceil(0.8·L)/L: 5 → 80 %,
     * 6 → 83 %, 10 → 80 %, 11 → 82 %, 12 → 83 %. The excluded lengths are silently harsher than
     * the 80 % the learner is told: 7 → 86 %, 8 → 88 %, 9 → 89 %, and at 4 or less a single
     * mistake fails the attempt. Only lengths whose real bar stays within 80–84 % are allowed.
     */
    lengthsAllowed: [5, 6, 10, 11, 12] as const,
    /**
     * Published questions of the bank that must stay outside any single attempt. A failed attempt
     * shows the correct answer of every question it asked (D-34), so a retry drawn from almost the
     * same pool would measure recall of that feedback instead of mastery. Checked by
     * `npm run content:validate`, not at runtime.
     */
    minUnseenOnRetry: 3,
    /**
     * Length for a section that closes a level and feeds a certificate. Was 10 (D-37); the owner
     * found ten questions too long and chose 6 (D-42), accepting that a guesser passes more often.
     * The gate banks keep 14 questions, so a retry can be drawn entirely from unseen ones.
     */
    gateQuestions: 6,
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
    /** Admin search-as-you-type: generous, because one keystroke is one call, but not unbounded. */
    adminSearch: { capacity: 60, refillPerSecond: 1 },
    /** Admin CSV export: a full table scan per call, so a few per minute is plenty. */
    adminExport: { capacity: 5, refillPerSecond: 5 / 60 },
    /**
     * Exercise problem reports (D-42). Each one lands in the owner's inbox, so the bucket is sized
     * for someone reporting several exercises in a sitting (5 at once, then one every 10 minutes),
     * not for a script filling the list.
     */
    exerciseReport: { capacity: 5, refillPerSecond: 1 / 600 },
  },

  /** Private per-exercise reports (D-42). The same bounds are CHECK constraints in the migration. */
  exerciseReport: {
    /** Shortest note accepted: a word or two («mal», «error») does not say what to fix. */
    noteMinLength: 10,
    noteMaxLength: 1000,
    /** The learner's SQL is attached for context and cut here rather than refused. */
    sqlMaxChars: 8192,
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
    /**
     * Certificates (requirement slugs) that print «Carga horaria estimada» (D-42). Owner,
     * 2026-09-25: only the final certificate; the per-level figures (4, 14 and 13 h) read as light
     * next to it. The seal is on every certificate regardless.
     */
    programHoursShownFor: ["analista-sql-profesional"] as readonly string[],
  },

  promoCodes: {
    /**
     * Length of an auto-generated code. Eight characters of the unambiguous alphabet in
     * `src/lib/payments/promo-code.ts` (no O/0, no I/1) are ~10^12 combinations: impossible to
     * guess by trying, short enough to read out loud on a call or retype from a screenshot.
     */
    generatedLength: 8,
    /** Characters per hyphen-separated group (DMSA-XXXX-XXXX reads back without losing place). */
    groupSize: 4,
    /**
     * Redemptions a new code allows unless the admin deliberately asks for more. A promo code is
     * shared by voice, screenshot and WhatsApp group, so the expensive mistake is an open-ended
     * one: the owner asked (2026-09-24) that the safe number be the one you get by not thinking
     * about the field, and that "unlimited" cost a separate, explicit tick.
     */
    defaultMaxRedemptions: 1,
    /** Upper bound accepted for the cap; beyond it the number is a typo, not a campaign. */
    maxRedemptionsCap: 100000,
  },

  admin: {
    /** Rows per page in the user directory. */
    directoryPageSize: 50,
    /**
     * Ceiling for the CSV export of the directory. Matches the cap inside
     * `admin_user_directory`; beyond it the export would silently truncate, so the UI says so.
     */
    exportMaxRows: 5000,
    /** Suggestions returned by the learner picker (alias + display name search). */
    learnerPickerResults: 8,
    /** Shortest search term the learner picker acts on; one or two letters match everyone. */
    learnerPickerMinChars: 2,
    /** Exercise reports listed at once in /admin/reportes, newest first. */
    reportsListMax: 200,
    /** Code redemptions listed in /admin/promos, newest first. */
    redemptionsListMax: 50,
    /**
     * Lifetime of the cookie that remembers when the admin last opened /admin/promos (the «seen»
     * mark behind the header counter). A year: losing it only re-counts old redemptions once.
     */
    promosSeenCookieMaxAgeDays: 365,
  },

  /** Owner-only email alerts (D-43). */
  ownerNotifications: {
    /**
     * Emails per event type per hour, across all learners. Each learner is already rate-limited
     * per action; this is the ceiling for many accounts at once, so a spammer cannot flood the
     * owner's inbox. Events beyond it are still stored and counted in the header badge.
     */
    maxPerHour: { exercise_report: 20, promo_redemption: 20 },
    /** The learner's note is cut to this many characters in the email; the full text is in /admin. */
    noteExcerptChars: 500,
    /** Resend call timeout. The email runs after the response, so this bounds background work only. */
    requestTimeoutMs: 8000,
  },
} as const;

export type Difficulty = keyof typeof limits.rewards.byDifficulty;
