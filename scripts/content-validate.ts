/**
 * Validates authored content against the Zod schemas and cross-references.
 * Exit code 1 on any issue. Usage: npm run content:validate
 */
import { loadContent } from "../src/content/load";

const loaded = loadContent();

if (loaded.issues.length) {
  console.error(`content:validate — ${loaded.issues.length} issue(s):`);
  for (const i of loaded.issues) console.error(`  [${i.kind}] ${i.slug}: ${i.message}`);
  process.exit(1);
}

const published = (xs: { is_published: boolean }[]) => xs.filter((x) => x.is_published).length;
console.log(
  `content:validate — OK. courses ${loaded.courses.length}, sections ${loaded.sections.length} (${published(loaded.sections)} published), lessons ${loaded.lessons.length}, questions ${loaded.questions.length}, exercises ${loaded.exercises.length}, datasets ${loaded.datasets.length}.`,
);
