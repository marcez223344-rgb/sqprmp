# Gamification and Progress Rules

Implemented in Phase 5. Amounts live in `src/config/limits.ts` and `docs/CONTENT_GUIDELINES.md §6`; pure rules in `src/lib/rewards/rules.ts`; persistence and idempotency in migration `20260918210000_gamification.sql`.

## Principles

- Rewards encourage learning, never clicking: XP only for first completions, quizzes (Phase 7) and streak/section milestones; repeating a completed exercise pays nothing (personal best only).
- Everything is server-side and idempotent: `award_reward()` keys every payout by `(user_id, event_key)`; the browser never sends XP or coins.
- No dark patterns: missing a day never erases history (longest streak is kept), one streak freeze per month bridges a one-day gap automatically, and revealing a solution keeps 25 % XP instead of punishing.

## XP, coins and levels

| Event                       | XP                                                                                                               | Coins       | Key                                |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------- | ----------- | ---------------------------------- |
| Exercise first completion   | difficulty default (10/20/40/70/120) minus 10 % per hint (max 30 %); 25 % if the solution was revealed (0 coins) | 2/4/8/14/25 | `exercise_completed:<exercise_id>` |
| Quiz ≥ 80 % (Phase 7)       | 5 per correct answer + 20 bonus                                                                                  | 0           | `quiz_passed:<lesson_id>`          |
| Section completed (Phase 7) | 50                                                                                                               | 10          | `section_completed:<section_id>`   |
| Daily cap                   | 600 XP/day (coins uncapped)                                                                                      |             |                                    |

Level `n` requires `100·n·(n−1)/2` total XP (100, 300, 600, 1000, 1500 …); `level_for_xp()` in SQL mirrors `levelForXp()` in TS (both unit/DB tested).

## Streaks and goals

- A day counts when any XP is earned; the day is computed in the learner's profile timezone (`activityDateFor`).
- Consecutive day → +1; a one-day gap consumes a freeze if available (streak kept, `streak_freezes` row); longer gap → restart at 1. Freezes refill to 1 on the first activity of each month.
- Goals: daily XP target (default 50) and weekly active minutes (default from onboarding). Active minutes are a bounded heuristic: every learner action adds `min(5, minutes since last action)` for that day.

## Badges

Data-driven criteria (`badges.criteria`): `exercises_completed`, `exercises_without_hints`, `sections_completed`, `streak`, `level`. Evaluated by `evaluate_badges()` after each reward; returns newly earned slugs for the UI banner. Seeded set: 12 badges (first exercise, 5, 20; 5 without hints; 1 and 3 full sections; streaks 3/7/30; levels 3/5/10).

## Abuse controls

Idempotent keys, daily cap, server-only RPCs, `suspicious_activity` table for anomaly flags (heuristics land with admin tooling in Phase 8), rate limits on submissions and hints.

## Surfaces

`/aprender` (continue card, level/XP, streak with freeze status, goals with inline editing, badges preview, mastery per section), `/logros` (all badges), `/historial` (attempts with feedback categories), `/consultas` (saved queries), reward banner in the workspace after a first completion.
