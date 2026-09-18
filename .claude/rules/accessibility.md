---
paths:
  - "src/app/**"
  - "src/components/**"
---

# Accessibility rules (WCAG 2.2 AA)

- Semantic HTML first (`<main>`, `<nav>`, `<header>`, `<button>`, `<table>` with `<caption>`, `<th scope>`); ARIA only to fill gaps, never to replace semantics.
- Every interactive element is keyboard reachable and operable; visible focus ring (`focus-visible:ring-2 ring-primary ring-offset-2`); no `outline-none` without a replacement.
- The SQL editor: documented keyboard escape (Esc then Tab leaves the editor), `aria-label`, and a visible help text "Ctrl/⌘+Enter para ejecutar".
- Results table: `<caption>` with exercise title, `scope="col"`, row/column counts announced in an `aria-live="polite"` region; truncation notices are text, not color.
- Status and difficulty always combine icon + text; success/error never rely on color alone.
- Forms: label per control, error text linked via `aria-describedby`, `aria-invalid`, focus moves to the first error on submit.
- Dialogs/sheets: focus trap, `Esc` closes, focus returns to the trigger (Radix handles this; do not bypass).
- Motion respects `prefers-reduced-motion` (Tailwind `motion-safe:` / `motion-reduce:`); no auto-playing animation longer than 5 s.
- Contrast ≥ 4.5:1 text, ≥ 3:1 UI; targets ≥ 24 × 24 px; touch targets ≥ 44 px on mobile action bars.
- Language: `<html lang="es-419">`; SQL code blocks in `<code>`/`<pre>`; abbreviations explained on first use.
- Every new page runs `axe` in the Playwright a11y suite; `/review-accessibility` before phase sign-off.
