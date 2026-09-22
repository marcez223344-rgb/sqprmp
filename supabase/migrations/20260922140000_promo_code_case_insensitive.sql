-- 20260922130000 put the citext operators in scope, but that alone is not enough: citext has an
-- implicit cast to text, so `code = p_code` still resolves to the text operator and compares
-- case-sensitively. The comparison now casts the argument to citext explicitly, which is what
-- makes a scholarship code work regardless of how the learner types it.
create or replace function public.redeem_promo(p_code text)
returns table (kind text, access_days integer, discount_percent integer)
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare uid uuid := auth.uid(); v public.promo_codes%rowtype;
begin
  if uid is null then raise exception 'authentication required' using errcode = '42501'; end if;
  select * into v from public.promo_codes where code = p_code::extensions.citext and is_active for update;
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

