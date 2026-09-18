import type { QuestionDef } from "../schemas/question";

const section = "funciones-de-agregacion";
const lesson = "agregacion-count-sum-avg";

export const questions: QuestionDef[] = [
  {
    slug: "agg-q01-count-formas",
    section,
    lesson,
    type: "single",
    difficulty: "easy",
    topic: "Formas de COUNT",
    tags: ["aggregate", "null_handling"],
    estimated_seconds: 45,
    prompt_md:
      "`ratings` tiene 7353 filas; 777 tienen `restaurant_rating` NULL. ¿Qué devuelve `count(restaurant_rating)`?",
    options: [
      { key: "a", body_md: "6576", is_correct: true },
      {
        key: "b",
        body_md: "7353",
        is_correct: false,
        why_incorrect_md: "Eso devuelve `count(*)`; `count(columna)` omite los NULL.",
      },
      {
        key: "c",
        body_md: "777",
        is_correct: false,
        why_incorrect_md: "Ese es el número de NULL, justamente lo que no se cuenta.",
      },
    ],
    explanation_md: "`count(columna)` cuenta valores no nulos: 7353 − 777 = 6576.",
    is_published: true,
  },
  {
    slug: "agg-q02-avg-null",
    section,
    lesson,
    type: "true_false",
    difficulty: "easy",
    topic: "NULL en agregaciones",
    tags: ["aggregate", "null_handling"],
    estimated_seconds: 30,
    prompt_md: "Verdadero o falso: `avg(courier_rating)` trata los NULL como 0.",
    options: [
      {
        key: "a",
        body_md: "Verdadero",
        is_correct: false,
        why_incorrect_md:
          "Las funciones de agregación ignoran los NULL: no entran ni en la suma ni en el divisor.",
      },
      { key: "b", body_md: "Falso", is_correct: true },
    ],
    explanation_md:
      "`avg` promedia solo los valores presentes. Para tratarlos como 0 habría que usar `COALESCE` explícitamente.",
    is_published: true,
  },
  {
    slug: "agg-q03-una-fila",
    section,
    lesson,
    type: "single",
    difficulty: "very_easy",
    topic: "Forma del resultado",
    tags: ["aggregate"],
    estimated_seconds: 30,
    prompt_md:
      "¿Cuántas filas devuelve `SELECT count(*), max(total) FROM orders WHERE status = 'cancelled';`?",
    options: [
      { key: "a", body_md: "Exactamente 1.", is_correct: true },
      {
        key: "b",
        body_md: "Una por pedido cancelado.",
        is_correct: false,
        why_incorrect_md:
          "Sin `GROUP BY`, todos los pedidos filtrados se resumen en una única fila.",
      },
      {
        key: "c",
        body_md: "0 si no hay cancelados.",
        is_correct: false,
        why_incorrect_md:
          "Aun sin filas, la agregación devuelve una fila (`count` = 0, `max` = NULL).",
      },
    ],
    explanation_md: "Una agregación sin `GROUP BY` siempre produce una fila.",
    is_published: true,
  },
  {
    slug: "agg-q04-error-mezcla",
    section,
    lesson,
    type: "error_diagnosis",
    difficulty: "easy",
    topic: "Columnas sin agregar",
    tags: ["aggregate", "group_by"],
    estimated_seconds: 45,
    prompt_md:
      'La consulta falla con `column "orders.customer_id" must appear in the GROUP BY clause or be used in an aggregate function`. ¿Por qué?',
    code_md: "```sql\nSELECT customer_id, count(*)\nFROM orders;\n```",
    options: [
      {
        key: "a",
        body_md:
          "`customer_id` tiene un valor por fila y `count(*)` uno por tabla; SQL no sabe cuál `customer_id` mostrar.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Falta un alias para `count(*)`.",
        is_correct: false,
        why_incorrect_md: "El alias es opcional; el problema es mezclar niveles de detalle.",
      },
      {
        key: "c",
        body_md: "`count(*)` debe ir primero.",
        is_correct: false,
        why_incorrect_md: "El orden de las columnas no importa.",
      },
    ],
    explanation_md:
      "O agrupas por `customer_id` (sección 15) o quitas la columna. Es la regla central de las agregaciones.",
    is_published: true,
  },
  {
    slug: "agg-q05-sum-vacio",
    section,
    lesson,
    type: "single",
    difficulty: "intermediate",
    topic: "Resultados vacíos",
    tags: ["aggregate", "null_handling"],
    estimated_seconds: 40,
    prompt_md:
      "Si ningún pedido cumple el `WHERE`, ¿qué devuelve `SELECT sum(total), count(*) FROM orders WHERE ...;`?",
    options: [
      { key: "a", body_md: "`NULL` y `0`.", is_correct: true },
      {
        key: "b",
        body_md: "`0` y `0`.",
        is_correct: false,
        why_incorrect_md:
          "`sum` sin filas devuelve NULL, no 0. Usa `COALESCE(sum(total), 0)` si necesitas 0.",
      },
      {
        key: "c",
        body_md: "Ninguna fila.",
        is_correct: false,
        why_incorrect_md: "La agregación devuelve una fila igual.",
      },
    ],
    explanation_md: "`count` es la única agregación que nunca devuelve NULL.",
    is_published: true,
  },
  {
    slug: "agg-q06-monedas",
    section,
    lesson,
    type: "scenario",
    difficulty: "intermediate",
    topic: "Promedios engañosos",
    tags: ["aggregate", "readability"],
    estimated_seconds: 50,
    prompt_md:
      "Te piden el «ticket promedio de Pídelo». Los pedidos están en la moneda de cada ciudad. ¿Qué respondes?",
    options: [
      {
        key: "a",
        body_md:
          "Calculo el promedio por ciudad (o por moneda); un promedio global mezclaría monedas sin sentido.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "`avg(total)` sobre toda la tabla; el promedio compensa.",
        is_correct: false,
        why_incorrect_md: "Sumar pesos colombianos con soles produce un número sin significado.",
      },
      {
        key: "c",
        body_md: "Uso `max(total)` que no depende de la moneda.",
        is_correct: false,
        why_incorrect_md: "El máximo también está en una moneda concreta; no responde la pregunta.",
      },
    ],
    explanation_md:
      "Antes de agregar, verifica que las unidades sean comparables. Es la fuente más común de indicadores erróneos.",
    is_published: true,
  },
  {
    slug: "agg-q07-distinct",
    section,
    lesson,
    type: "fill_blank",
    difficulty: "easy",
    topic: "COUNT DISTINCT",
    tags: ["aggregate", "distinct"],
    estimated_seconds: 35,
    prompt_md:
      "Completa para contar cuántos clientes distintos hicieron pedidos: `SELECT count(___ customer_id) FROM orders;`",
    answer: { accepted: ["DISTINCT"], case_sensitive: false },
    explanation_md: "`count(DISTINCT columna)` cuenta valores únicos no nulos.",
    is_published: true,
  },
  {
    slug: "agg-q08-interpretar",
    section,
    lesson,
    type: "query_interpretation",
    difficulty: "intermediate",
    topic: "Lectura de consultas",
    tags: ["aggregate", "date_functions"],
    estimated_seconds: 55,
    prompt_md: "¿Qué mide la columna `real_promedio`?",
    code_md:
      "```sql\nSELECT round(avg(extract(epoch FROM (delivered_at - placed_at)) / 60), 1) AS real_promedio\nFROM orders\nWHERE status = 'delivered';\n```",
    options: [
      { key: "a", body_md: "Los minutos promedio entre el pedido y la entrega.", is_correct: true },
      {
        key: "b",
        body_md: "Los segundos promedio de preparación.",
        is_correct: false,
        why_incorrect_md:
          "`/ 60` convierte segundos a minutos, y el intervalo va desde el pedido hasta la entrega.",
      },
      {
        key: "c",
        body_md: "La hora promedio a la que se entrega.",
        is_correct: false,
        why_incorrect_md: "Se promedia una duración (diferencia de timestamps), no un momento.",
      },
    ],
    explanation_md:
      "`extract(epoch FROM intervalo)` da segundos; dividir por 60 da minutos; `avg` promedia sobre los entregados.",
    is_published: true,
  },
  {
    slug: "agg-q09-min-max-texto",
    section,
    lesson,
    type: "true_false",
    difficulty: "easy",
    topic: "MIN y MAX",
    tags: ["aggregate"],
    estimated_seconds: 30,
    prompt_md: "Verdadero o falso: `min` y `max` funcionan también sobre textos y fechas.",
    options: [
      { key: "a", body_md: "Verdadero", is_correct: true },
      {
        key: "b",
        body_md: "Falso",
        is_correct: false,
        why_incorrect_md:
          "Cualquier tipo ordenable sirve: `min(placed_at)` es el primer pedido, `max(name)` el último nombre alfabéticamente.",
      },
    ],
    explanation_md:
      "`min`/`max` usan el orden del tipo: cronológico para fechas, alfabético para textos.",
    is_published: true,
  },
  {
    slug: "agg-q10-multiple",
    section,
    lesson,
    type: "multiple",
    difficulty: "intermediate",
    topic: "Reglas de agregación",
    tags: ["aggregate", "null_handling"],
    estimated_seconds: 60,
    prompt_md: "¿Cuáles afirmaciones son correctas? Selecciona todas las que apliquen.",
    options: [
      {
        key: "a",
        body_md: "`count(*)` incluye filas cuyas columnas son todas NULL.",
        is_correct: true,
      },
      { key: "b", body_md: "`sum` de una columna entera devuelve `bigint`.", is_correct: true },
      {
        key: "c",
        body_md: "`avg` devuelve 0 cuando todos los valores son NULL.",
        is_correct: false,
        why_incorrect_md: "Devuelve NULL.",
      },
      { key: "d", body_md: "`WHERE` se evalúa antes de agregar.", is_correct: true },
    ],
    explanation_md:
      "`count(*)` cuenta filas sin mirar valores; `sum` de enteros escala a `bigint`; `avg` sin valores es NULL; el filtro precede a la agregación.",
    is_published: true,
  },
];
