/**
 * Engine core shared by the browser Web Worker, the server worker_threads worker and tests.
 * Plain ESM so Node can run it unbundled inside a worker. Typed via JSDoc.
 */
import {
  CATALOG_FUNCTION_PREFIXES,
  DENIED_FUNCTIONS,
  typeNameForOid,
} from "./denied-functions.mjs";

/**
 * @typedef {{ name: string, csv: string | Blob }} TableFile
 * @typedef {{ schemaSql: string, tables: TableFile[] }} DatasetFiles
 * @typedef {{ maxRows: number, maxColumns: number, maxCellBytes: number }} RunLimits
 * @typedef {{ name: string, type: string, dataTypeId: number }} SandboxColumn
 * @typedef {{ columns: SandboxColumn[], rows: (string|number|boolean|null)[][], rowCount: number, truncated: boolean, durationMs: number }} SandboxResult
 */

/**
 * Session zone for every sandbox engine. PGlite derives `TimeZone` from the host at initdb
 * (Argentina -> `Etc/GMT+3`, CI/Vercel -> `Etc/GMT0`), and month/day arithmetic on
 * `timestamptz` is resolved in the session zone: `TIMESTAMPTZ '2025-07-01 00:00:00+00' +
 * INTERVAL '1 month'` is 2025-08-01T00:00Z under UTC but 2025-07-31T03:00Z under `Etc/GMT+3`.
 * An unpinned zone therefore makes authoring, CI and production disagree and can mark a
 * correct learner answer wrong. See docs/SQL_SANDBOX.md -> Session settings.
 */
export const SANDBOX_TIME_ZONE = "UTC";

/**
 * Pins the session zone. Applied twice on purpose: as a database default (so any session on
 * this instance starts pinned) and on the current session (so the already-open one is fixed).
 * @param {import("@electric-sql/pglite").PGlite} pg
 */
export async function pinSessionTimeZone(pg) {
  await pg.exec(`
    do $$ begin
      execute format('alter database %I set TimeZone to %L', current_database(), '${SANDBOX_TIME_ZONE}');
    end $$;
    set TimeZone to '${SANDBOX_TIME_ZONE}';
  `);
}

/**
 * Loads a dataset (schema.sql + CSV per table) into PGlite and locks it down:
 * `learner` role with SELECT only, EXECUTE revoked on denied functions.
 * @param {import("@electric-sql/pglite").PGlite} pg
 * @param {DatasetFiles} files
 */
