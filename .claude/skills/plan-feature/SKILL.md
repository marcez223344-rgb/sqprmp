---
name: plan-feature
description: Produce an implementation plan for a feature using the feature template, identifying affected layers, agents, tests, docs and owner decisions. Does not write code.
argument-hint: [feature description]
---

## Purpose
Turn "$ARGUMENTS" into a reviewable plan before implementation.

## Required input
A feature description. If empty, ask for it and stop.

## Procedure
1. Read `CLAUDE.md`, `docs/PRODUCT_REQUIREMENTS.md`, `docs/ARCHITECTURE.md`, and the doc(s) for the affected area (sandbox, payments, database, curriculum, design).
2. Grep the codebase for existing modules touching the feature (avoid duplicating business rules).
3. Fill `.claude/templates/feature.md`: goal, user story, acceptance criteria, layers touched (DB/RLS, server, UI, content), authorization impact, data/PII impact, tests per layer, docs to update, rollout/flags, owner decisions needed.
4. Assign file ownership per agent to avoid concurrent edits; sequence the work.
5. If the feature implies an architectural or product decision, draft the ADR (`.claude/templates/adr.md`) into `docs/DECISIONS.md` as Proposed.

## Output
The completed plan in the conversation (and saved to `docs/features/<slug>.md` if the owner wants it kept), plus the list of pending questions.

## Validation checklist
- [ ] Every acceptance criterion is testable
- [ ] Server-side authorization stated
- [ ] RLS impact stated
- [ ] No new dependency without justification
- [ ] Docs to update listed

## Failure / rollback
Nothing to roll back; a plan the owner rejects is archived with the reason in DECISIONS.md.
