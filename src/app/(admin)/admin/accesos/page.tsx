import { getFormatter, getTranslations } from "next-intl/server";
import { AccessAdminPanel } from "@/components/admin/access-admin-panel";
import { requireAdmin } from "@/lib/auth/session";
import { getAccessAdminData } from "@/lib/admin/queries";

export const metadata = { title: "Accesos · Administración" };

/** Admin: pending manual purchases, recent entitlements, grant by alias. Reads via admin client after requireAdmin(). */
export default async function AdminAccessPage() {
  await requireAdmin();
  const [t, format, { pending, entitlements }] = await Promise.all([
    getTranslations("admin.access"),
    getFormatter(),
    getAccessAdminData(),
  ]);

  return (
    <div className="container-page max-w-5xl space-y-8 py-10">
      <header className="space-y-1">
        <h1 className="text-3xl">{t("title")}</h1>
        <p className="text-muted">{t("intro")}</p>
      </header>
      <AccessAdminPanel
        pending={pending.map((p) => ({
          id: p.id,
          alias: (p.profiles as { alias: string | null } | null)?.alias ?? "—",
          displayName: (p.profiles as { display_name: string | null } | null)?.display_name ?? "",
          reference: p.reference_code ?? "—",
          channel: p.channel ?? "—",
          amount: format.number(p.amount_minor / 100, { style: "currency", currency: p.currency }),
          createdAt: format.dateTime(new Date(p.created_at), {
            dateStyle: "medium",
            timeStyle: "short",
          }),
        }))}
        entitlements={entitlements.map((e) => ({
          id: e.id,
          alias: (e.profiles as { alias: string | null } | null)?.alias ?? "—",
          source: e.source,
          startsAt: format.dateTime(new Date(e.starts_at), { dateStyle: "medium" }),
          endsAt: e.ends_at ? format.dateTime(new Date(e.ends_at), { dateStyle: "medium" }) : null,
          revoked: Boolean(e.revoked_at),
          revokedReason: e.revoked_reason,
        }))}
      />
    </div>
  );
}
