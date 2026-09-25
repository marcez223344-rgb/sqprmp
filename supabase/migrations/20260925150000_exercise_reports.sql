-- Migration: 20260925150000_exercise_reports.sql
-- Purpose (D-42, round 6 item 14): private per-exercise problem reports. A learner sends a
--   category, a note and the SQL that was in the editor; only admins read them, in /admin/reportes.
--   Public comments were rejected (moderation load, spam, empty threads), so nothing here is ever
--   readable by another learner.
-- Design ref: docs/DATABASE_DESIGN.md §2 Learning activity, §4 matrix, §4p.
-- Destructive: no.
set check_function_bodies = off;

-- 1. Table ------------------------------------------------------------------------------------
create table if not exists public.exercise_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- `set null` so re-seeding or retiring an exercise never erases what learners reported about it;
  -- the slug stays as the human-readable reference.
  exercise_id uuid references public.exercises (id) on delete set null,
  exercise_slug text not null check (char_length(exercise_slug) between 1 and 120),
  category text not null
    check (category in ('confusing_statement', 'marked_wrong', 'data_error', 'other')),
  -- Bounds mirror `limits.exerciseReport` in src/config/limits.ts (the server truncates the SQL).
  note text not null check (char_length(note) between 10 and 1000),
  learner_sql text check (learner_sql is null or char_length(learner_sql) <= 8192),
  status text not null default 'open' check (status in ('open', 'resolved')),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles (id) on delete set null,
  resolution_note text check (resolution_note is null or char_length(resolution_note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint exercise_reports_resolved_consistent
    check ((status = 'resolved') = (resolved_at is not null))
);
comment on table public.exercise_reports is
  'Private learner reports about an exercise (D-42). Learner inserts/reads own; admins read all and resolve through admin_resolve_exercise_report.';

create trigger exercise_reports_set_updated_at before update on public.exercise_reports
  for each row execute function public.set_updated_at();

-- The slug is derived from the id, never taken from the client, and a new report always starts
-- open: the column grants below already keep learners away from status/resolved_*, this makes the
-- invariant hold for every writer.
create or replace function public.exercise_reports_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.exercise_id is null then
    raise exception 'exercise required' using errcode = '23502';
  end if;
  select e.slug into new.exercise_slug from public.exercises e where e.id = new.exercise_id;
  if new.exercise_slug is null then
    raise exception 'exercise not found' using errcode = 'P0002';
  end if;
  new.status := 'open';
  new.resolved_at := null;
  new.resolved_by := null;
  new.resolution_note := null;
  new.created_at := now();
  return new;
end;
$$;
revoke execute on function public.exercise_reports_before_insert() from public, anon, authenticated;

create trigger exercise_reports_before_insert before insert on public.exercise_reports
  for each row execute function public.exercise_reports_before_insert();

-- 2. Row Level Security -----------------------------------------------------------------------
alter table public.exercise_reports enable row level security;

revoke all on public.exercise_reports from anon, authenticated;
grant select on public.exercise_reports to authenticated;
-- Column-level: a learner can only supply the content of the report. `exercise_slug` is listed
-- because the column is NOT NULL without a default (so the generated Insert type requires it), but
-- the before-insert trigger overwrites whatever is sent with the slug of `exercise_id`.
grant insert (user_id, exercise_id, exercise_slug, category, note, learner_sql)
  on public.exercise_reports to authenticated;
grant update (status, resolved_at, resolved_by, resolution_note)
  on public.exercise_reports to authenticated;

create policy "exercise_reports: owner inserts own"
  on public.exercise_reports for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "exercise_reports: owner reads own"
  on public.exercise_reports for select to authenticated
  using (user_id = (select auth.uid()));

create policy "exercise_reports: admin reads all"
  on public.exercise_reports for select to authenticated
  using (public.is_admin());

create policy "exercise_reports: admin updates all"
  on public.exercise_reports for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- 3. Indexes ----------------------------------------------------------------------------------
create index if not exists exercise_reports_user_created_idx
  on public.exercise_reports (user_id, created_at desc);
-- The admin list: open first, newest first.
create index if not exists exercise_reports_status_created_idx
  on public.exercise_reports (status, created_at desc);
create index if not exists exercise_reports_exercise_idx
  on public.exercise_reports (exercise_id);

-- 4. Resolve (admin, audited) -----------------------------------------------------------------
create or replace function public.admin_resolve_exercise_report(
  p_report_id uuid,
  p_actor uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_report public.exercise_reports%rowtype;
begin
  if auth.uid() is not null and not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  update public.exercise_reports
     set status = 'resolved',
         resolved_at = now(),
         resolved_by = p_actor,
         resolution_note = nullif(left(btrim(coalesce(p_reason, '')), 500), '')
   where id = p_report_id and status = 'open'
  returning * into v_report;
  if v_report.id is null then
    raise exception 'report not found or already resolved' using errcode = 'P0002';
  end if;
  insert into public.audit_logs (actor_id, actor_role, action, target_table, target_id, diff)
  values (p_actor, 'admin', 'exercise_report.resolved', 'exercise_reports', v_report.id::text,
          jsonb_build_object('exercise_slug', v_report.exercise_slug,
                             'category', v_report.category,
                             'reporter_id', v_report.user_id,
                             'reason', left(coalesce(p_reason, ''), 200)));
end;
$$;
revoke execute on function public.admin_resolve_exercise_report(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.admin_resolve_exercise_report(uuid, uuid, text) to service_role;
