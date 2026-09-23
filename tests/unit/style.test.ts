import { describe, expect, it } from "vitest";
import { limits } from "@/config/limits";
import { content } from "@/content/index";
import { gateSql } from "@/lib/sandbox/gate";
import { detectConcepts } from "@/lib/validation/concepts";
import { detectStyleIssues } from "@/lib/validation/style";
import { buildFeedback } from "@/lib/validation/feedback";
import { compareResults, type ResultSet } from "@/lib/validation/compare";

const issues = (
  sql: string,
  allowed: ("select" | "insert" | "update" | "delete")[] = ["select"],
) => {
  const g = gateSql(sql, allowed);
  if (!g.ok || !g.ast) throw new Error(`gate rejected: ${g.message}`);
  return detectStyleIssues(sql, g.ast, detectConcepts(g.ast, g.functions));
};
const conditions = (sql: string) => issues(sql).map((i) => i.condition);

describe("detectStyleIssues — the cases the owner reported", () => {
  it("flags a missing space after a comma in the select list", () => {
    // The exact query from the 2026-09-23 session: the app said nothing about it before.
    expect(conditions("SELECT id,name,parent_id FROM categories")).toEqual([
      "missing_space_after_comma",
    ]);
  });
  it("does not flag a select list that is already spaced", () => {
    expect(conditions("SELECT id, name, parent_id FROM categories")).toEqual([]);
  });
  it("ignores a comma inside a string literal or a comment", () => {
    expect(conditions("SELECT id FROM customers WHERE city = 'Bogotá,Colombia'")).toEqual([]);
    expect(conditions("SELECT id FROM customers -- id,nombre,ciudad")).toEqual([]);
  });
});

describe("detectStyleIssues — formatting", () => {
  const long =
    "select o.id, o.total_amount from orders o join customers c on c.id = o.customer_id where o.status = 'delivered' order by o.total_amount desc";
  it("asks for line breaks only when a one-line query is genuinely complex", () => {
    expect(conditions(long)).toContain("one_line_query");
    // Short and single-clause: nothing to wrap.
    expect(conditions("select a, b from t")).not.toContain("one_line_query");
    expect(
      conditions("select id, total_amount from orders where status = 'delivered'"),
    ).not.toContain("one_line_query");
  });
  it("respects the configured minimum length", () => {
    expect(long.replace(/\s+/g, " ").length).toBeGreaterThan(
      limits.sandbox.feedback.oneLineMinChars,
    );
  });
  it("keeps all-lowercase keywords as a gentle tip, separate from mixed case", () => {
    expect(conditions("select id from orders where id > 1")).toContain("lowercase_keywords");
    expect(conditions("select id FROM orders where id > 1")).toContain("uppercase_inconsistent");
    expect(conditions("select id FROM orders where id > 1")).not.toContain("lowercase_keywords");
    expect(conditions("SELECT id FROM orders WHERE id > 1")).toEqual([]);
  });
  it("flags indentation that mixes tabs and spaces, and nothing else", () => {
    expect(conditions("SELECT\n\tid,\n  name\nFROM categories")).toContain(
      "inconsistent_indentation",
    );
    // Continuation lines aligned under the select list are correct, not inconsistent.
    expect(
      conditions("SELECT id,\n       name\nFROM categories\nWHERE id > 1\n  AND name IS NOT NULL"),
    ).not.toContain("inconsistent_indentation");
  });
});

describe("detectStyleIssues — correctness smells", () => {
  it("warns about LIMIT without ORDER BY", () => {
    const found = issues("SELECT id, total_amount FROM orders LIMIT 10");
    expect(found).toEqual([{ condition: "limit_without_order_by", severity: "warning" }]);
  });
  it("stays quiet when LIMIT has an ORDER BY or the query returns one aggregate row", () => {
    expect(conditions("SELECT id FROM orders ORDER BY id LIMIT 10")).toEqual([]);
    expect(conditions("SELECT count(*) AS total FROM orders LIMIT 1")).toEqual([]);
  });
  it("flags a numeric literal in ORDER BY on a plain projection", () => {
    expect(conditions("SELECT id, city FROM customers ORDER BY 2")).toContain("order_by_ordinal");
    // Grouped queries are exempt: `GROUP BY 1 ... ORDER BY 1` is taught in this course.
    expect(conditions("SELECT city, count(*) AS n FROM customers GROUP BY 1 ORDER BY 1")).toEqual(
      [],
    );
  });
  it("flags SELECT DISTINCT combined with an aggregate", () => {
    expect(
      conditions("SELECT DISTINCT c.city, count(*) AS n FROM customers c GROUP BY c.city"),
    ).toContain("distinct_with_aggregate");
  });
});

