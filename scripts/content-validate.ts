/**
 * Validates authored content against the Zod schemas (Phase 3).
 * Until content exists this is a no-op that exits successfully.
 */
import { existsSync } from "node:fs";

const contentDir = new URL("../src/content/", import.meta.url);
if (!existsSync(contentDir)) {
  console.log("content:validate — no content directory yet (Phase 3). OK.");
  process.exit(0);
}
console.log("content:validate — schemas not implemented yet (Phase 3).");
process.exit(0);
