import {
  defaultHintMeta,
  defaultReward,
  defaultSolutionUnlock,
  type ExerciseDef,
} from "../schemas/exercise";

const section = "operadores-comparacion-logicos";
const dataset = { slug: "tiendaviva", version: 1 };
const theory_ref = "operadores-precedencia-in-between";

export const exercises: ExerciseDef[] = [
  {
    slug: "pedidos-problematicos-del-partner",
    section,
    title: "Pedidos problemáticos del partner",
    difficulty: "easy",
    estimated_minutes: 5,
    concepts: ["select", "where"],
    dataset,
    tables_used: ["orders"],
    scenario_md:
      "**TiendaViva** vende también a través de un marketplace asociado (`channel = 'marketplace_partner'`). Operaciones quiere revisar los pedidos de ese canal que terminaron cancelados o devueltos.",
    business_question_md:
      "Devuelve `id`, `status` y `channel` de los pedidos cuyo `status` es `'cancelled'` **o** `'returned'` **y** cuyo `channel` es `'marketplace_partner'`. El orden no importa.",
    learning_objective:
      "Combinar IN (o un OR entre paréntesis) con AND sin errores de precedencia.",
    theory_ref,
    expected_columns: [
      { name: "id", type: "integer" },
      { name: "status", type: "text" },
      { name: "channel", type: "text" },
    ],
    validation_rules: { required_concepts: ["where"] },
    reference_solution:
      "SELECT id, status, channel\nFROM orders\nWHERE status IN ('cancelled', 'returned')\n  AND channel = 'marketplace_partner';",
    alternative_solutions: [
      {
        label: "OR con paréntesis",
        sql: "SELECT id, status, channel FROM orders WHERE (status = 'cancelled' OR status = 'returned') AND channel = 'marketplace_partner';",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Hay una condición de «uno de dos estados» y otra de canal. `IN` expresa la primera sin ambigüedad.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Si usas `OR`, enciérralo entre paréntesis antes del `AND`; si no, el `AND` solo se aplica a la segunda igualdad.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT id, status, channel\nFROM orders\nWHERE status IN ('___', '___')\n  AND channel = '___';\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "row_count",
        description_md:
          "`status = 'cancelled' OR status = 'returned' AND channel = ...` sin paréntesis: devuelve más de 2000 filas.",
      },
      {
        category: "missing_filter",
        description_md: "Olvidar la condición de canal.",
      },
      {
        category: "syntax",
        description_md:
          "Escribir `IN 'cancelled', 'returned'` sin paréntesis alrededor de la lista.",
      },
    ],
    expert_explanation_md:
      "227 pedidos. `IN` evita el problema de precedencia; con `OR` sin paréntesis obtendrías 2393 filas (todos los cancelados de cualquier canal más los devueltos del partner) y ningún error que te avise.\n\nCuando un número te sorprende, ejecuta cada condición por separado y compara.",
    reward: defaultReward("easy"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "cuotas-largas-rechazadas",
    section,
    title: "Cuotas largas rechazadas",
    difficulty: "easy",
    estimated_minutes: 5,
    concepts: ["select", "where", "order_by"],
    dataset,
    tables_used: ["payments"],
    scenario_md:
      "Riesgo sospecha que los pagos en muchas cuotas se rechazan más. Quiere ver los pagos rechazados de 6 cuotas o más.",
    business_question_md:
      "Devuelve `id`, `order_id`, `installments` y `amount` de los pagos con `installments` **entre 6 y 12 inclusive** y `status` igual a `'rejected'`, ordenados por `amount` de mayor a menor.",
    learning_objective:
      "Usar BETWEEN para rangos numéricos inclusivos combinado con otra condición.",
    theory_ref,
    expected_columns: [
      { name: "id", type: "integer" },
      { name: "order_id", type: "integer" },
      { name: "installments", type: "integer" },
      { name: "amount", type: "numeric" },
    ],
    validation_rules: { order_matters: true, required_concepts: ["where", "order_by"] },
    reference_solution:
      "SELECT id, order_id, installments, amount\nFROM payments\nWHERE installments BETWEEN 6 AND 12\n  AND status = 'rejected'\nORDER BY amount DESC;",
    alternative_solutions: [
      {
        label: "Comparaciones explícitas",
        sql: "SELECT id, order_id, installments, amount FROM payments WHERE installments >= 6 AND installments <= 12 AND status = 'rejected' ORDER BY amount DESC;",
      },
      {
        label: "Lista de valores",
        sql: "SELECT id, order_id, installments, amount FROM payments WHERE installments IN (6, 12) AND status = 'rejected' ORDER BY amount DESC;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md: "«Entre 6 y 12 inclusive» es exactamente lo que expresa `BETWEEN`.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Combina `installments BETWEEN 6 AND 12` con `status = 'rejected'` usando `AND`, y ordena por `amount DESC`.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT id, order_id, installments, amount\nFROM payments\nWHERE installments BETWEEN ___ AND ___\n  AND status = '___'\nORDER BY amount ___;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "row_count",
        description_md: "`installments > 6` excluye los pagos de exactamente 6 cuotas.",
      },
      {
        category: "wrong_order",
        description_md: "Ordenar ascendente o por `installments`.",
      },
      {
        category: "missing_filter",
        description_md: "Omitir `status = 'rejected'` y devolver también aprobados y reembolsados.",
      },
    ],
    expert_explanation_md:
      "296 pagos. En este dataset las cuotas solo toman los valores 1, 3, 6 y 12, por eso `IN (6, 12)` da el mismo resultado; `BETWEEN` es la forma correcta cuando el rango puede contener cualquier valor intermedio.\n\nLa tasa de rechazo por cuotas es un análisis típico de Riesgo; lo completarás con agregaciones en la sección 14.",
    reward: defaultReward("easy"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "campana-rio-de-la-plata",
    section,
    title: "Campaña Río de la Plata",
    difficulty: "intermediate",
    estimated_minutes: 7,
    concepts: ["select", "where"],
    dataset,
    tables_used: ["customers"],
    scenario_md:
      "Marketing lanza una campaña para Argentina y Uruguay. Por normativa solo puede contactar a quienes aceptaron comunicaciones (`marketing_opt_in`).",
    business_question_md:
      "Devuelve `id`, `full_name` y `country` de los clientes de `'AR'` **o** `'UY'` que tengan `marketing_opt_in` verdadero. El orden no importa.",
    learning_objective: "Escribir correctamente una condición OR combinada con AND.",
    theory_ref,
    expected_columns: [
      { name: "id", type: "integer" },
      { name: "full_name", type: "text" },
      { name: "country", type: "text" },
    ],
    validation_rules: { required_concepts: ["where"] },
    reference_solution:
      "SELECT id, full_name, country\nFROM customers\nWHERE country IN ('AR', 'UY')\n  AND marketing_opt_in;",
    alternative_solutions: [
      {
        label: "OR con paréntesis",
        sql: "SELECT id, full_name, country FROM customers WHERE (country = 'AR' OR country = 'UY') AND marketing_opt_in = TRUE;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "La condición de país tiene dos valores posibles; la de marketing debe cumplirse siempre. Piensa en cómo agruparlas.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md: "`country IN ('AR', 'UY')` resuelve el «o». Luego `AND marketing_opt_in`.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT id, full_name, country\nFROM customers\nWHERE country IN ('___', '___')\n  AND ___;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "row_count",
        description_md:
          "`country = 'AR' OR country = 'UY' AND marketing_opt_in` sin paréntesis: incluye a todos los argentinos, con o sin consentimiento (952 filas).",
      },
      {
        category: "row_count",
        description_md:
          "Usar `AND` entre los países: ningún cliente tiene dos países, devuelve 0 filas.",
      },
      {
        category: "missing_filter",
        description_md:
          "Olvidar `marketing_opt_in`: contactar sin consentimiento es un problema legal, no solo un error de SQL.",
      },
    ],
    expert_explanation_md:
      "561 clientes. Sin paréntesis (o sin `IN`) obtendrías 952: la campaña llegaría a ~390 personas que no dieron consentimiento.\n\nEste es el ejemplo clásico de por qué la precedencia importa: el error no rompe la consulta, rompe la confianza en el reporte.",
    reward: defaultReward("intermediate"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
];
