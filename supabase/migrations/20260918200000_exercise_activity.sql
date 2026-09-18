-- Migration: 20260918200000_exercise_activity.sql
-- Purpose: learner exercise activity — attempts, query executions, exercise progress, hint usage,
--          solution reveals, saved queries — and the RPCs that enforce free limit, hint/solution
--          unlock rules and idempotent completion. Rewards ledger arrives in Phase 5.
-- Design ref: docs/DATABASE_DESIGN.md §2 Learning activity
-- Destructive: no
set check_function_bodies = off;

-- 1. Tables ---------------------------------------------------------------------------
create table if not exists public.exercise_progress (
  user_id uuid not null references public.profiles (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  status text not null default 'in_progress' check (status in ('in_progress','completed')),
  started_at timestamptz not null default now(),
  first_completed_at timestamptz,
  attempts_count integer not null default 0,
  genuine_attempts_count integer not null default 0,
  hints_used integer not null default 0 check (hints_used between 0 and 3),
  solution_revealed_at timestamptz,
  best_attempt_id uuid,
  draft_sql text check (draft_sql is null or char_length(draft_sql) <= 8192),
  draft_saved_at timestamptz,
  last_activity_at timestamptz not null default now(),
  primary key (user_id, exercise_id)
);
create index if not exists exercise_progress_user_status_idx on public.exercise_progress (user_id, status);

create table if not exists public.attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  sql text not null check (char_length(sql) <= 8192),
  status text not null check (status in ('error','incorrect','correct')),
  feedback jsonb not null default '[]'::jsonb,
  execution_ms integer,
  row_count integer,
  is_genuine boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists attempts_user_exercise_idx on public.attempts (user_id, exercise_id, created_at desc);

create table if not exists public.query_executions (
  id bigint generated always as identity primary key,
  attempt_id uuid references public.attempts (id) on delete set null,
  user_id uuid references public.profiles (id) on delete set null,
  dataset_slug text not null,
  engine text not null check (engine in ('server','browser_fallback')),
  sql_sha256 text not null,
  sql_length integer not null,
  duration_ms integer,
  status text not null check (status in ('ok','error','timeout','gate')),
  sqlstate text,
  created_at timestamptz not null default now()
);
create index if not exists query_executions_created_idx on public.query_executions (created_at desc);

create table if not exists public.hint_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  hint_level integer not null check (hint_level between 1 and 3),
  created_at timestamptz not null default now(),
  unique (user_id, exercise_id, hint_level)
);

create table if not exists public.solution_reveals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  reason text not null check (reason in ('attempts','hints','time','explicit')),
  created_at timestamptz not null default now(),
  unique (user_id, exercise_id)
);

create table if not exists public.saved_queries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  exercise_id uuid references public.exercises (id) on delete set null,
  dataset_slug text not null,
  title text not null check (char_length(title) between 1 and 120),
  sql text not null check (char_length(sql) <= 8192),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger saved_queries_set_updated_at before update on public.saved_queries for each row execute function public.set_updated_at();
create index if not exists saved_queries_user_idx on public.saved_queries (user_id, updated_at desc);

