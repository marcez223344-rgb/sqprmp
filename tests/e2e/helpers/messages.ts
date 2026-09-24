import catalogue from "../../../src/messages/es-419.json";

/**
 * Read user-facing strings for assertions from the catalogue instead of retyping them.
 *
 * The 2026-09-23/24 copy rewrite broke five E2E tests at once because each had a Spanish sentence
 * hardcoded in it. Prefer a role, a label or a stable structural attribute; when the visible text
 * really is the clearest assertion, take it from here, so a rename of the copy moves the test with
 * it and a *deleted* key fails loudly instead of silently never matching.
 */
export function message(path: string, vars: Record<string, string | number> = {}): string {
  return lookup(path).replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in vars ? String(vars[name]) : whole,
  );
}

/**
 * The same string as a regular expression, with `{placeholders}` replaced by a pattern (`\d+` by
 * default) so a test can assert the shape of a message whose numbers come from content or config.
 */
export function messagePattern(path: string, patterns: Record<string, string> = {}): RegExp {
  const parts = lookup(path)
    .split(/(\{\w+\})/g)
    .map((part) => {
      const name = /^\{(\w+)\}$/.exec(part)?.[1];
      return name ? (patterns[name] ?? "\\d+") : escapeRegExp(part);
    });
  return new RegExp(parts.join(""));
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function lookup(path: string): string {
  let node: unknown = catalogue;
  for (const key of path.split(".")) {
    node =
      typeof node === "object" && node !== null
        ? (node as Record<string, unknown>)[key]
        : undefined;
  }
  if (typeof node !== "string") throw new Error(`Message key not found in es-419.json: ${path}`);
  return node;
}
