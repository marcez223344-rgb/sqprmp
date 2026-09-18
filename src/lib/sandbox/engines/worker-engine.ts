import "server-only";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { Worker } from "node:worker_threads";
import { limits } from "@/config/limits";
import { gateSql } from "@/lib/sandbox/gate";
import type {
  DatasetRef,
  ExecuteOptions,
  SandboxEngine,
  SandboxOutcome,
  SandboxResult,
} from "@/lib/sandbox/types";

/**
 * Server engine: one long-lived worker_threads worker per dataset holding a loaded PGlite.
 * Queries run one at a time per worker; the hard timeout terminates the worker (the only
 * reliable way to stop a runaway query in PGlite) and the next request respawns it.
 * See docs/SQL_SANDBOX.md §3–4.
 */
type Pending = {
  resolve: (v: SandboxOutcome) => void;
  timer: NodeJS.Timeout;
};

class DatasetWorker {
  private worker: Worker | null = null;
  private ready: Promise<void> | null = null;
  private queue: Promise<unknown> = Promise.resolve();
  private pending = new Map<number, Pending>();
  private seq = 0;

  constructor(private readonly datasetDir: string) {}

  private spawn(): Promise<void> {
    const workerPath = join(process.cwd(), "src", "lib", "sandbox", "core", "sandbox-worker.mjs");
    const worker = new Worker(workerPath, {
      workerData: { datasetDir: this.datasetDir },
      resourceLimits: { maxOldGenerationSizeMb: limits.sandbox.workerMemoryMb },
    });
    this.worker = worker;
    return new Promise<void>((resolve, reject) => {
      const onMessage = (msg: {
        type: string;
        id?: number;
        message?: string;
        result?: SandboxResult;
        sqlstate?: string;
        position?: number;
        hint?: string;
      }) => {
        if (msg.type === "ready") return resolve();
        if (msg.type === "fatal") return reject(new Error(msg.message));
        if (msg.id === undefined) return;
        const p = this.pending.get(msg.id);
        if (!p) return;
        this.pending.delete(msg.id);
        clearTimeout(p.timer);
        if (msg.type === "result" && msg.result) p.resolve({ ok: true, ...msg.result });
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
          p.resolve({
            ok: false,
            code: "engine",
            message: "El motor de práctica falló al ejecutar la consulta.",
          });
      };
      worker.on("message", onMessage);
      // Late events from a terminated worker must not touch its replacement.
      worker.on("error", (err) => {
        reject(err);
        if (this.worker !== worker) return;
        this.failAll("engine", "El motor de práctica se detuvo inesperadamente.");
        this.reset();
      });
      worker.on("exit", () => {
        if (this.worker !== worker) return;
        this.failAll("engine", "El motor de práctica se reinició.");
        this.reset();
      });
    });
  }

  private failAll(code: "engine" | "timeout", message: string) {
    for (const [, p] of this.pending) {
      clearTimeout(p.timer);
      p.resolve({ ok: false, code, message });
    }
    this.pending.clear();
  }

  private reset() {
    this.worker = null;
    this.ready = null;
  }

  private async ensure(): Promise<Worker> {
    if (!this.worker || !this.ready) this.ready = this.spawn();
    await this.ready;
    if (!this.worker) throw new Error("worker unavailable");
    return this.worker;
  }

  run(sql: string, isSelect: boolean, hardTimeoutMs: number): Promise<SandboxOutcome> {
    const task = async (): Promise<SandboxOutcome> => {
      let worker: Worker;
      try {
        worker = await this.ensure();
      } catch {
        return {
          ok: false,
          code: "engine",
          message: "No pudimos iniciar el motor de práctica. Intenta de nuevo.",
        };
      }
      const id = ++this.seq;
      return new Promise<SandboxOutcome>((resolve) => {
        const timer = setTimeout(() => {
          this.pending.delete(id);
          resolve({
            ok: false,
            code: "timeout",
            message: `La consulta superó el tiempo máximo (${hardTimeoutMs / 1000} s). Revisa joins sin condición o recursiones sin fin.`,
          });
          // Hard kill: PGlite cannot cancel a running statement.
          this.failAll("timeout", "La consulta anterior agotó el tiempo y el motor se reinició.");
          void worker.terminate();
          this.reset();
        }, hardTimeoutMs);
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
    };
    // Serialize per worker.
    const next = this.queue.then(task, task);
    this.queue = next.catch(() => undefined);
    return next;
  }
}

const workers = new Map<string, DatasetWorker>();

export function datasetDirFor(ref: DatasetRef): string {
  return join(process.cwd(), "public", "datasets", ref.slug, `v${ref.version}`);
}

export const workerEngine: SandboxEngine = {
  async execute(dataset, sql, options: ExecuteOptions = {}): Promise<SandboxOutcome> {
    const gate = gateSql(sql, options.allowedStatements ?? ["select"]);
    if (!gate.ok)
      return {
        ok: false,
        code: "gate",
        message: gate.message ?? "Consulta no permitida.",
        gateCode: gate.code,
      };

    const dir = datasetDirFor(dataset);
    if (!existsSync(join(dir, "manifest.json"))) {
      return {
        ok: false,
        code: "engine",
        message: "El dataset de este ejercicio no está disponible.",
      };
    }
    const key = `${dataset.slug}@${dataset.version}`;
    let w = workers.get(key);
    if (!w) {
      w = new DatasetWorker(dir);
      workers.set(key, w);
    }
    const isSelect = !["insert", "update", "delete"].includes(gate.statementType ?? "");
    return w.run(sql, isSelect, options.hardTimeoutMs ?? limits.sandbox.hardTimeoutMs);
  },
};
