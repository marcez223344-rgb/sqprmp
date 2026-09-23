import { describe, expect, it } from "vitest";
import { ALLOWED_SCHEMAS, gateSql, type AllowedStatement } from "@/lib/sandbox/gate";

/**
 * Standing regression for one specific failure mode: `pgsql-ast-parser`'s default traversal
 * (`AstDefaultMapper`) does not descend into every node, so learner SQL planted in a skipped
 * position reaches the engine unanalysed. It happened three times (`ExprCall.over`,
 * `SelectFromStatement.distinct`, `FromCall.join`) plus `ExprRef.table`, each found by hand.
 *
 * Instead of reviewing the library again, this file drives the gate from a **list of positions**:
 * every place a learner can write an expression or a table reference. Adding a newly discovered
 * position is one entry. Each position is checked three ways:
 *
 * 1. a harmless call planted there must be *seen* (it shows up in `GateResult.functions`) — this is
 *    what actually catches an unvisited node, even when the payload is not itself denied;
 * 2. a denied function planted there must be rejected with `function_not_allowed`;
 * 3. a system-schema reference planted there must be rejected with `schema_not_allowed`.
 *
 * The harmless variant is also asserted to be accepted, so a template that merely fails to parse
 * can never masquerade as "blocked".
 *
 * **Read the position count as syntax coverage, not node coverage.** The 87 expression positions
 * map to roughly 55 distinct AST fields: several spellings deliberately collapse onto the same node
 * (`FETCH FIRST` and `LIMIT` are both `LimitStatement.limit`; `GROUP BY ROLLUP/CUBE`, `ANY (array)`,
 * `ALL (subquery)` and `POSITION(... in ...)` all parse to an ordinary `ExprCall` argument;
 * `CROSS JOIN LATERAL` is a `FromStatement.statement`). They are kept because the *grammar* is what
 * a learner writes and what a parser upgrade can change, but a duplicate here does not add a node.
 *
 * Fields that carry no `Expr` and no `Statement`, so they are deliberately **not** positions and
 * need no traversal (inventory for the next auditor):
 * - `ExprBinary.opSchema` / `ExprUnary.opSchema` — a schema string from `OPERATOR(schema.op)`; the
 *   engine answers `operator does not exist`, and no operator can be reached that way.
 * - `OnConflictOnConstraint.constraint` — a `QName`; PostgreSQL does not accept a qualified
 *   constraint name at all, so the schema half is unreachable.
 * - `SelectFromStatement.skip` (`nowait` / `skip locked`) — not reachable without `for`, which the
 *   gate rejects outright as a locking clause.
 * - `JoinClause.using` — `Name[]`; `FromCall.withOrdinality` — a boolean.
 * - `ExprConstant.dataType` — the parser never emits it for learner input (`date '2020-01-01'`
 *   parses as a cast), so it collapses into `ExprCast.to`, which the gate does visit.
 */

/** Payloads substituted into every expression position. */
const HARMLESS_EXPR = "abs(1)";
const HARMLESS_CALL = "abs";
const DENIED_EXPR = "pg_sleep(1)";
const SCHEMA_EXPR = "(select 1 from pg_catalog.pg_tables)";
const QUALIFIED_REF = "pg_catalog.pg_tables.tablename";

/** Payloads substituted into every table position. */
const HARMLESS_TABLE = "public.customers";
const SCHEMA_TABLE = "pg_catalog.pg_tables";

interface Position {
  name: string;
  sql: (payload: string) => string;
  allowed?: AllowedStatement[];
  /** A qualified column reference is not valid in this position (e.g. a FROM-clause argument). */
  noQualifiedRef?: boolean;
  /** The grammar does not accept a sublink here; the schema payload is checked another way. */
  noSublink?: boolean;
}

/**
 * Every expression-bearing position the gate is expected to analyse. Ordered roughly like the
 * grammar; the three historical bypasses are marked.
 */
