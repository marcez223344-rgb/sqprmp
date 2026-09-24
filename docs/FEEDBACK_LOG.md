# Owner feedback log

Every item Marcelo has raised about the product, and what happened to it. One row per item, never
deleted, never silently reworded.

**Why this file exists.** On 2026-09-23 he sent 22 items and asked, three separate times, "are you
paying attention to my feedback?". He was right to: eight of those items were already fixed in the
repository and invisible to him, because the work sat in seven unpushed commits while he tested the
live site. Feedback was being acted on and never closed out where he could see it. A fix that he
cannot observe is indistinguishable from no fix at all, so from now on an item is not **Done** until
it is on `origin/main` **and** the production database has whatever it depends on.

Status vocabulary: **Done** (shipped and observable on the live site) · **Shipped, unverified**
(deployed, not yet confirmed by him) · **In progress** · **Won't do** (with the reason) ·
**By design** (his observation was accurate, the behaviour is intended — the row says why, and
whether the wording changed so it stops reading as a bug).

Related: [OWNER_ACTIONS.md](OWNER_ACTIONS.md) is what is waiting on _him_; this file is what is
waiting on _the product_.

---

## 2026-09-23 · Round 3 (22 items)

| #   | Item                                                                                 | Status                                                                                                                                                                                                                                                                                                                                                      | Where it landed                                                                                                                                                            |
| --- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | "Salir" shows the arrow cursor, not a hand                                           | Done                                                                                                                                                                                                                                                                                                                                                        | Tailwind 4 dropped the default `cursor: pointer` on `<button>`; `src/components/ui/button.tsx` never re-added it. Fixed once in `buttonVariants`, so every button changes. |
| 2   | "Abrir la lección relacionada" does not open a new tab                               | Shipped, unverified                                                                                                                                                                                                                                                                                                                                         | Already fixed in `external-lesson-link.tsx` (`target="_blank"`); he was seeing the pre-push build. Live since the 2026-09-23 push.                                         |
| 3   | Explanations too terse ("123 clientes…" should be "El resultado de la consulta da…") | Done                                                                                                                                                                                                                                                                                                                                                        | Rule A in CONTENT_GUIDELINES; full sweep of `src/content/exercises/**`.                                                                                                    |
| 4   | Saved queries should be reachable from the exercise page                             | Done                                                                                                                                                                                                                                                                                                                                                        | New panel in the workspace that lists his saved queries and loads one back into the editor.                                                                                |
| 5   | Success/verdict box sits at the very bottom, out of sight                            | Shipped, unverified                                                                                                                                                                                                                                                                                                                                         | `SubmitStatus` was moved under the editor before he reported it again; he was seeing the pre-push build.                                                                   |
| 6   | "is_active verdadero" is confusing — the SQL literal is `true`                       | Done                                                                                                                                                                                                                                                                                                                                                        | Rule D: never translate a SQL literal into Spanish prose. Swept across every exercise.                                                                                     |
| 7   | Scenarios too clipped; name the department and why they need the data                | Done                                                                                                                                                                                                                                                                                                                                                        | Rule B in CONTENT_GUIDELINES.                                                                                                                                              |
| 8   | Same, for the "Bazar" loyalty-programme scenario                                     | Done                                                                                                                                                                                                                                                                                                                                                        | Rule B.                                                                                                                                                                    |
| 9   | Task statements should say "Debes generar un dataset que devuelva…"                  | Done                                                                                                                                                                                                                                                                                                                                                        | Rule C in CONTENT_GUIDELINES.                                                                                                                                              |
| 10  | Typing `<=` in the editor displays `≤`                                               | Done                                                                                                                                                                                                                                                                                                                                                        | JetBrains Mono programming ligature. Disabled in the editor and in lesson code blocks.                                                                                     |
| 11  | "Primera quincena de marzo" solution looked wrong                                    | By design                                                                                                                                                                                                                                                                                                                                                   | `created_at < '2025-03-16'` is correct for a `timestamptz`; `<= '2025-03-15'` would silently drop the 31 orders placed on the 15th after midnight. Explanation says so.    |
| 12  | "1 congelamiento disponible" is not natural Spanish                                  | Shipped, unverified                                                                                                                                                                                                                                                                                                                                         | Reworded before he reported it again; he was seeing the pre-push build.                                                                                                    |
| 13  | "Definiciones de tablas" panel overlaps/clips its text                               | Done                                                                                                                                                                                                                                                                                                                                                        | Schema panel layout, 360 → 1536.                                                                                                                                           |
| 14  | Sections are not visually divided (asked previously)                                 | Shipped, unverified                                                                                                                                                                                                                                                                                                                                         | The `SectionHeader` primitive and the eight-category vocabulary shipped in `5b04912`; it did not exist on `origin/main` when he looked.                                    |
| 15  | Are all quizzes still 10 questions?                                                  | Done                                                                                                                                                                                                                                                                                                                                                        | D-37: length is per section now (5 / 6 / 10), because at an 80 % pass mark a 6-question quiz judges at 83.3 %.                                                             |
| 16  | The quiz lets you skip a question                                                    | Shipped, unverified                                                                                                                                                                                                                                                                                                                                         | Check-then-advance with a guard shipped in the same commit; the live build still had free navigation.                                                                      |
| 17  | The quiz never shows the percentage of correct answers                               | Done                                                                                                                                                                                                                                                                                                                                                        | Percentage shown against the 80 % threshold.                                                                                                                               |
| 18  | "Ejercicios gratis usados: 4 de 5" next to "Ejercicios 6"                            | By design                                                                                                                                                                                                                                                                                                                                                   | `limits.freeExerciseSections` makes sections 2 and 3 always free, so they do not consume the allowance — his own request from 2026-09-22. The copy now says so.            |
| 19  | The ranking he consented to is nowhere                                               | Done                                                                                                                                                                                                                                                                                                                                                        | `/ranking` was built but `features.leaderboards` was `false` and its RPCs were not in production. Both fixed 2026-09-23. Below 5 opted-in learners the board says so.      |
| 20  | Every badge has the same icon                                                        | Shipped, unverified                                                                                                                                                                                                                                                                                                                                         | Per-badge icons shipped in `18fa43a` / `5b04912` (`badge-styles.ts`, migration `20260923170000`); neither was live.                                                        |
| 21  | «Próximos pasos» closing block per section                                           | Shipped, unverified — 38 blocks (sections 1–38) at the end of each section's last theory lesson, with an «Antes de seguir» line because exercises and quiz come after that lesson; all 37 practice queries run on the snapshots (4 corrected); counted against its own 110-word cap (CONTENT_GUIDELINES); published with `content:apply` on his explicit OK |
| 22  | Check that earlier feedback was actually acted on                                    | Done                                                                                                                                                                                                                                                                                                                                                        | This file. Rounds 1 and 2 are reconstructed below from the decision and review records.                                                                                    |

