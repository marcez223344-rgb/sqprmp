import { describe, expect, it } from "vitest";
import { glossFor } from "@/config/sql-glossary";

describe("glossFor", () => {
  it("translates known tables and columns", () => {
    expect(glossFor("orders")).toBe("pedidos");
    expect(glossFor("total_amount")).toBe("importe total");
  });

  it("derives a gloss from the suffix", () => {
    expect(glossFor("customer_id")).toBe("identificador de cliente");
    expect(glossFor("shipped_at")).toBe("fecha y hora de despacho");
    expect(glossFor("released_on")).toBe("fecha de publicación");
  });

  it("is case insensitive", () => {
    expect(glossFor("ORDERS")).toBe("pedidos");
  });

  it("returns null rather than guessing", () => {
    expect(glossFor("zzz")).toBeNull();
    expect(glossFor("xyz_column")).toBeNull();
  });
});