const expressionPositions: Position[] = [
  { name: "selected column", sql: (x) => `select ${x} from t` },
  { name: "selected column with alias", sql: (x) => `select ${x} as v from t` },
  { name: "where", sql: (x) => `select a from t where ${x} is null` },
  { name: "group by", sql: (x) => `select a from t group by ${x}` },
  { name: "having", sql: (x) => `select count(*) from t group by a having ${x} is null` },
  { name: "order by", sql: (x) => `select a from t order by ${x}` },
  { name: "limit", sql: (x) => `select a from t limit ${x}` },
  { name: "offset", sql: (x) => `select a from t offset ${x}` },
  // SEC-01: SelectFromStatement.distinct is not visited by AstDefaultMapper.selection().
  { name: "distinct on (SEC-01)", sql: (x) => `select distinct on (${x}) a from t` },
  {
    name: "distinct on inside a CTE (SEC-01)",
    sql: (x) => `with q as (select distinct on (${x}) a from t) select * from q`,
  },
  { name: "join on, from a table", sql: (x) => `select a from t join u on ${x} is null` },
  // SEC-02: FromCall.join is dropped by AstDefaultMapper.fromCall().
  {
    name: "join on, from a function call (SEC-02)",
    sql: (x) => `select a from t join generate_series(1, 3) g on ${x} is null`,
  },
  {
    name: "left join on, from a function call (SEC-02)",
    sql: (x) => `select a from t left join generate_series(1, 3) g on ${x} is null`,
  },
  {
    name: "join on, from a function call after a subquery (SEC-02)",
    sql: (x) => `select a from (select 1 as a) s join generate_series(1, 3) g on ${x} is null`,
  },
  {
    name: "join on, from a subquery",
    sql: (x) => `select a from t join (select 1 as a) s on ${x} is null`,
  },
  {
    name: "function-call FROM item argument",
    sql: (x) => `select * from generate_series(1, ${x})`,
  },
  {
    name: "lateral function-call FROM item argument",
    sql: (x) => `select * from t, lateral generate_series(1, ${x}) g`,
  },
  { name: "lateral subquery body", sql: (x) => `select * from t, lateral (select ${x} as v) s` },
  { name: "subquery in FROM", sql: (x) => `select v from (select ${x} as v) s` },
  { name: "CTE body", sql: (x) => `with q as (select ${x} as v) select * from q` },
  {
    name: "recursive CTE seed",
    sql: (x) =>
      `with recursive r(n) as (select ${x} union all select n + 1 from r where n < 5) select * from r`,
  },
  { name: "union left branch", sql: (x) => `select ${x} union select a from t` },
  { name: "union all right branch", sql: (x) => `select a from t union all select ${x}` },
  { name: "intersect branch (rewritten)", sql: (x) => `select ${x} intersect select a from t` },
  { name: "except branch (rewritten)", sql: (x) => `select a from t except select ${x}` },
  { name: "values statement", sql: (x) => `values (${x})` },
  { name: "values in FROM", sql: (x) => `select * from (values (${x})) as v(a)` },
  { name: "case when", sql: (x) => `select case when ${x} is null then 1 end from t` },
  { name: "case value", sql: (x) => `select case ${x} when 1 then 2 end from t` },
  { name: "case then", sql: (x) => `select case when a is null then ${x} end from t` },
  { name: "case else", sql: (x) => `select case when a is null then 1 else ${x} end from t` },
  { name: "cast operand", sql: (x) => `select (${x})::text from t` },
  { name: "array literal element", sql: (x) => `select array[${x}] from t` },
  { name: "array subscript", sql: (x) => `select (array[1, 2])[${x}] from t` },
  { name: "IN list", sql: (x) => `select a from t where a in (${x}, 2)` },
  { name: "EXISTS sublink", sql: (x) => `select a from t where exists (select ${x})` },
  { name: "IN sublink", sql: (x) => `select a from t where a in (select ${x})` },
  { name: "ARRAY(select) sublink", sql: (x) => `select array(select ${x}) from t` },
  { name: "scalar subquery", sql: (x) => `select (select ${x}) from t` },
  { name: "call argument", sql: (x) => `select coalesce(${x}, 1) from t` },
  { name: "aggregate FILTER", sql: (x) => `select count(*) filter (where ${x} is null) from t` },
  { name: "aggregate ORDER BY", sql: (x) => `select string_agg(a, ',' order by ${x}) from t` },
  {
    name: "WITHIN GROUP",
    sql: (x) => `select percentile_cont(0.5) within group (order by ${x}) from t`,
  },
  // Fixed earlier (D-19): ExprCall.over is not visited by AstDefaultMapper.call().
  {
    name: "OVER partition by (D-19)",
    sql: (x) => `select count(*) over (partition by ${x}) from t`,
  },
  { name: "OVER order by (D-19)", sql: (x) => `select count(*) over (order by ${x}) from t` },
  {
    name: "FILTER + OVER combined",
    sql: (x) => `select count(*) filter (where a is null) over (partition by ${x}) from t`,
  },
  {
    name: "named window definition, partition by",
    sql: (x) => `select rank() over w from t window w as (partition by ${x})`,
  },
  {
    name: "named window definition, order by",
    sql: (x) => `select rank() over w from t window w as (order by ${x})`,
  },
  { name: "BETWEEN low bound", sql: (x) => `select a from t where a between ${x} and 2` },
  { name: "BETWEEN high bound", sql: (x) => `select a from t where a between 1 and ${x}` },
  { name: "unary operand", sql: (x) => `select a from t where not (${x} is null)` },
  { name: "binary right operand", sql: (x) => `select a from t where a = ${x}` },
  { name: "EXTRACT source", sql: (x) => `select extract(year from ${x}) from t` },
  { name: "SUBSTRING value", sql: (x) => `select substring(${x} from 1 for 2) from t` },
  { name: "SUBSTRING from", sql: (x) => `select substring(a from ${x}) from t` },
  { name: "SUBSTRING for", sql: (x) => `select substring(a from 1 for ${x}) from t` },
  { name: "OVERLAY from", sql: (x) => `select overlay(a placing 'b' from ${x}) from t` },
  { name: "row constructor", sql: (x) => `select a from t where (a, b) in ((1, ${x}))` },
  {
    name: "distinct on, second expression (SEC-01)",
    sql: (x) => `select distinct on (a, ${x}) a from t`,
  },
  { name: "ANY (array)", sql: (x) => `select a from t where a = any (array[${x}])` },
  { name: "ALL (subquery)", sql: (x) => `select a from t where a > all (select ${x})` },
  { name: "GROUP BY ROLLUP", sql: (x) => `select a from t group by rollup (${x})` },
  { name: "GROUP BY CUBE", sql: (x) => `select a from t group by cube (${x})` },
  // FETCH FIRST only accepts a simple expression: a sublink there is a parse error (fails closed).
  {
    name: "FETCH FIRST",
    sql: (x) => `select a from t fetch first ${x} rows only`,
    noSublink: true,
  },
  {
    // `FromCall.withOrdinality` is a boolean and carries nothing; the arguments are the position.
    name: "WITH ORDINALITY FROM item argument",
    sql: (x) => `select v from generate_series(1, ${x}) with ordinality as g(v, n)`,
  },
  {
    name: "CROSS JOIN LATERAL body",
    sql: (x) => `select a from t cross join lateral (select ${x} as v) s`,
  },
  { name: "FULL JOIN on", sql: (x) => `select a from t full join u on u.a = ${x}` },
  // `JoinClause.using` is `Name[]`, so it can never carry an expression: what is covered here is
  // the WHERE of a statement whose join uses USING rather than ON.
  {
    name: "where, with a JOIN USING",
    sql: (x) => `select a from t join u using (a) where a = ${x}`,
  },
  { name: "POSITION(... in ...)", sql: (x) => `select position('a' in (${x})::text) from t` },
  { name: "CAST(... as ...)", sql: (x) => `select cast(${x} as text) from t` },
  {
    name: "AT TIME ZONE left operand",
    sql: (x) => `select (${x})::timestamp at time zone 'UTC' from t`,
  },
  {
    name: "AT TIME ZONE zone operand",
    sql: (x) => `select a at time zone (${x})::text from t`,
  },
  { name: "JSON arrow operand", sql: (x) => `select (${x})::json -> 'k' from t` },
  {
    name: "ROW constructor argument",
    sql: (x) => `select a from t where row(a, b) = row(1, ${x})`,
  },
  { name: "sublink as an operand", sql: (x) => `select (select ${x}) is null from t` },
  {
    name: "UPDATE ... FROM where",
    sql: (x) => `update t set a = 1 from u where u.b = ${x}`,
    allowed: ["select", "update"],
  },
  {
    name: "ON CONFLICT where",
    sql: (x) => `insert into t (a) values (1) on conflict (a) do update set a = 1 where t.a = ${x}`,
    allowed: ["select", "insert"],
  },
  {
    name: "INSERT ... SELECT where",
    sql: (x) => `insert into t (a) select 1 from u where u.b = ${x}`,
    allowed: ["select", "insert"],
  },
  {
    name: "INSERT values",
    sql: (x) => `insert into t (a) values (${x})`,
    allowed: ["select", "insert"],
  },
  {
    name: "INSERT select",
    sql: (x) => `insert into t (a) select ${x} from u`,
    allowed: ["select", "insert"],
  },
  {
    name: "INSERT returning",
    sql: (x) => `insert into t (a) values (1) returning ${x}`,
    allowed: ["select", "insert"],
  },
  {
    name: "ON CONFLICT DO UPDATE value",
    sql: (x) => `insert into t (a) values (1) on conflict (a) do update set a = ${x}`,
    allowed: ["select", "insert"],
  },
  {
    name: "UPDATE set value",
    sql: (x) => `update t set a = ${x}`,
    allowed: ["select", "update"],
  },
  {
    name: "UPDATE where",
    sql: (x) => `update t set a = 1 where ${x} is null`,
    allowed: ["select", "update"],
  },
  {
    name: "UPDATE returning",
    sql: (x) => `update t set a = 1 returning ${x}`,
    allowed: ["select", "update"],
  },
  {
    name: "DELETE where",
    sql: (x) => `delete from t where ${x} is null`,
    allowed: ["select", "delete"],
  },
  {
    name: "DELETE returning",
    sql: (x) => `delete from t where a = 1 returning ${x}`,
    allowed: ["select", "delete"],
  },
];

