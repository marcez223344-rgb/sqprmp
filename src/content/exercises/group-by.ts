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
      "El departamento de Operaciones de **Pídelo** está armando un panel de seguimiento y quiere empezar por el número más básico de todos: cuántos pedidos hay en cada estado. Te piden ese conteo para saber sobre qué volumen se está trabajando.",
    business_question_md:
      "Debes generar un dataset que devuelva el `status` y la cantidad de pedidos bajo el encabezado `pedidos`, con una fila por cada estado, ordenadas de mayor a menor cantidad de pedidos.",
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
          "La cláusula `GROUP BY status` crea un grupo por cada valor distinto de estado, y la función `count(*)` cuenta las filas que hay dentro de cada grupo.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "El alias que le pongas al conteo puede usarse en la cláusula `ORDER BY`. Recuerda agregar `DESC` para que el orden sea de mayor a menor.",
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
        description_md:
          "Olvidar la cláusula `GROUP BY`: PostgreSQL devuelve el error «must appear in the GROUP BY clause», porque no sabe cómo combinar una columna suelta con una agregación.",
      },
      {
        category: "wrong_order",
        description_md:
          "Ordenar por `status`, o no ordenar en absoluto: el reporte deja de mostrar primero los estados más frecuentes, que es lo que pidió el negocio.",
      },
      {
        category: "wrong_columns",
        description_md:
          "No ponerle el alias `pedidos` a la columna del conteo: el encabezado no coincide con el pedido.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da dos filas: 13 284 pedidos entregados y 1153 pedidos cancelados, es decir, un 8 % de cancelación. En la foto que toma este dataset no hay pedidos en curso.\n\nEsta es la consulta de control más útil antes de cualquier análisis: te dice qué estados existen realmente en los datos y cuánto pesa cada uno.",
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
      "El departamento de Finanzas está negociando comisiones con los procesadores de pago y quiere saber cuánto se usa cada método, tomando solamente los pedidos que llegaron a entregarse. Te piden ese resumen para llegar a la negociación con números propios.",
    business_question_md:
      "Debes generar un dataset que, tomando únicamente los pedidos cuyo `status` es igual al texto `'delivered'`, devuelva el `payment_method`, la cantidad de pedidos bajo el encabezado `pedidos` y la cantidad de clientes distintos bajo el encabezado `clientes`, ordenado por `pedidos` descendente.",
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
        body_md:
          "El filtro por estado va en la cláusula `WHERE`, porque debe aplicarse antes de armar los grupos.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Dentro de cada grupo, la expresión `count(DISTINCT customer_id)` cuenta cuántos clientes únicos usaron ese método de pago.",
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
        description_md:
          "No escribir la cláusula `WHERE`: los pedidos cancelados inflan los conteos y la negociación se apoya en números equivocados.",
      },
      {
        category: "cell_values",
        description_md:
          "Escribir `count(customer_id)` sin la palabra clave `DISTINCT`: la columna `clientes` repite exactamente el número de pedidos.",
      },
      {
        category: "wrong_order",
        description_md:
          "Ordenar por la columna `clientes`, o en forma ascendente: el reporte deja de mostrar primero el método más usado.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da tres filas, una por cada método de pago: tarjeta, billetera y efectivo. La suma de la columna `clientes` de las tres filas supera la cantidad total de clientes distintos, porque una misma persona puede pagar con varios métodos: los valores de `count(DISTINCT ...)` calculados por grupo no se pueden sumar entre sí.\n\nNo calculamos el promedio de `total_amount` por método a propósito: mezclaría las monedas de las ocho ciudades y el número no significaría nada.",
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
      "El departamento de Producto quiere ver la distribución de estrellas que reciben los restaurantes, sin contar las calificaciones en las que ese puntaje no fue cargado. Te piden esa distribución para decidir si conviene cambiar la escala de calificación.",
    business_question_md:
      "Debes generar un dataset que devuelva el `restaurant_rating` y la cantidad de calificaciones con ese puntaje bajo el encabezado `cantidad`, tomando únicamente las filas en las que la columna `restaurant_rating` no está en `NULL`, ordenado por `restaurant_rating` ascendente.",
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
        body_md:
          "Sin ningún filtro, la cláusula `GROUP BY` crearía un sexto grupo que junta todas las filas con `NULL`.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Escribe la condición `WHERE restaurant_rating IS NOT NULL` antes del `GROUP BY`, y ordena el resultado por el puntaje.",
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
        description_md:
          "Omitir el filtro: aparece una fila adicional con `NULL` como puntaje y 777 calificaciones, que no corresponde a ninguna estrella.",
      },
      {
        category: "null_handling",
        description_md:
          "Escribir `restaurant_rating <> NULL`: esa comparación nunca puede dar verdadero y la consulta devuelve 0 filas.",
      },
      {
        category: "wrong_order",
        description_md:
          "Ordenar por la columna `cantidad`: la distribución deja de leerse de 1 a 5 estrellas, que es la forma natural de mirarla.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da cinco filas, de 1 a 5 estrellas, con una distribución cargada hacia el 4 y el 5, que es lo típico de las plataformas donde calificar es opcional. Las 3 calificaciones de una estrella merecen una lectura caso por caso más que un tratamiento estadístico.\n\nUsar `count(*)` aquí es correcto porque ya filtraste los valores `NULL` antes de agrupar; escribir `count(restaurant_rating)` daría exactamente lo mismo.",
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
    scenario_md:
      "La dirección de **Pídelo** sigue la evolución mensual de pedidos y de clientes activos durante 2025. Te piden esa serie mensual para presentarla en el comité y decidir el presupuesto del próximo trimestre.",
    business_question_md:
      "Debes generar un dataset que, tomando los pedidos cuya columna `placed_at` es posterior o igual al `'2025-01-01'`, devuelva el mes bajo el encabezado `mes`, expresado como la fecha del primer día del mes y de tipo `date`, la cantidad de pedidos bajo el encabezado `pedidos` y la cantidad de clientes distintos bajo el encabezado `clientes`, ordenado por `mes` ascendente.",
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
          "La función `date_trunc('month', placed_at)` lleva cada pedido al primer instante de su mes, y la conversión `::date` deja ese valor como una fecha sin hora.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "En PostgreSQL puedes agrupar directamente por el alias, escribiendo `GROUP BY mes`. Recuerda filtrar desde el 1 de enero de 2025.",
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
          "Devolver la columna `mes` como marca de tiempo, sin la conversión `::date`: las celdas no coinciden con el tipo de dato que pide la consigna.",
      },
      {
        category: "aggregation_level",
        description_md:
          "Escribir `GROUP BY placed_at`: se arma un grupo por cada instante distinto y el resultado tiene miles de filas en lugar de una por mes.",
      },
      {
        category: "missing_filter",
        description_md:
          "Olvidar el filtro de fecha: el resultado incluye también los meses de 2024 y la serie deja de ser la del año pedido.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da nueve filas, de enero a septiembre de 2025, con crecimiento sostenido hasta agosto y un septiembre parcial, porque el dataset termina el día 15. Un analista señalaría ese mes incompleto antes de que alguien interprete una caída al mirar el gráfico.\n\nLa función `date_trunc` aplicada sobre una columna de tipo `timestamptz` usa la zona horaria de la sesión, que aquí es UTC; en producción conviene fijar explícitamente la zona horaria del negocio antes de agrupar por día.",
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
    scenario_md:
      "El departamento Comercial quiere premiar a los restaurantes con más pedidos entregados y te pide el ranking para definir a quién invitar al programa de reconocimiento.",
    business_question_md:
      "Debes generar un dataset que devuelva el `restaurant_id` y la cantidad de pedidos cuyo `status` es igual al texto `'delivered'` bajo el encabezado `entregados`, para los **10** restaurantes con más entregas, ordenado por `entregados` descendente y, si dos restaurantes empatan, debes desempatar usando `restaurant_id` ascendente.",
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
        body_md:
          "La receta tiene cuatro pasos: agrupa por restaurante, cuenta las filas de cada grupo, ordena de mayor a menor y corta el resultado con la cláusula `LIMIT`.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Agrega `restaurant_id` como segundo criterio de ordenamiento para que los empates se resuelvan siempre de la misma manera.",
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
        description_md:
          "Omitir el desempate por `restaurant_id`: cuando hay empate en el borde del ranking, el décimo lugar puede cambiar de una ejecución a otra.",
      },
      {
        category: "missing_filter",
        description_md:
          "Contar también los pedidos cancelados: el ranking deja de medir entregas y premia a quien más pedidos perdió.",
      },
      {
        category: "row_count",
        description_md:
          "Olvidar la cláusula `LIMIT 10`: el resultado trae los 400 restaurantes en lugar de los diez primeros.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta muestra que los diez primeros restaurantes tienen entre 65 y 72 entregas. Como hay empates justo en el borde del top 10, el segundo criterio de ordenamiento es el que decide quién entra: sin él, dos ejecuciones podrían devolver listas distintas y nadie sabría explicar por qué.\n\nEn la sección 26 vas a armar este mismo ranking con la función `rank()`, para que los restaurantes empatados compartan posición en lugar de competir por un lugar.",
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
      "El departamento de Marketing sospecha que algunas promociones pensadas para un solo uso se están reutilizando. Un primer indicio es simple: si una promoción tiene más usos que clientes distintos, entonces alguien la usó más de una vez. Te piden ese cruce para confirmar o descartar la sospecha.",
    business_question_md:
      "Debes generar un dataset que, tomando los pedidos cuya columna `promotion_id` no está en `NULL`, devuelva el `promotion_id`, la cantidad de pedidos bajo el encabezado `usos`, la cantidad de clientes distintos bajo el encabezado `clientes` y la resta entre ambos valores bajo el encabezado `reusos`, ordenado por `reusos` descendente y, si dos promociones empatan, debes desempatar usando `promotion_id` ascendente.",
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
          "Necesitas dos agregados por grupo y una resta entre ellos. Los alias no se pueden usar dentro de la misma lista de `SELECT`, así que tienes que repetir las dos expresiones completas en la resta.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Filtra los valores `NULL` en la cláusula `WHERE` para no obtener un grupo que junte todos los pedidos sin promoción. Después ordena por la diferencia.",
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
          "Escribir la resta como `usos - clientes` usando los alias: los alias todavía no existen dentro del mismo `SELECT` y PostgreSQL devuelve un error de columna inexistente.",
      },
      {
        category: "null_handling",
        description_md:
          "Omitir el filtro: aparece una fila con `promotion_id` en `NULL` que agrupa todos los pedidos sin promoción y muestra miles de supuestos reusos.",
      },
      {
        category: "wrong_order",
        description_md:
          "Ordenar solo por `reusos` sin agregar un desempate: el orden entre promociones con la misma diferencia no está garantizado.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da seis promociones. Las de mayor uso, `ENVIOGRATIS` y `FINDE`, no tienen tope por cliente, así que sus reusos son legítimos; en cambio, las que sí tienen tope, como `BIENVENIDA` con un solo uso permitido, muestran reusos que son abuso real. Distinguir un caso del otro exige unir con la tabla `promotions`, que vas a ver en la sección 17, y comparar contra la columna `max_uses_per_customer`.\n\nEl patrón `count(*) - count(DISTINCT x)` es una herramienta de auditoría rápida que sirve en cualquier tabla de eventos donde esperes un registro por persona.",
    reward: defaultReward("intermediate"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
];
