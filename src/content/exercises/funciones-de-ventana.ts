import {
  defaultHintMeta,
  defaultReward,
  defaultSolutionUnlock,
  type ExerciseDef,
} from "../schemas/exercise";

const section = "funciones-de-ventana";
const dataset = { slug: "bolsillo", version: 1 };
const over = "ventana-over-partition";
const marcos = "ventana-order-by-y-marcos";

export const exercises: ExerciseDef[] = [
  {
    slug: "pagos-qr-contra-el-promedio",
    section,
    title: "Pagos QR contra el promedio",
    difficulty: "intermediate",
    estimated_minutes: 7,
    concepts: ["window_function", "where", "alias", "numeric_functions"],
    dataset,
    tables_used: ["transactions"],
    scenario_md:
      "En **Bolsillo**, Riesgo revisa la cuenta **2364** (una de las más activas). Quiere ver cada pago QR completado junto al promedio de esos pagos y cuánto se desvía cada uno.",
    business_question_md:
      "Para los movimientos de `account_id = 2364` con `kind = 'qr_payment'` y `status = 'completed'`, devuelve `id`, `amount`, el promedio de `amount` del conjunto como `promedio` (2 decimales) y `amount - promedio` como `diferencia` (2 decimales). El orden no importa.",
    learning_objective: "Usar OVER () para poner un agregado al lado de cada fila.",
    theory_ref: over,
    expected_columns: [
      { name: "id", type: "integer" },
      { name: "amount", type: "numeric" },
      { name: "promedio", type: "numeric" },
      { name: "diferencia", type: "numeric" },
    ],
    validation_rules: { required_concepts: ["window_function"] },
    reference_solution:
      "SELECT\n  id,\n  amount,\n  round(avg(amount) OVER (), 2) AS promedio,\n  round(amount - avg(amount) OVER (), 2) AS diferencia\nFROM transactions\nWHERE account_id = 2364\n  AND kind = 'qr_payment'\n  AND status = 'completed';",
    hints: [
      {
        level: 1,
        body_md:
          "Con `GROUP BY` perderías el detalle; una función de ventana calcula el promedio sin colapsar filas.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "`avg(amount) OVER ()` promedia todas las filas que pasan el `WHERE`. Réstalo a `amount` para la diferencia.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT\n  id,\n  amount,\n  round(avg(amount) OVER (), 2) AS promedio,\n  round(amount - avg(amount) ___ (), 2) AS diferencia\nFROM transactions\nWHERE account_id = ___\n  AND kind = 'qr_payment'\n  AND status = 'completed';\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "aggregation_level",
        description_md: "Usar `avg(amount)` sin `OVER`: error de columnas sin agrupar.",
      },
      {
        category: "missing_filter",
        description_md:
          "Omitir `status = 'completed'`: el promedio incluye pagos fallidos o pendientes.",
      },
      {
        category: "cell_values",
        description_md: "No redondear.",
      },
    ],
    expert_explanation_md:
      "52 pagos con un promedio de 85 716.17 ARS. Cada fila conserva su importe y muestra la misma cifra en `promedio`: la ventana se calculó sobre las 52 filas que sobrevivieron al `WHERE`.\n\nEs el mismo resultado que obtendrías con una subconsulta que calcule el promedio y un JOIN, pero en una sola pasada y mucho más legible.",
    reward: defaultReward("intermediate"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "participacion-por-rubro-uruguay",
    section,
    title: "Participación por rubro en Uruguay",
    difficulty: "advanced",
    estimated_minutes: 9,
    concepts: ["window_function", "group_by", "aggregate", "inner_join", "order_by"],
    dataset,
    tables_used: ["transactions", "merchants", "accounts"],
    scenario_md:
      "Comercial quiere saber en qué rubros gastan las cuentas en pesos uruguayos (`accounts.currency = 'UYU'`) y qué porcentaje del gasto representa cada rubro.",
    business_question_md:
      "Para los movimientos con `kind` en (`'card_payment'`, `'qr_payment'`), `status = 'completed'` y cuenta en `'UYU'`, devuelve `category` del comercio, la suma de `amount` como `total` y el porcentaje de ese total sobre la suma de todos los rubros como `pct` (2 decimales), ordenado por `total` descendente.",
    learning_objective:
      "Combinar GROUP BY con una ventana sobre el agregado para calcular participación.",
    theory_ref: over,
    expected_columns: [
      { name: "category", type: "text" },
      { name: "total", type: "numeric" },
      { name: "pct", type: "numeric" },
    ],
    validation_rules: { order_matters: true, required_concepts: ["window_function", "group_by"] },
    reference_solution:
      "SELECT\n  m.category,\n  sum(t.amount) AS total,\n  round(100 * sum(t.amount) / sum(sum(t.amount)) OVER (), 2) AS pct\nFROM transactions AS t\nINNER JOIN merchants AS m ON m.id = t.merchant_id\nINNER JOIN accounts AS a ON a.id = t.account_id\nWHERE a.currency = 'UYU'\n  AND t.kind IN ('card_payment', 'qr_payment')\n  AND t.status = 'completed'\nGROUP BY m.category\nORDER BY total DESC;",
    hints: [
      {
        level: 1,
        body_md:
          "Primero el total por rubro (`GROUP BY`); luego una ventana `OVER ()` sobre ese total para obtener el gran total.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "El denominador es `sum(sum(t.amount)) OVER ()`: la suma de los totales de todos los grupos. Une `merchants` y `accounts` para filtrar rubro y moneda.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT\n  m.category,\n  sum(t.amount) AS total,\n  round(100 * sum(t.amount) / sum(___(t.amount)) OVER (), 2) AS pct\nFROM transactions AS t\nINNER JOIN merchants AS m ON m.id = t.merchant_id\nINNER JOIN accounts AS a ON a.id = t.account_id\nWHERE a.currency = '___'\n  AND t.kind IN ('card_payment', 'qr_payment')\n  AND t.status = 'completed'\nGROUP BY m.category\nORDER BY total DESC;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "aggregation_level",
        description_md:
          "`sum(t.amount) OVER ()` sin el `sum` interno: no es válido junto a `GROUP BY` (la ventana debe operar sobre el agregado).",
      },
      {
        category: "missing_filter",
        description_md:
          "Filtrar por `t.currency` es equivalente aquí, pero olvidar el filtro de moneda mezcla siete monedas.",
      },
      {
        category: "cell_values",
        description_md: "Calcular `pct` con enteros o sin `round`.",
      },
    ],
    expert_explanation_md:
      "Diez rubros; restaurantes y transporte encabezan con ~16 % y ~14 %, y los porcentajes suman 100. El patrón `agregado / sum(agregado) OVER ()` es la forma habitual de calcular «participación sobre el total» en SQL moderno.\n\nEl filtro de moneda va antes de la ventana: así el 100 % es el gasto en UYU, no el de toda la plataforma.",
    reward: defaultReward("advanced"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "saldo-acumulado-de-la-cuenta-2364",
    section,
    title: "Saldo acumulado de la cuenta 2364",
    difficulty: "advanced",
    estimated_minutes: 9,
    concepts: ["window_function", "case", "order_by", "where"],
    dataset,
    tables_used: ["transactions"],
    scenario_md:
      "Atención al cliente reconstruye el extracto de la cuenta **2364**: cada movimiento con el saldo resultante después de aplicarlo. Los créditos suman y los débitos restan; solo cuentan los movimientos `completed` o `reversed`.",
    business_question_md:
      "Para `account_id = 2364` y `status` en (`'completed'`, `'reversed'`), devuelve `id`, `created_at`, `direction`, `amount` y el saldo acumulado como `saldo` (suma con signo de los movimientos hasta esa fila inclusive, ordenados por `created_at` y luego `id`). Ordena el resultado por `created_at`, `id`.",
    learning_objective:
      "Construir un acumulado con ORDER BY en la ventana y un CASE para el signo.",
    theory_ref: marcos,
    expected_columns: [
      { name: "id", type: "integer" },
      { name: "created_at", type: "timestamp" },
      { name: "direction", type: "text" },
      { name: "amount", type: "numeric" },
      { name: "saldo", type: "numeric" },
    ],
    validation_rules: { order_matters: true, required_concepts: ["window_function", "case"] },
    reference_solution:
      "SELECT\n  id,\n  created_at,\n  direction,\n  amount,\n  sum(CASE WHEN direction = 'credit' THEN amount ELSE -amount END)\n    OVER (ORDER BY created_at, id) AS saldo\nFROM transactions\nWHERE account_id = 2364\n  AND status IN ('completed', 'reversed')\nORDER BY created_at, id;",
    alternative_solutions: [
      {
        label: "Marco explícito",
        sql: "SELECT id, created_at, direction, amount, sum(CASE WHEN direction = 'credit' THEN amount ELSE -amount END) OVER (ORDER BY created_at, id ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS saldo FROM transactions WHERE account_id = 2364 AND status IN ('completed', 'reversed') ORDER BY created_at, id;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Un acumulado es `sum(...) OVER (ORDER BY ...)`. Antes, convierte los débitos en negativos con `CASE`.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Incluye `id` como segundo criterio en el `ORDER BY` de la ventana para desempatar timestamps iguales.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT\n  id,\n  created_at,\n  direction,\n  amount,\n  sum(CASE WHEN direction = '___' THEN amount ELSE -amount END)\n    OVER (ORDER BY created_at, ___) AS saldo\nFROM transactions\nWHERE account_id = 2364\n  AND status IN ('completed', 'reversed')\nORDER BY created_at, id;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "cell_values",
        description_md: "Sumar `amount` sin signo: el «saldo» solo crece.",
      },
      {
        category: "missing_filter",
        description_md:
          "Incluir movimientos `failed` o `pending`: alteran el saldo sin haber ocurrido.",
      },
      {
        category: "wrong_order",
        description_md:
          "Ordenar la ventana solo por `created_at`: con `RANGE` por defecto, dos movimientos del mismo instante compartirían saldo.",
      },
    ],
    expert_explanation_md:
      "183 movimientos; la última fila del extracto coincide con `accounts.balance` de la cuenta, porque el saldo se define exactamente como esta suma con signo. Es una verificación útil: si no coincidiera, habría movimientos mal clasificados.\n\nLos pagos `reversed` restan y luego su `reversal` suma la misma cifra: el extracto muestra ambos, como un resumen bancario real.",
    reward: defaultReward("advanced"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "intentos-kyc-por-persona",
    section,
    title: "Intentos KYC por persona",
    difficulty: "intermediate",
    estimated_minutes: 7,
    concepts: ["window_function", "inner_join", "where", "order_by"],
    dataset,
    tables_used: ["kyc_events", "users"],
    scenario_md:
      "Cumplimiento revisa el proceso de verificación de identidad en Uruguay: quiere ver cada evento KYC junto con el total de intentos que hizo esa persona.",
    business_question_md:
      "Para las personas con `country = 'UY'`, devuelve `user_id`, `event_at`, `outcome` y la cantidad total de eventos de esa persona como `intentos`, ordenado por `user_id` y luego `event_at`.",
    learning_objective:
      "Usar PARTITION BY sin ORDER BY para repetir el total del grupo en cada fila.",
    theory_ref: marcos,
    expected_columns: [
      { name: "user_id", type: "integer" },
      { name: "event_at", type: "timestamp" },
      { name: "outcome", type: "text" },
      { name: "intentos", type: "integer" },
    ],
    validation_rules: { order_matters: true, required_concepts: ["window_function", "inner_join"] },
    reference_solution:
      "SELECT\n  k.user_id,\n  k.event_at,\n  k.outcome,\n  count(*) OVER (PARTITION BY k.user_id) AS intentos\nFROM kyc_events AS k\nINNER JOIN users AS u ON u.id = k.user_id\nWHERE u.country = 'UY'\nORDER BY k.user_id, k.event_at;",
    hints: [
      {
        level: 1,
        body_md:
          "`count(*) OVER (PARTITION BY user_id)` cuenta los eventos de cada persona y lo muestra en cada una de sus filas.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "No pongas `ORDER BY` dentro de la ventana: convertiría el total en un acumulado 1, 2, 3…",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT\n  k.user_id,\n  k.event_at,\n  k.outcome,\n  count(*) OVER (PARTITION BY ___) AS intentos\nFROM kyc_events AS k\nINNER JOIN users AS u ON u.id = k.user_id\nWHERE u.country = '___'\nORDER BY k.user_id, k.event_at;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "cell_values",
        description_md:
          "`count(*) OVER (PARTITION BY user_id ORDER BY event_at)`: devuelve el acumulado, no el total.",
      },
      {
        category: "aggregation_level",
        description_md: "`GROUP BY user_id`: pierde el detalle de cada evento.",
      },
      {
        category: "wrong_order",
        description_md: "No ordenar el resultado.",
      },
    ],
    expert_explanation_md:
      "296 eventos. Las personas con `intentos` mayor que su `kyc_level` tuvieron rechazos en el camino: comparar ambas cifras es la base del análisis de fricción del proceso.\n\nLa ventana se evalúa después del `WHERE`, así que el conteo solo incluye eventos de personas uruguayas, exactamente lo que se pide.",
    reward: defaultReward("intermediate"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "desafio-media-movil-del-dolar",
    section,
    title: "Desafío: media móvil del dólar",
    difficulty: "advanced",
    estimated_minutes: 10,
    concepts: ["window_function", "order_by", "where", "numeric_functions"],
    dataset,
    tables_used: ["fx_rates"],
    scenario_md:
      "Tesorería sigue la cotización diaria del peso argentino frente al dólar y quiere suavizar el ruido con una media móvil de 7 días (los 6 días anteriores más el actual).",
    business_question_md:
      "Para `currency = 'ARS'` y `rate_date` en agosto de 2025 (del 1 al 31), devuelve `rate_date`, `usd_rate` y la media móvil de `usd_rate` sobre las 7 filas que terminan en la actual como `media_7d` (4 decimales), ordenado por `rate_date`. Las primeras filas promedian las que haya disponibles dentro del filtro.",
    learning_objective: "Definir un marco de ventana con ROWS BETWEEN para una media móvil.",
    theory_ref: marcos,
    expected_columns: [
      { name: "rate_date", type: "date" },
      { name: "usd_rate", type: "numeric" },
      { name: "media_7d", type: "numeric" },
    ],
    validation_rules: {
      order_matters: true,
      required_concepts: ["window_function"],
      numeric_tolerance: 0.001,
    },
    reference_solution:
      "SELECT\n  rate_date,\n  usd_rate,\n  round(avg(usd_rate) OVER (\n    ORDER BY rate_date\n    ROWS BETWEEN 6 PRECEDING AND CURRENT ROW\n  ), 4) AS media_7d\nFROM fx_rates\nWHERE currency = 'ARS'\n  AND rate_date >= '2025-08-01'\n  AND rate_date < '2025-09-01'\nORDER BY rate_date;",
    hints: [
      {
        level: 1,
        body_md:
          "El marco por defecto acumula desde el inicio; para una ventana móvil hay que declarar el marco con `ROWS BETWEEN`.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "«7 días incluido el actual» son 6 filas anteriores más la actual. Filtra moneda y mes en `WHERE`.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT\n  rate_date,\n  usd_rate,\n  round(avg(usd_rate) OVER (\n    ORDER BY rate_date\n    ROWS BETWEEN ___ PRECEDING AND CURRENT ROW\n  ), 4) AS media_7d\nFROM fx_rates\nWHERE currency = 'ARS'\n  AND rate_date >= '2025-08-01'\n  AND rate_date < '2025-09-01'\nORDER BY rate_date;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "cell_values",
        description_md: "`7 PRECEDING`: ventana de 8 días.",
      },
      {
        category: "cell_values",
        description_md:
          "Omitir el marco: el resultado es el promedio acumulado desde el 1 de agosto.",
      },
      {
        category: "missing_filter",
        description_md:
          "Olvidar `currency = 'ARS'`: la ventana mezcla seis monedas ordenadas por fecha.",
      },
    ],
    expert_explanation_md:
      "31 filas. Las seis primeras promedian menos de 7 valores porque el filtro corta la serie el 1 de agosto; si quisieras una media completa desde el primer día, tendrías que filtrar **después** de calcular la ventana (subconsulta), incluyendo los últimos días de julio.\n\nEsa diferencia entre «filtrar antes» y «filtrar después» de la ventana es una de las decisiones más frecuentes en analítica de series.",
    reward: defaultReward("advanced"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
];
