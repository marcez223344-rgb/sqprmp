/**
 * Order in which the content seed upserts sections.
 *
 * `sections` has `unique (course_id, number)` and the constraint is not deferrable, so each upsert
 * must leave the numbers unique on its own. Inserting a section in the middle of the path shifts
 * the later ones up by one (D-40 moved the capstone from 39 to 40 to make room for «SQL con IA»):
 * written in ascending order, the new 39 would be inserted while the capstone still held 39 and
 * `content:apply` would fail halfway. Highest number first always frees a number before it is
 * taken, for any upward shift.
 */
export function sectionsInUpsertOrder<S extends { number: number }>(sections: readonly S[]): S[] {
  return [...sections].sort((a, b) => b.number - a.number);
}
