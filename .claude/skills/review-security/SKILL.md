---
name: review-security
description: Perform a security and privacy review of the current changes or a named area (auth, sandbox, payments, RLS, headers, secrets, PII) and write a severity-ranked report. Read-only except the report.
argument-hint: [area-or-diff-range]
allowed-tools: Read Grep Glob Bash(git *) Bash(npm audit*) Bash(npm run *) Bash(npx supabase test *) Write
---

## Purpose

Review "$ARGUMENTS" (default: uncommitted + last commit) against `docs/SECURITY.md`, `.claude/rules/security.md`, `.claude/rules/sql-execution.md` and the RLS matrix.

## Context

```!
git diff --stat HEAD 2>/dev/null | tail -20
```

## Procedure

1. Enumerate new/changed server actions, route handlers, RPCs, policies, env vars, dependencies.
2. Check each endpoint: Zod parse → `authorize()` → rate limit → audit log; identity via `getUser()`; redirects allowlisted; errors sanitized.
3. Check data exposure: page props and API responses never contain hints, solutions, expected results, `is_correct`, secrets; public views limited to documented columns.
4. Sandbox: pipeline order intact; limits from config; denied list tests present; no Supabase admin import in `src/lib/sandbox`.
5. Payments: signature verify, timestamp, idempotency, re-fetch, transaction, sandbox keys only.
6. Secrets: grep for patterns (same list as `.claude/hooks/_lib.mjs`); `.env*` ignored; no env values in logs/tests.
7. Privacy: new PII fields documented in `docs/SECURITY.md` §7 with purpose/retention; analytics props free of PII.
8. Run `npm audit --audit-level=high` and the RLS pgTAP suite; quote results.
9. Write `docs/reviews/<date>-security.md` from `.claude/templates/security-review.md`.

## Output

Report with findings (Critical/High/Medium/Low, file:line, scenario, fix) and a go/no-go for the phase.

## Validation checklist

- [ ] Commands executed and quoted · [ ] No fixes applied by this skill · [ ] Pending decisions noted
