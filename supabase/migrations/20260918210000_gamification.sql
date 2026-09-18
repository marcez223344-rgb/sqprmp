-- Migration: 20260918210000_gamification.sql
-- Purpose: reward ledger (idempotent), totals, levels, daily activity, streaks with freezes,
--          learning goals, badges, suspicious activity; RPCs that award rewards server-side.
-- Design ref: docs/DATABASE_DESIGN.md §2 Rewards; docs/PRODUCT_REQUIREMENTS.md (gamification)
-- Destructive: no
set check_function_bodies = off;

-- 1. Tables -------------------------------------------------------------------------
create table if not exists public.reward_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  event_key text not null,
  source text not null check (source in ('exercise','quiz','streak','badge','section','admin')),
  xp_delta integer not null default 0,
  coin_delta integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  activity_date date not null,
  created_at timestamptz not null default now(),
  unique (user_id, event_key)
);
create index if not exists reward_ledger_user_created_idx on public.reward_ledger (user_id, created_at desc);
create index if not exists reward_ledger_user_date_idx on public.reward_ledger (user_id, activity_date);

create table if not exists public.user_totals (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  xp_total integer not null default 0,
  coin_balance integer not null default 0,
  level integer not null default 1,
  updated_at timestamptz not null default now()
);

create table if not exists public.daily_activity (
  user_id uuid not null references public.profiles (id) on delete cascade,
  activity_date date not null,
  xp_earned integer not null default 0,
  minutes_active integer not null default 0,
  exercises_completed integer not null default 0,
  last_touch_at timestamptz not null default now(),
  primary key (user_id, activity_date)
);
create index if not exists daily_activity_user_date_idx on public.daily_activity (user_id, activity_date desc);

create table if not exists public.streaks (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  current_length integer not null default 0,
  longest_length integer not null default 0,
  last_activity_date date,
  freezes_available integer not null default 1,
  freezes_refilled_month date,
  updated_at timestamptz not null default now()
);

create table if not exists public.streak_freezes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  used_on date not null,
  created_at timestamptz not null default now(),
  unique (user_id, used_on)
);

create table if not exists public.learning_goals (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  daily_xp_target integer not null default 50 check (daily_xp_target between 10 and 1000),
  weekly_minutes_target integer not null default 120 check (weekly_minutes_target between 30 and 1200),
  reminder_opt_in boolean not null default false,
  updated_at timestamptz not null default now()
);
create trigger learning_goals_set_updated_at before update on public.learning_goals for each row execute function public.set_updated_at();

create table if not exists public.badges (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null,
  icon text not null,
  criteria jsonb not null,
  sort_order integer not null default 0,
  is_active boolean not null default true
);

create table if not exists public.user_badges (
  user_id uuid not null references public.profiles (id) on delete cascade,
  badge_id uuid not null references public.badges (id) on delete cascade,
  earned_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);

