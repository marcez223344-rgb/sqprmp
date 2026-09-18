// PreToolUse hook for Bash/PowerShell: blocks destructive or production-affecting
// commands and scans staged files for secrets on `git commit`.
// Exit 0 with a JSON decision (deny/ask) or exit 0 silently to allow.
import { execSync } from "node:child_process";
import { readInput, disabled, decision, findSecrets } from "./_lib.mjs";

const EVENT = "PreToolUse";
if (disabled()) process.exit(0);

const input = readInput();
const cmd = String(input?.tool_input?.command ?? "");
if (!cmd) process.exit(0);
const c = cmd.replace(/\s+/g, " ").trim();

// Hard denials: production deploys, remote DB mutations, history rewriting, wipes.
const DENY = [
  {
    re: /\bvercel\b.*(--prod\b|\bpromote\b|\brollback\b)/i,
    why: "Production deploys/promotions require explicit owner approval (docs/DEPLOYMENT.md). Use a preview deploy.",
  },
  {
    re: /\bsupabase\b.*\bdb\s+push\b/i,
    why: "`supabase db push` applies migrations to the linked remote project; requires explicit owner approval.",
  },
  {
    re: /\bsupabase\b.*\bdb\s+reset\b.*(--linked|--db-url)/i,
    why: "Resetting a remote database is destructive and blocked.",
  },
  { re: /\bsupabase\b.*\bprojects\s+delete\b/i, why: "Deleting Supabase projects is blocked." },
  {
    re: /\bgit\s+push\b.*(--force\b|-f\b|--force-with-lease\b)/i,
    why: "Force-push is blocked; rewriting shared history needs owner approval.",
  },
  {
    re: /\bgit\s+(reset\s+--hard|clean\s+-[a-z]*f[a-z]*d|branch\s+-D)\b/i,
    why: "Destructive git operation blocked; ask the owner.",
  },
  {
    re: /\brm\s+-[a-z]*r[a-z]*f?\s+(\/|~|\.\.|\*|C:\\?|\$HOME)\b/i,
    why: "Recursive delete of a root/parent path is blocked.",
  },
  {
    re: /\bRemove-Item\b.*-Recurse\b.*(\s\/|\sC:\\|\s~|\s\.\.)/i,
    why: "Recursive delete of a root/parent path is blocked.",
  },
  {
    re: /\b(drop\s+(database|schema)|truncate\s+table)\b/i,
    why: "Destructive SQL against a database is blocked from hooks; write a reviewed migration instead.",
  },
  {
    re: /\bstripe\b.*--live\b/i,
    why: "Stripe live mode is blocked until the owner approves production payments.",
  },
  {
    re: /\b(printenv|env)\b\s*$|\becho\s+\$?\{?(SUPABASE_SECRET_KEY|MERCADOPAGO_ACCESS_TOKEN|STRIPE_SECRET_KEY)/i,
    why: "Printing environment secrets is blocked.",
  },
  // Only real file reads of .env / .env.local / .env.production (not `process.env.X` inside heredocs).
  {
    re: /\b(cat|type|less|more|head|tail|Get-Content)\s+(-\w+\s+)*["']?(\.\/)?\.env(\.local|\.production|\.development)?["']?(\s|$)/i,
    why: "Reading .env secret files is blocked; use .env.example for variable names.",
  },
];
for (const rule of DENY) {
  if (rule.re.test(c)) {
    decision(EVENT, "deny", rule.why);
    process.exit(0);
  }
}

// Ask the owner: risky but sometimes legitimate.
const ASK = [
  {
    re: /\bsupabase\s+link\b/i,
    why: "Linking to a remote Supabase project; confirm which environment.",
  },
  { re: /\bsupabase\b.*\bdb\s+reset\b/i, why: "Local DB reset drops local data; confirm." },
  {
    re: /\bnpm\s+publish\b|\bnpx\s+vercel\b(?!.*--prod)/i,
    why: "External publish/deploy; confirm target.",
  },
  { re: /\bgit\s+push\b/i, why: "Pushing to the remote; confirm branch." },
];
for (const rule of ASK) {
  if (rule.re.test(c)) {
    decision(EVENT, "ask", rule.why);
    process.exit(0);
  }
}

// Secret scan on `git commit`: inspect staged content (names of patterns only are reported).
if (/\bgit\s+commit\b/i.test(c)) {
  try {
    const staged = execSync("git diff --cached --unified=0", {
      encoding: "utf8",
      cwd: input.cwd || process.cwd(),
      maxBuffer: 20 * 1024 * 1024,
      stdio: ["ignore", "pipe", "ignore"],
    });
    const added = staged
      .split("\n")
      .filter((l) => l.startsWith("+") && !l.startsWith("+++"))
      .join("\n");
    const hits = findSecrets(added);
    const files = execSync("git diff --cached --name-only", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    })
      .split("\n")
      .filter(Boolean);
    const envFiles = files.filter(
      (f) => /(^|\/)\.env(\.[^/]+)?$/.test(f) && !/\.env\.example$/.test(f),
    );
    if (hits.length || envFiles.length) {
      const parts = [];
      if (hits.length)
        parts.push(`possible secrets detected in staged changes: ${hits.join(", ")}`);
      if (envFiles.length) parts.push(`env files staged: ${envFiles.join(", ")}`);
      decision(
        EVENT,
        "deny",
        `Commit blocked: ${parts.join("; ")}. Remove them, rotate if real, then retry.`,
      );
      process.exit(0);
    }
  } catch {
    // Not a git repo or git unavailable: do not block.
  }
}
process.exit(0);
