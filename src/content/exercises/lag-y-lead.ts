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
      "En **Ritmo**, Analítica arma el resumen mensual de escucha. Antes de hablar de porcentajes, el equipo quiere la tabla más simple posible: cuántas reproducciones hubo cada mes, cuántas hubo el mes anterior y la diferencia entre ambas.",
    business_question_md:
      "A partir de `plays`, devuelve una fila por mes: `mes` (primer día del mes de `played_at`, calculado en UTC, como `date`), `reproducciones` (cantidad de reproducciones del mes), `reproducciones_mes_anterior` (la cantidad del mes inmediatamente anterior de la serie) y `variacion` (`reproducciones` menos `reproducciones_mes_anterior`), ordenado por `mes` ascendente. El primer mes no tiene mes anterior: deja `NULL` en esas dos columnas.",
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
          "Son dos pasos. Primero una fila por mes con su cantidad; después, sobre esa serie, traes el valor del mes anterior con una función de ventana que mira hacia atrás.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "El mes sale de `date_trunc('month', played_at AT TIME ZONE 'UTC')::date`. La función que trae la fila anterior es `lag(...)` y necesita `ORDER BY mes` dentro de `OVER`. La variación es una resta entre la columna y ese `lag`.",
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
          "Resolverlo con un `INNER JOIN` de la serie contra sí misma por `mes = otro.mes + interval '1 month'`: funciona, pero pierde el primer mes si el join no es externo y no practica la herramienta de la sección.",
      },
      {
        category: "cell_values",
        description_md:
          "Escribir `lag(reproducciones) OVER ()` sin `ORDER BY`: sin orden definido, el valor «anterior» no es reproducible.",
      },
      {
        category: "date_boundary",
        description_md:
          "Truncar sin `AT TIME ZONE 'UTC'`: el mes de cada reproducción pasa a depender de la zona horaria de la sesión. Aquí la sesión corre en UTC y los totales coinciden, pero el mismo reporte ejecutado en un servidor con otra zona mueve de mes las reproducciones de la medianoche.",
      },
      {
        category: "null_handling",
        description_md:
          "Usar `lag(reproducciones, 1, 0)` para «evitar el NULL»: enero de 2024 muestra una variación de +120 contra un mes que no existe.",
      },
    ],
    expert_explanation_md:
      "21 filas, de `2024-01-01` a `2025-09-01`. La primera trae `NULL` en las dos columnas nuevas, como corresponde: no hay mes anterior.\n\nLa serie crece casi siempre; las excepciones son enero de 2025 (−341 contra un diciembre muy alto) y febrero (−21). La última fila, septiembre de 2025, muestra −5 546: no es una caída del negocio, es que el dataset corta el 15 de septiembre. En un informe real ese mes se excluye o se marca como incompleto.\n\n`lag(reproducciones) OVER (ORDER BY mes)` se evalúa después del `GROUP BY`, por eso la CTE es necesaria: la ventana opera sobre la serie ya agregada, no sobre las 109 382 filas de `plays`.\n\nRepetir la expresión `lag(...)` dos veces es aceptable acá, pero cuando la fórmula crece (variación porcentual, tres columnas derivadas) conviene una segunda CTE que la calcule una sola vez.",
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
      "Crecimiento presenta el ritmo de altas al comité. Pidieron explícitamente el porcentaje: «el número absoluto no dice nada si no sé contra qué base». También pidieron que la consulta no falle nunca, aunque algún mes quede en cero.",
    business_question_md:
      "A partir de `users`, devuelve una fila por mes de alta: `mes` (primer día del mes de `signup_at`, calculado en UTC, como `date`), `altas` (oyentes registrados ese mes), `altas_mes_anterior` (altas del mes anterior de la serie) y `variacion_pct` (variación porcentual contra el mes anterior, redondeada a 1 decimal, sin multiplicar por 100 dos veces: por ejemplo `10.6` para un crecimiento del 10,6 %). Si no hay mes anterior o su valor es 0, `variacion_pct` debe ser `NULL`. Ordena por `mes` ascendente.",
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
          "La fórmula es (actual − anterior) / anterior × 100. El «anterior» lo trae una función de ventana; el resto es aritmética, con dos cuidados: el tipo de la división y el divisor en cero.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Multiplica por `100.0` (con punto) para que la división no sea entera, y envuelve el divisor en `nullif(..., 0)` para que un mes en cero devuelva `NULL` en lugar de hacer fallar la consulta. Una segunda CTE con la columna `altas_mes_anterior` ya calculada evita repetir el `lag` tres veces.",
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
          "Escribir `100 * (altas - anterior) / anterior` con enteros: la división entera trunca y casi todos los meses quedan en 0.",
      },
      {
        category: "null_handling",
        description_md:
          "Omitir `nullif(anterior, 0)`: mientras el dataset no tenga meses en cero la consulta corre, pero es una bomba de tiempo en producción.",
      },
      {
        category: "cell_values",
        description_md:
          "Calcular `altas / anterior` y presentarlo como porcentaje: eso es una razón (1.106), no una variación (10.6).",
      },
      {
        category: "date_boundary",
        description_md:
          "Truncar `signup_at` sin `AT TIME ZONE 'UTC'`: el corte queda atado a la zona horaria de la sesión. Aquí esa zona es UTC y el resultado coincide; en un servidor con otra zona, las altas de los últimos minutos de cada mes se mueven de mes.",
      },
    ],
    expert_explanation_md:
      "21 filas. Febrero de 2024 crece 10,6 % y marzo 89,4 % (de 94 a 178 altas): con bases tan chicas, el porcentaje exagera todo, y por eso los tableros suelen ocultar la variación cuando la base no llega a un mínimo.\n\nDe 2025 en adelante la serie se estabiliza entre −5,9 % y +12,5 %, que es el rango en el que el porcentaje empieza a ser informativo. Septiembre marca −54,0 % porque el dataset corta el día 15; es el mismo período incompleto de siempre, no una caída.\n\nDos decisiones técnicas cargan todo el peso. `100.0` convierte la división en `numeric`: con `100` la división entre enteros trunca y verías ceros. `nullif(altas_mes_anterior, 0)` transforma el divisor cero en `NULL`, y `NULL` propagado da `NULL`: la consulta devuelve «no calculable» en vez de abortar.\n\nLa forma `round(100.0 * (altas::numeric / nullif(anterior, 0) - 1), 1)` da exactamente lo mismo; elige la que tu equipo lea más rápido.",
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
      "Cada mercado tiene su propio responsable y todos piden lo mismo: su curva y su variación. Operaciones quiere una sola consulta que sirva para los seis mercados, sin que el número de un país se contamine con el de otro.",
    business_question_md:
      "Cruzando `plays` con `users`, devuelve una fila por país y mes: `country` (mercado del oyente), `mes` (primer día del mes de `played_at`, calculado en UTC, como `date`), `reproducciones` (cantidad de ese país en ese mes) y `variacion` (diferencia contra el mes anterior **del mismo país**). El primer mes de cada país lleva `NULL` en `variacion`. Ordena por `country` y luego por `mes`, ambos ascendentes.",
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
          "La serie ahora tiene dos dimensiones: país y mes. La ventana tiene que saber que cada país es una historia aparte.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Agrupa por `u.country` y por el mes truncado en UTC. Dentro de `OVER`, agrega `PARTITION BY country` antes del `ORDER BY mes`: sin eso, la primera fila de un país se compara con la última del país anterior.",
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
          "Olvidar `PARTITION BY country`: la primera fila de cada país toma como «mes anterior» la última fila del país anterior y produce variaciones enormes y falsas.",
      },
      {
        category: "join_condition",
        description_md:
          "Unir por `u.id = p.id` en lugar de `u.id = p.user_id`: el join corre, devuelve filas y el resultado no significa nada.",
      },
      {
        category: "aggregation_level",
        description_md:
          "Aplicar el `lag` directamente sobre `plays` sin agregar antes por país y mes: la ventana compara reproducciones individuales, no meses.",
      },
      {
        category: "wrong_order",
        description_md:
          "Ordenar solo por `mes`: el informe se lee como una lista mezclada de países en vez de seis curvas.",
      },
    ],
    expert_explanation_md:
      "125 filas: cinco países con 21 meses y Perú con 20, porque su primera reproducción es de febrero de 2024. Ese detalle es justamente el motivo de `PARTITION BY`: sin él, la primera fila de Perú restaría contra la última de México y mostraría algo así como −2 893.\n\nSeis filas llevan `NULL` en `variacion`, una por país. Es la señal de que la partición está bien puesta: si vieras una sola, la ventana estaría tratando toda la tabla como una única serie.\n\nEl `INNER JOIN` con `users` es correcto acá porque toda reproducción pertenece a un oyente registrado; con datos sucios reales convendría revisar si hay `user_id` huérfanos antes de asumirlo.\n\nMismo patrón, cualquier dimensión: cambia `country` por `plan_tier`, `device` o `genre` y tienes la variación mensual por esa dimensión sin tocar nada más.",
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
      "Soporte revisa un caso: el oyente 496 escribió diciendo que la aplicación «se le corta». Producto quiere ver su historial con el hueco entre cada reproducción y la anterior, para entender si escucha en tandas largas o entra y sale todo el tiempo.",
    business_question_md:
      "Para las reproducciones del oyente con `user_id = 496`, devuelve `played_at` (momento de la reproducción), `reproduccion_anterior` (momento de su reproducción inmediatamente anterior) y `horas_desde_anterior` (horas transcurridas entre ambas, redondeadas a 2 decimales). La primera reproducción lleva `NULL` en las dos últimas columnas. Ordena por `played_at` ascendente.",
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
          "Restar dos `timestamptz` devuelve un `interval`, que no se redondea ni se compara con comodidad. Convierte con `extract(epoch FROM ...)`, que da segundos, y divide entre 3600 para obtener horas antes de redondear.",
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
          "Olvidar `WHERE user_id = 496` y calcular la brecha sobre las 109 382 reproducciones de todos los oyentes: el resultado mide el tiempo entre personas distintas.",
      },
      {
        category: "cell_values",
        description_md:
          "Dividir entre 60 (minutos) o entre 86 400 (días) creyendo que son horas: la columna se llama `horas_desde_anterior` y el negocio va a leerla como horas.",
      },
      {
        category: "null_handling",
        description_md:
          "Usar `coalesce(..., 0)` en la primera fila: decir «volvió a los 0 minutos» es distinto de decir «no había una reproducción anterior».",
      },
      {
        category: "wrong_order",
        description_md:
          "Ordenar la ventana por `id` en vez de por `played_at`: el orden de inserción no garantiza el orden cronológico.",
      },
    ],
    expert_explanation_md:
      "90 filas, de junio de 2024 en adelante. La primera trae `NULL` y las otras 89 tienen su brecha.\n\nLos números cuentan la historia: el promedio es de 48,51 horas, la brecha más corta es de 0,23 horas (unos 14 minutos, dos canciones seguidas) y la más larga llega a 12,11 días. No es alguien que «se corta»: es un patrón normal de escucha en tandas separadas por días.\n\n`extract(epoch FROM intervalo)` devuelve segundos como `double precision`. El `::numeric` antes de `round(..., 2)` es necesario porque `round` con dos argumentos solo existe para `numeric`; puedes convertir antes o después de dividir, el resultado es el mismo.\n\nNo hace falta `PARTITION BY` porque el `WHERE` ya deja un solo oyente. Si quisieras el historial de todos, `PARTITION BY user_id` pasa a ser obligatorio; y ahí conviene agregar (promedio, máximo) en vez de devolver una fila por reproducción.",
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
      "El equipo de Catálogo negocia con los sellos de cumbia y necesita un argumento concreto: cada cuánto publica un álbum nuevo cada artista del género. La pregunta mira hacia adelante: dado un álbum, ¿cuánto tardó el siguiente en salir?",
    business_question_md:
      "Para los álbumes de artistas con `genre = 'cumbia'`, devuelve `artista` (nombre del artista), `album` (título del álbum), `released_on` (fecha de publicación), `siguiente_lanzamiento` (fecha del siguiente álbum **del mismo artista**) y `dias_hasta_siguiente` (días entre ambas fechas). El último álbum de cada artista lleva `NULL` en las dos últimas columnas. Ordena por `artista` y luego por `released_on`, ambos ascendentes.",
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
          "La pregunta mira hacia adelante, no hacia atrás: hay una función de ventana hermana de `lag` que trae la fila siguiente.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Une `albums` con `artists` y filtra el género. Dentro de `OVER`, particiona por el artista y ordena por `released_on`. Como `released_on` es `date`, restar dos fechas ya devuelve un entero de días: no hace falta `extract`.",
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
          "Usar `lag` en lugar de `lead`: obtienes la distancia contra el álbum anterior y el signo de la resta queda invertido.",
      },
      {
        category: "aggregation_level",
        description_md:
          "Olvidar `PARTITION BY`: el «siguiente álbum» de un artista pasa a ser el primero del artista que sigue en el orden.",
      },
      {
        category: "missing_filter",
        description_md:
          "Filtrar el género después de la ventana, en un nivel externo: la partición se calculó sobre todo el catálogo y los vecinos no son los correctos.",
      },
      {
        category: "null_handling",
        description_md:
          "Reemplazar el `NULL` del último álbum por 0: pareciera que el artista publicó dos discos el mismo día.",
      },
    ],
    expert_explanation_md:
      "40 filas, 17 artistas de cumbia. 23 filas tienen un álbum siguiente y 17 —el último de cada artista— llevan `NULL`: esa cuenta cierra sola y es una buena verificación rápida.\n\nLas brechas van de 84 a 914 días, con un promedio de 415,2: algo más de un año entre discos, coherente con la industria. Los 84 días de «Andén y Lluvia» entre *Kilómetro de Agosto* y *Kilómetro Interior* son la excepción, no la regla.\n\nRestar dos columnas `date` devuelve directamente un `integer` de días. Es una de las pocas veces en que Postgres te ahorra la conversión: con `timestamptz` obtendrías un `interval` y necesitarías `extract(epoch ...)`.\n\nParticionar por `ar.id` o por `ar.name` da el mismo resultado acá porque los 320 nombres del catálogo son únicos, pero la partición por identificador es la costumbre correcta: los nombres se repiten en cuanto el catálogo crece.\n\nUna variante útil para la negociación: envolver esto en una CTE y quedarse con `max(dias_hasta_siguiente)` por artista, que es la brecha más larga de cada uno.",
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
      "Para el informe anual, Dirección quiere ver cuánto pesaba cada mes comparado con el nivel actual de cada mercado: «si agosto de 2025 es 100, ¿cuánto era enero de 2024?». Septiembre queda afuera porque el mes todavía está abierto.",
    business_question_md:
      "Cruzando `plays` con `users`, y considerando solo las reproducciones anteriores al `2025-09-01` (en UTC), devuelve `country`, `mes` (primer día del mes de `played_at` en UTC, como `date`), `reproducciones` (del país en ese mes), `reproducciones_ultimo_mes` (las del **último mes de la serie de ese país**, repetido en todas sus filas) e `indice_vs_ultimo_mes` (`reproducciones` como porcentaje de `reproducciones_ultimo_mes`, redondeado a 1 decimal). Ordena por `country` y luego por `mes`, ambos ascendentes.",
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
          "No necesitas la fila vecina sino un punto fijo de cada partición: su última fila. Hay una función de ventana que devuelve exactamente eso, pero tiene una trampa con el marco.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "`last_value(...)` con `ORDER BY` y sin marco explícito solo llega hasta la fila actual, así que devolvería la fila actual. Abre el marco con `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING`. Alternativa válida: `first_value(...)` sobre `ORDER BY mes DESC`.",
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
          "Usar `last_value(...) OVER (PARTITION BY country ORDER BY mes)` sin marco: el marco por omisión termina en la fila actual, así que el índice da 100,0 en todas las filas.",
      },
      {
        category: "date_boundary",
        description_md:
          "No excluir septiembre de 2025: el mes está incompleto y, al ser el último, arrastraría el índice de toda la serie.",
      },
      {
        category: "cell_values",
        description_md:
          "Dividir enteros (`100 * reproducciones / base`): la división entera devuelve 0 en casi todos los meses.",
      },
      {
        category: "aggregation_level",
        description_md:
          "Calcular la base con `max(reproducciones)` por país: el mes más alto no es necesariamente el último, y la pregunta pide el último.",
      },
    ],
    expert_explanation_md:
      "119 filas: 20 meses para cinco países y 19 para Perú, que empezó en febrero de 2024. El filtro deja fuera septiembre de 2025, un mes abierto que habría sido la base del índice y habría distorsionado la serie entera.\n\nLa última fila de cada país marca 100,0, como corresponde. Argentina arranca en 0,8 (17 reproducciones contra 2 084 de agosto de 2025), Brasil cierra en 2 717, México en 2 929 y Chile en 1 119: la comparación deja ver que todos los mercados crecieron, pero no al mismo ritmo.\n\nEl punto técnico de este ejercicio es el marco. `last_value` sin marco explícito hereda `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`, así que «el último valor» es el de la fila actual y el índice daría 100,0 en todas partes. Abrir el marco a `UNBOUNDED FOLLOWING` hace que la ventana vea la partición completa.\n\nPor eso mucha gente prefiere `first_value(reproducciones) OVER (PARTITION BY country ORDER BY mes DESC)`: dice lo mismo sin depender de recordar una regla poco intuitiva. Las dos formas están verificadas como equivalentes en este ejercicio.",
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
      "Producto quiere medir **sesiones**, no reproducciones sueltas. La definición acordada con el negocio: una sesión empieza cuando un oyente reproduce algo y habían pasado más de 30 minutos desde su reproducción anterior; su primera reproducción histórica también abre sesión. Con eso quieren saber cuántas sesiones hubo por mes y cuántas canciones entran en cada una.",
    business_question_md:
      "A partir de `plays`, devuelve una fila por mes: `mes` (primer día del mes de `played_at` en UTC, como `date`), `reproducciones` (total del mes), `sesiones` (cantidad de reproducciones que **inician** sesión según la definición: no hay reproducción anterior del mismo oyente, o pasaron más de 30 minutos desde ella) y `reproducciones_por_sesion` (`reproducciones` dividido por `sesiones`, redondeado a 2 decimales). Ordena por `mes` ascendente. El mes se asigna por la fecha de la reproducción, no por la del inicio de la sesión.",
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
          "Son tres pasos encadenados: traer el momento anterior de cada oyente, decidir fila por fila si abre sesión, y recién entonces agrupar por mes.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "El momento anterior sale de `lag(played_at) OVER (PARTITION BY user_id ORDER BY played_at)`. La condición de inicio tiene dos ramas unidas por `OR`: que el anterior sea `NULL`, o que la diferencia supere `interval '30 minutes'`. Convierte esa condición en un 1/0 con `CASE` y súmalo por mes.",
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
          "Escribir solo `played_at - anterior > interval '30 minutes'`: la primera reproducción de cada oyente tiene `anterior` en `NULL`, la comparación da `NULL` (no verdadero) y se pierden 5 000 inicios de sesión.",
      },
      {
        category: "aggregation_level",
        description_md:
          "Olvidar `PARTITION BY user_id` en el `lag`: la brecha se mide contra la reproducción de otra persona y casi ninguna fila supera los 30 minutos.",
      },
      {
        category: "cell_values",
        description_md:
          "Dividir `count(*) / sum(inicia_sesion)` sin convertir a `numeric`: la división entera devuelve 1 en todos los meses.",
      },
      {
        category: "date_boundary",
        description_md:
          "Usar `>=` en lugar de `>`: una pausa de exactamente 30 minutos pasaría a abrir sesión, y la definición acordada dice «más de 30 minutos».",
      },
    ],
    expert_explanation_md:
      "21 filas. En enero de 2024 hay 120 reproducciones y 120 sesiones (1,00 por sesión): al principio casi nadie escucha dos canciones seguidas. A partir de ahí el indicador se mueve entre 1,01 y 1,02 y agosto de 2025 cierra con 11 024 reproducciones en 10 842 sesiones.\n\nEse 1,02 dice algo del dataset: solo 1 990 de las 109 382 reproducciones (1,8 %) ocurren a menos de 30 minutos de la anterior del mismo oyente. Es un patrón de escucha muy fragmentado; en un servicio real esperarías varias canciones por sesión y este número sería la primera señal de que la definición de sesión, o los datos, merecen una revisión.\n\nLa parte delicada es `anterior IS NULL OR ...`. En SQL de tres valores, `NULL > interval '30 minutes'` no es falso: es `NULL`, y `CASE` lo trata como no coincidente. Sin esa primera rama, la primera reproducción de cada uno de los 5 000 oyentes dejaría de contar como sesión.\n\n`count(*)::numeric` antes de dividir evita la división entera. Y si quisieras un identificador de sesión por oyente, el paso siguiente es `sum(inicia_sesion) OVER (PARTITION BY user_id ORDER BY played_at)`: la suma acumulada de la bandera numera las sesiones de cada persona, y con eso se puede medir duración y canciones por sesión individual.",
    reward: defaultReward("expert"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
];
