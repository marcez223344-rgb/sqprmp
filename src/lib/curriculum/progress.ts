import "server-only";
import { createClient } from "@/lib/supabase/server";

/** Records that the current user viewed a lesson (idempotent; safe to call during render). */
export async function recordLessonView(slug: string): Promise<void> {
  const supabase = await createClient();
  await supabase.rpc("mark_lesson_viewed", { p_lesson_slug: slug, p_completed: false });
}
