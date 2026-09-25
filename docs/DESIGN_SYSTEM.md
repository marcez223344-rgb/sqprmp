# Design System and Visual Direction

**Audience:** adults 25–35 in LATAM building a data career. **Feel:** contemporary, energetic, professional, trustworthy, inclusive. Not childish, not neon-cyberpunk, not corporate-stock, not gambling-like.

## 1. Brand concept

"Claridad con energía": a calm, data-blue foundation (credibility, focus) with a single warm accent (momentum, LATAM warmth) used sparingly for progress and calls to action. Visual metaphor: grids and result tables that turn into insight; illustrations are geometric, abstract data shapes, never mascots.

## 2. Color tokens (CSS variables, Tailwind 4 `@theme`)

| Token                         | Light                                                              | Dark      | Use                                                                                                                |
| ----------------------------- | ------------------------------------------------------------------ | --------- | ------------------------------------------------------------------------------------------------------------------ |
| `--color-bg`                  | `#F7F8FB`                                                          | `#0E1117` | page background                                                                                                    |
| `--color-surface`             | `#FFFFFF`                                                          | `#161B25` | cards, editor chrome                                                                                               |
| `--color-surface-2`           | `#EEF1F7`                                                          | `#1E2533` | table headers, wells                                                                                               |
| `--color-border`              | `#D9DEE8`                                                          | `#2A3242` |                                                                                                                    |
| `--color-text`                | `#151A24`                                                          | `#E8ECF3` | body (contrast ≥ 12:1)                                                                                             |
| `--color-text-muted`          | `#5B6474`                                                          | `#A3ACBD` | secondary (≥ 4.5:1)                                                                                                |
| `--color-primary`             | `#2B4FE0`                                                          | `#7C93FF` | actions, links, focus                                                                                              |
| `--color-primary-fg`          | `#FFFFFF`                                                          | `#0E1117` |                                                                                                                    |
| `--color-accent`              | `#F2652E`                                                          | `#FF8A5B` | streaks, XP, highlights (sparingly)                                                                                |
| `--color-accent-ink`          | `#B8461A`                                                          | `#FFA17A` | accent used as **text** (eyebrows, labels): the base accent only reaches 3:1 on light surfaces                     |
| `--color-success`             | `#1C8A5A`                                                          | `#4CC38A` | correct (always with icon + text)                                                                                  |
| `--color-success-ink`         | `#15704A`                                                          | `#4CC38A` | success as **text/icon** (completed states): `--color-success` only reaches 4.35:1 on white                        |
| `--color-warning`             | `#B7791F`                                                          | `#F0B35A` | partial, hints                                                                                                     |
| `--color-warning-ink`         | `#8A5E12`                                                          | `#F0B35A` | warning as **text/eyebrow** (pitfalls, hints): `--color-warning` only reaches 3.64:1 on white                      |
| `--color-danger`              | `#C53A3A`                                                          | `#F27474` | errors                                                                                                             |
| `--color-info`                | `#2E6F9E`                                                          | `#6FB6E8` | theory callouts                                                                                                    |
| Difficulty scale              | 1–5 use a **shape + label** (dot count + text), color is secondary |           |                                                                                                                    |
| `--color-achievement`         | `#6D3FC4`                                                          | `#B69BF0` | badge family «nivel» identity; same value as the marketplace dataset accent, separate token so the two can diverge |
| `--color-dataset-marketplace` | `#6D3FC4`                                                          | `#B69BF0` | TiendaViva marker (icon + chip)                                                                                    |
| `--color-dataset-fintech`     | `#0B7285`                                                          | `#5FC8D8` | Bolsillo marker                                                                                                    |
| `--color-dataset-delivery`    | `#96590C`                                                          | `#E0A93E` | Pídelo marker                                                                                                      |
| `--color-dataset-music`       | `#AD3A70`                                                          | `#EE87B4` | Ritmo marker                                                                                                       |

Dataset accents are identity, not status: they are used only for the dataset marker (icon + name), never to signal progress or correctness. Measured on `--color-surface`: marketplace 6.65:1 / 7.34:1, fintech 5.59:1 / 8.82:1, delivery 5.63:1 / 8.14:1, music 5.81:1 / 7.19:1 (light / dark); each stays ≥ 4.5:1 over its own 10 % tint.

Measured 2026-09-23 on `--color-surface` (light / dark): `warning-ink` 5.69 / 9.28, over its own 10 % / 14 % tint 5.11 / 7.02; `achievement` 6.65 / 7.34, over its own tint 5.72 / 5.73.

Rules: never encode status by color alone (icon + label always); minimum 4.5:1 for text, 3:1 for UI borders/icons; accent limited to ≤ 5 % of any screen.

