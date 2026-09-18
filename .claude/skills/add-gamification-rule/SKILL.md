---
name: add-gamification-rule
description: Add a badge, reward rule, streak/goal behavior or mastery rule server-side with idempotency, caps, tests and documentation; never client-controlled.
argument-hint: [rule-slug]
---

## Purpose
Implement gamification rule `$ARGUMENTS` following `docs/PRODUCT_REQUIREMENTS.md` (gamification) and reward defaults in `docs/CONTENT_GUIDELINES.md` §6.

## Required inputs
Trigger (event), condition, reward (xp/coins/badge), cap/frequency, idempotency key pattern, UI surface, analytics event.

## Procedure
1. Read `src/lib/rewards/**` and the `reward_ledger`/`badges` model.
2. Define the rule as data where possible (`badges.criteria jsonb`) and evaluate it in a pure function `evaluate<Rule>(context)`; award through the `award_reward` RPC with `event_key = "<rule>:<subject-id>"`.
3. Add caps (daily XP cap, once-per-subject) and a `suspicious_activity` signal if the rule can be farmed.
4. Unit tests: awarded once, not re-awarded, cap respected, penalties applied, timezone edge (streaks), freeze behavior.
5. Seed badge definition (icon, title, description es-419) if applicable; emit `badge_earned`/related analytics event.
6. Document the rule in the gamification section of `docs/PRODUCT_REQUIREMENTS.md` (or `docs/GAMIFICATION.md` once created).

## Validation checklist
- [ ] Server-side only · [ ] Idempotent · [ ] Capped · [ ] No dark pattern (no loss aversion beyond documented streak rules) · [ ] Tests green · [ ] Docs updated

## Output
Code, tests, seed entry, doc update; owner sign-off requested if reward values differ from defaults.
