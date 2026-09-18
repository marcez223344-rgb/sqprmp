import { getTranslations } from "next-intl/server";
import { FlagRow } from "@/components/admin/flag-row";
import { Card } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/session";
import { getFeatureFlagsAdmin } from "@/lib/admin/queries";

export const metadata = { title: "Flags · Administración" };

/** Feature flags: DB rows override src/config/features.ts; paymentsLive is never editable here (D-05). */
export default async function AdminFlagsPage() {
  await requireAdmin();
  const [t, flags] = await Promise.all([getTranslations("admin.flags"), getFeatureFlagsAdmin()]);
  return (
    <div className="container-page max-w-4xl space-y-6 py-10">
      <header className="space-y-1">
        <h1 className="text-3xl">{t("title")}</h1>
        <p className="text-muted">{t("intro")}</p>
      </header>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">{t("caption")}</caption>
            <thead className="text-muted text-left">
              <tr>
                <th scope="col" className="py-2 pr-3 font-medium">
                  {t("cols.key")}
                </th>
                <th scope="col" className="py-2 pr-3 font-medium">
                  {t("cols.enabled")}
                </th>
                <th scope="col" className="py-2 pr-3 font-medium">
                  {t("cols.public")}
                </th>
                <th scope="col" className="py-2 pr-3 font-medium">
                  {t("cols.source")}
                </th>
                <th scope="col" className="py-2 font-medium">
                  {t("cols.actions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {flags.map((f) => (
                <FlagRow key={f.key} flag={f} />
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
