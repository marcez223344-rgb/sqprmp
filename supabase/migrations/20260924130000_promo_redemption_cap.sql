-- Migration: 20260924130000_promo_redemption_cap.sql
-- Purpose (owner question, 2026-09-24: "¿no debería ser siempre 1? ¿no es peligroso?"):
--   `promo_codes.max_redemptions = null` means unlimited — `redeem_promo` skips the exhaustion
--   check entirely when it is null — and the per-user guard next to it only stops the *same*
--   person redeeming twice. So an uncapped scholarship code gives the course away to everyone the
--   message reaches. The application now requires an explicit "sin límite" tick before it sends a
--   null cap (src/lib/payments/promo-schema.ts); this migration makes the database agree:
--     1. a column default of 1, so an insert that omits the column is capped rather than open;
--     2. a check that a stated cap is at least 1 (0 would be a code nobody can redeem);
--     3. `create_promo_code` records an uncapped code under its own audit action,
--        `promo_code.created_unlimited`, so /admin/auditoria can filter for the one kind of code
--        that can cost real money instead of it reading like any other creation.
-- Design ref: docs/PAYMENTS.md §7, docs/SECURITY.md §6.
-- Destructive: no. Existing rows are untouched (a code that is already uncapped stays uncapped and
--   must be capped or deactivated by hand — the default only applies to new inserts). No new
--   table, so no new RLS policy: `promo_codes` keeps its admin-read-only policy from
--   20260918220000_commerce.sql and is written only through security-definer RPCs.
set check_function_bodies = off;

alter table public.promo_codes alter column max_redemptions set default 1;
comment on column public.promo_codes.max_redemptions is
  'Total redemptions allowed across all users. Null = unlimited, which the app only writes when an admin ticks "sin límite de canjes"; the default is 1.';

alter table public.promo_codes drop constraint if exists promo_codes_max_redemptions_positive;
alter table public.promo_codes add constraint promo_codes_max_redemptions_positive
  check (max_redemptions is null or max_redemptions >= 1) not valid;

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
  values (p_actor, 'admin',
          case when p_max_redemptions is null then 'promo_code.created_unlimited' else 'promo_code.created' end,
          'promo_codes', v_id::text,
          jsonb_build_object('kind', p_kind, 'access_days', p_access_days, 'discount_percent', p_discount_percent,
                             'max_redemptions', p_max_redemptions, 'unlimited', p_max_redemptions is null,
                             'expires_at', p_expires_at));
  return v_id;
end;
$$;
revoke execute on function public.create_promo_code(text, text, integer, integer, integer, timestamptz, text, uuid) from public, anon, authenticated;
grant execute on function public.create_promo_code(text, text, integer, integer, integer, timestamptz, text, uuid) to service_role;
