-- Migration: 20260923171000_leaderboard_consent_and_gating.sql
-- Purpose: security review 2026-09-23, finding F-3 (Medium), on top of 20260923121000_leaderboard.sql.
--          (a) The consent record for the ranking was undateable: `profiles.leaderboard_opt_in` had
--              no timestamp, while terms and privacy consent in this product are versioned and dated.
--          (b) `grant execute … to authenticated` made the two board functions readable through
--              PostgREST while the `leaderboards` flag was off and `/ranking` returned 404, so data
--              was disclosable with the feature nominally disabled.
-- Design ref: docs/DATABASE_DESIGN.md §4j; docs/SECURITY.md §7.2; docs/DECISIONS.md D-35
-- Destructive: the two `leaderboard*` functions are dropped and recreated with a new signature
--              (they take the caller explicitly now). No data is touched; the new column is added
--              null for existing rows on purpose — see the comment below.
set check_function_bodies = off;

-- 1. Dateable consent ----------------------------------------------------------------
alter table public.profiles add column if not exists leaderboard_opt_in_at timestamptz;
comment on column public.profiles.leaderboard_opt_in_at is
  'When the current value of leaderboard_opt_in was set (opt-in or opt-out). Null means the choice predates this column: consent given before 2026-09-23 has no recorded date, and inventing one would be worse than admitting it.';

-- Maintained by the database, never by the client: the column is deliberately absent from the
-- learner update grant, and this trigger overwrites whatever any writer supplies. A separate trigger
-- (not a rewrite of profiles_before_write) keeps the two concerns independent.
create or replace function public.profiles_stamp_leaderboard_consent()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    new.leaderboard_opt_in_at = case when new.leaderboard_opt_in then now() end;
  elsif new.leaderboard_opt_in is distinct from old.leaderboard_opt_in then
    new.leaderboard_opt_in_at = now();
  else
    new.leaderboard_opt_in_at = old.leaderboard_opt_in_at;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_stamp_leaderboard_consent on public.profiles;
create trigger profiles_stamp_leaderboard_consent
  before insert or update on public.profiles
  for each row execute function public.profiles_stamp_leaderboard_consent();

-- 2. The flag is an access control, not only a route guard ----------------------------
-- Fails closed: no row means disabled, which matches the static default in src/config/features.ts.
create or replace function public.leaderboards_enabled()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce((select f.enabled from public.feature_flags f where f.key = 'leaderboards'), false);
$$;
revoke execute on function public.leaderboards_enabled() from public, anon, authenticated;
grant execute on function public.leaderboards_enabled() to service_role;

-- 3. Board functions: service role only, caller passed explicitly, flag checked inside -
drop function if exists public.leaderboard(text, integer);
drop function if exists public.leaderboard_participants(text);

-- Two independent gates, on purpose. `revoke … from authenticated` is what the rest of this codebase
-- does with data-bearing RPCs (the server authorizes, then calls with the admin client), and it is
-- the only one that also stops a learner from reading the board while it is enabled but before the
-- page exists for them. The in-function flag check is defence in depth: a future caller that forgets
-- `isLeaderboardEnabled()` still gets nothing. Because the admin client has no JWT, the caller is a
-- parameter now — it drives both the "is this me" flag and the timezone of the weekly window.
create or replace function public.leaderboard(p_user_id uuid, p_period text, p_limit integer default 25)
returns table (
  rank_position integer,
  alias text,
  avatar_path text,
  level integer,
  xp integer,
  is_self boolean
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with gate as (select public.leaderboards_enabled() as is_on),
  win as (
    select coalesce(
      (select (now() at time zone coalesce(p.timezone, 'UTC'))::date from public.profiles p where p.id = p_user_id),
      (now() at time zone 'UTC')::date
    ) as today
  ),
  participants as (
    select p.id, p.alias::text as alias, a.image_path as avatar_path
    from public.profiles p
    left join public.avatars a on a.id = p.avatar_id
    where p.leaderboard_opt_in and p.deleted_at is null and p.alias is not null
  ),
  scored as (
    select
      pa.id,
      pa.alias,
      pa.avatar_path,
      coalesce((select t.level from public.user_totals t where t.user_id = pa.id), 1) as level,
      (case when p_period = 'week' then
          coalesce((
            select sum(d.xp_earned) from public.daily_activity d, win w
            where d.user_id = pa.id and d.activity_date <= w.today and d.activity_date > w.today - 7
          ), 0)
        else
          coalesce((select t.xp_total from public.user_totals t where t.user_id = pa.id), 0)
        end)::integer as xp
    from participants pa
  ),
  ranked as (
    select s.*, (rank() over (order by s.xp desc, s.alias asc))::integer as rank_position
    from scored s
    where s.xp > 0
  )
  select r.rank_position, r.alias, r.avatar_path, r.level, r.xp, r.id = p_user_id as is_self
  from ranked r, gate g
  where g.is_on and (r.rank_position <= greatest(coalesce(p_limit, 25), 1) or r.id = p_user_id)
  order by r.rank_position, r.alias;
$$;
comment on function public.leaderboard(uuid, text, integer) is
  'Opt-in XP ranking for p_user_id''s view of it (alias, avatar, level, XP). Empty while the leaderboards flag is off. Server only.';
revoke execute on function public.leaderboard(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.leaderboard(uuid, text, integer) to service_role;

create or replace function public.leaderboard_participants(p_user_id uuid, p_period text)
returns integer
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  -- Counting the unbounded board's rows is what keeps the total and the listing from disagreeing:
  -- one filter, one definition of "participant", and zero while the flag is off.
  select count(*)::integer from public.leaderboard(p_user_id, p_period, 2147483647);
$$;
revoke execute on function public.leaderboard_participants(uuid, text) from public, anon, authenticated;
grant execute on function public.leaderboard_participants(uuid, text) to service_role;
