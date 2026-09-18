-- Migration: 20260918170000_foundation.sql
-- Purpose: shared helpers, identity tables (profiles, avatars), feature flags, audit log,
--          alias moderation, rate limiting. RLS enabled on every table (docs/DATABASE_DESIGN.md).
-- Destructive: no

-- Functions reference tables created later in this file; bodies are validated at call time.
set check_function_bodies = off;

-- 0. Extensions ------------------------------------------------------------
create extension if not exists citext with schema extensions;
create extension if not exists pgcrypto with schema extensions;

-- 1. Helpers ---------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Admin check reads the JWT claim `user_role` (set by the custom access token hook, Phase 2)
-- and falls back to the profile row so it works before the hook is enabled.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'user_role' = 'admin',
    false
  )
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin' and p.deleted_at is null
  );
$$;
revoke execute on function public.is_admin() from public;
-- anon needs it too: content policies call is_admin() for public reads (it just returns false).
grant execute on function public.is_admin() to anon, authenticated, service_role;

-- Normalizes an alias for uniqueness: lowercase, trims, folds common confusables.
create or replace function public.normalize_alias(input text)
returns text
language sql
immutable
set search_path = public, pg_temp
as $$
  select translate(lower(trim(input)), '0134578', 'oieastb');
$$;

-- 2. Avatars (curated set) -------------------------------------------------
create table if not exists public.avatars (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,40}$'),
  image_path text not null,
  alt_text text not null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
comment on table public.avatars is 'Curated, inclusive avatar illustrations (D-14). No uploads in MVP.';

alter table public.avatars enable row level security;
revoke all on public.avatars from anon, authenticated;
grant select on public.avatars to anon, authenticated;

create policy "avatars: anyone reads active"
  on public.avatars for select to anon, authenticated
  using (is_active);

create policy "avatars: admin reads all"
  on public.avatars for select to authenticated
  using (public.is_admin());

-- 3. Profiles --------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (display_name is null or char_length(display_name) between 1 and 60),
  alias extensions.citext unique check (alias is null or alias::text ~ '^[a-z0-9_]{3,20}$'),
  alias_normalized text unique,
  avatar_id uuid references public.avatars (id) on delete set null,
  country char(2) check (country is null or country ~ '^[A-Z]{2}$'),
  birth_date date check (birth_date is null or birth_date <= current_date - interval '18 years'),
  gender text check (gender is null or gender in ('female','male','non_binary','other','prefer_not_to_say')),
  sql_level text check (sql_level is null or sql_level in ('none','beginner','intermediate','advanced')),
  main_goal text check (main_goal is null or main_goal in ('first_job','improve','career_change','business','interviews','advanced_practice')),
  weekly_goal_minutes integer check (weekly_goal_minutes is null or weekly_goal_minutes between 30 and 1200),
  certificate_name text check (certificate_name is null or char_length(certificate_name) between 1 and 80),
  timezone text not null default 'America/Argentina/Buenos_Aires',
  role text not null default 'learner' check (role in ('learner','admin')),
  terms_accepted_at timestamptz,
  terms_version text,
  privacy_accepted_at timestamptz,
  privacy_version text,
  onboarding_completed_at timestamptz,
  leaderboard_opt_in boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.profiles is 'Learner profile; PII minimized (docs/SECURITY.md §7).';

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create index if not exists profiles_role_idx on public.profiles (role) where role = 'admin';

alter table public.profiles enable row level security;
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
-- Learners may update only non-privileged columns (enforced by the trigger below + column grants).
grant update (display_name, alias, avatar_id, country, birth_date, gender, sql_level, main_goal,
              weekly_goal_minutes, certificate_name, timezone, leaderboard_opt_in)
  on public.profiles to authenticated;

create policy "profiles: owner reads own"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()) and deleted_at is null);

create policy "profiles: owner updates own"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()) and deleted_at is null)
  with check (id = (select auth.uid()));

create policy "profiles: admin reads all"
  on public.profiles for select to authenticated
  using (public.is_admin());

create policy "profiles: admin updates all"
  on public.profiles for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Keep alias_normalized in sync and immutable privileged columns for non-admins.
create or replace function public.profiles_before_write()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  new.alias_normalized = case when new.alias is null then null else public.normalize_alias(new.alias::text) end;
  -- Direct learner writes run as 'authenticated'; RPCs (security definer) run as their owner.
  if tg_op = 'UPDATE' and current_user = 'authenticated' and not public.is_admin() then
    -- Learners cannot escalate or tamper with consent/onboarding timestamps directly.
    new.role = old.role;
    new.deleted_at = old.deleted_at;
    new.terms_accepted_at = old.terms_accepted_at;
    new.terms_version = old.terms_version;
    new.privacy_accepted_at = old.privacy_accepted_at;
    new.privacy_version = old.privacy_version;
    new.onboarding_completed_at = old.onboarding_completed_at;
  end if;
  return new;
