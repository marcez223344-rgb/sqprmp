import {
  defaultHintMeta,
  defaultReward,
  defaultSolutionUnlock,
  type ExerciseDef,
} from "../schemas/exercise";

const section = "funciones-de-agregacion";
const dataset = { slug: "pidelo", version: 1 };
const theory_ref = "agregacion-count-sum-avg";

export const exercises: ExerciseDef[] = [
  {
    slug: "cuantas-calificaciones",
    section,
    title: "¿Cuántas calificaciones tenemos?",
    difficulty: "easy",
    estimated_minutes: 5,
    concepts: ["aggregate", "null_handling", "alias"],
    dataset,
    tables_used: ["ratings"],
    scenario_md:
      "En **Pídelo**, después de cada entrega el cliente puede calificar al restaurante y al repartidor por separado, y muchos clientes califican solo a uno de los dos. El departamento de Producto quiere dimensionar cuántas calificaciones útiles hay y te pide esos números para decidir si el sistema de calificaciones necesita cambios.",
    business_question_md:
      "Debes generar un dataset de una sola fila que devuelva el total de filas de la tabla `ratings` bajo el encabezado `calificaciones`, cuántas de ellas tienen valor en `restaurant_rating` bajo el encabezado `con_restaurante`, cuántas tienen valor en `courier_rating` bajo el encabezado `con_repartidor`, y los promedios de cada puntaje redondeados a 2 decimales bajo los encabezados `promedio_restaurante` y `promedio_repartidor`.",
    learning_objective: "Distinguir count(*) de count(columna) y ver cómo avg ignora los NULL.",
    theory_ref,
    expected_columns: [
      { name: "calificaciones", type: "integer" },
      { name: "con_restaurante", type: "integer" },
      { name: "con_repartidor", type: "integer" },
      { name: "promedio_restaurante", type: "numeric" },
      { name: "promedio_repartidor", type: "numeric" },
    ],
    validation_rules: { required_concepts: ["aggregate"] },
    reference_solution:
      "SELECT\n  count(*) AS calificaciones,\n  count(restaurant_rating) AS con_restaurante,\n  count(courier_rating) AS con_repartidor,\n  round(avg(restaurant_rating), 2) AS promedio_restaurante,\n  round(avg(courier_rating), 2) AS promedio_repartidor\nFROM ratings;",
    hints: [
      {
        level: 1,
        body_md:
          "La función `count(*)` cuenta todas las filas, mientras que `count(columna)` cuenta solo aquellas en las que esa columna tiene un valor distinto de `NULL`.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Necesitas cinco agregaciones dentro de un mismo `SELECT`, cada una con su alias. La expresión `round(avg(x), 2)` redondea el promedio a dos decimales.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT\n  count(*) AS calificaciones,\n  count(___) AS con_restaurante,\n  count(___) AS con_repartidor,\n  round(avg(___), 2) AS promedio_restaurante,\n  round(avg(___), 2) AS promedio_repartidor\nFROM ratings;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "null_handling",
        description_md:
          "Usar `count(*)` en las tres cuentas: los valores `NULL` se cuentan igual y las tres cifras salen idénticas, lo que oculta justamente la diferencia que se quería medir.",
      },
      {
        category: "cell_values",
        description_md:
          "Promediar con `COALESCE(restaurant_rating, 0)`: los promedios bajan de forma artificial, porque quien no calificó se convierte en alguien que puso cero.",
      },
      {
        category: "cell_values",
        description_md:
          "Olvidar la función `round(..., 2)`: los promedios salen con todos los decimales que calcula el motor.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 7353 calificaciones, de las cuales 6576 tienen puntaje de restaurante y 5864 tienen puntaje de repartidor, con promedios de 4.23 y 4.14 respectivamente. La diferencia entre las tres cuentas es exactamente la cantidad de valores `NULL` de cada columna.\n\nLa función `avg` ignora los valores `NULL`, y por eso el promedio del repartidor se calcula sobre 5864 valores y no sobre 7353. Ese es el comportamiento correcto: quien no calificó no opinó, y contarlo como un cero sería inventar una opinión.",
    reward: defaultReward("easy"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "alcance-de-pedidos-entregados",
    section,
    title: "Alcance de los pedidos entregados",
    difficulty: "easy",
    estimated_minutes: 5,
    concepts: ["aggregate", "distinct", "where"],
    dataset,
    tables_used: ["orders"],
    scenario_md:
      "La dirección de **Pídelo** quiere tres números para la presentación mensual: cuántos pedidos se entregaron, a cuántos clientes distintos y desde cuántos restaurantes distintos. Te piden esas tres cifras para abrir la reunión con una foto del alcance del servicio.",
    business_question_md:
      "Debes generar un dataset de una sola fila que, tomando únicamente los pedidos cuyo `status` es igual al texto `'delivered'`, devuelva la cantidad de pedidos bajo el encabezado `pedidos`, la cantidad de clientes distintos bajo el encabezado `clientes` y la cantidad de restaurantes distintos bajo el encabezado `restaurantes`.",
    learning_objective: "Usar count(DISTINCT columna) junto a un filtro previo a la agregación.",
    theory_ref,
    expected_columns: [
      { name: "pedidos", type: "integer" },
      { name: "clientes", type: "integer" },
      { name: "restaurantes", type: "integer" },
    ],
    validation_rules: { required_concepts: ["aggregate", "where"] },
    reference_solution:
      "SELECT\n  count(*) AS pedidos,\n  count(DISTINCT customer_id) AS clientes,\n  count(DISTINCT restaurant_id) AS restaurantes\nFROM orders\nWHERE status = 'delivered';",
    hints: [
      {
        level: 1,
        body_md:
          "La idea de «distintos» dentro de una agregación se escribe como `count(DISTINCT columna)`.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "El filtro por estado va en la cláusula `WHERE`, porque debe aplicarse antes de agregar. Después necesitas tres cuentas, cada una con su alias.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT\n  count(*) AS pedidos,\n  count(DISTINCT ___) AS clientes,\n  count(DISTINCT ___) AS restaurantes\nFROM orders\nWHERE status = '___';\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "cell_values",
        description_md:
          "Escribir `count(customer_id)` sin la palabra clave `DISTINCT`: la consulta cuenta pedidos y no clientes, porque un mismo cliente aparece en muchas filas.",
      },
      {
        category: "missing_filter",
        description_md:
          "Olvidar la condición `status = 'delivered'`: entran también los pedidos cancelados y los tres números dejan de describir las entregas.",
      },
      {
        category: "syntax",
        description_md:
          "Escribir `count(DISTINCT customer_id, restaurant_id)`: la función `count` acepta una sola expresión y PostgreSQL devuelve un error.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 13 284 pedidos entregados a 4567 clientes distintos desde los 400 restaurantes de la plataforma. Fíjate en la relación entre las cifras: cada cliente con entregas promedió casi tres pedidos.\n\nLa función `count(DISTINCT ...)` es más costosa que `count(*)` porque el motor tiene que deduplicar los valores antes de contarlos; en tablas grandes esa diferencia se nota en el tiempo de ejecución.",
    reward: defaultReward("easy"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "promesa-vs-realidad",
    section,
    title: "Promesa vs. realidad",
    difficulty: "intermediate",
    estimated_minutes: 8,
    concepts: ["aggregate", "date_functions", "numeric_functions"],
    dataset,
    tables_used: ["orders"],
    scenario_md:
      "Cada pedido de **Pídelo** promete un tiempo de entrega, guardado en la columna `promised_minutes`. El departamento de Operaciones quiere saber si en promedio esa promesa se cumple, comparándola con el tiempo real transcurrido entre `placed_at` y `delivered_at`. Te piden esa comparación para decidir si hay que ajustar la promesa que ve el cliente.",
    business_question_md:
      "Debes generar un dataset de una sola fila que, tomando únicamente los pedidos cuyo `status` es igual al texto `'delivered'`, devuelva la cantidad de pedidos bajo el encabezado `entregados`, el promedio de `promised_minutes` redondeado a 1 decimal bajo el encabezado `promesa_promedio` y el promedio de minutos transcurridos entre `placed_at` y `delivered_at`, también redondeado a 1 decimal, bajo el encabezado `real_promedio`.",
    learning_objective: "Agregar sobre una duración calculada a partir de dos timestamps.",
    theory_ref,
    expected_columns: [
      { name: "entregados", type: "integer" },
      { name: "promesa_promedio", type: "numeric" },
      { name: "real_promedio", type: "numeric" },
    ],
    validation_rules: { required_concepts: ["aggregate"], numeric_tolerance: 0.05 },
    reference_solution:
      "SELECT\n  count(*) AS entregados,\n  round(avg(promised_minutes), 1) AS promesa_promedio,\n  round(avg(extract(epoch FROM (delivered_at - placed_at)) / 60), 1) AS real_promedio\nFROM orders\nWHERE status = 'delivered';",
    alternative_solutions: [
      {
        label: "Dividir antes de promediar",
        sql: "SELECT count(*) AS entregados, round(avg(promised_minutes), 1) AS promesa_promedio, round(avg(extract(epoch FROM delivered_at - placed_at) / 60.0), 1) AS real_promedio FROM orders WHERE status = 'delivered';",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "La resta `delivered_at - placed_at` devuelve un intervalo, es decir, una duración. La expresión `extract(epoch FROM intervalo)` convierte esa duración a segundos.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Divide los segundos por 60 para obtener minutos, promedia el resultado y redondéalo con `round(..., 1)`. Recuerda filtrar con la condición `status = 'delivered'`.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT\n  count(*) AS entregados,\n  round(avg(promised_minutes), 1) AS promesa_promedio,\n  round(avg(extract(epoch FROM (delivered_at - ___)) / ___), 1) AS real_promedio\nFROM orders\nWHERE status = 'delivered';\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "cell_values",
        description_md:
          "Olvidar la división por 60: el promedio queda expresado en segundos y la comparación con la promesa, que está en minutos, deja de tener sentido.",
      },
      {
        category: "cell_values",
        description_md:
          "Redondear a 2 decimales, o no redondear: los valores dejan de coincidir con lo pedido, que es 1 decimal.",
      },
      {
        category: "missing_filter",
        description_md:
          "No filtrar por pedidos entregados: la columna `delivered_at` está en `NULL` en los pedidos cancelados, así que `avg` los ignora pero `count(*)` los cuenta, y los tres números dejan de referirse al mismo conjunto de filas.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 13 284 pedidos entregados, con una promesa promedio de 43.4 minutos y un tiempo real promedio de 40.5 minutos, aunque alrededor del 22 % de las entregas superan su propia promesa individual. El promedio esconde esa cola de casos tardíos: en la sección 24 vas a aprender a contar cuántos llegaron tarde con agregación condicional.\n\nSin el filtro, la función `count(*)` contaría también los pedidos cancelados mientras que `avg` sobre la duración real no los tendría en cuenta, y los tres números dejarían de describir la misma población.",
    reward: defaultReward("intermediate"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "frecuencia-primer-semestre",
    section,
    title: "Frecuencia de compra del primer semestre",
    difficulty: "intermediate",
    estimated_minutes: 7,
    concepts: ["aggregate", "distinct", "where", "date_functions"],
    dataset,
    tables_used: ["orders"],
    scenario_md:
      "El departamento de Marketing mide la frecuencia de compra, que define como la cantidad de pedidos por cliente activo dentro de un período. Piden el primer semestre de 2025, es decir, de enero a junio inclusive, y necesitan tu consulta para comparar ese indicador con el del semestre anterior.",
    business_question_md:
      "Debes generar un dataset de una sola fila que, tomando los pedidos cuya columna `placed_at` está entre el `'2025-01-01'` y el `'2025-06-30'` inclusive, contando el día 30 completo, devuelva la cantidad de pedidos bajo el encabezado `pedidos`, la cantidad de clientes distintos bajo el encabezado `clientes` y la división de pedidos entre clientes, redondeada a 2 decimales, bajo el encabezado `pedidos_por_cliente`.",
    learning_objective: "Combinar dos agregados en una expresión y evitar la división entera.",
    theory_ref,
    expected_columns: [
      { name: "pedidos", type: "integer" },
      { name: "clientes", type: "integer" },
      { name: "pedidos_por_cliente", type: "numeric" },
    ],
    validation_rules: { required_concepts: ["aggregate", "where"] },
    reference_solution:
      "SELECT\n  count(*) AS pedidos,\n  count(DISTINCT customer_id) AS clientes,\n  round(count(*)::numeric / count(DISTINCT customer_id), 2) AS pedidos_por_cliente\nFROM orders\nWHERE placed_at >= '2025-01-01'\n  AND placed_at < '2025-07-01';",
    alternative_solutions: [
      {
        label: "Multiplicar por 1.0",
        sql: "SELECT count(*) AS pedidos, count(DISTINCT customer_id) AS clientes, round(count(*) * 1.0 / count(DISTINCT customer_id), 2) AS pedidos_por_cliente FROM orders WHERE placed_at >= '2025-01-01' AND placed_at < '2025-07-01';",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Las dos funciones `count` devuelven números enteros, así que dividirlas directamente descarta los decimales y el resultado queda truncado.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Convierte uno de los dos conteos con `::numeric` antes de dividir. El rango de fechas conviene escribirlo semiabierto, es decir, con `< '2025-07-01'` como límite superior.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT\n  count(*) AS pedidos,\n  count(DISTINCT customer_id) AS clientes,\n  round(count(*)::___ / count(DISTINCT customer_id), 2) AS pedidos_por_cliente\nFROM orders\nWHERE placed_at >= '2025-01-01'\n  AND placed_at < '___';\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "cell_values",
        description_md:
          "Escribir `count(*) / count(DISTINCT customer_id)` sin conversión de tipo: la división entre enteros devuelve 2 en lugar de 2.89.",
      },
      {
        category: "date_boundary",
        description_md:
          "Escribir `placed_at <= '2025-06-30'`: la condición deja afuera casi todo el 30 de junio, porque el literal equivale a las 00:00 de ese día.",
      },
      {
        category: "cell_values",
        description_md:
          "Usar `count(customer_id)` como cantidad de clientes: sin la palabra clave `DISTINCT` eso cuenta pedidos, no personas.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 6111 pedidos de 2115 clientes, es decir, 2.89 pedidos por cliente. La división entera habría devuelto 2, un error silencioso de alrededor del 30 % que ninguna herramienta te avisa.\n\nEl rango semiabierto, con `< '2025-07-01'` como límite superior, incluye todo el 30 de junio con cualquier hora; es la forma robusta que viste en la sección 6.",
    reward: defaultReward("intermediate"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
];
