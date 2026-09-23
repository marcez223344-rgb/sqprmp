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
    /** Comparable columns whose set of values does not match the expected one. */
    differingColumns: string[];
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

const asNumber = (cell: SandboxCell): number | null => {
  if (cell === null || typeof cell === "boolean") return null;
  const n = typeof cell === "number" ? cell : Number(String(cell).trim());
  return Number.isFinite(n) && String(cell).trim() !== "" ? n : null;
};

/** Short, safe rendering of one cell for a feedback message. */
const showCell = (cell: SandboxCell): string => {
  if (cell === null) return "NULL";
  if (typeof cell === "number") return String(Math.round(cell * 1e6) / 1e6);
  const s = String(cell);
  return s.length > 40 ? `${s.slice(0, 40)}…` : s;
};

/** Rounds a ratio to a round number when it is within 0.5 % of one, so "100" beats "99.97". */
const niceFactor = (ratio: number): number => {
  for (const candidate of [1000, 100, 60, 12, 10, 2]) {
    if (Math.abs(ratio - candidate) / candidate < 0.005) return candidate;
    if (Math.abs(ratio - 1 / candidate) * candidate < 0.005) return 1 / candidate;
  }
  return Math.round(ratio * 1000) / 1000;
};

export interface ValueDifference {
  /** Columns whose values do not match, in expected-column order. */
  columns: string[];
  /** First differing column plus one pair of values from it. */
  example?: { column: string; actual: SandboxCell; expected: SandboxCell };
  /**
   * How `example`'s two values were matched up: on the columns whose values do agree, or — when no
   * column agrees — by row position, which is a guess. Callers use this before quoting an expected
   * value: a positional pair may not even be the row the learner would compare.
   */
  pairedBy?: "columns" | "position";
  /** A single ratio or offset that explains every differing numeric value in that column. */
  pattern?: { kind: "ratio" | "offset"; column: string; value: number };
}

/**
 * Explains *which* columns differ and, when possible, *how* — the part a learner can act on.
 *
 * Why this exists: the previous message said "la cantidad de filas coincide pero algunos valores
 * difieren (18 filas esperadas no aparecen)". The owner read the 18 as a row count and went looking
 * for a phantom row-count bug in a query whose real defect was a missing `* 100` (2026-09-23).
 *
 * Rows are paired on the columns that *do* match (an id, a name), which is what makes a per-column
 * example meaningful when the learner's row order differs from the expected one.
 */
