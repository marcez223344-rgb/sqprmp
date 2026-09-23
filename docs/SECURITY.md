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
- Rate limits (Postgres token bucket): submit 30/5 min, hint 20/5 min, quiz answer **and** quiz finish 20/5 min (`quiz_answer:<uid>`, `quiz_finish:<uid>` — a 6-question attempt costs 6, so this is three full attempts and far short of farming a bank), quiz review 30/5 min (`quiz_review:<uid>`), alias check 10/min, checkout 5/10 min, webhook 600/min per provider, verification page 60/min per IP. Buckets are keyed per feature so quiz answers and SQL submissions never share a budget (security review F-6/F-7, 2026-09-23).
- Answer keys: `theory_questions.answer`, `explanation_md`, `question_options.is_correct` and `theory_questions.pairs` (the `matching` key) are readable only by the service role; `questions_public` carries prompts and is granted to `authenticated` only. A learner sees the correct answer of one question only after that answer is recorded and final (`quiz_answers`), and review practice reveals a question only if the learner has already answered it (F-1/F-2).
- Alias policy: 3–20 chars, `[a-z0-9_]`, normalized (lowercase, confusables folded), blocklist of slurs/impersonation terms (`admin`, `dataminds`, `marcelo`), uniqueness enforced by DB constraint on `alias_normalized`.
- Avatars: curated set only; no uploads in MVP.
- Reward abuse: idempotent `event_key`, daily XP cap, `suspicious_activity` on anomalies (e.g. > 20 correct submissions in 10 min, identical SQL across accounts), admin review.
- Certificates: issuance only through `issue_certificate()` after requirement verification; verification page rate-limited and returns minimal data.
- Headers: per-request CSP with nonce + `'strict-dynamic'` built in `src/lib/security/csp.ts` and applied by `src/proxy.ts` (`'wasm-unsafe-eval'` for PGlite; `'unsafe-eval'` only in development; styles allow `'unsafe-inline'` because Next/Tailwind inject style tags). Static headers in `next.config.ts`: `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy`, HSTS in production. Inline scripts (theme bootstrap) must carry the nonce from the `x-nonce` request header.
- Dependencies: Dependabot + `npm audit` in CI; lockfile committed.

## 6. Payment security

- Webhooks: verify provider signature (Mercado Pago `x-signature` HMAC with `ts`/`v1`; Stripe `Stripe-Signature`), reject stale timestamps (> 5 min), store raw event with unique `(provider, provider_event_id)`, process idempotently, then **re-fetch the payment from the provider API** before granting access (never trust the webhook body alone).
- No card data ever touches our servers (hosted checkout).
- Implementation (Phase 6): `src/lib/payments/service.ts#processWebhook` — Hotmart hottok compared with `timingSafeEqual`, per-provider rate limit, 64 KB body cap, event persisted before any effect, provider re-fetch mandatory in production (`HOTMART_SKIP_REFETCH` is ignored when `NODE_ENV=production`), buyer matched by echoed user id or email, chargebacks flag `suspicious_activity`. Manual transfers are approved only by admins through audited RPCs.
- Admin grants/revocations are audit-logged with reason.

## 7. Privacy

### 7.1 Data inventory and purpose

| Data                                     | Purpose                                                                                                                                                                                     | Retention                                           |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| Email (from Google)                      | Account identity, receipts, transactional email                                                                                                                                             | Account lifetime                                    |
| Display name, alias, avatar              | Product identity. Display name is never published. Alias + avatar are shown to other signed-in learners on the ranking if the learner opted in, together with their level and XP (see §7.2) | Account lifetime                                    |
| Date of birth                            | Age verification (18+), coarse cohort analytics (age band only)                                                                                                                             | Account lifetime; only birth year kept in analytics |
| Country                                  | Pricing/currency, localization, aggregate analytics                                                                                                                                         | Account lifetime                                    |
| Gender (optional, "Prefiero no decirlo") | Aggregate diversity metrics only                                                                                                                                                            | Account lifetime                                    |
| SQL level, goal, weekly goal             | Personalization                                                                                                                                                                             | Account lifetime                                    |
| Attempts / SQL text                      | Learner's own review, feedback quality                                                                                                                                                      | Account lifetime; deleted on account deletion       |
| Payment references                       | Entitlement, refunds, accounting                                                                                                                                                            | Legal retention (invoicing)                         |
| Analytics events                         | Product improvement; no PII, pseudonymous ids                                                                                                                                               | 24 months                                           |
| Unsent SQL drafts (browser)              | Not losing typed work on navigation, crash or back/forward                                                                                                                                  | Until the session ends (swept), see below           |

