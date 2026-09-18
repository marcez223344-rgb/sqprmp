import {
  defaultHintMeta,
  defaultReward,
  defaultSolutionUnlock,
  type ExerciseDef,
} from "../schemas/exercise";

const section = "left-right-full-join";
const pidelo = { slug: "pidelo", version: 1 };
const bolsillo = { slug: "bolsillo", version: 1 };
const left = "left-join-basico";
const full = "right-full-join-y-cardinalidad";

export const exercises: ExerciseDef[] = [
  {
    slug: "clientes-de-montevideo-sin-pedidos",
    section,
    title: "Clientes de Montevideo sin pedidos",
    difficulty: "easy",
    estimated_minutes: 6,
    concepts: ["outer_join", "null_handling", "where"],
    dataset: pidelo,
    tables_used: ["customers", "orders"],
    scenario_md:
      "**Pídelo** lanza una campaña de reactivación en Montevideo (`city_id = 8`) para quienes se registraron pero nunca pidieron.",
    business_question_md:
      "Devuelve `id` y `full_name` de los clientes con `city_id` igual a 8 que **no tienen ningún pedido** en `orders`. El orden no importa.",
    learning_objective:
      "Aplicar el patrón LEFT JOIN + IS NULL para encontrar filas sin correspondencia.",
    theory_ref: left,
    expected_columns: [
      { name: "id", type: "integer" },
      { name: "full_name", type: "text" },
    ],
    validation_rules: { required_concepts: ["outer_join", "null_handling"] },
    reference_solution:
      "SELECT c.id, c.full_name\nFROM customers AS c\nLEFT JOIN orders AS o ON o.customer_id = c.id\nWHERE c.city_id = 8\n  AND o.id IS NULL;",
    hints: [
      {
        level: 1,
        body_md:
          "Un LEFT JOIN desde `customers` conserva a todos los clientes; los que no tienen pedidos quedan con las columnas de `orders` en NULL.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Filtra `o.id IS NULL`. La condición de ciudad es sobre la tabla izquierda: puede ir en `WHERE`.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT c.id, c.full_name\nFROM customers AS c\nLEFT JOIN orders AS o ON o.customer_id = c.id\nWHERE c.city_id = ___\n  AND o.___ IS NULL;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "join_condition",
        description_md:
          "Usar INNER JOIN: los clientes sin pedidos desaparecen y el resultado queda vacío.",
      },
      {
        category: "null_handling",
        description_md:
          "Filtrar `o.customer_id IS NULL` funciona, pero probar la clave primaria `o.id` es la convención más segura.",
      },
      {
        category: "duplicates",
        description_md: "Olvidar el `IS NULL` y devolver una fila por pedido de cada cliente.",
      },
    ],
    expert_explanation_md:
      "8 clientes. El LEFT JOIN produce una fila por pedido para quienes pidieron, y una fila con NULL para quienes no; el filtro se queda con estas últimas.\n\nLa alternativa `WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id)` (sección 21) expresa lo mismo sin producir filas intermedias y suele ser más clara en consultas grandes.",
    reward: defaultReward("easy"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "usos-por-promocion",
    section,
    title: "Usos por promoción, con ceros",
    difficulty: "easy",
    estimated_minutes: 6,
    concepts: ["outer_join", "group_by", "aggregate", "order_by"],
    dataset: pidelo,
    tables_used: ["promotions", "orders"],
    scenario_md:
      "Marketing quiere el uso de **todas** las promociones, incluidas las que nadie usó (deben aparecer con 0).",
    business_question_md:
      "Devuelve `code` de cada promoción y la cantidad de pedidos que la usaron como `usos` (0 si ninguno), ordenado por `usos` descendente y luego por `code`.",
    learning_objective: "Contar con LEFT JOIN usando count(columna) para obtener ceros.",
    theory_ref: left,
    expected_columns: [
      { name: "code", type: "text" },
      { name: "usos", type: "integer" },
    ],
    validation_rules: { order_matters: true, required_concepts: ["outer_join", "group_by"] },
    reference_solution:
      "SELECT p.code, count(o.id) AS usos\nFROM promotions AS p\nLEFT JOIN orders AS o ON o.promotion_id = p.id\nGROUP BY p.code\nORDER BY usos DESC, p.code;",
    hints: [
      {
        level: 1,
        body_md:
          "Empieza por `promotions` (la tabla que debe aparecer completa) y une los pedidos con LEFT JOIN.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Cuenta una columna de `orders` (`count(o.id)`), no `count(*)`, para que las promociones sin uso den 0.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT p.code, count(___) AS usos\nFROM promotions AS p\nLEFT JOIN orders AS o ON o.promotion_id = p.id\nGROUP BY p.code\nORDER BY usos DESC, p.code;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "cell_values",
        description_md: "`count(*)` devuelve 1 para una promoción sin pedidos.",
      },
      {
        category: "join_condition",
        description_md: "INNER JOIN omite las promociones sin uso.",
      },
      {
        category: "wrong_order",
        description_md: "Sin el desempate por `code`.",
      },
    ],
    expert_explanation_md:
      "Seis promociones, todas con algún uso en este dataset, así que `count(o.id)` y `count(*)` coinciden hoy. La diferencia aparecería con la próxima promoción recién creada: por eso el patrón correcto es `count(columna_derecha)` aunque hoy no cambie nada.\n\nEscribir consultas que siguen siendo correctas cuando cambian los datos es parte del oficio.",
    reward: defaultReward("easy"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "entregados-sin-calificar-agosto",
    section,
    title: "Entregados sin calificar en agosto",
    difficulty: "intermediate",
    estimated_minutes: 7,
    concepts: ["outer_join", "null_handling", "where", "date_functions"],
    dataset: pidelo,
    tables_used: ["orders", "ratings"],
    scenario_md:
      "Producto va a enviar un recordatorio de calificación a quienes recibieron su pedido en agosto de 2025 y no calificaron.",
    business_question_md:
      "Devuelve `id` y `customer_id` de los pedidos con `status = 'delivered'`, `placed_at` en agosto de 2025 (del 1 al 31 inclusive) y **sin** fila en `ratings`. El orden no importa.",
    learning_objective:
      "Combinar filtros sobre la tabla izquierda con la prueba de NULL sobre la derecha.",
    theory_ref: left,
    expected_columns: [
      { name: "id", type: "integer" },
      { name: "customer_id", type: "integer" },
    ],
    validation_rules: { required_concepts: ["outer_join", "null_handling", "where"] },
    reference_solution:
      "SELECT o.id, o.customer_id\nFROM orders AS o\nLEFT JOIN ratings AS r ON r.order_id = o.id\nWHERE o.status = 'delivered'\n  AND o.placed_at >= '2025-08-01'\n  AND o.placed_at < '2025-09-01'\n  AND r.id IS NULL;",
    hints: [
      {
        level: 1,
        body_md:
          "Tres condiciones sobre `orders` (izquierda) y una prueba de NULL sobre `ratings` (derecha).",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Agosto completo es `>= '2025-08-01' AND < '2025-09-01'`. La prueba de ausencia es `r.id IS NULL`.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT o.id, o.customer_id\nFROM orders AS o\nLEFT JOIN ratings AS r ON r.order_id = o.id\nWHERE o.status = 'delivered'\n  AND o.placed_at >= '2025-08-01'\n  AND o.placed_at < '___'\n  AND r.___ IS NULL;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "date_boundary",
        description_md: "`placed_at <= '2025-08-31'` deja afuera casi todo el 31.",
      },
      {
        category: "null_handling",
        description_md:
          "Probar `r.restaurant_rating IS NULL`: también coincide con calificaciones parciales que sí existen.",
      },
      {
        category: "missing_filter",
        description_md:
          "Olvidar `status = 'delivered'` e incluir cancelados (que nunca se califican).",
      },
    ],
    expert_explanation_md:
      "526 pedidos. Nota la diferencia entre «no existe calificación» (`r.id IS NULL`) y «la calificación existe pero le falta un puntaje» (`r.restaurant_rating IS NULL` con `r.id` presente): son dos preguntas distintas y `ratings` contiene ambas situaciones.\n\nLas condiciones sobre `orders` pueden ir en `WHERE` porque es la tabla izquierda; si hubieras querido filtrar `ratings` por fecha, tendría que ir en el `ON`.",
    reward: defaultReward("intermediate"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "personas-sin-tarjeta-uruguay",
    section,
    title: "Personas sin tarjeta en Uruguay",
    difficulty: "intermediate",
    estimated_minutes: 6,
    concepts: ["outer_join", "null_handling", "where"],
    dataset: bolsillo,
    tables_used: ["users", "cards"],
    scenario_md:
      "En **Bolsillo**, la billetera digital, el equipo de Uruguay quiere ofrecer la tarjeta virtual a quienes todavía no tienen ninguna tarjeta emitida.",
    business_question_md:
      "Devuelve `id`, `full_name` y `kyc_level` de las personas con `country = 'UY'` que **no tienen** filas en `cards`. El orden no importa.",
    learning_objective:
      "Reutilizar el patrón sin correspondencia en otro dominio y leer el resultado con criterio de negocio.",
    theory_ref: full,
    expected_columns: [
      { name: "id", type: "integer" },
      { name: "full_name", type: "text" },
      { name: "kyc_level", type: "integer" },
    ],
    validation_rules: { required_concepts: ["outer_join", "null_handling"] },
    reference_solution:
      "SELECT u.id, u.full_name, u.kyc_level\nFROM users AS u\nLEFT JOIN cards AS c ON c.user_id = u.id\nWHERE u.country = 'UY'\n  AND c.id IS NULL;",
    hints: [
      {
        level: 1,
        body_md:
          "Mismo patrón que con clientes sin pedidos: LEFT JOIN desde `users` y prueba de NULL sobre `cards`.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md: "La clave foránea es `cards.user_id`. Filtra el país sobre `users`.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT u.id, u.full_name, u.kyc_level\nFROM users AS u\nLEFT JOIN cards AS c ON c.___ = u.id\nWHERE u.country = 'UY'\n  AND c.id IS NULL;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "join_condition",
        description_md: "`ON c.id = u.id`: une por ids sin relación.",
      },
      {
        category: "duplicates",
        description_md:
          "Sin `c.id IS NULL`, las personas con dos tarjetas aparecen dos veces y las sin tarjeta también aparecen.",
      },
      {
        category: "missing_filter",
        description_md: "Filtrar `c.country` (no existe) en vez de `u.country`.",
      },
    ],
    expert_explanation_md:
      "59 personas. Mira la columna `kyc_level`: en Bolsillo las tarjetas requieren nivel 1 o más, así que parte de esta lista no puede recibir la oferta todavía. Un LEFT JOIN te da los candidatos; la regla de negocio decide a quiénes contactar.\n\nEse es un hábito clave: después de obtener «los que no tienen X», pregúntate por qué no lo tienen.",
    reward: defaultReward("intermediate"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "desafio-restaurantes-de-montevideo-en-agosto",
    section,
    title: "Desafío: restaurantes de Montevideo en agosto",
    difficulty: "intermediate",
    estimated_minutes: 9,
    concepts: ["outer_join", "group_by", "aggregate", "where", "order_by"],
    dataset: pidelo,
    tables_used: ["restaurants", "orders"],
    scenario_md:
      "Operaciones de Montevideo (`city_id = 8`) quiere ver **los 25 restaurantes** de la ciudad con su cantidad de pedidos de agosto de 2025, incluidos los que tuvieron cero.",
    business_question_md:
      "Devuelve `id` y `name` del restaurante y la cantidad de pedidos con `placed_at` en agosto de 2025 como `pedidos_agosto` (0 si no tuvo), para todos los restaurantes con `city_id = 8`, ordenado por `pedidos_agosto` descendente y luego por `id`.",
    learning_objective:
      "Colocar las condiciones de la tabla derecha en el ON para no perder filas sin correspondencia.",
    theory_ref: left,
    expected_columns: [
      { name: "id", type: "integer" },
      { name: "name", type: "text" },
      { name: "pedidos_agosto", type: "integer" },
    ],
    validation_rules: { order_matters: true, required_concepts: ["outer_join", "group_by"] },
    reference_solution:
      "SELECT r.id, r.name, count(o.id) AS pedidos_agosto\nFROM restaurants AS r\nLEFT JOIN orders AS o\n  ON o.restaurant_id = r.id\n AND o.placed_at >= '2025-08-01'\n AND o.placed_at < '2025-09-01'\nWHERE r.city_id = 8\nGROUP BY r.id, r.name\nORDER BY pedidos_agosto DESC, r.id;",
    hints: [
      {
        level: 1,
        body_md:
          "Si filtras la fecha en `WHERE`, los restaurantes sin pedidos de agosto desaparecen. ¿Dónde más puede ir esa condición?",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Pon el rango de fechas en el `ON` del LEFT JOIN, junto a la igualdad de claves. La ciudad sí puede ir en `WHERE`.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT r.id, r.name, count(o.id) AS pedidos_agosto\nFROM restaurants AS r\nLEFT JOIN orders AS o\n  ON o.restaurant_id = r.id\n AND o.placed_at >= '___'\n AND o.placed_at < '___'\nWHERE r.city_id = 8\nGROUP BY r.id, r.name\nORDER BY pedidos_agosto DESC, r.id;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "join_condition",
        description_md: "Rango de fechas en `WHERE`: devuelve 22 restaurantes en lugar de 25.",
      },
      {
        category: "cell_values",
        description_md: "`count(*)`: los tres restaurantes sin pedidos muestran 1.",
      },
      {
        category: "syntax",
        description_md:
          "Agrupar solo por `r.id` y seleccionar `r.name`: PostgreSQL lo acepta porque `id` es clave primaria, pero otros motores no; incluir ambas es más portable.",
      },
    ],
    expert_explanation_md:
      "25 filas; tres restaurantes cierran la lista con 0. Con la fecha en `WHERE` obtendrías 22 filas y nadie notaría que faltan tres, porque la consulta no falla.\n\nRegla para recordar: en un LEFT JOIN, las condiciones sobre la tabla derecha van en el `ON`; las de la izquierda, en `WHERE`. Verifica siempre que el número de filas coincida con el de la tabla izquierda filtrada.",
    reward: defaultReward("intermediate"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
];
