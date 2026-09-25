-- pgTAP tests for private exercise reports (D-42, round 6 item 14).
--
-- The rule being proven: a report reaches the owner only. A learner writes and reads their own
-- rows, never another learner's; they cannot mark a report resolved or forge its slug; admins read
-- everything; resolving goes through the audited service-role RPC.
begin;
select plan(20);

insert into auth.users (id, email) values
  ('c1111111-1111-1111-1111-111111111111', 'reporta@ejemplo.lat'),
  ('c2222222-2222-2222-2222-222222222222', 'otra@ejemplo.lat'),
  ('c3333333-3333-3333-3333-333333333333', 'reports-admin@ejemplo.lat');
update public.profiles set role = 'admin' where id = 'c3333333-3333-3333-3333-333333333333';

create temp table ex as
  select e.id, e.slug from public.exercises e where e.is_published order by e.slug limit 1;
grant select on ex to authenticated, anon;
select is((select count(*)::int from ex), 1, 'a seeded exercise is available');

-- 2-3. RLS on and no anon access at all.
select ok(
  (select relrowsecurity from pg_class where oid = 'public.exercise_reports'::regclass),
  'RLS is enabled on exercise_reports');
set local role anon;
select throws_ok('select 1 from public.exercise_reports', '42501', null,
  'anon cannot read exercise_reports');
reset role;

-- 4-8. Learner A inserts their own report; slug and status are set by the database.
set local role authenticated;
set local request.jwt.claim.sub = 'c1111111-1111-1111-1111-111111111111';
set local request.jwt.claims = '{"sub":"c1111111-1111-1111-1111-111111111111","role":"authenticated"}';
select lives_ok(
  $$insert into public.exercise_reports
      (user_id, exercise_id, exercise_slug, category, note, learner_sql)
    values ('c1111111-1111-1111-1111-111111111111', (select id from ex), 'slug-inventado',
            'marked_wrong', 'Mi consulta devuelve lo mismo que pide el enunciado.', 'select 1')$$,
  'a learner inserts a report of their own');
select is(
  (select exercise_slug from public.exercise_reports
    where user_id = 'c1111111-1111-1111-1111-111111111111'),
  (select slug from ex), 'the slug is derived from the exercise id, not taken from the client');
select is(
  (select status from public.exercise_reports
    where user_id = 'c1111111-1111-1111-1111-111111111111'),
  'open', 'a new report starts open');
select throws_ok(
  $$insert into public.exercise_reports (user_id, exercise_id, category, note)
    values ('c2222222-2222-2222-2222-222222222222', (select id from ex), 'other',
            'Reporte a nombre de otra persona.')$$,
  '42501', null, 'a learner cannot insert a report for someone else');
select throws_ok(
  $$insert into public.exercise_reports (user_id, exercise_id, category, note, status)
    values ('c1111111-1111-1111-1111-111111111111', (select id from ex), 'other',
            'Intento crearlo ya resuelto.', 'resolved')$$,
  '42501', null, 'a learner cannot choose the status column');

-- 9-11. Checks: category, note length, missing exercise.
select throws_ok(
  $$insert into public.exercise_reports (user_id, exercise_id, category, note)
    values ('c1111111-1111-1111-1111-111111111111', (select id from ex), 'spam',
            'Categoría inexistente.')$$,
  '23514', null, 'an unknown category is refused');
select throws_ok(
  $$insert into public.exercise_reports (user_id, exercise_id, category, note)
    values ('c1111111-1111-1111-1111-111111111111', (select id from ex), 'other', 'corto')$$,
  '23514', null, 'a note under the minimum length is refused');
select throws_ok(
  $$insert into public.exercise_reports (user_id, exercise_id, category, note)
    values ('c1111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000',
            'other', 'Ejercicio que no existe.')$$,
  'P0002', null, 'an unknown exercise is refused');

-- 12. A learner cannot resolve (no update policy for them; the column grant alone is not enough).
update public.exercise_reports set status = 'resolved', resolved_at = now()
 where user_id = 'c1111111-1111-1111-1111-111111111111';
select is(
  (select status from public.exercise_reports
    where user_id = 'c1111111-1111-1111-1111-111111111111'),
  'open', 'a learner update touches no row');

-- 13-14. Learner B sees nothing of learner A's; cannot call the resolve RPC.
set local request.jwt.claim.sub = 'c2222222-2222-2222-2222-222222222222';
set local request.jwt.claims = '{"sub":"c2222222-2222-2222-2222-222222222222","role":"authenticated"}';
select is((select count(*)::int from public.exercise_reports), 0,
  'another learner reads none of the reports');
select throws_ok(
  $$select public.admin_resolve_exercise_report(
      (select id from public.exercise_reports limit 1),
      'c2222222-2222-2222-2222-222222222222', 'x')$$,
  '42501', null, 'a learner cannot call admin_resolve_exercise_report');

-- 15. Admin reads all.
set local request.jwt.claim.sub = 'c3333333-3333-3333-3333-333333333333';
set local request.jwt.claims = '{"sub":"c3333333-3333-3333-3333-333333333333","role":"authenticated"}';
select is((select count(*)::int from public.exercise_reports), 1, 'an admin reads every report');
reset role;

-- 16-19. Resolve through the service-role RPC: state, resolver, audit, no double resolve.
create temp table rep as select id from public.exercise_reports
  where user_id = 'c1111111-1111-1111-1111-111111111111';
select lives_ok(
  $$select public.admin_resolve_exercise_report((select id from rep),
      'c3333333-3333-3333-3333-333333333333', 'enunciado corregido')$$,
  'the service role resolves a report');
select is(
  (select status || ':' || resolved_by::text from public.exercise_reports
    where id = (select id from rep)),
  'resolved:c3333333-3333-3333-3333-333333333333', 'the report is resolved by the actor');
select is(
  (select count(*)::int from public.audit_logs
    where action = 'exercise_report.resolved' and target_id = (select id::text from rep)),
  1, 'resolving is audit-logged');
select throws_ok(
  $$select public.admin_resolve_exercise_report((select id from rep),
      'c3333333-3333-3333-3333-333333333333', 'otra vez')$$,
  'P0002', null, 'an already resolved report cannot be resolved again');

-- 20. Deleting the exercise keeps the report (slug preserved, id nulled).
select ok(
  (select confdeltype = 'n' from pg_constraint
    where conrelid = 'public.exercise_reports'::regclass
      and conname = 'exercise_reports_exercise_id_fkey'),
  'the exercise FK is ON DELETE SET NULL');

select * from finish();
rollback;
