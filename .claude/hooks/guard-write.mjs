// PreToolUse hook for Edit/Write/MultiEdit: protects generated and sensitive files
// and blocks writing secret-looking values into any file.
import { existsSync } from "node:fs";
import { readInput, disabled, decision, findSecrets, normalizePath } from "./_lib.mjs";

const EVENT = "PreToolUse";
if (disabled()) process.exit(0);

const input = readInput();
const tool = input.tool_name || "";
const ti = input.tool_input || {};
const file = normalizePath(ti.file_path || "");
const content = [ti.content, ti.new_string, ...(Array.isArray(ti.edits) ? ti.edits.map((e) => e.new_string) : [])]
  .filter(Boolean)
  .join("\n");

const rel = file.replace(normalizePath(input.cwd || process.env.CLAUDE_PROJECT_DIR || "") + "/", "");

// 1. Secret values in content (any file, including docs and tests).
const hits = findSecrets(content);
if (hits.length) {
  decision(EVENT, "deny", `Write blocked: content looks like it contains ${hits.join(", ")}. Use placeholders and .env.local.`);
  process.exit(0);
}

// 2. Env files with real values are owner-managed.
if (/(^|\/)\.env(\.[^/]+)?$/.test(rel) && !/\.env\.example$/.test(rel)) {
  decision(EVENT, "ask", "Editing a .env secret file; the owner normally manages these. Confirm placeholders only.");
  process.exit(0);
}

// 3. Generated files.
if (/^src\/types\/database\.ts$/.test(rel)) {
  decision(EVENT, "deny", "src/types/database.ts is generated. Run `npx supabase gen types typescript --local > src/types/database.ts` instead.");
  process.exit(0);
}
if (/(^|\/)package-lock\.json$/.test(rel)) {
  decision(EVENT, "deny", "package-lock.json is managed by npm; run npm install/uninstall instead.");
  process.exit(0);
}
if (/^public\/datasets\/.*\.(tar\.gz|tgz)$/.test(rel)) {
  decision(EVENT, "deny", "Dataset snapshots are built with `npm run datasets:build`, not written by hand.");
  process.exit(0);
}

// 4. Applied migrations are immutable: editing an existing migration file requires confirmation.
if (/^supabase\/migrations\/.+\.sql$/.test(rel)) {
  const isEdit = tool === "Edit" || tool === "MultiEdit" || (tool === "Write" && existsSync(file));
  if (isEdit) {
    decision(EVENT, "ask", "Editing an existing migration. If it was already applied anywhere, create a new migration instead (rules/database.md).");
    process.exit(0);
  }
}

// 5. Governance files: hooks/settings changes must be explicit.
if (/^\.claude\/(settings\.json|hooks\/.+)$/.test(rel)) {
  decision(EVENT, "ask", "Changing Claude Code hooks/settings; confirm with the owner and document in docs/CLAUDE_CODE_SETUP.md.");
  process.exit(0);
}

process.exit(0);
