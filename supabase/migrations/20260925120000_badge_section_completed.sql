-- Migration: 20260925120000_badge_section_completed.sql
-- Purpose: badge criteria kind `section_completed` (a specific section, by slug) and the
--          «Verificador de IA» badge for section `sql-con-ia` (owner approval 2026-09-25, D-40).
-- Design ref: docs/GAMIFICATION.md (Badges); docs/DATABASE_DESIGN.md §4o
-- Destructive: no. No table, column, RLS policy or grant on a table changes.
--
-- One definition of "section completed". Until now it lived inline in `evaluate_badges()` (every
-- published exercise of the section completed; sections without published exercises never count).
-- It moves verbatim into `completed_section_slugs()` so the existing count criterion
-- (`sections_completed`) and the new slug criterion (`section_completed`) cannot drift apart, and
-- the backfill below uses the same function.
--
-- Backfill: learners who completed a `section_completed` badge's section before this migration get
-- the badge here, idempotently (`on conflict do nothing`). Relying on "their next reward" alone would
-- miss anyone who finished the section and earns nothing afterwards. No XP/coins are attached to
-- badges, so the backfill pays nothing.
set check_function_bodies = off;

-- 1. The single definition --------------------------------------------------------------
create or replace function public.completed_section_slugs(p_user_id uuid)
returns setof text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  -- Sections where every published exercise is completed (theory-only sections excluded).
  select s.slug
  from public.sections s
  join public.exercises e on e.section_id = s.id and e.is_published
  left join public.exercise_progress p on p.exercise_id = e.id and p.user_id = p_user_id and p.status = 'completed'
  group by s.id, s.slug
  having count(*) = count(p.exercise_id)
$$;
revoke execute on function public.completed_section_slugs(uuid) from public, anon, authenticated;
grant execute on function public.completed_section_slugs(uuid) to service_role;

-- 2. evaluate_badges: same criteria as before, plus `section_completed` -----------------
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
  v_done_sections text[];
  v_sections integer;
  v_streak integer;
  v_level integer;
  earned boolean;
begin
  select count(*) into v_completed from public.exercise_progress where user_id = p_user_id and status = 'completed';
  select count(*) into v_no_hints from public.exercise_progress where user_id = p_user_id and status = 'completed' and hints_used = 0 and solution_revealed_at is null;
  select coalesce(longest_length, 0) into v_streak from public.streaks where user_id = p_user_id;
  select coalesce(level, 1) into v_level from public.user_totals where user_id = p_user_id;
  v_done_sections := array(select public.completed_section_slugs(p_user_id));
  v_sections := coalesce(array_length(v_done_sections, 1), 0);

  for b in select * from public.badges where is_active loop
    earned := case b.criteria ->> 'kind'
      when 'exercises_completed' then v_completed >= (b.criteria ->> 'threshold')::int
      when 'exercises_without_hints' then v_no_hints >= (b.criteria ->> 'threshold')::int
      when 'sections_completed' then v_sections >= (b.criteria ->> 'threshold')::int
      when 'section_completed' then coalesce((b.criteria ->> 'section') = any (v_done_sections), false)
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

-- 3. Badge row --------------------------------------------------------------------------
-- Icon `search-check` matches src/config/badges.ts (SearchCheck, family autonomía, tier III).
insert into public.badges (slug, title, description, icon, criteria, sort_order) values
  ('verificador-de-ia', 'Verificador de IA',
   'Completaste todos los ejercicios de «SQL con IA»: revisaste y corregiste SQL escrito por una IA antes de darlo por bueno.',
   'search-check', '{"kind":"section_completed","section":"sql-con-ia"}', 13)
on conflict (slug) do update set title = excluded.title, description = excluded.description, icon = excluded.icon, criteria = excluded.criteria, sort_order = excluded.sort_order;

-- 4. Backfill ---------------------------------------------------------------------------
-- Only learners with at least one completed exercise in the badge's section can qualify, so the
-- candidate set is narrowed first; the completion check itself is the shared function.
insert into public.user_badges (user_id, badge_id)
select distinct p.user_id, b.id
from public.badges b
join public.sections s on s.slug = b.criteria ->> 'section'
join public.exercises e on e.section_id = s.id and e.is_published
join public.exercise_progress p on p.exercise_id = e.id and p.status = 'completed'
where b.is_active
  and b.criteria ->> 'kind' = 'section_completed'
  and s.slug in (select public.completed_section_slugs(p.user_id))
on conflict do nothing;
