import type { QuestionDef } from "../schemas/question";

const section = "deduplicacion";
const l1 = "dedup-que-es-un-duplicado";
const l2 = "dedup-clave-de-negocio";
const l3 = "dedup-elegir-la-fila-ganadora";

export const questions: QuestionDef[] = [
  {
    slug: "dedup-q01-quien-define-el-duplicado",
    section,
    lesson: l1,
    type: "single",
    difficulty: "easy",
    topic: "Qué convierte a dos filas en duplicados",
    tags: ["clave_de_identidad", "criterio_de_negocio"],
    estimated_seconds: 45,
    prompt_md:
      "Una tabla de eventos tiene dos filas con el mismo `user_id` y el mismo `product_id`. ¿Qué determina si son duplicados o dos eventos legítimos?",
    code_md: null,
    options: [
      {
        key: "a",
        body_md:
          "La lista de columnas que el negocio acordó como clave de identidad del evento: si esas columnas coinciden en ambas filas, son duplicados.",
        is_correct: true,
      },
      {
        key: "b",
        body_md:
          "Que todas las columnas de la tabla coincidan, incluida la clave primaria: si algo difiere, no son duplicados.",
        is_correct: false,
        why_incorrect_md:
          "La clave primaria es un correlativo técnico y siempre difiere entre dos filas insertadas por separado. Con ese criterio nunca existirían duplicados.",
      },
      {
        key: "c",
        body_md:
          "Que la tabla no tenga una restricción `UNIQUE` sobre esas columnas: si la tiene, la base de datos ya garantiza que no hay duplicados.",
        is_correct: false,
        why_incorrect_md:
          "Una restricción `UNIQUE` solo cubre las columnas exactas que la definen y compara valores literales. Dos correos que difieren en una mayúscula la satisfacen y aun así son la misma persona.",
      },
      {
        key: "d",
        body_md: "Que `SELECT DISTINCT *` devuelva menos filas que `SELECT *`.",
        is_correct: false,
        why_incorrect_md:
          "Eso solo detecta filas idénticas en absolutamente todas las columnas. Es un caso particular, y con un id autoincremental nunca se cumple.",
      },
    ],
    explanation_md:
      "Deduplicar empieza fuera del SQL: alguien tiene que decidir qué columnas definen la identidad de una fila. En una tabla de reproducciones puede ser `(user_id, track_id, played_at)`; si solo tomaras `(user_id, track_id)`, borrarías escuchas repetidas legítimas. El motor ejecuta esa definición, no la inventa.",
    is_published: true,
  },
  {
    slug: "dedup-q02-distinct-con-id",
    section,
    lesson: l1,
    type: "true_false",
    difficulty: "easy",
    topic: "Límite de SELECT DISTINCT *",
    tags: ["distinct", "clave_primaria"],
    estimated_seconds: 40,
    prompt_md:
      "En una tabla con una clave primaria autoincremental (`id`), `SELECT DISTINCT * FROM tabla` elimina las filas duplicadas de negocio.",
    code_md: null,
    options: [
      { key: "a", body_md: "Falso", is_correct: true },
      {
        key: "b",
        body_md: "Verdadero",
        is_correct: false,
        why_incorrect_md:
          "`DISTINCT *` compara todas las columnas, incluida `id`. Como cada fila tiene un `id` distinto, ninguna se descarta: el resultado tiene exactamente las mismas filas que la tabla.",
      },
    ],
    explanation_md:
      "Para que `DISTINCT` sirva tienes que proyectar **solo** las columnas de la clave de identidad: `SELECT DISTINCT user_id, track_id, played_at FROM plays`. En cuanto agregas una columna que varía entre las copias —el `id`, un timestamp de carga—, las filas vuelven a ser diferentes y `DISTINCT` deja de descartar nada.",
    is_published: true,
  },
  {
    slug: "dedup-q03-clausula-filtro-grupos",
    section,
    lesson: l1,
    type: "fill_blank",
    difficulty: "easy",
    topic: "Cláusula que filtra grupos por su tamaño",
    tags: ["having", "group_by", "deteccion"],
    estimated_seconds: 35,
    prompt_md:
      "Completa la palabra clave que falta para quedarte solo con los grupos que tienen más de una fila:\n\n`SELECT email, count(*) FROM customers GROUP BY email ______ count(*) > 1;`\n\nEscribe solo esa palabra.",
    code_md: null,
    answer: { accepted: ["HAVING", "having"], case_sensitive: false },
    explanation_md:
      "`WHERE` filtra filas **antes** de agrupar, así que no puede ver `count(*)`; PostgreSQL responde `aggregate functions are not allowed in WHERE`. `HAVING` filtra los grupos ya formados y es el lugar natural del filtro `count(*) > 1`, que es el patrón universal de detección de duplicados.",
    is_published: true,
  },
  {
    slug: "dedup-q04-leer-consulta-de-deteccion",
    section,
    lesson: l1,
    type: "query_interpretation",
    difficulty: "intermediate",
    topic: "Qué devuelve una consulta de detección",
    tags: ["group_by", "having", "interpretacion"],
    estimated_seconds: 70,
    prompt_md:
      "La tabla `plays` tiene 109 382 filas y 340 combinaciones de `(user_id, track_id, played_at)` aparecen exactamente dos veces cada una. ¿Cuántas filas devuelve esta consulta?",
    code_md:
      "SELECT user_id, track_id, played_at, count(*) AS veces\nFROM plays\nGROUP BY user_id, track_id, played_at\nHAVING count(*) > 1;",
    options: [
      { key: "a", body_md: "340", is_correct: true },
      {
        key: "b",
        body_md: "680",
        is_correct: false,
        why_incorrect_md:
          "680 es la cantidad de **filas de la tabla** que participan en algún grupo duplicado. La consulta devuelve una fila por grupo, no una por fila original.",
      },
      {
        key: "c",
        body_md: "109 042",
        is_correct: false,
        why_incorrect_md:
          "109 042 es la cantidad de combinaciones únicas de la clave, es decir el resultado **sin** el `HAVING`. El filtro deja fuera todos los grupos de una sola fila.",
      },
      {
        key: "d",
        body_md: "109 382",
        is_correct: false,
        why_incorrect_md:
          "Ese es el total de filas de la tabla. `GROUP BY` colapsa las filas en grupos, así que el resultado nunca puede tener más filas que combinaciones distintas de la clave.",
      },
    ],
    explanation_md:
      "`GROUP BY` produce una fila por combinación distinta de la clave y `HAVING count(*) > 1` conserva solo los grupos con más de un integrante: 340 filas, todas con `veces = 2`. Para pasar del «cuántos grupos» al «cuántas filas sobran» se resta uno por grupo: 340 sobrantes, porque cada grupo conserva una fila.",
    is_published: true,
  },
  {
    slug: "dedup-q05-ventana-en-where",
    section,
    lesson: l3,
    type: "error_diagnosis",
    difficulty: "intermediate",
    topic: "Por qué falla filtrar una función de ventana en WHERE",
    tags: ["row_number", "cte", "orden_de_evaluacion"],
    estimated_seconds: 70,
    prompt_md:
      "Esta consulta debería devolver la fila más reciente de cada pedido, pero PostgreSQL la rechaza con `window functions are not allowed in WHERE`. ¿Cuál es la causa y la corrección?",
    code_md:
      "SELECT order_id, id, status\nFROM payments\nWHERE row_number() OVER (PARTITION BY order_id ORDER BY id DESC) = 1;",
    options: [
      {
        key: "a",
        body_md:
          "Las funciones de ventana se evalúan después de `WHERE`, así que `WHERE` no puede verlas. Hay que calcular `row_number()` en una CTE o subconsulta y filtrar el resultado en una capa externa.",
        is_correct: true,
      },
      {
        key: "b",
        body_md:
          "Falta `GROUP BY order_id`: `row_number()` necesita que las filas estén agrupadas antes de numerarlas.",
        is_correct: false,
        why_incorrect_md:
          "`row_number()` no requiere `GROUP BY`; `PARTITION BY` ya define los grupos de la ventana. Agregar `GROUP BY` cambiaría el nivel de agregación y no resolvería el error.",
      },
      {
        key: "c",
        body_md:
          "El error se corrige moviendo la condición a `HAVING`, que sí admite funciones de ventana.",
        is_correct: false,
        why_incorrect_md:
          "`HAVING` tampoco las admite: se evalúa antes que las ventanas. El mensaje de error sería equivalente.",
      },
      {
        key: "d",
        body_md:
          "`row_number()` no admite `ORDER BY ... DESC` dentro de `OVER`; hay que ordenar ascendente y usar `= 1`.",
        is_correct: false,
        why_incorrect_md:
          "`ORDER BY ... DESC` dentro de `OVER` es perfectamente válido y es justo lo que hace que gane la fila de `id` más alto. El error no tiene relación con el sentido del orden.",
      },
    ],
    explanation_md:
      "El orden lógico de evaluación es `FROM` → `WHERE` → `GROUP BY` → `HAVING` → funciones de ventana → `SELECT` → `ORDER BY`. Como las ventanas llegan casi al final, cualquier filtro sobre su resultado necesita una capa más:\n\n```sql\nWITH numeradas AS (\n  SELECT order_id, id, status,\n         row_number() OVER (PARTITION BY order_id ORDER BY id DESC) AS puesto\n  FROM payments\n)\nSELECT order_id, id, status FROM numeradas WHERE puesto = 1;\n```",
    is_published: true,
  },
  {
    slug: "dedup-q06-distinct-on-order-by",
    section,
    lesson: l3,
    type: "single",
    difficulty: "intermediate",
    topic: "Regla del ORDER BY en DISTINCT ON",
    tags: ["distinct_on", "postgresql", "sintaxis"],
    estimated_seconds: 55,
    prompt_md:
      "¿Qué condición obliga PostgreSQL a cumplir cuando escribes `SELECT DISTINCT ON (order_id) ...`?",
    code_md: null,
    options: [
      {
        key: "a",
        body_md:
          "El `ORDER BY` de la consulta debe empezar por las mismas expresiones que el `DISTINCT ON`; lo que venga después decide cuál fila de cada grupo se conserva.",
        is_correct: true,
      },
      {
        key: "b",
        body_md:
          "La consulta no puede tener `ORDER BY`, porque `DISTINCT ON` ya define el orden del resultado.",
        is_correct: false,
        why_incorrect_md:
          "Sin `ORDER BY` la consulta corre, pero la fila que sobrevive en cada grupo es arbitraria. El `ORDER BY` no solo se permite: es lo que hace determinista el resultado.",
      },
      {
        key: "c",
        body_md:
          "Las expresiones del `DISTINCT ON` deben aparecer también en un `GROUP BY` con las mismas columnas.",
        is_correct: false,
        why_incorrect_md:
          "`DISTINCT ON` no agrupa ni agrega: selecciona una fila completa por grupo. Combinarlo con `GROUP BY` no es necesario y suele ser un síntoma de confusión entre ambos mecanismos.",
      },
      {
        key: "d",
        body_md: "La expresión del `DISTINCT ON` tiene que ser la primera columna del `SELECT`.",
        is_correct: false,
        why_incorrect_md:
          "No hay ninguna exigencia sobre la posición en el `SELECT`; la expresión ni siquiera necesita estar proyectada. La restricción es únicamente sobre el `ORDER BY`.",
      },
    ],
    explanation_md:
      "`SELECT DISTINCT ON (order_id) ... ORDER BY order_id, id DESC` se lee como «una fila por pedido, la del `id` más alto». Si el `ORDER BY` no empieza por `order_id`, PostgreSQL responde `SELECT DISTINCT ON expressions must match initial ORDER BY expressions`. Como efecto secundario, el orden de salida queda fijado por ese `ORDER BY`: para presentar el resultado con otro orden hay que envolver la consulta.",
    is_published: true,
  },
  {
    slug: "dedup-q07-normalizaciones-validas",
    section,
    lesson: l2,
    type: "multiple",
    difficulty: "intermediate",
    topic: "Normalizar texto antes de agrupar",
    tags: ["normalizacion", "lower", "btrim", "clave_de_negocio"],
    estimated_seconds: 80,
    prompt_md:
      "Quieres detectar clientes registrados dos veces con el mismo correo escrito de forma distinta. Marca **todas** las afirmaciones correctas.",
    code_md: null,
    options: [
      {
        key: "a",
        body_md:
          "Hay que agrupar por la expresión normalizada (`lower(btrim(email))`), no por la columna cruda.",
        is_correct: true,
      },
      {
        key: "b",
        body_md:
          "Una restricción `UNIQUE` sobre `email` no impide este tipo de duplicado, porque compara los valores tal como se guardaron.",
        is_correct: true,
      },
      {
        key: "c",
        body_md:
          "La normalización se aplica en la consulta para comparar; el valor original se conserva en la tabla.",
        is_correct: true,
      },
      {
        key: "d",
        body_md:
          "Como el correo está normalizado, el método también detecta a la misma persona registrada con dos direcciones distintas (`ana.ruiz@` y `aruiz@`).",
        is_correct: false,
        why_incorrect_md:
          "Normalizar solo iguala escrituras diferentes del **mismo** texto. Dos direcciones distintas siguen siendo dos grupos; detectar ese caso exige otra señal, como el documento o el teléfono.",
      },
      {
        key: "e",
        body_md:
          "Conviene sobrescribir la columna `email` con la versión en minúsculas para que el problema no vuelva a aparecer.",
        is_correct: false,
        why_incorrect_md:
          "Pierdes cómo lo escribió la persona y no puedes auditar la decisión. La forma correcta de prevenirlo es un índice único funcional sobre `lower(email)`, que impide el duplicado sin destruir el dato original.",
      },
    ],
    explanation_md:
      "La clave de identidad puede ser una **expresión**, no solo una columna. `GROUP BY lower(btrim(email))` deja escrita la definición de «mismo cliente» a la vista de quien lea la consulta. Normalizas para comparar, nunca para guardar: si el negocio quiere impedir el problema en el origen, el lugar es un índice único funcional.",
    is_published: true,
  },
  {
    slug: "dedup-q08-tecnica-segun-situacion",
    section,
    lesson: l3,
    type: "matching",
    difficulty: "intermediate",
    topic: "Qué técnica corresponde a cada situación",
    tags: ["distinct", "row_number", "distinct_on", "group_by"],
    estimated_seconds: 90,
    prompt_md: "Relaciona cada situación con la técnica más adecuada para resolverla.",
    code_md: null,
    pairs: [
      {
        left: "Solo necesitas las combinaciones únicas de tres columnas, sin arrastrar ninguna otra",
        right: "SELECT DISTINCT sobre esas tres columnas",
      },
      {
        left: "Necesitas saber qué claves están repetidas y cuántas veces",
        right: "GROUP BY por la clave + HAVING count(*) > 1",
      },
      {
        left: "Necesitas la lista de ids a eliminar conservando una fila por grupo, en un motor cualquiera",
        right: "ROW_NUMBER sobre la clave en una CTE + filtro por el número de copia",
      },
      {
        left: "Quieres una fila completa por entidad, la más reciente, en PostgreSQL y en pocas líneas",
        right: "DISTINCT ON con el ORDER BY que codifica la regla",
      },
      {
        left: "Quieres una fila consolidada con el mínimo, el máximo y la suma de todo el grupo",
        right: "GROUP BY por la clave con funciones de agregación",
      },
    ],
    explanation_md:
      "Las cuatro herramientas resuelven problemas distintos. `DISTINCT` solo sirve cuando proyectas exclusivamente la clave. `GROUP BY` + `HAVING` es detección. `ROW_NUMBER` es el patrón general de selección de sobreviviente y funciona en cualquier motor. `DISTINCT ON` es la versión breve de PostgreSQL. Y cuando el negocio quiere una fila consolidada en lugar de una fila existente, la respuesta es agregar, no elegir.",
    is_published: true,
  },
  {
    slug: "dedup-q09-nulls-al-desempatar",
    section,
    lesson: l3,
    type: "scenario",
    difficulty: "advanced",
    topic: "NULL en la columna de desempate",
    tags: ["null_handling", "order_by", "nulls_last"],
    estimated_seconds: 90,
    prompt_md:
      "Quieres conservar el intento de pago más reciente de cada pedido y escribes `row_number() OVER (PARTITION BY order_id ORDER BY paid_at DESC)`. En esa tabla, los intentos rechazados tienen `paid_at` en NULL. ¿Qué pasa y cómo lo corriges?",
    code_md: null,
    options: [
      {
        key: "a",
        body_md:
          "Con `DESC`, PostgreSQL coloca los NULL primero, así que los rechazos ganan el puesto 1. Se corrige con `ORDER BY paid_at DESC NULLS LAST`, agregando además un desempate único como `id DESC`.",
        is_correct: true,
      },
      {
        key: "b",
        body_md:
          "Las filas con `paid_at` en NULL quedan fuera de la ventana y esos pedidos no aparecen en el resultado.",
        is_correct: false,
        why_incorrect_md:
          "Las funciones de ventana no descartan filas por tener un NULL en la columna de orden: todas participan, solo cambia su posición dentro de la partición.",
      },
      {
        key: "c",
        body_md:
          "`row_number()` devuelve NULL para esas filas, por lo que el filtro `= 1` las excluye automáticamente.",
        is_correct: false,
        why_incorrect_md:
          "`row_number()` siempre devuelve un entero correlativo desde 1; nunca devuelve NULL, sin importar el contenido de la columna de orden.",
      },
      {
        key: "d",
        body_md:
          "Con `DESC` los NULL van al final, así que el resultado ya es correcto y no hace falta cambiar nada.",
        is_correct: false,
        why_incorrect_md:
          "Es al revés: en PostgreSQL el valor por omisión es `NULLS FIRST` con `DESC` y `NULLS LAST` con `ASC`. Conviene no confiar en la memoria y escribirlo explícito.",
      },
    ],
    explanation_md:
      "En PostgreSQL los NULL se consideran mayores que cualquier valor al ordenar, así que con `DESC` aparecen primero. Un criterio de «lo más reciente» apoyado en una columna anulable puede terminar conservando exactamente las filas que querías descartar. Dos hábitos evitan el problema: escribir `NULLS LAST` cuando la columna admite nulos, y cerrar siempre el `ORDER BY` con una columna única (la clave primaria) para que el desempate sea total y el resultado, reproducible.",
    is_published: true,
  },
  {
    slug: "dedup-q10-distinct-tapa-cardinalidad",
    section,
    lesson: l2,
    type: "scenario",
    difficulty: "advanced",
    topic: "Filas repetidas por un join",
    tags: ["cardinalidad", "join", "distinct"],
    estimated_seconds: 85,
    prompt_md:
      "Un reporte une `orders` con `payments` y la facturación sale más alta de lo esperado. Cada pedido puede tener varios intentos de pago. Un colega propone agregar `DISTINCT` al `SELECT`. ¿Qué conviene responder?",
    code_md: null,
    options: [
      {
        key: "a",
        body_md:
          "Que el problema no son duplicados en los datos sino la cardinalidad del join, y que se resuelve reduciendo `payments` a una fila por pedido (agregando o eligiendo un intento) **antes** de unir.",
        is_correct: true,
      },
      {
        key: "b",
        body_md:
          "Que `DISTINCT` es la solución correcta, porque elimina las filas repetidas que generó el join.",
        is_correct: false,
        why_incorrect_md:
          "`DISTINCT` solo descarta filas idénticas en todas las columnas proyectadas. Como cada intento aporta un `payments.id` y un importe distintos, las filas no son idénticas y el total sigue inflado.",
      },
      {
        key: "c",
        body_md:
          "Que hay que ejecutar un `DELETE` sobre `payments` para dejar un intento por pedido y que el join deje de multiplicar.",
        is_correct: false,
        why_incorrect_md:
          "Los intentos de pago son datos legítimos y auditables: un pedido con tres intentos ocurrió así. Borrarlos para arreglar un reporte destruye información del negocio.",
      },
      {
        key: "d",
        body_md:
          "Que basta con cambiar el `INNER JOIN` por un `LEFT JOIN` para que no se repitan los pedidos.",
        is_correct: false,
        why_incorrect_md:
          "El tipo de join cambia qué pedidos aparecen cuando no hay pago, no cuántas veces aparece un pedido que sí tiene varios. La multiplicación se mantiene igual.",
      },
    ],
    explanation_md:
      "Vale la pena distinguir dos problemas que se parecen: **duplicados de datos** (la misma fila registrada dos veces) y **multiplicación por cardinalidad** (un join uno-a-muchos). El segundo no se arregla deduplicando el resultado, porque las filas no son iguales. Se arregla llevando el lado «muchos» a una fila por entidad antes de unir, con `GROUP BY`, `DISTINCT ON` o `ROW_NUMBER`. Si tu reflejo ante un total inflado es agregar `DISTINCT`, casi siempre estás tapando un error de cardinalidad.",
    is_published: true,
  },
  {
    slug: "dedup-q11-count-tras-left-join",
    section,
    lesson: l3,
    type: "error_diagnosis",
    difficulty: "advanced",
    topic: "count(*) frente a count(columna) tras un LEFT JOIN",
    tags: ["null_handling", "left_join", "count"],
    estimated_seconds: 80,
    prompt_md:
      "Se cuentan los pedidos de cada cliente para elegir qué cuenta duplicada sobrevive. Los clientes sin ningún pedido aparecen con `pedidos = 1` en lugar de 0. ¿Cuál es el error?",
    code_md:
      "SELECT c.id, count(*) AS pedidos\nFROM customers AS c\nLEFT JOIN orders AS o ON o.customer_id = c.id\nGROUP BY c.id;",
    options: [
      {
        key: "a",
        body_md:
          "`count(*)` cuenta filas, y el `LEFT JOIN` produce una fila con las columnas de `orders` en NULL para los clientes sin pedidos. Hay que usar `count(o.id)`, que ignora los NULL.",
        is_correct: true,
      },
      {
        key: "b",
        body_md:
          "El `LEFT JOIN` debería ser `INNER JOIN`: así los clientes sin pedidos no generan filas fantasma.",
        is_correct: false,
        why_incorrect_md:
          "Con `INNER JOIN` esos clientes desaparecen por completo del resultado en lugar de aparecer con 0. Para una regla de desempate necesitas que sigan compitiendo, aunque sea con cero pedidos.",
      },
      {
        key: "c",
        body_md: "Falta `o.id` en el `GROUP BY`, y por eso el conteo queda mal calculado.",
        is_correct: false,
        why_incorrect_md:
          "Agregar `o.id` al `GROUP BY` produciría una fila por pedido en lugar de una por cliente. El nivel de agregación actual es el correcto; lo que está mal es qué se cuenta.",
      },
      {
        key: "d",
        body_md: "Hay que envolver el resultado en `coalesce(count(*), 0)`.",
        is_correct: false,
        why_incorrect_md:
          "`count` nunca devuelve NULL: devuelve 0 cuando no hay nada que contar. `coalesce` no cambia nada aquí, porque el valor devuelto es 1, no NULL.",
      },
    ],
    explanation_md:
      "`count(*)` cuenta **filas del grupo**; `count(expresión)` cuenta los valores no nulos de esa expresión. Tras un `LEFT JOIN` sin coincidencias, la fila existe con todas las columnas de la tabla derecha en NULL, así que `count(*)` devuelve 1 y `count(o.id)` devuelve 0. En una regla de desempate esa diferencia decide qué cuenta sobrevive: con `count(*)`, una cuenta vacía empataría con una que sí tiene un pedido.",
    is_published: true,
  },
  {
    slug: "dedup-q12-orden-de-la-limpieza",
    section,
    lesson: l3,
    type: "single",
    difficulty: "advanced",
    topic: "Secuencia segura de una limpieza",
    tags: ["proceso", "integridad_referencial", "auditoria"],
    estimated_seconds: 60,
    prompt_md:
      "Ya identificaste las cuentas duplicadas y elegiste la ganadora de cada grupo. ¿Cuál es la secuencia correcta para ejecutar la limpieza?",
    code_md: null,
    options: [
      {
        key: "a",
        body_md:
          "Entregar la lista de filas afectadas para revisión, repuntar las filas dependientes (pedidos, pagos) hacia la cuenta ganadora y recién entonces eliminar las perdedoras.",
        is_correct: true,
      },
      {
        key: "b",
        body_md:
          "Eliminar primero las cuentas perdedoras y después revisar qué filas quedaron sin cliente asociado.",
        is_correct: false,
        why_incorrect_md:
          "Eliminar primero deja pedidos huérfanos o hace fallar el `DELETE` por una clave foránea. Y si el borrado ya ocurrió, reconstruir qué pedido pertenecía a quién es mucho más caro que haberlo previsto.",
      },
      {
        key: "c",
        body_md:
          "Ejecutar el `DELETE` directamente dentro de la misma consulta que detecta los duplicados, para evitar que los datos cambien entre un paso y otro.",
        is_correct: false,
        why_incorrect_md:
          "Ahorra un paso a cambio de no tener evidencia de qué se borró ni revisión humana previa. Una limpieza sin lista revisable no es auditable.",
      },
      {
        key: "d",
        body_md:
          "Crear una restricción `UNIQUE` sobre el correo normalizado antes de tocar los datos, para que la base impida el problema.",
        is_correct: false,
        why_incorrect_md:
          "Es una buena medida preventiva, pero no se puede crear mientras los duplicados existen: el índice fallaría. Va después de la limpieza, no antes.",
      },
    ],
    explanation_md:
      "Deduplicar no termina con un `DELETE`. La secuencia sana es: detectar → cuantificar → elegir ganadora con una regla escrita → entregar la lista para revisión → repuntar las dependencias → eliminar → recién entonces prevenir con un índice único funcional. Cada paso deja evidencia, y esa evidencia es lo que te permite responder tres meses después por qué una métrica cambió.",
    is_published: true,
  },
];
