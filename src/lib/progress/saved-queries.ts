import "server-only";
import { createClient } from "@/lib/supabase/server";

export interface SavedQuery {
  id: string;
  title: string;
  sql: string;
  datasetSlug: string;
  updatedAt: string;
}

/**
 * The learner's saved queries, most recent first.
 *
 * One query, two surfaces: the /consultas page and the panel inside the exercise workspace read
 * through here, so "my saved queries" can never mean two different things. The filter on
 * `user_id` is redundant with RLS on `saved_queries` and kept as a second lock: this is the only
 * place either surface reads the table.
 */
export async function listSavedQueries(userId: string): Promise<SavedQuery[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("saved_queries")
    .select("id, title, sql, dataset_slug, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((q) => ({
    id: q.id,
    title: q.title,
    sql: q.sql,
    datasetSlug: q.dataset_slug,
    updatedAt: q.updated_at,
  }));
}
