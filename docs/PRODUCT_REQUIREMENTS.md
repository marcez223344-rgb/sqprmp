# Product Requirements — Data Minds SQL Academy

**Status:** Every "Must" is built and the content volume target is exceeded; what is left is owner-side (apply migrations, deploy, legal, domain) plus a Lighthouse run and a real screen-reader pass, both of which need a deployed URL. Tracked in [ROADMAP.md](ROADMAP.md); pending decisions in [DECISIONS.md](DECISIONS.md), pending owner tasks in [OWNER_ACTIONS.md](OWNER_ACTIONS.md).
**Owner:** Marcelo Pisner (Data Minds Solutions)
**Last updated:** 2026-09-23

## 1. Mission

Help Spanish-speaking adults in Latin America learn SQL through realistic business exercises, immediate structured feedback, concise theory, progressive challenges, professional gamification and verifiable certificates. The product must feel like a modern career-oriented SaaS, not a collection of disconnected exercises.

## 2. Audience

Adults ~25–35 in LATAM: first job in data, junior analysts, career changers, business professionals, interview candidates and advanced analysts. Language: neutral professional Latin American Spanish (`es-419`). No childish tone, no Spain-specific vocabulary, no unnecessary English, no country stereotypes.

## 3. Core learner journey

1. Landing → curriculum/pricing/about → Google sign-in
2. Onboarding (display name, unique alias, curated avatar, DOB, country, optional gender, SQL level, goal, weekly study goal, terms/privacy consent)
3. Free tier: 5 practical exercises (`FREE_EXERCISE_LIMIT`, D-01), enforced server-side
4. Exercise workspace: scenario → schema browser → SQL editor → Run (instant) → Submit (server-validated) → structured feedback → progressive hints (3 levels) → gated solution reveal → next
5. Theory lessons and quizzes per section; review sessions from previous mistakes
6. Progress dashboard: XP, coins, streak (with limited freeze), goals, badges, mastery per topic, attempt history, saved queries
7. Paywall → checkout (sandbox until approved) → entitlement → continue from last activity
8. Section completion → server-generated certificate with public verification URL and PDF

## 4. Functional requirements (MVP scope = "Must")

| Area          | Requirement                                                                                                                                                                   | MVP                                                     |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Public site   | Landing, curriculum, how it works, pricing, about (company + founder), FAQ, terms, privacy, login, certificate verification                                                   | Must                                                    |
| Auth          | Supabase Auth + Google OAuth; architecture ready for magic-link email                                                                                                         | Must                                                    |
| Onboarding    | Form above; unique moderated alias; curated avatars; consent recorded with timestamp/version                                                                                  | Must                                                    |
| Curriculum    | Courses → sections → lessons/exercises/quizzes; prerequisites; 39-section path, **all 39 fully authored** (2026-09-23: 347 lessons, 414 questions, 209 exercises, 4 datasets) | Must — exceeded                                         |
| Sandbox       | Safe SQL execution (see [SQL_SANDBOX.md](SQL_SANDBOX.md)); results table; timing; row count; sanitized errors                                                                 | Must                                                    |
| Validation    | Structured result comparison (columns, types, rows, tolerance, optional order, duplicates, required/prohibited concepts)                                                      | Must                                                    |
| Feedback      | Categorized diagnostics beyond correct/incorrect                                                                                                                              | Must                                                    |
| Hints         | 3 progressive hints + gated solution reveal with step-by-step explanation                                                                                                     | Must                                                    |
| Gamification  | XP, coins, levels, streaks + freeze, daily/weekly goals, badges; server-side, idempotent                                                                                      | Must; leaderboard shipped post-MVP behind a flag (D-35) |
| Monetization  | Free limit, paywall, one product (lifetime access), test-mode checkout, verified idempotent webhook, entitlements, admin grant/revoke, promo/scholarship codes                | Must (subscriptions: Later)                             |
| Assessments   | Theory question bank (8 types), quizzes, review-from-mistakes                                                                                                                 | Must                                                    |
| Certificates  | Server-generated, unique ID, verification page, PDF, revocation                                                                                                               | Must (1 path; 4 paths seeded and all now attainable)    |
| Admin         | Entitlement management, content publish toggle, audit log, payment event review; everything else via Supabase Studio                                                          | Must (minimal)                                          |
| Analytics     | First-party event table with documented spec                                                                                                                                  | Must                                                    |
| Accessibility | WCAG 2.2 AA target, keyboard, focus, reduced motion, no color-only meaning                                                                                                    | Must                                                    |
| i18n          | `es-419` only, but all UI strings in message catalogs                                                                                                                         | Must                                                    |
| Testing       | Unit (Vitest), integration (Supabase local), E2E (Playwright) for the 13 critical journeys                                                                                    | Must                                                    |
| Deployment    | Vercel + Supabase, GitHub Actions quality gate, documented setup                                                                                                              | Must                                                    |

## 5. Non-functional requirements

- Learner SQL never reaches the application database (hard rule).
- Authorization and rewards are computed server-side only; browser state is never trusted.
- p95 "Run" latency < 300 ms (browser engine) and "Submit" < 2.5 s (server engine, warm).
- No PII in analytics; PII minimized; export and deletion supported (see [SECURITY.md](SECURITY.md) §7).
- All branding, pricing, founder info and limits in `src/config/*` (single source).
- Light and dark themes; responsive down to 360 px.

## 6. Contradictions found in the brief (resolved by decisions)

| #   | Contradiction                                                                                | Resolution                                                                                                                          |
| --- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| C-1 | Free limit stated as **three** (sections 3, 23, 27) and **five** (section 9)                 | Config `FREE_EXERCISE_LIMIT` = **5** (owner decision D-01)                                                                          |
| C-2 | "Server-side execution only" vs. "browser-based SQL engine" listed as acceptable alternative | Hybrid: browser engine for _Run_ (preview), server engine for _Submit_ (graded). Rewards and validation are server-side only (D-03) |
| C-3 | "Monthly and annual subscriptions" vs. "recommend the simplest MVP"                          | MVP sells **lifetime access** only; subscriptions modeled in schema, not launched (D-05)                                            |
| C-4 | E2E test list says "completes three free exercises" then "fourth premium exercise is locked" | Journeys use 5 free + 6th locked                                                                                                    |

## 7. Out of scope for MVP

Avatar uploads, email/passwordless login, subscriptions, multi-language UI, mobile native apps, AI-generated feedback, team/enterprise plans, affiliate program, community features.

Leaderboards were on this list and came off it on 2026-09-23: the profile had been asking for consent to a feature that did not exist, which CLAUDE.md rule 9 forbids, so `/ranking` was built opt-in and behind a flag rather than deleting the question (D-35).

## 8. Success metrics (first 90 days after launch)

Signup→onboarding completion ≥ 70 %; first exercise completed ≥ 50 % of onboarded; free-limit → paywall view ≥ 30 %; paywall → purchase ≥ 4 %; D7 retention ≥ 25 %; solution-reveal rate per exercise < 40 % (higher flags a content problem).
