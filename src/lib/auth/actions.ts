"use server";

import type { Route } from "next";
import { redirect } from "next/navigation";
import { z } from "zod";
import { clientEnv } from "@/lib/env/client";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/auth/redirect";

const nextSchema = z.string().max(500).optional();

export async function signInWithGoogle(formData: FormData) {
  const next = safeNextPath(nextSchema.parse(formData.get("next")?.toString() || undefined));
  const supabase = await createClient();
  const callback = new URL("/auth/callback", clientEnv().NEXT_PUBLIC_APP_URL);
  callback.searchParams.set("next", next);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: callback.toString(), queryParams: { prompt: "select_account" } },
  });
  if (error || !data.url) redirect("/ingresar?error=oauth");
  // External provider URL; typed routes only know internal paths.
  redirect(data.url as Route);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
