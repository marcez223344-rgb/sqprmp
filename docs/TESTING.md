# Testing Strategy

## 1. Layers and tools
| Layer | Tool | Location | Runs |
|---|---|---|---|
| Unit | Vitest (+ RTL for components) | `tests/unit/**`, colocated `*.test.ts` | every PR, pre-commit optional |
| Content validation | Vitest + Zod schemas; `npm run content:verify` executes every reference/alternative solution on the dataset snapshot and compares | `tests/content/**` | every PR |
| Dataset validation | `npm run datasets:verify` (consistency rules, row volumes, determinism hash) | `src/datasets/**/verify.ts` | every PR touching datasets |
| Sandbox security | fuzz corpus of malicious SQL + timeout/memory tests | `tests/sandbox/**` | every PR |
| DB / RLS | pgTAP tests via Supabase CLI (`supabase test db`) | `supabase/tests/**` | every PR touching `supabase/` |
| Integration | Vitest against local Supabase (auth callback, submission flow, webhooks, certificate issuance) | `tests/integration/**` | every PR |
| E2E | Playwright (Chromium + Mobile Safari emulation) with a seeded test user and mocked Google login via Supabase test helpers | `tests/e2e/**` | every PR (smoke) + nightly (full) |
| Accessibility | `@axe-core/playwright` on key pages; keyboard-only journey | in E2E | every PR |
| Static | `tsc --noEmit`, ESLint, Prettier check, `npm audit --audit-level=high` | — | every PR |

## 2. Required unit coverage (business rules)
Progress rules; reward calculations and caps; free-exercise limit; entitlement logic (lifetime, expiring, revoked, promo); hint unlocking; solution unlocking (attempts/hints/time/explicit); certificate eligibility; SQL result comparator (columns, types, order flag, tolerance, duplicates, truncation); feedback categorizer; alias validation; dataset generators (determinism: same seed → same SHA-256).

## 3. Critical E2E journeys (must pass before release)
1. New user signs in with Google (mocked provider) → 2. completes onboarding → 3. completes first free exercise → 4. requests hints → 5. submits an incorrect query → 6. receives categorized feedback → 7. completes all free exercises → 8. next gated exercise shows paywall (server-enforced: direct URL and API also blocked) → 9. sandbox payment grants access (webhook simulated with valid signature) → 10. paid user continues → 11. completes a section → 12. receives certificate and public verification works. Plus: responsive layouts (360/768/1280), keyboard-only workspace, error states (engine timeout, network failure), unauthorized access (admin routes, other users' data by id).

## 4. Rules
- No test may hit real Google, Mercado Pago or production Supabase; use local Supabase and provider sandboxes/mocks.
- Every bug fix adds a regression test.
- Flaky E2E tests are quarantined with an issue, not retried forever.
- Coverage thresholds (Vitest): 85 % lines on `src/lib/**`.

## 5. Quality gate (`npm run quality`)
`prettier --check` → `eslint` → `tsc --noEmit` → `vitest run` → `content:verify` → `datasets:verify` → `next build`. E2E runs in CI after the build. See `.github/workflows/ci.yml` (Phase 1).
