export interface SandboxColumn {
  name: string;
  /** Postgres type name (text, integer, numeric, timestamptz, …) derived from the OID. */
  type: string;
  dataTypeId: number;
}

export type SandboxCell = string | number | boolean | null;

export interface SandboxResult {
  columns: SandboxColumn[];
  rows: SandboxCell[][];
  rowCount: number;
  truncated: boolean;
  durationMs: number;
  /** True when produced by the browser engine (preview only, never graded). */
  preview?: boolean;
}

export type SandboxErrorCode = "gate" | "timeout" | "database" | "engine" | "rate_limited";

export interface SandboxError {
  ok: false;
  code: SandboxErrorCode;
  /** Learner-facing Spanish message (Postgres message passed through for `database`). */
  message: string;
  sqlstate?: string;
  position?: number;
  hint?: string;
  gateCode?: string;
}

export type SandboxOutcome = ({ ok: true } & SandboxResult) | SandboxError;

export interface DatasetRef {
  slug: string;
  version: number;
}

export interface ExecuteOptions {
  allowedStatements?: ("select" | "insert" | "update" | "delete")[];
  hardTimeoutMs?: number;
}

export interface SandboxEngine {
  execute(dataset: DatasetRef, sql: string, options?: ExecuteOptions): Promise<SandboxOutcome>;
}
