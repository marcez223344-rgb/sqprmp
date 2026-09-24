import { Fragment } from "react";

/**
 * Minimal SQL colouriser for authored lesson code blocks.
 *
 * Written by hand instead of pulling a highlighter dependency: the lessons use one dialect
 * (PostgreSQL), the blocks are short, and a 90-line tokenizer keeps the bundle and the review
 * surface small (rules/architecture.md — no new dependency without `architect`).
 *
 * Accessibility: colour here is **decoration only**. Every token it paints is already identifiable
 * from the text itself (a keyword is an uppercase SQL word, a string carries its quotes), so no
 * information is conveyed by colour alone. Keywords also differ in weight, which is what keeps the
 * block readable in greyscale and for colour-blind learners.
 */

const KEYWORDS = new Set(
  `select from where group by having order limit offset fetch first next distinct as on using
   join inner left right full outer cross lateral natural
   and or not null is in between like ilike similar to escape any all some exists
   case when then else end
   union except intersect with recursive materialized
   over partition rows range groups unbounded preceding following current row filter within
   asc desc nulls
   cast interval date timestamp timestamptz time numeric decimal integer int bigint smallint
   text varchar char boolean true false unknown
   insert update delete set values into create table view index primary key foreign references
   default constraint unique check returning begin commit rollback explain analyze`
    .split(/\s+/)
    .filter(Boolean),
);

export type SqlTokenKind = "keyword" | "function" | "string" | "number" | "comment" | "plain";

export interface SqlToken {
  kind: SqlTokenKind;
  value: string;
}

/** Comments, strings, quoted identifiers, numbers, words. Everything else falls through as plain. */
const SCANNER =
  /(--[^\n]*|\/\*[\s\S]*?\*\/)|('(?:''|[^'])*')|("(?:""|[^"])*")|(\b\d+(?:\.\d+)?\b)|([A-Za-z_][A-Za-z0-9_$]*)/g;

export function tokenizeSql(sql: string): SqlToken[] {
  const tokens: SqlToken[] = [];
  let last = 0;
  const push = (kind: SqlTokenKind, value: string) => {
    if (!value) return;
    const previous = tokens[tokens.length - 1];
    if (previous && previous.kind === kind) previous.value += value;
    else tokens.push({ kind, value });
  };

  SCANNER.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = SCANNER.exec(sql)) !== null) {
    push("plain", sql.slice(last, match.index));
    last = match.index + match[0].length;
    const [, comment, string, quotedIdentifier, number, word] = match;
    if (comment) push("comment", comment);
    else if (string) push("string", string);
    else if (quotedIdentifier) push("plain", quotedIdentifier);
    else if (number) push("number", number);
    else if (word) {
      if (KEYWORDS.has(word.toLowerCase())) push("keyword", word);
      // A word immediately followed by `(` is a call: `round(`, `sum(`, `coalesce(`.
      else if (sql[last] === "(") push("function", word);
      else push("plain", word);
    }
  }
  push("plain", sql.slice(last));
  return tokens;
}

/**
 * Inks measured 2026-09-24 against `--color-surface-2` (the code-block well), light / dark, all
 * ≥ 4.5:1: primary 5.63 / 5.47, info 4.78 / 6.97, success-ink 5.38 / 6.93, accent-ink 4.72 / 7.77,
 * muted 5.27 / 6.72.
 */
const TOKEN_CLASS: Record<SqlTokenKind, string> = {
  keyword: "text-primary font-semibold",
  function: "text-info",
  string: "text-success-ink",
  number: "text-accent-ink",
  comment: "text-muted italic",
  plain: "",
};

export function SqlCode({ code }: { code: string }) {
  return (
    <>
      {tokenizeSql(code).map((token, index) =>
        token.kind === "plain" ? (
          <Fragment key={index}>{token.value}</Fragment>
        ) : (
          <span key={index} className={TOKEN_CLASS[token.kind]}>
            {token.value}
          </span>
        ),
      )}
    </>
  );
}
