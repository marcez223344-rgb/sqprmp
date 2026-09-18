---
name: prepare-release
description: Run the release-readiness checklist (quality gate, E2E, security and accessibility reviews, migrations review, env and legal checks) and produce a go/no-go report. Never deploys to production.
argument-hint: [version]
disable-model-invocation: true
allowed-tools: Read Grep Glob Bash(git *) Bash(npm run *) Bash(npx playwright *) Bash(npx supabase test *) Bash(npm audit*) Write
---

## Purpose

Prepare release `$ARGUMENTS` using `.claude/templates/release-checklist.md`. Production deployment itself is performed by the owner through Vercel after approval.

## Procedure

1. `/quality-check --e2e` and quote results.
2. `/review-security` and `/review-accessibility` for the release scope (or confirm recent reports exist and are current).
3. Migrations since last release: list them; flag destructive statements; confirm they were applied to the target environment by the owner (never run `db push`).
4. Env: compare `.env.example` names with `src/lib/env/*` schema; list variables the owner must set in Vercel (names only).
5. Payments: confirm provider mode (sandbox/production) from config flags; production requires explicit owner approval recorded in `docs/DECISIONS.md`.
6. Legal: terms/privacy/refund pages present and reviewed (D-09).
7. External config: OAuth redirect URLs, webhook URL, domain, Supabase Pro/Vercel Pro status (owner confirms).
8. Write `docs/releases/<version>.md` with the checklist, results, blockers and go/no-go.

## Output

Release report; explicit blockers; instructions for the owner's manual steps.

## Validation checklist

- [ ] No step marked done without evidence · [ ] No deploy executed · [ ] Owner approvals listed
