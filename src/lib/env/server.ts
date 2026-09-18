import "server-only";
import { z } from "zod";

/**
 * Server-side environment. Validated once at first import; a missing variable
 * fails loudly instead of silently degrading. Never import this from client code.
 */
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(20),
  NEXT_PUBLIC_APP_URL: z.url(),
  SUPABASE_SECRET_KEY: z.string().min(20),
  SANDBOX_SIGNING_SECRET: z.string().min(32),
  CERTIFICATE_SIGNING_SECRET: z.string().min(32),
  CRON_SECRET: z.string().min(32),
  PAYMENT_PROVIDERS: z
    .string()
    .default("manual")
    .transform((s) =>
      s
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean),
    ),
  HOTMART_CLIENT_ID: z.string().optional(),
  HOTMART_CLIENT_SECRET: z.string().optional(),
  HOTMART_WEBHOOK_HOTTOK: z.string().optional(),
  MERCADOPAGO_ACCESS_TOKEN: z.string().optional(),
  MERCADOPAGO_WEBHOOK_SECRET: z.string().optional(),
});

export type ServerEnv = z.infer<typeof schema>;

function load(): ServerEnv {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    // Variable names only; values are never logged.
    throw new Error(`Invalid server environment: ${issues}`);
  }
  return parsed.data;
}

let cached: ServerEnv | undefined;

export function serverEnv(): ServerEnv {
  cached ??= load();
  return cached;
}
