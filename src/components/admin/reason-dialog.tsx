"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";

/**
 * Modal reason prompt for privileged, audit-logged admin mutations (grants, revocations,
 * certificate revocation, manual payment review).
 *
 * Built on the native `<dialog>` element with `showModal()`, so the browser supplies the focus
 * trap, the top layer, the backdrop and Escape-to-cancel — no dialog dependency, and nothing to
 * get wrong by hand. It replaces `window.prompt`, which is not announced usefully by screen
 * readers, cannot show a field-specific validation message and is suppressed in some contexts:
 * the text typed here is what ends up in `audit_logs.diff`, so it has to be a real input.
 *
 * The minimum length is validated here with the specific message and again on the server (the
 * server remains the authority; this only avoids a round trip and a generic failure toast).
 */
export function ReasonDialog({
  open,
  title,
  label,
  hint,
  submitLabel,
  cancelLabel,
  invalidMessage,
  minLength = 0,
  maxLength = 500,
  pending = false,
  onCancel,
  onSubmit,
}: {
  open: boolean;
  title: string;
  label: string;
  hint?: string;
  submitLabel: string;
  cancelLabel: string;
  /** Shown when the reason is shorter than `minLength`. */
  invalidMessage: string;
  /** Must match the server's minimum (0 = the reason is optional). */
  minLength?: number;
  maxLength?: number;
  pending?: boolean;
  onCancel: () => void;
  onSubmit: (reason: string) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const uid = useId();
  const fieldId = `${uid}-reason`;
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) {
      setReason("");
      setError(null);
      el.showModal();
    } else if (!open && el.open) {
      el.close();
    }
  }, [open]);

  const describedBy =
    [hint ? `${fieldId}-hint` : null, error ? `${fieldId}-error` : null]
      .filter(Boolean)
      .join(" ") || undefined;

  return (
    <dialog
      ref={ref}
      aria-labelledby={`${uid}-title`}
      className="bg-surface text-text border-border m-auto w-[min(32rem,calc(100vw-2rem))] rounded-lg border p-6 backdrop:bg-black/50"
      // Escape and the backdrop fire `cancel`; preventing the default close keeps a single exit
      // path through the parent's state, which also restores focus to the trigger.
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          const value = reason.trim();
          if (value.length < minLength) {
            setError(invalidMessage);
            return;
          }
          setError(null);
          onSubmit(value);
        }}
      >
        <h2 id={`${uid}-title`} className="font-heading text-lg font-semibold">
          {title}
        </h2>
        <Field id={fieldId} label={label} hint={hint} error={error ?? undefined}>
          <textarea
            id={fieldId}
            className="input min-h-24 w-full"
            value={reason}
            onChange={(event) => {
              setReason(event.target.value);
              if (error) setError(null);
            }}
            maxLength={maxLength}
            aria-describedby={describedBy}
            aria-invalid={error ? true : undefined}
          />
        </Field>
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
            {cancelLabel}
          </Button>
          <Button type="submit" disabled={pending}>
            {submitLabel}
          </Button>
        </div>
      </form>
    </dialog>
  );
}
