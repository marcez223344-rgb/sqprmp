/**
 * Figures in exercise prose that look like a row count but are not one.
 *
 * `npm run content:figures` reads every "N filas" mention in `scenario_md` and
 * `expert_explanation_md` as a claim about how many rows the exercise's `reference_solution`
 * returns. Some figures legitimately say something else: how many rows a source table has, how
 * many of the result rows fall in one bucket, what a wrong variant of the query would have
 * returned. Those are listed here, with the phrase copied verbatim and the reason.
 *
 * Rules, enforced by the gate:
 * - An exception names the exercise, the field and the phrase exactly as written. It exempts
 *   that phrase only, nothing else in the prose.
 * - An exception that no longer matches any phrase is an error, so the list cannot rot.
 * - The opening figure required by CONTENT_GUIDELINES §10 rule A ("El resultado de la consulta
 *   da N …") can never be exempted: that one is always checked against the row count.
 *
 * Marcar una cifra aquí no la verifica — solo dice que no es el conteo de filas del resultado.
 */
export interface FigureException {
  /** Exercise slug. */
  exercise: string;
  /** Field the phrase lives in. */
  field: "scenario_md" | "expert_explanation_md";
  /** The phrase, copied verbatim from the prose. */
  phrase: string;
  /** What the figure actually counts. */
  reason: string;
}

export const exerciseFigureExceptions: FigureException[] = [
  {
    exercise: "optimizacion-repartidores-sin-entregas",
    field: "expert_explanation_md",
    phrase: "la consulta devuelve cero filas",
    reason:
      "Counterfactual: the sentence describes what the NOT IN variant returns when the subquery yields a NULL, not what the reference solution returns (73 rows).",
  },
];
