import "server-only";
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type SectionRow = Database["public"]["Tables"]["sections"]["Row"];
export type LessonPublicRow = Database["public"]["Views"]["lessons_public"]["Row"];

export interface PathLesson {
  id: string;
  slug: string;
  kind: string;
  title: string;
  sort_order: number;
  estimated_minutes: number;
  is_free: boolean;
  is_published: boolean;
  status: "not_started" | "in_progress" | "completed";
}

export interface PathSection extends Pick<
  SectionRow,
  | "id"
  | "slug"
  | "number"
  | "level"
  | "title"
  | "summary"
  | "is_free_theory"
  | "is_published"
  | "certificate_slug"
> {
  objectives: string[];
  lessons: PathLesson[];
  completed_lessons: number;
}

export const LEVEL_ORDER = ["beginner", "intermediate", "advanced", "expert"] as const;

/** Full path with per-lesson progress for the current user (or none for anonymous). */
export const getLearningPath = cache(async (userId?: string): Promise<PathSection[]> => {
  const supabase = await createClient();
  const [{ data: sections }, { data: lessons }, progress] = await Promise.all([
    supabase.from("sections").select("*").order("number"),
    supabase.from("lessons_public").select("*").order("sort_order"),
    userId
      ? supabase.from("lesson_progress").select("lesson_id, status").eq("user_id", userId)
      : Promise.resolve({ data: [] as { lesson_id: string; status: string }[] }),
  ]);
  const progressByLesson = new Map((progress.data ?? []).map((p) => [p.lesson_id, p.status]));

  return (sections ?? []).map((s) => {
    const sectionLessons: PathLesson[] = (lessons ?? [])
      .filter((l) => l.section_id === s.id && l.id && l.slug)
      .map((l) => ({
        id: l.id as string,
        slug: l.slug as string,
        kind: l.kind ?? "theory",
        title: l.title ?? "",
        sort_order: l.sort_order ?? 0,
        estimated_minutes: l.estimated_minutes ?? 0,
        is_free: Boolean(l.is_free),
        is_published: Boolean(l.is_published),
        status: (progressByLesson.get(l.id as string) as PathLesson["status"]) ?? "not_started",
      }));
    return {
      id: s.id,
      slug: s.slug,
      number: s.number,
      level: s.level,
      title: s.title,
      summary: s.summary,
      is_free_theory: s.is_free_theory,
      is_published: s.is_published,
      certificate_slug: s.certificate_slug,
      objectives: Array.isArray(s.objectives) ? (s.objectives as string[]) : [],
      lessons: sectionLessons,
      completed_lessons: sectionLessons.filter((l) => l.status === "completed").length,
    };
  });
});

export interface LessonDetail {
  lesson: LessonPublicRow & { id: string; slug: string };
  section: Pick<SectionRow, "id" | "slug" | "number" | "title" | "level">;
  siblings: PathLesson[];
  questionCount: number;
}

export const getLessonBySlug = cache(async (slug: string): Promise<LessonDetail | null> => {
  const supabase = await createClient();
  const { data: lesson } = await supabase
    .from("lessons_public")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (!lesson?.id || !lesson.slug || !lesson.section_id) return null;

  const [{ data: section }, { data: siblings }, { count }] = await Promise.all([
    supabase
      .from("sections")
      .select("id, slug, number, title, level")
      .eq("id", lesson.section_id)
      .single(),
    supabase
      .from("lessons_public")
      .select("*")
      .eq("section_id", lesson.section_id)
      .order("sort_order"),
    lesson.kind === "quiz"
      ? supabase
          .from("questions_public")
          .select("id", { count: "exact", head: true })
          .eq("section_id", lesson.section_id)
      : Promise.resolve({ count: 0 }),
  ]);
  if (!section) return null;

  return {
    lesson: lesson as LessonPublicRow & { id: string; slug: string },
    section,
    siblings: (siblings ?? [])
      .filter((l) => l.id && l.slug)
      .map((l) => ({
        id: l.id as string,
        slug: l.slug as string,
        kind: l.kind ?? "theory",
        title: l.title ?? "",
        sort_order: l.sort_order ?? 0,
        estimated_minutes: l.estimated_minutes ?? 0,
        is_free: Boolean(l.is_free),
        is_published: Boolean(l.is_published),
        status: "not_started",
      })),
    questionCount: count ?? 0,
  };
});

/**
 * Premium lesson bodies are not readable by learners (column privilege). The server reads
 * them with the admin client only after `canReadLesson()` returned "ok".
 */
export async function getPremiumLessonBody(lessonId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("lessons")
    .select("body_md")
    .eq("id", lessonId)
    .eq("is_published", true)
    .maybeSingle();
  return data?.body_md ?? null;
}
