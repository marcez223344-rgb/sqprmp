"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { cancelDataRequest, requestDataAction } from "@/lib/profile/actions";

interface DataRequest {
  id: string;
  type: string;
  status: string;
  requested_at: string;
}

export function PrivacyPanel({ requests }: { requests: DataRequest[] }) {
  const t = useTranslations("profile.privacy");
  const format = useFormatter();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [confirmDeletion, setConfirmDeletion] = useState(false);

  const pendingExport = requests.find((r) => r.type === "export");
  const pendingDeletion = requests.find((r) => r.type === "deletion");

  function request(type: "export" | "deletion") {
    setMessage(null);
    startTransition(async () => {
      const result = await requestDataAction(type);
      setMessage(result.ok ? t(`requested.${type}`) : t(`errors.${result.error}` as never));
      setConfirmDeletion(false);
      router.refresh();
    });
  }

  function cancel(id: string) {
    setMessage(null);
    startTransition(async () => {
      const result = await cancelDataRequest(id);
      setMessage(result.ok ? t("cancelled") : t("errors.unknown"));
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h3 className="font-medium">{t("export.title")}</h3>
        <p className="text-muted text-sm">{t("export.body")}</p>
        {pendingExport ? (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span>
              {t("pendingSince", {
                date: format.dateTime(new Date(pendingExport.requested_at), {
                  dateStyle: "medium",
                }),
              })}
            </span>
            <Button
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() => cancel(pendingExport.id)}
            >
              {t("cancel")}
            </Button>
          </div>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            disabled={pending}
            onClick={() => request("export")}
          >
            {t("export.cta")}
          </Button>
        )}
      </section>

      <section className="space-y-2">
        <h3 className="font-medium">{t("deletion.title")}</h3>
        <p className="text-muted text-sm">{t("deletion.body")}</p>
        {pendingDeletion ? (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span>
              {t("pendingSince", {
                date: format.dateTime(new Date(pendingDeletion.requested_at), {
                  dateStyle: "medium",
                }),
              })}
            </span>
            <Button
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() => cancel(pendingDeletion.id)}
            >
              {t("cancel")}
            </Button>
          </div>
        ) : confirmDeletion ? (
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="danger"
              size="sm"
              disabled={pending}
              onClick={() => request("deletion")}
            >
              {t("deletion.confirm")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() => setConfirmDeletion(false)}
            >
              {t("cancel")}
            </Button>
          </div>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            disabled={pending}
            onClick={() => setConfirmDeletion(true)}
          >
            {t("deletion.cta")}
          </Button>
        )}
      </section>

      <p role="status" aria-live="polite" className="text-muted text-sm">
        {message}
      </p>
    </div>
  );
}
