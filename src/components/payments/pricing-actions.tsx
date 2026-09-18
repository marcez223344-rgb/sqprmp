"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { CreditCard, Landmark, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button, buttonVariants } from "@/components/ui/button";
import { manualTransferChannels, manualTransferInstructions } from "@/config/pricing";
import { createManualPurchaseAction, startHostedCheckoutAction } from "@/lib/payments/actions";
import { cn } from "@/lib/utils/cn";
import type { CatalogPrice } from "@/lib/payments/service";

interface Props {
  signedIn: boolean;
  entitled: boolean;
  pending: boolean;
  prices: CatalogPrice[];
}

export function PricingActions({ signedIn, entitled, pending, prices }: Props) {
  const t = useTranslations("pricing.actions");
  const [channel, setChannel] = useState<(typeof manualTransferChannels)[number]["id"] | null>(
    null,
  );
  const [reference, setReference] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingTx, startTransition] = useTransition();

  const hotmart = prices.find((p) => p.provider === "hotmart");
  const manualByCurrency = (currency: string) =>
    prices.find((p) => p.provider === "manual" && p.currency === currency);

  if (!signedIn) {
    return (
      <Link href="/ingresar?next=%2Fprecios" className={cn(buttonVariants(), "w-fit")}>
        {t("signInFirst")}
      </Link>
    );
  }
  if (entitled) {
    return (
      <p className="border-success/40 bg-success/10 rounded-md border px-3 py-2 text-sm">
        {t("alreadyEntitled")}{" "}
        <Link href="/aprender" className="underline">
          {t("goLearn")}
        </Link>
      </p>
    );
  }
  if (pending || reference) {
    return (
      <div className="border-warning/40 bg-warning/10 space-y-2 rounded-md border px-3 py-3 text-sm">
        <p className="font-medium">{t("pendingTitle")}</p>
        {reference ? <p>{t("referenceIs", { code: reference })}</p> : null}
        <p className="text-muted">{t("pendingBody")}</p>
        <Link href="/acceso" className="underline">
          {t("viewAccess")}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {hotmart ? (
        <form action={startHostedCheckoutAction}>
          <input type="hidden" name="provider" value="hotmart" />
          <input type="hidden" name="price" value={hotmart.id} />
          <Button type="submit" className="w-full">
            <CreditCard aria-hidden="true" />
            {t("payWithCard")}
          </Button>
          <p className="text-muted mt-1 text-xs">{t("hotmartNote")}</p>
        </form>
      ) : null}

      <div className="space-y-2">
        <p className="inline-flex items-center gap-2 text-sm font-medium">
          <Landmark aria-hidden="true" className="size-4" />
          {t("payByTransfer")}
        </p>
        <div className="grid gap-2 sm:grid-cols-3">
          {manualTransferChannels.map((c) => {
            const price = manualByCurrency(c.currency);
            if (!price) return null;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setChannel(c.id)}
                aria-pressed={channel === c.id}
                className={cn(
                  "hover:bg-surface-2 rounded-md border px-3 py-2 text-left text-sm",
                  channel === c.id ? "border-primary bg-primary/10" : "border-border",
                )}
              >
                {c.label}
              </button>
            );
          })}
        </div>
        {channel ? (
          <div className="border-border bg-surface-2/60 space-y-2 rounded-md border p-3 text-sm">
            <p className="font-medium">{manualTransferInstructions[channel].holder}</p>
            <ul className="font-mono text-xs">
              {manualTransferInstructions[channel].lines.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
            <p className="text-muted">{t("transferSteps")}</p>
            <Button
              size="sm"
              disabled={pendingTx}
              onClick={() =>
                startTransition(async () => {
                  setError(null);
                  const price = manualByCurrency(
                    manualTransferChannels.find((c) => c.id === channel)!.currency,
                  );
                  if (!price) return;
                  const r = await createManualPurchaseAction(price.id, channel);
                  if (r.ok && r.data) setReference(r.data.referenceCode);
                  else if (!r.ok) setError(t(`errors.${r.error}` as never));
                })
              }
            >
              {pendingTx ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
              {t("iPaid")}
            </Button>
            {error ? (
              <p role="alert" className="text-danger">
                {error}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
