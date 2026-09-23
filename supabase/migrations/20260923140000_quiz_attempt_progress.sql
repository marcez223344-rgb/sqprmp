-- Migration: 20260923140000_quiz_attempt_progress.sql
-- Purpose: in-progress quiz attempts so a section quiz can be graded one question at a time.
--          An attempt stores the sampled question ids (the sample cannot be re-rolled by
--          reloading) and each answer is recorded once and is final; the score is computed in
--          SQL from the recorded answers, never sent by the browser.
-- Design ref: docs/DATABASE_DESIGN.md §2 Learning activity; docs/GAMIFICATION.md; D-33, D-34.
-- Destructive: no (adds columns with defaults that describe the existing rows).
set check_function_bodies = off;

-- 1. Attempt lifecycle ------------------------------------------------------------------
-- Existing rows were all submitted in one shot, so 'submitted' is the correct default for them.
alter table public.quiz_attempts
  add column if not exists status text not null default 'submitted',
  add column if not exists question_ids uuid[] not null default '{}';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'quiz_attempts_status_check') then
    alter table public.quiz_attempts
      add constraint quiz_attempts_status_check check (status in ('in_progress', 'submitted'));
  end if;
end $$;

alter table public.quiz_attempts
  alter column score set default 0,
  alter column total set default 0,
  alter column passed set default false,
  alter column submitted_at drop not null,
  alter column submitted_at drop default;

-- An in-progress attempt is the learner's current attempt at that quiz: at most one.
create unique index if not exists quiz_attempts_one_open_idx
  on public.quiz_attempts (user_id, lesson_id)
  where status = 'in_progress';

-- Answers are final: one row per (attempt, question), enforced by the database rather than by
-- the application, because "you cannot change an answer after seeing it was wrong" is what makes
-- immediate feedback safe.
create unique index if not exists quiz_answers_attempt_question_idx
  on public.quiz_answers (quiz_attempt_id, question_id);

-- 2. RLS ---------------------------------------------------------------------------------
-- No new grants: `authenticated` keeps select-only on both tables (migration 20260918230000),
-- so a learner can read their own attempt and their own recorded answers and can write neither.
-- Writes go exclusively through the service-role RPCs below. Re-asserted here so that reading
-- this file alone shows the posture.
revoke insert, update, delete on public.quiz_attempts, public.quiz_answers from anon, authenticated;

-- 3. RPCs (service role only) ------------------------------------------------------------
-- Start or resume: the sample is decided by the server (stratified in TypeScript, unit-tested)
-- and frozen here. Resuming returns the stored sample and ignores the proposed one.
create or replace function public.start_quiz_attempt(
  p_user_id uuid, p_lesson_id uuid, p_question_ids uuid[]
)
returns table (attempt_id uuid, question_ids uuid[], resumed boolean)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_section uuid; v_existing public.quiz_attempts%rowtype; v_id uuid;
begin
  if coalesce(array_length(p_question_ids, 1), 0) = 0 then
    raise exception 'no questions' using errcode = 'P0001', detail = 'no_questions';
  end if;
  select section_id into v_section from public.lessons where id = p_lesson_id;
  if v_section is null then raise exception 'lesson not found' using errcode = 'P0002'; end if;

  select * into v_existing from public.quiz_attempts
  where user_id = p_user_id and lesson_id = p_lesson_id and status = 'in_progress' limit 1;
  if v_existing.id is not null then
    return query select v_existing.id, v_existing.question_ids, true;
    return;
  end if;

  insert into public.quiz_attempts (user_id, lesson_id, section_id, score, total, passed, status, question_ids, submitted_at)
  values (p_user_id, p_lesson_id, v_section, 0, array_length(p_question_ids, 1), false, 'in_progress', p_question_ids, null)
  on conflict (user_id, lesson_id) where status = 'in_progress' do nothing
  returning id into v_id;
  if v_id is null then
    -- Concurrent start (two tabs): the other transaction won; use its attempt.
    select * into v_existing from public.quiz_attempts
    where user_id = p_user_id and lesson_id = p_lesson_id and status = 'in_progress' limit 1;
    return query select v_existing.id, v_existing.question_ids, true;
    return;
  end if;
  return query select v_id, p_question_ids, false;
end;
$$;
revoke execute on function public.start_quiz_attempt(uuid, uuid, uuid[]) from public, anon, authenticated;
grant execute on function public.start_quiz_attempt(uuid, uuid, uuid[]) to service_role;

