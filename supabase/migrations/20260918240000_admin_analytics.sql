-- Phase 8: first-party analytics events, payment reconciliation for unmatched webhooks,
-- and the owner metrics RPC. See docs/ANALYTICS.md and docs/DATABASE_DESIGN.md §4i.
set check_function_bodies = off;

-- 1. Analytics events (server writes only; admins read) ---------------------------------
create table if not exists public.analytics_events (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles (id) on delete set null,
  anonymous_id text,
  name text not null check (name ~ '^[a-z][a-z0-9_]{2,60}$'),
  properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists analytics_events_name_created_idx on public.analytics_events (name, created_at desc);
create index if not exists analytics_events_user_created_idx on public.analytics_events (user_id, created_at desc);

alter table public.analytics_events enable row level security;
revoke all on public.analytics_events from anon, authenticated;
grant select on public.analytics_events to authenticated;
create policy "analytics_events: admin reads" on public.analytics_events for select to authenticated using (public.is_admin());

-- 2. Payment events keep the normalized fields so unmatched events can be reconciled later.
alter table public.payment_events
  add column if not exists payment_ref text,
  add column if not exists status text,
  add column if not exists amount_minor integer,
  add column if not exists currency char(3),
  add column if not exists reconciled_at timestamptz;

create or replace function public.apply_payment_event(
  p_provider text, p_event_id text, p_event_type text, p_payload jsonb, p_signature_valid boolean,
  p_payment_ref text, p_status text, p_amount_minor integer, p_currency char(3), p_user_id uuid, p_price_id uuid
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_inserted boolean;
  v_purchase public.purchases%rowtype;
  v_days integer;
begin
  insert into public.payment_events (provider, provider_event_id, event_type, payload, signature_valid, payment_ref, status, amount_minor, currency)
  values (p_provider, p_event_id, p_event_type, coalesce(p_payload, '{}'::jsonb), p_signature_valid, p_payment_ref, p_status, p_amount_minor, p_currency)
  on conflict (provider, provider_event_id) do nothing;
  get diagnostics v_inserted = row_count;
  if not v_inserted then return 'duplicate'; end if;
  if not p_signature_valid then
    update public.payment_events set processed_at = now(), processing_error = 'invalid signature' where provider = p_provider and provider_event_id = p_event_id;
    return 'invalid_signature';
  end if;

  if p_status = 'approved' then
    if p_user_id is null or p_price_id is null then
      update public.payment_events set processed_at = now(), processing_error = 'unmatched user or price' where provider = p_provider and provider_event_id = p_event_id;
      return 'unmatched';
    end if;
    insert into public.purchases (user_id, price_id, provider, provider_payment_id, status, amount_minor, currency)
    values (p_user_id, p_price_id, p_provider, p_payment_ref, 'approved', coalesce(p_amount_minor, 0), coalesce(p_currency, 'USD'))
    on conflict (provider, provider_payment_id) do update set status = 'approved', updated_at = now()
    returning * into v_purchase;
    if not exists (select 1 from public.entitlements where source = 'purchase' and source_id = v_purchase.id and revoked_at is null) then
      select pr.access_days into v_days from public.prices p join public.products pr on pr.id = p.product_id where p.id = p_price_id;
      perform public.grant_entitlement(p_user_id, 'purchase', v_purchase.id, v_days, null, p_provider || ' payment approved');
    end if;
  elsif p_status in ('refunded', 'chargeback') then
    update public.purchases set status = p_status, updated_at = now()
    where provider = p_provider and provider_payment_id = p_payment_ref
    returning * into v_purchase;
    if v_purchase.id is not null then
      update public.entitlements set revoked_at = now(), revoked_reason = p_status where source = 'purchase' and source_id = v_purchase.id and revoked_at is null;
      if p_status = 'chargeback' then
        insert into public.suspicious_activity (user_id, kind, details) values (v_purchase.user_id, 'chargeback', jsonb_build_object('purchase_id', v_purchase.id, 'provider', p_provider));
      end if;
    end if;
  end if;

  update public.payment_events set processed_at = now() where provider = p_provider and provider_event_id = p_event_id;
  return 'processed';
end;
$$;

-- Admin assigns an unmatched approved event to a learner: purchase + entitlement + audit.
create or replace function public.reconcile_payment_event(p_event_id uuid, p_actor uuid, p_user_id uuid, p_price_id uuid, p_reason text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare e public.payment_events%rowtype; v_purchase public.purchases%rowtype; v_days integer;
begin
  select * into e from public.payment_events where id = p_event_id for update;
  if e.id is null then raise exception 'event not found' using errcode = 'P0002'; end if;
  if e.reconciled_at is not null or e.processing_error is distinct from 'unmatched user or price' or e.status <> 'approved' or not e.signature_valid then
    raise exception 'event not reconcilable' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.profiles where id = p_user_id and deleted_at is null) then
    raise exception 'user not found' using errcode = 'P0002';
  end if;
  insert into public.purchases (user_id, price_id, provider, provider_payment_id, status, amount_minor, currency)
  values (p_user_id, p_price_id, e.provider, coalesce(e.payment_ref, e.provider_event_id), 'approved', coalesce(e.amount_minor, 0), coalesce(e.currency, 'USD'))
  on conflict (provider, provider_payment_id) do update set status = 'approved', user_id = excluded.user_id, updated_at = now()
  returning * into v_purchase;
  if not exists (select 1 from public.entitlements where source = 'purchase' and source_id = v_purchase.id and revoked_at is null) then
    select pr.access_days into v_days from public.prices p join public.products pr on pr.id = p.product_id where p.id = p_price_id;
    perform public.grant_entitlement(p_user_id, 'purchase', v_purchase.id, v_days, p_actor, 'reconciled: ' || left(p_reason, 200));
  end if;
  update public.payment_events set reconciled_at = now(), processing_error = null where id = p_event_id;
  insert into public.audit_logs (actor_id, actor_role, action, target_table, target_id, diff)
  values (p_actor, 'admin', 'payment_event.reconciled', 'payment_events', p_event_id::text,
          jsonb_build_object('user_id', p_user_id, 'price_id', p_price_id, 'purchase_id', v_purchase.id, 'reason', left(p_reason, 200)));
  return v_purchase.id;
end;
$$;
revoke execute on function public.reconcile_payment_event(uuid, uuid, uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.reconcile_payment_event(uuid, uuid, uuid, uuid, text) to service_role;

-- 3. Feature flags and promo codes: admin writes go through RPCs so every change is audited.
create or replace function public.set_feature_flag(p_key text, p_enabled boolean, p_is_public boolean, p_actor uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.feature_flags (key, enabled, is_public, updated_by, updated_at)
  values (p_key, p_enabled, p_is_public, p_actor, now())
  on conflict (key) do update set enabled = excluded.enabled, is_public = excluded.is_public, updated_by = excluded.updated_by, updated_at = now();
  insert into public.audit_logs (actor_id, actor_role, action, target_table, target_id, diff)
  values (p_actor, 'admin', 'feature_flag.set', 'feature_flags', p_key, jsonb_build_object('enabled', p_enabled, 'is_public', p_is_public, 'reason', left(p_reason, 200)));
end;
$$;
revoke execute on function public.set_feature_flag(text, boolean, boolean, uuid, text) from public, anon, authenticated;
grant execute on function public.set_feature_flag(text, boolean, boolean, uuid, text) to service_role;

create or replace function public.create_promo_code(
  p_code text, p_kind text, p_access_days integer, p_discount_percent integer, p_max_redemptions integer, p_expires_at timestamptz, p_note text, p_actor uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_id uuid;
begin
  insert into public.promo_codes (code, kind, access_days, discount_percent, max_redemptions, expires_at, note, created_by)
  values (p_code, p_kind, p_access_days, p_discount_percent, p_max_redemptions, p_expires_at, left(p_note, 300), p_actor)
  returning id into v_id;
  insert into public.audit_logs (actor_id, actor_role, action, target_table, target_id, diff)
  values (p_actor, 'admin', 'promo_code.created', 'promo_codes', v_id::text,
          jsonb_build_object('kind', p_kind, 'access_days', p_access_days, 'discount_percent', p_discount_percent, 'max_redemptions', p_max_redemptions));
  return v_id;
end;
$$;
revoke execute on function public.create_promo_code(text, text, integer, integer, integer, timestamptz, text, uuid) from public, anon, authenticated;
grant execute on function public.create_promo_code(text, text, integer, integer, integer, timestamptz, text, uuid) to service_role;

create or replace function public.set_promo_code_active(p_id uuid, p_active boolean, p_actor uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.promo_codes set is_active = p_active where id = p_id;
  insert into public.audit_logs (actor_id, actor_role, action, target_table, target_id, diff)
  values (p_actor, 'admin', case when p_active then 'promo_code.activated' else 'promo_code.deactivated' end, 'promo_codes', p_id::text, '{}'::jsonb);
end;
$$;
revoke execute on function public.set_promo_code_active(uuid, boolean, uuid) from public, anon, authenticated;
grant execute on function public.set_promo_code_active(uuid, boolean, uuid) to service_role;

-- 4. Owner metrics (service role). One JSON document; cheap enough for a few admins.
-- p_free_limit mirrors limits.freeExerciseLimit (the free allowance is start-based, D-01).
create or replace function public.admin_metrics(p_free_limit integer)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with
  learners as (select id, created_at, onboarding_completed_at from public.profiles where deleted_at is null and role = 'learner'),
  started as (select distinct user_id from public.exercise_progress),
  completed as (select distinct user_id from public.exercise_progress where status = 'completed'),
  entitled as (select distinct user_id from public.entitlements where revoked_at is null and (ends_at is null or ends_at > now())),
  free_used as (
    select p.user_id from public.exercise_progress p
    group by p.user_id having count(*) >= p_free_limit
  ),
  active as (select user_id, activity_date from public.daily_activity),
  cohort as (
    select l.id, l.created_at::date as d0,
      exists (select 1 from active a where a.user_id = l.id and a.activity_date = l.created_at::date + 1) as d1,
      exists (select 1 from active a where a.user_id = l.id and a.activity_date between l.created_at::date + 5 and l.created_at::date + 9) as d7,
      exists (select 1 from active a where a.user_id = l.id and a.activity_date between l.created_at::date + 25 and l.created_at::date + 35) as d30
    from learners l
  ),
  hardest as (
    select e.slug, count(a.id) as attempts,
      count(distinct a.user_id) filter (where a.status = 'correct') as solvers,
      count(distinct a.user_id) as attempters
    from public.attempts a join public.exercises e on e.id = a.exercise_id
    group by e.slug having count(a.id) >= 5
    order by (count(a.id)::numeric / greatest(count(distinct a.user_id) filter (where a.status = 'correct'), 1)) desc
    limit 5
  ),
  sqlstates as (
    select f ->> 'sqlstate' as sqlstate, count(*) as n
    from public.attempts a, jsonb_array_elements(a.feedback) f
    where a.status = 'error' and f ? 'sqlstate'
    group by 1 order by 2 desc limit 5
  ),
  sections as (
    select s.number, s.slug, count(sp.user_id) as completions
    from public.sections s left join public.section_progress sp on sp.section_id = s.id
    where s.is_published group by s.id order by s.number
  )
  select jsonb_build_object(
    'generated_at', now(),
    'signups', jsonb_build_object(
      'total', (select count(*) from learners),
      'last_7d', (select count(*) from learners where created_at > now() - interval '7 days'),
      'last_30d', (select count(*) from learners where created_at > now() - interval '30 days'),
      'onboarded', (select count(*) from learners where onboarding_completed_at is not null)
    ),
    'learning', jsonb_build_object(
      'started_exercise', (select count(*) from started),
      'completed_exercise', (select count(*) from completed),
      'free_limit_reached', (select count(*) from free_used f where not exists (select 1 from entitled e where e.user_id = f.user_id)),
      'sections_completed', (select count(*) from public.section_progress),
      'certificates_issued', (select count(*) from public.certificates where revoked_at is null),
      'quiz_pass_rate', (select coalesce(round(100.0 * count(*) filter (where passed) / nullif(count(*), 0)), 0) from public.quiz_attempts)
    ),
    'engagement', jsonb_build_object(
      'wau', (select count(distinct user_id) from active where activity_date > current_date - 7),
      'mau', (select count(distinct user_id) from active where activity_date > current_date - 30),
      'retention_d1', (select coalesce(round(100.0 * count(*) filter (where d1) / nullif(count(*) filter (where d0 <= current_date - 1), 0)), 0) from cohort),
      'retention_d7', (select coalesce(round(100.0 * count(*) filter (where d7) / nullif(count(*) filter (where d0 <= current_date - 9), 0)), 0) from cohort),
      'retention_d30', (select coalesce(round(100.0 * count(*) filter (where d30) / nullif(count(*) filter (where d0 <= current_date - 35), 0)), 0) from cohort)
    ),
    'monetization', jsonb_build_object(
      'entitled', (select count(*) from entitled),
      'purchases_pending', (select count(*) from public.purchases where status = 'pending'),
      'purchases_approved', (select count(*) from public.purchases where status = 'approved'),
      'refunds', (select count(*) from public.purchases where status in ('refunded', 'chargeback')),
      'revenue', (select coalesce(jsonb_object_agg(currency, total), '{}'::jsonb) from (select currency, sum(amount_minor) as total from public.purchases where status = 'approved' group by currency) r),
      'unmatched_events', (select count(*) from public.payment_events where processing_error = 'unmatched user or price' and reconciled_at is null),
      'promo_redemptions', (select count(*) from public.promo_redemptions)
    ),
    'hardest_exercises', (select coalesce(jsonb_agg(jsonb_build_object('slug', slug, 'attempts', attempts, 'solvers', solvers, 'attempters', attempters)), '[]'::jsonb) from hardest),
    'frequent_sqlstates', (select coalesce(jsonb_agg(jsonb_build_object('sqlstate', sqlstate, 'count', n)), '[]'::jsonb) from sqlstates),
    'sections', (select coalesce(jsonb_agg(jsonb_build_object('number', number, 'slug', slug, 'completions', completions) order by number), '[]'::jsonb) from sections)
  );
$$;
revoke execute on function public.admin_metrics(integer) from public, anon, authenticated;
grant execute on function public.admin_metrics(integer) to service_role;

-- 5. Admin user lookup (alias or email) without exposing auth.users to the client.
create or replace function public.admin_find_user(p_query text)
returns table (id uuid, alias text, display_name text, email text, role text, country text, created_at timestamptz, onboarding_completed_at timestamptz, deleted_at timestamptz)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p.id, p.alias::text, p.display_name, u.email::text, p.role, p.country, p.created_at, p.onboarding_completed_at, p.deleted_at
  from public.profiles p join auth.users u on u.id = p.id
  where p.alias = p_query::extensions.citext or lower(u.email) = lower(p_query) or p.id::text = p_query
  limit 5;
$$;
revoke execute on function public.admin_find_user(text) from public, anon, authenticated;
grant execute on function public.admin_find_user(text) to service_role;
