import { describe, expect, it } from "vitest";
import { csvField, directoryCsv, EXPORT_COLUMNS, exportFileName } from "@/lib/admin/csv";
import { DIRECTORY_PAGE_SIZE } from "@/lib/admin/directory";
import type { AdminUserRow } from "@/lib/admin/directory";

const row: AdminUserRow = {
  id: "11111111-1111-1111-1111-111111111111",
  alias: "sebagrim",
  displayName: "Sebastián, Grimaldi",
  country: "AR",
  age: 31,
  createdAt: "2026-09-22T17:34:39.035Z",
  onboarded: true,
  role: "learner",
  entitlement: "paid",
  exercisesStarted: 7,
  exercisesCompleted: 4,
  level: 3,
  xpTotal: 520,
  lastActivity: "2026-09-24",
  isDeleted: false,
};

describe("directory CSV", () => {
  it("exports only the columns the directory already shows", () => {
    // docs/SECURITY.md §7.2: an export must not widen what leaves the server.
    expect(EXPORT_COLUMNS).not.toContain("email");
    expect(EXPORT_COLUMNS).not.toContain("birth_date");
    expect(EXPORT_COLUMNS).not.toContain("id");
  });

  it("writes a header and one line per learner", () => {
    const lines = directoryCsv([row]).trimEnd().split("\r\n");
    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe(`﻿${EXPORT_COLUMNS.join(",")}`);
    expect(lines[1]).toContain("sebagrim");
    expect(lines[1]).toContain("2026-09-22");
  });

  it("quotes a field containing a comma instead of splitting the row", () => {
    expect(directoryCsv([row]).split("\r\n")[1]).toContain('"Sebastián, Grimaldi"');
  });

  it("escapes embedded quotes", () => {
    expect(csvField('dice "hola"')).toBe('"dice ""hola"""');
  });

  it("neutralises spreadsheet formula injection", () => {
    expect(csvField("=1+1")).toBe("'=1+1");
    expect(csvField("+34600")).toBe("'+34600");
    expect(csvField("@alias")).toBe("'@alias");
    expect(csvField("-2")).toBe("'-2");
  });

  it("writes an empty field for a missing value, never the word null", () => {
    expect(csvField(null)).toBe("");
  });

  it("names the file after the day it was taken", () => {
    expect(exportFileName(new Date("2026-09-24T10:00:00Z"))).toBe("usuarios-2026-09-24.csv");
  });
});

describe("directory page size", () => {
  it("shows a usable page (owner feedback item 16)", () => {
    expect(DIRECTORY_PAGE_SIZE).toBeGreaterThanOrEqual(50);
  });
});
