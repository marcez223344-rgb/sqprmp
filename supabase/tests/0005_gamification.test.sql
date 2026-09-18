-- pgTAP tests for rewards, streaks, badges and their RLS.
begin;
select plan(12);

insert into auth.users (id, email) values ('61111111-1111-1111-1111-111111111111', 'hugo@ejemplo.lat'), ('62222222-2222-2222-2222-222222222222', 'iris@ejemplo.lat');

-- Idempotent award + daily cap.
select is((select awarded from public.award_reward('61111111-1111-1111-1111-111111111111', 'ex:a', 'exercise', 40, 8, '{}'::jsonb, date '2026-03-01', 600)), true, 'first award pays');
select is((select awarded from public.award_reward('61111111-1111-1111-1111-111111111111', 'ex:a', 'exercise', 40, 8, '{}'::jsonb, date '2026-03-01', 600)), false, 'same event never pays twice');
select is((select xp_awarded from public.award_reward('61111111-1111-1111-1111-111111111111', 'ex:b', 'exercise', 590, 0, '{}'::jsonb, date '2026-03-01', 600)), 560, 'daily cap limits XP');
select is((select xp_total from public.user_totals where user_id = '61111111-1111-1111-1111-111111111111'), 600, 'totals accumulate');
select is((select level from public.user_totals where user_id = '61111111-1111-1111-1111-111111111111'), 4, 'level follows the curve');

-- Streak: consecutive days, freeze on a one-day gap, reset on longer gaps.
select lives_ok($$ select public.award_reward('61111111-1111-1111-1111-111111111111', 'ex:c', 'exercise', 10, 0, '{}'::jsonb, date '2026-03-02', 600) $$, 'day 2');
select is((select streak_length from public.award_reward('61111111-1111-1111-1111-111111111111', 'ex:d', 'exercise', 10, 0, '{}'::jsonb, date '2026-03-04', 600)), 3, 'freeze bridges a one-day gap');
select is((select freezes_available from public.streaks where user_id = '61111111-1111-1111-1111-111111111111'), 0, 'freeze consumed');
select is((select streak_length from public.award_reward('61111111-1111-1111-1111-111111111111', 'ex:e', 'exercise', 10, 0, '{}'::jsonb, date '2026-03-10', 600)), 1, 'long gap resets the streak');

-- Badges evaluate from real progress.
select ok(array['nivel-3'] <@ array(select public.evaluate_badges('61111111-1111-1111-1111-111111111111')), 'level badge awarded');

-- RLS: learners read own totals only; nothing for others.
set local role authenticated;
set local request.jwt.claim.sub = '62222222-2222-2222-2222-222222222222';
set local request.jwt.claims = '{"sub":"62222222-2222-2222-2222-222222222222","role":"authenticated"}';
select is((select count(*) from public.user_totals), 0::bigint, 'other learner sees no totals');
select throws_ok($$ insert into public.reward_ledger (user_id, event_key, source, activity_date) values ('62222222-2222-2222-2222-222222222222', 'hack', 'admin', current_date) $$, '42501', null, 'learners cannot write the ledger');
reset role;

select * from finish();
rollback;
