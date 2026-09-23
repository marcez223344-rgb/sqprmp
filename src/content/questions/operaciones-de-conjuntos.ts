import type { QuestionDef } from "../schemas/question";

const section = "operaciones-de-conjuntos";
const l1 = "union-y-union-all";
const l2 = "intersect-y-except";
const l3 = "conjuntos-precedencia-y-alternativas";

export const questions: QuestionDef[] = [
  {
    slug: "conjuntos-q01-union-vs-union-all",
    section,
    lesson: l1,
    type: "single",
    difficulty: "easy",
    topic: "Diferencia entre UNION y UNION ALL",
    tags: ["union", "union_all", "duplicados"],
    estimated_seconds: 40,
    prompt_md:
      "Dos consultas devuelven filas y las combinas. ¿Cuál es la única diferencia entre escribir `UNION` y escribir `UNION ALL` entre ellas?",
    code_md: null,
    options: [
      {
        key: "a",
        body_md:
          "`UNION` elimina las filas duplicadas del resultado combinado; `UNION ALL` las conserva todas.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "`UNION ALL` elimina duplicados y `UNION` los conserva.",
        is_correct: false,
        why_incorrect_md:
          "Es exactamente al revés: la palabra `ALL` indica «todas las filas», es decir, sin descartar repetidas.",
      },
      {
        key: "c",
        body_md: "`UNION` ordena el resultado y `UNION ALL` lo deja sin ordenar.",
        is_correct: false,
        why_incorrect_md:
          "Ninguno de los dos garantiza un orden. Si necesitas un orden, lo pides con `ORDER BY` al final de la consulta combinada.",
      },
      {
        key: "d",
        body_md: "`UNION ALL` permite ramas con distinta cantidad de columnas y `UNION` no.",
        is_correct: false,
        why_incorrect_md:
          "Las dos exigen la misma cantidad de columnas y tipos compatibles en todas las ramas.",
      },
    ],
    explanation_md:
      "`UNION` aplica una deduplicación sobre el resultado completo, como un `DISTINCT` final; `UNION ALL` apila sin comparar nada. Por eso `UNION ALL` es más barato y es el correcto cuando las filas repetidas son datos legítimos (dos cobros iguales el mismo día, por ejemplo).",
    is_published: true,
  },
  {
    slug: "conjuntos-q02-order-by-final",
    section,
    lesson: l1,
    type: "true_false",
    difficulty: "easy",
    topic: "Dónde se escribe ORDER BY en una consulta combinada",
    tags: ["union", "order_by", "sintaxis"],
    estimated_seconds: 35,
    prompt_md:
      "En una consulta de la forma `SELECT ... UNION ALL SELECT ... ORDER BY nombre`, el `ORDER BY` final ordena el resultado combinado de las dos ramas (no solo la última rama).",
    code_md: null,
    options: [
      { key: "a", body_md: "Verdadero", is_correct: true },
      {
        key: "b",
        body_md: "Falso",
        is_correct: false,
        why_incorrect_md:
          "El `ORDER BY` escrito al final pertenece a la consulta combinada completa. Para ordenar una rama por separado hay que encerrarla entre paréntesis con su propio `ORDER BY`.",
      },
    ],
    explanation_md:
      "`ORDER BY` y `LIMIT` se aplican al resultado de toda la operación de conjuntos y se escriben una sola vez, al final. Los nombres disponibles para ordenar son los de la primera rama, o bien la posición de la columna (`ORDER BY 1`).",
    is_published: true,
  },
  {
    slug: "conjuntos-q03-operador-resta",
    section,
    lesson: l2,
    type: "fill_blank",
    difficulty: "easy",
    topic: "Operador que resta conjuntos",
    tags: ["except", "sintaxis"],
    estimated_seconds: 30,
    prompt_md:
      "Escribe la palabra clave de PostgreSQL que, colocada entre dos consultas, devuelve las filas que están en la primera y no están en la segunda. Escribe solo esa palabra (sin `SELECT` ni nada más).",
    code_md: null,
    answer: { accepted: ["EXCEPT", "except"], case_sensitive: false },
    explanation_md:
      "`EXCEPT` resta conjuntos: `A EXCEPT B` devuelve las filas distintas de `A` que no aparecen en `B`. No es simétrico, así que invertir las ramas responde otra pregunta. En otros motores (Oracle clásico) la misma operación se llama `MINUS`.",
    is_published: true,
  },
  {
    slug: "conjuntos-q04-compatibilidad-ramas",
    section,
    lesson: l1,
    type: "multiple",
    difficulty: "intermediate",
    topic: "Requisitos de compatibilidad entre ramas",
    tags: ["union", "tipos", "columnas"],
    estimated_seconds: 70,
    prompt_md:
      "Para que dos consultas se puedan combinar con `UNION`, `INTERSECT` o `EXCEPT`, ¿qué condiciones deben cumplirse? Marca **todas** las correctas.",
    code_md: null,
    options: [
      {
        key: "a",
        body_md: "Las dos ramas deben devolver la misma cantidad de columnas.",
        is_correct: true,
      },
      {
        key: "b",
        body_md:
          "Los tipos de datos deben ser compatibles posición por posición (la primera columna de una rama con la primera de la otra, y así).",
        is_correct: true,
      },
      {
        key: "c",
        body_md:
          "Las columnas deben llamarse igual en las dos ramas para que los datos queden alineados.",
        is_correct: false,
        why_incorrect_md:
          "La alineación es por posición, no por nombre. Los nombres del resultado los define la primera rama; usar los mismos alias ayuda a leer, pero no alinea nada.",
      },
      {
        key: "d",
        body_md: "Las dos ramas deben leer de la misma tabla.",
        is_correct: false,
        why_incorrect_md:
          "Pueden venir de tablas distintas, de joins distintos o incluso de agregaciones distintas: lo único que importa es la forma del resultado.",
      },
      {
        key: "e",
        body_md:
          "Cada rama puede tener su propio `WHERE`, sus propios joins y sus propias agregaciones.",
        is_correct: true,
      },
    ],
    explanation_md:
      "Las reglas son de forma, no de origen: misma cantidad de columnas, tipos compatibles y el mismo orden. Por eso el error más peligroso es proyectar `(nombre, país)` en una rama y `(país, nombre)` en la otra: si ambas son texto, la consulta corre sin error y devuelve datos mezclados.",
    is_published: true,
  },
  {
    slug: "conjuntos-q05-interpretar-intersect",
    section,
    lesson: l2,
    type: "query_interpretation",
    difficulty: "intermediate",
    topic: "Qué devuelve un INTERSECT",
    tags: ["intersect", "interpretacion"],
    estimated_seconds: 70,
    prompt_md:
      "Esta consulta se ejecuta sobre TiendaViva, donde `orders.channel` puede valer `'web'`, `'app'` o `'marketplace_partner'`. ¿Qué conjunto de clientes devuelve exactamente?",
    code_md:
      "```sql\nSELECT customer_id FROM orders WHERE channel = 'web'\nINTERSECT\nSELECT customer_id FROM orders WHERE channel = 'app';\n```",
    options: [
      {
        key: "a",
        body_md:
          "Los clientes que tienen al menos un pedido por web y además al menos un pedido por app, cada uno listado una sola vez.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Los clientes que compraron por web o por app, sin repetir.",
        is_correct: false,
        why_incorrect_md:
          "Ese sería el resultado de `UNION`. `INTERSECT` devuelve solo lo que aparece en las dos ramas.",
      },
      {
        key: "c",
        body_md: "Los clientes que compraron por web pero nunca por app.",
        is_correct: false,
        why_incorrect_md:
          "Esa es la resta, `EXCEPT`. `INTERSECT` exige presencia en ambas listas, no ausencia en una.",
      },
      {
        key: "d",
        body_md:
          "Una fila por cada pedido de web que tiene un pedido de app del mismo cliente (el producto de ambas listas).",
        is_correct: false,
        why_incorrect_md:
          "Eso ocurriría con un `INNER JOIN` entre las dos listas, que multiplica filas. `INTERSECT` devuelve filas distintas.",
      },
    ],
    explanation_md:
      "`INTERSECT` responde la pregunta «quiénes están en las dos listas» y además deduplica: alguien con 20 pedidos por web y 3 por app aparece una sola vez. Esta condición no se puede escribir como `WHERE channel = 'web' AND channel = 'app'`, porque un pedido tiene un solo canal: la condición es sobre el cliente, no sobre la fila.",
    is_published: true,
  },
  {
    slug: "conjuntos-q06-error-columnas",
    section,
    lesson: l1,
    type: "error_diagnosis",
    difficulty: "intermediate",
    topic: "Error al combinar ramas incompatibles",
    tags: ["union", "errores", "columnas"],
    estimated_seconds: 60,
    prompt_md:
      "Esta consulta falla con el mensaje «each UNION query must have the same number of columns». ¿Cuál es la causa y cómo se corrige?",
    code_md:
      "```sql\nSELECT full_name, email, country\nFROM customers\nWHERE country = 'CL'\nUNION ALL\nSELECT store_name, country\nFROM sellers\nWHERE country = 'CL';\n```",
    options: [
      {
        key: "a",
        body_md:
          "La primera rama devuelve tres columnas y la segunda solo dos; hay que dejar la misma cantidad en ambas (por ejemplo, agregando un valor fijo o `NULL` como segunda columna en la rama de `sellers`).",
        is_correct: true,
      },
      {
        key: "b",
        body_md:
          "Las columnas se llaman distinto (`full_name` y `store_name`); hay que ponerles el mismo alias.",
        is_correct: false,
        why_incorrect_md:
          "Los nombres distintos no son un problema: el resultado toma los de la primera rama. El error habla de cantidad de columnas.",
      },
      {
        key: "c",
        body_md: "Falta un `ORDER BY` al final de la consulta combinada.",
        is_correct: false,
        why_incorrect_md:
          "`ORDER BY` es opcional y su ausencia nunca produce un error de sintaxis.",
      },
      {
        key: "d",
        body_md: "`UNION ALL` no admite un `WHERE` en cada rama; el filtro debe ir una sola vez.",
        is_correct: false,
        why_incorrect_md:
          "Cada rama es una consulta completa y puede tener su propio `WHERE`, sus joins y su agregación.",
      },
    ],
    explanation_md:
      "PostgreSQL verifica primero la cantidad de columnas y después la compatibilidad de tipos, posición por posición. Cuando una fuente no tiene el dato, la práctica habitual es completar con un valor fijo o `NULL` con el tipo correcto (`NULL::text AS email`), para que la forma coincida sin inventar información.",
    is_published: true,
  },
  {
    slug: "conjuntos-q07-emparejar-operadores",
    section,
    lesson: l2,
    type: "matching",
    difficulty: "easy",
    topic: "Qué devuelve cada operador de conjuntos",
    tags: ["union", "intersect", "except"],
    estimated_seconds: 60,
    prompt_md:
      "Dadas dos consultas A y B compatibles, empareja cada operador con el conjunto de filas que devuelve al escribirse como `A <operador> B`.",
    code_md: null,
    pairs: [
      { left: "UNION ALL", right: "Todas las filas de A y de B, incluidas las repetidas" },
      { left: "UNION", right: "Las filas de A y de B, sin repetidas" },
      {
        left: "INTERSECT",
        right: "Solo las filas que aparecen en A y también en B, sin repetidas",
      },
      { left: "EXCEPT", right: "Solo las filas de A que no aparecen en B, sin repetidas" },
    ],
    explanation_md:
      "Tres de los cuatro operadores deduplican; solo `UNION ALL` conserva las filas repetidas. `UNION` e `INTERSECT` son simétricos (da igual el orden de las ramas), mientras que `EXCEPT` no lo es: `A EXCEPT B` y `B EXCEPT A` responden preguntas distintas.",
    is_published: true,
  },
  {
    slug: "conjuntos-q08-escenario-reporte-contable",
    section,
    lesson: l1,
    type: "scenario",
    difficulty: "intermediate",
    topic: "Elegir el operador según el negocio",
    tags: ["union_all", "escenario", "reportes"],
    estimated_seconds: 75,
    prompt_md:
      "Finanzas te pide un libro de movimientos: todos los cobros de la tabla `payments` y todas las devoluciones de la tabla `returns`, en una sola lista con las columnas `fecha`, `tipo` y `monto`, para sumarla después por mes. En los datos hay dos cobros distintos del mismo monto, el mismo día y del mismo tipo. ¿Qué operador usas para combinar las dos consultas y por qué?",
    code_md: null,
    options: [
      {
        key: "a",
        body_md:
          "`UNION ALL`, porque cada fila representa un movimiento real de dinero y las filas repetidas deben conservarse.",
        is_correct: true,
      },
      {
        key: "b",
        body_md:
          "`UNION`, porque así se evita que un mismo movimiento se cuente dos veces por error.",
        is_correct: false,
        why_incorrect_md:
          "`UNION` no distingue un error de carga de dos movimientos genuinamente iguales: eliminaría uno de los dos cobros y el total mensual quedaría por debajo del real.",
      },
      {
        key: "c",
        body_md:
          "`INTERSECT`, porque hay que quedarse con los movimientos que están en las dos tablas.",
        is_correct: false,
        why_incorrect_md:
          "Cobros y devoluciones son movimientos distintos; su intersección estaría vacía. El pedido es sumarlos, no cruzarlos.",
      },
      {
        key: "d",
        body_md:
          "Ninguno: hay que hacer un `INNER JOIN` entre `payments` y `returns` por `order_id`.",
        is_correct: false,
        why_incorrect_md:
          "Un join agrega columnas lado a lado y dejaría fuera los cobros sin devolución. Aquí se necesitan más filas, no más columnas.",
      },
    ],
    explanation_md:
      "En reportes de dinero, deduplicar es destruir información: dos movimientos idénticos son dos movimientos. `UNION ALL` normaliza ambas fuentes a un formato común (`fecha`, `tipo`, `monto`) y deja el resultado listo para agregarlo por mes en un solo paso.",
    is_published: true,
  },
  {
    slug: "conjuntos-q09-precedencia",
    section,
    lesson: l3,
    type: "single",
    difficulty: "advanced",
    topic: "Precedencia entre operadores de conjuntos",
    tags: ["precedencia", "intersect", "union"],
    estimated_seconds: 60,
    prompt_md:
      "Sin paréntesis, PostgreSQL evalúa `A UNION B INTERSECT C` (tres consultas compatibles). ¿A cuál de estas expresiones equivale?",
    code_md: null,
    options: [
      {
        key: "a",
        body_md: "`A UNION (B INTERSECT C)`, porque `INTERSECT` tiene mayor precedencia.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "`(A UNION B) INTERSECT C`, porque se evalúa de izquierda a derecha.",
        is_correct: false,
        why_incorrect_md:
          "La evaluación de izquierda a derecha aplica entre operadores de la misma precedencia (`UNION` y `EXCEPT`). `INTERSECT` se evalúa antes.",
      },
      {
        key: "c",
        body_md: "Depende del tamaño de los conjuntos: el planificador elige el orden más barato.",
        is_correct: false,
        why_incorrect_md:
          "La precedencia es parte de la sintaxis del lenguaje, no una decisión del planificador: define qué significa la consulta, no cómo se ejecuta.",
      },
      {
        key: "d",
        body_md: "A ninguna: PostgreSQL rechaza la consulta y exige paréntesis explícitos.",
        is_correct: false,
        why_incorrect_md:
          "La consulta es válida y se ejecuta sin advertencias; por eso conviene poner los paréntesis aunque el motor no los pida.",
      },
    ],
    explanation_md:
      "El orden es: `INTERSECT` primero; después `UNION` y `EXCEPT`, que comparten precedencia y se evalúan de izquierda a derecha. Así, `A UNION B EXCEPT C` sí es `(A UNION B) EXCEPT C`. Escribir los paréntesis a mano evita que alguien tenga que recordar esta regla al leer tu consulta.",
    is_published: true,
  },
  {
    slug: "conjuntos-q10-except-vs-not-in",
    section,
    lesson: l3,
    type: "single",
    difficulty: "advanced",
    topic: "EXCEPT frente a NOT IN con valores NULL",
    tags: ["except", "not_in", "null"],
    estimated_seconds: 70,
    prompt_md:
      "Trabajas en una base donde la columna `items.product_id` admite valores `NULL`. Quieres los `id` de `products` que nunca aparecen en esa columna y lo resuelves con `SELECT id FROM products WHERE id NOT IN (SELECT product_id FROM items)`. Si la subconsulta devuelve al menos un `NULL`, ¿qué devuelve la consulta?",
    code_md: null,
    options: [
      {
        key: "a",
        body_md:
          "La consulta devuelve cero filas, sin error, porque comparar contra `NULL` da desconocido y ninguna fila pasa el filtro.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "PostgreSQL devuelve un error indicando que la subconsulta contiene `NULL`.",
        is_correct: false,
        why_incorrect_md:
          "No hay error: la consulta se ejecuta normalmente y devuelve un resultado vacío, que es justamente lo que la vuelve peligrosa.",
      },
      {
        key: "c",
        body_md: "Los `NULL` se ignoran y el resultado es el correcto.",
        is_correct: false,
        why_incorrect_md:
          "`NOT IN` no ignora los `NULL`: cada comparación con `NULL` devuelve desconocido, y `NOT IN` solo es verdadero cuando todas las comparaciones son falsas.",
      },
      {
        key: "d",
        body_md: "Devuelve todos los productos, porque `NULL` no coincide con ningún `id`.",
        is_correct: false,
        why_incorrect_md:
          "Ese razonamiento aplicaría a `NOT EXISTS`. Con `NOT IN`, un solo `NULL` en la lista hace que ninguna fila califique.",
      },
    ],
    explanation_md:
      "Es la trampa clásica de `NOT IN`. `EXCEPT` y `NOT EXISTS` no la tienen: en las operaciones de conjuntos, dos filas con `NULL` en la misma columna se consideran iguales, así que la comparación es determinista. Ante una columna que admite nulos, prefiere `SELECT id FROM products EXCEPT SELECT product_id FROM items` o un `NOT EXISTS`.",
    is_published: true,
  },
  {
    slug: "conjuntos-q11-columnas-que-rompen-except",
    section,
    lesson: l2,
    type: "query_interpretation",
    difficulty: "advanced",
    topic: "Qué columnas proyectar en un EXCEPT",
    tags: ["except", "columnas", "diagnostico"],
    estimated_seconds: 80,
    prompt_md:
      "Esta consulta debía devolver los clientes que compraron en 2024 y no volvieron en 2025, pero devuelve prácticamente a todos los clientes de 2024. ¿Por qué?",
    code_md:
      "```sql\nSELECT customer_id, created_at, total_amount\nFROM orders\nWHERE status = 'delivered' AND created_at < DATE '2025-01-01'\nEXCEPT\nSELECT customer_id, created_at, total_amount\nFROM orders\nWHERE status = 'delivered' AND created_at >= DATE '2025-01-01';\n```",
    options: [
      {
        key: "a",
        body_md:
          "Porque `EXCEPT` compara las filas completas: al incluir `created_at` y `total_amount`, ninguna fila de 2024 es idéntica a una de 2025, así que no se resta nada.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Porque `EXCEPT` no elimina duplicados y hay que agregarle `DISTINCT`.",
        is_correct: false,
        why_incorrect_md:
          "`EXCEPT` ya devuelve filas distintas. El problema no es la duplicación, sino qué columnas se comparan.",
      },
      {
        key: "c",
        body_md: "Porque las ramas deberían combinarse con `EXCEPT ALL` en lugar de `EXCEPT`.",
        is_correct: false,
        why_incorrect_md:
          "`EXCEPT ALL` conserva multiplicidades; no cambia el criterio de comparación, que sigue usando todas las columnas.",
      },
      {
        key: "d",
        body_md:
          "Porque el filtro de fecha está mal: `< DATE '2025-01-01'` excluye los pedidos del 31 de diciembre de 2024.",
        is_correct: false,
        why_incorrect_md:
          "`< DATE '2025-01-01'` incluye todo 2024, incluido el 31 de diciembre completo. Los límites están bien.",
      },
    ],
    explanation_md:
      "La comparación de conjuntos usa todas las columnas proyectadas. Para restar **clientes**, las ramas deben proyectar solo lo que identifica al cliente (`customer_id`). Los datos descriptivos se agregan después, con un join sobre el resultado: es el patrón «conjunto primero, detalles después».",
    is_published: true,
  },
  {
    slug: "conjuntos-q12-nombres-primera-rama",
    section,
    lesson: l1,
    type: "true_false",
    difficulty: "intermediate",
    topic: "De dónde salen los nombres de las columnas",
    tags: ["union", "alias", "columnas"],
    estimated_seconds: 40,
    prompt_md:
      "En `SELECT full_name AS nombre FROM customers UNION ALL SELECT store_name AS razon_social FROM sellers`, la columna del resultado se llama `nombre`, porque los nombres de las columnas los define la primera rama.",
    code_md: null,
    options: [
      { key: "a", body_md: "Verdadero", is_correct: true },
      {
        key: "b",
        body_md: "Falso",
        is_correct: false,
        why_incorrect_md:
          "El alias de la segunda rama (`razon_social`) se ignora por completo. Solo la primera rama determina los nombres del resultado combinado.",
      },
    ],
    explanation_md:
      "Como el `ORDER BY` final también se escribe con los nombres de la primera rama, conviene repetir los mismos alias en todas las ramas: el resultado no cambia, pero quien lee la consulta no tiene que adivinar cuál manda.",
    is_published: true,
  },
];
