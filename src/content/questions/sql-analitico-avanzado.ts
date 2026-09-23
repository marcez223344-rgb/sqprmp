import type { QuestionDef } from "../schemas/question";

const section = "sql-analitico-avanzado";
const capas = "avanzado-consultas-en-capas";
const subtotales = "avanzado-subtotales-rollup-cube";
const listas = "avanzado-arrays-y-json";

export const questions: QuestionDef[] = [
  {
    slug: "avanzado-q-rollup-niveles",
    section,
    lesson: subtotales,
    type: "single",
    difficulty: "advanced",
    topic: "ROLLUP",
    tags: ["rollup", "group by", "subtotales"],
    estimated_seconds: 60,
    prompt_md:
      "Una tabla tiene 6 valores distintos de `country` y 3 de `channel`, y todas las combinaciones existen. ¿Cuántas filas devuelve `GROUP BY ROLLUP (country, channel)`?",
    code_md: null,
    options: [
      {
        key: "a",
        body_md: "25 filas: 18 del cruce, 6 subtotales por país y 1 total general.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "18 filas: `ROLLUP` no agrega filas, solo cambia el orden.",
        is_correct: false,
        why_incorrect_md:
          "`ROLLUP` sí agrega filas: calcula niveles de agregación adicionales además del detalle.",
      },
      {
        key: "c",
        body_md: "28 filas: 18 del cruce, 6 por país, 3 por canal y 1 total general.",
        is_correct: false,
        why_incorrect_md:
          "Los 3 subtotales por canal solo aparecen con `CUBE`. `ROLLUP` va quitando columnas de derecha a izquierda, así que nunca agrupa por `channel` sola.",
      },
      {
        key: "d",
        body_md: "19 filas: 18 del cruce y el total general.",
        is_correct: false,
        why_incorrect_md:
          "Faltan los subtotales por país, que son el nivel intermedio de `ROLLUP (country, channel)`.",
      },
    ],
    explanation_md:
      "`ROLLUP (a, b)` calcula tres niveles: `(a, b)`, `(a)` y `()`. Con 6 países y 3 canales: 18 + 6 + 1 = 25 filas.",
    is_published: true,
  },
  {
    slug: "avanzado-q-grouping-lectura",
    section,
    lesson: subtotales,
    type: "query_interpretation",
    difficulty: "advanced",
    topic: "GROUPING",
    tags: ["grouping", "rollup", "null"],
    estimated_seconds: 90,
    prompt_md:
      "En el resultado de esta consulta aparece una fila con `pais = 'MX'` y `canal = NULL`. ¿Qué representa esa fila?",
    code_md:
      "SELECT c.country AS pais, o.channel AS canal, count(*) AS pedidos\nFROM orders AS o\nINNER JOIN customers AS c ON c.id = o.customer_id\nWHERE o.status = 'delivered'\nGROUP BY ROLLUP (c.country, o.channel);",
    options: [
      {
        key: "a",
        body_md: "El subtotal de México: todos sus pedidos entregados, sin abrir por canal.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Los pedidos de México cuyo `channel` está vacío en la base.",
        is_correct: false,
        why_incorrect_md:
          "Es la ambigüedad que `ROLLUP` introduce, pero en esta tabla `channel` no admite nulos. Para distinguir los dos casos en general se usa `grouping(o.channel)`, que devuelve 1 solo en las filas de subtotal.",
      },
      {
        key: "c",
        body_md: "El total general del reporte.",
        is_correct: false,
        why_incorrect_md:
          "El total general tiene `NULL` en **las dos** columnas agrupadas; aquí `pais` tiene un valor real.",
      },
      {
        key: "d",
        body_md: "Una fila de error: `ROLLUP` no debería producir nulos.",
        is_correct: false,
        why_incorrect_md:
          "Producir `NULL` en la columna agregada es el comportamiento normal y documentado de los niveles de `ROLLUP`.",
      },
    ],
    explanation_md:
      "En cada nivel de agregación, las columnas que `ROLLUP` dejó de agrupar se devuelven en `NULL`. `pais = 'MX'` con `canal = NULL` es el subtotal del país. Para etiquetarlo sin ambigüedad: `CASE WHEN grouping(o.channel) = 1 THEN 'TOTAL' ELSE o.channel END`.",
    is_published: true,
  },
  {
    slug: "avanzado-q-cube-vs-rollup",
    section,
    lesson: subtotales,
    type: "true_false",
    difficulty: "advanced",
    topic: "CUBE",
    tags: ["cube", "rollup"],
    estimated_seconds: 45,
    prompt_md:
      "«`GROUP BY CUBE (cocina, metodo)` devuelve, además del cruce y del total general, un subtotal por cada cocina **y** un subtotal por cada método de pago.» ¿Verdadero o falso?",
    code_md: null,
    options: [
      { key: "a", body_md: "Verdadero", is_correct: true },
      {
        key: "b",
        body_md: "Falso",
        is_correct: false,
        why_incorrect_md:
          "`CUBE (a, b)` calcula las cuatro combinaciones posibles: `(a, b)`, `(a)`, `(b)` y `()`. El que deja afuera el subtotal de la segunda dimensión sola es `ROLLUP`.",
      },
    ],
    explanation_md:
      "`CUBE` genera 2 elevado a *n* niveles: con dos dimensiones son cuatro (el cruce, cada dimensión por separado y el total general). `ROLLUP` genera *n* + 1, quitando columnas de derecha a izquierda.",
    is_published: true,
  },
  {
    slug: "avanzado-q-lateral-palabra-clave",
    section,
    lesson: capas,
    type: "fill_blank",
    difficulty: "advanced",
    topic: "LATERAL",
    tags: ["lateral", "subconsulta", "from"],
    estimated_seconds: 60,
    prompt_md:
      "Completa la palabra clave que permite que la subconsulta del `FROM` use `a.id`, una columna de la tabla que está a su izquierda.",
    code_md:
      "SELECT a.name, t.title\nFROM artists AS a\nCROSS JOIN ______ (\n  SELECT al.title\n  FROM albums AS al\n  WHERE al.artist_id = a.id\n  ORDER BY al.released_on DESC\n  LIMIT 1\n) AS t;",
    answer: { accepted: ["LATERAL", "lateral"], case_sensitive: false },
    explanation_md:
      '`LATERAL` habilita que una subconsulta del `FROM` referencie columnas de los elementos que la preceden. Sin ella, PostgreSQL responde `invalid reference to FROM-clause entry for table "a"`.',
    is_published: true,
  },
  {
    slug: "avanzado-q-lateral-afirmaciones",
    section,
    lesson: capas,
    type: "multiple",
    difficulty: "expert",
    topic: "LATERAL",
    tags: ["lateral", "top-n", "join"],
    estimated_seconds: 120,
    prompt_md:
      "¿Cuáles de estas afirmaciones sobre `LATERAL` son correctas? Marca todas las que apliquen.",
    code_md: null,
    options: [
      {
        key: "a",
        body_md:
          "Un `LIMIT` escrito dentro de la subconsulta lateral se aplica por cada fila de la izquierda, no al resultado final.",
        is_correct: true,
      },
      {
        key: "b",
        body_md:
          "`CROSS JOIN LATERAL` descarta las filas de la izquierda cuya subconsulta no devuelve ninguna fila.",
        is_correct: true,
      },
      {
        key: "c",
        body_md:
          "`LEFT JOIN LATERAL (...) AS x ON true` conserva esas filas con las columnas en `NULL`.",
        is_correct: true,
      },
      {
        key: "d",
        body_md: "La subconsulta lateral no necesita alias.",
        is_correct: false,
        why_incorrect_md:
          "PostgreSQL exige un alias para cualquier subconsulta del `FROM`, lateral o no.",
      },
      {
        key: "e",
        body_md: "`LATERAL` permite escribir sentencias `UPDATE` dentro del `FROM`.",
        is_correct: false,
        why_incorrect_md:
          "`LATERAL` solo cambia el alcance de las referencias a columnas; lo que va dentro sigue siendo una consulta `SELECT`.",
      },
    ],
    explanation_md:
      "`LATERAL` es «por cada fila de la izquierda, ejecuta esta consulta». De ahí que el `LIMIT` interno sea por grupo y que la variante `CROSS` se comporte como un join interno (descarta) y la variante `LEFT ... ON true` como uno externo (conserva).",
    is_published: true,
  },
  {
    slug: "avanzado-q-ventana-en-mismo-where",
    section,
    lesson: capas,
    type: "error_diagnosis",
    difficulty: "advanced",
    topic: "Orden de evaluación",
    tags: ["window function", "where", "cte"],
    estimated_seconds: 90,
    prompt_md: "Esta consulta falla. ¿Cuál es la causa y la corrección adecuada?",
    code_md:
      "SELECT category, name, operaciones,\n       row_number() OVER (PARTITION BY category ORDER BY operaciones DESC) AS puesto\nFROM pagos\nWHERE puesto <= 3\nORDER BY category, puesto;",
    options: [
      {
        key: "a",
        body_md:
          "El `WHERE` se evalúa antes que las funciones de ventana, así que `puesto` todavía no existe: hay que calcular la numeración en una CTE o subconsulta y filtrar en la capa siguiente.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Falta `GROUP BY category` para que `PARTITION BY` funcione.",
        is_correct: false,
        why_incorrect_md:
          "`PARTITION BY` no requiere `GROUP BY`: son mecanismos distintos. Agregar el `GROUP BY` cambiaría el grano del resultado sin resolver el error.",
      },
      {
        key: "c",
        body_md: "Hay que reemplazar el `WHERE` por `HAVING puesto <= 3`.",
        is_correct: false,
        why_incorrect_md:
          "`HAVING` también se evalúa antes que las ventanas, así que el error persiste con otro mensaje.",
      },
      {
        key: "d",
        body_md: "`row_number()` no admite `PARTITION BY`; hay que usar `rank()`.",
        is_correct: false,
        why_incorrect_md:
          "`row_number()` admite `PARTITION BY` sin problema; la función no tiene nada que ver con el error.",
      },
    ],
    explanation_md:
      "El orden de evaluación es `FROM` → `WHERE` → `GROUP BY` → `HAVING` → funciones de ventana → `SELECT` → `ORDER BY` → `LIMIT`. Filtrar por el resultado de una ventana siempre exige una capa adicional.",
    is_published: true,
  },
  {
    slug: "avanzado-q-agregado-anidado",
    section,
    lesson: capas,
    type: "error_diagnosis",
    difficulty: "expert",
    topic: "Ventana sobre agregado",
    tags: ["window function", "aggregate", "porcentaje"],
    estimated_seconds: 90,
    prompt_md:
      "Se busca el porcentaje que cada rubro representa sobre el total. PostgreSQL responde `aggregate function calls cannot be nested`. ¿Cuál es la corrección?",
    code_md:
      "SELECT m.category,\n       count(*) AS operaciones,\n       round(100.0 * count(*) / sum(count(*)), 2) AS porcentaje\nFROM transactions AS t\nINNER JOIN merchants AS m ON m.id = t.merchant_id\nGROUP BY m.category;",
    options: [
      {
        key: "a",
        body_md:
          "Convertir la suma externa en una ventana: `sum(count(*)) OVER ()`, que se evalúa después de agregar y devuelve el total general en cada fila.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Reemplazar `sum(count(*))` por `count(*)`.",
        is_correct: false,
        why_incorrect_md: "Eso divide cada grupo por sí mismo: todos los porcentajes darían 100.",
      },
      {
        key: "c",
        body_md: "Agregar `m.category` al `GROUP BY` una segunda vez.",
        is_correct: false,
        why_incorrect_md:
          "Repetir una columna en el `GROUP BY` no cambia nada; el problema es la anidación de agregados, no la agrupación.",
      },
      {
        key: "d",
        body_md: "Usar `HAVING sum(count(*)) > 0`.",
        is_correct: false,
        why_incorrect_md:
          "`HAVING` no resuelve la anidación: el agregado seguiría estando dentro de otro agregado.",
      },
    ],
    explanation_md:
      "Un agregado no puede contener otro agregado, pero **una ventana sí puede aplicarse sobre un agregado**, porque las ventanas se calculan después de la agregación. `sum(count(*)) OVER ()` es el total general junto a cada grupo, y evita una subconsulta entera.",
    is_published: true,
  },
  {
    slug: "avanzado-q-array-agg-orden",
    section,
    lesson: listas,
    type: "single",
    difficulty: "advanced",
    topic: "Arrays",
    tags: ["array_agg", "orden", "reproducibilidad"],
    estimated_seconds: 60,
    prompt_md:
      "Quieres la secuencia de estados de cada pedido y escribes `array_agg(event)` agrupando por `order_id`, sin `ORDER BY` dentro del agregado. ¿Cuál es el riesgo?",
    code_md: null,
    options: [
      {
        key: "a",
        body_md:
          "El orden de los elementos no está garantizado: la «secuencia» puede salir distinta entre ejecuciones y dejar de ser comparable.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Ninguno: `array_agg` respeta siempre el orden físico de inserción.",
        is_correct: false,
        why_incorrect_md:
          "El orden en que el motor entrega las filas al agregado depende del plan de ejecución y puede cambiar. No es una garantía del lenguaje.",
      },
      {
        key: "c",
        body_md: "La consulta falla: `array_agg` exige `ORDER BY`.",
        is_correct: false,
        why_incorrect_md:
          "La consulta se ejecuta sin error; ese es justamente el problema, porque el resultado parece correcto.",
      },
      {
        key: "d",
        body_md: "El array queda ordenado alfabéticamente por el valor.",
        is_correct: false,
        why_incorrect_md:
          "`array_agg` no ordena por valor; sin `ORDER BY` interno el orden simplemente no está definido.",
      },
    ],
    explanation_md:
      "`array_agg(event ORDER BY event_at, id)` es lo que convierte el resultado en una secuencia reproducible. El segundo criterio resuelve los empates de tiempo.",
    is_published: true,
  },
  {
    slug: "avanzado-q-json-vs-jsonb",
    section,
    lesson: listas,
    type: "single",
    difficulty: "expert",
    topic: "JSON",
    tags: ["json", "jsonb", "reproducibilidad"],
    estimated_seconds: 75,
    prompt_md:
      "Dos personas resuelven el mismo reporte y escriben las claves del documento en distinto orden. ¿Qué pasa con el texto resultante según usen `json_build_object` o `jsonb_build_object`?",
    code_md: null,
    options: [
      {
        key: "a",
        body_md:
          "Con `jsonb` el texto sale igual para ambas, porque `jsonb` normaliza y ordena las claves; con `json` sale en el orden en que cada una las escribió.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Sale igual en los dos casos: el orden de las claves nunca se conserva.",
        is_correct: false,
        why_incorrect_md:
          "`json` guarda el texto tal cual, incluidos el orden de las claves, los espacios y las claves repetidas.",
      },
      {
        key: "c",
        body_md: "Sale distinto en los dos casos: ninguno de los dos tipos define un orden.",
        is_correct: false,
        why_incorrect_md:
          "`jsonb` sí define un orden: almacena las claves ordenadas (por longitud y luego alfabéticamente), así que la salida es determinista.",
      },
      {
        key: "d",
        body_md: "Con `jsonb` la consulta falla si las claves no están en orden alfabético.",
        is_correct: false,
        why_incorrect_md:
          "Puedes escribir las claves en cualquier orden; `jsonb` las reordena al almacenarlas, sin error.",
      },
    ],
    explanation_md:
      "`json` es texto validado; `jsonb` es una representación interpretada que ordena las claves y elimina duplicadas. Para cualquier salida que alguien vaya a comparar, versionar o probar con un test, `jsonb` es la opción reproducible.",
    is_published: true,
  },
  {
    slug: "avanzado-q-funciones-de-lista",
    section,
    lesson: listas,
    type: "matching",
    difficulty: "advanced",
    topic: "Arrays y JSON",
    tags: ["array", "json", "funciones"],
    estimated_seconds: 120,
    prompt_md: "Relaciona cada función o operador con lo que devuelve.",
    code_md: null,
    pairs: [
      {
        left: "array_to_string(lista, ' > ')",
        right: "Un texto con los elementos unidos por el separador",
      },
      { left: "cardinality(lista)", right: "La cantidad de elementos del array" },
      { left: "unnest(lista)", right: "Una fila por cada elemento del array" },
      { left: "documento ->> 'clave'", right: "El valor de esa clave como texto plano" },
      {
        left: "grouping(columna)",
        right: "1 si la fila es un subtotal que agregó esa columna, 0 si no",
      },
    ],
    explanation_md:
      "Son las cinco piezas que aparecen una y otra vez al trabajar con listas, documentos y subtotales. Ojo con `->` frente a `->>`: el primero devuelve JSON (el texto queda entre comillas) y el segundo, texto plano.",
    is_published: true,
  },
  {
    slug: "avanzado-q-elegir-la-forma-del-reporte",
    section,
    lesson: subtotales,
    type: "scenario",
    difficulty: "expert",
    topic: "Diseño del reporte",
    tags: ["rollup", "cube", "pivote", "negocio"],
    estimated_seconds: 120,
    prompt_md:
      "Finanzas pide una tabla con los pedidos por país y por canal, donde se pueda leer el total de cada país, el total de cada canal y el total general. Los canales se agregan y se retiran varias veces al año. ¿Qué forma conviene?",
    code_md: null,
    options: [
      {
        key: "a",
        body_md:
          "`GROUP BY CUBE (country, channel)` con `grouping()` para etiquetar: entrega los cuatro niveles y no hay que tocar la consulta cuando aparece un canal nuevo.",
        is_correct: true,
      },
      {
        key: "b",
        body_md:
          "Un pivote con `count(*) FILTER (WHERE channel = 'app')` y una columna por canal, más una columna de total.",
        is_correct: false,
        why_incorrect_md:
          "Un pivote tiene columnas fijas: cada canal nuevo obliga a editar la consulta, y además no entrega el total de cada canal como fila comparable.",
      },
      {
        key: "c",
        body_md: "`GROUP BY ROLLUP (country, channel)`, que ya trae todos los totales pedidos.",
        is_correct: false,
        why_incorrect_md:
          "`ROLLUP` no calcula el subtotal por canal solo: quita columnas de derecha a izquierda, así que entrega el cruce, el total por país y el general, pero no el total por canal.",
      },
      {
        key: "d",
        body_md: "Tres consultas unidas con `UNION ALL`, una por cada nivel de totales.",
        is_correct: false,
        why_incorrect_md:
          "Da el mismo resultado, pero recorre la tabla tres veces y repite el filtro en tres lugares: es la fuente habitual de reportes que dejan de cuadrar.",
      },
    ],
    explanation_md:
      "País y canal son dimensiones independientes y el negocio quiere los márgenes en los dos sentidos: ese es el caso de `CUBE`. El formato largo (una fila por combinación) además sobrevive a los cambios de catálogo; el pivote se deja para la herramienta de visualización.",
    is_published: true,
  },
  {
    slug: "avanzado-q-participacion-antes-del-limit",
    section,
    lesson: capas,
    type: "query_interpretation",
    difficulty: "expert",
    topic: "Orden de evaluación",
    tags: ["window function", "limit", "porcentaje"],
    estimated_seconds: 105,
    prompt_md:
      "`escuchas` tiene una fila por artista con sus reproducciones del período (320 artistas en total). ¿Sobre qué total se calcula `participacion`?",
    code_md:
      "SELECT a.name,\n       round(100.0 * e.reproducciones / sum(e.reproducciones) OVER (), 2) AS participacion\nFROM escuchas AS e\nINNER JOIN artists AS a ON a.id = e.artist_id\nORDER BY e.reproducciones DESC, a.name\nLIMIT 10;",
    options: [
      {
        key: "a",
        body_md:
          "Sobre las reproducciones de los 320 artistas: la ventana se evalúa antes del `ORDER BY` y del `LIMIT`.",
        is_correct: true,
      },
      {
        key: "b",
        body_md:
          "Sobre las reproducciones de los 10 artistas devueltos, así que los porcentajes suman 100.",
        is_correct: false,
        why_incorrect_md:
          "El `LIMIT` es lo último que se aplica. Para obtener el peso dentro del top 10 habría que recortar en una capa previa y calcular la ventana después.",
      },
      {
        key: "c",
        body_md: "Sobre las reproducciones del artista de cada fila, por lo que siempre da 100.",
        is_correct: false,
        why_incorrect_md:
          "`OVER ()` sin `PARTITION BY` define una sola ventana con todas las filas, no una por artista.",
      },
      {
        key: "d",
        body_md: "La consulta falla porque `sum()` no puede convivir con `ORDER BY` y `LIMIT`.",
        is_correct: false,
        why_incorrect_md:
          "Es una función de ventana, no un agregado del `GROUP BY`: convive sin problema con `ORDER BY` y `LIMIT`.",
      },
    ],
    explanation_md:
      "Las funciones de ventana se evalúan después del `SELECT` lógico y **antes** del `ORDER BY` y del `LIMIT`. Por eso `OVER ()` ve el conjunto completo y el recorte posterior no altera el denominador. Mover el `LIMIT` a una capa anterior cambia el número y su significado.",
    is_published: true,
  },
];
