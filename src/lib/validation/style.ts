import type { Statement } from "pgsql-ast-parser";
import type { SqlConcept } from "@/content/schemas/common";
import { limits } from "@/config/limits";
import { codeOnly, isCode, tokenizeSql } from "./sql-tokens";

/**
 * Style and good-practice checks run on the learner's own query, so the feedback panel can teach
 * from what they wrote instead of only saying whether the result matched.
 *
 * Judgement rule (owner, 2026-09-23): a tip that fires on good SQL is worse than a missing tip.
 * Every check here is asserted silent on every reference solution in `src/content/exercises/**`
 * by `tests/unit/style.test.ts`. A check that cannot be made quiet on real solutions is removed,
 * not softened — two were (see the rejected notes below).
 *
 * None of these items is blocking: `buildFeedback` grades on the comparator alone.
 */

export type StyleSeverity = "warning" | "tip";

export interface StyleIssue {
  /** Matches `improvement_feedback.condition` in the exercise schema; message key `improve.<condition>`. */
  condition: string;
  severity: StyleSeverity;
}

type Node = Record<string, unknown> & { type?: string };

const walk = (root: unknown, visit: (n: Node) => void): void => {
  const seen = new Set<object>();
  const go = (node: unknown): void => {
    if (!node || typeof node !== "object" || seen.has(node)) return;
    seen.add(node);
    if (Array.isArray(node)) {
      node.forEach(go);
      return;
    }
    const n = node as Node;
    visit(n);
    for (const [k, v] of Object.entries(n)) if (k !== "type") go(v);
  };
  go(root);
};

const KEYWORD_RE = /\b(select|from|where|group by|order by|having|join|limit)\b/gi;
const CLAUSE_RE = /\b(where|group by|having|order by|join|limit)\b/gi;

const name = (v: unknown): string =>
  typeof v === "object" && v !== null
    ? String((v as { name?: unknown }).name ?? "").toLowerCase()
    : "";

/** Names bound by a WITH clause. They are local names the learner chose, not table names. */
function cteNames(statement: Statement): Set<string> {
  const names = new Set<string>();
  walk(statement, (n) => {
    if (n.type === "with" || n.type === "with recursive") {
      for (const bind of Array.isArray(n.bind) ? n.bind : []) {
        const alias = (bind as { alias?: { name?: string } }).alias;
        if (alias?.name) names.add(alias.name.toLowerCase());
      }
    }
  });
  return names;
}

/** Every `{ type: 'table', name, alias }` FROM item, at any depth. */
function fromTables(statement: Statement): { table: string; alias: string }[] {
  const out: { table: string; alias: string }[] = [];
  walk(statement, (n) => {
    if (n.type === "table" && n.name && typeof n.name === "object") {
      const ref = n.name as { name?: string; alias?: string };
      out.push({ table: String(ref.name ?? "").toLowerCase(), alias: String(ref.alias ?? "") });
    }
  });
  return out;
}

/** Table qualifiers actually used on a column reference (`o.total`, `public.orders.total`). */
function usedQualifiers(statement: Statement): Set<string> {
  const used = new Set<string>();
  walk(statement, (n) => {
    if (n.type === "ref" && n.table) used.add(name(n.table));
  });
  return used;
}

// --- individual checks -------------------------------------------------------------------------

/** LIMIT without ORDER BY: the rows returned are whatever the planner produced first. */
function limitWithoutOrderBy(statement: Statement, concepts: Set<SqlConcept>): boolean {
  const s = statement as unknown as Node;
  const hasLimit = Boolean((s.limit as { limit?: unknown } | undefined)?.limit);
  if (!hasLimit || s.orderBy) return false;
  // An ungrouped aggregate returns exactly one row: the LIMIT is redundant, not ambiguous.
  if (concepts.has("aggregate") && !s.groupBy) return false;
  return true;
}

function missingSpaceAfterComma(sql: string): boolean {
  const tokens = tokenizeSql(sql);
  return tokens.some((t, i) => {
    if (t.kind !== "punct" || t.value !== ",") return false;
    const next = tokens[i + 1];
    return Boolean(next) && isCode(next!);
  });
}

