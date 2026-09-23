"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { saveDraftAction } from "@/lib/exercises/actions";
import { writeLocalDraft } from "./draft-storage";

/**
 * Draft safety net for the SQL editor.
 *
 * A learner lost a finished query by following a link out of the workspace (owner feedback,
 * 2026-09-23). Two layers now protect the text: `localStorage` (synchronous, survives back /
 * forward and a crashed tab) and `exercise_progress.draft_sql` through `saveDraftAction`
 * (survives a change of device). Every `localStorage` access is guarded: it throws in private
 * mode and when the quota is full.
 */

/** Pause after the last keystroke before the draft is copied to this browser. */
const LOCAL_DEBOUNCE_MS = 1_500;
/** Pause before the draft is written to the server: one row write per real pause, not per key. */
const SERVER_DEBOUNCE_MS = 6_000;

export type DraftStatus = "idle" | "local" | "saving" | "saved";

export function useDraftAutosave({
  exerciseId,
  userId,
  slug,
  sql,
  initialSql,
}: {
  exerciseId: string;
  /** Owner of the draft: part of the storage key, so two accounts never share one browser copy. */
  userId: string;
  slug: string;
  sql: string;
  /** Draft the page started from; it is already stored, so it is never written again. */
  initialSql: string;
}): { status: DraftStatus; saveNow: () => void } {
  const [status, setStatus] = useState<DraftStatus>("idle");
  /** Latest text, kept for the flush paths that run outside render. */
  const latest = useRef(sql);
  /** Last value known to be on the server; `null` after a failed write, so it is retried. */
  const onServer = useRef<string | null>(initialSql);

  const saveToServer = useCallback(
    async (value: string) => {
      if (value === onServer.current) return;
      const previous = onServer.current;
      onServer.current = value;
      setStatus("saving");
      const result = await saveDraftAction(exerciseId, value);
      if (result.ok) {
        setStatus("saved");
        return;
      }
      onServer.current = previous;
      // The browser copy is still there, so say that instead of claiming a save.
      setStatus("local");
    },
    [exerciseId],
  );

  const saveNow = useCallback(() => {
    writeLocalDraft(userId, slug, latest.current);
    void saveToServer(latest.current);
  }, [saveToServer, slug, userId]);

  useEffect(() => {
    latest.current = sql;
    if (sql === onServer.current) return;
    setStatus("idle");
    const local = window.setTimeout(() => {
      writeLocalDraft(userId, slug, sql);
      setStatus((s) => (s === "saving" ? s : "local"));
    }, LOCAL_DEBOUNCE_MS);
    const server = window.setTimeout(() => void saveToServer(sql), SERVER_DEBOUNCE_MS);
    return () => {
      window.clearTimeout(local);
      window.clearTimeout(server);
    };
  }, [saveToServer, slug, sql, userId]);

  // Leaving the page must not depend on a debounce that has not fired yet. `visibilitychange`
  // covers switching tab, minimising and mobile app switches; `pagehide` covers unload and the
  // back/forward cache; the cleanup covers in-app navigation, where the fetch survives.
  useEffect(() => {
    const flush = () => {
      writeLocalDraft(userId, slug, latest.current);
      void saveToServer(latest.current);
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [saveToServer, slug, userId]);

  return { status, saveNow };
}
