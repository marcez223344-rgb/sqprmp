import {
  defaultHintMeta,
  defaultReward,
  defaultSolutionUnlock,
  type ExerciseDef,
} from "../schemas/exercise";

const section = "fundamentos-de-optimizacion";
const pidelo = { slug: "pidelo", version: 1 };
const l1 = "optimizacion-el-trabajo-que-hace-el-motor";
const l2 = "optimizacion-predicados-sargables";
const l3 = "optimizacion-reducir-antes-de-unir";

export const exercises: ExerciseDef[] = [
  {
    slug: "optimizacion-rango-de-fechas-sargable",
    section,
    title: "Los pedidos de julio, con un filtro que el motor pueda usar",
    difficulty: "very_easy",
    estimated_minutes: 6,
    concepts: ["select", "where", "aggregate", "alias"],
    dataset: pidelo,
    tables_used: ["orders"],
    scenario_md:
      "En **Pídelo**, el equipo de Operaciones revisa cada mes cuántos pedidos se entregaron. La consulta que venían usando filtraba con `date_trunc('month', placed_at)` y tardaba minutos en el servidor de producción, donde `orders` tiene cientos de millones de filas.\n\nTu jefa de área te pide reescribirla con un filtro de rango, que es el mismo pedido de negocio expresado de una forma que el índice sobre `placed_at` sí puede aprovechar.",
    business_question_md:
      "Devuelve **una sola fila** con una columna, `pedidos_entregados`: cuántos pedidos con `status = 'delivered'` fueron hechos (`placed_at`) durante **julio de 2025 en UTC**.\n\nEscribe el filtro de fecha como un **rango semiabierto** sobre `placed_at` (`>=` el inicio de julio y `<` el inicio de agosto). La práctica **no acepta** `date_trunc`, `extract` ni `to_char` aplicados a la columna de fecha.",
    learning_objective:
      "Escribir un filtro de fecha sargable como rango semiabierto en lugar de una función sobre la columna.",
    theory_ref: l2,
    expected_columns: [{ name: "pedidos_entregados", type: "integer" }],
    validation_rules: {
      order_matters: false,
      required_concepts: ["where", "aggregate"],
      prohibited_patterns: ["date_trunc", "\\bextract\\s*\\(", "to_char"],
    },
    reference_solution:
      "SELECT count(*) AS pedidos_entregados\nFROM orders\nWHERE status = 'delivered'\n  AND placed_at >= TIMESTAMPTZ '2025-07-01 00:00:00+00'\n  AND placed_at <  TIMESTAMPTZ '2025-08-01 00:00:00+00';",
    alternative_solutions: [
      {
        label: "Con el rango en el WHERE y el estado como conteo condicional",
        sql: "SELECT count(*) FILTER (WHERE status = 'delivered') AS pedidos_entregados\nFROM orders\nWHERE placed_at >= TIMESTAMPTZ '2025-07-01 00:00:00+00'\n  AND placed_at <  TIMESTAMPTZ '2025-08-01 00:00:00+00';",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Un filtro que envuelve la columna en una función obliga al motor a calcularla fila por fila. El mismo mes se puede expresar como «desde este instante, hasta este otro», dejando la columna sola de un lado de cada comparación.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Necesitas dos comparaciones sobre `placed_at`: `>=` contra el primer instante de julio y `<` contra el primer instante de agosto (no `<=` contra el 31 de julio, que deja fuera casi un día entero). Suma el filtro de `status = 'delivered'` y cuenta con `count(*)`. Escribe los literales con zona: `TIMESTAMPTZ '2025-07-01 00:00:00+00'`.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT ___(*) AS pedidos_entregados\nFROM orders\nWHERE status = ___\n  AND placed_at ___ TIMESTAMPTZ '2025-07-01 00:00:00+00'\n  AND placed_at ___ TIMESTAMPTZ '____-__-01 00:00:00+00';\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "date_boundary",
        description_md:
          "Cerrar el rango con `<= TIMESTAMPTZ '2025-07-31 00:00:00+00'`: se pierden todos los pedidos del 31 de julio posteriores a la medianoche. El rango semiabierto (`< '2025-08-01'`) no tiene ese agujero.",
      },
      {
        category: "prohibited_pattern",
        description_md:
          "Volver a `date_trunc('month', placed_at) = DATE '2025-07-01'`: devuelve el número correcto, pero es exactamente el filtro no sargable que el ejercicio te pide reemplazar.",
      },
      {
        category: "missing_filter",
        description_md:
          "Olvidar `status = 'delivered'` y contar los 1214 pedidos del mes en lugar de los 1117 entregados: los 97 restantes se cancelaron.",
      },
      {
        category: "date_boundary",
        description_md:
          "Comparar contra un texto sin zona (`placed_at >= '2025-07-01'`): PostgreSQL lo interpreta en la zona de la sesión. Aquí la sesión corre en UTC y el número coincide, pero el mismo filtro corre el borde del mes varias horas en un servidor configurado en otra zona. El literal con `+00` deja escrito qué instante quieres.",
      },
      {
        category: "date_boundary",
        description_md:
          "Cerrar el rango con `TIMESTAMPTZ '2025-07-01 00:00:00+00' + INTERVAL '1 month'`: la suma de meses sobre un `timestamptz` se resuelve en la zona de la sesión. En este entorno, que corre en UTC, cae exacta en `2025-08-01 00:00+00` y el conteo coincide; en un servidor con otra zona el límite se corre y el número cambia, así que el rango deja de ser reproducible.",
      },
    ],
    expert_explanation_md:
      "El resultado es **1117**. En el mes hubo 1214 pedidos en total: 1117 entregados y 97 cancelados.\n\nLas dos formas —`date_trunc` y el rango— devuelven lo mismo, y ahí está el punto de la sección: **mismo resultado, distinto trabajo**. Con `date_trunc('month', placed_at)`, el motor tiene que calcular la función en cada una de las 14 437 filas antes de decidir si la fila entra. Con el rango, un índice sobre `placed_at` le permite ubicar el primer pedido de julio y leer en orden hasta el primero de agosto, sin mirar el resto de la tabla. Sobre 14 437 filas no notas nada; sobre 400 millones, esa diferencia es minutos contra milisegundos.\n\nEl rango **semiabierto** (`>=` inicio, `<` fin) es el formato que conviene adoptar siempre: funciona igual para fechas, timestamps y timestamps con microsegundos, y nunca tienes que preguntarte cuál es «el último instante» del período. Una advertencia sobre una variante tentadora: escribir el final como `TIMESTAMPTZ '2025-07-01 00:00:00+00' + INTERVAL '1 month'`. Aquí devuelve el mismo 1117, porque la sesión del entorno corre en UTC y la suma cae exacta en `2025-08-01 00:00+00`. Lo que no es equivalente es el texto: sumar un intervalo de meses a un `timestamptz` se calcula en la zona horaria de la sesión, así que el mismo filtro ejecutado en un servidor configurado en `America/Argentina/Buenos_Aires` cierra el rango tres horas antes y pierde pedidos. Cuando el mes venga como parámetro, calcula el fin con aritmética de `date` y conviértelo después, o pasa las dos puntas del rango.\n\nSobre la zona horaria: `placed_at` es `timestamptz`, así que la comparación se hace contra un instante absoluto. Escribir `+00` en el literal deja explícito que el mes es en UTC y hace que el resultado no dependa de la configuración de quien ejecuta la consulta.",
    improvement_feedback: [
      {
        condition: "uses_between_for_timestamps",
        message_key: "improve.uses_between_for_timestamps",
      },
      {
        condition: "missing_alias_on_aggregate",
        message_key: "improve.missing_alias_on_aggregate",
      },
    ],
    reward: defaultReward("very_easy"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "optimizacion-entregas-mas-lentas",
    section,
    title: "Las veinte entregas más lentas de agosto",
    difficulty: "easy",
    estimated_minutes: 9,
    concepts: ["select", "where", "date_functions", "order_by", "limit", "alias"],
    dataset: pidelo,
    tables_used: ["orders"],
    scenario_md:
      "Atención al Cliente quiere revisar caso por caso las entregas más lentas de agosto de 2025 para entender qué falló. Te pidieron «los veinte peores pedidos».\n\nLa versión anterior del reporte era `SELECT * FROM orders ORDER BY delivered_at LIMIT 20`: traía todas las columnas y, peor, la lista cambiaba entre ejecuciones porque el criterio no desempataba.",
    business_question_md:
      "Devuelve los **20 pedidos entregados** (`status = 'delivered'`) con `placed_at` en **agosto de 2025 en UTC** que más tiempo tardaron entre `placed_at` y `delivered_at`.\n\nColumnas: `order_id` (el `id` del pedido) y `minutos_reales` (la diferencia entre `delivered_at` y `placed_at` expresada en minutos enteros). Ordena por `minutos_reales` descendente y, para desempatar, por `order_id` ascendente. Devuelve solo esas dos columnas.",
    learning_objective:
      "Combinar un filtro de rango con un LIMIT que solo es reproducible si el ORDER BY tiene un desempate único, y proyectar únicamente las columnas necesarias.",
    theory_ref: l1,
    prerequisites: ["optimizacion-rango-de-fechas-sargable"],
    expected_columns: [
      { name: "order_id", type: "integer" },
      { name: "minutos_reales", type: "integer" },
    ],
    validation_rules: {
      order_matters: true,
      required_concepts: ["where", "order_by", "limit"],
    },
    reference_solution:
      "SELECT\n  o.id AS order_id,\n  (extract(epoch FROM (o.delivered_at - o.placed_at)) / 60)::int AS minutos_reales\nFROM orders AS o\nWHERE o.status = 'delivered'\n  AND o.placed_at >= TIMESTAMPTZ '2025-08-01 00:00:00+00'\n  AND o.placed_at <  TIMESTAMPTZ '2025-09-01 00:00:00+00'\nORDER BY minutos_reales DESC, order_id\nLIMIT 20;",
    alternative_solutions: [
      {
        label: "Repitiendo la expresión en el ORDER BY en lugar del alias",
        sql: "SELECT\n  o.id AS order_id,\n  (extract(epoch FROM (o.delivered_at - o.placed_at)) / 60)::int AS minutos_reales\nFROM orders AS o\nWHERE o.status = 'delivered'\n  AND o.placed_at >= TIMESTAMPTZ '2025-08-01 00:00:00+00'\n  AND o.placed_at <  TIMESTAMPTZ '2025-09-01 00:00:00+00'\nORDER BY (extract(epoch FROM (o.delivered_at - o.placed_at)) / 60)::int DESC, o.id\nLIMIT 20;",
      },
      {
        label: "Calculando los minutos en una subconsulta",
        sql: "SELECT order_id, minutos_reales\nFROM (\n  SELECT\n    o.id AS order_id,\n    (extract(epoch FROM (o.delivered_at - o.placed_at)) / 60)::int AS minutos_reales\n  FROM orders AS o\n  WHERE o.status = 'delivered'\n    AND o.placed_at >= TIMESTAMPTZ '2025-08-01 00:00:00+00'\n    AND o.placed_at <  TIMESTAMPTZ '2025-09-01 00:00:00+00'\n) AS agosto\nORDER BY minutos_reales DESC, order_id\nLIMIT 20;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Restar dos timestamps da un intervalo, no un número. Para convertirlo a minutos necesitas llevarlo a segundos y dividir. Y recuerda que un `LIMIT` solo devuelve siempre lo mismo si el `ORDER BY` no deja empates sin resolver.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "`extract(epoch FROM (delivered_at - placed_at))` devuelve la diferencia en segundos; divídela por 60 y conviértela a entero con `::int`. Filtra agosto con el rango semiabierto sobre `placed_at` y `status = 'delivered'`. En el `ORDER BY` pon primero `minutos_reales DESC` y después `order_id` ascendente: sin ese segundo criterio, los pedidos empatados en 88 minutos se alternan entre ejecuciones.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT\n  o.id AS order_id,\n  (______(epoch FROM (o.__________ - o.________)) / ___)::int AS minutos_reales\nFROM orders AS o\nWHERE o.status = ___\n  AND o.placed_at >= TIMESTAMPTZ '2025-08-01 00:00:00+00'\n  AND o.placed_at <  TIMESTAMPTZ '____-__-01 00:00:00+00'\nORDER BY ___ DESC, ___\n_____ 20;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "wrong_order",
        description_md:
          "Ordenar solo por `minutos_reales DESC` sin desempatar: hay cinco pedidos empatados en 88 minutos y varios en 87, así que las últimas posiciones cambian de una ejecución a otra y el reporte deja de ser reproducible.",
      },
      {
        category: "wrong_columns",
        description_md:
          "Dejar `SELECT *` o agregar columnas «por si acaso»: el pedido son dos columnas. Además, en producción `SELECT *` sobre una tabla ancha lee y transporta datos que nadie mira.",
      },
      {
        category: "cell_values",
        description_md:
          "Restar los timestamps y presentar el intervalo crudo (`delivered_at - placed_at`) o dividir por 3600 en lugar de 60: la columna pedida son minutos enteros.",
      },
      {
        category: "date_boundary",
        description_md:
          "Filtrar agosto por `delivered_at` en lugar de `placed_at`: son poblaciones distintas, y un pedido hecho el 31 de julio de noche y entregado en agosto entraría sin corresponder.",
      },
    ],
    expert_explanation_md:
      "El primero de la lista es el pedido **13415 con 100 minutos**, seguido del 5783 con 99 y el 12879 con 98. Del puesto 14 en adelante aparecen cinco pedidos empatados en 88 minutos: ahí se ve por qué el desempate importa. Sin `, order_id` al final del `ORDER BY`, PostgreSQL puede devolver cualquiera de esos cinco en cualquier orden, y dos ejecuciones de la misma consulta producen listas distintas. Un reporte que cambia solo no se puede defender en una reunión.\n\nSobre el cálculo: restar dos `timestamptz` da un `interval`, y un intervalo no se ordena de forma intuitiva ni se exporta bien. `extract(epoch FROM intervalo)` lo convierte a segundos; dividir por 60 y convertir a `int` da los minutos. En este dataset las entregas caen en minutos exactos, así que esa conversión no pierde información; si no fuera así, habría que decidir explícitamente entre redondear y truncar.\n\nUsar el alias `minutos_reales` en el `ORDER BY` es válido en PostgreSQL porque el `ORDER BY` se evalúa después del `SELECT`. No funcionaría en el `WHERE`, que corre antes. La alternativa que repite la expresión completa es equivalente y a veces obligatoria en otros motores.\n\nSobre el costo: el filtro deja 1179 pedidos entregados de agosto; el motor ordena esas 1179 filas y devuelve 20. Si hubieras ordenado toda la tabla antes de filtrar, habría ordenado 14 437. Con un índice sobre `placed_at` en producción, la diferencia es enorme.",
    improvement_feedback: [
      { condition: "uses_select_star", message_key: "improve.uses_select_star" },
      {
        condition: "uses_between_for_timestamps",
        message_key: "improve.uses_between_for_timestamps",
      },
    ],
    reward: defaultReward("easy"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "optimizacion-restaurantes-con-actividad",
    section,
    title: "Restaurantes activos con actividad en agosto, sin DISTINCT",
    difficulty: "intermediate",
    estimated_minutes: 11,
    concepts: ["select", "where", "subquery", "order_by"],
    dataset: pidelo,
    tables_used: ["restaurants", "orders"],
    scenario_md:
      "El equipo comercial de **Pídelo** quiere contactar a los restaurantes activos que **no** vendieron nada en agosto. Antes de eso necesitan la lista contraria como control: los activos que sí tuvieron al menos una entrega en el mes.\n\nLa consulta que circula en el equipo une `restaurants` con `orders` y arregla las repeticiones con `DISTINCT`. Funciona, pero genera una fila por pedido —más de mil— para después descartarlas casi todas. Este ejercicio te pide la versión que nunca las genera.",
    business_question_md:
      "Devuelve los restaurantes con `is_active = true` que tienen **al menos un** pedido con `status = 'delivered'` y `placed_at` en **agosto de 2025 en UTC**.\n\nColumnas: `restaurant_id` (el `id` del restaurante) y `name`. Ordena por `restaurant_id` ascendente. La práctica **no acepta** `DISTINCT` en esta consulta.",
    learning_objective:
      "Resolver una pregunta de existencia con EXISTS o IN en lugar de un join que multiplica filas y un DISTINCT que las descarta.",
    theory_ref: l3,
    prerequisites: ["optimizacion-entregas-mas-lentas"],
    expected_columns: [
      { name: "restaurant_id", type: "integer" },
      { name: "name", type: "text" },
    ],
    validation_rules: {
      order_matters: true,
      required_concepts: ["where", "subquery"],
      prohibited_patterns: ["\\bdistinct\\b"],
    },
    reference_solution:
      "SELECT r.id AS restaurant_id, r.name\nFROM restaurants AS r\nWHERE r.is_active\n  AND EXISTS (\n    SELECT 1\n    FROM orders AS o\n    WHERE o.restaurant_id = r.id\n      AND o.status = 'delivered'\n      AND o.placed_at >= TIMESTAMPTZ '2025-08-01 00:00:00+00'\n      AND o.placed_at <  TIMESTAMPTZ '2025-09-01 00:00:00+00'\n  )\nORDER BY r.id;",
    alternative_solutions: [
      {
        label: "Con IN sobre una subconsulta no correlacionada",
        sql: "SELECT r.id AS restaurant_id, r.name\nFROM restaurants AS r\nWHERE r.is_active\n  AND r.id IN (\n    SELECT o.restaurant_id\n    FROM orders AS o\n    WHERE o.status = 'delivered'\n      AND o.placed_at >= TIMESTAMPTZ '2025-08-01 00:00:00+00'\n      AND o.placed_at <  TIMESTAMPTZ '2025-09-01 00:00:00+00'\n  )\nORDER BY r.id;",
      },
      {
        label: "Agregando primero los pedidos y uniendo un resultado ya al grano de restaurante",
        sql: "WITH activos_agosto AS (\n  SELECT o.restaurant_id\n  FROM orders AS o\n  WHERE o.status = 'delivered'\n    AND o.placed_at >= TIMESTAMPTZ '2025-08-01 00:00:00+00'\n    AND o.placed_at <  TIMESTAMPTZ '2025-09-01 00:00:00+00'\n  GROUP BY o.restaurant_id\n)\nSELECT r.id AS restaurant_id, r.name\nFROM restaurants AS r\nJOIN activos_agosto AS a ON a.restaurant_id = r.id\nWHERE r.is_active\nORDER BY r.id;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "La pregunta es de existencia: «¿hay al menos un pedido que cumpla estas condiciones?». No necesitas traer los pedidos al resultado, solo saber si existen. Una subconsulta puede responder eso sin agregar ni una fila a la salida.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Consulta `restaurants` como tabla principal y agrega en el `WHERE` una condición `EXISTS (SELECT 1 FROM orders AS o WHERE ...)`. Dentro de la subconsulta van tres cosas: el vínculo con el restaurante de afuera (`o.restaurant_id = r.id`), el `status` y el rango de agosto. También puedes usar `r.id IN (SELECT o.restaurant_id FROM orders AS o WHERE ...)`, que aquí es equivalente.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT r.id AS restaurant_id, r.name\nFROM restaurants AS r\nWHERE r.__________\n  AND ______ (\n    SELECT 1\n    FROM orders AS o\n    WHERE o.restaurant_id = ____\n      AND o.status = ___\n      AND o.placed_at >= TIMESTAMPTZ '2025-08-01 00:00:00+00'\n      AND o.placed_at <  TIMESTAMPTZ '____-__-01 00:00:00+00'\n  )\nORDER BY ___;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "duplicates",
        description_md:
          "Unir `restaurants` con `orders` sin `DISTINCT`: un restaurante con nueve entregas en agosto aparece nueve veces. Agregar `DISTINCT` tapa el síntoma, pero el motor ya generó las 1117 filas intermedias para después descartarlas.",
      },
      {
        category: "join_condition",
        description_md:
          "Correlacionar mal la subconsulta (`o.restaurant_id = o.restaurant_id` o comparar contra la columna equivocada): el `EXISTS` se vuelve cierto para todos y devuelve los 358 restaurantes activos.",
      },
      {
        category: "missing_filter",
        description_md:
          "Olvidar `r.is_active` y devolver también los restaurantes dados de baja que conservan pedidos: son un problema de calidad conocido de este dataset y no sirven para la campaña comercial.",
      },
      {
        category: "date_boundary",
        description_md:
          "Poner el rango de fechas fuera de la subconsulta, sobre una tabla que no tiene `placed_at`: la consulta falla, o peor, filtra la tabla equivocada si hay un join de por medio.",
      },
    ],
    expert_explanation_md:
      "Son **330 restaurantes** de los 358 activos: 28 activos no entregaron nada en agosto, que es justamente la lista que el equipo comercial quiere después.\n\n`EXISTS` describe la pregunta tal cual se formula: el motor busca la primera fila de `orders` que cumpla y **se detiene ahí**; no necesita contar cuántas hay. Por eso la implementación típica es un *semi join*, que nunca materializa la fila repetida.\n\n`IN` con una subconsulta es equivalente en este caso y PostgreSQL suele planificarlo igual. La diferencia aparece en la negación: `NOT IN` contra una subconsulta que puede devolver `NULL` no devuelve ninguna fila, mientras que `NOT EXISTS` se comporta como esperas. Como regla, `EXISTS`/`NOT EXISTS` es la opción segura.\n\nLa tercera alternativa —agrupar `orders` por `restaurant_id` y unir ese resultado— también evita los duplicados y es la que conviene cuando además necesitas una columna calculada de `orders`, por ejemplo la cantidad de pedidos. Con `EXISTS` no la tendrías: `EXISTS` responde sí o no, nada más.\n\nY la versión con `JOIN ... DISTINCT` no solo es más cara: si mañana alguien agrega una columna de `orders` al `SELECT`, el `DISTINCT` deja de deduplicar y el resultado se infla sin que nadie lo note.",
    improvement_feedback: [
      { condition: "no_table_alias_in_join", message_key: "improve.no_table_alias_in_join" },
    ],
    reward: defaultReward("intermediate"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "optimizacion-reducir-antes-de-unir-categorias",
    section,
    title: "Unidades vendidas por categoría en Bogotá",
    difficulty: "intermediate",
    estimated_minutes: 13,
    concepts: ["cte", "inner_join", "aggregate", "group_by", "where", "order_by"],
    dataset: pidelo,
    tables_used: ["orders", "restaurants", "order_items", "menu_items"],
    scenario_md:
      "El equipo de Producto de **Pídelo** quiere saber cuánto pesan las bebidas y los acompañamientos frente a los platos principales en Bogotá. Es una consulta que cruza cuatro tablas y que, escrita de cualquier manera, une 35 589 líneas de pedido con 14 437 pedidos antes de descartar casi todo.\n\nEl análisis se limita a Bogotá a propósito: los precios de cada ciudad están en su propia moneda, así que sumar montos de varios países daría un número sin sentido.",
    business_question_md:
      "Para los pedidos **entregados** de restaurantes de **Bogotá** (`cities.id = 5`, a la que pertenecen los restaurantes por `restaurants.city_id`) con `placed_at` en **agosto de 2025 en UTC**, devuelve por categoría de ítem del menú: `category`, `unidades` (suma de `order_items.quantity`) y `monto` (suma de `quantity * unit_price`, en pesos colombianos, redondeada a dos decimales).\n\nOrdena por `unidades` descendente.",
    learning_objective:
      "Reducir el conjunto de pedidos con una CTE filtrada antes de unir las tablas de detalle, en lugar de unir todo y filtrar al final.",
    theory_ref: l3,
    prerequisites: ["optimizacion-restaurantes-con-actividad"],
    expected_columns: [
      { name: "category", type: "text" },
      { name: "unidades", type: "integer" },
      { name: "monto", type: "numeric" },
    ],
    validation_rules: {
      order_matters: true,
      required_concepts: ["aggregate", "group_by", "inner_join"],
    },
    reference_solution:
      "WITH entregados AS (\n  SELECT o.id\n  FROM orders AS o\n  JOIN restaurants AS r ON r.id = o.restaurant_id\n  WHERE r.city_id = 5\n    AND o.status = 'delivered'\n    AND o.placed_at >= TIMESTAMPTZ '2025-08-01 00:00:00+00'\n    AND o.placed_at <  TIMESTAMPTZ '2025-09-01 00:00:00+00'\n)\nSELECT\n  m.category,\n  sum(oi.quantity)::int AS unidades,\n  round(sum(oi.quantity * oi.unit_price), 2) AS monto\nFROM entregados AS e\nJOIN order_items AS oi ON oi.order_id = e.id\nJOIN menu_items AS m ON m.id = oi.menu_item_id\nGROUP BY m.category\nORDER BY unidades DESC;",
    alternative_solutions: [
      {
        label: "Todo en una sola consulta, sin CTE",
        sql: "SELECT\n  m.category,\n  sum(oi.quantity)::int AS unidades,\n  round(sum(oi.quantity * oi.unit_price), 2) AS monto\nFROM orders AS o\nJOIN restaurants AS r ON r.id = o.restaurant_id\nJOIN order_items AS oi ON oi.order_id = o.id\nJOIN menu_items AS m ON m.id = oi.menu_item_id\nWHERE r.city_id = 5\n  AND o.status = 'delivered'\n  AND o.placed_at >= TIMESTAMPTZ '2025-08-01 00:00:00+00'\n  AND o.placed_at <  TIMESTAMPTZ '2025-09-01 00:00:00+00'\nGROUP BY m.category\nORDER BY unidades DESC;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Empieza por reducir: ¿cuáles son los pedidos que te interesan? Son pocos. Una vez que tienes esa lista de identificadores, unirle el detalle y el menú es barato y el resto de la consulta se lee mucho mejor.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Arma una CTE `entregados` que traiga solo `orders.id` de los pedidos entregados de agosto cuyo restaurante tiene `city_id = 5`; eso requiere unir `orders` con `restaurants`. Después une esa CTE con `order_items` por `order_id` y con `menu_items` por `menu_item_id`, agrupa por `m.category` y calcula `sum(oi.quantity)` y `sum(oi.quantity * oi.unit_price)`. Usa `oi.unit_price` (el precio cobrado), no `menu_items.price`.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nWITH entregados AS (\n  SELECT o.__\n  FROM orders AS o\n  JOIN restaurants AS r ON ____ = o.restaurant_id\n  WHERE r.city_id = _\n    AND o.status = ___\n    AND o.placed_at >= TIMESTAMPTZ '2025-08-01 00:00:00+00'\n    AND o.placed_at <  TIMESTAMPTZ '____-__-01 00:00:00+00'\n)\nSELECT\n  m.category,\n  ___(oi.quantity)::int AS unidades,\n  round(___(oi.________ * oi.__________), 2) AS monto\nFROM entregados AS e\nJOIN order_items AS oi ON ____________ = e.id\nJOIN menu_items AS m ON ____ = oi.menu_item_id\n_____ __ m.category\nORDER BY ___ DESC;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "cell_values",
        description_md:
          "Calcular el monto con `menu_items.price` en lugar de `order_items.unit_price`: `price` es el precio de lista de hoy y `unit_price` es el que se cobró en ese pedido. Los números no coinciden.",
      },
      {
        category: "aggregation_level",
        description_md:
          "Sumar `oi.unit_price` sin multiplicar por `quantity`: cuentas el precio de cada línea una sola vez, sin importar que el cliente haya pedido tres unidades.",
      },
      {
        category: "missing_filter",
        description_md:
          "Olvidar `o.status = 'delivered'` e incluir pedidos cancelados. Algunos cancelados no tienen ítems, así que el error no se nota en la cantidad de filas, solo en los totales.",
      },
      {
        category: "join_condition",
        description_md:
          "Unir `menu_items` por `m.restaurant_id = r.id` en vez de `m.id = oi.menu_item_id`: cada línea de pedido se cruza con el menú completo del restaurante y las unidades se multiplican por decenas.",
      },
    ],
    expert_explanation_md:
      "Resultado: `principal` con **321 unidades** y 14 230 772,00 COP; `acompañamiento` con **99** y 4 499 996,00; `bebida` con **71** y 3 103 782,00. Los principales son el 65 % de las unidades y el 65 % del monto: en Bogotá, las bebidas no están siendo un complemento significativo, y ese es el hallazgo que Producto buscaba.\n\nLas dos soluciones —con CTE y sin ella— dan lo mismo, y en PostgreSQL probablemente produzcan un plan parecido, porque el planificador puede aplanar la CTE y bajar los filtros. La versión con CTE gana igual por dos razones. La primera es de lectura: el paso «estos son los pedidos que cuentan» queda escrito y se puede verificar solo (`SELECT count(*) FROM entregados` da 148). La segunda es de hábito: en motores que **materializan** las CTE, o cuando el paso intermedio se reutiliza, escribir la reducción primero es la diferencia entre unir 148 pedidos o unir 14 437.\n\nEl filtro por ciudad no es cosmético. Los precios están en la moneda de cada ciudad, así que una suma que mezcle Bogotá, Ciudad de México y Buenos Aires produce un número que no significa nada. Cuando el pedido es multipaís, la salida tiene que llevar la moneda o el país como columna.\n\nSobre `::int` en `unidades`: `sum` de un `integer` devuelve `bigint`, y convertirlo a `int` mantiene el tipo esperado de la columna. Es cosmético aquí, pero conviene ser consciente de los tipos que devuelven las agregaciones.",
    improvement_feedback: [
      { condition: "no_table_alias_in_join", message_key: "improve.no_table_alias_in_join" },
      { condition: "uses_implicit_join", message_key: "improve.uses_implicit_join" },
    ],
    reward: defaultReward("intermediate"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "optimizacion-dos-tablas-hijas-sin-inflar",
    section,
    title: "Unidades y calificaciones por restaurante, sin inflar ninguna",
    difficulty: "advanced",
    estimated_minutes: 18,
    concepts: [
      "cte",
      "inner_join",
      "outer_join",
      "aggregate",
      "group_by",
      "null_handling",
      "order_by",
    ],
    dataset: pidelo,
    tables_used: ["orders", "restaurants", "order_items", "ratings"],
    scenario_md:
      "La gerencia de **Pídelo** en Lima pidió un tablero por restaurante con tres números del último trimestre: pedidos entregados, unidades vendidas y calificaciones recibidas.\n\nEl primer intento del equipo unía `orders` con `order_items` y con `ratings` en una sola consulta. Los números salieron el doble de grandes que los del sistema de encuestas y nadie entendía por qué.",
    business_question_md:
      "Para los restaurantes de **Lima** (`restaurants.city_id = 7`) con al menos un pedido `delivered` entre el **1 de julio y el 30 de septiembre de 2025 inclusive, en UTC**, devuelve: `restaurant_id`, `name`, `pedidos` (pedidos entregados del período), `unidades` (suma de `order_items.quantity` de esos pedidos) y `calificaciones` (cuántas filas de `ratings` corresponden a esos pedidos; 0 si no hay ninguna).\n\nOrdena por `pedidos` descendente y, para desempatar, por `restaurant_id` ascendente.",
    learning_objective:
      "Agregar por separado dos tablas hijas del mismo padre antes de unirlas, para evitar que el join multiplique filas y falsee los conteos.",
    theory_ref: l3,
    prerequisites: ["optimizacion-reducir-antes-de-unir-categorias"],
    expected_columns: [
      { name: "restaurant_id", type: "integer" },
      { name: "name", type: "text" },
      { name: "pedidos", type: "integer" },
      { name: "unidades", type: "integer" },
      { name: "calificaciones", type: "integer" },
    ],
    validation_rules: {
      order_matters: true,
      required_concepts: ["aggregate", "group_by", "cte"],
    },
    reference_solution:
      "WITH entregados AS (\n  SELECT o.id, o.restaurant_id\n  FROM orders AS o\n  JOIN restaurants AS r ON r.id = o.restaurant_id\n  WHERE r.city_id = 7\n    AND o.status = 'delivered'\n    AND o.placed_at >= TIMESTAMPTZ '2025-07-01 00:00:00+00'\n    AND o.placed_at <  TIMESTAMPTZ '2025-10-01 00:00:00+00'\n),\npedidos AS (\n  SELECT restaurant_id, count(*)::int AS pedidos\n  FROM entregados\n  GROUP BY restaurant_id\n),\nunidades AS (\n  SELECT e.restaurant_id, sum(oi.quantity)::int AS unidades\n  FROM entregados AS e\n  JOIN order_items AS oi ON oi.order_id = e.id\n  GROUP BY e.restaurant_id\n),\ncalificaciones AS (\n  SELECT e.restaurant_id, count(*)::int AS calificaciones\n  FROM entregados AS e\n  JOIN ratings AS rt ON rt.order_id = e.id\n  GROUP BY e.restaurant_id\n)\nSELECT\n  r.id AS restaurant_id,\n  r.name,\n  p.pedidos,\n  coalesce(u.unidades, 0) AS unidades,\n  coalesce(c.calificaciones, 0) AS calificaciones\nFROM pedidos AS p\nJOIN restaurants AS r ON r.id = p.restaurant_id\nLEFT JOIN unidades AS u ON u.restaurant_id = p.restaurant_id\nLEFT JOIN calificaciones AS c ON c.restaurant_id = p.restaurant_id\nORDER BY p.pedidos DESC, r.id;",
    alternative_solutions: [
      {
        label: "Con subconsultas escalares correlacionadas",
        sql: "WITH entregados AS (\n  SELECT o.id, o.restaurant_id\n  FROM orders AS o\n  JOIN restaurants AS r ON r.id = o.restaurant_id\n  WHERE r.city_id = 7\n    AND o.status = 'delivered'\n    AND o.placed_at >= TIMESTAMPTZ '2025-07-01 00:00:00+00'\n    AND o.placed_at <  TIMESTAMPTZ '2025-10-01 00:00:00+00'\n),\nbase AS (\n  SELECT restaurant_id, count(*)::int AS pedidos\n  FROM entregados\n  GROUP BY restaurant_id\n)\nSELECT\n  r.id AS restaurant_id,\n  r.name,\n  b.pedidos,\n  (SELECT coalesce(sum(oi.quantity), 0)::int\n     FROM entregados AS e JOIN order_items AS oi ON oi.order_id = e.id\n    WHERE e.restaurant_id = b.restaurant_id) AS unidades,\n  (SELECT count(*)::int\n     FROM entregados AS e JOIN ratings AS rt ON rt.order_id = e.id\n    WHERE e.restaurant_id = b.restaurant_id) AS calificaciones\nFROM base AS b\nJOIN restaurants AS r ON r.id = b.restaurant_id\nORDER BY b.pedidos DESC, r.id;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "`order_items` y `ratings` cuelgan las dos de `orders`. Si las unes a la vez, cada fila de una se cruza con cada fila de la otra dentro del mismo pedido y los dos conteos quedan mal. La salida tiene que estar al grano de restaurante: llega a ese grano antes de unir.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Arma una CTE `entregados` con `id` y `restaurant_id` de los pedidos del período en Lima. Después, tres CTE independientes que partan de ella: el conteo de pedidos por restaurante, la suma de `quantity` uniendo `order_items`, y el conteo de filas uniendo `ratings`. Une las tres por `restaurant_id` con `LEFT JOIN` desde la de pedidos y aplica `coalesce(..., 0)` a las que pueden faltar.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nWITH entregados AS (\n  SELECT o.id, o.restaurant_id\n  FROM orders AS o\n  JOIN restaurants AS r ON r.id = o.restaurant_id\n  WHERE r.city_id = _\n    AND o.status = ___\n    AND o.placed_at >= TIMESTAMPTZ '2025-07-01 00:00:00+00'\n    AND o.placed_at <  TIMESTAMPTZ '____-__-01 00:00:00+00'\n),\npedidos AS (\n  SELECT restaurant_id, _____ AS pedidos FROM entregados GROUP BY ___________\n),\nunidades AS (\n  SELECT e.restaurant_id, _____________ AS unidades\n  FROM entregados AS e JOIN order_items AS oi ON ____________ = e.id\n  GROUP BY e.restaurant_id\n),\ncalificaciones AS (\n  -- mismo patrón, uniendo ratings\n)\nSELECT\n  r.id AS restaurant_id, r.name, p.pedidos,\n  ________(u.unidades, 0) AS unidades,\n  ________(c.calificaciones, 0) AS calificaciones\nFROM pedidos AS p\nJOIN restaurants AS r ON r.id = p.restaurant_id\n____ JOIN unidades AS u ON ___\n____ JOIN calificaciones AS c ON ___\nORDER BY ___ DESC, ___;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "duplicates",
        description_md:
          "Unir `order_items` y `ratings` en la misma consulta: para el restaurante 93 las calificaciones pasan de 7 a 16, porque cada calificación se repite una vez por línea de pedido. Es el error que motivó el ejercicio.",
      },
      {
        category: "aggregation_level",
        description_md:
          "Arreglar el conteo inflado con `count(DISTINCT rt.id)` en lugar de corregir el grano: sale el número correcto, pero el motor igual generó las filas de más y `sum(oi.quantity)` sigue mal si algún pedido tuviera dos calificaciones.",
      },
      {
        category: "null_handling",
        description_md:
          "Unir las ramas con `JOIN` en vez de `LEFT JOIN`, o no aplicar `coalesce(..., 0)`: los restaurantes sin calificaciones desaparecen del tablero o muestran `NULL` donde se espera un 0.",
      },
      {
        category: "date_boundary",
        description_md:
          "Cerrar el trimestre con `<= '2025-09-30'`: se pierden los pedidos del 30 de septiembre posteriores a la medianoche. «Hasta el 30 inclusive» se escribe `< '2025-10-01'`.",
      },
    ],
    expert_explanation_md:
      "Son **35 restaurantes**. Encabezan Casa Ledesma 363 y Fuego Benítez 376, con 15 pedidos entregados cada uno, 54 y 52 unidades, y 7 y 8 calificaciones.\n\nEl contraste con el intento fallido es brutal: uniendo `order_items` y `ratings` a la vez, el restaurante 93 informa 16 calificaciones en lugar de 7, y el 5 informa 10 en lugar de 4. La razón es aritmética: un pedido con 4 líneas y 1 calificación produce 4 filas, y `count(rt.id)` cuenta esa calificación 4 veces. No es un bug de PostgreSQL, es exactamente lo que pediste.\n\nLa regla general: **cuando dos tablas hijas cuelgan del mismo padre, se agregan por separado y después se unen los resultados**, que ya están al mismo grano. Es a la vez la forma correcta y la barata: cada rama recorre su tabla una vez y produce a lo sumo 35 filas, en lugar de materializar el producto cruzado.\n\n`count(DISTINCT ...)` tapa el caso de hoy y falla el día que el grano cambie. Además, en tablas grandes, `count(DISTINCT)` obliga a ordenar o a construir una tabla de hash con todos los valores, lo que suele ser lo más caro de la consulta.\n\nLa alternativa con subconsultas escalares correlacionadas es legítima y a veces más legible cuando hay muchas métricas independientes. Cuesta una ejecución por fila del resultado, lo cual está bien con 35 filas y muy mal con 35 000.\n\nUn detalle de negocio: la salida arranca del conteo de pedidos y no de `restaurants`, porque el pedido pide solo los restaurantes con actividad. Si quisieras el catálogo completo de Lima con ceros, partirías de `restaurants` con `LEFT JOIN` a las tres ramas.",
    improvement_feedback: [
      { condition: "no_table_alias_in_join", message_key: "improve.no_table_alias_in_join" },
      {
        condition: "missing_alias_on_aggregate",
        message_key: "improve.missing_alias_on_aggregate",
      },
    ],
    reward: defaultReward("advanced"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "optimizacion-repartidores-sin-entregas",
    section,
    title: "Repartidores activos sin una sola entrega en agosto",
    difficulty: "advanced",
    estimated_minutes: 14,
    concepts: ["select", "where", "subquery", "null_handling", "order_by"],
    dataset: pidelo,
    tables_used: ["couriers", "orders"],
    scenario_md:
      "Operaciones de **Pídelo** paga un mínimo mensual a cada repartidor activo, entregue o no. Quieren la lista de quienes figuran activos y no entregaron ni un pedido en agosto de 2025, para reactivarlos o darlos de baja.\n\nUn compañero escribió la consulta con `NOT IN` y le devolvió **cero filas**. Está convencido de que no hay repartidores inactivos; el resultado correcto no es cero.",
    business_question_md:
      "Devuelve los repartidores con `is_active = true` que **no** tienen ningún pedido con `status = 'delivered'` y `placed_at` en **agosto de 2025 en UTC** asignado a ellos (`orders.courier_id`).\n\nColumnas: `courier_id` (el `id` del repartidor), `full_name` y `vehicle`. Ordena por `courier_id` ascendente. La práctica **no acepta** `NOT IN` en esta consulta.",
    learning_objective:
      "Resolver una pregunta de no-existencia con NOT EXISTS, entendiendo por qué NOT IN sobre una columna que admite nulos devuelve un resultado vacío.",
    theory_ref: l3,
    prerequisites: ["optimizacion-restaurantes-con-actividad"],
    expected_columns: [
      { name: "courier_id", type: "integer" },
      { name: "full_name", type: "text" },
      { name: "vehicle", type: "text" },
    ],
    validation_rules: {
      order_matters: true,
      required_concepts: ["where", "subquery"],
      prohibited_patterns: ["\\bnot\\s+in\\b"],
    },
    reference_solution:
      "SELECT c.id AS courier_id, c.full_name, c.vehicle\nFROM couriers AS c\nWHERE c.is_active\n  AND NOT EXISTS (\n    SELECT 1\n    FROM orders AS o\n    WHERE o.courier_id = c.id\n      AND o.status = 'delivered'\n      AND o.placed_at >= TIMESTAMPTZ '2025-08-01 00:00:00+00'\n      AND o.placed_at <  TIMESTAMPTZ '2025-09-01 00:00:00+00'\n  )\nORDER BY c.id;",
    alternative_solutions: [
      {
        label: "Con LEFT JOIN antianexo (anti join) y filtro por NULL",
        sql: "SELECT c.id AS courier_id, c.full_name, c.vehicle\nFROM couriers AS c\nLEFT JOIN orders AS o\n  ON o.courier_id = c.id\n AND o.status = 'delivered'\n AND o.placed_at >= TIMESTAMPTZ '2025-08-01 00:00:00+00'\n AND o.placed_at <  TIMESTAMPTZ '2025-09-01 00:00:00+00'\nWHERE c.is_active\n  AND o.id IS NULL\nORDER BY c.id;",
      },
      {
        label: "Con EXCEPT sobre los identificadores",
        sql: "SELECT c.id AS courier_id, c.full_name, c.vehicle\nFROM couriers AS c\nWHERE c.is_active\n  AND c.id IN (\n    SELECT id FROM couriers WHERE is_active\n    EXCEPT\n    SELECT o.courier_id\n    FROM orders AS o\n    WHERE o.status = 'delivered'\n      AND o.placed_at >= TIMESTAMPTZ '2025-08-01 00:00:00+00'\n      AND o.placed_at <  TIMESTAMPTZ '2025-09-01 00:00:00+00'\n  )\nORDER BY c.id;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Es la pregunta del ejercicio anterior en negativo: «no existe ninguna fila que cumpla». Hay una construcción que expresa exactamente eso y que, a diferencia de otra muy parecida, no se rompe cuando la columna comparada admite valores nulos.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Consulta `couriers` como tabla principal y usa `NOT EXISTS (SELECT 1 FROM orders AS o WHERE o.courier_id = c.id AND ...)`. Dentro van el `status` y el rango de agosto. Otro camino válido es el `LEFT JOIN` con todas las condiciones en el `ON` (no en el `WHERE`) y luego `WHERE o.id IS NULL`.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT c.id AS courier_id, c.full_name, c.vehicle\nFROM couriers AS c\nWHERE c.__________\n  AND ___ ______ (\n    SELECT 1\n    FROM orders AS o\n    WHERE o.__________ = c.id\n      AND o.status = ___\n      AND o.placed_at >= TIMESTAMPTZ '2025-08-01 00:00:00+00'\n      AND o.placed_at <  TIMESTAMPTZ '____-__-01 00:00:00+00'\n  )\nORDER BY ___;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "null_handling",
        description_md:
          "Escribir `c.id NOT IN (SELECT o.courier_id FROM orders AS o WHERE o.placed_at >= ... )`: los 101 pedidos cancelados de agosto tienen `courier_id` nulo, y `NOT IN` con un `NULL` en la lista devuelve `UNKNOWN` para todas las filas. Resultado: cero filas, sin ningún error.",
      },
      {
        category: "join_condition",
        description_md:
          "Hacer el `LEFT JOIN` y poner las condiciones de `status` y fecha en el `WHERE`: el `LEFT JOIN` se degrada a `INNER JOIN` y la consulta devuelve lo contrario de lo pedido.",
      },
      {
        category: "missing_filter",
        description_md:
          "Olvidar `c.is_active` y devolver también repartidores dados de baja, que por definición no entregaron nada: la lista se llena de casos que no hay que gestionar.",
      },
      {
        category: "row_count",
        description_md:
          "Pedir «repartidores sin ningún pedido en toda la historia» en lugar de «sin entregas en agosto»: son preguntas distintas y la segunda es la que paga el mínimo mensual.",
      },
    ],
    expert_explanation_md:
      "Son **73 repartidores** de los 503 activos: casi el 15 % del plantel cobró el mínimo sin entregar nada en agosto. Ese es el número que Operaciones necesita.\n\nEl misterio del `NOT IN` tiene una explicación exacta. `x NOT IN (a, b, NULL)` se evalúa como `x <> a AND x <> b AND x <> NULL`, y `x <> NULL` es `UNKNOWN`, nunca `TRUE`. Un `AND` con `UNKNOWN` no puede dar `TRUE`, así que la condición jamás se cumple y la consulta devuelve cero filas **sin emitir ningún error**. En agosto hay 101 pedidos cancelados con `courier_id` nulo, suficiente para envenenar la lista entera. Es de los errores más caros que existen, porque el silencio se confunde con «no hay casos».\n\n`NOT EXISTS` no tiene ese comportamiento: evalúa fila por fila y un `NULL` en `orders.courier_id` simplemente no coincide con ningún `c.id`, que es lo que quieres. Adopta `NOT EXISTS` como opción por defecto para la no-existencia y reserva `NOT IN` para listas literales que escribiste tú.\n\nEl `LEFT JOIN ... WHERE o.id IS NULL` (*anti join*) es equivalente y muy usado. Su trampa es la simétrica: si mueves las condiciones del `ON` al `WHERE`, el `LEFT JOIN` se convierte en `INNER JOIN` y el resultado se invierte. Las condiciones sobre la tabla del lado débil van **siempre** en el `ON`.\n\nEn costo, `NOT EXISTS` y el *anti join* suelen planificarse igual en PostgreSQL. La versión con `EXCEPT` es correcta y expresiva, pero materializa dos conjuntos completos antes de restarlos.",
    improvement_feedback: [
      { condition: "no_table_alias_in_join", message_key: "improve.no_table_alias_in_join" },
    ],
    reward: defaultReward("advanced"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "optimizacion-top-restaurantes-en-capas",
    section,
    title: "Top 10 de Ciudad de México, escrito en capas",
    difficulty: "expert",
    estimated_minutes: 24,
    concepts: [
      "cte",
      "inner_join",
      "aggregate",
      "conditional_aggregation",
      "group_by",
      "where",
      "order_by",
      "limit",
    ],
    dataset: pidelo,
    tables_used: ["orders", "restaurants"],
    scenario_md:
      "Dirección pide el tablero trimestral de **Ciudad de México**: los diez restaurantes con más entregas, con su ticket promedio y su porcentaje de entregas tardías. Es la consulta que corre cada mañana antes de la reunión, así que tiene que ser rápida y, sobre todo, devolver siempre lo mismo.\n\nUna entrega es tardía cuando `delivered_at` es posterior a `placed_at` más los `promised_minutes` que se le prometieron al cliente.",
    business_question_md:
      "Para los pedidos **entregados** entre el **1 de julio y el 30 de septiembre de 2025 inclusive, en UTC**, de restaurantes de **Ciudad de México** (`restaurants.city_id = 3`), devuelve los **10 restaurantes con más pedidos entregados**.\n\nColumnas: `restaurant_id`, `name`, `pedidos`, `ticket_promedio` (promedio de `orders.total`, en pesos mexicanos, redondeado a dos decimales) y `pct_tardios` (porcentaje de esos pedidos entregados después de `placed_at + promised_minutes`, redondeado a un decimal).\n\nOrdena por `pedidos` descendente y, para desempatar, por `restaurant_id` ascendente.",
    learning_objective:
      "Escribir una consulta en capas que reduzca y agregue antes de unir, con un ORDER BY de desempate único que hace reproducible el LIMIT.",
    theory_ref: l1,
    prerequisites: ["optimizacion-dos-tablas-hijas-sin-inflar"],
    expected_columns: [
      { name: "restaurant_id", type: "integer" },
      { name: "name", type: "text" },
      { name: "pedidos", type: "integer" },
      { name: "ticket_promedio", type: "numeric" },
      { name: "pct_tardios", type: "numeric" },
    ],
    validation_rules: {
      order_matters: true,
      required_concepts: ["aggregate", "group_by", "limit"],
    },
    reference_solution:
      "WITH entregados AS (\n  SELECT o.restaurant_id, o.total, o.placed_at, o.delivered_at, o.promised_minutes\n  FROM orders AS o\n  WHERE o.status = 'delivered'\n    AND o.placed_at >= TIMESTAMPTZ '2025-07-01 00:00:00+00'\n    AND o.placed_at <  TIMESTAMPTZ '2025-10-01 00:00:00+00'\n),\nmetricas AS (\n  SELECT\n    e.restaurant_id,\n    count(*)::int AS pedidos,\n    round(avg(e.total), 2) AS ticket_promedio,\n    round(\n      100.0 * count(*) FILTER (\n        WHERE e.delivered_at > e.placed_at + e.promised_minutes * INTERVAL '1 minute'\n      ) / count(*),\n      1\n    ) AS pct_tardios\n  FROM entregados AS e\n  GROUP BY e.restaurant_id\n)\nSELECT\n  r.id AS restaurant_id,\n  r.name,\n  m.pedidos,\n  m.ticket_promedio,\n  m.pct_tardios\nFROM metricas AS m\nJOIN restaurants AS r ON r.id = m.restaurant_id\nWHERE r.city_id = 3\nORDER BY m.pedidos DESC, r.id\nLIMIT 10;",
    alternative_solutions: [
      {
        label: "Con CASE en lugar de FILTER y el filtro de ciudad aplicado desde el principio",
        sql: "WITH entregados AS (\n  SELECT o.restaurant_id, o.total, o.placed_at, o.delivered_at, o.promised_minutes\n  FROM orders AS o\n  JOIN restaurants AS r ON r.id = o.restaurant_id\n  WHERE r.city_id = 3\n    AND o.status = 'delivered'\n    AND o.placed_at >= TIMESTAMPTZ '2025-07-01 00:00:00+00'\n    AND o.placed_at <  TIMESTAMPTZ '2025-10-01 00:00:00+00'\n)\nSELECT\n  r.id AS restaurant_id,\n  r.name,\n  count(*)::int AS pedidos,\n  round(avg(e.total), 2) AS ticket_promedio,\n  round(\n    100.0 * sum(CASE WHEN e.delivered_at > e.placed_at + e.promised_minutes * INTERVAL '1 minute' THEN 1 ELSE 0 END) / count(*),\n    1\n  ) AS pct_tardios\nFROM entregados AS e\nJOIN restaurants AS r ON r.id = e.restaurant_id\nGROUP BY r.id, r.name\nORDER BY pedidos DESC, r.id\nLIMIT 10;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Piensa la consulta en tres capas: qué pedidos cuentan, qué métricas salen de esos pedidos, y qué diez filas se muestran. El porcentaje de tardíos es un conteo condicional sobre el mismo grupo que el conteo total, no una segunda consulta.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Capa 1: una CTE con los pedidos entregados del trimestre. Capa 2: agrupa por `restaurant_id` y calcula `count(*)`, `round(avg(total), 2)` y el porcentaje como `100.0 * count(*) FILTER (WHERE delivered_at > placed_at + promised_minutes * INTERVAL '1 minute') / count(*)`, redondeado a un decimal. Capa 3: une con `restaurants`, filtra `city_id = 3`, ordena por `pedidos DESC, restaurant_id` y aplica `LIMIT 10`. Usa `100.0` (no `100`) para no caer en división entera.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nWITH entregados AS (\n  SELECT o.restaurant_id, o.total, o.placed_at, o.delivered_at, o.promised_minutes\n  FROM orders AS o\n  WHERE o.status = ___\n    AND o.placed_at >= TIMESTAMPTZ '2025-07-01 00:00:00+00'\n    AND o.placed_at <  TIMESTAMPTZ '____-__-01 00:00:00+00'\n),\nmetricas AS (\n  SELECT\n    e.restaurant_id,\n    _____::int AS pedidos,\n    round(___(e.total), _) AS ticket_promedio,\n    round(_____ * count(*) ______ (WHERE e.delivered_at > e.placed_at + ______________________) / _____, _) AS pct_tardios\n  FROM entregados AS e\n  GROUP BY ______________\n)\nSELECT r.id AS restaurant_id, r.name, m.pedidos, m.ticket_promedio, m.pct_tardios\nFROM metricas AS m\nJOIN restaurants AS r ON ____ = m.restaurant_id\nWHERE r.city_id = _\nORDER BY ___ ____, ___\n_____ 10;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "wrong_order",
        description_md:
          "Ordenar solo por `pedidos DESC`: hay cuatro restaurantes empatados en 15 pedidos justo en el corte del top 10, así que sin el desempate por `restaurant_id` el tablero cambia de contenido entre ejecuciones.",
      },
      {
        category: "cell_values",
        description_md:
          "Escribir `100 * count(*) FILTER (...) / count(*)` con enteros: la división entera devuelve 0 para todo porcentaje menor a 100. Hay que forzar el tipo numérico con `100.0`.",
      },
      {
        category: "date_boundary",
        description_md:
          "Comparar contra `promised_minutes` como si fuera un intervalo (`placed_at + promised_minutes`): es un entero y hay que multiplicarlo por `INTERVAL '1 minute'` para poder sumarlo a un timestamp.",
      },
      {
        category: "aggregation_level",
        description_md:
          "Aplicar `LIMIT 10` antes de agregar, por ejemplo en la CTE de pedidos: recortas los pedidos, no los restaurantes, y las métricas quedan calculadas sobre diez filas sueltas.",
      },
    ],
    expert_explanation_md:
      "El top lo encabeza **Doña Ortiz 365** con 19 pedidos, ticket promedio de 835,10 MXN y 15,8 % de entregas tardías; le siguen Lo de Rojas 153 (18 pedidos, 485,76, 22,2 %) y tres restaurantes con 17. El caso interesante es **Casa Ramírez 90**: está tercero en volumen y tiene el peor cumplimiento de la lista, 35,3 % de entregas tardías. Ese contraste es lo que hace útil un tablero con dos métricas en vez de un ranking.\n\nLas tres capas no son decoración. La primera define la población y se puede verificar sola. La segunda lleva todo al grano de restaurante **antes** de tocar `restaurants`: la unión final ocurre entre 72 restaurantes de la ciudad y un resultado ya agregado, no entre miles de pedidos y el catálogo. La tercera decide qué se muestra.\n\nLa alternativa mueve el filtro de ciudad al comienzo. Es igual de correcta y en producción probablemente más rápida, porque descarta antes: el planificador de PostgreSQL suele bajar ese filtro por su cuenta, pero escribirlo temprano nunca está de más. La versión con `sum(CASE WHEN ... THEN 1 ELSE 0 END)` es el equivalente portable de `count(*) FILTER (...)`, que es específico de PostgreSQL y se lee mejor.\n\nDos detalles que hacen defendible el reporte. Uno: cuatro restaurantes empatan en 15 pedidos en el borde del top 10, así que el desempate por `restaurant_id` es lo único que hace reproducible el `LIMIT`. Dos: el análisis se limita a una ciudad, y por lo tanto a una sola moneda; promediar `total` entre Ciudad de México y Buenos Aires daría un ticket promedio sin unidad.",
    improvement_feedback: [
      { condition: "no_table_alias_in_join", message_key: "improve.no_table_alias_in_join" },
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
