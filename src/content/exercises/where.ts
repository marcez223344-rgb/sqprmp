import {
  defaultHintMeta,
  defaultReward,
  defaultSolutionUnlock,
  type ExerciseDef,
} from "../schemas/exercise";

const section = "where";
const dataset = { slug: "tiendaviva", version: 1 };

export const exercises: ExerciseDef[] = [
  {
    slug: "clientes-de-uruguay",
    section,
    title: "Clientes de Uruguay",
    difficulty: "very_easy",
    estimated_minutes: 3,
    concepts: ["select", "where"],
    dataset,
    tables_used: ["customers"],
    scenario_md:
      "El equipo de **TiendaViva** abre un centro de distribución en Montevideo y quiere contactar a los clientes de Uruguay.",
    business_question_md:
      "Muestra `id`, `full_name` y `city` de los clientes cuyo país (`country`) es `'UY'`. El orden no importa.",
    learning_objective: "Filtrar filas por igualdad de texto con WHERE.",
    theory_ref: "where-filtros-basicos",
    expected_columns: [
      { name: "id", type: "integer" },
      { name: "full_name", type: "text" },
      { name: "city", type: "text" },
    ],
    validation_rules: { required_concepts: ["where"] },
    reference_solution: "SELECT id, full_name, city\nFROM customers\nWHERE country = 'UY';",
    hints: [
      {
        level: 1,
        body_md: "`WHERE` va después de `FROM` y contiene la condición que cada fila debe cumplir.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "El país es un texto: compáralo con `'UY'` entre comillas simples y en mayúsculas.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md: "```sql\nSELECT id, full_name, city\nFROM customers\nWHERE ___ = '___';\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "missing_filter",
        description_md: "Olvidar el `WHERE`: devuelve los 3000 clientes.",
      },
      {
        category: "syntax",
        description_md: "Escribir `country = UY` sin comillas o con comillas dobles.",
      },
      {
        category: "row_count",
        description_md:
          "Usar `'uy'` en minúsculas: la comparación distingue mayúsculas y devuelve 0 filas.",
      },
    ],
    expert_explanation_md:
      "123 clientes. La condición `country = 'UY'` se evalúa fila por fila y solo pasan las verdaderas.\n\nSi no estás seguro de cómo están escritos los valores, primero explora con `SELECT DISTINCT country FROM customers` (sección 5).",
    reward: defaultReward("very_easy"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "productos-agotados-activos",
    section,
    title: "Agotados pero publicados",
    difficulty: "easy",
    estimated_minutes: 5,
    concepts: ["select", "where"],
    dataset,
    tables_used: ["products"],
    scenario_md:
      "Un producto activo sin stock genera visitas que terminan en frustración. Catálogo quiere avisar a los vendedores.",
    business_question_md:
      "Devuelve `id`, `seller_id` y `name` de los productos con `stock` igual a 0 **y** `is_active` verdadero. El orden no importa.",
    learning_objective: "Combinar una condición numérica y una booleana con AND.",
    theory_ref: "where-filtros-basicos",
    expected_columns: [
      { name: "id", type: "integer" },
      { name: "seller_id", type: "integer" },
      { name: "name", type: "text" },
    ],
    validation_rules: { required_concepts: ["where"] },
    reference_solution:
      "SELECT id, seller_id, name\nFROM products\nWHERE stock = 0\n  AND is_active;",
    alternative_solutions: [
      {
        label: "Booleano explícito",
        sql: "SELECT id, seller_id, name FROM products WHERE stock = 0 AND is_active = TRUE;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md: "Son dos condiciones que deben cumplirse a la vez: únelas con `AND`.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "`stock = 0` es numérica (sin comillas). `is_active` es booleana: puedes escribirla sola o como `is_active = TRUE`.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT id, seller_id, name\nFROM products\nWHERE stock = ___\n  AND ___;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "row_count",
        description_md:
          "Usar `OR` en lugar de `AND`: devuelve todos los activos más todos los agotados.",
      },
      {
        category: "syntax",
        description_md:
          "Escribir `stock = '0'`: funciona por conversión implícita, pero los números no llevan comillas.",
      },
      {
        category: "missing_filter",
        description_md: "Filtrar solo por `stock = 0` e ignorar `is_active`.",
      },
    ],
    expert_explanation_md:
      "89 productos activos sin stock. `is_active` ya es una condición booleana; escribir `= TRUE` es opcional pero explícito.\n\nEn un marketplace real, esta lista alimentaría una alerta automática a cada vendedor: SQL suele ser el primer paso de un proceso operativo.",
    reward: defaultReward("easy"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "tiendas-bazar",
    section,
    title: "Las tiendas «Bazar»",
    difficulty: "easy",
    estimated_minutes: 5,
    concepts: ["select", "where", "order_by"],
    dataset,
    tables_used: ["sellers"],
    scenario_md:
      "Comercial arma un programa de fidelización para las tiendas cuyo nombre comienza con «Bazar», una familia de vendedores con estilo propio.",
    business_question_md:
      "Devuelve `id` y `store_name` de los vendedores cuyo nombre **empieza** con `Bazar`, ordenados por `id` ascendente.",
    learning_objective: "Filtrar texto por patrón con LIKE y el comodín %.",
    theory_ref: "where-texto-y-fechas",
    expected_columns: [
      { name: "id", type: "integer" },
      { name: "store_name", type: "text" },
    ],
    validation_rules: { order_matters: true, required_concepts: ["where", "order_by"] },
    reference_solution:
      "SELECT id, store_name\nFROM sellers\nWHERE store_name LIKE 'Bazar%'\nORDER BY id;",
    alternative_solutions: [
      {
        label: "Con ILIKE",
        sql: "SELECT id, store_name FROM sellers WHERE store_name ILIKE 'bazar%' ORDER BY id;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md: "«Empieza con» se expresa con `LIKE` y un patrón que termina en `%`.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "El patrón es `'Bazar%'` (con B mayúscula si usas `LIKE`). No olvides el `ORDER BY`.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT id, store_name\nFROM sellers\nWHERE store_name LIKE '___%'\nORDER BY ___;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "row_count",
        description_md:
          "Usar `'%Bazar%'`: aquí da lo mismo, pero en general incluye nombres que contienen la palabra en el medio.",
      },
      {
        category: "row_count",
        description_md:
          "Escribir `LIKE 'bazar%'` en minúsculas: `LIKE` distingue mayúsculas y devuelve 0 filas.",
      },
      {
        category: "wrong_order",
        description_md: "Omitir `ORDER BY id`.",
      },
    ],
    expert_explanation_md:
      "20 tiendas. `LIKE 'Bazar%'` compara desde el inicio del texto, lo que además permite usar índices; `'%Bazar%'` obliga a recorrer todas las filas.\n\n`ILIKE` es cómodo cuando los datos vienen con capitalización inconsistente, algo frecuente en campos cargados a mano.",
    reward: defaultReward("easy"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "pedidos-primera-quincena-marzo",
    section,
    title: "Primera quincena de marzo",
    difficulty: "intermediate",
    estimated_minutes: 8,
    concepts: ["select", "where", "date_functions"],
    dataset,
    tables_used: ["orders"],
    scenario_md:
      "Finanzas cierra la primera quincena de marzo de 2025 y necesita todos los pedidos creados entre el **1 y el 15 de marzo inclusive**, sin importar la hora. `created_at` es un `timestamptz`.",
    business_question_md:
      "Devuelve `id`, `created_at` y `total_amount` de los pedidos creados desde el 2025-03-01 hasta el 2025-03-15 **inclusive** (todo el día 15). El orden no importa.",
    learning_objective:
      "Filtrar rangos de fecha sobre timestamps sin perder los registros del último día.",
    theory_ref: "where-texto-y-fechas",
    expected_columns: [
      { name: "id", type: "integer" },
      { name: "created_at", type: "timestamp" },
      { name: "total_amount", type: "numeric" },
    ],
    validation_rules: { required_concepts: ["where"] },
    reference_solution:
      "SELECT id, created_at, total_amount\nFROM orders\nWHERE created_at >= '2025-03-01'\n  AND created_at < '2025-03-16';",
    alternative_solutions: [
      {
        label: "Convertir a fecha",
        sql: "SELECT id, created_at, total_amount FROM orders WHERE created_at::date BETWEEN '2025-03-01' AND '2025-03-15';",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "`created_at` incluye la hora. Compararlo con `'2025-03-15'` equivale a las 00:00 de ese día.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Usa un rango semiabierto: mayor o igual al 1 de marzo y **menor** que el 16 de marzo.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT id, created_at, total_amount\nFROM orders\nWHERE created_at >= '2025-03-01'\n  AND created_at < '___';\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "date_boundary",
        description_md:
          "`BETWEEN '2025-03-01' AND '2025-03-15'` deja afuera casi todo el día 15 (solo incluye las 00:00:00).",
      },
      {
        category: "date_boundary",
        description_md:
          "`created_at <= '2025-03-16'` incluye el instante exacto de las 00:00 del 16.",
      },
      {
        category: "date_boundary",
        description_md: "`created_at < '2025-03-15'` excluye el día 15 completo.",
      },
    ],
    expert_explanation_md:
      "510 pedidos. Con `BETWEEN` hasta el 15 obtendrías 479: los 31 pedidos del 15 de marzo con hora posterior a las 00:00 desaparecen sin ningún error.\n\nLa alternativa `created_at::date BETWEEN ...` es correcta y legible, pero al aplicar una conversión a la columna el índice de `created_at` no se usa. En tablas grandes prefiere el rango semiabierto.",
    reward: defaultReward("intermediate"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
];
