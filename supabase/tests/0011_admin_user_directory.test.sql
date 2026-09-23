-- pgTAP tests for the admin user directory and audience statistics (owner feedback item 10).
-- The point of most of these assertions is negative: nobody but the service role (and, if a
-- grant is ever widened, nobody but an admin) may read the directory or the aggregates, and no
-- caller ever receives an email or a birth date.
begin;
select plan(27);

insert into auth.users (id, email) values
  ('a1111111-1111-1111-1111-111111111111', 'ana@ejemplo.lat'),
  ('a2222222-2222-2222-2222-222222222222', 'beto@ejemplo.lat'),
  ('a3333333-3333-3333-3333-333333333333', 'caro@ejemplo.lat'),
  ('a4444444-4444-4444-4444-444444444444', 'dir-admin@ejemplo.lat');

update public.profiles set alias = 'ana_dir', display_name = 'Ana Directorio', country = 'AR',
       birth_date = (current_date - interval '30 years')::date, onboarding_completed_at = now()
 where id = 'a1111111-1111-1111-1111-111111111111';
update public.profiles set alias = 'beto_dir', display_name = 'Beto Directorio', country = 'MX',
       birth_date = (current_date - interval '22 years')::date
 where id = 'a2222222-2222-2222-2222-222222222222';
update public.profiles set alias = 'caro_dir', display_name = 'Caro Directorio', deleted_at = now()
 where id = 'a3333333-3333-3333-3333-333333333333';
update public.profiles set alias = 'dir_admin', role = 'admin'
 where id = 'a4444444-4444-4444-4444-444444444444';

-- Ana: three started, two completed, some XP, active today. Beto: one started, access granted.
create temp table ex as
  select e.id, row_number() over (order by e.slug) as n from public.exercises e where e.is_published;
insert into public.exercise_progress (user_id, exercise_id, status)
select 'a1111111-1111-1111-1111-111111111111', id, case when n <= 2 then 'completed' else 'in_progress' end
  from ex where n <= 3;
insert into public.exercise_progress (user_id, exercise_id, status)
values ('a2222222-2222-2222-2222-222222222222', (select id from ex where n = 1), 'in_progress');
insert into public.user_totals (user_id, xp_total, coin_balance, level)
values ('a1111111-1111-1111-1111-111111111111', 500, 10, 3);
insert into public.daily_activity (user_id, activity_date, xp_earned, minutes_active, exercises_completed)
values ('a1111111-1111-1111-1111-111111111111', current_date, 500, 20, 2);
insert into public.entitlements (user_id, source, scope, starts_at)
values ('a2222222-2222-2222-2222-222222222222', 'admin', 'full_course', now());

-- 1-4. Execute is revoked: neither anon nor an authenticated learner can call either function.
set local role anon;
select throws_ok('select 1 from public.admin_user_directory()', '42501', null, 'anon cannot call admin_user_directory');
select throws_ok('select public.admin_user_stats(5)', '42501', null, 'anon cannot call admin_user_stats');
set local role authenticated;
set local request.jwt.claim.sub = 'a1111111-1111-1111-1111-111111111111';
set local request.jwt.claims = '{"sub":"a1111111-1111-1111-1111-111111111111","role":"authenticated"}';
select throws_ok('select 1 from public.admin_user_directory()', '42501', null, 'learner cannot call admin_user_directory');
select throws_ok('select public.admin_user_stats(5)', '42501', null, 'learner cannot call admin_user_stats');
reset role;

-- 5-7. Defense in depth: even with execute privilege, a non-admin JWT subject is refused.
select throws_ok('select 1 from public.admin_user_directory()', '42501', null, 'learner JWT is refused inside the directory');
select throws_ok('select public.admin_user_stats(5)', '42501', null, 'learner JWT is refused inside the stats');
set local request.jwt.claim.sub = 'a4444444-4444-4444-4444-444444444444';
set local request.jwt.claims = '{"sub":"a4444444-4444-4444-4444-444444444444","role":"authenticated","user_role":"admin"}';
select lives_ok('select 1 from public.admin_user_directory()', 'admin JWT passes the internal check');
set local request.jwt.claim.sub = '';
set local request.jwt.claims = '';

