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

/** Punctuation and operator characters whose surrounding spaces carry no meaning in SQL. */
const OPERATOR_CHARS = new Set([..."=<>!+-*/|:%"]);
const BRACKET_CHARS = new Set([..."(),"]);

/** Splits text into unquoted code and single-quoted literals (with `''` escapes kept intact). */
function splitLiterals(s: string): { text: string; literal: boolean }[] {
  const parts: { text: string; literal: boolean }[] = [];
  let i = 0;
  while (i < s.length) {
    const open = s.indexOf("'", i);
    if (open === -1) {
      parts.push({ text: s.slice(i), literal: false });
      break;
    }
    if (open > i) parts.push({ text: s.slice(i, open), literal: false });
    let close = open + 1;
    for (;;) {
      close = s.indexOf("'", close);
      if (close === -1 || s[close + 1] !== "'") break;
      close += 2;
    }
    const end = close === -1 ? s.length : close + 1;
    parts.push({ text: s.slice(open, end), literal: true });
    i = end;
  }
  return parts;
}

function tightenCode(code: string): string {
  return code.replace(/\s+/g, (space, offset: number) => {
    const before = code[offset - 1] ?? "";
    const after = code[offset + space.length] ?? "";
    if (!before || !after) return "";
    if (BRACKET_CHARS.has(before) || BRACKET_CHARS.has(after)) return "";
    // `a >= b` → `a>=b`, but `> =` keeps its space: joining two operator characters could turn
    // an invalid answer into a valid operator.
    if (OPERATOR_CHARS.has(before) !== OPERATOR_CHARS.has(after)) return "";
    return " ";
  });
}

/**
 * Normalization for typed answers (round 6, items 15/20). Two answers that differ only in layout
 * compare equal: letter case (unless the question is case-sensitive), runs of spaces, spaces
 * around commas, parentheses and operators, typographic quotes from phone keyboards, and a
 * trailing semicolon.
 *
 * Deliberately not tolerated: the inside of a string literal is compared as written (apart from
 * case), and double quotes are not read as single quotes, because in PostgreSQL `"app"` is a
 * column name and `'app'` is text — the course teaches that difference, so grading keeps it.
 */
export function normalizeTypedAnswer(s: string, caseSensitive: boolean): string {
  const straight = s.replace(/[\u2018\u2019\u201A]/g, "'").replace(/[\u201C\u201D\u201E]/g, '"');
  const parts = splitLiterals(straight.trim());
  const last = parts.at(-1);
  if (last && !last.literal) last.text = last.text.replace(/[\s;]+$/, "");
  // Placeholders keep literals out of the whitespace rules while `tightenCode` still sees that a
  // literal sits next to a comma or a parenthesis.
  const literals: string[] = [];
  const code = parts
    .map((p) => {
      if (!p.literal) return p.text;
      literals.push(p.text);
      return "\u0000";
    })
    .join("");
  let i = 0;
  const joined = tightenCode(code.trim()).replace(/\u0000/g, () => literals[i++] ?? "");
  return caseSensitive ? joined : joined.toLowerCase();
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
      const given = normalizeTypedAnswer(answer, cs);
      return key.accepted.accepted.some((a) => normalizeTypedAnswer(a, cs) === given);
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

/** How one option of an answered select-all question reads once the answer is revealed. */
export type MultipleOptionOutcome = "picked-correct" | "picked-wrong" | "missed" | "neutral";

/**
 * Per-option outcome and counts for a select-all answer (round 6, item 18). An incomplete answer
 * is wrong as a whole, but the options the learner did pick correctly are still correct and must
 * read that way; only the missed and the wrongly picked ones are the mistake.
 */
export function multipleBreakdown(
  given: LearnerAnswer,
  correctKeys: readonly string[],
): {
  outcome: (key: string) => MultipleOptionOutcome;
  pickedCorrect: number;
  pickedWrong: number;
  totalCorrect: number;
} {
  const picked = new Set(Array.isArray(given) ? given.map(String) : []);
  const correct = new Set(correctKeys);
  let pickedCorrect = 0;
  for (const k of picked) if (correct.has(k)) pickedCorrect++;
  return {
    outcome: (key) =>
      picked.has(key)
        ? correct.has(key)
          ? "picked-correct"
          : "picked-wrong"
        : correct.has(key)
          ? "missed"
          : "neutral",
    pickedCorrect,
    pickedWrong: picked.size - pickedCorrect,
    totalCorrect: correct.size,
  };
}

/**
 * Right-hand choices of a `matching` question (round 6, item 23). Two left items may share a right
 * answer; the dropdown lists that answer once (first occurrence wins, then shuffled). Grading is
 * unaffected: it compares each left item to its own pair, so picking the shared value for both
 * is still correct.
 */
export function matchingChoices(rights: readonly string[], random: () => number = Math.random) {
  return shuffle([...new Set(rights)], random);
}
