import {
  defaultHintMeta,
  defaultReward,
  defaultSolutionUnlock,
  type ExerciseDef,
} from "../schemas/exercise";

const section = "tablas-filas-columnas-tipos";
const dataset = { slug: "tiendaviva", version: 1 };

export const exercises: ExerciseDef[] = [
  {
    slug: "explorar-clientes",
    section,
    title: "Explorar la tabla de clientes",
    difficulty: "very_easy",
    estimated_minutes: 3,
    concepts: ["select", "order_by", "limit"],
    dataset,
    tables_used: ["customers"],
    scenario_md:
      "Es tu primer día en el equipo de datos de **TiendaViva**. Antes de responder cualquier pregunta quieres conocer la tabla `customers`: qué columnas tiene y cómo se ven sus filas.",
    business_question_md:
      "Muestra las columnas `id`, `full_name` y `country` de los **10 primeros clientes según su `id`** (de menor a mayor).",
    learning_objective:
      "Leer el esquema de una tabla y seleccionar columnas concretas en un orden definido.",
    theory_ref: "anatomia-de-una-tabla",
    expected_columns: [
      { name: "id", type: "integer" },
      { name: "full_name", type: "text" },
      { name: "country", type: "text" },
    ],
    validation_rules: { order_matters: true },
    reference_solution: "SELECT id, full_name, country\nFROM customers\nORDER BY id\nLIMIT 10;",
    alternative_solutions: [
      {
        label: "ASC explícito",
        sql: "SELECT id, full_name, country FROM customers ORDER BY id ASC LIMIT 10",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Necesitas tres columnas de una sola tabla, en un orden concreto y solo las primeras filas. Piensa en qué cláusulas controlan el orden y la cantidad.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "La tabla es `customers`. Ordena con `ORDER BY id` y limita con `LIMIT 10`. Las columnas van después de `SELECT`, separadas por comas.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md: "```sql\nSELECT id, ___, ___\nFROM customers\nORDER BY ___\nLIMIT ___;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "wrong_columns",
        description_md:
          "Usar `SELECT *` devuelve todas las columnas; la consigna pide exactamente tres.",
      },
      {
        category: "wrong_order",
        description_md:
          "Sin `ORDER BY id`, las 10 filas que devuelve `LIMIT` no están garantizadas.",
      },
      { category: "row_count", description_md: "Olvidar `LIMIT 10` devuelve los 3000 clientes." },
    ],
    expert_explanation_md:
      "1. `SELECT id, full_name, country` elige las tres columnas pedidas, en ese orden.\n2. `FROM customers` indica la tabla.\n3. `ORDER BY id` garantiza el orden ascendente (es el valor por defecto; `ASC` es opcional).\n4. `LIMIT 10` corta el resultado.\n\n**Por qué importa el orden:** `LIMIT` sin `ORDER BY` devuelve *alguna* selección de 10 filas, no necesariamente las de menor `id`. Combinar ambas cláusulas es el patrón estándar para «los primeros N».",
    reward: defaultReward("very_easy"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "tipos-en-pedidos",
    section,
    title: "Tipos de datos en los pedidos",
    difficulty: "very_easy",
    estimated_minutes: 4,
    concepts: ["select", "where", "order_by"],
    dataset,
    tables_used: ["orders"],
    scenario_md:
      "Finanzas te pregunta si `total_amount` es un número «de verdad» o un texto, y si `created_at` guarda la hora. La forma más rápida de comprobarlo es mirar algunas filas y observar los tipos que muestra el resultado.",
    business_question_md:
      "Muestra `id`, `status`, `total_amount` y `created_at` de los pedidos con `id` menor o igual a **5**, ordenados por `id`.",
    learning_objective:
      "Observar tipos de datos reales (numérico, texto, timestamp) en el resultado de una consulta.",
    theory_ref: "tipos-de-datos",
    expected_columns: [
      { name: "id", type: "integer" },
      { name: "status", type: "text" },
      { name: "total_amount", type: "numeric" },
      { name: "created_at", type: "timestamp" },
    ],
    validation_rules: { order_matters: true, required_concepts: ["where"] },
    reference_solution:
      "SELECT id, status, total_amount, created_at\nFROM orders\nWHERE id <= 5\nORDER BY id;",
    alternative_solutions: [
      {
        label: "Con BETWEEN",
        sql: "SELECT id, status, total_amount, created_at FROM orders WHERE id BETWEEN 1 AND 5 ORDER BY id",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Quieres pocas filas concretas (las de `id` 1 a 5): eso es un filtro sobre filas, no un límite de cantidad.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Filtra con `WHERE id <= 5` en la tabla `orders` y ordena por `id`. Fíjate en el tipo que el resultado muestra para `total_amount` y `created_at`.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT id, status, ___, ___\nFROM orders\nWHERE id ___ 5\nORDER BY id;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "missing_filter",
        description_md:
          "Usar `LIMIT 5` en lugar de `WHERE id <= 5`: devuelve cinco filas, pero no necesariamente las de `id` 1 a 5.",
      },
      {
        category: "wrong_columns",
        description_md:
          "Olvidar `created_at`, que es justamente la columna cuyo tipo queríamos ver.",
      },
      {
        category: "wrong_order",
        description_md: "Omitir `ORDER BY id` deja el orden sin garantía.",
      },
    ],
    expert_explanation_md:
      "`WHERE id <= 5` selecciona por contenido (los pedidos cuyo identificador es 1 a 5), mientras que `LIMIT 5` selecciona por cantidad. En este caso coinciden solo si además ordenas por `id`, pero la consigna pide un filtro.\n\nEn el resultado observa los tipos: `total_amount` es `numeric` (decimales exactos, ideal para dinero) y `created_at` es `timestamptz` (instante con zona horaria). `status` es texto.",
    reward: defaultReward("very_easy"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
];
