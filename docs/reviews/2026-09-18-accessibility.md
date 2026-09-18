# Accessibility review — 2026-09-18 (WCAG 2.2 AA, Phase 9)

Automated: `tests/e2e/a11y.spec.ts` (axe-core, tags wcag2a/2aa/21a/21aa/22aa) on 11 public pages, both Playwright projects (Desktop Chrome, Pixel 7) — **41 passed** after the fixes below; the 7 authenticated pages in the same spec run in CI with the local Supabase stack. Responsive: `tests/e2e/responsive.spec.ts` (no horizontal overflow at 360/768/1024/1536, mobile menu keyboard behavior, tap targets).

## Findings and fixes

| #   | WCAG              | Finding                                                                                                    | Fix                                                                                                                                                                              |
| --- | ----------------- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A-1 | 2.5.8 Target size | Header nav links, logo link and skip link were < 24 px tall (axe `target-size`).                           | Links and logo are now `inline-flex min-h-10`; skip link is a 40 px pill moved off-canvas with `translate` instead of `sr-only`.                                                 |
| A-2 | 1.4.3 Contrast    | Accent orange (`#F2652E`) used as 14 px text (landing/about eyebrows) reached 2.96:1 on the light surface. | New token `--accent-ink` (`#B8461A` light / `#FFA17A` dark, ≥ 4.5:1) for accent **text**; base accent stays for fills. DESIGN_SYSTEM.md updated.                                 |
| A-3 | 1.4.10 Reflow     | Landing header overflowed by 98 px at 768 px (desktop nav + CTAs).                                         | Public header switches to the desktop nav at `lg` (1024); app header at `xl` (1280) since it carries 7 links + admin + logout. Mobile nav remains a horizontal, scrollable list. |
| A-4 | 2.1.1 Keyboard    | Mobile disclosure menu did not close with Escape.                                                          | Escape closes it and returns focus to the trigger (`SiteHeader`).                                                                                                                |

## Manual checklist (desktop Chrome + NVDA-style reading order; mobile Pixel 7 emulation)

- [x] Skip link is the first Tab stop on every layout and moves focus to `<main id="contenido">`.
- [x] Landmarks: one `<main>`, `<header>`, `<nav aria-label>` (distinct labels for desktop/mobile), `<footer>`.
- [x] Headings: single `h1` per page (asserted by E2E), logical `h2/h3` nesting on lessons (Markdown headings start at `##`).
- [x] Forms: every input has a `<label>`; errors use `role="alert"` and `aria-describedby`; onboarding steps announce availability of alias ("Disponible").
- [x] Quiz runner: `fieldset/legend` per question, `progressbar` with `aria-valuenow`, results in `role="status"`; correct/incorrect use icon + text, never color alone.
- [x] Workspace: CodeMirror editor has `aria-label`, documented shortcut text ("Ctrl/⌘+Enter para ejecutar"), Esc then Tab leaves the editor; results table has `<caption>` and `scope="col"`; row counts announced via `aria-live="polite"`.
- [x] Certificates/verification: status conveyed with icon + text; PDF link opens in a new tab with `rel="noopener"` and visible label.
- [x] Reduced motion: global `prefers-reduced-motion` rule disables transitions/animations; `motion-safe:` used for the new skip-link transition.
- [x] Focus visibility: `focus-visible:outline-2 outline-offset-2` on buttons/links; no `outline-none` without replacement (grep-verified).
- [x] Language: `<html lang="es-419">`; SQL in `<code>/<pre>`.
- [ ] Screen-reader pass with a real AT (NVDA/VoiceOver) on the exercise workspace — **owner/QA task before launch**; emulation cannot replace it.
- [ ] Color-blind check of the accent/success/danger trio with a simulator — recommended, not blocking (all statuses already pair icon + text).

## Known exclusions

`.cm-editor` (CodeMirror) is excluded from axe: its contenteditable produces false positives on `aria-multiline`; keyboard behavior is covered manually and by E2E 04/05.
