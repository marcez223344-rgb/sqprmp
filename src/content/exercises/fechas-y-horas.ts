import {
  defaultHintMeta,
  defaultReward,
  defaultSolutionUnlock,
  type ExerciseDef,
} from "../schemas/exercise";

const section = "fechas-y-horas";
const tiendaviva = { slug: "tiendaviva", version: 1 };
const pidelo = { slug: "pidelo", version: 1 };

export const exercises: ExerciseDef[] = [
  {
    slug: "ano-y-mes-de-alta-de-vendedores",
    section,
    title: "Año y mes de alta de cada vendedor",
    difficulty: "very_easy",
    estimated_minutes: 4,
    concepts: ["select", "alias", "date_functions"],
    dataset: tiendaviva,
    tables_used: ["sellers"],
    scenario_md:
      "El departamento de Vendedores está armando un tablero de cohortes de alta y necesita, como primer paso, el año y el mes en que se dio de alta cada tienda de **TiendaViva**. Hoy en la base solo tienen la fecha completa, guardada en la columna `sellers.joined_at`, y te piden separarla en dos números.",
    business_question_md:
      "Debes generar un dataset que devuelva, para cada vendedor, su `id`, su `store_name`, el año de alta bajo el encabezado `joined_year` y el mes de alta bajo el encabezado `joined_month`, expresado como número de mes del 1 al 12. El orden de las filas no importa.",
    learning_objective:
      "Obtener partes de una fecha con EXTRACT y nombrarlas con alias legibles para un reporte.",
    theory_ref: "fechas-tipos-y-partes",
    expected_columns: [
      { name: "id", type: "integer" },
      { name: "store_name", type: "text" },
      { name: "joined_year", type: "numeric" },
      { name: "joined_month", type: "numeric" },
    ],
    validation_rules: { required_concepts: ["date_functions", "alias"] },
    reference_solution:
      "SELECT id,\n       store_name,\n       EXTRACT(YEAR FROM joined_at) AS joined_year,\n       EXTRACT(MONTH FROM joined_at) AS joined_month\nFROM sellers;",
    alternative_solutions: [
      {
        label: "Con DATE_PART",
        sql: "SELECT id, store_name, DATE_PART('year', joined_at) AS joined_year, DATE_PART('month', joined_at) AS joined_month FROM sellers;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "No necesitas filtrar ni agrupar nada: se trata de leer una parte de una fecha que ya existe en cada fila. Hay una función que devuelve un número a partir de una fecha.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Trabaja sobre la columna `sellers.joined_at`. La expresión `EXTRACT(campo FROM columna)` acepta campos como `YEAR` y `MONTH`, y cada columna calculada necesita su alias con `AS` para que el reporte salga con los nombres pedidos.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT id,\n       store_name,\n       EXTRACT(___ FROM ___) AS joined_year,\n       EXTRACT(___ FROM ___) AS joined_month\nFROM ___;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "wrong_columns",
        description_md:
          "Devolver la columna `joined_at` completa en lugar del año y el mes por separado: el tablero necesita dos números independientes.",
      },
      {
        category: "readability",
        description_md:
          "Olvidar los alias `AS joined_year` y `AS joined_month`: las columnas quedan con nombres generados por el motor y el reporte no coincide con lo pedido.",
      },
      {
        category: "cell_values",
        description_md:
          "Usar `EXTRACT(DAY FROM joined_at)` en lugar de `MONTH`: devuelve el día del mes y no el mes.",
      },
      {
        category: "syntax",
        description_md:
          "Escribir `EXTRACT(YEAR, joined_at)`: la sintaxis usa la palabra clave `FROM` y no una coma.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 180 filas, una por vendedor. La expresión `EXTRACT(campo FROM fecha)` devuelve un valor numérico, así que la columna `joined_year` trae el número `2022` o `2023` y no el texto `'2022'`: si después lo comparas, hazlo contra números.\n\nLa expresión `DATE_PART('year', joined_at)` es exactamente equivalente; `EXTRACT` es la forma del estándar SQL y `DATE_PART` es la forma de función. Elige una y sé consistente dentro del mismo equipo.\n\nPara un tablero de cohortes real, el siguiente paso sería usar `DATE_TRUNC('month', joined_at)`: el año y el mes por separado sirven para leer, pero se vuelven incómodos al ordenar una serie temporal, porque hay que ordenar por dos columnas.",
    reward: defaultReward("very_easy"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "pedidos-del-ultimo-dia-de-agosto",
    section,
    title: "Los pedidos que el cierre de mes dejó afuera",
    difficulty: "easy",
    estimated_minutes: 7,
    concepts: ["select", "where", "date_functions"],
    dataset: tiendaviva,
    tables_used: ["orders"],
    scenario_md:
      "El departamento de Finanzas cerró agosto de 2025 con un filtro escrito como `BETWEEN '2025-08-01' AND '2025-08-31'` y el total no cuadra con el del sistema de facturación. Sospechan que se perdieron los pedidos del último día del mes y te piden verlos para poder conciliar las dos cifras.",
    business_question_md:
      "Debes generar un dataset que devuelva los pedidos de la tabla `orders` creados el **31 de agosto de 2025**, a cualquier hora de ese día, con las columnas `id`, `created_at` y `total_amount`, ordenados cronológicamente por `created_at` y, si dos pedidos comparten el mismo instante, debes desempatar usando `id` ascendente.\n\nTen en cuenta que la columna `created_at` es de tipo `timestamptz`: guarda fecha **y** hora.",
    learning_objective:
      "Filtrar un día completo en una columna con hora usando un rango medio abierto en lugar de BETWEEN.",
    theory_ref: "fechas-rangos-sin-errores-de-borde",
    expected_columns: [
      { name: "id", type: "integer" },
      { name: "created_at", type: "timestamp" },
      { name: "total_amount", type: "numeric" },
    ],
    validation_rules: { order_matters: true, required_concepts: ["where", "order_by"] },
    reference_solution:
      "SELECT id,\n       created_at,\n       total_amount\nFROM orders\nWHERE created_at >= DATE '2025-08-31'\n  AND created_at < DATE '2025-09-01'\nORDER BY created_at, id;",
    alternative_solutions: [
      {
        label: "Comparando el día con un cast",
        sql: "SELECT id, created_at, total_amount FROM orders WHERE created_at::date = DATE '2025-08-31' ORDER BY created_at, id;",
      },
      {
        label: "Con DATE_TRUNC sobre el día",
        sql: "SELECT id, created_at, total_amount FROM orders WHERE DATE_TRUNC('day', created_at) = TIMESTAMP '2025-08-31 00:00:00' ORDER BY created_at, id;",
      },
    ],
    improvement_feedback: [
      {
        condition: "uses_between_for_timestamps",
        message_key: "improve.uses_between_for_timestamps",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Una fecha escrita sin hora equivale a ese día a las 00:00. Por eso un filtro que termina en el literal `'2025-08-31'` solo alcanza el primer instante del día. Piensa en un rango que **empiece** en el día pedido y **termine** al comenzar el día siguiente.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Necesitas dos condiciones sobre la columna `orders.created_at` unidas con `AND`: una con el operador `>=` contra el 31 de agosto y otra con el operador `<`, que es estricto, contra el 1 de septiembre. Después ordena por `created_at` y por `id`.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT id, created_at, total_amount\nFROM orders\nWHERE created_at ___ DATE '2025-08-31'\n  AND created_at ___ DATE '____-__-__'\nORDER BY ___, ___;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "date_boundary",
        description_md:
          "Escribir `BETWEEN DATE '2025-08-31' AND DATE '2025-08-31'` o `created_at <= DATE '2025-08-31'`: las dos formas solo capturan los pedidos creados exactamente a las 00:00:00 y el resultado queda casi vacío.",
      },
      {
        category: "missing_filter",
        description_md:
          "Filtrar solamente con `>= DATE '2025-08-31'`: entran también todos los pedidos de septiembre.",
      },
      {
        category: "wrong_order",
        description_md:
          "Omitir la cláusula `ORDER BY`, u ordenar solo por `id`: Finanzas pide la conciliación en orden cronológico.",
      },
      {
        category: "cell_values",
        description_md:
          "Devolver la columna `subtotal` en lugar de `total_amount`: el total facturado incluye el descuento y el costo de envío.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 36 pedidos. El filtro `BETWEEN DATE '2025-08-01' AND DATE '2025-08-31'` que usó Finanzas devuelve 1172 pedidos, cuando agosto tuvo 1208. Los 36 que faltaban son exactamente estos: los del 31 de agosto creados después de la medianoche.\n\nEl patrón `>= inicio AND < inicio del período siguiente`, llamado rango medio abierto, funciona igual para un día, un mes o un año, no depende de la cantidad de días que tenga el mes y nunca superpone dos períodos consecutivos.\n\nLas condiciones `created_at::date = DATE '2025-08-31'` y `DATE_TRUNC('day', created_at) = ...` devuelven lo mismo y se leen muy bien. Su costo aparece con volumen: al aplicar una función sobre la columna, un índice común sobre `created_at` deja de usarse y el motor recorre toda la tabla. En un cierre mensual sobre millones de filas, el rango medio abierto es la opción a defender.",
    reward: defaultReward("easy"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "dias-de-entrega-por-envio",
    section,
    title: "Días de entrega de la primera semana de septiembre",
    difficulty: "easy",
    estimated_minutes: 9,
    concepts: ["select", "where", "alias", "null_handling", "order_by"],
    dataset: tiendaviva,
    tables_used: ["shipments"],
    scenario_md:
      "El departamento de Logística está renegociando tarifas y quiere revisar los envíos despachados en la primera semana de septiembre de 2025, del día 1 al 7 inclusive. Solo le interesan los que ya llegaron a destino, porque con los que siguen en camino todavía no se puede medir nada. Te piden ese detalle para llegar con datos a la negociación.",
    business_question_md:
      "Debes generar un dataset que devuelva, para cada envío de la tabla `shipments` despachado entre el **1 y el 7 de septiembre de 2025** inclusive y que **ya fue entregado**, es decir, que tiene valor en la columna `delivered_at`, las columnas `order_id`, `shipped_at`, `delivered_at` y `delivery_days`, esta última con los **días calendario** transcurridos entre el despacho y la entrega. Ordena de mayor a menor `delivery_days` y, si dos envíos empatan, debes desempatar usando `order_id` ascendente.",
    learning_objective:
      "Calcular una diferencia en días calendario entre dos timestamps y excluir las filas sin fecha de entrega.",
    theory_ref: "fechas-diferencias-e-intervalos",
    expected_columns: [
      { name: "order_id", type: "integer" },
      { name: "shipped_at", type: "timestamp" },
      { name: "delivered_at", type: "timestamp" },
      { name: "delivery_days", type: "integer" },
    ],
    validation_rules: { order_matters: true, required_concepts: ["where", "alias"] },
    reference_solution:
      "SELECT order_id,\n       shipped_at,\n       delivered_at,\n       delivered_at::date - shipped_at::date AS delivery_days\nFROM shipments\nWHERE shipped_at >= DATE '2025-09-01'\n  AND shipped_at < DATE '2025-09-08'\n  AND delivered_at IS NOT NULL\nORDER BY delivery_days DESC, order_id;",
    alternative_solutions: [
      {
        label: "Con CAST explícito",
        sql: "SELECT order_id, shipped_at, delivered_at, CAST(delivered_at AS date) - CAST(shipped_at AS date) AS delivery_days FROM shipments WHERE shipped_at >= DATE '2025-09-01' AND shipped_at < DATE '2025-09-08' AND delivered_at IS NOT NULL ORDER BY delivery_days DESC, order_id;",
      },
      {
        label: "Con AGE y EXTRACT",
        sql: "SELECT order_id, shipped_at, delivered_at, EXTRACT(DAY FROM AGE(delivered_at::date, shipped_at::date)) AS delivery_days FROM shipments WHERE shipped_at >= DATE '2025-09-01' AND shipped_at < DATE '2025-09-08' AND delivered_at IS NOT NULL ORDER BY delivery_days DESC, order_id;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Restar dos columnas que incluyen hora te da un intervalo con horas y minutos; restar dos valores de tipo fecha te da un número entero de días. La consigna pide días calendario, así que conviene llevar los dos extremos al mismo tipo antes de restar.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Trabaja sobre la tabla `shipments`: el rango sobre `shipped_at` va del 1 de septiembre inclusive al 8 de septiembre excluido, y hay que descartar las filas en las que la columna `delivered_at` está en `NULL`. La resta entre fechas necesita el alias `AS delivery_days` para poder ordenar por ella.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT order_id,\n       shipped_at,\n       delivered_at,\n       ___::date - ___::date AS delivery_days\nFROM shipments\nWHERE shipped_at >= DATE '____-__-__'\n  AND shipped_at < DATE '____-__-__'\n  AND delivered_at ___\nORDER BY delivery_days ___, order_id;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "null_handling",
        description_md:
          "No excluir los envíos que tienen `delivered_at` en `NULL`: la resta devuelve `NULL` y aparecen filas sin información que Logística no pidió.",
      },
      {
        category: "date_boundary",
        description_md:
          "Cerrar el rango con `shipped_at <= DATE '2025-09-07'`: se pierden los despachos del 7 de septiembre posteriores a la medianoche.",
      },
      {
        category: "cell_values",
        description_md:
          "Restar las marcas de tiempo sin convertirlas, escribiendo `delivered_at - shipped_at`: el resultado es un intervalo como `2 days 05:13:00` y no un número de días.",
      },
      {
        category: "cell_values",
        description_md:
          "Usar `EXTRACT(DAY FROM delivered_at - shipped_at)` sobre las marcas de tiempo completas: esa expresión toma solo el componente de días del intervalo y descarta las horas sobrantes, así que subestima las entregas que cruzan la medianoche.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 192 envíos, con valores de `delivery_days` que van de 1 a 10 en el dataset completo.\n\nLa expresión `delivered_at::date - shipped_at::date` primero recorta los dos instantes al día y después resta: el resultado es un número entero de días calendario, que es la métrica que usa Logística para comparar transportistas. Si el negocio pidiera el tiempo real de tránsito, la fórmula correcta sería `EXTRACT(EPOCH FROM (delivered_at - shipped_at)) / 86400`, que reconoce las fracciones de día. Las dos son válidas: lo que no es válido es no saber cuál te pidieron.\n\nEl filtro `delivered_at IS NOT NULL` no es un detalle menor: en la tabla `shipments` hay 1110 envíos sin entrega registrada. Sin ese filtro, la resta produce `NULL` y el ordenamiento descendente los ubica primero, con lo que el reporte abriría con filas vacías.\n\nOrdenar por el alias `delivery_days` funciona porque la cláusula `ORDER BY` se evalúa después del `SELECT`; el desempate por `order_id` hace que el resultado sea reproducible, algo imprescindible cuando el reporte se compara entre ejecuciones.",
    reward: defaultReward("easy"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "entregas-fuera-de-la-promesa",
    section,
    title: "Entregas fuera de la promesa en Pídelo",
    difficulty: "intermediate",
    estimated_minutes: 12,
    concepts: ["select", "where", "alias", "date_functions", "numeric_functions", "order_by"],
    dataset: pidelo,
    tables_used: ["orders"],
    scenario_md:
      "En **Pídelo**, cada pedido le promete al cliente un tiempo de entrega en minutos, guardado en la columna `promised_minutes`. El departamento de Atención al Cliente quiere revisar, para el sábado 13 de septiembre de 2025, los pedidos que llegaron **después** de esa promesa, y te pide ese listado para decidir a quién compensar.",
    business_question_md:
      "Debes generar un dataset que devuelva los pedidos de la tabla `orders` realizados el **13 de septiembre de 2025**, según la columna `placed_at`, que fueron entregados **más tarde** que `placed_at` más `promised_minutes` minutos. Las columnas son el `id`, el `placed_at`, el `delivered_at` y el `delay_minutes`, esta última con los minutos de retraso respecto de la promesa, redondeados al minuto. Ordena de mayor a menor retraso y, si dos pedidos empatan, debes desempatar usando `id` ascendente.",
    learning_objective:
      "Sumar un intervalo calculado a partir de una columna y convertir la diferencia entre dos timestamps en minutos.",
    theory_ref: "fechas-diferencias-e-intervalos",
    expected_columns: [
      { name: "id", type: "integer" },
      { name: "placed_at", type: "timestamp" },
      { name: "delivered_at", type: "timestamp" },
      { name: "delay_minutes", type: "integer" },
    ],
    validation_rules: {
      order_matters: true,
      required_concepts: ["where", "date_functions", "alias"],
    },
    reference_solution:
      "SELECT id,\n       placed_at,\n       delivered_at,\n       ROUND(EXTRACT(EPOCH FROM (delivered_at - placed_at)) / 60) - promised_minutes AS delay_minutes\nFROM orders\nWHERE placed_at >= DATE '2025-09-13'\n  AND placed_at < DATE '2025-09-14'\n  AND delivered_at > placed_at + promised_minutes * INTERVAL '1 minute'\nORDER BY delay_minutes DESC, id;",
    alternative_solutions: [
      {
        label: "Midiendo el retraso contra la hora prometida",
        sql: "SELECT id, placed_at, delivered_at, ROUND(EXTRACT(EPOCH FROM (delivered_at - (placed_at + promised_minutes * INTERVAL '1 minute'))) / 60) AS delay_minutes FROM orders WHERE placed_at >= DATE '2025-09-13' AND placed_at < DATE '2025-09-14' AND delivered_at IS NOT NULL AND delivered_at > placed_at + promised_minutes * INTERVAL '1 minute' ORDER BY delay_minutes DESC, id;",
      },
      {
        label: "Comparando dos intervalos",
        sql: "SELECT id, placed_at, delivered_at, ROUND(EXTRACT(EPOCH FROM (delivered_at - placed_at)) / 60) - promised_minutes AS delay_minutes FROM orders WHERE placed_at >= DATE '2025-09-13' AND placed_at < DATE '2025-09-14' AND delivered_at - placed_at > promised_minutes * INTERVAL '1 minute' ORDER BY delay_minutes DESC, id;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Hay dos cálculos distintos: uno sirve para **decidir si el pedido llegó tarde**, comparando el momento de entrega con el momento prometido, y otro para **medir cuánto tarde llegó**, pasando una diferencia entre instantes a minutos. Para el primero necesitas convertir un número de minutos en una duración; para el segundo, convertir una duración en un número.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "En la tabla `orders`, el momento prometido se escribe como `placed_at + promised_minutes * INTERVAL '1 minute'`. Para los minutos reales, la expresión `EXTRACT(EPOCH FROM (delivered_at - placed_at))` da segundos: divídelos entre 60 y redondea con la función `ROUND`. El retraso es esa cantidad menos `promised_minutes`. El día se filtra con un rango medio abierto sobre `placed_at`.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT id,\n       placed_at,\n       delivered_at,\n       ___(EXTRACT(___ FROM (delivered_at - placed_at)) / ___) - ___ AS delay_minutes\nFROM orders\nWHERE placed_at >= DATE '____-__-__'\n  AND placed_at < DATE '____-__-__'\n  AND delivered_at > placed_at + ___ * INTERVAL '1 minute'\nORDER BY ___ DESC, id;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "cell_values",
        description_md:
          "Comparar `delivered_at - placed_at > promised_minutes`: no se puede comparar un intervalo con un número, así que hay que convertir uno de los dos, ya sea multiplicando por `INTERVAL '1 minute'` o usando `EXTRACT(EPOCH ...)`.",
      },
      {
        category: "date_boundary",
        description_md:
          "Filtrar el día con `placed_at BETWEEN DATE '2025-09-13' AND DATE '2025-09-14'`: además de perder las horas del día 13, agrega los pedidos del 14 hechos a las 00:00.",
      },
      {
        category: "cell_values",
        description_md:
          "Usar `EXTRACT(MINUTE FROM (delivered_at - placed_at))`: devuelve solo el componente de minutos del intervalo, que es un número entre 0 y 59, y descarta las horas.",
      },
      {
        category: "null_handling",
        description_md:
          "Suponer que hace falta agregar `delivered_at IS NOT NULL` por separado y después olvidarlo en otros reportes: aquí la comparación `delivered_at > ...` ya descarta los valores `NULL`, porque una comparación con `NULL` nunca puede dar verdadero.",
      },
      {
        category: "wrong_order",
        description_md:
          "Ordenar por `delay_minutes` en forma ascendente: Atención al Cliente quiere ver primero los casos más graves.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 12 pedidos, con retrasos que van de 6 a 38 minutos. El caso más grave es el pedido 12140, que se hizo a las 22:43 del día 13 y se entregó a las 00:01 del día 14: cruzar la medianoche no complica el cálculo, porque estamos restando instantes y no días.\n\nDos conversiones hacen todo el trabajo. La expresión `promised_minutes * INTERVAL '1 minute'` transforma un número entero de la tabla en una duración, que es la única forma de sumarlo a una marca de tiempo, ya que `placed_at + 45` no compila. La expresión `EXTRACT(EPOCH FROM intervalo)` hace el camino inverso: devuelve la duración total en segundos, que dividida entre 60 da los minutos reales. Nunca uses `EXTRACT(MINUTE FROM ...)` para esto, porque devuelve el componente de minutos y entonces «1 hora 5 minutos» daría 5.\n\nLa segunda solución alternativa mide el retraso directamente contra el momento prometido; es la más expresiva, porque el número que informa el reporte se calcula con la misma expresión que decide si hubo retraso. La tercera compara directamente dos duraciones, con `delivered_at - placed_at > promised_minutes * INTERVAL '1 minute'`: también es correcta, porque dos valores de tipo `interval` sí se comparan entre sí.\n\nSobre los valores `NULL`: el filtro `delivered_at > placed_at + ...` ya excluye los pedidos sin entregar, porque toda comparación con `NULL` es desconocida y la cláusula `WHERE` solo deja pasar lo verdadero. Aun así, muchos equipos escriben `delivered_at IS NOT NULL` de forma explícita: no cambia el resultado y deja la intención por escrito para quien lea la consulta dentro de seis meses.",
    reward: defaultReward("intermediate"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "pedidos-por-mes-con-date-trunc",
    section,
    title: "Serie mensual de pedidos de 2025",
    difficulty: "intermediate",
    estimated_minutes: 12,
    concepts: ["select", "where", "alias", "date_functions", "aggregate", "group_by", "order_by"],
    dataset: tiendaviva,
    tables_used: ["orders"],
    scenario_md:
      "La dirección de **TiendaViva** quiere ver la evolución mensual de pedidos en lo que va de 2025, desde enero hasta agosto inclusive, porque septiembre todavía está en curso y no se puede comparar. El gráfico necesita una fila por mes, con el mes representado por su primer día, y te piden esa serie para la reunión de resultados.\n\nEste ejercicio anticipa la cláusula `GROUP BY`, que vas a estudiar a fondo en la sección 15: por ahora quédate con que la función `COUNT(*)` cuenta las filas de cada grupo definido en el `GROUP BY`.",
    business_question_md:
      "Debes generar un dataset con una fila por mes, con las columnas `month`, que es el primer día del mes y de tipo fecha, y `orders_count`, que es la cantidad de pedidos creados en ese mes, tomando los pedidos de la tabla `orders` creados **desde el 1 de enero de 2025 hasta el 31 de agosto de 2025 inclusive**. Ordena por `month` ascendente.",
    learning_objective:
      "Construir una serie mensual truncando un timestamp con DATE_TRUNC y agrupando por el período resultante.",
    theory_ref: "fechas-tipos-y-partes",
    expected_columns: [
      { name: "month", type: "date" },
      { name: "orders_count", type: "integer" },
    ],
    validation_rules: {
      order_matters: true,
      required_concepts: ["date_functions", "group_by", "aggregate"],
    },
    reference_solution:
      "SELECT DATE_TRUNC('month', created_at)::date AS month,\n       COUNT(*) AS orders_count\nFROM orders\nWHERE created_at >= DATE '2025-01-01'\n  AND created_at < DATE '2025-09-01'\nGROUP BY DATE_TRUNC('month', created_at)\nORDER BY month;",
    alternative_solutions: [
      {
        label: "Agrupando por la posición de la columna",
        sql: "SELECT DATE_TRUNC('month', created_at)::date AS month, COUNT(*) AS orders_count FROM orders WHERE created_at >= DATE '2025-01-01' AND created_at < DATE '2025-09-01' GROUP BY 1 ORDER BY 1;",
      },
      {
        label: "Con CAST explícito y agrupando por el alias",
        sql: "SELECT CAST(DATE_TRUNC('month', created_at) AS date) AS month, COUNT(*) AS orders_count FROM orders WHERE created_at >= DATE '2025-01-01' AND created_at < DATE '2025-09-01' GROUP BY month ORDER BY month;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Todos los pedidos de un mismo mes deben compartir un valor común para poder contarse juntos. Hay una función que recorta una fecha al comienzo de su período y deja el resto en ceros; la expresión `EXTRACT(MONTH ...)` no sirve aquí, porque mezclaría meses de años distintos.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Trabaja sobre la columna `orders.created_at` con `DATE_TRUNC('month', ...)` y conviértela a tipo `date` para que el gráfico reciba una fecha limpia. El rango va desde el 1 de enero de 2025 inclusive hasta el 1 de septiembre de 2025 excluido, y el conteo sale de `COUNT(*)` con una cláusula `GROUP BY` sobre el mes truncado.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT ___('month', created_at)::date AS month,\n       ___ AS orders_count\nFROM orders\nWHERE created_at >= DATE '____-__-__'\n  AND created_at < DATE '____-__-__'\nGROUP BY ___\nORDER BY ___;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "aggregation_level",
        description_md:
          "Agrupar con `EXTRACT(MONTH FROM created_at)`: si el rango incluyera más de un año, enero de 2024 y enero de 2025 caerían dentro del mismo grupo.",
      },
      {
        category: "date_boundary",
        description_md:
          "Cerrar el rango con `created_at <= DATE '2025-08-31'`: agosto pierde los 36 pedidos creados ese día después de la medianoche.",
      },
      {
        category: "missing_filter",
        description_md:
          "Olvidar el límite inferior del rango: entran los pedidos de 2024 y la serie pasa a tener 20 meses en lugar de 8.",
      },
      {
        category: "wrong_order",
        description_md:
          "No ordenar por la columna `month`: sin una cláusula `ORDER BY`, el motor puede devolver los meses en cualquier orden y el gráfico queda desordenado.",
      },
      {
        category: "cell_values",
        description_md:
          "Sumar la columna `total_amount` por mes sin filtrar la moneda: la tabla `orders` mezcla seis monedas distintas y el total resultante no significa nada.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da ocho filas, desde `2025-01-01` hasta `2025-08-01`, con 802, 738, 1117, 1053, 1505, 1185, 1152 y 1208 pedidos respectivamente. El pico de mayo corresponde al Hot Sale, que el dataset modela a propósito.\n\nLa función `DATE_TRUNC('month', created_at)` convierte cualquier instante de agosto en `2025-08-01 00:00:00`; ese valor común es lo que permite agrupar. La conversión `::date` final es cosmética, pero evita que el gráfico reciba una hora `00:00:00` que no significa nada.\n\nSobre la cláusula `GROUP BY`: PostgreSQL acepta agrupar por la expresión completa, por la posición de la columna escribiendo `GROUP BY 1`, o por el alias escribiendo `GROUP BY month`. Las tres formas son válidas y producen el mismo plan; el alias es la más legible y la posición es la más frágil ante cambios en la lista de `SELECT`.\n\nHay dos decisiones de reporte que valen más que la sintaxis. La primera: el rango se cierra con `< DATE '2025-09-01'` para no recortar agosto. La segunda: contamos pedidos en lugar de sumar importes porque la tabla `orders` mezcla seis monedas, y una serie de `SUM(total_amount)` sería una suma de pesos con soles. Para trabajar con valores habría que filtrar una sola moneda o convertir todo a una moneda común con un tipo de cambio.",
    reward: defaultReward("intermediate"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
];