export async function loadDatasetInto(pg, files) {
  // Before the schema: a generated column or index over a timestamptz expression would
  // otherwise be built under the host's zone.
  await pinSessionTimeZone(pg);
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
  // Same rule the gate applies at layer 4: the enumerated names plus every catalog-function
  // prefix, so a function added by a future PGlite is revoked without editing a list (SEC-08).
  // `\\_` escapes the LIKE wildcard; `p.oid::regprocedure` below is unaffected — it is a cast,
  // and this block runs as the instance owner, whose privileges a REVOKE cannot reduce.
  const prefixed = CATALOG_FUNCTION_PREFIXES.map(
    (p) => `p.proname like '${p.replace(/_/g, "\\_")}%'`,
  ).join(" or ");
  await pg.exec(`
    do $$
    declare f record;
    begin
      for f in
        select p.oid::regprocedure as sig
        from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where (p.proname in (${denied}) or ${prefixed}) and n.nspname in ('pg_catalog', 'public')
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
 * Prefix the SELECT wrapper adds before the learner's own SQL. Its length is the offset every
 * `position` reported by Postgres has to be shifted back by, or the editor would underline a
 * character 16 places to the right of the real mistake.
 */
export const WRAPPER_PREFIX = "select * from (\n";

/**
 * Removes the statement terminator without touching anything inside a literal or a comment.
 *
 * `/;+\s*$/` looked equivalent and was not: `select 1; -- nota` keeps its semicolon (the regex
 * only anchors at the end of the string), the wrapper then produced
 * `select * from (\nselect 1; -- nota\n)` and Postgres answered `syntax error at or near ";"`.
 * The gate accepts that input — one statement plus a trailing comment — so the learner got an
 * error about a character they were entitled to write. Trailing comments are kept: they are the
 * learner's text and the wrapper no longer depends on what the last line looks like.
 * @param {string} sql
 * @returns {string}
 */
export function stripTrailingSemicolon(sql) {
  let lastCode = -1;
  let i = 0;
  while (i < sql.length) {
    const c = sql[i];
    const next = sql[i + 1];
    if (c === "-" && next === "-") {
      const nl = sql.indexOf("\n", i);
      i = nl === -1 ? sql.length : nl + 1;
      continue;
    }
    if (c === "/" && next === "*") {
      // Block comments nest in PostgreSQL.
      let depth = 1;
      i += 2;
      while (i < sql.length && depth > 0) {
        if (sql[i] === "/" && sql[i + 1] === "*") {
          depth += 1;
          i += 2;
        } else if (sql[i] === "*" && sql[i + 1] === "/") {
          depth -= 1;
          i += 2;
        } else i += 1;
      }
      continue;
    }
    if (c === "'" || c === '"') {
      i += 1;
      while (i < sql.length) {
        if (sql[i] === "\\" && c === "'") i += 2;
        else if (sql[i] === c && sql[i + 1] === c) i += 2;
        else if (sql[i] === c) {
          i += 1;
          break;
        } else i += 1;
      }
      continue;
    }
    if (!/\s/.test(/** @type {string} */ (c))) lastCode = i;
    i += 1;
  }
  if (lastCode === -1 || sql[lastCode] !== ";") return sql;
  return `${sql.slice(0, lastCode)}${sql.slice(lastCode + 1)}`;
}

/**
 * Maps a `position` reported for the wrapped statement back to the learner's own SQL, so the
 * caret the UI shows points at the character the learner actually typed.
 * @param {number | undefined} position 1-based position in the wrapped statement
 * @param {string} original the SQL as the learner wrote it
 * @param {string} inner the text that was substituted into the wrapper
 * @returns {number | undefined}
 */
export function unwrapErrorPosition(position, original, inner) {
  if (position === undefined || !Number.isFinite(position)) return undefined;
  const innerOffset = position - WRAPPER_PREFIX.length;
  // Outside the learner's own text (the wrapper's own prefix or suffix): no honest caret.
  if (innerOffset < 1 || innerOffset > inner.length) return undefined;
  // The only other edit the wrapper makes is `trim()` plus a removed terminator near the end,
  // so adding back the leading whitespace is enough to land on the original character.
  const leading = original.length - original.trimStart().length;
  return innerOffset + leading;
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
  const cleaned = stripTrailingSemicolon(sql.trim());
  // The closing paren and the LIMIT go on their own lines: a learner query ending in a `--`
  // comment (a very normal thing to write) otherwise commented them out and the whole query
  // failed with a syntax error that had nothing to do with what the learner wrote.
  const wrapped = isSelect
    ? `${WRAPPER_PREFIX}${cleaned}
) as __consulta
limit ${limits.maxRows + 1}`
    : cleaned;
  const t0 = performance.now();
  // Re-pinned per query, not only at load: this is the statement that grades the learner, so
  // the zone must be guaranteed here and not inherited from whatever ran before.
  await pg.exec(`set TimeZone to '${SANDBOX_TIME_ZONE}'; set role learner`);
  try {
    // `rowMode: "array"` and not the default object mode: two columns with the same output name
    // (`select id, customer_id as id ...`) collapse into one key in object mode, so the second
    // value was reported for both and the comparator saw values the engine never returned.
    const result = await pg.query(wrapped, [], { rowMode: "array" });
    const durationMs = Math.round(performance.now() - t0);
    const fields = result.fields.slice(0, limits.maxColumns);
    const rowsRaw = result.rows.slice(0, limits.maxRows);
    const columns = fields.map((f) => ({
      name: f.name,
      type: typeNameForOid(f.dataTypeID),
      dataTypeId: f.dataTypeID,
    }));
    const rows = rowsRaw.map((r) =>
      fields.map((_f, i) => sanitizeCell(/** @type {unknown[]} */ (r)[i], limits.maxCellBytes)),
    );
    return {
      columns,
      rows,
      rowCount: rows.length,
      truncated: result.rows.length > limits.maxRows || result.fields.length > limits.maxColumns,
      durationMs,
    };
  } catch (err) {
    const error = toPgQueryError(err);
    if (isSelect) error.position = unwrapErrorPosition(error.position, sql, cleaned);
    throw error;
  } finally {
    await pg.exec("reset role").catch(() => undefined);
  }
}
