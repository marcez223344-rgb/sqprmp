import Link from "next/link";
import type { Route } from "next";
import {
  Award,
  BarChart3,
  CreditCard,
  Flag,
  KeyRound,
  ScrollText,
  Ticket,
  Users,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/session";
import { getAdminMetrics } from "@/lib/admin/queries";

export const metadata = { title: "Administración" };

export default async function AdminPage() {
  await requireAdmin();
  const [t, m] = await Promise.all([getTranslations("admin.hub"), getAdminMetrics()]);
  const tools: { href: Route; label: string; icon: typeof Users; badge?: number }[] = [
    {
      href: "/admin/accesos",
      label: t("access"),
      icon: KeyRound,
      badge: m?.monetization.purchases_pending,
    },
    {
      href: "/admin/pagos",
      label: t("payments"),
      icon: CreditCard,
      badge: m?.monetization.unmatched_events,
    },
    { href: "/admin/usuarios", label: t("users"), icon: Users },
    { href: "/admin/certificados", label: t("certificates"), icon: Award },
    { href: "/admin/promos", label: t("promos"), icon: Ticket },
    { href: "/admin/flags", label: t("flags"), icon: Flag },
    { href: "/admin/auditoria", label: t("audit"), icon: ScrollText },
    { href: "/admin/metricas", label: t("metrics"), icon: BarChart3 },
  ];
  return (
    <div className="container-page max-w-5xl space-y-6 py-10">
      <header className="space-y-1">
        <h1 className="text-3xl">{t("title")}</h1>
        <p className="text-muted">{t("intro")}</p>
      </header>
      {m ? (
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label={t("stats.signups7d")} value={m.signups.last_7d} />
          <Stat label={t("stats.wau")} value={m.engagement.wau} />
          <Stat label={t("stats.entitled")} value={m.monetization.entitled} />
          <Stat label={t("stats.pending")} value={m.monetization.purchases_pending} />
        </dl>
      ) : null}
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map((tool) => (
          <li key={tool.href}>
            <Link href={tool.href} className="block rounded-lg">
              <Card className="hover:border-primary flex items-center gap-3 transition-colors">
                <tool.icon aria-hidden="true" className="text-primary size-5" />
                <span className="font-medium">{tool.label}</span>
                {tool.badge ? (
                  <span className="bg-warning/15 text-warning ml-auto rounded-full px-2 py-0.5 text-xs font-semibold">
                    {tool.badge}
                  </span>
                ) : null}
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="border-border bg-surface rounded-lg border p-4">
      <dt className="text-muted text-xs font-semibold tracking-wide uppercase">{label}</dt>
      <dd className="font-heading text-2xl font-bold">{value}</dd>
    </div>
  );
}