**Tint discipline** (all ratios recomputed 2026-09-23 as sRGB alpha composites over `--color-surface`):

- A semantic tint is **10 % in light, 14 % in dark**. That is the cap at which `--color-muted` still passes 4.5:1 over the tint (measured 5.12–5.36 light, 5.71–6.19 dark).
- The **danger** tint is 8 % in light, because `--color-danger` over its own 10 % tint measures 4.48:1 (8 % measures 4.62:1).
- Tints above 14 % light / 20 % dark are allowed **only** on a container that holds no text (the badge icon container).
- `-ink` tokens, not the base token, are used whenever the colour is text or a small glyph: `--color-success` measures 4.35:1 on white and `--color-warning` 2.91:1 over a 20 % warning tint. Both were live defects until 2026-09-23.
- **Never** signal a state with `opacity-*` on a container that holds text: a blanket `opacity-70` drops `--color-muted` to 3.11:1. Use icon, border style and words instead.

## 3. Typography

- UI/body: **Inter** (variable), 16 px base, line-height 1.55; headings **Manrope** 600–700 (distinctive but sober); code/SQL: **JetBrains Mono** 14 px in editor, 13 px in result tables. All self-hosted via `next/font`.
- **Ligatures are off for every monospaced surface** (`font-variant-ligatures: none` + `"liga" 0, "calt" 0` in `globals.css`, repeated in the CodeMirror theme because its rules win over the base layer). JetBrains Mono otherwise draws `<=` as `≤` and `<>` as one glyph, and a learner must read back exactly the characters they typed — in the editor, in lesson code blocks, in hints and in solutions.
- **Pointer cursor**: Tailwind 4 no longer sets `cursor: pointer` on `<button>`. `buttonVariants` carries `cursor-pointer` (and `disabled:cursor-default`); a base-layer rule covers bare buttons, `<summary>` and `role="button"`. Nothing clickable shows the text arrow.
- Scale (rem): 0.75, 0.875, 1, 1.125, 1.25, 1.5, 1.875, 2.25, 3.
- Spanish typographic conventions: ¿? ¡!, «» not required, sentence-case headings.

## 4. Spacing, radius, elevation

Spacing scale 4 px based (1–24). Radius: 6 (inputs), 10 (cards), 16 (modals), full (avatars/chips). Elevation: 3 subtle shadows; dark mode relies on borders more than shadows. Breakpoints: 360 (min), 640, 768, 1024, 1280, 1536.

## 5. Components (shadcn/ui base + custom)

**`SectionHeader`** (`src/components/ui/section-header.tsx`) is the one section-header pattern of the product and the only sanctioned way to label a block: a monochrome lucide icon (`strokeWidth 1.75`, `size-4.5`, `aria-hidden`) inside a fixed `size-8 rounded-md` bordered container, an uppercase eyebrow (`text-xs font-semibold tracking-[0.06em]`) in the category ink, an optional real heading (`as="h2" | "h3"`), and an optional right-aligned `aside`. The container is always 32 px and never a circle — circles are reserved for avatars, level markers and badges — so every eyebrow on every screen lands on the same vertical line. When a block has no title the eyebrow **is** the heading, so eyebrow-only panels still appear in the heading outline. `Callout` (`src/components/ui/callout.tsx`) = `SectionHeader` + content inside `rounded-md border p-4` with the category surface, one surface change per block (a tint **or** a shadow, never both), `aria-labelledby` when given a `labelId`, and `role="status" aria-live="polite"` only when `live` is set.

The category vocabulary is **closed**: call sites choose a category, never their own colour classes. Anything not in the table uses `neutral`.

**Choose a category by meaning, never by appearance.** Warm and alert hues — `--color-accent-ink` (`why`), `--color-warning-ink` (`pitfall`, `hint`), `--color-danger` (`feedback-incorrect`) — are reserved for the things that ask the reader to be careful: mistakes, wrong answers, content that is held back. Anything that describes **achievement, progress or a promise to the learner** must not use them, and `verify`/`success-ink` is reserved for "this is done or verified" so that green keeps meaning exactly one thing across the lesson body, the workspace verdict and the progress markers of §5c. The «Al terminar vas a poder» block was built on `why` because the `Target` icon fitted, and a full-width terracotta panel at the top of every lesson read as a warning banner (owner feedback, 2026-09-24); it is now `goal`, on `--color-achievement` — the hue the product already uses for levels and the «nivel» badge family, so "what you will achieve" looks the same wherever it appears. Measured on the `goal` tint: ink 5.72:1 light / 5.73:1 dark, `--color-muted` 5.13:1 / 5.90:1.

