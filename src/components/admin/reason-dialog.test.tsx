import "@testing-library/jest-dom/vitest";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ReasonDialog } from "./reason-dialog";

/**
 * jsdom does not implement the top layer, so `showModal`/`close` are shimmed to just toggle the
 * `open` attribute. The focus trap and the backdrop are the browser's job; what is tested here is
 * the part we wrote: the validation message and the cancel path.
 */
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function close() {
    this.open = false;
  };
});

afterEach(cleanup);

const labels = {
  title: "Revocar acceso",
  label: "Motivo",
  submitLabel: "Revocar",
  cancelLabel: "Cancelar",
  invalidMessage: "El motivo es obligatorio (mínimo 3 caracteres).",
};

describe("ReasonDialog", () => {
  it("shows a labelled field and names the dialog", () => {
    render(<ReasonDialog open minLength={3} {...labels} onCancel={vi.fn()} onSubmit={vi.fn()} />);
    const dialog = screen.getByRole("dialog", { hidden: true });
    expect(dialog).toHaveAttribute("open");
    expect(screen.getByLabelText("Motivo")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Revocar acceso" })).toBeInTheDocument();
  });

  it("refuses a reason shorter than the server minimum with the specific message", () => {
    const onSubmit = vi.fn();
    render(<ReasonDialog open minLength={3} {...labels} onCancel={vi.fn()} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText("Motivo"), { target: { value: "  a " } });
    fireEvent.click(screen.getByRole("button", { name: "Revocar" }));
    expect(onSubmit).not.toHaveBeenCalled();
    const error = screen.getByRole("alert");
    expect(error).toHaveTextContent(labels.invalidMessage);
    expect(screen.getByLabelText("Motivo")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Motivo")).toHaveAccessibleDescription(labels.invalidMessage);
  });

  it("submits the trimmed reason once it is long enough", () => {
    const onSubmit = vi.fn();
    render(<ReasonDialog open minLength={3} {...labels} onCancel={vi.fn()} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText("Motivo"), {
      target: { value: "  beca para estudiante  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Revocar" }));
    expect(onSubmit).toHaveBeenCalledWith("beca para estudiante");
  });

  it("accepts an empty reason when the server does not require one", () => {
    const onSubmit = vi.fn();
    render(<ReasonDialog open {...labels} onCancel={vi.fn()} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole("button", { name: "Revocar" }));
    expect(onSubmit).toHaveBeenCalledWith("");
  });

  it("cancels without submitting, both from the button and from Escape", () => {
    const onCancel = vi.fn();
    const onSubmit = vi.fn();
    render(<ReasonDialog open minLength={3} {...labels} onCancel={onCancel} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    // Escape fires `cancel` on the dialog element; the component turns it into onCancel.
    fireEvent(screen.getByRole("dialog", { hidden: true }), new Event("cancel", { bubbles: true }));
    expect(onCancel).toHaveBeenCalledTimes(2);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
