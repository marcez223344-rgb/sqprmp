# Roadmap

Status legend: ☐ not started · ◐ in progress · ☑ done. Each phase ends with: summary, files changed, test/build output, remaining risks, docs updated, approval request only when the next phase involves a material product/payment/security/deployment decision.

## Phase 0 — Discovery and decisions ◐ (this phase)

☑ Directory inspection · ☑ Requirements summary · ☑ Contradictions, risks, free-tier limits · ☑ MVP definition · ☑ Architecture · ☑ SQL sandbox comparison · ☑ Payments comparison · ☑ Data model + RLS matrix · ☑ Curriculum + volume · ☑ Visual direction · ☑ Docs + CLAUDE.md + `.claude/` operating system · ☑ Owner decisions D-01, D-06, P-2 · ☑ D-05 manual + Hotmart

## Phase 1 — Foundation ☑ (2026-09-18)

Next.js 16 scaffold (TS strict, App Router), Tailwind 4 + tokens + dark mode, shadcn/ui base components, `src/config/*`, env validation, next-intl (`es-419`), Supabase clients (browser/server/admin), Supabase CLI project + first migration (profiles, avatars, feature_flags, audit_logs with RLS), Vitest/RTL/Playwright setup, ESLint/Prettier, GitHub Actions CI, README setup steps, landing page skeleton. Gate: `npm run quality` green, first commit pushed. Done: Next.js 16.3 App Router (TypeScript strict, Tailwind 4, tokens, dark mode), `src/config/*`, env validation, next-intl es-419, Supabase clients + `proxy.ts` (session refresh + nonce CSP), foundation migration (profiles, avatars, alias blocklist, feature flags, audit log, rate limits, all with RLS) validated on PGlite, pgTAP suite for CI, Vitest (7 tests), Playwright (5 tests, desktop + mobile), GitHub Actions CI/nightly, Dependabot, landing page + WIP pages.
**Approval needed before Phase 2:** Google OAuth credentials (owner creates them following provided steps).

## Phase 2 — Identity and onboarding ☑ (2026-09-18)

Google OAuth flow, middleware, profile trigger, onboarding stepper, alias validation + blocklist, avatar set (24 assets), consent versions, profile settings, account export/deletion requests, RLS tests. Gate: E2E journeys 1–2. Done: Google OAuth sign-in (PKCE) + `/auth/callback` with allowlisted `next`, POST sign-out, `(learn)`/`(admin)` layouts with `requireUser`/`requireOnboardedProfile`/`requireAdmin`, 3-step onboarding (RHF + shared Zod schemas, live alias check rate-limited server-side, 24 curated avatars, consent versions), profile settings + privacy panel (export/deletion requests with 30-day grace model), migration `20260918180000_onboarding` (`complete_onboarding` RPC, `data_requests`, custom access token hook adding `user_role`, alias blocklist seed), pgTAP suites, 17 unit tests, E2E onboarding journey against local Supabase in CI, types drift check in CI. Pending owner action: create the Supabase dev project + Google OAuth client to exercise real login (steps in DEPLOYMENT.md §2).

## Phase 3 — Curriculum and content engine ☑ (2026-09-18)

Done: Zod content schemas (`src/content/schemas`), content as typed TS modules (sections, lessons with Markdown bodies, questions, dataset specs) validated by `content:validate` (schemas + cross-references + acyclic prerequisites + derived quiz lessons), migration `20260918190000_curriculum` (courses, sections, datasets/tables/columns, lessons, exercises, solutions, expected results, hints, theory questions, options, lesson progress; RLS + column-level grants + public views), seed pipeline `content:build` → `supabase/seed/0002_content.sql` (drift-checked in CI), 39 section outlines, sections 1–3 fully authored (6 theory lessons, 30 questions), TiendaViva dataset spec, `/curriculo` (public), `/ruta` (learner path with progress), `/leccion/[slug]` (Markdown rendering, completion, locked/quiz/exercise states), pgTAP 0003, unit tests, E2E 03 (CI).

## Phase 4 — Safe SQL exercise engine ☑ (2026-09-18)

