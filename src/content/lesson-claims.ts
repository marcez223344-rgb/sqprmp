/**
 * Numeric claims that lesson prose makes about the learning datasets.
 *
 * Each entry pins one sentence that a learner could check by running SQL against the dataset
 * snapshot. `npm run content:claims` executes every `sql`, extracts the numbers from `prose`
 * and fails when the two stop agreeing, so neither a dataset regeneration nor a careless
 * prose edit can leave a lesson quietly wrong.
 *
 * Only exact, unambiguous figures belong here. Rounded or illustrative numbers, planner
 * estimates copied from `EXPLAIN` output and timings are deliberately excluded: a gate that
 * asserts something the data cannot decide is worse than no gate at all.
 *
 * How the comparison works: the numbers found in `prose` (Spanish formatting — space or
 * period for thousands, comma for decimals) must equal, in order, the values of the single
 * row that `sql` returns. So a `prose` with three numbers needs a query with three columns.
 */
export interface LessonClaim {
  /** Lesson slug whose `body_md` must contain `prose` verbatim. */
  lesson: string;
  /** Dataset the query runs against — not always the lesson's own dataset. */
  dataset: string;
  /** The claim as written in the lesson, copied verbatim. */
  prose: string;
  /** One-row query whose columns are, in order, the numbers in `prose`. */
  sql: string;
  /** What the figures mean, for whoever has to fix a failure. */
  about: string;
}

const DELIVERED_AR =
  "FROM orders o JOIN customers c ON c.id = o.customer_id WHERE o.status = 'delivered' AND c.country = 'AR'";
const CL_AGOSTO = `FROM orders o JOIN customers c ON c.id = o.customer_id
WHERE o.status = 'delivered' AND c.country = 'CL'
  AND o.created_at >= DATE '2025-08-01' AND o.created_at < DATE '2025-09-01'`;
const MX_JUL_AGO = `FROM orders o JOIN customers c ON c.id = o.customer_id
WHERE c.country = 'MX' AND o.status = 'delivered'
  AND o.created_at >= TIMESTAMPTZ '2025-07-01 00:00:00+00'
  AND o.created_at < TIMESTAMPTZ '2025-09-01 00:00:00+00'`;
const MX_CORTE = "o.created_at < TIMESTAMPTZ '2025-08-01 00:00:00+00'";
const RETENCION = `WITH cohortes AS (
  SELECT id, date_trunc('month', signup_at AT TIME ZONE 'UTC')::date AS cohorte FROM users
), tamano AS (
  SELECT cohorte, count(*) AS n FROM cohortes GROUP BY 1
), actividad AS (
  SELECT DISTINCT c.cohorte, c.id,
         date_trunc('month', p.played_at AT TIME ZONE 'UTC')::date AS mes
  FROM cohortes c JOIN plays p ON p.user_id = c.id
), celdas AS (
  SELECT a.cohorte,
         (12 * (date_part('year', a.mes) - date_part('year', a.cohorte))
            + (date_part('month', a.mes) - date_part('month', a.cohorte)))::int AS mes_indice,
         round(100.0 * count(*) / t.n, 2) AS pct
  FROM actividad a JOIN tamano t ON t.cohorte = a.cohorte
  GROUP BY a.cohorte, 2, t.n
)
SELECT round(avg(pct), 2) FROM celdas
WHERE cohorte <= DATE '2025-03-01' AND mes_indice = `;

