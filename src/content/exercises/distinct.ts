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
      "El departamento de Marketing está preparando campañas por país y necesita saber en qué países hay clientes registrados en **TiendaViva**. Te piden esa lista para decidir en qué mercados invertir el presupuesto del trimestre.",
    business_question_md:
      "Debes generar un dataset que devuelva la lista de países, guardados en la columna `country` de la tabla `customers`, **sin repeticiones**: cada país debe aparecer una sola vez. El orden de las filas no importa.",
    learning_objective: "Obtener los valores únicos de una columna con DISTINCT.",
    theory_ref,
    expected_columns: [{ name: "country", type: "text" }],
    validation_rules: { required_concepts: ["distinct"] },
    reference_solution: "SELECT DISTINCT country\nFROM customers;",
    hints: [
      {
        level: 1,
        body_md:
          "Si no eliminas las repeticiones obtendrías 3000 filas, una por cada cliente registrado. Necesitas una cláusula que deje un solo ejemplar de cada valor.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "La palabra clave `DISTINCT` va escrita justo después de `SELECT`, antes del nombre de la columna.",
        ...defaultHintMeta(2),
      },
      { level: 3, body_md: "```sql\nSELECT DISTINCT ___\nFROM ___;\n```", ...defaultHintMeta(3) },
    ],
    common_mistakes: [
      {
        category: "duplicates",
        description_md:
          "Olvidar la palabra clave `DISTINCT`: la consulta devuelve una fila por cada cliente, con el país repetido cientos de veces.",
      },
      {
        category: "wrong_columns",
        description_md:
          "Agregar la columna `city` u otra columna al `SELECT`: el resultado pasa a ser la lista de combinaciones de país y ciudad, que ya no es la lista de países únicos que pidió Marketing.",
      },
      {
        category: "syntax",
        description_md:
          "Escribir `SELECT country DISTINCT`: la palabra clave `DISTINCT` debe ir antes del nombre de la columna, no después.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da seis filas: los países `'AR'`, `'CL'`, `'CO'`, `'MX'`, `'PE'` y `'UY'`. Sobre las 3000 filas de clientes, el motor compara los valores de la columna y conserva uno por cada país distinto.\n\nEsta es la consulta de exploración más útil que existe: antes de filtrar por una columna de texto conviene mirar qué valores tiene realmente, porque ahí aparecen las mayúsculas inesperadas, las abreviaturas y los errores de carga.",
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
      "El departamento de Logística está negociando tarifas con cada transportista y quiere saber a qué ciudades entregó cada uno alguna vez. Te piden ese cruce para llegar a la negociación sabiendo quién cubre qué.",
    business_question_md:
      "Debes generar un dataset que devuelva las combinaciones **únicas** de `carrier` y `destination_city` que aparecen en la tabla `shipments`: cada par de transportista y ciudad debe aparecer una sola vez. El orden de las filas no importa.",
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
          "La palabra clave `DISTINCT` puede aplicarse a dos columnas a la vez: elimina las filas en las que **ambas** columnas se repiten, no una sola de ellas.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Escribe las dos columnas después de `SELECT DISTINCT`, separadas por una coma, y toma las filas de la tabla `shipments`.",
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
        description_md:
          "Olvidar la palabra clave `DISTINCT`: la consulta devuelve los 15 000 envíos, uno por fila.",
      },
      {
        category: "wrong_columns",
        description_md:
          "Incluir la columna `id` o la columna `order_id`: cada envío es único, así que `DISTINCT` no elimina nada y vuelves a tener todas las filas.",
      },
      {
        category: "wrong_columns",
        description_md:
          "Devolver solo la columna `carrier`: se pierde el detalle por ciudad, que es justamente la cobertura que pidió Logística.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 170 combinaciones: 5 transportistas por 34 ciudades, porque en este dataset todos los transportistas cubren todas las ciudades. En un dataset real esa matriz tendría huecos, y esos huecos serían justamente la información valiosa para la negociación.",
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
      "El árbol de categorías del catálogo tiene dos niveles: hay categorías raíz y categorías que cuelgan de otra. El departamento de Catálogo quiere ver qué valores toma la columna `parent_id`, incluido el caso de las categorías raíz, que no tienen padre. Te piden ese listado para entender la estructura antes de reorganizarla.",
    business_question_md:
      "Debes generar un dataset que devuelva los valores **únicos** de la columna `parent_id` de la tabla `categories`, ordenados de menor a mayor. Las categorías raíz tienen `parent_id` en `NULL` y esa fila también debe aparecer en el resultado.",
    learning_objective: "Observar cómo DISTINCT y ORDER BY tratan a NULL.",
    theory_ref,
    expected_columns: [{ name: "parent_id", type: "integer" }],
    validation_rules: { order_matters: true, required_concepts: ["distinct", "order_by"] },
    reference_solution: "SELECT DISTINCT parent_id\nFROM categories\nORDER BY parent_id;",
    hints: [
      {
        level: 1,
        body_md:
          "No necesitas filtrar nada: la palabra clave `DISTINCT` conserva por sí sola una única fila con el valor `NULL`.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Agrega `ORDER BY parent_id` al final de la consulta. En PostgreSQL, los valores `NULL` quedan al final cuando el orden es ascendente.",
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
        description_md:
          "Agregar el filtro `parent_id IS NOT NULL`: la consigna pide incluir a las categorías raíz, que son justamente las que tienen `NULL` en esa columna.",
      },
      {
        category: "wrong_order",
        description_md:
          "Omitir la cláusula `ORDER BY`: el resultado debe salir ordenado de menor a mayor.",
      },
      {
        category: "duplicates",
        description_md:
          "Olvidar la palabra clave `DISTINCT`: aparecen 30 filas, una por cada categoría.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da siete filas: los identificadores del 1 al 6, que son las categorías raíz y a la vez padre de las subcategorías, y una fila con `NULL` al final. PostgreSQL ordena los valores `NULL` **después** de los demás valores cuando el orden es ascendente, y antes cuando es descendente; puedes forzar el comportamiento que quieras con `NULLS FIRST` o `NULLS LAST`.\n\nQue `DISTINCT` agrupe todos los `NULL` en una sola fila es una de las pocas situaciones en las que `NULL` se compara con `NULL`. En la cláusula `WHERE` eso no ocurre, como vas a ver en la sección 8.",
    reward: defaultReward("easy"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
];
