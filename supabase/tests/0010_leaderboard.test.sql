-- pgTAP tests for the opt-in leaderboard (migrations 20260923121000 and 20260923171000).
-- Three things are being protected here:
--   1. Privacy: a learner who did not opt in never appears, is never counted, and cannot be inferred.
--   2. The feature flag is an access control, not only a route guard: the functions yield nothing
--      while `leaderboards` is off, and a learner JWT cannot call them at all (security review F-3).
--   3. The consent record is dateable: `profiles.leaderboard_opt_in_at` tracks when the choice was
--      made, is maintained by the database, and cannot be written by the learner.
begin;
select plan(25);

insert into auth.users (id, email) values
  ('b1111111-1111-1111-1111-111111111111', 'consiente@ejemplo.lat'),
  ('b2222222-2222-2222-2222-222222222222', 'noconsiente@ejemplo.lat'),
  ('b3333333-3333-3333-3333-333333333333', 'tambien@ejemplo.lat');

-- Consent timestamps -----------------------------------------------------------------
select is((select leaderboard_opt_in_at from public.profiles where id = 'b1111111-1111-1111-1111-111111111111'),
  null, 'a new profile has no leaderboard consent date');

update public.profiles set alias = 'ada_opt', leaderboard_opt_in = true, timezone = 'America/Argentina/Buenos_Aires'
  where id = 'b1111111-1111-1111-1111-111111111111';
select isnt((select leaderboard_opt_in_at from public.profiles where id = 'b1111111-1111-1111-1111-111111111111'),
  null, 'opting in records the date');

create temp table consent as
select leaderboard_opt_in_at from public.profiles where id = 'b1111111-1111-1111-1111-111111111111';

-- An unrelated update must not move the consent date.
update public.profiles set display_name = 'Ada' where id = 'b1111111-1111-1111-1111-111111111111';
select is((select leaderboard_opt_in_at from public.profiles where id = 'b1111111-1111-1111-1111-111111111111'),
  (select leaderboard_opt_in_at from consent), 'an unrelated profile edit keeps the consent date');

-- Nor can a writer forge it: the trigger overwrites whatever is supplied.
update public.profiles set leaderboard_opt_in_at = '2001-01-01' where id = 'b1111111-1111-1111-1111-111111111111';
select is((select leaderboard_opt_in_at from public.profiles where id = 'b1111111-1111-1111-1111-111111111111'),
  (select leaderboard_opt_in_at from consent), 'the consent date cannot be back-dated');

-- Opting out is also a dated event.
update public.profiles set leaderboard_opt_in = false where id = 'b1111111-1111-1111-1111-111111111111';
select cmp_ok((select leaderboard_opt_in_at from public.profiles where id = 'b1111111-1111-1111-1111-111111111111'),
  '>=', (select leaderboard_opt_in_at from consent), 'opting out updates the date');
update public.profiles set leaderboard_opt_in = true where id = 'b1111111-1111-1111-1111-111111111111';

-- Board data -------------------------------------------------------------------------
update public.profiles set alias = 'bruno_priv', leaderboard_opt_in = false
  where id = 'b2222222-2222-2222-2222-222222222222';
update public.profiles set alias = 'cora_opt', leaderboard_opt_in = true
  where id = 'b3333333-3333-3333-3333-333333333333';

insert into public.user_totals (user_id, xp_total, coin_balance, level) values
  ('b1111111-1111-1111-1111-111111111111', 900, 0, 4),
  ('b2222222-2222-2222-2222-222222222222', 5000, 0, 10),
  ('b3333333-3333-3333-3333-333333333333', 300, 0, 3);

insert into public.daily_activity (user_id, activity_date, xp_earned) values
  ('b1111111-1111-1111-1111-111111111111', current_date, 40),
  ('b1111111-1111-1111-1111-111111111111', current_date - 20, 500),
  ('b2222222-2222-2222-2222-222222222222', current_date, 999),
  ('b3333333-3333-3333-3333-333333333333', current_date - 1, 120);

