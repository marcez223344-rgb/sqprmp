/**
 * Applies supabase/seed/0002_content.sql to the linked Supabase project in chunks.
 *
 * `npx supabase db query --linked --file supabase/seed/0002_content.sql` fails with
 * HTTP 413 "request entity too large": the seed is one ~3.8 MB transaction and the query
 * endpoint caps the request body. Statements in the generated seed are separated by blank
 * lines and every string literal is dollar-quoted with a unique tag ($c0$, $c1$, …), so
 * splitting on blank-line boundaries can never cut through a literal.
 *
 * Each chunk runs in its own transaction. Every statement is `on conflict (slug) do update`,
 * so the seed is idempotent and a run interrupted halfway is fixed by running it again.
 * Chunks are applied in file order, which preserves the course → sections → lessons →
 * questions → exercises dependency order the generator emits.
 *
 * Usage: node scripts/apply-content-seed.mjs [path-to-seed]
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const seedPath = process.argv[2] ?? "supabase/seed/0002_content.sql";
const MAX_BYTES = 900_000;

const blocks = readFileSync(seedPath, "utf8")
  .split("\n\n")
  .map((b) => b.trim())
  .filter((b) => b && b !== "begin;" && b !== "commit;");

const chunks = [];
let current = [];
let size = 0;
for (const block of blocks) {
  if (current.length && size + block.length > MAX_BYTES) {
    chunks.push(current);
    current = [];
    size = 0;
  }
  current.push(block);
  size += block.length + 2;
}
if (current.length) chunks.push(current);

const dir = mkdtempSync(join(tmpdir(), "content-seed-"));
console.log(`${blocks.length} statements → ${chunks.length} chunks`);

try {
  for (const [i, chunk] of chunks.entries()) {
    const file = join(dir, `chunk_${String(i).padStart(3, "0")}.sql`);
    writeFileSync(file, `begin;\n\n${chunk.join("\n\n")}\n\ncommit;\n`, "utf8");
    process.stdout.write(`  chunk ${i + 1}/${chunks.length} … `);
    const out = execFileSync(
      process.platform === "win32" ? "npx.cmd" : "npx",
      ["supabase", "db", "query", "--linked", "--file", file],
      { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
    );
    if (out.includes('"_tag":"Error"')) {
      console.log("FAILED");
      console.error(out.slice(0, 2000));
      process.exit(1);
    }
    console.log("ok");
  }
  console.log("content seed applied.");
} finally {
  rmSync(dir, { recursive: true, force: true });
}
