"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ReasonDialog } from "@/components/admin/reason-dialog";
import { Button } from "@/components/ui/button";

type Result = { ok: true } | { ok: false; error: string };

/** Server-side minimum for every `reason` in src/lib/admin/actions.ts (`z.string().min(3)`). */
const REASON_MIN_LENGTH = 3;

/**
 * Admin button that asks for a justification in an accessible modal and runs a server action.
 * `run` must be a server action reference (no closures over non-serializable values).
 *
 * The reason is written to `audit_logs`, so a rejected reason gets its own message instead of the
 * generic failure text, and focus returns to the trigger when the dialog closes.
 */
export function ReasonActionButton({
  label,
  prompt,
  done,
  failed,
  run,
  variant = "danger",
  askReason = true,
  title,
}: {
  label: string;
  /** Label of the reason field. */
  prompt: string;
  done: string;
  failed: string;
  run: (reason: string) => Promise<Result>;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  askReason?: boolean;
  /** Dialog heading; defaults to the button label. */
  title?: string;
}) {
  const t = useTranslations("admin.reasonDialog");
  const router = useRouter();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  const execute = (reason: string) => {
    startTransition(async () => {
      const result = await run(reason);
      setMessage(result.ok ? done : failed);
      if (result.ok) router.refresh();
    });
    close();
  };

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <Button
        ref={triggerRef}
        size="sm"
        variant={variant}
        disabled={pending}
        aria-haspopup={askReason ? "dialog" : undefined}
        aria-expanded={askReason ? open : undefined}
        onClick={() => (askReason ? setOpen(true) : execute(""))}
      >
        {label}
      </Button>
      {askReason ? (
        <ReasonDialog
          open={open}
          title={title ?? label}
          label={prompt}
          submitLabel={label}
          cancelLabel={t("cancel")}
          invalidMessage={t("required", { min: REASON_MIN_LENGTH })}
          minLength={REASON_MIN_LENGTH}
          pending={pending}
          onCancel={close}
          onSubmit={execute}
        />
      ) : null}
      {message ? (
        <span role="status" className="text-xs">
          {message}
        </span>
      ) : null}
    </span>
  );
}
