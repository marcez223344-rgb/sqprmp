# Long-form lesson readability — review and implementation

**Date:** 2026-09-24 · **Reviewer:** `ux-designer` · **Scope:** owner feedback, third repetition —
«these kind of long theory texts» are not nice, friendly or visually attractive
**Page under discussion:** `/leccion/alias-y-expresiones-basico`
**Type:** review **plus implementation** (the previous two answers were specifications; this one
ships). Related: `docs/reviews/2026-09-23-visual-hierarchy.md`, which answered a different question
(panels and page chrome) and produced `SectionHeader`.

---

## 0. Answer to the owner, in one paragraph

The 2026-09-23 review fixed the **chrome** of the lesson page — headings, rules, icons on the nine
recurring section titles. It did not touch the **body**, and the body is what he is looking at. A
theory lesson is currently 900 words of Spanish prose interrupted only by grey code slabs: the same
typographic weight from the first line to the last, no result ever shown, no picture anywhere, and
nothing that says "if you remember one sentence, remember this one". That is why it reads as
homework. The answer is not to sprinkle emoji on the prose — that is decoration attached to text,
and the problem is that there is nothing **but** text. The answer is to replace prose with objects
wherever the prose was describing something that can be shown: results as result tables, wrong-vs-
right as a pair of contrasted code blocks, the key sentence as a pull-quote, and the four concepts
that are genuinely spatial (execution order, join shapes, group-vs-window, window frames) as
diagrams. That is the "images" he asked for, in the brand's own visual language.

---

## 1. Diagnosis: why the lessons read as heavy

Measured across the 99 theory bodies in `src/content/lessons/*.ts`:

| Symptom                         | Measurement                                                                             |
| ------------------------------- | --------------------------------------------------------------------------------------- |
| Paragraph mass                  | 1 451 paragraphs; median 36 words, p90 **69**, longest **137**. 18.4 % are ≥ 60 words.  |
| Visual anchors between headings | None. Between two `##` rules there is nothing but `<p>`, `<ul>` and `<pre>`.            |
| Code blocks                     | Every one identical: `bg-surface-2`, 1 px border, **no syntax colour**, **no caption**. |
| Results shown                   | 17 of 99 bodies contain any table at all — and almost none shows what a query returns.  |
| Diagrams                        | **Zero.** `src/components/learn/` had no figure primitive of any kind.                  |
| Emphasis available to an author | `**bold**` and a bullet list. Nothing between "normal sentence" and "own section".      |

Three consequences, all visible on `/leccion/alias-y-expresiones-basico`:

**1.1 Every block has the same weight.** The sentence that actually matters in that lesson — an
alias is a name for the _output_ column and therefore does not exist yet when the `WHERE` runs — was
the third bullet of a three-bullet list, in the same ink and size as the advice about `snake_case`.

**1.2 The result is described instead of shown.** «la categoría con `id` 7 sale como `CAT-7`»,
«devuelve `3` y no `3.5`», «aparece con el encabezado `?column?`». A SQL learner's whole mental model
is _query in, table out_; the lessons were narrating the output in prose while the output itself,
which is a table, was never drawn.

**1.3 Concepts that are pictures were written as sentences.** The clearest case is
`funciones-de-ventana`, which printed the evaluation order as a run-on line of arrows —
`FROM → WHERE → GROUP BY → HAVING → ventanas → SELECT → ORDER BY → LIMIT` — inside a paragraph, and
then spent two more paragraphs explaining a consequence that a numbered diagram makes obvious in one
glance. Same for which rows survive an `INNER JOIN`, and for how far back a window frame reaches.

**1.4 Supporting defects found on the way.**

- `.prose-dm` put `max-w-prose` on the **container**, so a table or a figure could never be wider
  than the reading measure. Correct for prose, wrong for everything else.
- `.prose-dm pre` had no left rail and no caption slot, so a fragment and a full runnable query were
  indistinguishable.
- Ligatures were already handled (`globals.css`), but nothing distinguished a keyword from an
  identifier inside a block.

---

## 2. The emoji / illustration question, decided

