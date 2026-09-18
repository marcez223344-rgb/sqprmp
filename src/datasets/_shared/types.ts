/** A generated dataset: DDL + rows per table, ready to be written as CSV files. */
export type Cell = string | number | boolean | null;

export interface GeneratedTable {
  name: string;
  columns: string[];
  rows: Cell[][];
}

export interface GeneratedDataset {
  slug: string;
  version: number;
  /** DDL creating every table (no roles/grants; the engine adds those). */
  schemaSql: string;
  tables: GeneratedTable[];
  /** Fixed "today" of the dataset, used by exercises that mention relative periods. */
  today: string;
}

export interface DatasetVerification {
  name: string;
  ok: boolean;
  detail?: string;
}

export interface DatasetModule {
  generate(): GeneratedDataset;
  verify(dataset: GeneratedDataset): DatasetVerification[];
}

/** CSV encoding compatible with PostgreSQL COPY ... WITH (FORMAT csv, HEADER true). */
export function toCsv(table: GeneratedTable): string {
  const esc = (c: Cell): string => {
    if (c === null) return "";
    if (typeof c === "boolean") return c ? "true" : "false";
    if (typeof c === "number") return Number.isInteger(c) ? String(c) : c.toFixed(2);
    if (c === "") return '""';
    return /[",\n\r]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c;
  };
  const lines = [table.columns.join(",")];
  for (const row of table.rows) lines.push(row.map(esc).join(","));
  return lines.join("\n") + "\n";
}