-- 2. RLS --------------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['exercise_progress','attempts','query_executions','hint_usage','solution_reveals','saved_queries'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;

grant select on public.exercise_progress, public.attempts, public.hint_usage, public.solution_reveals to authenticated;
grant select, insert, update, delete on public.saved_queries to authenticated;

create policy "exercise_progress: owner reads" on public.exercise_progress for select to authenticated using (user_id = (select auth.uid()));
create policy "exercise_progress: admin reads" on public.exercise_progress for select to authenticated using (public.is_admin());
create policy "attempts: owner reads" on public.attempts for select to authenticated using (user_id = (select auth.uid()));
create policy "attempts: admin reads" on public.attempts for select to authenticated using (public.is_admin());
create policy "hint_usage: owner reads" on public.hint_usage for select to authenticated using (user_id = (select auth.uid()));
create policy "solution_reveals: owner reads" on public.solution_reveals for select to authenticated using (user_id = (select auth.uid()));
create policy "query_executions: admin reads" on public.query_executions for select to authenticated using (public.is_admin());
create policy "saved_queries: owner all" on public.saved_queries for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
grant select on public.query_executions to authenticated;

-- 3. Helpers ----------------------------------------------------------------------------
-- An exercise is gated when its lesson is not free.
create or replace function public.exercise_is_gated(p_exercise_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select not coalesce((select l.is_free from public.exercises e join public.lessons l on l.id = e.lesson_id where e.id = p_exercise_id), false);
$$;
revoke execute on function public.exercise_is_gated(uuid) from public, anon;
grant execute on function public.exercise_is_gated(uuid) to authenticated, service_role;

-- Distinct gated exercises the learner has started (opening an exercise reveals it and enables
-- running queries, so starting is what consumes the free allowance; D-01).
create or replace function public.free_exercises_used(p_user_id uuid)
returns integer
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select count(*)::int
  from public.exercise_progress p
  where p.user_id = p_user_id and public.exercise_is_gated(p.exercise_id);
$$;
revoke execute on function public.free_exercises_used(uuid) from public, anon;
grant execute on function public.free_exercises_used(uuid) to authenticated, service_role;

create or replace function public.has_active_entitlement(p_user_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  -- The entitlements table arrives in Phase 6; until then only admins have premium access.
  if to_regclass('public.entitlements') is null then
    return exists (select 1 from public.profiles where id = p_user_id and role = 'admin');
  end if;
  return exists (select 1 from public.profiles where id = p_user_id and role = 'admin')
      or exists (
        select 1 from public.entitlements e
        where e.user_id = p_user_id and e.revoked_at is null and (e.ends_at is null or e.ends_at > now())
      );
end;
$$;
revoke execute on function public.has_active_entitlement(uuid) from public, anon;
grant execute on function public.has_active_entitlement(uuid) to authenticated, service_role;

-- Whether the learner may work on this exercise: free, entitled, already started, or within the free limit.
create or replace function public.can_access_exercise(p_user_id uuid, p_exercise_id uuid, p_free_limit integer)
returns text
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare v_gated boolean := public.exercise_is_gated(p_exercise_id);
begin
  if not exists (select 1 from public.exercises where id = p_exercise_id and is_published) then return 'unavailable'; end if;
  if not v_gated then return 'ok'; end if;
  if public.has_active_entitlement(p_user_id) then return 'ok'; end if;
  -- Already counted toward the limit (started or completed): keep access so learners can finish.
  if exists (select 1 from public.exercise_progress where user_id = p_user_id and exercise_id = p_exercise_id) then return 'ok'; end if;
  if public.free_exercises_used(p_user_id) < p_free_limit then return 'ok'; end if;
  return 'locked';
end;
$$;
revoke execute on function public.can_access_exercise(uuid, uuid, integer) from public, anon;
grant execute on function public.can_access_exercise(uuid, uuid, integer) to authenticated, service_role;

-- 4. Activity RPCs (service role only: the server has already authorized and validated) ----
create or replace function public.start_exercise(p_user_id uuid, p_exercise_id uuid)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  insert into public.exercise_progress (user_id, exercise_id)
  values (p_user_id, p_exercise_id)
  on conflict (user_id, exercise_id) do update set last_activity_at = now();
$$;
revoke execute on function public.start_exercise(uuid, uuid) from public, anon, authenticated;
grant execute on function public.start_exercise(uuid, uuid) to service_role;

create or replace function public.save_exercise_draft(p_exercise_id uuid, p_sql text)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  insert into public.exercise_progress (user_id, exercise_id, draft_sql, draft_saved_at)
  values (auth.uid(), p_exercise_id, p_sql, now())
  on conflict (user_id, exercise_id) do update set draft_sql = excluded.draft_sql, draft_saved_at = now(), last_activity_at = now();
$$;
revoke execute on function public.save_exercise_draft(uuid, text) from public, anon;
grant execute on function public.save_exercise_draft(uuid, text) to authenticated, service_role;

-- Records an attempt and updates progress. Returns whether this attempt is the first completion
-- (the caller awards rewards exactly once based on that flag; Phase 5 wires the ledger).
create or replace function public.record_attempt(
  p_user_id uuid, p_exercise_id uuid, p_sql text, p_status text, p_feedback jsonb,
  p_execution_ms integer, p_row_count integer, p_is_genuine boolean
)
returns table (attempt_id uuid, first_completion boolean, attempts_count integer, genuine_attempts_count integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_attempt_id uuid;
  v_first boolean := false;
  v_prog public.exercise_progress%rowtype;
begin
  insert into public.attempts (user_id, exercise_id, sql, status, feedback, execution_ms, row_count, is_genuine)
  values (p_user_id, p_exercise_id, p_sql, p_status, coalesce(p_feedback, '[]'::jsonb), p_execution_ms, p_row_count, p_is_genuine)
  returning id into v_attempt_id;

  insert into public.exercise_progress (user_id, exercise_id) values (p_user_id, p_exercise_id)
  on conflict (user_id, exercise_id) do nothing;

  select * into v_prog from public.exercise_progress where user_id = p_user_id and exercise_id = p_exercise_id for update;
  if p_status = 'correct' and v_prog.status <> 'completed' then v_first := true; end if;

  update public.exercise_progress set
    attempts_count = attempts_count + 1,
    genuine_attempts_count = genuine_attempts_count + (case when p_is_genuine then 1 else 0 end),
    status = case when p_status = 'correct' then 'completed' else status end,
    first_completed_at = case when v_first then now() else first_completed_at end,
    best_attempt_id = case when p_status = 'correct' and best_attempt_id is null then v_attempt_id else best_attempt_id end,
    last_activity_at = now()
  where user_id = p_user_id and exercise_id = p_exercise_id
  returning * into v_prog;

  return query select v_attempt_id, v_first, v_prog.attempts_count, v_prog.genuine_attempts_count;
end;
$$;
revoke execute on function public.record_attempt(uuid, uuid, text, text, jsonb, integer, integer, boolean) from public, anon, authenticated;
grant execute on function public.record_attempt(uuid, uuid, text, text, jsonb, integer, integer, boolean) to service_role;

-- Hints unlock sequentially (level n requires n-1). Returns the hint body.
create or replace function public.unlock_hint(p_user_id uuid, p_exercise_id uuid, p_level integer)
returns table (body_md text, coin_cost integer, xp_penalty_percent integer, hints_used integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_used integer;
begin
  insert into public.exercise_progress (user_id, exercise_id) values (p_user_id, p_exercise_id)
  on conflict (user_id, exercise_id) do nothing;
  select ep.hints_used into v_used from public.exercise_progress ep where ep.user_id = p_user_id and ep.exercise_id = p_exercise_id for update;
  if p_level > v_used + 1 then
    raise exception 'hint level % requires previous hints', p_level using errcode = 'P0001', detail = 'hint_sequence';
  end if;
  if p_level = v_used + 1 then
    insert into public.hint_usage (user_id, exercise_id, hint_level) values (p_user_id, p_exercise_id, p_level) on conflict do nothing;
    update public.exercise_progress set hints_used = p_level, last_activity_at = now() where user_id = p_user_id and exercise_id = p_exercise_id;
    v_used := p_level;
  end if;
  return query
    select h.body_md, h.coin_cost, h.xp_penalty_percent, v_used
    from public.exercise_hints h where h.exercise_id = p_exercise_id and h.level = p_level;
end;
$$;
revoke execute on function public.unlock_hint(uuid, uuid, integer) from public, anon, authenticated;
grant execute on function public.unlock_hint(uuid, uuid, integer) to service_role;

-- Solution reveal: the server verifies unlock conditions; this records it idempotently.
create or replace function public.reveal_solution(p_user_id uuid, p_exercise_id uuid, p_reason text)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  insert into public.solution_reveals (user_id, exercise_id, reason) values (p_user_id, p_exercise_id, p_reason) on conflict do nothing;
  insert into public.exercise_progress (user_id, exercise_id, solution_revealed_at) values (p_user_id, p_exercise_id, now())
  on conflict (user_id, exercise_id) do update set solution_revealed_at = coalesce(public.exercise_progress.solution_revealed_at, now()), last_activity_at = now();
$$;
revoke execute on function public.reveal_solution(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.reveal_solution(uuid, uuid, text) to service_role;

create or replace function public.log_query_execution(
  p_user_id uuid, p_attempt_id uuid, p_dataset_slug text, p_engine text, p_sql_sha256 text, p_sql_length integer,
  p_duration_ms integer, p_status text, p_sqlstate text
)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  insert into public.query_executions (user_id, attempt_id, dataset_slug, engine, sql_sha256, sql_length, duration_ms, status, sqlstate)
  values (p_user_id, p_attempt_id, p_dataset_slug, p_engine, p_sql_sha256, p_sql_length, p_duration_ms, p_status, p_sqlstate);
$$;
revoke execute on function public.log_query_execution(uuid, uuid, text, text, text, integer, integer, text, text) from public, anon, authenticated;
grant execute on function public.log_query_execution(uuid, uuid, text, text, text, integer, integer, text, text) to service_role;
