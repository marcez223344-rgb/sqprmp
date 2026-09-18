---
name: quality-check
description: Run the complete quality gate (format, lint, typecheck, unit tests, content and dataset verification, production build, optional E2E) and report exact results. Use before every checkpoint or commit.
argument-hint: [--e2e]
allowed-tools: Read Bash(npm run *) Bash(npx playwright *) Bash(git status*) Bash(git diff*)
---

## Purpose

Prove the repository is in a passing state. Never summarize as "passed" without output.

## Procedure

1. `git status --short` to list what will be checked.
2. `npm run quality` (runs: `prettier --check` → `eslint` → `tsc --noEmit` → `vitest run` → `content:verify` → `datasets:verify` → `next build`). If the script does not exist yet (pre-Phase 1), say so and stop.
3. If `$ARGUMENTS` contains `--e2e`, run `npm run test:e2e`.
4. Secret scan: `node .claude/hooks/guard-bash.mjs` is applied on commit automatically; additionally grep the diff for the patterns in `.claude/hooks/_lib.mjs`.
5. Report each step: command, exit status, key output lines (counts, first failures).

## Output

A table: step → result → notes; overall PASS/FAIL; list of files changed since last commit.

## Failure / rollback

On failure, do not commit; hand failures to the owning agent with the exact output. Do not disable rules or tests to pass.
