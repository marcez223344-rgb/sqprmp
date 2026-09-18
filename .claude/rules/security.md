# Security rules (always loaded)

Authoritative detail: `docs/SECURITY.md`. These are the enforced habits.

- Every server action / route handler: (1) parse input with Zod, (2) `authorize(ctx, action, resource)`, (3) rate limit where user-triggered, (4) do work, (5) audit-log privileged mutations.
- Use `supabase.auth.getUser()` for identity on the server; never trust `getSession()` alone or client-provided user ids.
- Never build SQL strings from user input in application code; use the Supabase client or parameterized RPC. The only place learner SQL is executed is `src/lib/sandbox/**`.
- Secrets: read only through `src/lib/env/server.ts`. Never log env values, tokens, webhook payload headers or full payment payloads. Never write real values into `.env.example`, docs, tests or fixtures.
- Webhooks: verify signature → reject stale timestamps → persist event idempotently → re-fetch from provider API → apply in a transaction. Return 200 only after persistence.
- Redirect parameters must be validated against an internal-path allowlist.
- Hints, solutions, expected results, `question_options.is_correct` and explanations are served only by server code after unlock/submission checks; never included in page props before that.
- Rewards: only via `award_reward` RPC with a deterministic `event_key`. No client-provided XP/coins.
- Admin capabilities require `role = 'admin'` via `authorize()` and are audit-logged with a reason.
- Add security headers (CSP incl. `wasm-unsafe-eval` scoped for PGlite, HSTS, nosniff, referrer policy) in `next.config.ts`; document any relaxation.
- Before committing: run the secret scan (hook does this on `git commit`); if a secret was ever committed, rotate it and tell the owner.
