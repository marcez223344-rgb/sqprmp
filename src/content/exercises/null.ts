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
      "El departamento Comercial quiere invitar a un programa de primeras ventas a los vendedores que todavía no recibieron ninguna calificación. Te piden la lista de esos vendedores para poder contactarlos.",
    business_question_md:
      "Debes generar un dataset que devuelva el `id` y el `store_name` de los vendedores cuya columna `rating` está en `NULL`, es decir, sin valor cargado. El orden de las filas no importa.",
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
        body_md:
          "La condición `rating = NULL` no funciona: ninguna comparación con `NULL` puede dar verdadero, porque `NULL` significa «valor desconocido».",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Existe un operador específico para preguntar si un valor está ausente, y se escribe `IS NULL`.",
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
        description_md:
          "Escribir `WHERE rating = NULL`: la consulta devuelve 0 filas y el motor no informa ningún error, así que el problema pasa desapercibido.",
      },
      {
        category: "null_handling",
        description_md:
          "Escribir `WHERE rating = 0`: los vendedores sin calificación no tienen un cero guardado, tienen `NULL`, que es algo distinto.",
      },
      {
        category: "syntax",
        description_md:
          "Escribir `WHERE rating IS 'NULL'`: con comillas simples se compara contra el texto `'NULL'` y PostgreSQL devuelve un error de tipos.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 28 vendedores. El operador `IS NULL` es una prueba y no una comparación: por eso no participa de la lógica de tres valores y siempre devuelve verdadero o falso.\n\nEn datos reales, «sin calificación» suele mezclarse con «calificación cero» por errores de carga; conviene acordar con el negocio qué significa cada caso antes de escribir el reporte.",
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
      "El departamento de Logística va a reclamarle al transportista **LatamPost** por los envíos que ya fueron despachados pero todavía no tienen fecha de entrega registrada, es decir, los que tienen la columna `delivered_at` en `NULL`. Te piden ese listado para llevarlo al reclamo.",
    business_question_md:
      "Debes generar un dataset que devuelva el `id`, el `order_id` y el `shipped_at` de los envíos cuyo `carrier` es igual al texto `'LatamPost'` y cuya columna `delivered_at` está en `NULL`, ordenados por `shipped_at` de forma ascendente, es decir, con los despachos más antiguos primero.",
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
        body_md:
          "Necesitas dos condiciones unidas con `AND`: una es una igualdad de texto sobre el transportista y la otra es una prueba de ausencia de valor.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "La condición `delivered_at IS NULL` identifica los envíos que todavía no fueron entregados. Ordena el resultado con `ORDER BY shipped_at`, ya que el orden ascendente es el valor por omisión.",
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
        description_md:
          "Escribir `delivered_at = NULL` o `delivered_at = ''`: la primera forma devuelve 0 filas sin avisar y la segunda produce un error de tipos, porque la columna guarda una marca de tiempo.",
      },
      {
        category: "wrong_order",
        description_md:
          "Ordenar en forma descendente: la consigna pide ver primero los despachos más antiguos, que son los que llevan más días sin entrega.",
      },
      {
        category: "row_count",
        description_md:
          "Escribir el nombre del transportista con otra capitalización, como `'Latampost'`: la comparación de texto distingue mayúsculas y el resultado sale con 0 filas.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 194 envíos. Un valor `NULL` en `delivered_at` puede significar «en camino» o «perdido»; lo que distingue un caso del otro es la antigüedad del despacho, y por eso el orden ascendente por `shipped_at` es parte de la respuesta y no un detalle de presentación.\n\nEste tipo de lista es la base de un reporte de nivel de servicio (SLA, por sus siglas en inglés: acuerdo de nivel de servicio) que vas a construir con funciones de fecha en la sección 11.",
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
      "El panel de vendedores de la aplicación no puede mostrar celdas vacías. El departamento de Producto pide que los vendedores sin calificación aparezcan con el valor `0` y te encarga la consulta que alimenta ese panel.",
    business_question_md:
      "Debes generar un dataset que devuelva el `id`, el `store_name` y la calificación en una columna llamada `rating_o_cero`, que muestre el valor de `rating` cuando existe y el número `0` cuando la columna está en `NULL`, para **todos** los vendedores. Ordena por `rating_o_cero` descendente y, si dos vendedores empatan, debes desempatar usando `id` ascendente.",
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
        body_md:
          "La función `COALESCE(a, b)` devuelve el primer argumento cuando no es `NULL` y el segundo en caso contrario.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "El alias que defines en el `SELECT` sí puede usarse dentro del `ORDER BY`. Agrega `id` como segundo criterio de ordenamiento para resolver los empates.",
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
          "Ordenar por `rating DESC` en lugar de por la columna calculada con `COALESCE`: los valores `NULL` quedarían en las primeras filas del panel.",
      },
      {
        category: "wrong_order",
        description_md:
          "Omitir `id` como segundo criterio: el orden entre vendedores con la misma calificación queda indefinido y puede cambiar entre ejecuciones.",
      },
      {
        category: "wrong_columns",
        description_md:
          "Olvidar el alias `rating_o_cero`: la columna sale con el nombre que le pone PostgreSQL y el panel no la encuentra.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 180 filas, y los 28 vendedores sin calificación quedan al final con el valor `0`. Sin la función `COALESCE`, la cláusula `ORDER BY rating DESC` los habría puesto **primero**, porque PostgreSQL trata `NULL` como el valor más grande cuando el orden es descendente.\n\nAgregar un segundo criterio de ordenamiento es una buena práctica siempre que pueda haber empates: es lo que hace que el resultado sea reproducible.",
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
      "El departamento de Atención al Cliente quiere contactar a quienes dejaron 1 o 2 estrellas sin escribir ningún motivo. Para el reporte, las reseñas sin texto deben mostrar la leyenda `(sin comentario)` en lugar de una celda vacía. Te piden ese listado para organizar las llamadas.",
    business_question_md:
      "Debes generar un dataset que devuelva el `id`, el `customer_id`, el `rating` y el comentario en una columna llamada `comentario`, que muestre el texto original cuando existe y el texto `'(sin comentario)'` cuando la columna `comment` está en `NULL`, para las reseñas cuyo `rating` es menor o igual a 2 **y** cuya columna `comment` está en `NULL`. El orden de las filas no importa.",
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
          "Son dos tareas distintas: filtrar en la cláusula `WHERE` las reseñas que no tienen comentario y, en la lista de `SELECT`, mostrar un texto en lugar del valor `NULL`.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "En el filtro usa la condición `comment IS NULL`; en la lista de columnas usa `COALESCE(comment, '(sin comentario)')` con su alias.",
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
          "Filtrar con la condición `comment = ''`: los comentarios ausentes están guardados como `NULL` y no como cadena vacía, así que el resultado sale con 0 filas.",
      },
      {
        category: "wrong_columns",
        description_md:
          "Devolver la columna `comment` sin envolverla en `COALESCE`: el reporte muestra celdas vacías en lugar del texto `'(sin comentario)'` que pidió el negocio.",
      },
      {
        category: "row_count",
        description_md:
          "Escribir `rating < 2`: la condición deja afuera las reseñas de 2 estrellas, que la consigna pidió incluir.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 225 reseñas. Como el filtro exige `comment IS NULL`, la columna `comentario` vale `'(sin comentario)'` en todas las filas: la función `COALESCE` está ahí por el formato del reporte y no por la lógica del filtro.\n\nSepara siempre las dos preguntas: qué filas quieres, que se resuelve en la cláusula `WHERE`, y cómo las muestras, que se resuelve en la lista de `SELECT`.",
    reward: defaultReward("intermediate"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
];
