-- pgTAP tests for Phase 8: analytics events RLS, payment reconciliation, admin RPCs, metrics.
begin;
select plan(14);

insert into auth.users (id, email) values
  ('91111111-1111-1111-1111-111111111111', 'ana@ejemplo.lat'),
  ('92222222-2222-2222-2222-222222222222', 'admin@ejemplo.lat');
update public.profiles set role = 'admin' where id = '92222222-2222-2222-2222-222222222222';
update public.profiles set alias = 'ana_test' where id = '91111111-1111-1111-1111-111111111111';

-- Analytics events: service writes; learners/anon cannot read, admins can.
insert into public.analytics_events (user_id, name, properties) values ('91111111-1111-1111-1111-111111111111', 'lesson_viewed', '{"lesson_slug":"select"}');
set local role anon;
select throws_ok('select name from public.analytics_events limit 1', '42501', null, 'anon cannot read analytics_events');
set local role authenticated;
set local request.jwt.claim.sub = '91111111-1111-1111-1111-111111111111';
set local request.jwt.claims = '{"sub":"91111111-1111-1111-1111-111111111111","role":"authenticated"}';
select is((select count(*) from public.analytics_events), 0::bigint, 'learner sees no analytics rows');
select throws_ok($$ insert into public.analytics_events (name) values ('page_viewed') $$, '42501', null, 'learner cannot insert analytics');
set local request.jwt.claim.sub = '92222222-2222-2222-2222-222222222222';
set local request.jwt.claims = '{"sub":"92222222-2222-2222-2222-222222222222","role":"authenticated"}';
select is((select count(*) from public.analytics_events), 1::bigint, 'admin reads analytics rows');
reset role;

-- Metrics RPC runs and reflects seeded state.
select is((select (public.admin_metrics(5) -> 'signups' ->> 'total')::int), 1, 'admin_metrics counts learners');
select is((select alias from public.admin_find_user('ANA@ejemplo.lat')), 'ana_test', 'admin_find_user matches email case-insensitively');

-- Unmatched approved webhook → reconcile → entitlement; second reconcile refused.
create temp table price as select id from public.prices where provider = 'hotmart' limit 1;
select is(public.apply_payment_event('hotmart', 'evt-u1', 'PURCHASE_APPROVED', '{}'::jsonb, true, 'HP-U1', 'approved', 2000, 'USD', null, (select id from price)), 'unmatched', 'unmatched event stored');
select is((select amount_minor from public.payment_events where provider_event_id = 'evt-u1'), 2000, 'normalized amount persisted');
select lives_ok($$ select public.reconcile_payment_event((select id from public.payment_events where provider_event_id = 'evt-u1'), '92222222-2222-2222-2222-222222222222', '91111111-1111-1111-1111-111111111111', (select id from price), 'comprobante') $$, 'admin reconciles');
select is(public.has_active_entitlement('91111111-1111-1111-1111-111111111111'), true, 'entitlement granted by reconciliation');
select throws_ok($$ select public.reconcile_payment_event((select id from public.payment_events where provider_event_id = 'evt-u1'), '92222222-2222-2222-2222-222222222222', '91111111-1111-1111-1111-111111111111', (select id from price), 'again') $$, 'P0001', null, 'reconciled event cannot be reused');

-- Flags and promo codes are audited.
select lives_ok($$ select public.set_feature_flag('leaderboards', true, true, '92222222-2222-2222-2222-222222222222', 'test') $$, 'flag set');
select lives_ok($$ select public.create_promo_code('BECA-P8', 'scholarship', 30, null, 5, null, 'nota', '92222222-2222-2222-2222-222222222222') $$, 'promo created');
select is((select count(*) from public.audit_logs where action in ('payment_event.reconciled', 'feature_flag.set', 'promo_code.created')), 3::bigint, 'admin actions audited');

select * from finish();
rollback;
