/**
 * Pure quiz grading (no IO). Answer shapes by question type:
 * - single / true_false / query_interpretation / error_diagnosis / scenario: option key ("a")
 * - multiple: option keys (["a","c"])
 * - fill_blank: text
 * - matching: { [left]: right }
 */
export type QuestionType =
  | "single"
  | "multiple"
  | "true_false"
  | "fill_blank"
  | "query_interpretation"
  | "error_diagnosis"
  | "matching"
  | "scenario";

export interface AnswerKey {
  type: QuestionType;
  correctOptionKeys: string[];
  accepted?: { accepted: string[]; case_sensitive?: boolean } | null;
  pairs?: { left: string; right: string }[] | null;
}

export type LearnerAnswer = string | string[] | Record<string, string> | null | undefined;

function normalizeText(s: string, caseSensitive: boolean): string {
  const t = s.trim().replace(/\s+/g, " ");
  return caseSensitive ? t : t.toLowerCase();
}

export function gradeAnswer(key: AnswerKey, answer: LearnerAnswer): boolean {
  switch (key.type) {
    case "multiple": {
      if (!Array.isArray(answer)) return false;
      const chosen = [...new Set(answer.map(String))].sort();
      const correct = [...key.correctOptionKeys].sort();
      return chosen.length === correct.length && chosen.every((k, i) => k === correct[i]);
    }
    case "fill_blank": {
      if (typeof answer !== "string" || !key.accepted) return false;
      const cs = Boolean(key.accepted.case_sensitive);
      const given = normalizeText(answer, cs);
      return key.accepted.accepted.some((a) => normalizeText(a, cs) === given);
    }
    case "matching": {
      if (!answer || typeof answer !== "object" || Array.isArray(answer) || !key.pairs)
        return false;
      return key.pairs.every(
        (p) => normalizeText(String(answer[p.left] ?? ""), false) === normalizeText(p.right, false),
      );
    }
    default:
      return (
        typeof answer === "string" &&
        key.correctOptionKeys.length === 1 &&
        key.correctOptionKeys[0] === answer
      );
  }
}

export function passThreshold(score: number, total: number, thresholdPercent: number): boolean {
  return total > 0 && score * 100 >= thresholdPercent * total;
}

/**
 * The learner's score as a whole percentage, for display next to the pass threshold.
 *
 * Rounded down on purpose: with any integer threshold, a rounded-up percentage could read "80 %"
 * on an attempt that `passThreshold` fails, and the two lines sit next to each other on the
 * result screen. Flooring can never contradict the verdict.
 */
export function scorePercent(score: number, total: number): number {
  return total > 0 ? Math.floor((score * 100) / total) : 0;
}

/** Fisher–Yates with a caller-provided RNG (deterministic in tests). */
export function shuffle<T>(items: T[], random: () => number = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}
