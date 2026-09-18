import type { QuestionDef } from "../schemas/question";

const section = "null";
const logica = "null-logica-de-tres-valores";
const coalesce = "null-coalesce-y-nullif";

export const questions: QuestionDef[] = [
  {
    slug: "null-q01-igual-null",
    section,
    lesson: logica,
    type: "single",
    difficulty: "easy",
    topic: "Comparar con NULL",
    tags: ["null_handling"],
    estimated_seconds: 35,
    prompt_md:
      "¿Cuántas filas devuelve `SELECT id FROM sellers WHERE rating = NULL;` si 28 vendedores no tienen calificación?",
    options: [
      { key: "a", body_md: "0", is_correct: true },
      {
        key: "b",
        body_md: "28",
        is_correct: false,
        why_incorrect_md: "`= NULL` nunca es verdadero; para eso existe `IS NULL`.",
      },
      {
        key: "c",
        body_md: "Da error de sintaxis.",
        is_correct: false,
        why_incorrect_md:
          "Es sintácticamente válido; simplemente evalúa UNKNOWN en todas las filas.",
      },
    ],
    explanation_md:
      "Cualquier comparación con NULL es UNKNOWN y `WHERE` la descarta. Usa `rating IS NULL`.",
    is_published: true,
  },
  {
    slug: "null-q02-distinto",
    section,
    lesson: logica,
    type: "single",
    difficulty: "intermediate",
    topic: "Lógica de tres valores",
    tags: ["null_handling"],
    estimated_seconds: 50,
    prompt_md:
      "`sellers` tiene 180 filas; 28 tienen `rating` NULL y 1 tiene exactamente 4.5. ¿Cuántas devuelve `WHERE rating <> 4.5`?",
    options: [
      { key: "a", body_md: "151", is_correct: true },
      {
        key: "b",
        body_md: "179",
        is_correct: false,
        why_incorrect_md: "Los 28 NULL no pasan el filtro: `NULL <> 4.5` es UNKNOWN.",
      },
      {
        key: "c",
        body_md: "152",
        is_correct: false,
        why_incorrect_md: "180 − 28 (NULL) − 1 (igual a 4.5) = 151.",
      },
    ],
    explanation_md:
      "`<>` tampoco «ve» los NULL. Si debes incluirlos: `rating <> 4.5 OR rating IS NULL`.",
    is_published: true,
  },
  {
    slug: "null-q03-is-null",
    section,
    lesson: logica,
    type: "fill_blank",
    difficulty: "very_easy",
    topic: "Operador IS NULL",
    tags: ["null_handling"],
    estimated_seconds: 25,
    prompt_md:
      "Completa: `SELECT id FROM shipments WHERE delivered_at ___ NULL;` para obtener los envíos no entregados. Escribe solo la palabra clave.",
    answer: { accepted: ["IS"], case_sensitive: false },
    explanation_md: "`IS NULL` es el único operador correcto para detectar NULL.",
    is_published: true,
  },
  {
    slug: "null-q04-not-in",
    section,
    lesson: logica,
    type: "error_diagnosis",
    difficulty: "advanced",
    topic: "NOT IN con NULL",
    tags: ["null_handling", "subquery"],
    estimated_seconds: 70,
    prompt_md:
      "Esta consulta debería listar categorías que no son padre de ninguna otra, pero devuelve 0 filas aunque existen 24 subcategorías. ¿Por qué?",
    code_md:
      "```sql\nSELECT id, name\nFROM categories\nWHERE id NOT IN (SELECT parent_id FROM categories);\n```",
    options: [
      {
        key: "a",
        body_md:
          "La subconsulta incluye un NULL (las raíces), y `NOT IN` con un NULL en la lista es UNKNOWN para todas las filas.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "`NOT IN` no acepta subconsultas.",
        is_correct: false,
        why_incorrect_md:
          "Sí las acepta; el problema es el NULL dentro del resultado de la subconsulta.",
      },
      {
        key: "c",
        body_md: "Falta `DISTINCT` en la subconsulta.",
        is_correct: false,
        why_incorrect_md: "Los duplicados no afectan a `IN`/`NOT IN`; el NULL sí.",
      },
    ],
    explanation_md:
      "Agrega `WHERE parent_id IS NOT NULL` en la subconsulta o usa `NOT EXISTS`. Es uno de los errores silenciosos más frecuentes en SQL.",
    is_published: true,
  },
  {
    slug: "null-q05-coalesce",
    section,
    lesson: coalesce,
    type: "single",
    difficulty: "easy",
    topic: "COALESCE",
    tags: ["null_handling", "coalesce"],
    estimated_seconds: 35,
    prompt_md: "¿Qué devuelve `SELECT COALESCE(NULL, NULL, 'b', 'c');`?",
    options: [
      { key: "a", body_md: "`'b'`", is_correct: true },
      {
        key: "b",
        body_md: "`NULL`",
        is_correct: false,
        why_incorrect_md: "`COALESCE` devuelve el **primer** argumento no nulo, que es `'b'`.",
      },
      {
        key: "c",
        body_md: "`'c'`",
        is_correct: false,
        why_incorrect_md: "`'b'` aparece antes y no es NULL.",
      },
    ],
    explanation_md:
      "`COALESCE` recorre los argumentos en orden y se detiene en el primero que no es NULL.",
    is_published: true,
  },
  {
    slug: "null-q06-nullif",
    section,
    lesson: coalesce,
    type: "query_interpretation",
    difficulty: "intermediate",
    topic: "NULLIF",
    tags: ["null_handling", "nullif"],
    estimated_seconds: 50,
    prompt_md: "¿Para qué sirve `NULLIF(quantity, 0)` en esta expresión?",
    code_md:
      "```sql\nSELECT unit_price * quantity / NULLIF(quantity, 0) AS check_price\nFROM order_items;\n```",
    options: [
      {
        key: "a",
        body_md:
          "Evita el error de división por cero: si `quantity` es 0, el divisor pasa a ser NULL y el resultado es NULL.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Reemplaza los NULL de `quantity` por 0.",
        is_correct: false,
        why_incorrect_md:
          "Eso lo haría `COALESCE(quantity, 0)`. `NULLIF` hace lo contrario: produce NULL.",
      },
      {
        key: "c",
        body_md: "Filtra las filas con `quantity` igual a 0.",
        is_correct: false,
        why_incorrect_md: "No filtra filas; solo cambia el valor del divisor.",
      },
    ],
    explanation_md:
      "`NULLIF(a, b)` devuelve NULL cuando `a = b`. Es el patrón estándar para divisiones seguras.",
    is_published: true,
  },
  {
    slug: "null-q07-aritmetica",
    section,
    lesson: coalesce,
    type: "true_false",
    difficulty: "easy",
    topic: "NULL en operaciones",
    tags: ["null_handling"],
    estimated_seconds: 30,
    prompt_md:
      "Verdadero o falso: si `discount` es NULL, `subtotal - discount` devuelve el valor de `subtotal`.",
    options: [
      {
        key: "a",
        body_md: "Verdadero",
        is_correct: false,
        why_incorrect_md:
          "Cualquier operación aritmética con NULL da NULL. Usa `subtotal - COALESCE(discount, 0)`.",
      },
      { key: "b", body_md: "Falso", is_correct: true },
    ],
    explanation_md:
      "NULL «contagia» las operaciones. Protege los cálculos con `COALESCE` cuando 0 sea el valor de negocio correcto.",
    is_published: true,
  },
  {
    slug: "null-q08-orden",
    section,
    lesson: coalesce,
    type: "single",
    difficulty: "easy",
    topic: "NULL en ORDER BY",
    tags: ["null_handling", "order_by"],
    estimated_seconds: 35,
    prompt_md: "En PostgreSQL, `ORDER BY rating DESC` coloca a los vendedores sin calificación…",
    options: [
      { key: "a", body_md: "Al principio del resultado.", is_correct: true },
      {
        key: "b",
        body_md: "Al final del resultado.",
        is_correct: false,
        why_incorrect_md:
          "En descendente los NULL se consideran «mayores» y quedan primero; en ascendente, al final.",
      },
      {
        key: "c",
        body_md: "Los excluye.",
        is_correct: false,
        why_incorrect_md: "`ORDER BY` nunca elimina filas.",
      },
    ],
    explanation_md:
      "Por defecto, PostgreSQL trata NULL como el valor más alto. Usa `NULLS LAST` para enviarlos al final en `DESC`.",
    is_published: true,
  },
  {
    slug: "null-q09-count",
    section,
    lesson: coalesce,
    type: "single",
    difficulty: "intermediate",
    topic: "NULL en agregaciones",
    tags: ["null_handling", "aggregate"],
    estimated_seconds: 45,
    prompt_md:
      "`reviews` tiene 3985 filas y 1391 tienen `comment` NULL. ¿Qué devuelve `SELECT count(comment) FROM reviews;`?",
    options: [
      { key: "a", body_md: "2594", is_correct: true },
      {
        key: "b",
        body_md: "3985",
        is_correct: false,
        why_incorrect_md: "Eso devuelve `count(*)`. `count(columna)` ignora los NULL.",
      },
      {
        key: "c",
        body_md: "1391",
        is_correct: false,
        why_incorrect_md: "Ese es el número de NULL, que `count(comment)` precisamente no cuenta.",
      },
    ],
    explanation_md:
      "`count(columna)` cuenta valores no nulos: 3985 − 1391 = 2594. `count(*)` cuenta filas.",
    is_published: true,
  },
  {
    slug: "null-q10-escenario",
    section,
    lesson: coalesce,
    type: "scenario",
    difficulty: "intermediate",
    topic: "Criterio de negocio",
    tags: ["null_handling", "coalesce"],
    estimated_seconds: 55,
    prompt_md:
      "Vas a calcular la calificación promedio de los vendedores para un ranking. 28 no tienen calificación. ¿Qué conviene?",
    options: [
      {
        key: "a",
        body_md:
          "Dejar los NULL como están: `avg(rating)` los ignora y el promedio refleja solo a los calificados.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Reemplazarlos con `COALESCE(rating, 0)` antes de promediar.",
        is_correct: false,
        why_incorrect_md:
          "Un 0 inventado hunde el promedio: «sin calificación» no significa «pésimo».",
      },
      {
        key: "c",
        body_md: "Reemplazarlos con el promedio general.",
        is_correct: false,
        why_incorrect_md:
          "Es una técnica de imputación válida en ciencia de datos, pero para un ranking simple oculta que faltan datos.",
      },
    ],
    explanation_md:
      "NULL significa «no sabemos». Las agregaciones lo ignoran por diseño; inventar un valor cambia el significado del resultado.",
    is_published: true,
  },
];
