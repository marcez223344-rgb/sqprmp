import "server-only";
import { track } from "@/lib/analytics/track";
import { createClient } from "@/lib/supabase/server";

/** Records that the current user viewed a lesson (idempotent; safe to call during render). */
export async function recordLessonView(
  slug: string,
  kind = "theory",
  userId?: string,
): Promise<void> {
  const supabase = await createClient();
  await supabase.rpc("mark_lesson_viewed", { p_lesson_slug: slug, p_completed: false });
  await track("lesson_viewed", { lesson_slug: slug, kind }, { userId: userId ?? null });
}
