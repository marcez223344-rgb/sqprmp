---
name: create-validator
description: Add or extend a result-validation rule type (comparator behavior, feedback category, required/prohibited concept check) in src/lib/validation with fixtures and tests.
argument-hint: [rule-name]
---

## Purpose

Implement validation rule `$ARGUMENTS` used by exercises' `validation_rules`, following `.claude/rules/sql-execution.md`.

## Procedure

1. Read `src/lib/validation/compare.ts`, the exercise schema (`src/content/schemas/exercise.ts`) and `.claude/templates/validator.md`.
2. Define the rule contract: name, config shape (Zod), inputs (actual result, expected result, parsed AST when needed), output (pass/fail + feedback finding `{category, message_key, details}`).
3. Implement as a pure function; register it in the comparator pipeline; add the message keys to `src/messages/es-419.json`.
4. Add fixtures under `tests/fixtures/validation/` and unit tests covering pass, fail, edge cases (NULLs, numeric tolerance, type coercion, truncated results, empty results).
5. Extend the exercise schema and `docs/CURRICULUM.md` §6 if the config shape changed.

## Validation checklist

- [ ] Deterministic and pure · [ ] No access to DB or network · [ ] Feedback message is educational and specific · [ ] Tests green · [ ] `content:verify` still passes for all exercises

## Output

Code, tests, message keys, doc update.
