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
      "En **Pídelo**, tras cada entrega el cliente puede calificar al restaurante y al repartidor por separado; muchos califican solo a uno. Producto quiere dimensionar cuántas calificaciones útiles hay.",
    business_question_md:
      "Devuelve, en una sola fila: el total de filas de `ratings` como `calificaciones`, cuántas tienen `restaurant_rating` como `con_restaurante`, cuántas tienen `courier_rating` como `con_repartidor`, y los promedios de cada puntaje redondeados a 2 decimales como `promedio_restaurante` y `promedio_repartidor`.",
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
        body_md: "`count(*)` cuenta filas; `count(columna)` cuenta solo las que no son NULL.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Cinco agregaciones en un mismo `SELECT`, cada una con su alias. `round(avg(x), 2)` redondea el promedio.",
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
          "Usar `count(*)` en las tres cuentas: los NULL se cuentan y las cifras coinciden.",
      },
      {
        category: "cell_values",
        description_md:
          "Promediar con `COALESCE(restaurant_rating, 0)`: los promedios bajan artificialmente.",
      },
      {
        category: "cell_values",
        description_md: "Olvidar `round(..., 2)`.",
      },
    ],
    expert_explanation_md:
      "7353 calificaciones, 6576 con puntaje de restaurante y 5864 con puntaje de repartidor; promedios 4.23 y 4.14. Las diferencias entre las tres cuentas son exactamente los NULL de cada columna.\n\n`avg` ignora los NULL, por eso el promedio del repartidor se calcula sobre 5864 valores, no sobre 7353. Es el comportamiento correcto: quien no calificó no opinó.",
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
      "Dirección quiere tres números para la presentación mensual: cuántos pedidos se entregaron, a cuántos clientes distintos y desde cuántos restaurantes distintos.",
    business_question_md:
      "Para los pedidos con `status` igual a `'delivered'`, devuelve en una fila `pedidos` (cantidad), `clientes` (clientes distintos) y `restaurantes` (restaurantes distintos).",
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
        body_md: "«Distintos» dentro de una agregación se escribe `count(DISTINCT columna)`.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md: "El filtro por estado va en `WHERE`, antes de agregar. Tres cuentas con alias.",
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
        description_md: "`count(customer_id)` sin `DISTINCT`: cuenta pedidos, no clientes.",
      },
      {
        category: "missing_filter",
        description_md: "Olvidar `status = 'delivered'` e incluir cancelados.",
      },
      {
        category: "syntax",
        description_md:
          "`count(DISTINCT customer_id, restaurant_id)`: `count` acepta una sola expresión.",
      },
    ],
    expert_explanation_md:
      "13 284 pedidos entregados a 4567 clientes distintos desde los 400 restaurantes. Fíjate en la relación: cada cliente entregado promedió casi 3 pedidos.\n\n`count(DISTINCT ...)` es más costoso que `count(*)` porque debe deduplicar; en tablas grandes se nota.",
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
      "Cada pedido promete un tiempo de entrega (`promised_minutes`). Operaciones quiere saber si en promedio se cumple, comparándolo con el tiempo real entre `placed_at` y `delivered_at`.",
    business_question_md:
      "Para los pedidos entregados (`status = 'delivered'`), devuelve `entregados` (cantidad), `promesa_promedio` (promedio de `promised_minutes`, 1 decimal) y `real_promedio` (promedio de minutos entre `placed_at` y `delivered_at`, 1 decimal).",
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
          "`delivered_at - placed_at` es un intervalo. `extract(epoch FROM intervalo)` lo convierte a segundos.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Divide los segundos por 60 y promedia; luego `round(..., 1)`. Filtra `status = 'delivered'`.",
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
        description_md: "Olvidar dividir por 60: el promedio queda en segundos.",
      },
      {
        category: "cell_values",
        description_md: "Redondear a 2 decimales o no redondear.",
      },
      {
        category: "missing_filter",
        description_md:
          "No filtrar entregados: `delivered_at` es NULL en los cancelados y `avg` los ignora, pero `count(*)` los incluye.",
      },
    ],
    expert_explanation_md:
      "13 284 entregados; la promesa promedio es 43.4 minutos y el tiempo real 40.5, aunque ~22 % de las entregas superan su promesa individual. El promedio esconde esa cola: en la sección 24 aprenderás a contar «cuántos llegaron tarde» con agregación condicional.\n\nSin el filtro, `count(*)` contaría también cancelados mientras `avg(real)` no: los tres números dejarían de referirse al mismo conjunto.",
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
      "Marketing mide la frecuencia de compra: pedidos por cliente activo en un período. Piden el primer semestre de 2025 (enero a junio inclusive).",
    business_question_md:
      "Para los pedidos con `placed_at` entre el 2025-01-01 y el 2025-06-30 inclusive, devuelve `pedidos` (cantidad), `clientes` (clientes distintos) y `pedidos_por_cliente` (pedidos dividido clientes, redondeado a 2 decimales).",
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
        body_md: "Los dos `count` son enteros: dividirlos directamente descarta los decimales.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Convierte uno de ellos con `::numeric` antes de dividir. El rango de fechas es semiabierto: `< '2025-07-01'`.",
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
          "`count(*) / count(DISTINCT customer_id)` sin conversión: devuelve 2 en lugar de 2.89.",
      },
      {
        category: "date_boundary",
        description_md: "`placed_at <= '2025-06-30'` deja afuera casi todo el 30 de junio.",
      },
      {
        category: "cell_values",
        description_md: "Usar `count(customer_id)` como número de clientes.",
      },
    ],
    expert_explanation_md:
      "6111 pedidos de 2115 clientes: 2.89 pedidos por cliente. La división entera habría dado 2, un error silencioso del 30 %.\n\nEl rango semiabierto (`< '2025-07-01'`) incluye todo el 30 de junio con cualquier hora; es la forma robusta que viste en la sección 6.",
    reward: defaultReward("intermediate"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
];
