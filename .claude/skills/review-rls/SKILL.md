---
name: review-rls
description: Audit Row Level Security across all migrations against the policy matrix in docs/DATABASE_DESIGN.md and run the pgTAP suite. Read-only except for the report.
allowed-tools: Read Grep Glob Bash(npx supabase *) Bash(git *) Write
---

## Purpose
Prove every exposed table is protected as documented.

## Procedure
1. Grep `supabase/migrations/**` for `create table` and `enable row level security`; list tables missing RLS.
2. For each table, extract policies and compare with the RLS matrix; flag: broader than matrix, missing role, `using (true)` on non-public data, policies on views instead of tables, `security definer` views, functions without pinned `search_path`, grants to `anon`/`authenticated` beyond the matrix.
3. Check public views expose only the documented columns (`exercises_public`, `questions_public`, `question_options_public`, `certificate_verification`, `public_profiles`).
4. Run `npx supabase test db` and include results verbatim.
5. Write `docs/reviews/<date>-rls.md` with findings (severity, table, policy, fix).

## Validation checklist
- [ ] Zero tables without RLS
- [ ] Matrix and policies consistent (or matrix updated with justification)
- [ ] Secrets-bearing tables (`exercise_solutions`, `exercise_expected_results`, `exercise_hints`, `payment_events`, `audit_logs`) have no learner policies
- [ ] pgTAP suite green

## Output
Report + list of fixes assigned to `database-engineer`.
