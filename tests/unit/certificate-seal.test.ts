import { describe, expect, it } from "vitest";
import { SEAL_COLORS, SEAL_SHAPES, sealDataUri, sealSvgMarkup } from "@/lib/certificates/seal";

describe("certificate seal", () => {
  it("is drawn only from brand colours", () => {
    const allowed = new Set<string>(Object.values(SEAL_COLORS));
    for (const s of SEAL_SHAPES) {
      if (s.fill) expect(allowed.has(s.fill)).toBe(true);
      if (s.stroke) expect(allowed.has(s.stroke)).toBe(true);
    }
  });

  it("produces a standalone SVG with every shape and no emoji or text", () => {
    const svg = sealSvgMarkup();
    expect(svg.startsWith("<svg xmlns=")).toBe(true);
    expect((svg.match(/<(path|circle) /g) ?? []).length).toBe(SEAL_SHAPES.length);
    expect(svg).not.toMatch(/\p{Extended_Pictographic}/u);
    expect(svg).not.toContain("<text");
  });

  it("has finite coordinates only (a NaN would silently drop a shape in the PDF)", () => {
    expect(sealSvgMarkup()).not.toMatch(/NaN|Infinity/);
  });

  it("encodes as a data URI for the share image", () => {
    expect(sealDataUri()).toMatch(/^data:image\/svg\+xml;utf8,%3Csvg/);
  });
});