**Asked three times. The answer is: no emoji in the prose, yes to pictures — and the pictures are
shipped in this change.** The reasoning that was missing from the previous two answers:

1. **Emoji would not have fixed it.** An emoji is decoration bolted onto a sentence. After adding
   one, the learner still has the same 69-word paragraph to read. The measured problem is that there
   is nothing in a lesson except sentences, so the fix has to _remove sentences_, not garnish them.
2. **Emoji are not ours to control.** The same code point renders as a different drawing on
   Windows, Android, iOS and Linux. A brand cannot own a visual it does not draw.
3. **Emoji are noisy to a screen reader.** Each one is announced by its full CLDR name mid-sentence
   («gráfico de barras», «bombilla»), which is worse than silence for a 900-word technical text.
4. **Emoji cannot be tinted.** Every other mark in the product takes a semantic token and passes a
   measured contrast ratio; an emoji does neither.
5. **But he is right that a wall of text needs pictures.** So the change ships four diagrams, inline
   result tables, a pull-quote and a wrong/right code pair. The §1 brand language already said what
   those pictures should look like — «geometric, abstract data shapes… grids and result tables that
   turn into insight» — and had never been used.

**Concession, explicitly:** the restrained icon vocabulary is extended by exactly two icons, both
unused elsewhere, both monochrome lucide, both `aria-hidden` with the meaning in the adjacent word:
`Key` → «Idea clave», `Workflow` → «Diagrama» (plus `Check` as the bullet of the outcome list). No
third icon set, no illustration pack, no dependency.

---

## 3. Device vocabulary (implemented)

Authored as fenced blocks with an info string — plain Markdown, `skipHtml` stays on, no new
dependency, and the renderer owns the output. Full table in `docs/DESIGN_SYSTEM.md` §5b.

| Fence                        | What it produces                                                                                 |
| ---------------------------- | ------------------------------------------------------------------------------------------------ |
| ` ```objetivos `             | «Al terminar vas a poder» — the `why` callout, one checked outcome per line.                     |
| ` ```clave `                 | The pull-quote: `text-lg font-medium`, `concept` surface, 4 px `info` rail, `Key` icon.          |
| ` ```sql Caption `           | Syntax-coloured query, 2 px `primary` rail, caption as `<figcaption>`.                           |
| ` ```sql-mal / sql-bien `    | The contrasted pair: dashed `warning-ink` rail + «Así no» / solid `success-ink` rail + «Así sí». |
| ` ```resultado Caption `     | Pipe rows rendered as a real `<table>` in the `schema` surface, like the workspace result panel. |
| ` ```diagrama nombre[#arg] ` | A figure from the registry; the fence body is the visible text alternative.                      |

**Emphasis is typographic before it is chromatic.** `clave` is the only block that changes type
size; everything else is distinguished by rail style, icon and label. The whole vocabulary survives
greyscale.

**Diagrams** (`src/components/learn/diagrams.tsx`), rules and table in `DESIGN_SYSTEM.md` §6b:
`orden-de-ejecucion`, `inner-join`, `agrupar-vs-ventana` (HTML, so they reflow and stay selectable)
and `marco-de-ventana` (SVG, text-free — the only one whose meaning is genuinely geometric).

