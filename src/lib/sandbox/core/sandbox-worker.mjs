/**
 * worker_threads entry: holds one loaded PGlite instance for one dataset and runs queries
 * sequentially. The parent enforces the hard timeout by terminating this worker; a fresh
 * one is spawned on demand. Nothing here talks to the network or the application database.
 */
import "./native-url.mjs";
import { parentPort, workerData } from "node:worker_threads";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { loadDatasetInto, runLearnerQuery, PgQueryError } from "./engine-core.mjs";

const { datasetDir } = /** @type {{ datasetDir: string }} */ (workerData);

/** @type {Promise<PGlite>} */
const ready = (async () => {
  const manifest = JSON.parse(await readFile(join(datasetDir, "manifest.json"), "utf8"));
  const schemaSql = await readFile(join(datasetDir, manifest.schemaFile), "utf8");
  const tables = [];
  for (const t of manifest.tables) {
    tables.push({ name: t.name, csv: await readFile(join(datasetDir, t.file), "utf8") });
  }
  const pg = new PGlite();
  await pg.waitReady;
  await loadDatasetInto(pg, { schemaSql, tables });
  return pg;
})();

ready.then(
  () => parentPort?.postMessage({ type: "ready" }),
  (err) => parentPort?.postMessage({ type: "fatal", message: String(err?.message ?? err) }),
);

parentPort?.on("message", async (msg) => {
  if (msg?.type !== "run") return;
  const { id, sql, limits, isSelect } = msg;
  try {
    const pg = await ready;
    const result = await runLearnerQuery(pg, sql, limits, isSelect);
    parentPort?.postMessage({ type: "result", id, result });
  } catch (err) {
    if (err instanceof PgQueryError) {
      parentPort?.postMessage({
        type: "pgerror",
        id,
        message: err.message,
        sqlstate: err.sqlstate,
        position: err.position,
        hint: err.hint,
      });
    } else {
      parentPort?.postMessage({ type: "error", id, message: String(err?.message ?? err) });
    }
  }
});
