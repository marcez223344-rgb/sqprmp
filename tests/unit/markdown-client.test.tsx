import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";
import messages from "@/messages/es-419.json";
import { MarkdownClient } from "@/components/workspace/markdown-client";

/**
 * Exercise prose (scenarios, hints, solutions, quiz prompts) used to go through a second, poorer
 * renderer than lesson bodies: a bare `ReactMarkdown`, so the same authored Markdown showed
 * uncoloured code and no lesson blocks once it was inside the workspace. `MarkdownClient` now
 * delegates to `Markdown`; these tests fail if it ever forks again.
 */
function renderMd(md: string) {
  return render(
    <NextIntlClientProvider locale="es-419" messages={messages} timeZone="UTC">
      <MarkdownClient>{md}</MarkdownClient>
    </NextIntlClientProvider>,
  );
}

describe("MarkdownClient", () => {
  it("colours SQL instead of printing a plain code block", () => {
    const { container } = renderMd("```sql\nselect id from orders;\n```");
    // The highlighter wraps keywords in spans; a bare <pre> with one text node means the old
    // renderer is back.
    expect(container.querySelectorAll("code span").length).toBeGreaterThan(0);
    expect(screen.getByText("select")).toBeInTheDocument();
  });

  it("renders the authored lesson blocks with labels from the catalogue", () => {
    renderMd("```clave\nUn JOIN no multiplica filas por arte de magia.\n```");
    expect(screen.getByText(messages.lesson.block.keyIdea)).toBeInTheDocument();
  });

  it("still renders plain prose and GitHub-flavoured tables", () => {
    renderMd("Texto **en negrita**\n\n| a | b |\n| - | - |\n| 1 | 2 |");
    expect(screen.getByText("en negrita")).toBeInTheDocument();
    expect(screen.getByRole("table")).toBeInTheDocument();
  });
});
