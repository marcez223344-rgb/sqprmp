---
name: review-sql-accuracy
description: Review exercises, lessons or questions for SQL correctness, Postgres-17 behavior, ambiguity, hint leakage, and language rules; runs content verification. Read-only except the report and an is_published flag recommendation.
argument-hint: [path-or-slug]
---

## Purpose
Educational accuracy gate for `$ARGUMENTS` (a file, folder or slug) using the checklist in `docs/CONTENT_GUIDELINES.md` §8.

## Procedure
1. Run `npm run content:validate` and `npm run content:verify -- $ARGUMENTS`; capture output.
2. Read the content and check: statement unambiguous or intentionally ambiguous with explanation; expected columns/order explicit; NULL, date-boundary, duplicate and aggregation-level traps handled; alternatives truly equivalent; hints progressive without leaks; explanation does not claim a single valid style; difficulty matches skill; Spanish rules (es-419, "tú", no Spain-only terms); no invented columns.
3. For lessons: every example runs; claims match Postgres 17 semantics (e.g. `COUNT(col)` ignores NULL, `NULL = NULL` unknown, `DISTINCT ON` behavior, `HAVING` vs `WHERE`).
4. Write findings with severity and concrete fixes; recommend `is_published` true/false.

## Output
Review notes in the conversation (and `docs/reviews/<date>-content-<slug>.md` if requested); list of fixes for `content-author`/`curriculum-designer`.

## Validation checklist
- [ ] Commands actually run and results quoted · [ ] Every finding cites the field/line · [ ] No content edited by this skill
