# Security and Privacy Model

Related: [SQL_SANDBOX.md](SQL_SANDBOX.md) (learner SQL), [DATABASE_DESIGN.md](DATABASE_DESIGN.md#4-rls-policy-matrix) (RLS matrix), [PAYMENTS.md](PAYMENTS.md).

## 1. Principles

1. Server is authoritative for authorization, rewards, entitlements, certificates and grading; the browser is untrusted.
2. Least privilege: RLS on every table; the Supabase secret key only in `src/lib/supabase/admin.ts` (marked `server-only`); `SECURITY DEFINER` functions pin `search_path` and validate `auth.uid()`.
3. Defense in depth for learner SQL (parser gate + isolated ephemeral engine + role + timeouts + caps).
4. Minimize PII; document every field's purpose; support export and deletion.
5. Everything privileged is logged in `audit_logs` (actor, action, target, diff, hashed IP).

## 2. Secrets and configuration

- `.env.local` (git-ignored) locally; Vercel environment variables in deployment; `.env.example` has names only.
- `src/lib/env/server.ts` validates server env with Zod at boot and is `server-only`; `src/lib/env/client.ts` only exposes `NEXT_PUBLIC_*`.
- Supabase: use the new **publishable** (`sb_publishable_…`) and **secret** (`sb_secret_…`) keys; the legacy `service_role` JWT is never used in the browser and is rotated if ever exposed.
- Hooks in `.claude/hooks/` scan edits and staged files for secret patterns (JWT-like `eyJ…`, `sb_secret_`, `APP_USR-`, `sk_live_`, private keys).
- Payment credentials are sandbox/test until the owner explicitly approves production (D-05).

## 3. Authentication and session

- Supabase Auth with Google OAuth (PKCE flow) through `@supabase/ssr`; cookies `HttpOnly`, `Secure`, `SameSite=Lax`.
- Middleware refreshes sessions; server components read the user via `getUser()` (validated with the auth server), never `getSession()` alone for authorization.
- OAuth callback validates `next` redirect against an allowlist of internal paths (no open redirects).
- Magic-link email is architecturally supported (provider toggle in `features.ts`), disabled in MVP.
- Implementation (Phase 2): `signInWithGoogle` server action → Supabase OAuth with `redirectTo=/auth/callback?next=…` (`next` validated by `safeNextPath()`), `exchangeCodeForSession`, then `/onboarding` until `onboarding_completed_at` is set. Sign-out is POST-only. `proxy.ts` does an optimistic redirect; layouts re-verify with `getUser()`; the token hook adds `user_role` so `is_admin()` needs no subquery.

## 4. Authorization

- `authorize()` in `src/lib/auth/authorize.ts` is the single decision point for server actions and route handlers. Every mutating endpoint calls it first; missing call = review blocker.
- Roles: `learner`, `admin`. Admin is assigned only by direct DB update (documented runbook) and appears as a JWT custom claim via the Supabase custom access token hook so RLS `is_admin()` does not require a subquery.
- Entitlements: `has_active_entitlement(user_id)` = exists row with `revoked_at IS NULL AND (ends_at IS NULL OR ends_at > now())`.
- Free limit: `free_exercises_used(user_id)` counts distinct _completed_ gated exercises; a submission on a new gated exercise beyond `FREE_EXERCISE_LIMIT` without entitlement is rejected server-side with a paywall response. Starting/reading an exercise beyond the limit is also blocked (server component redirects), so previews do not leak premium answers.

## 5. Input validation and abuse prevention

- Zod schemas on every boundary (server actions, route handlers, webhooks, RPC parameters).
- Rate limits (Postgres token bucket): submit 30/5 min, hint 20/5 min, alias check 10/min, checkout 5/10 min, webhook 600/min per provider, verification page 60/min per IP.
- Alias policy: 3–20 chars, `[a-z0-9_]`, normalized (lowercase, confusables folded), blocklist of slurs/impersonation terms (`admin`, `dataminds`, `marcelo`), uniqueness enforced by DB constraint on `alias_normalized`.
- Avatars: curated set only; no uploads in MVP.
- Reward abuse: idempotent `event_key`, daily XP cap, `suspicious_activity` on anomalies (e.g. > 20 correct submissions in 10 min, identical SQL across accounts), admin review.
- Certificates: issuance only through `issue_certificate()` after requirement verification; verification page rate-limited and returns minimal data.
- Headers: per-request CSP with nonce + `'strict-dynamic'` built in `src/lib/security/csp.ts` and applied by `src/proxy.ts` (`'wasm-unsafe-eval'` for PGlite; `'unsafe-eval'` only in development; styles allow `'unsafe-inline'` because Next/Tailwind inject style tags). Static headers in `next.config.ts`: `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy`, HSTS in production. Inline scripts (theme bootstrap) must carry the nonce from the `x-nonce` request header.
- Dependencies: Dependabot + `npm audit` in CI; lockfile committed.

## 6. Payment security

- Webhooks: verify provider signature (Mercado Pago `x-signature` HMAC with `ts`/`v1`; Stripe `Stripe-Signature`), reject stale timestamps (> 5 min), store raw event with unique `(provider, provider_event_id)`, process idempotently, then **re-fetch the payment from the provider API** before granting access (never trust the webhook body alone).
- No card data ever touches our servers (hosted checkout).
- Admin grants/revocations are audit-logged with reason.

## 7. Privacy

### 7.1 Data inventory and purpose

| Data                                     | Purpose                                                                         | Retention                                           |
| ---------------------------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------- |
| Email (from Google)                      | Account identity, receipts, transactional email                                 | Account lifetime                                    |
| Display name, alias, avatar              | Product identity; alias/avatar may be public if the user opts into leaderboards | Account lifetime                                    |
| Date of birth                            | Age verification (18+), coarse cohort analytics (age band only)                 | Account lifetime; only birth year kept in analytics |
| Country                                  | Pricing/currency, localization, aggregate analytics                             | Account lifetime                                    |
| Gender (optional, "Prefiero no decirlo") | Aggregate diversity metrics only                                                | Account lifetime                                    |
| SQL level, goal, weekly goal             | Personalization                                                                 | Account lifetime                                    |
| Attempts / SQL text                      | Learner's own review, feedback quality                                          | Account lifetime; deleted on account deletion       |
| Payment references                       | Entitlement, refunds, accounting                                                | Legal retention (invoicing)                         |
| Analytics events                         | Product improvement; no PII, pseudonymous ids                                   | 24 months                                           |

### 7.2 Consent and rights

- Terms and privacy versions recorded with timestamps at onboarding; re-consent on material changes.
- Self-service: edit profile, request export (JSON), request deletion (30-day grace, then `delete_user_data()`).
- Public surfaces (leaderboards, certificate verification) show alias or chosen certificate name only, never email, DOB, country or gender.
- Third-party analytics is disabled by default (D-08); enabling it requires an explicit privacy decision and consent banner.
- Legal basis and jurisdiction wording (Argentina Ley 25.326, Brazil LGPD, Mexico LFPDPPP, etc.) are drafted in the Privacy Policy page and need owner/legal review (pending decision D-09).

## 8. Security review cadence

`review-security` skill before each phase sign-off and before any deployment to production; `release-reviewer` agent produces a written report saved under `docs/reviews/`.
