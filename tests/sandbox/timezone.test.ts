import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { workerEngine } from "@/lib/sandbox/engines/worker-engine";

/**
 * Regression guard for the unpinned session zone (docs/DECISIONS.md D-24).
 *
 * PGlite takes `TimeZone` from the host at initdb: `Etc/GMT+3` on the owner's machine,
 * `Etc/GMT0` on GitHub Actions and Vercel. Month arithmetic on `timestamptz` is resolved in
 * the session zone, so an unpinned engine grades the same correct query differently depending
 * on where it runs. Asserting the setting alone is not enough — each path also has to produce
 * the UTC *answer*, so every case below checks both.
 */
const EXPECTED_ZONE = "UTC";
const UTC_MONTH_ADD = "2025-08-01 00:00:00+00";
/** What `Etc/GMT+3` returned before the fix; the failure this test exists to catch. */
const OFF_ZONE_MONTH_ADD = "2025-07-31 21:00:00-03";
const MONTH_ADD_SQL =
  "select (timestamptz '2025-07-01 00:00:00+00' + interval '1 month')::text as t";

const dataset = { slug: "tiendaviva", version: 1 };
const datasetDir = join(process.cwd(), "public", "datasets", dataset.slug, `v${dataset.version}`);
const built = existsSync(join(datasetDir, "manifest.json"));
const probeScript = join(process.cwd(), "tests", "sandbox", "timezone-probe.mjs");

function probe(corePath: string): { hostZone: string; showTimezone: string; monthAdd: string } {
  // A real Node process: vitest runs in jsdom, where PGlite resolves to its browser build.
  const out = execFileSync(process.execPath, [probeScript, corePath, datasetDir], {
    encoding: "utf8",
    timeout: 120_000,
  });
  return JSON.parse(out.trim().split("\n").at(-1) as string);
}

describe.skipIf(!built)("sandbox session time zone", () => {
  it("is UTC in the engine core used by content:verify and the graded worker", () => {
    const r = probe(join(process.cwd(), "sandbox-runtime", "engine-core.mjs"));
    expect(r.showTimezone).toBe(EXPECTED_ZONE);
    expect(r.monthAdd).toBe(UTC_MONTH_ADD);
    expect(r.monthAdd).not.toBe(OFF_ZONE_MONTH_ADD);
  }, 180_000);

  it("is UTC in the exact engine core bytes the browser worker loads from public/", () => {
    // The browser worker imports this file verbatim (scripts/copy-pglite-assets.ts copies it).
    // Running the published copy proves the shipped bytes pin the zone; a stale copy fails here.
    const r = probe(join(process.cwd(), "public", "sandbox-core", "engine-core.mjs"));
    expect(r.showTimezone).toBe(EXPECTED_ZONE);
    expect(r.monthAdd).toBe(UTC_MONTH_ADD);
  }, 180_000);

  it("grades in UTC through the worker_threads engine", async () => {
    // `current_setting` is revoked for the learner role, so the setting is asserted through its
    // observable effect: the month-boundary answer and the rendered offset.
    const r = await workerEngine.execute(dataset, MONTH_ADD_SQL);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.rows[0]?.[0]).toBe(UTC_MONTH_ADD);
    expect(r.rows[0]?.[0]).not.toBe(OFF_ZONE_MONTH_ADD);

    const rendered = await workerEngine.execute(
      dataset,
      "select (timestamptz '2025-07-01 00:00:00+00')::text as t",
    );
    expect(rendered.ok).toBe(true);
    if (!rendered.ok) return;
    expect(rendered.rows[0]?.[0]).toBe("2025-07-01 00:00:00+00");
  }, 60_000);
});
