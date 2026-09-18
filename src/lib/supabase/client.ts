"use client";

import { createBrowserClient } from "@supabase/ssr";
import { clientEnv } from "@/lib/env/client";
import type { Database } from "@/types/database";

let browserClient: ReturnType<typeof createBrowserClient<Database>> | undefined;

/** Browser client (publishable key only). Subject to RLS. */
export function createClient() {
  if (browserClient) return browserClient;
  const env = clientEnv();
  browserClient = createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
  return browserClient;
}
