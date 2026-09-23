import type { PGlite } from "@electric-sql/pglite";
import type { SandboxResult } from "../types";

export interface TableFile {
  name: string;
  csv: string | Blob;
}
export interface DatasetFiles {
  schemaSql: string;
  tables: TableFile[];
}
export interface RunLimits {
  maxRows: number;
  maxColumns: number;
  maxCellBytes: number;
}
export class PgQueryError extends Error {
  sqlstate?: string;
  position?: number;
  hint?: string;
}
export const SANDBOX_TIME_ZONE: "UTC";
export function pinSessionTimeZone(pg: PGlite): Promise<void>;
export function loadDatasetInto(pg: PGlite, files: DatasetFiles): Promise<void>;
export function lockDown(pg: PGlite): Promise<void>;
export function toPgQueryError(err: unknown): PgQueryError;
export function sanitizeCell(value: unknown, maxBytes: number): string | number | boolean | null;
export function runLearnerQuery(
  pg: PGlite,
  sql: string,
  limits: RunLimits,
  isSelect?: boolean,
): Promise<SandboxResult>;
export const WRAPPER_PREFIX: string;
export function stripTrailingSemicolon(sql: string): string;
export function unwrapErrorPosition(
  position: number | undefined,
  original: string,
  inner: string,
): number | undefined;
