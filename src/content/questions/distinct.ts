import type { QuestionDef } from "../schemas/question";

const section = "distinct";
const lesson = "distinct-valores-unicos";

export const questions: QuestionDef[] = [
  {
    slug: "distinct-q01-fila-completa",
    section,
    lesson,
    type: "single",
    difficulty: "easy",
    topic: "Alcance de DISTINCT",
    tags: ["distinct"],
    estimated_seconds: 40,
    prompt_md: "¿Qué filas elimina esta consulta?",
    code_md: "```sql\nSELECT DISTINCT carrier, destination_city\nFROM shipments;\n```",
    options: [
      {
        key: "a",
        body_md: "Las que repiten la **misma combinación** de transportista y ciudad.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Las que repiten el transportista, sin importar la ciudad.",
        is_correct: false,
        why_incorrect_md:
          "`DISTINCT` compara la fila completa del resultado, no solo la primera columna.",
      },
      {
        key: "c",
        body_md: "Ninguna; `DISTINCT` solo funciona con una columna.",
        is_correct: false,
        why_incorrect_md: "`DISTINCT` acepta cualquier cantidad de columnas.",
      },
    ],
    explanation_md:
      "`DISTINCT` se aplica a todas las columnas listadas: dos filas son duplicadas solo si coinciden en todas.",
    is_published: true,
  },
  {
    slug: "distinct-q02-null",
    section,
    lesson,
    type: "single",
    difficulty: "easy",
    topic: "DISTINCT y NULL",
    tags: ["distinct", "null_handling"],
    estimated_seconds: 40,
    prompt_md:
      "En `categories`, 6 categorías tienen `parent_id` NULL y las demás apuntan a 6 padres distintos. ¿Cuántas filas devuelve `SELECT DISTINCT parent_id FROM categories;`?",
    options: [
      { key: "a", body_md: "7", is_correct: true },
      {
        key: "b",
        body_md: "6",
        is_correct: false,
        why_incorrect_md: "Los NULL también aparecen en el resultado, agrupados en una sola fila.",
      },
      {
        key: "c",
        body_md: "12",
        is_correct: false,
        why_incorrect_md:
          "`DISTINCT` considera iguales a todos los NULL: aparece una única fila NULL.",
      },
    ],
    explanation_md:
      "6 padres distintos + 1 fila NULL = 7. Para `DISTINCT` (y para `GROUP BY`), los NULL se agrupan entre sí.",
    is_published: true,
  },
  {
    slug: "distinct-q03-posicion",
    section,
    lesson,
    type: "error_diagnosis",
    difficulty: "very_easy",
    topic: "Sintaxis",
    tags: ["distinct", "sintaxis"],
    estimated_seconds: 30,
    prompt_md: "Esta consulta produce un error de sintaxis. ¿Cuál es la causa?",
    code_md: "```sql\nSELECT country DISTINCT\nFROM customers;\n```",
    options: [
      {
        key: "a",
        body_md: "`DISTINCT` debe ir inmediatamente después de `SELECT`.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Falta un alias para `country`.",
        is_correct: false,
        why_incorrect_md: "Los alias son opcionales; el problema es la posición de `DISTINCT`.",
      },
      {
        key: "c",
        body_md: "`DISTINCT` requiere paréntesis.",
        is_correct: false,
        why_incorrect_md: "No lleva paréntesis: `SELECT DISTINCT country`.",
      },
    ],
    explanation_md: "La forma correcta es `SELECT DISTINCT country FROM customers;`.",
    is_published: true,
  },
  {
    slug: "distinct-q04-cuando-usar",
    section,
    lesson,
    type: "scenario",
    difficulty: "intermediate",
    topic: "Criterio de uso",
    tags: ["distinct", "readability"],
    estimated_seconds: 50,
    prompt_md:
      "Una consulta que lista pedidos con su pago devuelve más filas que pedidos existen. Alguien propone agregar `DISTINCT`. ¿Qué conviene hacer primero?",
    options: [
      {
        key: "a",
        body_md:
          "Investigar por qué se multiplican las filas (por ejemplo, pedidos con más de un pago).",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Agregar `DISTINCT`: el resultado quedará correcto.",
        is_correct: false,
        why_incorrect_md:
          "Esconde el síntoma. Si un pedido tiene dos pagos con montos distintos, `DISTINCT` no los une y además puedes perder información relevante.",
      },
      {
        key: "c",
        body_md: "Agregar `LIMIT` para que coincida con la cantidad de pedidos.",
        is_correct: false,
        why_incorrect_md: "`LIMIT` corta filas arbitrariamente; no corrige la lógica.",
      },
    ],
    explanation_md:
      "Filas de más suelen indicar una relación uno-a-muchos en un `JOIN`. Entender la causa evita reportes incorrectos.",
    is_published: true,
  },
  {
    slug: "distinct-q05-order-by",
    section,
    lesson,
    type: "true_false",
    difficulty: "easy",
    topic: "DISTINCT con ORDER BY",
    tags: ["distinct", "order_by"],
    estimated_seconds: 30,
    prompt_md:
      "Verdadero o falso: `SELECT DISTINCT currency FROM products ORDER BY currency;` devuelve las monedas sin repetir y ordenadas.",
    options: [
      { key: "a", body_md: "Verdadero", is_correct: true },
      {
        key: "b",
        body_md: "Falso",
        is_correct: false,
        why_incorrect_md:
          "`ORDER BY` se aplica sobre el resultado ya sin duplicados; ambas cláusulas conviven sin problema.",
      },
    ],
    explanation_md:
      "El orden lógico es: `FROM` → `SELECT DISTINCT` → `ORDER BY`. Primero se eliminan duplicados, luego se ordena.",
    is_published: true,
  },
  {
    slug: "distinct-q06-filas",
    section,
    lesson,
    type: "fill_blank",
    difficulty: "easy",
    topic: "Alcance de DISTINCT",
    tags: ["distinct"],
    estimated_seconds: 40,
    prompt_md:
      "`orders` tiene 6 valores distintos de `status` y 3 de `channel`, y todas las combinaciones aparecen al menos una vez. ¿Cuántas filas devuelve `SELECT DISTINCT status, channel FROM orders;`? Escribe solo el número.",
    answer: { accepted: ["18"], case_sensitive: false },
    explanation_md: "Una fila por combinación existente: 6 × 3 = 18.",
    is_published: true,
  },
  {
    slug: "distinct-q07-costo",
    section,
    lesson,
    type: "multiple",
    difficulty: "intermediate",
    topic: "Criterio de uso",
    tags: ["distinct", "performance"],
    estimated_seconds: 50,
    prompt_md:
      "¿Cuáles de estas afirmaciones sobre `DISTINCT` son correctas? Selecciona todas las que apliquen.",
    options: [
      {
        key: "a",
        body_md:
          "Obliga al motor a comparar todas las filas del resultado para eliminar repetidas.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Es la forma correcta de responder «qué valores existen en una columna».",
        is_correct: true,
      },
      {
        key: "c",
        body_md: "Cambia los valores de las filas que devuelve.",
        is_correct: false,
        why_incorrect_md: "Solo elimina repeticiones; nunca modifica valores.",
      },
      {
        key: "d",
        body_md: "Ignora las filas con NULL.",
        is_correct: false,
        why_incorrect_md: "Los NULL se conservan, agrupados en una única fila.",
      },
    ],
    explanation_md:
      "`DISTINCT` tiene un costo proporcional al tamaño del resultado y es la herramienta adecuada para listar valores únicos; no modifica valores ni descarta NULL.",
    is_published: true,
  },
  {
    slug: "distinct-q08-interpretar",
    section,
    lesson,
    type: "query_interpretation",
    difficulty: "easy",
    topic: "Lectura de consultas",
    tags: ["distinct"],
    estimated_seconds: 40,
    prompt_md: "¿Qué pregunta de negocio responde esta consulta?",
    code_md: "```sql\nSELECT DISTINCT customer_id\nFROM orders;\n```",
    options: [
      { key: "a", body_md: "Qué clientes hicieron al menos un pedido.", is_correct: true },
      {
        key: "b",
        body_md: "Cuántos pedidos hizo cada cliente.",
        is_correct: false,
        why_incorrect_md:
          "Eso requiere contar por cliente (`GROUP BY`, sección 15); aquí solo se listan ids únicos.",
      },
      {
        key: "c",
        body_md: "Todos los clientes registrados.",
        is_correct: false,
        why_incorrect_md:
          "Solo aparecen los clientes presentes en `orders`; quienes nunca compraron no están.",
      },
    ],
    explanation_md:
      "Listar `customer_id` únicos de `orders` equivale a «clientes con al menos un pedido».",
    is_published: true,
  },
];
