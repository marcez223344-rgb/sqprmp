# Curriculum — Data Minds SQL Academy

**Status:** Phase 0 structure. Content authored from Phase 3 using [CONTENT_GUIDELINES.md](CONTENT_GUIDELINES.md) and the `create-section` / `create-exercise` skills.

## 1. Learning path structure

One course ("Ruta SQL para Analistas de Datos") organized in **6 levels** and **39 sections**. Each section = objectives + concise theory (1–3 lessons) + worked examples + common mistakes + 4–7 practical exercises + 8–15 theory questions + 1 section challenge + completion rule.

| Level                        | Sections                                                                                                                                                                                           | Certificate                                           |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| **N1 · Fundamentos**         | 1 Introducción a bases de datos y SQL · 2 Tablas, filas, columnas y tipos de datos · 3 SELECT · 4 Alias y expresiones · 5 DISTINCT · 6 WHERE · 7 Operadores de comparación y lógicos · 8 NULL      | **Certificado: Fundamentos de SQL**                   |
| **N2 · Transformar datos**   | 9 Funciones de texto · 10 Funciones numéricas · 11 Fechas y horas · 12 CASE · 13 Ordenar y limitar resultados                                                                                      | —                                                     |
| **N3 · Agregar y combinar**  | 14 Funciones de agregación · 15 GROUP BY · 16 HAVING · 17 INNER JOIN · 18 LEFT, RIGHT y FULL JOIN · 19 Self joins · 20 Joins de múltiples tablas                                                   | **Certificado: SQL para Análisis de Negocio**         |
| **N4 · Consultas avanzadas** | 21 Subconsultas · 22 CTE · 23 Operaciones de conjuntos · 24 Agregación condicional · 25 Funciones de ventana · 26 Funciones de ranking · 27 Totales acumulados y promedios móviles · 28 LAG y LEAD | **Certificado: SQL Analítico Avanzado**               |
| **N5 · Analítica aplicada**  | 29 Cohortes y retención · 30 Funnels · 31 Deduplicación · 32 Investigaciones de calidad de datos · 33 Depuración de consultas · 34 Fundamentos de optimización · 35 Índices y planes de ejecución  | —                                                     |
| **N6 · Profesional**         | 36 SQL analítico avanzado · 37 Casos de negocio · 38 Desafíos de entrevista técnica · 39 Proyectos finales (capstone)                                                                              | **Certificado: Analista SQL Profesional** (full path) |

Prerequisites are linear inside a level; levels unlock when the previous level's section challenges are passed (mastery learning). Learners can _preview_ any lesson's theory but not submit gated exercises.

Free tier: the first 5 practical exercises (`FREE_EXERCISE_LIMIT`, sections 2–3) plus all theory of N1 are free; everything else requires an entitlement (D-01).

## 2. Difficulty scale

| Label      | Meaning                                                                             | Typical time |
| ---------- | ----------------------------------------------------------------------------------- | ------------ |
| Muy fácil  | One concept, one table, direct instruction                                          | 2–4 min      |
| Fácil      | One or two concepts, one table, light filtering                                     | 4–7 min      |
| Intermedio | Two or more concepts combined; joins/aggregation; edge cases (NULL, dates)          | 7–12 min     |
| Avanzado   | Multi-step reasoning, CTEs/windows, ambiguity to resolve from the business question | 12–20 min    |
| Experto    | Realistic ambiguous business request, data-quality traps, performance awareness     | 20–40 min    |

Every difficult exercise must test a named skill; complexity for its own sake is rejected during review.

## 3. Initial content volume (MVP release)

Depth over volume. Launch with **8 fully authored sections** spanning free and paid tiers and all three MVP datasets:

