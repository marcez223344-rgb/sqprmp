import type { QuestionDef } from "../schemas/question";

const section = "inner-join";
const basico = "inner-join-basico";
const varias = "inner-join-varias-tablas";

export const questions: QuestionDef[] = [
  {
    slug: "join-q01-on",
    section,
    lesson: basico,
    type: "single",
    difficulty: "easy",
    topic: "Condición de unión",
    tags: ["inner_join"],
    estimated_seconds: 40,
    prompt_md:
      "En `FROM products AS p INNER JOIN sellers AS s ...`, `p` es el alias de la tabla `products` y `s` el de `sellers`. ¿Cuál es la condición correcta para unir cada producto con su vendedor?",
    options: [
      { key: "a", body_md: "`ON s.id = p.seller_id`", is_correct: true },
      {
        key: "b",
        body_md: "`ON s.id = p.id`",
        is_correct: false,
        why_incorrect_md:
          "Une el producto 5 con el vendedor 5: ids que coinciden por casualidad, no por relación.",
      },
      {
        key: "c",
        body_md: "`ON s.seller_id = p.id`",
        is_correct: false,
        why_incorrect_md:
          "`sellers` no tiene columna `seller_id`; la clave foránea está en `products`.",
      },
    ],
    explanation_md:
      "La columna `seller_id` de la tabla `products` es una clave foránea, es decir, una columna que guarda el identificador de una fila de otra tabla: apunta a la columna `id` de la tabla `sellers`, su clave primaria. Por eso la condición iguala `s.id` con `p.seller_id`.",
    is_published: true,
  },
  {
    slug: "join-q02-ambiguo",
    section,
    lesson: basico,
    type: "error_diagnosis",
    difficulty: "easy",
    topic: "Columnas ambiguas",
    tags: ["inner_join", "alias"],
    estimated_seconds: 40,
    prompt_md: 'La consulta falla con `column reference "id" is ambiguous`. ¿Qué la corrige?',
    code_md:
      "```sql\nSELECT id, name, store_name\nFROM products AS p\nINNER JOIN sellers AS s ON s.id = p.seller_id;\n```",
    options: [
      { key: "a", body_md: "Calificar la columna: `p.id`.", is_correct: true },
      {
        key: "b",
        body_md: "Quitar los alias de las tablas.",
        is_correct: false,
        why_incorrect_md: "Sin alias la ambigüedad persiste: ambas tablas siguen teniendo `id`.",
      },
      {
        key: "c",
        body_md: "Cambiar `INNER JOIN` por `JOIN`.",
        is_correct: false,
        why_incorrect_md: "Son sinónimos; no afecta la resolución de nombres.",
      },
    ],
    explanation_md:
      "Cuando dos tablas comparten un nombre de columna, hay que indicar de cuál se trata: `p.id`.",
    is_published: true,
  },
  {
    slug: "join-q03-filas-inner",
    section,
    lesson: basico,
    type: "single",
    difficulty: "intermediate",
    topic: "Qué filas conserva",
    tags: ["inner_join"],
    estimated_seconds: 50,
    prompt_md:
      "Un vendedor recién registrado no tiene productos. En `products INNER JOIN sellers`, ese vendedor…",
    options: [
      {
        key: "a",
        body_md: "No aparece: no hay ninguna fila de `products` que lo referencie.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Aparece una vez con las columnas de producto en NULL.",
        is_correct: false,
        why_incorrect_md:
          "Eso lo hace un `LEFT JOIN` desde `sellers` (sección 18), no un INNER JOIN.",
      },
      {
        key: "c",
        body_md: "Provoca un error.",
        is_correct: false,
        why_incorrect_md: "No hay error; simplemente no hay coincidencias para esa fila.",
      },
    ],
    explanation_md:
      "INNER JOIN devuelve solo las combinaciones que cumplen el `ON`; las filas sin pareja se descartan.",
    is_published: true,
  },
  {
    slug: "join-q04-multiplicacion",
    section,
    lesson: basico,
    type: "query_interpretation",
    difficulty: "intermediate",
    topic: "Cardinalidad",
    tags: ["inner_join", "duplicates"],
    estimated_seconds: 60,
    prompt_md:
      "En TiendaViva, el pedido 63 tiene dos filas en `payments`: un pago rechazado y otro aprobado. ¿Cuántas filas devuelve esta consulta?",
    code_md:
      "```sql\nSELECT o.id, o.total_amount, pay.status\nFROM orders AS o\nINNER JOIN payments AS pay ON pay.order_id = o.id\nWHERE o.id = 63;\n```",
    options: [
      { key: "a", body_md: "2: una por cada pago.", is_correct: true },
      {
        key: "b",
        body_md: "1: el JOIN agrupa los pagos del pedido.",
        is_correct: false,
        why_incorrect_md:
          "JOIN no agrupa; produce una fila por cada combinación que cumple el `ON`.",
      },
      {
        key: "c",
        body_md: "0: los pedidos con pagos rechazados se excluyen.",
        is_correct: false,
        why_incorrect_md: "Nada en la consulta filtra por estado del pago.",
      },
    ],
    explanation_md:
      "Es una relación uno a muchos: un pedido puede tener varios pagos, así que la fila del pedido se repite una vez por cada pago. Si después sumaras `total_amount` sobre este resultado, el importe del pedido 63 entraría dos veces en la suma.",
    is_published: true,
  },
  {
    slug: "join-q05-where-tras-join",
    section,
    lesson: basico,
    type: "true_false",
    difficulty: "easy",
    topic: "JOIN y WHERE",
    tags: ["inner_join", "where"],
    estimated_seconds: 30,
    prompt_md:
      "Verdadero o falso: en `products JOIN sellers`, el `WHERE` puede filtrar por `sellers.country` aunque `country` no esté en el `SELECT`.",
    options: [
      { key: "a", body_md: "Verdadero", is_correct: true },
      {
        key: "b",
        body_md: "Falso",
        is_correct: false,
        why_incorrect_md:
          "`WHERE` opera sobre las filas unidas, con todas las columnas de ambas tablas disponibles.",
      },
    ],
    explanation_md:
      "Después del JOIN, todas las columnas de las tablas participantes están disponibles para filtrar.",
    is_published: true,
  },
  {
    slug: "join-q06-alias-tabla",
    section,
    lesson: basico,
    type: "fill_blank",
    difficulty: "very_easy",
    topic: "Sintaxis",
    tags: ["inner_join"],
    estimated_seconds: 30,
    prompt_md:
      "Completa la palabra clave que introduce la condición de unión: `INNER JOIN sellers AS s ___ s.id = p.seller_id`. Escribe solo la palabra clave.",
    answer: {
      accepted: ["ON", "ON s.id = p.seller_id", "ON p.seller_id = s.id"],
      case_sensitive: false,
    },
    explanation_md: "`ON` introduce la condición; sin ella la consulta no es válida.",
    is_published: true,
  },
  {
    slug: "join-q07-tres-tablas",
    section,
    lesson: varias,
    type: "single",
    difficulty: "intermediate",
    topic: "JOIN múltiple",
    tags: ["inner_join"],
    estimated_seconds: 55,
    prompt_md:
      "Quieres el nombre del cliente y el nombre del producto de cada reseña. ¿Qué tablas y cuántos JOIN necesitas?",
    options: [
      {
        key: "a",
        body_md: "`reviews` como base, un JOIN a `customers` y otro a `products` (2 JOIN).",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "`customers` JOIN `products` directamente (1 JOIN).",
        is_correct: false,
        why_incorrect_md:
          "No hay clave que relacione clientes con productos; la relación pasa por `reviews`.",
      },
      {
        key: "c",
        body_md: "`reviews` JOIN `orders` JOIN `products` (2 JOIN).",
        is_correct: false,
        why_incorrect_md:
          "`orders` no aporta el nombre del cliente ni es necesaria: `reviews` ya tiene `customer_id`.",
      },
    ],
    explanation_md:
      "Un JOIN por cada relación que atraviesas. `reviews` tiene ambas claves foráneas.",
    is_published: true,
  },
  {
    slug: "join-q08-self-alias",
    section,
    lesson: varias,
    type: "error_diagnosis",
    difficulty: "intermediate",
    topic: "Misma tabla dos veces",
    tags: ["inner_join", "self_join"],
    estimated_seconds: 60,
    prompt_md:
      'La consulta falla con `table name "categories" specified more than once`. ¿Cómo se corrige?',
    code_md:
      "```sql\nSELECT p.name, categories.name, categories.name\nFROM products AS p\nINNER JOIN categories ON categories.id = p.category_id\nINNER JOIN categories ON categories.id = categories.parent_id;\n```",
    options: [
      {
        key: "a",
        body_md:
          "Dar un alias distinto a cada aparición de `categories` (por ejemplo `sub` y `raiz`).",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Usar `LEFT JOIN` en la segunda unión.",
        is_correct: false,
        why_incorrect_md: "El tipo de JOIN no resuelve el conflicto de nombres.",
      },
      {
        key: "c",
        body_md: "Eliminar el segundo JOIN y usar `parent_id` directamente.",
        is_correct: false,
        why_incorrect_md:
          "`parent_id` es un número; para obtener el nombre del padre hace falta unir de nuevo.",
      },
    ],
    explanation_md:
      "Cada instancia de una tabla en la consulta necesita su propio alias para poder referenciarla.",
    is_published: true,
  },
  {
    slug: "join-q09-orden-joins",
    section,
    lesson: varias,
    type: "true_false",
    difficulty: "easy",
    topic: "JOIN múltiple",
    tags: ["inner_join"],
    estimated_seconds: 35,
    prompt_md:
      "Verdadero o falso: en una consulta que solo usa INNER JOIN, cambiar el orden en que se escriben las tablas cambia el conjunto de filas del resultado.",
    options: [
      {
        key: "a",
        body_md: "Verdadero",
        is_correct: false,
        why_incorrect_md:
          "INNER JOIN es conmutativo y asociativo: el orden afecta la legibilidad (y quizás el plan), no el resultado.",
      },
      { key: "b", body_md: "Falso", is_correct: true },
    ],
    explanation_md:
      "Para INNER JOIN el conjunto de filas es el mismo en cualquier orden. Con OUTER JOIN el orden sí importa.",
    is_published: true,
  },
  {
    slug: "join-q10-verificar",
    section,
    lesson: varias,
    type: "scenario",
    difficulty: "intermediate",
    topic: "Verificación",
    tags: ["inner_join", "duplicates"],
    estimated_seconds: 55,
    prompt_md:
      "En TiendaViva, uniste `products` con `reviews` (las reseñas) por `reviews.product_id = products.id` para un reporte de «un producto por fila» y obtuviste más filas que productos con reseña. ¿Cuál es la explicación más probable y qué haces?",
    options: [
      {
        key: "a",
        body_md:
          "Algunos productos tienen más de una reseña; lo verifico contando reseñas por producto antes de decidir cómo tratarlas (por ejemplo, promediarlas con `GROUP BY`).",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "El JOIN está mal escrito; cambio `INNER` por `LEFT`.",
        is_correct: false,
        why_incorrect_md:
          "`LEFT JOIN` agregaría los productos sin reseña; no reduce las filas repetidas de los productos con varias reseñas.",
      },
      {
        key: "c",
        body_md: "Agrego `DISTINCT` y sigo.",
        is_correct: false,
        why_incorrect_md:
          "Las reseñas de un mismo producto tienen datos distintos (autor, puntaje, fecha), así que `DISTINCT` no las junta; además oculta la causa.",
      },
    ],
    explanation_md:
      "Cuando un JOIN devuelve más filas de lo esperado, primero mide la cardinalidad de la relación; luego decide (filtrar, agregar o cambiar el nivel del reporte).",
    is_published: true,
  },
];
