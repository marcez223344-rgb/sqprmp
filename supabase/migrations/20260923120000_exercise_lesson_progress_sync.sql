-- Migration: 20260923120000_exercise_lesson_progress_sync.sql
-- Purpose: an exercise-kind lesson on the learning path stayed 'not_started' forever, because
--          solving an exercise writes public.exercise_progress and nothing ever wrote the
--          public.lesson_progress row that /ruta reads (owner feedback 2026-09-23, item 11).
--          Adds the server-side sync RPC, a reusable backfill function, and runs the backfill
--          once for the progress learners already have.
-- Design ref: docs/DATABASE_DESIGN.md §2 Curriculum; docs/GAMIFICATION.md
-- Destructive: no (writes only lesson_progress rows derived from existing exercise_progress;
--              never downgrades or clears an existing completion)
set check_function_bodies = off;

-- 1. Which lesson represents an exercise on the path --------------------------------
-- `exercises.lesson_id` is set by the content build from the lesson whose ref_slug matches the
-- exercise slug; the ref_slug lookup is a fallback for rows written before that link existed.
create or replace function public.lesson_id_for_exercise(p_exercise_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    e.lesson_id,
    (select l.id from public.lessons l
      where l.kind in ('exercise', 'challenge') and l.ref_slug = e.slug
      order by l.sort_order
      limit 1)
  )
  from public.exercises e
  where e.id = p_exercise_id;
$$;
revoke execute on function public.lesson_id_for_exercise(uuid) from public, anon, authenticated;
grant execute on function public.lesson_id_for_exercise(uuid) to service_role;

-- 2. Sync RPC -----------------------------------------------------------------------
-- Idempotent and monotonic, in the same style as mark_lesson_viewed: repeated calls only refresh
-- last_viewed_at, a completed lesson is never sent back to in_progress, and the first completion
-- timestamp is kept. Returns the lesson it touched (null when the exercise has no lesson).
create or replace function public.sync_exercise_lesson_progress(
  p_user_id uuid, p_exercise_id uuid, p_completed boolean
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_lesson_id uuid;
begin
  v_lesson_id := public.lesson_id_for_exercise(p_exercise_id);
  if v_lesson_id is null then return null; end if;

  insert into public.lesson_progress (user_id, lesson_id, status, completed_at, last_viewed_at)
  values (
    p_user_id,
    v_lesson_id,
    case when p_completed then 'completed' else 'in_progress' end,
    case when p_completed then now() end,
    now()
  )
  on conflict (user_id, lesson_id) do update set
    last_viewed_at = now(),
    status = case
      when public.lesson_progress.status = 'completed' or excluded.status = 'completed' then 'completed'
      else 'in_progress' end,
    completed_at = coalesce(public.lesson_progress.completed_at, excluded.completed_at);
  return v_lesson_id;
end;
$$;
comment on function public.sync_exercise_lesson_progress(uuid, uuid, boolean) is
  'Projects exercise_progress onto the exercise lesson row read by the learning path. Server only.';
revoke execute on function public.sync_exercise_lesson_progress(uuid, uuid, boolean) from public, anon, authenticated;
grant execute on function public.sync_exercise_lesson_progress(uuid, uuid, boolean) to service_role;

-- 3. Backfill ------------------------------------------------------------------------
-- Derives lesson_progress from every existing exercise_progress row. Safe to run any number of
-- times; `distinct on` guards the (theoretical) case of two exercises resolving to one lesson,
-- which ON CONFLICT DO UPDATE cannot handle twice in one statement. Returns rows written.
create or replace function public.backfill_exercise_lesson_progress()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_rows integer;
begin
  with derived as (
    select distinct on (ep.user_id, m.lesson_id)
      ep.user_id,
      m.lesson_id,
      case when ep.status = 'completed' then 'completed' else 'in_progress' end as status,
      case when ep.status = 'completed' then coalesce(ep.first_completed_at, ep.last_activity_at) end as completed_at,
      ep.last_activity_at
    from public.exercise_progress ep
    cross join lateral (select public.lesson_id_for_exercise(ep.exercise_id) as lesson_id) m
    where m.lesson_id is not null
    order by ep.user_id, m.lesson_id, (ep.status = 'completed') desc, ep.last_activity_at desc
  )
  insert into public.lesson_progress (user_id, lesson_id, status, completed_at, last_viewed_at)
  select d.user_id, d.lesson_id, d.status, d.completed_at, d.last_activity_at
  from derived d
  on conflict (user_id, lesson_id) do update set
    status = case
      when public.lesson_progress.status = 'completed' or excluded.status = 'completed' then 'completed'
      else public.lesson_progress.status end,
    completed_at = coalesce(public.lesson_progress.completed_at, excluded.completed_at),
    last_viewed_at = greatest(public.lesson_progress.last_viewed_at, excluded.last_viewed_at);
  get diagnostics v_rows = row_count;
  return v_rows;
end;
$$;
revoke execute on function public.backfill_exercise_lesson_progress() from public, anon, authenticated;
grant execute on function public.backfill_exercise_lesson_progress() to service_role;

-- Runs once when this migration is applied, repairing the learners who already solved exercises.
select public.backfill_exercise_lesson_progress();
