import {
  defaultHintMeta,
  defaultReward,
  defaultSolutionUnlock,
  type ExerciseDef,
} from "../schemas/exercise";

/**
 * Section 35 — exercises. A learner cannot run `EXPLAIN`: the parser gate
 * (`src/lib/sandbox/gate.ts`) fails with `parse_error` because `pgsql-ast-parser` has no
 * grammar for it, before the statement-kind allowlist is consulted. So no exercise here asks
 * for a plan. The learner measures selectivity and cardinality with plain SQL, writes the
 * query an index can serve, and the plan-level vocabulary lives in the scenario and the
 * expert explanation — the same precedent as section 34.
 *
 * Every figure quoted in an expert explanation was measured with
 * `npx tsx scripts/dataset-query.ts pidelo "<sql>"` against the v1 snapshot.
 */

const section = "indices-y-planes-de-ejecucion";
const pidelo = { slug: "pidelo", version: 1 };
const l1 = "indices-que-es-un-indice";
const l2 = "indices-leer-un-plan-de-ejecucion";
const l3 = "indices-joins-y-pedidos-a-ingenieria";

export const exercises: ExerciseDef[] = [
  {
    slug: "indices-selectividad-de-cada-estado",
    section,
    title: "¿Un índice sobre el estado del pedido serviría?",
    difficulty: "very_easy",
    estimated_minutes: 6,
    concepts: ["group_by", "aggregate", "window_function", "alias", "order_by"],
    dataset: pidelo,
    tables_used: ["orders"],
    scenario_md:
      "En **Pídelo**, alguien del equipo abrió un ticket pidiendo un índice sobre la columna `orders.status`, con el argumento de que se filtra por estado todo el tiempo. El departamento de Ingeniería de Datos te devuelve la pregunta: antes de crear el índice quiere saber **cuántas filas deja pasar cada valor** de esa columna, y te pide esa medición.\n\nEsa proporción se llama **selectividad** y se mide con SQL común, sin necesidad de ver ningún plan de ejecución.",
    business_question_md:
      "Debes generar un dataset con una fila por cada valor de `status` presente en la tabla `orders`, con el `status`, la cantidad de pedidos bajo el encabezado `pedidos` y el porcentaje que representa sobre el total de la tabla bajo el encabezado `pct_del_total`, redondeado a **2 decimales**. Ordena de mayor a menor cantidad de pedidos.",
    learning_objective:
      "Medir la selectividad de un filtro con GROUP BY y un total calculado sobre todas las filas.",
    theory_ref: l1,
    expected_columns: [
      { name: "status", type: "text" },
      { name: "pedidos", type: "integer" },
      { name: "pct_del_total", type: "numeric" },
    ],
    validation_rules: {
      order_matters: true,
      required_concepts: ["group_by", "aggregate", "order_by"],
    },
    reference_solution:
      "SELECT status,\n       count(*) AS pedidos,\n       round(100.0 * count(*) / sum(count(*)) OVER (), 2) AS pct_del_total\nFROM orders\nGROUP BY status\nORDER BY pedidos DESC;",
    alternative_solutions: [
      {
        label: "Con el total en una subconsulta en lugar de una ventana",
        sql: "SELECT status,\n       count(*) AS pedidos,\n       round(100.0 * count(*) / (SELECT count(*) FROM orders), 2) AS pct_del_total\nFROM orders\nGROUP BY status\nORDER BY pedidos DESC;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Son dos medidas en la misma consulta: cuántas filas hay por grupo y cuántas hay en toda la tabla. El desafío es que el segundo número no pertenece al grupo, sino al conjunto completo.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Agrupa `orders` por `status` y cuenta con `count(*)`. Para el total de la tabla tienes dos caminos: una ventana vacía sobre el conteo ya agregado, `sum(count(*)) OVER ()`, o una subconsulta `(SELECT count(*) FROM orders)`. Multiplica por `100.0`, no por `100`, y redondea con `round(..., 2)`.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT status,\n       ___(*) AS pedidos,\n       round(100.0 * count(*) / ___, 2) AS pct_del_total\nFROM orders\nGROUP BY ___\nORDER BY ___ DESC;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "aggregation_level",
        description_md:
          "Dividir por `count(*)` del propio grupo: cada fila daría 100 %. El denominador es el total de la tabla, que no se puede obtener del grupo.",
      },
      {
        category: "cell_values",
        description_md:
          "Escribir `100 * count(*) / count(*)` con enteros: la división entera trunca y el porcentaje sale 0. Multiplica por `100.0` para forzar el decimal.",
      },
      {
        category: "wrong_order",
        description_md:
          "Ordenar por `status` alfabéticamente: la consigna pide de mayor a menor cantidad, que es el orden en que se leen las selectividades.",
      },
      {
        category: "missing_filter",
        description_md:
          "Agregar un `WHERE` para dejar fuera algún estado: la pregunta es cuánto pesa **cada** valor, y el estado que pesa poco es justamente el que justifica un índice.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da dos filas: el estado `'delivered'` con 13 284 pedidos, que son el 92,01 %, y el estado `'cancelled'` con 1153 pedidos, que son el 7,99 %.\n\nCon eso ya puedes contestar el ticket, y la respuesta es «depende del valor». Un índice sobre `status` no sirve para `status = 'delivered'`: ese filtro deja pasar 92 % de la tabla, y recorrer el índice para después ir a buscar 13 284 filas dispersas cuesta más que leer las 14 437 de corrido. Para `status = 'cancelled'` la historia cambia, porque son 1153 filas.\n\nEsa es la diferencia entre «filtramos por estado todo el tiempo» y un pedido que un ingeniero puede evaluar: el primero no dice cuántas filas pasan.\n\nSobre la técnica: `sum(count(*)) OVER ()` suma los conteos ya agregados, así que recorre la tabla una sola vez. La subconsulta `(SELECT count(*) FROM orders)` da el mismo número y se lee más fácil, pero cuenta la tabla otra vez. Con dos filas no se nota; sobre cientos de millones, sí.\n\nUna advertencia de lectura: esta columna tiene apenas dos valores distintos, es decir **cardinalidad** muy baja. En columnas así el promedio no dice nada útil: hay que mirar valor por valor, porque el índice puede ser inútil para el valor frecuente y muy bueno para el raro.",
    reward: defaultReward("very_easy"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "indices-cardinalidad-de-las-columnas-candidatas",
    section,
    title: "Qué columna de pedidos vale la pena indexar",
    difficulty: "easy",
    estimated_minutes: 7,
    concepts: ["aggregate", "distinct", "alias"],
    dataset: pidelo,
    tables_used: ["orders"],
    scenario_md:
      "El departamento de Ingeniería de Datos de **Pídelo** va a revisar los índices de la tabla `orders` y te pide una foto previa: cuántas filas tiene la tabla y **cuántos valores distintos** tiene cada columna por la que se filtra o se une.\n\nEsa cantidad de valores distintos se llama **cardinalidad**. Cuanto más alta es, menos filas deja pasar en promedio un filtro de igualdad por esa columna, y más rinde un índice.",
    business_question_md:
      "Debes generar un dataset de **una sola fila** con seis columnas, en este orden: el total de filas de la tabla `orders` bajo el encabezado `filas`, y después la cantidad de valores distintos de `customer_id`, `restaurant_id`, `courier_id`, `status` y `payment_method`, bajo los encabezados `clientes_distintos`, `restaurantes_distintos`, `repartidores_distintos`, `estados_distintos` y `metodos_distintos` respectivamente.",
    learning_objective:
      "Medir la cardinalidad de varias columnas en una sola pasada y distinguir count(*) de count(DISTINCT columna).",
    theory_ref: l1,
    expected_columns: [
      { name: "filas", type: "integer" },
      { name: "clientes_distintos", type: "integer" },
      { name: "restaurantes_distintos", type: "integer" },
      { name: "repartidores_distintos", type: "integer" },
      { name: "estados_distintos", type: "integer" },
      { name: "metodos_distintos", type: "integer" },
    ],
    validation_rules: { order_matters: false, required_concepts: ["aggregate"] },
    reference_solution:
      "SELECT count(*) AS filas,\n       count(DISTINCT customer_id) AS clientes_distintos,\n       count(DISTINCT restaurant_id) AS restaurantes_distintos,\n       count(DISTINCT courier_id) AS repartidores_distintos,\n       count(DISTINCT status) AS estados_distintos,\n       count(DISTINCT payment_method) AS metodos_distintos\nFROM orders;",
    alternative_solutions: [
      {
        label: "Con subconsultas independientes por columna",
        sql: "SELECT (SELECT count(*) FROM orders) AS filas,\n       (SELECT count(DISTINCT customer_id) FROM orders) AS clientes_distintos,\n       (SELECT count(DISTINCT restaurant_id) FROM orders) AS restaurantes_distintos,\n       (SELECT count(DISTINCT courier_id) FROM orders) AS repartidores_distintos,\n       (SELECT count(DISTINCT status) FROM orders) AS estados_distintos,\n       (SELECT count(DISTINCT payment_method) FROM orders) AS metodos_distintos;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "«Cuántas filas» y «cuántos valores distintos» son dos conteos diferentes, y los dos caben en la misma consulta sin agrupar por nada.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "`count(*)` cuenta filas; `count(DISTINCT columna)` cuenta valores distintos de esa columna. Sin `GROUP BY`, la consulta devuelve una sola fila con todos los conteos. Ponle a cada uno el alias que pide la consigna.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT ___(*) AS filas,\n       ___(___ customer_id) AS clientes_distintos,\n       ___(___ restaurant_id) AS restaurantes_distintos,\n       ___(___ courier_id) AS repartidores_distintos,\n       ___(___ status) AS estados_distintos,\n       ___(___ payment_method) AS metodos_distintos\nFROM ___;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "duplicates",
        description_md:
          "Usar `count(columna)` sin `DISTINCT`: cuenta cuántas filas tienen valor en esa columna, no cuántos valores distintos hay. Para `customer_id` daría 14 437 en lugar de 4810.",
      },
      {
        category: "aggregation_level",
        description_md:
          "Agregar `GROUP BY status` o cualquier otro: la consigna pide una sola fila con la foto de la tabla completa.",
      },
      {
        category: "wrong_columns",
        description_md:
          "Devolver las columnas en otro orden o con otros nombres: el reporte lo consume ingeniería de datos y compara posición por posición.",
      },
      {
        category: "null_handling",
        description_md:
          "Suponer que `count(DISTINCT courier_id)` cuenta también los pedidos sin repartidor: `count` de una columna ignora los NULL, y en `orders` hay 1153 pedidos con `courier_id` NULL.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da una sola fila con estos valores: 14 437 filas en total, 4810 clientes distintos, 400 restaurantes, 600 repartidores, 2 estados y 3 métodos de pago.\n\nOrdenados por cardinalidad, los candidatos se separan solos. `customer_id` tiene 4810 valores distintos, así que un filtro por un cliente deja pasar unas 3 filas en promedio: un índice ahí es casi siempre buena idea, y de hecho existe. `restaurant_id` y `courier_id` están en cientos, con unas 36 y 22 filas por valor: también indexables, y también indexados. `status` y `payment_method` tienen 2 y 3 valores, o sea miles de filas por valor: ahí un índice solo sirve para el valor raro.\n\nUn detalle que conviene tener presente al leer estos números: `count(DISTINCT courier_id)` devuelve 600, pero **ignora los NULL**. Los 1153 pedidos sin repartidor son exactamente los 1153 cancelados, y no aparecen en ese conteo. Si la pregunta hubiera sido «cuántos pedidos tienen repartidor asignado», el número correcto es `count(courier_id)` = 13 284.\n\nDos límites honestos de esta medición. La cardinalidad es un promedio, y un promedio esconde la distribución: una columna con 4810 valores distintos donde un cliente concentrara la mitad de los pedidos se comportaría, para ese cliente, como una columna de cardinalidad baja. Y la cardinalidad sola no alcanza para decidir: hay que cruzarla con qué filtros corren de verdad en producción y cada cuánto.",
    reward: defaultReward("easy"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "indices-cuantas-filas-deja-pasar-el-filtro",
    section,
    title: "La medición que acompaña un pedido de índice",
    difficulty: "intermediate",
    estimated_minutes: 9,
    concepts: ["aggregate", "conditional_aggregation", "where", "numeric_functions", "alias"],
    dataset: pidelo,
    tables_used: ["orders"],
    scenario_md:
      "El panel que usa cada restaurante de **Pídelo** para ver su mes tarda ocho segundos. La consulta que lo alimenta filtra la tabla `orders` por un restaurante y un mes. Vas a pedir un índice compuesto por las columnas `restaurant_id` y `placed_at`, y ese pedido necesita el número que el departamento de Ingeniería siempre reclama: **cuántas filas deja pasar ese filtro y sobre cuántas filas de la tabla**.\n\nEl caso concreto es el restaurante con `id` igual a 194, *Sabor Peralta 194* de Ciudad de México, durante agosto de 2025.",
    business_question_md:
      "Debes generar un dataset de **una sola fila** con tres columnas: el total de filas de la tabla `orders` bajo el encabezado `filas_tabla`, la cantidad de filas que cumplen la condición `restaurant_id = 194` **y** tienen `placed_at` dentro de agosto de 2025 en la zona horaria UTC bajo el encabezado `filas_filtro`, y el porcentaje de la segunda sobre la primera, redondeado a **4 decimales**, bajo el encabezado `pct_del_total`.\n\nDebes resolverlo en **una sola pasada** por la tabla, sin una cláusula `WHERE` que recorte las filas, porque necesitas el total y el valor filtrado en la misma fila de resultado.",
    learning_objective:
      "Medir en una sola pasada cuántas filas deja pasar un filtro compuesto, con conteo condicional en lugar de WHERE.",
    theory_ref: l3,
    expected_columns: [
      { name: "filas_tabla", type: "integer" },
      { name: "filas_filtro", type: "integer" },
      { name: "pct_del_total", type: "numeric" },
    ],
    validation_rules: {
      order_matters: false,
      required_concepts: ["aggregate", "conditional_aggregation"],
    },
    reference_solution:
      "SELECT\n  count(*) AS filas_tabla,\n  count(*) FILTER (\n    WHERE restaurant_id = 194\n      AND placed_at >= TIMESTAMPTZ '2025-08-01 00:00:00+00'\n      AND placed_at <  TIMESTAMPTZ '2025-09-01 00:00:00+00'\n  ) AS filas_filtro,\n  round(\n    100.0 * count(*) FILTER (\n      WHERE restaurant_id = 194\n        AND placed_at >= TIMESTAMPTZ '2025-08-01 00:00:00+00'\n        AND placed_at <  TIMESTAMPTZ '2025-09-01 00:00:00+00'\n    ) / count(*), 4\n  ) AS pct_del_total\nFROM orders;",
    alternative_solutions: [
      {
        label: "Con CASE en lugar de FILTER",
        sql: "SELECT\n  count(*) AS filas_tabla,\n  sum(CASE WHEN restaurant_id = 194\n            AND placed_at >= TIMESTAMPTZ '2025-08-01 00:00:00+00'\n            AND placed_at <  TIMESTAMPTZ '2025-09-01 00:00:00+00'\n           THEN 1 ELSE 0 END) AS filas_filtro,\n  round(100.0 * sum(CASE WHEN restaurant_id = 194\n            AND placed_at >= TIMESTAMPTZ '2025-08-01 00:00:00+00'\n            AND placed_at <  TIMESTAMPTZ '2025-09-01 00:00:00+00'\n           THEN 1 ELSE 0 END) / count(*), 4) AS pct_del_total\nFROM orders;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Un `WHERE` no sirve acá: recortaría la tabla y perderías el total. Lo que necesitas es contar todas las filas y, al mismo tiempo, contar solamente las que cumplen la condición.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "`count(*) FILTER (WHERE condición)` cuenta solo las filas que cumplen la condición, sin tocar el resto de la consulta; `count(*)` a su lado sigue contando todo. El mes va como rango semiabierto sobre `placed_at`: `>=` el 1 de agosto y `<` el 1 de septiembre, con literales `TIMESTAMPTZ ... +00`. El porcentaje es el cociente de los dos conteos por `100.0`.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT\n  count(*) AS filas_tabla,\n  count(*) ___ (\n    WHERE restaurant_id = ___\n      AND placed_at ___ TIMESTAMPTZ '2025-08-01 00:00:00+00'\n      AND placed_at ___ TIMESTAMPTZ '____-__-01 00:00:00+00'\n  ) AS filas_filtro,\n  round(100.0 * ___ / ___, 4) AS pct_del_total\nFROM orders;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "missing_filter",
        description_md:
          "Poner la condición en el `WHERE`: la consulta devuelve `filas_tabla = 6` y `pct_del_total = 100`, porque el total pasó a ser el del subconjunto. El número que ingeniería necesita es la proporción sobre la tabla entera.",
      },
      {
        category: "date_boundary",
        description_md:
          "Cerrar agosto con `<= TIMESTAMPTZ '2025-08-31 00:00:00+00'`: se pierden los pedidos del 31 posteriores a la medianoche. El rango semiabierto no tiene ese agujero.",
      },
      {
        category: "cell_values",
        description_md:
          "Redondear a 2 decimales: la proporción es 0,0416 %, así que con 2 decimales queda 0,04 y se pierde la magnitud, que es justamente el argumento del pedido.",
      },
      {
        category: "cell_values",
        description_md:
          "Dividir enteros (`100 * filas_filtro / filas_tabla`): la división entera da 0. El `100.0` fuerza el decimal.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da una sola fila con los valores 14 437, 6 y 0.0416.\n\nSeis filas de 14 437 es el 0,04 % de la tabla. Ese es el caso ideal de un índice: el filtro descarta prácticamente todo, así que recorrer el índice y buscar seis filas en la tabla cuesta muchísimo menos que leer 14 437. Con esa línea, el pedido a ingeniería deja de ser una opinión.\n\nEl detalle técnico que hace falta es por qué el filtro **no** va en el `WHERE`. Un `WHERE` decide qué filas entran a la consulta, así que borraría el denominador: `count(*)` pasaría a valer 6 y el porcentaje, 100. `count(*) FILTER (WHERE ...)` aplica la condición solo a ese conteo y deja el resto intacto, así que las dos medidas salen de una única lectura de la tabla. La versión con `sum(CASE WHEN ... THEN 1 ELSE 0 END)` hace exactamente lo mismo y es la forma portable a motores sin `FILTER`.\n\nPor qué el índice propuesto es `(restaurant_id, placed_at)` y no `(placed_at, restaurant_id)`: en un índice compuesto las columnas de igualdad van primero y la de rango al final. Con `restaurant_id` adelante, el motor salta directo al bloque del restaurante 194 y dentro de ese bloque las fechas ya están ordenadas, así que recorre el mes sin leer nada más. Al revés tendría que recorrer los 1280 pedidos de agosto de toda la plataforma y descartar los que no son de ese restaurante.\n\nEl mismo restaurante tiene 77 pedidos en toda la historia, o sea 0,53 % de la tabla. El índice sigue conviniendo, y esa segunda medición es útil en el pedido: dice cuánto rinde el índice cuando el panel deja de filtrar por mes.",
    reward: defaultReward("intermediate"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "indices-prefijo-izquierdo-en-accion",
    section,
    title: "El trimestre de un restaurante, en el orden que ya trae el índice",
    difficulty: "intermediate",
    estimated_minutes: 9,
    concepts: ["select", "where", "order_by", "date_functions"],
    dataset: pidelo,
    tables_used: ["orders"],
    scenario_md:
      "El departamento de Ingeniería de Datos creó el índice compuesto sobre las columnas `restaurant_id` y `placed_at` de la tabla `orders`, es decir, un índice ordenado primero por restaurante y, dentro de cada restaurante, por el momento del pedido.\n\nAhora el panel de *Sabor Peralta 194*, que es el restaurante con `id` igual a 194 en Ciudad de México, tiene que pedir su trimestre en la forma que ese índice puede servir: igualdad por el restaurante, rango por la fecha y el resultado ya ordenado por fecha. Te piden escribir esa consulta.",
    business_question_md:
      "Debes generar un dataset que devuelva el `id`, el `placed_at`, el `status` y el `total` de los pedidos del restaurante `194` hechos entre el **1 de julio de 2025 inclusive y el 1 de octubre de 2025 exclusive, en la zona horaria UTC**, ordenados por `placed_at` ascendente y, si dos pedidos comparten el mismo instante, debes desempatar usando `id` ascendente.\n\nEscribe el filtro de fecha como un rango semiabierto sobre `placed_at`. La práctica **no acepta** las funciones `date_trunc`, `extract` ni `to_char` aplicadas a esa columna.",
    learning_objective:
      "Escribir un filtro de igualdad más rango que aprovecha el prefijo izquierdo de un índice compuesto y su orden.",
    theory_ref: l3,
    expected_columns: [
      { name: "id", type: "integer" },
      { name: "placed_at", type: "timestamp" },
      { name: "status", type: "text" },
      { name: "total", type: "numeric" },
    ],
    validation_rules: {
      order_matters: true,
      required_concepts: ["where", "order_by"],
      prohibited_patterns: ["date_trunc", "\\bextract\\s*\\(", "to_char"],
    },
    reference_solution:
      "SELECT id, placed_at, status, total\nFROM orders\nWHERE restaurant_id = 194\n  AND placed_at >= TIMESTAMPTZ '2025-07-01 00:00:00+00'\n  AND placed_at <  TIMESTAMPTZ '2025-10-01 00:00:00+00'\nORDER BY placed_at ASC, id ASC;",
    alternative_solutions: [
      {
        label: "Con el rango escrito como una sola condición BETWEEN sobre el borde exclusivo",
        sql: "SELECT id, placed_at, status, total\nFROM orders\nWHERE restaurant_id = 194\n  AND placed_at >= TIMESTAMPTZ '2025-07-01 00:00:00+00'\n  AND NOT placed_at >= TIMESTAMPTZ '2025-10-01 00:00:00+00'\nORDER BY placed_at, id;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Son tres piezas: una igualdad por el restaurante, un rango por la fecha y un orden por esa misma fecha. Ninguna necesita funciones alrededor de las columnas.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "El trimestre va como dos comparaciones sobre `placed_at`: `>=` el 1 de julio y `<` el 1 de octubre, con literales `TIMESTAMPTZ ... +00`. Suma `restaurant_id = 194` y ordena por `placed_at` con `id` como segunda clave.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT id, placed_at, status, total\nFROM orders\nWHERE ___ = 194\n  AND placed_at ___ TIMESTAMPTZ '2025-07-01 00:00:00+00'\n  AND placed_at ___ TIMESTAMPTZ '2025-__-01 00:00:00+00'\nORDER BY ___, ___;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "prohibited_pattern",
        description_md:
          "Filtrar el trimestre con `extract(quarter FROM placed_at) = 3`: devuelve las mismas filas, pero envuelve la columna en una función y el índice queda sin usar. Es justo lo que el ejercicio pide evitar.",
      },
      {
        category: "date_boundary",
        description_md:
          "Cerrar el rango con `<= TIMESTAMPTZ '2025-09-30 00:00:00+00'`: el pedido 2871 del 8 de septiembre entra igual, pero se perderían los pedidos del 30 de septiembre posteriores a la medianoche.",
      },
      {
        category: "wrong_order",
        description_md:
          "Ordenar por `id`: el panel muestra una línea de tiempo, y `id` no es cronológico. El pedido 10 246 es del 6 de julio y el 954 del 13 de julio.",
      },
      {
        category: "missing_filter",
        description_md:
          "Filtrar por el nombre del restaurante uniendo `restaurants`: el resultado es el mismo, pero la unión agrega trabajo que el panel no necesita y aleja la consulta de la forma que el índice sirve.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 19 pedidos, del 2 de julio al 8 de septiembre de 2025. Tres están cancelados (6950, 7637 y 2871) y el resto entregados; el más caro es el 4556, de 2016,50.\n\nLa consulta está escrita en la forma que el índice `(restaurant_id, placed_at)` puede servir completa, y vale entender por qué. El índice está ordenado primero por `restaurant_id`: el motor salta directo al bloque del 194. Dentro de ese bloque las entradas están ordenadas por `placed_at`, así que recorre desde el 1 de julio hasta el 1 de octubre y se detiene. No mira ningún pedido de los otros 399 restaurantes.\n\nEl regalo está en el `ORDER BY`. Como el índice ya entrega las filas de ese restaurante en orden de fecha, el motor no necesita ordenar nada: en un plan de ejecución eso se nota por la **ausencia** de un nodo `Sort`. Ordenar 19 filas no cuesta nada, pero la misma consulta sobre un restaurante con dos millones de pedidos y un `LIMIT 50` es la diferencia entre leer 50 filas y ordenar dos millones para tirar casi todas.\n\nLa **regla del prefijo izquierdo** explica el límite: ese índice sirve si filtras por `restaurant_id`, o por `restaurant_id` y `placed_at`, pero no si filtras solamente por `placed_at`. Para eso hace falta el otro índice, el que ya existe sobre `placed_at` solo.\n\nY el desempate por `id` no es decorativo aunque acá no haya empates: sin una segunda clave, dos pedidos registrados en el mismo instante podrían salir en orden distinto en cada ejecución del panel.",
    improvement_feedback: [
      { condition: "uses_select_star", message_key: "improve.uses_select_star" },
      {
        condition: "uses_between_for_timestamps",
        message_key: "improve.uses_between_for_timestamps",
      },
    ],
    reward: defaultReward("intermediate"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "indices-columnas-que-el-indice-puede-cubrir",
    section,
    title: "Una serie mensual que el índice podría responder solo",
    difficulty: "advanced",
    estimated_minutes: 11,
    concepts: ["group_by", "aggregate", "where", "date_functions", "alias", "order_by"],
    dataset: pidelo,
    tables_used: ["orders"],
    scenario_md:
      "El panel de *Sabor Peralta 194* agrega una tarjeta nueva: cuántos pedidos recibió por mes desde que entró a **Pídelo**. Es la consulta más liviana que se le puede pedir a la tabla `orders`, porque las únicas columnas que necesita son `restaurant_id` y `placed_at`. Te piden escribirla para esa tarjeta.\n\nEse detalle importa. Un índice que contiene **todas** las columnas que la consulta usa se llama **índice cubriente**, y le permite al motor responder sin tocar la tabla: en un plan de ejecución aparece como `Index Only Scan`. Con el índice sobre `restaurant_id` y `placed_at`, esta tarjeta está cubierta.",
    business_question_md:
      "Debes generar un dataset con una fila por cada mes con actividad del restaurante `194`: el `mes`, que es el primer día del mes de `placed_at` calculado **en la zona horaria UTC** y de tipo `date`, y la cantidad de pedidos de ese mes bajo el encabezado `pedidos`. Ordena por `mes` ascendente.\n\nNo filtres por fecha: la tarjeta muestra toda la historia del restaurante.",
    learning_objective:
      "Agrupar una serie mensual sobre un filtro de igualdad, entendiendo qué columnas tendría que contener el índice para cubrirla.",
    theory_ref: l3,
    expected_columns: [
      { name: "mes", type: "date" },
      { name: "pedidos", type: "integer" },
    ],
    validation_rules: {
      order_matters: true,
      required_concepts: ["group_by", "aggregate", "where", "order_by"],
    },
    reference_solution:
      "SELECT date_trunc('month', placed_at AT TIME ZONE 'UTC')::date AS mes,\n       count(*) AS pedidos\nFROM orders\nWHERE restaurant_id = 194\nGROUP BY mes\nORDER BY mes ASC;",
    alternative_solutions: [
      {
        label: "Repitiendo la expresión en el GROUP BY en lugar de usar el alias",
        sql: "SELECT date_trunc('month', placed_at AT TIME ZONE 'UTC')::date AS mes,\n       count(*) AS pedidos\nFROM orders\nWHERE restaurant_id = 194\nGROUP BY date_trunc('month', placed_at AT TIME ZONE 'UTC')::date\nORDER BY 1;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Cada pedido cae en un mes, y el mes se obtiene recortando la marca de tiempo al primer día. Después agrupas por ese valor recortado y cuentas.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "`date_trunc('month', ...)` deja el primer instante del mes; conviértelo a `date` con `::date` para que la columna sea una fecha limpia. Para que el corte no dependa de la zona de quien ejecuta, reduce la marca con `placed_at AT TIME ZONE 'UTC'` antes de truncar. El filtro del restaurante va en el `WHERE`.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT ___('month', placed_at AT TIME ZONE '___')::date AS mes,\n       ___(*) AS pedidos\nFROM orders\nWHERE ___ = 194\nGROUP BY ___\nORDER BY ___;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "wrong_columns",
        description_md:
          "Devolver `mes` como `timestamptz` (sin `::date`): el valor es el correcto, pero la tarjeta espera una fecha y la columna llega con hora y zona.",
      },
      {
        category: "date_boundary",
        description_md:
          "Truncar sin `AT TIME ZONE 'UTC'`: acá la sesión corre en UTC y el resultado coincide, pero en un servidor configurado en otra zona los pedidos del primer o el último día caen en el mes vecino.",
      },
      {
        category: "row_count",
        description_md:
          "Esperar una fila por cada mes del calendario: los meses sin pedidos no existen en `orders` y no aparecen. El restaurante no tiene filas en marzo ni en agosto de 2024, así que el resultado trae 17 meses, no 19.",
      },
      {
        category: "aggregation_level",
        description_md:
          "Agrupar por `placed_at` en lugar de por el mes truncado: devuelve una fila por pedido, cada una con `pedidos = 1`.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 17 filas, de abril de 2024 a septiembre de 2025. El volumen crece: el restaurante hace entre 1 y 6 pedidos por mes durante 2024 y entre 4 y 9 en 2025, con el máximo en abril de 2025. Faltan marzo y agosto de 2024, meses en los que no tuvo ningún pedido, y eso es lo que hay que aclarar al entregar la tarjeta: **son los meses con actividad, no todos los meses**. Si el panel necesita mostrar los ceros, hay que generar el calendario con `generate_series` y unirlo por la izquierda.\n\nEl punto de índices es cuáles columnas toca la consulta. `restaurant_id` para filtrar y `placed_at` para agrupar, nada más: las dos están en el índice compuesto `(restaurant_id, placed_at)`, así que el motor puede resolver la tarjeta entera leyendo el índice y sin abrir la tabla. Eso es un `Index Only Scan`, y es el acceso más barato que existe sobre una tabla grande, porque se salta el paso caro: ir a buscar cada fila a su lugar en el disco.\n\nEse beneficio es frágil. Basta agregar `sum(total) AS ventas` a la tarjeta para perderlo, porque `total` no está en el índice y el motor vuelve a tener que abrir cada fila. PostgreSQL ofrece una salida: `CREATE INDEX ... ON orders (restaurant_id, placed_at) INCLUDE (total)` guarda `total` dentro del índice sin que forme parte de su orden, y la consulta vuelve a estar cubierta. El precio es un índice más grande y más caro de mantener en cada escritura.\n\nUn detalle sobre el filtro: acá `date_trunc` está en el `SELECT` y en el `GROUP BY`, no en el `WHERE`. Envolver la columna en una función solo impide usar el índice cuando ocurre **en el filtro**. Agrupar por un valor calculado es correcto y no tiene ese costo.",
    reward: defaultReward("advanced"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "indices-un-lado-chico-para-el-hash",
    section,
    title: "Ventas de agosto por restaurante en Ciudad de México",
    difficulty: "advanced",
    estimated_minutes: 12,
    concepts: ["inner_join", "group_by", "aggregate", "where", "alias", "order_by"],
    dataset: pidelo,
    tables_used: ["orders", "restaurants", "cities"],
    scenario_md:
      "El departamento de Operaciones de **Pídelo** quiere el cierre de agosto de Ciudad de México: cuánto entregó cada restaurante de la ciudad. Es la consulta del plan de ejecución que viste en la lección, con tres tablas y una agrupación, y te piden escribirla.\n\nEl motor la va a resolver con un **Hash Join**: arma en memoria una tabla de búsqueda con el lado chico, que son los restaurantes, y pasa por encima el lado grande, que son los pedidos ya recortados al mes. Tu parte es escribirla de forma que el lado grande llegue lo más chico posible.",
    business_question_md:
      "Debes generar un dataset que, tomando los pedidos cuyo `status` es igual al texto `'delivered'` y cuya columna `placed_at` cae en **agosto de 2025 en la zona horaria UTC**, de restaurantes cuya ciudad se llama `'Ciudad de México'`, devuelva una fila por restaurante con el `id` del restaurante bajo el encabezado `restaurant_id`, su `name` bajo el encabezado `restaurante`, la cantidad de pedidos entregados bajo el encabezado `pedidos` y la suma de `total`, redondeada a **2 decimales**, bajo el encabezado `ventas`. Ordena por `ventas` descendente y, si dos restaurantes empatan, debes desempatar usando `restaurant_id` ascendente.",
    learning_objective:
      "Recortar el lado grande de un join antes de unir y agrupar, y leer la unión como un Hash Join entre un lado chico y uno grande.",
    theory_ref: l2,
    expected_columns: [
      { name: "restaurant_id", type: "integer" },
      { name: "restaurante", type: "text" },
      { name: "pedidos", type: "integer" },
      { name: "ventas", type: "numeric" },
    ],
    validation_rules: {
      order_matters: true,
      required_concepts: ["inner_join", "group_by", "aggregate", "where"],
    },
    reference_solution:
      "SELECT r.id AS restaurant_id,\n       r.name AS restaurante,\n       count(*) AS pedidos,\n       round(sum(o.total), 2) AS ventas\nFROM orders AS o\nINNER JOIN restaurants AS r ON r.id = o.restaurant_id\nINNER JOIN cities AS c ON c.id = r.city_id\nWHERE c.name = 'Ciudad de México'\n  AND o.status = 'delivered'\n  AND o.placed_at >= TIMESTAMPTZ '2025-08-01 00:00:00+00'\n  AND o.placed_at <  TIMESTAMPTZ '2025-09-01 00:00:00+00'\nGROUP BY r.id, r.name\nORDER BY ventas DESC, restaurant_id ASC;",
    alternative_solutions: [
      {
        label: "Recortando los pedidos del mes en una CTE antes de unir",
        sql: "WITH agosto AS (\n  SELECT restaurant_id, total\n  FROM orders\n  WHERE status = 'delivered'\n    AND placed_at >= TIMESTAMPTZ '2025-08-01 00:00:00+00'\n    AND placed_at <  TIMESTAMPTZ '2025-09-01 00:00:00+00'\n)\nSELECT r.id AS restaurant_id,\n       r.name AS restaurante,\n       count(*) AS pedidos,\n       round(sum(a.total), 2) AS ventas\nFROM agosto AS a\nINNER JOIN restaurants AS r ON r.id = a.restaurant_id\nINNER JOIN cities AS c ON c.id = r.city_id\nWHERE c.name = 'Ciudad de México'\nGROUP BY r.id, r.name\nORDER BY ventas DESC, restaurant_id;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "El camino entre las tablas es `orders` → `restaurants` → `cities`: el pedido conoce su restaurante y el restaurante conoce su ciudad. El nombre de la ciudad filtra, pero la agrupación es por restaurante.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Une `orders` con `restaurants` por `restaurant_id` y `restaurants` con `cities` por `city_id`. Al `WHERE` van tres condiciones: el nombre de la ciudad, el estado del pedido y el mes como rango semiabierto sobre `placed_at`. Agrupa por `r.id` **y** `r.name`, y ordena por el alias `ventas`.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT r.id AS restaurant_id,\n       r.name AS ___,\n       ___(*) AS pedidos,\n       round(___(o.total), 2) AS ventas\nFROM orders AS o\nINNER JOIN restaurants AS r ON ___\nINNER JOIN cities AS c ON ___\nWHERE c.name = '___'\n  AND o.status = '___'\n  AND o.placed_at ___ TIMESTAMPTZ '2025-08-01 00:00:00+00'\n  AND o.placed_at ___ TIMESTAMPTZ '2025-09-01 00:00:00+00'\nGROUP BY ___, ___\nORDER BY ___ DESC, ___;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "aggregation_level",
        description_md:
          "Agrupar solo por `r.name`: funciona en este dataset porque los nombres terminan en el `id` y no se repiten, pero deja de funcionar el día que dos locales comparten nombre. Incluir `r.id` en el `GROUP BY` fija el grano en «un restaurante».",
      },
      {
        category: "join_condition",
        description_md:
          "Unir `cities` con `orders` directamente: `orders` no tiene `city_id`. La ciudad se alcanza a través de `restaurants`.",
      },
      {
        category: "missing_filter",
        description_md:
          "Olvidar `status = 'delivered'`: entran pedidos cancelados, cuyo `total` nunca se cobró, y las ventas de agosto salen infladas.",
      },
      {
        category: "date_boundary",
        description_md:
          "Usar `BETWEEN TIMESTAMPTZ '2025-08-01 00:00:00+00' AND TIMESTAMPTZ '2025-08-31 00:00:00+00'`: `BETWEEN` incluye las dos puntas y deja fuera casi todo el 31 de agosto.",
      },
      {
        category: "performance",
        description_md:
          "Unir las tres tablas completas y filtrar después con `HAVING`: el resultado es el mismo, pero el motor arma la unión de 14 437 pedidos con 400 restaurantes antes de descartar el 91 % de las filas.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 72 restaurantes. Encabeza *El Rincón Medina 221* con 8 pedidos y 8309,34, seguido de *Fuego Medina 28* con 8 pedidos y 7170,69 y *Doña Ortiz 365* con 9 pedidos y 7152,49. Fíjate en ese cruce: el segundo factura más que el tercero con un pedido menos, así que el ticket promedio es lo que los separa. Ordenar por cantidad de pedidos daría otro ranking.\n\nEl plan de esta consulta es el tercero de la lección. `restaurants` tiene 400 filas y es el lado chico, así que el motor arma con él la tabla de búsqueda en memoria (el nodo `Hash`) y pasa por encima los pedidos del mes (`Hash Join`), que llegan filtrados por el índice sobre `placed_at`. Arriba, `HashAggregate` agrupa por restaurante. La versión con CTE expresa ese mismo orden de trabajo de forma explícita y da exactamente el mismo resultado: **recortar antes de unir** es la decisión, y el motor ya la toma solo cuando el filtro está escrito de forma que puede empujarlo.\n\nQué hace que el `Hash Join` sea la estrategia correcta acá: se une por igualdad, ninguno de los dos lados llega ordenado por la clave del join, y el lado chico entra en memoria. Si el filtro dejara pasar dos o tres pedidos en lugar de 1280, convendría un `Nested Loop` que buscara cada restaurante por su clave primaria. Y si las dos entradas llegaran ya ordenadas por la columna del join, un `Merge Join`.\n\nUna restricción del dataset que no se puede ignorar: en Pídelo los precios están en la moneda de cada ciudad, así que `sum(total)` solo tiene sentido dentro de una misma ciudad. Por eso el filtro por `Ciudad de México` no es un recorte arbitrario: es lo que vuelve sumable la columna. Un ranking de ventas mezclando ciudades compararía pesos mexicanos con pesos argentinos.",
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
    slug: "indices-informe-de-selectividad-para-ingenieria",
    section,
    title: "El informe de selectividad que acompaña el ticket",
    difficulty: "expert",
    estimated_minutes: 18,
    concepts: [
      "cte",
      "set_operations",
      "aggregate",
      "conditional_aggregation",
      "case",
      "numeric_functions",
      "order_by",
    ],
    dataset: pidelo,
    tables_used: ["orders"],
    scenario_md:
      "El departamento de Ingeniería de Datos de **Pídelo** abre la revisión trimestral de índices de la tabla `orders` y te pide una sola tabla para arrancar la reunión: los filtros que más corren en producción, cuántas filas deja pasar cada uno y un veredicto preliminar.\n\nLos cinco filtros que quiere medir son: el restaurante 194 en agosto de 2025, el restaurante 194 en toda su historia, agosto de 2025 para todos los restaurantes, la condición `status = 'cancelled'` y la condición `status = 'delivered'`.",
    business_question_md:
      "Debes generar un dataset con **una fila por filtro**, con cinco columnas:\n\n- La columna `filtro`, con el nombre del filtro, que debe ser exactamente uno de estos textos: `restaurante 194 en agosto de 2025`, `restaurante 194, toda la historia`, `agosto de 2025, todos los restaurantes`, `status = cancelled` o `status = delivered`.\n- La columna `filas_que_pasan`, con la cantidad de filas de `orders` que cumplen ese filtro.\n- La columna `filas_tabla`, con el total de filas de `orders`, que es el mismo valor en las cinco filas.\n- La columna `pct_del_total`, con el porcentaje de la segunda columna sobre la tercera, redondeado a **4 decimales**.\n- La columna `veredicto`, que vale `indice muy conveniente` si el porcentaje es menor que 1, `indice probablemente util` si es menor que 10, e `indice poco util` en cualquier otro caso.\n\nLos dos filtros de agosto de 2025 se calculan en la zona horaria **UTC**. Ordena por `pct_del_total` ascendente y, si dos filtros empatan, debes desempatar usando `filtro` ascendente.",
    learning_objective:
      "Construir un informe de selectividad en una sola pasada por la tabla y traducir cada medición a una recomendación de índice.",
    theory_ref: l3,
    expected_columns: [
      { name: "filtro", type: "text" },
      { name: "filas_que_pasan", type: "integer" },
      { name: "filas_tabla", type: "integer" },
      { name: "pct_del_total", type: "numeric" },
      { name: "veredicto", type: "text" },
    ],
    validation_rules: {
      order_matters: true,
      required_concepts: ["cte", "aggregate", "conditional_aggregation", "case"],
    },
    reference_solution:
      "WITH base AS (\n  SELECT\n    count(*) AS filas_tabla,\n    count(*) FILTER (\n      WHERE restaurant_id = 194\n        AND placed_at >= TIMESTAMPTZ '2025-08-01 00:00:00+00'\n        AND placed_at <  TIMESTAMPTZ '2025-09-01 00:00:00+00'\n    ) AS restaurante_mes,\n    count(*) FILTER (WHERE restaurant_id = 194) AS restaurante_historia,\n    count(*) FILTER (\n      WHERE placed_at >= TIMESTAMPTZ '2025-08-01 00:00:00+00'\n        AND placed_at <  TIMESTAMPTZ '2025-09-01 00:00:00+00'\n    ) AS mes_completo,\n    count(*) FILTER (WHERE status = 'cancelled') AS cancelados,\n    count(*) FILTER (WHERE status = 'delivered') AS entregados\n  FROM orders\n),\nmedidos AS (\n  SELECT 'restaurante 194 en agosto de 2025' AS filtro, restaurante_mes AS filas_que_pasan, filas_tabla FROM base\n  UNION ALL\n  SELECT 'restaurante 194, toda la historia', restaurante_historia, filas_tabla FROM base\n  UNION ALL\n  SELECT 'agosto de 2025, todos los restaurantes', mes_completo, filas_tabla FROM base\n  UNION ALL\n  SELECT 'status = cancelled', cancelados, filas_tabla FROM base\n  UNION ALL\n  SELECT 'status = delivered', entregados, filas_tabla FROM base\n)\nSELECT\n  filtro,\n  filas_que_pasan,\n  filas_tabla,\n  round(100.0 * filas_que_pasan / filas_tabla, 4) AS pct_del_total,\n  CASE\n    WHEN 100.0 * filas_que_pasan / filas_tabla < 1  THEN 'indice muy conveniente'\n    WHEN 100.0 * filas_que_pasan / filas_tabla < 10 THEN 'indice probablemente util'\n    ELSE 'indice poco util'\n  END AS veredicto\nFROM medidos\nORDER BY pct_del_total ASC, filtro ASC;",
    alternative_solutions: [
      {
        label: "Con el porcentaje calculado una sola vez en una CTE intermedia",
        sql: "WITH base AS (\n  SELECT\n    count(*) AS filas_tabla,\n    count(*) FILTER (\n      WHERE restaurant_id = 194\n        AND placed_at >= TIMESTAMPTZ '2025-08-01 00:00:00+00'\n        AND placed_at <  TIMESTAMPTZ '2025-09-01 00:00:00+00'\n    ) AS restaurante_mes,\n    count(*) FILTER (WHERE restaurant_id = 194) AS restaurante_historia,\n    count(*) FILTER (\n      WHERE placed_at >= TIMESTAMPTZ '2025-08-01 00:00:00+00'\n        AND placed_at <  TIMESTAMPTZ '2025-09-01 00:00:00+00'\n    ) AS mes_completo,\n    count(*) FILTER (WHERE status = 'cancelled') AS cancelados,\n    count(*) FILTER (WHERE status = 'delivered') AS entregados\n  FROM orders\n),\nmedidos AS (\n  SELECT 'restaurante 194 en agosto de 2025' AS filtro, restaurante_mes AS filas_que_pasan, filas_tabla FROM base\n  UNION ALL SELECT 'restaurante 194, toda la historia', restaurante_historia, filas_tabla FROM base\n  UNION ALL SELECT 'agosto de 2025, todos los restaurantes', mes_completo, filas_tabla FROM base\n  UNION ALL SELECT 'status = cancelled', cancelados, filas_tabla FROM base\n  UNION ALL SELECT 'status = delivered', entregados, filas_tabla FROM base\n),\nconpct AS (\n  SELECT filtro, filas_que_pasan, filas_tabla,\n         round(100.0 * filas_que_pasan / filas_tabla, 4) AS pct_del_total\n  FROM medidos\n)\nSELECT filtro, filas_que_pasan, filas_tabla, pct_del_total,\n       CASE\n         WHEN pct_del_total < 1  THEN 'indice muy conveniente'\n         WHEN pct_del_total < 10 THEN 'indice probablemente util'\n         ELSE 'indice poco util'\n       END AS veredicto\nFROM conpct\nORDER BY pct_del_total, filtro;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "El informe tiene cinco filas, pero la tabla se lee una sola vez. Primero mides los seis números que necesitas en una fila única; después los desarmas en cinco filas, una por filtro; al final calculas el porcentaje y el veredicto.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Arma una CTE con `count(*)` y cinco `count(*) FILTER (WHERE ...)`, uno por filtro. Sobre ella, una segunda CTE que apile cinco `SELECT` con `UNION ALL`, cada uno con su texto literal como `filtro` y su conteo como `filas_que_pasan`. En el `SELECT` final, el porcentaje con `round(100.0 * ... / ..., 4)` y el veredicto con un `CASE` de tres ramas, evaluadas de la más chica a la más grande.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nWITH base AS (\n  SELECT count(*) AS filas_tabla,\n         count(*) ___ (WHERE ___) AS restaurante_mes,\n         ___ AS restaurante_historia,\n         ___ AS mes_completo,\n         ___ AS cancelados,\n         ___ AS entregados\n  FROM orders\n),\nmedidos AS (\n  SELECT '___' AS filtro, restaurante_mes AS filas_que_pasan, filas_tabla FROM base\n  ___ ___\n  SELECT ...\n)\nSELECT filtro, filas_que_pasan, filas_tabla,\n       round(___, 4) AS pct_del_total,\n       ___\n         WHEN ___ THEN '___'\n         WHEN ___ THEN '___'\n         ELSE '___'\n       END AS veredicto\nFROM medidos\nORDER BY ___, ___;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "duplicates",
        description_md:
          "Usar `UNION` en lugar de `UNION ALL`: si dos filtros dejan pasar la misma cantidad de filas y comparten `filas_tabla`, las filas no son idénticas porque el texto de `filtro` difiere, así que acá no se pierde ninguna. El hábito igual conviene: `UNION` ordena y deduplica sin que lo necesites.",
      },
      {
        category: "aggregation_level",
        description_md:
          "Medir cada filtro con su propia consulta y su propio `WHERE`: cinco lecturas de la tabla en lugar de una, y `filas_tabla` deja de ser el total si el `WHERE` recorta.",
      },
      {
        category: "cell_values",
        description_md:
          "Escribir el `CASE` de mayor a menor (`WHEN pct < 10` antes de `WHEN pct < 1`): el restaurante 194 en agosto, con 0,0416 %, saldría clasificado como `indice probablemente util`, porque gana la primera rama verdadera.",
      },
      {
        category: "cell_values",
        description_md:
          "Redondear a 2 decimales: los dos filtros más selectivos quedan en 0,04 y 0,53, y el primero pierde el orden de magnitud que justifica el índice.",
      },
      {
        category: "wrong_order",
        description_md:
          "Ordenar por `filas_que_pasan` en lugar de por `pct_del_total`: acá coinciden porque `filas_tabla` es la misma en las cinco filas, pero el informe se lee por selectividad y el mismo criterio tiene que servir cuando se agreguen filtros sobre otras tablas.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da cinco filas sobre un total de 14 437 pedidos, ordenadas de la más selectiva a la menos selectiva:\n\n| filtro | filas que pasan | % del total | veredicto |\n| --- | --- | --- | --- |\n| restaurante 194 en agosto de 2025 | 6 | 0,0416 | indice muy conveniente |\n| restaurante 194, toda la historia | 77 | 0,5334 | indice muy conveniente |\n| status = cancelled | 1153 | 7,9864 | indice probablemente util |\n| agosto de 2025, todos los restaurantes | 1280 | 8,8661 | indice poco util o probablemente util, según el umbral |\n| status = delivered | 13 284 | 92,0136 | indice poco util |\n\nCon el umbral de la consigna, agosto completo cae en `indice probablemente util` (8,87 % es menor que 10).\n\nEsta tabla es el pedido de índice, en una pantalla. Dice tres cosas que un ticket que pide «un índice para `orders`» no dice: que el filtro por restaurante y mes descarta el 99,96 % de la tabla y por lo tanto justifica el índice compuesto; que el filtro por estado depende del valor, inútil para `delivered` y discutible para `cancelled`; y que un rango de un mes, que suena muy selectivo en lenguaje humano, deja pasar casi el 9 % de las filas.\n\nLos umbrales de 1 % y 10 % son una convención de trabajo, no una ley. Con qué proporción de filas conviene un índice depende de cuántas filas hay por bloque de disco, de si el índice cubre la consulta y de si las filas que coinciden están juntas o dispersas en la tabla. La forma de la tabla es lo reutilizable; los cortes se ajustan con el ingeniero.\n\nDos decisiones técnicas sostienen el resultado. La primera: los cinco conteos salen de **una sola lectura** de `orders`, con `count(*) FILTER (WHERE ...)`. Medir cada filtro por separado costaría cinco recorridos, y es justo el tipo de desperdicio que la sección anterior enseñó a ver. La segunda: el `CASE` va de la condición más chica a la más grande, porque el motor se detiene en la primera rama verdadera. Invertirlo clasifica mal las dos filas que más importan.\n\nY una lectura que el informe sugiere pero no prueba: 1153 cancelados y 1153 pedidos con `courier_id` NULL es el mismo conjunto. Si la consulta que hay que acelerar busca pedidos sin repartidor, un índice parcial (`CREATE INDEX ... WHERE courier_id IS NULL`) indexa solo esas 1153 filas y es mucho más chico que uno sobre la columna entera.",
    reward: defaultReward("expert"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
];
