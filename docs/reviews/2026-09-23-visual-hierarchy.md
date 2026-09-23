# Visual hierarchy, sectioning and badge identity — design review

**Date:** 2026-09-23 · **Reviewer:** `ux-designer` · **Scope:** owner feedback items 4, 6, 16, 17
**Type:** review + specification. **No code was changed by this review.** Every change listed here is
for `frontend-engineer` (and `database-engineer` / `content-author` where marked).
**Verified against:** `docs/DESIGN_SYSTEM.md`, `.claude/rules/accessibility.md`, lucide-react 1.47.0
(every icon name below was checked to exist in the installed package).

> **Line numbers:** read from the working tree on 2026-09-23. `quiz-runner.tsx`,
> `panels.tsx`, `exercise-workspace.tsx` and `es-419.json` were being edited concurrently while this
> review was written, so some references have already drifted (e.g. the
> `exercise-workspace.tsx:444` contrast failure now sits at `:513`, and `quiz-runner.tsx` has grown
> per-question feedback around `:250` / `:356`). Every **finding** below was re-checked against the
> current tree and still holds; match on the quoted class string rather than the line number.

---

## 0. Answer to the owner, in one paragraph

The product does not look cheap; it looks **flat**. Almost every block on every screen is the same
object: a 1 px `--color-border` rectangle on `--color-surface` with a small semibold label on top
(`Card`, `src/components/ui/card.tsx:7`, repeated by hand nine times in
`src/components/workspace/exercise-workspace.tsx`). Nothing tells the eye which block is the task,
which is reference material and which is the verdict. That is the real cause of items 4, 6 and 16 —
not a lack of decoration. The fix is a **single reusable section-header primitive** (a tinted
monochrome lucide icon in a fixed 32 px container + an uppercase eyebrow label + one surface change),
applied with a strict semantic vocabulary of eight categories. Adding emoji instead would solve the
same 20 % of the problem and permanently cap the brand register below the price point (§3). One good
version of this pattern already exists in the codebase — the level header on `/ruta`
(`src/components/learn/learning-path.tsx:113-127`). It should be extracted and used everywhere.

---

## 1. Audit of the real screens

### 1.1 Global: the primitives are too few and too quiet

- `src/components/ui/` contains exactly three components: `button.tsx`, `card.tsx`, `field.tsx`.
  There is no `Callout`, no `SectionHeader`, no `Badge`/`Chip`, no `Panel` — although
  `docs/DESIGN_SYSTEM.md:50` lists all of them. Consequence: every screen re-invents the same markup
  inline, and the copies drift. `exercise-workspace.tsx` writes
  `"border-border bg-surface … rounded-lg border p-5"` at lines 177, 207, 223, 239 and
  `"… border p-4"` at 328, 402, 418, 434 — two paddings, one visual weight, seven sections.
- **Surface elevation is a single step.** `--surface-2` is 1.13:1 against `--surface` in light and
  1.12:1 in dark. A tasteful choice for wells, but it means a nested block reads as _the same plane_
  as its parent. `panels.tsx:71` then halves it (`bg-surface-2/50` = **1.06:1** vs surface) — that
  boundary is effectively invisible and the `border-t` is doing 100 % of the work.
- **The heading scale is compressed at the top.** `globals.css:104-112` gives every `h1…h4` the same
  weight (700) and the same tracking. On a lesson page the ladder is `h1` 1.875 rem →
  `.prose-dm h2` 1.5 rem → `h3` 1.25 rem (`globals.css:155-160`). A 1.25× step between page title
  and section title, with identical weight and colour, is not enough separation for a 2 000-word
  document. The design system's own scale (§3) offers 2.25 and 3 rem; neither is used in the learn
  area.
- **Spacing rhythm is arbitrary between screens.** `space-y-8 py-10` on `aprender/page.tsx:32` and
  `leccion/[slug]/page.tsx:84`, `space-y-6 py-10` on `logros/page.tsx:21`, `space-y-8` plus
  `space-y-14` on `/ruta` (`ruta/page.tsx:15`, `learning-path.tsx:105`). There is no defined
  "section gap", so visual grouping means something different on each page.
- **No section boundary is ever drawn by a rule.** `border-t` appears once in the whole learn area,
  on the lesson pager (`leccion/[slug]/page.tsx:160`). Long prose therefore has no horizontal
  anchors at all.

### 1.2 `/aprender` (dashboard) — `src/app/(learn)/aprender/page.tsx`

Strongest of the four screens, and it shows what works: the four KPI tiles (lines 41-56) have an
icon + label + a `text-3xl font-bold` number and read instantly.

Weaknesses:

- **Duplicated data, no hierarchy between the copies.** Level, XP and coins appear in the tiles
  (lines 43-45) _and again_ in the stats card (lines 111-128) in the same weight
  (`font-heading text-2xl font-bold`). The learner cannot tell which one is the summary.
  Recommendation: the stats card keeps only the XP-to-next-level bar and `exercisesCompleted`.
- **Six cards in one 3-column grid with no grouping** (lines 58-220): Continuar, Repaso, Stats,
  Racha, Metas, Insignias. "Continuar" is the only action that matters on this page and it is
  visually a peer of "Insignias". It needs the focal treatment `/ruta` already defines for its
  current section (`ring-2 ring-primary/45` — `DESIGN_SYSTEM.md:76`).
- **`h2` sizes do not track importance:** `text-xl` on Continuar (61) and Mastery (224), `text-lg`
  on the four small cards. Continuar and Mastery are not the same rank.
- Icon colour is assigned ad hoc: `text-primary` for all four tiles (50), `text-info` for Repaso
  (98), `text-accent` for Racha (155), `text-primary` for Metas (180), `text-warning` for Insignias
  (196). Four hues, no rule. §2 fixes this.
- Earned badges render as **text-only pills** (202-215) whose only description is a `title`
  attribute — invisible to keyboard and touch users. The same data renders completely differently
  here and on `/logros`.

### 1.3 `/ruta` (path) — `src/components/learn/learning-path.tsx`

This is the reference implementation. `STATE_STYLES` (45-66) is right: three channels (icon, colour,
weight), `-ink` tokens for text, no blanket opacity, and a comment explaining why. `LEVEL_ICON`
(26-31) and the level header block (113-127) are the pattern the rest of the app is missing.
**Nothing to fix here; everything to copy from here.** The one gap: the level-header pattern is local
to this file and cannot be reused.

### 1.4 `/leccion/[slug]` (theory) — where "Por qué importa" lives

The shell (`leccion/[slug]/page.tsx:84-103`) is good: breadcrumb, a kind/minutes pill carrying the
kind icon, `h1`. Then lines 145-147 hand the whole lesson to `<Markdown>` and the hierarchy stops.

Measured reality of the content: **38 lesson files, 96 `body_md` bodies, ~700 `##` headings, of which
~310 draw from a stable vocabulary** and the rest are unique one-off titles:

| Heading (normalized)                                                        | Occurrences |
| --------------------------------------------------------------------------- | ----------- |
| `Por qué importa`                                                           | 74          |
| `Resumen`                                                                   | 74          |
| `Errores comunes`                                                           | 57          |
| `Ejemplo resuelto`                                                          | 19          |
| `El concepto`                                                               | 9           |
| `En resumen`                                                                | 6           |
| `La sintaxis`                                                               | 5           |
| `Verificar` / `Verificar el resultado`                                      | 3           |
| `Ejemplo ejecutable`                                                        | 2           |
| `Errores frecuentes`                                                        | 1           |
| ~300 unique others (`La trampa del WHERE`, `NOT IN y la trampa de NULL`, …) | 1 each      |

Two conclusions follow, and they are the whole answer to item 4:

