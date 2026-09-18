---
name: generate-hints
description: Write the three progressive hints (conceptual → specific → skeleton with blanks) and the solution-reveal explanation for an existing exercise, without leaking the solution early.
argument-hint: [exercise-slug]
---

## Purpose

Produce `hints[3]` and `expert_explanation_md` for exercise `$ARGUMENTS` per `docs/CONTENT_GUIDELINES.md` §4.

## Procedure

1. Read the exercise file and its reference solution.
2. Hint 1: name the concept and why it applies; no table/column names.
3. Hint 2: which tables/columns, which filter/join/grouping, and the order of operations; still no full expressions.
4. Hint 3: a query skeleton with the decisive parts replaced by `___` (at minimum the key expression/condition).
5. Reveal text: query → step by step → why it works → alternatives → likely misconception → invitation to retry. Neutral, encouraging tone; no shaming.
6. Set `coin_cost`/`xp_penalty` per defaults.

## Validation checklist

- [ ] Hint 3 cannot be pasted and run as the solution
- [ ] Each hint adds information the previous one lacked
- [ ] Spanish es-419, "tú"
- [ ] Schema validation passes

## Output

Updated exercise file section; a one-line rationale per hint in the response.
