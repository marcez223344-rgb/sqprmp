import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { ReasonActionButton } from "@/components/admin/reason-action-button";
import { Card } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/session";
import { revokeCertificateAction } from "@/lib/admin/actions";
import { getCertificatesAdmin } from "@/lib/admin/queries";

export const metadata = { title: "Certificados · Administración" };

export default async function AdminCertificatesPage() {
  await requireAdmin();
  const [t, format, certs] = await Promise.all([
    getTranslations("admin.certificates"),
    getFormatter(),
    getCertificatesAdmin(),
  ]);
  return (
    <div className="container-page max-w-5xl space-y-6 py-10">
      <header className="space-y-1">
        <h1 className="text-3xl">{t("title")}</h1>
        <p className="text-muted">{t("intro")}</p>
      </header>
      <Card>
        {certs.length === 0 ? (
          <p className="text-muted text-sm">{t("empty")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">{t("caption")}</caption>
              <thead className="text-muted text-left">
                <tr>
                  <th scope="col" className="py-2 pr-3 font-medium">
                    {t("id")}
                  </th>
                  <th scope="col" className="py-2 pr-3 font-medium">
                    {t("recipient")}
                  </th>
                  <th scope="col" className="py-2 pr-3 font-medium">
                    {t("path")}
                  </th>
                  <th scope="col" className="py-2 pr-3 font-medium">
                    {t("issued")}
                  </th>
                  <th scope="col" className="py-2 font-medium">
                    {t("status")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {certs.map((c) => (
                  <tr key={c.public_id} className="border-border border-t">
                    <td className="py-2 pr-3 font-mono">{c.public_id}</td>
                    <td className="py-2 pr-3">
                      {c.recipient_name}{" "}
                      <span className="text-muted">
                        @{(c.profiles as { alias: string | null } | null)?.alias ?? "—"}
                      </span>
                    </td>
                    <td className="py-2 pr-3">
                      {(c.certificate_requirements as { title: string } | null)?.title ?? "—"}
                    </td>
                    <td className="py-2 pr-3 whitespace-nowrap">
                      {format.dateTime(new Date(c.issued_at), { dateStyle: "medium" })}
                    </td>
                    <td className="py-2">
                      {c.revoked_at ? (
                        <span className="text-danger">
                          {t("revoked")} · {c.revoked_reason}
                        </span>
                      ) : (
                        <ReasonActionButton
                          label={t("revoke")}
                          prompt={t("revokePrompt")}
                          done={t("revokeDone")}
                          failed={t("revokeFailed")}
                          run={revokeCertificateAction.bind(null, c.public_id)}
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <p className="text-muted text-sm">
        <Link href="/verificar" className="underline underline-offset-4">
          {t("verifyLink")}
        </Link>
      </p>
    </div>
  );
}
