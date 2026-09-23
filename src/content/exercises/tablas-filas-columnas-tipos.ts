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
      "Es tu primer día en el equipo de datos de **TiendaViva**. Antes de responder cualquier pregunta de negocio quieres conocer la tabla `customers`: qué columnas tiene y cómo se ven sus filas. Vas a compartir esa muestra con la persona que te está haciendo el traspaso, así que necesitas que a ella le devuelva exactamente las mismas diez filas que a ti.",
    business_question_md:
      "Debes generar un dataset que devuelva las columnas `id`, `full_name` y `country` de **10 clientes**, ordenados por `id` de menor a mayor para que la muestra sea siempre la misma.",
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
          "Necesitas tres columnas de una sola tabla, un orden fijo y solo unas pocas filas. Piensa en qué cláusula controla el orden del resultado y en cuál controla la cantidad de filas.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "La tabla que debes consultar es `customers`. Ordena el resultado con `ORDER BY id` y recorta la cantidad de filas con `LIMIT 10`. Los nombres de las columnas van después de `SELECT`, separados por comas.",
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
          "Escribir `SELECT *`: la consulta devuelve todas las columnas de la tabla, y la consigna pide exactamente tres.",
      },
      {
        category: "wrong_order",
        description_md:
          "No escribir `ORDER BY id`: sin un orden explícito, el motor no garantiza que las 10 filas que devuelve `LIMIT` sean siempre las mismas.",
      },
      {
        category: "row_count",
        description_md:
          "Olvidar la cláusula `LIMIT 10`: la consulta devuelve los 3000 clientes de la tabla.",
      },
    ],
    expert_explanation_md:
      "La consulta se arma en cuatro pasos.\n\n1. La cláusula `SELECT id, full_name, country` elige las tres columnas pedidas, en ese orden.\n2. La cláusula `FROM customers` indica de qué tabla salen las filas.\n3. La cláusula `ORDER BY id` garantiza el orden ascendente, que es el valor por omisión, así que escribir `ASC` es opcional.\n4. La cláusula `LIMIT 10` corta el resultado en las primeras diez filas.\n\n**Por qué importa el orden:** la cláusula `LIMIT` sin `ORDER BY` devuelve alguna selección de 10 filas, y el motor no promete que sean las mismas la próxima vez que ejecutes la consulta. Aquí el `id` no responde ninguna pregunta de negocio; lo único que hace es fijar la muestra para que dos personas vean lo mismo. Cuando la pregunta tenga un criterio propio, como el cliente más nuevo o el pedido más caro, ese criterio va en el `ORDER BY` y el `id` queda como columna de desempate.",
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
      "El departamento de Finanzas está armando un reporte de cierre y te pasó cinco números de pedido que quiere revisar a mano: 1, 3, 18, 36 y 58. Además pregunta si la columna `total_amount` guarda un número de verdad o un texto, y si la columna `created_at` guarda también la hora. Al traer esas cinco filas vas a responder las dos preguntas de una sola vez.",
    business_question_md:
      "Debes generar un dataset que devuelva el `id`, el `status`, el `total_amount` y el `created_at` de los cinco pedidos que pidió Finanzas, es decir, los que tienen `id` igual a 1, 3, 18, 36 o 58, ordenados por `id` de menor a mayor.",
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
          "Necesitas cinco filas concretas, identificadas una por una: eso es un filtro que elige filas por su contenido, no un límite de cantidad.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "En la tabla `orders`, el operador `IN` te permite escribir una lista de valores entre paréntesis y quedarte con las filas que coinciden con cualquiera de ellos. Después ordena por `id`. Al ver el resultado, fíjate en qué tipo de dato muestran las columnas `total_amount` y `created_at`.",
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
          "Usar `LIMIT 5` en lugar del filtro: la consulta devuelve cinco filas, pero no son las cinco que pidió Finanzas. La cláusula `LIMIT` recorta por cantidad y no elige por contenido.",
      },
      {
        category: "wrong_columns",
        description_md:
          "Olvidar la columna `created_at`, que es justamente una de las dos columnas cuyo tipo de dato queríamos observar.",
      },
      {
        category: "wrong_order",
        description_md:
          "Omitir la cláusula `ORDER BY id`: el resultado sale sin ninguna garantía de orden.",
      },
    ],
    expert_explanation_md:
      "Buscar pedidos por su número es uno de los usos legítimos de un identificador: cuando alguien del negocio te pasa una lista de casos a revisar, la condición `WHERE id IN (...)` es exactamente la herramienta indicada. El operador `IN` es la forma corta de una cadena de comparaciones unidas por `OR`, y las dos consultas se ejecutan de la misma manera.\n\nLa cláusula `WHERE` selecciona filas por contenido y la cláusula `LIMIT` selecciona por cantidad: son dos decisiones distintas. Con `LIMIT 5` traerías cinco pedidos cualesquiera y el reporte de Finanzas quedaría mal desde la primera fila.\n\nEn el resultado observa los tipos de datos: `total_amount` es de tipo `numeric` (decimales exactos, lo indicado para dinero) y `created_at` es de tipo `timestamptz` (un instante con zona horaria). La columna `status` es de tipo texto, y en estas cinco filas ya aparecen cinco valores distintos: `'cancelled'`, `'delivered'`, `'shipped'`, `'returned'` y `'pending'`. Así se ve de un vistazo qué estados maneja la tabla.",
    reward: defaultReward("very_easy"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
];
