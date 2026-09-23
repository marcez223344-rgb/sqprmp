import type { QuestionDef } from "../schemas/question";

const section = "where";
const basico = "where-filtros-basicos";
const fechas = "where-texto-y-fechas";

export const questions: QuestionDef[] = [
  {
    slug: "where-q01-comillas",
    section,
    lesson: basico,
    type: "error_diagnosis",
    difficulty: "very_easy",
    topic: "Literales de texto",
    tags: ["where", "sintaxis"],
    estimated_seconds: 35,
    prompt_md: 'Esta consulta falla con `column "uy" does not exist`. ¿Por qué?',
    code_md: "```sql\nSELECT id FROM customers\nWHERE country = UY;\n```",
    options: [
      {
        key: "a",
        body_md:
          "El texto `UY` debe ir entre comillas simples; sin ellas se interpreta como nombre de columna.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "`country` es una palabra reservada.",
        is_correct: false,
        why_incorrect_md: "No lo es; el error menciona `uy`, el valor sin comillas.",
      },
      {
        key: "c",
        body_md: "Falta `AND`.",
        is_correct: false,
        why_incorrect_md: "Hay una sola condición; no hace falta `AND`.",
      },
    ],
    explanation_md:
      "Los literales de texto siempre van entre comillas simples: `WHERE country = 'UY'`.",
    is_published: true,
  },
  {
    slug: "where-q02-mayusculas",
    section,
    lesson: basico,
    type: "true_false",
    difficulty: "easy",
    topic: "Comparación de texto",
    tags: ["where"],
    estimated_seconds: 30,
    prompt_md:
      "Verdadero o falso: `WHERE status = 'Delivered'` devuelve los pedidos cuyo `status` es `'delivered'`.",
    options: [
      {
        key: "a",
        body_md: "Verdadero",
        is_correct: false,
        why_incorrect_md:
          "La comparación con `=` distingue mayúsculas: `'Delivered'` y `'delivered'` son textos distintos.",
      },
      { key: "b", body_md: "Falso", is_correct: true },
    ],
    explanation_md:
      "Con `=` el texto debe coincidir exactamente. Si no conoces la capitalización, usa `lower(status) = 'delivered'` o `ILIKE`.",
    is_published: true,
  },
  {
    slug: "where-q03-booleano",
    section,
    lesson: basico,
    type: "single",
    difficulty: "easy",
    topic: "Booleanos",
    tags: ["where"],
    estimated_seconds: 30,
    prompt_md: "¿Cuál de estas condiciones **no** es equivalente a las otras dos?",
    options: [
      { key: "a", body_md: "`WHERE is_active = 'yes'`", is_correct: true },
      {
        key: "b",
        body_md: "`WHERE is_active = TRUE`",
        is_correct: false,
        why_incorrect_md: "Es la forma explícita de filtrar verdaderos.",
      },
      {
        key: "c",
        body_md: "`WHERE is_active`",
        is_correct: false,
        why_incorrect_md: "Una columna booleana ya es una condición válida por sí misma.",
      },
    ],
    explanation_md:
      "PostgreSQL acepta `'yes'` como literal booleano, pero es una forma poco clara y no portable; las opciones b y c son las recomendadas. La opción a es la que se aparta de la convención.",
    is_published: true,
  },
  {
    slug: "where-q04-alias",
    section,
    lesson: basico,
    type: "single",
    difficulty: "easy",
    topic: "Orden de evaluación",
    tags: ["where", "alias"],
    estimated_seconds: 40,
    prompt_md: "Quieres los pedidos con neto mayor a 100 000. ¿Cuál consulta funciona?",
    options: [
      {
        key: "a",
        body_md:
          "```sql\nSELECT id, subtotal - discount AS neto\nFROM orders\nWHERE subtotal - discount > 100000;\n```",
        is_correct: true,
      },
      {
        key: "b",
        body_md:
          "```sql\nSELECT id, subtotal - discount AS neto\nFROM orders\nWHERE neto > 100000;\n```",
        is_correct: false,
        why_incorrect_md: "El alias `neto` no existe cuando se evalúa `WHERE`.",
      },
      {
        key: "c",
        body_md:
          "```sql\nSELECT id, subtotal - discount AS neto\nWHERE subtotal - discount > 100000\nFROM orders;\n```",
        is_correct: false,
        why_incorrect_md: "`WHERE` va después de `FROM`, no antes.",
      },
    ],
    explanation_md:
      "En `WHERE` se repite la expresión; los alias solo están disponibles en `ORDER BY`.",
    is_published: true,
  },
  {
    slug: "where-q05-like-porcentaje",
    section,
    lesson: fechas,
    type: "single",
    difficulty: "easy",
    topic: "Patrones",
    tags: ["where", "like"],
    estimated_seconds: 35,
    prompt_md: "¿Qué tiendas devuelve `WHERE store_name LIKE 'Bazar%'`?",
    options: [
      {
        key: "a",
        body_md: "Las que **empiezan** con `Bazar` (respetando mayúsculas).",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Las que contienen `Bazar` en cualquier posición.",
        is_correct: false,
        why_incorrect_md: "Para cualquier posición necesitas `%` a ambos lados: `'%Bazar%'`.",
      },
      {
        key: "c",
        body_md: "Las que empiezan con `bazar` o `Bazar`.",
        is_correct: false,
        why_incorrect_md: "`LIKE` distingue mayúsculas; para ignorarlas usa `ILIKE`.",
      },
    ],
    explanation_md:
      "`%` al final significa «lo que sea después». `LIKE` es sensible a mayúsculas; `ILIKE` no.",
    is_published: true,
  },
  {
    slug: "where-q06-guion-bajo",
    section,
    lesson: fechas,
    type: "fill_blank",
    difficulty: "intermediate",
    topic: "Patrones",
    tags: ["where", "like"],
    estimated_seconds: 40,
    prompt_md:
      "¿Qué carácter comodín de `LIKE` representa **exactamente un** carácter? Escribe solo el carácter.",
    answer: { accepted: ["_"], case_sensitive: false },
    explanation_md: "`_` equivale a un carácter cualquiera; `%` a cero o más.",
    is_published: true,
  },
  {
    slug: "where-q07-between-timestamp",
    section,
    lesson: fechas,
    type: "error_diagnosis",
    difficulty: "intermediate",
    topic: "Bordes de fecha",
    tags: ["where", "date_boundary"],
    estimated_seconds: 60,
    prompt_md:
      "El reporte de marzo muestra menos pedidos que el panel oficial. La consulta no da error. ¿Qué está pasando?",
    code_md:
      "```sql\nSELECT count(*)\nFROM orders\nWHERE created_at BETWEEN '2025-03-01' AND '2025-03-31';\n```",
    options: [
      {
        key: "a",
        body_md:
          "`'2025-03-31'` equivale a las 00:00 del 31; los pedidos de ese día con hora posterior quedan afuera.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "`BETWEEN` excluye ambos extremos.",
        is_correct: false,
        why_incorrect_md:
          "`BETWEEN` es inclusivo en ambos extremos; el problema es la hora implícita.",
      },
      {
        key: "c",
        body_md: "Falta convertir las fechas con `to_date`.",
        is_correct: false,
        why_incorrect_md:
          "PostgreSQL convierte el literal automáticamente; la conversión no cambia el borde.",
      },
    ],
    explanation_md:
      "Con `timestamptz`, usa un rango semiabierto: `created_at >= '2025-03-01' AND created_at < '2025-04-01'`.",
    is_published: true,
  },
  {
    slug: "where-q08-rango-semiabierto",
    section,
    lesson: fechas,
    type: "single",
    difficulty: "easy",
    topic: "Bordes de fecha",
    tags: ["where", "date_boundary"],
    estimated_seconds: 40,
    prompt_md:
      "¿Cuál condición incluye **todo** el 15 de marzo de 2025 y nada más, para una columna `timestamptz`?",
    options: [
      {
        key: "a",
        body_md: "`created_at >= '2025-03-15' AND created_at < '2025-03-16'`",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "`created_at = '2025-03-15'`",
        is_correct: false,
        why_incorrect_md: "Solo coincide con el instante exacto de las 00:00:00.",
      },
      {
        key: "c",
        body_md: "`created_at BETWEEN '2025-03-15' AND '2025-03-15 23:59:59'`",
        is_correct: false,
        why_incorrect_md:
          "Funciona casi siempre, pero excluye los milisegundos finales del día y es frágil; el rango semiabierto es la forma recomendada.",
      },
    ],
    explanation_md: "Inicio inclusivo, fin exclusivo: `>= día AND < día siguiente`.",
    is_published: true,
  },
  {
    slug: "where-q09-interpretar",
    section,
    lesson: basico,
    type: "query_interpretation",
    difficulty: "easy",
    topic: "Lectura de consultas",
    tags: ["where"],
    estimated_seconds: 40,
    prompt_md: "¿Qué devuelve esta consulta?",
    code_md:
      "```sql\nSELECT id, name\nFROM products\nWHERE currency = 'MXN'\n  AND stock > 0\n  AND NOT is_active;\n```",
    options: [
      {
        key: "a",
        body_md: "Productos en pesos mexicanos, con stock, pero **inactivos**.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Productos en pesos mexicanos activos con stock.",
        is_correct: false,
        why_incorrect_md: "`NOT is_active` invierte la condición: pide los inactivos.",
      },
      {
        key: "c",
        body_md: "Productos que cumplen al menos una de las tres condiciones.",
        is_correct: false,
        why_incorrect_md: "Con `AND` deben cumplirse las tres.",
      },
    ],
    explanation_md:
      "Tres condiciones unidas por `AND`; `NOT is_active` selecciona los productos desactivados. Es un caso típico de «stock inmovilizado».",
    is_published: true,
  },
  {
    slug: "where-q10-escenario-indice",
    section,
    lesson: fechas,
    type: "scenario",
    difficulty: "intermediate",
    topic: "Rendimiento",
    tags: ["where", "performance"],
    estimated_seconds: 50,
    prompt_md:
      "La tabla `orders` tiene un índice en `created_at`. Necesitas los pedidos de abril de 2025 y la consulta debe ser rápida. ¿Qué condición conviene?",
    options: [
      {
        key: "a",
        body_md: "`created_at >= '2025-04-01' AND created_at < '2025-05-01'`",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "`extract(month from created_at) = 4 AND extract(year from created_at) = 2025`",
        is_correct: false,
        why_incorrect_md:
          "Aplicar funciones a la columna impide usar el índice: el motor recorre toda la tabla.",
      },
      {
        key: "c",
        body_md: "`to_char(created_at, 'YYYY-MM') = '2025-04'`",
        is_correct: false,
        why_incorrect_md: "Mismo problema: la función sobre la columna anula el índice.",
      },
    ],
    explanation_md:
      "Comparar la columna tal cual, sin envolverla en ninguna función, permite usar el índice. Es la forma recomendada para rangos de fechas.",
    is_published: true,
  },
];
