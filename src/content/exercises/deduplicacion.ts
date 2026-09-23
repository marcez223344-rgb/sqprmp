import {
  defaultHintMeta,
  defaultReward,
  defaultSolutionUnlock,
  type ExerciseDef,
} from "../schemas/exercise";

const section = "deduplicacion";
const ritmo = { slug: "ritmo", version: 1 };
const tiendaviva = { slug: "tiendaviva", version: 1 };
const l1 = "dedup-que-es-un-duplicado";
const l2 = "dedup-clave-de-negocio";
const l3 = "dedup-elegir-la-fila-ganadora";

export const exercises: ExerciseDef[] = [
  {
    slug: "dedup-cuantas-filas-sobran",
    section,
    title: "Cuántas reproducciones están registradas dos veces",
    difficulty: "very_easy",
    estimated_minutes: 6,
    concepts: ["aggregate", "distinct", "select", "alias"],
    dataset: ritmo,
    tables_used: ["plays"],
    scenario_md:
      "En **Ritmo**, el departamento de Datos sospecha que la aplicación móvil reenvía algunos eventos de reproducción cuando la conexión falla. Antes de abrir un ticket con el equipo de Ingeniería te piden un número concreto: cuántas filas de la tabla `plays` sobran.\n\nEl acuerdo con el departamento de Producto ya está tomado: una reproducción queda identificada por la combinación de `user_id`, `track_id` y `played_at`. Dos filas con esa combinación idéntica son el **mismo** evento registrado dos veces.",
    business_question_md:
      "Debes generar un dataset de **una sola fila** con tres columnas: la cantidad de filas que tiene la tabla `plays` bajo el encabezado `filas_totales`, la cantidad de combinaciones distintas de `user_id`, `track_id` y `played_at` bajo el encabezado `combinaciones_unicas`, y la diferencia entre las dos anteriores bajo el encabezado `filas_sobrantes`.",
    learning_objective:
      "Cuantificar el volumen de duplicados comparando el total de filas contra el total de combinaciones distintas de la clave de identidad.",
    theory_ref: l1,
    expected_columns: [
      { name: "filas_totales", type: "integer" },
      { name: "combinaciones_unicas", type: "integer" },
      { name: "filas_sobrantes", type: "integer" },
    ],
    validation_rules: { order_matters: false, required_concepts: ["aggregate"] },
    reference_solution:
      "SELECT\n  count(*) AS filas_totales,\n  count(DISTINCT (user_id, track_id, played_at)) AS combinaciones_unicas,\n  count(*) - count(DISTINCT (user_id, track_id, played_at)) AS filas_sobrantes\nFROM plays;",
    alternative_solutions: [
      {
        label: "Con una subconsulta que aplica DISTINCT",
        sql: "WITH unicas AS (\n  SELECT DISTINCT user_id, track_id, played_at FROM plays\n)\nSELECT\n  (SELECT count(*) FROM plays) AS filas_totales,\n  (SELECT count(*) FROM unicas) AS combinaciones_unicas,\n  (SELECT count(*) FROM plays) - (SELECT count(*) FROM unicas) AS filas_sobrantes;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Necesitas dos conteos sobre la misma tabla: uno que cuente todas las filas y otro que cuente cuántas combinaciones **distintas** de la clave existen. La diferencia entre los dos es el sobrante.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "La función `count(DISTINCT ...)` acepta un valor compuesto si envuelves las columnas entre paréntesis: la expresión `count(DISTINCT (a, b, c))` cuenta cuántas ternas distintas hay. Las tres columnas van dentro de una sola expresión, no en tres llamadas a `count` separadas. La tercera columna es simplemente la resta de las dos primeras, repitiendo las mismas expresiones.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT\n  ___(*) AS filas_totales,\n  count(______ (user_id, ___, ___)) AS combinaciones_unicas,\n  ___ AS filas_sobrantes\nFROM plays;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "duplicates",
        description_md:
          "Incluir la columna `id` en la clave: la expresión `count(DISTINCT (id, user_id, track_id, played_at))` devuelve exactamente lo mismo que `count(*)` y el sobrante da 0, porque `id` es un correlativo distinto en cada fila.",
      },
      {
        category: "wrong_columns",
        description_md:
          "Escribir `count(DISTINCT user_id, track_id, played_at)` sin los paréntesis interiores: PostgreSQL entiende que son tres argumentos y responde con el error «function count(integer, integer, timestamp with time zone) does not exist».",
      },
      {
        category: "aggregation_level",
        description_md:
          "Usar `count(DISTINCT user_id) * count(DISTINCT track_id)`, o sumar conteos por separado: eso mide otra cosa. La identidad es la **combinación** de las tres columnas, no cada columna por su cuenta.",
      },
      {
        category: "cell_values",
        description_md:
          "Calcular la columna `filas_sobrantes` como `count(DISTINCT ...) - count(*)`: el signo queda invertido y el reporte informa −340 filas de más.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 109 382 filas totales, 109 042 combinaciones únicas y 340 filas sobrantes, es decir, un 0,31 % de la tabla.\n\nEl truco de sintaxis está en los paréntesis. La expresión `(user_id, track_id, played_at)` construye un **valor de tipo registro**, y `count(DISTINCT ...)` cuenta cuántos registros distintos hay. Sin esos paréntesis, PostgreSQL leería tres argumentos para la función `count`, que no existe con esa forma.\n\nLa alternativa con una expresión de tabla común y `SELECT DISTINCT` es igual de válida y suele leerse mejor cuando la clave tiene muchas columnas. Recorre la tabla dos veces en lugar de una, pero a esta escala la diferencia es irrelevante y la claridad gana.\n\nUn 0,31 % parece despreciable, y ese es justamente el argumento que no deberías aceptar sin mirar: los duplicados casi nunca se reparten de forma pareja. En el ejercicio sobre el impacto por país vas a ver que la concentración cambia la conversación.",
    improvement_feedback: [
      {
        condition: "missing_alias_on_aggregate",
        message_key: "improve.missing_alias_on_aggregate",
      },
    ],
    reward: defaultReward("very_easy"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "dedup-listar-reproducciones-repetidas",
    section,
    title: "El listado de reproducciones repetidas",
    difficulty: "easy",
    estimated_minutes: 8,
    concepts: ["group_by", "having", "aggregate", "order_by"],
    dataset: ritmo,
    tables_used: ["plays"],
    scenario_md:
      "El ticket con el equipo de Ingeniería avanzó y ahora piden evidencia: no alcanza con decir que hay 340 filas de más, quieren ver **cuáles** son las combinaciones afectadas para poder reproducir el problema en la aplicación. Te piden ese listado para adjuntarlo al ticket.",
    business_question_md:
      "Debes generar un dataset que devuelva las combinaciones de `user_id`, `track_id` y `played_at` que aparecen **más de una vez** en la tabla `plays`, junto con la cantidad de filas de cada combinación bajo el encabezado `veces`. Las columnas del resultado son `user_id`, `track_id`, `played_at` y `veces`. Ordena por `user_id`, después por `track_id` y después por `played_at`, las tres claves en forma ascendente.",
    learning_objective:
      "Detectar duplicados con el patrón GROUP BY por la clave de identidad más HAVING count(*) > 1.",
    theory_ref: l1,
    prerequisites: ["dedup-cuantas-filas-sobran"],
    expected_columns: [
      { name: "user_id", type: "integer" },
      { name: "track_id", type: "integer" },
      { name: "played_at", type: "timestamp" },
      { name: "veces", type: "integer" },
    ],
    validation_rules: { order_matters: true, required_concepts: ["group_by", "having"] },
    reference_solution:
      "SELECT\n  user_id,\n  track_id,\n  played_at,\n  count(*) AS veces\nFROM plays\nGROUP BY user_id, track_id, played_at\nHAVING count(*) > 1\nORDER BY user_id, track_id, played_at;",
    alternative_solutions: [
      {
        label: "Con una función de ventana en lugar de GROUP BY",
        sql: "SELECT user_id, track_id, played_at, veces\nFROM (\n  SELECT\n    user_id,\n    track_id,\n    played_at,\n    count(*) OVER (PARTITION BY user_id, track_id, played_at) AS veces,\n    row_number() OVER (PARTITION BY user_id, track_id, played_at ORDER BY id) AS copia\n  FROM plays\n) AS marcadas\nWHERE veces > 1 AND copia = 1\nORDER BY user_id, track_id, played_at;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Arma grupos con las columnas que definen la identidad de una reproducción y quédate solamente con los grupos que tienen más de un integrante. El filtro sobre un conteo de grupo no va en la cláusula `WHERE`.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Las tres columnas de la clave van tanto en el `SELECT` como en el `GROUP BY`. La función `count(*)` cuenta las filas de cada grupo, y el filtro `count(*) > 1` se escribe en la cláusula `HAVING`, que se evalúa después de agrupar. La cláusula `ORDER BY` va al final, sobre las columnas de la clave.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT\n  user_id,\n  track_id,\n  played_at,\n  ___ AS veces\nFROM plays\n___ ___ user_id, track_id, played_at\n______ count(*) ___ 1\nORDER BY ___, ___, ___;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "syntax",
        description_md:
          "Poner el filtro como `WHERE count(*) > 1`: PostgreSQL responde con el error «aggregate functions are not allowed in WHERE», porque la cláusula `WHERE` filtra filas antes de agrupar.",
      },
      {
        category: "duplicates",
        description_md:
          "Agregar la columna `id` al `GROUP BY`: cada grupo queda con una sola fila, la condición `HAVING count(*) > 1` no deja pasar nada y el resultado sale vacío.",
      },
      {
        category: "aggregation_level",
        description_md:
          "Agrupar solo por `user_id` y `track_id`: aparecen personas que escucharon la misma canción en momentos distintos, que **no** son duplicados sino escuchas repetidas perfectamente legítimas.",
      },
      {
        category: "wrong_order",
        description_md:
          "Ordenar por `veces` descendente cuando la consigna especifica el orden por la clave: con 340 grupos que valen todos 2, el empate hace que el resultado no sea reproducible.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 340 filas, todas con la columna `veces` en 2: no hay ningún caso triplicado. Esa uniformidad es información útil para Ingeniería, porque encaja con un único reintento de envío y no con un bucle.\n\nLa cláusula `HAVING` es la pieza clave: la cláusula `WHERE` filtra filas antes de agrupar y la cláusula `HAVING` filtra grupos después. Por eso la expresión `count(*)` solo puede aparecer en `HAVING`.\n\nLa alternativa con funciones de ventana llega al mismo resultado sin colapsar las filas: la expresión `count(*) OVER (PARTITION BY ...)` agrega el tamaño del grupo a cada fila y la condición `row_number() = 1` evita que cada grupo aparezca dos veces. Es más larga para esta pregunta, pero es el camino natural cuando además necesitas arrastrar columnas que no están en la clave, como `id` o `device`.\n\nAgrupar solamente por `user_id` y `track_id` devolvería muchísimos más grupos y sería un error de negocio: esa combinación identifica «esta persona escuchó esta canción» y no «este evento de reproducción».",
    improvement_feedback: [
      {
        condition: "missing_alias_on_aggregate",
        message_key: "improve.missing_alias_on_aggregate",
      },
    ],
    reward: defaultReward("easy"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "dedup-impacto-por-pais",
    section,
    title: "Cuánto infla el duplicado las reproducciones por país",
    difficulty: "intermediate",
    estimated_minutes: 11,
    concepts: ["aggregate", "distinct", "group_by", "inner_join", "order_by"],
    dataset: ritmo,
    tables_used: ["plays", "users"],
    scenario_md:
      "La dirección regional de **Ritmo** compara el consumo de los seis mercados todos los meses. Cuando les contaste que hay filas duplicadas, la pregunta inmediata fue la correcta: si eso cambia la comparación entre países o si afecta a todos por igual. Te piden el desglose para poder responderla con evidencia.",
    business_question_md:
      "Debes generar un dataset que, para cada país de los oyentes, que sale de la columna `users.country`, devuelva el `country`, la cantidad de filas de `plays` de sus oyentes bajo el encabezado `reproducciones_crudas`, la cantidad de combinaciones distintas de `user_id`, `track_id` y `played_at` bajo el encabezado `reproducciones_unicas` y la diferencia entre las dos bajo el encabezado `filas_sobrantes`. Ordena por `filas_sobrantes` descendente.",
    learning_objective:
      "Medir el impacto de los duplicados por segmento en lugar de confiar en el porcentaje global.",
    theory_ref: l1,
    prerequisites: ["dedup-cuantas-filas-sobran"],
    expected_columns: [
      { name: "country", type: "text" },
      { name: "reproducciones_crudas", type: "integer" },
      { name: "reproducciones_unicas", type: "integer" },
      { name: "filas_sobrantes", type: "integer" },
    ],
    validation_rules: { order_matters: true, required_concepts: ["group_by", "inner_join"] },
    reference_solution:
      "SELECT\n  u.country,\n  count(*) AS reproducciones_crudas,\n  count(DISTINCT (p.user_id, p.track_id, p.played_at)) AS reproducciones_unicas,\n  count(*) - count(DISTINCT (p.user_id, p.track_id, p.played_at)) AS filas_sobrantes\nFROM plays AS p\nINNER JOIN users AS u ON u.id = p.user_id\nGROUP BY u.country\nORDER BY filas_sobrantes DESC;",
    alternative_solutions: [
      {
        label: "Dos CTE: una con las filas crudas y otra con las únicas",
        sql: "WITH crudas AS (\n  SELECT u.country, count(*) AS n\n  FROM plays AS p\n  INNER JOIN users AS u ON u.id = p.user_id\n  GROUP BY u.country\n),\nunicas AS (\n  SELECT u.country, count(*) AS n\n  FROM (SELECT DISTINCT user_id, track_id, played_at FROM plays) AS d\n  INNER JOIN users AS u ON u.id = d.user_id\n  GROUP BY u.country\n)\nSELECT\n  c.country,\n  c.n AS reproducciones_crudas,\n  x.n AS reproducciones_unicas,\n  c.n - x.n AS filas_sobrantes\nFROM crudas AS c\nINNER JOIN unicas AS x ON x.country = c.country\nORDER BY filas_sobrantes DESC;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Es el mismo par de conteos del ejercicio anterior, pero calculado dentro de cada grupo. El país no está en la tabla `plays`: vive en la tabla de oyentes, así que hace falta unirlas.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Une la tabla `plays` con `users` por la condición `u.id = p.user_id`, agrupa por `u.country` y calcula en el mismo `SELECT` las expresiones `count(*)` y `count(DISTINCT (p.user_id, p.track_id, p.played_at))`. La tercera columna es la resta entre las dos. En la cláusula `ORDER BY` puedes usar el alias `filas_sobrantes`.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT\n  u.country,\n  ___ AS reproducciones_crudas,\n  ___ AS reproducciones_unicas,\n  ___ AS filas_sobrantes\nFROM plays AS p\nINNER JOIN users AS u ON ___ = ___\n___ ___ u.country\nORDER BY ___ ___;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "join_condition",
        description_md:
          "Unir con la condición `u.id = p.id`: la columna `plays.id` es el identificador de la reproducción y no del oyente, así que el resultado mezcla países al azar.",
      },
      {
        category: "aggregation_level",
        description_md:
          "Calcular `count(DISTINCT p.user_id)` en lugar del valor compuesto: eso cuenta oyentes y no reproducciones únicas, con lo que el sobrante queda enorme.",
      },
      {
        category: "duplicates",
        description_md:
          "Aplicar `SELECT DISTINCT` a la consulta completa en vez de aplicarlo a la clave: como cada país es una fila distinta, la palabra clave `DISTINCT` no descarta nada y las cifras crudas quedan iguales.",
      },
      {
        category: "wrong_order",
        description_md:
          "Ordenar por `country` cuando la consigna pide ordenar por `filas_sobrantes` descendente: el reporte deja de responder dónde duele más el problema.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da seis filas: México con 108 filas sobrantes sobre 30 181 crudas, Brasil con 80 sobre 25 922, Argentina con 55 sobre 19 310, Colombia con 43 sobre 14 888, Chile con 29 sobre 11 092 y Perú con 25 sobre 7989.\n\nLa lectura es tranquilizadora, y conviene decirlo con esas palabras: el sobrante ronda el 0,3 % en todos los mercados, así que el ranking entre países **no cambia** al deduplicar. Ese era el riesgo real y ahora queda descartado con evidencia y no con una intuición.\n\nSobre la técnica: la expresión `count(DISTINCT (p.user_id, p.track_id, p.played_at))` se calcula dentro de cada grupo del `GROUP BY`, igual que cualquier otro agregado. Podrías repetir la expresión tres veces, y de hecho la solución de referencia la repite dos; si te molesta esa repetición, la versión con dos expresiones de tabla común la evita a cambio de recorrer la tabla dos veces.\n\nUn detalle útil: la cláusula `ORDER BY` sí puede usar el alias `filas_sobrantes`, porque se evalúa después del `SELECT`. Las cláusulas `WHERE` y `HAVING`, en cambio, no ven los alias del `SELECT`.",
    improvement_feedback: [
      { condition: "no_table_alias_in_join", message_key: "improve.no_table_alias_in_join" },
    ],
    reward: defaultReward("intermediate"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "dedup-correos-repetidos",
    section,
    title: "Cuentas distintas para la misma persona",
    difficulty: "intermediate",
    estimated_minutes: 10,
    concepts: ["group_by", "having", "text_functions", "aggregate", "order_by"],
    dataset: tiendaviva,
    tables_used: ["customers"],
    scenario_md:
      "**TiendaViva** va a lanzar un programa de puntos y el departamento de Atención al Cliente advierte un problema: hay gente que se registró dos veces porque el formulario acepta `Ana.Ruiz@ejemplo.lat` y `ana.ruiz@ejemplo.lat` como correos diferentes. La restricción de unicidad de la tabla no los detecta, pero para el negocio son la misma persona.\n\nPara el programa de puntos, la identidad de un cliente es **su correo sin distinguir mayúsculas ni espacios al inicio o al final**. Te piden la lista de casos afectados antes del lanzamiento.",
    business_question_md:
      "Debes generar un dataset que devuelva los correos normalizados que corresponden a más de una fila de la tabla `customers`, con cuatro columnas: el correo en minúsculas y sin espacios al inicio ni al final bajo el encabezado `correo`, la cantidad de filas que comparten ese correo bajo el encabezado `cuentas`, el `signup_at` más antiguo del grupo bajo el encabezado `primera_alta` y el más reciente bajo el encabezado `ultima_alta`. Ordena por `cuentas` descendente y, si dos grupos empatan, debes desempatar usando `correo` ascendente.",
    learning_objective:
      "Detectar duplicados por clave de negocio normalizando el texto antes de agrupar.",
    theory_ref: l2,
    expected_columns: [
      { name: "correo", type: "text" },
      { name: "cuentas", type: "integer" },
      { name: "primera_alta", type: "timestamp" },
      { name: "ultima_alta", type: "timestamp" },
    ],
    validation_rules: {
      order_matters: true,
      required_concepts: ["group_by", "having", "text_functions"],
    },
    reference_solution:
      "SELECT\n  lower(btrim(email)) AS correo,\n  count(*) AS cuentas,\n  min(signup_at) AS primera_alta,\n  max(signup_at) AS ultima_alta\nFROM customers\nGROUP BY lower(btrim(email))\nHAVING count(*) > 1\nORDER BY cuentas DESC, correo;",
    alternative_solutions: [
      {
        label: "Normalizando en una CTE previa",
        sql: "WITH normalizados AS (\n  SELECT lower(btrim(email)) AS correo, signup_at\n  FROM customers\n)\nSELECT\n  correo,\n  count(*) AS cuentas,\n  min(signup_at) AS primera_alta,\n  max(signup_at) AS ultima_alta\nFROM normalizados\nGROUP BY correo\nHAVING count(*) > 1\nORDER BY cuentas DESC, correo;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Agrupar por la columna tal como está guardada no sirve: para la base de datos, dos escrituras distintas del mismo correo son valores distintos. Primero tienes que llevar el texto a una forma normalizada y agrupar por **esa** expresión.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "La función `lower(...)` pasa el texto a minúsculas y la función `btrim(...)` quita los espacios de los extremos; se pueden anidar una dentro de la otra. La misma expresión va en el `SELECT` y en el `GROUP BY`. Las funciones `min` y `max` sobre `signup_at` te dan las dos fechas del grupo, y el filtro por tamaño del grupo va en la cláusula `HAVING`.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT\n  ___(___(email)) AS correo,\n  ___ AS cuentas,\n  ___ AS primera_alta,\n  ___ AS ultima_alta\nFROM customers\nGROUP BY ___\n______ count(*) > ___\nORDER BY ___ DESC, ___;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "duplicates",
        description_md:
          "Agrupar por la columna `email` sin normalizarla: como esa columna tiene una restricción de unicidad, todos los grupos quedan de tamaño 1 y el resultado sale vacío. Es la conclusión falsa más cara de esta sección.",
      },
      {
        category: "syntax",
        description_md:
          "Escribir `GROUP BY correo` usando el alias definido en el `SELECT`: en PostgreSQL eso funciona para la cláusula `GROUP BY`, pero no para una condición como `HAVING lower(email) ...`; si mezclas los dos estilos el error es difícil de leer. Repetir la expresión completa, o usar una expresión de tabla común, es más seguro.",
      },
      {
        category: "aggregation_level",
        description_md:
          "Devolver también `full_name` o `id` en el `SELECT` sin agregarlos: PostgreSQL rechaza la consulta porque esas columnas no están en el `GROUP BY` ni dentro de una función de agregación.",
      },
      {
        category: "wrong_order",
        description_md:
          "Ordenar solamente por `cuentas` descendente: 35 de los 37 grupos empatan en 2, así que sin el segundo criterio el resultado cambia entre ejecuciones.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 37 filas: 35 correos con dos cuentas y 2 correos con tres cuentas, que son `antonella.gomez635@ejemplo.lat` y `regina.lopez252@ejemplo.lat`. En total hay 76 filas de la tabla `customers` donde el negocio ve 37 personas, es decir, 39 cuentas de más sobre 3000.\n\nLa idea central es que la clave de identidad **es una expresión** y no una columna. La expresión `lower(btrim(email))` es la definición de «mismo cliente» que acordaste con el negocio, y queda escrita a la vista de quien lea la consulta.\n\nLa función `btrim` casi nunca cambia el resultado en este dataset, y aun así vale la pena escribirla: no cuesta nada y cubre el caso de un correo copiado con un espacio al final, que es exactamente el tipo de dato que llega desde un formulario web.\n\nSi este chequeo fuera a correr todos los días, el paso siguiente sería crear un índice único funcional sobre `lower(email)` para que la base impida el problema en el origen. Detectar está bien; impedir es mejor.\n\nUn límite honesto de este enfoque: solo encuentra coincidencias **exactas después de normalizar**. La misma persona con dos correos distintos, como `ana.ruiz@` y `aruiz@`, no aparece acá, y no hay SQL que la encuentre sin otra señal, como el documento o el teléfono.",
    improvement_feedback: [
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
    slug: "dedup-lista-de-filas-a-eliminar",
    section,
    title: "La lista de filas que se van a eliminar",
    difficulty: "advanced",
    estimated_minutes: 14,
    concepts: ["window_function", "ranking", "cte", "aggregate", "order_by"],
    dataset: ritmo,
    tables_used: ["plays"],
    scenario_md:
      "El equipo de Ingeniería de **Ritmo** ya corrigió el reintento en la aplicación. Ahora hay que limpiar lo que quedó en la tabla y te piden el entregable concreto: la lista exacta de valores de `plays.id` que se van a borrar, con el identificador que se conserva en cada caso, para poder auditar la limpieza después.\n\nLa regla acordada es que en cada grupo duplicado se conserva la fila con el `id` más bajo, que es la primera que llegó, y se eliminan las demás.",
    business_question_md:
      "Debes generar un dataset con una fila por cada fila de `plays` que haya que eliminar, con cuatro columnas: el `plays.id` que se borra bajo el encabezado `id_a_eliminar`, el `id` más bajo de su grupo bajo el encabezado `id_conservado`, el `user_id` y el `track_id`. El grupo se define por la combinación de `user_id`, `track_id` y `played_at`. Ordena por `id_a_eliminar` ascendente.",
    learning_objective:
      "Usar ROW_NUMBER sobre la clave de identidad para separar la fila que se conserva de las que se eliminan.",
    theory_ref: l3,
    prerequisites: ["dedup-listar-reproducciones-repetidas"],
    expected_columns: [
      { name: "id_a_eliminar", type: "integer" },
      { name: "id_conservado", type: "integer" },
      { name: "user_id", type: "integer" },
      { name: "track_id", type: "integer" },
    ],
    validation_rules: { order_matters: true, required_concepts: ["window_function"] },
    reference_solution:
      "WITH marcadas AS (\n  SELECT\n    id,\n    user_id,\n    track_id,\n    row_number() OVER (PARTITION BY user_id, track_id, played_at ORDER BY id) AS copia,\n    min(id) OVER (PARTITION BY user_id, track_id, played_at) AS id_conservado\n  FROM plays\n)\nSELECT\n  id AS id_a_eliminar,\n  id_conservado,\n  user_id,\n  track_id\nFROM marcadas\nWHERE copia > 1\nORDER BY id_a_eliminar;",
    alternative_solutions: [
      {
        label: "Con una subconsulta agregada en lugar de ventanas",
        sql: "SELECT\n  p.id AS id_a_eliminar,\n  g.id_conservado,\n  p.user_id,\n  p.track_id\nFROM plays AS p\nINNER JOIN (\n  SELECT user_id, track_id, played_at, min(id) AS id_conservado\n  FROM plays\n  GROUP BY user_id, track_id, played_at\n  HAVING count(*) > 1\n) AS g\n  ON g.user_id = p.user_id\n AND g.track_id = p.track_id\n AND g.played_at = p.played_at\nWHERE p.id > g.id_conservado\nORDER BY id_a_eliminar;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "La palabra clave `DISTINCT` no sirve acá: necesitas conservar el `id`, y como el `id` es distinto en cada copia, ninguna fila se descarta. Lo que necesitas es numerar las filas dentro de cada grupo duplicado y quedarte con las que no son la primera.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Dentro de una expresión de tabla común calcula dos ventanas con la misma partición, formada por `user_id`, `track_id` y `played_at`: la función `row_number()` ordenada por `id`, para saber qué número de copia es cada fila, y la función `min(id)`, para saber cuál es la que se conserva. Después, en la consulta externa, filtra las filas cuyo número de copia sea mayor que 1. El filtro no puede ir en el mismo nivel que la ventana.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nWITH marcadas AS (\n  SELECT\n    id,\n    user_id,\n    track_id,\n    ___() OVER (PARTITION BY ___, ___, ___ ORDER BY ___) AS copia,\n    ___(id) OVER (PARTITION BY ___, ___, ___) AS id_conservado\n  FROM plays\n)\nSELECT id AS id_a_eliminar, id_conservado, user_id, track_id\nFROM marcadas\nWHERE ___ ___ 1\nORDER BY ___;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "syntax",
        description_md:
          "Escribir `WHERE row_number() OVER (...) > 1` directamente: PostgreSQL responde con el error «window functions are not allowed in WHERE», porque las funciones de ventana se calculan después del `WHERE`. Hace falta una expresión de tabla común o una subconsulta.",
      },
      {
        category: "duplicates",
        description_md:
          "Filtrar con `copia = 1` en vez de `copia > 1`: obtienes las 109 042 filas que se conservan, que es justamente lo contrario del entregable pedido.",
      },
      {
        category: "aggregation_level",
        description_md:
          "Poner la columna `id` dentro del `PARTITION BY`: cada partición queda con una sola fila, todas reciben el valor 1 en la columna de copia y el resultado sale vacío.",
      },
      {
        category: "wrong_order",
        description_md:
          "Omitir el `ORDER BY id` dentro de la ventana: sin él, la función `row_number` reparte los números de forma arbitraria y la fila conservada puede cambiar entre ejecuciones, con lo que la auditoría deja de ser reproducible.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 340 filas, con valores de `id_a_eliminar` entre 745 y 109 184. En todos los casos el `id_a_eliminar` es mayor que el `id_conservado`, porque la copia siempre se insertó después.\n\nEste es el ejercicio donde se ve por qué la función `ROW_NUMBER` no se puede reemplazar por `DISTINCT`: en cuanto el resultado tiene que arrastrar una columna que **no** forma parte de la clave de identidad, que acá es el `id`, la palabra clave `DISTINCT` deja de descartar cualquier cosa. El patrón «particiona por la identidad, ordena por la regla y filtra por el número» es el que vas a reutilizar el resto de tu carrera.\n\nLas dos ventanas comparten exactamente la misma partición, así que PostgreSQL las calcula en una sola pasada de ordenamiento. Si te incomoda repetir la lista de columnas, una cláusula `WINDOW` con nombre haría lo mismo; en este entorno preferimos escribirla completa.\n\nLa alternativa con `GROUP BY` y `min(id)` es igual de correcta y funciona en motores que no tienen funciones de ventana, a cambio de recorrer la tabla `plays` dos veces. Las dos formas devuelven exactamente las mismas 340 filas.\n\nUn último punto, y no es menor: esta consulta **no borra nada**. Entregar la lista para revisión antes de ejecutar una sentencia `DELETE` es la diferencia entre una limpieza auditada y un incidente.",
    improvement_feedback: [
      { condition: "uses_select_star", message_key: "improve.uses_select_star" },
    ],
    reward: defaultReward("advanced"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "dedup-ultimo-intento-de-pago",
    section,
    title: "El último intento de pago de cada pedido uruguayo",
    difficulty: "advanced",
    estimated_minutes: 14,
    concepts: ["distinct", "inner_join", "where", "order_by", "window_function"],
    dataset: tiendaviva,
    tables_used: ["payments", "orders", "customers"],
    scenario_md:
      "En **TiendaViva**, un pedido puede tener varios intentos de pago: si la tarjeta rechaza, la persona vuelve a intentar con otro medio. El departamento de Finanzas está armando el cierre de Uruguay y necesita **un intento por pedido**, el último registrado, porque unir `orders` con `payments` sin filtrar multiplica los pedidos y duplica la facturación del reporte.\n\nLa regla operativa acordada es que el último intento de un pedido es el que tiene el valor más alto en `payments.id`. No se usa la columna `paid_at` porque los intentos rechazados la tienen en `NULL`.",
    business_question_md:
      "Debes generar un dataset que, considerando solamente pedidos de clientes cuyo `country` es igual al texto `'UY'`, devuelva una fila por pedido con el **último** intento de pago: el `order_id`, el `payments.id` de ese intento bajo el encabezado `payment_id`, el `status`, el `method` y el `amount`. Ordena por `order_id` ascendente.",
    learning_objective:
      "Reducir varias filas por entidad a una sola con DISTINCT ON, respetando la regla de negocio que define cuál se conserva.",
    theory_ref: l3,
    expected_columns: [
      { name: "order_id", type: "integer" },
      { name: "payment_id", type: "integer" },
      { name: "status", type: "text" },
      { name: "method", type: "text" },
      { name: "amount", type: "numeric" },
    ],
    validation_rules: { order_matters: true, required_concepts: ["inner_join"] },
    reference_solution:
      "SELECT DISTINCT ON (p.order_id)\n  p.order_id,\n  p.id AS payment_id,\n  p.status,\n  p.method,\n  p.amount\nFROM payments AS p\nINNER JOIN orders AS o ON o.id = p.order_id\nINNER JOIN customers AS c ON c.id = o.customer_id\nWHERE c.country = 'UY'\nORDER BY p.order_id, p.id DESC;",
    alternative_solutions: [
      {
        label: "Con ROW_NUMBER, portable a otros motores",
        sql: "WITH intentos AS (\n  SELECT\n    p.order_id,\n    p.id AS payment_id,\n    p.status,\n    p.method,\n    p.amount,\n    row_number() OVER (PARTITION BY p.order_id ORDER BY p.id DESC) AS puesto\n  FROM payments AS p\n  INNER JOIN orders AS o ON o.id = p.order_id\n  INNER JOIN customers AS c ON c.id = o.customer_id\n  WHERE c.country = 'UY'\n)\nSELECT order_id, payment_id, status, method, amount\nFROM intentos\nWHERE puesto = 1\nORDER BY order_id;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "El país está en la tabla `customers` y el pedido enlaza el pago con el cliente, así que son tres tablas encadenadas. Una vez filtrado Uruguay, el problema se reduce a quedarte con una fila por pedido según un criterio explícito.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "PostgreSQL tiene una forma directa: la cláusula `SELECT DISTINCT ON (expresión)` conserva la primera fila de cada grupo. La condición es que el `ORDER BY` **empiece** por esa misma expresión; el criterio que viene después decide quién gana, y acá el ganador es el de `id` más alto. También puedes resolverlo numerando con `row_number()` dentro de una expresión de tabla común y filtrando el puesto 1.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT ______ ___ (p.order_id)\n  p.order_id,\n  p.id AS payment_id,\n  p.status,\n  p.method,\n  p.amount\nFROM payments AS p\nINNER JOIN orders AS o ON ___ = ___\nINNER JOIN customers AS c ON ___ = ___\nWHERE c.country = '___'\nORDER BY ___, ___ ___;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "syntax",
        description_md:
          "Escribir `DISTINCT ON (p.order_id) ... ORDER BY p.id DESC`: PostgreSQL responde con el error «SELECT DISTINCT ON expressions must match initial ORDER BY expressions». La cláusula `ORDER BY` tiene que empezar por `p.order_id`.",
      },
      {
        category: "duplicates",
        description_md:
          "Usar `DISTINCT` a secas: como la columna `payment_id` es única, ninguna fila se descarta y siguen apareciendo los 674 intentos en lugar de los 632 pedidos.",
      },
      {
        category: "null_handling",
        description_md:
          "Desempatar con `ORDER BY p.order_id, p.paid_at DESC`: en PostgreSQL los valores `NULL` van **primero** con orden descendente, y como los intentos rechazados tienen `paid_at` en `NULL`, conservarías justamente los rechazos. Si usaras esa columna necesitarías agregar `NULLS LAST`.",
      },
      {
        category: "join_condition",
        description_md:
          "Unir la tabla `payments` con `customers` directamente: no hay ninguna relación entre las dos; el enlace pasa por la tabla `orders`, desde `payments.order_id` hacia `orders.id` y de ahí hacia `orders.customer_id`.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 632 filas: los clientes uruguayos tienen 684 pedidos, de los cuales 632 registraron al menos un intento de pago, sumando 674 intentos en total. Sin deduplicar, el cierre contaría 674 cobros. Del resultado final, 511 quedan en `'approved'`, 90 en `'rejected'` y 31 en `'refunded'`.\n\nLa cláusula `DISTINCT ON` es una extensión específica de PostgreSQL y es difícil de superar en legibilidad: una línea dice «una fila por pedido» y el `ORDER BY` dice cuál. Tiene dos condiciones que conviene tener presentes: el `ORDER BY` debe empezar por las expresiones del `DISTINCT ON`, y el orden de salida queda determinado por ese mismo `ORDER BY`. Si Finanzas pidiera el resultado ordenado por importe, habría que envolver la consulta en una subconsulta y ordenar por fuera.\n\nLa versión con `ROW_NUMBER` devuelve exactamente las mismas 632 filas y es la que escribirías en SQL Server, MySQL u Oracle. Vale la pena conocer las dos.\n\nEl detalle que más veces rompe este tipo de consulta en producción es el de los valores `NULL`: la condición `ORDER BY paid_at DESC` parece la regla natural, porque suena a «el más reciente», y en esta tabla te devolvería preferentemente los intentos rechazados, ya que 2414 de ellos tienen `paid_at` en `NULL` y el orden descendente pone los nulos adelante. Por eso la regla de negocio se fijó sobre la columna `id`, que nunca está en `NULL`.",
    improvement_feedback: [
      { condition: "no_table_alias_in_join", message_key: "improve.no_table_alias_in_join" },
    ],
    reward: defaultReward("advanced"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "dedup-cuenta-ganadora-por-correo",
    section,
    title: "Qué cuenta sobrevive a la fusión",
    difficulty: "expert",
    estimated_minutes: 20,
    concepts: [
      "window_function",
      "ranking",
      "cte",
      "outer_join",
      "text_functions",
      "aggregate",
      "group_by",
    ],
    dataset: tiendaviva,
    tables_used: ["customers", "orders"],
    scenario_md:
      "**TiendaViva** decidió fusionar las cuentas duplicadas antes de lanzar el programa de puntos. Los departamentos de Producto, Atención al Cliente y Legales acordaron por escrito la regla del sobreviviente:\n\n1. Entre las cuentas que comparten el correo normalizado, gana la que tiene **más pedidos**.\n2. Si empatan en cantidad de pedidos, gana la de **alta más antigua**, es decir, la que tiene el `signup_at` menor.\n3. Si todavía empatan, gana la que tiene el `id` más bajo.\n\nAntes de ejecutar nada, el equipo de Ingeniería necesita saber cuántos pedidos habrá que repuntar hacia la cuenta ganadora de cada grupo, y te piden ese cálculo.",
    business_question_md:
      "Debes generar un dataset que, para cada correo normalizado, es decir, el valor de `email` en minúsculas y sin espacios en los extremos, que aparezca en más de una fila de la tabla `customers`, devuelva el `correo`, la cantidad de filas del grupo bajo el encabezado `cuentas`, el `customers.id` que sobrevive según la regla bajo el encabezado `id_ganador`, la cantidad de pedidos de esa cuenta bajo el encabezado `pedidos_ganador` y la cantidad de pedidos que suman todas las cuentas del grupo bajo el encabezado `pedidos_grupo`. Las cuentas sin ningún pedido cuentan como `0` y no deben desaparecer del resultado. Ordena por `correo` ascendente.",
    learning_objective:
      "Aplicar una regla de desempate de negocio completa para elegir la fila sobreviviente de cada grupo duplicado y medir el impacto de la fusión.",
    theory_ref: l3,
    prerequisites: ["dedup-correos-repetidos", "dedup-lista-de-filas-a-eliminar"],
    expected_columns: [
      { name: "correo", type: "text" },
      { name: "cuentas", type: "integer" },
      { name: "id_ganador", type: "integer" },
      { name: "pedidos_ganador", type: "integer" },
      { name: "pedidos_grupo", type: "integer" },
    ],
    validation_rules: {
      order_matters: true,
      required_concepts: ["window_function", "text_functions"],
    },
    reference_solution:
      "WITH duplicados AS (\n  SELECT lower(btrim(email)) AS correo\n  FROM customers\n  GROUP BY lower(btrim(email))\n  HAVING count(*) > 1\n),\ncandidatas AS (\n  SELECT\n    lower(btrim(c.email)) AS correo,\n    c.id,\n    c.signup_at,\n    count(o.id) AS pedidos\n  FROM customers AS c\n  INNER JOIN duplicados AS d ON d.correo = lower(btrim(c.email))\n  LEFT JOIN orders AS o ON o.customer_id = c.id\n  GROUP BY lower(btrim(c.email)), c.id, c.signup_at\n),\nelegidas AS (\n  SELECT\n    correo,\n    id,\n    pedidos,\n    count(*) OVER (PARTITION BY correo) AS cuentas,\n    sum(pedidos) OVER (PARTITION BY correo) AS pedidos_grupo,\n    row_number() OVER (PARTITION BY correo ORDER BY pedidos DESC, signup_at, id) AS puesto\n  FROM candidatas\n)\nSELECT\n  correo,\n  cuentas,\n  id AS id_ganador,\n  pedidos AS pedidos_ganador,\n  pedidos_grupo\nFROM elegidas\nWHERE puesto = 1\nORDER BY correo;",
    alternative_solutions: [
      {
        label: "Con DISTINCT ON y una subconsulta escalar para los pedidos",
        sql: "WITH candidatas AS (\n  SELECT\n    lower(btrim(c.email)) AS correo,\n    c.id,\n    c.signup_at,\n    (SELECT count(*) FROM orders AS o WHERE o.customer_id = c.id) AS pedidos\n  FROM customers AS c\n  WHERE lower(btrim(c.email)) IN (\n    SELECT lower(btrim(email)) FROM customers GROUP BY lower(btrim(email)) HAVING count(*) > 1\n  )\n),\ntotales AS (\n  SELECT correo, count(*) AS cuentas, sum(pedidos) AS pedidos_grupo\n  FROM candidatas\n  GROUP BY correo\n),\nganadoras AS (\n  SELECT DISTINCT ON (correo) correo, id, pedidos\n  FROM candidatas\n  ORDER BY correo, pedidos DESC, signup_at, id\n)\nSELECT\n  g.correo,\n  t.cuentas,\n  g.id AS id_ganador,\n  g.pedidos AS pedidos_ganador,\n  t.pedidos_grupo\nFROM ganadoras AS g\nINNER JOIN totales AS t ON t.correo = g.correo\nORDER BY g.correo;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Son tres pasos encadenados: primero identificar qué correos normalizados están duplicados, después calcular para cada cuenta de esos grupos su cantidad de pedidos, y recién entonces ordenar dentro del grupo según la regla acordada y quedarte con la primera fila.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "El conteo de pedidos por cuenta necesita un `LEFT JOIN` con la tabla `orders` y la expresión `count(o.id)`, no `count(*)`: así una cuenta sin pedidos devuelve `0` en lugar de `1`. Para la elección, la función `row_number()` particionada por el correo y ordenada por `pedidos DESC, signup_at, id` codifica las tres reglas en ese orden. Las columnas `cuentas` y `pedidos_grupo` salen de ventanas de agregación, con `count(*) OVER` y `sum(...) OVER` sobre la misma partición, calculadas antes de filtrar el puesto 1.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nWITH duplicados AS (\n  SELECT lower(btrim(email)) AS correo\n  FROM customers\n  GROUP BY ___\n  HAVING ___ > 1\n),\ncandidatas AS (\n  SELECT lower(btrim(c.email)) AS correo, c.id, c.signup_at, ___(o.id) AS pedidos\n  FROM customers AS c\n  INNER JOIN duplicados AS d ON ___ = ___\n  ____ JOIN orders AS o ON ___ = ___\n  GROUP BY lower(btrim(c.email)), c.id, c.signup_at\n),\nelegidas AS (\n  SELECT\n    correo, id, pedidos,\n    ___ OVER (PARTITION BY correo) AS cuentas,\n    ___ OVER (PARTITION BY correo) AS pedidos_grupo,\n    ___ OVER (PARTITION BY correo ORDER BY ___, ___, ___) AS puesto\n  FROM candidatas\n)\nSELECT correo, cuentas, id AS id_ganador, pedidos AS pedidos_ganador, pedidos_grupo\nFROM elegidas\nWHERE ___ = 1\nORDER BY ___;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "null_handling",
        description_md:
          "Contar los pedidos con `count(*)` después de un `LEFT JOIN`: una cuenta sin pedidos genera una fila con las columnas de `orders` en `NULL` y `count(*)` devuelve 1, así que la cuenta vacía puede terminar ganando el desempate. Hay que contar una columna de la tabla `orders`, por ejemplo con `count(o.id)`.",
      },
      {
        category: "join_condition",
        description_md:
          "Usar un `INNER JOIN` con la tabla `orders`: las cuentas sin pedidos desaparecen del grupo, la columna `cuentas` queda mal calculada y algunos grupos dejan de tener más de una fila.",
      },
      {
        category: "wrong_order",
        description_md:
          "Desempatar solamente por `pedidos DESC`: hay grupos con empate real, por ejemplo dos cuentas con un pedido cada una, y el ganador cambiaría entre ejecuciones. La regla necesita los tres criterios para ser determinista.",
      },
      {
        category: "aggregation_level",
        description_md:
          "Calcular las columnas `cuentas` y `pedidos_grupo` **después** de filtrar el puesto 1: en ese punto ya queda una sola fila por grupo, así que `cuentas` daría 1 y `pedidos_grupo` sería igual a `pedidos_ganador`. Las ventanas de agregación tienen que evaluarse antes del filtro.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 37 filas. Hay un dato interesante para la conversación con el negocio: en muchos grupos el ganador **no** es la cuenta con el `id` más bajo. Por ejemplo, el correo `ana.lucia.castillo1210@ejemplo.lat` lo gana la cuenta 2487, con 8 pedidos sobre un total de 14 del grupo, y el correo `micaela.bustos318@ejemplo.lat` lo gana la cuenta 1661, que concentra los 20 pedidos del grupo. Quedarse con «la primera que se registró», que es el reflejo habitual, habría dejado la cuenta vacía como sobreviviente en varios casos.\n\nLa consulta tiene tres capas y cada una responde una pregunta distinta: la expresión `duplicados` dice qué grupos existen, la expresión `candidatas` mide cada cuenta y la expresión `elegidas` aplica la regla. Separarlas así no es solo una cuestión estética: es lo que permite que alguien de Producto lea el `ORDER BY` de la ventana y confirme que dice exactamente lo que acordaron.\n\nEl punto fino es la diferencia entre `count(o.id)` y `count(*)`. Después de un `LEFT JOIN` sin coincidencias, la fila existe igual con las columnas de `orders` en `NULL`; la expresión `count(*)` cuenta filas y devolvería 1, mientras que `count(o.id)` ignora los `NULL` y devuelve 0. Con `count(*)`, una cuenta fantasma empataría con una cuenta que sí tiene un pedido.\n\nEl otro punto fino es el orden de evaluación: las expresiones `count(*) OVER` y `sum(...) OVER` se calculan sobre todas las filas de la partición, antes de que la condición `WHERE puesto = 1` de la consulta externa descarte a las perdedoras. Por eso la columna `pedidos_grupo` sigue reflejando al grupo completo.\n\nLa alternativa con `DISTINCT ON` es más corta para elegir, pero necesita una expresión de tabla común aparte para los totales, porque `DISTINCT ON` ya descartó las filas que había que sumar. Es un buen recordatorio de que la versión más breve no siempre es la más adecuada.\n\nY hay algo que la consulta no hace, que es justamente lo que Ingeniería tiene que planificar: repuntar los pedidos de las cuentas perdedoras hacia el `id_ganador` **antes** de eliminarlas. La columna `pedidos_grupo` menos la columna `pedidos_ganador` es exactamente el volumen de ese trabajo.",
    improvement_feedback: [
      { condition: "no_table_alias_in_join", message_key: "improve.no_table_alias_in_join" },
    ],
    reward: defaultReward("expert"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
];
