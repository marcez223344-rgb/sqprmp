// Shared helpers for Claude Code hooks. Node ≥ 18, no dependencies.
// Disable all project hooks by setting CLAUDE_HOOKS_DISABLED=1 in your shell.
import { readFileSync } from "node:fs";

export function readInput() {
  try {
    const raw = readFileSync(0, "utf8");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function disabled() {
  return process.env.CLAUDE_HOOKS_DISABLED === "1";
}

export function decision(event, permissionDecision, reason, extra = {}) {
  const out = {
    hookSpecificOutput: {
      hookEventName: event,
      permissionDecision,
      permissionDecisionReason: reason,
      ...extra,
    },
  };
  process.stdout.write(JSON.stringify(out));
}

export function context(event, additionalContext) {
  process.stdout.write(
    JSON.stringify({ hookSpecificOutput: { hookEventName: event, additionalContext } }),
  );
}

// Secret patterns: matched against text content, never printed back in full.
export const SECRET_PATTERNS = [
  { name: "Supabase secret key", re: /sb_secret_[A-Za-z0-9_-]{10,}/ },
  { name: "JWT (service role / access token)", re: /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/ },
  { name: "Mercado Pago production token", re: /APP_USR-\d{6,}-\d{6}-[a-f0-9]{16,}/i },
  { name: "Stripe live secret", re: /sk_live_[A-Za-z0-9]{16,}/ },
  { name: "Stripe webhook secret", re: /whsec_[A-Za-z0-9]{16,}/ },
  { name: "Google OAuth client secret", re: /GOCSPX-[A-Za-z0-9_-]{20,}/ },
  { name: "Private key block", re: /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { name: "Postgres URL with password", re: /postgres(ql)?:\/\/[^:\s]+:[^@\s]{6,}@/i },
  { name: "GitHub token", re: /gh[pousr]_[A-Za-z0-9]{30,}/ },
  { name: "Vercel token assignment", re: /VERCEL_TOKEN\s*=\s*[A-Za-z0-9]{20,}/ },
];

export function findSecrets(text) {
  if (!text) return [];
  return SECRET_PATTERNS.filter((p) => p.re.test(text)).map((p) => p.name);
}

export function normalizePath(p) {
  return (p || "").replace(/\\/g, "/");
}