## 2026-09-24 · Round 4 (29 items, fresh-account test run)

Statuses updated as work lands. "In flight" = an agent is on it in the session it was raised.

| #   | Item                                                                       | Status                                                    |
| --- | -------------------------------------------------------------------------- | --------------------------------------------------------- |
| 1   | Export the admin users table to CSV                                        | Queued                                                    |
| 2   | Landing says "América Latina"; Spanish speakers in Spain are customers too | Owner decision — positioning                              |
| 3   | The Data Minds Solutions website is not linked anywhere                    | Owner input — needs the URL                               |
| 4   | `/curriculo` took 75 seconds to load                                       | In flight — measuring, not guessing                       |
| 5   | Can Docker and WSL be closed now?                                          | Answered — yes, see below                                 |
| 6   | Auth screen says "Sign in to pgkbmhuehmotjctzjwxx.supabase.co"             | Answered — needs a paid custom domain                     |
| 7   | Onboarding pre-fills the real name from Google                             | In flight                                                 |
| 8   | Spain looks missing from the country list                                  | In flight — it is last, not absent; making it findable    |
| 9   | The ranking opt-in never appears during onboarding                         | In flight                                                 |
| 10  | "Continuar aprendiendo" on a brand-new account should say "Empezar"        | In flight                                                 |
| 11  | No way to reach "Ruta" from the first screen                               | In flight — same root cause as 12 and 14                  |
| 12  | A fresh account sees no top navigation at all                              | In flight — bug                                           |
| 13  | Long theory lessons are a wall of text (**third time asked**)              | In flight — full readability pass                         |
| 14  | Navigation appeared only after the first exercise                          | In flight — same as 12                                    |
| 15  | The submit progress bar does not move                                      | In flight                                                 |
| 16  | The admin user list is too short                                           | Queued                                                    |
| 17  | Add the alias to the audit page                                            | Queued                                                    |
| 18  | "Días de acceso" and "Vence el" duplicate each other                       | Queued                                                    |
| 19  | Scholarship/discount codes should be auto-generated                        | Queued                                                    |
| 20  | "Ctrl/⌘" renders an unclear glyph                                          | In flight                                                 |
| 21  | Approving a manual payment needs an alias picker, not free typing          | Queued                                                    |
| 22  | Metrics say "otorgado" not "pagado" after a manual payment                 | Queued                                                    |
| 23  | No email or in-app message when access is granted                          | Queued                                                    |
| 24  | Granted access still shows padlocks, yet the exercise opens                | Queued — **bug**                                          |
| 25  | "Siguiente" opens a new browser tab every time                             | In flight — my error, being split from the reference link |
| 26  | "Racha" does not say it counts days                                        | In flight                                                 |
| 27  | "Minutos esta semana" undercounts real practice time                       | Queued                                                    |
| 28  | Completada / sin empezar / en curso are hard to tell apart at a glance     | Queued                                                    |
| 29  | Are there database backups? Wants a weekly local dump                      | In flight — **the most important item in this round**     |

