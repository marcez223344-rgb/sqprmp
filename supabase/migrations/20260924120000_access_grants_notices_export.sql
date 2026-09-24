-- Migration: 20260924120000_access_grants_notices_export.sql
-- Purpose (owner feedback 2026-09-24, items 1, 17, 19, 21, 22, 23):
--   1. `entitlements.acknowledged_at` so the app can tell a learner, once, that access is live.
--   2. `admin_grant_access`: the admin states whether money changed hands. A courtesy grant (beca)
--      and a confirmed bank transfer are different facts and must not land in the same bucket —
--      before this, every admin grant was `source = 'admin'`, which the directory and the metrics
--      report as "otorgado", so a real transfer never appeared as revenue.
--   3. `admin_search_learners`: alias/display-name picker for the admin forms. Never returns email.
--   4. `admin_audit`: one generic, service-role-only audit writer for admin actions that do not
--      already have their own RPC (today: the users CSV export).
--   5. `admin_user_directory` accepts a larger page so the export can read the filtered set in one
--      call; the columns it returns are unchanged (no email, no birth date).
-- Design ref: docs/PAYMENTS.md §7, docs/SECURITY.md §6-7, docs/DATABASE_DESIGN.md §2 Commerce.
-- Destructive: no. New table: none, so no new RLS policy — the existing `entitlements` policies
--   (owner reads, admin reads; writes only through security-definer RPCs) govern the new column.
set check_function_bodies = off;

-- 1. Access notice ---------------------------------------------------------------------------
alter table public.entitlements add column if not exists acknowledged_at timestamptz;
comment on column public.entitlements.acknowledged_at is
  'When the learner dismissed the in-app "your access is active" notice. Null = not dismissed yet.';

-- The learner has no update policy on entitlements (and must not get one: that table decides
-- access). Acknowledging is therefore a definer function scoped to the caller's own rows.
create or replace function public.acknowledge_entitlements()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare uid uuid := auth.uid(); v_count integer;
begin
  if uid is null then raise exception 'authentication required' using errcode = '42501'; end if;
  update public.entitlements
     set acknowledged_at = now()
   where user_id = uid and acknowledged_at is null and revoked_at is null;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
revoke execute on function public.acknowledge_entitlements() from public, anon;
grant execute on function public.acknowledge_entitlements() to authenticated, service_role;

