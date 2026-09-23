import {
  defaultHintMeta,
  defaultReward,
  defaultSolutionUnlock,
  type ExerciseDef,
} from "../schemas/exercise";

const section = "proyectos-finales";
const pidelo = { slug: "pidelo", version: 1 };
const tiendaviva = { slug: "tiendaviva", version: 1 };
const bolsillo = { slug: "bolsillo", version: 1 };
const ritmo = { slug: "ritmo", version: 1 };

const planificar = "proyectos-finales-planificar-antes-de-escribir";
const revisar = "proyectos-finales-revisar-tu-propio-trabajo";
const trabajo = "proyectos-finales-del-curso-al-trabajo";

export const exercises: ExerciseDef[] = [
  // 1 ---------------------------------------------------------------------------------
  {
    slug: "puntualidad-de-entregas-por-ciudad",
    section,
    title: "Proyecto: puntualidad de entregas por ciudad y mes",
    difficulty: "advanced",
    estimated_minutes: 18,
    concepts: [
      "inner_join",
      "group_by",
      "conditional_aggregation",
      "date_functions",
      "aggregate",
      "order_by",
    ],
    dataset: pidelo,
    tables_used: ["orders", "restaurants", "cities"],
    scenario_md:
      "Es tu primera semana en el departamento de Datos de **Pidelo**. La gerencia del departamento de Operaciones abre la reunión con esta frase: «las entregas están llegando tarde y no sabemos dónde». Quieren un informe que puedan mirar todos los meses, no un número suelto.\n\nAntes de escribir nada acuerdas la definición con ellos: un pedido llega **tarde** cuando se entregó estrictamente después del momento prometido, y el momento prometido es `placed_at` más `promised_minutes` minutos. Solo entran los pedidos entregados; los cancelados nunca llegaron a tener una promesa que cumplir.",
    business_question_md:
      "Debes generar un dataset que devuelva una fila por **ciudad del restaurante** y **mes del pedido** (mes de `placed_at` truncado **en UTC**), considerando únicamente los pedidos con `status = 'delivered'`:\n\n- `city`: nombre de la ciudad del restaurante\n- `month`: primer día del mes del pedido, como fecha\n- `delivered_orders`: pedidos entregados en ese mes\n- `late_orders`: de esos, los entregados **estrictamente después** de `placed_at + promised_minutes` minutos\n- `late_pct`: `late_orders` sobre `delivered_orders`, en porcentaje con **dos decimales**\n- `avg_minutes_late`: promedio de minutos de retraso **calculado solo sobre los pedidos tardíos**, con **un decimal**; queda en `NULL` cuando el mes no tuvo ningún pedido tardío\n\nEl retraso de un pedido es la diferencia en minutos entre `delivered_at` y el momento prometido. Ordena por `city` y luego por `month`, ambos ascendentes.",
    learning_objective:
      "Construir un informe operativo de punta a punta: definir una regla de negocio temporal, aplicarla con agregación condicional y presentarla al nivel de detalle que pidió el negocio.",
    theory_ref: planificar,
    expected_columns: [
      { name: "city", type: "text" },
      { name: "month", type: "date" },
      { name: "delivered_orders", type: "integer" },
      { name: "late_orders", type: "integer" },
      { name: "late_pct", type: "numeric" },
      { name: "avg_minutes_late", type: "numeric" },
    ],
    validation_rules: {
      order_matters: true,
      required_concepts: ["inner_join", "group_by", "conditional_aggregation"],
    },
    reference_solution:
      "SELECT\n  ci.name AS city,\n  date_trunc('month', o.placed_at AT TIME ZONE 'UTC')::date AS month,\n  count(*) AS delivered_orders,\n  count(*) FILTER (WHERE o.delivered_at > o.placed_at + o.promised_minutes * interval '1 minute') AS late_orders,\n  round(100.0 * count(*) FILTER (WHERE o.delivered_at > o.placed_at + o.promised_minutes * interval '1 minute') / count(*), 2) AS late_pct,\n  round(avg(extract(epoch FROM (o.delivered_at - o.placed_at)) / 60.0 - o.promised_minutes) FILTER (WHERE o.delivered_at > o.placed_at + o.promised_minutes * interval '1 minute'), 1) AS avg_minutes_late\nFROM orders o\nJOIN restaurants r ON r.id = o.restaurant_id\nJOIN cities ci ON ci.id = r.city_id\nWHERE o.status = 'delivered'\nGROUP BY ci.name, date_trunc('month', o.placed_at AT TIME ZONE 'UTC')::date\nORDER BY city, month;",
    alternative_solutions: [
      {
        label: "La regla de retraso se calcula una sola vez en una CTE",
        sql: "WITH entregados AS (\n  SELECT\n    ci.name AS city,\n    date_trunc('month', o.placed_at AT TIME ZONE 'UTC')::date AS month,\n    o.delivered_at > o.placed_at + o.promised_minutes * interval '1 minute' AS is_late,\n    extract(epoch FROM (o.delivered_at - (o.placed_at + o.promised_minutes * interval '1 minute'))) / 60.0 AS minutes_late\n  FROM orders o\n  JOIN restaurants r ON r.id = o.restaurant_id\n  JOIN cities ci ON ci.id = r.city_id\n  WHERE o.status = 'delivered'\n)\nSELECT\n  city,\n  month,\n  count(*) AS delivered_orders,\n  count(*) FILTER (WHERE is_late) AS late_orders,\n  round(100.0 * count(*) FILTER (WHERE is_late) / count(*), 2) AS late_pct,\n  round(avg(minutes_late) FILTER (WHERE is_late), 1) AS avg_minutes_late\nFROM entregados\nGROUP BY city, month\nORDER BY city, month;",
      },
      {
        label: "Agregación condicional con CASE en lugar de FILTER",
        sql: "SELECT\n  ci.name AS city,\n  date_trunc('month', o.placed_at AT TIME ZONE 'UTC')::date AS month,\n  count(*) AS delivered_orders,\n  sum(CASE WHEN o.delivered_at > o.placed_at + o.promised_minutes * interval '1 minute' THEN 1 ELSE 0 END) AS late_orders,\n  round(100.0 * sum(CASE WHEN o.delivered_at > o.placed_at + o.promised_minutes * interval '1 minute' THEN 1 ELSE 0 END) / count(*), 2) AS late_pct,\n  round(avg(CASE WHEN o.delivered_at > o.placed_at + o.promised_minutes * interval '1 minute'\n                 THEN extract(epoch FROM (o.delivered_at - o.placed_at)) / 60.0 - o.promised_minutes END), 1) AS avg_minutes_late\nFROM orders o\nJOIN restaurants r ON r.id = o.restaurant_id\nJOIN cities ci ON ci.id = r.city_id\nWHERE o.status = 'delivered'\nGROUP BY ci.name, date_trunc('month', o.placed_at AT TIME ZONE 'UTC')::date\nORDER BY city, month;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "El informe tiene un solo nivel de detalle: una fila por ciudad y mes. Todo lo demás son conteos sobre el mismo conjunto de pedidos, así que **no necesitas más de una pasada**: el total y el subconjunto tardío salen de la misma agregación, uno sin condición y otro con condición.\n\nLa ciudad no está en `orders`: llega por el restaurante.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "El camino de tablas es `orders → restaurants → cities`; ninguno de esos saltos multiplica filas porque son muchos a uno.\n\nPara el mes usa `date_trunc('month', o.placed_at AT TIME ZONE 'UTC')::date`; sin el huso, el mes de los pedidos de fin de mes depende de quién ejecute la consulta.\n\nLa condición de retraso es `o.delivered_at > o.placed_at + o.promised_minutes * interval '1 minute'`. Úsala dos veces: en un `count(*) FILTER (...)` para contar tardíos y en un `avg(...) FILTER (...)` para el promedio de minutos, que así ignora automáticamente a los puntuales.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT\n  ci.name AS city,\n  ___ AS month,\n  count(*) AS delivered_orders,\n  count(*) FILTER (WHERE ___) AS late_orders,\n  round(100.0 * ___ / count(*), 2) AS late_pct,\n  round(avg(___) FILTER (WHERE ___), 1) AS avg_minutes_late\nFROM orders o\nJOIN restaurants r ON ___\nJOIN cities ci ON ___\nWHERE o.status = ___\nGROUP BY ci.name, ___\nORDER BY city, month;\n```\n\nEn el hueco del `avg` va la cantidad de minutos de retraso de cada pedido; `extract(epoch FROM (...)) / 60.0` convierte una diferencia de marcas de tiempo a minutos.",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "missing_filter",
        description_md:
          "Calcular el informe sobre todos los pedidos. Los 1153 cancelados no tienen `delivered_at`, así que nunca cuentan como tardíos, pero sí engordan el denominador y bajan artificialmente `late_pct`.",
      },
      {
        category: "date_boundary",
        description_md:
          "Truncar el mes sin `AT TIME ZONE 'UTC'`. Como `placed_at` es `timestamptz`, los pedidos de las últimas horas de cada mes se mueven de grupo según el huso de la sesión y el informe deja de ser reproducible.",
      },
      {
        category: "aggregation_level",
        description_md:
          "Calcular `avg_minutes_late` sobre todos los pedidos entregados en lugar de solo sobre los tardíos. El promedio incluiría retrasos negativos (entregas anticipadas) y el número resultante no es «cuánto nos demoramos cuando llegamos tarde».",
      },
      {
        category: "cell_values",
        description_md:
          "Dividir enteros: `100 * late_orders / delivered_orders` hace división entera y devuelve 0 en casi todas las filas. Multiplica por `100.0` (o castea a `numeric`) antes de dividir.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da **152 filas**: ocho ciudades por diecinueve meses con actividad. Sobre los 13 284 pedidos entregados hay **2884 tardíos (21,7 %)**, y el problema no está concentrado en una ciudad: Montevideo encabeza con 23,46 % y Buenos Aires cierra con 20,45 %. Esa diferencia de tres puntos entre la peor y la mejor ciudad es la conclusión real del análisis: la tardanza es sistémica, no local, así que la respuesta no es cambiar de flota en una ciudad sino revisar cómo se calcula `promised_minutes`.\n\nTres decisiones sostienen la consulta:\n\n1. **Una sola pasada.** El total y el subconjunto tardío salen del mismo `GROUP BY` usando `FILTER`. Escribirlo como dos consultas unidas por un join es más largo, más lento y abre la puerta a que un mes sin tardíos desaparezca del informe.\n2. **El huso fijado.** `date_trunc('month', placed_at AT TIME ZONE 'UTC')` convierte primero a UTC y después trunca. Sin eso, un pedido de las 23:30 del 31 de enero en Ciudad de México cae en enero o en febrero según la zona de la sesión.\n3. **El promedio filtrado.** `avg(...) FILTER (WHERE is_late)` es exactamente «promedio entre los tardíos». En tres de las 152 filas no hubo ningún pedido tardío y la columna queda en `NULL`: eso es correcto y hay que decirlo en la entrega, porque un cero ahí significaría «llegamos tarde con demora cero», que es otra cosa.\n\nSobre alternativas: `FILTER` y `sum(CASE WHEN ... THEN 1 ELSE 0 END)` producen el mismo resultado y el mismo plan; `FILTER` se lee mejor cuando hay varias condiciones distintas en el mismo `SELECT`. Calcular la bandera `is_late` una sola vez en una CTE es la versión más mantenible cuando la definición de «tarde» va a cambiar: se toca en un solo lugar.",
    improvement_feedback: [
      {
        condition: "uses_between_for_timestamps",
        message_key: "improve.uses_between_for_timestamps",
      },
      { condition: "no_table_alias_in_join", message_key: "improve.no_table_alias_in_join" },
    ],
    reward: defaultReward("advanced"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },

  // 2 ---------------------------------------------------------------------------------
  {
    slug: "estado-de-resultados-mensual-tiendaviva",
    section,
    title: "Proyecto: estado de resultados mensual por país",
    difficulty: "advanced",
    estimated_minutes: 20,
    concepts: ["cte", "inner_join", "outer_join", "group_by", "aggregate", "null_handling"],
    dataset: tiendaviva,
    tables_used: ["orders", "customers", "payments", "returns"],
    scenario_md:
      "El departamento de Finanzas de **TiendaViva** arma el cierre mensual a mano y quiere dejar de hacerlo. Te piden el informe base: cuánto dinero entró y cuánto se devolvió, por país y por mes.\n\nEn la reunión de definición quedan dos acuerdos. Primero: un pedido cuenta como **cobrado** cuando tiene un pago en estado `approved` **o** `refunded` — un pedido devuelto se cobró y después se reembolsó, y si filtras solo por `approved` lo pierdes entero. Segundo: el reembolso se imputa **al mes del pedido**, no al mes en que se pidió la devolución, para que cada mes cierre contra sus propias ventas.",
    business_question_md:
      "Debes generar un dataset que devuelva una fila por **país del cliente** y **mes del pedido** (mes de `orders.created_at` truncado **en UTC**), tomando solo los pedidos que tienen un pago con `status` en (`'approved'`, `'refunded'`):\n\n- `country`: país del cliente\n- `currency`: moneda del pedido (cada país opera en una sola moneda; no conviertas nada)\n- `month`: primer día del mes del pedido, como fecha\n- `paid_orders`: cantidad de pedidos cobrados\n- `gross_amount`: suma de `payments.amount` de esos pedidos\n- `refunded_amount`: suma de `returns.refund_amount` de esos mismos pedidos; **0** cuando no hubo devoluciones\n- `net_amount`: `gross_amount` menos `refunded_amount`\n\nOrdena por `country` y luego por `month`, ambos ascendentes.",
    learning_objective:
      "Reconciliar ingresos y devoluciones de dos tablas con distinta cobertura, imputando cada importe al período correcto y sin perder los grupos sin devoluciones.",
    theory_ref: revisar,
    expected_columns: [
      { name: "country", type: "text" },
      { name: "currency", type: "text" },
      { name: "month", type: "date" },
      { name: "paid_orders", type: "integer" },
      { name: "gross_amount", type: "numeric" },
      { name: "refunded_amount", type: "numeric" },
      { name: "net_amount", type: "numeric" },
    ],
    validation_rules: {
      order_matters: true,
      required_concepts: ["group_by", "outer_join"],
    },
    reference_solution:
      "WITH cobrados AS (\n  SELECT\n    o.id,\n    c.country,\n    o.currency,\n    date_trunc('month', o.created_at AT TIME ZONE 'UTC')::date AS month,\n    p.amount\n  FROM orders o\n  JOIN customers c ON c.id = o.customer_id\n  JOIN payments p ON p.order_id = o.id AND p.status IN ('approved', 'refunded')\n)\nSELECT\n  b.country,\n  b.currency,\n  b.month,\n  count(*) AS paid_orders,\n  sum(b.amount) AS gross_amount,\n  coalesce(sum(r.refund_amount), 0) AS refunded_amount,\n  sum(b.amount) - coalesce(sum(r.refund_amount), 0) AS net_amount\nFROM cobrados b\nLEFT JOIN returns r ON r.order_id = b.id\nGROUP BY b.country, b.currency, b.month\nORDER BY b.country, b.month;",
    alternative_solutions: [
      {
        label: "Devoluciones agregadas por pedido antes de unir",
        sql: "WITH cobrados AS (\n  SELECT\n    o.id,\n    c.country,\n    o.currency,\n    date_trunc('month', o.created_at AT TIME ZONE 'UTC')::date AS month,\n    p.amount\n  FROM orders o\n  JOIN customers c ON c.id = o.customer_id\n  JOIN payments p ON p.order_id = o.id AND p.status IN ('approved', 'refunded')\n),\ndevoluciones AS (\n  SELECT order_id, sum(refund_amount) AS refunded\n  FROM returns\n  GROUP BY order_id\n)\nSELECT\n  b.country,\n  b.currency,\n  b.month,\n  count(*) AS paid_orders,\n  sum(b.amount) AS gross_amount,\n  coalesce(sum(d.refunded), 0) AS refunded_amount,\n  sum(b.amount) - coalesce(sum(d.refunded), 0) AS net_amount\nFROM cobrados b\nLEFT JOIN devoluciones d ON d.order_id = b.id\nGROUP BY b.country, b.currency, b.month\nORDER BY b.country, b.month;",
      },
      {
        label: "Reembolso por pedido con una subconsulta escalar",
        sql: "WITH cobrados AS (\n  SELECT\n    o.id,\n    c.country,\n    o.currency,\n    date_trunc('month', o.created_at AT TIME ZONE 'UTC')::date AS month,\n    p.amount,\n    coalesce((SELECT sum(r.refund_amount) FROM returns r WHERE r.order_id = o.id), 0) AS refunded\n  FROM orders o\n  JOIN customers c ON c.id = o.customer_id\n  JOIN payments p ON p.order_id = o.id AND p.status IN ('approved', 'refunded')\n)\nSELECT\n  country,\n  currency,\n  month,\n  count(*) AS paid_orders,\n  sum(amount) AS gross_amount,\n  sum(refunded) AS refunded_amount,\n  sum(amount) - sum(refunded) AS net_amount\nFROM cobrados\nGROUP BY country, currency, month\nORDER BY country, month;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Hay dos universos distintos: los pedidos cobrados (muchos por mes) y las devoluciones (pocas, y solo para algunos de esos pedidos). Si unes las dos tablas con un join interno, los meses sin devoluciones desaparecen del informe.\n\nArma primero el universo de pedidos cobrados y recién después incorpora las devoluciones conservando todo lo que ya tenías.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Una CTE `cobrados` con `orders → customers → payments` (filtrando `p.status IN ('approved','refunded')`) te deja **una fila por pedido cobrado**, con el país, la moneda, el mes en UTC y el importe del pago.\n\nSobre esa CTE, `LEFT JOIN returns r ON r.order_id = b.id` agrega el reembolso sin perder pedidos: hay como máximo una devolución por pedido, así que el join no multiplica filas. Los pedidos sin devolución traen `NULL`, y `coalesce(sum(r.refund_amount), 0)` lo convierte en 0.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nWITH cobrados AS (\n  SELECT o.id, c.country, o.currency,\n         ___ AS month,\n         p.amount\n  FROM orders o\n  JOIN customers c ON ___\n  JOIN payments p ON p.order_id = o.id AND ___\n)\nSELECT\n  b.country,\n  b.currency,\n  b.month,\n  count(*) AS paid_orders,\n  ___ AS gross_amount,\n  ___ AS refunded_amount,\n  ___ AS net_amount\nFROM cobrados b\n___ JOIN returns r ON ___\nGROUP BY b.country, b.currency, b.month\nORDER BY ___;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "missing_filter",
        description_md:
          "Filtrar los pagos solo por `status = 'approved'`. Los 1073 pedidos devueltos tienen su pago en `refunded` y quedarían fuera del informe: el bruto baja, las devoluciones no aparecen y el neto queda inflado respecto de la realidad contable.",
      },
      {
        category: "join_condition",
        description_md:
          "Unir `returns` con un `INNER JOIN`. El informe se reduce a los meses que tuvieron alguna devolución y el bruto pasa a ser solo el de los pedidos devueltos.",
      },
      {
        category: "null_handling",
        description_md:
          "Olvidar `coalesce` en la resta: `sum(amount) - sum(refund_amount)` devuelve `NULL` en todos los meses sin devoluciones, porque cualquier operación con `NULL` es `NULL`.",
      },
      {
        category: "date_boundary",
        description_md:
          "Agrupar por el mes de `returns.requested_at` en lugar del mes del pedido. Es una definición posible, pero no la acordada: mezclaría ventas de un mes con devoluciones de otro y ningún mes cerraría contra sus propias ventas.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da **126 filas**: seis países por veintiún meses. Cubre 15 636 pedidos cobrados, 14 563 con pago `approved` y 1073 con pago `refunded`.\n\nEl corazón del ejercicio es esa segunda cifra. Filtrar por `status = 'approved'` es lo que hace casi todo el mundo y deja 1073 pedidos fuera: el 6 % de las ventas cobradas desaparece del estado de resultados junto con **todas** las devoluciones. El síntoma clásico en TiendaViva es que hay más envíos que pagos «aprobados», y la explicación no está en los datos sino en la definición.\n\nLa segunda decisión es la imputación temporal. Una devolución se solicita semanas después del pedido; imputarla al mes del pedido hace que cada mes cierre contra sus propias ventas y que `net_amount` de enero signifique «lo que finalmente quedó de las ventas de enero». La otra convención (imputar al mes de la solicitud) también es válida en contabilidad de caja, pero responde otra pregunta y hay que declarar cuál usaste.\n\nEl `LEFT JOIN` a `returns` es seguro porque hay a lo sumo una devolución por pedido: 1073 filas y 1073 `order_id` distintos. Si esa relación fuera de uno a muchos, el `sum(b.amount)` se multiplicaría y el bruto quedaría inflado; por eso la versión con la CTE `devoluciones` ya agregada por pedido es la más defensiva, y es la que conviene dejar escrita cuando el informe va a sobrevivirte.\n\nÚltimo detalle, no menor: `currency` está en el `SELECT` y en el `GROUP BY` pero no parte ningún grupo, porque cada país opera con una sola moneda. Está ahí para que nadie sume una columna con otra: los 162 millones de diciembre de 2024 son pesos argentinos y los de México son pesos mexicanos.",
    improvement_feedback: [
      {
        condition: "missing_alias_on_aggregate",
        message_key: "improve.missing_alias_on_aggregate",
      },
      { condition: "uses_select_star", message_key: "improve.uses_select_star" },
    ],
    reward: defaultReward("advanced"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },

  // 3 ---------------------------------------------------------------------------------
  {
    slug: "desempeno-de-restaurantes-cdmx",
    section,
    title: "Proyecto: tablero de restaurantes de Ciudad de México",
    difficulty: "expert",
    estimated_minutes: 25,
    concepts: [
      "inner_join",
      "outer_join",
      "group_by",
      "having",
      "conditional_aggregation",
      "aggregate",
      "date_functions",
    ],
    dataset: pidelo,
    tables_used: ["orders", "restaurants", "cities", "ratings"],
    scenario_md:
      "El departamento de Cuentas de **Pidelo** en Ciudad de México prepara la renegociación de comisiones del segundo semestre. Necesita una foto de sus restaurantes con volumen: cuánto facturaron, cuánto dejó Pidelo de comisión, cómo los califican y qué tan puntuales son.\n\nDos aclaraciones que te da el equipo: el informe es **de una sola ciudad** porque los importes están en moneda local y no hay columna de moneda en la tabla, y solo interesan los restaurantes con volumen real, así que se pide un mínimo de pedidos entregados en el período.",
    business_question_md:
      "Debes generar un dataset considerando los pedidos de restaurantes de la ciudad **Ciudad de México**, con `status = 'delivered'` y `placed_at` **en UTC** dentro del primer semestre de 2025 (desde `2025-01-01` inclusive hasta `2025-07-01` exclusive). Devuelve una fila por restaurante que haya entregado **25 pedidos o más** en ese período:\n\n- `restaurant`: nombre del restaurante\n- `cuisine`: tipo de cocina\n- `delivered_orders`: pedidos entregados\n- `gmv`: suma de `orders.total`, con dos decimales\n- `commission_revenue`: suma de `orders.total * commission_pct / 100`, con dos decimales\n- `avg_rating`: promedio de `ratings.restaurant_rating` de esos pedidos, con dos decimales (no todos los pedidos tienen calificación; el promedio se calcula sobre las que existen)\n- `late_pct`: porcentaje de esos pedidos entregados estrictamente después de `placed_at + promised_minutes` minutos, con dos decimales\n\nOrdena por `commission_revenue` descendente y, si hay empate debes desempatar usando `restaurant` ascendente.",
    learning_objective:
      "Combinar métricas de volumen, dinero, calidad percibida y cumplimiento en un mismo tablero, controlando el nivel de agregación y el efecto de los datos faltantes.",
    theory_ref: planificar,
    expected_columns: [
      { name: "restaurant", type: "text" },
      { name: "cuisine", type: "text" },
      { name: "delivered_orders", type: "integer" },
      { name: "gmv", type: "numeric" },
      { name: "commission_revenue", type: "numeric" },
      { name: "avg_rating", type: "numeric" },
      { name: "late_pct", type: "numeric" },
    ],
    validation_rules: {
      order_matters: true,
      required_concepts: ["inner_join", "outer_join", "group_by", "having"],
    },
    reference_solution:
      "SELECT\n  r.name AS restaurant,\n  r.cuisine,\n  count(*) AS delivered_orders,\n  round(sum(o.total), 2) AS gmv,\n  round(sum(o.total * r.commission_pct / 100), 2) AS commission_revenue,\n  round(avg(ra.restaurant_rating), 2) AS avg_rating,\n  round(100.0 * count(*) FILTER (WHERE o.delivered_at > o.placed_at + o.promised_minutes * interval '1 minute') / count(*), 2) AS late_pct\nFROM orders o\nJOIN restaurants r ON r.id = o.restaurant_id\nJOIN cities ci ON ci.id = r.city_id\nLEFT JOIN ratings ra ON ra.order_id = o.id\nWHERE ci.name = 'Ciudad de México'\n  AND o.status = 'delivered'\n  AND o.placed_at AT TIME ZONE 'UTC' >= '2025-01-01'\n  AND o.placed_at AT TIME ZONE 'UTC' < '2025-07-01'\nGROUP BY r.id, r.name, r.cuisine\nHAVING count(*) >= 25\nORDER BY commission_revenue DESC, restaurant;",
    alternative_solutions: [
      {
        label: "Calificaciones resueltas con una subconsulta escalar",
        sql: "SELECT\n  r.name AS restaurant,\n  r.cuisine,\n  count(*) AS delivered_orders,\n  round(sum(o.total), 2) AS gmv,\n  round(sum(o.total * r.commission_pct / 100), 2) AS commission_revenue,\n  round(avg((SELECT ra.restaurant_rating FROM ratings ra WHERE ra.order_id = o.id)), 2) AS avg_rating,\n  round(100.0 * count(*) FILTER (WHERE o.delivered_at > o.placed_at + o.promised_minutes * interval '1 minute') / count(*), 2) AS late_pct\nFROM orders o\nJOIN restaurants r ON r.id = o.restaurant_id\nJOIN cities ci ON ci.id = r.city_id\nWHERE ci.name = 'Ciudad de México'\n  AND o.status = 'delivered'\n  AND o.placed_at AT TIME ZONE 'UTC' >= '2025-01-01'\n  AND o.placed_at AT TIME ZONE 'UTC' < '2025-07-01'\nGROUP BY r.id, r.name, r.cuisine\nHAVING count(*) >= 25\nORDER BY commission_revenue DESC, restaurant;",
      },
      {
        label: "Pedidos del período aislados en una CTE",
        sql: "WITH pedidos AS (\n  SELECT\n    o.id,\n    o.restaurant_id,\n    o.total,\n    o.delivered_at > o.placed_at + o.promised_minutes * interval '1 minute' AS is_late\n  FROM orders o\n  JOIN restaurants r ON r.id = o.restaurant_id\n  JOIN cities ci ON ci.id = r.city_id\n  WHERE ci.name = 'Ciudad de México'\n    AND o.status = 'delivered'\n    AND o.placed_at AT TIME ZONE 'UTC' >= '2025-01-01'\n    AND o.placed_at AT TIME ZONE 'UTC' < '2025-07-01'\n)\nSELECT\n  r.name AS restaurant,\n  r.cuisine,\n  count(*) AS delivered_orders,\n  round(sum(p.total), 2) AS gmv,\n  round(sum(p.total * r.commission_pct / 100), 2) AS commission_revenue,\n  round(avg(ra.restaurant_rating), 2) AS avg_rating,\n  round(100.0 * count(*) FILTER (WHERE p.is_late) / count(*), 2) AS late_pct\nFROM pedidos p\nJOIN restaurants r ON r.id = p.restaurant_id\nLEFT JOIN ratings ra ON ra.order_id = p.id\nGROUP BY r.id, r.name, r.cuisine\nHAVING count(*) >= 25\nORDER BY commission_revenue DESC, restaurant;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "El informe vive al nivel del restaurante, pero todas las métricas se calculan sobre un conjunto de pedidos bien delimitado: una ciudad, un estado y un rango de fechas. Delimita ese conjunto primero y agrégalo después.\n\nOjo con la tabla de calificaciones: no todos los pedidos tienen una, y unirla de la forma equivocada te haría perder pedidos del conteo.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "El camino es `orders → restaurants → cities` para filtrar la ciudad, más un `LEFT JOIN ratings ON ra.order_id = o.id`. Hay como máximo una calificación por pedido, así que ese join no multiplica filas y `count(*)` sigue contando pedidos.\n\n`avg(ra.restaurant_rating)` ignora los `NULL` por sí solo: ese es exactamente el promedio «sobre las calificaciones que existen». El filtro de volumen va en `HAVING count(*) >= 25`, porque se aplica al grupo ya formado. Agrupa por `r.id` además del nombre para no unir dos restaurantes homónimos.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT\n  r.name AS restaurant,\n  r.cuisine,\n  count(*) AS delivered_orders,\n  round(___, 2) AS gmv,\n  round(___, 2) AS commission_revenue,\n  round(___, 2) AS avg_rating,\n  round(100.0 * count(*) FILTER (WHERE ___) / count(*), 2) AS late_pct\nFROM orders o\nJOIN restaurants r ON ___\nJOIN cities ci ON ___\n___ JOIN ratings ra ON ___\nWHERE ci.name = ___\n  AND o.status = 'delivered'\n  AND o.placed_at AT TIME ZONE 'UTC' >= ___\n  AND o.placed_at AT TIME ZONE 'UTC' < ___\nGROUP BY r.id, r.name, r.cuisine\nHAVING ___\nORDER BY commission_revenue DESC, restaurant;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "join_condition",
        description_md:
          "Unir `ratings` con `INNER JOIN`: los pedidos sin calificación desaparecen, `delivered_orders` deja de ser la cantidad de pedidos entregados y varios restaurantes caen por debajo del umbral de 25.",
      },
      {
        category: "date_boundary",
        description_md:
          "Usar `BETWEEN '2025-01-01' AND '2025-06-30'` sobre una marca `timestamptz`: se pierden todos los pedidos posteriores a la medianoche del 30 de junio. El rango correcto es `>= '2025-01-01' AND < '2025-07-01'`, con el huso fijado.",
      },
      {
        category: "aggregation_level",
        description_md:
          "Poner el filtro de volumen en `WHERE count(*) >= 25`. `WHERE` se evalúa antes de agrupar y no puede ver agregados; ese filtro pertenece a `HAVING`.",
      },
      {
        category: "duplicates",
        description_md:
          "Agrupar solo por `r.name`. Si dos restaurantes comparten nombre, sus métricas se suman en una sola fila; agrupar por `r.id` y arrastrar el nombre evita el problema.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da **23 restaurantes**. El primero por comisión es *Casa Mamani 361*, con 28 pedidos entregados, 23 540,41 de GMV y 5178,89 de comisión; el segundo, *Casa Álvarez 310*, factura casi lo mismo con un pedido menos. Esa cercanía es justamente lo que hace útil el informe: la comisión no sigue al volumen, porque `commission_pct` va de 12 % a 22 % según el contrato. *Doña Villanueva 337* entrega 41 pedidos y 32 728,21 de GMV —el mayor del tablero— y aun así queda sexto en comisión.\n\nLa conclusión accionable para el equipo de cuentas es esa: los restaurantes con más volumen y mejor puntualidad (12,20 % de tardíos en *Doña Villanueva 337* contra 25,93 % en *Casa Álvarez 310*) son los que están en el tramo bajo de comisión, y son los que conviene renegociar primero.\n\nTécnicamente hay tres puntos finos:\n\n- **El `LEFT JOIN` a `ratings` no multiplica** porque hay 7353 calificaciones para 7353 pedidos distintos. Verificarlo antes de escribir el informe es el chequeo que separa un número confiable de uno inflado: si hubiera dos calificaciones por pedido, `count(*)`, `sum(total)` y la comisión se duplicarían para esos pedidos.\n- **`avg` ignora los `NULL`.** El promedio de calificación se calcula sobre los pedidos que fueron calificados, no sobre todos los entregados. Es la definición correcta, pero hay que declararla: un restaurante con 28 pedidos y 9 calificaciones tiene un promedio mucho más frágil que uno con 28 de 28.\n- **`HAVING` después de `GROUP BY`.** El umbral de 25 filtra grupos, no filas. Si lo pusieras en `WHERE` el motor devolvería un error; si lo simularas con una subconsulta previa, el resultado sería el mismo pero con el doble de código.\n\nUna limitación honesta para la entrega: el informe mezcla `gmv` en moneda local con porcentajes, y por eso está restringido a una ciudad. Extenderlo a todo Pidelo exige una tabla de tipos de cambio que el esquema no tiene.",
    improvement_feedback: [
      {
        condition: "uses_between_for_timestamps",
        message_key: "improve.uses_between_for_timestamps",
      },
      {
        condition: "missing_alias_on_aggregate",
        message_key: "improve.missing_alias_on_aggregate",
      },
    ],
    reward: defaultReward("expert"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },

  // 4 ---------------------------------------------------------------------------------
  {
    slug: "tablero-de-vendedores-mexico",
    section,
    title: "Proyecto: tablero de vendedores de México",
    difficulty: "expert",
    estimated_minutes: 25,
    concepts: [
      "cte",
      "inner_join",
      "group_by",
      "having",
      "conditional_aggregation",
      "aggregate",
      "null_handling",
    ],
    dataset: tiendaviva,
    tables_used: ["orders", "customers", "payments", "order_items", "products", "sellers"],
    scenario_md:
      "**TiendaViva** va a lanzar un programa de vendedores destacados en México y el equipo comercial necesita la base para elegirlos. El pedido llega así: «dame los vendedores que venden bien y sin problemas de devoluciones».\n\nLo conviertes en definiciones antes de escribir: se cuentan los ítems vendidos en pedidos **cobrados** (pago `approved` o `refunded`) de clientes de **MX** durante el primer semestre de 2025; el importe de un ítem es `quantity * unit_price`; y se considera **devuelto** todo lo vendido dentro de un pedido cuyo `status` es `'returned'`, porque la devolución se registra a nivel de pedido y no de ítem.",
    business_question_md:
      "Debes generar un dataset tomando los ítems de pedidos de clientes cuyo `country` es igual al texto 'MX', con un pago en `status` `'approved'` o `'refunded'`, y con `orders.created_at` **en UTC** desde `2025-01-01` inclusive hasta `2025-07-01` exclusive. Devuelve una fila por vendedor que haya vendido **40 unidades o más** en ese conjunto:\n\n- `store_name`: nombre de la tienda del vendedor\n- `units_sold`: suma de `quantity`\n- `gross_amount`: suma de `quantity * unit_price`\n- `returned_amount`: la parte de `gross_amount` que corresponde a pedidos con `status = 'returned'`; **0** si no tuvo ninguno\n- `returned_pct`: `returned_amount` sobre `gross_amount`, en porcentaje con dos decimales\n\nOrdena por `gross_amount` descendente y, si hay empate debes desempatar usando `store_name` ascendente.",
    learning_objective:
      "Atribuir importes de nivel ítem a la entidad correcta atravesando cinco tablas, manteniendo una métrica condicional que depende del estado del pedido.",
    theory_ref: revisar,
    expected_columns: [
      { name: "store_name", type: "text" },
      { name: "units_sold", type: "integer" },
      { name: "gross_amount", type: "numeric" },
      { name: "returned_amount", type: "numeric" },
      { name: "returned_pct", type: "numeric" },
    ],
    validation_rules: {
      order_matters: true,
      required_concepts: ["inner_join", "group_by", "conditional_aggregation"],
    },
    reference_solution:
      "WITH vendidos AS (\n  SELECT\n    pr.seller_id,\n    oi.quantity,\n    oi.quantity * oi.unit_price AS line_amount,\n    o.status\n  FROM orders o\n  JOIN customers c ON c.id = o.customer_id\n  JOIN payments p ON p.order_id = o.id AND p.status IN ('approved', 'refunded')\n  JOIN order_items oi ON oi.order_id = o.id\n  JOIN products pr ON pr.id = oi.product_id\n  WHERE c.country = 'MX'\n    AND o.created_at AT TIME ZONE 'UTC' >= '2025-01-01'\n    AND o.created_at AT TIME ZONE 'UTC' < '2025-07-01'\n),\nresumen AS (\n  SELECT\n    seller_id,\n    sum(quantity) AS units_sold,\n    sum(line_amount) AS gross_amount,\n    coalesce(sum(line_amount) FILTER (WHERE status = 'returned'), 0) AS returned_amount\n  FROM vendidos\n  GROUP BY seller_id\n)\nSELECT\n  s.store_name,\n  r.units_sold,\n  r.gross_amount,\n  r.returned_amount,\n  round(100.0 * r.returned_amount / r.gross_amount, 2) AS returned_pct\nFROM resumen r\nJOIN sellers s ON s.id = r.seller_id\nWHERE r.units_sold >= 40\nORDER BY r.gross_amount DESC, s.store_name;",
    alternative_solutions: [
      {
        label: "Una sola agregación con HAVING sobre las unidades",
        sql: "SELECT\n  s.store_name,\n  sum(oi.quantity) AS units_sold,\n  sum(oi.quantity * oi.unit_price) AS gross_amount,\n  coalesce(sum(oi.quantity * oi.unit_price) FILTER (WHERE o.status = 'returned'), 0) AS returned_amount,\n  round(100.0 * coalesce(sum(oi.quantity * oi.unit_price) FILTER (WHERE o.status = 'returned'), 0) / sum(oi.quantity * oi.unit_price), 2) AS returned_pct\nFROM orders o\nJOIN customers c ON c.id = o.customer_id\nJOIN payments p ON p.order_id = o.id AND p.status IN ('approved', 'refunded')\nJOIN order_items oi ON oi.order_id = o.id\nJOIN products pr ON pr.id = oi.product_id\nJOIN sellers s ON s.id = pr.seller_id\nWHERE c.country = 'MX'\n  AND o.created_at AT TIME ZONE 'UTC' >= '2025-01-01'\n  AND o.created_at AT TIME ZONE 'UTC' < '2025-07-01'\nGROUP BY s.id, s.store_name\nHAVING sum(oi.quantity) >= 40\nORDER BY gross_amount DESC, store_name;",
      },
      {
        label: "Importe devuelto con CASE en lugar de FILTER",
        sql: "WITH vendidos AS (\n  SELECT\n    pr.seller_id,\n    oi.quantity,\n    oi.quantity * oi.unit_price AS line_amount,\n    CASE WHEN o.status = 'returned' THEN oi.quantity * oi.unit_price ELSE 0 END AS returned_line\n  FROM orders o\n  JOIN customers c ON c.id = o.customer_id\n  JOIN payments p ON p.order_id = o.id AND p.status IN ('approved', 'refunded')\n  JOIN order_items oi ON oi.order_id = o.id\n  JOIN products pr ON pr.id = oi.product_id\n  WHERE c.country = 'MX'\n    AND o.created_at AT TIME ZONE 'UTC' >= '2025-01-01'\n    AND o.created_at AT TIME ZONE 'UTC' < '2025-07-01'\n)\nSELECT\n  s.store_name,\n  sum(v.quantity) AS units_sold,\n  sum(v.line_amount) AS gross_amount,\n  sum(v.returned_line) AS returned_amount,\n  round(100.0 * sum(v.returned_line) / sum(v.line_amount), 2) AS returned_pct\nFROM vendidos v\nJOIN sellers s ON s.id = v.seller_id\nGROUP BY s.id, s.store_name\nHAVING sum(v.quantity) >= 40\nORDER BY gross_amount DESC, store_name;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "El vendedor no aparece en el pedido: aparece en el producto de cada ítem. Así que el informe vive al nivel del **ítem**, aunque el filtro de cliente, de fecha y de cobro vive al nivel del **pedido**.\n\nArma primero un conjunto con una fila por ítem vendido que cumpla todas las condiciones, y recién ahí agrega por vendedor.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "El camino completo es `orders → customers` (para el país), `orders → payments` (para el cobro), `orders → order_items` (para el detalle) y `order_items → products → sellers` (para el vendedor).\n\nEl join a `payments` con `p.status IN ('approved','refunded')` no multiplica filas porque cada pedido tiene a lo sumo un pago en esos estados. El importe devuelto es `sum(quantity * unit_price) FILTER (WHERE o.status = 'returned')`, y necesita `coalesce(..., 0)` porque un vendedor sin devoluciones daría `NULL`.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nWITH vendidos AS (\n  SELECT pr.seller_id, oi.quantity, ___ AS line_amount, o.status\n  FROM orders o\n  JOIN customers c ON ___\n  JOIN payments p ON p.order_id = o.id AND ___\n  JOIN order_items oi ON ___\n  JOIN products pr ON ___\n  WHERE c.country = ___\n    AND ___\n)\nSELECT\n  s.store_name,\n  sum(v.quantity) AS units_sold,\n  ___ AS gross_amount,\n  ___ AS returned_amount,\n  round(___, 2) AS returned_pct\nFROM vendidos v\nJOIN sellers s ON ___\nGROUP BY s.id, s.store_name\nHAVING ___\nORDER BY gross_amount DESC, store_name;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "aggregation_level",
        description_md:
          "Sumar `orders.total_amount` después de unir `order_items`: el total del pedido se repite una vez por ítem y el importe del vendedor queda multiplicado por la cantidad de líneas del pedido. El importe a nivel de ítem es `quantity * unit_price`.",
      },
      {
        category: "missing_filter",
        description_md:
          "Filtrar los pagos solo por `approved`: los pedidos devueltos tienen su pago en `refunded`, así que `returned_amount` daría 0 para todos los vendedores y el programa de destacados se armaría sin mirar devoluciones.",
      },
      {
        category: "null_handling",
        description_md:
          "Dejar `returned_amount` en `NULL` para los vendedores sin devoluciones. Sin `coalesce`, esos vendedores también pierden `returned_pct`, que es justo el dato que el equipo comercial quiere comparar.",
      },
      {
        category: "join_condition",
        description_md:
          "Unir `sellers` por `orders` o saltear `products`: el vendedor de un ítem se obtiene con `order_items.product_id → products.seller_id`. Un pedido puede contener productos de varios vendedores.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da **47 vendedores**. El primero es *Barrio Urbano 171*, con 116 unidades, 727 219,78 MXN vendidos y 10,03 % devuelto; el segundo, *Punto Vintage 52*, vende 141 unidades por 563 376,07 MXN. Más unidades no significa más facturación: el ticket por unidad manda.\n\nLa columna que decide el programa es `returned_pct`, y su dispersión es enorme: *Taller Pampa 20* devuelve 0,28 % y *Nube Urbano 135* devuelve 16,33 % con un volumen parecido. Un programa de destacados que mire solo `gross_amount` premiaría a vendedores cuyo producto vuelve una de cada seis veces.\n\nLo que hace difícil el ejercicio es el **cambio de nivel**. Los filtros son del pedido (país del cliente, fecha, cobro) y las métricas son del ítem. Al unir `order_items`, cada pedido se convierte en tantas filas como líneas tenga: por eso el importe se calcula como `quantity * unit_price` y nunca con `orders.total_amount`, que quedaría repetido. El mismo cuidado vale para el join a `payments`: es seguro porque cada pedido tiene a lo sumo un pago cobrado (14 563 `approved` y 1073 `refunded`, sin solapamiento), y conviene verificarlo antes de confiar en la suma.\n\n`returned_amount` es agregación condicional pura: el estado vive en el pedido y se evalúa fila por fila del ítem. `FILTER` y `CASE ... ELSE 0` dan el mismo número; la diferencia es que `FILTER` devuelve `NULL` cuando ninguna fila cumple la condición y `CASE ... ELSE 0` devuelve 0. Por eso la versión con `FILTER` necesita `coalesce` y la versión con `CASE` no. Elegir una y saber por qué es exactamente el tipo de detalle que se revisa en una entrevista.\n\nUna limitación para declarar en la entrega: el informe supone que un pedido `returned` se devolvió completo, porque la devolución se registra a nivel de pedido. En los datos, `returns.refund_amount` va del 30 % al 100 % del total, así que `returned_amount` es una cota superior del dinero efectivamente reembolsado.",
    improvement_feedback: [
      { condition: "no_table_alias_in_join", message_key: "improve.no_table_alias_in_join" },
      { condition: "uses_select_star", message_key: "improve.uses_select_star" },
    ],
    reward: defaultReward("expert"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },

  // 5 ---------------------------------------------------------------------------------
  {
    slug: "gasto-por-rubro-en-dolares",
    section,
    title: "Proyecto: gasto por rubro convertido a dólares",
    difficulty: "expert",
    estimated_minutes: 28,
    concepts: [
      "cte",
      "inner_join",
      "outer_join",
      "group_by",
      "conditional_aggregation",
      "aggregate",
      "null_handling",
      "date_functions",
    ],
    dataset: bolsillo,
    tables_used: ["transactions", "accounts", "merchants", "fx_rates"],
    scenario_md:
      "**Bolsillo** opera en seis países y el comité quiere, por primera vez, un informe de gasto en comercios comparable entre todos ellos. Eso obliga a convertir a dólares: la tabla `fx_rates` tiene una fila por día y moneda con `usd_rate`, que es **cuántas unidades de moneda local equivalen a un dólar**.\n\nDos cosas que descubres al perfilar los datos y que hay que resolver en la consulta: las cuentas en `USD` no tienen fila en `fx_rates` (su tipo de cambio es 1), y las operaciones revertidas quedan con `status = 'reversed'` mientras que la reversión se registra aparte como una transacción de `kind = 'reversal'`. Contar las revertidas como gasto sería contar dinero que volvió.",
    business_question_md:
      "Debes generar un dataset tomando las transacciones cuyo `kind` está en (`'card_payment'`, `'qr_payment'`), con `status` en (`'completed'`, `'reversed'`) y con `created_at` **en UTC** desde `2025-01-01` inclusive hasta `2025-07-01` exclusive. Convierte cada importe a dólares dividiendo `amount` por el `usd_rate` del **mismo día en UTC** y la misma moneda; si la moneda es `USD` no hay fila de cambio y el importe ya está en dólares.\n\nDevuelve una fila por rubro del comercio (`merchants.category`):\n\n- `category`: rubro\n- `completed_payments`: transacciones con `status = 'completed'`\n- `reversed_payments`: transacciones con `status = 'reversed'`\n- `users`: personas distintas (dueñas de la cuenta) con al menos una transacción `completed` en ese rubro\n- `amount_usd`: suma en dólares de las transacciones `completed`, con dos decimales\n- `avg_ticket_usd`: `amount_usd` dividido por `completed_payments`, con dos decimales\n- `reversed_pct`: `reversed_payments` sobre el total de transacciones del rubro (completadas más revertidas), en porcentaje con dos decimales\n\nOrdena por `amount_usd` descendente.",
    learning_objective:
      "Normalizar importes multimoneda con una tabla de tipos de cambio fechada, resolviendo la moneda sin cotización y separando el gasto efectivo del revertido.",
    theory_ref: planificar,
    expected_columns: [
      { name: "category", type: "text" },
      { name: "completed_payments", type: "integer" },
      { name: "reversed_payments", type: "integer" },
      { name: "users", type: "integer" },
      { name: "amount_usd", type: "numeric" },
      { name: "avg_ticket_usd", type: "numeric" },
      { name: "reversed_pct", type: "numeric" },
    ],
    validation_rules: {
      order_matters: true,
      required_concepts: ["inner_join", "outer_join", "group_by", "conditional_aggregation"],
    },
    reference_solution:
      "WITH pagos AS (\n  SELECT\n    t.status,\n    a.user_id,\n    m.category,\n    t.amount / coalesce(f.usd_rate, 1) AS amount_usd\n  FROM transactions t\n  JOIN accounts a ON a.id = t.account_id\n  JOIN merchants m ON m.id = t.merchant_id\n  LEFT JOIN fx_rates f\n    ON f.currency = t.currency\n   AND f.rate_date = (t.created_at AT TIME ZONE 'UTC')::date\n  WHERE t.kind IN ('card_payment', 'qr_payment')\n    AND t.status IN ('completed', 'reversed')\n    AND t.created_at AT TIME ZONE 'UTC' >= '2025-01-01'\n    AND t.created_at AT TIME ZONE 'UTC' < '2025-07-01'\n)\nSELECT\n  category,\n  count(*) FILTER (WHERE status = 'completed') AS completed_payments,\n  count(*) FILTER (WHERE status = 'reversed') AS reversed_payments,\n  count(DISTINCT user_id) FILTER (WHERE status = 'completed') AS users,\n  round(sum(amount_usd) FILTER (WHERE status = 'completed'), 2) AS amount_usd,\n  round(sum(amount_usd) FILTER (WHERE status = 'completed') / count(*) FILTER (WHERE status = 'completed'), 2) AS avg_ticket_usd,\n  round(100.0 * count(*) FILTER (WHERE status = 'reversed') / count(*), 2) AS reversed_pct\nFROM pagos\nGROUP BY category\nORDER BY amount_usd DESC;",
    alternative_solutions: [
      {
        label: "Conversión resuelta con CASE sobre la moneda",
        sql: "WITH pagos AS (\n  SELECT\n    t.status,\n    a.user_id,\n    m.category,\n    CASE\n      WHEN t.currency = 'USD' THEN t.amount\n      ELSE t.amount / (\n        SELECT f.usd_rate FROM fx_rates f\n        WHERE f.currency = t.currency\n          AND f.rate_date = (t.created_at AT TIME ZONE 'UTC')::date\n      )\n    END AS amount_usd\n  FROM transactions t\n  JOIN accounts a ON a.id = t.account_id\n  JOIN merchants m ON m.id = t.merchant_id\n  WHERE t.kind IN ('card_payment', 'qr_payment')\n    AND t.status IN ('completed', 'reversed')\n    AND t.created_at AT TIME ZONE 'UTC' >= '2025-01-01'\n    AND t.created_at AT TIME ZONE 'UTC' < '2025-07-01'\n)\nSELECT\n  category,\n  count(*) FILTER (WHERE status = 'completed') AS completed_payments,\n  count(*) FILTER (WHERE status = 'reversed') AS reversed_payments,\n  count(DISTINCT user_id) FILTER (WHERE status = 'completed') AS users,\n  round(sum(amount_usd) FILTER (WHERE status = 'completed'), 2) AS amount_usd,\n  round(avg(amount_usd) FILTER (WHERE status = 'completed'), 2) AS avg_ticket_usd,\n  round(100.0 * count(*) FILTER (WHERE status = 'reversed') / count(*), 2) AS reversed_pct\nFROM pagos\nGROUP BY category\nORDER BY amount_usd DESC;",
      },
      {
        label: "Conteos condicionales con CASE",
        sql: "WITH pagos AS (\n  SELECT\n    t.status,\n    a.user_id,\n    m.category,\n    t.amount / coalesce(f.usd_rate, 1) AS amount_usd\n  FROM transactions t\n  JOIN accounts a ON a.id = t.account_id\n  JOIN merchants m ON m.id = t.merchant_id\n  LEFT JOIN fx_rates f\n    ON f.currency = t.currency\n   AND f.rate_date = (t.created_at AT TIME ZONE 'UTC')::date\n  WHERE t.kind IN ('card_payment', 'qr_payment')\n    AND t.status IN ('completed', 'reversed')\n    AND t.created_at AT TIME ZONE 'UTC' >= '2025-01-01'\n    AND t.created_at AT TIME ZONE 'UTC' < '2025-07-01'\n)\nSELECT\n  category,\n  sum(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed_payments,\n  sum(CASE WHEN status = 'reversed' THEN 1 ELSE 0 END) AS reversed_payments,\n  count(DISTINCT CASE WHEN status = 'completed' THEN user_id END) AS users,\n  round(sum(CASE WHEN status = 'completed' THEN amount_usd END), 2) AS amount_usd,\n  round(sum(CASE WHEN status = 'completed' THEN amount_usd END) / sum(CASE WHEN status = 'completed' THEN 1 ELSE 0 END), 2) AS avg_ticket_usd,\n  round(100.0 * sum(CASE WHEN status = 'reversed' THEN 1 ELSE 0 END) / count(*), 2) AS reversed_pct\nFROM pagos\nGROUP BY category\nORDER BY amount_usd DESC;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Separa el problema en dos: primero convertir cada transacción a dólares, después agregar por rubro. Si intentas hacer las dos cosas en una sola consulta plana, la conversión te va a quedar repetida en cada columna.\n\nY piensa qué pasa con una moneda que no tiene cotización en la tabla de cambios: ¿qué tipo de unión necesitas para no perder esas filas?",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "En la CTE, une `transactions → accounts` (para llegar a la persona), `transactions → merchants` (para el rubro) y `LEFT JOIN fx_rates` con **dos condiciones**: misma moneda y `f.rate_date = (t.created_at AT TIME ZONE 'UTC')::date`. Si usaras `INNER JOIN`, las 710 transacciones en `USD` desaparecerían.\n\n`coalesce(f.usd_rate, 1)` resuelve el dólar: dividir por 1 deja el importe como está. En la agregación, cada métrica es un `FILTER` distinto sobre el mismo grupo; `count(DISTINCT user_id) FILTER (...)` cuenta personas, no transacciones.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nWITH pagos AS (\n  SELECT t.status, a.user_id, m.category,\n         t.amount / ___ AS amount_usd\n  FROM transactions t\n  JOIN accounts a ON ___\n  JOIN merchants m ON ___\n  ___ JOIN fx_rates f ON ___ AND ___\n  WHERE t.kind IN (___)\n    AND t.status IN (___)\n    AND ___\n)\nSELECT\n  category,\n  count(*) FILTER (WHERE ___) AS completed_payments,\n  count(*) FILTER (WHERE ___) AS reversed_payments,\n  ___ AS users,\n  round(___, 2) AS amount_usd,\n  round(___, 2) AS avg_ticket_usd,\n  round(100.0 * ___ / count(*), 2) AS reversed_pct\nFROM pagos\nGROUP BY category\nORDER BY amount_usd DESC;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "join_condition",
        description_md:
          "Unir `fx_rates` con `INNER JOIN`: las transacciones en `USD` no tienen cotización y desaparecen del informe, junto con el gasto de las 462 cuentas en dólares.",
      },
      {
        category: "missing_filter",
        description_md:
          "Contar las transacciones `reversed` dentro de `amount_usd`. Ese dinero volvió a la cuenta: sumarlo infla el gasto y además lo duplica, porque la reversión existe como una transacción aparte con `kind = 'reversal'`.",
      },
      {
        category: "date_boundary",
        description_md:
          "Unir la cotización por `t.created_at::date` sin `AT TIME ZONE 'UTC'`: una transacción de las 22:00 puede tomar la cotización del día siguiente o del anterior según el huso de la sesión, y el informe deja de ser reproducible.",
      },
      {
        category: "aggregation_level",
        description_md:
          "Usar `count(DISTINCT account_id)` en lugar de `count(DISTINCT user_id)`: hay 4462 cuentas para 4000 personas, así que quien tiene una cuenta en moneda local y otra en dólares se contaría dos veces.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da **10 rubros**. `servicios` encabeza con 41 179,12 USD en 439 pagos de 277 personas, y `combustible` cierra con 26 613,13 USD. El gasto está bastante repartido, así que la columna que realmente informa una decisión es `reversed_pct`: `restaurante` tiene 4,59 % de operaciones revertidas y `supermercado` 1,51 %, tres veces menos. Con tickets promedio casi idénticos (entre 90,85 y 97,89 USD), esa diferencia no se explica por el monto y merece que el equipo de riesgo mire a los comercios de ese rubro.\n\nLa conversión es el corazón del ejercicio. `usd_rate` está expresado como unidades locales por dólar, así que se **divide**: 100 000 ARS a 1200 son 83,33 USD. Multiplicar es el error que da números veinte mil veces más grandes y que, curiosamente, nadie detecta si no mira el orden de magnitud.\n\nEl `LEFT JOIN` a `fx_rates` con `coalesce(usd_rate, 1)` resuelve las 710 transacciones en dólares sin escribir un caso especial. La alternativa con `CASE WHEN currency = 'USD'` es igual de correcta y quizá más explícita; lo que no es correcto es el `INNER JOIN`, que las borra en silencio. Vale la pena notar que la cotización se busca por **fecha de la transacción**, no por una fecha fija: convertir todo el semestre al tipo de cambio de hoy daría un número distinto y, para monedas volátiles como el peso argentino (de 743 a 1481 por dólar en el período), muy distinto.\n\nSobre las revertidas: `status = 'reversed'` marca la operación original y `kind = 'reversal'` es el asiento que devuelve el dinero. Por eso el filtro de `kind` excluye `'reversal'` y el `FILTER` de importe excluye `'reversed'`: si contaras ambas cosas, el mismo dinero aparecería dos veces con signos que el esquema no tiene.\n\nUn detalle de precisión: `round(sum(...) / count(...), 2)` y `round(avg(...), 2)` dan el mismo número aquí porque el denominador es idéntico. Cuando hay filas con importe `NULL` dejan de coincidir, porque `avg` las ignora y `count(*)` no.",
    improvement_feedback: [
      {
        condition: "uses_between_for_timestamps",
        message_key: "improve.uses_between_for_timestamps",
      },
      {
        condition: "missing_alias_on_aggregate",
        message_key: "improve.missing_alias_on_aggregate",
      },
    ],
    reward: defaultReward("expert"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },

  // 6 ---------------------------------------------------------------------------------
  {
    slug: "panorama-de-transferencias-p2p",
    section,
    title: "Proyecto: panorama de transferencias entre personas",
    difficulty: "expert",
    estimated_minutes: 25,
    concepts: [
      "inner_join",
      "self_join",
      "group_by",
      "conditional_aggregation",
      "aggregate",
      "numeric_functions",
      "date_functions",
    ],
    dataset: bolsillo,
    tables_used: ["transfers", "accounts", "users"],
    scenario_md:
      "El departamento de Producto de **Bolsillo** quiere entender el uso de las transferencias entre personas antes de tocar los límites por operación. Te piden una foto por país de los últimos doce meses cerrados: cuánta gente envía, cuánta recibe, cuánto se mueve y cuánto falla.\n\nDos definiciones que acuerdan contigo: el **país de la transferencia** es el de la persona que envía, y el importe típico se reporta con la **mediana**, no con el promedio, porque unas pocas transferencias grandes distorsionan el promedio y el equipo va a fijar límites con ese número.",
    business_question_md:
      "Debes generar un dataset tomando las transferencias con `created_at` **en la zona horaria UTC** desde `2024-07-01` inclusive hasta `2025-07-01` exclusive. El país sale de la persona dueña de la cuenta de origen (`from_account_id`) y la persona que recibe, de la cuenta de destino (`to_account_id`). Devuelve una fila por país y moneda de la transferencia:\n\n- `country`: país de quien envía\n- `currency`: moneda de la transferencia\n- `completed_transfers`: transferencias con `status = 'completed'`\n- `senders`: personas distintas que enviaron al menos una transferencia completada\n- `receivers`: personas distintas que recibieron al menos una transferencia completada\n- `completed_amount`: suma de los importes completados, con dos decimales\n- `median_amount`: mediana de los importes completados, con dos decimales\n- `failed_pct`: transferencias con `status = 'failed'` sobre **todas** las transferencias del grupo (completadas, fallidas y pendientes), en porcentaje con dos decimales\n\nOrdena por `completed_amount` descendente.",
    learning_objective:
      "Resolver un informe que exige llegar dos veces a la misma tabla por caminos distintos y elegir una medida de posición robusta en lugar del promedio.",
    theory_ref: revisar,
    expected_columns: [
      { name: "country", type: "text" },
      { name: "currency", type: "text" },
      { name: "completed_transfers", type: "integer" },
      { name: "senders", type: "integer" },
      { name: "receivers", type: "integer" },
      { name: "completed_amount", type: "numeric" },
      { name: "median_amount", type: "numeric" },
      { name: "failed_pct", type: "numeric" },
    ],
    validation_rules: {
      order_matters: true,
      required_concepts: ["inner_join", "group_by", "conditional_aggregation"],
    },
    reference_solution:
      "SELECT\n  u.country,\n  tr.currency,\n  count(*) FILTER (WHERE tr.status = 'completed') AS completed_transfers,\n  count(DISTINCT origen.user_id) FILTER (WHERE tr.status = 'completed') AS senders,\n  count(DISTINCT destino.user_id) FILTER (WHERE tr.status = 'completed') AS receivers,\n  round(sum(tr.amount) FILTER (WHERE tr.status = 'completed'), 2) AS completed_amount,\n  round(percentile_cont(0.5) WITHIN GROUP (ORDER BY CASE WHEN tr.status = 'completed' THEN tr.amount END)::numeric, 2) AS median_amount,\n  round(100.0 * count(*) FILTER (WHERE tr.status = 'failed') / count(*), 2) AS failed_pct\nFROM transfers tr\nJOIN accounts origen ON origen.id = tr.from_account_id\nJOIN accounts destino ON destino.id = tr.to_account_id\nJOIN users u ON u.id = origen.user_id\nWHERE tr.created_at AT TIME ZONE 'UTC' >= '2024-07-01'\n  AND tr.created_at AT TIME ZONE 'UTC' < '2025-07-01'\nGROUP BY u.country, tr.currency\nORDER BY completed_amount DESC;",
    alternative_solutions: [
      {
        label: "Transferencias del período preparadas en una CTE",
        sql: "WITH movimientos AS (\n  SELECT\n    u.country,\n    tr.currency,\n    tr.status,\n    tr.amount,\n    origen.user_id AS sender_id,\n    destino.user_id AS receiver_id\n  FROM transfers tr\n  JOIN accounts origen ON origen.id = tr.from_account_id\n  JOIN accounts destino ON destino.id = tr.to_account_id\n  JOIN users u ON u.id = origen.user_id\n  WHERE tr.created_at AT TIME ZONE 'UTC' >= '2024-07-01'\n    AND tr.created_at AT TIME ZONE 'UTC' < '2025-07-01'\n)\nSELECT\n  country,\n  currency,\n  count(*) FILTER (WHERE status = 'completed') AS completed_transfers,\n  count(DISTINCT sender_id) FILTER (WHERE status = 'completed') AS senders,\n  count(DISTINCT receiver_id) FILTER (WHERE status = 'completed') AS receivers,\n  round(sum(amount) FILTER (WHERE status = 'completed'), 2) AS completed_amount,\n  round(percentile_cont(0.5) WITHIN GROUP (ORDER BY CASE WHEN status = 'completed' THEN amount END)::numeric, 2) AS median_amount,\n  round(100.0 * count(*) FILTER (WHERE status = 'failed') / count(*), 2) AS failed_pct\nFROM movimientos\nGROUP BY country, currency\nORDER BY completed_amount DESC;",
      },
      {
        label: "Conteo de fallidas con CASE",
        sql: "SELECT\n  u.country,\n  tr.currency,\n  count(*) FILTER (WHERE tr.status = 'completed') AS completed_transfers,\n  count(DISTINCT CASE WHEN tr.status = 'completed' THEN origen.user_id END) AS senders,\n  count(DISTINCT CASE WHEN tr.status = 'completed' THEN destino.user_id END) AS receivers,\n  round(sum(CASE WHEN tr.status = 'completed' THEN tr.amount END), 2) AS completed_amount,\n  round(percentile_cont(0.5) WITHIN GROUP (ORDER BY CASE WHEN tr.status = 'completed' THEN tr.amount END)::numeric, 2) AS median_amount,\n  round(100.0 * sum(CASE WHEN tr.status = 'failed' THEN 1 ELSE 0 END) / count(*), 2) AS failed_pct\nFROM transfers tr\nJOIN accounts origen ON origen.id = tr.from_account_id\nJOIN accounts destino ON destino.id = tr.to_account_id\nJOIN users u ON u.id = origen.user_id\nWHERE tr.created_at AT TIME ZONE 'UTC' >= '2024-07-01'\n  AND tr.created_at AT TIME ZONE 'UTC' < '2025-07-01'\nGROUP BY u.country, tr.currency\nORDER BY completed_amount DESC;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Cada transferencia toca la tabla de cuentas **dos veces**: una por la cuenta que envía y otra por la que recibe. Necesitas las dos con alias distintos para poder nombrarlas por separado.\n\nY fíjate en los denominadores: no todas las métricas se calculan sobre el mismo subconjunto. Los importes y las personas son de las completadas; la tasa de fallas es sobre todas.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Une `transfers` con `accounts` dos veces (`origen.id = tr.from_account_id` y `destino.id = tr.to_account_id`) y después `users` sobre `origen.user_id` para el país de quien envía.\n\nPara la mediana, `percentile_cont(0.5) WITHIN GROUP (ORDER BY ...)` devuelve `double precision`; castea a `numeric` antes de `round(..., 2)`. Para quedarte solo con las completadas, pon la condición **dentro** del `ORDER BY`: `ORDER BY CASE WHEN tr.status = 'completed' THEN tr.amount END`, porque los `NULL` que genera el `CASE` quedan fuera del cálculo.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT\n  u.country,\n  tr.currency,\n  count(*) FILTER (WHERE ___) AS completed_transfers,\n  count(DISTINCT ___) FILTER (WHERE ___) AS senders,\n  count(DISTINCT ___) FILTER (WHERE ___) AS receivers,\n  round(___, 2) AS completed_amount,\n  round(percentile_cont(0.5) WITHIN GROUP (ORDER BY CASE WHEN ___ THEN ___ END)::numeric, 2) AS median_amount,\n  round(100.0 * ___ / count(*), 2) AS failed_pct\nFROM transfers tr\nJOIN accounts origen ON ___\nJOIN accounts destino ON ___\nJOIN users u ON ___\nWHERE ___\nGROUP BY u.country, tr.currency\nORDER BY completed_amount DESC;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "join_condition",
        description_md:
          "Unir `accounts` una sola vez y usar esa misma fila para origen y destino: `receivers` pasaría a ser igual a `senders` y el informe perdería justamente la asimetría que el equipo quiere ver.",
      },
      {
        category: "aggregation_level",
        description_md:
          "Contar `count(DISTINCT origen.id)` (cuentas) en lugar de `count(DISTINCT origen.user_id)` (personas). Una persona puede tener varias cuentas y quedaría contada más de una vez.",
      },
      {
        category: "missing_filter",
        description_md:
          "Calcular `failed_pct` sobre las completadas más las fallidas, olvidando las pendientes. El denominador acordado son **todas** las transferencias del grupo; excluir las pendientes sube artificialmente la tasa.",
      },
      {
        category: "cell_values",
        description_md:
          "Reportar el promedio en lugar de la mediana. En ARS el promedio de las transferencias completadas es más del doble de la mediana (181 102,50): un límite fijado con el promedio dejaría afuera a la mitad de los usuarios habituales.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da **12 filas**: seis países, cada uno con su moneda local y con dólares. Colombia mueve el mayor volumen nominal (289 828 672,00 COP en 524 transferencias) y Argentina le sigue (161 572 414,50 ARS en 922). Como las monedas no son comparables entre sí, el informe está deliberadamente partido por moneda: la conclusión se lee fila por fila, no sumando la columna.\n\nLo accionable aparece en dos lugares. Primero, la relación entre `senders` y `receivers`: en Perú 83 personas enviaron a 177 receptores distintos, un patrón de pocos emisores frecuentes muy distinto al de Argentina (326 a 360), donde el uso es más simétrico. Segundo, `failed_pct`: las transferencias en dólares de Chile y Uruguay fallan un 11,11 %, frente al 4 %–6,7 % del resto. Con volúmenes chicos (24 y 8 transferencias) eso puede ser ruido, y decirlo es parte del trabajo: no se toma una decisión con nueve casos.\n\nEl doble join a `accounts` es lo que hace este ejercicio distinto de los anteriores. Sin alias no se puede escribir, y con alias confusos (`a1`, `a2`) se vuelve imposible de revisar: `origen` y `destino` cuestan lo mismo y explican la consulta solos.\n\nLa mediana es la otra decisión de fondo. `percentile_cont(0.5) WITHIN GROUP (ORDER BY ...)` interpola entre los dos valores centrales y devuelve `double precision`, por eso hay que convertirlo a `numeric` antes de redondear. Para restringirla a las completadas, la condición va dentro del `ORDER BY` con un `CASE`: este agregado ignora los `NULL`, así que el efecto es el mismo que el de un `FILTER`. Frente a una distribución con cola larga —y las transferencias siempre la tienen— la mediana describe a la persona típica y el promedio describe a nadie. Para fijar un límite por operación, la pregunta correcta es «¿qué monto cubre a la mitad de mis usuarios?», y esa es exactamente la mediana.\n\nUn detalle que conviene verificar antes de confiar en el informe: ninguna transferencia del dataset va entre dos cuentas de la misma persona, así que `senders` y `receivers` son conjuntos genuinamente distintos. Si las hubiera, habría que decidir si esas «auto-transferencias» cuentan como uso P2P.",
    improvement_feedback: [
      { condition: "no_table_alias_in_join", message_key: "improve.no_table_alias_in_join" },
      {
        condition: "uses_between_for_timestamps",
        message_key: "improve.uses_between_for_timestamps",
      },
    ],
    reward: defaultReward("expert"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },

  // 7 ---------------------------------------------------------------------------------
  {
    slug: "informe-final-de-cohortes-ritmo",
    section,
    title: "Proyecto final: activación, retención y conversión por cohorte",
    difficulty: "expert",
    estimated_minutes: 30,
    concepts: [
      "cte",
      "subquery",
      "outer_join",
      "group_by",
      "conditional_aggregation",
      "aggregate",
      "distinct",
      "date_functions",
    ],
    dataset: ritmo,
    tables_used: ["users", "plays", "subscriptions"],
    scenario_md:
      "Último informe del curso. **Ritmo** presenta resultados al directorio y necesita una sola tabla que responda si el producto mejora: por cada mes de alta, cuánta gente empezó a escuchar, cuánta seguía escuchando un mes después y cuánta pagó.\n\nDos cosas que ya sabes y que hay que aplicar aquí. Una: la tabla `plays` tiene reproducciones duplicadas —la misma persona, la misma canción y la misma marca de tiempo aparecen dos veces en 340 casos—, así que cualquier conteo de escuchas debe deduplicar por `(user_id, track_id, played_at)`. Dos: una cohorte solo se puede comparar con otra si todas tuvieron la **misma ventana de observación**; por eso se excluyen las altas posteriores al 30 de junio de 2025, que no llegaron a cumplir 60 días dentro de los datos.",
    business_question_md:
      "Debes generar un dataset tomando las personas con `signup_at` **en la zona horaria UTC** anterior a `2025-07-01`. Agrúpalas por su mes de alta y devuelve una fila por cohorte:\n\n- `cohort_month`: primer día del mes de alta, como fecha\n- `users`: personas de la cohorte\n- `activated_7d`: personas con al menos una reproducción en los **7 días** siguientes a su alta (desde `signup_at` inclusive hasta `signup_at + 7 días` exclusive)\n- `retained_d30`: personas con al menos una reproducción entre el día **30** inclusive y el día **60** exclusive contados desde su alta\n- `converted_30d`: personas con al menos una suscripción cuyo `started_on` cae entre la fecha de alta (en UTC) inclusive y 30 días después exclusive\n- `avg_unique_plays_30d`: promedio por persona de la cohorte de **reproducciones únicas** en los primeros 30 días desde el alta, contando una sola vez cada combinación `(user_id, track_id, played_at)`, con dos decimales. Las personas sin reproducciones cuentan como 0 en ese promedio.\n\nOrdena por `cohort_month` ascendente.",
    learning_objective:
      "Integrar cohortes, ventanas temporales relativas, deduplicación y agregación condicional en un único informe reproducible cuyo denominador es siempre la cohorte completa.",
    theory_ref: trabajo,
    expected_columns: [
      { name: "cohort_month", type: "date" },
      { name: "users", type: "integer" },
      { name: "activated_7d", type: "integer" },
      { name: "retained_d30", type: "integer" },
      { name: "converted_30d", type: "integer" },
      { name: "avg_unique_plays_30d", type: "numeric" },
    ],
    validation_rules: {
      order_matters: true,
      required_concepts: ["cte", "group_by", "conditional_aggregation"],
    },
    reference_solution:
      "WITH cohorte AS (\n  SELECT\n    u.id,\n    u.signup_at,\n    date_trunc('month', u.signup_at AT TIME ZONE 'UTC')::date AS cohort_month\n  FROM users u\n  WHERE u.signup_at AT TIME ZONE 'UTC' < '2025-07-01'\n),\nescuchas AS (\n  SELECT DISTINCT user_id, track_id, played_at FROM plays\n),\nprimeras AS (\n  SELECT c.id, count(e.track_id) AS unique_plays\n  FROM cohorte c\n  LEFT JOIN escuchas e\n    ON e.user_id = c.id\n   AND e.played_at >= c.signup_at\n   AND e.played_at < c.signup_at + interval '30 days'\n  GROUP BY c.id\n)\nSELECT\n  c.cohort_month,\n  count(*) AS users,\n  count(*) FILTER (WHERE EXISTS (\n    SELECT 1 FROM plays p\n    WHERE p.user_id = c.id\n      AND p.played_at >= c.signup_at\n      AND p.played_at < c.signup_at + interval '7 days'\n  )) AS activated_7d,\n  count(*) FILTER (WHERE EXISTS (\n    SELECT 1 FROM plays p\n    WHERE p.user_id = c.id\n      AND p.played_at >= c.signup_at + interval '30 days'\n      AND p.played_at < c.signup_at + interval '60 days'\n  )) AS retained_d30,\n  count(*) FILTER (WHERE EXISTS (\n    SELECT 1 FROM subscriptions s\n    WHERE s.user_id = c.id\n      AND s.started_on >= (c.signup_at AT TIME ZONE 'UTC')::date\n      AND s.started_on < (c.signup_at AT TIME ZONE 'UTC')::date + 30\n  )) AS converted_30d,\n  round(avg(pr.unique_plays), 2) AS avg_unique_plays_30d\nFROM cohorte c\nJOIN primeras pr ON pr.id = c.id\nGROUP BY c.cohort_month\nORDER BY c.cohort_month;",
    alternative_solutions: [
      {
        label: "Banderas por persona calculadas antes de agregar",
        sql: "WITH cohorte AS (\n  SELECT\n    u.id,\n    u.signup_at,\n    date_trunc('month', u.signup_at AT TIME ZONE 'UTC')::date AS cohort_month\n  FROM users u\n  WHERE u.signup_at AT TIME ZONE 'UTC' < '2025-07-01'\n),\nescuchas AS (\n  SELECT DISTINCT user_id, track_id, played_at FROM plays\n),\npor_persona AS (\n  SELECT\n    c.id,\n    c.cohort_month,\n    count(*) FILTER (WHERE e.played_at < c.signup_at + interval '7 days') AS plays_7d,\n    count(e.track_id) AS unique_plays_30d\n  FROM cohorte c\n  LEFT JOIN escuchas e\n    ON e.user_id = c.id\n   AND e.played_at >= c.signup_at\n   AND e.played_at < c.signup_at + interval '30 days'\n  GROUP BY c.id, c.cohort_month\n)\nSELECT\n  p.cohort_month,\n  count(*) AS users,\n  count(*) FILTER (WHERE p.plays_7d > 0) AS activated_7d,\n  count(*) FILTER (WHERE EXISTS (\n    SELECT 1 FROM plays pl\n    WHERE pl.user_id = p.id\n      AND pl.played_at >= (SELECT c.signup_at FROM cohorte c WHERE c.id = p.id) + interval '30 days'\n      AND pl.played_at < (SELECT c.signup_at FROM cohorte c WHERE c.id = p.id) + interval '60 days'\n  )) AS retained_d30,\n  count(*) FILTER (WHERE EXISTS (\n    SELECT 1 FROM subscriptions s, cohorte c\n    WHERE c.id = p.id AND s.user_id = p.id\n      AND s.started_on >= (c.signup_at AT TIME ZONE 'UTC')::date\n      AND s.started_on < (c.signup_at AT TIME ZONE 'UTC')::date + 30\n  )) AS converted_30d,\n  round(avg(CASE WHEN p.unique_plays_30d > 0 THEN p.unique_plays_30d ELSE 0 END), 2) AS avg_unique_plays_30d\nFROM por_persona p\nGROUP BY p.cohort_month\nORDER BY p.cohort_month;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "El denominador de todas las tasas es la cohorte completa, incluso las personas que nunca reprodujeron nada. Eso descarta cualquier solución que empiece uniendo `users` con `plays` por dentro: quien no escuchó desaparecería y los porcentajes saldrían optimistas.\n\nCada métrica es una pregunta de «¿existe al menos un evento en esta ventana?», salvo la última, que es un conteo y necesita que las reproducciones estén deduplicadas antes de contarlas.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Arma una CTE `cohorte` con una fila por persona: `id`, `signup_at` y el mes truncado en UTC. Sobre ella, `count(*) FILTER (WHERE EXISTS (...))` cuenta personas que cumplen una condición sin multiplicar filas: dentro del `EXISTS` va la ventana relativa, por ejemplo `p.played_at >= c.signup_at + interval '30 days' AND p.played_at < c.signup_at + interval '60 days'`.\n\nPara el promedio de escuchas únicas, deduplica primero con `SELECT DISTINCT user_id, track_id, played_at FROM plays` y cuenta por persona con un `LEFT JOIN` en una CTE aparte; `count(columna)` devuelve 0 para quien no tiene ninguna fila del lado derecho. `started_on` es una fecha y `signup_at` una marca con huso: compara `(c.signup_at AT TIME ZONE 'UTC')::date` con `started_on`.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nWITH cohorte AS (\n  SELECT u.id, u.signup_at, ___ AS cohort_month\n  FROM users u\n  WHERE ___\n),\nescuchas AS (\n  SELECT DISTINCT ___ FROM plays\n),\nprimeras AS (\n  SELECT c.id, count(___) AS unique_plays\n  FROM cohorte c\n  ___ JOIN escuchas e ON e.user_id = c.id AND ___ AND ___\n  GROUP BY c.id\n)\nSELECT\n  c.cohort_month,\n  count(*) AS users,\n  count(*) FILTER (WHERE EXISTS (___)) AS activated_7d,\n  count(*) FILTER (WHERE EXISTS (___)) AS retained_d30,\n  count(*) FILTER (WHERE EXISTS (___)) AS converted_30d,\n  round(___, 2) AS avg_unique_plays_30d\nFROM cohorte c\nJOIN primeras pr ON ___\nGROUP BY c.cohort_month\nORDER BY c.cohort_month;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "aggregation_level",
        description_md:
          "Unir `users` con `plays` directamente y contar con `count(*)`: cada persona aparece una vez por reproducción, así que `users` deja de ser la cantidad de personas y todas las tasas se rompen. Con `EXISTS` o `count(DISTINCT u.id)` el nivel se mantiene.",
      },
      {
        category: "duplicates",
        description_md:
          "Contar `plays` sin deduplicar: las 340 combinaciones `(user_id, track_id, played_at)` repetidas inflan `avg_unique_plays_30d`. El enunciado pide reproducciones únicas, y esa clave es la definición acordada de «una escucha».",
      },
      {
        category: "missing_filter",
        description_md:
          "Incluir las altas de julio, agosto y septiembre de 2025. Esas cohortes no alcanzan a cumplir 60 días dentro de los datos, así que su `retained_d30` sale artificialmente bajo y parece que el producto empeoró.",
      },
      {
        category: "date_boundary",
        description_md:
          "Comparar `subscriptions.started_on` (una fecha) directamente con `signup_at` (`timestamptz`) sin fijar el huso, o usar ventanas cerradas de los dos lados (`BETWEEN`), que cuentan dos veces el día de corte entre una ventana y la siguiente.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da **18 cohortes**, de enero de 2024 a junio de 2025. La primera tiene 85 personas, de las cuales 32 activaron en la primera semana (37,6 %), 59 seguían escuchando entre el día 30 y el 60 (69,4 %) y 7 pagaron dentro del mes (8,2 %). La cohorte de octubre de 2024, con 265 personas, activa 106 (40,0 %), retiene 198 (74,7 %) y convierte 31 (11,7 %).\n\nEse patrón —retención a 30 días más alta que la activación a 7— es el hallazgo que hay que saber leer: mucha gente se registra, no vuelve enseguida y aparece semanas después. Si el equipo optimizara solo la activación de la primera semana, estaría apuntando a la métrica equivocada. Esa es la clase de conclusión que se espera de un analista, y no sale de la consulta sino de mirarla.\n\nTres decisiones técnicas sostienen el informe:\n\n1. **La cohorte completa es siempre el denominador.** `count(*) FILTER (WHERE EXISTS (...))` cuenta personas de `cohorte` que cumplen una condición, sin unir filas de `plays` al resultado. Un `INNER JOIN` con `plays` habría borrado a quien nunca escuchó y todas las tasas saldrían infladas.\n2. **La ventana de observación se iguala entre cohortes.** Excluir las altas posteriores al 30 de junio de 2025 no es un capricho: con datos hasta el 15 de septiembre, una persona registrada en agosto no puede llegar al día 60. Comparar cohortes con ventanas distintas es el error más frecuente de los informes de retención.\n3. **La deduplicación va antes del conteo.** `SELECT DISTINCT user_id, track_id, played_at` colapsa los 340 pares duplicados de `plays`. Sobre esa CTE, el `LEFT JOIN` por persona y `count(e.track_id)` devuelven 0 para quien no escuchó —`count` de una columna cuenta valores presentes, y del lado sin correspondencia hay `NULL`—, que es lo que permite promediar sobre la cohorte entera.\n\nSobre alternativas: las tres banderas se pueden calcular con `LEFT JOIN` a subconsultas agregadas en lugar de `EXISTS`. El resultado es idéntico; `EXISTS` suele ser más rápido porque el motor deja de buscar en cuanto encuentra la primera fila, y se lee mejor, porque cada métrica lleva su ventana al lado en vez de estar repartida en tres CTE. Lo que no conviene es mezclar: tres estilos distintos en la misma consulta la vuelven imposible de revisar.\n\nCon esto cierras el curso. El informe tiene todo lo que se espera de una entrega profesional: definiciones explícitas, ventana comparable, deduplicación declarada, denominador honesto y un resultado que se puede discutir en una reunión.",
    improvement_feedback: [
      {
        condition: "missing_alias_on_aggregate",
        message_key: "improve.missing_alias_on_aggregate",
      },
      {
        condition: "uses_between_for_timestamps",
        message_key: "improve.uses_between_for_timestamps",
      },
    ],
    reward: defaultReward("expert"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
];
