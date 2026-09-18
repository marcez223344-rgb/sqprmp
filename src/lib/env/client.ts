import { z } from "zod";

/**
 * Browser-safe environment. Next.js inlines NEXT_PUBLIC_* at build time, so each
 * variable must be referenced explicitly (not via a dynamic key).
 */
const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(20),
  NEXT_PUBLIC_APP_URL: z.url(),
});

export type ClientEnv = z.infer<typeof schema>;

let cached: ClientEnv | undefined;

export function clientEnv(): ClientEnv {
  if (cached) return cached;
  const parsed = schema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  });
  if (!parsed.success) {
    const names = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`Missing or invalid public environment variables: ${names}`);
  }
  cached = parsed.data;
  return cached;
}
