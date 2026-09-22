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
      "En **TiendaViva**, Finanzas prepara una revisión de los pedidos grandes de Uruguay. Quiere ver cada pedido entregado en pesos uruguayos que superó el ticket promedio de ese mismo conjunto, con el promedio a la vista para poder comparar.",
    business_question_md:
      "Para los pedidos con `currency = 'UYU'` y `status = 'delivered'`, devuelve `id`, `created_at` y `total_amount` de aquellos cuyo `total_amount` supera el promedio de `total_amount` de ese mismo conjunto, más una columna `ticket_promedio` con ese promedio redondeado a 2 decimales. El orden no importa.",
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
          "No puedes comparar una fila contra un promedio en el mismo `WHERE` con una función de agregación: necesitas calcular ese promedio en una consulta aparte y usar su resultado como si fuera un número fijo.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "El promedio sale de `orders` con los mismos filtros de moneda y estado que el listado. Ese mismo cálculo te sirve dos veces: para comparar en `WHERE` y para mostrar la columna `ticket_promedio` (esta última redondeada a 2 decimales).",
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
          "Calcular el promedio sin repetir los filtros `currency = 'UYU'` y `status = 'delivered'`: comparas contra el promedio de seis monedas y de pedidos cancelados.",
      },
      {
        category: "aggregation_level",
        description_md:
          "Escribir `WHERE total_amount > avg(total_amount)`: las agregaciones no se evalúan en `WHERE`.",
      },
      {
        category: "cell_values",
        description_md:
          "Mostrar `ticket_promedio` sin redondear a 2 decimales o redondear también el filtro, lo que cambia qué pedidos entran.",
      },
    ],
    expert_explanation_md:
      "173 de los 447 pedidos entregados en UYU superan el promedio de 14 377.35. La distribución es asimétrica (unos pocos pedidos muy grandes empujan la media), por eso menos de la mitad quedan por encima.\n\nLa subconsulta escalar del `WHERE` se ejecuta una sola vez: no depende de la fila externa, así que Postgres la evalúa y la trata como una constante. La versión con `CROSS JOIN` sobre una tabla derivada hace exactamente lo mismo y evita escribir el cálculo dos veces; es la opción preferible cuando el promedio se usa en varios lugares.\n\nOjo con el redondeo: redondear solo en la columna que se muestra es intencional. Si redondearas también en la comparación, un pedido a milésimas del promedio podría entrar o salir del listado.",
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
      "Marketing arma una campaña de accesorios tecnológicos en Uruguay. Necesita la lista de clientes uruguayos que ya recibieron al menos un pedido con un producto de la rama **Tecnología** (las subcategorías cuyo `parent_id` es 1). Cada cliente debe aparecer una sola vez.",
    business_question_md:
      "Devuelve `id`, `full_name` y `city` de los clientes con `country = 'UY'` que tengan al menos un pedido con `status = 'delivered'` que incluya un producto de alguna categoría cuyo `parent_id` sea 1. Sin filas repetidas. El orden no importa.",
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
          "La pregunta es de pertenencia: «¿este cliente está en el conjunto de los que compraron tecnología?». Resolverla con joins te obligaría a quitar duplicados; filtrar contra una lista de identificadores no.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Arma la cadena desde adentro hacia afuera: categorías con `parent_id = 1` → productos de esas categorías → líneas de `order_items` con esos productos → pedidos entregados con esas líneas → clientes de esos pedidos. Ejecuta cada nivel por separado antes de anidarlo.",
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
          "Resolver todo con `INNER JOIN` y devolver un cliente por cada línea de pedido que cumple la condición.",
      },
      {
        category: "missing_filter",
        description_md:
          "Olvidar `status = 'delivered'`: entran pedidos cancelados o pendientes que la campaña no debería considerar.",
      },
      {
        category: "join_condition",
        description_md:
          "Filtrar por `category_id = 1` en lugar de por las subcategorías: la categoría 1 es la raíz «Tecnología» y no tiene productos asignados directamente.",
      },
      {
        category: "wrong_columns",
        description_md:
          "Seleccionar más de una columna dentro del `IN` (`subquery has too many columns`).",
      },
    ],
    expert_explanation_md:
      "63 de los 123 clientes uruguayos califican. La versión con `IN` anidados se lee como una cadena de pertenencias y evita por completo el problema de la cardinalidad: `IN` filtra, no multiplica.\n\nLa alternativa con `EXISTS` usa joins adentro, pero como la subconsulta solo responde «hay o no hay», tampoco duplica filas. Elige `EXISTS` cuando la condición mezcla varias tablas (queda más plana) e `IN` cuando la cadena es una sucesión limpia de identificadores.\n\nSi además necesitaras el monto comprado en tecnología por cliente, ninguna de las dos alcanzaría: ahí sí corresponde un join con `GROUP BY`, porque necesitas las filas del detalle.",
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
      "En **Bolsillo**, el equipo de Producto quiere frenar el costo de emisión de plásticos. Pide la lista de tarjetas físicas activas que nunca se usaron en ningún movimiento.\n\nCuidado: en `transactions`, la columna `card_id` solo tiene valor en los pagos con tarjeta; en el resto de los movimientos es `NULL`.",
    business_question_md:
      "Devuelve `id`, `last4` e `issued_at` de las tarjetas con `kind = 'physical'` y `status = 'active'` que no aparezcan en ningún movimiento de `transactions`, junto con `full_name` y `country` de la persona titular. El orden no importa.",
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
          "Es una pregunta de ausencia. Si la resuelves comparando contra una lista de valores, recuerda qué pasa cuando esa lista contiene `NULL`: la condición deja de ser falsa y pasa a ser desconocida, así que no sobrevive ninguna fila.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Hay dos caminos seguros: preguntar por la inexistencia de movimientos para cada tarjeta (con la condición `t.card_id = c.id` dentro de la subconsulta) o depurar los `NULL` de la lista antes de negarla. Los datos de la persona salen de un join con `users`.",
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
          "Usar `NOT IN (SELECT card_id FROM transactions)` sin excluir los `NULL`: la consulta corre sin error y devuelve cero filas.",
      },
      {
        category: "missing_filter",
        description_md:
          "Olvidar `kind = 'physical'` o `status = 'active'`: entran tarjetas virtuales o ya bloqueadas, que no generan costo de plástico.",
      },
      {
        category: "join_condition",
        description_md:
          "Omitir la condición de correlación `t.card_id = c.id` dentro del `NOT EXISTS`: la subconsulta siempre devuelve filas y el resultado queda vacío.",
      },
      {
        category: "row_count",
        description_md:
          "Resolverlo con `LEFT JOIN` a `transactions` sin filtrar `t.id IS NULL`, o filtrando mal y devolviendo una fila por movimiento.",
      },
    ],
    expert_explanation_md:
      "296 tarjetas físicas activas nunca se usaron. La trampa está en los datos: 20 613 de los 32 243 movimientos tienen `card_id` en `NULL` (cargas, transferencias, comisiones). Con un solo `NULL` en la lista, `NOT IN` devuelve el conjunto vacío, porque `x NOT IN (..., NULL)` se evalúa como `UNKNOWN` cuando `x` no coincide con ningún valor, y `UNKNOWN` no pasa el filtro.\n\n`NOT EXISTS` no compara valores: pregunta si la subconsulta produce filas. Por eso es la forma robusta de expresar «no tiene ninguno», y la que conviene usar por defecto cuando no controlas si la columna admite `NULL`.\n\nUna tercera forma es el *anti join*: `LEFT JOIN transactions AS t ON t.card_id = c.id` con `WHERE t.id IS NULL`. Es equivalente y, en Postgres, el planificador termina eligiendo el mismo plan para las tres. Entre `NOT EXISTS` y el anti join, elige el que exprese mejor la intención de quien lea el código dentro de seis meses.",
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
      "Dirección quiere comparar la fidelidad de los clientes entre países: no cuántos pedidos hubo en total, sino **cuántos pedidos entregados acumula en promedio cada cliente que compró**. Los clientes sin pedidos entregados quedan fuera del cálculo.",
    business_question_md:
      "Devuelve `country`, la cantidad de clientes con al menos un pedido `delivered` como `clientes_con_pedidos` y el promedio de pedidos entregados por cliente como `pedidos_promedio` (2 decimales), ordenado por `pedidos_promedio` descendente.",
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
          "La consulta interna agrupa `orders` por `customer_id` y cuenta los pedidos entregados. La externa une ese resultado con `customers` para conocer el país, agrupa por país, cuenta filas (clientes) y promedia la columna de conteo. No olvides el alias de la subconsulta.",
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
          "Intentar `avg(count(*))` en una sola consulta: SQL no permite agregaciones anidadas.",
      },
      {
        category: "aggregation_level",
        description_md:
          "Calcular `count(*) / count(DISTINCT customer_id)` sobre `orders` sin subconsulta: da un número parecido, pero no es el promedio de los conteos por cliente cuando el conjunto de clientes cambia.",
      },
      {
        category: "missing_filter",
        description_md:
          "Contar todos los pedidos en vez de solo los `delivered`, o aplicar el filtro únicamente en la consulta externa, donde ya no hay columna `status`.",
      },
      {
        category: "cell_values",
        description_md: "Devolver `pedidos_promedio` sin redondear a 2 decimales.",
      },
    ],
    expert_explanation_md:
      "Seis filas. Chile lidera con 5.51 pedidos entregados por cliente y Uruguay cierra con 4.72, sobre bases muy distintas: 240 clientes chilenos frente a 105 uruguayos. El promedio por cliente cuenta una historia diferente a la del volumen total, donde México y Argentina dominan.\n\nLa tabla derivada es obligatoria acá: el promedio del primer nivel (pedidos por cliente) es el insumo del segundo (promedio por país). En la variante alternativa, el join entra dentro de la subconsulta y la externa solo agrupa; ambas leen `orders` una sola vez y cuestan prácticamente lo mismo. La primera versión mantiene la subconsulta enfocada en una sola idea, lo que ayuda cuando alguien la lee sin contexto.\n\nDesde la sección 22 podrás escribir el mismo paso intermedio como CTE (`WITH pedidos_por_cliente AS (...)`), que es la forma más legible cuando el resultado intermedio se usa más de una vez.",
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
      "Riesgo revisa las cuentas congeladas de **Bolsillo** antes de decidir cuáles reactivar. Necesita, para cada cuenta con `status = 'frozen'`, su actividad histórica: cuántos movimientos completados tuvo y cuándo fue el último.",
    business_question_md:
      "Devuelve `id`, `currency` y `balance` de las cuentas con `status = 'frozen'`, más `movimientos` (cantidad de movimientos de esa cuenta con `status = 'completed'`) y `ultimo_movimiento` (el mayor `created_at` entre esos movimientos). El orden no importa.",
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
          "La tabla principal es la de cuentas y quieres agregarle dos métricas calculadas sobre otra tabla, sin perder ni duplicar cuentas. Una subconsulta que mire la fila actual de la consulta externa resuelve cada métrica por separado.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Dale alias a la tabla externa (`accounts AS a`) y usa ese alias dentro de cada subconsulta para enlazarla con la cuenta de la fila (`t.account_id = a.id`). Ambas subconsultas repiten el filtro `t.status = 'completed'`.",
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
          "Olvidar la condición de correlación `t.account_id = a.id`: todas las cuentas muestran el total global de la plataforma, sin que la consulta falle.",
      },
      {
        category: "missing_filter",
        description_md:
          "No repetir `t.status = 'completed'` en ambas subconsultas: el conteo y la fecha terminan describiendo conjuntos distintos.",
      },
      {
        category: "aggregation_level",
        description_md:
          "Resolverlo con `INNER JOIN` y `GROUP BY` sin el filtro en el `ON`: si una cuenta congelada no tuviera movimientos completados, desaparecería del reporte.",
      },
      {
        category: "duplicates",
        description_md:
          "Unir `transactions` sin agrupar: aparece una fila por movimiento en vez de una por cuenta.",
      },
    ],
    expert_explanation_md:
      "126 cuentas congeladas, una fila por cuenta. Las subconsultas correlacionadas mantienen a `accounts` como protagonista: no hay `GROUP BY`, no hay riesgo de multiplicar filas y cada métrica se lee como una pregunta independiente.\n\nLa alternativa con `LEFT JOIN` y `GROUP BY` devuelve exactamente lo mismo, pero exige dos cuidados: el filtro `t.status = 'completed'` va en el `ON` (en el `WHERE` convertiría el `LEFT JOIN` en `INNER` y perderías las cuentas sin movimientos completados) y hay que usar `count(t.id)` en lugar de `count(*)`, que contaría 1 para una cuenta sin coincidencias.\n\n¿Cuál elegir? Con una o dos métricas, la correlacionada suele ganar en legibilidad. A partir de tres o cuatro, cada subconsulta implica un recorrido más de `transactions` y el join agrupado —una sola pasada, con agregación condicional si hace falta— es la mejor opción. Los planes de Postgres para ambas versiones son comparables en este volumen: el criterio real es quién lee el código después.",
    reward: defaultReward("advanced"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
];
