/**
 * Browser sandbox Web Worker (static, same-origin, module worker).
 * Loads a dataset snapshot into an in-memory PGlite and runs learner queries as the
 * read-only `learner` role. Results are previews only; grading happens on the server.
 * The page terminates this worker on timeout and creates a fresh one.
 */
import { PGlite } from "/pglite/index.js";
import { loadDatasetInto, runLearnerQuery, PgQueryError } from "/sandbox-core/engine-core.mjs";

let pg = null;

async function load(base) {
  const manifest = await (await fetch(`${base}/manifest.json`)).json();
  const schemaSql = await (await fetch(`${base}/${manifest.schemaFile}`)).text();
  const tables = [];
  for (const t of manifest.tables) {
    const res = await fetch(`${base}/${t.file}`);
    tables.push({ name: t.name, csv: await res.blob() });
    postMessage({ type: "progress", table: t.name });
  }
  const db = new PGlite();
  await db.waitReady;
  await loadDatasetInto(db, { schemaSql, tables });
  return db;
}

self.onmessage = async (event) => {
  const msg = event.data;
  if (msg.type === "load") {
    try {
      pg = await load(msg.base);
      postMessage({ type: "ready" });
    } catch (err) {
      postMessage({ type: "fatal", message: String(err?.message ?? err) });
    }
    return;
  }
  if (msg.type === "run") {
    if (!pg) {
      postMessage({ type: "error", id: msg.id, message: "El motor local no está listo." });
      return;
    }
    try {
      const result = await runLearnerQuery(pg, msg.sql, msg.limits, msg.isSelect);
      postMessage({ type: "result", id: msg.id, result });
    } catch (err) {
      if (err instanceof PgQueryError) {
        postMessage({
          type: "pgerror",
          id: msg.id,
          message: err.message,
          sqlstate: err.sqlstate,
          position: err.position,
          hint: err.hint,
        });
      } else {
        postMessage({ type: "error", id: msg.id, message: String(err?.message ?? err) });
      }
    }
  }
};
