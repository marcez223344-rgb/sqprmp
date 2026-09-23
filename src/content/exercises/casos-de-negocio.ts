import {
  defaultHintMeta,
  defaultReward,
  defaultSolutionUnlock,
  type ExerciseDef,
} from "../schemas/exercise";

const section = "casos-de-negocio";
const tiendaviva = { slug: "tiendaviva", version: 1 };
const bolsillo = { slug: "bolsillo", version: 1 };
const pidelo = { slug: "pidelo", version: 1 };
const ritmo = { slug: "ritmo", version: 1 };
const l1 = "de-un-pedido-vago-a-una-especificacion";
const l2 = "supuestos-que-se-escriben";
const l3 = "revisar-antes-de-enviar";

export const exercises: ExerciseDef[] = [
  {
    slug: "caida-de-ventas-mexico-por-canal",
    section,
    title: "¿Por qué cayeron las ventas en México?",
    difficulty: "intermediate",
    estimated_minutes: 12,
    concepts: ["conditional_aggregation", "aggregate", "group_by", "inner_join", "order_by"],
    dataset: tiendaviva,
    tables_used: ["orders", "customers"],
    scenario_md:
      "La gerenta comercial de **TiendaViva** te escribe un viernes a las 18:10:\n\n> «Agosto cerró feo en México, como 9 % abajo de julio. Ya vi que no es el ticket. ¿Me puedes decir dónde se cayó?»\n\nSabes por el resumen mensual que los ingresos entregados en México pasaron de 2 075 796,94 en julio a 1 879 865,71 en agosto y que el ticket promedio casi no se movió. El siguiente nivel de detalle natural es el **canal de venta**.",
    business_question_md:
      "Debes generar un dataset que devuelva una fila por canal (`orders.channel`) con la comparación entre julio y agosto de 2025.\n\nSupuestos fijados para este ejercicio:\n\n- «Venta en México» = pedido de un cliente con `customers.country = 'MX'`.\n- Solo pedidos con `status = 'delivered'`.\n- Julio = pedidos con `created_at` en julio de 2025 **en UTC**; agosto, ídem. Usa límites `>=` y `<` sobre `created_at`.\n- Los importes son `orders.total_amount`; todos los pedidos de México están en MXN, así que se pueden sumar.\n\nColumnas, en este orden: `canal`, `pedidos_julio`, `pedidos_agosto`, `ingresos_julio`, `ingresos_agosto` (ambos importes redondeados a 2 decimales) y `variacion_pct`, la variación porcentual de los ingresos de agosto contra los de julio, redondeada a 2 decimales. Ordena por `canal` ascendente.",
    learning_objective:
      "Descomponer la caída de una métrica por una dimensión usando agregación condicional sobre dos períodos en una sola pasada.",
    theory_ref: l1,
    expected_columns: [
      { name: "canal", type: "text" },
      { name: "pedidos_julio", type: "integer" },
      { name: "pedidos_agosto", type: "integer" },
      { name: "ingresos_julio", type: "numeric" },
      { name: "ingresos_agosto", type: "numeric" },
      { name: "variacion_pct", type: "numeric" },
    ],
    validation_rules: {
      order_matters: true,
      required_concepts: ["conditional_aggregation", "group_by"],
    },
    reference_solution:
      "SELECT\n  o.channel AS canal,\n  count(*) FILTER (WHERE o.created_at < timestamptz '2025-08-01 00:00:00+00') AS pedidos_julio,\n  count(*) FILTER (WHERE o.created_at >= timestamptz '2025-08-01 00:00:00+00') AS pedidos_agosto,\n  round(sum(o.total_amount) FILTER (WHERE o.created_at < timestamptz '2025-08-01 00:00:00+00'), 2) AS ingresos_julio,\n  round(sum(o.total_amount) FILTER (WHERE o.created_at >= timestamptz '2025-08-01 00:00:00+00'), 2) AS ingresos_agosto,\n  round(\n    100.0 * (\n      sum(o.total_amount) FILTER (WHERE o.created_at >= timestamptz '2025-08-01 00:00:00+00')\n      - sum(o.total_amount) FILTER (WHERE o.created_at < timestamptz '2025-08-01 00:00:00+00')\n    ) / sum(o.total_amount) FILTER (WHERE o.created_at < timestamptz '2025-08-01 00:00:00+00'),\n    2\n  ) AS variacion_pct\nFROM orders AS o\nINNER JOIN customers AS c ON c.id = o.customer_id\nWHERE c.country = 'MX'\n  AND o.status = 'delivered'\n  AND o.created_at >= timestamptz '2025-07-01 00:00:00+00'\n  AND o.created_at <  timestamptz '2025-09-01 00:00:00+00'\nGROUP BY o.channel\nORDER BY o.channel;",
    alternative_solutions: [
      {
        label: "Con CASE en lugar de FILTER y una CTE intermedia",
        sql: "WITH base AS (SELECT o.channel, o.total_amount, CASE WHEN o.created_at < timestamptz '2025-08-01 00:00:00+00' THEN 'jul' ELSE 'ago' END AS periodo FROM orders AS o INNER JOIN customers AS c ON c.id = o.customer_id WHERE c.country = 'MX' AND o.status = 'delivered' AND o.created_at >= timestamptz '2025-07-01 00:00:00+00' AND o.created_at < timestamptz '2025-09-01 00:00:00+00'), agrupado AS (SELECT channel AS canal, count(CASE WHEN periodo = 'jul' THEN 1 END) AS pedidos_julio, count(CASE WHEN periodo = 'ago' THEN 1 END) AS pedidos_agosto, sum(CASE WHEN periodo = 'jul' THEN total_amount ELSE 0 END) AS jul, sum(CASE WHEN periodo = 'ago' THEN total_amount ELSE 0 END) AS ago FROM base GROUP BY channel) SELECT canal, pedidos_julio, pedidos_agosto, round(jul, 2) AS ingresos_julio, round(ago, 2) AS ingresos_agosto, round(100.0 * (ago - jul) / jul, 2) AS variacion_pct FROM agrupado ORDER BY canal;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Necesitas **una fila por canal** con datos de dos meses. Eso no se resuelve agrupando por mes y canal (te daría seis filas): se resuelve trayendo los dos meses en el `WHERE` y separándolos dentro de cada columna agregada.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "El filtro general acota `created_at` a `>= '2025-07-01'` y `< '2025-09-01'` (en UTC). Dentro del `SELECT`, cada columna usa `count(*) FILTER (WHERE ...)` o `sum(...) FILTER (WHERE ...)` con la condición del mes que le toca. El corte entre los dos meses es un único instante: `2025-08-01 00:00:00+00`.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT\n  o.channel AS canal,\n  count(*) FILTER (WHERE o.created_at ___ timestamptz '2025-08-01 00:00:00+00') AS pedidos_julio,\n  count(*) FILTER (WHERE o.created_at ___ timestamptz '2025-08-01 00:00:00+00') AS pedidos_agosto,\n  round(sum(o.total_amount) FILTER (WHERE ___), 2) AS ingresos_julio,\n  round(sum(o.total_amount) FILTER (WHERE ___), 2) AS ingresos_agosto,\n  round(100.0 * (___ - ___) / ___, 2) AS variacion_pct\nFROM orders AS o\nINNER JOIN customers AS c ON c.id = o.customer_id\nWHERE c.country = '___'\n  AND o.status = '___'\n  AND o.created_at >= timestamptz '2025-07-01 00:00:00+00'\n  AND o.created_at <  timestamptz '2025-09-01 00:00:00+00'\nGROUP BY o.channel\nORDER BY ___;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "aggregation_level",
        description_md:
          "Agrupar por mes **y** canal: devuelve seis filas y obliga a quien lee a hacer la resta a mano. El pedido es una fila por canal con los dos meses lado a lado.",
      },
      {
        category: "date_boundary",
        description_md:
          "Cerrar agosto con `<= '2025-08-31'`: `created_at` es `timestamptz`, así que se pierde todo lo ocurrido después de la medianoche del 31. El límite superior siempre es abierto: `< '2025-09-01'`.",
      },
      {
        category: "missing_filter",
        description_md:
          "Olvidar `status = 'delivered'`: entran cancelados y devueltos, y la caída de agosto cambia de tamaño o desaparece.",
      },
      {
        category: "join_condition",
        description_md:
          "Filtrar por `orders.currency = 'MXN'` creyendo que es lo mismo que el país del cliente. En estos datos coinciden, pero el supuesto declarado es el país del cliente: si mañana se cobra en otra moneda, la definición cambia sin que nadie lo note.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da tres filas, y la respuesta salta a la vista:\n\n| canal | pedidos jul → ago | ingresos jul → ago | variación |\n| --- | --- | --- | --- |\n| `app` | 165 → 155 | 1 089 639,05 → 994 346,16 | −8,75 % |\n| `marketplace_partner` | 20 → 19 | 167 484,06 → 83 969,93 | −49,86 % |\n| `web` | 121 → 107 | 818 673,83 → 801 549,62 | −2,09 % |\n\nEl canal de socios se desplomó a la mitad **con prácticamente los mismos pedidos** (20 contra 19): ahí el problema es el ticket, no el volumen. La app perdió 10 pedidos y aporta el mayor faltante en pesos (−95 293 de los −195 931 totales, casi la mitad). La web apenas se movió.\n\nEsas son dos conversaciones distintas: con el equipo de socios, por qué se vendieron productos mucho más baratos; con el de app, por qué hubo menos pedidos. Un único número de −9 % no permitía ninguna de las dos.\n\nLa técnica es agregación condicional: una sola pasada por la tabla, filtro amplio en el `WHERE` y el corte de período dentro de cada agregado con `FILTER`. La alternativa con `CASE` dentro de `sum()` es equivalente y funciona en cualquier motor; `FILTER` es estándar SQL y más legible en PostgreSQL. Lo que **no** conviene es ejecutar dos consultas y pegar los resultados en una planilla: el día que cambie la definición vas a corregir una sola.\n\nUna advertencia sobre `marketplace_partner`: 19 pedidos son muy pocos. Un −49,86 % calculado sobre 20 casos puede ser un solo pedido grande de julio que no se repitió. Antes de escribir el correo, vale mirar esos 39 pedidos uno por uno.",
    improvement_feedback: [
      {
        condition: "uses_between_for_timestamps",
        message_key: "improve.uses_between_for_timestamps",
      },
      { condition: "uses_select_star", message_key: "improve.uses_select_star" },
    ],
    reward: defaultReward("intermediate"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "rechazos-de-pago-por-rubro",
    section,
    title: "¿Hay un rubro que concentre los rechazos?",
    difficulty: "intermediate",
    estimated_minutes: 12,
    concepts: ["conditional_aggregation", "aggregate", "group_by", "having", "inner_join"],
    dataset: bolsillo,
    tables_used: ["transactions", "merchants"],
    scenario_md:
      "El departamento de Riesgo de **Bolsillo** tiene una hipótesis:\n\n> «Nos están rebotando muchos pagos y creemos que es culpa de un rubro puntual. ¿Nos pasas la tasa de rechazo por rubro del primer semestre?»\n\nNo te piden que confirmes la hipótesis: te piden el dato. Tu trabajo es entregarlo de forma que se pueda ver si la hipótesis se sostiene o no.",
    business_question_md:
      "Debes generar un dataset que devuelva una fila por rubro de comercio (`merchants.category`) con la tasa de rechazo del primer semestre de 2025.\n\nSupuestos fijados para este ejercicio:\n\n- «Pago» = movimiento de `transactions` con `kind` en `'card_payment'` o `'qr_payment'`. No entran recargas, retiros, comisiones ni transferencias.\n- «Rechazado» = `status = 'failed'`. Los `pending` y los `reversed` cuentan como intentos pero **no** como rechazos.\n- Primer semestre de 2025 = `created_at` desde el 1 de enero inclusive hasta el 1 de julio exclusive, **en UTC**.\n- Solo rubros con al menos 100 intentos en el período; por debajo de ese umbral el porcentaje no es interpretable.\n\nColumnas: `rubro`, `intentos`, `rechazados` y `pct_rechazo` (rechazados sobre intentos, en porcentaje, redondeado a 2 decimales). Ordena por `pct_rechazo` descendente y, si hay empate debes desempatar usando `rubro` ascendente.",
    learning_objective:
      "Calcular una tasa por categoría con agregación condicional y protegerla con un umbral mínimo de volumen declarado de antemano.",
    theory_ref: l2,
    expected_columns: [
      { name: "rubro", type: "text" },
      { name: "intentos", type: "integer" },
      { name: "rechazados", type: "integer" },
      { name: "pct_rechazo", type: "numeric" },
    ],
    validation_rules: {
      order_matters: true,
      required_concepts: ["conditional_aggregation", "having"],
    },
    reference_solution:
      "SELECT\n  m.category AS rubro,\n  count(*) AS intentos,\n  count(*) FILTER (WHERE t.status = 'failed') AS rechazados,\n  round(100.0 * count(*) FILTER (WHERE t.status = 'failed') / count(*), 2) AS pct_rechazo\nFROM transactions AS t\nINNER JOIN merchants AS m ON m.id = t.merchant_id\nWHERE t.kind IN ('card_payment', 'qr_payment')\n  AND t.created_at >= timestamptz '2025-01-01 00:00:00+00'\n  AND t.created_at <  timestamptz '2025-07-01 00:00:00+00'\nGROUP BY m.category\nHAVING count(*) >= 100\nORDER BY pct_rechazo DESC, rubro;",
    alternative_solutions: [
      {
        label: "Con CASE y una CTE",
        sql: "WITH pagos AS (SELECT m.category AS rubro, CASE WHEN t.status = 'failed' THEN 1 ELSE 0 END AS es_rechazo FROM transactions AS t INNER JOIN merchants AS m ON m.id = t.merchant_id WHERE t.kind IN ('card_payment', 'qr_payment') AND t.created_at >= timestamptz '2025-01-01 00:00:00+00' AND t.created_at < timestamptz '2025-07-01 00:00:00+00') SELECT rubro, count(*) AS intentos, sum(es_rechazo) AS rechazados, round(100.0 * sum(es_rechazo) / count(*), 2) AS pct_rechazo FROM pagos GROUP BY rubro HAVING count(*) >= 100 ORDER BY pct_rechazo DESC, rubro;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Una tasa necesita numerador y denominador **calculados sobre el mismo conjunto**. El denominador son todos los intentos del rubro; el numerador, los que fallaron. No filtres `status = 'failed'` en el `WHERE`: te quedarías sin denominador.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "El rubro vive en `merchants`, así que hay que unir por `t.merchant_id = m.id`. El numerador sale de `count(*) FILTER (WHERE t.status = 'failed')`. Para que la división no dé cero, multiplica por `100.0` (con punto) antes de dividir. El umbral de 100 intentos es una condición sobre el grupo: va en `HAVING`, no en `WHERE`.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT\n  m.category AS rubro,\n  count(*) AS intentos,\n  count(*) FILTER (WHERE ___) AS rechazados,\n  round(___ * count(*) FILTER (WHERE ___) / count(*), 2) AS pct_rechazo\nFROM transactions AS t\nINNER JOIN merchants AS m ON ___ = ___\nWHERE t.kind IN ('___', '___')\n  AND t.created_at >= timestamptz '2025-01-01 00:00:00+00'\n  AND t.created_at <  timestamptz '___'\nGROUP BY m.category\n___ count(*) >= ___\nORDER BY ___ DESC, ___;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "missing_filter",
        description_md:
          "Poner `status = 'failed'` en el `WHERE`: la consulta devuelve la cantidad de rechazos por rubro, pero la tasa da 100 % en todas las filas porque el denominador ya está filtrado.",
      },
      {
        category: "cell_values",
        description_md:
          "Dividir enteros: `count(*) FILTER (...) / count(*)` da 0 en PostgreSQL. Hay que forzar el tipo numérico multiplicando por `100.0` antes de dividir.",
      },
      {
        category: "aggregation_level",
        description_md:
          "Poner el umbral de 100 intentos en el `WHERE`: ahí se evalúa fila por fila y no existe todavía el conteo del grupo. La condición sobre un agregado va en `HAVING`.",
      },
      {
        category: "join_condition",
        description_md:
          "Usar `LEFT JOIN` con `merchants`: los movimientos sin comercio (recargas, comisiones) entrarían con rubro `NULL` y ensuciarían el informe que pidió Riesgo.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da diez rubros que pasan el umbral y el resultado va de 6,03 % (`restaurante`, 27 rechazos sobre 448 intentos) a 3,62 % (`farmacia` y `servicios`). Esa es la respuesta honesta al pedido: **la hipótesis no se sostiene**.\n\nVale la pena entender por qué. La diferencia entre el peor rubro y el mejor es de 2,4 puntos, pero los numeradores son 27 y 13 sobre unos 400 intentos. Con esas cantidades, unos pocos pagos de más o de menos mueven el porcentaje casi un punto entero. Que `restaurante` encabece la tabla no significa que tenga un problema: significa que quedó arriba en esta muestra.\n\nLo que se entrega, entonces, no es «el culpable es restaurante», sino: «la tasa de rechazo del semestre es de 3,6 % a 6,0 % según el rubro, con 4,9 % en el agregado; las diferencias son del orden del ruido para estos volúmenes. Si quieren perseguir un culpable, conviene mirar comercios individuales o emisores de tarjeta, no rubros».\n\nDos detalles técnicos. El empate en 3,62 % entre `farmacia` y `servicios` es real (13/359 y 17/470 redondean al mismo valor): por eso el orden pide un segundo criterio, si no el resultado sería inestable. Y el `HAVING count(*) >= 100` se eligió **antes** de ver los números; elegir el umbral después equivale a elegir qué rubros aparecen en la conclusión.",
    improvement_feedback: [
      { condition: "no_table_alias_in_join", message_key: "improve.no_table_alias_in_join" },
    ],
    reward: defaultReward("intermediate"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "mrr-al-cierre-de-agosto",
    section,
    title: "¿Cuánto MRR teníamos al cerrar agosto?",
    difficulty: "intermediate",
    estimated_minutes: 13,
    concepts: ["aggregate", "group_by", "null_handling", "conditional_aggregation", "order_by"],
    dataset: ritmo,
    tables_used: ["subscriptions"],
    scenario_md:
      "El departamento de Finanzas de **Ritmo** prepara el reporte de cierre y te pide:\n\n> «Necesito el MRR al 31 de agosto. Tal cual lo tengas, pero que cierre.»\n\nEn `subscriptions` cada fila es un período de suscripción con `started_on`, `ended_on` (nulo si sigue vigente), `plan`, `amount_minor` (precio mensual en unidades menores) y `currency`. No hay tipos de cambio en este dataset, así que los importes de distintas monedas **no se pueden sumar**.",
    business_question_md:
      "Debes generar un dataset que devuelva una fila por moneda con la foto de las suscripciones vigentes **al 31 de agosto de 2025**.\n\nSupuestos fijados para este ejercicio:\n\n- Una suscripción está vigente ese día si `started_on <= DATE '2025-08-31'` y además `ended_on` es nulo o `ended_on > DATE '2025-08-31'`. Es decir: el período que termina exactamente el 31 de agosto ya no cuenta.\n- El MRR es la suma de `amount_minor` de las suscripciones vigentes, sin convertir entre monedas.\n\nColumnas: `moneda`, `suscripciones` (cuántas vigentes), `premium` y `familiar` (cuántas de cada plan) y `mrr_minor` (la suma de `amount_minor`). Ordena por `moneda` ascendente.",
    learning_objective:
      "Reconstruir una foto a una fecha de corte a partir de períodos con fin abierto, tratando el NULL como «vigente».",
    theory_ref: l2,
    expected_columns: [
      { name: "moneda", type: "text" },
      { name: "suscripciones", type: "integer" },
      { name: "premium", type: "integer" },
      { name: "familiar", type: "integer" },
      { name: "mrr_minor", type: "integer" },
    ],
    validation_rules: {
      order_matters: true,
      required_concepts: ["conditional_aggregation", "null_handling"],
    },
    reference_solution:
      "SELECT\n  s.currency AS moneda,\n  count(*) AS suscripciones,\n  count(*) FILTER (WHERE s.plan = 'premium') AS premium,\n  count(*) FILTER (WHERE s.plan = 'familiar') AS familiar,\n  sum(s.amount_minor) AS mrr_minor\nFROM subscriptions AS s\nWHERE s.started_on <= DATE '2025-08-31'\n  AND (s.ended_on IS NULL OR s.ended_on > DATE '2025-08-31')\nGROUP BY s.currency\nORDER BY s.currency;",
    alternative_solutions: [
      {
        label: "Con coalesce en lugar de la rama IS NULL",
        sql: "SELECT s.currency AS moneda, count(*) AS suscripciones, sum(CASE WHEN s.plan = 'premium' THEN 1 ELSE 0 END) AS premium, sum(CASE WHEN s.plan = 'familiar' THEN 1 ELSE 0 END) AS familiar, sum(s.amount_minor) AS mrr_minor FROM subscriptions AS s WHERE s.started_on <= DATE '2025-08-31' AND coalesce(s.ended_on, DATE '9999-12-31') > DATE '2025-08-31' GROUP BY s.currency ORDER BY s.currency;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "«Vigente al 31 de agosto» es una condición sobre un intervalo, no sobre una fecha: el período tiene que haber empezado antes o ese mismo día y no haber terminado todavía. Son dos condiciones unidas por `AND`.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "La trampa está en `ended_on`. Una comparación como `ended_on > DATE '2025-08-31'` es `NULL` —ni verdadera ni falsa— cuando el valor es nulo, y esas filas se pierden. Los vigentes sin fecha de fin son justamente los que más importan: agrégales una rama explícita con `ended_on IS NULL OR ...`. Para las columnas por plan usa `count(*) FILTER (WHERE s.plan = ...)`.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT\n  s.currency AS moneda,\n  count(*) AS suscripciones,\n  count(*) FILTER (WHERE ___) AS premium,\n  count(*) FILTER (WHERE ___) AS familiar,\n  ___(s.amount_minor) AS mrr_minor\nFROM subscriptions AS s\nWHERE s.started_on ___ DATE '2025-08-31'\n  AND (s.ended_on ___ OR s.ended_on ___ DATE '2025-08-31')\nGROUP BY s.currency\nORDER BY ___;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "null_handling",
        description_md:
          "Escribir solo `ended_on > DATE '2025-08-31'`: las suscripciones vigentes (con `ended_on` nulo) desaparecen y el MRR queda enormemente subestimado, sin ningún error visible.",
      },
      {
        category: "date_boundary",
        description_md:
          "Usar `ended_on >= DATE '2025-08-31'`: cuenta como vigente un período que cerró ese mismo día. Es una decisión legítima, pero contradice el supuesto fijado y cambia el número.",
      },
      {
        category: "aggregation_level",
        description_md:
          "Sumar `amount_minor` de todas las monedas juntas: el total no significa nada, porque mezcla pesos, reales y soles en la misma cifra.",
      },
      {
        category: "missing_filter",
        description_md:
          "Olvidar `started_on <= DATE '2025-08-31'`: entrarían suscripciones que empiezan en septiembre y el cierre de agosto incluiría ingresos del futuro.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da seis filas, una por mercado: ARS 143 suscripciones (49 237 000), BRL 212 (537 080), CLP 98 (59 302 000), COP 97 (182 330 000), MXN 221 (3 037 900) y PEN 47 (139 130). En total 818 suscripciones vigentes, de las cuales 613 son `premium` y 205 `familiar`.\n\nLos importes están en unidades menores y en seis monedas distintas: la tabla **no lleva fila de total**, y eso es parte de la respuesta. Si Finanzas necesita una cifra única, hace falta una tabla de tipos de cambio y la decisión de qué día usar; mientras no exista, sumar sería inventar.\n\nEl corazón del ejercicio es la condición de vigencia. Un período con `ended_on IS NULL` significa «abierto», no «desconocido», y la comparación `ended_on > fecha` lo descarta en silencio porque cualquier comparación con `NULL` da `NULL` y `NULL` no es verdadero. La alternativa con `coalesce(ended_on, DATE '9999-12-31')` funciona y a veces se lee mejor, pero introduce una fecha centinela que hay que recordar para siempre; la rama explícita `IS NULL OR` es más honesta.\n\nDos matices que conviene escribir en la entrega. Primero, 818 vigentes al 31 de agosto no es lo mismo que las 737 filas con `ended_on IS NULL` al cierre de los datos: 125 de las vigentes de agosto se dieron de baja en los primeros quince días de septiembre y 44 suscripciones nuevas se abrieron en ese lapso. El MRR es una **foto**, y la foto depende de la fecha. Segundo, 64 oyentes tienen más de un período en la tabla; en esta fecha ninguno tiene dos abiertos a la vez, pero si los tuviera, contarías dos veces a la misma persona y la columna `suscripciones` dejaría de ser «clientes».",
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
    slug: "vendedores-a-priorizar-en-mexico",
    section,
    title: "¿Qué vendedores deberíamos priorizar?",
    difficulty: "advanced",
    estimated_minutes: 16,
    concepts: ["cte", "aggregate", "group_by", "window_function", "inner_join", "limit"],
    dataset: tiendaviva,
    tables_used: ["order_items", "orders", "products", "sellers"],
    scenario_md:
      "El director de Marketplace de **TiendaViva** abre la reunión así:\n\n> «Vamos a armar un programa de cuentas clave en México. Necesito saber a quién le dedicamos gerente. Pásame los que más facturan, pero también cuánto pesan sobre el total, porque no quiero invertir en alguien que mueve el 0,3 %.»\n\nNo aclaró período, ni qué es «facturar», ni cuántos quiere. Esas decisiones son tuyas, y este enunciado las fija para que el resultado sea comparable.",
    business_question_md:
      "Debes generar un dataset que devuelva los 10 vendedores con más ingresos en el trimestre junio–agosto de 2025 en México.\n\nSupuestos fijados para este ejercicio:\n\n- «Ingreso de un vendedor» = suma de `order_items.quantity * order_items.unit_price` de sus productos (`products.seller_id`). No se reparten envíos ni descuentos del pedido.\n- Solo pedidos con `status = 'delivered'` y `orders.currency = 'MXN'`; los importes de otras monedas no son sumables entre sí.\n- Período: `orders.created_at` desde el 1 de junio de 2025 inclusive hasta el 1 de septiembre exclusive, **en UTC**.\n- `participacion_pct` se calcula sobre el ingreso total del período de **todos** los vendedores, no solo de los diez que aparecen en la tabla.\n\nColumnas: `vendedor` (`sellers.store_name`), `pedidos` (pedidos distintos en los que participó), `ingresos` (redondeado a 2 decimales) y `participacion_pct` (redondeado a 2 decimales). Ordena por `ingresos` descendente y, si hay empate debes desempatar usando `vendedor` ascendente; devuelve solo las 10 primeras filas.",
    learning_objective:
      "Construir un ranking de negocio con un denominador global calculado con una ventana, sin que el LIMIT altere la participación.",
    theory_ref: l3,
    expected_columns: [
      { name: "vendedor", type: "text" },
      { name: "pedidos", type: "integer" },
      { name: "ingresos", type: "numeric" },
      { name: "participacion_pct", type: "numeric" },
    ],
    validation_rules: {
      order_matters: true,
      required_concepts: ["cte", "window_function"],
    },
    reference_solution:
      "WITH vendidos AS (\n  SELECT\n    p.seller_id,\n    o.id AS order_id,\n    oi.quantity * oi.unit_price AS importe\n  FROM order_items AS oi\n  INNER JOIN orders AS o ON o.id = oi.order_id\n  INNER JOIN products AS p ON p.id = oi.product_id\n  WHERE o.status = 'delivered'\n    AND o.currency = 'MXN'\n    AND o.created_at >= timestamptz '2025-06-01 00:00:00+00'\n    AND o.created_at <  timestamptz '2025-09-01 00:00:00+00'\n),\npor_vendedor AS (\n  SELECT\n    v.seller_id,\n    count(DISTINCT v.order_id) AS pedidos,\n    round(sum(v.importe), 2) AS ingresos\n  FROM vendidos AS v\n  GROUP BY v.seller_id\n)\nSELECT\n  s.store_name AS vendedor,\n  pv.pedidos,\n  pv.ingresos,\n  round(100.0 * pv.ingresos / sum(pv.ingresos) OVER (), 2) AS participacion_pct\nFROM por_vendedor AS pv\nINNER JOIN sellers AS s ON s.id = pv.seller_id\nORDER BY pv.ingresos DESC, s.store_name\nLIMIT 10;",
    alternative_solutions: [
      {
        label: "Con una subconsulta escalar como denominador",
        sql: "WITH vendidos AS (SELECT p.seller_id, o.id AS order_id, oi.quantity * oi.unit_price AS importe FROM order_items AS oi INNER JOIN orders AS o ON o.id = oi.order_id INNER JOIN products AS p ON p.id = oi.product_id WHERE o.status = 'delivered' AND o.currency = 'MXN' AND o.created_at >= timestamptz '2025-06-01 00:00:00+00' AND o.created_at < timestamptz '2025-09-01 00:00:00+00'), por_vendedor AS (SELECT v.seller_id, count(DISTINCT v.order_id) AS pedidos, round(sum(v.importe), 2) AS ingresos FROM vendidos AS v GROUP BY v.seller_id) SELECT s.store_name AS vendedor, pv.pedidos, pv.ingresos, round(100.0 * pv.ingresos / (SELECT sum(ingresos) FROM por_vendedor), 2) AS participacion_pct FROM por_vendedor AS pv INNER JOIN sellers AS s ON s.id = pv.seller_id ORDER BY pv.ingresos DESC, s.store_name LIMIT 10;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Hay dos niveles de agregación en juego: el ingreso de cada vendedor y el ingreso total del período. Si calculas el total después de recortar a diez filas, la participación va a sumar 100 % y será falsa. Resuelve el ranking completo primero y recorta al final.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Arma una CTE con los ítems del período (uniendo `order_items` con `orders` y `products`) y otra que agrupe por `seller_id` con `count(DISTINCT order_id)` y `sum(quantity * unit_price)`. En el `SELECT` final, `sum(ingresos) OVER ()` —ventana vacía, sin `PARTITION BY`— te da el total de todos los vendedores, y el `LIMIT` se aplica después de que la ventana ya calculó ese total.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nWITH vendidos AS (\n  SELECT p.seller_id, o.id AS order_id, oi.___ * oi.___ AS importe\n  FROM order_items AS oi\n  INNER JOIN orders AS o ON ___ = ___\n  INNER JOIN products AS p ON ___ = ___\n  WHERE o.status = '___' AND o.currency = '___'\n    AND o.created_at >= timestamptz '2025-06-01 00:00:00+00'\n    AND o.created_at <  timestamptz '___'\n),\npor_vendedor AS (\n  SELECT v.seller_id, count(___ v.order_id) AS pedidos, round(sum(v.importe), 2) AS ingresos\n  FROM vendidos AS v\n  GROUP BY v.seller_id\n)\nSELECT\n  s.store_name AS vendedor,\n  pv.pedidos,\n  pv.ingresos,\n  round(100.0 * pv.ingresos / sum(___) OVER (___), 2) AS participacion_pct\nFROM por_vendedor AS pv\nINNER JOIN sellers AS s ON ___ = ___\nORDER BY ___ DESC, ___\nLIMIT ___;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "aggregation_level",
        description_md:
          "Calcular la participación sobre la suma de los diez vendedores mostrados: la columna suma 100 % y le dice al director que esos diez son todo el mercado.",
      },
      {
        category: "duplicates",
        description_md:
          "Contar `count(o.id)` en vez de `count(DISTINCT o.id)`: un pedido con tres ítems del mismo vendedor se cuenta tres veces y la columna `pedidos` deja de ser pedidos.",
      },
      {
        category: "cell_values",
        description_md:
          "Sumar `o.total_amount` en lugar de `quantity * unit_price`: como un pedido puede tener productos de varios vendedores, cada uno se llevaría el total completo del pedido y la facturación del marketplace se multiplicaría.",
      },
      {
        category: "missing_filter",
        description_md:
          "Omitir `o.currency = 'MXN'`: la suma mezcla pesos argentinos, colombianos y chilenos, y el ranking termina ordenado por la moneda con más ceros, no por facturación.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da diez filas. El primer lugar es `Nube Digital 92`, con 62 pedidos, 385 185,48 MXN y 6,63 % del trimestre. Le siguen `Barrio Urbano 171` (5,66 %) y `Bazar Creativo 174` (4,43 %). Los diez primeros suman alrededor del 40 % de la facturación mexicana del trimestre: hay concentración, pero no tanta como para que un programa de diez cuentas cubra el negocio.\n\nLa pieza técnica es `sum(pv.ingresos) OVER ()`. Una ventana sin `PARTITION BY` ni `ORDER BY` abarca todas las filas del resultado, y las funciones de ventana se evalúan **antes** del `LIMIT`: por eso el denominador sigue siendo el total de todos los vendedores aunque muestres diez. La alternativa con subconsulta escalar (`(SELECT sum(ingresos) FROM por_vendedor)`) da lo mismo y deja el denominador aún más explícito; elige la que a tu equipo le resulte más clara.\n\nEl `count(DISTINCT v.order_id)` merece atención. Después de unir con `order_items`, cada pedido aparece una vez por ítem: sin `DISTINCT`, `pedidos` contaría líneas de detalle. Es exactamente el chequeo de «¿el join duplicó filas?» de la tercera lección.\n\nY una limitación que conviene escribir en la entrega: esto mide **ingresos**, no rentabilidad ni riesgo. Un vendedor con mucha facturación y muchas devoluciones puede valer menos que otro más chico y estable. Con `returns` en la mano, el paso siguiente natural es agregar la tasa de devolución antes de repartir gerentes de cuenta.",
    improvement_feedback: [
      { condition: "no_table_alias_in_join", message_key: "improve.no_table_alias_in_join" },
      { condition: "uses_select_star", message_key: "improve.uses_select_star" },
    ],
    reward: defaultReward("advanced"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "generos-que-crecen-en-mexico",
    section,
    title: "¿Qué géneros están creciendo en México?",
    difficulty: "advanced",
    estimated_minutes: 16,
    concepts: [
      "cte",
      "conditional_aggregation",
      "aggregate",
      "group_by",
      "having",
      "inner_join",
      "distinct",
    ],
    dataset: ritmo,
    tables_used: ["plays", "users", "tracks", "albums", "artists"],
    scenario_md:
      "El departamento de Contenidos de **Ritmo** está renegociando licencias para México y te manda un mensaje corto:\n\n> «¿Qué está creciendo y qué se está apagando en México? Lo necesito para el martes.»\n\n«Crecer» puede medirse en reproducciones o en oyentes. Son cosas distintas: un fanático que escucha cien veces la misma canción mueve las reproducciones pero no la audiencia. Para una decisión de licencias interesa **cuánta gente distinta** escucha cada género.",
    business_question_md:
      "Debes generar un dataset que compare dos ventanas de 30 días y devuelve una fila por género (`artists.genre`).\n\nSupuestos fijados para este ejercicio:\n\n- Solo reproducciones de oyentes con `users.country = 'MX'`.\n- Ventana previa: `played_at` desde el 2025-07-17 inclusive hasta el 2025-08-16 exclusive, **en UTC**. Ventana actual: desde el 2025-08-16 inclusive hasta el 2025-09-15 exclusive, **en UTC**.\n- «Oyentes» = personas distintas (`plays.user_id`) con al menos una reproducción de ese género en la ventana. Alguien puede contar en las dos ventanas.\n- El género de una reproducción es el del artista del álbum de la canción (`plays` → `tracks` → `albums` → `artists`).\n- Solo géneros con al menos 30 oyentes en la ventana **previa**; por debajo el porcentaje no es interpretable.\n\nColumnas: `genero`, `oyentes_previos`, `oyentes_actuales` y `variacion_pct` (variación porcentual de la actual contra la previa, redondeada a 2 decimales). Ordena por `variacion_pct` descendente y, si hay empate debes desempatar usando `genero` ascendente.",
    learning_objective:
      "Comparar dos ventanas de tiempo sobre entidades distintas con agregación condicional y un umbral mínimo aplicado al período base.",
    theory_ref: l3,
    expected_columns: [
      { name: "genero", type: "text" },
      { name: "oyentes_previos", type: "integer" },
      { name: "oyentes_actuales", type: "integer" },
      { name: "variacion_pct", type: "numeric" },
    ],
    validation_rules: {
      order_matters: true,
      required_concepts: ["conditional_aggregation", "having"],
    },
    reference_solution:
      "WITH escuchas AS (\n  SELECT\n    ar.genre AS genero,\n    p.user_id,\n    p.played_at\n  FROM plays AS p\n  INNER JOIN users AS u ON u.id = p.user_id\n  INNER JOIN tracks AS t ON t.id = p.track_id\n  INNER JOIN albums AS al ON al.id = t.album_id\n  INNER JOIN artists AS ar ON ar.id = al.artist_id\n  WHERE u.country = 'MX'\n    AND p.played_at >= timestamptz '2025-07-17 00:00:00+00'\n    AND p.played_at <  timestamptz '2025-09-15 00:00:00+00'\n)\nSELECT\n  e.genero,\n  count(DISTINCT e.user_id) FILTER (WHERE e.played_at < timestamptz '2025-08-16 00:00:00+00') AS oyentes_previos,\n  count(DISTINCT e.user_id) FILTER (WHERE e.played_at >= timestamptz '2025-08-16 00:00:00+00') AS oyentes_actuales,\n  round(\n    100.0 * (\n      count(DISTINCT e.user_id) FILTER (WHERE e.played_at >= timestamptz '2025-08-16 00:00:00+00')\n      - count(DISTINCT e.user_id) FILTER (WHERE e.played_at < timestamptz '2025-08-16 00:00:00+00')\n    ) / count(DISTINCT e.user_id) FILTER (WHERE e.played_at < timestamptz '2025-08-16 00:00:00+00'),\n    2\n  ) AS variacion_pct\nFROM escuchas AS e\nGROUP BY e.genero\nHAVING count(DISTINCT e.user_id) FILTER (WHERE e.played_at < timestamptz '2025-08-16 00:00:00+00') >= 30\nORDER BY variacion_pct DESC, e.genero;",
    alternative_solutions: [
      {
        label: "Contando los oyentes por ventana en una CTE previa",
        sql: "WITH escuchas AS (SELECT ar.genre AS genero, p.user_id, CASE WHEN p.played_at < timestamptz '2025-08-16 00:00:00+00' THEN 'previa' ELSE 'actual' END AS ventana FROM plays AS p INNER JOIN users AS u ON u.id = p.user_id INNER JOIN tracks AS t ON t.id = p.track_id INNER JOIN albums AS al ON al.id = t.album_id INNER JOIN artists AS ar ON ar.id = al.artist_id WHERE u.country = 'MX' AND p.played_at >= timestamptz '2025-07-17 00:00:00+00' AND p.played_at < timestamptz '2025-09-15 00:00:00+00'), pares AS (SELECT DISTINCT genero, ventana, user_id FROM escuchas), conteos AS (SELECT genero, count(*) FILTER (WHERE ventana = 'previa') AS oyentes_previos, count(*) FILTER (WHERE ventana = 'actual') AS oyentes_actuales FROM pares GROUP BY genero) SELECT genero, oyentes_previos, oyentes_actuales, round(100.0 * (oyentes_actuales - oyentes_previos) / oyentes_previos, 2) AS variacion_pct FROM conteos WHERE oyentes_previos >= 30 ORDER BY variacion_pct DESC, genero;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Dos ventanas de tiempo, una fila por género: el mismo patrón de la agregación condicional. Trae las dos ventanas juntas en el filtro general y sepáralas dentro de cada columna. Ojo con qué cuentas: son **personas distintas**, no reproducciones.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "El género está a cuatro joins de distancia: `plays` → `tracks` (`track_id`) → `albums` (`album_id`) → `artists` (`artist_id`); el país sale de `users`. Conviene resolver eso en una CTE que devuelva género, `user_id` y `played_at`. Después, `count(DISTINCT user_id) FILTER (WHERE played_at < '2025-08-16')` y su espejo. El umbral de 30 se aplica sobre los oyentes **previos**, así que va en `HAVING` repitiendo esa misma expresión.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nWITH escuchas AS (\n  SELECT ar.genre AS genero, p.user_id, p.played_at\n  FROM plays AS p\n  INNER JOIN users AS u ON ___ = ___\n  INNER JOIN tracks AS t ON ___ = ___\n  INNER JOIN albums AS al ON ___ = ___\n  INNER JOIN artists AS ar ON ___ = ___\n  WHERE u.country = '___'\n    AND p.played_at >= timestamptz '2025-07-17 00:00:00+00'\n    AND p.played_at <  timestamptz '___'\n)\nSELECT\n  e.genero,\n  count(___ e.user_id) FILTER (WHERE e.played_at ___ timestamptz '2025-08-16 00:00:00+00') AS oyentes_previos,\n  count(___ e.user_id) FILTER (WHERE e.played_at ___ timestamptz '2025-08-16 00:00:00+00') AS oyentes_actuales,\n  round(100.0 * (___ - ___) / ___, 2) AS variacion_pct\nFROM escuchas AS e\nGROUP BY e.genero\nHAVING ___ >= 30\nORDER BY ___ DESC, ___;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "duplicates",
        description_md:
          "Usar `count(*)` en vez de `count(DISTINCT user_id)`: mides reproducciones, no audiencia. Un puñado de fanáticos puede hacer «crecer» un género que en realidad perdió oyentes.",
      },
      {
        category: "date_boundary",
        description_md:
          "Dejar las dos ventanas pegadas con `<=` y `>=` sobre el mismo instante: las reproducciones del 16 de agosto a las 00:00 caerían en ambas. Un extremo abierto y uno cerrado evitan superposiciones y huecos.",
      },
      {
        category: "join_condition",
        description_md:
          "Unir `plays` directo con `artists` por `track_id = artists.id`: la consulta corre, devuelve filas y el género no tiene nada que ver con la canción. Hay que pasar por `tracks` y `albums`.",
      },
      {
        category: "aggregation_level",
        description_md:
          "Aplicar el umbral con `WHERE oyentes_previos >= 30` sobre la misma consulta agregada: el alias no existe todavía en el `WHERE`. O va en `HAVING` con la expresión completa, o se envuelve el resultado en otra consulta.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da once géneros que superan el umbral. Arriba: `reguetón` +17,76 % (107 → 126 oyentes), `regional mexicano` +12,66 % (79 → 89) y `corridos` +10,23 % (342 → 377). Abajo: `sertanejo` −14,00 % (50 → 43), `trap latino` −11,11 % (36 → 32) y `vallenato` −10,34 % (116 → 104).\n\nEl dato accionable no es el primer puesto: es `corridos`. Un +10 % sobre 342 oyentes son 35 personas más; un +17,76 % sobre 107 son 19. El porcentaje ordena la tabla, pero la decisión de licencias se toma con el volumen. Por eso las tres columnas viajan juntas: una tabla que solo muestre la variación invita a invertir en el género más chico.\n\nEl umbral de 30 oyentes previos deja afuera `salsa` (13 → 17, +30,8 %) y `samba` (4 → 9, +125 %). Sin él, la tabla habría arrancado con un género de cuatro oyentes creciendo 125 %, y esa habría sido la primera línea del correo. Un umbral elegido de antemano es lo que separa un análisis de una anécdota.\n\nDetalle técnico: `count(DISTINCT user_id) FILTER (...)` cuenta personas distintas dentro de cada ventana por separado, que es lo que se quiere; quien escuchó en ambas suma en las dos columnas y no se duplica en ninguna. La versión alternativa con una CTE de pares `DISTINCT (genero, ventana, user_id)` da el mismo resultado y suele ser más rápida en tablas grandes, porque el `DISTINCT` se resuelve una sola vez en lugar de dentro de cada agregado.\n\nLimitación para la entrega: dos ventanas de 30 días no distinguen tendencia de estacionalidad. Antes de firmar una licencia conviene mirar los últimos doce meses del género.",
    improvement_feedback: [
      { condition: "no_table_alias_in_join", message_key: "improve.no_table_alias_in_join" },
    ],
    reward: defaultReward("advanced"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "cupon-bienvenida-y-recompra",
    section,
    title: "¿El cupón de bienvenida trae clientes que vuelven?",
    difficulty: "advanced",
    estimated_minutes: 18,
    concepts: ["cte", "ranking", "window_function", "subquery", "aggregate", "group_by", "case"],
    dataset: pidelo,
    tables_used: ["orders", "promotions"],
    scenario_md:
      "El departamento de Marketing de **Pídelo** quiere renovar el presupuesto del cupón de bienvenida y te pide argumentos:\n\n> «BIENVENIDA nos sale caro, es 30 % del primer pedido. Pero traen clientes fieles, ¿no? Necesito algo para el comité del martes.»\n\nLa pregunta real es si quien estrena la app con el cupón vuelve más que quien la estrena sin promoción. Para responderla hay que definir «estrenar», «volver» y en cuánto tiempo.",
    business_question_md:
      "Debes generar un dataset que compare dos grupos de clientes según cómo fue su **primer pedido entregado** y devuelve una fila por grupo.\n\nSupuestos fijados para este ejercicio:\n\n- Se consideran únicamente pedidos con `status = 'delivered'`. El primer pedido de cada cliente es el de menor `placed_at` entre los entregados; si hubiera empate exacto, gana el de menor `id`.\n- Entran solo los clientes cuyo primer pedido entregado ocurrió entre el 2025-06-01 inclusive y el 2025-07-01 exclusive **en UTC**, para que los 60 días de observación estén completos dentro de los datos.\n- Grupo `con BIENVENIDA`: el primer pedido usó la promoción con `promotions.code = 'BIENVENIDA'`. Grupo `sin promocion`: el primer pedido tiene `promotion_id` nulo. Los clientes cuyo primer pedido usó otra promoción quedan fuera del análisis.\n- «Volvió» = tiene otro pedido `delivered` con `placed_at` posterior al del primero y dentro de los 60 días siguientes (`<= placed_at + INTERVAL '60 days'`).\n\nColumnas: `grupo`, `clientes`, `recompraron` y `pct_recompra` (redondeado a 2 decimales). Ordena por `grupo` ascendente.",
    learning_objective:
      "Definir una cohorte a partir del primer evento de cada cliente y medir un comportamiento posterior en una ventana relativa a ese evento.",
    theory_ref: l1,
    expected_columns: [
      { name: "grupo", type: "text" },
      { name: "clientes", type: "integer" },
      { name: "recompraron", type: "integer" },
      { name: "pct_recompra", type: "numeric" },
    ],
    validation_rules: {
      order_matters: true,
      required_concepts: ["cte", "window_function"],
    },
    reference_solution:
      "WITH entregados AS (\n  SELECT\n    o.customer_id,\n    o.placed_at,\n    o.promotion_id,\n    row_number() OVER (PARTITION BY o.customer_id ORDER BY o.placed_at, o.id) AS n\n  FROM orders AS o\n  WHERE o.status = 'delivered'\n),\nprimeros AS (\n  SELECT\n    e.customer_id,\n    e.placed_at,\n    CASE WHEN pr.code = 'BIENVENIDA' THEN 'con BIENVENIDA' ELSE 'sin promocion' END AS grupo\n  FROM entregados AS e\n  LEFT JOIN promotions AS pr ON pr.id = e.promotion_id\n  WHERE e.n = 1\n    AND (pr.code = 'BIENVENIDA' OR e.promotion_id IS NULL)\n    AND e.placed_at >= timestamptz '2025-06-01 00:00:00+00'\n    AND e.placed_at <  timestamptz '2025-07-01 00:00:00+00'\n),\nmarcados AS (\n  SELECT\n    p.grupo,\n    CASE WHEN EXISTS (\n      SELECT 1\n      FROM orders AS o2\n      WHERE o2.customer_id = p.customer_id\n        AND o2.status = 'delivered'\n        AND o2.placed_at >  p.placed_at\n        AND o2.placed_at <= p.placed_at + INTERVAL '60 days'\n    ) THEN 1 ELSE 0 END AS recompro\n  FROM primeros AS p\n)\nSELECT\n  m.grupo,\n  count(*) AS clientes,\n  sum(m.recompro) AS recompraron,\n  round(100.0 * sum(m.recompro) / count(*), 2) AS pct_recompra\nFROM marcados AS m\nGROUP BY m.grupo\nORDER BY m.grupo;",
    alternative_solutions: [
      {
        label: "Con min() en lugar de row_number() y count FILTER",
        sql: "WITH primer_fecha AS (SELECT customer_id, min(placed_at) AS primera FROM orders WHERE status = 'delivered' GROUP BY customer_id), primeros AS (SELECT o.customer_id, o.placed_at, CASE WHEN pr.code = 'BIENVENIDA' THEN 'con BIENVENIDA' ELSE 'sin promocion' END AS grupo FROM orders AS o INNER JOIN primer_fecha AS pf ON pf.customer_id = o.customer_id AND pf.primera = o.placed_at LEFT JOIN promotions AS pr ON pr.id = o.promotion_id WHERE o.status = 'delivered' AND (pr.code = 'BIENVENIDA' OR o.promotion_id IS NULL) AND o.placed_at >= timestamptz '2025-06-01 00:00:00+00' AND o.placed_at < timestamptz '2025-07-01 00:00:00+00') SELECT p.grupo, count(*) AS clientes, count(*) FILTER (WHERE EXISTS (SELECT 1 FROM orders AS o2 WHERE o2.customer_id = p.customer_id AND o2.status = 'delivered' AND o2.placed_at > p.placed_at AND o2.placed_at <= p.placed_at + INTERVAL '60 days')) AS recompraron, round(100.0 * count(*) FILTER (WHERE EXISTS (SELECT 1 FROM orders AS o2 WHERE o2.customer_id = p.customer_id AND o2.status = 'delivered' AND o2.placed_at > p.placed_at AND o2.placed_at <= p.placed_at + INTERVAL '60 days')) / count(*), 2) AS pct_recompra FROM primeros AS p GROUP BY p.grupo ORDER BY p.grupo;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Son tres pasos encadenados y conviene una CTE por paso: (1) identificar el primer pedido entregado de cada cliente, (2) quedarte con los que caen en junio de 2025 y clasificarlos en dos grupos, (3) preguntar por cada uno si volvió dentro de sus 60 días. La ventana de 60 días es distinta para cada cliente: se cuenta desde **su** primer pedido.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Para el paso 1, `row_number() OVER (PARTITION BY customer_id ORDER BY placed_at, id)` y después `WHERE n = 1`. El grupo sale de un `LEFT JOIN` con `promotions`: es `'con BIENVENIDA'` cuando `code = 'BIENVENIDA'` y `'sin promocion'` cuando `promotion_id IS NULL`; cualquier otro caso se descarta en el mismo `WHERE`. Para el paso 3, `EXISTS` con una subconsulta correlacionada sobre `orders` es más simple que otro join, porque solo necesitas saber si hay al menos uno.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nWITH entregados AS (\n  SELECT o.customer_id, o.placed_at, o.promotion_id,\n         ___ OVER (PARTITION BY ___ ORDER BY ___, o.id) AS n\n  FROM orders AS o\n  WHERE o.status = '___'\n),\nprimeros AS (\n  SELECT e.customer_id, e.placed_at,\n         CASE WHEN pr.code = '___' THEN 'con BIENVENIDA' ELSE 'sin promocion' END AS grupo\n  FROM entregados AS e\n  ___ JOIN promotions AS pr ON pr.id = e.promotion_id\n  WHERE e.n = ___\n    AND (pr.code = 'BIENVENIDA' OR e.promotion_id ___)\n    AND e.placed_at >= timestamptz '2025-06-01 00:00:00+00'\n    AND e.placed_at <  timestamptz '___'\n)\nSELECT\n  p.grupo,\n  count(*) AS clientes,\n  count(*) FILTER (WHERE ___ (\n    SELECT 1 FROM orders AS o2\n    WHERE o2.customer_id = ___\n      AND o2.status = 'delivered'\n      AND o2.placed_at ___ p.placed_at\n      AND o2.placed_at <= p.placed_at + INTERVAL '___'\n  )) AS recompraron,\n  round(100.0 * ___ / count(*), 2) AS pct_recompra\nFROM primeros AS p\nGROUP BY p.grupo\nORDER BY ___;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "date_boundary",
        description_md:
          "Medir los 60 días desde una fecha fija (por ejemplo, desde el 1 de junio para todos) en lugar de desde el primer pedido de cada cliente: quien estrenó el 29 de junio tendría 32 días para volver y quien estrenó el 1 de junio, 60.",
      },
      {
        category: "duplicates",
        description_md:
          "Contar pedidos de recompra en vez de clientes que recompraron: quien volvió cuatro veces sumaría cuatro y el porcentaje podría pasar de 100.",
      },
      {
        category: "missing_filter",
        description_md:
          "Incluir en el grupo `sin promocion` a los clientes cuyo primer pedido usó otro cupón (ENVIOGRATIS, FINDE…): el grupo de control deja de ser «sin promoción» y la comparación pierde sentido.",
      },
      {
        category: "aggregation_level",
        description_md:
          "Definir el primer pedido sobre todos los pedidos, incluidos cancelados: un cliente cuyo primer intento se canceló quedaría clasificado por un pedido que nunca recibió.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da dos filas: el grupo `con BIENVENIDA` tiene 177 clientes, de los cuales 80 volvieron dentro de 60 días (45,20 %); `sin promocion` tiene 2777 clientes y 1114 recompras (40,12 %). Cinco puntos de diferencia a favor del cupón.\n\nY ahora la parte que hay que escribir en el correo, porque el comité no la va a preguntar: **esto no demuestra que el cupón cause la fidelidad**. Los dos grupos no se formaron al azar. Quien busca y aplica un código de descuento ya es alguien más motivado, más digital y más sensible al precio que el promedio; probablemente habría vuelto igual. Para separar el efecto del cupón del efecto de quién lo usa hace falta un experimento con asignación aleatoria, no una consulta.\n\nTambién importa el tamaño: 177 clientes contra 2777. Con 177 casos, una diferencia de cinco puntos es perfectamente compatible con el azar. La entrega honesta dice «+5 pp, muestra chica, sin control de selección» y propone medir bien la próxima campaña.\n\nSobre la técnica: `row_number()` sobre `placed_at, id` fija el primer pedido de forma determinista incluso si dos pedidos comparten instante; `min(placed_at)` con un join de vuelta hace lo mismo pero devolvería dos filas ante un empate exacto. El `LEFT JOIN` con `promotions` es obligatorio: con `INNER JOIN` desaparecerían todos los pedidos sin promoción, es decir, el grupo de control entero. Y el `EXISTS` correlacionado evita duplicar clientes: pregunta «¿hay al menos uno?» y se detiene en el primero, mientras que un join contra los pedidos posteriores habría requerido un `DISTINCT` para volver al grano de cliente.",
    improvement_feedback: [
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
    slug: "volumen-transaccionado-en-dolares",
    section,
    title: "¿Por qué cae el volumen transaccionado?",
    difficulty: "expert",
    estimated_minutes: 20,
    concepts: [
      "cte",
      "outer_join",
      "null_handling",
      "aggregate",
      "group_by",
      "date_functions",
      "distinct",
    ],
    dataset: bolsillo,
    tables_used: ["transactions", "accounts", "fx_rates"],
    scenario_md:
      "El CFO de **Bolsillo** te escribe después del comité:\n\n> «El volumen transaccionado viene cayendo todo el año y nadie me sabe decir si es que transaccionamos menos o que la gente gasta menos. Necesito la serie del año en dólares, comparable entre países.»\n\nLos montos están en la moneda de cada cuenta. La tabla `fx_rates` tiene una cotización diaria por moneda (`usd_rate` = unidades de moneda local por dólar) para las seis monedas locales, pero **no** para las cuentas en USD.",
    business_question_md:
      "Debes generar un dataset que devuelva la serie mensual de enero a agosto de 2025, una fila por mes.\n\nSupuestos fijados para este ejercicio:\n\n- «Pago» = movimiento de `transactions` con `kind` en `'card_payment'` o `'qr_payment'` y `status = 'completed'`. Quedan fuera recargas, retiros, comisiones, transferencias, reversos y todo lo que no se completó.\n- Período: `created_at` desde el 2025-01-01 inclusive hasta el 2025-09-01 exclusive, **en UTC**; el mes se calcula truncando `created_at AT TIME ZONE 'UTC'`.\n- Conversión: divide `amount` por la `usd_rate` de la **misma moneda** y del **mismo día** de la operación (la fecha del movimiento en UTC). Las cuentas en USD no figuran en `fx_rates`: se toman con tasa 1.\n- «Usuario activo» = persona distinta (`accounts.user_id`) con al menos un pago en ese mes.\n\nColumnas: `mes` (primer día del mes, tipo `date`), `usuarios_activos`, `pagos`, `volumen_usd` (redondeado a 2 decimales) y `ticket_usd` (volumen sobre cantidad de pagos, redondeado a 2 decimales). Ordena por `mes` ascendente.",
    learning_objective:
      "Normalizar importes multimoneda con una tabla de cotizaciones diarias y descomponer la evolución de una métrica en usuarios, frecuencia y ticket.",
    theory_ref: l2,
    expected_columns: [
      { name: "mes", type: "date" },
      { name: "usuarios_activos", type: "integer" },
      { name: "pagos", type: "integer" },
      { name: "volumen_usd", type: "numeric" },
      { name: "ticket_usd", type: "numeric" },
    ],
    validation_rules: {
      order_matters: true,
      required_concepts: ["cte", "outer_join", "null_handling"],
    },
    reference_solution:
      "WITH pagos AS (\n  SELECT\n    date_trunc('month', t.created_at AT TIME ZONE 'UTC')::date AS mes,\n    a.user_id,\n    t.amount / coalesce(f.usd_rate, 1) AS monto_usd\n  FROM transactions AS t\n  INNER JOIN accounts AS a ON a.id = t.account_id\n  LEFT JOIN fx_rates AS f\n    ON f.currency = t.currency\n   AND f.rate_date = (t.created_at AT TIME ZONE 'UTC')::date\n  WHERE t.kind IN ('card_payment', 'qr_payment')\n    AND t.status = 'completed'\n    AND t.created_at >= timestamptz '2025-01-01 00:00:00+00'\n    AND t.created_at <  timestamptz '2025-09-01 00:00:00+00'\n)\nSELECT\n  p.mes,\n  count(DISTINCT p.user_id) AS usuarios_activos,\n  count(*) AS pagos,\n  round(sum(p.monto_usd), 2) AS volumen_usd,\n  round(sum(p.monto_usd) / count(*), 2) AS ticket_usd\nFROM pagos AS p\nGROUP BY p.mes\nORDER BY p.mes;",
    alternative_solutions: [
      {
        label: "Con avg() para el ticket y la conversión en el SELECT",
        sql: "WITH pagos AS (SELECT date_trunc('month', t.created_at AT TIME ZONE 'UTC')::date AS mes, a.user_id, t.amount / coalesce(f.usd_rate, 1) AS monto_usd FROM transactions AS t INNER JOIN accounts AS a ON a.id = t.account_id LEFT JOIN fx_rates AS f ON f.currency = t.currency AND f.rate_date = (t.created_at AT TIME ZONE 'UTC')::date WHERE t.kind IN ('card_payment', 'qr_payment') AND t.status = 'completed' AND t.created_at >= timestamptz '2025-01-01 00:00:00+00' AND t.created_at < timestamptz '2025-09-01 00:00:00+00') SELECT mes, count(DISTINCT user_id) AS usuarios_activos, count(*) AS pagos, round(sum(monto_usd), 2) AS volumen_usd, round(avg(monto_usd), 2) AS ticket_usd FROM pagos GROUP BY mes ORDER BY mes;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Dos problemas separados. Primero, cada pago tiene que quedar expresado en dólares antes de sumarlo: eso se resuelve fila por fila, en una CTE. Segundo, la serie mensual descompone el volumen en sus factores (cuánta gente, cuántos pagos, de qué tamaño) para que se vea qué se movió.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "La cotización se busca por dos columnas a la vez: `f.currency = t.currency AND f.rate_date = (t.created_at AT TIME ZONE 'UTC')::date`. Tiene que ser `LEFT JOIN`, porque las cuentas en USD no tienen fila en `fx_rates`; `coalesce(f.usd_rate, 1)` las deja en 1. El `user_id` no está en `transactions`: viene de `accounts`. Y `usuarios_activos` cuenta personas distintas dentro del mes.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nWITH pagos AS (\n  SELECT\n    date_trunc('___', t.created_at AT TIME ZONE '___')::date AS mes,\n    a.user_id,\n    t.amount / ___(f.usd_rate, ___) AS monto_usd\n  FROM transactions AS t\n  INNER JOIN accounts AS a ON ___ = ___\n  ___ JOIN fx_rates AS f\n    ON f.currency = ___\n   AND f.rate_date = (t.created_at AT TIME ZONE 'UTC')::date\n  WHERE t.kind IN ('___', '___')\n    AND t.status = '___'\n    AND t.created_at >= timestamptz '2025-01-01 00:00:00+00'\n    AND t.created_at <  timestamptz '___'\n)\nSELECT\n  p.mes,\n  count(___ p.user_id) AS usuarios_activos,\n  count(*) AS pagos,\n  round(sum(p.monto_usd), 2) AS volumen_usd,\n  round(___ / ___, 2) AS ticket_usd\nFROM pagos AS p\nGROUP BY p.mes\nORDER BY ___;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "join_condition",
        description_md:
          "Unir `fx_rates` solo por moneda, sin la fecha: cada pago se multiplica por las 624 cotizaciones de esa moneda y el volumen se vuelve absurdo. El chequeo de «¿el join duplicó filas?» lo detecta de inmediato.",
      },
      {
        category: "null_handling",
        description_md:
          "Usar `INNER JOIN` con `fx_rates`: los pagos de cuentas en USD desaparecen sin aviso, porque esa moneda no está en la tabla de cotizaciones.",
      },
      {
        category: "date_boundary",
        description_md:
          "Truncar el mes sin `AT TIME ZONE 'UTC'`: `created_at` es `timestamptz` y el corte se desplaza con la zona horaria de la sesión. Aquí esa zona es UTC y el número coincide, pero en un servidor configurado en otra zona los movimientos de las primeras horas del día 1 cambian de mes.",
      },
      {
        category: "aggregation_level",
        description_md:
          "Calcular el ticket como `avg(amount)` sobre los importes locales en vez de sobre los convertidos: un promedio entre pesos colombianos y soles no es un ticket, es un número.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da ocho filas, una por mes. La serie contesta la pregunta del CFO en una línea: el volumen cayó de 68 320,88 USD en enero a 30 880,63 en agosto (−55 %), y el ticket promedio pasó de 94,50 a 86,50 (−8 %). La gente **no** gasta mucho menos por pago: hay mucha menos gente pagando. Los usuarios activos bajaron de 281 a 126 (−55 %) y los pagos de 723 a 357.\n\nPuesto en la descomposición de la primera lección: volumen = usuarios activos × pagos por usuario × ticket. Los pagos por usuario oscilan entre 2,4 y 3,2 sin tendencia sostenida y el ticket apenas se mueve. El único factor que colapsa es la base activa. La conversación que sigue no es de precios: es de retención o de adquisición.\n\nTres decisiones técnicas que sostienen el número. (1) La conversión usa la cotización **del día de la operación**, no la de hoy: así el enero de este informe es igual al enero del informe del mes que viene. Con la cotización actual, cada ejecución reescribiría la historia. (2) El `LEFT JOIN` con `coalesce(..., 1)` conserva las 462 cuentas en dólares; con `INNER JOIN` se habrían evaporado sin error. (3) `date_trunc` sobre `created_at AT TIME ZONE 'UTC'` deja el corte de mes anclado y reproducible en cualquier máquina.\n\n`round(sum(monto_usd) / count(*), 2)` y `round(avg(monto_usd), 2)` dan idéntico resultado porque ninguno de los montos es nulo. Si lo fueran, `avg` los ignoraría y `sum/count(*)` los contaría como cero en el denominador: dos tickets distintos con el mismo nombre. Vale la pena saber cuál estás usando.\n\nLimitación para la entrega: los datos llegan hasta el 15 de septiembre y la serie corta en agosto por eso, no porque septiembre sea malo. Decirlo evita que alguien dibuje la proyección equivocada.",
    improvement_feedback: [
      { condition: "no_table_alias_in_join", message_key: "improve.no_table_alias_in_join" },
      { condition: "uses_select_star", message_key: "improve.uses_select_star" },
    ],
    reward: defaultReward("expert"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
];
