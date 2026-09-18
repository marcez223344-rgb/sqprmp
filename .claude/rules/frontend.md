---
paths:
  - "src/app/**"
  - "src/components/**"
  - "src/messages/**"
---

# Frontend rules (Next.js / React / Tailwind)

Design system: `docs/DESIGN_SYSTEM.md`. Accessibility: `.claude/rules/accessibility.md`.

- Server Components by default. Add `"use client"` only to leaf interactive components; keep data fetching and authorization in server components, server actions or route handlers.
- Route groups: `(public)`, `(auth)`, `(learn)`, `(admin)`. Each authenticated group has a layout that resolves the user and redirects (no per-page auth checks duplicated).
- Every route with data has `loading.tsx` and `error.tsx`; lists have explicit empty states; mutations show pending and error states (use `useActionState` / `useFormStatus`).
- All strings via `next-intl` (`useTranslations` / `getTranslations`) from `src/messages/es-419.json`, keys namespaced by feature (`workspace.run`, `onboarding.alias.taken`). No literal Spanish/English UI text in JSX except `aria-hidden` symbols.
- Components: shadcn/ui primitives in `src/components/ui`; feature components in `src/components/<feature>`; props typed, no `any`. Prefer composition over boolean-prop explosions.
- Styling: Tailwind utilities + design tokens (CSS variables). No arbitrary hex colors in components; use semantic tokens (`bg-surface`, `text-muted`, `border-border`). Dark mode via `class` strategy on `<html>` with system preference default.
- Forms: React Hook Form + `zodResolver` with the same Zod schema used on the server (`src/lib/**/schemas.ts`). Errors rendered with `aria-describedby`.
- Dates/numbers through `Intl` with the user's locale/timezone from the profile; never format with string concatenation.
- Images via `next/image`; fonts via `next/font`; icons from `lucide-react` with `aria-hidden` and a visible or `sr-only` label.
- Client bundle hygiene: PGlite and CodeMirror are dynamically imported (`next/dynamic`, `ssr: false`) only in the workspace route; never import them in shared layouts.
- Analytics via `track()` on the server (`src/lib/analytics`), not from client components, except `page_viewed` through a tiny server endpoint.