describe("detectStyleIssues — aliases", () => {
  it("flags a single-letter alias unrelated to the table name", () => {
    expect(conditions("SELECT x.id FROM customers x ORDER BY x.id")).toContain(
      "cryptic_table_alias",
    );
  });
  it("accepts the usual initials and self-join letters", () => {
    expect(conditions("SELECT o.id FROM orders o ORDER BY o.id")).toEqual([]);
    expect(conditions("SELECT i.order_id FROM order_items i ORDER BY i.order_id")).toEqual([]);
    expect(
      conditions(
        "SELECT a.id FROM products AS a INNER JOIN products AS b ON b.id > a.id ORDER BY a.id",
      ),
    ).toEqual([]);
  });
  it("flags an alias that is declared and never used", () => {
    expect(
      conditions(
        "SELECT orders.id FROM orders o INNER JOIN customers c ON customers.id = orders.customer_id",
      ),
    ).toContain("unused_table_alias");
  });
});

describe("style feedback in buildFeedback", () => {
  const rules = {
    order_matters: false,
    numeric_tolerance: 0.01,
    allow_extra_columns: false,
    dedupe: false,
  };
  const set = (n: number): ResultSet => ({
    columns: [{ name: "id", type: "integer", dataTypeId: 23 }],
    rows: Array.from({ length: n }, (_, i) => [i]),
  });
  const build = (sql: string) => {
    const g = gateSql(sql);
    if (!g.ok || !g.ast) throw new Error(g.message);
    return buildFeedback({
      sql,
      statement: g.ast,
      functions: g.functions,
      compare: compareResults(set(3), set(3), [{ name: "id", type: "integer" }], rules),
      requiredConcepts: [],
      prohibitedPatterns: [],
      commonMistakeCategories: [],
      improvementConditions: [],
    });
  };

  it("never changes whether the answer is graded correct", () => {
    const messy = build("select id,city from customers limit 3");
    expect(messy.correct).toBe(true);
    expect(messy.items.some((i) => i.severity === "blocking")).toBe(false);
    expect(messy.items.some((i) => i.severity === "warning")).toBe(true);
  });

  it("caps the number of style items and keeps the most important ones", () => {
    const noisy = build(
      "select *,customers.city from orders o,customers where o.customer_id=customers.id limit 5",
    );
    const style = noisy.items.filter(
      (i) => i.category === "readability" && i.messageKey !== "improve.formatted_version",
    );
    expect(style.length).toBeLessThanOrEqual(limits.sandbox.feedback.maxStyleItems);
    expect(style[0]?.messageKey).toBe("improve.limit_without_order_by");
    expect(noisy.correct).toBe(true);
  });

  it("offers the learner's own query re-indented", () => {
    const fb = build("select id,city from customers order by id");
    const formatted = fb.items.find((i) => i.messageKey === "improve.formatted_version");
    expect(String(formatted?.params?.formatted)).toBe(
      "SELECT\n  id,\n  city\nFROM customers\nORDER BY id",
    );
  });

  it("offers nothing to reformat when there is no style issue", () => {
    const fb = build("SELECT id, city\nFROM customers\nORDER BY id");
    expect(fb.items.filter((i) => i.category === "readability")).toEqual([]);
  });
});

describe("no style tip fires on a reference solution", () => {
  // The hard rule from the owner: a tip that argues with good SQL is worse than a missing tip.
  // Every authored reference solution is real, reviewed SQL, so the detector must be silent on all
  // of them. When this fails, fix the check — do not add an exception.
  const exercises = content.exercises as {
    slug: string;
    reference_solution: string;
    allowed_statements?: ("select" | "insert" | "update" | "delete")[];
  }[];
  it("covers every published exercise", () => {
    expect(exercises.length).toBeGreaterThan(100);
  });
  it.each(exercises.map((ex) => [ex.slug, ex] as const))("%s", (_slug, ex) => {
    expect(issues(ex.reference_solution, ex.allowed_statements ?? ["select"])).toEqual([]);
  });
});
