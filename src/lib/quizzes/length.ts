import { limits } from "@/config/limits";
import { sections } from "@/content/sections";

/**
 * How many questions one attempt at a section quiz serves (D-37).
 *
 * The number is authored per section (`quiz_questions` in src/content/sections.ts) because it
 * depends on how much of that section's evidence the quiz has to carry; `limits.quiz` holds the
 * policy the authored value must respect and the default for a section that declares nothing.
 * The bank is a hard ceiling: a shallow bank is served whole rather than padded.
 *
 * Read from the content module, not from the database: the value is content, it has no column in
 * `public.sections`, and resolving it here keeps grading and sampling on the same source.
 */
const declaredBySlug = new Map(sections.map((s) => [s.slug, s.quiz_questions]));

export function quizLengthForSection(sectionSlug: string, bankSize: number): number {
  const declared = declaredBySlug.get(sectionSlug) ?? limits.quiz.questionsPerAttempt;
  return Math.max(1, Math.min(declared, bankSize));
}
