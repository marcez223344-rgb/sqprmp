import type { SandboxCell, SandboxColumn } from "@/lib/sandbox/types";

/**
 * Structured result comparison (docs/CONTENT_GUIDELINES.md §3, SQL_SANDBOX §4).
 * Pure and deterministic: no IO, no randomness. Every rule flag is unit-tested.
 */
export interface ExpectedColumn {
  name: string;
  type: "text" | "integer" | "numeric" | "boolean" | "date" | "timestamp" | "any";
}

export interface ValidationRules {
  order_matters: boolean;
  numeric_tolerance: number;
  allow_extra_columns: boolean;
  dedupe: boolean;
}

export interface ResultSet {
  columns: SandboxColumn[];
  rows: SandboxCell[][];
  truncated?: boolean;
}

export type FindingCategory =
  | "wrong_columns"
  | "wrong_column_order"
  | "row_count"
  | "cell_values"
  | "wrong_order"
  | "duplicates";

export interface Finding {
  category: FindingCategory;
  /** i18n key under `feedback.findings` with optional params. */
  messageKey: string;
  params?: Record<string, string | number>;
  /** Small, safe excerpt for the UI (never the full expected result). */
  details?: Record<string, unknown>;
}

export interface CompareOutcome {
  correct: boolean;
  findings: Finding[];
  /** Diagnostics used by the feedback engine (not shown raw). */
  stats: {
    actualRows: number;
    expectedRows: number;
    missingColumns: string[];
    extraColumns: string[];
    actualDuplicates: number;
  };
}

const normalizeName = (n: string) => n.trim().toLowerCase();

/** Canonical cell value for comparison; numeric strings from PGlite become numbers. */
export function canonical(
  cell: SandboxCell,
  type: ExpectedColumn["type"] | "unknown",
  tolerance: number,
): string {
  if (cell === null) return "∅";
  switch (type) {
    case "integer":
    case "numeric": {
      const n = typeof cell === "number" ? cell : Number(String(cell).replace(/,/g, ""));
      if (!Number.isFinite(n)) return String(cell);
      if (tolerance <= 0) return String(n);
      // Bucket by tolerance so 12.004 and 12.006 compare equal at 0.01.
      return (Math.round(n / tolerance) * tolerance).toFixed(
        Math.max(0, -Math.floor(Math.log10(tolerance))),
      );
    }
    case "boolean":
      return String(cell === true || cell === "true" || cell === "t");
    case "date":
      return String(cell).slice(0, 10);
    case "timestamp": {
      const t = Date.parse(String(cell));
      return Number.isFinite(t) ? new Date(t).toISOString() : String(cell);
    }
    case "text":
      return String(cell);
    default: {
      // Unknown type: numbers compare numerically when both parse.
      if (typeof cell === "number") return canonical(cell, "numeric", tolerance);
      const n = Number(cell);
      return String(cell).trim() !== "" && Number.isFinite(n)
        ? canonical(n, "numeric", tolerance)
        : String(cell);
    }
  }
}

function inferType(
  col: SandboxColumn | undefined,
  expected: ExpectedColumn | undefined,
): ExpectedColumn["type"] | "unknown" {
  if (expected && expected.type !== "any") return expected.type;
  switch (col?.type) {
    case "integer":
    case "bigint":
    case "smallint":
      return "integer";
    case "numeric":
    case "real":
    case "double precision":
      return "numeric";
    case "boolean":
      return "boolean";
    case "date":
      return "date";
    case "timestamp":
    case "timestamptz":
      return "timestamp";
    case "text":
    case "varchar":
    case "char":
      return "text";
    default:
      return "unknown";
  }
}

