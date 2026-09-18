# Roadmap

Status legend: ☐ not started · ◐ in progress · ☑ done. Each phase ends with: summary, files changed, test/build output, remaining risks, docs updated, approval request only when the next phase involves a material product/payment/security/deployment decision.

## Phase 0 — Discovery and decisions ◐ (this phase)

☑ Directory inspection · ☑ Requirements summary · ☑ Contradictions, risks, free-tier limits · ☑ MVP definition · ☑ Architecture · ☑ SQL sandbox comparison · ☑ Payments comparison · ☑ Data model + RLS matrix · ☑ Curriculum + volume · ☑ Visual direction · ☑ Docs + CLAUDE.md + `.claude/` operating system · ☑ Owner decisions D-01, D-06, P-2 · ☑ D-05 manual + Hotmart

## Phase 1 — Foundation ☑ (2026-09-18)

Next.js 16 scaffold (TS strict, App Router), Tailwind 4 + tokens + dark mode, shadcn/ui base components, `src/config/*`, env validation, next-intl (`es-419`), Supabase clients (browser/server/admin), Supabase CLI project + first migration (profiles, avatars, feature_flags, audit_logs with RLS), Vitest/RTL/Playwright setup, ESLint/Prettier, GitHub Actions CI, README setup steps, landing page skeleton. Gate: `npm run quality` green, first commit pushed. Done: Next.js 16.3 App Router (TypeScript strict, Tailwind 4, tokens, dark mode), `src/config/*`, env validation, next-intl es-419, Supabase clients + `proxy.ts` (session refresh + nonce CSP), foundation migration (profiles, avatars, alias blocklist, feature flags, audit log, rate limits, all with RLS) validated on PGlite, pgTAP suite for CI, Vitest (7 tests), Playwright (5 tests, desktop + mobile), GitHub Actions CI/nightly, Dependabot, landing page + WIP pages.
**Approval needed before Phase 2:** Google OAuth credentials (owner creates them following provided steps).

## Phase 2 — Identity and onboarding ☑ (2026-09-18)

Google OAuth flow, middleware, profile trigger, onboarding stepper, alias validation + blocklist, avatar set (24 assets), consent versions, profile settings, account export/deletion requests, RLS tests. Gate: E2E journeys 1–2. Done: Google OAuth sign-in (PKCE) + `/auth/callback` with allowlisted `next`, POST sign-out, `(learn)`/`(admin)` layouts with `requireUser`/`requireOnboardedProfile`/`requireAdmin`, 3-step onboarding (RHF + shared Zod schemas, live alias check rate-limited server-side, 24 curated avatars, consent versions), profile settings + privacy panel (export/deletion requests with 30-day grace model), migration `20260918180000_onboarding` (`complete_onboarding` RPC, `data_requests`, custom access token hook adding `user_role`, alias blocklist seed), pgTAP suites, 17 unit tests, E2E onboarding journey against local Supabase in CI, types drift check in CI. Pending owner action: create the Supabase dev project + Google OAuth client to exercise real login (steps in DEPLOYMENT.md §2).

## Phase 3 — Curriculum and content engine ☐

Content schemas (Zod) and authoring format, courses/sections/lessons/exercises/questions migrations + RLS views, MDX lesson rendering, learning path page, content seed pipeline (`content:build`, `content:verify`), first 3 sections authored (theory + questions), admin publish toggles via Supabase Studio.

## Phase 4 — Safe SQL exercise engine ☐

Dataset generators (3 datasets) + verification + snapshots, browser engine (PGlite worker), server engine (worker_threads, timeouts, caps), parser gate, comparator + feedback categorizer, attempts/executions persistence, hints + solution unlock, exercise workspace UI (desktop + mobile), fuzz/timeout/load tests. Gate: security gates in [SQL_SANDBOX.md §7](SQL_SANDBOX.md#7-validation-gates-before-phase-4-sign-off); E2E 3–6.
**Approval needed before Phase 5:** none (reversible).

## Phase 5 — Progress and gamification ☐

Reward ledger + RPCs, levels, streaks with freeze (pg_cron), goals, badges (first 12), dashboard, progress analytics, review queue, remaining MVP sections authored (to 8).

## Phase 6 — Monetization ☐

Free limit + paywall (server), products/prices config, `PaymentProvider` + manual provider (admin approval) + Hotmart sandbox, webhook handler, entitlements, promo codes, admin entitlement UI, access settings page. Gate: E2E 7–10 with sandbox payment.
**Approval needed before Phase 6:** Hotmart payout eligibility confirmed by owner. Production credentials never without explicit approval.

## Phase 7 — Assessments and certificates ☐

Question bank types (8), quiz UI, review sessions, section completion rules, certificate requirements, issuance RPC, PDF, verification page, revocation. Gate: E2E 11–12.

## Phase 8 — Administration and analytics ☐

Admin pages (users/entitlements, payment events, certificates, flags, audit log), analytics event spec implemented, owner dashboard (SQL views in Supabase + minimal page).

## Phase 9 — Quality and launch ☐

Accessibility review, security review, performance (Lighthouse ≥ 90 mobile on public pages), full E2E, seed validation on prod, legal pages, Supabase Pro + Vercel Pro, domain, production deployment runbook, post-launch checklist (monitoring, backups, support inbox).
**Approval needed:** D-09, P-1, P-4, production payments.

## Post-MVP backlog

MoR provider for other countries · subscriptions · leaderboards · email magic link · write exercises with rollback · more datasets and sections (goal: 39 sections, 250+ exercises) · spaced-repetition scheduler v2 · PostHog with consent · mobile PWA install · community features.
