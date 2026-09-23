# Content Guidelines

Authoritative rules for lessons, exercises, hints, solutions, questions and datasets. Machine checks live in `src/content/schemas/*` (Phase 3); this document explains the intent.

## 1. Voice and language

- Spanish, Latin American neutral (`es-419`). Use "tú" consistently. No voseo, no "vosotros", no Spain-only terms (ordenador → computadora, fichero → archivo, coger → tomar).
- Professional and warm; never childish or corporate-stiff. Second person, short sentences, concrete business framing.
- SQL keywords in English uppercase (`SELECT`, `GROUP BY`); explain the concept in Spanish; avoid untranslated jargon when a natural Spanish term exists (tabla, fila, columna, consulta, unión/join is acceptable as "join" because it is the SQL keyword).
- No stereotypes about countries; vary cities, names and businesses across AR, MX, CO, CL, PE, UY, EC, BO, PY, CR, PA, DO, GT, VE respectfully.
- Numbers and dates in the learner's locale in UI; in SQL examples use ISO dates.

## 1b. Where content lives

Content is code-reviewed data in `src/content/`: `course.ts`, `sections.ts` (39 outlines), `lessons/<section>.ts` (theory bodies as Markdown template strings), `questions/<section>.ts`, `exercises/<section>.ts` (Phase 4), `datasets/<slug>.ts` (schema specs). Everything is registered in `src/content/index.ts`, validated by `npm run content:validate` (`src/content/load.ts`: schemas, cross-references, acyclic prerequisites, published-section rules) and compiled to SQL by `npm run content:build`. Markdown (GFM) is rendered with `react-markdown`; raw HTML is disabled. A quiz lesson is derived automatically for every section that has published questions.

## 2. Theory lessons

- ≤ 900 words per lesson; one idea per lesson; every claim has a runnable example on an MVP dataset.
- Structure: por qué importa → concepto → ejemplo ejecutable → variantes → errores comunes → resumen de 3 líneas.
- Never state that only one SQL style is valid when equivalents exist; show alternatives when they matter (`JOIN ... USING` vs `ON`, `CASE` vs `FILTER`, CTE vs subquery).

## 2b. Numeric claims about the datasets