function oneLineQuery(sql: string): boolean {
  const code = codeOnly(sql);
  if (/\n/.test(code.trim())) return false;
  if (code.trim().length < limits.sandbox.feedback.oneLineMinChars) return false;
  if (!/\bfrom\b/i.test(code)) return false;
  const clauses = code.match(CLAUSE_RE) ?? [];
  return (
    new Set(clauses.map((c) => c.toLowerCase())).size >= limits.sandbox.feedback.oneLineMinClauses
  );
}

function keywordCase(sql: string): "mixed" | "lower" | "consistent" {
  const keywords = codeOnly(sql).match(KEYWORD_RE) ?? [];
  if (keywords.length < limits.sandbox.feedback.minKeywordsForCaseTip) return "consistent";
  const upper = keywords.filter((k) => k === k.toUpperCase()).length;
  if (upper === 0) return "lower";
  return upper < keywords.length ? "mixed" : "consistent";
}

function inconsistentIndentation(sql: string): boolean {
  const lines = sql.replace(/\r/g, "").split("\n");
  if (lines.length < limits.sandbox.feedback.minLinesForIndentTip) return false;
  const indents = lines
    .slice(1)
    .filter((line) => line.trim())
    .map((line) => /^[ \t]*/.exec(line)![0]);
  // Tabs mixed with spaces only. A width rule ("every indent is a multiple of the smallest") was
  // written first and rejected: it fired on 16 reference solutions that align continuation lines
  // under the SELECT list (7 spaces) with their AND at 2. That alignment is deliberate, and a tip
  // that argues with good SQL is worse than no tip.
  const hasTabs = indents.some((ind) => ind.includes("\t"));
  const hasSpaces = indents.some((ind) => ind.includes(" "));
  return hasTabs && hasSpaces;
}

/**
 * `ORDER BY 1`: renaming or reordering the select list silently changes the sort.
 * Grouped queries are exempt. `GROUP BY 1 … ORDER BY 1` is taught in this course and 6 reference
 * solutions sort an aggregate by position, where the select list is fixed by the GROUP BY anyway;
 * flagging them would contradict the lesson the learner just read. The tip is left for the case it
 * was written for: a plain projection sorted by a column number.
 */
function orderByOrdinal(statement: Statement): boolean {
  let found = false;
  walk(statement, (n) => {
    const by = n.orderBy;
    if (!Array.isArray(by) || n.groupBy) return;
    for (const item of by) {
      const expr = (item as { by?: Node }).by;
      if (expr?.type === "integer") found = true;
    }
  });
  return found;
}

/*
 * Rejected check: division whose divisor is a column or an aggregate without `nullif`. It looked
 * like the highest-value tip of the set and it fired on 38 reference solutions, which divide by
 * columns the dataset guarantees are non-zero. Reviving it needs column-level knowledge of the
 * snapshot (nullable / can-be-zero), not an AST walk.
 *
 * Rejected check: a WHERE predicate wrapping a column in a function (`lower(email) = '…'`,
 * `extract(year from created_at) = 2025`). Several exercises ask for exactly that filter, so the
 * tip would fire on their reference solutions; and with no indexes in the snapshots the
 * sargability argument is not even true here.
 */

/** `SELECT DISTINCT` on top of an aggregate: usually papering over rows a join duplicated. */
function distinctWithAggregate(statement: Statement, concepts: Set<SqlConcept>): boolean {
  const s = statement as unknown as Node;
  return Boolean(s.distinct) && concepts.has("aggregate");
}

/**
 * A single-letter alias that matches no word in the table name (`customers x`).
 * Self-references are exempt: in a self-join the second alias cannot repeat the initial, and
 * `products AS a` / `products AS b` is the idiom the content itself uses.
 */
function crypticTableAlias(statement: Statement): boolean {
  const tables = fromTables(statement);
  const ctes = cteNames(statement);
  const occurrences = new Map<string, number>();
  for (const { table } of tables) occurrences.set(table, (occurrences.get(table) ?? 0) + 1);
  return tables.some(({ table, alias }) => {
    if (alias.length !== 1 || !table) return false;
    if ((occurrences.get(table) ?? 0) > 1) return false;
    // A CTE name is already a label the learner invented; re-labelling it is their business.
    if (ctes.has(table)) return false;
    const initials = table.split("_").map((w) => w[0]);
    return !initials.includes(alias.toLowerCase());
  });
}

