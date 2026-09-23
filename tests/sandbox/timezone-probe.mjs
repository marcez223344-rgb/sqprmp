/**
 * Probe used by tests/sandbox/timezone.test.ts. Runs in a real Node process (vitest's jsdom
 * environment resolves PGlite to its browser build, which cannot boot in-process), loads a
 * dataset through one of the two shipped copies of the engine core, and prints what the
 * session actually reports. Usage: node timezone-probe.mjs <core.mjs> <datasetDir>
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { PGlite } from "@electric-sql/pglite";

const [corePath, datasetDir] = process.argv.slice(2);
const core = await import(pathToFileURL(corePath).href);

const pg = new PGlite();
await pg.waitReady;

const before = (await pg.query("show timezone")).rows[0].TimeZone;

const manifest = JSON.parse(readFileSync(join(datasetDir, "manifest.json"), "utf8"));
await core.loadDatasetInto(pg, {
  schemaSql: readFileSync(join(datasetDir, manifest.schemaFile), "utf8"),
  tables: manifest.tables.map((t) => ({
    name: t.name,
    csv: readFileSync(join(datasetDir, t.file), "utf8"),
  })),
});

const showTimezone = (await pg.query("show timezone")).rows[0].TimeZone;
const monthAdd = (
  await core.runLearnerQuery(
    pg,
    "select (timestamptz '2025-07-01 00:00:00+00' + interval '1 month')::text as t",
    { maxRows: 10, maxColumns: 10, maxCellBytes: 1000 },
    true,
  )
).rows[0][0];

console.log(JSON.stringify({ hostZone: before, showTimezone, monthAdd }));
await pg.close();
