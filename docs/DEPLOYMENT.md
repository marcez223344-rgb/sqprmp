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
npm run db:validate        # apply migrations to in-memory Postgres 17, assert RLS (no Docker needed)
npx vercel --prod          # BLOCKED by hook unless owner approval recorded in the session
```

## 4. CI/CD (GitHub Actions)

`ci.yml`: quality gate job (format, lint, typecheck, unit, db:validate, content, datasets, build, audit) + `db-tests` job (Supabase CLI + pgTAP) + `e2e` job (Playwright Chromium). `nightly.yml`: `npm audit --audit-level=moderate` + optional Supabase keep-alive (enable with repository variable `SUPABASE_KEEPALIVE=true` and secrets `SUPABASE_DEV_URL`, `SUPABASE_DEV_PUBLISHABLE_KEY`). Dependabot: weekly npm (grouped minor/patch), monthly actions. Dataset snapshots (`public/datasets/**`) are git-ignored and regenerated deterministically by the `prebuild` hook (`assets:pglite` + `datasets:build`, ~2 s), so Vercel builds always ship the exact snapshot recorded in `src/datasets/manifest.json`. Deployments are performed by Vercel's Git integration (preview on PR, production on merge to `main`), never by the assistant.

## 5. Release checklist

See `.claude/templates/release-checklist.md`. Highlights: migrations applied to prod and reviewed for destructive statements; env vars verified; Google OAuth redirect URLs include production domain; webhook URL registered and a sandbox event verified; certificates PDF renders on Vercel; privacy/terms pages live; monitoring (Vercel logs, Supabase advisors) checked.

## 5b. Production launch runbook (Phase 9)

Every step below is performed by the **owner** (or by the assistant only with explicit approval in the conversation, per CLAUDE.md). Order matters.

1. **Decisions closed**: D-09 (legal data in `src/config/brand.ts`, drafts reviewed), P-1 (domain), P-4 (Supabase Pro + Vercel Pro approved). Rotate any credential ever pasted in chat.
2. **Supabase production project**: create → link the CLI to the project ref → push the reviewed migrations 0001–0008 (forward-only) → run seeds `0001–0003` once (`0002_content.sql` is idempotent on slugs) → enable the custom access token hook (`docs/SECURITY.md §3`) → Google provider with the production redirect URL → enable PITR/backups (Pro).
3. **Vercel project**: import the GitHub repo → Node 22 → env vars from `.env.example` (server secrets only as _Sensitive_) → `NEXT_PUBLIC_APP_URL` = production URL → custom domain + HTTPS → Deployment Protection off for production only.
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

## 6. Rollback

App: promote previous Vercel deployment. DB: migrations are forward-only; destructive changes require an expand/contract plan and a backup (Supabase Pro daily backups).
