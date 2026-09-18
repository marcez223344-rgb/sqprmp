---
paths:
  - "src/datasets/**"
  - "public/datasets/**"
---

# Dataset generation rules

Authoritative: `docs/CONTENT_GUIDELINES.md` §7; catalog in `docs/CURRICULUM.md` §4. Template: `.claude/templates/dataset.md`.

- Layout per dataset: `src/datasets/<slug>/{README.md, schema.sql, generate.ts, verify.ts, config.ts}`; snapshots built by `npm run datasets:build` into `public/datasets/<slug>-v<version>.tar.gz` (git-ignored) and their SHA-256 recorded in `src/datasets/manifest.json` (committed).
- Determinism: one seeded PRNG (`seedrandom`-style, seed in `config.ts`); no `Math.random`, no `Date.now()`; the "current date" of the dataset is a fixed constant. Same seed → same SHA-256 (asserted by a test).
- Synthetic only: fictional company, people (name pools per country), addresses, emails `@ejemplo.lat`, phones and tax ids in non-real formats. Never copy real personal data or real brand names.
- Business realism: power-law customers/sellers, weekly and seasonal patterns, status transitions with valid state machines, multi-country/currency consistency, documented intentional quality issues (duplicates, NULLs, late-arriving events, orphan rows) each listed in README with counts.
- Consistency checks in `verify.ts` (run by `datasets:verify`): totals reconcile, refunds ≤ payments, chronological timestamps, FK resolution except documented exceptions, currency/country match, row volumes within target ranges.
- Size budget: ≤ 4 MB gzipped per snapshot (browser download); document row counts. Larger "expert" snapshots must be separate datasets.
- Schema DDL creates a `learner` role with `SELECT` only and revokes execute on denied functions (see `docs/SQL_SANDBOX.md` §4 layer 5); the sandbox tests assert this.
- Bumping a dataset version requires re-running `content:verify` for every exercise using it and updating `datasets.version` in the seed.
