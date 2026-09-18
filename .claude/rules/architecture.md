# Architecture rules (always loaded)

- Follow `docs/ARCHITECTURE.md`; deviations require a `docs/DECISIONS.md` entry with status Proposed and owner notification.
- Three trust zones: browser (untrusted), Next.js server (authoritative), Supabase (system of record). Business rules live once, in `src/lib/**`, and are imported by both server actions and route handlers; never re-implement a rule in a component.
- Server Components by default; `"use client"` only for interactivity (editor, results table, forms, quiz). Client components receive already-authorized data.
- Server Actions for form mutations; Route Handlers (`src/app/api/**`) for webhooks, downloads and anything called by non-React clients. Both validate input with Zod and call `authorize()` first.
- Configuration over constants: brand, founder, pricing, limits, social, feature flags come from `src/config/*`. A literal product name, price or limit outside `src/config` is a review blocker.
- Module boundaries: `src/lib/supabase/admin.ts` imports `server-only`; `src/lib/sandbox/**` never imports `src/lib/supabase/admin.ts`; `src/lib/payments/providers/**` are only imported by `src/lib/payments/index.ts`.
- Errors: throw typed `AppError` subclasses (`AuthError`, `EntitlementError`, `RateLimitError`, `ValidationError`, `SandboxError`) and map them to responses in one place; never leak stack traces or internal ids to clients.
- No new dependency without checking its current docs and adding it to `docs/ARCHITECTURE.md` §2 (and DECISIONS.md if security/cost/architecture-relevant).
