# Deployment and Environments

## 1. Environments
| Env | App | Database | Payments | Purpose |
|---|---|---|---|---|
| local | `next dev` | Supabase CLI (Docker) or a dev cloud project | sandbox | development, tests |
| preview | Vercel preview per branch | Supabase **dev** project (Free) | sandbox | review |
| production | Vercel production | Supabase **prod** project (Pro) | production only after owner approval | learners |

Note: Supabase Free pauses projects after 7 days without activity and Vercel Hobby is non-commercial; before launch, production moves to Supabase Pro and Vercel Pro (see cost model in [ARCHITECTURE.md](ARCHITECTURE.md#7-cost-model-owner-facing)).

## 2. One-time external setup (owner performs; the assistant provides exact steps when each phase arrives)
1. **GitHub**: create repository `data-minds-sql-academy` (private), enable Dependabot and branch protection on `main` (CI required).
2. **Supabase**: create `dmsa-dev` (Free) and later `dmsa-prod` (Pro). Enable Google provider (client id/secret from Google Cloud), set Site URL and redirect URLs (`http://localhost:3000/auth/callback`, preview and production domains). Copy publishable and secret keys into env.
3. **Google Cloud**: OAuth consent screen (external, app name Data Minds SQL Academy, support email, privacy/terms URLs), OAuth client (web) with Supabase callback `https://<project>.supabase.co/auth/v1/callback`.
4. **Vercel**: import the GitHub repo; set environment variables per environment (never paste secrets in chat; use the dashboard or `vercel env add`); assign domain.
5. **Mercado Pago**: developer application, sandbox test users (seller/buyer), webhook URL `https://<domain>/api/webhooks/mercadopago`, copy the webhook secret. Production credentials only after D-05 approval.

## 3. Commands (Phase 1 onward)
```
npm run dev                # local app
npx supabase start         # local DB (Docker)
npx supabase db reset      # apply migrations + seed locally (local only; blocked against linked projects by hook)
npx supabase db push       # apply migrations to the linked remote project (requires explicit approval)
npm run quality            # full gate
npx vercel --prod          # BLOCKED by hook unless owner approval recorded in the session
```

## 4. CI/CD (GitHub Actions)
`ci.yml`: install → quality gate → Playwright smoke → upload reports. `nightly.yml`: full E2E + `npm audit` + Supabase keep-alive ping for the dev project. Deployments are performed by Vercel's Git integration (preview on PR, production on merge to `main`), never by the assistant.

## 5. Release checklist
See `.claude/templates/release-checklist.md`. Highlights: migrations applied to prod and reviewed for destructive statements; env vars verified; Google OAuth redirect URLs include production domain; webhook URL registered and a sandbox event verified; certificates PDF renders on Vercel; privacy/terms pages live; monitoring (Vercel logs, Supabase advisors) checked.

## 6. Rollback
App: promote previous Vercel deployment. DB: migrations are forward-only; destructive changes require an expand/contract plan and a backup (Supabase Pro daily backups).
