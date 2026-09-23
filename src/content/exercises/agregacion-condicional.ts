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
      "La reunión semanal del departamento de Operaciones de **TiendaViva** empieza siempre con el mismo tablero: cuántos pedidos hay en total y cómo se reparten entre entregados, cancelados y devueltos. Hoy ese tablero se arma con tres consultas separadas y alguien copia los números a mano, así que te piden resolverlo en una sola consulta.",
    business_question_md:
      "Debes generar un dataset de **una sola fila** con el total histórico de pedidos y el conteo de cada estado: el total de pedidos bajo el encabezado `total_orders`, los pedidos cuyo `status` es igual al texto `'delivered'` bajo el encabezado `delivered_orders`, los que están en `'cancelled'` bajo el encabezado `cancelled_orders` y los que están en `'returned'` bajo el encabezado `returned_orders`. Debes resolverlo con una única consulta sobre la tabla `orders`.",
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
          "No uses la cláusula `WHERE` para separar los estados: un `WHERE` recorta la consulta entera y perderías el total. La condición tiene que vivir **dentro** de cada función de agregación, para que cada columna cuente su propio subconjunto de las mismas filas.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "En la tabla `orders`, la columna `status` toma los valores `'pending'`, `'paid'`, `'shipped'`, `'delivered'`, `'cancelled'` y `'returned'`. Necesitas cuatro agregados en el mismo `SELECT`: uno sin condición, que es `count(*)`, y tres con condición, escritos con `FILTER (WHERE ...)` o con un `CASE` como argumento. No lleva `GROUP BY`, porque el resultado es una sola fila.",
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
          "Poner la condición en una cláusula `WHERE`, como `WHERE status = 'delivered'`: todas las columnas quedan calculadas sobre el mismo recorte y la columna `total_orders` deja de ser el total.",
      },
      {
        category: "cell_values",
        description_md:
          "Escribir `count(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END)`: la rama `ELSE 0` devuelve un valor que no es `NULL`, así que la función `count` cuenta todas las filas y la columna repite el total.",
      },
      {
        category: "aggregation_level",
        description_md:
          "Agregar una cláusula `GROUP BY status`: obtendrías una fila por estado, en formato largo, en lugar de la fila única con cuatro columnas que pidió Operaciones.",
      },
      {
        category: "wrong_columns",
        description_md:
          "Olvidar los alias: sin `AS total_orders` y los demás, las columnas llegan con nombres como `count` y `count_1`, y el reporte no se puede leer ni validar.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da una sola fila: 18 000 pedidos en total, 13 156 entregados, 2313 cancelados y 1073 devueltos.\n\nLas tres formas posibles, que son `FILTER`, `sum(CASE ... ELSE 0 END)` y `count(CASE ... END)`, recorren la tabla **una sola vez** y producen exactamente lo mismo. La cláusula `FILTER` es parte del estándar SQL y está disponible en PostgreSQL desde la versión 9.4; se lee mejor porque la condición aparece separada del valor que se agrega. La versión con `CASE` es la que vas a necesitar si la misma consulta tiene que correr en motores que no implementan `FILTER`.\n\nUn detalle de rendimiento: tres consultas separadas leen la tabla tres veces y, además, pueden ejecutarse en momentos distintos. Con una sola consulta los cuatro números son consistentes entre sí por construcción, que es lo que hace auditable un tablero.",
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
      "El departamento de Marketing está preparando la presentación trimestral y quiere una tabla que se lea de un vistazo: **un país por fila y un canal por columna**. La consulta que existe hoy devuelve 18 filas, una por cada combinación de país y canal, y nadie logra leerla en una diapositiva. Te piden darle el formato que necesitan.",
    business_question_md:
      "Debes generar un dataset con formato de tabla pivote, con una fila por país del **cliente** y estas columnas en este orden: el `country`, el total de pedidos del país bajo el encabezado `total_orders`, los pedidos cuyo `channel` es igual al texto `'app'` bajo el encabezado `app_orders`, los que están en `'web'` bajo el encabezado `web_orders` y los que están en `'marketplace_partner'` bajo el encabezado `partner_orders`. Ordena por `country` ascendente.",
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
          "Lo que quieres ver como **filas** va en la cláusula `GROUP BY`; lo que quieres ver como **columnas** sale del `GROUP BY` y se transforma en un agregado con condición por cada valor posible.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "El país está en la columna `customers.country`, así que necesitas unir la tabla `orders` con `customers` por `customer_id`. Agrupa solamente por `c.country` y escribe tres conteos condicionales sobre `o.channel`, más un `count(*)` sin condición para el total de cada fila.",
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
          "Dejar la columna `o.channel` dentro del `GROUP BY`: vuelves al formato largo con 18 filas, que es justamente lo que Marketing no puede leer.",
      },
      {
        category: "join_condition",
        description_md:
          "Unir con la condición `c.id = o.id` en lugar de `c.id = o.customer_id`: los totales cambian sin que la consulta falle, que es el peor tipo de error.",
      },
      {
        category: "cell_values",
        description_md:
          "Usar la columna `country` de otra tabla, o filtrar por país en una cláusula `WHERE`: la pregunta es por el país del cliente y pide los seis países en la misma salida.",
      },
      {
        category: "wrong_order",
        description_md:
          "No ordenar por `country`: la presentación necesita el mismo orden siempre, y el motor no garantiza ninguno por su cuenta.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da seis filas, una por país. México, con 5854 pedidos, y Argentina, con 5446, concentran el volumen, y en todos los países la app supera a la web con una proporción parecida, cercana al 55 % contra el 37 %.\n\nLa columna `total_orders` no es decorativa: es el control de la tabla pivote. Para Argentina se cumple que 3015 más 2038 más 393 da 5446, así que sabes que no quedó ningún canal fuera. El día que aparezca un canal nuevo, la suma va a dejar de cuadrar y lo vas a notar.\n\nSobre las alternativas: el mismo resultado sale con `sum(CASE WHEN ... THEN 1 ELSE 0 END)` o con la función `crosstab()` de la extensión `tablefunc`, que no está disponible en este entorno y que obliga a declarar los tipos de las columnas a mano. Para dos o tres columnas, la agregación condicional es más simple y más clara.\n\nSi el reporte necesitara además el porcentaje por canal, se agrega dividiendo cada conteo condicional por `count(*)`; ese es el tema del ejercicio siguiente.",
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
      "El departamento de Operaciones quiere saber dónde se cancelan más pedidos. El conteo absoluto no sirve para decidir, porque México cancela más que Uruguay simplemente porque vende diez veces más. Lo que hace falta es el **porcentaje de pedidos cancelados sobre el total de cada país**, y te piden ese indicador.",
    business_question_md:
      "Debes generar un dataset con una fila por país del cliente y estas columnas: el `country`, el total de pedidos bajo el encabezado `total_orders`, los pedidos cuyo `status` es igual al texto `'cancelled'` bajo el encabezado `cancelled_orders` y el porcentaje de cancelados sobre el total del país, expresado en escala de 0 a 100 y **redondeado a 2 decimales**, bajo el encabezado `cancellation_rate_pct`. Ordena de mayor a menor tasa y, si dos países empatan, debes desempatar usando `country` ascendente.",
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
          "Una tasa es un cociente entre dos agregados calculados sobre el mismo grupo: arriba, el conteo con condición; abajo, el conteo total. Los dos salen de la misma consulta y no de dos consultas distintas.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Parte del ejercicio anterior: une la tabla `orders` con `customers` y agrupa por `c.country`. Para el porcentaje cuida tres cosas: multiplica por `100.0`, escrito con decimal, antes de dividir, para que el resultado no se trunque a entero; protege el denominador con `nullif(..., 0)`; y aplica `round(..., 2)` al final.",
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
          "Dividir dos enteros, como en `count(*) FILTER (...) / count(*)`: PostgreSQL trunca el resultado y la tasa da 0 en todos los países. Multiplica por `100.0` o convierte a `numeric` antes de dividir.",
      },
      {
        category: "null_handling",
        description_md:
          "Dejar el denominador sin `nullif(..., 0)`: acá ningún país tiene cero pedidos, pero el mismo reporte aplicado a un recorte más chico se cae con el error «division by zero» y no devuelve nada.",
      },
      {
        category: "missing_filter",
        description_md:
          "Filtrar con `WHERE o.status = 'cancelled'`: el denominador pasa a ser solamente los cancelados y la tasa da 100 % en todos los países.",
      },
      {
        category: "wrong_order",
        description_md:
          "Ordenar por `cancelled_orders` en lugar de por la tasa: volverías a ordenar por tamaño del país, que es exactamente lo que el reporte quiere evitar.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da seis filas. Uruguay encabeza con 14,18 % de cancelaciones sobre 684 pedidos, seguido por Perú con 13,85 % y México con 13,41 %; Chile cierra la tabla con 11,12 %. Las diferencias son de dos o tres puntos: el ranking por conteo absoluto, donde México va primero con 785 cancelados, contaba otra historia.\n\nPor qué funciona: las expresiones `count(*)` y `count(*) FILTER (...)` se calculan sobre el mismo grupo, así que el numerador y el denominador siempre corresponden a las mismas filas. El factor `100.0` fuerza aritmética numérica, porque `706 / 5446` entre enteros da `0`, y la función `nullif(count(*), 0)` cambia un error fatal por un `NULL` informativo.\n\nSobre las alternativas: la expresión `avg(CASE WHEN ... THEN 1.0 ELSE 0.0 END)` calcula directamente la proporción y evita escribir el denominador, que es un patrón muy usado cuando la condición es binaria. También existe `avg((o.status = 'cancelled')::int)`, que es más corta pero menos explícita.\n\nSobre la legibilidad: si la expresión se repite en varias columnas, una expresión de tabla común con los conteos y un `SELECT` externo que haga las divisiones suele leerse mejor que una fórmula de tres líneas.",
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
      "El departamento de Pagos está negociando comisiones con los procesadores y necesita el desempeño de cada medio de pago **solo en los pedidos facturados en pesos mexicanos**, es decir, aquellos cuyo `currency` es igual al texto `'MXN'`, para no mezclar monedas dentro de una misma suma. Ten en cuenta que un mismo pedido puede tener un intento rechazado y otro aprobado: cada fila de la tabla `payments` es un intento. Te piden ese resumen para la negociación.",
    business_question_md:
      "Debes generar un dataset con una fila por `method` y estas columnas: la cantidad de intentos de pago del método bajo el encabezado `payment_attempts`, la suma de `amount` de los intentos cuyo `status` es igual al texto `'approved'` bajo el encabezado `approved_amount`, la suma de `amount` de los intentos cuyo `status` es igual al texto `'refunded'` bajo el encabezado `refunded_amount`, y el porcentaje de intentos aprobados sobre el total de intentos del método, en escala de 0 a 100 y redondeado a 2 decimales, bajo el encabezado `approval_rate_pct`. Considera únicamente los pagos de pedidos cuyo `currency` es igual al texto `'MXN'` y ordena por `approved_amount` de mayor a menor.",
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
          "Hay dos niveles de filtrado que no se pisan entre sí: el recorte del universo, que deja una sola moneda, va en la cláusula `WHERE`, y la separación por estado del intento va dentro de cada agregado.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Une la tabla `payments` con `orders` por la columna `order_id` para poder filtrar con `o.currency = 'MXN'`, y agrupa por `p.method`. Las columnas `approved_amount` y `refunded_amount` son sumas de `p.amount` con condición sobre `p.status`; la tasa, en cambio, se calcula con conteos y no con importes.",
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
          "Omitir la condición `WHERE o.currency = 'MXN'`: sumarías pesos argentinos, colombianos y mexicanos dentro de la misma columna, un importe que no significa nada.",
      },
      {
        category: "cell_values",
        description_md:
          "Calcular la tasa con importes, como `approved_amount / sum(amount)`, en lugar de calcularla con intentos: la pregunta es qué porcentaje de intentos se aprueba y no qué porcentaje del dinero.",
      },
      {
        category: "aggregation_level",
        description_md:
          "Agrupar por `p.method` y `p.status` a la vez: cada método se abre en tres filas y desaparece la comparación entre lo aprobado y lo reembolsado dentro de la misma línea.",
      },
      {
        category: "join_condition",
        description_md:
          "Unir con la condición `o.id = p.id` en lugar de `o.id = p.order_id`: la consulta se ejecuta, pero cruza pagos con pedidos que no les corresponden.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da cinco filas, una por método de pago. La tarjeta de crédito domina el volumen, con 15 641 417,55 pesos mexicanos aprobados sobre 2838 intentos, pero tiene una de las tasas de aprobación más bajas, del 80,76 %; el efectivo, con muchísimo menos volumen, aprueba el 83,88 %. La billetera es la que más rechaza, con 78,75 %.\n\nHay dos decisiones de negocio incorporadas en la consulta. La primera es la condición sobre la moneda: sumar importes de monedas distintas es el error silencioso más común en los reportes de pagos. La segunda es que la tasa se calcula sobre intentos y no sobre importes, porque mide la salud técnica del procesador y no el ticket promedio.\n\nSobre la escritura: la expresión `sum(p.amount) FILTER (WHERE p.status = 'approved')` equivale a `sum(CASE WHEN p.status = 'approved' THEN p.amount END)`. Acá conviene **no** poner `ELSE 0`: sumar ceros no cambia el resultado, pero si un método no tuviera ningún intento aprobado querrás ver `NULL`, que significa «no hubo», en lugar de un `0`. Si el tablero necesita un cero explícito, envuélvelo con `coalesce(..., 0)` y documenta la decisión.",
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
      "El departamento de Calidad está armando el ranking de reputación de los vendedores. Definieron como **promotora** a toda reseña con `rating` de 4 o 5, y como **detractora** a la de 1 o 2; las de 3 son neutras y no suman ni restan. El indicador que reportan es el porcentaje de promotoras menos el porcentaje de detractoras. Para que el número sea confiable, solo entran los vendedores con al menos 20 reseñas. Te piden ese ranking para la revisión trimestral.",
    business_question_md:
      "Debes generar un dataset con una fila por vendedor, con el `store_name`, la cantidad de reseñas de sus productos bajo el encabezado `total_reviews`, las reseñas con `rating` mayor o igual a 4 bajo el encabezado `promoter_reviews`, las reseñas con `rating` menor o igual a 2 bajo el encabezado `detractor_reviews` y el indicador bajo el encabezado `nps`, calculado como las promotoras menos las detractoras, dividido por el total y multiplicado por 100, **redondeado a 1 decimal**. Debes incluir solamente a los vendedores con 20 reseñas o más. Ordena por `nps` de mayor a menor y, si dos vendedores empatan, debes desempatar usando `store_name` ascendente.",
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
          "Las reseñas no apuntan al vendedor: apuntan al producto. Necesitas encadenar dos cruces para llegar desde la reseña hasta la tienda. Y el corte por cantidad de reseñas es un filtro **de grupos**, no de filas.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "El camino va de `reviews.product_id` hacia `products.id`, y de `products.seller_id` hacia `sellers.id`. Agrupa por el vendedor, incluyendo `s.id` en el `GROUP BY` para no fusionar dos tiendas que tengan el mismo nombre, usa `HAVING count(*) >= 20` y arma la columna `nps` con la resta de los dos conteos condicionales dividida por el total.",
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
          "Poner el corte de 20 reseñas en la cláusula `WHERE`: la condición `WHERE count(*) >= 20` no es válida, porque el conteo del grupo todavía no existe cuando se evalúa el `WHERE`. Ese filtro va en la cláusula `HAVING`.",
      },
      {
        category: "cell_values",
        description_md:
          "Tratar las reseñas de 3 estrellas como detractoras, usando `rating < 4`: el enunciado las define como neutras y el indicador queda sistemáticamente más bajo.",
      },
      {
        category: "join_condition",
        description_md:
          "Unir la tabla `reviews` directamente con `sellers` por `customer_id`, o saltarse la tabla `products`: no hay ninguna relación directa entre la reseña y la tienda.",
      },
      {
        category: "aggregation_level",
        description_md:
          "Agrupar solamente por `s.store_name`: si dos tiendas compartieran nombre quedarían sumadas en una sola fila. Agrupar también por `s.id` mantiene un vendedor por fila.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 95 vendedores que superan el umbral de 20 reseñas. El mejor es «Casa Tropical 128», con 84,0 puntos, resultado de 21 reseñas promotoras y ninguna detractora sobre 25 reseñas en total; la cola del ranking queda cerca de 30.\n\nLa fórmula es un caso típico de varias agregaciones condicionales combinadas dentro de una misma expresión: dos conteos con condiciones distintas se restan y el resultado se divide por el total del mismo grupo. Escribir eso con subconsultas exigiría recorrer la tabla `reviews` tres veces.\n\nLa condición `HAVING count(*) >= 20` protege la lectura del indicador: un vendedor con 2 reseñas positivas daría 100,0 y encabezaría el ranking sin ninguna evidencia real. Cuando un umbral así aparece en un reporte, conviene dejarlo escrito en el título de la tabla y no solamente en el SQL.\n\nUna alternativa elegante: la expresión `sum(CASE WHEN rating >= 4 THEN 1 WHEN rating <= 2 THEN -1 ELSE 0 END)` calcula el saldo de promotoras menos detractoras en un solo agregado, aprovechando que gana la primera rama verdadera. Es más corta, aunque menos evidente para quien lea la consulta por primera vez.",
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
      "El departamento de Producto quiere medir la adopción de la aplicación móvil, y la pregunta no es cuántos **pedidos** entran por cada canal sino cuántas **personas distintas** usan cada uno. Un cliente que hizo 20 pedidos por la app cuenta igual que uno que hizo uno solo. Los pedidos cancelados no se consideran uso real del canal y quedan fuera del análisis. Te piden ese indicador para decidir cuánto invertir en la app.",
    business_question_md:
      "Debes generar un dataset con una fila por país del cliente, considerando únicamente los pedidos cuyo `status` sea distinto del texto `'cancelled'`, con estas columnas: el `country`, la cantidad de clientes distintos con al menos un pedido bajo el encabezado `buying_customers`, la cantidad de clientes distintos con al menos un pedido cuyo `channel` es igual al texto `'app'` bajo el encabezado `app_customers`, la cantidad de clientes distintos con al menos un pedido cuyo `channel` es igual al texto `'web'` bajo el encabezado `web_customers`, y el cociente entre `app_customers` y `buying_customers`, en escala de 0 a 100 y redondeado a 1 decimal, bajo el encabezado `app_adoption_pct`. Ordena por `app_adoption_pct` de mayor a menor y, si dos países empatan, debes desempatar usando `country` ascendente.",
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
          "La unidad de medida no es el pedido sino la persona. Cualquier conteo que sume una unidad por fila va a contar de más a quien compró varias veces: el agregado tiene que eliminar repeticiones **y**, además, aplicar la condición del canal.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Une la tabla `orders` con `customers`, descarta los pedidos cancelados en la cláusula `WHERE` y agrupa por `c.country`. Para cada canal necesitas contar clientes distintos solo entre las filas de ese canal: la función `count(DISTINCT ...)` admite una cláusula `FILTER (WHERE ...)`, y la variante portable consiste en poner un `CASE` sin `ELSE` dentro del `DISTINCT`. Ten en cuenta que las columnas no suman el total, porque hay clientes que usan los dos canales.",
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
          "Usar `count(*) FILTER (...)` o `sum(CASE WHEN channel = 'app' THEN 1 ELSE 0 END)`: esas formas cuentan pedidos y no personas, así que quien compró 20 veces pesa 20 veces en el resultado.",
      },
      {
        category: "missing_filter",
        description_md:
          "Olvidar la condición `WHERE o.status <> 'cancelled'`: entrarían pedidos cancelados, que el enunciado excluye por no representar uso real del canal.",
      },
      {
        category: "cell_values",
        description_md:
          "Esperar que la suma de `app_customers` y `web_customers` sea igual a `buying_customers`: un cliente puede comprar por los dos canales y aparecer en las dos columnas. Las columnas se solapan a propósito.",
      },
      {
        category: "aggregation_level",
        description_md:
          "Agrupar por `c.country` y `o.channel`: se pierde el formato ancho y la tasa deja de ser comparable entre canales dentro de la misma fila.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da seis filas. Uruguay lidera con un 90,9 % de sus 110 compradores usando la app; Colombia queda último con un 82,9 % sobre 434 compradores. La suma de `app_customers` y `web_customers` supera a `buying_customers` en todos los países: mucha gente usa los dos canales, y eso es información y no un error.\n\nEste ejercicio es el caso donde las dos formas de agregación condicional dejan de ser intercambiables. La expresión `sum(CASE WHEN ... THEN 1 ELSE 0 END)` cuenta filas; para contar entidades distintas hay que eliminar duplicados antes de contar, y eso solo lo hace la palabra clave `DISTINCT` dentro del agregado. Las dos escrituras válidas son `count(DISTINCT o.customer_id) FILTER (WHERE o.channel = 'app')` y `count(DISTINCT CASE WHEN o.channel = 'app' THEN o.customer_id END)`: el `CASE` sin `ELSE` devuelve `NULL` para las filas de otros canales y la función `count` ignora los `NULL`.\n\nSobre el rendimiento: la función `count(DISTINCT ...)` obliga al motor a ordenar los valores de cada grupo, o a armar una tabla auxiliar con ellos, y es bastante más cara que un `count(*)`. Con volúmenes grandes, el patrón habitual es agregar primero en una expresión de tabla común a nivel de cliente y canal, y contar después; acá, con 18 000 pedidos, la consulta directa es más clara y la diferencia es imperceptible.\n\nSobre la definición de negocio: «cliente activo» quedó definido como quien tiene al menos un pedido no cancelado en toda la historia del marketplace. Si el tablero fuera mensual, habría que agregar el recorte de fechas a la cláusula `WHERE`, y la tasa cambiaría bastante.",
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
