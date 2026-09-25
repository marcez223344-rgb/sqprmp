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

- **Length (D-33, amended by D-37).** An attempt serves the number of questions **that section**
  declares (`quiz_questions` in `src/content/sections.ts`, resolved by
  `quizLengthForSection()`), out of a bank of 8–12. Today: 5 for the 31 sections whose exercises
  already carry the evidence, 6 for the 8 sections with four or fewer exercises and for the four
  certificate gates (`limits.quiz.gateQuestions`; 10 under D-37, cut to 6 by D-42),
  `limits.quiz.questionsPerAttempt` = 6 as the default for a section that declares nothing. The
  bank is not reduced: the sample is drawn per attempt, so a retry asks a different set, and
  `limits.quiz.minUnseenOnRetry` = 3 keeps at least three questions out of any attempt (enforced by
  `content:validate`). Sampling is server-side; the browser never receives the questions that were
  not drawn.
- **Retry priority (round 6, item 10).** `sampleQuestions()` receives the learner's history
  (`quizHistory()` in `src/lib/quizzes/service.ts`, read server-side before the attempt is frozen)
  and draws only from the freshest non-empty group: never served → last answer wrong → answered
  right. The coverage rule below applies inside that group. With no history the draw is the plain
  one. The copy promises unseen questions first «mientras queden», which is what this guarantees.
- **Which lengths are legal.** `limits.quiz.lengthsAllowed` = 5, 6, 10, 11, 12 — the lengths at
  which the 80 % threshold is honest. At 7, 8 or 9 the learner is told 80 % and judged at 86–89 %,
  and at 4 a single mistake fails the attempt (D-37 has the table and the error rates).
- **Coverage rule.** `sampleQuestions()` buckets the bank by difficulty, picks round-robin easy →
  hard so every difficulty present is represented, and inside a bucket prefers the least-used topic
  (random tie-break), so a topic repeats only after every topic has appeared. The sample is
  delivered easy first.
- **Passing.** `quizPassThresholdPercent` = 80 for every section — the threshold does not vary, only
  the length does. In practice the learner may miss one question of 5 or 6, and two of 10 or 12.
  Any passing attempt therefore also clears `certificates.minQuizScorePercent` = 80.
- **XP.** 5 XP per correct answer + 20 on the first pass, unchanged per correct answer, so a quiz
  pays at most 45 XP (5 questions), 50 (6) or 70 (10), and the whole curriculum's quiz XP is
  roughly 1 795 against 2 800 when the full bank was served. The level curve is unchanged; quizzes simply
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

Data-driven criteria (`badges.criteria`): `exercises_completed`, `exercises_without_hints`, `sections_completed` (a count), `section_completed` (one section by slug: `{"kind":"section_completed","section":"sql-con-ia"}`), `streak`, `level`. Evaluated by `evaluate_badges()` after each reward; returns newly earned slugs for the UI banner. A section counts as completed when every published exercise in it is completed (`completed_section_slugs()`, shared by both section criteria; quizzes are not required, unlike certificate eligibility). Seeded set: 13 badges (first exercise, 5, 20; 5 without hints; 1 and 3 full sections; «Verificador de IA»; streaks 3/7/30; levels 3/5/10).

**«Verificador de IA»** (`verificador-de-ia`, owner approval 2026-09-25, D-40): earned by completing
every exercise of section 39 «SQL con IA». Family autonomía, tier III, icon `SearchCheck`
(checking an AI's SQL instead of trusting it is independent judgement, one step beyond solving
without hints). Once per learner like every badge; no XP or coins attached. Learners who had
already completed the section when the badge shipped received it through the migration's backfill
(`20260925120000_badge_section_completed.sql`, [DATABASE_DESIGN.md](DATABASE_DESIGN.md) §4o).

## Certificates: program hours and seal

Eligibility and issuance stay in the DB (`certificate_eligible`, `issue_certificate`; sections
listed in `certificate_requirements.rules`). D-42 adds two presentation rules:

- **«Carga horaria estimada: N horas»** on the PDF, the public verification page, its share image
  and each card of `/certificados` — only for the certificates listed in
  `limits.certificates.programHoursShownFor` (owner, 2026-09-25: the final certificate only; the
  per-level figures read as light). `displayedProgramHours()` applies the list in one place and
  returns 0 elsewhere, which every surface treats as "omit". It describes the program, not the person: the same number for
  every holder, no personal time tracking. `src/lib/certificates/hours.ts` sums, over the
  requirement's published sections, theory `estimated_minutes` + exercise `estimated_minutes` +
  the quiz as questions served per attempt × mean `estimated_seconds` of the bank (not the whole
  bank). The total is rounded once to the nearest whole hour, half up, minimum 1. Missing data
  counts zero and is logged (`missingSections`, `missingItems`), so the figure can under-state
  but never invent; a unit test keeps the current content at zero missing. The verification RPC
  returns only the title, so the verify page resolves the requirement by title; an unresolved
  one omits the row. At the time of writing: Fundamentos 4 h, Análisis de Negocio 14 h,
  Analítico Avanzado 13 h, Analista Profesional 29 h (recomputed from content on every deploy).
- **Seal**: a vector rosette with ribbons and the brand mark, defined once as shape data in
  `src/lib/certificates/seal.ts` and drawn from it by the web component, the PDF and the share
  image, in the light brand palette so it prints the same everywhere. Decorative (`aria-hidden`);
  never shown on a revoked certificate, since a seal reads as "valid".

## Abuse controls

Idempotent keys, daily cap, server-only RPCs, `suspicious_activity` table for anomaly flags (heuristics land with admin tooling in Phase 8), rate limits on submissions and hints.

## Progress on the learning path

The path (`/ruta`) renders `lesson_progress`, but exercises are solved against `exercise_progress`. `sync_exercise_lesson_progress` (see DATABASE_DESIGN.md §4j) projects one onto the other on start and on first completion, monotonically; `getLearningPath()` also derives it when reading so a failed sync cannot hide progress. Section completion, badges and certificate eligibility read `exercise_progress` directly and were never affected.

## Leaderboard (opt-in)

Two boards — last 7 days (default) and lifetime — over learners with `profiles.leaderboard_opt_in`, behind the `leaderboards` flag. It is deliberately not a core loop: no XP, coins or badges depend on it, nobody is ranked without consenting, and the weekly window means a late starter is never permanently behind. Below `limits.leaderboard.minParticipants` ranked participants the page says there are too few to compare instead of showing a two-row table. Rules and rationale: [DECISIONS.md](DECISIONS.md) D-35. The two RPCs are service-role only and return nothing while the flag row is off, so the flag is an access control and not only a route guard; exactly what the board discloses (alias, avatar, level, XP, and recency on the weekly view) and to whom is in [SECURITY.md](SECURITY.md) §7.2, and the opt-in is dated by `profiles.leaderboard_opt_in_at`.

## Surfaces

`/aprender` (continue card, level/XP, streak with freeze status, goals with inline editing, badges preview, mastery per section), `/ranking` (opt-in board, flagged), `/logros` (all badges), `/historial` (attempts with feedback categories), `/consultas` (saved queries), reward banner in the workspace after a first completion.
