import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { workerEngine } from "@/lib/sandbox/engines/worker-engine";

const dataset = { slug: "tiendaviva", version: 1 };
const built = existsSync(
  join(process.cwd(), "public", "datasets", "tiendaviva", "v1", "manifest.json"),
);

describe.skipIf(!built)("workerEngine (real PGlite in worker_threads)", () => {
  it("runs a query as the learner role with typed columns", async () => {
    const r = await workerEngine.execute(
      dataset,
      "select country, count(*) as n from customers group by country order by n desc",
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.columns.map((c) => c.name)).toEqual(["country", "n"]);
    expect(r.columns[1]?.type).toBe("bigint");
    expect(r.rowCount).toBe(6);
    expect(r.truncated).toBe(false);
  }, 60_000);

  it("caps rows and reports truncation", async () => {
    const r = await workerEngine.execute(dataset, "select id from orders order by id");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.rowCount).toBe(1000);
    expect(r.truncated).toBe(true);
    expect(r.rows[0]?.[0]).toBe(1);
  }, 60_000);

  it("blocks writes at the database level even if the gate allowed them", async () => {
    const r = await workerEngine.execute(
      dataset,
      "insert into customers (id, full_name, email, country, city, signup_at, marketing_opt_in) values (99999, 'x', 'x', 'AR', 'x', now(), false)",
      {
        allowedStatements: ["select", "insert"],
      },
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.code).toBe("database");
    expect(r.message).toMatch(/permission denied/i);
  }, 60_000);

  it("returns Postgres errors with position and no internals", async () => {
    const r = await workerEngine.execute(dataset, "select nombre from customers");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.code).toBe("database");
    expect(r.sqlstate).toBe("42703");
    expect(r.message).toContain("nombre");
    expect(r.message).not.toMatch(/\.c:|node_modules|at /);
  }, 60_000);

  it("rejects gated SQL before touching the engine", async () => {
    const r = await workerEngine.execute(dataset, "select pg_sleep(5)");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.code).toBe("gate");
  });

  it("rejects the SEC-02 catalog read channel before it reaches PGlite", async () => {
    // Security review 2026-09-23: the ON clause of a JOIN hanging off a function-call FROM item
    // was never analysed, and this query returned `pg_catalog.pg_class`'s row count through `g`
    // even with the learner role applied. It must now be stopped by the gate, not by the engine.
    const leak = await workerEngine.execute(
      dataset,
      "select * from customers join generate_series(1,5000) g on g = (select count(*) from pg_catalog.pg_class)",
    );
    expect(leak.ok).toBe(false);
    if (leak.ok) return;
    expect(leak.code).toBe("gate");
    expect(leak.message).toMatch(/pg_catalog/);

    const denied = await workerEngine.execute(
      dataset,
      "select * from customers left join generate_series(1,3) g on pg_sleep(1) is null",
    );
    expect(denied.ok).toBe(false);
    if (denied.ok) return;
    expect(denied.code).toBe("gate");

    // The legitimate shape still runs.
    const ok = await workerEngine.execute(
      dataset,
      "select c.id, g from customers c join generate_series(1, 3) g on g = c.id order by g",
    );
    expect(ok.ok).toBe(true);
    if (!ok.ok) return;
    expect(ok.rows.map((r) => r[1])).toEqual([1, 2, 3]);
  }, 60_000);

  it("runs DISTINCT ON, whose expressions the gate now analyses", async () => {
    const r = await workerEngine.execute(
      dataset,
      "select distinct on (country) country, full_name from customers order by country, full_name",
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.rowCount).toBe(6);
  }, 60_000);

  it("runs SQL the gate had to rewrite for analysis: named windows and interval frames", async () => {
    // The rewrite is analysis-only; PGlite must receive and execute the learner's original SQL.
    const named = await workerEngine.execute(
      dataset,
      "select country, count(*) as n, rank() over w as puesto from customers group by country window w as (order by count(*) desc) order by puesto",
    );
    expect(named.ok).toBe(true);
    if (!named.ok) return;
    expect(named.columns.map((c) => c.name)).toEqual(["country", "n", "puesto"]);
    expect(named.rows[0]?.[2]).toBe(1);

    const calendar = await workerEngine.execute(
      dataset,
      "select created_at::date as dia, sum(total_amount) over (order by created_at::date range between interval '6 days' preceding and current row) as movil from orders order by dia limit 5",
    );
    expect(calendar.ok).toBe(true);
  }, 60_000);

  it("hard-kills a runaway query and recovers", async () => {
    const t0 = Date.now();
    const bomb = await workerEngine.execute(
      dataset,
      "with recursive r(n) as (select 1 union all select n + 1 from r where n < 200000000) select count(*) from r",
      { hardTimeoutMs: 1500 },
    );
    expect(bomb.ok).toBe(false);
    if (bomb.ok) return;
    expect(bomb.code).toBe("timeout");
    expect(Date.now() - t0).toBeLessThan(6000);
    // The worker respawns and serves the next query.
    const after = await workerEngine.execute(dataset, "select 1 as ok");
    expect(after.ok).toBe(true);
  }, 90_000);
});
