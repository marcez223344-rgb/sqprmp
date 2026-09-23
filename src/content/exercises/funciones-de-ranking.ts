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
      "En **Ritmo**, el departamento de Contenidos está armando la portada del género reguetón y necesita la lista de artistas ya numerada por audiencia, lista para publicar. Te piden esa numeración porque el sitio la muestra tal cual la devuelve la consulta.",
    business_question_md:
      "Debes generar un dataset que, tomando los artistas cuyo `genre` es igual al texto `'reguetón'`, devuelva el número de puesto correlativo bajo el encabezado `posicion`, donde el 1 corresponde al artista con mayor `monthly_listeners`, junto con el `name`, el `country` y el `monthly_listeners`. Si dos artistas empatan en audiencia, debes desempatar usando `name` ascendente, de modo que el que va antes alfabéticamente reciba el puesto menor. Ordena el resultado por `posicion`.",
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
          "La cláusula `ORDER BY` ordena las filas, pero no crea ninguna columna con el número de puesto. Esa columna la produce una función de ranking.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "La función `row_number()` siempre necesita una cláusula `OVER (ORDER BY ...)`. Dentro de la ventana, ordena por `monthly_listeners` de forma descendente y agrega `name` como segundo criterio, para que el desempate sea estable.",
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
          "Escribir `row_number()` sin la cláusula `OVER`: PostgreSQL responde con el error «window function row_number requires an OVER clause».",
      },
      {
        category: "wrong_order",
        description_md:
          "Ordenar la ventana de forma ascendente: el puesto 1 queda para el artista con menos oyentes, que es lo contrario de lo que pidió Contenidos.",
      },
      {
        category: "cell_values",
        description_md:
          "No agregar el desempate por `name`: dos artistas empatados pueden intercambiar puestos entre una ejecución y la siguiente.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 20 artistas de reguetón, numerados del 1 al 20. La función `row_number()` entrega una secuencia sin repeticiones ni saltos, que es justo lo que necesita una portada: un puesto por artista.\n\nEl desempate importa: los artistas «Sierra Insomne» y «Sierra y Costa» tienen 2938 oyentes mensuales cada uno. Sin el segundo criterio, PostgreSQL elegiría el orden entre ellos de forma arbitraria y la portada podría cambiar de una carga a otra sin que los datos hayan cambiado.\n\nLa cláusula `ORDER BY` final es independiente del orden declarado dentro de la ventana: podrías numerar por audiencia y mostrar el resultado por país sin alterar los puestos asignados.",
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
      "Antes de publicar la portada, el departamento de Contenidos está discutiendo cómo mostrar los empates: si dos artistas comparten audiencia, hay que decidir si el siguiente queda tercero o cuarto. Para resolverlo quieren ver las dos numeraciones una al lado de la otra, y te piden esa comparación.",
    business_question_md:
      "Debes generar un dataset que, tomando los artistas cuyo `genre` es igual al texto `'reguetón'`, devuelva el `name`, el `monthly_listeners`, el puesto con saltos bajo el encabezado `puesto` y el puesto sin saltos bajo el encabezado `puesto_denso`, los dos calculados sobre `monthly_listeners` descendente. Ordena por `puesto` y, dentro de un mismo puesto, debes desempatar usando `name` ascendente.",
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
          "Las dos funciones le dan el mismo puesto a los artistas empatados; se diferencian en qué número recibe el artista que viene después del empate.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "La función `rank()` salta números después de un empate, produciendo una secuencia como 12, 12, 14, y la función `dense_rank()` no salta, produciendo 12, 12, 13. Las dos usan exactamente la misma ventana: `OVER (ORDER BY monthly_listeners DESC)`.",
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
          "Usar la función `row_number()` en alguna de las dos columnas: rompe el empate en lugar de mostrarlo, que es justamente lo que el ejercicio quiere comparar.",
      },
      {
        category: "cell_values",
        description_md:
          "Agregar un desempate, como `, name`, dentro de la ventana: elimina los empates y las dos columnas quedan idénticas.",
      },
      {
        category: "wrong_order",
        description_md:
          "Ordenar el resultado solamente por `puesto`: dentro de un empate el orden de las filas queda indefinido.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 20 filas. Los artistas «Sierra Insomne» y «Sierra y Costa» comparten 2938 oyentes, así que los dos reciben el puesto 12 en las dos columnas. La diferencia aparece en la fila siguiente, «Los Ceibos Violeta», que queda en el puesto 14 con `rank` y en el 13 con `dense_rank`.\n\nLa elección entre una y otra no es una cuestión de estilo: la función `rank` responde a la pregunta «cuántos artistas están por encima», que es el clásico puesto deportivo, y la función `dense_rank` responde a «cuántos niveles de audiencia distintos hay por encima». Si el reporte promete mostrar «los tres primeros puestos», con `rank` podrían salir cinco artistas y con `dense_rank` todavía más.\n\nEl desempate del `ORDER BY` final es lo que hace reproducible la salida: la ventana ya declaró que los dos artistas son iguales, así que el orden entre ellos tiene que fijarlo la consulta.",
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
      "El departamento de Marketing quiere entender la concentración del consumo en Chile antes de diseñar una campaña de fidelización: necesita saber cuánto escucha el 25 % más activo comparado con el resto. Te piden ese corte por cuartiles para decidir a qué segmento dirigir la campaña.",
    business_question_md:
      "Debes generar un dataset que considere solamente a los oyentes cuyo `country` es igual al texto `'CL'` y que tengan al menos una reproducción. Cuenta las reproducciones de cada uno, repártelos en cuatro bloques de tamaño parejo ordenados por cantidad de reproducciones descendente, desempatando por `user_id` ascendente, y devuelve por bloque el `cuartil`, la cantidad de oyentes bajo el encabezado `oyentes`, el valor mínimo bajo el encabezado `minimo`, el valor máximo bajo el encabezado `maximo` y el promedio de reproducciones bajo el encabezado `promedio`, con 2 decimales. Ordena por `cuartil` ascendente.",
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
          "Son tres pasos: contar las reproducciones por oyente, asignar el bloque a cada oyente y recién después describir cada bloque. Usar una expresión de tabla común por paso mantiene la consulta legible.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "La expresión `ntile(4) OVER (ORDER BY reproducciones DESC, user_id)` reparte los oyentes ya agregados en cuatro bloques. La consulta final agrupa por esa columna y aplica las funciones `count`, `min`, `max` y `avg`.",
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
          "Aplicar `ntile(4)` directamente sobre la tabla `plays`: la consulta segmenta reproducciones y no oyentes, que es lo que pidió Marketing.",
      },
      {
        category: "wrong_order",
        description_md:
          "Ordenar la ventana de forma ascendente: el cuartil 1 pasa a ser el de menor consumo y la lectura del reporte se invierte.",
      },
      {
        category: "missing_filter",
        description_md:
          "Olvidar la condición `country = 'CL'`: los cuartiles se calculan sobre los seis mercados juntos y dejan de describir a Chile.",
      },
      {
        category: "cell_values",
        description_md:
          "No redondear la columna `promedio` a 2 decimales: las celdas salen con todos los decimales que calcula el motor.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta muestra que los 454 oyentes chilenos con al menos una reproducción se reparten en bloques de 114, 114, 113 y 113: cuando la división no es exacta, la función `ntile` le da una fila extra a los primeros bloques.\n\nEl resultado muestra una concentración típica del streaming: el cuartil 1 promedia 75,68 reproducciones y llega a 515, mientras que el cuartil 4 promedia 2,22. Marketing puede leerlo directamente: el 25 % más activo explica la mayor parte del consumo.\n\nPresta atención al borde entre bloques: el máximo del cuartil 2, que es 19, coincide con el mínimo del cuartil 1, porque la función `ntile` corta por cantidad de filas y no por valor. Si el negocio necesita que dos oyentes con el mismo consumo caigan siempre en el mismo segmento, el criterio debe ser un umbral escrito con `CASE` o una función como `percent_rank()`.\n\nEl `INNER JOIN` con la tabla `users` solo sirve para filtrar por país; como la consulta parte de `plays`, los oyentes sin reproducciones quedan fuera sin necesidad de ninguna condición adicional.",
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
      "El departamento Editorial está armando una lista destacada por género y pide las tres canciones más reproducidas de cada uno, con su cantidad de reproducciones. Te piden ese ranking para publicar las listas de la próxima semana.",
    business_question_md:
      "Debes generar un dataset que cuente todas las reproducciones de la tabla `plays` por canción y se quede con las tres más reproducidas de cada género del artista. Devuelve el `genre`, el `puesto`, que vale 1, 2 o 3 dentro de cada género, el `title` y la cantidad de reproducciones bajo el encabezado `reproducciones`. Si dos canciones del mismo género empatan, debes desempatar usando `tracks.id` ascendente, y cada género debe devolver exactamente tres filas. Ordena por `genre` y después por `puesto`.",
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
          "La cláusula `LIMIT 3` cortaría el resultado completo. Para obtener tres canciones por género hay que numerar dentro de cada género y después filtrar esa numeración.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Primero agrega con `count(*)` por canción, trayendo el género por el camino que va de `tracks` a `albums` y de ahí a `artists`. Después aplica `row_number() OVER (PARTITION BY genre ORDER BY reproducciones DESC, track_id)`. El filtro por el puesto va en una consulta externa, porque una función de ventana no puede usarse dentro de la cláusula `WHERE`.",
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
          "Usar la cláusula `LIMIT 3` al final: la consulta devuelve tres filas en total y no tres por cada género.",
      },
      {
        category: "prohibited_pattern",
        description_md:
          "Intentar escribir `WHERE row_number() OVER (...) <= 3`: las funciones de ventana se calculan después del `WHERE`, así que hace falta una expresión de tabla común o una subconsulta.",
      },
      {
        category: "join_condition",
        description_md:
          "Unir la tabla `plays` directamente con `artists`: el camino correcto va de `plays` a `tracks`, de ahí a `albums` y de ahí a `artists`.",
      },
      {
        category: "cell_values",
        description_md:
          "Omitir el desempate por `track_id`: cuando dos canciones empatan en reproducciones, cuál de las dos entra al top queda indefinido.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 60 filas: tres canciones por cada uno de los 20 géneros del catálogo. La consulta hace lo mismo que harías en una planilla, pero en un solo paso: agregar, numerar dentro de cada grupo y cortar.\n\nEl orden de los pasos es lo que suele fallar. La numeración debe calcularse **después** del conteo, porque ordena por ese conteo; y el filtro `puesto <= 3` debe ir **después** de la numeración, porque la cláusula `WHERE` se evalúa antes que las funciones de ventana. Por eso hay dos capas: la expresión `ranking` calcula y la consulta externa filtra. La versión con subconsulta en el `FROM` es equivalente; la expresión de tabla común solamente se lee mejor.\n\nCon `row_number()` cada género devuelve exactamente tres filas. Si el equipo Editorial quisiera ver a todos los empatados en el tercer lugar, bastaría con cambiar a `rank()` o a `dense_rank()` y aceptar que algunos géneros devuelvan más de tres canciones.\n\nLa diferencia de escala entre géneros es notable: el género corridos llega a 563 reproducciones en su canción más escuchada, mientras que el forró apenas supera las 17. Un ranking por grupo evita que los géneros chicos desaparezcan detrás de los grandes, que es exactamente lo que pasaría con un top 3 calculado sobre todo el catálogo.",
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
      "El departamento de Producto está estudiando la primera experiencia de escucha: qué canción abre la relación de cada persona con **Ritmo**. Como referencia toma la cohorte de personas que se dieron de alta en marzo de 2025, y te pide ese listado para analizar qué géneros funcionan mejor como puerta de entrada.",
    business_question_md:
      "Debes generar un dataset que, para los oyentes cuya columna `signup_at` cae en marzo de 2025, es decir desde el `'2025-03-01'` inclusive hasta el `'2025-04-01'` exclusivo, devuelva una fila por oyente con su **primera** reproducción: el `user_id`, el `played_at`, el título de la canción bajo el encabezado `track` y el nombre del artista bajo el encabezado `artista`. Si un oyente tuviera dos reproducciones con el mismo `played_at`, debes desempatar usando `plays.id` ascendente. Los oyentes sin reproducciones no deben aparecer. Ordena por `user_id` ascendente.",
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
          "«Una fila por oyente, la más antigua» es el mismo patrón del top-N, con N igual a 1: numera dentro de cada oyente y quédate con el número 1.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "La ventana se escribe como `PARTITION BY p.user_id ORDER BY p.played_at, p.id`, en orden ascendente, porque quieres la primera reproducción. El filtro de la cohorte, sobre `signup_at`, va en la cláusula `WHERE` interna; el filtro del puesto va en la consulta externa.",
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
          "Ordenar la ventana con `DESC`: la consulta devuelve la última reproducción de cada oyente y no la primera.",
      },
      {
        category: "date_boundary",
        description_md:
          "Escribir `signup_at <= '2025-03-31'`: como la columna `signup_at` es una marca de tiempo, esa condición deja fuera casi todo el 31 de marzo. El patrón seguro es «mayor o igual que el inicio y menor que el inicio del mes siguiente».",
      },
      {
        category: "duplicates",
        description_md:
          "No desempatar por `p.id`: la tabla `plays` contiene filas duplicadas a propósito, y dos reproducciones del mismo instante devolverían un resultado distinto en cada ejecución.",
      },
      {
        category: "aggregation_level",
        description_md:
          "Usar `min(played_at)` agrupando por `user_id`: obtienes el instante correcto, pero no puedes traer el título ni el artista de esa fila sin volver a unir contra la tabla.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 298 filas para una cohorte de 305 altas: siete personas se registraron en marzo de 2025 y nunca reprodujeron nada, y el `INNER JOIN` con la tabla `plays` las excluye sin que haga falta ninguna condición extra.\n\nEste patrón, que consiste en particionar, ordenar y quedarse con la fila cuyo puesto es 1, es la forma estándar de responder «la fila más reciente o más antigua de cada entidad». La alternativa con `min(played_at)` agrupado devuelve el instante correcto, pero para recuperar la canción hay que volver a unir contra `plays`, y si dos reproducciones comparten instante aparecen las dos: es más código y trae un riesgo de duplicados que acá no existe.\n\nEl desempate por `p.id` no es decorativo: la tabla `plays` incluye duplicados exactos planteados a propósito, así que sin él la fila elegida podría cambiar entre ejecuciones.\n\nTen cuidado también con el rango de fechas: la columna `signup_at` es de tipo `timestamptz`, y por eso el filtro usa un intervalo semiabierto en lugar del operador `BETWEEN`.",
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
      "La dirección de **Ritmo** está preparando el informe del mercado peruano y quiere ver cómo se movió el podio mes a mes durante 2025. Perú es el mercado más chico de la plataforma, así que los empates entre artistas son frecuentes: la dirección pide explícitamente que, si dos artistas empatan, aparezcan los dos, y no quiere que una regla interna decida quién queda afuera. Te piden ese informe con esa condición.",
    business_question_md:
      "Debes generar un dataset que considere las reproducciones de oyentes cuyo `country` es igual al texto `'PE'`, entre el `'2025-01-01'` inclusive y el `'2025-09-01'` exclusivo. Para cada mes, representado por el primer día del mes con tipo `date` bajo el encabezado `mes`, asigna un puesto a los artistas por cantidad de reproducciones descendente y devuelve los artistas que ocupan los **tres niveles de reproducciones más altos** del mes, incluyendo a todos los empatados, con el `mes`, el `puesto`, que vale 1, 2 o 3 y no debe tener saltos, el nombre del artista bajo el encabezado `artista` y la cantidad bajo el encabezado `reproducciones`. Un mes puede devolver más de tres filas: si dos artistas comparten la misma cantidad de reproducciones, comparten puesto y aparecen los dos. Ordena por `mes`, después por `puesto` y después por `artista`.",
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
          "Son dos decisiones distintas: cómo construir el mes a partir de una marca de tiempo y qué función de ranking respeta los empates sin dejar huecos en la numeración.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "La expresión `date_trunc('month', p.played_at)::date` da el primer día del mes. Agrega por mes y por artista, y después numera con una ventana `PARTITION BY mes ORDER BY reproducciones DESC`. La frase «tres niveles sin saltos» describe exactamente a la función `dense_rank()`.",
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
          "Usar la función `row_number()`: devuelve 24 filas en lugar de 27, porque numera 1, 2 y 3 sin mirar los valores. En febrero de 2025 se queda con uno solo de los dos artistas que tienen 20 reproducciones, «Los Cometas del Sur» y «Vereda y Aurora», y como la ventana no tiene desempate, cuál de los dos sobrevive queda indefinido.",
      },
      {
        category: "cell_values",
        description_md:
          "Usar la función `rank()`: muestra a los empatados, pero salta la numeración después de un empate. En marzo y en junio de 2025 el empate está en el segundo nivel, así que el tercer nivel recibe el puesto 4 y el filtro `puesto <= 3` lo deja afuera: el informe pierde a «Viento y Astro» y a «Andénón», y esos meses quedan con tres filas en lugar de cuatro.",
      },
      {
        category: "aggregation_level",
        description_md:
          "Agrupar solamente por `ar.name` sin incluir el mes: el ranking deja de ser mensual y se convierte en un acumulado del año.",
      },
      {
        category: "date_boundary",
        description_md:
          "Filtrar con `BETWEEN '2025-01-01' AND '2025-08-31'`: la columna `played_at` es una marca de tiempo y el último día queda casi entero afuera.",
      },
      {
        category: "missing_filter",
        description_md:
          "Filtrar por `artists.country = 'PE'` en lugar de por `users.country`: el informe es sobre el mercado peruano, es decir sobre quiénes escuchan, y no sobre los artistas peruanos.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 27 filas para ocho meses: cinco meses devuelven tres artistas y tres meses devuelven cuatro, porque hay un empate dentro de los tres niveles más altos. Perú es el mercado más chico de Ritmo, con 397 oyentes, y con denominadores tan chicos los empates dejan de ser una hipótesis de manual.\n\nLos tres empates del período son los siguientes:\n\n| Mes | Nivel empatado | Artistas | Reproducciones | Nivel siguiente |\n| --- | --- | --- | --- | --- |\n| 2025-02 | 3.º | Los Cometas del Sur y Vereda y Aurora | 20 | Viento y Astro (19) |\n| 2025-03 | 2.º | Los Cometas del Sur y Marea y Tormenta | 30 | Viento y Astro (29) |\n| 2025-06 | 2.º | Selvaú y Vereda y Aurora | 38 | Andénón (33) |\n\nSobre estos datos, las tres funciones devuelven conjuntos distintos: `dense_rank()` devuelve 27 filas, `rank()` devuelve 25 y `row_number()` devuelve 24. Marzo de 2025 alcanza para verlas una al lado de la otra:\n\n| Artista | Reproducciones | `row_number` | `rank` | `dense_rank` |\n| --- | --- | --- | --- | --- |\n| Lluvia Clandestina | 39 | 1 | 1 | 1 |\n| Marea y Tormenta | 30 | 2 | 2 | 2 |\n| Los Cometas del Sur | 30 | 3 | 2 | 2 |\n| Viento y Astro | 29 | 4 | 4 | 3 |\n\nCon el filtro `puesto <= 3`, la función `row_number()` devuelve tres filas y le pone el puesto 3 a «Los Cometas del Sur», que tiene exactamente las mismas 30 reproducciones que el segundo; además, el 2 y el 3 son intercambiables, porque nada en la ventana desempata a esos dos y la elección puede cambiar entre ejecuciones. La función `rank()` muestra bien el empate, pero salta al 4 y deja a «Viento y Astro», que es el tercer nivel real, fuera del informe. La función `dense_rank()` devuelve los cuatro artistas de los tres niveles más altos, que es lo que pidió la dirección. Junio se comporta igual: con `rank()` se pierde a «Andénón».\n\nFebrero es el caso complementario: el empate está en el tercer nivel, así que `rank()` y `dense_rank()` coinciden en las mismas cuatro filas y la que falla es `row_number()`, que se queda con uno solo de los dos artistas de 20 reproducciones. Entre los tres meses queda claro qué cuenta cada función: `row_number()` cuenta filas, `rank()` cuenta cuántos artistas hay por encima y `dense_rank()` cuenta niveles de reproducciones. El pedido habla de niveles, así que usar `dense_rank()` no es una preferencia de estilo: es la única de las tres que responde la pregunta.\n\nEl podio también dice algo del negocio: «Lluvia Clandestina» encabeza los ocho meses y pasa de 28 reproducciones en enero a 78 en julio, mientras el resto del podio rota entre «Marea y Tormenta», «Andénón», «Vereda y Aurora», «Selvaú», «Barranca Naranja» y «Astro Austral».\n\nDos detalles hacen que el informe sea correcto: el mes se construye con `date_trunc` sobre la columna `played_at` y no sobre `signup_at`, y el filtro de mercado se aplica sobre `users.country`, es decir el país de quien escucha. La cláusula `GROUP BY mes, ar.id, ar.name` incluye el identificador para que dos artistas con el mismo nombre no se fusionen; con nombres únicos el resultado es el mismo, pero la intención queda explícita.\n\nSobre el rendimiento: la agregación recorre las reproducciones una sola vez y la ventana ordena un conjunto ya reducido a unos cientos de filas. Asignar los puestos antes de agregar sería mucho más caro y, además, incorrecto.",
    reward: defaultReward("expert"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
];
