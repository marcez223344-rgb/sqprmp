/**
 * Wires authored section modules into src/content/index.ts.
 *
 * Content is authored one section at a time (often in parallel), and every author would otherwise
 * edit the same registry file. This script adds the imports and the spreads for a section slug,
 * idempotently, so the registry is never hand-merged.
 *
 * Usage: node scripts/register-content.mjs <section-slug> [<section-slug> ...]
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const indexPath = join(root, "src", "content", "index.ts");
const KINDS = [
  { dir: "lessons", named: "lessons", suffix: "Lessons", list: "lessons" },
  { dir: "questions", named: "questions", suffix: "Questions", list: "questions" },
  { dir: "exercises", named: "exercises", suffix: "Exercises", list: "exercises" },
];

const camel = (slug) =>
  slug.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase()).replace(/^[0-9]/, (d) => `_${d}`);

let source = readFileSync(indexPath, "utf8");
const added = [];
const skipped = [];

for (const slug of process.argv.slice(2)) {
  for (const kind of KINDS) {
    const file = join(root, "src", "content", kind.dir, `${slug}.ts`);
    if (!existsSync(file)) {
      skipped.push(`${kind.dir}/${slug}.ts (missing)`);
      continue;
    }
    const alias = `${camel(slug)}${kind.suffix}`;
    if (source.includes(`${alias} }`)) {
      skipped.push(`${alias} (already registered)`);
      continue;
    }
    const importLine = `import { ${kind.named} as ${alias} } from "./${kind.dir}/${slug}";\n`;
    // Place each import after the last import of the same kind, keeping the file's grouping.
    const importRe = new RegExp(
      `import \\{ ${kind.named} as [A-Za-z0-9_]+ \\} from "\\./${kind.dir}/[^"]+";\\n`,
      "g",
    );
    const matches = [...source.matchAll(importRe)];
    if (matches.length === 0) throw new Error(`no ${kind.dir} imports found in index.ts`);
    const last = matches[matches.length - 1];
    const at = last.index + last[0].length;
    source = source.slice(0, at) + importLine + source.slice(at);

    // And the spread at the end of the matching array.
    const listRe = new RegExp(`(  ${kind.list}: \\[\\n(?:    \\.\\.\\.[A-Za-z0-9_]+,\\n)+)`);
    const listMatch = source.match(listRe);
    if (!listMatch) throw new Error(`no ${kind.list} array found in index.ts`);
    source = source.replace(listRe, `$1    ...${alias},\n`);
    added.push(alias);
  }
}

writeFileSync(indexPath, source);
console.log(`registered: ${added.join(", ") || "nothing"}`);
if (skipped.length) console.log(`skipped: ${skipped.join(", ")}`);
