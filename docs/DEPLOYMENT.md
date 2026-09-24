# Deployment and Environments

## 1. Environments

| Env        | App                       | Database                                     | Payments                             | Purpose            |
| ---------- | ------------------------- | -------------------------------------------- | ------------------------------------ | ------------------ |
| local      | `next dev`                | Supabase CLI (Docker) or a dev cloud project | sandbox                              | development, tests |
| preview    | Vercel preview per branch | Supabase **dev** project (Free)              | sandbox                              | review             |
| production | Vercel production         | Supabase **prod** project (Pro)              | production only after owner approval | learners           |

Note: Supabase Free pauses projects after 7 days without activity and Vercel Hobby is non-commercial; before launch, production moves to Supabase Pro and Vercel Pro (see cost model in [ARCHITECTURE.md](ARCHITECTURE.md#7-cost-model-owner-facing)).

## 2. One-time external setup (owner performs; the assistant provides exact steps when each phase arrives)

1. **GitHub**: repository `https://github.com/marcez223344-rgb/sqprmp` (remote `origin`); enable Dependabot and branch protection on `main` (CI required). Pushes use the owner's `gh auth login` session.
2. **Supabase**: project `sqprmp` (ref `pgkbmhuehmotjctzjwxx`, Free) is the launch database (D-16); a separate prod project only if/when Pro backups are needed. The CLI is logged in on the owner's PC (`npx supabase login`, interactive) and linked; migrations are applied forward-only with `npx supabase migration up --linked` (the hook blocks `db push`), seeds with `npx supabase db query --linked --file supabase/seed/000N_*.sql` (0002 is idempotent on slugs). Auth settings come from `supabase/config.toml` → `npx supabase config diff`, then `npx supabase config push`: custom access token hook `public.custom_access_token_hook`, Site URL / additional redirect URLs (`http://localhost:3000/auth/callback`, preview and production `/auth/callback`), email confirmations off (OAuth only), Google provider (client id/secret via `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` / `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET` in the shell that runs `config push`, or set in the dashboard). API keys: `npx supabase projects api-keys --project-ref <ref>` written straight into `.env.local` / Vercel env (never printed in chat).
3. **Google Cloud**: OAuth consent screen (external, app name Data Minds SQL Academy, support email, privacy/terms URLs), OAuth client (web) with Supabase callback `https://<project>.supabase.co/auth/v1/callback`.
4. **Vercel**: import the GitHub repo; set environment variables per environment (never paste secrets in chat; use the dashboard or `vercel env add`); assign domain.
5. **Hotmart** (D-05): product/offer checkout link, API credentials and Webhook 2.0 hottok → `HOTMART_CHECKOUT_URL`, `HOTMART_CLIENT_ID`, `HOTMART_CLIENT_SECRET`, `HOTMART_WEBHOOK_HOTTOK`, `HOTMART_ENV=sandbox` (runbook in [PAYMENTS.md §5b](PAYMENTS.md)). Fill the manual transfer details in `src/config/pricing.ts`. Mercado Pago Checkout Pro is Phase 6b.

## 3. Commands (Phase 1 onward)

```
npm run dev                # local app
npx supabase start         # local DB (Docker)
npx supabase db reset      # apply migrations + seed locally (local only; blocked against linked projects by hook)
npx supabase db push       # apply migrations to the linked remote project (requires explicit approval)
npm run quality            # full gate (includes db:validate on PGlite)
npm run db:validate        # apply migrations to in-memory PostgreSQL (PGlite), assert RLS (no Docker needed)
npm run db:backup          # dump the linked production database to your hard drive (section 7)
npx vercel --prod          # BLOCKED by hook unless owner approval recorded in the session
```

## 4. CI/CD (GitHub Actions)

`ci.yml`: quality gate job (format, lint, typecheck, unit, db:validate, content, datasets, build, audit) + `db-tests` job (Supabase CLI + pgTAP) + `e2e` job (Playwright Chromium). `nightly.yml`: `npm audit --audit-level=moderate` + a Supabase keep-alive that requests `/` and `/curriculo` on the production site. Supabase pauses a Free project after seven idle days and a paused project takes the site down, so something has to touch Postgres at least weekly; going through the public site does that and needs no credentials. Override the target with the repository variable `PRODUCTION_URL` if the domain changes. Until 2026-09-24 this job was gated on a repository variable `SUPABASE_KEEPALIVE` that had never been set — the repository has no Actions variables and no Actions secrets at all — so the keep-alive had never run once. Removing the gate is why it now needs no configuration. This job is deliberately independent of the weekly database backup; the reasoning is in 7.5b. Dependabot: weekly npm (grouped minor/patch), monthly actions. Dataset snapshots (`public/datasets/**`) are git-ignored and regenerated deterministically by the `prebuild` hook (`assets:pglite` + `datasets:build`, ~2 s), so Vercel builds always ship the exact snapshot recorded in `src/datasets/manifest.json`. Deployments are performed by Vercel's Git integration (preview on PR, production on merge to `main`), never by the assistant.

## 5. Release checklist

See `.claude/templates/release-checklist.md`. Highlights: migrations applied to prod and reviewed for destructive statements; env vars verified; Google OAuth redirect URLs include production domain; webhook URL registered and a sandbox event verified; certificates PDF renders on Vercel; privacy/terms pages live; monitoring (Vercel logs, Supabase advisors) checked.

## 5b. Production launch runbook (Phase 9)

Every step below is performed by the **owner** (or by the assistant only with explicit approval in the conversation, per CLAUDE.md). Order matters.

State as of 2026-09-23: steps 1–4 are partly done already — the site is live on `dataminds-sql-academy.vercel.app` against the existing linked Supabase project on the free tier, with the content seed applied. What is outstanding is in [OWNER_ACTIONS.md](OWNER_ACTIONS.md): the eight 2026-09-23 migrations (OA-19) and a deploy of the 2026-09-23 code (OA-24). Read this runbook as the checklist for a full production project, not as work still entirely ahead.

1. **Decisions closed**: D-09 (legal data in `src/config/brand.ts`, drafts reviewed), P-1 (domain), P-4 (Supabase Pro + Vercel Pro approved). Rotate any credential ever pasted in chat.
2. **Supabase production project**: create → link the CLI to the project ref → push the reviewed migrations in timestamp order (forward-only; 19 of them as of 2026-09-23, the last eight still unapplied — OA-19) → run seeds `0001–0003` once (`0002_content.sql` is idempotent on slugs) → enable the custom access token hook (`docs/SECURITY.md §3`) → Google provider with the production redirect URL → enable PITR/backups (Pro).
3. **Vercel project**: import the GitHub repo → Node 24 (`package.json` engines is `>=24`, and CI pins 24) → env vars from `.env.example` (server secrets only as _Sensitive_) → `NEXT_PUBLIC_APP_URL` = production URL → custom domain + HTTPS → Deployment Protection off for production only.
4. **Preview deploy first**: open a PR, confirm the preview builds (`prebuild` regenerates dataset snapshots and PGlite assets), run the smoke list: landing, `/demo` runs a query, Google login, onboarding, 1 free exercise submit, `/precios`, `/verificar/<known code>`, `/certificados/<id>/pdf`.
5. **Payments**: register the Hotmart **sandbox** webhook URL (`/api/webhooks/hotmart`) and replay a sandbox event; verify `/admin/pagos` shows it processed. Switch to production credentials **only** after a written go from the owner; keep `HOTMART_SKIP_REFETCH` unset.
6. **Go live** (merge to `main`). Immediately: create the first admin (`update public.profiles set role = 'admin' where id = '<owner uuid>'` in the SQL editor — note it in DECISIONS.md), open `/admin/metricas`, and verify a real Google sign-in.
7. **Announce** only after the post-launch checklist below is green for 24 h.

### Post-launch checklist (first week)

- [ ] Vercel: no 5xx in logs; function duration for `/ejercicio/*` submit < 3 s p95; PGlite worker cold start acceptable.
- [ ] Supabase: advisors clean (no missing indexes on hot paths, no permissive policies), DB CPU < 50 %, connection count stable.
- [ ] `/admin/pagos`: no unmatched events older than 24 h; manual transfers reviewed daily.
- [ ] Support inbox (`brand.supportEmail`) monitored; refund window (`brand.refundDays`) honored.
- [ ] Backups: first PITR restore drill executed on a scratch project.
- [ ] Analytics: `admin_metrics` signup → onboarding → first exercise funnel reviewed; fix the biggest drop-off first.
- [ ] Content: hardest exercises / frequent SQLSTATEs reviewed weekly; hints adjusted where reveal rate > 40 %.
- [ ] Dependencies: Dependabot PRs merged weekly after `npm run quality`.

## 5c. Owner runbook: admin, becas and metrics

The first admin has to be promoted by hand, once, after the owner signs in with the Google account they will use as admin:

```sql
-- Supabase → SQL editor (or: npx supabase db query --linked "...")
update public.profiles set role = 'admin' where id = (
  select id from auth.users where email = '<the owner's Google address>'
);
```

From then on, `/admin` is visible in the app header for that account only, with:

| Page                  | What it is for                                                                                                            |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `/admin/metricas`     | signups, onboarding completion, exercises submitted, conversion — `admin_metrics()` computed on request                   |
| `/admin/pagos`        | manual transfers waiting for approval; approve or reject with a reason (audited), and reconcile unmatched provider events |
| `/admin/accesos`      | grant full access to a learner by alias — this is how a **beca** is given one-off                                         |
| `/admin/promos`       | create promo codes, including `scholarship` codes that grant N days of access; deactivate them when the campaign ends     |
| `/admin/usuarios`     | find a learner by alias, email or id; see their progress                                                                  |
| `/admin/certificados` | issued certificates; revoke with a reason                                                                                 |
| `/admin/flags`        | feature flags                                                                                                             |
| `/admin/auditoria`    | every privileged action, who did it and why                                                                               |

Scholarships in practice: for a handful of people use `/admin/accesos` (immediate, one learner). For a campaign — "20 becas para egresados de X" — create a `scholarship` promo code in `/admin/promos` with a redemption cap and an expiry, share the code, and deactivate it when the cap is reached. Both paths write to `audit_logs`.

## 5d. Applying the content seed (lessons, questions, exercises)

Lesson and exercise text is served from the database, not from `src/content`, so a prose change
is invisible in production until the seed is applied. `content:build` regenerates
`supabase/seed/0002_content.sql` from `src/content`; applying it directly with
`npx supabase db query --linked --file supabase/seed/0002_content.sql` fails with **HTTP 413
"request entity too large"** — the seed is a single ~3.8 MB transaction and the query endpoint
caps the body size.

Use `npm run content:apply` instead. It splits the seed on blank-line statement boundaries (every
literal is dollar-quoted, so a literal is never cut), runs each chunk in its own transaction, and
stops on the first error. Every statement is `on conflict (slug) do update`, so the seed is
idempotent and an interrupted run is fixed by running it again.

Order matters and is preserved: course → sections → lessons → questions → exercises.

**There are two content seeds, and applying only the first silently breaks grading.**
`0002_content.sql` carries the authored content; `0003_expected_results.sql` carries
`exercise_expected_results`, written by `npm run content:verify`. `submitExercise`
(`src/lib/exercises/service.ts`) returns `not_found` when an exercise has no expected-result row, so
a newly published exercise **cannot be graded at all** until the second seed lands, and a rewritten
one keeps grading against its old baseline — marking correct answers wrong. This happened on
2026-09-23: `0002` was applied alone and seven new section-35 exercises went live ungradeable for a
few minutes. Three changes make the mistake hard to repeat:

- `npm run content:apply` now applies **both**, in order (`content:apply:content` then
  `content:apply:expected`, which remain available individually).
- `node scripts/apply-content-seed.mjs` with no path is now a hard error naming both files, instead
  of quietly defaulting to `0002`.
- `npm run content:apply:dry` dry-runs both. Do not reach for `npm run content:apply -- --dry-run`:
  npm does not forward `--` args through a composite script, so that form **applies for real**.

After any content change the full sequence is `npm run content:verify` (regenerates `0003`) →
`npm run content:build` (regenerates `0002`) → `npm run content:apply`.

## 5e. Runbook: "No pudimos verificar tu acceso ahora mismo"

Symptom: hints and submissions fail with that message, while lessons and exercise pages render
normally. Cause: the page reads access through the learner's own client, but `requestHint`,
`submitAnswer` and `revealSolution` call `can_access_exercise` through the **service-role** client.
If `SUPABASE_SECRET_KEY` is wrong, only the actions break, and they break for every learner at once.

Diagnose (never guess from the UI — a broken key and a real paywall look identical there):

```bash
curl -s -H "Authorization: Bearer $CRON_SECRET"   "https://dataminds-sql-academy.vercel.app/api/health/access?slug=<exercise-slug>"
```

- `{"ok":false,"step":"read_exercise","error":"Invalid API key"}` → the key is wrong. `keyShape`
  in the same response says whether the value even reached the build (`kind`, `length`, `build`).
- `{"ok":true,...,"access":{"value":"locked"}}` → genuinely a paywall, not an outage.

Fix — the key must come from the **dashboard**, not from the CLI:

1. Supabase dashboard → Project Settings → API Keys → secret key `default` → Reveal → Copy.
   `npx supabase projects api-keys` returns the secret **masked**; pasting that masked string is
   what produces "Invalid API key" (it is not ASCII and is not a usable key).
2. `npx vercel env rm SUPABASE_SECRET_KEY production` then
   `npx vercel env add SUPABASE_SECRET_KEY production` (paste at the prompt; never echo it).
3. Put the same value in `.env.local`.
4. Redeploy — env changes do not apply to existing deployments — then re-run the probe above.

If the key was ever pasted into a chat, a log or a commit, rotate it in the dashboard first.

## 6. Rollback

App: re-deploy the previous build from the Vercel dashboard. DB: migrations are forward-only; destructive changes require an expand/contract plan and a fresh `npm run db:backup` taken immediately before the migration (section 7). While the project is on the Supabase Free plan there is no platform-side backup to fall back on.

## 7. Backups and restore

### 7.1 What Supabase actually keeps for us today

Supabase's own documentation (<https://supabase.com/docs/guides/platform/backups>, checked 2026-09-24) is unambiguous: "We automatically back up all Pro, Team, and Enterprise Plan projects on a daily basis", and "We recommend that free tier plan projects regularly export their data using the Supabase CLI `db dump` command and maintain off-site backups."

Project `sqprmp` (`pgkbmhuehmotjctzjwxx`, region `us-west-2`) is on the Free plan. That means:

- **No daily backups.** The Database → Backups page has nothing to restore from.
- **No point-in-time recovery.** PITR is a paid add-on on Pro and above.
- **Deleting the project deletes everything, irreversibly**, including anything Supabase held internally.

So until 2026-09-24 the only copy of learner accounts, progress, rewards, purchases and certificates was the live database itself. The code was safe in GitHub; the data was not. `npm run db:backup` is the fix.

The nightly keep-alive (section 4) is not part of this. It stops the project pausing, which is an availability problem; it does nothing whatsoever for data loss. See 7.5b.

### 7.2 What is replaceable and what is not

| Data                                                                                                                                                                                                                                  | Rows (2026-09-24) | If it is lost                                                                                                        |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | -------------------------------------------------------------------------------------------------------------------- |
| Course content: `sections`, `lessons`, `exercises`, `exercise_hints`, `exercise_solutions`, `theory_questions`, `question_options`, `datasets`, `avatars`, `badges`                                                                   | ~4 400            | **Replaceable.** It is generated from `src/content/**` in git: `npm run content:build` then `npm run content:apply`. |
| Learner data: `auth.users`, `profiles`, `lesson_progress`, `exercise_progress`, `attempts`, `quiz_attempts`, `reward_ledger`, `user_totals`, `streaks`, `purchases`, `entitlements`, `certificates`, `analytics_events`, `audit_logs` | ~250              | **Irreplaceable.** Nothing in git can reconstruct it. This is the reason the backup exists.                          |

The irreplaceable part is small today and will grow with every signup. The backup covers both, because a restore that only had half of it would leave progress rows pointing at lessons that no longer exist.

### 7.3 Taking a backup

```
npm run db:backup
```

It dumps the **linked** project (read-only; it never writes to production) into `%USERPROFILE%\DataMindsBackups\<YYYY-MM-DD_HHMM>\`:

| File            | What it is                                                                                                  | Why it is needed                                                                                                                                                                      |
| --------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `roles.sql`     | cluster roles (`--role-only`)                                                                               | a restored database needs `anon`, `authenticated`, `service_role` and the app's custom roles to exist before the grants in `schema.sql` apply. pg_dump never includes role passwords. |
| `schema.sql`    | the `public` schema: 51 tables, 5 views, 58 functions, 18 triggers, 31 indexes, 342 grants, 70 RLS policies | this is what makes the data safe to expose. A data-only backup would restore the rows with no RLS at all.                                                                             |
| `data.sql`      | every row as `COPY` statements, including `auth.users` (the accounts) and storage metadata                  | the accounts are in the `auth` schema, not `public`; a `public`-only dump would restore progress belonging to users who no longer exist.                                              |
| `manifest.json` | sizes, SHA-256 per file, the git commit that was live                                                       | tells you which code the data belongs to.                                                                                                                                             |
| `LEEME.txt`     | plain-Spanish summary                                                                                       | so the folder is readable in two years without this document.                                                                                                                         |

The script fails loudly rather than writing a folder that looks fine and is not: each file must exceed a minimum size and contain a marker (`CREATE POLICY` in the schema, `COPY "auth"."users"` in the data). A run that prints `FAILED` or `SUSPECT` is not a restore point.

Retention is the newest 8 runs (`SQLACADEMY_BACKUP_KEEP`); the destination is `SQLACADEMY_BACKUP_DIR`. Keep it off OneDrive — the files contain learner emails and payment records, and the script warns if the path looks cloud-synced.

Deliberately **not** included: Supabase project settings (auth providers, redirect URLs, SMTP), Vercel environment variables, and Storage file contents. Storage is unused today (zero buckets, zero objects); the other two are section 7.6.

### 7.4 Restoring — tested procedure

This was executed on 2026-09-24 against the local Docker stack with the dump of that morning. Result: **77 of 77 tables and all 4 613 rows restored with an exact count match**, including all four `auth.users` accounts. Two caveats found by running it, both recorded below.

1. Create the target. Either a new Supabase project, or the local stack (`npx supabase start`).
2. Put the schema in place. Preferred: `npx supabase link --project-ref <new-ref>` then `npx supabase db push`, which applies `supabase/migrations/**` — this is the authoritative DDL and, unlike the dump, it also creates the `on_auth_user_created` trigger that lives on `auth.users` (see caveat A).
   If the repository is gone, use the dump instead: `psql "<conn>" -f roles.sql` then `psql "<conn>" -v ON_ERROR_STOP=1 -f schema.sql`, and re-create that one trigger by hand.
3. Empty the tables the migrations pre-fill, or the `COPY` will hit a duplicate key and abort the restore: `alias_blocklist`, `badges`, `certificate_requirements`. The dump supplies all three.
4. Load the data in one transaction, with foreign-key and trigger enforcement suspended so table order cannot matter:

   ```
   psql "<connection string>" -v ON_ERROR_STOP=1 --single-transaction \
     -c "set session_replication_role = replica;" -f data.sql
   ```

   `--single-transaction` matters: without it, one failing `COPY` leaves psql parsing the remaining data rows as SQL and you get hundreds of meaningless syntax errors on top of a half-loaded database.

5. Verify before trusting it: compare `select count(*)` per table against the `COPY` blocks in `data.sql`, and check that `auth.users` and `profiles` have the same number of rows.
6. Point the app at the restored project: update `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SECRET_KEY` in Vercel and `.env.local`, re-add the Google OAuth redirect URLs, and redeploy.

**Caveat A — the auth trigger.** `supabase db dump` only dumps the `public` schema DDL, on purpose: Supabase owns `auth` and `storage`. Our `on_auth_user_created` trigger on `auth.users` (which creates the `profiles` row on signup) therefore is **not** in `schema.sql`. Restoring from migrations (step 2, preferred path) creates it. Restoring from `schema.sql` alone does not, and the symptom is subtle: existing users work, new signups get no profile.

**Caveat B — platform version skew.** Restoring the production dump into the local stack failed on `storage.buckets` because production runs a newer storage schema with a `lifecycle_configuration` column the local image does not have. Restore into a Supabase project at the same version or newer. Storage is empty today, so skipping those `COPY` blocks costs nothing.

### 7.5 Running it weekly on Windows

GitHub Actions could run this on a schedule, but the artifact would live on GitHub — learner personal data in a place we do not control, and not on the hard drive that was asked for. Use Task Scheduler instead.

`scripts/db-backup.cmd` is the wrapper: it moves to the repository, runs the backup and appends everything to `%USERPROFILE%\DataMindsBackups\backup.log`.

Owner steps (needs your Windows password, so it cannot be created for you):

1. Open **Task Scheduler** → **Create Task** (not "Create Basic Task").
2. General: name `Backup Data Minds SQL Academy`. Select **Run whether user is logged on or not** and **Run with highest privileges**. It will ask for your Windows password when you save.
3. Triggers → New: **Weekly**, Sunday, 20:00, and tick **Run task as soon as possible after a scheduled start is missed** so a machine that was off still gets its backup.
4. Actions → New: Action **Start a program**.
   - Program/script: `cmd.exe`
   - Add arguments: `/c "C:\Users\marce\OneDrive\Documents\Claude\Projects\sqlpracticemp\scripts\db-backup.cmd"`
   - Start in: `C:\Users\marce\OneDrive\Documents\Claude\Projects\sqlpracticemp`
5. Conditions: untick **Start the task only if the computer is on AC power** if you want it to run on battery.
6. Save, then right-click the task → **Run** once, and confirm a new dated folder appeared and `backup.log` ends with `exit code 0`.

Restore the backup once a year into the local stack using 7.4. A backup nobody has restored is a guess.

**How often?** Choose the interval from how much learner data you are willing to lose, not from anything else. Weekly means that in the worst case six days of signups, progress, reward ledger entries, purchases and certificates are gone for good. At today's volume (four accounts) that is an easy trade; once signups arrive daily, move the trigger to **Daily** — the dump takes about a minute and each run is ~3.5 MB, so cost is not the constraint.

### 7.5b Why the backup and the keep-alive are two separate jobs

A weekly backup would also touch the database often enough to stop Supabase pausing the project at seven idle days, so it is tempting to run one six-day job and call it both. Do not merge them. They are separate on purpose:

- **They protect against different things.** The keep-alive protects visitors from a cold start (and the site from going down when a paused project has to be restored). It does nothing for data loss. The backup protects against data loss. It does nothing for cold starts. Neither is a substitute for the other.
- **A six-day cadence is chosen by Supabase's idle timer, not by what you can afford to lose.** That is the wrong input for a recovery point, and it drags the backup interval to whatever the platform's pause policy happens to be.
- **Merged, they fail together, and in the worst direction.** If the one job breaks, you lose the backups _and_ the project starts sleeping — the two symptoms mask each other, and you find out when you need the backup. Kept apart, the keep-alive runs nightly in GitHub Actions and the backup runs weekly on the laptop: different machine, different scheduler, independent failures.

If you ever want a belt-and-braces check, compare the newest folder date in `DataMindsBackups` against today, and look at the Nightly workflow's last green run in GitHub Actions. Two glances, two independent answers.

### 7.6 The other half: the environment

A database dump alone cannot bring the product back. These are not in the backup and must not be:

- `.env.local` and the Vercel environment variables (`SUPABASE_SECRET_KEY`, `SANDBOX_SIGNING_SECRET`, `CERTIFICATE_SIGNING_SECRET`, `CRON_SECRET`, the Hotmart credentials, the Google OAuth client secret). `CERTIFICATE_SIGNING_SECRET` deserves special care: lose it and every certificate already issued stops verifying.
- The Supabase project settings that live in the dashboard: Google as an auth provider, the redirect URLs, the SMTP sender.

Keep one copy of these in a **password manager** (1Password, Bitwarden, KeePass — an encrypted vault, not a file). Do **not** put them in the repository, in the `DataMindsBackups` folder, in a note, in a chat message, or in a plain-text file on the desktop: the backup folder is the one place an attacker who already has your laptop will look, and it would hand them the database along with the keys to it.

If a secret is ever exposed, rotate it in the provider dashboard and update Vercel and `.env.local` — see section 5e.

## 8. Page performance notes

Measured on 2026-09-24 against production, warm (three runs each, from Buenos Aires):

| Page         | TTFB        | Total     | Transferred                          |
| ------------ | ----------- | --------- | ------------------------------------ |
| `/`          | 0.39–0.66 s | 0.7–1.6 s | 32 KB (brotli)                       |
| `/curriculo` | 0.38–0.43 s | 0.7–2.3 s | 63 KB (brotli, 1.13 MB uncompressed) |
| `/precios`   | 0.38–0.45 s | 0.8–0.9 s | 30 KB (brotli)                       |

Steady state is healthy, so a one-off 75-second load was not the normal path. Three structural facts make a cold request much more expensive than a warm one, and they are worth knowing:

1. **Nothing is cached at the CDN.** Every response carries `Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate` and `X-Vercel-Cache: MISS`; `/curriculo` is re-rendered from the database for every visitor. That is a consequence of `src/proxy.ts` refreshing the Supabase session and setting a per-request CSP nonce on every matched path. Serving public pages from the CDN would require giving them a static CSP (the cached HTML's nonce would no longer match the fresh response header, and every script would be blocked). That is a security-visible change and has not been made — it is the main remaining lever if landing-page latency matters.
2. **The functions and the database are on opposite coasts.** Vercel serves from `iad1` (Virginia), the Supabase project lives in `us-west-2` (Oregon), so every query pays a cross-country round trip. Moving either is a migration, not a setting.
3. **The keep-alive had never run** (section 4). A Supabase Free project pauses after seven idle days; the first request afterwards pays a restore. Fixed 2026-09-24.

Fixed on 2026-09-24 in `src/lib/curriculum/queries.ts`:

- The catalogue query selected `*` from `lessons_public`, which includes `body_md_free`, the full markdown of every free lesson. `/`, `/curriculo` and `/ruta` each pulled ~183 KB from Postgres and rendered none of it. Selecting the ten columns the path actually uses brings that to ~109 KB.
- Sections and lessons are now read once per five minutes through `unstable_cache` with an anonymous, cookie-free client, instead of once per request. Publishing changes appear within five minutes, immediately after a deploy, or on demand via `revalidateCurriculum()`.
