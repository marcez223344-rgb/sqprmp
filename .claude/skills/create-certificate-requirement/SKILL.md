---
name: create-certificate-requirement
description: Define a certificate path (required sections, quiz thresholds, skills listed) as data plus eligibility tests, without enabling arbitrary issuance.
argument-hint: [requirement-slug]
---

## Purpose
Create certificate requirement `$ARGUMENTS` (e.g. `fundamentos-sql`) per `docs/PRODUCT_REQUIREMENTS.md` (certificates) and `docs/CURRICULUM.md` §1.

## Procedure
1. Read `src/lib/certificates/eligibility.ts` and the `certificate_requirements` model.
2. Write the requirement as seed data: `slug`, `title` (es-419), `skills[]`, `rules` (required section slugs, min quiz score, required challenge exercises), `is_active`.
3. Ensure every referenced section is fully authored and published; otherwise mark the requirement inactive.
4. Unit tests for eligibility: all met → eligible; one missing → not; revoked certificate → not re-issued silently; idempotent issuance (`unique (user_id, requirement_id)` unless revoked).
5. Verify PDF template renders the requirement title/skills; verification page shows minimal data.
6. Update `docs/CURRICULUM.md` certificate column and D-11 wording (non-accredited).

## Validation checklist
- [ ] Issuance only via `issue_certificate()` after verification · [ ] No PII beyond recipient name on verification page · [ ] Tests green · [ ] Docs updated

## Output
Seed entry, tests, doc update.
