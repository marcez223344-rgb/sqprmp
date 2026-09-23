import { describe, expect, it } from "vitest";
import { compareResults, type ResultSet, type ValidationRules } from "@/lib/validation/compare";

/**
 * Regression tests for the feedback the owner read as a row-count bug (2026-09-23):
 * "La cantidad de filas coincide pero algunos valores difieren (18 filas esperadas no aparecen)".
 * The 18 was a count of mismatching rows; he read it as "18 rows instead of 20" and went looking
 * for a bug in the engine. The message must now name the columns and, when possible, the pattern.
 */

const rules: ValidationRules = {
  order_matters: false,
  numeric_tolerance: 0.01,
  allow_extra_columns: false,
  dedupe: false,
};

const columns = (names: string[]) => names.map((name) => ({ name, type: "numeric" as const }));
const set = (names: string[], rows: (string | number | null)[][]): ResultSet => ({
  columns: names.map((name) => ({ name, type: "numeric", dataTypeId: 1700 })),
  rows,
});

const keys = (r: ReturnType<typeof compareResults>) => r.findings.map((f) => f.messageKey);
const finding = (r: ReturnType<typeof compareResults>, key: string) =>
  r.findings.find((f) => f.messageKey === key);

describe("compareResults — values differ, row count does not", () => {
  it("names the columns that differ and no longer quotes a count of rows", () => {
    const expected = set(
      ["id", "neto", "envio_pct"],
      [
        [1, 100, 12.5],
        [2, 200, 8],
        [3, 300, 4.25],
      ],
    );
    const actual = set(
      ["id", "neto", "envio_pct"],
      [
        [1, 100, 0.125],
        [2, 200, 0.08],
        [3, 300, 0.0425],
      ],
    );
    const r = compareResults(actual, expected, columns(["id", "neto", "envio_pct"]), rules);
    expect(r.correct).toBe(false);
    expect(r.stats.differingColumns).toEqual(["envio_pct"]);
    const cells = finding(r, "cell_values");
    expect(cells?.params).toEqual({ columns: "envio_pct", count: 1 });
    expect(JSON.stringify(cells)).not.toContain("missing");
  });

  it("detects the constant factor that explains the whole column (the missing * 100)", () => {
    const expected = set(
      ["id", "pct"],
      [
        [1, 63.4],
        [2, 63],
        [3, 62.8],
      ],
    );
    const actual = set(
      ["id", "pct"],
      [
        [1, 0.634],
        [2, 0.63],
        [3, 0.628],
      ],
    );
    const r = compareResults(actual, expected, columns(["id", "pct"]), rules);
    expect(keys(r)).toContain("cell_values_scale_smaller");
    expect(finding(r, "cell_values_scale_smaller")?.params).toEqual({
      column: "pct",
      amount: "100",
    });
    // The scale hint replaces the example, so no expected value is quoted at all.
    expect(keys(r)).not.toContain("cell_values_example");
  });

  it("reports the inverse direction when the learner's values are too large", () => {
    const expected = set(
      ["id", "pct"],
      [
        [1, 0.5],
        [2, 0.25],
      ],
    );
    const actual = set(
      ["id", "pct"],
      [
        [1, 50],
        [2, 25],
      ],
    );
    const r = compareResults(actual, expected, columns(["id", "pct"]), rules);
    expect(finding(r, "cell_values_scale_larger")?.params).toEqual({
      column: "pct",
      amount: "100",
    });
  });

  it("detects a constant offset", () => {
    const expected = set(
      ["id", "dias"],
      [
        [1, 10],
        [2, 20],
      ],
    );
    const actual = set(
      ["id", "dias"],
      [
        [1, 9],
        [2, 19],
      ],
    );
    const r = compareResults(actual, expected, columns(["id", "dias"]), rules);
    expect(finding(r, "cell_values_offset_low")?.params).toEqual({ column: "dias", amount: "1" });
  });

  it("falls back to one concrete pair of values when no pattern explains the difference", () => {
    const expected = set(
      ["id", "ciudad"],
      [
        [1, "Bogotá"],
        [2, "Lima"],
      ],
    );
    const actual = set(
      ["id", "ciudad"],
      [
        [1, "BOGOTÁ"],
        [2, "Lima"],
      ],
    );
    const r = compareResults(actual, expected, columns(["id", "ciudad"]), rules);
    expect(finding(r, "cell_values_example")?.params).toEqual({
      column: "ciudad",
      actual: "BOGOTÁ",
      expected: "Bogotá",
    });
  });

  it("pairs rows by the columns that do match, so row order does not matter", () => {
    const expected = set(
      ["id", "total"],
      [
        [1, 10],
        [2, 20],
      ],
    );
    const actual = set(
      ["id", "total"],
      [
        [2, 25],
        [1, 10],
      ],
    );
    const r = compareResults(actual, expected, columns(["id", "total"]), rules);
    expect(finding(r, "cell_values_example")?.params).toEqual({
      column: "total",
      actual: "25",
      expected: "20",
    });
  });

  it("does not hand over the answer when the result is a single cell", () => {
    const r = compareResults(
      set(["total"], [[41]]),
      set(["total"], [[42]]),
      columns(["total"]),
      rules,
    );
    expect(keys(r)).toContain("cell_values_example_actual");
    expect(JSON.stringify(r.findings)).not.toContain("42");
  });

  it("keeps reporting the column list when it withholds the value", () => {
    // Withholding the expected value must not cost the learner the diagnosis: they still learn
    // which column is wrong and what their own value was.
    const r = compareResults(
      set(["revenue"], [[0], [0]]),
      set(
        ["id", "revenue"],
        [
          [1, 500],
          [2, 900],
        ],
      ),
      columns(["id", "revenue"]),
      rules,
    );
    expect(finding(r, "cell_values")?.params?.columns).toBe("revenue");
    expect(finding(r, "cell_values_example_actual")?.params).toEqual({
      column: "revenue",
      actual: "0",
    });
  });

  it("says nothing about values when the result is right", () => {
    const one = set(["id"], [[1], [2]]);
    const r = compareResults(one, one, columns(["id"]), rules);
    expect(r.correct).toBe(true);
    expect(r.findings).toEqual([]);
    expect(r.stats.differingColumns).toEqual([]);
  });

  it("keeps reporting a row-count mismatch as a row count", () => {
    const r = compareResults(set(["id"], [[1]]), set(["id"], [[1], [2]]), columns(["id"]), rules);
    expect(keys(r)).toEqual(["too_few_rows"]);
  });
});

