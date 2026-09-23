import {
  defaultHintMeta,
  defaultReward,
  defaultSolutionUnlock,
  type ExerciseDef,
} from "../schemas/exercise";

const section = "funciones-de-ranking";
const dataset = { slug: "ritmo", version: 1 };
const basicas = "ranking-row-number-rank-dense-rank";
const topN = "ranking-top-n-por-grupo";
const ntile = "ranking-ntile-y-segmentos";

export const exercises: ExerciseDef[] = [
  {
    slug: "ranking-de-artistas-de-regueton",
    section,
    title: "Ranking de artistas de reguetón",
    difficulty: "intermediate",
    estimated_minutes: 7,
    concepts: ["ranking", "window_function", "where", "order_by", "alias"],
    dataset,
    tables_used: ["artists"],
    scenario_md:
      "En **Ritmo**, el equipo de contenidos arma la portada del género reguetón y necesita la lista de artistas numerada por audiencia, lista para publicar.",
    business_question_md:
      "Para los artistas con `genre = 'reguetón'`, devuelve `posicion` (número de puesto correlativo, 1 para el de mayor `monthly_listeners`), `name`, `country` y `monthly_listeners`. Ante empates, el artista cuyo `name` va antes alfabéticamente recibe el puesto menor. Ordena el resultado por `posicion`.",
    learning_objective:
      "Numerar filas con ROW_NUMBER y un criterio de desempate estable dentro de la ventana.",
    theory_ref: basicas,
    expected_columns: [
      { name: "posicion", type: "integer" },
      { name: "name", type: "text" },
      { name: "country", type: "text" },
      { name: "monthly_listeners", type: "integer" },
    ],
    validation_rules: { order_matters: true, required_concepts: ["ranking"] },
    reference_solution:
      "SELECT\n  row_number() OVER (ORDER BY monthly_listeners DESC, name) AS posicion,\n  name,\n  country,\n  monthly_listeners\nFROM artists\nWHERE genre = 'reguetón'\nORDER BY posicion;",
    alternative_solutions: [
      {
        label: "Ordenar por la posición del select",
        sql: "SELECT row_number() OVER (ORDER BY monthly_listeners DESC, name) AS posicion, name, country, monthly_listeners FROM artists WHERE genre = 'reguetón' ORDER BY 1;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "`ORDER BY` ordena las filas, pero no crea la columna con el número de puesto. Esa columna la produce una función de ranking.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "`row_number()` siempre necesita `OVER (ORDER BY ...)`. Dentro de la ventana, ordena por `monthly_listeners` descendente y agrega `name` como segundo criterio para que el desempate sea estable.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT\n  ___() OVER (ORDER BY monthly_listeners ___, name) AS posicion,\n  name,\n  country,\n  monthly_listeners\nFROM artists\nWHERE genre = 'reguetón'\nORDER BY posicion;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "syntax",
        description_md:
          "Escribir `row_number()` sin `OVER`: PostgreSQL responde `window function row_number requires an OVER clause`.",
      },
      {
        category: "wrong_order",
        description_md:
          "Ordenar la ventana de forma ascendente: el puesto 1 queda para el artista con menos oyentes.",
      },
      {
        category: "cell_values",
        description_md:
          "No agregar el desempate por `name`: dos artistas empatados pueden intercambiar puestos entre ejecuciones.",
      },
    ],
    expert_explanation_md:
      "20 artistas de reguetón, numerados del 1 al 20. `row_number()` entrega una secuencia sin repeticiones ni saltos, que es justo lo que necesita una portada: un puesto por artista.\n\nEl desempate importa: `Sierra Insomne` y `Sierra y Costa` tienen 2938 oyentes mensuales. Sin el segundo criterio, PostgreSQL elegiría el orden entre ellos de forma arbitraria y la portada podría cambiar de una carga a otra sin que los datos hayan cambiado.\n\nEl `ORDER BY` final es independiente del de la ventana: podrías numerar por audiencia y mostrar el resultado por país sin alterar los puestos.",
    reward: defaultReward("intermediate"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "empates-rank-contra-dense-rank",
    section,
    title: "Empates: RANK contra DENSE_RANK",
    difficulty: "intermediate",
    estimated_minutes: 8,
    concepts: ["ranking", "window_function", "where", "order_by"],
    dataset,
    tables_used: ["artists"],
    scenario_md:
      "Antes de publicar la portada, Contenidos discute cómo mostrar los empates: si dos artistas comparten audiencia, ¿el siguiente queda tercero o cuarto? Para decidirlo quieren ver las dos numeraciones lado a lado.",
    business_question_md:
      "Para los artistas con `genre = 'reguetón'`, devuelve `name`, `monthly_listeners`, el puesto con saltos como `puesto` y el puesto sin saltos como `puesto_denso`, ambos calculados sobre `monthly_listeners` descendente. Ordena por `puesto` y, dentro del mismo puesto, por `name`.",
    learning_objective:
      "Distinguir RANK de DENSE_RANK comparando ambas numeraciones sobre el mismo conjunto con empates.",
    theory_ref: basicas,
    expected_columns: [
      { name: "name", type: "text" },
      { name: "monthly_listeners", type: "integer" },
      { name: "puesto", type: "integer" },
      { name: "puesto_denso", type: "integer" },
    ],
    validation_rules: { order_matters: true, required_concepts: ["ranking"] },
    reference_solution:
      "SELECT\n  name,\n  monthly_listeners,\n  rank() OVER (ORDER BY monthly_listeners DESC) AS puesto,\n  dense_rank() OVER (ORDER BY monthly_listeners DESC) AS puesto_denso\nFROM artists\nWHERE genre = 'reguetón'\nORDER BY puesto, name;",
    alternative_solutions: [
      {
        label: "Orden por posición de columna",
        sql: "SELECT name, monthly_listeners, rank() OVER (ORDER BY monthly_listeners DESC) AS puesto, dense_rank() OVER (ORDER BY monthly_listeners DESC) AS puesto_denso FROM artists WHERE genre = 'reguetón' ORDER BY 3, 1;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Las dos funciones dan el mismo puesto a los empatados; se diferencian en qué número recibe el que viene después.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "`rank()` salta números después de un empate (12, 12, 14) y `dense_rank()` no (12, 12, 13). Las dos usan la misma ventana: `OVER (ORDER BY monthly_listeners DESC)`.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT\n  name,\n  monthly_listeners,\n  ___() OVER (ORDER BY monthly_listeners DESC) AS puesto,\n  ___() OVER (ORDER BY monthly_listeners DESC) AS puesto_denso\nFROM artists\nWHERE genre = 'reguetón'\nORDER BY puesto, name;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "cell_values",
        description_md:
          "Usar `row_number()` en alguna de las dos columnas: rompe el empate en lugar de mostrarlo.",
      },
      {
        category: "cell_values",
        description_md:
          "Agregar un desempate (`, name`) dentro de la ventana: elimina los empates y las dos columnas quedan idénticas.",
      },
      {
        category: "wrong_order",
        description_md:
          "Ordenar el resultado solo por `puesto`: dentro del empate el orden queda indefinido.",
      },
    ],
    expert_explanation_md:
      "20 filas. `Sierra Insomne` y `Sierra y Costa` comparten 2938 oyentes: ambos reciben el puesto 12 en las dos columnas. La diferencia aparece en la fila siguiente, `Los Ceibos Violeta`, que es 14 con `rank` y 13 con `dense_rank`.\n\nLa elección no es de estilo: `rank` responde «¿cuántos artistas están por encima?» (el clásico puesto deportivo) y `dense_rank` responde «¿cuántos niveles de audiencia distintos hay por encima?». Si el reporte promete «los tres primeros puestos», `rank` puede devolver cinco artistas y `dense_rank`, más todavía.\n\nEl desempate del `ORDER BY` final es lo que hace reproducible la salida: la ventana ya declaró que los dos artistas son iguales, así que el orden entre ellos debe fijarlo la consulta.",
    reward: defaultReward("intermediate"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "cuartiles-de-consumo-en-chile",
    section,
    title: "Cuartiles de consumo en Chile",
    difficulty: "advanced",
    estimated_minutes: 12,
    concepts: ["ranking", "window_function", "cte", "group_by", "aggregate", "inner_join"],
    dataset,
    tables_used: ["plays", "users"],
    scenario_md:
      "Marketing quiere entender la concentración del consumo en Chile antes de diseñar una campaña de fidelización: cuánto escucha el 25 % más activo comparado con el resto.",
    business_question_md:
      "Considera solo a los oyentes con `country = 'CL'` que tengan al menos una reproducción. Cuenta las reproducciones de cada uno, repártelos en cuatro bloques de tamaño parejo ordenados por cantidad de reproducciones descendente (desempata por `user_id` ascendente) y devuelve por bloque: `cuartil`, la cantidad de oyentes como `oyentes`, el mínimo como `minimo`, el máximo como `maximo` y el promedio de reproducciones como `promedio` (2 decimales). Ordena por `cuartil`.",
    learning_objective:
      "Segmentar una base de clientes con NTILE sobre un agregado previo y describir cada segmento.",
    theory_ref: ntile,
    expected_columns: [
      { name: "cuartil", type: "integer" },
      { name: "oyentes", type: "integer" },
      { name: "minimo", type: "integer" },
      { name: "maximo", type: "integer" },
      { name: "promedio", type: "numeric" },
    ],
    validation_rules: {
      order_matters: true,
      required_concepts: ["ranking", "group_by"],
    },
    reference_solution:
      "WITH escuchas AS (\n  SELECT p.user_id, count(*) AS reproducciones\n  FROM plays AS p\n  INNER JOIN users AS u ON u.id = p.user_id\n  WHERE u.country = 'CL'\n  GROUP BY p.user_id\n),\nsegmentos AS (\n  SELECT\n    user_id,\n    reproducciones,\n    ntile(4) OVER (ORDER BY reproducciones DESC, user_id) AS cuartil\n  FROM escuchas\n)\nSELECT\n  cuartil,\n  count(*) AS oyentes,\n  min(reproducciones) AS minimo,\n  max(reproducciones) AS maximo,\n  round(avg(reproducciones), 2) AS promedio\nFROM segmentos\nGROUP BY cuartil\nORDER BY cuartil;",
    hints: [
      {
        level: 1,
        body_md:
          "Son tres pasos: contar reproducciones por oyente, asignar el bloque y recién después describir cada bloque. Una CTE por paso mantiene la consulta legible.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "`ntile(4) OVER (ORDER BY reproducciones DESC, user_id)` reparte los oyentes ya agregados en cuatro bloques. La consulta final agrupa por esa columna y aplica `count`, `min`, `max` y `avg`.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nWITH escuchas AS (\n  SELECT p.user_id, count(*) AS reproducciones\n  FROM plays AS p\n  INNER JOIN users AS u ON u.id = p.user_id\n  WHERE u.country = '___'\n  GROUP BY p.user_id\n),\nsegmentos AS (\n  SELECT user_id, reproducciones,\n         ___(4) OVER (ORDER BY reproducciones ___, user_id) AS cuartil\n  FROM escuchas\n)\nSELECT cuartil, count(*) AS oyentes, ... \nFROM segmentos\nGROUP BY cuartil\nORDER BY cuartil;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "aggregation_level",
        description_md:
          "Aplicar `ntile(4)` directamente sobre `plays`: segmenta reproducciones, no oyentes.",
      },
      {
        category: "wrong_order",
        description_md:
          "Ordenar la ventana ascendente: el cuartil 1 pasa a ser el de menor consumo y la lectura del reporte se invierte.",
      },
      {
        category: "missing_filter",
        description_md:
          "Olvidar `country = 'CL'`: los cuartiles se calculan sobre los seis mercados.",
      },
      {
        category: "cell_values",
        description_md: "No redondear `promedio` a 2 decimales.",
      },
    ],
    expert_explanation_md:
      "454 oyentes chilenos con al menos una reproducción se reparten en bloques de 114, 114, 113 y 113: cuando la división no es exacta, `ntile` da una fila extra a los primeros bloques.\n\nEl resultado muestra una concentración típica de streaming: el cuartil 1 promedia 75,68 reproducciones y llega a 515, mientras que el cuartil 4 promedia 2,22. Marketing puede leerlo directamente: el 25 % más activo explica la mayor parte del consumo.\n\nAtención al borde entre bloques: el máximo del cuartil 2 (19) coincide con el mínimo del cuartil 1, porque `ntile` corta por cantidad de filas y no por valor. Si el negocio necesita que dos oyentes idénticos caigan siempre en el mismo segmento, el criterio debe ser un umbral con `CASE` o una función como `percent_rank()`.\n\nEl `INNER JOIN` con `users` solo filtra por país; como partimos de `plays`, los oyentes sin reproducciones quedan fuera sin necesidad de una condición adicional.",
    reward: defaultReward("advanced"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "top-3-canciones-por-genero",
    section,
    title: "Top 3 canciones por género",
    difficulty: "advanced",
    estimated_minutes: 14,
    concepts: ["ranking", "window_function", "cte", "group_by", "aggregate", "inner_join"],
    dataset,
    tables_used: ["plays", "tracks", "albums", "artists"],
    scenario_md:
      "El equipo editorial arma una lista destacada por género y pide las tres canciones más reproducidas de cada uno, con su cantidad de reproducciones.",
    business_question_md:
      "Cuenta todas las reproducciones de `plays` por canción y quédate con las tres más reproducidas de cada género del artista. Devuelve `genre`, `puesto` (1, 2 o 3 dentro del género), `title` y `reproducciones`. Si dos canciones del mismo género empatan, primero va la de `tracks.id` menor y cada género devuelve exactamente tres filas. Ordena por `genre` y `puesto`.",
    learning_objective:
      "Resolver un top-N por grupo con PARTITION BY, ROW_NUMBER y un filtro en una capa externa.",
    theory_ref: topN,
    expected_columns: [
      { name: "genre", type: "text" },
      { name: "puesto", type: "integer" },
      { name: "title", type: "text" },
      { name: "reproducciones", type: "integer" },
    ],
    validation_rules: {
      order_matters: true,
      required_concepts: ["ranking", "group_by", "inner_join"],
    },
    reference_solution:
      "WITH reproducciones_por_cancion AS (\n  SELECT ar.genre, t.id AS track_id, t.title, count(*) AS reproducciones\n  FROM plays AS p\n  INNER JOIN tracks AS t ON t.id = p.track_id\n  INNER JOIN albums AS al ON al.id = t.album_id\n  INNER JOIN artists AS ar ON ar.id = al.artist_id\n  GROUP BY ar.genre, t.id, t.title\n),\nranking AS (\n  SELECT\n    genre,\n    title,\n    reproducciones,\n    row_number() OVER (PARTITION BY genre ORDER BY reproducciones DESC, track_id) AS puesto\n  FROM reproducciones_por_cancion\n)\nSELECT genre, puesto, title, reproducciones\nFROM ranking\nWHERE puesto <= 3\nORDER BY genre, puesto;",
    alternative_solutions: [
      {
        label: "Subconsulta en el FROM",
        sql: "SELECT genre, puesto, title, reproducciones FROM (SELECT genre, title, reproducciones, row_number() OVER (PARTITION BY genre ORDER BY reproducciones DESC, track_id) AS puesto FROM (SELECT ar.genre, t.id AS track_id, t.title, count(*) AS reproducciones FROM plays AS p INNER JOIN tracks AS t ON t.id = p.track_id INNER JOIN albums AS al ON al.id = t.album_id INNER JOIN artists AS ar ON ar.id = al.artist_id GROUP BY ar.genre, t.id, t.title) AS base) AS r WHERE puesto <= 3 ORDER BY genre, puesto;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "`LIMIT 3` cortaría el resultado completo. Para «tres por género» hay que numerar dentro de cada género y filtrar esa numeración.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Primero agrega: `count(*)` por canción, con el género que viene de `tracks` → `albums` → `artists`. Después, `row_number() OVER (PARTITION BY genre ORDER BY reproducciones DESC, track_id)`. El filtro por el puesto va en una consulta externa, porque una ventana no puede usarse en `WHERE`.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nWITH reproducciones_por_cancion AS (\n  SELECT ar.genre, t.id AS track_id, t.title, count(*) AS reproducciones\n  FROM plays AS p\n  INNER JOIN tracks AS t ON t.id = p.track_id\n  INNER JOIN albums AS al ON al.id = t.album_id\n  INNER JOIN artists AS ar ON ar.id = al.artist_id\n  GROUP BY ar.genre, t.id, t.title\n),\nranking AS (\n  SELECT genre, title, reproducciones,\n         ___() OVER (___ BY genre ORDER BY reproducciones DESC, track_id) AS puesto\n  FROM reproducciones_por_cancion\n)\nSELECT genre, puesto, title, reproducciones\nFROM ranking\nWHERE puesto ___ 3\nORDER BY genre, puesto;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "aggregation_level",
        description_md:
          "Usar `LIMIT 3` al final: devuelve tres filas en total, no tres por género.",
      },
      {
        category: "prohibited_pattern",
        description_md:
          "Intentar `WHERE row_number() OVER (...) <= 3`: las ventanas se calculan después del `WHERE`; hace falta una CTE o subconsulta.",
      },
      {
        category: "join_condition",
        description_md:
          "Unir `plays` directamente con `artists`: el camino es `plays` → `tracks` → `albums` → `artists`.",
      },
      {
        category: "cell_values",
        description_md:
          "Omitir el desempate por `track_id`: cuando dos canciones empatan, cuál entra al top queda indefinido.",
      },
    ],
    expert_explanation_md:
      "60 filas: tres canciones por cada uno de los 20 géneros del catálogo. La consulta hace lo mismo que harías en una planilla, pero en un solo paso: agregar, numerar dentro del grupo y cortar.\n\nEl orden de los pasos es lo que suele fallar. La numeración debe calcularse **después** del `count`, porque ordena por el conteo; y el filtro `puesto <= 3` debe ir **después** de la numeración, porque `WHERE` se evalúa antes que las ventanas. Por eso hay dos capas: la CTE `ranking` calcula y la consulta externa filtra. La versión con subconsulta en el `FROM` es equivalente; la CTE solo se lee mejor.\n\nCon `row_number()` cada género devuelve exactamente tres filas. Si el editorial quisiera ver a todos los empatados en el tercer lugar, bastaría cambiar a `rank()` o `dense_rank()` y aceptar que algunos géneros devuelvan más de tres canciones.\n\nLa diferencia de escala entre géneros es notable: corridos llega a 563 reproducciones en su canción más escuchada, mientras que forró apenas supera las 17. Un ranking por grupo evita que los géneros chicos desaparezcan detrás de los grandes, que es exactamente lo que pasaría con un top 3 global.",
    reward: defaultReward("advanced"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "primera-cancion-de-cada-oyente",
    section,
    title: "La primera canción de cada oyente",
    difficulty: "advanced",
    estimated_minutes: 13,
    concepts: ["ranking", "window_function", "cte", "inner_join", "where"],
    dataset,
    tables_used: ["plays", "users", "tracks", "albums", "artists"],
    scenario_md:
      "Producto estudia la primera experiencia de escucha: qué canción abre la relación de cada persona con Ritmo. Toma como referencia la cohorte que se dio de alta en marzo de 2025.",
    business_question_md:
      "Para los oyentes cuyo `signup_at` cae en marzo de 2025 (del 2025-03-01 inclusive al 2025-04-01 exclusivo), devuelve una fila por oyente con su **primera** reproducción: `user_id`, `played_at`, el título de la canción como `track` y el nombre del artista como `artista`. Si hubiera dos reproducciones con el mismo `played_at`, quédate con la de `plays.id` menor. Los oyentes sin reproducciones no aparecen. Ordena por `user_id`.",
    learning_objective:
      "Aplicar el patrón ROW_NUMBER = 1 por partición para quedarse con una sola fila por entidad.",
    theory_ref: topN,
    expected_columns: [
      { name: "user_id", type: "integer" },
      { name: "played_at", type: "timestamp" },
      { name: "track", type: "text" },
      { name: "artista", type: "text" },
    ],
    validation_rules: { order_matters: true, required_concepts: ["ranking"] },
    reference_solution:
      "WITH primeras AS (\n  SELECT\n    p.user_id,\n    p.played_at,\n    t.title AS track,\n    ar.name AS artista,\n    row_number() OVER (PARTITION BY p.user_id ORDER BY p.played_at, p.id) AS puesto\n  FROM plays AS p\n  INNER JOIN users AS u ON u.id = p.user_id\n  INNER JOIN tracks AS t ON t.id = p.track_id\n  INNER JOIN albums AS al ON al.id = t.album_id\n  INNER JOIN artists AS ar ON ar.id = al.artist_id\n  WHERE u.signup_at >= '2025-03-01'\n    AND u.signup_at < '2025-04-01'\n)\nSELECT user_id, played_at, track, artista\nFROM primeras\nWHERE puesto = 1\nORDER BY user_id;",
    hints: [
      {
        level: 1,
        body_md:
          "«Una fila por oyente, la más antigua» es el mismo patrón del top-N, con N = 1: numera dentro de cada oyente y quédate con el número 1.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "La ventana es `PARTITION BY p.user_id ORDER BY p.played_at, p.id`: ascendente, porque quieres la primera. El filtro de la cohorte (`signup_at`) va en el `WHERE` interno; el filtro del puesto, en la consulta externa.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nWITH primeras AS (\n  SELECT p.user_id, p.played_at, t.title AS track, ar.name AS artista,\n         ___() OVER (PARTITION BY ___ ORDER BY p.played_at, p.id) AS puesto\n  FROM plays AS p\n  INNER JOIN users AS u ON u.id = p.user_id\n  INNER JOIN tracks AS t ON t.id = p.track_id\n  INNER JOIN albums AS al ON al.id = t.album_id\n  INNER JOIN artists AS ar ON ar.id = al.artist_id\n  WHERE u.signup_at >= '___' AND u.signup_at < '___'\n)\nSELECT user_id, played_at, track, artista\nFROM primeras\nWHERE puesto = ___\nORDER BY user_id;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "wrong_order",
        description_md:
          "Ordenar la ventana con `DESC`: obtienes la última reproducción, no la primera.",
      },
      {
        category: "date_boundary",
        description_md:
          "Escribir `signup_at <= '2025-03-31'`: como `signup_at` es un timestamp, deja fuera casi todo el 31 de marzo. El patrón seguro es `>= inicio AND < inicio del mes siguiente`.",
      },
      {
        category: "duplicates",
        description_md:
          "No desempatar por `p.id`: `plays` contiene filas duplicadas y dos reproducciones del mismo instante devolverían un resultado distinto en cada ejecución.",
      },
      {
        category: "aggregation_level",
        description_md:
          "Usar `min(played_at)` agrupando por `user_id`: obtienes el instante, pero no puedes traer el título ni el artista de esa fila sin volver a unir.",
      },
    ],
    expert_explanation_md:
      "298 filas para una cohorte de 305 altas: siete personas se registraron en marzo de 2025 y nunca reprodujeron nada, y el `INNER JOIN` con `plays` las excluye sin que haga falta una condición extra.\n\nEste patrón —particionar, ordenar y quedarse con `puesto = 1`— es la forma estándar de responder «la fila más reciente / más antigua de cada entidad». La alternativa con `min(played_at)` agrupado devuelve el instante correcto, pero para recuperar la canción hay que volver a unir contra `plays`, y si dos reproducciones comparten instante aparecen las dos: más código y un riesgo de duplicados que aquí no existe.\n\nEl desempate por `p.id` no es decorativo: `plays` incluye duplicados exactos planteados a propósito, así que sin él la fila elegida podría cambiar entre ejecuciones.\n\nCuidado también con el rango de fechas: `signup_at` es un `timestamptz`, por eso el filtro usa un intervalo semiabierto en lugar de `BETWEEN`.",
    reward: defaultReward("advanced"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "desafio-top-3-artistas-por-mes-en-peru",
    section,
    title: "Desafío: top 3 artistas por mes en Perú",
    difficulty: "expert",
    estimated_minutes: 20,
    concepts: [
      "ranking",
      "window_function",
      "cte",
      "group_by",
      "aggregate",
      "inner_join",
      "date_functions",
    ],
    dataset,
    tables_used: ["plays", "users", "tracks", "albums", "artists"],
    scenario_md:
      "Dirección prepara el informe del mercado peruano y quiere ver cómo se movió el podio mes a mes durante 2025. Perú es el mercado más chico de Ritmo, así que los empates entre artistas son frecuentes: Dirección pide explícitamente que, si dos artistas empatan, aparezcan los dos y no quiere que una regla interna decida quién queda afuera.",
    business_question_md:
      "Considera las reproducciones de oyentes con `country = 'PE'` entre el 2025-01-01 inclusive y el 2025-09-01 exclusivo. Para cada mes (`mes`, primer día del mes como `date`), rankea a los artistas por cantidad de reproducciones descendente y devuelve los artistas que ocupan los **tres niveles de reproducciones más altos** del mes, con todos los empatados: `mes`, `puesto` (1, 2 o 3, sin saltos), `artista` (nombre del artista) y `reproducciones`. Un mes puede devolver más de tres filas: si dos artistas comparten cantidad de reproducciones, comparten puesto y aparecen los dos. Ordena por `mes`, `puesto` y `artista`.",
    learning_objective:
      "Combinar agregación por período con DENSE_RANK para un top-N por grupo que respeta empates.",
    theory_ref: topN,
    expected_columns: [
      { name: "mes", type: "date" },
      { name: "puesto", type: "integer" },
      { name: "artista", type: "text" },
      { name: "reproducciones", type: "integer" },
    ],
    validation_rules: {
      order_matters: true,
      required_concepts: ["ranking", "group_by", "date_functions"],
    },
    reference_solution:
      "WITH mensual AS (\n  SELECT\n    date_trunc('month', p.played_at)::date AS mes,\n    ar.name AS artista,\n    count(*) AS reproducciones\n  FROM plays AS p\n  INNER JOIN users AS u ON u.id = p.user_id\n  INNER JOIN tracks AS t ON t.id = p.track_id\n  INNER JOIN albums AS al ON al.id = t.album_id\n  INNER JOIN artists AS ar ON ar.id = al.artist_id\n  WHERE u.country = 'PE'\n    AND p.played_at >= '2025-01-01'\n    AND p.played_at < '2025-09-01'\n  GROUP BY mes, ar.id, ar.name\n),\nranking AS (\n  SELECT\n    mes,\n    artista,\n    reproducciones,\n    dense_rank() OVER (PARTITION BY mes ORDER BY reproducciones DESC) AS puesto\n  FROM mensual\n)\nSELECT mes, puesto, artista, reproducciones\nFROM ranking\nWHERE puesto <= 3\nORDER BY mes, puesto, artista;",
    hints: [
      {
        level: 1,
        body_md:
          "Son dos decisiones: cómo construir el mes a partir de un timestamp y qué función de ranking respeta los empates sin dejar huecos.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "`date_trunc('month', p.played_at)::date` da el primer día del mes. Agrega por mes y artista, y después numera con una ventana `PARTITION BY mes ORDER BY reproducciones DESC`. «Tres niveles sin saltos» describe a `dense_rank()`.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nWITH mensual AS (\n  SELECT date_trunc('___', p.played_at)::date AS mes, ar.name AS artista, count(*) AS reproducciones\n  FROM plays AS p\n  INNER JOIN users AS u ON u.id = p.user_id\n  INNER JOIN tracks AS t ON t.id = p.track_id\n  INNER JOIN albums AS al ON al.id = t.album_id\n  INNER JOIN artists AS ar ON ar.id = al.artist_id\n  WHERE u.country = '___'\n    AND p.played_at >= '2025-01-01' AND p.played_at < '2025-09-01'\n  GROUP BY mes, ar.id, ar.name\n),\nranking AS (\n  SELECT mes, artista, reproducciones,\n         ___() OVER (PARTITION BY ___ ORDER BY reproducciones DESC) AS puesto\n  FROM mensual\n)\nSELECT mes, puesto, artista, reproducciones\nFROM ranking\nWHERE puesto <= 3\nORDER BY mes, puesto, artista;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "cell_values",
        description_md:
          "Usar `row_number()`: devuelve 24 filas en vez de 27 porque numera 1, 2, 3 sin mirar los valores. En febrero de 2025 se queda con uno solo de los dos artistas que tienen 20 reproducciones (Los Cometas del Sur y Vereda y Aurora) y, como la ventana no tiene desempate, cuál de los dos sobrevive queda indefinido.",
      },
      {
        category: "cell_values",
        description_md:
          "Usar `rank()`: muestra a los empatados, pero salta la numeración después de un empate. En marzo y en junio de 2025 el empate está en el segundo nivel, así que el tercer nivel recibe el puesto 4 y el filtro `puesto <= 3` lo deja afuera: el informe pierde a Viento y Astro y a Andénón y esos meses quedan con tres filas en lugar de cuatro.",
      },
      {
        category: "aggregation_level",
        description_md:
          "Agrupar solo por `ar.name` sin el mes: el ranking deja de ser mensual y se vuelve un acumulado del año.",
      },
      {
        category: "date_boundary",
        description_md:
          "Filtrar con `BETWEEN '2025-01-01' AND '2025-08-31'`: `played_at` es un timestamp y el último día queda casi entero afuera.",
      },
      {
        category: "missing_filter",
        description_md:
          "Filtrar por `artists.country = 'PE'` en lugar de `users.country`: el informe es del mercado peruano, no de los artistas peruanos.",
      },
    ],
    expert_explanation_md:
      "27 filas para ocho meses: cinco meses devuelven tres artistas y tres meses devuelven cuatro, porque hay un empate dentro de los tres niveles más altos. Perú es el mercado más chico de Ritmo (397 oyentes), y con denominadores chicos los empates dejan de ser una hipótesis de manual.\n\nLos tres empates del período:\n\n| Mes | Nivel empatado | Artistas | Reproducciones | Nivel siguiente |\n| --- | --- | --- | --- | --- |\n| 2025-02 | 3.º | Los Cometas del Sur y Vereda y Aurora | 20 | Viento y Astro (19) |\n| 2025-03 | 2.º | Los Cometas del Sur y Marea y Tormenta | 30 | Viento y Astro (29) |\n| 2025-06 | 2.º | Selvaú y Vereda y Aurora | 38 | Andénón (33) |\n\nSobre estos datos las tres funciones devuelven conjuntos distintos: `dense_rank()` 27 filas, `rank()` 25 y `row_number()` 24. Marzo de 2025 alcanza para verlas lado a lado:\n\n| Artista | Reproducciones | `row_number` | `rank` | `dense_rank` |\n| --- | --- | --- | --- | --- |\n| Lluvia Clandestina | 39 | 1 | 1 | 1 |\n| Marea y Tormenta | 30 | 2 | 2 | 2 |\n| Los Cometas del Sur | 30 | 3 | 2 | 2 |\n| Viento y Astro | 29 | 4 | 4 | 3 |\n\nCon el filtro `puesto <= 3`: `row_number()` devuelve tres filas y le pone un puesto 3 a Los Cometas del Sur, que tiene exactamente las mismas 30 reproducciones que el segundo (y el 2 y el 3 son intercambiables: nada en la ventana desempata a esos dos, así que la elección puede cambiar entre ejecuciones). `rank()` muestra bien el empate, pero salta al 4 y deja a Viento y Astro —el tercer nivel real— fuera del informe. `dense_rank()` devuelve los cuatro artistas de los tres niveles más altos, que es lo que pidió Dirección. Junio se comporta igual: `rank()` pierde a Andénón.\n\nFebrero es el caso complementario: el empate está en el tercer nivel, así que `rank()` y `dense_rank()` coinciden en las mismas cuatro filas y la que falla es `row_number()`, que se queda con uno solo de los dos artistas de 20 reproducciones. Entre los tres meses queda claro qué cuenta cada función: `row_number()` cuenta filas, `rank()` cuenta cuántos artistas hay por encima y `dense_rank()` cuenta niveles de reproducciones. El pedido habla de niveles, así que `dense_rank()` no es una preferencia de estilo: es la única de las tres que responde la pregunta.\n\nEl podio también dice algo del negocio: Lluvia Clandestina encabeza los ocho meses y pasa de 28 reproducciones en enero a 78 en julio, mientras el resto del podio rota entre Marea y Tormenta, Andénón, Vereda y Aurora, Selvaú, Barranca Naranja y Astro Austral.\n\nDos detalles hacen que el informe sea correcto: el mes se construye con `date_trunc` sobre `played_at` (no sobre `signup_at`), y el filtro de mercado es `users.country`, el país de quien escucha. El `GROUP BY mes, ar.id, ar.name` incluye el `id` para que dos artistas homónimos no se fusionen; con nombres únicos el resultado es el mismo, pero la intención queda explícita.\n\nSobre el rendimiento: la agregación recorre las reproducciones una sola vez y la ventana ordena un conjunto ya reducido a unos cientos de filas. Rankear antes de agregar sería mucho más caro y, además, incorrecto.",
    reward: defaultReward("expert"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
];