/** Positions where a learner can name a table (the schema allowlist must reach all of them). */
const tablePositions: Position[] = [
  { name: "FROM", sql: (t) => `select 1 from ${t} x` },
  { name: "FROM, second item", sql: (t) => `select 1 from u, ${t} x` },
  { name: "JOIN", sql: (t) => `select 1 from u join ${t} x on 1 = 1` },
  {
    name: "JOIN after a function-call FROM item",
    sql: (t) => `select 1 from generate_series(1,3) g join ${t} x on 1 = 1`,
  },
  { name: "subquery in FROM", sql: (t) => `select 1 from (select 1 as a from ${t} x) s` },
  { name: "CTE body", sql: (t) => `with q as (select 1 as a from ${t} x) select * from q` },
  { name: "EXISTS sublink", sql: (t) => `select 1 from u where exists (select 1 from ${t} x)` },
  { name: "scalar subquery", sql: (t) => `select (select 1 from ${t} x limit 1) from u` },
  { name: "union branch", sql: (t) => `select 1 from u union select 1 from ${t} x` },
  { name: "except branch (rewritten)", sql: (t) => `select 1 from u except select 1 from ${t} x` },
  {
    name: "distinct on subquery (SEC-01)",
    sql: (t) => `select distinct on ((select 1 from ${t} x limit 1)) a from u`,
  },
  {
    name: "join on subquery, from a function call (SEC-02)",
    sql: (t) => `select a from u join generate_series(1,3) g on g = (select count(*) from ${t} x)`,
  },
  {
    name: "INSERT target",
    sql: (t) => `insert into ${t} (a) values (1)`,
    allowed: ["select", "insert"],
  },
  { name: "UPDATE target", sql: (t) => `update ${t} set a = 1`, allowed: ["select", "update"] },
  { name: "DELETE target", sql: (t) => `delete from ${t}`, allowed: ["select", "delete"] },
  {
    name: "named window definition",
    sql: (t) =>
      `select rank() over w from u window w as (partition by (select 1 from ${t} x limit 1))`,
  },
];

