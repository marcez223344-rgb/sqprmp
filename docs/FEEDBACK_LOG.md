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

| #   | Item                                                                                 | Status              | Where it landed                                                                                                                                                            |
| --- | ------------------------------------------------------------------------------------ | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | "Salir" shows the arrow cursor, not a hand                                           | Done                | Tailwind 4 dropped the default `cursor: pointer` on `<button>`; `src/components/ui/button.tsx` never re-added it. Fixed once in `buttonVariants`, so every button changes. |
| 2   | "Abrir la lección relacionada" does not open a new tab                               | Shipped, unverified | Already fixed in `external-lesson-link.tsx` (`target="_blank"`); he was seeing the pre-push build. Live since the 2026-09-23 push.                                         |
| 3   | Explanations too terse ("123 clientes…" should be "El resultado de la consulta da…") | Done                | Rule A in CONTENT_GUIDELINES; full sweep of `src/content/exercises/**`.                                                                                                    |
| 4   | Saved queries should be reachable from the exercise page                             | Done                | New panel in the workspace that lists his saved queries and loads one back into the editor.                                                                                |
| 5   | Success/verdict box sits at the very bottom, out of sight                            | Shipped, unverified | `SubmitStatus` was moved under the editor before he reported it again; he was seeing the pre-push build.                                                                   |
| 6   | "is_active verdadero" is confusing — the SQL literal is `true`                       | Done                | Rule D: never translate a SQL literal into Spanish prose. Swept across every exercise.                                                                                     |
| 7   | Scenarios too clipped; name the department and why they need the data                | Done                | Rule B in CONTENT_GUIDELINES.                                                                                                                                              |
| 8   | Same, for the "Bazar" loyalty-programme scenario                                     | Done                | Rule B.                                                                                                                                                                    |
| 9   | Task statements should say "Debes generar un dataset que devuelva…"                  | Done                | Rule C in CONTENT_GUIDELINES.                                                                                                                                              |
| 10  | Typing `<=` in the editor displays `≤`                                               | Done                | JetBrains Mono programming ligature. Disabled in the editor and in lesson code blocks.                                                                                     |
| 11  | "Primera quincena de marzo" solution looked wrong                                    | By design           | `created_at < '2025-03-16'` is correct for a `timestamptz`; `<= '2025-03-15'` would silently drop the 31 orders placed on the 15th after midnight. Explanation says so.    |
| 12  | "1 congelamiento disponible" is not natural Spanish                                  | Shipped, unverified | Reworded before he reported it again; he was seeing the pre-push build.                                                                                                    |
| 13  | "Definiciones de tablas" panel overlaps/clips its text                               | Done                | Schema panel layout, 360 → 1536.                                                                                                                                           |
| 14  | Sections are not visually divided (asked previously)                                 | Shipped, unverified | The `SectionHeader` primitive and the eight-category vocabulary shipped in `5b04912`; it did not exist on `origin/main` when he looked.                                    |
| 15  | Are all quizzes still 10 questions?                                                  | Done                | D-37: length is per section now (5 / 6 / 10), because at an 80 % pass mark a 6-question quiz judges at 83.3 %.                                                             |
| 16  | The quiz lets you skip a question                                                    | Shipped, unverified | Check-then-advance with a guard shipped in the same commit; the live build still had free navigation.                                                                      |
| 17  | The quiz never shows the percentage of correct answers                               | Done                | Percentage shown against the 80 % threshold.                                                                                                                               |
| 18  | "Ejercicios gratis usados: 4 de 5" next to "Ejercicios 6"                            | By design           | `limits.freeExerciseSections` makes sections 2 and 3 always free, so they do not consume the allowance — his own request from 2026-09-22. The copy now says so.            |
| 19  | The ranking he consented to is nowhere                                               | Done                | `/ranking` was built but `features.leaderboards` was `false` and its RPCs were not in production. Both fixed 2026-09-23. Below 5 opted-in learners the board says so.      |
| 20  | Every badge has the same icon                                                        | Shipped, unverified | Per-badge icons shipped in `18fa43a` / `5b04912` (`badge-styles.ts`, migration `20260923170000`); neither was live.                                                        |
| 21  | Certificates page shows 0 of 8 although exercises are done                           | Done                | It counted only fully completed sections. Partial progress per section added; eligibility still decided by the RPC.                                                        |
| 22  | Check that earlier feedback was actually acted on                                    | Done                | This file. Rounds 1 and 2 are reconstructed below from the decision and review records.                                                                                    |

## Earlier rounds

Reconstructed from `docs/DECISIONS.md`, `docs/reviews/**` and the commit history; rows are added
here as they are confirmed, rather than asserted from memory.

| Date       | Item                                                            | Status | Where it landed                                            |
| ---------- | --------------------------------------------------------------- | ------ | ---------------------------------------------------------- |
| 2026-09-22 | First two sections must be free, and marked free on the path    | Done   | `limits.freeExerciseSections`                              |
| 2026-09-23 | Consent question for a ranking that did not exist               | Done   | D-35: the board was built rather than the question deleted |
| 2026-09-23 | Rioplatense voseo in user-facing strings                        | Done   | `0e4ae50`                                                  |
| 2026-09-23 | Avatar picker jumped while choosing                             | Done   | `5b04912`                                                  |
| 2026-09-23 | SQL drafts were lost when leaving the exercise                  | Done   | `5b04912` (autosave + `localStorage`, swept on sign-out)   |
| 2026-09-23 | Nine wrong dataset figures in exercise copy                     | Done   | `2154c03`, with a gate so they cannot drift again          |
| 2026-09-23 | Write clearly: define terms, expand acronyms, spell identifiers | Done   | `docs/CONTENT_GUIDELINES.md` §9                            |

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
