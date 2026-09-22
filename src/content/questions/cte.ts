import type { QuestionDef } from "../schemas/question";

const section = "cte";
const l1 = "cte-with-pasos";
const l2 = "cte-vs-subconsulta-y-vista";
const l3 = "cte-recursiva-jerarquias";

export const questions: QuestionDef[] = [
  {
    slug: "cte-q01-que-es",
    section,
    lesson: l1,
    type: "single",
    difficulty: "easy",
    topic: "Qué es una CTE",
    tags: ["cte", "with"],
    estimated_seconds: 40,
    prompt_md: "¿Qué crea el bloque `WITH entregas AS (...)` al principio de una consulta?",
    code_md: null,
    options: [
      {
        key: "a",
        body_md:
          "Un resultado con nombre que existe solo mientras se ejecuta esa consulta y puede usarse en su `FROM`.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Una tabla nueva en la base de datos, que queda disponible para otras consultas.",
        is_correct: false,
        why_incorrect_md:
          "Eso sería `CREATE TABLE`. La CTE desaparece cuando termina la consulta y no se guarda.",
      },
      {
        key: "c",
        body_md: "Una copia en caché de la tabla original para acelerar las consultas siguientes.",
        is_correct: false,
        why_incorrect_md:
          "No hay caché entre consultas: cada ejecución vuelve a calcular la CTE desde cero.",
      },
      {
        key: "d",
        body_md: "Un índice temporal sobre las columnas que menciona.",
        is_correct: false,
        why_incorrect_md:
          "Una CTE es un conjunto de filas con nombre, no una estructura de acceso; los índices se crean con `CREATE INDEX`.",
      },
    ],
    explanation_md:
      "Una CTE le pone nombre a un paso intermedio dentro del alcance de una sola consulta. Al terminar, ese nombre deja de existir.",
    is_published: true,
  },
  {
    slug: "cte-q02-encadenar",
    section,
    lesson: l1,
    type: "true_false",
    difficulty: "easy",
    topic: "Referencias entre CTE",
    tags: ["cte", "with"],
    estimated_seconds: 35,
    prompt_md:
      "En `WITH a AS (...), b AS (...)`, la CTE `b` puede leer de `a`, pero `a` no puede leer de `b` (salvo en una CTE recursiva).",
    code_md: null,
    options: [
      { key: "a", body_md: "Verdadero", is_correct: true },
      {
        key: "b",
        body_md: "Falso",
        is_correct: false,
        why_incorrect_md:
          "Las CTE se resuelven en el orden en que están declaradas: una CTE solo puede referirse a las anteriores. Solo `WITH RECURSIVE` permite que una CTE se mencione a sí misma.",
      },
    ],
    explanation_md:
      "El orden de declaración define qué puede usar cada CTE. Por eso conviene escribirlas en el orden del razonamiento: del detalle al resumen.",
    is_published: true,
  },
  {
    slug: "cte-q03-palabra-clave",
    section,
    lesson: l1,
    type: "fill_blank",
    difficulty: "very_easy",
    topic: "Sintaxis de WITH",
    tags: ["cte", "sintaxis"],
    estimated_seconds: 25,
    prompt_md:
      "Completa la palabra clave que abre una expresión de tabla común: `____ entregas AS (SELECT id FROM orders WHERE status = 'delivered') SELECT count(*) FROM entregas;`. Escribe solo la palabra.",
    code_md: null,
    answer: { accepted: ["WITH", "with"], case_sensitive: false },
    explanation_md:
      "`WITH` abre una o más CTE separadas por comas; el `SELECT` principal viene después, sin punto y coma intermedio.",
    is_published: true,
  },
  {
    slug: "cte-q04-interpretar-encadenada",
    section,
    lesson: l1,
    type: "query_interpretation",
    difficulty: "intermediate",
    topic: "CTE encadenadas",
    tags: ["cte", "group_by", "aggregate"],
    estimated_seconds: 70,
    prompt_md: "¿Qué devuelve esta consulta sobre TiendaViva?",
    code_md:
      "```sql\nWITH entregas AS (\n  SELECT customer_id, total_amount\n  FROM orders\n  WHERE status = 'delivered'\n),\npor_cliente AS (\n  SELECT customer_id, count(*) AS pedidos, sum(total_amount) AS gasto\n  FROM entregas\n  GROUP BY customer_id\n)\nSELECT count(*) AS clientes\nFROM por_cliente\nWHERE pedidos >= 3;\n```",
    options: [
      {
        key: "a",
        body_md: "Cuántos clientes tienen 3 o más pedidos entregados.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Cuántos pedidos entregados hay en total.",
        is_correct: false,
        why_incorrect_md:
          "El `count(*)` final cuenta filas de `por_cliente`, y esa CTE ya tiene una fila por cliente, no una por pedido.",
      },
      {
        key: "c",
        body_md: "Cuántos clientes gastaron al menos 3 unidades de moneda.",
        is_correct: false,
        why_incorrect_md: "El filtro usa `pedidos`, que es un conteo, no `gasto`.",
      },
      {
        key: "d",
        body_md: "Cuántos clientes hay en la tabla `customers`.",
        is_correct: false,
        why_incorrect_md:
          "La consulta nunca lee `customers`: solo ve clientes con al menos un pedido entregado.",
      },
    ],
    explanation_md:
      "La primera CTE filtra, la segunda resume por cliente y el `SELECT` final cuenta cuántos clientes cumplen la condición. Cada paso tiene un nombre que explica qué hace.",
    is_published: true,
  },
  {
    slug: "cte-q05-error-coma",
    section,
    lesson: l1,
    type: "error_diagnosis",
    difficulty: "intermediate",
    topic: "Errores de sintaxis con WITH",
    tags: ["cte", "sintaxis"],
    estimated_seconds: 60,
    prompt_md: "Esta consulta falla con un error de sintaxis. ¿Cuál es la causa?",
    code_md:
      "```sql\nWITH entregas AS (\n  SELECT id, customer_id FROM orders WHERE status = 'delivered'\n);\nSELECT count(*) FROM entregas;\n```",
    options: [
      {
        key: "a",
        body_md:
          "El punto y coma después de la CTE corta la instrucción: el `SELECT` final debe ser parte de la misma consulta.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Falta la palabra `RECURSIVE` después de `WITH`.",
        is_correct: false,
        why_incorrect_md:
          "`RECURSIVE` solo hace falta cuando la CTE se refiere a sí misma; aquí no es el caso.",
      },
      {
        key: "c",
        body_md: "Una CTE no puede llamarse igual que un alias de tabla.",
        is_correct: false,
        why_incorrect_md:
          "No hay conflicto de nombres: `entregas` no coincide con ninguna tabla de TiendaViva.",
      },
      {
        key: "d",
        body_md: "Falta un `GROUP BY` en el `SELECT` final.",
        is_correct: false,
        why_incorrect_md:
          "`SELECT count(*)` sin más columnas no necesita `GROUP BY`; además, el error es anterior a esa fase.",
      },
    ],
    explanation_md:
      "`WITH ... AS (...)` y el `SELECT` que lo usa forman una sola instrucción. El punto y coma va únicamente al final de todo.",
    is_published: true,
  },
  {
    slug: "cte-q06-cuando-usar",
    section,
    lesson: l2,
    type: "scenario",
    difficulty: "intermediate",
    topic: "CTE, subconsulta o vista",
    tags: ["cte", "subquery", "vista"],
    estimated_seconds: 65,
    prompt_md:
      "El equipo de Operaciones consulta todos los días «restaurantes activos con calificación conocida» en cinco reportes distintos y quiere que la definición sea la misma para todos. ¿Qué conviene?",
    code_md: null,
    options: [
      {
        key: "a",
        body_md: "Crear una vista con esa definición y que los cinco reportes la consulten.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Copiar la misma CTE al inicio de los cinco reportes.",
        is_correct: false,
        why_incorrect_md:
          "Funciona, pero cuando cambie la definición hay que editar cinco consultas; el riesgo es que queden distintas entre sí.",
      },
      {
        key: "c",
        body_md: "Usar una subconsulta anidada en cada reporte.",
        is_correct: false,
        why_incorrect_md: "Mismo problema de duplicación, con menos legibilidad que la CTE.",
      },
      {
        key: "d",
        body_md: "Crear una CTE en un reporte y referenciarla desde los otros cuatro.",
        is_correct: false,
        why_incorrect_md:
          "No es posible: una CTE solo existe dentro de la consulta donde se declara.",
      },
    ],
    explanation_md:
      "La CTE ordena una consulta; la vista comparte una definición entre consultas y personas. Cuando la misma lógica se repite en varios reportes, la vista evita que se desincronicen.",
    is_published: true,
  },
  {
    slug: "cte-q07-materializacion",
    section,
    lesson: l2,
    type: "multiple",
    difficulty: "advanced",
    topic: "Materialización en PostgreSQL",
    tags: ["cte", "performance"],
    estimated_seconds: 90,
    prompt_md:
      "Sobre el rendimiento de las CTE en PostgreSQL 17, ¿cuáles afirmaciones son correctas? (Varias opciones.)",
    code_md: null,
    options: [
      {
        key: "a",
        body_md:
          "El planificador puede integrar («inline») una CTE no recursiva usada una sola vez, como si fuera una subconsulta.",
        is_correct: true,
      },
      {
        key: "b",
        body_md:
          "`WITH x AS MATERIALIZED (...)` fuerza a calcular la CTE una vez y guardar su resultado.",
        is_correct: true,
      },
      {
        key: "c",
        body_md:
          "Una CTE recursiva siempre se materializa: no puede integrarse en la consulta principal.",
        is_correct: true,
      },
      {
        key: "d",
        body_md:
          "Reescribir una CTE como subconsulta siempre mejora el rendimiento en versiones modernas.",
        is_correct: false,
        why_incorrect_md:
          "Desde PostgreSQL 12 ambas formas suelen producir el mismo plan. «Siempre» es falso: en una CTE cara usada dos veces, materializar puede ser más rápido.",
      },
      {
        key: "e",
        body_md: "El resultado de una CTE se conserva para las consultas siguientes de la sesión.",
        is_correct: false,
        why_incorrect_md:
          "El resultado vive solo durante la ejecución de esa consulta; no hay reutilización entre consultas.",
      },
    ],
    explanation_md:
      "Hasta PostgreSQL 11 toda CTE era una barrera de optimización; desde la 12 el planificador decide, y `MATERIALIZED` / `NOT MATERIALIZED` te dejan forzar el comportamiento. La recursiva es la excepción: siempre se materializa.",
    is_published: true,
  },
  {
    slug: "cte-q08-partes-recursiva",
    section,
    lesson: l3,
    type: "matching",
    difficulty: "intermediate",
    topic: "Anatomía de una CTE recursiva",
    tags: ["cte", "recursiva"],
    estimated_seconds: 75,
    prompt_md: "Relaciona cada parte de una CTE recursiva con su función.",
    code_md: null,
    pairs: [
      {
        left: "SELECT ... FROM categories WHERE parent_id IS NULL",
        right: "Caso base: las filas con las que arranca el recorrido",
      },
      {
        left: "UNION ALL",
        right: "Separa el caso base del paso recursivo y acumula las filas de cada vuelta",
      },
      {
        left: "INNER JOIN arbol AS a ON a.id = c.parent_id",
        right: "Paso recursivo: busca los hijos de las filas ya encontradas",
      },
      {
        left: "WHERE a.nivel < 10",
        right: "Cota de profundidad que protege de una recursión sin fin",
      },
    ],
    explanation_md:
      "Toda CTE recursiva combina estas piezas: de dónde parte, cómo avanza y qué la detiene. Sin la última, un ciclo en los datos deja la consulta corriendo hasta el tiempo límite.",
    is_published: true,
  },
  {
    slug: "cte-q09-terminacion",
    section,
    lesson: l3,
    type: "single",
    difficulty: "advanced",
    topic: "Terminación de la recursión",
    tags: ["cte", "recursiva"],
    estimated_seconds: 55,
    prompt_md: "¿Cuándo deja de iterar una CTE recursiva?",
    code_md: null,
    options: [
      {
        key: "a",
        body_md: "Cuando una vuelta del paso recursivo no devuelve ninguna fila nueva.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Cuando alcanza el número de filas indicado en el `LIMIT` del `SELECT` final.",
        is_correct: false,
        why_incorrect_md:
          "El `LIMIT` externo recorta el resultado, pero no es una garantía de terminación de la recursión en el caso general.",
      },
      {
        key: "c",
        body_md: "Después de 100 iteraciones, que es el máximo que impone PostgreSQL.",
        is_correct: false,
        why_incorrect_md:
          "PostgreSQL no impone un máximo de iteraciones: una recursión con ciclos corre hasta agotar tiempo o memoria.",
      },
      {
        key: "d",
        body_md: "Cuando el caso base se queda sin filas.",
        is_correct: false,
        why_incorrect_md:
          "El caso base se evalúa una sola vez, al principio; lo que se repite es el paso recursivo.",
      },
    ],
    explanation_md:
      "La recursión termina sola cuando ya no encuentra filas nuevas. Si los datos tienen ciclos, eso no ocurre nunca: por eso se agrega una cota de nivel o se registra el camino visitado.",
    is_published: true,
  },
  {
    slug: "cte-q10-recursiva-sin-base",
    section,
    lesson: l3,
    type: "error_diagnosis",
    difficulty: "advanced",
    topic: "Recursión sin control",
    tags: ["cte", "recursiva", "performance"],
    estimated_seconds: 70,
    prompt_md:
      "Esta consulta nunca termina (en la plataforma corta por tiempo agotado). ¿Qué le falta?",
    code_md:
      "```sql\nWITH RECURSIVE dias(dia) AS (\n  SELECT DATE '2025-09-01'\n  UNION ALL\n  SELECT dia + 1 FROM dias\n)\nSELECT dia FROM dias;\n```",
    options: [
      {
        key: "a",
        body_md:
          "Una condición en el paso recursivo que deje de generar filas, por ejemplo `WHERE dia < DATE '2025-09-30'`.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Cambiar `UNION ALL` por `UNION`.",
        is_correct: false,
        why_incorrect_md:
          "`UNION` elimina duplicados, pero cada vuelta genera un día distinto: las filas nunca se repiten y la recursión sigue igual.",
      },
      {
        key: "c",
        body_md: "Agregar la palabra `RECURSIVE` en el paso recursivo.",
        is_correct: false,
        why_incorrect_md:
          "`RECURSIVE` se escribe una sola vez, junto a `WITH`, y ya está presente.",
      },
      {
        key: "d",
        body_md: "Un `ORDER BY dia` dentro de la CTE.",
        is_correct: false,
        why_incorrect_md:
          "Ordenar no limita cuántas filas se generan; el problema es que el paso recursivo nunca deja de producirlas.",
      },
    ],
    explanation_md:
      "En una CTE recursiva, la condición de terminación es parte del diseño, no un detalle opcional. Si el paso recursivo siempre puede producir una fila más, la consulta no termina.",
    is_published: true,
  },
];
