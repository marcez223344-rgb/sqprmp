# Deployment and Environments

## 1. Environments

| Env        | App                       | Database                                     | Payments                             | Purpose            |
| ---------- | ------------------------- | -------------------------------------------- | ------------------------------------ | ------------------ |
| local      | `next dev`                | Supabase CLI (Docker) or a dev cloud project | sandbox                              | development, tests |
| preview    | Vercel preview per branch | Supabase **dev** project (Free)              | sandbox                              | review             |
| production | Vercel production         | Supabase **prod** project (Pro)              | production only after owner approval | learners           |

Note: Supabase Free pauses projects after 7 days without activity and Vercel Hobby is non-commercial; before launch, production moves to Supabase Pro and Vercel Pro (see cost model in [ARCHITECTURE.md](ARCHITECTURE.md#7-cost-model-owner-facing)).

## 2. One-time external setup (owner performs; the assistant provides exact steps when each phase arrives)

1. **GitHub**: create repository `data-minds-sql-academy` (private), enable Dependabot and branch protection on `main` (CI required).
2. **Supabase**: create `dmsa-dev` (Free) and later `dmsa-prod` (Pro). Apply migrations by linking the project (`npx supabase link --project-ref <ref>`) and pushing (owner runs the push command; the assistant's hook blocks it). Enable the Google provider (client id/secret from Google Cloud). Auth → URL Configuration: Site URL = app URL; Redirect URLs = `http://localhost:3000/auth/callback`, preview and production `/auth/callback`. Auth → Hooks: enable _Custom Access Token_ → `public.custom_access_token_hook`. Copy the publishable and secret keys into `.env.local` / Vercel.
3. **Google Cloud**: OAuth consent screen (external, app name Data Minds SQL Academy, support email, privacy/terms URLs), OAuth client (web) with Supabase callback `https://<project>.supabase.co/auth/v1/callback`.
4. **Vercel**: import the GitHub repo; set environment variables per environment (never paste secrets in chat; use the dashboard or `vercel env add`); assign domain.
5. **Mercado Pago**: developer application, sandbox test users (seller/buyer), webhook URL `https://<domain>/api/webhooks/mercadopago`, copy the webhook secret. Production credentials only after D-05 approval.

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

`ci.yml`: quality gate job (format, lint, typecheck, unit, db:validate, content, datasets, build, audit) + `db-tests` job (Supabase CLI + pgTAP) + `e2e` job (Playwright Chromium). `nightly.yml`: `npm audit --audit-level=moderate` + optional Supabase keep-alive (enable with repository variable `SUPABASE_KEEPALIVE=true` and secrets `SUPABASE_DEV_URL`, `SUPABASE_DEV_PUBLISHABLE_KEY`). Dependabot: weekly npm (grouped minor/patch), monthly actions. Deployments are performed by Vercel's Git integration (preview on PR, production on merge to `main`), never by the assistant.

## 5. Release checklist

See `.claude/templates/release-checklist.md`. Highlights: migrations applied to prod and reviewed for destructive statements; env vars verified; Google OAuth redirect URLs include production domain; webhook URL registered and a sandbox event verified; certificates PDF renders on Vercel; privacy/terms pages live; monitoring (Vercel logs, Supabase advisors) checked.

## 6. Rollback

App: promote previous Vercel deployment. DB: migrations are forward-only; destructive changes require an expand/contract plan and a backup (Supabase Pro daily backups).