/**
 * Security review 2026-09-23, F-4: the expected-cell example was a workable answer oracle. Submit a
 * projection that cannot be paired on any matching column, read row 1's expected value out of the
 * message, feed it back so row 1 matches, submit again for row 2 — one cell per submission, well
 * inside the submit rate limit. These tests walk that loop and assert it learns nothing.
 */
describe("F-4 — the expected value cannot be iterated out of the comparator", () => {
  const expectedColumns = columns(["id", "revenue"]);
  const target = set(
    ["id", "revenue"],
    [
      [1, 500],
      [2, 900],
      [3, 1300],
    ],
  );
  const secrets = ["500", "900", "1300"];
  const leaks = (r: ReturnType<typeof compareResults>) =>
    secrets.filter((s) => JSON.stringify(r.findings).includes(s));

  it("step 1 — a projection of only the target column gets the learner's own value back", () => {
    const r = compareResults(set(["revenue"], [[0], [0], [0]]), target, expectedColumns, rules);
    expect(keys(r)).toContain("cell_values_example_actual");
    expect(keys(r)).not.toContain("cell_values_example");
    expect(leaks(r)).toEqual([]);
  });

  it("step 2 — a full-width projection of constants gets nothing either", () => {
    // Not "narrowed": every expected column is present. What it cannot do is match any column, so
    // the pair would be positional and the value is withheld.
    const r = compareResults(
      set(
        ["id", "revenue"],
        [
          [0, 0],
          [0, 0],
          [0, 0],
        ],
      ),
      target,
      expectedColumns,
      rules,
    );
    expect(keys(r)).toContain("cell_values_example_actual");
    expect(keys(r)).not.toContain("cell_values_example");
    expect(leaks(r)).toEqual([]);
  });

  it("step 3 — iterating the loop never yields a single expected cell", () => {
    // The attacker's loop: submit, harvest any expected value the feedback quotes, feed it back,
    // repeat. `harvested` must still be empty after every round.
    const harvested = new Set<string>();
    for (let round = 0; round < 6; round += 1) {
      const probe = set(
        ["revenue"],
        [0, 1, 2].map((i) => [Number([...harvested][i] ?? 0)]),
      );
      const r = compareResults(probe, target, expectedColumns, rules);
      for (const f of r.findings)
        if (f.params && "expected" in f.params) harvested.add(String(f.params.expected));
      expect(leaks(r)).toEqual([]);
    }
    expect([...harvested]).toEqual([]);
  });

  it("a learner who answered the full shape of the question still gets the concrete value", () => {
    // The pedagogy the guard has to preserve: same columns, ids right, one revenue wrong.
    const attempt = set(
      ["id", "revenue"],
      [
        [1, 500],
        [2, 899],
        [3, 1300],
      ],
    );
    const r = compareResults(attempt, target, expectedColumns, rules);
    expect(finding(r, "cell_values_example")?.params).toEqual({
      column: "revenue",
      actual: "899",
      expected: "900",
    });
  });

  it("the scale hint survives untouched, and reveals no absolute value", () => {
    // This is the message that would have told the owner he forgot `* 100`.
    const attempt = set(
      ["id", "revenue"],
      [
        [1, 5],
        [2, 9],
        [3, 13],
      ],
    );
    const r = compareResults(attempt, target, expectedColumns, rules);
    expect(finding(r, "cell_values_scale_smaller")?.params).toEqual({
      column: "revenue",
      amount: "100",
    });
    expect(leaks(r)).toEqual([]);
  });
});
