-- «Analista SQL Profesional» now requires section «SQL con IA» (owner decision 2026-09-24, amends
-- D-40 sub-decision 4). Data-only: no schema, RLS or grant change. 0 certificates issued at the
-- time, so no learner loses eligibility. The section row comes from the content seed, not from
-- here; this only edits the requirement's JSON rule and skills array.
-- Idempotent: the slug is inserted once, immediately before "proyectos-finales" (or appended if
-- that slug is ever absent); the skill is appended once. Other keys of `rules` are preserved.
update public.certificate_requirements r
set rules = jsonb_set(
      r.rules,
      '{sections}',
      (
        select jsonb_agg(x.slug order by x.pos)
        from (
          select e.slug, e.ord * 2 as pos
          from jsonb_array_elements_text(r.rules -> 'sections') with ordinality as e(slug, ord)
          union all
          select 'sql-con-ia',
                 coalesce(
                   (select e.ord * 2 - 1
                    from jsonb_array_elements_text(r.rules -> 'sections') with ordinality as e(slug, ord)
                    where e.slug = 'proyectos-finales'),
                   2147483647)
        ) x
      )
    )
where r.slug = 'analista-sql-profesional'
  and not (r.rules -> 'sections') ? 'sql-con-ia';

update public.certificate_requirements
set skills = array_append(skills, 'Uso y verificación de IA para SQL')
where slug = 'analista-sql-profesional'
  and not ('Uso y verificación de IA para SQL' = any (skills));
