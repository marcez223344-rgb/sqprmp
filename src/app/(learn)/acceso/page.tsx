import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { AccessPanel } from "@/components/payments/access-panel";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { requireOnboardedProfile } from "@/lib/auth/session";
import { getAccessStatus } from "@/lib/payments/service";
import { cn } from "@/lib/utils/cn";

export async function generateMetadata() {
  const t = await getTranslations("access");
  return { title: t("title") };
}

export default async function AccessPage() {
  const profile = await requireOnboardedProfile("/acceso");
  const [t, format, status] = await Promise.all([
    getTranslations("access"),
    getFormatter(),
    getAccessStatus(profile),
  ]);

  return (
    <div className="container-page max-w-3xl space-y-6 py-10">
      <header className="space-y-1">
        <h1 className="text-3xl">{t("title")}</h1>
        <p className="text-muted">{t("intro")}</p>
      </header>

      <Card className="space-y-3">
        <h2 className="text-xl">{t("plan.title")}</h2>
        {status.entitled ? (
          <>
            <p className="border-success/40 bg-success/10 rounded-md border px-3 py-2 text-sm">
              {status.entitlement?.ends_at
                ? t("plan.activeUntil", {
                    date: format.dateTime(new Date(status.entitlement.ends_at), {
                      dateStyle: "long",
                    }),
                  })
                : t("plan.lifetime")}
              {status.entitlement
                ? ` · ${t(`plan.source.${status.entitlement.source}` as never)}`
                : ""}
            </p>
            <Link href="/ruta" className={cn(buttonVariants({ variant: "secondary" }), "w-fit")}>
              {t("plan.goPath")}
            </Link>
          </>
        ) : (
          <>
            <p className="text-muted text-sm">
              {t("plan.free", { used: status.freeUsed, limit: status.freeLimit })}{" "}
              {t("plan.freeNote")}
            </p>
            <Link href="/precios" className={cn(buttonVariants(), "w-fit")}>
              {t("plan.upgrade")}
            </Link>
          </>
        )}
      </Card>

      <AccessPanel pendingPurchase={status.pendingPurchase} entitled={status.entitled} />

      <Card>
        <h2 className="mb-3 text-xl">{t("history.title")}</h2>
        {status.purchases.length === 0 ? (
          <p className="text-muted text-sm">{t("history.empty")}</p>
        ) : (
          <ul className="divide-border divide-y text-sm">
            {status.purchases.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span>
                  {format.dateTime(new Date(p.created_at), { dateStyle: "medium" })} ·{" "}
                  {t(`history.provider.${p.provider}` as never)}
                  {p.reference_code ? ` · ${p.reference_code}` : ""}
                </span>
                <span className="text-muted">
                  {format.number(p.amount_minor / 100, { style: "currency", currency: p.currency })}{" "}
                  · {t(`history.status.${p.status}` as never)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
