---
name: create-migration
description: Create a Supabase migration with RLS policies, grants, indexes, pgTAP tests and regenerated types, following rules/database.md. Use for any schema change.
argument-hint: [short_snake_description]
allowed-tools: Read Grep Glob Write Edit Bash(npx supabase *) Bash(npm run *)
---

## Purpose
Add a forward-only migration named `$ARGUMENTS` with security built in.

## Required inputs
Tables/columns/constraints to add or change; who may S/I/U/D (from `docs/DATABASE_DESIGN.md` RLS matrix); RPCs needed.

## Procedure
1. Read `.claude/rules/database.md` and the relevant section of `docs/DATABASE_DESIGN.md`.
2. Create `supabase/migrations/<YYYYMMDDHHMMSS>_$ARGUMENTS.sql` from `.claude/templates/migration.sql` (timestamp from `date -u +%Y%m%d%H%M%S`).
3. Include: table DDL with constraints and FKs → `enable row level security` → policies per role → grants (`revoke all ... from anon, authenticated` then grant what the matrix allows) → indexes → `set_updated_at` trigger → RPCs (`security definer`, `set search_path = public, pg_temp`, explicit `revoke/grant execute`).
4. Write pgTAP tests in `supabase/tests/<name>.test.sql`: anon denied, learner sees own rows only, admin sees all, RPC misuse rejected.
5. Run `npx supabase db reset` (local) and `npx supabase test db`.
6. Regenerate types: `npx supabase gen types typescript --local > src/types/database.ts`; run `npm run typecheck`.
7. Update `docs/DATABASE_DESIGN.md` (tables, RLS matrix, indexes).

## Validation checklist
- [ ] Every new table has RLS + policies + tests
- [ ] No destructive statement without expand/contract note and owner approval
- [ ] Grants explicit; no `grant all` to `anon`/`authenticated`
- [ ] Types regenerated; typecheck green
- [ ] Docs updated

## Output
Migration file, test file, regenerated types, doc diff, command outputs.

## Failure / rollback
If reset fails locally, fix the migration (it is unapplied). Never `db push`. If a migration was already pushed elsewhere, write a corrective migration instead of editing.
