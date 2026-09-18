import { getFormatter, getTranslations } from "next-intl/server";
import { ReconcileForm } from "@/components/admin/reconcile-form";
import { Card } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/session";
import { getPaymentEventsAdmin } from "@/lib/admin/queries";
import { cn } from "@/lib/utils/cn";

export const metadata = { title: "Eventos de pago · Administración" };

/** Webhook events (all providers) with reconciliation for approved payments we could not match. */
export default async function AdminPaymentsPage() {
  await requireAdmin();
  const [t, format, { events, prices }] = await Promise.all([
    getTranslations("admin.payments"),
    getFormatter(),
    getPaymentEventsAdmin(),
  ]);
  const priceOptions = prices.map((p) => ({
    id: p.id,
    label: `${(p.products as { slug: string } | null)?.slug ?? "?"} · ${p.provider} · ${format.number(p.amount_minor / 100, { style: "currency", currency: p.currency })}`,
  }));
  const unmatched = events.filter(
    (e) => e.processing_error === "unmatched user or price" && !e.reconciled_at,
  );
  const outcome = (e: (typeof events)[number]) =>
    e.reconciled_at
      ? t("outcome.reconciled")
      : !e.signature_valid
        ? t("outcome.invalidSignature")
        : e.processing_error
          ? t("outcome.unmatched")
          : e.processed_at
            ? t("outcome.processed")
            : t("outcome.pending");

  return (
    <div className="container-page max-w-6xl space-y-8 py-10">
      <header className="space-y-1">
        <h1 className="text-3xl">{t("title")}</h1>
        <p className="text-muted">{t("intro")}</p>
      </header>

      <Card>
        <h2 className="mb-3 text-xl">{t("unmatched.title", { count: unmatched.length })}</h2>
        {unmatched.length === 0 ? (
          <p className="text-muted text-sm">{t("unmatched.empty")}</p>
        ) : (
          <ul className="divide-border divide-y">
            {unmatched.map((e) => (
              <li key={e.id} className="space-y-2 py-3">
                <p className="text-sm">
                  <span className="font-mono">{e.provider}</span> · {e.event_type} ·{" "}
                  {e.amount_minor !== null && e.currency
                    ? format.number(e.amount_minor / 100, {
                        style: "currency",
                        currency: e.currency,
                      })
                    : "—"}{" "}
                  · {t("unmatched.ref")} <span className="font-mono">{e.payment_ref ?? "—"}</span> ·{" "}
                  {format.dateTime(new Date(e.received_at), {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
                <ReconcileForm eventId={e.id} prices={priceOptions} />
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 text-xl">{t("recent.title")}</h2>
        {events.length === 0 ? (
          <p className="text-muted text-sm">{t("recent.empty")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">{t("recent.caption")}</caption>
              <thead className="text-muted text-left">
                <tr>
                  <th scope="col" className="py-2 pr-3 font-medium">
                    {t("recent.date")}
                  </th>
                  <th scope="col" className="py-2 pr-3 font-medium">
                    {t("recent.provider")}
                  </th>
                  <th scope="col" className="py-2 pr-3 font-medium">
                    {t("recent.event")}
                  </th>
                  <th scope="col" className="py-2 pr-3 font-medium">
                    {t("recent.status")}
                  </th>
                  <th scope="col" className="py-2 pr-3 font-medium">
                    {t("recent.amount")}
                  </th>
                  <th scope="col" className="py-2 font-medium">
                    {t("recent.outcome")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.id} className="border-border border-t">
                    <td className="py-2 pr-3 whitespace-nowrap">
                      {format.dateTime(new Date(e.received_at), {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className="py-2 pr-3 font-mono">{e.provider}</td>
                    <td className="py-2 pr-3">{e.event_type}</td>
                    <td className="py-2 pr-3">{e.status ?? "—"}</td>
                    <td className="py-2 pr-3 tabular-nums">
                      {e.amount_minor !== null && e.currency
                        ? format.number(e.amount_minor / 100, {
                            style: "currency",
                            currency: e.currency,
                          })
                        : "—"}
                    </td>
                    <td
                      className={cn(
                        "py-2",
                        !e.signature_valid && "text-danger",
                        e.processing_error && !e.reconciled_at && "text-warning",
                      )}
                    >
                      {outcome(e)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
