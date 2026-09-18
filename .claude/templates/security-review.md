# Security review — <date> — <scope>

**Reviewer:** security-engineer / release-reviewer · **Commit range:** <sha..sha> · **Verdict:** GO / NO-GO

## Commands run (verbatim results)
- `npm audit --audit-level=high` → …
- `npx supabase test db` → …
- secret scan → …

## Findings
| # | Severity | Area | Location | Problem | Failure scenario | Fix | Owner |
|---|---|---|---|---|---|---|---|
| 1 | Critical/High/Medium/Low | auth/sandbox/payments/rls/headers/privacy/deps | file:line | … | … | … | agent |

## Checklist
- [ ] Every mutating endpoint: Zod → authorize() → rate limit → audit
- [ ] Identity via getUser(); redirects allowlisted; errors sanitized
- [ ] No hints/solutions/expected results/is_correct in client payloads
- [ ] Sandbox pipeline intact; limits from config; denied list tested; no admin client import
- [ ] Webhooks: signature, timestamp, idempotency, re-fetch, transaction, sandbox keys
- [ ] RLS present on all new tables; matrix consistent; pgTAP green
- [ ] Secrets: none in code/docs/tests; .env ignored
- [ ] Privacy: new PII documented (purpose, retention); analytics props clean
- [ ] Headers/CSP unchanged or documented

## Pending decisions
D-xx …