1. **A per-heading glyph is impossible at this scale.** 300 unique headings means 300 icon decisions,
   which is exactly how a product ends up looking like a sticker album. Anyone proposing "icons on
   the paragraphs" has not counted the paragraphs.
2. **But the headings that carry the pedagogy are extremely stable.** `Por qué importa`, `Resumen`,
   `Errores comunes` and `Ejemplo resuelto` account for 224 headings across 74 lessons — every
   lesson opens the same way and closes the same way. Verified detail: all 80 occurrences of
   `Resumen` / `En resumen` are the **last** heading of their body (16 of 96 bodies have no recap).
   Those nine heading names deserve a distinct, recognisable treatment, because they are the
   learner's map through 74 documents. The other ~300 keep the plain heading treatment. **Zero
   content edits required.**

Other weaknesses on this screen:

- `.prose-dm h2 { @apply mt-8 mb-3 text-2xl }` (`globals.css:155`) — 32 px above, 12 px below, no
  rule, no colour, same weight as `h1`. In a lesson with eight of them, the page is one
  undifferentiated column.
- `blockquote` is styled (`globals.css:199`) but **no lesson uses it**; there is no callout mechanism
  in authored markdown at all, so an author wanting to flag a pitfall has only `**bold**`.
- No in-page table of contents. With 5-10 sections per lesson in a `max-w-3xl` column, a sticky
  "En esta lección" list on `lg:` is the single highest-value addition to this screen.
- `article` (line 145) has no `aria-labelledby` pointing at the `h1`.

### 1.5 Exercise workspace — `src/components/workspace/`

Seven sibling boxes with identical chrome in two columns. Left: Situación + Lo que pide el negocio +
Columnas esperadas crammed into **one** box (`exercise-workspace.tsx:177-204`) with two `h2 text-lg`
and one `p text-sm font-medium` acting as a third heading of the same rank; then `Teoría relevante`
(207-221), `Definiciones de tablas` (223-237), `Solución` (239-323). Right: `Tu consulta` (328-400),
`Resultado` (402-416), `Pistas` (418-432), `Retroalimentación` (434-474).

- **Heading ranks are inconsistent, and three panels are not headings at all.** `h2 text-lg` at
  178/180; bare `<p class="text-sm font-medium">` at 183, 225, 330; `h2 text-sm font-medium` at 404,
  419, 435; `<p class="text-accent-ink text-xs uppercase">` at 208. Four typographic treatments for
  one structural rank, and `Columnas esperadas`, `Definiciones de tablas` and `Tu consulta` are
  absent from the heading outline — so a screen-reader user's heading list of the workspace is wrong.
- **`Teoría relevante` is the only panel with an accent eyebrow** (208). It is also the least
  important panel on the screen. The accent is spent in the wrong place.
- **`Retroalimentación` — the moment the whole product exists for — has the weakest chrome on the
  page**: `text-sm font-medium` inside the same neutral box as `Pistas` (435). After a submission the
  panel should visibly change state; today only a small inline `p` inside it does
  (`panels.tsx:149-161`).
- **Contrast failure, light theme:** `panels.tsx:152` colours the verdict line `text-success`
  (`#1C8A5A`) on `--surface` = **4.35:1**, below 4.5:1. `DESIGN_SYSTEM.md:24` already says to use
  `--color-success-ink` for success-as-text; this call site did not.
- **Contrast failure, light theme:** `exercise-workspace.tsx:444` puts `text-success` on
  `bg-success/10` = **3.84:1**.
- `bg-surface-2/50` for the expanded schema table (`panels.tsx:71`) = 1.06:1 vs surface — see §1.1.
- The `used` chip (`panels.tsx:58`) is `text-[10px]` uppercase, below the 0.75 rem floor of the
  design system's scale, and `text-[10px]` appears three more times for the gloss, PK and FK
  (97, 101, 103). That column carries five text sizes.
- `details`/`summary` for Solución (239) relies on the native triangle while the schema list next to
  it uses a custom `ChevronDown` (63) — two disclosure languages on one screen.

### 1.6 Quiz and quiz result — `src/components/quiz/quiz-runner.tsx`

The question screen (161-234) is decent: progress text + bar + one bordered card + prev/next.

The result screen (55-141) is what item 16 is reacting to, and it is genuinely weak:

- **The score banner and the question cards have the same border weight and radius**
  (`rounded-lg border p-5` at 58-61 vs `rounded-lg border p-4` at 85). The verdict does not outrank
  the review list.
- **The banner is the only heading-like element and it is not a heading**: `<p class="font-heading
text-2xl font-bold">` (64). The result screen contributes **no** `h2`/`h3` to the outline, and the
  per-question `<li>`s have none either — the review cannot be navigated by headings.
- **Focus is lost on submit.** `submit()` (146-159) replaces the entire subtree, so the button that
  had focus is unmounted and focus falls to `<body>`. A keyboard user lands at the top of the
  document with no idea where they are. `role="status"` (63) announces the score text, but focus is
  still gone. WCAG 2.4.3.
- **Three nested tint boxes per wrong question** (`border-danger/30 bg-danger/5` at 105 and
  `border-info/30 bg-info/5` at 110, inside a `bg-surface` card, inside the page) with no labels: the
  learner sees two unexplained coloured rectangles and must infer that one is "why yours was wrong"
  and the other is "the explanation". Neither has a heading or an icon.
- `bg-danger/5` and `bg-info/5` measure **1.16:1** and **1.14:1** against the card — below the
  threshold where most people perceive a fill at all on a laptop at an angle. If a tint is worth
  using, it is worth seeing.
- "Tu respuesta" / "Respuesta correcta" are `<strong>` inside a `<p>` (97, 101) — not a definition
  list, not aligned, and `formatAnswer` (256) prints raw markdown source for option bodies.
- `retry` (121-125) wipes all answers with no confirmation and no statement of whether the attempt
  was recorded.
- **Copy-tone defect, outside my edit permission:** `src/messages/es-419.json` → `quiz.*` uses
  Rioplatense voseo in eight strings: `failed` ("Revisá … volvé"), `answerAll` ("Respondé"),
  `selectMany` ("Seleccioná"), `fillBlank` ("Escribí"), `choose` ("Elegí"), `selectOne`
  ("Seleccioná"), `errors.unauthorized` ("Tenés"). `CLAUDE.md` rule 6 requires neutral LATAM "tú"
  ("Revisa … vuelve", "Responde", "Selecciona", "Escribe", "Elegir", "Tienes"). This survived the
  `0e4ae50` voseo cleanup. Hand to whoever owns `es-419.json`.

### 1.7 `/logros` (badges) — `src/app/(learn)/logros/page.tsx`

The clearest defect of the four, and it is a _data_ defect as much as a visual one:

- **The database already stores a distinct icon per badge and the UI throws it away.**
  `supabase/migrations/20260918210000_gamification.sql:319-331` seeds `badges.icon` with
  `sparkles, rocket, flame, brain, check-circle, layers, calendar-check, calendar-days, trophy,
star, award, crown` — twelve different icons. `logros/page.tsx:44` renders `Award` for every earned
  badge and `Lock` for every locked one. That is why they all look the same.
- **Contrast failure:** `text-warning` (`#B7791F`) on `bg-warning/20` (line 40) = **2.91:1**, below
  the 3:1 minimum for meaningful non-text content.
- **Blanket `opacity-70` on locked cards** (line 35) drops `--text-muted` to **3.11:1** in light
  (4.37:1 in dark). This is the exact bug the 2026-09-18 accessibility review removed from `/ruta`
  (see the comment at `learning-path.tsx:41-44`); it survived here.
- Locked and earned cards are otherwise identical in layout, so the page reads as a grid of grey
  rectangles and the only strong signal is the yellow circle — i.e. **colour**.
- The earned date and "Aún no obtenida" share one slot (56-60), so the card has no stable third line
  and the grid baselines wobble.
