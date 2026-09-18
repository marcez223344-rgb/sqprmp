# Safe SQL Execution — Analysis and Selected Design

**Decision:** D-03 in [DECISIONS.md](DECISIONS.md). **Status:** approved architecture, not yet implemented (Phase 4).

## 1. Threat model

Learners submit arbitrary text that is executed as SQL. Threats, in priority order:

1. Reading or modifying application data (profiles, entitlements, payments, solutions).
2. Privilege escalation inside the database (superuser functions, `COPY ... PROGRAM`, `pg_read_file`, `dblink`, extensions).
3. Resource exhaustion: infinite recursive CTEs, cartesian joins, `pg_sleep`, huge result sets, many concurrent requests.
4. Persistence/pollution: DDL/DML that changes the dataset for other learners.
5. Answer leakage: obtaining reference solutions or expected results from any payload.
6. Abuse of the endpoint as a free compute service.

## 2. Options compared

| Option                                                                                                                                           | Isolation from app data                                      | Free-tier viable                                                                               | Latency                   | Ops complexity                                                   | Dialect fidelity | Verdict                                                         |
| ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- | ------------------------- | ---------------------------------------------------------------- | ---------------- | --------------------------------------------------------------- |
| **A. RPC in the app Supabase project** (read-only role, `SET ROLE` inside a SECURITY DEFINER function, separate schema)                          | Weak: same cluster, one bug = full compromise                | Yes                                                                                            | Low                       | Low                                                              | Postgres         | Rejected: violates "learner SQL never reaches the app database" |
| **B. Second Supabase project for datasets**, accessed server-side over `pg` with a read-only role                                                | Good (separate cluster)                                      | Free tier allows 2 projects but **pauses after 7 idle days**; production needs Pro (+US$25/mo) | Low–medium                | Medium (two projects, two migration sets, pooling on serverless) | Postgres         | Viable fallback                                                 |
| **C. Separate execution service** (container per request on Fly/Railway)                                                                         | Excellent                                                    | No (paid)                                                                                      | Medium–high               | High                                                             | Any              | Over-engineered for MVP                                         |
| **D. Server-side embedded Postgres (PGlite, WASM)** inside the Next.js Node runtime; ephemeral in-memory instance loaded from a dataset snapshot | **Excellent**: no network, no shared state, nothing to reach | Yes (Vercel Node functions)                                                                    | ~50 ms warm, 0.3–1 s cold | Low (no extra infra)                                             | Real Postgres 17 | **Selected for Submit**                                         |
| **E. Browser-side PGlite** with replicated fictional data                                                                                        | Perfect for the server (nothing runs there)                  | Yes                                                                                            | 10–100 ms                 | Low                                                              | Real Postgres 17 | **Selected for Run**; never trusted for grading                 |

Selected: **hybrid D + E**, with B documented as the fallback if PGlite proves too slow or too heavy on Vercel.

Why not only E? Grading in the browser lets anyone forge results, rewards and certificates. Why not only D? Every exploratory run would cost a server invocation and add latency; the browser engine makes exploration instant and free, which matters pedagogically.

## 3. Selected architecture

```
Browser                                  Vercel Node function                 Supabase (app DB)
┌────────────────────────┐   Submit     ┌───────────────────────────┐        ┌────────────────┐
│ CodeMirror SQL editor  │ ───────────► │ 1. auth + entitlement     │ ─────► │ attempts,      │
│ PGlite (Web Worker)    │              │ 2. rate limit             │        │ rewards,       │
│  dataset snapshot      │   result +   │ 3. size + parser gate     │        │ progress       │
│  "Run" = local only    │ ◄─────────── │ 4. PGlite in worker_thread│        └────────────────┘
└────────────────────────┘   feedback   │    (ephemeral, read-only  │
                                        │     role, hard timeout)   │
                                        │ 5. structured validator   │
                                        │ 6. feedback + rewards     │
                                        └───────────────────────────┘
```

**Datasets** are generated by deterministic TypeScript scripts (seeded PRNG) and written as versioned static files: `public/datasets/<slug>/v<n>/{schema.sql, <table>.csv, manifest.json}` (a PGlite data-dir tarball was rejected in Phase 4: ~4.5 MB of base overhead per snapshot). Both engines load them with `COPY … FROM '/dev/blob'` into a fresh in-memory PGlite and then lock it down (`learner` role, denied functions). Measured: TiendaViva (91 k rows, 5 MB CSV) loads in ~6 s in the browser and ~1 s in the server worker; queries then take tens of milliseconds.

Expected results for each exercise are computed at content build time by running the reference solution against the snapshot and stored in the app DB (`exercise_expected_results`), never shipped to the browser.

## 4. Defense-in-depth controls (all mandatory)

