import { content } from "./index";
import { courseSchema, datasetSchema, lessonSchema, sectionSchema } from "./schemas/curriculum";
import { exerciseSchema } from "./schemas/exercise";
import { questionSchema } from "./schemas/question";
import type { LessonDef, SectionDef } from "./schemas/curriculum";

export interface ContentIssue {
  kind: "course" | "section" | "lesson" | "question" | "exercise" | "dataset" | "graph";
  slug: string;
  message: string;
}

export interface LoadedContent {
  courses: ReturnType<typeof courseSchema.parse>[];
  sections: SectionDef[];
  datasets: ReturnType<typeof datasetSchema.parse>[];
  lessons: LessonDef[];
  questions: ReturnType<typeof questionSchema.parse>[];
  exercises: ReturnType<typeof exerciseSchema.parse>[];
  issues: ContentIssue[];
}

/**
 * Validates every content item against its schema and checks cross-references:
 * sections → course, lessons/questions/exercises → sections and lessons, datasets and
 * tables, prerequisite graph acyclic. Quiz lessons are derived per section with questions.
 */
export function loadContent(): LoadedContent {
  const issues: ContentIssue[] = [];

  const parseAll = <T>(
    kind: ContentIssue["kind"],
    items: unknown[],
    schema: {
      safeParse: (v: unknown) => {
        success: boolean;
        data?: T;
        error?: { issues: { path: PropertyKey[]; message: string }[] };
      };
    },
  ): T[] => {
    const out: T[] = [];
    for (const raw of items) {
      const slug = (raw as { slug?: string }).slug ?? "?";
      const r = schema.safeParse(raw);
      if (r.success && r.data) out.push(r.data);
      else
        for (const i of r.error?.issues ?? [])
          issues.push({ kind, slug, message: `${i.path.join(".")}: ${i.message}` });
    }
    return out;
  };

  const courses = parseAll("course", content.courses, courseSchema);
  const sections = parseAll("section", content.sections, sectionSchema);
  const datasets = parseAll("dataset", content.datasets, datasetSchema);
  const authoredLessons = parseAll("lesson", content.lessons, lessonSchema);
  const questions = parseAll("question", content.questions, questionSchema);
  const exercises = parseAll("exercise", content.exercises, exerciseSchema);

  const courseSlugs = new Set(courses.map((c) => c.slug));
  const sectionBySlug = new Map(sections.map((s) => [s.slug, s]));
  const datasetBySlug = new Map(datasets.map((d) => [d.slug, d]));

  // Derived lessons: one exercise lesson per exercise (after theory), one quiz per section with questions.
  const lessons: LessonDef[] = [...authoredLessons];
  for (const section of sections) {
    const sectionExercises = exercises.filter((e) => e.section === section.slug);
    const theoryMax = Math.max(
      -1,
      ...lessons.filter((l) => l.section === section.slug).map((l) => l.sort_order),
    );
    sectionExercises.forEach((e, i) => {
      lessons.push({
        slug: `ejercicio-${e.slug}`,
        section: section.slug,
        kind:
          e.difficulty === "intermediate" ||
          e.difficulty === "advanced" ||
          e.difficulty === "expert"
            ? i === sectionExercises.length - 1
              ? "challenge"
              : "exercise"
            : "exercise",
        title: e.title,
        sort_order: theoryMax + 1 + i,
        estimated_minutes: e.estimated_minutes,
        ref: e.slug,
        dataset: e.dataset.slug,
        // Exercises are count-gated (D-01), never free at the lesson level.
        is_free: false,
        is_published: e.is_published && section.is_published,
        prerequisites: [],
      });
    });
  }
  for (const section of sections) {
    const hasQuestions = questions.some((q) => q.section === section.slug && q.is_published);
    if (hasQuestions) {
      const maxOrder = Math.max(
        -1,
        ...lessons.filter((l) => l.section === section.slug).map((l) => l.sort_order),
      );
      lessons.push({
        slug: `${section.slug}-quiz`,
        section: section.slug,
        kind: "quiz",
        title: "Quiz de la sección",
        sort_order: maxOrder + 1,
        estimated_minutes: Math.max(
          3,
          Math.round(
            questions
              .filter((q) => q.section === section.slug)
              .reduce((a, q) => a + q.estimated_seconds, 0) / 60,
          ),
        ),
        ref: section.slug,
        is_free: section.is_free_theory,
        is_published: section.is_published,
        prerequisites: [],
      });
    }
  }
  const lessonBySlug = new Map(lessons.map((l) => [l.slug, l]));

  // Uniqueness
  const dupes = (kind: ContentIssue["kind"], slugs: string[]) => {
    const seen = new Set<string>();
    for (const s of slugs) {
      if (seen.has(s)) issues.push({ kind, slug: s, message: "duplicate slug" });
      seen.add(s);
    }
  };
  dupes(
    "section",
    sections.map((s) => s.slug),
  );
  dupes(
    "lesson",
    lessons.map((l) => l.slug),
  );
  dupes(
    "question",
    questions.map((q) => q.slug),
  );
  dupes(
    "exercise",
    exercises.map((e) => e.slug),
  );

  // References
  for (const s of sections) {
    if (!courseSlugs.has(s.course))
      issues.push({ kind: "section", slug: s.slug, message: `unknown course ${s.course}` });
    if (s.requires && !sectionBySlug.has(s.requires))
      issues.push({ kind: "section", slug: s.slug, message: `unknown requires ${s.requires}` });
  }
  const sectionNumbers = sections.map((s) => s.number).sort((a, b) => a - b);
  sectionNumbers.forEach((n, i) => {
    if (n !== i + 1)
      issues.push({
        kind: "graph",
        slug: "sections",
        message: `section numbers must be 1..N without gaps (got ${n} at ${i + 1})`,
      });
  });

  for (const l of lessons) {
    const section = sectionBySlug.get(l.section);
    if (!section)
      issues.push({ kind: "lesson", slug: l.slug, message: `unknown section ${l.section}` });
    if (l.dataset && !datasetBySlug.has(l.dataset))
      issues.push({ kind: "lesson", slug: l.slug, message: `unknown dataset ${l.dataset}` });
    for (const p of l.prerequisites) {
      if (!lessonBySlug.has(p))
        issues.push({ kind: "lesson", slug: l.slug, message: `unknown prerequisite ${p}` });
    }
    if (l.is_published && section && !section.is_published) {
      issues.push({
        kind: "lesson",
        slug: l.slug,
        message: "published lesson in an unpublished section",
      });
    }
  }

  for (const q of questions) {
    if (!sectionBySlug.has(q.section))
      issues.push({ kind: "question", slug: q.slug, message: `unknown section ${q.section}` });
    const lesson = lessonBySlug.get(q.lesson);
    if (!lesson)
      issues.push({ kind: "question", slug: q.slug, message: `unknown lesson ${q.lesson}` });
    else if (lesson.section !== q.section)
      issues.push({ kind: "question", slug: q.slug, message: "lesson belongs to another section" });
  }

  for (const e of exercises) {
    if (!sectionBySlug.has(e.section))
      issues.push({ kind: "exercise", slug: e.slug, message: `unknown section ${e.section}` });
    if (!lessonBySlug.has(e.theory_ref))
      issues.push({
        kind: "exercise",
        slug: e.slug,
        message: `unknown theory_ref ${e.theory_ref}`,
      });
    const ds = datasetBySlug.get(e.dataset.slug);
    if (!ds)
      issues.push({ kind: "exercise", slug: e.slug, message: `unknown dataset ${e.dataset.slug}` });
    else {
      if (ds.version !== e.dataset.version)
        issues.push({
          kind: "exercise",
          slug: e.slug,
          message: `dataset version ${e.dataset.version} ≠ ${ds.version}`,
        });
      const tables = new Set(ds.tables.map((t) => t.name));
      for (const t of e.tables_used)
        if (!tables.has(t))
          issues.push({ kind: "exercise", slug: e.slug, message: `unknown table ${t}` });
    }
    for (const p of e.prerequisites)
      if (!exercises.some((x) => x.slug === p))
        issues.push({ kind: "exercise", slug: e.slug, message: `unknown prerequisite ${p}` });
  }

  // Published sections must have at least one published theory lesson.
  for (const s of sections) {
    if (
      s.is_published &&
      !lessons.some((l) => l.section === s.slug && l.kind === "theory" && l.is_published)
    ) {
      issues.push({
        kind: "section",
        slug: s.slug,
        message: "published section without a published theory lesson",
      });
    }
  }

  // Cycle detection on lesson prerequisites and section requires.
  const detectCycle = (nodes: { id: string; deps: string[] }[], kind: ContentIssue["kind"]) => {
    const state = new Map<string, 0 | 1 | 2>();
    const deps = new Map(nodes.map((n) => [n.id, n.deps]));
    const visit = (id: string): boolean => {
      const s = state.get(id) ?? 0;
      if (s === 1) return true;
      if (s === 2) return false;
      state.set(id, 1);
      for (const d of deps.get(id) ?? []) if (visit(d)) return true;
      state.set(id, 2);
      return false;
    };
    for (const n of nodes)
      if (visit(n.id)) issues.push({ kind, slug: n.id, message: "prerequisite cycle" });
  };
  detectCycle(
    lessons.map((l) => ({ id: l.slug, deps: l.prerequisites })),
    "lesson",
  );
  detectCycle(
    sections.map((s) => ({ id: s.slug, deps: s.requires ? [s.requires] : [] })),
    "section",
  );

  return { courses, sections, datasets, lessons, questions, exercises, issues };
}
