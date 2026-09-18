import {
  defaultHintMeta,
  defaultReward,
  defaultSolutionUnlock,
  type ExerciseDef,
} from "../schemas/exercise";

const section = "group-by";
const dataset = { slug: "pidelo", version: 1 };
const basico = "group-by-basico";
const reportes = "group-by-reportes";

export const exercises: ExerciseDef[] = [
  {
    slug: "pedidos-por-estado",
    section,
    title: "Pedidos por estado",
    difficulty: "easy",
    estimated_minutes: 4,
    concepts: ["group_by", "aggregate", "order_by"],
    dataset,
    tables_used: ["orders"],
    scenario_md:
      "El panel de Operaciones de **Pídelo** empieza con el número más básico: cuántos pedidos hay en cada estado.",
    business_question_md:
      "Devuelve `status` y la cantidad de pedidos como `pedidos`, una fila por estado, ordenadas de mayor a menor `pedidos`.",
    learning_objective: "Agrupar por una columna y contar por grupo.",
    theory_ref: basico,
    expected_columns: [
      { name: "status", type: "text" },
      { name: "pedidos", type: "integer" },
    ],
    validation_rules: { order_matters: true, required_concepts: ["group_by", "aggregate"] },
    reference_solution:
      "SELECT status, count(*) AS pedidos\nFROM orders\nGROUP BY status\nORDER BY pedidos DESC;",
    hints: [
      {
        level: 1,
        body_md:
          "`GROUP BY status` crea un grupo por cada estado; `count(*)` cuenta dentro de cada grupo.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md: "El alias del conteo puede usarse en `ORDER BY`. Recuerda `DESC`.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT status, count(*) AS pedidos\nFROM orders\nGROUP BY ___\nORDER BY ___ DESC;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "syntax",
        description_md: "Olvidar `GROUP BY`: error «must appear in the GROUP BY clause».",
      },
      {
        category: "wrong_order",
        description_md: "Ordenar por `status` o no ordenar.",
      },
      {
        category: "wrong_columns",
        description_md: "No poner el alias `pedidos`.",
      },
    ],
    expert_explanation_md:
      "Dos filas: 13 284 entregados y 1153 cancelados (8 % de cancelación). No hay pedidos en curso en la foto del dataset.\n\nEs la consulta de control más útil antes de cualquier análisis: te dice qué estados existen y cuánto pesa cada uno.",
    reward: defaultReward("easy"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "metodos-de-pago-entregados",
    section,
    title: "Métodos de pago de los entregados",
    difficulty: "easy",
    estimated_minutes: 5,
    concepts: ["group_by", "aggregate", "where", "distinct"],
    dataset,
    tables_used: ["orders"],
    scenario_md:
      "Finanzas negocia comisiones con los procesadores de pago y quiere saber cuánto se usa cada método, solo en pedidos entregados.",
    business_question_md:
      "Para los pedidos con `status = 'delivered'`, devuelve `payment_method`, la cantidad de pedidos como `pedidos` y los clientes distintos como `clientes`, ordenado por `pedidos` descendente.",
    learning_objective: "Combinar WHERE, GROUP BY y count(DISTINCT) por grupo.",
    theory_ref: basico,
    expected_columns: [
      { name: "payment_method", type: "text" },
      { name: "pedidos", type: "integer" },
      { name: "clientes", type: "integer" },
    ],
    validation_rules: {
      order_matters: true,
      required_concepts: ["group_by", "aggregate", "where"],
    },
    reference_solution:
      "SELECT payment_method, count(*) AS pedidos, count(DISTINCT customer_id) AS clientes\nFROM orders\nWHERE status = 'delivered'\nGROUP BY payment_method\nORDER BY pedidos DESC;",
    hints: [
      {
        level: 1,
        body_md: "El filtro por estado va en `WHERE`, antes de agrupar.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Dentro de cada grupo, `count(DISTINCT customer_id)` cuenta clientes únicos de ese método.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT payment_method, count(*) AS pedidos, count(DISTINCT ___) AS clientes\nFROM orders\nWHERE status = '___'\nGROUP BY ___\nORDER BY pedidos DESC;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "missing_filter",
        description_md: "Sin `WHERE`, los cancelados inflan los conteos.",
      },
      {
        category: "cell_values",
        description_md: "`count(customer_id)` sin `DISTINCT` repite el número de pedidos.",
      },
      {
        category: "wrong_order",
        description_md: "Ordenar por `clientes` o ascendente.",
      },
    ],
    expert_explanation_md:
      "Tres filas: tarjeta, billetera y efectivo. La suma de `clientes` de las tres filas supera los clientes distintos totales porque una misma persona puede pagar con varios métodos: los `count(DISTINCT)` por grupo no son aditivos.\n\nNo calculamos `avg(total)` por método: mezclaría las monedas de las ocho ciudades.",
    reward: defaultReward("easy"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "distribucion-de-calificaciones",
    section,
    title: "Distribución de calificaciones",
    difficulty: "easy",
    estimated_minutes: 5,
    concepts: ["group_by", "aggregate", "where", "null_handling"],
    dataset,
    tables_used: ["ratings"],
    scenario_md:
      "Producto quiere ver la distribución de estrellas que reciben los restaurantes, sin contar las calificaciones donde ese puntaje falta.",
    business_question_md:
      "Devuelve `restaurant_rating` y la cantidad de calificaciones con ese puntaje como `cantidad`, solo para filas donde `restaurant_rating` no es NULL, ordenado por `restaurant_rating` ascendente.",
    learning_objective: "Excluir el grupo NULL antes de agrupar y ordenar por la clave del grupo.",
    theory_ref: basico,
    expected_columns: [
      { name: "restaurant_rating", type: "integer" },
      { name: "cantidad", type: "integer" },
    ],
    validation_rules: { order_matters: true, required_concepts: ["group_by", "null_handling"] },
    reference_solution:
      "SELECT restaurant_rating, count(*) AS cantidad\nFROM ratings\nWHERE restaurant_rating IS NOT NULL\nGROUP BY restaurant_rating\nORDER BY restaurant_rating;",
    hints: [
      {
        level: 1,
        body_md: "Sin filtro, `GROUP BY` crearía un sexto grupo para los NULL.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "`WHERE restaurant_rating IS NOT NULL` antes del `GROUP BY`; ordena por el puntaje.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT restaurant_rating, count(*) AS cantidad\nFROM ratings\nWHERE restaurant_rating ___ ___ ___\nGROUP BY restaurant_rating\nORDER BY restaurant_rating;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "null_handling",
        description_md: "Omitir el filtro: aparece una fila NULL con 777 calificaciones.",
      },
      {
        category: "null_handling",
        description_md: "`restaurant_rating <> NULL`: nunca es verdadero, devuelve 0 filas.",
      },
      {
        category: "wrong_order",
        description_md: "Ordenar por `cantidad`.",
      },
    ],
    expert_explanation_md:
      "Cinco filas, de 1 a 5 estrellas, con una distribución cargada hacia 4 y 5 (típica de plataformas donde calificar es opcional). Las 3 calificaciones de una estrella merecen lectura individual más que estadística.\n\nUsar `count(*)` aquí es correcto porque ya filtraste los NULL; `count(restaurant_rating)` daría lo mismo.",
    reward: defaultReward("easy"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "pedidos-por-mes-2025",
    section,
    title: "Pedidos por mes en 2025",
    difficulty: "intermediate",
    estimated_minutes: 7,
    concepts: ["group_by", "aggregate", "date_functions", "where"],
    dataset,
    tables_used: ["orders"],
    scenario_md: "Dirección sigue la evolución mensual de pedidos y clientes activos durante 2025.",
    business_question_md:
      "Para los pedidos con `placed_at` desde el 2025-01-01, devuelve el mes como `mes` (fecha del primer día del mes, tipo `date`), la cantidad de pedidos como `pedidos` y los clientes distintos como `clientes`, ordenado por `mes` ascendente.",
    learning_objective:
      "Agrupar por una expresión de fecha (date_trunc) para construir una serie mensual.",
    theory_ref: reportes,
    expected_columns: [
      { name: "mes", type: "date" },
      { name: "pedidos", type: "integer" },
      { name: "clientes", type: "integer" },
    ],
    validation_rules: { order_matters: true, required_concepts: ["group_by", "date_functions"] },
    reference_solution:
      "SELECT\n  date_trunc('month', placed_at)::date AS mes,\n  count(*) AS pedidos,\n  count(DISTINCT customer_id) AS clientes\nFROM orders\nWHERE placed_at >= '2025-01-01'\nGROUP BY mes\nORDER BY mes;",
    alternative_solutions: [
      {
        label: "Agrupar por la expresión",
        sql: "SELECT date_trunc('month', placed_at)::date AS mes, count(*) AS pedidos, count(DISTINCT customer_id) AS clientes FROM orders WHERE placed_at >= '2025-01-01' GROUP BY date_trunc('month', placed_at) ORDER BY 1;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "`date_trunc('month', placed_at)` lleva cada pedido al primer instante de su mes; `::date` lo deja como fecha.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "En PostgreSQL puedes agrupar por el alias: `GROUP BY mes`. Filtra desde el 1 de enero de 2025.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT\n  date_trunc('___', placed_at)::date AS mes,\n  count(*) AS pedidos,\n  count(DISTINCT customer_id) AS clientes\nFROM orders\nWHERE placed_at >= '2025-01-01'\nGROUP BY mes\nORDER BY mes;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "cell_values",
        description_md:
          "Devolver `mes` como timestamp (sin `::date`): las celdas no coinciden con el tipo pedido.",
      },
      {
        category: "aggregation_level",
        description_md: "`GROUP BY placed_at`: un grupo por instante, miles de filas.",
      },
      {
        category: "missing_filter",
        description_md: "Olvidar el filtro y devolver también 2024.",
      },
    ],
    expert_explanation_md:
      "Nueve filas, de enero a septiembre de 2025, con crecimiento sostenido hasta agosto y un septiembre parcial (el dataset termina el 15). Un analista señalaría el mes incompleto antes de que alguien lea «caída» en el gráfico.\n\n`date_trunc` sobre `timestamptz` usa la zona horaria de la sesión (UTC aquí); en producción, fija la zona del negocio antes de agrupar por día.",
    reward: defaultReward("intermediate"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "top-10-restaurantes",
    section,
    title: "Top 10 restaurantes",
    difficulty: "intermediate",
    estimated_minutes: 6,
    concepts: ["group_by", "aggregate", "where", "order_by", "limit"],
    dataset,
    tables_used: ["orders"],
    scenario_md: "Comercial premia a los restaurantes con más pedidos entregados.",
    business_question_md:
      "Devuelve `restaurant_id` y la cantidad de pedidos entregados (`status = 'delivered'`) como `entregados` para los **10** restaurantes con más entregas, ordenado por `entregados` descendente y, en caso de empate, por `restaurant_id` ascendente.",
    learning_objective: "Rankear grupos con ORDER BY + LIMIT y desempate determinista.",
    theory_ref: reportes,
    expected_columns: [
      { name: "restaurant_id", type: "integer" },
      { name: "entregados", type: "integer" },
    ],
    validation_rules: { order_matters: true, required_concepts: ["group_by", "limit"] },
    reference_solution:
      "SELECT restaurant_id, count(*) AS entregados\nFROM orders\nWHERE status = 'delivered'\nGROUP BY restaurant_id\nORDER BY entregados DESC, restaurant_id\nLIMIT 10;",
    hints: [
      {
        level: 1,
        body_md: "Agrupa por restaurante, cuenta, ordena de mayor a menor y corta con `LIMIT`.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Agrega `restaurant_id` como segundo criterio de orden para que los empates sean reproducibles.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT restaurant_id, count(*) AS entregados\nFROM orders\nWHERE status = '___'\nGROUP BY restaurant_id\nORDER BY entregados DESC, ___\nLIMIT ___;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "wrong_order",
        description_md: "Sin el desempate por `restaurant_id`, el décimo lugar puede variar.",
      },
      {
        category: "missing_filter",
        description_md: "Contar también cancelados.",
      },
      {
        category: "row_count",
        description_md: "Olvidar `LIMIT 10`.",
      },
    ],
    expert_explanation_md:
      "Los diez primeros tienen entre 65 y 72 entregas. Con empates en el borde del top 10, el segundo criterio decide quién entra: sin él, dos ejecuciones podrían dar listas distintas y nadie sabría por qué.\n\nEn la sección 26 harás este mismo ranking con `rank()` para que los empates compartan posición.",
    reward: defaultReward("intermediate"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "desafio-abuso-de-promociones",
    section,
    title: "Desafío: uso de promociones",
    difficulty: "intermediate",
    estimated_minutes: 8,
    concepts: ["group_by", "aggregate", "distinct", "where", "null_handling"],
    dataset,
    tables_used: ["orders"],
    scenario_md:
      "Marketing sospecha que algunas promociones de un solo uso se están reutilizando. Un primer indicio: si una promoción tiene más usos que clientes distintos, alguien la usó más de una vez.",
    business_question_md:
      "Para los pedidos con `promotion_id` no NULL, devuelve `promotion_id`, la cantidad de pedidos como `usos`, los clientes distintos como `clientes` y la diferencia `usos - clientes` como `reusos`, ordenado por `reusos` descendente y luego por `promotion_id`.",
    learning_objective:
      "Comparar count(*) con count(DISTINCT) por grupo para detectar repeticiones.",
    theory_ref: reportes,
    expected_columns: [
      { name: "promotion_id", type: "integer" },
      { name: "usos", type: "integer" },
      { name: "clientes", type: "integer" },
      { name: "reusos", type: "integer" },
    ],
    validation_rules: { order_matters: true, required_concepts: ["group_by", "aggregate"] },
    reference_solution:
      "SELECT\n  promotion_id,\n  count(*) AS usos,\n  count(DISTINCT customer_id) AS clientes,\n  count(*) - count(DISTINCT customer_id) AS reusos\nFROM orders\nWHERE promotion_id IS NOT NULL\nGROUP BY promotion_id\nORDER BY reusos DESC, promotion_id;",
    hints: [
      {
        level: 1,
        body_md:
          "Dos agregados por grupo y una resta entre ellos; los alias no se pueden usar en la resta, repite las expresiones.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Filtra los NULL en `WHERE` para no obtener un grupo «sin promoción». Ordena por la diferencia.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT\n  promotion_id,\n  count(*) AS usos,\n  count(DISTINCT customer_id) AS clientes,\n  count(*) - count(DISTINCT ___) AS reusos\nFROM orders\nWHERE promotion_id ___ ___ ___\nGROUP BY promotion_id\nORDER BY reusos DESC, promotion_id;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "syntax",
        description_md:
          "`usos - clientes` usando los alias: los alias no existen dentro del mismo `SELECT`.",
      },
      {
        category: "null_handling",
        description_md:
          "Sin el filtro aparece una fila con `promotion_id` NULL y miles de «reusos».",
      },
      {
        category: "wrong_order",
        description_md: "Ordenar solo por `reusos` sin desempate.",
      },
    ],
    expert_explanation_md:
      "Seis promociones. Las de más uso (ENVIOGRATIS, FINDE) no tienen tope por cliente, así que sus reusos son legítimos; las que sí tienen tope (BIENVENIDA = 1 uso) muestran reusos que son abuso real. Distinguirlo exige unir con `promotions` (sección 17) y comparar contra `max_uses_per_customer`.\n\nEl patrón `count(*) - count(DISTINCT x)` es una herramienta de auditoría rápida en cualquier tabla de eventos.",
    reward: defaultReward("intermediate"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
];
