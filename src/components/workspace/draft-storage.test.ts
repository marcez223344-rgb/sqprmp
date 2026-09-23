import { beforeEach, describe, expect, it } from "vitest";
import {
  clearDraftStorage,
  newerLocalDraft,
  purgeLegacyDrafts,
  readLocalDraft,
  writeLocalDraft,
} from "./draft-storage";

const USER = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const SERVER_AT = "2026-09-23T10:00:00.000Z";

beforeEach(() => window.localStorage.clear());

describe("draft storage keys", () => {
  it("scopes a draft to its owner", () => {
    writeLocalDraft(USER, "select", "SELECT 1;");
    expect(readLocalDraft(USER, "select")?.sql).toBe("SELECT 1;");
    // The point of the namespace: a second account on the same browser sees nothing.
    expect(readLocalDraft(OTHER, "select")).toBeNull();
    expect(window.localStorage.getItem(`dms.draft.${USER}.select`)).not.toBeNull();
  });

  it("returns null for missing, corrupt and incomplete values", () => {
    window.localStorage.setItem(`dms.draft.${USER}.corrupt`, "{not json");
    window.localStorage.setItem(`dms.draft.${USER}.partial`, JSON.stringify({ sql: "SELECT 1;" }));
    expect(readLocalDraft(USER, "ausente")).toBeNull();
    expect(readLocalDraft(USER, "corrupt")).toBeNull();
    expect(readLocalDraft(USER, "partial")).toBeNull();
  });
});

describe("clearDraftStorage", () => {
  it("removes every draft and nothing else", () => {
    writeLocalDraft(USER, "select", "SELECT 1;");
    writeLocalDraft(OTHER, "where", "SELECT 2;");
    window.localStorage.setItem("dms.theme", "dark");
    clearDraftStorage();
    expect(readLocalDraft(USER, "select")).toBeNull();
    expect(readLocalDraft(OTHER, "where")).toBeNull();
    expect(window.localStorage.getItem("dms.theme")).toBe("dark");
  });
});

describe("purgeLegacyDrafts", () => {
  it("drops un-namespaced drafts and keeps namespaced ones", () => {
    window.localStorage.setItem(
      "dms.draft.select",
      JSON.stringify({ sql: "SELECT 9;", savedAt: SERVER_AT }),
    );
    writeLocalDraft(USER, "select", "SELECT 1;");
    purgeLegacyDrafts();
    expect(window.localStorage.getItem("dms.draft.select")).toBeNull();
    expect(readLocalDraft(USER, "select")?.sql).toBe("SELECT 1;");
  });
});

describe("newerLocalDraft", () => {
  it("restores the browser copy when it is newer than the server one", () => {
    const local = { sql: "SELECT 2;", savedAt: "2026-09-23T10:00:05.000Z" };
    expect(newerLocalDraft(local, "SELECT 1;", SERVER_AT)).toBe("SELECT 2;");
  });

  it("keeps the server copy when it is the newer one", () => {
    const local = { sql: "SELECT 2;", savedAt: "2026-09-23T09:59:00.000Z" };
    expect(newerLocalDraft(local, "SELECT 1;", SERVER_AT)).toBeNull();
  });

  it("restores when the server has no draft at all", () => {
    expect(newerLocalDraft({ sql: "SELECT 2;", savedAt: SERVER_AT }, "", null)).toBe("SELECT 2;");
  });

  it("ignores an empty, identical or unparsable draft", () => {
    expect(newerLocalDraft({ sql: "   ", savedAt: SERVER_AT }, "", null)).toBeNull();
    expect(newerLocalDraft({ sql: "SELECT 1;", savedAt: SERVER_AT }, "SELECT 1;", null)).toBeNull();
    expect(newerLocalDraft({ sql: "SELECT 2;", savedAt: "ayer" }, "", null)).toBeNull();
    expect(newerLocalDraft(null, "", null)).toBeNull();
  });
});
