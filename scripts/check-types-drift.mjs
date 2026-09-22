/**
 * Compares the committed database types with a freshly generated file, restricted to the shape
 * of the `public` schema's tables and views: every table's Row / Insert / Update members and
 * their declared types.
 *
 * Why not a plain diff of the whole file: `src/types/database.ts` is hand-maintained (generating
 * it needs a local Docker daemon), so it differs from the generator's output in ways that cannot
 * break a query — field order, Prettier's line breaking, the `Relationships` metadata, and a
 * `Functions` block that types every RPC argument as non-nullable although the migrations give
 * them defaults. A missing, extra or retyped column does break queries, and that is what this
 * checks, by parsing both files with the TypeScript compiler.
 *
 * Usage: node scripts/check-types-drift.mjs <generated.ts> <committed.ts>
 */
import { readFileSync } from "node:fs";
import ts from "typescript";

const SECTIONS = new Set(["Row", "Insert", "Update"]);
const ROW_ONLY = new Set(["Row"]);

function memberName(member) {
  const n = member.name;
  if (!n) return null;
  return ts.isIdentifier(n) || ts.isStringLiteral(n) ? n.text : null;
}

/** "<table>.<Row|Insert|Update>.<field>" → declared type, for the public schema. */
function fieldTypes(source, label) {
  const file = ts.createSourceFile(label, source, ts.ScriptTarget.Latest, true);
  const out = new Map();

  // Views expose Insert/Update only because Postgres considers them updatable; nothing in the
  // app writes through them, so only their Row shape is compared.
  const readSections = (table, node, allowed) => {
    for (const section of node.members ?? []) {
      const sectionName = memberName(section);
      if (!allowed.has(sectionName) || !section.type || !ts.isTypeLiteralNode(section.type))
        continue;
      for (const field of section.type.members) {
        const fieldName = memberName(field);
        if (!fieldName || !field.type) continue;
        const optional = field.questionToken ? "?" : "";
        out.set(
          `${table}.${sectionName}.${fieldName}${optional}`,
          field.type.getText(file).replace(/\s+/g, " ").trim(),
        );
      }
    }
  };

  const visit = (node) => {
    if (
      ts.isPropertySignature(node) &&
      memberName(node) === "public" &&
      node.type &&
      ts.isTypeLiteralNode(node.type)
    ) {
      for (const group of node.type.members) {
        const groupName = memberName(group);
        if ((groupName !== "Tables" && groupName !== "Views") || !group.type) continue;
        if (!ts.isTypeLiteralNode(group.type)) continue;
        for (const table of group.type.members) {
          const tableName = memberName(table);
          if (!tableName || !table.type || !ts.isTypeLiteralNode(table.type)) continue;
          readSections(tableName, table.type, groupName === "Views" ? ROW_ONLY : SECTIONS);
        }
      }
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(file);

  if (out.size === 0) throw new Error(`${label}: parsed no table fields`);
  return out;
}

const [generatedPath, committedPath] = process.argv.slice(2);
const generated = fieldTypes(readFileSync(generatedPath, "utf8"), "generated");
const committed = fieldTypes(readFileSync(committedPath, "utf8"), "committed");

const problems = [];
for (const [key, type] of generated) {
  if (!committed.has(key)) problems.push(`missing from src/types/database.ts: ${key}: ${type}`);
  else if (committed.get(key) !== type)
    problems.push(`${key}: committed "${committed.get(key)}", schema "${type}"`);
}
for (const key of committed.keys()) {
  if (!generated.has(key)) problems.push(`not in the schema any more: ${key}`);
}

if (problems.length === 0) {
  console.log(`Tables and views match the schema (${generated.size} fields checked).`);
  process.exit(0);
}
console.error("src/types/database.ts drifted from the schema:");
for (const p of problems.slice(0, 25)) console.error(`  ${p}`);
if (problems.length > 25) console.error(`  … and ${problems.length - 25} more`);
process.exit(1);
