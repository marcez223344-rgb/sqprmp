# Owner actions

The single list of everything waiting on Marcelo. If something needs his hands, his account, his
money or his signature, it belongs here — not only in a phase note or a code comment.

**Why this file exists.** Until 2026-09-23 there was no such list. Decisions lived in
[DECISIONS.md](DECISIONS.md) "Pending owner decisions", but _tasks_ did not: "fill in the CBU"
sat as a `PENDIENTE-DE-CONFIGURAR` string in `src/config/pricing.ts`, "promote the first admin"
sat in a DEPLOYMENT runbook, "Hotmart sandbox credentials" sat in a ROADMAP phase note. Each was
recorded somewhere and none of them were anywhere the owner would look. He had to remember them
himself, and correctly pointed out that this is not his job. A pending decision is a question;
a pending action is a task; both are now tracked, and the assistant reviews this file at the
start of a working session and surfaces anything blocking.

Status: **BLOCKING** = launch cannot happen · **OPEN** = needed before the named milestone ·
**DONE** / **DECLINED** = kept for the record, do not re-raise.

## Blocking launch

| #     | Action                                                                                                                                                                                               | Why it blocks                                                                                                                                | Status                                                                                  |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| OA-01 | **Sign in to the site once with `marcelopisner@gmail.com`.** Verified 2026-09-23: `auth.users` holds 2 accounts and none is the owner's, so no profile exists to promote.                            | There is **no admin account**. `/admin` — metrics, payment approvals, becas, promo codes, certificate revocation — is unreachable by anyone. | DONE — signed in 2026-09-23 (alias `marpi`)                                             |
| OA-02 | Then tell the assistant, who runs the one-time promotion (`update public.profiles set role = 'admin' …`, DEPLOYMENT §5c). Takes seconds; cannot be done before OA-01.                                | Same as above.                                                                                                                               | DONE — promoted to admin 2026-09-23, verified                                           |
| OA-03 | **Transfer details** for `src/config/pricing.ts` → `manualTransferInstructions`: bank alias + CBU, Mercado Pago alias, Wallbit TAG.                                                                  | All three currently render the literal text `PENDIENTE-DE-CONFIGURAR` **to learners** on `/precios`. Manual transfer is the day-one channel. | DONE — all three channels supplied 2026-09-23 (Galicia, Mercado Pago, Wallbit) and live |
| OA-04 | **Hotmart**: confirm payout eligibility, then provide sandbox credentials so the webhook runbook can be exercised end to end.                                                                        | The card channel cannot be tested, let alone sold through.                                                                                   | CLOSED — owner chose transfer-only at launch (D-32)                                     |
| OA-05 | **D-09** — street address + CUIT for the legal pages, and a lawyer's look at the drafts. Owner decided 2026-09-22 not to publish them while nothing is charged; that expires the moment money moves. | Required before charging in Argentina (Ley 24.240 + AFIP e-commerce rules).                                                                  | DEFERRED — owner: revisit when a sale is imminent                                       |

## Open

| #     | Action                                                                                                                                                              | Needed by       | Status                                                         |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- | -------------------------------------------------------------- |
| OA-06 | **P-1** — domain name. Currently `dataminds-sql-academy.vercel.app`.                                                                                                | Phase 9         | DEFERRED — owner: decide after the first paying student (D-31) |
| OA-07 | **P-3** — support email for the Google OAuth consent screen (currently the owner's Gmail).                                                                          | Phase 2 cleanup | OPEN                                                           |
| OA-08 | **P-6** — certificate wording: founder shown as "Instructor", company as issuer?                                                                                    | Phase 7 polish  | DONE — instructor + issuer on the certificate (D-30)           |
| OA-09 | **D-29** — landing and pricing copy says "{free} ejercicios gratis", which understates the offer: two whole sections are free on top of the five gated exercises.   | Before launch   | DONE — free offer restated (D-29)                              |
| OA-10 | Add permission rules via `/permissions` or `.claude/settings.local.json`. The assistant is blocked from editing its own permissions, so only the owner can do this. | Any time        | OPEN                                                           |
| OA-11 | Skim the rewritten lesson prose (91 lessons, 2026-09-23). `tablas-filas-columnas-tipos.ts` is the reference the rest follow.                                        | Before launch   | OPEN                                                           |

## Settled

| #     | Item                                                                                                                                                                              | Status   |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| OA-12 | **D-17 launch price** — owner, 2026-09-23: keep **US$20**, set **ARS 29.900**, **no founder cohort, no counter, one price**. Applied to `src/config/pricing.ts` and the database. | DONE     |
| OA-13 | **D-28 refund clause** — owner, 2026-09-23: leave the terms exactly as written.                                                                                                   | DONE     |
| OA-14 | **P-4 free tiers** — owner, 2026-09-22: stay on Vercel Hobby while testing, upgrade later.                                                                                        | DONE     |
| OA-15 | **P-5 "tú" vs "usted"** — settled in practice: all 336 lessons are written in "tú".                                                                                               | DONE     |
| OA-16 | **Rotate `SUPABASE_SECRET_KEY`** after it was pasted into a chat transcript on 2026-09-23. Owner declined. Revisit if the project goes properly commercial.                       | DECLINED |
