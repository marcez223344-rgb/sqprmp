import type { QuestionDef } from "../schemas/question";

const section = "joins-multiples-tablas";
const camino = "planificar-el-camino-de-joins";
const mezcla = "mezclar-inner-y-left";
const duplicacion = "duplicacion-de-filas-en-cadenas";

export const questions: QuestionDef[] = [
  {
    slug: "jm-q01-tabla-intermedia",
    section,
    lesson: camino,
    type: "single",
    difficulty: "easy",
    topic: "Camino entre tablas",
    tags: ["inner_join", "modelo_de_datos"],
    estimated_seconds: 45,
    prompt_md:
      "En TiendaViva quieres las ventas de cada vendedor. `sellers` no tiene ninguna columna que apunte a `orders`. ¿Qué camino de tablas necesitas?",
    options: [
      {
        key: "a",
        body_md: "`sellers → products → order_items → orders`",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "`sellers → orders`, uniendo `sellers.id = orders.id`",
        is_correct: false,
        why_incorrect_md:
          "Ambos `id` son identificadores de entidades distintas; unirlos produce filas sin sentido y sin error.",
      },
      {
        key: "c",
        body_md: "`sellers → payments → orders`",
        is_correct: false,
        why_incorrect_md: "`payments` se relaciona con `orders`, no con `sellers`.",
      },
      {
        key: "d",
        body_md: "No se puede: hacen falta subconsultas.",
        is_correct: false,
        why_incorrect_md:
          "Con dos tablas intermedias alcanza; las subconsultas resuelven otro tipo de problema.",
      },
    ],
    explanation_md:
      "Cuando dos tablas no comparten clave foránea, se conectan a través de las tablas intermedias que sí la tienen. Cada flecha del camino se convierte en un `JOIN ... ON`.",
    is_published: true,
  },
  {
    slug: "jm-q02-orden-inner",
    section,
    lesson: camino,
    type: "true_false",
    difficulty: "easy",
    topic: "Orden de los joins",
    tags: ["inner_join", "legibilidad"],
    estimated_seconds: 35,
    prompt_md:
      "Verdadero o falso: en una consulta con solo `INNER JOIN`, cambiar el orden en que escribes las tablas cambia el conjunto de filas devuelto.",
    options: [
      {
        key: "a",
        body_md: "Falso: el resultado es el mismo; solo cambia la legibilidad.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Verdadero: cada orden produce filas distintas.",
        is_correct: false,
        why_incorrect_md:
          "El INNER JOIN es conmutativo y asociativo; además PostgreSQL decide su propio orden de ejecución.",
      },
    ],
    explanation_md:
      "Con INNER JOIN eliges el orden por claridad. En cuanto hay un LEFT JOIN en la cadena, el orden pasa a importar.",
    is_published: true,
  },
  {
    slug: "jm-q03-left-anulado",
    section,
    lesson: mezcla,
    type: "error_diagnosis",
    difficulty: "intermediate",
    topic: "LEFT anulado por el WHERE",
    tags: ["outer_join", "where"],
    estimated_seconds: 70,
    prompt_md:
      "Este reporte debía listar los 173 pedidos peruanos entregados con el monto reembolsado cuando hubo devolución, pero devuelve 8 filas. ¿Cuál es la causa?",
    code_md:
      "```sql\nSELECT o.id, c.full_name, r.refund_amount\nFROM orders AS o\nINNER JOIN customers AS c ON c.id = o.customer_id\nLEFT JOIN returns AS r ON r.order_id = o.id\nWHERE c.country = 'PE'\n  AND o.status IN ('delivered', 'returned')\n  AND r.refund_amount > 0;\n```",
    options: [
      {
        key: "a",
        body_md:
          "`r.refund_amount > 0` en el `WHERE` descarta las filas con NULL: el LEFT JOIN quedó convertido en INNER.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "El `LEFT JOIN` debería estar antes del `INNER JOIN`.",
        is_correct: false,
        why_incorrect_md:
          "El INNER sobre `customers` no toca a `returns`; mover las líneas no cambia nada aquí.",
      },
      {
        key: "c",
        body_md: "Falta agrupar por `o.id`.",
        is_correct: false,
        why_incorrect_md:
          "No hay agregaciones en la consulta; agrupar no recuperaría las filas perdidas.",
      },
      {
        key: "d",
        body_md: "`customers` debería unirse con LEFT JOIN.",
        is_correct: false,
        why_incorrect_md:
          "Todo pedido tiene cliente: ese INNER es correcto y no elimina ninguna fila.",
      },
    ],
    explanation_md:
      "Cualquier comparación contra NULL da desconocido, así que las filas sin devolución no pasan el `WHERE`. La condición sobre la tabla opcional debe viajar al `ON`.",
    is_published: true,
  },
  {
    slug: "jm-q04-producto-de-cardinalidades",
    section,
    lesson: duplicacion,
    type: "single",
    difficulty: "intermediate",
    topic: "Dos relaciones uno-a-muchos",
    tags: ["duplicates", "inner_join"],
    estimated_seconds: 55,
    prompt_md:
      "Un pedido tiene 3 ítems y 2 intentos de pago. ¿Cuántas filas devuelve `orders INNER JOIN order_items INNER JOIN payments` para ese pedido?",
    options: [
      { key: "a", body_md: "6", is_correct: true },
      {
        key: "b",
        body_md: "5",
        is_correct: false,
        why_incorrect_md:
          "Las cardinalidades se multiplican, no se suman: cada ítem se combina con cada pago.",
      },
      {
        key: "c",
        body_md: "3",
        is_correct: false,
        why_incorrect_md: "Serían 3 solo si hubiera un único pago.",
      },
      {
        key: "d",
        body_md: "1",
        is_correct: false,
        why_incorrect_md: "El JOIN no agrupa: no hay forma de que quede una sola fila.",
      },
    ],
    explanation_md:
      "3 × 2 = 6. Colgar dos relaciones uno-a-muchos de la misma tabla multiplica filas y arruina cualquier `sum()`.",
    is_published: true,
  },
  {
    slug: "jm-q05-suma-inflada",
    section,
    lesson: duplicacion,
    type: "query_interpretation",
    difficulty: "intermediate",
    topic: "Sumar del lado equivocado",
    tags: ["aggregation_level", "duplicates"],
    estimated_seconds: 60,
    prompt_md: "¿Qué problema tiene el importe que devuelve esta consulta?",
    code_md:
      "```sql\nSELECT c.country, sum(o.total_amount) AS facturado\nFROM orders AS o\nINNER JOIN customers AS c ON c.id = o.customer_id\nINNER JOIN order_items AS oi ON oi.order_id = o.id\nGROUP BY c.country;\n```",
    options: [
      {
        key: "a",
        body_md:
          "Cuenta el total de cada pedido una vez por línea: un pedido de 3 ítems suma su importe 3 veces.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Ninguno: el JOIN con `order_items` no afecta la suma.",
        is_correct: false,
        why_incorrect_md:
          "Sí la afecta: el JOIN repite la fila del pedido una vez por ítem, y `sum` las cuenta todas.",
      },
      {
        key: "c",
        body_md: "Falta `DISTINCT` en el `SELECT` para eliminar países repetidos.",
        is_correct: false,
        why_incorrect_md: "`GROUP BY c.country` ya devuelve un país por fila.",
      },
      {
        key: "d",
        body_md: "Debería usar `LEFT JOIN` con `order_items`.",
        is_correct: false,
        why_incorrect_md:
          "Cambiar a LEFT agregaría los pedidos sin ítems, pero no corrige la repetición de importes.",
      },
    ],
    explanation_md:
      "`total_amount` pertenece al lado «uno» de la relación. Si no necesitas columnas de `order_items`, quita ese JOIN; si las necesitas, suma solo columnas del lado «muchos».",
    is_published: true,
  },
  {
    slug: "jm-q06-count-distinct",
    section,
    lesson: duplicacion,
    type: "fill_blank",
    difficulty: "intermediate",
    topic: "Contar entidades en una cadena",
    tags: ["duplicates", "aggregate"],
    estimated_seconds: 40,
    prompt_md:
      "Completa para contar pedidos (no líneas) en una consulta que ya unió `order_items`: `SELECT s.store_name, count(___ o.id) AS pedidos ...`",
    answer: { accepted: ["DISTINCT"], case_sensitive: false },
    explanation_md:
      "Tras un JOIN uno-a-muchos, `count(o.id)` cuenta líneas. `count(DISTINCT o.id)` recupera la cantidad real de pedidos.",
    is_published: true,
  },
  {
    slug: "jm-q07-on-vs-where",
    section,
    lesson: mezcla,
    type: "multiple",
    difficulty: "intermediate",
    topic: "ON contra WHERE",
    tags: ["inner_join", "outer_join", "where"],
    estimated_seconds: 75,
    prompt_md: "Selecciona todas las afirmaciones correctas.",
    options: [
      {
        key: "a",
        body_md:
          "En un INNER JOIN, poner una condición en el `ON` o en el `WHERE` da el mismo resultado.",
        is_correct: true,
      },
      {
        key: "b",
        body_md:
          "En un LEFT JOIN, una condición sobre la tabla derecha en el `WHERE` elimina las filas sin pareja.",
        is_correct: true,
      },
      {
        key: "c",
        body_md:
          "`r.id IS NULL` en el `WHERE` de un LEFT JOIN es un uso intencional de esa conversión: sirve para buscar lo que no tiene pareja.",
        is_correct: true,
      },
      {
        key: "d",
        body_md: "En un LEFT JOIN, `ON` y `WHERE` también son intercambiables.",
        is_correct: false,
        why_incorrect_md:
          "Solo con INNER. Con LEFT, el `ON` decide qué se une y el `WHERE` filtra el resultado ya unido, incluidas las filas con NULL.",
      },
      {
        key: "e",
        body_md: "Las condiciones sobre la tabla conductora deben ir siempre en el `ON`.",
        is_correct: false,
        why_incorrect_md:
          "Las condiciones sobre la tabla izquierda pueden ir en el `WHERE` sin alterar el LEFT JOIN.",
      },
    ],
    explanation_md:
      "La diferencia entre `ON` y `WHERE` solo se nota cuando hay filas sin pareja, es decir, en los OUTER JOIN.",
    is_published: true,
  },
  {
    slug: "jm-q08-elegir-join-por-tabla",
    section,
    lesson: mezcla,
    type: "matching",
    difficulty: "intermediate",
    topic: "INNER u opcional",
    tags: ["inner_join", "outer_join"],
    estimated_seconds: 70,
    prompt_md:
      "En un reporte de pedidos de TiendaViva, relaciona cada tabla con el tipo de unión adecuado.",
    pairs: [
      { left: "customers (todo pedido tiene cliente)", right: "INNER JOIN" },
      { left: "order_items (todo pedido facturado tiene líneas)", right: "INNER JOIN" },
      { left: "returns (solo algunos pedidos se devuelven)", right: "LEFT JOIN" },
      { left: "reviews (la reseña es opcional)", right: "LEFT JOIN" },
    ],
    explanation_md:
      "INNER para lo que existe siempre; LEFT para el dato extra que puede faltar. Así el reporte conserva todos los pedidos.",
    is_published: true,
  },
  {
    slug: "jm-q09-escenario-pago-aprobado",
    section,
    lesson: duplicacion,
    type: "scenario",
    difficulty: "advanced",
    topic: "Convertir uno-a-muchos en uno-a-uno",
    tags: ["duplicates", "inner_join"],
    estimated_seconds: 75,
    prompt_md:
      "Necesitas una fila por pedido con el método de pago y las unidades compradas. En TiendaViva hay 2502 pedidos con más de un intento de pago. ¿Cuál es la mejor estrategia sin usar subconsultas?",
    options: [
      {
        key: "a",
        body_md:
          "Unir `payments` con `AND pay.status = 'approved'` en el `ON`: cada pedido tiene a lo sumo un pago aprobado.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Agregar `DISTINCT` al `SELECT`.",
        is_correct: false,
        why_incorrect_md:
          "`DISTINCT` elimina filas idénticas, pero las copias difieren en el método o el estado del pago, así que sobreviven.",
      },
      {
        key: "c",
        body_md: "Usar `LEFT JOIN` con `payments` en vez de `INNER JOIN`.",
        is_correct: false,
        why_incorrect_md:
          "El LEFT conserva pedidos sin pago, pero no reduce los pedidos que tienen dos.",
      },
      {
        key: "d",
        body_md: "Ordenar por `pay.paid_at` y usar `LIMIT 1`.",
        is_correct: false,
        why_incorrect_md: "`LIMIT 1` recorta la consulta entera a una fila, no una por pedido.",
      },
    ],
    explanation_md:
      "Filtrar la relación hasta volverla única es la forma más simple de evitar la duplicación: la condición se escribe en el `ON` junto a la igualdad de claves.",
    is_published: true,
  },
  {
    slug: "jm-q10-clave-no-primaria",
    section,
    lesson: camino,
    type: "single",
    difficulty: "advanced",
    topic: "Unir por columnas que no son clave",
    tags: ["join_condition", "duplicates"],
    estimated_seconds: 60,
    prompt_md:
      "¿Qué ocurre al unir dos tablas por una columna que no es única en ninguno de los dos lados, por ejemplo `ON o.currency = p.currency`?",
    options: [
      {
        key: "a",
        body_md:
          "Es válido, pero cada valor repetido se combina con todos los del otro lado y el resultado se multiplica.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "PostgreSQL devuelve un error porque el `ON` exige claves.",
        is_correct: false,
        why_incorrect_md:
          "El `ON` acepta cualquier condición booleana; no verifica claves primarias ni foráneas.",
      },
      {
        key: "c",
        body_md: "Devuelve solo la primera coincidencia de cada lado.",
        is_correct: false,
        why_incorrect_md:
          "El JOIN no elige una fila: produce todas las combinaciones que cumplen la condición.",
      },
      {
        key: "d",
        body_md: "El resultado es idéntico a unir por la clave primaria.",
        is_correct: false,
        why_incorrect_md:
          "Solo coincidiría si la columna fuera única en un lado, que es justamente lo que no ocurre aquí.",
      },
    ],
    explanation_md:
      "Unir por columnas no únicas es legal y a veces necesario, pero antes de hacerlo verifica cuántas filas comparten cada valor: ahí nace la mayoría de los resultados inflados.",
    is_published: true,
  },
];
