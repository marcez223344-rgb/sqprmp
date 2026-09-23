"use client";

import { useCallback, useId, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ChevronDown, FolderOpen, Loader2 } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { listSavedQueriesAction } from "@/lib/progress/actions";
import type { SavedQuery } from "@/lib/progress/saved-queries";
import { cn } from "@/lib/utils/cn";

type ListState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; error: string }
  | { kind: "ready"; queries: SavedQuery[] };

/**
 * Browse and re-open the learner's saved queries without leaving the exercise.
 *
 * Saving already worked; recovering meant navigating to /consultas and losing the exercise
 * (owner feedback, 2026-09-23). The list is fetched from the server on every open — so a query
 * saved a second ago is there — through the same helper /consultas uses, and the server decides
 * whose queries these are.
 */
export function SavedQueriesPanel({
  currentSql,
  onLoad,
}: {
  currentSql: string;
  onLoad: (sql: string) => void;
}) {
  const t = useTranslations("workspace.savedQueries");
  const format = useFormatter();
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<ListState>({ kind: "idle" });
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [pending, startTransition] = useTransition();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  const fetchList = useCallback(() => {
    setState({ kind: "loading" });
    startTransition(async () => {
      const r = await listSavedQueriesAction();
      setState(
        r.ok
          ? { kind: "ready", queries: r.queries }
          : { kind: "error", error: t(`errors.${r.error}`) },
      );
    });
  }, [t]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    setConfirmId(null);
    if (next) fetchList();
  };

  const load = (q: SavedQuery) => {
    onLoad(q.sql);
    setConfirmId(null);
    setOpen(false);
    setAnnouncement(t("loaded", { title: q.title }));
    // Focus returns to the control that opened the panel, which is still on screen.
    triggerRef.current?.focus();
  };

  const requestLoad = (q: SavedQuery) => {
    // Replacing a non-empty editor throws away work that was never saved under a name.
    if (currentSql.trim() && currentSql.trim() !== q.sql.trim()) {
      setConfirmId(q.id);
      // The confirm button replaces the one that was just activated, so focus must follow it.
      requestAnimationFrame(() => confirmRef.current?.focus());
      return;
    }
    load(q);
  };

  return (
    <div className="space-y-2">
      <Button
        ref={triggerRef}
        variant="ghost"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={toggle}
      >
        <FolderOpen aria-hidden="true" />
        {t("open")}
        <ChevronDown
          aria-hidden="true"
          className={cn("transition-transform", open && "rotate-180")}
        />
      </Button>
      <p role="status" className="text-muted text-xs">
        {announcement}
      </p>
      <div
        id={panelId}
        hidden={!open}
        className="border-border bg-surface-2 space-y-3 rounded-md border p-4"
      >
        <p className="text-muted text-xs">{t("intro")}</p>
        {state.kind === "loading" ? (
          <p className="text-muted inline-flex items-center gap-2 text-sm">
            <Loader2 aria-hidden="true" className="size-4 animate-spin" />
            {t("loading")}
          </p>
        ) : state.kind === "error" ? (
          <div className="space-y-2">
            <p role="alert" className="text-danger text-sm">
              {state.error}
            </p>
            <Button variant="secondary" size="sm" disabled={pending} onClick={fetchList}>
              {t("retry")}
            </Button>
          </div>
        ) : state.kind === "ready" && state.queries.length === 0 ? (
          <p className="text-muted text-sm">{t("empty")}</p>
        ) : state.kind === "ready" ? (
          <ul className="space-y-2">
            {state.queries.map((q) => (
              <li key={q.id} className="border-border bg-surface rounded-md border p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium wrap-break-word">{q.title}</p>
                    <p className="text-muted text-xs">
                      {q.datasetSlug} ·{" "}
                      {format.dateTime(new Date(q.updatedAt), { dateStyle: "medium" })}
                    </p>
                  </div>
                  {confirmId === q.id ? null : (
                    <Button variant="secondary" size="sm" onClick={() => requestLoad(q)}>
                      {t("load")}
                    </Button>
                  )}
                </div>
                {/* Scrollable, so it is a keyboard tab stop with a name (WCAG 2.1.1). */}
                <pre
                  tabIndex={0}
                  role="region"
                  aria-label={t("sqlOf", { title: q.title })}
                  className="bg-surface-2 mt-2 max-h-24 overflow-auto rounded-md p-2 font-mono text-xs"
                >
                  <code>{q.sql}</code>
                </pre>
                {confirmId === q.id ? (
                  <div className="mt-2 space-y-2">
                    <p className="text-warning-ink text-xs">{t("replaceWarning")}</p>
                    <div className="flex flex-wrap gap-2">
                      <Button ref={confirmRef} variant="danger" size="sm" onClick={() => load(q)}>
                        {t("replaceConfirm")}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setConfirmId(null)}>
                        {t("replaceCancel")}
                      </Button>
                    </div>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
        <Link href="/consultas" className="text-primary text-xs underline underline-offset-4">
          {t("manage")}
        </Link>
      </div>
    </div>
  );
}
