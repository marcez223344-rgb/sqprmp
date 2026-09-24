# Testing Strategy

## 1. Layers and tools

| Layer              | Tool                                                                                                                                                                           | Location                                                                                      | Runs                              |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- | --------------------------------- |
| Unit               | Vitest (+ RTL for components)                                                                                                                                                  | `tests/unit/**`, colocated `*.test.ts`                                                        | every PR, pre-commit optional     |
| Content validation | Vitest + Zod schemas; `npm run content:verify` executes every reference/alternative solution on the dataset snapshot and compares                                              | `tests/content/**`                                                                            | every PR                          |
| Content figures    | `npm run content:claims` (lesson prose vs. registered queries) and `npm run content:figures` (exercise prose vs. the row count of its own `reference_solution`)                | `scripts/content-claims.ts`, `scripts/content-figures.ts`, `tests/unit/prose-figures.test.ts` | every PR                          |
| Dataset validation | `npm run datasets:verify` (consistency rules, row volumes, determinism hash)                                                                                                   | `src/datasets/**/verify.ts`                                                                   | every PR touching datasets        |
| Sandbox security   | fuzz corpus of malicious SQL + timeout/memory tests                                                                                                                            | `tests/sandbox/**`                                                                            | every PR                          |
| DB / RLS           | pgTAP via Supabase CLI (`supabase test db`, CI) + `npm run db:validate` (PGlite: applies migrations, asserts RLS on every table and pinned `search_path` on definer functions) | `supabase/tests/**`, `scripts/db-validate.ts`                                                 | every PR                          |
| Integration        | Vitest against local Supabase (auth callback, submission flow, webhooks, certificate issuance)                                                                                 | `tests/integration/**`                                                                        | every PR                          |
| E2E                | Playwright (Chromium desktop + Pixel 7 emulation) with a seeded test user and mocked Google login via Supabase test helpers                                                    | `tests/e2e/**`                                                                                | every PR (smoke) + nightly (full) |
| Accessibility      | `@axe-core/playwright` on key pages; keyboard-only journey                                                                                                                     | in E2E                                                                                        | every PR                          |
| Static             | `tsc --noEmit`, ESLint, Prettier check, `npm audit --audit-level=high`                                                                                                         | —                                                                                             | every PR                          |

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

`format:check` (prettier) → `lint` → `typecheck` (`tsc --noEmit`) → `test` (vitest run) → `db:validate` → `content:validate` → `content:claims` → `content:figures` → `datasets:verify` → `build`. `content:verify` is **not** in the gate — it executes every reference solution against the dataset snapshots and is run when content changes. E2E runs in CI after the build. The script itself is the source of truth (`package.json`); see `.github/workflows/ci.yml`.

### 5b. Figures in prose

Two gates keep the numbers in the prose honest, because the owner has twice found wrong ones by
hand and a wrong figure is the fastest way to lose a learner's trust.

- `npm run content:claims` checks **lessons** against `src/content/lesson-claims.ts`: a sentence
  copied verbatim plus a one-row query whose columns are the numbers in it. Hand-authored,
  because a lesson figure can be anything.
- `npm run content:figures` checks **exercises** with no hand-authored expectation at all: it runs
  each exercise's `reference_solution` on the committed dataset snapshot and compares the row
  count with what the prose says. Both take an optional slug
  (`npm run content:figures -- correos-normalizados`).

What `content:figures` reads as a claim about the row count, and nothing else:

1. the opening figure of `expert_explanation_md` when the field follows
   [CONTENT_GUIDELINES §10 rule A](CONTENT_GUIDELINES.md#10-exercise-copy-rules-owner-feedback-2026-09-23)
   ("El resultado de la consulta da N …"), or the older bare "N filas …" opening it replaced;
2. a sentence whose subject is the query itself — "la consulta devuelve N filas", "el resultado
   tiene N filas".

Everything else is left alone on purpose: a bare "N filas" in the middle of an explanation is, in
these 209 exercises, almost always the size of a source table, of a CTE, of one bucket of the
result or of a wrong variant the text is warning about ("sin los paréntesis obtendrías 952
filas"). Treating every "N filas" as a row count produced 95 disagreements, of which 81 were
reviewed one by one and none was a content bug — a gate like that would need ~90 hand-written
exemptions and would teach authors to exempt instead of fix. Figures inside code spans and fenced
blocks are SQL literals and are stripped; a leading percentage and a statement of grain ("una fila
por pedido") are not counts. When a query returns exactly one row, the opening figure may also be
one of the values in that row, which is how aggregate explanations quote their own measure.

The escape hatch is `src/content/exercise-figure-exceptions.ts`: exercise slug, field, the phrase
verbatim and the reason. It exempts that phrase only, it cannot exempt the rule A opener, and an
exception that stops matching fails the gate, so the list cannot rot. It holds one entry.

## 6. What has and has not actually run

Stated because "a suite exists" and "a suite passed" are different claims.

- **Vitest and `next build`**: green on 2026-09-23 (33 test files).
- **`content:figures`**: green on 2026-09-23 — 192 row-count figures across all 209 exercises
  executed against the dataset snapshots. One counterfactual sentence is registered as an
  exception; no exercise prose disagreed with its reference solution.
- **`db:validate`**: green on 2026-09-23 — 19 migrations applied in-process on PGlite (real PostgreSQL), 51 tables, all with RLS. It exercises behaviour and constraints; it does **not** exercise role grants, because everything runs as one role.
- **pgTAP**: the twelve suites (208 planned assertions; 123 of them in the six files touched or added on 2026-09-23) run in CI via `supabase test db` and locally via `npx supabase db reset`, both of which need Docker. There is no Docker in the assistant's environment, and the 2026-09-23 work has not been pushed, so **the new and changed suites have never executed anywhere** — not locally, not in CI. Owner actions OA-19 (local run first) and OA-23 (install Docker) exist for exactly this.
- **Playwright**: runs in CI against local Supabase; same caveat about the unpushed working tree.
