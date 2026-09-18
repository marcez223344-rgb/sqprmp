import { defineConfig, devices } from "@playwright/test";

const port = 3100;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${port}`,
    trace: "on-first-retry",
    navigationTimeout: 60_000,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: `npm run build && npx next start -p ${port}`,
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
    env: {
      ...process.env,
      NEXT_PUBLIC_SUPABASE_URL:
        process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
        "sb_publishable_placeholder_key_for_tests",
      NEXT_PUBLIC_APP_URL: `http://localhost:${port}`,
      // Server-only secrets are validated at boot; placeholders satisfy the schema in tests.
      SUPABASE_SECRET_KEY:
        process.env.SUPABASE_SECRET_KEY ?? "sb_secret_placeholder_key_for_tests_only",
      SANDBOX_SIGNING_SECRET: process.env.SANDBOX_SIGNING_SECRET ?? "0".repeat(32),
      CERTIFICATE_SIGNING_SECRET: process.env.CERTIFICATE_SIGNING_SECRET ?? "0".repeat(32),
      CRON_SECRET: process.env.CRON_SECRET ?? "0".repeat(32),
    },
  },
});
