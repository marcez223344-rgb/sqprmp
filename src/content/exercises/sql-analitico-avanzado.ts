import {
  defaultHintMeta,
  defaultReward,
  defaultSolutionUnlock,
  type ExerciseDef,
} from "../schemas/exercise";

const section = "sql-analitico-avanzado";
const capas = "avanzado-consultas-en-capas";
const subtotales = "avanzado-subtotales-rollup-cube";
const listas = "avanzado-arrays-y-json";

export const exercises: ExerciseDef[] = [
  {
    slug: "pedidos-por-pais-y-canal-con-subtotales",
    section,
    title: "Pedidos por país y canal, con subtotales",
    difficulty: "advanced",
    estimated_minutes: 12,
    concepts: ["group_by", "aggregate", "inner_join", "case", "order_by", "alias"],
    dataset: { slug: "tiendaviva", version: 1 },
    tables_used: ["orders", "customers"],
    scenario_md:
      "En **TiendaViva**, el departamento de Finanzas arma el reporte mensual de operaciones y siempre pide lo mismo: el detalle por país y canal, el subtotal de cada país y el total general, todo en una misma tabla. Hasta ahora lo resolvían pegando tres consultas en una planilla.",
    business_question_md:
      "Debes generar un dataset que, sobre los pedidos cuyo `status` es igual al texto 'delivered', devuelva `pais`, `canal`, la cantidad de pedidos como `pedidos` y la cantidad de clientes distintos como `clientes`, con el detalle por país y canal, el subtotal de cada país y el total general. En las filas de subtotal escribe el texto `TOTAL` en la columna agregada. Ordena de manera que el subtotal de cada país quede **debajo** de su bloque, el total general al final y, dentro de cada nivel, alfabéticamente.",
    learning_objective:
      "Producir detalle, subtotales y total general en una sola pasada con ROLLUP y etiquetar las filas agregadas con GROUPING.",
    theory_ref: subtotales,
    expected_columns: [
      { name: "pais", type: "text" },
      { name: "canal", type: "text" },
      { name: "pedidos", type: "integer" },
      { name: "clientes", type: "integer" },
    ],
    validation_rules: { order_matters: true, required_concepts: ["group_by", "aggregate"] },
    reference_solution:
      "SELECT\n  CASE WHEN grouping(c.country) = 1 THEN 'TOTAL' ELSE c.country END AS pais,\n  CASE WHEN grouping(o.channel) = 1 THEN 'TOTAL' ELSE o.channel END AS canal,\n  count(*) AS pedidos,\n  count(DISTINCT o.customer_id) AS clientes\nFROM orders AS o\nINNER JOIN customers AS c ON c.id = o.customer_id\nWHERE o.status = 'delivered'\nGROUP BY ROLLUP (c.country, o.channel)\nORDER BY grouping(c.country), pais, grouping(o.channel), canal;",
    alternative_solutions: [
      {
        label: "Tres consultas unidas con UNION ALL (lo que ROLLUP reemplaza)",
        sql: "WITH bloques AS (\n  SELECT c.country AS pais, o.channel AS canal, count(*) AS pedidos, count(DISTINCT o.customer_id) AS clientes\n  FROM orders AS o INNER JOIN customers AS c ON c.id = o.customer_id\n  WHERE o.status = 'delivered'\n  GROUP BY c.country, o.channel\n  UNION ALL\n  SELECT c.country, 'TOTAL', count(*), count(DISTINCT o.customer_id)\n  FROM orders AS o INNER JOIN customers AS c ON c.id = o.customer_id\n  WHERE o.status = 'delivered'\n  GROUP BY c.country\n  UNION ALL\n  SELECT 'TOTAL', 'TOTAL', count(*), count(DISTINCT o.customer_id)\n  FROM orders AS o INNER JOIN customers AS c ON c.id = o.customer_id\n  WHERE o.status = 'delivered'\n)\nSELECT pais, canal, pedidos, clientes\nFROM bloques\nORDER BY (pais = 'TOTAL'), pais, (canal = 'TOTAL'), canal;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "No necesitas tres consultas: PostgreSQL puede calcular el detalle y sus subtotales en la misma agrupación. La dimensión que se agrega primero es la que está más a la derecha.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Agrupa con `GROUP BY ROLLUP (c.country, o.channel)`. En las filas de subtotal la columna agrupada llega en `NULL`; `grouping(c.country)` devuelve 1 justo en esas filas, y sirve tanto para poner la etiqueta `TOTAL` con `CASE` como para ordenar los subtotales al final de su bloque.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT\n  CASE WHEN ___(c.country) = 1 THEN 'TOTAL' ELSE c.country END AS pais,\n  CASE WHEN ___(o.channel) = 1 THEN 'TOTAL' ELSE o.channel END AS canal,\n  count(*) AS pedidos,\n  count(___ o.customer_id) AS clientes\nFROM orders AS o\nINNER JOIN customers AS c ON c.id = o.customer_id\nWHERE o.status = 'delivered'\nGROUP BY ___ (c.country, o.channel)\nORDER BY ___, pais, ___, canal;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "aggregation_level",
        description_md:
          "Agrupar por `c.country, o.channel` a secas: se obtienen las 18 filas de detalle y ningún subtotal.",
      },
      {
        category: "wrong_order",
        description_md:
          "Ordenar solo por `pais, canal`: los subtotales quedan mezclados alfabéticamente con el detalle en vez de cerrar cada bloque.",
      },
      {
        category: "null_handling",
        description_md:
          "Dejar el `NULL` de las filas de subtotal sin etiquetar, o usar `coalesce` sin advertir que un `NULL` real de los datos quedaría marcado como `TOTAL`.",
      },
      {
        category: "cell_values",
        description_md:
          "Contar clientes con `count(o.customer_id)` en vez de `count(DISTINCT o.customer_id)`: se cuentan pedidos, no clientes.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 25 filas: 18 de detalle (6 países × 3 canales), 6 subtotales de país y el total general, que cierra con 13 156 pedidos de 2615 clientes.\n\nAhí está la razón principal para usar `ROLLUP` en lugar de sumar los subtotales a mano en una planilla: **un conteo distinto no se suma**. Con `count(*)` la suma de las partes da el total (2186 + 295 + 1478 = 3959 pedidos en AR), pero con clientes no: 657 + 210 + 559 dan 1426, mientras que el subtotal real de AR es 777, porque quien compró por app y por web es una sola persona.\n\n`grouping(c.country)` es la pieza que hace legible el resultado. Devuelve 1 solo en las filas que el `ROLLUP` agregó, así que la misma expresión sirve para la etiqueta (`CASE ... THEN 'TOTAL'`) y para el orden: al ponerla primero en el `ORDER BY`, el bloque de cada país cierra con su subtotal y el total general queda último.\n\nLa alternativa con tres `UNION ALL` devuelve exactamente lo mismo y muestra el costo: tres pasadas sobre `orders` y el filtro `status = 'delivered'` escrito tres veces, que es exactamente donde estos reportes empiezan a desalinearse.\n\nUn cuidado de negocio: aquí contamos pedidos y clientes, no dinero. `total_amount` está en la moneda de cada país (ARS, MXN, COP…), así que un total general sumando montos no significaría nada.",
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
    slug: "cocinas-y-medios-de-pago-en-cubo",
    section,
    title: "Cocinas y medios de pago, en cubo",
    difficulty: "advanced",
    estimated_minutes: 13,
    concepts: ["group_by", "aggregate", "inner_join", "case", "order_by", "alias"],
    dataset: { slug: "pidelo", version: 1 },
    tables_used: ["orders", "restaurants", "cities"],
    scenario_md:
      "**Pídelo** está renegociando la comisión de la pasarela de pagos en Buenos Aires. Para la reunión necesitan una tabla que se pueda leer en los dos sentidos: qué pesa cada tipo de cocina, qué pesa cada medio de pago y el cruce de ambos.",
    business_question_md:
      "Debes generar un dataset que, sobre los pedidos cuyo `status` es igual al texto 'delivered' de restaurantes de la ciudad `Buenos Aires`, devuelva `cocina`, `metodo`, la cantidad de pedidos como `pedidos`, la suma de `total` como `ventas` y el promedio de `total` como `ticket_promedio` (ambos montos con 2 decimales). Necesitan las cuatro vistas a la vez: el cruce cocina × método, el total de cada cocina, el total de cada método y el total general. Etiqueta las filas agregadas con `TODAS` en `cocina` y `TODOS` en `metodo`. Ordena dejando cada total al final de su bloque, el total general último y, dentro de cada nivel, alfabéticamente.",
    learning_objective:
      "Calcular todos los cortes de dos dimensiones independientes con CUBE y etiquetarlos con GROUPING.",
    theory_ref: subtotales,
    expected_columns: [
      { name: "cocina", type: "text" },
      { name: "metodo", type: "text" },
      { name: "pedidos", type: "integer" },
      { name: "ventas", type: "numeric" },
      { name: "ticket_promedio", type: "numeric" },
    ],
    validation_rules: { order_matters: true, required_concepts: ["group_by", "aggregate"] },
    reference_solution:
      "SELECT\n  CASE WHEN grouping(r.cuisine) = 1 THEN 'TODAS' ELSE r.cuisine END AS cocina,\n  CASE WHEN grouping(o.payment_method) = 1 THEN 'TODOS' ELSE o.payment_method END AS metodo,\n  count(*) AS pedidos,\n  round(sum(o.total), 2) AS ventas,\n  round(avg(o.total), 2) AS ticket_promedio\nFROM orders AS o\nINNER JOIN restaurants AS r ON r.id = o.restaurant_id\nINNER JOIN cities AS c ON c.id = r.city_id\nWHERE c.name = 'Buenos Aires'\n  AND o.status = 'delivered'\nGROUP BY CUBE (r.cuisine, o.payment_method)\nORDER BY grouping(r.cuisine), cocina, grouping(o.payment_method), metodo;",
    alternative_solutions: [
      {
        label: "Etiquetar con COALESCE (posible porque ninguna columna tiene NULL real)",
        sql: "SELECT\n  coalesce(r.cuisine, 'TODAS') AS cocina,\n  coalesce(o.payment_method, 'TODOS') AS metodo,\n  count(*) AS pedidos,\n  round(sum(o.total), 2) AS ventas,\n  round(avg(o.total), 2) AS ticket_promedio\nFROM orders AS o\nINNER JOIN restaurants AS r ON r.id = o.restaurant_id\nINNER JOIN cities AS c ON c.id = r.city_id\nWHERE c.name = 'Buenos Aires' AND o.status = 'delivered'\nGROUP BY CUBE (r.cuisine, o.payment_method)\nORDER BY grouping(r.cuisine), cocina, grouping(o.payment_method), metodo;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Pedirte «los totales de cada cocina **y** los de cada medio de pago **y** el general» es pedirte todos los cortes posibles de dos dimensiones. Hay una sola cláusula que los produce.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "`GROUP BY CUBE (r.cuisine, o.payment_method)` genera los cuatro niveles: el cruce, cada dimensión por separado y el total general. Usa `grouping()` para etiquetar y para ordenar; el filtro de ciudad exige unir `orders` con `restaurants` y `cities`.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT\n  CASE WHEN ___(r.cuisine) = 1 THEN 'TODAS' ELSE r.cuisine END AS cocina,\n  CASE WHEN ___(o.payment_method) = 1 THEN 'TODOS' ELSE o.payment_method END AS metodo,\n  count(*) AS pedidos,\n  round(___(o.total), 2) AS ventas,\n  round(___(o.total), 2) AS ticket_promedio\nFROM orders AS o\nINNER JOIN restaurants AS r ON r.id = o.restaurant_id\nINNER JOIN cities AS c ON c.id = r.city_id\nWHERE c.name = 'Buenos Aires' AND o.status = 'delivered'\nGROUP BY ___ (r.cuisine, o.payment_method)\nORDER BY ___, cocina, ___, metodo;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "aggregation_level",
        description_md:
          "Usar `ROLLUP` en lugar de `CUBE`: falta el total de cada medio de pago, que es justo el número que pide la negociación.",
      },
      {
        category: "missing_filter",
        description_md:
          "Filtrar la ciudad por `r.city_id = 1` o por el nombre del restaurante en vez de unir con `cities` y comparar `c.name = 'Buenos Aires'`.",
      },
      {
        category: "join_condition",
        description_md:
          "Unir `cities` directo con `orders`: la ciudad cuelga del restaurante, no del pedido, y sin el paso intermedio el join no resuelve.",
      },
      {
        category: "wrong_order",
        description_md:
          "Ordenar solo por `cocina, metodo`: la fila `TODAS` aparece en medio del listado en vez de cerrarlo.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 44 filas: 30 del cruce (10 cocinas × 3 métodos), 10 totales por cocina, 3 por método y el total general, con 3315 pedidos entregados y 164 810 814,63 de ventas.\n\nLa lectura del negocio está en los márgenes. `card` concentra 1807 pedidos (el 54 % de la ciudad) con un ticket promedio de 51 109,33; `cash` son 485 pedidos con 46 099,13 de ticket. Esa diferencia de ticket —no el volumen— es el argumento fuerte para la pasarela: la comisión se cobra sobre el monto.\n\n`CUBE` se justifica porque cocina y método son dimensiones **independientes**: ninguna es subcategoría de la otra, y el negocio quiere mirar las dos por separado. Cuando existe una jerarquía (país → canal, categoría → subcategoría) lo correcto es `ROLLUP`, que no calcula el corte por la dimensión hija sola.\n\nUn detalle que decide entre `CASE ... grouping()` y `coalesce()`: son equivalentes solo porque `cuisine` y `payment_method` nunca son `NULL` en los datos. En una columna que admite nulos, `coalesce` etiquetaría como total a filas que son detalle de «sin dato», y nadie lo notaría hasta que los números no cierren.\n\nSobre el alcance: la consulta está acotada a una ciudad a propósito. Sumar `total` de Buenos Aires con el de Ciudad de México mezclaría dos monedas en un mismo número.",
    improvement_feedback: [
      { condition: "no_table_alias_in_join", message_key: "improve.no_table_alias_in_join" },
      { condition: "uses_implicit_join", message_key: "improve.uses_implicit_join" },
    ],
    reward: defaultReward("advanced"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "cancion-estrella-de-cada-artista",
    section,
    title: "La canción estrella de cada artista",
    difficulty: "advanced",
    estimated_minutes: 14,
    concepts: ["subquery", "aggregate", "group_by", "inner_join", "limit", "order_by", "alias"],
    dataset: { slug: "ritmo", version: 1 },
    tables_used: ["artists", "albums", "tracks", "plays"],
    scenario_md:
      "**Ritmo** prepara una playlist editorial de cumbia: una sola canción por artista, la más escuchada de este año. El equipo de contenidos quiere la lista lista para copiar, sin revisar artista por artista.",
    business_question_md:
      "Debes generar un dataset que, para los artistas cuyo `genre` es igual al texto 'cumbia', considerando solo las reproducciones con `played_at` desde el 1 de enero de 2025 inclusive (en UTC), devuelve `artista` (nombre del artista), `cancion` (título de la canción más reproducida de ese artista en el período) y `reproducciones` (cuántas veces se reprodujo esa canción). Si un artista empata entre dos canciones, elige la de título alfabéticamente menor. Ordena por `reproducciones` descendente y, si hay empate debes desempatar usando `artista`.",
    learning_objective:
      "Resolver un top-1 por grupo con una subconsulta LATERAL que ve la fila de la izquierda y lleva su propio LIMIT.",
    theory_ref: capas,
    expected_columns: [
      { name: "artista", type: "text" },
      { name: "cancion", type: "text" },
      { name: "reproducciones", type: "integer" },
    ],
    validation_rules: { order_matters: true, required_concepts: ["aggregate", "group_by"] },
    reference_solution:
      "SELECT\n  a.name AS artista,\n  t.cancion,\n  t.reproducciones\nFROM artists AS a\nCROSS JOIN LATERAL (\n  SELECT tr.title AS cancion, count(*) AS reproducciones\n  FROM plays AS p\n  INNER JOIN tracks AS tr ON tr.id = p.track_id\n  INNER JOIN albums AS al ON al.id = tr.album_id\n  WHERE al.artist_id = a.id\n    AND p.played_at >= '2025-01-01T00:00:00Z'::timestamptz\n  GROUP BY tr.id, tr.title\n  ORDER BY count(*) DESC, tr.title\n  LIMIT 1\n) AS t\nWHERE a.genre = 'cumbia'\nORDER BY t.reproducciones DESC, a.name;",
    alternative_solutions: [
      {
        label: "Numerar con ROW_NUMBER en una CTE y quedarse con el puesto 1",
        sql: "WITH conteos AS (\n  SELECT\n    al.artist_id,\n    tr.title AS cancion,\n    count(*) AS reproducciones,\n    row_number() OVER (PARTITION BY al.artist_id ORDER BY count(*) DESC, tr.title) AS puesto\n  FROM plays AS p\n  INNER JOIN tracks AS tr ON tr.id = p.track_id\n  INNER JOIN albums AS al ON al.id = tr.album_id\n  WHERE p.played_at >= '2025-01-01T00:00:00Z'::timestamptz\n  GROUP BY al.artist_id, tr.id, tr.title\n)\nSELECT a.name AS artista, c.cancion, c.reproducciones\nFROM conteos AS c\nINNER JOIN artists AS a ON a.id = c.artist_id\nWHERE c.puesto = 1 AND a.genre = 'cumbia'\nORDER BY c.reproducciones DESC, a.name;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Un `LIMIT 1` al final de la consulta devuelve una fila en total, no una por artista. Para limitar **por artista** necesitas que el límite viva dentro de un cálculo que se repita para cada uno.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Recorre `artists` y, para cada fila, ejecuta una subconsulta con `CROSS JOIN LATERAL` que cuente reproducciones por canción de ese artista (`WHERE al.artist_id = a.id`), ordene por el conteo descendente con desempate por título y termine en `LIMIT 1`. El camino hasta las reproducciones es `albums` → `tracks` → `plays`.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT a.name AS artista, t.cancion, t.reproducciones\nFROM artists AS a\nCROSS JOIN ___ (\n  SELECT tr.title AS cancion, count(*) AS reproducciones\n  FROM plays AS p\n  INNER JOIN tracks AS tr ON tr.id = p.track_id\n  INNER JOIN albums AS al ON al.id = tr.album_id\n  WHERE al.___ = a.id\n    AND p.played_at >= ___\n  GROUP BY tr.id, tr.title\n  ORDER BY ___\n  LIMIT 1\n) AS t\nWHERE a.genre = 'cumbia'\nORDER BY t.reproducciones DESC, a.name;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "aggregation_level",
        description_md:
          "Poner el `LIMIT 1` en la consulta externa: devuelve una sola fila en lugar de una por artista.",
      },
      {
        category: "join_condition",
        description_md:
          "Escribir la subconsulta sin `LATERAL`: PostgreSQL responde que no reconoce la columna `a.id`, porque una subconsulta común del `FROM` no puede mirar a su izquierda.",
      },
      {
        category: "cell_values",
        description_md:
          "Ordenar la subconsulta solo por `count(*) DESC`: ante un empate, la canción elegida puede cambiar entre ejecuciones y la playlist deja de ser reproducible.",
      },
      {
        category: "date_boundary",
        description_md:
          "Filtrar con `played_at > '2025-01-01'` o usar `BETWEEN`: se pierden las reproducciones del primer día o se incluye por error el borde superior.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 17 filas, una por cada artista de cumbia, y las 17 tienen reproducciones en 2025: `Zorzalú` encabeza con «Dime a las Seis (3993)» y 212 reproducciones, seguida de `Astro y Faro` con 134. La cola es larga y baja: siete artistas están por debajo de 20.\n\nLa clave es dónde vive el `LIMIT`. Dentro del `LATERAL`, la subconsulta se evalúa una vez por artista con `a.id` ya resuelto, así que `LIMIT 1` significa «la mejor canción de este artista». Afuera significaría «la mejor fila del reporte».\n\n`CROSS JOIN LATERAL` descarta los artistas cuya subconsulta no devuelve filas. Aquí no cambia nada porque todos tienen reproducciones, pero si el negocio quisiera ver también a los artistas sin escuchas del período, la forma correcta es `LEFT JOIN LATERAL (...) AS t ON true`, que conserva la fila con las columnas en `NULL`.\n\nLa alternativa con `row_number()` da el mismo resultado y suele ser preferible cuando ya necesitas la tabla de conteos para otra cosa: calcula todo una vez y filtra. `LATERAL` gana cuando el conjunto de la izquierda es chico y traer todo el detalle sería caro: aquí evita numerar las 6751 canciones del catálogo para quedarse con 17.\n\nSobre el filtro de fecha: `played_at` es `timestamptz`, así que el literal se compara en UTC. Escribirlo como `>= '2025-01-01T00:00:00Z'::timestamptz` deja explícita la zona en lugar de depender de la del servidor.",
    improvement_feedback: [
      { condition: "no_table_alias_in_join", message_key: "improve.no_table_alias_in_join" },
      {
        condition: "uses_between_for_timestamps",
        message_key: "improve.uses_between_for_timestamps",
      },
    ],
    reward: defaultReward("advanced"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "top-3-comercios-por-rubro",
    section,
    title: "Los tres comercios que mueven cada rubro",
    difficulty: "expert",
    estimated_minutes: 18,
    concepts: [
      "cte",
      "window_function",
      "ranking",
      "aggregate",
      "group_by",
      "inner_join",
      "limit",
      "alias",
    ],
    dataset: { slug: "bolsillo", version: 1 },
    tables_used: ["transactions", "merchants"],
    scenario_md:
      "El departamento de Alianzas de **Bolsillo** quiere renegociar acuerdos rubro por rubro y necesita saber en cuáles hay un comercio dominante y en cuáles el volumen está repartido. Piden el podio de cada rubro con su peso relativo.",
    business_question_md:
      "Debes generar un dataset considerando las transacciones cuyo `status` es igual al texto 'completed' y `created_at` en el primer semestre de 2025 (desde el 1 de enero inclusive hasta el 1 de julio exclusive, en UTC) que tengan comercio asociado, devuelve para cada rubro los tres comercios con más operaciones: `categoria`, `puesto` (1 a 3), `comercio`, `operaciones` y `participacion`, el porcentaje que representan esas operaciones sobre el total del rubro en el período, con 2 decimales. Desempata por nombre de comercio ascendente. Ordena por `categoria` y `puesto`.",
    learning_objective:
      "Combinar capas de CTE con una subconsulta LATERAL que numera y limita dentro de cada grupo, y expresar el peso relativo sobre el total del grupo.",
    theory_ref: capas,
    expected_columns: [
      { name: "categoria", type: "text" },
      { name: "puesto", type: "integer" },
      { name: "comercio", type: "text" },
      { name: "operaciones", type: "integer" },
      { name: "participacion", type: "numeric" },
    ],
    validation_rules: {
      order_matters: true,
      required_concepts: ["cte", "aggregate", "group_by"],
    },
    reference_solution:
      "WITH pagos AS (\n  SELECT m.category, m.name, count(*) AS operaciones\n  FROM transactions AS t\n  INNER JOIN merchants AS m ON m.id = t.merchant_id\n  WHERE t.status = 'completed'\n    AND t.created_at >= '2025-01-01T00:00:00Z'::timestamptz\n    AND t.created_at < '2025-07-01T00:00:00Z'::timestamptz\n  GROUP BY m.category, m.name\n),\ntotales AS (\n  SELECT category, sum(operaciones) AS operaciones_rubro\n  FROM pagos\n  GROUP BY category\n)\nSELECT\n  c.category AS categoria,\n  top.puesto,\n  top.name AS comercio,\n  top.operaciones,\n  round(100.0 * top.operaciones / c.operaciones_rubro, 2) AS participacion\nFROM totales AS c\nCROSS JOIN LATERAL (\n  SELECT\n    p.name,\n    p.operaciones,\n    row_number() OVER (ORDER BY p.operaciones DESC, p.name) AS puesto\n  FROM pagos AS p\n  WHERE p.category = c.category\n  ORDER BY p.operaciones DESC, p.name\n  LIMIT 3\n) AS top\nORDER BY c.category, top.puesto;",
    alternative_solutions: [
      {
        label: "Numerar y totalizar con ventanas, sin LATERAL",
        sql: "WITH pagos AS (\n  SELECT m.category, m.name, count(*) AS operaciones\n  FROM transactions AS t\n  INNER JOIN merchants AS m ON m.id = t.merchant_id\n  WHERE t.status = 'completed'\n    AND t.created_at >= '2025-01-01T00:00:00Z'::timestamptz\n    AND t.created_at < '2025-07-01T00:00:00Z'::timestamptz\n  GROUP BY m.category, m.name\n),\nrankeados AS (\n  SELECT\n    category,\n    name,\n    operaciones,\n    row_number() OVER (PARTITION BY category ORDER BY operaciones DESC, name) AS puesto,\n    sum(operaciones) OVER (PARTITION BY category) AS operaciones_rubro\n  FROM pagos\n)\nSELECT\n  category AS categoria,\n  puesto,\n  name AS comercio,\n  operaciones,\n  round(100.0 * operaciones / operaciones_rubro, 2) AS participacion\nFROM rankeados\nWHERE puesto <= 3\nORDER BY categoria, puesto;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Son tres granos distintos y conviene escribirlos como tres capas: operaciones por comercio, total por rubro y, recién al final, el podio con su participación.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Primera CTE: `count(*)` agrupando por `m.category, m.name`. Segunda CTE: `sum(operaciones)` por rubro. Después, para cada rubro, un `CROSS JOIN LATERAL` que filtre esa categoría, numere con `row_number() OVER (ORDER BY operaciones DESC, name)` y corte con `LIMIT 3`. La participación es `100.0 * operaciones / total_del_rubro`.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nWITH pagos AS (\n  SELECT m.category, m.name, ___ AS operaciones\n  FROM transactions AS t\n  INNER JOIN merchants AS m ON m.id = t.merchant_id\n  WHERE t.status = 'completed'\n    AND t.created_at >= ___ AND t.created_at < ___\n  GROUP BY m.category, m.name\n),\ntotales AS (\n  SELECT category, ___ AS operaciones_rubro\n  FROM pagos GROUP BY category\n)\nSELECT c.category AS categoria, top.puesto, top.name AS comercio, top.operaciones,\n       round(100.0 * top.operaciones / ___, 2) AS participacion\nFROM totales AS c\nCROSS JOIN ___ (\n  SELECT p.name, p.operaciones,\n         ___() OVER (ORDER BY p.operaciones DESC, p.name) AS puesto\n  FROM pagos AS p\n  WHERE p.category = ___\n  ORDER BY p.operaciones DESC, p.name\n  LIMIT 3\n) AS top\nORDER BY c.category, top.puesto;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "aggregation_level",
        description_md:
          "Calcular la participación contra el total general en vez del total del rubro: todos los porcentajes quedan chicos y no suman lo que el negocio espera.",
      },
      {
        category: "missing_filter",
        description_md:
          "No excluir las transacciones sin comercio: un `LEFT JOIN` con `merchants` agrega un rubro `NULL` que no es un rubro.",
      },
      {
        category: "date_boundary",
        description_md:
          "Cerrar el semestre con `<= '2025-06-30'`: se pierden las operaciones del 30 de junio posteriores a la medianoche.",
      },
      {
        category: "duplicates",
        description_md:
          "Numerar sin desempate (`ORDER BY operaciones DESC` a secas): con comercios empatados en 19 o 20 operaciones, el podio cambia entre ejecuciones.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 30 filas: los diez rubros con su podio de tres. La respuesta de negocio es que **no hay comercios dominantes**: el primero de cada rubro está entre el 5 % y el 7 % de las operaciones. `Taxi Ruiz 282` lidera servicios con 24 operaciones (5,38 %) y `Kiosco Silva 24` lidera combustible con 21 (7,07 %). Con esa concentración, una negociación comercio por comercio mueve muy poco: el argumento está en el rubro, no en el comercio.\n\nLa consulta ilustra tres granos encadenados. `pagos` tiene un grano de comercio; `totales`, de rubro; el `SELECT` final mezcla los dos y por eso necesita que el total del rubro venga por join (o por ventana), nunca por un `sum()` en la misma agregación.\n\nEl `LATERAL` hace dos cosas a la vez: filtra `pagos` por el rubro de la fila actual y aplica un `LIMIT 3` que es por rubro. La numeración se calcula **antes** del `LIMIT` —las funciones de ventana corren antes que el límite—, así que `puesto` es correcto.\n\nLa versión con ventanas evita el `LATERAL`: `row_number()` y `sum()` particionados por rubro, y un `WHERE puesto <= 3` en la capa siguiente (no en la misma, donde la ventana todavía no existe). Es la forma portable y la que rinde mejor cuando el podio es grande; `LATERAL` rinde mejor cuando cada grupo tiene muchas filas y solo quieres unas pocas.\n\nContamos operaciones y no montos a propósito: `transactions.amount` está en la moneda de la cuenta (ARS, MXN, COP, CLP, PEN, UYU, USD), así que sumarlas entre países daría un número sin significado.",
    improvement_feedback: [
      { condition: "no_table_alias_in_join", message_key: "improve.no_table_alias_in_join" },
      {
        condition: "uses_between_for_timestamps",
        message_key: "improve.uses_between_for_timestamps",
      },
    ],
    reward: defaultReward("expert"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "ventas-por-categoria-raiz",
    section,
    title: "Ventas por categoría raíz",
    difficulty: "expert",
    estimated_minutes: 16,
    concepts: ["cte", "set_operations", "aggregate", "group_by", "inner_join", "alias"],
    dataset: { slug: "tiendaviva", version: 1 },
    tables_used: ["categories", "products", "order_items", "orders"],
    scenario_md:
      "El directorio de **TiendaViva** mira el negocio por las seis categorías de primer nivel, pero cada producto está cargado en una subcategoría. Comercial ya reordenó el árbol dos veces este año, así que la consulta no puede asumir cuántos niveles hay hoy.",
    business_question_md:
      "Debes generar un dataset atribuyendo cada producto a su categoría **raíz** (la que tiene `parent_id IS NULL`, recorriendo el árbol hacia arriba sin suponer su profundidad) y, sobre los pedidos con `status = 'delivered'`, devuelve `categoria_raiz`, la cantidad de productos distintos vendidos como `productos`, la cantidad de pedidos distintos como `pedidos` y la suma de `quantity` como `unidades`. Ordena por `unidades` descendente y, si hay empate debes desempatar usando `categoria_raiz`.",
    learning_objective:
      "Aplicar una CTE recursiva para reasignar cada fila a la raíz de su jerarquía y agregar sobre el resultado.",
    theory_ref: listas,
    expected_columns: [
      { name: "categoria_raiz", type: "text" },
      { name: "productos", type: "integer" },
      { name: "pedidos", type: "integer" },
      { name: "unidades", type: "integer" },
    ],
    validation_rules: { order_matters: true, required_concepts: ["cte", "aggregate", "group_by"] },
    reference_solution:
      "WITH RECURSIVE arbol(id, raiz) AS (\n  SELECT c.id, c.name\n  FROM categories AS c\n  WHERE c.parent_id IS NULL\n  UNION ALL\n  SELECT h.id, a.raiz\n  FROM categories AS h\n  INNER JOIN arbol AS a ON a.id = h.parent_id\n)\nSELECT\n  a.raiz AS categoria_raiz,\n  count(DISTINCT p.id) AS productos,\n  count(DISTINCT o.id) AS pedidos,\n  sum(oi.quantity) AS unidades\nFROM arbol AS a\nINNER JOIN products AS p ON p.category_id = a.id\nINNER JOIN order_items AS oi ON oi.product_id = p.id\nINNER JOIN orders AS o ON o.id = oi.order_id\nWHERE o.status = 'delivered'\nGROUP BY a.raiz\nORDER BY unidades DESC, a.raiz;",
    alternative_solutions: [
      {
        label: "Mismo árbol, partiendo de order_items",
        sql: "WITH RECURSIVE arbol(id, raiz) AS (\n  SELECT c.id, c.name FROM categories AS c WHERE c.parent_id IS NULL\n  UNION ALL\n  SELECT h.id, a.raiz FROM categories AS h INNER JOIN arbol AS a ON a.id = h.parent_id\n)\nSELECT\n  a.raiz AS categoria_raiz,\n  count(DISTINCT p.id) AS productos,\n  count(DISTINCT oi.order_id) AS pedidos,\n  sum(oi.quantity) AS unidades\nFROM order_items AS oi\nINNER JOIN orders AS o ON o.id = oi.order_id AND o.status = 'delivered'\nINNER JOIN products AS p ON p.id = oi.product_id\nINNER JOIN arbol AS a ON a.id = p.category_id\nGROUP BY a.raiz\nORDER BY unidades DESC, a.raiz;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Necesitas una tabla auxiliar que diga, para cada categoría, cuál es su raíz. Como la profundidad del árbol no está fijada, esa tabla se construye recorriendo la jerarquía, no con un join por nivel.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "En el caso base toma las categorías con `parent_id IS NULL` y quédate con `(id, name)`: cada raíz es su propia raíz. En el paso recursivo, une `categories` con lo que ya está en la CTE por `a.id = h.parent_id` y **arrastra la raíz sin cambiarla**. Después une esa CTE con `products`, `order_items` y `orders`. Recuerda declarar la lista de columnas: `WITH RECURSIVE arbol(id, raiz) AS ...`.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nWITH ___ arbol(id, raiz) AS (\n  SELECT c.id, c.___\n  FROM categories AS c\n  WHERE c.parent_id ___\n  ___\n  SELECT h.id, a.___\n  FROM categories AS h\n  INNER JOIN arbol AS a ON a.id = h.___\n)\nSELECT a.raiz AS categoria_raiz,\n       count(___ p.id) AS productos,\n       count(___ o.id) AS pedidos,\n       ___(oi.quantity) AS unidades\nFROM arbol AS a\nINNER JOIN products AS p ON p.category_id = a.id\nINNER JOIN order_items AS oi ON oi.product_id = p.id\nINNER JOIN orders AS o ON o.id = oi.order_id\nWHERE o.status = 'delivered'\nGROUP BY a.raiz\nORDER BY unidades DESC, a.raiz;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "join_condition",
        description_md:
          "Resolver la jerarquía con un solo `LEFT JOIN` de `categories` contra sí misma: funciona con el árbol de hoy (dos niveles) y se rompe en silencio el día que alguien agregue un tercero.",
      },
      {
        category: "cell_values",
        description_md:
          "Arrastrar `h.name` en vez de `a.raiz` en el paso recursivo: cada fila termina apuntándose a sí misma y el reporte vuelve a tener 30 categorías.",
      },
      {
        category: "duplicates",
        description_md:
          "Contar pedidos con `count(o.id)`: un pedido con tres productos de la misma raíz se cuenta tres veces. Hace falta `count(DISTINCT o.id)`.",
      },
      {
        category: "missing_filter",
        description_md:
          "Olvidar `o.status = 'delivered'` e incluir pedidos cancelados o devueltos en las unidades vendidas.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 6 filas, una por categoría raíz. `Tecnología` lidera con 4984 unidades en 3636 pedidos y 270 productos distintos; `Juguetes` cierra con 4116 unidades. La diferencia entre la primera y la última es de apenas 21 %: el catálogo está bastante equilibrado, y esa es la respuesta para el directorio.\n\nUn detalle que explica por qué la recursión es necesaria y no un lujo: **ningún producto cuelga de una categoría raíz**, todos están en subcategorías. Las filas del caso base no aportan ventas por sí mismas; aportan el punto de partida para que cada hija herede el nombre de su raíz.\n\nEl corazón del paso recursivo es `SELECT h.id, a.raiz`: el `id` avanza hacia abajo en el árbol y la raíz se arrastra sin tocar. Si en su lugar se escribe `h.name`, la CTE devuelve el nombre de cada categoría y el reporte pierde la agrupación.\n\nHoy el árbol tiene dos niveles (6 raíces y 24 hijas), así que un `LEFT JOIN` de `categories` consigo misma daría el mismo resultado. La consulta recursiva sigue siendo la correcta porque no depende de ese número: el día que Comercial abra un tercer nivel, esta consulta sigue bien y la del join se equivoca sin avisar.\n\nCuidado con los conteos: como cada pedido puede tener varios ítems de la misma raíz, `pedidos` exige `DISTINCT`. Y la suma de la columna `pedidos` de las seis filas es mayor que los 13 156 pedidos entregados, porque un pedido con productos de dos raíces cuenta en las dos: es correcto y conviene aclararlo cuando se presenta la tabla.",
    improvement_feedback: [
      { condition: "no_table_alias_in_join", message_key: "improve.no_table_alias_in_join" },
      { condition: "uses_select_star", message_key: "improve.uses_select_star" },
    ],
    reward: defaultReward("expert"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "rutas-de-estado-de-los-pedidos",
    section,
    title: "Las rutas que siguen los pedidos",
    difficulty: "expert",
    estimated_minutes: 15,
    concepts: ["cte", "aggregate", "group_by", "window_function", "order_by", "alias"],
    dataset: { slug: "pidelo", version: 1 },
    tables_used: ["order_events"],
    scenario_md:
      "El departamento de Operaciones de **Pídelo** sospecha que los pedidos se cancelan en momentos muy distintos del ciclo y quiere verlo sin inventar categorías: qué secuencias de estados existen realmente y cuánto pesa cada una.",
    business_question_md:
      "Debes generar un dataset con la tabla `order_events`, armando para cada pedido la secuencia de sus eventos ordenada por `event_at` (desempata por `id`) y devuelve una fila por secuencia distinta: `ruta` (los eventos unidos por ` > `), `pasos` (cuántos eventos tiene la secuencia), `pedidos` (cuántos pedidos la siguieron) y `porcentaje` sobre el total de pedidos, con 2 decimales. Ordena por `pedidos` descendente y, si hay empate debes desempatar usando `ruta`.",
    learning_objective:
      "Construir listas ordenadas con array_agg, agrupar por la lista completa y comparar cada grupo con el total usando una ventana sobre un agregado.",
    theory_ref: listas,
    expected_columns: [
      { name: "ruta", type: "text" },
      { name: "pasos", type: "integer" },
      { name: "pedidos", type: "integer" },
      { name: "porcentaje", type: "numeric" },
    ],
    validation_rules: { order_matters: true, required_concepts: ["cte", "aggregate", "group_by"] },
    reference_solution:
      "WITH rutas AS (\n  SELECT\n    e.order_id,\n    array_agg(e.event ORDER BY e.event_at, e.id) AS eventos\n  FROM order_events AS e\n  GROUP BY e.order_id\n)\nSELECT\n  array_to_string(eventos, ' > ') AS ruta,\n  cardinality(eventos) AS pasos,\n  count(*) AS pedidos,\n  round(100.0 * count(*) / sum(count(*)) OVER (), 2) AS porcentaje\nFROM rutas\nGROUP BY eventos\nORDER BY pedidos DESC, ruta;",
    alternative_solutions: [
      {
        label: "Armar el texto directamente con STRING_AGG",
        sql: "WITH rutas AS (\n  SELECT\n    e.order_id,\n    string_agg(e.event, ' > ' ORDER BY e.event_at, e.id) AS ruta,\n    count(*) AS pasos\n  FROM order_events AS e\n  GROUP BY e.order_id\n)\nSELECT\n  ruta,\n  pasos,\n  count(*) AS pedidos,\n  round(100.0 * count(*) / sum(count(*)) OVER (), 2) AS porcentaje\nFROM rutas\nGROUP BY ruta, pasos\nORDER BY pedidos DESC, ruta;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "No hace falta enumerar los caminos posibles con `CASE`: deja que los datos los declaren. Primero arma, por pedido, la lista ordenada de sus eventos; después cuenta cuántos pedidos comparten exactamente la misma lista.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "En la CTE: `array_agg(e.event ORDER BY e.event_at, e.id)` agrupando por `order_id`. En la consulta final: `GROUP BY` por el array completo, `array_to_string(..., ' > ')` para mostrarlo, `cardinality(...)` para los pasos y `sum(count(*)) OVER ()` para el total con el que calculas el porcentaje.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nWITH rutas AS (\n  SELECT e.order_id, ___(e.event ORDER BY ___) AS eventos\n  FROM order_events AS e\n  GROUP BY e.order_id\n)\nSELECT\n  ___(eventos, ' > ') AS ruta,\n  ___(eventos) AS pasos,\n  count(*) AS pedidos,\n  round(100.0 * count(*) / ___ OVER (), 2) AS porcentaje\nFROM rutas\nGROUP BY ___\nORDER BY pedidos DESC, ruta;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "wrong_order",
        description_md:
          "Usar `array_agg(e.event)` sin `ORDER BY` interno: la secuencia deja de ser reproducible y aparecen «rutas» que son la misma con los pasos desordenados.",
      },
      {
        category: "aggregation_level",
        description_md:
          "Calcular el porcentaje contra `count(*)` del propio grupo: da 100 en todas las filas. El denominador es el total de pedidos, que se obtiene con `sum(count(*)) OVER ()`.",
      },
      {
        category: "duplicates",
        description_md:
          "Agrupar por `ruta` sin incluir `pasos` en la versión con `string_agg`: PostgreSQL rechaza la consulta porque `pasos` no está agregado ni agrupado.",
      },
      {
        category: "cell_values",
        description_md:
          "Contar los pasos con `count(*)` en la consulta externa: eso cuenta pedidos, no eventos de la secuencia.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 5 filas, y eso ya es un hallazgo: de todas las secuencias imaginables, los 14 437 pedidos recorren solo cinco caminos reales.\n\nEl 92,01 % completa el ciclo entero (`placed > accepted > preparing > picked_up > delivered`). Las cancelaciones se reparten: 594 pedidos (4,11 %) se caen apenas fueron creados —el restaurante no acepta—, 270 (1,87 %) después de aceptar, 139 (0,96 %) durante la preparación y 150 (1,04 %) cuando el pedido **ya fue retirado** por el repartidor. Ese último grupo es el caro, porque el costo ya se incurrió, y es exactamente lo que Operaciones no podía ver contando estados sueltos.\n\nLa técnica tiene dos partes. `array_agg(... ORDER BY ...)` convierte varias filas en un valor único por pedido; el `ORDER BY` dentro del agregado es obligatorio para que la lista signifique «secuencia» y no «conjunto». Después, `GROUP BY eventos` agrupa por el array completo: PostgreSQL compara arrays elemento a elemento, así que dos pedidos con la misma trayectoria caen en el mismo grupo sin que haya que describir esa trayectoria de antemano.\n\n`sum(count(*)) OVER ()` es la parte que más sorprende al leerla: se agregan los pedidos por ruta y, en la misma pasada, una ventana suma esos conteos para dar el total. Es válido porque las ventanas se evalúan después de la agregación.\n\n`string_agg` llega al mismo resultado en un paso y es preferible si solo quieres el texto. El array conviene cuando además vas a contar elementos (`cardinality`), mirar una posición o filtrar por pertenencia con `= ANY`.",
    improvement_feedback: [
      {
        condition: "missing_alias_on_aggregate",
        message_key: "improve.missing_alias_on_aggregate",
      },
      { condition: "uses_select_star", message_key: "improve.uses_select_star" },
    ],
    reward: defaultReward("expert"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "ficha-json-de-artistas-del-bimestre",
    section,
    title: "Ficha JSON de los artistas del bimestre",
    difficulty: "expert",
    estimated_minutes: 20,
    concepts: [
      "cte",
      "window_function",
      "aggregate",
      "group_by",
      "inner_join",
      "limit",
      "order_by",
      "alias",
    ],
    dataset: { slug: "ritmo", version: 1 },
    tables_used: ["plays", "tracks", "albums", "artists"],
    scenario_md:
      "El departamento de Producto de **Ritmo** arma la pantalla «Lo más escuchado del bimestre» y su API espera un documento por artista, no una grilla. Te piden el resultado listo para publicar, con los mismos números que usa el tablero interno.",
    business_question_md:
      "Debes generar un dataset considerando las reproducciones con `played_at` desde el 1 de julio de 2025 inclusive hasta el 1 de septiembre de 2025 exclusive (en UTC), toma los 10 artistas con más reproducciones en ese período (desempata por nombre de artista ascendente) y devuelve `artista` y `payload`: el texto de un objeto **jsonb** con las claves `pais` (país del artista), `genero`, `oyentes` (usuarios distintos que lo escucharon), `reproducciones` y `participacion` (porcentaje de sus reproducciones sobre el total del período **de todos los artistas**, con 2 decimales). Ordena por reproducciones descendente y, si hay empate debes desempatar usando `artista`.",
    learning_objective:
      "Integrar una capa de agregación, una ventana sobre agregados y la construcción de un documento jsonb reproducible.",
    theory_ref: listas,
    expected_columns: [
      { name: "artista", type: "text" },
      { name: "payload", type: "text" },
    ],
    validation_rules: {
      order_matters: true,
      required_concepts: ["cte", "aggregate", "group_by", "window_function"],
    },
    reference_solution:
      "WITH escuchas AS (\n  SELECT\n    al.artist_id,\n    count(*) AS reproducciones,\n    count(DISTINCT p.user_id) AS oyentes\n  FROM plays AS p\n  INNER JOIN tracks AS tr ON tr.id = p.track_id\n  INNER JOIN albums AS al ON al.id = tr.album_id\n  WHERE p.played_at >= '2025-07-01T00:00:00Z'::timestamptz\n    AND p.played_at < '2025-09-01T00:00:00Z'::timestamptz\n  GROUP BY al.artist_id\n)\nSELECT\n  a.name AS artista,\n  jsonb_build_object(\n    'pais', a.country,\n    'genero', a.genre,\n    'oyentes', e.oyentes,\n    'reproducciones', e.reproducciones,\n    'participacion', round(100.0 * e.reproducciones / sum(e.reproducciones) OVER (), 2)\n  )::text AS payload\nFROM escuchas AS e\nINNER JOIN artists AS a ON a.id = e.artist_id\nORDER BY e.reproducciones DESC, a.name\nLIMIT 10;",
    alternative_solutions: [
      {
        label: "Las claves en otro orden (jsonb las normaliza)",
        sql: "WITH escuchas AS (\n  SELECT al.artist_id, count(*) AS reproducciones, count(DISTINCT p.user_id) AS oyentes\n  FROM plays AS p\n  INNER JOIN tracks AS tr ON tr.id = p.track_id\n  INNER JOIN albums AS al ON al.id = tr.album_id\n  WHERE p.played_at >= '2025-07-01T00:00:00Z'::timestamptz\n    AND p.played_at < '2025-09-01T00:00:00Z'::timestamptz\n  GROUP BY al.artist_id\n)\nSELECT\n  a.name AS artista,\n  jsonb_build_object(\n    'reproducciones', e.reproducciones,\n    'participacion', round(100.0 * e.reproducciones / sum(e.reproducciones) OVER (), 2),\n    'oyentes', e.oyentes,\n    'genero', a.genre,\n    'pais', a.country\n  )::text AS payload\nFROM escuchas AS e\nINNER JOIN artists AS a ON a.id = e.artist_id\nORDER BY e.reproducciones DESC, a.name\nLIMIT 10;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Separa el problema en dos: primero un conteo por artista en el período, con su propia capa; después la presentación, que arma el documento y recorta a diez.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "La CTE agrupa por `al.artist_id` con `count(*)` y `count(DISTINCT p.user_id)`; el camino es `plays` → `tracks` → `albums`. En la consulta final, `sum(e.reproducciones) OVER ()` da el total del período (se calcula antes del `LIMIT`, así que incluye a **todos** los artistas) y `jsonb_build_object('clave', valor, ...)` arma el documento; `::text` lo convierte en la columna de texto que pide la API.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nWITH escuchas AS (\n  SELECT al.artist_id, count(*) AS reproducciones, count(___ p.user_id) AS oyentes\n  FROM plays AS p\n  INNER JOIN tracks AS tr ON tr.id = p.track_id\n  INNER JOIN albums AS al ON al.id = tr.album_id\n  WHERE p.played_at >= ___ AND p.played_at < ___\n  GROUP BY al.artist_id\n)\nSELECT\n  a.name AS artista,\n  ___(\n    'pais', a.country,\n    'genero', a.genre,\n    'oyentes', e.oyentes,\n    'reproducciones', e.reproducciones,\n    'participacion', round(100.0 * e.reproducciones / ___ OVER (), 2)\n  )::___ AS payload\nFROM escuchas AS e\nINNER JOIN artists AS a ON a.id = e.artist_id\nORDER BY ___\nLIMIT 10;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "aggregation_level",
        description_md:
          "Calcular la participación después de recortar a diez artistas (por ejemplo en una capa que ya aplicó el `LIMIT`): los porcentajes suman 100 % entre los diez en vez de medir su peso sobre el catálogo completo.",
      },
      {
        category: "cell_values",
        description_md:
          "Usar `json_build_object` en vez de `jsonb_build_object`: `json` conserva el orden en que escribiste las claves, así que el texto resultante depende del orden en que hayas escrito las claves.",
      },
      {
        category: "duplicates",
        description_md:
          "Contar oyentes con `count(p.user_id)`: eso vuelve a contar reproducciones. Los usuarios distintos necesitan `DISTINCT`.",
      },
      {
        category: "date_boundary",
        description_md:
          "Delimitar el bimestre con `BETWEEN '2025-07-01' AND '2025-08-31'`: se pierden las reproducciones del 31 de agosto posteriores a la medianoche.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 10 filas. El artista `Marea y Tormenta` (vallenato, CO) encabeza con 1765 reproducciones de 855 oyentes distintos y el 8,25 % de todo lo escuchado en el bimestre; `Los Cometas del Sur` sigue con 1373 y 6,42 %. La cola baja rápido: el décimo tiene 380 reproducciones y 1,78 %. Entre los diez suman cerca del 35 % del consumo, repartido sobre 320 artistas con actividad en el período.\n\nEl orden de las operaciones es lo que hace correcta la participación. `sum(e.reproducciones) OVER ()` se evalúa sobre las 320 filas que entrega la CTE, **antes** del `ORDER BY` y del `LIMIT`, así que el denominador es el total del catálogo. Si el recorte a diez se hiciera en una capa previa, el mismo cálculo daría el peso dentro del top 10: otro número, con otro significado.\n\nLa relación entre `oyentes` y `reproducciones` es una métrica de producto por derecho propio: 1765 sobre 855 son 2,1 escuchas por oyente, mientras que `Cobre del Sur` tiene 523 sobre 282, casi lo mismo. Un cociente muy alto indicaría un puñado de fans repitiendo, no alcance.\n\nSobre el documento: `jsonb` guarda el objeto ya interpretado y **ordena las claves** (por longitud y luego alfabéticamente), por eso las dos soluciones de esta ficha producen exactamente el mismo texto aunque las claves estén escritas en distinto orden. Con `json` el texto habría salido tal como se tipeó, y dos personas resolviendo bien el ejercicio habrían obtenido resultados distintos. Esa reproducibilidad es la razón práctica para preferir `jsonb` en cualquier salida que alguien vaya a comparar o versionar.\n\nY una advertencia de diseño: esto es la **capa de presentación**. El JSON se arma al final, sobre datos que ya viven en tablas; construirlo antes convertiría cualquier filtro posterior en un desarme del documento.",
    improvement_feedback: [
      { condition: "no_table_alias_in_join", message_key: "improve.no_table_alias_in_join" },
      {
        condition: "uses_between_for_timestamps",
        message_key: "improve.uses_between_for_timestamps",
      },
    ],
    reward: defaultReward("expert"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
];
