---
paths:
  - "src/content/**"
  - "supabase/seed/content/**"
---

# Content authoring rules

Authoritative: `docs/CONTENT_GUIDELINES.md` and `docs/CURRICULUM.md`. Templates: `.claude/templates/{exercise,lesson,question,hints}.md`.

- Content is data: typed TS modules under `src/content/` (`sections.ts`, `lessons/<section>.ts` with Markdown bodies, `questions/<section>.ts`, `exercises/<section>.ts`, `datasets/<slug>.ts`) registered in `src/content/index.ts` and validated by `src/content/schemas/*.ts`. Every change must pass `npm run content:validate`, then `npm run content:build` to refresh `supabase/seed/0002_content.sql` (CI checks drift).
- Every exercise must include all fields of the exercise model (CURRICULUM.md §6). Missing `common_mistakes`, `expert_explanation_md`, three hints, `reward`, `solution_unlock` or `validation_rules` is a validation error, not a warning.
- Reference and alternative solutions are executed by `npm run content:verify` against the exact dataset version; results must match under the exercise's own validation rules. Never mark content published if verify fails.
- Hints are progressive and must not contain the full solution; hint 3 leaves the key expression blank.
- Spanish es-419, "tú", professional tone; SQL keywords uppercase in English; ISO dates in SQL examples.
- Rewards follow the difficulty defaults; document deviations in the exercise `notes` field.
- Solutions, hints, expected results, correct options and explanations are stored in tables the browser cannot read (RLS); never place them in public views or client bundles.
- Prerequisites must reference existing slugs; the validator checks the graph is acyclic.
- Question option order is randomized server-side at delivery; author options in logical order.
- Run `/review-sql-accuracy` on new or changed exercises before marking them ready.
