"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type Result = { ok: true } | { ok: false; error: string };

/**
 * Admin button that asks for a reason (window.prompt) and runs a server action.
 * `run` must be a server action reference (no closures over non-serializable values).
 */
export function ReasonActionButton({
  label,
  prompt,
  done,
  failed,
  run,
  variant = "danger",
  askReason = true,
}: {
  label: string;
  prompt: string;
  done: string;
  failed: string;
  run: (reason: string) => Promise<Result>;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  askReason?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <Button
        size="sm"
        variant={variant}
        disabled={pending}
        onClick={() => {
          const reason = askReason ? window.prompt(prompt) : "";
          if (reason === null) return;
          startTransition(async () => {
            const r = await run(reason);
            setMessage(r.ok ? done : failed);
            if (r.ok) router.refresh();
          });
        }}
      >
        {label}
      </Button>
      {message ? (
        <span role="status" className="text-xs">
          {message}
        </span>
      ) : null}
    </span>
  );
}
