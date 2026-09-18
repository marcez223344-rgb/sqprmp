# Design System and Visual Direction

**Audience:** adults 25–35 in LATAM building a data career. **Feel:** contemporary, energetic, professional, trustworthy, inclusive. Not childish, not neon-cyberpunk, not corporate-stock, not gambling-like.

## 1. Brand concept

"Claridad con energía": a calm, data-blue foundation (credibility, focus) with a single warm accent (momentum, LATAM warmth) used sparingly for progress and calls to action. Visual metaphor: grids and result tables that turn into insight; illustrations are geometric, abstract data shapes, never mascots.

## 2. Color tokens (CSS variables, Tailwind 4 `@theme`)

| Token                | Light                                                              | Dark      | Use                                                                                            |
| -------------------- | ------------------------------------------------------------------ | --------- | ---------------------------------------------------------------------------------------------- |
| `--color-bg`         | `#F7F8FB`                                                          | `#0E1117` | page background                                                                                |
| `--color-surface`    | `#FFFFFF`                                                          | `#161B25` | cards, editor chrome                                                                           |
| `--color-surface-2`  | `#EEF1F7`                                                          | `#1E2533` | table headers, wells                                                                           |
| `--color-border`     | `#D9DEE8`                                                          | `#2A3242` |                                                                                                |
| `--color-text`       | `#151A24`                                                          | `#E8ECF3` | body (contrast ≥ 12:1)                                                                         |
| `--color-text-muted` | `#5B6474`                                                          | `#A3ACBD` | secondary (≥ 4.5:1)                                                                            |
| `--color-primary`    | `#2B4FE0`                                                          | `#7C93FF` | actions, links, focus                                                                          |
| `--color-primary-fg` | `#FFFFFF`                                                          | `#0E1117` |                                                                                                |
| `--color-accent`     | `#F2652E`                                                          | `#FF8A5B` | streaks, XP, highlights (sparingly)                                                            |
| `--color-accent-ink` | `#B8461A`                                                          | `#FFA17A` | accent used as **text** (eyebrows, labels): the base accent only reaches 3:1 on light surfaces |
| `--color-success`    | `#1C8A5A`                                                          | `#4CC38A` | correct (always with icon + text)                                                              |
| `--color-warning`    | `#B7791F`                                                          | `#F0B35A` | partial, hints                                                                                 |
| `--color-danger`     | `#C53A3A`                                                          | `#F27474` | errors                                                                                         |
| `--color-info`       | `#2E6F9E`                                                          | `#6FB6E8` | theory callouts                                                                                |
| Difficulty scale     | 1–5 use a **shape + label** (dot count + text), color is secondary |           |                                                                                                |

Rules: never encode status by color alone (icon + label always); minimum 4.5:1 for text, 3:1 for UI borders/icons; accent limited to ≤ 5 % of any screen.

## 3. Typography

- UI/body: **Inter** (variable), 16 px base, line-height 1.55; headings **Manrope** 600–700 (distinctive but sober); code/SQL: **JetBrains Mono** 14 px in editor, 13 px in result tables. All self-hosted via `next/font`.
- Scale (rem): 0.75, 0.875, 1, 1.125, 1.25, 1.5, 1.875, 2.25, 3.
- Spanish typographic conventions: ¿? ¡!, «» not required, sentence-case headings.

## 4. Spacing, radius, elevation

Spacing scale 4 px based (1–24). Radius: 6 (inputs), 10 (cards), 16 (modals), full (avatars/chips). Elevation: 3 subtle shadows; dark mode relies on borders more than shadows. Breakpoints: 360 (min), 640, 768, 1024, 1280, 1536.

## 5. Components (shadcn/ui base + custom)

