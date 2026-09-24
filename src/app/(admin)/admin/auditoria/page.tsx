import { getFormatter, getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/session";
import { getAuditLogsAdmin } from "@/lib/admin/queries";

export const metadata = { title: "Auditoría · Administración" };

const ACTION_PREFIX = /^[a-z_.]{0,60}$/;
const TARGET = /^[A-Za-z0-9:_-]{0,80}$/;

export default async function AdminAuditPage({ searchParams }: PageProps<"/admin/auditoria">) {
  await requireAdmin();
  const params = await searchParams;
  const action =
    typeof params.action === "string" && ACTION_PREFIX.test(params.action) ? params.action : "";
  const target =
    typeof params.target === "string" && TARGET.test(params.target) ? params.target : "";
  const [t, format, logs] = await Promise.all([
    getTranslations("admin.audit"),
    getFormatter(),
    getAuditLogsAdmin({ action: action || undefined, target: target || undefined }),
  ]);
  return (
    <div className="container-page max-w-6xl space-y-6 py-10">
      <header className="space-y-1">
        <h1 className="text-3xl">{t("title")}</h1>
        <p className="text-muted">{t("intro")}</p>
      </header>
      <Card>
        <form method="get" className="flex flex-wrap items-end gap-3 text-sm">
          <label className="block">
            <span className="text-muted mb-1 block text-xs">{t("filterAction")}</span>
            <input
              name="action"
              defaultValue={action}
              className="input h-9 w-56 font-mono"
              maxLength={60}
            />
          </label>
          <label className="block">
            <span className="text-muted mb-1 block text-xs">{t("filterTarget")}</span>
            <input
              name="target"
              defaultValue={target}
              className="input h-9 w-56 font-mono"
              maxLength={80}
            />
          </label>
          <Button type="submit" size="sm" variant="secondary">
            {t("apply")}
          </Button>
        </form>
      </Card>
      <Card>
        {logs.length === 0 ? (
          <p className="text-muted text-sm">{t("empty")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">{t("caption")}</caption>
              <thead className="text-muted text-left">
                <tr>
                  <th scope="col" className="py-2 pr-3 font-medium">
                    {t("cols.date")}
                  </th>
                  <th scope="col" className="py-2 pr-3 font-medium">
                    {t("cols.actor")}
                  </th>
                  <th scope="col" className="py-2 pr-3 font-medium">
                    {t("cols.subject")}
                  </th>
                  <th scope="col" className="py-2 pr-3 font-medium">
                    {t("cols.action")}
                  </th>
                  <th scope="col" className="py-2 pr-3 font-medium">
                    {t("cols.target")}
                  </th>
                  <th scope="col" className="py-2 font-medium">
                    {t("cols.detail")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id} className="border-border border-t align-top">
                    <td className="py-2 pr-3 whitespace-nowrap">
                      {format.dateTime(new Date(l.created_at), {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </td>
                    {/* Aliases first: "who did what to whom" was two uuids before (item 17). */}
                    <td className="py-2 pr-3">
                      {l.actor_alias ? `@${l.actor_alias}` : t(`roles.${l.actor_role}` as never)}
                      <span className="text-muted block text-xs">
                        {l.actor_alias ? t(`roles.${l.actor_role}` as never) : null}
                        {l.actor_id ? (
                          <span className="font-mono"> {l.actor_id.slice(0, 8)}</span>
                        ) : null}
                      </span>
                    </td>
                    <td className="py-2 pr-3">
                      {l.subject_alias ? `@${l.subject_alias}` : <span aria-hidden="true">—</span>}
                    </td>
                    <td className="py-2 pr-3 font-mono">{l.action}</td>
                    <td className="py-2 pr-3 font-mono text-xs">
                      {l.target_table ?? ""}
                      {l.target_id ? <span className="block">{l.target_id}</span> : null}
                    </td>
                    <td className="py-2">
                      <pre className="max-w-md text-xs whitespace-pre-wrap">
                        {l.diff ? JSON.stringify(l.diff) : ""}
                      </pre>
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
