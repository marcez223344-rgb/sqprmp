import type { LessonDef } from "../schemas/curriculum";

const section = "group-by";

export const lessons: LessonDef[] = [
  {
    slug: "group-by-basico",
    section,
    kind: "theory",
    title: "GROUP BY: una fila por grupo",
    sort_order: 0,
    estimated_minutes: 10,
    is_free: false,
    is_published: true,
    prerequisites: ["agregacion-count-sum-avg"],
    dataset: "pidelo",
    body_md: `## Por qué importa

«Pedidos por estado», «clientes por ciudad», «ventas por mes»: casi todo reporte pide un número calculado **por categoría**. \`GROUP BY\` hace exactamente eso: reparte las filas en grupos según el valor de una o varias columnas y después aplica a cada grupo una función de agregación, es decir, una función que resume muchas filas en un solo valor, como \`count\`, \`sum\` o \`avg\`.

Trabajas con **Pídelo**, una aplicación de pedidos de comida. En su tabla \`orders\` cada fila es un pedido, y te interesan tres de sus columnas: \`status\` (el estado del pedido: \`delivered\`, \`cancelled\` y similares), \`payment_method\` (el medio de pago con el que se abonó) y \`placed_at\` (el instante en que se hizo el pedido).

## El concepto

\`\`\`sql
SELECT status, count(*) AS pedidos
FROM orders
GROUP BY status
ORDER BY pedidos DESC;
\`\`\`

El resultado tiene una fila por cada valor distinto que aparezca en \`status\`, la columna \`status\` de la tabla \`orders\`, y en cada fila la cantidad de pedidos que están en ese estado. El orden en que salen esos grupos **no está garantizado** y puede cambiar entre ejecuciones, así que agrega \`ORDER BY\` siempre que el orden importe para quien lea el reporte.

## La regla de oro

Toda columna que aparezca en el \`SELECT\` tiene que estar **en el \`GROUP BY\`** o **dentro de una función de agregación**. Si no, PostgreSQL rechaza la consulta con el mensaje «must appear in the GROUP BY clause or be used in an aggregate function» («debe aparecer en la cláusula GROUP BY o usarse en una función de agregación»). La razón es concreta: si el grupo de los pedidos entregados reúne 800 filas con 800 valores distintos en \`customer_id\` —la columna \`customer_id\` de la tabla \`orders\`, que indica qué cliente hizo el pedido—, el motor no tiene forma de decidir cuál de esos 800 valores mostrar en la única fila que le corresponde al grupo.

## Orden de evaluación

\`\`\`sql
SELECT payment_method, count(*) AS pedidos
FROM orders
WHERE status = 'delivered'     -- 1. filtra filas
GROUP BY payment_method        -- 2. agrupa
ORDER BY pedidos DESC;         -- 3. ordena grupos
\`\`\`

\`WHERE\` filtra **filas** antes de que se formen los grupos, así que las filas descartadas no cuentan para ninguna agregación. Para filtrar **grupos** ya formados, por ejemplo quedarte solo con los medios de pago que superan los 1000 pedidos, existe otra cláusula, \`HAVING\`, que verás en la sección 16.

## Agrupar por varias columnas

\`\`\`sql
SELECT status, payment_method, count(*) AS pedidos
FROM orders
GROUP BY status, payment_method
ORDER BY status, payment_method;
\`\`\`

Ahora el resultado tiene una fila por cada **combinación** de estado y medio de pago que exista en los datos. La cantidad de filas es, como máximo, el producto entre la cantidad de estados distintos y la cantidad de medios de pago distintos; será menor si alguna combinación no ocurre nunca.

## Agrupar por expresiones

Puedes agrupar por una expresión, por ejemplo el mes de un timestamp:

\`\`\`sql
SELECT date_trunc('month', placed_at)::date AS mes, count(*) AS pedidos
FROM orders
GROUP BY date_trunc('month', placed_at)
ORDER BY mes;
\`\`\`

En PostgreSQL también puedes agrupar escribiendo \`GROUP BY mes\`, con el alias que le diste a la columna, o \`GROUP BY 1\`, con la posición que ocupa en la lista del \`SELECT\`. El alias se lee mejor. La posición es riesgosa: si mañana reordenas las columnas del \`SELECT\`, la consulta sigue ejecutándose sin error pero pasa a agrupar por otra columna.

## NULL forma su propio grupo

Como en \`DISTINCT\`, todas las filas que tienen NULL en la columna agrupada quedan juntas en un mismo grupo. Al escribir \`GROUP BY promotion_id\` —\`promotion_id\` es la columna de la tabla \`orders\` que indica qué promoción se aplicó al pedido— aparece un grupo cuyo valor es NULL: son los pedidos que no usaron ninguna promoción.

## Ejemplo resuelto

Pedido: «¿Cuántos pedidos y cuántos clientes distintos por método de pago, solo entregados?».

\`\`\`sql
SELECT
  payment_method,
  count(*) AS pedidos,
  count(DISTINCT customer_id) AS clientes
FROM orders
WHERE status = 'delivered'
GROUP BY payment_method
ORDER BY pedidos DESC;
\`\`\`
`,
  },
  {
    slug: "group-by-reportes",
    section,
    kind: "theory",
    title: "Reportes por período y por entidad",
    sort_order: 1,
    estimated_minutes: 8,
    is_free: false,
    is_published: true,
    prerequisites: ["group-by-basico"],
    dataset: "pidelo",
    body_md: `## Series temporales

El patrón «una métrica por mes» es el más frecuente del análisis de datos:

\`\`\`sql
SELECT
  date_trunc('month', placed_at)::date AS mes,
  count(*) AS pedidos,
  count(DISTINCT customer_id) AS clientes
FROM orders
WHERE placed_at >= '2025-01-01'
GROUP BY mes
ORDER BY mes;
\`\`\`

\`date_trunc('month', ts)\` recorta un instante al primer momento de su mes: cualquier pedido de marzo se convierte en \`2025-03-01 00:00\`, y por eso todos los pedidos de marzo caen en el mismo grupo. Agregar \`::date\` convierte ese resultado en una fecha sin hora, más cómoda de leer en un reporte. Para agrupar por semana usa \`'week'\` y por día \`'day'\`. Ten en cuenta la zona horaria: sobre una columna \`timestamptz\`, que guarda un instante absoluto, \`date_trunc\` usa la zona horaria de la sesión, y en este entorno de práctica esa zona es siempre UTC (por *Coordinated Universal Time*, el tiempo universal coordinado).

## Ranking de entidades

«Top 10 restaurantes por pedidos entregados»:

\`\`\`sql
SELECT restaurant_id, count(*) AS entregados
FROM orders
WHERE status = 'delivered'
GROUP BY restaurant_id
ORDER BY entregados DESC, restaurant_id
LIMIT 10;
\`\`\`

El segundo criterio de orden es \`restaurant_id\`, la columna \`restaurant_id\` de la tabla \`orders\`, que identifica al restaurante que recibió el pedido. Está ahí para desempatar: sin él, dos restaurantes con la misma cantidad de entregas pueden intercambiar posición entre una ejecución y otra, y el top 10 dejaría de ser reproducible.

## Unidades comparables

Antes de sumar o promediar por grupo, verifica que todas las filas del grupo estén expresadas en la misma unidad. En Pídelo cada ciudad opera con su propia moneda, así que sumar la columna \`total\` de \`orders\` agrupando por ciudad da un importe con sentido. En cambio, sumar \`total\` agrupando por medio de pago junta ciudades y, con ellas, monedas distintas: el número que sale no representa nada, aunque la consulta se ejecute sin error.

## Leer el resultado

Antes de mirar los números, pregúntate cuántas filas esperabas. Si agrupas por mes desde enero de 2025 hasta septiembre, esperas 9 filas. Si aparecen 10, revisa los extremos del rango de fechas. Si aparecen 8, es que algún mes no tuvo ni un pedido: un grupo sin filas **no** aparece en el resultado, y para mostrarlo con un cero hay que unir contra una tabla de calendario con \`LEFT JOIN\` (sección 18).

## Ejemplo resuelto

Pedido: «Uso de cada promoción: cuántas veces se aplicó y cuántos clientes distintos la usaron».

\`\`\`sql
SELECT
  promotion_id,
  count(*) AS usos,
  count(DISTINCT customer_id) AS clientes
FROM orders
WHERE promotion_id IS NOT NULL
GROUP BY promotion_id
ORDER BY usos DESC;
\`\`\`

Si en una promoción pensada para un solo uso por persona la columna \`usos\` resulta mayor que \`clientes\`, significa que alguien la aplicó más de una vez: encontraste un uso indebido que conviene reportar.

## Próximos pasos

**Lo que ya puedes hacer:** Sabes agrupar por una o varias columnas, calcular métricas por grupo y elegir el nivel de detalle que pide cada pregunta de negocio.

**Antes de seguir:** resuelve los ejercicios y el quiz de esta sección.

**Lo que sigue:** Sección 16 · HAVING: filtrar grupos. Vas a quedarte solo con los grupos cuyos totales cumplen una condición.

**Para practicar (opcional):** ¿Cuántos pedidos tuvo TiendaViva en cada canal de venta y cada estado? Agrupa la tabla \`orders\` por \`channel\` y \`status\` y cuenta los pedidos.
`,
  },
];
