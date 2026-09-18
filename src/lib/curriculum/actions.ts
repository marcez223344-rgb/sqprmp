"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const slugSchema = z.string().regex(/^[a-z0-9-]{2,80}$/);

/** Marks a published lesson as viewed/completed for the current user (idempotent RPC). */
export async function markLessonViewed(rawSlug: unknown, completed: boolean) {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const, error: "unauthorized" };
  const slug = slugSchema.safeParse(rawSlug);
  if (!slug.success) return { ok: false as const, error: "validation" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_lesson_viewed", {
    p_lesson_slug: slug.data,
    p_completed: completed,
  });
  if (error) return { ok: false as const, error: "unknown" };
  revalidatePath("/ruta");
  revalidatePath(`/leccion/${slug.data}`);
  return { ok: true as const };
}