end;
$$;

create trigger profiles_before_write before insert or update on public.profiles
  for each row execute function public.profiles_before_write();

-- Create a profile row for every new auth user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, nullif(left(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''), 60), ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Public projection for leaderboards/community. Intentionally a definer view (exception to the
-- security_invoker rule): it exposes only alias + avatar of learners who opted in, and anon has
-- no policy on profiles, so an invoker view would always be empty.
create or replace view public.public_profiles
with (security_invoker = false) as
  select p.id, p.alias, a.image_path as avatar_path
  from public.profiles p
  left join public.avatars a on a.id = p.avatar_id
  where p.leaderboard_opt_in and p.deleted_at is null and p.alias is not null;
revoke all on public.public_profiles from anon, authenticated;
grant select on public.public_profiles to anon, authenticated;

-- 4. Alias moderation ------------------------------------------------------
create table if not exists public.alias_blocklist (
  id uuid primary key default gen_random_uuid(),
  pattern text not null unique,
  reason text not null,
  created_at timestamptz not null default now()
);
alter table public.alias_blocklist enable row level security;
revoke all on public.alias_blocklist from anon, authenticated;
grant select, insert, update, delete on public.alias_blocklist to authenticated;

create policy "alias_blocklist: admin only"
  on public.alias_blocklist for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Availability check usable by the onboarding form (rate-limited by the server).
create or replace function public.check_alias_available(candidate text)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  normalized text := public.normalize_alias(candidate);
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if candidate !~ '^[a-z0-9_]{3,20}$' then
    return false;
  end if;
  if exists (select 1 from public.alias_blocklist b where normalized ~ b.pattern) then
    return false;
  end if;
  return not exists (
    select 1 from public.profiles p
    where p.alias_normalized = normalized and p.id <> auth.uid()
  );
end;
$$;
revoke execute on function public.check_alias_available(text) from public, anon;
grant execute on function public.check_alias_available(text) to authenticated, service_role;

-- 5. Feature flags ---------------------------------------------------------
create table if not exists public.feature_flags (
  key text primary key check (key ~ '^[a-z][a-zA-Z0-9_]{1,60}$'),
  enabled boolean not null default false,
  is_public boolean not null default false,
  payload jsonb not null default '{}'::jsonb,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);
alter table public.feature_flags enable row level security;
revoke all on public.feature_flags from anon, authenticated;
grant select on public.feature_flags to anon, authenticated;
grant insert, update, delete on public.feature_flags to authenticated;

create policy "feature_flags: public flags readable"
  on public.feature_flags for select to anon, authenticated
  using (is_public);

create policy "feature_flags: admin manages"
  on public.feature_flags for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- 6. Audit log (service writes; admins read) -------------------------------
create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid,
  actor_role text not null check (actor_role in ('learner','admin','service','system')),
  action text not null,
  target_table text,
  target_id text,
  diff jsonb,
  ip_hash text,
  created_at timestamptz not null default now()
);
create index if not exists audit_logs_created_at_idx on public.audit_logs (created_at desc);
create index if not exists audit_logs_target_idx on public.audit_logs (target_table, target_id);

alter table public.audit_logs enable row level security;
revoke all on public.audit_logs from anon, authenticated;
grant select on public.audit_logs to authenticated;

create policy "audit_logs: admin reads"
  on public.audit_logs for select to authenticated
  using (public.is_admin());

-- 7. Rate limiting (token bucket; RPC only) --------------------------------
create table if not exists public.rate_limits (
  key text primary key,
  tokens double precision not null,
  refilled_at timestamptz not null default now()
);
alter table public.rate_limits enable row level security;
revoke all on public.rate_limits from anon, authenticated;
-- No policies: only security definer functions and the service role touch this table.

create or replace function public.consume_rate_limit(
  p_key text,
  p_capacity double precision,
  p_refill_per_second double precision,
  p_cost double precision default 1
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  r public.rate_limits%rowtype;
  now_ts timestamptz := clock_timestamp();
  new_tokens double precision;
begin
  insert into public.rate_limits (key, tokens, refilled_at)
  values (p_key, p_capacity, now_ts)
  on conflict (key) do nothing;

  select * into r from public.rate_limits where key = p_key for update;
  new_tokens := least(p_capacity, r.tokens + extract(epoch from (now_ts - r.refilled_at)) * p_refill_per_second);

  if new_tokens < p_cost then
    update public.rate_limits set tokens = new_tokens, refilled_at = now_ts where key = p_key;
    return false;
  end if;

  update public.rate_limits set tokens = new_tokens - p_cost, refilled_at = now_ts where key = p_key;
  return true;
end;
$$;
revoke execute on function public.consume_rate_limit(text, double precision, double precision, double precision) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, double precision, double precision, double precision) to service_role;
