-- pgTAP tests for the curriculum migration + seed. Run with `npx supabase test db`.
begin;
select plan(12);

-- Seed sanity
select cmp_ok((select count(*) from public.sections), '=', 40::bigint, '40 sections seeded');
select cmp_ok((select count(*) from public.theory_questions), '>=', 30::bigint, 'questions seeded');
select cmp_ok((select count(*) from public.lessons where kind = 'quiz'), '>=', 3::bigint, 'derived quiz lessons seeded');

-- anon: public views work, secrets do not
set local role anon;
-- Quiz prompts stopped being anonymous material with migration 20260923180000 (security F-1).
select throws_ok('select count(*) from public.questions_public', '42501', null, 'anon cannot read quiz questions');
select cmp_ok((select count(*) from public.lessons_public where body_md_free is not null), '>=', 6::bigint, 'anon reads free lesson bodies');
select throws_ok('select is_correct from public.question_options limit 1', '42501', null, 'anon cannot read is_correct');
select throws_ok('select explanation_md from public.theory_questions limit 1', '42501', null, 'anon cannot read explanations');
select throws_ok('select body_md from public.lessons limit 1', '42501', null, 'anon cannot read lesson bodies directly');
select throws_ok('select sql from public.exercise_solutions limit 1', '42501', null, 'anon cannot read solutions');
reset role;

-- learner: lesson progress via RPC, own rows only
insert into auth.users (id, email) values ('41111111-1111-1111-1111-111111111111', 'eva@ejemplo.lat');
set local role authenticated;
set local request.jwt.claim.sub = '41111111-1111-1111-1111-111111111111';
set local request.jwt.claims = '{"sub":"41111111-1111-1111-1111-111111111111","role":"authenticated"}';
select lives_ok($$ select public.mark_lesson_viewed('select-columnas', false) $$, 'learner records a view');
select lives_ok($$ select public.mark_lesson_viewed('select-columnas', true) $$, 'learner completes a lesson');
select is((select status from public.lesson_progress where lesson_id = (select id from public.lessons where slug = 'select-columnas')), 'completed', 'completion persisted and readable by owner');
reset role;

select * from finish();
rollback;
