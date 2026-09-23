# Claude Code Operating System for this project

Validated against the official Claude Code docs (subagents, skills, hooks, memory/rules) on 2026-09-18. Formats used: `.claude/agents/*.md` (frontmatter `name`, `description`, `tools`), `.claude/skills/<name>/SKILL.md` (frontmatter `name`, `description`, `argument-hint`, `arguments`, `allowed-tools`, `disable-model-invocation`; skills double as `/slash-commands`), `.claude/settings.json` hooks (`PreToolUse`/`PostToolUse`, `matcher`, `type: command` with exec-form `args`, `timeout`), `.claude/rules/*.md` with optional `paths:` frontmatter for path-scoped loading. The legacy `.claude/commands/` directory is intentionally not used (skills supersede it).

## Directory tree

```
.claude/
├── settings.json                # hooks (3 scripts)
├── agents/                      # 15 specialized subagents
│   ├── architect.md             database-engineer.md      sql-sandbox-engineer.md
│   ├── frontend-engineer.md     ux-designer.md            curriculum-designer.md
│   ├── content-author.md        dataset-engineer.md       security-engineer.md
│   ├── payments-engineer.md     gamification-engineer.md  qa-engineer.md
│   └── devops-engineer.md       docs-keeper.md            release-reviewer.md
├── skills/                      # 22 skills = slash commands
│   ├── project-status/  plan-feature/  implement-feature/  test-feature/  quality-check/
│   ├── create-migration/  review-rls/  create-lesson/  create-exercise/  generate-hints/
│   ├── create-theory-quiz/  create-dataset/  create-validator/  review-sql-accuracy/
│   ├── add-gamification-rule/  create-certificate-requirement/  implement-entitlement/
│   └── review-accessibility/  review-security/  update-docs/  prepare-release/  deploy-preview/
├── rules/                       # 11 modular instruction files (5 always-on, 6 path-scoped)
│   ├── architecture.md  security.md  documentation.md            (always loaded)
│   ├── sql-execution.md  database.md  frontend.md  accessibility.md
│   ├── content-authoring.md  dataset-generation.md  testing.md  deployment.md   (path-scoped)
├── hooks/                       # Node scripts, no dependencies, cross-platform
│   ├── _lib.mjs  guard-bash.mjs  guard-write.mjs  post-write.mjs
└── templates/                   # 12 reusable templates
    ├── feature.md  adr.md  migration.sql  exercise.md  lesson.md  question.md  hints.md
    └── dataset.md  validator.md  security-review.md  accessibility-review.md  release-checklist.md
```

## Why each agent exists (and boundaries)

| Agent                 | Owns                                                   | Never touches                       |
| --------------------- | ------------------------------------------------------ | ----------------------------------- |
| architect             | ADRs, plans, `docs/`                                   | `src/`, `supabase/`                 |
| database-engineer     | `supabase/**`, generated types, DB docs                | app UI, sandbox                     |
| sql-sandbox-engineer  | `src/lib/sandbox`, `src/lib/validation`, sandbox tests | Supabase admin client               |
| frontend-engineer     | `src/app`, `src/components`, messages                  | business rules, migrations, sandbox |
| ux-designer           | screen specs, tokens, a11y reviews                     | component implementation            |
| curriculum-designer   | section outlines, lessons                              | individual exercises/questions      |
| content-author        | exercises, hints, questions                            | datasets, app code                  |
| dataset-engineer      | `src/datasets`, snapshots, manifest                    | application schema                  |
| security-engineer     | auth, env, headers, privacy flows, security reviews    | pricing/legal decisions             |
| payments-engineer     | `src/lib/payments`, webhooks, entitlements             | live credentials                    |
| gamification-engineer | rewards, streaks, badges, certificates logic           | client-side rewards                 |
| qa-engineer           | `tests/**`, quality gate                               | app code changes without notice     |
| devops-engineer       | CI, Vercel config, release mechanics                   | production deploys                  |
| docs-keeper           | docs drift, roadmap, decisions table                   | code                                |
| release-reviewer      | read-only review + go/no-go                            | any file                            |

Two agents never edit the same directory concurrently; `/implement-feature` sequences handoffs explicitly.

## Hooks (documented per requirement)

