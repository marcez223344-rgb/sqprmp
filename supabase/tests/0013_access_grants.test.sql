-- pgTAP tests for the admin access grants, the learner picker, the in-app access notice and the
-- widened directory page used by the CSV export (owner feedback 2026-09-24).
--
-- The rule being proven is the one the owner reported: a courtesy grant and a confirmed bank
-- transfer must not look the same. 'comp' produces an `admin` entitlement and no money; 'payment'
-- produces an approved purchase plus a `purchase` entitlement, so the revenue aggregate and the
-- "pagado" class in the directory are truthful.
begin;
select plan(27);

insert into auth.users (id, email) values
  ('b1111111-1111-1111-1111-111111111111', 'beca@ejemplo.lat'),
  ('b2222222-2222-2222-2222-222222222222', 'transfer@ejemplo.lat'),
  ('b3333333-3333-3333-3333-333333333333', 'pendiente@ejemplo.lat'),
  ('b4444444-4444-4444-4444-444444444444', 'grants-admin@ejemplo.lat');

update public.profiles set alias = 'beca_uno', display_name = 'Beca Uno'
 where id = 'b1111111-1111-1111-1111-111111111111';
update public.profiles set alias = 'transfer_uno', display_name = 'Transferencia Uno'
 where id = 'b2222222-2222-2222-2222-222222222222';
update public.profiles set alias = 'pendiente_uno', display_name = 'Pendiente Uno'
 where id = 'b3333333-3333-3333-3333-333333333333';
update public.profiles set alias = 'grants_admin', role = 'admin'
 where id = 'b4444444-4444-4444-4444-444444444444';

-- 1-5. Execute is revoked from anon and from a plain authenticated learner.
set local role anon;
select throws_ok(
  $$select public.admin_grant_access('b1111111-1111-1111-1111-111111111111', 'comp', null,
      'b4444444-4444-4444-4444-444444444444', 'x')$$,
  '42501', null, 'anon cannot call admin_grant_access');
select throws_ok('select 1 from public.admin_search_learners(''a'')', '42501', null,
  'anon cannot call admin_search_learners');
select throws_ok('select public.admin_audit(null, ''x'', null, null, null)', '42501', null,
  'anon cannot call admin_audit');
set local role authenticated;
select throws_ok('select 1 from public.admin_search_learners(''a'')', '42501', null,
  'a learner cannot call admin_search_learners');
select throws_ok(
  $$select public.admin_grant_access('b1111111-1111-1111-1111-111111111111', 'comp', null,
      'b4444444-4444-4444-4444-444444444444', 'x')$$,
  '42501', null, 'a learner cannot call admin_grant_access');
reset role;

-- 6-7. Unknown kind and unknown user are refused before anything is written.
select throws_ok(
  $$select public.admin_grant_access('b1111111-1111-1111-1111-111111111111', 'gift', null,
      'b4444444-4444-4444-4444-444444444444', 'x')$$,
  '22023', null, 'an unknown grant kind is refused');
select throws_ok(
  $$select public.admin_grant_access('00000000-0000-0000-0000-000000000000', 'comp', null,
      'b4444444-4444-4444-4444-444444444444', 'x')$$,
  'P0002', null, 'an unknown user is refused');

-- 8-12. Courtesy grant: an `admin` entitlement, an expiry derived from the days, no purchase.
select lives_ok(
  $$select public.admin_grant_access('b1111111-1111-1111-1111-111111111111', 'comp', 30,
      'b4444444-4444-4444-4444-444444444444', 'beca de lanzamiento')$$,
  'a courtesy grant succeeds');
select is(
  (select source from public.entitlements where user_id = 'b1111111-1111-1111-1111-111111111111'),
  'admin', 'a courtesy grant is recorded as source = admin');
select ok(
  (select ends_at::date from public.entitlements
    where user_id = 'b1111111-1111-1111-1111-111111111111') = (current_date + 30),
  'the expiry is derived from the days of access');
