import { describe, expect, it } from "vitest";
import { safeNextPath } from "@/lib/auth/redirect";

describe("safeNextPath", () => {
  it("accepts internal absolute paths", () => {
    expect(safeNextPath("/aprender")).toBe("/aprender");
    expect(safeNextPath("/ejercicio/select-basico?tab=teoria")).toBe(
      "/ejercicio/select-basico?tab=teoria",
    );
  });
  it("rejects open-redirect vectors", () => {
    for (const bad of [
      "https://evil.example",
      "//evil.example",
      "/\\evil.example",
      "javascript:alert(1)",
      "/auth/callback",
      "/x\r\nSet-Cookie: a=b",
      "",
      null,
      undefined,
    ]) {
      expect(safeNextPath(bad)).toBe("/aprender");
    }
  });
  it("uses the provided fallback", () => {
    expect(safeNextPath("http://x", "/perfil")).toBe("/perfil");
  });
});
