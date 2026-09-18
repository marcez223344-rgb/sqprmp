"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { ArrowRight, BookOpen, Loader2, Play, RotateCcw, Save, Send, Eye } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { limits } from "@/config/limits";
import {
  requestHintAction,
  revealSolutionAction,
  saveDraftAction,
  submitExerciseAction,
} from "@/lib/exercises/actions";
import type { ExerciseWorkspaceData, SubmitResult } from "@/lib/exercises/service";
import { BrowserEngine, type BrowserEngineState } from "@/lib/sandbox/browser-engine";
import type { SandboxOutcome } from "@/lib/sandbox/types";
import { cn } from "@/lib/utils/cn";
import { MarkdownClient } from "./markdown-client";
import { FeedbackPanel, HintPanel, SchemaBrowser } from "./panels";
import { ResultsTable } from "./results-table";
import { SaveQueryForm } from "./save-query-form";

const SqlEditor = dynamic(() => import("./sql-editor").then((m) => m.SqlEditor), {
  ssr: false,
  loading: () => (
    <div className="border-border bg-surface-2 h-48 animate-pulse rounded-md border" />
  ),
});

type Tab = "schema" | "theory" | "hints" | "solution";

export function ExerciseWorkspace({ data }: { data: ExerciseWorkspaceData }) {
  const t = useTranslations("workspace");
  const { exercise, dataset, schema, progress } = data;
  const initialSql = progress?.draft_sql ?? "";
  const [sqlText, setSqlText] = useState(initialSql);
  const [runResult, setRunResult] = useState<SandboxOutcome | null>(null);
  const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [engineState, setEngineState] = useState<BrowserEngineState>("idle");
  const [engineDetail, setEngineDetail] = useState<string | undefined>();
  const [running, setRunning] = useState(false);
  const [submitting, startSubmit] = useTransition();
  const [hints, setHints] = useState(data.hints);
  const [hintPending, startHint] = useTransition();
  const [solution, setSolution] = useState(data.solution);
  const [solutionPending, startReveal] = useTransition();
  const [solutionError, setSolutionError] = useState<string | null>(null);
  const [confirmReveal, setConfirmReveal] = useState(false);
  const [tab, setTab] = useState<Tab>("schema");
  const [draftStatus, setDraftStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [completed, setCompleted] = useState(progress?.status === "completed");
  const lastSubmittedSql = useRef<string | null>(null);
  const engineRef = useRef<BrowserEngine | null>(null);

  const allowed = useMemo(
    () =>
      (exercise.allowed_statements ?? ["select"]) as ("select" | "insert" | "update" | "delete")[],
    [exercise.allowed_statements],
  );
  const editorSchema = useMemo(
    () => Object.fromEntries(schema.map((s) => [s.name, s.columns.map((c) => c.name)])),
    [schema],
  );

  useEffect(() => {
    const engine = new BrowserEngine({ slug: dataset.slug, version: dataset.version });
    engine.onState = (s, d) => {
      setEngineState(s);
      setEngineDetail(d);
    };
    engineRef.current = engine;
    void engine.warmUp().catch(() => undefined);
    return () => engine.dispose();
  }, [dataset.slug, dataset.version]);

  const run = useCallback(async () => {
    const engine = engineRef.current;
    if (!engine || running) return;
    setRunning(true);
    try {
      setRunResult(await engine.run(sqlText, allowed));
    } finally {
      setRunning(false);
    }
  }, [sqlText, allowed, running]);

  const submit = useCallback(() => {
    if (submitting) return;
    setSubmitError(null);
    startSubmit(async () => {
      const r = await submitExerciseAction(exercise.id, sqlText, lastSubmittedSql.current);
      if (!r.ok) {
        setSubmitError(t(`submitErrors.${r.error}`));
        return;
      }
      lastSubmittedSql.current = sqlText;
      setSubmitResult(r.result);
      setRunResult(r.result.outcome);
      if (r.result.correct) setCompleted(true);
    });
  }, [exercise.id, sqlText, submitting, t]);

  const saveDraft = useCallback(() => {
    setDraftStatus("saving");
    void saveDraftAction(exercise.id, sqlText).then((r) => setDraftStatus(r.ok ? "saved" : "idle"));
  }, [exercise.id, sqlText]);

  const requestHint = (level: number) => {
    startHint(async () => {
      const r = await requestHintAction(exercise.id, level);
      if (r.ok)
        setHints((h) =>
          [...h.filter((x) => x.level !== level), r.hint].sort((a, b) => a.level - b.level),
        );
    });
  };

  const reveal = (explicit: boolean) => {
    setSolutionError(null);
    startReveal(async () => {
      const r = await revealSolutionAction(exercise.id, explicit);
      if (r.ok) {
        setSolution(r.solution);
        setConfirmReveal(false);
      } else setSolutionError(t(`solutionErrors.${r.error}`));
    });
  };

  const unlockable =
    submitResult?.solutionUnlockable ?? (progress ? progressUnlockable(progress) : false);
  const usedHints = hints.length;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
      {/* Left: statement + tabs */}
      <section className="space-y-4">
        <div className="border-border bg-surface space-y-3 rounded-lg border p-5">
          <h2 className="text-lg">{t("scenario")}</h2>
          <MarkdownClient>{exercise.scenario_md ?? ""}</MarkdownClient>
          <h2 className="text-lg">{t("businessQuestion")}</h2>
          <MarkdownClient>{exercise.business_question_md ?? ""}</MarkdownClient>
          <p className="text-muted text-sm">
            <strong className="text-text">{t("expectedColumns")}:</strong>{" "}
            <code className="font-mono">
              {((exercise.expected_columns as { name: string }[]) ?? [])
                .map((c) => c.name)
                .join(", ")}
            </code>
          </p>
        </div>

        <div className="border-border bg-surface rounded-lg border">
          <div role="tablist" aria-label={t("tabs.label")} className="border-border flex border-b">
            {(["schema", "theory", "hints", "solution"] as Tab[]).map((id) => (
              <button
                key={id}
                role="tab"
                type="button"
                id={`tab-${id}`}
                aria-selected={tab === id}
                aria-controls={`panel-${id}`}
                onClick={() => setTab(id)}
                className={cn(
                  "px-4 py-2.5 text-sm font-medium",
                  tab === id ? "border-primary text-text border-b-2" : "text-muted hover:text-text",
                )}
              >
                {t(`tabs.${id}`)}
                {id === "hints" && usedHints ? ` (${usedHints}/${limits.hints.levels})` : ""}
              </button>
            ))}
          </div>
          <div
            id="panel-schema"
            role="tabpanel"
            aria-labelledby="tab-schema"
            hidden={tab !== "schema"}
            className="p-4"
          >
            <SchemaBrowser tables={schema} highlight={exercise.tables_used ?? []} />
          </div>
          <div
            id="panel-theory"
            role="tabpanel"
            aria-labelledby="tab-theory"
            hidden={tab !== "theory"}
            className="space-y-3 p-4 text-sm"
          >
            <p>{exercise.learning_objective}</p>
            {data.theoryLessonSlug ? (
              <Link
                href={`/leccion/${data.theoryLessonSlug}`}
                className="text-primary inline-flex items-center gap-2 underline underline-offset-4"
              >
                <BookOpen aria-hidden="true" className="size-4" />
                {t("openTheory")}
              </Link>
            ) : null}
          </div>
          <div
            id="panel-hints"
            role="tabpanel"
            aria-labelledby="tab-hints"
            hidden={tab !== "hints"}
            className="p-4"
          >
            <HintPanel
              hints={hints}
              onRequest={requestHint}
              pending={hintPending}
              maxLevel={limits.hints.levels}
              penaltyPercent={limits.hints.xpPenaltyPercentPerHint}
            />
          </div>
          <div
            id="panel-solution"
            role="tabpanel"
            aria-labelledby="tab-solution"
            hidden={tab !== "solution"}
            className="space-y-3 p-4 text-sm"
          >
            {solution ? (
              <>
                <pre className="border-border bg-surface-2 overflow-x-auto rounded-md border p-3 font-mono text-xs">
                  {solution.sql}
                </pre>
                <MarkdownClient>{solution.explanation_md}</MarkdownClient>
                {solution.alternatives.map((a) => (
                  <details key={a.label} className="border-border rounded-md border p-3">
                    <summary className="cursor-pointer text-sm font-medium">
                      {t("alternative", { label: a.label })}
                    </summary>
                    <pre className="mt-2 overflow-x-auto font-mono text-xs">{a.sql}</pre>
                  </details>
                ))}
                <p className="text-muted">{t("solutionRetry")}</p>
              </>
            ) : unlockable ? (
              <>
                <p className="text-muted">{t("solutionUnlocked")}</p>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={solutionPending}
                  onClick={() => reveal(false)}
                >
                  <Eye aria-hidden="true" />
                  {t("revealSolution")}
                </Button>
              </>
            ) : confirmReveal ? (
              <>
                <p className="text-muted">
                  {t("revealWarning", { percent: limits.solutionUnlock.xpPercentAfterReveal })}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={solutionPending}
                    onClick={() => reveal(true)}
                  >
                    {t("revealConfirm")}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setConfirmReveal(false)}>
                    {t("revealCancel")}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-muted">
                  {t("solutionLocked", {
                    attempts: limits.solutionUnlock.minGenuineAttempts,
                    hints: limits.solutionUnlock.minHintsRequested,
                    minutes: limits.solutionUnlock.minMinutesElapsed,
                  })}
                </p>
                {limits.solutionUnlock.allowExplicitReveal ? (
                  <Button variant="ghost" size="sm" onClick={() => setConfirmReveal(true)}>
                    {t("revealAnyway")}
                  </Button>
                ) : null}
              </>
            )}
            {solutionError ? (
              <p role="alert" className="text-danger">
                {solutionError}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      {/* Right: editor + results + feedback */}
      <section className="space-y-4">
        <div className="border-border bg-surface space-y-3 rounded-lg border p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium">{t("editorTitle")}</p>
            <p role="status" className="text-muted text-xs">
              {engineState === "loading"
                ? t("engine.loading", { table: engineDetail ?? "…" })
                : engineState === "ready"
                  ? t("engine.ready")
                  : engineState === "failed"
                    ? t("engine.failed")
                    : t("engine.idle")}
            </p>
          </div>
          <SqlEditor
            value={sqlText}
            onChange={(v) => {
              setSqlText(v);
              setDraftStatus("idle");
            }}
            onRun={run}
            onSubmit={submit}
            schema={editorSchema}
            ariaLabel={t("editorAria")}
            placeholderText={t("editorPlaceholder")}
          />
          <p className="text-muted text-xs">{t("shortcuts")}</p>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" onClick={run} disabled={running || !sqlText.trim()}>
              {running ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <Play aria-hidden="true" />
              )}
              {t("run")}
            </Button>
            <Button onClick={submit} disabled={submitting || !sqlText.trim()}>
              {submitting ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <Send aria-hidden="true" />
              )}
              {t("submit")}
            </Button>
            <Button
              variant="ghost"
              onClick={saveDraft}
              disabled={draftStatus === "saving" || !sqlText.trim()}
            >
              <Save aria-hidden="true" />
              {draftStatus === "saved" ? t("draftSaved") : t("saveDraft")}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setSqlText("");
                setRunResult(null);
              }}
              disabled={!sqlText}
            >
              <RotateCcw aria-hidden="true" />
              {t("reset")}
            </Button>
            <SaveQueryForm exerciseId={exercise.id} datasetSlug={dataset.slug} sql={sqlText} />
          </div>
          {submitError ? (
            <p
              role="alert"
              className="border-danger/40 bg-danger/10 rounded-md border px-3 py-2 text-sm"
            >
              {submitError}
            </p>
          ) : null}
        </div>

        <div className="border-border bg-surface rounded-lg border p-4">
          <h2 className="mb-3 text-sm font-medium">{t("results.title")}</h2>
          <ResultsTable
            outcome={runResult}
            caption={t("results.caption", { title: exercise.title ?? "" })}
          />
        </div>

        <div className="border-border bg-surface rounded-lg border p-4">
          <h2 className="mb-3 text-sm font-medium">{t("feedback.title")}</h2>
          <FeedbackPanel
            items={submitResult?.feedback ?? []}
            correct={submitResult?.correct ?? null}
            submitted={Boolean(submitResult)}
          />
          {completed ? (
            <div className="border-success/40 bg-success/10 mt-4 flex flex-wrap items-center gap-3 rounded-md border p-3 text-sm">
              <span className="text-success font-medium">{t("completedBanner")}</span>
              {submitResult?.reward?.awarded ? (
                <span className="text-muted">
                  {t("rewardEarned", {
                    xp: submitResult.reward.xp,
                    coins: submitResult.reward.coins,
                  })}
                  {submitResult.reward.newBadges.length
                    ? ` · ${t("badgesEarned", { count: submitResult.reward.newBadges.length })}`
                    : ""}
                </span>
              ) : null}
              {data.nextLessonSlug ? (
                <Link
                  href={`/leccion/${data.nextLessonSlug}`}
                  className="text-primary inline-flex items-center gap-1 underline underline-offset-4"
                >
                  {t("next")}
                  <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
              ) : (
                <Link
                  href="/ruta"
                  className="text-primary inline-flex items-center gap-1 underline underline-offset-4"
                >
                  {t("backToPath")}
                </Link>
              )}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function progressUnlockable(p: {
  genuine_attempts_count: number;
  hints_used: number;
  started_at: string;
  status: string;
}): boolean {
  if (p.status === "completed") return true;
  const u = limits.solutionUnlock;
  return (
    p.genuine_attempts_count >= u.minGenuineAttempts ||
    p.hints_used >= u.minHintsRequested ||
    (Date.now() - Date.parse(p.started_at)) / 60_000 >= u.minMinutesElapsed
  );
}
