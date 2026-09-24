/**
 * Parsing of the numeric figures that Spanish content prose states about the datasets.
 *
 * Shared by `npm run content:claims` (lessons, hand-registered claims) and
 * `npm run content:figures` (exercises, claims derived automatically from the reference
 * solution). Pure functions only, so the parsing rules can be unit-tested without a database.
 */

/** Inline code spans and fenced blocks carry SQL literals, not claims about the data. */
export const stripCode = (s: string): string =>
  s.replace(/```[\s\S]*?```/g, " ").replace(/`[^`]*`/g, " ");

/**
 * Numbers as Spanish prose writes them: thousands separated by a space (plain, non-breaking or
 * narrow) or a period, decimals after a comma.
 */
export const NUMBER = /\d+(?:[.\u00a0\u202f ]\d{3})*(?:,\d+)?/g;

export const parseSpanishNumber = (raw: string): number =>
  Number(raw.replace(/[.\u00a0\u202f ]/g, "").replace(",", "."));

/** Every number in a sentence, ignoring code spans. */
export function proseNumbers(prose: string): number[] {
  return (stripCode(prose).match(NUMBER) ?? []).map(parseSpanishNumber);
}

/** Cardinals an author may spell out. Beyond thirty, house style is digits. */
export const WORD_NUMBERS: Readonly<Record<string, number>> = {
  cero: 0,
  un: 1,
  una: 1,
  uno: 1,
  dos: 2,
  tres: 3,
  cuatro: 4,
  cinco: 5,
  seis: 6,
  siete: 7,
  ocho: 8,
  nueve: 9,
  diez: 10,
  once: 11,
  doce: 12,
  trece: 13,
  catorce: 14,
  quince: 15,
  dieciseis: 16,
  diecisiete: 17,
  dieciocho: 18,
  diecinueve: 19,
  veinte: 20,
  veintiuna: 21,
  veintiuno: 21,
  veintidos: 22,
  veintitres: 23,
  veinticuatro: 24,
  veinticinco: 25,
  veintiseis: 26,
  veintisiete: 27,
  veintiocho: 28,
  veintinueve: 29,
  treinta: 30,
  cuarenta: 40,
  cincuenta: 50,
  sesenta: 60,
  setenta: 70,
  ochenta: 80,
  noventa: 90,
};

/** Tens that take the "treinta y siete" compound form. */
const TENS = ["treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa"];
const UNITS = ["uno", "una", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve"];

const deaccent = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/** A spelled-out cardinal or a digit group, or `null` for anything else. */
export function wordOrDigitToNumber(token: string): number | null {
  const t = deaccent(token.toLowerCase()).replace(/\s+/g, " ").trim();
  const compound = t.match(/^(\p{L}+) y (\p{L}+)$/u);
  if (compound && TENS.includes(compound[1]) && UNITS.includes(compound[2]))
    return WORD_NUMBERS[compound[1]] + WORD_NUMBERS[compound[2]];
  if (Object.prototype.hasOwnProperty.call(WORD_NUMBERS, t)) return WORD_NUMBERS[t];
  if (/^\d/.test(token)) {
    const m = token.match(new RegExp(NUMBER.source, "g"));
    if (m && m[0] === token) return parseSpanishNumber(token);
  }
  return null;
}

/** The sentence opener that CONTENT_GUIDELINES.md §10 rule A requires of every explanation. */
export const OPENER = "El resultado de la consulta da";

/** A figure the prose states that the gate reads as "the reference solution returns N rows". */
export interface RowCountClaim {
  /** `opener` = the leading figure of the explanation; `result` = an explicit "la consulta devuelve N filas". */
  kind: "opener" | "result";
  /** Field the claim was found in. */
  field: string;
  /** The claimed row count. */
  value: number;
  /** The phrase as written, for the failure message and for the exception registry. */
  phrase: string;
}

/** Every cardinal the parser understands, compounds first so they win the alternation. */
const WORDS = [
  ...TENS.flatMap((t) => UNITS.map((u) => String.raw`${t}\s+y\s+${u}`)),
  ...Object.keys(WORD_NUMBERS),
].join("|");
const CARDINAL = String.raw`(?:WORDS|\d+(?:[.\u00a0\u202f ]\d{3})*(?:,\d+)?)`.replace(
  "WORDS",
  WORDS,
);

/** First cardinal of a sentence, spelled out or in digits with Spanish thousands separators. */
const FIRST_CARDINAL = new RegExp(
  String.raw`(?:^|[^\p{L}\d.,])(CARDINAL)(?![\p{L}\d])`.replace("CARDINAL", CARDINAL),
  "iu",
);

/**
 * "N filas" attributed to the result of *this* query: the subject is the query or its result and
 * the verb states what it returns. A bare "N filas" is not enough — the exercises use it just as
 * often for the size of a source table, of a CTE or of one bucket of the result.
 */
const RESULT_ROW_COUNT = new RegExp(
  String.raw`(?:el resultado(?: de la consulta| de la sentencia)?|la consulta|la sentencia|la query)\s+(?:ya\s+|solo\s+)?(?:da|devuelve|tiene|produce|arroja|entrega)\s+(?:solo\s+|apenas\s+|exactamente\s+|en total\s+)?(CARDINAL)(?:\s+sola)?\s+filas?(?![\p{L}\d])(?!\s+(?:por|para\s+cada)\b)`.replace(
    "CARDINAL",
    CARDINAL,
  ),
  "giu",
);

/** "una fila por cliente", "una fila para cada cliente": the grain, not how many rows. */
const GRAIN = /^\s*(?:sola\s+)?filas?\s+(?:por|para\s+cada)\b/iu;

/** An explanation that opens with a bare figure: the form §10 rule A replaced, still checked. */
const BARE_OPENER = new RegExp(
  String.raw`^(CARDINAL)(?:\s+sola)?\s+filas?(?![\p{L}\d])`.replace("CARDINAL", CARDINAL),
  "iu",
);

/**
 * The leading figure of an explanation.
 *
 * It is a claim when the explanation opens with `OPENER`, as CONTENT_GUIDELINES §10 rule A
 * requires — the first cardinal of that opening sentence (up to the first `.`, `:`, `;` or line
 * break) is read as the number of rows the query returns — or when it opens with a bare
 * "N filas", the older form rule A replaced. A percentage is never a row count, and "una fila
 * por cliente" states the grain rather than a count, so neither makes a claim.
 */
export function openerClaim(
  explanation: string,
  field = "expert_explanation_md",
): RowCountClaim | null {
  const text = explanation.trimStart();
  const bare = text.match(BARE_OPENER);
  if (bare) {
    const value = wordOrDigitToNumber(bare[1]);
    if (value !== null) return { kind: "opener", field, value, phrase: bare[0].trim() };
  }
  if (!text.startsWith(OPENER)) return null;
  const sentence = (stripCode(text.slice(OPENER.length)).split(/[.:;\n]/)[0] ?? "").trim();
  const m = sentence.match(FIRST_CARDINAL);
  if (!m || m.index === undefined) return null;
  const value = wordOrDigitToNumber(m[1]);
  if (value === null) return null;
  const after = sentence.slice(m.index + m[0].length);
  if (/^\s*%/.test(after)) return null;
  if (GRAIN.test(after)) return null;
  return {
    kind: "opener",
    field,
    value,
    phrase: `${OPENER} ${sentence.length > 90 ? sentence.slice(0, 90) + "…" : sentence}`,
  };
}

/** Every "la consulta devuelve N filas" claim in `text`. */
export function resultRowCountClaims(text: string, field: string): RowCountClaim[] {
  const out: RowCountClaim[] = [];
  for (const m of stripCode(text).matchAll(RESULT_ROW_COUNT)) {
    const value = wordOrDigitToNumber(m[1]);
    if (value === null) continue;
    out.push({ kind: "result", field, value, phrase: m[0].replace(/\s+/g, " ").trim() });
  }
  return out;
}

/**
 * Every row-count claim an exercise's prose makes: the §10 rule A opener plus every explicit
 * "la consulta devuelve N filas". A claim inside the opening sentence is reported once.
 */
export function rowCountClaims(fields: { field: string; text: string }[]): RowCountClaim[] {
  const claims: RowCountClaim[] = [];
  const explanation = fields.find((f) => f.field === "expert_explanation_md");
  const opener = explanation ? openerClaim(explanation.text, explanation.field) : null;
  if (opener) claims.push(opener);
  for (const f of fields) {
    for (const c of resultRowCountClaims(f.text, f.field)) {
      if (opener && c.field === opener.field && opener.phrase.includes(c.phrase)) continue;
      claims.push(c);
    }
  }
  return claims;
}