/**
 * Raw, reflection-based walk of the AST the gate returned: it descends into **every** property of
 * every node, which is exactly what `AstDefaultMapper` does not do. Anything it finds and the gate
 * did not report is an unvisited node.
 */
interface RawFindings {
  calls: string[];
  tables: string[];
  /** Schemas found on a call's function name (pg_catalog is legal there: `pg_catalog.upper(x)`). */
  callSchemas: string[];
  /** Schemas found anywhere else (FROM items, qualified column references). */
  otherSchemas: string[];
}

function rawWalk(node: unknown, found: RawFindings): void {
  if (Array.isArray(node)) {
    for (const child of node) rawWalk(child, found);
    return;
  }
  if (!node || typeof node !== "object") return;
  const n = node as Record<string, unknown>;
  const type = n.type;
  const qname = (v: unknown): { name?: string; schema?: string } | null =>
    v && typeof v === "object" ? (v as { name?: string; schema?: string }) : null;

  if (type === "call") {
    const fn = qname(n.function);
    if (fn?.name) found.calls.push(fn.name.toLowerCase());
    if (fn?.schema) found.callSchemas.push(fn.schema.toLowerCase());
  } else if (type === "table") {
    const name = qname(n.name);
    if (name?.name) found.tables.push(name.name.toLowerCase());
    if (name?.schema) found.otherSchemas.push(name.schema.toLowerCase());
  } else if (type === "ref") {
    const table = qname(n.table);
    if (table?.schema) found.otherSchemas.push(table.schema.toLowerCase());
  }
  for (const [key, value] of Object.entries(n)) {
    // `_location` is position bookkeeping, never SQL.
    if (key === "_location") continue;
    rawWalk(value, found);
  }
}