select is(
  (select count(*)::int from public.purchases where user_id = 'b1111111-1111-1111-1111-111111111111'),
  0, 'a courtesy grant creates no purchase');
select is(
  (select count(*)::int from public.audit_logs
    where action = 'access.comp_granted' and actor_id = 'b4444444-4444-4444-4444-444444444444'),
  1, 'the courtesy grant is audit-logged');

-- 13-18. Confirmed transfer: an approved purchase plus a `purchase` entitlement (= revenue).
select lives_ok(
  $$select public.admin_grant_access('b2222222-2222-2222-2222-222222222222', 'payment', null,
      'b4444444-4444-4444-4444-444444444444', 'transferencia recibida 2026-09-24',
      null, null, null, 'TRX-123')$$,
  'a confirmed transfer succeeds');
select is(
  (select status from public.purchases where user_id = 'b2222222-2222-2222-2222-222222222222'),
  'approved', 'the transfer creates an approved purchase');
select is(
  (select reference_code from public.purchases where user_id = 'b2222222-2222-2222-2222-222222222222'),
  'TRX-123', 'the bank reference typed by the admin is kept');
select is(
  (select source from public.entitlements where user_id = 'b2222222-2222-2222-2222-222222222222'),
  'purchase', 'the transfer entitlement is sourced from the purchase, not from the admin');
select is(
  (select amount_minor from public.purchases where user_id = 'b2222222-2222-2222-2222-222222222222'),
  2000, 'the amount comes from the active manual price when the admin does not override it');
select is(
  (select count(*)::int from public.audit_logs
    where action = 'access.payment_recorded' and actor_id = 'b4444444-4444-4444-4444-444444444444'),
  1, 'the recorded payment is audit-logged');

-- 19-21. A learner who already opened a pending manual purchase: that row is approved, not doubled.
insert into public.purchases (user_id, price_id, provider, reference_code, channel, status,
                              amount_minor, currency)
values ('b3333333-3333-3333-3333-333333333333',
        (select id from public.prices where provider = 'manual' and currency = 'USD'),
        'manual', 'DM-PEND1', 'bank_transfer', 'pending', 2000, 'USD');
select lives_ok(
  $$select public.admin_grant_access('b3333333-3333-3333-3333-333333333333', 'payment', null,
      'b4444444-4444-4444-4444-444444444444', 'transferencia confirmada')$$,
  'confirming a payment for a learner with a pending request succeeds');
select is(
  (select count(*)::int from public.purchases where user_id = 'b3333333-3333-3333-3333-333333333333'),
  1, 'the pending purchase is approved instead of a second one being created');
select is(
  (select status from public.purchases where reference_code = 'DM-PEND1'),
  'approved', 'the pending purchase ends up approved');

-- 22-23. The directory tells the two apart: otorgado vs pagado.
select is(
  (select entitlement from public.admin_user_directory('beca_uno')),
  'granted', 'the courtesy learner is listed as granted');
select is(
  (select entitlement from public.admin_user_directory('transfer_uno')),
  'paid', 'the paying learner is listed as paid');

-- 24-25. The picker finds by alias and by display name, and never returns an email column.
select is(
  (select count(*)::int from public.admin_search_learners('uno')), 3,
  'the picker matches alias and display name');
select ok(
  pg_get_function_result('public.admin_search_learners(text,integer)'::regprocedure) not like '%email%',
  'the picker result type has no email column');

-- 26-27. The access notice is per learner and only touches the caller's own rows.
set local role authenticated;
set local request.jwt.claim.sub = 'b1111111-1111-1111-1111-111111111111';
set local request.jwt.claims = '{"sub":"b1111111-1111-1111-1111-111111111111","role":"authenticated"}';
select is(public.acknowledge_entitlements(), 1, 'a learner acknowledges their own entitlement');
select is(
  (select count(*)::int from public.entitlements
    where user_id <> 'b1111111-1111-1111-1111-111111111111' and acknowledged_at is not null),
  0, 'acknowledging never touches another learner''s entitlement');
reset role;

select * from finish();
rollback;
