import {
  defaultHintMeta,
  defaultReward,
  defaultSolutionUnlock,
  type ExerciseDef,
} from "../schemas/exercise";

const section = "sql-con-ia";
const supuestos = "ia-varias-tablas-y-supuestos";
const verificar = "ia-verificar-antes-de-entregar";
const dialectos = "ia-dialectos-e-invenciones";

/*
 * Every "AI answer" below is an artefact written for this course (D-40). It is shown as what
 * "una IA" answered, never attributed to a specific product. Each defect was run against the
 * snapshot before publishing: the dialect ones fail in PostgreSQL 18, and the logical ones return
 * a result that differs from the reference solution.
 */
export const exercises: ExerciseDef[] = [
  {
    slug: "ia-consulta-en-mysql",
    section,
    title: "La consulta vino en MySQL",
    difficulty: "intermediate",
    estimated_minutes: 10,
    concepts: ["date_functions", "null_handling", "aggregate", "group_by", "where"],
    dataset: { slug: "tiendaviva", version: 1 },
    tables_used: ["orders"],
    scenario_md: `El departamento Comercial de **TiendaViva** quiere ver cómo evolucionaron en 2025 los pedidos entregados en México por canal de venta, y cuánto descuento se otorgó en cada caso. Valeria, de tu equipo, le pasó el pedido a un asistente de IA sin decirle qué motor de base de datos usan. La IA respondió esto:

\`\`\`sql
SELECT DATE_FORMAT(o.\`created_at\`, '%Y-%m') AS mes,
       o.\`channel\` AS canal,
       COUNT(*) AS pedidos,
       SUM(IFNULL(o.\`discount\`, 0)) AS descuento_total
FROM \`orders\` o
WHERE o.\`status\` = 'delivered'
  AND o.\`currency\` = 'MXN'
  AND o.\`created_at\` >= '2025-01-01'
  AND o.\`created_at\` < '2025-09-01'
GROUP BY mes, canal
ORDER BY mes, canal;
\`\`\`

La lógica es la que pidió Comercial, pero la consulta está escrita en el dialecto de MySQL y PostgreSQL no puede ejecutarla. Valeria necesita el reporte hoy y te pide que la adaptes.`,
    business_question_md:
      "Debes generar un dataset que devuelva una fila por mes y canal para los pedidos cuyo `status` es igual al texto `'delivered'`, cuya `currency` es igual al texto `'MXN'` y cuyo `created_at` está desde el 2025-01-01 00:00 inclusive hasta el 2025-09-01 00:00 exclusive, en UTC. Columnas: el mes de `created_at` como texto con el formato `'2025-01'` (año de cuatro dígitos, guion y mes de dos dígitos) bajo el encabezado `mes`, la columna `channel` bajo el encabezado `canal`, la cantidad de pedidos bajo el encabezado `pedidos` y la suma de `discount` bajo el encabezado `descuento_total`. Ordena por `mes` y luego por `canal`, ambos ascendentes. Conserva la lógica de la consulta de la IA y cambia solo lo que PostgreSQL no entiende.",
    learning_objective:
      "Traducir a PostgreSQL una consulta escrita en el dialecto de MySQL, reemplazando identificadores entre acentos graves, IFNULL y DATE_FORMAT.",
    theory_ref: dialectos,
    expected_columns: [
      { name: "mes", type: "text" },
      { name: "canal", type: "text" },
      { name: "pedidos", type: "integer" },
      { name: "descuento_total", type: "numeric" },
    ],
    validation_rules: {
      order_matters: true,
      required_concepts: ["group_by"],
    },
    reference_solution: `SELECT
  to_char(o.created_at AT TIME ZONE 'UTC', 'YYYY-MM') AS mes,
  o.channel AS canal,
  count(*) AS pedidos,
  sum(coalesce(o.discount, 0)) AS descuento_total
FROM orders AS o
WHERE o.status = 'delivered'
  AND o.currency = 'MXN'
  AND o.created_at >= timestamptz '2025-01-01 00:00:00+00'
  AND o.created_at < timestamptz '2025-09-01 00:00:00+00'
GROUP BY 1, 2
ORDER BY mes, canal;`,
    alternative_solutions: [
      {
        label: "date_trunc y sin coalesce, porque discount no admite NULL",
        sql: `SELECT
  to_char(date_trunc('month', o.created_at AT TIME ZONE 'UTC'), 'YYYY-MM') AS mes,
  o.channel AS canal,
  count(*) AS pedidos,
  sum(o.discount) AS descuento_total
FROM orders AS o
WHERE o.status = 'delivered'
  AND o.currency = 'MXN'
  AND o.created_at >= '2025-01-01'
  AND o.created_at < '2025-09-01'
GROUP BY mes, canal
ORDER BY mes, canal;`,
      },
      {
        label: "Mes armado con extract y lpad",
        sql: `SELECT
  extract(year FROM o.created_at AT TIME ZONE 'UTC')::int || '-' ||
    lpad(extract(month FROM o.created_at AT TIME ZONE 'UTC')::int::text, 2, '0') AS mes,
  o.channel AS canal,
  count(*) AS pedidos,
  sum(coalesce(o.discount, 0)) AS descuento_total
FROM orders AS o
WHERE o.status = 'delivered'
  AND o.currency = 'MXN'
  AND o.created_at >= timestamptz '2025-01-01 00:00:00+00'
  AND o.created_at < timestamptz '2025-09-01 00:00:00+00'
GROUP BY 1, 2
ORDER BY 1, 2;`,
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Los filtros, la agrupación y el orden de la consulta de la IA ya son los que pidió Comercial. Lo que falla es el dialecto: busca las construcciones que son propias de MySQL y reemplázalas por su equivalente en PostgreSQL, una por una.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Son tres cambios. Quita los acentos graves que rodean los nombres de tablas y columnas: en PostgreSQL esos nombres van sin comillas. Reemplaza `IFNULL` por `coalesce`, que recibe los mismos argumentos. Y reemplaza `DATE_FORMAT(fecha, '%Y-%m')` por `to_char(fecha, 'YYYY-MM')`: además de la función, cambia el patrón de formato.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT\n  ___(o.created_at AT TIME ZONE 'UTC', '___') AS mes,\n  o.channel AS canal,\n  count(*) AS pedidos,\n  sum(___(o.discount, 0)) AS descuento_total\nFROM orders AS o\nWHERE o.status = 'delivered'\n  AND o.currency = 'MXN'\n  AND o.created_at >= '2025-01-01'\n  AND o.created_at < '2025-09-01'\nGROUP BY 1, 2\nORDER BY mes, canal;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "syntax",
        description_md:
          "Quitar solo algunos acentos graves. Basta uno, por ejemplo en `` `orders` ``, para que el simulador responda que no pudo interpretar la consulta.",
      },
      {
        category: "cell_values",
        description_md:
          "Pasar el patrón de MySQL tal cual a `to_char(created_at, '%Y-%m')`. PostgreSQL no da error: interpreta `Y` como el último dígito del año y devuelve textos como `'%5-%m'`.",
      },
      {
        category: "cell_values",
        description_md:
          "Usar `'YYYY-MI'` como patrón. En `to_char`, `MI` son los minutos, no el mes: `mes` sale como `'2025-00'`, `'2025-37'` y así, según el minuto de cada pedido, y el resultado tiene decenas de grupos en lugar de ocho meses.",
      },
      {
        category: "missing_filter",
        description_md:
          "Reescribir la consulta desde cero y olvidar `currency = 'MXN'`. El reporte mezcla pedidos de todos los países y suma descuentos en monedas distintas.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 24 filas: ocho meses, de enero a agosto de 2025, por tres canales.\n\nLa consulta de la IA tenía tres construcciones de MySQL, y cada una produce un mensaje distinto en PostgreSQL:\n\n1. **Los acentos graves** alrededor de los identificadores. En MySQL sirven para citar nombres; PostgreSQL no los reconoce y el simulador responde que no pudo interpretar la consulta, con la línea y la columna donde aparece el primero. En PostgreSQL los nombres se escriben sin comillas o, si hace falta, con comillas dobles.\n2. **`IFNULL`**, que en PostgreSQL da `function ifnull(numeric, integer) does not exist`. El equivalente es `coalesce`, que además es estándar y funciona en los tres motores.\n3. **`DATE_FORMAT(fecha, '%Y-%m')`**, que tampoco existe. `to_char(fecha, 'YYYY-MM')` hace lo mismo, pero con otro lenguaje de patrones: si copias `'%Y-%m'` dentro de `to_char`, PostgreSQL no da error y devuelve un texto equivocado.\n\nHay un cuarto detalle que no es de dialecto, sino un supuesto de la IA: el `IFNULL` sobra. La descripción de `discount` en el panel «Definiciones de tablas» dice que vale 0 cuando no hay descuento, y en el esquema la columna está declarada `NOT NULL`, es decir, no admite NULL. Por eso `sum(discount)` y `sum(coalesce(discount, 0))` dan lo mismo. La IA lo agregó porque no conocía el esquema. No hace daño, pero conviene notarlo: una IA que protege contra NULL que no existen tampoco sabe cuáles sí existen.\n\nEl `GROUP BY mes, canal` funciona igual en PostgreSQL, que acepta en el `GROUP BY` los nombres de las columnas de salida. `GROUP BY 1, 2`, por posición, es equivalente. Escribir `AT TIME ZONE 'UTC'` dentro de `to_char` deja explícito en qué zona se corta cada mes.\n\nPara la próxima vez, el arreglo más barato está en el pedido: la línea «Uso PostgreSQL 18. Responde solo con SQL válido para PostgreSQL.» evita las tres correcciones.",
    reward: defaultReward("intermediate"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "ia-top-de-sql-server",
    section,
    title: "El TOP de SQL Server",
    difficulty: "intermediate",
    estimated_minutes: 10,
    concepts: ["limit", "order_by", "group_by", "inner_join", "date_functions"],
    dataset: { slug: "pidelo", version: 1 },
    tables_used: ["orders", "restaurants", "cities"],
    scenario_md: `El departamento de Operaciones de **Pídelo** va a reconocer a los diez restaurantes con más entregas de agosto de 2025 en su reunión con socios. Un analista le pidió la lista a un asistente de IA y la IA respondió esto:

\`\`\`sql
SELECT TOP 10 r.name AS restaurante, COUNT(*) AS entregas
FROM orders o
JOIN restaurants r ON r.id = o.restaurant_id
WHERE o.status = 'delivered'
  AND o.placed_at >= DATEADD(month, -1, GETDATE())
GROUP BY r.name
ORDER BY entregas DESC;
\`\`\`

La consulta está escrita para SQL Server y PostgreSQL no la ejecuta. Además, aunque se ejecutara, no respondería exactamente lo que se pidió. Operaciones necesita la lista correcta para imprimir los reconocimientos y te pide que la corrijas.`,
    business_question_md:
      "Debes generar un dataset que liste los 10 restaurantes con más pedidos cuyo `status` es igual al texto `'delivered'` y cuyo `placed_at` está desde el 2025-08-01 00:00 inclusive hasta el 2025-09-01 00:00 exclusive, en UTC. Devuelve el `id` del restaurante bajo el encabezado `restaurant_id`, su `name` bajo el encabezado `restaurante`, el `name` de su ciudad (tabla `cities`) bajo el encabezado `ciudad` y la cantidad de pedidos bajo el encabezado `entregas`. Ordena por `entregas` descendente y, si dos restaurantes tienen la misma cantidad, debes desempatar usando `restaurant_id` ascendente. Ese desempate decide qué restaurante ocupa el décimo lugar.",
    learning_objective:
      "Traducir TOP y GETDATE de SQL Server a PostgreSQL y reemplazar una fecha relativa por el período fijo que pidió el negocio, con un desempate explícito.",
    theory_ref: dialectos,
    expected_columns: [
      { name: "restaurant_id", type: "integer" },
      { name: "restaurante", type: "text" },
      { name: "ciudad", type: "text" },
      { name: "entregas", type: "integer" },
    ],
    validation_rules: {
      order_matters: true,
      required_concepts: ["group_by", "inner_join"],
    },
    reference_solution: `SELECT
  r.id AS restaurant_id,
  r.name AS restaurante,
  c.name AS ciudad,
  count(*) AS entregas
FROM orders AS o
INNER JOIN restaurants AS r ON r.id = o.restaurant_id
INNER JOIN cities AS c ON c.id = r.city_id
WHERE o.status = 'delivered'
  AND o.placed_at >= timestamptz '2025-08-01 00:00:00+00'
  AND o.placed_at < timestamptz '2025-09-01 00:00:00+00'
GROUP BY r.id, r.name, c.name
ORDER BY entregas DESC, r.id
LIMIT 10;`,
    alternative_solutions: [
      {
        label: "FETCH FIRST, la forma estándar de limitar filas",
        sql: `SELECT r.id AS restaurant_id, r.name AS restaurante, c.name AS ciudad, count(*) AS entregas
FROM orders AS o
INNER JOIN restaurants AS r ON r.id = o.restaurant_id
INNER JOIN cities AS c ON c.id = r.city_id
WHERE o.status = 'delivered'
  AND o.placed_at >= '2025-08-01'
  AND o.placed_at < '2025-09-01'
GROUP BY r.id, r.name, c.name
ORDER BY entregas DESC, r.id
FETCH FIRST 10 ROWS ONLY;`,
      },
      {
        label: "Agregar primero y numerar con row_number",
        sql: `WITH entregas AS (
  SELECT restaurant_id, count(*) AS entregas
  FROM orders
  WHERE status = 'delivered'
    AND placed_at >= timestamptz '2025-08-01 00:00:00+00'
    AND placed_at < timestamptz '2025-09-01 00:00:00+00'
  GROUP BY restaurant_id
),
numerados AS (
  SELECT restaurant_id, entregas,
         row_number() OVER (ORDER BY entregas DESC, restaurant_id) AS puesto
  FROM entregas
)
SELECT n.restaurant_id, r.name AS restaurante, c.name AS ciudad, n.entregas
FROM numerados AS n
INNER JOIN restaurants AS r ON r.id = n.restaurant_id
INNER JOIN cities AS c ON c.id = r.city_id
WHERE n.puesto <= 10
ORDER BY n.puesto;`,
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Hay dos problemas distintos. Uno es de dialecto: tres construcciones son de SQL Server. El otro es un supuesto: la IA interpretó «agosto» como «el último mes contado desde hoy». Resuelve los dos y agrega lo que la IA no definió: qué pasa cuando varios restaurantes empatan en el décimo lugar.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "`TOP` es la forma de SQL Server de limitar filas: en PostgreSQL se limita al final de la consulta. `DATEADD(month, -1, GETDATE())` no conviene traducirlo, porque «el último mes desde hoy» no es agosto de 2025: reemplázalo por un rango fijo y semiabierto. Agrupa por el `id` del restaurante, que es lo que lo identifica, y úsalo también para desempatar.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT r.id AS restaurant_id, r.name AS restaurante, c.name AS ciudad, count(*) AS entregas\nFROM orders AS o\nINNER JOIN restaurants AS r ON r.id = o.restaurant_id\nINNER JOIN cities AS c ON c.id = r.city_id\nWHERE o.status = 'delivered'\n  AND o.placed_at >= ___\n  AND o.placed_at < ___\nGROUP BY r.id, r.name, c.name\nORDER BY entregas DESC, ___\n___ 10;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "date_boundary",
        description_md:
          "Traducir `DATEADD(month, -1, GETDATE())` literalmente a `now() - interval '1 month'`. La consulta se ejecuta, pero cuenta el último mes desde hoy y no agosto de 2025, así que devuelve otros restaurantes o ninguno.",
      },
      {
        category: "wrong_order",
        description_md:
          "Ordenar solo por `entregas DESC`. Siete restaurantes empatan con 8 entregas y solo uno entra en el décimo lugar: sin `restaurant_id` como desempate, cuál entra depende del azar del motor.",
      },
      {
        category: "missing_filter",
        description_md:
          "Quitar el filtro `status = 'delivered'` al reescribir la consulta. Los pedidos cancelados entran en el conteo y cambian el orden de la lista.",
      },
      {
        category: "aggregation_level",
        description_md:
          "Agrupar solo por `r.name`, como hizo la IA. Si dos restaurantes se llamaran igual, sus entregas se sumarían en una sola fila. El `id` es lo que identifica a un restaurante.",
      },
    ],
    expert_explanation_md:
      'El resultado de la consulta da 10 filas: dos restaurantes con 10 entregas, siete con 9 y, en el décimo lugar, **Fuego Medina 28**, el de `restaurant_id` más bajo entre los siete que tienen 8.\n\nLa consulta de la IA tenía dos problemas de naturaleza distinta.\n\n**El dialecto.** `SELECT TOP 10` es la forma de SQL Server de limitar filas; PostgreSQL no la reconoce y el simulador responde que no pudo interpretar la consulta. El equivalente es `LIMIT 10` al final, o `FETCH FIRST 10 ROWS ONLY`, que es la forma del estándar SQL y también funciona en PostgreSQL. `DATEADD` y `GETDATE()` tampoco existen. Cuando corriges el `TOP`, PostgreSQL responde `column "month" does not exist`: lee `month`, el primer argumento de `DATEADD`, como el nombre de una columna. Es un mensaje engañoso, porque la causa es la función de SQL Server y no una columna faltante. `GETDATE()` equivale a `now()`.\n\n**El supuesto.** Aunque tradujeras `GETDATE()` a `now()`, la consulta seguiría mal. `DATEADD(month, -1, GETDATE())` significa «desde hace un mes», contado desde el momento en que se ejecuta. El pedido era agosto de 2025, un período fijo. Con una fecha relativa, el mismo reporte da resultados distintos según el día en que lo corras, y hoy no devuelve ninguna fila, porque los datos de Pídelo terminan en septiembre de 2025. Cuando la IA usa la fecha actual, pregúntate si el pedido hablaba de «hoy» o de un período con nombre.\n\n**El empate que la IA no vio.** Siete restaurantes terminan agosto con 8 entregas y solo cabe uno. `ORDER BY entregas DESC` sin otra clave deja la elección al motor, y la lista impresa podría cambiar entre dos ejecuciones. Por eso el enunciado fija el desempate por `restaurant_id`. En un reconocimiento real conviene además avisarle a Operaciones que el décimo lugar está empatado: quizás prefieran reconocer a los siete.\n\nLa alternativa con `row_number()` es más larga, pero deja el puesto en una columna, algo útil si después quieres mostrarlo o filtrar otros rangos.',
    reward: defaultReward("intermediate"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "ia-columna-que-no-existe",
    section,
    title: "La columna que no existe",
    difficulty: "intermediate",
    estimated_minutes: 12,
    concepts: ["inner_join", "aggregate", "group_by", "where", "date_functions"],
    dataset: { slug: "bolsillo", version: 1 },
    tables_used: ["transactions", "accounts", "users", "merchants"],
    scenario_md: `El departamento de Riesgo de **Bolsillo** quiere saber desde qué países se hacen los pagos con tarjeta en comercios online. Una analista pegó el pedido en un asistente de IA sin incluir el esquema de las tablas, y la IA respondió esto:

\`\`\`sql
SELECT u.country AS pais, COUNT(*) AS pagos
FROM transactions t
JOIN users u ON u.id = t.user_id
JOIN merchants m ON m.id = t.merchant_id
WHERE t.kind = 'card_payment'
  AND t.status = 'completed'
  AND m.online = true
  AND t.created_at >= '2025-08-01'
  AND t.created_at < '2025-09-01'
GROUP BY u.country
ORDER BY pais;
\`\`\`

PostgreSQL responde \`column t.user_id does not exist\`. La IA escribió los nombres que le parecieron lógicos, pero en Bolsillo no todos existen. Riesgo necesita el dato esta semana y te pide que corrijas la consulta usando el esquema real.`,
    business_question_md:
      "Debes generar un dataset que devuelva, para cada `country` de la tabla `users` (el país de la persona dueña de la cuenta, no el del comercio), el país bajo el encabezado `pais` y la cantidad de transacciones bajo el encabezado `pagos`. Cuenta solo las transacciones cuyo `kind` es igual al texto `'card_payment'`, cuyo `status` es igual al texto `'completed'`, hechas en comercios que tienen `is_online` en `true` y con `created_at` desde el 2025-08-01 00:00 inclusive hasta el 2025-09-01 00:00 exclusive, en UTC. Solo aparecen los países con al menos un pago. Ordena por `pais` ascendente.",
    learning_objective:
      "Corregir columnas inventadas por una IA reconstruyendo, desde el esquema, el camino de joins entre transacciones, cuentas y personas usuarias.",
    theory_ref: dialectos,
    expected_columns: [
      { name: "pais", type: "text" },
      { name: "pagos", type: "integer" },
    ],
    validation_rules: {
      order_matters: true,
      required_concepts: ["inner_join", "group_by"],
    },
    reference_solution: `SELECT u.country AS pais, count(*) AS pagos
FROM transactions AS t
INNER JOIN accounts AS a ON a.id = t.account_id
INNER JOIN users AS u ON u.id = a.user_id
INNER JOIN merchants AS m ON m.id = t.merchant_id
WHERE t.kind = 'card_payment'
  AND t.status = 'completed'
  AND m.is_online
  AND t.created_at >= timestamptz '2025-08-01 00:00:00+00'
  AND t.created_at < timestamptz '2025-09-01 00:00:00+00'
GROUP BY u.country
ORDER BY pais;`,
    alternative_solutions: [
      {
        label: "El comercio online como condición con EXISTS",
        sql: `SELECT u.country AS pais, count(*) AS pagos
FROM transactions AS t
INNER JOIN accounts AS a ON a.id = t.account_id
INNER JOIN users AS u ON u.id = a.user_id
WHERE t.kind = 'card_payment'
  AND t.status = 'completed'
  AND t.created_at >= '2025-08-01'
  AND t.created_at < '2025-09-01'
  AND EXISTS (
    SELECT 1 FROM merchants AS m WHERE m.id = t.merchant_id AND m.is_online = true
  )
GROUP BY u.country
ORDER BY pais;`,
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "El mensaje de error señala una columna que no existe, pero puede no ser la única. Antes de cambiar nada, revisa en el esquema cada columna que usa la consulta y cómo se llega desde una transacción hasta la persona que la hizo.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "`transactions` no tiene `user_id`: tiene `account_id`, que apunta a `accounts.id`, y `accounts.user_id` apunta a `users.id`. Hacen falta dos joins para llegar al país. Además, en `merchants` la columna se llama `is_online`, no `online`.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT u.country AS pais, count(*) AS pagos\nFROM transactions AS t\nINNER JOIN ___ AS a ON a.id = t.___\nINNER JOIN users AS u ON u.id = a.___\nINNER JOIN merchants AS m ON m.id = t.merchant_id\nWHERE t.kind = 'card_payment'\n  AND t.status = 'completed'\n  AND m.___\n  AND t.created_at >= '2025-08-01'\n  AND t.created_at < '2025-09-01'\nGROUP BY u.country\nORDER BY pais;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "join_condition",
        description_md:
          "Unir `users` directamente con `u.id = t.account_id`. La consulta se ejecuta, pero compara el número de cuenta con el número de persona, que son cosas distintas, y atribuye cada pago a una persona equivocada.",
      },
      {
        category: "wrong_columns",
        description_md:
          "Agrupar por `m.country`, el país del comercio, para evitar el join con `accounts`. Es otra pregunta: Riesgo pidió el país de quien paga.",
      },
      {
        category: "syntax",
        description_md:
          "Corregir `t.user_id` y dejar `m.online`. PostgreSQL se detiene en el primer error, así que después de arreglar uno aparece `column m.online does not exist`.",
      },
      {
        category: "missing_filter",
        description_md:
          "Omitir `status = 'completed'`. Los pagos fallidos, pendientes y revertidos entran en el conteo.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 5 filas, una por país con pagos: Argentina (`'AR'`), Chile (`'CL'`), Colombia (`'CO'`), México (`'MX'`) y Perú (`'PE'`), que en la columna `country` aparecen con su código de dos letras. En agosto de 2025 hubo 60 pagos con tarjeta completados en comercios online.\n\nLa IA inventó dos nombres. `transactions.user_id` suena lógico, porque cada pago lo hace una persona, pero en Bolsillo una transacción pertenece a una **cuenta** (`transactions.account_id` apunta a `accounts.id`) y la cuenta pertenece a una **persona** (`accounts.user_id` apunta a `users.id`). Una persona puede tener varias cuentas, una por moneda, y por eso el esquema separa las dos tablas. El segundo nombre inventado es `merchants.online`, que en realidad se llama `is_online`, la convención del esquema para columnas de tipo verdadero o falso.\n\nPostgreSQL informa un error por vez: primero `column t.user_id does not exist` y, cuando lo corriges, `column m.online does not exist`. Por eso conviene revisar todas las columnas contra el panel «Definiciones de tablas» antes de volver a ejecutar, en lugar de corregir mensaje por mensaje.\n\nEl join con `accounts` no multiplica filas: cada transacción tiene una sola cuenta y cada cuenta una sola persona, así que el conteo se mantiene. Es un buen momento para aplicar el control de filas por paso: 60 transacciones antes de unir con `users` y 60 después.\n\nSi le devuelves el error a la IA, dale también el esquema real de `transactions`, `accounts` y `merchants`. Sin eso, lo más probable es que reemplace un nombre inventado por otro.",
    reward: defaultReward("intermediate"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "ia-borde-del-mes",
    section,
    title: "El borde del mes",
    difficulty: "intermediate",
    estimated_minutes: 10,
    concepts: ["date_functions", "where", "aggregate", "group_by", "distinct"],
    dataset: { slug: "bolsillo", version: 1 },
    tables_used: ["transactions"],
    scenario_md: `El departamento de Finanzas de **Bolsillo** está cerrando agosto de 2025. Para el informe de cierre necesita saber cuántos movimientos completados hubo de cada tipo y cuántas cuentas distintas los hicieron. Una IA respondió esto:

\`\`\`sql
SELECT kind, COUNT(*) AS movimientos, COUNT(DISTINCT account_id) AS cuentas
FROM transactions
WHERE status = 'completed'
  AND created_at BETWEEN '2025-08-01' AND '2025-08-31'
GROUP BY kind
ORDER BY kind;
\`\`\`

La consulta se ejecuta sin errores y los números parecen razonables. Antes de enviar el cierre, Finanzas te pide que la revises y entregues los números correctos.`,
    business_question_md:
      "Debes generar un dataset que devuelva una fila por `kind` de la tabla `transactions`, con la columna `kind` bajo el encabezado `kind`, la cantidad de transacciones bajo el encabezado `movimientos` y la cantidad de `account_id` distintos bajo el encabezado `cuentas`. Cuenta solo las transacciones cuyo `status` es igual al texto `'completed'` y cuyo `created_at` cae en cualquier momento de agosto de 2025, del 1 al 31 inclusive, en UTC: el 31 de agosto cuenta completo, hasta las 23:59:59 y sus fracciones de segundo. Ordena por `kind` ascendente.",
    learning_objective:
      "Detectar que BETWEEN con fechas sobre una columna timestamptz deja afuera el último día y reemplazarlo por un rango semiabierto.",
    theory_ref: verificar,
    expected_columns: [
      { name: "kind", type: "text" },
      { name: "movimientos", type: "integer" },
      { name: "cuentas", type: "integer" },
    ],
    validation_rules: {
      order_matters: true,
      required_concepts: ["group_by"],
    },
    reference_solution: `SELECT
  kind,
  count(*) AS movimientos,
  count(DISTINCT account_id) AS cuentas
FROM transactions
WHERE status = 'completed'
  AND created_at >= timestamptz '2025-08-01 00:00:00+00'
  AND created_at < timestamptz '2025-09-01 00:00:00+00'
GROUP BY kind
ORDER BY kind;`,
    alternative_solutions: [
      {
        label: "BETWEEN sobre la fecha, después de convertirla a date en UTC",
        sql: `SELECT kind, count(*) AS movimientos, count(DISTINCT account_id) AS cuentas
FROM transactions
WHERE status = 'completed'
  AND (created_at AT TIME ZONE 'UTC')::date BETWEEN DATE '2025-08-01' AND DATE '2025-08-31'
GROUP BY kind
ORDER BY kind;`,
      },
      {
        label: "date_trunc por mes",
        sql: `SELECT kind, count(*) AS movimientos, count(DISTINCT account_id) AS cuentas
FROM transactions
WHERE status = 'completed'
  AND date_trunc('month', created_at AT TIME ZONE 'UTC') = TIMESTAMP '2025-08-01 00:00:00'
GROUP BY kind
ORDER BY kind;`,
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "La consulta no tiene errores de sintaxis ni de join. Mira el tipo de la columna que filtra el período y pregúntate a qué instante exacto corresponde el extremo final del rango.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "`created_at` es `timestamptz`, así que `'2025-08-31'` se interpreta como el 31 de agosto a las 00:00. `BETWEEN` incluye ese instante y nada de lo que pasó después durante ese día. Usa un rango semiabierto: desde el primer instante de agosto inclusive hasta el primer instante de septiembre exclusive.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT kind, count(*) AS movimientos, count(DISTINCT account_id) AS cuentas\nFROM transactions\nWHERE status = 'completed'\n  AND created_at ___ '2025-08-01'\n  AND created_at ___ '___'\nGROUP BY kind\nORDER BY kind;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "date_boundary",
        description_md:
          "Dejar `BETWEEN '2025-08-01' AND '2025-08-31'`. El extremo final es la medianoche del 31, y todo lo que ocurrió ese día después de las 00:00 queda afuera.",
      },
      {
        category: "date_boundary",
        description_md:
          "Parchar con `BETWEEN '2025-08-01' AND '2025-08-31 23:59:59'`. Los datos tienen milésimas de segundo, así que un movimiento a las 23:59:59.5 queda afuera. El rango semiabierto no depende de la precisión.",
      },
      {
        category: "date_boundary",
        description_md:
          "Cambiar el extremo a `'2025-09-01'` y dejar `BETWEEN`. Como `BETWEEN` incluye los dos extremos, entraría cualquier movimiento registrado exactamente a las 00:00 del 1 de septiembre.",
      },
      {
        category: "missing_filter",
        description_md:
          "Olvidar `status = 'completed'` al reescribir el filtro. Los movimientos fallidos y pendientes no forman parte del cierre.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 8 filas, una por tipo de movimiento. La consulta de la IA devuelve los mismos 8 tipos, pero en siete de ellos los números son más bajos: el 31 de agosto hubo 30 movimientos completados que el `BETWEEN` deja afuera. Por ejemplo, las recargas (`'topup'`) son 480 y la IA informaba 471. Solo los reversos (`'reversal'`) coinciden, porque ninguno ocurrió el 31.\n\nEste es el error de fechas más frecuente en consultas escritas por IA y por personas. `created_at` es de tipo `timestamptz`, es decir, un instante con fecha, hora y zona horaria. Cuando lo comparas con el texto `'2025-08-31'`, PostgreSQL lo convierte en el 31 de agosto a las 00:00:00 en la zona de la sesión, que en este simulador es UTC. `BETWEEN a AND b` equivale a `>= a AND <= b`, así que el rango termina en el primer instante del 31.\n\nLo que hace peligroso a este error es que no se nota. El resultado tiene las filas esperadas y cifras que parecen razonables. Solo lo detecta el control de bordes de fecha: comparar el conteo del último día o calcular el mes por un segundo camino, como la alternativa con `date_trunc`.\n\nEl rango semiabierto (`>= '2025-08-01'` y `< '2025-09-01'`) es la forma robusta: funciona igual con fechas y con marcas de tiempo, no depende de cuántos decimales tengan los segundos y sirve para cualquier mes sin pensar si tiene 30 o 31 días. Convertir a `date` primero, como en la primera alternativa, también es correcto, pero impide que el motor use un índice sobre `created_at`, algo que en tablas grandes importa.",
    reward: defaultReward("intermediate"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "ia-supuesto-silencioso",
    section,
    title: "El supuesto silencioso",
    difficulty: "advanced",
    estimated_minutes: 12,
    concepts: ["outer_join", "aggregate", "group_by", "null_handling", "numeric_functions"],
    dataset: { slug: "ritmo", version: 1 },
    tables_used: ["users", "playlists"],
    scenario_md: `El departamento de Producto de **Ritmo** evalúa si vale la pena promover la creación de playlists en cada país. Para decidirlo necesita saber cuántos oyentes hay por país, cuántos de ellos no tienen ninguna playlist y cuántas playlists hay por oyente. Una IA respondió esto:

\`\`\`sql
SELECT u.country AS pais,
       COUNT(DISTINCT u.id) AS oyentes,
       COUNT(*) AS playlists,
       ROUND(COUNT(*)::numeric / COUNT(DISTINCT u.id), 2) AS playlists_por_oyente
FROM users u
JOIN playlists p ON p.user_id = u.id
GROUP BY u.country
ORDER BY pais;
\`\`\`

La consulta se ejecuta y los números parecen razonables. Pero Producto pidió **todos** los oyentes, incluidos los que nunca crearon una playlist, y te pide el reporte completo.`,
    business_question_md:
      "Debes generar un dataset con una fila por `country` de la tabla `users`, bajo el encabezado `pais`, con estas columnas: `oyentes` (cantidad de oyentes del país, todos, tengan o no playlists), `oyentes_sin_playlist` (cuántos de esos oyentes no tienen ninguna fila en `playlists`), `playlists` (cantidad de playlists de los oyentes del país) y `playlists_por_oyente` (`playlists` dividido `oyentes`, redondeado a 2 decimales). Ordena por `pais` ascendente.",
    learning_objective:
      "Detectar el INNER JOIN que una IA eligió sin avisar, conservar las filas sin coincidencia y contar correctamente con LEFT JOIN.",
    theory_ref: supuestos,
    expected_columns: [
      { name: "pais", type: "text" },
      { name: "oyentes", type: "integer" },
      { name: "oyentes_sin_playlist", type: "integer" },
      { name: "playlists", type: "integer" },
      { name: "playlists_por_oyente", type: "numeric" },
    ],
    validation_rules: {
      order_matters: true,
      required_concepts: ["group_by"],
    },
    reference_solution: `SELECT
  u.country AS pais,
  count(DISTINCT u.id) AS oyentes,
  count(DISTINCT u.id) FILTER (WHERE p.id IS NULL) AS oyentes_sin_playlist,
  count(p.id) AS playlists,
  round(count(p.id)::numeric / count(DISTINCT u.id), 2) AS playlists_por_oyente
FROM users AS u
LEFT JOIN playlists AS p ON p.user_id = u.id
GROUP BY u.country
ORDER BY pais;`,
    alternative_solutions: [
      {
        label: "Agregar las playlists por oyente antes de unir",
        sql: `WITH por_oyente AS (
  SELECT u.id, u.country, count(p.id) AS playlists
  FROM users AS u
  LEFT JOIN playlists AS p ON p.user_id = u.id
  GROUP BY u.id, u.country
)
SELECT
  country AS pais,
  count(*) AS oyentes,
  count(*) FILTER (WHERE playlists = 0) AS oyentes_sin_playlist,
  sum(playlists) AS playlists,
  round(sum(playlists)::numeric / count(*), 2) AS playlists_por_oyente
FROM por_oyente
GROUP BY country
ORDER BY pais;`,
      },
      {
        label: "Subconsulta correlacionada por oyente",
        sql: `WITH por_oyente AS (
  SELECT u.country,
         (SELECT count(*) FROM playlists AS p WHERE p.user_id = u.id) AS playlists
  FROM users AS u
)
SELECT
  country AS pais,
  count(*) AS oyentes,
  sum(CASE WHEN playlists = 0 THEN 1 ELSE 0 END) AS oyentes_sin_playlist,
  sum(playlists) AS playlists,
  round(avg(playlists), 2) AS playlists_por_oyente
FROM por_oyente
GROUP BY country
ORDER BY pais;`,
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Pregúntate quién queda afuera del resultado de la IA. El tipo de join decide qué pasa con los oyentes que no tienen pareja en la otra tabla, y ese es el supuesto que la IA tomó sin avisar.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Cambia a `LEFT JOIN playlists`, que conserva a todos los oyentes. Con ese join, un oyente sin playlists llega como una fila con las columnas de `playlists` en NULL: cuenta las playlists con `count(p.id)`, no con `count(*)`. Para los oyentes sin playlist, cuenta los `u.id` distintos cuyo `p.id` es NULL.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT\n  u.country AS pais,\n  count(DISTINCT u.id) AS oyentes,\n  count(DISTINCT u.id) FILTER (WHERE ___) AS oyentes_sin_playlist,\n  count(___) AS playlists,\n  round(count(___)::numeric / count(DISTINCT u.id), 2) AS playlists_por_oyente\nFROM users AS u\n___ JOIN playlists AS p ON p.user_id = u.id\nGROUP BY u.country\nORDER BY pais;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "join_condition",
        description_md:
          "Dejar el `INNER JOIN` de la IA. Los oyentes sin playlist desaparecen: el reporte informa 364 oyentes en Argentina cuando hay 905.",
      },
      {
        category: "null_handling",
        description_md:
          "Cambiar a `LEFT JOIN` y dejar `count(*)`. Cada oyente sin playlist aporta una fila vacía que `count(*)` cuenta como una playlist, y el total de Argentina sube de 636 a 1177.",
      },
      {
        category: "aggregation_level",
        description_md:
          "Contar oyentes con `count(*)` después del `LEFT JOIN`. Un oyente con tres playlists aparece en tres filas y se cuenta tres veces.",
      },
      {
        category: "cell_values",
        description_md:
          "Calcular `playlists_por_oyente` con la división entera `count(p.id) / count(DISTINCT u.id)`. Da 0 en todos los países, porque en PostgreSQL la división entre enteros descarta los decimales.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 6 filas, una por país. En todos los países, más de la mitad de los oyentes no tiene ninguna playlist: en Argentina son 541 de 905.\n\nLa consulta de la IA no tenía errores de sintaxis. Tenía un **supuesto silencioso**: el `INNER JOIN` conserva solo a los oyentes que tienen al menos una playlist. Nadie decidió excluir a los demás, pero el reporte los excluía, y con ellos desaparecía justamente el dato que Producto necesitaba para decidir si promover las playlists. El promedio también cambiaba de sentido: 1,75 playlists por oyente en Argentina según la IA, frente a 0,70 contando a todos. El primero es un promedio entre quienes ya crearon alguna; el segundo es el que pidió el negocio.\n\nLa corrección tiene dos partes que suelen fallar por separado:\n\n1. **`LEFT JOIN`** conserva a todos los oyentes. Los que no tienen playlist llegan con las columnas de `playlists` en NULL.\n2. **`count(p.id)`** cuenta solo los valores que no son NULL, así que un oyente sin playlist aporta 0. Con `count(*)` aportaría 1, porque la fila existe aunque esté vacía.\n\n`count(DISTINCT u.id) FILTER (WHERE p.id IS NULL)` cuenta a los oyentes cuya única fila es la vacía. `FILTER` es una forma compacta de agregación condicional; la alternativa con `CASE` dentro de `sum` es equivalente.\n\nLa versión que agrega por oyente antes de agregar por país es más larga, pero cada paso tiene un grano claro: primero una fila por oyente, después una fila por país. Es la que conviene cuando el reporte crece con más métricas por oyente.",
    reward: defaultReward("advanced"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "ia-ingreso-duplicado",
    section,
    title: "El ingreso que la IA duplicó",
    difficulty: "advanced",
    estimated_minutes: 12,
    concepts: ["inner_join", "aggregate", "group_by", "cte", "date_functions"],
    dataset: { slug: "tiendaviva", version: 1 },
    tables_used: ["orders", "order_items"],
    scenario_md: `El departamento de Finanzas de **TiendaViva** prepara el cierre de julio de 2025 para Colombia. Pide, por canal de venta, cuántos pedidos entregados hubo, cuántas unidades se vendieron y cuánto se facturó. Una IA respondió esto:

\`\`\`sql
SELECT o.channel AS canal,
       COUNT(*) AS pedidos,
       SUM(oi.quantity) AS unidades,
       SUM(o.total_amount) AS ingreso
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
WHERE o.status = 'delivered'
  AND o.currency = 'COP'
  AND o.created_at >= '2025-07-01'
  AND o.created_at < '2025-08-01'
GROUP BY o.channel
ORDER BY canal;
\`\`\`

Según esta consulta, el canal \`'app'\` facturó más de 279 millones de pesos colombianos, pero el registro contable de Finanzas indica unos 107 millones para ese canal. Finanzas te pide encontrar el error y entregar el reporte correcto.`,
    business_question_md:
      "Debes generar un dataset con una fila por `channel`, bajo el encabezado `canal`, para los pedidos cuyo `status` es igual al texto `'delivered'`, cuya `currency` es igual al texto `'COP'` y cuyo `created_at` está desde el 2025-07-01 00:00 inclusive hasta el 2025-08-01 00:00 exclusive, en UTC. Columnas: `pedidos` (cantidad de pedidos, cada uno contado una sola vez), `unidades` (suma de `order_items.quantity` de esos pedidos) e `ingreso` (suma de `orders.total_amount`, con cada pedido sumado una sola vez). Ordena por `canal` ascendente.",
    learning_objective:
      "Detectar que una IA sumó una columna de pedido después de unir con sus ítems, y corregirlo agregando cada tabla a su grano antes de unir.",
    theory_ref: verificar,
    expected_columns: [
      { name: "canal", type: "text" },
      { name: "pedidos", type: "integer" },
      { name: "unidades", type: "integer" },
      { name: "ingreso", type: "numeric" },
    ],
    validation_rules: {
      order_matters: true,
      required_concepts: ["group_by"],
    },
    reference_solution: `WITH unidades_por_pedido AS (
  SELECT order_id, sum(quantity) AS unidades
  FROM order_items
  GROUP BY order_id
)
SELECT
  o.channel AS canal,
  count(*) AS pedidos,
  sum(u.unidades) AS unidades,
  sum(o.total_amount) AS ingreso
FROM orders AS o
INNER JOIN unidades_por_pedido AS u ON u.order_id = o.id
WHERE o.status = 'delivered'
  AND o.currency = 'COP'
  AND o.created_at >= timestamptz '2025-07-01 00:00:00+00'
  AND o.created_at < timestamptz '2025-08-01 00:00:00+00'
GROUP BY o.channel
ORDER BY canal;`,
    alternative_solutions: [
      {
        label: "Subconsulta escalar para las unidades de cada pedido",
        sql: `SELECT
  o.channel AS canal,
  count(*) AS pedidos,
  sum((SELECT sum(oi.quantity) FROM order_items AS oi WHERE oi.order_id = o.id)) AS unidades,
  sum(o.total_amount) AS ingreso
FROM orders AS o
WHERE o.status = 'delivered'
  AND o.currency = 'COP'
  AND o.created_at >= '2025-07-01'
  AND o.created_at < '2025-08-01'
GROUP BY o.channel
ORDER BY canal;`,
      },
      {
        label: "Dos agregados por canal, unidos al final",
        sql: `WITH pedidos AS (
  SELECT id, channel, total_amount
  FROM orders
  WHERE status = 'delivered'
    AND currency = 'COP'
    AND created_at >= timestamptz '2025-07-01 00:00:00+00'
    AND created_at < timestamptz '2025-08-01 00:00:00+00'
),
por_canal AS (
  SELECT channel, count(*) AS pedidos, sum(total_amount) AS ingreso
  FROM pedidos
  GROUP BY channel
),
unidades AS (
  SELECT p.channel, sum(oi.quantity) AS unidades
  FROM pedidos AS p
  INNER JOIN order_items AS oi ON oi.order_id = p.id
  GROUP BY p.channel
)
SELECT c.channel AS canal, c.pedidos, u.unidades, c.ingreso
FROM por_canal AS c
INNER JOIN unidades AS u ON u.channel = c.channel
ORDER BY canal;`,
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Aplica el control de grano: después del join, ¿qué representa una fila? Si la respuesta no es «un pedido», revisa cada columna del resultado y decide cuál sigue siendo correcta y cuál no.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Después de unir con `order_items`, cada pedido aparece una vez por línea. `sum(oi.quantity)` está bien, porque la cantidad es un dato de la línea. `count(*)` y `sum(o.total_amount)` están mal, porque repiten el pedido. Suma las unidades por pedido en una CTE (una fila por pedido) y une ese resultado con `orders`.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nWITH unidades_por_pedido AS (\n  SELECT order_id, ___(quantity) AS unidades\n  FROM order_items\n  GROUP BY ___\n)\nSELECT\n  o.channel AS canal,\n  count(*) AS pedidos,\n  sum(u.unidades) AS unidades,\n  sum(o.total_amount) AS ingreso\nFROM orders AS o\nINNER JOIN unidades_por_pedido AS u ON u.order_id = ___\nWHERE o.status = 'delivered'\n  AND o.currency = 'COP'\n  AND o.created_at >= '2025-07-01'\n  AND o.created_at < '2025-08-01'\nGROUP BY o.channel\nORDER BY canal;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "aggregation_level",
        description_md:
          "Cambiar `count(*)` por `count(DISTINCT o.id)` y dejar `sum(o.total_amount)`. El conteo de pedidos queda bien, pero el ingreso sigue sumando cada pedido una vez por línea.",
      },
      {
        category: "duplicates",
        description_md:
          "Usar `sum(DISTINCT o.total_amount)`. Si dos pedidos distintos tienen el mismo total, uno de ellos se descarta y el ingreso queda más bajo que el real.",
      },
      {
        category: "cell_values",
        description_md:
          "Quitar el join con `order_items` para arreglar el ingreso y perder la columna `unidades`, que es un dato de las líneas.",
      },
      {
        category: "missing_filter",
        description_md:
          "Quitar `currency = 'COP'`. El reporte suma pesos colombianos con pesos mexicanos, argentinos y otras monedas.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 3 filas, una por canal. El canal `'app'` tuvo 66 pedidos entregados en julio de 2025 en Colombia, que suman 106 962 346,86 pesos. La IA informaba 118 pedidos y 279 305 103,16 pesos.\n\nEl error no es de sintaxis: es de **grano**, es decir, de qué representa una fila. Después de `JOIN order_items`, cada fila es una línea de pedido, no un pedido. Un pedido con tres líneas aparece tres veces, y cada columna del resultado reacciona de forma distinta:\n\n- `sum(oi.quantity)` **está bien**: la cantidad es un dato de la línea y cada línea se suma una vez.\n- `count(*)` **está mal**: cuenta líneas, no pedidos.\n- `sum(o.total_amount)` **está mal**: el total del pedido se suma una vez por cada línea.\n\nPor eso la corrección no consiste en quitar el join, porque las unidades lo necesitan, sino en unir tablas que tengan el mismo grano. La CTE `unidades_por_pedido` reduce `order_items` a una fila por pedido antes del join, y a partir de ahí cada pedido cuenta una sola vez en las tres columnas.\n\nLa pista que tenía Finanzas, un total contable de referencia, es exactamente la consulta de control de la lección 3: una cifra calculada por otro camino que tiene que coincidir. Cuando no la tengas, `sum(total_amount)` sobre `orders` sola, con los mismos filtros, cumple la misma función.\n\n`sum(DISTINCT o.total_amount)` parece una solución rápida y es un error nuevo: descarta pedidos distintos que tienen el mismo total. La alternativa con dos agregados por canal es más larga, pero deja cada métrica en la tabla donde vive, y se lee bien cuando el reporte crece.",
    reward: defaultReward("advanced"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "ia-demuestra-el-error-con-numeros",
    section,
    title: "Demuestra el error con números",
    difficulty: "advanced",
    estimated_minutes: 10,
    concepts: ["inner_join", "aggregate", "subquery", "distinct", "date_functions"],
    dataset: { slug: "pidelo", version: 1 },
    tables_used: ["orders", "order_items"],
    scenario_md: `El departamento Comercial de **Pídelo** pidió el GMV de julio de 2025 por ciudad, junto con la cantidad de líneas de pedido. GMV es la sigla de *gross merchandise value*, el valor total de lo vendido. Una IA respondió esto:

\`\`\`sql
SELECT c.name AS ciudad, COUNT(oi.id) AS lineas, SUM(o.total) AS gmv
FROM orders o
JOIN restaurants r ON r.id = o.restaurant_id
JOIN cities c ON c.id = r.city_id
JOIN order_items oi ON oi.order_id = o.id
WHERE o.status = 'delivered'
  AND o.placed_at >= '2025-07-01'
  AND o.placed_at < '2025-08-01'
GROUP BY c.name
ORDER BY ciudad;
\`\`\`

Sospechas que el join con \`order_items\` multiplica los pedidos. La gerenta de Comercial no quiere descartar el reporte por una sospecha: te pide una consulta de control, de una sola fila, que lo demuestre con números.`,
    business_question_md:
      "Debes generar un dataset de una sola fila con tres columnas, todas sobre los pedidos cuyo `status` es igual al texto `'delivered'` y cuyo `placed_at` está desde el 2025-07-01 00:00 inclusive hasta el 2025-08-01 00:00 exclusive, en UTC: `filas_pedidos` (cuántas filas de `orders` cumplen esos filtros, sin ningún join), `filas_tras_join` (cuántas filas quedan después de unir esos pedidos con `order_items` mediante `INNER JOIN`, como hizo la IA) y `pedidos_distintos` (cuántos `orders.id` distintos hay en ese resultado unido).",
    learning_objective:
      "Demostrar con una consulta de control que un join multiplica filas, comparando el conteo antes y después del join con el conteo de claves distintas.",
    theory_ref: verificar,
    expected_columns: [
      { name: "filas_pedidos", type: "integer" },
      { name: "filas_tras_join", type: "integer" },
      { name: "pedidos_distintos", type: "integer" },
    ],
    validation_rules: {
      order_matters: false,
      required_concepts: ["inner_join"],
    },
    reference_solution: `WITH pedidos AS (
  SELECT id
  FROM orders
  WHERE status = 'delivered'
    AND placed_at >= timestamptz '2025-07-01 00:00:00+00'
    AND placed_at < timestamptz '2025-08-01 00:00:00+00'
)
SELECT
  (SELECT count(*) FROM pedidos) AS filas_pedidos,
  count(*) AS filas_tras_join,
  count(DISTINCT p.id) AS pedidos_distintos
FROM pedidos AS p
INNER JOIN order_items AS oi ON oi.order_id = p.id;`,
    alternative_solutions: [
      {
        label: "Tres subconsultas escalares",
        sql: `SELECT
  (SELECT count(*) FROM orders AS o
    WHERE o.status = 'delivered'
      AND o.placed_at >= '2025-07-01' AND o.placed_at < '2025-08-01') AS filas_pedidos,
  (SELECT count(*) FROM orders AS o
    INNER JOIN order_items AS oi ON oi.order_id = o.id
    WHERE o.status = 'delivered'
      AND o.placed_at >= '2025-07-01' AND o.placed_at < '2025-08-01') AS filas_tras_join,
  (SELECT count(DISTINCT o.id) FROM orders AS o
    INNER JOIN order_items AS oi ON oi.order_id = o.id
    WHERE o.status = 'delivered'
      AND o.placed_at >= '2025-07-01' AND o.placed_at < '2025-08-01') AS pedidos_distintos;`,
      },
      {
        label: "Conteos por separado unidos con CROSS JOIN",
        sql: `WITH antes AS (
  SELECT count(*) AS filas_pedidos
  FROM orders
  WHERE status = 'delivered'
    AND placed_at >= timestamptz '2025-07-01 00:00:00+00'
    AND placed_at < timestamptz '2025-08-01 00:00:00+00'
),
despues AS (
  SELECT count(*) AS filas_tras_join, count(DISTINCT o.id) AS pedidos_distintos
  FROM orders AS o
  INNER JOIN order_items AS oi ON oi.order_id = o.id
  WHERE o.status = 'delivered'
    AND o.placed_at >= timestamptz '2025-07-01 00:00:00+00'
    AND o.placed_at < timestamptz '2025-08-01 00:00:00+00'
)
SELECT a.filas_pedidos, d.filas_tras_join, d.pedidos_distintos
FROM antes AS a
CROSS JOIN despues AS d;`,
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Es el primer control de la lección 3: contar filas antes y después del join. El tercer número te dice si el join perdió pedidos o solo los repitió.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Define los pedidos filtrados una sola vez, en una CTE, para que los tres conteos usen exactamente el mismo universo. `filas_pedidos` es `count(*)` sobre esa CTE. Después une la CTE con `order_items` y calcula `count(*)` y `count(DISTINCT p.id)` sobre el resultado: escribe `p.id` y no `id` solo, porque `order_items` también tiene una columna `id`.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nWITH pedidos AS (\n  SELECT id\n  FROM orders\n  WHERE status = 'delivered'\n    AND placed_at >= '2025-07-01'\n    AND placed_at < '2025-08-01'\n)\nSELECT\n  (SELECT ___ FROM pedidos) AS filas_pedidos,\n  ___ AS filas_tras_join,\n  ___ AS pedidos_distintos\nFROM pedidos AS p\nINNER JOIN order_items AS oi ON oi.order_id = ___;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "cell_values",
        description_md:
          "Calcular `filas_pedidos` con `count(*)` sobre el resultado unido. Así los tres números salen del mismo lugar y el control no compara nada.",
      },
      {
        category: "missing_filter",
        description_md:
          "Aplicar los filtros de estado y fecha en un conteo y no en el otro. Los números dejan de ser comparables y la diferencia ya no mide el join.",
      },
      {
        category: "date_boundary",
        description_md:
          "Usar `BETWEEN '2025-07-01' AND '2025-07-31'`. Deja afuera los pedidos del 31 de julio posteriores a la medianoche.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da una sola fila con 1117 pedidos entregados en julio de 2025, que el join con `order_items` convierte en 2784 filas. Los pedidos distintos después del join siguen siendo 1117.\n\nLos tres números juntos cuentan la historia completa:\n\n- **`filas_tras_join` mayor que `filas_pedidos`** demuestra que el join repite pedidos: en promedio, cada pedido aparece unas 2,5 veces, una por línea.\n- **`pedidos_distintos` igual a `filas_pedidos`** demuestra que el join no perdió ningún pedido. Si fuera menor, el `INNER JOIN` estaría descartando pedidos sin líneas, y ese sería un segundo problema.\n\nCon eso, el diagnóstico de la consulta de la IA es directo. `count(oi.id)` está bien, porque cuenta líneas. `sum(o.total)` está mal, porque suma el total de cada pedido una vez por línea: el GMV que informaba la IA para Bogotá era 66 543 955,30, y el real es 22 291 232,60.\n\nLa CTE `pedidos` es la decisión que hace confiable el control: los tres conteos parten del mismo conjunto de pedidos, definido una sola vez. Si repites los filtros en tres lugares, como en la primera alternativa, el control funciona igual, pero un cambio futuro en uno solo de ellos lo rompería sin aviso.\n\nEste tipo de consulta vale más que cualquier argumento. «El join multiplica filas» es una opinión; «1117 pedidos se convierten en 2784 filas» es una prueba que cualquiera puede repetir.",
    reward: defaultReward("advanced"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "ia-empates-ignorados",
    section,
    title: "Empates que la IA ignoró",
    difficulty: "advanced",
    estimated_minutes: 14,
    concepts: ["ranking", "window_function", "cte", "inner_join", "aggregate", "distinct"],
    dataset: { slug: "ritmo", version: 1 },
    tables_used: ["plays", "users", "tracks", "albums", "artists"],
    scenario_md: `El departamento de Contenidos de **Ritmo** arma la portada de septiembre de cada país con los artistas que más oyentes tuvieron en agosto de 2025. La regla que dio la dirección es clara: «si dos artistas empatan en el tercer puesto, van los dos». Una IA respondió esto:

\`\`\`sql
WITH oyentes AS (
  SELECT u.country, ar.name AS artista, COUNT(DISTINCT p.user_id) AS oyentes
  FROM plays p
  JOIN users u ON u.id = p.user_id
  JOIN tracks t ON t.id = p.track_id
  JOIN albums al ON al.id = t.album_id
  JOIN artists ar ON ar.id = al.artist_id
  WHERE p.played_at >= '2025-08-01' AND p.played_at < '2025-09-01'
  GROUP BY u.country, ar.name
),
ranking AS (
  SELECT country AS pais, artista, oyentes,
         ROW_NUMBER() OVER (PARTITION BY country ORDER BY oyentes DESC) AS puesto
  FROM oyentes
)
SELECT pais, puesto, artista, oyentes
FROM ranking
WHERE puesto <= 3
ORDER BY pais, puesto;
\`\`\`

La consulta devuelve exactamente tres artistas por país, y eso parece correcto. Contenidos te pide revisarla antes de publicar la portada.`,
    business_question_md:
      "Debes generar un dataset que devuelva, para cada `country` de la tabla `users` (el país del oyente), los artistas que ocupan los puestos 1 a 3 según la cantidad de oyentes distintos (`plays.user_id` distintos) que reprodujeron alguna de sus canciones con `played_at` desde el 2025-08-01 00:00 inclusive hasta el 2025-09-01 00:00 exclusive, en UTC. Si dos artistas tienen la misma cantidad de oyentes, comparten el puesto, y el puesto siguiente salta, como en una competencia deportiva: 1, 2, 3, 3. Columnas: `pais`, `puesto`, `artista` (el `name` del artista) y `oyentes`. Ordena por `pais`, luego por `puesto` y, si dos artistas comparten el puesto, debes desempatar usando `artista` ascendente.",
    learning_objective:
      "Reconocer que row_number oculta empates y elegir la función de ranking que respeta la regla de negocio.",
    theory_ref: supuestos,
    expected_columns: [
      { name: "pais", type: "text" },
      { name: "puesto", type: "integer" },
      { name: "artista", type: "text" },
      { name: "oyentes", type: "integer" },
    ],
    validation_rules: {
      order_matters: true,
      required_concepts: ["window_function"],
    },
    reference_solution: `WITH oyentes AS (
  SELECT
    u.country,
    ar.id AS artist_id,
    ar.name AS artista,
    count(DISTINCT p.user_id) AS oyentes
  FROM plays AS p
  INNER JOIN users AS u ON u.id = p.user_id
  INNER JOIN tracks AS t ON t.id = p.track_id
  INNER JOIN albums AS al ON al.id = t.album_id
  INNER JOIN artists AS ar ON ar.id = al.artist_id
  WHERE p.played_at >= timestamptz '2025-08-01 00:00:00+00'
    AND p.played_at < timestamptz '2025-09-01 00:00:00+00'
  GROUP BY u.country, ar.id, ar.name
),
ranking AS (
  SELECT
    country AS pais,
    artista,
    oyentes,
    rank() OVER (PARTITION BY country ORDER BY oyentes DESC) AS puesto
  FROM oyentes
)
SELECT pais, puesto, artista, oyentes
FROM ranking
WHERE puesto <= 3
ORDER BY pais, puesto, artista;`,
    alternative_solutions: [
      {
        label: "Sin funciones de ventana: contar cuántos artistas tienen más oyentes",
        sql: `WITH oyentes AS (
  SELECT u.country, ar.id AS artist_id, ar.name AS artista, count(DISTINCT p.user_id) AS oyentes
  FROM plays AS p
  INNER JOIN users AS u ON u.id = p.user_id
  INNER JOIN tracks AS t ON t.id = p.track_id
  INNER JOIN albums AS al ON al.id = t.album_id
  INNER JOIN artists AS ar ON ar.id = al.artist_id
  WHERE p.played_at >= '2025-08-01' AND p.played_at < '2025-09-01'
  GROUP BY u.country, ar.id, ar.name
),
puestos AS (
  SELECT
    o.country AS pais,
    o.artista,
    o.oyentes,
    1 + (SELECT count(*) FROM oyentes AS x
         WHERE x.country = o.country AND x.oyentes > o.oyentes) AS puesto
  FROM oyentes AS o
)
SELECT pais, puesto, artista, oyentes
FROM puestos
WHERE puesto <= 3
ORDER BY pais, puesto, artista;`,
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "La agregación de la IA está bien. El problema está en la función que numera: ¿qué hace cuando dos artistas tienen la misma cantidad de oyentes? Compárala con la regla «si empatan en el tercer puesto, van los dos».",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "`row_number()` numera 1, 2, 3, 4 aunque haya empates, y elige de forma arbitraria cuál de los empatados queda tercero. La regla pide puestos compartidos que después saltan (1, 2, 3, 3, 5): esa es exactamente la función `rank()`. Agrega `artista` al `ORDER BY` final para que el orden de los empatados sea reproducible.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nWITH oyentes AS (\n  -- la misma agregación de la IA, agrupando también por ar.id\n  ...\n),\nranking AS (\n  SELECT country AS pais, artista, oyentes,\n         ___() OVER (PARTITION BY ___ ORDER BY oyentes ___) AS puesto\n  FROM oyentes\n)\nSELECT pais, puesto, artista, oyentes\nFROM ranking\nWHERE puesto <= 3\nORDER BY pais, puesto, ___;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "row_count",
        description_md:
          "Dejar `row_number()`. Devuelve exactamente tres artistas por país y, en Argentina y en Perú, oculta a uno de los dos artistas que empatan en el tercer puesto. Cuál de los dos queda afuera es arbitrario.",
      },
      {
        category: "wrong_order",
        description_md:
          "Ordenar solo por `pais` y `puesto`. Los dos artistas empatados en el tercer puesto pueden salir en cualquier orden entre una ejecución y otra.",
      },
      {
        category: "cell_values",
        description_md:
          "Contar reproducciones con `count(*)` en lugar de oyentes distintos. Un oyente que escuchó veinte canciones de un artista pesaría veinte veces.",
      },
      {
        category: "join_condition",
        description_md:
          "Agrupar por el país del artista (`artists.country`) en lugar del país del oyente. La portada es por país de quien escucha.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 20 filas: tres artistas en cuatro países y cuatro en Argentina y Perú, donde hay un empate en el tercer puesto. En Argentina, **Astro y Faro** y **Tinta de Junio** tuvieron 62 oyentes cada uno; en Perú, **Andénón** y **Viento y Astro** tuvieron 31.\n\nLa consulta de la IA devolvía 18 filas y se veía perfecta: tres artistas por país, como pedía el título. Ese es el problema. `row_number()` asigna números consecutivos sin repetir, así que ante un empate elige a uno de los empatados según el orden en que el motor encuentra las filas y descarta al otro. El artista que quedaba afuera podía cambiar de una ejecución a otra, y la portada publicada dependía de un criterio arbitrario.\n\nLas tres funciones de ranking difieren solo en cómo tratan los empates:\n\n- `row_number()`: 1, 2, 3, 4. Nunca repite, nunca empata.\n- `rank()`: 1, 2, 3, 3, 5. Los empatados comparten puesto y el siguiente salta. Es lo que pidió la dirección.\n- `dense_rank()`: 1, 2, 3, 3, 4. Comparte puesto sin saltar.\n\nEn estos datos `dense_rank()` daría el mismo resultado, porque los únicos empates están en el tercer puesto. Si dos artistas empataran en el primero, `dense_rank()` agregaría un cuarto artista con el puesto 3, y la regla deportiva no lo permite.\n\nLa IA agrupó por `ar.name`. Aquí los nombres no se repiten, pero agrupar también por `ar.id` protege el conteo si algún día dos artistas se llaman igual. La alternativa sin funciones de ventana calcula el puesto como «1 más la cantidad de artistas con más oyentes», que es la definición exacta de `rank()`.",
    reward: defaultReward("advanced"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "ia-auditoria-de-una-respuesta",
    section,
    title: "Auditoría de una respuesta de IA",
    difficulty: "expert",
    estimated_minutes: 30,
    concepts: ["cte", "inner_join", "outer_join", "aggregate", "group_by", "date_functions"],
    dataset: { slug: "pidelo", version: 1 },
    tables_used: ["orders", "order_items", "restaurants", "cities"],
    scenario_md: `La gerencia general de **Pídelo** presenta los resultados del bimestre julio-agosto de 2025 y pide un reporte por ciudad: cuántos pedidos entregados hubo, cuál fue el ticket promedio, cuántas líneas tiene un pedido en promedio y qué porcentaje llegó tarde, es decir, después del tiempo prometido al cliente. Un colega pegó el pedido en un asistente de IA y te pasa la respuesta para que la revises antes de la presentación:

\`\`\`sql
SELECT c.name AS ciudad,
       COUNT(*) AS pedidos,
       ROUND(AVG(o.total), 2) AS ticket_promedio,
       ROUND(COUNT(oi.id) * 1.0 / COUNT(DISTINCT o.id), 2) AS lineas_por_pedido,
       ROUND(100.0 * SUM(CASE WHEN DATEDIFF(minute, o.placed_at, o.delivered_at) > o.promised_minutes
                              THEN 1 ELSE 0 END) / COUNT(*), 1) AS pct_tarde
FROM orders o
JOIN restaurants r ON r.id = o.restaurant_id
JOIN cities c ON c.id = r.city_id
JOIN order_items oi ON oi.order_id = o.id
WHERE o.status = 'delivered'
  AND o.placed_at BETWEEN '2025-07-01' AND '2025-08-31'
GROUP BY c.name
ORDER BY c.name;
\`\`\`

La consulta tiene más de un problema, y no todos producen un mensaje de error. La gerencia necesita el reporte correcto y te pide una auditoría completa.`,
    business_question_md:
      "Debes generar un dataset con una fila por ciudad del restaurante (el `name` de la tabla `cities`, a la que se llega por `restaurants.city_id`), bajo el encabezado `ciudad`. Considera solo los pedidos cuyo `status` es igual al texto `'delivered'` y cuyo `placed_at` cae en julio o agosto de 2025, del 1 de julio al 31 de agosto inclusive, en UTC: el 31 de agosto cuenta completo. Columnas: `pedidos` (cantidad de pedidos), `ticket_promedio` (promedio de `orders.total` por pedido, redondeado a 2 decimales), `lineas_por_pedido` (promedio de filas de `order_items` por pedido, redondeado a 2 decimales) y `pct_tarde` (porcentaje de pedidos cuyo `delivered_at` es posterior a `placed_at` más `promised_minutes` minutos, redondeado a 1 decimal). Cada pedido cuenta una sola vez en todas las columnas. Ordena por `ciudad` ascendente.",
    learning_objective:
      "Auditar una consulta escrita por una IA que combina un error de dialecto, un join que multiplica filas y un borde de fecha, y entregar el reporte corregido.",
    theory_ref: verificar,
    expected_columns: [
      { name: "ciudad", type: "text" },
      { name: "pedidos", type: "integer" },
      { name: "ticket_promedio", type: "numeric" },
      { name: "lineas_por_pedido", type: "numeric" },
      { name: "pct_tarde", type: "numeric" },
    ],
    validation_rules: {
      order_matters: true,
      required_concepts: ["group_by", "inner_join"],
    },
    reference_solution: `WITH lineas AS (
  SELECT order_id, count(*) AS lineas
  FROM order_items
  GROUP BY order_id
)
SELECT
  c.name AS ciudad,
  count(*) AS pedidos,
  round(avg(o.total), 2) AS ticket_promedio,
  round(avg(coalesce(l.lineas, 0)), 2) AS lineas_por_pedido,
  round(
    100.0 * count(*) FILTER (
      WHERE o.delivered_at > o.placed_at + o.promised_minutes * interval '1 minute'
    ) / count(*),
    1
  ) AS pct_tarde
FROM orders AS o
INNER JOIN restaurants AS r ON r.id = o.restaurant_id
INNER JOIN cities AS c ON c.id = r.city_id
LEFT JOIN lineas AS l ON l.order_id = o.id
WHERE o.status = 'delivered'
  AND o.placed_at >= timestamptz '2025-07-01 00:00:00+00'
  AND o.placed_at < timestamptz '2025-09-01 00:00:00+00'
GROUP BY c.name
ORDER BY ciudad;`,
    alternative_solutions: [
      {
        label: "Una fila por pedido en una CTE y después agregar por ciudad",
        sql: `WITH por_pedido AS (
  SELECT
    o.id,
    c.name AS ciudad,
    o.total,
    (SELECT count(*) FROM order_items AS oi WHERE oi.order_id = o.id) AS lineas,
    CASE
      WHEN extract(epoch FROM (o.delivered_at - o.placed_at)) / 60 > o.promised_minutes THEN 1
      ELSE 0
    END AS tarde
  FROM orders AS o
  INNER JOIN restaurants AS r ON r.id = o.restaurant_id
  INNER JOIN cities AS c ON c.id = r.city_id
  WHERE o.status = 'delivered'
    AND o.placed_at >= '2025-07-01'
    AND o.placed_at < '2025-09-01'
)
SELECT
  ciudad,
  count(*) AS pedidos,
  round(avg(total), 2) AS ticket_promedio,
  round(avg(lineas), 2) AS lineas_por_pedido,
  round(100.0 * sum(tarde) / count(*), 1) AS pct_tarde
FROM por_pedido
GROUP BY ciudad
ORDER BY ciudad;`,
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Recorre los seis controles de la lección 3 sobre la consulta de la IA. Uno de los problemas produce un error y los otros no: aparecen en el control de filas por paso y en el de bordes de fecha.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Son tres defectos. `DATEDIFF(minute, ...)` es de SQL Server: en PostgreSQL, «tarde» es `o.delivered_at > o.placed_at + o.promised_minutes * interval '1 minute'`. El join con `order_items` repite cada pedido una vez por línea, y eso distorsiona `count(*)`, `avg(o.total)` y el porcentaje: cuenta las líneas por pedido en una CTE y únela a `orders`. Y `BETWEEN ... '2025-08-31'` pierde el 31 de agosto: usa un rango semiabierto que termine en `'2025-09-01'`.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nWITH lineas AS (\n  SELECT order_id, count(*) AS lineas\n  FROM order_items\n  GROUP BY ___\n)\nSELECT\n  c.name AS ciudad,\n  count(*) AS pedidos,\n  round(avg(o.total), 2) AS ticket_promedio,\n  round(avg(coalesce(l.lineas, 0)), 2) AS lineas_por_pedido,\n  round(100.0 * count(*) FILTER (WHERE ___) / count(*), 1) AS pct_tarde\nFROM orders AS o\nINNER JOIN restaurants AS r ON r.id = o.restaurant_id\nINNER JOIN cities AS c ON c.id = r.city_id\nLEFT JOIN lineas AS l ON l.order_id = o.id\nWHERE o.status = 'delivered'\n  AND o.placed_at >= ___\n  AND o.placed_at < ___\nGROUP BY c.name\nORDER BY ciudad;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "syntax",
        description_md:
          'Buscar una columna llamada `minute` porque el mensaje dice `column "minute" does not exist`. El mensaje es engañoso: la causa es `DATEDIFF`, que no existe en PostgreSQL.',
      },
      {
        category: "aggregation_level",
        description_md:
          "Corregir solo el conteo con `count(DISTINCT o.id)` y dejar el join. `avg(o.total)` y el porcentaje de pedidos tarde siguen ponderados por la cantidad de líneas, así que los pedidos grandes pesan más.",
      },
      {
        category: "date_boundary",
        description_md:
          "Dejar `BETWEEN '2025-07-01' AND '2025-08-31'`. Los pedidos del 31 de agosto posteriores a la medianoche quedan afuera y cambian todas las columnas.",
      },
      {
        category: "cell_values",
        description_md:
          "Traducir `DATEDIFF` con `extract(minute FROM delivered_at - placed_at)`. Eso devuelve solo el componente de minutos del intervalo (de 0 a 59), no la duración total en minutos.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 8 filas, una por ciudad, con 2296 pedidos entregados en total. En Bogotá, por ejemplo, fueron 291 pedidos con un ticket promedio de 154 699,48 pesos y un 20,6 % de entregas tarde.\n\nLa auditoría encuentra tres defectos, cada uno de un tipo distinto:\n\n1. **Dialecto.** `DATEDIFF(minute, a, b)` es de SQL Server. PostgreSQL responde `column \"minute\" does not exist`, porque lee `minute` como el nombre de una columna: un mensaje que apunta al lugar equivocado. La forma directa en PostgreSQL es comparar instantes: `delivered_at > placed_at + promised_minutes * interval '1 minute'`. `extract(epoch FROM delivered_at - placed_at) / 60` también sirve, porque da la duración total en minutos.\n2. **Grano.** El join con `order_items` repite cada pedido una vez por línea. `count(*)` pasa a contar líneas: Bogotá mostraba 720 «pedidos» en lugar de 291. `avg(o.total)` y el porcentaje de pedidos tarde se ponderan por la cantidad de líneas, así que un pedido con más líneas pesa más en el promedio. La IA sí calculó bien `lineas_por_pedido`, con `count(oi.id) / count(DISTINCT o.id)`, y justamente esa columna era la razón del join. La corrección conserva la métrica y cambia el grano: cuenta las líneas por pedido en una CTE y une un resultado que tiene una fila por pedido.\n3. **Borde de fecha.** `BETWEEN '2025-07-01' AND '2025-08-31'` termina a las 00:00 del 31 de agosto. Ese día hubo 28 pedidos entregados que el reporte perdía.\n\nEl orden de la auditoría importa. El error de dialecto es el único que se ve, y es fácil corregirlo y dar la consulta por buena. Los otros dos aparecen solo con los controles: filas por paso (el join lleva los pedidos de 2296 a más del doble de filas) y bordes de fecha (el conteo del 31 de agosto).\n\nEl `LEFT JOIN` con la CTE `lineas` y el `coalesce(..., 0)` protegen el caso de un pedido sin líneas, que contaría como 0 en lugar de desaparecer. En este bimestre todos los pedidos entregados tienen líneas, pero un reporte de gerencia no debería depender de eso.",
    reward: defaultReward("expert"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
];
