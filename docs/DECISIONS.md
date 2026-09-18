# Decision Log (ADR-style)

Format: **D-nn · Title** — Status (Proposed / Approved / Rejected / Superseded) · Date · Context · Decision · Alternatives rejected · Consequences. Agents append here; owner approval changes status to Approved.

## Approved / proposed decisions

### D-01 · Free-exercise limit

Status: **Approved (owner, 2026-09-18)**
Context: brief said 3 in three places and 5 in one. Decision: `FREE_EXERCISE_LIMIT` in `src/config/limits.ts` = **5**, counted as distinct completed gated exercises, enforced server-side. Consequence: E2E journeys 7–8 and the free part of the curriculum use 5.

### D-02 · Technology stack

Status: Proposed · 2026-09-18
Next.js 16 App Router, React 19, TypeScript strict, Tailwind 4, shadcn/ui, Supabase (Postgres/Auth/RLS), `@supabase/ssr`, Zod, React Hook Form, CodeMirror 6, PGlite, `pgsql-ast-parser`, next-intl, `@react-pdf/renderer`, Vitest/RTL/Playwright, ESLint/Prettier, GitHub Actions, Vercel. Rejected: Monaco (heavy, weaker mobile/a11y), Prisma/Drizzle (Supabase generated types + RPC suffice; avoids second migration system), Redis (Postgres rate limiting suffices for MVP).

### D-03 · Safe SQL execution: hybrid PGlite (browser Run + server Submit)

Status: Proposed · 2026-09-18 · See [SQL_SANDBOX.md](SQL_SANDBOX.md). Rejected: RPC in app DB (isolation), separate service (cost), browser-only (grading trust). Fallback: second Supabase project with read-only role. Consequence: learner SQL never reaches the app database; datasets are versioned static snapshots.

### D-04 · Authorization model

Status: Proposed · 2026-09-18 · Single `authorize()` on the server + RLS mirror; admin via custom JWT claim; entitlements table is the only access source; free limit counted server-side.

### D-05 · Payment channels for MVP

Status: **Approved (owner, 2026-09-18): manual channel + Hotmart** · Owner facts: entity in Argentina, sell to all LATAM from day one, price ≈ US$20. Proposed: `manual` provider (ARS bank/Mercado Pago transfer, Wallbit USD, wire) with admin approval **plus** one automated Merchant-of-Record for cards (Hotmart recommended; Paddle alternative), all behind `PaymentProvider`; Mercado Pago Checkout Pro in Phase 6b. Rejected: Stripe (no Argentine sellers), Lemon Squeezy (no payouts to Argentina), subscriptions at launch. See [PAYMENTS.md](PAYMENTS.md) §2b–3.

### D-06 · Pricing

Status: **Approved (owner, 2026-09-18)** · Lifetime access ≈ **US$20** equivalent (local currency where a channel prices locally); promo/scholarship codes from day one.

### D-07 · Content volume at launch

Status: Proposed · 8 fully authored sections, 38 exercises + 8 challenges, ~104 questions, 3 datasets; all 39 sections visible as outlines. See [CURRICULUM.md](CURRICULUM.md).

### D-08 · Analytics

Status: Proposed · First-party `analytics_events` table with a documented spec ([ANALYTICS.md](ANALYTICS.md)); no third-party analytics in MVP. PostHog may be added later with a consent decision.

### D-09 · Legal pages

Status: **Pending owner** · Terms, privacy, refund policy drafted by the assistant as templates; require owner/legal review before production. Jurisdiction assumed Argentina.

### D-10 · Rate limiting in Postgres

Status: Proposed · token-bucket RPC; revisit if Supabase compute becomes the bottleneck.

### D-11 · Certificates are non-accredited

Status: Proposed · wording "Certificado de finalización emitido por Data Minds Solutions"; no academic accreditation implied.

### D-12 · Claude Code operating system

Status: Proposed · 15 agents, 22 skills (doubling as slash commands), 4 hook scripts, 11 rules, 12 templates. See [CLAUDE_CODE_SETUP.md](CLAUDE_CODE_SETUP.md).

### P-2 · Visual direction

Status: **Approved (owner, 2026-09-18)** · Proceed with [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md); wordmark generated in-repo, replaceable via `src/config/brand.ts`.

### D-13 · Leaderboards deferred

Status: Proposed · Schema supports opt-in; UI not in MVP.

### D-14 · Curated avatars, no uploads

Status: Proposed · 24 illustrated avatars; uploads require moderation + storage security, deferred.

## Pending owner decisions (need an answer before the referenced phase)

| #    | Question                                                                          | Needed by | Default if no answer                 |
| ---- | --------------------------------------------------------------------------------- | --------- | ------------------------------------ |
| D-09 | Who reviews legal pages? Company legal name, address, tax ID for footer/invoices? | Phase 9   | Placeholders, launch blocked         |
| P-1  | Domain name (e.g. `academia.dataminds…`)?                                         | Phase 9   | Vercel subdomain                     |
| P-3  | Google Workspace / support email for OAuth consent screen                         | Phase 2   | Owner's Gmail                        |
| P-4  | Approve Supabase Pro + Vercel Pro (~US$45/mo) before production launch            | Phase 9   | Stay on free tiers, no public launch |
| P-5  | Content style: use "tú" (recommended) or "usted"?                                 | Phase 3   | "tú"                                 |
| P-6  | Certificate name shown: founder as "Instructor" and company as issuer?            | Phase 7   | Yes                                  |

## Rejected alternatives (summary)

Monaco editor · Prisma/Drizzle · Redis for rate limits · Stripe · Lemon Squeezy (no AR payouts) · subscriptions-first · RPC-based learner SQL in the app DB · third-party analytics by default · avatar uploads · leaderboards at launch.
