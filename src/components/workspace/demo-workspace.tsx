"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Loader2, Play } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { BrowserEngine, type BrowserEngineState } from "@/lib/sandbox/browser-engine";
import type { SandboxOutcome } from "@/lib/sandbox/types";
import { ResultsTable } from "./results-table";

const SqlEditor = dynamic(() => import("./sql-editor").then((m) => m.SqlEditor), {
  ssr: false,
  loading: () => (
    <div className="border-border bg-surface-2 h-48 animate-pulse rounded-md border" />
  ),
});

const SAMPLE = `SELECT c.country, COUNT(*) AS orders, ROUND(SUM(o.total_amount), 2) AS total_sales
FROM orders o
JOIN customers c ON c.id = o.customer_id
WHERE o.status = 'delivered'
GROUP BY c.country
ORDER BY orders DESC;`;

/** Public, unauthenticated demo of the browser engine on the TiendaViva dataset (no grading). */
export function DemoWorkspace({ schema }: { schema: Record<string, string[]> }) {
  const t = useTranslations("demo");
  const [sqlText, setSqlText] = useState(SAMPLE);
  const [result, setResult] = useState<SandboxOutcome | null>(null);
  const [state, setState] = useState<BrowserEngineState>("idle");
  const [detail, setDetail] = useState<string | undefined>();
  const [running, setRunning] = useState(false);
  const engineRef = useRef<BrowserEngine | null>(null);
  const dataset = useMemo(() => ({ slug: "tiendaviva", version: 1 }), []);

  useEffect(() => {
    const engine = new BrowserEngine(dataset);
    engine.onState = (s, d) => {
      setState(s);
      setDetail(d);
    };
    engineRef.current = engine;
    void engine.warmUp().catch(() => undefined);
    return () => engine.dispose();
  }, [dataset]);

  const run = useCallback(async () => {
    const engine = engineRef.current;
    if (!engine || running) return;
    setRunning(true);
    try {
      setResult(await engine.run(sqlText));
    } finally {
      setRunning(false);
    }
  }, [sqlText, running]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">{t("editorTitle")}</p>
        <p role="status" className="text-muted text-xs" data-testid="engine-state">
          {state === "loading"
            ? t("loading", { table: detail ?? "…" })
            : state === "ready"
              ? t("ready")
              : state === "failed"
                ? t("failed")
                : t("idle")}
        </p>
      </div>
      <SqlEditor
        value={sqlText}
        onChange={setSqlText}
        onRun={run}
        onSubmit={run}
        schema={schema}
        ariaLabel={t("editorAria")}
        placeholderText="SELECT …"
      />
      <div className="flex items-center gap-3">
        <Button onClick={run} disabled={running || !sqlText.trim()}>
          {running ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <Play aria-hidden="true" />
          )}
          {t("run")}
        </Button>
        <span className="text-muted text-xs">{t("shortcut")}</span>
      </div>
      <ResultsTable outcome={result} sql={sqlText} caption={t("caption")} />
    </div>
  );
}
