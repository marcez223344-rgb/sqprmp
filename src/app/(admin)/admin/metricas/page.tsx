import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { AudienceStats } from "@/components/admin/audience-stats";
import { Card } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/session";
import { getAdminMetrics, getUserStatsAdmin } from "@/lib/admin/queries";

export const metadata = { title: "Métricas · Administración" };

/** Owner dashboard: one RPC (admin_metrics) computed on request; no third-party analytics. */
export default async function AdminMetricsPage() {
  await requireAdmin();
  const [t, format, m, audience] = await Promise.all([
    getTranslations("admin.metrics"),
    getFormatter(),
    getAdminMetrics(),
    getUserStatsAdmin(),
  ]);
  if (!m) {
    return (
      <div className="container-page max-w-5xl py-10">
        <h1 className="text-3xl">{t("title")}</h1>
        <p className="text-danger mt-4">{t("unavailable")}</p>
      </div>
    );
  }
  const pct = (n: number) => `${n}%`;
  const groups: { title: string; rows: [string, string | number][] }[] = [
    {
      title: t("groups.signups"),
      rows: [
        [t("rows.total"), m.signups.total],
        [t("rows.last7d"), m.signups.last_7d],
        [t("rows.last30d"), m.signups.last_30d],
        [t("rows.onboarded"), m.signups.onboarded],
      ],
    },
    {
      title: t("groups.learning"),
      rows: [
        [t("rows.startedExercise"), m.learning.started_exercise],
        [t("rows.completedExercise"), m.learning.completed_exercise],
        [t("rows.freeLimitReached"), m.learning.free_limit_reached],
        [t("rows.sectionsCompleted"), m.learning.sections_completed],
        [t("rows.certificates"), m.learning.certificates_issued],
        [t("rows.quizPassRate"), pct(m.learning.quiz_pass_rate)],
      ],
    },
    {
      title: t("groups.engagement"),
      rows: [
        [t("rows.wau"), m.engagement.wau],
        [t("rows.mau"), m.engagement.mau],
        [t("rows.d1"), pct(m.engagement.retention_d1)],
        [t("rows.d7"), pct(m.engagement.retention_d7)],
        [t("rows.d30"), pct(m.engagement.retention_d30)],
      ],
    },
    {
      title: t("groups.monetization"),
      rows: [
        [t("rows.entitled"), m.monetization.entitled],
        [t("rows.pending"), m.monetization.purchases_pending],
        [t("rows.approved"), m.monetization.purchases_approved],
        [t("rows.refunds"), m.monetization.refunds],
        [t("rows.unmatched"), m.monetization.unmatched_events],
        [t("rows.promos"), m.monetization.promo_redemptions],
        ...Object.entries(m.monetization.revenue).map(
          ([cur, minor]) =>
            [
              t("rows.revenue", { currency: cur }),
              format.number(minor / 100, { style: "currency", currency: cur }),
            ] as [string, string],
        ),
      ],
    },
  ];
  return (
    <div className="container-page max-w-5xl space-y-6 py-10">
      <header className="space-y-1">
        <h1 className="text-3xl">{t("title")}</h1>
        <p className="text-muted">
          {t("generatedAt", {
            time: format.dateTime(new Date(m.generated_at), {
              dateStyle: "medium",
              timeStyle: "short",
            }),
          })}
        </p>
        <p className="text-sm">
          <Link href="/admin/usuarios" className="text-primary underline underline-offset-4">
            {t("usersLink")}
          </Link>
        </p>
      </header>
      {audience ? (
        <AudienceStats stats={audience} />
      ) : (
        <p className="text-danger">{t("audience.unavailable")}</p>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {groups.map((g) => (
          <Card key={g.title}>
            <h2 className="mb-3 text-lg">{g.title}</h2>
            <dl className="divide-border divide-y text-sm">
              {g.rows.map(([label, value]) => (
                <div key={label} className="flex justify-between py-1.5">
                  <dt className="text-muted">{label}</dt>
                  <dd className="font-medium tabular-nums">{value}</dd>
                </div>
              ))}
            </dl>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-lg">{t("hardest.title")}</h2>
          {m.hardest_exercises.length === 0 ? (
            <p className="text-muted text-sm">{t("hardest.empty")}</p>
          ) : (
            <table className="w-full text-sm">
              <caption className="sr-only">{t("hardest.title")}</caption>
              <thead className="text-muted text-left">
                <tr>
                  <th scope="col" className="py-1 pr-3 font-medium">
                    {t("hardest.exercise")}
                  </th>
                  <th scope="col" className="py-1 pr-3 font-medium">
                    {t("hardest.attempts")}
                  </th>
                  <th scope="col" className="py-1 font-medium">
                    {t("hardest.solvers")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {m.hardest_exercises.map((e) => (
                  <tr key={e.slug} className="border-border border-t">
                    <td className="py-1 pr-3 font-mono">{e.slug}</td>
                    <td className="py-1 pr-3 tabular-nums">{e.attempts}</td>
                    <td className="py-1 tabular-nums">
                      {e.solvers}/{e.attempters}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
        <Card>
          <h2 className="mb-3 text-lg">{t("sqlstates.title")}</h2>
          {m.frequent_sqlstates.length === 0 ? (
            <p className="text-muted text-sm">{t("sqlstates.empty")}</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {m.frequent_sqlstates.map((s) => (
                <li key={s.sqlstate} className="flex justify-between">
                  <span className="font-mono">{s.sqlstate}</span>
                  <span className="tabular-nums">{s.count}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
      <Card>
        <h2 className="mb-3 text-lg">{t("sections.title")}</h2>
        <ul className="grid gap-1 text-sm sm:grid-cols-2 lg:grid-cols-3">
          {m.sections.map((s) => (
            <li key={s.slug} className="flex justify-between">
              <span>
                {s.number}. {s.slug}
              </span>
              <span className="tabular-nums">{s.completions}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
