---
name: review-accessibility
description: Run an accessibility review (WCAG 2.2 AA) on a page or component — automated axe via Playwright plus a manual keyboard/screen-reader checklist — and write a report with fixes.
argument-hint: [route-or-component]
allowed-tools: Read Grep Glob Bash(npm run test:e2e*) Bash(npx playwright *) Write
---

## Purpose

Assess `$ARGUMENTS` against `.claude/rules/accessibility.md` and `docs/DESIGN_SYSTEM.md` §8.

## Procedure

1. Automated: run the a11y Playwright suite for the route (`npx playwright test tests/e2e/a11y.spec.ts -g "$ARGUMENTS"` or the full suite); quote violations.
2. Manual checklist (read the code): landmarks and headings order; labels/`aria-describedby` on forms; focus visible and order logical; keyboard operability of custom widgets (editor escape, tables, tabs, dialogs); live regions for results/feedback; status conveyed by icon + text; contrast of tokens used; reduced-motion variants; target sizes; `lang`; images `alt`; mobile layout at 360 px.
3. Write `docs/reviews/<date>-accessibility-<slug>.md` using `.claude/templates/accessibility-review.md`: findings (WCAG criterion, severity, location, fix).

## Validation checklist

- [ ] Automated results quoted · [ ] Every finding has a concrete fix · [ ] No code edited by this skill

## Output

Report; fixes assigned to `frontend-engineer`/`ux-designer`.