## 2026-09-24 · Round 5 (Codecademy benchmark)

He shared screenshots of Codecademy (path, dashboard, profile, account, lessons, course pages) and
asked what we could borrow cheaply. Three reviews (ux-designer, frontend-engineer,
curriculum-designer) produced 22 candidate changes rated by effort, value and risk. He approved the
nine rated **high or medium value and low risk**, with two conditions: nothing database-related and
nothing broken. The other 13 and the "do not copy" list stay proposals, not commitments.

| #   | Item                                                                   | Status                                                                                                                                                   |
| --- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2   | «Continuar» button and «Repasar» link at the top of /ruta              | Shipped, unverified                                                                                                                                      |
| 3   | One progress bar for the whole course on /ruta                         | Shipped, unverified                                                                                                                                      |
| 4   | Facts line on /ruta (sections, lessons, exercises, certificates, time) | Shipped, unverified                                                                                                                                      |
| 5   | Section progress strip on the dashboard's «Continuar» card             | Shipped, unverified                                                                                                                                      |
| 6   | «Lección N de M» on every lesson                                       | Shipped, unverified                                                                                                                                      |
| 8   | Estimated time and prerequisite on each section card                   | Shipped, unverified                                                                                                                                      |
| 9   | «Agregar a mi perfil de LinkedIn» on /certificados                     | Shipped, unverified — learner's own page only, not /verificar (employers read that page)                                                                 |
| 14  | /perfil shows issued certificates and progress per level               | Shipped, unverified                                                                                                                                      |
| 21  | «Próximos pasos» closing block per section                             | Waiting on him — 38 drafted texts to review; publishing needs `content:apply`, which writes to the production database, so it also needs his explicit OK |

Follow-ups he raised after seeing it live:

| #   | Item                                                             | Status                                                                                                    |
| --- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| F1  | The whole course shows a %, each section should too              | Shipped, unverified — each section card's line now reads «3 de 8 lecciones · 38 %», same count as its bar |
| F2  | Questions for him must come through the question tool, not prose | Done — standing rule in the assistant's memory                                                            |

## Earlier rounds

Reconstructed from `docs/DECISIONS.md`, `docs/reviews/**` and the commit history; rows are added
here as they are confirmed, rather than asserted from memory.

