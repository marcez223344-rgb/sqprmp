---
paths:
  - ".github/**"
  - "vercel.json"
  - "next.config.ts"
  - "supabase/config.toml"
---

# Deployment and CI rules

Runbook: `docs/DEPLOYMENT.md`.

- Deployments happen through Vercel's Git integration. The assistant never runs `vercel --prod`, never changes production env vars, and never pushes migrations to a linked remote without explicit owner approval in the current conversation (the `guard-bash` hook blocks these by default).
- CI (`.github/workflows/ci.yml`) must run the full quality gate on every PR and on `main`; E2E smoke after build; artifacts uploaded on failure. Secrets used in CI are GitHub encrypted secrets, never echoed.
- Environment variables are documented in `.env.example` and `docs/DEPLOYMENT.md`; adding one requires updating both and `src/lib/env/*` validation.
- `next.config.ts` holds security headers; any relaxation (e.g. CSP for a new script host) is explained in a comment and in `docs/SECURITY.md`.
- Keep Vercel function runtime `nodejs` for sandbox, webhooks and PDF routes; do not switch these to Edge.
- Before any production release: `/prepare-release` checklist completed and saved under `docs/releases/`.
