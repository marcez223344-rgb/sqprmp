"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ReasonDialog } from "@/components/admin/reason-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import {
  grantAccessByAliasAction,
  reviewManualPurchaseAction,
  revokeEntitlementAction,
} from "@/lib/admin/actions";

interface PendingRow {
  id: string;
  alias: string;
  displayName: string;
  reference: string;
  channel: string;
  amount: string;
  createdAt: string;
}
interface EntitlementRow {
  id: string;
  alias: string;
  source: string;
  startsAt: string;
  endsAt: string | null;
  revoked: boolean;
  revokedReason: string | null;
}

export function AccessAdminPanel({
  pending,
  entitlements,
}: {
  pending: PendingRow[];
  entitlements: EntitlementRow[];
}) {
  const t = useTranslations("admin.access");
  const td = useTranslations("admin.reasonDialog");
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [alias, setAlias] = useState("");
  const [days, setDays] = useState("");
  const [reason, setReason] = useState("");
  // Both dialogs record a justification that lands in audit_logs; the trigger is remembered so
  // focus returns to it when the dialog closes.
  const [reviewTarget, setReviewTarget] = useState<{ id: string; approve: boolean } | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<string | null>(null);
  const lastTrigger = useRef<HTMLButtonElement | null>(null);

  const closeDialogs = () => {
    setReviewTarget(null);
    setRevokeTarget(null);
    lastTrigger.current?.focus();
  };

  const review = (note: string) => {
    const target = reviewTarget;
    if (!target) return;
    closeDialogs();
    startTransition(async () => {
      const r = await reviewManualPurchaseAction(target.id, target.approve, note);
      setMessage(r.ok ? (target.approve ? t("approved") : t("rejected")) : t("error"));
      router.refresh();
    });
  };

  const revoke = (why: string) => {
    const id = revokeTarget;
    if (!id) return;
    closeDialogs();
    startTransition(async () => {
      const r = await revokeEntitlementAction(id, why);
      setMessage(r.ok ? t("list.revokedDone") : t("error"));
      router.refresh();
    });
  };

  return (
    <div className="space-y-8">
      <Card>
        <h2 className="mb-3 text-xl">{t("pending.title", { count: pending.length })}</h2>
        {pending.length === 0 ? (
          <p className="text-muted text-sm">{t("pending.empty")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">{t("pending.caption")}</caption>
              <thead className="text-muted text-left">
                <tr>
                  <th scope="col" className="py-2 pr-3 font-medium">
                    {t("pending.learner")}
                  </th>
                  <th scope="col" className="py-2 pr-3 font-medium">
                    {t("pending.reference")}
                  </th>
                  <th scope="col" className="py-2 pr-3 font-medium">
                    {t("pending.channel")}
                  </th>
                  <th scope="col" className="py-2 pr-3 font-medium">
                    {t("pending.amount")}
                  </th>
                  <th scope="col" className="py-2 pr-3 font-medium">
                    {t("pending.date")}
                  </th>
                  <th scope="col" className="py-2 font-medium">
                    {t("pending.actions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {pending.map((p) => (
                  <tr key={p.id} className="border-border border-t">
                    <td className="py-2 pr-3">
                      @{p.alias} <span className="text-muted">{p.displayName}</span>
                    </td>
                    <td className="py-2 pr-3 font-mono">{p.reference}</td>
                    <td className="py-2 pr-3">{p.channel}</td>
                    <td className="py-2 pr-3">{p.amount}</td>
                    <td className="py-2 pr-3">{p.createdAt}</td>
                    <td className="py-2">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          disabled={busy}
                          aria-haspopup="dialog"
                          aria-expanded={reviewTarget?.id === p.id && reviewTarget.approve}
                          onClick={(event) => {
                            lastTrigger.current = event.currentTarget;
                            setReviewTarget({ id: p.id, approve: true });
                          }}
                        >
                          {t("pending.approve")}
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          disabled={busy}
                          aria-haspopup="dialog"
                          aria-expanded={reviewTarget?.id === p.id && !reviewTarget.approve}
                          onClick={(event) => {
                            lastTrigger.current = event.currentTarget;
                            setReviewTarget({ id: p.id, approve: false });
                          }}
                        >
                          {t("pending.reject")}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 text-xl">{t("grant.title")}</h2>
        <form
          className="grid gap-4 sm:grid-cols-3"
          onSubmit={(e) => {
            e.preventDefault();
            startTransition(async () => {
              const r = await grantAccessByAliasAction(alias, days, reason);
              setMessage(r.ok ? t("grant.done") : t(`grant.errors.${r.error}` as never));
              if (r.ok) {
                setAlias("");
                setDays("");
                setReason("");
              }
              router.refresh();
            });
          }}
        >
          <Field id="grant-alias" label={t("grant.alias")}>
            <input
              id="grant-alias"
              className="input"
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              required
            />
          </Field>
          <Field id="grant-days" label={t("grant.days")} hint={t("grant.daysHint")}>
            <input
              id="grant-days"
              className="input"
              type="number"
              min={1}
              max={3650}
              value={days}
              onChange={(e) => setDays(e.target.value)}
            />
          </Field>
          <Field id="grant-reason" label={t("grant.reason")}>
            <input
              id="grant-reason"
              className="input"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              minLength={3}
            />
          </Field>
          <div className="sm:col-span-3">
            <Button type="submit" disabled={busy}>
              {t("grant.submit")}
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <h2 className="mb-3 text-xl">{t("list.title")}</h2>
        <ul className="divide-border divide-y text-sm">
          {entitlements.map((e) => (
            <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span>
                @{e.alias} · {e.source} · {e.startsAt}
                {e.endsAt ? ` → ${e.endsAt}` : ` · ${t("list.lifetime")}`}
                {e.revoked ? ` · ${t("list.revoked")} (${e.revokedReason ?? ""})` : ""}
              </span>
              {!e.revoked ? (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  aria-haspopup="dialog"
                  aria-expanded={revokeTarget === e.id}
                  onClick={(event) => {
                    lastTrigger.current = event.currentTarget;
                    setRevokeTarget(e.id);
                  }}
                >
                  {t("list.revoke")}
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      </Card>

      <ReasonDialog
        open={reviewTarget !== null}
        title={reviewTarget?.approve === false ? t("pending.reject") : t("pending.approve")}
        label={t("notePrompt")}
        submitLabel={reviewTarget?.approve === false ? t("pending.reject") : t("pending.approve")}
        cancelLabel={td("cancel")}
        invalidMessage={td("required", { min: 3 })}
        pending={busy}
        onCancel={closeDialogs}
        onSubmit={review}
      />
      <ReasonDialog
        open={revokeTarget !== null}
        title={t("list.revoke")}
        label={t("list.revokePrompt")}
        submitLabel={t("list.revoke")}
        cancelLabel={td("cancel")}
        invalidMessage={td("required", { min: 3 })}
        minLength={3}
        pending={busy}
        onCancel={closeDialogs}
        onSubmit={revoke}
      />

      <p role="status" aria-live="polite" className="text-muted text-sm">
        {message}
      </p>
    </div>
  );
}
