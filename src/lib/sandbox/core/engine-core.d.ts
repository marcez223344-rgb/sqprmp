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
