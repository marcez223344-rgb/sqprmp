import {
  defaultHintMeta,
  defaultReward,
  defaultSolutionUnlock,
  type ExerciseDef,
} from "../schemas/exercise";

const section = "agregacion-condicional";
const tiendaviva = { slug: "tiendaviva", version: 1 };

export const exercises: ExerciseDef[] = [
  {
    slug: "panel-de-estados-de-pedidos",
    section,
    title: "Panel de estados de pedidos en una sola fila",
    difficulty: "intermediate",
    estimated_minutes: 6,
    concepts: ["select", "aggregate", "conditional_aggregation", "alias"],
    dataset: tiendaviva,
    tables_used: ["orders"],
    scenario_md:
      "La reunión semanal de operaciones de **TiendaViva** empieza con el mismo tablero: cuántos pedidos hay en total y cómo se reparten entre entregados, cancelados y devueltos. Hoy ese tablero se arma con tres consultas separadas y alguien copia los números a mano.",
    business_question_md:
      "Devuelve **una sola fila** con el total histórico de pedidos y el conteo de cada estado: `total_orders` (todos los pedidos), `delivered_orders` (estado `delivered`), `cancelled_orders` (estado `cancelled`) y `returned_orders` (estado `returned`). Usa una única consulta sobre `orders`.",
    learning_objective:
      "Calcular varias métricas con condiciones distintas en una sola pasada usando agregación condicional.",
    theory_ref: "agregacion-condicional-case-y-filter",
    expected_columns: [
      { name: "total_orders", type: "integer" },
      { name: "delivered_orders", type: "integer" },
      { name: "cancelled_orders", type: "integer" },
      { name: "returned_orders", type: "integer" },
    ],
    validation_rules: { required_concepts: ["conditional_aggregation"] },
    reference_solution:
      "SELECT\n  count(*) AS total_orders,\n  count(*) FILTER (WHERE status = 'delivered') AS delivered_orders,\n  count(*) FILTER (WHERE status = 'cancelled') AS cancelled_orders,\n  count(*) FILTER (WHERE status = 'returned') AS returned_orders\nFROM orders;",
    alternative_solutions: [
      {
        label: "SUM con CASE (portable a otros motores)",
        sql: "SELECT\n  count(*) AS total_orders,\n  sum(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) AS delivered_orders,\n  sum(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled_orders,\n  sum(CASE WHEN status = 'returned' THEN 1 ELSE 0 END) AS returned_orders\nFROM orders;",
      },
      {
        label: "COUNT con CASE sin ELSE",
        sql: "SELECT\n  count(*) AS total_orders,\n  count(CASE WHEN status = 'delivered' THEN 1 END) AS delivered_orders,\n  count(CASE WHEN status = 'cancelled' THEN 1 END) AS cancelled_orders,\n  count(CASE WHEN status = 'returned' THEN 1 END) AS returned_orders\nFROM orders;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "No uses `WHERE` para separar los estados: un `WHERE` recorta la consulta entera y perderías el total. La condición tiene que vivir **dentro** de cada función de agregación, para que cada columna cuente su propio subconjunto de las mismas filas.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "En `orders`, la columna `status` toma los valores `pending`, `paid`, `shipped`, `delivered`, `cancelled` y `returned`. Necesitas cuatro agregados en el mismo `SELECT`: uno sin condición (`count(*)`) y tres con condición, escritos con `FILTER (WHERE ...)` o con un `CASE` como argumento. No hay `GROUP BY`: el resultado es una sola fila.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT\n  count(*) AS total_orders,\n  count(*) FILTER (___) AS delivered_orders,\n  ___ AS cancelled_orders,\n  ___ AS returned_orders\nFROM orders;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "missing_filter",
        description_md:
          "Poner la condición en un `WHERE` (`WHERE status = 'delivered'`): todas las columnas quedan calculadas sobre el mismo recorte y `total_orders` deja de ser el total.",
      },
      {
        category: "cell_values",
        description_md:
          "Escribir `count(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END)`: el `ELSE 0` devuelve un valor no nulo, así que `count` cuenta todas las filas y la columna repite el total.",
      },
      {
        category: "aggregation_level",
        description_md:
          "Agregar `GROUP BY status`: obtendrías una fila por estado (formato largo) en lugar de la fila única con cuatro columnas que pidió operaciones.",
      },
      {
        category: "wrong_columns",
        description_md:
          "Olvidar los alias: sin `AS total_orders` y compañía, las columnas llegan como `count`, `count_1`… y el reporte no se puede leer ni validar.",
      },
    ],
    expert_explanation_md:
      "Una fila: 18 000 pedidos en total, 13 156 entregados, 2313 cancelados y 1073 devueltos.\n\nLas tres formas (`FILTER`, `sum(CASE ... ELSE 0 END)` y `count(CASE ... END)`) recorren la tabla **una sola vez** y producen exactamente lo mismo. `FILTER` es estándar SQL y está disponible en PostgreSQL desde la versión 9.4; se lee mejor porque la condición aparece separada del valor que se agrega. La versión con `CASE` es la que vas a necesitar si la misma consulta debe correr en motores que no implementan `FILTER`.\n\nDetalle de rendimiento: tres consultas separadas leen la tabla tres veces y, además, pueden ejecutarse en momentos distintos. Con una sola consulta los cuatro números son consistentes entre sí por construcción, que es lo que hace auditable un tablero.",
    improvement_feedback: [
      {
        condition: "missing_alias_on_aggregate",
        message_key: "improve.missing_alias_on_aggregate",
      },
      { condition: "uses_select_star", message_key: "improve.uses_select_star" },
    ],
    reward: defaultReward("intermediate"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "pedidos-por-pais-y-canal",
    section,
    title: "Pedidos por país y canal en formato ancho",
    difficulty: "intermediate",
    estimated_minutes: 9,
    concepts: ["select", "inner_join", "group_by", "conditional_aggregation", "order_by"],
    prerequisites: ["panel-de-estados-de-pedidos"],
    dataset: tiendaviva,
    tables_used: ["orders", "customers"],
    scenario_md:
      "Marketing prepara la presentación trimestral y quiere una tabla que se lea de un vistazo: **un país por fila y un canal por columna**. La consulta que existe hoy devuelve 18 filas (una por combinación de país y canal) y nadie logra leerla en una diapositiva.",
    business_question_md:
      "Arma la tabla pivote con una fila por país del **cliente** y estas columnas, en este orden: `country`, `total_orders` (todos los pedidos del país), `app_orders` (canal `app`), `web_orders` (canal `web`) y `partner_orders` (canal `marketplace_partner`). Ordena por `country` ascendente.",
    learning_objective:
      "Convertir una dimensión del GROUP BY en columnas mediante agregados condicionales, conservando un total de control.",
    theory_ref: "agregacion-condicional-tablas-pivote",
    expected_columns: [
      { name: "country", type: "text" },
      { name: "total_orders", type: "integer" },
      { name: "app_orders", type: "integer" },
      { name: "web_orders", type: "integer" },
      { name: "partner_orders", type: "integer" },
    ],
    validation_rules: {
      order_matters: true,
      required_concepts: ["conditional_aggregation", "group_by"],
    },
    reference_solution:
      "SELECT\n  c.country,\n  count(*) AS total_orders,\n  count(*) FILTER (WHERE o.channel = 'app') AS app_orders,\n  count(*) FILTER (WHERE o.channel = 'web') AS web_orders,\n  count(*) FILTER (WHERE o.channel = 'marketplace_partner') AS partner_orders\nFROM orders o\nJOIN customers c ON c.id = o.customer_id\nGROUP BY c.country\nORDER BY c.country;",
    alternative_solutions: [
      {
        label: "SUM con CASE",
        sql: "SELECT\n  c.country,\n  count(*) AS total_orders,\n  sum(CASE WHEN o.channel = 'app' THEN 1 ELSE 0 END) AS app_orders,\n  sum(CASE WHEN o.channel = 'web' THEN 1 ELSE 0 END) AS web_orders,\n  sum(CASE WHEN o.channel = 'marketplace_partner' THEN 1 ELSE 0 END) AS partner_orders\nFROM orders o\nJOIN customers c ON c.id = o.customer_id\nGROUP BY c.country\nORDER BY c.country;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Lo que quieres como **filas** va en el `GROUP BY`; lo que quieres como **columnas** sale del `GROUP BY` y se transforma en un agregado con condición por cada valor posible.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "El país está en `customers.country`, así que necesitas unir `orders` con `customers` por `customer_id`. Agrupa solo por `c.country` y escribe tres conteos condicionales sobre `o.channel`, más un `count(*)` sin condición para el total de la fila.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT\n  c.country,\n  count(*) AS total_orders,\n  count(*) FILTER (WHERE ___) AS app_orders,\n  ___ AS web_orders,\n  ___ AS partner_orders\nFROM orders o\nJOIN customers c ON ___\nGROUP BY ___\nORDER BY ___;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "aggregation_level",
        description_md:
          "Dejar `o.channel` en el `GROUP BY`: vuelves al formato largo con 18 filas, justo lo que marketing no puede leer.",
      },
      {
        category: "join_condition",
        description_md:
          "Unir por `c.id = o.id` en lugar de `c.id = o.customer_id`: los totales cambian sin que la consulta falle, que es el peor tipo de error.",
      },
      {
        category: "cell_values",
        description_md:
          "Usar `country` de otra tabla o filtrar por país en un `WHERE`: la pregunta es por el país del cliente y pide los seis países en la misma salida.",
      },
      {
        category: "wrong_order",
        description_md:
          "No ordenar por `country`: la presentación necesita el mismo orden siempre; el motor no garantiza ninguno por su cuenta.",
      },
    ],
    expert_explanation_md:
      "Seis filas, una por país. México (5854 pedidos) y Argentina (5446) concentran el volumen, y en todos los países la app supera a la web con una proporción parecida, cerca del 55 % contra el 37 %.\n\nLa columna `total_orders` no es decorativa: es el control de la tabla pivote. `3015 + 2038 + 393 = 5446` para Argentina, así que sabes que no quedó ningún canal fuera. El día que aparezca un canal nuevo, la suma dejará de cuadrar y lo vas a notar.\n\nAlternativas: el mismo resultado sale con `sum(CASE WHEN ... THEN 1 ELSE 0 END)` o con `crosstab()` de la extensión `tablefunc`, que no está disponible aquí y que obliga a declarar los tipos de las columnas a mano. Para dos o tres columnas, la agregación condicional es más simple y más clara.\n\nSi el reporte necesitara además el porcentaje por canal, se agrega dividiendo cada conteo condicional por `count(*)`; ese es el tema del siguiente ejercicio.",
    improvement_feedback: [
      { condition: "no_table_alias_in_join", message_key: "improve.no_table_alias_in_join" },
      { condition: "uses_implicit_join", message_key: "improve.uses_implicit_join" },
    ],
    reward: defaultReward("intermediate"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "tasa-de-cancelacion-por-pais",
    section,
    title: "Tasa de cancelación por país",
    difficulty: "advanced",
    estimated_minutes: 10,
    concepts: [
      "select",
      "inner_join",
      "group_by",
      "conditional_aggregation",
      "null_handling",
      "numeric_functions",
      "order_by",
    ],
    prerequisites: ["pedidos-por-pais-y-canal"],
    dataset: tiendaviva,
    tables_used: ["orders", "customers"],
    scenario_md:
      "Operaciones quiere saber dónde se cancelan más pedidos. El conteo absoluto no sirve para decidir: México cancela más que Uruguay porque vende diez veces más. Lo que hace falta es el **porcentaje de pedidos cancelados sobre el total de cada país**.",
    business_question_md:
      "Devuelve una fila por país del cliente con estas columnas: `country`, `total_orders`, `cancelled_orders` (estado `cancelled`) y `cancellation_rate_pct`, el porcentaje de cancelados sobre el total del país expresado de 0 a 100 y **redondeado a 2 decimales**. Ordena de mayor a menor tasa y, ante un empate, por `country` ascendente.",
    learning_objective:
      "Calcular una tasa con numerador condicional y denominador total, evitando la división entera y la división por cero.",
    theory_ref: "agregacion-condicional-tasas-y-proporciones",
    expected_columns: [
      { name: "country", type: "text" },
      { name: "total_orders", type: "integer" },
      { name: "cancelled_orders", type: "integer" },
      { name: "cancellation_rate_pct", type: "numeric" },
    ],
    validation_rules: {
      order_matters: true,
      required_concepts: ["conditional_aggregation", "group_by"],
    },
    reference_solution:
      "SELECT\n  c.country,\n  count(*) AS total_orders,\n  count(*) FILTER (WHERE o.status = 'cancelled') AS cancelled_orders,\n  round(100.0 * count(*) FILTER (WHERE o.status = 'cancelled') / nullif(count(*), 0), 2) AS cancellation_rate_pct\nFROM orders o\nJOIN customers c ON c.id = o.customer_id\nGROUP BY c.country\nORDER BY cancellation_rate_pct DESC, c.country;",
    alternative_solutions: [
      {
        label: "SUM con CASE en el numerador",
        sql: "SELECT\n  c.country,\n  count(*) AS total_orders,\n  sum(CASE WHEN o.status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled_orders,\n  round(100.0 * sum(CASE WHEN o.status = 'cancelled' THEN 1 ELSE 0 END) / nullif(count(*), 0), 2) AS cancellation_rate_pct\nFROM orders o\nJOIN customers c ON c.id = o.customer_id\nGROUP BY c.country\nORDER BY cancellation_rate_pct DESC, c.country;",
      },
      {
        label: "Promedio de una expresión booleana convertida a número",
        sql: "SELECT\n  c.country,\n  count(*) AS total_orders,\n  count(*) FILTER (WHERE o.status = 'cancelled') AS cancelled_orders,\n  round(100 * avg(CASE WHEN o.status = 'cancelled' THEN 1.0 ELSE 0.0 END), 2) AS cancellation_rate_pct\nFROM orders o\nJOIN customers c ON c.id = o.customer_id\nGROUP BY c.country\nORDER BY cancellation_rate_pct DESC, c.country;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Una tasa es un cociente entre dos agregados calculados sobre el mismo grupo: arriba, el conteo con condición; abajo, el conteo total. Los dos salen de la misma consulta, no de dos consultas distintas.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Parte del ejercicio anterior: une `orders` con `customers` y agrupa por `c.country`. Para el porcentaje, cuida tres cosas: multiplica por `100.0` (con decimal) antes de dividir para que no se trunque a entero, protege el denominador con `nullif(..., 0)` y aplica `round(..., 2)` al final.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT\n  c.country,\n  count(*) AS total_orders,\n  count(*) FILTER (WHERE ___) AS cancelled_orders,\n  round(100.0 * ___ / nullif(___, 0), 2) AS cancellation_rate_pct\nFROM orders o\nJOIN customers c ON c.id = o.customer_id\nGROUP BY ___\nORDER BY ___;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "cell_values",
        description_md:
          "Dividir dos enteros (`count(*) FILTER (...) / count(*)`): PostgreSQL trunca y la tasa da 0 en todos los países. Multiplica por `100.0` o convierte a `numeric` antes de dividir.",
      },
      {
        category: "null_handling",
        description_md:
          "Dejar el denominador sin `nullif(..., 0)`: aquí ningún país tiene cero pedidos, pero el mismo reporte aplicado a un recorte más chico se cae con «division by zero» y no devuelve nada.",
      },
      {
        category: "missing_filter",
        description_md:
          "Filtrar con `WHERE o.status = 'cancelled'`: el denominador pasa a ser solo los cancelados y la tasa da 100 % en todos los países.",
      },
      {
        category: "wrong_order",
        description_md:
          "Ordenar por `cancelled_orders` en lugar de por la tasa: volverías a rankear por tamaño del país, que es exactamente lo que el reporte quiere evitar.",
      },
    ],
    expert_explanation_md:
      "Seis filas. Uruguay encabeza con 14,18 % de cancelaciones sobre 684 pedidos, seguido de Perú (13,85 %) y México (13,41 %); Chile cierra con 11,12 %. Las diferencias son de dos o tres puntos: el ranking por conteo absoluto (México primero con 785 cancelados) contaba otra historia.\n\nPor qué funciona: `count(*)` y `count(*) FILTER (...)` se calculan sobre el mismo grupo, así que numerador y denominador siempre corresponden a las mismas filas. El `100.0` fuerza aritmética numérica —`706 / 5446` en enteros da `0`—, y `nullif(count(*), 0)` cambia un error fatal por un NULL informativo.\n\nAlternativas: `avg(CASE WHEN ... THEN 1.0 ELSE 0.0 END)` calcula directamente la proporción y evita escribir el denominador, un patrón muy usado cuando la condición es binaria. También existe `avg((o.status = 'cancelled')::int)`, más corto pero menos explícito.\n\nLegibilidad: si la expresión se repite en varias columnas, una CTE con los conteos y un `SELECT` externo que haga las divisiones suele leerse mejor que una fórmula de tres líneas.",
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
    slug: "aprobacion-de-pagos-por-metodo-en-mexico",
    section,
    title: "Aprobación de pagos por método en México",
    difficulty: "advanced",
    estimated_minutes: 11,
    concepts: [
      "select",
      "inner_join",
      "where",
      "group_by",
      "conditional_aggregation",
      "numeric_functions",
      "order_by",
    ],
    prerequisites: ["tasa-de-cancelacion-por-pais"],
    dataset: tiendaviva,
    tables_used: ["payments", "orders"],
    scenario_md:
      "El equipo de pagos negocia comisiones con los procesadores y necesita el desempeño de cada medio de pago **solo en los pedidos facturados en pesos mexicanos** (`currency = 'MXN'`), para no mezclar monedas en una misma suma. Recuerda que un mismo pedido puede tener un intento rechazado y otro aprobado: cada fila de `payments` es un intento.",
    business_question_md:
      "Devuelve una fila por `method` con estas columnas: `payment_attempts` (intentos de pago del método), `approved_amount` (suma de `amount` de los intentos con estado `approved`), `refunded_amount` (suma de `amount` de los intentos con estado `refunded`) y `approval_rate_pct` (porcentaje de intentos aprobados sobre los intentos del método, de 0 a 100, redondeado a 2 decimales). Considera únicamente los pagos de pedidos con `currency = 'MXN'` y ordena por `approved_amount` de mayor a menor.",
    learning_objective:
      "Combinar un filtro global de la consulta con sumas condicionales por estado y una tasa sobre el mismo grupo.",
    theory_ref: "agregacion-condicional-tasas-y-proporciones",
    expected_columns: [
      { name: "method", type: "text" },
      { name: "payment_attempts", type: "integer" },
      { name: "approved_amount", type: "numeric" },
      { name: "refunded_amount", type: "numeric" },
      { name: "approval_rate_pct", type: "numeric" },
    ],
    validation_rules: {
      order_matters: true,
      required_concepts: ["conditional_aggregation", "group_by"],
    },
    reference_solution:
      "SELECT\n  p.method,\n  count(*) AS payment_attempts,\n  sum(p.amount) FILTER (WHERE p.status = 'approved') AS approved_amount,\n  sum(p.amount) FILTER (WHERE p.status = 'refunded') AS refunded_amount,\n  round(100.0 * count(*) FILTER (WHERE p.status = 'approved') / nullif(count(*), 0), 2) AS approval_rate_pct\nFROM payments p\nJOIN orders o ON o.id = p.order_id\nWHERE o.currency = 'MXN'\nGROUP BY p.method\nORDER BY approved_amount DESC;",
    alternative_solutions: [
      {
        label: "SUM con CASE en todas las columnas condicionales",
        sql: "SELECT\n  p.method,\n  count(*) AS payment_attempts,\n  sum(CASE WHEN p.status = 'approved' THEN p.amount END) AS approved_amount,\n  sum(CASE WHEN p.status = 'refunded' THEN p.amount END) AS refunded_amount,\n  round(100.0 * sum(CASE WHEN p.status = 'approved' THEN 1 ELSE 0 END) / nullif(count(*), 0), 2) AS approval_rate_pct\nFROM payments p\nJOIN orders o ON o.id = p.order_id\nWHERE o.currency = 'MXN'\nGROUP BY p.method\nORDER BY approved_amount DESC;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Hay dos niveles de filtrado que no se pisan: el recorte del universo (una sola moneda) va en `WHERE`, y la separación por estado del intento va dentro de cada agregado.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Une `payments` con `orders` por `order_id` para poder filtrar `o.currency = 'MXN'`, y agrupa por `p.method`. `approved_amount` y `refunded_amount` son sumas de `p.amount` con condición sobre `p.status`; la tasa se calcula con conteos, no con importes.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT\n  p.method,\n  count(*) AS payment_attempts,\n  sum(___) FILTER (WHERE ___) AS approved_amount,\n  ___ AS refunded_amount,\n  round(100.0 * ___ / nullif(count(*), 0), 2) AS approval_rate_pct\nFROM payments p\nJOIN orders o ON ___\nWHERE ___\nGROUP BY ___\nORDER BY ___;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "missing_filter",
        description_md:
          "Omitir `WHERE o.currency = 'MXN'`: sumarías pesos argentinos, colombianos y mexicanos en la misma columna, un importe que no significa nada.",
      },
      {
        category: "cell_values",
        description_md:
          "Calcular la tasa con importes (`approved_amount / sum(amount)`) en vez de con intentos: la pregunta es qué porcentaje de intentos se aprueba, no qué porcentaje del dinero.",
      },
      {
        category: "aggregation_level",
        description_md:
          "Agrupar por `p.method, p.status`: cada método se abriría en tres filas y desaparecería la comparación entre aprobado y reembolsado en la misma línea.",
      },
      {
        category: "join_condition",
        description_md:
          "Unir por `o.id = p.id` en lugar de `o.id = p.order_id`: la consulta corre, pero cruza pagos con pedidos que no les corresponden.",
      },
    ],
    expert_explanation_md:
      "Cinco filas, una por método. La tarjeta de crédito domina el volumen (15 641 417,55 MXN aprobados sobre 2838 intentos) pero tiene una de las tasas de aprobación más bajas, 80,76 %; el efectivo, con muchísimo menos volumen, aprueba el 83,88 %. La billetera es la que más rechaza (78,75 %).\n\nDos decisiones de negocio están en la consulta. La primera es el `WHERE` sobre la moneda: sumar importes de monedas distintas es el error silencioso más común en reportes de pagos. La segunda es que la tasa se calcula sobre intentos y no sobre importes, porque mide la salud técnica del procesador, no el ticket promedio.\n\nSobre la escritura: `sum(p.amount) FILTER (WHERE p.status = 'approved')` equivale a `sum(CASE WHEN p.status = 'approved' THEN p.amount END)`. Aquí conviene **no** poner `ELSE 0`: sumar ceros no cambia el resultado, pero si un método no tuviera ningún intento aprobado querrás ver NULL («no hubo») y no `0`. Si el tablero necesita un cero explícito, envuelve con `coalesce(..., 0)` y documenta la decisión.",
    improvement_feedback: [
      { condition: "no_table_alias_in_join", message_key: "improve.no_table_alias_in_join" },
      { condition: "uses_select_star", message_key: "improve.uses_select_star" },
    ],
    reward: defaultReward("advanced"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "promotores-y-detractores-por-vendedor",
    section,
    title: "Promotores y detractores por vendedor",
    difficulty: "advanced",
    estimated_minutes: 12,
    concepts: [
      "select",
      "inner_join",
      "group_by",
      "having",
      "conditional_aggregation",
      "numeric_functions",
      "order_by",
    ],
    prerequisites: ["aprobacion-de-pagos-por-metodo-en-mexico"],
    dataset: tiendaviva,
    tables_used: ["reviews", "products", "sellers"],
    scenario_md:
      "El área de calidad arma el ranking de reputación de los vendedores. Definen **promotora** a toda reseña con `rating` de 4 o 5 y **detractora** a la de 1 o 2 (las de 3 son neutras y no suman ni restan). El indicador que reportan es el porcentaje de promotoras menos el porcentaje de detractoras. Para que el número sea confiable, solo entran los vendedores con al menos 20 reseñas.",
    business_question_md:
      "Devuelve una fila por vendedor con `store_name`, `total_reviews` (reseñas de sus productos), `promoter_reviews` (`rating >= 4`), `detractor_reviews` (`rating <= 2`) y `nps`, calculado como `(promotoras - detractoras) / total * 100` **redondeado a 1 decimal**. Incluye solo a los vendedores con 20 reseñas o más. Ordena por `nps` de mayor a menor y, ante un empate, por `store_name` ascendente.",
    learning_objective:
      "Combinar agregados condicionales en una fórmula de negocio y filtrar grupos con HAVING sobre una cadena de joins.",
    theory_ref: "agregacion-condicional-tasas-y-proporciones",
    expected_columns: [
      { name: "store_name", type: "text" },
      { name: "total_reviews", type: "integer" },
      { name: "promoter_reviews", type: "integer" },
      { name: "detractor_reviews", type: "integer" },
      { name: "nps", type: "numeric" },
    ],
    validation_rules: {
      order_matters: true,
      required_concepts: ["conditional_aggregation", "group_by", "having"],
    },
    reference_solution:
      "SELECT\n  s.store_name,\n  count(*) AS total_reviews,\n  count(*) FILTER (WHERE r.rating >= 4) AS promoter_reviews,\n  count(*) FILTER (WHERE r.rating <= 2) AS detractor_reviews,\n  round(\n    100.0 * (count(*) FILTER (WHERE r.rating >= 4) - count(*) FILTER (WHERE r.rating <= 2))\n      / nullif(count(*), 0),\n    1\n  ) AS nps\nFROM reviews r\nJOIN products p ON p.id = r.product_id\nJOIN sellers s ON s.id = p.seller_id\nGROUP BY s.id, s.store_name\nHAVING count(*) >= 20\nORDER BY nps DESC, s.store_name;",
    alternative_solutions: [
      {
        label: "SUM con CASE y una sola expresión para el saldo",
        sql: "SELECT\n  s.store_name,\n  count(*) AS total_reviews,\n  sum(CASE WHEN r.rating >= 4 THEN 1 ELSE 0 END) AS promoter_reviews,\n  sum(CASE WHEN r.rating <= 2 THEN 1 ELSE 0 END) AS detractor_reviews,\n  round(\n    100.0 * sum(CASE WHEN r.rating >= 4 THEN 1 WHEN r.rating <= 2 THEN -1 ELSE 0 END)\n      / nullif(count(*), 0),\n    1\n  ) AS nps\nFROM reviews r\nJOIN products p ON p.id = r.product_id\nJOIN sellers s ON s.id = p.seller_id\nGROUP BY s.id, s.store_name\nHAVING count(*) >= 20\nORDER BY nps DESC, s.store_name;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Las reseñas no apuntan al vendedor: apuntan al producto. Necesitas encadenar dos joins para llegar desde la reseña hasta la tienda. Y el corte por cantidad de reseñas es un filtro **de grupos**, no de filas.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "El camino es `reviews.product_id → products.id` y `products.seller_id → sellers.id`. Agrupa por el vendedor (incluye `s.id` en el `GROUP BY` para no fusionar tiendas homónimas), usa `HAVING count(*) >= 20` y arma el `nps` con la resta de los dos conteos condicionales dividida por el total.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT\n  s.store_name,\n  count(*) AS total_reviews,\n  count(*) FILTER (WHERE ___) AS promoter_reviews,\n  count(*) FILTER (WHERE ___) AS detractor_reviews,\n  round(100.0 * (___ - ___) / nullif(count(*), 0), 1) AS nps\nFROM reviews r\nJOIN products p ON ___\nJOIN sellers s ON ___\nGROUP BY s.id, s.store_name\nHAVING ___\nORDER BY ___;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "missing_filter",
        description_md:
          "Poner el corte de 20 reseñas en `WHERE`: `WHERE count(*) >= 20` no es válido, porque el conteo del grupo todavía no existe cuando se evalúa `WHERE`. Ese filtro va en `HAVING`.",
      },
      {
        category: "cell_values",
        description_md:
          "Tratar las reseñas de 3 como detractoras (`rating < 4`): el enunciado las define como neutras y el `nps` queda sistemáticamente más bajo.",
      },
      {
        category: "join_condition",
        description_md:
          "Unir `reviews` directamente con `sellers` por `customer_id` o saltarse `products`: no hay relación directa entre la reseña y la tienda.",
      },
      {
        category: "aggregation_level",
        description_md:
          "Agrupar solo por `s.store_name`: si dos tiendas compartieran nombre quedarían sumadas en una fila. Agrupar por `s.id` mantiene un vendedor por fila.",
      },
    ],
    expert_explanation_md:
      "95 vendedores superan el umbral de 20 reseñas. El mejor es «Casa Tropical 128» con 84,0 (21 promotoras y ninguna detractora sobre 25 reseñas); la cola del ranking queda cerca de 30.\n\nLa fórmula es un caso típico de varias agregaciones condicionales combinadas en una expresión: dos conteos con condiciones distintas se restan y el resultado se divide por el total del mismo grupo. Escribir eso con subconsultas exigiría recorrer `reviews` tres veces.\n\nEl `HAVING count(*) >= 20` protege la lectura del indicador: un vendedor con 2 reseñas positivas daría 100,0 y encabezaría el ranking sin ninguna evidencia real. Cuando un umbral así aparece en un reporte, conviene dejarlo escrito en el título de la tabla, no solo en el SQL.\n\nAlternativa elegante: `sum(CASE WHEN rating >= 4 THEN 1 WHEN rating <= 2 THEN -1 ELSE 0 END)` calcula el saldo de promotoras menos detractoras en un solo agregado, aprovechando que gana la primera rama verdadera. Es más corto, aunque menos evidente para quien lea la consulta por primera vez.",
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
    slug: "adopcion-de-la-app-por-pais",
    section,
    title: "Adopción de la app por país",
    difficulty: "expert",
    estimated_minutes: 13,
    concepts: [
      "select",
      "inner_join",
      "where",
      "group_by",
      "distinct",
      "conditional_aggregation",
      "numeric_functions",
      "order_by",
    ],
    prerequisites: ["promotores-y-detractores-por-vendedor"],
    dataset: tiendaviva,
    tables_used: ["orders", "customers"],
    scenario_md:
      "Producto quiere medir la adopción de la app, y la pregunta no es cuántos **pedidos** entran por cada canal sino cuántas **personas distintas** usan cada uno. Un cliente que hizo 20 pedidos por la app cuenta igual que uno que hizo uno solo. Los pedidos cancelados no se consideran uso real del canal y quedan fuera del análisis.",
    business_question_md:
      "Devuelve una fila por país del cliente, considerando únicamente los pedidos cuyo `status` sea distinto de `cancelled`, con estas columnas: `country`, `buying_customers` (clientes distintos con al menos un pedido), `app_customers` (clientes distintos con al menos un pedido por `app`), `web_customers` (clientes distintos con al menos un pedido por `web`) y `app_adoption_pct` (`app_customers` sobre `buying_customers`, de 0 a 100, redondeado a 1 decimal). Ordena por `app_adoption_pct` de mayor a menor y, ante un empate, por `country` ascendente.",
    learning_objective:
      "Contar entidades distintas bajo condición con COUNT(DISTINCT ...) FILTER y reconocer por qué SUM(CASE ...) no resuelve este caso.",
    theory_ref: "agregacion-condicional-tasas-y-proporciones",
    expected_columns: [
      { name: "country", type: "text" },
      { name: "buying_customers", type: "integer" },
      { name: "app_customers", type: "integer" },
      { name: "web_customers", type: "integer" },
      { name: "app_adoption_pct", type: "numeric" },
    ],
    validation_rules: {
      order_matters: true,
      required_concepts: ["conditional_aggregation", "group_by"],
    },
    reference_solution:
      "SELECT\n  c.country,\n  count(DISTINCT o.customer_id) AS buying_customers,\n  count(DISTINCT o.customer_id) FILTER (WHERE o.channel = 'app') AS app_customers,\n  count(DISTINCT o.customer_id) FILTER (WHERE o.channel = 'web') AS web_customers,\n  round(\n    100.0 * count(DISTINCT o.customer_id) FILTER (WHERE o.channel = 'app')\n      / nullif(count(DISTINCT o.customer_id), 0),\n    1\n  ) AS app_adoption_pct\nFROM orders o\nJOIN customers c ON c.id = o.customer_id\nWHERE o.status <> 'cancelled'\nGROUP BY c.country\nORDER BY app_adoption_pct DESC, c.country;",
    alternative_solutions: [
      {
        label: "CASE dentro de COUNT(DISTINCT ...) (portable)",
        sql: "SELECT\n  c.country,\n  count(DISTINCT o.customer_id) AS buying_customers,\n  count(DISTINCT CASE WHEN o.channel = 'app' THEN o.customer_id END) AS app_customers,\n  count(DISTINCT CASE WHEN o.channel = 'web' THEN o.customer_id END) AS web_customers,\n  round(\n    100.0 * count(DISTINCT CASE WHEN o.channel = 'app' THEN o.customer_id END)\n      / nullif(count(DISTINCT o.customer_id), 0),\n    1\n  ) AS app_adoption_pct\nFROM orders o\nJOIN customers c ON c.id = o.customer_id\nWHERE o.status <> 'cancelled'\nGROUP BY c.country\nORDER BY app_adoption_pct DESC, c.country;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "La unidad de medida no es el pedido sino la persona. Cualquier conteo que sume una unidad por fila va a sobrecontar a quien compró varias veces: el agregado tiene que eliminar repeticiones **y**, además, aplicar la condición del canal.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Une `orders` con `customers`, descarta los cancelados en el `WHERE` y agrupa por `c.country`. Para cada canal necesitas contar clientes distintos solo entre las filas de ese canal: `count(DISTINCT ...)` admite un `FILTER (WHERE ...)`, y la variante portable es poner un `CASE` sin `ELSE` dentro del `DISTINCT`. Nota que las columnas no suman el total: hay clientes que usan los dos canales.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT\n  c.country,\n  count(DISTINCT ___) AS buying_customers,\n  count(DISTINCT ___) FILTER (WHERE ___) AS app_customers,\n  ___ AS web_customers,\n  round(100.0 * ___ / nullif(___, 0), 1) AS app_adoption_pct\nFROM orders o\nJOIN customers c ON c.id = o.customer_id\nWHERE ___\nGROUP BY ___\nORDER BY ___;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "duplicates",
        description_md:
          "Usar `count(*) FILTER (...)` o `sum(CASE WHEN channel = 'app' THEN 1 ELSE 0 END)`: cuentan pedidos, no personas, y quien compró 20 veces pesa 20 veces.",
      },
      {
        category: "missing_filter",
        description_md:
          "Olvidar `WHERE o.status <> 'cancelled'`: entrarían pedidos cancelados, que el enunciado excluye por no representar uso real del canal.",
      },
      {
        category: "cell_values",
        description_md:
          "Esperar que `app_customers + web_customers` sea igual a `buying_customers`: un cliente puede comprar por los dos canales y aparecer en ambas columnas. Las columnas se solapan a propósito.",
      },
      {
        category: "aggregation_level",
        description_md:
          "Agrupar por `c.country, o.channel`: se pierde el formato ancho y la tasa deja de ser comparable entre canales dentro de la misma fila.",
      },
    ],
    expert_explanation_md:
      "Seis filas. Uruguay lidera con 90,9 % de sus 110 compradores usando la app; Colombia queda último con 82,9 % sobre 434. La suma de `app_customers` y `web_customers` supera a `buying_customers` en todos los países: mucha gente usa ambos canales, y eso es información, no un error.\n\nEste ejercicio es el caso donde las dos formas de agregación condicional dejan de ser intercambiables. `sum(CASE WHEN ... THEN 1 ELSE 0 END)` cuenta filas; para contar entidades distintas hay que eliminar duplicados antes de contar, y eso solo lo hace `DISTINCT` dentro del agregado. Las dos escrituras válidas son `count(DISTINCT o.customer_id) FILTER (WHERE o.channel = 'app')` y `count(DISTINCT CASE WHEN o.channel = 'app' THEN o.customer_id END)`: el `CASE` sin `ELSE` devuelve NULL para las filas de otros canales y `count` ignora los NULL.\n\nRendimiento: `count(DISTINCT ...)` obliga al motor a ordenar o hashear los valores de cada grupo y es bastante más caro que un `count(*)`. Con volúmenes grandes, el patrón habitual es preagregar en una CTE a nivel cliente-canal y contar después; aquí, con 18 000 pedidos, la consulta directa es más clara y la diferencia es imperceptible.\n\nDefinición de negocio: «cliente activo» quedó definido como quien tiene al menos un pedido no cancelado en toda la historia del marketplace. Si el tablero fuera mensual, habría que agregar el recorte de fechas al `WHERE`, y la tasa cambiaría bastante.",
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
