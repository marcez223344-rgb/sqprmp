import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { serverEnv } from "@/lib/env/server";
import type { Database } from "@/types/database";

/**
 * Privileged client using the secret key. Bypasses RLS.
 * Only for: webhooks, reward/entitlement RPCs, certificate issuance, admin tasks.
 * Never import from anything that runs in the browser or from src/lib/sandbox.
 */
export function createAdminClient() {
  const env = serverEnv();
  return createSupabaseClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
