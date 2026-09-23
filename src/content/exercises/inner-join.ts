import {
  defaultHintMeta,
  defaultReward,
  defaultSolutionUnlock,
  type ExerciseDef,
} from "../schemas/exercise";

const section = "inner-join";
const dataset = { slug: "tiendaviva", version: 1 };
const basico = "inner-join-basico";
const varias = "inner-join-varias-tablas";

export const exercises: ExerciseDef[] = [
  {
    slug: "productos-de-vendedores-uruguayos",
    section,
    title: "Productos de vendedores uruguayos",
    difficulty: "easy",
    estimated_minutes: 6,
    concepts: ["inner_join", "where"],
    dataset,
    tables_used: ["products", "sellers"],
    scenario_md:
      "El departamento de Marketing está preparando la campaña uruguaya y necesita el catálogo de los vendedores de Uruguay con el nombre de cada tienda al lado del producto. Te piden ese cruce porque el nombre de la tienda y el del producto están en tablas distintas.",
    business_question_md:
      "Debes generar un dataset que devuelva el `id` y el `name` del producto junto con el `store_name` de su vendedor, tomando únicamente los vendedores cuyo `country` es igual al texto `'UY'`. El orden de las filas no importa.",
    learning_objective:
      "Unir dos tablas por clave foránea y filtrar por una columna de la segunda tabla.",
    theory_ref: basico,
    expected_columns: [
      { name: "id", type: "integer" },
      { name: "name", type: "text" },
      { name: "store_name", type: "text" },
    ],
    validation_rules: { required_concepts: ["inner_join"] },
    reference_solution:
      "SELECT p.id, p.name, s.store_name\nFROM products AS p\nINNER JOIN sellers AS s ON s.id = p.seller_id\nWHERE s.country = 'UY';",
    alternative_solutions: [
      {
        label: "JOIN sin INNER",
        sql: "SELECT p.id, p.name, s.store_name FROM products p JOIN sellers s ON p.seller_id = s.id WHERE s.country = 'UY';",
      },
    ],
    improvement_feedback: [
      { condition: "no_table_alias_in_join", message_key: "improve.no_table_alias_in_join" },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "La columna `products.seller_id` apunta a la columna `sellers.id`. Esa igualdad es la condición que va en el `ON`.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Usa alias cortos para las tablas, por ejemplo `p` para productos y `s` para vendedores, y califica cada columna con su alias. El filtro de país va en la cláusula `WHERE` y se aplica sobre la tabla `sellers`.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT p.id, p.name, s.store_name\nFROM products AS p\nINNER JOIN sellers AS s ON s.id = p.___\nWHERE s.___ = 'UY';\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "join_condition",
        description_md:
          "Escribir `ON s.id = p.id`: se unen productos y vendedores que casualmente comparten el mismo número de identificador, y el resultado son 180 filas sin ningún sentido de negocio.",
      },
      {
        category: "syntax",
        description_md:
          "Escribir `SELECT id, name` sin calificar con el alias de la tabla: las columnas `id` y `name` existen en las dos tablas y PostgreSQL devuelve un error de ambigüedad.",
      },
      {
        category: "missing_filter",
        description_md:
          "Olvidar la cláusula `WHERE`: la consulta devuelve los 1500 productos del catálogo en lugar de los uruguayos.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 41 productos. Cada producto tiene exactamente un vendedor, así que el cruce no multiplica filas: el resultado tiene una fila por producto uruguayo.\n\nEl filtro sobre `s.country` se evalúa, en el orden lógico, después de la unión; el motor suele reordenarlo internamente para filtrar primero y leer menos filas, pero el resultado es el mismo.",
    reward: defaultReward("easy"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "detalle-del-pedido-13",
    section,
    title: "Detalle del pedido 13",
    difficulty: "easy",
    estimated_minutes: 6,
    concepts: ["inner_join", "where", "order_by"],
    dataset,
    tables_used: ["order_items", "products"],
    scenario_md:
      "Un cliente hizo un reclamo por el pedido número **13**. El departamento de Atención al Cliente necesita ver qué productos incluía ese pedido, con la cantidad y el precio unitario de cada uno, y te pide el detalle para poder responderle.",
    business_question_md:
      "Debes generar un dataset que devuelva el `id` del ítem, que es la columna `order_items.id`, el `name` del producto, la `quantity` y el `unit_price`, para los ítems cuyo `order_id` es igual a `13`, ordenados por el `id` del ítem de forma ascendente.",
    learning_objective:
      "Unir una tabla de detalle con su catálogo y calificar columnas con el mismo nombre.",
    theory_ref: basico,
    expected_columns: [
      { name: "id", type: "integer" },
      { name: "name", type: "text" },
      { name: "quantity", type: "integer" },
      { name: "unit_price", type: "numeric" },
    ],
    validation_rules: { order_matters: true, required_concepts: ["inner_join", "where"] },
    reference_solution:
      "SELECT oi.id, p.name, oi.quantity, oi.unit_price\nFROM order_items AS oi\nINNER JOIN products AS p ON p.id = oi.product_id\nWHERE oi.order_id = 13\nORDER BY oi.id;",
    hints: [
      {
        level: 1,
        body_md:
          "La tabla base de la consulta es `order_items`, porque el resultado tiene una fila por ítem; el nombre del producto vive en la tabla `products`. Conecta las dos por la columna `product_id`.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Las dos tablas tienen una columna llamada `id`: la que pide la consigna es la del ítem, es decir, `oi.id`. El filtro se escribe como `oi.order_id = 13`.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT oi.id, p.name, oi.quantity, oi.unit_price\nFROM order_items AS oi\nINNER JOIN products AS p ON p.id = oi.___\nWHERE oi.___ = 13\nORDER BY oi.id;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "wrong_columns",
        description_md:
          "Devolver `p.id`, que es el identificador del producto, en lugar de `oi.id`, que es el identificador del ítem del pedido.",
      },
      {
        category: "join_condition",
        description_md:
          "Escribir `ON p.id = oi.order_id`: se unen los productos con el número de pedido, dos valores que no tienen relación entre sí.",
      },
      {
        category: "wrong_order",
        description_md:
          "Omitir la cláusula `ORDER BY oi.id`: el detalle sale sin un orden garantizado y la comparación con la factura se vuelve incómoda.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 4 ítems. La columna `unit_price` está guardada en `order_items` y no en `products`: el precio de lista puede cambiar con el tiempo, pero el precio al que se vendió cada ítem tiene que quedar fijo para siempre. Por eso las tablas de detalle copian el precio en el momento de la venta.\n\nEste cruce es de tipo «muchos a uno», porque varios ítems pueden apuntar al mismo producto, así que nunca multiplica las filas de `order_items`.",
    reward: defaultReward("easy"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "cuotas-largas-en-pesos",
    section,
    title: "12 cuotas en pesos argentinos",
    difficulty: "intermediate",
    estimated_minutes: 7,
    concepts: ["inner_join", "where"],
    dataset,
    tables_used: ["orders", "payments"],
    scenario_md:
      "El departamento de Finanzas está evaluando el costo financiero de las ventas en 12 cuotas en Argentina. Necesita los pedidos expresados en pesos argentinos cuyo pago **aprobado** se hizo en 12 cuotas, y te pide ese listado para calcular el costo real de la promoción.",
    business_question_md:
      "Debes generar un dataset que devuelva el `id` y el `total_amount` del pedido junto con el `amount` del pago, para los pedidos cuyo `currency` es igual al texto `'ARS'` unidos a sus pagos cuya columna `installments` es igual a `12` y cuyo `status` es igual al texto `'approved'`. El orden de las filas no importa.",
    learning_objective: "Acotar una relación uno-a-muchos con condiciones sobre la tabla «muchos».",
    theory_ref: varias,
    expected_columns: [
      { name: "id", type: "integer" },
      { name: "total_amount", type: "numeric" },
      { name: "amount", type: "numeric" },
    ],
    validation_rules: { required_concepts: ["inner_join", "where"] },
    reference_solution:
      "SELECT o.id, o.total_amount, pay.amount\nFROM orders AS o\nINNER JOIN payments AS pay ON pay.order_id = o.id\nWHERE o.currency = 'ARS'\n  AND pay.installments = 12\n  AND pay.status = 'approved';",
    alternative_solutions: [
      {
        label: "Condiciones en el ON",
        sql: "SELECT o.id, o.total_amount, pay.amount FROM orders o JOIN payments pay ON pay.order_id = o.id AND pay.installments = 12 AND pay.status = 'approved' WHERE o.currency = 'ARS';",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Un mismo pedido puede tener varios pagos, porque los intentos rechazados también quedan registrados. Las condiciones sobre la tabla `payments` son las que dejan un solo pago por pedido.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Une las tablas con la igualdad `payments.order_id = orders.id` y filtra tres cosas: la moneda del pedido, la cantidad de cuotas del pago y el estado del pago.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT o.id, o.total_amount, pay.amount\nFROM orders AS o\nINNER JOIN payments AS pay ON pay.___ = o.id\nWHERE o.currency = '___'\n  AND pay.installments = ___\n  AND pay.status = '___';\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "missing_filter",
        description_md:
          "Olvidar la condición `status = 'approved'`: entran los pagos rechazados y algunos pedidos aparecen dos veces en el resultado.",
      },
      {
        category: "join_condition",
        description_md:
          "Escribir `ON pay.id = o.id`: se unen dos identificadores que no se relacionan entre sí.",
      },
      {
        category: "wrong_columns",
        description_md:
          "Devolver `pay.id`, que es el identificador del pago, en lugar de `o.id`, que es el identificador del pedido que pidió Finanzas.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 208 pedidos, uno por fila, porque un pedido tiene como máximo un pago aprobado. Sin el filtro de estado verías pedidos repetidos por cada uno de sus intentos rechazados.\n\nPoner las condiciones sobre `payments` dentro del `ON` o dentro del `WHERE` da exactamente el mismo resultado cuando el cruce es un `INNER JOIN`; con un `LEFT JOIN`, como vas a ver en la sección 18, la diferencia entre los dos lugares es enorme.",
    reward: defaultReward("intermediate"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "resenas-de-una-estrella-en-peru",
    section,
    title: "Reseñas de una estrella en Perú",
    difficulty: "intermediate",
    estimated_minutes: 8,
    concepts: ["inner_join", "where", "alias"],
    dataset,
    tables_used: ["reviews", "customers", "products"],
    scenario_md:
      "El equipo de Perú quiere llamar por teléfono a los clientes que dejaron una estrella, y necesita saber qué producto calificó cada uno para poder encarar la conversación. Te piden ese cruce porque el cliente, el producto y la reseña están en tres tablas distintas.",
    business_question_md:
      "Debes generar un dataset que devuelva el `full_name` del cliente, el nombre del producto bajo el encabezado `product_name` y el `rating`, para las reseñas cuyo `rating` es igual a `1` hechas por clientes cuyo `country` es igual al texto `'PE'`. El orden de las filas no importa.",
    learning_objective:
      "Encadenar dos JOIN desde una tabla central y renombrar columnas repetidas.",
    theory_ref: varias,
    expected_columns: [
      { name: "full_name", type: "text" },
      { name: "product_name", type: "text" },
      { name: "rating", type: "integer" },
    ],
    validation_rules: { required_concepts: ["inner_join", "alias"] },
    reference_solution:
      "SELECT c.full_name, p.name AS product_name, r.rating\nFROM reviews AS r\nINNER JOIN customers AS c ON c.id = r.customer_id\nINNER JOIN products AS p ON p.id = r.product_id\nWHERE r.rating = 1\n  AND c.country = 'PE';",
    hints: [
      {
        level: 1,
        body_md:
          "La tabla `reviews` tiene las columnas `customer_id` y `product_id`, así que es la tabla central del cruce: desde ella sale un `JOIN` hacia cada lado.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "La columna con el nombre del producto se llama `name`, y la consigna la pide bajo el encabezado `product_name`. Filtra con las condiciones `r.rating = 1` y `c.country = 'PE'`.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT c.full_name, p.name AS product_name, r.rating\nFROM reviews AS r\nINNER JOIN customers AS c ON c.id = r.___\nINNER JOIN products AS p ON p.id = r.___\nWHERE r.rating = 1\n  AND c.country = '___';\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "join_condition",
        description_md:
          "Intentar unir la tabla `customers` directamente con la tabla `products`: no comparten ninguna clave y el cruce tiene que pasar por `reviews`.",
      },
      {
        category: "wrong_columns",
        description_md:
          "Devolver `p.name` sin el alias `product_name`: el encabezado no coincide con el que pidió la consigna.",
      },
      {
        category: "missing_filter",
        description_md:
          "Buscar el país en la tabla `products` o en la tabla `reviews`: la columna `country` está en la tabla `customers`.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 33 reseñas. Cada reseña tiene un solo cliente y un solo producto, así que los dos cruces son de tipo «muchos a uno» y el resultado conserva una fila por reseña.\n\nEmpezar la consulta por la tabla central la hace más legible: se ve de inmediato que el nivel de detalle del reporte es «una fila por reseña», que es justamente lo que pidió el equipo de Perú.",
    reward: defaultReward("intermediate"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "arbol-de-categorias-del-vendedor-3",
    section,
    title: "Desafío: el árbol de categorías",
    difficulty: "intermediate",
    estimated_minutes: 10,
    concepts: ["inner_join", "self_join", "alias", "order_by"],
    dataset,
    tables_used: ["products", "categories"],
    scenario_md:
      "El vendedor **Bazar Urbano 3**, que en la tabla `sellers` tiene el `id` igual a 3 y opera desde Perú, quiere ver cómo se clasifica su catálogo completo para saber en qué rubros está concentrado: necesita la subcategoría de cada producto y la categoría raíz a la que pertenece esa subcategoría. Pide el listado agrupado por rubro, tal como lo leería en una reunión. Ten en cuenta que en la tabla `categories` la columna `parent_id` apunta a la categoría padre.",
    business_question_md:
      "Debes generar un dataset que, para los productos cuyo `seller_id` es igual a `3`, devuelva el `name` del producto, el nombre de su categoría bajo el encabezado `subcategoria` y el nombre de la categoría padre bajo el encabezado `categoria`. Ordena por `categoria`, después por `subcategoria` y después por el nombre del producto, las tres claves en forma ascendente.",
    learning_objective:
      "Unir la misma tabla dos veces con alias distintos para recorrer una jerarquía.",
    theory_ref: varias,
    expected_columns: [
      { name: "name", type: "text" },
      { name: "subcategoria", type: "text" },
      { name: "categoria", type: "text" },
    ],
    validation_rules: { order_matters: true, required_concepts: ["inner_join", "alias"] },
    reference_solution:
      "SELECT p.name, sub.name AS subcategoria, raiz.name AS categoria\nFROM products AS p\nINNER JOIN categories AS sub ON sub.id = p.category_id\nINNER JOIN categories AS raiz ON raiz.id = sub.parent_id\nWHERE p.seller_id = 3\nORDER BY raiz.name, sub.name, p.name;",
    hints: [
      {
        level: 1,
        body_md:
          "Necesitas usar la tabla `categories` dos veces: una vez para la subcategoría del producto y otra vez para la categoría padre de esa subcategoría.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Dale un alias distinto a cada aparición de la tabla, por ejemplo `sub` y `raiz`. La segunda aparición se une con la condición `raiz.id = sub.parent_id`.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT p.name, sub.name AS subcategoria, raiz.name AS categoria\nFROM products AS p\nINNER JOIN categories AS sub ON sub.id = p.___\nINNER JOIN categories AS raiz ON raiz.id = sub.___\nWHERE p.seller_id = 3\nORDER BY ___.name, ___.name, p.name;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "syntax",
        description_md:
          "Unir la tabla `categories` dos veces sin darle alias: PostgreSQL devuelve el error «table name specified more than once».",
      },
      {
        category: "join_condition",
        description_md:
          "Escribir `raiz.id = p.category_id` en la segunda unión: la consulta devuelve la misma subcategoría repetida en las dos columnas, en lugar de subir un nivel en la jerarquía.",
      },
      {
        category: "wrong_order",
        description_md:
          "Ordenar por `p.id`: el listado sale en el orden en que se cargaron los productos y el vendedor no puede leer sus rubros de un vistazo, que es justamente lo que pidió.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 7 productos, cada uno con su subcategoría y su categoría raíz. Ordenados por rubro, la respuesta de negocio se lee de una sola vez: tres productos en Belleza, dos en Hogar, uno en Juguetes y uno en Tecnología. Esa concentración es lo que el vendedor quería ver.\n\nLas claves del `ORDER BY` son columnas de las tablas unidas, como `raiz.name` y `sub.name`, y no columnas del `SELECT`: puedes ordenar por cualquier columna disponible después del `FROM`, tenga alias o no.\n\nComo todos los productos de este vendedor cuelgan de subcategorías y ninguno cuelga directamente de una raíz, el `INNER JOIN` no pierde filas. Si algún producto estuviera clasificado en una categoría raíz, su `sub.parent_id` estaría en `NULL` y ese producto desaparecería del reporte; en ese caso necesitarías un `LEFT JOIN`.\n\nRecorrer jerarquías de profundidad fija con una autounión es una técnica habitual; para jerarquías de profundidad variable existen las expresiones de tabla común recursivas, que vas a ver en la sección 22.",
    reward: defaultReward("intermediate"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
];
