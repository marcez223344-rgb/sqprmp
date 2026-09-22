/**
 * Engine core shared by the browser Web Worker, the server worker_threads worker and tests.
 * Plain ESM so Node can run it unbundled inside a worker. Typed via JSDoc.
 */
import { DENIED_FUNCTIONS, typeNameForOid } from "./denied-functions.mjs";

/**
 * @typedef {{ name: string, csv: string | Blob }} TableFile
 * @typedef {{ schemaSql: string, tables: TableFile[] }} DatasetFiles
 * @typedef {{ maxRows: number, maxColumns: number, maxCellBytes: number }} RunLimits
 * @typedef {{ name: string, type: string, dataTypeId: number }} SandboxColumn
 * @typedef {{ columns: SandboxColumn[], rows: (string|number|boolean|null)[][], rowCount: number, truncated: boolean, durationMs: number }} SandboxResult
 */

/**
 * Loads a dataset (schema.sql + CSV per table) into PGlite and locks it down:
 * `learner` role with SELECT only, EXECUTE revoked on denied functions.
 * @param {import("@electric-sql/pglite").PGlite} pg
 * @param {DatasetFiles} files
 */
export async function loadDatasetInto(pg, files) {
  await pg.exec(files.schemaSql);
  for (const table of files.tables) {
    const blob =
      typeof table.csv === "string" ? new Blob([table.csv], { type: "text/csv" }) : table.csv;
    await pg.query(`COPY "${table.name}" FROM '/dev/blob' WITH (FORMAT csv, HEADER true)`, [], {
      blob,
    });
  }
  await pg.exec("analyze");
  await lockDown(pg);
}

/** @param {import("@electric-sql/pglite").PGlite} pg */
export async function lockDown(pg) {
  await pg.exec(`
    do $$ begin
      if not exists (select 1 from pg_roles where rolname = 'learner') then
        create role learner nologin;
      end if;
    end $$;
    grant usage on schema public to learner;
    grant select on all tables in schema public to learner;
    revoke create on schema public from learner;
  `);
  const denied = DENIED_FUNCTIONS.map((n) => `'${n}'`).join(",");
  await pg.exec(`
    do $$
    declare f record;
    begin
      for f in
        select p.oid::regprocedure as sig
        from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where p.proname in (${denied}) and n.nspname in ('pg_catalog', 'public')
      loop
        execute format('revoke execute on function %s from public, learner', f.sig);
      end loop;
    end $$;
  `);
}

export class PgQueryError extends Error {
  /**
   * @param {string} message
   * @param {string | undefined} sqlstate
   * @param {number | undefined} position
   * @param {string | undefined} hint
   */
  constructor(message, sqlstate, position, hint) {
    super(message);
    this.name = "PgQueryError";
    this.sqlstate = sqlstate;
    this.position = position;
    this.hint = hint;
  }
}

/** @param {unknown} err */
export function toPgQueryError(err) {
  const e =
    /** @type {{ message?: string, code?: string, position?: string | number, hint?: string }} */ (
      err ?? {}
    );
  const position = e.position !== undefined ? Number(e.position) : undefined;
  return new PgQueryError(
    e.message ?? "Error al ejecutar la consulta.",
    e.code,
    Number.isFinite(position) ? position : undefined,
    e.hint,
  );
}

/**
 * @param {unknown} value
 * @param {number} maxBytes
 * @returns {string | number | boolean | null}
 */
export function sanitizeCell(value, maxBytes) {
  if (value === null || value === undefined) return null;
  if (typeof value === "boolean" || typeof value === "number") return value;
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Date) return value.toISOString();
  const s = typeof value === "string" ? value : JSON.stringify(value);
  return s.length > maxBytes ? `${s.slice(0, maxBytes)}…` : s;
}

/**
 * Executes learner SQL as `learner` and caps the result. SELECT-like statements are wrapped
 * in `select * from (…) limit n+1` so unbounded results are never materialized.
 * @param {import("@electric-sql/pglite").PGlite} pg
 * @param {string} sql
 * @param {RunLimits} limits
 * @param {boolean} [isSelect]
 * @returns {Promise<SandboxResult>}
 */
export async function runLearnerQuery(pg, sql, limits, isSelect = true) {
  const cleaned = sql.trim().replace(/;+\s*$/, "");
  const wrapped = isSelect
    ? `select * from (${cleaned}) as __consulta limit ${limits.maxRows + 1}`
    : cleaned;
  const t0 = performance.now();
  await pg.exec("set role learner");
  try {
    const result = await pg.query(wrapped);
    const durationMs = Math.round(performance.now() - t0);
    const fields = result.fields.slice(0, limits.maxColumns);
    const rowsRaw = result.rows.slice(0, limits.maxRows);
    const columns = fields.map((f) => ({
      name: f.name,
      type: typeNameForOid(f.dataTypeID),
      dataTypeId: f.dataTypeID,
    }));
    const rows = rowsRaw.map((r) =>
      fields.map((f) =>
        sanitizeCell(/** @type {Record<string, unknown>} */ (r)[f.name], limits.maxCellBytes),
      ),
    );
    return {
      columns,
      rows,
      rowCount: rows.length,
      truncated: result.rows.length > limits.maxRows || result.fields.length > limits.maxColumns,
      durationMs,
    };
  } catch (err) {
    throw toPgQueryError(err);
  } finally {
    await pg.exec("reset role").catch(() => undefined);
  }
}
