import type { QuestionDef } from "../schemas/question";

const section = "tablas-filas-columnas-tipos";

export const questions: QuestionDef[] = [
  {
    slug: "tablas-q01-pk",
    section,
    lesson: "anatomia-de-una-tabla",
    type: "single",
    difficulty: "very_easy",
    topic: "Claves primarias",
    tags: ["claves"],
    estimated_seconds: 35,
    prompt_md: "¿Qué garantiza una clave primaria?",
    options: [
      {
        key: "a",
        body_md: "Que cada fila se identifica de forma única y el valor nunca es NULL.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Que la tabla está ordenada por esa columna.",
        is_correct: false,
        why_incorrect_md:
          "El orden físico o de lectura no está garantizado por la clave; solo la unicidad e integridad.",
      },
      {
        key: "c",
        body_md: "Que la columna es de tipo texto.",
        is_correct: false,
        why_incorrect_md:
          "Una clave primaria puede ser de cualquier tipo; en TiendaViva son enteros.",
      },
    ],
    explanation_md:
      "La clave primaria (PK) identifica cada fila: es única y no admite NULL. En TiendaViva es la columna `id` de cada tabla.",
    is_published: true,
  },
  {
    slug: "tablas-q02-fk",
    section,
    lesson: "anatomia-de-una-tabla",
    type: "fill_blank",
    difficulty: "easy",
    topic: "Claves foráneas",
    tags: ["claves", "relaciones"],
    estimated_seconds: 40,
    prompt_md: "La columna `order_items.order_id` es una clave ________ que apunta a `orders.id`.",
    answer: { accepted: ["foránea", "foranea", "foreign", "fk"], case_sensitive: false },
    explanation_md:
      "Una clave foránea guarda la clave primaria de otra tabla para expresar la relación «esta línea pertenece a este pedido».",
    is_published: true,
  },
  {
    slug: "tablas-q03-cardinalidad",
    section,
    lesson: "anatomia-de-una-tabla",
    type: "scenario",
    difficulty: "intermediate",
    topic: "Cardinalidad",
    tags: ["relaciones", "joins"],
    estimated_seconds: 60,
    prompt_md:
      "Un cliente tiene 4 pedidos. Si combinas `customers` con `orders` por `customer_id`, ¿cuántas veces aparece ese cliente en el resultado?",
    options: [
      { key: "a", body_md: "4 veces, una por cada pedido.", is_correct: true },
      {
        key: "b",
        body_md: "1 vez, porque es un solo cliente.",
        is_correct: false,
        why_incorrect_md:
          "En una relación uno a muchos, la fila del lado «uno» se repite por cada fila del lado «muchos».",
      },
      {
        key: "c",
        body_md: "Depende del orden de las tablas en la consulta.",
        is_correct: false,
        why_incorrect_md:
          "El número de coincidencias no depende del orden en que nombres las tablas.",
      },
    ],
    explanation_md:
      "La relación uno a muchos multiplica las filas del lado «uno». Es la causa más común de importes duplicados al sumar después de combinar tablas.",
    is_published: true,
  },
  {
    slug: "tablas-q04-tipo-dinero",
    section,
    lesson: "tipos-de-datos",
    type: "single",
    difficulty: "easy",
    topic: "Tipos numéricos",
    tags: ["tipos", "dinero"],
    estimated_seconds: 40,
    prompt_md: "¿Qué tipo conviene para guardar importes de dinero como `total_amount`?",
    options: [
      { key: "a", body_md: "`numeric(12,2)`, porque es exacto en decimales.", is_correct: true },
      {
        key: "b",
        body_md: "`double precision`, porque es más rápido.",
        is_correct: false,
        why_incorrect_md:
          "Los flotantes binarios acumulan errores de redondeo en sumas largas; no sirven para contabilidad.",
      },
      {
        key: "c",
        body_md: "`text`, para conservar el formato con separador de miles.",
        is_correct: false,
        why_incorrect_md: "Como texto no se puede sumar ni ordenar numéricamente («1000» < «200»).",
      },
    ],
    explanation_md:
      "`numeric` representa decimales exactos; por eso se usa para dinero. Los flotantes son adecuados para mediciones, no para importes.",
    is_published: true,
  },
  {
    slug: "tablas-q05-orden-texto",
    section,
    lesson: "tipos-de-datos",
    type: "query_interpretation",
    difficulty: "intermediate",
    topic: "Tipos y ordenamiento",
    tags: ["tipos", "orden"],
    estimated_seconds: 60,
    prompt_md:
      "Una columna `precio_txt` de tipo `text` contiene '1000', '200' y '35'. ¿Qué devuelve esta consulta?",
    code_md: "```sql\nSELECT precio_txt\nFROM precios\nORDER BY precio_txt;\n```",
    options: [
      { key: "a", body_md: "'1000', '200', '35' (orden alfabético).", is_correct: true },
      {
        key: "b",
        body_md: "'35', '200', '1000' (orden numérico).",
        is_correct: false,
        why_incorrect_md: "Al ser texto, se compara carácter a carácter: '1' < '2' < '3'.",
      },
      {
        key: "c",
        body_md: "Un error, porque no se puede ordenar texto.",
        is_correct: false,
        why_incorrect_md:
          "El texto sí se ordena, pero alfabéticamente, que es justamente el problema.",
      },
    ],
    explanation_md:
      "El texto se ordena carácter a carácter. Para ordenar como número hay que convertir (`precio_txt::numeric`) o, mejor, guardar la columna con el tipo correcto.",
    is_published: true,
  },
  {
    slug: "tablas-q06-timestamptz",
    section,
    lesson: "tipos-de-datos",
    type: "true_false",
    difficulty: "intermediate",
    topic: "Fechas y zonas horarias",
    tags: ["tipos", "fechas"],
    estimated_seconds: 35,
    prompt_md:
      "Un valor `timestamptz` representa un instante absoluto y puede mostrarse con fecha distinta según la zona horaria de la sesión.",
    options: [
      { key: "a", body_md: "Verdadero", is_correct: true },
      {
        key: "b",
        body_md: "Falso",
        is_correct: false,
        why_incorrect_md:
          "Un pedido de las 23:30 en Buenos Aires aparece al día siguiente si se muestra en UTC; el instante es el mismo, la representación cambia.",
      },
    ],
    explanation_md:
      "Por eso los cortes por día deben hacerse en la zona horaria del negocio, tema que se profundiza en la sección de fechas.",
    is_published: true,
  },
  {
    slug: "tablas-q07-literal-texto",
    section,
    lesson: "tipos-de-datos",
    type: "error_diagnosis",
    difficulty: "easy",
    topic: "Literales",
    tags: ["tipos", "sintaxis"],
    estimated_seconds: 45,
    prompt_md: 'Esta consulta falla con `column "MX" does not exist`. ¿Por qué?',
    code_md: '```sql\nSELECT full_name\nFROM customers\nWHERE country = "MX";\n```',
    options: [
      {
        key: "a",
        body_md:
          "Las comillas dobles indican un nombre de columna; el texto va con comillas simples: `'MX'`.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "`country` no existe en `customers`.",
        is_correct: false,
        why_incorrect_md:
          "La columna existe; el error menciona `MX`, que fue interpretado como identificador.",
      },
      {
        key: "c",
        body_md: "Falta un `LIMIT`.",
        is_correct: false,
        why_incorrect_md: "`LIMIT` es opcional y no tiene relación con el error.",
      },
    ],
    explanation_md:
      "En PostgreSQL las comillas dobles delimitan identificadores (nombres) y las simples delimitan literales de texto.",
    is_published: true,
  },
  {
    slug: "tablas-q08-fecha-iso",
    section,
    lesson: "tipos-de-datos",
    type: "single",
    difficulty: "easy",
    topic: "Formato de fechas",
    tags: ["fechas"],
    estimated_seconds: 35,
    prompt_md: "¿Cuál es la forma recomendada de escribir la fecha 2 de marzo de 2025 en SQL?",
    options: [
      { key: "a", body_md: "`DATE '2025-03-02'`", is_correct: true },
      {
        key: "b",
        body_md: "`'02/03/2025'`",
        is_correct: false,
        why_incorrect_md:
          "Es ambiguo: puede leerse como 2 de marzo o 3 de febrero según la configuración.",
      },
      {
        key: "c",
        body_md: "`'2 de marzo de 2025'`",
        is_correct: false,
        why_incorrect_md: "El motor no interpreta texto en lenguaje natural.",
      },
    ],
    explanation_md: "El formato ISO 8601 (AAAA-MM-DD) es inequívoco y es el estándar en SQL.",
    is_published: true,
  },
  {
    slug: "tablas-q09-tipos-matching",
    section,
    lesson: "tipos-de-datos",
    type: "matching",
    difficulty: "easy",
    topic: "Tipos de datos",
    tags: ["tipos"],
    estimated_seconds: 60,
    prompt_md: "Relaciona cada columna de TiendaViva con el tipo de dato más adecuado.",
    pairs: [
      { left: "orders.total_amount", right: "numeric(12,2)" },
      { left: "products.is_active", right: "boolean" },
      { left: "orders.created_at", right: "timestamptz" },
      { left: "order_items.quantity", right: "integer" },
    ],
    explanation_md:
      "Importes en `numeric`, banderas en `boolean`, instantes en `timestamptz` y conteos en `integer`.",
    is_published: true,
  },
  {
    slug: "tablas-q10-null-pk",
    section,
    lesson: "anatomia-de-una-tabla",
    type: "single",
    difficulty: "intermediate",
    topic: "Integridad",
    tags: ["claves", "calidad"],
    estimated_seconds: 50,
    prompt_md: "Esta consulta sobre `customers` devuelve 0 filas. ¿Qué confirma?",
    code_md: "```sql\nSELECT id, COUNT(*)\nFROM customers\nGROUP BY id\nHAVING COUNT(*) > 1;\n```",
    options: [
      {
        key: "a",
        body_md: "Que ningún `id` se repite: la clave primaria se cumple.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Que la tabla está vacía.",
        is_correct: false,
        why_incorrect_md:
          "Una tabla con filas únicas también devuelve 0 filas aquí; la consulta solo busca repetidos.",
      },
      {
        key: "c",
        body_md: "Que todos los clientes tienen un solo pedido.",
        is_correct: false,
        why_incorrect_md:
          "La consulta no mira pedidos; cuenta repeticiones de `id` dentro de `customers`.",
      },
    ],
    explanation_md:
      "Agrupar por la clave y quedarse con grupos de más de una fila es la forma clásica de auditar unicidad.",
    is_published: true,
  },
];
