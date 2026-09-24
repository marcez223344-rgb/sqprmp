import { createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";
import { aiContext, isAiContextSection } from "@/config/ai";
import {
  aiContextInputFromWorkspace,
  buildAiContextPrompt,
  type AiContextTranslator,
} from "@/lib/exercises/ai-context";
import type { ExerciseWorkspaceData } from "@/lib/exercises/service";
import messages from "@/messages/es-419.json";

const translator = createTranslator({
  locale: "es-419",
  messages,
  namespace: "workspace.aiContext.prompt",
});
const t: AiContextTranslator = (key, values) => translator(key, values);

const SOLUTION_SQL = "SELECT u.country AS pais, count(*) AS pagos FROM secret_solution_marker";
const ALT_SQL = "WITH alt_marker AS (SELECT 1) SELECT * FROM alt_marker";
const HINT = "Pista secreta: agrupa por país antes de filtrar";
const EXPLANATION = "Explicación experta que solo se ve después de revelar";

/** Fixture shaped like the real payload, with the post-unlock fields filled in on purpose. */
function fixture(
  overrides: Partial<ExerciseWorkspaceData["exercise"]> = {},
): ExerciseWorkspaceData {
  return {
    exercise: {
      id: "ex-1",
      slug: "pagos-online-por-pais",
      lesson_id: null,
      section_id: "sec-1",
      title: "Pagos online por país",
      scenario_md:
        "Riesgo quiere saber dónde se concentran los pagos con tarjeta en comercios online.",
      business_question_md:
        "Para cada país, cuántos pagos con tarjeta (`kind = 'card_payment'`) completados hubo en agosto de 2025.",
      learning_objective: "Unir tres tablas y agrupar",
      difficulty: "intermediate",
      estimated_minutes: 10,
      concepts: ["join"],
      tables_used: ["users", "accounts", "transactions"],
      dataset_id: "ds-1",
      dataset_version: 1,
      theory_ref_slug: null,
      allowed_statements: ["select"],
      expected_columns: [
        { name: "pais", type: "text" },
        { name: "pagos", type: "integer" },
      ],
      is_published: true,
      ...overrides,
    },
    lessonSlug: null,
    section: { slug: "sql-con-ia", number: 39, title: "SQL con IA" },
    dataset: { slug: "bolsillo", version: 1, title: "Bolsillo", today: null },
    schema: [
      {
        name: "users",
        description: "Personas usuarias",
        columns: [
          { name: "id", data_type: "integer", description: "id", is_pk: true, fk_ref: null },
          {
            name: "country",
            data_type: "char(2)",
            description: "país",
            is_pk: false,
            fk_ref: null,
          },
        ],
      },
      {
        name: "accounts",
        description: "Cuentas",
        columns: [
          { name: "id", data_type: "integer", description: "id", is_pk: true, fk_ref: null },
          {
            name: "user_id",
            data_type: "integer",
            description: "dueño",
            is_pk: false,
            fk_ref: "users.id",
          },
        ],
      },
      {
        name: "transactions",
        description: "Movimientos",
        columns: [
          { name: "id", data_type: "integer", description: "id", is_pk: true, fk_ref: null },
          {
            name: "account_id",
            data_type: "integer",
            description: "cuenta",
            is_pk: false,
            fk_ref: "accounts.id",
          },
          {
            name: "merchant_id",
            data_type: "integer",
            description: "comercio",
            is_pk: false,
            fk_ref: "merchants.id",
          },
          {
            name: "amount",
            data_type: "numeric(14,2)",
            description: "monto",
            is_pk: false,
            fk_ref: null,
          },
        ],
      },
      {
        name: "merchants",
        description: "Comercios",
        columns: [
          { name: "id", data_type: "integer", description: "id", is_pk: true, fk_ref: null },
        ],
      },
    ],
    progress: null,
    hints: [{ level: 1, body_md: HINT }],
    solution: {
      sql: SOLUTION_SQL,
      explanation_md: EXPLANATION,
      alternatives: [{ label: "Con CTE", sql: ALT_SQL }],
    },
    access: "ok",
    freeUsed: 0,
    gated: true,
    freeLimit: 5,
    nextLessonSlug: null,
    theoryLessonSlug: null,
  };
}

describe("config/ai", () => {
  it("enables the copy button only in the allowlisted sections", () => {
    expect(isAiContextSection("sql-con-ia")).toBe(true);
    expect(isAiContextSection("select-basico")).toBe(false);
    expect(isAiContextSection("")).toBe(false);
  });
});

describe("buildAiContextPrompt", () => {
  const prompt = buildAiContextPrompt(aiContextInputFromWorkspace(fixture()), t);

  it("follows the recipe in order: context, engine, tables, relations, request, columns, closing", () => {
    expect(prompt).toBe(
      [
        "Trabajo como analista de datos con la base «Bolsillo».",
        "Contexto: Riesgo quiere saber dónde se concentran los pagos con tarjeta en comercios online.",
        `Uso PostgreSQL ${aiContext.postgresMajorVersion}. Responde solo con SQL válido para PostgreSQL.`,
        "",
        "Tablas (sin datos reales, solo el esquema):",
        "- users(id integer PK, country char(2))",
        "- accounts(id integer PK, user_id integer → users.id)",
        "- transactions(id integer PK, account_id integer → accounts.id, merchant_id integer → merchants.id, amount numeric(14,2))",
        "Relaciones: accounts.user_id = users.id; transactions.account_id = accounts.id.",
        "",
        "Pedido: Para cada país, cuántos pagos con tarjeta (`kind = 'card_payment'`) completados hubo en agosto de 2025.",
        "Resultado esperado: columnas pais, pagos.",
        "Usa alias que digan qué es cada tabla y explica cada paso en una línea.",
      ].join("\n"),
    );
  });

  it("never includes the solution, alternatives, explanation or hints, even when unlocked", () => {
    for (const secret of [SOLUTION_SQL, ALT_SQL, "secret_solution_marker", HINT, EXPLANATION]) {
      expect(prompt).not.toContain(secret);
    }
    const input = aiContextInputFromWorkspace(fixture());
    expect(Object.keys(input).sort()).toEqual(
      [
        "businessQuestionMd",
        "datasetTitle",
        "expectedColumns",
        "scenarioMd",
        "schema",
        "tablesUsed",
      ].sort(),
    );
  });

  it("leaves out tables the exercise does not use, and relations to them", () => {
    expect(prompt).not.toMatch(/^- merchants\(/m);
    expect(prompt).not.toContain("transactions.merchant_id = merchants.id");
  });

  it("uses the version passed in, not a literal", () => {
    expect(buildAiContextPrompt(aiContextInputFromWorkspace(fixture()), t, 19)).toContain(
      "Uso PostgreSQL 19.",
    );
  });

  it("falls back to every table and skips empty lines when fields are missing", () => {
    const sparse = buildAiContextPrompt(
      aiContextInputFromWorkspace(
        fixture({ tables_used: [], scenario_md: null, expected_columns: null }),
      ),
      t,
    );
    expect(sparse).toContain("- merchants(id integer PK)");
    expect(sparse).toContain("transactions.merchant_id = merchants.id");
    expect(sparse).not.toContain("Contexto:");
    expect(sparse).not.toContain("Resultado esperado");
  });
});
