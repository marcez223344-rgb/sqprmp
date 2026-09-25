import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/es-419.json";
import { ReportProblem } from "./report-problem";

vi.mock("@/lib/reports/actions", () => ({ reportExerciseProblemAction: vi.fn() }));
const { reportExerciseProblemAction } = await import("@/lib/reports/actions");
const action = vi.mocked(reportExerciseProblemAction);

/** jsdom has no top layer: `showModal`/`close` only toggle `open` (see reason-dialog.test.tsx). */
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function close() {
    this.open = false;
  };
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const EXERCISE = "11111111-1111-4111-8111-111111111111";
const m = messages.workspace.report;

function mount(sql = "select * from clientes") {
  render(
    <NextIntlClientProvider locale="es-419" messages={messages} timeZone="UTC">
      <ReportProblem exerciseId={EXERCISE} sql={sql} />
    </NextIntlClientProvider>,
  );
  const trigger = screen.getByRole("button", { name: m.open });
  fireEvent.click(trigger);
  return { trigger, dialog: screen.getByRole("dialog", { hidden: true }) };
}

describe("ReportProblem", () => {
  it("opens a named dialog with a labelled category group and note field", () => {
    const { trigger, dialog } = mount();
    expect(dialog).toHaveAttribute("open");
    expect(dialog).toHaveAccessibleName(m.title);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("group", { name: m.categoryLegend })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: m.categories.marked_wrong })).toBeInTheDocument();
    expect(screen.getByLabelText(m.noteLabel)).toBeInTheDocument();
    expect(screen.getByText(m.sqlIncluded)).toBeInTheDocument();
  });

  it("says when the report goes without SQL", () => {
    mount("   ");
    expect(screen.getByText(m.sqlEmpty)).toBeInTheDocument();
  });

  it("announces missing fields and does not call the server", async () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: m.submit }));
    const alerts = await screen.findAllByRole("alert");
    expect(alerts.map((a) => a.textContent)).toContain(m.errors.category_required);
    expect(screen.getByLabelText(m.noteLabel)).toHaveAttribute("aria-invalid", "true");
    expect(action).not.toHaveBeenCalled();
  });

  it("sends category, note and the editor SQL, then closes and confirms next to the trigger", async () => {
    action.mockResolvedValue({ ok: true });
    const { trigger, dialog } = mount();
    fireEvent.click(screen.getByRole("radio", { name: m.categories.data_error }));
    fireEvent.change(screen.getByLabelText(m.noteLabel), {
      target: { value: "La tabla pedidos tiene fechas en el futuro." },
    });
    fireEvent.click(screen.getByRole("button", { name: m.submit }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(m.success));
    expect(action).toHaveBeenCalledWith({
      category: "data_error",
      note: "La tabla pedidos tiene fechas en el futuro.",
      exerciseId: EXERCISE,
      sql: "select * from clientes",
    });
    expect(dialog).not.toHaveAttribute("open");
    expect(trigger).toHaveFocus();
  });

  it("keeps the dialog open and shows the server error", async () => {
    action.mockResolvedValue({ ok: false, error: "rate_limited" });
    const { dialog } = mount();
    fireEvent.click(screen.getByRole("radio", { name: m.categories.other }));
    fireEvent.change(screen.getByLabelText(m.noteLabel), {
      target: { value: "No sé cómo interpretar la pregunta." },
    });
    fireEvent.click(screen.getByRole("button", { name: m.submit }));
    expect(await screen.findByText(m.errors.rate_limited)).toHaveAttribute("role", "alert");
    expect(dialog).toHaveAttribute("open");
  });

  it("closes on Escape and returns focus to the trigger", () => {
    const { trigger, dialog } = mount();
    fireEvent(dialog, new Event("cancel", { bubbles: true, cancelable: true }));
    expect(dialog).not.toHaveAttribute("open");
    expect(trigger).toHaveFocus();
  });
});
