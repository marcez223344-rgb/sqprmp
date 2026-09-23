-- Reconcile badges.icon with src/config/badges.ts.
--
-- Every badge on /logros looked identical (owner feedback, twice) because the page hardcoded one
-- icon; the fix lives in `src/config/badges.ts`, which is now the authoritative slug → icon map.
-- Building it resolved six collisions with icons reserved elsewhere in the design system, so the
-- six rows seeded by 20260918210000_gamification.sql no longer name the icon that is actually
-- rendered. This migration removes that contradiction.
--
-- Naming: the column keeps the kebab-case lucide names it already holds (`calendar-check`,
-- `check-circle`, …); the PascalCase components live only in TypeScript. A data migration is not
-- the place to change a convention.
--
-- Which one wins: `src/config/badges.ts` does. Nothing renders this column — `getProgressSnapshot`
-- still selects it and passes it through as `badges[].icon`, but no component reads that field
-- (both /logros and /aprender call `getBadgeVisual(slug)`). Treat the column as documentation of
-- intent for whoever reads the schema, and keep it honest rather than authoritative.
--
-- Destructive: no. Idempotent: matches on `slug`, sets `icon` only, re-running is a no-op.
set check_function_bodies = off;

do $$
declare
  r record;
  v_updated integer;
  v_duplicates text;
begin
  -- The `from` side carries the value each row is expected to hold *before* the change, so a slug
  -- that has drifted for another reason is reported instead of being silently overwritten.
  for r in
    select * from (values
      ('veinte-ejercicios', 'flame',          'trending-up'),
      ('seccion-completa',  'check-circle',   'book-check'),
      ('tres-secciones',    'layers',         'library'),
      ('racha-7',           'calendar-days',  'calendar-range'),
      ('racha-30',          'trophy',         'flame'),
      ('nivel-5',           'award',          'medal')
    ) as t(slug, icon_before, icon_after)
  loop
    update public.badges set icon = r.icon_after
     where slug = r.slug and icon in (r.icon_before, r.icon_after);
    get diagnostics v_updated = row_count;
    if v_updated <> 1 then
      -- A missing slug or an unexpected current value must not pass as a successful no-op.
      raise exception 'badge % not updated (expected icon % or %, found %)',
        r.slug, r.icon_before, r.icon_after,
        coalesce((select icon from public.badges where slug = r.slug), '<no such badge>')
        using errcode = 'P0002';
    end if;
  end loop;

  -- The whole point of the six changes was that no two badges wear the same icon, and that none
  -- wears an icon reserved elsewhere in the design system. Assert the first half here; the second
  -- half is enforced by `src/config/badges.test.ts`.
  select string_agg(icon, ', ' order by icon) into v_duplicates
  from (select icon from public.badges where is_active group by icon having count(*) > 1) d;
  if v_duplicates is not null then
    raise exception 'badges share an icon: %', v_duplicates using errcode = 'P0001';
  end if;
end $$;
