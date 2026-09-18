/**
 * Applies every migration in supabase/migrations to an in-memory PGlite (real Postgres 17)
 * with a minimal stub of Supabase's auth schema and roles, then asserts that every table in
 * `public` has RLS enabled and that every `security definer` function pins search_path.
 *
 * This complements (does not replace) `supabase test db` (pgTAP), which needs Docker.
 * Usage: npm run db:validate
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { citext } from "@electric-sql/pglite/contrib/citext";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";

const migrationsDir = join(process.cwd(), "supabase", "migrations");

const supabaseStub = `
  create schema if not exists extensions;
  create schema if not exists auth;
  do $$ begin
    if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
    if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
    if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
    if not exists (select 1 from pg_roles where rolname = 'supabase_auth_admin') then create role supabase_auth_admin nologin; end if;
  end $$;
  grant usage on schema public to anon, authenticated, service_role, supabase_auth_admin;
  grant usage on schema extensions to anon, authenticated, service_role;
  create table if not exists auth.users (
    id uuid primary key,
    email text,
    raw_user_meta_data jsonb default '{}'::jsonb,
    created_at timestamptz default now()
  );
  create or replace function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  create or replace function auth.role() returns text language sql stable as $$
    select nullif(current_setting('request.jwt.claim.role', true), '')
  $$;
`;

async function main() {
  const db = new PGlite({ extensions: { citext, pgcrypto } });
  await db.exec(supabaseStub);

  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  if (files.length === 0) {
    console.log("db:validate — no migrations yet. OK.");
    return;
  }

  for (const file of files) {
    const sql = readFileSync(join(migrationsDir, file), "utf8");
    try {
      await db.exec(sql);
      console.log(`applied  ${file}`);
    } catch (err) {
      console.error(`FAILED   ${file}\n${(err as Error).message}`);
      process.exit(1);
    }
  }

  const missingRls = await db.query<{ tablename: string }>(
    `select tablename from pg_tables where schemaname = 'public' and not rowsecurity order by 1`,
  );
  if (missingRls.rows.length) {
    console.error(`Tables without RLS: ${missingRls.rows.map((r) => r.tablename).join(", ")}`);
    process.exit(1);
  }

  const unsafeDefiners = await db.query<{ proname: string }>(
    `select p.proname
       from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.prosecdef
        and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%')`,
  );
  if (unsafeDefiners.rows.length) {
    console.error(
      `security definer functions without search_path: ${unsafeDefiners.rows.map((r) => r.proname).join(", ")}`,
    );
    process.exit(1);
  }

  // Behavioral smoke checks for the foundation migration.
  await db.exec(`insert into auth.users (id, email, raw_user_meta_data)
                 values ('00000000-0000-0000-0000-000000000001', 'a@ejemplo.lat', '{"full_name":"Ana Test"}')`);
  const profile = await db.query<{ display_name: string }>(
    `select display_name from public.profiles where id = '00000000-0000-0000-0000-000000000001'`,
  );
  if (profile.rows[0]?.display_name !== "Ana Test") {
    console.error("handle_new_user trigger did not create the profile");
    process.exit(1);
  }

  const rl1 = await db.query<{ ok: boolean }>(
    `select public.consume_rate_limit('t', 2, 0, 1) as ok`,
  );
  await db.query(`select public.consume_rate_limit('t', 2, 0, 1)`);
  const rl3 = await db.query<{ ok: boolean }>(
    `select public.consume_rate_limit('t', 2, 0, 1) as ok`,
  );
  if (!(rl1.rows[0]?.ok === true && rl3.rows[0]?.ok === false)) {
    console.error("consume_rate_limit token bucket misbehaves");
    process.exit(1);
  }

  // Seeds must apply cleanly too.
  const seedDir = join(process.cwd(), "supabase", "seed");
  for (const file of readdirSync(seedDir)
    .filter((f) => f.endsWith(".sql"))
    .sort()) {
    await db.exec(readFileSync(join(seedDir, file), "utf8"));
    console.log(`seeded   ${file}`);
  }

  // Onboarding RPC as the learner (JWT sub) with a real avatar id.
  const avatar = await db.query<{ id: string }>(
    "select id from public.avatars where is_active order by sort_order limit 1",
  );
  await db.exec(
    "select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false)",
  );
  const onboarding = await db.query<{ alias: string; onboarding_completed_at: string }>(
    `select alias::text, onboarding_completed_at::text from public.complete_onboarding($1::jsonb)`,
    [
      JSON.stringify({
        display_name: "Ana",
        alias: "ana_datos",
        avatar_id: avatar.rows[0]?.id,
        country: "ar",
        birth_date: "1995-04-12",
        gender: "prefer_not_to_say",
        sql_level: "beginner",
        main_goal: "first_job",
        weekly_goal_minutes: 120,
        timezone: "America/Argentina/Buenos_Aires",
        accept_terms: true,
        accept_privacy: true,
        terms_version: "2026-09-18",
        privacy_version: "2026-09-18",
      }),
    ],
  );
  if (onboarding.rows[0]?.alias !== "ana_datos" || !onboarding.rows[0]?.onboarding_completed_at) {
    console.error("complete_onboarding did not persist the profile");
    process.exit(1);
  }
  const blocked = await db.query<{ ok: boolean }>(
    "select public.check_alias_available('admin_ana') as ok",
  );
  if (blocked.rows[0]?.ok !== false) {
    console.error("alias blocklist not enforced");
    process.exit(1);
  }
  await db.exec("select set_config('request.jwt.claim.sub', '', false)");

  // Curriculum seed sanity + privilege checks as anon/authenticated.
  const counts = await db.query<{ sections: number; lessons: number; questions: number }>(
    "select (select count(*) from public.sections)::int as sections, (select count(*) from public.lessons)::int as lessons, (select count(*) from public.theory_questions)::int as questions",
  );
  if ((counts.rows[0]?.sections ?? 0) < 39 || (counts.rows[0]?.questions ?? 0) < 1) {
    console.error("curriculum seed incomplete", counts.rows[0]);
    process.exit(1);
  }
  const mustFail = async (role: string, sql: string, label: string) => {
    await db.exec(`set role ${role}`);
    let failed = false;
    try {
      await db.query(sql);
    } catch {
      failed = true;
    }
    await db.exec("reset role");
    if (!failed) {
      console.error(`privilege leak: ${label} succeeded as ${role}`);
      process.exit(1);
    }
  };
  await mustFail(
    "anon",
    "select is_correct from public.question_options limit 1",
    "read is_correct",
  );
  await mustFail(
    "authenticated",
    "select explanation_md from public.theory_questions limit 1",
    "read explanation_md",
  );
  await mustFail(
    "authenticated",
    "select body_md from public.lessons limit 1",
    "read lessons.body_md",
  );
  await mustFail(
    "authenticated",
    "select validation_rules from public.exercises limit 1",
    "read validation_rules",
  );
  await mustFail("anon", "select sql from public.exercise_solutions limit 1", "read solutions");
  await db.exec("set role anon");
  const pub = await db.query<{ n: number }>(
    "select count(*)::int as n from public.questions_public",
  );
  const freeBodies = await db.query<{ n: number }>(
    "select count(*)::int as n from public.lessons_public where body_md_free is not null",
  );
  await db.exec("reset role");
  if ((pub.rows[0]?.n ?? 0) < 1 || (freeBodies.rows[0]?.n ?? 0) < 1) {
    console.error("public views return no rows for anon");
    process.exit(1);
  }

  // Gamification: idempotent awards, daily cap, streak with freeze.
  const u = "'00000000-0000-0000-0000-000000000001'";
  const award = (key: string, xp: number, date: string, cap = 600) =>
    db.query<{ awarded: boolean; xp_awarded: number; streak_length: number; level: number }>(
      `select awarded, xp_awarded, streak_length, level from public.award_reward(${u}, '${key}', 'exercise', ${xp}, 2, '{}'::jsonb, date '${date}', ${cap})`,
    );
  const a1 = await award("ex:1", 40, "2026-03-01");
  const a2 = await award("ex:1", 40, "2026-03-01");
  const a3 = await award("ex:2", 590, "2026-03-01");
  if (!(
    a1.rows[0]?.awarded &&
    a1.rows[0]?.xp_awarded === 40 &&
    a2.rows[0]?.awarded === false &&
    a3.rows[0]?.xp_awarded === 560
  )) {
    console.error("award_reward idempotency/cap misbehaves", a1.rows[0], a2.rows[0], a3.rows[0]);
    process.exit(1);
  }
  await award("ex:3", 10, "2026-03-02");
  const gap = await award("ex:4", 10, "2026-03-04"); // one-day gap → freeze consumed, streak continues
  const broken = await award("ex:5", 10, "2026-03-09"); // long gap → reset
  if (!(gap.rows[0]?.streak_length === 3 && broken.rows[0]?.streak_length === 1)) {
    console.error("streak/freeze logic misbehaves", gap.rows[0], broken.rows[0]);
    process.exit(1);
  }
  const lvl = await db.query<{ l: number }>("select public.level_for_xp(600) as l");
  if (lvl.rows[0]?.l !== 4) {
    console.error("level curve mismatch", lvl.rows[0]);
    process.exit(1);
  }
  const badges = await db.query<{ slug: string }>(`select public.evaluate_badges(${u}) as slug`);
  if (!badges.rows.some((r) => r.slug === "nivel-3")) {
    console.error("badge evaluation did not award nivel-3", badges.rows);
    process.exit(1);
  }

  // Commerce: manual purchase → admin approval → entitlement; idempotent webhook apply; promo.
  const price = await db.query<{ id: string }>(
    "select id from public.prices where provider = 'manual' and currency = 'USD' limit 1",
  );
  await db.exec(
    `select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false)`,
  );
  const mp = await db.query<{ purchase_id: string; reference_code: string }>(
    "select purchase_id, reference_code from public.create_manual_purchase($1, 'wallbit_usd')",
    [price.rows[0]?.id],
  );
  await db.exec("select set_config('request.jwt.claim.sub', '', false)");
  if (!mp.rows[0]?.reference_code?.startsWith("DM-")) {
    console.error("create_manual_purchase failed", mp.rows);
    process.exit(1);
  }
  const before = await db.query<{ ok: boolean }>(
    `select public.has_active_entitlement(${u}) as ok`,
  );
  await db.query("select public.review_manual_purchase($1, null, true, 'test')", [
    mp.rows[0].purchase_id,
  ]);
  const after = await db.query<{ ok: boolean }>(`select public.has_active_entitlement(${u}) as ok`);
  if (before.rows[0]?.ok !== false || after.rows[0]?.ok !== true) {
    console.error("manual purchase approval did not grant access", before.rows, after.rows);
    process.exit(1);
  }
  const hot = (id: string, status: string) =>
    db.query<{ r: string }>(
      `select public.apply_payment_event('hotmart', $1, 'PURCHASE_' || upper($2), '{}'::jsonb, true, 'HP-1', $2, 2000, 'USD', ${u}, (select id from public.prices where provider = 'hotmart' limit 1)) as r`,
      [id, status],
    );
  const e1 = await hot("evt-1", "approved");
  const e2 = await hot("evt-1", "approved");
  const e3 = await hot("evt-2", "refunded");
  const ents = await db.query<{ n: number }>(
    `select count(*)::int as n from public.entitlements where user_id = ${u} and revoked_at is null`,
  );
  if (!(
    e1.rows[0]?.r === "processed" &&
    e2.rows[0]?.r === "duplicate" &&
    e3.rows[0]?.r === "processed" &&
    ents.rows[0]?.n === 1
  )) {
    console.error("apply_payment_event misbehaves", e1.rows, e2.rows, e3.rows, ents.rows);
    process.exit(1);
  }

  const tables = await db.query<{ n: number }>(
    `select count(*)::int as n from pg_tables where schemaname='public'`,
  );
  console.log(
    `db:validate — ${files.length} migration(s), ${tables.rows[0]?.n} tables, all with RLS. OK.`,
  );
  await db.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
