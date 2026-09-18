---
paths:
  - "supabase/**"
  - "src/lib/supabase/**"
  - "src/types/database.ts"
---

# Database rules (Supabase / Postgres)

Design: `docs/DATABASE_DESIGN.md` (schema + RLS matrix). Skills: `/create-migration`, `/review-rls`.

- Migrations: `supabase/migrations/<YYYYMMDDHHMMSS>_<snake_description>.sql`, forward-only, idempotent where possible (`if not exists`), one concern per file. Never edit an applied migration; add a new one. Never delete migrations.
- Every `create table` in `public` is followed, in the same file, by `alter table ... enable row level security;` and its policies. The `post-write` hook warns when this is missing.
- Naming: `snake_case`; PK `id`; FKs `<table_singular>_id`; timestamps `created_at`/`updated_at` with the shared `set_updated_at()` trigger; booleans `is_*`/`has_*`; money `amount_minor integer` + `currency char(3)`.
- Constraints over application checks: `check`, `unique`, `not null`, FKs with explicit `on delete` behavior (`cascade` only for pure child rows; `restrict` for financial/certificate rows).
- Learner-writable tables are minimal (`saved_queries`, `learning_goals`, own `profiles` fields, `exercise_progress.draft_sql`). Everything else is written by `security definer` RPCs that: `set search_path = public, pg_temp`, validate `auth.uid()` (or require service role), and are `revoke execute ... from public` then `grant` to the intended role.
- Public reads of sensitive tables go through views with explicit column lists (`exercises_public`, `questions_public`, `question_options_public`, `certificate_verification`, `public_profiles`) and `security_invoker = true`.
- Indexes for every FK used in RLS predicates and every `(user_id, ...)` access path. Add `explain` notes in the migration when a query pattern is non-obvious.
- After a migration: regenerate types (`npx supabase gen types typescript --local > src/types/database.ts`), add/adjust pgTAP tests in `supabase/tests/`, update `docs/DATABASE_DESIGN.md`.
- Destructive statements (`drop table`, `drop column`, `truncate`, `delete` without `where`) require an expand/contract plan in the migration header comment and owner approval; the hook flags them.
- `supabase db reset` and `db push` are local-only by default; remote operations need explicit owner approval in the conversation.
