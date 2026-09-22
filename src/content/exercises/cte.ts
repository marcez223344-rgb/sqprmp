import {
  defaultHintMeta,
  defaultReward,
  defaultSolutionUnlock,
  type ExerciseDef,
} from "../schemas/exercise";

const section = "cte";
const tiendaviva = { slug: "tiendaviva", version: 1 };
const pidelo = { slug: "pidelo", version: 1 };
const l1 = "cte-with-pasos";
const l2 = "cte-vs-subconsulta-y-vista";
const l3 = "cte-recursiva-jerarquias";

export const exercises: ExerciseDef[] = [
  {
    slug: "gasto-promedio-por-pais",
    section,
    title: "Gasto promedio por país en 2025",
    difficulty: "intermediate",
    estimated_minutes: 8,
    concepts: ["cte", "group_by", "aggregate", "inner_join", "order_by"],
    dataset: tiendaviva,
    tables_used: ["orders", "customers"],
    scenario_md:
      "En **TiendaViva**, Finanzas quiere saber cuánto gasta un cliente típico en cada país durante 2025. La cifra se calcula en dos pasos: primero el gasto acumulado de **cada cliente**, después el promedio de esos gastos dentro de su país. Importante: cada país opera en su propia moneda, así que los promedios se comparan dentro del país, no entre países.",
    business_question_md:
      "Considerando solo los pedidos con `status = 'delivered'` y `created_at` desde el 1 de enero de 2025, calcula primero el gasto total (`sum(total_amount)`) de cada cliente y luego, por país del cliente, devuelve `country`, la cantidad de clientes con al menos un pedido entregado como `clientes` y el promedio de ese gasto como `gasto_promedio` (2 decimales). Ordena por `country` ascendente.\n\nLa subconsulta derivada resolvería lo mismo, pero aquí practicamos la forma con `WITH`: el ejercicio pide una CTE.",
    learning_objective:
      "Usar una CTE para nombrar un paso intermedio y agregar dos veces a niveles distintos.",
    theory_ref: l1,
    expected_columns: [
      { name: "country", type: "text" },
      { name: "clientes", type: "integer" },
      { name: "gasto_promedio", type: "numeric" },
    ],
    validation_rules: { order_matters: true, required_concepts: ["cte", "group_by"] },
    reference_solution:
      "WITH gasto_por_cliente AS (\n  SELECT c.id AS customer_id, c.country, sum(o.total_amount) AS gasto\n  FROM orders AS o\n  INNER JOIN customers AS c ON c.id = o.customer_id\n  WHERE o.status = 'delivered'\n    AND o.created_at >= DATE '2025-01-01'\n  GROUP BY c.id, c.country\n)\nSELECT\n  country,\n  count(*) AS clientes,\n  round(avg(gasto), 2) AS gasto_promedio\nFROM gasto_por_cliente\nGROUP BY country\nORDER BY country;",
    alternative_solutions: [
      {
        label: "Subconsulta derivada en FROM",
        sql: "SELECT country, count(*) AS clientes, round(avg(gasto), 2) AS gasto_promedio FROM (SELECT c.id AS customer_id, c.country, sum(o.total_amount) AS gasto FROM orders AS o INNER JOIN customers AS c ON c.id = o.customer_id WHERE o.status = 'delivered' AND o.created_at >= DATE '2025-01-01' GROUP BY c.id, c.country) AS gasto_por_cliente GROUP BY country ORDER BY country;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Son dos niveles de agregación distintos: uno por cliente y otro por país. No se pueden hacer en un solo `GROUP BY`; dale nombre al primer paso y agrúpalo de nuevo.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "En el primer paso agrupa por `c.id` y `c.country` (necesitas el país para el segundo paso) y filtra ahí el estado y la fecha. En el segundo paso, `count(*)` cuenta filas de ese resultado, es decir clientes.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nWITH ___ AS (\n  SELECT c.id AS customer_id, c.country, ___(o.total_amount) AS gasto\n  FROM orders AS o\n  INNER JOIN customers AS c ON c.id = o.customer_id\n  WHERE o.status = '___'\n    AND o.created_at >= DATE '2025-01-01'\n  GROUP BY c.id, c.country\n)\nSELECT country, count(*) AS clientes, round(___(gasto), 2) AS gasto_promedio\nFROM ___\nGROUP BY country\nORDER BY country;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "aggregation_level",
        description_md:
          "Calcular `avg(o.total_amount)` agrupando solo por país: eso da el ticket promedio por pedido, no el gasto promedio por cliente.",
      },
      {
        category: "missing_filter",
        description_md:
          "Olvidar `status = 'delivered'`: entran pedidos cancelados y devueltos, que no representan gasto real.",
      },
      {
        category: "date_boundary",
        description_md:
          "Filtrar con `EXTRACT(YEAR FROM created_at) = 2025` está bien, pero usar `created_at > DATE '2025-01-01'` deja fuera los pedidos del 1 de enero.",
      },
      {
        category: "wrong_order",
        description_md: "No ordenar por `country`, que es lo que pide el reporte.",
      },
    ],
    expert_explanation_md:
      "Seis filas, una por país. La clave es que hay **dos niveles de agregación**: `sum` por cliente y `avg` sobre esas sumas. La CTE existe justamente para materializar el nivel intermedio con un nombre legible.\n\nLa subconsulta derivada en `FROM` produce el mismo plan; la CTE gana en legibilidad y te deja probar el primer paso por separado mientras la escribes.\n\nSobre el resultado: CO y AR muestran cifras enormes frente a MX o PE porque cada país factura en su moneda local. Comparar `gasto_promedio` entre países sin convertir sería un error de análisis, no de SQL.",
    improvement_feedback: [
      { condition: "uses_select_star", message_key: "improve.uses_select_star" },
    ],
    reward: defaultReward("intermediate"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "entregas-tardias-por-ciudad",
    section,
    title: "Entregas tardías por ciudad",
    difficulty: "advanced",
    estimated_minutes: 10,
    concepts: ["cte", "inner_join", "group_by", "conditional_aggregation", "order_by"],
    dataset: pidelo,
    tables_used: ["orders", "restaurants", "cities"],
    scenario_md:
      "En **Pídelo**, Operaciones revisa el cumplimiento de la promesa de entrega. Un pedido es **tardío** cuando el tiempo real entre `placed_at` y `delivered_at` supera los `promised_minutes` prometidos. Quieren una tabla por ciudad para priorizar en qué plazas reforzar la flota.",
    business_question_md:
      "Para los pedidos con `status = 'delivered'`, devuelve por ciudad del restaurante: `city`, la cantidad de entregas como `entregas`, la cantidad de entregas tardías como `tardias` y el porcentaje que representan como `pct_tardias` (2 decimales). Resuélvelo con dos CTE encadenadas: la primera con el detalle por pedido (ciudad, minutos prometidos y minutos reales) y la segunda con el resumen por ciudad. Ordena por `pct_tardias` descendente y, en caso de empate, por `city`.",
    learning_objective:
      "Encadenar dos CTE donde la segunda lee de la primera y el SELECT final reutiliza sus alias.",
    theory_ref: l1,
    expected_columns: [
      { name: "city", type: "text" },
      { name: "entregas", type: "integer" },
      { name: "tardias", type: "integer" },
      { name: "pct_tardias", type: "numeric" },
    ],
    validation_rules: { order_matters: true, required_concepts: ["cte", "inner_join"] },
    reference_solution:
      "WITH entregas AS (\n  SELECT\n    ci.name AS city,\n    o.promised_minutes,\n    EXTRACT(EPOCH FROM (o.delivered_at - o.placed_at)) / 60 AS minutos_reales\n  FROM orders AS o\n  INNER JOIN restaurants AS r ON r.id = o.restaurant_id\n  INNER JOIN cities AS ci ON ci.id = r.city_id\n  WHERE o.status = 'delivered'\n),\npor_ciudad AS (\n  SELECT\n    city,\n    count(*) AS entregas,\n    count(*) FILTER (WHERE minutos_reales > promised_minutes) AS tardias\n  FROM entregas\n  GROUP BY city\n)\nSELECT\n  city,\n  entregas,\n  tardias,\n  round(100.0 * tardias / entregas, 2) AS pct_tardias\nFROM por_ciudad\nORDER BY pct_tardias DESC, city;",
    alternative_solutions: [
      {
        label: "SUM(CASE ...) en lugar de FILTER",
        sql: "WITH entregas AS (SELECT ci.name AS city, o.promised_minutes, EXTRACT(EPOCH FROM (o.delivered_at - o.placed_at)) / 60 AS minutos_reales FROM orders AS o INNER JOIN restaurants AS r ON r.id = o.restaurant_id INNER JOIN cities AS ci ON ci.id = r.city_id WHERE o.status = 'delivered'), por_ciudad AS (SELECT city, count(*) AS entregas, sum(CASE WHEN minutos_reales > promised_minutes THEN 1 ELSE 0 END) AS tardias FROM entregas GROUP BY city) SELECT city, entregas, tardias, round(100.0 * tardias / entregas, 2) AS pct_tardias FROM por_ciudad ORDER BY pct_tardias DESC, city;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Primero necesitas, para cada pedido entregado, su ciudad y cuántos minutos tardó de verdad. Recién con ese detalle puedes contar cuántos superaron la promesa.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "La duración real sale de `EXTRACT(EPOCH FROM (delivered_at - placed_at)) / 60`. La ciudad no está en `orders`: llega por `restaurants.city_id` hacia `cities`. En el segundo paso, `count(*) FILTER (WHERE ...)` (o `sum(CASE ...)`) cuenta solo las tardías.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nWITH entregas AS (\n  SELECT ci.name AS city, o.promised_minutes,\n         EXTRACT(EPOCH FROM (o.delivered_at - o.___)) / 60 AS minutos_reales\n  FROM orders AS o\n  INNER JOIN restaurants AS r ON r.id = o.restaurant_id\n  INNER JOIN cities AS ci ON ci.id = r.___\n  WHERE o.status = '___'\n),\npor_ciudad AS (\n  SELECT city, count(*) AS entregas,\n         count(*) FILTER (WHERE ___ > ___) AS tardias\n  FROM entregas\n  GROUP BY city\n)\nSELECT city, entregas, tardias, round(100.0 * ___ / ___, 2) AS pct_tardias\nFROM por_ciudad\nORDER BY pct_tardias DESC, city;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "missing_filter",
        description_md:
          "No filtrar `status = 'delivered'`: los pedidos sin `delivered_at` producen NULL en la resta y desaparecen del conteo de tardías, pero siguen sumando en `entregas`.",
      },
      {
        category: "join_condition",
        description_md:
          "Unir la ciudad por el cliente (`customers.city_id`) en vez de por el restaurante: la pregunta es sobre la plaza donde opera la cocina.",
      },
      {
        category: "cell_values",
        description_md:
          "Calcular `100 * tardias / entregas` con enteros: la división entera devuelve 0. Hay que usar `100.0` o un cast a `numeric`.",
      },
      {
        category: "aggregation_level",
        description_md:
          "Contar tardías con un `WHERE` en el segundo paso: filtrarías también el denominador y `pct_tardias` daría 100 en todas las ciudades.",
      },
    ],
    expert_explanation_md:
      "Ocho ciudades. Montevideo encabeza con 23.46 % y Buenos Aires cierra con 20.45 %: la diferencia entre plazas es de unos tres puntos, así que el problema es sistémico y no de una ciudad puntual.\n\nEl valor de encadenar está en el tercer paso: `pct_tardias` usa `tardias` y `entregas`, dos alias calculados en la CTE anterior. En una sola consulta tendrías que repetir las dos expresiones de agregación completas dentro de la división.\n\n`FILTER` y `sum(CASE ...)` son equivalentes aquí; `FILTER` es estándar SQL desde 2003 y se lee mejor cuando hay varias métricas condicionales.",
    improvement_feedback: [
      { condition: "no_table_alias_in_join", message_key: "improve.no_table_alias_in_join" },
    ],
    reward: defaultReward("advanced"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "categorias-sobre-el-promedio",
    section,
    title: "Categorías por encima del promedio en México",
    difficulty: "advanced",
    estimated_minutes: 10,
    concepts: ["cte", "subquery", "group_by", "aggregate", "inner_join", "order_by"],
    dataset: tiendaviva,
    tables_used: ["order_items", "orders", "products", "categories"],
    scenario_md:
      "Comercial arma el plan de inversión publicitaria de **TiendaViva México** y necesita saber qué categorías facturan por encima del promedio de todas las categorías, y por cuánto. El mismo cálculo de ingresos se necesita dos veces: para listar las categorías y para obtener el promedio contra el cual compararlas.",
    business_question_md:
      "Con los pedidos `delivered` y `currency = 'MXN'`, calcula los ingresos de cada categoría como `sum(quantity * unit_price)` redondeado a 2 decimales (`ingresos`). Devuelve solo las categorías cuyos ingresos superan el promedio de ingresos de todas las categorías, con `category`, `ingresos` y la diferencia contra ese promedio como `diferencia_vs_promedio` (2 decimales). Ordena por `ingresos` descendente.\n\nDefine el cálculo de ingresos una sola vez en una CTE y refiérete a ella tantas veces como necesites.",
    learning_objective: "Definir una CTE una sola vez y referenciarla dos veces en la consulta.",
    theory_ref: l1,
    expected_columns: [
      { name: "category", type: "text" },
      { name: "ingresos", type: "numeric" },
      { name: "diferencia_vs_promedio", type: "numeric" },
    ],
    validation_rules: { order_matters: true, required_concepts: ["cte", "group_by"] },
    reference_solution:
      "WITH ventas_por_categoria AS (\n  SELECT cat.name AS category, round(sum(oi.quantity * oi.unit_price), 2) AS ingresos\n  FROM order_items AS oi\n  INNER JOIN orders AS o ON o.id = oi.order_id\n  INNER JOIN products AS p ON p.id = oi.product_id\n  INNER JOIN categories AS cat ON cat.id = p.category_id\n  WHERE o.status = 'delivered'\n    AND o.currency = 'MXN'\n  GROUP BY cat.name\n)\nSELECT\n  category,\n  ingresos,\n  round(ingresos - (SELECT avg(ingresos) FROM ventas_por_categoria), 2) AS diferencia_vs_promedio\nFROM ventas_por_categoria\nWHERE ingresos > (SELECT avg(ingresos) FROM ventas_por_categoria)\nORDER BY ingresos DESC;",
    alternative_solutions: [
      {
        label: "Segunda CTE con el promedio y CROSS JOIN",
        sql: "WITH ventas_por_categoria AS (SELECT cat.name AS category, round(sum(oi.quantity * oi.unit_price), 2) AS ingresos FROM order_items AS oi INNER JOIN orders AS o ON o.id = oi.order_id INNER JOIN products AS p ON p.id = oi.product_id INNER JOIN categories AS cat ON cat.id = p.category_id WHERE o.status = 'delivered' AND o.currency = 'MXN' GROUP BY cat.name), promedio AS (SELECT avg(ingresos) AS ingreso_promedio FROM ventas_por_categoria) SELECT v.category, v.ingresos, round(v.ingresos - pr.ingreso_promedio, 2) AS diferencia_vs_promedio FROM ventas_por_categoria AS v CROSS JOIN promedio AS pr WHERE v.ingresos > pr.ingreso_promedio ORDER BY v.ingresos DESC;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "El promedio contra el que comparas se calcula **sobre el resultado agregado**, no sobre las filas originales. Nombra ese resultado una vez y úsalo tanto para listar como para comparar.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "El camino de joins es `order_items` → `orders` (para filtrar estado y moneda) → `products` → `categories`. Una vez definida la CTE, el promedio sale de `(SELECT avg(ingresos) FROM ...)`, que puedes usar tanto en el `WHERE` como en el `SELECT`.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nWITH ventas_por_categoria AS (\n  SELECT cat.name AS category, round(sum(oi.quantity * oi.___), 2) AS ingresos\n  FROM order_items AS oi\n  INNER JOIN orders AS o ON o.id = oi.order_id\n  INNER JOIN products AS p ON p.id = oi.product_id\n  INNER JOIN categories AS cat ON cat.id = p.___\n  WHERE o.status = 'delivered' AND o.currency = '___'\n  GROUP BY cat.name\n)\nSELECT category, ingresos,\n       round(ingresos - (SELECT ___(ingresos) FROM ventas_por_categoria), 2) AS diferencia_vs_promedio\nFROM ventas_por_categoria\nWHERE ingresos > (SELECT ___(ingresos) FROM ventas_por_categoria)\nORDER BY ingresos DESC;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "aggregation_level",
        description_md:
          "Comparar contra `avg(oi.quantity * oi.unit_price)` de las líneas de pedido: ese es el promedio por línea, no el promedio de ingresos por categoría.",
      },
      {
        category: "missing_filter",
        description_md:
          "Omitir `currency = 'MXN'`: la suma mezcla seis monedas y el ranking deja de tener sentido.",
      },
      {
        category: "cell_values",
        description_md:
          "Usar `o.total_amount` en lugar de `quantity * unit_price`: el total del pedido incluye envío y descuento, y además se repetiría por cada línea del pedido.",
      },
      {
        category: "duplicates",
        description_md:
          "Unir `categories` por `cat.id = p.id` en vez de `p.category_id`: el join deja de tener sentido y los ingresos quedan mal repartidos.",
      },
    ],
    expert_explanation_md:
      "Ocho categorías superan el promedio, encabezadas por Celulares (4 221 797.73 MXN, casi 3 millones por encima del promedio). Las cuatro primeras son de Tecnología: la concentración es alta.\n\nLo interesante es la **reutilización**: `ventas_por_categoria` se nombra tres veces (el `FROM`, la subconsulta del `SELECT` y la del `WHERE`) pero se define una sola vez. Con subconsultas derivadas habría que repetir los cuatro joins en cada lugar.\n\nLa alternativa con una segunda CTE y `CROSS JOIN` evita ejecutar dos veces la subconsulta escalar y suele leerse mejor cuando el promedio se usa en muchas columnas. Una tercera vía es `avg(ingresos) OVER ()` como función de ventana; las tres dan el mismo resultado.",
    reward: defaultReward("advanced"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "arbol-de-categorias",
    section,
    title: "Árbol de categorías con su ruta",
    difficulty: "advanced",
    estimated_minutes: 12,
    concepts: ["cte", "self_join", "set_operations", "text_functions", "order_by"],
    dataset: tiendaviva,
    tables_used: ["categories"],
    scenario_md:
      "El equipo de Catálogo de **TiendaViva** quiere exportar el árbol completo de categorías para el menú de navegación: cada categoría con su nivel de profundidad y la ruta legible desde la raíz (por ejemplo `Hogar > Cocina`). La tabla `categories` solo guarda `parent_id`, así que hay que recorrerla nivel por nivel sin asumir cuántos niveles hay.",
    business_question_md:
      "Con una CTE recursiva sobre `categories`, devuelve `id`, `name`, `nivel` (1 para las categorías raíz, es decir las que tienen `parent_id` NULL, y uno más por cada nivel de descendencia) y `ruta`, el camino desde la raíz con los nombres separados por ` > ` (espacio, mayor que, espacio). Ordena por `ruta` ascendente.\n\nDeclara los nombres de las columnas junto al nombre de la CTE: `WITH RECURSIVE arbol(id, name, parent_id, nivel, ruta) AS (...)`. Es la forma que usa la documentación de PostgreSQL y, en este entorno, la única que acepta el analizador de consultas para una CTE recursiva.",
    learning_objective:
      "Escribir una CTE recursiva con caso base, paso recursivo y condición de terminación clara.",
    theory_ref: l3,
    expected_columns: [
      { name: "id", type: "integer" },
      { name: "name", type: "text" },
      { name: "nivel", type: "integer" },
      { name: "ruta", type: "text" },
    ],
    validation_rules: {
      order_matters: true,
      required_concepts: ["cte", "set_operations"],
      max_execution_ms: 3000,
    },
    reference_solution:
      "WITH RECURSIVE arbol(id, name, parent_id, nivel, ruta) AS (\n  SELECT id, name, parent_id, 1, name\n  FROM categories\n  WHERE parent_id IS NULL\n\n  UNION ALL\n\n  SELECT c.id, c.name, c.parent_id, a.nivel + 1, a.ruta || ' > ' || c.name\n  FROM categories AS c\n  INNER JOIN arbol AS a ON a.id = c.parent_id\n)\nSELECT id, name, nivel, ruta\nFROM arbol\nORDER BY ruta;",
    alternative_solutions: [
      {
        label: "Con cota de profundidad explícita",
        sql: "WITH RECURSIVE arbol(id, name, parent_id, nivel, ruta) AS (SELECT id, name, parent_id, 1, name FROM categories WHERE parent_id IS NULL UNION ALL SELECT c.id, c.name, c.parent_id, a.nivel + 1, a.ruta || ' > ' || c.name FROM categories AS c INNER JOIN arbol AS a ON a.id = c.parent_id WHERE a.nivel < 5) SELECT id, name, nivel, ruta FROM arbol ORDER BY ruta;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Una CTE recursiva tiene dos ramas unidas por `UNION ALL`: la que arranca (las filas sin padre) y la que avanza un nivel usando lo ya encontrado.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "En la rama de arranque, `nivel` vale 1 y `ruta` es el propio `name`; con la lista de columnas declarada en el encabezado de la CTE no hace falta repetir los alias. En la rama que avanza, une `categories` con la CTE por `a.id = c.parent_id`, suma 1 al nivel y concatena con `||`. Recuerda escribir `RECURSIVE` justo después de `WITH`.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nWITH ___ arbol(id, name, parent_id, nivel, ruta) AS (\n  SELECT id, name, parent_id, 1, ___\n  FROM categories\n  WHERE parent_id IS ___\n\n  UNION ALL\n\n  SELECT c.id, c.name, c.parent_id, a.nivel + 1, a.ruta || ' > ' || c.name\n  FROM categories AS c\n  INNER JOIN arbol AS a ON a.id = c.___\n)\nSELECT id, name, nivel, ruta\nFROM arbol\nORDER BY ___;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "syntax",
        description_md:
          "Olvidar `RECURSIVE`: PostgreSQL responde que la relación `arbol` no existe, porque sin esa palabra la CTE no puede mencionarse a sí misma.",
      },
      {
        category: "join_condition",
        description_md:
          "Invertir la condición del paso recursivo (`c.id = a.parent_id`): recorrerías hacia arriba desde las raíces y no bajaría ningún nivel.",
      },
      {
        category: "null_handling",
        description_md:
          "Usar `parent_id = NULL` en el caso base: la comparación nunca es verdadera y la CTE arranca vacía, así que el resultado sale sin filas. Hay que escribir `IS NULL`.",
      },
      {
        category: "performance",
        description_md:
          "Omitir cualquier cota de profundidad: con datos que tengan un ciclo, la recursión no termina y la consulta muere por tiempo agotado.",
      },
    ],
    expert_explanation_md:
      "30 filas: 6 categorías raíz (nivel 1) y 24 subcategorías (nivel 2). Ordenar por `ruta` agrupa visualmente cada rama, porque la ruta del hijo empieza con el nombre del padre.\n\nLa terminación está garantizada por los datos: cada vuelta busca los hijos de las filas nuevas y, cuando llega a las hojas, no aparece ninguna fila nueva y el motor se detiene. En este catálogo eso ocurre en la tercera vuelta.\n\nComo el árbol tiene solo dos niveles, un `LEFT JOIN` de `categories` consigo misma daría el mismo resultado hoy. La versión recursiva sigue funcionando si mañana agregan un tercer nivel: esa es la razón para escribirla así. La alternativa con `WHERE a.nivel < 5` muestra la cota defensiva que conviene dejar en producción, donde un ciclo en los datos es una posibilidad real.",
    reward: defaultReward("advanced"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "desafio-abuso-de-promociones-con-cte",
    section,
    title: "Desafío: abuso de promociones",
    difficulty: "expert",
    estimated_minutes: 14,
    concepts: ["cte", "group_by", "aggregate", "inner_join", "null_handling", "order_by"],
    dataset: pidelo,
    tables_used: ["orders", "promotions", "customers"],
    scenario_md:
      "En **Pídelo**, el equipo de Riesgo sospecha que algunos clientes usan más veces de las permitidas los códigos con tope. Cada promoción define `max_uses_per_customer` (NULL significa sin tope) y cada pedido entregado con `promotion_id` cuenta como un canje efectivo. Quieren la lista nominal para contactar a esas cuentas.",
    business_question_md:
      "Usando al menos dos CTE encadenadas, arma la lista de clientes que superaron el tope de una promoción. Considera solo pedidos con `status = 'delivered'` y `promotion_id` no nulo, e ignora las promociones sin tope. Devuelve `code`, `customer_id`, `full_name`, `usos` (canjes efectivos de ese cliente en esa promoción), `max_uses_per_customer` y `exceso` (usos menos el tope). Ordena por `exceso` descendente, luego `code` y luego `customer_id`.",
    learning_objective:
      "Descomponer una investigación de negocio en CTE encadenadas y comparar un agregado contra un límite de otra tabla.",
    theory_ref: l2,
    expected_columns: [
      { name: "code", type: "text" },
      { name: "customer_id", type: "integer" },
      { name: "full_name", type: "text" },
      { name: "usos", type: "integer" },
      { name: "max_uses_per_customer", type: "integer" },
      { name: "exceso", type: "integer" },
    ],
    validation_rules: { order_matters: true, required_concepts: ["cte", "group_by"] },
    reference_solution:
      "WITH canjes AS (\n  SELECT o.promotion_id, o.customer_id\n  FROM orders AS o\n  WHERE o.promotion_id IS NOT NULL\n    AND o.status = 'delivered'\n),\nusos AS (\n  SELECT promotion_id, customer_id, count(*) AS usos\n  FROM canjes\n  GROUP BY promotion_id, customer_id\n),\nexcesos AS (\n  SELECT u.customer_id, u.usos, p.code, p.max_uses_per_customer\n  FROM usos AS u\n  INNER JOIN promotions AS p ON p.id = u.promotion_id\n  WHERE p.max_uses_per_customer IS NOT NULL\n    AND u.usos > p.max_uses_per_customer\n)\nSELECT\n  e.code,\n  e.customer_id,\n  c.full_name,\n  e.usos,\n  e.max_uses_per_customer,\n  e.usos - e.max_uses_per_customer AS exceso\nFROM excesos AS e\nINNER JOIN customers AS c ON c.id = e.customer_id\nORDER BY exceso DESC, e.code, e.customer_id;",
    alternative_solutions: [
      {
        label: "Subconsulta derivada en lugar de CTE",
        sql: "SELECT p.code, u.customer_id, c.full_name, u.usos, p.max_uses_per_customer, u.usos - p.max_uses_per_customer AS exceso FROM (SELECT promotion_id, customer_id, count(*) AS usos FROM orders WHERE promotion_id IS NOT NULL AND status = 'delivered' GROUP BY promotion_id, customer_id) AS u INNER JOIN promotions AS p ON p.id = u.promotion_id INNER JOIN customers AS c ON c.id = u.customer_id WHERE p.max_uses_per_customer IS NOT NULL AND u.usos > p.max_uses_per_customer ORDER BY exceso DESC, p.code, u.customer_id;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "El conteo de canjes ocurre a nivel de **cliente y promoción** a la vez. Ese resultado intermedio es el que después comparas contra el tope que vive en otra tabla.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Agrupa por `promotion_id` y `customer_id` para obtener `usos`. Luego une con `promotions` para traer `code` y `max_uses_per_customer`, descarta las promociones sin tope con `IS NOT NULL` y quédate con las filas donde los usos superan el tope. El nombre del cliente llega al final desde `customers`.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nWITH canjes AS (\n  SELECT o.promotion_id, o.customer_id\n  FROM orders AS o\n  WHERE o.promotion_id IS NOT ___ AND o.status = '___'\n),\nusos AS (\n  SELECT promotion_id, customer_id, ___ AS usos\n  FROM canjes\n  GROUP BY ___, ___\n),\nexcesos AS (\n  SELECT u.customer_id, u.usos, p.code, p.max_uses_per_customer\n  FROM usos AS u\n  INNER JOIN promotions AS p ON p.id = u.___\n  WHERE p.max_uses_per_customer IS NOT NULL AND u.usos ___ p.max_uses_per_customer\n)\nSELECT e.code, e.customer_id, c.full_name, e.usos, e.max_uses_per_customer,\n       ___ AS exceso\nFROM excesos AS e\nINNER JOIN customers AS c ON c.id = e.customer_id\nORDER BY exceso DESC, e.code, e.customer_id;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "null_handling",
        description_md:
          "Comparar `usos > max_uses_per_customer` sin descartar los topes NULL: la comparación con NULL nunca es verdadera, así que no rompe el resultado, pero dejar el filtro explícito documenta la regla de negocio.",
      },
      {
        category: "aggregation_level",
        description_md:
          "Agrupar solo por `customer_id`: sumarías canjes de promociones distintas y compararías ese total contra el tope de una sola.",
      },
      {
        category: "missing_filter",
        description_md:
          "Incluir pedidos `cancelled`: hay 194 pedidos cancelados con promoción, y un canje cancelado no es un uso efectivo.",
      },
      {
        category: "join_condition",
        description_md:
          "Unir `promotions` por `p.id = o.id` en vez de `promotion_id`: el resultado queda vacío o, peor, con filas sin relación real.",
      },
    ],
    expert_explanation_md:
      "21 filas: 15 clientes excedieron BIENVENIDA (tope 1) y 6 excedieron VUELVE; dos de ellos la usaron tres veces. Es exactamente el problema de calidad que el dataset documenta, y aquí queda cuantificado.\n\nLa consulta se lee como el razonamiento de Riesgo: qué cuenta como canje, cuántos canjes hizo cada cliente por promoción, cuáles superan el tope y quiénes son. Cada CTE se puede ejecutar por separado para auditar el paso.\n\nLa versión con subconsulta derivada es igual de correcta y más corta; con tres pasos, la CTE gana en mantenibilidad, sobre todo cuando mañana Riesgo pida agregar el monto descontado (basta con arrastrar una columna más en `canjes`). Un detalle de negocio: los importes de descuento están en la moneda de cada ciudad, así que sumarlos entre países exigiría convertir primero.",
    improvement_feedback: [
      { condition: "uses_select_star", message_key: "improve.uses_select_star" },
    ],
    reward: defaultReward("expert"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
];
