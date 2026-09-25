import type { QuestionDef } from "../schemas/question";

const section = "funciones-de-ranking";
const basicas = "ranking-row-number-rank-dense-rank";
const topN = "ranking-top-n-por-grupo";
const ntile = "ranking-ntile-y-segmentos";

export const questions: QuestionDef[] = [
  {
    slug: "rk-q01-que-funcion-salta",
    section,
    lesson: basicas,
    type: "single",
    difficulty: "easy",
    topic: "RANK, DENSE_RANK y ROW_NUMBER",
    tags: ["ranking", "window_function"],
    estimated_seconds: 45,
    prompt_md:
      "Dos filas empatan en el puesto 12 y la siguiente recibe el 14. ¿Qué función de ranking se usó?",
    options: [
      { key: "a", body_md: "`rank()`", is_correct: true },
      {
        key: "b",
        body_md: "`dense_rank()`",
        is_correct: false,
        why_incorrect_md: "`dense_rank()` no salta números: la siguiente fila recibiría el 13.",
      },
      {
        key: "c",
        body_md: "`row_number()`",
        is_correct: false,
        why_incorrect_md:
          "`row_number()` nunca repite un número: las dos filas empatadas recibirían 12 y 13.",
      },
      {
        key: "d",
        body_md: "`ntile(12)`",
        is_correct: false,
        why_incorrect_md:
          "`ntile(n)` devuelve el número de bloque (entre 1 y n), no un puesto individual.",
      },
    ],
    explanation_md:
      "`rank()` asigna el mismo puesto a los empatados y deja un hueco del tamaño del empate: 12, 12, 14.",
    is_published: true,
  },
  {
    slug: "rk-q02-over-obligatorio",
    section,
    lesson: basicas,
    type: "true_false",
    difficulty: "easy",
    topic: "Sintaxis de las funciones de ranking",
    tags: ["ranking", "window_function"],
    estimated_seconds: 30,
    prompt_md:
      "`row_number()` puede escribirse sin la cláusula `OVER` si la consulta ya tiene `ORDER BY`.",
    options: [
      {
        key: "a",
        body_md: "Falso",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Verdadero",
        is_correct: false,
        why_incorrect_md:
          "El `ORDER BY` de la consulta ordena el resultado, pero no define una ventana. Sin `OVER`, PostgreSQL responde `window function row_number requires an OVER clause`.",
      },
    ],
    explanation_md:
      "Toda función de ranking es una función de ventana: necesita `OVER (...)`, y ahí adentro va el `ORDER BY` que decide la numeración.",
    is_published: true,
  },
  {
    slug: "rk-q03-lectura-dense-rank",
    section,
    lesson: basicas,
    type: "query_interpretation",
    difficulty: "intermediate",
    topic: "Lectura de consultas",
    tags: ["ranking", "window_function"],
    estimated_seconds: 60,
    prompt_md:
      "Los valores de `monthly_listeners`, ya ordenados, son 9000, 7000, 7000 y 5000. ¿Qué devuelve la columna `puesto`?",
    code_md:
      "```sql\nSELECT name, dense_rank() OVER (ORDER BY monthly_listeners DESC) AS puesto\nFROM artists;\n```",
    options: [
      { key: "a", body_md: "1, 2, 2, 3", is_correct: true },
      {
        key: "b",
        body_md: "1, 2, 2, 4",
        is_correct: false,
        why_incorrect_md: "Ese sería el resultado de `rank()`, que salta después del empate.",
      },
      {
        key: "c",
        body_md: "1, 2, 3, 4",
        is_correct: false,
        why_incorrect_md: "Ese sería `row_number()`, que ignora el empate.",
      },
      {
        key: "d",
        body_md: "1, 1, 2, 3",
        is_correct: false,
        why_incorrect_md:
          "El empate es entre la segunda y la tercera fila, no entre la primera y la segunda.",
      },
    ],
    explanation_md:
      "`dense_rank()` da el mismo puesto a los valores iguales y continúa con el número siguiente, sin dejar huecos.",
    is_published: true,
  },
  {
    slug: "rk-q04-funcion-de-segmentos",
    section,
    lesson: ntile,
    type: "fill_blank",
    difficulty: "easy",
    topic: "NTILE",
    tags: ["ranking", "window_function"],
    estimated_seconds: 35,
    prompt_md:
      "Completa el nombre de la función que reparte las filas ordenadas en cuatro bloques de tamaño parejo: `___(4) OVER (ORDER BY reproducciones DESC)`. Escribe solo el nombre.",
    answer: { accepted: ["ntile", "ntile(4)"], case_sensitive: false },
    explanation_md:
      "`ntile(n)` asigna a cada fila un número de bloque entre 1 y n según su posición en el orden declarado.",
    is_published: true,
  },
  {
    slug: "rk-q05-ranking-en-where",
    section,
    lesson: topN,
    type: "error_diagnosis",
    difficulty: "intermediate",
    topic: "Orden de evaluación",
    tags: ["ranking", "cte", "where"],
    estimated_seconds: 60,
    prompt_md:
      "La consulta falla con `window functions are not allowed in WHERE`. ¿Cuál es la corrección adecuada?",
    code_md:
      "```sql\nSELECT genre, title, row_number() OVER (PARTITION BY genre ORDER BY n DESC) AS puesto\nFROM catalogo\nWHERE row_number() OVER (PARTITION BY genre ORDER BY n DESC) <= 3;\n```",
    options: [
      {
        key: "a",
        body_md:
          "Calcular el puesto en una CTE o subconsulta y filtrar `puesto <= 3` en la consulta externa.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Reemplazar `WHERE` por `HAVING`.",
        is_correct: false,
        why_incorrect_md:
          "`HAVING` se evalúa antes que las ventanas, así que tampoco puede usar su resultado.",
      },
      {
        key: "c",
        body_md: "Agregar `LIMIT 3` al final y quitar el `WHERE`.",
        is_correct: false,
        why_incorrect_md: "`LIMIT 3` corta el resultado completo, no tres filas por género.",
      },
      {
        key: "d",
        body_md: "Filtrar por el alias: `WHERE puesto <= 3`.",
        is_correct: false,
        why_incorrect_md:
          "El alias del `SELECT` tampoco está disponible en `WHERE`: se resuelve después.",
      },
    ],
    explanation_md:
      "`WHERE` y `HAVING` se evalúan antes que las funciones de ventana. Para filtrar por un puesto hay que calcularlo en una capa previa (CTE o subconsulta) y filtrar afuera.",
    is_published: true,
  },
  {
    slug: "rk-q06-top-n-por-grupo",
    section,
    lesson: topN,
    type: "scenario",
    difficulty: "intermediate",
    topic: "Top-N por grupo",
    tags: ["ranking", "cte"],
    estimated_seconds: 60,
    prompt_md:
      "Te piden «las 3 canciones más reproducidas de cada género» sobre una tabla que ya tiene género, canción y reproducciones. ¿Cuál es el enfoque correcto?",
    options: [
      {
        key: "a",
        body_md:
          "Numerar con `row_number() OVER (PARTITION BY genre ORDER BY reproducciones DESC)` y filtrar el puesto en una capa externa.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "`ORDER BY genre, reproducciones DESC LIMIT 3`.",
        is_correct: false,
        why_incorrect_md: "Devuelve tres filas en total, todas del primer género.",
      },
      {
        key: "c",
        body_md: "`GROUP BY genre` con `max(reproducciones)`.",
        is_correct: false,
        why_incorrect_md:
          "Da una sola fila por género, y además pierde el título de la canción salvo que se vuelva a unir.",
      },
      {
        key: "d",
        body_md:
          "Numerar con `dense_rank() OVER (ORDER BY reproducciones DESC)`, sin `PARTITION BY`, y filtrar el puesto en una capa externa.",
        is_correct: false,
        why_incorrect_md:
          "Sin `PARTITION BY` el ranking es uno solo para todo el catálogo: devuelve las canciones con las tres cantidades de reproducciones más altas en general, no tres por género.",
      },
    ],
    explanation_md:
      "El patrón top-N por grupo es siempre el mismo: particionar por el grupo, ordenar por la métrica y filtrar el puesto fuera de la ventana.",
    is_published: true,
  },
  {
    slug: "rk-q07-relacionar-funciones",
    section,
    lesson: basicas,
    type: "matching",
    difficulty: "easy",
    topic: "Qué devuelve cada función",
    tags: ["ranking", "window_function"],
    estimated_seconds: 75,
    prompt_md: "Relaciona cada función con lo que devuelve.",
    code_md: null,
    pairs: [
      {
        left: "row_number()",
        right: "Numeración correlativa sin repetir, aunque haya empates",
      },
      { left: "rank()", right: "Mismo puesto para los empatados y saltos posteriores" },
      { left: "dense_rank()", right: "Mismo puesto para los empatados y sin saltos" },
      { left: "ntile(4)", right: "Número de bloque entre 1 y 4 según la posición de la fila" },
    ],
    explanation_md:
      "Las tres primeras numeran filas y se diferencian solo ante empates; `ntile` no numera puestos: reparte las filas en bloques.",
    is_published: true,
  },
  {
    slug: "rk-q08-propiedades-de-ntile",
    section,
    lesson: ntile,
    type: "multiple",
    difficulty: "intermediate",
    topic: "Comportamiento de NTILE",
    tags: ["ranking", "window_function"],
    estimated_seconds: 80,
    prompt_md:
      "Aplicas `ntile(4) OVER (ORDER BY reproducciones DESC, user_id)` sobre 454 oyentes. ¿Qué afirmaciones son correctas? (Varias respuestas)",
    options: [
      {
        key: "a",
        body_md: "Los bloques quedan de 114, 114, 113 y 113 oyentes.",
        is_correct: true,
      },
      {
        key: "b",
        body_md:
          "Dos oyentes con la misma cantidad de reproducciones pueden caer en bloques distintos.",
        is_correct: true,
      },
      {
        key: "c",
        body_md: "El bloque 1 es el de mayor consumo.",
        is_correct: true,
      },
      {
        key: "d",
        body_md: "Todos los bloques cubren el mismo rango de reproducciones.",
        is_correct: false,
        why_incorrect_md:
          "`ntile` iguala la cantidad de filas, no el rango de valores: con distribuciones concentradas los rangos son muy distintos.",
      },
      {
        key: "e",
        body_md: "Los empates siempre quedan en el mismo bloque.",
        is_correct: false,
        why_incorrect_md:
          "El corte se hace por posición: si cae entre dos filas de igual valor, las separa.",
      },
    ],
    explanation_md:
      "Cuando la división no es exacta, los primeros bloques reciben una fila más. El orden `DESC` pone al bloque 1 arriba, y el reparto por posición puede separar empates.",
    is_published: true,
  },
  {
    slug: "rk-q09-partition-reinicia",
    section,
    lesson: topN,
    type: "query_interpretation",
    difficulty: "intermediate",
    topic: "PARTITION BY en el ranking",
    tags: ["ranking", "window_function"],
    estimated_seconds: 55,
    prompt_md:
      "La tabla tiene 20 géneros y 6751 canciones. ¿Qué valores puede tomar `puesto` en el resultado?",
    code_md:
      "```sql\nSELECT genre, title,\n       row_number() OVER (PARTITION BY genre ORDER BY reproducciones DESC) AS puesto\nFROM catalogo;\n```",
    options: [
      {
        key: "a",
        body_md:
          "Empieza en 1 en cada género y llega hasta la cantidad de canciones de ese género.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Va de 1 a 6751 sobre todo el catálogo.",
        is_correct: false,
        why_incorrect_md: "Eso ocurriría sin `PARTITION BY`: un único ranking global.",
      },
      {
        key: "c",
        body_md: "Va de 1 a 20, un valor por género.",
        is_correct: false,
        why_incorrect_md:
          "La ventana no colapsa filas: cada canción conserva su fila y recibe su propio puesto.",
      },
      {
        key: "d",
        body_md: "Es siempre 1, porque la partición tiene un solo género por fila.",
        is_correct: false,
        why_incorrect_md:
          "La partición agrupa todas las filas del mismo género, no cada fila por separado.",
      },
    ],
    explanation_md:
      "`PARTITION BY` divide las filas en grupos y reinicia la numeración en cada uno; el resultado conserva una fila por canción.",
    is_published: true,
  },
  {
    slug: "rk-q10-desempate-estable",
    section,
    lesson: basicas,
    type: "single",
    difficulty: "intermediate",
    topic: "Determinismo del ranking",
    tags: ["ranking", "order_by"],
    estimated_seconds: 50,
    prompt_md:
      "Un reporte diario necesita un puesto distinto para cada artista y usa `row_number() OVER (ORDER BY monthly_listeners DESC)`. Los puestos de dos artistas empatados se intercambian entre ejecuciones. ¿Cuál es la mejor corrección?",
    options: [
      {
        key: "a",
        body_md: "Agregar un segundo criterio único en la ventana, por ejemplo `, id`.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Agregar `ORDER BY name` al final de la consulta.",
        is_correct: false,
        why_incorrect_md:
          "Ordena la presentación, pero el número de puesto ya fue asignado de forma arbitraria dentro del empate.",
      },
      {
        key: "c",
        body_md: "Cambiar a `rank()` y dejar el resto igual.",
        is_correct: false,
        why_incorrect_md:
          "`rank()` les da a los dos el mismo puesto, y el reporte necesita un puesto distinto para cada artista.",
      },
      {
        key: "d",
        body_md: "Agregar `DISTINCT` al `SELECT`.",
        is_correct: false,
        why_incorrect_md: "No hay filas duplicadas: el problema es el orden dentro del empate.",
      },
    ],
    explanation_md:
      "Cuando el `ORDER BY` de la ventana no distingue dos filas, el motor elige libremente. Un criterio único adicional hace el resultado reproducible.",
    is_published: true,
  },
  {
    slug: "rk-q11-rank-menor-igual-tres",
    section,
    lesson: topN,
    type: "single",
    difficulty: "advanced",
    topic: "Top-N con empates",
    tags: ["ranking", "cte"],
    estimated_seconds: 60,
    prompt_md:
      "En un top por grupo filtras `WHERE puesto <= 3`. ¿Qué diferencia hay entre calcular `puesto` con `rank()` o con `row_number()`?",
    options: [
      {
        key: "a",
        body_md:
          "Con `row_number()` cada grupo devuelve exactamente 3 filas (o todas, si tiene menos de 3); con `rank()` puede devolver más si hay empates.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "No hay diferencia: ambas devuelven 3 filas por grupo.",
        is_correct: false,
        why_incorrect_md:
          "Solo coinciden si no hay empates dentro de los primeros puestos de cada grupo.",
      },
      {
        key: "c",
        body_md:
          "Con `rank()` un grupo puede devolver menos de 3 filas aunque tenga más de 3 filas.",
        is_correct: false,
        why_incorrect_md:
          "Con `rank()`, un grupo de 3 o más filas siempre devuelve al menos 3: los empates pueden saltar números, pero las filas empatadas igual quedan dentro del filtro. El efecto es devolver más filas, nunca menos.",
      },
      {
        key: "d",
        body_md: "`row_number()` no admite `PARTITION BY`.",
        is_correct: false,
        why_incorrect_md: "Las tres funciones de ranking admiten `PARTITION BY`.",
      },
    ],
    explanation_md:
      "`row_number()` fuerza N filas exactas y decide arbitrariamente entre empatados; `rank()` y `dense_rank()` conservan a todos los empatados, con la diferencia de que `rank()` deja huecos y `dense_rank()` no.",
    is_published: true,
  },
  {
    slug: "rk-q12-segmentar-la-entidad-correcta",
    section,
    lesson: ntile,
    type: "scenario",
    difficulty: "advanced",
    topic: "Nivel de detalle al segmentar",
    tags: ["ranking", "group_by"],
    estimated_seconds: 65,
    prompt_md:
      "Quieres clasificar a los **oyentes** en cuartiles de consumo a partir de la tabla de reproducciones, que tiene una fila por escucha. ¿Cómo lo resuelves?",
    options: [
      {
        key: "a",
        body_md:
          "Primero agregas las reproducciones por oyente y después aplicas `ntile(4)` sobre ese resultado.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Aplicas `ntile(4) OVER (ORDER BY played_at)` sobre la tabla de reproducciones.",
        is_correct: false,
        why_incorrect_md:
          "Segmenta reproducciones por fecha: un mismo oyente terminaría repartido en varios cuartiles.",
      },
      {
        key: "c",
        body_md: "Aplicas `ntile(4) OVER (PARTITION BY user_id ORDER BY played_at)`.",
        is_correct: false,
        why_incorrect_md:
          "Reparte las escuchas de cada oyente en cuatro bloques; no clasifica a los oyentes entre sí.",
      },
      {
        key: "d",
        body_md: "Usas `ntile(4)` junto con `count(*)` en la misma consulta, sin agregar antes.",
        is_correct: false,
        why_incorrect_md:
          "Sin `GROUP BY` previo no existe una fila por oyente, que es la unidad que se quiere segmentar.",
      },
    ],
    explanation_md:
      "Antes de segmentar hay que llevar los datos al nivel de la entidad que se segmenta: una fila por oyente. Después, la ventana reparte esas filas en bloques.",
    is_published: true,
  },
];
