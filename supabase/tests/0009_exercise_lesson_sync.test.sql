-- pgTAP tests for the exercise → lesson progress sync (migration 20260923120000):
-- resolution of the lesson behind an exercise, idempotency, no downgrade after completion,
-- the backfill function, and that learners can neither execute the RPC nor read another
-- learner's lesson_progress row.
begin;
select plan(14);

insert into auth.users (id, email) values
  ('a1111111-1111-1111-1111-111111111111', 'ada@ejemplo.lat'),
  ('a2222222-2222-2222-2222-222222222222', 'bruno@ejemplo.lat');

-- A seeded, published exercise that has a lesson on the path (slug-independent on purpose).
create temp table ctx as
select e.id as exercise_id, e.lesson_id
from public.exercises e
where e.lesson_id is not null and e.is_published
order by e.slug
limit 1;

select cmp_ok((select count(*) from ctx), '=', 1::bigint, 'an exercise with a lesson exists in the seed');
select is(
  public.lesson_id_for_exercise((select exercise_id from ctx)),
  (select lesson_id from ctx),
  'lesson_id_for_exercise resolves the linked lesson');
select is(public.lesson_id_for_exercise('00000000-0000-0000-0000-000000000000'), null,
  'unknown exercise resolves to no lesson');

-- Nothing is written before the learner starts.
select is(
  (select count(*) from public.lesson_progress where user_id = 'a1111111-1111-1111-1111-111111111111'),
  0::bigint, 'no lesson progress before starting');

-- Starting the exercise marks the lesson in progress.
select is(
  public.sync_exercise_lesson_progress('a1111111-1111-1111-1111-111111111111', (select exercise_id from ctx), false),
  (select lesson_id from ctx), 'sync returns the lesson it touched');
select is(
  (select status from public.lesson_progress
    where user_id = 'a1111111-1111-1111-1111-111111111111' and lesson_id = (select lesson_id from ctx)),
  'in_progress', 'starting an exercise puts its lesson in progress');

-- Completing it completes the lesson, and repeating the call changes nothing but last_viewed_at.
select lives_ok($$ select public.sync_exercise_lesson_progress('a1111111-1111-1111-1111-111111111111', (select exercise_id from ctx), true) $$,
  'completion syncs');
select isnt(
  (select completed_at from public.lesson_progress
    where user_id = 'a1111111-1111-1111-1111-111111111111' and lesson_id = (select lesson_id from ctx)),
  null, 'completed_at is set');

create temp table stamp as
select completed_at from public.lesson_progress
where user_id = 'a1111111-1111-1111-1111-111111111111' and lesson_id = (select lesson_id from ctx);

select lives_ok($$ select public.sync_exercise_lesson_progress('a1111111-1111-1111-1111-111111111111', (select exercise_id from ctx), true) $$,
  'sync is safe to repeat');
select is(
  (select completed_at from public.lesson_progress
    where user_id = 'a1111111-1111-1111-1111-111111111111' and lesson_id = (select lesson_id from ctx)),
  (select completed_at from stamp), 'the first completion timestamp is kept');

-- A later "started" call must not undo a completion.
select public.sync_exercise_lesson_progress('a1111111-1111-1111-1111-111111111111', (select exercise_id from ctx), false);
select is(
  (select status from public.lesson_progress
    where user_id = 'a1111111-1111-1111-1111-111111111111' and lesson_id = (select lesson_id from ctx)),
  'completed', 'a completed lesson is never downgraded to in_progress');

-- Backfill: progress that exists only in exercise_progress (the bug's victims) is repaired.
insert into public.exercise_progress (user_id, exercise_id, status, first_completed_at)
values ('a2222222-2222-2222-2222-222222222222', (select exercise_id from ctx), 'completed', now() - interval '3 days');
select cmp_ok(public.backfill_exercise_lesson_progress(), '>=', 1, 'backfill writes the missing rows');
select is(
  (select status from public.lesson_progress
    where user_id = 'a2222222-2222-2222-2222-222222222222' and lesson_id = (select lesson_id from ctx)),
  'completed', 'a previously completed exercise now shows its lesson as completed');

-- Learners cannot call the sync themselves (it is server-authoritative). The grant makes sure the
-- expected 42501 comes from the function and not from reading the temp table.
grant select on ctx to authenticated;
set local role authenticated;
set local request.jwt.claim.sub = 'a1111111-1111-1111-1111-111111111111';
set local request.jwt.claims = '{"sub":"a1111111-1111-1111-1111-111111111111","role":"authenticated"}';
select throws_ok(
  $$ select public.sync_exercise_lesson_progress('a1111111-1111-1111-1111-111111111111', (select exercise_id from ctx), true) $$,
  '42501', null, 'learners cannot execute the sync RPC');
reset role;

select * from finish();
rollback;