- There is no notion of **category** or **progression**, although the criteria encode both: five
  categories (`exercises_completed`, `exercises_without_hints`, `sections_completed`, `streak`,
  `level`) with clear tiers inside them (1/5/20 exercises, 3/7/30 days, level 3/5/10). A learner
  cannot see "I am two steps into the streak family".

---

## 2. The section-heading system (one pattern, eight categories)

### 2.1 The primitive

Two new presentational components, both `frontend-engineer` work.

**`src/components/ui/section-header.tsx`**

```
<header class="mb-3 flex items-start gap-3">
  <span aria-hidden="true"
        class="{tint} {border} flex size-8 shrink-0 items-center justify-center rounded-md border">
    <Icon class="size-4.5" strokeWidth={1.75} />
  </span>
  <div class="min-w-0">
    <p class="{ink} text-xs font-semibold tracking-[0.06em] uppercase">{eyebrow}</p>
    <{as} class="font-heading text-lg leading-snug">{title}</{as}>   <!-- optional -->
  </div>
  {aside}                                                            <!-- optional, ml-auto -->
</header>
```

Rules that make it a system rather than a decoration:

- The icon container is **always** `size-8`, `rounded-md`, 1 px border. Never a circle (circles are
  reserved for avatars, level markers and badges — §5), never larger, never `size-6`. One size means
  the left edge of every eyebrow on every screen sits on the same vertical line, which is what
  actually produces the "elegant" impression.
- The icon is **monochrome, `strokeWidth 1.75`, `size-4.5`, `aria-hidden="true"`**, always. It
  never carries information alone; the eyebrow text does.
- The eyebrow is `text-xs font-semibold uppercase tracking-[0.06em]` in the category's ink colour. It
  is the only place uppercase is allowed.
- `title` is optional and, when present, is a real heading element (`as="h2" | "h3"`) so the outline
  stays correct. When the block has no title, the eyebrow is the label and the wrapping `<section>`
  takes `aria-labelledby` pointing at it.
- Exactly **one** surface change per block: either a tint + border (callout) or nothing (prose
  section, which uses a top rule instead). Never a tint _and_ a shadow.

**`src/components/ui/callout.tsx`** = `SectionHeader` + `{children}` inside
`rounded-md border p-4 {tint} {border}`, with `aria-labelledby` wired to the eyebrow. No `role`
needed.

### 2.2 The category vocabulary

Each category maps to **one** token set. This table is the whole vocabulary; anything not in it uses
`neutral`.

| Category                     | lucide icon             | Ink token                       | Tint (light / dark)         | Border                  | Used by                                                           |
| ---------------------------- | ----------------------- | ------------------------------- | --------------------------- | ----------------------- | ----------------------------------------------------------------- |
| `why` — why it matters       | `Target`                | `--color-accent-ink`            | `bg-accent-ink/10` / `/14`  | `border-accent-ink/30`  | lesson `Por qué importa`                                          |
| `concept` — concept, syntax  | `BookOpen`              | `--color-info`                  | `bg-info/10` / `/14`        | `border-info/30`        | lesson `El concepto`, `La sintaxis`; workspace `Teoría relevante` |
| `schema` — data reference    | `Table2`                | `--color-text`                  | `bg-surface-2`              | `border-border`         | workspace `Definiciones de tablas`, `Columnas esperadas`          |
| `example` — worked example   | `SquareTerminal`        | `--color-primary`               | `bg-primary/10` / `/14`     | `border-primary/30`     | lesson `Ejemplo resuelto`, `Ejemplo ejecutable`                   |
| `pitfall` — common mistakes  | `TriangleAlert`         | `--color-warning-ink` **(new)** | `bg-warning/10` / `/14`     | `border-warning/45`     | lesson `Errores comunes`, `Errores frecuentes`; quiz "por qué no" |
| `verify` — check your result | `CheckCheck`            | `--color-success-ink`           | `bg-success-ink/10` / `/14` | `border-success-ink/30` | lesson `Verificar*`                                               |
| `summary` — recap            | `ListChecks`            | `--color-text`                  | `bg-surface-2`              | `border-border`         | lesson `Resumen`, `En resumen`                                    |
| `feedback-correct`           | `CircleCheck`           | `--color-success-ink`           | `bg-success-ink/10` / `/14` | `border-success-ink/45` | workspace + quiz correct verdict                                  |
| `feedback-incorrect`         | `CircleX`               | `--color-danger`                | `bg-danger/10` / `/14`      | `border-danger/45`      | workspace + quiz incorrect verdict                                |
| `hint`                       | `Lightbulb`             | `--color-warning-ink` **(new)** | `bg-surface-2`              | `border-border`         | workspace `Pistas`                                                |
| `neutral` (fallback)         | caller-supplied or none | `--color-muted`                 | none                        | `border-border`         | everything else                                                   |

`feedback-*` are deliberately the only pair with a 45 % border plus a tint. Verdicts are the one place
in the product allowed to raise its voice.

### 2.3 Applying it to lesson prose (item 4)

Implement in `src/components/learn/markdown.tsx` as an `h2` override — **no content edits**:

```
const PROSE_SECTION: Record<string, Category> = {
  "por que importa": "why",
  "el concepto": "concept",
  "la sintaxis": "concept",
  "ejemplo resuelto": "example",
  "ejemplo ejecutable": "example",
  "errores comunes": "pitfall",
  "errores frecuentes": "pitfall",
  "verificar": "verify",
  "verificar el resultado": "verify",
  "resumen": "summary",
  "en resumen": "summary",
};
// key = heading text lowercased, accents stripped, trimmed.
```

- **Every `h2`** gets `border-border mt-10 border-t pt-8`. The rule is what creates the rhythm and it
  costs nothing per heading; this alone fixes the "one long column" problem for the ~300 unique
  headings.
- **Matched heading** → additionally render `SectionHeader` with `as="h2"`, the category icon, and the
  heading text as the title (no eyebrow — the title _is_ the label).
- **`Resumen` / `En resumen`** additionally wrap the remaining content in the `summary` callout
  (`bg-surface-2 rounded-md border border-border p-5`). Safe because all 80 occurrences are the last
  heading of their body (verified).
- **Unmatched heading** → plain `h2` at `text-[1.375rem] font-semibold`, with the same top rule.
- `h3` moves from the inherited weight 700 to `font-semibold` (600), so `h2` and `h3` differ by weight
  as well as size.
- Add a sticky ToC on `lg:` in `leccion/[slug]/page.tsx`: `<nav aria-label="En esta lección">` in a
  `lg:sticky lg:top-24` sidebar listing every `h2`; the current item gets a 2 px left rail in
  `--color-primary` **and** `aria-current="true"`. Requires extracting headings from `body_md` on the
  server — a regex over `^## ` is sufficient and testable.

**This is where a glyph earns its place:** four fixed icons repeating in the same position across 74
lessons become navigation. The learner learns "orange target = why this matters, amber triangle = the
trap" in two lessons and reads faster forever. That is the opposite of decoration.

### 2.4 Applying it to the workspace panels (item 6)

Rebuild `exercise-workspace.tsx` around three ranks instead of seven peers.