-- The flag is off (no row): the feature must disclose nothing at all.
select is(public.leaderboards_enabled(), false, 'no flag row means disabled');
select is((select count(*) from public.leaderboard('b1111111-1111-1111-1111-111111111111', 'all', 25)),
  0::bigint, 'the board is empty while the flag is off');
select is(public.leaderboard_participants('b1111111-1111-1111-1111-111111111111', 'week'), 0,
  'the participant count is zero while the flag is off');

-- A learner JWT cannot call the functions at all, flag or no flag.
set local role authenticated;
set local request.jwt.claim.sub = 'b1111111-1111-1111-1111-111111111111';
set local request.jwt.claims = '{"sub":"b1111111-1111-1111-1111-111111111111","role":"authenticated"}';
select throws_ok($$ select * from public.leaderboard('b1111111-1111-1111-1111-111111111111', 'all', 25) $$,
  '42501', null, 'a learner cannot execute leaderboard() directly');
select throws_ok($$ select public.leaderboard_participants('b1111111-1111-1111-1111-111111111111', 'all') $$,
  '42501', null, 'a learner cannot execute leaderboard_participants() directly');
reset role;
set local role anon;
select throws_ok($$ select * from public.leaderboard('b1111111-1111-1111-1111-111111111111', 'all', 25) $$,
  '42501', null, 'anon cannot execute leaderboard() either');
reset role;

-- Turn the feature on; everything below is the enabled behaviour.
insert into public.feature_flags (key, enabled, is_public) values ('leaderboards', true, true)
  on conflict (key) do update set enabled = true;
select is(public.leaderboards_enabled(), true, 'the flag row enables the board');

select is((select count(*) from public.leaderboard('b1111111-1111-1111-1111-111111111111', 'all', 25) where alias = 'bruno_priv'),
  0::bigint, 'a learner who did not opt in never appears');
select is((select count(*) from public.leaderboard('b1111111-1111-1111-1111-111111111111', 'week', 25) where alias = 'bruno_priv'),
  0::bigint, 'the same holds for the weekly board');
select is((select count(*) from public.leaderboard('b1111111-1111-1111-1111-111111111111', 'all', 25) where xp = 5000),
  0::bigint, 'no row leaks the non-participant score, not even anonymously');
select is((select count(*) from public.leaderboard('b1111111-1111-1111-1111-111111111111', 'all', 25)),
  2::bigint, 'only the two participants are listed');
select is(public.leaderboard_participants('b1111111-1111-1111-1111-111111111111', 'all'), 2,
  'the participant count excludes non-participants');

select is((select alias from public.leaderboard('b1111111-1111-1111-1111-111111111111', 'all', 25) where rank_position = 1),
  'ada_opt', 'lifetime board ranks by total XP');
select is((select is_self from public.leaderboard('b1111111-1111-1111-1111-111111111111', 'all', 25) where alias = 'ada_opt'),
  true, 'the caller recognises their own row');
select is((select is_self from public.leaderboard('b1111111-1111-1111-1111-111111111111', 'all', 25) where alias = 'cora_opt'),
  false, 'other rows are not flagged as the caller');

-- Weekly window: the 20-day-old 500 XP is outside it, yesterday's 120 XP is inside.
select is((select xp from public.leaderboard('b1111111-1111-1111-1111-111111111111', 'week', 25) where alias = 'ada_opt'),
  40, 'the weekly board only counts the last 7 days');
select is((select alias from public.leaderboard('b1111111-1111-1111-1111-111111111111', 'week', 25) where rank_position = 1),
  'cora_opt', 'the weekly ranking differs from the lifetime one');

-- The caller's own row comes back even when they are outside the visible top (cora is second).
select is((select count(*) from public.leaderboard('b3333333-3333-3333-3333-333333333333', 'all', 1)),
  2::bigint, 'the top 1 plus the caller own row');
select is((select is_self from public.leaderboard('b3333333-3333-3333-3333-333333333333', 'all', 1) where rank_position = 2),
  true, 'the extra row is the caller');

-- A non-participant asking for the board sees it, but is not in it.
select is((select count(*) from public.leaderboard('b2222222-2222-2222-2222-222222222222', 'all', 25) where is_self),
  0::bigint, 'a non-participant has no row of their own');

select * from finish();
rollback;
