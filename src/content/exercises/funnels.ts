import {
  defaultHintMeta,
  defaultReward,
  defaultSolutionUnlock,
  type ExerciseDef,
} from "../schemas/exercise";

const section = "funnels";
const pidelo = { slug: "pidelo", version: 1 };
const tiendaviva = { slug: "tiendaviva", version: 1 };
const ritmo = { slug: "ritmo", version: 1 };
const definicion = "funnel-definicion-y-pasos";
const orden = "funnel-orden-estricto-o-cualquier-orden";
const abandono = "funnel-abandono-y-tiempo-de-conversion";

export const exercises: ExerciseDef[] = [
  {
    slug: "funnel-pasos-de-pedidos",
    section,
    title: "Los cinco pasos del pedido",
    difficulty: "intermediate",
    estimated_minutes: 8,
    concepts: ["aggregate", "group_by", "case", "where", "distinct", "order_by"],
    dataset: pidelo,
    tables_used: ["order_events"],
    scenario_md:
      "En **Pídelo**, Operaciones quiere por fin un funnel oficial del ciclo de vida del pedido. Hoy cada equipo cuenta sus propios números y ninguno coincide. Te piden la base: una sola tabla con los cinco pasos en orden y cuántos pedidos llegó a cada uno.",
    business_question_md:
      "A partir de `order_events`, devuelve una fila por paso del funnel con `paso` (1 para `placed`, 2 `accepted`, 3 `preparing`, 4 `picked_up`, 5 `delivered`), `etapa` (el nombre del evento tal como aparece en la tabla) y `pedidos` (cantidad de pedidos distintos con ese evento). El evento `cancelled` no es un paso del funnel: exclúyelo. Ordena por `paso` ascendente.",
    learning_objective:
      "Construir el conteo por paso de un funnel a partir de una tabla de eventos, asignando a cada evento su posición en la secuencia.",
    theory_ref: definicion,
    expected_columns: [
      { name: "paso", type: "integer" },
      { name: "etapa", type: "text" },
      { name: "pedidos", type: "integer" },
    ],
    validation_rules: { order_matters: true, required_concepts: ["case", "group_by"] },
    reference_solution:
      "SELECT\n  CASE event\n    WHEN 'placed' THEN 1\n    WHEN 'accepted' THEN 2\n    WHEN 'preparing' THEN 3\n    WHEN 'picked_up' THEN 4\n    WHEN 'delivered' THEN 5\n  END AS paso,\n  event AS etapa,\n  count(DISTINCT order_id) AS pedidos\nFROM order_events\nWHERE event <> 'cancelled'\nGROUP BY 1, 2\nORDER BY paso;",
    alternative_solutions: [
      {
        label: "Filtro por lista de eventos del funnel",
        sql: "SELECT CASE event WHEN 'placed' THEN 1 WHEN 'accepted' THEN 2 WHEN 'preparing' THEN 3 WHEN 'picked_up' THEN 4 WHEN 'delivered' THEN 5 END AS paso, event AS etapa, count(DISTINCT order_id) AS pedidos FROM order_events WHERE event IN ('placed', 'accepted', 'preparing', 'picked_up', 'delivered') GROUP BY 1, 2 ORDER BY paso;",
      },
      {
        label: "El paso se calcula en una subconsulta",
        sql: "SELECT paso, etapa, count(DISTINCT order_id) AS pedidos FROM (SELECT order_id, event AS etapa, CASE event WHEN 'placed' THEN 1 WHEN 'accepted' THEN 2 WHEN 'preparing' THEN 3 WHEN 'picked_up' THEN 4 WHEN 'delivered' THEN 5 END AS paso FROM order_events WHERE event <> 'cancelled') AS eventos_del_funnel GROUP BY paso, etapa ORDER BY paso;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Un funnel sobre una tabla de eventos es un `GROUP BY` por tipo de evento. Lo único que falta es darle a cada evento un número que represente su posición, para poder ordenarlos como secuencia y no alfabéticamente.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Usa una expresión `CASE event WHEN ... THEN ... END` para traducir el nombre del evento a su número de paso. Cuenta con `count(DISTINCT order_id)` y deja fuera `cancelled` con un filtro en el `WHERE`. Puedes agrupar por las posiciones (`GROUP BY 1, 2`) para no repetir el `CASE`.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT\n  CASE event\n    WHEN 'placed' THEN ___\n    WHEN 'accepted' THEN ___\n    WHEN 'preparing' THEN ___\n    WHEN 'picked_up' THEN ___\n    WHEN 'delivered' THEN ___\n  END AS paso,\n  event AS etapa,\n  ___(___ order_id) AS pedidos\nFROM order_events\nWHERE event ___ 'cancelled'\nGROUP BY 1, 2\nORDER BY ___;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "missing_filter",
        description_md:
          "No excluir `cancelled`: aparece una sexta fila con `paso` en NULL y 1153 pedidos, que no es un paso del embudo sino una salida.",
      },
      {
        category: "wrong_order",
        description_md:
          "Ordenar por `etapa` en vez de por `paso`: el resultado sale alfabético (`accepted`, `delivered`, `picked_up`, `placed`, `preparing`) y deja de leerse como una secuencia.",
      },
      {
        category: "duplicates",
        description_md:
          "Usar `count(*)` en lugar de `count(DISTINCT order_id)`: aquí coinciden porque hay un evento por etapa y pedido, pero en una tabla de eventos con reintentos inflarías el paso.",
      },
      {
        category: "wrong_columns",
        description_md:
          "Devolver solo `etapa` y `pedidos`: sin la columna `paso`, quien lea el resultado no puede reconstruir el orden del funnel.",
      },
    ],
    expert_explanation_md:
      "Cinco filas: 14 437 → 13 843 → 13 573 → 13 434 → 13 284. La caída más grande está entre `placed` y `accepted` (594 pedidos), y coincide con los pedidos que el restaurante nunca aceptó.\n\nEl `CASE` cumple dos funciones a la vez: da el número de paso que se muestra y la clave por la que se ordena. Por eso el `ORDER BY paso` produce la secuencia del proceso y no el orden alfabético del nombre del evento.\n\n`GROUP BY 1, 2` agrupa por las dos primeras expresiones del `SELECT`. Es cómodo y legal en PostgreSQL; si prefieres ser explícito, repite el `CASE` completo en el `GROUP BY` o calcúlalo en una subconsulta, como en la alternativa. Las tres versiones producen el mismo resultado.\n\nUna nota de método: este funnel cuenta *pedidos que tienen el evento*, sin verificar el orden temporal. En Pídelo los eventos están siempre en secuencia, así que da lo mismo; en otras fuentes no, y es lo que trabajarás en el ejercicio del funnel de activación de Ritmo.",
    improvement_feedback: [
      { condition: "uses_select_star", message_key: "improve.uses_select_star" },
      {
        condition: "missing_alias_on_aggregate",
        message_key: "improve.missing_alias_on_aggregate",
      },
    ],
    reward: defaultReward("intermediate"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "funnel-conversion-paso-a-paso",
    section,
    title: "Conversión paso a paso y desde el inicio",
    difficulty: "intermediate",
    estimated_minutes: 12,
    concepts: ["window_function", "lag_lead", "cte", "aggregate", "group_by", "case"],
    dataset: pidelo,
    tables_used: ["order_events"],
    scenario_md:
      "El funnel de Operaciones ya está armado, pero en el comité alguien preguntó lo obvio: «¿qué porcentaje es eso?». Te piden agregar las dos tasas que se usan siempre: cuánto conserva cada paso respecto del anterior y cuánto respecto del primer paso.",
    business_question_md:
      "Sobre el funnel de `order_events` (pasos 1 `placed`, 2 `accepted`, 3 `preparing`, 4 `picked_up`, 5 `delivered`, excluyendo `cancelled`), devuelve `paso`, `etapa`, `pedidos`, `pct_vs_anterior` (porcentaje de pedidos respecto del paso inmediatamente anterior, redondeado a 2 decimales; NULL en el primer paso) y `pct_vs_inicio` (porcentaje respecto del paso 1, redondeado a 2 decimales). Ordena por `paso` ascendente.",
    learning_objective:
      "Calcular las dos tasas de conversión de un funnel con lag() y first_value() sobre la serie de pasos ya agregada.",
    theory_ref: definicion,
    expected_columns: [
      { name: "paso", type: "integer" },
      { name: "etapa", type: "text" },
      { name: "pedidos", type: "integer" },
      { name: "pct_vs_anterior", type: "numeric" },
      { name: "pct_vs_inicio", type: "numeric" },
    ],
    validation_rules: {
      order_matters: true,
      numeric_tolerance: 0.001,
      required_concepts: ["window_function"],
    },
    reference_solution:
      "WITH por_paso AS (\n  SELECT\n    CASE event\n      WHEN 'placed' THEN 1\n      WHEN 'accepted' THEN 2\n      WHEN 'preparing' THEN 3\n      WHEN 'picked_up' THEN 4\n      WHEN 'delivered' THEN 5\n    END AS paso,\n    event AS etapa,\n    count(DISTINCT order_id) AS pedidos\n  FROM order_events\n  WHERE event <> 'cancelled'\n  GROUP BY 1, 2\n)\nSELECT\n  paso,\n  etapa,\n  pedidos,\n  round(100.0 * pedidos / lag(pedidos) OVER (ORDER BY paso), 2) AS pct_vs_anterior,\n  round(100.0 * pedidos / first_value(pedidos) OVER (ORDER BY paso), 2) AS pct_vs_inicio\nFROM por_paso\nORDER BY paso;",
    alternative_solutions: [
      {
        label: "El total del paso 1 con una subconsulta escalar",
        sql: "WITH por_paso AS (SELECT CASE event WHEN 'placed' THEN 1 WHEN 'accepted' THEN 2 WHEN 'preparing' THEN 3 WHEN 'picked_up' THEN 4 WHEN 'delivered' THEN 5 END AS paso, event AS etapa, count(DISTINCT order_id) AS pedidos FROM order_events WHERE event <> 'cancelled' GROUP BY 1, 2) SELECT paso, etapa, pedidos, round(100.0 * pedidos / lag(pedidos) OVER (ORDER BY paso), 2) AS pct_vs_anterior, round(100.0 * pedidos / (SELECT p.pedidos FROM por_paso AS p WHERE p.paso = 1), 2) AS pct_vs_inicio FROM por_paso ORDER BY paso;",
      },
      {
        label: "Marco explícito en las dos ventanas",
        sql: "WITH por_paso AS (SELECT CASE event WHEN 'placed' THEN 1 WHEN 'accepted' THEN 2 WHEN 'preparing' THEN 3 WHEN 'picked_up' THEN 4 WHEN 'delivered' THEN 5 END AS paso, event AS etapa, count(DISTINCT order_id) AS pedidos FROM order_events WHERE event <> 'cancelled' GROUP BY 1, 2) SELECT paso, etapa, pedidos, round(100.0 * pedidos / lag(pedidos, 1) OVER (ORDER BY paso), 2) AS pct_vs_anterior, round(100.0 * pedidos / first_value(pedidos) OVER (ORDER BY paso ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW), 2) AS pct_vs_inicio FROM por_paso ORDER BY paso;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Reutiliza el funnel del ejercicio anterior dentro de una CTE. Sobre esa serie de cinco filas, «el paso anterior» y «el primer paso» son dos funciones de ventana distintas, ambas ordenadas por el número de paso.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "`lag(pedidos) OVER (ORDER BY paso)` devuelve el conteo del paso anterior (NULL en el primero). `first_value(pedidos) OVER (ORDER BY paso)` devuelve el del paso 1. Multiplica por `100.0`, no por `100`: con dos enteros la división es entera y da 0.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nWITH por_paso AS (\n  -- el funnel del ejercicio anterior, sin ORDER BY\n  ...\n)\nSELECT\n  paso,\n  etapa,\n  pedidos,\n  round(___ * pedidos / ___(pedidos) OVER (ORDER BY paso), 2) AS pct_vs_anterior,\n  round(___ * pedidos / ___(pedidos) OVER (ORDER BY paso), 2) AS pct_vs_inicio\nFROM por_paso\nORDER BY paso;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "cell_values",
        description_md:
          "Escribir `100 * pedidos / lag(pedidos)`: ambos son enteros, la división es entera y todos los porcentajes salen 0. Con `100.0` el cálculo pasa a `numeric`.",
      },
      {
        category: "null_handling",
        description_md:
          "Reemplazar el NULL del primer paso por 100 con `coalesce`: el paso 1 no tiene paso anterior y el NULL es la respuesta honesta.",
      },
      {
        category: "aggregation_level",
        description_md:
          "Intentar el `lag()` sobre las filas de `order_events` sin agregar antes por paso: la ventana recorre 68 571 filas y no la serie de cinco pasos.",
      },
      {
        category: "cell_values",
        description_md:
          "Usar `max(pedidos) OVER ()` como denominador de `pct_vs_inicio`: aquí coincide porque el funnel es decreciente, pero deja de funcionar en cuanto un paso supera al primero (por ejemplo, un funnel de reintentos).",
      },
    ],
    expert_explanation_md:
      "Cinco filas. `pct_vs_anterior` va NULL, 95.89, 98.05, 98.98 y 98.88; `pct_vs_inicio` va 100.00, 95.89, 94.02, 93.05 y 92.01.\n\nLas dos columnas cuentan historias distintas y por eso se publican juntas. `pct_vs_anterior` señala la fuga: el 95.89 % del primer salto es, con diferencia, el peor paso. `pct_vs_inicio` cierra el mensaje: el 92.01 % de los pedidos llega a entregarse.\n\n`first_value(pedidos) OVER (ORDER BY paso)` funciona porque el marco por omisión de una ventana con `ORDER BY` empieza en `UNBOUNDED PRECEDING`: la primera fila del marco es siempre la primera de la partición. Si alguna vez declaras un marco distinto —por ejemplo `ROWS BETWEEN 1 PRECEDING AND CURRENT ROW`— `first_value()` deja de ser «el primer paso» y pasa a ser «el primero de ese marco». La subconsulta escalar de la alternativa es inmune a ese error y a veces se prefiere justamente por eso.\n\nSobre el redondeo: `round(x, 2)` exige `numeric`. Como `100.0` ya es `numeric`, toda la expresión lo es y `round` de dos argumentos funciona sin conversiones extra.",
    improvement_feedback: [
      {
        condition: "missing_alias_on_aggregate",
        message_key: "improve.missing_alias_on_aggregate",
      },
    ],
    reward: defaultReward("intermediate"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "funnel-pedido-pago-envio-entrega",
    section,
    title: "El funnel de TiendaViva sin tabla de eventos",
    difficulty: "advanced",
    estimated_minutes: 15,
    concepts: ["cte", "outer_join", "aggregate", "group_by", "set_operations", "date_functions"],
    dataset: tiendaviva,
    tables_used: ["orders", "payments", "shipments"],
    scenario_md:
      "**TiendaViva** no tiene una tabla de eventos: el ciclo de vida del pedido está repartido en `orders`, `payments` y `shipments`. Finanzas quiere el funnel del primer semestre de 2025 para cerrar el informe de medio año, y necesita que la base sean **todos** los pedidos creados, no solo los que pagaron.",
    business_question_md:
      "Para los pedidos creados entre el `2025-01-01` y el `2025-06-30` inclusive (en UTC), devuelve una fila por paso con `paso` (1 a 4), `etapa` (`creado`, `pagado`, `enviado`, `entregado`) y `pedidos`. Un pedido cuenta como **pagado** si tiene al menos un pago con `status` `approved` o `refunded`; como **enviado** si tiene un envío con `shipped_at`; como **entregado** si tiene un envío con `delivered_at`. Ordena por `paso` ascendente.",
    learning_objective:
      "Armar una tabla de hitos por unidad con LEFT JOIN y contar cada paso del funnel como valores no nulos.",
    theory_ref: definicion,
    expected_columns: [
      { name: "paso", type: "integer" },
      { name: "etapa", type: "text" },
      { name: "pedidos", type: "integer" },
    ],
    validation_rules: {
      order_matters: true,
      required_concepts: ["cte", "outer_join", "set_operations"],
    },
    reference_solution:
      "WITH hitos AS (\n  SELECT\n    o.id AS order_id,\n    min(pay.paid_at) AS pagado_at,\n    min(shp.shipped_at) AS enviado_at,\n    min(shp.delivered_at) AS entregado_at\n  FROM orders AS o\n  LEFT JOIN payments AS pay\n    ON pay.order_id = o.id AND pay.status IN ('approved', 'refunded')\n  LEFT JOIN shipments AS shp ON shp.order_id = o.id\n  WHERE o.created_at >= timestamptz '2025-01-01 00:00:00+00'\n    AND o.created_at < timestamptz '2025-07-01 00:00:00+00'\n  GROUP BY o.id\n)\nSELECT 1 AS paso, 'creado' AS etapa, count(*) AS pedidos FROM hitos\nUNION ALL\nSELECT 2, 'pagado', count(pagado_at) FROM hitos\nUNION ALL\nSELECT 3, 'enviado', count(enviado_at) FROM hitos\nUNION ALL\nSELECT 4, 'entregado', count(entregado_at) FROM hitos\nORDER BY paso;",
    alternative_solutions: [
      {
        label: "count(*) FILTER en lugar de count(columna)",
        sql: "WITH hitos AS (SELECT o.id AS order_id, min(pay.paid_at) AS pagado_at, min(shp.shipped_at) AS enviado_at, min(shp.delivered_at) AS entregado_at FROM orders AS o LEFT JOIN payments AS pay ON pay.order_id = o.id AND pay.status IN ('approved', 'refunded') LEFT JOIN shipments AS shp ON shp.order_id = o.id WHERE o.created_at >= timestamptz '2025-01-01 00:00:00+00' AND o.created_at < timestamptz '2025-07-01 00:00:00+00' GROUP BY o.id) SELECT 1 AS paso, 'creado' AS etapa, count(*) AS pedidos FROM hitos UNION ALL SELECT 2, 'pagado', count(*) FILTER (WHERE pagado_at IS NOT NULL) FROM hitos UNION ALL SELECT 3, 'enviado', count(*) FILTER (WHERE enviado_at IS NOT NULL) FROM hitos UNION ALL SELECT 4, 'entregado', count(*) FILTER (WHERE entregado_at IS NOT NULL) FROM hitos ORDER BY paso;",
      },
      {
        label: "Hitos con subconsultas EXISTS",
        sql: "WITH hitos AS (SELECT o.id AS order_id, EXISTS (SELECT 1 FROM payments AS p WHERE p.order_id = o.id AND p.status IN ('approved', 'refunded')) AS pago_ok, EXISTS (SELECT 1 FROM shipments AS s WHERE s.order_id = o.id AND s.shipped_at IS NOT NULL) AS envio_ok, EXISTS (SELECT 1 FROM shipments AS s WHERE s.order_id = o.id AND s.delivered_at IS NOT NULL) AS entrega_ok FROM orders AS o WHERE o.created_at >= timestamptz '2025-01-01 00:00:00+00' AND o.created_at < timestamptz '2025-07-01 00:00:00+00') SELECT 1 AS paso, 'creado' AS etapa, count(*) AS pedidos FROM hitos UNION ALL SELECT 2, 'pagado', count(*) FILTER (WHERE pago_ok) FROM hitos UNION ALL SELECT 3, 'enviado', count(*) FILTER (WHERE envio_ok) FROM hitos UNION ALL SELECT 4, 'entregado', count(*) FILTER (WHERE entrega_ok) FROM hitos ORDER BY paso;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Cuando el funnel está repartido en varias tablas, el primer paso es siempre el mismo: una CTE con **una fila por pedido** y una columna por hito (el instante en que ocurrió, o NULL si nunca ocurrió). Después, contar un paso es contar valores no nulos.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Usa `LEFT JOIN` desde `orders` hacia `payments` y `shipments`, y pon el filtro de `status` **en el `ON`**, no en el `WHERE` (en el `WHERE` convertiría el `LEFT JOIN` en `INNER JOIN` y perderías la base del embudo). Agrupa por `o.id` y toma `min()` de cada marca de tiempo. Para las cuatro filas del resultado, encadena cuatro `SELECT` con `UNION ALL`.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nWITH hitos AS (\n  SELECT\n    o.id AS order_id,\n    ___(pay.paid_at) AS pagado_at,\n    ___(shp.shipped_at) AS enviado_at,\n    ___(shp.delivered_at) AS entregado_at\n  FROM orders AS o\n  ___ JOIN payments AS pay\n    ON pay.order_id = o.id AND pay.status IN (___, ___)\n  ___ JOIN shipments AS shp ON shp.order_id = o.id\n  WHERE o.created_at >= timestamptz '2025-01-01 00:00:00+00'\n    AND o.created_at < timestamptz '___-___-01 00:00:00+00'\n  GROUP BY o.id\n)\nSELECT 1 AS paso, 'creado' AS etapa, count(___) AS pedidos FROM hitos\n___ ___\nSELECT 2, 'pagado', count(___) FROM hitos\n-- ... y los pasos 3 y 4\nORDER BY paso;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "join_condition",
        description_md:
          "Usar `INNER JOIN payments`: los 811 pedidos del semestre que nunca pagaron desaparecen y el paso 1 deja de ser la base real del funnel.",
      },
      {
        category: "missing_filter",
        description_md:
          "Poner `pay.status IN ('approved','refunded')` en el `WHERE` en vez del `ON`: el `LEFT JOIN` se comporta como `INNER JOIN` y el resultado es idéntico al error anterior.",
      },
      {
        category: "date_boundary",
        description_md:
          "Escribir `created_at BETWEEN '2025-01-01' AND '2025-06-30'`: con `timestamptz` el límite superior corta a las 00:00 del día 30 y se pierde casi un día entero de pedidos.",
      },
      {
        category: "cell_values",
        description_md:
          "Contar como pagados solo los pagos `approved`: los 1073 pedidos devueltos tienen su pago en `refunded`, sí pagaron, y quedarían fuera del paso 2 aunque estén en los pasos 3 y 4.",
      },
    ],
    expert_explanation_md:
      "Cuatro filas: 6400 creados → 5589 pagados → 5447 enviados → 5068 entregados. Es decir, un 87.33 % de conversión a pago y un 79.19 % de punta a punta.\n\nTres decisiones sostienen el resultado.\n\nPrimera, los `LEFT JOIN`. La base de un funnel es el universo completo; si la recortas con `INNER JOIN`, todos los porcentajes posteriores salen optimistas. El filtro de `status` en el `ON` es la otra cara de lo mismo: el `ON` decide qué filas de la derecha se emparejan, el `WHERE` decide qué filas del resultado sobreviven.\n\nSegunda, incluir `refunded` entre los pagos. Un pedido devuelto pagó y después se le reembolsó; excluirlo produciría un funnel imposible, con más envíos que pagos. Vale la pena comprobarlo: si un paso posterior supera a uno anterior, casi siempre hay un filtro mal puesto.\n\nTercera, el límite superior abierto (`< '2025-07-01'`). Con marcas de tiempo, `BETWEEN` con la fecha final es una fuente permanente de errores silenciosos.\n\nEl `UNION ALL` es la forma directa de girar una fila de cuatro medidas en cuatro filas. La alternativa con `EXISTS` evita el `GROUP BY` y suele leerse mejor cuando solo te interesa «ocurrió o no» y no *cuándo* ocurrió; en cuanto necesites los tiempos entre pasos, vuelve a hacer falta la tabla de hitos con marcas de tiempo.",
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
  {
    slug: "funnel-por-canal-de-venta",
    section,
    title: "Comparar el funnel por canal de venta",
    difficulty: "advanced",
    estimated_minutes: 14,
    concepts: [
      "cte",
      "outer_join",
      "conditional_aggregation",
      "aggregate",
      "group_by",
      "null_handling",
    ],
    dataset: tiendaviva,
    tables_used: ["orders", "payments", "shipments"],
    scenario_md:
      "El equipo de Producto de **TiendaViva** sospecha que la app convierte peor que la web y quiere el dato antes de pedir presupuesto para rehacer el checkout. Te piden el funnel completo abierto por canal, sin recorte de fechas: toda la historia disponible.",
    business_question_md:
      "Devuelve una fila por canal (`orders.channel`) con `canal`, `pedidos` (todos los pedidos del canal), `pagados` (con al menos un pago `approved` o `refunded`), `entregados` (con un envío que tenga `delivered_at`), `pct_pago` (porcentaje de `pagados` sobre `pedidos`, 2 decimales) y `pct_entrega_sobre_pago` (porcentaje de `entregados` sobre `pagados`, 2 decimales). Ordena por `canal` ascendente.",
    learning_objective:
      "Segmentar un funnel por una dimensión y calcular las tasas de conversión de cada segmento con agregación condicional.",
    theory_ref: definicion,
    expected_columns: [
      { name: "canal", type: "text" },
      { name: "pedidos", type: "integer" },
      { name: "pagados", type: "integer" },
      { name: "entregados", type: "integer" },
      { name: "pct_pago", type: "numeric" },
      { name: "pct_entrega_sobre_pago", type: "numeric" },
    ],
    validation_rules: {
      order_matters: true,
      numeric_tolerance: 0.001,
      required_concepts: ["cte", "outer_join", "group_by"],
    },
    reference_solution:
      "WITH hitos AS (\n  SELECT\n    o.id AS order_id,\n    o.channel,\n    min(pay.paid_at) AS pagado_at,\n    min(shp.delivered_at) AS entregado_at\n  FROM orders AS o\n  LEFT JOIN payments AS pay\n    ON pay.order_id = o.id AND pay.status IN ('approved', 'refunded')\n  LEFT JOIN shipments AS shp ON shp.order_id = o.id\n  GROUP BY o.id, o.channel\n)\nSELECT\n  channel AS canal,\n  count(*) AS pedidos,\n  count(pagado_at) AS pagados,\n  count(entregado_at) AS entregados,\n  round(100.0 * count(pagado_at) / count(*), 2) AS pct_pago,\n  round(100.0 * count(entregado_at) / nullif(count(pagado_at), 0), 2) AS pct_entrega_sobre_pago\nFROM hitos\nGROUP BY channel\nORDER BY canal;",
    alternative_solutions: [
      {
        label: "FILTER en todos los conteos",
        sql: "WITH hitos AS (SELECT o.id AS order_id, o.channel, min(pay.paid_at) AS pagado_at, min(shp.delivered_at) AS entregado_at FROM orders AS o LEFT JOIN payments AS pay ON pay.order_id = o.id AND pay.status IN ('approved', 'refunded') LEFT JOIN shipments AS shp ON shp.order_id = o.id GROUP BY o.id, o.channel) SELECT channel AS canal, count(*) AS pedidos, count(*) FILTER (WHERE pagado_at IS NOT NULL) AS pagados, count(*) FILTER (WHERE entregado_at IS NOT NULL) AS entregados, round(100.0 * count(*) FILTER (WHERE pagado_at IS NOT NULL) / count(*), 2) AS pct_pago, round(100.0 * count(*) FILTER (WHERE entregado_at IS NOT NULL) / nullif(count(*) FILTER (WHERE pagado_at IS NOT NULL), 0), 2) AS pct_entrega_sobre_pago FROM hitos GROUP BY channel ORDER BY canal;",
      },
      {
        label: "Conteos en una CTE y tasas afuera",
        sql: "WITH hitos AS (SELECT o.id AS order_id, o.channel, min(pay.paid_at) AS pagado_at, min(shp.delivered_at) AS entregado_at FROM orders AS o LEFT JOIN payments AS pay ON pay.order_id = o.id AND pay.status IN ('approved', 'refunded') LEFT JOIN shipments AS shp ON shp.order_id = o.id GROUP BY o.id, o.channel), conteos AS (SELECT channel AS canal, count(*) AS pedidos, count(pagado_at) AS pagados, count(entregado_at) AS entregados FROM hitos GROUP BY channel) SELECT canal, pedidos, pagados, entregados, round(100.0 * pagados / pedidos, 2) AS pct_pago, round(100.0 * entregados / nullif(pagados, 0), 2) AS pct_entrega_sobre_pago FROM conteos ORDER BY canal;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Es el mismo patrón de tabla de hitos del ejercicio anterior, pero ahora la CTE arrastra además el canal, y en vez de una fila por paso quieres una fila por canal con los pasos como columnas.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "En la CTE agrupa por `o.id, o.channel`. Afuera, agrupa por canal: `count(*)` da la base, `count(pagado_at)` y `count(entregado_at)` cuentan los no nulos. Protege el denominador de la última tasa con `nullif(..., 0)` para no dividir por cero si algún canal no tuviera pagos.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nWITH hitos AS (\n  SELECT o.id AS order_id, o.channel,\n         ___(pay.paid_at) AS pagado_at,\n         ___(shp.delivered_at) AS entregado_at\n  FROM orders AS o\n  ___ JOIN payments AS pay ON pay.order_id = o.id AND pay.status IN (___, ___)\n  ___ JOIN shipments AS shp ON shp.order_id = o.id\n  GROUP BY o.id, ___\n)\nSELECT\n  channel AS canal,\n  count(___) AS pedidos,\n  count(___) AS pagados,\n  count(___) AS entregados,\n  round(___ * count(pagado_at) / count(*), 2) AS pct_pago,\n  round(___ * count(entregado_at) / ___(count(pagado_at), 0), 2) AS pct_entrega_sobre_pago\nFROM hitos\nGROUP BY ___\nORDER BY canal;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "aggregation_level",
        description_md:
          "Agrupar por canal directamente sobre el join sin la CTE: un pedido con dos pagos o dos envíos se cuenta dos veces y `pedidos` deja de ser el número de pedidos.",
      },
      {
        category: "null_handling",
        description_md:
          "Calcular `pct_entrega_sobre_pago` dividiendo por `count(*)` en vez de por `count(pagado_at)`: eso da la conversión desde el inicio, no la del paso, y mezcla dos tasas en una sola columna.",
      },
      {
        category: "join_condition",
        description_md:
          "Unir `shipments` por `order_id` sin `LEFT`: los canales quedan bien ordenados pero `pedidos` pasa a contar solo los pedidos con envío.",
      },
      {
        category: "cell_values",
        description_md:
          "Dividir enteros sin `100.0`: las dos columnas de porcentaje salen 0 en todas las filas.",
      },
    ],
    expert_explanation_md:
      "Tres filas. `app`: 9978 pedidos, 86.64 % de pago y 90.11 % de entrega sobre pago. `marketplace_partner`: 1210, 87.60 % y 88.58 %. `web`: 6812, 87.07 % y 90.41 %.\n\nLa conclusión honesta es que la sospecha de Producto no se sostiene: la app convierte a pago 0.43 puntos por debajo de la web, una diferencia que sobre 9978 pedidos son unas 43 órdenes. No es un problema de checkout; es ruido. Reportarlo así, con el tamaño del efecto y no solo con el signo, es parte del trabajo.\n\nDos notas técnicas. `count(columna)` ignora los NULL: es la forma más corta de contar un hito alcanzado, y equivale a `count(*) FILTER (WHERE columna IS NOT NULL)`. Elige la que se lea mejor en tu equipo; la versión con `FILTER` es más explícita y se extiende a condiciones que no son «no nulo».\n\n`nullif(count(pagado_at), 0)` convierte un denominador cero en NULL, de modo que la tasa sale NULL en vez de cortar la consulta con el error *division by zero*. En este dataset ningún canal tiene cero pagos, pero la consulta seguirá funcionando el día que aparezca un canal nuevo sin ventas todavía. Esa es la diferencia entre una consulta que anda hoy y una que puede quedar programada en un tablero.",
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
    slug: "funnel-punto-de-abandono",
    section,
    title: "Dónde se cae cada pedido",
    difficulty: "advanced",
    estimated_minutes: 13,
    concepts: ["cte", "case", "aggregate", "group_by", "window_function", "order_by"],
    dataset: pidelo,
    tables_used: ["order_events"],
    scenario_md:
      "Con el funnel sobre la mesa, la gerente de Operaciones de **Pídelo** hace la pregunta que realmente importa: «de los pedidos que no se entregan, ¿en qué punto exacto se quedan?». Quiere una tabla donde cada pedido aparezca una sola vez, clasificado por el último paso que alcanzó.",
    business_question_md:
      "A partir de `order_events`, clasifica cada pedido por el **número del paso más alto** que alcanzó (1 `placed`, 2 `accepted`, 3 `preparing`, 4 `picked_up`, 5 `delivered`; `cancelled` no avanza el funnel). Devuelve `ultimo_paso`, `ultima_etapa` (el nombre del evento correspondiente a ese paso), `pedidos` (cantidad de pedidos cuyo último paso es ese) y `pct_del_total` (porcentaje sobre el total de pedidos, 2 decimales). Ordena por `ultimo_paso` ascendente.",
    learning_objective:
      "Clasificar cada unidad por el último paso alcanzado para obtener categorías excluyentes que suman el total.",
    theory_ref: abandono,
    expected_columns: [
      { name: "ultimo_paso", type: "integer" },
      { name: "ultima_etapa", type: "text" },
      { name: "pedidos", type: "integer" },
      { name: "pct_del_total", type: "numeric" },
    ],
    validation_rules: {
      order_matters: true,
      numeric_tolerance: 0.001,
      required_concepts: ["cte", "case", "window_function"],
    },
    reference_solution:
      "WITH avance AS (\n  SELECT\n    order_id,\n    max(CASE event\n      WHEN 'placed' THEN 1\n      WHEN 'accepted' THEN 2\n      WHEN 'preparing' THEN 3\n      WHEN 'picked_up' THEN 4\n      WHEN 'delivered' THEN 5\n      ELSE 0\n    END) AS ultimo_paso\n  FROM order_events\n  GROUP BY order_id\n)\nSELECT\n  ultimo_paso,\n  CASE ultimo_paso\n    WHEN 1 THEN 'placed'\n    WHEN 2 THEN 'accepted'\n    WHEN 3 THEN 'preparing'\n    WHEN 4 THEN 'picked_up'\n    WHEN 5 THEN 'delivered'\n  END AS ultima_etapa,\n  count(*) AS pedidos,\n  round(100.0 * count(*) / sum(count(*)) OVER (), 2) AS pct_del_total\nFROM avance\nGROUP BY 1, 2\nORDER BY ultimo_paso;",
    alternative_solutions: [
      {
        label: "El total en una CTE aparte",
        sql: "WITH avance AS (SELECT order_id, max(CASE event WHEN 'placed' THEN 1 WHEN 'accepted' THEN 2 WHEN 'preparing' THEN 3 WHEN 'picked_up' THEN 4 WHEN 'delivered' THEN 5 ELSE 0 END) AS ultimo_paso FROM order_events GROUP BY order_id), total AS (SELECT count(*) AS n FROM avance) SELECT a.ultimo_paso, CASE a.ultimo_paso WHEN 1 THEN 'placed' WHEN 2 THEN 'accepted' WHEN 3 THEN 'preparing' WHEN 4 THEN 'picked_up' WHEN 5 THEN 'delivered' END AS ultima_etapa, count(*) AS pedidos, round(100.0 * count(*) / (SELECT n FROM total), 2) AS pct_del_total FROM avance AS a GROUP BY 1, 2 ORDER BY a.ultimo_paso;",
      },
      {
        label: "El nombre de la etapa se resuelve en la CTE",
        sql: "WITH avance AS (SELECT order_id, max(CASE event WHEN 'placed' THEN 1 WHEN 'accepted' THEN 2 WHEN 'preparing' THEN 3 WHEN 'picked_up' THEN 4 WHEN 'delivered' THEN 5 ELSE 0 END) AS paso FROM order_events GROUP BY order_id), etiquetado AS (SELECT order_id, paso AS ultimo_paso, CASE paso WHEN 1 THEN 'placed' WHEN 2 THEN 'accepted' WHEN 3 THEN 'preparing' WHEN 4 THEN 'picked_up' WHEN 5 THEN 'delivered' END AS ultima_etapa FROM avance) SELECT ultimo_paso, ultima_etapa, count(*) AS pedidos, round(100.0 * count(*) / sum(count(*)) OVER (), 2) AS pct_del_total FROM etiquetado GROUP BY ultimo_paso, ultima_etapa ORDER BY ultimo_paso;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "No restes pasos consecutivos: eso dice cuántos se cayeron entre dos pasos, pero no clasifica a cada pedido. Necesitas, para cada pedido, un solo número: el paso más alto que alcanzó. Después agrupas por ese número.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "En una CTE, traduce cada evento a su número con `CASE` y quédate con el `max()` por `order_id` (usa `ELSE 0` para que `cancelled` no avance). Afuera, `count(*)` por paso. Para el porcentaje sobre el total, `sum(count(*)) OVER ()` te da el gran total sin una segunda consulta.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nWITH avance AS (\n  SELECT\n    order_id,\n    ___(CASE event\n      WHEN 'placed' THEN 1\n      -- ... el resto de los eventos\n      ELSE ___\n    END) AS ultimo_paso\n  FROM order_events\n  GROUP BY ___\n)\nSELECT\n  ultimo_paso,\n  CASE ultimo_paso WHEN 1 THEN 'placed' /* ... */ END AS ultima_etapa,\n  count(*) AS pedidos,\n  round(100.0 * count(*) / ___(count(*)) ___ (), 2) AS pct_del_total\nFROM avance\nGROUP BY 1, 2\nORDER BY ultimo_paso;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "aggregation_level",
        description_md:
          "Agrupar por `event` en vez de por pedido: vuelves al funnel acumulado, donde un pedido entregado aparece en los cinco pasos y las filas ya no suman el total.",
      },
      {
        category: "cell_values",
        description_md:
          "Omitir el `ELSE 0`: sin él, un pedido que solo tiene `placed` y `cancelled` recibe NULL en el `CASE` del evento cancelado, y aunque `max()` ignora los NULL, la intención deja de estar escrita y el próximo evento nuevo del catálogo rompe el cálculo en silencio.",
      },
      {
        category: "cell_values",
        description_md:
          "Dividir por `count(*)` dentro del mismo `GROUP BY` para el porcentaje: eso da 100 en todas las filas, porque `count(*)` ahí es el conteo del grupo, no el total.",
      },
      {
        category: "wrong_order",
        description_md:
          "Ordenar por `pedidos` descendente: se ve primero el paso 5 y se pierde la lectura del embudo de arriba abajo.",
      },
    ],
    expert_explanation_md:
      "Cinco filas que suman 14 437, el total de pedidos: 594 se quedan en `placed` (4.11 %), 270 en `accepted` (1.87 %), 139 en `preparing` (0.96 %), 150 en `picked_up` (1.04 %) y 13 284 llegan a `delivered` (92.01 %).\n\nEsta tabla y el funnel del primer ejercicio se leen distinto y conviene no confundirlas. En el funnel, un pedido entregado aparece en las cinco filas; aquí aparece en una sola. Por eso esta versión es la que responde «¿dónde priorizo?»: las categorías son excluyentes y los porcentajes suman 100.\n\nEl dato accionable es que dos de cada tres pedidos perdidos se caen en el primer salto, antes de que el restaurante acepte. Cualquier mejora en aceptación vale más que cualquier mejora en el reparto.\n\n`sum(count(*)) OVER ()` merece una lectura lenta: `count(*)` se evalúa primero, en el `GROUP BY`, y produce una fila por paso; la ventana, que se ejecuta después de la agregación, suma esas cinco filas. Es un agregado sobre agregados en un solo nivel. La alternativa con la CTE `total` hace lo mismo con una lectura extra de la tabla y a cambio es más fácil de explicar en una revisión de código.",
    improvement_feedback: [
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
    slug: "funnel-activacion-orden-estricto",
    section,
    title: "Activación en Ritmo: dos funnels honestos",
    difficulty: "expert",
    estimated_minutes: 20,
    concepts: [
      "cte",
      "outer_join",
      "conditional_aggregation",
      "aggregate",
      "set_operations",
      "date_functions",
      "null_handling",
    ],
    dataset: ritmo,
    tables_used: ["users", "plays", "playlists", "subscriptions"],
    scenario_md:
      "Marketing de **Ritmo** quiere lanzar una campaña que empuje a los oyentes a armar su primera playlist, con la hipótesis de que armar una playlist lleva a suscribirse. Antes de invertir, te piden medir el camino de activación. Tú sabes que hay dos maneras de contarlo y que dan números muy distintos, así que decides entregar las dos en la misma tabla.",
    business_question_md:
      "Construye el funnel de activación con cuatro pasos: 1 `alta` (todos los usuarios), 2 `primera escucha`, 3 `primera playlist`, 4 `primera suscripcion`. Devuelve `paso`, `etapa` y dos conteos: `usuarios_cualquier_orden` (usuarios que tienen ese hito, sin importar cuándo) y `usuarios_orden_estricto` (usuarios que tienen ese hito y todos los anteriores, cada uno **posterior** al anterior). Usa siempre el **primer** hito de cada tipo (`min`) y compara en UTC; como `subscriptions.started_on` es una fecha, cuenta la suscripción como posterior a la playlist cuando ocurrió el mismo día o después. Ordena por `paso` ascendente.",
    learning_objective:
      "Implementar y contrastar el funnel de cualquier orden y el funnel de orden estricto sobre la misma tabla de hitos.",
    theory_ref: orden,
    expected_columns: [
      { name: "paso", type: "integer" },
      { name: "etapa", type: "text" },
      { name: "usuarios_cualquier_orden", type: "integer" },
      { name: "usuarios_orden_estricto", type: "integer" },
    ],
    validation_rules: {
      order_matters: true,
      required_concepts: ["cte", "outer_join", "set_operations"],
    },
    reference_solution:
      "WITH escuchas AS (\n  SELECT user_id, min(played_at) AS primera_escucha_at\n  FROM plays\n  GROUP BY user_id\n), listas AS (\n  SELECT user_id, min(created_at) AS primera_playlist_at\n  FROM playlists\n  GROUP BY user_id\n), subs AS (\n  SELECT user_id, min(started_on) AS primera_suscripcion_on\n  FROM subscriptions\n  GROUP BY user_id\n), hitos AS (\n  SELECT\n    u.id AS user_id,\n    u.signup_at,\n    e.primera_escucha_at,\n    l.primera_playlist_at,\n    s.primera_suscripcion_on\n  FROM users AS u\n  LEFT JOIN escuchas AS e ON e.user_id = u.id\n  LEFT JOIN listas AS l ON l.user_id = u.id\n  LEFT JOIN subs AS s ON s.user_id = u.id\n)\nSELECT 1 AS paso, 'alta' AS etapa, count(*) AS usuarios_cualquier_orden, count(*) AS usuarios_orden_estricto\nFROM hitos\nUNION ALL\nSELECT 2, 'primera escucha', count(primera_escucha_at),\n  count(*) FILTER (WHERE primera_escucha_at > signup_at)\nFROM hitos\nUNION ALL\nSELECT 3, 'primera playlist', count(primera_playlist_at),\n  count(*) FILTER (\n    WHERE primera_escucha_at > signup_at\n      AND primera_playlist_at > primera_escucha_at\n  )\nFROM hitos\nUNION ALL\nSELECT 4, 'primera suscripcion', count(primera_suscripcion_on),\n  count(*) FILTER (\n    WHERE primera_escucha_at > signup_at\n      AND primera_playlist_at > primera_escucha_at\n      AND primera_suscripcion_on >= (primera_playlist_at AT TIME ZONE 'UTC')::date\n  )\nFROM hitos\nORDER BY paso;",
    alternative_solutions: [
      {
        label: "Hitos con subconsultas escalares",
        sql: "WITH hitos AS (SELECT u.id AS user_id, u.signup_at, (SELECT min(p.played_at) FROM plays AS p WHERE p.user_id = u.id) AS primera_escucha_at, (SELECT min(pl.created_at) FROM playlists AS pl WHERE pl.user_id = u.id) AS primera_playlist_at, (SELECT min(s.started_on) FROM subscriptions AS s WHERE s.user_id = u.id) AS primera_suscripcion_on FROM users AS u) SELECT 1 AS paso, 'alta' AS etapa, count(*) AS usuarios_cualquier_orden, count(*) AS usuarios_orden_estricto FROM hitos UNION ALL SELECT 2, 'primera escucha', count(primera_escucha_at), count(*) FILTER (WHERE primera_escucha_at > signup_at) FROM hitos UNION ALL SELECT 3, 'primera playlist', count(primera_playlist_at), count(*) FILTER (WHERE primera_escucha_at > signup_at AND primera_playlist_at > primera_escucha_at) FROM hitos UNION ALL SELECT 4, 'primera suscripcion', count(primera_suscripcion_on), count(*) FILTER (WHERE primera_escucha_at > signup_at AND primera_playlist_at > primera_escucha_at AND primera_suscripcion_on >= (primera_playlist_at AT TIME ZONE 'UTC')::date) FROM hitos ORDER BY paso;",
      },
      {
        label: "Marca de paso estricto precalculada con CASE",
        sql: "WITH escuchas AS (SELECT user_id, min(played_at) AS primera_escucha_at FROM plays GROUP BY user_id), listas AS (SELECT user_id, min(created_at) AS primera_playlist_at FROM playlists GROUP BY user_id), subs AS (SELECT user_id, min(started_on) AS primera_suscripcion_on FROM subscriptions GROUP BY user_id), hitos AS (SELECT u.id AS user_id, u.signup_at, e.primera_escucha_at, l.primera_playlist_at, s.primera_suscripcion_on FROM users AS u LEFT JOIN escuchas AS e ON e.user_id = u.id LEFT JOIN listas AS l ON l.user_id = u.id LEFT JOIN subs AS s ON s.user_id = u.id), marcas AS (SELECT primera_escucha_at, primera_playlist_at, primera_suscripcion_on, (primera_escucha_at > signup_at) AS e2, (primera_escucha_at > signup_at AND primera_playlist_at > primera_escucha_at) AS e3, (primera_escucha_at > signup_at AND primera_playlist_at > primera_escucha_at AND primera_suscripcion_on >= (primera_playlist_at AT TIME ZONE 'UTC')::date) AS e4 FROM hitos) SELECT 1 AS paso, 'alta' AS etapa, count(*) AS usuarios_cualquier_orden, count(*) AS usuarios_orden_estricto FROM marcas UNION ALL SELECT 2, 'primera escucha', count(primera_escucha_at), count(*) FILTER (WHERE e2) FROM marcas UNION ALL SELECT 3, 'primera playlist', count(primera_playlist_at), count(*) FILTER (WHERE e3) FROM marcas UNION ALL SELECT 4, 'primera suscripcion', count(primera_suscripcion_on), count(*) FILTER (WHERE e4) FROM marcas ORDER BY paso;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Los dos funnels salen de la misma tabla de hitos: una fila por usuario con el instante del primer evento de cada tipo. La columna «cualquier orden» cuenta hitos no nulos; la columna «orden estricto» cuenta filas que además cumplen una condición sobre esas mismas marcas de tiempo.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Arma la tabla de hitos con tres CTE (`min()` por `user_id` sobre `plays`, `playlists` y `subscriptions`) unidas a `users` con `LEFT JOIN`. Después, una fila por paso con `UNION ALL`. La columna estricta usa `count(*) FILTER (WHERE ...)` con la condición **encadenada**: el paso 4 exige también las condiciones del 3 y del 2. Para comparar la fecha de la suscripción con la marca de tiempo de la playlist, baja el timestamp con `(primera_playlist_at AT TIME ZONE 'UTC')::date` y usa `>=`.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nWITH escuchas AS (\n  SELECT user_id, ___(played_at) AS primera_escucha_at FROM plays GROUP BY user_id\n), listas AS (\n  -- lo mismo sobre playlists.created_at\n), subs AS (\n  -- lo mismo sobre subscriptions.started_on\n), hitos AS (\n  SELECT u.id, u.signup_at, e.primera_escucha_at, l.primera_playlist_at, s.primera_suscripcion_on\n  FROM users AS u\n  ___ JOIN escuchas AS e ON e.user_id = u.id\n  ___ JOIN listas AS l ON l.user_id = u.id\n  ___ JOIN subs AS s ON s.user_id = u.id\n)\nSELECT 1 AS paso, 'alta' AS etapa, count(*) AS usuarios_cualquier_orden, count(*) AS usuarios_orden_estricto FROM hitos\n___ ___\nSELECT 2, 'primera escucha', count(___), count(*) ___ (WHERE primera_escucha_at ___ signup_at) FROM hitos\n-- ... pasos 3 y 4, encadenando todas las condiciones anteriores\nORDER BY paso;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "date_boundary",
        description_md:
          "Comparar `primera_suscripcion_on > primera_playlist_at` directamente: PostgreSQL convierte la fecha a medianoche en el huso de la sesión. Aquí ese huso es UTC y el resultado coincide, pero la comparación queda atada a la configuración del servidor en lugar de decir qué instante significa la fecha.",
      },
      {
        category: "cell_values",
        description_md:
          "Comprobar solo el paso inmediatamente anterior en cada condición: un usuario que se suscribió después de su playlist pero armó la playlist antes de su primera escucha entraría igual en el paso 4.",
      },
      {
        category: "aggregation_level",
        description_md:
          "Usar `max()` en vez de `min()` para los hitos: se compara la última escucha con la última playlist y el orden medido deja de ser el del camino de activación.",
      },
      {
        category: "join_condition",
        description_md:
          "Unir `users` con `plays`, `playlists` y `subscriptions` en un solo `FROM` sin agregar antes: cada usuario se multiplica por sus reproducciones y `count(*)` del paso 1 devuelve cientos de miles.",
      },
    ],
    expert_explanation_md:
      "Cuatro filas. Cualquier orden: 5000, 4768, 2010, 1225. Orden estricto: 5000, 4768, 2010, **135**.\n\nLos tres primeros pasos coinciden, y eso no es casualidad: en Ritmo nadie escucha antes de darse de alta ni arma una playlist antes de escuchar. La divergencia aparece entera en el último paso. De los 1225 usuarios que tienen playlist y suscripción, solo 135 se suscribieron **después** de armarla; los otros 1090 ya eran suscriptores cuando crearon su primera lista.\n\nLa consecuencia para Marketing es directa: la hipótesis de la campaña no está respaldada. Si entregaras solo la columna de cualquier orden, el informe diría «el 61 % de quienes arman playlist se suscriben» y la campaña se lanzaría sobre una lectura invertida de la causalidad. Esta es la razón por la que un funnel siempre debe declarar cuál de las dos definiciones usa.\n\nSobre la implementación: la condición estricta se encadena a propósito. Cada paso repite las condiciones de todos los anteriores porque un funnel secuencial exige el camino completo, no solo el último salto. Escribirlo así queda largo y repetitivo; la alternativa con las marcas `e2`, `e3`, `e4` precalculadas evita repetir texto y se lee mejor cuando los pasos son muchos.\n\nY el detalle de tipos: `subscriptions.started_on` es `date`, `playlists.created_at` es `timestamptz`. Bajar el timestamp a fecha con `AT TIME ZONE 'UTC'` deja la comparación del lado de la fecha y hace el resultado independiente del huso de quien ejecuta. Con `>=` en vez de `>`, suscribirse el mismo día cuenta como después, que es lo que pide el negocio cuando un lado del dato solo tiene granularidad de día.",
    improvement_feedback: [
      { condition: "no_table_alias_in_join", message_key: "improve.no_table_alias_in_join" },
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
    slug: "funnel-tiempo-hasta-convertir-por-ciudad",
    section,
    title: "Cuánto tarda el pedido en avanzar, por ciudad",
    difficulty: "expert",
    estimated_minutes: 18,
    concepts: [
      "cte",
      "conditional_aggregation",
      "inner_join",
      "aggregate",
      "group_by",
      "date_functions",
      "numeric_functions",
    ],
    dataset: pidelo,
    tables_used: ["order_events", "orders", "restaurants", "cities"],
    scenario_md:
      "El funnel de **Pídelo** convierte bien, pero Operaciones sospecha que en algunas ciudades el pedido tarda demasiado en avanzar. Te piden los tiempos entre pasos por ciudad del restaurante, con una advertencia explícita: no quieren un promedio de la entrega, porque un par de pedidos trabados les distorsionó el último informe.",
    business_question_md:
      "Usando `order_events`, arma una fila por pedido con el primer `placed_at`, `accepted_at` y `delivered_at`. Las tres son marcas de tiempo con huso, así que las diferencias entre ellas no dependen de la zona horaria de la sesión. Quédate solo con los pedidos que llegaron a entregarse y agrúpalos por la ciudad del restaurante. Devuelve `ciudad` (`cities.name`), `pedidos_entregados`, `min_prom_aceptacion` (promedio de minutos entre `placed` y `accepted`, 2 decimales) y `min_mediana_entrega` (mediana de minutos entre `placed` y `delivered`, 2 decimales). Ordena por `min_mediana_entrega` descendente y, ante empate, por `ciudad` ascendente.",
    learning_objective:
      "Medir el tiempo entre pasos de un funnel y resumirlo con promedio y mediana según lo que pide el negocio.",
    theory_ref: abandono,
    expected_columns: [
      { name: "ciudad", type: "text" },
      { name: "pedidos_entregados", type: "integer" },
      { name: "min_prom_aceptacion", type: "numeric" },
      { name: "min_mediana_entrega", type: "numeric" },
    ],
    validation_rules: {
      order_matters: true,
      numeric_tolerance: 0.001,
      required_concepts: ["cte", "inner_join", "group_by"],
    },
    reference_solution:
      "WITH hitos AS (\n  SELECT\n    oe.order_id,\n    min(oe.event_at) FILTER (WHERE oe.event = 'placed') AS placed_at,\n    min(oe.event_at) FILTER (WHERE oe.event = 'accepted') AS accepted_at,\n    min(oe.event_at) FILTER (WHERE oe.event = 'delivered') AS delivered_at\n  FROM order_events AS oe\n  GROUP BY oe.order_id\n)\nSELECT\n  c.name AS ciudad,\n  count(*) AS pedidos_entregados,\n  round(avg(extract(epoch FROM h.accepted_at - h.placed_at) / 60), 2) AS min_prom_aceptacion,\n  round(\n    percentile_cont(0.5) WITHIN GROUP (\n      ORDER BY extract(epoch FROM h.delivered_at - h.placed_at) / 60\n    )::numeric,\n    2\n  ) AS min_mediana_entrega\nFROM hitos AS h\nINNER JOIN orders AS o ON o.id = h.order_id\nINNER JOIN restaurants AS r ON r.id = o.restaurant_id\nINNER JOIN cities AS c ON c.id = r.city_id\nWHERE h.delivered_at IS NOT NULL\nGROUP BY c.name\nORDER BY min_mediana_entrega DESC, ciudad;",
    alternative_solutions: [
      {
        label: "Duraciones precalculadas en una segunda CTE",
        sql: "WITH hitos AS (SELECT oe.order_id, min(oe.event_at) FILTER (WHERE oe.event = 'placed') AS placed_at, min(oe.event_at) FILTER (WHERE oe.event = 'accepted') AS accepted_at, min(oe.event_at) FILTER (WHERE oe.event = 'delivered') AS delivered_at FROM order_events AS oe GROUP BY oe.order_id), duraciones AS (SELECT c.name AS ciudad, extract(epoch FROM h.accepted_at - h.placed_at) / 60 AS min_aceptacion, extract(epoch FROM h.delivered_at - h.placed_at) / 60 AS min_entrega FROM hitos AS h INNER JOIN orders AS o ON o.id = h.order_id INNER JOIN restaurants AS r ON r.id = o.restaurant_id INNER JOIN cities AS c ON c.id = r.city_id WHERE h.delivered_at IS NOT NULL) SELECT ciudad, count(*) AS pedidos_entregados, round(avg(min_aceptacion), 2) AS min_prom_aceptacion, round((percentile_cont(0.5) WITHIN GROUP (ORDER BY min_entrega))::numeric, 2) AS min_mediana_entrega FROM duraciones GROUP BY ciudad ORDER BY min_mediana_entrega DESC, ciudad;",
      },
      {
        label: "Hitos con CASE en lugar de FILTER",
        sql: "WITH hitos AS (SELECT oe.order_id, min(CASE WHEN oe.event = 'placed' THEN oe.event_at END) AS placed_at, min(CASE WHEN oe.event = 'accepted' THEN oe.event_at END) AS accepted_at, min(CASE WHEN oe.event = 'delivered' THEN oe.event_at END) AS delivered_at FROM order_events AS oe GROUP BY oe.order_id) SELECT c.name AS ciudad, count(*) AS pedidos_entregados, round(avg(extract(epoch FROM h.accepted_at - h.placed_at) / 60), 2) AS min_prom_aceptacion, round((percentile_cont(0.5) WITHIN GROUP (ORDER BY extract(epoch FROM h.delivered_at - h.placed_at) / 60))::numeric, 2) AS min_mediana_entrega FROM hitos AS h INNER JOIN orders AS o ON o.id = h.order_id INNER JOIN restaurants AS r ON r.id = o.restaurant_id INNER JOIN cities AS c ON c.id = r.city_id WHERE h.delivered_at IS NOT NULL GROUP BY c.name ORDER BY min_mediana_entrega DESC, ciudad;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Igual que en los funnels anteriores, primero una fila por pedido con las marcas de tiempo de los pasos que te interesan. La diferencia es que ahora no cuentas hitos: los restas. Y la mediana no se calcula con `avg`.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Los hitos salen de `min(oe.event_at) FILTER (WHERE oe.event = '...')` agrupando por `order_id`. La duración en minutos es `extract(epoch FROM fin - inicio) / 60`. La mediana es una agregación ordenada: `percentile_cont(0.5) WITHIN GROUP (ORDER BY <expresión de minutos>)`, que devuelve `double precision` y necesita un `::numeric` antes de `round(..., 2)`. La ciudad llega por `orders.restaurant_id` → `restaurants.city_id` → `cities`.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nWITH hitos AS (\n  SELECT\n    oe.order_id,\n    ___(oe.event_at) FILTER (WHERE oe.event = 'placed') AS placed_at,\n    ___(oe.event_at) FILTER (WHERE oe.event = '___') AS accepted_at,\n    ___(oe.event_at) FILTER (WHERE oe.event = '___') AS delivered_at\n  FROM order_events AS oe\n  GROUP BY ___\n)\nSELECT\n  c.name AS ciudad,\n  count(*) AS pedidos_entregados,\n  round(avg(extract(___ FROM h.accepted_at - h.placed_at) / ___), 2) AS min_prom_aceptacion,\n  round(___(0.5) ___ ___ (ORDER BY extract(epoch FROM h.delivered_at - h.placed_at) / 60)::numeric, 2) AS min_mediana_entrega\nFROM hitos AS h\nINNER JOIN orders AS o ON o.id = h.order_id\nINNER JOIN restaurants AS r ON r.id = o.restaurant_id\nINNER JOIN cities AS c ON c.id = r.city_id\nWHERE h.delivered_at ___ ___ ___\nGROUP BY c.name\nORDER BY min_mediana_entrega DESC, ciudad;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "cell_values",
        description_md:
          "Usar `avg` para la mediana de entrega: el promedio de una duración con cola larga queda por encima de la experiencia típica, que es justo lo que Operaciones pidió evitar.",
      },
      {
        category: "null_handling",
        description_md:
          "No filtrar `delivered_at IS NOT NULL`: `count(*)` pasa a contar también los pedidos cancelados, aunque su duración sea NULL y no entre en el promedio ni en la mediana. Las tres columnas dejan de referirse al mismo conjunto.",
      },
      {
        category: "join_condition",
        description_md:
          "Tomar la ciudad del cliente (`customers.city_id`) en vez de la del restaurante: son tablas distintas y la pregunta habla del restaurante, que es quien controla el tiempo de aceptación.",
      },
      {
        category: "wrong_order",
        description_md:
          "Ordenar solo por `min_mediana_entrega DESC`: tres ciudades empatan en 37.00 minutos y el orden entre ellas queda indefinido, así que el resultado puede cambiar entre ejecuciones.",
      },
    ],
    expert_explanation_md:
      "Ocho filas, una por ciudad. Montevideo encabeza con 40.00 minutos de mediana de entrega, seguida por Bogotá (39.00); Buenos Aires y Santiago cierran con 36.00. El promedio de aceptación es notablemente estable: entre 3.19 y 3.32 minutos en todas las ciudades. Es decir, la diferencia entre ciudades no está en que el restaurante acepte más lento, sino en el reparto.\n\n`min(...) FILTER (WHERE ...)` es agregación condicional aplicada a marcas de tiempo: una sola pasada por `order_events` produce las tres columnas de hitos. La variante con `min(CASE WHEN ... THEN ... END)` es equivalente y necesaria en motores sin `FILTER`.\n\n`extract(epoch FROM intervalo)` devuelve segundos como `numeric`; dividir por 60 da minutos con decimales, que es lo que quieres promediar. Restar las marcas y quedarse con el `interval` también sirve para mostrar, pero no para calcular percentiles cómodamente.\n\n`percentile_cont` es una agregación de conjunto ordenado: el `ORDER BY` va dentro de `WITHIN GROUP` y define la serie sobre la que interpola el percentil. Devuelve `double precision`, por eso el `::numeric` antes de `round(..., 2)`. Con `percentile_cont(0.9)` obtendrías el percentil 90, la forma en que se escriben los compromisos de nivel de servicio.\n\nUna advertencia que corresponde poner en el informe: estos tiempos solo incluyen pedidos entregados, porque los demás no tienen `delivered_at`. Los pedidos que se trabaron —los más lentos— quedan fuera por construcción, así que el número real es algo peor. Publicar la mediana junto con la tasa de entrega del 92.01 % es lo que hace honesta la afirmación.",
    improvement_feedback: [
      { condition: "no_table_alias_in_join", message_key: "improve.no_table_alias_in_join" },
      {
        condition: "missing_alias_on_aggregate",
        message_key: "improve.missing_alias_on_aggregate",
      },
    ],
    reward: defaultReward("expert"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
];
