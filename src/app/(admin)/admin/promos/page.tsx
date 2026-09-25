import { getFormatter, getTranslations } from "next-intl/server";
import { PromoForm } from "@/components/admin/promo-form";
import { PromoRedemptions } from "@/components/admin/promo-redemptions";
import { ReasonActionButton } from "@/components/admin/reason-action-button";
import { Card } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/session";
import { setPromoCodeActiveAction } from "@/lib/admin/actions";
import { isUnseen } from "@/lib/admin/attention";
import {
  getPromoCodesAdmin,
  getPromosSeenAt,
  getRecentPromoRedemptionsAdmin,
} from "@/lib/admin/queries";

export const metadata = { title: "Códigos · Administración" };

export default async function AdminPromosPage() {
  await requireAdmin();
  const renderedAt = new Date().toISOString();
  const [t, tr, format, promos, redemptions, seenAt] = await Promise.all([
    getTranslations("admin.promos"),
    getTranslations("admin.promos.redemptions"),
    getFormatter(),
    getPromoCodesAdmin(),
    getRecentPromoRedemptionsAdmin(),
    getPromosSeenAt(),
  ]);
  return (
    <div className="container-page max-w-5xl space-y-8 py-10">
      <header className="space-y-1">
        <h1 className="text-3xl">{t("title")}</h1>
        <p className="text-muted">{t("intro")}</p>
      </header>
      <Card>
        <h2 className="mb-1 text-xl">{tr("title")}</h2>
        <p className="text-muted mb-3 text-sm">{tr("intro")}</p>
        {redemptions === null ? (
          <p role="status" className="text-danger text-sm">
            {tr("unavailable")}
          </p>
        ) : (
          <PromoRedemptions
            renderedAt={renderedAt}
            rows={redemptions.map((r) => ({
              id: r.id,
              alias: r.alias,
              code: r.code,
              kindLabel: r.kind ? t(`kinds.${r.kind as "scholarship"}`) : null,
              createdAt: r.createdAt,
              when: format.dateTime(new Date(r.createdAt), {
                dateStyle: "medium",
                timeStyle: "short",
              }),
              isNew: isUnseen(r.createdAt, seenAt),
            }))}
          />
        )}
      </Card>
      <Card>
        <h2 className="mb-3 text-xl">{t("create")}</h2>
        <PromoForm />
      </Card>
      <Card>
        <h2 className="mb-3 text-xl">{t("list")}</h2>
        {promos.length === 0 ? (
          <p className="text-muted text-sm">{t("empty")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">{t("caption")}</caption>
              <thead className="text-muted text-left">
                <tr>
                  <th scope="col" className="py-2 pr-3 font-medium">
                    {t("cols.code")}
                  </th>
                  <th scope="col" className="py-2 pr-3 font-medium">
                    {t("cols.kind")}
                  </th>
                  <th scope="col" className="py-2 pr-3 font-medium">
                    {t("cols.value")}
                  </th>
                  <th scope="col" className="py-2 pr-3 font-medium">
                    {t("cols.uses")}
                  </th>
                  <th scope="col" className="py-2 pr-3 font-medium">
                    {t("cols.expires")}
                  </th>
                  <th scope="col" className="py-2 font-medium">
                    {t("cols.status")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {promos.map((p) => (
                  <tr key={p.id} className="border-border border-t">
                    <td className="py-2 pr-3 font-mono">{p.code}</td>
                    <td className="py-2 pr-3">{t(`kinds.${p.kind as "scholarship"}`)}</td>
                    <td className="py-2 pr-3">
                      {p.kind === "scholarship"
                        ? t("days", { days: p.access_days ?? 0 })
                        : `${p.discount_percent ?? 0}%`}
                    </td>
                    {/* An uncapped code says so in words: the infinity glyph used to be the only
                        marker, and a symbol alone is not a label a screen reader can read out. */}
                    <td className="py-2 pr-3">
                      <span className="tabular-nums">{p.redemptions_count}</span>
                      {p.max_redemptions === null ? (
                        <span className="text-warning-ink"> · {t("unlimitedUses")}</span>
                      ) : (
                        <span className="tabular-nums">/{p.max_redemptions}</span>
                      )}
                    </td>
                    <td className="py-2 pr-3 whitespace-nowrap">
                      {p.expires_at
                        ? format.dateTime(new Date(p.expires_at), { dateStyle: "medium" })
                        : "—"}
                    </td>
                    <td className="py-2">
                      <ReasonActionButton
                        label={p.is_active ? t("deactivate") : t("activate")}
                        prompt=""
                        askReason={false}
                        variant={p.is_active ? "danger" : "secondary"}
                        done={t("updated")}
                        failed={t("failed")}
                        run={setPromoCodeActiveAction.bind(null, p.id, !p.is_active)}
                      />
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
