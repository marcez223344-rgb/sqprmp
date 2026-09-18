import {
  defaultHintMeta,
  defaultReward,
  defaultSolutionUnlock,
  type ExerciseDef,
} from "../schemas/exercise";

const section = "null";
const dataset = { slug: "tiendaviva", version: 1 };

export const exercises: ExerciseDef[] = [
  {
    slug: "vendedores-sin-calificacion",
    section,
    title: "Vendedores sin calificación",
    difficulty: "very_easy",
    estimated_minutes: 3,
    concepts: ["select", "where", "null_handling"],
    dataset,
    tables_used: ["sellers"],
    scenario_md:
      "Comercial quiere invitar a los vendedores que todavía no recibieron ninguna calificación a un programa de primeras ventas.",
    business_question_md:
      "Devuelve `id` y `store_name` de los vendedores cuyo `rating` es NULL. El orden no importa.",
    learning_objective: "Detectar valores NULL con IS NULL.",
    theory_ref: "null-logica-de-tres-valores",
    expected_columns: [
      { name: "id", type: "integer" },
      { name: "store_name", type: "text" },
    ],
    validation_rules: { required_concepts: ["null_handling"] },
    reference_solution: "SELECT id, store_name\nFROM sellers\nWHERE rating IS NULL;",
    hints: [
      {
        level: 1,
        body_md: "`rating = NULL` no funciona: ninguna comparación con NULL es verdadera.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md: "Existe un operador específico para preguntar si un valor es NULL: `IS NULL`.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md: "```sql\nSELECT id, store_name\nFROM sellers\nWHERE rating ___ ___;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "null_handling",
        description_md: "`WHERE rating = NULL` devuelve 0 filas sin error.",
      },
      {
        category: "null_handling",
        description_md:
          "`WHERE rating = 0`: los vendedores sin calificación no tienen 0, tienen NULL.",
      },
      {
        category: "syntax",
        description_md: "`WHERE rating IS 'NULL'` compara con un texto y produce error.",
      },
    ],
    expert_explanation_md:
      "28 vendedores. `IS NULL` es una prueba, no una comparación: no participa de la lógica de tres valores.\n\nEn datos reales, «sin calificación» suele mezclarse con «calificación 0» por errores de carga; conviene acordar con el negocio qué significa cada caso.",
    reward: defaultReward("very_easy"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "envios-pendientes-latampost",
    section,
    title: "Envíos pendientes de LatamPost",
    difficulty: "easy",
    estimated_minutes: 5,
    concepts: ["select", "where", "null_handling", "order_by"],
    dataset,
    tables_used: ["shipments"],
    scenario_md:
      "Logística reclama a **LatamPost** por los envíos despachados que aún no tienen fecha de entrega (`delivered_at` NULL).",
    business_question_md:
      "Devuelve `id`, `order_id` y `shipped_at` de los envíos con `carrier` igual a `'LatamPost'` y `delivered_at` NULL, ordenados por `shipped_at` ascendente (los más antiguos primero).",
    learning_objective: "Combinar IS NULL con otra condición y ordenar el resultado.",
    theory_ref: "null-logica-de-tres-valores",
    expected_columns: [
      { name: "id", type: "integer" },
      { name: "order_id", type: "integer" },
      { name: "shipped_at", type: "timestamp" },
    ],
    validation_rules: { order_matters: true, required_concepts: ["null_handling", "order_by"] },
    reference_solution:
      "SELECT id, order_id, shipped_at\nFROM shipments\nWHERE carrier = 'LatamPost'\n  AND delivered_at IS NULL\nORDER BY shipped_at;",
    hints: [
      {
        level: 1,
        body_md: "Dos condiciones con `AND`: una igualdad de texto y una prueba de NULL.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "`delivered_at IS NULL` identifica los no entregados. Ordena con `ORDER BY shipped_at` (ascendente es el valor por defecto).",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT id, order_id, shipped_at\nFROM shipments\nWHERE carrier = '___'\n  AND delivered_at ___ ___\nORDER BY ___;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "null_handling",
        description_md: "`delivered_at = NULL` o `delivered_at = ''`: 0 filas o error de tipo.",
      },
      {
        category: "wrong_order",
        description_md: "Ordenar descendente: la consigna pide los más antiguos primero.",
      },
      {
        category: "row_count",
        description_md: "Escribir `'Latampost'` con otra capitalización: 0 filas.",
      },
    ],
    expert_explanation_md:
      "194 envíos. Un `delivered_at` NULL puede significar «en camino» o «perdido»; la antigüedad de `shipped_at` es lo que distingue ambos casos, por eso el orden ascendente.\n\nEste tipo de lista es la base de un reporte de SLA que construirás con funciones de fecha en la sección 11.",
    reward: defaultReward("easy"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "calificacion-o-cero",
    section,
    title: "Calificación o cero",
    difficulty: "easy",
    estimated_minutes: 6,
    concepts: ["select", "alias", "null_handling", "order_by"],
    dataset,
    tables_used: ["sellers"],
    scenario_md:
      "El panel de vendedores no puede mostrar celdas vacías. Producto pide que los vendedores sin calificación aparezcan con 0.",
    business_question_md:
      "Devuelve `id`, `store_name` y la calificación como `rating_o_cero` (el `rating`, o `0` cuando es NULL) de **todos** los vendedores, ordenados por `rating_o_cero` descendente y luego por `id` ascendente.",
    learning_objective: "Reemplazar NULL por un valor de negocio con COALESCE.",
    theory_ref: "null-coalesce-y-nullif",
    expected_columns: [
      { name: "id", type: "integer" },
      { name: "store_name", type: "text" },
      { name: "rating_o_cero", type: "numeric" },
    ],
    validation_rules: { order_matters: true, required_concepts: ["null_handling", "alias"] },
    reference_solution:
      "SELECT id, store_name, COALESCE(rating, 0) AS rating_o_cero\nFROM sellers\nORDER BY rating_o_cero DESC, id;",
    alternative_solutions: [
      {
        label: "Expresión repetida en ORDER BY",
        sql: "SELECT id, store_name, COALESCE(rating, 0) AS rating_o_cero FROM sellers ORDER BY COALESCE(rating, 0) DESC, id ASC;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md: "`COALESCE(a, b)` devuelve `a` si no es NULL y `b` en caso contrario.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "El alias del `SELECT` sí puede usarse en `ORDER BY`. Agrega `id` como segundo criterio para los empates.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT id, store_name, COALESCE(___, 0) AS rating_o_cero\nFROM sellers\nORDER BY rating_o_cero ___, id;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "null_handling",
        description_md:
          "Ordenar por `rating DESC` en vez de por la columna con `COALESCE`: los NULL quedarían primero.",
      },
      {
        category: "wrong_order",
        description_md:
          "Omitir `id` como segundo criterio: el orden entre vendedores con la misma calificación queda indefinido.",
      },
      {
        category: "wrong_columns",
        description_md: "Olvidar el alias `rating_o_cero`.",
      },
    ],
    expert_explanation_md:
      "180 filas; los 28 vendedores sin calificación quedan al final con 0. Sin `COALESCE`, `ORDER BY rating DESC` los habría puesto **primero**, porque PostgreSQL trata NULL como el mayor valor en orden descendente.\n\nEl segundo criterio de orden es una buena práctica siempre que haya empates: hace el resultado reproducible.",
    reward: defaultReward("easy"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "resenas-negativas-sin-comentario",
    section,
    title: "Reseñas negativas sin comentario",
    difficulty: "intermediate",
    estimated_minutes: 7,
    concepts: ["select", "where", "null_handling", "alias"],
    dataset,
    tables_used: ["reviews"],
    scenario_md:
      "Atención al cliente contacta a quienes dejaron 1 o 2 estrellas sin explicar por qué. Para el reporte, las reseñas sin texto deben mostrar `(sin comentario)`.",
    business_question_md:
      "Devuelve `id`, `customer_id`, `rating` y el comentario como `comentario` (el texto original, o `(sin comentario)` cuando es NULL) de las reseñas con `rating` menor o igual a 2 **y** `comment` NULL. El orden no importa.",
    learning_objective: "Filtrar por NULL y a la vez presentar un valor legible con COALESCE.",
    theory_ref: "null-coalesce-y-nullif",
    expected_columns: [
      { name: "id", type: "integer" },
      { name: "customer_id", type: "integer" },
      { name: "rating", type: "integer" },
      { name: "comentario", type: "text" },
    ],
    validation_rules: { required_concepts: ["null_handling", "where"] },
    reference_solution:
      "SELECT id, customer_id, rating, COALESCE(comment, '(sin comentario)') AS comentario\nFROM reviews\nWHERE rating <= 2\n  AND comment IS NULL;",
    hints: [
      {
        level: 1,
        body_md:
          "Son dos tareas: filtrar (`WHERE`) las reseñas sin comentario y mostrar (`SELECT`) un texto en lugar del NULL.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "En el filtro usa `comment IS NULL`; en la lista de columnas, `COALESCE(comment, '(sin comentario)')` con alias.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT id, customer_id, rating, COALESCE(___, '(sin comentario)') AS comentario\nFROM reviews\nWHERE rating <= ___\n  AND comment ___ ___;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "null_handling",
        description_md:
          "Filtrar con `comment = ''`: los comentarios ausentes son NULL, no cadenas vacías.",
      },
      {
        category: "wrong_columns",
        description_md:
          "Devolver `comment` sin `COALESCE`: la columna mostraría NULL y no el texto pedido.",
      },
      {
        category: "row_count",
        description_md: "`rating < 2` deja afuera las reseñas de 2 estrellas.",
      },
    ],
    expert_explanation_md:
      "225 reseñas. Como el filtro exige `comment IS NULL`, la columna `comentario` vale `(sin comentario)` en todas las filas: `COALESCE` está ahí por el formato del reporte, no por la lógica.\n\nSepara siempre las dos preguntas: qué filas quiero (WHERE) y cómo las muestro (SELECT).",
    reward: defaultReward("intermediate"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
];
