-- pgTAP tests for exercise activity RPCs, free limit and secret isolation.
begin;
select plan(14);

insert into auth.users (id, email) values
  ('51111111-1111-1111-1111-111111111111', 'fede@ejemplo.lat'),
  ('52222222-2222-2222-2222-222222222222', 'gabi@ejemplo.lat');

-- Exercise ids from the seed (section 3 has five gated exercises, section 2 has two).
create temp table ex as
  select e.id, e.slug, row_number() over (order by s.number, e.slug) as n
  from public.exercises e join public.sections s on s.id = e.section_id where e.is_published;
select cmp_ok((select count(*) from ex), '>=', 7::bigint, 'seeded exercises available');

-- Free limit: first 5 gated exercises ok, 6th locked; admins/entitled bypass.
select is(public.can_access_exercise('51111111-1111-1111-1111-111111111111', (select id from ex where n = 1), 5), 'ok', 'first exercise accessible');
select lives_ok($$ select public.start_exercise('51111111-1111-1111-1111-111111111111', id) from ex where n <= 5 $$, 'start five gated exercises');
select is(public.free_exercises_used('51111111-1111-1111-1111-111111111111'), 5, 'five free slots used');
select is(public.can_access_exercise('51111111-1111-1111-1111-111111111111', (select id from ex where n = 6), 5), 'locked', 'sixth exercise locked');
select is(public.can_access_exercise('51111111-1111-1111-1111-111111111111', (select id from ex where n = 1), 5), 'ok', 'already started exercise stays accessible');
update public.profiles set role = 'admin' where id = '52222222-2222-2222-2222-222222222222';
select is(public.can_access_exercise('52222222-2222-2222-2222-222222222222', (select id from ex where n = 6), 5), 'ok', 'admin bypasses the free limit');

-- record_attempt: first correct completion flagged once only.
select is((select first_completion from public.record_attempt('51111111-1111-1111-1111-111111111111', (select id from ex where n = 1), 'select 1', 'incorrect', '[]'::jsonb, 5, 1, true)), false, 'incorrect attempt is not a completion');
select is((select first_completion from public.record_attempt('51111111-1111-1111-1111-111111111111', (select id from ex where n = 1), 'select 2', 'correct', '[]'::jsonb, 5, 1, true)), true, 'first correct attempt is the first completion');
select is((select first_completion from public.record_attempt('51111111-1111-1111-1111-111111111111', (select id from ex where n = 1), 'select 2', 'correct', '[]'::jsonb, 5, 1, false)), false, 'repeated correct attempt is not a first completion');
select is((select genuine_attempts_count from public.exercise_progress where user_id = '51111111-1111-1111-1111-111111111111' and exercise_id = (select id from ex where n = 1)), 2, 'genuine attempts counted');

-- Hints unlock sequentially.
select throws_ok($$ select * from public.unlock_hint('51111111-1111-1111-1111-111111111111', (select id from ex where n = 2), 2) $$, 'P0001', null, 'hint 2 requires hint 1');
select lives_ok($$ select * from public.unlock_hint('51111111-1111-1111-1111-111111111111', (select id from ex where n = 2), 1) $$, 'hint 1 unlocks');

-- Learner cannot read another learner's attempts or any hint/solution directly.
set local role authenticated;
set local request.jwt.claim.sub = '51111111-1111-1111-1111-111111111111';
set local request.jwt.claims = '{"sub":"51111111-1111-1111-1111-111111111111","role":"authenticated"}';
select throws_ok('select body_md from public.exercise_hints limit 1', '42501', null, 'learner cannot read hints directly');
reset role;

select * from finish();
rollback;
