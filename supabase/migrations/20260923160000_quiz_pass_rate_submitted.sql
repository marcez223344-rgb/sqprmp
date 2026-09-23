-- Quiz pass rate: count submitted attempts only.
--
-- 20260923140000_quiz_attempt_progress.sql made a quiz_attempts row exist from the moment a
-- learner opens a quiz (status = 'in_progress', passed = false), so every open and every
-- abandoned attempt was being counted as a failure by the two reporting functions. Both divided
-- by every row in the table.
--
-- This file is a faithful `create or replace` of both bodies with only the quiz denominators
-- changed; no other metric is touched.
--   * admin_metrics(p_free_limit)      -> learning.quiz_pass_rate
--   * admin_user_stats(p_free_limit)   -> friction.quiz_pass_rate, and the attempt counter split
--
-- The counter is split rather than filtered because both numbers answer a question the owner
-- asks: `quiz_attempts_submitted` is the denominator of the pass rate, `quiz_attempts_open` is
-- the abandonment signal (quizzes started and never finished). Naming them separately means
-- nobody can read one as the other.
--
-- Grants, `security definer` and the pinned `search_path` are re-declared below because
-- `create or replace` keeps them but reading this file alone should show the posture.
-- Destructive: no.
set check_function_bodies = off;

create or replace function public.admin_metrics(p_free_limit integer)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with
  learners as (select id, created_at, onboarding_completed_at from public.profiles where deleted_at is null and role = 'learner'),
  started as (select distinct user_id from public.exercise_progress),
  completed as (select distinct user_id from public.exercise_progress where status = 'completed'),
  entitled as (select distinct user_id from public.entitlements where revoked_at is null and (ends_at is null or ends_at > now())),
  free_used as (
    select p.user_id from public.exercise_progress p
    group by p.user_id having count(*) >= p_free_limit
  ),
  active as (select user_id, activity_date from public.daily_activity),
  cohort as (
    select l.id, l.created_at::date as d0,
      exists (select 1 from active a where a.user_id = l.id and a.activity_date = l.created_at::date + 1) as d1,
      exists (select 1 from active a where a.user_id = l.id and a.activity_date between l.created_at::date + 5 and l.created_at::date + 9) as d7,
      exists (select 1 from active a where a.user_id = l.id and a.activity_date between l.created_at::date + 25 and l.created_at::date + 35) as d30
    from learners l
  ),
  hardest as (
    select e.slug, count(a.id) as attempts,
      count(distinct a.user_id) filter (where a.status = 'correct') as solvers,
      count(distinct a.user_id) as attempters
    from public.attempts a join public.exercises e on e.id = a.exercise_id
    group by e.slug having count(a.id) >= 5
    order by (count(a.id)::numeric / greatest(count(distinct a.user_id) filter (where a.status = 'correct'), 1)) desc
    limit 5
  ),
  sqlstates as (
    select f ->> 'sqlstate' as sqlstate, count(*) as n
    from public.attempts a, jsonb_array_elements(a.feedback) f
    where a.status = 'error' and f ? 'sqlstate'
    group by 1 order by 2 desc limit 5
  ),
  sections as (
    select s.number, s.slug, count(sp.user_id) as completions
    from public.sections s left join public.section_progress sp on sp.section_id = s.id
    where s.is_published group by s.id order by s.number
  )
  select jsonb_build_object(
    'generated_at', now(),
    'signups', jsonb_build_object(
      'total', (select count(*) from learners),
      'last_7d', (select count(*) from learners where created_at > now() - interval '7 days'),
      'last_30d', (select count(*) from learners where created_at > now() - interval '30 days'),
      'onboarded', (select count(*) from learners where onboarding_completed_at is not null)
    ),
    'learning', jsonb_build_object(
      'started_exercise', (select count(*) from started),
      'completed_exercise', (select count(*) from completed),
      'free_limit_reached', (select count(*) from free_used f where not exists (select 1 from entitled e where e.user_id = f.user_id)),
      'sections_completed', (select count(*) from public.section_progress),
      'certificates_issued', (select count(*) from public.certificates where revoked_at is null),
      'quiz_pass_rate', (select coalesce(round(100.0 * count(*) filter (where passed) / nullif(count(*), 0)), 0) from public.quiz_attempts where status = 'submitted')
    ),
    'engagement', jsonb_build_object(
      'wau', (select count(distinct user_id) from active where activity_date > current_date - 7),
      'mau', (select count(distinct user_id) from active where activity_date > current_date - 30),
      'retention_d1', (select coalesce(round(100.0 * count(*) filter (where d1) / nullif(count(*) filter (where d0 <= current_date - 1), 0)), 0) from cohort),
      'retention_d7', (select coalesce(round(100.0 * count(*) filter (where d7) / nullif(count(*) filter (where d0 <= current_date - 9), 0)), 0) from cohort),
      'retention_d30', (select coalesce(round(100.0 * count(*) filter (where d30) / nullif(count(*) filter (where d0 <= current_date - 35), 0)), 0) from cohort)
    ),
    'monetization', jsonb_build_object(
      'entitled', (select count(*) from entitled),
      'purchases_pending', (select count(*) from public.purchases where status = 'pending'),
      'purchases_approved', (select count(*) from public.purchases where status = 'approved'),
      'refunds', (select count(*) from public.purchases where status in ('refunded', 'chargeback')),
      'revenue', (select coalesce(jsonb_object_agg(currency, total), '{}'::jsonb) from (select currency, sum(amount_minor) as total from public.purchases where status = 'approved' group by currency) r),
      'unmatched_events', (select count(*) from public.payment_events where processing_error = 'unmatched user or price' and reconciled_at is null),
      'promo_redemptions', (select count(*) from public.promo_redemptions)
    ),
    'hardest_exercises', (select coalesce(jsonb_agg(jsonb_build_object('slug', slug, 'attempts', attempts, 'solvers', solvers, 'attempters', attempters)), '[]'::jsonb) from hardest),
    'frequent_sqlstates', (select coalesce(jsonb_agg(jsonb_build_object('sqlstate', sqlstate, 'count', n)), '[]'::jsonb) from sqlstates),
    'sections', (select coalesce(jsonb_agg(jsonb_build_object('number', number, 'slug', slug, 'completions', completions) order by number), '[]'::jsonb) from sections)
  );
