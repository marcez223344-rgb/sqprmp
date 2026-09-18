import type { QuestionDef } from "../schemas/question";

const section = "funciones-de-ventana";
const over = "ventana-over-partition";
const marcos = "ventana-order-by-y-marcos";

export const questions: QuestionDef[] = [
  {
    slug: "win-q01-filas",
    section,
    lesson: over,
    type: "single",
    difficulty: "easy",
    topic: "Ventana vs GROUP BY",
    tags: ["window_function", "group_by"],
    estimated_seconds: 40,
    prompt_md:
      "`transactions` de una cuenta tiene 127 filas. ¿Cuántas devuelve `SELECT id, avg(amount) OVER (PARTITION BY kind) FROM transactions WHERE account_id = 2364;`?",
    options: [
      { key: "a", body_md: "127: una por movimiento.", is_correct: true },
      {
        key: "b",
        body_md: "Una por `kind`.",
        is_correct: false,
        why_incorrect_md: "Eso sería `GROUP BY kind`. Las ventanas no colapsan filas.",
      },
      {
        key: "c",
        body_md: "1.",
        is_correct: false,
        why_incorrect_md: "Una fila sería una agregación sin `GROUP BY` ni `OVER`.",
      },
    ],
    explanation_md: "Las funciones de ventana agregan sin reducir el número de filas.",
    is_published: true,
  },
  {
    slug: "win-q02-over-vacio",
    section,
    lesson: over,
    type: "single",
    difficulty: "easy",
    topic: "OVER ()",
    tags: ["window_function"],
    estimated_seconds: 35,
    prompt_md: "¿Qué calcula `sum(amount) OVER ()`?",
    options: [
      {
        key: "a",
        body_md: "La suma de `amount` sobre todas las filas de la consulta, repetida en cada fila.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "La suma acumulada hasta cada fila.",
        is_correct: false,
        why_incorrect_md: "El acumulado requiere `ORDER BY` dentro de `OVER`.",
      },
      {
        key: "c",
        body_md: "La suma de `amount` de cada fila consigo misma.",
        is_correct: false,
        why_incorrect_md: "La ventana vacía abarca todas las filas, no una.",
      },
    ],
    explanation_md:
      "`OVER ()` define la ventana más amplia posible: el conjunto completo de filas que llegan a la fase de ventanas.",
    is_published: true,
  },
  {
    slug: "win-q03-orden-evaluacion",
    section,
    lesson: over,
    type: "error_diagnosis",
    difficulty: "intermediate",
    topic: "Orden de evaluación",
    tags: ["window_function", "where"],
    estimated_seconds: 55,
    prompt_md:
      "La consulta falla con `window functions are not allowed in WHERE`. ¿Cuál es la solución?",
    code_md:
      "```sql\nSELECT id, amount\nFROM transactions\nWHERE amount > avg(amount) OVER ();\n```",
    options: [
      {
        key: "a",
        body_md: "Calcular la ventana en una subconsulta o CTE y filtrar afuera.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Cambiar `WHERE` por `HAVING`.",
        is_correct: false,
        why_incorrect_md: "`HAVING` se evalúa antes que las ventanas; tampoco puede usarlas.",
      },
      {
        key: "c",
        body_md: "Quitar el `OVER ()`.",
        is_correct: false,
        why_incorrect_md: "Sin `OVER`, `avg` es una agregación y tampoco es válida en `WHERE`.",
      },
    ],
    explanation_md:
      "Las ventanas se calculan después de `WHERE`, `GROUP BY` y `HAVING`; para filtrar por su resultado hay que envolver la consulta.",
    is_published: true,
  },
  {
    slug: "win-q04-participacion",
    section,
    lesson: over,
    type: "query_interpretation",
    difficulty: "intermediate",
    topic: "Participación sobre el total",
    tags: ["window_function", "aggregate"],
    estimated_seconds: 60,
    prompt_md: "¿Qué representa `pct`?",
    code_md:
      "```sql\nSELECT category, sum(amount) AS total,\n       round(100 * sum(amount) / sum(sum(amount)) OVER (), 2) AS pct\nFROM ...\nGROUP BY category;\n```",
    options: [
      {
        key: "a",
        body_md: "El porcentaje del total general que aporta cada categoría.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "El promedio de `amount` por categoría.",
        is_correct: false,
        why_incorrect_md: "No hay `avg`; es una suma dividida por la suma de todas las sumas.",
      },
      {
        key: "c",
        body_md: "El porcentaje acumulado hasta esa categoría.",
        is_correct: false,
        why_incorrect_md: "Sin `ORDER BY` en la ventana no hay acumulado.",
      },
    ],
    explanation_md:
      "`sum(sum(amount)) OVER ()` suma los totales de todos los grupos: el denominador de una participación.",
    is_published: true,
  },
  {
    slug: "win-q05-acumulado",
    section,
    lesson: marcos,
    type: "fill_blank",
    difficulty: "easy",
    topic: "Acumulados",
    tags: ["window_function", "order_by"],
    estimated_seconds: 40,
    prompt_md:
      "Completa la cláusula que convierte `sum(amount) OVER (...)` en un acumulado cronológico: `sum(amount) OVER (___ ___ created_at)`.",
    answer: { accepted: ["ORDER BY"], case_sensitive: false },
    explanation_md:
      "`ORDER BY` dentro de `OVER` hace que el agregado avance fila a fila en ese orden.",
    is_published: true,
  },
  {
    slug: "win-q06-marco",
    section,
    lesson: marcos,
    type: "single",
    difficulty: "advanced",
    topic: "Marcos de ventana",
    tags: ["window_function"],
    estimated_seconds: 60,
    prompt_md:
      "En una serie diaria, ¿qué marco define una media móvil de los últimos 7 días **incluido el actual**?",
    options: [
      { key: "a", body_md: "`ROWS BETWEEN 6 PRECEDING AND CURRENT ROW`", is_correct: true },
      {
        key: "b",
        body_md: "`ROWS BETWEEN 7 PRECEDING AND CURRENT ROW`",
        is_correct: false,
        why_incorrect_md: "Serían 8 filas: 7 anteriores más la actual.",
      },
      {
        key: "c",
        body_md: "`ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`",
        is_correct: false,
        why_incorrect_md: "Eso es el acumulado desde el inicio, no una ventana móvil.",
      },
    ],
    explanation_md:
      "6 anteriores + la actual = 7 filas. Las primeras filas de la serie promedian menos valores porque el marco se recorta.",
    is_published: true,
  },
  {
    slug: "win-q07-rows-range",
    section,
    lesson: marcos,
    type: "true_false",
    difficulty: "intermediate",
    topic: "ROWS vs RANGE",
    tags: ["window_function"],
    estimated_seconds: 40,
    prompt_md:
      "Verdadero o falso: con `ORDER BY fecha` y fechas repetidas, `RANGE` incluye en el marco todas las filas con la misma fecha que la actual, mientras que `ROWS` no.",
    options: [
      { key: "a", body_md: "Verdadero", is_correct: true },
      {
        key: "b",
        body_md: "Falso",
        is_correct: false,
        why_incorrect_md:
          "`RANGE` agrupa empates del `ORDER BY`; `ROWS` cuenta filas físicas una a una.",
      },
    ],
    explanation_md:
      "Por eso un acumulado con `RANGE` (el marco por defecto) puede «saltar» en filas con el mismo valor de orden; agrega una columna de desempate o usa `ROWS`.",
    is_published: true,
  },
  {
    slug: "win-q08-partition-order",
    section,
    lesson: marcos,
    type: "single",
    difficulty: "intermediate",
    topic: "PARTITION + ORDER",
    tags: ["window_function"],
    estimated_seconds: 45,
    prompt_md: "¿Qué calcula `sum(amount) OVER (PARTITION BY account_id ORDER BY created_at)`?",
    options: [
      { key: "a", body_md: "Un acumulado que se reinicia en cada cuenta.", is_correct: true },
      {
        key: "b",
        body_md: "El total por cuenta, repetido en cada fila.",
        is_correct: false,
        why_incorrect_md: "Eso sería sin `ORDER BY`.",
      },
      {
        key: "c",
        body_md: "Un acumulado global ordenado por cuenta.",
        is_correct: false,
        why_incorrect_md: "`PARTITION BY` separa las cuentas; el acumulado no cruza particiones.",
      },
    ],
    explanation_md:
      "Partición = grupo independiente; orden = avance del acumulado dentro del grupo.",
    is_published: true,
  },
  {
    slug: "win-q09-window-clause",
    section,
    lesson: marcos,
    type: "scenario",
    difficulty: "easy",
    topic: "Ventanas con nombre",
    tags: ["window_function", "readability"],
    estimated_seconds: 40,
    prompt_md:
      "Tu consulta repite `OVER (PARTITION BY account_id ORDER BY created_at, id)` en cinco columnas. ¿Qué conviene?",
    options: [
      {
        key: "a",
        body_md: "Declararla una vez con `WINDOW w AS (...)` y usar `OVER w`.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Dejarla repetida; PostgreSQL la optimiza igual.",
        is_correct: false,
        why_incorrect_md:
          "La optimiza, pero la legibilidad y el riesgo de inconsistencias entre copias son el problema.",
      },
      {
        key: "c",
        body_md: "Usar `GROUP BY account_id`.",
        is_correct: false,
        why_incorrect_md: "Cambiaría el resultado: colapsaría las filas.",
      },
    ],
    explanation_md:
      "`WINDOW` nombra la ventana una sola vez; cualquier cambio se aplica a todas las columnas.",
    is_published: true,
  },
  {
    slug: "win-q10-count-partition",
    section,
    lesson: marcos,
    type: "query_interpretation",
    difficulty: "intermediate",
    topic: "Lectura de consultas",
    tags: ["window_function"],
    estimated_seconds: 50,
    prompt_md:
      "Para una persona con 3 eventos KYC, ¿qué muestra `intentos` en cada una de sus filas?",
    code_md:
      "```sql\nSELECT user_id, event_at, outcome,\n       count(*) OVER (PARTITION BY user_id) AS intentos\nFROM kyc_events;\n```",
    options: [
      { key: "a", body_md: "3 en las tres filas.", is_correct: true },
      {
        key: "b",
        body_md: "1, 2 y 3.",
        is_correct: false,
        why_incorrect_md: "Eso requeriría `ORDER BY event_at` en la ventana (acumulado).",
      },
      {
        key: "c",
        body_md: "El total de eventos de la tabla.",
        is_correct: false,
        why_incorrect_md: "`PARTITION BY user_id` limita la cuenta a esa persona.",
      },
    ],
    explanation_md:
      "Sin `ORDER BY`, la ventana es la partición completa: el total de la persona se repite en cada una de sus filas.",
    is_published: true,
  },
];
