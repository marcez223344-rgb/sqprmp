-- Migration: 20260918220000_commerce.sql
-- Purpose: products, prices, purchases, subscriptions (modeled), entitlements, promo codes,
--          payment events (idempotent), manual-transfer purchase flow and admin grants.
-- Design ref: docs/DATABASE_DESIGN.md §2 Commerce; docs/PAYMENTS.md §3–5 (D-05, D-06)
-- Destructive: no
set check_function_bodies = off;

-- 1. Catalog ------------------------------------------------------------------------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  kind text not null check (kind in ('lifetime','subscription','promo')),
  title text not null,
  description text not null,
  access_days integer,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger products_set_updated_at before update on public.products for each row execute function public.set_updated_at();

create table if not exists public.prices (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  provider text not null check (provider in ('manual','hotmart','mercadopago','stripe')),
  provider_price_ref text,
  currency char(3) not null,
  amount_minor integer not null check (amount_minor >= 0),
  country char(2),
  interval text not null default 'one_time' check (interval in ('one_time','month','year')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (product_id, provider, currency, country)
);

-- 2. Purchases / subscriptions / entitlements ----------------------------------------
create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete restrict,
  price_id uuid not null references public.prices (id) on delete restrict,
  provider text not null check (provider in ('manual','hotmart','mercadopago','stripe')),
  provider_payment_id text,
  reference_code text unique,
  channel text,
  status text not null default 'pending' check (status in ('pending','approved','rejected','refunded','chargeback','cancelled')),
  amount_minor integer not null,
  currency char(3) not null,
  note text,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_payment_id)
);
create trigger purchases_set_updated_at before update on public.purchases for each row execute function public.set_updated_at();
create index if not exists purchases_user_idx on public.purchases (user_id, created_at desc);
create index if not exists purchases_pending_idx on public.purchases (status) where status = 'pending';

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete restrict,
  price_id uuid not null references public.prices (id) on delete restrict,
  provider text not null,
  provider_subscription_id text unique,
  status text not null check (status in ('active','past_due','cancelled','expired')),
  current_period_end timestamptz,
  cancel_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger subscriptions_set_updated_at before update on public.subscriptions for each row execute function public.set_updated_at();

create table if not exists public.entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  source text not null check (source in ('purchase','subscription','promo','admin')),
  source_id uuid,
  scope text not null default 'full_course',
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  revoked_at timestamptz,
  revoked_reason text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists entitlements_active_idx on public.entitlements (user_id) where revoked_at is null;

create table if not exists public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  code extensions.citext not null unique,
  kind text not null check (kind in ('scholarship','discount')),
  access_days integer,
  discount_percent integer check (discount_percent is null or discount_percent between 1 and 100),
  max_redemptions integer,
  redemptions_count integer not null default 0,
  expires_at timestamptz,
  is_active boolean not null default true,
  note text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.promo_redemptions (
  id uuid primary key default gen_random_uuid(),
  promo_code_id uuid not null references public.promo_codes (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (promo_code_id, user_id)
);

create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  signature_valid boolean not null default false,
  processed_at timestamptz,
  processing_error text,
  received_at timestamptz not null default now(),
  unique (provider, provider_event_id)
);