Done: TiendaViva generator (deterministic, 91 k rows, 19 consistency checks) + CSV snapshots + manifest hashes; parser gate with 200+ input fuzz corpus; server engine (worker_threads per dataset, hard-kill timeout verified with a recursive bomb); browser engine (static module worker + PGlite dist, public `/demo`); comparator (columns/order/tolerance/duplicates/dedupe) + feedback engine (concept detection, missing filter / multiplying join / aggregation level / date boundary / NULL heuristics, readability tips); migration `20260918200000_exercise_activity` (attempts, executions, progress, hints, reveals, saved queries, RPCs, start-based free limit); `content:verify` executes every solution on the real snapshot and seeds expected results; 7 exercises (sections 2–3); workspace UI (CodeMirror, Run/Submit/draft/reset, results table, feedback, hints, solution reveal with unlock rules, schema browser, locked state); tests: 16 validation + 12 sandbox unit/integration, pgTAP 0004, E2E 04 (browser sandbox, runs locally) and 05 (journeys 3–8, CI). Remaining for MVP volume: datasets `bolsillo`/`pidelo` and exercises for later sections (content sprint before Phase 9).
**Approval needed before Phase 5:** none (reversible).

## Phase 5 — Progress and gamification ☑ (2026-09-18)

Done: migration `20260918210000_gamification` (reward ledger with idempotent keys and daily cap, totals + level curve, daily activity, streaks with monthly freeze, goals, 12 badges, suspicious_activity), pure rules module (`src/lib/rewards/rules.ts`, 8 unit tests), rewards wired into first completions, real dashboard (continue card, level/XP/coins, streak status, goals editing, badges, mastery per section), `/logros`, `/historial`, `/consultas` + save-query form in the workspace, pgTAP 0005, E2E 05 extended. See [GAMIFICATION.md](GAMIFICATION.md). Moved out: review queue (Phase 7 with quizzes), remaining MVP sections (content sprint before Phase 9), pg_cron not needed (freezes refill lazily).

## Phase 6 — Monetization ☑ (2026-09-18, sandbox)

Done: migration `20260918220000_commerce` (products, prices, purchases, subscriptions modeled, entitlements, promo codes/redemptions, payment events; RPCs for manual purchase flow, admin review/grant/revoke, idempotent webhook apply, promo redemption, buyer matching), `PaymentProvider` abstraction with `manual` and `hotmart` (sandbox) adapters, Hotmart webhook route (rate-limited, token verified, re-fetch before grant), `/precios` with card checkout + transfer channels + «Ya pagué», `/acceso` (plan, pending purchase, promo codes, history), `/admin/accesos` (approve/reject, grant/revoke by alias, audit), 5 provider unit tests, pgTAP 0006, E2E 06 (journeys 9–10 via manual approval, admin authz, webhook 401). Pending owner: fill transfer details in `src/config/pricing.ts`; Hotmart sandbox credentials to run the runbook.
**Approval needed before Phase 6:** Hotmart payout eligibility confirmed by owner. Production credentials never without explicit approval.

## Phase 7 — Assessments and certificates ☑ (2026-09-18)

Question bank types (8), quiz UI, review sessions, section completion rules, certificate requirements, issuance RPC, PDF, verification page, revocation. Gate: E2E 11–12.

Done: migration `20260918230000_assessments_certificates` (quiz_attempts/answers, section_progress, certificate_requirements seed of 4 paths, certificates; RPCs `record_quiz_attempt`, `check_section_completion`, `certificate_eligible`, `issue_certificate`, `revoke_certificate`, `verify_certificate`), pure grader for the 8 question types (`src/lib/quizzes/grading.ts`, 7 unit tests), quiz runner wired into `/leccion/[slug]` with rewards (`quiz_passed`, `section_completed`) and badge evaluation, `/repaso` review sessions, `/certificados` (requirement status, issue form, PDF), public `/verificar` + `/verificar/[code]`, pgTAP 0007 (RPC flow also smoke-tested on PGlite), E2E 07 (journeys 11–12). Deferred: admin revocation UI (Phase 8), PDF caching in Storage.

## Phase 8 — Administration and analytics ☑ (2026-09-18)

