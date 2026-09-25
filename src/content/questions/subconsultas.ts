import type { QuestionDef } from "../schemas/question";

const section = "subconsultas";
const escalares = "subconsultas-escalares-y-derivadas";
const existencia = "subconsultas-in-exists-y-null";
const correlacionadas = "subconsultas-correlacionadas";

export const questions: QuestionDef[] = [
  {
    slug: "sub-q01-posiciones",
    section,
    lesson: escalares,
    type: "single",
    difficulty: "easy",
    topic: "Dónde puede ir una subconsulta",
    tags: ["subquery"],
    estimated_seconds: 40,
    prompt_md:
      "Necesitas calcular el promedio de pedidos por cliente: primero contar pedidos por cliente y después promediar esos conteos. ¿Dónde va la subconsulta?",
    options: [
      {
        key: "a",
        body_md: "En `FROM`, como tabla derivada con alias.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "En `SELECT`, como subconsulta escalar.",
        is_correct: false,
        why_incorrect_md:
          "Una subconsulta escalar devuelve un solo valor; aquí necesitas una tabla con una fila por cliente para poder promediar esos conteos.",
      },
      {
        key: "c",
        body_md: "En `WHERE`, con `IN`.",
        is_correct: false,
        why_incorrect_md: "`IN` filtra filas; no calcula un agregado sobre otro agregado.",
      },
      {
        key: "d",
        body_md: "En ninguna: basta con `avg(count(*))`.",
        is_correct: false,
        why_incorrect_md:
          "PostgreSQL rechaza `avg(count(*))` con el error «aggregate function calls cannot be nested» (no se pueden anidar funciones de agregación): necesitas dos niveles de consulta.",
      },
    ],
    explanation_md:
      "Agregar sobre un agregado exige dos niveles: la subconsulta en `FROM` produce el conteo por cliente y la consulta externa lo promedia.",
    is_published: true,
  },
  {
    slug: "sub-q02-escalar-varias-filas",
    section,
    lesson: escalares,
    type: "single",
    difficulty: "easy",
    topic: "Reglas de la subconsulta escalar",
    tags: ["subquery", "errors"],
    estimated_seconds: 45,
    prompt_md:
      "Una subconsulta escalar en `SELECT` devuelve, para cierta consulta, cero filas. ¿Qué pasa?",
    options: [
      {
        key: "a",
        body_md: "La columna vale `NULL` y la consulta se ejecuta sin error.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "La consulta falla con un error.",
        is_correct: false,
        why_incorrect_md:
          "El error aparece cuando devuelve **más de una** fila, no cuando devuelve cero.",
      },
      {
        key: "c",
        body_md: "La columna vale 0.",
        is_correct: false,
        why_incorrect_md:
          "Ausencia de resultado no es cero. Si quieres 0, envuelve la subconsulta con `COALESCE`.",
      },
    ],
    explanation_md:
      "Cero filas en posición escalar producen `NULL` en silencio: es una causa habitual de reportes con huecos inesperados.",
    is_published: true,
  },
  {
    slug: "sub-q03-not-in-null",
    section,
    lesson: existencia,
    type: "true_false",
    difficulty: "intermediate",
    topic: "NOT IN y NULL",
    tags: ["subquery", "null_handling"],
    estimated_seconds: 45,
    prompt_md:
      "En `WHERE id NOT IN (lista)`, si la lista contiene al menos un `NULL`, esa condición nunca es verdadera para ninguna fila, así que la consulta (sin otras condiciones con `OR`) devuelve cero filas.",
    options: [
      { key: "a", body_md: "Verdadero", is_correct: true },
      {
        key: "b",
        body_md: "Falso",
        is_correct: false,
        why_incorrect_md:
          "La comparación con `NULL` da `UNKNOWN`; `NOT UNKNOWN` sigue siendo `UNKNOWN`, así que ninguna fila pasa el filtro.",
      },
    ],
    explanation_md:
      "`x NOT IN (a, NULL)` es `NOT (x = a OR x = NULL)`. Cuando `x` no coincide con `a`, el resultado es `UNKNOWN` y la fila se descarta. Sin error y sin filas.",
    is_published: true,
  },
  {
    slug: "sub-q04-arreglos-not-in",
    section,
    lesson: existencia,
    type: "multiple",
    difficulty: "intermediate",
    topic: "Cómo evitar la trampa de NOT IN",
    tags: ["subquery", "null_handling", "exists"],
    estimated_seconds: 70,
    prompt_md:
      "En Bolsillo, `SELECT * FROM cards WHERE id NOT IN (SELECT card_id FROM transactions);` devuelve cero filas, porque la columna `card_id` de la tabla `transactions` está en `NULL` en todos los movimientos que no se hicieron con tarjeta. ¿Qué cambios devuelven las tarjetas sin movimientos? Marca todas las correctas.",
    options: [
      {
        key: "a",
        body_md: "Agregar `WHERE card_id IS NOT NULL` dentro de la subconsulta.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Usar `NOT EXISTS (SELECT 1 FROM transactions AS t WHERE t.card_id = cards.id)`.",
        is_correct: true,
      },
      {
        key: "c",
        body_md: "Cambiar `NOT IN` por `NOT LIKE`.",
        is_correct: false,
        why_incorrect_md: "`LIKE` compara texto contra un patrón; no reemplaza una pertenencia.",
      },
      {
        key: "d",
        body_md: "Agregar `DISTINCT` a la subconsulta.",
        is_correct: false,
        why_incorrect_md:
          "`DISTINCT` quita duplicados pero conserva un `NULL` en la lista (se queda con uno), así que el problema sigue igual.",
      },
    ],
    explanation_md:
      "Las dos soluciones válidas son quitar los `NULL` de la lista o expresar la pregunta como inexistencia con `NOT EXISTS`, que pregunta si hay filas relacionadas en lugar de comparar contra una lista de valores. En este dataset ambas devuelven 1638 tarjetas.",
    is_published: true,
  },
  {
    slug: "sub-q05-exists-fill",
    section,
    lesson: existencia,
    type: "fill_blank",
    difficulty: "easy",
    topic: "Existencia de filas relacionadas",
    tags: ["subquery", "exists"],
    estimated_seconds: 40,
    prompt_md:
      "Completa el operador que pregunta si una subconsulta devuelve al menos una fila: `WHERE ___ (SELECT 1 FROM transactions AS t WHERE t.account_id = a.id)`. Escribe solo la palabra clave.",
    answer: { accepted: ["EXISTS", "exists"], case_sensitive: false },
    explanation_md:
      "`EXISTS` evalúa si hay filas, no qué valores tienen; por eso no le afectan los `NULL` y puede detenerse en la primera coincidencia.",
    is_published: true,
  },
  {
    slug: "sub-q06-interpretar-derivada",
    section,
    lesson: escalares,
    type: "query_interpretation",
    difficulty: "intermediate",
    topic: "Tabla derivada",
    tags: ["subquery", "group_by"],
    estimated_seconds: 70,
    prompt_md: "¿Qué devuelve esta consulta?",
    code_md:
      "```sql\nSELECT c.country, round(avg(p.pedidos), 2) AS pedidos_promedio\nFROM (\n  SELECT customer_id, count(*) AS pedidos\n  FROM orders\n  WHERE status = 'delivered'\n  GROUP BY customer_id\n) AS p\nINNER JOIN customers AS c ON c.id = p.customer_id\nGROUP BY c.country;\n```",
    options: [
      {
        key: "a",
        body_md:
          "El promedio de pedidos entregados por cliente, en cada país, contando solo clientes con al menos un pedido entregado.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "La cantidad total de pedidos entregados por país.",
        is_correct: false,
        why_incorrect_md:
          "Eso sería `count(*)` sobre `orders` agrupado por país, sin la tabla derivada.",
      },
      {
        key: "c",
        body_md: "El promedio de pedidos por país considerando a todos los clientes registrados.",
        is_correct: false,
        why_incorrect_md:
          "El `INNER JOIN` con la tabla derivada deja fuera a los clientes sin pedidos entregados; para incluirlos harían falta un `LEFT JOIN` y `COALESCE`.",
      },
    ],
    explanation_md:
      "La subconsulta produce una fila por cliente con su conteo; la consulta externa promedia esos conteos por país. Los clientes sin pedidos entregados no existen en la tabla derivada.",
    is_published: true,
  },
  {
    slug: "sub-q07-error-alias-derivada",
    section,
    lesson: escalares,
    type: "error_diagnosis",
    difficulty: "easy",
    topic: "Columnas visibles de una tabla derivada",
    tags: ["subquery", "errors"],
    estimated_seconds: 50,
    prompt_md:
      'PostgreSQL rechaza esta consulta con el error «column "country" does not exist» (la columna `country` no existe). ¿Por qué?',
    code_md:
      "```sql\nSELECT country, avg(pedidos)\nFROM (\n  SELECT customer_id, count(*) AS pedidos\n  FROM orders\n  GROUP BY customer_id\n)\nGROUP BY country;\n```",
    options: [
      {
        key: "a",
        body_md:
          "La consulta externa solo ve las columnas que expone la subconsulta (`customer_id` y `pedidos`), y `country` no está entre ellas.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "La subconsulta en `FROM` no tiene alias.",
        is_correct: false,
        why_incorrect_md:
          "Desde PostgreSQL 16 el alias de una subconsulta en `FROM` es opcional, y el mensaje de error habla de una columna, no del alias. Otras bases de datos (y PostgreSQL 15 o anterior) sí lo exigen, así que ponerlo sigue siendo buena práctica.",
      },
      {
        key: "c",
        body_md: "`count(*)` no puede usarse dentro de una subconsulta.",
        is_correct: false,
        why_incorrect_md:
          "Una subconsulta puede agregar sin ninguna restricción: es justamente lo que hace aquí para contar pedidos por cliente.",
      },
      {
        key: "d",
        body_md: "Falta `ORDER BY` en la consulta externa.",
        is_correct: false,
        why_incorrect_md: "`ORDER BY` nunca es obligatorio; su ausencia no produce errores.",
      },
    ],
    explanation_md:
      "Una tabla derivada, es decir, una subconsulta en `FROM`, se comporta como una tabla que solo tiene las columnas de su `SELECT`. La tabla `orders` no tiene país: para agrupar por país hay que unir el resultado con `customers` (por ejemplo, `INNER JOIN customers AS c ON c.id = p.customer_id`) y agrupar por `c.country`. Aunque PostgreSQL ya no lo exija, conviene darle un alias a la subconsulta (`AS p`) para poder nombrar sus columnas.",
    is_published: true,
  },
  {
    slug: "sub-q08-relacionar-posiciones",
    section,
    lesson: correlacionadas,
    type: "matching",
    difficulty: "intermediate",
    topic: "Elegir la herramienta",
    tags: ["subquery", "exists", "inner_join"],
    estimated_seconds: 80,
    prompt_md: "Relaciona cada necesidad con la construcción más adecuada.",
    code_md: null,
    pairs: [
      {
        left: "Mostrar el promedio general al lado de cada fila",
        right: "Subconsulta escalar en SELECT",
      },
      {
        left: "Quedarte con los clientes que tienen al menos un pedido entregado, sin duplicar filas",
        right: "EXISTS o IN",
      },
      {
        left: "Listar comercios que nunca recibieron un pago, con una columna que admite NULL",
        right: "NOT EXISTS",
      },
      {
        left: "Promediar un conteo por grupo",
        right: "Tabla derivada en FROM",
      },
      {
        left: "Traer columnas de la tabla relacionada además de filtrar",
        right: "JOIN",
      },
    ],
    explanation_md:
      "Cada posición responde a una necesidad distinta: mostrar un valor, filtrar por existencia, calcular sobre un resultado previo o traer columnas.",
    is_published: true,
  },
  {
    slug: "sub-q09-correlacion-olvidada",
    section,
    lesson: correlacionadas,
    type: "error_diagnosis",
    difficulty: "advanced",
    topic: "Correlación olvidada",
    tags: ["subquery", "correlated"],
    estimated_seconds: 70,
    prompt_md:
      "El reporte muestra el mismo valor de `movimientos` en las 126 cuentas congeladas. ¿Qué ocurre?",
    code_md:
      "```sql\nSELECT\n  a.id,\n  (SELECT count(*) FROM transactions AS t WHERE t.status = 'completed') AS movimientos\nFROM accounts AS a\nWHERE a.status = 'frozen';\n```",
    options: [
      {
        key: "a",
        body_md:
          "Falta la condición de correlación `t.account_id = a.id`, así que la subconsulta cuenta todos los movimientos de la plataforma.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Falta un `GROUP BY a.id` en la consulta externa.",
        is_correct: false,
        why_incorrect_md:
          "No hay agregación en la consulta externa; agregar `GROUP BY` no cambiaría el valor repetido.",
      },
      {
        key: "c",
        body_md: "`count(*)` debería ser `count(t.id)`.",
        is_correct: false,
        why_incorrect_md:
          "Ambas cuentan lo mismo aquí, porque `id` nunca es `NULL`; el problema es qué filas entran en la subconsulta, no la función.",
      },
    ],
    explanation_md:
      "Sin la condición que une la subconsulta con la fila externa, la subconsulta deja de ser correlacionada: se calcula una vez y se repite. No hay error, solo un número equivocado.",
    is_published: true,
  },
  {
    slug: "sub-q10-correlacionada-vs-join",
    section,
    lesson: correlacionadas,
    type: "scenario",
    difficulty: "advanced",
    topic: "Correlacionada o join",
    tags: ["subquery", "inner_join", "performance"],
    estimated_seconds: 70,
    prompt_md:
      "Debes agregar a un listado de 4000 cuentas seis métricas calculadas sobre `transactions` (conteos por tipo, montos, fechas). ¿Qué conviene?",
    options: [
      {
        key: "a",
        body_md:
          "Un `LEFT JOIN` con `transactions` y `GROUP BY`, resolviendo las seis métricas con agregación condicional en una sola pasada.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Seis subconsultas correlacionadas en el `SELECT`.",
        is_correct: false,
        why_incorrect_md:
          "Cada subconsulta implica un recorrido adicional de la misma tabla; con seis métricas, el join agrupado es más claro y más barato.",
      },
      {
        key: "c",
        body_md: "Seis consultas separadas y unirlas después en la herramienta de reportes.",
        is_correct: false,
        why_incorrect_md:
          "Mueve el trabajo fuera de la base de datos y repite los mismos filtros en seis lugares, donde es fácil que terminen siendo distintos.",
      },
    ],
    explanation_md:
      "Una o dos métricas se leen mejor como subconsultas correlacionadas; a partir de ahí, el join con `GROUP BY` recorre la tabla una sola vez y mantiene los filtros en un solo lugar.",
    is_published: true,
  },
];
