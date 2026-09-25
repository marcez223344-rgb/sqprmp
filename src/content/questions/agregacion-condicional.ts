import type { QuestionDef } from "../schemas/question";

const section = "agregacion-condicional";
const l1 = "agregacion-condicional-case-y-filter";
const l2 = "agregacion-condicional-tablas-pivote";
const l3 = "agregacion-condicional-tasas-y-proporciones";

export const questions: QuestionDef[] = [
  {
    slug: "agrcond-q01-where-vs-filter",
    section,
    lesson: l1,
    type: "single",
    difficulty: "intermediate",
    topic: "WHERE frente a FILTER",
    tags: ["conditional_aggregation", "filter"],
    estimated_seconds: 60,
    prompt_md:
      "Sobre la tabla `orders` necesitas **una sola fila** con dos números: el total de pedidos y, además, cuántos de esos pedidos tienen `status = 'delivered'`. ¿Cuál de estas afirmaciones describe correctamente la diferencia entre resolverlo con `WHERE` y resolverlo con `FILTER`?",
    code_md: null,
    options: [
      {
        key: "a",
        body_md:
          "`WHERE status = 'delivered'` recorta las filas de toda la consulta, así que el total también quedaría contando solo entregados; `count(*) FILTER (WHERE status = 'delivered')` aplica la condición únicamente a esa columna y deja el total intacto.",
        is_correct: true,
      },
      {
        key: "b",
        body_md:
          "Son equivalentes: `FILTER` es solo una forma más nueva de escribir el mismo `WHERE`.",
        is_correct: false,
        why_incorrect_md:
          "No son equivalentes. `WHERE` decide qué filas entran a la consulta completa; `FILTER` decide qué filas entran a **un** agregado. Con `WHERE` no podrías obtener el total y el subtotal en la misma fila.",
      },
      {
        key: "c",
        body_md:
          "`FILTER` se ejecuta después del `GROUP BY` y por eso puede usar alias de columnas del `SELECT`.",
        is_correct: false,
        why_incorrect_md:
          "`FILTER` forma parte de la llamada al agregado y su condición se evalúa fila por fila, sobre columnas de las tablas. No puede referirse a alias definidos en el `SELECT`.",
      },
      {
        key: "d",
        body_md:
          "`FILTER` obliga a recorrer la tabla una vez por cada columna condicional que escribas.",
        is_correct: false,
        why_incorrect_md:
          "Es al revés: todos los agregados de la consulta, con o sin `FILTER`, se calculan en la misma pasada por los datos.",
      },
    ],
    explanation_md:
      "`WHERE` filtra la consulta entera y `FILTER` filtra una columna calculada. Esa distinción es lo que permite devolver total y subtotales comparables en una sola fila y en una sola lectura de la tabla.",
    is_published: true,
  },
  {
    slug: "agrcond-q02-count-con-else-cero",
    section,
    lesson: l1,
    type: "error_diagnosis",
    difficulty: "intermediate",
    topic: "COUNT con CASE",
    tags: ["conditional_aggregation", "case", "null_handling"],
    estimated_seconds: 70,
    prompt_md:
      "La tabla `orders` tiene 18 000 filas, de las cuales 2313 tienen `status = 'cancelled'`. Esta consulta devuelve 18 000 en `cancelled_orders`. ¿Cuál es la causa?",
    code_md:
      "```sql\nSELECT count(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled_orders\nFROM orders;\n```",
    options: [
      {
        key: "a",
        body_md:
          "El `ELSE 0` hace que las filas no canceladas devuelvan `0`, que no es NULL; `count` cuenta todo valor no nulo, así que cuenta las 18 000 filas.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "`count` siempre devuelve el total de filas y no puede recibir una expresión.",
        is_correct: false,
        why_incorrect_md:
          "`count` acepta una expresión y, en esa forma, cuenta solo los valores no nulos. Lo que rompe el conteo es el `ELSE 0`, no el uso de una expresión.",
      },
      {
        key: "c",
        body_md: "Falta un `GROUP BY status` para que el `CASE` se evalúe por estado.",
        is_correct: false,
        why_incorrect_md:
          "El `CASE` se evalúa fila por fila antes de agregar; un `GROUP BY` cambiaría la forma del resultado, no el problema del `ELSE 0`.",
      },
      {
        key: "d",
        body_md:
          "El texto `'cancelled'` no coincide con ningún valor de `status`, así que el `CASE` nunca entra en la rama `THEN`.",
        is_correct: false,
        why_incorrect_md:
          "`'cancelled'` coincide con 2313 filas. Y aunque no coincidiera con ninguna, con `ELSE 0` el resultado sería el mismo 18 000: el problema es qué hace `count` con los ceros.",
      },
    ],
    explanation_md:
      "Con `count`, el `CASE` no debe llevar `ELSE`: las filas que no cumplen tienen que devolver NULL para quedar fuera del conteo. Las formas correctas son `count(*) FILTER (WHERE status = 'cancelled')`, `count(CASE WHEN status = 'cancelled' THEN 1 END)` o `sum(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END)`.",
    is_published: true,
  },
  {
    slug: "agrcond-q03-lectura-de-una-pasada",
    section,
    lesson: l1,
    type: "query_interpretation",
    difficulty: "intermediate",
    topic: "Lectura de agregados condicionales",
    tags: ["conditional_aggregation", "filter"],
    estimated_seconds: 60,
    prompt_md:
      "En la tabla `orders`, la columna `currency` indica la moneda del pedido (`'MXN'` son pesos mexicanos) y la columna `channel` vale `'app'`, `'web'` o `'marketplace_partner'`. ¿Qué devuelve exactamente esta consulta?",
    code_md:
      "```sql\nSELECT\n  count(*) AS total_orders,\n  avg(total_amount) FILTER (WHERE channel = 'app') AS avg_app\nFROM orders\nWHERE currency = 'MXN';\n```",
    options: [
      {
        key: "a",
        body_md:
          "Una fila con la cantidad de pedidos en pesos mexicanos y el importe promedio de los pedidos en pesos mexicanos hechos por la app.",
        is_correct: true,
      },
      {
        key: "b",
        body_md:
          "Una fila con la cantidad de pedidos en pesos mexicanos hechos por la app y el promedio de esos mismos pedidos.",
        is_correct: false,
        why_incorrect_md:
          "`total_orders` no tiene condición de canal: cuenta todos los pedidos en MXN, por cualquier canal. Solo el promedio está restringido a la app.",
      },
      {
        key: "c",
        body_md:
          "Una fila por canal, con el total de pedidos y el promedio de importe de cada uno.",
        is_correct: false,
        why_incorrect_md:
          "No hay `GROUP BY`, así que el resultado es una única fila para todo el conjunto filtrado por `WHERE`.",
      },
      {
        key: "d",
        body_md:
          "Una fila con el total de pedidos de todas las monedas y el promedio de los pedidos por app en pesos mexicanos.",
        is_correct: false,
        why_incorrect_md:
          "El `WHERE currency = 'MXN'` recorta la consulta completa: ninguna de las dos columnas ve pedidos de otras monedas.",
      },
    ],
    explanation_md:
      "Los dos filtros actúan en niveles distintos: `WHERE` define el universo (pedidos en MXN) y `FILTER` reparte ese universo dentro de una columna (solo los de la app). Sin `GROUP BY`, la salida es una sola fila.",
    is_published: true,
  },
  {
    slug: "agrcond-q04-sum-filter-sin-filas",
    section,
    lesson: l1,
    type: "true_false",
    difficulty: "advanced",
    topic: "Resultado de un agregado sin filas",
    tags: ["conditional_aggregation", "null_handling"],
    estimated_seconds: 45,
    prompt_md:
      "En un grupo donde **ninguna** fila cumple la condición, `sum(amount) FILTER (WHERE status = 'approved')` devuelve `0`.",
    code_md: null,
    options: [
      {
        key: "a",
        body_md: "Verdadero",
        is_correct: false,
        why_incorrect_md:
          "`sum` sobre un conjunto vacío devuelve NULL, no cero. El cero es lo que devuelve `count`, que empieza en cero por definición.",
      },
      { key: "b", body_md: "Falso", is_correct: true },
    ],
    explanation_md:
      "`sum` de un conjunto vacío es NULL: «no hay nada que sumar» no es lo mismo que «la suma vale cero». `count(*) FILTER (...)`, en cambio, sí devuelve 0. Si el reporte necesita un cero, escribe `coalesce(sum(amount) FILTER (WHERE status = 'approved'), 0)`.",
    is_published: true,
  },
  {
    slug: "agrcond-q05-palabra-filter",
    section,
    lesson: l1,
    type: "fill_blank",
    difficulty: "easy",
    topic: "Sintaxis de la agregación condicional",
    tags: ["conditional_aggregation", "sintaxis"],
    estimated_seconds: 30,
    prompt_md:
      "Completa la palabra clave que permite aplicar una condición a un agregado en PostgreSQL: `count(*) ______ (WHERE status = 'delivered') AS delivered_orders`. Escribe solo la palabra.",
    code_md: null,
    answer: { accepted: ["FILTER", "filter"], case_sensitive: false },
    explanation_md:
      "La cláusula es `FILTER (WHERE condición)` y se escribe inmediatamente después del paréntesis del agregado, antes del alias. Funciona con `count`, `sum`, `avg`, `min`, `max` y el resto de las funciones de agregación.",
    is_published: true,
  },
  {
    slug: "agrcond-q06-que-va-en-group-by",
    section,
    lesson: l2,
    type: "single",
    difficulty: "intermediate",
    topic: "Construcción de tablas pivote",
    tags: ["conditional_aggregation", "group_by", "pivote"],
    estimated_seconds: 55,
    prompt_md:
      "Quieres un reporte con **una fila por método de pago** (`payments.method`) y **una columna por estado del pago** (`payments.status`), donde cada celda tenga la cantidad de pagos. ¿Qué debe ir en el `GROUP BY`?",
    code_md: null,
    options: [
      {
        key: "a",
        body_md:
          "Solo `method`; cada estado se convierte en una columna con su propio agregado condicional.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "`method` y `status`, para que el motor tenga las dos dimensiones disponibles.",
        is_correct: false,
        why_incorrect_md:
          "Agrupar por las dos dimensiones devuelve el formato largo: una fila por cada combinación de método y estado, que es justo lo que la tabla pivote quiere evitar.",
      },
      {
        key: "c",
        body_md: "Solo `status`; los métodos se convierten en columnas.",
        is_correct: false,
        why_incorrect_md:
          "Eso invierte el reporte: tendrías una fila por estado y una columna por método, el pivote traspuesto del que te pidieron.",
      },
      {
        key: "d",
        body_md: "Nada: con `FILTER` el `GROUP BY` no es necesario.",
        is_correct: false,
        why_incorrect_md:
          "Sin `GROUP BY` el resultado es una sola fila para toda la tabla; los métodos no se abrirían en filas distintas.",
      },
    ],
    explanation_md:
      "La receta del pivote es constante: lo que quieres como filas va al `GROUP BY` y lo que quieres como columnas sale del `GROUP BY` y se transforma en un agregado con condición por cada valor.",
    is_published: true,
  },
  {
    slug: "agrcond-q07-afirmaciones-pivote",
    section,
    lesson: l2,
    type: "multiple",
    difficulty: "advanced",
    topic: "Límites de la tabla pivote",
    tags: ["conditional_aggregation", "pivote"],
    estimated_seconds: 90,
    prompt_md:
      "Marca **todas** las afirmaciones correctas sobre una tabla pivote escrita con agregación condicional (una columna por cada valor listado a mano en el `SELECT`).",
    code_md: null,
    options: [
      {
        key: "a",
        body_md:
          "La lista de columnas queda fija al escribir la consulta: un valor nuevo en la dimensión pivotada no genera una columna nueva por sí solo.",
        is_correct: true,
      },
      {
        key: "b",
        body_md:
          "Agregar un `count(*)` sin condición sirve de control: si las columnas condicionales no suman ese total, quedó algún valor sin contemplar.",
        is_correct: true,
      },
      {
        key: "c",
        body_md:
          "Para pivotar una dimensión con 300 valores distintos, como la ciudad, habría que escribir 300 expresiones condicionales en el `SELECT`.",
        is_correct: true,
      },
      {
        key: "d",
        body_md:
          "Lo que convierte los valores de la dimensión pivotada en columnas es ponerla en el `GROUP BY`.",
        is_correct: false,
        why_incorrect_md:
          "Es al revés: lo que va en el `GROUP BY` se convierte en **filas**. Las columnas salen de los agregados condicionales escritos a mano, uno por valor.",
      },
      {
        key: "e",
        body_md:
          "En una tabla pivote, las columnas condicionales siempre suman exactamente el total de la fila.",
        is_correct: false,
        why_incorrect_md:
          "Solo cuando las condiciones son excluyentes y cubren todos los valores. Si se solapan (por ejemplo, contar clientes que usan app y clientes que usan web) o si falta un valor, no suman el total.",
      },
    ],
    explanation_md:
      "Una tabla pivote, es decir, un reporte que convierte los valores de una columna en columnas del resultado, congela la lista de valores al escribir la consulta. Por eso se acompaña de una columna de total como control y se reserva para dimensiones con pocos valores y estables, como el canal o el método de pago: con una dimensión abierta, como la ciudad, habría que escribir y mantener cientos de columnas.",
    is_published: true,
  },
  {
    slug: "agrcond-q08-canal-nuevo",
    section,
    lesson: l2,
    type: "scenario",
    difficulty: "advanced",
    topic: "Mantenimiento de un reporte pivote",
    tags: ["conditional_aggregation", "pivote", "calidad"],
    estimated_seconds: 75,
    prompt_md:
      "Tu reporte mensual tiene una fila por país y las columnas `app_orders`, `web_orders`, `partner_orders` (cada una con `count(*) FILTER (WHERE channel = ...)`) más `total_orders` con `count(*)` sin condición. Este mes el marketplace habilitó un cuarto canal, `retail`, y nadie te avisó. ¿Qué ocurre con tu reporte?",
    code_md: null,
    options: [
      {
        key: "a",
        body_md:
          "Los pedidos de `retail` se cuentan en `total_orders` pero no aparecen en ninguna columna de canal, así que las tres columnas dejan de sumar el total.",
        is_correct: true,
      },
      {
        key: "b",
        body_md:
          "La consulta falla con un error porque `retail` no está contemplado en ningún `FILTER`.",
        is_correct: false,
        why_incorrect_md:
          "Ninguna condición se incumple: las filas de `retail` simplemente no satisfacen ningún `FILTER`. La consulta corre sin errores, que es lo que hace peligroso el problema.",
      },
      {
        key: "c",
        body_md:
          "Los pedidos de `retail` se reparten proporcionalmente entre las tres columnas existentes.",
        is_correct: false,
        why_incorrect_md:
          "SQL no reparte nada: cada agregado cuenta solo las filas que cumplen su condición y las demás quedan fuera de esa columna.",
      },
      {
        key: "d",
        body_md: "Los pedidos de `retail` quedan excluidos también de `total_orders`.",
        is_correct: false,
        why_incorrect_md:
          "`count(*)` no tiene condición: cuenta todas las filas del grupo, incluidas las del canal nuevo.",
      },
    ],
    explanation_md:
      "Es la falla silenciosa típica del pivote escrito a mano. La columna de total funciona como alarma: en cuanto las columnas dejan de sumar el total, sabes que apareció un valor no contemplado. Otra defensa es agregar una columna `other_orders` con la condición negada del resto.",
    is_published: true,
  },
  {
    slug: "agrcond-q09-division-entera",
    section,
    lesson: l3,
    type: "query_interpretation",
    difficulty: "advanced",
    topic: "División entera en tasas",
    tags: ["conditional_aggregation", "numeric_functions"],
    estimated_seconds: 60,
    prompt_md:
      "En la tabla `orders` hay pedidos en los tres canales y la proporción real de cancelados está entre 0,12 y 0,13 (entre 12 % y 13 %) en cada uno. ¿Qué valores devuelve la columna `rate` de esta consulta en PostgreSQL?",
    code_md:
      "```sql\nSELECT\n  channel,\n  count(*) FILTER (WHERE status = 'cancelled') / count(*) AS rate\nFROM orders\nGROUP BY channel;\n```",
    options: [
      {
        key: "a",
        body_md: "`0` en todas las filas, porque divide dos enteros y el resultado se trunca.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Valores cercanos a `0.12`, con los decimales correctos.",
        is_correct: false,
        why_incorrect_md:
          "`count` devuelve `bigint`: la división entre dos enteros en PostgreSQL es entera y descarta la parte decimal. Para obtener decimales hay que multiplicar por `100.0` o convertir a `numeric`.",
      },
      {
        key: "c",
        body_md: "Valores cercanos a `12`, porque PostgreSQL devuelve el porcentaje.",
        is_correct: false,
        why_incorrect_md:
          "Nada en la consulta multiplica por 100; el porcentaje hay que calcularlo de forma explícita.",
      },
      {
        key: "d",
        body_md: "Un error, porque no se puede dividir el resultado de dos agregados.",
        is_correct: false,
        why_incorrect_md:
          "Dividir dos agregados es válido y muy común. El problema es el tipo de datos del resultado, no la operación.",
      },
    ],
    explanation_md:
      "Entre enteros, `/` es división entera: en el canal `'web'` la cuenta es `861 / 6812`, que da `0`. La solución habitual es `round(100.0 * count(*) FILTER (WHERE status = 'cancelled') / nullif(count(*), 0), 2)`, donde el `100.0` fuerza aritmética numérica.",
    is_published: true,
  },
  {
    slug: "agrcond-q10-division-por-cero",
    section,
    lesson: l3,
    type: "error_diagnosis",
    difficulty: "advanced",
    topic: "División por cero en tasas condicionales",
    tags: ["conditional_aggregation", "null_handling"],
    estimated_seconds: 70,
    prompt_md:
      "Esta consulta calcula, para cada cliente de la tabla `orders`, cuántos pedidos devueltos (`status = 'returned'`) tiene por cada 100 pedidos entregados (`status = 'delivered'`). Falla con el error «division by zero» (división por cero) porque 151 clientes no tienen ningún pedido entregado. ¿Cuál es la mejor corrección?",
    code_md:
      "```sql\nSELECT\n  customer_id,\n  round(\n    100.0 * count(*) FILTER (WHERE status = 'returned')\n      / count(*) FILTER (WHERE status = 'delivered'),\n    2\n  ) AS return_rate_pct\nFROM orders\nGROUP BY customer_id;\n```",
    options: [
      {
        key: "a",
        body_md:
          "Envolver el denominador con `nullif(..., 0)`: los clientes sin pedidos entregados devuelven NULL en lugar de romper la consulta.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Envolver el denominador con `coalesce(..., 0)` para que nunca sea NULL.",
        is_correct: false,
        why_incorrect_md:
          "El denominador ya vale `0` (no NULL): `count` sin filas que cumplan devuelve cero. `coalesce` no cambia nada y el error persiste.",
      },
      {
        key: "c",
        body_md: "Agregar `WHERE status = 'delivered'` a la consulta.",
        is_correct: false,
        why_incorrect_md:
          "Ese `WHERE` elimina las filas devueltas del universo, así que el numerador daría siempre 0. Además el error desaparecería por accidente, no por diseño.",
      },
      {
        key: "d",
        body_md: "Cambiar `round(x, 2)` por `round(x)` para evitar la parte decimal.",
        is_correct: false,
        why_incorrect_md:
          "El redondeo se aplica después de la división: el error ocurre antes y `round` no lo previene.",
      },
    ],
    explanation_md:
      "`count(*) FILTER (...)` devuelve `0` cuando ninguna fila cumple, y dividir por cero aborta la consulta entera. `nullif(denominador, 0)` devuelve NULL cuando el denominador vale 0; la división da NULL y el reporte muestra «sin dato» para los clientes que no tienen ningún pedido entregado.",
    is_published: true,
  },
  {
    slug: "agrcond-q11-equivalencias",
    section,
    lesson: l1,
    type: "matching",
    difficulty: "intermediate",
    topic: "Lectura de agregados con FILTER",
    tags: ["conditional_aggregation", "case"],
    estimated_seconds: 80,
    prompt_md:
      "Sobre la tabla `orders` (columnas `status`, `channel`, `customer_id`, `total_amount`), relaciona cada expresión con lo que calcula.",
    code_md: null,
    pairs: [
      {
        left: "count(*) FILTER (WHERE status = 'paid')",
        right: "Cantidad de pedidos con estado 'paid'",
      },
      {
        left: "avg(total_amount) FILTER (WHERE channel = 'app')",
        right: "Importe promedio de los pedidos hechos por la app",
      },
      {
        left: "sum(total_amount) FILTER (WHERE status = 'paid')",
        right: "Importe acumulado de los pedidos con estado 'paid'",
      },
      {
        left: "count(DISTINCT customer_id) FILTER (WHERE channel = 'app')",
        right: "Cantidad de clientes distintos que compraron por la app",
      },
    ],
    explanation_md:
      "`FILTER` decide qué filas entran en cada agregado; el agregado decide qué se calcula con ellas: `count` cuenta, `sum` acumula el importe, `avg` lo promedia y `count(DISTINCT ...)` cuenta valores distintos, en este caso clientes y no pedidos.",
    is_published: true,
  },
  {
    slug: "agrcond-q12-clientes-distintos",
    section,
    lesson: l3,
    type: "scenario",
    difficulty: "expert",
    topic: "Contar entidades distintas con condición",
    tags: ["conditional_aggregation", "distinct"],
    estimated_seconds: 90,
    prompt_md:
      "El equipo de Producto te pide, por país, **cuántos clientes distintos** compraron al menos una vez por el canal `app` (no cuántos pedidos entraron por la app). Trabajas sobre `orders` unida con `customers` y agrupas por país. ¿Qué expresión responde la pregunta?",
    code_md: null,
    options: [
      {
        key: "a",
        body_md: "`count(DISTINCT o.customer_id) FILTER (WHERE o.channel = 'app')`",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "`sum(CASE WHEN o.channel = 'app' THEN 1 ELSE 0 END)`",
        is_correct: false,
        why_incorrect_md:
          "Suma una unidad por cada pedido, así que un cliente con 20 pedidos por la app cuenta 20 veces: eso mide pedidos, no personas.",
      },
      {
        key: "c",
        body_md: "`count(*) FILTER (WHERE o.channel = 'app')`",
        is_correct: false,
        why_incorrect_md:
          "Cuenta filas de `orders` que cumplen la condición, es decir pedidos por la app, no clientes distintos.",
      },
      {
        key: "d",
        body_md: "`DISTINCT count(o.customer_id) FILTER (WHERE o.channel = 'app')`",
        is_correct: false,
        why_incorrect_md:
          "`DISTINCT` va dentro del paréntesis, sobre la expresión que se cuenta. Escrito delante del agregado y después de otra columna (`SELECT country, DISTINCT count(...)`), PostgreSQL da un error de sintaxis; y si fuera la primera columna, sería un `SELECT DISTINCT`, que quita filas repetidas del resultado y no cuenta clientes distintos.",
      },
    ],
    explanation_md:
      "Cuando la unidad de medida es la persona y no la fila, el agregado tiene que deduplicar antes de contar. Las dos escrituras correctas son `count(DISTINCT o.customer_id) FILTER (WHERE o.channel = 'app')` y, de forma portable, `count(DISTINCT CASE WHEN o.channel = 'app' THEN o.customer_id END)`. Ningún `sum(CASE ...)` puede reemplazarlas.",
    is_published: true,
  },
];