| Hook              | Event / matcher                           | What it does                                                                                                                                                                                                                                                                                                                                                                                                                                          | Blocks?           | Disable                   |
| ----------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | ------------------------- |
| `guard-bash.mjs`  | `PreToolUse` on `Bash\|PowerShell`        | Denies: production Vercel deploy/promote, `supabase db push`, remote `db reset`, project delete, force-push, `git reset --hard`/`clean -fd`/`branch -D`, recursive delete of root/parent paths, `drop database/schema`/`truncate`, Stripe `--live`, printing/reading env secrets. Asks: `supabase link`, local `db reset`, `git push`, publish/deploy. On `git commit`: scans staged additions for secret patterns and staged `.env*` files → denies. | deny/ask          | `CLAUDE_HOOKS_DISABLED=1` |
| `guard-write.mjs` | `PreToolUse` on `Edit\|Write\|MultiEdit`  | Denies writing secret-looking values anywhere; denies editing generated `src/types/database.ts`, `package-lock.json`, dataset snapshots; asks before editing `.env*` files, existing migrations, or `.claude/settings.json`/hooks.                                                                                                                                                                                                                    | deny/ask          | same                      |
| `post-write.mjs`  | `PostToolUse` on `Edit\|Write\|MultiEdit` | Formats with the project's Prettier if installed (never installs); warns when a migration creates a table without RLS, contains destructive statements, or a `security definer` without `search_path`; reminds to update docs when architectural files change.                                                                                                                                                                                        | no (context only) | same                      |

Not created on purpose: per-edit typecheck/lint hooks (too slow on a Next.js project; the quality gate and CI cover it), test-runner hooks (same), Stop-hooks (noise), any hook that uploads, deploys, installs, prints env or touches files outside the project. Hooks report pattern _names_ only, never the matched secret. Tested with 11 sample inputs on 2026-09-18 (see session log); re-run `node <scratch>/hooktest.mjs`-style harness after editing them.

## How to invoke and maintain

- Type `/skill-name args` (e.g. `/create-exercise group-by ventas-por-pais`). Skills marked `disable-model-invocation: true` (`implement-entitlement`, `prepare-release`, `deploy-preview`) run only when you invoke them.
- Agents are delegated automatically by description or explicitly ("use the database-engineer agent to…").
- Rules with `paths:` load only when matching files are read; keep them specific.
- Changes to agents/skills/hooks/rules: propose in the table below, get owner agreement, apply, note in `docs/DECISIONS.md` if material.

## Proposed changes (append-only; owner approves)

| Date       | Resource                                                   | Proposal                                                                                                                                                                                                                                                                                                                                                                       | Reason                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Status                                                                                                                                                                                       |
| ---------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-19 | `guard-bash.mjs`                                           | Add an `unless: /\bOWNER_APPROVED_DB_PUSH=1\b/` escape to the `db push` rule so the assistant can run it once the owner approved in the conversation, by prefixing the command with that marker (per invocation, never a global env).                                                                                                                                          | The owner approved (2026-09-19) that the assistant runs all commands itself; the assistant cannot edit hooks (auto-mode self-modification guard), so migrations were applied with the equivalent `supabase migration up --linked`.                                                                                                                                                                                                                                        | **Withdrawn 2026-09-23 — superseded by D-36**: applying migrations is permanently the owner's, and that decision names `guard-bash.mjs` as its mechanism, not an obstacle. Do not implement. |
| 2026-09-23 | `scripts/content-validate.ts`, `scripts/content-verify.ts` | Add a `--only-section <slug>` (and ideally `--changed`) flag so an author can validate or verify one section without loading the whole corpus, and make the loader report **all** failures for the selected scope instead of aborting on the first one.                                                                                                                        | Both scripts abort on any load issue anywhere in `src/content/**`. On 2026-09-23 one agent's in-flight lesson sat 16 words over the word cap, which made `content:validate` and `content:verify` red for **every** other agent working in parallel — and `content:build` refuses to run while validation is red, so the shared pipeline was blocked by an unrelated, half-finished file. With parallel authoring this is not an edge case; it is the normal failure mode. | Proposed — not implemented                                                                                                                                                                   |
| 2026-09-23 | `src/messages/es-419.json`                                 | Either split the catalog into per-namespace files merged at build time (`src/messages/es-419/*.json` → one catalog, drift-checked in CI like the content seed), or document a single-writer protocol in `.claude/rules/` and in every agent brief that touches copy. Recommendation: the split, with the merge validated so a duplicate key across namespaces fails the build. | One large file that every agent needs and no two can edit concurrently without clobbering. This session routed **17 batches of key merges through one writer** purely to avoid lost edits; that coordination cost is paid on every future session, and it is the kind of bookkeeping that silently drops a string when it fails.                                                                                                                                          | Proposed — not implemented                                                                                                                                                                   |
| 2026-09-23 | Agent briefs vs. agent tool grants                         | Before dispatching an agent, check that the brief only asks for tools its definition grants; and add a line to the agent-authoring notes that a brief must not instruct an agent to run a command when its definition has no Bash tool. Cheapest enforcement: list the granted tools in each agent's header and have the dispatcher quote them.                                | One agent was dispatched with instructions to run `npm run content:validate` while its own definition grants it no Bash tool. It behaved correctly — it refused to fabricate output and reported the blocker — but the round trip was wasted, and the failure mode if an agent were less careful is an invented validator result in a doc.                                                                                                                                | Proposed — not implemented                                                                                                                                                                   |
