-- pgTAP tests for assessments + certificates: quiz attempts, section completion, eligibility,
-- issuance idempotency, revocation, public verification and RLS.
begin;
select plan(20);

insert into auth.users (id, email) values
  ('81111111-1111-1111-1111-111111111111', 'sofia@ejemplo.lat'),
  ('82222222-2222-2222-2222-222222222222', 'otro@ejemplo.lat');

-- Seed sanity
select cmp_ok((select count(*) from public.certificate_requirements where is_active), '>=', 4::bigint, 'certificate requirements seeded');
-- Migration 20260924140000: «SQL con IA» is required, immediately before the capstone.
select is((select array_position(s, 'proyectos-finales') - array_position(s, 'sql-con-ia')
           from (select array(select jsonb_array_elements_text(rules -> 'sections')) as s
                 from public.certificate_requirements where slug = 'analista-sql-profesional') t),
          1, 'analista-sql-profesional requires sql-con-ia right before proyectos-finales');
select ok((select 'Uso y verificación de IA para SQL' = any (skills) from public.certificate_requirements where slug = 'analista-sql-profesional'),
          'analista-sql-profesional lists the AI verification skill');

-- A requirement scoped to a single seeded section (intro has theory + quiz, no exercises).
insert into public.certificate_requirements (slug, title, skills, rules, sort_order, is_active)
values ('test-intro', 'Test Intro', array['Intro'], '{"sections":["introduccion-bases-de-datos"],"min_quiz_score_percent":80}', 99, true);

create temp table ctx as
select l.id as lesson_id, l.section_id, (select id from public.theory_questions where section_id = l.section_id limit 1) as question_id
from public.lessons l where l.slug = 'introduccion-bases-de-datos-quiz';

select is(public.certificate_eligible('81111111-1111-1111-1111-111111111111', 'test-intro'), false, 'not eligible before any quiz');
select is(public.check_section_completion('81111111-1111-1111-1111-111111111111', (select section_id from ctx)), false, 'section incomplete before quiz');

-- Failed attempt: recorded, no lesson completion, no section completion.
select lives_ok($$ select public.record_quiz_attempt('81111111-1111-1111-1111-111111111111', (select lesson_id from ctx), 3, 10, false,
  jsonb_build_array(jsonb_build_object('question_id', (select question_id from ctx), 'answer', '"a"'::jsonb, 'is_correct', false))) $$, 'failed attempt recorded');
select is((select count(*) from public.quiz_answers where user_id = '81111111-1111-1111-1111-111111111111'), 1::bigint, 'answers stored per attempt');
select is((select count(*) from public.lesson_progress where user_id = '81111111-1111-1111-1111-111111111111' and status = 'completed'), 0::bigint, 'failed quiz does not complete the lesson');
select is(public.certificate_eligible('81111111-1111-1111-1111-111111111111', 'test-intro'), false, 'not eligible after a failed attempt');

-- Passing attempt below the requirement's minimum score is not enough.
select lives_ok($$ select public.record_quiz_attempt('81111111-1111-1111-1111-111111111111', (select lesson_id from ctx), 7, 10, true, '[]'::jsonb) $$, 'pass at 70% recorded');
select is(public.check_section_completion('81111111-1111-1111-1111-111111111111', (select section_id from ctx)), true, 'section completes on a passing quiz');
select is(public.certificate_eligible('81111111-1111-1111-1111-111111111111', 'test-intro'), false, '70% does not meet the 80% minimum');

-- Passing attempt at the minimum → eligible → issue (idempotent).
select lives_ok($$ select public.record_quiz_attempt('81111111-1111-1111-1111-111111111111', (select lesson_id from ctx), 8, 10, true, '[]'::jsonb) $$, 'pass at 80% recorded');
select is(public.certificate_eligible('81111111-1111-1111-1111-111111111111', 'test-intro'), true, 'eligible at the minimum score');
-- anon reads the code from this temp table after the role switch below.
create temp table issued as select * from public.issue_certificate('81111111-1111-1111-1111-111111111111', 'test-intro', '  Sofía Test  ');
select alike((select public_id from issued)::text, 'DMSA-____-________'::text, 'public id format'::text);
select is((select already_issued from (select * from public.issue_certificate('81111111-1111-1111-1111-111111111111', 'test-intro', 'Sofía Test')) x), true, 'second issue returns the existing certificate');
select throws_ok($$ select public.issue_certificate('82222222-2222-2222-2222-222222222222', 'test-intro', 'Otro') $$, 'P0001', null, 'ineligible learner cannot be issued');

grant select on issued to anon;

-- Public verification (anon) exposes minimal data; revocation flips the flag.
set local role anon;
select is((select recipient_name from public.verify_certificate((select verification_code from issued))), 'Sofía Test', 'anon verifies by code (name trimmed)');
select throws_ok('select user_id from public.certificates limit 1', '42501', null, 'anon cannot read certificates table');
reset role;
select public.revoke_certificate((select public_id from issued), null, 'test');
select is((select revoked from public.verify_certificate((select verification_code from issued))), true, 'revoked certificate verifies as revoked');

select * from finish();
rollback;
