import { aiContext } from "@/config/ai";
import type { ExerciseWorkspaceData } from "./service";

/**
 * Builds the «Copiar contexto para tu IA» prompt (D-40). The input type is the allowlist: it only
 * has fields the learner already reads on the workspace before submitting — the dataset name, the
 * scenario, the business question, the schema of the tables the exercise uses and the expected
 * column names. Solutions, hints, expected rows and dataset rows have no field to arrive through.
 */
export interface AiContextInput {
  datasetTitle: string;
  scenarioMd: string;
  businessQuestionMd: string;
  tablesUsed: readonly string[];
  schema: readonly {
    name: string;
    columns: readonly { name: string; data_type: string; is_pk: boolean; fk_ref: string | null }[];
  }[];
  expectedColumns: readonly string[];
}

export type AiContextPromptKey =
  | "intro"
  | "scenario"
  | "engine"
  | "tablesHeading"
  | "primaryKey"
  | "relations"
  | "request"
  | "expectedColumns"
  | "closing";

/** A translator bound to `workspace.aiContext.prompt`; the phrases live in the message catalogue. */
export type AiContextTranslator = (
  key: AiContextPromptKey,
  values?: Record<string, string | number>,
) => string;

/** Picks the allowlisted fields out of the workspace payload. Everything else is dropped here. */
export function aiContextInputFromWorkspace(data: ExerciseWorkspaceData): AiContextInput {
  const expected = Array.isArray(data.exercise.expected_columns)
    ? (data.exercise.expected_columns as { name?: unknown }[])
        .map((c) => (typeof c?.name === "string" ? c.name : null))
        .filter((n): n is string => n !== null)
    : [];
  return {
    datasetTitle: data.dataset.title,
    scenarioMd: data.exercise.scenario_md ?? "",
    businessQuestionMd: data.exercise.business_question_md ?? "",
    tablesUsed: data.exercise.tables_used ?? [],
    schema: data.schema.map((table) => ({
      name: table.name,
      columns: table.columns.map((c) => ({
        name: c.name,
        data_type: c.data_type,
        is_pk: c.is_pk,
        fk_ref: c.fk_ref,
      })),
    })),
    expectedColumns: expected,
  };
}

export function buildAiContextPrompt(
  input: AiContextInput,
  t: AiContextTranslator,
  postgresMajorVersion: number = aiContext.postgresMajorVersion,
): string {
  const used = new Set(input.tablesUsed);
  // The workspace shows every table when an exercise lists none; the prompt mirrors that.
  const tables = used.size === 0 ? input.schema : input.schema.filter((tbl) => used.has(tbl.name));
  const included = new Set(tables.map((tbl) => tbl.name));
  const pk = t("primaryKey");

  const tableLines = tables.map((table) => {
    const columns = table.columns.map((c) => {
      const parts = [c.name, c.data_type];
      if (c.is_pk) parts.push(pk);
      if (c.fk_ref) parts.push(`→ ${c.fk_ref}`);
      return parts.join(" ");
    });
    return `- ${table.name}(${columns.join(", ")})`;
  });

  const relations = tables.flatMap((table) =>
    table.columns
      .filter((c) => c.fk_ref && included.has(c.fk_ref.split(".")[0]!))
      .map((c) => `${table.name}.${c.name} = ${c.fk_ref}`),
  );

  const scenario = input.scenarioMd.trim();
  const request = input.businessQuestionMd.trim();
  const lines: string[] = [t("intro", { dataset: input.datasetTitle })];
  if (scenario) lines.push(t("scenario", { scenario }));
  lines.push(t("engine", { version: postgresMajorVersion }), "");
  if (tableLines.length > 0) lines.push(t("tablesHeading"), ...tableLines);
  if (relations.length > 0) lines.push(t("relations", { relations: relations.join("; ") }));
  lines.push("");
  if (request) lines.push(t("request", { request }));
  if (input.expectedColumns.length > 0)
    lines.push(t("expectedColumns", { columns: input.expectedColumns.join(", ") }));
  lines.push(t("closing"));
  return lines.join("\n");
}
