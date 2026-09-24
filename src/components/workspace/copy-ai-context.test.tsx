import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";
import messages from "@/messages/es-419.json";
import { CopyAiContext } from "./copy-ai-context";

const PROMPT = "Trabajo como analista de datos con la base «Bolsillo».";

function renderIt() {
  return render(
    <NextIntlClientProvider locale="es-419" messages={messages} timeZone="UTC">
      <CopyAiContext prompt={PROMPT} />
    </NextIntlClientProvider>,
  );
}

describe("CopyAiContext", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true });
  });

  it("copies the prompt and announces it in a live region", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    renderIt();
    expect(screen.getByText(messages.workspace.aiContext.privacyNote)).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: messages.workspace.aiContext.button }));
    });
    expect(writeText).toHaveBeenCalledWith(PROMPT);
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(messages.workspace.aiContext.copied),
    );
  });

  it("falls back to a selected read-only field when the Clipboard API is missing", async () => {
    Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true });
    renderIt();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: messages.workspace.aiContext.button }));
    });
    const field = screen.getByLabelText(messages.workspace.aiContext.fallbackLabel);
    expect(field).toHaveValue(PROMPT);
    expect(field).toHaveAttribute("readonly");
    expect(field).toHaveFocus();
  });
});
