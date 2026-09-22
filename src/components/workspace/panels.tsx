"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, Info, Lightbulb, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { glossFor } from "@/config/sql-glossary";
import type { FeedbackItem } from "@/lib/validation/feedback";
import { cn } from "@/lib/utils/cn";
import { MarkdownClient } from "./markdown-client";

interface SchemaTable {
  name: string;
  description: string;
  columns: {
    name: string;
    data_type: string;
    description: string;
    is_pk: boolean;
    fk_ref: string | null;
  }[];
}

export function SchemaBrowser({
  tables,
  highlight,
}: {
  tables: SchemaTable[];
  highlight: string[];
}) {
  const t = useTranslations("workspace.schema");
  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(tables.map((x) => [x.name, highlight.includes(x.name)])),
  );
  return (
    <div className="space-y-2">
      <p className="text-muted text-xs">{t("intro")}</p>
      <ul className="divide-border border-border divide-y rounded-md border">
        {tables.map((table) => {
          const isOpen = open[table.name] ?? false;
          const used = highlight.includes(table.name);
          return (
            <li key={table.name}>
              <button
                type="button"
                className="hover:bg-surface-2 flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm"
                aria-expanded={isOpen}
                aria-controls={`schema-${table.name}`}
                onClick={() => setOpen((o) => ({ ...o, [table.name]: !isOpen }))}
              >
                <span className="font-mono font-medium">
                  {table.name}
                  {glossFor(table.name) ? (
                    <span className="text-muted ml-2 font-sans text-xs font-normal italic">
                      {glossFor(table.name)}
                    </span>
                  ) : null}
                  {used ? (
                    <span className="bg-primary/10 text-primary ml-2 rounded-full px-2 py-0.5 font-sans text-[10px] uppercase">
                      {t("used")}
                    </span>
                  ) : null}
                </span>
                <ChevronDown
                  aria-hidden="true"
                  className={cn("size-4 transition-transform", isOpen && "rotate-180")}
                />
              </button>
              <div
                id={`schema-${table.name}`}
                hidden={!isOpen}
                className="border-border bg-surface-2/50 border-t px-3 py-2"
              >
                <p className="text-muted mb-2 text-xs">{table.description}</p>
                <table className="w-full text-xs">
                  <caption className="sr-only">{t("columnsOf", { table: table.name })}</caption>
                  <thead>
                    <tr className="text-muted text-left">
                      <th scope="col" className="py-1 pr-2 font-medium">
                        {t("column")}
                      </th>
                      <th scope="col" className="py-1 pr-2 font-medium">
                        {t("type")}
                      </th>
                      <th scope="col" className="py-1 font-medium">
                        {t("description")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {table.columns.map((c) => (
                      <tr key={c.name} className="border-border/60 border-t align-top">
                        <td className="py-1 pr-2 font-mono whitespace-nowrap">
                          {c.name}
                          {/* The identifiers stay in English, as in any data job; the gloss is
                              there so that is never a barrier to reading the schema. */}
                          {glossFor(c.name) ? (
                            <span className="text-muted ml-2 font-sans text-[10px] italic">
                              {glossFor(c.name)}
                            </span>
                          ) : null}
                          {c.is_pk ? <span className="text-muted ml-1 text-[10px]">PK</span> : null}
                          {c.fk_ref ? (
                            <span className="text-muted ml-1 text-[10px]">→ {c.fk_ref}</span>
                          ) : null}
                        </td>
                        <td className="text-muted py-1 pr-2 font-mono whitespace-nowrap">
                          {c.data_type}
                        </td>
                        <td className="text-muted py-1">{c.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function FeedbackPanel({
  items,
  correct,
  submitted,
}: {
  items: FeedbackItem[];
  correct: boolean | null;
  submitted: boolean;
}) {
  const t = useTranslations("workspace.feedback");
  if (!submitted) return <p className="text-muted text-sm">{t("notYet")}</p>;
  const blocking = items.filter((i) => i.severity === "blocking");
  const warnings = items.filter((i) => i.severity === "warning");
  const tips = items.filter((i) => i.severity === "tip");
  return (
    <div className="space-y-4" role="region" aria-live="polite" aria-label={t("title")}>
      <p
        className={cn(
          "inline-flex items-center gap-2 font-semibold",
          correct ? "text-success" : "text-danger",
        )}
      >
        {correct ? (
          <CheckCircle2 aria-hidden="true" className="size-5" />
        ) : (
          <XCircle aria-hidden="true" className="size-5" />
        )}
        {correct ? t("correct") : t("incorrect")}
      </p>
      {blocking.length ? (
        <ul className="space-y-2">
          {blocking.map((i, idx) => (
            <li
              key={idx}
              className="border-danger/30 bg-danger/5 flex gap-2 rounded-md border p-3 text-sm"
            >
              <XCircle aria-hidden="true" className="text-danger mt-0.5 size-4 shrink-0" />
              <span>
                <span className="sr-only">{t("severity.blocking")}: </span>
                {t(`messages.${i.messageKey}` as never, i.params as never)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {warnings.length ? (
        <ul className="space-y-2">
          {warnings.map((i, idx) => (
            <li
              key={idx}
              className="border-warning/40 bg-warning/10 flex gap-2 rounded-md border p-3 text-sm"
            >
              <AlertTriangle aria-hidden="true" className="text-warning mt-0.5 size-4 shrink-0" />
              <span>
                <span className="sr-only">{t("severity.warning")}: </span>
                {t(`messages.${i.messageKey}` as never, i.params as never)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {tips.length ? (
        <div>
          <p className="text-muted mb-1 text-xs font-semibold uppercase">{t("tipsTitle")}</p>
          <ul className="space-y-1">
            {tips.map((i, idx) => (
              <li key={idx} className="text-muted flex gap-2 text-sm">
                <Info aria-hidden="true" className="text-info mt-0.5 size-4 shrink-0" />
                <span>{t(`messages.${i.messageKey}` as never, i.params as never)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function HintPanel({
  hints,
  onRequest,
  pending,
  maxLevel,
  penaltyPercent,
}: {
  hints: { level: number; body_md: string }[];
  onRequest: (level: number) => void;
  pending: boolean;
  maxLevel: number;
  penaltyPercent: number;
}) {
  const t = useTranslations("workspace.hints");
  const nextLevel = hints.length + 1;
  return (
    <div className="space-y-3">
      <p className="text-muted text-xs">{t("intro", { penalty: penaltyPercent })}</p>
      <ol className="space-y-3">
        {hints.map((h) => (
          <li key={h.level} className="border-border bg-surface-2/60 rounded-md border p-3 text-sm">
            <p className="text-muted mb-1 inline-flex items-center gap-1 text-xs font-semibold uppercase">
              <Lightbulb aria-hidden="true" className="size-3.5" />
              {t("level", { level: h.level })}
            </p>
            <MarkdownClient>{h.body_md}</MarkdownClient>
          </li>
        ))}
      </ol>
      {nextLevel <= maxLevel ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => onRequest(nextLevel)}
          className="border-border hover:bg-surface-2 inline-flex h-10 items-center gap-2 rounded-md border px-4 text-sm font-medium disabled:opacity-50"
        >
          <Lightbulb aria-hidden="true" className="size-4" />
          {t("request", { level: nextLevel })}
        </button>
      ) : (
        <p className="text-muted text-sm">{t("exhausted")}</p>
      )}
    </div>
  );
}
