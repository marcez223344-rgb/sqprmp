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
      "El departamento de Marketing de **Pídelo** está lanzando una campaña de reactivación en Montevideo, que en la tabla de clientes se identifica con `city_id = 8`, dirigida a quienes se registraron pero nunca hicieron un pedido. Te piden esa lista para preparar el envío.",
    business_question_md:
      "Debes generar un dataset que devuelva el `id` y el `full_name` de los clientes cuyo `city_id` es igual a `8` y que **no tienen ningún pedido** registrado en la tabla `orders`. El orden de las filas no importa.",
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
          "Un `LEFT JOIN` que arranca desde la tabla `customers` conserva a todos los clientes; los que no tienen pedidos quedan con todas las columnas de `orders` en `NULL`.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Filtra con la condición `o.id IS NULL` para quedarte con esas filas. La condición de ciudad es sobre la tabla izquierda, así que puede ir en la cláusula `WHERE` sin problemas.",
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
          "Usar `INNER JOIN` en lugar de `LEFT JOIN`: los clientes sin pedidos desaparecen del cruce y el resultado sale vacío.",
      },
      {
        category: "null_handling",
        description_md:
          "Filtrar con `o.customer_id IS NULL`: funciona, pero probar la clave primaria `o.id` es la convención más segura, porque esa columna nunca está en `NULL` en una fila real.",
      },
      {
        category: "duplicates",
        description_md:
          "Olvidar la condición `IS NULL`: el resultado devuelve una fila por cada pedido de cada cliente, en lugar de los clientes sin pedidos.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 8 clientes. El `LEFT JOIN` produce una fila por pedido para quienes sí pidieron, y una única fila con las columnas de `orders` en `NULL` para quienes no pidieron nunca; el filtro se queda solamente con estas últimas.\n\nLa alternativa `WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id)`, que vas a ver en la sección 21, expresa lo mismo sin generar filas intermedias y suele leerse mejor en consultas grandes.",
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
      "El departamento de Marketing quiere ver el uso de **todas** las promociones, incluidas aquellas que nadie usó, que deben aparecer con el valor `0` y no desaparecer del reporte. Te piden ese listado para evaluar qué promociones discontinuar.",
    business_question_md:
      "Debes generar un dataset que devuelva el `code` de cada promoción y la cantidad de pedidos que la usaron bajo el encabezado `usos`, con valor `0` cuando ningún pedido la usó, ordenado por `usos` descendente y, si dos promociones empatan, debes desempatar usando `code` ascendente.",
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
          "Empieza la consulta por la tabla `promotions`, que es la que debe aparecer completa en el resultado, y une los pedidos con un `LEFT JOIN`.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Cuenta una columna de la tabla `orders`, con `count(o.id)`, en lugar de usar `count(*)`: así las promociones sin ningún uso devuelven `0`.",
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
        description_md:
          "Usar `count(*)`: una promoción sin pedidos igual genera una fila en el cruce, así que la consulta informa 1 uso donde debería informar 0.",
      },
      {
        category: "join_condition",
        description_md:
          "Usar `INNER JOIN`: las promociones que nadie usó quedan fuera del reporte, que es justo lo que el negocio pidió ver.",
      },
      {
        category: "wrong_order",
        description_md:
          "Omitir el desempate por `code`: cuando dos promociones tienen la misma cantidad de usos, el orden entre ellas no está garantizado.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da seis promociones, y en este dataset todas tienen algún uso, así que hoy `count(o.id)` y `count(*)` devuelven lo mismo. La diferencia aparecería con la próxima promoción recién creada, que todavía no tiene pedidos: por eso el patrón correcto es contar una columna de la tabla derecha aunque hoy no cambie el resultado.\n\nEscribir consultas que siguen siendo correctas cuando cambian los datos es parte del oficio.",
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
      "El departamento de Producto va a enviar un recordatorio de calificación a quienes recibieron su pedido en agosto de 2025 y no dejaron ninguna calificación. Te piden esa lista para cargarla en la herramienta de notificaciones.",
    business_question_md:
      "Debes generar un dataset que devuelva el `id` y el `customer_id` de los pedidos cuyo `status` es igual al texto `'delivered'`, cuya columna `placed_at` cae en agosto de 2025, del día 1 al 31 inclusive, y que **no tienen** ninguna fila asociada en la tabla `ratings`. El orden de las filas no importa.",
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
          "Tienes tres condiciones sobre la tabla `orders`, que es la izquierda del cruce, y una prueba de ausencia sobre la tabla `ratings`, que es la derecha.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Agosto completo se escribe como `>= '2025-08-01' AND < '2025-09-01'`. La prueba de ausencia de calificación se escribe como `r.id IS NULL`.",
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
        description_md:
          "Escribir `placed_at <= '2025-08-31'`: la condición deja afuera casi todo el día 31, porque ese literal equivale a las 00:00 de esa fecha.",
      },
      {
        category: "null_handling",
        description_md:
          "Probar `r.restaurant_rating IS NULL`: esa condición también incluye las calificaciones que sí existen pero a las que les falta el puntaje del restaurante, que es un caso distinto.",
      },
      {
        category: "missing_filter",
        description_md:
          "Olvidar la condición `status = 'delivered'`: entran los pedidos cancelados, que nunca se califican y ensucian la lista de destinatarios.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 526 pedidos. Observa la diferencia entre «no existe ninguna calificación», que se prueba con `r.id IS NULL`, y «la calificación existe pero le falta un puntaje», que se prueba con `r.restaurant_rating IS NULL` teniendo `r.id` con valor: son dos preguntas distintas y la tabla `ratings` contiene las dos situaciones.\n\nLas condiciones sobre la tabla `orders` pueden ir en la cláusula `WHERE` porque es la tabla izquierda del cruce; si hubieras querido filtrar la tabla `ratings` por fecha, esa condición tendría que ir dentro del `ON`.",
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
      "En **Bolsillo**, la billetera digital, el equipo de Uruguay quiere ofrecer la tarjeta virtual a las personas que todavía no tienen ninguna tarjeta emitida. Te piden ese listado para armar la campaña de activación.",
    business_question_md:
      "Debes generar un dataset que devuelva el `id`, el `full_name` y el `kyc_level` de las personas cuyo `country` es igual al texto `'UY'` y que **no tienen** ninguna fila asociada en la tabla `cards`. El orden de las filas no importa.",
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
          "Es el mismo patrón que usaste con los clientes sin pedidos: un `LEFT JOIN` que arranca desde la tabla `users` y una prueba de `NULL` sobre la tabla `cards`.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "La clave foránea que relaciona las dos tablas es `cards.user_id`. El filtro por país se aplica sobre la tabla `users`.",
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
        description_md:
          "Escribir `ON c.id = u.id`: se unen dos identificadores que no tienen ninguna relación entre sí y el resultado no significa nada.",
      },
      {
        category: "duplicates",
        description_md:
          "Omitir la condición `c.id IS NULL`: las personas con dos tarjetas aparecen dos veces y las que no tienen ninguna también aparecen, así que la lista deja de ser la pedida.",
      },
      {
        category: "missing_filter",
        description_md:
          "Filtrar por `c.country`, que no existe en la tabla `cards`, en lugar de `u.country`.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 59 personas. Mira la columna `kyc_level`: en Bolsillo la emisión de tarjetas requiere nivel 1 o superior de verificación de identidad, así que parte de esta lista todavía no puede recibir la oferta. El `LEFT JOIN` te da los candidatos; la regla de negocio decide a quiénes se contacta.\n\nEse es un hábito clave del análisis: después de obtener «los que no tienen X», pregúntate por qué no lo tienen.",
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
      "El departamento de Operaciones de Montevideo, que en la tabla de restaurantes se identifica con `city_id = 8`, quiere ver **los 25 restaurantes** de la ciudad con su cantidad de pedidos de agosto de 2025, incluidos los que no tuvieron ninguno. Te piden ese reporte para detectar qué locales necesitan apoyo comercial.",
    business_question_md:
      "Debes generar un dataset que devuelva el `id` y el `name` del restaurante y la cantidad de pedidos cuya columna `placed_at` cae en agosto de 2025 bajo el encabezado `pedidos_agosto`, con valor `0` cuando el restaurante no tuvo ninguno, para todos los restaurantes cuyo `city_id` es igual a `8`. Ordena por `pedidos_agosto` descendente y, si dos restaurantes empatan, debes desempatar usando `id` ascendente.",
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
          "Si filtras la fecha dentro de la cláusula `WHERE`, los restaurantes que no tuvieron pedidos en agosto desaparecen del resultado. Piensa en qué otro lugar de la consulta puede ir esa condición.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Pon el rango de fechas dentro del `ON` del `LEFT JOIN`, junto a la igualdad de claves. La condición de ciudad, en cambio, sí puede ir en la cláusula `WHERE`, porque es sobre la tabla izquierda.",
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
        description_md:
          "Poner el rango de fechas en la cláusula `WHERE`: el resultado devuelve 22 restaurantes en lugar de 25, porque el `LEFT JOIN` queda convertido en un `INNER JOIN`.",
      },
      {
        category: "cell_values",
        description_md:
          "Usar `count(*)`: los tres restaurantes sin pedidos muestran 1 en lugar de 0, porque el cruce igual genera una fila para ellos.",
      },
      {
        category: "syntax",
        description_md:
          "Agrupar solo por `r.id` y seleccionar además `r.name`: PostgreSQL lo acepta porque `id` es clave primaria, pero otros motores no lo permiten; incluir las dos columnas en el `GROUP BY` es más portable.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 25 filas, y tres restaurantes cierran la lista con el valor `0`. Con la fecha puesta en la cláusula `WHERE` obtendrías 22 filas y nadie notaría que faltan tres, porque la consulta no falla ni avisa nada.\n\nLa regla para recordar es simple: en un `LEFT JOIN`, las condiciones sobre la tabla derecha van en el `ON` y las condiciones sobre la tabla izquierda van en el `WHERE`. Verifica siempre que la cantidad de filas del resultado coincida con la cantidad de filas de la tabla izquierda ya filtrada.",
    reward: defaultReward("intermediate"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
];
