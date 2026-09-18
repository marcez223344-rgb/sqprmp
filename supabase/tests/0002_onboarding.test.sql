-- pgTAP tests for the onboarding migration. Run with `npx supabase test db`.
begin;
select plan(9);

insert into auth.users (id, email, raw_user_meta_data) values
  ('31111111-1111-1111-1111-111111111111', 'carla@ejemplo.lat', '{"full_name":"Carla Prueba"}'),
  ('32222222-2222-2222-2222-222222222222', 'diego@ejemplo.lat', '{"full_name":"Diego Prueba"}');
insert into public.avatars (slug, image_path, alt_text) values ('t-1', '/avatars/t-1.svg', 'Test avatar') on conflict (slug) do nothing;

select has_table('public', 'data_requests', 'data_requests exists');
select ok(rowsecurity, 'RLS on data_requests') from pg_tables where schemaname = 'public' and tablename = 'data_requests';

-- Carla completes onboarding
set local role authenticated;
set local request.jwt.claim.sub = '31111111-1111-1111-1111-111111111111';
set local request.jwt.claims = '{"sub":"31111111-1111-1111-1111-111111111111","role":"authenticated"}';
select lives_ok($$
  select public.complete_onboarding(jsonb_build_object(
    'display_name', 'Carla', 'alias', 'carla_sql',
    'avatar_id', (select id from public.avatars where slug = 't-1'),
    'country', 'AR', 'birth_date', '1990-01-01', 'gender', '', 'sql_level', 'beginner',
    'main_goal', 'first_job', 'weekly_goal_minutes', 120, 'timezone', 'America/Argentina/Buenos_Aires',
    'accept_terms', true, 'accept_privacy', true, 'terms_version', 'v1', 'privacy_version', 'v1'))
$$, 'learner can complete onboarding');
select isnt((select onboarding_completed_at from public.profiles where id = '31111111-1111-1111-1111-111111111111'), null, 'onboarding timestamp set');
select throws_ok($$
  select public.complete_onboarding(jsonb_build_object(
    'display_name', 'X', 'alias', 'carla_sql',
    'avatar_id', (select id from public.avatars where slug = 't-1'),
    'country', 'AR', 'birth_date', '1990-01-01', 'sql_level', 'beginner', 'main_goal', 'first_job',
    'weekly_goal_minutes', 60, 'accept_terms', false, 'accept_privacy', true, 'terms_version', 'v1', 'privacy_version', 'v1'))
$$, 'P0001', null, 'missing consent is raised with P0001');
-- Learners cannot tamper with consent timestamps directly (trigger freezes them)
update public.profiles set display_name = 'Carla P.' where id = '31111111-1111-1111-1111-111111111111';
select is((select terms_version from public.profiles where id = '31111111-1111-1111-1111-111111111111'), 'v1', 'consent preserved after learner update');
-- Data requests
insert into public.data_requests (user_id, type) values ('31111111-1111-1111-1111-111111111111', 'export');
select throws_ok($$ insert into public.data_requests (user_id, type) values ('31111111-1111-1111-1111-111111111111', 'export') $$, '23505', null, 'one pending request per type');
select throws_ok($$ insert into public.data_requests (user_id, type) values ('32222222-2222-2222-2222-222222222222', 'export') $$, '42501', null, 'cannot create requests for another user');
reset role;

-- Token hook adds user_role claim
select is(
  (public.custom_access_token_hook(jsonb_build_object('user_id', '31111111-1111-1111-1111-111111111111', 'claims', '{}'::jsonb)) -> 'claims' ->> 'user_role'),
  'learner', 'token hook adds user_role');

select * from finish();
rollback;
