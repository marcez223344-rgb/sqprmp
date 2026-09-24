/**
 * What the padlock on the learning path is allowed to say.
 *
 * The bug it fixes (owner feedback item 24): the badge was drawn from `lesson.is_free` alone, so a
 * learner who had just been given access still saw padlocks on every premium lesson while those
 * lessons opened normally. Two wrongs at once — the badge lied, and if it had been telling the
 * truth the lesson should not have opened.
 *
 * The server gate (`has_active_entitlement` / `can_access_exercise`) stays authoritative; this
 * decides only what is *shown*, from the same answer. Pure function so the rule is unit-tested
 * instead of being read off a JSX expression.
 */
export function lessonNeedsAccess({
  isFree,
  mode,
  hasAccess,
}: {
  isFree: boolean;
  /** "public" is the signed-out curriculum page, where the padlock advertises what is included. */
  mode: "public" | "learner";
  /** The entitlement answer for the current viewer. Ignored in public mode. */
  hasAccess: boolean;
}): boolean {
  if (isFree) return false;
  if (mode === "public") return true;
  return !hasAccess;
}