| Panel                              | Rank                   | Chrome                                                                                       | Header                                                                                                                                                    |
| ---------------------------------- | ---------------------- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Situación + Lo que pide el negocio | 1                      | `rounded-lg border border-border bg-surface p-5 shadow-sm ring-1 ring-inset ring-primary/20` | `SectionHeader as="h2" category="neutral"`, `title` at `text-xl`; the business question below as `<p class="text-lg font-medium">`, **not** a second `h2` |
| Columnas esperadas                 | 2                      | nested `bg-surface-2 rounded-md p-3` **inside** rank 1                                       | `SectionHeader as="h3" category="schema"`, eyebrow only                                                                                                   |
| Tu consulta (editor)               | 1                      | as rank 1, no ring                                                                           | `SectionHeader as="h2" category="neutral"` icon `SquareTerminal`, engine status as `aside`                                                                |
| Resultado                          | 1                      | as rank 1                                                                                    | `SectionHeader as="h2"` icon `Table2`, rows/ms meta as `aside`                                                                                            |
| Retroalimentación                  | 1, **state-dependent** | see §4.3                                                                                     | `SectionHeader as="h2" category={verdict}`                                                                                                                |
| Teoría relevante                   | 3                      | `bg-surface-2 rounded-md border border-border p-4`, **no shadow**                            | `SectionHeader as="h2" category="concept"`, eyebrow only                                                                                                  |
| Definiciones de tablas             | 3                      | as Teoría                                                                                    | `SectionHeader as="h2" category="schema"`, `DatasetBadge` as `aside`                                                                                      |
| Pistas                             | 3                      | as Teoría                                                                                    | `SectionHeader as="h2" category="hint"`                                                                                                                   |
| Solución                           | 3, collapsed           | `rounded-md border border-dashed border-border p-4`                                          | `summary` gets `SectionHeader category="neutral"` + a rotated `ChevronDown` — one disclosure language                                                     |

Rank 1 = white surface + shadow + `h2 text-xl`. Rank 3 = `surface-2`, no shadow, eyebrow-only header.
That single distinction — reference material sits _in_ a well, work surfaces sit _above_ the page —
does more for perceived quality than any colour choice, and it moves the accent off
`Teoría relevante` where it was misspent.

Also:

- Wrap `Definiciones de tablas`, `Pistas` and `Solución` in `<aside aria-label="Material de
referencia">` on `lg:`, so screen-reader users get the grouping the eye gets.
- Collapse the `text-[10px]` soup in `SchemaBrowser` to two sizes: `text-xs` for column
  name/type/description, and PK/FK as one `text-[11px] font-mono text-muted` suffix with `sr-only`
  expansions ("clave primaria", "referencia a …"). Abbreviations must be explained
  (`.claude/rules/accessibility.md:18`).

---

## 3. Emoji vs icons — the recommendation, plainly

**Recommendation: no emoji anywhere in the interface or in lesson prose. Use lucide icons under the
§2 vocabulary.** I checked the current state: a Unicode scan of all of `src/**` returns **zero**
emoji today. The right move is to keep that and spend the budget on the icon system.

The reasons, in the order that matters commercially:

1. **Brand register.** The buyer is a 28-year-old analyst deciding whether this looks like a product
   a senior would recommend. Emoji in headings is the visual signature of free Notion templates and
   bootcamp Instagram carousels. `DESIGN_SYSTEM.md:3` already commits to "not childish" and `:54`
   already states "No emoji in product chrome". Emoji-per-heading would contradict the document you
   would then have to show a partner or a corporate buyer.
2. **You cannot control the rendering.** Emoji are drawn by the _operating system_ font: the same
   character is flat on Android, glossy on iOS, and different again on Windows 11 vs Windows 10 — and
   part of your audience is on Windows 10. Your brand palette does not exist inside an emoji. A
   lucide icon inherits `currentColor`, so it is literally your `--color-accent-ink` and it follows
   dark mode; an emoji is the same glossy sticker on a `#0E1117` background, which is exactly where
   emoji look worst.
3. **Size and alignment.** Emoji carry their own metrics and sit on the text baseline, so they cannot
   be locked to a 32 px container and a column of emoji headings never aligns. Misalignment is the
   thing readers perceive as "cheap" without being able to name it.
4. **Screen readers.** A target emoji is announced as "dardo al blanco" before every heading — noise.
   `aria-hidden` on an emoji is a hack that also removes it from find-in-page. Lucide icons are SVG
   with `aria-hidden="true"` and are silently skipped, which is the correct behaviour for a
   decorative glyph beside a text label (`.claude/rules/accessibility.md:9`).
5. **Consistency at scale.** ~700 headings. An icon set gives you eight decisions; emoji give you 700
   temptations, and the 700th will be a rocket.

**Where a glyph does earn its place** (icons, not emoji):

- The recurring lesson sections (§2.3) — because they repeat 224 times and become navigation.
- Workspace panel eyebrows (§2.4) — seven panels, and the icon is the fastest re-orientation cue
  after looking away at the editor.
- Verdicts (correct / incorrect / partial) — mandatory, since status must never be colour-only.
- Lesson kind, level, dataset, badge identity — already specified in `DESIGN_SYSTEM.md:56-58`.

**Where a glyph must not go:** inside body paragraphs; on the ~300 unique lesson headings; on KPI
numbers that are already labelled; as bullet markers; more than once per block. And **never two icons
in one header** — icon + eyebrow + title only.

**Illustration is the thing actually missing.** If the goal is "more visually attractive", the honest
answer is not glyphs in prose — it is one restrained **flat geometric illustration per level** (four
total) at the top of each level group on `/ruta` and on the empty states, in
`--color-primary`/`--color-accent` duotone, exactly as `DESIGN_SYSTEM.md:58` already promises. Four
SVGs, drawn once, raise perceived production value far more than 224 emoji, add no dependency (static
files in `public/`), and are a separate small commission. **No clipart or stock art**: it is the
fastest way to look like a 2012 WordPress theme, and licensing is a real liability for a paid
product.

**If emoji ever appear in authored content:** strip them in review. If one is genuinely needed as
_content_ (quoting a chat message inside an exercise scenario), keep it inside the quoted string only,
never in a heading or a UI label. Worth adding to `docs/CONTENT_GUIDELINES.md` and to
`content:verify` as a lint that fails on emoji in `title` and in `^##` lines.

---

## 4. Quiz result screen (item 16)

### 4.1 Layout

```
┌─ VERDICT ────────────────────────────────────────────────────────┐  rank 1
│ [icon 40px]  APROBADO / NO ALCANZADO           (eyebrow, uppercase)│ rounded-lg, border-2,
│ h2  «8 de 10 correctas»            text-3xl font-heading           │ tint /10 (/14 dark),
│ p   «Superaste el 80 % requerido.»                                 │ ring-1 ring-inset
│ ── chips: +40 XP · Sección completada   (only when true)            │
│ [Continuar]  [Repetir]  [Ir a repaso]         ← actions live HERE   │
└──────────────────────────────────────────────────────────────────┘
        ↑ focus moves here on submit (tabIndex={-1} + .focus())

h2 «Revisión»  + p «Revisa primero las 2 que fallaste.»   ← section heading with top rule
[ Todas (10) | Falladas (2) ]        ← optional toggle group, aria-pressed

┌─ Q1 ─────────────────────────────────────────────────────────────┐  rank 2
│ ▌ [CircleCheck] PREGUNTA 1 · CORRECTA         (h3 via eyebrow)     │  2 px left rail
│   prompt…                                                          │
│   dl  Tu respuesta   → …                                           │
└──────────────────────────────────────────────────────────────────┘
┌─ Q2 ─────────────────────────────────────────────────────────────┐
│ ▌ [CircleX] PREGUNTA 2 · INCORRECTA                                │
│   prompt…                                                          │
│   dl  Tu respuesta       → …   (CircleX + sr-only)                 │
│   dl  Respuesta correcta → …   (CircleCheck + sr-only)             │
│   ┌ [TriangleAlert] POR QUÉ NO ─────────┐   Callout `pitfall`       │
│   ┌ [BookOpen] EXPLICACIÓN ────────────┐   Callout `concept`        │
│   → Repasar «{lección}»                     (link, when known)      │
└──────────────────────────────────────────────────────────────────┘
```

Concrete changes against today's file:

