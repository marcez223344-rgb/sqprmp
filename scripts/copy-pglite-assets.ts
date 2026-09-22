/**
 * Copies the PGlite browser bundle and the shared sandbox core to public/ so the browser
 * engine can load them as same-origin static files (strict CSP, no bundler WASM handling).
 * Runs before dev/build (package.json predev/prebuild).
 */
import { copyFileSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const dist = join(root, "node_modules", "@electric-sql", "pglite", "dist");
const outPglite = join(root, "public", "pglite");
const outCore = join(root, "public", "sandbox-core");
mkdirSync(outPglite, { recursive: true });
mkdirSync(outCore, { recursive: true });

const wanted = readdirSync(dist).filter(
  (f) =>
    f === "index.js" ||
    /^chunk-.*\.js$/.test(f) ||
    f === "pglite.wasm" ||
    f === "pglite.data" ||
    f === "initdb.wasm",
);
for (const f of wanted) copyFileSync(join(dist, f), join(outPglite, f));

for (const f of ["engine-core.mjs", "denied-functions.mjs"]) {
  copyFileSync(join(root, "sandbox-runtime", f), join(outCore, f));
}
const version = (
  JSON.parse(
    readFileSync(join(root, "node_modules", "@electric-sql", "pglite", "package.json"), "utf8"),
  ) as { version: string }
).version;
writeFileSync(join(outPglite, "VERSION"), version + "\n");
console.log(
  `assets:pglite — copied ${wanted.length} PGlite files (v${version}) and sandbox core to public/`,
);
