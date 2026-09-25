import type { QuestionDef } from "../schemas/question";

const section = "left-right-full-join";
const left = "left-join-basico";
const full = "right-full-join-y-cardinalidad";

export const questions: QuestionDef[] = [
  {
    slug: "oj-q01-filas-left",
    section,
    lesson: left,
    type: "single",
    difficulty: "easy",
    topic: "Qué conserva LEFT JOIN",
    tags: ["outer_join"],
    estimated_seconds: 40,
    prompt_md: "En `customers LEFT JOIN orders`, un cliente sin pedidos…",
    options: [
      {
        key: "a",
        body_md: "Aparece una vez, con las columnas de `orders` en NULL.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "No aparece.",
        is_correct: false,
        why_incorrect_md: "Eso es INNER JOIN. LEFT conserva todas las filas de la izquierda.",
      },
      {
        key: "c",
        body_md: "Aparece con las columnas de `orders` en 0.",
        is_correct: false,
        why_incorrect_md: "La ausencia se representa con NULL, nunca con 0.",
      },
    ],
    explanation_md: "LEFT JOIN garantiza al menos una fila por cada fila de la tabla izquierda.",
    is_published: true,
  },
  {
    slug: "oj-q02-is-null",
    section,
    lesson: left,
    type: "fill_blank",
    difficulty: "easy",
    topic: "Patrón sin correspondencia",
    tags: ["outer_join", "null_handling"],
    estimated_seconds: 35,
    prompt_md:
      "Completa las dos palabras clave que faltan para obtener los clientes sin pedidos: `... LEFT JOIN orders o ON o.customer_id = c.id WHERE o.id ___ ___;`",
    answer: {
      accepted: ["IS NULL", "o.id IS NULL", "WHERE o.id IS NULL"],
      case_sensitive: false,
    },
    explanation_md:
      "Las filas sin pareja tienen NULL en las columnas de la tabla derecha; `IS NULL` sobre su clave primaria las identifica.",
    is_published: true,
  },
  {
    slug: "oj-q03-count-cero",
    section,
    lesson: left,
    type: "single",
    difficulty: "intermediate",
    topic: "Contar con ceros",
    tags: ["outer_join", "aggregate"],
    estimated_seconds: 50,
    prompt_md:
      "Con `promotions p LEFT JOIN orders o ON o.promotion_id = p.id GROUP BY p.code`, ¿qué devuelve `count(*)` para una promoción sin uso?",
    options: [
      { key: "a", body_md: "1, porque cuenta la fila con NULL.", is_correct: true },
      {
        key: "b",
        body_md: "0.",
        is_correct: false,
        why_incorrect_md:
          "Para obtener 0 hay que contar una columna de la tabla derecha: `count(o.id)`.",
      },
      {
        key: "c",
        body_md: "NULL.",
        is_correct: false,
        why_incorrect_md: "`count` nunca devuelve NULL.",
      },
    ],
    explanation_md:
      "`count(*)` cuenta filas; `count(o.id)` cuenta pedidos reales y da 0 cuando solo hay la fila de relleno.",
    is_published: true,
  },
  {
    slug: "oj-q04-where-convierte",
    section,
    lesson: left,
    type: "error_diagnosis",
    difficulty: "intermediate",
    topic: "WHERE vs ON",
    tags: ["outer_join", "where"],
    estimated_seconds: 60,
    prompt_md:
      "En Pídelo, este reporte debía listar los 25 restaurantes de Montevideo (la ciudad con `city_id = 8`) con su cantidad de pedidos de agosto de 2025, y 0 para los que no tuvieron pedidos, pero devuelve 22 filas. ¿Por qué?",
    code_md:
      "```sql\nSELECT r.id, count(o.id) AS pedidos\nFROM restaurants AS r\nLEFT JOIN orders AS o ON o.restaurant_id = r.id\nWHERE r.city_id = 8\n  AND o.placed_at >= '2025-08-01' AND o.placed_at < '2025-09-01'\nGROUP BY r.id;\n```",
    options: [
      {
        key: "a",
        body_md:
          "La condición sobre `o.placed_at` en `WHERE` elimina las filas con NULL: el LEFT JOIN se comporta como INNER.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "`count(o.id)` debería ser `count(*)`.",
        is_correct: false,
        why_incorrect_md:
          "Eso cambiaría los ceros por unos, pero no recuperaría los restaurantes perdidos.",
      },
      {
        key: "c",
        body_md: "`r.city_id = 8` también debería ir en el `ON`.",
        is_correct: false,
        why_incorrect_md:
          "Las condiciones sobre la tabla izquierda pueden ir en `WHERE` sin problema.",
      },
    ],
    explanation_md:
      "Mueve las condiciones sobre `orders` al `ON`: `LEFT JOIN orders o ON o.restaurant_id = r.id AND o.placed_at >= ... AND o.placed_at < ...`.",
    is_published: true,
  },
  {
    slug: "oj-q05-right",
    section,
    lesson: full,
    type: "true_false",
    difficulty: "easy",
    topic: "RIGHT JOIN",
    tags: ["outer_join"],
    estimated_seconds: 30,
    prompt_md:
      "Verdadero o falso: `A RIGHT JOIN B` devuelve el mismo conjunto de filas que `B LEFT JOIN A`.",
    options: [
      { key: "a", body_md: "Verdadero", is_correct: true },
      {
        key: "b",
        body_md: "Falso",
        is_correct: false,
        why_incorrect_md: "Son equivalentes; solo cambia qué tabla se escribe primero.",
      },
    ],
    explanation_md:
      "Por eso casi siempre se escribe LEFT JOIN: se lee de izquierda a derecha «todo esto, más lo que coincida de aquello».",
    is_published: true,
  },
  {
    slug: "oj-q06-full",
    section,
    lesson: full,
    type: "scenario",
    difficulty: "intermediate",
    topic: "FULL JOIN",
    tags: ["outer_join"],
    estimated_seconds: 50,
    prompt_md:
      "Tienes dos tablas cargadas desde sistemas distintos, `cuentas` (alias `c`) y `movimientos` (alias `m`), sin una clave foránea que obligue a que cada movimiento apunte a una cuenta existente. El departamento de Auditoría quiere, en una sola consulta, las cuentas sin movimientos **y** los movimientos cuya cuenta no existe. ¿Qué JOIN usas?",
    options: [
      {
        key: "a",
        body_md:
          "`cuentas c FULL JOIN movimientos m ON m.cuenta_id = c.id` y `WHERE c.id IS NULL OR m.id IS NULL`.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "`LEFT JOIN` desde `cuentas`.",
        is_correct: false,
        why_incorrect_md:
          "Solo encontraría las cuentas sin movimientos. Los movimientos cuya cuenta no existe están en la tabla derecha y el LEFT JOIN los descarta.",
      },
      {
        key: "c",
        body_md: "`INNER JOIN` con `DISTINCT`.",
        is_correct: false,
        why_incorrect_md: "INNER JOIN descarta ambos tipos de filas sin pareja.",
      },
    ],
    explanation_md:
      "FULL JOIN conserva las filas sin pareja de los dos lados; el filtro `IS NULL` de cada lado las aísla.",
    is_published: true,
  },
  {
    slug: "oj-q07-cardinalidad",
    section,
    lesson: full,
    type: "single",
    difficulty: "intermediate",
    topic: "Cardinalidad",
    tags: ["outer_join", "duplicates"],
    estimated_seconds: 50,
    prompt_md:
      "`users LEFT JOIN cards` para una persona con 2 tarjetas y otra sin tarjetas devuelve…",
    options: [
      {
        key: "a",
        body_md: "3 filas: dos para la primera persona y una (con NULL) para la segunda.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "2 filas: una por persona.",
        is_correct: false,
        why_incorrect_md: "El JOIN no agrupa: cada tarjeta produce una fila.",
      },
      {
        key: "c",
        body_md: "1 fila: solo la persona con tarjetas.",
        is_correct: false,
        why_incorrect_md: "LEFT JOIN conserva a la persona sin tarjetas.",
      },
    ],
    explanation_md:
      "Uno-a-muchos multiplica filas también en LEFT JOIN. Para contar personas usa `count(DISTINCT u.id)`.",
    is_published: true,
  },
  {
    slug: "oj-q08-verificar",
    section,
    lesson: full,
    type: "true_false",
    difficulty: "easy",
    topic: "Verificación",
    tags: ["outer_join"],
    estimated_seconds: 35,
    prompt_md:
      "Verdadero o falso: una consulta `FROM A LEFT JOIN B ON ...` sin `WHERE` devuelve siempre al menos tantas filas como tiene la tabla `A`.",
    options: [
      { key: "a", body_md: "Verdadero", is_correct: true },
      {
        key: "b",
        body_md: "Falso",
        is_correct: false,
        why_incorrect_md:
          "Es verdadero: cada fila de `A` aparece al menos una vez, con pareja o con las columnas de `B` en NULL. Si al agregar un `WHERE` con una condición sobre `B` obtienes menos filas que `A`, ese filtro convirtió el LEFT JOIN en un INNER JOIN.",
      },
    ],
    explanation_md:
      "Comparar el número de filas con el de la tabla izquierda es la verificación más rápida de un LEFT JOIN.",
    is_published: true,
  },
  {
    slug: "oj-q09-interpretar",
    section,
    lesson: left,
    type: "query_interpretation",
    difficulty: "intermediate",
    topic: "Lectura de consultas",
    tags: ["outer_join", "null_handling"],
    estimated_seconds: 55,
    prompt_md: "¿Qué devuelve esta consulta?",
    code_md:
      "```sql\nSELECT o.id\nFROM orders AS o\nLEFT JOIN ratings AS r ON r.order_id = o.id\nWHERE o.status = 'delivered'\n  AND r.id IS NULL;\n```",
    options: [
      {
        key: "a",
        body_md: "Pedidos entregados que no tienen ninguna calificación.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Calificaciones sin pedido.",
        is_correct: false,
        why_incorrect_md:
          "La tabla izquierda es `orders`; se buscan pedidos sin pareja en `ratings`.",
      },
      {
        key: "c",
        body_md: "Pedidos entregados con calificación NULL en ambos puntajes.",
        is_correct: false,
        why_incorrect_md:
          "`r.id IS NULL` indica que no existe fila de `ratings`, no que sus puntajes sean NULL.",
      },
    ],
    explanation_md:
      "Es el patrón LEFT JOIN + `IS NULL` sobre la clave primaria de la derecha: «entregados sin calificar».",
    is_published: true,
  },
  {
    slug: "oj-q10-elegir",
    section,
    lesson: full,
    type: "matching",
    difficulty: "intermediate",
    topic: "Elegir el JOIN",
    tags: ["outer_join", "inner_join"],
    estimated_seconds: 60,
    prompt_md: "Relaciona cada pregunta de negocio con el JOIN adecuado.",
    pairs: [
      { left: "Pedidos con su restaurante (solo los que coinciden)", right: "INNER JOIN" },
      { left: "Todos los restaurantes, con pedidos si los hay", right: "LEFT JOIN" },
      { left: "Todo lo de ambas tablas, coincida o no", right: "FULL JOIN" },
      { left: "Restaurantes sin ningún pedido", right: "LEFT JOIN + IS NULL" },
    ],
    explanation_md:
      "El JOIN se elige por la pregunta: qué filas deben sobrevivir aunque no tengan pareja.",
    is_published: true,
  },
];
