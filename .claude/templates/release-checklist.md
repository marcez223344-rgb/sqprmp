# Release checklist — <version> — <date>

**Scope:** <phases/features> · **Target:** preview / production · **Verdict:** GO / NO-GO

## Evidence (verbatim)

| Step                 | Command / source                       | Result |
| -------------------- | -------------------------------------- | ------ |
| Quality gate         | `npm run quality`                      |        |
| E2E                  | `npm run test:e2e`                     |        |
| RLS suite            | `npx supabase test db`                 |        |
| Security review      | docs/reviews/<date>-security.md        |        |
| Accessibility review | docs/reviews/<date>-accessibility-*.md |        |
| Dependency audit     | `npm audit --audit-level=high`         |        |
| Secret scan          | hook + grep                            |        |

## Database

- [ ] Migrations since last release listed: …
- [ ] No destructive statements (or expand/contract plan approved)
- [ ] Applied to target by owner (never `db push` from the assistant) — confirmation: …
- [ ] Backups enabled (Supabase Pro) for production

## Configuration (names only)

- [ ] `.env.example` ↔ env schema consistent
- [ ] Vercel env vars set for target: …
- [ ] Google OAuth redirect URLs include target domain
- [ ] Payment provider mode: sandbox / production (approval ref D-05: …)
- [ ] Webhook URL registered and a test event verified
- [ ] Domain / HTTPS / HSTS

## Product

- [ ] Legal pages (terms, privacy, refunds) reviewed (D-09)
- [ ] Content published set verified (`content:verify` on prod seed)
- [ ] Certificates render on the target runtime
- [ ] Monitoring: Vercel logs, Supabase advisors, error alerts
- [ ] Rollback plan: previous deployment id …

## Blockers

| #   | Blocker | Owner | Status |
| --- | ------- | ----- | ------ |

## Owner approvals recorded

…
