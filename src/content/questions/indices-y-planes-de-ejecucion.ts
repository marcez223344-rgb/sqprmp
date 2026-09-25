import type { QuestionDef } from "../schemas/question";

/**
 * Section 35 — theory questions, all eight types.
 *
 * Q6 and Q7 discuss execution plans. Q6 uses one of the three plans really captured against the
 * `pidelo` v1 snapshot with `EXPLAIN (ANALYZE, BUFFERS)` (the same captures printed in the lesson
 * `indices-leer-un-plan-de-ejecucion`). Q7 needs a pathological estimate/actual gap, which those
 * healthy plans do not contain, so its plan is presented as a **labelled schematic with
 * placeholder costs** and says so in the prompt — never as the real plan of a real query.
 */

const section = "indices-y-planes-de-ejecucion";
const queEsUnIndice = "indices-que-es-un-indice";
const leerUnPlan = "indices-leer-un-plan-de-ejecucion";
const joinsYPedidos = "indices-joins-y-pedidos-a-ingenieria";

export const questions: QuestionDef[] = [
  {
    slug: "indices-q01-selectividad-decide",
    section,
    lesson: queEsUnIndice,
    type: "single",
    difficulty: "easy",
    topic: "Selectividad",
    tags: ["indices", "selectividad"],
    estimated_seconds: 60,
    prompt_md:
      "En `orders` de Pídelo hay 14 437 pedidos y 13 284 tienen `status = 'delivered'`. Supón que existe un índice sobre `status`. ¿Qué hace el planificador con la consulta `SELECT sum(total) FROM orders WHERE status = 'delivered'`?",
    code_md: null,
    options: [
      {
        key: "a",
        body_md:
          "Lee la tabla completa (`Seq Scan`), porque el filtro deja pasar el 92 % de las filas y buscarlas una por una a través del índice costaría más.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Usa el índice, porque para eso se creó.",
        is_correct: false,
        why_incorrect_md:
          "Que el índice exista no obliga al motor a usarlo. El planificador compara costos y aquí el recorrido completo gana.",
      },
      {
        key: "c",
        body_md: "Usa el índice solo si la tabla tiene más de un millón de filas.",
        is_correct: false,
        why_incorrect_md:
          "La decisión no depende del tamaño absoluto de la tabla sino de la proporción de filas que el filtro deja pasar. Con el 92 %, el índice no conviene a ningún tamaño.",
      },
      {
        key: "d",
        body_md:
          "Devuelve un error, porque no se puede filtrar por una columna indexada dentro de un agregado.",
        is_correct: false,
        why_incorrect_md:
          "La consulta es válida: un índice nunca cambia qué consultas se pueden escribir, solo cómo se ejecutan.",
      },
    ],
    explanation_md:
      "Usar un índice son dos pasos: buscar en el índice las direcciones de las filas y después ir a la tabla a leer cada una. El segundo paso es el caro, porque esas filas están dispersas. Cuando hay que repetirlo 13 284 veces sobre una tabla de 14 437 filas, leer la tabla de corrido sale más barato. El mismo índice sí conviene para `status = 'cancelled'`, que deja pasar 1153 filas: con ese filtro, el plan pasa a usarlo.\n\nUn matiz: si la consulta fuera `SELECT count(*)`, que no necesita ninguna columna de la tabla, PostgreSQL podría contar leyendo solo el índice (`Index Only Scan`), que es más chico que la tabla. Por eso la pregunta suma `total`, una columna que el índice no tiene.",
    is_published: true,
  },
  {
    slug: "indices-q02-cardinalidad-candidatas",
    section,
    lesson: queEsUnIndice,
    type: "multiple",
    difficulty: "intermediate",
    topic: "Cardinalidad",
    tags: ["indices", "cardinalidad"],
    estimated_seconds: 90,
    prompt_md:
      "En `orders` de Pídelo (14 437 filas) mides: 4810 `customer_id` distintos, 400 `restaurant_id`, 600 `courier_id` (sin contar 1153 NULL), 2 `status` y 3 `payment_method`. ¿Cuáles de estas afirmaciones son correctas? Selecciona todas las que apliquen.",
    code_md: null,
    options: [
      {
        key: "a",
        body_md:
          "Un filtro de igualdad por `customer_id` deja pasar unas 3 filas en promedio, así que un índice por esa columna rinde.",
        is_correct: true,
      },
      {
        key: "b",
        body_md:
          "Un índice sobre `payment_method` sirve poco, porque cada uno de sus 3 valores abarca miles de filas.",
        is_correct: true,
      },
      {
        key: "c",
        body_md:
          "Las filas por valor (total de filas dividido por la cardinalidad) son un promedio y pueden esconder la distribución: si un cliente concentrara la mitad de los pedidos, para ese cliente la columna se comportaría como de cardinalidad baja.",
        is_correct: true,
      },
      {
        key: "d",
        body_md:
          "Los 600 `courier_id` distintos incluyen a los 1153 pedidos sin repartidor asignado.",
        is_correct: false,
        why_incorrect_md:
          "`count(DISTINCT courier_id)` ignora los NULL. Esos 1153 pedidos no están representados en el 600.",
      },
      {
        key: "e",
        body_md:
          "Con la cardinalidad medida ya alcanza para decidir qué índices crear, sin más información.",
        is_correct: false,
        why_incorrect_md:
          "Falta lo que corre en producción: qué filtros se usan de verdad, cada cuánto y quién los espera. Un índice perfecto sobre una columna que nadie filtra es puro costo de escritura.",
      },
    ],
    explanation_md:
      "La cardinalidad es la cantidad de valores distintos de una columna, y ordena los candidatos a índice: alta (`customer_id`, `courier_id`, `restaurant_id`) es buen terreno, baja (`status`, `payment_method`) solo sirve para el valor raro. Dos límites: las filas por valor que se deducen de ella son un promedio, así que esconden columnas desbalanceadas, y `count(DISTINCT col)` no cuenta los NULL.",
    is_published: true,
  },
  {
    slug: "indices-q03-explain-analyze-ejecuta",
    section,
    lesson: leerUnPlan,
    type: "true_false",
    difficulty: "easy",
    topic: "EXPLAIN y EXPLAIN ANALYZE",
    tags: ["explain", "planes"],
    estimated_seconds: 40,
    prompt_md:
      "`EXPLAIN ANALYZE` muestra el plan sin ejecutar la consulta, igual que `EXPLAIN`, pero con más detalle.",
    code_md: null,
    options: [
      { key: "a", body_md: "Falso", is_correct: true },
      {
        key: "b",
        body_md: "Verdadero",
        is_correct: false,
        why_incorrect_md:
          "`EXPLAIN ANALYZE` **sí** ejecuta la consulta: de ahí saca las filas reales y los tiempos por nodo. El que no ejecuta nada es `EXPLAIN` solo.",
      },
    ],
    explanation_md:
      "`EXPLAIN` muestra el plan que el motor piensa usar, con números estimados, y no ejecuta nada. `EXPLAIN ANALYZE` ejecuta la consulta de verdad y agrega en cada nodo cuántas filas pasaron y cuánto tardó. La consecuencia práctica: sobre una consulta que modifica datos o que tarda veinte minutos, `EXPLAIN ANALYZE` la corre de verdad, con todo lo que eso implica.",
    is_published: true,
  },
  {
    slug: "indices-q04-nodo-solo-indice",
    section,
    lesson: leerUnPlan,
    type: "fill_blank",
    difficulty: "intermediate",
    topic: "Nodos de lectura",
    tags: ["explain", "nodos", "indice-cubriente"],
    estimated_seconds: 45,
    prompt_md:
      "Completa el nombre del nodo: cuando todas las columnas que la consulta necesita están en el índice, el motor responde sin tocar la tabla y el plan muestra un `___`. Escribe el nombre del nodo en inglés, como aparece en el plan.",
    code_md: null,
    answer: {
      accepted: ["Index Only Scan", "index only scan", "Index-Only Scan", "index-only scan"],
      case_sensitive: false,
    },
    explanation_md:
      "`Index Only Scan` es el acceso más barato sobre una tabla grande, porque se salta el paso caro: ir a buscar cada fila a su lugar en el disco. Requiere un **índice cubriente**, es decir uno que contenga todas las columnas que la consulta usa. Agregar una sola columna al `SELECT` que no esté en el índice hace desaparecer el atajo, y el plan vuelve a un acceso que visita la tabla (por ejemplo `Index Scan`). Además, PostgreSQL solo evita la tabla en las páginas que el mantenimiento automático (`VACUUM`) ya marcó como al día.",
    is_published: true,
  },
  {
    slug: "indices-q05-prefijo-izquierdo",
    section,
    lesson: joinsYPedidos,
    type: "single",
    difficulty: "intermediate",
    topic: "Índice compuesto",
    tags: ["indices", "indice-compuesto", "prefijo-izquierdo"],
    estimated_seconds: 75,
    prompt_md:
      "`orders` tiene un índice compuesto sobre `(restaurant_id, placed_at)`, en ese orden, y ningún otro índice sobre `placed_at`. ¿Para cuál de estos filtros ese índice sirve **menos**, porque el filtro no le indica al motor en qué parte del índice empezar a leer?",
    code_md: null,
    options: [
      {
        key: "a",
        body_md:
          "```sql\nWHERE placed_at >= TIMESTAMPTZ '2025-08-01 00:00:00+00'\n  AND placed_at <  TIMESTAMPTZ '2025-09-01 00:00:00+00'\n```",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "```sql\nWHERE restaurant_id = 194\n```",
        is_correct: false,
        why_incorrect_md:
          "Usa la primera columna del índice, así que lo aprovecha. El índice está ordenado por `restaurant_id` y el motor salta directo al tramo de ese restaurante.",
      },
      {
        key: "c",
        body_md:
          "```sql\nWHERE restaurant_id = 194\n  AND placed_at >= TIMESTAMPTZ '2025-08-01 00:00:00+00'\n```",
        is_correct: false,
        why_incorrect_md:
          "Este es el caso ideal: igualdad en la primera columna y rango en la segunda. El motor entra al tramo del restaurante y, dentro de él, empieza a leer en la fecha pedida.",
      },
      {
        key: "d",
        body_md: "```sql\nWHERE restaurant_id IN (194, 221, 325)\n```",
        is_correct: false,
        why_incorrect_md:
          "`IN` sobre la primera columna equivale a tres búsquedas por esa columna, y el índice sirve para las tres.",
      },
    ],
    explanation_md:
      "El índice está ordenado primero por `restaurant_id` y, dentro de cada restaurante, por `placed_at`. Un filtro que solo nombra `placed_at` no le dice al motor en qué tramo entrar: las fechas de agosto están repartidas en 400 tramos, uno por restaurante. PostgreSQL todavía puede usar el índice, recorriéndolo entero o, desde la versión 18, con un *skip scan* (lectura con saltos) que entra una vez en el tramo de cada restaurante; pero eso rara vez le gana a un índice que empiece por `placed_at`, y con frecuencia el planificador prefiere leer la tabla.\n\nDe ahí la **regla del prefijo izquierdo**, que es una regla de diseño: un índice compuesto rinde de verdad cuando el filtro usa su primera columna, o la primera y la segunda. Si el filtro importante es solo la fecha, hace falta un índice que empiece por `placed_at`.",
    is_published: true,
  },
  {
    slug: "indices-q06-leer-el-plan-capturado",
    section,
    lesson: leerUnPlan,
    type: "query_interpretation",
    difficulty: "intermediate",
    topic: "Leer un plan real",
    tags: ["explain", "seq-scan", "selectividad"],
    estimated_seconds: 100,
    prompt_md:
      "Este es un plan **real**, capturado con `EXPLAIN (ANALYZE, BUFFERS)` sobre el snapshot de Pídelo que usa la práctica. `orders` tiene 14 437 filas y un índice sobre `placed_at`, pero ninguno sobre `status`. ¿Qué te dice el plan?",
    code_md:
      "```text\nAggregate  (cost=421.67..421.68 rows=1 width=8) (actual time=24.354..24.356 rows=1.00 loops=1)\n  Buffers: shared hit=208\n  ->  Seq Scan on orders  (cost=0.00..388.46 rows=13284 width=0) (actual time=0.049..16.654 rows=13284.00 loops=1)\n        Filter: (status = 'delivered'::text)\n        Rows Removed by Filter: 1153\n        Buffers: shared hit=208\nPlanning Time: 0.234 ms\nExecution Time: 24.457 ms\n```",
    options: [
      {
        key: "a",
        body_md:
          "El motor leyó las 14 437 filas y descartó 1153 con el filtro; como el filtro deja pasar el 92 % de la tabla, leerla de corrido es razonable y el plan no muestra nada que corregir.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "El `Seq Scan` indica que falta un índice sobre `status`: hay que pedirlo.",
        is_correct: false,
        why_incorrect_md:
          "Un `Seq Scan` no es por sí mismo un defecto. Con un filtro que deja pasar 13 284 de 14 437 filas y una consulta de 24 ms, un índice sobre `status` ahorraría muy poco (como mucho, contar desde el índice sin abrir la tabla) y encarecería cada escritura. Nada en este plan justifica pedirlo.",
      },
      {
        key: "c",
        body_md:
          "`Rows Removed by Filter: 1153` significa que el motor no pudo leer 1153 filas por falta de memoria.",
        is_correct: false,
        why_incorrect_md:
          "Significa que leyó esas 1153 filas y el filtro las descartó. Es la prueba de que el recorrido pasó por toda la tabla.",
      },
      {
        key: "d",
        body_md:
          "`Buffers: shared hit=208` indica que hubo que traer 208 bloques del disco, y ahí está el costo de la consulta.",
        is_correct: false,
        why_incorrect_md:
          "`shared hit` son bloques que ya estaban en memoria. Los que vienen del disco aparecen como `shared read`, y en este plan no hay ninguno.",
      },
    ],
    explanation_md:
      "El plan tiene dos nodos: el `Seq Scan` lee `orders` de corrido y `Aggregate` cuenta lo que pasa el filtro. `rows=13284` estimado contra `actual rows=13284.00` dice que el planificador tenía buena información, y `Rows Removed by Filter: 1153` que leyó la tabla entera. Los 24,5 ms son el costo honesto de esa lectura, y aun así es más barato que buscar 13 284 filas una por una a través de un índice.\n\nUn detalle del entorno: las 208 páginas son `shared hit`, o sea que todo estaba ya en memoria. En una tabla real, donde los bloques hay que traerlos del disco, la diferencia entre un recorrido secuencial y miles de accesos dispersos es mucho mayor que la que se ve aquí.",
    is_published: true,
  },
  {
    slug: "indices-q07-estimado-contra-real",
    section,
    lesson: leerUnPlan,
    type: "query_interpretation",
    difficulty: "advanced",
    topic: "Estimado contra real",
    tags: ["explain", "nested-loop", "estadisticas"],
    estimated_seconds: 120,
    prompt_md:
      "El fragmento de abajo es un **esquema ilustrativo, no una captura real**: los costos son valores de relleno y el caso está exagerado a propósito para que el problema se vea. Un panel que respondía en dos segundos empezó a tardar veinte minutos, sin que nadie cambiara la consulta. ¿Qué dice el plan?",
    code_md:
      "```text\n-- ESQUEMA ILUSTRATIVO, con costos de relleno\nNested Loop  (cost=…) (actual time=… rows=912430 loops=1)\n  ->  Index Scan using orders_restaurant_id_idx on orders o  (cost=…) (rows=100) (actual rows=912430 loops=1)\n        Index Cond: (restaurant_id = 194)\n  ->  Index Scan using order_items_order_id_idx on order_items oi  (cost=…) (rows=3) (actual rows=3 loops=912430)\n        Index Cond: (order_id = o.id)\n```",
    options: [
      {
        key: "a",
        body_md:
          "El planificador estimó 100 filas en el lado de afuera y llegaron 912 430, así que eligió un `Nested Loop` y la búsqueda interna se repite 912 430 veces. Lo primero que hay que revisar son las estadísticas de la tabla.",
        is_correct: true,
      },
      {
        key: "b",
        body_md:
          "El problema es el `Index Scan` interno: usar un índice dentro de un bucle siempre es un error y hay que reemplazarlo por un `Seq Scan`.",
        is_correct: false,
        why_incorrect_md:
          "Ese `Index Scan` interno es lo correcto de este plan: resuelve cada búsqueda en pocas filas. Lo que está mal es cuántas veces se lo obliga a repetirse.",
      },
      {
        key: "c",
        body_md:
          "El nodo interno tarda poco por ejecución, así que no puede ser la causa: el tiempo tiene que estar en el `Nested Loop`.",
        is_correct: false,
        why_incorrect_md:
          "El tiempo y las filas de un nodo son **por ejecución**. Con `loops=912430`, un nodo de una fracción de milisegundo acumula minutos; ese es exactamente el error de lectura que el `loops` alto provoca.",
      },
      {
        key: "d",
        body_md:
          "Como los dos lados usan índices, el plan es óptimo y el problema tiene que estar en la red o en el disco.",
        is_correct: false,
        why_incorrect_md:
          "Que los dos lados usen índices no dice nada sobre la estrategia de unión. Aquí la estrategia se eligió con una estimación equivocada por casi cuatro órdenes de magnitud (100 contra 912 430).",
      },
    ],
    explanation_md:
      "El hueco entre `rows=100` estimado y `actual rows=912430` es la causa más frecuente de un plan malo. Con 100 filas esperadas, un `Nested Loop` es razonable: cien búsquedas por índice son baratas. Con 912 430, esa misma decisión significa 912 430 búsquedas, y un `Hash Join` habría sido mucho mejor.\n\nDe ahí salen dos hábitos de lectura. Primero, comparar estimado con real en cada nodo antes de mirar los tiempos. Segundo, multiplicar el tiempo de un nodo por su `loops` antes de concluir que es rápido.\n\nY dos causas habituales del hueco: estadísticas desactualizadas (se arregla con `ANALYZE` sobre la tabla) o una columna con distribución muy desbalanceada, donde el promedio que guarda el motor no describe al valor que estás filtrando. En un plan sano los pares están cerca: las capturas reales de la lección muestran 1206 contra 1214 y 1286 contra 1280.",
    is_published: true,
  },
  {
    slug: "indices-q08-diagnosticar-el-filtro-no-sargable",
    section,
    lesson: joinsYPedidos,
    type: "error_diagnosis",
    difficulty: "intermediate",
    topic: "Un filtro que anula el índice",
    tags: ["indices", "sargabilidad", "fechas"],
    estimated_seconds: 90,
    prompt_md:
      "El panel de un restaurante tarda ocho segundos. Existe el índice compuesto `(restaurant_id, placed_at)` sobre `orders`. ¿Cuál es el problema de esta consulta?",
    code_md:
      "```sql\nSELECT id, placed_at, total\nFROM orders\nWHERE restaurant_id = 194\n  AND to_char(placed_at, 'YYYY-MM') = '2025-08'\nORDER BY placed_at;\n```",
    options: [
      {
        key: "a",
        body_md:
          "`to_char(placed_at, ...)` envuelve la columna en una función, así que el índice solo puede aprovecharse hasta `restaurant_id`: el mes hay que calcularlo fila por fila sobre los 77 pedidos del restaurante. El filtro se escribe como rango semiabierto sobre `placed_at`.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "El `ORDER BY placed_at` sobra, porque el índice ya devuelve las filas ordenadas.",
        is_correct: false,
        why_incorrect_md:
          "No sobra: sin `ORDER BY` el motor no promete ningún orden, aunque en la práctica el índice lo entregue. Lo que sí ocurre es que, con el índice adecuado, ese `ORDER BY` no cuesta nada.",
      },
      {
        key: "c",
        body_md:
          "El problema es que falta `status = 'delivered'`, y por eso la consulta lee más filas de las necesarias.",
        is_correct: false,
        why_incorrect_md:
          "Puede ser una diferencia de negocio, pero no es un problema de rendimiento: agregar ese filtro no cambia cuántas filas tiene que recorrer el motor para encontrar el mes.",
      },
      {
        key: "d",
        body_md: "Hay que pedir un índice sobre `to_char(placed_at, 'YYYY-MM')`.",
        is_correct: false,
        why_incorrect_md:
          "Es posible —se llama índice por expresión— pero es la respuesta equivocada aquí, porque la consulta se puede reescribir para usar el índice que ya existe. Un índice por expresión se pide cuando la función es inevitable.",
      },
    ],
    explanation_md:
      "La forma correcta es `placed_at >= TIMESTAMPTZ '2025-08-01 00:00:00+00' AND placed_at < TIMESTAMPTZ '2025-09-01 00:00:00+00'`: la columna queda sola de un lado de cada comparación, así que el índice puede ubicar el inicio del mes dentro del bloque del restaurante y recorrer hasta el final.\n\nEn esta tabla de 14 437 filas la diferencia es imperceptible, y ahí está la trampa de probar optimizaciones en un entorno chico. Sobre cientos de millones de filas, el mismo cambio decide si el panel responde o no. La pregunta previa a cualquier pedido de índice es justamente esta: ¿se puede reescribir la consulta para leer menos filas?",
    is_published: true,
  },
  {
    slug: "indices-q09-estrategias-de-join",
    section,
    lesson: joinsYPedidos,
    type: "matching",
    difficulty: "intermediate",
    topic: "Estrategias de join",
    tags: ["joins", "explain", "nested-loop", "hash-join", "merge-join"],
    estimated_seconds: 100,
    prompt_md: "Relaciona cada estrategia o nodo del plan con la situación que lo describe.",
    code_md: null,
    pairs: [
      {
        left: "Nested Loop",
        right:
          "Ideal cuando el lado de afuera aporta pocas filas y el de adentro tiene un índice por la columna del join; se degrada si llegan muchas más filas de las estimadas",
      },
      {
        left: "Hash Join",
        right:
          "Arma en memoria una tabla de búsqueda con el lado chico y pasa el lado grande por encima; no necesita índices y es la opción típica para unir dos conjuntos grandes por igualdad",
      },
      {
        left: "Merge Join",
        right:
          "Avanza en paralelo por dos entradas ya ordenadas por la columna del join; muy bueno si ese orden lo da un índice, caro si hay que ordenar antes",
      },
      {
        left: "Seq Scan",
        right:
          "Lee la tabla completa de corrido; correcto cuando el filtro deja pasar gran parte de las filas o la tabla es chica",
      },
      {
        left: "Index Only Scan",
        right:
          "Responde con el índice solo, sin abrir la tabla, porque todas las columnas pedidas están en el índice",
      },
    ],
    explanation_md:
      "Las tres estrategias de join no son mejores ni peores en abstracto: cada una gana en una situación. Reconocerlas en el plan te dice si el problema es la unión o es otra cosa. Dos señales que conviene memorizar: un `Hash Join` que construye la tabla de búsqueda con el lado **grande** indica algo mal estimado, y un `Nested Loop` con muchas repeticiones explica la mayoría de las consultas que andaban bien y de pronto tardan veinte minutos.",
    is_published: true,
  },
  {
    slug: "indices-q10-el-indice-no-es-gratis",
    section,
    lesson: joinsYPedidos,
    type: "multiple",
    difficulty: "intermediate",
    topic: "El costo de un índice",
    tags: ["indices", "escrituras", "mantenimiento"],
    estimated_seconds: 90,
    prompt_md:
      "Un equipo propone crear seis índices nuevos sobre `orders`, la tabla donde se insertan todos los pedidos. ¿Qué objeciones son válidas? Selecciona todas las que apliquen.",
    code_md: null,
    options: [
      {
        key: "a",
        body_md:
          "Cada `INSERT` deja de escribir una fila y pasa a escribir la fila más una entrada en cada índice de la tabla.",
        is_correct: true,
      },
      {
        key: "b",
        body_md:
          "Un `UPDATE` que toque una columna indexada también tiene que actualizar el índice correspondiente.",
        is_correct: true,
      },
      {
        key: "c",
        body_md:
          "Los índices que ninguna consulta usa son solo costo: ocupan disco y memoria y se pagan en cada escritura.",
        is_correct: true,
      },
      {
        key: "d",
        body_md: "Crear más de tres índices por tabla está prohibido en PostgreSQL.",
        is_correct: false,
        why_incorrect_md:
          "No existe ese límite. Lo que existe es un costo creciente por índice, que hay que justificar uno por uno.",
      },
      {
        key: "e",
        body_md:
          "Un índice nuevo puede cambiar el resultado de las consultas que ya existen, porque reordena las filas de la tabla.",
        is_correct: false,
        why_incorrect_md:
          "Un índice es una estructura aparte: no mueve ni modifica las filas de la tabla, y ninguna consulta devuelve un resultado distinto por tenerlo. Lo que puede cambiar es el plan de ejecución, es decir, cómo llega el motor a ese mismo resultado.",
      },
    ],
    explanation_md:
      "Una tabla con veinte índices suele tener un problema, no veinte soluciones. El índice acelera lecturas y encarece escrituras, así que sobre una tabla que recibe inserciones todo el día cada índice necesita su justificación. PostgreSQL guarda vistas del sistema con cuántas veces se usó cada índice, y esa es la primera consulta antes de agregar uno más.",
    is_published: true,
  },
  {
    slug: "indices-q11-como-se-pide-un-indice",
    section,
    lesson: joinsYPedidos,
    type: "scenario",
    difficulty: "advanced",
    topic: "Pedir un índice con evidencia",
    tags: ["indices", "comunicacion", "selectividad"],
    estimated_seconds: 120,
    prompt_md:
      "El panel que cada restaurante de Pídelo usa para ver su mes tarda ocho segundos y los locales se quejan. Mediste que el filtro (`restaurant_id = 194` más agosto de 2025) deja pasar **6 filas de 14 437**, es decir el 0,04 %. Vas a abrir el ticket para ingeniería de datos. ¿Qué conviene escribir?",
    code_md: null,
    options: [
      {
        key: "a",
        body_md:
          "La consulta exacta con sus filtros; que deja pasar 6 filas de 14 437; que corre cada vez que un restaurante abre el panel; el índice propuesto, `(restaurant_id, placed_at)` con la igualdad primero y el rango al final; y los ocho segundos actuales como punto de partida.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "«El panel está lento, pónganle un índice a `orders`.»",
        is_correct: false,
        why_incorrect_md:
          "No dice qué filtro hay que acelerar, cuántas filas deja pasar ni qué columnas indexar, así que el ingeniero tiene que rehacer toda la medición.",
      },
      {
        key: "c",
        body_md:
          "El índice propuesto como `(placed_at, restaurant_id)`, porque la fecha es el filtro más importante del panel.",
        is_correct: false,
        why_incorrect_md:
          "El orden está invertido. En un índice compuesto van primero las columnas de igualdad y al final la de rango: con la fecha adelante, el motor recorre los 1280 pedidos de agosto de toda la plataforma y descarta los que no son del restaurante.",
      },
      {
        key: "d",
        body_md:
          "El plan de ejecución completo pegado en el ticket, sin ninguna medición ni propuesta de índice.",
        is_correct: false,
        why_incorrect_md:
          "El plan ayuda, pero solo no alcanza: falta la selectividad medida, con qué frecuencia corre la consulta y qué índice propones. El plan describe lo que pasa, no lo que hay que hacer.",
      },
    ],
    explanation_md:
      "Un pedido que un ingeniero puede evaluar en cinco minutos trae cinco cosas: la consulta exacta, cuántas filas deja pasar el filtro y sobre cuántas filas de la tabla, cada cuánto corre y quién la espera, el índice propuesto con las columnas en orden y el motivo de ese orden, y qué mediste antes y qué esperas después.\n\nY hay una pregunta previa que a veces vuelve innecesario el ticket: ¿se puede reescribir la consulta para leer menos filas? Un índice acelera el acceso a las filas que pides; no arregla una consulta que pide filas que no necesita.",
    is_published: true,
  },
  {
    slug: "indices-q12-el-costo-incluye-a-los-hijos",
    section,
    lesson: leerUnPlan,
    type: "single",
    difficulty: "advanced",
    topic: "Cómo se recorre el árbol",
    tags: ["explain", "costo", "nodos"],
    estimated_seconds: 80,
    prompt_md:
      "Buscas el paso caro de un plan con varios nodos. ¿Cuál es la forma correcta de encontrarlo?",
    code_md: null,
    options: [
      {
        key: "a",
        body_md:
          "Buscar el nodo donde el costo **salta** respecto del de sus hijos, porque el costo de cada nodo ya incluye el de los nodos que tiene debajo.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Buscar el nodo con el número de `cost` más alto.",
        is_correct: false,
        why_incorrect_md:
          "Ese es casi siempre el nodo de arriba, porque acumula el costo de todo el árbol. No señala dónde está el trabajo.",
      },
      {
        key: "c",
        body_md: "Buscar el nodo más indentado, porque es el que se ejecuta primero.",
        is_correct: false,
        why_incorrect_md:
          "El nodo más indentado corre primero, pero eso no lo hace el más caro. El orden de ejecución y el costo son dos cosas distintas.",
      },
      {
        key: "d",
        body_md:
          "Convertir el `cost` a segundos con la relación que publica PostgreSQL y quedarse con el más lento.",
        is_correct: false,
        why_incorrect_md:
          "El `cost` es una unidad interna que sirve para comparar planes del mismo servidor; no hay una conversión a segundos. Para tiempos reales existe `EXPLAIN ANALYZE`.",
      },
    ],
    explanation_md:
      "Un plan es un árbol y se lee de adentro hacia afuera: los nodos más indentados corren primero y el de arriba devuelve el resultado. El costo de cada nodo incluye el de sus hijos, así que el número grande de arriba es solo la suma. El paso caro es el nodo cuyo costo se despega del de sus hijos, porque esa diferencia es el trabajo que agrega él.\n\nCon `EXPLAIN ANALYZE` la misma lógica aplica a los tiempos, con una trampa extra: el tiempo de un nodo es **por ejecución**, así que hay que multiplicarlo por su `loops` antes de compararlo con nada.",
    is_published: true,
  },
];
