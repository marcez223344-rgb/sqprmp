---
name: create-lesson
description: Create or revise a curriculum section outline and its theory lesson(s) in MDX following CONTENT_GUIDELINES and the lesson template; produces exercise briefs for content-author.
argument-hint: [section-number-or-slug]
---

## Purpose
Author section "$ARGUMENTS" (outline + theory) with the pedagogy rules in `docs/CONTENT_GUIDELINES.md` §2 and `docs/CURRICULUM.md` §5.

## Required inputs
Section identity; level; datasets available (`src/datasets/*/README.md`); previous section concepts.

## Procedure
1. Read `docs/CURRICULUM.md` rows for the section and neighbors; read the dataset README(s).
2. Create/refresh `src/content/sections/<slug>.json`: objectives (3–5 observable), summary, level, prerequisites, completion rule, certificate eligibility, planned exercise ladder (skill × difficulty × dataset), question mix.
3. Write lesson MDX file(s) from `.claude/templates/lesson.md`: ≤ 900 words each, runnable examples on the dataset, worked example, ≥ 3 common mistakes, 3-line summary, Spanish es-419 "tú".
4. Produce exercise briefs (one paragraph each) for `/create-exercise`.
5. Run `npm run content:validate`.

## Validation checklist
- [ ] Objectives map to exercises/questions
- [ ] Examples execute on the snapshot (spot-check with the browser engine or `content:verify` harness)
- [ ] No Spain-specific vocabulary, no English filler
- [ ] Prerequisite graph acyclic
- [ ] `docs/CURRICULUM.md` volume table updated

## Output
Section JSON, lesson MDX, briefs list, validation output.

## Failure / rollback
Content that fails validation stays `is_published: false`; never seed unpublished content as published.
