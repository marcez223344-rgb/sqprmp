import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CopyButton } from "./copy-button";

const SQL = "SELECT order_id FROM orders;";

function renderIt() {
  return render(
    <CopyButton
      text={SQL}
      label="Copiar"
      accessibleLabel="Copiar la solución"
      copiedMessage="Copiado"
      failedMessage="No pudimos copiar."
    />,
  );
}

describe("CopyButton", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true });
  });

  it("copies the text and announces it in a live region", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    renderIt();
    expect(screen.getByRole("status")).toHaveTextContent("");
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copiar la solución" }));
    });
    expect(writeText).toHaveBeenCalledWith(SQL);
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Copiado"));
  });

  it("explains how to copy by hand when the Clipboard API is missing", async () => {
    Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true });
    renderIt();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copiar la solución" }));
    });
    expect(screen.getByRole("status")).toHaveTextContent("No pudimos copiar.");
  });
});