Lesson prose is full of figures taken from the data ("devuelve 13 156", "hay 120 filas con
segundos negativos", "el ticket promedio real es 431 786,43"). A learner who runs the query and
sees a different number stops trusting the course, so those figures are treated as testable
assertions, not as decoration.

- Every exact figure a lesson states about a dataset must be registered in
  `src/content/lesson-claims.ts`: the lesson slug, the dataset, the sentence verbatim and a
  one-row query whose columns are, in order, the numbers in that sentence.
- `npm run content:claims` (part of `npm run quality`) runs each query against the committed
  snapshot and fails when the prose and the data disagree, or when the sentence no longer exists.
  Changing a figure therefore means changing the claim too — that is the point.
- Keep out of the registry, and out of the prose where possible, anything the data cannot decide:
  planner estimates copied from `EXPLAIN`, execution times, and figures whose defining query is
  ambiguous. Where a rounded figure is unavoidable, make the rounding explicit in the sentence
  ("alrededor de", "el 11 %") so nobody reads it as exact.
- Write the query so it is reproducible: fixed UTC, half-open date ranges and the filters the
  sentence itself names. If the sentence cannot name them, rewrite the sentence.

## 3. Exercises

- Scenario reads like a real request from a colleague (marketing, finance, operations, product) with a clear business question and expected output columns.
- One exercise = one primary skill (+ at most two supporting ones). Difficulty must match section level.
- Expected output columns are explicit in the statement (names in `snake_case`, Spanish or English consistently per dataset — datasets use English column names as in most LATAM companies; explanations in Spanish).
- Validation rules must be explicit: ordering only when the business question asks for an order; numeric tolerance for averages/percentages; `allow_extra_columns: false` by default.
- Reference solution runs against the dataset snapshot and is verified by the content build (`npm run content:verify`); alternative solutions must produce identical results.
- Include ≥ 3 common mistakes tied to the feedback engine categories (missing filter, wrong join, aggregation level, NULL handling, date boundary, duplicates, wrong columns, wrong order).
- Expert explanation: why the query works, alternatives, performance/readability note.
- Rewards follow [§6 Rewards](#6-rewards-defaults) defaults, which restate the values from [GAMIFICATION.md](GAMIFICATION.md); deviations need a reason.

## 4. Hints and solutions

- Hint 1: conceptual (which concept, no table names). Hint 2: specific (tables, columns, filter, grouping, sequence). Hint 3: skeleton with blanks.
- Hints never contain the full solution. Hint 3 must leave at least the key expression blank.
- Solution reveal text: query → step-by-step → why it works → alternatives → likely misconception → invitation to retry. No shaming language.
- Unlock defaults: 3 genuine attempts OR 2 hints OR 10 minutes OR explicit request after warning (config in `limits.ts`).

## 5. Theory questions

- Types: single, multiple, true/false, fill-blank, query interpretation, error diagnosis, matching, scenario.
- Each: topic, difficulty, prompt, options (2–6), correct answer, explanation, why each distractor is wrong, lesson link, tags, estimated seconds.
- Distractors reflect real misconceptions (e.g. `WHERE` vs `HAVING`, `COUNT(*)` vs `COUNT(col)`, NULL comparisons).
- Options are shuffled server-side; correct answers never leave the server before submission.

## 6. Rewards (defaults)

| Difficulty                                                                                                                                                                                                                                                                           | XP  | Coins |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --- | ----- |
| Muy fácil                                                                                                                                                                                                                                                                            | 10  | 2     |
| Fácil                                                                                                                                                                                                                                                                                | 20  | 4     |
| Intermedio                                                                                                                                                                                                                                                                           | 40  | 8     |
| Avanzado                                                                                                                                                                                                                                                                             | 70  | 14    |
| Experto                                                                                                                                                                                                                                                                              | 120 | 25    |
| Hint penalty: −10 % XP per hint (max −30 %); solution reveal: 25 % XP, 0 coins, exercise still counts as completed after a correct retry. Quiz: 5 XP per correct answer, +20 XP for ≥ 80 %. Daily cap: 600 XP. Repeating a completed exercise: 0 XP (personal best tracked instead). |

## 7. Datasets

- Synthetic only, deterministic (seeded PRNG, fixed seed per dataset version). Fictional companies, people, addresses, tax IDs, emails (`@ejemplo.lat` domain), phones (reserved-looking ranges).
- Document per dataset: business context, ERD, tables/columns/types, keys, business definitions, known data-quality issues (intentional, listed), generation rules, row volumes, reset procedure.
- Internal consistency checks run in `npm run datasets:verify`: order totals = sum(items) − discounts + shipping; refunds ≤ payments; timestamps chronological; status transitions valid; FKs resolve except documented exceptions; currency matches country.
- Realistic distributions: power-law sellers, weekly/seasonal patterns, weekend peaks for delivery, monthly salary cycles for wallet top-ups.

## 7b. Time zones

- The sandbox session runs at **UTC** everywhere — browser preview, the graded server engine and
  `npm run content:verify` (D-20, `docs/SQL_SANDBOX.md` → Session settings). Before that pin, PGlite
  inherited the host's zone and an exercise authored in Argentina could not be solved on Vercel;
  three shipped exercises were affected.
- Writing `AT TIME ZONE 'UTC'` explicitly is still the recommended style: it says in the SQL which
  zone a `timestamptz` is being reduced to, which is what the learner needs to read. It is no longer
  **load-bearing** — an exercise that omits it is now deterministic rather than host-dependent — so
  do not add it where it obscures the point being taught, and do not treat its absence as a defect.
- What is a defect: an exercise whose intended answer depends on a zone that is not UTC (business
  hours, "today", a local calendar month) without saying so in the statement. Name the zone in the
  SQL (`AT TIME ZONE 'America/Argentina/Buenos_Aires'`) and in the prompt; never rely on the session.
- Pinned-zone consequence for datasets: `timestamptz` values authored assuming an Argentine session
  read three hours earlier in wall-clock terms. Check any exercise that buckets by day or month
  near a boundary.

## 8. Review checklist (used by `review-sql-accuracy` skill)

- [ ] Runs on the sandbox engine (PGlite 0.5.8 = PostgreSQL 18.3) with the exact dataset version
- [ ] Business question unambiguous or ambiguity intentional and explained in solution
- [ ] Output columns and order rule explicit
- [ ] Alternatives verified equal
- [ ] Hints progressive, no leak
- [ ] Language rules respected
- [ ] Schema validation passes

## Identifiers stay in English, with a Spanish gloss

Tables and columns are named in English (`orders`, `customer_id`, `created_at`) because that is the convention in the jobs this course prepares for; teaching `pedidos.fecha_creacion` would make the product feel more Spanish and leave graduates less prepared. Everything around the identifier — scenario, business question, hints, explanations, column descriptions — is Spanish.

So that English is never the barrier, `src/config/sql-glossary.ts` maps identifiers to a short Spanish gloss, shown next to each table and column in the schema panel. It resolves an exact name first, then a suffix rule (`_id`, `_at`, `_on`, `_count`, `is_`), and returns nothing when it is not confident: a missing gloss is better than a wrong one. A new dataset should add its table names and any domain-specific column to that file.

## 9. Clarity rules (owner feedback, 2026-09-23)

Prose that is _correct_ but compressed reads as unclear to a learner meeting the idea for the
first time. Two owner-cited rewrites set the standard; `src/content/lessons/tablas-filas-columnas-tipos.ts`
("Anatomía de una tabla") is the reference implementation.

1. **Define the term inside the sentence that introduces it.** Not "leer su esquema" but
   "leer su esquema, es decir, cómo están estructurados los datos".
2. **Expand every acronym on first use, with its English origin.** "Clave primaria (PK, por
   _primary key_, su nombre en inglés)". The learner will meet `PK` in English documentation.
3. **Never leave a qualified identifier unexplained.** Not "`orders.customer_id` apunta a
   `customers.id`" but "`orders.customer_id` es la columna `customer_id` de la tabla `orders`,
   y apunta a la columna `id` de la tabla `customers`". Then give the business meaning.
4. **Name the consequence plainly instead of gesturing at it.** Not "multiplica filas sin darse
   cuenta" as a standalone punchline, but "comete errores que producen resultados incorrectos o
   inesperados". Keep the vivid detail _after_ the plain statement, never instead of it.
5. **One concrete anchor per abstract concept** — an analogy ("funciona como el número de
   documento de identidad de la fila") or a TiendaViva example. Abstraction alone is a rewrite.
6. **Prefer the unambiguous phrasing over the idiomatic one**: "desde la primera vez", not
   "a la primera".
7. **No rhetorical compression**: semicolon contrasts, elided verbs and aphorisms cost the reader
   a re-read. Spend the extra clause.

What these rules are _not_: an invitation to pad. Sentences get longer only where the added words
carry meaning the learner needs. Nothing here relaxes §1 (neutral es-419, "tú", no childish tone).
