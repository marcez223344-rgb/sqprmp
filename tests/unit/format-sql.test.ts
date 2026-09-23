import { describe, expect, it } from "vitest";
import { parse } from "pgsql-ast-parser";
import { content } from "@/content/index";
import { formatSql } from "@/lib/validation/format-sql";
import { tokenizeSql } from "@/lib/validation/sql-tokens";

const sameMeaning = (a: string, b: string) =>
  JSON.stringify(parse(a)) === JSON.stringify(parse(b.replace(/;\s*$/, "")));

describe("formatSql", () => {
  it("re-indents the owner's query into the house style", () => {
    expect(formatSql("SELECT id,name,parent_id FROM categories")).toBe(
      "SELECT\n  id,\n  name,\n  parent_id\nFROM categories",
    );
  });

  it("puts each clause on its own line and breaks AND chains", () => {
    expect(
      formatSql(
        "select o.id, count(*) as n from orders o join customers c on c.id=o.customer_id where o.status='delivered' and o.total_amount>100 group by o.id order by n desc limit 10",
      ),
    ).toBe(
      [
        "SELECT",
        "  o.id,",
        "  count(*) AS n",
        "FROM orders o",
        "JOIN customers c ON c.id = o.customer_id",
        "WHERE o.status = 'delivered'",
        "  AND o.total_amount > 100",
        "GROUP BY o.id",
        "ORDER BY n DESC",
        "LIMIT 10",
      ].join("\n"),
    );
  });

  it("keeps multi-character operators and casts intact", () => {
    const out = formatSql("select x::text as t from t where a >= 1 and b <> 2 and c || 'x' = 'yx'");
    expect(out).toContain("x::text");
    expect(out).toContain("a >= 1");
    expect(out).toContain("b <> 2");
  });

  it("returns null instead of guessing", () => {
    // A comment would have to be moved, and moving it can change what it documents.
    expect(formatSql("select id from orders -- solo ids")).toBeNull();
    // Already formatted: nothing to offer.
    expect(formatSql("SELECT\n  id\nFROM orders")).toBeNull();
    expect(formatSql("   ")).toBeNull();
  });

  it("never changes the meaning of a query it agrees to format", () => {
    const samples = [
      "select id,name from categories",
      "select left(name,3) as ini, round(total_amount/2,1) from orders",
      "with t as (select 1 as x) select * from t",
      "select distinct city from customers order by city",
      "select a from t union all select b from u",
      "select case when x > 0 then 'si' else 'no' end as flag from t",
      "select count(*) filter (where x > 0) as n from t",
      "select id from orders where created_at >= date '2025-01-01' and id in (1,2,3)",
    ];
    for (const sql of samples) {
      const out = formatSql(sql);
      if (out === null) continue;
      expect(sameMeaning(sql, out), sql).toBe(true);
    }
  });

  it("produces the same tokens, in the same order, as the query it was given", () => {
    const sql = "select o.id,count(*) as n from orders o group by o.id order by n desc";
    const code = (s: string) =>
      tokenizeSql(s)
        .filter((t) => t.kind !== "whitespace")
        .map((t) => (t.kind === "word" ? t.value.toLowerCase() : t.value));
    expect(code(formatSql(sql)!)).toEqual(code(sql));
  });

  it("agrees with the authored reference solutions or declines, never mangles them", () => {
    const exercises = content.exercises as { slug: string; reference_solution: string }[];
    for (const ex of exercises) {
      const out = formatSql(ex.reference_solution);
      if (out === null) continue;
      expect(sameMeaning(ex.reference_solution, out), ex.slug).toBe(true);
    }
  }, 30_000);
});
