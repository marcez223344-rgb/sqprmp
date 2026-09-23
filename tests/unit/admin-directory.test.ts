import { describe, expect, it } from "vitest";
import {
  DIRECTORY_PAGE_SIZE,
  MIN_LEARNERS_FOR_RATES,
  ariaSortFor,
  barPercent,
  directoryHref,
  directoryQuery,
  escapeLikeTerm,
  nextSortState,
  parseDirectoryParams,
  ratio,
} from "@/lib/admin/directory";

describe("parseDirectoryParams", () => {
  it("lists everyone, newest first, with no query string at all", () => {
    const p = parseDirectoryParams({});
    expect(p).toEqual({
      search: "",
      country: "",
      entitlement: "",
      includeDeleted: false,
      sort: "created_at",
      desc: true,
      page: 1,
    });
  });

  it("accepts the supported controls and normalizes the country code", () => {
    const p = parseDirectoryParams({
      q: " ana ",
      pais: "ar",
      acceso: "paid",
      borrados: "1",
      orden: "xp_total",
      dir: "asc",
      pagina: "3",
    });
    expect(p).toMatchObject({
      search: "ana",
      country: "AR",
      entitlement: "paid",
      includeDeleted: true,
      sort: "xp_total",
      desc: false,
      page: 3,
    });
  });

  it("falls back to defaults instead of failing on a hand-edited URL", () => {
    const p = parseDirectoryParams({
      orden: "birth_date; drop table profiles",
      dir: "sideways",
      pagina: "-4",
      pais: "Argentina",
      acceso: "superuser",
      q: "select * from profiles /*",
    });
    expect(p.sort).toBe("created_at");
    expect(p.desc).toBe(true);
    expect(p.page).toBe(1);
    expect(p.country).toBe("");
    expect(p.entitlement).toBe("");
    expect(p.search).toBe("");
  });

  it("takes the first value when a parameter is repeated", () => {
    expect(parseDirectoryParams({ pagina: ["2", "9"] }).page).toBe(2);
  });
});

describe("escapeLikeTerm", () => {
  it("neutralizes ILIKE wildcards so a search stays a literal search", () => {
    expect(escapeLikeTerm("a_b%c\\d")).toBe("a\\_b\\%c\\\\d");
  });
});

describe("sorting and paging links", () => {
  const base = parseDirectoryParams({ q: "ana", pais: "AR", pagina: "4" });

  it("keeps the filters and resets to the first page when the sort changes", () => {
    const next = nextSortState(base, "xp_total");
    expect(next).toEqual({ sort: "xp_total", desc: true, page: 1 });
    expect(directoryHref(base, next)).toBe("/admin/usuarios?q=ana&pais=AR&orden=xp_total");
  });

  it("flips the direction when the active column is chosen again", () => {
    const descending = parseDirectoryParams({ orden: "alias" });
    expect(nextSortState(descending, "alias").desc).toBe(false);
  });

  it("omits every default so the canonical listing URL has no query string", () => {
    expect(directoryQuery(parseDirectoryParams({}))).toBe("");
    expect(directoryHref(parseDirectoryParams({}))).toBe("/admin/usuarios");
  });

  it("carries the detail id without losing the listing state", () => {
    expect(directoryHref(base, {}, { id: "abc" })).toBe(
      "/admin/usuarios?q=ana&pais=AR&pagina=4&id=abc",
    );
  });

  it("reports the sort state for aria-sort", () => {
    expect(ariaSortFor(base, "created_at")).toBe("descending");
    expect(ariaSortFor(base, "alias")).toBe("none");
    expect(ariaSortFor(parseDirectoryParams({ orden: "alias", dir: "asc" }), "alias")).toBe(
      "ascending",
    );
  });

  it("paginates in fixed server-side pages", () => {
    expect(DIRECTORY_PAGE_SIZE).toBeGreaterThan(0);
    expect(directoryQuery(base, { page: 2 })).toContain("pagina=2");
  });
});

describe("small-sample honesty", () => {
  it("refuses to produce a percentage the owner should not act on", () => {
    expect(ratio(1, 3)).toBeNull();
    expect(ratio(0, 0)).toBeNull();
  });

  it("produces a rounded percentage once the denominator is big enough", () => {
    expect(ratio(5, MIN_LEARNERS_FOR_RATES * 2)).toBe(25);
  });

  it("keeps a nonzero bar visible and never divides by an empty maximum", () => {
    expect(barPercent(0, 0)).toBe(0);
    expect(barPercent(1, 100)).toBe(2);
    expect(barPercent(50, 100)).toBe(50);
  });
});
