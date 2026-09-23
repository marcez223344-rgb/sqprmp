import type { QuestionDef } from "../schemas/question";

const section = "calidad-de-datos";
const l1 = "calidad-de-datos-perfilar-una-tabla";
const l2 = "calidad-de-datos-nulos-y-categorias";
const l3 = "calidad-de-datos-validez-y-huecos";

export const questions: QuestionDef[] = [
  {
    slug: "calidad-q01-contar-nulos",
    section,
    lesson: l1,
    type: "single",
    difficulty: "intermediate",
    topic: "Medir completitud de una columna",
    tags: ["profiling", "null_handling", "count"],
    estimated_seconds: 60,
    prompt_md:
      "Una tabla `plays` tiene 109 382 filas. Quieres saber **cuántas filas no tienen valor** en la columna `device`. ¿Cuál de estas expresiones devuelve esa cantidad?",
    code_md: null,
    options: [
      {
        key: "a",
        body_md: "`count(*) - count(device)`",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "`count(device)`",
        is_correct: false,
        why_incorrect_md:
          "`count(columna)` cuenta los valores **presentes**: devuelve 107 637, que es justo lo contrario de lo que pediste.",
      },
      {
        key: "c",
        body_md: "`count(*)`",
        is_correct: false,
        why_incorrect_md:
          "`count(*)` cuenta todas las filas, tengan o no valor en `device`: devuelve 109 382 sin importar cuántos nulos haya.",
      },
      {
        key: "d",
        body_md: "`count(device = NULL)`",
        is_correct: false,
        why_incorrect_md:
          "Ninguna comparación con `=` contra NULL es verdadera; la expresión devuelve NULL para cada fila y `count` no cuenta nulos, así que el resultado es 0. Lo correcto es `IS NULL`.",
      },
    ],
    explanation_md:
      "`count(*)` cuenta filas y `count(columna)` cuenta valores no nulos: la resta entre ambos es exactamente la cantidad de nulos. La forma explícita equivalente es `count(*) FILTER (WHERE device IS NULL)`, más larga pero más fácil de leer cuando el perfil tiene muchas columnas.",
    is_published: true,
  },
  {
    slug: "calidad-q02-granularidad-de-la-tabla",
    section,
    lesson: l1,
    type: "query_interpretation",
    difficulty: "intermediate",
    topic: "Granularidad de una tabla de hechos",
    tags: ["profiling", "granularidad", "count"],
    estimated_seconds: 70,
    prompt_md:
      "Es tu primer día con la tabla `plays` y ejecutas esta consulta. Obtienes `total_rows` = 109 382, `distinct_users` = 4768 y `distinct_tracks` = 6203. ¿Qué conclusión se desprende de esos tres números?",
    code_md:
      "```sql\nSELECT\n  count(*) AS total_rows,\n  count(DISTINCT user_id) AS distinct_users,\n  count(DISTINCT track_id) AS distinct_tracks\nFROM plays;\n```",
    options: [
      {
        key: "a",
        body_md:
          "Una fila no representa ni a un oyente ni a una canción: representa un evento de reproducción, y un mismo oyente aparece muchas veces.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "La tabla tiene 104 614 filas duplicadas, porque 109 382 − 4768 = 104 614.",
        is_correct: false,
        why_incorrect_md:
          "Que un oyente aparezca muchas veces es lo esperado en una tabla de eventos. Un duplicado solo existe respecto de una clave de negocio (oyente + canción + instante), y esa prueba es otra consulta.",
      },
      {
        key: "c",
        body_md: "Hay 6203 canciones en el catálogo de Ritmo.",
        is_correct: false,
        why_incorrect_md:
          "La consulta cuenta las canciones **con al menos una reproducción**, no el catálogo. El catálogo está en `tracks` y tiene más filas: las canciones que nadie escuchó no aparecen aquí.",
      },
      {
        key: "d",
        body_md: "Cada oyente escuchó exactamente 23 canciones distintas.",
        is_correct: false,
        why_incorrect_md:
          "109 382 / 4768 ≈ 23 es un promedio de **reproducciones** por oyente, no de canciones distintas, y un promedio no dice nada sobre el reparto: en escucha musical unos pocos oyentes suelen concentrar gran parte del volumen.",
      },
    ],
    explanation_md:
      "Comparar el total de filas con los distintos de cada columna candidata es la forma más rápida de descubrir qué representa una fila. Saber que la granularidad es «un evento» te anticipa qué joins van a multiplicar filas y qué conteos necesitan `DISTINCT`.",
    is_published: true,
  },
  {
    slug: "calidad-q03-where-que-descarta-nulos",
    section,
    lesson: l2,
    type: "error_diagnosis",
    difficulty: "intermediate",
    topic: "NULL en condiciones de desigualdad",
    tags: ["null_handling", "where", "logica-de-tres-valores"],
    estimated_seconds: 70,
    prompt_md:
      "En `plays` hay 109 382 filas: 62 478 con `device = 'mobile'`, 45 159 con otros dispositivos y 1745 con `device` nulo. Esta consulta, que debería devolver «todo lo que no es mobile», devuelve 45 159 filas en lugar de 46 904. ¿Cuál es la causa?",
    code_md: "```sql\nSELECT count(*)\nFROM plays\nWHERE device <> 'mobile';\n```",
    options: [
      {
        key: "a",
        body_md:
          "Las 1745 filas con `device` nulo no pasan el filtro: comparar NULL con `'mobile'` no da verdadero ni falso, da desconocido, y el `WHERE` solo deja pasar lo verdadero.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "`<>` no es un operador válido en PostgreSQL; hay que usar `!=`.",
        is_correct: false,
        why_incorrect_md:
          "`<>` y `!=` son sinónimos en PostgreSQL y se comportan igual, incluida su manera de tratar los NULL. Cambiar de operador no cambiaría el resultado.",
      },
      {
        key: "c",
        body_md: "Falta un `GROUP BY device` para que el motor considere todos los dispositivos.",
        is_correct: false,
        why_incorrect_md:
          "El `GROUP BY` cambia la forma del resultado, no qué filas pasan el filtro. Las 1745 filas nulas seguirían fuera.",
      },
      {
        key: "d",
        body_md: "El valor nulo se guardó como el texto `'NULL'` y por eso no coincide.",
        is_correct: false,
        why_incorrect_md:
          "Si fuera el texto `'NULL'`, esas filas **sí** pasarían el filtro (`'NULL' <> 'mobile'` es verdadero) y el conteo daría 46 904. El enunciado dice que la columna es nula.",
      },
    ],
    explanation_md:
      "Con lógica de tres valores, cualquier comparación contra NULL devuelve desconocido y la fila queda fuera. Para incluir las ausencias hay que decirlo: `WHERE device IS NULL OR device <> 'mobile'`. Este es el error que más silenciosamente desbalancea un reporte, porque la consulta no falla: simplemente devuelve de menos.",
    is_published: true,
  },
  {
    slug: "calidad-q04-vacio-no-es-nulo",
    section,
    lesson: l2,
    type: "true_false",
    difficulty: "intermediate",
    topic: "Cadena vacía frente a NULL",
    tags: ["null_handling", "texto", "profiling"],
    estimated_seconds: 45,
    prompt_md:
      "En una columna de texto, la cadena vacía (`''`) y `NULL` son lo mismo para PostgreSQL: `count(columna)` las trata igual y `columna IS NULL` devuelve verdadero para ambas. ¿Verdadero o falso?",
    code_md: null,
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
          "La cadena vacía es un valor como cualquier otro: `count(columna)` la cuenta y `IS NULL` devuelve falso para ella. Solo en Oracle, por razones históricas, la cadena vacía se almacena como NULL.",
      },
    ],
    explanation_md:
      "Para el negocio «no hay comentario» es una sola situación; para SQL son dos. Un perfil honesto las mide por separado —`count(*) FILTER (WHERE c IS NULL)` y `count(*) FILTER (WHERE btrim(c) = '')`— y las unifica al calcular con `nullif(btrim(c), '')`, que convierte el vacío y los espacios en NULL.",
    is_published: true,
  },
  {
    slug: "calidad-q05-palabra-clave-antijoin",
    section,
    lesson: l3,
    type: "fill_blank",
    difficulty: "advanced",
    topic: "Antijoin con subconsulta correlacionada",
    tags: ["antijoin", "exists", "integridad-referencial"],
    estimated_seconds: 45,
    prompt_md:
      "Quieres los pedidos que **no tienen ninguna fila** en `order_items`. Completa el hueco de la consulta con las dos palabras clave que faltan (escríbelas separadas por un espacio, sin paréntesis):\n\n```sql\nSELECT o.id\nFROM orders o\nWHERE ______ (SELECT 1 FROM order_items i WHERE i.order_id = o.id);\n```",
    code_md: null,
    answer: { accepted: ["NOT EXISTS", "not exists"], case_sensitive: false },
    explanation_md:
      "`NOT EXISTS` con una subconsulta correlacionada es la forma más segura de escribir un antijoin: devuelve la fila del padre cuando la subconsulta no encuentra ninguna coincidencia. Las alternativas son `LEFT JOIN order_items i ON i.order_id = o.id WHERE i.id IS NULL` y, con muchísimo cuidado, `NOT IN`, que devuelve vacío si la subconsulta contiene aunque sea un NULL.",
    is_published: true,
  },
  {
    slug: "calidad-q06-not-in-con-nulos",
    section,
    lesson: l3,
    type: "error_diagnosis",
    difficulty: "advanced",
    topic: "NOT IN con valores nulos",
    tags: ["null_handling", "antijoin", "subconsulta"],
    estimated_seconds: 80,
    prompt_md:
      "Sabes que hay pedidos sin ítems, pero esta consulta devuelve **cero filas**. La columna `order_items.order_id` admite nulos en este sistema de origen y contiene algunos. ¿Por qué el resultado es vacío?",
    code_md:
      "```sql\nSELECT o.id\nFROM orders o\nWHERE o.id NOT IN (SELECT i.order_id FROM order_items i);\n```",
    options: [
      {
        key: "a",
        body_md:
          "`NOT IN` compara contra cada valor de la lista; al haber un NULL, ninguna comparación puede dar falso con certeza, el resultado global queda en desconocido y ninguna fila pasa el filtro.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "`NOT IN` no acepta subconsultas, solo listas escritas a mano.",
        is_correct: false,
        why_incorrect_md:
          "`NOT IN` acepta subconsultas sin problema; la consulta es sintácticamente válida y por eso no aparece ningún error.",
      },
      {
        key: "c",
        body_md: "La subconsulta devuelve demasiadas filas y el motor la trunca silenciosamente.",
        is_correct: false,
        why_incorrect_md:
          "PostgreSQL no trunca resultados de subconsultas. El problema no es el tamaño sino la presencia de un solo NULL.",
      },
      {
        key: "d",
        body_md:
          "Falta un `DISTINCT` en la subconsulta y los valores repetidos se anulan entre sí.",
        is_correct: false,
        why_incorrect_md:
          "Los valores repetidos no afectan el resultado de `NOT IN`; agregar `DISTINCT` no cambiaría nada mientras el NULL siga ahí.",
      },
    ],
    explanation_md:
      "`x NOT IN (a, b, NULL)` equivale a `x <> a AND x <> b AND x <> NULL`, y esa última comparación nunca es verdadera: la conjunción entera queda en desconocido. Por eso, en auditorías, el antijoin se escribe con `NOT EXISTS` (inmune a los nulos) o con `LEFT JOIN ... IS NULL`.",
    is_published: true,
  },
  {
    slug: "calidad-q07-having-para-duplicados",
    section,
    lesson: l1,
    type: "single",
    difficulty: "advanced",
    topic: "Detectar claves duplicadas",
    tags: ["duplicados", "group_by", "having"],
    estimated_seconds: 70,
    prompt_md:
      "Quieres comprobar si la combinación (`user_id`, `track_id`, `played_at`) identifica una sola fila en `plays`. ¿Cuál de estas consultas responde esa pregunta?",
    code_md: null,
    options: [
      {
        key: "a",
        body_md:
          "```sql\nSELECT user_id, track_id, played_at, count(*)\nFROM plays\nGROUP BY user_id, track_id, played_at\nHAVING count(*) > 1;\n```",
        is_correct: true,
      },
      {
        key: "b",
        body_md:
          "```sql\nSELECT user_id, track_id, played_at, count(*)\nFROM plays\nWHERE count(*) > 1\nGROUP BY user_id, track_id, played_at;\n```",
        is_correct: false,
        why_incorrect_md:
          "El `WHERE` se evalúa antes de formar los grupos, así que no puede usar un agregado: el motor rechaza la consulta con un error. El filtro sobre un conteo va en `HAVING`.",
      },
      {
        key: "c",
        body_md:
          "```sql\nSELECT id, user_id, track_id, played_at, count(*)\nFROM plays\nGROUP BY id, user_id, track_id, played_at\nHAVING count(*) > 1;\n```",
        is_correct: false,
        why_incorrect_md:
          "Incluir `id` (la clave primaria) en el `GROUP BY` hace que cada grupo tenga exactamente una fila, así que el `HAVING` nunca se cumple y el resultado es siempre vacío, tenga la tabla duplicados o no.",
      },
      {
        key: "d",
        body_md: "```sql\nSELECT DISTINCT user_id, track_id, played_at\nFROM plays;\n```",
        is_correct: false,
        why_incorrect_md:
          "`DISTINCT` **esconde** los duplicados en lugar de mostrarlos: devuelve una fila por combinación y no te dice cuáles se repetían ni cuántas veces.",
      },
    ],
    explanation_md:
      "Probar una clave de negocio es agrupar por ella y quedarse con los grupos de más de una fila. La clave técnica (`id`) no sirve para esto porque es distinta por definición en cada fila; el duplicado siempre se define respecto de las columnas que el negocio considera identificatorias.",
    is_published: true,
  },
  {
    slug: "calidad-q08-tablero-de-chequeos",
    section,
    lesson: l3,
    type: "multiple",
    difficulty: "advanced",
    topic: "Diseño de un reporte de chequeos",
    tags: ["auditoria", "union_all", "reporte"],
    estimated_seconds: 90,
    prompt_md:
      "Estás armando un tablero de calidad con una fila por regla verificada, pensado para ejecutarse cada semana. **Selecciona todas** las afirmaciones correctas sobre ese diseño.",
    code_md: null,
    options: [
      {
        key: "a",
        body_md:
          "Las ramas se apilan con `UNION ALL` y no con `UNION`, porque dos chequeos distintos pueden fallar la misma cantidad de filas y `UNION` eliminaría uno de ellos.",
        is_correct: true,
      },
      {
        key: "b",
        body_md:
          "Los chequeos que devuelven cero también se muestran: una regla ausente del reporte no se distingue de una regla que nadie verificó.",
        is_correct: true,
      },
      {
        key: "c",
        body_md:
          "Junto al conteo que falla conviene mostrar el total de filas evaluadas, porque 340 filas significan cosas distintas en una tabla de mil y en una de un millón.",
        is_correct: true,
      },
      {
        key: "d",
        body_md:
          "Como todas las ramas cuentan filas, la columna de conteos siempre se puede sumar para obtener «el total de filas con problemas».",
        is_correct: false,
        why_incorrect_md:
          "No siempre cuentan lo mismo: un chequeo de duplicados suele contar **claves** y no filas, y una misma fila puede romper dos reglas. Sumar la columna mezcla unidades y cuenta filas dos veces.",
      },
      {
        key: "e",
        body_md:
          "El reporte debería borrar las filas que incumplen para que la próxima ejecución salga limpia.",
        is_correct: false,
        why_incorrect_md:
          "Auditar no es corregir. Borrar datos de una tabla ajena destruye la evidencia y suele romper conciliaciones contables; el rol del análisis es documentar, cuantificar y proponer el arreglo en el sistema de origen.",
      },
    ],
    explanation_md:
      "Un tablero de calidad se juzga por lo que permite decidir: qué regla, cuántas filas, sobre qué total y desde cuándo. Guardar el resultado de cada ejecución con su fecha convierte la foto en una tendencia, que es lo que muestra si la calidad mejora o empeora.",
    is_published: true,
  },
  {
    slug: "calidad-q09-tipos-de-chequeo",
    section,
    lesson: l3,
    type: "matching",
    difficulty: "advanced",
    topic: "Familias de chequeos de calidad",
    tags: ["auditoria", "dominio", "integridad-referencial"],
    estimated_seconds: 90,
    prompt_md: "Relaciona cada problema de calidad con la familia de chequeo que lo detecta.",
    code_md: null,
    pairs: [
      {
        left: "`seconds_played` con valor −240",
        right: "Regla de dominio: un solo campo fuera de su rango posible",
      },
      {
        left: "`seconds_played` mayor que `tracks.duration_seconds`",
        right: "Regla cruzada: la fila contradice a la tabla que la define",
      },
      {
        left: "Un pedido sin ninguna fila en `order_items`",
        right: "Hueco referencial: el padre existe pero no tiene hijos",
      },
      {
        left: "Dos filas con el mismo oyente, canción e instante",
        right: "Unicidad: la clave de negocio no identifica una sola fila",
      },
      {
        left: "1745 reproducciones sin `device`",
        right: "Completitud: falta el valor de una columna",
      },
    ],
    explanation_md:
      "Nombrar la familia de cada hallazgo no es burocracia: define a quién se le reclama y cómo se arregla. La completitud y el dominio se resuelven en la captura del dato; las reglas cruzadas y los huecos referenciales, casi siempre en la lógica de la aplicación que escribe las filas.",
    is_published: true,
  },
  {
    slug: "calidad-q10-que-es-un-atipico",
    section,
    lesson: l3,
    type: "single",
    difficulty: "advanced",
    topic: "Valores atípicos frente a valores imposibles",
    tags: ["outliers", "dominio", "criterio"],
    estimated_seconds: 75,
    prompt_md:
      "Auditas `plays` y encuentras dos situaciones: (1) una reproducción de 3993 segundos sobre una canción que dura 95, y (2) un oyente con 8 reproducciones en un día, cuando el promedio es 1,2. ¿Cómo debes tratarlas?",
    code_md: null,
    options: [
      {
        key: "a",
        body_md:
          "La primera es un valor **imposible**: viola una cota conocida del negocio y hay que reportarla como error. La segunda es solo un valor alto y plausible, así que no es un problema de calidad.",
        is_correct: true,
      },
      {
        key: "b",
        body_md:
          "Ambas son valores atípicos y se deben excluir de los cálculos para que los promedios no se distorsionen.",
        is_correct: false,
        why_incorrect_md:
          "Excluir datos legítimos por ser altos sesga el análisis. Escuchar ocho canciones en un día es perfectamente posible; el que no puede ser cierto es el que supera la duración de la canción.",
      },
      {
        key: "c",
        body_md:
          "Ninguna es un problema: mientras la columna sea numérica y no nula, el dato es válido.",
        is_correct: false,
        why_incorrect_md:
          "El tipo de la columna no expresa las reglas del negocio. Una duración escuchada 42 veces mayor que la canción es numérica, no nula y aun así imposible.",
      },
      {
        key: "d",
        body_md:
          "Ambas se deciden con criterio estadístico: es atípico todo lo que se aleje más de tres desviaciones estándar del promedio.",
        is_correct: false,
        why_incorrect_md:
          "El criterio estadístico sirve cuando no existe una cota conocida. Aquí sí existe (`tracks.duration_seconds`), y un umbral de tres desviaciones marcaría como sospechosos a los mejores clientes de cualquier negocio.",
      },
    ],
    explanation_md:
      "En calidad de datos conviene separar «raro» de «imposible». Lo imposible se detecta con reglas de dominio o cruzadas y se reporta como error con evidencia. Lo raro se investiga, pero se descarta solo con una razón de negocio explícita: un dato extremo legítimo suele ser la parte más valiosa del conjunto.",
    is_published: true,
  },
  {
    slug: "calidad-q11-normalizar-antes-de-agrupar",
    section,
    lesson: l2,
    type: "query_interpretation",
    difficulty: "advanced",
    topic: "Categorías duplicadas por capitalización",
    tags: ["texto", "duplicados", "group_by"],
    estimated_seconds: 80,
    prompt_md:
      "La tabla `customers` tiene 3000 filas y 2998 valores distintos de `email`. Esta consulta devuelve 37 filas. ¿Qué significa ese resultado?",
    code_md:
      "```sql\nSELECT lower(btrim(email)) AS normalized_email, count(*) AS people_rows\nFROM customers\nGROUP BY lower(btrim(email))\nHAVING count(*) > 1;\n```",
    options: [
      {
        key: "a",
        body_md:
          "Hay 37 correos que, una vez ignorados los espacios y las mayúsculas, están cargados en más de una fila: son personas registradas dos veces que el conteo de `email` distintos no detectaba.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Hay 37 filas con el correo vacío o nulo.",
        is_correct: false,
        why_incorrect_md:
          "La consulta no busca ausencias; agrupa por el correo normalizado y se queda con los grupos de más de una fila. Las filas con correo nulo formarían un solo grupo aparte.",
      },
      {
        key: "c",
        body_md: "Hay 37 filas duplicadas exactas, idénticas en todas sus columnas.",
        is_correct: false,
        why_incorrect_md:
          "El criterio de la consulta es solo el correo normalizado; el resto de las columnas puede diferir. Además, 37 es la cantidad de **grupos**, no de filas sobrantes.",
      },
      {
        key: "d",
        body_md: "El resultado es incorrecto: `GROUP BY` no admite expresiones, solo columnas.",
        is_correct: false,
        why_incorrect_md:
          "`GROUP BY` acepta expresiones sin problema, y de hecho es la única manera de agrupar por un valor normalizado sin crear antes una columna nueva.",
      },
    ],
    explanation_md:
      "Contar valores distintos de una columna de texto sin normalizar subestima los duplicados: `ANA@EJEMPLO.LAT` y `ana@ejemplo.lat` son dos valores distintos y una sola persona. `lower(btrim(...))` es la normalización mínima antes de agrupar texto. Detectar no es fusionar: unificar dos registros de cliente es una decisión de negocio, no del análisis.",
    is_published: true,
  },
  {
    slug: "calidad-q12-primer-dia-con-la-tabla",
    section,
    lesson: l1,
    type: "scenario",
    difficulty: "advanced",
    topic: "Prioridades al recibir una tabla desconocida",
    tags: ["profiling", "metodo", "comunicacion"],
    estimated_seconds: 90,
    prompt_md:
      "Entras a un equipo de datos y te piden «el reporte de escucha semanal» sobre una tabla que nadie documentó. Tienes acceso de solo lectura y medio día. ¿Cuál es la mejor primera acción?",
    code_md: null,
    options: [
      {
        key: "a",
        body_md:
          "Perfilar la tabla en una consulta: volumen, ventana temporal en UTC, granularidad (qué combinación identifica una fila) y nulos por columna, y recién después escribir la métrica.",
        is_correct: true,
      },
      {
        key: "b",
        body_md:
          "Escribir el reporte con las columnas que parecen correctas y entregarlo; si algo no cierra, el área de negocio lo va a notar.",
        is_correct: false,
        why_incorrect_md:
          "El área de negocio casi nunca detecta un error del 1 %, que es donde viven los problemas de calidad: lo va a usar para decidir. Además, un número entregado sin verificar es difícil de corregir después sin perder credibilidad.",
      },
      {
        key: "c",
        body_md:
          "Corregir de entrada los valores sospechosos (negativos, nulos, duplicados) con `UPDATE` y `DELETE` para trabajar sobre datos limpios.",
        is_correct: false,
        why_incorrect_md:
          "Además de que solo tienes lectura, modificar una tabla de producción sin acuerdo destruye evidencia y rompe las conciliaciones de otras áreas. La limpieza se aplica en la consulta y se propone en el origen.",
      },
      {
        key: "d",
        body_md:
          "Pedir que alguien documente la tabla antes de tocarla y esperar esa documentación para empezar.",
        is_correct: false,
        why_incorrect_md:
          "La documentación rara vez llega a tiempo y, cuando llega, describe la intención y no el dato real. Perfilar te da en quince minutos la verdad de lo que hay, que es lo que después se contrasta con la documentación.",
      },
    ],
    explanation_md:
      "Perfilar primero cuesta minutos y cambia el reporte entero: descubrir que la clave de negocio se repite, que falta el 1,6 % de un campo o que la carga se cortó hace tres semanas es la diferencia entre un número defendible y uno que habrá que retirar. El perfil se guarda como consulta para volver a correrlo cada vez que el dato cambie.",
    is_published: true,
  },
];
