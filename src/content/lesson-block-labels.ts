/**
 * Fixed labels for the authored lesson blocks (`docs/DESIGN_SYSTEM.md` §5b).
 *
 * They live in the content layer, next to the Spanish prose they label, because they are chrome
 * *of the authored content*: a lesson body written in es-419 carries its own block labels the same
 * way it carries its own headings. `Markdown` takes them as an overridable prop, so the lesson page
 * can pass `next-intl` values later without touching any content file.
 */
export interface LessonBlockLabels {
  /** Eyebrow of the lesson-opening outcome list. */
  objectives: string;
  /** Eyebrow of the pull-quote that carries the one sentence of the lesson. */
  keyIdea: string;
  /** Eyebrow of the discouraged half of a wrong/right code pair. */
  wrong: string;
  /** Eyebrow of the recommended half of a wrong/right code pair. */
  right: string;
  /** Caption of an inline result table. */
  result: string;
  /** Eyebrow of a diagram figure. */
  diagram: string;
}

export const LESSON_BLOCK_LABELS: LessonBlockLabels = {
  objectives: "Al terminar vas a poder",
  keyIdea: "Idea clave",
  wrong: "Así no",
  right: "Así sí",
  result: "Resultado",
  diagram: "Diagrama",
};