| Round     | Item                                                                | Status         | Where it landed                                                                             |
| --------- | ------------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------- |
| 1 (09-22) | The first sections must be free, and marked as free on the path     | Done           | `limits.freeExerciseSections`; sections 2 and 3 never consume the 5-exercise allowance      |
| 2 (09-23) | Explain things for someone meeting the idea for the first time      | Done           | D-23 + CONTENT_GUIDELINES §9; full rewrite of the lesson prose                              |
| 2 (09-23) | The path should recommend an order, not lock me out of sections     | Done           | D-24                                                                                        |
| 2 (09-23) | The login screen should not advertise the free limit                | Done           | D-25                                                                                        |
| 2 (09-23) | Too few avatars, and reshuffling them moved everyone's choice       | Done           | D-26: 116 avatars, appended so existing picks never move                                    |
| 2 (09-23) | Revealing the solution with no hints spent should warn first        | Done           | D-27                                                                                        |
| 2 (09-23) | The 10-day refund clause                                            | Reviewed, kept | D-28: kept as written after review                                                          |
| 2 (09-23) | State the free offer in full, do not undersell it                   | Done           | D-29                                                                                        |
| 2 (09-23) | Certificates should name the instructor and the company             | Done           | D-30                                                                                        |
| 2 (09-23) | Do not show a payment channel that cannot actually be paid          | Done           | D-32: transfer-only at launch                                                               |
| 2 (09-23) | Rioplatense voseo in user-facing strings                            | Done           | `0e4ae50`                                                                                   |
| 2 (09-23) | The avatar picker jumped while choosing                             | Done           | `5b04912`                                                                                   |
| 2 (09-23) | SQL drafts were lost when leaving an exercise                       | Done           | `5b04912`: autosave, swept on sign-out                                                      |
| 2 (09-23) | A consent question for a ranking that did not exist                 | Done           | D-35: the board was built rather than the question deleted                                  |
| 2 (09-23) | Quiz gave no feedback until the very end                            | Done           | D-34: per-question feedback, graded on the server                                           |
| 2 (09-23) | Nine wrong dataset figures in exercise copy                         | Done           | `2154c03`, and now gated by `content:figures`                                               |
| 2 (09-23) | Write clearly: define terms, expand acronyms, spell out identifiers | Done           | CONTENT_GUIDELINES §9                                                                       |
| 2 (09-23) | Stop asking permission for the project's own tooling                | Done           | D-36                                                                                        |
| 2 (09-23) | Sections are not clearly divided visually                           | Done           | `SectionHeader`; shipped 09-23, only visible to you after the 09-23 push                    |
| 3 (09-24) | Stop asking me non-critical questions                               | Done           | You removed the `git push` prompt; recorded so I decide reversible things myself            |
| 3 (09-24) | «¿Canjes máximos no debería ser siempre 1? ¿no es peligroso?»       | Done           | PAYMENTS §5d: cap of 1 by default and required; unlimited needs a tick and is audited apart |

## Found while fixing the above, not reported by him

- **`funciones-numericas.ts` / `detalle-de-cuotas-aprobadas`: prompt and SQL disagreed.** The prompt
  asked for payments with "más de una cuota" while `reference_solution` filtered `installments >= 12`,
  and the explanation quoted 3535 rows — the count for `> 1`, not the 673 the exercise actually
  returns. Anyone following the prompt would have failed. The prose was aligned to the SQL (the
  scenario now motivates long instalment plans, which is what `>= 12` means and what the stated
  learning objective — integer division — needs). No SQL was changed. Say so if you meant `> 1`.
- **Three wrong figures in `funciones-de-texto.ts`**: two exercises claimed "3000 filas" where the
  `country = 'UY'` filter gives 123, and one claimed "8646 filas" where the real answer is 184.
  Two hint skeletons in the same file were also missing the `WHERE` line their solution requires.
- Exercise figures were **not** covered by `npm run content:claims` — only lesson prose was. That is
  why these survived. A gate over exercise row counts is being added.