Admin pages (users/entitlements, payment events, certificates, flags, audit log), analytics event spec implemented, owner dashboard (SQL views in Supabase + minimal page).

Done: migration `20260918240000_admin_analytics` (`analytics_events`, normalized payment event fields + `reconcile_payment_event`, audited RPCs for flags/promos, `admin_metrics`, `admin_find_user`), `src/lib/analytics` (Zod spec for the 22 events + server-only `track()`) wired into onboarding, lessons, exercises (submit/complete/hint/reveal), quizzes, sections, certificates, review, paywall, checkout, purchases, promos and badges; admin hub with `/admin/{metricas,pagos,usuarios,certificados,promos,flags,auditoria}`; pgTAP 0008 (RPC flow also smoke-tested on PGlite), unit tests for the event spec, E2E 08 (journey 13). Deferred: `page_viewed` + anonymous id (D-15), materialized metrics.

## Content sprint A — Fundamentos (sections 4–8) ☑ (2026-09-18)

Sections 4 (alias y expresiones), 5 (DISTINCT), 6 (WHERE, 2 lessons), 7 (operadores) and 8 (NULL, 2 lessons) authored on `tiendaviva` and published: 7 theory lessons, 44 questions, 17 exercises (all verified by `content:verify`). Sections 1–8 complete → the `fundamentos-sql` certificate is attainable. Author tooling: `scripts/dataset-query.ts` (ad-hoc SQL against a built snapshot). Deviation from CURRICULUM §3: section 8 uses `tiendaviva` (NULL shipping dates, ratings, comments) instead of `bolsillo`; `bolsillo` will add exercises later. Remaining: sections 14–15, 17, 18, 25 + datasets `bolsillo` / `pidelo` (sprint B).

## Content sprint B — Intermedio y avanzado ☑ (2026-09-18)

Sections 14 (agregación), 15 (GROUP BY, 2 lessons), 17 (INNER JOIN, 2 lessons), 18 (LEFT/RIGHT/FULL, 2 lessons) and 25 (funciones de ventana, 2 lessons) authored and published; datasets `bolsillo` (wallet) and `pidelo` (delivery) generated, verified and described. Totals **at the end of that sprint (2026-09-18)**: 13 published sections, 84 lessons, 124 questions, 49 verified exercises, 3 datasets — MVP volume per CURRICULUM §3 reached (38 exercises target exceeded). Those numbers are history; the current ones are in the 2026-09-23 entry below. Gate change: window frame clauses are normalized before parsing (documented in SQL_SANDBOX.md). Snapshots are rebuilt by `prebuild` so Vercel ships them.

## Phase 9 — Quality and launch ◐ (engineering done 2026-09-18; launch blocked on owner decisions)

Accessibility review, security review, performance (Lighthouse ≥ 90 mobile on public pages), full E2E, seed validation on prod, legal pages, Supabase Pro + Vercel Pro, domain, production deployment runbook, post-launch checklist (monitoring, backups, support inbox).
**Approval needed:** D-09, P-1, P-4, production payments.

Superseded in part by the 2026-09-23 entry below, which is the current state of the project.

Done: real public pages (`/nosotros`, `/como-funciona`, `/preguntas-frecuentes`, legal drafts `/terminos` + `/privacidad` from `src/content/legal/*` with a visible "pending legal review" notice while D-09 placeholders remain); `tests/e2e/a11y.spec.ts` (axe on 11 public + 7 learner pages) and `tests/e2e/responsive.spec.ts`; fixes for target size, accent contrast (`--accent-ink`), header reflow at 768 px and Escape on the mobile menu; per-IP rate limit on public certificate verification; reviews in `docs/reviews/2026-09-18-{security,accessibility}.md`; launch runbook + post-launch checklist in DEPLOYMENT.md §5b. Not done (needs a deployed URL or the owner): Lighthouse run on the preview deploy, real screen-reader pass, Supabase/Vercel Pro, domain, production payments.

## 2026-09-23 — Owner feedback session: course complete, quiz reworked, two answer-key leaks closed ☑ engineering · ◐ not deployed

### State of play (the short version)

