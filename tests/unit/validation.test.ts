import { describe, expect, it } from "vitest";
import { compareResults, type ResultSet } from "@/lib/validation/compare";
import { detectConcepts, detectImprovements } from "@/lib/validation/concepts";
import { buildFeedback } from "@/lib/validation/feedback";
import { gateSql } from "@/lib/sandbox/gate";

const col = (name: string, type = "text") => ({ name, type, dataTypeId: 0 });
const rules = {
  order_matters: false,
  numeric_tolerance: 0.01,
  allow_extra_columns: false,
  dedupe: false,
};
const expectedCols = [
  { name: "country", type: "text" as const },
  { name: "total", type: "numeric" as const },
];
const expected: ResultSet = {
  columns: [col("country"), col("total", "numeric")],
  rows: [
    ["AR", "100.00"],
    ["MX", "250.50"],
  ],
};

describe("compareResults", () => {
  it("accepts equal sets regardless of row order and numeric formatting", () => {
    const actual: ResultSet = {
      columns: [col("country"), col("total", "numeric")],
      rows: [
        ["MX", 250.5],
        ["AR", "100"],
      ],
    };
    const r = compareResults(actual, expected, expectedCols, rules);
    expect(r.correct).toBe(true);
    expect(r.findings).toEqual([]);
  });
  it("applies numeric tolerance", () => {
    const actual: ResultSet = {
      columns: [col("country"), col("total", "numeric")],
      rows: [
        ["AR", "100.004"],
        ["MX", "250.496"],
      ],
    };
    expect(compareResults(actual, expected, expectedCols, rules).correct).toBe(true);
    expect(
      compareResults(actual, expected, expectedCols, { ...rules, numeric_tolerance: 0 }).correct,
    ).toBe(false);
  });
  it("flags missing and extra columns", () => {
    const actual: ResultSet = {
      columns: [col("country"), col("ventas", "numeric")],
      rows: [
        ["AR", 1],
        ["MX", 2],
      ],
    };
    const r = compareResults(actual, expected, expectedCols, rules);
    expect(r.correct).toBe(false);
    expect(r.findings.map((f) => f.messageKey)).toEqual(
      expect.arrayContaining(["missing_columns", "extra_columns"]),
    );
  });
  it("tolerates extra columns when allowed but still requires column order otherwise", () => {
    const actual: ResultSet = {
      columns: [col("total", "numeric"), col("country")],
      rows: [
        [100, "AR"],
        [250.5, "MX"],
      ],
    };
    expect(
      compareResults(actual, expected, expectedCols, rules).findings.map((f) => f.category),
    ).toContain("wrong_column_order");
    const withExtra: ResultSet = {
      columns: [col("country"), col("total", "numeric"), col("x")],
      rows: [
        ["AR", 100, 1],
        ["MX", 250.5, 2],
      ],
    };
    expect(
      compareResults(withExtra, expected, expectedCols, { ...rules, allow_extra_columns: true })
        .correct,
    ).toBe(true);
  });
  it("reports row count and cell differences", () => {
    const more: ResultSet = {
      columns: [col("country"), col("total", "numeric")],
      rows: [
        ["AR", 100],
        ["MX", 250.5],
        ["CO", 1],
      ],
    };
    expect(
      compareResults(more, expected, expectedCols, rules).findings.map((f) => f.messageKey),
    ).toContain("too_many_rows");
    const wrong: ResultSet = {
      columns: [col("country"), col("total", "numeric")],
      rows: [
        ["AR", 100],
        ["MX", 999],
      ],
    };
    const r = compareResults(wrong, expected, expectedCols, rules);
    expect(r.findings.map((f) => f.messageKey)).toContain("cell_values");
    // The finding names the column whose values diverge (see tests/unit/compare-cell-values.test.ts).
    expect(r.findings.find((f) => f.messageKey === "cell_values")?.params).toEqual({
      columns: "total",
      count: 1,
    });
  });
  it("enforces order only when it matters", () => {
    const reversed: ResultSet = {
      columns: [col("country"), col("total", "numeric")],
      rows: [
        ["MX", 250.5],
        ["AR", 100],
      ],
    };
    expect(
      compareResults(reversed, expected, expectedCols, {
        ...rules,
        order_matters: true,
      }).findings.map((f) => f.category),
    ).toContain("wrong_order");
    expect(compareResults(reversed, expected, expectedCols, rules).correct).toBe(true);
  });
  it("detects duplicate rows and supports dedupe", () => {
    const dup: ResultSet = {
      columns: [col("country"), col("total", "numeric")],
      rows: [
        ["AR", 100],
        ["AR", 100],
        ["MX", 250.5],
      ],
    };
    expect(
      compareResults(dup, expected, expectedCols, rules).findings.map((f) => f.category),
    ).toContain("duplicates");
    expect(compareResults(dup, expected, expectedCols, { ...rules, dedupe: true }).correct).toBe(
      true,
    );
  });
  it("treats NULL, booleans, dates and timestamps canonically", () => {
    const exp: ResultSet = {
      columns: [col("d", "date"), col("b", "boolean"), col("n")],
      rows: [["2025-01-01", true, null]],
    };
    const act: ResultSet = {
      columns: [col("d", "date"), col("b", "boolean"), col("n")],
      rows: [["2025-01-01T00:00:00.000Z", "true", null]],
    };
    expect(
      compareResults(
        act,
        exp,
        [
          { name: "d", type: "date" },
          { name: "b", type: "boolean" },
          { name: "n", type: "any" },
        ],
        rules,
      ).correct,
    ).toBe(true);
  });
});

