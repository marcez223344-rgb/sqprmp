---
name: implement-feature
description: Implement a planned feature end to end following the definition of done — DB/RLS, server logic, UI, tests, docs — sequencing the right agents and running the quality gate.
argument-hint: [feature slug or plan path]
---

## Purpose
Execute the plan for "$ARGUMENTS" (from `/plan-feature` or `docs/features/<slug>.md`). Never start without a plan; if none exists, run `/plan-feature` first.

## Procedure
1. Load the plan and confirm no pending owner decision blocks it (check `docs/DECISIONS.md`). If blocked, stop and ask.
2. Work in the sequence: schema/RLS (`database-engineer` via `/create-migration`) → business rules in `src/lib/**` (owning agent) → server actions/route handlers with Zod + `authorize()` → UI (`frontend-engineer`) with loading/empty/error/locked states and `es-419` messages → tests (`/test-feature`) → docs (`/update-docs`).
3. One agent edits a given file area at a time; report handoffs explicitly.
4. Run `/quality-check` before declaring completion.

## Output
Working feature; list of files changed; test/build results verbatim; unresolved risks; docs updated.

## Validation checklist (Definition of done, CLAUDE.md)
- [ ] end-to-end works · [ ] authz server-side · [ ] RLS + pgTAP · [ ] Zod inputs · [ ] states · [ ] responsive · [ ] accessible · [ ] tests · [ ] docs · [ ] quality gate green · [ ] no secrets · [ ] no dead UI

## Failure / rollback
If the gate fails, fix or revert the partial change (`git stash`/`git checkout -- <files>` only for uncommitted work of this feature); never leave the repo failing between phases.
