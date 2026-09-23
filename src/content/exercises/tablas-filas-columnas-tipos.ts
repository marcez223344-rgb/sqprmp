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
      "Es tu primer día en el equipo de datos de **TiendaViva**. Antes de responder cualquier pregunta quieres conocer la tabla `customers`: qué columnas tiene y cómo se ven sus filas. Vas a compartir esa muestra con quien te está haciendo el traspaso, así que necesitas que le devuelva exactamente las mismas diez filas que a ti.",
    business_question_md:
      "Muestra las columnas `id`, `full_name` y `country` de **10 clientes**, ordenando por `id` de menor a mayor para que la muestra sea siempre la misma.",
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
          "Necesitas tres columnas de una sola tabla, un orden fijo y solo unas pocas filas. Piensa en qué cláusulas controlan el orden y la cantidad.",
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
      "1. `SELECT id, full_name, country` elige las tres columnas pedidas, en ese orden.\n2. `FROM customers` indica la tabla.\n3. `ORDER BY id` garantiza el orden ascendente (es el valor por defecto; `ASC` es opcional).\n4. `LIMIT 10` corta el resultado.\n\n**Por qué importa el orden:** `LIMIT` sin `ORDER BY` devuelve *alguna* selección de 10 filas y el motor no promete que sean las mismas la próxima vez. Aquí el `id` no responde ninguna pregunta de negocio; lo único que hace es fijar la muestra para que dos personas vean lo mismo. Cuando la pregunta sí tenga un criterio propio (el cliente más nuevo, el pedido más caro), ese criterio va en el `ORDER BY` y el `id` queda como desempate.",
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
      "Finanzas está armando un reporte de cierre y te pasó cinco números de pedido que quiere revisar a mano: 1, 3, 18, 36 y 58. Además pregunta si `total_amount` es un número «de verdad» o un texto, y si `created_at` guarda la hora. Al traer esas cinco filas vas a responder las dos cosas de una sola vez.",
    business_question_md:
      "Muestra `id`, `status`, `total_amount` y `created_at` de los cinco pedidos que pidió Finanzas (`id` 1, 3, 18, 36 y 58), ordenados por `id` de menor a mayor.",
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
      "SELECT id, status, total_amount, created_at\nFROM orders\nWHERE id IN (1, 3, 18, 36, 58)\nORDER BY id;",
    alternative_solutions: [
      {
        label: "Con una lista de comparaciones unidas por OR",
        sql: "SELECT id, status, total_amount, created_at FROM orders WHERE id = 1 OR id = 3 OR id = 18 OR id = 36 OR id = 58 ORDER BY id",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Quieres cinco filas concretas, identificadas una por una: eso es un filtro sobre filas, no un límite de cantidad.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "En la tabla `orders`, el operador `IN` permite escribir una lista de valores entre paréntesis y quedarte con las filas que coinciden con cualquiera de ellos. Después ordena por `id`. Fíjate en el tipo que el resultado muestra para `total_amount` y `created_at`.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT id, status, ___, ___\nFROM orders\nWHERE id ___ (1, 3, 18, 36, 58)\nORDER BY id;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "missing_filter",
        description_md:
          "Usar `LIMIT 5` en lugar del filtro: devuelve cinco filas, pero no las cinco que pidió Finanzas. `LIMIT` recorta por cantidad, no elige por contenido.",
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
      "Buscar pedidos por su número es uno de los usos legítimos de un identificador: cuando alguien del negocio te pasa una lista de casos a revisar, `WHERE id IN (...)` es exactamente la herramienta. `IN` es la forma corta de una cadena de `OR`, y las dos consultas se ejecutan igual.\n\n`WHERE` selecciona por contenido y `LIMIT` selecciona por cantidad: son decisiones distintas. Con `LIMIT 5` traerías cinco pedidos cualesquiera y el reporte de Finanzas quedaría mal desde la primera fila.\n\nEn el resultado observa los tipos: `total_amount` es `numeric` (decimales exactos, ideal para dinero) y `created_at` es `timestamptz` (instante con zona horaria). `status` es texto, y en estas cinco filas ya aparecen cinco valores distintos (`cancelled`, `delivered`, `shipped`, `returned`, `pending`): así se ve de un vistazo qué estados maneja la tabla.",
    reward: defaultReward("very_easy"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
];
