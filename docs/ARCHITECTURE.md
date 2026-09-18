# Architecture — Data Minds SQL Academy

**Status:** Phase 0 approved design. Implementation starts in Phase 1. Decisions are numbered in [DECISIONS.md](DECISIONS.md).

## 1. System overview

```
                 ┌──────────────────────────── Vercel ────────────────────────────┐
Learner ───────► │ Next.js 16 App Router (React 19, TypeScript strict, Tailwind 4) │
(browser)        │  • Server Components for pages     • Route handlers / actions   │
  │              │  • Client islands: editor, results, quiz, charts                │
  │ PGlite       │  • Node runtime for: sandbox submit, webhooks, certificates     │
  │ (Run)        └────────┬───────────────────────────┬──────────────────┬────────┘
  │                       │ @supabase/ssr (RLS)       │ secret client    │ provider SDK
  ▼                       ▼                           ▼                  ▼
static snapshots   ┌────────────────────────────────────────┐   ┌──────────────────┐
/datasets/*.tar.gz │ Supabase: Postgres + Auth (Google) +   │   │ Payment provider │
                   │ RLS + RPC + pg_cron (streaks, cleanup) │   │ (manual + MoR;   │
                   └────────────────────────────────────────┘   │  MP Checkout 6b) │
                                                                └──────────────────┘
```

Three trust zones:

1. **Browser**: untrusted. Runs the exploratory SQL engine on fictional data, renders UI, holds only a Supabase session cookie and non-sensitive content.
2. **Next.js server (Vercel)**: trusted. Enforces authorization, executes graded SQL in an isolated ephemeral engine, computes rewards, talks to payments and generates certificates. Only place the Supabase secret key exists.
3. **Supabase**: system of record. RLS protects every exposed table; privileged mutations happen through `SECURITY DEFINER` RPCs called by the server or through the secret client.

## 2. Technology stack (D-02)

| Concern | Choice | Why |
|---|---|---|
| Framework | Next.js 16 (App Router, Active LTS), React 19 | Server components, route handlers, Vercel-native |
| Language | TypeScript `strict`, `noUncheckedIndexedAccess` | Correctness |
| Styling | Tailwind CSS 4 + design tokens in CSS variables | Fast, themeable |
| Components | shadcn/ui (Radix primitives, copied into repo) | Accessible, owned code, no runtime lock-in |
| Forms/validation | React Hook Form + Zod (shared schemas client/server) | One schema, two uses |
| Data | Supabase Postgres, `@supabase/ssr` for cookie sessions, generated DB types | RLS-first |
| Auth | Supabase Auth, Google OAuth; magic link ready | Requirement |
| SQL editor | CodeMirror 6 + `@codemirror/lang-sql` | Lighter than Monaco, good mobile behavior, accessible |
| SQL engine | PGlite (browser Run + server Submit); see [SQL_SANDBOX.md](SQL_SANDBOX.md) | Isolation without extra infra |
| SQL gate | `pgsql-ast-parser` | Pure TS parser for statement allowlisting |
| i18n | `next-intl` with `es-419` catalog | No hardcoded strings |
| PDF | `@react-pdf/renderer` (server) | Certificates |
| Tests | Vitest + React Testing Library; Playwright; Supabase CLI local DB for integration | Requirement |
| Quality | ESLint (flat config) + Prettier + `tsc --noEmit`; GitHub Actions | Requirement |
| Analytics | First-party `analytics_events` table (D-08); optional PostHog later | Privacy |
| Rate limiting | Postgres token bucket RPC (no Redis in MVP) | Fewer moving parts |

Versions are pinned at Phase 1 after checking each library's current release; no library is added without an entry in DECISIONS.md if it affects security, cost or architecture.

## 3. Repository structure (target)

