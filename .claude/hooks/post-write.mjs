// PostToolUse hook for Edit/Write/MultiEdit: formats the file with the project's
// Prettier (if installed), warns about migrations without RLS or with destructive
// statements, and reminds about documentation updates for architectural files.
import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { readInput, disabled, context, normalizePath } from "./_lib.mjs";

const EVENT = "PostToolUse";
if (disabled()) process.exit(0);

const input = readInput();
const file = normalizePath(input?.tool_input?.file_path || "");
if (!file || !existsSync(file)) process.exit(0);
const root = normalizePath(input.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd());
const rel = file.startsWith(root + "/") ? file.slice(root.length + 1) : file;
const notes = [];

// 1. Prettier (only when the project has it installed; never installs anything).
const prettierBin = join(
  root,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "prettier.cmd" : "prettier",
);
if (/\.(ts|tsx|js|mjs|cjs|json|css|md|mdx|yml|yaml)$/.test(rel) && existsSync(prettierBin)) {
  const r = spawnSync(prettierBin, ["--write", "--log-level", "warn", file], {
    cwd: root,
    encoding: "utf8",
    shell: process.platform === "win32",
    timeout: 15000,
  });
  if (r.status !== 0) notes.push(`prettier could not format ${rel} (exit ${r.status}).`);
}

// 2. Migration checks.
if (/^supabase\/migrations\/.+\.sql$/.test(rel)) {
  const sql = readFileSync(file, "utf8");
  const created = [
    ...sql.matchAll(
      /create\s+table\s+(if\s+not\s+exists\s+)?(?:public\.)?"?([a-z_][a-z0-9_]*)"?/gi,
    ),
  ].map((m) => m[2]);
  const rlsEnabled = new Set(
    [
      ...sql.matchAll(
        /alter\s+table\s+(?:public\.)?"?([a-z_][a-z0-9_]*)"?\s+enable\s+row\s+level\s+security/gi,
      ),
    ].map((m) => m[1]),
  );
  const missing = created.filter((t) => !rlsEnabled.has(t));
  if (missing.length)
    notes.push(
      `RLS WARNING: tables created without \`enable row level security\` in this migration: ${missing.join(", ")}. See rules/database.md.`,
    );
  if (/\b(drop\s+(table|column)|truncate|delete\s+from\s+\S+\s*;)/i.test(sql))
    notes.push(
      "DESTRUCTIVE MIGRATION WARNING: contains drop/truncate/unconditional delete. Requires an expand/contract note in the header and owner approval.",
    );
  if (/security\s+definer/i.test(sql) && !/set\s+search_path/i.test(sql))
    notes.push("SECURITY DEFINER function without `set search_path`; pin it (rules/database.md).");
  notes.push("Reminder: regenerate types, add pgTAP tests, update docs/DATABASE_DESIGN.md.");
}

// 3. Documentation reminders for architectural surfaces.
if (
  /^(package\.json|next\.config\.(ts|js|mjs)|src\/config\/.+|src\/lib\/env\/.+|\.env\.example|src\/lib\/sandbox\/.+|src\/lib\/payments\/.+)$/.test(
    rel,
  )
) {
  notes.push(
    "Docs reminder: this file affects architecture/config. Apply CLAUDE.md → Documentation update rules (ARCHITECTURE/DEPLOYMENT/SECURITY/DECISIONS as relevant).",
  );
}

if (notes.length) context(EVENT, notes.join("\n"));
process.exit(0);
