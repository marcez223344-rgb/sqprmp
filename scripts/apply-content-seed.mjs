/**
 * Applies supabase/seed/0002_content.sql to the linked Supabase project in chunks.
 *
 * `npx supabase db query --linked --file supabase/seed/0002_content.sql` fails with
 * HTTP 413 "request entity too large": the seed is one ~3.8 MB transaction and the query
 * endpoint caps the request body.
 *
 * Splitting has to be dollar-quote aware. The obvious blank-line split is wrong: lesson
 * `body_md` is markdown and full of blank lines, so it cuts statements in half (it finds 7731
 * "statements" where the generator wrote 4802). This walks the text instead, tracking whether it
 * is inside a `$tag$ … $tag$` literal, and only treats a `;` outside one as a statement end.
 *
 * Each chunk runs in its own transaction. Every statement is `on conflict (slug) do update`, so
 * the seed is idempotent and a run interrupted halfway is fixed by running it again. Chunks are
 * applied in file order, which preserves the generator's course → sections → lessons →
 * questions → exercises dependency order.
 *
 * Usage: node scripts/apply-content-seed.mjs [path-to-seed] [--dry-run]
 */
import { execFileSync, execSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const seedPath = args.find((a) => !a.startsWith("--")) ?? "supabase/seed/0002_content.sql";
const MAX_BYTES = 900_000;

/** Splits SQL into statements, ignoring semicolons inside dollar-quoted literals. */
function splitStatements(sql) {
  const statements = [];
  let start = 0;
  let i = 0;
  let tag = null; // the open dollar-quote tag, e.g. "$c12$"
  while (i < sql.length) {
    if (tag) {
      const end = sql.indexOf(tag, i);
      if (end === -1) throw new Error(`unterminated dollar-quoted literal ${tag}`);
      i = end + tag.length;
      tag = null;
      continue;
    }
    const ch = sql[i];
    if (ch === "$") {
      // A dollar-quote tag is $ followed by an optional identifier and another $.
      const m = /^\$[A-Za-z_0-9]*\$/.exec(sql.slice(i, i + 64));
      if (m) {
        tag = m[0];
        i += m[0].length;
        continue;
      }
    }
    if (ch === "'") {
      // Ordinary single-quoted string; '' is an escaped quote.
      i += 1;
      while (i < sql.length) {
        if (sql[i] === "'" && sql[i + 1] === "'") i += 2;
        else if (sql[i] === "'") break;
        else i += 1;
      }
      i += 1;
      continue;
    }
    if (ch === "-" && sql[i + 1] === "-") {
      const nl = sql.indexOf("\n", i);
      i = nl === -1 ? sql.length : nl + 1;
      continue;
    }
    if (ch === ";") {
      const s = sql.slice(start, i + 1).trim();
      if (s) statements.push(s);
      start = i + 1;
      i += 1;
      continue;
    }
    i += 1;
  }
  const tail = sql.slice(start).trim();
  if (tail) statements.push(tail);
  return statements;
}

const all = splitStatements(readFileSync(seedPath, "utf8"));
// The seed wraps everything in one transaction; each chunk gets its own instead.
const statements = all.filter((s) => s !== "begin;" && s !== "commit;");

const chunks = [];
let current = [];
let size = 0;
for (const statement of statements) {
  if (current.length && size + statement.length > MAX_BYTES) {
    chunks.push(current);
    current = [];
    size = 0;
  }
  current.push(statement);
  size += statement.length + 2;
}
if (current.length) chunks.push(current);

/**
 * Runs one chunk through the Supabase CLI.
 *
 * On Windows `npx` is a .cmd, and Node 20+ refuses to spawn a .cmd without a shell (EINVAL).
 * Going through the shell means the path has to be quoted by hand rather than passed as an
 * argument vector, so the temp path is produced by mkdtemp and never contains a quote.
 */
function runSupabaseQuery(file) {
  const args = ["supabase", "db", "query", "--linked", "--file", file];
  const options = { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 };
  if (process.platform !== "win32") return execFileSync("npx", args, options);
  return execSync(`npx.cmd supabase db query --linked --file "${file}"`, options);
}

const dir = mkdtempSync(join(tmpdir(), "content-seed-"));
console.log(`${statements.length} statements → ${chunks.length} chunks`);

try {
  for (const [i, chunk] of chunks.entries()) {
    const file = join(dir, `chunk_${String(i).padStart(3, "0")}.sql`);
    writeFileSync(file, `begin;\n\n${chunk.join("\n\n")}\n\ncommit;\n`, "utf8");
    process.stdout.write(`  chunk ${i + 1}/${chunks.length} (${chunk.length} statements) … `);
    if (dryRun) {
      console.log("written, not applied");
      continue;
    }
    const out = runSupabaseQuery(file);
    if (out.includes('"_tag":"Error"')) {
      console.log("FAILED");
      console.error(out.slice(0, 2000));
      process.exit(1);
    }
    console.log("ok");
  }
  console.log(dryRun ? "dry run only — nothing was applied." : "content seed applied.");
} finally {
  rmSync(dir, { recursive: true, force: true });
}
