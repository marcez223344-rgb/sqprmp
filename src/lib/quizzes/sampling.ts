/**
 * Stratified sampling of a section's question bank (pure, no IO).
 *
 * D-33/D-37: a quiz serves `size` questions out of a bank of 8–12, where `size` is the length the
 * section declares (`quizLengthForSection`). Five or six questions taken uniformly at random can
 * easily be five easy ones on a single topic, which would make the quiz both easier and less
 * representative than the whole bank. The rule below keeps coverage:
 *
 * 0. Freshness first (round 6, items 7/10): with the learner's history, a question they have
 *    never been served beats one they answered wrong, which beats one they answered right. The
 *    rules below apply inside the freshest tier that still has questions; a staler tier is only
 *    drawn from once every fresher one is used up. Without history every question is unseen and
 *    the sample is exactly the plain stratified one.
 * 1. Bucket the bank by difficulty, ordered easy → hard (`DIFFICULTY_ORDER`; unknown values last,
 *    alphabetically, so a new difficulty never disappears from the sample silently).
 * 2. Pick in round-robin across difficulty buckets, so every difficulty present in the bank is
 *    represented before any difficulty gets a second question.
 * 3. Inside a bucket, prefer a question whose topic is the least represented in what has been
 *    picked so far; break ties randomly. A topic therefore repeats only once every topic present
 *    in the bank has been used.
 * 4. Stop at `size`; a bank smaller than `size` is served whole.
 * 5. Deliver the selection easy → hard (stable inside a difficulty), so an attempt opens with its
 *    gentlest question instead of an arbitrary one.
 */

export const DIFFICULTY_ORDER = [
  "very_easy",
  "easy",
  "intermediate",
  "advanced",
  "expert",
] as const;

export interface Sampleable {
  id: string;
  difficulty: string;
  topic: string;
}

/** What the learner has already been asked in earlier attempts at this quiz. */
export interface QuizHistory {
  /** Question ids served in any earlier attempt (answered or not). */
  seen: ReadonlySet<string>;
  /** Question ids whose most recent answer was wrong. */
  wrong: ReadonlySet<string>;
}

/** 0 = never served, 1 = last answered wrong, 2 = served and not wrong. Lower is picked first. */
export function freshnessTier(id: string, history?: QuizHistory): number {
  if (!history) return 0;
  if (history.wrong.has(id)) return 1;
  return history.seen.has(id) ? 2 : 0;
}

function difficultyRank(difficulty: string): number {
  const i = (DIFFICULTY_ORDER as readonly string[]).indexOf(difficulty);
  return i === -1 ? DIFFICULTY_ORDER.length : i;
}

function compareDifficulty(a: string, b: string): number {
  const ra = difficultyRank(a);
  const rb = difficultyRank(b);
  return ra === rb ? a.localeCompare(b) : ra - rb;
}

/** Deterministic given `random`; `random` is only used to break ties. */
export function sampleQuestions<T extends Sampleable>(
  bank: T[],
  size: number,
  random: () => number = Math.random,
  history?: QuizHistory,
): T[] {
  if (size <= 0) return [];
  if (bank.length <= size) return [...bank].sort(byDifficulty);

  const remaining = [...bank];
  const tierOf = new Map(bank.map((q) => [q.id, freshnessTier(q.id, history)]));
  const difficultyCount = new Map<string, number>();
  const topicCount = new Map<string, number>();
  const picked: T[] = [];

  while (picked.length < size && remaining.length) {
    const tier = Math.min(...remaining.map((q) => tierOf.get(q.id) ?? 0));
    const pool = remaining.filter((q) => (tierOf.get(q.id) ?? 0) === tier);
    // Round-robin across difficulties: the least-served difficulty goes next, easiest first.
    const difficulty = [...new Set(pool.map((q) => q.difficulty))].sort((a, b) => {
      const byCount = (difficultyCount.get(a) ?? 0) - (difficultyCount.get(b) ?? 0);
      return byCount !== 0 ? byCount : compareDifficulty(a, b);
    })[0]!;
    const bucket = pool.filter((q) => q.difficulty === difficulty);
    const best = Math.min(...bucket.map((q) => topicCount.get(q.topic) ?? 0));
    const candidates = bucket.filter((q) => (topicCount.get(q.topic) ?? 0) === best);
    const chosen = candidates[Math.floor(random() * candidates.length)] ?? candidates[0]!;
    remaining.splice(remaining.indexOf(chosen), 1);
    difficultyCount.set(difficulty, (difficultyCount.get(difficulty) ?? 0) + 1);
    topicCount.set(chosen.topic, (topicCount.get(chosen.topic) ?? 0) + 1);
    picked.push(chosen);
  }
  return picked.sort(byDifficulty);
}

function byDifficulty(a: Sampleable, b: Sampleable): number {
  return difficultyRank(a.difficulty) - difficultyRank(b.difficulty);
}
