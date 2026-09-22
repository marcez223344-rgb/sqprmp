-- pgTAP tests for the foundation migration. Run with `npx supabase test db`.
begin;
select plan(17);

-- RLS enabled everywhere
select ok(rowsecurity, 'RLS on ' || tablename) from pg_tables where schemaname = 'public' and tablename in ('profiles','avatars','alias_blocklist','feature_flags','audit_logs','rate_limits');

-- Fixtures
insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'ana@ejemplo.lat', '{"full_name":"Ana Prueba"}'),
  ('22222222-2222-2222-2222-222222222222', 'bruno@ejemplo.lat', '{"full_name":"Bruno Prueba"}');
update public.profiles set role = 'admin' where id = '22222222-2222-2222-2222-222222222222';
insert into public.avatars (slug, image_path, alt_text, is_active) values ('a1', '/avatars/a1.svg', 'Avatar 1', true), ('a2', '/avatars/a2.svg', 'Avatar 2', false);

-- anon: sees only active avatars, no profiles
set local role anon;
select is((select count(*) from public.avatars where slug in ('a1', 'a2')), 1::bigint, 'anon sees only active avatars');
select throws_ok('select * from public.profiles', '42501', null, 'anon cannot read profiles');
reset role;

-- learner Ana: sees own profile only, cannot escalate role
set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
select is((select count(*) from public.profiles), 1::bigint, 'learner sees exactly one profile');
select is((select display_name from public.profiles), 'Ana Prueba', 'learner sees own profile');
update public.profiles set alias = 'ana_sql', display_name = 'Ana' where id = '11111111-1111-1111-1111-111111111111';
select is((select alias::text from public.profiles), 'ana_sql', 'learner can set alias');
select throws_ok('update public.profiles set role = ''admin''', '42501', null, 'learner has no column grant on role');
select is(public.check_alias_available('bruno_x'), true, 'alias available');
select is(public.check_alias_available('ana_sql'), true, 'own alias reads as available for the owner');
-- authenticated holds the SELECT grant; RLS (admin only) is what hides the rows.
select is((select count(*) from public.audit_logs), 0::bigint, 'learner reads no audit logs');
reset role;

-- learner Bruno cannot take Ana's alias (normalized collision)
set local role authenticated;
set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated","user_role":"admin"}';
select is(public.check_alias_available('4na_sql'), false, 'confusable alias is rejected');
select is((select count(*) from public.profiles), 2::bigint, 'admin sees all profiles');
reset role;

select * from finish();
rollback;
