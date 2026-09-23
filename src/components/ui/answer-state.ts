import { CircleCheck, CircleX, type LucideIcon } from "lucide-react";
import type { SectionCategory } from "./section-header";

/**
 * The four states an answer row can be in while a question is answered one at a time
 * (review 2026-09-23 §4.2). Shared so the quiz and the exercise workspace speak one language.
 *
 * Every state differs in shape, icon and border weight, not only in hue: the chosen row keeps a
 * 2 px left rail, the revealed correct row is **dashed**, and both carry a glyph plus an
 * `sr-only` label. Someone reading only shapes must still conclude which option was right.
 */
export type AnswerState = "pending" | "selected" | "answered-correct" | "answered-incorrect";

export interface AnswerStateStyle {
  /** Classes for the row the learner chose (or every row, before grading). */
  row: string;
  /** Classes for the other rows of the same question once it has been graded. */
  otherRows: string;
  /** Marker at the row's right edge; always paired with an `sr-only` label. */
  marker: LucideIcon | null;
  /** Category for the verdict `Callout` rendered after the fieldset. */
  verdict: SectionCategory | null;
}

export const ANSWER_STATE_STYLES: Record<AnswerState, AnswerStateStyle> = {
  pending: {
    row: "border-border bg-surface",
    otherRows: "border-border bg-surface",
    marker: null,
    verdict: null,
  },
  selected: {
    row: "border-primary bg-primary/10 dark:bg-primary/14 ring-1 ring-inset ring-primary/20",
    otherRows: "border-border bg-surface",
    marker: null,
    verdict: null,
  },
  "answered-correct": {
    row: "border-success-ink border-l-2 bg-success-ink/10 dark:bg-success-ink/14",
    otherRows: "border-border bg-surface text-muted",
    marker: CircleCheck,
    verdict: "feedback-correct",
  },
  "answered-incorrect": {
    row: "border-danger border-l-2 bg-danger/8 dark:bg-danger/14",
    otherRows: "border-border bg-surface text-muted",
    marker: CircleX,
    verdict: "feedback-incorrect",
  },
};

/**
 * The correct option revealed after a wrong answer: dashed, so the reveal survives greyscale.
 */
export const REVEALED_CORRECT_ROW =
  "border-success-ink border-l-2 border-dashed bg-success-ink/10 dark:bg-success-ink/14";

/** Left rail for a reviewed question card: quiet enough to repeat ten times down a list. */
export const REVIEW_RAIL: Record<"correct" | "incorrect", string> = {
  correct: "border-border border-l-2 border-l-success-ink bg-surface",
  incorrect: "border-border border-l-2 border-l-danger bg-surface",
};
