import type { AdminUserRow } from "@/lib/admin/directory";

/**
 * CSV for the admin user directory (owner feedback item 1).
 *
 * The export carries exactly the columns the directory already shows on screen. No email, no
 * birth date, no raw country-plus-age-plus-name combination that the table does not already
 * display — docs/SECURITY.md §7.2 governs what may leave the server, and an export is the easiest
 * place to widen a disclosure by accident.
 */
export const EXPORT_COLUMNS = [
  "alias",
  "display_name",
  "country",
  "age",
  "created_at",
  "onboarded",
  "role",
  "access",
  "exercises_completed",
  "exercises_started",
  "level",
  "xp_total",
  "last_activity",
  "deleted",
] as const;

/**
 * Quotes a field for RFC 4180 and neutralises spreadsheet formula injection: a value starting with
 * `=`, `+`, `-`, `@`, tab or CR is prefixed with a single quote, so opening the file in Excel or
 * Sheets cannot execute anything an alias or display name contains.
 */
export function csvField(value: string | number | boolean | null): string {
  if (value === null || value === undefined) return "";
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /["\n\r,;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function csvRow(values: (string | number | boolean | null)[]): string {
  return values.map(csvField).join(",");
}

/**
 * The whole document, CRLF-separated (what spreadsheet software expects) and with a UTF-8 BOM so
 * Excel on Windows shows "Ñ" and accents instead of mojibake.
 */
export function directoryCsv(rows: AdminUserRow[]): string {
  const lines = [csvRow([...EXPORT_COLUMNS])];
  for (const r of rows) {
    lines.push(
      csvRow([
        r.alias,
        r.displayName,
        r.country,
        r.age,
        r.createdAt.slice(0, 10),
        r.onboarded,
        r.role,
        r.entitlement,
        r.exercisesCompleted,
        r.exercisesStarted,
        r.level,
        r.xpTotal,
        r.lastActivity,
        r.isDeleted,
      ]),
    );
  }
  return `﻿${lines.join("\r\n")}\r\n`;
}

/** `usuarios-2026-09-24.csv` — sortable by name, and obviously a snapshot of a given day. */
export function exportFileName(now: Date = new Date()): string {
  return `usuarios-${now.toISOString().slice(0, 10)}.csv`;
}
