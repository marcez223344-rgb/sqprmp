/**
 * Fixed labels for the authored lesson blocks (`docs/DESIGN_SYSTEM.md` §5b).
 *
 * **The catalogue is the source of truth**: `lesson.block.*` in `src/messages/es-419.json` is what
 * a learner reads, passed in by the lesson page and by `MarkdownClient` (CLAUDE.md rule 6). These
 * values stay as `Markdown`'s defaults for callers with no translator in scope — component tests,
 * and any future non-React rendering of a lesson body — and must be kept identical to the
 * catalogue. They are not a second place to change the wording.
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
