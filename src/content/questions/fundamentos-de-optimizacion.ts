import type { QuestionDef } from "../schemas/question";

const section = "fundamentos-de-optimizacion";
const l1 = "optimizacion-el-trabajo-que-hace-el-motor";
const l2 = "optimizacion-predicados-sargables";
const l3 = "optimizacion-reducir-antes-de-unir";

export const questions: QuestionDef[] = [
  {
    slug: "optimizacion-q01-por-que-no-usa-el-indice",
    section,
    lesson: l2,
    type: "single",
    difficulty: "easy",
    topic: "Por qué una función sobre la columna anula el índice",
    tags: ["sargabilidad", "indices", "fechas"],
    estimated_seconds: 60,
    prompt_md:
      "Una tabla `orders` tiene un índice sobre `placed_at`, de tipo `timestamptz` (fecha y hora con zona horaria, parecido al `datetime` de otras bases de datos). El filtro `WHERE date_trunc('month', placed_at) = DATE '2025-07-01'` devuelve el resultado correcto, pero el motor recorre la tabla entera igual. ¿Por qué?",
    code_md: null,
    options: [
      {
        key: "a",
        body_md:
          "Porque el índice está ordenado por el valor de `placed_at`, no por el resultado de `date_trunc`, así que el motor tiene que calcular la función en cada fila para saber cuáles pasan.",
        is_correct: true,
      },
      {
        key: "b",
        body_md:
          "Porque `date_trunc` devuelve un `timestamp` y la columna es `timestamptz`, y PostgreSQL nunca usa un índice cuando los tipos difieren.",
        is_correct: false,
        why_incorrect_md:
          "La premisa es falsa: `date_trunc` aplicado a un `timestamptz` devuelve otro `timestamptz`, así que no hay diferencia de tipos. Y aunque la hubiera, PostgreSQL sabe comparar tipos de fecha distintos usando el índice. Lo que lo inutiliza es que el filtro compara una **expresión calculada**, no el valor indexado.",
      },
      {
        key: "c",
        body_md:
          "Porque `date_trunc` no es una función inmutable y PostgreSQL no puede indexar valores que cambian.",
        is_correct: false,
        why_incorrect_md:
          "Es cierto que `date_trunc` sobre un `timestamptz` no es inmutable (su resultado depende de la zona horaria de la sesión), y eso importa si quisieras crear un índice sobre esa expresión. Pero no explica este caso: aquí no existe ningún índice sobre la expresión, solo sobre la columna cruda, y ese índice no sirve para un filtro que habla de otra cosa.",
      },
      {
        key: "d",
        body_md:
          "Porque el filtro devuelve demasiadas filas y el motor decide que recorrer la tabla es más barato.",
        is_correct: false,
        why_incorrect_md:
          "Eso puede pasar con un filtro poco selectivo, pero no es este caso: julio es una fracción chica de la tabla. Con la versión de rango, el mismo filtro sí usa el índice.",
      },
    ],
    explanation_md:
      "Un índice B-tree es una estructura ordenada por el **valor de la columna**. Solo sirve si el filtro habla de ese valor. Envolver la columna en `date_trunc`, `extract`, `to_char` o `upper` obliga al motor a evaluar la expresión fila por fila, salvo que exista un índice creado sobre esa misma expresión. La versión sargable expresa lo mismo como rango: `placed_at >= TIMESTAMPTZ '2025-07-01 00:00:00+00' AND placed_at < TIMESTAMPTZ '2025-08-01 00:00:00+00'`.",
    is_published: true,
  },
  {
    slug: "optimizacion-q02-limit-sin-order-by",
    section,
    lesson: l1,
    type: "true_false",
    difficulty: "easy",
    topic: "LIMIT sin ORDER BY",
    tags: ["limit", "reproducibilidad", "order_by"],
    estimated_seconds: 40,
    prompt_md:
      "`SELECT id, total FROM orders LIMIT 10;` devuelve siempre las mismas diez filas mientras la tabla no cambie.",
    code_md: null,
    options: [
      { key: "a", body_md: "Falso", is_correct: true },
      {
        key: "b",
        body_md: "Verdadero",
        is_correct: false,
        why_incorrect_md:
          "Sin `ORDER BY`, SQL no garantiza ningún orden. El motor devuelve las diez filas que le resulten más baratas de producir, y eso puede cambiar si cambia el plan, si la tabla se reorganiza o si la consulta se ejecuta en paralelo, aunque los datos sean idénticos.",
      },
    ],
    explanation_md:
      "`LIMIT` sin `ORDER BY` significa «diez filas cualesquiera». Si el `LIMIT` responde una pregunta de negocio, necesita un `ORDER BY` con **desempate único**, normalmente agregando la clave primaria al final: `ORDER BY total DESC, id`. Sin ese desempate, dos filas con el mismo `total` pueden alternarse entre ejecuciones y el reporte deja de ser reproducible.",
    is_published: true,
  },
  {
    slug: "optimizacion-q03-no-existencia-segura",
    section,
    lesson: l3,
    type: "fill_blank",
    difficulty: "intermediate",
    topic: "Reducir el detalle a una fila por pedido antes de unir",
    tags: ["cte", "group_by", "grano"],
    estimated_seconds: 50,
    prompt_md:
      "Quieres mostrar cada pedido con sus unidades vendidas sin que el join multiplique filas, así que primero reduces `order_items` a una sola fila por pedido. Completa la columna que falta en el `GROUP BY`:\n\n```sql\nWITH unidades_por_pedido AS (\n  SELECT order_id, sum(quantity) AS unidades\n  FROM order_items\n  GROUP BY ______\n)\nSELECT o.id, o.total, u.unidades\nFROM orders AS o\nLEFT JOIN unidades_por_pedido AS u ON u.order_id = o.id;\n```\n\nEscribe solo lo que va en el hueco.",
    code_md: null,
    answer: {
      accepted: ["order_id", "order_items.order_id", "1"],
      case_sensitive: false,
    },
    explanation_md:
      "Agrupar por `order_id` deja la CTE (la consulta con nombre del `WITH`) con una fila por pedido, así que al unirla con `orders` cada pedido sigue apareciendo una sola vez. `GROUP BY 1`, que agrupa por la primera columna del `SELECT`, es equivalente. El `LEFT JOIN` conserva los pedidos que no tienen líneas: en Pídelo hay 178, y quedan con `unidades` en NULL. Es el patrón de «reducir antes de unir»: el join trabaja con 14 259 filas ya agregadas en lugar de con las 35 589 líneas de detalle.",
    is_published: true,
  },
  {
    slug: "optimizacion-q04-not-in-con-nulos",
    section,
    lesson: l3,
    type: "query_interpretation",
    difficulty: "advanced",
    topic: "Qué devuelve NOT IN cuando la subconsulta trae NULL",
    tags: ["not_in", "null", "logica_de_tres_valores"],
    estimated_seconds: 80,
    prompt_md:
      "La tabla `couriers` tiene 503 repartidores activos. La tabla `orders` tiene, en agosto de 2025, 1179 pedidos entregados con `courier_id` cargado y 101 pedidos cancelados con `courier_id` en `NULL`. ¿Cuántas filas devuelve esta consulta?",
    code_md:
      "SELECT c.id\nFROM couriers AS c\nWHERE c.is_active\n  AND c.id NOT IN (\n    SELECT o.courier_id\n    FROM orders AS o\n    WHERE o.placed_at >= TIMESTAMPTZ '2025-08-01 00:00:00+00'\n      AND o.placed_at <  TIMESTAMPTZ '2025-09-01 00:00:00+00'\n  );",
    options: [
      { key: "a", body_md: "0 filas", is_correct: true },
      {
        key: "b",
        body_md: "73 filas: los repartidores activos sin entregas en agosto",
        is_correct: false,
        why_incorrect_md:
          "Ese es el resultado que la persona que escribió la consulta esperaba, y el que devuelve la versión con `NOT EXISTS`. Con `NOT IN` y un `NULL` en la subconsulta, la condición nunca llega a ser verdadera.",
      },
      {
        key: "c",
        body_md: "503 filas: todos los repartidores activos",
        is_correct: false,
        why_incorrect_md:
          "Eso ocurriría si la condición fuera siempre verdadera. Con un `NULL` en la lista pasa exactamente lo contrario: nunca es verdadera.",
      },
      {
        key: "d",
        body_md: "La consulta falla con un error de comparación contra NULL",
        is_correct: false,
        why_incorrect_md:
          "No hay error. Ese es el peligro real: la consulta se ejecuta sin problemas y devuelve un resultado vacío que se confunde con «no hay casos».",
      },
    ],
    explanation_md:
      "`x NOT IN (a, b, NULL)` equivale a `x <> a AND x <> b AND x <> NULL`. La última comparación vale `UNKNOWN`, y un `AND` con `UNKNOWN` nunca puede dar `TRUE`. Como los pedidos cancelados de agosto aportan `courier_id` nulo a la subconsulta, ninguna fila pasa el filtro: **0 filas**. La corrección es `NOT EXISTS`, o —si insistes con `NOT IN`— agregar `WHERE o.courier_id IS NOT NULL` dentro de la subconsulta.",
    is_published: true,
  },
  {
    slug: "optimizacion-q05-anti-join-mal-escrito",
    section,
    lesson: l3,
    type: "error_diagnosis",
    difficulty: "advanced",
    topic: "Condiciones del lado débil en el WHERE",
    tags: ["left_join", "anti_join", "on_vs_where"],
    estimated_seconds: 80,
    prompt_md:
      "El objetivo es listar los restaurantes activos **sin** ningún pedido entregado en agosto de 2025. La consulta se ejecuta sin errores y devuelve cero filas. ¿Cuál es el problema?",
    code_md:
      "SELECT r.id, r.name\nFROM restaurants AS r\nLEFT JOIN orders AS o ON o.restaurant_id = r.id\nWHERE r.is_active\n  AND o.status = 'delivered'\n  AND o.placed_at >= TIMESTAMPTZ '2025-08-01 00:00:00+00'\n  AND o.id IS NULL;",
    options: [
      {
        key: "a",
        body_md:
          "Las condiciones sobre `orders` están en el `WHERE`, así que exigen filas de `orders` y anulan el `LEFT JOIN`; además chocan con `o.id IS NULL`. Deben ir en el `ON`.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Falta un `GROUP BY r.id, r.name` para que el `LEFT JOIN` no multiplique filas.",
        is_correct: false,
        why_incorrect_md:
          "Un `GROUP BY` resolvería las repeticiones, pero no el resultado vacío: la consulta devuelve cero filas antes de cualquier agrupación, porque las condiciones del `WHERE` son contradictorias entre sí.",
      },
      {
        key: "c",
        body_md:
          "El `LEFT JOIN` está al revés: hay que escribir `FROM orders LEFT JOIN restaurants`.",
        is_correct: false,
        why_incorrect_md:
          "El lado del join es el correcto: se quiere conservar todos los restaurantes y ver cuáles no tienen pedidos. Invertirlo cambiaría la pregunta.",
      },
      {
        key: "d",
        body_md: "Falta cerrar el rango de fechas con `o.placed_at < '2025-09-01'`.",
        is_correct: false,
        why_incorrect_md:
          "El rango efectivamente está incompleto y habría que cerrarlo, pero eso no explica el resultado vacío: aun con el rango completo, la consulta seguiría devolviendo cero filas por el conflicto entre el `WHERE` y `o.id IS NULL`.",
      },
    ],
    explanation_md:
      "En un `LEFT JOIN`, las filas sin coincidencia llegan al `WHERE` con todas las columnas de `orders` en `NULL`. Cualquier condición como `o.status = 'delivered'` en el `WHERE` las descarta, convirtiendo el `LEFT JOIN` en un `INNER JOIN`; y entonces `o.id IS NULL` no puede cumplirse nunca. El patrón correcto de *anti join* pone todas las condiciones del lado débil en el `ON` y deja en el `WHERE` solo `o.id IS NULL`. La alternativa más clara es `NOT EXISTS`.",
    is_published: true,
  },
  {
    slug: "optimizacion-q06-existencia-tres-caminos",
    section,
    lesson: l3,
    type: "single",
    difficulty: "intermediate",
    topic: "EXISTS, IN y JOIN + DISTINCT para una pregunta de existencia",
    tags: ["exists", "in", "distinct", "semi_join"],
    estimated_seconds: 70,
    prompt_md:
      "Necesitas los restaurantes que tienen **al menos un** pedido entregado, sin traer ningún dato del pedido. Las tres formas devuelven el mismo resultado. ¿Cuál es la afirmación correcta sobre su costo?",
    code_md:
      "-- A\nSELECT r.id, r.name FROM restaurants AS r\nWHERE EXISTS (SELECT 1 FROM orders AS o WHERE o.restaurant_id = r.id AND o.status = 'delivered');\n\n-- B\nSELECT r.id, r.name FROM restaurants AS r\nWHERE r.id IN (SELECT o.restaurant_id FROM orders AS o WHERE o.status = 'delivered');\n\n-- C\nSELECT DISTINCT r.id, r.name FROM restaurants AS r\nJOIN orders AS o ON o.restaurant_id = r.id AND o.status = 'delivered';",
    options: [
      {
        key: "a",
        body_md:
          "A y B suelen resolverse como un *semi join* y no generan filas repetidas; C genera una fila por pedido y después las descarta, así que hace más trabajo.",
        is_correct: true,
      },
      {
        key: "b",
        body_md:
          "C es la más rápida porque un join se resuelve con un solo recorrido, mientras que A y B ejecutan una subconsulta por cada restaurante.",
        is_correct: false,
        why_incorrect_md:
          "PostgreSQL no ejecuta `EXISTS` una vez por fila cuando puede evitarlo: lo transforma en un *semi join*, que se detiene en la primera coincidencia. `C` sí produce todas las filas intermedias antes de deduplicar.",
      },
      {
        key: "c",
        body_md:
          "A es más rápida que B porque `IN` siempre materializa la subconsulta completa antes de comparar.",
        is_correct: false,
        why_incorrect_md:
          "En PostgreSQL, `IN` con subconsulta y `EXISTS` suelen producir el mismo plan. La diferencia práctica entre ambas aparece en la negación (`NOT IN` frente a `NOT EXISTS`), no aquí.",
      },
      {
        key: "d",
        body_md:
          "Las tres son equivalentes en costo, porque el planificador reescribe cualquiera de ellas en la misma forma.",
        is_correct: false,
        why_incorrect_md:
          "PostgreSQL no reescribe `JOIN + DISTINCT` como un *semi join*: ejecuta el join completo, con una fila por cada pedido entregado de cada restaurante, y recién después elimina las repetidas. A y B, en cambio, sí se resuelven como *semi join*.",
      },
    ],
    explanation_md:
      "Para preguntas de existencia, `EXISTS` e `IN` expresan la intención y permiten al motor detenerse en la primera coincidencia. `JOIN + DISTINCT` materializa una fila por pedido y ordena o agrupa para deduplicar. Y tiene un riesgo adicional: si mañana alguien agrega una columna de `orders` al `SELECT`, el `DISTINCT` deja de deduplicar y el resultado se infla sin que nadie lo note.",
    is_published: true,
  },
  {
    slug: "optimizacion-q07-cuales-son-sargables",
    section,
    lesson: l2,
    type: "multiple",
    difficulty: "intermediate",
    topic: "Reconocer filtros sargables",
    tags: ["sargabilidad", "like", "indices"],
    estimated_seconds: 90,
    prompt_md:
      "La tabla `orders` tiene índices sobre `placed_at`, `total` y `payment_method`, y `restaurants` tiene un índice sobre `name`. La base usa la intercalación `C` (en inglés *collation*, las reglas con las que se ordena el texto), igual que el entorno de práctica. **Selecciona todos** los filtros que el motor puede resolver aprovechando el índice correspondiente.",
    code_md: null,
    options: [
      {
        key: "a",
        body_md: "`WHERE placed_at >= TIMESTAMPTZ '2025-07-01 00:00:00+00'`",
        is_correct: true,
      },
      { key: "b", body_md: "`WHERE payment_method IN ('cash', 'wallet')`", is_correct: true },
      { key: "c", body_md: "`WHERE name LIKE 'Fuego%'`", is_correct: true },
      {
        key: "d",
        body_md: "`WHERE extract(year FROM placed_at) = 2025`",
        is_correct: false,
        why_incorrect_md:
          "`extract` envuelve la columna: el índice está ordenado por `placed_at`, no por el año extraído. El equivalente sargable es `placed_at >= '2025-01-01' AND placed_at < '2026-01-01'`.",
      },
      {
        key: "e",
        body_md: "`WHERE name LIKE '%Fuego'`",
        is_correct: false,
        why_incorrect_md:
          "Con el comodín al principio no hay prefijo que fije por dónde empezar a leer el índice ordenado. Para buscar texto en cualquier posición hacen falta herramientas específicas (texto completo, trigramas).",
      },
      {
        key: "f",
        body_md: "`WHERE total * 1.21 > 1000`",
        is_correct: false,
        why_incorrect_md:
          "La columna está dentro de una operación aritmética. Despejando —`total > 1000 / 1.21`— la columna queda sola y el índice vuelve a servir.",
      },
    ],
    explanation_md:
      "La regla es una sola: **la columna sola de un lado del operador, la expresión constante del otro**. Los rangos (`>=`, `<`, `BETWEEN`), la igualdad, `IN` sobre una lista y `LIKE` con prefijo fijo respetan el orden del índice. Las funciones sobre la columna, la aritmética sobre la columna y los comodines iniciales lo rompen.\n\nUn detalle sobre `LIKE 'Fuego%'`: aprovecha un índice común porque la base usa la intercalación `C`. En una base con otra intercalación (por ejemplo `es_AR.UTF-8`, habitual en servidores reales), el índice tiene que crearse con la clase de operadores `text_pattern_ops` para que sirva a un `LIKE` con prefijo.",
    is_published: true,
  },
  {
    slug: "optimizacion-q08-tecnica-para-cada-problema",
    section,
    lesson: l3,
    type: "matching",
    difficulty: "intermediate",
    topic: "Qué técnica corresponde a cada problema",
    tags: ["patrones", "cardinalidad", "existencia"],
    estimated_seconds: 110,
    prompt_md: "Relaciona cada problema con la técnica que lo resuelve sin generar trabajo de más.",
    code_md: null,
    pairs: [
      {
        left: "Necesitas saber si un cliente tiene al menos un pedido, sin traer datos del pedido",
        right: "EXISTS",
      },
      {
        left: "Quieres los clientes que no tienen ningún pedido y la columna comparada admite NULL",
        right: "NOT EXISTS",
      },
      {
        left: "Debes sumar unidades y contar calificaciones, dos tablas que cuelgan de la misma tabla de pedidos",
        right: "Agregar cada rama por separado y unir después",
      },
      {
        left: "Filtras un mes sobre una columna timestamptz que tiene índice",
        right: "Rango semiabierto: >= inicio AND < inicio del mes siguiente",
      },
      {
        left: "Necesitas las diez filas más grandes y que la lista sea siempre la misma",
        right: "ORDER BY con desempate único (la clave primaria al final) más LIMIT",
      },
    ],
    explanation_md:
      "Las cinco situaciones comparten un mismo criterio: elegir la construcción que **no genera filas que después vas a descartar**. `EXISTS` se detiene en la primera coincidencia; `NOT EXISTS` es la única forma segura de la no-existencia cuando hay nulos; agregar por separado evita el producto cruzado entre dos tablas hijas; el rango semiabierto deja que el índice trabaje; y el desempate único es lo que hace reproducible un `LIMIT`.",
    is_published: true,
  },
  {
    slug: "optimizacion-q09-conteo-inflado-por-fan-out",
    section,
    lesson: l3,
    type: "scenario",
    difficulty: "advanced",
    topic: "Un conteo inflado por unir dos tablas hijas",
    tags: ["cardinalidad", "fan_out", "distinct"],
    estimated_seconds: 100,
    prompt_md:
      "Un tablero por restaurante informa 16 calificaciones para un restaurante que, según el sistema de encuestas, recibió 7. La consulta parte de `orders` y une `order_items` (una fila por línea de pedido) y `ratings` (a lo sumo una fila por pedido) en la misma sentencia, y calcula `sum(oi.quantity)` y `count(rt.id)`. ¿Cuál es la mejor corrección?",
    code_md: null,
    options: [
      {
        key: "a",
        body_md:
          "Llevar cada rama a su propio nivel: agregar `order_items` por restaurante en una CTE, agregar `ratings` por restaurante en otra, y unir los dos resultados, que ya están al mismo grano.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Reemplazar `count(rt.id)` por `count(DISTINCT rt.id)`.",
        is_correct: false,
        why_incorrect_md:
          "Devuelve el número correcto hoy y esconde la causa. El motor sigue generando todas las filas de más, `count(DISTINCT)` es caro en tablas grandes, y `sum(oi.quantity)` volvería a fallar el día que un pedido tenga dos calificaciones.",
      },
      {
        key: "c",
        body_md:
          "Cambiar el `JOIN` con `ratings` por un `LEFT JOIN` para no perder los pedidos sin calificación.",
        is_correct: false,
        why_incorrect_md:
          "El `LEFT JOIN` corrige otro problema (los restaurantes sin calificaciones desaparecerían), pero no cambia la multiplicación: la calificación se sigue repitiendo una vez por línea de pedido.",
      },
      {
        key: "d",
        body_md: "Agregar `DISTINCT` al `SELECT` de la consulta.",
        is_correct: false,
        why_incorrect_md:
          "`DISTINCT` elimina filas idénticas del resultado final; no tiene ningún efecto sobre lo que ya sumó o contó una función de agregación.",
      },
    ],
    explanation_md:
      "Un pedido con 4 líneas y 1 calificación produce 4 filas al unir las dos tablas hijas, y `count(rt.id)` cuenta esa calificación 4 veces. No es un error del motor: es exactamente lo que la consulta pidió. La regla general es que **dos tablas hijas del mismo padre se agregan por separado y después se unen**. Es a la vez la forma correcta y la barata: cada rama recorre su tabla una vez y produce pocas filas, en lugar de materializar el producto cruzado.",
    is_published: true,
  },
  {
    slug: "optimizacion-q10-where-o-having",
    section,
    lesson: l1,
    type: "single",
    difficulty: "intermediate",
    topic: "Dónde poner un filtro que no depende de una agregación",
    tags: ["where", "having", "orden_logico", "planificador"],
    estimated_seconds: 75,
    prompt_md:
      "Estas dos consultas sobre `orders` devuelven exactamente el mismo resultado. ¿Qué es correcto decir sobre ellas en PostgreSQL?",
    code_md:
      "-- A\nSELECT restaurant_id, count(*) AS pedidos\nFROM orders\nWHERE status = 'delivered'\nGROUP BY restaurant_id;\n\n-- B\nSELECT restaurant_id, count(*) AS pedidos\nFROM orders\nGROUP BY restaurant_id, status\nHAVING status = 'delivered';",
    options: [
      {
        key: "a",
        body_md:
          "En el orden lógico, B agrupa todos los estados y después descarta grupos. En la práctica, el planificador de PostgreSQL mueve al `WHERE` una condición de `HAVING` que no usa agregados, así que ejecuta las dos de la misma forma. Aun así, A es la forma recomendada: dice lo que quieres y no depende de esa optimización.",
        is_correct: true,
      },
      {
        key: "b",
        body_md:
          "B siempre hace más trabajo en PostgreSQL, porque agrupa las 14 437 filas y recién después descarta los grupos cuyo `status` no es `'delivered'`.",
        is_correct: false,
        why_incorrect_md:
          "Eso describe el orden lógico, no la ejecución. El planificador traslada al `WHERE` las condiciones de `HAVING` que no contienen agregados, y el plan de B filtra las filas antes de agrupar, igual que el de A: en un servidor PostgreSQL, `EXPLAIN` muestra el mismo plan para las dos.",
      },
      {
        key: "c",
        body_md:
          "B es más eficiente porque `HAVING` se aplica sobre los grupos, que son muchos menos que las filas originales.",
        is_correct: false,
        why_incorrect_md:
          "Para tener grupos primero hay que agrupar, así que filtrar después nunca puede ahorrar trabajo frente a filtrar antes. Y en PostgreSQL las dos terminan con el mismo plan: B no gana nada.",
      },
      {
        key: "d",
        body_md: "B falla, porque `HAVING` solo admite condiciones sobre funciones de agregación.",
        is_correct: false,
        why_incorrect_md:
          "`HAVING` admite cualquier expresión válida para el grupo, incluidas las columnas del `GROUP BY`. La consulta se ejecuta sin error.",
      },
    ],
    explanation_md:
      "El orden lógico es `FROM` → `WHERE` → `GROUP BY` → `HAVING` → `SELECT` → `ORDER BY` → `LIMIT`, y describe qué significa la consulta, no necesariamente cómo la ejecuta el motor. PostgreSQL detecta que `status = 'delivered'` en el `HAVING` no usa ningún agregado y lo aplica antes de agrupar. No puede hacer lo mismo con una condición que sí usa un agregado, como `count(*) > 5`, ni en algunos casos más complejos, por ejemplo con `GROUPING SETS`. La regla práctica sigue siendo la misma: si el filtro no depende de una agregación, escríbelo en `WHERE`. Es más claro para quien lee y no depende de lo que haga el planificador de cada motor.",
    is_published: true,
  },
  {
    slug: "optimizacion-q11-distinct-arregla-el-total",
    section,
    lesson: l1,
    type: "true_false",
    difficulty: "intermediate",
    topic: "Por qué SELECT * puede costar más que las columnas justas",
    tags: ["select_estrella", "indices", "index_only_scan"],
    estimated_seconds: 50,
    prompt_md:
      "`orders` tiene un índice sobre `placed_at`. La consulta `SELECT placed_at FROM orders WHERE placed_at >= TIMESTAMPTZ '2025-07-01 00:00:00+00'` puede responderse leyendo solo el índice, sin abrir la tabla. En cambio, `SELECT * FROM orders WHERE placed_at >= TIMESTAMPTZ '2025-07-01 00:00:00+00'` pierde esa posibilidad.",
    code_md: null,
    options: [
      { key: "a", body_md: "Verdadero", is_correct: true },
      {
        key: "b",
        body_md: "Falso",
        is_correct: false,
        why_incorrect_md:
          "Un índice guarda, además de la ubicación de cada fila, el valor de las columnas indexadas. Si la consulta solo pide esas columnas, PostgreSQL puede contestar desde el índice, con un paso del plan llamado `Index Only Scan`. `SELECT *` pide columnas que el índice no tiene, y para leerlas hay que ir a la tabla fila por fila.",
      },
    ],
    explanation_md:
      "Pedir solo las columnas que usas reduce lo que el motor lee y transporta, y además deja abierta la lectura desde el índice sin tocar la tabla. El enunciado dice «puede» por dos motivos: PostgreSQL necesita saber que las páginas de la tabla están al día, algo que registra el mantenimiento automático (`VACUUM`), y el planificador elige ese camino solo si le resulta más barato. `SELECT *` sirve para explorar una tabla, no para una consulta que alimenta un reporte.",
    is_published: true,
  },
  {
    slug: "optimizacion-q12-or-entre-columnas",
    section,
    lesson: l2,
    type: "single",
    difficulty: "advanced",
    topic: "OR entre columnas distintas y su reescritura con UNION",
    tags: ["or", "union", "indices"],
    estimated_seconds: 80,
    prompt_md:
      "`orders` tiene un índice sobre `payment_method` y otro sobre `promotion_id`. La consulta `SELECT id FROM orders WHERE payment_method = 'cash' OR promotion_id = 12;` recorre la tabla entera. Un compañero propone reescribirla como `SELECT id FROM orders WHERE payment_method = 'cash' UNION SELECT id FROM orders WHERE promotion_id = 12;`. ¿Qué es correcto decir de esa reescritura?",
    code_md: null,
    options: [
      {
        key: "a",
        body_md:
          "Devuelve el mismo conjunto de filas, porque `UNION` elimina duplicados, y permite que cada rama use su propio índice; conviene cuando ambas condiciones son selectivas.",
        is_correct: true,
      },
      {
        key: "b",
        body_md:
          "Devuelve el mismo conjunto de filas y es siempre más rápida, así que todo `OR` debería escribirse como `UNION`.",
        is_correct: false,
        why_incorrect_md:
          "No es siempre más rápida. Si las condiciones son poco selectivas o no hay índices detrás, se pagan dos recorridos más la deduplicación, y el `OR` original sale mejor. Es una herramienta, no una regla.",
      },
      {
        key: "c",
        body_md:
          "Cambia el resultado: los pedidos que cumplen las dos condiciones aparecerían dos veces.",
        is_correct: false,
        why_incorrect_md:
          "Eso pasaría con `UNION ALL`, que conserva duplicados. `UNION` a secas elimina las filas repetidas, así que el conjunto resultante es idéntico al del `OR`.",
      },
      {
        key: "d",
        body_md:
          "La reescritura es innecesaria, porque un `OR` entre columnas distintas siempre puede usar los dos índices a la vez.",
        is_correct: false,
        why_incorrect_md:
          "PostgreSQL puede combinar índices mediante un *bitmap index scan*, pero no siempre lo elige, y un índice sobre una columna no dice nada sobre la otra. El caso planteado es justamente uno en el que termina recorriendo la tabla.",
      },
    ],
    explanation_md:
      "Un `OR` entre columnas distintas es el caso típico en el que un índice por sí solo no alcanza, porque cada índice conoce una sola columna. Separar las ramas en dos consultas y unirlas con `UNION` deja que cada una use su índice. Dos advertencias: usa `UNION` (no `UNION ALL`) para no duplicar los que cumplen ambas, y aplica la reescritura solo cuando haya índices y las condiciones sean selectivas. Un `OR` sobre la **misma** columna (`status = 'a' OR status = 'b'`) sí es aprovechable y se escribe mejor como `IN`.",
    is_published: true,
  },
];