- **The course is fully authored: 39 of 39 sections published.** Section 35 (`indices-y-planes-de-ejecucion`) was the last gap and closed this session. Counts from `npm run content:validate`, re-run on 2026-09-23 while writing this entry: **`courses 1, sections 39 (39 published), lessons 347, questions 414, exercises 209, datasets 4`**. `npm run content:verify`: OK, 209 exercises verified against the dataset snapshots. No section renders "Próximamente" and none is excluded from a certificate requirement. Detail per section: [CURRICULUM.md](CURRICULUM.md) §3.
- **The content seed is applied to the linked Supabase project** (2026-09-23: 4949 statements in 5 chunks, every chunk `ok`), so the content and copy fixes are live on the site.
- **The eight migrations dated 2026-09-23 are NOT applied to the linked project.** Applying a schema change is permanently the owner's action by his own decision (D-36) and is tracked as OA-19; `.claude/hooks/guard-bash.mjs` is the mechanism that enforces it, not an obstacle to work around.
- **The code is NOT deployed.** Every UI fix, every server-side fix and every new page in this entry exists only in the working tree; the live site still runs the previous deploy. **So the owner testing the live site right now sees the content fixes and none of the rest** — no admin link below 1280 px, no per-question quiz feedback, no `/ranking`, no fixed avatar picker, no fixed `--` comment handling. Tracked as OA-24.
- **The pgTAP suites have never executed.** 123 planned assertions across the six suites touched or added this session (`0003`, `0005`, `0009`–`0012`); 208 across all twelve. There is no Docker in the assistant's environment, so `npx supabase start` / `db reset` / `test db` cannot run at all, and CI — which does run `supabase test db` — has not seen this work either, because nothing was pushed. SQL behaviour was instead verified against real PostgreSQL in-process through PGlite (0.5.8, which reports PostgreSQL 18.3 — not 17, as earlier notes said), plus `npm run db:validate` — re-run for this entry: **19 migrations, 51 tables, all with RLS, OK**. That is strong on behaviour and says nothing about role grants, which only pgTAP exercises. The owner has chosen to install Docker Desktop (OA-23).
- **`npm run quality` is green** as of 2026-09-23 — 33 test files, 468 tests, build compiles. The file count is verified here; the 468 and the build come from the owner's own run, which this entry did not repeat.

### Bugs fixed, with their real causes

Recorded because several were easy to mis-diagnose from the symptom.

- **Avatar picker scrolled the page to the bottom on every click.** An `sr-only` radio inside a `<label>` that was not a positioned element: focusing the off-screen input made the browser scroll to it. Affects both onboarding and `/perfil`.
- **The whole admin panel was unreachable by link below 1280 px.** The `/admin` entry existed only in the `xl:flex` desktop nav and was never added to the mobile menu, so on a narrower window there was no way in and the owner reasonably concluded the panel did not exist.
- **`runLearnerQuery` broke four classes of legitimate query.** It wrapped learner SQL as `select * from (<sql>) as __consulta limit N` on **one line**, so a query ending in a `--` comment commented out the closing paren. Fixing that exposed three more defects in the same function: a trailing semicolon followed by a comment survived the strip and produced `syntax error at or near ";"`; the error `position` handed to the editor was 16 characters off, underlining the wrong character; and two output columns with the same name collapsed into one key in object mode, so the comparator graded a value the engine never returned (fixed with `rowMode: "array"`). Details and the regression cases: [SQL_SANDBOX.md](SQL_SANDBOX.md) → "The SELECT wrapper".
- **A solved exercise stayed "Sin empezar" on `/ruta` forever.** The path read lesson state only from `lesson_progress` and nothing wrote that table when an exercise was solved. Fixed server-side (`sync_exercise_lesson_progress` + a one-time backfill in the migration, and the same rule applied when reading). **Verified not to have affected section completion, badges or certificate eligibility**, which read `exercise_progress` and `quiz_attempts` directly — it was a display bug only.
- **The streak card printed "1 congelamiento disponible · Mejor racha: 0".** Two problems: "congelamiento" was jargon nobody had been taught, and the line was assembled with a separator regardless of whether the second fact existed. The mechanic is now "protección de racha" in every learner-facing string (`streak_freezes` stays as the schema name) and the line is built only from facts that have a value.
- **13 Rioplatense voseo strings survived the earlier cleanup** (commit `0e4ae50`) and are now written in "tú".

