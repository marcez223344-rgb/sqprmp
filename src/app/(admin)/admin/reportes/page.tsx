import Link from "next/link";
import type { Route } from "next";
import { CircleCheck, CircleDot, ExternalLink } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import { ReasonActionButton } from "@/components/admin/reason-action-button";
import { Card } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/session";
import { resolveExerciseReportAction } from "@/lib/admin/actions";
import { getExerciseReportsAdmin } from "@/lib/admin/queries";
import { REPORT_CATEGORIES, type ReportCategory } from "@/lib/reports/schemas";
import { cn } from "@/lib/utils/cn";

export const metadata = { title: "Reportes de ejercicios · Administración" };

/** URL value → status filter. Spanish in the URL because the owner reads and shares these links. */
const FILTERS = {
  abiertos: { key: "open", status: "open" },
  resueltos: { key: "resolved", status: "resolved" },
  todos: { key: "all", status: null },
} as const;
type FilterParam = keyof typeof FILTERS;

function isCategory(value: string): value is ReportCategory {
  return (REPORT_CATEGORIES as readonly string[]).includes(value);
}

export default async function AdminReportsPage({ searchParams }: PageProps<"/admin/reportes">) {
  await requireAdmin();
  const params = await searchParams;
  const current: FilterParam =
    typeof params.estado === "string" && params.estado in FILTERS
      ? (params.estado as FilterParam)
      : "abiertos";
  const filter = FILTERS[current];
  const [t, tCat, format, reports] = await Promise.all([
    getTranslations("admin.reports"),
    getTranslations("workspace.report.categories"),
    getFormatter(),
    getExerciseReportsAdmin(filter.status),
  ]);

  return (
    <div className="container-page max-w-5xl space-y-6 py-10">
      <header className="space-y-1">
        <h1 className="text-3xl">{t("title")}</h1>
        <p className="text-muted">{t("intro")}</p>
      </header>

      <nav aria-label={t("filterLabel")} className="flex flex-wrap gap-2 text-sm">
        {(Object.keys(FILTERS) as FilterParam[]).map((param) => (
          <Link
            key={param}
            href={`/admin/reportes?estado=${param}` as Route}
            aria-current={param === current ? "page" : undefined}
            className={cn(
              "border-border inline-flex min-h-9 items-center rounded-full border px-3",
              param === current
                ? "bg-primary text-primary-fg border-primary"
                : "hover:bg-surface-2",
            )}
          >
            {t(`filters.${FILTERS[param].key}`)}
          </Link>
        ))}
      </nav>

      {reports === null ? (
        <p role="status" className="text-danger text-sm">
          {t("unavailable")}
        </p>
      ) : reports.length === 0 ? (
        <Card>
          <p className="text-muted text-sm">{t(`empty.${filter.key}`)}</p>
        </Card>
      ) : (
        <>
          <p className="text-muted text-sm">{t("count", { count: reports.length })}</p>
          <ul className="space-y-4">
            {reports.map((r) => {
              const exerciseLabel = r.exerciseTitle ?? r.exerciseSlug;
              const resolved = r.status === "resolved";
              return (
                <li key={r.id}>
                  <Card>
                    <article className="space-y-3" aria-labelledby={`report-${r.id}`}>
                      <header className="flex flex-wrap items-start justify-between gap-2">
                        <div className="space-y-1">
                          <h2 id={`report-${r.id}`} className="text-lg font-semibold">
                            {isCategory(r.category) ? tCat(r.category) : r.category}
                          </h2>
                          <p className="text-muted text-sm">
                            {r.exerciseExists ? (
                              <Link
                                href={`/ejercicio/${r.exerciseSlug}` as Route}
                                className="text-primary inline-flex items-center gap-1 underline underline-offset-4"
                              >
                                {exerciseLabel}
                                <ExternalLink aria-hidden="true" className="size-3.5" />
                                <span className="sr-only">· {t("openExercise")}</span>
                              </Link>
                            ) : (
                              t("exerciseRemoved", { slug: r.exerciseSlug })
                            )}
                          </p>
                          <p className="text-muted text-xs">
                            {t("reportedBy")}{" "}
                            <span className="text-text font-medium">
                              {r.reporterAlias ? `@${r.reporterAlias}` : t("noAlias")}
                            </span>
                            {r.reporterName ? ` (${r.reporterName})` : ""} ·{" "}
                            <time dateTime={r.createdAt}>
                              {format.dateTime(new Date(r.createdAt), {
                                dateStyle: "medium",
                                timeStyle: "short",
                              })}
                            </time>
                          </p>
                        </div>
                        <p
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
                            resolved
                              ? "border-success/40 bg-success/10 text-success-ink"
                              : "border-warning/40 bg-warning/10 text-warning",
                          )}
                        >
                          {resolved ? (
                            <CircleCheck aria-hidden="true" className="size-3.5" />
                          ) : (
                            <CircleDot aria-hidden="true" className="size-3.5" />
                          )}
                          {t(`status.${resolved ? "resolved" : "open"}`)}
                        </p>
                      </header>

                      <div className="space-y-1">
                        <h3 className="text-muted text-xs font-semibold tracking-wide uppercase">
                          {t("noteLabel")}
                        </h3>
                        <p className="text-sm whitespace-pre-wrap">{r.note}</p>
                      </div>

                      <div className="space-y-1">
                        <h3 className="text-muted text-xs font-semibold tracking-wide uppercase">
                          {t("sqlLabel")}
                        </h3>
                        {r.sql ? (
                          <pre className="border-border bg-surface-2 max-h-72 overflow-auto rounded-md border p-3 font-mono text-xs">
                            <code>{r.sql}</code>
                          </pre>
                        ) : (
                          <p className="text-muted text-sm">{t("noSql")}</p>
                        )}
                      </div>

                      <footer className="border-border flex flex-wrap items-center gap-3 border-t pt-3 text-sm">
                        {resolved ? (
                          <p className="text-muted">
                            {r.resolvedAt
                              ? t("resolvedOn", {
                                  date: format.dateTime(new Date(r.resolvedAt), {
                                    dateStyle: "medium",
                                  }),
                                })
                              : null}
                            {r.resolutionNote ? ` · ${r.resolutionNote}` : ""}
                          </p>
                        ) : (
                          <ReasonActionButton
                            variant="secondary"
                            label={t("resolve")}
                            title={t("resolveTitle", { exercise: exerciseLabel })}
                            prompt={t("resolvePrompt")}
                            done={t("resolveDone")}
                            failed={t("resolveFailed")}
                            run={resolveExerciseReportAction.bind(null, r.id)}
                          />
                        )}
                      </footer>
                    </article>
                  </Card>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
