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

«Pedidos por estado», «clientes por ciudad», «ventas por mes». Casi todo reporte es una agregación **por categoría**. \`GROUP BY\` divide las filas en grupos y aplica las funciones de agregación a cada grupo.

## El concepto

\`\`\`sql
SELECT status, count(*) AS pedidos
FROM orders
GROUP BY status
ORDER BY pedidos DESC;
\`\`\`

Resultado: una fila por cada valor distinto de \`status\`, con la cantidad de pedidos de ese grupo. El orden de las filas de un \`GROUP BY\` **no está garantizado**: agrega \`ORDER BY\` siempre que importe.

## La regla de oro

Toda columna del \`SELECT\` debe estar **en el \`GROUP BY\`** o **dentro de una función de agregación**. Si no, PostgreSQL falla con «must appear in the GROUP BY clause or be used in an aggregate function». No es un capricho: para una columna sin agrupar, el motor no sabe cuál de los valores del grupo mostrar.

## Orden de evaluación

\`\`\`sql
SELECT payment_method, count(*) AS pedidos
FROM orders
WHERE status = 'delivered'     -- 1. filtra filas
GROUP BY payment_method        -- 2. agrupa
ORDER BY pedidos DESC;         -- 3. ordena grupos
\`\`\`

\`WHERE\` filtra **filas** antes de agrupar. Para filtrar **grupos** (por ejemplo, métodos con más de 1000 pedidos) existe \`HAVING\`, en la sección 16.

## Agrupar por varias columnas

\`\`\`sql
SELECT status, payment_method, count(*) AS pedidos
FROM orders
GROUP BY status, payment_method
ORDER BY status, payment_method;
\`\`\`

Una fila por **combinación**. El número de filas es como máximo el producto de valores distintos.

## Agrupar por expresiones

Puedes agrupar por una expresión, por ejemplo el mes de un timestamp:

\`\`\`sql
SELECT date_trunc('month', placed_at)::date AS mes, count(*) AS pedidos
FROM orders
GROUP BY date_trunc('month', placed_at)
ORDER BY mes;
\`\`\`

En PostgreSQL también puedes escribir \`GROUP BY mes\` (el alias) o \`GROUP BY 1\` (la posición). El alias es legible; la posición es frágil si reordenas columnas.

## NULL forma su propio grupo

Como en \`DISTINCT\`, los NULL de la columna agrupada quedan juntos en un grupo. \`GROUP BY promotion_id\` produce un grupo NULL con los pedidos sin promoción.

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

El patrón «métrica por mes» es el más frecuente en analítica:

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

\`date_trunc('month', ts)\` devuelve el primer instante del mes; \`::date\` lo deja como fecha limpia. Para semanas usa \`'week'\`, para días \`'day'\`. Cuidado con la zona horaria: \`date_trunc\` sobre \`timestamptz\` usa la zona de la sesión (UTC en el sandbox).

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

El segundo criterio de orden (\`restaurant_id\`) desempata de forma determinista: sin él, dos restaurantes con la misma cantidad podrían intercambiar posición entre ejecuciones.

## Unidades comparables

Antes de sumar o promediar por grupo, verifica que todas las filas del grupo estén en la misma unidad. En Pídelo cada ciudad tiene su moneda: \`sum(total)\` por ciudad tiene sentido; \`sum(total)\` por método de pago (que mezcla ciudades) no.

## Leer el resultado

Un \`GROUP BY\` correcto responde: ¿cuántas filas esperaba? Si agrupas por mes desde enero de 2025 hasta septiembre, esperas 9 filas. Si aparecen 10, revisa el rango; si aparecen 8, algún mes no tuvo datos (los grupos vacíos **no** aparecen; para mostrarlos necesitas un LEFT JOIN contra un calendario, sección 18).

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

Si \`usos\` supera a \`clientes\` en una promoción de un solo uso por cliente, encontraste abuso: alguien la usó más de una vez.
`,
  },
];
