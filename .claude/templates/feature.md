# Feature: <name>

**Slug:** `<slug>` · **Phase:** <n> · **Owner agent(s):** <agents with file areas> · **Status:** Planned

## Goal and user story
As a <learner/admin/owner>, I want <capability> so that <outcome>.

## Acceptance criteria (testable)
1. …
2. …

## Layers touched
- **DB/RLS:** tables, policies, RPCs, indexes (→ `/create-migration`)
- **Server:** `src/lib/**` rules, server actions / route handlers (Zod + `authorize()`)
- **UI:** routes, components, states (loading/empty/error/success/locked), messages
- **Content/datasets:** …
- **Config:** `src/config/*` keys

## Authorization and data impact
Who can do what; entitlement/free-limit impact; new PII fields (purpose, retention → `docs/SECURITY.md` §7); analytics events (→ `docs/ANALYTICS.md`).

## Tests
Unit · Integration · E2E journey(s) · a11y

## Docs to update
…

## Rollout
Feature flag? Migration order? Seed changes? Owner manual steps?

## Owner decisions needed
D-xx …

## Sequence and file ownership
1. `database-engineer`: `supabase/migrations/…`
2. `<agent>`: `src/lib/…`
3. `frontend-engineer`: `src/app/…`
4. `qa-engineer`: `tests/…`
