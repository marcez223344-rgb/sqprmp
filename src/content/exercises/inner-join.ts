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
      "Para la campaña uruguaya, Marketing necesita el catálogo de los vendedores de Uruguay con el nombre de cada tienda junto al producto.",
    business_question_md:
      "Devuelve `id` y `name` del producto y `store_name` de su vendedor, solo para vendedores con `country` igual a `'UY'`. El orden no importa.",
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
        body_md: "`products.seller_id` apunta a `sellers.id`. Esa es la condición del `ON`.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Usa alias (`p`, `s`) y califica cada columna. El filtro de país va en `WHERE` sobre la tabla `sellers`.",
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
          "`ON s.id = p.id`: une productos y vendedores con el mismo número de id; devuelve 180 filas sin sentido.",
      },
      {
        category: "syntax",
        description_md:
          "`SELECT id, name` sin alias: `id` y `name` son ambiguos (existen en ambas tablas).",
      },
      {
        category: "missing_filter",
        description_md: "Olvidar el `WHERE` y devolver los 1500 productos.",
      },
    ],
    expert_explanation_md:
      "41 productos. Cada producto tiene exactamente un vendedor, así que el JOIN no multiplica filas: el resultado tiene una fila por producto uruguayo.\n\nEl filtro sobre `s.country` se evalúa después de la unión; el motor suele reordenarlo internamente para filtrar primero, pero el resultado es el mismo.",
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
      "Un cliente reclama por el pedido **13**. Atención al cliente necesita ver qué productos incluía, con cantidad y precio unitario.",
    business_question_md:
      "Devuelve `id` del ítem (`order_items.id`), `name` del producto, `quantity` y `unit_price` para los ítems del pedido con `order_id` igual a 13, ordenados por `id` del ítem ascendente.",
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
          "La tabla base es `order_items`; el nombre del producto vive en `products`. Conéctalas por `product_id`.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Ambas tablas tienen `id`: el que pide la consigna es el del ítem (`oi.id`). Filtra por `oi.order_id = 13`.",
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
        description_md: "Devolver `p.id` (id del producto) en lugar de `oi.id` (id del ítem).",
      },
      {
        category: "join_condition",
        description_md: "`ON p.id = oi.order_id`: une productos con el número de pedido.",
      },
      {
        category: "wrong_order",
        description_md: "Omitir `ORDER BY oi.id`.",
      },
    ],
    expert_explanation_md:
      "4 ítems. `unit_price` se guarda en `order_items`, no en `products`: el precio de lista puede cambiar, pero el precio al que se vendió cada ítem debe quedar fijo. Por eso las tablas de detalle copian el precio.\n\nEste JOIN es «muchos a uno» (varios ítems apuntan al mismo producto), así que nunca multiplica filas de `order_items`.",
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
      "Finanzas evalúa el costo financiero de las 12 cuotas en Argentina. Necesita los pedidos en `ARS` cuyo pago **aprobado** fue en 12 cuotas.",
    business_question_md:
      "Devuelve `id` y `total_amount` del pedido y `amount` del pago para los pedidos con `currency` igual a `'ARS'` unidos a sus pagos con `installments` igual a 12 y `status` igual a `'approved'`. El orden no importa.",
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
          "Un pedido puede tener varios pagos (intentos rechazados). Las condiciones sobre `payments` dejan uno solo por pedido.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Une `payments.order_id = orders.id` y filtra tres cosas: moneda del pedido, cuotas y estado del pago.",
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
          "Olvidar `status = 'approved'`: entran pagos rechazados y algunos pedidos aparecen dos veces.",
      },
      {
        category: "join_condition",
        description_md: "`ON pay.id = o.id`: une por ids que no se relacionan.",
      },
      {
        category: "wrong_columns",
        description_md: "Devolver `pay.id` en lugar de `o.id`.",
      },
    ],
    expert_explanation_md:
      "208 pedidos, uno por fila, porque un pedido tiene a lo sumo un pago aprobado. Sin el filtro de estado verías pedidos repetidos por sus intentos rechazados.\n\nPoner las condiciones de `payments` en el `ON` o en el `WHERE` da el mismo resultado con INNER JOIN; con LEFT JOIN (sección 18) la diferencia es enorme.",
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
      "El equipo de Perú quiere llamar a los clientes que dejaron una estrella, sabiendo qué producto calificaron.",
    business_question_md:
      "Devuelve `full_name` del cliente, el nombre del producto como `product_name` y `rating`, para las reseñas con `rating` igual a 1 de clientes con `country` igual a `'PE'`. El orden no importa.",
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
          "`reviews` tiene `customer_id` y `product_id`: es la tabla central. Un JOIN hacia cada lado.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "El nombre del producto se llama `name`; la consigna lo quiere como `product_name`. Filtra `r.rating = 1` y `c.country = 'PE'`.",
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
          "Intentar unir `customers` con `products` directamente: no comparten clave.",
      },
      {
        category: "wrong_columns",
        description_md: "Devolver `p.name` sin el alias `product_name`.",
      },
      {
        category: "missing_filter",
        description_md:
          "Filtrar el país en `products` o en `reviews`: la columna `country` está en `customers`.",
      },
    ],
    expert_explanation_md:
      "33 reseñas. Cada reseña tiene un cliente y un producto, así que los dos JOIN son «muchos a uno» y el resultado conserva una fila por reseña.\n\nEmpezar por la tabla central hace la consulta más legible: se ve de inmediato que el nivel del reporte es «una fila por reseña».",
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
      "El vendedor **3** (Bazar Urbano 3) quiere ver cómo se clasifica su catálogo: la subcategoría de cada producto y la categoría raíz a la que pertenece. En `categories`, `parent_id` apunta a la categoría padre.",
    business_question_md:
      "Para los productos con `seller_id` igual a 3, devuelve `name` del producto, el nombre de su categoría como `subcategoria` y el nombre de la categoría padre como `categoria`, ordenados por `id` del producto ascendente.",
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
      "SELECT p.name, sub.name AS subcategoria, raiz.name AS categoria\nFROM products AS p\nINNER JOIN categories AS sub ON sub.id = p.category_id\nINNER JOIN categories AS raiz ON raiz.id = sub.parent_id\nWHERE p.seller_id = 3\nORDER BY p.id;",
    hints: [
      {
        level: 1,
        body_md:
          "Necesitas `categories` dos veces: una para la subcategoría del producto y otra para el padre de esa subcategoría.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Dale un alias a cada aparición (`sub`, `raiz`). La segunda se une por `raiz.id = sub.parent_id`.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT p.name, sub.name AS subcategoria, raiz.name AS categoria\nFROM products AS p\nINNER JOIN categories AS sub ON sub.id = p.___\nINNER JOIN categories AS raiz ON raiz.id = sub.___\nWHERE p.seller_id = 3\nORDER BY p.id;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "syntax",
        description_md:
          "Unir `categories` dos veces sin alias: «table name specified more than once».",
      },
      {
        category: "join_condition",
        description_md:
          "`raiz.id = p.category_id` en la segunda unión: devuelve la misma subcategoría dos veces.",
      },
      {
        category: "wrong_order",
        description_md: "Ordenar por `p.name` en lugar de por `p.id`.",
      },
    ],
    expert_explanation_md:
      "7 productos, cada uno con su subcategoría y su raíz (Belleza, Hogar, Tecnología, Juguetes). Como todos los productos cuelgan de subcategorías (ninguno de una raíz), el INNER JOIN no pierde filas; si algún producto estuviera en una categoría raíz, `sub.parent_id` sería NULL y ese producto desaparecería. Ahí necesitarías un LEFT JOIN.\n\nRecorrer jerarquías de profundidad fija con self join es habitual; para profundidad variable existen las CTE recursivas (sección 22).",
    reward: defaultReward("intermediate"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
];
