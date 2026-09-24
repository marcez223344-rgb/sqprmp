"use client";

import type { Route } from "next";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import {
  BookOpen,
  ChevronDown,
  Circle,
  CircleCheck,
  CircleDashed,
  ClipboardList,
  Eye,
  Loader2,
  Play,
  RotateCcw,
  Save,
  Send,
  SquareTerminal,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { DatasetBadge } from "@/components/datasets/dataset-badge";
import { Button } from "@/components/ui/button";
import {
  CATEGORY_STYLES,
  SectionHeader,
  type SectionCategory,
} from "@/components/ui/section-header";
import { limits } from "@/config/limits";
import {
  requestHintAction,
  revealSolutionAction,
  submitExerciseAction,
} from "@/lib/exercises/actions";
import type { ExerciseWorkspaceData, SubmitResult } from "@/lib/exercises/service";
import { solutionUnlockableNow } from "@/lib/exercises/unlock";
import { BrowserEngine, type BrowserEngineState } from "@/lib/sandbox/browser-engine";
import type { SandboxOutcome } from "@/lib/sandbox/types";
import { cn } from "@/lib/utils/cn";
import { ExternalLessonLink, WorkspaceExitLink } from "./external-lesson-link";
import { useAppleShortcutKey } from "./use-apple-platform";
import { MarkdownClient } from "./markdown-client";
import { FeedbackPanel, HintPanel, SchemaBrowser } from "./panels";
import { ResultsTable } from "./results-table";
import { SaveQueryForm } from "./save-query-form";
import { SavedQueriesPanel } from "./saved-queries-panel";
import { SubmitStatus, type SubmitStage, type SubmitVerdict } from "./submit-status";
import { newerLocalDraft, purgeLegacyDrafts, readLocalDraft } from "./draft-storage";
import { useDraftAutosave } from "./use-draft-autosave";
import { usePrefersReducedMotion } from "./use-prefers-reduced-motion";

/**
 * Three ranks instead of seven identical boxes (review 2026-09-23 §2.4). Work surfaces — the task,
 * the editor, the result and the verdict — sit *above* the page; reference material sits *in* a
 * well. That one distinction is what tells the eye where the exercise actually happens, and it
 * moves the accent off `Teoria relevante`, where it used to be spent.
 */
const RANK_1 = "border-border bg-surface rounded-lg border p-5 shadow-sm";
/** The task: the only panel with a ring, because it is the only thing that must be read first. */
const RANK_1_TASK = `${RANK_1} ring-1 ring-inset ring-primary/20`;
const RANK_3 = "border-border bg-surface-2 rounded-md border p-4";

const SqlEditor = dynamic(() => import("./sql-editor").then((m) => m.SqlEditor), {
  ssr: false,
  loading: () => (
    <div className="border-border bg-surface-2 h-48 animate-pulse rounded-md border" />
  ),
});

export function ExerciseWorkspace({
  data,
  userId,
}: {
  data: ExerciseWorkspaceData;
  /** Resolved on the server; here only as part of the draft storage key, never for authorization. */
  userId: string;
}) {
  const t = useTranslations("workspace");
  const apple = useAppleShortcutKey();
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
  const [hintError, setHintError] = useState<string | null>(null);
  const [showAllTables, setShowAllTables] = useState(false);
  const [solution, setSolution] = useState(data.solution);
  const [solutionPending, startReveal] = useTransition();
  const [solutionError, setSolutionError] = useState<string | null>(null);
  const [confirmReveal, setConfirmReveal] = useState(false);
  const [completed, setCompleted] = useState(progress?.status === "completed");
  const [stage, setStage] = useState<SubmitStage>("idle");
  const [restoredLocalDraft, setRestoredLocalDraft] = useState(false);
  const lastSubmittedSql = useRef<string | null>(null);
  const engineRef = useRef<BrowserEngine | null>(null);
  const feedbackHeading = useRef<HTMLHeadingElement>(null);
  /** Hints already unlocked when the page loaded stay folded; only new ones open by themselves. */
  const [preOpenedHintLevels] = useState(() => data.hints.map((h) => h.level));
  const reducedMotion = usePrefersReducedMotion();
  const { status: draftStatus, saveNow } = useDraftAutosave({
    exerciseId: exercise.id,
    userId,
    slug: exercise.slug,
    sql: sqlText,
    initialSql,
  });

  const allowed = useMemo(
    () =>
      (exercise.allowed_statements ?? ["select"]) as ("select" | "insert" | "update" | "delete")[],
    [exercise.allowed_statements],
  );
  const used = useMemo(() => new Set(exercise.tables_used ?? []), [exercise.tables_used]);
  const visibleSchema = useMemo(
    () => (showAllTables || used.size === 0 ? schema : schema.filter((tbl) => used.has(tbl.name))),
    [schema, showAllTables, used],
  );
  const expectedColumns = useMemo(
    () => ((exercise.expected_columns as { name: string }[]) ?? []).map((c) => c.name),
    [exercise.expected_columns],
  );
  // Ticked from the last local run: the learner sees the target take shape while writing.
  const producedColumns = useMemo(
    () =>
      new Set(
        runResult?.ok ? runResult.columns.map((c) => c.name.toLowerCase()) : ([] as string[]),
      ),
    [runResult],
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

  // The browser copy can be newer than the server one: it is written 1.5 s after the last
  // keystroke, while the server write waits for a longer pause or for the page to be left.
  useEffect(() => {
    purgeLegacyDrafts();
    const local = newerLocalDraft(
      readLocalDraft(userId, exercise.slug),
      initialSql,
      progress?.draft_saved_at ?? null,
    );
    if (local === null) return;
    // One-shot read of an external store (localStorage) on mount, not a render cascade.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSqlText(local);
    setRestoredLocalDraft(true);
  }, [exercise.slug, initialSql, progress?.draft_saved_at, userId]);

  const showFeedback = useCallback(() => {
    const heading = feedbackHeading.current;
    if (!heading) return;
    heading.focus({ preventScroll: true });
    heading.scrollIntoView({ block: "center", behavior: reducedMotion ? "auto" : "smooth" });
  }, [reducedMotion]);

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
    // Stage 1 is the check the browser can do on its own, with the same limit the server applies.
    setStage("validating");
    if (new TextEncoder().encode(sqlText).length > limits.sandbox.maxSqlBytes) {
      setStage("idle");
      setSubmitError(t("submitErrors.validation"));
      return;
    }
    startSubmit(async () => {
      // Stage 2 covers the whole server phase: gate, execution in the isolated engine, comparison.
      setStage("executing");
      const r = await submitExerciseAction(exercise.id, sqlText, lastSubmittedSql.current);
      setStage("idle");
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

  const requestHint = (level: number) => {
    setHintError(null);
    startHint(async () => {
      const r = await requestHintAction(exercise.id, level);
      if (r.ok) {
        setHints((h) =>
          [...h.filter((x) => x.level !== level), r.hint].sort((a, b) => a.level - b.level),
        );
        return;
      }
      // Swallowing this made the button look dead when a hint could not be served.
      setHintError(t(`hintErrors.${r.error}` as never));
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

  // The verdict used to be visible only after scrolling; focus now follows the result.
  useEffect(() => {
    if (!submitResult) return;
    showFeedback();
  }, [submitResult, showFeedback]);

  const verdict: SubmitVerdict | null = !submitResult
    ? null
    : !submitResult.outcome.ok
      ? "not_executed"
      : submitResult.correct
        ? "correct"
        : "incorrect";

  const feedbackCategory: SectionCategory =
    verdict === "correct"
      ? "feedback-correct"
      : verdict === "incorrect"
        ? "feedback-incorrect"
        : verdict === "not_executed"
          ? "pitfall"
          : "neutral";

  // Recomputed on every render: hints opened after the page loaded count toward the unlock rule
  // and are known only to the browser until the next submission.
  const unlockable = solutionUnlockableNow({
    progress,
    lastSubmissionUnlockable: submitResult?.solutionUnlockable ?? null,
    hintsTaken: hints.length,
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
      {/* Left: the task, then the reference material */}
      <section className="space-y-4">
        <div className={RANK_1_TASK}>
          <SectionHeader
            as="h2"
            icon={ClipboardList}
            title={t("scenario")}
            titleClassName="text-xl"
          />
          <MarkdownClient>{exercise.scenario_md ?? ""}</MarkdownClient>
          <SectionHeader as="h3" eyebrow={t("businessQuestion")} className="mt-4 mb-1" />
          <MarkdownClient className="text-base font-medium">
            {exercise.business_question_md ?? ""}
          </MarkdownClient>
          {/* Nested one rank below the task it belongs to, instead of a fourth sibling box. */}
          <div className="bg-surface-2 mt-4 rounded-md p-3">
            <SectionHeader
              as="h3"
              category="schema"
              eyebrow={t("expectedColumns")}
              containerClassName="bg-surface"
              className="mb-2"
            />
            <p className="text-muted mb-2 text-xs">{t("expectedColumnsHint")}</p>
            <ul className="space-y-1.5">
              {expectedColumns.map((c) => {
                const present = producedColumns.has(c.toLowerCase());
                return (
                  <li key={c} className="flex items-center gap-2 text-sm">
                    {present ? (
                      <CircleCheck
                        aria-hidden="true"
                        className="text-success-ink size-4 shrink-0"
                      />
                    ) : (
                      <Circle aria-hidden="true" className="text-muted size-4 shrink-0" />
                    )}
                    <code className="font-mono">{c}</code>
                    <span className="sr-only">
                      {present ? t("columnPresent") : t("columnPending")}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* Reference material: grouped for assistive technology the way the wells group it visually. */}
        <aside aria-label={t("referenceMaterial")} className="space-y-4">
          {/* Theory stays next to the statement: a tab would take the learner away from the task. */}
          <div className={cn(RANK_3, "space-y-2")}>
            <SectionHeader
              as="h2"
              category="concept"
              eyebrow={t("theoryTitle")}
              containerClassName="bg-surface"
            />
            <p className="text-sm">{exercise.learning_objective}</p>
            {data.theoryLessonSlug ? (
              <ExternalLessonLink
                href={`/leccion/${data.theoryLessonSlug}` as Route}
                newTabHint={t("opensInNewTab")}
                icon={<BookOpen aria-hidden="true" className="size-4 shrink-0" />}
              >
                {t("openTheory")}
              </ExternalLessonLink>
            ) : null}
          </div>

          <div className={cn(RANK_3, "space-y-3")}>
            <SectionHeader
              as="h2"
              category="schema"
              eyebrow={t("schemaTitle")}
              containerClassName="bg-surface"
              aside={<DatasetBadge slug={dataset.slug} title={dataset.title} variant="inline" />}
            />
            {/* Only the tables this exercise needs: a dataset has ten of them and the rest is noise. */}
            <SchemaBrowser tables={visibleSchema} highlight={exercise.tables_used ?? []} />
            {schema.length > visibleSchema.length ? (
              <Button variant="ghost" size="sm" onClick={() => setShowAllTables((v) => !v)}>
                {showAllTables
                  ? t("schemaShowUsed")
                  : t("schemaShowAll", { count: schema.length - visibleSchema.length })}
              </Button>
            ) : null}
          </div>

          {/* One disclosure language on this screen: the native marker is replaced by the same
            chevron the schema list uses. */}
          <details className="border-border group rounded-md border border-dashed p-4">
            <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 [&::-webkit-details-marker]:hidden">
              {/* No heading inside a summary: the disclosure button itself is the label. */}
              <SectionHeader
                wrapper="div"
                category="neutral"
                eyebrow={t("solutionTitle")}
                className="mb-0"
              />
              <ChevronDown
                aria-hidden="true"
                className="text-muted ml-auto size-4 shrink-0 transition-transform group-open:rotate-180"
              />
            </summary>
            <div className="mt-3 space-y-3 text-sm">
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
                  {/* A learner who has not spent a single hint is almost always better served by
                    one: a hint costs a tenth of the XP that revealing the solution costs, and it
                    leaves the exercise solvable. The escape hatch stays open either way. */}
                  {hints.length === 0 ? (
                    <p className="text-muted">
                      {t("revealWithoutHints", {
                        hintPenalty: limits.hints.xpPenaltyPercentPerHint,
                        percent: limits.solutionUnlock.xpPercentAfterReveal,
                      })}
                    </p>
                  ) : null}
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
          </details>
        </aside>
      </section>

      {/* Right: editor + results + hints + verdict */}
      <section className="space-y-4">
        <div className={cn(RANK_1, "space-y-3")}>
          <SectionHeader
            as="h2"
            icon={SquareTerminal}
            title={t("editorTitle")}
            aside={
              <p role="status" className="text-muted text-xs">
                {engineState === "loading"
                  ? t("engine.loading", { table: engineDetail ?? "…" })
                  : engineState === "ready"
                    ? t("engine.ready")
                    : engineState === "failed"
                      ? t("engine.failed")
                      : t("engine.idle")}
              </p>
            }
          />
          <SqlEditor
            value={sqlText}
            onChange={setSqlText}
            onRun={run}
            onSubmit={submit}
            schema={editorSchema}
            ariaLabel={t("editorAria")}
            placeholderText={t("editorPlaceholder")}
          />
          <p className="text-muted text-xs">{apple ? t("shortcuts.cmd") : t("shortcuts.ctrl")}</p>
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
              onClick={saveNow}
              disabled={draftStatus === "saving" || !sqlText.trim()}
            >
              <Save aria-hidden="true" />
              {t("saveDraft")}
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
          {/* Recovering an earlier query used to mean leaving the exercise for /consultas. */}
          <SavedQueriesPanel
            currentSql={sqlText}
            onLoad={(sql) => {
              setSqlText(sql);
              setRunResult(null);
            }}
          />
          {/* Autosave keeps the draft; the line says where it is, so nobody has to guess. */}
          <p role="status" className="text-muted min-h-4 text-xs">
            {draftStatus === "saving"
              ? t("draft.saving")
              : draftStatus === "saved"
                ? t("draft.savedServer")
                : draftStatus === "local"
                  ? t("draft.savedLocal")
                  : restoredLocalDraft
                    ? t("draft.restored")
                    : ""}
          </p>
          <SubmitStatus stage={stage} verdict={verdict} onShowDetail={showFeedback} />
          {submitError ? (
            <p
              role="alert"
              className="border-danger/45 bg-danger/10 dark:bg-danger/14 rounded-md border px-3 py-2 text-sm"
            >
              {submitError}
            </p>
          ) : null}
        </div>

        <div className={RANK_1}>
          <SectionHeader
            as="h2"
            category="schema"
            title={t("results.title")}
            aside={
              runResult?.ok ? (
                <p className="text-muted text-xs">
                  {t("resultsMeta", { rows: runResult.rows.length, ms: runResult.durationMs ?? 0 })}
                </p>
              ) : null
            }
          />
          <ResultsTable
            outcome={runResult}
            sql={sqlText}
            caption={t("results.caption", { title: exercise.title ?? "" })}
          />
        </div>

        <div className={RANK_3}>
          <SectionHeader
            as="h2"
            category="hint"
            eyebrow={t("hintsTitle")}
            containerClassName="bg-surface"
          />
          <HintPanel
            hints={hints}
            collapsedLevels={preOpenedHintLevels}
            onRequest={requestHint}
            pending={hintPending}
            maxLevel={limits.hints.levels}
            penaltyPercent={limits.hints.xpPenaltyPercentPerHint}
          />
          {hintError ? (
            <p role="alert" className="text-danger mt-3 text-sm">
              {hintError}
            </p>
          ) : null}
        </div>

        {/* The verdict is what the product exists for, so it is rank 1 and it changes state. */}
        <div className={cn(RANK_1, verdict ? CATEGORY_STYLES[feedbackCategory].surface : null)}>
          <SectionHeader
            as="h2"
            category={feedbackCategory}
            icon={verdict ? undefined : CircleDashed}
            title={t("feedback.title")}
            /* Focus lands here after every submission, so the verdict is read and seen. */
            headingProps={{ ref: feedbackHeading, tabIndex: -1 }}
          />
          <FeedbackPanel
            items={submitResult?.feedback ?? []}
            correct={submitResult?.correct ?? null}
            submitted={Boolean(submitResult)}
            executed={submitResult ? submitResult.outcome.ok : true}
          />
          {completed ? (
            /* A footer with a rule, not a third tinted box inside an already tinted panel. */
            <footer className="border-border mt-4 flex flex-wrap items-center gap-3 border-t pt-3 text-sm">
              <span className="text-success-ink inline-flex items-center gap-2 font-medium">
                <CircleCheck aria-hidden="true" className="size-4 shrink-0" />
                {t("completedBanner")}
              </span>
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
              {/* Both finish the exercise, so both stay in the same tab: the draft is autosaved
                  and a tab per solved exercise is not a workspace (owner feedback 2026-09-24). */}
              {data.nextLessonSlug ? (
                <WorkspaceExitLink href={`/leccion/${data.nextLessonSlug}` as Route}>
                  {t("next")}
                </WorkspaceExitLink>
              ) : (
                <WorkspaceExitLink href="/ruta">{t("backToPath")}</WorkspaceExitLink>
              )}
            </footer>
          ) : null}
        </div>
      </section>
    </div>
  );
}