- **Verdict box** (`quiz-runner.tsx:56-80`): `rounded-lg border-2 p-5 ring-1 ring-inset` with
  `border-success-ink/45 bg-success-ink/10 ring-success-ink/15` when passed and
  `border-warning/45 bg-warning/10 ring-warning/15` when not. Icon `CircleCheck` / `TriangleAlert` in
  a `size-10 rounded-md border` container. Eyebrow `APROBADO` / `NO ALCANZADO` in
  `--color-success-ink` / `--color-warning-ink`. The score becomes a real `<h2>`. Keep
  `role="status"`; **add** `tabIndex={-1}`, `id="quiz-resultado"` and a `ref.focus()` in an effect on
  the `result` transition. Focus the region, not a button — announce, then let the user choose.
- **Action buttons move up into the verdict box.** Today they sit at the very bottom (118-139) after
  ten review cards; on a 10-question quiz at 360 px that is three screens of scrolling before the
  learner can continue. Keep a secondary copy at the bottom.
- **Per-question card** (85): `rounded-md border border-border bg-surface p-4 pl-5 border-l-2` with
  `border-l-success-ink` (correct) or `border-l-danger` (incorrect). The rail plus icon + eyebrow is
  the "clearly marked" being asked for, and it is quiet enough to repeat ten times. **Do not tint the
  whole wrong-answer card** — ten tinted cards is a traffic light, not a review.
- **The question number becomes a heading.** `sr-only` is not enough: make the eyebrow itself the
  `h3` (`SectionHeader as="h3"`), so the review is navigable by headings.
- **Answers become a `<dl>`**: `dt` in `text-muted text-xs uppercase`, `dd` in `font-mono text-sm`.
  `formatAnswer` must render option bodies through `MarkdownClient`, not as raw markdown source.
- **`whyIncorrect_md` and `explanation_md` get labels** — `Callout category="pitfall"` and
  `category="concept"` — and their tints go from `/5` to `/10`. Today they are unlabelled 1.15:1
  rectangles.
- A score **ring** is optional and I recommend against it: "8 de 10" plus the pass sentence is
  unambiguous and cheaper. If a bar is wanted, reuse the existing `role="progressbar"` pattern with
  the threshold marked by a 2 px tick and the text label "umbral 80 %".

### 4.2 States for the incoming per-question immediate feedback

Another agent is shortening the quiz and grading each answer as it is given. Treat the option rows as
a four-state machine. All four states differ in **shape / icon / border weight**, not only in hue.

