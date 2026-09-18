"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { reconcilePaymentEventAction } from "@/lib/admin/actions";

export function ReconcileForm({
  eventId,
  prices,
}: {
  eventId: string;
  prices: { id: string; label: string }[];
}) {
  const t = useTranslations("admin.payments.reconcile");
  const router = useRouter();
  const [alias, setAlias] = useState("");
  const [priceId, setPriceId] = useState(prices[0]?.id ?? "");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const id = `rec-${eventId}`;
  return (
    <form
      className="flex flex-wrap items-end gap-2 text-sm"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const r = await reconcilePaymentEventAction(eventId, alias, priceId, reason);
          setMessage(r.ok ? t("done") : t(`errors.${r.error}` as "errors.unknown"));
          if (r.ok) router.refresh();
        });
      }}
    >
      <label className="block">
        <span className="text-muted mb-1 block text-xs">{t("alias")}</span>
        <input
          id={`${id}-alias`}
          className="input h-9 w-40"
          value={alias}
          onChange={(e) => setAlias(e.target.value)}
          required
          minLength={3}
          maxLength={20}
        />
      </label>
      <label className="block">
        <span className="text-muted mb-1 block text-xs">{t("price")}</span>
        <select
          className="input h-9"
          value={priceId}
          onChange={(e) => setPriceId(e.target.value)}
          required
        >
          {prices.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="text-muted mb-1 block text-xs">{t("reason")}</span>
        <input
          className="input h-9 w-56"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          required
          minLength={3}
          maxLength={500}
        />
      </label>
      <Button type="submit" size="sm" disabled={pending || !priceId}>
        {t("submit")}
      </Button>
      {message ? (
        <p role="status" className="basis-full text-xs">
          {message}
        </p>
      ) : null}
    </form>
  );
}
