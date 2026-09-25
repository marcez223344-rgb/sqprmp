import {
  defaultHintMeta,
  defaultReward,
  defaultSolutionUnlock,
  type ExerciseDef,
} from "../schemas/exercise";

const section = "operaciones-de-conjuntos";
const tiendaviva = { slug: "tiendaviva", version: 1 };
const bolsillo = { slug: "bolsillo", version: 1 };
const l1 = "union-y-union-all";
const l2 = "intersect-y-except";
const l3 = "conjuntos-precedencia-y-alternativas";

export const exercises: ExerciseDef[] = [
  {
    slug: "directorio-contactos-uruguay",
    section,
    title: "Directorio único de contactos en Uruguay",
    difficulty: "easy",
    estimated_minutes: 6,
    concepts: ["set_operations", "select", "where", "alias", "order_by"],
    dataset: tiendaviva,
    tables_used: ["customers", "sellers"],
    scenario_md:
      "El departamento Comercial de **TiendaViva** viaja a Montevideo y pide una sola lista con toda la gente con la que se puede reunir allá: los clientes registrados en Uruguay y las tiendas vendedoras registradas en Uruguay. Los datos viven en dos tablas distintas, `customers` y `sellers`, y ninguna de las dos guarda a los dos tipos de contacto. Te piden esa lista unificada para armar la agenda del viaje.",
    business_question_md:
      "Debes generar un dataset con dos columnas: la columna `tipo`, que debe contener el texto `'cliente'` para las filas que vienen de la tabla `customers` y el texto `'vendedor'` para las que vienen de `sellers`, y la columna `nombre`, que toma `full_name` para los clientes y `store_name` para las tiendas. Incluye solamente los registros cuyo `country` es igual al texto `'UY'` y **no elimines los repetidos**: si dos personas se llaman igual, las dos deben aparecer. Ordena por `tipo` ascendente y, dentro de cada tipo, por `nombre` ascendente.",
    learning_objective:
      "Apilar dos consultas con UNION ALL, alineando columnas y etiquetando el origen de cada fila.",
    theory_ref: l1,
    expected_columns: [
      { name: "tipo", type: "text" },
      { name: "nombre", type: "text" },
    ],
    validation_rules: { order_matters: true, required_concepts: ["set_operations"] },
    reference_solution:
      "SELECT 'cliente' AS tipo, full_name AS nombre\nFROM customers\nWHERE country = 'UY'\n\nUNION ALL\n\nSELECT 'vendedor' AS tipo, store_name AS nombre\nFROM sellers\nWHERE country = 'UY'\n\nORDER BY tipo, nombre;",
    alternative_solutions: [
      {
        label: "Ordenando por posición",
        sql: "SELECT 'cliente' AS tipo, full_name AS nombre FROM customers WHERE country = 'UY' UNION ALL SELECT 'vendedor', store_name FROM sellers WHERE country = 'UY' ORDER BY 1, 2;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Un cruce agrega columnas; acá necesitas agregar **filas**, es decir, dos consultas independientes, una debajo de la otra. El operador que las apila sin descartar nada es el que conserva todas las filas.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Cada rama proyecta dos columnas en el mismo orden: primero el texto fijo, escrito entre comillas simples, y después el nombre. Los alias `tipo` y `nombre` los define la primera rama. La cláusula `ORDER BY` se escribe una sola vez, después de la segunda rama.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT '___' AS tipo, full_name AS nombre\nFROM customers\nWHERE country = '___'\n\n___ ___\n\nSELECT '___', store_name\nFROM sellers\nWHERE country = 'UY'\n\nORDER BY ___, ___;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "duplicates",
        description_md:
          "Usar `UNION` en lugar de `UNION ALL`: dos clientes distintos que se llaman igual se fusionarían en una sola fila y el directorio quedaría incompleto.",
      },
      {
        category: "wrong_columns",
        description_md:
          "Proyectar las columnas en distinto orden en cada rama, por ejemplo `full_name, 'cliente'` en una y `'vendedor', store_name` en la otra: la consulta se ejecuta igual y mezcla nombres con etiquetas, porque las ramas se alinean por posición y no por nombre.",
      },
      {
        category: "missing_filter",
        description_md:
          "Filtrar por `country = 'UY'` en una sola de las ramas: la cláusula `WHERE` pertenece a cada consulta y no al resultado combinado.",
      },
      {
        category: "syntax",
        description_md:
          "Escribir una cláusula `ORDER BY` dentro de la primera rama sin paréntesis: el orden se aplica al resultado final y va escrito al final de todo.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 128 filas: 123 clientes y 5 tiendas. El operador `UNION ALL` es la elección correcta porque cada fila representa un contacto real; deduplicar sería perder gente de la agenda.\n\nLa columna `tipo` no existe en ninguna de las dos tablas: es una constante que agregas para saber de dónde viene cada fila. Sin ella, el directorio sería una lista de nombres sueltos.\n\nUn detalle de sintaxis: los nombres de las columnas del resultado los define la primera rama, así que los alias de la segunda son decorativos. Escribirlos igual de todas formas ayuda a quien lea la consulta. Por eso también puedes ordenar con `ORDER BY 1, 2`: la posición siempre funciona, incluso cuando la expresión no tiene alias.",
    improvement_feedback: [
      { condition: "uses_select_star", message_key: "improve.uses_select_star" },
    ],
    reward: defaultReward("easy"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "clientes-multicanal-uruguay",
    section,
    title: "Clientes de Uruguay que compran en dos canales",
    difficulty: "easy",
    estimated_minutes: 8,
    concepts: ["set_operations", "inner_join", "where", "order_by"],
    dataset: tiendaviva,
    tables_used: ["orders", "customers"],
    scenario_md:
      "El departamento de Marketing de **TiendaViva** está preparando una campaña para la base uruguaya y necesita la lista de personas a las que escribir: quienes recibieron al menos un pedido comprado en la web o al menos uno comprado a través de un socio de marketplace. Cada persona tiene que aparecer **una sola vez**, porque es una lista de correos y no un reporte de pedidos. Te piden esa lista para cargarla en la herramienta de envíos.",
    business_question_md:
      "Debes generar un dataset que, considerando solamente pedidos cuyo `status` es igual al texto `'delivered'` de clientes cuyo `country` es igual al texto `'UY'`, devuelva el `customer_id` y el `full_name` de quienes compraron por el canal `'web'` o por el canal `'marketplace_partner'`, sin repetir a nadie. Debes resolverlo combinando dos consultas, una por canal. Ordena por `customer_id` ascendente.",
    learning_objective:
      "Elegir UNION en lugar de UNION ALL cuando la pregunta exige una lista de entidades sin repeticiones.",
    theory_ref: l1,
    expected_columns: [
      { name: "customer_id", type: "integer" },
      { name: "full_name", type: "text" },
    ],
    validation_rules: { order_matters: true, required_concepts: ["set_operations"] },
    reference_solution:
      "SELECT c.id AS customer_id, c.full_name\nFROM orders AS o\nINNER JOIN customers AS c ON c.id = o.customer_id\nWHERE c.country = 'UY'\n  AND o.status = 'delivered'\n  AND o.channel = 'web'\n\nUNION\n\nSELECT c.id AS customer_id, c.full_name\nFROM orders AS o\nINNER JOIN customers AS c ON c.id = o.customer_id\nWHERE c.country = 'UY'\n  AND o.status = 'delivered'\n  AND o.channel = 'marketplace_partner'\n\nORDER BY customer_id;",
    alternative_solutions: [],
    hints: [
      {
        level: 1,
        body_md:
          "Son dos consultas casi iguales que cambian solamente en el canal. Al apilarlas, quien compró por los dos canales aparecería dos veces: necesitas el operador que elimina las filas repetidas.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "El nombre del cliente está en la tabla `customers`, así que cada rama une `orders` con `customers`. Las dos ramas proyectan exactamente `c.id AS customer_id` y `c.full_name`: como no arrastras el identificador del pedido, las filas repetidas sí se pueden reconocer y descartar.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT c.id AS customer_id, c.full_name\nFROM orders AS o\nINNER JOIN customers AS c ON c.id = o.customer_id\nWHERE c.country = 'UY' AND o.status = '___' AND o.channel = '___'\n\n___\n\nSELECT c.id AS customer_id, c.full_name\nFROM orders AS o\nINNER JOIN customers AS c ON c.id = o.customer_id\nWHERE c.country = 'UY' AND o.status = 'delivered' AND o.channel = '___'\n\nORDER BY ___;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "duplicates",
        description_md:
          "Usar `UNION ALL`: cada cliente aparece una vez por cada pedido entregado y la lista de correos se convierte en una lista de pedidos.",
      },
      {
        category: "wrong_columns",
        description_md:
          "Agregar `o.id` o `o.created_at` a la lista de `SELECT`: con esas columnas ya no hay filas idénticas, así que el operador `UNION` no puede deduplicar nada.",
      },
      {
        category: "missing_filter",
        description_md:
          "Olvidar la condición `status = 'delivered'` en alguna de las ramas: entran pedidos cancelados y la campaña le escribe a quien nunca recibió nada.",
      },
      {
        category: "join_condition",
        description_md:
          "Unir con la condición `c.id = o.id` en vez de `c.id = o.customer_id`: la consulta devuelve filas sin ninguna relación real entre el cliente y el pedido.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 82 filas. Con `UNION ALL` el resultado tendría cientos de filas, una por cada pedido entregado.\n\nFuera de este ejercicio, que practica `UNION`, una sola consulta con `channel IN ('web', 'marketplace_partner')` y `DISTINCT` devuelve exactamente lo mismo, lee la tabla una sola vez y en general es más eficiente. Vale la pena tenerlo presente: la operación de conjuntos brilla cuando las ramas son **distintas de verdad**, es decir, cuando usan tablas diferentes o agregaciones diferentes, y no cuando cambian solo en el valor de un filtro.\n\nLa razón por la que el operador `UNION` puede deduplicar acá es que proyectas únicamente el identificador y el nombre del cliente. Dos filas son duplicadas solamente cuando coinciden todas sus columnas, así que agregar cualquier dato del pedido rompe esa condición.",
    improvement_feedback: [
      { condition: "no_table_alias_in_join", message_key: "improve.no_table_alias_in_join" },
    ],
    reward: defaultReward("easy"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "usuarios-qr-y-tarjeta-peru",
    section,
    title: "Quiénes pagan con QR y también con tarjeta",
    difficulty: "intermediate",
    estimated_minutes: 9,
    concepts: ["set_operations", "inner_join", "where", "order_by"],
    dataset: bolsillo,
    tables_used: ["transactions", "accounts", "users"],
    scenario_md:
      "En **Bolsillo**, la billetera digital, el departamento de Producto quiere entender la adopción cruzada en Perú: qué personas ya usan los **dos** medios de pago, el código QR y la tarjeta. Esa gente es la candidata natural para probar la próxima función combinada, y te piden la lista.",
    business_question_md:
      "Debes generar un dataset que, considerando solamente transacciones cuyo `status` es igual al texto `'completed'` de personas cuyo `country` es igual al texto `'PE'`, devuelva el `user_id` y el `full_name` de quienes tienen al menos una transacción cuyo `kind` es igual al texto `'qr_payment'` **y** al menos una cuyo `kind` es igual al texto `'card_payment'`. Cada persona debe aparecer una sola vez. Ordena por `user_id` ascendente.\n\nTen en cuenta que las transacciones no guardan el usuario de forma directa: cuelgan de una cuenta, por el camino que va de `transactions.account_id` a `accounts.user_id`.",
    learning_objective:
      "Resolver una condición de coexistencia («A y B» sobre la misma entidad) con INTERSECT en lugar de un AND imposible.",
    theory_ref: l2,
    expected_columns: [
      { name: "user_id", type: "integer" },
      { name: "full_name", type: "text" },
    ],
    validation_rules: { order_matters: true, required_concepts: ["set_operations"] },
    reference_solution:
      "SELECT u.id AS user_id, u.full_name\nFROM transactions AS t\nINNER JOIN accounts AS a ON a.id = t.account_id\nINNER JOIN users AS u ON u.id = a.user_id\nWHERE u.country = 'PE'\n  AND t.status = 'completed'\n  AND t.kind = 'qr_payment'\n\nINTERSECT\n\nSELECT u.id AS user_id, u.full_name\nFROM transactions AS t\nINNER JOIN accounts AS a ON a.id = t.account_id\nINNER JOIN users AS u ON u.id = a.user_id\nWHERE u.country = 'PE'\n  AND t.status = 'completed'\n  AND t.kind = 'card_payment'\n\nORDER BY user_id;",
    alternative_solutions: [],
    hints: [
      {
        level: 1,
        body_md:
          "La condición `WHERE kind = 'qr_payment' AND kind = 'card_payment'` nunca devuelve filas, porque ninguna transacción tiene dos tipos a la vez. La condición es sobre la **persona** y no sobre la fila, así que arma una lista por cada tipo de pago y quédate con lo que aparece en las dos.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Cada rama va de la tabla `transactions` a `accounts`, por la columna `account_id`, y de ahí a `users`, por la columna `user_id`; filtra el país, el estado `'completed'` y **un** tipo de pago, y proyecta `u.id AS user_id` y `u.full_name`. El operador que conserva solo lo que aparece en las dos ramas ya elimina los repetidos: no necesitas `DISTINCT`.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT u.id AS user_id, u.full_name\nFROM transactions AS t\nINNER JOIN accounts AS a ON a.id = t.___\nINNER JOIN users AS u ON u.id = a.___\nWHERE u.country = 'PE' AND t.status = 'completed' AND t.kind = '___'\n\n___\n\nSELECT u.id AS user_id, u.full_name\nFROM transactions AS t\nINNER JOIN accounts AS a ON a.id = t.account_id\nINNER JOIN users AS u ON u.id = a.user_id\nWHERE u.country = 'PE' AND t.status = 'completed' AND t.kind = '___'\n\nORDER BY user_id;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "missing_filter",
        description_md:
          "Escribir `t.kind = 'qr_payment' AND t.kind = 'card_payment'` dentro de una sola consulta: el resultado siempre sale vacío, porque una transacción tiene un solo tipo.",
      },
      {
        category: "wrong_columns",
        description_md:
          "Incluir `t.amount` o `t.created_at` en las ramas: el operador `INTERSECT` compara **todas** las columnas, así que ninguna fila coincidiría y el resultado saldría vacío.",
      },
      {
        category: "duplicates",
        description_md:
          "Reemplazar el `INTERSECT` por un `INNER JOIN` entre las dos listas sin deduplicar: cada combinación de transacciones con QR y con tarjeta genera una fila, y la misma persona aparece muchas veces.",
      },
      {
        category: "aggregation_level",
        description_md:
          "Usar `HAVING count(*) = 2` en la versión agrupada: eso exige exactamente dos transacciones en total, no una de cada tipo. Lo correcto es `count(DISTINCT kind) = 2`.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 62 personas, de las 316 registradas en Perú, que usan los dos medios de pago.\n\nEl operador `INTERSECT` funciona porque las dos ramas proyectan exactamente las mismas dos columnas, las dos provenientes de la tabla `users`: la identidad que se compara es la persona. Si agregaras cualquier dato de la transacción, no habría ninguna coincidencia.\n\nFuera de este ejercicio, que practica `INTERSECT`, la forma con `GROUP BY ... HAVING count(DISTINCT t.kind) = 2` lee la tabla una sola vez y escala mejor cuando los tipos son muchos, porque la pregunta «quiénes usaron al menos 3 de estos 5 medios» se resuelve cambiando un número. El operador `INTERSECT` gana en claridad cuando son exactamente dos condiciones y la pregunta de negocio se enuncia como una intersección.",
    improvement_feedback: [
      { condition: "no_table_alias_in_join", message_key: "improve.no_table_alias_in_join" },
    ],
    reward: defaultReward("intermediate"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "clientes-uruguay-que-no-volvieron",
    section,
    title: "Clientes de Uruguay que no volvieron en 2025",
    difficulty: "intermediate",
    estimated_minutes: 9,
    concepts: ["set_operations", "inner_join", "where", "date_functions", "order_by"],
    dataset: tiendaviva,
    tables_used: ["orders", "customers"],
    scenario_md:
      "El departamento de Retención de **TiendaViva** quiere recuperar clientes uruguayos: gente que recibió pedidos durante 2024 y que en lo que va de 2025 no volvió a comprar. Con esa lista arman una campaña de reactivación con un cupón, y te piden que la obtengas de la base.",
    business_question_md:
      "Debes generar un dataset que, considerando solamente pedidos cuyo `status` es igual al texto `'delivered'` de clientes cuyo `country` es igual al texto `'UY'`, devuelva el `customer_id`, el `full_name` y el `email` de quienes tienen al menos un pedido entregado con `created_at` anterior al `'2025-01-01'` y **ningún** pedido entregado desde esa fecha en adelante. Debes resolverlo restando un conjunto del otro. Ordena por `customer_id` ascendente.",
    learning_objective:
      "Usar EXCEPT para restar conjuntos y entender que el orden de las ramas cambia la pregunta.",
    theory_ref: l2,
    expected_columns: [
      { name: "customer_id", type: "integer" },
      { name: "full_name", type: "text" },
      { name: "email", type: "text" },
    ],
    validation_rules: { order_matters: true, required_concepts: ["set_operations"] },
    reference_solution:
      "SELECT c.id AS customer_id, c.full_name, c.email\nFROM orders AS o\nINNER JOIN customers AS c ON c.id = o.customer_id\nWHERE c.country = 'UY'\n  AND o.status = 'delivered'\n  AND o.created_at < DATE '2025-01-01'\n\nEXCEPT\n\nSELECT c.id AS customer_id, c.full_name, c.email\nFROM orders AS o\nINNER JOIN customers AS c ON c.id = o.customer_id\nWHERE c.country = 'UY'\n  AND o.status = 'delivered'\n  AND o.created_at >= DATE '2025-01-01'\n\nORDER BY customer_id;",
    alternative_solutions: [],
    hints: [
      {
        level: 1,
        body_md:
          "Piensa en dos listas: quienes compraron en 2024 y quienes compraron en 2025. La respuesta es la primera **menos** la segunda. El operador que resta conjuntos no es simétrico: la rama que va primero define qué se conserva.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Las dos ramas son idénticas salvo por el filtro de fecha: `o.created_at < DATE '2025-01-01'` en la primera y `o.created_at >= DATE '2025-01-01'` en la segunda. Las dos proyectan las mismas tres columnas de la tabla `customers`, todas del cliente, para que la comparación sea por persona.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT c.id AS customer_id, c.full_name, c.email\nFROM orders AS o\nINNER JOIN customers AS c ON c.id = o.customer_id\nWHERE c.country = 'UY' AND o.status = 'delivered' AND o.created_at ___ DATE '2025-01-01'\n\n___\n\nSELECT c.id AS customer_id, c.full_name, c.email\nFROM orders AS o\nINNER JOIN customers AS c ON c.id = o.customer_id\nWHERE c.country = 'UY' AND o.status = 'delivered' AND o.created_at ___ DATE '2025-01-01'\n\nORDER BY ___;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "wrong_order",
        description_md:
          "Invertir las ramas: la resta «2025 menos 2024» devuelve a los clientes nuevos de 2025, que es la pregunta opuesta a la que hizo Retención.",
      },
      {
        category: "date_boundary",
        description_md:
          "Usar `o.created_at > DATE '2025-01-01'` en la segunda rama: quien compró exactamente el 1 de enero de 2025 quedaría fuera de esa lista y aparecería como cliente perdido.",
      },
      {
        category: "wrong_columns",
        description_md:
          "Incluir `o.created_at` o `o.total_amount` en las ramas: las fechas nunca coinciden entre 2024 y 2025, así que el operador `EXCEPT` no restaría a nadie y devolvería todos los clientes de 2024.",
      },
      {
        category: "missing_filter",
        description_md:
          "Omitir la condición `status = 'delivered'` en la segunda rama: un pedido cancelado en 2025 contaría como regreso y sacaría de la campaña a alguien que sí se perdió.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 17 clientes uruguayos que compraron en 2024 y no volvieron en 2025.\n\nLa clave está en proyectar solamente columnas del cliente. El operador `EXCEPT` compara fila completa contra fila completa: si arrastras datos del pedido, cada fila es única y la resta no elimina nada.\n\nEl `NOT EXISTS` equivalente, que este ejercicio no acepta porque practica `EXCEPT`, suele ser más rápido en tablas grandes, porque el motor se detiene en cuanto encuentra la primera compra de 2025 y no tiene que materializar la lista entera. También es más flexible, porque permite devolver columnas del pedido de 2024, como la fecha de la última compra, que el `EXCEPT` no admitiría. La versión con `EXCEPT` gana en legibilidad cuando la pregunta se enuncia como una resta de conjuntos.\n\nUna advertencia: la forma `NOT IN (SELECT customer_id FROM ...)` parece equivalente, pero si la subconsulta devuelve algún `NULL` el resultado es cero filas sin ningún error. Ni `EXCEPT` ni `NOT EXISTS` tienen esa trampa.",
    improvement_feedback: [
      {
        condition: "uses_between_for_timestamps",
        message_key: "improve.uses_between_for_timestamps",
      },
    ],
    reward: defaultReward("intermediate"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "cuentas-solo-emisoras",
    section,
    title: "Cuentas chilenas que solo envían dinero",
    difficulty: "advanced",
    estimated_minutes: 11,
    concepts: ["set_operations", "cte", "inner_join", "where", "order_by"],
    dataset: bolsillo,
    tables_used: ["transfers", "accounts", "users"],
    scenario_md:
      "En **Bolsillo**, el departamento de Crecimiento está estudiando las cuentas en pesos chilenos que funcionan solo como canal de salida: envían transferencias a otras cuentas y nunca reciben ninguna. Son candidatas a una campaña para que también cobren dentro de la billetera en lugar de hacerlo por fuera, y te piden esa lista.",
    business_question_md:
      "Debes generar un dataset que, considerando solamente transferencias cuyo `status` es igual al texto `'completed'`, obtenga las cuentas cuyo `currency` es igual al texto `'CLP'` que aparecen como emisoras, en la columna `transfers.from_account_id`, y que **nunca** aparecen como receptoras, en la columna `transfers.to_account_id`, sin importar la moneda de la cuenta receptora. Devuelve el `account_id`, el `full_name` de la persona titular y su `city`. Calcula el conjunto de cuentas en una expresión de tabla común y recién después trae los datos descriptivos con cruces. Ordena por `account_id` ascendente.",
    learning_objective:
      "Aplicar el patrón «conjunto primero, detalles después»: resolver la resta por clave y enriquecer el resultado con joins.",
    theory_ref: l2,
    expected_columns: [
      { name: "account_id", type: "integer" },
      { name: "full_name", type: "text" },
      { name: "city", type: "text" },
    ],
    validation_rules: { order_matters: true, required_concepts: ["set_operations", "cte"] },
    reference_solution:
      "WITH solo_emisoras AS (\n  SELECT t.from_account_id AS account_id\n  FROM transfers AS t\n  INNER JOIN accounts AS a ON a.id = t.from_account_id\n  WHERE t.status = 'completed'\n    AND a.currency = 'CLP'\n\n  EXCEPT\n\n  SELECT t.to_account_id\n  FROM transfers AS t\n  WHERE t.status = 'completed'\n)\nSELECT s.account_id, u.full_name, u.city\nFROM solo_emisoras AS s\nINNER JOIN accounts AS a ON a.id = s.account_id\nINNER JOIN users AS u ON u.id = a.user_id\nORDER BY s.account_id;",
    alternative_solutions: [],
    hints: [
      {
        level: 1,
        body_md:
          "El conjunto que buscas se define con una sola columna: el identificador de la cuenta. Primero resuélvelo, restando las receptoras a las emisoras, y recién después agrega el nombre y la ciudad, que no participan de la comparación.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Dentro de la expresión de tabla común, la primera rama une `transfers` con `accounts` para poder filtrar `currency = 'CLP'` y proyecta `from_account_id`; la segunda rama solo necesita `to_account_id` de `transfers` con el mismo filtro de estado, sin filtrar la moneda. Fuera de la expresión, unes con `accounts` y `users` para traer el `full_name` y la `city`.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nWITH solo_emisoras AS (\n  SELECT t.___ AS account_id\n  FROM transfers AS t\n  INNER JOIN accounts AS a ON a.id = t.from_account_id\n  WHERE t.status = '___' AND a.currency = '___'\n\n  ___\n\n  SELECT t.___\n  FROM transfers AS t\n  WHERE t.status = 'completed'\n)\nSELECT s.account_id, u.___, u.___\nFROM solo_emisoras AS s\nINNER JOIN accounts AS a ON a.id = s.account_id\nINNER JOIN users AS u ON u.id = a.___\nORDER BY s.account_id;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "wrong_columns",
        description_md:
          "Poner las columnas `full_name` y `city` dentro de las ramas del `EXCEPT`: la segunda rama tendría que unir las mismas tablas y la comparación dejaría de hacerse por cuenta.",
      },
      {
        category: "missing_filter",
        description_md:
          "Filtrar por `currency = 'CLP'` también en la rama de las receptoras: una cuenta chilena que recibió dinero desde una cuenta en otra moneda seguiría apareciendo como «solo emisora».",
      },
      {
        category: "row_count",
        description_md:
          "Ignorar la condición `status = 'completed'`: las transferencias fallidas o pendientes no movieron dinero, así que una cuenta que solo recibió transferencias fallidas debería seguir contando como solo emisora.",
      },
      {
        category: "duplicates",
        description_md:
          "Resolverlo con `NOT EXISTS` pero sin `DISTINCT`: una cuenta con 40 envíos aparecería 40 veces, mientras que el operador `EXCEPT` deduplica por definición.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 48 cuentas en pesos chilenos que envían dinero y nunca reciben.\n\nEl patrón importante es el orden de las operaciones: primero el conjunto, definido por una sola columna que es la clave, y después el enriquecimiento con datos descriptivos. Intentar hacer todo junto obliga a repetir los cruces en las dos ramas y hace que la comparación dependa de columnas que no definen identidad.\n\nFíjate en la asimetría de los filtros: la moneda se filtra solamente en la rama de las emisoras, porque la pregunta es sobre cuentas chilenas, y recibir dinero de cualquier cuenta, chilena o no, ya las descalifica. Es el tipo de detalle que conviene confirmar con quien pide el reporte.\n\nUn `NOT EXISTS` da el mismo resultado y suele ser más rápido con volumen alto, porque corta en la primera coincidencia; necesita `DISTINCT` porque recorre las transferencias y no las cuentas. Este ejercicio no lo acepta porque practica el `EXCEPT` dentro de una expresión de tabla común.",
    improvement_feedback: [
      { condition: "no_table_alias_in_join", message_key: "improve.no_table_alias_in_join" },
    ],
    reward: defaultReward("advanced"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "revision-de-riesgo-uruguay",
    section,
    title: "Cola de revisión de riesgo en Uruguay",
    difficulty: "advanced",
    estimated_minutes: 12,
    concepts: ["set_operations", "inner_join", "where", "order_by"],
    dataset: bolsillo,
    tables_used: ["transactions", "accounts", "users", "kyc_events"],
    scenario_md:
      "El departamento de Riesgo de **Bolsillo** está armando la cola de revisión manual de Uruguay. Entra a la cola quien tenga alguna transacción marcada por el motor antifraude, es decir, con la columna `transactions.is_flagged` en `true`, **o** algún evento de verificación de identidad cuyo `outcome` sea igual al texto `'rejected'`. Quedan fuera las cuentas ya bloqueadas, porque ésas no se revisan sino que se escalan por otro canal. Te piden esa cola para repartirla entre los analistas.",
    business_question_md:
      "Debes generar un dataset que devuelva el `user_id` y el `full_name` de las personas cuyo `country` es igual al texto `'UY'` que tienen al menos una transacción con la columna `is_flagged` en `true`, o al menos un evento de verificación de identidad cuyo `outcome` es igual al texto `'rejected'`, excluyendo a quienes tienen la columna `is_blocked` en `true`. Cada persona debe aparecer una sola vez. Combina la unión de las dos fuentes y después réstale el conjunto de las personas bloqueadas, usando paréntesis para dejar explícito el orden de evaluación. Ordena por `user_id` ascendente.",
    learning_objective:
      "Combinar UNION y EXCEPT en una sola consulta controlando la precedencia con paréntesis.",
    theory_ref: l3,
    expected_columns: [
      { name: "user_id", type: "integer" },
      { name: "full_name", type: "text" },
    ],
    validation_rules: { order_matters: true, required_concepts: ["set_operations"] },
    reference_solution:
      "(\n  SELECT u.id AS user_id, u.full_name\n  FROM transactions AS t\n  INNER JOIN accounts AS a ON a.id = t.account_id\n  INNER JOIN users AS u ON u.id = a.user_id\n  WHERE u.country = 'UY'\n    AND t.is_flagged\n\n  UNION\n\n  SELECT u.id AS user_id, u.full_name\n  FROM kyc_events AS k\n  INNER JOIN users AS u ON u.id = k.user_id\n  WHERE u.country = 'UY'\n    AND k.outcome = 'rejected'\n)\n\nEXCEPT\n\nSELECT u.id AS user_id, u.full_name\nFROM users AS u\nWHERE u.country = 'UY'\n  AND u.is_blocked\n\nORDER BY user_id;",
    alternative_solutions: [
      {
        label: "Sin paréntesis (misma precedencia por defecto)",
        sql: "SELECT u.id AS user_id, u.full_name FROM transactions AS t INNER JOIN accounts AS a ON a.id = t.account_id INNER JOIN users AS u ON u.id = a.user_id WHERE u.country = 'UY' AND t.is_flagged UNION SELECT u.id AS user_id, u.full_name FROM kyc_events AS k INNER JOIN users AS u ON u.id = k.user_id WHERE u.country = 'UY' AND k.outcome = 'rejected' EXCEPT SELECT u.id AS user_id, u.full_name FROM users AS u WHERE u.country = 'UY' AND u.is_blocked ORDER BY user_id;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Son tres conjuntos: las personas con transacciones marcadas por antifraude, las rechazadas en la verificación de identidad y las bloqueadas. Los dos primeros se suman sin repetir a nadie; el tercero se resta del resultado de esa suma.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "La primera rama va de la tabla `transactions` a `accounts` y después a `users`; la segunda va de `kyc_events` directo a `users`; la tercera lee solamente `users`. Las tres proyectan `u.id AS user_id` y `u.full_name`. Encierra entre paréntesis la suma de las dos primeras antes de restar la tercera.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\n(\n  SELECT u.id AS user_id, u.full_name\n  FROM transactions AS t\n  INNER JOIN accounts AS a ON a.id = t.account_id\n  INNER JOIN users AS u ON u.id = a.user_id\n  WHERE u.country = 'UY' AND t.___\n\n  ___\n\n  SELECT u.id AS user_id, u.full_name\n  FROM kyc_events AS k\n  INNER JOIN users AS u ON u.id = k.user_id\n  WHERE u.country = 'UY' AND k.outcome = '___'\n)\n\n___\n\nSELECT u.id AS user_id, u.full_name\nFROM users AS u\nWHERE u.country = 'UY' AND u.___\n\nORDER BY user_id;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "duplicates",
        description_md:
          "Usar `UNION ALL` entre las dos primeras ramas: quien tiene varias transacciones marcadas entra muchas veces a la cola de revisión.",
      },
      {
        category: "wrong_order",
        description_md:
          "Restar las personas bloqueadas solo de una de las dos fuentes, como en «A menos C unido con B»: una persona bloqueada que además tiene la verificación rechazada volvería a entrar por la segunda rama.",
      },
      {
        category: "missing_filter",
        description_md:
          "Olvidar la condición `country = 'UY'` en alguna rama: la cola se llena con personas de otros países que ese equipo no revisa.",
      },
      {
        category: "join_condition",
        description_md:
          "Unir la tabla `kyc_events` con `users` pasando por `accounts`: la tabla `kyc_events` ya tiene la columna `user_id`, y ese rodeo duplica filas para quienes tienen más de una cuenta.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 45 personas que entran a la cola de revisión en Uruguay.\n\nLos paréntesis documentan la intención, aunque acá no cambien nada: los operadores `UNION` y `EXCEPT` tienen la misma prioridad y se evalúan de izquierda a derecha, así que la versión sin paréntesis devuelve lo mismo. La historia cambia si alguien agrega un `INTERSECT`, porque ese operador se evalúa **antes**; con los paréntesis, la consulta sigue significando lo que significaba.\n\nCada rama llega a la tabla `users` por un camino distinto, una a través de las cuentas, otra directo desde los eventos de verificación y la tercera sin ningún cruce, y aun así se combinan sin problema: las operaciones de conjuntos solo exigen que coincidan la cantidad, el tipo y el orden de las columnas, no su origen.\n\nEn producción, una cola así se materializa a menudo con `NOT EXISTS` sobre una única consulta base; la versión con conjuntos es preferible cuando cada criterio de entrada lo define un equipo distinto y quieres poder agregar o quitar ramas sin tocar el resto.",
    improvement_feedback: [
      { condition: "no_table_alias_in_join", message_key: "improve.no_table_alias_in_join" },
    ],
    reward: defaultReward("advanced"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "desafio-flujo-neto-mensual",
    section,
    title: "Desafío: flujo neto mensual en México",
    difficulty: "expert",
    estimated_minutes: 15,
    concepts: [
      "set_operations",
      "cte",
      "inner_join",
      "aggregate",
      "group_by",
      "conditional_aggregation",
      "date_functions",
      "order_by",
    ],
    dataset: tiendaviva,
    tables_used: ["payments", "returns", "orders"],
    scenario_md:
      "El departamento de Finanzas de **TiendaViva México** está armando el flujo de caja mensual de 2025. El dinero entra por los pagos aprobados, que son las filas de `payments` cuyo `status` es igual al texto `'approved'`, fechadas en la columna `paid_at`, y sale por las devoluciones, que son los valores de `returns.refund_amount` fechados en la columna `requested_at`. Son dos tablas con estructuras distintas y una sola línea de tiempo, y te piden unificarlas en un solo reporte.",
    business_question_md:
      "Debes generar un dataset que, tomando los pedidos cuyo `currency` es igual al texto `'MXN'` y los movimientos ocurridos desde el `'2025-01-01'`, devuelva una fila por mes con el `mes`, que es el primer día del mes con tipo `date`, la suma de `payments.amount` de los pagos cuyo `status` es igual al texto 'approved' de ese mes bajo el encabezado `cobros`, la suma de `returns.refund_amount` de ese mes bajo el encabezado `reembolsos` y la resta entre los dos valores bajo el encabezado `neto`. Redondea los tres importes a 2 decimales. Apila las dos fuentes con una operación de conjuntos dentro de una expresión de tabla común, etiquetando cada fila con su tipo, y agrega después. Ordena por `mes` ascendente.",
    learning_objective:
      "Usar UNION ALL para unificar dos fuentes heterogéneas en un formato común y agregarlas en una sola pasada.",
    theory_ref: l3,
    expected_columns: [
      { name: "mes", type: "date" },
      { name: "cobros", type: "numeric" },
      { name: "reembolsos", type: "numeric" },
      { name: "neto", type: "numeric" },
    ],
    validation_rules: {
      order_matters: true,
      required_concepts: ["set_operations", "cte", "group_by"],
    },
    reference_solution:
      "WITH movimientos AS (\n  SELECT 'cobro' AS tipo, date_trunc('month', p.paid_at)::date AS mes, p.amount AS monto\n  FROM payments AS p\n  INNER JOIN orders AS o ON o.id = p.order_id\n  WHERE p.status = 'approved'\n    AND o.currency = 'MXN'\n    AND p.paid_at >= DATE '2025-01-01'\n\n  UNION ALL\n\n  SELECT 'reembolso' AS tipo, date_trunc('month', r.requested_at)::date AS mes, r.refund_amount AS monto\n  FROM returns AS r\n  INNER JOIN orders AS o ON o.id = r.order_id\n  WHERE o.currency = 'MXN'\n    AND r.requested_at >= DATE '2025-01-01'\n)\nSELECT\n  mes,\n  round(sum(monto) FILTER (WHERE tipo = 'cobro'), 2) AS cobros,\n  round(sum(monto) FILTER (WHERE tipo = 'reembolso'), 2) AS reembolsos,\n  round(sum(monto) FILTER (WHERE tipo = 'cobro') - sum(monto) FILTER (WHERE tipo = 'reembolso'), 2) AS neto\nFROM movimientos\nGROUP BY mes\nORDER BY mes;",
    alternative_solutions: [
      {
        label: "SUM(CASE ...) en lugar de FILTER",
        sql: "WITH movimientos AS (SELECT 'cobro' AS tipo, date_trunc('month', p.paid_at)::date AS mes, p.amount AS monto FROM payments AS p INNER JOIN orders AS o ON o.id = p.order_id WHERE p.status = 'approved' AND o.currency = 'MXN' AND p.paid_at >= DATE '2025-01-01' UNION ALL SELECT 'reembolso' AS tipo, date_trunc('month', r.requested_at)::date AS mes, r.refund_amount AS monto FROM returns AS r INNER JOIN orders AS o ON o.id = r.order_id WHERE o.currency = 'MXN' AND r.requested_at >= DATE '2025-01-01') SELECT mes, round(sum(CASE WHEN tipo = 'cobro' THEN monto ELSE 0 END), 2) AS cobros, round(sum(CASE WHEN tipo = 'reembolso' THEN monto ELSE 0 END), 2) AS reembolsos, round(sum(CASE WHEN tipo = 'cobro' THEN monto ELSE -monto END), 2) AS neto FROM movimientos GROUP BY mes ORDER BY mes;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Las dos fuentes no se parecen, pero puedes obligarlas a tener la misma forma: tipo de movimiento, mes y monto. Con las filas ya normalizadas, el reporte es una agregación común y corriente.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Cada rama proyecta tres columnas en el mismo orden: un texto fijo, que es `'cobro'` o `'reembolso'`, la expresión `date_trunc('month', <la fecha>)::date` y el importe. Acá los duplicados son legítimos, así que apila sin deduplicar. En el `SELECT` final, la expresión `sum(monto) FILTER (WHERE tipo = ...)` separa cada métrica, y la columna `neto` es la resta de las dos sumas.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nWITH movimientos AS (\n  SELECT '___' AS tipo, date_trunc('month', p.___)::date AS mes, p.amount AS monto\n  FROM payments AS p\n  INNER JOIN orders AS o ON o.id = p.order_id\n  WHERE p.status = '___' AND o.currency = 'MXN' AND p.paid_at >= DATE '2025-01-01'\n\n  ___ ___\n\n  SELECT '___', date_trunc('month', r.___)::date, r.refund_amount\n  FROM returns AS r\n  INNER JOIN orders AS o ON o.id = r.order_id\n  WHERE o.currency = 'MXN' AND r.requested_at >= DATE '2025-01-01'\n)\nSELECT\n  mes,\n  round(sum(monto) FILTER (WHERE ___), 2) AS cobros,\n  round(sum(monto) FILTER (WHERE ___), 2) AS reembolsos,\n  round(___, 2) AS neto\nFROM movimientos\nGROUP BY ___\nORDER BY mes;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "duplicates",
        description_md:
          "Apilar con `UNION` en lugar de `UNION ALL`: dos cobros del mismo monto en el mismo mes son dos cobros reales, y deduplicarlos borra dinero del reporte.",
      },
      {
        category: "date_boundary",
        description_md:
          "Fechar los reembolsos con la columna `paid_at` del pago original en lugar de `requested_at`: la salida de caja se imputa al mes equivocado.",
      },
      {
        category: "aggregation_level",
        description_md:
          "Calcular los cobros y los reembolsos en dos consultas separadas y unirlas con `UNION ALL` al final: quedan dos filas por mes en lugar de una, con columnas vacías.",
      },
      {
        category: "missing_filter",
        description_md:
          "Incluir pagos cuyo `status` es `'rejected'` o `'refunded'`: el primero nunca ingresó dinero y el segundo ya se contabiliza como devolución, así que el flujo queda inflado.",
      },
      {
        category: "cell_values",
        description_md:
          "Mezclar monedas: sin la condición `o.currency = 'MXN'` se suman pesos mexicanos, pesos colombianos y soles en la misma columna, y el total no significa nada.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 9 filas, de enero a septiembre de 2025. El flujo neto llega a su máximo en mayo, con 2 219 930.28 pesos mexicanos, y julio y agosto se sostienen por encima de los dos millones; septiembre queda muy abajo, con 607 168.11, porque el dataset corta el 16 de septiembre y el mes está incompleto. Los reembolsos van del 3.7 % en julio al 14.0 % en enero sobre los cobros del mes, salvo en ese septiembre parcial, donde trepan al 19.9 %: las devoluciones se siguen pidiendo sobre pedidos anteriores cuando los cobros del mes ya se cortaron.\n\nEl operador `UNION ALL` es el corazón del ejercicio: convierte dos tablas con estructuras distintas en un formato común, con las columnas `tipo`, `mes` y `monto`, que se puede agregar de una sola vez. Es el patrón estándar para construir un libro mayor o una tabla de hechos a partir de fuentes heterogéneas, y se extiende a una tercera fuente agregando una rama más.\n\nLa etiqueta `tipo` es la que permite separar después las métricas con la cláusula `FILTER`. La alternativa con `sum(CASE WHEN ... THEN ... ELSE 0 END)` es equivalente y funciona en cualquier motor; `FILTER` es SQL estándar y se lee mejor cuando hay varias métricas condicionales.\n\nUna variante frecuente en producción es guardar el signo dentro de la rama, escribiendo `-r.refund_amount`, y calcular el neto con un solo `sum(monto)`. Funciona, pero pierdes la posibilidad de mostrar los cobros y los reembolsos por separado sin volver a la fuente.",
    improvement_feedback: [
      {
        condition: "missing_alias_on_aggregate",
        message_key: "improve.missing_alias_on_aggregate",
      },
    ],
    reward: defaultReward("expert"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
];