-- 2. Admin grant: courtesy vs confirmed payment -----------------------------------------------
-- p_kind = 'comp'    : no money changed hands (beca, cortesia, test account) -> source 'admin'.
-- p_kind = 'payment' : the owner received the money outside the app (bank transfer) -> an
--                      approved `purchases` row plus an entitlement with source 'purchase', so the
--                      revenue aggregates and the "pagado" class in the directory are truthful.
-- When the learner already opened a pending manual purchase, that row is approved instead of a
-- second one being created: one payment, one reference code, one entitlement.
create or replace function public.admin_grant_access(
  p_user_id uuid,
  p_kind text,
  p_access_days integer,
  p_actor uuid,
  p_reason text,
  p_price_id uuid default null,
  p_amount_minor integer default null,
  p_currency char(3) default null,
  p_reference text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_price public.prices%rowtype;
  v_days integer := p_access_days;
  v_pending public.purchases%rowtype;
  v_purchase public.purchases%rowtype;
  v_ref text;
  v_entitlement uuid;
begin
  if p_kind not in ('comp', 'payment') then
    raise exception 'unknown grant kind' using errcode = '22023';
  end if;
  if not exists (select 1 from public.profiles where id = p_user_id and deleted_at is null) then
    raise exception 'user not found' using errcode = 'P0002';
  end if;

  if p_kind = 'comp' then
    v_entitlement := public.grant_entitlement(
      p_user_id, 'admin', null, v_days, p_actor, coalesce(p_reason, 'courtesy access'));
    insert into public.audit_logs (actor_id, actor_role, action, target_table, target_id, diff)
    values (p_actor, 'admin', 'access.comp_granted', 'entitlements', v_entitlement::text,
            jsonb_build_object('user_id', p_user_id, 'access_days', v_days,
                               'reason', left(coalesce(p_reason, ''), 200)));
    return v_entitlement;
  end if;

  -- 'payment': a price row is what says how much was actually owed.
  if p_price_id is not null then
    select * into v_price from public.prices where id = p_price_id;
  else
    select p.* into v_price
      from public.prices p join public.products pr on pr.id = p.product_id
     where p.is_active and pr.is_active and p.provider = 'manual'
     order by p.created_at
     limit 1;
  end if;
  if v_price.id is null then raise exception 'price not found' using errcode = 'P0002'; end if;
  if v_days is null then
    select pr.access_days into v_days from public.products pr where pr.id = v_price.product_id;
  end if;

  select * into v_pending
    from public.purchases
   where user_id = p_user_id and status = 'pending' and provider = 'manual'
   order by created_at
   limit 1
   for update;

  if v_pending.id is not null then
    perform public.review_manual_purchase(
      v_pending.id, p_actor, true, coalesce(p_reason, 'transfer confirmed'));
    select id into v_entitlement
      from public.entitlements
     where source = 'purchase' and source_id = v_pending.id and revoked_at is null
     order by created_at desc limit 1;
    insert into public.audit_logs (actor_id, actor_role, action, target_table, target_id, diff)
    values (p_actor, 'admin', 'access.payment_recorded', 'purchases', v_pending.id::text,
            jsonb_build_object('user_id', p_user_id, 'matched_pending', true,
                               'reference', v_pending.reference_code,
                               'reason', left(coalesce(p_reason, ''), 200)));
    return v_entitlement;
  end if;

  v_ref := coalesce(nullif(btrim(coalesce(p_reference, '')), ''),
                    'TR-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6)));
  insert into public.purchases (user_id, price_id, provider, provider_payment_id, reference_code,
                                channel, status, amount_minor, currency, note,
                                reviewed_by, reviewed_at)
  values (p_user_id, v_price.id, 'manual', 'admin:' || v_ref, v_ref,
          'bank_transfer', 'approved',
          coalesce(p_amount_minor, v_price.amount_minor),
          coalesce(p_currency, v_price.currency),
          left(coalesce(p_reason, ''), 500), p_actor, now())
  on conflict (provider, provider_payment_id) do update
    set status = 'approved', reviewed_by = excluded.reviewed_by,
        reviewed_at = now(), updated_at = now()
  returning * into v_purchase;

  select id into v_entitlement
    from public.entitlements
   where source = 'purchase' and source_id = v_purchase.id and revoked_at is null
   order by created_at desc limit 1;
  if v_entitlement is null then
    v_entitlement := public.grant_entitlement(
      p_user_id, 'purchase', v_purchase.id, v_days, p_actor,
      coalesce(p_reason, 'transfer confirmed by admin'));
  end if;

  insert into public.audit_logs (actor_id, actor_role, action, target_table, target_id, diff)
  values (p_actor, 'admin', 'access.payment_recorded', 'purchases', v_purchase.id::text,
          jsonb_build_object('user_id', p_user_id, 'matched_pending', false,
                             'reference', v_ref, 'amount_minor', v_purchase.amount_minor,
                             'currency', v_purchase.currency,
                             'reason', left(coalesce(p_reason, ''), 200)));
  return v_entitlement;
end;
$$;
revoke execute on function public.admin_grant_access(uuid, text, integer, uuid, text, uuid, integer, char, text)
  from public, anon, authenticated;
grant execute on function public.admin_grant_access(uuid, text, integer, uuid, text, uuid, integer, char, text)
  to service_role;

-- 3. Learner picker --------------------------------------------------------------------------
-- Alias and display name only: the admin forms never need an email, so none is returned. The
-- caller escapes the ILIKE metacharacters; p_query is bound, never interpolated.
create or replace function public.admin_search_learners(p_query text, p_limit integer default 8)
returns table (id uuid, alias text, display_name text, entitlement text, is_deleted boolean)
language plpgsql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_term text := nullif(btrim(coalesce(p_query, '')), '');
  v_limit integer := least(greatest(coalesce(p_limit, 8), 1), 20);
begin
  if auth.uid() is not null and not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  if v_term is null then return; end if;
  return query
    select p.id,
           p.alias::text,
           p.display_name,
           case
             when p.role = 'admin' then 'admin'
             when coalesce(e.best, 0) >= 4 then 'paid'
             when e.best = 3 then 'promo'
             when e.best = 2 then 'granted'
             else 'free'
           end as entitlement,
           p.deleted_at is not null as is_deleted
      from public.profiles p
      left join (
        select en.user_id,
               max(case en.source when 'purchase' then 4 when 'subscription' then 4
                                  when 'promo' then 3 when 'admin' then 2 else 1 end) as best
          from public.entitlements en
         where en.revoked_at is null and (en.ends_at is null or en.ends_at > now())
         group by en.user_id
      ) e on e.user_id = p.id
     where p.deleted_at is null
       and (p.alias::text ilike '%' || v_term || '%'
            or coalesce(p.display_name, '') ilike '%' || v_term || '%')
     order by (p.alias::text = v_term) desc, lower(p.alias::text)
     limit v_limit;
end;
$$;
revoke execute on function public.admin_search_learners(text, integer) from public, anon, authenticated;
grant execute on function public.admin_search_learners(text, integer) to service_role;

-- 4. Generic audit writer for admin actions without their own RPC ------------------------------
create or replace function public.admin_audit(
  p_actor uuid, p_action text, p_target_table text, p_target_id text, p_diff jsonb
)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  insert into public.audit_logs (actor_id, actor_role, action, target_table, target_id, diff)
  values (p_actor, 'admin', p_action, p_target_table, p_target_id, coalesce(p_diff, '{}'::jsonb));
$$;
revoke execute on function public.admin_audit(uuid, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.admin_audit(uuid, text, text, text, jsonb) to service_role;

-- 5. Directory: allow a full-result page for the CSV export ------------------------------------
-- Same columns, same filters, same internal admin check; only the page cap changes (200 -> 5000),
-- because the export reads the filtered set in one call instead of walking pages.
create or replace function public.admin_user_directory(
  p_search text default null,
  p_country text default null,
  p_entitlement text default null,
  p_include_deleted boolean default false,
  p_sort text default 'created_at',
  p_desc boolean default true,
  p_limit integer default 25,
  p_offset integer default 0
)
returns table (
  total_count bigint,
  id uuid,
  alias text,
  display_name text,
  country text,
  age integer,
  created_at timestamptz,
  onboarded boolean,
  role text,
  entitlement text,
  exercises_started integer,
  exercises_completed integer,
  level integer,
  xp_total integer,
  last_activity date,
  is_deleted boolean
)
language plpgsql
stable
security definer
set search_path = public, extensions, pg_temp
as $fn$
declare
  v_order text;
  v_dir text := case when coalesce(p_desc, true) then 'desc nulls last' else 'asc nulls last' end;
  v_search text := case
    when nullif(btrim(coalesce(p_search, '')), '') is null then null
    else '%' || btrim(p_search) || '%'
  end;
  v_limit integer := least(greatest(coalesce(p_limit, 25), 1), 5000);
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
begin
  if auth.uid() is not null and not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;

  v_order := case p_sort
    when 'alias' then 'lower(f.alias)'
    when 'display_name' then 'lower(f.display_name)'
    when 'country' then 'f.country'
    when 'age' then 'f.age'
    when 'onboarded' then 'f.onboarded'
    when 'role' then 'f.role'
    when 'entitlement' then 'f.entitlement'
    when 'exercises_started' then 'f.exercises_started'
    when 'exercises_completed' then 'f.exercises_completed'
    when 'level' then 'f.level'
    when 'xp_total' then 'f.xp_total'
    when 'last_activity' then 'f.last_activity'
    else 'f.created_at'
  end;

  return query execute format($q$
    with people as (
      select p.id,
             p.alias::text as alias,
             p.display_name,
             p.country::text as country,
             case
               when p.birth_date is null then null
               else extract(year from age(current_date, p.birth_date))::int
             end as age,
             p.created_at,
             p.onboarding_completed_at is not null as onboarded,
             p.role,
             p.deleted_at
        from public.profiles p
       where ($4::boolean or p.deleted_at is null)
         and ($2::text is null or p.country = upper($2::text))
         and ($1::text is null
              or p.alias::text ilike $1::text
              or coalesce(p.display_name, '') ilike $1::text
              or p.id::text = btrim(trim(both '%%' from $1::text)))
    ),
    prog as (
      select ep.user_id,
             count(*)::int as started,
             (count(*) filter (where ep.status = 'completed'))::int as completed
        from public.exercise_progress ep
       group by ep.user_id
    ),
    ent as (
      select e.user_id,
             max(case e.source
                   when 'purchase' then 4
                   when 'subscription' then 4
                   when 'promo' then 3
                   when 'admin' then 2
                   else 1 end) as best
        from public.entitlements e
       where e.revoked_at is null and (e.ends_at is null or e.ends_at > now())
       group by e.user_id
    ),
    act as (
      select da.user_id, max(da.activity_date) as last_activity
        from public.daily_activity da
       group by da.user_id
    ),
    f as (
      select pe.id, pe.alias, pe.display_name, pe.country, pe.age, pe.created_at,
             pe.onboarded, pe.role,
             case
               when pe.role = 'admin' then 'admin'
               when coalesce(en.best, 0) >= 4 then 'paid'
               when en.best = 3 then 'promo'
               when en.best = 2 then 'granted'
               else 'free'
             end as entitlement,
             coalesce(pr.started, 0) as exercises_started,
             coalesce(pr.completed, 0) as exercises_completed,
             coalesce(ut.level, 1) as level,
             coalesce(ut.xp_total, 0) as xp_total,
             ac.last_activity,
             pe.deleted_at is not null as is_deleted
        from people pe
        left join prog pr on pr.user_id = pe.id
        left join ent en on en.user_id = pe.id
        left join act ac on ac.user_id = pe.id
        left join public.user_totals ut on ut.user_id = pe.id
    )
    select (count(*) over ())::bigint as total_count,
           f.id, f.alias, f.display_name, f.country, f.age, f.created_at, f.onboarded, f.role,
           f.entitlement, f.exercises_started, f.exercises_completed, f.level, f.xp_total,
           f.last_activity, f.is_deleted
      from f
     where $3::text is null or f.entitlement = $3::text
     order by %s %s, f.created_at desc, f.id
     limit $5::int offset $6::int
  $q$, v_order, v_dir)
  using v_search,
        nullif(btrim(coalesce(p_country, '')), ''),
        nullif(btrim(coalesce(p_entitlement, '')), ''),
        coalesce(p_include_deleted, false),
        v_limit,
        v_offset;
end;
$fn$;
revoke execute on function public.admin_user_directory(text, text, text, boolean, text, boolean, integer, integer) from public, anon, authenticated;
grant execute on function public.admin_user_directory(text, text, text, boolean, text, boolean, integer, integer) to service_role;