-- 8-10. Listing: live profiles by default, deleted on request, no birth date in the result type.
select is((select total_count from public.admin_user_directory() limit 1), 3::bigint, 'directory lists the three live profiles');
select is((select total_count from public.admin_user_directory(p_include_deleted => true) limit 1), 4::bigint, 'deleted profiles only on request');
select throws_ok('select birth_date from public.admin_user_directory()', '42703', null, 'the directory exposes no birth date');

-- 11-14. Derived columns.
select is((select age from public.admin_user_directory(p_search => 'ana_dir')), 30, 'age is derived from the birth date');
select is((select entitlement from public.admin_user_directory(p_search => 'beto_dir')), 'granted', 'an admin grant shows as granted');
select is((select entitlement from public.admin_user_directory(p_search => 'dir_admin')), 'admin', 'the admin role shows as admin');
select is((select exercises_completed || '/' || exercises_started from public.admin_user_directory(p_search => 'ana_dir')), '2/3', 'started and completed counts');

-- 15-18. Sorting, pagination, search and filters.
select is((select alias from public.admin_user_directory(p_sort => 'exercises_completed', p_desc => true, p_limit => 1)), 'ana_dir', 'sorting by completions puts the most advanced first');
select is((select count(*) from public.admin_user_directory(p_limit => 1, p_offset => 1)), 1::bigint, 'pagination returns one row per page');
select is((select alias from public.admin_user_directory(p_search => 'ANA_DIR')), 'ana_dir', 'search is case insensitive');
select is((select count(*) from public.admin_user_directory(p_country => 'ar')), 1::bigint, 'country filter is case insensitive');

-- 19-22. Statistics: learners only (no admins, no deleted), honest nulls on an empty denominator.
select is((public.admin_user_stats(2) ->> 'learners_total')::int, 2, 'stats count live learners only');
select is((select (e ->> 'learners')::int from jsonb_array_elements(public.admin_user_stats(2) -> 'by_age_bracket') e where e ->> 'bracket' = '25_34'), 1, 'age bracket 25-34 has one learner');
select is(public.admin_user_stats(2) -> 'friction' ->> 'quiz_pass_rate', null, 'quiz pass rate is null with no attempts, not zero');
select is((public.admin_user_stats(2) -> 'friction' ->> 'free_limit_reached_unpaid')::int, 1, 'one learner hit the free limit without paying');

-- 23-27. An open quiz attempt (status = 'in_progress', passed = false) must not be counted as a
-- failure by either reporting function: since 20260923140000 a row exists from the moment the
-- learner opens the quiz. One passed submitted attempt + one open attempt = 100%, not 50%.
create temp table quiz_lesson as
  select l.id, l.section_id, row_number() over (order by l.slug) as n
  from public.lessons l where l.kind = 'quiz' and l.is_published;
select cmp_ok((select count(*) from quiz_lesson), '>=', 2::bigint, 'seeded quiz lessons available');
insert into public.quiz_attempts (user_id, lesson_id, section_id, score, total, passed, status, submitted_at)
select 'a1111111-1111-1111-1111-111111111111', id, section_id, 5, 5, true, 'submitted', now()
  from quiz_lesson where n = 1;
insert into public.quiz_attempts (user_id, lesson_id, section_id, score, total, passed, status, submitted_at)
select 'a1111111-1111-1111-1111-111111111111', id, section_id, 0, 5, false, 'in_progress', null
  from quiz_lesson where n = 2;
select is((public.admin_user_stats(2) -> 'friction' ->> 'quiz_pass_rate')::int, 100, 'an open attempt does not drag the pass rate down');
select is((public.admin_user_stats(2) -> 'friction' ->> 'quiz_attempts_submitted')::int, 1, 'only submitted attempts are counted as attempts');
select is((public.admin_user_stats(2) -> 'friction' ->> 'quiz_attempts_open')::int, 1, 'open attempts are reported separately as an abandonment signal');
select is((public.admin_metrics(2) -> 'learning' ->> 'quiz_pass_rate')::int, 100, 'admin_metrics ignores open attempts too');

select * from finish();
rollback;
