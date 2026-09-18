---
paths:
  - "tests/**"
  - "src/**/*.test.ts"
  - "src/**/*.test.tsx"
  - "supabase/tests/**"
  - "playwright.config.ts"
  - "vitest.config.ts"
---

# Testing rules

Strategy: `docs/TESTING.md`.

- Unit tests are colocated (`foo.test.ts`) or under `tests/unit`; integration under `tests/integration` (requires local Supabase); E2E under `tests/e2e` (Playwright); sandbox fuzz under `tests/sandbox`; content under `tests/content`.
- Test business rules through their public functions in `src/lib/**`, not through React internals. Component tests use RTL with accessible queries (`getByRole`, `getByLabelText`).
- Never call real external services. Google login is mocked via Supabase test helpers/seeded sessions; payment webhooks use recorded sandbox payloads with valid test signatures; PGlite runs in-process.
- Fixtures: deterministic, small, readable; SQL result fixtures as JSON under `tests/fixtures`.
- Each bug fix adds a regression test named after the issue.
- E2E: one spec per critical journey (numbered 01–12), plus `a11y.spec.ts` (axe on key pages) and `responsive.spec.ts`. Use `data-testid` only when no accessible selector exists.
- Do not weaken assertions or add `test.skip` to make CI pass; quarantine flaky tests with a TODO referencing an issue and tell the owner.
- Report results verbatim (pass/fail counts, failing test names). Never claim tests passed without running them.
