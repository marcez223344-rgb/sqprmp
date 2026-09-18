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

## Phase 8 — Administration and analytics ☐

Admin pages (users/entitlements, payment events, certificates, flags, audit log), analytics event spec implemented, owner dashboard (SQL views in Supabase + minimal page).

## Phase 9 — Quality and launch ☐

Accessibility review, security review, performance (Lighthouse ≥ 90 mobile on public pages), full E2E, seed validation on prod, legal pages, Supabase Pro + Vercel Pro, domain, production deployment runbook, post-launch checklist (monitoring, backups, support inbox).
**Approval needed:** D-09, P-1, P-4, production payments.

## Post-MVP backlog

MoR provider for other countries · subscriptions · leaderboards · email magic link · write exercises with rollback · more datasets and sections (goal: 39 sections, 250+ exercises) · spaced-repetition scheduler v2 · PostHog with consent · mobile PWA install · community features.
