"use client";

import { limits } from "@/config/limits";
import { gateSql } from "./gate";
import type { DatasetRef, SandboxOutcome } from "./types";

/**
 * Browser preview engine (docs/SQL_SANDBOX.md §5): runs learner SQL locally in a Web Worker
 * holding PGlite with the dataset snapshot. Instant, unlimited, never graded.
 * A hung query is killed by terminating the worker; the dataset reloads on next run.
 */
export type BrowserEngineState = "idle" | "loading" | "ready" | "failed";

export class BrowserEngine {
  private worker: Worker | null = null;
  private ready: Promise<void> | null = null;
  private seq = 0;
  private pending = new Map<number, { resolve: (v: SandboxOutcome) => void; timer: number }>();
  state: BrowserEngineState = "idle";
  onState?: (state: BrowserEngineState, detail?: string) => void;

  constructor(private readonly dataset: DatasetRef) {}

  private setState(state: BrowserEngineState, detail?: string) {
    this.state = state;
    this.onState?.(state, detail);
  }

  private spawn(): Promise<void> {
    this.setState("loading");
    const worker = new Worker("/sandbox-worker.js", { type: "module" });
    this.worker = worker;
    return new Promise<void>((resolve, reject) => {
      worker.onmessage = (event: MessageEvent) => {
        const msg = event.data as {
          type: string;
          id?: number;
          table?: string;
          message?: string;
          result?: SandboxOutcome;
          sqlstate?: string;
          position?: number;
          hint?: string;
        };
        if (msg.type === "progress") return this.onState?.("loading", msg.table);
        if (msg.type === "ready") {
          this.setState("ready");
          return resolve();
        }
        if (msg.type === "fatal") {
          this.setState("failed", msg.message);
          return reject(new Error(msg.message));
        }
        if (msg.id === undefined) return;
        const p = this.pending.get(msg.id);
        if (!p) return;
        this.pending.delete(msg.id);
        clearTimeout(p.timer);
        if (msg.type === "result" && msg.result)
          p.resolve({
            ...(msg.result as Extract<SandboxOutcome, { ok: true }>),
            ok: true,
            preview: true,
          });
        else if (msg.type === "pgerror")
          p.resolve({
            ok: false,
            code: "database",
            message: msg.message ?? "",
            sqlstate: msg.sqlstate,
            position: msg.position,
            hint: msg.hint,
          });
        else
          p.resolve({ ok: false, code: "engine", message: msg.message ?? "El motor local falló." });
      };
      worker.onerror = () => {
        this.setState("failed", "worker error");
        reject(new Error("worker error"));
      };
      worker.postMessage({
        type: "load",
        base: `/datasets/${this.dataset.slug}/v${this.dataset.version}`,
      });
    });
  }

  async warmUp(): Promise<void> {
    if (!this.ready) this.ready = this.spawn();
    await this.ready;
  }

  async run(
    sql: string,
    allowed: ("select" | "insert" | "update" | "delete")[] = ["select"],
  ): Promise<SandboxOutcome> {
    const gate = gateSql(sql, allowed);
    if (!gate.ok)
      return {
        ok: false,
        code: "gate",
        message: gate.message ?? "Consulta no permitida.",
        gateCode: gate.code,
      };
    try {
      await this.warmUp();
    } catch {
      return {
        ok: false,
        code: "engine",
        message: "No pudimos iniciar el motor local en este navegador.",
      };
    }
    const worker = this.worker;
    if (!worker)
      return { ok: false, code: "engine", message: "El motor local no está disponible." };
    const id = ++this.seq;
    const isSelect = !["insert", "update", "delete"].includes(gate.statementType ?? "");
    return new Promise<SandboxOutcome>((resolve) => {
      const timer = window.setTimeout(() => {
        this.pending.delete(id);
        worker.terminate();
        this.worker = null;
        this.ready = null;
        this.setState("idle");
        resolve({
          ok: false,
          code: "timeout",
          message: `La consulta superó el tiempo máximo (${limits.sandbox.hardTimeoutMs / 1000} s). El motor local se reiniciará en la próxima ejecución.`,
        });
      }, limits.sandbox.hardTimeoutMs);
      this.pending.set(id, { resolve, timer });
      worker.postMessage({
        type: "run",
        id,
        sql,
        isSelect,
        limits: {
          maxRows: limits.sandbox.maxRows,
          maxColumns: limits.sandbox.maxColumns,
          maxCellBytes: limits.sandbox.maxCellBytes,
        },
      });
    });
  }

  dispose() {
    this.worker?.terminate();
    this.worker = null;
    this.ready = null;
    for (const [, p] of this.pending) clearTimeout(p.timer);
    this.pending.clear();
  }
}
