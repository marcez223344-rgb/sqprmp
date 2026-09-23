import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { lessons } from "@/content/lessons/distinct";
import { headingCategory, Markdown, normalizeHeading } from "./markdown";

afterEach(cleanup);

/**
 * Item 4 of the 2026-09-23 owner feedback is solved with **zero content edits**: the nine stable
 * pedagogy headings are matched by text in the renderer. ~450 one-off headings keep the plain
 * treatment, and every `h2` gets the top rule that gives a long lesson its rhythm.
 */
describe("lesson heading categories", () => {
  it("maps the nine recurring pedagogy headings", () => {
    expect(headingCategory("Por qué importa")).toBe("why");
    expect(headingCategory("El concepto")).toBe("concept");
    expect(headingCategory("La sintaxis")).toBe("concept");
    expect(headingCategory("Ejemplo resuelto")).toBe("example");
    expect(headingCategory("Ejemplo ejecutable")).toBe("example");
    expect(headingCategory("Errores comunes")).toBe("pitfall");
    expect(headingCategory("Errores frecuentes")).toBe("pitfall");
    expect(headingCategory("Verificar el resultado")).toBe("verify");
    expect(headingCategory("Resumen")).toBe("summary");
    expect(headingCategory("En resumen")).toBe("summary");
  });

  it("tolerates case, accents and a trailing colon, so a small drift still matches", () => {
    expect(headingCategory("POR QUE IMPORTA")).toBe("why");
    expect(headingCategory("Por qué importa:")).toBe("why");
    expect(headingCategory("  errores   comunes ")).toBe("pitfall");
    expect(normalizeHeading("Verificar.")).toBe("verificar");
  });

  it("leaves the ~450 one-off headings unadorned", () => {
    expect(headingCategory("DISTINCT y NULL")).toBeNull();
    expect(headingCategory("La trampa del WHERE")).toBeNull();
  });
});

describe("Markdown rendering of lesson prose", () => {
  const body = lessons[0]!.body_md ?? "";

  it("keeps the accessible name of a decorated heading equal to the authored text", () => {
    render(<Markdown>{body}</Markdown>);
    const heading = screen.getByRole("heading", { level: 2, name: "Por qué importa" });
    expect(heading).toBeInTheDocument();
    // The icon is decoration: it sits outside the heading and is hidden from assistive tech.
    expect(heading.querySelector("svg")).toBeNull();
  });

  it("decorates the matched headings and not the one-off ones", () => {
    const { container } = render(<Markdown>{body}</Markdown>);
    const decorated = (name: string) => {
      const heading = screen.getByRole("heading", { level: 2, name });
      return heading.parentElement?.parentElement?.querySelector("svg[aria-hidden]") !== null;
    };
    expect(decorated("El concepto")).toBe(true);
    expect(decorated("Ejemplo resuelto")).toBe(true);
    const oneOff = screen.getByRole("heading", { level: 2, name: "DISTINCT y NULL" });
    expect(oneOff.querySelector("svg")).toBeNull();
    // Every h2 carries the top rule, decorated or not.
    for (const h2 of container.querySelectorAll("h2")) {
      const ruled = h2.className.includes("border-t") || h2.closest(".border-t") !== null;
      expect(ruled).toBe(true);
    }
  });
});
