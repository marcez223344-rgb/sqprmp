import type { QuestionDef } from "../schemas/question";

const section = "case";
const l1 = "case-simple-y-buscada";
const l2 = "case-segmentos-de-negocio";
const l3 = "case-coalesce-y-nullif";

export const questions: QuestionDef[] = [
  {
    slug: "case-q01-simple-vs-buscada",
    section,
    lesson: l1,
    type: "single",
    difficulty: "easy",
    topic: "CASE simple y CASE buscada",
    tags: ["case"],
    estimated_seconds: 45,
    prompt_md:
      "Necesitas clasificar a los vendedores según si su `rating` es mayor o igual a 4.5. ¿Qué forma de `CASE` puedes usar?",
    code_md: null,
    options: [
      {
        key: "a",
        body_md: "Solo la forma buscada: `CASE WHEN rating >= 4.5 THEN ... END`.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Solo la forma simple: `CASE rating WHEN >= 4.5 THEN ... END`.",
        is_correct: false,
        why_incorrect_md:
          "La forma simple compara únicamente por igualdad; `CASE rating WHEN >= 4.5` ni siquiera es sintaxis válida.",
      },
      {
        key: "c",
        body_md: "Cualquiera de las dos: son intercambiables.",
        is_correct: false,
        why_incorrect_md:
          "Son intercambiables solo cuando todas las condiciones son «columna = valor». Con `>=`, `IN` o `IS NULL` necesitas la forma buscada.",
      },
    ],
    explanation_md:
      "La forma simple (`CASE columna WHEN valor THEN ...`) compara por igualdad. Para umbrales, rangos o condiciones compuestas se usa la forma buscada, que admite cualquier condición booleana.",
    is_published: true,
  },
  {
    slug: "case-q02-primera-coincidencia",
    section,
    lesson: l1,
    type: "query_interpretation",
    difficulty: "intermediate",
    topic: "Orden de las ramas",
    tags: ["case", "logica"],
    estimated_seconds: 60,
    prompt_md:
      "En la tabla `sellers` de TiendaViva hay 41 vendedores con `rating >= 4.5` y 29 con `rating` entre 4.0 y 4.49. ¿En cuántas filas del resultado la columna `segmento` valdrá `Destacado`?",
    code_md:
      "```sql\nSELECT\n  CASE\n    WHEN rating >= 4.0 THEN 'Confiable'\n    WHEN rating >= 4.5 THEN 'Destacado'\n    ELSE 'A mejorar'\n  END AS segmento\nFROM sellers;\n```",
    options: [
      {
        key: "a",
        body_md: "Ninguna: la rama `Destacado` nunca se alcanza.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "41, porque esa condición es más específica y tiene prioridad.",
        is_correct: false,
        why_incorrect_md:
          "SQL no busca la condición «más específica»: evalúa las ramas en el orden escrito y se queda con la primera verdadera.",
      },
      {
        key: "c",
        body_md: "70, porque las dos condiciones se cumplen para esos vendedores.",
        is_correct: false,
        why_incorrect_md:
          "Cada fila recibe una sola etiqueta. Los 70 vendedores con 4.0 o más salen como `Confiable`.",
      },
    ],
    explanation_md:
      "Un vendedor con 4.8 cumple `rating >= 4.0` en la primera rama y se detiene ahí. La segunda rama es código muerto: hay que ordenar los umbrales del más exigente al menos exigente.",
    is_published: true,
  },
  {
    slug: "case-q03-simple-con-condicion",
    section,
    lesson: l1,
    type: "error_diagnosis",
    difficulty: "intermediate",
    topic: "Errores de sintaxis y tipos",
    tags: ["case", "sintaxis"],
    estimated_seconds: 60,
    prompt_md:
      "Esta consulta falla con `operator does not exist: text = boolean`. ¿Cuál es la causa?",
    code_md:
      "```sql\nSELECT\n  id,\n  CASE status\n    WHEN status = 'delivered' THEN 'Entregado'\n    ELSE 'Otro'\n  END AS estado\nFROM orders;\n```",
    options: [
      {
        key: "a",
        body_md:
          "Se mezclaron las dos formas: al escribir `CASE status`, cada `WHEN` debe llevar solo el valor a comparar (`WHEN 'delivered'`).",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Falta el `END` de la expresión.",
        is_correct: false,
        why_incorrect_md: "El `END` está presente; el problema es el contenido del `WHEN`.",
      },
      {
        key: "c",
        body_md: "`status` es de tipo texto y no se puede usar en un `CASE`.",
        is_correct: false,
        why_incorrect_md:
          "`CASE` funciona con cualquier tipo. El error aparece porque se compara el texto `status` contra el booleano que produce `status = 'delivered'`.",
      },
    ],
    explanation_md:
      "En la forma simple, PostgreSQL compara `status` con lo que siga a cada `WHEN`. Como `status = 'delivered'` es un booleano, intenta comparar texto con booleano y falla. Correcto: `CASE status WHEN 'delivered' THEN ...` o `CASE WHEN status = 'delivered' THEN ...`.",
    is_published: true,
  },
  {
    slug: "case-q04-sin-else",
    section,
    lesson: l1,
    type: "true_false",
    difficulty: "easy",
    topic: "La rama ELSE",
    tags: ["case", "null_handling"],
    estimated_seconds: 30,
    prompt_md:
      "Verdadero o falso: si una fila no cumple ninguna condición `WHEN` y la expresión no tiene `ELSE`, el resultado de esa fila es NULL.",
    code_md: null,
    options: [
      { key: "a", body_md: "Verdadero", is_correct: true },
      {
        key: "b",
        body_md: "Falso",
        is_correct: false,
        why_incorrect_md:
          "El `ELSE` es opcional y su ausencia equivale a `ELSE NULL`; la consulta no falla ni devuelve una cadena vacía.",
      },
    ],
    explanation_md:
      "Omitir `ELSE` equivale a escribir `ELSE NULL`. Es una causa habitual de huecos inesperados en los reportes: conviene declarar siempre una categoría final explícita.",
    is_published: true,
  },
  {
    slug: "case-q05-cierre",
    section,
    lesson: l1,
    type: "fill_blank",
    difficulty: "very_easy",
    topic: "Sintaxis de CASE",
    tags: ["case", "sintaxis"],
    estimated_seconds: 25,
    prompt_md:
      "Completa la palabra clave que cierra toda expresión `CASE`, antes del alias: `CASE WHEN stock = 0 THEN 'Sin stock' ELSE 'Disponible' ____ AS estado`. Escribe solo la palabra.",
    code_md: null,
    answer: { accepted: ["END", "END AS estado"], case_sensitive: false },
    explanation_md:
      "Toda expresión `CASE` termina con `END`. No se cierra con paréntesis ni con `THEN`, y el alias va después del `END`.",
    is_published: true,
  },
  {
    slug: "case-q06-afirmaciones",
    section,
    lesson: l2,
    type: "multiple",
    difficulty: "intermediate",
    topic: "Propiedades de CASE",
    tags: ["case", "order_by"],
    estimated_seconds: 70,
    prompt_md:
      "¿Cuáles de estas afirmaciones sobre `CASE` son correctas? Marca todas las que apliquen.",
    code_md: null,
    options: [
      {
        key: "a",
        body_md:
          "Devuelve un valor por fila, así que puede usarse en `SELECT`, `WHERE` y `ORDER BY`.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Todas las ramas `THEN` y el `ELSE` deben devolver tipos compatibles entre sí.",
        is_correct: true,
      },
      {
        key: "c",
        body_md: "Modifica los datos guardados en la tabla.",
        is_correct: false,
        why_incorrect_md:
          "Es una expresión de lectura: construye una columna calculada en el resultado y no toca la tabla.",
      },
      {
        key: "d",
        body_md: "Evalúa todas las ramas y se queda con la que coincida mejor.",
        is_correct: false,
        why_incorrect_md:
          "Evalúa en orden y se detiene en la primera condición verdadera; no existe un criterio de «mejor coincidencia».",
      },
    ],
    explanation_md:
      "`CASE` es una expresión de solo lectura, con tipos unificados en todas sus ramas, que se resuelve por la primera coincidencia y puede aparecer en cualquier lugar donde se admita una expresión.",
    is_published: true,
  },
  {
    slug: "case-q07-null-en-else",
    section,
    lesson: l2,
    type: "scenario",
    difficulty: "intermediate",
    topic: "CASE y NULL",
    tags: ["case", "null_handling"],
    estimated_seconds: 70,
    prompt_md:
      "En `sellers`, 28 vendedores tienen `rating` NULL porque nunca recibieron reseñas. Un reporte los clasifica con `CASE WHEN rating >= 4.5 THEN 'Destacado' WHEN rating >= 4.0 THEN 'Confiable' ELSE 'A mejorar' END`. ¿Qué ocurre con esos 28 y cómo lo corriges?",
    code_md: null,
    options: [
      {
        key: "a",
        body_md:
          "Aparecen como `A mejorar`, porque NULL no cumple ninguna comparación; hay que agregar una rama `WHEN rating IS NULL THEN 'Sin calificación'`.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Aparecen como NULL, porque NULL se propaga a través del `CASE`.",
        is_correct: false,
        why_incorrect_md:
          "El `CASE` no propaga NULL: la fila simplemente no coincide con ningún `WHEN` y toma el valor del `ELSE`.",
      },
      {
        key: "c",
        body_md: "Se excluyen del resultado, porque el `CASE` filtra las filas sin valor.",
        is_correct: false,
        why_incorrect_md:
          "`CASE` no filtra nada; eso es tarea de `WHERE`. Las 180 filas siguen apareciendo.",
      },
    ],
    explanation_md:
      "`NULL >= 4.5` da «desconocido», que no es verdadero, así que la fila llega al `ELSE`. Etiquetar como «a mejorar» a quien nunca fue calificado es un error de negocio: necesita su propia categoría.",
    is_published: true,
  },
  {
    slug: "case-q08-atajos",
    section,
    lesson: l3,
    type: "matching",
    difficulty: "easy",
    topic: "COALESCE, NULLIF y CASE",
    tags: ["case", "null_handling"],
    estimated_seconds: 70,
    prompt_md: "Relaciona cada expresión con lo que hace. Cada descripción se usa una sola vez.",
    code_md: null,
    pairs: [
      {
        left: "COALESCE(description, 'sin detalle')",
        right: "Devuelve el primer valor de la lista que no sea NULL",
      },
      { left: "NULLIF(installments, 0)", right: "Devuelve NULL cuando el valor es igual a 0" },
      {
        left: "CASE WHEN amount >= 100000 THEN 'Alto' ELSE 'Normal' END",
        right: "Forma buscada: clasifica según una condición de umbral (>=)",
      },
      {
        left: "CASE kind WHEN 'topup' THEN 'Carga' ELSE 'Otro' END",
        right: "Forma simple: compara una columna contra valores fijos, solo por igualdad",
      },
    ],
    explanation_md:
      "`COALESCE` y `NULLIF` son atajos de `CASE` para dos situaciones frecuentes con NULL. `COALESCE(a, b)` equivale a `CASE WHEN a IS NOT NULL THEN a ELSE b END`, y `NULLIF(a, b)` equivale a `CASE WHEN a = b THEN NULL ELSE a END`. La forma simple de `CASE` (`CASE columna WHEN valor ...`) solo compara por igualdad; para umbrales o rangos se usa la forma buscada (`CASE WHEN condición ...`).",
    is_published: true,
  },
  {
    slug: "case-q09-order-by",
    section,
    lesson: l2,
    type: "single",
    difficulty: "intermediate",
    topic: "CASE en ORDER BY",
    tags: ["case", "order_by"],
    estimated_seconds: 55,
    prompt_md: "¿Qué logra el `ORDER BY` de esta consulta?",
    code_md:
      "```sql\nSELECT id, status\nFROM orders\nORDER BY\n  CASE status\n    WHEN 'pending' THEN 1\n    WHEN 'paid' THEN 2\n    WHEN 'shipped' THEN 3\n    WHEN 'delivered' THEN 4\n    ELSE 5\n  END,\n  id;\n```",
    options: [
      {
        key: "a",
        body_md:
          "Ordena los pedidos por el ciclo de vida del negocio en lugar de por orden alfabético del estado.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Agrega una columna numérica con el estado al resultado.",
        is_correct: false,
        why_incorrect_md:
          "El resultado solo trae `id` y `status`: una expresión usada en `ORDER BY` no se agrega a la salida.",
      },
      {
        key: "c",
        body_md: "Filtra los pedidos que no están en la lista de estados.",
        is_correct: false,
        why_incorrect_md:
          "No filtra: los estados no listados reciben el valor 5 del `ELSE` y quedan al final.",
      },
    ],
    explanation_md:
      "Alfabéticamente `cancelled` iría antes que `paid`. Asignar un número por estado con `CASE` impone el orden real del proceso; `id` desempata para que el resultado sea determinista.",
    is_published: true,
  },
];
