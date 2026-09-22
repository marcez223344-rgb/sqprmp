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

Status: **Approved (owner, 2026-09-18): manual channel + Hotmart** · Owner facts: entity in Argentina, sell to all LATAM from day one, price ≈ US$20. Proposed: `manual` provider (ARS bank/Mercado Pago transfer, Wallbit USD, wire) with admin approval **plus** one automated Merchant-of-Record for cards (Hotmart recommended; Paddle alternative), all behind `PaymentProvider`; Mercado Pago Checkout Pro in Phase 6b. Rejected: Stripe (no Argentine sellers), Lemon Squeezy (no payouts to Argentina), subscriptions at launch. Also considered (2026-09-18, owner question): Gumroad — simple webhook ("Ping") integration, but ≈13% effective fees, cards-only in USD (no Mercado Pago/PIX), and no local-bank payouts to Argentina (PayPal only); kept as a fallback card provider if Hotmart onboarding fails. See [PAYMENTS.md](PAYMENTS.md) §2b–3.

### D-06 · Pricing

Status: **Approved (owner, 2026-09-18)** · Lifetime access ≈ **US$20** equivalent (local currency where a channel prices locally); promo/scholarship codes from day one.

### D-07 · Content volume at launch

Status: Proposed · 8 fully authored sections, 38 exercises + 8 challenges, ~104 questions, 3 datasets; all 39 sections visible as outlines. See [CURRICULUM.md](CURRICULUM.md).

### D-08 · Analytics

Status: Proposed · First-party `analytics_events` table with a documented spec ([ANALYTICS.md](ANALYTICS.md)); no third-party analytics in MVP. PostHog may be added later with a consent decision.

### D-09 · Legal pages

Status: **Partially answered (owner, 2026-09-19)** · The service is offered by the founder as an individual taxpayer (monotributo); "Data Minds Solutions" is a trade name, not a company. Legal drafts (`src/content/legal/*`) now name the founder as provider and mention type-C invoices. Still pending: street address and CUIT in `src/config/brand.ts` (the pages show a visible draft notice until then) and a lawyer's review of the wording. Jurisdiction assumed Argentina.

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

### D-15 · Analytics scope at launch

Status: **Accepted (2026-09-18)**. First-party events only, written server-side after Zod validation (docs/ANALYTICS.md). Not emitted at launch: `page_viewed` (would need an anonymous cookie id and a per-request write from the proxy; deferred until there is traffic worth measuring), `signup_started/completed` (Google OAuth happens off-site; `onboarding_completed` is the practical signup signal), `query_run` (browser runs never reach the server by design), `streak_frozen` (SQL-side). Owner metrics are computed on request by `admin_metrics()`; a materialized view is planned only if the RPC exceeds ~1 s.

### D-16 · Cloud environments and the assistant's operating authority

Status: **Accepted (2026-09-19)**. Single Supabase project `sqprmp` (ref `pgkbmhuehmotjctzjwxx`, Free, us-west-2) is the launch database (P-4: free tiers). Migrations 0001–0008 and seeds 0001–0003 were applied on 2026-09-19 with the CLI (`supabase migration up --linked`, `db query --file`); auth settings (custom access token hook, redirect URLs, email confirmations off, Google provider enabled) are managed from `supabase/config.toml` via `supabase config push` — the Google client id/secret are owner-provided env values, never committed. Code lives in `github.com/marcez223344-rgb/sqprmp`; Vercel team `sqprmp` (Hobby) hosts the app via the Git integration. The owner instructed: "do not ask me to type commands again … I approve you do it yourself" and "do not ask me permission for any more commands, I approve them all". The assistant therefore runs setup/deploy commands directly; the standing prohibitions that need a _fresh_ written go remain: production payment credentials, destructive/remote resets, force-push, pricing/legal changes.

### D-17 · Launch pricing (proposed, owner decides)

Status: **Proposed (2026-09-22)** — nothing in `src/config/pricing.ts` changed; changing price needs the owner's go (CLAUDE.md).

Market research (2026-09-22, sources in the session log): Coderhouse AR sells a _live_ 11-week SQL course at ARS 243.936 (~USD 163 discounted, list ARS 304.920); LearnSQL.es — the closest product shape, Spanish, browser exercises, lifetime — sells a single course at €29 and all-access at €99; Udemy Spanish SQL courses effectively sell at USD 10–15 but are video-only and the marketplace keeps ~68 %; Platzi ARS 359.900/year and DataCamp USD 168–336/year are subscriptions. Blue dollar 2026-09-22: ARS 1.535/1.555. Junior analyst salary in AR: ARS 450.000–900.000/month.

Recommendation: **USD 29 founder / USD 49 regular**, and **ARS 39.900 founder / ARS 69.900 regular** as an independent round number (not an FX conversion), with 3 cuotas sin interés on Mercado Pago. Founder price for the first 50 students with a _real_ counter, an intermediate step (USD 39 / ARS 54.900) for students 51–200, then full price. Keep the one-time model: the curriculum is finite, and neither bank transfer nor Wallbit supports recurring charges. USD 15 was rejected as sitting inside Udemy's commodity band while leaving no room to raise later.

Open: the owner's answer. Unverified in the research: Udemy's actual ARS pricing, Coderhouse "SQL Flex" self-paced price, Digital House's price, and whether the 30 % Ganancias perception on USD card spend still applies in 2026.

## Pending owner decisions (need an answer before the referenced phase)

| #    | Question                                                                                                                                                                                                                                                                                                                       | Needed by       | Default if no answer               |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------- | ---------------------------------- |
| D-09 | Street address + CUIT for legal pages; lawyer review of the drafts. **Owner, 2026-09-22: not published for now** — `brand.legalAddress`/`taxId` are empty, the texts identify the provider by name + support email, and the draft banner is off. Required before charging in Argentina (Ley 24.240 and AFIP e-commerce rules). | Before charging | Name + support email only          |
| P-1  | Domain name (e.g. `academia.dataminds…`)?                                                                                                                                                                                                                                                                                      | Phase 9         | Vercel subdomain                   |
| P-3  | Google Workspace / support email for OAuth consent screen                                                                                                                                                                                                                                                                      | Phase 2         | Owner's Gmail                      |
| P-4  | Free tiers for soft launch. **Owner, 2026-09-22: stay on Vercel Hobby while testing with first customers, upgrade later.** Hobby's terms forbid commercial use, so the risk (project suspension on review, no SLA) is accepted knowingly; Supabase Free pauses after 7 days idle — the nightly keep-alive covers it.           | Before scaling  | Free tiers, keep-alive workflow on |
| P-5  | Content style: use "tú" (recommended) or "usted"?                                                                                                                                                                                                                                                                              | Phase 3         | "tú"                               |
| D-17 | Launch price: USD 29 founder / USD 49 regular, ARS 39.900 / ARS 69.900 (recommended above) — or a different number                                                                                                                                                                                                             | Before selling  | Current USD 20 stays               |
| P-6  | Certificate name shown: founder as "Instructor" and company as issuer?                                                                                                                                                                                                                                                         | Phase 7         | Yes                                |

## Rejected alternatives (summary)

Monaco editor · Prisma/Drizzle · Redis for rate limits · Stripe · Lemon Squeezy (no AR payouts) · subscriptions-first · RPC-based learner SQL in the app DB · third-party analytics by default · avatar uploads · leaderboards at launch.
