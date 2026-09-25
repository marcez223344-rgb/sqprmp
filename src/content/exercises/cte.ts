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
      "En **TiendaViva**, el departamento de Finanzas quiere saber cuánto gasta un cliente típico en cada país durante 2025. La cifra se calcula en dos pasos: primero el gasto acumulado de **cada cliente** y después el promedio de esos gastos dentro de su país. Ten en cuenta que cada país opera en su propia moneda, así que los promedios se comparan dentro del país y nunca entre países. Te piden ese indicador para fijar las metas comerciales del año.",
    business_question_md:
      "Debes generar un dataset que, tomando únicamente los pedidos cuyo `status` es igual al texto `'delivered'` y cuya columna `created_at` es igual o posterior al 1 de enero de 2025, calcule primero el gasto total de cada cliente, con `sum(total_amount)`, y después devuelva, por país del cliente, el `country`, la cantidad de clientes con al menos un pedido entregado bajo el encabezado `clientes` y el promedio de ese gasto bajo el encabezado `gasto_promedio`, redondeado a 2 decimales. Ordena por `country` ascendente.\n\nUna subconsulta derivada resolvería lo mismo, pero en este ejercicio practicamos la forma con `WITH`: la consigna pide una expresión de tabla común.",
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
    alternative_solutions: [],
    hints: [
      {
        level: 1,
        body_md:
          "Son dos niveles de agregación distintos: uno por cliente y otro por país. No se pueden resolver en una sola cláusula `GROUP BY`; hay que darle nombre al primer paso y agruparlo de nuevo.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "En el primer paso agrupa por `c.id` y por `c.country`, porque vas a necesitar el país en el segundo paso, y filtra allí el estado y la fecha. En el segundo paso, la función `count(*)` cuenta las filas de ese resultado intermedio, es decir, cuenta clientes.",
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
          "Calcular `avg(o.total_amount)` agrupando solamente por país: eso da el ticket promedio por pedido y no el gasto promedio por cliente, que es lo que pidió Finanzas.",
      },
      {
        category: "missing_filter",
        description_md:
          "Olvidar la condición `status = 'delivered'`: entran pedidos cancelados y devueltos, que no representan gasto real.",
      },
      {
        category: "date_boundary",
        description_md:
          "Filtrar con `EXTRACT(YEAR FROM created_at) = 2025` está bien, pero usar `created_at > DATE '2025-01-01'` deja fuera los pedidos del 1 de enero.",
      },
      {
        category: "wrong_order",
        description_md: "No ordenar por la columna `country`, que es el orden que pide el reporte.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da seis filas, una por país. La clave es que hay **dos niveles de agregación**: una suma por cliente y un promedio sobre esas sumas. La expresión de tabla común existe justamente para materializar el nivel intermedio con un nombre legible.\n\nUna subconsulta derivada escrita en el `FROM` produce el mismo plan de ejecución, aunque este ejercicio pide la expresión de tabla común porque es lo que practica la sección; la expresión de tabla común gana en legibilidad y te deja probar el primer paso por separado mientras la escribes.\n\nSobre el resultado: Colombia y Argentina muestran cifras enormes frente a México o Perú porque cada país factura en su moneda local. Comparar la columna `gasto_promedio` entre países sin convertir las monedas sería un error de análisis, no de SQL.",
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
      "En **Pídelo**, el departamento de Operaciones está revisando el cumplimiento de la promesa de entrega. Un pedido se considera **tardío** cuando el tiempo real transcurrido entre `placed_at` y `delivered_at` supera los minutos guardados en `promised_minutes`. Quieren una tabla por ciudad para priorizar en qué plazas reforzar la flota de repartidores, y te piden que la armes.",
    business_question_md:
      "Debes generar un dataset que, tomando los pedidos cuyo `status` es igual al texto `'delivered'`, devuelva por ciudad del restaurante el `city`, la cantidad de entregas bajo el encabezado `entregas`, la cantidad de entregas tardías bajo el encabezado `tardias` y el porcentaje que representan bajo el encabezado `pct_tardias`, redondeado a 2 decimales. Debes resolverlo con dos expresiones de tabla común encadenadas: la primera con el detalle por pedido, es decir la ciudad, los minutos prometidos y los minutos reales, y la segunda con el resumen por ciudad. Ordena por `pct_tardias` descendente y, si dos ciudades empatan, debes desempatar usando `city` ascendente.",
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
          "Primero necesitas, para cada pedido entregado, su ciudad y cuántos minutos tardó realmente. Recién con ese detalle puedes contar cuántos superaron la promesa.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "La duración real sale de la expresión `EXTRACT(EPOCH FROM (delivered_at - placed_at)) / 60`. La ciudad no está en la tabla `orders`: llega a través de `restaurants.city_id` hacia la tabla `cities`. En el segundo paso, la expresión `count(*) FILTER (WHERE ...)`, o bien `sum(CASE ...)`, cuenta solamente las entregas tardías.",
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
          "No filtrar por `status = 'delivered'`: los pedidos sin `delivered_at` producen `NULL` en la resta y desaparecen del conteo de tardías, pero siguen sumando en la columna `entregas`, así que el porcentaje queda mal.",
      },
      {
        category: "join_condition",
        description_md:
          "Traer la ciudad desde el cliente, con `customers.city_id`, en lugar de traerla desde el restaurante: la pregunta es sobre la plaza donde opera la cocina.",
      },
      {
        category: "cell_values",
        description_md:
          "Calcular `100 * tardias / entregas` con aritmética entera: la división entera devuelve 0. Hay que escribir `100.0` o convertir uno de los operandos a `numeric`.",
      },
      {
        category: "aggregation_level",
        description_md:
          "Contar las tardías con una cláusula `WHERE` en el segundo paso: estarías filtrando también el denominador y la columna `pct_tardias` daría 100 en todas las ciudades.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da ocho ciudades. Montevideo encabeza la tabla con 23.46 % y Buenos Aires la cierra con 20.45 %: la diferencia entre plazas es de unos tres puntos, así que el problema es sistémico y no de una ciudad puntual.\n\nEl valor de encadenar las expresiones de tabla común está en el tercer paso: la columna `pct_tardias` usa `tardias` y `entregas`, dos alias calculados en la expresión anterior. En una sola consulta tendrías que repetir las dos expresiones de agregación completas dentro de la división.\n\nLa cláusula `FILTER` y la expresión `sum(CASE ...)` son equivalentes en este caso; `FILTER` forma parte del estándar SQL desde 2003 y se lee mejor cuando hay varias métricas condicionales en la misma consulta.",
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
      "El departamento Comercial está armando el plan de inversión publicitaria de **TiendaViva México** y necesita saber qué categorías facturan por encima del promedio de todas las categorías, y por cuánto lo superan. El mismo cálculo de ingresos se necesita dos veces: una para listar las categorías y otra para obtener el promedio contra el cual compararlas. Te piden ese reporte para repartir el presupuesto.",
    business_question_md:
      "Debes generar un dataset que, tomando los pedidos cuyo `status` es igual al texto `'delivered'` y cuyo `currency` es igual al texto `'MXN'`, calcule los ingresos de cada categoría como `sum(quantity * unit_price)` redondeado a 2 decimales bajo el encabezado `ingresos`. Devuelve solamente las categorías cuyos ingresos superan el promedio de ingresos de todas las categorías, con la `category`, los `ingresos` y la diferencia contra ese promedio bajo el encabezado `diferencia_vs_promedio`, redondeada a 2 decimales. Ordena por `ingresos` descendente.\n\nDefine el cálculo de ingresos una sola vez en una expresión de tabla común y refiérete a ella tantas veces como necesites.",
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
          "El promedio contra el que comparas se calcula **sobre el resultado ya agregado**, no sobre las filas originales. Nombra ese resultado una sola vez y úsalo tanto para listar como para comparar.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "El camino de cruces es `order_items`, después `orders` para filtrar el estado y la moneda, después `products` y por último `categories`. Una vez definida la expresión de tabla común, el promedio sale de `(SELECT avg(ingresos) FROM ...)`, que puedes usar tanto en el `WHERE` como en el `SELECT`.",
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
          "Comparar contra `avg(oi.quantity * oi.unit_price)` calculado sobre las líneas de pedido: ese es el promedio por línea y no el promedio de ingresos por categoría.",
      },
      {
        category: "missing_filter",
        description_md:
          "Omitir la condición `currency = 'MXN'`: la suma mezcla seis monedas distintas y el ranking deja de tener sentido.",
      },
      {
        category: "cell_values",
        description_md:
          "Usar la columna `o.total_amount` en lugar de `quantity * unit_price`: el total del pedido incluye el envío y el descuento, y además se repetiría en cada línea del mismo pedido.",
      },
      {
        category: "duplicates",
        description_md:
          "Unir la tabla `categories` con la condición `cat.id = p.id` en lugar de `p.category_id`: el cruce deja de tener sentido y los ingresos quedan mal repartidos entre categorías.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da ocho categorías por encima del promedio, encabezadas por Celulares, con 4 221 797.73 pesos mexicanos, casi tres millones por encima del promedio. Las cuatro primeras son de la rama Tecnología: la concentración es alta.\n\nLo interesante del ejercicio es la **reutilización**: la expresión `ventas_por_categoria` se menciona tres veces, en el `FROM`, en la subconsulta del `SELECT` y en la del `WHERE`, pero se define una sola vez. Con subconsultas derivadas habría que repetir los cuatro cruces en cada uno de esos lugares.\n\nLa alternativa con una segunda expresión de tabla común y un `CROSS JOIN` evita ejecutar dos veces la subconsulta escalar y suele leerse mejor cuando el promedio se usa en muchas columnas. Una tercera vía es calcular `avg(ingresos) OVER ()` como función de ventana; las tres formas dan el mismo resultado.",
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
      "El departamento de Catálogo de **TiendaViva** quiere exportar el árbol completo de categorías para el menú de navegación: cada categoría con su nivel de profundidad y la ruta legible desde la raíz, por ejemplo `Hogar > Cocina`. La tabla `categories` solo guarda la columna `parent_id`, así que hay que recorrerla nivel por nivel sin asumir de antemano cuántos niveles tiene. Te piden ese archivo para alimentar el menú del sitio.",
    business_question_md:
      "Debes generar un dataset, usando una expresión de tabla común recursiva sobre la tabla `categories`, que devuelva el `id`, el `name`, el `nivel`, que vale 1 para las categorías raíz, es decir las que tienen `parent_id` en `NULL`, y uno más por cada nivel de descendencia, y la `ruta`, que es el camino desde la raíz con los nombres separados por el texto ` > `, o sea espacio, signo mayor que y espacio. Ordena por `ruta` ascendente.\n\nDeclara los nombres de las columnas junto al nombre de la expresión, con la forma `WITH RECURSIVE arbol(id, name, parent_id, nivel, ruta) AS (...)`. Es la forma que usa la documentación de PostgreSQL y, en este entorno, la única que acepta el analizador de consultas para una expresión recursiva.",
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
          "Una expresión de tabla común recursiva tiene dos ramas unidas por `UNION ALL`: la que arranca, que trae las filas sin padre, y la que avanza un nivel usando lo que ya se encontró.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "En la rama de arranque, la columna `nivel` vale 1 y la columna `ruta` es el propio `name`; con la lista de columnas declarada en el encabezado de la expresión no hace falta repetir los alias. En la rama que avanza, une la tabla `categories` con la expresión por la condición `a.id = c.parent_id`, suma 1 al nivel y concatena los nombres con el operador `||`. Recuerda escribir la palabra clave `RECURSIVE` justo después de `WITH`.",
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
          "Olvidar la palabra clave `RECURSIVE`: PostgreSQL responde que la relación `arbol` no existe, porque sin esa palabra la expresión no puede mencionarse a sí misma.",
      },
      {
        category: "join_condition",
        description_md:
          "Invertir la condición del paso recursivo, escribiendo `c.id = a.parent_id`: recorrerías hacia arriba desde las raíces y no bajaría ningún nivel.",
      },
      {
        category: "null_handling",
        description_md:
          "Usar la condición `parent_id = NULL` en el caso base: esa comparación nunca puede dar verdadero, la expresión arranca vacía y el resultado sale sin filas. Hay que escribir `IS NULL`.",
      },
      {
        category: "performance",
        description_md:
          "Omitir cualquier cota de profundidad: con datos que contengan un ciclo, la recursión no termina nunca y la consulta muere por tiempo agotado.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 30 filas: 6 categorías raíz en el nivel 1 y 24 subcategorías en el nivel 2. Ordenar por la columna `ruta` agrupa visualmente cada rama, porque la ruta de cada hijo empieza con el nombre de su padre.\n\nLa terminación está garantizada por la forma de los datos: cada vuelta busca los hijos de las filas nuevas y, cuando llega a las hojas del árbol, no aparece ninguna fila nueva y el motor se detiene. En este catálogo eso ocurre en la tercera vuelta.\n\nComo el árbol tiene solamente dos niveles, un `LEFT JOIN` de la tabla `categories` consigo misma daría el mismo resultado hoy. La versión recursiva sigue funcionando si mañana agregan un tercer nivel, y esa es la razón para escribirla así. La alternativa con la condición `WHERE a.nivel < 5` muestra la cota defensiva que conviene dejar en producción, donde un ciclo en los datos es una posibilidad real.",
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
      "En **Pídelo**, el departamento de Riesgo sospecha que algunos clientes usan más veces de las permitidas los códigos promocionales que tienen tope. Cada promoción define su límite en la columna `max_uses_per_customer`, donde un valor `NULL` significa que no tiene tope, y cada pedido entregado con un `promotion_id` cuenta como un canje efectivo. Quieren la lista nominal para contactar a esas cuentas, y te piden que la armes.",
    business_question_md:
      "Debes generar un dataset, usando al menos dos expresiones de tabla común encadenadas, con la lista de clientes que superaron el tope de una promoción. Considera solamente los pedidos cuyo `status` es igual al texto `'delivered'` y cuya columna `promotion_id` no está en `NULL`, e ignora las promociones que no tienen tope. Devuelve el `code`, el `customer_id`, el `full_name`, la cantidad de canjes efectivos de ese cliente en esa promoción bajo el encabezado `usos`, el `max_uses_per_customer` y la diferencia entre los usos y el tope bajo el encabezado `exceso`. Ordena por `exceso` descendente, después por `code` y después por `customer_id`.",
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
    alternative_solutions: [],
    hints: [
      {
        level: 1,
        body_md:
          "El conteo de canjes ocurre a nivel de **cliente y promoción** al mismo tiempo. Ese resultado intermedio es el que después comparas contra el tope, que vive en otra tabla.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Agrupa por `promotion_id` y por `customer_id` para obtener la columna `usos`. Después une con la tabla `promotions` para traer el `code` y el `max_uses_per_customer`, descarta las promociones sin tope con la condición `IS NOT NULL` y quédate con las filas en las que los usos superan el tope. El nombre del cliente llega al final desde la tabla `customers`.",
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
          "Comparar `usos > max_uses_per_customer` sin descartar antes los topes en `NULL`: la comparación con `NULL` nunca da verdadero, así que no rompe el resultado, pero dejar el filtro explícito documenta la regla de negocio.",
      },
      {
        category: "aggregation_level",
        description_md:
          "Agrupar solamente por `customer_id`: sumarías los canjes de promociones distintas y compararías ese total contra el tope de una sola promoción.",
      },
      {
        category: "missing_filter",
        description_md:
          "Incluir los pedidos cancelados: hay 194 pedidos cancelados con promoción, y un canje cancelado no es un uso efectivo.",
      },
      {
        category: "join_condition",
        description_md:
          "Unir la tabla `promotions` con la condición `p.id = o.id` en lugar de usar `promotion_id`: el resultado queda vacío o, peor todavía, con filas que no tienen ninguna relación real.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 21 filas: 15 clientes excedieron el código `BIENVENIDA`, cuyo tope es 1, y 6 excedieron el código `VUELVE`; dos de ellos lo usaron tres veces. Es exactamente el problema de calidad que el dataset documenta, y acá queda cuantificado.\n\nLa consulta se lee como el razonamiento del área de Riesgo: qué cuenta como canje, cuántos canjes hizo cada cliente en cada promoción, cuáles superan el tope y quiénes son esas personas. Cada expresión de tabla común se puede ejecutar por separado para auditar el paso.\n\nUna versión con subconsultas derivadas daría el mismo resultado y sería más corta, pero este desafío pide expresiones de tabla común; con tres pasos, la expresión de tabla común gana en mantenibilidad, sobre todo cuando mañana Riesgo pida agregar el monto descontado, porque alcanza con arrastrar una columna más en el primer paso. Un detalle de negocio: los importes de descuento están expresados en la moneda de cada ciudad, así que sumarlos entre países exigiría convertirlos primero.",
    improvement_feedback: [
      { condition: "uses_select_star", message_key: "improve.uses_select_star" },
    ],
    reward: defaultReward("expert"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
];
