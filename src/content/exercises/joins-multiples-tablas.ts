import {
  defaultHintMeta,
  defaultReward,
  defaultSolutionUnlock,
  type ExerciseDef,
} from "../schemas/exercise";

const section = "joins-multiples-tablas";
const tiendaviva = { slug: "tiendaviva", version: 1 };
const pidelo = { slug: "pidelo", version: 1 };
const camino = "planificar-el-camino-de-joins";
const mezcla = "mezclar-inner-y-left";
const duplicacion = "duplicacion-de-filas-en-cadenas";

export const exercises: ExerciseDef[] = [
  {
    slug: "lineas-de-vendedores-uruguayos",
    section,
    title: "Líneas vendidas por tiendas uruguayas",
    difficulty: "easy",
    estimated_minutes: 8,
    concepts: ["inner_join", "where", "alias"],
    dataset: tiendaviva,
    tables_used: ["orders", "order_items", "products", "sellers"],
    scenario_md:
      "El departamento de Expansión de **TiendaViva** está preparando una reunión con las cinco tiendas uruguayas del marketplace y necesita el detalle de lo que vendieron en agosto de 2025. Te piden ese listado porque el vendedor y la línea de pedido están en tablas separadas.",
    business_question_md:
      "Debes generar un dataset con una fila por línea de pedido de productos publicados por vendedores cuyo `country` es igual al texto `'UY'`, dentro de pedidos creados en agosto de 2025, del día 1 al 31 inclusive, con las columnas `order_id`, que es el `id` del pedido, el `store_name`, el `product_name`, que es el `name` del producto, y la `quantity`. El orden de las filas no importa.",
    learning_objective:
      "Encadenar cuatro tablas siguiendo el camino de claves foráneas y usar alias para evitar ambigüedades.",
    theory_ref: camino,
    expected_columns: [
      { name: "order_id", type: "integer" },
      { name: "store_name", type: "text" },
      { name: "product_name", type: "text" },
      { name: "quantity", type: "integer" },
    ],
    validation_rules: { required_concepts: ["inner_join"] },
    reference_solution:
      "SELECT\n  o.id AS order_id,\n  s.store_name,\n  p.name AS product_name,\n  oi.quantity\nFROM orders AS o\nINNER JOIN order_items AS oi ON oi.order_id = o.id\nINNER JOIN products AS p ON p.id = oi.product_id\nINNER JOIN sellers AS s ON s.id = p.seller_id\nWHERE s.country = 'UY'\n  AND o.created_at >= '2025-08-01'\n  AND o.created_at < '2025-09-01';",
    alternative_solutions: [
      {
        label: "Empezando por sellers (tabla conductora distinta)",
        sql: "SELECT\n  o.id AS order_id,\n  s.store_name,\n  p.name AS product_name,\n  oi.quantity\nFROM sellers AS s\nINNER JOIN products AS p ON p.seller_id = s.id\nINNER JOIN order_items AS oi ON oi.product_id = p.id\nINNER JOIN orders AS o ON o.id = oi.order_id\nWHERE s.country = 'UY'\n  AND o.created_at >= '2025-08-01'\n  AND o.created_at < '2025-09-01';",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Ninguna columna conecta directamente al vendedor con el pedido. Dibuja el camino en un papel: por qué tablas intermedias hay que pasar para ir de uno al otro.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "El camino es `orders`, después `order_items`, después `products` y por último `sellers`, usando las columnas `order_items.order_id`, `order_items.product_id` y `products.seller_id`. Los filtros de país y de fecha van en la cláusula `WHERE`.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT o.id AS order_id, s.store_name, p.name AS product_name, oi.quantity\nFROM orders AS o\nINNER JOIN order_items AS oi ON oi.___ = o.id\nINNER JOIN products AS p ON p.id = oi.___\nINNER JOIN sellers AS s ON s.id = p.___\nWHERE s.country = '___'\n  AND o.created_at >= '___'\n  AND o.created_at < '___';\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "join_condition",
        description_md:
          "Unir la tabla `sellers` directamente con `orders`, escribiendo `ON s.id = o.customer_id`: son entidades distintas y el resultado no tiene ningún sentido, aunque la consulta se ejecute sin error.",
      },
      {
        category: "date_boundary",
        description_md:
          "Usar la condición `o.created_at <= '2025-08-31'`: deja afuera casi todo el día 31, porque la columna `created_at` incluye también la hora.",
      },
      {
        category: "syntax",
        description_md:
          "Escribir `name` o `id` sin el alias de la tabla: varias tablas de la cadena tienen esas columnas y PostgreSQL responde con el error «column reference is ambiguous».",
      },
      {
        category: "wrong_columns",
        description_md:
          "Devolver `p.id` en lugar de `o.id` como `order_id`: la columna se llama igual en las dos tablas y es fácil confundirlas.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 68 filas. La consulta recorre el camino que va de `orders` a `order_items`, después a `products` y después a `sellers`; cada `INNER JOIN` corresponde a una clave foránea real del modelo de datos.\n\nLa solución alternativa arranca en la tabla `sellers` y llega a `orders` en el sentido inverso: devuelve las mismas 68 filas. Cuando todos los cruces son `INNER JOIN`, el orden es libre, así que se elige por legibilidad; aquí conviene empezar por `orders` porque ahí está el filtro de fecha.\n\nUna fila por línea de pedido es el nivel de detalle correcto para esta pregunta. Si el equipo quisiera saber cuánto vendió cada tienda, habría que agregar, y entonces habría que revisar con cuidado qué columnas se pueden sumar sin duplicar importes.",
    improvement_feedback: [
      { condition: "no_table_alias_in_join", message_key: "improve.no_table_alias_in_join" },
      { condition: "uses_select_star", message_key: "improve.uses_select_star" },
    ],
    reward: defaultReward("easy"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "productos-mas-vendidos-con-tienda-y-categoria",
    section,
    title: "Productos más vendidos con tienda y categoría",
    difficulty: "intermediate",
    estimated_minutes: 10,
    concepts: ["inner_join", "group_by", "aggregate", "having", "order_by"],
    dataset: tiendaviva,
    tables_used: ["orders", "order_items", "products", "sellers", "categories"],
    scenario_md:
      "El departamento de Compras quiere identificar los productos con mejor rotación en lo que va de 2025 para negociar la reposición con las tiendas que los publican. Te piden ese ranking con el nombre de la tienda y la categoría al lado, para poder llevarlo a las reuniones.",
    business_question_md:
      "Debes generar un dataset que, tomando las líneas de pedidos creados desde el 1 de enero de 2025 cuyo `status` sea distinto del texto `'cancelled'`, devuelva el `product_name`, que es el `name` del producto, el `store_name`, el `category_name`, que es el `name` de la categoría del producto, y la suma de `quantity` bajo el encabezado `unidades`, quedándote solamente con los productos que acumulan **24 unidades o más**. Ordena por `unidades` descendente y, si dos productos empatan, debes desempatar usando `product_name` ascendente.",
    learning_objective:
      "Agregar sobre una cadena de cinco tablas y filtrar el resultado agregado con HAVING.",
    theory_ref: camino,
    expected_columns: [
      { name: "product_name", type: "text" },
      { name: "store_name", type: "text" },
      { name: "category_name", type: "text" },
      { name: "unidades", type: "integer" },
    ],
    validation_rules: {
      order_matters: true,
      required_concepts: ["inner_join", "group_by", "having"],
    },
    reference_solution:
      "SELECT\n  p.name AS product_name,\n  s.store_name,\n  cat.name AS category_name,\n  sum(oi.quantity) AS unidades\nFROM orders AS o\nINNER JOIN order_items AS oi ON oi.order_id = o.id\nINNER JOIN products AS p ON p.id = oi.product_id\nINNER JOIN sellers AS s ON s.id = p.seller_id\nINNER JOIN categories AS cat ON cat.id = p.category_id\nWHERE o.created_at >= '2025-01-01'\n  AND o.status <> 'cancelled'\nGROUP BY p.name, s.store_name, cat.name\nHAVING sum(oi.quantity) >= 24\nORDER BY unidades DESC, product_name;",
    alternative_solutions: [
      {
        label: "Conducida por order_items y agrupada por la clave del producto",
        sql: "SELECT\n  p.name AS product_name,\n  s.store_name,\n  cat.name AS category_name,\n  sum(oi.quantity) AS unidades\nFROM order_items AS oi\nINNER JOIN orders AS o ON o.id = oi.order_id\nINNER JOIN products AS p ON p.id = oi.product_id\nINNER JOIN categories AS cat ON cat.id = p.category_id\nINNER JOIN sellers AS s ON s.id = p.seller_id\nWHERE o.status <> 'cancelled'\n  AND o.created_at >= '2025-01-01'\nGROUP BY p.id, p.name, s.store_name, cat.name\nHAVING sum(oi.quantity) >= 24\nORDER BY unidades DESC, p.name;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Necesitas dos datos descriptivos del producto que viven en tablas distintas: quién lo vende y a qué categoría pertenece. Las dos relaciones cuelgan de la tabla `products`.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Une la tabla `categories` por `products.category_id` y la tabla `sellers` por `products.seller_id`. Suma la columna `order_items.quantity`, agrupa por las tres columnas descriptivas y aplica el umbral con la cláusula `HAVING`.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT p.name AS product_name, s.store_name, cat.name AS category_name, ___ AS unidades\nFROM orders AS o\nINNER JOIN order_items AS oi ON oi.order_id = o.id\nINNER JOIN products AS p ON p.id = oi.product_id\nINNER JOIN sellers AS s ON s.id = p.___\nINNER JOIN categories AS cat ON cat.id = p.___\nWHERE o.created_at >= '2025-01-01'\n  AND o.status <> '___'\nGROUP BY ___\nHAVING ___ >= 24\nORDER BY unidades DESC, product_name;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "aggregation_level",
        description_md:
          "Sumar `p.list_price` o `o.total_amount` en lugar de `oi.quantity`: son columnas del lado «uno» de la relación y se repiten una vez por cada línea del pedido.",
      },
      {
        category: "missing_filter",
        description_md:
          "Poner el umbral de 24 unidades en la cláusula `WHERE`: ahí todavía no existe la suma. El filtro sobre un valor agregado va en la cláusula `HAVING`.",
      },
      {
        category: "join_condition",
        description_md:
          "Unir la tabla `categories` con `order_items` o con `sellers`: la categoría depende del producto, a través de `products.category_id`.",
      },
      {
        category: "wrong_order",
        description_md:
          "Ordenar solamente por `unidades`: hay empates y el desempate por `product_name` es parte de lo que pidió el negocio.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 26 productos. La cadena tiene cinco tablas, pero solo tres relaciones distintas: la línea con su pedido, la línea con su producto, y el producto con su vendedor y con su categoría.\n\nAgrupar por `p.name` funciona porque en este dataset los nombres de producto son únicos; la alternativa agrupa por `p.id`, agregando además `p.name` al `GROUP BY` para poder seleccionarlo, que es el hábito robusto: si mañana dos tiendas publican un producto con el mismo nombre, la primera versión los mezclaría en una sola fila.\n\nLa expresión `sum(oi.quantity)` es correcta porque `order_items` es la tabla más detallada de la consulta, así que cada fila se cuenta una sola vez. Repetir la expresión dentro del `HAVING` es lo habitual: PostgreSQL no permite usar el alias `unidades` ahí, pero sí lo permite en la cláusula `ORDER BY`.",
    improvement_feedback: [
      {
        condition: "missing_alias_on_aggregate",
        message_key: "improve.missing_alias_on_aggregate",
      },
      { condition: "no_table_alias_in_join", message_key: "improve.no_table_alias_in_join" },
    ],
    reward: defaultReward("intermediate"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "entregas-peruanas-con-devolucion-opcional",
    section,
    title: "Entregas peruanas con devolución opcional",
    difficulty: "intermediate",
    estimated_minutes: 10,
    concepts: ["inner_join", "outer_join", "where", "null_handling"],
    dataset: tiendaviva,
    tables_used: ["orders", "customers", "shipments", "returns"],
    scenario_md:
      "El departamento de Atención al Cliente está auditando el segundo semestre en Perú: quiere ver **todos** los pedidos que llegaron a destino y, cuando además hubo una devolución, el importe reembolsado. Te piden ese reporte para cerrar la auditoría.",
    business_question_md:
      "Debes generar un dataset que devuelva el `order_id`, que es el `id` del pedido, el `full_name` del cliente, el `carrier` y el `delivered_at` del envío, y el `refund_amount` de la devolución, que debe quedar en `NULL` cuando el pedido no tuvo devolución, para los pedidos de clientes cuyo `country` es igual al texto `'PE'`, cuyo `status` es igual a `'delivered'` o a `'returned'` y que fueron creados en julio o agosto de 2025. Ordena por `order_id` ascendente.",
    learning_objective:
      "Combinar tablas obligatorias con INNER JOIN y una tabla opcional con LEFT JOIN sin perder filas.",
    theory_ref: mezcla,
    expected_columns: [
      { name: "order_id", type: "integer" },
      { name: "full_name", type: "text" },
      { name: "carrier", type: "text" },
      { name: "delivered_at", type: "timestamp" },
      { name: "refund_amount", type: "numeric" },
    ],
    validation_rules: {
      order_matters: true,
      required_concepts: ["inner_join", "outer_join"],
    },
    reference_solution:
      "SELECT\n  o.id AS order_id,\n  c.full_name,\n  sh.carrier,\n  sh.delivered_at,\n  r.refund_amount\nFROM orders AS o\nINNER JOIN customers AS c ON c.id = o.customer_id\nINNER JOIN shipments AS sh ON sh.order_id = o.id\nLEFT JOIN returns AS r ON r.order_id = o.id\nWHERE c.country = 'PE'\n  AND o.status IN ('delivered', 'returned')\n  AND o.created_at >= '2025-07-01'\n  AND o.created_at < '2025-09-01'\nORDER BY o.id;",
    alternative_solutions: [
      {
        label: "Conducida por customers, con el LEFT JOIN en el medio",
        sql: "SELECT\n  o.id AS order_id,\n  c.full_name,\n  sh.carrier,\n  sh.delivered_at,\n  r.refund_amount\nFROM customers AS c\nINNER JOIN orders AS o ON o.customer_id = c.id\nLEFT JOIN returns AS r ON r.order_id = o.id\nINNER JOIN shipments AS sh ON sh.order_id = o.id\nWHERE c.country = 'PE'\n  AND o.status IN ('delivered', 'returned')\n  AND o.created_at >= '2025-07-01'\n  AND o.created_at < '2025-09-01'\nORDER BY o.id;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Dos de las tablas acompañantes existen siempre para estos pedidos y una sola existe a veces. Esa diferencia es la que decide el tipo de unión de cada una.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Las tablas `customers` y `shipments` van con `INNER JOIN`; la tabla `returns` va con `LEFT JOIN` por la columna `returns.order_id`. Ten cuidado: si mencionas alguna columna de `returns` en la cláusula `WHERE`, el `LEFT JOIN` deja de conservar los pedidos sin devolución.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT o.id AS order_id, c.full_name, sh.carrier, sh.delivered_at, r.refund_amount\nFROM orders AS o\n___ JOIN customers AS c ON c.id = o.customer_id\n___ JOIN shipments AS sh ON sh.order_id = o.id\n___ JOIN returns AS r ON r.order_id = o.id\nWHERE c.country = '___'\n  AND o.status IN ('___', '___')\n  AND o.created_at >= '___'\n  AND o.created_at < '___'\nORDER BY o.id;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "join_condition",
        description_md:
          "Unir la tabla `returns` con `INNER JOIN`: el reporte baja de 173 a 8 filas y da la impresión de que casi todo se devolvió.",
      },
      {
        category: "null_handling",
        description_md:
          "Agregar la condición `r.refund_amount > 0` o `r.reason IS NOT NULL` en la cláusula `WHERE`: eso anula el `LEFT JOIN`, porque las filas sin devolución tienen `NULL` en esas columnas.",
      },
      {
        category: "date_boundary",
        description_md:
          "Escribir el rango como `o.created_at <= '2025-08-31'`: se pierden los pedidos del 31 de agosto posteriores a la medianoche.",
      },
      {
        category: "missing_filter",
        description_md:
          "Olvidar la condición `status IN ('delivered', 'returned')` e incluir pedidos enviados o cancelados, que no corresponden a esta auditoría.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 173 filas, de las cuales solo 8 traen la columna `refund_amount` con valor. Ese contraste es la razón del `LEFT JOIN`: si la tabla `returns` se uniera con `INNER JOIN`, el reporte mostraría 8 filas y la auditoría concluiría algo falso.\n\nLa solución alternativa escribe el `LEFT JOIN` antes del `INNER JOIN` sobre `shipments`. Funciona porque el `ON` de ese `INNER JOIN` apunta a la tabla `orders` y no a `returns`, así que no puede eliminar las filas generadas por el `LEFT JOIN`. Si ese cruce apuntara a alguna columna de `returns`, anularía el `LEFT JOIN` igual que lo haría un `WHERE`. Por eso la convención práctica es dejar los `LEFT JOIN` al final de la cadena.\n\nUn dato para mirar con ojo crítico: una de las 173 filas tiene la columna `delivered_at` en `NULL` a pesar del estado del pedido; en la tabla `shipments` hay 1110 envíos sin fecha de entrega. Un reporte de entregas honesto debería mencionar ese caso en lugar de esconderlo.",
    improvement_feedback: [
      { condition: "no_table_alias_in_join", message_key: "improve.no_table_alias_in_join" },
      {
        condition: "uses_between_for_timestamps",
        message_key: "improve.uses_between_for_timestamps",
      },
    ],
    reward: defaultReward("intermediate"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "pedidos-chilenos-sin-duplicar-pagos",
    section,
    title: "Pedidos chilenos sin duplicar pagos",
    difficulty: "advanced",
    estimated_minutes: 13,
    concepts: ["inner_join", "group_by", "aggregate", "where", "order_by"],
    dataset: tiendaviva,
    tables_used: ["orders", "customers", "payments", "order_items"],
    scenario_md:
      "El departamento de Finanzas está revisando las entregas de agosto de 2025 en Chile y quiere, en una sola tabla, cómo pagó cada cliente y cuánto compró. El equipo de datos les avisó de algo importante: en TiendaViva hay 2502 pedidos con más de un intento de pago registrado. Te piden el reporte cuidando ese detalle.",
    business_question_md:
      "Debes generar un dataset con una fila por pedido que devuelva el `order_id`, que es el `id` del pedido, el `full_name` del cliente, el `method` y el `installments` del **pago aprobado**, la cantidad de líneas del pedido bajo el encabezado `lineas` y la suma de `quantity` bajo el encabezado `unidades`, tomando los pedidos cuyo `status` es igual al texto `'delivered'`, creados en agosto de 2025, de clientes cuyo `country` es igual al texto `'CL'`. Ordena por `unidades` descendente y, si dos pedidos empatan, debes desempatar usando `order_id` ascendente.",
    learning_objective:
      "Evitar la multiplicación de filas cuando dos relaciones uno-a-muchos cuelgan de la misma tabla.",
    theory_ref: duplicacion,
    expected_columns: [
      { name: "order_id", type: "integer" },
      { name: "full_name", type: "text" },
      { name: "method", type: "text" },
      { name: "installments", type: "integer" },
      { name: "lineas", type: "integer" },
      { name: "unidades", type: "integer" },
    ],
    validation_rules: {
      order_matters: true,
      required_concepts: ["inner_join", "group_by", "aggregate"],
    },
    reference_solution:
      "SELECT\n  o.id AS order_id,\n  c.full_name,\n  pay.method,\n  pay.installments,\n  count(*) AS lineas,\n  sum(oi.quantity) AS unidades\nFROM orders AS o\nINNER JOIN customers AS c ON c.id = o.customer_id\nINNER JOIN payments AS pay\n  ON pay.order_id = o.id\n AND pay.status = 'approved'\nINNER JOIN order_items AS oi ON oi.order_id = o.id\nWHERE c.country = 'CL'\n  AND o.status = 'delivered'\n  AND o.created_at >= '2025-08-01'\n  AND o.created_at < '2025-09-01'\nGROUP BY o.id, c.full_name, pay.method, pay.installments\nORDER BY unidades DESC, o.id;",
    alternative_solutions: [
      {
        label: "Con el estado del pago en el WHERE (equivalente porque el join es INNER)",
        sql: "SELECT\n  o.id AS order_id,\n  c.full_name,\n  pay.method,\n  pay.installments,\n  count(oi.id) AS lineas,\n  sum(oi.quantity) AS unidades\nFROM customers AS c\nINNER JOIN orders AS o ON o.customer_id = c.id\nINNER JOIN order_items AS oi ON oi.order_id = o.id\nINNER JOIN payments AS pay ON pay.order_id = o.id\nWHERE pay.status = 'approved'\n  AND c.country = 'CL'\n  AND o.status = 'delivered'\n  AND o.created_at >= '2025-08-01'\n  AND o.created_at < '2025-09-01'\nGROUP BY o.id, c.full_name, pay.method, pay.installments\nORDER BY unidades DESC, o.id;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "De un mismo pedido cuelgan dos relaciones uno-a-muchos. Si las unes tal cual, las filas no se suman: se multiplican entre sí. Piensa qué condición vuelve única a una de las dos.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Un pedido tiene como máximo un pago aprobado, así que restringe la tabla `payments` por su `status` dentro del `ON`, o en el `WHERE`, que con un `INNER JOIN` es equivalente. Después agrupa por pedido y agrega sobre la tabla `order_items`.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT o.id AS order_id, c.full_name, pay.method, pay.installments,\n       ___ AS lineas, ___ AS unidades\nFROM orders AS o\nINNER JOIN customers AS c ON c.id = o.customer_id\nINNER JOIN payments AS pay\n  ON pay.order_id = o.id\n AND pay.___ = '___'\nINNER JOIN order_items AS oi ON oi.order_id = o.id\nWHERE c.country = 'CL'\n  AND o.status = 'delivered'\n  AND o.created_at >= '___'\n  AND o.created_at < '___'\nGROUP BY ___\nORDER BY unidades DESC, o.id;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "duplicates",
        description_md:
          "Unir la tabla `payments` sin filtrar el estado: los 8 pedidos de este recorte que tuvieron un pago rechazado y otro aprobado duplican sus líneas y sus unidades.",
      },
      {
        category: "aggregation_level",
        description_md:
          "Sumar `o.total_amount` junto con las filas de `order_items`: el total del pedido se repite una vez por línea e infla el importe.",
      },
      {
        category: "cell_values",
        description_md:
          "Contar con `count(DISTINCT oi.id)` no hace daño en este caso, pero contar `count(pay.id)` como `lineas` devuelve la cantidad de pagos y no la cantidad de líneas.",
      },
      {
        category: "wrong_order",
        description_md:
          "Ordenar por `unidades` sin desempatar por `order_id`: el resultado deja de ser reproducible entre ejecuciones.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 80 filas, una por pedido entregado. La clave está en la condición `AND pay.status = 'approved'` escrita dentro del `ON`: sin ella, la tabla `payments` aporta hasta dos filas por pedido y el cruce con `order_items` duplica todo. En este recorte son 8 los pedidos afectados; con la condición, la relación pasa a ser uno a uno y la expresión `sum(oi.quantity)` vuelve a ser confiable.\n\nLa solución alternativa mueve esa condición a la cláusula `WHERE`. Con un `INNER JOIN` las dos formas son equivalentes; con un `LEFT JOIN` no lo serían, porque el `WHERE` eliminaría los pedidos sin pago aprobado. Escribirla en el `ON` deja explícito que define **qué pago se une**, y no qué pedidos entran en el reporte.\n\nLas expresiones `count(*)` y `count(oi.id)` coinciden porque el `INNER JOIN` garantiza que cada fila tiene una línea real. Si la tabla `order_items` se hubiera unido con `LEFT JOIN`, `count(*)` informaría 1 para los pedidos sin líneas y `count(oi.id)` informaría 0: siempre conviene contar una columna del lado «muchos».",
    improvement_feedback: [
      { condition: "no_table_alias_in_join", message_key: "improve.no_table_alias_in_join" },
      {
        condition: "missing_alias_on_aggregate",
        message_key: "improve.missing_alias_on_aggregate",
      },
    ],
    reward: defaultReward("advanced"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "bebidas-por-ciudad-y-cocina",
    section,
    title: "Desafío: bebidas por ciudad y tipo de cocina",
    difficulty: "advanced",
    estimated_minutes: 14,
    concepts: ["inner_join", "group_by", "aggregate", "order_by", "numeric_functions"],
    dataset: pidelo,
    tables_used: ["cities", "restaurants", "orders", "order_items", "menu_items"],
    scenario_md:
      "En **Pídelo**, el departamento Comercial quiere lanzar un combo de bebidas y necesita saber en qué ciudades y con qué tipos de cocina se venden más, mirando las entregas de agosto de 2025. Te piden ese cruce para decidir dónde lanzar la prueba piloto.",
    business_question_md:
      "Debes generar un dataset que, tomando los pedidos cuyo `status` es igual al texto `'delivered'` y cuya columna `delivered_at` cae en agosto de 2025, y considerando solamente los ítems cuya categoría de menú es igual al texto `'bebida'`, devuelva el `city_name`, que es el `name` de la ciudad, el `cuisine` del restaurante, la suma de `quantity` bajo el encabezado `unidades` y la suma de `quantity * unit_price` redondeada a 2 decimales bajo el encabezado `ingreso`. Ordena por `city_name` ascendente, después por `unidades` descendente y, si dos filas empatan, debes desempatar usando `cuisine` ascendente.",
    learning_objective:
      "Recorrer una cadena de cinco tablas eligiendo el camino correcto entre dos rutas posibles hacia el menú.",
    theory_ref: camino,
    expected_columns: [
      { name: "city_name", type: "text" },
      { name: "cuisine", type: "text" },
      { name: "unidades", type: "integer" },
      { name: "ingreso", type: "numeric" },
    ],
    validation_rules: {
      order_matters: true,
      numeric_tolerance: 0.01,
      required_concepts: ["inner_join", "group_by"],
    },
    reference_solution:
      "SELECT\n  ci.name AS city_name,\n  r.cuisine,\n  sum(oi.quantity) AS unidades,\n  round(sum(oi.quantity * oi.unit_price), 2) AS ingreso\nFROM cities AS ci\nINNER JOIN restaurants AS r ON r.city_id = ci.id\nINNER JOIN orders AS o ON o.restaurant_id = r.id\nINNER JOIN order_items AS oi ON oi.order_id = o.id\nINNER JOIN menu_items AS mi ON mi.id = oi.menu_item_id\nWHERE mi.category = 'bebida'\n  AND o.status = 'delivered'\n  AND o.delivered_at >= '2025-08-01'\n  AND o.delivered_at < '2025-09-01'\nGROUP BY ci.name, r.cuisine\nORDER BY ci.name, unidades DESC, r.cuisine;",
    alternative_solutions: [
      {
        label: "Conducida por order_items (camino recorrido en sentido inverso)",
        sql: "SELECT\n  ci.name AS city_name,\n  r.cuisine,\n  sum(oi.quantity) AS unidades,\n  round(sum(oi.quantity * oi.unit_price), 2) AS ingreso\nFROM order_items AS oi\nINNER JOIN menu_items AS mi ON mi.id = oi.menu_item_id\nINNER JOIN orders AS o ON o.id = oi.order_id\nINNER JOIN restaurants AS r ON r.id = o.restaurant_id\nINNER JOIN cities AS ci ON ci.id = r.city_id\nWHERE mi.category = 'bebida'\n  AND o.status = 'delivered'\n  AND o.delivered_at >= '2025-08-01'\n  AND o.delivered_at < '2025-09-01'\nGROUP BY ci.name, r.cuisine\nORDER BY ci.name, unidades DESC, r.cuisine;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "El camino tiene cinco tablas: la ciudad, el restaurante, el pedido, la línea del pedido y el plato. Escríbelo en una línea antes de empezar y fíjate por qué columna se conecta cada par.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Llega a la tabla `menu_items` desde `order_items.menu_item_id` y no desde `restaurants`: te interesa el plato que efectivamente se pidió. El ingreso se calcula con el precio cobrado en la línea, que está en `oi.unit_price`, y no con el precio de lista del menú.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT ci.name AS city_name, r.cuisine,\n       ___ AS unidades,\n       round(___, 2) AS ingreso\nFROM cities AS ci\nINNER JOIN restaurants AS r ON r.city_id = ci.id\nINNER JOIN orders AS o ON o.restaurant_id = r.___\nINNER JOIN order_items AS oi ON oi.order_id = o.id\nINNER JOIN menu_items AS mi ON mi.id = oi.___\nWHERE mi.category = '___'\n  AND o.status = 'delivered'\n  AND o.delivered_at >= '___'\n  AND o.delivered_at < '___'\nGROUP BY ___\nORDER BY ci.name, unidades DESC, r.cuisine;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "join_condition",
        description_md:
          "Unir la tabla `menu_items` con la condición `mi.restaurant_id = r.id`: trae todo el menú del restaurante y no solamente los platos pedidos, lo que multiplica las filas del resultado.",
      },
      {
        category: "cell_values",
        description_md:
          "Calcular el ingreso con la columna `mi.price` en lugar de `oi.unit_price`: el precio de lista actual no es el precio que se cobró en agosto.",
      },
      {
        category: "date_boundary",
        description_md:
          "Filtrar por la columna `o.placed_at` en vez de `o.delivered_at`: la pregunta habla de entregas de agosto y no de pedidos hechos en agosto.",
      },
      {
        category: "missing_filter",
        description_md:
          "Olvidar la condición `mi.category = 'bebida'` y reportar el total del menú, que incluye platos principales y acompañamientos.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 67 filas: no todas las combinaciones de ciudad y tipo de cocina vendieron bebidas en agosto.\n\nEl punto fino está en cómo se llega a la tabla `menu_items`. Existen dos caminos posibles: desde `restaurants`, que trae todo el menú publicado, y desde `order_items`, que trae el plato que efectivamente se pidió. Solo el segundo responde la pregunta; el primero produce el producto cartesiano entre las líneas del pedido y la carta completa del restaurante. Cuando dos tablas se pueden unir por más de una ruta, la ruta elegida **es** la definición del indicador.\n\nLa expresión `sum(oi.quantity * oi.unit_price)` usa el precio congelado en la línea, que es el criterio contable correcto. Y la columna `ingreso` no es comparable entre ciudades, porque cada una factura en su moneda, así que Ciudad de México y Buenos Aires están en escalas distintas. Comparar la columna `unidades` sí tiene sentido; comparar `ingreso` entre países requeriría una conversión de monedas que este dataset no incluye.",
    improvement_feedback: [
      { condition: "no_table_alias_in_join", message_key: "improve.no_table_alias_in_join" },
      {
        condition: "uses_between_for_timestamps",
        message_key: "improve.uses_between_for_timestamps",
      },
    ],
    reward: defaultReward("advanced"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
];
