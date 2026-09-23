# Gamification and Progress Rules

Implemented in Phase 5. Amounts live in `src/config/limits.ts` and `docs/CONTENT_GUIDELINES.md §6`; pure rules in `src/lib/rewards/rules.ts`; persistence and idempotency in migration `20260918210000_gamification.sql`.

## Principles

- Rewards encourage learning, never clicking: XP only for first completions, quizzes and streak/section milestones; repeating a completed exercise pays nothing (personal best only).
- Everything is server-side and idempotent: `award_reward()` keys every payout by `(user_id, event_key)`; the browser never sends XP or coins.
- No dark patterns: missing a day never erases history (longest streak is kept), one streak protection per month
  bridges a one-day gap automatically, and revealing a solution keeps 25 % XP instead of punishing.

## XP, coins and levels

| Event                     | XP                                                                                                               | Coins       | Key                                |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------- | ----------- | ---------------------------------- |
| Exercise first completion | difficulty default (10/20/40/70/120) minus 10 % per hint (max 30 %); 25 % if the solution was revealed (0 coins) | 2/4/8/14/25 | `exercise_completed:<exercise_id>` |
| Quiz ≥ 80 % (first pass)  | 5 per correct answer + 20 bonus (attempt of 6 questions → 45–50 XP)                                              | 0           | `quiz_passed:<lesson_id>`          |
| Section completed         | 50                                                                                                               | 10          | `section_completed:<section_id>`   |
| Daily cap                 | 600 XP/day (coins uncapped)                                                                                      |             |                                    |

Level `n` requires `100·n·(n−1)/2` total XP (100, 300, 600, 1000, 1500 …); `level_for_xp()` in SQL mirrors `levelForXp()` in TS (both unit/DB tested).

## Section quizzes

- **Length (D-33).** An attempt serves `limits.quiz.questionsPerAttempt` = 6 questions out of the
  section's bank of 8–12. The bank is not reduced: the sample is drawn per attempt, so a retry asks
  a different set. Sampling is server-side; the browser never receives the questions that were not
  drawn.
- **Coverage rule.** `sampleQuestions()` buckets the bank by difficulty, picks round-robin easy →
  hard so every difficulty present is represented, and inside a bucket prefers the least-used topic
  (random tie-break), so a topic repeats only after every topic has appeared. The sample is
  delivered easy first.
- **Passing.** `quizPassThresholdPercent` = 80, so 5 of 6 correct (83 %) passes and 4 of 6 (67 %)
  does not. Any passing attempt therefore also clears `certificates.minQuizScorePercent` = 80, as it
  did when 8 of 10 was the minimum pass.
- **XP.** 5 XP per correct answer + 20 on the first pass, unchanged per correct answer, so the
  maximum a quiz can pay fell from about 73 XP (a full 8–12-question bank) to 50, and the whole
  curriculum's quiz XP from roughly 2 800 to 1 900. The level curve is unchanged; quizzes simply
  weigh less than exercises than they used to. The daily cap (600 XP) is untouched and still
  enforced inside `award_reward`.
- **Immediate feedback (D-34).** Each question is graded by its own server round-trip:
  `answerQuizQuestion()` records the answer, then returns `{correct, correctAnswer, explanation}`
  for that question only. The answer cannot be replaced afterwards — that is what allows the
  correct answer to be shown at once without turning the quiz into a guessing game. The score is
  recomputed in SQL from the recorded answers when the attempt is closed; the browser never sends a
  tally. Reloading resumes the same attempt with the answered questions locked and their feedback
  still visible, and an abandoned attempt cannot pay twice because the reward keeps the
  `quiz_passed:<lesson_id>` key.
- Review sessions (`/repaso`) use the same per-question flow but record nothing and pay nothing.

## Streaks and goals

- A day counts when any XP is earned; the day is computed in the learner's profile timezone (`activityDateFor`).
- Consecutive day → +1; a one-day gap consumes a freeze if available (streak kept, `streak_freezes` row); longer gap → restart at 1. Freezes refill to 1 on the first activity of each month.
- Naming: the mechanic is `streak_freezes` in the schema and "protección de racha" in every learner-facing string. "Congelamiento" was jargon nobody had been taught (owner feedback 2026-09-23); the dashboard now states what the protection does, how many there are per month (`limits.streaks.freezesPerMonth`) and that it applies by itself, and the line is assembled from the facts that have a value, so no dangling separator is rendered when the longest streak is still zero.
- Goals: daily XP target (default 50) and weekly active minutes (default from onboarding). Active minutes are a bounded heuristic: every learner action adds `min(5, minutes since last action)` for that day.

## Badges

Data-driven criteria (`badges.criteria`): `exercises_completed`, `exercises_without_hints`, `sections_completed`, `streak`, `level`. Evaluated by `evaluate_badges()` after each reward; returns newly earned slugs for the UI banner. Seeded set: 12 badges (first exercise, 5, 20; 5 without hints; 1 and 3 full sections; streaks 3/7/30; levels 3/5/10).

## Abuse controls

Idempotent keys, daily cap, server-only RPCs, `suspicious_activity` table for anomaly flags (heuristics land with admin tooling in Phase 8), rate limits on submissions and hints.

## Progress on the learning path

The path (`/ruta`) renders `lesson_progress`, but exercises are solved against `exercise_progress`. `sync_exercise_lesson_progress` (see DATABASE_DESIGN.md §4j) projects one onto the other on start and on first completion, monotonically; `getLearningPath()` also derives it when reading so a failed sync cannot hide progress. Section completion, badges and certificate eligibility read `exercise_progress` directly and were never affected.

## Leaderboard (opt-in)

Two boards — last 7 days (default) and lifetime — over learners with `profiles.leaderboard_opt_in`, behind the `leaderboards` flag. It is deliberately not a core loop: no XP, coins or badges depend on it, nobody is ranked without consenting, and the weekly window means a late starter is never permanently behind. Below `limits.leaderboard.minParticipants` ranked participants the page says there are too few to compare instead of showing a two-row table. Rules and rationale: [DECISIONS.md](DECISIONS.md) D-35. The two RPCs are service-role only and return nothing while the flag row is off, so the flag is an access control and not only a route guard; exactly what the board discloses (alias, avatar, level, XP, and recency on the weekly view) and to whom is in [SECURITY.md](SECURITY.md) §7.2, and the opt-in is dated by `profiles.leaderboard_opt_in_at`.

## Surfaces

`/aprender` (continue card, level/XP, streak with freeze status, goals with inline editing, badges preview, mastery per section), `/ranking` (opt-in board, flagged), `/logros` (all badges), `/historial` (attempts with feedback categories), `/consultas` (saved queries), reward banner in the workspace after a first completion.
