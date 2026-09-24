import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { lessons } from "@/content/lessons/alias-y-expresiones";
import { LESSON_BLOCK_LABELS } from "@/content/lesson-block-labels";
import { Markdown } from "./markdown";
import { tokenizeSql } from "./sql-highlight";

afterEach(cleanup);

describe("SQL tokenizer", () => {
  it("separates keywords, calls, strings, numbers and comments", () => {
    const tokens = tokenizeSql("-- nota\nSELECT round(x, 2) FROM t WHERE c = 'ab''c';");
    const of = (kind: string) => tokens.filter((t) => t.kind === kind).map((t) => t.value);
    expect(of("comment")).toEqual(["-- nota"]);
    expect(of("keyword")).toEqual(expect.arrayContaining(["SELECT", "FROM", "WHERE"]));
    expect(of("function")).toEqual(["round"]);
    expect(of("number")).toEqual(["2"]);
    // A doubled quote stays inside the same literal.
    expect(of("string")).toEqual(["'ab''c'"]);
  });

  it("does not treat a keyword followed by a parenthesis as a call", () => {
    expect(
      tokenizeSql("count(*) OVER (PARTITION BY k)").find((t) => t.value === "OVER")?.kind,
    ).toBe("keyword");
  });

  it("round-trips the source exactly, so the learner reads back what they would type", () => {
    const sql = "SELECT a || 'x' AS b /* c */ FROM t;";
    expect(
      tokenizeSql(sql)
        .map((t) => t.value)
        .join(""),
    ).toBe(sql);
  });
});

describe("authored lesson blocks", () => {
  const body = lessons[0]!.body_md ?? "";

  it("renders the outcome list, the key idea and the diagram of the lesson", () => {
    render(<Markdown>{body}</Markdown>);
    expect(screen.getByText(LESSON_BLOCK_LABELS.objectives)).toBeInTheDocument();
    expect(screen.getByText(LESSON_BLOCK_LABELS.keyIdea)).toBeInTheDocument();
    expect(screen.getAllByText(LESSON_BLOCK_LABELS.diagram).length).toBeGreaterThan(0);
  });

  it("labels the wrong/right pair with words, not only with colour", () => {
    render(<Markdown>{body}</Markdown>);
    expect(screen.getAllByText(LESSON_BLOCK_LABELS.wrong).length).toBeGreaterThan(0);
    expect(screen.getAllByText(LESSON_BLOCK_LABELS.right).length).toBeGreaterThan(0);
  });

  it("renders an inline result as a real table with column headers", () => {
    render(<Markdown>{body}</Markdown>);
    const header = screen.getAllByRole("columnheader", { name: "neto" });
    expect(header.length).toBeGreaterThan(0);
  });

  it("gives every diagram a visible text alternative and hides the picture itself", () => {
    const { container } = render(<Markdown>{body}</Markdown>);
    const figures = [...container.querySelectorAll("figure")].filter((f) =>
      f.textContent?.includes(LESSON_BLOCK_LABELS.diagram),
    );
    expect(figures.length).toBeGreaterThan(0);
    for (const figure of figures) {
      expect(figure.querySelector("figcaption")?.textContent?.length ?? 0).toBeGreaterThan(40);
      expect(figure.querySelector('[aria-hidden="true"] ol, [aria-hidden="true"] table')).not.toBe(
        null,
      );
    }
  });

  it("keeps inline code inline and never renders a fence as an inline span", () => {
    const { container } = render(<Markdown>{"Usa `LIMIT`.\n\n```sql\nSELECT 1;\n```\n"}</Markdown>);
    expect(container.querySelectorAll("code.inline-code")).toHaveLength(1);
    expect(container.querySelectorAll("pre > code")).toHaveLength(1);
  });

  it("falls back to the text alternative when a diagram name is unknown", () => {
    render(<Markdown>{"```diagrama no-existe\nDescripción de respaldo.\n```\n"}</Markdown>);
    expect(screen.getByText("Descripción de respaldo.")).toBeInTheDocument();
  });
});
