import type { QuestionDef } from "../schemas/question";

const section = "select";

export const questions: QuestionDef[] = [
  {
    slug: "select-q01-basico",
    section,
    lesson: "select-columnas",
    type: "single",
    difficulty: "very_easy",
    topic: "Sintaxis de SELECT",
    tags: ["select"],
    estimated_seconds: 30,
    prompt_md: "¿Qué devuelve `SELECT full_name, country FROM customers;`?",
    options: [
      {
        key: "a",
        body_md: "Las columnas `full_name` y `country` de todas las filas de `customers`.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Solo la primera fila de `customers`.",
        is_correct: false,
        why_incorrect_md: "Sin `LIMIT` ni filtro, se devuelven todas las filas.",
      },
      {
        key: "c",
        body_md: "Todas las columnas de `customers`.",
        is_correct: false,
        why_incorrect_md: "Se devuelven únicamente las columnas listadas después de `SELECT`.",
      },
    ],
    explanation_md:
      "`SELECT` define las columnas; `FROM` la tabla. Sin `WHERE` participan todas las filas.",
    is_published: true,
  },
  {
    slug: "select-q02-coma-final",
    section,
    lesson: "select-columnas",
    type: "error_diagnosis",
    difficulty: "easy",
    topic: "Errores de sintaxis",
    tags: ["select", "sintaxis"],
    estimated_seconds: 40,
    prompt_md: 'Esta consulta produce `syntax error at or near "FROM"`. ¿Cuál es la causa?',
    code_md: "```sql\nSELECT id, full_name,\nFROM customers;\n```",
    options: [
      { key: "a", body_md: "Hay una coma sobrante después de `full_name`.", is_correct: true },
      {
        key: "b",
        body_md: "Falta un punto y coma.",
        is_correct: false,
        why_incorrect_md: "El punto y coma está presente; el problema es la coma antes de `FROM`.",
      },
      {
        key: "c",
        body_md: "`FROM` debe ir antes de `SELECT`.",
        is_correct: false,
        why_incorrect_md: "El orden `SELECT ... FROM ...` es correcto.",
      },
    ],
    explanation_md:
      "La lista de columnas se separa con comas, pero no lleva coma final antes de `FROM`. Es uno de los errores más frecuentes al editar consultas.",
    is_published: true,
  },
  {
    slug: "select-q03-orden-columnas",
    section,
    lesson: "select-columnas",
    type: "true_false",
    difficulty: "very_easy",
    topic: "Resultado de SELECT",
    tags: ["select"],
    estimated_seconds: 30,
    prompt_md:
      "El orden de las columnas en el resultado es el mismo en que se escriben después de `SELECT`.",
    options: [
      { key: "a", body_md: "Verdadero", is_correct: true },
      {
        key: "b",
        body_md: "Falso",
        is_correct: false,
        why_incorrect_md:
          "Las columnas salen en el orden en que las listas; el orden de las *filas* es el que no está garantizado sin `ORDER BY`.",
      },
    ],
    explanation_md:
      "Tú controlas el orden de las columnas; el de las filas solo se garantiza con `ORDER BY`.",
    is_published: true,
  },
  {
    slug: "select-q04-select-star",
    section,
    lesson: "select-columnas",
    type: "single",
    difficulty: "easy",
    topic: "SELECT *",
    tags: ["select", "buenas-practicas"],
    estimated_seconds: 40,
    prompt_md: "¿Cuándo es razonable usar `SELECT *`?",
    options: [
      {
        key: "a",
        body_md: "Al explorar una tabla desconocida, normalmente con `LIMIT`.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "En un reporte mensual que otras personas consumen.",
        is_correct: false,
        why_incorrect_md:
          "Un reporte debe listar columnas: es más claro y no cambia si la tabla gana columnas.",
      },
      {
        key: "c",
        body_md: "Nunca; está prohibido en SQL.",
        is_correct: false,
        why_incorrect_md: "No está prohibido; es una herramienta de exploración, no de entrega.",
      },
    ],
    explanation_md:
      "`SELECT *` es útil para conocer una tabla; para entregar resultados conviene nombrar las columnas.",
    is_published: true,
  },
  {
    slug: "select-q05-columna-inexistente",
    section,
    lesson: "select-columnas",
    type: "error_diagnosis",
    difficulty: "easy",
    topic: "Errores comunes",
    tags: ["select", "esquema"],
    estimated_seconds: 40,
    prompt_md: "¿Qué error devuelve esta consulta sobre TiendaViva?",
    code_md: "```sql\nSELECT nombre\nFROM customers;\n```",
    options: [
      {
        key: "a",
        body_md: '`column "nombre" does not exist`: la columna se llama `full_name`.',
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Ningún error; devuelve los nombres.",
        is_correct: false,
        why_incorrect_md: "SQL no traduce nombres; hay que usar el nombre exacto del esquema.",
      },
      {
        key: "c",
        body_md: '`relation "customers" does not exist`.',
        is_correct: false,
        why_incorrect_md: "La tabla existe; lo que no existe es la columna `nombre`.",
      },
    ],
    explanation_md:
      "Los nombres de columnas deben coincidir con el esquema. El panel de esquema del ejercicio es tu referencia.",
    is_published: true,
  },
  {
    slug: "select-q06-orden-filas",
    section,
    lesson: "select-columnas",
    type: "true_false",
    difficulty: "easy",
    topic: "Orden de filas",
    tags: ["select", "orden"],
    estimated_seconds: 30,
    prompt_md:
      "Sin `ORDER BY`, PostgreSQL garantiza que las filas se devuelven en el orden en que fueron insertadas.",
    options: [
      {
        key: "a",
        body_md: "Verdadero",
        is_correct: false,
        why_incorrect_md:
          "Sin `ORDER BY` el orden es indeterminado; puede coincidir con la inserción por casualidad, pero no está garantizado.",
      },
      { key: "b", body_md: "Falso", is_correct: true },
    ],
    explanation_md:
      "El orden de las filas solo está garantizado cuando lo pides explícitamente con `ORDER BY` (sección 13).",
    is_published: true,
  },
  {
    slug: "select-q07-comillas",
    section,
    lesson: "select-buenas-practicas",
    type: "single",
    difficulty: "easy",
    topic: "Comillas",
    tags: ["sintaxis"],
    estimated_seconds: 40,
    prompt_md: "¿Qué diferencia hay entre `'MX'` y `\"MX\"` en PostgreSQL?",
    options: [
      {
        key: "a",
        body_md:
          "`'MX'` es un literal de texto; `\"MX\"` es un identificador (nombre de columna o tabla).",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Son equivalentes.",
        is_correct: false,
        why_incorrect_md:
          "No lo son: las comillas dobles delimitan identificadores y las simples, texto.",
      },
      {
        key: "c",
        body_md: "`\"MX\"` es texto en mayúsculas y `'MX'` en minúsculas.",
        is_correct: false,
        why_incorrect_md:
          "Las comillas no cambian mayúsculas; cambian el significado (texto vs. nombre).",
      },
    ],
    explanation_md:
      "Usar comillas dobles para texto es una fuente frecuente de errores `column does not exist`.",
    is_published: true,
  },
  {
    slug: "select-q08-comentarios",
    section,
    lesson: "select-buenas-practicas",
    type: "fill_blank",
    difficulty: "very_easy",
    topic: "Comentarios",
    tags: ["sintaxis", "buenas-practicas"],
    estimated_seconds: 30,
    prompt_md: "En SQL, un comentario de una sola línea empieza con ________.",
    answer: { accepted: ["--"], case_sensitive: false },
    explanation_md: "`-- texto` comenta hasta el final de la línea; `/* ... */` comenta un bloque.",
    is_published: true,
  },
  {
    slug: "select-q09-legibilidad",
    section,
    lesson: "select-buenas-practicas",
    type: "multiple",
    difficulty: "easy",
    topic: "Legibilidad",
    tags: ["buenas-practicas"],
    estimated_seconds: 50,
    prompt_md:
      "¿Cuáles de estas prácticas mejoran la legibilidad de una consulta? Selecciona todas las correctas.",
    options: [
      {
        key: "a",
        body_md: "Palabras clave en mayúsculas y una cláusula por línea.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Listar las columnas en lugar de `SELECT *` en reportes.",
        is_correct: true,
      },
      { key: "c", body_md: "Comentar el porqué de las reglas de negocio.", is_correct: true },
      {
        key: "d",
        body_md: "Escribir toda la consulta en una sola línea para ahorrar espacio.",
        is_correct: false,
        why_incorrect_md: "Las líneas largas dificultan la lectura y la revisión de cambios.",
      },
    ],
    explanation_md:
      "Las consultas se leen muchas más veces de las que se escriben; el formato consistente es parte del trabajo profesional.",
    is_published: true,
  },
  {
    slug: "select-q10-mayusculas-nombres",
    section,
    lesson: "select-buenas-practicas",
    type: "query_interpretation",
    difficulty: "intermediate",
    topic: "Identificadores",
    tags: ["sintaxis"],
    estimated_seconds: 50,
    prompt_md:
      "¿Funciona esta consulta en PostgreSQL sobre la tabla `customers` con columna `full_name`?",
    code_md: "```sql\nselect FULL_NAME from Customers;\n```",
    options: [
      {
        key: "a",
        body_md:
          "Sí: los identificadores sin comillas se convierten a minúsculas, así que equivale a `select full_name from customers`.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "No: `FULL_NAME` y `Customers` no existen con esas mayúsculas.",
        is_correct: false,
        why_incorrect_md:
          "Sin comillas dobles, PostgreSQL normaliza los identificadores a minúsculas.",
      },
      {
        key: "c",
        body_md: "No: `select` debe ir en mayúsculas.",
        is_correct: false,
        why_incorrect_md:
          "Las palabras clave no distinguen mayúsculas; usarlas en mayúsculas es convención, no requisito.",
      },
    ],
    explanation_md:
      "Funciona, pero mezclar estilos dificulta la lectura. La convención del curso es palabras clave en mayúsculas y nombres en minúsculas.",
    is_published: true,
  },
];