describe("detectConcepts", () => {
  const concepts = (sql: string) => {
    const g = gateSql(sql);
    if (!g.ok || !g.ast) throw new Error(g.message);
    return detectConcepts(g.ast, g.functions);
  };
  it("recognizes core clauses and joins", () => {
    const c = concepts(
      "select c.country, count(*) as n from orders o join customers c on c.id = o.customer_id where o.status = 'delivered' group by c.country having count(*) > 1 order by n desc limit 5",
    );
    for (const k of [
      "select",
      "where",
      "group_by",
      "having",
      "order_by",
      "limit",
      "inner_join",
      "aggregate",
      "alias",
    ])
      expect(c.has(k as never), k).toBe(true);
    expect(c.has("outer_join")).toBe(false);
  });
  it("recognizes outer joins, CTEs, windows, subqueries and null handling", () => {
    expect(concepts("with x as (select 1 as a) select coalesce(a, 0) from x").has("cte")).toBe(
      true,
    );
    expect(
      concepts("with x as (select 1 as a) select coalesce(a, 0) from x").has("null_handling"),
    ).toBe(true);
    expect(
      concepts(
        "select * from customers c left join orders o on o.customer_id = c.id where o.id is null",
      ).has("outer_join"),
    ).toBe(true);
    expect(
      concepts("select row_number() over (order by id) from orders").has("window_function"),
    ).toBe(true);
    expect(concepts("select row_number() over (order by id) from orders").has("ranking")).toBe(
      true,
    );
    expect(
      concepts("select * from orders where customer_id in (select id from customers)").has(
        "subquery",
      ),
    ).toBe(true);
    expect(
      concepts("select count(*) filter (where status = 'x') from orders").has(
        "conditional_aggregation",
      ),
    ).toBe(true);
    expect(
      concepts("select date_trunc('month', created_at) from orders").has("date_functions"),
    ).toBe(true);
  });
  it("recognizes joins on derived tables, LATERAL, VALUES and set-returning functions", () => {
    const has = (sql: string, k: "outer_join" | "inner_join") => concepts(sql).has(k);
    const derived = "(select customer_id, count(*) as n from orders group by customer_id) as f";
    for (const kind of ["left", "right", "full"])
      expect(
        has(
          `select c.id, f.n from customers c ${kind} join ${derived} on f.customer_id = c.id`,
          "outer_join",
        ),
        kind,
      ).toBe(true);
    expect(
      has(
        `select c.id, f.n from customers c join ${derived} on f.customer_id = c.id`,
        "inner_join",
      ),
    ).toBe(true);
    expect(
      has(
        `select c.id, f.n from customers c inner join ${derived} on f.customer_id = c.id`,
        "outer_join",
      ),
    ).toBe(false);
    expect(
      has(
        "select c.id, l.n from customers c left join lateral (select count(*) as n from orders o where o.customer_id = c.id) l on true",
        "outer_join",
      ),
    ).toBe(true);
    expect(
      has(
        "select c.id, l.n from customers c cross join lateral (select count(*) as n from orders o where o.customer_id = c.id) l",
        "inner_join",
      ),
    ).toBe(true);
    expect(
      has(
        "select c.id, v.label from customers c left join (values ('AR', 'Argentina')) as v(code, label) on v.code = c.country",
        "outer_join",
      ),
    ).toBe(true);
    expect(
      has(
        "select g.d, count(o.id) from generate_series(1, 12) as g(d) left join orders o on extract(month from o.created_at) = g.d group by g.d",
        "outer_join",
      ),
    ).toBe(true);
    expect(
      has(
        "select c.id from customers c left join generate_series(1, 3) as g(n) on g.n = c.id",
        "outer_join",
      ),
    ).toBe(true);
    // A function call in an expression is not a join.
    expect(has("select coalesce(id, 0) from customers", "inner_join")).toBe(false);
  });
  it("counts the % operator as numeric_functions, like mod()", () => {
    expect(concepts("select stock % 12 as loose from products").has("numeric_functions")).toBe(
      true,
    );
    expect(concepts("select mod(stock, 12) from products").has("numeric_functions")).toBe(true);
    expect(concepts("select stock / 12 from products").has("numeric_functions")).toBe(false);
  });
});

