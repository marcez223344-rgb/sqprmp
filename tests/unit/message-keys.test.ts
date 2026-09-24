import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import catalogue from "@/messages/es-419.json";

/**
 * Regression test for the 2026-09-24 dashboard copy bug: `/aprender` called
 * `t("continue.titleNew")`, `t("continue.introNew")`, `t("continue.ctaNew")` and `t("links.path")`,
 * none of which existed in `src/messages/es-419.json`. next-intl does not fail the build for that —
 * it logs MISSING_MESSAGE on the server and renders the key path — so a learner arriving at the
 * dashboard read "dashboard.links.path" as a link label. Only the E2E server log caught it.
 *
 * The check is deliberately lenient about *which* namespace a key belongs to: a file often creates
 * several translators, and matching each call to its own one needs a parser. A key counts as found
 * when it resolves under any namespace the file declares — enough to catch a key that exists
 * nowhere, which is the failure that reaches the learner. Keys built from a variable
 * (`` t(`types.${q.type}`) ``) are out of scope by construction.
 */

const SRC = join(process.cwd(), "src");
const NAMESPACE = /(?:use|get)Translations\(\s*"([^"]*)"/g;
/**
 * By convention every translator in this codebase is named `t`, `tc`, `tp` or `tSomething`. The
 * shape is narrow on purpose: `t[A-Za-z]*` also matches `track("paywall_viewed")`.
 */
const CALL = /\b(t[a-z]?|t[A-Z]\w*)(?:\.rich)?\(\s*"([\w.]+)"/g;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(entry) ? [path] : [];
  });
}

function has(path: string): boolean {
  let node: unknown = catalogue;
  for (const key of path.split(".").filter(Boolean)) {
    if (typeof node !== "object" || node === null) return false;
    node = (node as Record<string, unknown>)[key];
  }
  return typeof node === "string";
}

describe("es-419 message catalogue", () => {
  it("has a string for every literal key the source asks for", () => {
    const missing: string[] = [];
    for (const file of sourceFiles(SRC)) {
      const source = readFileSync(file, "utf8");
      const namespaces = [...source.matchAll(NAMESPACE)].map((m) => m[1]!);
      if (namespaces.length === 0) continue;
      for (const [, , key] of source.matchAll(CALL)) {
        const paths = namespaces.map((ns) => (ns ? `${ns}.${key}` : key!));
        if (!paths.some(has)) missing.push(`${file.slice(SRC.length + 1)}: ${key}`);
      }
    }
    expect(missing).toEqual([]);
  });
});