| State                           | Option row                                                                                                                                                                                                                          | Row markers                                                  | Verdict area                                                                                                                                                                           |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pending` (unanswered)          | `border-border bg-surface`                                                                                                                                                                                                          | native radio/checkbox only                                   | no verdict block; progress text only                                                                                                                                                   |
| `selected` (chosen, not graded) | `border-primary bg-primary/10 ring-1 ring-inset ring-primary/20`                                                                                                                                                                    | input checked                                                | primary button enabled, label `Comprobar`                                                                                                                                              |
| `answered-correct`              | chosen row `border-success-ink border-l-2 bg-success-ink/10`; other rows `border-border text-muted`                                                                                                                                 | `CircleCheck` at the row's right edge + `sr-only` "correcta" | `Callout category="feedback-correct"`, eyebrow `CORRECTA`, `explanation_md` inside; button becomes `Siguiente`                                                                         |
| `answered-incorrect`            | chosen row `border-danger border-l-2 bg-danger/10` + `CircleX` + `sr-only` "tu respuesta, incorrecta"; correct row `border-success-ink border-dashed border-l-2 bg-success-ink/10` + `CircleCheck` + `sr-only` "respuesta correcta" | as described                                                 | `Callout category="feedback-incorrect"`, eyebrow `INCORRECTA`, then `pitfall` callout with `whyIncorrect_md`, then `concept` callout with `explanation_md`; button becomes `Siguiente` |

Mandatory behaviour:

- Once graded, **all** inputs of that question get `disabled` **and** the `fieldset` gets
  `aria-describedby` pointing at the verdict callout id. Do not silently ignore clicks.
- The verdict callout is `role="status" aria-live="polite"` and is inserted _after_ the fieldset, so
  the announcement order is answer → verdict → why. Never `aria-live="assertive"`.
- Focus stays on the chosen input; the primary button's label changes from `Comprobar` to `Siguiente`
  in place (same DOM node, so the focus ring does not jump). On the last question it reads
  `Ver resultado`.
- The correct answer is revealed through **two non-colour channels**: the dashed border and the
  `CircleCheck` glyph, plus the `sr-only` label. Someone reading only shapes must still conclude "the
  dashed one with the tick is the right answer".
- Under `prefers-reduced-motion`, no reveal animation; otherwise a single 180 ms opacity/height
  ease-out on the verdict callout. **Never** a shake on a wrong answer — that reads as a game show.
- The progress bar gains a per-question segment strip (`n` segments, `aria-hidden`, backed by the
  existing `role="progressbar"` text) where each segment is neutral / correct-tinted /
  incorrect-tinted, **plus** an `sr-only` running tally "3 correctas de 4 respondidas". Segments are
  ≥ 4 px tall with a 1 px gap; they are decorative, so 3:1 is not required, but keep them ≥ 1.5:1
  against `--surface-2` so they are visible. Segments must not be clickable.

### 4.3 Workspace `Retroalimentación`, same grammar

`panels.tsx:147-208` and its container (`exercise-workspace.tsx:434-474`) should use the identical
`feedback-correct` / `feedback-incorrect` tokens, so the verdict language is the same in the quiz and
in the exercise:

- Container border/tint changes with the verdict (`border-success-ink/45 bg-success-ink/10` /
  `border-danger/45 bg-danger/10`); the header becomes `SectionHeader category={verdict}`.
- `text-success` at `panels.tsx:152` → `text-success-ink` (**fixes 4.35:1**).
- `text-success` at `exercise-workspace.tsx:444` → `text-success-ink` on `bg-success-ink/10`
  (**fixes 3.84:1**; the corrected pair measures 5.27:1).
- Blocking items: raise `bg-danger/5` to `/10`.
- The reward line and the "next" link become a `<footer>` inside the panel with a top rule, not a
  third tinted box.
- Not-yet-submitted state (today a bare `text-muted` sentence at line 137) gets the empty-state
  treatment — `SectionHeader category="neutral"` with `CircleDashed` + the sentence — so the panel
  keeps a stable shape before and after submission and the layout does not jump.

---

## 5. Badges (item 17)

### 5.1 Principles

1. **Use the icon the database already stores.** The single highest-value change on this screen.
2. **Category carries hue (identity); tier carries intensity (progression).** Colour is never the only
   channel: category is also a text group heading, tier is also a Roman numeral chip with an
   `sr-only` expansion.
3. **Earned vs locked differs in three channels**: icon (real icon vs `Lock` chip), border style
   (solid vs dashed) and text (date vs "Aún no obtenida"). **No `opacity`.**
4. **No metal gradients, no shine, no glow.** Tier is tint strength on a flat surface. A gold
   gradient with a sparkle is the visual language of a slot machine.

### 5.2 Config — new file `src/config/badges.ts`

Keeps the visual decision in config (`.claude/rules/architecture.md`: configuration over constants)
and needs **no migration**. `badges.icon` from the database stays the fallback.

```
export type BadgeCategory = "practica" | "autonomia" | "dominio" | "constancia" | "nivel";
export interface BadgeVisual { icon: LucideIcon; category: BadgeCategory; tier: 1 | 2 | 3 }
```

The full set — all twelve seeded badges
(`supabase/migrations/20260918210000_gamification.sql:319-331`):

| #   | slug                | title            | `badges.icon` (DB) | **Icon to render**  | Category   | Tier |
| --- | ------------------- | ---------------- | ------------------ | ------------------- | ---------- | ---- |
| 1   | `primera-consulta`  | Primera consulta | `sparkles`         | `Sparkles`          | práctica   | I    |
| 2   | `cinco-ejercicios`  | En marcha        | `rocket`           | `Rocket`            | práctica   | II   |
| 3   | `veinte-ejercicios` | Constancia       | `flame`            | **`TrendingUp`**    | práctica   | III  |
| 4   | `sin-pistas-cinco`  | Sin ayuda        | `brain`            | `Brain`             | autonomía  | II   |
| 5   | `seccion-completa`  | Sección completa | `check-circle`     | **`BookCheck`**     | dominio    | I    |
| 6   | `tres-secciones`    | Tres secciones   | `layers`           | **`Library`**       | dominio    | II   |
| 7   | `racha-3`           | Racha de 3 días  | `calendar-check`   | `CalendarCheck`     | constancia | I    |
| 8   | `racha-7`           | Racha semanal    | `calendar-days`    | **`CalendarRange`** | constancia | II   |
| 9   | `racha-30`          | Racha mensual    | `trophy`           | **`Flame`**         | constancia | III  |
| 10  | `nivel-3`           | Nivel 3          | `star`             | `Star`              | nivel      | I    |
| 11  | `nivel-5`           | Nivel 5          | `award`            | **`Medal`**         | nivel      | II   |
| 12  | `nivel-10`          | Nivel 10         | `crown`            | `Crown`             | nivel      | III  |

Reasons for the six overrides (bold):

- `flame` → `TrendingUp` for #3: `Flame` is already the streak language across the app
  (`aprender/page.tsx:155`). Two meanings for one glyph is worse than a duller glyph. `Flame` moves to
  #9, the 30-day streak, where it belongs and where it is the payoff.
- `trophy` → `Flame` for #9: `Trophy` is reserved for the **desafío** lesson kind
  (`DESIGN_SYSTEM.md:56`, `learning-path.tsx:71`). A badge must not reuse a lesson-kind icon.
- `check-circle` → `BookCheck` and `layers` → `Library` for #5/#6: `CheckCircle2` is the universal
  "correct" marker (`panels.tsx:156`, `quiz-runner.tsx:88`) and `Layers` is the _intermediate level_
  icon (`learning-path.tsx:28`). Both collide.
- `award` → `Medal` for #11: `Award` should stay reserved for the badges _feature_ itself (page
  header, nav, the dashboard card at `aprender/page.tsx:196`). A member of a set must not wear the
  set's own symbol.

Every lucide name above was verified present in lucide-react 1.47.0. The map must fall back to
`Award` for an unknown slug, so a future badge never renders blank.

The DB `icon` column should eventually be reconciled with this table (six `update`s in one migration,
`database-engineer`) so the two sources cannot disagree — but that is a "later" item; the config map
is authoritative for rendering from day one.

### 5.3 Category → token, tier → treatment

| Category     | Group heading (es-419) | Ink token                       | Icon container (earned)                                      |
| ------------ | ---------------------- | ------------------------------- | ------------------------------------------------------------ |
| `practica`   | Práctica               | `--color-primary`               | `bg-primary/{T} border-primary/{B} text-primary`             |
| `autonomia`  | Autonomía              | `--color-info`                  | `bg-info/{T} border-info/{B} text-info`                      |
| `dominio`    | Dominio                | `--color-success-ink`           | `bg-success-ink/{T} border-success-ink/{B} text-success-ink` |
| `constancia` | Constancia             | `--color-accent-ink`            | `bg-accent-ink/{T} border-accent-ink/{B} text-accent-ink`    |
| `nivel`      | Nivel                  | `--color-achievement` **(new)** | `bg-achievement/{T} border-achievement/{B} text-achievement` |

Tier → `{T}` / `{B}`:

| Tier | Numeral chip | `{T}` light | `{T}` dark | `{B}` | Extra                                              |
| ---- | ------------ | ----------- | ---------- | ----- | -------------------------------------------------- |
| I    | `I`          | 10          | 14         | 30    | —                                                  |
| II   | `II`         | 14          | 20         | 45    | —                                                  |
| III  | `III`        | 18          | 26         | 60    | `ring-1 ring-inset ring-{hue}/25` on the container |

The numeral chip sits on the card, not on the icon: `text-[11px] font-semibold tracking-wide` in the
category ink, with `<span class="sr-only">nivel {n} de 3 en {categoría}</span>`. Progression is
therefore legible in greyscale (numeral + tier-III ring) and to a screen reader (sentence), never by
tint alone.

### 5.4 Card anatomy

```
<li class="{cardChrome} flex gap-3 rounded-lg border p-4">
  <span aria-hidden="true" class="{containerChrome} relative flex size-11 shrink-0 items-center
        justify-center rounded-full border">
    <Icon class="size-5" strokeWidth={1.75} />
    {locked && <Lock class="absolute -right-0.5 -bottom-0.5 size-4 rounded-full border
                            border-border bg-surface p-0.5" />}
  </span>
  <div class="min-w-0 space-y-1">
    <div class="flex items-baseline gap-2">
      <h3 class="font-heading text-base font-semibold">{title}</h3>
      <span class="{ink} text-[11px] font-semibold">{numeral}</span>
    </div>
    <p class="text-muted text-sm">{description}</p>
    <p class="inline-flex items-center gap-1.5 text-xs {stateInk}">
      <StateIcon aria-hidden="true" class="size-3.5" /> {stateText}
    </p>
  </div>
</li>
```

| State      | `cardChrome`                                              | `containerChrome`                                                                                                                      | `StateIcon` + text                                             |
| ---------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| **earned** | `border-border bg-surface shadow-sm`                      | category + tier tints (§5.3)                                                                                                           | `CircleCheck` + "Obtenida el {fecha}" in `--color-success-ink` |
| **locked** | `border-border border-dashed bg-surface` (**no opacity**) | `bg-surface-2 border-border text-muted`, the **real badge icon at `strokeWidth 1.25`**, plus the `Lock` micro-chip pinned bottom-right | `Lock` + "Aún no obtenida" in `--color-muted`                  |

Showing the real icon (dimmed to neutral) instead of a padlock for the whole badge is the point: the
learner sees _what_ they have not earned yet, which is the only reason a locked badge belongs on the
page. The padlock becomes a 16 px overlay, and the state is still stated in words.

Circles (rather than §2.1's `rounded-md`) are correct here: a badge is an emblem, and the shape
difference keeps emblems from being confused with section headers.

### 5.5 Page structure for `/logros`

- Group the grid by category, each group led by `SectionHeader as="h2" category="neutral"` (icon = the
  tier-III icon of that family), with a per-group counter "2 de 3 obtenidas" and a
  `role="progressbar"`. Five groups of two or three cards read as a collection; twelve loose cards
  read as a list.
- Order within a group is tier I → III. Do **not** sort earned first: the next target must stay
  visibly adjacent to the last one earned.
- The header gains an overall bar for "{earned} de {total}" (`badges.summary` already exists) and
  keeps the honest framing "reconocen constancia y dominio, no velocidad".
- Dashboard (`aprender/page.tsx:202-215`): replace the text-only pills with the same icon container at
  `size-9`, `aria-label` = badge title + state, each wrapped in a real `<Link>` to `/logros#{slug}`
  with `min-h-11`. Drop the `title` attribute.
- Reduced motion: the badge-earned celebration stays a single ≤ 600 ms scale/opacity on the one new
  card (`DESIGN_SYSTEM.md:62`), disabled under `prefers-reduced-motion`. No confetti.

---

## 6. Proposed token changes (NOT applied — for `frontend-engineer` + `architect`)

Two new tokens. Everything else in this report reuses existing tokens.

```css
/* :root (light) */
--warning-ink: #8a5e12; /* warning as text/eyebrow: --warning (#B7791F) is only 3.64:1 on white */
--achievement: #6d3fc4; /* badge family «nivel» identity — same value as --dataset-marketplace,
                            kept as a separate token so dataset identity and badge identity can
                            diverge later. Do not "clean up" into one token. */

/* .dark */
--warning-ink: #f0b35a; /* = --warning; already 9.28:1 on the dark surface */
--achievement: #b69bf0;

/* @theme inline */
--color-warning-ink: var(--warning-ink);
--color-achievement: var(--achievement);
```

`docs/DESIGN_SYSTEM.md` §2 gains both rows (with the measured ratios of §7), §5 gains `SectionHeader`
and `Callout`, §6 gains the badge icon map, §9 gains the quiz-result and badges wireframes.

---

## 7. WCAG 2.2 AA verification

All ratios computed from the hex values in `src/app/globals.css`; tints computed as sRGB alpha
composites over `--surface` (`#FFFFFF` light, `#161B25` dark), which is what a Tailwind `/NN`
modifier produces.

### 7.1 New tokens as text

| Pair                                                   | Light              | Dark               | Req.       | Verdict |
| ------------------------------------------------------ | ------------------ | ------------------ | ---------- | ------- |
| `warning-ink` on `surface`                             | **5.69:1**         | **9.28:1**         | 4.5        | pass    |
| `warning-ink` on `surface-2`                           | **5.03:1**         | 8.26:1             | 4.5        | pass    |
| `warning-ink` on its own tint (10 % light / 14 % dark) | **5.10:1**         | 7.01:1             | 4.5        | pass    |
| `achievement` on `surface`                             | **6.65:1**         | **7.34:1**         | 4.5        | pass    |
| `achievement` on its own tint, tier I / II / III       | 5.72 / 5.37 / 5.04 | 5.73 / 5.06 / 4.44 | 3.0 (icon) | pass    |

### 7.2 Every §2.2 category — ink on its own tint (icon ≥ 3:1, eyebrow text ≥ 4.5:1)

Tints at 10 % light / 14 % dark:

| Category ink                                            | on tint (light) | on tint (dark) | on `surface` (light / dark) |
| ------------------------------------------------------- | --------------- | -------------- | --------------------------- |
| `accent-ink` (`why`, `constancia`)                      | 4.63:1          | 6.68:1         | 5.34 / 8.73                 |
| `info` (`concept`, `autonomia`)                         | 4.73:1          | 6.04:1         | 5.41 / 7.83                 |
| `primary` (`example`, `practica`)                       | 5.48:1          | 4.93:1         | 6.37 / 6.14                 |
| `warning-ink` (`pitfall`, `hint`)                       | 5.10:1          | 7.01:1         | 5.69 / 9.28                 |
| `success-ink` (`verify`, `feedback-correct`, `dominio`) | 5.27:1          | 6.05:1         | 6.09 / 7.79                 |
| `danger` (`feedback-incorrect`)                         | 4.49:1          | 5.05:1         | 5.20 / 6.18                 |
| `achievement` (`nivel`)                                 | 5.72:1          | 5.73:1         | 6.65 / 7.34                 |

All ≥ 4.49:1 → every eyebrow passes as text (`danger` at 4.49 rounds to the 4.5 threshold; if the QA
tool is strict, drop the danger tint to `/8`, which measures 4.63:1) and every icon passes with
margin.

### 7.3 Body and muted text inside tinted callouts

| Tint                                      | `--text`      | `--muted`       | Req.                |
| ----------------------------------------- | ------------- | --------------- | ------------------- |
| any category tint, 10 % light             | 14.98–15.23:1 | **5.13–5.22:1** | 4.5 pass            |
| any category tint, 14 % light (tier II)   | 14.07–14.41:1 | **4.82–4.93:1** | 4.5 pass            |
| any category tint, 18 % light (tier III)  | 13.20–13.62:1 | **4.52–4.66:1** | 4.5 pass, no margin |
| any category tint, 14 % dark              | 11.14–11.90:1 | **5.70–6.17:1** | 4.5 pass            |
| any category tint, 26 % dark (tier III)   | 8.17–9.56:1   | **4.24–4.56:1** | 4.5 **3 of 7 fail** |
| `surface-2` (`summary`, `schema`, `hint`) | 15.40 / 12.96 | 5.27 / 6.72     | 4.5 pass            |

**Binding rule:** tier II and tier III tints (14 %+ light, 20 %+ dark) are permitted **only on the
badge icon container, which contains no text**. Any surface carrying `--color-muted` text is capped at
10 % light / 14 % dark. With that cap, every pair above passes.

### 7.4 Non-text contrast (1.4.11)

- Category **borders** at 30 % measure 1.53–1.61:1 (light) and 1.65–1.92:1 (dark) against `--surface`;
  at 45 %, 1.94–2.11 / 2.23–2.89. These are below 3:1 and that is **compliant**: a callout border is
  not the sole identifier of any control — the eyebrow text and the icon are. The same reasoning
  already applies to `--color-border` itself (1.35:1). No control specified in this report depends on
  a border as its only cue.
- **Quiz option rows are controls**, so the selected state must not rest on a sub-3:1 border alone. It
  does not: the native radio/checkbox is the state indicator and `border-primary` (6.37 / 6.14 against
  surface) supports it. Keep native inputs; do not replace them with styled divs.
- **Verdict left rails** are `border-l-2` in `success-ink` (6.09 / 7.79) or `danger` (5.20 / 6.18) —
  well past 3:1.
- **Existing failures to fix** (§1): `logros/page.tsx:40` `text-warning` on `bg-warning/20` =
  **2.91:1**; `panels.tsx:152` = **4.35:1**; `exercise-workspace.tsx:444` = **3.84:1**;
  `logros/page.tsx:35` `opacity-70` → muted at **3.11:1**.

### 7.5 Focus visibility (2.4.7, 2.4.11)

- `globals.css:113-117` gives a global 2 px `--ring` outline with 2 px offset. `--primary` measures
  6.37 / 6.14 against `--surface` and 6.00 / 6.73 against `--bg` — passes 3:1 everywhere.
- **New requirement:** the quiz verdict region receives focus programmatically (§4.1). Because it is
  focused via `tabIndex={-1}` it must render the same 2 px ring — do **not** add `focus:outline-none`.
  It sits in a `space-y-6` flow with no `overflow-hidden` ancestor, so the 2 px offset is safe.
- Tinted callout containers must not use `overflow-hidden`, or a focused link inside them loses its
  offset ring (2.4.11).
- The sticky lesson ToC must be `lg:sticky lg:top-24` accounting for the app-header height, so a
  focused ToC link is never covered.

### 7.6 Target size (2.5.8: ≥ 24 px; 44 px on mobile bars)

- Quiz option rows: `p-3` + one line of `text-sm` ≈ 44 px — passes. Keep `p-3` minimum and keep the
  whole `<label>` as the hit area.
- Badge cards are not interactive today; if §5.5 turns the dashboard pills into links they need
  `min-h-11` or the link must wrap the whole card.
- `SectionHeader` icon containers are `aria-hidden` and non-interactive — no requirement.
- The `summary` element for Solución keeps `min-h-11`.
- The proposed quiz filter toggle (`Todas | Falladas`) needs `h-9` minimum and `aria-pressed`.
- The progress-segment strip is decorative and must not be clickable.

### 7.7 Reduced motion (2.3.3)

`globals.css:121-132` already zeroes all animation and transition durations under
`prefers-reduced-motion`, so every new state change here (verdict reveal, ToC highlight, badge earn)
is automatically safe — **provided** they are expressed as CSS transitions/animations and not as
JS-driven `requestAnimationFrame` loops, which the media query cannot disable. No parallax, no
confetti, no shake.

### 7.8 No colour-only meaning (1.4.1)

| Meaning                                 | Colour                    | Icon                            | Text                               | Shape                    |
| --------------------------------------- | ------------------------- | ------------------------------- | ---------------------------------- | ------------------------ |
| Lesson section kind                     | ink hue                   | category icon                   | heading text                       | top rule                 |
| Quiz answer correct                     | `success-ink`             | `CircleCheck`                   | "Correcta"                         | 2 px left rail           |
| Quiz answer incorrect                   | `danger`                  | `CircleX`                       | "Incorrecta"                       | 2 px left rail           |
| The correct option after a wrong answer | `success-ink`             | `CircleCheck`                   | `sr-only` "respuesta correcta"     | **dashed** border        |
| Quiz passed / failed                    | `success-ink` / `warning` | `CircleCheck` / `TriangleAlert` | "Aprobaste" / "No alcanzaste"      | 2 px border              |
| Badge earned                            | category hue              | real icon                       | "Obtenida el {fecha}"              | solid border + shadow    |
| Badge locked                            | neutral                   | real icon + `Lock` chip         | "Aún no obtenida"                  | dashed border, no shadow |
| Badge tier                              | tint strength             | —                               | Roman numeral + `sr-only` sentence | tier III ring            |

### 7.9 Structure and announcements

- Every panel header rendered by `SectionHeader` with `as` produces a real heading, so the three
  currently `<p>`-labelled workspace panels (`Columnas esperadas`, `Definiciones de tablas`,
  `Tu consulta`) enter the outline. Levels: page `h1` → panel `h2` → nested `h3`, no skips.
- Quiz result: `<section aria-labelledby="quiz-resultado-h" tabIndex={-1}>` with `role="status"` on
  the score line only — not on the whole review list, which would re-announce ten cards.
- Per-question feedback: `aria-live="polite"` on the verdict callout, `aria-describedby` from the
  fieldset, inputs `disabled` after grading.
- `/logros`: one `<h2>` per category group; the grid stays a `<ul>`; each card an `<li>` with an `h3`.
- Lesson ToC: `<nav aria-label="En esta lección">` with `aria-current="true"` on the active item.
- `axe` must run on `/leccion/[slug]`, `/ejercicio/[slug]`, `/logros`, the quiz question state **and**
  the quiz result state. The current suite cannot reach the post-submit state without driving a
  submission — `qa-engineer` to extend it.

---

## 8. Prioritised implementation list

### Do now — highest perceived quality per unit of work

| #   | Change                                                                                                                                                                                                        | Files                                                                 | Why first                                                                        | Effort |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------ |
| 1   | Render the per-badge icon from a new `src/config/badges.ts` map (§5.2); remove `opacity-70`; fix `text-warning` on `bg-warning/20`; show the real icon dimmed + `Lock` chip when locked                       | `src/app/(learn)/logros/page.tsx`, new `src/config/badges.ts`         | Answers item 17 completely, fixes two WCAG failures, and the data already exists | S      |
| 2   | Add `--warning-ink` and `--achievement`; fix the three success/warning contrast failures                                                                                                                      | `src/app/globals.css`, `panels.tsx:152`, `exercise-workspace.tsx:444` | Unblocks everything else; three of the four known AA failures                    | S      |
| 3   | Build `SectionHeader` + `Callout` with the §2.2 vocabulary                                                                                                                                                    | new `src/components/ui/section-header.tsx`, `callout.tsx`             | The primitive the rest depends on                                                | M      |
| 4   | Quiz result: verdict outranks review, actions move up, focus moves to the result, per-question `h3` + left rail, label the two explanation callouts, `/5`→`/10` tints                                         | `src/components/quiz/quiz-runner.tsx`                                 | Answers item 16; fixes a real keyboard defect (focus loss)                       | M      |
| 5   | Lesson prose: `h2` top rule for all headings + `PROSE_SECTION` map for the nine stable ones; `h3` to weight 600                                                                                               | `src/components/learn/markdown.tsx`, `src/app/globals.css`            | Answers item 4 across 74 lessons with **zero content edits**                     | M      |
| 6   | Workspace three-rank hierarchy (§2.4): reference panels drop to `surface-2` with no shadow, task and verdict become rank 1, the misspent accent leaves `Teoría relevante`, all seven panels get real headings | `src/components/workspace/exercise-workspace.tsx`, `panels.tsx`       | Answers item 6; fixes the broken heading outline                                 | M      |
| 7   | Fix the eight voseo strings in `quiz.*`                                                                                                                                                                       | `src/messages/es-419.json`                                            | Rule-6 violation, one-line edits                                                 | S      |
| 8   | Badge category groups + per-group counters on `/logros`; dashboard badge pills become labelled icon chips                                                                                                     | `logros/page.tsx`, `aprender/page.tsx`                                | Turns a list into a collection                                                   | S      |

### Later

| #   | Change                                                                                                                             | Why later                                                                                              |
| --- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| 9   | Per-question immediate-feedback states (§4.2)                                                                                      | Blocked on the other agent's grading change; spec is ready                                             |
| 10  | Sticky "En esta lección" ToC on `lg:`                                                                                              | Needs server-side heading extraction + tests                                                           |
| 11  | Dashboard de-duplication: drop level/XP/coins from the stats card; make "Continuar" the focal card with the `/ruta` ring treatment | Behavioural change worth a quick owner look                                                            |
| 12  | Reconcile `badges.icon` in the database with `src/config/badges.ts` (six updates, one migration)                                   | `database-engineer`; the config map is authoritative meanwhile                                         |
| 13  | Four level illustrations (flat geometric duotone SVGs in `public/`) for `/ruta` and empty states                                   | A real design commission; the biggest remaining "visually attractive" lever, and it adds no dependency |
| 14  | `content:verify` lint: fail on emoji in titles and `^##` lines; warn when a lesson's first `h2` is not `Por qué importa`           | Keeps the §2.3 convention true as content grows                                                        |
| 15  | Extract the `/ruta` level header to `SectionHeader`; retire inline card classes in favour of a `Panel` primitive                   | Cleanup once 3 and 6 have landed                                                                       |

---

## 9. Acceptance criteria (for `frontend-engineer` and `qa-engineer`)

1. `src/components/ui/section-header.tsx` exports exactly the categories of §2.2 and no call site
   passes ad-hoc colour classes. A unit test asserts every category renders an `aria-hidden="true"`
   svg plus a text label.
2. No lesson `h2` renders without either a category treatment or a `border-t` rule. A test renders
   `distinct-valores-unicos` and asserts that `Por qué importa` and `Resumen` receive their categories
   and that an unmatched heading (`DISTINCT y NULL`) does not.
3. After submitting a quiz, `document.activeElement` is the result region and that region's accessible
   name contains the score. Playwright test.
4. Each of the twelve badges renders a **distinct** icon: a test asserts
   `new Set(renderedIconNames).size === 12` and that an unknown slug falls back to `Award`.
5. No element in `/logros`, the quiz result or the workspace uses `opacity-*` on a container holding
   text.
6. `axe` reports zero violations on `/leccion/[slug]`, `/ejercicio/[slug]`, `/logros`, the quiz
   question state and the quiz result state, in both themes.
7. A greyscale check of the quiz result and `/logros`: correctness, pass/fail, earned/locked and tier
   remain distinguishable with colour removed.
8. At 360 px: no horizontal scroll on any of the four screens; workspace reference panels collapse
   below the editor; the quiz verdict actions are reachable without scrolling past the review list.
9. With `prefers-reduced-motion: reduce`, no transition or animation on the verdict reveal, the ToC
   highlight or the badge-earned state.
10. `docs/DESIGN_SYSTEM.md` is updated with the two tokens, the two components, the category table,
    the badge map and the two new wireframes, in the same change as the code.
