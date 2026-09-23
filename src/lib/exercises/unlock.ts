import { limits } from "@/config/limits";

/**
 * When the explained solution becomes available (docs/CONTENT_GUIDELINES.md §6).
 *
 * The rule lives here, outside `service.ts`, because the workspace (a client component) needs
 * the same rule to decide what to offer, while the server keeps the last word: `revealSolution`
 * re-evaluates `isSolutionUnlockable` against the stored progress row before serving anything.
 */
export interface UnlockProgress {
  genuine_attempts_count: number;
  hints_used: number;
  started_at: string;
  status: string;
}

export function isSolutionUnlockable(p: UnlockProgress): boolean {
  if (p.status === "completed") return true;
  const u = limits.solutionUnlock;
  const minutes = (Date.now() - Date.parse(p.started_at)) / 60_000;
  return (
    p.genuine_attempts_count >= u.minGenuineAttempts ||
    p.hints_used >= u.minHintsRequested ||
    minutes >= u.minMinutesElapsed
  );
}

/**
 * Same rule evaluated against what the browser knows right now.
 *
 * `progress` is the snapshot taken when the page rendered and `lastSubmissionUnlockable` the one
 * returned by the last submission; neither counts the hints the learner opened afterwards. The
 * panel used to keep offering "quiero verla igual" (with its XP penalty warning) to someone who
 * had already taken the two hints the copy says are enough, until they reloaded the page.
 */
export function solutionUnlockableNow(input: {
  progress: UnlockProgress | null;
  lastSubmissionUnlockable: boolean | null;
  hintsTaken: number;
}): boolean {
  if (input.hintsTaken >= limits.solutionUnlock.minHintsRequested) return true;
  if (input.lastSubmissionUnlockable !== null) return input.lastSubmissionUnlockable;
  return input.progress ? isSolutionUnlockable(input.progress) : false;
}
