-- Migration: <YYYYMMDDHHMMSS>_<snake_description>.sql
-- Purpose: <one line>
-- Design ref: docs/DATABASE_DESIGN.md §<n>
-- Destructive: no  (if yes: expand/contract plan + owner approval reference)

-- 1. Tables ---------------------------------------------------------------
create table if not exists public.<table> (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- columns with check constraints
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.<table> is '<purpose>';

create trigger set_updated_at before update on public.<table>
  for each row execute function public.set_updated_at();

-- 2. Row Level Security (mandatory, same migration) -----------------------
alter table public.<table> enable row level security;

revoke all on public.<table> from anon, authenticated;
grant select on public.<table> to authenticated;          -- adjust per RLS matrix

create policy "<table>: learner reads own rows"
  on public.<table> for select to authenticated
  using (user_id = (select auth.uid()));

create policy "<table>: admin reads all"
  on public.<table> for select to authenticated
  using (public.is_admin());

-- 3. Indexes --------------------------------------------------------------
create index if not exists <table>_user_id_created_at_idx on public.<table> (user_id, created_at desc);

-- 4. Functions (server-called) -------------------------------------------
create or replace function public.<fn_name>(<args>)
returns <type>
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- validate auth.uid() or require service role; idempotency keys; raise with sqlstate
  return ...;
end;
$$;
revoke execute on function public.<fn_name>(<argtypes>) from public, anon;
grant execute on function public.<fn_name>(<argtypes>) to authenticated; -- or service_role only

-- 5. Tests: supabase/tests/<name>.test.sql (anon denied, cross-user denied, admin ok)