| Layer | Control                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Where                                       |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| 0     | Server-only execution for anything graded                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Route handler / server action, Node runtime |
| 1     | Auth required; entitlement / free-limit check before execution                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | `src/lib/auth/authorize.ts`                 |
| 2     | Rate limit per user (default 30 submits / 5 min) and per IP; Postgres-backed token bucket                                                                                                                                                                                                                                                                                                                                                                                                                                              | `rate_limits` RPC                           |
| 3     | Input size ≤ 8 KB; valid UTF-8; strip null bytes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Zod schema                                  |
| 4     | **SQL parser gate** (`pgsql-ast-parser`, pure TS): must parse; exactly one statement; statement type in the exercise allowlist (`select`, `with`; write exercises may add `insert`/`update`/`delete`); reject `copy`, `do`, `create`, `alter`, `drop`, `grant`, `set`, `listen`, transaction control; reject schema references outside the allowlist; reject denied functions (`pg_sleep`, `pg_read_*`, `pg_ls_*`, `lo_*`, `dblink*`, `set_config`, `current_setting`, `pg_terminate_backend`, `pg_cancel_backend`, `query_to_xml`, …) | `src/lib/sandbox/gate.ts`                   |
| 5     | The parser is not the last line: the PGlite instance is ephemeral, executed as non-superuser role `learner` with `SELECT` only on dataset tables; `REVOKE EXECUTE` on denied functions; no extensions loaded                                                                                                                                                                                                                                                                                                                           | Snapshot build script                       |
| 6     | `statement_timeout` (3 s) **plus** a hard wall-clock kill: the query runs in a `worker_threads` Worker terminated at 5 s (PGlite cannot cancel a running query otherwise)                                                                                                                                                                                                                                                                                                                                                              | `src/lib/sandbox/worker.ts`                 |
| 7     | Row cap: fetch at most `MAX_ROWS + 1` (1 000) and flag truncation; column cap 100; cell text cap 2 KB                                                                                                                                                                                                                                                                                                                                                                                                                                  | Executor                                    |
| 8     | Memory: worker created with `resourceLimits.maxOldGenerationSizeMb`; fresh instance per write exercise, cached read-only instance for read exercises                                                                                                                                                                                                                                                                                                                                                                                   | Executor                                    |
| 9     | Errors: pass through Postgres `message`, `hint`, `position` (educational) but never stack traces, paths or internal identifiers                                                                                                                                                                                                                                                                                                                                                                                                        | `sanitizeError()`                           |
| 10    | Logging: `query_executions` stores SQL hash, length, duration, status, SQLSTATE, dataset/exercise ids, user id. Raw SQL lives only in `attempts` (first-party, RLS-protected, needed for the learner's review)                                                                                                                                                                                                                                                                                                                         | App DB                                      |
| 11    | No leakage: hints, solutions and expected results are returned only by server code after unlock conditions are verified                                                                                                                                                                                                                                                                                                                                                                                                                | RLS + server checks                         |
| 12    | Application queries around the sandbox use parameterized Supabase client calls only; no string-built SQL                                                                                                                                                                                                                                                                                                                                                                                                                               | Lint rule + review                          |

Controlled **write exercises** (post-MVP): exercise metadata declares `allowed_statements`; a fresh ephemeral instance is used and discarded, so rollback is implicit; validation runs a follow-up `SELECT` defined by the exercise.

## 5. Browser engine specifics

- PGlite runs in a static module Web Worker (`public/sandbox-worker.js`) that imports PGlite's own dist files served from `public/pglite/` (copied by `npm run assets:pglite`, ~5 MB gzipped, one-time, browser-cached) and the shared `engine-core.mjs`; strict CSP holds (`worker-src 'self'`). The worker is terminated and recreated on timeout.
- Dataset CSVs are fetched from `public/datasets/` (~1.2 MB gzipped for TiendaViva). IndexedDB persistence of the loaded database is a post-MVP optimization.
- Run results carry the banner "Vista previa local. Envía tu consulta para validarla."
- If WASM init fails (old browser, low memory), Run falls back to the server engine with a stricter rate limit.

## 6. Known limitations and accepted risks

- PGlite is single-connection; concurrency inside one function instance uses a small worker pool (default 2) and a queue.
- Cold start on Vercel adds 0.3–1 s on the first Submit per instance; acceptable for graded submissions.
- Datasets must stay modest (tens of thousands of rows); expert exercises can use dedicated larger snapshots.
- If measured Submit p95 > 3 s in Phase 4 load tests, switch the server engine to fallback B while keeping E in the browser. The executor interface is provider-agnostic: `SandboxEngine.execute(datasetRef, sql, limits)`.

## 7. Validation gates before Phase 4 sign-off

- Fuzz suite of ≥ 200 malicious inputs (`tests/sandbox/malicious.sql`) must all be rejected or fail harmlessly.
- Timeout test: a `WITH RECURSIVE` bomb is killed within 5 s and the function stays healthy.
- Load test: 50 concurrent submits stay under function memory limits.
- Static check: no module that imports `@electric-sql/pglite` may import the Supabase secret client.
