"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

/**
 * «Copiar contexto para tu IA» (D-40). Receives text the server already assembled from what this
 * page shows; it never builds or fetches anything itself. When the Clipboard API is missing or
 * refused (insecure origin, old browser, denied permission) it reveals the text selected in a
 * read-only field so the learner can copy it by hand.
 */
export function CopyAiContext({ prompt }: { prompt: string }) {
  const t = useTranslations("workspace.aiContext");
  const [status, setStatus] = useState<"idle" | "copied" | "fallback">("idle");
  const fallbackRef = useRef<HTMLTextAreaElement>(null);
  const noteId = useId();
  const fallbackHintId = useId();

  useEffect(() => {
    if (status !== "fallback") return;
    fallbackRef.current?.focus();
    fallbackRef.current?.select();
  }, [status]);

  async function copy() {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("clipboard unavailable");
      await navigator.clipboard.writeText(prompt);
      // A live region only speaks when its text changes: clear it first and set it again on the
      // next frame, so a second copy is announced too, not only the first.
      setStatus("idle");
      requestAnimationFrame(() => setStatus("copied"));
    } catch {
      setStatus("fallback");
    }
  }

  return (
    <div className="mt-4 space-y-2">
      <Button variant="secondary" size="md" onClick={copy} aria-describedby={noteId}>
        {status === "copied" ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
        {t("button")}
      </Button>
      <p role="status" aria-live="polite" className="text-success-ink text-sm font-medium">
        {status === "copied" ? t("copied") : ""}
      </p>
      <p id={noteId} className="text-muted text-xs">
        {t("privacyNote")}
      </p>
      {status === "fallback" ? (
        <div className="space-y-1">
          <label htmlFor={`${fallbackHintId}-text`} className="text-sm font-medium">
            {t("fallbackLabel")}
          </label>
          <p id={fallbackHintId} className="text-muted text-xs">
            {t("fallbackHint")}
          </p>
          <textarea
            ref={fallbackRef}
            id={`${fallbackHintId}-text`}
            readOnly
            value={prompt}
            aria-describedby={fallbackHintId}
            rows={10}
            className="border-border bg-surface focus-visible:outline-ring w-full rounded-md border p-2 font-mono text-xs focus-visible:outline-2"
            onFocus={(e) => e.currentTarget.select()}
          />
        </div>
      ) : null}
    </div>
  );
}
