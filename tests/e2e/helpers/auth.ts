import type { BrowserContext } from "@playwright/test";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

/**
 * E2E authentication against a local Supabase stack (CI: `supabase start`).
 * Creates a confirmed test user with the admin API, signs in with a password to obtain
 * a session, then serializes it into the exact cookies @supabase/ssr expects.
 * Google OAuth itself is not exercised (it belongs to Google); everything after the
 * callback is real.
 */
export const e2eSupabase = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "",
  secretKey: process.env.SUPABASE_SECRET_KEY ?? "",
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3100",
};

export const hasLocalSupabase =
  Boolean(process.env.E2E_SUPABASE) && Boolean(e2eSupabase.secretKey) && Boolean(e2eSupabase.url);

export interface TestUser {
  id: string;
  email: string;
  password: string;
}

export async function createTestUser(prefix = "e2e"): Promise<TestUser> {
  const admin = createClient(e2eSupabase.url, e2eSupabase.secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const email = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@ejemplo.lat`;
  const password = `Pw-${Math.random().toString(36).slice(2)}-${Date.now()}`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "Persona Prueba" },
  });
  if (error || !data.user) throw new Error(`createUser failed: ${error?.message}`);
  return { id: data.user.id, email, password };
}

export async function deleteTestUser(id: string) {
  const admin = createClient(e2eSupabase.url, e2eSupabase.secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  await admin.auth.admin.deleteUser(id);
}

export async function signInAs(context: BrowserContext, user: TestUser) {
  const anon = createClient(e2eSupabase.url, e2eSupabase.publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await anon.auth.signInWithPassword({
    email: user.email,
    password: user.password,
  });
  if (error || !data.session) throw new Error(`signIn failed: ${error?.message}`);

  // Let @supabase/ssr produce the cookie chunks exactly as the app expects them.
  const jar: { name: string; value: string; options: CookieOptions }[] = [];
  const ssr = createServerClient(e2eSupabase.url, e2eSupabase.publishableKey, {
    cookies: {
      getAll: () => jar.map(({ name, value }) => ({ name, value })),
      setAll: (cookies) => {
        for (const c of cookies) jar.push({ name: c.name, value: c.value, options: c.options });
      },
    },
  });
  await ssr.auth.setSession({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  });

  const { hostname } = new URL(e2eSupabase.appUrl);
  await context.addCookies(
    jar.map((c) => ({
      name: c.name,
      value: c.value,
      domain: hostname,
      path: "/",
      httpOnly: false,
      secure: false,
      sameSite: "Lax" as const,
    })),
  );
}