-- 3. RLS ----------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['products','prices','purchases','subscriptions','entitlements','promo_codes','promo_redemptions','payment_events'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;
grant select on public.products, public.prices to anon, authenticated;
grant select on public.purchases, public.subscriptions, public.entitlements, public.promo_redemptions to authenticated;

create policy "products: active readable" on public.products for select to anon, authenticated using (is_active or public.is_admin());
create policy "prices: active readable" on public.prices for select to anon, authenticated using (is_active or public.is_admin());
create policy "purchases: owner reads" on public.purchases for select to authenticated using (user_id = (select auth.uid()));
create policy "purchases: admin reads" on public.purchases for select to authenticated using (public.is_admin());
create policy "subscriptions: owner reads" on public.subscriptions for select to authenticated using (user_id = (select auth.uid()));
create policy "entitlements: owner reads" on public.entitlements for select to authenticated using (user_id = (select auth.uid()));
create policy "entitlements: admin reads" on public.entitlements for select to authenticated using (public.is_admin());
create policy "promo_redemptions: owner reads" on public.promo_redemptions for select to authenticated using (user_id = (select auth.uid()));
-- promo_codes and payment_events: no learner policies; server/admin RPCs only.
create policy "promo_codes: admin reads" on public.promo_codes for select to authenticated using (public.is_admin());
grant select on public.promo_codes to authenticated;
create policy "payment_events: admin reads" on public.payment_events for select to authenticated using (public.is_admin());
grant select on public.payment_events to authenticated;

-- 4. Entitlement helpers ------------------------------------------------------------
-- Replaces the Phase 4 fallback: the entitlements table now exists.
create or replace function public.has_active_entitlement(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (select 1 from public.profiles where id = p_user_id and role = 'admin')
      or exists (
        select 1 from public.entitlements e
        where e.user_id = p_user_id and e.revoked_at is null and (e.ends_at is null or e.ends_at > now())
      );
$$;

create or replace function public.grant_entitlement(
  p_user_id uuid, p_source text, p_source_id uuid, p_access_days integer, p_created_by uuid, p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_id uuid;
begin
  insert into public.entitlements (user_id, source, source_id, ends_at, created_by)
  values (p_user_id, p_source, p_source_id, case when p_access_days is null then null else now() + make_interval(days => p_access_days) end, p_created_by)
  returning id into v_id;
  insert into public.audit_logs (actor_id, actor_role, action, target_table, target_id, diff)
  values (p_created_by, case when p_created_by is null then 'service' else 'admin' end, 'entitlement.granted', 'entitlements', v_id::text,
          jsonb_build_object('user_id', p_user_id, 'source', p_source, 'source_id', p_source_id, 'access_days', p_access_days, 'reason', p_reason));
  return v_id;
end;
$$;
revoke execute on function public.grant_entitlement(uuid, text, uuid, integer, uuid, text) from public, anon, authenticated;
grant execute on function public.grant_entitlement(uuid, text, uuid, integer, uuid, text) to service_role;

create or replace function public.revoke_entitlement(p_entitlement_id uuid, p_actor uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.entitlements set revoked_at = now(), revoked_reason = p_reason where id = p_entitlement_id and revoked_at is null;
  insert into public.audit_logs (actor_id, actor_role, action, target_table, target_id, diff)
  values (p_actor, case when p_actor is null then 'service' else 'admin' end, 'entitlement.revoked', 'entitlements', p_entitlement_id::text, jsonb_build_object('reason', p_reason));
end;
$$;
revoke execute on function public.revoke_entitlement(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.revoke_entitlement(uuid, uuid, text) to service_role;

-- 5. Manual transfer purchases -------------------------------------------------------
-- Learner creates a pending purchase with a human-readable reference; admin approves/rejects.
create or replace function public.create_manual_purchase(p_price_id uuid, p_channel text)
returns table (purchase_id uuid, reference_code text, amount_minor integer, currency char(3))
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  uid uuid := auth.uid();
  v_price public.prices%rowtype;
  v_ref text;
  v_id uuid;
begin
  if uid is null then raise exception 'authentication required' using errcode = '42501'; end if;
  select * into v_price from public.prices where id = p_price_id and is_active and provider = 'manual';
  if v_price.id is null then raise exception 'price not found' using errcode = 'P0002'; end if;
  if public.has_active_entitlement(uid) then raise exception 'already entitled' using errcode = 'P0001', detail = 'already_entitled'; end if;
  if exists (select 1 from public.purchases where user_id = uid and status = 'pending') then
    raise exception 'pending purchase exists' using errcode = 'P0001', detail = 'pending_exists';
  end if;
  v_ref := 'DM-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
  insert into public.purchases (user_id, price_id, provider, reference_code, channel, status, amount_minor, currency)
  values (uid, p_price_id, 'manual', v_ref, p_channel, 'pending', v_price.amount_minor, v_price.currency)
  returning id into v_id;
  return query select v_id, v_ref, v_price.amount_minor, v_price.currency;
end;
$$;
revoke execute on function public.create_manual_purchase(uuid, text) from public, anon;
grant execute on function public.create_manual_purchase(uuid, text) to authenticated, service_role;

create or replace function public.cancel_manual_purchase(p_purchase_id uuid)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  update public.purchases set status = 'cancelled' where id = p_purchase_id and user_id = auth.uid() and status = 'pending' and provider = 'manual';
$$;
revoke execute on function public.cancel_manual_purchase(uuid) from public, anon;
grant execute on function public.cancel_manual_purchase(uuid) to authenticated, service_role;

-- Admin decision on a pending manual purchase (service role; the server verifies the admin).
create or replace function public.review_manual_purchase(p_purchase_id uuid, p_actor uuid, p_approve boolean, p_note text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v public.purchases%rowtype; v_days integer;
begin
  select * into v from public.purchases where id = p_purchase_id and status = 'pending' for update;
  if v.id is null then raise exception 'purchase not pending' using errcode = 'P0002'; end if;
  update public.purchases set status = case when p_approve then 'approved' else 'rejected' end, note = p_note, reviewed_by = p_actor, reviewed_at = now()
  where id = p_purchase_id;
  if p_approve then
    select pr.access_days into v_days from public.prices p join public.products pr on pr.id = p.product_id where p.id = v.price_id;
    perform public.grant_entitlement(v.user_id, 'purchase', v.id, v_days, p_actor, 'manual purchase approved');
  end if;
  insert into public.audit_logs (actor_id, actor_role, action, target_table, target_id, diff)
  values (p_actor, 'admin', case when p_approve then 'purchase.approved' else 'purchase.rejected' end, 'purchases', p_purchase_id::text, jsonb_build_object('note', p_note));
end;
$$;
revoke execute on function public.review_manual_purchase(uuid, uuid, boolean, text) from public, anon, authenticated;
grant execute on function public.review_manual_purchase(uuid, uuid, boolean, text) to service_role;

-- 6. Provider webhooks: idempotent apply ------------------------------------------------
-- Stores the event once; on 'approved' creates the purchase + entitlement in this transaction.
-- Refund/chargeback revoke the entitlement linked to the purchase.
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
  insert into public.payment_events (provider, provider_event_id, event_type, payload, signature_valid)
  values (p_provider, p_event_id, p_event_type, coalesce(p_payload, '{}'::jsonb), p_signature_valid)
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
revoke execute on function public.apply_payment_event(text, text, text, jsonb, boolean, text, text, integer, char, uuid, uuid) from public, anon, authenticated;
grant execute on function public.apply_payment_event(text, text, text, jsonb, boolean, text, text, integer, char, uuid, uuid) to service_role;

-- 7. Promo codes ----------------------------------------------------------------------
create or replace function public.redeem_promo(p_code text)
returns table (kind text, access_days integer, discount_percent integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare uid uuid := auth.uid(); v public.promo_codes%rowtype;
begin
  if uid is null then raise exception 'authentication required' using errcode = '42501'; end if;
  select * into v from public.promo_codes where code = p_code and is_active for update;
  if v.id is null then raise exception 'invalid code' using errcode = 'P0001', detail = 'promo_invalid'; end if;
  if v.expires_at is not null and v.expires_at < now() then raise exception 'expired' using errcode = 'P0001', detail = 'promo_expired'; end if;
  if v.max_redemptions is not null and v.redemptions_count >= v.max_redemptions then raise exception 'exhausted' using errcode = 'P0001', detail = 'promo_exhausted'; end if;
  if exists (select 1 from public.promo_redemptions r where r.promo_code_id = v.id and r.user_id = uid) then raise exception 'already redeemed' using errcode = 'P0001', detail = 'promo_used'; end if;
  insert into public.promo_redemptions (promo_code_id, user_id) values (v.id, uid);
  update public.promo_codes set redemptions_count = redemptions_count + 1 where id = v.id;
  if v.kind = 'scholarship' then
    perform public.grant_entitlement(uid, 'promo', v.id, v.access_days, null, 'scholarship code ' || v.code);
  end if;
  insert into public.audit_logs (actor_id, actor_role, action, target_table, target_id, diff)
  values (uid, 'learner', 'promo.redeemed', 'promo_codes', v.id::text, jsonb_build_object('kind', v.kind));
  return query select v.kind, v.access_days, v.discount_percent;
end;
$$;
revoke execute on function public.redeem_promo(text) from public, anon;
grant execute on function public.redeem_promo(text) to authenticated, service_role;

-- 8. Buyer matching for webhooks (service role only) -----------------------------------
create or replace function public.user_id_by_email(p_email text)
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select u.id from auth.users u where lower(u.email) = lower(p_email) limit 1;
$$;
revoke execute on function public.user_id_by_email(text) from public, anon, authenticated;
grant execute on function public.user_id_by_email(text) to service_role;