export function describeValueDifferences(
  actualRows: SandboxCell[][],
  expectedRows: SandboxCell[][],
  canonicalActual: string[][],
  canonicalExpected: string[][],
  names: string[],
): ValueDifference {
  const multiset = (rows: string[][], j: number) => {
    const m = new Map<string, number>();
    for (const r of rows) m.set(r[j]!, (m.get(r[j]!) ?? 0) + 1);
    return m;
  };
  const columns: string[] = [];
  names.forEach((n, j) => {
    const a = multiset(canonicalActual, j);
    const e = multiset(canonicalExpected, j);
    const same = a.size === e.size && [...e].every(([k, c]) => a.get(k) === c);
    if (!same) columns.push(n);
  });
  if (!columns.length) return { columns };

  const keyIdx = names.map((n, j) => j).filter((j) => !columns.includes(names[j]!));
  const rowKey = (row: string[]) => keyIdx.map((j) => row[j]).join("\u0001");
  const byKey = new Map<string, number[]>();
  if (keyIdx.length) {
    canonicalExpected.forEach((r, i) => {
      const k = rowKey(r);
      byKey.set(k, [...(byKey.get(k) ?? []), i]);
    });
  }

  // Pair each actual row with its expected row: on the matching columns when there are any,
  // otherwise by position (both sides are usually sorted the same way).
  const pairs: { actualIdx: number; expectedIdx: number }[] = [];
  const consumed = new Map<string, number>();
  actualRows.forEach((_r, i) => {
    if (keyIdx.length) {
      const k = rowKey(canonicalActual[i]!);
      const list = byKey.get(k);
      if (!list) return;
      const used = consumed.get(k) ?? 0;
      if (used >= list.length) return;
      consumed.set(k, used + 1);
      pairs.push({ actualIdx: i, expectedIdx: list[used]! });
    } else if (i < expectedRows.length) pairs.push({ actualIdx: i, expectedIdx: i });
  });

  const column = columns[0]!;
  const j = names.indexOf(column);
  const differing = pairs.filter(
    ({ actualIdx, expectedIdx }) =>
      canonicalActual[actualIdx]![j] !== canonicalExpected[expectedIdx]![j],
  );
  const first = differing[0];
  const out: ValueDifference = { columns, pairedBy: keyIdx.length ? "columns" : "position" };
  if (first)
    out.example = {
      column,
      actual: actualRows[first.actualIdx]![j] ?? null,
      expected: expectedRows[first.expectedIdx]![j] ?? null,
    };

  // A constant ratio or offset across every differing value is the cheapest possible diagnosis of
  // a formula bug: "off by 100" says "you forgot the * 100" better than any generic message.
  const numeric = differing
    .map(({ actualIdx, expectedIdx }) => ({
      a: asNumber(actualRows[actualIdx]![j] ?? null),
      e: asNumber(expectedRows[expectedIdx]![j] ?? null),
    }))
    .filter((p): p is { a: number; e: number } => p.a !== null && p.e !== null);
  // Two differing values minimum: any single pair trivially has a "constant" ratio, and claiming
  // "your values are 1.25 times smaller" about one row would be noise dressed as a diagnosis.
  if (numeric.length >= 2 && numeric.length === differing.length) {
    const ratios = numeric
      .filter((p) => p.a !== 0)
      .map((p) => p.e / p.a)
      .filter((r) => Number.isFinite(r) && r !== 0);
    const consistent = (values: number[], tolerance: number) =>
      values.length > 0 &&
      values.every(
        (v) => Math.abs(v - values[0]!) <= tolerance * Math.max(1, Math.abs(values[0]!)),
      );
    if (ratios.length === numeric.length && consistent(ratios, 0.005)) {
      const factor = niceFactor(ratios[0]!);
      if (Math.abs(factor - 1) > 0.005) out.pattern = { kind: "ratio", column, value: factor };
    }
    if (!out.pattern) {
      const offsets = numeric.map((p) => p.e - p.a);
      if (consistent(offsets, 1e-9) && Math.abs(offsets[0]!) > 1e-9)
        out.pattern = { kind: "offset", column, value: Math.round(offsets[0]! * 1e6) / 1e6 };
    }
  }
  return out;
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

  /** The same projection without canonicalization: needed to quote a value back to the learner. */
  const projectRaw = (set: ResultSet, names: string[], row: SandboxCell[]): SandboxCell[] =>
    names.map((n) => {
      const idx = set.columns.findIndex((c) => normalizeName(c.name) === n);
      return idx >= 0 ? (row[idx] ?? null) : null;
    });

  const comparableNames = wantedNames.filter((n) => actualNames.includes(n));
  const actualRows = actual.rows.map((r) => projectRow(actual, comparableNames, r));
  const expectedRows = expected.rows.map((r) => projectRow(expected, comparableNames, r));
  const actualRaw = actual.rows.map((r) => projectRaw(actual, comparableNames, r));
  const expectedRaw = expected.rows.map((r) => projectRaw(expected, comparableNames, r));

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
  let differingColumns: string[] = [];
  if (!valuesMatch && comparableNames.length && actualKeys.length === expectedKeys.length) {
    // Same number of rows, different content. The message names the columns that differ and, when
    // one ratio or offset explains all of them, says so: that is the sentence the learner can act
    // on. It deliberately quotes no count of rows — reading "18" as a row count is what sent the
    // owner hunting a phantom bug.
    const diff = describeValueDifferences(
      actualRaw,
      expectedRaw,
      actualRows,
      expectedRows,
      comparableNames,
    );
    differingColumns = diff.columns;
    findings.push({
      category: "cell_values",
      messageKey: "cell_values",
      params: {
        columns: (diff.columns.length ? diff.columns : comparableNames).join(", "),
        count: diff.columns.length || comparableNames.length,
      },
    });
    if (diff.pattern) {
      const { kind, column, value } = diff.pattern;
      findings.push({
        category: "cell_values",
        messageKey:
          kind === "ratio"
            ? value > 1
              ? "cell_values_scale_smaller"
              : "cell_values_scale_larger"
            : value > 0
              ? "cell_values_offset_low"
              : "cell_values_offset_high",
        params: {
          column,
          amount: showCell(kind === "ratio" && value < 1 ? 1 / value : Math.abs(value)),
        },
      });
    } else if (diff.example) {
      // Leak analysis: one expected cell, for one row, of a result whose column names the learner
      // already has. It cannot reconstruct the solution and it is strictly less than the whole
      // expected row this finding used to carry. Two cases still withhold the expected value and
      // report only the learner's own:
      //   - the result is so small that the cell *is* the answer (one row, one comparable column);
      //   - the submitted projection is narrower than the expected columns. Security review
      //     2026-09-23 F-4: with a single-column projection there is no matching column to pair on,
      //     rows pair by position, and the example returns row 1's expected value. Feeding it back
      //     moves the mismatch to row 2, so the whole expected result can be read out one
      //     submission at a time (~72 submissions for 4 columns × 18 rows, inside the submit rate
      //     limit). Requiring the full shape of the answer costs an honest learner nothing: they
      //     select every expected column, so they still get the concrete value that teaches.
      // Third case, one step past the review's predicate: no comparable column matched at all, so
      // the pair above is positional. A full-width projection of constants
      // (`select 0 as a, 0 as b … from generate_series(1, n)`) is not "narrowed" and would have kept
      // the same oracle, one cell per submission, column by column. It is also the case where the
      // quoted expected value is least trustworthy as feedback, so withholding it costs nothing.
      const singleCellAnswer = expectedRows.length <= 1 && comparableNames.length <= 1;
      const narrowed = missingColumns.length > 0 || comparableNames.length < wantedNames.length;
      const withholdExpected = singleCellAnswer || narrowed || diff.pairedBy !== "columns";
      findings.push({
        category: "cell_values",
        messageKey: withholdExpected ? "cell_values_example_actual" : "cell_values_example",
        params: {
          column: diff.example.column,
          actual: showCell(diff.example.actual),
          ...(withholdExpected ? {} : { expected: showCell(diff.example.expected) }),
        },
      });
    }
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
      differingColumns,
    },
  };
}
