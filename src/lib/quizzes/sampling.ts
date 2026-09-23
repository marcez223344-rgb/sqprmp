/**
 * Stratified sampling of a section's question bank (pure, no IO).
 *
 * D-33: a quiz serves `limits.quiz.questionsPerAttempt` questions out of a bank of 8–12. Six
 * questions taken uniformly at random can easily be six easy ones on a single topic, which would
 * make the quiz both easier and less representative than the ten-question version it replaces.
 * The rule below keeps coverage:
 *
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

function difficultyRank(difficulty: string): number {
  const i = (DIFFICULTY_ORDER as readonly string[]).indexOf(difficulty);
  return i === -1 ? DIFFICULTY_ORDER.length : i;
}

function orderedDifficulties(bank: Sampleable[]): string[] {
  const seen = [...new Set(bank.map((q) => q.difficulty))];
  return seen.sort((a, b) => {
    const ra = difficultyRank(a);
    const rb = difficultyRank(b);
    return ra === rb ? a.localeCompare(b) : ra - rb;
  });
}

/** Deterministic given `random`; `random` is only used to break ties. */
export function sampleQuestions<T extends Sampleable>(
  bank: T[],
  size: number,
  random: () => number = Math.random,
): T[] {
  if (size <= 0) return [];
  if (bank.length <= size) return [...bank].sort(byDifficulty);

  const buckets = new Map<string, T[]>();
  for (const q of bank) {
    const list = buckets.get(q.difficulty) ?? [];
    list.push(q);
    buckets.set(q.difficulty, list);
  }
  const difficulties = orderedDifficulties(bank);
  const topicCount = new Map<string, number>();
  const picked: T[] = [];

  while (picked.length < size) {
    let progressed = false;
    for (const difficulty of difficulties) {
      if (picked.length >= size) break;
      const bucket = buckets.get(difficulty);
      if (!bucket?.length) continue;
      const best = Math.min(...bucket.map((q) => topicCount.get(q.topic) ?? 0));
      const candidates = bucket.filter((q) => (topicCount.get(q.topic) ?? 0) === best);
      const chosen = candidates[Math.floor(random() * candidates.length)] ?? candidates[0]!;
      bucket.splice(bucket.indexOf(chosen), 1);
      topicCount.set(chosen.topic, (topicCount.get(chosen.topic) ?? 0) + 1);
      picked.push(chosen);
      progressed = true;
    }
    // Every bucket is empty: the bank was smaller than `size` after all.
    if (!progressed) break;
  }
  return picked.sort(byDifficulty);
}

function byDifficulty(a: Sampleable, b: Sampleable): number {
  return difficultyRank(a.difficulty) - difficultyRank(b.difficulty);
}
