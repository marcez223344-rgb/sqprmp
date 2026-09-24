import type { QuestionDef } from "../schemas/question";

const section = "alias-y-expresiones";
const lesson = "alias-y-expresiones-basico";

export const questions: QuestionDef[] = [
  {
    slug: "alias-q01-nombre-columna",
    section,
    lesson,
    type: "single",
    difficulty: "very_easy",
    topic: "Alias de columna",
    tags: ["alias"],
    estimated_seconds: 30,
    prompt_md: "¿Cómo se llama la segunda columna del resultado?",
    code_md: "```sql\nSELECT id, subtotal - discount AS neto\nFROM orders;\n```",
    options: [
      { key: "a", body_md: "`neto`", is_correct: true },
      {
        key: "b",
        body_md: "`subtotal - discount`",
        is_correct: false,
        why_incorrect_md: "El alias reemplaza la expresión como nombre de la columna.",
      },
      {
        key: "c",
        body_md: "`?column?`",
        is_correct: false,
        why_incorrect_md: "Ese es el nombre que aparece cuando **no** hay alias.",
      },
    ],
    explanation_md:
      "`AS` asigna el nombre con el que la columna aparece en el resultado. Sin alias, PostgreSQL muestra `?column?` para expresiones.",
    is_published: true,
  },
  {
    slug: "alias-q02-division-entera",
    section,
    lesson,
    type: "single",
    difficulty: "easy",
    topic: "Aritmética",
    tags: ["alias", "aritmetica"],
    estimated_seconds: 40,
    prompt_md: "¿Qué devuelve `SELECT 7 / 2;` en PostgreSQL?",
    options: [
      { key: "a", body_md: "`3`", is_correct: true },
      {
        key: "b",
        body_md: "`3.5`",
        is_correct: false,
        why_incorrect_md:
          "Ambos operandos son enteros, así que la división es entera. Para `3.5` escribe `7 / 2.0`.",
      },
      {
        key: "c",
        body_md: "Un error de tipos.",
        is_correct: false,
        why_incorrect_md: "Dividir enteros es válido; simplemente descarta la parte decimal.",
      },
    ],
    explanation_md:
      "La división entre dos enteros descarta decimales. Convierte uno de los operandos (`7 / 2.0` o `7::numeric / 2`) cuando necesites el resultado exacto.",
    is_published: true,
  },
  {
    slug: "alias-q03-alias-en-where",
    section,
    lesson,
    type: "error_diagnosis",
    difficulty: "easy",
    topic: "Orden de evaluación",
    tags: ["alias", "where"],
    estimated_seconds: 45,
    prompt_md: 'Esta consulta falla con `column "neto" does not exist`. ¿Por qué?',
    code_md:
      "```sql\nSELECT id, subtotal - discount AS neto\nFROM orders\nWHERE neto > 100000;\n```",
    options: [
      {
        key: "a",
        body_md:
          "El `WHERE` se evalúa antes que la lista del `SELECT`, así que el alias todavía no existe.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Falta poner el alias entre comillas dobles.",
        is_correct: false,
        why_incorrect_md:
          "Las comillas no cambian el orden de evaluación; el alias seguiría sin existir en `WHERE`.",
      },
      {
        key: "c",
        body_md: "`neto` es una palabra reservada.",
        is_correct: false,
        why_incorrect_md: "No lo es; el problema es dónde se usa el alias.",
      },
    ],
    explanation_md:
      "En `WHERE` repite la expresión: `WHERE subtotal - discount > 100000`. Los alias sí se pueden usar en `ORDER BY`.",
    is_published: true,
  },
  {
    slug: "alias-q04-concatenar",
    section,
    lesson,
    type: "fill_blank",
    difficulty: "easy",
    topic: "Texto",
    tags: ["alias", "texto"],
    estimated_seconds: 30,
    prompt_md:
      "Completa el operador que une textos en PostgreSQL: `SELECT 'CAT-' ___ id AS codigo FROM categories;`",
    answer: { accepted: ["||"], case_sensitive: false },
    explanation_md:
      "`||` concatena. `+` no funciona con textos en PostgreSQL: concatena en SQL Server, no acá.\n\n`||` es el operador de concatenación del estándar ISO SQL y se comporta igual en PostgreSQL, Oracle, SQLite y DB2. MySQL lee `||` como el OR lógico salvo que tenga activado el modo `PIPES_AS_CONCAT`, así que allí se usa `CONCAT()`. `CONCAT()` también corre en PostgreSQL y es la opción portable; la diferencia práctica es que `'A' || NULL` es NULL y `CONCAT('A', NULL)` es `'A'`.",
    is_published: true,
  },
  {
    slug: "alias-q05-precedencia",
    section,
    lesson,
    type: "query_interpretation",
    difficulty: "intermediate",
    topic: "Precedencia",
    tags: ["alias", "aritmetica"],
    estimated_seconds: 50,
    prompt_md:
      "Con `subtotal = 100`, `discount = 20` y una tasa de 0.21, ¿qué valor devuelve `impuesto`?",
    code_md: "```sql\nSELECT subtotal - discount * 0.21 AS impuesto\nFROM orders;\n```",
    options: [
      { key: "a", body_md: "`95.80`", is_correct: true },
      {
        key: "b",
        body_md: "`16.80`",
        is_correct: false,
        why_incorrect_md:
          "Eso sería `(subtotal - discount) * 0.21`. Sin paréntesis, la multiplicación se resuelve primero.",
      },
      {
        key: "c",
        body_md: "`80`",
        is_correct: false,
        why_incorrect_md:
          "Ignora la multiplicación; la expresión sí multiplica `discount` por 0.21.",
      },
    ],
    explanation_md:
      "`*` tiene prioridad sobre `-`: `100 - (20 * 0.21) = 95.80`. Si querías el impuesto sobre el neto, escribe `(subtotal - discount) * 0.21`.",
    is_published: true,
  },
  {
    slug: "alias-q06-round",
    section,
    lesson,
    type: "single",
    difficulty: "easy",
    topic: "Redondeo",
    tags: ["alias", "numeric_functions"],
    estimated_seconds: 30,
    prompt_md: "¿Qué devuelve `SELECT ROUND(2.4567, 2);`?",
    options: [
      { key: "a", body_md: "`2.46`", is_correct: true },
      {
        key: "b",
        body_md: "`2.45`",
        is_correct: false,
        why_incorrect_md: "El tercer decimal es 6, así que se redondea hacia arriba.",
      },
      {
        key: "c",
        body_md: "`2`",
        is_correct: false,
        why_incorrect_md: "El segundo argumento indica cuántos decimales conservar.",
      },
    ],
    explanation_md: "`ROUND(valor, n)` conserva `n` decimales redondeando al más cercano.",
    is_published: true,
  },
  {
    slug: "alias-q07-comillas-simples",
    section,
    lesson,
    type: "true_false",
    difficulty: "easy",
    topic: "Alias de columna",
    tags: ["alias", "sintaxis"],
    estimated_seconds: 25,
    prompt_md:
      "Verdadero o falso: `SELECT subtotal AS 'monto' FROM orders;` crea una columna llamada `monto`.",
    options: [
      {
        key: "a",
        body_md: "Verdadero",
        is_correct: false,
        why_incorrect_md:
          "Las comillas simples delimitan textos, no identificadores. PostgreSQL devuelve un error de sintaxis.",
      },
      { key: "b", body_md: "Falso", is_correct: true },
    ],
    explanation_md:
      "Los alias son identificadores: sin comillas (`AS monto`) o con comillas dobles si necesitas mayúsculas o espacios.",
    is_published: true,
  },
  {
    slug: "alias-q08-escenario-reporte",
    section,
    lesson,
    type: "scenario",
    difficulty: "intermediate",
    topic: "Alias legibles",
    tags: ["alias", "readability"],
    estimated_seconds: 50,
    prompt_md:
      "Finanzas te pide un reporte con el neto de cada pedido para pegarlo en una planilla que luego consumirá otra consulta. ¿Qué alias conviene?",
    options: [
      { key: "a", body_md: "`AS neto_pedido`", is_correct: true },
      {
        key: "b",
        body_md: '`AS "Neto del pedido"`',
        is_correct: false,
        why_incorrect_md:
          "Funciona, pero obliga a usar comillas dobles en cada consulta posterior y suele romper herramientas.",
      },
      {
        key: "c",
        body_md: "Sin alias; la planilla ya tiene encabezados.",
        is_correct: false,
        why_incorrect_md:
          "La columna se llamaría `?column?` y la consulta posterior no podría referenciarla con claridad.",
      },
    ],
    explanation_md:
      "Un alias en `snake_case`, sin espacios ni acentos, es legible para personas y estable para las consultas que reutilizan el resultado.",
    is_published: true,
  },
  {
    slug: "alias-q09-alias-de-tabla-reemplaza",
    section,
    lesson,
    type: "error_diagnosis",
    difficulty: "intermediate",
    topic: "Alias de tabla",
    tags: ["alias", "sintaxis"],
    estimated_seconds: 50,
    prompt_md:
      'Esta consulta falla con `invalid reference to FROM-clause entry for table "orders"`. ¿Por qué, si la tabla `orders` está en el `FROM`?',
    code_md:
      "```sql\nSELECT o.id, o.total_amount\nFROM orders AS o\nWHERE orders.status = 'paid';\n```",
    options: [
      {
        key: "a",
        body_md:
          "Al ponerle alias a una tabla, el alias pasa a ser su único nombre en el resto de la consulta: hay que escribir `o.status`.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "El alias de tabla no se puede usar en el `WHERE`, solo en el `SELECT`.",
        is_correct: false,
        why_incorrect_md:
          "Al revés de lo que pasa con los alias de columna: el alias de tabla se puede usar en todas las cláusulas, incluido el `WHERE`. Lo que ya no se puede usar es el nombre original.",
      },
      {
        key: "c",
        body_md: "Falta repetir la tabla en el `FROM`: `FROM orders AS o, orders`.",
        is_correct: false,
        why_incorrect_md:
          "Eso nombraría la tabla dos veces y produciría todas las combinaciones de sus filas consigo misma. El error no se arregla agregando tablas, sino usando el nombre correcto.",
      },
      {
        key: "d",
        body_md: 'El alias necesita comillas dobles: `AS "o"`.',
        is_correct: false,
        why_incorrect_md:
          "Las comillas dobles solo hacen falta si el identificador tiene espacios o mayúsculas que quieras conservar. No cambian nada de este error.",
      },
    ],
    explanation_md:
      "Un alias de tabla no es un apodo adicional: reemplaza el nombre dentro de esa consulta. Es una regla útil, porque obliga a que todas las referencias queden escritas igual y, en una consulta con varias tablas, deja a la vista de dónde sale cada columna.",
    is_published: true,
  },
  {
    slug: "alias-q10-coma-faltante",
    section,
    lesson,
    type: "query_interpretation",
    difficulty: "intermediate",
    topic: "AS opcional y la coma olvidada",
    tags: ["alias", "sintaxis", "revision"],
    estimated_seconds: 55,
    prompt_md:
      "Se querían tres columnas: `id`, `subtotal` y `discount`. La consulta corre sin error y devuelve dos. ¿Qué pasó?",
    code_md: "```sql\nSELECT id, subtotal discount\nFROM orders;\n```",
    options: [
      {
        key: "a",
        body_md:
          "Falta la coma, y como `AS` es opcional, PostgreSQL leyó `discount` como el alias de `subtotal`: la segunda columna trae los subtotales con el nombre `discount`.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "PostgreSQL restó las dos columnas y devolvió el neto.",
        is_correct: false,
        why_incorrect_md:
          "No hay ningún operador entre las dos palabras; nada indica una resta. Dos identificadores seguidos se leen como columna y alias.",
      },
      {
        key: "c",
        body_md: "La columna `discount` se perdió porque tiene valores repetidos.",
        is_correct: false,
        why_incorrect_md:
          "El contenido de una columna nunca hace que desaparezca del resultado. Las columnas que devuelve una consulta salen solo de lo que está escrito en el `SELECT`.",
      },
      {
        key: "d",
        body_md: "La consulta devolvió tres columnas y la interfaz muestra dos.",
        is_correct: false,
        why_incorrect_md:
          "El resultado tiene dos columnas. Conviene comprobarlo mirando los encabezados: hay una llamada `discount` cuyos valores son los de `subtotal`.",
      },
    ],
    explanation_md:
      "Como `AS` es opcional, una coma olvidada no produce un error de sintaxis: convierte la columna siguiente en un alias. Es uno de los pocos errores de escritura que sobreviven a la ejecución, y encima deja un nombre de columna que parece correcto. Al revisar un resultado, cuenta las columnas antes de mirar los valores.",
    is_published: true,
  },
];
