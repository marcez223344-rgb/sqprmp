"use client";

import { Lightbulb } from "lucide-react";
import { useTranslations } from "next-intl";
import { errorHelpFor } from "@/lib/sandbox/error-help";
import type { SandboxOutcome } from "@/lib/sandbox/types";
import { cn } from "@/lib/utils/cn";

const MAX_RENDER_ROWS = 200;

export function ResultsTable({
  outcome,
  caption,
  sql = "",
}: {
  outcome: SandboxOutcome | null;
  caption: string;
  /** The query that produced this outcome; some error hints depend on how it was written. */
  sql?: string;
}) {
  const t = useTranslations("workspace.results");
  const help =
    outcome && !outcome.ok && outcome.code === "database"
      ? errorHelpFor({ sqlstate: outcome.sqlstate, message: outcome.message, sql })
      : null;

  if (!outcome) {
    return (
      <div className="border-border text-muted rounded-md border border-dashed p-6 text-center text-sm">
        {t("empty")}
      </div>
    );
  }
  if (!outcome.ok) {
    return (
      <div
        role="alert"
        className="border-danger/40 bg-danger/10 space-y-2 rounded-md border p-4 text-sm"
      >
        <p className="font-semibold">{t(`errorTitle.${outcome.code}`)}</p>
        <p className="font-mono whitespace-pre-wrap">{outcome.message}</p>
        {help ? (
          <p className="border-danger/30 bg-surface rounded-md border p-3">
            <Lightbulb aria-hidden="true" className="text-warning mr-2 inline size-4" />
            {t(`help.${help.key}` as never, (help.params ?? {}) as never)}
          </p>
        ) : null}
        {outcome.hint ? <p className="text-muted">{t("pgHint", { hint: outcome.hint })}</p> : null}
        {outcome.position ? (
          <p className="text-muted">{t("position", { position: outcome.position })}</p>
        ) : null}
      </div>
    );
  }

  const shown = outcome.rows.slice(0, MAX_RENDER_ROWS);
  return (
    <div className="space-y-2">
      <p role="status" aria-live="polite" className="text-muted text-xs">
        {outcome.preview ? `${t("preview")} · ` : ""}
        {t("summary", {
          rows: outcome.rowCount,
          columns: outcome.columns.length,
          ms: outcome.durationMs,
        })}
        {outcome.truncated ? ` · ${t("truncated")}` : ""}
        {outcome.rowCount > MAX_RENDER_ROWS
          ? ` · ${t("renderLimited", { shown: MAX_RENDER_ROWS })}`
          : ""}
      </p>
      <div className="border-border max-h-[420px] overflow-auto rounded-md border">
        <table className="w-full text-left font-mono text-xs">
          <caption className="sr-only">{caption}</caption>
          <thead className="bg-surface-2 sticky top-0">
            <tr>
              <th scope="col" className="text-muted px-3 py-2 font-medium">
                #
              </th>
              {outcome.columns.map((c) => (
                <th key={c.name} scope="col" className="px-3 py-2 font-medium">
                  {c.name}
                  <span className="text-muted ml-1 font-normal">{c.type}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 ? (
              <tr>
                <td
                  colSpan={outcome.columns.length + 1}
                  className="text-muted px-3 py-6 text-center"
                >
                  {t("noRows")}
                </td>
              </tr>
            ) : (
              shown.map((row, i) => (
                <tr
                  key={i}
                  // Alternating rows: scanning a wide result set by eye is the point of this table.
                  className={cn("border-border border-t", i % 2 === 1 && "bg-surface-2/40")}
                >
                  <td className="text-muted px-3 py-1.5 tabular-nums">{i + 1}</td>
                  {row.map((cell, j) => (
                    <td
                      key={j}
                      className={cn(
                        "px-3 py-1.5 whitespace-nowrap",
                        typeof cell === "number" && "text-right tabular-nums",
                        cell === null && "text-muted italic",
                      )}
                    >
                      {cell === null ? "NULL" : String(cell)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
