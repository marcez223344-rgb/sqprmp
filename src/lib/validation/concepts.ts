import type { Statement } from "pgsql-ast-parser";
import type { SqlConcept } from "@/content/schemas/common";
import { detectStyleIssues } from "./style";

const AGGREGATES = new Set([
  "count",
  "sum",
  "avg",
  "min",
  "max",
  "string_agg",
  "array_agg",
  "bool_and",
  "bool_or",
]);
const RANKING = new Set(["row_number", "rank", "dense_rank", "ntile", "percent_rank", "cume_dist"]);
const LAG_LEAD = new Set(["lag", "lead", "first_value", "last_value", "nth_value"]);
const TEXT_FN = new Set([
  "upper",
  "lower",
  "initcap",
  "trim",
  "ltrim",
  "rtrim",
  "btrim",
  "substring",
  "substr",
  "left",
  "right",
  "length",
  "char_length",
  "replace",
  "position",
  "strpos",
  "split_part",
  "concat",
  "concat_ws",
  "lpad",
  "rpad",
  "reverse",
  "translate",
  "regexp_replace",
]);
const NUMERIC_FN = new Set([
  "round",
  "trunc",
  "ceil",
  "ceiling",
  "floor",
  "abs",
  "mod",
  "power",
  "sqrt",
  "sign",
  "div",
]);
const DATE_FN = new Set([
  "date_trunc",
  "extract",
  "date_part",
  "now",
  "current_date",
  "age",
  "to_char",
  "to_date",
  "make_date",
  "make_interval",
  "justify_days",
]);
const NULL_FN = new Set(["coalesce", "nullif"]);

/**
 * Detects SQL concepts used in a parsed statement. Used for required/prohibited concept
 * checks and for feedback heuristics. Conservative: false negatives are preferred to
 * false positives because a missing required concept blocks the exercise.
 */
export function detectConcepts(statement: Statement, functions: string[]): Set<SqlConcept> {
  const found = new Set<SqlConcept>();
  const seen = new Set<object>();

  const visit = (node: unknown, ctx: { inSubquery: boolean }): void => {
    if (!node || typeof node !== "object" || seen.has(node)) return;
    seen.add(node);
    if (Array.isArray(node)) {
      for (const n of node) visit(n, ctx);
      return;
    }
    const n = node as Record<string, unknown> & { type?: string };
    switch (n.type) {
      case "select":
        found.add("select");
        if (n.where) found.add("where");
        if (n.groupBy) found.add("group_by");
        if (n.having) found.add("having");
        if (n.orderBy) found.add("order_by");
        if (n.limit) found.add("limit");
        if (n.distinct) found.add("distinct");
        if (Array.isArray(n.columns) && n.columns.some((c) => (c as { alias?: unknown }).alias))
          found.add("alias");
        if (ctx.inSubquery) found.add("subquery");
        break;
      case "with":
      case "with recursive":
        found.add("cte");
        break;
      case "union":
      case "union all":
      case "intersect":
      case "except":
        found.add("set_operations");
        break;
      case "case":
        found.add("case");
        break;
      case "call": {
        const fn = String((n.function as { name?: string })?.name ?? "").toLowerCase();
        if (n.over) found.add("window_function");
        if (RANKING.has(fn)) found.add("ranking");
        if (LAG_LEAD.has(fn)) found.add("lag_lead");
        if (AGGREGATES.has(fn) && !n.over) found.add("aggregate");
        if (AGGREGATES.has(fn) && (n.filter || hasCaseArg(n))) found.add("conditional_aggregation");
        if (TEXT_FN.has(fn)) found.add("text_functions");
        if (NUMERIC_FN.has(fn)) found.add("numeric_functions");
        if (DATE_FN.has(fn)) found.add("date_functions");
        if (NULL_FN.has(fn)) found.add("null_handling");
        break;
      }
      case "unary":
        if (n.op === "IS NULL" || n.op === "IS NOT NULL") found.add("null_handling");
        break;
      case "extract":
        found.add("date_functions");
        break;
      case "table":
        if (n.join) {
          const jt = String((n.join as { type?: string }).type ?? "").toUpperCase();
          if (jt.includes("LEFT") || jt.includes("RIGHT") || jt.includes("FULL"))
            found.add("outer_join");
          else found.add("inner_join");
        }
        break;
      case "statement":
        // Nested statement in FROM/subquery
        break;
    }
    for (const [k, v] of Object.entries(n)) {
      if (k === "type") continue;
      const nestedSubquery =
        n.type === "select" && (k === "where" || k === "columns" || k === "having");
      const fromSubquery = k === "statement" && n.type === "statement";
      visit(v, { inSubquery: ctx.inSubquery || nestedSubquery || fromSubquery });
    }
  };
  visit(statement, { inSubquery: false });

  // Self join: same table referenced twice with joins.
  const tables = collectTables(statement);
  const dupes = tables.filter((t, i) => tables.indexOf(t) !== i);
  if (dupes.length && (found.has("inner_join") || found.has("outer_join"))) found.add("self_join");

  for (const f of functions) {
    if (AGGREGATES.has(f)) found.add("aggregate");
  }
  return found;
}

function hasCaseArg(call: Record<string, unknown>): boolean {
  const args = call.args;
  return Array.isArray(args) && args.some((a) => (a as { type?: string })?.type === "case");
}

export function collectTables(statement: Statement): string[] {
  const out: string[] = [];
  const walk = (node: unknown): void => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) return node.forEach(walk);
    const n = node as Record<string, unknown> & { type?: string; name?: unknown };
    if (n.type === "table" && n.name && typeof n.name === "object") {
      out.push(String((n.name as { name?: string }).name ?? "").toLowerCase());
    }
    for (const [k, v] of Object.entries(n)) if (k !== "type") walk(v);
  };
  walk(statement);
  return out;
}

/**
 * Heuristic readability checks that map to `improvement_feedback` conditions.
 * Kept as a thin wrapper over `detectStyleIssues` (src/lib/validation/style.ts), which owns the
 * checks and their order, so callers that only need the condition names do not carry severities.
 */
export function detectImprovements(
  sql: string,
  statement: Statement,
  concepts: Set<SqlConcept>,
): string[] {
  return detectStyleIssues(sql, statement, concepts).map((i) => i.condition);
}
