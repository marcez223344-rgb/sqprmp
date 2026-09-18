---
name: create-theory-quiz
description: Create a set of theory questions (8 supported types) with correct answers, explanations and distractor rationales for a lesson or section, validated against the question schema.
argument-hint: [section-slug] [count]
arguments: [section, count]
---

## Purpose

Author `$count` questions for `$section` into `src/content/questions/$section/*.json` following `.claude/templates/question.md`.

## Procedure

1. Read the section outline objectives and lesson MDX; map each objective to ≥ 1 question.
2. Mix types: single, multiple, true/false, fill-blank, query interpretation, error diagnosis, matching, scenario. At least 4 types per section.
3. For each: topic, difficulty, prompt (with code block when relevant), options (2–6, logical order), correct answer(s), explanation, `why_incorrect_md` per distractor grounded in a real misconception, lesson link, tags, estimated seconds.
4. Verify any SQL in prompts/options against the dataset snapshot.
5. Run `npm run content:validate`.

## Validation checklist

- [ ] No question answerable without the concept (avoid trivia)
- [ ] Distractors plausible and explained
- [ ] Correct answers never in browser-readable fields (schema enforces server-only fields)
- [ ] Estimated total time ≤ 10 min per quiz

## Output

Question files, validation output, coverage table (objective → questions).
