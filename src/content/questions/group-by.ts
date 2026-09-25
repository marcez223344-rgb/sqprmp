import type { QuestionDef } from "../schemas/question";

const section = "group-by";
const basico = "group-by-basico";
const reportes = "group-by-reportes";

export const questions: QuestionDef[] = [
  {
    slug: "gb-q01-regla",
    section,
    lesson: basico,
    type: "error_diagnosis",
    difficulty: "easy",
    topic: "Regla de GROUP BY",
    tags: ["group_by"],
    estimated_seconds: 45,
    prompt_md: "¿Por qué falla esta consulta?",
    code_md: "```sql\nSELECT status, payment_method, count(*)\nFROM orders\nGROUP BY status;\n```",
    options: [
      {
        key: "a",
        body_md: "`payment_method` no está en el `GROUP BY` ni dentro de una agregación.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "`count(*)` necesita alias.",
        is_correct: false,
        why_incorrect_md: "El alias es opcional.",
      },
      {
        key: "c",
        body_md: "No se puede agrupar por una columna de texto.",
        is_correct: false,
        why_incorrect_md: "Se puede agrupar por cualquier tipo.",
      },
    ],
    explanation_md: "Agrega `payment_method` al `GROUP BY` o quítala del `SELECT`.",
    is_published: true,
  },
  {
    slug: "gb-q02-filas",
    section,
    lesson: basico,
    type: "single",
    difficulty: "easy",
    topic: "Forma del resultado",
    tags: ["group_by"],
    estimated_seconds: 40,
    prompt_md:
      "En la tabla `orders` de Pídelo, la columna `status` toma 2 valores distintos (`delivered` y `cancelled`), la columna `payment_method` toma 3 (`card`, `cash` y `wallet`), y existen pedidos para todas las combinaciones. ¿Cuántas filas devuelve `SELECT status, payment_method, count(*) FROM orders GROUP BY status, payment_method;`?",
    options: [
      { key: "a", body_md: "6", is_correct: true },
      {
        key: "b",
        body_md: "5",
        is_correct: false,
        why_incorrect_md: "Se agrupa por combinación (2 × 3), no por suma de valores.",
      },
      {
        key: "c",
        body_md: "1",
        is_correct: false,
        why_incorrect_md: "Una fila sería sin `GROUP BY`.",
      },
    ],
    explanation_md: "Una fila por combinación existente de las columnas agrupadas.",
    is_published: true,
  },
  {
    slug: "gb-q03-where-vs-having",
    section,
    lesson: basico,
    type: "single",
    difficulty: "intermediate",
    topic: "Orden de evaluación",
    tags: ["group_by", "where"],
    estimated_seconds: 45,
    prompt_md:
      "Quieres contar pedidos por método de pago, pero solo los entregados. ¿Dónde va la condición `status = 'delivered'`?",
    options: [
      { key: "a", body_md: "En `WHERE`, antes del `GROUP BY`: filtra filas.", is_correct: true },
      {
        key: "b",
        body_md: "En `GROUP BY`.",
        is_correct: false,
        why_incorrect_md: "`GROUP BY` solo lista columnas o expresiones de agrupación.",
      },
      {
        key: "c",
        body_md: "En `SELECT` como `count(status = 'delivered')`.",
        is_correct: false,
        why_incorrect_md:
          "`count(expresión)` cuenta las filas donde la expresión no es NULL, y `status = 'delivered'` vale `true` o `false`, nunca NULL, para todo pedido con estado. Por eso cuenta todos los pedidos, entregados o no: no filtra nada.",
      },
    ],
    explanation_md:
      "`WHERE` reduce las filas que entran a los grupos. `HAVING` (sección 16) filtra grupos ya calculados.",
    is_published: true,
  },
  {
    slug: "gb-q04-null-grupo",
    section,
    lesson: basico,
    type: "true_false",
    difficulty: "easy",
    topic: "NULL en GROUP BY",
    tags: ["group_by", "null_handling"],
    estimated_seconds: 30,
    prompt_md:
      "Verdadero o falso: `GROUP BY promotion_id` descarta los pedidos con `promotion_id` NULL.",
    options: [
      {
        key: "a",
        body_md: "Verdadero",
        is_correct: false,
        why_incorrect_md:
          "Los NULL forman su propio grupo; aparecen como una fila con `promotion_id` NULL.",
      },
      { key: "b", body_md: "Falso", is_correct: true },
    ],
    explanation_md: "Igual que `DISTINCT`, `GROUP BY` agrupa los NULL entre sí.",
    is_published: true,
  },
  {
    slug: "gb-q05-orden",
    section,
    lesson: basico,
    type: "true_false",
    difficulty: "easy",
    topic: "Orden del resultado",
    tags: ["group_by", "order_by"],
    estimated_seconds: 30,
    prompt_md:
      "Verdadero o falso: el resultado de un `GROUP BY` sale ordenado por la columna agrupada.",
    options: [
      {
        key: "a",
        body_md: "Verdadero",
        is_correct: false,
        why_incorrect_md: "El orden depende del plan de ejecución; sin `ORDER BY` no hay garantía.",
      },
      { key: "b", body_md: "Falso", is_correct: true },
    ],
    explanation_md: "Agrega `ORDER BY` explícito cuando el orden importa.",
    is_published: true,
  },
  {
    slug: "gb-q06-date-trunc",
    section,
    lesson: reportes,
    type: "fill_blank",
    difficulty: "intermediate",
    topic: "Series temporales",
    tags: ["group_by", "date_functions"],
    estimated_seconds: 40,
    prompt_md:
      "Completa el nombre de la función que lleva un `timestamptz` (fecha y hora) al primer instante de su mes: `___('month', placed_at)`. Escribe solo el nombre de la función.",
    answer: {
      accepted: ["date_trunc", "date_trunc('month', placed_at)"],
      case_sensitive: false,
    },
    explanation_md: "`date_trunc('month', ts)` es la base de cualquier serie mensual.",
    is_published: true,
  },
  {
    slug: "gb-q07-grupos-vacios",
    section,
    lesson: reportes,
    type: "scenario",
    difficulty: "intermediate",
    topic: "Grupos vacíos",
    tags: ["group_by", "outer_join"],
    estimated_seconds: 50,
    prompt_md:
      "Un reporte cuenta pedidos por mes con `GROUP BY date_trunc('month', placed_at)` sobre un período de 9 meses y devuelve 8 filas: falta febrero. La consulta no tiene ningún `WHERE` que excluya ese mes. ¿Qué pasó?",
    options: [
      {
        key: "a",
        body_md: "No hubo pedidos en febrero; `GROUP BY` no genera grupos sin filas.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "`date_trunc` no reconoce febrero.",
        is_correct: false,
        why_incorrect_md: "`date_trunc` funciona para cualquier mes.",
      },
      {
        key: "c",
        body_md: "Falta `DISTINCT`.",
        is_correct: false,
        why_incorrect_md: "`DISTINCT` no crea filas.",
      },
    ],
    explanation_md:
      "Para mostrar ceros hay que unir contra un calendario con LEFT JOIN (sección 18).",
    is_published: true,
  },
  {
    slug: "gb-q08-desempate",
    section,
    lesson: reportes,
    type: "single",
    difficulty: "easy",
    topic: "Orden determinista",
    tags: ["group_by", "order_by"],
    estimated_seconds: 40,
    prompt_md: "¿Para qué sirve el segundo criterio en `ORDER BY entregados DESC, restaurant_id`?",
    options: [
      {
        key: "a",
        body_md: "Desempatar restaurantes con la misma cantidad de forma reproducible.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Ordenar primero por restaurante.",
        is_correct: false,
        why_incorrect_md: "El primer criterio manda; el segundo solo actúa en empates.",
      },
      {
        key: "c",
        body_md: "Es obligatorio cuando hay `LIMIT`.",
        is_correct: false,
        why_incorrect_md:
          "No es obligatorio, pero sin él el `LIMIT` puede cortar en un empate de forma arbitraria.",
      },
    ],
    explanation_md:
      "Con `LIMIT 10` y empates, el desempate decide quién entra; hacerlo explícito evita resultados que cambian entre ejecuciones.",
    is_published: true,
  },
  {
    slug: "gb-q09-interpretar",
    section,
    lesson: reportes,
    type: "query_interpretation",
    difficulty: "intermediate",
    topic: "Lectura de consultas",
    tags: ["group_by", "aggregate"],
    estimated_seconds: 55,
    prompt_md:
      "En Pídelo, la columna `max_uses_per_customer` de `promotions` indica cuántas veces puede usar cada cliente una promoción. Para una promoción con `max_uses_per_customer = 1`, ¿qué indica que `usos` sea mayor que `clientes` en esta consulta?",
    code_md:
      "```sql\nSELECT promotion_id, count(*) AS usos, count(DISTINCT customer_id) AS clientes\nFROM orders\nWHERE promotion_id IS NOT NULL\nGROUP BY promotion_id;\n```",
    options: [
      {
        key: "a",
        body_md:
          "Al menos un cliente la usó más de una vez, es decir, alguien superó el tope de un uso por cliente.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Hay pedidos duplicados en la tabla.",
        is_correct: false,
        why_incorrect_md:
          "Cada pedido es una fila legítima; la diferencia viene de clientes repetidos, no de filas duplicadas.",
      },
      {
        key: "c",
        body_md: "Es imposible; `count(*)` siempre es igual a `count(DISTINCT ...)`.",
        is_correct: false,
        why_incorrect_md:
          "`count(*)` cuenta pedidos y `count(DISTINCT customer_id)` clientes: difieren cuando un cliente repite.",
      },
    ],
    explanation_md:
      "Comparar `count(*)` con `count(DISTINCT ...)` por grupo es una forma rápida de detectar repeticiones que no deberían existir.",
    is_published: true,
  },
  {
    slug: "gb-q10-posicion",
    section,
    lesson: basico,
    type: "multiple",
    difficulty: "intermediate",
    topic: "Formas de GROUP BY",
    tags: ["group_by"],
    estimated_seconds: 50,
    prompt_md:
      "En PostgreSQL, ¿cuáles de estas formas de `GROUP BY` agrupan correctamente **por mes** para `SELECT date_trunc('month', placed_at)::date AS mes, count(*) FROM orders`? Selecciona todas las que apliquen.",
    options: [
      { key: "a", body_md: "`GROUP BY mes`", is_correct: true },
      { key: "b", body_md: "`GROUP BY 1`", is_correct: true },
      { key: "c", body_md: "`GROUP BY date_trunc('month', placed_at)`", is_correct: true },
      {
        key: "d",
        body_md: "`GROUP BY placed_at`",
        is_correct: false,
        why_incorrect_md:
          "Es válida sintácticamente, pero agrupa por cada instante exacto: casi tantas filas como pedidos.",
      },
    ],
    explanation_md:
      "Alias, posición y expresión completa son equivalentes; agrupar por la columna cruda no lo es.",
    is_published: true,
  },
];
