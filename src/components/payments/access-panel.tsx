"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Ticket } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cancelManualPurchaseAction, redeemPromoAction } from "@/lib/payments/actions";
import type { AccessStatus } from "@/lib/payments/service";

export function AccessPanel({
  pendingPurchase,
  entitled,
}: {
  pendingPurchase: AccessStatus["pendingPurchase"];
  entitled: boolean;
}) {
  const t = useTranslations("access");
  const format = useFormatter();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <>
      {pendingPurchase ? (
        <Card className="space-y-2">
          <h2 className="text-xl">{t("pending.title")}</h2>
          <p className="text-sm">
            {t("pending.body", {
              code: pendingPurchase.reference_code ?? "—",
              amount: format.number(pendingPurchase.amount_minor / 100, {
                style: "currency",
                currency: pendingPurchase.currency,
              }),
              date: format.dateTime(new Date(pendingPurchase.created_at), { dateStyle: "medium" }),
            })}
          </p>
          <p className="text-muted text-sm">{t("pending.note")}</p>
          <Button
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await cancelManualPurchaseAction(pendingPurchase.id);
                router.refresh();
              })
            }
          >
            {t("pending.cancel")}
          </Button>
        </Card>
      ) : null}

      {!entitled ? (
        <Card className="space-y-3">
          <h2 className="inline-flex items-center gap-2 text-xl">
            <Ticket aria-hidden="true" className="size-5" />
            {t("promo.title")}
          </h2>
          <p className="text-muted text-sm">{t("promo.body")}</p>
          <form
            className="flex flex-wrap items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              startTransition(async () => {
                setMessage(null);
                const r = await redeemPromoAction(code);
                if (r.ok) {
                  setMessage(
                    r.data?.kind === "scholarship"
                      ? t("promo.scholarshipApplied")
                      : t("promo.discountApplied", { percent: r.data?.discount_percent ?? 0 }),
                  );
                  setCode("");
                  router.refresh();
                } else setMessage(t(`promo.errors.${r.error}` as never));
              });
            }}
          >
            <label htmlFor="promo" className="sr-only">
              {t("promo.label")}
            </label>
            <input
              id="promo"
              className="input h-10 w-56 font-mono uppercase"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              maxLength={40}
              placeholder={t("promo.placeholder")}
              required
            />
            <Button type="submit" size="sm" disabled={pending || !code.trim()}>
              {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
              {t("promo.apply")}
            </Button>
          </form>
          {message ? (
            <p role="status" className="text-sm">
              {message}
            </p>
          ) : null}
        </Card>
      ) : null}
    </>
  );
}