export function compareResults(
  actual: ResultSet,
  expected: ResultSet,
  expectedColumns: ExpectedColumn[],
  rules: ValidationRules,
): CompareOutcome {
  const findings: Finding[] = [];
  const actualNames = actual.columns.map((c) => normalizeName(c.name));
  const wantedNames = expectedColumns.map((c) => normalizeName(c.name));
  const missingColumns = wantedNames.filter((n) => !actualNames.includes(n));
  const extraColumns = actualNames.filter((n) => !wantedNames.includes(n));

  if (missingColumns.length) {
    findings.push({
      category: "wrong_columns",
      messageKey: "missing_columns",
      params: { columns: missingColumns.join(", ") },
    });
  }
  if (extraColumns.length && !rules.allow_extra_columns) {
    findings.push({
      category: "wrong_columns",
      messageKey: "extra_columns",
      params: { columns: extraColumns.join(", ") },
    });
  }
  if (!missingColumns.length && !rules.allow_extra_columns && !extraColumns.length) {
    const sameOrder = wantedNames.every((n, i) => actualNames[i] === n);
    if (!sameOrder)
      findings.push({
        category: "wrong_column_order",
        messageKey: "column_order",
        params: { expected: wantedNames.join(", ") },
      });
  }

  // Project both sides onto the expected columns (by name) for value comparison.
  const projectRow = (set: ResultSet, names: string[], row: SandboxCell[]): string[] =>
    names.map((n, i) => {
      const idx = set.columns.findIndex((c) => normalizeName(c.name) === n);
      const col = idx >= 0 ? set.columns[idx] : undefined;
      const type = inferType(col, expectedColumns[i]);
      return canonical(idx >= 0 ? (row[idx] ?? null) : null, type, rules.numeric_tolerance);
    });

  const comparableNames = wantedNames.filter((n) => actualNames.includes(n));
  const actualRows = actual.rows.map((r) => projectRow(actual, comparableNames, r));
  const expectedRows = expected.rows.map((r) => projectRow(expected, comparableNames, r));

  const key = (r: string[]) => r.join("");
  let actualKeys = actualRows.map(key);
  let expectedKeys = expectedRows.map(key);
  const actualDuplicates = actualKeys.length - new Set(actualKeys).size;
  const expectedDuplicates = expectedKeys.length - new Set(expectedKeys).size;
  if (rules.dedupe) {
    actualKeys = [...new Set(actualKeys)];
    expectedKeys = [...new Set(expectedKeys)];
  } else if (actualDuplicates > expectedDuplicates) {
    findings.push({
      category: "duplicates",
      messageKey: "duplicates",
      params: { count: actualDuplicates - expectedDuplicates },
    });
  }

  if (actualKeys.length !== expectedKeys.length) {
    findings.push({
      category: "row_count",
      messageKey: actual.truncated
        ? "row_count_truncated"
        : actualKeys.length > expectedKeys.length
          ? "too_many_rows"
          : "too_few_rows",
      params: { actual: actualKeys.length, expected: expectedKeys.length },
    });
  }

  // Multiset comparison of values (order-insensitive).
  const count = (keys: string[]) => {
    const m = new Map<string, number>();
    for (const k of keys) m.set(k, (m.get(k) ?? 0) + 1);
    return m;
  };
  const a = count(actualKeys);
  const e = count(expectedKeys);
  let missingRows = 0;
  let unexpectedRows = 0;
  for (const [k, n] of e) missingRows += Math.max(0, n - (a.get(k) ?? 0));
  for (const [k, n] of a) unexpectedRows += Math.max(0, n - (e.get(k) ?? 0));
  const valuesMatch = missingRows === 0 && unexpectedRows === 0;
  if (!valuesMatch && comparableNames.length && actualKeys.length === expectedKeys.length) {
    // Same size but different content: point to the first differing expected row (safe excerpt).
    const firstMissing = expectedRows.find((r) => (a.get(key(r)) ?? 0) < (e.get(key(r)) ?? 0));
    findings.push({
      category: "cell_values",
      messageKey: "cell_values",
      params: { missing: missingRows, unexpected: unexpectedRows },
      details: firstMissing
        ? { columns: comparableNames, exampleExpectedRow: firstMissing.slice(0, 6) }
        : undefined,
    });
  }

  let orderOk = true;
  if (rules.order_matters && valuesMatch) {
    orderOk = actualKeys.every((k, i) => k === expectedKeys[i]);
    if (!orderOk) findings.push({ category: "wrong_order", messageKey: "wrong_order" });
  }

  const correct =
    missingColumns.length === 0 &&
    (rules.allow_extra_columns || extraColumns.length === 0) &&
    !findings.some((f) => f.category === "wrong_column_order") &&
    valuesMatch &&
    actualKeys.length === expectedKeys.length &&
    orderOk &&
    !(actualDuplicates > expectedDuplicates && !rules.dedupe);

  return {
    correct,
    findings,
    stats: {
      actualRows: actual.rows.length,
      expectedRows: expected.rows.length,
      missingColumns,
      extraColumns,
      actualDuplicates,
    },
  };
}