```
src/
  app/                      # routes: (public)/, (auth)/, (learn)/, (admin)/, api/
  components/               # ui/ (shadcn), layout/, workspace/, learn/, marketing/
  config/                   # brand.ts, pricing.ts, limits.ts, social.ts, founder.ts, features.ts
  content/                  # authored content sources (sections, lessons, exercises, questions) + zod schemas
  datasets/                 # generators (seeded), schema DDL, docs, build script
  lib/
    auth/                   # session, authorize(), roles
    supabase/               # client (browser), server (cookies), admin (secret, server-only)
    sandbox/                # gate.ts, executor.ts, worker.ts, browser-engine.ts
    validation/             # result comparator, feedback rules
    learning/               # progress, hints, solution unlock, quizzes
    rewards/                # xp, coins, streaks, badges (idempotent)
    payments/               # PaymentProvider interface + providers/manual, providers/hotmart (+ mercadopago in 6b)
    certificates/
    analytics/
    env/                    # server.ts / client.ts zod-validated env
  messages/es-419.json      # UI strings
supabase/
  migrations/               # timestamped SQL, RLS in the same migration as the table
  seed/                     # dev seed (content + test users)
  tests/                    # pgTAP / SQL RLS tests
tests/                      # unit, integration, e2e (playwright), sandbox fuzz
docs/                       # this folder
.claude/                    # agents, skills, rules, hooks, templates
```

## 4. Key runtime flows

### 4.1 Authentication
Google OAuth via Supabase → `/auth/callback` route exchanges the code → cookie session (`@supabase/ssr`) → middleware refreshes tokens → `profiles` row created by a DB trigger on `auth.users` insert → if `onboarding_completed_at IS NULL` redirect to `/onboarding`.

### 4.2 Authorization
Single entry point `authorize(ctx, action, resource)` on the server. Rules: `role` (learner/admin), `entitlement` (active lifetime/subscription/promo), `free-limit` (count of distinct completed premium-gated exercises vs `FREE_EXERCISE_LIMIT`), `content published`. RLS mirrors these for direct reads; server code is authoritative for mutations.

### 4.3 Exercise submission
Client posts `{exerciseId, sql}` → server: authorize → rate limit → gate → execute (ephemeral PGlite) → compare with `exercise_expected_results` → generate structured feedback → insert `attempts` row → if first correct completion: RPC `award_exercise_completion` (idempotent by `(user_id, exercise_id)`) → return result/feedback/rewards. Hints and solution reveal follow the same authorize-then-serve pattern and are logged.

### 4.4 Payments
Client → server action `createCheckout(productId)` → provider creates preference/session → redirect. Provider webhook → route handler verifies signature → upsert `payment_events` (unique provider event id → idempotent) → on approved: insert `purchases`, insert/extend `entitlements` inside one transaction (RPC). Entitlement checks read `entitlements` only.

### 4.5 Certificates
Server verifies `certificate_requirements` for the section/path → inserts `certificates` (id = ULID, `verification_code` random) → PDF rendered on demand and cached in Supabase Storage (private bucket, signed URL) → public page `/verificar/[code]` shows name, title, date, status only.

## 5. Configuration-driven identity
`src/config/brand.ts` (name, tagline, logo paths, colors), `founder.ts`, `pricing.ts` (products, currencies, durations), `limits.ts` (free limit, hint thresholds, timeouts, reward caps), `social.ts`, `features.ts` (feature flags with DB override). Components never hardcode these values; a lint rule flags literal "Data Minds" outside `src/config`.

## 6. Environments
`local` (Supabase CLI in Docker, PGlite, sandbox payments) → `preview` (Vercel preview + Supabase branch or a dedicated dev project) → `production` (Vercel prod + Supabase Pro project). See [DEPLOYMENT.md](DEPLOYMENT.md).

## 7. Cost model (owner-facing)
Development: US$0 (Supabase Free + Vercel Hobby). Launch: Supabase Pro US$25/mo (no pausing, backups), Vercel Pro US$20/mo (commercial use requires Pro), domain ~US$15/yr, payment fees 4–7 % per sale. Optional later: PostHog free tier, Resend for email.

## 8. Risks and mitigations (Phase 0)
| Risk | Impact | Mitigation |
|---|---|---|
| PGlite cold start / memory on Vercel | Slow submits | Measure in Phase 4; fallback B documented |
| Supabase Free pausing | Dev DB offline | Weekly keep-alive cron in CI; Pro before launch |
| Payment provider coverage per country | Lost sales | Provider abstraction; decision D-05 |
| Content quality vs. volume | Weak learning | Content schemas + educational review skill; 8 deep sections first |
| Reward abuse | Fake progress | Server-side, idempotent, capped rewards; audit log |
| Solo maintainer bandwidth | Delays | Phased roadmap, quality gate automation |
