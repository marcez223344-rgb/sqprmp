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
      "**TiendaViva** vende también a través de un marketplace asociado, que en la tabla de pedidos queda identificado con `channel = 'marketplace_partner'`. El departamento de Operaciones quiere revisar los pedidos de ese canal que terminaron cancelados o devueltos y te pide el listado para llevarlo a la reunión con el socio.",
    business_question_md:
      "Debes generar un dataset que devuelva el `id`, el `status` y el `channel` de los pedidos cuyo `status` es `'cancelled'` **o** `'returned'` **y** cuyo `channel` es `'marketplace_partner'`. El orden de las filas no importa.",
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
          "Hay dos condiciones distintas: una dice que el estado puede ser uno de dos valores y la otra fija el canal. El operador `IN` expresa la primera sin ambigüedad.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Si prefieres usar `OR`, tienes que encerrarlo entre paréntesis antes del `AND`; de lo contrario, el `AND` se aplica solamente a la segunda igualdad y el resultado incluye filas de más.",
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
          "Escribir `status = 'cancelled' OR status = 'returned' AND channel = ...` sin paréntesis: el operador `AND` se evalúa antes que el `OR` y el resultado pasa a tener más de 2000 filas.",
      },
      {
        category: "missing_filter",
        description_md:
          "Olvidar la condición sobre el canal: el resultado incluye los pedidos cancelados y devueltos de todos los canales de venta.",
      },
      {
        category: "syntax",
        description_md:
          "Escribir `IN 'cancelled', 'returned'` sin los paréntesis que envuelven la lista de valores.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 227 pedidos. El operador `IN` evita el problema de precedencia; si escribes el `OR` sin paréntesis obtienes 2393 filas, que son todos los pedidos cancelados de cualquier canal más los pedidos devueltos del socio, y el motor no devuelve ningún error que te avise del cambio de significado.\n\nCuando un número te sorprenda, ejecuta cada condición por separado y compara los conteos: es la forma más rápida de ubicar en qué parte del filtro está el problema.",
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
      "El departamento de Riesgo sospecha que los pagos en muchas cuotas se rechazan con más frecuencia que los demás. Quiere ver los pagos rechazados de 6 cuotas o más y te pide ese listado para confirmar o descartar la sospecha.",
    business_question_md:
      "Debes generar un dataset que devuelva el `id`, el `order_id`, el `installments` y el `amount` de los pagos cuya cantidad de cuotas está **entre 6 y 12 inclusive** y cuyo `status` es igual al texto `'rejected'`, ordenados por `amount` de mayor a menor.",
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
        body_md:
          "La idea de «entre 6 y 12 inclusive» es exactamente lo que expresa el operador `BETWEEN`, que incluye los dos extremos del rango.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Combina la condición `installments BETWEEN 6 AND 12` con la condición `status = 'rejected'` usando `AND`, y ordena el resultado por `amount` en dirección descendente.",
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
        description_md:
          "Escribir `installments > 6`: la condición excluye los pagos de exactamente 6 cuotas, que la consigna pidió incluir.",
      },
      {
        category: "wrong_order",
        description_md:
          "Ordenar en forma ascendente, o ordenar por `installments` en lugar de por `amount`: el reporte deja de mostrar primero los importes más grandes, que son los que más preocupan a Riesgo.",
      },
      {
        category: "missing_filter",
        description_md:
          "Omitir la condición `status = 'rejected'`: el resultado incluye también los pagos aprobados y los reembolsados.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 296 pagos. En este dataset la columna `installments` solo toma los valores 1, 3, 6 y 12, y por eso la condición `IN (6, 12)` devuelve lo mismo; el operador `BETWEEN` es la forma correcta cuando el rango puede contener cualquier valor intermedio.\n\nLa tasa de rechazo según la cantidad de cuotas es un análisis típico del área de Riesgo; lo vas a completar con agregaciones en la sección 14.",
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
      "El departamento de Marketing está lanzando una campaña para Argentina y Uruguay. Por normativa de protección de datos solo puede contactar a quienes aceptaron recibir comunicaciones, que son los clientes con la columna `marketing_opt_in` en `true`. Te piden la lista de destinatarios válidos para poder enviar la campaña.",
    business_question_md:
      "Debes generar un dataset que devuelva el `id`, el `full_name` y el `country` de los clientes cuyo país es `'AR'` **o** `'UY'` y que además tengan la columna `marketing_opt_in` en `true`. El orden de las filas no importa.",
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
          "La condición de país admite dos valores posibles, mientras que la condición de consentimiento debe cumplirse siempre. Piensa en cómo agrupar las dos partes para que eso quede claro.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "La condición `country IN ('AR', 'UY')` resuelve el «o» de los dos países. Después agrega `AND marketing_opt_in`, que por ser una columna booleana ya vale `true` o `false` por sí sola.",
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
          "Escribir `country = 'AR' OR country = 'UY' AND marketing_opt_in` sin paréntesis: el resultado incluye a todos los clientes argentinos, hayan dado o no su consentimiento, y sube a 952 filas.",
      },
      {
        category: "row_count",
        description_md:
          "Unir los dos países con `AND`: ningún cliente tiene dos países a la vez, así que el resultado sale con 0 filas.",
      },
      {
        category: "missing_filter",
        description_md:
          "Olvidar la condición sobre `marketing_opt_in`: contactar a alguien sin su consentimiento es un problema legal, no solo un error de SQL.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 561 clientes. Sin los paréntesis, o sin usar el operador `IN`, obtendrías 952 filas y la campaña llegaría a unas 390 personas que no dieron su consentimiento.\n\nEste es el ejemplo clásico de por qué la precedencia de operadores importa: el error no rompe la consulta, rompe la confianza en el reporte, y en este caso también expone al negocio frente a la normativa.",
    reward: defaultReward("intermediate"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
];
