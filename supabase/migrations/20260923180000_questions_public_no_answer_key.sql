-- Migration: 20260923180000_questions_public_no_answer_key.sql
-- Purpose: stop publishing the answer key of `matching` questions (security review F-1, High).
--          `theory_questions.pairs` *is* the grading key — `correctAnswerFor()` builds the expected
--          answer from it — yet it was both a column of `questions_public` and a column-level grant
--          on the base table, readable with the anon key in one PostgREST call. It is now readable
--          only by the service role: the server hydrates and shuffles it in `loadBank()`.
--          The same view also stops being readable by `anon`: it publishes every quiz prompt,
--          including paid sections, and nothing anonymous in the product reads it.
-- Design ref: docs/reviews/2026-09-23-security.md F-1; docs/DATABASE_DESIGN.md §4i; CLAUDE.md rule 7.
-- Destructive: the view is dropped and recreated (a column cannot be removed with `create or
--          replace view`). No table, column or row is dropped; no data is lost. The application
--          reads `pairs` through the admin client in the same change.

-- 1. The answer key leaves the learner-reachable surface -------------------------------------
revoke select (pairs) on public.theory_questions from anon, authenticated;

drop view if exists public.questions_public;
create view public.questions_public with (security_invoker = true) as
  select q.id, q.section_id, q.lesson_id, q.slug, q.type, q.difficulty, q.topic,
         q.prompt_md, q.code_md, q.tags, q.estimated_seconds
  from public.theory_questions q
  where q.is_published;

-- Quiz prompts are learner material, not marketing: `authenticated` only.
revoke all on public.questions_public from anon, authenticated;
grant select on public.questions_public to authenticated;
comment on view public.questions_public is
  'Deliverable question fields only: no answer, no explanation and no pairs (the matching key). '
  'The server reads `theory_questions.pairs` with the service role and delivers the two sides '
  'separately, shuffled (security review F-1, 2026-09-23).';
