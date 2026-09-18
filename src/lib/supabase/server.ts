import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { clientEnv } from "@/lib/env/client";
import type { Database } from "@/types/database";

/**
 * Server client bound to the request cookies (publishable key, RLS applies).
 * Use in Server Components, Server Actions and Route Handlers.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const env = clientEnv();
  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component: cookies are refreshed by proxy.ts instead.
          }
        },
      },
    },
  );
}
