import type { QuestionDef } from "../schemas/question";

const section = "operadores-comparacion-logicos";
const lesson = "operadores-precedencia-in-between";

export const questions: QuestionDef[] = [
  {
    slug: "oper-q01-precedencia",
    section,
    lesson,
    type: "query_interpretation",
    difficulty: "intermediate",
    topic: "Precedencia",
    tags: ["where", "precedencia"],
    estimated_seconds: 60,
    prompt_md: "¿Qué clientes devuelve esta consulta?",
    code_md:
      "```sql\nSELECT id\nFROM customers\nWHERE country = 'AR' OR country = 'UY' AND marketing_opt_in;\n```",
    options: [
      {
        key: "a",
        body_md: "Todos los de Argentina, más los de Uruguay que aceptaron marketing.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Los de Argentina o Uruguay que aceptaron marketing.",
        is_correct: false,
        why_incorrect_md:
          "Eso requiere paréntesis: `(country = 'AR' OR country = 'UY') AND marketing_opt_in`.",
      },
      {
        key: "c",
        body_md: "Los de Argentina que aceptaron marketing, más todos los de Uruguay.",
        is_correct: false,
        why_incorrect_md: "`AND` se agrupa con la condición de Uruguay, no con la de Argentina.",
      },
    ],
    explanation_md:
      "`AND` tiene prioridad sobre `OR`: la condición se lee como `country = 'AR' OR (country = 'UY' AND marketing_opt_in)`.",
    is_published: true,
  },
  {
    slug: "oper-q02-in-equivalente",
    section,
    lesson,
    type: "single",
    difficulty: "easy",
    topic: "Operador IN",
    tags: ["where", "in"],
    estimated_seconds: 35,
    prompt_md: "¿A qué equivale `status IN ('paid', 'shipped')`?",
    options: [
      { key: "a", body_md: "`status = 'paid' OR status = 'shipped'`", is_correct: true },
      {
        key: "b",
        body_md: "`status = 'paid' AND status = 'shipped'`",
        is_correct: false,
        why_incorrect_md:
          "Una fila no puede tener dos estados a la vez; con `AND` no devolvería nada.",
      },
      {
        key: "c",
        body_md: "`status LIKE 'paid%shipped%'`",
        is_correct: false,
        why_incorrect_md: "`LIKE` compara patrones de texto; `IN` compara pertenencia a una lista.",
      },
    ],
    explanation_md: "`IN` es la forma compacta de varias igualdades unidas por `OR`.",
    is_published: true,
  },
  {
    slug: "oper-q03-between-inclusivo",
    section,
    lesson,
    type: "true_false",
    difficulty: "easy",
    topic: "BETWEEN",
    tags: ["where", "between"],
    estimated_seconds: 30,
    prompt_md:
      "Verdadero o falso: `stock BETWEEN 1 AND 5` incluye los productos con `stock` igual a 5.",
    options: [
      { key: "a", body_md: "Verdadero", is_correct: true },
      {
        key: "b",
        body_md: "Falso",
        is_correct: false,
        why_incorrect_md:
          "`BETWEEN` incluye ambos extremos: equivale a `stock >= 1 AND stock <= 5`.",
      },
    ],
    explanation_md: "`BETWEEN a AND b` es inclusivo en `a` y en `b`.",
    is_published: true,
  },
  {
    slug: "oper-q04-not-in",
    section,
    lesson,
    type: "fill_blank",
    difficulty: "easy",
    topic: "NOT",
    tags: ["where", "not"],
    estimated_seconds: 35,
    prompt_md:
      "Reescribe `NOT (channel IN ('app', 'web'))` en su forma más legible usando un solo operador de dos palabras. Escribe solo el operador.",
    answer: { accepted: ["NOT IN"], case_sensitive: false },
    explanation_md: "`channel NOT IN ('app', 'web')` es equivalente y se lee mejor.",
    is_published: true,
  },
  {
    slug: "oper-q05-de-morgan",
    section,
    lesson,
    type: "single",
    difficulty: "intermediate",
    topic: "NOT",
    tags: ["where", "not"],
    estimated_seconds: 50,
    prompt_md: "¿Cuál condición es equivalente a `NOT (is_active AND stock > 0)`?",
    options: [
      { key: "a", body_md: "`NOT is_active OR stock <= 0`", is_correct: true },
      {
        key: "b",
        body_md: "`NOT is_active AND stock <= 0`",
        is_correct: false,
        why_incorrect_md: "Al negar un `AND`, el conector se convierte en `OR` (ley de De Morgan).",
      },
      {
        key: "c",
        body_md: "`is_active OR stock > 0`",
        is_correct: false,
        why_incorrect_md: "Esa es la condición sin negar y con `OR`; no es equivalente.",
      },
    ],
    explanation_md:
      "`NOT (a AND b)` ≡ `NOT a OR NOT b`. La negación de `stock > 0` es `stock <= 0`.",
    is_published: true,
  },
  {
    slug: "oper-q06-legibilidad",
    section,
    lesson,
    type: "scenario",
    difficulty: "easy",
    topic: "Legibilidad",
    tags: ["where", "readability"],
    estimated_seconds: 40,
    prompt_md:
      "Necesitas los pedidos con estado `cancelled`, `returned` o `pending`. ¿Cuál forma conviene?",
    options: [
      { key: "a", body_md: "`status IN ('cancelled', 'returned', 'pending')`", is_correct: true },
      {
        key: "b",
        body_md: "`status = 'cancelled' OR status = 'returned' OR status = 'pending'`",
        is_correct: false,
        why_incorrect_md:
          "Es equivalente, pero más larga y propensa a errores de precedencia si se combina con `AND`.",
      },
      {
        key: "c",
        body_md: "`status LIKE '%e%'`",
        is_correct: false,
        why_incorrect_md:
          "Coincide con otros estados (`delivered`, `shipped`) y no expresa la intención.",
      },
    ],
    explanation_md: "`IN` expresa la lista de valores de forma directa y segura.",
    is_published: true,
  },
  {
    slug: "oper-q07-diagnostico",
    section,
    lesson,
    type: "error_diagnosis",
    difficulty: "intermediate",
    topic: "Diagnóstico de filtros",
    tags: ["where", "precedencia"],
    estimated_seconds: 60,
    prompt_md:
      "Se esperaban ~230 pedidos cancelados o devueltos del canal `marketplace_partner`, pero la consulta devuelve más de 2000. ¿Cuál es la causa?",
    code_md:
      "```sql\nSELECT id\nFROM orders\nWHERE status = 'cancelled' OR status = 'returned'\n  AND channel = 'marketplace_partner';\n```",
    options: [
      {
        key: "a",
        body_md:
          "Sin paréntesis, `AND` se aplica solo a `returned`; todos los cancelados entran sin filtrar por canal.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "`marketplace_partner` debería ir sin comillas.",
        is_correct: false,
        why_incorrect_md: "Es un texto; sin comillas daría error de columna inexistente.",
      },
      {
        key: "c",
        body_md: "Falta `DISTINCT`.",
        is_correct: false,
        why_incorrect_md:
          "No hay duplicados: cada pedido aparece una vez. El exceso viene de la lógica del filtro.",
      },
    ],
    explanation_md:
      "Corrige con `status IN ('cancelled', 'returned') AND channel = 'marketplace_partner'` o con paréntesis alrededor del `OR`.",
    is_published: true,
  },
  {
    slug: "oper-q08-multiple",
    section,
    lesson,
    type: "multiple",
    difficulty: "intermediate",
    topic: "Equivalencias",
    tags: ["where", "between", "in"],
    estimated_seconds: 60,
    prompt_md:
      "¿Cuáles condiciones son equivalentes a `installments >= 3 AND installments <= 6`? Selecciona todas las que apliquen.",
    options: [
      { key: "a", body_md: "`installments BETWEEN 3 AND 6`", is_correct: true },
      { key: "b", body_md: "`installments IN (3, 4, 5, 6)`", is_correct: true },
      {
        key: "c",
        body_md: "`installments > 3 AND installments < 6`",
        is_correct: false,
        why_incorrect_md: "Excluye 3 y 6.",
      },
      {
        key: "d",
        body_md: "`NOT (installments < 3 OR installments > 6)`",
        is_correct: true,
      },
    ],
    explanation_md:
      "Para enteros, `BETWEEN 3 AND 6`, la lista explícita y la negación del complemento describen el mismo conjunto {3, 4, 5, 6}.",
    is_published: true,
  },
  {
    slug: "oper-q09-between-invertido",
    section,
    lesson,
    type: "single",
    difficulty: "intermediate",
    topic: "BETWEEN con los extremos al revés",
    tags: ["where", "between"],
    estimated_seconds: 50,
    prompt_md:
      "Quieres los productos con `stock` entre 6 y 3 unidades y escribes `WHERE stock BETWEEN 6 AND 3`. La consulta corre sin error y devuelve 0 filas, aunque hay productos con 4 y 5 unidades. ¿Por qué?",
    options: [
      {
        key: "a",
        body_md:
          "`BETWEEN a AND b` significa `stock >= 6 AND stock <= 3`, y ningún número cumple las dos cosas. El orden de los extremos importa: primero el menor.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "PostgreSQL ordena los extremos automáticamente, así que el problema es otro.",
        is_correct: false,
        why_incorrect_md:
          "No los ordena. `BETWEEN` es una forma corta de escribir dos comparaciones, y las escribe en el orden en que las diste.",
      },
      {
        key: "c",
        body_md: "`BETWEEN` no funciona con enteros, solo con fechas y textos.",
        is_correct: false,
        why_incorrect_md:
          "Funciona con cualquier tipo que se pueda ordenar, incluidos los enteros. El resultado vacío viene del rango invertido.",
      },
      {
        key: "d",
        body_md: "Faltan paréntesis: `BETWEEN (6 AND 3)`.",
        is_correct: false,
        why_incorrect_md:
          "El `AND` de `BETWEEN` es parte del operador, no un `AND` lógico, y no lleva paréntesis. Agregarlos daría un error de sintaxis.",
      },
    ],
    explanation_md:
      "`BETWEEN` no valida que el rango tenga sentido: si el primer extremo es mayor que el segundo, devuelve un conjunto vacío sin avisar. Un resultado vacío que no esperabas siempre merece releer el filtro antes de concluir que no hay datos.",
    is_published: true,
  },
  {
    slug: "oper-q10-precedencia-de-not",
    section,
    lesson,
    type: "query_interpretation",
    difficulty: "intermediate",
    topic: "Precedencia de NOT",
    tags: ["where", "not", "precedencia"],
    estimated_seconds: 55,
    prompt_md: "¿Qué productos devuelve esta consulta?",
    code_md: "```sql\nSELECT id\nFROM products\nWHERE NOT is_active AND stock > 0;\n```",
    options: [
      {
        key: "a",
        body_md: "Los productos inactivos que además tienen stock.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Los productos que no cumplen las dos condiciones a la vez.",
        is_correct: false,
        why_incorrect_md:
          "Eso sería `NOT (is_active AND stock > 0)`, con paréntesis. Sin ellos, el `NOT` alcanza solo a la condición que tiene al lado.",
      },
      {
        key: "c",
        body_md: "Los productos inactivos y sin stock.",
        is_correct: false,
        why_incorrect_md:
          "El `NOT` no se reparte sobre las dos condiciones: `stock > 0` queda tal cual y exige que haya stock.",
      },
      {
        key: "d",
        body_md: "Ninguno: `NOT` no se puede aplicar a una columna booleana.",
        is_correct: false,
        why_incorrect_md:
          "Sí se puede: una columna `boolean` ya es una condición por sí sola, así que `NOT is_active` es válido y equivale a `is_active = false`.",
      },
    ],
    explanation_md:
      "El orden de precedencia es `NOT`, después `AND`, y por último `OR`. Como `NOT` es el que más aprieta, toma solo la condición inmediata. Cuando una condición mezcla los tres, los paréntesis dejan de ser opcionales: no cambian el significado, lo vuelven visible para quien lea la consulta después.",
    is_published: true,
  },
];
