---
name: create-exercise
description: Author a complete practical SQL exercise (scenario, validation rules, reference and alternative solutions, three hints, mistakes, expert explanation, rewards, unlock rules) and verify it against the dataset snapshot.
argument-hint: [section-slug] [exercise-slug]
arguments: [section, slug]
---

## Purpose

Create `src/content/exercises/$section/$slug.json` that passes schema validation and `content:verify`.

## Required inputs

Exercise brief (skill, difficulty, dataset, scenario idea) from the section outline; dataset README/schema; reward defaults (`docs/CONTENT_GUIDELINES.md` §6).

## Procedure

1. Read `.claude/rules/content-authoring.md`, the template `.claude/templates/exercise.md`, and the dataset README.
2. Write the scenario as a realistic request (who asks, why, expected columns named explicitly), the business question, learning objective, concepts, prerequisites, estimated time.
3. Write the reference solution; run it (via `npm run content:verify -- --exercise $slug` or the browser engine harness) and inspect the result: is it unambiguous? Adjust the statement if not.
4. Add ≥ 1 alternative solution when a different valid approach exists; verify equality.
5. Define `validation_rules` deliberately (order only if asked, tolerance for averages, `allow_extra_columns: false`, required/prohibited concepts).
6. Run `/generate-hints` for the three hints; write common mistakes mapped to feedback categories; expert explanation; improvement feedback rules.
7. Set rewards from defaults; set `solution_unlock` defaults; `is_published: false` until `/review-sql-accuracy` passes.
8. Run `npm run content:validate` and `npm run content:verify -- --exercise $slug`.

## Validation checklist

- [ ] All fields present (schema) · [ ] solutions verified equal · [ ] hints progressive, no leak · [ ] expected columns explicit · [ ] language rules · [ ] difficulty matches section level · [ ] no invented columns

## Output

Exercise JSON, verification output, notes on ambiguities.

## Failure / rollback

If verification fails, fix the statement or solution; never publish; if the dataset lacks needed data, file a request to `dataset-engineer` instead of faking it.
