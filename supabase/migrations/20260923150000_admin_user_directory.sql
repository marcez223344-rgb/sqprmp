-- Admin user directory and audience statistics (owner feedback item 10).
--
-- Two service-role RPCs so the aggregation happens in Postgres, never in TypeScript:
--   * admin_user_directory(...)  paginated, sortable, filterable listing of every profile
--   * admin_user_stats(limit)    one JSON document with the audience/activation aggregates
--
-- Privacy: neither function returns an email or a birth date. Age is derived server-side and
-- returned as an integer; the raw birth_date never leaves the database. Both are revoked from
-- public/anon/authenticated and granted only to service_role (the server calls them with the
-- admin client after requireAdmin()), and both additionally refuse to run for any caller that
-- presents a JWT subject which is not an admin (defense in depth if a grant is ever widened).
--
-- No new tables, so no new RLS policies; the pgTAP test proves a plain authenticated learner
-- gets nothing back from either function.
set check_function_bodies = off;

-- 1. Indexes for the new access paths -------------------------------------------------------
-- Default listing order and the signup-cohort aggregate.
create index if not exists profiles_created_at_idx on public.profiles (created_at desc);
-- Country facet and the learners-by-country aggregate.
create index if not exists profiles_country_idx on public.profiles (country) where deleted_at is null;
-- Certificate holders aggregate (distinct users with a live certificate).
create index if not exists certificates_user_live_idx on public.certificates (user_id) where revoked_at is null;
-- exercise_progress (user_id, status), daily_activity (user_id, activity_date desc) and
-- entitlements (user_id) where revoked_at is null already exist and serve the per-user
-- aggregates as index-only scans.

-- 2. Paginated directory --------------------------------------------------------------------
-- The ORDER BY is dynamic because PostgREST cannot sort a set-returning function, but p_sort is
-- never interpolated: it selects one fragment from a fixed whitelist, and every value the caller
-- supplies is bound with USING. total_count is a window count over the filtered set, so the page
-- and the total arrive in one round trip.
create or replace function public.admin_user_directory(
  p_search text default null,
  p_country text default null,
  p_entitlement text default null,
  p_include_deleted boolean default false,
  p_sort text default 'created_at',
  p_desc boolean default true,
  p_limit integer default 25,
  p_offset integer default 0
)
returns table (
  total_count bigint,
  id uuid,
  alias text,
  display_name text,
  country text,
  age integer,
  created_at timestamptz,
  onboarded boolean,
  role text,
  entitlement text,
  exercises_started integer,
  exercises_completed integer,
  level integer,
  xp_total integer,
  last_activity date,
  is_deleted boolean
)
language plpgsql
stable
security definer
set search_path = public, extensions, pg_temp
as $fn$
declare
  v_order text;
  v_dir text := case when coalesce(p_desc, true) then 'desc nulls last' else 'asc nulls last' end;
  v_search text := case
    when nullif(btrim(coalesce(p_search, '')), '') is null then null
    else '%' || btrim(p_search) || '%'
  end;
  v_limit integer := least(greatest(coalesce(p_limit, 25), 1), 200);
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
begin
  if auth.uid() is not null and not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;

  v_order := case p_sort
    when 'alias' then 'lower(f.alias)'
    when 'display_name' then 'lower(f.display_name)'
    when 'country' then 'f.country'
    when 'age' then 'f.age'
    when 'onboarded' then 'f.onboarded'
    when 'role' then 'f.role'
    when 'entitlement' then 'f.entitlement'
    when 'exercises_started' then 'f.exercises_started'
    when 'exercises_completed' then 'f.exercises_completed'
    when 'level' then 'f.level'
    when 'xp_total' then 'f.xp_total'
    when 'last_activity' then 'f.last_activity'
    else 'f.created_at'
  end;

  return query execute format($q$
    with people as (
      select p.id,
             p.alias::text as alias,
             p.display_name,
             p.country::text as country,
             case
               when p.birth_date is null then null
               else extract(year from age(current_date, p.birth_date))::int
             end as age,
             p.created_at,
             p.onboarding_completed_at is not null as onboarded,
             p.role,
             p.deleted_at
        from public.profiles p
       where ($4::boolean or p.deleted_at is null)
         and ($2::text is null or p.country = upper($2::text))
         and ($1::text is null
              or p.alias::text ilike $1::text
              or coalesce(p.display_name, '') ilike $1::text
              or p.id::text = btrim(trim(both '%%' from $1::text)))
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
    act as (
      select da.user_id, max(da.activity_date) as last_activity
        from public.daily_activity da
       group by da.user_id
    ),
    f as (
      select pe.id, pe.alias, pe.display_name, pe.country, pe.age, pe.created_at,
             pe.onboarded, pe.role,
             case
               when pe.role = 'admin' then 'admin'
               when coalesce(en.best, 0) >= 4 then 'paid'
               when en.best = 3 then 'promo'
               when en.best = 2 then 'granted'
               else 'free'
             end as entitlement,
             coalesce(pr.started, 0) as exercises_started,
             coalesce(pr.completed, 0) as exercises_completed,
             coalesce(ut.level, 1) as level,
             coalesce(ut.xp_total, 0) as xp_total,
             ac.last_activity,
             pe.deleted_at is not null as is_deleted
        from people pe
        left join prog pr on pr.user_id = pe.id
        left join ent en on en.user_id = pe.id
        left join act ac on ac.user_id = pe.id
        left join public.user_totals ut on ut.user_id = pe.id
    )
    select (count(*) over ())::bigint as total_count,
           f.id, f.alias, f.display_name, f.country, f.age, f.created_at, f.onboarded, f.role,
           f.entitlement, f.exercises_started, f.exercises_completed, f.level, f.xp_total,
           f.last_activity, f.is_deleted
      from f
     where $3::text is null or f.entitlement = $3::text
     order by %s %s, f.created_at desc, f.id
     limit $5::int offset $6::int
  $q$, v_order, v_dir)
  using v_search,
        nullif(btrim(coalesce(p_country, '')), ''),
        nullif(btrim(coalesce(p_entitlement, '')), ''),
        coalesce(p_include_deleted, false),
        v_limit,
        v_offset;
end;
$fn$;
revoke execute on function public.admin_user_directory(text, text, text, boolean, text, boolean, integer, integer) from public, anon, authenticated;
grant execute on function public.admin_user_directory(text, text, text, boolean, text, boolean, integer, integer) to service_role;

-- 3. Audience and activation statistics -----------------------------------------------------
-- p_free_limit mirrors limits.freeExerciseLimit (the free allowance is start-based, D-01).
-- Counts are always honest at any dataset size; the ratios that need a denominator (median,
-- p90, quiz pass rate) return null when there is nothing to divide by, and the UI says so
-- instead of printing NaN.
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
      'quiz_attempts', (select count(*) from public.quiz_attempts),
      'quiz_pass_rate', (select case when count(*) = 0 then null
                                     else round(100.0 * count(*) filter (where passed) / count(*)) end
                           from public.quiz_attempts),
      'certificate_holders', (select count(distinct user_id) from public.certificates where revoked_at is null)
    )
  ) into v;

  return v;
end;
$fn$;
revoke execute on function public.admin_user_stats(integer) from public, anon, authenticated;
grant execute on function public.admin_user_stats(integer) to service_role;
