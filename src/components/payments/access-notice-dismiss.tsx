"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { acknowledgeAccessNoticeAction } from "@/lib/payments/actions";

/** Dismissing is persisted server-side (`entitlements.acknowledged_at`), not in browser storage. */
export function AccessNoticeDismiss({ label }: { label: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await acknowledgeAccessNoticeAction();
          router.refresh();
        })
      }
    >
      <X aria-hidden="true" className="size-4" />
      {label}
    </Button>
  );
}
