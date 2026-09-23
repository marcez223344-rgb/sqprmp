/**
 * Minimal PostgreSQL lexer used by the style checks and the re-indenter.
 *
 * Style checks must never look at raw text: `'Bogotá, Colombia'` is not a missing space after a
 * comma and `-- from orders` is not a keyword. Splitting the query into tokens once, here, is the
 * only reason those checks can stay simple and silent on valid SQL.
 */

export type SqlTokenKind =
  | "whitespace"
  | "line_comment"
  | "block_comment"
  | "string"
  | "quoted_ident"
  | "word"
  | "number"
  | "operator"
  | "punct";

export interface SqlToken {
  kind: SqlTokenKind;
  value: string;
  /** Index of the first character in the original SQL. */
  start: number;
}

/** Characters PostgreSQL allows inside a multi-character operator (`>=`, `::`, `||`, `!~*`). */
const OPERATOR_CHAR = /[+\-*/<>=~!@#%^&|?:]/;
const PUNCT = /[^\s\w'"]/;

export function tokenizeSql(sql: string): SqlToken[] {
  const tokens: SqlToken[] = [];
  let i = 0;
  const push = (kind: SqlTokenKind, end: number) => {
    tokens.push({ kind, value: sql.slice(i, end), start: i });
    i = end;
  };
  while (i < sql.length) {
    const c = sql[i]!;
    const next = sql[i + 1];
    if (/\s/.test(c)) {
      let j = i;
      while (j < sql.length && /\s/.test(sql[j]!)) j += 1;
      push("whitespace", j);
      continue;
    }
    if (c === "-" && next === "-") {
      const nl = sql.indexOf("\n", i);
      push("line_comment", nl === -1 ? sql.length : nl);
      continue;
    }
    if (c === "/" && next === "*") {
      let depth = 1;
      let j = i + 2;
      while (j < sql.length && depth > 0) {
        if (sql[j] === "/" && sql[j + 1] === "*") {
          depth += 1;
          j += 2;
        } else if (sql[j] === "*" && sql[j + 1] === "/") {
          depth -= 1;
          j += 2;
        } else j += 1;
      }
      push("block_comment", j);
      continue;
    }
    if (c === "'" || c === '"') {
      let j = i + 1;
      while (j < sql.length) {
        if (sql[j] === "\\" && c === "'") j += 2;
        else if (sql[j] === c && sql[j + 1] === c) j += 2;
        else if (sql[j] === c) {
          j += 1;
          break;
        } else j += 1;
      }
      push(c === "'" ? "string" : "quoted_ident", j);
      continue;
    }
    if (/[0-9]/.test(c)) {
      let j = i;
      while (j < sql.length && /[0-9.eE]/.test(sql[j]!)) j += 1;
      push("number", j);
      continue;
    }
    if (/[A-Za-z_À-ɏ$]/.test(c)) {
      let j = i;
      while (j < sql.length && /[A-Za-z0-9_À-ɏ$]/.test(sql[j]!)) j += 1;
      push("word", j);
      continue;
    }
    if (OPERATOR_CHAR.test(c)) {
      // Grouped, not split: `>=` emitted as `> =` is a syntax error, and the re-indenter has to
      // put the operator back together to be able to rebuild the query.
      let j = i;
      while (j < sql.length && OPERATOR_CHAR.test(sql[j]!)) j += 1;
      push("operator", j);
      continue;
    }
    if (PUNCT.test(c)) {
      push("punct", i + 1);
      continue;
    }
    i += 1;
  }
  return tokens;
}

/** True for tokens that carry meaning to the server (everything but comments and whitespace). */
export const isCode = (t: SqlToken): boolean =>
  t.kind !== "whitespace" && t.kind !== "line_comment" && t.kind !== "block_comment";

/**
 * The query with comments and literal contents removed, so keyword scans cannot be fooled by
 * text a learner wrote inside a string or a comment. Lengths are preserved where it is free.
 */
export function codeOnly(sql: string): string {
  return tokenizeSql(sql)
    .map((t) => {
      if (t.kind === "line_comment" || t.kind === "block_comment")
        return t.value.replace(/[^\n]/g, " ");
      if (t.kind === "string" || t.kind === "quoted_ident") return "''";
      return t.value;
    })
    .join("");
}
