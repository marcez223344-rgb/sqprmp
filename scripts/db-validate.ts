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
