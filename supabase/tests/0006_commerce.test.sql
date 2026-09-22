-- pgTAP tests for commerce: manual purchases, admin review, webhook idempotency, promos, RLS.
begin;
select plan(13);

insert into auth.users (id, email) values ('71111111-1111-1111-1111-111111111111', 'juan@ejemplo.lat'), ('72222222-2222-2222-2222-222222222222', 'karen@ejemplo.lat');
update public.profiles set role = 'admin' where id = '72222222-2222-2222-2222-222222222222';

select cmp_ok((select count(*) from public.prices where provider = 'manual'), '>=', 1::bigint, 'manual prices seeded');
select is(public.has_active_entitlement('71111111-1111-1111-1111-111111111111'), false, 'learner starts without access');

-- Learner creates a pending manual purchase (as authenticated).
set local role authenticated;
set local request.jwt.claim.sub = '71111111-1111-1111-1111-111111111111';
set local request.jwt.claims = '{"sub":"71111111-1111-1111-1111-111111111111","role":"authenticated"}';
create temp table mp as select * from public.create_manual_purchase((select id from public.prices where provider = 'manual' and currency = 'USD' limit 1), 'wallbit_usd');
select like((select reference_code from mp)::text, 'DM-%'::text, 'reference code generated'::text);
select throws_ok($$ select public.create_manual_purchase((select id from public.prices where provider = 'manual' and currency = 'USD' limit 1), 'wallbit_usd') $$, 'P0001', null, 'only one pending purchase at a time');
select throws_ok('select code from public.promo_codes limit 1', '42501', null, 'learner cannot read promo codes');
select is((select count(*) from public.purchases), 1::bigint, 'learner sees own purchase only');
reset role;

-- Admin approves → entitlement + audit.
select lives_ok($$ select public.review_manual_purchase((select purchase_id from mp), '72222222-2222-2222-2222-222222222222', true, 'comprobante ok') $$, 'admin approves');
select is(public.has_active_entitlement('71111111-1111-1111-1111-111111111111'), true, 'access granted after approval');
select cmp_ok((select count(*) from public.audit_logs where action in ('purchase.approved','entitlement.granted')), '>=', 2::bigint, 'audit entries written');

-- Webhook idempotency and refund revocation.
select is(public.apply_payment_event('hotmart', 'e1', 'PURCHASE_APPROVED', '{}'::jsonb, true, 'HP1', 'approved', 2000, 'USD', '71111111-1111-1111-1111-111111111111', (select id from public.prices where provider = 'hotmart' limit 1)), 'processed', 'approved event processed');
select is(public.apply_payment_event('hotmart', 'e1', 'PURCHASE_APPROVED', '{}'::jsonb, true, 'HP1', 'approved', 2000, 'USD', '71111111-1111-1111-1111-111111111111', (select id from public.prices where provider = 'hotmart' limit 1)), 'duplicate', 'replayed event ignored');
select is(public.apply_payment_event('hotmart', 'e2', 'PURCHASE_APPROVED', '{}'::jsonb, false, 'HP2', 'approved', 2000, 'USD', '71111111-1111-1111-1111-111111111111', null), 'invalid_signature', 'invalid token never grants');

-- Promo: scholarship grants access to a new learner.
insert into auth.users (id, email) values ('73333333-3333-3333-3333-333333333333', 'lia@ejemplo.lat');
insert into public.promo_codes (code, kind, access_days, max_redemptions) values ('BECA-TEST', 'scholarship', 30, 1);
set local role authenticated;
set local request.jwt.claim.sub = '73333333-3333-3333-3333-333333333333';
set local request.jwt.claims = '{"sub":"73333333-3333-3333-3333-333333333333","role":"authenticated"}';
select lives_ok($$ select * from public.redeem_promo('beca-test') $$, 'scholarship redeemed (case-insensitive)');
reset role;

select * from finish();
rollback;