create table if not exists public.suspicious_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete cascade,
  kind text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- 2. RLS ----------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['reward_ledger','user_totals','daily_activity','streaks','streak_freezes','learning_goals','badges','user_badges','suspicious_activity'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;
grant select on public.reward_ledger, public.user_totals, public.daily_activity, public.streaks, public.streak_freezes, public.user_badges to authenticated;
grant select on public.badges to anon, authenticated;
grant select, insert, update on public.learning_goals to authenticated;

create policy "reward_ledger: owner reads" on public.reward_ledger for select to authenticated using (user_id = (select auth.uid()));
create policy "user_totals: owner reads" on public.user_totals for select to authenticated using (user_id = (select auth.uid()));
create policy "daily_activity: owner reads" on public.daily_activity for select to authenticated using (user_id = (select auth.uid()));
create policy "streaks: owner reads" on public.streaks for select to authenticated using (user_id = (select auth.uid()));
create policy "streak_freezes: owner reads" on public.streak_freezes for select to authenticated using (user_id = (select auth.uid()));
create policy "user_badges: owner reads" on public.user_badges for select to authenticated using (user_id = (select auth.uid()));
create policy "badges: active readable" on public.badges for select to anon, authenticated using (is_active);
create policy "learning_goals: owner all" on public.learning_goals for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "suspicious_activity: admin reads" on public.suspicious_activity for select to authenticated using (public.is_admin());
grant select on public.suspicious_activity to authenticated;
create policy "reward_ledger: admin reads" on public.reward_ledger for select to authenticated using (public.is_admin());
create policy "user_totals: admin reads" on public.user_totals for select to authenticated using (public.is_admin());

-- 3. Level curve (single source: mirrors src/lib/rewards/rules.ts) ------------------
-- Level n requires 100 * n * (n - 1) / 2 total XP (100, 300, 600, 1000, …).
create or replace function public.level_for_xp(p_xp integer)
returns integer
language sql
immutable
as $$
  select greatest(1, floor((1 + sqrt(1 + 8 * greatest(p_xp, 0) / 100.0)) / 2)::int);
$$;

-- 4. Award (idempotent by event_key; daily XP cap; streak maintenance) --------------
create or replace function public.award_reward(
  p_user_id uuid, p_event_key text, p_source text, p_xp integer, p_coins integer,
  p_metadata jsonb, p_activity_date date, p_daily_xp_cap integer
)
returns table (awarded boolean, xp_awarded integer, coins_awarded integer, xp_total integer, level integer, streak_length integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_today_xp integer;
  v_xp integer := greatest(p_xp, 0);
  v_coins integer := greatest(p_coins, 0);
  v_totals public.user_totals%rowtype;
  v_streak public.streaks%rowtype;
  v_inserted boolean := false;
begin
  -- Idempotency: the same event never pays twice.
  insert into public.reward_ledger (user_id, event_key, source, xp_delta, coin_delta, metadata, activity_date)
  values (p_user_id, p_event_key, p_source, 0, 0, coalesce(p_metadata, '{}'::jsonb), p_activity_date)
  on conflict (user_id, event_key) do nothing;
  get diagnostics v_inserted = row_count;
  if not v_inserted then
    select t.xp_total, t.level into v_totals.xp_total, v_totals.level from public.user_totals t where t.user_id = p_user_id;
    select s.current_length into v_streak.current_length from public.streaks s where s.user_id = p_user_id;
    return query select false, 0, 0, coalesce(v_totals.xp_total, 0), coalesce(v_totals.level, 1), coalesce(v_streak.current_length, 0);
    return;
  end if;

  -- Daily cap on XP (coins are not capped).
  select coalesce(sum(xp_delta), 0) into v_today_xp from public.reward_ledger
  where user_id = p_user_id and activity_date = p_activity_date;
  v_xp := least(v_xp, greatest(p_daily_xp_cap - v_today_xp, 0));

  update public.reward_ledger set xp_delta = v_xp, coin_delta = v_coins where user_id = p_user_id and event_key = p_event_key;

  insert into public.user_totals (user_id, xp_total, coin_balance, level)
  values (p_user_id, v_xp, v_coins, public.level_for_xp(v_xp))
  on conflict (user_id) do update set
    xp_total = public.user_totals.xp_total + excluded.xp_total,
    coin_balance = public.user_totals.coin_balance + excluded.coin_balance,
    level = public.level_for_xp(public.user_totals.xp_total + excluded.xp_total),
    updated_at = now()
  returning * into v_totals;

  insert into public.daily_activity (user_id, activity_date, xp_earned, exercises_completed)
  values (p_user_id, p_activity_date, v_xp, case when p_source = 'exercise' then 1 else 0 end)
  on conflict (user_id, activity_date) do update set
    xp_earned = public.daily_activity.xp_earned + excluded.xp_earned,
    exercises_completed = public.daily_activity.exercises_completed + excluded.exercises_completed,
    last_touch_at = now();

  v_streak := public.touch_streak(p_user_id, p_activity_date);

  return query select true, v_xp, v_coins, v_totals.xp_total, v_totals.level, v_streak.current_length;
end;
$$;
revoke execute on function public.award_reward(uuid, text, text, integer, integer, jsonb, date, integer) from public, anon, authenticated;
grant execute on function public.award_reward(uuid, text, text, integer, integer, jsonb, date, integer) to service_role;

-- Streak update for an activity day: consecutive → +1; one-day gap → consume a freeze if
-- available (streak kept); otherwise restart at 1. Never punishes beyond a reset.
create or replace function public.touch_streak(p_user_id uuid, p_activity_date date)
returns public.streaks
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  s public.streaks%rowtype;
  gap integer;
begin
  insert into public.streaks (user_id) values (p_user_id) on conflict (user_id) do nothing;
  select * into s from public.streaks where user_id = p_user_id for update;

  -- Monthly freeze refill (1 per month, non-cumulative).
  if s.freezes_refilled_month is null or s.freezes_refilled_month < date_trunc('month', p_activity_date)::date then
    s.freezes_available := greatest(s.freezes_available, 1);
    s.freezes_refilled_month := date_trunc('month', p_activity_date)::date;
  end if;

  if s.last_activity_date is null then
    s.current_length := 1;
  elsif p_activity_date = s.last_activity_date then
    null; -- same day, no change
  elsif p_activity_date < s.last_activity_date then
    null; -- late-arriving activity for an earlier day: ignore for streak purposes
  else
    gap := p_activity_date - s.last_activity_date;
    if gap = 1 then
      s.current_length := s.current_length + 1;
    elsif gap = 2 and s.freezes_available > 0 then
      s.freezes_available := s.freezes_available - 1;
      insert into public.streak_freezes (user_id, used_on) values (p_user_id, s.last_activity_date + 1) on conflict do nothing;
      s.current_length := s.current_length + 1;
    else
      s.current_length := 1;
    end if;
  end if;
  s.last_activity_date := greatest(coalesce(s.last_activity_date, p_activity_date), p_activity_date);
  s.longest_length := greatest(s.longest_length, s.current_length);

  update public.streaks set
    current_length = s.current_length, longest_length = s.longest_length, last_activity_date = s.last_activity_date,
    freezes_available = s.freezes_available, freezes_refilled_month = s.freezes_refilled_month, updated_at = now()
  where user_id = p_user_id
  returning * into s;
  return s;
end;
$$;
revoke execute on function public.touch_streak(uuid, date) from public, anon, authenticated;
grant execute on function public.touch_streak(uuid, date) to service_role;

-- Active minutes heuristic: each touch adds min(p_max_gap, minutes since last touch) for that day.
create or replace function public.touch_daily_activity(p_user_id uuid, p_activity_date date, p_max_gap_minutes integer)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_last timestamptz; v_delta integer;
begin
  select last_touch_at into v_last from public.daily_activity where user_id = p_user_id and activity_date = p_activity_date;
  if v_last is null then
    insert into public.daily_activity (user_id, activity_date, minutes_active) values (p_user_id, p_activity_date, 1)
    on conflict (user_id, activity_date) do nothing;
    return;
  end if;
  v_delta := least(p_max_gap_minutes, greatest(1, floor(extract(epoch from (now() - v_last)) / 60)::int));
  update public.daily_activity set minutes_active = minutes_active + v_delta, last_touch_at = now()
  where user_id = p_user_id and activity_date = p_activity_date;
end;
$$;
revoke execute on function public.touch_daily_activity(uuid, date, integer) from public, anon, authenticated;
grant execute on function public.touch_daily_activity(uuid, date, integer) to service_role;

-- 5. Badges: criteria evaluated in SQL; returns newly earned badge slugs -----------
create or replace function public.evaluate_badges(p_user_id uuid)
returns setof text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  b record;
  v_completed integer;
  v_no_hints integer;
  v_sections integer;
  v_streak integer;
  v_level integer;
  earned boolean;
begin
  select count(*) into v_completed from public.exercise_progress where user_id = p_user_id and status = 'completed';
  select count(*) into v_no_hints from public.exercise_progress where user_id = p_user_id and status = 'completed' and hints_used = 0 and solution_revealed_at is null;
  select coalesce(longest_length, 0) into v_streak from public.streaks where user_id = p_user_id;
  select coalesce(level, 1) into v_level from public.user_totals where user_id = p_user_id;
  -- Sections where every published exercise lesson is completed (theory-only sections excluded).
  select count(*) into v_sections from (
    select s.id
    from public.sections s
    join public.exercises e on e.section_id = s.id and e.is_published
    left join public.exercise_progress p on p.exercise_id = e.id and p.user_id = p_user_id and p.status = 'completed'
    group by s.id
    having count(*) = count(p.exercise_id)
  ) done;

  for b in select * from public.badges where is_active loop
    earned := case b.criteria ->> 'kind'
      when 'exercises_completed' then v_completed >= (b.criteria ->> 'threshold')::int
      when 'exercises_without_hints' then v_no_hints >= (b.criteria ->> 'threshold')::int
      when 'sections_completed' then v_sections >= (b.criteria ->> 'threshold')::int
      when 'streak' then v_streak >= (b.criteria ->> 'threshold')::int
      when 'level' then v_level >= (b.criteria ->> 'threshold')::int
      else false end;
    if earned then
      insert into public.user_badges (user_id, badge_id) values (p_user_id, b.id) on conflict do nothing;
      if found then return next b.slug; end if;
    end if;
  end loop;
  return;
end;
$$;
revoke execute on function public.evaluate_badges(uuid) from public, anon, authenticated;
grant execute on function public.evaluate_badges(uuid) to service_role;

-- 6. Badge seed -------------------------------------------------------------------
insert into public.badges (slug, title, description, icon, criteria, sort_order) values
  ('primera-consulta', 'Primera consulta', 'Completaste tu primer ejercicio.', 'sparkles', '{"kind":"exercises_completed","threshold":1}', 1),
  ('cinco-ejercicios', 'En marcha', 'Completaste cinco ejercicios.', 'rocket', '{"kind":"exercises_completed","threshold":5}', 2),
  ('veinte-ejercicios', 'Constancia', 'Completaste veinte ejercicios.', 'flame', '{"kind":"exercises_completed","threshold":20}', 3),
  ('sin-pistas-cinco', 'Sin ayuda', 'Resolviste cinco ejercicios sin pistas ni solución.', 'brain', '{"kind":"exercises_without_hints","threshold":5}', 4),
  ('seccion-completa', 'Sección completa', 'Completaste todos los ejercicios de una sección.', 'check-circle', '{"kind":"sections_completed","threshold":1}', 5),
  ('tres-secciones', 'Tres secciones', 'Completaste tres secciones enteras.', 'layers', '{"kind":"sections_completed","threshold":3}', 6),
  ('racha-3', 'Racha de 3 días', 'Practicaste tres días seguidos.', 'calendar-check', '{"kind":"streak","threshold":3}', 7),
  ('racha-7', 'Racha semanal', 'Practicaste siete días seguidos.', 'calendar-days', '{"kind":"streak","threshold":7}', 8),
  ('racha-30', 'Racha mensual', 'Treinta días seguidos de práctica.', 'trophy', '{"kind":"streak","threshold":30}', 9),
  ('nivel-3', 'Nivel 3', 'Alcanzaste el nivel 3.', 'star', '{"kind":"level","threshold":3}', 10),
  ('nivel-5', 'Nivel 5', 'Alcanzaste el nivel 5.', 'award', '{"kind":"level","threshold":5}', 11),
  ('nivel-10', 'Nivel 10', 'Alcanzaste el nivel 10.', 'crown', '{"kind":"level","threshold":10}', 12)
on conflict (slug) do update set title = excluded.title, description = excluded.description, icon = excluded.icon, criteria = excluded.criteria, sort_order = excluded.sort_order;
