import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

/** Validated user (round-trips to Supabase Auth); cached per request. */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  return data;
});

/** Redirects to login when no valid session exists. */
export async function requireUser(nextPath?: string) {
  const user = await getCurrentUser();
  if (!user) redirect(nextPath ? `/ingresar?next=${encodeURIComponent(nextPath)}` : "/ingresar");
  return user;
}

/** Requires a session and a completed onboarding; redirects otherwise. */
export async function requireOnboardedProfile(nextPath?: string) {
  await requireUser(nextPath);
  const profile = await getCurrentProfile();
  if (!profile || profile.deleted_at) redirect("/ingresar");
  if (!profile.onboarding_completed_at) redirect("/onboarding");
  return profile;
}

export async function requireAdmin() {
  const profile = await requireOnboardedProfile("/admin");
  if (profile.role !== "admin") redirect("/aprender");
  return profile;
}
