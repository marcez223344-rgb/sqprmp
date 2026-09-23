/**
 * Functions learners may never call: sleeping, file/system access, settings, large objects,
 * dblink, backend control. Shared by the parser gate (TS) and the engine lockdown (worker).
 */
export const DENIED_FUNCTIONS = Object.freeze([
  "pg_sleep",
  "pg_sleep_for",
  "pg_sleep_until",
  "pg_read_file",
  "pg_read_binary_file",
  "pg_ls_dir",
  "pg_ls_logdir",
  "pg_ls_waldir",
  "pg_stat_file",
  "pg_terminate_backend",
  "pg_cancel_backend",
  "pg_reload_conf",
  "pg_rotate_logfile",
  "set_config",
  "current_setting",
  "pg_advisory_lock",
  "pg_advisory_xact_lock",
  "pg_try_advisory_lock",
  "lo_import",
  "lo_export",
  "lo_get",
  "lo_put",
  "lo_unlink",
  "dblink",
  "dblink_connect",
  "dblink_exec",
  "query_to_xml",
  "table_to_xml",
  "database_to_xml",
  "pg_notify",
  "txid_current",
  "pg_backend_pid",
  "inet_server_addr",
  "inet_client_addr",
  "version",
  "pg_export_snapshot",
  "pg_logical_slot_get_changes",
  "pg_create_logical_replication_slot",
  "pg_switch_wal",
  "pg_start_backup",
  "pg_stop_backup",
]);

/**
 * Catalog reads have three spellings, and a name list only closes the one it enumerates. The
 * relation spelling (`select * from pg_settings`) and the cast spelling (`::regclass`) are denied
 * by `src/lib/sandbox/gate.ts`; this is the **function** spelling of the same reads
 * (`pg_show_all_settings()` returns the 380 rows behind `pg_settings`, `pg_get_userbyid()` a role
 * name, `to_regclass('customers')` an OID). Denied by prefix rather than by enumeration so a
 * PGlite upgrade that adds a function cannot silently reopen the channel (SEC-08, D-22).
 *
 * `pg_` covers every catalog/system function in `pg_catalog` (447 in PGlite 0.5.8 / PG 18.3);
 * `to_reg` covers the ten OID-name resolvers, which do not start with `pg_`. Nothing a learner
 * legitimately writes starts with either prefix: no authored exercise or solution references one,
 * and a learner cannot create functions (`revoke create on schema public`).
 */
export const CATALOG_FUNCTION_PREFIXES = Object.freeze(["pg_", "to_reg"]);

/**
 * The OID alias types. A cast to one is a catalog read (`'customers'::regclass::oid`) and so is
 * its function spelling (`regclass('customers')`) — shared here because the gate needs both, and
 * kept in one place so the drift test in `tests/sandbox/catalog.test.ts` has a single list to
 * compare against the engine's own `pg_type`.
 *
 * Note for layer 5: these names are **not** revocable. PostgreSQL parses `regclass('customers')`
 * as a cast written in function syntax, not as a function call, so no EXECUTE privilege is
 * checked (verified: with `regclass` revoked, the call still returned `customers`). The gate is
 * the only layer that can block this spelling.
 */
export const OID_ALIAS_TYPES = Object.freeze([
  "regclass",
  "regcollation",
  "regconfig",
  "regdictionary",
  "regnamespace",
  "regoper",
  "regoperator",
  "regproc",
  "regprocedure",
  "regrole",
  "regtype",
]);

/** Common Postgres OIDs → readable type names. */
const TYPE_NAMES = {
  16: "boolean",
  20: "bigint",
  21: "smallint",
  23: "integer",
  25: "text",
  114: "json",
  700: "real",
  701: "double precision",
  1042: "char",
  1043: "varchar",
  1082: "date",
  1083: "time",
  1114: "timestamp",
  1184: "timestamptz",
  1186: "interval",
  1700: "numeric",
  2950: "uuid",
  3802: "jsonb",
  1007: "integer[]",
  1009: "text[]",
  2249: "record",
  705: "unknown",
};

/** @param {number} oid */
export function typeNameForOid(oid) {
  return TYPE_NAMES[oid] ?? "unknown";
}
