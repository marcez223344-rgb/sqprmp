-- promo_codes.code and profiles.alias are extensions.citext, but the functions that compare them
-- pinned `search_path = public, pg_temp`, so the citext operators were not visible and both sides
-- fell back to text: promo codes were case-sensitive (BECA-TEST vs beca-test) and the admin alias
-- lookup matched only the exact casing. Adding `extensions` to the search_path restores the
-- intended case-insensitive comparison. Non-destructive: bodies unchanged apart from the setting.
create or replace function public.redeem_promo(p_code text)
returns table (kind text, access_days integer, discount_percent integer)
language plpgsql
security definer
set search_path = public, extensions, pg_temp
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

create or replace function public.admin_find_user(p_query text)
returns table (id uuid, alias text, display_name text, email text, role text, country text, created_at timestamptz, onboarding_completed_at timestamptz, deleted_at timestamptz)
language sql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
  select p.id, p.alias::text, p.display_name, u.email::text, p.role, p.country, p.created_at, p.onboarding_completed_at, p.deleted_at
  from public.profiles p join auth.users u on u.id = p.id
  where p.alias = p_query::extensions.citext or lower(u.email) = lower(p_query) or p.id::text = p_query
  limit 5;
$$;
revoke execute on function public.admin_find_user(text) from public, anon, authenticated;
grant execute on function public.admin_find_user(text) to service_role;
