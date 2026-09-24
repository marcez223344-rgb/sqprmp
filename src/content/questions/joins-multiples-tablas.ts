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
  {
    slug: "jm-q11-inner-despues-de-left",
    section,
    lesson: mezcla,
    type: "error_diagnosis",
    difficulty: "advanced",
    topic: "Un INNER colgado de una tabla opcional",
    tags: ["outer_join", "inner_join", "cadena_de_joins"],
    estimated_seconds: 85,
    prompt_md:
      "Este listado debía mostrar **todos** los vendedores argentinos y, cuando tienen productos publicados, el producto y su categoría. Los vendedores sin ningún producto no aparecen, aunque el `WHERE` no los excluye. ¿Cuál es la causa?",
    code_md:
      "```sql\nSELECT s.store_name, p.name AS producto, c.name AS categoria\nFROM sellers AS s\nLEFT JOIN products AS p ON p.seller_id = s.id\nINNER JOIN categories AS c ON c.id = p.category_id\nWHERE s.country = 'AR';\n```",
    options: [
      {
        key: "a",
        body_md:
          "El `INNER JOIN` cuelga de `products`: para un vendedor sin productos, `p.category_id` es NULL, la igualdad del `ON` no se cumple y la fila desaparece, como si el LEFT nunca hubiera estado.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "El `WHERE s.country = 'AR'` anula el LEFT JOIN.",
        is_correct: false,
        why_incorrect_md:
          "Esa condición es sobre `sellers`, la tabla conductora. Filtrar por la tabla izquierda no rompe un LEFT JOIN; lo rompe lo que se le cuelga a la derecha.",
      },
      {
        key: "c",
        body_md:
          "Hay que escribir el `INNER JOIN` antes del `LEFT JOIN` para que se evalúe primero.",
        is_correct: false,
        why_incorrect_md:
          "Escrito antes, `categories` no tendría con qué unirse: `p` todavía no existe en la consulta. El orden no es el problema; el tipo de unión sí.",
      },
      {
        key: "d",
        body_md:
          "`categories` es una tabla de catálogo y le falta una fila con `id` NULL para los productos sin categoría.",
        is_correct: false,
        why_incorrect_md:
          "Una fila con clave NULL no se uniría con nada, porque comparar NULL con NULL no da verdadero. Un catálogo no se arregla agregando una fila vacía, sino uniéndolo con LEFT cuando la rama es opcional.",
      },
    ],
    explanation_md:
      "En una cadena, cada join se aplica al resultado acumulado hasta ese punto. Un INNER que depende de una tabla unida con LEFT descarta todas las filas donde esa tabla no trajo pareja, y el LEFT queda anulado sin que ninguna condición lo diga. La regla práctica: desde el primer LEFT, todo lo que cuelgue de esa rama también va con LEFT.",
    is_published: true,
  },
  {
    slug: "jm-q12-agregar-antes-de-unir",
    section,
    lesson: duplicacion,
    type: "scenario",
    difficulty: "advanced",
    topic: "Dos agregaciones de tablas distintas",
    tags: ["duplicates", "aggregation_level", "subquery"],
    estimated_seconds: 85,
    prompt_md:
      "Necesitas, por pedido, las unidades compradas (de `order_items`) y el total pagado (de `payments`). Un pedido puede tener varias líneas y varios intentos de pago. ¿Cuál es la estrategia correcta?",
    options: [
      {
        key: "a",
        body_md:
          "Agregar cada tabla por su cuenta —una subconsulta con `sum(quantity)` por pedido y otra con `sum(amount)` por pedido— y recién después unir esos dos resultados, que ya tienen una fila por pedido.",
        is_correct: true,
      },
      {
        key: "b",
        body_md:
          "Unir las tres tablas y usar `sum(DISTINCT oi.quantity)` y `sum(DISTINCT p.amount)` para descontar las repeticiones.",
        is_correct: false,
        why_incorrect_md:
          "`sum(DISTINCT ...)` suma valores distintos, no filas distintas: dos líneas de 2 unidades cada una sumarían 2 en lugar de 4. Descarta datos reales además de las copias.",
      },
      {
        key: "c",
        body_md:
          "Unir las tres tablas y dividir cada suma por la cantidad de filas del otro lado para deshacer la multiplicación.",
        is_correct: false,
        why_incorrect_md:
          "El factor de repetición cambia pedido por pedido y deja de ser exacto en cuanto un pedido no tiene pagos o no tiene líneas. Corregir a mano lo que el join multiplicó es frágil e imposible de auditar.",
      },
      {
        key: "d",
        body_md:
          "Unir las tres tablas con `LEFT JOIN` en lugar de `INNER JOIN`: así cada pedido aparece una sola vez.",
        is_correct: false,
        why_incorrect_md:
          "El tipo de unión decide qué filas se conservan, no cuántas se generan. Un LEFT contra una tabla con tres coincidencias devuelve tres filas, igual que el INNER.",
      },
    ],
    explanation_md:
      "Cuando dos tablas de detalle cuelgan de la misma tabla principal, unirlas a la vez multiplica las filas de una por las de la otra. La solución estructural es llevar cada una a la granularidad del pedido antes de unir: así cada subconsulta aporta una sola fila por pedido y la unión ya no puede multiplicar nada.",
    is_published: true,
  },
  {
    slug: "jm-q13-count-en-left-join",
    section,
    lesson: mezcla,
    type: "query_interpretation",
    difficulty: "intermediate",
    topic: "Qué cuenta cada count tras un LEFT JOIN",
    tags: ["outer_join", "aggregate"],
    estimated_seconds: 70,
    prompt_md:
      "Un vendedor no tiene ningún producto publicado. ¿Qué devuelven las columnas `a` y `b` en su fila?",
    code_md:
      "```sql\nSELECT s.id,\n       count(*) AS a,\n       count(p.id) AS b\nFROM sellers AS s\nLEFT JOIN products AS p ON p.seller_id = s.id\nGROUP BY s.id;\n```",
    options: [
      {
        key: "a",
        body_md:
          "`a` = 1 y `b` = 0: el LEFT deja una fila con las columnas de `products` en NULL; `count(*)` cuenta esa fila y `count(p.id)` no cuenta el NULL.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "`a` = 0 y `b` = 0: sin productos no hay filas que contar.",
        is_correct: false,
        why_incorrect_md:
          "Entonces el vendedor no aparecería en el resultado, que es justamente lo que el LEFT JOIN evita. Hay una fila, con las columnas de la tabla derecha en NULL.",
      },
      {
        key: "c",
        body_md: "`a` = 1 y `b` = 1: `count` cuenta filas, mire la columna que mire.",
        is_correct: false,
        why_incorrect_md:
          "`count(*)` cuenta filas, pero `count(columna)` cuenta valores no nulos. Esa diferencia es exactamente lo que separa «vendedores» de «vendedores con productos».",
      },
      {
        key: "d",
        body_md: "`a` = NULL y `b` = NULL: la fila viene con NULL y el NULL se propaga a la suma.",
        is_correct: false,
        why_incorrect_md:
          "`count` nunca devuelve NULL: devuelve 0 cuando no hay nada que contar. Las que sí devuelven NULL sobre un grupo sin valores son `sum` y `avg`.",
      },
    ],
    explanation_md:
      "Después de un LEFT JOIN, `count(*)` nunca da cero para una fila de la izquierda: siempre queda al menos una fila, aunque esté vacía del lado derecho. Para contar coincidencias reales usa `count(columna_de_la_tabla_derecha)`. Conviene mirar los dos juntos: uno dice cuántas entidades hay y el otro cuántas tienen el dato.",
    is_published: true,
  },
  {
    slug: "jm-q14-promedio-ponderado-sin-querer",
    section,
    lesson: duplicacion,
    type: "single",
    difficulty: "advanced",
    topic: "Un promedio que cambió de unidad",
    tags: ["duplicates", "aggregation_level"],
    estimated_seconds: 75,
    prompt_md:
      "Una consulta une `orders` con `order_items` y calcula `avg(o.total_amount)` por país. El resultado trae una fila por país, como se esperaba, y ningún valor parece raro. ¿Qué mide en realidad ese promedio?",
    options: [
      {
        key: "a",
        body_md:
          "El importe de los pedidos ponderado por cantidad de líneas: los pedidos con más ítems pesan más, así que ya no es el ticket promedio.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "El ticket promedio correcto: `avg` ignora las filas repetidas.",
        is_correct: false,
        why_incorrect_md:
          "`avg` no sabe que dos filas vienen del mismo pedido: suma todo lo que recibe y divide por la cantidad de filas. Repetir un valor sí mueve el promedio.",
      },
      {
        key: "c",
        body_md: "El importe promedio por línea de pedido.",
        is_correct: false,
        why_incorrect_md:
          "Para eso habría que promediar una columna del nivel del ítem, como `oi.quantity * oi.unit_price`. Acá se promedia el total del pedido completo, repetido una vez por línea.",
      },
      {
        key: "d",
        body_md:
          "Nada: la consulta falla porque se agregan columnas de dos niveles de detalle distintos.",
        is_correct: false,
        why_incorrect_md:
          "No falla. La consulta es válida y devuelve un número bien calculado; el problema es que ese número responde otra pregunta, y por eso nadie lo detecta al revisarlo.",
      },
    ],
    explanation_md:
      "La cantidad de filas del resultado no dice nada sobre la duplicación: el `GROUP BY` la esconde. Un promedio calculado después de un join uno a muchos deja de pesar por entidad y pasa a pesar por fila. La verificación barata es comparar `count(*)` con `count(DISTINCT o.id)` antes de agrupar: si difieren, todas las agregaciones sobre columnas del pedido están contaminadas.",
    is_published: true,
  },
];
