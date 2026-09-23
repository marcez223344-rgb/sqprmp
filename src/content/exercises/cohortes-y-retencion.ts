import {
  defaultHintMeta,
  defaultReward,
  defaultSolutionUnlock,
  type ExerciseDef,
} from "../schemas/exercise";

const section = "cohortes-y-retencion";
const dataset = { slug: "ritmo", version: 1 };
const definir = "definir-una-cohorte";
const matriz = "matriz-de-retencion";
const nDias = "retencion-n-dias-y-churn";

export const exercises: ExerciseDef[] = [
  {
    slug: "tamano-de-cada-cohorte",
    section,
    title: "Tamaño de cada cohorte mensual",
    difficulty: "advanced",
    estimated_minutes: 8,
    concepts: ["group_by", "aggregate", "date_functions", "window_function", "alias"],
    dataset,
    tables_used: ["users"],
    scenario_md:
      "En **Ritmo**, el departamento de Crecimiento va a construir su primer tablero de cohortes. Antes de medir retención necesita el denominador: cuánta gente entró en cada mes de alta y qué peso tiene cada cohorte sobre el total de oyentes registrados. Te piden esa tabla base para poder seguir con el resto del tablero.",
    business_question_md:
      "Debes generar un dataset, a partir de la tabla `users`, con una fila por mes de alta: la `cohorte`, que es el primer día del mes de `signup_at` calculado **en la zona horaria UTC** y con tipo `date`, la cantidad de oyentes registrados en ese mes bajo el encabezado `usuarios` y el porcentaje que representa esa cohorte sobre el total de oyentes de la tabla, redondeado a 2 decimales, bajo el encabezado `pct_del_total`. Ordena por `cohorte` ascendente.",
    learning_objective:
      "Asignar cada persona a su cohorte de alta con un huso horario explícito y calcular el tamaño de cohorte que servirá de denominador.",
    theory_ref: definir,
    expected_columns: [
      { name: "cohorte", type: "date" },
      { name: "usuarios", type: "integer" },
      { name: "pct_del_total", type: "numeric" },
    ],
    validation_rules: { order_matters: true, numeric_tolerance: 0.001 },
    reference_solution: `SELECT
  date_trunc('month', signup_at AT TIME ZONE 'UTC')::date AS cohorte,
  count(*) AS usuarios,
  round(100.0 * count(*) / sum(count(*)) OVER (), 2) AS pct_del_total
FROM users
GROUP BY 1
ORDER BY 1;`,
    alternative_solutions: [
      {
        label: "Total con subconsulta escalar",
        sql: "SELECT date_trunc('month', signup_at AT TIME ZONE 'UTC')::date AS cohorte, count(*) AS usuarios, round(100.0 * count(*) / (SELECT count(*) FROM users), 2) AS pct_del_total FROM users GROUP BY 1 ORDER BY 1;",
      },
      {
        label: "Total en una CTE",
        sql: "WITH total AS (SELECT count(*) AS n FROM users) SELECT date_trunc('month', u.signup_at AT TIME ZONE 'UTC')::date AS cohorte, count(*) AS usuarios, round(100.0 * count(*) / t.n, 2) AS pct_del_total FROM users AS u CROSS JOIN total AS t GROUP BY 1, t.n ORDER BY 1;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "La cohorte de una persona es el mes en que se dio de alta. Truncar la marca de tiempo al mes convierte 5000 altas en una fila por mes.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "El mes sale de `date_trunc('month', signup_at AT TIME ZONE 'UTC')::date`. Para el porcentaje necesitas el total de la tabla en la misma fila: `sum(count(*)) OVER ()` sobre el resultado agrupado, o una subconsulta escalar `(SELECT count(*) FROM users)`.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT\n  date_trunc('___', signup_at AT TIME ZONE '___')::date AS cohorte,\n  count(*) AS usuarios,\n  round(100.0 * count(*) / ___, 2) AS pct_del_total\nFROM users\nGROUP BY 1\nORDER BY 1;\n```\nEn el hueco del denominador va el total de oyentes de toda la tabla, no el de la cohorte.",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "date_boundary",
        description_md:
          "Truncar sin fijar el huso (`date_trunc('month', signup_at)`): la cohorte queda atada a la zona horaria de la sesión. Aquí esa zona es UTC y el resultado coincide; en un servidor con otra zona, las altas de la medianoche cambian de mes.",
      },
      {
        category: "aggregation_level",
        description_md:
          "Dividir por `count(*)` de la misma fila: cada cohorte daría 100 %. El denominador es el total de la tabla, no el del grupo.",
      },
      {
        category: "cell_values",
        description_md:
          "Escribir `100 * count(*) / (SELECT count(*) FROM users)` con enteros: la división entera devuelve 0 en casi todas las filas. Fuerza numérico con `100.0`.",
      },
      {
        category: "wrong_columns",
        description_md:
          "Devolver `cohorte` como marca de tiempo en vez de `date`: el informe muestra `2024-01-01 00:00:00+00` y la columna deja de servir como clave del mes.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 21 filas, desde `2024-01-01` hasta `2025-09-01`. La suma de la columna `usuarios` da 5000 y la de `pct_del_total` da 100: dos verificaciones rápidas de que el denominador es el correcto.\n\nLas cohortes crecen de 85 en enero de 2024 a 339 en agosto de 2025; la última fila (septiembre de 2025) tiene solo 156 porque los datos terminan el 15. Ese detalle no es menor: esa cohorte no debe compararse con las demás en ninguna métrica de retención, porque tuvo la mitad del mes para existir.\n\n`sum(count(*)) OVER ()` es una función de ventana aplicada **sobre el resultado ya agregado**: primero se agrupa por mes, después la ventana suma esas 21 filas. Es el camino más corto al gran total sin volver a leer la tabla. La subconsulta escalar `(SELECT count(*) FROM users)` da exactamente lo mismo y algunas personas la prefieren por claridad; con 5000 filas la diferencia de costo es irrelevante.\n\nEste resultado es el denominador de todo lo que viene: cualquier tasa de retención de esta sección se divide por la columna `usuarios` de esta tabla.",
    improvement_feedback: [
      {
        condition: "missing_alias_on_aggregate",
        message_key: "improve.missing_alias_on_aggregate",
      },
      { condition: "uses_select_star", message_key: "improve.uses_select_star" },
    ],
    reward: defaultReward("advanced"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "activacion-en-los-primeros-siete-dias",
    section,
    title: "Activación en los primeros siete días",
    difficulty: "advanced",
    estimated_minutes: 12,
    concepts: ["cte", "outer_join", "aggregate", "date_functions", "group_by"],
    dataset,
    tables_used: ["users", "plays"],
    scenario_md:
      "El departamento de Producto sospecha que mucha gente se registra en **Ritmo** y nunca llega a escuchar nada. Antes de rediseñar el proceso de alta quiere saber, cohorte por cohorte, qué proporción reprodujo al menos una canción dentro de sus primeros siete días, y te pide ese indicador.",
    business_question_md:
      "Debes generar un dataset que considere solamente a los oyentes cuya columna `signup_at` es anterior al `'2025-09-01'` en la zona horaria UTC, para que todos hayan tenido siete días completos de observación. Devuelve la `cohorte`, que es el primer día del mes de `signup_at` en UTC y con tipo `date`, el tamaño de la cohorte bajo el encabezado `usuarios`, la cantidad de personas que tienen al menos una reproducción en el intervalo que va desde su `signup_at` hasta `signup_at` más 7 días, sin incluir ese límite, bajo el encabezado `activados`, y el porcentaje correspondiente, redondeado a 2 decimales, bajo el encabezado `tasa_activacion_pct`. Ordena por `cohorte` ascendente.",
    learning_objective:
      "Medir un evento dentro de una ventana relativa al alta de cada persona sin perder a quienes nunca actuaron.",
    theory_ref: nDias,
    expected_columns: [
      { name: "cohorte", type: "date" },
      { name: "usuarios", type: "integer" },
      { name: "activados", type: "integer" },
      { name: "tasa_activacion_pct", type: "numeric" },
    ],
    validation_rules: {
      order_matters: true,
      numeric_tolerance: 0.001,
      required_concepts: ["cte"],
    },
    reference_solution: `WITH cohortes AS (
  SELECT
    id,
    signup_at,
    date_trunc('month', signup_at AT TIME ZONE 'UTC')::date AS cohorte
  FROM users
  WHERE signup_at < timestamptz '2025-09-01 00:00:00+00'
),
activados AS (
  SELECT DISTINCT c.id
  FROM cohortes AS c
  INNER JOIN plays AS p ON p.user_id = c.id
  WHERE p.played_at < c.signup_at + INTERVAL '7 days'
)
SELECT
  c.cohorte,
  count(*) AS usuarios,
  count(a.id) AS activados,
  round(100.0 * count(a.id) / count(*), 2) AS tasa_activacion_pct
FROM cohortes AS c
LEFT JOIN activados AS a ON a.id = c.id
GROUP BY 1
ORDER BY 1;`,
    alternative_solutions: [
      {
        label: "Con EXISTS",
        sql: "WITH cohortes AS (SELECT id, signup_at, date_trunc('month', signup_at AT TIME ZONE 'UTC')::date AS cohorte FROM users WHERE signup_at < timestamptz '2025-09-01 00:00:00+00'), activados AS (SELECT c.id FROM cohortes AS c WHERE EXISTS (SELECT 1 FROM plays AS p WHERE p.user_id = c.id AND p.played_at < c.signup_at + INTERVAL '7 days')) SELECT c.cohorte, count(*) AS usuarios, count(a.id) AS activados, round(100.0 * count(a.id) / count(*), 2) AS tasa_activacion_pct FROM cohortes AS c LEFT JOIN activados AS a ON a.id = c.id GROUP BY 1 ORDER BY 1;",
      },
      {
        label: "Marca por persona y suma condicional",
        sql: "WITH cohortes AS (SELECT id, signup_at, date_trunc('month', signup_at AT TIME ZONE 'UTC')::date AS cohorte FROM users WHERE signup_at < timestamptz '2025-09-01 00:00:00+00'), marcados AS (SELECT c.cohorte, c.id, max(CASE WHEN p.played_at < c.signup_at + INTERVAL '7 days' THEN 1 ELSE 0 END) AS activado FROM cohortes AS c LEFT JOIN plays AS p ON p.user_id = c.id GROUP BY c.cohorte, c.id) SELECT cohorte, count(*) AS usuarios, coalesce(sum(activado), 0)::bigint AS activados, round(100.0 * coalesce(sum(activado), 0) / count(*), 2) AS tasa_activacion_pct FROM marcados GROUP BY 1 ORDER BY 1;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "La ventana de siete días es distinta para cada persona: se mide desde su propia alta. Y el denominador tiene que seguir siendo la cohorte completa, incluso quienes nunca reprodujeron nada.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Arma dos CTE: una con la cohorte (id, `signup_at`, mes de alta) y otra con los `id` distintos que tienen alguna reproducción con `played_at < signup_at + INTERVAL '7 days'`. Únelas con `LEFT JOIN`: `count(*)` cuenta la cohorte y `count(a.id)` cuenta solo los que aparecieron.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nWITH cohortes AS (\n  SELECT id, signup_at, date_trunc('month', signup_at AT TIME ZONE 'UTC')::date AS cohorte\n  FROM users\n  WHERE signup_at < timestamptz '___'\n),\nactivados AS (\n  SELECT ___ c.id\n  FROM cohortes AS c\n  INNER JOIN plays AS p ON p.user_id = c.id\n  WHERE p.played_at < c.signup_at + ___\n)\nSELECT\n  c.cohorte,\n  count(*) AS usuarios,\n  count(___) AS activados,\n  round(100.0 * ___ / ___, 2) AS tasa_activacion_pct\nFROM cohortes AS c\n___ JOIN activados AS a ON a.id = c.id\nGROUP BY 1\nORDER BY 1;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "join_condition",
        description_md:
          "Unir la cohorte con la actividad usando `INNER JOIN`: desaparecen los oyentes sin reproducciones y la tasa da cerca del 100 % en todas las cohortes.",
      },
      {
        category: "duplicates",
        description_md:
          "Contar filas de `plays` en vez de personas: quien escuchó 40 canciones en su primera semana suma 40 «activados». El `DISTINCT` (o `EXISTS`) es lo que convierte eventos en personas.",
      },
      {
        category: "date_boundary",
        description_md:
          "Comparar contra una fecha fija (`played_at < DATE '2025-09-08'`) en lugar de contra el `signup_at` de cada persona: la ventana deja de ser relativa al alta.",
      },
      {
        category: "missing_filter",
        description_md:
          "Incluir la cohorte de septiembre de 2025: parte de esa gente se registró a menos de siete días del final de los datos y su ventana está incompleta, lo que hunde la tasa artificialmente.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 20 filas, desde `2024-01-01` hasta `2025-08-01`. La tasa de activación se mueve en una banda estrecha, entre 35,54 % (abril de 2025) y 43,89 % (agosto de 2024): dicho de otro modo, casi seis de cada diez altas no escuchan nada en su primera semana.\n\nHay dos decisiones que definen el número y ninguna se ve en el resultado. La primera es el `LEFT JOIN`: con `INNER JOIN` la tasa daría 100 % en todas las cohortes, porque el denominador se habría filtrado junto con el numerador. La segunda es el `DISTINCT` de la CTE `activados`: `plays` tiene 109 382 filas y sin él estarías contando reproducciones.\n\nEl filtro `signup_at < '2025-09-01'` protege la ventana de observación. Sin él, la cohorte de septiembre aparece con 23,72 %, muy por debajo del resto — y no porque esa gente sea peor, sino porque quien se registró el 12 de septiembre tenía tres días de datos, no siete.\n\nAlternativa igual de válida: `EXISTS`, que evita el `DISTINCT` porque se detiene en la primera coincidencia y nunca multiplica filas. En una tabla de eventos grande suele ser la opción más rápida, y se lee casi como la frase del negocio: «existe alguna reproducción suya dentro de sus primeros siete días».",
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
    slug: "retencion-a-30-dias-por-cohorte",
    section,
    title: "Retención a 30 días por cohorte",
    difficulty: "advanced",
    estimated_minutes: 13,
    concepts: ["cte", "outer_join", "aggregate", "date_functions", "group_by"],
    dataset,
    tables_used: ["users", "plays"],
    scenario_md:
      "El comité de producto de **Ritmo** adoptó una métrica única de retención temprana: se considera retenida a la persona que volvió a escuchar entre el día 1 y el día 30 después del alta. Quieren la serie por cohorte mensual para ver si mejoró a lo largo del tiempo, y te piden que la calcules.",
    business_question_md:
      "Debes generar un dataset que tome a los oyentes cuya columna `signup_at` es anterior al `'2025-08-01'` en la zona horaria UTC, que son los que ya completaron su ventana de 30 días. Una persona cuenta como retenida si tiene al menos una reproducción con `played_at` mayor o igual a `signup_at` más 1 día y menor que `signup_at` más 31 días, es decir, excluyendo el primer día. Devuelve la `cohorte`, que es el primer día del mes de `signup_at` en UTC y con tipo `date`, la cantidad bajo el encabezado `usuarios`, la cantidad de retenidos bajo el encabezado `retenidos_30d` y el porcentaje, redondeado a 2 decimales, bajo el encabezado `retencion_30d_pct`. Ordena por `cohorte` ascendente.",
    learning_objective:
      "Implementar la retención clásica a N días con una ventana abierta por la derecha y excluir el día del alta.",
    theory_ref: nDias,
    expected_columns: [
      { name: "cohorte", type: "date" },
      { name: "usuarios", type: "integer" },
      { name: "retenidos_30d", type: "integer" },
      { name: "retencion_30d_pct", type: "numeric" },
    ],
    validation_rules: {
      order_matters: true,
      numeric_tolerance: 0.001,
      required_concepts: ["cte"],
    },
    reference_solution: `WITH cohortes AS (
  SELECT
    id,
    signup_at,
    date_trunc('month', signup_at AT TIME ZONE 'UTC')::date AS cohorte
  FROM users
  WHERE signup_at < timestamptz '2025-08-01 00:00:00+00'
),
retenidos AS (
  SELECT DISTINCT c.id
  FROM cohortes AS c
  INNER JOIN plays AS p ON p.user_id = c.id
  WHERE p.played_at >= c.signup_at + INTERVAL '1 day'
    AND p.played_at < c.signup_at + INTERVAL '31 days'
)
SELECT
  c.cohorte,
  count(*) AS usuarios,
  count(r.id) AS retenidos_30d,
  round(100.0 * count(r.id) / count(*), 2) AS retencion_30d_pct
FROM cohortes AS c
LEFT JOIN retenidos AS r ON r.id = c.id
GROUP BY 1
ORDER BY 1;`,
    alternative_solutions: [
      {
        label: "Con EXISTS",
        sql: "WITH cohortes AS (SELECT id, signup_at, date_trunc('month', signup_at AT TIME ZONE 'UTC')::date AS cohorte FROM users WHERE signup_at < timestamptz '2025-08-01 00:00:00+00') SELECT c.cohorte, count(*) AS usuarios, count(*) FILTER (WHERE EXISTS (SELECT 1 FROM plays AS p WHERE p.user_id = c.id AND p.played_at >= c.signup_at + INTERVAL '1 day' AND p.played_at < c.signup_at + INTERVAL '31 days')) AS retenidos_30d, round(100.0 * count(*) FILTER (WHERE EXISTS (SELECT 1 FROM plays AS p WHERE p.user_id = c.id AND p.played_at >= c.signup_at + INTERVAL '1 day' AND p.played_at < c.signup_at + INTERVAL '31 days')) / count(*), 2) AS retencion_30d_pct FROM cohortes AS c GROUP BY 1 ORDER BY 1;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Es el mismo esquema que la activación, con otra ventana: ahora el intervalo empieza un día después del alta y termina a los 31 días. Cambiar los bordes cambia la métrica, así que léelos con cuidado.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Dos condiciones sobre la misma columna: `p.played_at >= c.signup_at + INTERVAL '1 day'` y `p.played_at < c.signup_at + INTERVAL '31 days'`. Evita `BETWEEN`: con marcas de tiempo, el borde superior cerrado incluye un instante que no te corresponde.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nWITH cohortes AS (\n  SELECT id, signup_at, date_trunc('month', signup_at AT TIME ZONE 'UTC')::date AS cohorte\n  FROM users\n  WHERE signup_at < timestamptz '___'\n),\nretenidos AS (\n  SELECT DISTINCT c.id\n  FROM cohortes AS c\n  INNER JOIN plays AS p ON p.user_id = c.id\n  WHERE p.played_at ___ c.signup_at + INTERVAL '___'\n    AND p.played_at ___ c.signup_at + INTERVAL '___'\n)\nSELECT\n  c.cohorte,\n  count(*) AS usuarios,\n  count(r.id) AS retenidos_30d,\n  round(___, 2) AS retencion_30d_pct\nFROM cohortes AS c\nLEFT JOIN retenidos AS r ON r.id = c.id\nGROUP BY 1\nORDER BY 1;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "date_boundary",
        description_md:
          "Incluir el día del alta (arrancar la ventana en `signup_at`): estarías midiendo activación. La retención pregunta si **volvió**, y por eso el intervalo empieza en `+ 1 day`.",
      },
      {
        category: "date_boundary",
        description_md:
          "Usar `BETWEEN c.signup_at + INTERVAL '1 day' AND c.signup_at + INTERVAL '30 days'`: `BETWEEN` es cerrado en ambos extremos y deja fuera casi todo el día 30.",
      },
      {
        category: "missing_filter",
        description_md:
          "No recortar las cohortes recientes: quien se registró en septiembre de 2025 no llegó a cumplir 30 días dentro de los datos y aparecería con una retención falsamente baja.",
      },
      {
        category: "join_condition",
        description_md:
          "Reemplazar el `LEFT JOIN` final por un `INNER JOIN`: el denominador pierde a la gente sin actividad y todas las cohortes rozan el 100 %.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 19 filas, desde `2024-01-01` hasta `2025-07-01`. La retención a 30 días se mueve entre 75,29 % (enero de 2024, la cohorte más chica con 85 personas) y 83,18 % (julio de 2025). La tendencia es levemente ascendente, que es exactamente la lectura que el comité busca en una columna así.\n\nSon números altos porque la definición es generosa: **una** reproducción en 30 días alcanza. Con una definición más exigente («al menos tres días distintos con actividad») el mismo dataset daría bastante menos. Esa es la lección central: el SQL no decide el número, la definición sí, y hay que publicarla junto al resultado.\n\nDos bordes hacen todo el trabajo. `>= signup_at + INTERVAL '1 day'` excluye la sesión del alta; sin él estarías informando activación con nombre de retención. Y `< signup_at + INTERVAL '31 days'` cierra la ventana por la derecha sin incluir un instante de más: el día 31 completo queda afuera, el 30 completo queda adentro.\n\nEl recorte `signup_at < '2025-08-01'` es lo que hace comparable la serie. Cada cohorte incluida tuvo sus 30 días dentro de los datos (los últimos registros son del 15 de septiembre de 2025), así que las diferencias entre filas son diferencias de comportamiento, no de tiempo observado.\n\nLa variante con `EXISTS` dentro de `count(*) FILTER (...)` evita las dos CTE y suele ser más rápida en tablas de eventos grandes, a costa de repetir la condición dos veces; si te incomoda esa repetición, calcúlala una vez en una CTE con `EXISTS` y agrega después.",
    improvement_feedback: [
      {
        condition: "uses_between_for_timestamps",
        message_key: "improve.uses_between_for_timestamps",
      },
      { condition: "no_table_alias_in_join", message_key: "improve.no_table_alias_in_join" },
    ],
    reward: defaultReward("advanced"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "matriz-de-cohortes-mensual",
    section,
    title: "La matriz de cohortes mes a mes",
    difficulty: "expert",
    estimated_minutes: 18,
    concepts: ["cte", "inner_join", "aggregate", "group_by", "date_functions", "distinct"],
    dataset,
    tables_used: ["users", "plays"],
    scenario_md:
      "Con las métricas puntuales ya resueltas, la dirección de **Ritmo** pide la tabla completa: la matriz de cohortes, para pegarla en el tablero y poder leer tanto la curva de vida de cada cohorte como la comparación entre cohortes en el mismo momento de vida. Te piden construirla.",
    business_question_md:
      "Debes generar un dataset que, para cada cohorte de alta y cada mes de vida con actividad, devuelva la `cohorte`, que es el primer día del mes de `signup_at` en la zona horaria UTC y con tipo `date`, el `mes_indice`, que vale 0 para el mes de alta, 1 para el siguiente y así sucesivamente, con tipo entero, el tamaño total de la cohorte bajo el encabezado `usuarios_cohorte`, la cantidad de personas **distintas** de esa cohorte que tuvieron al menos una reproducción en ese mes, en UTC, bajo el encabezado `usuarios_activos`, y el porcentaje sobre el tamaño de la cohorte, redondeado a 2 decimales, bajo el encabezado `retencion_pct`. Debes incluir todas las cohortes. Ordena por `cohorte` y después por `mes_indice` ascendente.",
    learning_objective:
      "Construir una matriz de cohortes completa: índice de período por diferencia de meses, numerador de personas distintas y denominador calculado aparte.",
    theory_ref: matriz,
    expected_columns: [
      { name: "cohorte", type: "date" },
      { name: "mes_indice", type: "integer" },
      { name: "usuarios_cohorte", type: "integer" },
      { name: "usuarios_activos", type: "integer" },
      { name: "retencion_pct", type: "numeric" },
    ],
    validation_rules: {
      order_matters: true,
      numeric_tolerance: 0.001,
      required_concepts: ["cte", "inner_join"],
    },
    reference_solution: `WITH cohortes AS (
  SELECT
    id,
    date_trunc('month', signup_at AT TIME ZONE 'UTC')::date AS cohorte
  FROM users
),
tamano AS (
  SELECT cohorte, count(*) AS usuarios_cohorte
  FROM cohortes
  GROUP BY 1
),
actividad AS (
  SELECT DISTINCT
    c.cohorte,
    c.id,
    date_trunc('month', p.played_at AT TIME ZONE 'UTC')::date AS mes
  FROM cohortes AS c
  INNER JOIN plays AS p ON p.user_id = c.id
)
SELECT
  a.cohorte,
  (12 * (date_part('year', a.mes) - date_part('year', a.cohorte))
      + (date_part('month', a.mes) - date_part('month', a.cohorte)))::int AS mes_indice,
  t.usuarios_cohorte,
  count(*) AS usuarios_activos,
  round(100.0 * count(*) / t.usuarios_cohorte, 2) AS retencion_pct
FROM actividad AS a
INNER JOIN tamano AS t ON t.cohorte = a.cohorte
GROUP BY a.cohorte, 2, t.usuarios_cohorte
ORDER BY a.cohorte, 2;`,
    alternative_solutions: [
      {
        label: "Sin DISTINCT en la CTE, con count(DISTINCT ...)",
        sql: "WITH cohortes AS (SELECT id, date_trunc('month', signup_at AT TIME ZONE 'UTC')::date AS cohorte FROM users), tamano AS (SELECT cohorte, count(*) AS usuarios_cohorte FROM cohortes GROUP BY 1), actividad AS (SELECT c.cohorte, c.id, date_trunc('month', p.played_at AT TIME ZONE 'UTC')::date AS mes FROM cohortes AS c INNER JOIN plays AS p ON p.user_id = c.id) SELECT a.cohorte, (12 * (date_part('year', a.mes) - date_part('year', a.cohorte)) + (date_part('month', a.mes) - date_part('month', a.cohorte)))::int AS mes_indice, t.usuarios_cohorte, count(DISTINCT a.id) AS usuarios_activos, round(100.0 * count(DISTINCT a.id) / t.usuarios_cohorte, 2) AS retencion_pct FROM actividad AS a INNER JOIN tamano AS t ON t.cohorte = a.cohorte GROUP BY a.cohorte, 2, t.usuarios_cohorte ORDER BY a.cohorte, 2;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Tres piezas independientes: a qué cohorte pertenece cada persona, cuánto mide cada cohorte y en qué meses estuvo activa cada persona. Resuélvelas por separado en CTE y recién después combínalas.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "El índice de mes se calcula restando año y mes, no fechas: `12 * (date_part('year', mes) - date_part('year', cohorte)) + (date_part('month', mes) - date_part('month', cohorte))`. Y la CTE de actividad debe tener una sola fila por persona y mes (`SELECT DISTINCT`), o contarás reproducciones.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nWITH cohortes AS (\n  SELECT id, date_trunc('month', signup_at AT TIME ZONE 'UTC')::date AS cohorte\n  FROM users\n),\ntamano AS (\n  SELECT cohorte, count(*) AS usuarios_cohorte FROM cohortes GROUP BY 1\n),\nactividad AS (\n  SELECT ___\n    c.cohorte, c.id,\n    date_trunc('month', p.played_at AT TIME ZONE '___')::date AS mes\n  FROM cohortes AS c\n  INNER JOIN plays AS p ON p.user_id = c.id\n)\nSELECT\n  a.cohorte,\n  (12 * (___) + (___))::int AS mes_indice,\n  t.usuarios_cohorte,\n  count(*) AS usuarios_activos,\n  round(___, 2) AS retencion_pct\nFROM actividad AS a\nINNER JOIN tamano AS t ON t.cohorte = a.cohorte\nGROUP BY a.cohorte, 2, t.usuarios_cohorte\nORDER BY a.cohorte, 2;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "duplicates",
        description_md:
          "Omitir el `DISTINCT` de la CTE de actividad: `usuarios_activos` cuenta reproducciones y la retención supera el 100 % en casi todas las celdas.",
      },
      {
        category: "aggregation_level",
        description_md:
          "Calcular el denominador dentro de la misma consulta agregada (por ejemplo `count(*) OVER (PARTITION BY cohorte)` sobre la actividad): eso cuenta a la gente activa, no al tamaño de la cohorte.",
      },
      {
        category: "date_boundary",
        description_md:
          "Restar las fechas (`a.mes - a.cohorte`) para el índice: PostgreSQL devuelve días, así que el mes 1 aparece como 28, 30 o 31 según el mes.",
      },
      {
        category: "cell_values",
        description_md:
          "Reasignar la cohorte usando el mes de la reproducción en vez del mes del alta: cada persona «cambia» de cohorte todos los meses y la matriz pierde sentido.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 231 filas: 21 cohortes, cada una con su triángulo de meses de vida (la de enero de 2024 llega al mes 20; la de septiembre de 2025 solo tiene el mes 0).\n\nLee la primera fila de la matriz, la cohorte `2024-01-01` de 85 personas: mes 0, 51,76 %; mes 1, 69,41 %; mes 2, 68,24 %; mes 6, 55,29 %; mes 12, 49,41 %; mes 20, 29,41 %. Dos cosas llaman la atención y las dos tienen explicación.\n\nLa primera: **el mes 0 es más bajo que el mes 1**. No es un error. El mes de alta es parcial —quien se registra el 28 de enero tiene tres días de enero— así que la comparación justa empieza en el mes 1. Es el motivo por el que tantos tableros publican la curva desde el mes 1 o usan ventanas relativas al alta, como hiciste en los ejercicios anteriores.\n\nLa segunda: el último mes de cada cohorte cae fuerte (29,41 % en el mes 20 de la primera cohorte). Ese mes es septiembre de 2025 y los datos terminan el día 15: es medio mes, no una fuga de clientes. Cualquier lectura de la última diagonal tiene que descontar eso.\n\nSobre la construcción: el `INNER JOIN` con `plays` aquí es correcto, porque solo genera celdas que existen, y el denominador ya viene garantizado por la CTE `tamano`, calculada sobre la cohorte completa. Los meses sin ninguna actividad simplemente no aparecen como filas; si el tablero necesita ceros explícitos, hay que generar el eje de períodos con `generate_series` y hacer `LEFT JOIN` contra la actividad.\n\nEl `GROUP BY a.cohorte, 2, t.usuarios_cohorte` agrupa por la posición 2 para no repetir la expresión larga del índice; incluir `t.usuarios_cohorte` en el `GROUP BY` es obligatorio porque aparece en el `SELECT` sin agregar, y es inofensivo: hay un solo valor por cohorte.",
    improvement_feedback: [
      { condition: "no_table_alias_in_join", message_key: "improve.no_table_alias_in_join" },
      { condition: "uses_implicit_join", message_key: "improve.uses_implicit_join" },
    ],
    reward: defaultReward("expert"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "curva-de-retencion-promedio",
    section,
    title: "Curva de retención promedio",
    difficulty: "expert",
    estimated_minutes: 16,
    concepts: ["cte", "inner_join", "aggregate", "group_by", "date_functions", "where"],
    dataset,
    tables_used: ["users", "plays"],
    scenario_md:
      "La matriz completa es demasiado grande para la presentación al directorio. El departamento de Analítica quiere una sola curva: el porcentaje promedio de oyentes que sigue activo en cada mes de vida, calculado solamente sobre las cohortes que ya vivieron los seis primeros meses completos. Te piden esa curva resumida.",
    business_question_md:
      "Debes generar un dataset que tome únicamente a los oyentes cuya columna `signup_at` es anterior al `'2025-04-01'` en la zona horaria UTC, que son las cohortes que van de `2024-01` a `2025-03`, las únicas que completaron seis meses de vida dentro de los datos. Para cada valor de `mes_indice` de 0 a 5, devuelve el `mes_indice` con tipo entero, el total de oyentes considerados, que es el mismo en todas las filas, bajo el encabezado `usuarios_base`, la cantidad de personas distintas con al menos una reproducción en ese mes de vida, en UTC, bajo el encabezado `usuarios_activos`, y el porcentaje, redondeado a 2 decimales, bajo el encabezado `retencion_pct`. Ordena por `mes_indice` ascendente.",
    learning_objective:
      "Colapsar una matriz de cohortes en una curva promedio restringiendo el cálculo a las cohortes completamente observadas.",
    theory_ref: matriz,
    expected_columns: [
      { name: "mes_indice", type: "integer" },
      { name: "usuarios_base", type: "integer" },
      { name: "usuarios_activos", type: "integer" },
      { name: "retencion_pct", type: "numeric" },
    ],
    validation_rules: {
      order_matters: true,
      numeric_tolerance: 0.001,
      required_concepts: ["cte"],
    },
    reference_solution: `WITH cohortes AS (
  SELECT
    id,
    date_trunc('month', signup_at AT TIME ZONE 'UTC')::date AS cohorte
  FROM users
  WHERE signup_at < timestamptz '2025-04-01 00:00:00+00'
),
base AS (
  SELECT count(*) AS usuarios_base FROM cohortes
),
actividad AS (
  SELECT DISTINCT
    c.id,
    (12 * (date_part('year', date_trunc('month', p.played_at AT TIME ZONE 'UTC')::date)
            - date_part('year', c.cohorte))
        + (date_part('month', date_trunc('month', p.played_at AT TIME ZONE 'UTC')::date)
            - date_part('month', c.cohorte)))::int AS mes_indice
  FROM cohortes AS c
  INNER JOIN plays AS p ON p.user_id = c.id
)
SELECT
  a.mes_indice,
  b.usuarios_base,
  count(*) AS usuarios_activos,
  round(100.0 * count(*) / b.usuarios_base, 2) AS retencion_pct
FROM actividad AS a
CROSS JOIN base AS b
WHERE a.mes_indice <= 5
GROUP BY a.mes_indice, b.usuarios_base
ORDER BY a.mes_indice;`,
    alternative_solutions: [
      {
        label: "Mes de actividad en una CTE intermedia",
        sql: "WITH cohortes AS (SELECT id, date_trunc('month', signup_at AT TIME ZONE 'UTC')::date AS cohorte FROM users WHERE signup_at < timestamptz '2025-04-01 00:00:00+00'), base AS (SELECT count(*) AS usuarios_base FROM cohortes), meses AS (SELECT DISTINCT c.id, c.cohorte, date_trunc('month', p.played_at AT TIME ZONE 'UTC')::date AS mes FROM cohortes AS c INNER JOIN plays AS p ON p.user_id = c.id), indices AS (SELECT id, (12 * (date_part('year', mes) - date_part('year', cohorte)) + (date_part('month', mes) - date_part('month', cohorte)))::int AS mes_indice FROM meses) SELECT i.mes_indice, b.usuarios_base, count(*) AS usuarios_activos, round(100.0 * count(*) / b.usuarios_base, 2) AS retencion_pct FROM indices AS i CROSS JOIN base AS b WHERE i.mes_indice <= 5 GROUP BY i.mes_indice, b.usuarios_base ORDER BY i.mes_indice;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Es la matriz anterior sin la dimensión de cohorte: mismo numerador de personas distintas, pero un único denominador para todas las filas. Lo que decide si la curva es honesta es qué cohortes entran.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Guarda el total de la base en su propia CTE (`SELECT count(*) FROM cohortes`) y tráelo con `CROSS JOIN`: así puedes ponerlo en el `SELECT` y en el `GROUP BY` sin recalcularlo. El recorte a los meses 0 a 5 va en un `WHERE` sobre el índice ya calculado.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nWITH cohortes AS (\n  SELECT id, date_trunc('month', signup_at AT TIME ZONE 'UTC')::date AS cohorte\n  FROM users\n  WHERE signup_at < timestamptz '___'\n),\nbase AS (\n  SELECT count(*) AS usuarios_base FROM cohortes\n),\nactividad AS (\n  SELECT DISTINCT c.id, (___)::int AS mes_indice\n  FROM cohortes AS c\n  INNER JOIN plays AS p ON p.user_id = c.id\n)\nSELECT\n  a.mes_indice,\n  b.usuarios_base,\n  count(*) AS usuarios_activos,\n  round(___, 2) AS retencion_pct\nFROM actividad AS a\nCROSS JOIN base AS b\nWHERE a.mes_indice ___ 5\nGROUP BY a.mes_indice, b.usuarios_base\nORDER BY a.mes_indice;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "missing_filter",
        description_md:
          "Incluir todas las cohortes: las de 2025 no vivieron seis meses, así que aportan al denominador pero no pueden aportar al numerador de los meses 4 y 5, y la curva se hunde sin motivo real.",
      },
      {
        category: "aggregation_level",
        description_md:
          "Promediar los porcentajes de la matriz por `mes_indice` con `avg(retencion_pct)`: eso da el mismo peso a una cohorte de 85 personas que a una de 305. La curva ponderada se calcula sumando numeradores y denominadores.",
      },
      {
        category: "duplicates",
        description_md:
          "Olvidar el `DISTINCT`: cada persona aparece una vez por reproducción y la retención supera holgadamente el 100 %.",
      },
      {
        category: "null_handling",
        description_md:
          "Dividir sin protección cuando el denominador puede ser 0. Aquí no ocurre, pero en un recorte más chico `nullif(usuarios_base, 0)` evita el error de división por cero.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 6 filas y una base de 3247 oyentes, que son las 15 cohortes de enero de 2024 a marzo de 2025. La curva queda así: mes 0, 53,80 %; mes 1, 75,33 %; mes 2, 68,86 %; mes 3, 66,00 %; mes 4, 63,81 %; mes 5, 60,86 %.\n\nEs la forma típica de una curva de retención una vez corregido el mes 0: un pico en el primer mes completo y después una caída que se va suavizando. La pendiente entre el mes 1 y el mes 5 es de unos 14 puntos, poco más de 3 puntos por mes y decreciendo: la base se está estabilizando, que es justamente lo que el directorio quiere ver.\n\nEl corte `signup_at < '2025-04-01'` es la decisión analítica del ejercicio. La cohorte de marzo de 2025 cumple su mes 5 en agosto de 2025, dentro de los datos; la de abril lo cumpliría en septiembre, que está a medias. Si la incluyeras, sumaría 287 personas al denominador de todas las filas y solo podría aportar al numerador de los meses 0 a 4. La curva bajaría, y bajaría por un motivo que no tiene nada que ver con el producto.\n\nHay dos formas de promediar y no son equivalentes. La de aquí es **ponderada**: se suman personas activas y se divide por personas totales, así que las cohortes grandes pesan más. La otra, `avg()` sobre los porcentajes de la matriz, es un promedio simple que trata igual a una cohorte de 85 y a una de 305. Para una curva de producto la ponderada es casi siempre la correcta; declara cuál usaste.\n\nDetalle de estilo: el total vive en su propia CTE y entra con `CROSS JOIN` porque tiene exactamente una fila. Podrías usar una subconsulta escalar repetida dos veces y el plan sería equivalente, pero la CTE deja explícito que es un único valor para todo el informe.",
    improvement_feedback: [
      {
        condition: "missing_alias_on_aggregate",
        message_key: "improve.missing_alias_on_aggregate",
      },
      { condition: "no_table_alias_in_join", message_key: "improve.no_table_alias_in_join" },
    ],
    reward: defaultReward("expert"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "churn-mensual-de-suscripciones",
    section,
    title: "Churn mensual de suscripciones",
    difficulty: "expert",
    estimated_minutes: 18,
    concepts: [
      "cte",
      "conditional_aggregation",
      "aggregate",
      "date_functions",
      "null_handling",
      "group_by",
    ],
    dataset,
    tables_used: ["subscriptions"],
    scenario_md:
      "El departamento de Finanzas no mide la retención de oyentes: mide las suscripciones pagas. Quiere la serie mensual de bajas de **Ritmo** para el período que va de junio de 2024 a agosto de 2025, con la regla de siempre: cuántas suscripciones estaban vivas al empezar el mes y cuántas se dieron de baja durante ese mes. Te piden esa serie para el informe financiero.",
    business_question_md:
      "Debes generar un dataset, usando la tabla `subscriptions`, con una fila por mes desde el `'2024-06-01'` hasta el `'2025-08-01'`, con el `mes`, que es el primer día del mes con tipo `date`, la cantidad de suscripciones cuya columna `started_on` es anterior al mes y que no habían terminado antes de él, es decir, con `ended_on` en `NULL` o mayor o igual al primer día del mes, bajo el encabezado `activas_inicio`, la cantidad de suscripciones cuya columna `ended_on` cae dentro de ese mes bajo el encabezado `bajas`, y la división de bajas entre activas al inicio expresada en porcentaje y redondeada a 2 decimales bajo el encabezado `churn_pct`. Ordena por `mes` ascendente.",
    learning_objective:
      "Calcular una tasa de churn con la base activa al inicio del período como denominador, tratando explícitamente los períodos vigentes.",
    theory_ref: nDias,
    expected_columns: [
      { name: "mes", type: "date" },
      { name: "activas_inicio", type: "integer" },
      { name: "bajas", type: "integer" },
      { name: "churn_pct", type: "numeric" },
    ],
    validation_rules: {
      order_matters: true,
      numeric_tolerance: 0.001,
      required_concepts: ["cte", "null_handling"],
    },
    reference_solution: `WITH meses AS (
  SELECT g::date AS mes
  FROM generate_series(DATE '2024-06-01', DATE '2025-08-01', INTERVAL '1 month') AS g
)
SELECT
  m.mes,
  count(*) FILTER (
    WHERE s.started_on < m.mes AND (s.ended_on IS NULL OR s.ended_on >= m.mes)
  ) AS activas_inicio,
  count(*) FILTER (
    WHERE s.ended_on >= m.mes AND s.ended_on < (m.mes + INTERVAL '1 month')::date
  ) AS bajas,
  round(
    100.0 * count(*) FILTER (
      WHERE s.ended_on >= m.mes AND s.ended_on < (m.mes + INTERVAL '1 month')::date
    )
    / nullif(count(*) FILTER (
        WHERE s.started_on < m.mes AND (s.ended_on IS NULL OR s.ended_on >= m.mes)
      ), 0),
    2
  ) AS churn_pct
FROM meses AS m
CROSS JOIN subscriptions AS s
GROUP BY m.mes
ORDER BY m.mes;`,
    alternative_solutions: [
      {
        label: "Con CASE WHEN en lugar de FILTER",
        sql: "WITH meses AS (SELECT g::date AS mes FROM generate_series(DATE '2024-06-01', DATE '2025-08-01', INTERVAL '1 month') AS g), conteos AS (SELECT m.mes, sum(CASE WHEN s.started_on < m.mes AND (s.ended_on IS NULL OR s.ended_on >= m.mes) THEN 1 ELSE 0 END) AS activas_inicio, sum(CASE WHEN s.ended_on >= m.mes AND s.ended_on < (m.mes + INTERVAL '1 month')::date THEN 1 ELSE 0 END) AS bajas FROM meses AS m CROSS JOIN subscriptions AS s GROUP BY m.mes) SELECT mes, activas_inicio, bajas, round(100.0 * bajas / nullif(activas_inicio, 0), 2) AS churn_pct FROM conteos ORDER BY mes;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "El churn no se calcula sobre la cohorte de alta sino sobre la base viva al comenzar el mes. Necesitas, para cada mes del período, evaluar todas las suscripciones contra ese mes.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Genera el eje de meses con `generate_series(DATE '2024-06-01', DATE '2025-08-01', INTERVAL '1 month')`, haz `CROSS JOIN` con `subscriptions` y cuenta con `FILTER` (o `CASE`) dos condiciones distintas. Cuidado: `ended_on IS NULL` significa vigente, y toda comparación con `ended_on` necesita esa rama explícita.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nWITH meses AS (\n  SELECT g::date AS mes\n  FROM generate_series(DATE '___', DATE '___', INTERVAL '1 month') AS g\n)\nSELECT\n  m.mes,\n  count(*) FILTER (WHERE s.started_on ___ m.mes AND (s.ended_on ___ OR s.ended_on ___ m.mes)) AS activas_inicio,\n  count(*) FILTER (WHERE s.ended_on >= m.mes AND s.ended_on ___ (m.mes + INTERVAL '1 month')::date) AS bajas,\n  round(100.0 * ___ / nullif(___, 0), 2) AS churn_pct\nFROM meses AS m\n___ JOIN subscriptions AS s\nGROUP BY m.mes\nORDER BY m.mes;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "null_handling",
        description_md:
          "Escribir solo `s.ended_on >= m.mes` para la base activa: las suscripciones vigentes tienen `ended_on` nulo, la comparación devuelve NULL y quedan fuera del denominador. Falta la rama `s.ended_on IS NULL OR ...`.",
      },
      {
        category: "aggregation_level",
        description_md:
          "Dividir las bajas del mes por el total histórico de suscripciones: el churn queda diluido y baja mes a mes solo porque la tabla crece.",
      },
      {
        category: "date_boundary",
        description_md:
          "Acotar el mes con `ended_on <= (m.mes + INTERVAL '1 month')::date`: el primer día del mes siguiente se cuenta dos veces, como baja de este mes y del próximo.",
      },
      {
        category: "cell_values",
        description_md:
          "Dividir sin `nullif(activas_inicio, 0)`: si extiendes la serie hacia atrás, el primer mes sin base activa provoca un error de división por cero.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 15 filas, desde `2024-06-01` hasta `2025-08-01`. La base activa crece de 126 a 748 suscripciones y el churn baja de un promedio cercano al 8-9 % en el segundo semestre de 2024 (pico de 11,27 % en septiembre de 2024) a 4,81 % en agosto de 2025. Es la lectura que Finanzas busca: la base crece **y** se retiene mejor.\n\nEl patrón `CROSS JOIN` contra un calendario es el estándar para cualquier métrica de stock por período. Cada una de las 1289 suscripciones se evalúa contra cada uno de los 15 meses y se cuenta donde corresponde; son 19 335 combinaciones, nada para PostgreSQL. La alternativa sería un `LEFT JOIN` con condiciones en el `ON`, más difícil de leer y con el mismo costo.\n\nLa condición del denominador tiene dos partes y ambas importan: `started_on < m.mes` (ya había empezado antes de que el mes comenzara) y `(ended_on IS NULL OR ended_on >= m.mes)` (no había terminado todavía). La rama de nulos es la que más se olvida: 737 de las 1289 suscripciones están vigentes, así que sin ella el denominador se reduce a menos de la mitad y el churn se duplica.\n\nEl numerador usa un intervalo semiabierto, `>= m.mes` y `< mes + 1 month`, para que ninguna baja se cuente en dos meses. Con `<=` sobre el primer día del mes siguiente, una cancelación del 1 de julio aparecería como baja de junio y de julio.\n\n`FILTER` y `CASE WHEN ... THEN 1 ELSE 0 END` producen exactamente el mismo resultado; `FILTER` es estándar SQL desde 2003, se lee mejor y evita el `sum` sobre ceros. Si necesitaras además el churn de ingresos, cambiarías `count(*)` por `sum(s.amount_minor)` en ambos filtros: mismo esqueleto, otra pregunta, y casi siempre otra respuesta.",
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
  {
    slug: "retencion-del-mes-1-por-pais",
    section,
    title: "Retención del mes 1 por país",
    difficulty: "expert",
    estimated_minutes: 15,
    concepts: ["cte", "outer_join", "aggregate", "group_by", "date_functions", "order_by"],
    dataset,
    tables_used: ["users", "plays"],
    scenario_md:
      "El departamento de Expansión quiere decidir dónde invertir el presupuesto de marketing del próximo trimestre. Antes de traer más gente necesita saber en qué mercados la gente se queda, y para eso mira la retención del mes 1, es decir, qué proporción de cada cohorte volvió a escuchar en el mes calendario siguiente al de su alta. Te piden ese indicador abierto por país.",
    business_question_md:
      "Debes generar un dataset que tome a los oyentes cuya columna `signup_at` es anterior al `'2025-08-01'` en la zona horaria UTC, para que el mes siguiente al alta esté completamente observado en todos los casos. Una persona está retenida en el mes 1 si tuvo al menos una reproducción en el mes calendario inmediatamente posterior al de su alta, con los dos meses calculados en UTC. Devuelve el `country`, la cantidad bajo el encabezado `usuarios`, la cantidad de retenidos bajo el encabezado `retenidos_m1` y el porcentaje, redondeado a 2 decimales, bajo el encabezado `retencion_m1_pct`. Ordena por `retencion_m1_pct` descendente y, si dos países empatan, debes desempatar usando `country` ascendente.",
    learning_objective:
      "Comparar la retención del mes 1 entre segmentos usando un mes de vida fijo y una ventana de observación pareja.",
    theory_ref: matriz,
    expected_columns: [
      { name: "country", type: "text" },
      { name: "usuarios", type: "integer" },
      { name: "retenidos_m1", type: "integer" },
      { name: "retencion_m1_pct", type: "numeric" },
    ],
    validation_rules: {
      order_matters: true,
      numeric_tolerance: 0.001,
      required_concepts: ["cte"],
    },
    reference_solution: `WITH cohortes AS (
  SELECT
    id,
    country,
    date_trunc('month', signup_at AT TIME ZONE 'UTC')::date AS cohorte
  FROM users
  WHERE signup_at < timestamptz '2025-08-01 00:00:00+00'
),
activos_m1 AS (
  SELECT DISTINCT c.id
  FROM cohortes AS c
  INNER JOIN plays AS p ON p.user_id = c.id
  WHERE date_trunc('month', p.played_at AT TIME ZONE 'UTC')::date
        = (c.cohorte + INTERVAL '1 month')::date
)
SELECT
  c.country,
  count(*) AS usuarios,
  count(a.id) AS retenidos_m1,
  round(100.0 * count(a.id) / count(*), 2) AS retencion_m1_pct
FROM cohortes AS c
LEFT JOIN activos_m1 AS a ON a.id = c.id
GROUP BY c.country
ORDER BY 4 DESC, 1;`,
    alternative_solutions: [
      {
        label: "Índice de mes en lugar de suma de intervalo",
        sql: "WITH cohortes AS (SELECT id, country, date_trunc('month', signup_at AT TIME ZONE 'UTC')::date AS cohorte FROM users WHERE signup_at < timestamptz '2025-08-01 00:00:00+00'), activos_m1 AS (SELECT DISTINCT c.id FROM cohortes AS c INNER JOIN plays AS p ON p.user_id = c.id WHERE (12 * (date_part('year', date_trunc('month', p.played_at AT TIME ZONE 'UTC')::date) - date_part('year', c.cohorte)) + (date_part('month', date_trunc('month', p.played_at AT TIME ZONE 'UTC')::date) - date_part('month', c.cohorte)))::int = 1) SELECT c.country, count(*) AS usuarios, count(a.id) AS retenidos_m1, round(100.0 * count(a.id) / count(*), 2) AS retencion_m1_pct FROM cohortes AS c LEFT JOIN activos_m1 AS a ON a.id = c.id GROUP BY c.country ORDER BY 4 DESC, 1;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "«Mes 1» significa el mes calendario siguiente al del alta, y cada persona tiene el suyo. El país está en `users`, así que el agrupamiento final no es por cohorte sino por mercado.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Compara el mes de la reproducción con el mes de la cohorte más un mes: `date_trunc('month', p.played_at AT TIME ZONE 'UTC')::date = (c.cohorte + INTERVAL '1 month')::date`. El resto es el patrón conocido: cohorte completa, `LEFT JOIN` con los retenidos, `count(*)` contra `count(a.id)`.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nWITH cohortes AS (\n  SELECT id, country, date_trunc('month', signup_at AT TIME ZONE 'UTC')::date AS cohorte\n  FROM users\n  WHERE signup_at < timestamptz '___'\n),\nactivos_m1 AS (\n  SELECT DISTINCT c.id\n  FROM cohortes AS c\n  INNER JOIN plays AS p ON p.user_id = c.id\n  WHERE date_trunc('month', p.played_at AT TIME ZONE 'UTC')::date = (c.cohorte + ___)::date\n)\nSELECT\n  c.country,\n  count(*) AS usuarios,\n  count(___) AS retenidos_m1,\n  round(___, 2) AS retencion_m1_pct\nFROM cohortes AS c\n___ JOIN activos_m1 AS a ON a.id = c.id\nGROUP BY c.country\nORDER BY ___ DESC, 1;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "aggregation_level",
        description_md:
          "Agrupar por `country` y `cohorte` y después promediar los porcentajes: el promedio simple ignora que las cohortes tienen tamaños muy distintos. Aquí se pide una sola tasa por país, con todos los oyentes en el denominador.",
      },
      {
        category: "date_boundary",
        description_md:
          "Sumar 30 días en vez de un mes (`c.cohorte + INTERVAL '30 days'`): para los meses de 31 días el resultado cae en el mes equivocado y la comparación de igualdad no encuentra nada.",
      },
      {
        category: "missing_filter",
        description_md:
          "Incluir a quienes se registraron en agosto o septiembre de 2025: su mes 1 no terminó dentro de los datos, así que restan retención a los mercados donde más creció el alta reciente.",
      },
      {
        category: "join_condition",
        description_md:
          "Usar `INNER JOIN` con los retenidos: quienes nunca volvieron desaparecen del denominador y los seis países dan 100 %.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 6 filas. Chile encabeza con 78,32 % sobre 429 oyentes; siguen Colombia (77,17 %), Perú (76,70 %), Brasil (76,60 %), Argentina (76,00 %) y México (75,72 %) sobre 1153.\n\nLa conclusión honesta es que **no hay diferencia real entre mercados**: 2,6 puntos separan al primero del último, y con cohortes de 352 a 1153 personas ese rango entra cómodamente dentro del ruido estadístico. Un informe que titule «Chile retiene mejor» está sobreinterpretando. Lo valioso del resultado es lo contrario: la retención temprana de Ritmo es homogénea, así que la decisión de presupuesto debería tomarse con otra métrica (costo de adquisición, ingreso por oyente, tamaño del mercado).\n\nSobre la construcción, hay dos formas de decir «el mes siguiente». La suma de intervalo, `(c.cohorte + INTERVAL '1 month')::date`, es exacta porque `cohorte` siempre es el día 1 y PostgreSQL resuelve los meses de distinta duración. La otra es calcular el índice de mes y pedir `= 1`, como en la matriz; da lo mismo y se generaliza mejor si mañana quieren el mes 2 o el 3.\n\nEl recorte `signup_at < '2025-08-01'` deja fuera 495 oyentes de agosto y septiembre de 2025. Sin él, esos mercados que crecieron más rápido en el último trimestre aparecerían peor, porque buena parte de su gente todavía no tuvo un mes 1 completo. Comparar segmentos siempre exige igualar la ventana de observación antes de igualar cualquier otra cosa.\n\nEl `ORDER BY 4 DESC, 1` ordena por la cuarta columna y desempata por país: sin el segundo criterio, dos mercados con la misma tasa podrían intercambiarse entre ejecuciones y el informe dejaría de ser reproducible.",
    improvement_feedback: [
      { condition: "no_table_alias_in_join", message_key: "improve.no_table_alias_in_join" },
      { condition: "uses_select_star", message_key: "improve.uses_select_star" },
    ],
    reward: defaultReward("expert"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
];
