"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { setFeatureFlagAction } from "@/lib/admin/actions";

export function FlagRow({
  flag,
}: {
  flag: {
    key: string;
    enabled: boolean;
    isPublic: boolean;
    fromDb: boolean;
    updatedAt: string | null;
  };
}) {
  const t = useTranslations("admin.flags");
  const router = useRouter();
  const [enabled, setEnabled] = useState(flag.enabled);
  const [isPublic, setIsPublic] = useState(flag.isPublic);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const dirty = enabled !== flag.enabled || isPublic !== flag.isPublic;
  const locked = flag.key === "paymentsLive";
  return (
    <tr className="border-border border-t">
      <td className="py-2 pr-3 font-mono">{flag.key}</td>
      <td className="py-2 pr-3">
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            className="size-4"
            checked={enabled}
            disabled={locked || pending}
            onChange={(e) => setEnabled(e.target.checked)}
          />
          <span className="sr-only">{t("enabledFor", { key: flag.key })}</span>
        </label>
      </td>
      <td className="py-2 pr-3">
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            className="size-4"
            checked={isPublic}
            disabled={locked || pending}
            onChange={(e) => setIsPublic(e.target.checked)}
          />
          <span className="sr-only">{t("publicFor", { key: flag.key })}</span>
        </label>
      </td>
      <td className="text-muted py-2 pr-3 text-xs">
        {locked ? t("locked") : flag.fromDb ? t("fromDb") : t("fromCode")}
      </td>
      <td className="py-2">
        <span className="inline-flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            disabled={!dirty || pending || locked}
            onClick={() => {
              const reason = window.prompt(t("reasonPrompt"));
              if (reason === null) return;
              startTransition(async () => {
                const r = await setFeatureFlagAction(flag.key, enabled, isPublic, reason);
                setMessage(r.ok ? t("saved") : t("failed"));
                if (r.ok) router.refresh();
              });
            }}
          >
            {t("save")}
          </Button>
          {message ? (
            <span role="status" className="text-xs">
              {message}
            </span>
          ) : null}
        </span>
      </td>
    </tr>
  );
}
