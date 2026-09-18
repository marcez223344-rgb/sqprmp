---
name: project-status
description: Summarize the current state of the project — phase, recent changes, quality gate status, open risks and pending owner decisions. Read-only.
allowed-tools: Read Grep Glob Bash(git *) Bash(npm run quality*) Bash(npm test*)
---

## Purpose
Give the owner a truthful snapshot without modifying anything.

## Context
```!
git status --short 2>/dev/null | head -40
git log --oneline -15 2>/dev/null
```

## Procedure
1. Read `docs/ROADMAP.md` (phase statuses) and the pending table in `docs/DECISIONS.md`.
2. Summarize uncommitted changes and the last commits above.
3. If `package.json` exists and the owner asks for verification, run `npm run quality` and report the exact outcome (never assume).
4. List open risks from `docs/ARCHITECTURE.md` §8 and any `docs/reviews/*` findings still open.

## Output
- Current phase and what is done / in progress
- Changes since last checkpoint
- Quality gate: last known result (or "not run")
- Pending owner decisions (verbatim from DECISIONS.md)
- Recommended next step

## Validation
No files modified. Report only observed facts.
