import {
  defaultHintMeta,
  defaultReward,
  defaultSolutionUnlock,
  type ExerciseDef,
} from "../schemas/exercise";

const section = "lag-y-lead";
const dataset = { slug: "ritmo", version: 1 };
const basico = "lag-y-lead-basico";
const variaciones = "variaciones-entre-periodos";
const brechas = "brechas-y-valores-de-referencia";

export const exercises: ExerciseDef[] = [
  {
    slug: "reproducciones-contra-el-mes-anterior",
    section,
    title: "Reproducciones contra el mes anterior",
    difficulty: "intermediate",
    estimated_minutes: 8,
    concepts: ["window_function", "lag_lead", "cte", "group_by", "aggregate", "date_functions"],
    dataset,
    tables_used: ["plays"],
    scenario_md:
      "En **Ritmo**, el departamento de Analítica arma el resumen mensual de escucha. Antes de hablar de porcentajes, el equipo quiere la tabla más simple posible: cuántas reproducciones hubo cada mes, cuántas hubo el mes anterior y la diferencia entre las dos cifras. Te piden esa serie para abrir el informe.",
    business_question_md:
      "Debes generar un dataset, a partir de la tabla `plays`, con una fila por mes: el `mes`, que es el primer día del mes de `played_at` calculado en la zona horaria UTC y con tipo `date`, la cantidad de reproducciones del mes bajo el encabezado `reproducciones`, la cantidad del mes inmediatamente anterior de la serie bajo el encabezado `reproducciones_mes_anterior` y la resta entre las dos bajo el encabezado `variacion`. Ordena por `mes` ascendente. El primer mes no tiene mes anterior, así que esas dos columnas deben quedar en `NULL`.",
    learning_objective:
      "Traer el valor del período anterior con lag() sobre una serie ya agregada y calcular la diferencia.",
    theory_ref: basico,
    expected_columns: [
      { name: "mes", type: "date" },
      { name: "reproducciones", type: "integer" },
      { name: "reproducciones_mes_anterior", type: "integer" },
      { name: "variacion", type: "integer" },
    ],
    validation_rules: { order_matters: true, required_concepts: ["lag_lead"] },
    reference_solution:
      "WITH mensual AS (\n  SELECT\n    date_trunc('month', played_at AT TIME ZONE 'UTC')::date AS mes,\n    count(*) AS reproducciones\n  FROM plays\n  GROUP BY 1\n)\nSELECT\n  mes,\n  reproducciones,\n  lag(reproducciones) OVER (ORDER BY mes) AS reproducciones_mes_anterior,\n  reproducciones - lag(reproducciones) OVER (ORDER BY mes) AS variacion\nFROM mensual\nORDER BY mes;",
    alternative_solutions: [
      {
        label: "Segunda CTE para no repetir el lag",
        sql: "WITH mensual AS (SELECT date_trunc('month', played_at AT TIME ZONE 'UTC')::date AS mes, count(*) AS reproducciones FROM plays GROUP BY 1), con_anterior AS (SELECT mes, reproducciones, lag(reproducciones) OVER (ORDER BY mes) AS anterior FROM mensual) SELECT mes, reproducciones, anterior AS reproducciones_mes_anterior, reproducciones - anterior AS variacion FROM con_anterior ORDER BY mes;",
      },
      {
        label: "Subconsulta en lugar de CTE",
        sql: "SELECT mes, reproducciones, lag(reproducciones) OVER (ORDER BY mes) AS reproducciones_mes_anterior, reproducciones - lag(reproducciones) OVER (ORDER BY mes) AS variacion FROM (SELECT date_trunc('month', played_at AT TIME ZONE 'UTC')::date AS mes, count(*) AS reproducciones FROM plays GROUP BY 1) AS mensual ORDER BY mes;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Son dos pasos. Primero armas una fila por mes con su cantidad de reproducciones; después, sobre esa serie, traes el valor del mes anterior con una función de ventana que mira hacia atrás.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "El mes sale de la expresión `date_trunc('month', played_at AT TIME ZONE 'UTC')::date`. La función que trae la fila anterior es `lag(...)` y necesita un `ORDER BY mes` dentro de la cláusula `OVER`. La variación es una resta entre la columna y ese `lag`.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nWITH mensual AS (\n  SELECT\n    date_trunc('___', played_at AT TIME ZONE 'UTC')::date AS mes,\n    count(*) AS reproducciones\n  FROM plays\n  GROUP BY 1\n)\nSELECT\n  mes,\n  reproducciones,\n  ___(reproducciones) OVER (___ ___ mes) AS reproducciones_mes_anterior,\n  reproducciones ___ ___ AS variacion\nFROM mensual\nORDER BY mes;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "required_concept_missing",
        description_md:
          "Resolverlo con un `INNER JOIN` de la serie contra sí misma, uniendo por `mes = otro.mes + interval '1 month'`: funciona, pero pierde el primer mes si el cruce no es externo y además no practica la herramienta de esta sección.",
      },
      {
        category: "cell_values",
        description_md:
          "Escribir `lag(reproducciones) OVER ()` sin `ORDER BY`: sin un orden definido, el valor «anterior» no es reproducible entre ejecuciones.",
      },
      {
        category: "date_boundary",
        description_md:
          "Truncar la fecha sin escribir `AT TIME ZONE 'UTC'`: el mes de cada reproducción pasa a depender de la zona horaria de la sesión. Acá la sesión corre en UTC y los totales coinciden, pero el mismo reporte ejecutado en un servidor con otra zona mueve de mes las reproducciones de la medianoche.",
      },
      {
        category: "null_handling",
        description_md:
          "Usar `lag(reproducciones, 1, 0)` para «evitar el NULL»: enero de 2024 muestra una variación de +120 contra un mes que no existe.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 21 filas, desde `2024-01-01` hasta `2025-09-01`. La primera trae `NULL` en las dos columnas nuevas, como corresponde, porque no hay mes anterior.\n\nLa serie crece casi siempre; las excepciones son enero de 2025, con −341 contra un diciembre muy alto, y febrero, con −21. La última fila, septiembre de 2025, muestra −5 546: no es una caída del negocio, es que el dataset corta el 15 de septiembre. En un informe real ese mes se excluye o se marca como incompleto.\n\nLa expresión `lag(reproducciones) OVER (ORDER BY mes)` se evalúa después del `GROUP BY`, y por eso la expresión de tabla común es necesaria: la ventana opera sobre la serie ya agregada y no sobre las 109 382 filas de la tabla `plays`.\n\nRepetir la expresión `lag(...)` dos veces es aceptable acá, pero cuando la fórmula crece, por ejemplo con una variación porcentual o tres columnas derivadas, conviene una segunda expresión de tabla común que la calcule una sola vez.",
    reward: defaultReward("intermediate"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "variacion-porcentual-de-altas",
    section,
    title: "Variación porcentual de altas",
    difficulty: "intermediate",
    estimated_minutes: 10,
    concepts: [
      "window_function",
      "lag_lead",
      "cte",
      "group_by",
      "aggregate",
      "numeric_functions",
      "null_handling",
    ],
    dataset,
    tables_used: ["users"],
    scenario_md:
      "El departamento de Crecimiento presenta el ritmo de altas al comité. Pidieron explícitamente el porcentaje, porque el número absoluto no dice nada si no se sabe contra qué base se compara. También pidieron que la consulta no falle nunca, aunque algún mes quede en cero. Te piden esa serie con esas dos condiciones.",
    business_question_md:
      "Debes generar un dataset, a partir de la tabla `users`, con una fila por mes de alta: el `mes`, que es el primer día del mes de `signup_at` calculado en la zona horaria UTC y con tipo `date`, la cantidad de oyentes registrados ese mes bajo el encabezado `altas`, las altas del mes anterior de la serie bajo el encabezado `altas_mes_anterior` y la variación porcentual contra el mes anterior, redondeada a 1 decimal, bajo el encabezado `variacion_pct`, de modo que un crecimiento del 10,6 % se devuelva como `10.6`. Si no hay mes anterior, o si su valor es `0`, la columna `variacion_pct` debe quedar en `NULL`. Ordena por `mes` ascendente.",
    learning_objective:
      "Calcular una variación porcentual segura combinando lag(), división numérica y nullif() para evitar la división por cero.",
    theory_ref: variaciones,
    expected_columns: [
      { name: "mes", type: "date" },
      { name: "altas", type: "integer" },
      { name: "altas_mes_anterior", type: "integer" },
      { name: "variacion_pct", type: "numeric" },
    ],
    validation_rules: {
      order_matters: true,
      numeric_tolerance: 0.001,
      required_concepts: ["lag_lead"],
    },
    reference_solution:
      "WITH altas_por_mes AS (\n  SELECT\n    date_trunc('month', signup_at AT TIME ZONE 'UTC')::date AS mes,\n    count(*) AS altas\n  FROM users\n  GROUP BY 1\n),\ncon_anterior AS (\n  SELECT\n    mes,\n    altas,\n    lag(altas) OVER (ORDER BY mes) AS altas_mes_anterior\n  FROM altas_por_mes\n)\nSELECT\n  mes,\n  altas,\n  altas_mes_anterior,\n  round(100.0 * (altas - altas_mes_anterior) / nullif(altas_mes_anterior, 0), 1) AS variacion_pct\nFROM con_anterior\nORDER BY mes;",
    alternative_solutions: [
      {
        label: "Repitiendo el lag en la fórmula",
        sql: "WITH altas_por_mes AS (SELECT date_trunc('month', signup_at AT TIME ZONE 'UTC')::date AS mes, count(*) AS altas FROM users GROUP BY 1) SELECT mes, altas, lag(altas) OVER (ORDER BY mes) AS altas_mes_anterior, round(100.0 * (altas - lag(altas) OVER (ORDER BY mes)) / nullif(lag(altas) OVER (ORDER BY mes), 0), 1) AS variacion_pct FROM altas_por_mes ORDER BY mes;",
      },
      {
        label: "Razón menos uno",
        sql: "WITH altas_por_mes AS (SELECT date_trunc('month', signup_at AT TIME ZONE 'UTC')::date AS mes, count(*) AS altas FROM users GROUP BY 1), con_anterior AS (SELECT mes, altas, lag(altas) OVER (ORDER BY mes) AS altas_mes_anterior FROM altas_por_mes) SELECT mes, altas, altas_mes_anterior, round(100.0 * (altas::numeric / nullif(altas_mes_anterior, 0) - 1), 1) AS variacion_pct FROM con_anterior ORDER BY mes;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "La fórmula es el valor actual menos el anterior, dividido por el anterior y multiplicado por 100. El valor anterior lo trae una función de ventana; el resto es aritmética, con dos cuidados: el tipo de la división y el divisor en cero.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Multiplica por `100.0`, con punto decimal, para que la división no sea entera, y envuelve el divisor en `nullif(..., 0)` para que un mes en cero devuelva `NULL` en lugar de hacer fallar la consulta. Una segunda expresión de tabla común con la columna `altas_mes_anterior` ya calculada evita repetir el `lag` tres veces.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nWITH altas_por_mes AS (\n  SELECT\n    date_trunc('month', signup_at AT TIME ZONE '___')::date AS mes,\n    count(*) AS altas\n  FROM users\n  GROUP BY 1\n),\ncon_anterior AS (\n  SELECT mes, altas, ___(altas) OVER (___ ___ mes) AS altas_mes_anterior\n  FROM altas_por_mes\n)\nSELECT\n  mes,\n  altas,\n  altas_mes_anterior,\n  round(___ * (altas - altas_mes_anterior) / ___(altas_mes_anterior, 0), 1) AS variacion_pct\nFROM con_anterior\nORDER BY mes;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "cell_values",
        description_md:
          "Escribir `100 * (altas - anterior) / anterior` con valores enteros: la división entera trunca el resultado y casi todos los meses quedan en 0.",
      },
      {
        category: "null_handling",
        description_md:
          "Omitir la función `nullif(anterior, 0)`: mientras el dataset no tenga meses en cero la consulta corre, pero es una bomba de tiempo en producción.",
      },
      {
        category: "cell_values",
        description_md:
          "Calcular `altas / anterior` y presentarlo como porcentaje: eso es una razón, por ejemplo 1.106, y no una variación, que sería 10.6.",
      },
      {
        category: "date_boundary",
        description_md:
          "Truncar la columna `signup_at` sin escribir `AT TIME ZONE 'UTC'`: el corte queda atado a la zona horaria de la sesión. Acá esa zona es UTC y el resultado coincide; en un servidor con otra zona, las altas de los últimos minutos de cada mes se mueven de mes.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 21 filas. Febrero de 2024 crece un 10,6 % y marzo un 89,4 %, pasando de 94 a 178 altas: con bases tan chicas el porcentaje exagera todo, y por eso los tableros suelen ocultar la variación cuando la base no llega a un mínimo.\n\nDe 2025 en adelante la serie se estabiliza entre −5,9 % y +12,5 %, que es el rango en el que el porcentaje empieza a ser informativo. Septiembre marca −54,0 % porque el dataset corta el día 15; es el mismo período incompleto de siempre y no una caída real.\n\nDos decisiones técnicas cargan todo el peso. El factor `100.0` convierte la división en un valor de tipo `numeric`: con `100` la división entre enteros trunca y verías ceros. La función `nullif(altas_mes_anterior, 0)` transforma el divisor cero en `NULL`, y un `NULL` propagado da `NULL`: la consulta devuelve «no calculable» en lugar de abortar.\n\nLa forma `round(100.0 * (altas::numeric / nullif(anterior, 0) - 1), 1)` da exactamente lo mismo; elige la que tu equipo lea más rápido.",
    reward: defaultReward("intermediate"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "variacion-mensual-por-pais",
    section,
    title: "Variación mensual por país",
    difficulty: "intermediate",
    estimated_minutes: 10,
    concepts: ["window_function", "lag_lead", "cte", "inner_join", "group_by", "aggregate"],
    dataset,
    tables_used: ["plays", "users"],
    scenario_md:
      "Cada mercado de **Ritmo** tiene su propio responsable y todos piden lo mismo: su curva y su variación. El departamento de Operaciones quiere una sola consulta que sirva para los seis mercados, sin que el número de un país se contamine con el de otro, y te pide que la escribas.",
    business_question_md:
      "Debes generar un dataset, cruzando la tabla `plays` con `users`, con una fila por país y mes: el `country` del oyente, el `mes`, que es el primer día del mes de `played_at` calculado en la zona horaria UTC y con tipo `date`, la cantidad de reproducciones de ese país en ese mes bajo el encabezado `reproducciones` y la diferencia contra el mes anterior **del mismo país** bajo el encabezado `variacion`. El primer mes de cada país lleva `NULL` en la columna `variacion`. Ordena por `country` y después por `mes`, las dos claves en forma ascendente.",
    learning_objective:
      "Reiniciar la comparación en cada grupo con PARTITION BY para que lag() no cruce fronteras entre particiones.",
    theory_ref: basico,
    expected_columns: [
      { name: "country", type: "text" },
      { name: "mes", type: "date" },
      { name: "reproducciones", type: "integer" },
      { name: "variacion", type: "integer" },
    ],
    validation_rules: { order_matters: true, required_concepts: ["lag_lead"] },
    reference_solution:
      "WITH mensual AS (\n  SELECT\n    u.country,\n    date_trunc('month', p.played_at AT TIME ZONE 'UTC')::date AS mes,\n    count(*) AS reproducciones\n  FROM plays AS p\n  INNER JOIN users AS u ON u.id = p.user_id\n  GROUP BY 1, 2\n)\nSELECT\n  country,\n  mes,\n  reproducciones,\n  reproducciones - lag(reproducciones) OVER (PARTITION BY country ORDER BY mes) AS variacion\nFROM mensual\nORDER BY country, mes;",
    alternative_solutions: [
      {
        label: "CTE intermedia con el mes anterior",
        sql: "WITH mensual AS (SELECT u.country, date_trunc('month', p.played_at AT TIME ZONE 'UTC')::date AS mes, count(*) AS reproducciones FROM plays AS p INNER JOIN users AS u ON u.id = p.user_id GROUP BY 1, 2), con_anterior AS (SELECT country, mes, reproducciones, lag(reproducciones) OVER (PARTITION BY country ORDER BY mes) AS anterior FROM mensual) SELECT country, mes, reproducciones, reproducciones - anterior AS variacion FROM con_anterior ORDER BY country, mes;",
      },
      {
        label: "Desplazamiento y sentido del orden explícitos",
        sql: "WITH mensual AS (SELECT u.country, date_trunc('month', p.played_at AT TIME ZONE 'UTC')::date AS mes, count(*) AS reproducciones FROM plays AS p INNER JOIN users AS u ON u.id = p.user_id GROUP BY 1, 2) SELECT country, mes, reproducciones, reproducciones - lag(reproducciones, 1) OVER (PARTITION BY country ORDER BY mes ASC) AS variacion FROM mensual ORDER BY country ASC, mes ASC;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "La serie ahora tiene dos dimensiones: el país y el mes. La ventana tiene que saber que cada país es una historia aparte.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Agrupa por `u.country` y por el mes truncado en la zona horaria UTC. Dentro de la cláusula `OVER`, agrega `PARTITION BY country` antes del `ORDER BY mes`: sin eso, la primera fila de un país se compara con la última del país anterior.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nWITH mensual AS (\n  SELECT\n    u.country,\n    date_trunc('month', p.played_at AT TIME ZONE 'UTC')::date AS mes,\n    count(*) AS reproducciones\n  FROM plays AS p\n  INNER JOIN users AS u ON u.___ = p.___\n  GROUP BY 1, 2\n)\nSELECT\n  country,\n  mes,\n  reproducciones,\n  reproducciones - lag(reproducciones) OVER (___ ___ country ___ ___ mes) AS variacion\nFROM mensual\nORDER BY country, mes;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "cell_values",
        description_md:
          "Olvidar la cláusula `PARTITION BY country`: la primera fila de cada país toma como mes anterior la última fila del país anterior y produce variaciones enormes y falsas.",
      },
      {
        category: "join_condition",
        description_md:
          "Unir con la condición `u.id = p.id` en lugar de `u.id = p.user_id`: el cruce se ejecuta, devuelve filas y el resultado no significa nada.",
      },
      {
        category: "aggregation_level",
        description_md:
          "Aplicar la función `lag` directamente sobre la tabla `plays` sin agregar antes por país y mes: la ventana compara reproducciones individuales y no meses.",
      },
      {
        category: "wrong_order",
        description_md:
          "Ordenar solamente por `mes`: el informe se lee como una lista mezclada de países en lugar de seis curvas separadas.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 125 filas: cinco países con 21 meses y Perú con 20, porque su primera reproducción es de febrero de 2024. Ese detalle es justamente el motivo de la cláusula `PARTITION BY`: sin ella, la primera fila de Perú restaría contra la última de México y mostraría algo así como −2 893.\n\nSeis filas llevan `NULL` en la columna `variacion`, una por país. Es la señal de que la partición está bien puesta: si vieras una sola, la ventana estaría tratando toda la tabla como una única serie.\n\nEl `INNER JOIN` con la tabla `users` es correcto acá porque toda reproducción pertenece a un oyente registrado; con datos sucios reales convendría revisar si hay valores de `user_id` huérfanos antes de asumirlo.\n\nEl mismo patrón sirve para cualquier dimensión: cambia `country` por `plan_tier`, `device` o `genre` y tienes la variación mensual por esa dimensión sin tocar nada más.",
    reward: defaultReward("intermediate"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "tiempo-entre-reproducciones",
    section,
    title: "Tiempo entre reproducciones de un oyente",
    difficulty: "advanced",
    estimated_minutes: 12,
    concepts: ["window_function", "lag_lead", "where", "date_functions", "numeric_functions"],
    dataset,
    tables_used: ["plays"],
    scenario_md:
      "El departamento de Soporte está revisando un caso: el oyente número 496 escribió diciendo que la aplicación se le corta. El departamento de Producto quiere ver su historial con el hueco entre cada reproducción y la anterior, para entender si escucha en tandas largas o si entra y sale todo el tiempo. Te piden ese detalle para poder responderle.",
    business_question_md:
      "Debes generar un dataset que, para las reproducciones del oyente cuya columna `user_id` es igual a `496`, devuelva el `played_at`, que es el momento de la reproducción, el momento de su reproducción inmediatamente anterior bajo el encabezado `reproduccion_anterior` y las horas transcurridas entre las dos, redondeadas a 2 decimales, bajo el encabezado `horas_desde_anterior`. La primera reproducción lleva `NULL` en las dos últimas columnas. Ordena por `played_at` ascendente.",
    learning_objective:
      "Medir la brecha entre eventos consecutivos con lag() sobre una marca de tiempo y convertir el intervalo a un número comparable.",
    theory_ref: brechas,
    expected_columns: [
      { name: "played_at", type: "timestamp" },
      { name: "reproduccion_anterior", type: "timestamp" },
      { name: "horas_desde_anterior", type: "numeric" },
    ],
    validation_rules: {
      order_matters: true,
      numeric_tolerance: 0.001,
      required_concepts: ["lag_lead"],
    },
    reference_solution:
      "SELECT\n  played_at,\n  lag(played_at) OVER (ORDER BY played_at) AS reproduccion_anterior,\n  round(\n    (extract(epoch FROM played_at - lag(played_at) OVER (ORDER BY played_at)) / 3600)::numeric,\n    2\n  ) AS horas_desde_anterior\nFROM plays\nWHERE user_id = 496\nORDER BY played_at;",
    alternative_solutions: [
      {
        label: "CTE con el momento anterior",
        sql: "WITH historial AS (SELECT played_at, lag(played_at) OVER (ORDER BY played_at) AS anterior FROM plays WHERE user_id = 496) SELECT played_at, anterior AS reproduccion_anterior, round((extract(epoch FROM played_at - anterior) / 3600)::numeric, 2) AS horas_desde_anterior FROM historial ORDER BY played_at;",
      },
      {
        label: "Segundos divididos al final",
        sql: "WITH historial AS (SELECT played_at, lag(played_at) OVER (ORDER BY played_at) AS anterior FROM plays WHERE user_id = 496) SELECT played_at, anterior AS reproduccion_anterior, round(extract(epoch FROM played_at - anterior)::numeric / 3600, 2) AS horas_desde_anterior FROM historial ORDER BY played_at;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "La brecha entre dos eventos es una resta entre la marca de tiempo actual y la anterior. La anterior la trae una función de ventana ordenada por tiempo.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Restar dos valores de tipo `timestamptz` devuelve un `interval`, que no se redondea ni se compara con comodidad. Conviértelo con `extract(epoch FROM ...)`, que da segundos, y divide entre 3600 para obtener horas antes de redondear.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT\n  played_at,\n  ___(played_at) OVER (___ ___ played_at) AS reproduccion_anterior,\n  round(\n    (extract(___ FROM played_at - ___) / ____)::numeric,\n    2\n  ) AS horas_desde_anterior\nFROM plays\nWHERE user_id = ___\nORDER BY played_at;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "missing_filter",
        description_md:
          "Olvidar la condición `WHERE user_id = 496` y calcular la brecha sobre las 109 382 reproducciones de todos los oyentes: el resultado mide el tiempo entre eventos de personas distintas.",
      },
      {
        category: "cell_values",
        description_md:
          "Dividir entre 60, que daría minutos, o entre 86 400, que daría días, creyendo que son horas: la columna se llama `horas_desde_anterior` y el negocio la va a leer como horas.",
      },
      {
        category: "null_handling",
        description_md:
          "Usar `coalesce(..., 0)` en la primera fila: decir «volvió a los 0 minutos» es distinto de decir «no había una reproducción anterior».",
      },
      {
        category: "wrong_order",
        description_md:
          "Ordenar la ventana por la columna `id` en lugar de `played_at`: el orden de inserción no garantiza el orden cronológico.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 90 filas, desde junio de 2024 en adelante. La primera trae `NULL` y las otras 89 tienen su brecha calculada.\n\nLos números cuentan la historia: el promedio es de 48,51 horas, la brecha más corta es de 0,23 horas, unos 14 minutos, que corresponden a dos canciones seguidas, y la más larga llega a 12,11 días. No es alguien a quien se le corta la aplicación: es un patrón normal de escucha en tandas separadas por días.\n\nLa expresión `extract(epoch FROM intervalo)` devuelve segundos como un valor de tipo `double precision`. La conversión `::numeric` antes de `round(..., 2)` es necesaria porque la función `round` con dos argumentos solo existe para el tipo `numeric`; puedes convertir antes o después de dividir, el resultado es el mismo.\n\nNo hace falta una cláusula `PARTITION BY` porque el `WHERE` ya deja un solo oyente. Si quisieras el historial de todos, `PARTITION BY user_id` pasa a ser obligatorio; y en ese caso conviene agregar los datos, con un promedio o un máximo, en lugar de devolver una fila por reproducción.",
    reward: defaultReward("advanced"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "dias-hasta-el-siguiente-album",
    section,
    title: "Días hasta el siguiente álbum",
    difficulty: "advanced",
    estimated_minutes: 12,
    concepts: ["window_function", "lag_lead", "inner_join", "where", "date_functions"],
    dataset,
    tables_used: ["albums", "artists"],
    scenario_md:
      "El departamento de Catálogo está negociando con los sellos de cumbia y necesita un argumento concreto: cada cuánto publica un álbum nuevo cada artista del género. La pregunta mira hacia adelante: dado un álbum, cuánto tardó en salir el siguiente. Te piden ese cálculo para llevarlo a la mesa de negociación.",
    business_question_md:
      "Debes generar un dataset que, para los álbumes de artistas cuyo `genre` es igual al texto `'cumbia'`, devuelva el nombre del artista bajo el encabezado `artista`, el título del álbum bajo el encabezado `album`, el `released_on`, la fecha del siguiente álbum **del mismo artista** bajo el encabezado `siguiente_lanzamiento` y la cantidad de días entre las dos fechas bajo el encabezado `dias_hasta_siguiente`. El último álbum de cada artista lleva `NULL` en las dos últimas columnas. Ordena por `artista` y después por `released_on`, las dos claves en forma ascendente.",
    learning_objective:
      "Usar lead() con PARTITION BY para mirar el siguiente evento de cada grupo y medir la distancia entre fechas.",
    theory_ref: brechas,
    expected_columns: [
      { name: "artista", type: "text" },
      { name: "album", type: "text" },
      { name: "released_on", type: "date" },
      { name: "siguiente_lanzamiento", type: "date" },
      { name: "dias_hasta_siguiente", type: "integer" },
    ],
    validation_rules: { order_matters: true, required_concepts: ["lag_lead"] },
    reference_solution:
      "SELECT\n  ar.name AS artista,\n  al.title AS album,\n  al.released_on,\n  lead(al.released_on) OVER (PARTITION BY ar.id ORDER BY al.released_on) AS siguiente_lanzamiento,\n  lead(al.released_on) OVER (PARTITION BY ar.id ORDER BY al.released_on) - al.released_on AS dias_hasta_siguiente\nFROM albums AS al\nINNER JOIN artists AS ar ON ar.id = al.artist_id\nWHERE ar.genre = 'cumbia'\nORDER BY artista, al.released_on;",
    alternative_solutions: [
      {
        label: "CTE con el siguiente lanzamiento",
        sql: "WITH lanzamientos AS (SELECT ar.name AS artista, al.title AS album, al.released_on, lead(al.released_on) OVER (PARTITION BY ar.id ORDER BY al.released_on) AS siguiente FROM albums AS al INNER JOIN artists AS ar ON ar.id = al.artist_id WHERE ar.genre = 'cumbia') SELECT artista, album, released_on, siguiente AS siguiente_lanzamiento, siguiente - released_on AS dias_hasta_siguiente FROM lanzamientos ORDER BY artista, released_on;",
      },
      {
        label: "Partición por nombre de artista",
        sql: "SELECT ar.name AS artista, al.title AS album, al.released_on, lead(al.released_on) OVER (PARTITION BY ar.name ORDER BY al.released_on) AS siguiente_lanzamiento, lead(al.released_on) OVER (PARTITION BY ar.name ORDER BY al.released_on) - al.released_on AS dias_hasta_siguiente FROM albums AS al INNER JOIN artists AS ar ON ar.id = al.artist_id WHERE ar.genre = 'cumbia' ORDER BY 1, 3;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "La pregunta mira hacia adelante y no hacia atrás: hay una función de ventana hermana de `lag` que trae la fila siguiente.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Une la tabla `albums` con `artists` y filtra el género. Dentro de la cláusula `OVER`, particiona por el artista y ordena por `released_on`. Como la columna `released_on` es de tipo `date`, restar dos fechas ya devuelve un número entero de días: no hace falta usar `extract`.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT\n  ar.name AS artista,\n  al.title AS album,\n  al.released_on,\n  ___(al.released_on) OVER (___ ___ ar.id ___ ___ al.released_on) AS siguiente_lanzamiento,\n  ___ - al.released_on AS dias_hasta_siguiente\nFROM albums AS al\nINNER JOIN artists AS ar ON ar.id = al.___\nWHERE ar.genre = '___'\nORDER BY artista, al.released_on;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "cell_values",
        description_md:
          "Usar la función `lag` en lugar de `lead`: obtienes la distancia contra el álbum anterior y el signo de la resta queda invertido.",
      },
      {
        category: "aggregation_level",
        description_md:
          "Olvidar la cláusula `PARTITION BY`: el siguiente álbum de un artista pasa a ser el primero del artista que sigue en el orden.",
      },
      {
        category: "missing_filter",
        description_md:
          "Filtrar el género después de la ventana, en un nivel externo: la partición se calculó sobre todo el catálogo y los vecinos no son los correctos.",
      },
      {
        category: "null_handling",
        description_md:
          "Reemplazar el `NULL` del último álbum por `0`: pareciera que el artista publicó dos discos el mismo día.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 40 filas, correspondientes a 17 artistas de cumbia. De esas filas, 23 tienen un álbum siguiente y 17, que son el último de cada artista, llevan `NULL`: esa cuenta cierra sola y es una buena verificación rápida.\n\nLas brechas van de 84 a 914 días, con un promedio de 415,2, es decir, algo más de un año entre discos, lo que es coherente con la industria. Los 84 días de «Andén y Lluvia» entre *Kilómetro de Agosto* y *Kilómetro Interior* son la excepción y no la regla.\n\nRestar dos columnas de tipo `date` devuelve directamente un número entero de días. Es una de las pocas veces en que PostgreSQL te ahorra la conversión: con `timestamptz` obtendrías un `interval` y necesitarías `extract(epoch ...)`.\n\nParticionar por `ar.id` o por `ar.name` da el mismo resultado acá, porque los 320 nombres del catálogo son únicos, pero particionar por el identificador es la costumbre correcta: los nombres se repiten en cuanto el catálogo crece.\n\nUna variante útil para la negociación es envolver esto en una expresión de tabla común y quedarse con `max(dias_hasta_siguiente)` por artista, que es la brecha más larga de cada uno.",
    reward: defaultReward("advanced"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "indice-contra-el-ultimo-mes",
    section,
    title: "Índice contra el último mes cerrado",
    difficulty: "advanced",
    estimated_minutes: 14,
    concepts: [
      "window_function",
      "lag_lead",
      "cte",
      "inner_join",
      "group_by",
      "aggregate",
      "numeric_functions",
    ],
    dataset,
    tables_used: ["plays", "users"],
    scenario_md:
      "Para el informe anual, la dirección de **Ritmo** quiere ver cuánto pesaba cada mes comparado con el nivel actual de cada mercado: si agosto de 2025 vale 100, cuánto valía enero de 2024. Septiembre queda afuera porque el mes todavía está abierto. Te piden ese índice para poder comparar mercados de tamaños distintos.",
    business_question_md:
      "Debes generar un dataset que, cruzando la tabla `plays` con `users` y considerando solamente las reproducciones anteriores al `'2025-09-01'` en la zona horaria UTC, devuelva el `country`, el `mes`, que es el primer día del mes de `played_at` en UTC con tipo `date`, la cantidad de reproducciones del país en ese mes bajo el encabezado `reproducciones`, las reproducciones del **último mes de la serie de ese país** repetidas en todas sus filas bajo el encabezado `reproducciones_ultimo_mes`, y el valor de `reproducciones` expresado como porcentaje de `reproducciones_ultimo_mes`, redondeado a 1 decimal, bajo el encabezado `indice_vs_ultimo_mes`. Ordena por `country` y después por `mes`, las dos claves en forma ascendente.",
    learning_objective:
      "Obtener el valor final de cada partición con last_value() y el marco completo, y usarlo como base de un índice.",
    theory_ref: brechas,
    expected_columns: [
      { name: "country", type: "text" },
      { name: "mes", type: "date" },
      { name: "reproducciones", type: "integer" },
      { name: "reproducciones_ultimo_mes", type: "integer" },
      { name: "indice_vs_ultimo_mes", type: "numeric" },
    ],
    validation_rules: {
      order_matters: true,
      numeric_tolerance: 0.001,
      required_concepts: ["lag_lead"],
    },
    reference_solution:
      "WITH mensual AS (\n  SELECT\n    u.country,\n    date_trunc('month', p.played_at AT TIME ZONE 'UTC')::date AS mes,\n    count(*) AS reproducciones\n  FROM plays AS p\n  INNER JOIN users AS u ON u.id = p.user_id\n  WHERE p.played_at < timestamptz '2025-09-01 00:00:00+00'\n  GROUP BY 1, 2\n),\ncon_base AS (\n  SELECT\n    country,\n    mes,\n    reproducciones,\n    last_value(reproducciones) OVER (\n      PARTITION BY country\n      ORDER BY mes\n      ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING\n    ) AS reproducciones_ultimo_mes\n  FROM mensual\n)\nSELECT\n  country,\n  mes,\n  reproducciones,\n  reproducciones_ultimo_mes,\n  round(100.0 * reproducciones / reproducciones_ultimo_mes, 1) AS indice_vs_ultimo_mes\nFROM con_base\nORDER BY country, mes;",
    alternative_solutions: [
      {
        label: "first_value con orden descendente",
        sql: "WITH mensual AS (SELECT u.country, date_trunc('month', p.played_at AT TIME ZONE 'UTC')::date AS mes, count(*) AS reproducciones FROM plays AS p INNER JOIN users AS u ON u.id = p.user_id WHERE p.played_at < timestamptz '2025-09-01 00:00:00+00' GROUP BY 1, 2), con_base AS (SELECT country, mes, reproducciones, first_value(reproducciones) OVER (PARTITION BY country ORDER BY mes DESC) AS reproducciones_ultimo_mes FROM mensual) SELECT country, mes, reproducciones, reproducciones_ultimo_mes, round(100.0 * reproducciones / reproducciones_ultimo_mes, 1) AS indice_vs_ultimo_mes FROM con_base ORDER BY country, mes;",
      },
      {
        label: "nth_value desde el final",
        sql: "WITH mensual AS (SELECT u.country, date_trunc('month', p.played_at AT TIME ZONE 'UTC')::date AS mes, count(*) AS reproducciones FROM plays AS p INNER JOIN users AS u ON u.id = p.user_id WHERE p.played_at < timestamptz '2025-09-01 00:00:00+00' GROUP BY 1, 2), con_base AS (SELECT country, mes, reproducciones, nth_value(reproducciones, 1) OVER (PARTITION BY country ORDER BY mes DESC ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS reproducciones_ultimo_mes FROM mensual) SELECT country, mes, reproducciones, reproducciones_ultimo_mes, round(100.0 * reproducciones / reproducciones_ultimo_mes, 1) AS indice_vs_ultimo_mes FROM con_base ORDER BY country, mes;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "No necesitas la fila vecina sino un punto fijo de cada partición: su última fila. Hay una función de ventana que devuelve exactamente eso, pero tiene una trampa relacionada con el marco.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "La función `last_value(...)` con `ORDER BY` y sin marco explícito solo llega hasta la fila actual, así que devolvería esa misma fila. Abre el marco escribiendo `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING`. Una alternativa igual de válida es usar `first_value(...)` sobre `ORDER BY mes DESC`.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nWITH mensual AS (\n  SELECT u.country,\n         date_trunc('month', p.played_at AT TIME ZONE 'UTC')::date AS mes,\n         count(*) AS reproducciones\n  FROM plays AS p\n  INNER JOIN users AS u ON u.id = p.user_id\n  WHERE p.played_at ___ timestamptz '2025-09-01 00:00:00+00'\n  GROUP BY 1, 2\n),\ncon_base AS (\n  SELECT country, mes, reproducciones,\n         ___(reproducciones) OVER (\n           PARTITION BY country\n           ORDER BY mes\n           ___ BETWEEN ___ PRECEDING AND ___ ___\n         ) AS reproducciones_ultimo_mes\n  FROM mensual\n)\nSELECT country, mes, reproducciones, reproducciones_ultimo_mes,\n       round(___ * reproducciones / reproducciones_ultimo_mes, 1) AS indice_vs_ultimo_mes\nFROM con_base\nORDER BY country, mes;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "cell_values",
        description_md:
          "Usar `last_value(...) OVER (PARTITION BY country ORDER BY mes)` sin declarar el marco: el marco por omisión termina en la fila actual, así que el índice da 100,0 en todas las filas.",
      },
      {
        category: "date_boundary",
        description_md:
          "No excluir septiembre de 2025: el mes está incompleto y, al ser el último, arrastraría el índice de toda la serie.",
      },
      {
        category: "cell_values",
        description_md:
          "Dividir enteros, escribiendo `100 * reproducciones / base`: la división entera devuelve 0 en casi todos los meses.",
      },
      {
        category: "aggregation_level",
        description_md:
          "Calcular la base con `max(reproducciones)` por país: el mes más alto no es necesariamente el último, y la consigna pide el último.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 119 filas: 20 meses para cinco países y 19 para Perú, que empezó en febrero de 2024. El filtro deja fuera septiembre de 2025, un mes abierto que habría sido la base del índice y habría distorsionado la serie entera.\n\nLa última fila de cada país marca 100,0, como corresponde. Argentina arranca en 0,8, con 17 reproducciones contra 2 084 de agosto de 2025; Brasil cierra en 2 717, México en 2 929 y Chile en 1 119: la comparación deja ver que todos los mercados crecieron, pero no al mismo ritmo.\n\nEl punto técnico de este ejercicio es el marco. La función `last_value` sin marco explícito hereda `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`, así que «el último valor» termina siendo el de la fila actual y el índice daría 100,0 en todas partes. Abrir el marco hasta `UNBOUNDED FOLLOWING` hace que la ventana vea la partición completa.\n\nPor eso mucha gente prefiere escribir `first_value(reproducciones) OVER (PARTITION BY country ORDER BY mes DESC)`: dice lo mismo sin depender de recordar una regla poco intuitiva. Las dos formas están verificadas como equivalentes en este ejercicio.",
    reward: defaultReward("advanced"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "sesiones-de-escucha-por-mes",
    section,
    title: "Sesiones de escucha por mes",
    difficulty: "expert",
    estimated_minutes: 18,
    concepts: [
      "window_function",
      "lag_lead",
      "cte",
      "case",
      "group_by",
      "aggregate",
      "null_handling",
      "date_functions",
    ],
    dataset,
    tables_used: ["plays"],
    scenario_md:
      "El departamento de Producto quiere medir **sesiones** y no reproducciones sueltas. La definición acordada con el negocio es la siguiente: una sesión empieza cuando un oyente reproduce algo y habían pasado más de 30 minutos desde su reproducción anterior; la primera reproducción histórica de cada persona también abre sesión. Con eso quieren saber cuántas sesiones hubo por mes y cuántas canciones entran en cada una, y te piden ese indicador.",
    business_question_md:
      "Debes generar un dataset, a partir de la tabla `plays`, con una fila por mes: el `mes`, que es el primer día del mes de `played_at` en la zona horaria UTC y con tipo `date`, el total de reproducciones del mes bajo el encabezado `reproducciones`, la cantidad de reproducciones que **inician** sesión según la definición acordada bajo el encabezado `sesiones`, es decir, aquellas en las que no hay reproducción anterior del mismo oyente o pasaron más de 30 minutos desde ella, y la división de `reproducciones` entre `sesiones`, redondeada a 2 decimales, bajo el encabezado `reproducciones_por_sesion`. Ordena por `mes` ascendente. El mes se asigna por la fecha de la reproducción y no por la del inicio de la sesión.",
    learning_objective:
      "Combinar lag() con CASE para marcar el inicio de una sesión y agregar esas marcas por período.",
    theory_ref: brechas,
    expected_columns: [
      { name: "mes", type: "date" },
      { name: "reproducciones", type: "integer" },
      { name: "sesiones", type: "integer" },
      { name: "reproducciones_por_sesion", type: "numeric" },
    ],
    validation_rules: {
      order_matters: true,
      numeric_tolerance: 0.001,
      required_concepts: ["lag_lead"],
    },
    reference_solution:
      "WITH marcadas AS (\n  SELECT\n    played_at,\n    lag(played_at) OVER (PARTITION BY user_id ORDER BY played_at) AS anterior\n  FROM plays\n),\nclasificadas AS (\n  SELECT\n    date_trunc('month', played_at AT TIME ZONE 'UTC')::date AS mes,\n    CASE\n      WHEN anterior IS NULL OR played_at - anterior > interval '30 minutes' THEN 1\n      ELSE 0\n    END AS inicia_sesion\n  FROM marcadas\n)\nSELECT\n  mes,\n  count(*) AS reproducciones,\n  sum(inicia_sesion) AS sesiones,\n  round(count(*)::numeric / sum(inicia_sesion), 2) AS reproducciones_por_sesion\nFROM clasificadas\nGROUP BY mes\nORDER BY mes;",
    alternative_solutions: [
      {
        label: "Bandera booleana con FILTER",
        sql: "WITH marcadas AS (SELECT played_at, lag(played_at) OVER (PARTITION BY user_id ORDER BY played_at) AS anterior FROM plays), clasificadas AS (SELECT date_trunc('month', played_at AT TIME ZONE 'UTC')::date AS mes, (anterior IS NULL OR played_at - anterior > interval '30 minutes') AS inicia_sesion FROM marcadas) SELECT mes, count(*) AS reproducciones, count(*) FILTER (WHERE inicia_sesion) AS sesiones, round(count(*)::numeric / count(*) FILTER (WHERE inicia_sesion), 2) AS reproducciones_por_sesion FROM clasificadas GROUP BY mes ORDER BY mes;",
      },
      {
        label: "Comparando segundos en lugar de intervalos",
        sql: "WITH marcadas AS (SELECT played_at, lag(played_at) OVER (PARTITION BY user_id ORDER BY played_at) AS anterior FROM plays), clasificadas AS (SELECT date_trunc('month', played_at AT TIME ZONE 'UTC')::date AS mes, CASE WHEN anterior IS NULL OR extract(epoch FROM played_at - anterior) > 1800 THEN 1 ELSE 0 END AS inicia_sesion FROM marcadas) SELECT mes, count(*) AS reproducciones, sum(inicia_sesion) AS sesiones, round(count(*)::numeric / sum(inicia_sesion), 2) AS reproducciones_por_sesion FROM clasificadas GROUP BY mes ORDER BY mes;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Son tres pasos encadenados: traer el momento anterior de cada oyente, decidir fila por fila si esa reproducción abre sesión, y recién entonces agrupar por mes.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "El momento anterior sale de `lag(played_at) OVER (PARTITION BY user_id ORDER BY played_at)`. La condición de inicio tiene dos ramas unidas por `OR`: que el valor anterior esté en `NULL`, o que la diferencia supere `interval '30 minutes'`. Convierte esa condición en un 1 o un 0 con una expresión `CASE` y súmalo por mes.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nWITH marcadas AS (\n  SELECT played_at,\n         ___(played_at) OVER (___ ___ user_id ___ ___ played_at) AS anterior\n  FROM plays\n),\nclasificadas AS (\n  SELECT date_trunc('month', played_at AT TIME ZONE 'UTC')::date AS mes,\n         CASE WHEN anterior ___ ___ OR played_at - anterior ___ interval '___' THEN 1 ELSE 0 END AS inicia_sesion\n  FROM marcadas\n)\nSELECT mes,\n       count(*) AS reproducciones,\n       ___(inicia_sesion) AS sesiones,\n       round(count(*)::numeric / ___, 2) AS reproducciones_por_sesion\nFROM clasificadas\nGROUP BY mes\nORDER BY mes;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "null_handling",
        description_md:
          "Escribir solamente `played_at - anterior > interval '30 minutes'`: la primera reproducción de cada oyente tiene el valor anterior en `NULL`, la comparación da `NULL`, que no es verdadero, y se pierden 5000 inicios de sesión.",
      },
      {
        category: "aggregation_level",
        description_md:
          "Olvidar la cláusula `PARTITION BY user_id` dentro del `lag`: la brecha se mide contra la reproducción de otra persona y casi ninguna fila supera los 30 minutos.",
      },
      {
        category: "cell_values",
        description_md:
          "Dividir `count(*) / sum(inicia_sesion)` sin convertir a `numeric`: la división entera devuelve 1 en todos los meses.",
      },
      {
        category: "date_boundary",
        description_md:
          "Usar el operador `>=` en lugar de `>`: una pausa de exactamente 30 minutos pasaría a abrir sesión, y la definición acordada dice «más de 30 minutos».",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 21 filas. En enero de 2024 hay 120 reproducciones y 120 sesiones, es decir 1,00 reproducción por sesión: al principio casi nadie escucha dos canciones seguidas. A partir de ahí el indicador se mueve entre 1,01 y 1,02, y agosto de 2025 cierra con 11 024 reproducciones en 10 842 sesiones.\n\nEse 1,02 dice algo del dataset: solo 1990 de las 109 382 reproducciones, un 1,8 %, ocurren a menos de 30 minutos de la anterior del mismo oyente. Es un patrón de escucha muy fragmentado; en un servicio real esperarías varias canciones por sesión y este número sería la primera señal de que la definición de sesión, o los datos, merecen una revisión.\n\nLa parte delicada es la condición `anterior IS NULL OR ...`. En la lógica de tres valores de SQL, la comparación `NULL > interval '30 minutes'` no es falsa: es `NULL`, y la expresión `CASE` la trata como no coincidente. Sin esa primera rama, la primera reproducción de cada uno de los 5000 oyentes dejaría de contar como sesión.\n\nLa conversión `count(*)::numeric` antes de dividir evita la división entera. Y si quisieras un identificador de sesión por oyente, el paso siguiente es `sum(inicia_sesion) OVER (PARTITION BY user_id ORDER BY played_at)`: la suma acumulada de la bandera numera las sesiones de cada persona, y con eso se puede medir la duración y las canciones de cada sesión individual.",
    reward: defaultReward("expert"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
];
