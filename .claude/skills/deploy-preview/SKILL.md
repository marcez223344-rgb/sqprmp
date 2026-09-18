---
name: deploy-preview
description: Verify a preview deployment path — quality gate, push the branch (with confirmation) so Vercel builds a preview, and check the preview URL. Never targets production.
argument-hint: [branch]
disable-model-invocation: true
allowed-tools: Read Bash(git *) Bash(npm run *) Bash(gh *) Bash(npx vercel ls*) Bash(npx vercel inspect*)
---

## Purpose
Get a preview of branch `$ARGUMENTS` (default: current branch) through Vercel's Git integration.

## Procedure
1. Ensure the branch is not `main`; run `/quality-check`.
2. Ask for confirmation, then `git push -u origin <branch>` (the hook asks again by design).
3. Open/refresh the PR with `gh pr create`/`gh pr view` so CI runs; wait for the Vercel preview URL in the PR checks (`gh pr checks`).
4. Smoke check the preview: landing loads, login page renders, `/api/health` returns ok (once it exists). Report exact URLs and statuses.
5. Never run `vercel --prod`, `vercel promote`, or change environment variables.

## Output
Branch, PR link, preview URL, CI status, smoke results, anything the owner must verify manually.

## Failure / rollback
If CI or the preview build fails, report the log excerpt; fix on the branch; no production impact.
