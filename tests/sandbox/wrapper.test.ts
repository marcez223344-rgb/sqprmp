import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  WRAPPER_PREFIX,
  stripTrailingSemicolon,
  unwrapErrorPosition,
} from "../../sandbox-runtime/engine-core.mjs";
import { workerEngine } from "@/lib/sandbox/engines/worker-engine";

/**
 * The SELECT wrapper (`select * from (…) as __consulta limit n+1`) must never change the meaning
 * of a valid learner query, and must never produce an error about a character the learner is
 * entitled to write. Each case here is a shape that broke, or could break, that promise.
 */

describe("stripTrailingSemicolon", () => {
  it("removes the terminator, with or without trailing noise", () => {
    expect(stripTrailingSemicolon("select 1;")).toBe("select 1");
    expect(stripTrailingSemicolon("select 1 ;  ")).toBe("select 1   ");
    // The shape that failed in production: the regex only anchored at the end of the string, so
    // the semicolon survived and the wrapper produced `syntax error at or near ";"`.
    expect(stripTrailingSemicolon("select 1; -- nota")).toBe("select 1 -- nota");
    expect(stripTrailingSemicolon("select 1; /* nota */")).toBe("select 1 /* nota */");
  });
  it("never touches a semicolon inside a literal or a comment", () => {
    expect(stripTrailingSemicolon("select ';'")).toBe("select ';'");
    expect(stripTrailingSemicolon("select 1 -- punto y coma;")).toBe("select 1 -- punto y coma;");
    expect(stripTrailingSemicolon("select 1 /* ; */")).toBe("select 1 /* ; */");
    expect(stripTrailingSemicolon("select ';' as s -- ;")).toBe("select ';' as s -- ;");
  });
});

describe("unwrapErrorPosition", () => {
  it("maps a position in the wrapped statement back to the learner's text", () => {
    const sql = "select nombre from customers";
    // Postgres reports 8 for the learner's own statement; wrapped it reports 8 + prefix.
    expect(unwrapErrorPosition(WRAPPER_PREFIX.length + 8, sql, sql)).toBe(8);
  });
  it("accounts for leading whitespace the wrapper trimmed", () => {
    const sql = "\n  select nombre from customers";
    const inner = sql.trim();
    expect(unwrapErrorPosition(WRAPPER_PREFIX.length + 8, sql, inner)).toBe(11);
  });
  it("returns nothing when the position falls in the wrapper's own text", () => {
    const sql = "select 1";
    expect(unwrapErrorPosition(3, sql, sql)).toBeUndefined();
    expect(unwrapErrorPosition(WRAPPER_PREFIX.length + 99, sql, sql)).toBeUndefined();
    expect(unwrapErrorPosition(undefined, sql, sql)).toBeUndefined();
  });
});

const dataset = { slug: "tiendaviva", version: 1 };
const built = existsSync(
  join(process.cwd(), "public", "datasets", dataset.slug, `v${dataset.version}`, "manifest.json"),
);

describe.skipIf(!built)("wrapping a learner query in the real engine", () => {
  const run = (sql: string) => workerEngine.execute(dataset, sql);

  it("accepts a query that ends in a line comment", async () => {
    // The bug this test exists for: the closing paren used to sit on the same line as the comment.
    const r = await run("select id, city from customers order by id limit 2 -- solo dos");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.rowCount).toBe(2);
  }, 60_000);

  it("accepts a semicolon followed by a comment", async () => {
    const r = await run("select id from customers order by id limit 1; -- fin");
    expect(r.ok).toBe(true);
  }, 60_000);

  it("accepts a trailing block comment, single and multi-line", async () => {
    expect((await run("select id from customers order by id limit 1 /* fin */")).ok).toBe(true);
    expect(
      (await run("select id from customers order by id limit 1 /* fin\nde la consulta */")).ok,
    ).toBe(true);
  }, 60_000);

  it("keeps the learner's ORDER BY, LIMIT and OFFSET", async () => {
    const r = await run("select id from customers order by id desc offset 1 limit 3");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.rowCount).toBe(3);
    const ids = r.rows.map((row) => Number(row[0]));
    expect([...ids].sort((a, b) => b - a)).toEqual(ids);
  }, 60_000);

  it("runs CTEs, VALUES and set operations unchanged", async () => {
    const cte = await run(
      "with c as (select id from customers order by id limit 2) select * from c",
    );
    expect(cte.ok).toBe(true);
    const values = await run("values (1), (2)");
    expect(values.ok).toBe(true);
    if (values.ok) expect(values.rowCount).toBe(2);
    // Parenthesised on purpose: `limit` before `union` is a syntax error in PostgreSQL itself.
    const union = await run(
      "(select id from customers order by id limit 1) union select 0 order by id",
    );
    expect(union.ok).toBe(true);
  }, 60_000);

  it("returns two columns with the same output name without collapsing them", async () => {
    // Object row mode kept only the last value for a repeated key, so both columns showed it.
    const r = await run("select id, customer_id as id from orders order by 1 limit 1");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.columns.map((c) => c.name)).toEqual(["id", "id"]);
    expect(r.rows[0]?.[0]).not.toBe(r.rows[0]?.[1]);
  }, 60_000);

  it("points the error position at the learner's own character", async () => {
    const sql = "select nombre from customers";
    const r = await run(sql);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.sqlstate).toBe("42703");
    expect(sql.slice((r.position ?? 1) - 1, (r.position ?? 1) + 5)).toBe("nombre");
  }, 60_000);

  it("rejects a query that is only a comment before it reaches the engine", async () => {
    const r = await run("-- todavía no escribí nada");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.code).toBe("gate");
  });
});