-- Discard an open attempt (its answers cascade). Used when the stored sample contains a question
-- that has since been unpublished, which would otherwise leave an attempt nobody can finish. No
-- reward has been paid at this point, and rewards are keyed per lesson, so this cannot farm XP.
create or replace function public.discard_quiz_attempt(p_user_id uuid, p_attempt_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_deleted integer;
begin
  delete from public.quiz_attempts
  where id = p_attempt_id and user_id = p_user_id and status = 'in_progress';
  get diagnostics v_deleted = row_count;
  return v_deleted > 0;
end;
$$;
revoke execute on function public.discard_quiz_attempt(uuid, uuid) from public, anon, authenticated;
grant execute on function public.discard_quiz_attempt(uuid, uuid) to service_role;

-- Record one answer. Rejects a foreign attempt, a submitted attempt and a question outside the
-- attempt's sample; returns recorded = false when the question was already answered.
create or replace function public.record_quiz_answer(
  p_user_id uuid, p_attempt_id uuid, p_question_id uuid, p_answer jsonb, p_is_correct boolean
)
returns table (recorded boolean, answered_count integer, total integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare a public.quiz_attempts%rowtype; v_rows integer := 0;
begin
  select * into a from public.quiz_attempts where id = p_attempt_id and user_id = p_user_id;
  if a.id is null then raise exception 'attempt not found' using errcode = 'P0002'; end if;
  if a.status <> 'in_progress' then
    raise exception 'attempt closed' using errcode = 'P0001', detail = 'attempt_closed';
  end if;
  if not (p_question_id = any (a.question_ids)) then
    raise exception 'question not in attempt' using errcode = 'P0001', detail = 'question_not_in_attempt';
  end if;

  insert into public.quiz_answers (quiz_attempt_id, user_id, question_id, answer, is_correct)
  values (p_attempt_id, p_user_id, p_question_id, coalesce(p_answer, 'null'::jsonb), p_is_correct)
  on conflict (quiz_attempt_id, question_id) do nothing;
  get diagnostics v_rows = row_count;

  return query
    select v_rows > 0,
           (select count(*)::integer from public.quiz_answers where quiz_attempt_id = p_attempt_id),
           coalesce(array_length(a.question_ids, 1), 0);
end;
$$;
revoke execute on function public.record_quiz_answer(uuid, uuid, uuid, jsonb, boolean) from public, anon, authenticated;
grant execute on function public.record_quiz_answer(uuid, uuid, uuid, jsonb, boolean) to service_role;

-- Close the attempt. The score is recomputed from the recorded answers inside the database, so a
-- client-side tally can never influence it. Idempotent: a second call returns the stored result.
create or replace function public.finalize_quiz_attempt(
  p_user_id uuid, p_attempt_id uuid, p_pass_threshold_percent integer
)
returns table (score integer, total integer, passed boolean, already_submitted boolean)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare a public.quiz_attempts%rowtype; v_score integer; v_total integer; v_answered integer; v_passed boolean;
begin
  select * into a from public.quiz_attempts where id = p_attempt_id and user_id = p_user_id;
  if a.id is null then raise exception 'attempt not found' using errcode = 'P0002'; end if;
  if a.status = 'submitted' then
    return query select a.score, a.total, a.passed, true;
    return;
  end if;

  v_total := coalesce(array_length(a.question_ids, 1), 0);
  select count(*)::integer, count(*) filter (where is_correct)::integer
    into v_answered, v_score
  from public.quiz_answers where quiz_attempt_id = p_attempt_id;
  if v_answered < v_total then
    raise exception 'attempt incomplete' using errcode = 'P0001', detail = 'incomplete';
  end if;
  v_passed := v_total > 0 and v_score * 100 >= p_pass_threshold_percent * v_total;

  update public.quiz_attempts
  set score = v_score, total = v_total, passed = v_passed, status = 'submitted', submitted_at = now()
  where id = p_attempt_id;

  if v_passed then
    insert into public.lesson_progress (user_id, lesson_id, status, completed_at)
    values (p_user_id, a.lesson_id, 'completed', now())
    on conflict (user_id, lesson_id) do update
      set status = 'completed',
          completed_at = coalesce(public.lesson_progress.completed_at, now()),
          last_viewed_at = now();
  end if;
  return query select v_score, v_total, v_passed, false;
end;
$$;
revoke execute on function public.finalize_quiz_attempt(uuid, uuid, integer) from public, anon, authenticated;
grant execute on function public.finalize_quiz_attempt(uuid, uuid, integer) to service_role;

-- The one-shot recorder stays for back-compatibility (and pgTAP coverage of older rows); it now
-- has to set submitted_at explicitly because the column lost its default.
create or replace function public.record_quiz_attempt(
  p_user_id uuid, p_lesson_id uuid, p_score integer, p_total integer, p_passed boolean, p_answers jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_id uuid; v_section uuid; a jsonb;
begin
  select section_id into v_section from public.lessons where id = p_lesson_id;
  if v_section is null then raise exception 'lesson not found' using errcode = 'P0002'; end if;
  insert into public.quiz_attempts (user_id, lesson_id, section_id, score, total, passed, status, submitted_at)
  values (p_user_id, p_lesson_id, v_section, p_score, p_total, p_passed, 'submitted', now()) returning id into v_id;
  for a in select * from jsonb_array_elements(coalesce(p_answers, '[]'::jsonb)) loop
    insert into public.quiz_answers (quiz_attempt_id, user_id, question_id, answer, is_correct)
    values (v_id, p_user_id, (a ->> 'question_id')::uuid, coalesce(a -> 'answer', 'null'::jsonb), coalesce((a ->> 'is_correct')::boolean, false))
    on conflict (quiz_attempt_id, question_id) do nothing;
  end loop;
  if p_passed then
    insert into public.lesson_progress (user_id, lesson_id, status, completed_at)
    values (p_user_id, p_lesson_id, 'completed', now())
    on conflict (user_id, lesson_id) do update set status = 'completed', completed_at = coalesce(public.lesson_progress.completed_at, now()), last_viewed_at = now();
  end if;
  return v_id;
end;
$$;

-- 4. Notes for the readers of this file --------------------------------------------------
-- `check_section_completion` and `certificate_eligible` test `quiz_attempts.passed`, which is
-- false while an attempt is in progress, so an open attempt can never complete a section or
-- satisfy a certificate rule; both need no change.
-- `admin_metrics.quiz_pass_rate` (migration 20260918240000) divides by every attempt row and now
-- counts open attempts as failures. Its owner must add `where status = 'submitted'` to that
-- subquery; it is admin-only reporting, so it is not patched here to avoid replacing a function
-- this change does not own.
