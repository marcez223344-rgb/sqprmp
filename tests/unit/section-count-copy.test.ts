import { createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";
import messages from "@/messages/es-419.json";
import { course } from "@/content/course";

/**
 * The section count in marketing copy used to be typed by hand ("40 secciones", "cuarenta
 * secciones") and drifted every time a section was added. The pages now pass the count of the
 * loaded curriculum; these keys must render whatever number they receive.
 */
const t = createTranslator({ locale: "es-419", messages });

const COPY = [
  ["landing.curriculum.subtitle", () => t("landing.curriculum.subtitle", { sections: 37 })],
  ["curriculum.intro", () => t("curriculum.intro", { sections: 37 })],
  ["pricing.full.items.all", () => t("pricing.full.items.all", { sections: 37 })],
] as const;

describe("section count in copy", () => {
  it.each(COPY)("%s renders the count it is given", (_key, render) => {
    const text = render();
    expect(text).toContain("37 secciones");
    expect(text).not.toMatch(/\b(39|40)\b|cuarenta|treinta/);
  });

  it("the seeded course description carries no hand-typed section count", () => {
    expect(course.description).not.toMatch(/\d+\s+secciones|cuarenta|treinta/);
  });
});
