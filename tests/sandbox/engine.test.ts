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
