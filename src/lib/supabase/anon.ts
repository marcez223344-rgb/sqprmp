import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { clientEnv } from "@/lib/env/client";
import type { Database } from "@/types/database";

/**
 * Cookie-free anonymous client for reads that are identical for every visitor (the course
 * catalogue). Because it never touches cookies it can run inside `unstable_cache`, which the
 * request-bound client in `server.ts` cannot: reading cookies opts a render out of caching.
 *
 * RLS still applies with the `anon` role, so this may only be used for data that is public by
 * policy. Anything user-specific must keep using `createClient()` from `server.ts`.
 */
export function createAnonClient() {
  const env = clientEnv();
  return createSupabaseClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
  );
}
