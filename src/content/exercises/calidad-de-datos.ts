import {
  defaultHintMeta,
  defaultReward,
  defaultSolutionUnlock,
  type ExerciseDef,
} from "../schemas/exercise";

const section = "calidad-de-datos";
const ritmo = { slug: "ritmo", version: 1 };
const pidelo = { slug: "pidelo", version: 1 };

export const exercises: ExerciseDef[] = [
  {
    slug: "perfil-inicial-de-reproducciones",
    section,
    title: "Perfil inicial de la tabla de reproducciones",
    difficulty: "intermediate",
    estimated_minutes: 8,
    concepts: ["select", "aggregate", "alias", "date_functions"],
    dataset: ritmo,
    tables_used: ["plays"],
    scenario_md:
      "Es tu primer día en el equipo de datos de **Ritmo**. Te dan acceso a `plays`, la tabla de reproducciones, y te piden un reporte de escucha «para mañana». Antes de calcular nada, necesitas saber con qué estás trabajando: cuánta información hay, qué período cubre y cuánto falta.",
    business_question_md:
      "Devuelve **una sola fila** con el perfil de `plays`: `total_rows` (filas), `distinct_users` (oyentes distintos), `distinct_tracks` (canciones distintas), `first_played_at` y `last_played_at` (la primera y la última reproducción, **en UTC**), `seconds_played_nulls` (filas sin `seconds_played`) y `device_nulls` (filas sin `device`).",
    learning_objective:
      "Perfilar una tabla desconocida midiendo volumen, granularidad, ventana temporal y completitud en una sola consulta.",
    theory_ref: "calidad-de-datos-perfilar-una-tabla",
    expected_columns: [
      { name: "total_rows", type: "integer" },
      { name: "distinct_users", type: "integer" },
      { name: "distinct_tracks", type: "integer" },
      { name: "first_played_at", type: "timestamp" },
      { name: "last_played_at", type: "timestamp" },
      { name: "seconds_played_nulls", type: "integer" },
      { name: "device_nulls", type: "integer" },
    ],
    validation_rules: { required_concepts: ["aggregate"] },
    reference_solution:
      "SELECT\n  count(*) AS total_rows,\n  count(DISTINCT user_id) AS distinct_users,\n  count(DISTINCT track_id) AS distinct_tracks,\n  min(played_at AT TIME ZONE 'UTC') AS first_played_at,\n  max(played_at AT TIME ZONE 'UTC') AS last_played_at,\n  count(*) - count(seconds_played) AS seconds_played_nulls,\n  count(*) - count(device) AS device_nulls\nFROM plays;",
    alternative_solutions: [
      {
        label: "Nulos con FILTER en lugar de la resta",
        sql: "SELECT\n  count(*) AS total_rows,\n  count(DISTINCT user_id) AS distinct_users,\n  count(DISTINCT track_id) AS distinct_tracks,\n  min(played_at AT TIME ZONE 'UTC') AS first_played_at,\n  max(played_at AT TIME ZONE 'UTC') AS last_played_at,\n  count(*) FILTER (WHERE seconds_played IS NULL) AS seconds_played_nulls,\n  count(*) FILTER (WHERE device IS NULL) AS device_nulls\nFROM plays;",
      },
      {
        label: "Fechas convertidas con CAST al tipo sin huso",
        sql: "SELECT\n  count(*) AS total_rows,\n  count(DISTINCT user_id) AS distinct_users,\n  count(DISTINCT track_id) AS distinct_tracks,\n  cast(min(played_at) AT TIME ZONE 'UTC' AS timestamp) AS first_played_at,\n  cast(max(played_at) AT TIME ZONE 'UTC' AS timestamp) AS last_played_at,\n  count(*) - count(seconds_played) AS seconds_played_nulls,\n  count(*) - count(device) AS device_nulls\nFROM plays;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Todo el perfil sale de **una sola pasada** por la tabla: no necesitas `WHERE`, `GROUP BY` ni varias consultas. Hay dos funciones de conteo con comportamientos distintos: una cuenta filas y la otra cuenta valores presentes.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "`count(*)` cuenta todas las filas y `count(columna)` solo las que tienen valor, así que la resta entre ambas te da los nulos de esa columna. Para los oyentes y las canciones usa `count(DISTINCT ...)`. Y como `played_at` es `timestamptz`, escribe `played_at AT TIME ZONE 'UTC'` para que la fecha no dependa del huso de quien ejecuta.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT\n  count(*) AS total_rows,\n  count(DISTINCT ___) AS distinct_users,\n  ___ AS distinct_tracks,\n  min(___) AS first_played_at,\n  ___ AS last_played_at,\n  count(*) - ___ AS seconds_played_nulls,\n  ___ AS device_nulls\nFROM plays;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "null_handling",
        description_md:
          "Contar los nulos con `count(seconds_played)` a secas: eso cuenta los valores **presentes**, no los que faltan. Los nulos son `count(*) - count(seconds_played)` o `count(*) FILTER (WHERE seconds_played IS NULL)`.",
      },
      {
        category: "date_boundary",
        description_md:
          "Devolver `min(played_at)` sin fijar el huso: al ser `timestamptz`, el valor se muestra según la zona de la sesión. En esta plataforma esa zona es UTC para todos, pero el mismo perfil ejecutado en un cliente configurado en otra zona muestra otra fecha para la misma fila.",
      },
      {
        category: "row_count",
        description_md:
          "Usar `count(user_id)` en lugar de `count(DISTINCT user_id)`: devolverías la cantidad de filas con oyente, no la cantidad de oyentes distintos.",
      },
      {
        category: "aggregation_level",
        description_md:
          "Agregar un `GROUP BY user_id` o `GROUP BY device`: el perfil es un resumen de toda la tabla y debe ocupar una sola fila.",
      },
    ],
    expert_explanation_md:
      "El perfil devuelve 109 382 filas, 4768 oyentes distintos, 6203 canciones distintas, una ventana del 2024-01-03 al 2025-09-15 (en UTC), 90 filas sin `seconds_played` y 1745 sin `device`.\n\nLo importante no son los números sueltos sino lo que te dicen juntos. Con 109 382 filas para 4768 oyentes, **una fila no es un oyente**: es un evento de reproducción, unas 23 por oyente en promedio. Ese dato define de entrada qué joins van a multiplicar filas después. La ventana temporal llega hasta el día de corte del dataset, así que no hay una carga cortada.\n\n`count(*) - count(columna)` funciona porque `count` con argumento ignora los nulos: es la forma más corta de medir completitud y se lee igual en cualquier motor. `count(*) FILTER (WHERE columna IS NULL)` dice lo mismo de forma más explícita y es preferible cuando el perfil tiene muchas columnas, porque cada línea se explica sola.\n\nSobre el huso: `played_at AT TIME ZONE 'UTC'` convierte el `timestamptz` a un `timestamp` sin zona, fijando la lectura en UTC. Sin eso, la misma consulta ejecutada desde Buenos Aires y desde Ciudad de México devuelve marcas distintas y tu evidencia deja de ser reproducible.",
    improvement_feedback: [
      {
        condition: "missing_alias_on_aggregate",
        message_key: "improve.missing_alias_on_aggregate",
      },
      { condition: "uses_select_star", message_key: "improve.uses_select_star" },
    ],
    reward: defaultReward("intermediate"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "inventario-de-dispositivos-con-nulos",
    section,
    title: "Inventario de dispositivos, incluidos los que faltan",
    difficulty: "intermediate",
    estimated_minutes: 8,
    concepts: ["select", "group_by", "null_handling", "aggregate", "order_by"],
    prerequisites: ["perfil-inicial-de-reproducciones"],
    dataset: ritmo,
    tables_used: ["plays"],
    scenario_md:
      "El equipo de producto de **Ritmo** quiere saber desde qué dispositivos se escucha música. La analista anterior entregó una tabla con cinco dispositivos que sumaban 107 637 reproducciones, pero la tabla tiene 109 382 filas. Faltan 1745 y nadie sabe dónde están.",
    business_question_md:
      "Devuelve el reparto de reproducciones por dispositivo **sin perder ninguna fila**: `device` (el valor de `device`, y el texto `sin_dato` cuando está vacío), `plays` (cantidad de reproducciones) y `play_pct` (porcentaje sobre el total de la tabla, con dos decimales). Ordena de mayor a menor cantidad de reproducciones.",
    learning_objective:
      "Hacer visible el grupo NULL en una distribución de categorías y expresarlo como porcentaje del total.",
    theory_ref: "calidad-de-datos-nulos-y-categorias",
    expected_columns: [
      { name: "device", type: "text" },
      { name: "plays", type: "integer" },
      { name: "play_pct", type: "numeric" },
    ],
    validation_rules: {
      order_matters: true,
      required_concepts: ["group_by", "null_handling"],
    },
    reference_solution:
      "SELECT\n  coalesce(device, 'sin_dato') AS device,\n  count(*) AS plays,\n  round(100.0 * count(*) / (SELECT count(*) FROM plays), 2) AS play_pct\nFROM plays\nGROUP BY coalesce(device, 'sin_dato')\nORDER BY plays DESC;",
    alternative_solutions: [
      {
        label: "Total con una función de ventana",
        sql: "SELECT\n  coalesce(device, 'sin_dato') AS device,\n  count(*) AS plays,\n  round(100.0 * count(*) / sum(count(*)) OVER (), 2) AS play_pct\nFROM plays\nGROUP BY coalesce(device, 'sin_dato')\nORDER BY plays DESC;",
      },
      {
        label: "Total en un CTE",
        sql: "WITH total AS (SELECT count(*) AS rows_checked FROM plays)\nSELECT\n  coalesce(p.device, 'sin_dato') AS device,\n  count(*) AS plays,\n  round(100.0 * count(*) / t.rows_checked, 2) AS play_pct\nFROM plays p\nCROSS JOIN total t\nGROUP BY coalesce(p.device, 'sin_dato'), t.rows_checked\nORDER BY plays DESC;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "`GROUP BY` sí arma un grupo con las filas que no tienen valor, pero ese grupo se muestra como celda vacía y se pierde de vista. Convierte la ausencia en una categoría con nombre propio **antes** de agrupar, y agrupa por esa misma expresión.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "`coalesce(device, 'sin_dato')` devuelve el dispositivo o el texto `sin_dato`; úsala tanto en el `SELECT` como en el `GROUP BY`. Para el porcentaje necesitas el total de la tabla: consíguelo con una subconsulta `(SELECT count(*) FROM plays)` y multiplica por `100.0` (con decimal) antes de dividir, o la división entera te dará 0.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT\n  coalesce(___, ___) AS device,\n  count(*) AS plays,\n  round(100.0 * count(*) / (___), 2) AS play_pct\nFROM plays\nGROUP BY ___\nORDER BY ___;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "null_handling",
        description_md:
          "Filtrar con `WHERE device IS NOT NULL` «para que quede limpio»: desaparecen justo las 1745 filas que el equipo estaba buscando y el reporte vuelve a no cuadrar.",
      },
      {
        category: "cell_values",
        description_md:
          "Dividir sin convertir a decimal (`count(*) / (SELECT count(*) FROM plays)`): entero sobre entero trunca y todos los porcentajes salen 0. Multiplica primero por `100.0` o convierte con `::numeric`.",
      },
      {
        category: "aggregation_level",
        description_md:
          "Agrupar por `device` pero mostrar `coalesce(device, 'sin_dato')`: aunque el resultado coincida, el motor rechaza la consulta si la expresión del `SELECT` no está en el `GROUP BY`; agrupa por la misma expresión.",
      },
      {
        category: "wrong_order",
        description_md:
          "No ordenar de mayor a menor: el reporte pide leer de un vistazo qué dispositivo domina, y sin `ORDER BY` el motor no garantiza ningún orden.",
      },
    ],
    expert_explanation_md:
      "Seis filas: `mobile` 62 478 (57,12 %), `desktop` 17 359 (15,87 %), `web` 12 809 (11,71 %), `tv` 8580 (7,84 %), `speaker` 6411 (5,86 %) y `sin_dato` 1745 (1,60 %). Las 1745 filas que faltaban en el reporte anterior aparecen ahora con nombre propio.\n\nEse 1,6 % parece poco, y por eso es peligroso: si mañana alguien calcula «share de mobile» dividiendo 62 478 sobre los 107 637 dispositivos conocidos obtiene 58,0 %, mientras que sobre el total real es 57,1 %. Un punto de diferencia alcanza para discutir una decisión de inversión. La regla es reportar siempre sobre qué denominador estás dividiendo.\n\nTres formas de traer el total conviven aquí. La subconsulta escalar `(SELECT count(*) FROM plays)` es la más directa; `sum(count(*)) OVER ()` evita la segunda lectura de la tabla aplicando una ventana sobre el resultado ya agrupado; el CTE es el más legible cuando el total se usa en varias columnas. Las tres dan el mismo número.\n\nUn detalle de criterio: `sin_dato` es una etiqueta de reporte, no un valor a escribir en la tabla. Reemplazar los NULL en el origen destruiría la información de que ese dato nunca llegó.",
    improvement_feedback: [
      { condition: "uses_select_star", message_key: "improve.uses_select_star" },
      {
        condition: "missing_alias_on_aggregate",
        message_key: "improve.missing_alias_on_aggregate",
      },
    ],
    reward: defaultReward("intermediate"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "chequeos-de-validez-en-reproducciones",
    section,
    title: "Chequeos de validez sobre los segundos escuchados",
    difficulty: "advanced",
    estimated_minutes: 11,
    concepts: ["select", "inner_join", "conditional_aggregation", "null_handling", "aggregate"],
    prerequisites: ["perfil-inicial-de-reproducciones"],
    dataset: ritmo,
    tables_used: ["plays", "tracks"],
    scenario_md:
      "El área de contenidos de **Ritmo** paga regalías según los segundos escuchados de cada canción. Antes de firmar la liquidación del trimestre, finanzas te pide una cifra: cuántas filas de `plays` tienen un valor de `seconds_played` que no puede ser cierto.",
    business_question_md:
      "Devuelve **una fila** con el resultado de los tres chequeos sobre `seconds_played`: `checked_rows` (filas evaluadas), `null_seconds` (sin valor), `negative_seconds` (menor que cero), `over_duration` (mayor que la duración de la canción, según `tracks.duration_seconds`) e `invalid_pct` (porcentaje de filas que fallan **alguno** de los tres chequeos, con dos decimales).",
    learning_objective:
      "Combinar chequeos de dominio y chequeos cruzados entre tablas en un único resumen cuantificado.",
    theory_ref: "calidad-de-datos-validez-y-huecos",
    expected_columns: [
      { name: "checked_rows", type: "integer" },
      { name: "null_seconds", type: "integer" },
      { name: "negative_seconds", type: "integer" },
      { name: "over_duration", type: "integer" },
      { name: "invalid_pct", type: "numeric" },
    ],
    validation_rules: {
      required_concepts: ["conditional_aggregation", "inner_join"],
    },
    reference_solution:
      "SELECT\n  count(*) AS checked_rows,\n  count(*) FILTER (WHERE p.seconds_played IS NULL) AS null_seconds,\n  count(*) FILTER (WHERE p.seconds_played < 0) AS negative_seconds,\n  count(*) FILTER (WHERE p.seconds_played > t.duration_seconds) AS over_duration,\n  round(\n    100.0 * count(*) FILTER (\n      WHERE p.seconds_played IS NULL\n         OR p.seconds_played < 0\n         OR p.seconds_played > t.duration_seconds\n    ) / count(*),\n    2\n  ) AS invalid_pct\nFROM plays p\nJOIN tracks t ON t.id = p.track_id;",
    alternative_solutions: [
      {
        label: "CASE dentro de los agregados (portable a otros motores)",
        sql: "SELECT\n  count(*) AS checked_rows,\n  sum(CASE WHEN p.seconds_played IS NULL THEN 1 ELSE 0 END) AS null_seconds,\n  sum(CASE WHEN p.seconds_played < 0 THEN 1 ELSE 0 END) AS negative_seconds,\n  sum(CASE WHEN p.seconds_played > t.duration_seconds THEN 1 ELSE 0 END) AS over_duration,\n  round(\n    100.0 * sum(\n      CASE\n        WHEN p.seconds_played IS NULL THEN 1\n        WHEN p.seconds_played < 0 THEN 1\n        WHEN p.seconds_played > t.duration_seconds THEN 1\n        ELSE 0\n      END\n    ) / count(*),\n    2\n  ) AS invalid_pct\nFROM plays p\nJOIN tracks t ON t.id = p.track_id;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Los tres chequeos se miden sobre el **mismo** universo de filas, así que no van en tres consultas con `WHERE` distintos: van como columnas con condición dentro de la misma consulta. Y uno de los tres no se puede evaluar mirando solo `plays`.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Une `plays` con `tracks` por `track_id` para conocer la duración de cada canción. Después usa `count(*) FILTER (WHERE ...)` (o `sum(CASE ... END)`) para cada regla. Para el porcentaje, una fila cuenta una sola vez aunque rompa varias reglas: combina las tres condiciones con `OR` dentro de un único `FILTER`.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT\n  count(*) AS checked_rows,\n  count(*) FILTER (WHERE ___) AS null_seconds,\n  ___ AS negative_seconds,\n  count(*) FILTER (WHERE p.seconds_played > ___) AS over_duration,\n  round(100.0 * count(*) FILTER (WHERE ___ OR ___ OR ___) / count(*), 2) AS invalid_pct\nFROM plays p\nJOIN tracks t ON ___;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "null_handling",
        description_md:
          "Escribir `WHERE seconds_played <> NULL` o esperar que `seconds_played < 0` atrape también los nulos: una comparación con NULL nunca es verdadera. Los nulos solo se detectan con `IS NULL`.",
      },
      {
        category: "missing_filter",
        description_md:
          "Resolver cada chequeo con su propio `WHERE` y pegar los resultados: los tres números dejan de ser comparables entre sí y `checked_rows` deja de ser el total.",
      },
      {
        category: "cell_values",
        description_md:
          "Calcular `invalid_pct` sumando los tres conteos: si una fila rompiera dos reglas se contaría dos veces. El porcentaje se calcula con un solo `FILTER` que combine las condiciones con `OR`.",
      },
      {
        category: "join_condition",
        description_md:
          "Unir por `t.id = p.id` en vez de `t.id = p.track_id`: la consulta corre igual y devuelve un `over_duration` sin ningún sentido, que es el peor error posible en una auditoría.",
      },
    ],
    expert_explanation_md:
      "De las 109 382 reproducciones evaluadas, 90 no tienen `seconds_played`, 120 tienen un valor negativo y 210 superan la duración de la canción: 420 filas en total, el 0,38 %.\n\nLas tres reglas son de naturaleza distinta y conviene nombrarlas así al reportar. La primera es de **completitud** (falta el dato). La segunda es de **dominio**: una duración no puede ser negativa, y para saberlo alcanza con la columna. La tercera es **cruzada**: necesita `tracks` para conocer la cota superior, y es la que más trabajo cuesta encontrar porque cada valor, aislado, parece razonable.\n\nEl `JOIN` con `tracks` es seguro aquí porque `track_id` es una clave foránea obligatoria: no pierdes filas al unir (`checked_rows` sigue siendo 109 382). Si la relación admitiera nulos, un `JOIN` interno descartaría filas silenciosamente y el denominador del porcentaje quedaría mal; en ese caso habría que usar `LEFT JOIN`.\n\nSobre el impacto en dinero: 420 filas sobre 109 382 son irrelevantes en un conteo de reproducciones, pero no en una suma de segundos. Las 210 filas que superan la duración aportan tiempo inventado —hay casos de hasta 42 veces la duración real—, así que la liquidación de regalías debe calcularse acotando el valor (`least(seconds_played, duration_seconds)`) o excluyendo esas filas con un filtro explícito y documentado.",
    improvement_feedback: [
      { condition: "no_table_alias_in_join", message_key: "improve.no_table_alias_in_join" },
      { condition: "uses_implicit_join", message_key: "improve.uses_implicit_join" },
    ],
    reward: defaultReward("advanced"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "escuchas-mas-largas-que-la-cancion",
    section,
    title: "Los casos más extremos de escucha imposible",
    difficulty: "advanced",
    estimated_minutes: 10,
    concepts: ["select", "inner_join", "where", "numeric_functions", "order_by", "limit"],
    prerequisites: ["chequeos-de-validez-en-reproducciones"],
    dataset: ritmo,
    tables_used: ["plays", "tracks"],
    scenario_md:
      "Le mostraste a ingeniería que 210 reproducciones registran más segundos escuchados que la duración de la canción. La respuesta fue: «serán redondeos del reproductor». Necesitas evidencia concreta de que no lo son.",
    business_question_md:
      "Lista los **20 casos más extremos**: `play_id` (identificador de la reproducción), `track_title` (título de la canción), `duration_seconds` (duración de la canción), `seconds_played` (segundos registrados) y `played_ratio` (segundos registrados dividido por la duración, con dos decimales). Ordena por `played_ratio` descendente y, ante empates, por `play_id` ascendente.",
    learning_objective:
      "Aislar los valores atípicos que violan una cota conocida del negocio y presentarlos como evidencia ordenada por gravedad.",
    theory_ref: "calidad-de-datos-validez-y-huecos",
    expected_columns: [
      { name: "play_id", type: "integer" },
      { name: "track_title", type: "text" },
      { name: "duration_seconds", type: "integer" },
      { name: "seconds_played", type: "integer" },
      { name: "played_ratio", type: "numeric" },
    ],
    validation_rules: {
      order_matters: true,
      required_concepts: ["inner_join", "where", "order_by"],
    },
    reference_solution:
      "SELECT\n  p.id AS play_id,\n  t.title AS track_title,\n  t.duration_seconds,\n  p.seconds_played,\n  round(p.seconds_played::numeric / t.duration_seconds, 2) AS played_ratio\nFROM plays p\nJOIN tracks t ON t.id = p.track_id\nWHERE p.seconds_played > t.duration_seconds\nORDER BY played_ratio DESC, play_id\nLIMIT 20;",
    alternative_solutions: [
      {
        label: "CAST explícito y orden por la expresión completa",
        sql: "SELECT\n  p.id AS play_id,\n  t.title AS track_title,\n  t.duration_seconds,\n  p.seconds_played,\n  round(cast(p.seconds_played AS numeric) / t.duration_seconds, 2) AS played_ratio\nFROM plays p\nJOIN tracks t ON t.id = p.track_id\nWHERE p.seconds_played > t.duration_seconds\nORDER BY round(cast(p.seconds_played AS numeric) / t.duration_seconds, 2) DESC, p.id ASC\nLIMIT 20;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "«Extremo» no se define por el valor absoluto de `seconds_played`: una canción larga escuchada 300 segundos es normal y una de 95 segundos escuchada 300 no lo es. Lo que ordena la gravedad es la **proporción** entre lo registrado y lo posible.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Une `plays` con `tracks` por `track_id`, filtra las filas donde `seconds_played` supera `duration_seconds` y calcula el cociente. Ojo con la división: los dos valores son enteros, así que convierte uno con `::numeric` (o `cast(... AS numeric)`) antes de dividir. Ordena por la proporción descendente y corta con `LIMIT 20`.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT\n  p.id AS play_id,\n  ___ AS track_title,\n  t.duration_seconds,\n  p.seconds_played,\n  round(___ / ___, 2) AS played_ratio\nFROM plays p\nJOIN tracks t ON ___\nWHERE ___\nORDER BY ___ DESC, ___\nLIMIT ___;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "cell_values",
        description_md:
          "Dividir dos enteros sin convertir: `seconds_played / duration_seconds` trunca y todos los cocientes quedan en números redondos, con lo que el orden por gravedad se pierde.",
      },
      {
        category: "wrong_order",
        description_md:
          "Ordenar por `seconds_played` en lugar de por la proporción: aparecen las canciones largas, no los casos imposibles.",
      },
      {
        category: "duplicates",
        description_md:
          "Ordenar solo por `played_ratio`: hay empates y el motor puede devolver cualquiera de las filas empatadas, así que el resultado cambia entre ejecuciones. Un desempate explícito por `play_id` lo vuelve reproducible.",
      },
      {
        category: "missing_filter",
        description_md:
          "Olvidar el `WHERE` y confiar en que el `ORDER BY ... DESC` ya deja arriba los casos malos: sin el filtro estás listando el top de una tabla sana, no las filas que incumplen la regla.",
      },
    ],
    expert_explanation_md:
      "El caso peor es la reproducción 95 062: la canción «Playa y Nada Más (2732)» dura 95 segundos y la fila registra 3993, una proporción de 42,03. Los veinte primeros casos van de 42,03 a 20,50 veces la duración. Ningún redondeo del reproductor produce eso: el patrón (valores de miles de segundos sobre canciones cortas) apunta a un campo que en algún cliente se envió en milisegundos o a un contador que nunca se reinició.\n\nEste es el sentido práctico de «valor atípico» en calidad de datos. No hace falta desviación estándar ni percentiles: hay una **cota conocida del dominio** —la duración de la canción— y hay filas que la superan. Cuando esa cota no existe, recién ahí se recurre a criterios estadísticos, con la precaución de que un dato extremo legítimo (el cliente que compró diez veces más que el resto) no es un error.\n\nSobre el orden: `ORDER BY played_ratio DESC` puede referirse al alias del `SELECT` porque `ORDER BY` se evalúa después de proyectar las columnas; en `WHERE` ese alias no existiría todavía. El desempate por `play_id` no es un capricho: sin él, dos ejecuciones de la misma consulta pueden devolver filas distintas entre las empatadas, y una evidencia que cambia sola no sirve para discutir con ingeniería.",
    improvement_feedback: [
      { condition: "no_table_alias_in_join", message_key: "improve.no_table_alias_in_join" },
      { condition: "uses_select_star", message_key: "improve.uses_select_star" },
    ],
    reward: defaultReward("advanced"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "duplicados-exactos-en-reproducciones",
    section,
    title: "Reproducciones registradas dos veces",
    difficulty: "advanced",
    estimated_minutes: 10,
    concepts: ["select", "group_by", "having", "aggregate", "order_by", "date_functions"],
    prerequisites: ["perfil-inicial-de-reproducciones"],
    dataset: ritmo,
    tables_used: ["plays"],
    scenario_md:
      "El reporte de «canciones más escuchadas» de **Ritmo** alimenta la playlist destacada de la semana. Un artista reclama que sus números no coinciden con los del sello. Sospechas del reintento del cliente móvil: cuando la red falla, la app vuelve a enviar el mismo evento.",
    business_question_md:
      "Encuentra las combinaciones de oyente, canción e instante que aparecen **más de una vez** en `plays`. Devuelve `user_id`, `track_id`, `played_at_utc` (el instante de la reproducción **en UTC**) y `copies` (cuántas filas hay con esa combinación). Ordena por `user_id`, `track_id` y `played_at_utc` ascendentes.",
    learning_objective:
      "Probar si una clave de negocio identifica una fila y listar las claves duplicadas como evidencia.",
    theory_ref: "calidad-de-datos-perfilar-una-tabla",
    expected_columns: [
      { name: "user_id", type: "integer" },
      { name: "track_id", type: "integer" },
      { name: "played_at_utc", type: "timestamp" },
      { name: "copies", type: "integer" },
    ],
    validation_rules: {
      order_matters: true,
      required_concepts: ["group_by", "having"],
    },
    reference_solution:
      "SELECT\n  user_id,\n  track_id,\n  played_at AT TIME ZONE 'UTC' AS played_at_utc,\n  count(*) AS copies\nFROM plays\nGROUP BY user_id, track_id, played_at\nHAVING count(*) > 1\nORDER BY user_id, track_id, played_at_utc;",
    alternative_solutions: [
      {
        label: "Agrupando directamente por la marca convertida a UTC",
        sql: "SELECT\n  user_id,\n  track_id,\n  played_at AT TIME ZONE 'UTC' AS played_at_utc,\n  count(*) AS copies\nFROM plays\nGROUP BY user_id, track_id, played_at AT TIME ZONE 'UTC'\nHAVING count(*) > 1\nORDER BY 1, 2, 3;",
      },
      {
        label: "Filtrando el conteo desde una subconsulta",
        sql: "SELECT user_id, track_id, played_at_utc, copies\nFROM (\n  SELECT\n    user_id,\n    track_id,\n    played_at AT TIME ZONE 'UTC' AS played_at_utc,\n    count(*) AS copies\n  FROM plays\n  GROUP BY user_id, track_id, played_at\n) d\nWHERE copies > 1\nORDER BY user_id, track_id, played_at_utc;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Un duplicado solo existe respecto de una **clave**: primero decides qué combinación de columnas debería identificar una fila y recién después cuentas cuántas filas comparten cada valor de esa combinación. La `id` de la tabla no sirve: es distinta en cada fila por definición.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "La clave de negocio de una reproducción es oyente + canción + instante (`user_id`, `track_id`, `played_at`). Agrupa por esas tres columnas, cuenta las filas de cada grupo y quédate solo con los grupos de más de una fila: ese filtro va sobre el resultado del conteo, no sobre las filas. Muestra el instante con `AT TIME ZONE 'UTC'`.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT\n  user_id,\n  track_id,\n  ___ AS played_at_utc,\n  ___ AS copies\nFROM plays\nGROUP BY ___, ___, ___\nHAVING ___\nORDER BY ___;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "missing_filter",
        description_md:
          "Poner la condición del conteo en el `WHERE` (`WHERE count(*) > 1`): el `WHERE` se evalúa antes de agrupar y el motor rechaza la consulta. El filtro sobre un agregado va en `HAVING`.",
      },
      {
        category: "duplicates",
        description_md:
          "Incluir `id` en el `GROUP BY`: como la clave primaria es distinta en cada fila, todos los grupos tienen exactamente una fila y el resultado queda vacío.",
      },
      {
        category: "row_count",
        description_md:
          "Reportar `count(*)` de la consulta como «filas duplicadas»: cada grupo con dos copias aporta **una** fila de más, así que las filas sobrantes son la suma de `copies - 1`, no la cantidad de grupos.",
      },
      {
        category: "date_boundary",
        description_md:
          "Mostrar `played_at` sin fijar el huso: la evidencia depende de la zona de quien ejecuta la consulta y deja de ser comparable entre equipos.",
      },
    ],
    expert_explanation_md:
      "Aparecen 340 combinaciones de oyente, canción e instante repetidas, todas con exactamente dos copias. Es decir: 680 filas describen 340 reproducciones reales y sobran 340 filas, el 0,31 % de la tabla.\n\nEl detalle que convierte esto en un caso claro de reintento es el instante: dos escuchas humanas no caen en el mismo segundo con la misma canción y el mismo oyente. Si la clave hubiera sido solo oyente + canción, habría muchísimos grupos repetidos y **ninguno** sería un error: volver a escuchar una canción es lo normal. Elegir bien la clave de negocio es todo el ejercicio.\n\n`HAVING count(*) > 1` filtra grupos, no filas: por eso no puede escribirse en el `WHERE`, que se evalúa antes de que los grupos existan. La versión con subconsulta hace el mismo trabajo en dos pasos y a veces se lee mejor cuando el conteo se reutiliza.\n\nImpacto: 340 reproducciones fantasma sobre 109 382 casi no mueven el ranking global, pero sí pueden mover el top de un artista con pocas escuchas, que es exactamente el reclamo que llegó. La corrección al medir es contar eventos distintos —`count(DISTINCT (user_id, track_id, played_at))`— o deduplicar con `ROW_NUMBER()` antes de agregar; el arreglo de fondo va en el cliente que reintenta sin clave de idempotencia.",
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
    slug: "pedidos-sin-items-en-pidelo",
    section,
    title: "Pedidos que no tienen ni un ítem",
    difficulty: "advanced",
    estimated_minutes: 11,
    concepts: ["select", "inner_join", "subquery", "order_by", "date_functions"],
    prerequisites: ["chequeos-de-validez-en-reproducciones"],
    dataset: pidelo,
    tables_used: ["orders", "order_items", "restaurants"],
    scenario_md:
      "En **Pídelo**, el equipo de finanzas concilia cada mes lo facturado a los restaurantes contra los ítems vendidos. Este mes la conciliación no cierra: hay pedidos con importe que no tienen ninguna línea de detalle. Te piden el listado completo para reclamarle al equipo de la app.",
    business_question_md:
      "Lista los pedidos que **no tienen ninguna fila** en `order_items`. Devuelve `order_id`, `status`, `placed_at_utc` (fecha y hora del pedido **en UTC**), `restaurant_name` (nombre del restaurante) y `order_total` (columna `total` del pedido). Ordena por `placed_at_utc` ascendente y, ante empates, por `order_id` ascendente.",
    learning_objective:
      "Detectar huecos referenciales con un antijoin y entregarlos como evidencia legible para el área afectada.",
    theory_ref: "calidad-de-datos-validez-y-huecos",
    expected_columns: [
      { name: "order_id", type: "integer" },
      { name: "status", type: "text" },
      { name: "placed_at_utc", type: "timestamp" },
      { name: "restaurant_name", type: "text" },
      { name: "order_total", type: "numeric" },
    ],
    validation_rules: {
      order_matters: true,
      required_concepts: ["inner_join"],
    },
    reference_solution:
      "SELECT\n  o.id AS order_id,\n  o.status,\n  o.placed_at AT TIME ZONE 'UTC' AS placed_at_utc,\n  r.name AS restaurant_name,\n  o.total AS order_total\nFROM orders o\nJOIN restaurants r ON r.id = o.restaurant_id\nWHERE NOT EXISTS (\n  SELECT 1 FROM order_items i WHERE i.order_id = o.id\n)\nORDER BY placed_at_utc, order_id;",
    alternative_solutions: [
      {
        label: "LEFT JOIN con la condición IS NULL en el WHERE",
        sql: "SELECT\n  o.id AS order_id,\n  o.status,\n  o.placed_at AT TIME ZONE 'UTC' AS placed_at_utc,\n  r.name AS restaurant_name,\n  o.total AS order_total\nFROM orders o\nJOIN restaurants r ON r.id = o.restaurant_id\nLEFT JOIN order_items i ON i.order_id = o.id\nWHERE i.id IS NULL\nORDER BY o.placed_at, o.id;",
      },
      {
        label: "Antijoin contra la lista de pedidos con ítems",
        sql: "SELECT\n  o.id AS order_id,\n  o.status,\n  o.placed_at AT TIME ZONE 'UTC' AS placed_at_utc,\n  r.name AS restaurant_name,\n  o.total AS order_total\nFROM orders o\nJOIN restaurants r ON r.id = o.restaurant_id\nLEFT JOIN (SELECT DISTINCT order_id FROM order_items) x ON x.order_id = o.id\nWHERE x.order_id IS NULL\nORDER BY o.placed_at, o.id;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Estás buscando **ausencias**, no coincidencias: filas de una tabla que no tienen pareja en otra. Ese patrón se llama antijoin y se puede escribir de dos maneras; ninguna de las dos es un `JOIN` común, porque un `JOIN` común solo devuelve lo que sí empareja.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Dos caminos equivalentes: `WHERE NOT EXISTS (SELECT 1 FROM order_items i WHERE i.order_id = o.id)`, o bien `LEFT JOIN order_items i ON i.order_id = o.id` dejando `WHERE i.id IS NULL` (la condición nula va en el `WHERE`, nunca en el `ON`). El nombre del restaurante sale de un `JOIN` normal con `restaurants`, y la fecha se muestra con `AT TIME ZONE 'UTC'`.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT\n  o.id AS order_id,\n  o.status,\n  ___ AS placed_at_utc,\n  ___ AS restaurant_name,\n  ___ AS order_total\nFROM orders o\nJOIN restaurants r ON ___\nWHERE NOT EXISTS (\n  SELECT 1 FROM ___ i WHERE ___\n)\nORDER BY ___, ___;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "join_condition",
        description_md:
          "Escribir `LEFT JOIN order_items i ON i.order_id = o.id AND i.id IS NULL`: la condición dentro del `ON` no descarta pedidos, solo evita que se enganchen ítems, y el resultado incluye todos los pedidos.",
      },
      {
        category: "null_handling",
        description_md:
          "Usar `WHERE o.id NOT IN (SELECT order_id FROM order_items)`: si esa subconsulta llegara a devolver un NULL, el resultado sería vacío sin ningún error a la vista. En auditorías, prefiere `NOT EXISTS`.",
      },
      {
        category: "duplicates",
        description_md:
          "Unir con `order_items` sin ser un antijoin (por ejemplo con `JOIN` y luego `GROUP BY`): los pedidos con varios ítems se multiplican y, además, los que no tienen ninguno desaparecen justo cuando son lo que buscas.",
      },
      {
        category: "date_boundary",
        description_md:
          "Mostrar `placed_at` tal cual: al ser `timestamptz`, la hora que ve finanzas depende del huso de su sesión y el reclamo al equipo de la app pierde precisión.",
      },
    ],
    expert_explanation_md:
      "Son 178 pedidos sin una sola línea de detalle, todos con estado `cancelled`. Eso ya es una explicación: cuando el pedido se cancela antes de confirmarse, la app nunca llega a escribir los ítems. Lo que no cierra es el dinero: 171 de esos 178 pedidos tienen `total` mayor que cero, con importes de hasta varios miles. Hay dinero registrado sin nada que lo respalde.\n\nEl hallazgo se comunica con las dos cifras juntas: 178 pedidos huérfanos sobre 1153 cancelados (15,4 %) y 0 sobre 13 284 entregados. Ese contraste es el que convierte «hay datos raros» en «el problema está en el flujo de cancelación», que es accionable.\n\nLas tres soluciones son equivalentes en resultado. `NOT EXISTS` es la que mejor expresa la intención y suele ser la más eficiente, porque el motor puede cortar la búsqueda en cuanto encuentra un ítem. El `LEFT JOIN ... IS NULL` es igual de válido y muy usado; su riesgo es que la condición nula termine en el `ON`, donde no filtra nada. `NOT IN` es la que hay que evitar: un solo NULL en la subconsulta vacía el resultado sin avisar.\n\nUna aclaración de alcance: la clave foránea `order_items.order_id → orders.id` impide que exista un ítem sin pedido. Nadie garantiza lo contrario, y ese es precisamente el hueco que estás auditando.",
    improvement_feedback: [
      { condition: "no_table_alias_in_join", message_key: "improve.no_table_alias_in_join" },
      { condition: "uses_implicit_join", message_key: "improve.uses_implicit_join" },
    ],
    reward: defaultReward("advanced"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "tablero-de-calidad-de-reproducciones",
    section,
    title: "Tablero de calidad de la tabla de reproducciones",
    difficulty: "expert",
    estimated_minutes: 15,
    concepts: ["select", "cte", "set_operations", "inner_join", "aggregate", "order_by"],
    prerequisites: [
      "chequeos-de-validez-en-reproducciones",
      "duplicados-exactos-en-reproducciones",
    ],
    dataset: ritmo,
    tables_used: ["plays", "tracks", "users"],
    scenario_md:
      "Tus hallazgos sueltos convencieron a la dirección de **Ritmo**, y ahora quieren revisarlos todas las semanas. Te piden una única consulta que se pueda programar y que devuelva el estado de cada regla, incluidas las que hoy están sanas: si una regla no aparece en la lista, nadie sabe si se verificó.",
    business_question_md:
      "Arma el tablero con **una fila por chequeo** y estas columnas: `check_name`, `failing_rows` (filas que incumplen), `rows_checked` (total de filas de `plays`) y `failing_pct` (porcentaje sobre ese total, con tres decimales). Usa exactamente estos seis nombres de chequeo: `device_nulo` (sin `device`), `segundos_nulos` (sin `seconds_played`), `segundos_negativos` (`seconds_played` menor que cero), `segundos_mayores_que_la_cancion` (`seconds_played` mayor que `tracks.duration_seconds`), `claves_duplicadas` (combinaciones de `user_id`, `track_id` y `played_at` que aparecen más de una vez) y `escucha_posterior_al_churn` (reproducciones de un oyente después de su `churned_at`). Ordena por `failing_rows` descendente y, ante empates, por `check_name` ascendente.",
    learning_objective:
      "Consolidar chequeos heterogéneos en un único reporte reproducible, con el total de referencia y las reglas que pasan incluidas.",
    theory_ref: "calidad-de-datos-validez-y-huecos",
    expected_columns: [
      { name: "check_name", type: "text" },
      { name: "failing_rows", type: "integer" },
      { name: "rows_checked", type: "integer" },
      { name: "failing_pct", type: "numeric" },
    ],
    validation_rules: {
      order_matters: true,
      required_concepts: ["set_operations"],
    },
    reference_solution:
      "WITH total AS (\n  SELECT count(*) AS rows_checked FROM plays\n),\nfails AS (\n  SELECT 'device_nulo' AS check_name, count(*) AS failing_rows\n  FROM plays WHERE device IS NULL\n  UNION ALL\n  SELECT 'segundos_nulos', count(*)\n  FROM plays WHERE seconds_played IS NULL\n  UNION ALL\n  SELECT 'segundos_negativos', count(*)\n  FROM plays WHERE seconds_played < 0\n  UNION ALL\n  SELECT 'segundos_mayores_que_la_cancion', count(*)\n  FROM plays p JOIN tracks t ON t.id = p.track_id\n  WHERE p.seconds_played > t.duration_seconds\n  UNION ALL\n  SELECT 'claves_duplicadas', count(*)\n  FROM (\n    SELECT user_id, track_id, played_at\n    FROM plays\n    GROUP BY user_id, track_id, played_at\n    HAVING count(*) > 1\n  ) d\n  UNION ALL\n  SELECT 'escucha_posterior_al_churn', count(*)\n  FROM plays p JOIN users u ON u.id = p.user_id\n  WHERE u.churned_at IS NOT NULL AND p.played_at > u.churned_at\n)\nSELECT\n  f.check_name,\n  f.failing_rows,\n  t.rows_checked,\n  round(100.0 * f.failing_rows / t.rows_checked, 3) AS failing_pct\nFROM fails f\nCROSS JOIN total t\nORDER BY f.failing_rows DESC, f.check_name;",
    alternative_solutions: [
      {
        label: "Total con una subconsulta escalar, sin CTE para el total",
        sql: "WITH fails AS (\n  SELECT 'device_nulo' AS check_name, count(*) AS failing_rows\n  FROM plays WHERE device IS NULL\n  UNION ALL\n  SELECT 'segundos_nulos', count(*)\n  FROM plays WHERE seconds_played IS NULL\n  UNION ALL\n  SELECT 'segundos_negativos', count(*)\n  FROM plays WHERE seconds_played < 0\n  UNION ALL\n  SELECT 'segundos_mayores_que_la_cancion', count(*)\n  FROM plays p JOIN tracks t ON t.id = p.track_id\n  WHERE p.seconds_played > t.duration_seconds\n  UNION ALL\n  SELECT 'claves_duplicadas', count(*)\n  FROM (\n    SELECT user_id, track_id, played_at\n    FROM plays\n    GROUP BY user_id, track_id, played_at\n    HAVING count(*) > 1\n  ) d\n  UNION ALL\n  SELECT 'escucha_posterior_al_churn', count(*)\n  FROM plays p JOIN users u ON u.id = p.user_id\n  WHERE u.churned_at IS NOT NULL AND p.played_at > u.churned_at\n)\nSELECT\n  check_name,\n  failing_rows,\n  (SELECT count(*) FROM plays) AS rows_checked,\n  round(100.0 * failing_rows / (SELECT count(*) FROM plays), 3) AS failing_pct\nFROM fails\nORDER BY failing_rows DESC, check_name;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Cada chequeo es una consulta distinta y devuelve un solo número. Para que convivan en una tabla necesitas apilarlos verticalmente: cada uno aporta una etiqueta de texto y su conteo. El total de referencia es igual para todas las filas, así que se calcula una sola vez y se pega al costado.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Apila los seis conteos con `UNION ALL` (nunca `UNION`: si dos chequeos fallan la misma cantidad de filas, `UNION` borraría uno). Cada rama tiene la forma `SELECT 'etiqueta', count(*) FROM ... WHERE ...`. Dos ramas son especiales: la de la duración necesita unir con `tracks`, y la de duplicados cuenta **grupos**, así que envuelve un `GROUP BY ... HAVING count(*) > 1` en una subconsulta. Junta todo en un CTE y multiplícalo por el total con `CROSS JOIN`.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nWITH total AS (SELECT count(*) AS rows_checked FROM plays),\nfails AS (\n  SELECT 'device_nulo' AS check_name, count(*) AS failing_rows FROM plays WHERE ___\n  UNION ALL\n  SELECT 'segundos_nulos', count(*) FROM plays WHERE ___\n  -- ... las otras cuatro ramas\n)\nSELECT f.check_name, f.failing_rows, t.rows_checked, round(___, 3) AS failing_pct\nFROM fails f\nCROSS JOIN total t\nORDER BY ___, ___;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "duplicates",
        description_md:
          "Usar `UNION` en lugar de `UNION ALL`: `UNION` elimina filas repetidas, así que dos chequeos con el mismo conteo se fusionarían y uno desaparecería del tablero sin dejar rastro.",
      },
      {
        category: "aggregation_level",
        description_md:
          "Contar filas en lugar de grupos en `claves_duplicadas`: `count(*)` sobre `plays` con `HAVING` aplicado da 680 filas involucradas, no 340 claves repetidas. Define primero qué unidad estás reportando.",
      },
      {
        category: "missing_filter",
        description_md:
          "Dejar fuera los chequeos que devuelven cero «porque no aportan»: un tablero de calidad muestra también lo que está sano; una regla ausente es una regla que nadie verificó.",
      },
      {
        category: "cell_values",
        description_md:
          "Calcular el porcentaje con división entera (`failing_rows / rows_checked`): sin `100.0` o un `::numeric`, todas las filas muestran 0.",
      },
    ],
    expert_explanation_md:
      "El tablero devuelve seis filas sobre 109 382 reproducciones: `device_nulo` 1745 (1,595 %), `claves_duplicadas` 340 (0,311 %), `segundos_mayores_que_la_cancion` 210 (0,192 %), `segundos_negativos` 120 (0,110 %), `segundos_nulos` 90 (0,082 %) y `escucha_posterior_al_churn` 0 (0,000 %).\n\nEsa última fila es la más valiosa del reporte aunque su número sea cero: demuestra que la regla «un oyente que se dio de baja no vuelve a aparecer» se verificó y se cumple. Un tablero que solo lista problemas no distingue entre una regla sana y una regla olvidada.\n\nDos decisiones de diseño merecen atención. La primera es que `failing_rows` no siempre mide lo mismo: cinco chequeos cuentan filas y `claves_duplicadas` cuenta grupos. Está bien mientras esté documentado —por eso el nombre dice «claves»—; lo que no se puede es sumar la columna y presentar el resultado como «filas con problemas». La segunda es el `CROSS JOIN` con el total: parece exótico, pero multiplicar seis filas por una sola es justamente lo que se necesita para repetir el denominador en cada línea. La alternativa con subconsulta escalar es idéntica en resultado.\n\nPara llevarlo a producción, este es el punto de partida natural de una tabla de resultados históricos: agregando una columna con la fecha de ejecución e insertando el resultado cada semana, el tablero deja de ser una foto y pasa a mostrar si la calidad mejora o empeora. Ahí es donde una auditoría deja de ser un reclamo y se vuelve un indicador.",
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
];
