"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentProfile } from "@/lib/auth/session";
import { touchActivity } from "@/lib/rewards/service";
import { createClient } from "@/lib/supabase/server";

const slugSchema = z.string().regex(/^[a-z0-9-]{2,80}$/);

/** Marks a published lesson as viewed/completed for the current user (idempotent RPC). */
export async function markLessonViewed(rawSlug: unknown, completed: boolean) {
  const profile = await getCurrentProfile();
  if (!profile) return { ok: false as const, error: "unauthorized" };
  const slug = slugSchema.safeParse(rawSlug);
  if (!slug.success) return { ok: false as const, error: "validation" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_lesson_viewed", {
    p_lesson_slug: slug.data,
    p_completed: completed,
  });
  if (error) return { ok: false as const, error: "unknown" };
  // Working through a lesson is practice. Until now `minutes_active` only moved around graded
  // submissions, so a learner who read for half an hour saw a number built from the few minutes
  // near their last quiz answer (owner feedback item 27). The 5-minute gap cap inside
  // `touch_daily_activity` is what keeps an idle tab from inflating it, and stays.
  await touchActivity(profile);
  revalidatePath("/ruta");
  revalidatePath(`/leccion/${slug.data}`);
  return { ok: true as const };
}
