/**
 * Program hours printed on a certificate (D-42): «Carga horaria estimada: N horas».
 *
 * The number describes the program, not the person. It is summed from the authored duration
 * estimates of every published item in the sections the certificate requires, so every holder of
 * the same certificate gets the same figure. Personal time on page was rejected by the owner: it
 * counts open tabs and misses the time spent thinking away from the screen.
 *
 * What is counted, per required section (published items only, as the learner sees the path):
 * - theory lessons: `estimated_minutes`;
 * - exercises: `estimated_minutes`;
 * - the section quiz: the questions one attempt actually serves (`quizLengthForSection`) times
 *   the mean `estimated_seconds` of the published bank — not the whole bank, which the learner
 *   never sees in one sitting.
 *
 * Rounding: the total in minutes is converted to hours and rounded to the nearest whole hour
 * (half up), with a floor of one hour when anything was counted. Rounding happens once, on the
 * total, so per-item rounding cannot accumulate.
 *
 * Missing data: the content schemas require an estimate on every lesson, exercise and question,
 * so nothing should be missing. If a required section is absent from the content, or an item has
 * no usable estimate, it contributes zero and is listed in `missingSections` / `missingItems`.
 * The certificate may under-state its hours; it never shows an invented number.
 */
export interface TimedItem {
  section: string;
  /** Identifies the item in `missingItems` (lesson or exercise slug, `<section>-quiz`). */
  slug: string;
  /** Duration in minutes; fractional values are allowed (quizzes). */
  minutes: number | null | undefined;
}

export interface ProgramHours {
  hours: number;
  /** Unrounded total, for diagnostics and tests. */
  minutes: number;
  /** Required sections with no published item at all in the content. */
  missingSections: string[];
  /** Items of required sections without a positive, finite estimate. */
  missingItems: string[];
}

const MINUTES_PER_HOUR = 60;

export function roundProgramHours(minutes: number): number {
  if (!(minutes > 0)) return 0;
  return Math.max(1, Math.floor(minutes / MINUTES_PER_HOUR + 0.5));
}

export function computeProgramHours(
  sectionSlugs: readonly string[],
  items: readonly TimedItem[],
): ProgramHours {
  const required = new Set(sectionSlugs);
  const seen = new Set<string>();
  const missingItems: string[] = [];
  let minutes = 0;
  for (const item of items) {
    if (!required.has(item.section)) continue;
    seen.add(item.section);
    const m = item.minutes;
    if (typeof m === "number" && Number.isFinite(m) && m > 0) minutes += m;
    else missingItems.push(item.slug);
  }
  const missingSections = [...required].filter((s) => !seen.has(s));
  return { hours: roundProgramHours(minutes), minutes, missingSections, missingItems };
}

/** Minimal content shapes this module reads, so it stays testable without the content registry. */
export interface HoursContent {
  sections: readonly { slug: string; is_published: boolean }[];
  lessons: readonly {
    slug: string;
    section: string;
    kind: string;
    is_published: boolean;
    estimated_minutes?: number | null;
  }[];
  exercises: readonly {
    slug: string;
    section: string;
    is_published: boolean;
    estimated_minutes?: number | null;
  }[];
  questions: readonly {
    section: string;
    is_published: boolean;
    estimated_seconds?: number | null;
  }[];
}

/**
 * Flattens authored content into timed items. `quizLength` returns how many questions one attempt
 * serves for a section with a bank of the given size.
 */
export function timedItemsFromContent(
  c: HoursContent,
  quizLength: (sectionSlug: string, bankSize: number) => number,
): TimedItem[] {
  const out: TimedItem[] = [];
  for (const s of c.sections) {
    if (!s.is_published) continue;
    for (const l of c.lessons)
      if (l.section === s.slug && l.is_published && l.kind === "theory")
        out.push({ section: s.slug, slug: l.slug, minutes: l.estimated_minutes });
    for (const e of c.exercises)
      if (e.section === s.slug && e.is_published)
        out.push({ section: s.slug, slug: e.slug, minutes: e.estimated_minutes });
    const bank = c.questions.filter((q) => q.section === s.slug && q.is_published);
    if (bank.length > 0) {
      const timed = bank.filter(
        (q) => typeof q.estimated_seconds === "number" && q.estimated_seconds > 0,
      );
      const meanSeconds =
        timed.length === bank.length
          ? timed.reduce((a, q) => a + (q.estimated_seconds ?? 0), 0) / timed.length
          : null;
      out.push({
        section: s.slug,
        slug: `${s.slug}-quiz`,
        minutes:
          meanSeconds === null
            ? null
            : (quizLength(s.slug, bank.length) * meanSeconds) / MINUTES_PER_HOUR,
      });
    }
  }
  return out;
}
