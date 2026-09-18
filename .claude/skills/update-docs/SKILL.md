---
name: update-docs
description: Reconcile documentation with the implementation after changes — schema, dependencies, env vars, limits, content volume, roadmap status, decisions — without duplicating rules across files.
argument-hint: [scope or phase]
---

## Purpose
Apply CLAUDE.md → Documentation update rules for "$ARGUMENTS".

## Context
```!
git diff --name-only HEAD 2>/dev/null | head -60
```

## Procedure
1. From the changed files above, derive impacted docs: `supabase/**` → `docs/DATABASE_DESIGN.md`; `package.json`/`next.config.*` → `docs/ARCHITECTURE.md` §2; `.env.example`/`src/lib/env/**` → `docs/DEPLOYMENT.md`; `src/config/limits.ts` → referenced values in PRODUCT_REQUIREMENTS/SQL_SANDBOX/CONTENT_GUIDELINES; `src/content/**`, `src/datasets/**` → `docs/CURRICULUM.md`; `src/lib/sandbox/**` → `docs/SQL_SANDBOX.md`; `src/lib/payments/**` → `docs/PAYMENTS.md`; auth/PII → `docs/SECURITY.md`.
2. Update those docs; add ADR entries to `docs/DECISIONS.md` for material decisions (status Proposed) and update the pending table.
3. If a phase ended: update `docs/ROADMAP.md` status + date + one-line summary; update `README.md` status line.
4. Check links resolve (grep for `](docs/` targets exist); ensure no rule is duplicated (link instead).
5. If a recurring mistake or missing workflow was noticed, add a proposal to `docs/CLAUDE_CODE_SETUP.md` → Proposed changes (do not modify agents/skills/hooks silently).

## Output
List of docs updated with a one-line summary each; list of proposals for the owner.

## Validation checklist
- [ ] No secrets in docs · [ ] Links resolve · [ ] Pending decisions table current · [ ] No duplicated rules
