import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import {
  ariaSortFor,
  directoryHref,
  nextSortState,
  type AdminUserRow,
  type DirectoryParams,
  type SortKey,
} from "@/lib/admin/directory";

/**
 * The user directory table. Server component: sorting and paging are plain links, so the whole
 * thing works without JavaScript and every state is a shareable URL.
 *
 * Headers are links rather than buttons because activating one navigates (it changes the URL);
 * `aria-sort` lives on the `<th>` as the specification requires, and the link carries the
 * accessible description of what activating it will do.
 */

const COLUMNS: { key: SortKey | null; label: string; numeric?: boolean }[] = [
  { key: "alias", label: "alias" },
  { key: "display_name", label: "name" },
  { key: "country", label: "country" },
  { key: "age", label: "age", numeric: true },
  { key: "created_at", label: "signup" },
  { key: "onboarded", label: "onboarded" },
  { key: "role", label: "role" },
  { key: "entitlement", label: "access" },
  { key: "exercises_completed", label: "completed", numeric: true },
  { key: "exercises_started", label: "started", numeric: true },
  { key: "level", label: "level", numeric: true },
  { key: "xp_total", label: "xp", numeric: true },
  { key: "last_activity", label: "lastActivity" },
  { key: null, label: "detail" },
];

export async function UserDirectoryTable({
  rows,
  params,
}: {
  rows: AdminUserRow[];
  params: DirectoryParams;
}) {
  const [t, format] = await Promise.all([getTranslations("admin.users"), getFormatter()]);
  const date = (value: string | null) =>
    value ? format.dateTime(new Date(value), { dateStyle: "short" }) : "—";

  return (
    <div className="overflow-x-auto" tabIndex={0} role="region" aria-label={t("table.caption")}>
      <table className="w-full min-w-[64rem] text-sm">
        <caption className="text-muted mb-2 text-left text-xs">{t("table.caption")}</caption>
        <thead className="text-muted text-left">
          <tr>
            {COLUMNS.map((col) => {
              const sorted = col.key ? ariaSortFor(params, col.key) : undefined;
              return (
                <th
                  key={col.label}
                  scope="col"
                  aria-sort={sorted}
                  className={`py-2 pr-3 font-medium whitespace-nowrap ${col.numeric ? "text-right" : ""}`}
                >
                  {col.key ? (
                    <Link
                      href={directoryHref(params, nextSortState(params, col.key))}
                      className="hover:text-text focus-visible:outline-ring inline-flex items-center gap-1 rounded focus-visible:outline-2 focus-visible:outline-offset-2"
                      aria-label={t("table.sortBy", { column: t(`cols.${col.label}`) })}
                    >
                      {t(`cols.${col.label}`)}
                      <span aria-hidden="true" className="text-xs">
                        {sorted === "none" ? "↕" : sorted === "descending" ? "↓" : "↑"}
                      </span>
                    </Link>
                  ) : (
                    <span className="sr-only">{t("cols.detail")}</span>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-border border-t">
              <th scope="row" className="py-2 pr-3 text-left font-normal whitespace-nowrap">
                @{row.alias ?? "—"}
                {row.isDeleted ? (
                  <span className="border-danger text-danger ml-2 rounded border px-1 text-xs">
                    {t("deleted")}
                  </span>
                ) : null}
              </th>
              <td className="py-2 pr-3">{row.displayName ?? "—"}</td>
              <td className="py-2 pr-3">{row.country ?? "—"}</td>
              <td className="py-2 pr-3 text-right tabular-nums">{row.age ?? "—"}</td>
              <td className="py-2 pr-3 whitespace-nowrap">{date(row.createdAt)}</td>
              <td className="py-2 pr-3">{row.onboarded ? t("yes") : t("no")}</td>
              <td className="py-2 pr-3">
                {t(`roles.${row.role === "admin" ? "admin" : "learner"}`)}
              </td>
              <td className="py-2 pr-3 whitespace-nowrap">
                <span className="border-border rounded border px-1.5 py-0.5 text-xs">
                  {t(`access.${row.entitlement}`)}
                </span>
              </td>
              <td className="py-2 pr-3 text-right tabular-nums">{row.exercisesCompleted}</td>
              <td className="py-2 pr-3 text-right tabular-nums">{row.exercisesStarted}</td>
              <td className="py-2 pr-3 text-right tabular-nums">{row.level}</td>
              <td className="py-2 pr-3 text-right tabular-nums">{row.xpTotal}</td>
              <td className="py-2 pr-3 whitespace-nowrap">{date(row.lastActivity)}</td>
              <td className="py-2 whitespace-nowrap">
                <Link
                  href={directoryHref(params, {}, { id: row.id })}
                  className="text-primary underline underline-offset-4"
                >
                  {t("open")}
                  <span className="sr-only"> @{row.alias ?? row.id}</span>
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
