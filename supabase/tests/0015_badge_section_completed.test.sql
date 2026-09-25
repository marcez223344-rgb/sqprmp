-- pgTAP tests for the `section_completed` badge criterion and the «Verificador de IA» badge
-- (migration 20260925120000). "Section completed" is `completed_section_slugs()`, the same
-- definition the `sections_completed` count uses. Relies on the content seed for section
-- `sql-con-ia` and its published exercises.
begin;
select plan(16);

insert into auth.users (id, email) values
  ('c1111111-1111-1111-1111-111111111111', 'verifica@ejemplo.lat'),
  ('c2222222-2222-2222-2222-222222222222', 'otra-seccion@ejemplo.lat');

create temp table ia_exercises on commit drop as
  select e.id, row_number() over (order by e.id) as n
  from public.exercises e join public.sections s on s.id = e.section_id
  where s.slug = 'sql-con-ia' and e.is_published;

create temp table other_exercises on commit drop as
  select e.id
  from public.exercises e
  where e.is_published
    and e.section_id = (
      select s.id from public.sections s
      join public.exercises x on x.section_id = s.id and x.is_published
      where s.slug <> 'sql-con-ia'
      order by s.number limit 1);

-- 1-3. The badge row and its section.
select is((select criteria from public.badges where slug = 'verificador-de-ia'),
  '{"kind":"section_completed","section":"sql-con-ia"}'::jsonb, 'badge criteria names the section by slug');
select ok((select is_active from public.badges where slug = 'verificador-de-ia'), 'badge is active');
select cmp_ok((select count(*) from ia_exercises), '>=', 2::bigint, 'section sql-con-ia has published exercises to complete');

-- 4. Every section_completed badge points at a real section (a typo would never award).
select is((select count(*) from public.badges b
            where b.criteria ->> 'kind' = 'section_completed'
              and not exists (select 1 from public.sections s where s.slug = b.criteria ->> 'section')),
  0::bigint, 'every section_completed badge references an existing section');

-- 5-7. Not earned while one exercise of the section is still open.
insert into public.exercise_progress (user_id, exercise_id, status, first_completed_at)
select 'c1111111-1111-1111-1111-111111111111', id, 'completed', now() from ia_exercises
where n > 1;
insert into public.exercise_progress (user_id, exercise_id, status)
select 'c1111111-1111-1111-1111-111111111111', id, 'in_progress' from ia_exercises
where n = 1;

select ok(not ('verificador-de-ia' = any (array(select public.evaluate_badges('c1111111-1111-1111-1111-111111111111')))),
  'not earned with one exercise still in progress');
select is((select count(*) from public.user_badges ub join public.badges b on b.id = ub.badge_id
            where ub.user_id = 'c1111111-1111-1111-1111-111111111111' and b.slug = 'verificador-de-ia'),
  0::bigint, 'no user_badges row before the section is complete');
select ok(not ('sql-con-ia' = any (array(select public.completed_section_slugs('c1111111-1111-1111-1111-111111111111')))),
  'completed_section_slugs excludes the unfinished section');

-- 8-10. Earned once the last exercise is completed; the count criterion agrees.
update public.exercise_progress set status = 'completed', first_completed_at = now()
where user_id = 'c1111111-1111-1111-1111-111111111111' and exercise_id = (select id from ia_exercises where n = 1);

select ok('verificador-de-ia' = any (array(select public.evaluate_badges('c1111111-1111-1111-1111-111111111111'))),
  'earned when every published exercise of the section is completed');
select is((select count(*) from public.user_badges ub join public.badges b on b.id = ub.badge_id
            where ub.user_id = 'c1111111-1111-1111-1111-111111111111' and b.slug = 'seccion-completa'),
  1::bigint, 'the same completion counts for sections_completed (one shared definition)');
select is((select count(*) from public.user_badges ub join public.badges b on b.id = ub.badge_id
            where ub.user_id = 'c1111111-1111-1111-1111-111111111111' and b.slug = 'tres-secciones'),
  0::bigint, 'one section does not unlock the three-sections badge');

-- 11-12. Idempotent: never returned or inserted twice.
select ok(not ('verificador-de-ia' = any (array(select public.evaluate_badges('c1111111-1111-1111-1111-111111111111')))),
  're-evaluation does not report the badge again');
select is((select count(*) from public.user_badges ub join public.badges b on b.id = ub.badge_id
            where ub.user_id = 'c1111111-1111-1111-1111-111111111111' and b.slug = 'verificador-de-ia'),
  1::bigint, 'exactly one user_badges row');

-- 13-14. Completing a different section earns seccion-completa but not this badge.
insert into public.exercise_progress (user_id, exercise_id, status, first_completed_at)
select 'c2222222-2222-2222-2222-222222222222', id, 'completed', now() from other_exercises;
select ok('seccion-completa' = any (array(select public.evaluate_badges('c2222222-2222-2222-2222-222222222222'))),
  'another section still earns seccion-completa');
select is((select count(*) from public.user_badges ub join public.badges b on b.id = ub.badge_id
            where ub.user_id = 'c2222222-2222-2222-2222-222222222222' and b.slug = 'verificador-de-ia'),
  0::bigint, 'another section does not earn Verificador de IA');

-- 15-16. Server-only: learners cannot call the helper nor award themselves.
set local role authenticated;
set local request.jwt.claim.sub = 'c2222222-2222-2222-2222-222222222222';
set local request.jwt.claims = '{"sub":"c2222222-2222-2222-2222-222222222222","role":"authenticated"}';
select throws_ok($$ select public.completed_section_slugs('c2222222-2222-2222-2222-222222222222') $$,
  '42501', null, 'learners cannot execute completed_section_slugs');
select throws_ok($$ select public.evaluate_badges('c2222222-2222-2222-2222-222222222222') $$,
  '42501', null, 'learners cannot execute evaluate_badges');
reset role;

select * from finish();
rollback;
