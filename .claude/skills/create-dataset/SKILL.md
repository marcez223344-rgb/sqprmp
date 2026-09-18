---
name: create-dataset
description: Design and generate a deterministic synthetic learning dataset (schema, seeded generator, consistency verification, PGlite snapshot, README) following rules/dataset-generation.md.
argument-hint: [dataset-slug] [domain]
arguments: [slug, domain]
allowed-tools: Read Grep Glob Write Edit Bash(npm run datasets:*) Bash(npm run content:verify*)
---

## Purpose

Create `src/datasets/$slug/` for domain "$domain".

## Procedure

1. Read `.claude/rules/dataset-generation.md`, `docs/CONTENT_GUIDELINES.md` §7, `.claude/templates/dataset.md`, and the sections that will use the dataset (`docs/CURRICULUM.md`).
2. Write `README.md` first: business context, countries/currencies, ERD (mermaid), tables/columns/types/keys, business definitions, intentional data-quality issues with target counts, generation rules, row volumes, reset procedure.
3. Write `schema.sql` (tables, PK/FK, checks, comments) plus the `learner` role grants and denied-function revokes.
4. Write `config.ts` (seed, dataset "today", volumes) and `generate.ts` using the shared seeded PRNG and distribution helpers (`src/datasets/_shared`).
5. Write `verify.ts` consistency checks; run `npm run datasets:build -- $slug` then `npm run datasets:verify -- $slug`; record the SHA-256 in `manifest.json`.
6. Check size budget (≤ 4 MB gz); adjust volumes if needed.
7. Update `docs/CURRICULUM.md` §4.

## Validation checklist

- [ ] Deterministic (two builds → same hash)
- [ ] All README issues reproduced with counts
- [ ] FKs resolve except documented
- [ ] Money/currency/country consistent; timestamps chronological; status transitions valid
- [ ] `learner` role cannot write or call denied functions (sandbox test)

## Output

Dataset folder, manifest update, verify report, README.

## Failure / rollback

A failing verify blocks the version; do not commit a manifest hash for a failing build.
