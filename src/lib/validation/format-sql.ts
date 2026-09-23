import { parse } from "pgsql-ast-parser";
import { limits } from "@/config/limits";
import { isCode, tokenizeSql, type SqlToken } from "./sql-tokens";

/**
 * Re-indents the learner's own query into the house style (keywords upper case, one clause per
 * line, one select-list item per line). Seeing the corrected shape of *their* query is what
 * teaches; a paragraph explaining indentation does not.
 *
 * Safety: the result is parsed and compared against the parse of the input, and `null` is
 * returned unless both produce the same tree. A formatter that quietly changes meaning would be
 * worse than no formatter, and `pgsql-ast-parser` is already a dependency, so the check is free.
 * Queries with comments are not formatted at all: moving a comment can change what it applies to.
 */

const CLAUSE_STARTERS = [
  ["select"],
  ["from"],
  ["where"],
  ["group", "by"],
  ["having"],
  ["order", "by"],
  ["limit"],
  ["offset"],
  ["union"],
  ["intersect"],
  ["except"],
  ["join"],
  ["inner", "join"],
  ["left", "join"],
  ["left", "outer", "join"],
  ["right", "join"],
  ["right", "outer", "join"],
  ["full", "join"],
  ["full", "outer", "join"],
  ["cross", "join"],
];

/** Words safe to upper case: reserved in PostgreSQL, so none of them can be a bare identifier. */
const UPPER_WORDS = new Set([
  "select",
  "from",
  "where",
  "group",
  "by",
  "having",
  "order",
  "limit",
  "offset",
  "join",
  "inner",
  "outer",
  "cross",
  "on",
  "using",
  "and",
  "or",
  "not",
  "as",
  "distinct",
  "union",
  "intersect",
  "except",
  "all",
  "with",
  "asc",
  "desc",
  "is",
  "null",
  "in",
  "between",
  "like",
  "ilike",
  "case",
  "when",
  "end",
  "then",
  "else",
  "true",
  "false",
]);

/** `LEFT`/`RIGHT`/`FULL` are function names too (`left(name, 3)`); only upper case them before JOIN. */
const JOIN_ONLY_WORDS = new Set(["left", "right", "full"]);

const INDENT = "  ";

const canonical = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([k]) => k !== "_location")
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => [k, canonical(v)] as const);
    return Object.fromEntries(entries);
  }
  return value;
};

const sameTree = (a: string, b: string): boolean => {
  try {
    return JSON.stringify(canonical(parse(a))) === JSON.stringify(canonical(parse(b)));
  } catch {
    return false;
  }
};

function startsClause(words: string[], i: number): number {
  let best = 0;
  for (const starter of CLAUSE_STARTERS) {
    if (starter.every((w, k) => words[i + k] === w)) best = Math.max(best, starter.length);
  }
  return best;
}

export function formatSql(sql: string): string | null {
  const trimmed = sql.trim().replace(/;\s*$/, "");
  if (!trimmed || trimmed.length > limits.sandbox.feedback.maxFormattedSqlChars) return null;
  const all = tokenizeSql(trimmed);
  if (all.some((t) => t.kind === "line_comment" || t.kind === "block_comment")) return null;
  const tokens: SqlToken[] = all.filter(isCode);
  if (!tokens.length) return null;

  const words = tokens.map((t) => (t.kind === "word" ? t.value.toLowerCase() : ""));
  let out = "";
  let depth = 0;
  let inSelectList = false;
  let skipWords = 0;

  const newline = (indent: number) => {
    out = `${out.replace(/[ \n]+$/, "")}\n${INDENT.repeat(indent)}`;
  };

  for (let i = 0; i < tokens.length; i += 1) {
    const t = tokens[i]!;
    const prev = tokens[i - 1];
    const w = words[i]!;

    if (t.kind === "punct") {
      if (t.value === "(") depth += 1;
      if (t.value === ")") depth = Math.max(0, depth - 1);
    }

    if (skipWords > 0) {
      // The remaining words of a multi-word clause keyword were already emitted above.
      skipWords -= 1;
      continue;
    }
    if (t.kind === "word" && depth === 0) {
      const clauseLen = startsClause(words, i);
      if (clauseLen) {
        if (out) newline(0);
        inSelectList = w === "select";
        skipWords = clauseLen - 1;
        out += words
          .slice(i, i + clauseLen)
          .map((x) => x.toUpperCase())
          .join(" ");
        // The word after SELECT/GROUP BY/ORDER BY starts an item list: break the line for it.
        if (inSelectList) newline(1);
        else out += " ";
        continue;
      }
      if ((w === "and" || w === "or") && !inSelectList) {
        newline(1);
        out += `${w.toUpperCase()} `;
        continue;
      }
    }

    if (t.kind === "punct" && t.value === "," && depth === 0 && inSelectList) {
      out = `${out.replace(/\s+$/, "")},`;
      newline(1);
      continue;
    }

    const value =
      t.kind === "word" &&
      UPPER_WORDS.has(w) &&
      !(JOIN_ONLY_WORDS.has(w) && words[i + 1] !== "join")
        ? w.toUpperCase()
        : t.value;

    const noSpaceBefore =
      !out ||
      /[\s(.]$/.test(out) ||
      value === "," ||
      value === ")" ||
      value === "." ||
      value === "::" ||
      (value === "(" && prev?.kind === "word" && !UPPER_WORDS.has(words[i - 1]!)) ||
      prev?.value === "::";
    out += noSpaceBefore ? value : ` ${value}`;
  }

  const formatted = out
    .split("\n")
    .map((line) => line.replace(/\s+$/, ""))
    .join("\n")
    .trim();
  if (!formatted || formatted === trimmed) return null;
  if (!sameTree(trimmed, formatted)) return null;
  return formatted;
}
