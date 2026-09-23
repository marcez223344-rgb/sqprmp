/**
 * Copies .claude/settings.local.suggested.json over .claude/settings.local.json.
 *
 * **The owner runs this, not the assistant.** The harness refuses to let an agent edit its own
 * permission file — an agent that can widen its own permissions on request is the thing that
 * guard exists to stop — so the rules ship as a suggested file plus this one-command applier.
 *
 * Exists because the equivalent `node -e "…"` one-liner is long enough that pasting it into
 * PowerShell trips a PSReadLine rendering bug and leaves the terminal at a `>>` prompt.
 *
 * Usage, from the project root:  node scripts/apply-permissions.mjs
 *
 * The previous settings.local.json is kept as settings.local.json.bak so the change is reversible.
 */
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";

const suggested = ".claude/settings.local.suggested.json";
const target = ".claude/settings.local.json";

if (!existsSync(suggested)) {
  console.error(`Missing ${suggested}. Run this from the project root.`);
  process.exit(1);
}

const parsed = JSON.parse(readFileSync(suggested, "utf8"));
delete parsed._comment;

if (!parsed.permissions?.allow?.length) {
  console.error("The suggested file has no permissions.allow entries; refusing to write.");
  process.exit(1);
}

if (existsSync(target)) {
  copyFileSync(target, `${target}.bak`);
  console.log(`Backed up previous settings to ${target}.bak`);
}

writeFileSync(target, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
console.log(`Permissions updated: ${parsed.permissions.allow.length} rules.`);
console.log("Restart Claude Code for them to take effect.");