Button (primary/secondary/ghost/danger, sizes sm/md/lg, loading state), Input/Textarea/Select/Combobox, Checkbox/Radio/Switch, Dialog/Sheet/Drawer, Tabs, Tooltip, Toast, Badge/Chip, Progress (bar + ring), Skeleton, Table (data results with sticky header, column types, copy cell, virtualized when > 200 rows), Card, Callout (teoría/consejo/error), Stepper (onboarding), Avatar (curated set), DifficultyIndicator, XpCounter, StreakFlame (respects reduced motion), CertificateCard, SqlEditor (CodeMirror wrapper), SchemaBrowser, HintPanel, FeedbackPanel, Paywall.

## 6. Iconography and illustration

Lucide icons (1.5 px stroke, 20/24 px). Illustrations: flat geometric compositions of tables, nodes and charts in primary/accent duotone; people illustrated as diverse abstract silhouettes when needed, never caricatures. Avatars: 24 curated geometric/animal/abstract illustrations in the brand palette (inclusive, gender-neutral options).

## 7. Motion

150–250 ms ease-out for state changes; celebratory moments (exercise correct, badge) use a single restrained animation ≤ 600 ms; all animation disabled under `prefers-reduced-motion`.

## 8. Accessibility standards (WCAG 2.2 AA)

Semantic landmarks, skip link, visible 2 px focus ring (`--color-primary` + offset), keyboard-operable editor (Esc to leave editor, documented), results table with `<caption>`, `scope`, row/column counts announced via live region, form errors linked with `aria-describedby`, dialogs with focus trap and return, contrast checked in CI via `axe` in Playwright, target size ≥ 24 px, no time limits on quizzes by default.

## 9. Key screens (textual wireframes)

**Landing (`/`)**: hero (value proposition, CTA "Empieza gratis con Google", social proof placeholders), "Cómo funciona" 3 steps, curriculum preview (levels + certificates), live demo editor (browser engine, read-only dataset, no login), pricing summary, founder note, FAQ, footer with legal links.

**Onboarding (`/onboarding`)**: 3-step stepper — Identidad (nombre, alias con validación en vivo, avatar grid) → Sobre ti (país, fecha de nacimiento, género opcional, nivel, objetivo, meta semanal) → Consentimiento (términos, privacidad con "por qué pedimos estos datos"). Progress saved between steps.

**Dashboard (`/aprender`)**: continue card (last activity), weekly goal ring, streak with freeze status, level/XP bar, next 3 lessons, mastery by topic (bars with labels), recent badges, review queue callout.

**Learning path (`/ruta`)**: vertical levels with sections as cards (status icon + label: completado / en curso / bloqueado / próximamente), free badge on free items, certificate milestones.

**Exercise workspace (`/ejercicio/[slug]`)** desktop 3-column: left (scenario, business question, expected columns, tabs: Esquema | Teoría | Pistas), center (editor with Run ⌘/Ctrl+Enter, Submit, Reset, Save draft; below: results table with timing/row count/truncation notice; feedback panel with categorized findings), right collapsible (progress, rewards preview, related lesson). Mobile: stacked with sticky bottom action bar; editor height limited; schema as bottom sheet. States: loading dataset (progress), empty (run to see results), error (Postgres message + hint + position highlight), incorrect (diff summary: missing/extra columns, row count, first differing rows), correct (rewards, improvements, next), locked (paywall card with what unlocks), offline engine fallback.

**Quiz (`/leccion/[slug]/quiz`)**: one question per screen, progress, no timer, submit → explanation + distractor reasons, summary with review links.

**Profile / settings**: identity, avatar, alias (change limited), certificate name, privacy (leaderboard opt-in), goals, access status (plan, purchase date, invoice ref), export/delete account.

**Certificates (`/certificados`, `/verificar/[code]`)**: list with download; public verification with minimal data and revoked state.

**Admin (`/admin`)**: users search → entitlement grant/revoke/extend with reason; content publish toggles; payment events table with reprocess; certificates revoke; feature flags; audit log viewer. Everything else via Supabase Studio in MVP.
