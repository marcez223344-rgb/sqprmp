import { describe, expect, it } from "vitest";
import { sectionsInUpsertOrder } from "@/content/build-order";

describe("sectionsInUpsertOrder", () => {
  it("frees a number before it is taken when a section is inserted mid-path", () => {
    // Live database before the change: capstone at 39. After: new section at 39, capstone at 40.
    const live = new Map<string, number>([
      ["desafios-de-entrevista", 38],
      ["proyectos-finales", 39],
    ]);
    const next = [
      { slug: "desafios-de-entrevista", number: 38 },
      { slug: "sql-con-ia", number: 39 },
      { slug: "proyectos-finales", number: 40 },
    ];
    for (const s of sectionsInUpsertOrder(next)) {
      live.set(s.slug, s.number);
      const numbers = [...live.values()];
      expect(new Set(numbers).size).toBe(numbers.length);
    }
  });

  it("does not mutate its input", () => {
    const input = [{ number: 1 }, { number: 2 }];
    sectionsInUpsertOrder(input);
    expect(input.map((s) => s.number)).toEqual([1, 2]);
  });
});