describe("buildFeedback", () => {
  const run = (
    sql: string,
    actualRows: number,
    expectedRows: number,
    extra: Partial<Parameters<typeof buildFeedback>[0]> = {},
  ) => {
    const g = gateSql(sql);
    if (!g.ok || !g.ast) throw new Error(g.message);
    const mk = (n: number): ResultSet => ({
      columns: [col("id", "integer")],
      rows: Array.from({ length: n }, (_, i) => [i]),
    });
    const compare = compareResults(
      mk(actualRows),
      mk(expectedRows),
      [{ name: "id", type: "integer" }],
      rules,
    );
    return buildFeedback({
      sql,
      statement: g.ast,
      functions: g.functions,
      compare,
      requiredConcepts: [],
      prohibitedPatterns: [],
      commonMistakeCategories: [],
      improvementConditions: [],
      ...extra,
    });
  };
  it("is correct only when comparator passes and no blocking items exist", () => {
    expect(run("select id from orders", 3, 3).correct).toBe(true);
    expect(run("select id from orders", 3, 3, { requiredConcepts: ["where"] }).correct).toBe(false);
  });
  it("suggests a missing filter when rows exceed and WHERE is required but absent", () => {
    const fb = run("select id from orders", 10, 3, { requiredConcepts: ["where"] });
    expect(fb.items.map((i) => i.category)).toContain("missing_filter");
  });
  it("flags multiplying joins", () => {
    const fb = run(
      "select o.id from orders o join order_items i on i.order_id = o.order_id",
      12,
      3,
    );
    expect(fb.items.map((i) => i.messageKey)).toContain("join_multiplies_rows");
  });
  it("adds readability tips without blocking", () => {
    const fb = run("select * from orders o join customers on customers.id = o.customer_id", 3, 3);
    expect(fb.correct).toBe(true);
    expect(fb.items.filter((i) => i.severity === "tip").map((i) => i.messageKey)).toEqual(
      expect.arrayContaining(["improve.uses_select_star", "improve.no_table_alias_in_join"]),
    );
  });
  it("round 6 item 11: explains `<= 'día'` on a timestamp however many rows the last day holds", () => {
    const sql =
      "select id from orders where created_at >= '2025-03-01' and created_at <= '2025-03-15'";
    // 31 of 510 rows lost: above the 5 % window the generic heuristics use.
    const fb = run(sql, 479, 510, { commonMistakeCategories: ["date_boundary"] });
    expect(fb.correct).toBe(false);
    expect(fb.items.map((i) => i.category)).toContain("date_boundary");
    const between = run(
      "select id from orders where created_at between date '2025-03-01' and date '2025-03-15'",
      479,
      510,
      { commonMistakeCategories: ["date_boundary"] },
    );
    expect(between.items.map((i) => i.category)).toContain("date_boundary");
    // Not flagged when the exercise does not list the mistake, or when the rows match.
    expect(run(sql, 479, 510).items.map((i) => i.category)).not.toContain("date_boundary");
    expect(
      run(sql, 510, 510, { commonMistakeCategories: ["date_boundary"] }).items.map(
        (i) => i.category,
      ),
    ).not.toContain("date_boundary");
    // A large gap with a half-open range is some other defect, not the boundary.
    expect(
      run("select id from orders where created_at < '2025-03-16'", 100, 510, {
        commonMistakeCategories: ["date_boundary"],
      }).items.map((i) => i.category),
    ).not.toContain("date_boundary");
  });
  it("blocks prohibited patterns", () => {
    const fb = run("select id from orders limit 5", 3, 3, { prohibitedPatterns: ["\\blimit\\b"] });
    expect(fb.correct).toBe(false);
    expect(fb.items.map((i) => i.category)).toContain("prohibited_pattern");
  });
  it("detectImprovements: BETWEEN on timestamps and mixed case", () => {
    const g = gateSql(
      "select id FROM orders where created_at between date '2025-01-01' and date '2025-01-31'",
    );
    if (!g.ok || !g.ast) throw new Error();
    const tips = detectImprovements(
      "select id FROM orders where created_at between date '2025-01-01' and date '2025-01-31'",
      g.ast,
      detectConcepts(g.ast, g.functions),
    );
    expect(tips).toEqual(
      expect.arrayContaining(["uses_between_for_timestamps", "uppercase_inconsistent"]),
    );
  });
});
