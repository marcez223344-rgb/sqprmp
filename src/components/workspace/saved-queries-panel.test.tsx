import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/es-419.json";
import { SavedQueriesPanel } from "./saved-queries-panel";

vi.mock("@/lib/progress/actions", () => ({ listSavedQueriesAction: vi.fn() }));
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const { listSavedQueriesAction } = await import("@/lib/progress/actions");
const mocked = vi.mocked(listSavedQueriesAction);

const QUERY = {
  id: "9f1a0f1e-0000-4000-8000-000000000001",
  title: "Ventas por país",
  sql: "select country, count(*) from orders group by country",
  datasetSlug: "marketplace",
  updatedAt: "2026-09-20T10:00:00.000Z",
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function mount(currentSql: string, onLoad = vi.fn()) {
  render(
    <NextIntlClientProvider locale="es-419" messages={messages} timeZone="UTC">
      <SavedQueriesPanel currentSql={currentSql} onLoad={onLoad} />
    </NextIntlClientProvider>,
  );
  return { onLoad, trigger: screen.getByRole("button", { expanded: false }) };
}

describe("SavedQueriesPanel", () => {
  it("lists the learner's saved queries when the panel is opened", async () => {
    mocked.mockResolvedValue({ ok: true, queries: [QUERY] });
    const { trigger } = mount("");
    fireEvent.click(trigger);
    expect(await screen.findByText(QUERY.title)).toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });

  it("shows an empty state instead of a blank panel", async () => {
    mocked.mockResolvedValue({ ok: true, queries: [] });
    const { trigger } = mount("");
    fireEvent.click(trigger);
    expect(await screen.findByText(messages.workspace.savedQueries.empty)).toBeInTheDocument();
  });

  it("reports a failed load and offers a retry", async () => {
    mocked.mockResolvedValue({ ok: false, error: "unknown" });
    const { trigger } = mount("");
    fireEvent.click(trigger);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      messages.workspace.savedQueries.errors.unknown,
    );
  });

  it("loads a query straight into an empty editor", async () => {
    mocked.mockResolvedValue({ ok: true, queries: [QUERY] });
    const { onLoad, trigger } = mount("   ");
    fireEvent.click(trigger);
    fireEvent.click(await screen.findByRole("button", { name: /Cargar en el editor/ }));
    expect(onLoad).toHaveBeenCalledWith(QUERY.sql);
  });

  /** The rule the owner asked for: never discard an unsaved draft without warning first. */
  it("asks before replacing a draft that is still in the editor", async () => {
    mocked.mockResolvedValue({ ok: true, queries: [QUERY] });
    const { onLoad, trigger } = mount("select * from orders");
    fireEvent.click(trigger);
    fireEvent.click(await screen.findByRole("button", { name: /Cargar en el editor/ }));
    expect(onLoad).not.toHaveBeenCalled();
    expect(screen.getByText(messages.workspace.savedQueries.replaceWarning)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^Reemplazar$/ }));
    expect(onLoad).toHaveBeenCalledWith(QUERY.sql);
  });

  it("does not warn when the editor already holds the same query", async () => {
    mocked.mockResolvedValue({ ok: true, queries: [QUERY] });
    const { onLoad, trigger } = mount(`  ${QUERY.sql}  `);
    fireEvent.click(trigger);
    fireEvent.click(await screen.findByRole("button", { name: /Cargar en el editor/ }));
    expect(onLoad).toHaveBeenCalledWith(QUERY.sql);
  });
});
