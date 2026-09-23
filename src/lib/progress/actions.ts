"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { listSavedQueries, type SavedQuery } from "@/lib/progress/saved-queries";
import { createClient } from "@/lib/supabase/server";

const goalsSchema = z.object({
  daily_xp_target: z.coerce.number().int().min(10).max(1000),
  weekly_minutes_target: z.coerce.number().int().min(30).max(1200),
  reminder_opt_in: z.boolean(),
});

export async function updateGoalsAction(raw: unknown) {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const, error: "unauthorized" as const };
  const parsed = goalsSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: "validation" as const };
  const supabase = await createClient();
  const { error } = await supabase
    .from("learning_goals")
    .upsert({ user_id: user.id, ...parsed.data }, { onConflict: "user_id" });
  if (error) return { ok: false as const, error: "unknown" as const };
  revalidatePath("/aprender");
  return { ok: true as const };
}

export async function deleteSavedQueryAction(rawId: unknown) {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const, error: "unauthorized" as const };
  const id = z.uuid().safeParse(rawId);
  if (!id.success) return { ok: false as const, error: "validation" as const };
  const supabase = await createClient();
  const { error } = await supabase
    .from("saved_queries")
    .delete()
    .eq("id", id.data)
    .eq("user_id", user.id);
  if (error) return { ok: false as const, error: "unknown" as const };
  revalidatePath("/consultas");
  return { ok: true as const };
}

/**
 * The learner's own saved queries, for the panel inside the exercise workspace. Identity comes
 * from the session on the server (never from the client), and the read goes through the same
 * helper the /consultas page uses.
 */
export async function listSavedQueriesAction(): Promise<
  { ok: true; queries: SavedQuery[] } | { ok: false; error: "unauthorized" | "unknown" }
> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthorized" };
  try {
    return { ok: true, queries: await listSavedQueries(user.id) };
  } catch {
    return { ok: false, error: "unknown" };
  }
}
