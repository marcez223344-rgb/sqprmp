-- Migration: 20260923121000_leaderboard.sql
-- Purpose: the profile asks every learner whether to appear in a ranking, and no ranking existed
--          (owner feedback 2026-09-23, item 12). Adds the read-only RPCs that back /ranking.
-- Design ref: docs/DATABASE_DESIGN.md §4 Leaderboard; docs/DECISIONS.md D-35; docs/SECURITY.md §7
-- Destructive: no. No new tables, so no new RLS policies: the board is deliberately built as
--              security-definer functions with the opt-in filter baked in, instead of widening
--              the policies on profiles / user_totals / daily_activity (a learner still cannot
--              select another learner's row directly).
set check_function_bodies = off;

-- Ranking of learners who consented (leaderboard_opt_in), by XP.
--   p_period = 'all'  → lifetime XP (user_totals.xp_total)
--   p_period = 'week' → XP earned in the last 7 days, in the *caller's* timezone, so the window
--                       matches the dates the caller sees elsewhere in the app.
-- Only alias and avatar are exposed (docs/SECURITY.md §7): never display_name, email or country.
-- Learners with no XP in the window are not listed; the caller's own row is always returned, even
-- outside the top N, so the page can show it without fetching the whole board.
create or replace function public.leaderboard(p_period text, p_limit integer default 25)
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
  with win as (
    select coalesce(
      (select (now() at time zone coalesce(p.timezone, 'UTC'))::date from public.profiles p where p.id = auth.uid()),
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
  select r.rank_position, r.alias, r.avatar_path, r.level, r.xp, r.id = auth.uid() as is_self
  from ranked r
  where r.rank_position <= greatest(coalesce(p_limit, 25), 1) or r.id = auth.uid()
  order by r.rank_position, r.alias;
$$;
comment on function public.leaderboard(text, integer) is
  'Opt-in XP ranking (alias + avatar only). Unknown p_period behaves as lifetime.';
revoke execute on function public.leaderboard(text, integer) from public, anon;
grant execute on function public.leaderboard(text, integer) to authenticated, service_role;

-- How many learners actually have a score in the window, so the page can say "too few to compare"
-- instead of rendering a two-row table.
create or replace function public.leaderboard_participants(p_period text)
returns integer
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  -- The unbounded call returns exactly the ranked participants (the caller is among them only
  -- when they opted in and have a score), so counting its rows is the participant count.
  select count(*)::integer from public.leaderboard(p_period, 2147483647);
$$;
revoke execute on function public.leaderboard_participants(text) from public, anon;
grant execute on function public.leaderboard_participants(text) to authenticated, service_role;