**Syntax colouring**: a hand-written ~90-line tokenizer, no highlighter dependency. It now applies
to every ` ```sql ` block in all 347 lessons, which is the single change with the widest reach.

---

## 4. Accessibility (WCAG 2.2 AA)

- **Contrast.** Token inks on `--color-surface-2`, measured 2026-09-24 (light / dark): primary
  5.63 / 5.47, info 4.78 / 6.97, success-ink 5.38 / 6.93, accent-ink 4.72 / 7.77, muted 5.27 / 6.72.
  All ≥ 4.5:1. Tints stay at the §2 discipline (10 % light / 14 % dark), reusing the existing
  category surfaces.
- **No meaning by colour alone.** «Así no» / «Así sí» are words plus an icon plus a rail style
  (dashed vs solid). In `inner-join` the rows that drop out are dashed and italic, and the third
  table shows the actual survivors. Syntax colouring carries no information the text does not.
- **Diagrams.** The picture is `aria-hidden`; the authored Spanish description is a visible
  `<figcaption>` — so it serves screen-reader users and sighted readers equally, and nothing is
  announced twice. An unknown diagram name degrades to its text alternative instead of crashing a
  published lesson.
- **Structure.** Result tables are real `<table>` elements with `scope="col"` headers and an
  `sr-only` `<caption>`; figures are `<figure>` / `<figcaption>`; the outcome list is a `<ul>`.
  Heading accessible names are unchanged (the 2026-09-23 guarantee still holds, and its test still
  passes).
- **Motion.** Nothing added animates; the global `prefers-reduced-motion` block in `globals.css`
  continues to cover the page.
- **360 px.** Every diagram is either a wrapping flex list or a grid that collapses to one column;
  the arrow glyph flips from `→` to `↓` below `sm`. Result tables scroll horizontally inside their
  own container, never the page.

**Acceptance criteria for `qa-engineer`:**

1. `/leccion/alias-y-expresiones-basico` passes `axe` with no new violations.
2. Every `figure` produced by a `diagrama` fence has a non-empty `figcaption`.
3. No `<table>` inside a lesson body lacks a `th[scope="col"]`.
4. At 360 px the lesson body produces no horizontal page scroll.
5. Keyboard-only traversal of the lesson is unchanged (no block added is interactive).

---

## 5. Lessons updated

| Lesson                       | Devices applied                                                                                                                   |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `alias-y-expresiones-basico` | `objetivos`, 3 × `resultado`, 2 × wrong/right pair, `clave`, `diagrama orden-de-ejecucion#where,select`, captions on every query. |
| `inner-join-basico`          | `objetivos`, `resultado`, wrong/right pair (ambiguous `id`), `clave`, `diagrama inner-join`, captions.                            |
| `ventana-over-partition`     | `objetivos`, `clave`, `diagrama agrupar-vs-ventana`, 2 × `resultado`, `diagrama orden-de-ejecucion#where,over`, captions.         |
| `ventana-order-by-y-marcos`  | `diagrama marco-de-ventana`.                                                                                                      |

**Every figure in every `resultado` block was produced by executing the printed query against the
committed dataset snapshot** (`public/datasets/{tiendaviva,bolsillo}/v1`) in PGlite, not written by
hand. Where a query previously had a non-deterministic `LIMIT`, an `ORDER BY` was added so the
printed result is reproducible.

The remaining 343 lessons already gain the syntax-coloured, railed code blocks and the wider figure
column with no content edit. Rolling the opt-in blocks out further is `content-author` work, one
section at a time, against §5b.

---

## 6. Follow-ups (not done here)

1. **Strings.** The six block labels live in `src/content/lesson-block-labels.ts` because
   `src/messages/es-419.json` was being edited concurrently. `Markdown` already accepts a `labels`
   prop, so moving them is a one-line change at the call site. Keys proposed:
   `lesson.block.objectives|keyIdea|wrong|right|result|diagram`.
2. **`docs/CONTENT_GUIDELINES.md`** needs a section pointing authors at §5b (when to reach for
   `clave` vs a bold sentence; the rule that a `resultado` must be executed, never invented).
3. **`content:validate`** should reject an unknown `diagrama` name and a lesson with two `clave`
   blocks — cheap checks, `content-author` / `qa-engineer`.
4. **`src/components/workspace/markdown-client.tsx` is a second, simpler renderer** and therefore
   did not inherit any of this: exercise scenarios, hints and solutions still show uncoloured code
   blocks. Every component added here is pure and hook-free, so `Markdown` can be used inside a
   `"use client"` boundary directly; `MarkdownClient` should delegate to it instead of
   re-implementing `ReactMarkdown`. `frontend-engineer`, outside this review's file boundary.
5. More diagrams worth drawing next, in order of how much prose they would delete: `LEFT JOIN`
   shape, three-valued NULL logic, the cohort grid, and `UNION` vs `UNION ALL`.
