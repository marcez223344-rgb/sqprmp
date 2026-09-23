-- pgTAP tests for in-progress quiz attempts (D-33 sampling, D-34 per-question grading):
-- start/resume, answer immutability, sample membership, server-side scoring, idempotent close,
-- discard, and the RLS posture that keeps answer keys away from the learner's own client.
begin;
select plan(31);

insert into auth.users (id, email) values
  ('91111111-1111-1111-1111-111111111111', 'sofia.quiz@ejemplo.lat'),
  ('92222222-2222-2222-2222-222222222222', 'otro.quiz@ejemplo.lat');

create temp table ctx as
select l.id as lesson_id, l.section_id,
       (select array_agg(q.id) from (select id from public.theory_questions where section_id = l.section_id order by slug limit 3) q) as sample,
       (select id from public.theory_questions where section_id = l.section_id order by slug desc limit 1) as outsider
from public.lessons l where l.slug = 'introduccion-bases-de-datos-quiz';

-- 1. Start and resume -------------------------------------------------------------------
create temp table started as
select * from public.start_quiz_attempt('91111111-1111-1111-1111-111111111111', (select lesson_id from ctx), (select sample from ctx));
select is((select count(*) from public.quiz_attempts where user_id = '91111111-1111-1111-1111-111111111111' and status = 'in_progress'), 1::bigint, 'starting a quiz opens exactly one attempt');
select is((select submitted_at::text from public.quiz_attempts where id = (select attempt_id from started)), null::text, 'an open attempt has no submitted_at');

-- Resuming ignores a freshly proposed sample: a reload cannot re-roll the questions.
select is(
  (select question_ids from public.start_quiz_attempt('91111111-1111-1111-1111-111111111111', (select lesson_id from ctx), array[(select outsider from ctx)])),
  (select sample from ctx), 'resuming returns the stored sample, not the proposed one');
select is((select count(*) from public.quiz_attempts where user_id = '91111111-1111-1111-1111-111111111111'), 1::bigint, 'resuming does not create a second attempt');

-- 2. Answers ----------------------------------------------------------------------------
select throws_ok(
  format($$ select * from public.record_quiz_answer('91111111-1111-1111-1111-111111111111', %L, %L, '"a"'::jsonb, true) $$,
         (select attempt_id from started), (select outsider from ctx)),
  'P0001', null, 'a question outside the attempt sample is rejected');
select throws_ok(
  format($$ select * from public.record_quiz_answer('92222222-2222-2222-2222-222222222222', %L, %L, '"a"'::jsonb, true) $$,
         (select attempt_id from started), (select sample[1] from ctx)),
  'P0002', null, 'another learner cannot answer into this attempt');

select is((select recorded from public.record_quiz_answer('91111111-1111-1111-1111-111111111111', (select attempt_id from started), (select sample[1] from ctx), '"a"'::jsonb, true)), true, 'the first answer is recorded');
select is((select recorded from public.record_quiz_answer('91111111-1111-1111-1111-111111111111', (select attempt_id from started), (select sample[1] from ctx), '"b"'::jsonb, false)), false, 'answers are final: a second answer is refused');
select is((select count(*) from public.quiz_answers where quiz_attempt_id = (select attempt_id from started)), 1::bigint, 'the refused answer left no row');
select is((select is_correct from public.quiz_answers where quiz_attempt_id = (select attempt_id from started)), true, 'the stored answer is the first one');

-- 3. Close ------------------------------------------------------------------------------
select throws_ok(
  format($$ select * from public.finalize_quiz_attempt('91111111-1111-1111-1111-111111111111', %L, 80) $$, (select attempt_id from started)),
  'P0001', null, 'an attempt with unanswered questions cannot be closed');

select public.record_quiz_answer('91111111-1111-1111-1111-111111111111', (select attempt_id from started), (select sample[2] from ctx), '"a"'::jsonb, true);
select public.record_quiz_answer('91111111-1111-1111-1111-111111111111', (select attempt_id from started), (select sample[3] from ctx), '"a"'::jsonb, false);

create temp table closed as
select * from public.finalize_quiz_attempt('91111111-1111-1111-1111-111111111111', (select attempt_id from started), 80);
select is((select score from closed), 2, 'the score is counted from the recorded answers');
select is((select total from closed), 3, 'the total is the size of the stored sample');
select is((select passed from closed), false, '2 of 3 is below the 80% threshold');
select is((select count(*) from public.lesson_progress where user_id = '91111111-1111-1111-1111-111111111111' and status = 'completed'), 0::bigint, 'a failed quiz does not complete the lesson');
select is((select status from public.quiz_attempts where id = (select attempt_id from started)), 'submitted', 'the attempt is closed');
select is((select already_submitted from public.finalize_quiz_attempt('91111111-1111-1111-1111-111111111111', (select attempt_id from started), 80)), true, 'closing twice returns the stored result');
select throws_ok(
  format($$ select * from public.record_quiz_answer('91111111-1111-1111-1111-111111111111', %L, %L, '"a"'::jsonb, true) $$,
         (select attempt_id from started), (select sample[1] from ctx)),
  'P0001', null, 'a closed attempt accepts no more answers');

-- 4. Retry and discard ------------------------------------------------------------------
create temp table retried as
select * from public.start_quiz_attempt('91111111-1111-1111-1111-111111111111', (select lesson_id from ctx), (select sample from ctx));
select is((select resumed from retried), false, 'after closing, starting again opens a new attempt');
select is(public.discard_quiz_attempt('91111111-1111-1111-1111-111111111111', (select attempt_id from retried)), true, 'an open attempt can be discarded');
select is((select count(*) from public.quiz_attempts where user_id = '91111111-1111-1111-1111-111111111111' and status = 'in_progress'), 0::bigint, 'the discarded attempt is gone');

-- 5. RLS --------------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claim.sub = '91111111-1111-1111-1111-111111111111';
set local request.jwt.claims = '{"sub":"91111111-1111-1111-1111-111111111111","role":"authenticated"}';
select is((select count(*) from public.quiz_attempts), 1::bigint, 'a learner reads only their own attempts');
select is((select count(*) from public.quiz_answers where user_id = '92222222-2222-2222-2222-222222222222'), 0::bigint, 'a learner cannot read another learner''s answers');
select throws_ok(
  $$ insert into public.quiz_attempts (user_id, lesson_id, section_id) values ('91111111-1111-1111-1111-111111111111', gen_random_uuid(), gen_random_uuid()) $$,
  '42501', null, 'a learner cannot open an attempt directly');
select throws_ok('select is_correct from public.question_options limit 1', '42501', null, 'a learner cannot read is_correct');
select throws_ok('select explanation_md from public.theory_questions limit 1', '42501', null, 'a learner cannot read explanations');
-- F-1: `pairs` is the grading key of matching questions. It must not be in the view, must not be
-- column-granted on the base table, and the view itself is learner-only material.
select is((select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'questions_public' and column_name in ('answer', 'explanation_md', 'pairs')), 0::bigint, 'the learner-facing question view exposes no answer key');
select throws_ok('select pairs from public.theory_questions limit 1', '42501', null, 'a learner cannot read the matching answer key');
select lives_ok('select id, prompt_md from public.questions_public limit 1', 'a learner still reads question prompts');
reset role;

set local role anon;
select throws_ok('select count(*) from public.questions_public', '42501', null, 'quiz prompts are not published to anonymous visitors');
select throws_ok('select pairs from public.theory_questions limit 1', '42501', null, 'anon cannot read the matching answer key');
reset role;

select * from finish();
rollback;