$$;
revoke execute on function public.admin_metrics(integer) from public, anon, authenticated;
grant execute on function public.admin_metrics(integer) to service_role;

create or replace function public.admin_user_stats(p_free_limit integer)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, extensions, pg_temp
as $fn$
declare v jsonb;
begin
  if auth.uid() is not null and not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;

  with learners as (
    select p.id, p.created_at, p.country::text as country, p.onboarding_completed_at,
           case
             when p.birth_date is null then 'unknown'
             when extract(year from age(current_date, p.birth_date)) < 25 then '18_24'
             when extract(year from age(current_date, p.birth_date)) < 35 then '25_34'
             when extract(year from age(current_date, p.birth_date)) < 45 then '35_44'
             else '45_plus'
           end as age_bracket
      from public.profiles p
     where p.deleted_at is null and p.role = 'learner'
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
  people as (
    select l.id, l.created_at, l.country, l.age_bracket,
           coalesce(pr.started, 0) as started,
           coalesce(pr.completed, 0) as completed,
           case
             when coalesce(en.best, 0) >= 4 then 'paid'
             when en.best = 3 then 'promo'
             when en.best = 2 then 'granted'
             else 'free'
           end as entitlement
      from learners l
      left join prog pr on pr.user_id = l.id
      left join ent en on en.user_id = l.id
  ),
  by_country as (
    select coalesce(pe.country, 'unknown') as country,
           count(*)::int as learners,
           (count(*) filter (where pe.completed > 0))::int as activated,
           (count(*) filter (where pe.entitlement <> 'free'))::int as with_access
      from people pe group by 1 order by 2 desc, 1
  ),
  by_age as (
    select b.bracket, (select count(*) from people pe where pe.age_bracket = b.bracket)::int as learners
      from (values ('18_24', 1), ('25_34', 2), ('35_44', 3), ('45_plus', 4), ('unknown', 5)) as b(bracket, ord)
     order by b.ord
  ),
  by_month as (
    select to_char(date_trunc('month', pe.created_at), 'YYYY-MM') as month,
           count(*)::int as learners,
           (count(*) filter (where pe.completed > 0))::int as activated,
           (count(*) filter (where pe.entitlement <> 'free'))::int as with_access
      from people pe
     where pe.created_at >= date_trunc('month', current_date) - interval '11 months'
     group by 1 order by 1
  ),
  by_entitlement as (
    select s.status, (select count(*) from people pe where pe.entitlement = s.status)::int as learners
      from (values ('free', 1), ('paid', 2), ('promo', 3), ('granted', 4)) as s(status, ord)
     order by s.ord
  ),
  distribution as (
    select b.bucket,
           (select count(*) from people pe
             where pe.completed >= b.lo and (b.hi is null or pe.completed <= b.hi))::int as learners
      from (values ('0', 0, 0, 1), ('1_2', 1, 2, 2), ('3_5', 3, 5, 3), ('6_10', 6, 10, 4), ('11_plus', 11, null, 5))
             as b(bucket, lo, hi, ord)
     order by b.ord
  )
  select jsonb_build_object(
    'generated_at', now(),
    'learners_total', (select count(*) from people),
    'by_country', (select coalesce(jsonb_agg(jsonb_build_object(
        'country', country, 'learners', learners, 'activated', activated, 'with_access', with_access)), '[]'::jsonb) from by_country),
    'by_age_bracket', (select coalesce(jsonb_agg(jsonb_build_object(
        'bracket', bracket, 'learners', learners)), '[]'::jsonb) from by_age),
    'by_signup_month', (select coalesce(jsonb_agg(jsonb_build_object(
        'month', month, 'learners', learners, 'activated', activated, 'with_access', with_access)), '[]'::jsonb) from by_month),
    'by_entitlement', (select coalesce(jsonb_agg(jsonb_build_object(
        'status', status, 'learners', learners)), '[]'::jsonb) from by_entitlement),
    'activation', jsonb_build_object(
      'started_any', (select count(*) from people where started > 0),
      'completed_any', (select count(*) from people where completed > 0),
      'completed_median', (select percentile_cont(0.5) within group (order by completed) from people),
      'completed_p90', (select percentile_cont(0.9) within group (order by completed) from people),
      'distribution', (select coalesce(jsonb_agg(jsonb_build_object(
          'bucket', bucket, 'learners', learners)), '[]'::jsonb) from distribution)
    ),
    'friction', jsonb_build_object(
      'free_limit_reached_unpaid', (select count(*) from people where started >= p_free_limit and entitlement = 'free'),
      'quiz_attempts_submitted', (select count(*) from public.quiz_attempts where status = 'submitted'),
      'quiz_attempts_open', (select count(*) from public.quiz_attempts where status = 'in_progress'),
      'quiz_pass_rate', (select case when count(*) = 0 then null
                                     else round(100.0 * count(*) filter (where passed) / count(*)) end
                           from public.quiz_attempts where status = 'submitted'),
      'certificate_holders', (select count(distinct user_id) from public.certificates where revoked_at is null)
    )
  ) into v;

  return v;
end;
$fn$;
revoke execute on function public.admin_user_stats(integer) from public, anon, authenticated;
grant execute on function public.admin_user_stats(integer) to service_role;
