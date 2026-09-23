import {
  defaultHintMeta,
  defaultReward,
  defaultSolutionUnlock,
  type ExerciseDef,
} from "../schemas/exercise";

const section = "distinct";
const dataset = { slug: "tiendaviva", version: 1 };
const theory_ref = "distinct-valores-unicos";

export const exercises: ExerciseDef[] = [
  {
    slug: "paises-con-clientes",
    section,
    title: "¿En qué países tenemos clientes?",
    difficulty: "very_easy",
    estimated_minutes: 3,
    concepts: ["select", "distinct"],
    dataset,
    tables_used: ["customers"],
    scenario_md:
      "Marketing prepara campañas por país y necesita saber en qué países hay clientes registrados en **TiendaViva**.",
    business_question_md:
      "Devuelve la lista de países (`country`) que aparecen en `customers`, **sin repeticiones**. El orden no importa.",
    learning_objective: "Obtener los valores únicos de una columna con DISTINCT.",
    theory_ref,
    expected_columns: [{ name: "country", type: "text" }],
    validation_rules: { required_concepts: ["distinct"] },
    reference_solution: "SELECT DISTINCT country\nFROM customers;",
    hints: [
      {
        level: 1,
        body_md:
          "Sin `DISTINCT` obtendrías 3000 filas (una por cliente). Necesitas eliminar repeticiones.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md: "`DISTINCT` va justo después de `SELECT`, antes del nombre de la columna.",
        ...defaultHintMeta(2),
      },
      { level: 3, body_md: "```sql\nSELECT DISTINCT ___\nFROM ___;\n```", ...defaultHintMeta(3) },
    ],
    common_mistakes: [
      {
        category: "duplicates",
        description_md: "Olvidar `DISTINCT`: la consulta devuelve una fila por cliente.",
      },
      {
        category: "wrong_columns",
        description_md:
          "Agregar `city` u otra columna: entonces las combinaciones país–ciudad ya no son «países únicos».",
      },
      {
        category: "syntax",
        description_md:
          "Escribir `SELECT country DISTINCT`: `DISTINCT` debe ir antes de la columna.",
      },
    ],
    expert_explanation_md:
      "Seis filas: AR, CL, CO, MX, PE y UY. Con 3000 clientes, el motor compara los valores y conserva uno por país.\n\nEs la consulta de exploración más útil que existe: antes de filtrar por una columna de texto, mira qué valores tiene realmente (mayúsculas, abreviaturas, errores de carga).",
    reward: defaultReward("very_easy"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "cobertura-de-transportistas",
    section,
    title: "Cobertura de transportistas",
    difficulty: "easy",
    estimated_minutes: 5,
    concepts: ["select", "distinct"],
    dataset,
    tables_used: ["shipments"],
    scenario_md:
      "Logística negocia tarifas con cada transportista y quiere saber a qué ciudades entregó cada uno alguna vez.",
    business_question_md:
      "Devuelve las combinaciones **únicas** de `carrier` y `destination_city` presentes en `shipments`. El orden no importa.",
    learning_objective:
      "Aplicar DISTINCT a varias columnas y entender que actúa sobre la fila completa.",
    theory_ref,
    expected_columns: [
      { name: "carrier", type: "text" },
      { name: "destination_city", type: "text" },
    ],
    validation_rules: { required_concepts: ["distinct"] },
    reference_solution: "SELECT DISTINCT carrier, destination_city\nFROM shipments;",
    hints: [
      {
        level: 1,
        body_md:
          "`DISTINCT` puede aplicarse a dos columnas a la vez: elimina las filas donde **ambas** se repiten.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Lista las dos columnas después de `SELECT DISTINCT`, separadas por coma, desde `shipments`.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md: "```sql\nSELECT DISTINCT ___, ___\nFROM shipments;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "duplicates",
        description_md: "Sin `DISTINCT` devuelves 15 000 envíos.",
      },
      {
        category: "wrong_columns",
        description_md:
          "Incluir `id` o `order_id`: cada envío es único y `DISTINCT` no elimina nada.",
      },
      {
        category: "wrong_columns",
        description_md:
          "Devolver solo `carrier`: pierdes la cobertura por ciudad que pide Logística.",
      },
    ],
    expert_explanation_md:
      "170 combinaciones: 5 transportistas × 34 ciudades, y en este dataset todos cubren todas las ciudades. En un dataset real esa matriz tendría huecos, y justamente esos huecos serían la información valiosa para negociar.",
    reward: defaultReward("easy"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "categorias-padre",
    section,
    title: "Categorías que son padre",
    difficulty: "easy",
    estimated_minutes: 5,
    concepts: ["select", "distinct", "order_by"],
    dataset,
    tables_used: ["categories"],
    scenario_md:
      "El árbol de categorías tiene dos niveles. Catálogo quiere ver qué valores toma `parent_id`, incluido el caso de las categorías raíz (sin padre).",
    business_question_md:
      "Devuelve los valores **únicos** de `parent_id` en `categories`, ordenados de menor a mayor. Las categorías raíz tienen `parent_id` NULL y también deben aparecer.",
    learning_objective: "Observar cómo DISTINCT y ORDER BY tratan a NULL.",
    theory_ref,
    expected_columns: [{ name: "parent_id", type: "integer" }],
    validation_rules: { order_matters: true, required_concepts: ["distinct", "order_by"] },
    reference_solution: "SELECT DISTINCT parent_id\nFROM categories\nORDER BY parent_id;",
    hints: [
      {
        level: 1,
        body_md: "No necesitas filtrar nada: `DISTINCT` conserva una fila NULL por sí solo.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Agrega `ORDER BY parent_id` al final; en PostgreSQL los NULL quedan últimos en orden ascendente.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md: "```sql\nSELECT DISTINCT ___\nFROM categories\nORDER BY ___;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "null_handling",
        description_md: "Filtrar `parent_id IS NOT NULL`: la consigna pide incluir a las raíces.",
      },
      {
        category: "wrong_order",
        description_md: "Omitir `ORDER BY`: el resultado debe estar ordenado.",
      },
      {
        category: "duplicates",
        description_md: "Sin `DISTINCT` aparecen 30 filas, una por categoría.",
      },
    ],
    expert_explanation_md:
      "Siete filas: los ids 1 a 6 (las raíces, que son padre de las subcategorías) y una fila NULL al final. PostgreSQL ordena los NULL **después** de los valores en `ASC` (y antes en `DESC`); puedes forzarlo con `NULLS FIRST` / `NULLS LAST`.\n\nQue `DISTINCT` agrupe los NULL es una de las pocas situaciones en que NULL «se compara» con NULL; en `WHERE` no ocurre, como verás en la sección 8.",
    reward: defaultReward("easy"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
];
