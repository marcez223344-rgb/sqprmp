"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Button, type ButtonProps } from "./button";

/**
 * Copies a finished string to the clipboard and says so in a polite live region. Every label comes
 * from the caller, so the component carries no copy of its own. When the Clipboard API is missing
 * or refused (insecure origin, old browser, denied permission) the region explains how to copy by
 * hand instead of failing silently; the text being copied is always visible next to the button.
 */
export function CopyButton({
  text,
  label,
  accessibleLabel,
  copiedMessage,
  failedMessage,
  variant = "secondary",
  size = "sm",
  className,
}: {
  text: string;
  /** Visible text of the button. */
  label: string;
  /** Longer accessible name; must start with the visible label (WCAG 2.5.3, label in name). */
  accessibleLabel?: string;
  copiedMessage: string;
  failedMessage: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  /** Applied to the wrapper that holds the button and its status line. */
  className?: string;
}) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");

  async function copy() {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("clipboard unavailable");
      await navigator.clipboard.writeText(text);
      // A live region only speaks when its text changes: clear it first and set it again on the
      // next frame, so a second copy is announced too, not only the first.
      setStatus("idle");
      requestAnimationFrame(() => setStatus("copied"));
    } catch {
      setStatus("failed");
    }
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <Button variant={variant} size={size} onClick={copy} aria-label={accessibleLabel}>
        {status === "copied" ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
        {label}
      </Button>
      <span
        role="status"
        aria-live="polite"
        className={status === "failed" ? "text-muted text-xs" : "text-success-ink text-xs"}
      >
        {status === "copied" ? copiedMessage : status === "failed" ? failedMessage : ""}
      </span>
    </div>
  );
}
