import { getFormatter, getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import {
  MIN_LEARNERS_FOR_RATES,
  barPercent,
  ratio,
  type AdminUserStats,
} from "@/lib/admin/directory";

/**
 * Audience, activation and friction panel for /admin/metricas. Every number comes from the
 * admin_user_stats RPC (aggregated in Postgres, no email, no birth date).
 *
 * Honesty at small N: counts are always shown, ratios and the median only once there are enough
 * learners to divide by, and the decorative bars only then too — two bars on an auto-scaled axis
 * read as a trend that is not there.
 */
export async function AudienceStats({ stats }: { stats: AdminUserStats }) {
  const [t, format] = await Promise.all([
    getTranslations("admin.metrics.audience"),
    getFormatter(),
  ]);
  const total = stats.learners_total;
  const enoughData = total >= MIN_LEARNERS_FOR_RATES;

  if (total === 0) {
    return (
      <Card>
        <h2 className="mb-2 text-lg">{t("title")}</h2>
        <p className="text-muted text-sm">{t("noLearners")}</p>
      </Card>
    );
  }

  const pct = (part: number) => {
    const value = ratio(part, total);
    return value === null ? null : `${value}%`;
  };
  const median = enoughData ? stats.activation.completed_median : null;
  const p90 = enoughData ? stats.activation.completed_p90 : null;
  // Only submitted attempts can pass or fail; an attempt that is still open is not a failure.
  const passRate =
    stats.friction.quiz_attempts_submitted >= MIN_LEARNERS_FOR_RATES
      ? stats.friction.quiz_pass_rate
      : null;

  const countryMax = Math.max(0, ...stats.by_country.map((r) => r.learners));
  const ageMax = Math.max(0, ...stats.by_age_bracket.map((r) => r.learners));
  const monthMax = Math.max(0, ...stats.by_signup_month.map((r) => r.learners));
  const bucketMax = Math.max(0, ...stats.activation.distribution.map((r) => r.learners));

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="font-heading text-2xl">{t("title")}</h2>
        <p className="text-muted text-sm">
          {t("learnersTotal", { count: total })}
          {enoughData ? "" : ` · ${t("smallSample", { min: MIN_LEARNERS_FOR_RATES })}`}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h3 className="mb-1 text-lg">{t("country.title")}</h3>
          <p className="text-muted mb-3 text-xs">{t("country.why")}</p>
          <BarTable
            caption={t("country.title")}
            head={[
              t("country.country"),
              t("cols.learners"),
              t("country.activated"),
              t("cols.withAccess"),
            ]}
            showBars={enoughData}
            rows={stats.by_country.map((r) => ({
              key: r.country,
              label: r.country === "unknown" ? t("unknown") : r.country,
              bar: barPercent(r.learners, countryMax),
              values: [r.learners, r.activated, r.with_access],
            }))}
            emptyLabel={t("noData")}
          />
        </Card>

        <Card>
          <h3 className="mb-1 text-lg">{t("age.title")}</h3>
          <p className="text-muted mb-3 text-xs">{t("age.why")}</p>
          <BarTable
            caption={t("age.title")}
            head={[t("age.bracket"), t("cols.learners"), t("cols.share")]}
            showBars={enoughData}
            rows={stats.by_age_bracket.map((r) => ({
              key: r.bracket,
              label: t(`age.brackets.${r.bracket}`),
              bar: barPercent(r.learners, ageMax),
              values: [r.learners, pct(r.learners) ?? t("na")],
            }))}
            emptyLabel={t("noData")}
          />
        </Card>

        <Card>
          <h3 className="mb-1 text-lg">{t("cohorts.title")}</h3>
          <p className="text-muted mb-3 text-xs">{t("cohorts.why")}</p>
          <BarTable
            caption={t("cohorts.title")}
            head={[
              t("cohorts.month"),
              t("cols.learners"),
              t("country.activated"),
              t("cols.withAccess"),
            ]}
            showBars={enoughData}
            rows={stats.by_signup_month.map((r) => ({
              key: r.month,
              label: r.month,
              bar: barPercent(r.learners, monthMax),
              values: [r.learners, r.activated, r.with_access],
            }))}
            emptyLabel={t("noData")}
          />
        </Card>

        <Card>
          <h3 className="mb-1 text-lg">{t("access.title")}</h3>
          <p className="text-muted mb-3 text-xs">{t("access.why")}</p>
          <BarTable
            caption={t("access.title")}
            head={[t("access.status"), t("cols.learners"), t("cols.share")]}
            showBars={false}
            rows={stats.by_entitlement.map((r) => ({
              key: r.status,
              label: t(`access.statuses.${r.status}`),
              bar: 0,
              values: [r.learners, pct(r.learners) ?? t("na")],
            }))}
            emptyLabel={t("noData")}
          />
        </Card>

        <Card>
          <h3 className="mb-1 text-lg">{t("activation.title")}</h3>
          <p className="text-muted mb-3 text-xs">{t("activation.why")}</p>
          <dl className="divide-border divide-y text-sm">
            <Row
              label={t("activation.startedAny")}
              value={`${stats.activation.started_any}${pct(stats.activation.started_any) ? ` (${pct(stats.activation.started_any)})` : ""}`}
            />
            <Row
              label={t("activation.completedAny")}
              value={`${stats.activation.completed_any}${pct(stats.activation.completed_any) ? ` (${pct(stats.activation.completed_any)})` : ""}`}
            />
            <Row
              label={t("activation.median")}
              value={median === null ? t("na") : format.number(median)}
            />
            <Row label={t("activation.p90")} value={p90 === null ? t("na") : format.number(p90)} />
          </dl>
          <div className="mt-3">
            <BarTable
              caption={t("activation.distribution")}
              head={[t("activation.bucket"), t("cols.learners")]}
              showBars={enoughData}
              rows={stats.activation.distribution.map((r) => ({
                key: r.bucket,
                label: t(`activation.buckets.${r.bucket}`),
                bar: barPercent(r.learners, bucketMax),
                values: [r.learners],
              }))}
              emptyLabel={t("noData")}
            />
          </div>
        </Card>

        <Card>
          <h3 className="mb-1 text-lg">{t("friction.title")}</h3>
          <p className="text-muted mb-3 text-xs">{t("friction.why")}</p>
          <dl className="divide-border divide-y text-sm">
            <Row
              label={t("friction.freeLimit")}
              value={String(stats.friction.free_limit_reached_unpaid)}
            />
            <Row
              label={t("friction.quizPassRate")}
              value={passRate === null ? t("na") : `${passRate}%`}
            />
            <Row
              label={t("friction.quizSubmitted")}
              value={String(stats.friction.quiz_attempts_submitted)}
            />
            <Row label={t("friction.quizOpen")} value={String(stats.friction.quiz_attempts_open)} />
            <Row
              label={t("friction.certificates")}
              value={String(stats.friction.certificate_holders)}
            />
          </dl>
        </Card>
      </div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 py-1.5">
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium tabular-nums">{value}</dd>
    </div>
  );
}

/**
 * A real data table; the bar is a decorative background inside the first data cell, so the
 * numbers remain the accessible content (no chart, no charting dependency).
 */
function BarTable({
  caption,
  head,
  rows,
  showBars,
  emptyLabel,
}: {
  caption: string;
  head: string[];
  rows: { key: string; label: string; bar: number; values: (string | number)[] }[];
  showBars: boolean;
  emptyLabel: string;
}) {
  if (rows.length === 0) return <p className="text-muted text-sm">{emptyLabel}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="text-muted text-left">
          <tr>
            {head.map((h, i) => (
              <th
                key={h}
                scope="col"
                className={`py-1 pr-3 font-medium ${i === 0 ? "" : "text-right"}`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-border border-t">
              <th scope="row" className="relative py-1 pr-3 text-left font-normal">
                {showBars ? (
                  <span
                    aria-hidden="true"
                    className="bg-primary/15 absolute inset-y-0.5 left-0 rounded-sm"
                    style={{ width: `${row.bar}%` }}
                  />
                ) : null}
                <span className="relative">{row.label}</span>
              </th>
              {row.values.map((value, i) => (
                <td key={i} className="py-1 pr-3 text-right tabular-nums">
                  {value}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
