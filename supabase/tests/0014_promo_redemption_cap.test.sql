-- pgTAP tests for the promo code redemption cap (owner question, 2026-09-24).
--
-- What is being proven: an uncapped code is a distinct, visible event in the audit log, a capped
-- code stops being redeemable when the cap is reached, and an insert that says nothing about the
-- cap gets 1 rather than "unlimited".
begin;
select plan(9);

insert into auth.users (id, email) values
  ('c1111111-1111-1111-1111-111111111111', 'promo-admin@ejemplo.lat'),
  ('c2222222-2222-2222-2222-222222222222', 'promo-uno@ejemplo.lat'),
  ('c3333333-3333-3333-3333-333333333333', 'promo-dos@ejemplo.lat');
update public.profiles set alias = 'promo_admin', role = 'admin'
 where id = 'c1111111-1111-1111-1111-111111111111';

-- 1. A code created without mentioning the cap is capped, not open-ended.
insert into public.promo_codes (code, kind, access_days) values ('BECA-DEFAULT', 'scholarship', 30);
select is((select max_redemptions from public.promo_codes where code = 'BECA-DEFAULT'), 1,
  'a promo code inserted without a cap defaults to a single redemption');

-- 2. Zero is not a cap anybody means.
select throws_ok(
  $$insert into public.promo_codes (code, kind, access_days, max_redemptions)
    values ('BECA-CERO', 'scholarship', 30, 0)$$,
  '23514', null, 'a cap below 1 is refused');

-- 3-6. The audit action tells a capped creation and an uncapped one apart.
select lives_ok(
  $$select public.create_promo_code('BECA-CAP', 'scholarship', 30, null, 2, null, 'capped',
      'c1111111-1111-1111-1111-111111111111')$$,
  'a capped code is created');
select lives_ok(
  $$select public.create_promo_code('BECA-OPEN', 'scholarship', 30, null, null, null, 'open',
      'c1111111-1111-1111-1111-111111111111')$$,
  'an uncapped code is created');
select is(
  (select count(*) from public.audit_logs where action = 'promo_code.created_unlimited'), 1::bigint,
  'only the uncapped creation is logged as unlimited');
select is(
  (select diff ->> 'unlimited' from public.audit_logs where action = 'promo_code.created'),
  'false', 'the capped creation records that it is not unlimited');

-- 7-9. The cap is enforced at redemption: two different people exhaust a cap of 2, a third is
-- refused. (The per-user guard is covered in 0006_commerce.test.sql.)
set local role authenticated;
set local request.jwt.claim.sub = 'c2222222-2222-2222-2222-222222222222';
set local request.jwt.claims = '{"sub":"c2222222-2222-2222-2222-222222222222","role":"authenticated"}';
select lives_ok($$select public.redeem_promo('BECA-CAP')$$, 'the first person redeems the code');
set local request.jwt.claim.sub = 'c3333333-3333-3333-3333-333333333333';
set local request.jwt.claims = '{"sub":"c3333333-3333-3333-3333-333333333333","role":"authenticated"}';
select lives_ok($$select public.redeem_promo('BECA-CAP')$$, 'the second person redeems the code');
set local request.jwt.claim.sub = 'c1111111-1111-1111-1111-111111111111';
set local request.jwt.claims = '{"sub":"c1111111-1111-1111-1111-111111111111","role":"authenticated"}';
select throws_ok($$select public.redeem_promo('BECA-CAP')$$, 'P0001', null,
  'the third person is refused once the cap is reached');
reset role;

select * from finish();
rollback;
