import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { Callout } from "./callout";
import { CATEGORY_STYLES, SectionHeader, sectionCategories } from "./section-header";

afterEach(cleanup);

describe("SectionHeader", () => {
  it("renders a decorative icon and a text label for every category", () => {
    for (const category of sectionCategories) {
      const { container, unmount } = render(
        <SectionHeader category={category} eyebrow={`etiqueta ${category}`} />,
      );
      // `neutral` has no icon of its own; the rest must never rely on the glyph alone.
      const svg = container.querySelector("svg");
      if (CATEGORY_STYLES[category].icon) {
        expect(svg).toBeTruthy();
        expect(svg?.closest("[aria-hidden='true']")).toBeTruthy();
      }
      expect(screen.getByText(`etiqueta ${category}`)).toBeInTheDocument();
      unmount();
    }
  });

  it("puts the icon container on the same 32 px grid everywhere", () => {
    const { container } = render(<SectionHeader category="why" eyebrow="Por qué importa" />);
    const box = container.querySelector("span[aria-hidden='true']");
    expect(box?.className).toContain("size-8");
    expect(box?.className).toContain("rounded-md");
  });

  it("promotes the eyebrow to a real heading when there is no title", () => {
    render(<SectionHeader as="h2" category="hint" eyebrow="Pistas" />);
    expect(screen.getByRole("heading", { level: 2, name: "Pistas" })).toBeInTheDocument();
  });

  it("keeps the title as the heading and the eyebrow as a label", () => {
    render(<SectionHeader as="h2" category="concept" eyebrow="Teoría" title="Índices" />);
    expect(screen.getByRole("heading", { level: 2, name: "Índices" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Teoría" })).toBeNull();
  });
});

describe("Callout", () => {
  it("names the block after its label when an id is given", () => {
    render(
      <Callout category="pitfall" as="h3" title="Errores comunes" labelId="pitfall-1">
        <p>Cuidado con NULL.</p>
      </Callout>,
    );
    expect(screen.getByRole("region", { name: "Errores comunes" })).toBeInTheDocument();
  });

  it("applies one surface change from the closed vocabulary, never an ad-hoc colour", () => {
    const { container } = render(<Callout category="feedback-correct">ok</Callout>);
    const section = container.querySelector("section");
    expect(section?.className).toContain(CATEGORY_STYLES["feedback-correct"].surface.split(" ")[0]);
    expect(section?.className).not.toContain("shadow");
  });

  it("announces politely only when asked to", () => {
    const { container } = render(
      <Callout category="feedback-incorrect" live>
        no
      </Callout>,
    );
    const section = container.querySelector("section");
    expect(section?.getAttribute("aria-live")).toBe("polite");
    expect(section?.getAttribute("role")).toBe("status");
  });
});
