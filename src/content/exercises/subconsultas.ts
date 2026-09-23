import {
  defaultHintMeta,
  defaultReward,
  defaultSolutionUnlock,
  type ExerciseDef,
} from "../schemas/exercise";

const section = "subconsultas";
const tiendaviva = { slug: "tiendaviva", version: 1 };
const bolsillo = { slug: "bolsillo", version: 1 };
const escalares = "subconsultas-escalares-y-derivadas";
const existencia = "subconsultas-in-exists-y-null";
const correlacionadas = "subconsultas-correlacionadas";

export const exercises: ExerciseDef[] = [
  {
    slug: "pedidos-sobre-el-ticket-promedio-uruguay",
    section,
    title: "Pedidos por encima del ticket promedio en Uruguay",
    difficulty: "intermediate",
    estimated_minutes: 8,
    concepts: ["subquery", "where", "aggregate", "alias"],
    dataset: tiendaviva,
    tables_used: ["orders"],
    scenario_md:
      "En **TiendaViva**, el departamento de Finanzas está preparando una revisión de los pedidos grandes de Uruguay. Quiere ver cada pedido entregado en pesos uruguayos que superó el ticket promedio de ese mismo conjunto, con el promedio a la vista para poder comparar fila por fila. Te piden ese reporte para decidir si conviene armar un segmento de clientes de alto valor.",
    business_question_md:
      "Debes generar un dataset que, tomando los pedidos cuyo `currency` es igual al texto `'UYU'` y cuyo `status` es igual al texto `'delivered'`, devuelva el `id`, el `created_at` y el `total_amount` de aquellos cuyo `total_amount` supera el promedio de `total_amount` de ese mismo conjunto, más una columna `ticket_promedio` con ese promedio redondeado a 2 decimales. El orden de las filas no importa.",
    learning_objective:
      "Usar una subconsulta escalar en WHERE y en SELECT para comparar cada fila contra un agregado del conjunto.",
    theory_ref: escalares,
    expected_columns: [
      { name: "id", type: "integer" },
      { name: "created_at", type: "timestamp" },
      { name: "total_amount", type: "numeric" },
      { name: "ticket_promedio", type: "numeric" },
    ],
    validation_rules: { required_concepts: ["subquery"] },
    reference_solution:
      "SELECT\n  o.id,\n  o.created_at,\n  o.total_amount,\n  (SELECT round(avg(o2.total_amount), 2)\n   FROM orders AS o2\n   WHERE o2.currency = 'UYU' AND o2.status = 'delivered') AS ticket_promedio\nFROM orders AS o\nWHERE o.currency = 'UYU'\n  AND o.status = 'delivered'\n  AND o.total_amount > (SELECT avg(o3.total_amount)\n                        FROM orders AS o3\n                        WHERE o3.currency = 'UYU' AND o3.status = 'delivered');",
    alternative_solutions: [
      {
        label: "Tabla derivada con el promedio y CROSS JOIN",
        sql: "SELECT\n  o.id,\n  o.created_at,\n  o.total_amount,\n  round(m.prom, 2) AS ticket_promedio\nFROM orders AS o\nCROSS JOIN (\n  SELECT avg(total_amount) AS prom\n  FROM orders\n  WHERE currency = 'UYU' AND status = 'delivered'\n) AS m\nWHERE o.currency = 'UYU'\n  AND o.status = 'delivered'\n  AND o.total_amount > m.prom;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "No puedes comparar una fila contra un promedio escribiendo una función de agregación dentro de la misma cláusula `WHERE`: necesitas calcular ese promedio en una consulta aparte y usar su resultado como si fuera un número fijo.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "El promedio sale de la tabla `orders` con los mismos filtros de moneda y de estado que el listado. Ese mismo cálculo te sirve dos veces: para comparar dentro del `WHERE` y para mostrar la columna `ticket_promedio`, que esta vez sí debe ir redondeada a 2 decimales.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT\n  o.id,\n  o.created_at,\n  o.total_amount,\n  (SELECT ___ FROM orders AS o2 WHERE ___) AS ticket_promedio\nFROM orders AS o\nWHERE o.currency = 'UYU'\n  AND o.status = 'delivered'\n  AND o.total_amount ___ (SELECT ___ FROM orders AS o3 WHERE ___);\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "missing_filter",
        description_md:
          "Calcular el promedio sin repetir los filtros `currency = 'UYU'` y `status = 'delivered'`: la comparación se hace contra el promedio de seis monedas mezcladas y de pedidos cancelados.",
      },
      {
        category: "aggregation_level",
        description_md:
          "Escribir `WHERE total_amount > avg(total_amount)`: las funciones de agregación no se pueden evaluar dentro de la cláusula `WHERE` y PostgreSQL devuelve un error.",
      },
      {
        category: "cell_values",
        description_md:
          "Mostrar la columna `ticket_promedio` sin redondear a 2 decimales, o redondear también el valor usado en el filtro, lo que cambia qué pedidos entran al resultado.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 173 pedidos sobre los 447 entregados en pesos uruguayos, que son los que superan el promedio de 14 377.35. La distribución es asimétrica, porque unos pocos pedidos muy grandes empujan la media hacia arriba, y por eso menos de la mitad quedan por encima de ella.\n\nLa subconsulta escalar del `WHERE` se ejecuta una sola vez: no depende de la fila externa, así que PostgreSQL la evalúa una vez y la trata como una constante. La versión con `CROSS JOIN` sobre una tabla derivada hace exactamente lo mismo y evita escribir el cálculo dos veces; es la opción preferible cuando el promedio se usa en varios lugares de la consulta.\n\nPresta atención al redondeo: redondear solo en la columna que se muestra es una decisión deliberada. Si redondearas también en la comparación, un pedido que esté a milésimas del promedio podría entrar o salir del listado según cómo caiga el redondeo.",
    reward: defaultReward("intermediate"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "clientes-uruguayos-que-compraron-tecnologia",
    section,
    title: "Clientes uruguayos que compraron tecnología",
    difficulty: "intermediate",
    estimated_minutes: 10,
    concepts: ["subquery", "where", "inner_join"],
    dataset: tiendaviva,
    tables_used: ["customers", "orders", "order_items", "products", "categories"],
    scenario_md:
      "El departamento de Marketing está armando una campaña de accesorios tecnológicos en Uruguay. Necesita la lista de clientes uruguayos que ya recibieron al menos un pedido con un producto de la rama **Tecnología**, que son las subcategorías cuya columna `parent_id` vale `1`. Cada cliente debe aparecer una sola vez en el listado, porque es la base de un envío de correo.",
    business_question_md:
      "Debes generar un dataset que devuelva el `id`, el `full_name` y el `city` de los clientes cuyo `country` es igual al texto `'UY'` y que tengan al menos un pedido con `status` igual al texto `'delivered'` que incluya un producto de alguna categoría cuya columna `parent_id` sea igual a `1`. El resultado no debe tener filas repetidas y el orden de las filas no importa.",
    learning_objective:
      "Filtrar con IN sobre una subconsulta de lista sin duplicar filas ni recurrir a DISTINCT.",
    theory_ref: existencia,
    expected_columns: [
      { name: "id", type: "integer" },
      { name: "full_name", type: "text" },
      { name: "city", type: "text" },
    ],
    validation_rules: { required_concepts: ["subquery"] },
    reference_solution:
      "SELECT c.id, c.full_name, c.city\nFROM customers AS c\nWHERE c.country = 'UY'\n  AND c.id IN (\n    SELECT o.customer_id\n    FROM orders AS o\n    WHERE o.status = 'delivered'\n      AND o.id IN (\n        SELECT oi.order_id\n        FROM order_items AS oi\n        WHERE oi.product_id IN (\n          SELECT p.id\n          FROM products AS p\n          WHERE p.category_id IN (SELECT ca.id FROM categories AS ca WHERE ca.parent_id = 1)\n        )\n      )\n  );",
    alternative_solutions: [
      {
        label: "EXISTS con joins dentro de la subconsulta",
        sql: "SELECT c.id, c.full_name, c.city\nFROM customers AS c\nWHERE c.country = 'UY'\n  AND EXISTS (\n    SELECT 1\n    FROM orders AS o\n    INNER JOIN order_items AS oi ON oi.order_id = o.id\n    INNER JOIN products AS p ON p.id = oi.product_id\n    INNER JOIN categories AS ca ON ca.id = p.category_id\n    WHERE o.customer_id = c.id\n      AND o.status = 'delivered'\n      AND ca.parent_id = 1\n  );",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "La pregunta es de pertenencia: si este cliente está o no en el conjunto de los que compraron tecnología. Resolverla con cruces te obligaría después a quitar duplicados; filtrar contra una lista de identificadores no.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Arma la cadena desde adentro hacia afuera: primero las categorías con `parent_id = 1`, después los productos de esas categorías, después las líneas de `order_items` con esos productos, después los pedidos entregados que contienen esas líneas y por último los clientes de esos pedidos. Ejecuta cada nivel por separado antes de anidarlo.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT c.id, c.full_name, c.city\nFROM customers AS c\nWHERE c.country = '___'\n  AND c.id ___ (\n    SELECT o.customer_id\n    FROM orders AS o\n    WHERE o.status = '___'\n      AND o.id IN (\n        SELECT oi.order_id\n        FROM order_items AS oi\n        WHERE oi.product_id IN (\n          SELECT ___ FROM products AS p WHERE p.category_id IN (SELECT ___ FROM categories AS ca WHERE ___)\n        )\n      )\n  );\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "duplicates",
        description_md:
          "Resolver todo con `INNER JOIN`: la consulta devuelve un cliente repetido por cada línea de pedido que cumple la condición.",
      },
      {
        category: "missing_filter",
        description_md:
          "Olvidar la condición `status = 'delivered'`: entran pedidos cancelados o pendientes que la campaña no debería considerar.",
      },
      {
        category: "join_condition",
        description_md:
          "Filtrar por `category_id = 1` en lugar de filtrar por las subcategorías: la categoría 1 es la raíz «Tecnología» y no tiene productos asignados directamente, así que el resultado sale vacío.",
      },
      {
        category: "wrong_columns",
        description_md:
          "Seleccionar más de una columna dentro del operador `IN`: PostgreSQL devuelve el error «subquery has too many columns».",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 63 clientes sobre los 123 clientes uruguayos. La versión con operadores `IN` anidados se lee como una cadena de pertenencias y evita por completo el problema de la cardinalidad, porque el operador `IN` filtra filas y no las multiplica.\n\nLa alternativa con `EXISTS` usa cruces adentro de la subconsulta, pero como esa subconsulta solo responde si hay o no hay filas, tampoco duplica el resultado. Conviene elegir `EXISTS` cuando la condición mezcla varias tablas, porque queda más plana, e `IN` cuando la cadena es una sucesión limpia de identificadores.\n\nSi además necesitaras el monto comprado en tecnología por cada cliente, ninguna de las dos formas alcanzaría: ahí sí corresponde un cruce con `GROUP BY`, porque necesitas las filas del detalle para poder sumarlas.",
    reward: defaultReward("intermediate"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "tarjetas-fisicas-sin-uso",
    section,
    title: "Tarjetas físicas que nunca se usaron",
    difficulty: "advanced",
    estimated_minutes: 10,
    concepts: ["subquery", "null_handling", "inner_join", "where"],
    dataset: bolsillo,
    tables_used: ["cards", "transactions", "users"],
    scenario_md:
      "En **Bolsillo**, el departamento de Producto quiere frenar el costo de emisión de plásticos. Pide la lista de tarjetas físicas activas que nunca se usaron en ningún movimiento, para evaluar si conviene dejar de emitirlas por omisión.\n\nTen en cuenta un detalle de los datos: en la tabla `transactions`, la columna `card_id` solo tiene valor en los pagos con tarjeta; en el resto de los movimientos está en `NULL`.",
    business_question_md:
      "Debes generar un dataset que devuelva el `id`, el `last4` y el `issued_at` de las tarjetas cuyo `kind` es igual al texto `'physical'` y cuyo `status` es igual al texto `'active'` y que no aparezcan en ningún movimiento de la tabla `transactions`, junto con el `full_name` y el `country` de la persona titular. El orden de las filas no importa.",
    learning_objective:
      "Expresar «no tiene ninguno» con NOT EXISTS y reconocer por qué NOT IN falla cuando la columna admite NULL.",
    theory_ref: existencia,
    expected_columns: [
      { name: "id", type: "integer" },
      { name: "last4", type: "text" },
      { name: "issued_at", type: "date" },
      { name: "full_name", type: "text" },
      { name: "country", type: "text" },
    ],
    validation_rules: { required_concepts: ["subquery"] },
    reference_solution:
      "SELECT c.id, c.last4, c.issued_at, u.full_name, u.country\nFROM cards AS c\nINNER JOIN users AS u ON u.id = c.user_id\nWHERE c.kind = 'physical'\n  AND c.status = 'active'\n  AND NOT EXISTS (\n    SELECT 1\n    FROM transactions AS t\n    WHERE t.card_id = c.id\n  );",
    alternative_solutions: [
      {
        label: "NOT IN con la lista depurada de NULL",
        sql: "SELECT c.id, c.last4, c.issued_at, u.full_name, u.country\nFROM cards AS c\nINNER JOIN users AS u ON u.id = c.user_id\nWHERE c.kind = 'physical'\n  AND c.status = 'active'\n  AND c.id NOT IN (\n    SELECT t.card_id\n    FROM transactions AS t\n    WHERE t.card_id IS NOT NULL\n  );",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Es una pregunta de ausencia. Si la resuelves comparando contra una lista de valores, recuerda qué pasa cuando esa lista contiene un `NULL`: la condición deja de ser falsa y pasa a ser desconocida, así que no sobrevive ninguna fila.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Hay dos caminos seguros: preguntar por la inexistencia de movimientos para cada tarjeta, con la condición `t.card_id = c.id` dentro de la subconsulta, o depurar los valores `NULL` de la lista antes de negarla. Los datos de la persona titular salen de un cruce con la tabla `users`.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT c.id, c.last4, c.issued_at, u.full_name, u.country\nFROM cards AS c\nINNER JOIN users AS u ON ___\nWHERE c.kind = '___'\n  AND c.status = 'active'\n  AND ___ (\n    SELECT 1\n    FROM transactions AS t\n    WHERE ___\n  );\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "null_handling",
        description_md:
          "Escribir `NOT IN (SELECT card_id FROM transactions)` sin excluir los valores `NULL`: la consulta se ejecuta sin error y devuelve cero filas, que parece una respuesta válida.",
      },
      {
        category: "missing_filter",
        description_md:
          "Olvidar las condiciones `kind = 'physical'` o `status = 'active'`: entran tarjetas virtuales o ya bloqueadas, que no generan costo de plástico.",
      },
      {
        category: "join_condition",
        description_md:
          "Omitir la condición de correlación `t.card_id = c.id` dentro del `NOT EXISTS`: la subconsulta siempre devuelve filas y el resultado queda vacío.",
      },
      {
        category: "row_count",
        description_md:
          "Resolverlo con un `LEFT JOIN` a `transactions` sin filtrar después por `t.id IS NULL`, o filtrando mal: la consulta devuelve una fila por movimiento en lugar de una por tarjeta.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 296 tarjetas físicas activas que nunca se usaron. La trampa está en los datos: 20 613 de los 32 243 movimientos tienen la columna `card_id` en `NULL`, porque corresponden a cargas, transferencias y comisiones. Con un solo `NULL` en la lista, el operador `NOT IN` devuelve el conjunto vacío, porque la expresión `x NOT IN (..., NULL)` se evalúa como desconocida cuando `x` no coincide con ningún valor, y lo desconocido no pasa el filtro.\n\nEl operador `NOT EXISTS` no compara valores: pregunta si la subconsulta produce filas o no. Por eso es la forma robusta de expresar «no tiene ninguno», y la que conviene usar por omisión cuando no controlas si la columna admite `NULL`.\n\nUna tercera forma es la antiunión: `LEFT JOIN transactions AS t ON t.card_id = c.id` combinado con `WHERE t.id IS NULL`. Es equivalente y, en PostgreSQL, el planificador termina eligiendo el mismo plan para las tres versiones. Entre `NOT EXISTS` y la antiunión, elige la que exprese mejor la intención para quien lea el código dentro de seis meses.",
    reward: defaultReward("advanced"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "pedidos-promedio-por-cliente-y-pais",
    section,
    title: "Pedidos promedio por cliente y país",
    difficulty: "advanced",
    estimated_minutes: 11,
    concepts: ["subquery", "group_by", "aggregate", "inner_join", "order_by"],
    dataset: tiendaviva,
    tables_used: ["orders", "customers"],
    scenario_md:
      "La dirección de **TiendaViva** quiere comparar la fidelidad de los clientes entre países. No le interesa cuántos pedidos hubo en total, sino **cuántos pedidos entregados acumula en promedio cada cliente que efectivamente compró**, así que los clientes sin pedidos entregados quedan fuera del cálculo. Te piden ese indicador para decidir dónde invertir en retención.",
    business_question_md:
      "Debes generar un dataset que devuelva el `country`, la cantidad de clientes con al menos un pedido cuyo `status` es igual al texto 'delivered' bajo el encabezado `clientes_con_pedidos` y el promedio de esos pedidos entregados por cliente bajo el encabezado `pedidos_promedio`, redondeado a 2 decimales, ordenado por `pedidos_promedio` descendente.",
    learning_objective:
      "Usar una tabla derivada en FROM para aplicar una agregación sobre el resultado de otra agregación.",
    theory_ref: escalares,
    expected_columns: [
      { name: "country", type: "text" },
      { name: "clientes_con_pedidos", type: "integer" },
      { name: "pedidos_promedio", type: "numeric" },
    ],
    validation_rules: { order_matters: true, required_concepts: ["subquery", "group_by"] },
    reference_solution:
      "SELECT\n  c.country,\n  count(*) AS clientes_con_pedidos,\n  round(avg(p.pedidos), 2) AS pedidos_promedio\nFROM (\n  SELECT customer_id, count(*) AS pedidos\n  FROM orders\n  WHERE status = 'delivered'\n  GROUP BY customer_id\n) AS p\nINNER JOIN customers AS c ON c.id = p.customer_id\nGROUP BY c.country\nORDER BY pedidos_promedio DESC;",
    alternative_solutions: [
      {
        label: "Join dentro de la tabla derivada",
        sql: "SELECT\n  t.country,\n  count(*) AS clientes_con_pedidos,\n  round(avg(t.pedidos), 2) AS pedidos_promedio\nFROM (\n  SELECT c.country, o.customer_id, count(*) AS pedidos\n  FROM orders AS o\n  INNER JOIN customers AS c ON c.id = o.customer_id\n  WHERE o.status = 'delivered'\n  GROUP BY c.country, o.customer_id\n) AS t\nGROUP BY t.country\nORDER BY pedidos_promedio DESC;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Son dos niveles de agregación: uno por cliente y otro por país. SQL no permite anidar funciones de agregación, así que el primer nivel tiene que resolverse en una consulta aparte que la segunda pueda leer como si fuera una tabla.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "La consulta interna agrupa la tabla `orders` por `customer_id` y cuenta los pedidos entregados. La consulta externa une ese resultado con la tabla `customers` para conocer el país, agrupa por país, cuenta las filas, que son los clientes, y promedia la columna de conteo. No olvides ponerle un alias a la subconsulta.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT\n  c.country,\n  ___ AS clientes_con_pedidos,\n  round(___, 2) AS pedidos_promedio\nFROM (\n  SELECT customer_id, ___ AS pedidos\n  FROM orders\n  WHERE ___\n  GROUP BY ___\n) AS p\nINNER JOIN customers AS c ON ___\nGROUP BY c.country\nORDER BY pedidos_promedio DESC;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "aggregation_level",
        description_md:
          "Intentar escribir `avg(count(*))` en una sola consulta: SQL no permite agregaciones anidadas y PostgreSQL devuelve un error.",
      },
      {
        category: "aggregation_level",
        description_md:
          "Calcular `count(*) / count(DISTINCT customer_id)` directamente sobre la tabla `orders`, sin subconsulta: da un número parecido, pero no es el promedio de los conteos por cliente cuando el conjunto de clientes cambia entre países.",
      },
      {
        category: "missing_filter",
        description_md:
          "Contar todos los pedidos en lugar de solo los entregados, o aplicar el filtro únicamente en la consulta externa, donde la columna `status` ya no existe.",
      },
      {
        category: "cell_values",
        description_md: "Devolver la columna `pedidos_promedio` sin redondear a 2 decimales.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da seis filas. Chile lidera con 5.51 pedidos entregados por cliente y Uruguay cierra la tabla con 4.72, sobre bases de tamaño muy distinto: 240 clientes chilenos frente a 105 uruguayos. El promedio por cliente cuenta una historia diferente a la del volumen total, donde México y Argentina dominan.\n\nLa tabla derivada es obligatoria en este caso: el resultado del primer nivel, que son los pedidos por cliente, es el insumo del segundo nivel, que es el promedio por país. En la variante alternativa, el cruce entra dentro de la subconsulta y la consulta externa solo agrupa; las dos formas leen la tabla `orders` una sola vez y cuestan prácticamente lo mismo. La primera versión mantiene la subconsulta enfocada en una sola idea, lo que ayuda cuando alguien la lee sin contexto.\n\nDesde la sección 22 vas a poder escribir ese paso intermedio como una expresión de tabla común, con la forma `WITH pedidos_por_cliente AS (...)`, que es la manera más legible cuando el resultado intermedio se usa más de una vez.",
    reward: defaultReward("advanced"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "diagnostico-de-cuentas-congeladas",
    section,
    title: "Diagnóstico de cuentas congeladas",
    difficulty: "advanced",
    estimated_minutes: 11,
    concepts: ["subquery", "aggregate", "where", "alias"],
    dataset: bolsillo,
    tables_used: ["accounts", "transactions"],
    scenario_md:
      "El departamento de Riesgo está revisando las cuentas congeladas de **Bolsillo** antes de decidir cuáles reactivar. Necesita, para cada cuenta cuyo `status` es igual al texto `'frozen'`, su actividad histórica: cuántos movimientos completados tuvo y cuándo fue el último. Te piden ese diagnóstico para priorizar la revisión manual.",
    business_question_md:
      "Debes generar un dataset que devuelva el `id`, el `currency` y el `balance` de las cuentas cuyo `status` es igual al texto `'frozen'`, más la cantidad de movimientos de esa cuenta cuyo `status` es igual al texto `'completed'` bajo el encabezado `movimientos`, y el mayor `created_at` entre esos movimientos bajo el encabezado `ultimo_movimiento`. El orden de las filas no importa.",
    learning_objective:
      "Escribir subconsultas correlacionadas en SELECT y compararlas con el join agrupado equivalente.",
    theory_ref: correlacionadas,
    expected_columns: [
      { name: "id", type: "integer" },
      { name: "currency", type: "text" },
      { name: "balance", type: "numeric" },
      { name: "movimientos", type: "integer" },
      { name: "ultimo_movimiento", type: "timestamp" },
    ],
    validation_rules: { required_concepts: ["subquery"] },
    reference_solution:
      "SELECT\n  a.id,\n  a.currency,\n  a.balance,\n  (SELECT count(*)\n   FROM transactions AS t\n   WHERE t.account_id = a.id AND t.status = 'completed') AS movimientos,\n  (SELECT max(t.created_at)\n   FROM transactions AS t\n   WHERE t.account_id = a.id AND t.status = 'completed') AS ultimo_movimiento\nFROM accounts AS a\nWHERE a.status = 'frozen';",
    alternative_solutions: [
      {
        label: "LEFT JOIN con GROUP BY",
        sql: "SELECT\n  a.id,\n  a.currency,\n  a.balance,\n  count(t.id) AS movimientos,\n  max(t.created_at) AS ultimo_movimiento\nFROM accounts AS a\nLEFT JOIN transactions AS t\n  ON t.account_id = a.id\n AND t.status = 'completed'\nWHERE a.status = 'frozen'\nGROUP BY a.id, a.currency, a.balance;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "La tabla principal de la consulta es la de cuentas, y quieres agregarle dos métricas calculadas sobre otra tabla sin perder ni duplicar cuentas. Una subconsulta que mire la fila actual de la consulta externa resuelve cada métrica por separado.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Dale un alias a la tabla externa, por ejemplo `accounts AS a`, y usa ese alias dentro de cada subconsulta para enlazarla con la cuenta de la fila, escribiendo `t.account_id = a.id`. Las dos subconsultas tienen que repetir el filtro `t.status = 'completed'`.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT\n  a.id,\n  a.currency,\n  a.balance,\n  (SELECT ___ FROM transactions AS t WHERE ___ AND t.status = '___') AS movimientos,\n  (SELECT ___ FROM transactions AS t WHERE ___ AND t.status = '___') AS ultimo_movimiento\nFROM accounts AS a\nWHERE a.status = '___';\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "join_condition",
        description_md:
          "Olvidar la condición de correlación `t.account_id = a.id`: todas las cuentas muestran el total global de la plataforma y la consulta no falla, así que el error pasa desapercibido.",
      },
      {
        category: "missing_filter",
        description_md:
          "No repetir la condición `t.status = 'completed'` en las dos subconsultas: el conteo y la fecha terminan describiendo conjuntos de movimientos distintos.",
      },
      {
        category: "aggregation_level",
        description_md:
          "Resolverlo con `INNER JOIN` y `GROUP BY` sin poner el filtro en el `ON`: si una cuenta congelada no tuviera movimientos completados, desaparecería del reporte.",
      },
      {
        category: "duplicates",
        description_md:
          "Unir la tabla `transactions` sin agrupar después: el resultado tiene una fila por movimiento en lugar de una fila por cuenta.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 126 cuentas congeladas, con una fila por cuenta. Las subconsultas correlacionadas mantienen a la tabla `accounts` como protagonista: no hay cláusula `GROUP BY`, no hay riesgo de multiplicar filas y cada métrica se lee como una pregunta independiente.\n\nLa alternativa con `LEFT JOIN` y `GROUP BY` devuelve exactamente lo mismo, pero exige dos cuidados. El filtro `t.status = 'completed'` va en el `ON`, porque puesto en el `WHERE` convertiría el `LEFT JOIN` en un `INNER JOIN` y perderías las cuentas sin movimientos completados. Y hay que usar `count(t.id)` en lugar de `count(*)`, que informaría 1 para una cuenta sin ninguna coincidencia.\n\nCuál conviene elegir depende de cuántas métricas necesites. Con una o dos, la subconsulta correlacionada suele ganar en legibilidad. A partir de tres o cuatro, cada subconsulta implica un recorrido más de la tabla `transactions`, y entonces el cruce agrupado, que hace una sola pasada y usa agregación condicional si hace falta, es la mejor opción. Los planes que arma PostgreSQL para las dos versiones son comparables en este volumen de datos: el criterio real es quién va a leer el código después.",
    reward: defaultReward("advanced"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
];