| Category             | Icon             | Ink                   | Tint (light / dark) | Border           | Used by                                                               |
| -------------------- | ---------------- | --------------------- | ------------------- | ---------------- | --------------------------------------------------------------------- |
| `why`                | `Target`         | `--color-accent-ink`  | accent-ink 10 / 14  | accent-ink 30 %  | lesson «Por qué importa»                                              |
| `goal`               | `Flag`           | `--color-achievement` | achievement 10 / 14 | achievement 30 % | lesson «Al terminar vas a poder» (`objetivos`)                        |
| `concept`            | `BookOpen`       | `--color-info`        | info 10 / 14        | info 30 %        | lesson «El concepto», «La sintaxis»; workspace «Teoría relevante»     |
| `schema`             | `Table2`         | `--color-text`        | `surface-2`         | `border`         | workspace «Definiciones de tablas», «Columnas esperadas», «Resultado» |
| `example`            | `SquareTerminal` | `--color-primary`     | primary 10 / 14     | primary 30 %     | lesson «Ejemplo resuelto», «Ejemplo ejecutable»                       |
| `pitfall`            | `TriangleAlert`  | `--color-warning-ink` | warning 10 / 14     | warning 45 %     | lesson «Errores comunes»; quiz «por qué no»; not-executed verdict     |
| `verify`             | `CheckCheck`     | `--color-success-ink` | success-ink 10 / 14 | success-ink 30 % | lesson «Verificar…»                                                   |
| `summary`            | `ListChecks`     | `--color-text`        | `surface-2`         | `border`         | lesson «Resumen», «En resumen»                                        |
| `feedback-correct`   | `CircleCheck`    | `--color-success-ink` | success-ink 10 / 14 | success-ink 45 % | workspace + quiz correct verdict                                      |
| `feedback-incorrect` | `CircleX`        | `--color-danger`      | danger 8 / 14       | danger 45 %      | workspace + quiz incorrect verdict                                    |
| `hint`               | `Lightbulb`      | `--color-warning-ink` | `surface-2`         | `border`         | workspace «Pistas»                                                    |
| `neutral`            | caller or none   | `--color-muted`       | `surface-2`         | `border`         | everything else                                                       |

`feedback-*` are the only pair allowed a 45 % border **and** a tint: a verdict is the one place in the product that may raise its voice. `src/components/ui/answer-state.ts` extends the same vocabulary to the four states of a graded answer row (`pending`, `selected`, `answered-correct`, `answered-incorrect`) plus the dashed reveal of the correct option and the review rails.

### 5b. Lesson block vocabulary (2026-09-24)

A theory lesson is Markdown, so its extra blocks are **fenced blocks with an info string** — no HTML
in content (`skipHtml` stays on), no new dependency, and the renderer owns every pixel.
`src/components/learn/markdown.tsx` is the only place that maps a fence to a component;
`src/components/learn/lesson-blocks.tsx` holds the components, and every one of them is a
`SectionHeader` / `Callout` composition in the closed category vocabulary of §5. **No block invents
a colour.** Labels come from `src/content/lesson-block-labels.ts` (overridable via the `labels` prop
of `Markdown`, so they can move to `next-intl` without touching a content file).

