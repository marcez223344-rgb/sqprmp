-- Migration: 20260918230000_assessments_certificates.sql
-- Purpose: quiz attempts/answers, section completion, certificate requirements and certificates
--          with public verification; RPCs that enforce completion rules server-side.
-- Design ref: docs/DATABASE_DESIGN.md §2 Learning activity / Certificates; docs/GAMIFICATION.md
-- Destructive: no
set check_function_bodies = off;

-- 1. Quizzes -------------------------------------------------------------------------
create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  section_id uuid not null references public.sections (id) on delete cascade,
  score integer not null,
  total integer not null,
  passed boolean not null,
  started_at timestamptz not null default now(),
  submitted_at timestamptz not null default now()
);
create index if not exists quiz_attempts_user_lesson_idx on public.quiz_attempts (user_id, lesson_id, submitted_at desc);

create table if not exists public.quiz_answers (
  id uuid primary key default gen_random_uuid(),
  quiz_attempt_id uuid not null references public.quiz_attempts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  question_id uuid not null references public.theory_questions (id) on delete cascade,
  answer jsonb not null,
  is_correct boolean not null,
  answered_at timestamptz not null default now()
);
create index if not exists quiz_answers_user_question_idx on public.quiz_answers (user_id, question_id, answered_at desc);

-- 2. Section completion ------------------------------------------------------------------
create table if not exists public.section_progress (
  user_id uuid not null references public.profiles (id) on delete cascade,
  section_id uuid not null references public.sections (id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, section_id)
);

-- 3. Certificates ----------------------------------------------------------------------
create table if not exists public.certificate_requirements (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  skills text[] not null default '{}',
  rules jsonb not null,
  sort_order integer not null default 0,
  is_active boolean not null default true
);

create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique,
  verification_code text not null unique,
  user_id uuid not null references public.profiles (id) on delete restrict,
  requirement_id uuid not null references public.certificate_requirements (id) on delete restrict,
  recipient_name text not null,
  issued_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_reason text,
  unique (user_id, requirement_id)
);
create index if not exists certificates_user_idx on public.certificates (user_id);

