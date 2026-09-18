-- Migration: 20260918190000_curriculum.sql
-- Purpose: curriculum content tables (courses, sections, lessons, datasets, exercises, hints,
--          solutions, expected results, theory questions, options), learner progress on lessons,
--          public views without secrets, RLS. Content is written by the seed pipeline (service role).
-- Design ref: docs/DATABASE_DESIGN.md §2 Curriculum
-- Destructive: no
set check_function_bodies = off;

-- 1. Courses / sections / lessons ---------------------------------------------------
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null,
  sort_order integer not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger courses_set_updated_at before update on public.courses for each row execute function public.set_updated_at();

create table if not exists public.sections (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  slug text not null unique,
  number integer not null,
  level text not null check (level in ('beginner','intermediate','advanced','expert')),
  title text not null,
  summary text not null,
  objectives jsonb not null default '[]'::jsonb,
  requires_section_id uuid references public.sections (id) on delete set null,
  is_free_theory boolean not null default false,
  is_published boolean not null default false,
  certificate_slug text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_id, number)
);
create trigger sections_set_updated_at before update on public.sections for each row execute function public.set_updated_at();
create index if not exists sections_course_number_idx on public.sections (course_id, number);

create table if not exists public.datasets (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  version integer not null default 1,
  title text not null,
  domain text not null,
  description text not null,
  snapshot_path text,
  snapshot_sha256 text,
  row_counts jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger datasets_set_updated_at before update on public.datasets for each row execute function public.set_updated_at();

create table if not exists public.dataset_tables (
  id uuid primary key default gen_random_uuid(),
  dataset_id uuid not null references public.datasets (id) on delete cascade,
  name text not null,
  description text not null,
  sort_order integer not null default 0,
  unique (dataset_id, name)
);

create table if not exists public.dataset_columns (
  id uuid primary key default gen_random_uuid(),
  table_id uuid not null references public.dataset_tables (id) on delete cascade,
  name text not null,
  data_type text not null,
  description text not null,
  is_pk boolean not null default false,
  fk_ref text,
  sort_order integer not null default 0,
  unique (table_id, name)
);

create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.sections (id) on delete cascade,
  slug text not null unique,
  kind text not null check (kind in ('theory','exercise','quiz','challenge')),
  title text not null,
  sort_order integer not null default 0,
  estimated_minutes integer not null default 5,
  body_md text,
  ref_slug text,
  dataset_id uuid references public.datasets (id) on delete set null,
  is_free boolean not null default false,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger lessons_set_updated_at before update on public.lessons for each row execute function public.set_updated_at();
create index if not exists lessons_section_order_idx on public.lessons (section_id, sort_order);

create table if not exists public.lesson_prerequisites (
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  requires_lesson_id uuid not null references public.lessons (id) on delete cascade,
  primary key (lesson_id, requires_lesson_id),
  check (lesson_id <> requires_lesson_id)
);

-- 2. Exercises ----------------------------------------------------------------------
create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid unique references public.lessons (id) on delete set null,
  section_id uuid not null references public.sections (id) on delete cascade,
  slug text not null unique,
  title text not null,
  scenario_md text not null,
  business_question_md text not null,
  learning_objective text not null,
  difficulty text not null check (difficulty in ('very_easy','easy','intermediate','advanced','expert')),
  estimated_minutes integer not null default 5,
  concepts text[] not null default '{}',
  tables_used text[] not null default '{}',
  dataset_id uuid not null references public.datasets (id) on delete restrict,
  dataset_version integer not null default 1,
  theory_ref_slug text,
  allowed_statements text[] not null default '{select}',
  expected_columns jsonb not null default '[]'::jsonb,
  validation_rules jsonb not null default '{}'::jsonb,
  common_mistakes jsonb not null default '[]'::jsonb,
  expert_explanation_md text not null,
  improvement_feedback jsonb not null default '[]'::jsonb,
  reward_config jsonb not null default '{}'::jsonb,
  solution_unlock jsonb not null default '{}'::jsonb,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger exercises_set_updated_at before update on public.exercises for each row execute function public.set_updated_at();
create index if not exists exercises_section_idx on public.exercises (section_id);

create table if not exists public.exercise_prerequisites (
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  requires_exercise_id uuid not null references public.exercises (id) on delete cascade,
  primary key (exercise_id, requires_exercise_id)
);

create table if not exists public.exercise_solutions (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  sql text not null,
  is_reference boolean not null default false,
  approach_label text,
  sort_order integer not null default 0
);
create index if not exists exercise_solutions_exercise_idx on public.exercise_solutions (exercise_id);

create table if not exists public.exercise_expected_results (
  exercise_id uuid primary key references public.exercises (id) on delete cascade,
  dataset_version integer not null,
  columns jsonb not null,
  rows jsonb not null,
  row_count integer not null,
  computed_at timestamptz not null default now()
);

create table if not exists public.exercise_hints (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  level integer not null check (level between 1 and 3),
  body_md text not null,
  coin_cost integer not null default 0,
  xp_penalty_percent integer not null default 10,
  unique (exercise_id, level)
);

-- 3. Theory questions ---------------------------------------------------------------
create table if not exists public.theory_questions (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.sections (id) on delete cascade,
  lesson_id uuid references public.lessons (id) on delete set null,
  slug text not null unique,
  type text not null check (type in ('single','multiple','true_false','fill_blank','query_interpretation','error_diagnosis','matching','scenario')),
  difficulty text not null check (difficulty in ('very_easy','easy','intermediate','advanced','expert')),
  topic text not null,
  prompt_md text not null,
  code_md text,
  explanation_md text not null,
  answer jsonb,
  pairs jsonb,
  tags text[] not null default '{}',
  estimated_seconds integer not null default 45,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger theory_questions_set_updated_at before update on public.theory_questions for each row execute function public.set_updated_at();
create index if not exists theory_questions_section_idx on public.theory_questions (section_id);

create table if not exists public.question_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.theory_questions (id) on delete cascade,
  key text not null,
  body_md text not null,
  is_correct boolean not null default false,
  why_incorrect_md text,
  sort_order integer not null default 0,
  unique (question_id, key)
);

-- 4. Lesson progress (learner-owned) -------------------------------------------------
create table if not exists public.lesson_progress (
  user_id uuid not null references public.profiles (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  status text not null default 'in_progress' check (status in ('in_progress','completed')),
  completed_at timestamptz,
  last_viewed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);
create index if not exists lesson_progress_user_idx on public.lesson_progress (user_id, last_viewed_at desc);

-- 5. RLS -----------------------------------------------------------------------------
-- Content tables: public read of published rows; writes only via service role/admin.
do $$
declare t text;
begin
  foreach t in array array['courses','sections','datasets','dataset_tables','dataset_columns','lessons','lesson_prerequisites',
                           'exercises','exercise_prerequisites','exercise_solutions','exercise_expected_results','exercise_hints',
                           'theory_questions','question_options','lesson_progress']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;

grant select on public.courses, public.sections, public.datasets, public.dataset_tables, public.dataset_columns,
                public.lesson_prerequisites, public.exercise_prerequisites to anon, authenticated;
-- Column-level grants keep secrets out of reach even through direct PostgREST access
-- (a column revoke does not subtract from a table-level grant, so we never grant the table).
grant select (id, section_id, slug, kind, title, sort_order, estimated_minutes, ref_slug, dataset_id, is_free, is_published, created_at)
  on public.lessons to anon, authenticated;
grant select (id, lesson_id, section_id, slug, title, scenario_md, business_question_md, learning_objective, difficulty,
              estimated_minutes, concepts, tables_used, dataset_id, dataset_version, theory_ref_slug, allowed_statements,
              expected_columns, is_published, created_at)
  on public.exercises to anon, authenticated;
grant select (id, section_id, lesson_id, slug, type, difficulty, topic, prompt_md, code_md, pairs, tags, estimated_seconds, is_published)
  on public.theory_questions to anon, authenticated;
grant select (id, question_id, key, body_md, sort_order)
  on public.question_options to anon, authenticated;
grant select, insert, update on public.lesson_progress to authenticated;

create policy "courses: published readable" on public.courses for select to anon, authenticated using (is_published or public.is_admin());
create policy "sections: published readable" on public.sections for select to anon, authenticated using (true);
comment on policy "sections: published readable" on public.sections is 'All sections are visible as outlines on the learning path; is_published gates starting them.';
create policy "datasets: active readable" on public.datasets for select to anon, authenticated using (is_active or public.is_admin());
create policy "dataset_tables: readable" on public.dataset_tables for select to anon, authenticated using (true);
create policy "dataset_columns: readable" on public.dataset_columns for select to anon, authenticated using (true);
-- Lesson bodies are filtered by the view below; the base table stays readable for metadata only via the view.
create policy "lessons: published readable" on public.lessons for select to anon, authenticated using (is_published or public.is_admin());
create policy "lesson_prerequisites: readable" on public.lesson_prerequisites for select to anon, authenticated using (true);
create policy "exercises: published readable" on public.exercises for select to anon, authenticated using (is_published or public.is_admin());
create policy "exercise_prerequisites: readable" on public.exercise_prerequisites for select to anon, authenticated using (true);
create policy "theory_questions: published readable" on public.theory_questions for select to anon, authenticated using (is_published or public.is_admin());
create policy "question_options: readable" on public.question_options for select to anon, authenticated using (true);
-- exercise_solutions, exercise_expected_results, exercise_hints: no learner policies (service/admin via server only).
create policy "exercise_solutions: admin reads" on public.exercise_solutions for select to authenticated using (public.is_admin());
create policy "exercise_hints: admin reads" on public.exercise_hints for select to authenticated using (public.is_admin());
create policy "exercise_expected_results: admin reads" on public.exercise_expected_results for select to authenticated using (public.is_admin());

create policy "lesson_progress: owner reads" on public.lesson_progress for select to authenticated using (user_id = (select auth.uid()));
create policy "lesson_progress: owner inserts" on public.lesson_progress for insert to authenticated with check (user_id = (select auth.uid()));
create policy "lesson_progress: owner updates" on public.lesson_progress for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "lesson_progress: admin reads" on public.lesson_progress for select to authenticated using (public.is_admin());

-- 6. Public views (explicit columns, invoker rights) ---------------------------------
-- Definer view (documented exception): learners have no column privilege on lessons.body_md,
-- so the view reads it as owner and exposes it only for free, published lessons. Premium bodies
-- are served by the server after an entitlement check.
create or replace view public.lessons_public with (security_invoker = false) as
  select l.id, l.section_id, l.slug, l.kind, l.title, l.sort_order, l.estimated_minutes, l.ref_slug, l.dataset_id, l.is_free, l.is_published,
         case when l.is_free then l.body_md else null end as body_md_free
  from public.lessons l
  where l.is_published;
grant select on public.lessons_public to anon, authenticated;

create or replace view public.questions_public with (security_invoker = true) as
  select q.id, q.section_id, q.lesson_id, q.slug, q.type, q.difficulty, q.topic, q.prompt_md, q.code_md, q.pairs, q.tags, q.estimated_seconds
  from public.theory_questions q where q.is_published;
grant select on public.questions_public to anon, authenticated;

create or replace view public.question_options_public with (security_invoker = true) as
  select o.id, o.question_id, o.key, o.body_md, o.sort_order
  from public.question_options o;
grant select on public.question_options_public to anon, authenticated;

create or replace view public.exercises_public with (security_invoker = true) as
  select e.id, e.lesson_id, e.section_id, e.slug, e.title, e.scenario_md, e.business_question_md, e.learning_objective,
         e.difficulty, e.estimated_minutes, e.concepts, e.tables_used, e.dataset_id, e.dataset_version, e.theory_ref_slug,
         e.allowed_statements, e.expected_columns, e.is_published
  from public.exercises e;
grant select on public.exercises_public to anon, authenticated;

-- 7. Lesson progress RPC (idempotent) -----------------------------------------------
create or replace function public.mark_lesson_viewed(p_lesson_slug text, p_completed boolean default false)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  uid uuid := auth.uid();
  v_lesson_id uuid;
begin
  if uid is null then raise exception 'authentication required' using errcode = '42501'; end if;
  select id into v_lesson_id from public.lessons where slug = p_lesson_slug and is_published;
  if v_lesson_id is null then raise exception 'lesson not found' using errcode = 'P0002'; end if;

  insert into public.lesson_progress (user_id, lesson_id, status, completed_at, last_viewed_at)
  values (uid, v_lesson_id, case when p_completed then 'completed' else 'in_progress' end, case when p_completed then now() end, now())
  on conflict (user_id, lesson_id) do update set
    last_viewed_at = now(),
    status = case when public.lesson_progress.status = 'completed' or excluded.status = 'completed' then 'completed' else 'in_progress' end,
    completed_at = coalesce(public.lesson_progress.completed_at, excluded.completed_at);
end;
$$;
revoke execute on function public.mark_lesson_viewed(text, boolean) from public, anon;
grant execute on function public.mark_lesson_viewed(text, boolean) to authenticated, service_role;
