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
      "En **Bolsillo**, el departamento de Riesgo está revisando la cuenta número **2364**, que es una de las más activas de la plataforma. Quiere ver cada pago con código QR completado junto al promedio de esos pagos y cuánto se desvía cada uno de ese promedio. Te piden ese detalle para decidir si corresponde abrir una alerta.",
    business_question_md:
      "Debes generar un dataset que, tomando los movimientos cuya columna `account_id` es igual a `2364`, cuyo `kind` es igual al texto `'qr_payment'` y cuyo `status` es igual al texto `'completed'`, devuelva el `id`, el `amount`, el promedio de `amount` de todo el conjunto bajo el encabezado `promedio` con 2 decimales, y la resta entre el importe de la fila y ese promedio bajo el encabezado `diferencia`, también con 2 decimales. El orden de las filas no importa.",
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
          "Con una cláusula `GROUP BY` perderías el detalle de cada movimiento; una función de ventana calcula el promedio sin colapsar las filas.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "La expresión `avg(amount) OVER ()` promedia todas las filas que pasaron el filtro de la cláusula `WHERE`. Réstala a `amount` para obtener la diferencia de cada fila.",
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
        description_md:
          "Escribir `avg(amount)` sin la cláusula `OVER`: PostgreSQL devuelve un error porque las columnas de detalle no están agrupadas.",
      },
      {
        category: "missing_filter",
        description_md:
          "Omitir la condición `status = 'completed'`: el promedio incluye pagos fallidos o pendientes, que nunca movieron dinero.",
      },
      {
        category: "cell_values",
        description_md:
          "No redondear los dos valores calculados: las celdas salen con todos los decimales y no coinciden con lo pedido.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 52 pagos, con un promedio de 85 716.17 pesos argentinos. Cada fila conserva su propio importe y muestra siempre la misma cifra en la columna `promedio`: la ventana se calculó sobre las 52 filas que sobrevivieron al filtro.\n\nEs el mismo resultado que obtendrías con una subconsulta que calcule el promedio y un cruce para pegarlo a cada fila, pero resuelto en una sola pasada y mucho más legible.",
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
      "El departamento Comercial quiere saber en qué rubros gastan las cuentas denominadas en pesos uruguayos, que son las que tienen `accounts.currency` igual al texto `'UYU'`, y qué porcentaje del gasto total representa cada rubro. Te piden ese reporte para orientar los acuerdos con comercios del próximo semestre.",
    business_question_md:
      "Debes generar un dataset que, tomando los movimientos cuyo `kind` es `'card_payment'` o `'qr_payment'`, cuyo `status` es igual al texto `'completed'` y cuya cuenta tiene `currency` igual al texto `'UYU'`, devuelva la `category` del comercio, la suma de `amount` bajo el encabezado `total` y el porcentaje que ese total representa sobre la suma de todos los rubros bajo el encabezado `pct` con 2 decimales, ordenado por `total` descendente.",
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
          "Primero calcula el total por rubro con una cláusula `GROUP BY`; después aplica una ventana `OVER ()` sobre ese total ya calculado para obtener el gran total de todos los rubros.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "El denominador se escribe como `sum(sum(t.amount)) OVER ()`, es decir, la suma de los totales de todos los grupos. Une las tablas `merchants` y `accounts` para poder filtrar por rubro y por moneda.",
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
          "Escribir `sum(t.amount) OVER ()` sin la suma interna: esa forma no es válida junto a una cláusula `GROUP BY`, porque la ventana tiene que operar sobre el agregado ya calculado.",
      },
      {
        category: "missing_filter",
        description_md:
          "Filtrar por `t.currency` es equivalente en estos datos, pero olvidar por completo el filtro de moneda mezcla siete monedas distintas en una misma suma.",
      },
      {
        category: "cell_values",
        description_md:
          "Calcular la columna `pct` con aritmética entera, o sin la función `round`: en el primer caso los porcentajes se truncan y en el segundo salen con demasiados decimales.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da diez rubros; restaurantes y transporte encabezan la tabla con alrededor del 16 % y del 14 % respectivamente, y los porcentajes suman 100. El patrón `agregado / sum(agregado) OVER ()` es la forma habitual de calcular la participación sobre el total en SQL moderno.\n\nEl filtro de moneda se aplica antes de la ventana, y eso es deliberado: así el 100 % de referencia es el gasto en pesos uruguayos y no el de toda la plataforma.",
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
      "El departamento de Atención al Cliente está reconstruyendo el extracto de la cuenta número **2364**: necesita cada movimiento con el saldo resultante después de aplicarlo. Los créditos suman y los débitos restan, y solo deben contarse los movimientos cuyo `status` es `'completed'` o `'reversed'`. Te piden ese extracto para poder explicárselo a la persona titular de la cuenta.",
    business_question_md:
      "Debes generar un dataset que, tomando los movimientos cuya columna `account_id` es igual a `2364` y cuyo `status` es `'completed'` o `'reversed'`, devuelva el `id`, el `created_at`, el `direction`, el `amount` y el saldo acumulado bajo el encabezado `saldo`, entendido como la suma con signo de todos los movimientos hasta esa fila inclusive, tomados en orden de `created_at` y después de `id`. Ordena el resultado por `created_at` y, si dos movimientos comparten el mismo instante, debes desempatar usando `id` ascendente.",
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
          "Un acumulado se escribe como `sum(...) OVER (ORDER BY ...)`. Antes de sumar, convierte los débitos en valores negativos con una expresión `CASE`.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Incluye `id` como segundo criterio dentro del `ORDER BY` de la ventana, para desempatar los movimientos que comparten la misma marca de tiempo.",
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
        description_md:
          "Sumar la columna `amount` sin aplicarle signo: el supuesto saldo solo crece y nunca refleja los débitos.",
      },
      {
        category: "missing_filter",
        description_md:
          "Incluir los movimientos con `status` igual a `'failed'` o `'pending'`: alteran el saldo aunque nunca se hayan concretado.",
      },
      {
        category: "wrong_order",
        description_md:
          "Ordenar la ventana solo por `created_at`: con el marco `RANGE` que se aplica por omisión, dos movimientos del mismo instante comparten el mismo saldo acumulado.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 183 movimientos, y la última fila del extracto coincide con el valor de `accounts.balance` de esa cuenta, porque el saldo está definido exactamente como esta suma con signo. Esa coincidencia es una verificación útil: si los dos números no coincidieran, habría movimientos mal clasificados en la tabla.\n\nLos pagos con `status` igual a `'reversed'` restan y después su movimiento de reverso suma la misma cifra: el extracto muestra los dos, tal como lo haría un resumen bancario real.",
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
      "El departamento de Cumplimiento está revisando el proceso de verificación de identidad, conocido como KYC por la sigla en inglés de «conoce a tu cliente», en Uruguay. Quiere ver cada evento de verificación junto con el total de intentos que hizo esa misma persona, y te pide ese detalle para medir la fricción del proceso.",
    business_question_md:
      "Debes generar un dataset que, tomando las personas cuyo `country` es igual al texto `'UY'`, devuelva el `user_id`, el `event_at`, el `outcome` y la cantidad total de eventos de esa persona bajo el encabezado `intentos`, ordenado por `user_id` y después por `event_at`, los dos en forma ascendente.",
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
          "La expresión `count(*) OVER (PARTITION BY user_id)` cuenta los eventos de cada persona y repite ese total en todas las filas de esa persona.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "No escribas un `ORDER BY` dentro de la ventana: eso convertiría el total en un conteo acumulado que iría 1, 2, 3 y así sucesivamente.",
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
          "Escribir `count(*) OVER (PARTITION BY user_id ORDER BY event_at)`: la columna devuelve el conteo acumulado dentro de la partición y no el total de intentos.",
      },
      {
        category: "aggregation_level",
        description_md:
          "Resolverlo con `GROUP BY user_id`: la consulta pierde el detalle de cada evento, que es justamente lo que Cumplimiento quiere ver.",
      },
      {
        category: "wrong_order",
        description_md:
          "No ordenar el resultado: la revisión persona por persona se vuelve imposible de seguir.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 296 eventos. Las personas cuya columna `intentos` es mayor que su `kyc_level` tuvieron rechazos en el camino: comparar esas dos cifras es la base del análisis de fricción del proceso de verificación.\n\nLa ventana se evalúa después de la cláusula `WHERE`, así que el conteo incluye únicamente eventos de personas uruguayas, que es exactamente lo que pidió el negocio.",
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
      "El departamento de Tesorería sigue la cotización diaria del peso argentino frente al dólar y quiere suavizar el ruido del día a día con una media móvil de 7 días, formada por los 6 días anteriores más el día actual. Te piden esa serie suavizada para presentarla en el informe semanal.",
    business_question_md:
      "Debes generar un dataset que, tomando las filas cuyo `currency` es igual al texto `'ARS'` y cuya columna `rate_date` cae en agosto de 2025, del día 1 al 31, devuelva el `rate_date`, el `usd_rate` y la media móvil de `usd_rate` calculada sobre las 7 filas que terminan en la fila actual bajo el encabezado `media_7d` con 4 decimales, ordenado por `rate_date` ascendente. Ten en cuenta que las primeras filas promedian solamente las que haya disponibles dentro del filtro.",
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
          "El marco que se aplica por omisión acumula desde el inicio de la serie; para obtener una ventana móvil hay que declarar el marco de forma explícita con `ROWS BETWEEN`.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "«7 días incluyendo el actual» son 6 filas anteriores más la fila actual. Los filtros de moneda y de mes van en la cláusula `WHERE`.",
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
        description_md:
          "Escribir `7 PRECEDING`: la ventana pasa a tener 8 días, porque también cuenta la fila actual.",
      },
      {
        category: "cell_values",
        description_md:
          "Omitir la declaración del marco: el resultado es el promedio acumulado desde el 1 de agosto, que no es una media móvil.",
      },
      {
        category: "missing_filter",
        description_md:
          "Olvidar la condición `currency = 'ARS'`: la ventana mezcla seis monedas distintas ordenadas por fecha y el promedio no significa nada.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 31 filas. Las seis primeras promedian menos de 7 valores porque el filtro corta la serie el 1 de agosto; si quisieras una media completa desde el primer día del mes, tendrías que filtrar **después** de calcular la ventana, usando una subconsulta que incluya también los últimos días de julio.\n\nEsa diferencia entre filtrar antes y filtrar después de la ventana es una de las decisiones más frecuentes en el análisis de series temporales.",
    reward: defaultReward("advanced"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
];