/** Everything the gate must have reported for `sql`, or a list of what it missed. */
function unseenNodes(sql: string, allowed?: AllowedStatement[]): string[] {
  const r = gateSql(sql, allowed ?? ["select"]);
  if (!r.ok || !r.ast) return [`gate rejected (${r.code ?? "?"})`];
  const found: RawFindings = { calls: [], tables: [], callSchemas: [], otherSchemas: [] };
  rawWalk(r.ast, found);
  const reportedFunctions = new Set(r.functions);
  const reportedTables = new Set(r.tables);
  const missed: string[] = [];
  for (const call of found.calls)
    if (!reportedFunctions.has(call)) missed.push(`call ${call}() not reported`);
  for (const table of found.tables)
    if (!reportedTables.has(table)) missed.push(`table ${table} not reported`);
  for (const schema of found.otherSchemas)
    if (!ALLOWED_SCHEMAS.has(schema)) missed.push(`schema ${schema} accepted`);
  for (const schema of found.callSchemas)
    if (!ALLOWED_SCHEMAS.has(schema) && schema !== "pg_catalog")
      missed.push(`function schema ${schema} accepted`);
  return missed;
}

describe("AST traversal coverage — every position the gate must analyse", () => {
  it(`accepts the harmless form of all ${expressionPositions.length} expression positions`, () => {
    const broken: string[] = [];
    for (const position of expressionPositions) {
      const sql = position.sql(HARMLESS_EXPR);
      const r = gateSql(sql, position.allowed ?? ["select"]);
      if (!r.ok) broken.push(`${position.name}: ${r.code} — ${sql}`);
    }
    // A template that does not parse would silently "pass" the denied-payload checks below.
    expect(broken).toEqual([]);
  });

  it("sees a harmless call planted in every expression position", () => {
    const unseen: string[] = [];
    for (const position of expressionPositions) {
      const sql = position.sql(HARMLESS_EXPR);
      const r = gateSql(sql, position.allowed ?? ["select"]);
      if (r.ok && !r.functions.includes(HARMLESS_CALL)) unseen.push(`${position.name} — ${sql}`);
    }
    expect(unseen).toEqual([]);
  });

  it("rejects a denied function planted in every expression position", () => {
    const leaks: string[] = [];
    for (const position of expressionPositions) {
      const sql = position.sql(DENIED_EXPR);
      const r = gateSql(sql, position.allowed ?? ["select"]);
      if (r.code !== "function_not_allowed") leaks.push(`${position.name}: ${r.code} — ${sql}`);
    }
    expect(leaks).toEqual([]);
  });

  it("rejects a system-schema subquery planted in every expression position", () => {
    const leaks: string[] = [];
    for (const position of expressionPositions) {
      if (position.noSublink) continue;
      const sql = position.sql(SCHEMA_EXPR);
      const r = gateSql(sql, position.allowed ?? ["select"]);
      if (r.code !== "schema_not_allowed") leaks.push(`${position.name}: ${r.code} — ${sql}`);
    }
    expect(leaks).toEqual([]);
  });

  it("rejects a schema-qualified column reference planted in every expression position", () => {
    const leaks: string[] = [];
    for (const position of expressionPositions) {
      if (position.noQualifiedRef) continue;
      const sql = position.sql(QUALIFIED_REF);
      const r = gateSql(sql, position.allowed ?? ["select"]);
      if (r.code !== "schema_not_allowed") leaks.push(`${position.name}: ${r.code} — ${sql}`);
    }
    expect(leaks).toEqual([]);
  });

  it(`accepts and reports every one of the ${tablePositions.length} table positions`, () => {
    const problems: string[] = [];
    for (const position of tablePositions) {
      const sql = position.sql(HARMLESS_TABLE);
      const r = gateSql(sql, position.allowed ?? ["select"]);
      if (!r.ok) problems.push(`${position.name}: ${r.code} — ${sql}`);
      else if (!r.tables.includes("customers")) problems.push(`${position.name} not reported`);
    }
    expect(problems).toEqual([]);
  });

  it("rejects a system-schema table in every table position", () => {
    const leaks: string[] = [];
    for (const position of tablePositions) {
      const sql = position.sql(SCHEMA_TABLE);
      const r = gateSql(sql, position.allowed ?? ["select"]);
      if (r.code !== "schema_not_allowed") leaks.push(`${position.name}: ${r.code} — ${sql}`);
    }
    expect(leaks).toEqual([]);
  });

  it("reports every call, table and schema a reflection walk finds in an accepted AST", () => {
    const corpus: { sql: string; allowed?: AllowedStatement[] }[] = [
      ...expressionPositions.map((p) => ({ sql: p.sql(HARMLESS_EXPR), allowed: p.allowed })),
      ...tablePositions.map((p) => ({ sql: p.sql(HARMLESS_TABLE), allowed: p.allowed })),
      {
        sql: "select count(*), upper(c.name) from public.customers c join orders o on o.customer_id = c.id group by 2 order by 1 desc limit 10",
      },
      {
        sql: "select distinct on (country) country, upper(city) from customers order by country, city",
      },
      {
        sql: "with q as (select coalesce(a, 0) as a from t) select sum(a) over (partition by abs(a)) from q",
      },
    ];
    const missed: string[] = [];
    for (const { sql, allowed } of corpus)
      for (const problem of unseenNodes(sql, allowed)) missed.push(`${problem} — ${sql}`);
    expect(missed).toEqual([]);
  });
});