**Unsent SQL drafts in `localStorage`.** The editor keeps a copy of the current query in the browser
under `dms.draft.<userId>.<slug>` (`{sql, savedAt}`), alongside the authoritative copy in
`exercise_progress.draft_sql`. It holds the learner's own work only: no credentials, no tokens, no
third party's data. Two rules keep it safe on a shared machine (security review 2026-09-23, F-8):

- **Keys are namespaced by user id**, so a second account signing in on the same browser can never
  read or resume the first one's drafts, even if the sweep below fails. The id is a storage key
  only; it is never used for an authorization decision.
- **Drafts are swept when a session ends.** `/auth/signout` is a server POST and cannot touch
  browser storage, so the sweep runs in the client that triggers it (`SignOutForm.onSubmit`) and
  again on mount of the sign-in page, which covers sessions that ended without a clean sign-out.
  Keys written before namespacing existed are deleted, not migrated: an un-namespaced draft has no
  identifiable owner, and handing it to whoever signs in next is the leak this closes.

Every access is wrapped in `try/catch`: `localStorage` throws in private mode and when the quota is
full, and a lost browser copy is never fatal because the server copy is the durable one.

### 7.2 Consent and rights

- Terms and privacy versions recorded with timestamps at onboarding; re-consent on material changes.
- Self-service: edit profile, request export (JSON), request deletion (30-day grace, then `delete_user_data()`).
- Certificate verification (public, by code) shows the chosen certificate name, the requirement title, skills, issue date and revocation status. No user id, no email, no other profile data.
- **Ranking (`/ranking`, opt-in, `leaderboards` flag).** What is disclosed, stated exactly because the consent text has to match it: **alias, avatar, level and XP** — lifetime XP on the "Histórico" board and XP earned in the last 7 days on the default board, which also reveals _how recently_ someone practised. Never display name, email, date of birth, country or gender. **To whom:** other signed-in learners only, and only those who also loaded the page; the RPCs are `security definer` with execute revoked from `anon` and from `authenticated` (the server calls them with the admin client after checking the flag), and they return nothing while the flag is off. A learner who did not opt in is absent from the rows and from the participant count, and cannot be inferred from either.
- Ranking consent is a record, not a setting: `profiles.leaderboard_opt_in` carries `leaderboard_opt_in_at`, stamped by a database trigger on every change (opt-in and opt-out) and not writable by the learner or by application code. Null means the choice predates the column (2026-09-23); no date was invented for consent already given. Opting out removes the learner from the board on the next read — there is no cached copy.
- Third-party analytics is disabled by default (D-08); enabling it requires an explicit privacy decision and consent banner.
- Legal basis and jurisdiction wording (Argentina Ley 25.326, Brazil LGPD, Mexico LFPDPPP, etc.) are drafted in the Privacy Policy page and need owner/legal review (pending decision D-09).

## 8. Security review cadence

`review-security` skill before each phase sign-off and before any deployment to production; `release-reviewer` agent produces a written report saved under `docs/reviews/`.

Reviews are stored under `docs/reviews/` (latest: `2026-09-23-security.md`, alongside `2026-09-23-visual-hierarchy.md`). A dated review is a record of what was true when it was written: where later work superseded a finding, the later state is documented here or in the relevant doc, and the review file is left as written.