### Security

Headline only; the findings, the reasoning and the residual risk are in [docs/reviews/2026-09-23-security.md](reviews/2026-09-23-security.md).

Two **pre-existing High** findings were closed, and both gated certificate eligibility:

1. `questions_public` published `theory_questions.pairs` — the grading key of all 27 `matching` questions — to `anon`, and the column grant on `theory_questions` itself was the other half of the same hole.
2. `gradeReviewQuestion` returned the correct answer and the explanation for any question id, without requiring that the learner had ever answered that question.

Stated plainly, because it matters for what the product claims: **until this session the section quiz was not a sound assessment**, and the certificate that depends on passing it rested on that. Both halves are fixed; the database half only takes effect once OA-19 is applied.

Also closed: an **iterable oracle** in the comparator's expected-value example (the fix the reviewer proposed turned out to be insufficient on its own and was extended — see F-4 in the review and the loop test that fails if the guard is removed), and the **leaderboard functions being executable by any signed-in learner** while the feature flag was off, which made the flag a route guard rather than an access control.

### Features

- **Per-question quiz feedback with server-side grading** and a 6-question stratified sample drawn per attempt (D-33, D-34). Each answer is recorded before its feedback is returned and can never be replaced, which is what makes immediate disclosure safe; the score is recomputed in SQL when the attempt closes. [GAMIFICATION.md](GAMIFICATION.md) → Section quizzes, [DATABASE_DESIGN.md](DATABASE_DESIGN.md) §4n.
- **`/ranking`, opt-in and behind the `leaderboards` flag** (D-35), with the consent now dated by `profiles.leaderboard_opt_in_at`. What it discloses and to whom: [SECURITY.md](SECURITY.md) §7.2. The consent wording is settled (OA-21, done the same day); switching the flag on is OA-20 and still needs the pre-existing opt-ins cleared first, because they were ticked under a narrower sentence.
- **`/admin/usuarios` lists every learner by default**, with six audience statistics aggregated in Postgres (country, age bracket, signup cohort, access class, activation, friction). No email and no date of birth crosses the function boundary. [DATABASE_DESIGN.md](DATABASE_DESIGN.md) §4k.
- **Nine new SQL style checks** (`src/lib/validation/style.ts`, 15 message keys in total, five of which pre-existed) that coach from the learner's own query, plus a re-indented version of it, and never fire on an authored reference solution — asserted by `tests/unit/style.test.ts`, which is why two candidate checks were removed and three narrowed. [SQL_SANDBOX.md](SQL_SANDBOX.md) → Style feedback.
- **`SectionHeader` / `Callout` design-system pair**, `StatTile` / `Meter`, and a per-badge visual identity for all 12 badges with the database column reconciled to the config. [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md); visual-hierarchy review in [docs/reviews/2026-09-23-visual-hierarchy.md](reviews/2026-09-23-visual-hierarchy.md).
- **Draft autosave that survives navigation**, with `localStorage` keys namespaced per user and swept when a session ends (SECURITY §7.1).

### What remains before launch

Unchanged from Phase 9 and all of it owner-side: apply the migrations (OA-19), deploy (OA-24), turn on the ranking flag after clearing the old opt-ins (OA-20), create a plain-learner test account (OA-17), install Docker so the pgTAP suites run for the first time (OA-23), and the standing legal/domain/pricing items. The single list is [OWNER_ACTIONS.md](OWNER_ACTIONS.md).

## Post-MVP backlog

MoR provider for other countries · subscriptions · email magic link · write exercises with rollback · sections beyond the 39 and more exercises (the 39-section goal is met; 209 exercises against the 250+ aspiration) · a fifth dataset · spaced-repetition scheduler v2 · PostHog with consent · mobile PWA install · community features · materialized admin metrics · PDF caching in Storage.

Delivered out of this list already: leaderboards (`/ranking`, opt-in and flagged — D-35).