| Fence                        | Block           | Category (§5)         | What it is for                                                                                 |
| ---------------------------- | --------------- | --------------------- | ---------------------------------------------------------------------------------------------- |
| ` ```objetivos `             | `Objectives`    | `why` + `Check`       | Lesson opener, one outcome per line: «Al terminar vas a poder». Max 3–4 items.                 |
| ` ```clave `                 | `KeyIdea`       | `concept` + `Key`     | The **one** sentence of the lesson, at `text-lg font-medium` with a 4 px rail. One per lesson. |
| ` ```sql Caption `           | `CodeFigure`    | —                     | Coloured query, 2 px `primary` left rail, caption as a `<figcaption>`.                         |
| ` ```sql-mal Caption `       | `CodeFigure`    | `pitfall`             | The discouraged version. Dashed `warning-ink` rail + the words «Así no».                       |
| ` ```sql-bien Caption `      | `CodeFigure`    | `verify`              | The recommended version. Solid `success-ink` rail + the words «Así sí».                        |
| ` ```resultado Caption `     | `ResultTable`   | `schema`              | Pipe-separated rows (first row = header). What the query returns, as a table.                  |
| ` ```diagrama nombre[#arg] ` | `DiagramFigure` | `schema` + `Workflow` | A figure from `LESSON_DIAGRAMS`; the fence body is its text alternative.                       |

Rules for authors: **one `clave` per lesson** (a second one cancels the first), a `resultado` only
with figures actually produced by the query on the committed dataset snapshot, and a `sql-mal` never
without the matching `sql-bien` immediately after it.

**Syntax colouring** (`src/components/learn/sql-highlight.tsx`) is a hand-written ~90-line tokenizer,
not a dependency. Inks measured 2026-09-24 on `--color-surface-2` (light / dark): keyword
`--color-primary` 5.63 / 5.47 (also `font-semibold`), call `--color-info` 4.78 / 6.97, string
`--color-success-ink` 5.38 / 6.93, number `--color-accent-ink` 4.72 / 7.77, comment
`--color-muted` 5.27 / 6.72 — every one ≥ 4.5:1 in both themes. Colour here
carries **no** information that the text does not already carry, which is why it does not violate
"no meaning by colour alone".

### 5c. Progress-state vocabulary (2026-09-24)

`src/components/progress/progress-state.tsx` is the only place a lesson, exercise or section says
how far along it is. `/ruta`, `/curriculo` and the per-section checklist on `/certificados` all draw
from it.

**The bug it replaces.** `/ruta` told «Completada», «En curso» and «Sin empezar» apart with three
circular lucide glyphs (`CheckCircle2`, `PlayCircle`, `Circle`) and three inks. Desaturated, those
inks are greys 98, 95 and 99 out of 255 — a contrast of **1.02:1 to 1.07:1 between the states**. So
in greyscale, and for a learner with deuteranopia or protanopia, the three states were literally the
same colour and the only surviving difference was a ~3 px mark inside an identical circle, repeated
up to 347 times down one page. Colour was never _alone_ (there was always a word), but it was the
only difference the eye could use at scanning speed, which is the failure the owner reported.

**Rule 1 — the channel is the amount of ink, not the hue.** The marker goes

| State         | Marker (18 px / 40 px)                                                        | Row rail                               | Card edge                            |
| ------------- | ----------------------------------------------------------------------------- | -------------------------------------- | ------------------------------------ |
| `completed`   | **filled** disc, `success-ink`, knockout `Check` in `--color-bg`              | 2 px solid `success-ink`               | 2 px solid `success-ink`             |
| `in_progress` | **ringed** disc, 2 px `primary`, solid centre dot (40 px: the section number) | 2 px `primary` + 8/12 % `primary` fill | 4 px `primary` + `primary/50` border |
| `not_started` | **empty** disc, 1 px `border`, `surface-2`                                    | transparent                            | plain `border`                       |
| `locked`      | **dashed** disc + `Lock`                                                      | 2 px dashed `border`                   | dashed `border`                      |
| `soon`        | **dashed** disc, no glyph                                                     | 2 px dashed `border`                   | dashed `border`                      |

filled → ringed → empty → dashed is a luminance ladder, so it survives greyscale and every form of
colour blindness; the hue only confirms what the shape already said. The knockout on the filled
marker is `--color-bg`, not white: white on the dark theme's `--color-success-ink` (`#4cc38a`) is
2.1:1, `--color-bg` is 5.74:1 light / 8.97:1 dark.

**Rule 2 — the states are not equal, and the design is deliberately asymmetric.** «En curso» is the
only thing the learner is actually hunting for, and there is normally exactly one of it, so it is the
only row that gets a background fill, a bold title and a visible word. «Completada» keeps its marker
and a thin rail and nothing else — reassurance, not competition; its green card tint and green title
ink are gone, because 20 green blocks compete with the one blue one. «Sin empezar» spends no ink at
all: an empty marker on a transparent rail. At 347 repetitions the quiet states have to cost
nothing, or the one row that matters drowns in them. In the dense lesson list the labels of the
quiet states live in an `sr-only` span on the marker, so a screen reader still hears every state.

**`locked` vs `not_started`** is the pair most at risk of collapsing: `locked` is the only state with
a dashed rail _and_ a glyph, and on a lesson row it takes precedence over `not_started` but never
over `completed` — an expired entitlement must not erase work already done.

**`StatTile` / `Meter`** (`src/components/progress/stat-tile.tsx`) are the only sanctioned KPI tile and meter. Tile = the same `size-8` icon container as `SectionHeader`, a sentence-case label, a `text-3xl font-bold` number, an optional meter and an optional caption. Two rules: **hue comes from the family the number belongs to** (level → `--color-achievement`, the same token as the «nivel» badge family; XP and exercises → `--color-primary`; streak → `--color-accent-ink`, the only genuinely time-sensitive number; mastery → `--color-success-ink`; a number with nothing to progress toward is `neutral`), and **a meter appears only where a real threshold exists** — total XP and coins have none, and a full bar for them would promise a goal the product does not have. A meter is never shown without its text equivalent: `role="progressbar"` with `aria-valuenow/min/max`, `aria-valuetext` in words («59 XP para el nivel 3»), plus the visible caption. Meter fills measure ≥ 4.7:1 against the `surface-2` track in both themes. No glyph is ever added to an already-labelled number — the motivating information is the distance to the threshold, not decoration.

Button (primary/secondary/ghost/danger, sizes sm/md/lg, loading state), Input/Textarea/Select/Combobox, Checkbox/Radio/Switch, Dialog/Sheet/Drawer, Tabs, Tooltip, Toast, Badge/Chip, Progress (bar + ring), Skeleton, Table (data results with sticky header, column types, copy cell, virtualized when > 200 rows), Card, Callout (teoría/consejo/error), Stepper (onboarding), Avatar (curated set), DifficultyIndicator, XpCounter, StreakFlame (respects reduced motion), CertificateCard, SqlEditor (CodeMirror wrapper), SchemaBrowser, HintPanel, FeedbackPanel, Paywall.

## 6. Iconography and illustration

Lucide icons (1.5 px stroke, 20/24 px). No emoji in product chrome: icons inherit color and size and can be hidden from screen readers.

**Why the answer to "add emoji and clip art" is diagrams, not emoji** (2026-09-24, owner feedback
raised three times). Emoji and clip art are _decoration attached to text_: a 📊 in front of a
paragraph adds a coloured shape but the reader still has to read the same paragraph. The lesson
pages were heavy because they were **only text** — every explanation, including the ones whose
subject is inherently spatial (which rows survive a join, how far back a window frame reaches, the
order in which clauses are evaluated), was a sentence. The fix is to stop writing and start drawing:
§5b's `diagrama`, `resultado`, `clave` and wrong/right blocks replace prose with objects. Three
further practical reasons emoji lose: they render as a different picture on every platform (so the
brand never controls what the learner sees), a screen reader announces the full CLDR name of each
one in the middle of a sentence, and they cannot be tinted to the semantic tokens. The vocabulary
below is the "images" answer; a lesson that uses it does not look like an emoji-free lesson, it
looks like an illustrated one.

### 6b. Lesson diagrams (`src/components/learn/diagrams.tsx`)

A closed registry, keyed by name and referenced from content with ` ```diagrama nombre `. Three
rules hold for every entry:

1. **The visual is `aria-hidden`; the authored fence body is the accessible content**, rendered as a
   visible `<figcaption>`. Everyone gets the explanation, nothing is announced twice.
2. **No meaning by colour alone.** Distinctions are carried by border style (dashed = the row drops
   out), fill, position and ordinals as well as hue.
3. **No text inside an SVG.** Anything with words is composed in HTML so it reflows to 360 px, stays
   selectable and keeps its contrast at any zoom. SVG is used only where the meaning is geometric.

| Name                 | Form | Says                                                                                                      |
| -------------------- | ---- | --------------------------------------------------------------------------------------------------------- |
| `orden-de-ejecucion` | HTML | The eight evaluation steps as numbered chips; `#where,select` rings the ones the lesson is arguing about. |
| `inner-join`         | HTML | Three mini result tables: two inputs, the rows without a partner dashed out, and the two-row output.      |
| `agrupar-vs-ventana` | HTML | The same four input rows, collapsed to two by `GROUP BY` and kept at four with a new column by `OVER`.    |
| `marco-de-ventana`   | SVG  | Eight ordered rows, a bracket over the ones inside the default frame and a marker on the current row.     |

The visual language is §1's: grids, rows and result tables in the semantic tokens. No mascots, no
clip art, no gradients, no glow.

**Lesson kinds** (same icon in the path list and on the lesson page): teoría `BookOpen`, ejercicio `SquareTerminal`, quiz `ListChecks`, desafío `Trophy`. **Levels** (the six course levels of `src/config/course-levels.ts`): N1 fundamentos `Sprout`, N2 transformar datos `Shapes`, N3 agregar y combinar `Layers`, N4 consultas avanzadas `Network`, N5 analítica aplicada `BarChart3`, N6 profesional `Briefcase`. **Datasets**: TiendaViva `Store`, Bolsillo `Wallet`, Pídelo `Bike`, Ritmo `Music4`, desconocido `Database` (neutral fallback).

**Badges** (`src/config/badges.ts`, styles in `src/components/progress/badge-styles.ts`): one icon per badge, family → hue, tier → tint strength. `/logros` used to render `Award` twelve times; the map is now authoritative for rendering and the database `badges.icon` column is the historical fallback. The six icons this map overrides were reconciled in the database by `20260923170000_badge_icons.sql` (rationale in [DATABASE_DESIGN.md](DATABASE_DESIGN.md) §4m), so the column and the config now agree; the config still wins for rendering.

| slug                | Icon            | Family     | Tier | Note                                                    |
| ------------------- | --------------- | ---------- | ---- | ------------------------------------------------------- |
| `primera-consulta`  | `Sparkles`      | práctica   | I    |                                                         |
| `cinco-ejercicios`  | `Rocket`        | práctica   | II   |                                                         |
| `veinte-ejercicios` | `TrendingUp`    | práctica   | III  | override: `Flame` is the streak language                |
| `sin-pistas-cinco`  | `Brain`         | autonomía  | II   |                                                         |
| `verificador-de-ia` | `SearchCheck`   | autonomía  | III  | `ShieldCheck` is reserved for certificates/verification |
| `seccion-completa`  | `BookCheck`     | dominio    | I    | override: `CircleCheck` is the universal correct marker |
| `tres-secciones`    | `Library`       | dominio    | II   | override: `Layers` is the N3 level icon                 |
| `racha-3`           | `CalendarCheck` | constancia | I    |                                                         |
| `racha-7`           | `CalendarRange` | constancia | II   | override: distinct from `CalendarCheck`                 |
| `racha-30`          | `Flame`         | constancia | III  | override: `Trophy` is the desafío lesson kind           |
| `nivel-3`           | `Star`          | nivel      | I    |                                                         |
| `nivel-5`           | `Medal`         | nivel      | II   | override: `Award` belongs to the badges feature itself  |
| `nivel-10`          | `Crown`         | nivel      | III  |                                                         |

Families: práctica `--color-primary`, autonomía `--color-info`, dominio `--color-success-ink`, constancia `--color-accent-ink`, nivel `--color-achievement`; an unmapped slug renders `Award` in a neutral «otras» group instead of crashing. Tier is tint strength (10/14/18 light, 14/20/26 dark) **and** a Roman numeral with an `sr-only` sentence, **and** a ring on tier III — legible in greyscale and to a screen reader. No metal gradients, no shine, no glow.

**Dataset marker** (`src/components/datasets/dataset-badge.tsx`, data in `src/config/datasets.ts`): `chip` variant (icon + name + domain, tinted border and background) in the exercise header; `inline` variant (accent icon + name) in the schema panel and other dense places. The accent classes are written out per dataset because Tailwind cannot see interpolated class names. Illustrations: flat geometric compositions of tables, nodes and charts in primary/accent duotone; people illustrated as diverse abstract silhouettes when needed, never caricatures. Avatars: 116 curated geometric/animal/abstract illustrations in the brand palette (inclusive, gender-neutral options), generated SVG only and appended rather than reshuffled so nobody's avatar changes under them (D-26); the picker is a scrollable region capped at `max-h-72`.

## 7. Motion

150–250 ms ease-out for state changes; celebratory moments (exercise correct, badge) use a single restrained animation ≤ 600 ms; all animation disabled under `prefers-reduced-motion`.

## 8. Accessibility standards (WCAG 2.2 AA)

Semantic landmarks, skip link, visible 2 px focus ring (`--color-primary` + offset), keyboard-operable editor (Esc to leave editor, documented), results table with `<caption>`, `scope`, row/column counts announced via live region, form errors linked with `aria-describedby`, dialogs with focus trap and return, contrast checked in CI via `axe` in Playwright, target size ≥ 24 px, no time limits on quizzes by default.

**A visually hidden form control must sit inside a positioned ancestor.** The avatar pickers hid the radio with `sr-only` inside a plain `<label>`, so clicking a tile focused an input the browser treated as off-screen and scrolled the page to the bottom (2026-09-23). Any `sr-only` input that receives focus needs `relative` on the element that wraps it; the visible tile is then the focus target in practice.

## 9. Key screens (textual wireframes)

**Landing (`/`)**: hero (value proposition, CTA "Empieza gratis con Google", social proof placeholders), "Cómo funciona" 3 steps, curriculum preview (the six level chips with their section counts + certificates), live demo editor (browser engine, read-only dataset, no login), pricing summary, founder note, FAQ, footer with legal links.

**Onboarding (`/onboarding`)**: 3-step stepper — Identidad (nombre, alias con validación en vivo, avatar grid) → Sobre ti (país, fecha de nacimiento, género opcional, nivel, objetivo, meta semanal) → Consentimiento (términos, privacidad con "por qué pedimos estos datos"). Progress saved between steps.

**Dashboard (`/aprender`)**: a five-tile stat row (`StatTile`: nivel with its XP-to-next-level meter and «{xp} XP para el nivel {n}», XP total with today's gain, monedas as a plain number, racha with today's nudge, ejercicios completados) — and that row is the **only** place those numbers appear; the old «Tu progreso» card repeated level/XP/coins at the same weight and was removed. Then the card grid: «Continuar» as the focal card (`ring-2 ring-primary/45`, `h2 text-xl`, `md:col-span-2`), «Repaso recomendado», «Racha» (state and protection only — the day count lives in the tile), «Metas» (two meters), «Insignias» (the `/logros` icon chips, `size-11` links to `/logros#{slug}` with an `aria-label`, never text-only pills with a `title` attribute), then mastery by section with labelled meters, then the progress links. Card headers are `SectionHeader` with the neutral category: on this screen hue belongs to the stat tiles and the badge chips, not to six competing card titles. The «Continuar» card opens with its section's progress («Sección N · x de y lecciones · z %» plus a `primary` meter), counted the same way as `/ruta`.

**Learning path (`/ruta`, `/curriculo`)**: sections grouped by the six course levels (`groupByCourseLevel`, never by the `sections.level` difficulty label), each introduced by an icon + `h2` «Nivel N · nombre» + "{done} de {total} secciones completadas"; sections as cards. Each section state is carried by three channels at once — icon, color and weight: **completada** (check badge, `--color-success-ink` title and rail, 5 % tint card), **en curso** (play icon, primary chip), **disponible** (book icon, neutral chip), **próximamente** (dashed border, dashed chip; no opacity, which previously broke text contrast). The first continuable section is the focal card: `ring-2 ring-primary/45`, larger title and a "Continúa aquí" cue. Each published section shows a `role="progressbar"` bar plus the text "{done} de {total} lecciones". Lesson rows carry the kind icon (with an `sr-only` kind label), a 2 px left rail (success when completed, primary when in progress), `min-h-11` touch targets, an `sr-only` explanation for the padlock on premium lessons, and hide the minutes below `sm`. Each published section card also carries its estimated time (sum of its published lessons, written "~1 h 35 min") and, when `requires_section_id` is set, «Requiere: sección N, título». On `/ruta` only, a summary card sits above the levels: whole-course progress over **published** lessons (a `Meter` plus the same sentence as text), the next certificate milestone, the «Continuar/Empezar: {lección}» button — the first unfinished lesson of the same section the «Continúa aquí» cue marks, preferring one the learner can open — a «Repasar lo aprendido» link, and a facts `<dl>` (sections published of total, lessons, exercises, certificates, estimated hours). Numbers come from `summarizePath` (`src/lib/curriculum/path-summary.ts`), never from copy.

**Schema panel**: the `Definiciones de tablas` column table is `table-fixed` with 40/22/38 widths and wrapping cells. With the automatic algorithm its non-wrapping name and type cells widened the table past the panel and the description spilled under the results panel (owner report, 2026-09-23).

**Exercise workspace (`/ejercicio/[slug]`)** desktop 3-column: left (scenario, business question, expected columns, tabs: Esquema | Teoría | Pistas), center (editor with Run ⌘/Ctrl+Enter, Submit, Reset, Save draft; below: results table with timing/row count/truncation notice; feedback panel with categorized findings), right collapsible (progress, rewards preview, related lesson). Mobile: stacked with sticky bottom action bar; editor height limited; schema as bottom sheet. States: loading dataset (progress), empty (run to see results), error (Postgres message + hint + position highlight), incorrect (diff summary: missing/extra columns, row count, first differing rows), correct (rewards, improvements, next), locked (paywall card with what unlocks), offline engine fallback.

**Exercise workspace — saved queries** (2026-09-23): the editor has both halves of the feature — `Guardar consulta` and a `Mis consultas guardadas` disclosure listing the learner's own queries (most recent first, title · dataset · date, SQL preview as a named scrollable region). Loading one into the editor asks first when the editor holds different unsaved text; focus returns to the trigger and a `role="status"` line names what was loaded. Both surfaces read through `listSavedQueries`.

**Exercise workspace — three ranks** (2026-09-23): the seven panels are ranked, not peers. Rank 1 (`bg-surface` + `shadow-sm` + `h2`) is the task (plus `ring-1 ring-inset ring-primary/20`), the editor, the result and the verdict panel; rank 2 is nested inside rank 1 (`Columnas esperadas` in a `surface-2` well); rank 3 (`bg-surface-2`, no shadow, eyebrow-only header) is the reference material — `Teoría relevante`, `Definiciones de tablas`, `Pistas` — grouped in an `<aside aria-label="Material de referencia">`, with `Solución` as a dashed collapsed disclosure. Work surfaces sit _above_ the page, reference material sits _in_ a well. The verdict panel takes the `feedback-correct` / `feedback-incorrect` / `pitfall` surface after a submission and keeps a `CircleDashed` empty state before it, so the panel never changes shape; the reward line is a `<footer>` with a top rule, not a third tinted box.

**Lesson prose**: every `##` gets a `border-t` top rule (that rhythm, not decoration, is what a 2 000-word column was missing). The nine recurring pedagogy headings (`Por qué importa`, `El concepto`, `La sintaxis`, `Ejemplo resuelto`, `Ejemplo ejecutable`, `Errores comunes`, `Errores frecuentes`, `Verificar…`, `Resumen` / `En resumen` — ~250 of ~700 headings) additionally get their category icon, matched case- and accent-insensitively in `src/components/learn/markdown.tsx` with **no content edits**; the ~450 one-off headings stay unadorned. The icon is `aria-hidden` and outside the heading, so the accessible name is exactly the authored title.

**Lesson body** (2026-09-24): the measure is on the prose, not on the column — `.prose-dm` is
`max-w-none` and only `p`, `ul`, `ol` and `blockquote` keep `max-w-prose`, so code, result tables,
callouts and diagrams use the full 48 rem of the lesson column. A diagram squeezed into a reading
measure reads as an afterthought; at column width it reads as part of the explanation. Every
` ```sql ` fence in all 347 lessons is now a `CodeFigure`: syntax-coloured, with a 2 px `primary`
left rail and an optional caption. The rest of the block vocabulary (§5b) is opt-in per lesson, and
the pattern is proven on `alias-y-expresiones-basico`, `inner-join-basico`, `ventana-over-partition`
and `ventana-order-by-y-marcos`.

**Badges (`/logros`)**: header with `{earned} de {total}` and a `role="progressbar"`; then one `<section>` per family led by `SectionHeader as="h2"` (icon = the family's tier-III icon) with a per-family counter and bar; inside, a `<ul>` ordered tier I → III (never earned-first: the next target must stay next to the last one earned). Card: `size-11` circular icon container, `h3` title + Roman numeral, description, and a state line — earned `CircleCheck` + «Obtenida el {fecha}» on a solid bordered `surface` card with shadow; locked the **real** icon at `strokeWidth 1.25` in neutral ink with a 16 px `Lock` overlay, a dashed border and «Aún no obtenida». Earned vs locked differs in icon, border style and words — never in opacity.

**Quiz result — percentages** (2026-09-23): the pass threshold is a percentage, so the result states one: the score heading reads «{score} de {total} correctas · {percent} %» and the verdict line compares that percentage with the threshold. The running tally during the attempt is visible (not `sr-only`) as soon as one question is answered. `scorePercent` floors, so the shown percentage can never read as reaching a threshold the verdict failed.

**Quiz result (spec for the quiz rebuild)**: the verdict outranks the review — `rounded-lg border-2 ring-1 ring-inset` in the `feedback-correct` / `pitfall` surface, a `size-10` icon container, an uppercase eyebrow, the score as a real `h2`, the actions inside the verdict box (a 10-question review is three screens on a 360 px phone), and focus moved to the region on submit (`tabIndex={-1}` + `.focus()`, keeping the 2 px ring). Each reviewed question is a card with a 2 px left rail (`success-ink` / `danger`), an `h3` eyebrow «PREGUNTA n · CORRECTA/INCORRECTA», answers as a `<dl>`, and the two explanations as labelled `pitfall` / `concept` callouts at 10 % tint (they were unlabelled 1.1:1 rectangles). Per-question grading uses the four states of `src/components/ui/answer-state.ts`.

**Quiz (`/leccion/[slug]/quiz`)**: one question per screen, progress, no timer, submit → explanation + distractor reasons, summary with review links.

**Profile / settings**: identity, avatar, alias (change limited), certificate name, privacy (leaderboard opt-in), goals, access status (plan, purchase date, invoice ref), export/delete account. A «Tus logros» card comes first: issued, non-revoked certificates with Verify and PDF links, and a `success` meter per course level (the same six as `/ruta`) over published lessons.

**Certificates (`/certificados`, `/verificar/[code]`)**: list with download; public verification with minimal data and revoked state. Each requirement shows two numbers, never one: sections fully completed (what eligibility is built on) **and** the share of its published lessons and exercises already done, with a `success` meter — counting only completed sections showed «0 de 8» to a learner with six solved exercises. Every section row carries its own breakdown («Teoría 1/2 · Ejercicios 3/5 · Quiz pendiente») from `summarizeSectionProgress`, the same per-section progress `/ruta` reads. Display only: eligibility stays with the `certificate_eligible` RPC. An issued, non-revoked certificate also offers «Agregar a mi perfil de LinkedIn», a plain link to LinkedIn's add-certification form pre-filled with name, issuer, month and the verification URL; it is not shown on `/verificar`, which employers read.

**Admin (`/admin`)**: users search → entitlement grant/revoke/extend with reason; content publish toggles; payment events table with reprocess; certificates revoke; feature flags; audit log viewer. Everything else via Supabase Studio in MVP.
