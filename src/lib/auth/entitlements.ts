import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

/**
 * Access decisions for premium content. The `entitlements` table arrives in Phase 6;
 * until then only admins have premium access, so nothing premium leaks by accident.
 */
export const hasActiveEntitlement = cache(async (profile: Profile): Promise<boolean> => {
  if (profile.role === "admin") return true;
  const supabase = await createClient();
  // Table may not exist before Phase 6; treat any error as "no access" (fail closed).
  const { data, error } = await supabase
    .from("entitlements" as never)
    .select("id")
    .eq("user_id", profile.id)
    .is("revoked_at", null)
    .or("ends_at.is.null,ends_at.gt.now()")
    .limit(1);
  if (error) return false;
  return Array.isArray(data) && data.length > 0;
});

export async function canReadLesson(
  profile: Profile | null,
  lesson: { is_free: boolean | null; is_published: boolean | null },
): Promise<"ok" | "locked" | "unavailable"> {
  if (!lesson.is_published) return profile?.role === "admin" ? "ok" : "unavailable";
  if (lesson.is_free) return "ok";
  if (!profile) return "locked";
  return (await hasActiveEntitlement(profile)) ? "ok" : "locked";
}