export const lessonClaims: LessonClaim[] = [
  // ── Ritmo ───────────────────────────────────────────────────────────────────
  {
    lesson: "calidad-de-datos-perfilar-una-tabla",
    dataset: "ritmo",
    prose: "Saber que hay 109 382 filas",
    sql: "SELECT count(*) FROM plays",
    about: "filas de plays",
  },
  {
    lesson: "calidad-de-datos-perfilar-una-tabla",
    dataset: "ritmo",
    prose: "Con 4768 oyentes y 6203 canciones repartidos en 109 382 filas",
    sql: "SELECT count(DISTINCT user_id), count(DISTINCT track_id), count(*) FROM plays",
    about: "granularidad de plays: oyentes, canciones y filas",
  },
  {
    lesson: "calidad-de-datos-perfilar-una-tabla",
    dataset: "ritmo",
    prose: "devuelve 340 combinaciones repetidas",
    sql: "SELECT count(*) FROM (SELECT 1 FROM plays GROUP BY user_id, track_id, played_at HAVING count(*) > 1) g",
    about: "claves de negocio repetidas en plays",
  },
  {
    lesson: "calidad-de-datos-nulos-y-categorias",
    dataset: "ritmo",
    prose: "una categoría con nombre y con 1745 filas",
    sql: "SELECT count(*) FROM plays WHERE device IS NULL",
    about: "reproducciones sin dispositivo",
  },
  {
    lesson: "calidad-de-datos-validez-y-huecos",
    dataset: "ritmo",
    prose: "hay 120 filas con segundos negativos",
    sql: "SELECT count(*) FROM plays WHERE seconds_played < 0",
    about: "segundos negativos en plays",
  },
  {
    lesson: "calidad-de-datos-validez-y-huecos",
    dataset: "ritmo",
    prose: "Son 210 filas",
    sql: "SELECT count(*) FROM plays p JOIN tracks t ON t.id = p.track_id WHERE p.seconds_played > t.duration_seconds",
    about: "reproducciones más largas que la canción",
  },
  {
    lesson: "dedup-que-es-un-duplicado",
    dataset: "ritmo",
    prose: "**340 filas sobrantes sobre 109 382**",
    sql: "SELECT count(*) - count(DISTINCT (user_id, track_id, played_at)), count(*) FROM plays",
    about: "filas sobrantes y total de plays",
  },
  {
    lesson: "dedup-que-es-un-duplicado",
    dataset: "ritmo",
    prose: "devuelve las 109 042 combinaciones únicas",
    sql: "SELECT count(DISTINCT (user_id, track_id, played_at)) FROM plays",
    about: "combinaciones únicas en plays",
  },
  {
    lesson: "ranking-ntile-y-segmentos",
    dataset: "ritmo",
    prose: "Con 454 oyentes, los bloques quedan de 114, 114, 113 y 113 personas",
    sql: `WITH escuchas AS (
  SELECT p.user_id, count(*) AS reproducciones
  FROM plays p JOIN users u ON u.id = p.user_id
  WHERE u.country = 'CL' GROUP BY p.user_id
), segmentos AS (
  SELECT ntile(4) OVER (ORDER BY reproducciones DESC, user_id) AS cuartil FROM escuchas
)
SELECT count(*),
       count(*) FILTER (WHERE cuartil = 1), count(*) FILTER (WHERE cuartil = 2),
       count(*) FILTER (WHERE cuartil = 3), count(*) FILTER (WHERE cuartil = 4)
FROM segmentos`,
    about: "oyentes chilenos repartidos en cuartiles",
  },
  {
    lesson: "funnel-orden-estricto-o-cualquier-orden",
    dataset: "ritmo",
    prose: "«1225 usuarios se suscribieron",
    sql: "SELECT count(DISTINCT user_id) FROM subscriptions",
    about: "usuarios con al menos una suscripción",
  },
  {
    lesson: "funnel-orden-estricto-o-cualquier-orden",
    dataset: "ritmo",
    prose: "«135 usuarios siguieron el camino",
    sql: `WITH escuchas AS (SELECT user_id, min(played_at) AS pe FROM plays GROUP BY user_id),
listas AS (SELECT user_id, min(created_at) AS pl FROM playlists GROUP BY user_id),
subs AS (SELECT user_id, min(started_on) AS ps FROM subscriptions GROUP BY user_id)
SELECT count(*)
FROM users u
LEFT JOIN escuchas e ON e.user_id = u.id
LEFT JOIN listas l ON l.user_id = u.id
LEFT JOIN subs s ON s.user_id = u.id
WHERE e.pe > u.signup_at AND l.pl > e.pe AND s.ps >= (l.pl AT TIME ZONE 'UTC')::date`,
    about: "funnel de activación contado en orden estricto",
  },
  {
    lesson: "definir-una-cohorte",
    dataset: "ritmo",
    prose: "Devuelve 21 filas",
    sql: "SELECT count(*) FROM (SELECT 1 FROM users GROUP BY date_trunc('month', signup_at AT TIME ZONE 'UTC')) m",
    about: "cohortes mensuales de alta",
  },
  {
    lesson: "matriz-de-retencion",
    dataset: "ritmo",
    prose: "da 53,40 %",
    sql: `${RETENCION}0`,
    about: "retención media del mes 0 en las cohortes con seis meses completos",
  },
  {
    lesson: "matriz-de-retencion",
    dataset: "ritmo",
    prose: "da 74,77 %",
    sql: `${RETENCION}1`,
    about: "retención media del mes 1 en las cohortes con seis meses completos",
  },
  {
    lesson: "matriz-de-retencion",
    dataset: "ritmo",
    prose: "tiene 21 columnas",
    sql: `SELECT count(DISTINCT date_trunc('month', p.played_at AT TIME ZONE 'UTC'))
FROM users u JOIN plays p ON p.user_id = u.id
WHERE date_trunc('month', u.signup_at AT TIME ZONE 'UTC')::date = DATE '2024-01-01'`,
    about: "meses observados por la cohorte de enero de 2024",
  },
  {
    lesson: "acumulados-por-periodo",
    dataset: "ritmo",
    prose: "La última fila del resultado vale 5000",
    sql: "SELECT count(*) FROM users",
    about: "total acumulado de altas",
  },

  // ── TiendaViva ──────────────────────────────────────────────────────────────
  {
    lesson: "agregacion-condicional-case-y-filter",
    dataset: "tiendaviva",
    prose: "las mismas 18 000 filas de",
    sql: "SELECT count(*) FROM orders",
    about: "filas de orders",
  },
  {
    lesson: "calidad-de-datos-nulos-y-categorias",
    dataset: "tiendaviva",
    prose: "tiene 3000 filas y 2998 correos distintos",
    sql: "SELECT count(*), count(DISTINCT email) FROM customers",
    about: "clientes y correos distintos sin normalizar",
  },
  {
    lesson: "calidad-de-datos-nulos-y-categorias",
    dataset: "tiendaviva",
    prose: "los correos distintos bajan a 2961",
    sql: "SELECT count(DISTINCT lower(btrim(email))) FROM customers",
    about: "correos distintos ya normalizados",
  },
  {
    lesson: "calidad-de-datos-nulos-y-categorias",
    dataset: "tiendaviva",
    prose: "hay 37 personas cargadas más de una vez",
    sql: "SELECT count(*) FROM (SELECT 1 FROM customers GROUP BY lower(btrim(email)) HAVING count(*) > 1) g",
    about: "grupos de clientes duplicados",
  },
  {
    lesson: "dedup-clave-de-negocio",
    dataset: "tiendaviva",
    prose: "hay 39 cuentas de más",
    sql: "SELECT count(*) - count(DISTINCT lower(btrim(email))) FROM customers",
    about: "filas sobrantes por correo normalizado",
  },
  {
    lesson: "dedup-clave-de-negocio",
    dataset: "tiendaviva",
    prose:
      "37 grupos: 35 con dos cuentas y 2 con tres. En total 76 filas donde el negocio ve 37 personas",
    sql: `WITH g AS (SELECT count(*) AS c FROM customers GROUP BY lower(btrim(email)) HAVING count(*) > 1)
SELECT count(*), count(*) FILTER (WHERE c = 2), count(*) FILTER (WHERE c = 3), sum(c), count(*) FROM g`,
    about: "grupos duplicados por tamaño y filas involucradas",
  },
  {
    lesson: "dedup-elegir-la-fila-ganadora",
    dataset: "tiendaviva",
    prose: "los 2414 intentos rechazados",
    sql: "SELECT count(*) FROM payments WHERE status = 'rejected' AND paid_at IS NULL",
    about: "pagos rechazados sin fecha de acreditación",
  },
  {
    lesson: "depuracion-descomponer-y-contar",
    dataset: "tiendaviva",
    prose: "(18 000 pedidos, uno por fila), `order_items` (30 067 líneas",
    sql: "SELECT (SELECT count(*) FROM orders), (SELECT count(*) FROM order_items)",
    about: "filas de orders y de order_items",
  },
  {
    lesson: "depuracion-descomponer-y-contar",
    dataset: "tiendaviva",
    prose: "Devuelve 13 156 y 13 156",
    sql: "SELECT count(*), count(DISTINCT id) FROM orders WHERE status = 'delivered'",
    about: "pedidos entregados contados de dos formas",
  },
  {
    lesson: "depuracion-descomponer-y-contar",
    dataset: "tiendaviva",
    prose: "esa misma pareja de conteos da 21 964 y 13 156",
    sql: "SELECT count(*), count(DISTINCT o.id) FROM orders o JOIN order_items oi ON oi.order_id = o.id WHERE o.status = 'delivered'",
    about: "líneas y pedidos tras unir orders con order_items",
  },
  {
    lesson: "depuracion-descomponer-y-contar",
    dataset: "tiendaviva",
    prose: "de Argentina da 1 705 368 745,77",
    sql: `SELECT round(sum(o.total_amount), 2) ${DELIVERED_AR}`,
    about: "suma correcta de los pedidos entregados de Argentina",
  },
  {
    lesson: "depuracion-joins-que-multiplican",
    dataset: "tiendaviva",
    prose: "1,67 líneas en promedio",
    sql: "SELECT round((SELECT count(*) FROM order_items)::numeric / (SELECT count(*) FROM orders), 2)",
    about: "líneas por pedido en promedio",
  },
  {
    lesson: "depuracion-joins-que-multiplican",
    dataset: "tiendaviva",
    prose: "Hay 18 050 pagos para 18 000 pedidos, porque 1 251 pedidos tienen dos filas de pago",
    sql: `SELECT (SELECT count(*) FROM payments), (SELECT count(*) FROM orders),
       (SELECT count(*) FROM (SELECT 1 FROM payments GROUP BY order_id HAVING count(*) = 2) g)`,
    about: "pagos, pedidos y pedidos con dos intentos de pago",
  },
  {
    lesson: "depuracion-joins-que-multiplican",
    dataset: "tiendaviva",
    prose: "21 964 filas para 13 156 pedidos entregados",
    sql: "SELECT count(*), count(DISTINCT o.id) FROM orders o JOIN order_items oi ON oi.order_id = o.id WHERE o.status = 'delivered'",
    about: "fan-out de order_items sobre los pedidos entregados",
  },
  {
    lesson: "depuracion-joins-que-multiplican",
    dataset: "tiendaviva",
    prose: "de 1 705 368 745,77 a 3 631 177 874,05",
    sql: `SELECT (SELECT round(sum(o.total_amount), 2) ${DELIVERED_AR}),
       (SELECT round(sum(o.total_amount), 2) FROM orders o
          JOIN customers c ON c.id = o.customer_id
          JOIN order_items oi ON oi.order_id = o.id
        WHERE o.status = 'delivered' AND c.country = 'AR')`,
    about: "suma de Argentina antes y después del join que multiplica",
  },
  {
    lesson: "depuracion-filtros-nulos-y-grano",
    dataset: "tiendaviva",
    prose: "solo 6 de las 30 las tienen",
    sql: "SELECT (SELECT count(DISTINCT parent_id) FROM categories), (SELECT count(*) FROM categories)",
    about: "categorías con subcategorías y categorías totales",
  },
  {
    lesson: "depuracion-filtros-nulos-y-grano",
    dataset: "tiendaviva",
    prose: "el ticket promedio real es 431 786,43",
    sql: `SELECT round(avg(o.total_amount), 2) ${DELIVERED_AR} AND o.channel = 'app'`,
    about: "ticket promedio de Argentina por la app",
  },
  {
    lesson: "fechas-diferencias-e-intervalos",
    dataset: "tiendaviva",
    prose: "hay 1110 envíos que todavía no se entregaron",
    sql: "SELECT count(*) FROM shipments WHERE delivered_at IS NULL",
    about: "envíos sin fecha de entrega",
  },
  {
    lesson: "fechas-rangos-sin-errores-de-borde",
    dataset: "tiendaviva",
    prose:
      "devuelve **1172** pedidos, pero los pedidos reales de agosto son **1208**. Faltan los 36",
    sql: `SELECT count(*) FILTER (WHERE created_at BETWEEN DATE '2025-08-01' AND DATE '2025-08-31'),
       count(*) FILTER (WHERE created_at >= DATE '2025-08-01' AND created_at < DATE '2025-09-01'),
       count(*) FILTER (WHERE created_at >= DATE '2025-08-01' AND created_at < DATE '2025-09-01')
         - count(*) FILTER (WHERE created_at BETWEEN DATE '2025-08-01' AND DATE '2025-08-31')
FROM orders`,
    about: "pedidos de agosto con el borde mal puesto, con el borde correcto y la diferencia",
  },
  {
    lesson: "texto-normalizar-y-limpiar",
    dataset: "tiendaviva",
    prose: "hay 39 correos guardados en mayúsculas",
    sql: "SELECT count(*) FROM customers WHERE email <> lower(email)",
    about: "correos con alguna mayúscula",
  },
  {
    lesson: "null-logica-de-tres-valores",
    dataset: "tiendaviva",
    prose:
      "devuelve 70 filas y `WHERE rating <= 4` devuelve 82, pero entre las dos no suman los 180 vendedores de la tabla: faltan los 28",
    sql: `SELECT count(*) FILTER (WHERE rating > 4), count(*) FILTER (WHERE rating <= 4),
       count(*), count(*) FILTER (WHERE rating IS NULL) FROM sellers`,
    about: "vendedores por encima y por debajo de 4, total y sin calificación",
  },
  {
    lesson: "planificar-el-camino-de-joins",
    dataset: "tiendaviva",
    prose: "**exactamente las mismas 68 filas**",
    sql: `SELECT count(*)
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
JOIN products p ON p.id = oi.product_id
JOIN sellers s ON s.id = p.seller_id
WHERE s.country = 'UY'
  AND o.created_at >= DATE '2025-08-01' AND o.created_at < DATE '2025-09-01'`,
    about: "cadena de cuatro tablas para vendedores uruguayos en agosto",
  },
  {
    lesson: "duplicacion-de-filas-en-cadenas",
    dataset: "tiendaviva",
    prose: "suman **21 513 788 CLP**",
    sql: `SELECT round(sum(o.total_amount)) ${CL_AGOSTO}`,
    about: "suma correcta de Chile en agosto de 2025",
  },
  {
    lesson: "duplicacion-de-filas-en-cadenas",
    dataset: "tiendaviva",
    prose:
      "el resultado es **47 823 913 CLP**: más del doble, porque los 80 pedidos se convirtieron en 134 líneas",
    sql: `SELECT round(sum(o.total_amount)), count(DISTINCT o.id), count(*)
FROM orders o JOIN customers c ON c.id = o.customer_id JOIN order_items oi ON oi.order_id = o.id
WHERE o.status = 'delivered' AND c.country = 'CL'
  AND o.created_at >= DATE '2025-08-01' AND o.created_at < DATE '2025-09-01'`,
    about: "suma inflada de Chile, pedidos y líneas",
  },
  {
    lesson: "duplicacion-de-filas-en-cadenas",
    dataset: "tiendaviva",
    prose: "hay 1251 pedidos con más de un intento de pago",
    sql: "SELECT count(*) FROM (SELECT 1 FROM payments GROUP BY order_id HAVING count(*) > 1) g",
    about: "pedidos con más de un pago",
  },
  {
    lesson: "inner-join-basico",
    dataset: "tiendaviva",
    prose: "1251 pedidos tienen más de un pago",
    sql: "SELECT count(*) FROM (SELECT 1 FROM payments GROUP BY order_id HAVING count(*) > 1) g",
    about: "pedidos con más de un pago",
  },
  {
    lesson: "self-join-jerarquias",
    dataset: "tiendaviva",
    prose: "deja 24 filas de las 30",
    sql: "SELECT (SELECT count(*) FROM categories c JOIN categories p ON p.id = c.parent_id), (SELECT count(*) FROM categories)",
    about: "categorías que sobreviven al INNER JOIN y categorías totales",
  },
  {
    lesson: "self-join-comparar-filas",
    dataset: "tiendaviva",
    prose:
      "1500 productos sin un `ON` que los restrinja producen 2 250 000 filas, que es 1500 por 1500",
    sql: "SELECT count(*), count(*) * count(*), count(*), count(*) FROM products",
    about: "productos y el producto cartesiano que generarían",
  },
  {
    lesson: "subconsultas-escalares-y-derivadas",
    dataset: "tiendaviva",
    prose: "(14 377,35 UYU)",
    sql: "SELECT round(avg(total_amount), 2) FROM orders WHERE currency = 'UYU' AND status = 'delivered'",
    about: "ticket promedio en pesos uruguayos",
  },
  {
    lesson: "subconsultas-escalares-y-derivadas",
    dataset: "tiendaviva",
    prose: "Devuelve 173 pedidos",
    sql: `SELECT count(*) FROM orders
WHERE currency = 'UYU' AND status = 'delivered'
  AND total_amount > (SELECT avg(total_amount) FROM orders WHERE currency = 'UYU' AND status = 'delivered')`,
    about: "pedidos uruguayos por encima del ticket promedio",
  },
  {
    lesson: "subconsultas-escalares-y-derivadas",
    dataset: "tiendaviva",
    prose: "Chile encabeza con 5,51 pedidos entregados por cliente",
    sql: `SELECT round(avg(n), 2)
FROM (SELECT customer_id, count(*) AS n FROM orders WHERE status = 'delivered' GROUP BY 1) t
JOIN customers c ON c.id = t.customer_id
WHERE c.country = 'CL'`,
    about: "promedio de pedidos entregados por cliente en Chile",
  },
  {
    lesson: "de-un-pedido-vago-a-una-especificacion",
    dataset: "tiendaviva",
    prose: "los ingresos pasaron de 2 075 796,94 a 1 879 865,71",
    sql: `SELECT round(sum(o.total_amount) FILTER (WHERE ${MX_CORTE}), 2),
       round(sum(o.total_amount) FILTER (WHERE NOT (${MX_CORTE})), 2)
${MX_JUL_AGO}`,
    about: "ingresos de México en julio y en agosto de 2025",
  },
  {
    lesson: "de-un-pedido-vago-a-una-especificacion",
    dataset: "tiendaviva",
    prose: "con 306 pedidos contra 281",
    sql: `SELECT count(*) FILTER (WHERE ${MX_CORTE}), count(*) FILTER (WHERE NOT (${MX_CORTE}))
${MX_JUL_AGO}`,
    about: "pedidos entregados de México en julio y en agosto",
  },
  {
    lesson: "de-un-pedido-vago-a-una-especificacion",
    dataset: "tiendaviva",
    prose: "(6783,65 contra 6689,91)",
    sql: `SELECT round(avg(o.total_amount) FILTER (WHERE ${MX_CORTE}), 2),
       round(avg(o.total_amount) FILTER (WHERE NOT (${MX_CORTE})), 2)
${MX_JUL_AGO}`,
    about: "ticket promedio de México en julio y en agosto",
  },

  // ── Pídelo ──────────────────────────────────────────────────────────────────
  {
    lesson: "optimizacion-el-trabajo-que-hace-el-motor",
    dataset: "pidelo",
    prose: "tiene 14 437 filas, `order_items` tiene 35 589 y `order_events` tiene 69 724",
    sql: "SELECT (SELECT count(*) FROM orders), (SELECT count(*) FROM order_items), (SELECT count(*) FROM order_events)",
    about: "filas de orders, order_items y order_events",
  },
  {
    lesson: "optimizacion-el-trabajo-que-hace-el-motor",
    dataset: "pidelo",
    prose: "La primera agrupa 13 284 filas, y la segunda agrupa las 14 437",
    sql: "SELECT count(*) FILTER (WHERE status = 'delivered'), count(*) FROM orders",
    about: "pedidos entregados y pedidos totales",
  },
  {
    lesson: "optimizacion-predicados-sargables",
    dataset: "pidelo",
    prose: "Las dos devuelven 1214",
    sql: `SELECT count(*) FROM orders
WHERE placed_at >= TIMESTAMPTZ '2025-07-01 00:00:00+00' AND placed_at < TIMESTAMPTZ '2025-08-01 00:00:00+00'`,
    about: "pedidos de julio de 2025",
  },
  {
    lesson: "optimizacion-reducir-antes-de-unir",
    dataset: "pidelo",
    prose: "agrupa 1179 filas y después une 370 filas con 400",
    sql: `SELECT count(*), count(DISTINCT restaurant_id), (SELECT count(*) FROM restaurants)
FROM orders
WHERE status = 'delivered'
  AND placed_at >= TIMESTAMPTZ '2025-08-01 00:00:00+00' AND placed_at < TIMESTAMPTZ '2025-09-01 00:00:00+00'`,
    about: "entregas de agosto, restaurantes con ventas y restaurantes totales",
  },
  {
    lesson: "funnel-definicion-y-pasos",
    dataset: "pidelo",
    prose: "14 437 → 13 843 → 13 573 → 13 434 → 13 284 pedidos",
    sql: `SELECT count(DISTINCT order_id) FILTER (WHERE event = 'placed'),
       count(DISTINCT order_id) FILTER (WHERE event = 'accepted'),
       count(DISTINCT order_id) FILTER (WHERE event = 'preparing'),
       count(DISTINCT order_id) FILTER (WHERE event = 'picked_up'),
       count(DISTINCT order_id) FILTER (WHERE event = 'delivered')
FROM order_events`,
    about: "los cinco pasos del funnel de Pídelo",
  },
  {
    lesson: "funnel-abandono-y-tiempo-de-conversion",
    dataset: "pidelo",
    prose: "594 pedidos, el 4,11 % del total",
    sql: `WITH m AS (
  SELECT o.id, max(CASE WHEN e.event = 'accepted' THEN 1 ELSE 0 END) AS aceptado
  FROM orders o LEFT JOIN order_events e ON e.order_id = o.id
  GROUP BY o.id
)
SELECT count(*) FILTER (WHERE aceptado = 0),
       round(100.0 * count(*) FILTER (WHERE aceptado = 0) / count(*), 2)
FROM m`,
    about: "pedidos que no pasan de placed y su proporción",
  },
  {
    lesson: "calidad-de-datos-validez-y-huecos",
    dataset: "pidelo",
    prose: "devuelve 178 pedidos sin ningún ítem, y 171 de ellos",
    sql: `SELECT count(*), count(*) FILTER (WHERE o.total > 0)
FROM orders o WHERE NOT EXISTS (SELECT 1 FROM order_items i WHERE i.order_id = o.id)`,
    about: "pedidos sin ítems y cuántos de ellos tienen importe",
  },
  {
    lesson: "indices-que-es-un-indice",
    dataset: "pidelo",
    prose: "hay 14 437 filas, y 13 284 tienen `status = 'delivered'`, o sea el 92 %",
    sql: `SELECT count(*), count(*) FILTER (WHERE status = 'delivered'),
       round(100.0 * count(*) FILTER (WHERE status = 'delivered') / count(*))
FROM orders`,
    about: "pedidos totales, entregados y su porcentaje",
  },
  {
    lesson: "indices-leer-un-plan-de-ejecucion",
    dataset: "pidelo",
    prose: "Pasan 1214 filas de 14 437",
    sql: `SELECT count(*) FILTER (WHERE placed_at >= TIMESTAMPTZ '2025-07-01 00:00:00+00'
                             AND placed_at < TIMESTAMPTZ '2025-08-01 00:00:00+00'),
       count(*)
FROM orders`,
    about: "selectividad del rango de julio sobre orders",
  },
  {
    lesson: "indices-leer-un-plan-de-ejecucion",
    dataset: "pidelo",
    prose: "Pasan 13 284 de 14 437",
    sql: "SELECT count(*) FILTER (WHERE status = 'delivered'), count(*) FROM orders",
    about: "pedidos entregados sobre el total",
  },
  {
    lesson: "indices-leer-un-plan-de-ejecucion",
    dataset: "pidelo",
    prose: "las 400 filas de `restaurants`",
    sql: "SELECT count(*) FROM restaurants",
    about: "filas de restaurants",
  },
  {
    lesson: "indices-leer-un-plan-de-ejecucion",
    dataset: "pidelo",
    prose:
      "los 1280 pedidos de agosto leídos por índice; `HashAggregate` agrupa por nombre y devuelve 375 filas",
    sql: `SELECT count(*), count(DISTINCT r.name)
FROM orders o JOIN restaurants r ON r.id = o.restaurant_id
WHERE o.placed_at >= TIMESTAMPTZ '2025-08-01 00:00:00+00'
  AND o.placed_at < TIMESTAMPTZ '2025-09-01 00:00:00+00'`,
    about: "pedidos de agosto y restaurantes distintos que los reciben",
  },
  {
    lesson: "having-filtrar-grupos",
    dataset: "pidelo",
    prose:
      "Los 400 restaurantes se convierten en 400 grupos, uno por restaurante, y `HAVING` deja pasar solo 12",
    sql: `SELECT (SELECT count(*) FROM restaurants),
       (SELECT count(DISTINCT restaurant_id) FROM orders WHERE status = 'delivered'),
       (SELECT count(*) FROM (SELECT 1 FROM orders WHERE status = 'delivered'
                              GROUP BY restaurant_id HAVING count(*) >= 60) g)`,
    about: "restaurantes, grupos con entregas y grupos que pasan el umbral",
  },
  {
    lesson: "revisar-antes-de-enviar",
    dataset: "pidelo",
    prose: "es nulo en el 11 % de las calificaciones",
    sql: "SELECT round(100.0 * (count(*) - count(restaurant_rating)) / count(*)) FROM ratings",
    about: "calificaciones sin nota al restaurante",
  },
  {
    lesson: "entrevista-como-razonar-en-voz-alta",
    dataset: "pidelo",
    prose: "Si hay 400 restaurantes",
    sql: "SELECT count(*) FROM restaurants",
    about: "restaurantes de Pídelo",
  },

  // ── Bolsillo ────────────────────────────────────────────────────────────────
  {
    lesson: "subconsultas-in-exists-y-null",
    dataset: "bolsillo",
    prose: "devuelve 1774 cuentas activas",
    sql: `SELECT count(*) FROM accounts a
WHERE a.status = 'active'
  AND a.id IN (SELECT t.to_account_id FROM transfers t WHERE t.status = 'completed')`,
    about: "cuentas activas que recibieron una transferencia completada",
  },
  {
    lesson: "subconsultas-in-exists-y-null",
    dataset: "bolsillo",
    prose: "en 27 125 de los 32 243 movimientos está en `NULL`",
    sql: "SELECT count(*) FILTER (WHERE card_id IS NULL), count(*) FROM transactions",
    about: "movimientos sin tarjeta asociada y movimientos totales",
  },
  {
    lesson: "subconsultas-in-exists-y-null",
    dataset: "bolsillo",
    prose: "1638 tarjetas sin uso",
    sql: "SELECT count(*) FROM cards c WHERE NOT EXISTS (SELECT 1 FROM transactions t WHERE t.card_id = c.id)",
    about: "tarjetas que nunca se usaron",
  },
  {
    lesson: "subconsultas-correlacionadas",
    dataset: "bolsillo",
    prose: "El resultado son 126 cuentas",
    sql: "SELECT count(*) FROM accounts WHERE status = 'frozen'",
    about: "cuentas congeladas",
  },
  {
    lesson: "entrevista-errores-que-cuestan-la-oferta",
    dataset: "bolsillo",
    prose: "una consulta sobre 300 comercios",
    sql: "SELECT count(*) FROM merchants",
    about: "comercios de Bolsillo",
  },
  {
    lesson: "ia-varias-tablas-y-supuestos",
    dataset: "ritmo",
    prose: "Ritmo tiene 5000 oyentes y solo 2010 tienen al menos una playlist",
    sql: "SELECT (SELECT count(*) FROM users), (SELECT count(DISTINCT user_id) FROM playlists)",
    about: "oyentes totales y oyentes con al menos una playlist",
  },
  {
    lesson: "ia-verificar-antes-de-entregar",
    dataset: "pidelo",
    prose: "hubo 1179 pedidos entregados, y el join con `order_items` los convierte en 2977 filas",
    sql: `SELECT count(DISTINCT o.id), count(*)
FROM orders o JOIN order_items oi ON oi.order_id = o.id
WHERE o.status = 'delivered'
  AND o.placed_at >= TIMESTAMPTZ '2025-08-01 00:00:00+00'
  AND o.placed_at < TIMESTAMPTZ '2025-09-01 00:00:00+00'`,
    about: "pedidos entregados de agosto de 2025 y filas tras unir con order_items",
  },
];