/** An alias declared and then never used to qualify a column, in a query with several tables. */
function unusedTableAlias(statement: Statement): boolean {
  const tables = fromTables(statement);
  if (tables.length < 2) return false;
  const used = usedQualifiers(statement);
  return tables.some(({ alias }) => alias && !used.has(alias.toLowerCase()));
}

// --- ordering ----------------------------------------------------------------------------------

/**
 * Most important first. The cap (`limits.sandbox.feedback.maxStyleItems`) cuts the tail, so this
 * order decides what a learner reads: real defects, then habits that cause bugs, then cosmetics.
 */
const ORDER = [
  "limit_without_order_by",
  "uses_between_for_timestamps",
  "uses_implicit_join",
  "order_by_ordinal",
  "uses_select_star",
  "distinct_with_aggregate",
  "no_table_alias_in_join",
  "missing_alias_on_aggregate",
  "unused_table_alias",
  "cryptic_table_alias",
  "missing_space_after_comma",
  "one_line_query",
  "inconsistent_indentation",
  "uppercase_inconsistent",
  "lowercase_keywords",
] as const;

/** Everything is a tip except the one item that is a real defect in the answer. */
const SEVERITY: Record<string, StyleSeverity> = { limit_without_order_by: "warning" };

/**
 * Readability and good-practice checks on the learner's query, ordered most important first.
 * Detection is separate from the cap (applied in `buildFeedback`) so tests can assert the full set.
 */
export function detectStyleIssues(
  sql: string,
  statement: Statement,
  concepts: Set<SqlConcept>,
): StyleIssue[] {
  const hit = new Set<string>();
  const s = statement as unknown as Node;
  // Comments and literal contents are blanked: `-- select * from …` is not a SELECT *.
  const code = codeOnly(sql);

  if (/select\s+(distinct\s+)?\*/i.test(code)) hit.add("uses_select_star");
  if (concepts.has("aggregate") && Array.isArray(s.columns)) {
    const cols = s.columns as { expr?: { type?: string }; alias?: unknown }[];
    if (cols.some((c) => c.expr?.type === "call" && !c.alias))
      hit.add("missing_alias_on_aggregate");
  }
  if ((concepts.has("inner_join") || concepts.has("outer_join")) && Array.isArray(s.from)) {
    // The alias of a FROM table lives on `name.alias`, not on the item: reading `f.alias` alone
    // made this fire on every joined query, including ones where every table was aliased.
    const froms = s.from as { alias?: unknown; type?: string; name?: { alias?: string } }[];
    if (froms.some((f) => f.type === "table" && !f.alias && !f.name?.alias))
      hit.add("no_table_alias_in_join");
  }
  if (
    /between\s+(date|timestamp|')/i.test(code) &&
    /created_at|paid_at|shipped_at|delivered_at|signup_at|_at\b/i.test(code)
  )
    hit.add("uses_between_for_timestamps");
  if (
    Array.isArray(s.from) &&
    (s.from as unknown[]).length > 1 &&
    !concepts.has("inner_join") &&
    !concepts.has("outer_join")
  )
    hit.add("uses_implicit_join");

  if (limitWithoutOrderBy(statement, concepts)) hit.add("limit_without_order_by");
  if (missingSpaceAfterComma(sql)) hit.add("missing_space_after_comma");
  if (oneLineQuery(sql)) hit.add("one_line_query");
  if (inconsistentIndentation(sql)) hit.add("inconsistent_indentation");
  const casing = keywordCase(sql);
  if (casing === "mixed") hit.add("uppercase_inconsistent");
  if (casing === "lower") hit.add("lowercase_keywords");
  if (orderByOrdinal(statement)) hit.add("order_by_ordinal");
  if (distinctWithAggregate(statement, concepts)) hit.add("distinct_with_aggregate");
  if (crypticTableAlias(statement)) hit.add("cryptic_table_alias");
  if (unusedTableAlias(statement)) hit.add("unused_table_alias");

  return ORDER.filter((c) => hit.has(c)).map((condition) => ({
    condition,
    severity: SEVERITY[condition] ?? "tip",
  }));
}
