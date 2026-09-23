import {
  defaultHintMeta,
  defaultReward,
  defaultSolutionUnlock,
  type ExerciseDef,
} from "../schemas/exercise";

const section = "depuracion-de-consultas";
const dataset = { slug: "tiendaviva", version: 1 };
const metodo = "depuracion-descomponer-y-contar";
const joins = "depuracion-joins-que-multiplican";
const filtros = "depuracion-filtros-nulos-y-grano";

export const exercises: ExerciseDef[] = [
  {
    slug: "categorias-hoja-sin-subcategorias",
    section,
    title: "La consulta que devolvió cero filas",
    difficulty: "advanced",
    estimated_minutes: 8,
    concepts: ["subquery", "null_handling", "outer_join", "aggregate", "group_by"],
    dataset,
    tables_used: ["categories", "products"],
    scenario_md:
      "El equipo de Catálogo de **TiendaViva** quiere saber cuántos productos cuelgan de cada categoría final, la que ya no tiene subcategorías por debajo. Alguien escribió esto y lo dio por terminado:\n\n```sql\nSELECT c.id, c.name\nFROM categories AS c\nWHERE c.id NOT IN (SELECT parent_id FROM categories);\n```\n\nDevuelve **cero filas**, y en el catálogo hay 30 categorías de las cuales solo 6 tienen subcategorías. La consulta corrió sin errores.",
    business_question_md:
      "Devuelve una fila por cada categoría que **no** sea padre de ninguna otra: `categoria_id` (el `id`), `categoria` (el `name`) y `productos` (cuántas filas de `products` tienen esa `category_id`; 0 si no tiene ninguna). Ordena por `categoria_id` ascendente.",
    learning_objective:
      "Diagnosticar por qué NOT IN contra una subconsulta con NULL devuelve el conjunto vacío y reescribirlo con una forma inmune a los nulos.",
    theory_ref: filtros,
    expected_columns: [
      { name: "categoria_id", type: "integer" },
      { name: "categoria", type: "text" },
      { name: "productos", type: "integer" },
    ],
    validation_rules: { order_matters: true },
    reference_solution: `SELECT
  c.id AS categoria_id,
  c.name AS categoria,
  count(p.id) AS productos
FROM categories AS c
LEFT JOIN products AS p ON p.category_id = c.id
WHERE NOT EXISTS (SELECT 1 FROM categories AS h WHERE h.parent_id = c.id)
GROUP BY c.id, c.name
ORDER BY c.id;`,
    alternative_solutions: [
      {
        label: "NOT IN con los nulos descartados",
        sql: "SELECT c.id AS categoria_id, c.name AS categoria, count(p.id) AS productos FROM categories AS c LEFT JOIN products AS p ON p.category_id = c.id WHERE c.id NOT IN (SELECT parent_id FROM categories WHERE parent_id IS NOT NULL) GROUP BY c.id, c.name ORDER BY c.id;",
      },
      {
        label: "Anti-join con LEFT JOIN",
        sql: "WITH hojas AS (SELECT c.id, c.name FROM categories AS c LEFT JOIN categories AS h ON h.parent_id = c.id WHERE h.id IS NULL) SELECT hj.id AS categoria_id, hj.name AS categoria, count(p.id) AS productos FROM hojas AS hj LEFT JOIN products AS p ON p.category_id = hj.id GROUP BY hj.id, hj.name ORDER BY hj.id;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Antes de corregir, diagnostica. Ejecuta la subconsulta sola: `SELECT parent_id FROM categories`. ¿Qué valores devuelve para las categorías que están en el nivel más alto?",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "`x NOT IN (lista)` se expande a `x <> a AND x <> b AND ...`. Si la lista contiene un NULL, esa comparación devuelve NULL y el `AND` completo nunca puede dar verdadero: el resultado es siempre vacío. Reemplázalo por `NOT EXISTS (...)`, que pregunta por la existencia de una fila y no compara valores. Para contar productos sin perder las categorías vacías necesitas `LEFT JOIN` y `count(p.id)`, no `count(*)`.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT\n  c.id AS categoria_id,\n  c.name AS categoria,\n  count(___) AS productos\nFROM categories AS c\n___ JOIN products AS p ON p.category_id = c.id\nWHERE NOT ___ (SELECT 1 FROM categories AS h WHERE ___ = c.id)\nGROUP BY c.id, c.name\nORDER BY c.id;\n```\nEn el hueco del `count` va la columna de la tabla opcional; en el de la subconsulta, la columna que apunta al padre.",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "null_handling",
        description_md:
          "Dejar el `NOT IN` tal cual: `parent_id` es NULL en las 6 categorías raíz y el resultado es siempre cero filas, sin ningún error que lo anuncie.",
      },
      {
        category: "null_handling",
        description_md:
          "Usar `count(*)` en lugar de `count(p.id)`: con `LEFT JOIN`, una categoría sin productos genera una fila con todo NULL y `count(*)` la reporta como 1 producto.",
      },
      {
        category: "join_condition",
        description_md:
          "Unir con `INNER JOIN products`: desaparecen las categorías sin productos, justamente las que el equipo de Catálogo quiere ver.",
      },
      {
        category: "row_count",
        description_md:
          "Invertir la condición y devolver las 6 categorías que sí tienen subcategorías. El resultado son las 24 hojas, no las raíces.",
      },
    ],
    expert_explanation_md:
      "24 filas, de `Celulares` (id 2, 77 productos) a `Bebés` (id 30, 62 productos). Las 30 categorías menos las 6 que tienen subcategorías.\n\nEl diagnóstico está en una sola consulta: `SELECT count(*) FILTER (WHERE parent_id IS NULL) FROM categories` devuelve 6. Con un solo NULL en la lista, `NOT IN` se vuelve incapaz de devolver verdadero para cualquier valor, porque `x <> NULL` es NULL y `algo AND NULL` nunca es verdadero. Postgres no avisa: la lógica de tres valores es correcta, solo que no es la que querías.\n\n`NOT EXISTS` es la reescritura preferida porque no compara valores: pregunta si hay alguna fila que cumpla la condición. Funciona igual con nulos, se lee como la frase del negocio («no existe ninguna categoría cuyo padre sea esta») y, en tablas grandes, suele ser también el plan más barato porque se detiene en la primera coincidencia. El anti-join con `LEFT JOIN ... WHERE h.id IS NULL` es equivalente y muy común en código heredado.\n\nEl segundo detalle es `count(p.id)` frente a `count(*)`. Con `LEFT JOIN`, una categoría sin productos produce una fila donde todas las columnas de `products` son NULL. `count(*)` cuenta esa fila igual y reportaría 1; `count(p.id)` ignora el NULL y reporta 0. En este dataset todas las hojas tienen productos, así que las dos versiones coinciden hoy: un recordatorio de que una consulta puede estar mal y dar bien por casualidad.",
    improvement_feedback: [
      { condition: "no_table_alias_in_join", message_key: "improve.no_table_alias_in_join" },
      { condition: "uses_select_star", message_key: "improve.uses_select_star" },
    ],
    reward: defaultReward("advanced"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "cobertura-de-clientes-por-ciudad",
    section,
    title: "El LEFT JOIN que dejó de serlo",
    difficulty: "advanced",
    estimated_minutes: 12,
    concepts: ["outer_join", "aggregate", "group_by", "distinct", "alias"],
    dataset,
    tables_used: ["customers", "orders"],
    scenario_md:
      "Marketing quiere saber, ciudad por ciudad, qué proporción de los clientes registrados llegó alguna vez a recibir un pedido. El informe que circula muestra **100 % en todas las ciudades**, lo que nadie cree. La consulta era esta:\n\n```sql\nSELECT c.country, c.city,\n  count(DISTINCT c.id) AS clientes,\n  count(DISTINCT o.customer_id) AS clientes_con_entrega\nFROM customers AS c\nLEFT JOIN orders AS o ON o.customer_id = c.id\nWHERE o.status = 'delivered'\nGROUP BY 1, 2;\n```",
    business_question_md:
      "Devuelve una fila por ciudad: `country`, `city`, `clientes` (clientes registrados en esa ciudad, todos), `clientes_con_entrega` (cuántos de ellos tienen al menos un pedido con `status = 'delivered'`) y `cobertura_pct` (porcentaje sobre el total de la ciudad, redondeado a 2 decimales). Ordena por `country` y luego por `city`, ambos ascendentes.",
    learning_objective:
      "Reconocer que una condición sobre la tabla opcional puesta en el WHERE anula el LEFT JOIN, y moverla al ON.",
    theory_ref: filtros,
    expected_columns: [
      { name: "country", type: "text" },
      { name: "city", type: "text" },
      { name: "clientes", type: "integer" },
      { name: "clientes_con_entrega", type: "integer" },
      { name: "cobertura_pct", type: "numeric" },
    ],
    validation_rules: { order_matters: true, numeric_tolerance: 0.001 },
    reference_solution: `SELECT
  c.country,
  c.city,
  count(DISTINCT c.id) AS clientes,
  count(DISTINCT o.customer_id) AS clientes_con_entrega,
  round(100.0 * count(DISTINCT o.customer_id) / count(DISTINCT c.id), 2) AS cobertura_pct
FROM customers AS c
LEFT JOIN orders AS o ON o.customer_id = c.id AND o.status = 'delivered'
GROUP BY c.country, c.city
ORDER BY c.country, c.city;`,
    alternative_solutions: [
      {
        label: "Conjunto de clientes con entrega en una CTE",
        sql: "WITH con_entrega AS (SELECT DISTINCT customer_id FROM orders WHERE status = 'delivered') SELECT c.country, c.city, count(*) AS clientes, count(e.customer_id) AS clientes_con_entrega, round(100.0 * count(e.customer_id) / count(*), 2) AS cobertura_pct FROM customers AS c LEFT JOIN con_entrega AS e ON e.customer_id = c.id GROUP BY c.country, c.city ORDER BY c.country, c.city;",
      },
      {
        label: "Marca por cliente con EXISTS",
        sql: "WITH marcados AS (SELECT c.country, c.city, c.id, CASE WHEN EXISTS (SELECT 1 FROM orders AS o WHERE o.customer_id = c.id AND o.status = 'delivered') THEN 1 ELSE 0 END AS tiene FROM customers AS c) SELECT country, city, count(*) AS clientes, sum(tiene)::bigint AS clientes_con_entrega, round(100.0 * sum(tiene) / count(*), 2) AS cobertura_pct FROM marcados GROUP BY country, city ORDER BY country, city;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Cuenta primero cuántos clientes hay en total (`SELECT count(*) FROM customers`) y compáralo con la suma de la columna `clientes` del informe. Si no coinciden, el problema no está en la división: está en que el denominador ya viene filtrado.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "El `LEFT JOIN` conserva a los clientes sin pedidos entregados, pero les deja `o.status` en NULL. Después el `WHERE` evalúa `NULL = 'delivered'`, que no es verdadero, y borra esas filas: el `LEFT JOIN` quedó convertido en `INNER JOIN`. La condición sobre `orders` tiene que viajar al `ON` del join.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT\n  c.country,\n  c.city,\n  count(DISTINCT c.id) AS clientes,\n  count(DISTINCT ___) AS clientes_con_entrega,\n  round(100.0 * ___ / ___, 2) AS cobertura_pct\nFROM customers AS c\nLEFT JOIN orders AS o ON o.customer_id = c.id ___ o.status = 'delivered'\nGROUP BY c.country, c.city\nORDER BY c.country, c.city;\n```\nNo queda ningún `WHERE` en la consulta.",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "join_condition",
        description_md:
          "Dejar `WHERE o.status = 'delivered'`: las filas rellenadas con NULL por el `LEFT JOIN` se descartan y `clientes` pasa a contar solo a los que ya tenían entrega. La cobertura da 100 % en todas las ciudades.",
      },
      {
        category: "duplicates",
        description_md:
          "Usar `count(o.id)` para `clientes_con_entrega`: un cliente con seis pedidos entregados suma seis, y el porcentaje supera el 100 %. Hay que contar clientes distintos, no pedidos.",
      },
      {
        category: "cell_values",
        description_md:
          "Escribir `100 * count(...) / count(...)` con enteros: la división entera devuelve 0 en casi todas las filas. Fuerza numérico con `100.0`.",
      },
      {
        category: "missing_filter",
        description_md:
          "Contar cualquier pedido en vez de solo los entregados: los cancelados y los pendientes inflan la cobertura y la métrica deja de significar «llegó a recibir algo».",
      },
    ],
    expert_explanation_md:
      "34 filas, una por ciudad. La cobertura real se mueve entre 80,00 % (La Serena y Arequipa) y 94,55 % (Valparaíso); Buenos Aires tiene 121 clientes y 105 con entrega, 86,78 %.\n\nLo interesante del error original es que **no cambia la cantidad de filas**: siguen apareciendo las 34 ciudades, porque en todas hay alguien con un pedido entregado. Lo que cambia es el denominador. En Buenos Aires, `clientes` pasaba de 121 a 105, exactamente los mismos que el numerador, y por eso el porcentaje daba 100,00. Un informe con 34 filas correctas y una columna silenciosamente filtrada es mucho más difícil de detectar que uno vacío.\n\nEl orden de evaluación explica todo: el `LEFT JOIN` produce primero el resultado completo, rellenando con NULL las columnas de `orders` para los clientes sin coincidencia; después el `WHERE` filtra ese resultado, y `NULL = 'delivered'` no es verdadero. Puesta en el `ON`, la condición decide **qué cuenta como coincidencia** antes de rellenar, así que las filas de la izquierda sobreviven siempre.\n\nHay una excepción legítima: `LEFT JOIN ... WHERE o.id IS NULL` es el patrón *anti-join*, donde el `WHERE` sobre la tabla derecha se usa a propósito para quedarse con las filas sin coincidencia.\n\nLas dos alternativas —armar el conjunto de clientes con entrega en una CTE, o marcar cada cliente con `EXISTS`— son igual de válidas y a menudo más legibles, porque evitan el `DISTINCT` dentro de los agregados y dejan el grano explícito: una fila por cliente.",
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
    slug: "ingresos-por-pais-sin-inflar",
    section,
    title: "El total que se duplicó solo",
    difficulty: "advanced",
    estimated_minutes: 12,
    concepts: ["inner_join", "aggregate", "group_by", "cte", "alias"],
    dataset,
    tables_used: ["orders", "customers", "order_items"],
    scenario_md:
      "Finanzas reporta 1 705 368 745,77 de ingresos entregados en Argentina. El tablero nuevo muestra 3 631 177 874,05 para el mismo período y el mismo filtro. Nadie tocó los datos. La consulta del tablero es esta:\n\n```sql\nSELECT c.country, count(*) AS pedidos, round(sum(o.total_amount), 2) AS ingresos\nFROM orders AS o\nINNER JOIN customers AS c ON c.id = o.customer_id\nINNER JOIN order_items AS oi ON oi.order_id = o.id\nWHERE o.status = 'delivered'\nGROUP BY 1;\n```\n\nEl join con `order_items` estaba ahí porque alguna versión anterior mostraba la cantidad de artículos.",
    business_question_md:
      "Devuelve una fila por país con los pedidos entregados: `country`, `pedidos` (cantidad de pedidos con `status = 'delivered'`) e `ingresos` (suma de `total_amount` de esos pedidos, redondeada a 2 decimales). Cada pedido debe contarse y sumarse **una sola vez**. Ordena por `country` ascendente.",
    learning_objective:
      "Detectar un join 1:N que multiplica filas y corregir el total volviendo al grano de un pedido por fila.",
    theory_ref: joins,
    expected_columns: [
      { name: "country", type: "text" },
      { name: "pedidos", type: "integer" },
      { name: "ingresos", type: "numeric" },
    ],
    validation_rules: { order_matters: true, numeric_tolerance: 0.01 },
    reference_solution: `SELECT
  c.country,
  count(*) AS pedidos,
  round(sum(o.total_amount), 2) AS ingresos
FROM orders AS o
INNER JOIN customers AS c ON c.id = o.customer_id
WHERE o.status = 'delivered'
GROUP BY c.country
ORDER BY c.country;`,
    alternative_solutions: [
      {
        label: "Con order_items agregado antes de unir",
        sql: "WITH items AS (SELECT order_id, count(*) AS lineas FROM order_items GROUP BY order_id) SELECT c.country, count(*) AS pedidos, round(sum(o.total_amount), 2) AS ingresos FROM orders AS o INNER JOIN customers AS c ON c.id = o.customer_id LEFT JOIN items AS i ON i.order_id = o.id WHERE o.status = 'delivered' GROUP BY c.country ORDER BY c.country;",
      },
      {
        label: "Grano de pedido en una CTE",
        sql: "WITH pedidos AS (SELECT o.id, c.country, o.total_amount FROM orders AS o INNER JOIN customers AS c ON c.id = o.customer_id WHERE o.status = 'delivered') SELECT country, count(*) AS pedidos, round(sum(total_amount), 2) AS ingresos FROM pedidos GROUP BY country ORDER BY country;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Cuenta el grano antes de sumar. Ejecuta la consulta del tablero cambiando el `SELECT` por `count(*) AS filas, count(DISTINCT o.id) AS pedidos`. Si los dos números no coinciden, cada pedido aparece más de una vez y `sum(o.total_amount)` lo suma más de una vez.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "`order_items` tiene 30 067 líneas para 18 000 pedidos: es una relación 1:N. Como la pregunta solo necesita `total_amount`, que vive en `orders`, ese join no aporta nada y solo multiplica filas. Quítalo. Si en algún momento necesitas datos de las líneas, agrégalas primero en una CTE con una fila por `order_id` y recién entonces únelas.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT\n  c.country,\n  count(*) AS pedidos,\n  round(sum(___), 2) AS ingresos\nFROM orders AS o\nINNER JOIN customers AS c ON c.id = ___\nWHERE o.status = '___'\nGROUP BY c.country\nORDER BY c.country;\n```\nLa consulta correcta tiene un join menos que la del tablero.",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "aggregation_level",
        description_md:
          "Conservar el join con `order_items` y sumar `o.total_amount`: cada pedido se suma una vez por línea y el total casi se duplica.",
      },
      {
        category: "duplicates",
        description_md:
          "Tapar el fan-out con `sum(DISTINCT o.total_amount)`: además de no corregir el grano, funde en uno solo a dos pedidos distintos que casualmente valgan lo mismo.",
      },
      {
        category: "row_count",
        description_md:
          "Corregir `pedidos` con `count(DISTINCT o.id)` pero dejar `sum(o.total_amount)` como estaba: el conteo queda bien y el importe sigue inflado, que es el número que mira Finanzas.",
      },
      {
        category: "missing_filter",
        description_md:
          "Olvidar `status = 'delivered'` e incluir cancelados, devueltos y pendientes: los ingresos suben sin que ningún join los haya multiplicado.",
      },
    ],
    expert_explanation_md:
      "6 filas. Argentina 3 959 pedidos y 1 705 368 745,77; México 4 281 y 29 188 433,98; Colombia 1 950 y 2 794 230 035,58; Chile 1 323 y 397 685 165,54; Perú 1 147 y 1 136 799,02; Uruguay 496 y 7 131 164,62. Los órdenes de magnitud son distintos porque cada país factura en su moneda: sumar las seis filas no tendría sentido.\n\nEl diagnóstico se hace en una línea. La consulta del tablero, contada con `count(*)` y `count(DISTINCT o.id)`, devuelve 21 974 y 13 156 sobre los pedidos entregados. Cada pedido aparece una vez por línea de detalle, así que `total_amount` se suma 1,67 veces en promedio.\n\nY «en promedio» es la parte peligrosa: el factor **no es uniforme**. Un pedido de tres líneas pesa el triple que uno de una sola, así que el error favorece a los pedidos grandes y puede cambiar el ranking entre países o entre categorías, no solo la escala. Por eso «divido todo por 1,67» nunca es una corrección válida.\n\nLa solución de fondo no es quitar joins a ciegas, es declarar el grano. Si el informe necesitara también las líneas por pedido, la forma correcta es la alternativa con la CTE `items`: `GROUP BY order_id` lleva el detalle a una fila por pedido y el join vuelve a ser 1:1. La regla que conviene automatizar en la cabeza: antes de escribir `sum` de una columna de cabecera, verifica que la consulta tenga una fila por cabecera.",
    improvement_feedback: [
      { condition: "uses_implicit_join", message_key: "improve.uses_implicit_join" },
      { condition: "no_table_alias_in_join", message_key: "improve.no_table_alias_in_join" },
    ],
    reward: defaultReward("advanced"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "ticket-promedio-al-grano-correcto",
    section,
    title: "El promedio al grano equivocado",
    difficulty: "expert",
    estimated_minutes: 15,
    concepts: ["cte", "aggregate", "group_by", "inner_join", "alias"],
    dataset,
    tables_used: ["orders", "customers", "order_items"],
    scenario_md:
      "El equipo comercial pidió el ticket promedio por país y canal. La consulta entregada devuelve 552 188,44 para Argentina por app, pero el propio sistema de facturación informa 431 786,43 para ese corte. La consulta era:\n\n```sql\nSELECT c.country, o.channel, count(*) AS pedidos, round(avg(o.total_amount), 2) AS ticket_promedio\nFROM orders AS o\nINNER JOIN customers AS c ON c.id = o.customer_id\nINNER JOIN order_items AS oi ON oi.order_id = o.id\nWHERE o.status = 'delivered'\nGROUP BY 1, 2;\n```",
    business_question_md:
      "Considera solo los pedidos con `status = 'delivered'`. Devuelve una fila por combinación de país y canal: `country`, `channel`, `pedidos` (pedidos distintos), `ticket_promedio` (promedio de `total_amount` por pedido, redondeado a 2 decimales) y `lineas_por_pedido` (promedio de líneas de `order_items` por pedido, redondeado a 3 decimales). Ordena por `country` y `channel`, ambos ascendentes.",
    learning_objective:
      "Llevar el detalle al grano de la entidad medida antes de promediar, y calcular en la misma consulta una métrica de cabecera y una de detalle.",
    theory_ref: joins,
    expected_columns: [
      { name: "country", type: "text" },
      { name: "channel", type: "text" },
      { name: "pedidos", type: "integer" },
      { name: "ticket_promedio", type: "numeric" },
      { name: "lineas_por_pedido", type: "numeric" },
    ],
    validation_rules: { order_matters: true, numeric_tolerance: 0.001 },
    reference_solution: `WITH por_pedido AS (
  SELECT
    o.id,
    c.country,
    o.channel,
    o.total_amount,
    count(*) AS lineas
  FROM orders AS o
  INNER JOIN customers AS c ON c.id = o.customer_id
  INNER JOIN order_items AS oi ON oi.order_id = o.id
  WHERE o.status = 'delivered'
  GROUP BY o.id, c.country, o.channel, o.total_amount
)
SELECT
  country,
  channel,
  count(*) AS pedidos,
  round(avg(total_amount), 2) AS ticket_promedio,
  round(avg(lineas), 3) AS lineas_por_pedido
FROM por_pedido
GROUP BY country, channel
ORDER BY country, channel;`,
    alternative_solutions: [
      {
        label: "Líneas agregadas antes de unir",
        sql: "WITH items AS (SELECT order_id, count(*) AS lineas FROM order_items GROUP BY order_id) SELECT c.country, o.channel, count(*) AS pedidos, round(avg(o.total_amount), 2) AS ticket_promedio, round(avg(i.lineas), 3) AS lineas_por_pedido FROM orders AS o INNER JOIN customers AS c ON c.id = o.customer_id INNER JOIN items AS i ON i.order_id = o.id WHERE o.status = 'delivered' GROUP BY c.country, o.channel ORDER BY c.country, o.channel;",
      },
      {
        label: "Líneas con una subconsulta correlacionada",
        sql: "WITH por_pedido AS (SELECT o.id, c.country, o.channel, o.total_amount, (SELECT count(*) FROM order_items AS oi WHERE oi.order_id = o.id) AS lineas FROM orders AS o INNER JOIN customers AS c ON c.id = o.customer_id WHERE o.status = 'delivered') SELECT country, channel, count(*) AS pedidos, round(avg(total_amount), 2) AS ticket_promedio, round(avg(lineas), 3) AS lineas_por_pedido FROM por_pedido WHERE lineas > 0 GROUP BY country, channel ORDER BY country, channel;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "`avg` promedia filas. Pregúntate qué es una fila en esa consulta: ¿un pedido o una línea de pedido? Si es una línea, un pedido de tres artículos entra tres veces en el promedio.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Necesitas dos granos distintos en la misma consulta: `ticket_promedio` se calcula sobre pedidos y `lineas_por_pedido` también, pero contando antes cuántas líneas tiene cada uno. Arma una CTE con **una fila por pedido** (`GROUP BY o.id, ...` con `count(*) AS lineas`) y agrega por país y canal sobre esa CTE.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nWITH por_pedido AS (\n  -- una fila por pedido\n  SELECT o.id, c.country, o.channel, o.total_amount, ___ AS lineas\n  FROM orders AS o\n  INNER JOIN customers AS c ON c.id = o.customer_id\n  INNER JOIN order_items AS oi ON oi.order_id = o.id\n  WHERE o.status = 'delivered'\n  GROUP BY ___\n)\nSELECT\n  country,\n  channel,\n  count(*) AS pedidos,\n  round(avg(___), 2) AS ticket_promedio,\n  round(avg(___), 3) AS lineas_por_pedido\nFROM por_pedido\nGROUP BY country, channel\nORDER BY country, channel;\n```\nEl `GROUP BY` de la CTE tiene que incluir todas las columnas no agregadas.",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "aggregation_level",
        description_md:
          "Promediar `total_amount` sobre el resultado del join con `order_items`: el promedio queda ponderado por la cantidad de líneas y sube alrededor de un 28 %.",
      },
      {
        category: "duplicates",
        description_md:
          "Corregir `pedidos` con `count(DISTINCT o.id)` pero dejar `avg(o.total_amount)` sobre las filas infladas: el conteo queda bien y el promedio sigue mal.",
      },
      {
        category: "aggregation_level",
        description_md:
          "Calcular `lineas_por_pedido` como `count(*) / count(DISTINCT o.id)` con enteros: la división entera devuelve 1 en todas las filas.",
      },
      {
        category: "wrong_columns",
        description_md:
          'Olvidar `o.total_amount` en el `GROUP BY` de la CTE: Postgres responde `column "o.total_amount" must appear in the GROUP BY clause`, que es exactamente la pregunta sobre el grano que hay que responder.',
      },
    ],
    expert_explanation_md:
      "18 filas: seis países por tres canales. Argentina por app tiene 2 186 pedidos, ticket 431 786,43 y 1,672 líneas por pedido; México por app, 2 351 pedidos y ticket 6 881,92. Los tickets no son comparables entre países porque cada uno factura en su moneda.\n\nLa consulta original devolvía 552 188,44 para Argentina por app: un 27,9 % más alto. La causa se ve contando filas: 3 654 filas para 2 186 pedidos. Cada pedido entró al promedio tantas veces como líneas tiene, y como los pedidos de varias líneas tienden a ser más caros, el promedio se corre hacia arriba. No es un factor constante que puedas dividir después: es una ponderación.\n\nUna verificación barata que conviene adoptar: `ticket_promedio * pedidos` debería reconstruir el ingreso conocido del grupo. Con 431 786,43 por 2 186 se llega a los ingresos de Argentina por app; con 552 188,44 no cierra con nada. Cuando un promedio no reconstruye su total, el grano está mal.\n\nHay dos caminos igual de válidos. La solución de referencia agrupa por `o.id` para volver al grano de pedido dentro de la CTE; la alternativa agrega `order_items` por separado y une 1:1. La segunda suele leerse mejor y hace explícito el grano de cada bloque, que es el hábito que esta sección busca instalar. La tercera variante, con subconsulta correlacionada, necesita `WHERE lineas > 0` para no incluir pedidos sin líneas, que el `INNER JOIN` descartaba por su cuenta; en este dataset todos los pedidos entregados tienen al menos una línea, pero esa suposición hay que verificarla, no heredarla.",
    improvement_feedback: [
      {
        condition: "missing_alias_on_aggregate",
        message_key: "improve.missing_alias_on_aggregate",
      },
      { condition: "no_table_alias_in_join", message_key: "improve.no_table_alias_in_join" },
    ],
    reward: defaultReward("expert"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "tiempo-de-entrega-sin-contaminar",
    section,
    title: "El promedio que los NULL movieron",
    difficulty: "expert",
    estimated_minutes: 14,
    concepts: ["null_handling", "aggregate", "group_by", "date_functions", "alias"],
    dataset,
    tables_used: ["shipments"],
    scenario_md:
      "Operaciones negocia con los transportistas de **TiendaViva** y necesita el tiempo medio de entrega de cada uno. La versión que llegó a la mesa de negociación calcula el promedio dividiendo la suma de horas por la cantidad total de envíos, y da 121,38 horas para Andes Express. El sistema del transportista informa 131,11. La diferencia no es chica cuando hay un contrato de por medio.",
    business_question_md:
      "A partir de `shipments`, devuelve una fila por transportista: `carrier`, `envios` (todos los envíos registrados), `entregados` (los que tienen `delivered_at`), `sin_entregar` (los que no lo tienen) y `horas_promedio` (promedio de horas entre `shipped_at` y `delivered_at`, **solo** sobre los entregados, redondeado a 2 decimales). Ordena por `carrier` ascendente.",
    learning_objective:
      "Distinguir entre ignorar los NULL y contarlos como ceros al promediar, y reportar explícitamente cuántos casos quedaron fuera.",
    theory_ref: filtros,
    expected_columns: [
      { name: "carrier", type: "text" },
      { name: "envios", type: "integer" },
      { name: "entregados", type: "integer" },
      { name: "sin_entregar", type: "integer" },
      { name: "horas_promedio", type: "numeric" },
    ],
    validation_rules: { order_matters: true, numeric_tolerance: 0.01 },
    reference_solution: `SELECT
  s.carrier,
  count(*) AS envios,
  count(s.delivered_at) AS entregados,
  count(*) - count(s.delivered_at) AS sin_entregar,
  round(avg(EXTRACT(epoch FROM (s.delivered_at - s.shipped_at)) / 3600.0)::numeric, 2) AS horas_promedio
FROM shipments AS s
GROUP BY s.carrier
ORDER BY s.carrier;`,
    alternative_solutions: [
      {
        label: "Con FILTER explícito",
        sql: "SELECT s.carrier, count(*) AS envios, count(*) FILTER (WHERE s.delivered_at IS NOT NULL) AS entregados, count(*) FILTER (WHERE s.delivered_at IS NULL) AS sin_entregar, round(avg(EXTRACT(epoch FROM (s.delivered_at - s.shipped_at)) / 3600.0) FILTER (WHERE s.delivered_at IS NOT NULL)::numeric, 2) AS horas_promedio FROM shipments AS s GROUP BY s.carrier ORDER BY s.carrier;",
      },
      {
        label: "Suma dividida por los entregados",
        sql: "SELECT s.carrier, count(*) AS envios, count(s.delivered_at) AS entregados, count(*) - count(s.delivered_at) AS sin_entregar, round((sum(EXTRACT(epoch FROM (s.delivered_at - s.shipped_at)) / 3600.0) / nullif(count(s.delivered_at), 0))::numeric, 2) AS horas_promedio FROM shipments AS s GROUP BY s.carrier ORDER BY s.carrier;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Empieza por contar: ¿cuántos envíos tienen `delivered_at` y cuántos no? Un envío en tránsito no tiene tiempo de entrega; la pregunta es si el cálculo lo está tratando como ausente o como cero.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "`avg` ignora los NULL: los saca del numerador **y** del divisor, que es justo lo que quieres. Dividir una suma por `count(*)` no hace lo mismo, porque `count(*)` incluye los envíos sin entregar. Para las columnas de conteo, `count(s.delivered_at)` cuenta solo los valores no nulos. La duración sale de `EXTRACT(epoch FROM (delivered_at - shipped_at)) / 3600.0`.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT\n  s.carrier,\n  count(___) AS envios,\n  count(___) AS entregados,\n  ___ AS sin_entregar,\n  round(___(EXTRACT(epoch FROM (s.delivered_at - s.shipped_at)) / 3600.0)::numeric, 2) AS horas_promedio\nFROM shipments AS s\nGROUP BY s.carrier\nORDER BY s.carrier;\n```\nNo hace falta ningún `WHERE`: la función de agregación correcta ya descarta los nulos por su cuenta.",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "null_handling",
        description_md:
          "Dividir la suma de horas por `count(*)`: los envíos sin entregar entran al divisor con valor cero y el promedio baja entre 7 y 10 horas por transportista.",
      },
      {
        category: "null_handling",
        description_md:
          "Usar `coalesce(delivered_at, now())` para «rellenar» los pendientes: inventa una fecha de entrega y convierte una ausencia de dato en un dato inventado.",
      },
      {
        category: "missing_filter",
        description_md:
          "Agregar `WHERE delivered_at IS NOT NULL` a toda la consulta: el promedio queda bien, pero `envios` y `sin_entregar` pierden justamente los casos que Operaciones necesita ver.",
      },
      {
        category: "cell_values",
        description_md:
          "Restar las marcas de tiempo y devolver el `interval` sin convertir: la columna deja de ser numérica y no se puede promediar ni comparar con el contrato.",
      },
    ],
    expert_explanation_md:
      "5 filas. Andes Express: 2 993 envíos, 2 771 entregados, 222 sin entregar, 131,11 horas. Los cinco transportistas quedan entre 130,63 (LatamPost) y 133,59 (Envíos del Norte): una banda de menos de tres horas, así que ninguno es claramente mejor que otro.\n\nEse resultado es en sí mismo el hallazgo: con el cálculo original, la diferencia entre el mejor y el peor era de 2,6 horas sobre promedios de 121 a 124, una conclusión igual de plana pero con todos los números corridos hacia abajo. Dividir por `count(*)` mete en el divisor a 222 envíos que no tienen duración; `avg` los excluye de ambos lados de la división, que es la definición correcta de «tiempo medio de entrega de los envíos entregados».\n\nLa segunda decisión de diseño es reportar `sin_entregar` como columna. Un promedio sin su población es una cifra a medias: si un transportista tuviera 800 envíos pendientes en vez de 222, su promedio se vería bien precisamente porque los lentos todavía no llegaron. Toda métrica calculada sobre un subconjunto debería venir acompañada del tamaño del subconjunto que quedó afuera.\n\n`count(columna)` frente a `count(*)` es la misma distinción con otro nombre: la primera ignora nulos, la segunda cuenta filas. Y `FILTER (WHERE ...)` es la forma explícita de decir lo mismo cuando la condición no es solo «no es nulo»; las tres versiones de arriba producen exactamente el mismo resultado, y elegir entre ellas es una cuestión de legibilidad, no de corrección.",
    improvement_feedback: [
      {
        condition: "missing_alias_on_aggregate",
        message_key: "improve.missing_alias_on_aggregate",
      },
      { condition: "uses_select_star", message_key: "improve.uses_select_star" },
    ],
    reward: defaultReward("expert"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "reconciliar-paso-a-paso",
    section,
    title: "Contar en cada paso",
    difficulty: "expert",
    estimated_minutes: 18,
    concepts: [
      "cte",
      "subquery",
      "set_operations",
      "aggregate",
      "window_function",
      "null_handling",
    ],
    dataset,
    tables_used: ["orders", "payments", "shipments", "returns"],
    scenario_md:
      "Un informe de operaciones arranca con 18 000 pedidos y termina con 13 018. Nadie sabe dónde se van los 4 982 que faltan, y cada vez que alguien agrega un filtro el número cambia sin explicación. Antes de discutir el resultado, el equipo necesita una tabla de reconciliación: cuántos pedidos sobreviven a cada paso de la cadena y cuántos pierde cada uno.",
    business_question_md:
      "Construye la cadena de filtros paso a paso, cada uno aplicado **sobre el resultado del paso anterior**: (1) todos los pedidos; (2) los que tienen `status` en `'delivered'` o `'returned'`; (3) los que además tienen al menos un pago con `status = 'approved'`; (4) los que además tienen al menos un envío con `delivered_at` no nulo; (5) los que además no tienen ninguna fila en `returns`. Devuelve `paso` (1 a 5), `etapa` (el texto exacto `pedidos creados`, `entregados o devueltos`, `con pago aprobado`, `con envio entregado`, `sin devolucion`), `pedidos` (cuántos sobreviven) y `perdidos` (cuántos perdió ese paso respecto del anterior; 0 en el paso 1). Ordena por `paso` ascendente.",
    learning_objective:
      "Instrumentar una consulta como una cadena de pasos contables para localizar exactamente dónde se pierden las filas.",
    theory_ref: metodo,
    expected_columns: [
      { name: "paso", type: "integer" },
      { name: "etapa", type: "text" },
      { name: "pedidos", type: "integer" },
      { name: "perdidos", type: "integer" },
    ],
    validation_rules: { order_matters: true },
    reference_solution: `WITH creados AS (
  SELECT id FROM orders
),
finalizados AS (
  SELECT id FROM orders WHERE status IN ('delivered', 'returned')
),
con_pago AS (
  SELECT f.id
  FROM finalizados AS f
  WHERE EXISTS (SELECT 1 FROM payments AS p WHERE p.order_id = f.id AND p.status = 'approved')
),
con_entrega AS (
  SELECT c.id
  FROM con_pago AS c
  WHERE EXISTS (SELECT 1 FROM shipments AS s WHERE s.order_id = c.id AND s.delivered_at IS NOT NULL)
),
sin_devolucion AS (
  SELECT e.id
  FROM con_entrega AS e
  WHERE NOT EXISTS (SELECT 1 FROM returns AS r WHERE r.order_id = e.id)
),
pasos AS (
  SELECT 1 AS paso, 'pedidos creados' AS etapa, count(*) AS pedidos FROM creados
  UNION ALL
  SELECT 2, 'entregados o devueltos', count(*) FROM finalizados
  UNION ALL
  SELECT 3, 'con pago aprobado', count(*) FROM con_pago
  UNION ALL
  SELECT 4, 'con envio entregado', count(*) FROM con_entrega
  UNION ALL
  SELECT 5, 'sin devolucion', count(*) FROM sin_devolucion
)
SELECT
  paso,
  etapa,
  pedidos,
  coalesce(lag(pedidos) OVER (ORDER BY paso) - pedidos, 0) AS perdidos
FROM pasos
ORDER BY paso;`,
    alternative_solutions: [
      {
        label: "Marcas booleanas por pedido",
        sql: "WITH marcas AS (SELECT o.id, (o.status IN ('delivered','returned')) AS p2, EXISTS (SELECT 1 FROM payments AS p WHERE p.order_id = o.id AND p.status = 'approved') AS p3, EXISTS (SELECT 1 FROM shipments AS s WHERE s.order_id = o.id AND s.delivered_at IS NOT NULL) AS p4, NOT EXISTS (SELECT 1 FROM returns AS r WHERE r.order_id = o.id) AS p5 FROM orders AS o), pasos AS (SELECT 1 AS paso, 'pedidos creados' AS etapa, count(*) AS pedidos FROM marcas UNION ALL SELECT 2, 'entregados o devueltos', count(*) FILTER (WHERE p2) FROM marcas UNION ALL SELECT 3, 'con pago aprobado', count(*) FILTER (WHERE p2 AND p3) FROM marcas UNION ALL SELECT 4, 'con envio entregado', count(*) FILTER (WHERE p2 AND p3 AND p4) FROM marcas UNION ALL SELECT 5, 'sin devolucion', count(*) FILTER (WHERE p2 AND p3 AND p4 AND p5) FROM marcas) SELECT paso, etapa, pedidos, coalesce(lag(pedidos) OVER (ORDER BY paso) - pedidos, 0) AS perdidos FROM pasos ORDER BY paso;",
      },
      {
        label: "Cadena con semi-joins en lugar de EXISTS",
        sql: "WITH finalizados AS (SELECT id FROM orders WHERE status IN ('delivered','returned')), con_pago AS (SELECT DISTINCT f.id FROM finalizados AS f INNER JOIN payments AS p ON p.order_id = f.id AND p.status = 'approved'), con_entrega AS (SELECT DISTINCT c.id FROM con_pago AS c INNER JOIN shipments AS s ON s.order_id = c.id AND s.delivered_at IS NOT NULL), sin_devolucion AS (SELECT e.id FROM con_entrega AS e LEFT JOIN returns AS r ON r.order_id = e.id WHERE r.id IS NULL), pasos AS (SELECT 1 AS paso, 'pedidos creados' AS etapa, count(*) AS pedidos FROM orders UNION ALL SELECT 2, 'entregados o devueltos', count(*) FROM finalizados UNION ALL SELECT 3, 'con pago aprobado', count(*) FROM con_pago UNION ALL SELECT 4, 'con envio entregado', count(*) FROM con_entrega UNION ALL SELECT 5, 'sin devolucion', count(*) FROM sin_devolucion) SELECT paso, etapa, pedidos, coalesce(lag(pedidos) OVER (ORDER BY paso) - pedidos, 0) AS perdidos FROM pasos ORDER BY paso;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Cada paso es una CTE que se apoya en la anterior, no en `orders`. Así, cuando cuentes, la diferencia entre dos filas consecutivas es exactamente lo que ese paso descartó.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Para «tiene al menos un pago aprobado» usa `EXISTS`, no un `INNER JOIN`: el join multiplicaría los pedidos que tienen dos pagos. Después une los cinco conteos con `UNION ALL`, cada rama con su número de paso y su etiqueta. La columna `perdidos` sale de comparar cada fila con la anterior: `lag(pedidos) OVER (ORDER BY paso)`.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nWITH creados AS (SELECT id FROM orders),\nfinalizados AS (SELECT id FROM orders WHERE status IN (___)),\ncon_pago AS (\n  SELECT f.id FROM finalizados AS f\n  WHERE ___ (SELECT 1 FROM payments AS p WHERE p.order_id = f.id AND ___)\n),\ncon_entrega AS (/* igual, apoyado en con_pago, contra shipments */),\nsin_devolucion AS (/* igual, apoyado en con_entrega, con NOT EXISTS contra returns */),\npasos AS (\n  SELECT 1 AS paso, 'pedidos creados' AS etapa, count(*) AS pedidos FROM creados\n  UNION ALL\n  SELECT 2, 'entregados o devueltos', count(*) FROM finalizados\n  -- ... y los pasos 3, 4 y 5\n)\nSELECT paso, etapa, pedidos,\n  coalesce(___(pedidos) OVER (ORDER BY paso) - pedidos, 0) AS perdidos\nFROM pasos\nORDER BY paso;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "duplicates",
        description_md:
          "Usar `INNER JOIN payments` en lugar de `EXISTS`: los 1 251 pedidos con dos pagos se cuentan dos veces y el paso 3 muestra más pedidos que el paso 2, lo que es imposible en una cadena.",
      },
      {
        category: "aggregation_level",
        description_md:
          "Apoyar cada paso en `orders` en vez de en la CTE anterior: los conteos dejan de ser acumulativos y `perdidos` pierde todo sentido.",
      },
      {
        category: "null_handling",
        description_md:
          "Escribir el paso 4 como `WHERE delivered_at IS NOT NULL` sobre un `LEFT JOIN` con `shipments` sin desduplicar, o confundir «no tiene envío» con «tiene envío sin entregar»: son dos poblaciones distintas.",
      },
      {
        category: "wrong_order",
        description_md:
          "Omitir `ORDER BY paso` al final: `UNION ALL` no garantiza ningún orden y la tabla de reconciliación solo se lee si los pasos vienen en secuencia.",
      },
    ],
    expert_explanation_md:
      "5 filas: 18 000 → 14 229 (pierde 3 771) → 13 156 (pierde 1 073) → 13 018 (pierde 138) → 13 018 (pierde 0).\n\nCada número dice algo. Los 3 771 del paso 2 son los pedidos cancelados, pagados y enviados que todavía no cerraron el ciclo: una pérdida esperada. Los 138 del paso 4 son pedidos con pago aprobado cuyo envío no registra entrega, y merecen una revisión operativa.\n\nLos otros dos pasos son el verdadero hallazgo, y ninguno se ve sin la tabla. El paso 3 pierde exactamente 1 073 pedidos, que es exactamente la cantidad de pedidos con `status = 'returned'`: cuando un pedido se devuelve, su pago pasa a `refunded` y deja de ser `approved`. Es decir, el filtro «con pago aprobado», que suena inofensivo, elimina toda la población de devoluciones. Si el informe pretendía medir devoluciones, ese paso las borró antes de contarlas.\n\nY el paso 5 pierde 0, lo que parece un error y no lo es: `returns` solo tiene filas para pedidos devueltos, que el paso 3 ya había eliminado. Un paso que no descarta nada es un paso redundante, y saberlo permite quitarlo o moverlo antes en la cadena. La coincidencia exacta entre 1 073 y el total de devueltos es la clase de verificación que convierte una sospecha en un diagnóstico.\n\nDos decisiones técnicas sostienen la tabla. `EXISTS` en vez de `INNER JOIN` evita el fan-out de `payments` —1 251 pedidos tienen dos pagos— y garantiza que la sucesión sea monótona decreciente; si alguna vez ves un paso que **sube**, el error es este. Y `lag(pedidos) OVER (ORDER BY paso)` calcula la pérdida sin volver a consultar nada, con `coalesce` para el primer paso, que no tiene anterior.",
    improvement_feedback: [
      { condition: "uses_implicit_join", message_key: "improve.uses_implicit_join" },
      {
        condition: "missing_alias_on_aggregate",
        message_key: "improve.missing_alias_on_aggregate",
      },
    ],
    reward: defaultReward("expert"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "tasa-de-devolucion-por-categoria",
    section,
    title: "Tasa de devolución por categoría",
    difficulty: "expert",
    estimated_minutes: 20,
    concepts: ["cte", "distinct", "inner_join", "conditional_aggregation", "aggregate", "group_by"],
    dataset,
    tables_used: ["orders", "order_items", "products", "categories"],
    scenario_md:
      "Calidad quiere priorizar auditorías de vendedores por categoría y pidió la tasa de devolución de cada una. La primera versión une `orders`, `order_items`, `products` y `categories` y cuenta filas; el resultado ordena las categorías de una forma que no coincide con lo que Atención al Cliente ve todos los días, y los totales por categoría suman más pedidos de los que existen.",
    business_question_md:
      "Considera solo los pedidos con `status` en `'delivered'` o `'returned'`. Un pedido «toca» una categoría si alguna de sus líneas corresponde a un producto de esa categoría; un pedido puede tocar varias categorías y debe contarse **una sola vez en cada una**. Devuelve `categoria` (el `name` de `categories`), `pedidos` (pedidos distintos que tocan la categoría), `devueltos` (cuántos de ellos tienen `status = 'returned'`) y `tasa_pct` (porcentaje redondeado a 2 decimales). Ordena por `tasa_pct` descendente y, ante empates, por `categoria` ascendente.",
    learning_objective:
      "Combinar el control del fan-out con la agregación condicional para calcular una tasa correcta sobre una relación muchos a muchos.",
    theory_ref: joins,
    expected_columns: [
      { name: "categoria", type: "text" },
      { name: "pedidos", type: "integer" },
      { name: "devueltos", type: "integer" },
      { name: "tasa_pct", type: "numeric" },
    ],
    validation_rules: { order_matters: true, numeric_tolerance: 0.001 },
    reference_solution: `WITH pedido_categoria AS (
  SELECT DISTINCT
    p.category_id,
    o.id AS order_id,
    (o.status = 'returned') AS devuelto
  FROM orders AS o
  INNER JOIN order_items AS oi ON oi.order_id = o.id
  INNER JOIN products AS p ON p.id = oi.product_id
  WHERE o.status IN ('delivered', 'returned')
)
SELECT
  c.name AS categoria,
  count(*) AS pedidos,
  count(*) FILTER (WHERE pc.devuelto) AS devueltos,
  round(100.0 * count(*) FILTER (WHERE pc.devuelto) / count(*), 2) AS tasa_pct
FROM pedido_categoria AS pc
INNER JOIN categories AS c ON c.id = pc.category_id
GROUP BY c.name
ORDER BY tasa_pct DESC, categoria ASC;`,
    alternative_solutions: [
      {
        label: "Desduplicado con GROUP BY en lugar de DISTINCT",
        sql: "WITH pedido_categoria AS (SELECT p.category_id, o.id AS order_id, max(CASE WHEN o.status = 'returned' THEN 1 ELSE 0 END) AS devuelto FROM orders AS o INNER JOIN order_items AS oi ON oi.order_id = o.id INNER JOIN products AS p ON p.id = oi.product_id WHERE o.status IN ('delivered', 'returned') GROUP BY p.category_id, o.id) SELECT c.name AS categoria, count(*) AS pedidos, sum(pc.devuelto)::bigint AS devueltos, round(100.0 * sum(pc.devuelto) / count(*), 2) AS tasa_pct FROM pedido_categoria AS pc INNER JOIN categories AS c ON c.id = pc.category_id GROUP BY c.name ORDER BY tasa_pct DESC, categoria ASC;",
      },
      {
        label: "Conteos distintos sobre el join completo",
        sql: "SELECT c.name AS categoria, count(DISTINCT o.id) AS pedidos, count(DISTINCT o.id) FILTER (WHERE o.status = 'returned') AS devueltos, round(100.0 * count(DISTINCT o.id) FILTER (WHERE o.status = 'returned') / count(DISTINCT o.id), 2) AS tasa_pct FROM orders AS o INNER JOIN order_items AS oi ON oi.order_id = o.id INNER JOIN products AS p ON p.id = oi.product_id INNER JOIN categories AS c ON c.id = p.category_id WHERE o.status IN ('delivered', 'returned') GROUP BY c.name ORDER BY tasa_pct DESC, categoria ASC;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "El camino de `orders` a `categories` pasa por dos tablas de detalle, así que un pedido puede aparecer varias veces dentro de la misma categoría: dos líneas del mismo pedido con productos de la misma categoría producen dos filas. Antes de contar, decide cuál es tu unidad: el par (pedido, categoría).",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Arma una CTE con **una fila por par (pedido, categoría)** usando `SELECT DISTINCT`, y lleva en esa misma fila la marca de si el pedido fue devuelto. Sobre esa CTE, `count(*)` cuenta pedidos y `count(*) FILTER (WHERE devuelto)` cuenta los devueltos, sin ningún `DISTINCT` adicional.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nWITH pedido_categoria AS (\n  -- una fila por par (pedido, categoría)\n  SELECT ___ p.category_id, o.id AS order_id, (o.status = '___') AS devuelto\n  FROM orders AS o\n  INNER JOIN order_items AS oi ON oi.order_id = o.id\n  INNER JOIN products AS p ON p.id = ___\n  WHERE o.status IN (___, ___)\n)\nSELECT\n  c.name AS categoria,\n  count(*) AS pedidos,\n  count(*) ___ (WHERE pc.devuelto) AS devueltos,\n  round(100.0 * ___ / ___, 2) AS tasa_pct\nFROM pedido_categoria AS pc\nINNER JOIN categories AS c ON c.id = pc.category_id\nGROUP BY c.name\nORDER BY tasa_pct DESC, categoria ASC;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "duplicates",
        description_md:
          "Contar filas del join sin desduplicar: los pedidos con dos líneas de la misma categoría se cuentan dos veces. Bebés pasa de 979 a 1 014 pedidos y su tasa de 8,99 % a 8,78 %.",
      },
      {
        category: "aggregation_level",
        description_md:
          "Poner el `DISTINCT` solo en el numerador o solo en el denominador: la tasa mezcla dos granos distintos y deja de ser un porcentaje interpretable.",
      },
      {
        category: "missing_filter",
        description_md:
          "Incluir pedidos cancelados o pendientes en el denominador: un pedido cancelado nunca pudo devolverse, así que baja artificialmente la tasa de todas las categorías.",
      },
      {
        category: "wrong_order",
        description_md:
          "Ordenar solo por `tasa_pct DESC` sin criterio de desempate: si dos categorías empatan, el orden entre ellas no está definido y el informe cambia entre ejecuciones.",
      },
    ],
    expert_explanation_md:
      "24 filas, una por categoría hoja. Bebés encabeza con 8,99 % (88 devueltos sobre 979 pedidos), seguida de Calzado 8,44 % y Perfumes 8,30 %; Fitness cierra con 5,61 %. La banda va de 5,61 a 8,99: diferencias reales pero moderadas, que es la clase de conclusión que una tasa mal calculada suele exagerar.\n\nLa clave está en la CTE `pedido_categoria` y en su comentario de grano: **una fila por par (pedido, categoría)**. El camino `orders → order_items → products` multiplica, porque un pedido de tres líneas produce tres filas, y si dos de esas líneas son de la misma categoría, ese pedido aparece dos veces en esa categoría. El `DISTINCT` colapsa esos duplicados y deja intacto el caso legítimo de un pedido que toca dos categorías distintas: se cuenta una vez en cada una. Por eso la suma de la columna `pedidos` (23 207) es mayor que los 14 229 pedidos finalizados, y eso está bien: es una relación muchos a muchos, no una partición.\n\nSin el `DISTINCT`, Bebés muestra 1 014 pedidos y 8,78 %. El sesgo no es uniforme: castiga más a las categorías cuyos productos se compran de a varios, así que altera el ranking, que es exactamente lo que Calidad iba a usar para priorizar auditorías.\n\nLlevar `devuelto` como columna booleana dentro de la CTE es lo que permite usar `count(*) FILTER (WHERE ...)` en el `SELECT` final sin volver a tocar `orders`. La alternativa con `max(CASE WHEN ... THEN 1 ELSE 0 END)` y `GROUP BY` hace lo mismo y es la forma portable cuando el motor no soporta `FILTER`. La tercera, con `count(DISTINCT o.id)` sobre el join completo, es la más corta de escribir y la más fácil de romper: basta olvidar un `DISTINCT` en una de las dos ramas para que la tasa quede mal sin ningún aviso.\n\nUna verificación final que cuesta diez segundos: la suma de `devueltos` debe ser mayor o igual a 1 073, el total de pedidos devueltos, porque cada devolución se cuenta en cada categoría que toca. Si diera menos, faltarían pedidos; si diera muchísimo más, habría duplicados.",
    improvement_feedback: [
      { condition: "no_table_alias_in_join", message_key: "improve.no_table_alias_in_join" },
      { condition: "uses_implicit_join", message_key: "improve.uses_implicit_join" },
    ],
    reward: defaultReward("expert"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
];
