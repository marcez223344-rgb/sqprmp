---
name: test-feature
description: Write and run the tests a feature needs (unit for business rules, integration for Supabase/RLS/webhooks, E2E for journeys, a11y) and report results verbatim.
argument-hint: [feature-slug]
allowed-tools: Read Grep Glob Write Edit Bash(npm run *) Bash(npm test*) Bash(npx vitest *) Bash(npx playwright *) Bash(npx supabase test *)
---

## Purpose

Cover feature "$ARGUMENTS" per `docs/TESTING.md` and `.claude/rules/testing.md`.

## Procedure

1. Read the feature plan/acceptance criteria and the changed files (`git diff --name-only`).
2. Map each business rule to a unit test in `src/lib/**` (pure functions first); each DB policy/RPC to pgTAP; each user journey step to an E2E spec (numbered 01–12 if critical); each new page to the a11y suite.
3. Write tests using existing fixtures/helpers (`tests/helpers`); mock external services only at the boundary.
4. Run: `npx vitest run <paths>` → `npx supabase test db` (if DB touched) → `npx playwright test <spec>` (if UI touched). Capture output.
5. Report: commands, pass/fail counts, failing test names with the assertion message, coverage for `src/lib/**` if changed, untested risks.

## Validation checklist

- [ ] No skipped/weakened tests · [ ] No real external calls · [ ] Regression test for any bug found · [ ] Results quoted verbatim

## Failure / rollback

Failing tests are reported to the implementing agent with reproduction; do not modify app code to pass tests without saying so.
