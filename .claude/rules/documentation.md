# Documentation rules (always loaded)

- One authoritative location per topic (see the table in `CLAUDE.md` → Source of truth). Other files link; they do not restate.
- Docs are updated in the same change as the code (see `CLAUDE.md` → Documentation update rules). A PR that changes schema, env, dependencies, limits, content rules or flows without the matching doc update is incomplete.
- `docs/DECISIONS.md`: append-only numbered entries; status transitions are explicit; pending owner questions live in its table and are removed only when answered (record the answer in the decision).
- `docs/ROADMAP.md`: update phase status at the end of each phase with a short summary and the date.
- Reviews (`/review-security`, `/review-accessibility`, `/prepare-release`) save reports under `docs/reviews/<date>-<type>.md`.
- Language: docs for the owner and team in Spanish or English consistently per file (current docs: technical docs in English, README in Spanish; keep that split). User-facing copy always Spanish es-419.
- Do not document what the code already says (file lists, obvious signatures); document rationale, constraints, runbooks and decisions.
- Proposed improvements to agents/skills/hooks/rules are written to `docs/CLAUDE_CODE_SETUP.md` → "Proposed changes" and applied only after the owner agrees.
