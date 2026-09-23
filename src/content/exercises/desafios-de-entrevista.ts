import {
  defaultHintMeta,
  defaultReward,
  defaultSolutionUnlock,
  type ExerciseDef,
} from "../schemas/exercise";

const section = "desafios-de-entrevista";
const patrones = "entrevista-patrones-clasicos";
const razonar = "entrevista-como-razonar-en-voz-alta";
const errores = "entrevista-errores-que-cuestan-la-oferta";

export const exercises: ExerciseDef[] = [
  {
    slug: "entrevista-segundo-mas-vendido-por-categoria",
    section,
    title: "El segundo más vendido de cada categoría",
    difficulty: "intermediate",
    estimated_minutes: 10,
    concepts: ["ranking", "window_function", "cte", "group_by", "aggregate", "inner_join"],
    dataset: { slug: "tiendaviva", version: 1 },
    tables_used: ["order_items", "products", "categories"],
    scenario_md:
      "Estás en una entrevista para un puesto de analista en **TiendaViva**. La entrevistadora comparte el esquema y dice: «clásico: dame el segundo producto más vendido de cada categoría». Y agrega: «si hay empates, quiero verlos todos».",
    business_question_md:
      "Considera todos los `order_items`, sin filtrar por estado del pedido (es el supuesto que te dieron). Suma las unidades (`quantity`) vendidas por producto, agrupa por categoría y devuelve los productos que ocupan el **segundo nivel de unidades vendidas** dentro de su categoría: es decir, aquellos cuyo total es el segundo valor distinto más alto de la categoría. Si varios productos comparten ese total, devuélvelos todos. Columnas: `categoria` (nombre de la categoría), `product_name` y `unidades`. Ordena por `categoria` y luego por `product_name`.",
    learning_objective:
      "Resolver el clásico del segundo valor más alto por grupo eligiendo la función de ranking correcta ante empates.",
    theory_ref: patrones,
    expected_columns: [
      { name: "categoria", type: "text" },
      { name: "product_name", type: "text" },
      { name: "unidades", type: "integer" },
    ],
    validation_rules: {
      order_matters: true,
      required_concepts: ["group_by", "inner_join"],
    },
    reference_solution: `WITH ventas AS (
  SELECT p.category_id, p.id AS product_id, p.name AS product_name, sum(oi.quantity) AS unidades
  FROM order_items AS oi
  INNER JOIN products AS p ON p.id = oi.product_id
  GROUP BY p.category_id, p.id, p.name
),
niveles AS (
  SELECT
    category_id,
    product_name,
    unidades,
    dense_rank() OVER (PARTITION BY category_id ORDER BY unidades DESC) AS nivel
  FROM ventas
)
SELECT
  c.name AS categoria,
  n.product_name,
  n.unidades
FROM niveles AS n
INNER JOIN categories AS c ON c.id = n.category_id
WHERE n.nivel = 2
ORDER BY c.name, n.product_name;`,
    alternative_solutions: [
      {
        label: "Subconsultas anidadas en lugar de CTE",
        sql: `SELECT c.name AS categoria, n.product_name, n.unidades
FROM (
  SELECT
    category_id,
    product_name,
    unidades,
    dense_rank() OVER (PARTITION BY category_id ORDER BY unidades DESC) AS nivel
  FROM (
    SELECT p.category_id, p.name AS product_name, sum(oi.quantity) AS unidades
    FROM order_items AS oi
    INNER JOIN products AS p ON p.id = oi.product_id
    GROUP BY p.category_id, p.id, p.name
  ) AS v
) AS n
INNER JOIN categories AS c ON c.id = n.category_id
WHERE n.nivel = 2
ORDER BY 1, 2;`,
      },
      {
        label: "Sin funciones de ventana: el máximo por debajo del máximo",
        sql: `WITH ventas AS (
  SELECT p.category_id, p.id AS product_id, p.name AS product_name, sum(oi.quantity) AS unidades
  FROM order_items AS oi
  INNER JOIN products AS p ON p.id = oi.product_id
  GROUP BY p.category_id, p.id, p.name
),
maximos AS (
  SELECT category_id, max(unidades) AS nivel1 FROM ventas GROUP BY category_id
),
segundos AS (
  SELECT v.category_id, max(v.unidades) AS nivel2
  FROM ventas AS v
  INNER JOIN maximos AS m ON m.category_id = v.category_id
  WHERE v.unidades < m.nivel1
  GROUP BY v.category_id
)
SELECT c.name AS categoria, v.product_name, v.unidades
FROM ventas AS v
INNER JOIN segundos AS s ON s.category_id = v.category_id AND v.unidades = s.nivel2
INNER JOIN categories AS c ON c.id = v.category_id
ORDER BY c.name, v.product_name;`,
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Primero agrega: una fila por producto con sus unidades vendidas. Recién sobre ese resultado tiene sentido hablar de «primero» y «segundo». Y antes de escribir, decide qué significa «segundo» cuando dos productos venden lo mismo.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Te piden el segundo **valor distinto**, con todos sus empatados: eso es exactamente `dense_rank()`. Con `rank()` perderías las categorías cuyo primer puesto está empatado (el siguiente puesto sería 3, no 2) y con `row_number()` devolverías un solo producto por categoría aunque haya empate.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nWITH ventas AS (\n  SELECT p.category_id, p.id, p.name AS product_name, ___(oi.quantity) AS unidades\n  FROM order_items AS oi\n  INNER JOIN products AS p ON p.id = oi.product_id\n  GROUP BY ___\n),\nniveles AS (\n  SELECT\n    category_id,\n    product_name,\n    unidades,\n    ___() OVER (PARTITION BY ___ ORDER BY unidades ___) AS nivel\n  FROM ventas\n)\nSELECT c.name AS categoria, n.product_name, n.unidades\nFROM niveles AS n\nINNER JOIN categories AS c ON c.id = n.category_id\nWHERE nivel = ___\nORDER BY 1, 2;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "cell_values",
        description_md:
          "Usar `row_number()`: devuelve un solo producto por categoría y elige de forma arbitraria entre los empatados.",
      },
      {
        category: "row_count",
        description_md:
          "Usar `rank()`: en las categorías cuyo primer lugar está empatado no existe el puesto 2 y esas categorías desaparecen del resultado.",
      },
      {
        category: "aggregation_level",
        description_md:
          "Numerar antes de agregar: si el ranking se calcula sobre `order_items` sin sumar por producto, ordena por unidades de una línea de pedido, no por el total del producto.",
      },
      {
        category: "wrong_order",
        description_md:
          "Ordenar solo por `categoria`: dentro de una categoría con empate el orden de las filas queda indefinido.",
      },
    ],
    expert_explanation_md:
      "28 filas para 24 categorías: cuatro categorías (**Audio**, **Fútbol**, **Muebles** y **Outdoor**) tienen dos productos empatados en el segundo nivel, y el pedido era mostrarlos todos.\n\nLa decisión que evalúa esta pregunta es la función de ranking:\n\n- `dense_rank()` numera **niveles de valor**: el segundo valor distinto siempre existe si la categoría tiene al menos dos totales diferentes. Es lo que pidió el negocio.\n- `rank()` deja huecos. En **Ciclismo** hay cuatro productos empatados en el primer lugar, así que el puesto siguiente es el 5 y `rank() = 2` no devuelve nada: junto con **Construcción** y **Muebles**, tres categorías se caen del reporte sin ningún aviso.\n- `row_number()` siempre devuelve exactamente una fila por categoría, eligiendo entre empatados por un criterio arbitrario: el resultado puede cambiar entre ejecuciones.\n\nLa alternativa sin ventanas (`max(unidades)` por debajo del máximo) es la que se espera si el entrevistador prohíbe funciones de ventana, y da exactamente el mismo resultado: tres pasos, un poco más de código y el mismo criterio de empate.\n\nSobre el supuesto: incluir todos los estados de pedido no es obvio. En una entrevista conviene decir «estoy contando también los cancelados y devueltos; si el negocio solo considera entregados, agrego `WHERE o.status = 'delivered'` y el ranking puede cambiar».",
    reward: defaultReward("intermediate"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "entrevista-repartidores-sin-entregas",
    section,
    title: "Repartidores sin entregas: la trampa de NOT IN",
    difficulty: "intermediate",
    estimated_minutes: 10,
    concepts: ["subquery", "null_handling", "inner_join", "where", "date_functions"],
    dataset: { slug: "pidelo", version: 1 },
    tables_used: ["couriers", "orders", "cities"],
    scenario_md:
      "Segunda pregunta de la entrevista, ahora con datos de **Pídelo**: «Operaciones quiere depurar la flota. Dame los repartidores activos que no tomaron ningún pedido en agosto de 2025».",
    business_question_md:
      "Devuelve los repartidores con `is_active = true` que **no** estén asignados a ningún pedido con `placed_at` dentro de agosto de 2025 **en UTC** (desde el 2025-08-01 00:00 inclusive hasta el 2025-09-01 00:00 exclusive). Columnas: `courier_id`, `full_name`, `city` (nombre de la ciudad), `vehicle` y `started_at`. Ordena por `city`, `full_name` y `courier_id`.",
    learning_objective:
      "Resolver una antiunión con NOT EXISTS y reconocer por qué NOT IN devuelve cero filas cuando la subconsulta contiene NULL.",
    theory_ref: errores,
    expected_columns: [
      { name: "courier_id", type: "integer" },
      { name: "full_name", type: "text" },
      { name: "city", type: "text" },
      { name: "vehicle", type: "text" },
      { name: "started_at", type: "date" },
    ],
    validation_rules: {
      order_matters: true,
      required_concepts: ["inner_join"],
    },
    reference_solution: `SELECT
  c.id AS courier_id,
  c.full_name,
  ci.name AS city,
  c.vehicle,
  c.started_at
FROM couriers AS c
INNER JOIN cities AS ci ON ci.id = c.city_id
WHERE c.is_active
  AND NOT EXISTS (
    SELECT 1
    FROM orders AS o
    WHERE o.courier_id = c.id
      AND o.placed_at >= timestamptz '2025-08-01 00:00:00+00'
      AND o.placed_at < timestamptz '2025-09-01 00:00:00+00'
  )
ORDER BY ci.name, c.full_name, c.id;`,
    alternative_solutions: [
      {
        label: "LEFT JOIN con la condición en el ON",
        sql: `SELECT c.id AS courier_id, c.full_name, ci.name AS city, c.vehicle, c.started_at
FROM couriers AS c
INNER JOIN cities AS ci ON ci.id = c.city_id
LEFT JOIN orders AS o
  ON o.courier_id = c.id
 AND o.placed_at >= timestamptz '2025-08-01 00:00:00+00'
 AND o.placed_at < timestamptz '2025-09-01 00:00:00+00'
WHERE c.is_active AND o.id IS NULL
ORDER BY ci.name, c.full_name, c.id;`,
      },
      {
        label: "NOT IN, pero excluyendo los NULL de la subconsulta",
        sql: `SELECT c.id AS courier_id, c.full_name, ci.name AS city, c.vehicle, c.started_at
FROM couriers AS c
INNER JOIN cities AS ci ON ci.id = c.city_id
WHERE c.is_active
  AND c.id NOT IN (
    SELECT o.courier_id
    FROM orders AS o
    WHERE o.courier_id IS NOT NULL
      AND o.placed_at >= timestamptz '2025-08-01 00:00:00+00'
      AND o.placed_at < timestamptz '2025-09-01 00:00:00+00'
  )
ORDER BY ci.name, c.full_name, c.id;`,
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Es una antiunión: quieres las filas de una tabla que **no** tienen pareja en la otra. Hay tres formas de escribirla y no todas se comportan igual cuando la columna de la otra tabla admite nulos.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "`orders.courier_id` es nulo en los pedidos cancelados, así que `NOT IN (SELECT courier_id ...)` devuelve cero filas. Usa `NOT EXISTS` con la correlación `o.courier_id = c.id`, y pon el rango de fechas **dentro** de la subconsulta. El rango va semiabierto: `>= '2025-08-01'` y `< '2025-09-01'`, en UTC.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT c.id AS courier_id, c.full_name, ci.name AS city, c.vehicle, c.started_at\nFROM couriers AS c\nINNER JOIN cities AS ci ON ci.id = c.city_id\nWHERE c.is_active\n  AND ___ ___ (\n    SELECT 1\n    FROM orders AS o\n    WHERE o.courier_id = ___\n      AND o.placed_at ___ timestamptz '___'\n      AND o.placed_at ___ timestamptz '___'\n  )\nORDER BY ci.name, c.full_name, c.id;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "null_handling",
        description_md:
          "Escribir `c.id NOT IN (SELECT courier_id FROM orders WHERE ...)`: la subconsulta incluye nulos y el resultado es una tabla vacía, no un error.",
      },
      {
        category: "join_condition",
        description_md:
          "Hacer `LEFT JOIN orders` y filtrar el rango de fechas en el `WHERE`: eso descarta las filas sin coincidencia y convierte el `LEFT JOIN` en un `INNER JOIN`.",
      },
      {
        category: "date_boundary",
        description_md:
          "Usar `BETWEEN '2025-08-01' AND '2025-08-31'`: deja fuera casi todo el 31 de agosto porque el extremo se interpreta como medianoche.",
      },
      {
        category: "missing_filter",
        description_md:
          "Olvidar `is_active`: entran repartidores dados de baja, que por definición no tomaron pedidos.",
      },
    ],
    expert_explanation_md:
      "73 de los 503 repartidores activos no tomaron ningún pedido en agosto de 2025.\n\nLa trampa está viva en estos datos: en agosto hubo 1280 pedidos y 101 de ellos están cancelados y sin repartidor asignado, así que `SELECT courier_id FROM orders WHERE ...` devuelve nulos. `c.id NOT IN (1, 7, NULL)` nunca se evalúa como verdadero —el motor no puede afirmar que `c.id` sea distinto de un valor desconocido—, así que la consulta devuelve **cero filas**. Y cero filas parece una respuesta: «ningún repartidor estuvo inactivo». Ese es el error que cuesta la oferta.\n\n`NOT EXISTS` no tiene el problema porque pregunta por la existencia de filas, no compara valores: un nulo simplemente no coincide con nada. La versión con `LEFT JOIN ... WHERE o.id IS NULL` es igual de correcta, siempre que el rango de fechas viaje en el `ON`; si lo mueves al `WHERE`, eliminas justo las filas que buscabas.\n\nY si el entrevistador insiste en `NOT IN`, la respuesta profesional es agregar `WHERE o.courier_id IS NOT NULL` dentro de la subconsulta y explicar por qué hace falta.\n\nEl rango semiabierto (`>=` y `<`) evita el otro clásico: con `BETWEEN` y marcas de tiempo perderías las entregas del 31 de agosto después de la medianoche. Como `placed_at` es `timestamptz`, decir «agosto en UTC» forma parte de la respuesta.",
    reward: defaultReward("intermediate"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "entrevista-comercios-con-cero-alertas",
    section,
    title: "Comercios con cero alertas",
    difficulty: "advanced",
    estimated_minutes: 12,
    concepts: ["outer_join", "aggregate", "group_by", "null_handling", "date_functions"],
    dataset: { slug: "bolsillo", version: 1 },
    tables_used: ["merchants", "transactions"],
    scenario_md:
      "Tercera pregunta, con datos de **Bolsillo**: «El equipo de riesgo quiere un tablero con **todos** los comercios y cuántas transacciones marcadas acumuló cada uno en 2025. Los comercios sin alertas tienen que aparecer con cero, no desaparecer».",
    business_question_md:
      "Devuelve una fila por cada comercio de `merchants` (los 300, incluso los que no tienen transacciones marcadas). Considera solo las transacciones con `is_flagged = true` y `created_at` desde el 2025-01-01 00:00 **en UTC** en adelante. Columnas: `merchant_id`, `name`, `category`, `transacciones_marcadas` (cantidad, 0 si no hay) y `monto_marcado` (suma de `amount`, 0 si no hay). Ordena por `transacciones_marcadas` descendente, luego por `name` y luego por `merchant_id`.",
    learning_objective:
      "Conservar las filas sin coincidencia en un LEFT JOIN filtrado y contar correctamente los ceros.",
    theory_ref: errores,
    expected_columns: [
      { name: "merchant_id", type: "integer" },
      { name: "name", type: "text" },
      { name: "category", type: "text" },
      { name: "transacciones_marcadas", type: "integer" },
      { name: "monto_marcado", type: "numeric" },
    ],
    validation_rules: {
      order_matters: true,
      required_concepts: ["outer_join", "group_by"],
    },
    reference_solution: `SELECT
  m.id AS merchant_id,
  m.name,
  m.category,
  count(t.id) AS transacciones_marcadas,
  coalesce(sum(t.amount), 0) AS monto_marcado
FROM merchants AS m
LEFT JOIN transactions AS t
  ON t.merchant_id = m.id
 AND t.is_flagged
 AND t.created_at >= timestamptz '2025-01-01 00:00:00+00'
GROUP BY m.id, m.name, m.category
ORDER BY transacciones_marcadas DESC, m.name, m.id;`,
    alternative_solutions: [
      {
        label: "Agregar primero y unir después",
        sql: `SELECT
  m.id AS merchant_id,
  m.name,
  m.category,
  coalesce(f.marcadas, 0) AS transacciones_marcadas,
  coalesce(f.monto, 0) AS monto_marcado
FROM merchants AS m
LEFT JOIN (
  SELECT merchant_id, count(*) AS marcadas, sum(amount) AS monto
  FROM transactions
  WHERE is_flagged AND created_at >= timestamptz '2025-01-01 00:00:00+00'
  GROUP BY merchant_id
) AS f ON f.merchant_id = m.id
ORDER BY transacciones_marcadas DESC, m.name, m.id;`,
      },
      {
        label: "Subconsultas correlacionadas",
        sql: `SELECT
  m.id AS merchant_id,
  m.name,
  m.category,
  (SELECT count(*) FROM transactions AS t
    WHERE t.merchant_id = m.id AND t.is_flagged
      AND t.created_at >= timestamptz '2025-01-01 00:00:00+00') AS transacciones_marcadas,
  coalesce((SELECT sum(t.amount) FROM transactions AS t
    WHERE t.merchant_id = m.id AND t.is_flagged
      AND t.created_at >= timestamptz '2025-01-01 00:00:00+00'), 0) AS monto_marcado
FROM merchants AS m
ORDER BY 4 DESC, m.name, m.id;`,
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "El resultado tiene que tener exactamente 300 filas, una por comercio. Eso te dice cuál es la tabla obligatoria y cuál la opcional, y dónde puede vivir cada condición.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Las condiciones sobre `transactions` (`is_flagged` y el rango de fechas) van en el `ON` del `LEFT JOIN`: si las pones en el `WHERE`, los comercios sin alertas desaparecen. Para contar usa `count(t.id)`, no `count(*)`, y envuelve la suma en `coalesce(..., 0)`.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT\n  m.id AS merchant_id,\n  m.name,\n  m.category,\n  ___(___) AS transacciones_marcadas,\n  ___(sum(t.amount), 0) AS monto_marcado\nFROM merchants AS m\n___ JOIN transactions AS t\n  ON t.merchant_id = m.id\n ___ t.is_flagged\n ___ t.created_at >= timestamptz '___'\nGROUP BY m.id, m.name, m.category\nORDER BY transacciones_marcadas DESC, m.name, m.id;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "join_condition",
        description_md:
          "Poner `WHERE t.is_flagged AND t.created_at >= ...`: las filas sin coincidencia traen nulos, el `WHERE` las descarta y el `LEFT JOIN` se comporta como un `INNER JOIN`.",
      },
      {
        category: "null_handling",
        description_md:
          "Contar con `count(*)`: cuenta la fila del comercio aunque no tenga transacción y los 249 comercios sin alertas informan 1 en lugar de 0.",
      },
      {
        category: "null_handling",
        description_md:
          "Devolver `sum(t.amount)` sin `coalesce`: los comercios sin alertas quedan con `NULL` en el monto y el tablero muestra un hueco en vez de un cero.",
      },
      {
        category: "row_count",
        description_md:
          "Entregar 51 filas y no notarlo: el pedido decía «todos los comercios», así que el resultado tiene que tener 300.",
      },
    ],
    expert_explanation_md:
      "300 filas, una por comercio. En 2025 hay 92 transacciones marcadas, pero 36 no tienen comercio asociado (son cargas y retiros), así que solo 51 comercios acumulan alguna alerta: los otros **249 informan cero**, que es justo la parte del pedido que esta pregunta evalúa.\n\nDos errores producen aquí un resultado plausible y falso:\n\n1. **La condición en el `WHERE`.** `LEFT JOIN transactions ... WHERE t.is_flagged` descarta las filas sin coincidencia, porque en ellas `t.is_flagged` es `NULL` y `NULL` no es verdadero. El resultado baja a 51 filas y parece correcto si no cuentas.\n2. **`count(*)` en lugar de `count(t.id)`.** `count(*)` cuenta filas, y un comercio sin alertas sigue siendo una fila: los 249 ceros se convierten en 249 unos. `count(t.id)` solo cuenta valores no nulos.\n\nLa versión que agrega primero y une después (`LEFT JOIN (SELECT ... GROUP BY merchant_id)`) suele ser la más clara cuando hay varias métricas o varias tablas opcionales, y evita la discusión sobre dónde poner cada condición: el filtro vive dentro de la subconsulta, donde no hay nada opcional.\n\nEl empate de la cabecera (cinco comercios con 2 alertas) es la razón del `ORDER BY` de tres claves: sin `name` y `merchant_id` como desempate, el orden de esas cinco filas no sería reproducible.",
    reward: defaultReward("advanced"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "entrevista-correos-duplicados-y-fila-ganadora",
    section,
    title: "Correos duplicados y la fila que sobrevive",
    difficulty: "advanced",
    estimated_minutes: 14,
    concepts: [
      "cte",
      "group_by",
      "having",
      "aggregate",
      "text_functions",
      "outer_join",
      "distinct",
    ],
    dataset: { slug: "tiendaviva", version: 1 },
    tables_used: ["customers", "orders"],
    scenario_md:
      "«Antes de migrar el CRM queremos unificar clientes duplicados —dice la entrevistadora—. Hay personas que se registraron dos veces con el mismo correo escrito distinto. Necesito la lista de correos afectados, cuál cuenta conservamos y cuántos pedidos hay que mover.»",
    business_question_md:
      "Normaliza el correo con `lower(trim(email))` y quédate con los correos normalizados que aparecen en más de un cliente. Para cada uno devuelve: `correo` (el normalizado), `cuentas` (cuántos clientes lo comparten), `id_a_conservar` (el `id` del cliente con `signup_at` más antiguo; si hay empate, el `id` menor) y `pedidos_totales` (la cantidad de pedidos de **todas** las cuentas del grupo, incluidas las que no tienen ninguno). Ordena por `cuentas` descendente y luego por `correo`.",
    learning_objective:
      "Detectar duplicados con una clave normalizada y elegir la fila superviviente sin perder los datos asociados al resto.",
    theory_ref: patrones,
    expected_columns: [
      { name: "correo", type: "text" },
      { name: "cuentas", type: "integer" },
      { name: "id_a_conservar", type: "integer" },
      { name: "pedidos_totales", type: "integer" },
    ],
    validation_rules: {
      order_matters: true,
      required_concepts: ["group_by", "having"],
    },
    reference_solution: `WITH normalizados AS (
  SELECT id, lower(trim(email)) AS correo, signup_at
  FROM customers
),
duplicados AS (
  SELECT correo, count(*) AS cuentas
  FROM normalizados
  GROUP BY correo
  HAVING count(*) > 1
),
ganador AS (
  SELECT DISTINCT ON (n.correo) n.correo, n.id AS id_a_conservar
  FROM normalizados AS n
  INNER JOIN duplicados AS d ON d.correo = n.correo
  ORDER BY n.correo, n.signup_at, n.id
)
SELECT
  d.correo,
  d.cuentas,
  g.id_a_conservar,
  count(o.id) AS pedidos_totales
FROM duplicados AS d
INNER JOIN ganador AS g ON g.correo = d.correo
INNER JOIN normalizados AS n ON n.correo = d.correo
LEFT JOIN orders AS o ON o.customer_id = n.id
GROUP BY d.correo, d.cuentas, g.id_a_conservar
ORDER BY d.cuentas DESC, d.correo;`,
    alternative_solutions: [
      {
        label: "ROW_NUMBER en lugar de DISTINCT ON",
        sql: `WITH normalizados AS (
  SELECT id, lower(trim(email)) AS correo, signup_at
  FROM customers
),
ordenados AS (
  SELECT
    correo,
    id,
    count(*) OVER (PARTITION BY correo) AS cuentas,
    row_number() OVER (PARTITION BY correo ORDER BY signup_at, id) AS orden
  FROM normalizados
),
ganador AS (
  SELECT correo, cuentas, id AS id_a_conservar FROM ordenados WHERE orden = 1 AND cuentas > 1
)
SELECT
  g.correo,
  g.cuentas,
  g.id_a_conservar,
  count(o.id) AS pedidos_totales
FROM ganador AS g
INNER JOIN normalizados AS n ON n.correo = g.correo
LEFT JOIN orders AS o ON o.customer_id = n.id
GROUP BY g.correo, g.cuentas, g.id_a_conservar
ORDER BY g.cuentas DESC, g.correo;`,
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Son tres preguntas encadenadas: qué correos están duplicados, cuál de las cuentas se conserva y cuántos pedidos suman todas las cuentas del grupo. Resuélvelas en capas y no mezcles la elección del ganador con el conteo de pedidos.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "La clave de identidad es `lower(trim(email))`, no `email`. Detecta con `GROUP BY correo HAVING count(*) > 1`. Para el ganador, `DISTINCT ON (correo) ... ORDER BY correo, signup_at, id` te devuelve una fila por correo. Los pedidos se cuentan sobre **todas** las cuentas del grupo con un `LEFT JOIN` a `orders` y `count(o.id)`.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nWITH normalizados AS (\n  SELECT id, ___(___(email)) AS correo, signup_at FROM customers\n),\nduplicados AS (\n  SELECT correo, count(*) AS cuentas\n  FROM normalizados\n  GROUP BY correo\n  ___ count(*) > 1\n),\nganador AS (\n  SELECT ___ ___ (n.correo) n.correo, n.id AS id_a_conservar\n  FROM normalizados AS n\n  INNER JOIN duplicados AS d ON d.correo = n.correo\n  ORDER BY n.correo, ___, ___\n)\nSELECT d.correo, d.cuentas, g.id_a_conservar, ___(___) AS pedidos_totales\nFROM duplicados AS d\nINNER JOIN ganador AS g ON g.correo = d.correo\nINNER JOIN normalizados AS n ON n.correo = d.correo\n___ JOIN orders AS o ON o.customer_id = n.id\nGROUP BY d.correo, d.cuentas, g.id_a_conservar\nORDER BY d.cuentas DESC, d.correo;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "cell_values",
        description_md:
          "Agrupar por `email` sin normalizar: solo detectas 2 correos repetidos en lugar de 37, porque el resto difiere en mayúsculas o espacios.",
      },
      {
        category: "aggregation_level",
        description_md:
          "Contar los pedidos solo de la cuenta ganadora: el negocio pidió cuántos pedidos hay que migrar, o sea los de todas las cuentas del grupo.",
      },
      {
        category: "null_handling",
        description_md:
          "Usar `INNER JOIN orders` o `count(*)`: las cuentas duplicadas sin pedidos desaparecen o inflan el conteo con filas vacías.",
      },
      {
        category: "cell_values",
        description_md:
          "Elegir el ganador con `min(id)` en lugar del `signup_at` más antiguo: coincide en muchos grupos, pero no en todos, y el criterio pedido era la antigüedad.",
      },
    ],
    expert_explanation_md:
      "37 correos duplicados. Con `GROUP BY email` sin normalizar solo aparecerían **2**: el resto difiere en la capitalización, que es el defecto de datos que el ejercicio quiere que encuentres. Dos correos tienen tres cuentas (`antonella.gomez635@ejemplo.lat` y `regina.lopez252@ejemplo.lat`); el resto, dos.\n\nEl criterio del ganador importa: en `ana.lucia.castillo1210@ejemplo.lat` se conserva el `id` 2487 aunque exista el 1210, porque el registro más antiguo por `signup_at` no es el del `id` menor. Si hubieras usado `min(id)` el resultado sería distinto en varios grupos, y en una migración eso significa perder el historial correcto.\n\n`DISTINCT ON (correo)` es la forma más corta de decir «una fila por correo, la primera según este orden»; `row_number() = 1` hace lo mismo y es portable a motores que no tienen `DISTINCT ON`. Las dos aparecen en la solución de referencia y en la alternativa.\n\nEl `LEFT JOIN` a `orders` combinado con `count(o.id)` es lo que hace que una cuenta duplicada sin pedidos aporte 0 en lugar de desaparecer del grupo: con `INNER JOIN` perderías esas cuentas y, si el grupo entero no tuviera pedidos, perderías el correo completo del informe de migración.",
    reward: defaultReward("advanced"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "entrevista-racha-mas-larga-de-dias",
    section,
    title: "La racha más larga de días seguidos",
    difficulty: "expert",
    estimated_minutes: 18,
    concepts: ["cte", "window_function", "ranking", "date_functions", "group_by", "distinct"],
    dataset: { slug: "ritmo", version: 1 },
    tables_used: ["plays", "users"],
    scenario_md:
      "La última pregunta técnica de la ronda, con datos de **Ritmo**: «Producto quiere premiar a los oyentes más constantes. Dame, para cada oyente, su racha más larga de días consecutivos con al menos una reproducción». La entrevistadora agrega: «no me interesa la consulta perfecta, quiero escuchar cómo la piensas».",
    business_question_md:
      "Toma los días (en UTC) en que cada oyente tuvo al menos una reproducción y calcula sus rachas de días **consecutivos**. Devuelve solo los oyentes cuya racha más larga sea de 10 días o más, con: `user_id`, `country`, `dias_racha` (largo de la racha), `inicio` y `fin` (primer y último día de esa racha). Si un oyente tiene dos rachas de la misma longitud, informa la que empezó antes. Ordena por `dias_racha` descendente y luego por `user_id`.",
    learning_objective:
      "Aplicar el patrón de brechas e islas para medir rachas de fechas consecutivas y quedarse con la mejor por entidad.",
    theory_ref: patrones,
    expected_columns: [
      { name: "user_id", type: "integer" },
      { name: "country", type: "text" },
      { name: "dias_racha", type: "integer" },
      { name: "inicio", type: "date" },
      { name: "fin", type: "date" },
    ],
    validation_rules: {
      order_matters: true,
      required_concepts: ["window_function", "cte"],
    },
    reference_solution: `WITH dias AS (
  SELECT DISTINCT user_id, (played_at AT TIME ZONE 'UTC')::date AS dia
  FROM plays
),
islas AS (
  SELECT
    user_id,
    dia,
    dia - (row_number() OVER (PARTITION BY user_id ORDER BY dia))::int AS grupo
  FROM dias
),
rachas AS (
  SELECT user_id, grupo, count(*) AS dias_racha, min(dia) AS inicio, max(dia) AS fin
  FROM islas
  GROUP BY user_id, grupo
),
mejor AS (
  SELECT DISTINCT ON (user_id) user_id, dias_racha, inicio, fin
  FROM rachas
  ORDER BY user_id, dias_racha DESC, inicio
)
SELECT m.user_id, u.country, m.dias_racha, m.inicio, m.fin
FROM mejor AS m
INNER JOIN users AS u ON u.id = m.user_id
WHERE m.dias_racha >= 10
ORDER BY m.dias_racha DESC, m.user_id;`,
    alternative_solutions: [
      {
        label: "ROW_NUMBER para elegir la mejor racha",
        sql: `WITH dias AS (
  SELECT DISTINCT user_id, (played_at AT TIME ZONE 'UTC')::date AS dia
  FROM plays
),
islas AS (
  SELECT user_id, dia, dia - (row_number() OVER (PARTITION BY user_id ORDER BY dia))::int AS grupo
  FROM dias
),
rachas AS (
  SELECT user_id, count(*) AS dias_racha, min(dia) AS inicio, max(dia) AS fin
  FROM islas
  GROUP BY user_id, grupo
),
ranking AS (
  SELECT
    user_id, dias_racha, inicio, fin,
    row_number() OVER (PARTITION BY user_id ORDER BY dias_racha DESC, inicio) AS puesto
  FROM rachas
)
SELECT r.user_id, u.country, r.dias_racha, r.inicio, r.fin
FROM ranking AS r
INNER JOIN users AS u ON u.id = r.user_id
WHERE r.puesto = 1 AND r.dias_racha >= 10
ORDER BY r.dias_racha DESC, r.user_id;`,
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Empieza por el grano: una fila por oyente y día, sin repetir. Después piensa qué tienen en común dos fechas consecutivas cuando las numeras en orden.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "El truco de brechas e islas: `dia - (row_number() OVER (PARTITION BY user_id ORDER BY dia))::int` da el **mismo valor** para todos los días de una racha, porque ambos avanzan de a uno. Agrupa por ese valor para obtener el largo, el inicio y el fin, y al final quédate con la mejor racha de cada oyente.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nWITH dias AS (\n  SELECT ___ user_id, (played_at AT TIME ZONE '___')::date AS dia FROM plays\n),\nislas AS (\n  SELECT user_id, dia, dia - (___() OVER (PARTITION BY ___ ORDER BY ___))::int AS grupo\n  FROM dias\n),\nrachas AS (\n  SELECT user_id, grupo, ___ AS dias_racha, ___(dia) AS inicio, ___(dia) AS fin\n  FROM islas\n  GROUP BY ___\n),\nmejor AS (\n  SELECT DISTINCT ON (___) user_id, dias_racha, inicio, fin\n  FROM rachas\n  ORDER BY user_id, dias_racha ___, inicio\n)\nSELECT m.user_id, u.country, m.dias_racha, m.inicio, m.fin\nFROM mejor AS m\nINNER JOIN users AS u ON u.id = m.user_id\nWHERE m.dias_racha >= ___\nORDER BY m.dias_racha DESC, m.user_id;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "duplicates",
        description_md:
          "Numerar sobre `plays` sin reducir a días distintos: varias reproducciones del mismo día rompen la secuencia y todas las rachas quedan cortas.",
      },
      {
        category: "date_boundary",
        description_md:
          "Truncar `played_at` sin `AT TIME ZONE 'UTC'`: el día queda atado al huso de la sesión. Aquí ese huso es UTC y la racha coincide; en un servidor con otra zona, las escuchas de la medianoche cambian de fecha y parten rachas reales.",
      },
      {
        category: "aggregation_level",
        description_md:
          "Devolver todas las rachas de cada oyente en lugar de la más larga: el resultado tiene más de una fila por `user_id`.",
      },
      {
        category: "wrong_order",
        description_md:
          "Desempatar rachas de igual longitud sin criterio: si un oyente tiene dos rachas de 12 días, la fila elegida cambia entre ejecuciones.",
      },
    ],
    expert_explanation_md:
      "81 oyentes llegan a una racha de 10 días o más. El máximo es de 26 días: el oyente 3248 (PE) escuchó todos los días entre el 2025-08-14 y el 2025-09-08.\n\nEl patrón de brechas e islas es más simple de lo que parece. Dentro de un oyente, las fechas ordenadas avanzan de a un día cuando son consecutivas, y `row_number()` también avanza de a uno: la resta `dia - row_number()` se mantiene **constante** mientras la racha no se corte, y salta en cuanto falta un día. Ese valor constante no significa nada por sí mismo; sirve solo como identificador de la isla, y por eso se agrupa por él.\n\nEl paso previo es el que más candidatos olvida: `SELECT DISTINCT user_id, dia`. Sobre la tabla `plays` hay unas 23 reproducciones por oyente, así que sin el `DISTINCT` la numeración cuenta eventos y no días, y la resta deja de ser constante.\n\nElegir la mejor racha por oyente es el patrón «una fila por grupo» que ya conoces: `DISTINCT ON (user_id)` con `ORDER BY user_id, dias_racha DESC, inicio`, o `row_number() = 1` sobre la misma ordenación. El desempate por `inicio` es lo que hace reproducible el resultado cuando alguien tiene dos rachas igual de largas.\n\nEn una entrevista conviene decir en voz alta el supuesto que este enunciado ya fija: la racha se corta cuando falta un día **calendario en UTC**; con hora local de cada país, algunas rachas se cortarían en otro punto.",
    reward: defaultReward("expert"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "entrevista-tres-veces-seguidas",
    section,
    title: "La misma canción tres veces seguidas",
    difficulty: "expert",
    estimated_minutes: 16,
    concepts: ["lag_lead", "window_function", "cte", "inner_join", "date_functions"],
    dataset: { slug: "ritmo", version: 1 },
    tables_used: ["plays", "tracks"],
    scenario_md:
      "«Otra clásica —dice el entrevistador—: quiero detectar cuándo un oyente reprodujo la misma canción tres veces seguidas, sin nada en el medio. Producto lo usa para separar el consumo real del reproductor trabado.»",
    business_question_md:
      "Ordena las reproducciones de cada oyente por `played_at` y, en caso de empate, por `id`. Devuelve cada reproducción que sea la **tercera o posterior** de una secuencia ininterrumpida de la misma canción por el mismo oyente. Columnas: `user_id`, `track_id`, `title` (título de la canción) y `tercera_utc` (el `played_at` de esa reproducción, mostrado en UTC). Ordena por `user_id` y luego por `tercera_utc`.",
    learning_objective:
      "Comparar una fila con las anteriores usando LAG con desplazamiento para detectar eventos consecutivos.",
    theory_ref: patrones,
    expected_columns: [
      { name: "user_id", type: "integer" },
      { name: "track_id", type: "integer" },
      { name: "title", type: "text" },
      { name: "tercera_utc", type: "timestamp" },
    ],
    validation_rules: {
      order_matters: true,
      required_concepts: ["lag_lead", "window_function"],
    },
    reference_solution: `WITH secuencia AS (
  SELECT
    user_id,
    track_id,
    played_at,
    lag(track_id) OVER (PARTITION BY user_id ORDER BY played_at, id) AS anterior_1,
    lag(track_id, 2) OVER (PARTITION BY user_id ORDER BY played_at, id) AS anterior_2
  FROM plays
)
SELECT
  s.user_id,
  s.track_id,
  t.title,
  s.played_at AT TIME ZONE 'UTC' AS tercera_utc
FROM secuencia AS s
INNER JOIN tracks AS t ON t.id = s.track_id
WHERE s.track_id = s.anterior_1
  AND s.track_id = s.anterior_2
ORDER BY s.user_id, tercera_utc;`,
    alternative_solutions: [
      {
        label: "Brechas e islas sobre la secuencia de reproducciones",
        sql: `WITH ordenadas AS (
  SELECT
    user_id, track_id, played_at, id,
    row_number() OVER (PARTITION BY user_id ORDER BY played_at, id) AS pos_global,
    row_number() OVER (PARTITION BY user_id, track_id ORDER BY played_at, id) AS pos_cancion
  FROM plays
),
bloques AS (
  SELECT
    user_id, track_id, played_at,
    row_number() OVER (PARTITION BY user_id, track_id, pos_global - pos_cancion ORDER BY played_at, id) AS seguidas
  FROM ordenadas
)
SELECT b.user_id, b.track_id, t.title, b.played_at AT TIME ZONE 'UTC' AS tercera_utc
FROM bloques AS b
INNER JOIN tracks AS t ON t.id = b.track_id
WHERE b.seguidas >= 3
ORDER BY b.user_id, tercera_utc;`,
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "«Tres veces seguidas» significa que esta fila y las **dos anteriores del mismo oyente** tienen la misma canción. No necesitas unir la tabla consigo misma: te alcanza con mirar hacia atrás dentro de una ventana ordenada.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "`lag(track_id) OVER (PARTITION BY user_id ORDER BY played_at, id)` te da la canción anterior y `lag(track_id, 2) OVER (...)` la de dos posiciones atrás. La fila cumple la condición cuando `track_id` coincide con ambas. El desempate por `id` dentro de la ventana es obligatorio: sin él, dos reproducciones con el mismo instante se ordenarían de forma arbitraria.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nWITH secuencia AS (\n  SELECT\n    user_id, track_id, played_at,\n    ___(track_id) OVER (PARTITION BY ___ ORDER BY played_at, id) AS anterior_1,\n    ___(track_id, ___) OVER (PARTITION BY ___ ORDER BY played_at, id) AS anterior_2\n  FROM plays\n)\nSELECT s.user_id, s.track_id, t.title, s.played_at AT TIME ZONE '___' AS tercera_utc\nFROM secuencia AS s\nINNER JOIN tracks AS t ON t.id = s.track_id\nWHERE ___\n  AND ___\nORDER BY s.user_id, tercera_utc;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "join_condition",
        description_md:
          "Olvidar `PARTITION BY user_id`: la ventana mezcla oyentes y detecta secuencias que nunca ocurrieron dentro de una misma sesión.",
      },
      {
        category: "cell_values",
        description_md:
          "Usar `lag(track_id)` dos veces en lugar de `lag(track_id, 2)`: las dos columnas devuelven lo mismo y la condición solo comprueba dos reproducciones seguidas.",
      },
      {
        category: "wrong_order",
        description_md:
          "Ordenar la ventana solo por `played_at`: ante dos reproducciones con el mismo instante el orden es arbitrario y el resultado deja de ser reproducible.",
      },
      {
        category: "date_boundary",
        description_md:
          "Devolver `played_at` sin `AT TIME ZONE 'UTC'`: la marca mostrada depende del huso de quien ejecuta la consulta.",
      },
    ],
    expert_explanation_md:
      "35 casos en 109 382 reproducciones. Es un resultado esperable: la repetición inmediata existe, pero es rara, y ese orden de magnitud es lo primero que conviene verificar antes de entregar.\n\n`lag(columna, n)` mira `n` filas hacia atrás **dentro de la partición** y ordenada por la ventana. Con `lag(track_id)` y `lag(track_id, 2)` comparas la fila actual con las dos anteriores en una sola pasada; la alternativa con autounión existe, pero requiere numerar las filas igual y además pagar el join.\n\nEl enunciado pide la tercera **o posterior**: si alguien reprodujo la misma canción cuatro veces seguidas, la tercera y la cuarta cumplen la condición. Es una decisión de negocio que conviene declarar en voz alta, porque la variante «solo el inicio de cada secuencia» se escribe distinto y da menos filas.\n\nLa alternativa con brechas e islas (la diferencia entre la posición global y la posición dentro de la canción identifica cada bloque ininterrumpido) resuelve de una sola vez el caso general: cambiando `>= 3` por `>= 5` respondes «cinco veces seguidas» sin agregar más `lag`. Es el argumento correcto cuando el entrevistador pregunta «¿y si fueran diez?».\n\nLos dos nulos iniciales de cada partición no molestan: `track_id = NULL` nunca es verdadero, así que las dos primeras reproducciones de cada oyente quedan afuera sin necesidad de un filtro explícito.",
    reward: defaultReward("expert"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "entrevista-pareto-de-restaurantes",
    section,
    title: "Los restaurantes que explican la mitad del negocio",
    difficulty: "expert",
    estimated_minutes: 16,
    concepts: ["cte", "window_function", "ranking", "aggregate", "group_by", "inner_join"],
    dataset: { slug: "pidelo", version: 1 },
    tables_used: ["orders", "restaurants"],
    scenario_md:
      "Última pregunta del proceso, ahora con un caso de negocio: «En **Pídelo** sospechamos que el volumen está muy concentrado. Dime qué restaurantes forman el grupo más chico que explica el 50 % del GMV entregado, con su participación acumulada».",
    business_question_md:
      "Considera solo los pedidos con `status = 'delivered'` y define el GMV de cada restaurante como la suma de `total`. Ordena los restaurantes por GMV descendente (desempata por `restaurant_id` ascendente) y devuelve los que hacen falta para alcanzar el 50 % del GMV total: todos aquellos cuyo acumulado **antes** de sumarlos todavía no llegaba al 50 %. Columnas: `posicion` (1 para el de mayor GMV), `restaurant_name`, `gmv` y `share_acumulado_pct` (participación acumulada sobre el GMV total, en porcentaje con 2 decimales, contando ese restaurante). Ordena por `posicion`.",
    learning_objective:
      "Construir un acumulado con funciones de ventana y traducir una pregunta de concentración a un corte reproducible.",
    theory_ref: razonar,
    expected_columns: [
      { name: "posicion", type: "integer" },
      { name: "restaurant_name", type: "text" },
      { name: "gmv", type: "numeric" },
      { name: "share_acumulado_pct", type: "numeric" },
    ],
    validation_rules: {
      order_matters: true,
      required_concepts: ["window_function", "group_by"],
    },
    reference_solution: `WITH gmv AS (
  SELECT r.id AS restaurant_id, r.name AS restaurant_name, sum(o.total) AS gmv
  FROM orders AS o
  INNER JOIN restaurants AS r ON r.id = o.restaurant_id
  WHERE o.status = 'delivered'
  GROUP BY r.id, r.name
),
acumulado AS (
  SELECT
    restaurant_id,
    restaurant_name,
    gmv,
    sum(gmv) OVER (ORDER BY gmv DESC, restaurant_id) AS gmv_acumulado,
    sum(gmv) OVER () AS gmv_total
  FROM gmv
)
SELECT
  row_number() OVER (ORDER BY gmv DESC, restaurant_id) AS posicion,
  restaurant_name,
  gmv,
  round(100.0 * gmv_acumulado / gmv_total, 2) AS share_acumulado_pct
FROM acumulado
WHERE gmv_acumulado - gmv < 0.5 * gmv_total
ORDER BY posicion;`,
    alternative_solutions: [
      {
        label: "El total en una CTE aparte",
        sql: `WITH gmv AS (
  SELECT r.id AS restaurant_id, r.name AS restaurant_name, sum(o.total) AS gmv
  FROM orders AS o
  INNER JOIN restaurants AS r ON r.id = o.restaurant_id
  WHERE o.status = 'delivered'
  GROUP BY r.id, r.name
),
total AS (SELECT sum(gmv) AS gmv_total FROM gmv),
acumulado AS (
  SELECT
    g.restaurant_id,
    g.restaurant_name,
    g.gmv,
    sum(g.gmv) OVER (ORDER BY g.gmv DESC, g.restaurant_id) AS gmv_acumulado,
    row_number() OVER (ORDER BY g.gmv DESC, g.restaurant_id) AS posicion,
    t.gmv_total
  FROM gmv AS g
  CROSS JOIN total AS t
)
SELECT posicion, restaurant_name, gmv, round(100.0 * gmv_acumulado / gmv_total, 2) AS share_acumulado_pct
FROM acumulado
WHERE gmv_acumulado - gmv < 0.5 * gmv_total
ORDER BY posicion;`,
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Tres pasos: una fila por restaurante con su GMV, el acumulado sobre ese resultado ordenado de mayor a menor, y un corte. Lo difícil no es el SQL: es definir el corte sin dejar afuera al restaurante que cruza el 50 %.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "`sum(gmv) OVER (ORDER BY gmv DESC, restaurant_id)` acumula y `sum(gmv) OVER ()` (sin `ORDER BY`) te trae el total en la misma fila. El corte es `gmv_acumulado - gmv < 0.5 * gmv_total`: se queda toda fila cuyo acumulado **previo** aún no llegaba a la mitad, incluida la que la cruza.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nWITH gmv AS (\n  SELECT r.id AS restaurant_id, r.name AS restaurant_name, ___(o.total) AS gmv\n  FROM orders AS o\n  INNER JOIN restaurants AS r ON r.id = o.restaurant_id\n  WHERE o.status = '___'\n  GROUP BY r.id, r.name\n),\nacumulado AS (\n  SELECT\n    restaurant_id, restaurant_name, gmv,\n    ___(gmv) OVER (ORDER BY gmv ___, restaurant_id) AS gmv_acumulado,\n    ___(gmv) OVER (___) AS gmv_total\n  FROM gmv\n)\nSELECT\n  ___() OVER (ORDER BY gmv DESC, restaurant_id) AS posicion,\n  restaurant_name,\n  gmv,\n  round(100.0 * ___ / ___, 2) AS share_acumulado_pct\nFROM acumulado\nWHERE ___ - ___ < 0.5 * gmv_total\nORDER BY posicion;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "cell_values",
        description_md:
          "Cortar con `gmv_acumulado <= 0.5 * gmv_total`: deja afuera al restaurante que cruza la mitad y el grupo devuelto no llega al 50 %.",
      },
      {
        category: "missing_filter",
        description_md:
          "No filtrar `status = 'delivered'`: los pedidos cancelados inflan el GMV y cambian tanto el orden como el corte.",
      },
      {
        category: "aggregation_level",
        description_md:
          "Acumular sobre los pedidos en lugar de sobre el agregado por restaurante: el acumulado avanza pedido por pedido y `posicion` deja de significar «puesto del restaurante».",
      },
      {
        category: "wrong_order",
        description_md:
          "Ordenar la ventana solo por `gmv DESC`: ante dos restaurantes con el mismo GMV el acumulado y las posiciones pueden cambiar entre ejecuciones.",
      },
    ],
    expert_explanation_md:
      "54 restaurantes de 400 (el 13,5 %) explican la mitad del GMV entregado, que asciende a 522 312 500,51. Es una concentración típica de un marketplace y la respuesta que el negocio quería escuchar.\n\nDos detalles hacen la diferencia entre una respuesta correcta y una casi correcta:\n\n1. **El corte.** `gmv_acumulado <= 0.5 * gmv_total` devolvería 53 restaurantes cuyo acumulado se queda **por debajo** del 50 %: el grupo no cumple lo pedido. La condición `gmv_acumulado - gmv < 0.5 * gmv_total` mira el acumulado *previo* a cada fila, así que incluye al restaurante que cruza el umbral. Es el mismo razonamiento que se usa para las curvas de Pareto o los deciles de ingreso.\n2. **El desempate.** Sin `restaurant_id` en el `ORDER BY` de la ventana, dos restaurantes con el mismo GMV podrían acumularse en cualquier orden, y el último incluido cambiaría de una ejecución a otra.\n\n`sum(gmv) OVER ()` sin `ORDER BY` calcula el total de toda la partición y lo repite en cada fila: es la forma más corta de tener el denominador al lado del numerador. La alternativa con una CTE `total` y `CROSS JOIN` es idéntica en resultado y se lee mejor cuando el total también se usa en otras métricas.\n\nSi el entrevistador pregunta «¿y si quiero el 80 %?», la respuesta es que solo cambia el `0.5`: la consulta ya está escrita como un umbral parametrizable, y decirlo muestra que pensaste el caso general.",
    reward: defaultReward("expert"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
];
