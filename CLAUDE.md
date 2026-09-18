# Data Minds SQL Academy — Operating Manual

## Mission

Spanish-language (es-419) SQL learning SaaS for LATAM adults 25–35: realistic business exercises, safe SQL execution, structured feedback, progressive hints, professional gamification, verifiable certificates. Owner/instructor: Marcelo Pisner (Data Minds Solutions). Product and brand values are configuration (`src/config/*`), never hardcoded.

## Source of truth

- Requirements: `docs/PRODUCT_REQUIREMENTS.md` · Architecture: `docs/ARCHITECTURE.md` · Data: `docs/DATABASE_DESIGN.md` · Sandbox: `docs/SQL_SANDBOX.md` · Security/privacy: `docs/SECURITY.md` · Payments: `docs/PAYMENTS.md` · Curriculum: `docs/CURRICULUM.md` · Content rules: `docs/CONTENT_GUIDELINES.md` · Gamification: `docs/GAMIFICATION.md` · Design: `docs/DESIGN_SYSTEM.md` · Tests: `docs/TESTING.md` · Deploy: `docs/DEPLOYMENT.md` · Decisions + pending questions: `docs/DECISIONS.md` · Plan: `docs/ROADMAP.md` · Claude setup: `docs/CLAUDE_CODE_SETUP.md`.
- Detailed rules live in `.claude/rules/*.md` (path-scoped where possible). Do not duplicate a rule here; link to it.

## Stack (D-02)

Next.js 16 App Router · React 19 · TypeScript strict · Tailwind 4 · shadcn/ui · Supabase (Postgres, Auth+Google, RLS) via `@supabase/ssr` · Zod + React Hook Form · CodeMirror 6 · PGlite (browser Run, server Submit) · `pgsql-ast-parser` · next-intl · Vitest/RTL/Playwright · ESLint/Prettier · GitHub Actions · Vercel. Pin exact versions in Phase 1 after checking current docs; do not add dependencies without a DECISIONS.md entry when they affect security, cost or architecture.

## Repository layout (target; see ARCHITECTURE.md §3)

`src/app` routes · `src/components` · `src/config` brand/pricing/limits · `src/content` authored content + schemas · `src/datasets` generators · `src/lib/{auth,supabase,sandbox,validation,learning,rewards,payments,certificates,analytics,env}` · `src/messages/es-419.json` · `supabase/{migrations,seed,tests}` · `tests/{unit,integration,e2e,sandbox,content}` · `docs` · `.claude`.

## Commands (available from Phase 1)

`npm run dev` · `npm run quality` (format check, lint, typecheck, unit, content:verify, datasets:verify, build) · `npm run test` / `test:e2e` · `npx supabase start|db reset` (local only) · `npm run content:build` · `npm run datasets:build`.

## Non-negotiable rules

1. **Learner SQL never reaches the application database.** Graded execution only in the isolated server engine; see `.claude/rules/sql-execution.md`.
2. **Authorization, rewards, entitlements, certificates and grading are server-side.** Every mutating server action/route calls `authorize()` first. Browser state is never trusted.
3. **RLS on every table in the same migration that creates it**, with a pgTAP test. Secret key only in `src/lib/supabase/admin.ts` (`server-only`).
4. **No secrets in source.** `.env.local` + Vercel env; `.env.example` names only. Never print env values.
5. **Payments stay in sandbox** and **no production deploy / `db push` to prod** without the owner's explicit approval in the current conversation.
6. **All user-facing text in `src/messages/es-419.json`**, neutral LATAM Spanish, "tú". No Spain-specific vocabulary, no childish tone.
7. **Content must pass schemas and `content:verify`** (solutions executed against the dataset snapshot). Never expose solutions, hints, expected results or correct options to the browser before unlock/submission.
8. **Accessibility is part of done** (WCAG 2.2 AA: keyboard, focus, labels, contrast, no color-only meaning, reduced motion).
9. **No placeholder features** presented as complete; no dead buttons. Mark WIP clearly.
10. Comments only where they explain non-obvious reasoning; no magic numbers (use `src/config/limits.ts`).

## Definition of done (every feature)

Works end to end · server-side authz · RLS where relevant · inputs validated with Zod · loading/empty/error states · responsive (360→1536) · accessible · tests for business rules · docs updated · `npm run quality` green · no exposed credentials · no dead-end UI.

## Documentation update rules

Changing schema → `docs/DATABASE_DESIGN.md` + migration. Changing architecture/deps → `docs/ARCHITECTURE.md` + `docs/DECISIONS.md`. Changing content rules → `docs/CONTENT_GUIDELINES.md`. Changing env/deploy → `docs/DEPLOYMENT.md` + `.env.example`. Any material decision → `docs/DECISIONS.md` (never silently). Phase completion → `docs/ROADMAP.md`.

## Routing: agents and skills

Use the smallest set of resources; one agent per file area at a time. Agents live in `.claude/agents/`, skills (also slash commands) in `.claude/skills/`.

- Architecture / trade-offs → `architect` · DB, migrations, RLS → `database-engineer` (`/create-migration`, `/review-rls`)
- Sandbox, parser gate, comparator → `sql-sandbox-engineer` (`/create-validator`)
- UI/pages/components → `frontend-engineer` + `ux-designer` (`/review-accessibility`)
- Learning path, pedagogy → `curriculum-designer` (`/create-lesson`) · exercises/hints/questions → `content-author` (`/create-exercise`, `/generate-hints`, `/create-theory-quiz`, `/review-sql-accuracy`)
- Datasets → `dataset-engineer` (`/create-dataset`) · auth/privacy/security → `security-engineer` (`/review-security`)
- Payments/entitlements → `payments-engineer` (`/implement-entitlement`) · XP/streaks/badges → `gamification-engineer` (`/add-gamification-rule`, `/create-certificate-requirement`)
- Tests → `qa-engineer` (`/test-feature`, `/quality-check`) · CI/Vercel → `devops-engineer` (`/deploy-preview`, `/prepare-release`)
- Docs consistency → `docs-keeper` (`/update-docs`) · Review/release readiness → `release-reviewer`
- Workflow: `/project-status` → `/plan-feature` → `/implement-feature` → `/test-feature` → `/quality-check` → `/update-docs`.

## Prohibited without explicit owner approval

Production deploys · production payment credentials · `supabase db push`/`db reset` against a linked remote · deleting migrations · disabling RLS · force-push · changing pricing, branding, legal text, free limit · adding third-party analytics · committing secrets · modifying `.claude/settings.json` hooks silently.

## Communication

Report honestly (never invent test, build, migration or payment results). Show commands before asking the owner to run them. Separate required work from optional. Keep `docs/DECISIONS.md` pending list current. The owner is strong in SQL/data; explain frontend, auth, security and deployment decisions clearly.
