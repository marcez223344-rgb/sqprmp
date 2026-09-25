import type { QuestionDef } from "../schemas/question";

const section = "depuracion-de-consultas";
const metodo = "depuracion-descomponer-y-contar";
const joins = "depuracion-joins-que-multiplican";
const filtros = "depuracion-filtros-nulos-y-grano";

export const questions: QuestionDef[] = [
  {
    slug: "dc-q01-consulta-que-corre-no-es-correcta",
    section,
    lesson: metodo,
    type: "single",
    difficulty: "easy",
    topic: "Método de depuración",
    tags: ["depuracion", "metodo"],
    estimated_seconds: 45,
    prompt_md:
      "Una consulta se ejecuta sin errores y devuelve números con el orden de magnitud esperado. ¿Qué garantiza eso?",
    options: [
      {
        key: "a",
        body_md:
          "Solo que la sintaxis es válida y los tipos son compatibles; no que la consulta responda la pregunta del negocio.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Que el resultado es correcto, porque el motor valida la lógica de la consulta.",
        is_correct: false,
        why_incorrect_md:
          "El motor no conoce la pregunta del negocio. Verifica sintaxis y tipos; una suma multiplicada por un join 1:N es tan válida para Postgres como la suma correcta.",
      },
      {
        key: "c",
        body_md: "Que no hay joins que multipliquen filas, porque eso produciría un error.",
        is_correct: false,
        why_incorrect_md:
          "El fan-out no produce ningún error: es una operación perfectamente legal que simplemente devuelve más filas de las que esperabas.",
      },
      {
        key: "d",
        body_md: "Que los datos de origen no tienen NULL en las columnas usadas.",
        is_correct: false,
        why_incorrect_md:
          "Los NULL tampoco generan errores. Cambian silenciosamente el resultado de comparaciones, promedios y conteos.",
      },
    ],
    explanation_md:
      "Los errores caros no son los que el motor reporta, sino los que no reporta: totales inflados, denominadores filtrados y promedios al grano equivocado. La única forma de saber que una consulta es correcta es verificarla contra cifras conocidas, descomponiéndola y contando cada paso.",
    is_published: true,
  },
  {
    slug: "dc-q02-count-star-vs-count-distinct",
    section,
    lesson: metodo,
    type: "single",
    difficulty: "intermediate",
    topic: "Diagnóstico del grano",
    tags: ["depuracion", "grano", "join"],
    estimated_seconds: 60,
    prompt_md:
      "En una consulta sobre `orders` con varios joins, `count(*)` devuelve 21 964 y `count(DISTINCT o.id)` devuelve 13 156. ¿Qué te dice esa diferencia?",
    options: [
      {
        key: "a",
        body_md:
          "Que algún join multiplicó filas: cada pedido aparece más de una vez, así que sumar o promediar columnas de `orders` dará un resultado inflado.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Que 8 808 pedidos están duplicados en la tabla `orders`.",
        is_correct: false,
        why_incorrect_md:
          "`orders.id` es clave primaria: no hay duplicados en la tabla. Las filas repetidas las produce el join, no el origen.",
      },
      {
        key: "c",
        body_md: "Que hay 8 808 filas con `o.id` en NULL.",
        is_correct: false,
        why_incorrect_md:
          "En una consulta que parte de `orders`, `o.id` es la clave primaria de esa tabla y nunca es NULL. La brecha se explica por repetición de pedidos, no por ausencia de valores.",
      },
      {
        key: "d",
        body_md: "Que falta un `GROUP BY` en la consulta.",
        is_correct: false,
        why_incorrect_md:
          "Los dos conteos son agregados de toda la consulta y no necesitan `GROUP BY`. Agregarlo no cambiaría el hecho de que el join repite pedidos.",
      },
    ],
    explanation_md:
      "La pareja `count(*)` / `count(DISTINCT clave)` es el diagnóstico más rápido del grano. Mientras coincidan, hay una fila por entidad; cuando se separan, un join 1:N repitió filas y toda agregación sobre columnas de la tabla repetida queda multiplicada.",
    is_published: true,
  },
  {
    slug: "dc-q03-error-fan-out-suma",
    section,
    lesson: joins,
    type: "error_diagnosis",
    difficulty: "intermediate",
    topic: "Fan-out en sumas",
    tags: ["depuracion", "join", "fan-out"],
    estimated_seconds: 80,
    prompt_md:
      "Esta consulta debería devolver los ingresos por país de los pedidos entregados. Devuelve aproximadamente el doble de lo que informa Finanzas. ¿Cuál es la causa?",
    code_md:
      "```sql\nSELECT c.country, round(sum(o.total_amount), 2) AS ingresos\nFROM orders AS o\nINNER JOIN customers AS c ON c.id = o.customer_id\nINNER JOIN order_items AS oi ON oi.order_id = o.id\nWHERE o.status = 'delivered'\nGROUP BY 1;\n```",
    options: [
      {
        key: "a",
        body_md:
          "El join con `order_items` repite cada pedido una vez por línea, así que `total_amount` se suma tantas veces como líneas tenga el pedido.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Falta un `HAVING sum(o.total_amount) > 0` para excluir pedidos sin importe.",
        is_correct: false,
        why_incorrect_md:
          "Los pedidos con importe cero no cambian una suma. El problema es de repetición de filas, no de filas con valor cero.",
      },
      {
        key: "c",
        body_md: "`GROUP BY 1` agrupa por la posición equivocada y mezcla países.",
        is_correct: false,
        why_incorrect_md:
          "`GROUP BY 1` agrupa por la primera columna del `SELECT`, que es `c.country`. Es equivalente a `GROUP BY c.country`.",
      },
      {
        key: "d",
        body_md: "El `INNER JOIN` con `customers` descarta pedidos y por eso el total se desvía.",
        is_correct: false,
        why_incorrect_md:
          "Ese join descartaría filas, lo que bajaría el total, no lo duplicaría. Además `customer_id` apunta siempre a un cliente existente.",
      },
    ],
    explanation_md:
      "`order_items` tiene 30 067 líneas para 18 000 pedidos: la relación es 1:N. Como `total_amount` vive en `orders`, el join lo repite. La corrección es quitar ese join (no aporta nada a la pregunta) o agregar `order_items` en una CTE con una fila por `order_id` antes de unir.",
    is_published: true,
  },
  {
    slug: "dc-q04-sum-distinct-no-corrige",
    section,
    lesson: joins,
    type: "true_false",
    difficulty: "intermediate",
    topic: "DISTINCT como corrección",
    tags: ["depuracion", "join", "distinct"],
    estimated_seconds: 45,
    prompt_md:
      "`sum(DISTINCT o.total_amount)` es una forma válida de corregir un total inflado por un join que multiplica filas.",
    options: [
      { key: "a", body_md: "Falso", is_correct: true },
      {
        key: "b",
        body_md: "Verdadero",
        is_correct: false,
        why_incorrect_md:
          "`sum(DISTINCT ...)` elimina los importes repetidos, no las filas repetidas: dos pedidos distintos que casualmente valgan lo mismo se cuentan una sola vez, y el total queda mal en la otra dirección.",
      },
    ],
    explanation_md:
      "`DISTINCT` sirve para contar entidades (`count(DISTINCT o.id)`), porque la clave identifica la entidad. Para sumar importes no sirve: la corrección real es volver al grano de una fila por pedido, agregando el detalle antes de unir.",
    is_published: true,
  },
  {
    slug: "dc-q05-where-apaga-left-join",
    section,
    lesson: filtros,
    type: "error_diagnosis",
    difficulty: "intermediate",
    topic: "WHERE contra ON en LEFT JOIN",
    tags: ["depuracion", "left-join", "null"],
    estimated_seconds: 80,
    prompt_md:
      "Esta consulta debería mostrar, por ciudad, cuántos clientes hay (`clientes`) y cuántos recibieron algún pedido (`con_entrega`). En todas las ciudades las dos columnas dan el mismo número, como si el 100 % de los clientes hubiera recibido un pedido. ¿Por qué?",
    code_md:
      "```sql\nSELECT c.city,\n  count(DISTINCT c.id) AS clientes,\n  count(DISTINCT o.customer_id) AS con_entrega\nFROM customers AS c\nLEFT JOIN orders AS o ON o.customer_id = c.id\nWHERE o.status = 'delivered'\nGROUP BY 1;\n```",
    options: [
      {
        key: "a",
        body_md:
          "El `WHERE` se aplica después del join y descarta las filas rellenadas con NULL, convirtiendo el `LEFT JOIN` en `INNER JOIN`: el denominador queda filtrado igual que el numerador.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "`count(DISTINCT c.id)` no puede usarse junto a `count(DISTINCT o.customer_id)`.",
        is_correct: false,
        why_incorrect_md:
          "Ambos conteos son válidos en la misma consulta. El problema no está en las funciones sino en las filas que llegan a ellas.",
      },
      {
        key: "c",
        body_md: "Falta `GROUP BY c.country` además de `c.city`.",
        is_correct: false,
        why_incorrect_md:
          "Agrupar también por país mejoraría la lectura si hubiera dos ciudades con el mismo nombre, pero no cambiaría en nada el 100 % en cada fila.",
      },
      {
        key: "d",
        body_md: "El `LEFT JOIN` debería ser `RIGHT JOIN` para conservar a todos los clientes.",
        is_correct: false,
        why_incorrect_md:
          "`RIGHT JOIN` conservaría todas las filas de `orders`, no todos los clientes. La dirección del join ya era la correcta; lo que falla es dónde está la condición.",
      },
    ],
    explanation_md:
      "El `LEFT JOIN` conserva a los clientes sin pedidos entregados pero deja `o.status` en NULL; el `WHERE` evalúa `NULL = 'delivered'`, que no es verdadero, y borra esas filas. La condición sobre la tabla opcional va en el `ON`: `LEFT JOIN orders AS o ON o.customer_id = c.id AND o.status = 'delivered'`.",
    is_published: true,
  },
  {
    slug: "dc-q06-not-in-con-nulos",
    section,
    lesson: filtros,
    type: "query_interpretation",
    difficulty: "advanced",
    topic: "NOT IN y NULL",
    tags: ["depuracion", "null", "subconsulta"],
    estimated_seconds: 90,
    prompt_md:
      "En `categories` hay 30 filas y `parent_id` es NULL en las 6 categorías raíz. ¿Qué devuelve esta consulta?",
    code_md:
      "```sql\nSELECT c.id, c.name\nFROM categories AS c\nWHERE c.id NOT IN (SELECT parent_id FROM categories);\n```",
    options: [
      {
        key: "a",
        body_md: "Cero filas, siempre, porque la lista del `NOT IN` contiene un NULL.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Las 24 categorías que no son padre de ninguna otra.",
        is_correct: false,
        why_incorrect_md:
          "Ese es el resultado que se buscaba, pero no el que se obtiene: con un NULL en la lista, `NOT IN` no puede devolver verdadero para ningún valor.",
      },
      {
        key: "c",
        body_md: "Las 6 categorías raíz, porque su `parent_id` es NULL.",
        is_correct: false,
        why_incorrect_md:
          "La condición compara `c.id` contra los valores de `parent_id`, no contra el `parent_id` de cada fila. Y aunque así fuera, el NULL en la lista anula el resultado.",
      },
      {
        key: "d",
        body_md: "Un error: `NOT IN` no acepta subconsultas que devuelvan NULL.",
        is_correct: false,
        why_incorrect_md:
          "Es sintaxis válida y se ejecuta sin advertencias. Precisamente por eso el error pasa desapercibido.",
      },
    ],
    explanation_md:
      "`x NOT IN (1, 2, NULL)` equivale a `x <> 1 AND x <> 2 AND x <> NULL`. La última comparación devuelve NULL, y un `AND` con NULL nunca puede dar verdadero: el resultado es siempre vacío. La reescritura segura es `NOT EXISTS (SELECT 1 FROM categories AS h WHERE h.parent_id = c.id)`.",
    is_published: true,
  },
  {
    slug: "dc-q07-not-exists-inmune",
    section,
    lesson: filtros,
    type: "fill_blank",
    difficulty: "intermediate",
    topic: "Reescritura inmune a NULL",
    tags: ["depuracion", "null", "exists"],
    estimated_seconds: 50,
    prompt_md:
      "Completa la palabra clave que, junto al `NOT` que ya está escrito, reemplaza a `NOT IN` sin sufrir el problema de los NULL, porque pregunta por la existencia de una fila en lugar de comparar valores:\n\n`WHERE NOT ______ (SELECT 1 FROM categories AS h WHERE h.parent_id = c.id)`\n\nEscribe solo la palabra que va en el hueco.",
    code_md: null,
    answer: { accepted: ["EXISTS", "NOT EXISTS"], case_sensitive: false },
    explanation_md:
      "`NOT EXISTS` evalúa si la subconsulta produce alguna fila. No compara valores, así que los NULL no intervienen: devuelve verdadero o falso, nunca NULL. Es la reescritura preferida de `NOT IN` y suele ser también la más eficiente, porque se detiene en la primera coincidencia.",
    is_published: true,
  },
  {
    slug: "dc-q08-avg-ignora-nulos",
    section,
    lesson: filtros,
    type: "single",
    difficulty: "intermediate",
    topic: "Promedios y NULL",
    tags: ["depuracion", "null", "agregacion"],
    estimated_seconds: 60,
    prompt_md:
      "`shipments` tiene 2 993 envíos de un transportista, de los cuales 222 no tienen `delivered_at`. Para cada envío calculas `horas`, la duración entre `shipped_at` y `delivered_at` en horas, que queda en NULL cuando falta `delivered_at`. ¿Cuál es la diferencia entre `avg(horas)` y `sum(horas) / count(*)` para esos envíos?",
    options: [
      {
        key: "a",
        body_md:
          "`avg` excluye los 222 nulos del numerador y del divisor; `sum(horas) / count(*)` los excluye del numerador pero los cuenta en el divisor, y el promedio queda más bajo.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "No hay diferencia: `avg` es exactamente `sum` dividido por `count(*)`.",
        is_correct: false,
        why_incorrect_md:
          "`avg` equivale a `sum(x) / count(x)`, no a `sum(x) / count(*)`. La diferencia aparece justamente cuando hay nulos.",
      },
      {
        key: "c",
        body_md: "`avg` trata los nulos como cero y por eso da un valor más bajo.",
        is_correct: false,
        why_incorrect_md:
          "Es al revés: `avg` los ignora. Quien los trata implícitamente como cero es la división por `count(*)`.",
      },
      {
        key: "d",
        body_md: "`sum` devuelve NULL en cuanto hay un NULL entre los valores, así que falla.",
        is_correct: false,
        why_incorrect_md:
          "`sum` ignora los nulos y devuelve NULL solo cuando **todos** los valores lo son o el conjunto está vacío.",
      },
    ],
    explanation_md:
      "`avg(x)` es `sum(x) / count(x)`: ambos lados ignoran los nulos. Dividir por `count(*)` mete en el divisor filas que no aportaron nada al numerador, como si su duración fuera cero. Con 222 envíos sin entregar sobre 2 993, el promedio baja unas diez horas.",
    is_published: true,
  },
  {
    slug: "dc-q09-grano-del-promedio",
    section,
    lesson: joins,
    type: "scenario",
    difficulty: "advanced",
    topic: "Grano de la agregación",
    tags: ["depuracion", "grano", "promedio"],
    estimated_seconds: 90,
    prompt_md:
      "Te piden el ticket promedio por canal. Tu consulta une `orders` con `order_items` y calcula `avg(o.total_amount)`. Según el canal, el resultado da entre un 27 % y un 36 % por encima del que informa facturación. ¿Cuál es la lectura correcta de tu número?",
    options: [
      {
        key: "a",
        body_md:
          "Es el ticket promedio ponderado por la cantidad de líneas de cada pedido: los pedidos con más artículos, que suelen ser más caros, pesan más.",
        is_correct: true,
      },
      {
        key: "b",
        body_md:
          "Es el ticket promedio correcto, y facturación está excluyendo pedidos que tú incluyes.",
        is_correct: false,
        why_incorrect_md:
          "La diferencia no viene de la población sino del grano: la misma población promediada al grano de línea pesa más a los pedidos de varias líneas.",
      },
      {
        key: "c",
        body_md:
          "Es el valor promedio de una línea de pedido, que es una métrica distinta pero igual de útil.",
        is_correct: false,
        why_incorrect_md:
          "El valor promedio de una línea saldría de promediar `quantity * unit_price`. Aquí se promedia el total del pedido repetido por cada línea, que no mide ni el pedido ni la línea.",
      },
      {
        key: "d",
        body_md:
          "Es el ticket promedio con impuestos, mientras que facturación lo informa sin ellos.",
        is_correct: false,
        why_incorrect_md:
          "El join con `order_items` no agrega impuestos a nada; solo repite filas. La diferencia es estructural, no de definición fiscal.",
      },
    ],
    explanation_md:
      "Dividir el número inflado por el promedio de líneas tampoco lo arregla, porque la ponderación no es uniforme. Hay que volver al grano de la entidad medida: una CTE con una fila por pedido y después `avg(total_amount)`. Verificación rápida: `promedio * pedidos` debe reconstruir el ingreso conocido del grupo.",
    is_published: true,
  },
  {
    slug: "dc-q10-inner-join-que-elimina",
    section,
    lesson: joins,
    type: "single",
    difficulty: "intermediate",
    topic: "Joins que eliminan filas",
    tags: ["depuracion", "join", "cobertura"],
    estimated_seconds: 60,
    prompt_md:
      "Un informe sobre «todos los pedidos» agrega un `INNER JOIN shipments` para mostrar el transportista. ¿Qué efecto tiene sobre la población del informe?",
    options: [
      {
        key: "a",
        body_md:
          "Descarta en silencio los pedidos sin envío (cancelados, pendientes y pagados que todavía no se despacharon), así que el informe deja de cubrir a todos los pedidos.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Ninguno: un join nunca quita filas, solo agrega columnas.",
        is_correct: false,
        why_incorrect_md:
          "Un `INNER JOIN` conserva únicamente las filas con coincidencia en ambos lados; las que no la tienen desaparecen.",
      },
      {
        key: "c",
        body_md: "Multiplica los pedidos, porque `shipments` es una tabla de detalle.",
        is_correct: false,
        why_incorrect_md:
          "Podría multiplicar si un pedido tuviera varios envíos, pero el efecto que se pregunta aquí, y el más probable con «todos los pedidos», es la pérdida de los que no tienen ninguno.",
      },
      {
        key: "d",
        body_md:
          "Convierte los pedidos sin envío en filas con NULL en las columnas de `shipments`.",
        is_correct: false,
        why_incorrect_md:
          "Eso haría un `LEFT JOIN`. El `INNER JOIN` no rellena con NULL: elimina la fila.",
      },
    ],
    explanation_md:
      "Cada vez que agregues un join conviene responder dos preguntas con una consulta, no con una intuición: ¿puede multiplicar filas? ¿puede eliminarlas? Si puede eliminar y no quieres perder población, es un `LEFT JOIN`.",
    is_published: true,
  },
  {
    slug: "dc-q11-mensajes-de-error",
    section,
    lesson: metodo,
    type: "matching",
    difficulty: "intermediate",
    topic: "Lectura de mensajes de error",
    tags: ["depuracion", "errores", "postgres"],
    estimated_seconds: 100,
    prompt_md:
      "Relaciona cada mensaje de Postgres con el diagnóstico que conviene revisar primero.",
    code_md: null,
    pairs: [
      {
        left: 'column "o.total_amount" must appear in the GROUP BY clause or be used in an aggregate function',
        right:
          "Seleccionas una columna a un grano distinto del grupo: define cuál es el grano de la consulta",
      },
      {
        left: "more than one row returned by a subquery used as an expression",
        right:
          "La subconsulta escalar devuelve varias filas: hay un problema de grano o falta un filtro",
      },
      {
        left: "operator does not exist: text = integer",
        right: "Comparas columnas de tipos distintos: revisa qué guarda realmente cada columna",
      },
      {
        left: "division by zero",
        right: "El denominador vale cero: protégelo con nullif y averigua por qué vale cero",
      },
    ],
    explanation_md:
      "Un error visible es información gratis. El reflejo útil no es silenciarlo (agregar la columna al `GROUP BY`, envolver todo en `min()`, poner un `LIMIT 1`) sino leer qué supuesto sobre los datos acaba de romperse. El peligro real está en la consulta que no protesta.",
    is_published: true,
  },
  {
    slug: "dc-q12-reconciliacion-paso-que-sube",
    section,
    lesson: metodo,
    type: "error_diagnosis",
    difficulty: "advanced",
    topic: "Tabla de reconciliación",
    tags: ["depuracion", "metodo", "join"],
    estimated_seconds: 100,
    prompt_md:
      "Una tabla de reconciliación cuenta cuántos pedidos sobreviven a cada paso de una cadena de filtros. El paso 2 muestra 14 229 pedidos y el paso 3, que solo agrega la condición «tiene algún pago registrado», muestra 15 357. ¿Qué explica que el número **suba**?",
    code_md:
      "```sql\ncon_pago AS (\n  SELECT f.id\n  FROM finalizados AS f\n  INNER JOIN payments AS p ON p.order_id = f.id\n)\n```",
    options: [
      {
        key: "a",
        body_md:
          "El `INNER JOIN` con `payments` multiplica: los pedidos con más de un pago aparecen varias veces. Con `EXISTS` o `SELECT DISTINCT` el paso vuelve a bajar, como corresponde.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "El paso 3 encontró pedidos que el paso 2 no había incluido.",
        is_correct: false,
        why_incorrect_md:
          "Imposible: el paso 3 se apoya en `finalizados`, así que solo puede quedarse con un subconjunto de sus pedidos. Si el conteo sube, lo que creció son las filas, no los pedidos.",
      },
      {
        key: "c",
        body_md: "El paso 3 debería usar `LEFT JOIN` para no perder los pedidos sin pago.",
        is_correct: false,
        why_incorrect_md:
          "Un `LEFT JOIN` evitaría perder filas, pero no evitaría duplicarlas: los pedidos con dos pagos seguirían generando dos filas y el conteo seguiría subiendo.",
      },
      {
        key: "d",
        body_md: "Falta `ORDER BY` y los pasos se muestran desordenados.",
        is_correct: false,
        why_incorrect_md:
          "El orden de presentación no cambia los conteos. Aquí el valor del paso 3 es realmente mayor que el del paso 2.",
      },
    ],
    explanation_md:
      "En una cadena de filtros los conteos solo pueden bajar o quedarse igual. Un paso que sube es la firma inconfundible de un fan-out: en TiendaViva hay 1 251 pedidos con dos pagos (un rechazo y un reintento aprobado), y 1 128 de ellos están entre los 14 229 finalizados: 14 229 + 1 128 = 15 357. `EXISTS` responde «tiene al menos uno» sin multiplicar filas, que es exactamente la semántica que la cadena necesita.",
    is_published: true,
  },
];
