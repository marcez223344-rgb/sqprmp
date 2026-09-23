import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { OID_ALIAS_TYPES } from "../../sandbox-runtime/denied-functions.mjs";
import { gateSql } from "@/lib/sandbox/gate";

/**
 * Drift guard for the two catalog lists the gate depends on (SEC-06 / SEC-08, decisions D-21 and
 * D-22). Both are name-based, so both can be reopened silently by a PGlite upgrade that adds an
 * OID alias type or a catalog function. These tests do not restate the lists: they ask the engine
 * that actually executes learner SQL what it contains, and assert the gate covers it.
 */
const probeScript = join(process.cwd(), "tests", "sandbox", "catalog-probe.mjs");

interface Probe {
  version: string;
  regTypes: string[];
  catalogFunctions: string[];
  execution: { sql: string; ok: boolean; rows?: number; message?: string }[];
}

let cached: Probe | null = null;
function probe(): Probe {
  // A real Node process: vitest runs in jsdom, where PGlite resolves to its browser build.
  cached ??= JSON.parse(
    execFileSync(process.execPath, [probeScript], { encoding: "utf8", timeout: 180_000 })
      .trim()
      .split("\n")
      .at(-1) as string,
  );
  return cached as Probe;
}

describe("system catalog surface of the shipped engine", () => {
  it("has exactly the OID alias types the gate denies as cast targets", () => {
    // If PostgreSQL adds an alias (it has before), the cast channel reopens for that name until
    // it is added to OID_ALIAS_TYPES. Failing here is the intended way to find out.
    expect(probe().regTypes).toEqual([...OID_ALIAS_TYPES].sort());
  }, 240_000);

  it("has no catalog function the gate would let through", () => {
    // The more valuable half: the function spelling is denied by prefix, so this asserts the
    // prefixes still match every `pg_*` / `to_reg*` / alias-named function the engine ships —
    // a new one is covered without editing anything, and a renamed family fails here.
    const names = probe().catalogFunctions;
    expect(names.length).toBeGreaterThan(400);
    const accepted = names.filter(
      (n) => /^[a-z_][a-z0-9_]*$/.test(n) && gateSql(`select ${n}()`).ok,
    );
    expect(accepted).toEqual([]);
  }, 240_000);

  it("keeps the layer-5 REVOKE effective for the function spelling", () => {
    // Layer 4 is a name rule; this is the permission that holds if it is ever bypassed.
    const byStart = (p: string) => probe().execution.filter((e) => e.sql.includes(p));
    for (const e of [
      ...byStart("pg_show_all_settings"),
      ...byStart("pg_get_userbyid"),
      ...byStart("pg_stat_get_activity"),
      ...byStart("to_regclass"),
      ...byStart("to_regrole"),
    ]) {
      expect(e.ok, e.sql).toBe(false);
      expect(e.message, e.sql).toMatch(/permission denied for function/);
    }
  }, 240_000);

  it("documents the one spelling no REVOKE can stop, so the gate has to", () => {
    // PostgreSQL parses `regclass('customers')` as a cast in function syntax: no EXECUTE check
    // happens, and the call still succeeds as `learner` with the function revoked.
    const cast = probe().execution.find((e) => e.sql.includes("regclass('customers')::text"));
    expect(cast?.ok).toBe(true);
    expect(gateSql("select regclass('customers')").ok).toBe(false);
  }, 240_000);

  it("still lets the learner run ordinary SQL after lockDown()", () => {
    // The prefix REVOKE is broad; this is the check that it did not take anything real with it.
    for (const e of probe().execution.filter(
      (x) => x.sql.includes("from customers") && !x.sql.includes("reg"),
    )) {
      expect(e.ok, `${e.sql} → ${e.message}`).toBe(true);
    }
  }, 240_000);
});
