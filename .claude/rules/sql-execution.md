---
paths:
  - "src/lib/sandbox/**"
  - "src/lib/validation/**"
  - "src/app/api/sandbox/**"
  - "tests/sandbox/**"
---

# SQL execution rules (sandbox and validation)

Design: `docs/SQL_SANDBOX.md`. Every control in its §4 table is mandatory; removing or weakening one requires a DECISIONS.md entry and owner approval.

- Learner SQL is executed **only** by `SandboxEngine` implementations in `src/lib/sandbox/engines/**`; never by a Supabase client, `pg`, or any connection to the application database. Modules in this folder must not import `src/lib/supabase/admin.ts`.
- Pipeline order is fixed: size check → UTF-8/null-byte check → parser gate (`gate.ts`) → engine execution in a worker with hard timeout → row/column/cell caps → error sanitization → comparator → feedback.
- `gate.ts` must: require exactly one statement; allowlist statement kinds from the exercise's `allowed_statements`; deny system schemas and denied functions (list in `gate.ts` `DENIED_FUNCTIONS`, with a test asserting each entry); reject on any parse failure with an educational error (`sqlstate: 42601` style message in Spanish).
- The parser gate is never the only line of defense: the engine role is `learner` with `SELECT` only, instance is ephemeral, `statement_timeout` is set and the worker is terminated at `limits.sandbox.hardTimeoutMs`.
- Limits come from `src/config/limits.ts` (`sandbox.maxSqlBytes`, `maxRows`, `maxColumns`, `maxCellBytes`, `statementTimeoutMs`, `hardTimeoutMs`, `workerMemoryMb`); no inline numbers.
- Browser engine (`browser-engine.ts`) results are labeled preview; they never produce attempts, rewards or progress.
- Errors returned to learners: Postgres `message`, `hint`, `position` only, translated/wrapped in Spanish; never stack traces or file paths.
- Comparator (`src/lib/validation/compare.ts`) is pure and deterministic; every rule flag (`order_matters`, `numeric_tolerance`, `allow_extra_columns`, `dedupe`, type coercions) has unit tests with fixtures.
- Any change here requires running `tests/sandbox/**` (fuzz corpus + timeout tests) before completion.