-- 4. RLS --------------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['quiz_attempts','quiz_answers','section_progress','certificate_requirements','certificates'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;
grant select on public.quiz_attempts, public.quiz_answers, public.section_progress, public.certificates to authenticated;
grant select on public.certificate_requirements to anon, authenticated;

create policy "quiz_attempts: owner reads" on public.quiz_attempts for select to authenticated using (user_id = (select auth.uid()));
create policy "quiz_answers: owner reads" on public.quiz_answers for select to authenticated using (user_id = (select auth.uid()));
create policy "section_progress: owner reads" on public.section_progress for select to authenticated using (user_id = (select auth.uid()));
create policy "certificate_requirements: active readable" on public.certificate_requirements for select to anon, authenticated using (is_active);
create policy "certificates: owner reads" on public.certificates for select to authenticated using (user_id = (select auth.uid()));
create policy "certificates: admin reads" on public.certificates for select to authenticated using (public.is_admin());
create policy "quiz_attempts: admin reads" on public.quiz_attempts for select to authenticated using (public.is_admin());

-- Public verification exposes minimal data by code only (definer view, filtered by the caller).
create or replace function public.verify_certificate(p_code text)
returns table (public_id text, recipient_name text, title text, skills text[], issued_at timestamptz, revoked boolean)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select c.public_id, c.recipient_name, r.title, r.skills, c.issued_at, c.revoked_at is not null
  from public.certificates c join public.certificate_requirements r on r.id = c.requirement_id
  where c.verification_code = p_code
  limit 1;
$$;
revoke execute on function public.verify_certificate(text) from public;
grant execute on function public.verify_certificate(text) to anon, authenticated, service_role;

-- 5. RPCs (service role; the server grades and authorizes) ------------------------------
create or replace function public.record_quiz_attempt(
  p_user_id uuid, p_lesson_id uuid, p_score integer, p_total integer, p_passed boolean, p_answers jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_id uuid; v_section uuid; a jsonb;
begin
  select section_id into v_section from public.lessons where id = p_lesson_id;
  if v_section is null then raise exception 'lesson not found' using errcode = 'P0002'; end if;
  insert into public.quiz_attempts (user_id, lesson_id, section_id, score, total, passed)
  values (p_user_id, p_lesson_id, v_section, p_score, p_total, p_passed) returning id into v_id;
  for a in select * from jsonb_array_elements(coalesce(p_answers, '[]'::jsonb)) loop
    insert into public.quiz_answers (quiz_attempt_id, user_id, question_id, answer, is_correct)
    values (v_id, p_user_id, (a ->> 'question_id')::uuid, coalesce(a -> 'answer', 'null'::jsonb), coalesce((a ->> 'is_correct')::boolean, false));
  end loop;
  if p_passed then
    insert into public.lesson_progress (user_id, lesson_id, status, completed_at)
    values (p_user_id, p_lesson_id, 'completed', now())
    on conflict (user_id, lesson_id) do update set status = 'completed', completed_at = coalesce(public.lesson_progress.completed_at, now()), last_viewed_at = now();
  end if;
  return v_id;
end;
$$;
revoke execute on function public.record_quiz_attempt(uuid, uuid, integer, integer, boolean, jsonb) from public, anon, authenticated;
grant execute on function public.record_quiz_attempt(uuid, uuid, integer, integer, boolean, jsonb) to service_role;

-- A section is complete when every published exercise is completed and the quiz (if any) is passed.
create or replace function public.check_section_completion(p_user_id uuid, p_section_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_exercises integer; v_done integer; v_quiz uuid; v_passed boolean; v_inserted boolean := false;
begin
  select count(*) into v_exercises from public.exercises e where e.section_id = p_section_id and e.is_published;
  select count(*) into v_done from public.exercises e join public.exercise_progress p on p.exercise_id = e.id and p.user_id = p_user_id and p.status = 'completed'
  where e.section_id = p_section_id and e.is_published;
  select id into v_quiz from public.lessons where section_id = p_section_id and kind = 'quiz' and is_published limit 1;
  v_passed := v_quiz is null or exists (select 1 from public.quiz_attempts q where q.user_id = p_user_id and q.lesson_id = v_quiz and q.passed);
  if v_exercises + (case when v_quiz is null then 0 else 1 end) = 0 then return false; end if;
  if v_done = v_exercises and v_passed then
    insert into public.section_progress (user_id, section_id) values (p_user_id, p_section_id) on conflict do nothing;
    get diagnostics v_inserted = row_count;
    return true;
  end if;
  return false;
end;
$$;
revoke execute on function public.check_section_completion(uuid, uuid) from public, anon, authenticated;
grant execute on function public.check_section_completion(uuid, uuid) to service_role;

-- Certificate eligibility: every required section (by slug) must be published and completed;
-- optional min quiz score across those sections' last passing attempts.
create or replace function public.certificate_eligible(p_user_id uuid, p_requirement_slug text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare r public.certificate_requirements%rowtype; s text; v_section uuid; v_min integer;
begin
  select * into r from public.certificate_requirements where slug = p_requirement_slug and is_active;
  if r.id is null then return false; end if;
  for s in select jsonb_array_elements_text(r.rules -> 'sections') loop
    select id into v_section from public.sections where slug = s and is_published;
    if v_section is null then return false; end if;
    if not exists (select 1 from public.section_progress sp where sp.user_id = p_user_id and sp.section_id = v_section) then
      -- Late evaluation: completion may not have been checked since the last activity.
      if not public.check_section_completion(p_user_id, v_section) then return false; end if;
    end if;
  end loop;
  v_min := coalesce((r.rules ->> 'min_quiz_score_percent')::int, 0);
  if v_min > 0 and exists (
    select 1 from public.sections sec
    join public.lessons l on l.section_id = sec.id and l.kind = 'quiz' and l.is_published
    where sec.slug in (select jsonb_array_elements_text(r.rules -> 'sections'))
      and not exists (select 1 from public.quiz_attempts q where q.user_id = p_user_id and q.lesson_id = l.id and q.passed and q.score * 100 >= v_min * q.total)
  ) then return false; end if;
  return true;
end;
$$;
revoke execute on function public.certificate_eligible(uuid, text) from public, anon, authenticated;
grant execute on function public.certificate_eligible(uuid, text) to service_role;

create or replace function public.issue_certificate(p_user_id uuid, p_requirement_slug text, p_recipient_name text)
returns table (public_id text, verification_code text, already_issued boolean)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare r public.certificate_requirements%rowtype; c public.certificates%rowtype; v_public text; v_code text;
begin
  select * into r from public.certificate_requirements where slug = p_requirement_slug and is_active;
  if r.id is null then raise exception 'requirement not found' using errcode = 'P0002'; end if;
  select * into c from public.certificates where user_id = p_user_id and requirement_id = r.id;
  if c.id is not null then
    return query select c.public_id, c.verification_code, true;
    return;
  end if;
  if not public.certificate_eligible(p_user_id, p_requirement_slug) then
    raise exception 'not eligible' using errcode = 'P0001', detail = 'not_eligible';
  end if;
  v_public := 'DMSA-' || to_char(now(), 'YYYY') || '-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
  v_code := lower(substr(md5(random()::text || p_user_id::text || clock_timestamp()::text), 1, 20));
  insert into public.certificates (public_id, verification_code, user_id, requirement_id, recipient_name)
  values (v_public, v_code, p_user_id, r.id, left(trim(p_recipient_name), 80));
  insert into public.audit_logs (actor_id, actor_role, action, target_table, target_id, diff)
  values (p_user_id, 'learner', 'certificate.issued', 'certificates', v_public, jsonb_build_object('requirement', p_requirement_slug));
  return query select v_public, v_code, false;
end;
$$;
revoke execute on function public.issue_certificate(uuid, text, text) from public, anon, authenticated;
grant execute on function public.issue_certificate(uuid, text, text) to service_role;

create or replace function public.revoke_certificate(p_public_id text, p_actor uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.certificates set revoked_at = now(), revoked_reason = p_reason where public_id = p_public_id and revoked_at is null;
  insert into public.audit_logs (actor_id, actor_role, action, target_table, target_id, diff)
  values (p_actor, 'admin', 'certificate.revoked', 'certificates', p_public_id, jsonb_build_object('reason', p_reason));
end;
$$;
revoke execute on function public.revoke_certificate(text, uuid, text) from public, anon, authenticated;
grant execute on function public.revoke_certificate(text, uuid, text) to service_role;

-- 6. Requirement seed (docs/CURRICULUM.md §1) -------------------------------------------
insert into public.certificate_requirements (slug, title, skills, rules, sort_order) values
  ('fundamentos-sql', 'Fundamentos de SQL', array['Bases de datos relacionales','SELECT','Filtros con WHERE','Operadores lógicos','Tratamiento de NULL'],
   '{"sections":["introduccion-bases-de-datos","tablas-filas-columnas-tipos","select","alias-y-expresiones","distinct","where","operadores-comparacion-logicos","null"],"min_quiz_score_percent":80}', 1),
  ('sql-analisis-negocio', 'SQL para Análisis de Negocio', array['Funciones de texto, numéricas y de fecha','CASE','Agregación y GROUP BY','HAVING','Joins'],
   '{"sections":["funciones-de-texto","funciones-numericas","fechas-y-horas","case","ordenar-y-limitar","funciones-de-agregacion","group-by","having","inner-join","left-right-full-join","self-join","joins-multiples-tablas"],"min_quiz_score_percent":80}', 2),
  ('sql-analitico-avanzado', 'SQL Analítico Avanzado', array['Subconsultas y CTE','Operaciones de conjuntos','Agregación condicional','Funciones de ventana','Ranking, acumulados, LAG/LEAD'],
   '{"sections":["subconsultas","cte","operaciones-de-conjuntos","agregacion-condicional","funciones-de-ventana","funciones-de-ranking","totales-acumulados-promedios-moviles","lag-y-lead"],"min_quiz_score_percent":80}', 3),
  ('analista-sql-profesional', 'Analista SQL Profesional', array['Cohortes y funnels','Calidad de datos','Depuración y optimización','Casos de negocio','Entrevistas técnicas'],
   '{"sections":["cohortes-y-retencion","funnels","deduplicacion","calidad-de-datos","depuracion-de-consultas","fundamentos-de-optimizacion","indices-y-planes-de-ejecucion","sql-analitico-avanzado","casos-de-negocio","desafios-de-entrevista","proyectos-finales"],"min_quiz_score_percent":80}', 4)
on conflict (slug) do update set title = excluded.title, skills = excluded.skills, rules = excluded.rules, sort_order = excluded.sort_order;
