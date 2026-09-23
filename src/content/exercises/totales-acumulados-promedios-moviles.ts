import {
  defaultHintMeta,
  defaultReward,
  defaultSolutionUnlock,
  type ExerciseDef,
} from "../schemas/exercise";

const section = "totales-acumulados-promedios-moviles";
const dataset = { slug: "ritmo", version: 1 };
const acumulados = "acumulados-por-periodo";
const marcos = "marcos-rows-range";
const moviles = "promedios-moviles";

export const exercises: ExerciseDef[] = [
  {
    slug: "altas-acumuladas-por-mes",
    section,
    title: "Altas acumuladas por mes",
    difficulty: "intermediate",
    estimated_minutes: 8,
    concepts: ["window_function", "cte", "group_by", "aggregate", "date_functions"],
    dataset,
    tables_used: ["users"],
    scenario_md:
      "En **Ritmo**, Crecimiento prepara la lámina de apertura del comité mensual: la curva de oyentes registrados desde que abrió el servicio. Quiere ver el alta de cada mes y el total acumulado hasta ese mes.",
    business_question_md:
      "A partir de `users`, devuelve una fila por mes de alta: `mes` (primer día del mes de `signup_at`, calculado en UTC, como `date`), `altas` (oyentes registrados en ese mes) y `altas_acumuladas` (total de altas desde el primer mes hasta ese mes inclusive), ordenado por `mes` ascendente.",
    learning_objective:
      "Calcular un total acumulado con sum() OVER (ORDER BY período) sobre una serie ya agregada.",
    theory_ref: acumulados,
    expected_columns: [
      { name: "mes", type: "date" },
      { name: "altas", type: "integer" },
      { name: "altas_acumuladas", type: "integer" },
    ],
    validation_rules: { order_matters: true, required_concepts: ["window_function"] },
    reference_solution:
      "WITH altas_por_mes AS (\n  SELECT\n    date_trunc('month', signup_at AT TIME ZONE 'UTC')::date AS mes,\n    count(*) AS altas\n  FROM users\n  GROUP BY 1\n)\nSELECT\n  mes,\n  altas,\n  sum(altas) OVER (ORDER BY mes) AS altas_acumuladas\nFROM altas_por_mes\nORDER BY mes;",
    alternative_solutions: [
      {
        label: "Marco explícito",
        sql: "WITH altas_por_mes AS (SELECT date_trunc('month', signup_at AT TIME ZONE 'UTC')::date AS mes, count(*) AS altas FROM users GROUP BY 1) SELECT mes, altas, sum(altas) OVER (ORDER BY mes ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS altas_acumuladas FROM altas_por_mes ORDER BY mes;",
      },
      {
        label: "Subconsulta en lugar de CTE",
        sql: "SELECT mes, altas, sum(altas) OVER (ORDER BY mes) AS altas_acumuladas FROM (SELECT date_trunc('month', signup_at AT TIME ZONE 'UTC')::date AS mes, count(*) AS altas FROM users GROUP BY 1) AS altas_por_mes ORDER BY mes;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Son dos pasos: primero una fila por mes con su cantidad de altas, después el acumulado sobre esa serie. Una CTE separa los dos pasos con claridad.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "El mes sale de `date_trunc('month', signup_at AT TIME ZONE 'UTC')::date`. El acumulado es una función de ventana que suma la columna ya agregada ordenando por mes.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nWITH altas_por_mes AS (\n  SELECT\n    date_trunc('___', signup_at AT TIME ZONE 'UTC')::date AS mes,\n    count(*) AS altas\n  FROM users\n  GROUP BY 1\n)\nSELECT\n  mes,\n  altas,\n  sum(altas) OVER (___ ___ mes) AS altas_acumuladas\nFROM altas_por_mes\nORDER BY mes;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "cell_values",
        description_md:
          "Escribir `sum(altas) OVER ()` sin `ORDER BY`: cada fila muestra 5000, el total, en vez del acumulado.",
      },
      {
        category: "aggregation_level",
        description_md:
          "Intentar `sum(count(*)) OVER (ORDER BY mes)` sin la CTE: el `ORDER BY` de la ventana debe referirse a la misma expresión agrupada, y la consulta se vuelve frágil.",
      },
      {
        category: "date_boundary",
        description_md:
          "Agrupar por `signup_at` sin truncar al mes: obtienes una fila por instante de alta, no una por mes.",
      },
      {
        category: "wrong_order",
        description_md:
          "Ordenar el resultado por `altas` en vez de por `mes`: la curva deja de leerse cronológicamente.",
      },
    ],
    expert_explanation_md:
      "21 filas, de `2024-01-01` a `2025-09-01`. La última fila vale 5000: el acumulado cierra con el total de oyentes de la tabla, una verificación rápida de que la ventana está bien construida.\n\nEl patrón es siempre el mismo: agregar por período en una CTE y acumular afuera. Podrías hacerlo en un solo nivel repitiendo la expresión `date_trunc(...)` dentro del `ORDER BY` de la ventana, pero la CTE se lee mejor y evita duplicar lógica.\n\nEl último mes (septiembre de 2025) tiene menos altas porque el dataset termina el día 15: en un informe real conviene marcar los períodos incompletos para que nadie los lea como una caída.\n\nAlternativa: `sum(altas) OVER (ORDER BY mes ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)` da lo mismo y deja explícito el marco.",
    reward: defaultReward("intermediate"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "reproducciones-acumuladas-de-agosto",
    section,
    title: "Reproducciones acumuladas de agosto",
    difficulty: "intermediate",
    estimated_minutes: 8,
    concepts: ["window_function", "cte", "group_by", "aggregate", "where"],
    dataset,
    tables_used: ["plays"],
    scenario_md:
      "El equipo de Contenido sigue día a día cuánto se escucha Ritmo y quiere saber, en cualquier momento del mes, cuántas reproducciones lleva acumuladas agosto de 2025.",
    business_question_md:
      "Para las reproducciones de agosto de 2025 (del 1 al 31 inclusive, en UTC), devuelve `dia` (fecha de `played_at` en UTC, como `date`), `reproducciones` (cantidad de ese día) y `acumulado_mes` (total del mes hasta ese día inclusive), ordenado por `dia` ascendente.",
    learning_objective:
      "Construir un acumulado diario dentro de un período acotado y entender que el WHERE delimita lo que la ventana puede ver.",
    theory_ref: acumulados,
    expected_columns: [
      { name: "dia", type: "date" },
      { name: "reproducciones", type: "integer" },
      { name: "acumulado_mes", type: "integer" },
    ],
    validation_rules: { order_matters: true, required_concepts: ["window_function"] },
    reference_solution:
      "WITH diario AS (\n  SELECT\n    (played_at AT TIME ZONE 'UTC')::date AS dia,\n    count(*) AS reproducciones\n  FROM plays\n  WHERE played_at >= timestamptz '2025-08-01 00:00:00+00'\n    AND played_at < timestamptz '2025-09-01 00:00:00+00'\n  GROUP BY 1\n)\nSELECT\n  dia,\n  reproducciones,\n  sum(reproducciones) OVER (ORDER BY dia) AS acumulado_mes\nFROM diario\nORDER BY dia;",
    alternative_solutions: [
      {
        label: "Marco explícito con ROWS",
        sql: "WITH diario AS (SELECT (played_at AT TIME ZONE 'UTC')::date AS dia, count(*) AS reproducciones FROM plays WHERE played_at >= timestamptz '2025-08-01 00:00:00+00' AND played_at < timestamptz '2025-09-01 00:00:00+00' GROUP BY 1) SELECT dia, reproducciones, sum(reproducciones) OVER (ORDER BY dia ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS acumulado_mes FROM diario ORDER BY dia;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Primero la serie diaria con `GROUP BY`; después el acumulado con una ventana ordenada por día.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Delimita el mes con `played_at >= timestamptz '2025-08-01 00:00:00+00' AND played_at < timestamptz '2025-09-01 00:00:00+00'`: el límite superior abierto evita perder las reproducciones del 31 por la noche.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nWITH diario AS (\n  SELECT\n    (played_at AT TIME ZONE '___')::date AS dia,\n    count(*) AS reproducciones\n  FROM plays\n  WHERE played_at >= timestamptz '2025-08-01 00:00:00+00'\n    AND played_at < timestamptz '2025-09-01 00:00:00+00'\n  GROUP BY 1\n)\nSELECT\n  dia,\n  reproducciones,\n  ___(reproducciones) OVER (ORDER BY ___) AS acumulado_mes\nFROM diario\nORDER BY dia;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "date_boundary",
        description_md:
          "Usar `played_at BETWEEN '2025-08-01' AND '2025-08-31'`: con marcas de tiempo, el límite superior corta a las 00:00 y se pierde casi todo el día 31.",
      },
      {
        category: "cell_values",
        description_md:
          "Omitir el `ORDER BY` dentro de `OVER`: las 31 filas muestran el total del mes.",
      },
      {
        category: "missing_filter",
        description_md:
          "No filtrar el mes y acumular toda la historia: los valores de agosto quedan inflados con los 19 meses anteriores.",
      },
      {
        category: "aggregation_level",
        description_md:
          "Acumular sobre las filas de `plays` sin agregarlas antes por día: el resultado tiene 11 024 filas en vez de 31.",
      },
    ],
    expert_explanation_md:
      "31 filas. El acumulado cierra el 31 de agosto en 11 024 reproducciones, que es el total del mes; los días individuales van de 296 a 438.\n\nEl `WHERE` actúa **antes** que la ventana, así que el acumulado arranca en cero el 1 de agosto: es exactamente lo que pide el negocio («cuánto lleva el mes»). Si quisieras el acumulado histórico, tendrías que calcular la ventana sobre toda la serie y filtrar agosto después, en un nivel externo.\n\nEsa decisión —filtrar antes o después de la ventana— es la que separa un acumulado del mes de un acumulado de la historia, y no se nota mirando el SQL por encima: hay que leer dónde está el filtro.",
    reward: defaultReward("intermediate"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "media-movil-de-siete-dias",
    section,
    title: "Media móvil de siete días",
    difficulty: "advanced",
    estimated_minutes: 12,
    concepts: ["window_function", "cte", "group_by", "aggregate", "numeric_functions"],
    dataset,
    tables_used: ["plays"],
    scenario_md:
      "Producto publica un tablero con la tendencia de escucha. La serie diaria salta mucho entre semana y fin de semana, así que piden suavizarla con una media móvil de 7 días. El tablero muestra desde el 1 de agosto de 2025, pero el primer día ya tiene que traer una media completa de siete días reales.",
    business_question_md:
      "Devuelve `dia` (fecha de `played_at` en UTC, como `date`), `reproducciones` (cantidad de ese día) y `media_7d` (promedio de las reproducciones de ese día y los seis días anteriores, redondeado a 2 decimales), para los días desde el `2025-08-01` en adelante, ordenado por `dia` ascendente. La media del 1 de agosto debe incluir los últimos días de julio.",
    learning_objective:
      "Definir un marco ROWS BETWEEN N PRECEDING AND CURRENT ROW y filtrar el período después de calcular la ventana.",
    theory_ref: moviles,
    expected_columns: [
      { name: "dia", type: "date" },
      { name: "reproducciones", type: "integer" },
      { name: "media_7d", type: "numeric" },
    ],
    validation_rules: {
      order_matters: true,
      numeric_tolerance: 0.001,
      required_concepts: ["window_function"],
    },
    reference_solution:
      "WITH diario AS (\n  SELECT\n    (played_at AT TIME ZONE 'UTC')::date AS dia,\n    count(*) AS reproducciones\n  FROM plays\n  WHERE played_at >= timestamptz '2025-07-01 00:00:00+00'\n  GROUP BY 1\n),\ncon_media AS (\n  SELECT\n    dia,\n    reproducciones,\n    round(avg(reproducciones) OVER (\n      ORDER BY dia\n      ROWS BETWEEN 6 PRECEDING AND CURRENT ROW\n    ), 2) AS media_7d\n  FROM diario\n)\nSELECT dia, reproducciones, media_7d\nFROM con_media\nWHERE dia >= DATE '2025-08-01'\nORDER BY dia;",
    hints: [
      {
        level: 1,
        body_md:
          "El marco por omisión acumula desde el principio de la serie. Para una media móvil tienes que declarar el marco tú.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "«Siete días incluido el actual» son seis filas anteriores más la actual. Y como el `WHERE` se evalúa antes que la ventana, la serie que alimenta el cálculo tiene que empezar en julio; el recorte a agosto va en un nivel posterior.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nWITH diario AS (\n  SELECT (played_at AT TIME ZONE 'UTC')::date AS dia, count(*) AS reproducciones\n  FROM plays\n  WHERE played_at >= timestamptz '2025-07-01 00:00:00+00'\n  GROUP BY 1\n),\ncon_media AS (\n  SELECT\n    dia,\n    reproducciones,\n    round(avg(reproducciones) OVER (\n      ORDER BY dia\n      ROWS BETWEEN ___ PRECEDING AND ___ ROW\n    ), 2) AS media_7d\n  FROM diario\n)\nSELECT dia, reproducciones, media_7d\nFROM con_media\nWHERE dia >= DATE '___'\nORDER BY dia;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "cell_values",
        description_md: "`ROWS BETWEEN 7 PRECEDING AND CURRENT ROW`: es una ventana de ocho días.",
      },
      {
        category: "cell_values",
        description_md:
          "Omitir el marco: `avg(...) OVER (ORDER BY dia)` devuelve el promedio acumulado desde el inicio, que se aplana con el tiempo y no es una media móvil.",
      },
      {
        category: "date_boundary",
        description_md:
          "Filtrar agosto en el `WHERE` de la CTE: los primeros seis días promedian menos de siete valores porque la ventana no ve julio.",
      },
      {
        category: "wrong_columns",
        description_md: "Devolver la media sin redondear: se pide `media_7d` con 2 decimales.",
      },
    ],
    expert_explanation_md:
      "46 filas, del 1 de agosto al 15 de septiembre de 2025. El 1 de agosto la media vale 349.00 y ya está calculada sobre siete días completos, porque la CTE arranca el 1 de julio.\n\nLa estructura tiene tres niveles y cada uno hace una sola cosa: `diario` agrega, `con_media` calcula la ventana, la consulta externa recorta el período. Ese orden es obligatorio: `WHERE` corre antes que las ventanas, así que no hay forma de filtrar y suavizar en el mismo nivel.\n\nMira la última fila: el 15 de septiembre registra 182 reproducciones contra ~400 los días previos, porque el dataset termina a mediodía. La media móvil amortigua ese corte pero no lo elimina; en un tablero real, el último día siempre se marca como parcial.\n\nSi quisieras una media centrada, el marco sería `ROWS BETWEEN 3 PRECEDING AND 3 FOLLOWING`: sigue mejor la curva, pero usa días futuros y no sirve para un tablero en vivo.",
    reward: defaultReward("advanced"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "acumulado-de-reproducciones-por-pais",
    section,
    title: "Acumulado de reproducciones por país",
    difficulty: "advanced",
    estimated_minutes: 11,
    concepts: ["window_function", "cte", "inner_join", "group_by", "aggregate"],
    dataset,
    tables_used: ["plays", "users"],
    scenario_md:
      "Expansión compara cómo evolucionan los seis mercados de Ritmo durante 2025. Cada país necesita su propia curva acumulada, que arranca de cero, para poder ponerlas una al lado de la otra.",
    business_question_md:
      "Para las reproducciones desde el `2025-01-01` (en UTC), devuelve `country` (país del oyente), `mes` (primer día del mes de `played_at` en UTC, como `date`), `reproducciones` (cantidad de ese país en ese mes) y `acumulado` (total de ese país desde enero hasta ese mes inclusive), ordenado por `country` y luego `mes` ascendente.",
    learning_objective: "Reiniciar un total acumulado por grupo con PARTITION BY + ORDER BY.",
    theory_ref: acumulados,
    expected_columns: [
      { name: "country", type: "text" },
      { name: "mes", type: "date" },
      { name: "reproducciones", type: "integer" },
      { name: "acumulado", type: "integer" },
    ],
    validation_rules: {
      order_matters: true,
      required_concepts: ["window_function", "inner_join"],
    },
    reference_solution:
      "WITH mensual AS (\n  SELECT\n    u.country,\n    date_trunc('month', p.played_at AT TIME ZONE 'UTC')::date AS mes,\n    count(*) AS reproducciones\n  FROM plays AS p\n  INNER JOIN users AS u ON u.id = p.user_id\n  WHERE p.played_at >= timestamptz '2025-01-01 00:00:00+00'\n  GROUP BY 1, 2\n)\nSELECT\n  country,\n  mes,\n  reproducciones,\n  sum(reproducciones) OVER (PARTITION BY country ORDER BY mes) AS acumulado\nFROM mensual\nORDER BY country, mes;",
    hints: [
      {
        level: 1,
        body_md:
          "Cada país necesita su propia curva: eso es una partición. El avance mes a mes sigue siendo el `ORDER BY` de la ventana.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "El país vive en `users`, así que une `plays` con `users` por `user_id`. Agrupa por país y mes en la CTE y acumula afuera con `PARTITION BY country ORDER BY mes`.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nWITH mensual AS (\n  SELECT\n    u.country,\n    date_trunc('month', p.played_at AT TIME ZONE 'UTC')::date AS mes,\n    count(*) AS reproducciones\n  FROM plays AS p\n  INNER JOIN users AS u ON u.id = p.___\n  WHERE p.played_at >= timestamptz '2025-01-01 00:00:00+00'\n  GROUP BY 1, 2\n)\nSELECT\n  country,\n  mes,\n  reproducciones,\n  sum(reproducciones) OVER (___ ___ country ORDER BY ___) AS acumulado\nFROM mensual\nORDER BY country, mes;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "cell_values",
        description_md:
          "Olvidar `PARTITION BY country`: la curva se acumula atravesando países y el primer mes de Brasil arranca donde terminó Argentina.",
      },
      {
        category: "cell_values",
        description_md:
          "Escribir `PARTITION BY mes`: el acumulado nunca avanza porque cada partición tiene una sola fila por país.",
      },
      {
        category: "join_condition",
        description_md:
          "Unir por una columna equivocada (por ejemplo `u.id = p.id`): el país deja de corresponder al oyente que escuchó.",
      },
      {
        category: "aggregation_level",
        description_md:
          "Agrupar solo por mes y luego particionar por país: el país no está en el `GROUP BY` y la consulta ni siquiera compila.",
      },
    ],
    expert_explanation_md:
      "54 filas: seis países por nueve meses. México cierra septiembre con 19 944 reproducciones acumuladas y Perú con 5547; ordenadas por país y mes, las seis curvas se leen como seis series independientes.\n\n`PARTITION BY` define **dónde** se reinicia el acumulado y `ORDER BY` define **cómo** avanza. Confundirlos es el error más caro de esta sección: sin partición obtienes una curva sin sentido que mezcla mercados; particionando por el período obtienes la métrica original repetida.\n\nEl `INNER JOIN` con `users` no pierde filas porque toda reproducción tiene oyente, pero conviene saberlo: si la clave pudiera faltar, un `LEFT JOIN` dejaría un grupo con `country` nulo que también acumularía.\n\nPara comparar mercados de tamaños muy distintos, el paso siguiente habitual es dividir el acumulado de cada país por su total (`sum(reproducciones) OVER (PARTITION BY country)`) y graficar porcentajes.",
    reward: defaultReward("advanced"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "curva-de-pareto-de-artistas",
    section,
    title: "Curva de Pareto de artistas",
    difficulty: "advanced",
    estimated_minutes: 13,
    concepts: ["window_function", "cte", "inner_join", "group_by", "numeric_functions"],
    dataset,
    tables_used: ["plays", "tracks", "albums", "artists"],
    scenario_md:
      "Contenido negocia con los sellos y necesita un argumento: cuántos artistas concentran la mayor parte de la escucha. La herramienta clásica es la curva de participación acumulada, ordenando de más a menos escuchado.",
    business_question_md:
      "Para las reproducciones desde el `2025-01-01` (en UTC), devuelve `artista` (`artists.name`), `reproducciones` (cantidad del artista) y `pct_acumulado` (porcentaje acumulado sobre el total de todas las reproducciones del período, redondeado a 2 decimales), ordenado por `reproducciones` descendente y, ante empates, por `artista` ascendente. El acumulado debe seguir ese mismo orden.",
    learning_objective:
      "Combinar un acumulado ordenado por la métrica con un total general OVER () para obtener participación acumulada.",
    theory_ref: acumulados,
    expected_columns: [
      { name: "artista", type: "text" },
      { name: "reproducciones", type: "integer" },
      { name: "pct_acumulado", type: "numeric" },
    ],
    validation_rules: {
      order_matters: true,
      numeric_tolerance: 0.001,
      required_concepts: ["window_function", "inner_join"],
    },
    reference_solution:
      "WITH por_artista AS (\n  SELECT\n    ar.name AS artista,\n    count(*) AS reproducciones\n  FROM plays AS p\n  INNER JOIN tracks AS t ON t.id = p.track_id\n  INNER JOIN albums AS al ON al.id = t.album_id\n  INNER JOIN artists AS ar ON ar.id = al.artist_id\n  WHERE p.played_at >= timestamptz '2025-01-01 00:00:00+00'\n  GROUP BY 1\n)\nSELECT\n  artista,\n  reproducciones,\n  round(\n    100.0 * sum(reproducciones) OVER (ORDER BY reproducciones DESC, artista)\n    / sum(reproducciones) OVER (),\n    2\n  ) AS pct_acumulado\nFROM por_artista\nORDER BY reproducciones DESC, artista;",
    hints: [
      {
        level: 1,
        body_md:
          "Necesitas dos ventanas sobre la misma serie: una que acumule en el orden del ranking y otra que dé el total general.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "El artista está a tres joins de `plays`: `tracks` → `albums` → `artists`. El denominador es `sum(reproducciones) OVER ()`, sin `ORDER BY`; el numerador, `sum(reproducciones) OVER (ORDER BY reproducciones DESC, artista)`.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nWITH por_artista AS (\n  SELECT ar.name AS artista, count(*) AS reproducciones\n  FROM plays AS p\n  INNER JOIN tracks AS t ON t.id = p.track_id\n  INNER JOIN albums AS al ON al.id = t.___\n  INNER JOIN artists AS ar ON ar.id = al.artist_id\n  WHERE p.played_at >= timestamptz '2025-01-01 00:00:00+00'\n  GROUP BY 1\n)\nSELECT\n  artista,\n  reproducciones,\n  round(\n    100.0 * sum(reproducciones) OVER (ORDER BY reproducciones ___, artista)\n    / sum(reproducciones) OVER (___),\n    2\n  ) AS pct_acumulado\nFROM por_artista\nORDER BY reproducciones DESC, artista;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "cell_values",
        description_md:
          "Poner `ORDER BY` en el denominador: entonces el cociente vale 100 % en todas las filas, porque numerador y denominador acumulan igual.",
      },
      {
        category: "wrong_order",
        description_md:
          "Acumular en orden ascendente: la curva de Pareto se construye de mayor a menor.",
      },
      {
        category: "duplicates",
        description_md:
          "No desempatar con `artista`: dos artistas con la misma cantidad reciben un orden arbitrario y el resultado deja de ser reproducible.",
      },
      {
        category: "cell_values",
        description_md:
          "Dividir enteros entre enteros: `sum / sum` con bigint trunca a 0. Multiplicar por `100.0` fuerza aritmética decimal.",
      },
    ],
    expert_explanation_md:
      "320 filas. El artista número 25 de la lista cruza el 50 %: una cuarta parte de un 8 % del catálogo explica la mitad de la escucha, la cola larga clásica de un servicio de streaming.\n\nLas dos ventanas comparten la serie pero no el marco. La del numerador tiene `ORDER BY`, así que su marco por omisión va del inicio a la fila actual; la del denominador no lo tiene, así que abarca toda la partición (aquí, todo el resultado). Esa asimetría es justo lo que produce el porcentaje acumulado.\n\n`100.0 *` no es cosmético: sin él, `sum(...) / sum(...)` entre enteros hace división entera y todas las filas salen en 0. Es uno de los errores más difíciles de detectar porque la consulta corre sin quejarse.\n\nCon la columna `pct_acumulado` ya calculada, filtrar `WHERE pct_acumulado <= 50` en un nivel externo te da directamente el grupo de artistas que sostiene la mitad del negocio.",
    reward: defaultReward("advanced"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "acumulado-al-cierre-del-dia",
    section,
    title: "Acumulado al cierre del día",
    difficulty: "advanced",
    estimated_minutes: 11,
    concepts: ["window_function", "cte", "where", "order_by"],
    dataset,
    tables_used: ["plays"],
    scenario_md:
      "Soporte reconstruye la actividad del oyente **3887** durante agosto de 2025 para responder un reclamo. Quiere ver cada reproducción con dos cifras del día: cuántas hizo ese día y cuántas lleva acumuladas **al cierre** de ese día, de modo que todas las reproducciones de una misma jornada muestren el mismo acumulado.",
    business_question_md:
      "Para las reproducciones de `user_id = 3887` en agosto de 2025 (en UTC), devuelve `id`, `dia` (fecha de `played_at` en UTC, como `date`), `reproducciones_del_dia` (cantidad de esa jornada) y `acumulado_al_cierre` (cantidad total desde el 1 de agosto hasta el final de esa jornada), ordenado por `dia` y luego `id` ascendente.",
    learning_objective:
      "Aprovechar el marco RANGE por omisión para que las filas con la misma clave de orden compartan el valor acumulado.",
    theory_ref: marcos,
    expected_columns: [
      { name: "id", type: "integer" },
      { name: "dia", type: "date" },
      { name: "reproducciones_del_dia", type: "integer" },
      { name: "acumulado_al_cierre", type: "integer" },
    ],
    validation_rules: { order_matters: true, required_concepts: ["window_function"] },
    reference_solution:
      "WITH del_mes AS (\n  SELECT\n    id,\n    (played_at AT TIME ZONE 'UTC')::date AS dia\n  FROM plays\n  WHERE user_id = 3887\n    AND played_at >= timestamptz '2025-08-01 00:00:00+00'\n    AND played_at < timestamptz '2025-09-01 00:00:00+00'\n)\nSELECT\n  id,\n  dia,\n  count(*) OVER (PARTITION BY dia) AS reproducciones_del_dia,\n  count(*) OVER (ORDER BY dia) AS acumulado_al_cierre\nFROM del_mes\nORDER BY dia, id;",
    alternative_solutions: [
      {
        label: "Marco RANGE explícito",
        sql: "WITH del_mes AS (SELECT id, (played_at AT TIME ZONE 'UTC')::date AS dia FROM plays WHERE user_id = 3887 AND played_at >= timestamptz '2025-08-01 00:00:00+00' AND played_at < timestamptz '2025-09-01 00:00:00+00') SELECT id, dia, count(*) OVER (PARTITION BY dia) AS reproducciones_del_dia, count(*) OVER (ORDER BY dia RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS acumulado_al_cierre FROM del_mes ORDER BY dia, id;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Aquí hay varias filas por día. El modo del marco decide si las filas empatadas comparten el acumulado o si cada una avanza de a una.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "El marco por omisión cuando hay `ORDER BY` es `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`, y con `RANGE` la fila actual incluye a todas sus empatadas. Para la cifra del día, una ventana con `PARTITION BY dia` y sin `ORDER BY`.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nWITH del_mes AS (\n  SELECT id, (played_at AT TIME ZONE 'UTC')::date AS dia\n  FROM plays\n  WHERE user_id = ___\n    AND played_at >= timestamptz '2025-08-01 00:00:00+00'\n    AND played_at < timestamptz '2025-09-01 00:00:00+00'\n)\nSELECT\n  id,\n  dia,\n  count(*) OVER (___ ___ dia) AS reproducciones_del_dia,\n  count(*) OVER (___ ___ dia) AS acumulado_al_cierre\nFROM del_mes\nORDER BY dia, id;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "cell_values",
        description_md:
          "Usar `ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`: el acumulado avanza fila por fila (1, 2, 3…) y las reproducciones del mismo día dejan de compartir valor.",
      },
      {
        category: "cell_values",
        description_md:
          "Agregar `id` al `ORDER BY` de la ventana del acumulado: rompe los empates y el resultado vuelve a ser un contador por fila.",
      },
      {
        category: "cell_values",
        description_md:
          "Poner `ORDER BY dia` también en la ventana de `reproducciones_del_dia`: ahí no se quiere un acumulado sino el total de la partición.",
      },
      {
        category: "date_boundary",
        description_md:
          "Cortar el mes con `<= '2025-08-31'`: se pierden las reproducciones posteriores a la medianoche del 31.",
      },
    ],
    expert_explanation_md:
      "51 filas en 25 jornadas. El 2 de agosto hay cuatro reproducciones y las cuatro muestran `acumulado_al_cierre = 4`: con `RANGE`, «la fila actual» significa «todas las filas cuyo día es igual al mío», así que las empatadas comparten marco.\n\nEs el mismo `count(*) OVER (ORDER BY dia)` que en otros ejercicios devolvía un acumulado limpio; la diferencia es que allí la clave de orden era única. Cuando hay empates, el modo del marco deja de ser un detalle: `ROWS` habría dado 1, 2, 3, 4 y el reclamo se habría respondido con otra cifra.\n\nLas dos ventanas del `SELECT` son distintas a propósito: `PARTITION BY dia` sin `ORDER BY` abarca toda la jornada (marco = partición completa); `ORDER BY dia` sin partición abarca desde el inicio del mes hasta el cierre del día.\n\nRegla que conviene automatizar: antes de escribir un acumulado, pregúntate si la clave de orden es única. Si lo es, `ROWS` y `RANGE` coinciden y `ROWS` es preferible; si no lo es, elige el modo de forma explícita y documéntalo.",
    reward: defaultReward("advanced"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "desafio-media-movil-con-dias-sin-datos",
    section,
    title: "Desafío: media móvil con días sin datos",
    difficulty: "advanced",
    estimated_minutes: 16,
    concepts: [
      "window_function",
      "cte",
      "outer_join",
      "null_handling",
      "group_by",
      "date_functions",
    ],
    dataset,
    tables_used: ["plays", "tracks", "albums"],
    scenario_md:
      "El equipo de Artistas prepara el informe de **Sierra y Ceibo** (`artists.id = 247`), un proyecto emergente que algunos días no suena. Un análisis anterior calculó su media móvil de 7 días con `ROWS BETWEEN 6 PRECEDING` sobre los días con reproducciones y quedó inflada: esas «siete filas» abarcaban semanas. El informe necesita una media diaria honesta, contando los días sin escuchas como cero.",
    business_question_md:
      "Devuelve una fila por día entre el `2025-08-01` y el `2025-09-15` inclusive (todos los días, haya habido reproducciones o no): `dia` (`date`), `reproducciones` (reproducciones de canciones del artista 247 ese día, 0 si no hubo) y `media_7d` (promedio de ese día y los seis días calendario anteriores, redondeado a 2 decimales). La media del 1 de agosto debe incluir los últimos días de julio. Ordena por `dia` ascendente.",
    learning_objective:
      "Rellenar los períodos faltantes con un calendario antes de aplicar un marco ROWS, para que la ventana sea temporalmente correcta.",
    theory_ref: moviles,
    expected_columns: [
      { name: "dia", type: "date" },
      { name: "reproducciones", type: "integer" },
      { name: "media_7d", type: "numeric" },
    ],
    validation_rules: {
      order_matters: true,
      numeric_tolerance: 0.001,
      required_concepts: ["window_function", "outer_join"],
    },
    reference_solution:
      "WITH calendario AS (\n  SELECT generate_series(DATE '2025-07-01', DATE '2025-09-15', INTERVAL '1 day')::date AS dia\n),\ndel_artista AS (\n  SELECT\n    (p.played_at AT TIME ZONE 'UTC')::date AS dia,\n    count(*) AS reproducciones\n  FROM plays AS p\n  INNER JOIN tracks AS t ON t.id = p.track_id\n  INNER JOIN albums AS al ON al.id = t.album_id\n  WHERE al.artist_id = 247\n    AND p.played_at >= timestamptz '2025-07-01 00:00:00+00'\n  GROUP BY 1\n),\nserie AS (\n  SELECT\n    c.dia,\n    coalesce(a.reproducciones, 0) AS reproducciones\n  FROM calendario AS c\n  LEFT JOIN del_artista AS a ON a.dia = c.dia\n),\ncon_media AS (\n  SELECT\n    dia,\n    reproducciones,\n    round(avg(reproducciones) OVER (\n      ORDER BY dia\n      ROWS BETWEEN 6 PRECEDING AND CURRENT ROW\n    ), 2) AS media_7d\n  FROM serie\n)\nSELECT dia, reproducciones, media_7d\nFROM con_media\nWHERE dia >= DATE '2025-08-01'\nORDER BY dia;",
    hints: [
      {
        level: 1,
        body_md:
          "Si un día no tiene filas, la ventana no puede verlo. Antes de calcular nada, la serie tiene que tener **todos** los días del período.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "`generate_series(DATE '2025-07-01', DATE '2025-09-15', INTERVAL '1 day')::date` genera el calendario; únelo con `LEFT JOIN` a las reproducciones diarias del artista y usa `coalesce(..., 0)`. El artista se alcanza por `tracks` → `albums.artist_id`. Empieza el calendario en julio y recorta a agosto al final.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nWITH calendario AS (\n  SELECT generate_series(DATE '2025-07-01', DATE '2025-09-15', INTERVAL '1 day')::date AS dia\n),\ndel_artista AS (\n  SELECT (p.played_at AT TIME ZONE 'UTC')::date AS dia, count(*) AS reproducciones\n  FROM plays AS p\n  INNER JOIN tracks AS t ON t.id = p.track_id\n  INNER JOIN albums AS al ON al.id = t.album_id\n  WHERE al.artist_id = ___\n    AND p.played_at >= timestamptz '2025-07-01 00:00:00+00'\n  GROUP BY 1\n),\nserie AS (\n  SELECT c.dia, ___(a.reproducciones, 0) AS reproducciones\n  FROM calendario AS c\n  ___ JOIN del_artista AS a ON a.dia = c.dia\n),\ncon_media AS (\n  SELECT dia, reproducciones,\n    round(avg(reproducciones) OVER (ORDER BY dia ROWS BETWEEN ___ PRECEDING AND CURRENT ROW), 2) AS media_7d\n  FROM serie\n)\nSELECT dia, reproducciones, media_7d\nFROM con_media\nWHERE dia >= DATE '___'\nORDER BY dia;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "null_handling",
        description_md:
          "Dejar `NULL` en los días sin reproducciones en vez de `coalesce(..., 0)`: `avg` ignora los NULL y la media vuelve a ser el promedio de los días con actividad.",
      },
      {
        category: "join_condition",
        description_md:
          "Usar `INNER JOIN` con el calendario: los días vacíos desaparecen y el relleno no sirve de nada.",
      },
      {
        category: "date_boundary",
        description_md:
          "Generar el calendario desde el 1 de agosto: los primeros seis días quedan con una media incompleta.",
      },
      {
        category: "cell_values",
        description_md:
          "Calcular la media sobre la serie sin rellenar: «siete filas» no son «siete días» cuando faltan jornadas.",
      },
    ],
    expert_explanation_md:
      "46 filas, una por día calendario. Muchas traen `reproducciones = 0`, y ahí está el punto: esos ceros entran en el promedio y bajan la media, que es la lectura correcta de «cuánto suena por día este artista».\n\nEl orden de los cuatro pasos no es negociable: generar el calendario, agregar los hechos, unir con `LEFT JOIN` + `coalesce`, y recién entonces aplicar la ventana. Si el relleno ocurriera después del cálculo, ya sería tarde.\n\nHay una alternativa más corta que no necesita calendario: `RANGE BETWEEN INTERVAL '6 days' PRECEDING AND CURRENT ROW`, un marco definido por tiempo y no por filas. Devuelve el promedio **de los días con actividad** dentro de esos siete días, que es otra métrica igual de legítima; el editor de esta plataforma todavía no acepta esa sintaxis, pero conviene tenerla presente para tu trabajo diario.\n\nDecide siempre cuál de las dos pide el negocio: «promedio diario del período» (con ceros) o «promedio de los días en que sonó» (sin ceros). La diferencia entre ambas, en un artista intermitente, puede ser de varias veces.",
    reward: defaultReward("advanced"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
];
