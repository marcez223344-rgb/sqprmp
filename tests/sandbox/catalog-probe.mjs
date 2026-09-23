/**
 * Probe used by tests/sandbox/catalog.test.ts. Runs in a real Node process (vitest's jsdom
 * environment resolves PGlite to its browser build, which cannot boot in-process) and reports
 * what *this* engine build actually contains, so the gate's catalog lists can be compared with
 * the engine instead of with a copy of them: the OID alias types in `pg_type`, the catalog
 * function names in `pg_catalog`, and what the `learner` role can still execute after
 * `lockDown()`. A PGlite upgrade that adds an alias or a function shows up here.
 *
 * Usage: node catalog-probe.mjs  → one line of JSON on stdout.
 */
import { PGlite } from "@electric-sql/pglite";
import { OID_ALIAS_TYPES } from "../../sandbox-runtime/denied-functions.mjs";
import { lockDown } from "../../sandbox-runtime/engine-core.mjs";

const pg = new PGlite();
await pg.waitReady;
await pg.exec("create table customers (id serial primary key, full_name text)");
await pg.exec("insert into customers (full_name) values ('a')");
await lockDown(pg);

const version = (await pg.query("select version() as v")).rows[0].v;
const regTypes = (
  await pg.query(
    // Base types named `reg*`: the OID alias family. Name-matched on purpose — the gate's list
    // is a name list, so this is the comparison that has to hold.
    "select typname from pg_type where typname like 'reg%' and typtype = 'b' order by typname",
  )
).rows.map((r) => r.typname);

const aliasList = OID_ALIAS_TYPES.map((t) => `'${t}'`).join(",");
const catalogFunctions = (
  await pg.query(
    // The three name families the gate treats as catalog resolvers. Deliberately not `reg%`:
    // `regr_slope` and friends are ordinary statistical aggregates and the type I/O functions
    // (`regclassin`, ...) are not callable spellings of a catalog read.
    `select distinct p.proname from pg_proc p
       join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'pg_catalog'
        and (p.proname like 'pg\_%' or p.proname like 'to\_reg%' or p.proname in (${aliasList}))
      order by 1`,
  )
).rows.map((r) => r.proname);

/** What the learner can actually run after lockDown() — layer 5, independent of the gate. */
const asLearner = async (sql) => {
  await pg.exec("set role learner");
  try {
    const r = await pg.query(sql);
    return { sql, ok: true, rows: r.rows.length };
  } catch (e) {
    return { sql, ok: false, message: String(e.message) };
  } finally {
    await pg.exec("reset role");
  }
};
const execution = [];
for (const sql of [
  "select count(*) from pg_show_all_settings()",
  "select pg_get_userbyid(10)",
  "select count(*) from pg_stat_get_activity(null)",
  "select to_regclass('customers')::oid",
  "select to_regrole('learner')::oid",
  "select regclass('customers')::text",
  "select count(*) from customers",
  "select upper(full_name), to_char(now(), 'YYYY-MM') from customers",
])
  execution.push(await asLearner(sql));

await pg.close();
console.log(JSON.stringify({ version, regTypes, catalogFunctions, execution }));
