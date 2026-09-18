-- Migration: 20260918180000_onboarding.sql
-- Purpose: onboarding RPC, profile settings RPC, privacy requests (export/deletion),
--          custom access token hook (adds `user_role` claim), alias blocklist seed.
-- Destructive: no
set check_function_bodies = off;

-- 1. Consent versions live in config; the RPC records what the client accepted. -------
create or replace function public.complete_onboarding(payload jsonb)
returns public.profiles
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  uid uuid := auth.uid();
  v_alias text := lower(trim(payload ->> 'alias'));
  v_profile public.profiles;
begin
  if uid is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if not public.check_alias_available(v_alias) then
    raise exception 'alias not available' using errcode = 'P0001', detail = 'alias_unavailable';
  end if;

  if not exists (select 1 from public.avatars a where a.id = (payload ->> 'avatar_id')::uuid and a.is_active) then
    raise exception 'invalid avatar' using errcode = 'P0001', detail = 'avatar_invalid';
  end if;

  if coalesce((payload ->> 'accept_terms')::boolean, false) is not true
     or coalesce((payload ->> 'accept_privacy')::boolean, false) is not true then
    raise exception 'consent required' using errcode = 'P0001', detail = 'consent_required';
  end if;

  update public.profiles p set
    display_name = left(trim(payload ->> 'display_name'), 60),
    alias = v_alias,
    avatar_id = (payload ->> 'avatar_id')::uuid,
    country = upper(payload ->> 'country'),
    birth_date = (payload ->> 'birth_date')::date,
    gender = nullif(payload ->> 'gender', ''),
    sql_level = payload ->> 'sql_level',
    main_goal = payload ->> 'main_goal',
    weekly_goal_minutes = (payload ->> 'weekly_goal_minutes')::integer,
    timezone = coalesce(nullif(payload ->> 'timezone', ''), p.timezone),
    certificate_name = coalesce(nullif(trim(payload ->> 'certificate_name'), ''), left(trim(payload ->> 'display_name'), 80)),
    terms_accepted_at = now(),
    terms_version = payload ->> 'terms_version',
    privacy_accepted_at = now(),
    privacy_version = payload ->> 'privacy_version',
    onboarding_completed_at = coalesce(p.onboarding_completed_at, now())
  where p.id = uid and p.deleted_at is null
  returning * into v_profile;

  if v_profile.id is null then
    raise exception 'profile not found' using errcode = 'P0002';
  end if;

  insert into public.audit_logs (actor_id, actor_role, action, target_table, target_id)
  values (uid, 'learner', 'onboarding.completed', 'profiles', uid::text);

  return v_profile;
end;
$$;
revoke execute on function public.complete_onboarding(jsonb) from public, anon;
grant execute on function public.complete_onboarding(jsonb) to authenticated, service_role;

-- 2. Privacy requests --------------------------------------------------------------
create table if not exists public.data_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (type in ('export', 'deletion')),
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'cancelled')),
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  file_path text,
  note text
);
create index if not exists data_requests_user_idx on public.data_requests (user_id, requested_at desc);
create unique index if not exists data_requests_one_pending_idx
  on public.data_requests (user_id, type) where status in ('pending', 'processing');

alter table public.data_requests enable row level security;
revoke all on public.data_requests from anon, authenticated;
grant select, insert on public.data_requests to authenticated;
grant update on public.data_requests to authenticated;

create policy "data_requests: owner reads own"
  on public.data_requests for select to authenticated
  using (user_id = (select auth.uid()));

create policy "data_requests: owner creates own"
  on public.data_requests for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'pending' and file_path is null);

create policy "data_requests: owner cancels own pending"
  on public.data_requests for update to authenticated
  using (user_id = (select auth.uid()) and status = 'pending')
  with check (user_id = (select auth.uid()) and status in ('pending', 'cancelled'));

create policy "data_requests: admin manages"
  on public.data_requests for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- 3. Custom access token hook: adds `user_role` so RLS can check admin without a subquery.
-- Enabled in supabase/config.toml [auth.hook.custom_access_token] and in the dashboard for cloud.
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
set search_path = public, pg_temp
as $$
declare
  claims jsonb := coalesce(event -> 'claims', '{}'::jsonb);
  v_role text;
begin
  select role into v_role from public.profiles where id = (event ->> 'user_id')::uuid;
  claims := jsonb_set(claims, '{user_role}', to_jsonb(coalesce(v_role, 'learner')));
  return jsonb_set(event, '{claims}', claims);
end;
$$;
grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook(jsonb) from authenticated, anon, public;
grant select on public.profiles to supabase_auth_admin;
create policy "profiles: auth admin reads role for token hook"
  on public.profiles for select to supabase_auth_admin
  using (true);

-- 4. Alias blocklist seed (normalized regex fragments) ------------------------------
insert into public.alias_blocklist (pattern, reason) values
  ('^admin', 'impersonation'),
  ('^root$', 'impersonation'),
  ('^soporte', 'impersonation'),
  ('^support', 'impersonation'),
  ('dataminds', 'brand'),
  ('marcelo', 'founder'),
  ('pisner', 'founder'),
  ('^moderador', 'impersonation'),
  ('^staff', 'impersonation'),
  ('^oficial', 'impersonation'),
  ('nazi', 'hate'),
  ('hitler', 'hate'),
  ('puto', 'slur'),
  ('puta', 'slur'),
  ('pendejo', 'slur'),
  ('mierda', 'profanity'),
  ('verga', 'profanity'),
  ('concha', 'profanity'),
  ('nigga', 'slur'),
  ('nigger', 'slur'),
  ('maricon', 'slur'),
  ('retrasad', 'slur')
on conflict (pattern) do nothing;
