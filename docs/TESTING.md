# Testing Strategy

## 1. Layers and tools

| Layer              | Tool                                                                                                                                                                           | Location                                      | Runs                              |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------- | --------------------------------- |
| Unit               | Vitest (+ RTL for components)                                                                                                                                                  | `tests/unit/**`, colocated `*.test.ts`        | every PR, pre-commit optional     |
| Content validation | Vitest + Zod schemas; `npm run content:verify` executes every reference/alternative solution on the dataset snapshot and compares                                              | `tests/content/**`                            | every PR                          |
| Dataset validation | `npm run datasets:verify` (consistency rules, row volumes, determinism hash)                                                                                                   | `src/datasets/**/verify.ts`                   | every PR touching datasets        |
| Sandbox security   | fuzz corpus of malicious SQL + timeout/memory tests                                                                                                                            | `tests/sandbox/**`                            | every PR                          |
| DB / RLS           | pgTAP via Supabase CLI (`supabase test db`, CI) + `npm run db:validate` (PGlite: applies migrations, asserts RLS on every table and pinned `search_path` on definer functions) | `supabase/tests/**`, `scripts/db-validate.ts` | every PR                          |
| Integration        | Vitest against local Supabase (auth callback, submission flow, webhooks, certificate issuance)                                                                                 | `tests/integration/**`                        | every PR                          |
| E2E                | Playwright (Chromium desktop + Pixel 7 emulation) with a seeded test user and mocked Google login via Supabase test helpers                                                    | `tests/e2e/**`                                | every PR (smoke) + nightly (full) |
| Accessibility      | `@axe-core/playwright` on key pages; keyboard-only journey                                                                                                                     | in E2E                                        | every PR                          |
| Static             | `tsc --noEmit`, ESLint, Prettier check, `npm audit --audit-level=high`                                                                                                         | —                                             | every PR                          |

## 2. Required unit coverage (business rules)

Progress rules; reward calculations and caps; free-exercise limit; entitlement logic (lifetime, expiring, revoked, promo); hint unlocking; solution unlocking (attempts/hints/time/explicit); certificate eligibility; SQL result comparator (columns, types, order flag, tolerance, duplicates, truncation); feedback categorizer; alias validation; dataset generators (determinism: same seed → same SHA-256).

## 3. Critical E2E journeys (must pass before release)

1. New user signs in with Google (mocked provider) → 2. completes onboarding → 3. completes first free exercise → 4. requests hints → 5. submits an incorrect query → 6. receives categorized feedback → 7. completes the 5 free exercises → 8. the 6th (gated) exercise shows the paywall (server-enforced: direct URL and API also blocked) → 9. sandbox payment grants access (webhook simulated with valid signature) → 10. paid user continues → 11. completes a section → 12. receives certificate and public verification works → 13. the owner reviews a payment and an entitlement in `/admin` while a learner is denied every admin route. Plus: responsive layouts (360/768/1280), keyboard-only workspace, error states (engine timeout, network failure), unauthorized access (admin routes, other users' data by id).

## 4. Rules

- No test may hit real Google, Mercado Pago or production Supabase; use local Supabase and provider sandboxes/mocks.
- Every bug fix adds a regression test.
- Flaky E2E tests are quarantined with an issue, not retried forever.
- Coverage thresholds (Vitest): 85 % lines on `src/lib/**`.

## 5. Quality gate (`npm run quality`)

`format:check` (prettier) → `lint` → `typecheck` (`tsc --noEmit`) → `test` (vitest run) → `db:validate` → `content:validate` → `datasets:verify` → `build`. `content:verify` is **not** in the gate — it executes every reference solution against the dataset snapshots and is run when content changes. E2E runs in CI after the build. The script itself is the source of truth (`package.json`); see `.github/workflows/ci.yml`.

## 6. What has and has not actually run

Stated because "a suite exists" and "a suite passed" are different claims.

- **Vitest and `next build`**: green on 2026-09-23 (33 test files).
- **`db:validate`**: green on 2026-09-23 — 19 migrations applied in-process on PGlite (real PostgreSQL), 51 tables, all with RLS. It exercises behaviour and constraints; it does **not** exercise role grants, because everything runs as one role.
- **pgTAP**: the twelve suites (208 planned assertions; 123 of them in the six files touched or added on 2026-09-23) run in CI via `supabase test db` and locally via `npx supabase db reset`, both of which need Docker. There is no Docker in the assistant's environment, and the 2026-09-23 work has not been pushed, so **the new and changed suites have never executed anywhere** — not locally, not in CI. Owner actions OA-19 (local run first) and OA-23 (install Docker) exist for exactly this.
- **Playwright**: runs in CI against local Supabase; same caveat about the unpushed working tree.