| Section                                             | Exercises                                 | Questions          | Dataset(s)           |
| --------------------------------------------------- | ----------------------------------------- | ------------------ | -------------------- |
| 1 Introducción                                      | 0 (theory + quiz)                         | 10                 | —                    |
| 2 Tablas y tipos                                    | 2 (very easy)                             | 10                 | tiendaviva           |
| 3 SELECT                                            | 5                                         | 10                 | tiendaviva           |
| 6 WHERE + 7 Operadores (merged lesson flow)         | 6                                         | 14                 | tiendaviva, bolsillo |
| 8 NULL                                              | 4                                         | 10                 | bolsillo             |
| 14–15 Agregación y GROUP BY                         | 6                                         | 14                 | pidelo               |
| 17 INNER JOIN                                       | 5                                         | 12                 | tiendaviva           |
| 18 LEFT/RIGHT/FULL JOIN                             | 5                                         | 12                 | pidelo, bolsillo     |
| 25 Funciones de ventana (showcase of advanced tier) | 5                                         | 12                 | bolsillo             |
| **Total**                                           | **38 exercises** (+ 8 section challenges) | **~104 questions** | 3 datasets           |

All 39 sections exist as published _outlines_ (objectives + summary) so the path is visible; unauthored sections show "Próximamente" and are excluded from certificate requirements until complete. Target after launch: +1 fully authored section per week.

## 4. MVP datasets (see `src/datasets/<slug>/README.md` once generated)

| Slug         | Domain                                          | Story                                             | Tables                                                                                               | Highlights                                                                                                                                                |
| ------------ | ----------------------------------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tiendaviva` | E-commerce marketplace (AR, MX, CO, CL, PE, UY) | Marketplace of independent sellers                | customers, sellers, products, categories, orders, order_items, payments, shipments, reviews, returns | multi-currency (ARS, MXN, COP, CLP, PEN, UYU), cuotas, cancellations, seasonality (Hot Sale, Buen Fin, Navidad), duplicate customers, NULL shipping dates |
| `bolsillo`   | Digital wallet / fintech                        | Wallet with transfers, top-ups, card payments, QR | users, accounts, transactions, transfers, merchants, cards, kyc_events, fx_rates                     | status transitions, reversals, timezone-aware timestamps, fraud flags, monthly cohorts                                                                    |
| `pidelo`     | Food delivery                                   | Restaurants, couriers, orders in several cities   | cities, restaurants, menu_items, customers, couriers, orders, order_events, ratings, promotions      | funnel events, delivery SLA, weather-free seasonality, promo abuse, missing ratings                                                                       |

Later datasets (post-MVP): streaming (`ondaplay`), ride-hailing (`rutaya`), SaaS subscriptions (`nubeflow`), education (`aulaviva`), social content (`redlatina`), event ticketing, logistics, customer support.

## 5. Section template (every section must fill all fields)

1. Objetivos de aprendizaje (3–5, verbos observables)
2. Teoría concisa (≤ 900 palabras por lección) con ejemplos ejecutables
3. Ejemplo resuelto paso a paso (worked example)
4. Errores comunes (≥ 3)
5. Ejercicios prácticos (progresivos; al menos uno por nivel de dificultad presente)
6. Preguntas de teoría (≥ 8, tipos variados)
7. Desafío de sección (intermedio/avanzado, integra los conceptos)
8. Requisitos de completado: todos los ejercicios correctos + quiz ≥ 80 % + desafío
9. Elegibilidad de certificado (si aplica)

## 6. Exercise model (authored as JSON validated by `src/content/schemas/exercise.ts`)

`slug, title, section, difficulty, estimated_minutes, concepts[], prerequisites[], dataset, scenario_md, business_question_md, learning_objective, theory_ref, tables_used[], expected_columns[{name,type}], validation_rules{order_matters, numeric_tolerance, allow_extra_columns:false, dedupe:false, required_concepts[], prohibited_patterns[], max_execution_ms}, reference_solution, alternative_solutions[], hints[3], common_mistakes[], expert_explanation_md, improvement_feedback[{condition, message}], reward{xp, coins, hint_penalty, solution_penalty}, solution_unlock{min_attempts:3, min_hints:2, min_minutes:10, allow_explicit:true}`

## 7. Pedagogical rules applied

Scaffolding (hints), retrieval practice (quizzes + review sessions), spaced repetition (review queue based on failed questions and hint-heavy exercises), worked examples before first exercise of a concept, immediate structured feedback, interleaving (section challenges mix prior concepts), mastery gates per level, reflection prompt after each section, authentic business scenarios.
