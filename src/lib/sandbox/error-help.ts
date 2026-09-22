/**
 * Turns a raw Postgres error into advice a learner can act on.
 *
 * The engine's message is accurate but unhelpful on its own: `column "marketplace_partner" does
 * not exist` is what Postgres says when a learner writes a string in double quotes, and nothing in
 * that sentence points at the quotes. Each rule below maps an SQLSTATE (plus, where needed, a
 * shape in the message or the SQL) to a message key in `workspace.results.help`.
 *
 * Rules are ordered: the first match wins. They never change the engine's own message, they only
 * add a line under it.
 */
export type ErrorHelp = { key: string; params?: Record<string, string> };

const DOUBLE_QUOTED = /"([^"]+)"/;

export function errorHelpFor(input: {
  sqlstate?: string;
  message: string;
  sql: string;
}): ErrorHelp | null {
  const { sqlstate, message, sql } = input;
  const quoted = DOUBLE_QUOTED.exec(message)?.[1];

  // 42703 undefined_column. The classic cause is a string literal written with double quotes:
  // Postgres reads "texto" as an identifier, so it reports a missing column with that exact name.
  if (sqlstate === "42703") {
    if (quoted && new RegExp(`"\\s*${escapeRegExp(quoted)}\\s*"`).test(sql))
      return { key: "doubleQuotedString", params: { value: quoted } };
    return { key: "unknownColumn", params: { value: quoted ?? "" } };
  }
  if (sqlstate === "42P01") return { key: "unknownTable", params: { value: quoted ?? "" } };
  // 42601 syntax_error covers a large family; the frequent beginner causes are a missing comma
  // between selected columns and a stray trailing comma before FROM.
  if (sqlstate === "42601") {
    if (/,\s*from\b/i.test(sql)) return { key: "trailingComma" };
    return { key: "syntax" };
  }
  if (sqlstate === "42803") return { key: "aggregateWithoutGroupBy" };
  if (sqlstate === "42883") return { key: "unknownFunction", params: { value: quoted ?? "" } };
  if (sqlstate === "22P02") return { key: "badCast" };
  if (sqlstate === "42702") return { key: "ambiguousColumn", params: { value: quoted ?? "" } };
  if (sqlstate === "42P09" || sqlstate === "42712")
    return { key: "duplicateAlias", params: { value: quoted ?? "" } };
  if (sqlstate === "22012") return { key: "divisionByZero" };
  return null;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
