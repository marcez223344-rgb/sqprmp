import type { QuestionDef } from "../schemas/question";

const section = "ordenar-y-limitar";
const orderByLesson = "order-by-varias-claves";
const nullsLesson = "order-by-y-nulos";
const limitLesson = "limit-offset-y-top-n";

export const questions: QuestionDef[] = [
  {
    slug: "ordenar-q01-varias-claves",
    section,
    lesson: orderByLesson,
    type: "query_interpretation",
    difficulty: "easy",
    topic: "Claves de ordenamiento",
    tags: ["order_by"],
    estimated_seconds: 45,
    prompt_md: "¿Cómo quedan ordenadas las filas de este resultado?",
    code_md:
      "```sql\nSELECT id, seller_id, name, list_price\nFROM products\nORDER BY seller_id, list_price DESC;\n```",
    options: [
      {
        key: "a",
        body_md:
          "Por vendedor de menor a mayor y, dentro de cada vendedor, del precio más alto al más bajo.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Por vendedor y por precio, ambos de mayor a menor.",
        is_correct: false,
        why_incorrect_md:
          "`DESC` afecta solo a la clave que lo precede. `seller_id` no lo lleva, así que se ordena `ASC`.",
      },
      {
        key: "c",
        body_md: "Por precio de mayor a menor y, en caso de empate, por vendedor.",
        is_correct: false,
        why_incorrect_md:
          "Las claves se aplican de izquierda a derecha: manda `seller_id` y `list_price` solo desempata.",
      },
      {
        key: "d",
        body_md: "Por `id`, porque es la primera columna del `SELECT`.",
        is_correct: false,
        why_incorrect_md:
          "Las columnas del `SELECT` no definen el orden; solo lo hace el `ORDER BY`.",
      },
    ],
    explanation_md:
      "`ORDER BY` evalúa las claves en orden y cada una tiene su propia dirección: aquí `seller_id ASC` (implícito) y `list_price DESC`.",
    is_published: true,
  },
  {
    slug: "ordenar-q02-nulls-desc",
    section,
    lesson: nullsLesson,
    type: "single",
    difficulty: "intermediate",
    topic: "NULL en el ordenamiento",
    tags: ["order_by", "null_handling"],
    estimated_seconds: 50,
    prompt_md:
      "En la tabla `sellers` de TiendaViva hay 28 vendedores con `rating` NULL. ¿Qué devuelven las primeras filas de esta consulta en PostgreSQL?",
    code_md:
      "```sql\nSELECT store_name, rating\nFROM sellers\nORDER BY rating DESC\nLIMIT 12;\n```",
    options: [
      {
        key: "a",
        body_md: "Doce vendedores con `rating` NULL.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Los doce vendedores con la mejor calificación.",
        is_correct: false,
        why_incorrect_md:
          "Para ordenar, PostgreSQL considera NULL mayor que cualquier valor, así que en `DESC` los NULL encabezan el resultado. Hace falta `NULLS LAST`.",
      },
      {
        key: "c",
        body_md: "Los doce vendedores con la peor calificación.",
        is_correct: false,
        why_incorrect_md: "Eso ocurriría con `ORDER BY rating ASC` y sin NULL en la columna.",
      },
      {
        key: "d",
        body_md: "Un error: `ORDER BY` no admite columnas con NULL.",
        is_correct: false,
        why_incorrect_md: "Ordenar columnas con NULL es válido; solo hay que decidir su posición.",
      },
    ],
    explanation_md:
      "En `DESC` los NULL van primero (`NULLS FIRST` implícito). Para un ranking honesto: `ORDER BY rating DESC NULLS LAST`.",
    is_published: true,
  },
  {
    slug: "ordenar-q03-limit-sin-order",
    section,
    lesson: limitLesson,
    type: "true_false",
    difficulty: "easy",
    topic: "LIMIT sin orden",
    tags: ["limit", "order_by"],
    estimated_seconds: 35,
    prompt_md:
      "Verdadero o falso: `SELECT id, total_amount FROM orders LIMIT 10;` devuelve los 10 pedidos más antiguos.",
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
          "Sin `ORDER BY` no hay orden garantizado: el motor devuelve 10 filas cualesquiera, y el conjunto puede cambiar entre ejecuciones.",
      },
    ],
    explanation_md:
      "`LIMIT` corta el resultado después de ordenarlo. Si no ordenaste, cortas un conjunto arbitrario. Para los 10 más antiguos: `ORDER BY created_at ASC, id ASC LIMIT 10`.",
    is_published: true,
  },
  {
    slug: "ordenar-q04-offset-pagina",
    section,
    lesson: limitLesson,
    type: "fill_blank",
    difficulty: "easy",
    topic: "Paginación",
    tags: ["limit", "offset"],
    estimated_seconds: 40,
    prompt_md:
      "El listado muestra 25 restaurantes por página. ¿Qué valor de `OFFSET` necesitas para mostrar la página 4? Escribe solo el número.",
    answer: { accepted: ["75", "OFFSET 75", "LIMIT 25 OFFSET 75"], case_sensitive: false },
    explanation_md:
      "`OFFSET = (página - 1) * tamaño = (4 - 1) * 25 = 75`. La consulta termina en `LIMIT 25 OFFSET 75`, siempre con un `ORDER BY` determinista.",
    is_published: true,
  },
  {
    slug: "ordenar-q05-alias-en-order-by",
    section,
    lesson: orderByLesson,
    type: "error_diagnosis",
    difficulty: "intermediate",
    topic: "Alias y expresiones",
    tags: ["order_by", "alias"],
    estimated_seconds: 55,
    prompt_md:
      "Esta consulta debía mostrar los pedidos con mayor importe neto primero, pero falla. ¿Cuál es el problema?",
    code_md:
      "```sql\nSELECT id, total_amount - shipping_fee AS net_amount\nFROM orders\nWHERE net_amount > 1000\nORDER BY net_amount DESC;\n```",
    options: [
      {
        key: "a",
        body_md:
          "`WHERE` no puede usar el alias `net_amount`: se evalúa antes que el `SELECT`. En `ORDER BY` sí es válido.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "`ORDER BY` no puede usar alias; hay que repetir la expresión.",
        is_correct: false,
        why_incorrect_md:
          "`ORDER BY` se evalúa después del `SELECT`, así que el alias está disponible. El problema está en el `WHERE`.",
      },
      {
        key: "c",
        body_md: "Falta `LIMIT`, obligatorio cuando se usa `ORDER BY ... DESC`.",
        is_correct: false,
        why_incorrect_md: "`LIMIT` es opcional y no tiene relación con la dirección del orden.",
      },
      {
        key: "d",
        body_md: "No se puede restar dos columnas dentro del `SELECT`.",
        is_correct: false,
        why_incorrect_md: "Las expresiones aritméticas entre columnas son válidas en el `SELECT`.",
      },
    ],
    explanation_md:
      "Orden de evaluación: `FROM` → `WHERE` → `SELECT` (aquí nace el alias) → `ORDER BY` → `LIMIT`. En el `WHERE` hay que repetir la expresión: `WHERE total_amount - shipping_fee > 1000`.",
    is_published: true,
  },
  {
    slug: "ordenar-q06-empates-y-paginacion",
    section,
    lesson: limitLesson,
    type: "scenario",
    difficulty: "intermediate",
    topic: "Paginación determinista",
    tags: ["limit", "offset", "order_by"],
    estimated_seconds: 60,
    prompt_md:
      "Un listado paginado de restaurantes ordena con `ORDER BY city_id` y muestra 20 por página con `LIMIT 20 OFFSET ...`. El departamento de Operaciones reporta que algunos restaurantes aparecen en dos páginas y otros no aparecen nunca. ¿Cuál es la causa más probable?",
    options: [
      {
        key: "a",
        body_md:
          "Hay muchos empates en `city_id` y el orden entre filas empatadas no está definido: cada página se calcula con un orden distinto.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "`OFFSET` siempre duplica filas cuando supera las 100.",
        is_correct: false,
        why_incorrect_md:
          "`OFFSET` no duplica nada por sí solo; con un orden total y estable, la paginación es consistente.",
      },
      {
        key: "c",
        body_md: "Falta `DISTINCT` en la consulta.",
        is_correct: false,
        why_incorrect_md:
          "Las filas no están repetidas en la tabla: el problema es el orden, no los duplicados.",
      },
      {
        key: "d",
        body_md: "El `LIMIT` debe ser potencia de dos.",
        is_correct: false,
        why_incorrect_md: "El valor de `LIMIT` no tiene ninguna restricción de ese tipo.",
      },
    ],
    explanation_md:
      "Paginar exige un orden total: agrega una clave única al final, por ejemplo `ORDER BY city_id, id`.",
    is_published: true,
  },
  {
    slug: "ordenar-q07-afirmaciones",
    section,
    lesson: limitLesson,
    type: "multiple",
    difficulty: "intermediate",
    topic: "LIMIT y rendimiento",
    tags: ["limit", "offset", "performance"],
    estimated_seconds: 60,
    prompt_md:
      "¿Cuáles de estas afirmaciones sobre `LIMIT` y `OFFSET` son correctas? Selecciona todas las que apliquen.",
    options: [
      {
        key: "a",
        body_md: "`LIMIT` se aplica después de `WHERE` y de `ORDER BY`.",
        is_correct: true,
      },
      {
        key: "b",
        body_md:
          "Un `OFFSET` grande es costoso porque el motor produce y descarta las filas que se saltan.",
        is_correct: true,
      },
      {
        key: "c",
        body_md: "`LIMIT 10` puede cortar un empate y dejar fuera una fila con el mismo valor.",
        is_correct: true,
      },
      {
        key: "d",
        body_md: "`LIMIT` cambia qué filas cumplen el filtro del `WHERE`.",
        is_correct: false,
        why_incorrect_md:
          "El filtro se resuelve antes; `LIMIT` solo decide cuántas filas del resultado se devuelven.",
      },
      {
        key: "e",
        body_md: "`OFFSET` sin `ORDER BY` produce páginas reproducibles.",
        is_correct: false,
        why_incorrect_md:
          "Sin orden definido, cada ejecución puede recorrer las filas de otra forma: habrá filas repetidas y filas ausentes.",
      },
    ],
    explanation_md:
      "`LIMIT`/`OFFSET` recortan el resultado ya filtrado y ordenado; su costo depende de cuántas filas hay que producir antes del corte.",
    is_published: true,
  },
  {
    slug: "ordenar-q08-nulls-clausula",
    section,
    lesson: nullsLesson,
    type: "matching",
    difficulty: "intermediate",
    topic: "NULL en el ordenamiento",
    tags: ["order_by", "null_handling"],
    estimated_seconds: 70,
    prompt_md:
      "Relaciona cada cláusula con el orden que produce en PostgreSQL. La columna `delivered_at` de la tabla `shipments` tiene NULL en los envíos que todavía no se entregaron.",
    pairs: [
      {
        left: "ORDER BY delivered_at ASC",
        right: "De la fecha más antigua a la más reciente, con los NULL al final",
      },
      {
        left: "ORDER BY delivered_at DESC",
        right: "De la fecha más reciente a la más antigua, con los NULL al principio",
      },
      {
        left: "ORDER BY delivered_at DESC NULLS LAST",
        right: "De la fecha más reciente a la más antigua, con los NULL al final",
      },
      {
        left: "ORDER BY delivered_at ASC NULLS FIRST",
        right: "De la fecha más antigua a la más reciente, con los NULL al principio",
      },
    ],
    explanation_md:
      "La regla base de PostgreSQL es que, para ordenar, NULL se considera mayor que cualquier valor: queda último en `ASC` y primero en `DESC`. `NULLS FIRST` y `NULLS LAST` cambian esa posición de forma explícita. Otra forma de lograrlo sin esas palabras clave es ordenar primero por una expresión booleana, por ejemplo `ORDER BY (delivered_at IS NULL), delivered_at DESC`, porque `false` va antes que `true`.",
    is_published: true,
  },
  {
    slug: "ordenar-q09-top-n",
    section,
    lesson: limitLesson,
    type: "single",
    difficulty: "easy",
    topic: "Top-N",
    tags: ["limit", "order_by"],
    estimated_seconds: 45,
    prompt_md:
      "El departamento de Finanzas de TiendaViva pide «los 5 pedidos de mayor importe en pesos mexicanos» (moneda `MXN`). ¿Qué consulta responde exactamente eso?",
    options: [
      {
        key: "a",
        body_md:
          "```sql\nSELECT id, total_amount\nFROM orders\nWHERE currency = 'MXN'\nORDER BY total_amount DESC, id ASC\nLIMIT 5;\n```",
        is_correct: true,
      },
      {
        key: "b",
        body_md:
          "```sql\nSELECT id, total_amount\nFROM orders\nWHERE currency = 'MXN'\nLIMIT 5;\n```",
        is_correct: false,
        why_incorrect_md:
          "Sin `ORDER BY` obtienes 5 pedidos cualesquiera, no los de mayor importe.",
      },
      {
        key: "c",
        body_md:
          "```sql\nSELECT id, total_amount\nFROM orders\nORDER BY total_amount DESC\nLIMIT 5;\n```",
        is_correct: false,
        why_incorrect_md:
          "Falta el filtro de moneda: mezclarías importes en monedas distintas y ganarían siempre las de mayor escala nominal.",
      },
      {
        key: "d",
        body_md:
          "```sql\nSELECT id, total_amount\nFROM orders\nWHERE currency = 'MXN'\nORDER BY total_amount ASC\nLIMIT 5;\n```",
        is_correct: false,
        why_incorrect_md: "`ASC` devuelve los cinco importes más bajos.",
      },
    ],
    explanation_md:
      "Un top-N necesita tres piezas: el filtro del negocio, el `ORDER BY` correcto (con desempate) y el `LIMIT`.",
    is_published: true,
  },
];
