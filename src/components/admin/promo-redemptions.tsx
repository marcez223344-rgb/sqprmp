"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { markPromoRedemptionsSeenAction } from "@/lib/admin/actions";

export interface PromoRedemptionRow {
  id: string;
  alias: string | null;
  code: string | null;
  kindLabel: string | null;
  /** ISO timestamp for `<time dateTime>`. */
  createdAt: string;
  /** Already formatted on the server in the configured time zone. */
  when: string;
  isNew: boolean;
}

/**
 * Recent redemptions (who, which code, when) on /admin/promos. Opening the page marks them as seen
 * for the header badge (D-43), then refreshes so the badge drops. The «Nuevo» labels are held in
 * state from the first render, so they survive that refresh for the rest of the visit.
 */
export function PromoRedemptions({
  rows,
  renderedAt,
}: {
  rows: PromoRedemptionRow[];
  renderedAt: string;
}) {
  const t = useTranslations("admin.promos.redemptions");
  const router = useRouter();
  const [newIds] = useState(() => new Set(rows.filter((r) => r.isNew).map((r) => r.id)));
  const marked = useRef(false);

  useEffect(() => {
    if (marked.current || newIds.size === 0) return;
    marked.current = true;
    void markPromoRedemptionsSeenAction(renderedAt).then((r) => {
      if (r.ok) router.refresh();
    });
  }, [newIds, renderedAt, router]);

  if (rows.length === 0) return <p className="text-muted text-sm">{t("empty")}</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <caption className="sr-only">{t("caption")}</caption>
        <thead className="text-muted text-left">
          <tr>
            <th scope="col" className="py-2 pr-3 font-medium">
              {t("cols.learner")}
            </th>
            <th scope="col" className="py-2 pr-3 font-medium">
              {t("cols.code")}
            </th>
            <th scope="col" className="py-2 font-medium">
              {t("cols.when")}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-border border-t">
              <td className="py-2 pr-3">
                {r.alias ? `@${r.alias}` : <span className="text-muted">{t("noAlias")}</span>}
                {newIds.has(r.id) ? (
                  <span className="border-warning/40 bg-warning/10 text-warning-ink ml-2 rounded-full border px-2 py-0.5 text-xs font-semibold">
                    {t("new")}
                  </span>
                ) : null}
              </td>
              <td className="py-2 pr-3">
                <span className="font-mono">{r.code ?? "—"}</span>
                {r.kindLabel ? <span className="text-muted"> · {r.kindLabel}</span> : null}
              </td>
              <td className="py-2 whitespace-nowrap">
                <time dateTime={r.createdAt}>{r.when}</time>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
