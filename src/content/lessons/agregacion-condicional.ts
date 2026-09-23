import type { LessonDef } from "../schemas/curriculum";

const section = "agregacion-condicional";

export const lessons: LessonDef[] = [
  {
    slug: "agregacion-condicional-case-y-filter",
    section,
    kind: "theory",
    title: "Contar y sumar con condición",
    sort_order: 0,
    estimated_minutes: 10,
    is_free: false,
    is_published: true,
    prerequisites: ["case-segmentos-de-negocio", "group-by-basico"],
    dataset: "tiendaviva",
    body_md: `## Por qué importa

Te piden «cuántos pedidos se entregaron, cuántos se cancelaron y cuántos se devolvieron». La salida ingenua son tres consultas con tres \`WHERE\` distintos, tres resultados sueltos y una planilla para pegarlos. La agregación condicional resuelve las tres métricas en **una sola pasada** por la tabla, en una sola fila y con una sola definición de negocio.

La idea es simple: \`WHERE\` decide qué filas entran al cálculo **completo**; la condición dentro del agregado decide qué filas entran **a esa columna**. Las demás filas siguen ahí para las otras columnas.

## FILTER: la forma directa

PostgreSQL permite adjuntar un \`FILTER (WHERE ...)\` a cualquier función de agregación:

\`\`\`sql
SELECT
  count(*) AS total_orders,
  count(*) FILTER (WHERE status = 'delivered') AS delivered_orders,
  count(*) FILTER (WHERE status = 'cancelled') AS cancelled_orders,
  sum(total_amount) FILTER (WHERE status = 'delivered') AS delivered_amount
FROM orders;
\`\`\`

Cada agregado recorre las mismas 18 000 filas, pero solo suma o cuenta las que cumplen su propia condición. El resultado es una fila con cuatro columnas comparables entre sí, porque salen del mismo recorte de datos y del mismo momento.

## CASE dentro del agregado: la forma portable

Antes de \`FILTER\` (y todavía hoy, en motores que no lo soportan) se escribe lo mismo con \`CASE\` como argumento del agregado:

\`\`\`sql
SELECT
  sum(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) AS delivered_orders,
  count(CASE WHEN status = 'cancelled' THEN 1 END) AS cancelled_orders
FROM orders;
\`\`\`

Las dos líneas cuentan, con dos mecanismos distintos:

- \`sum(CASE ... THEN 1 ELSE 0 END)\` suma unos y ceros.
- \`count(CASE ... THEN 1 END)\` aprovecha que \`count\` **ignora los NULL**: las filas que no cumplen devuelven NULL porque el \`CASE\` no tiene \`ELSE\`.

Ambas formas son equivalentes a \`FILTER\`. Usa \`FILTER\` cuando trabajes en PostgreSQL: se lee mejor y deja clara la intención. Usa \`CASE\` cuando la consulta deba correr también en otros motores.

## El error clásico: el ELSE 0 dentro de COUNT

\`\`\`sql
count(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END)  -- ¡cuenta TODAS las filas!
\`\`\`

Con \`ELSE 0\`, las filas que no cumplen devuelven cero, que **no es NULL**, así que \`count\` las cuenta igual. El resultado es el total de pedidos, no los cancelados. Regla: con \`count\`, sin \`ELSE\`; con \`sum\`, \`ELSE 0\`.

## Sumar y promediar con condición

La condición no se limita a contar. Estos agregados conviven en la misma consulta:

\`\`\`sql
SELECT
  avg(total_amount) FILTER (WHERE channel = 'app') AS avg_app,
  avg(total_amount) FILTER (WHERE channel = 'web') AS avg_web,
  max(total_amount) FILTER (WHERE status = 'delivered') AS max_delivered
FROM orders
WHERE currency = 'MXN';
\`\`\`

Fíjate en el \`WHERE\`: recorta el universo (solo pedidos en pesos mexicanos, para no mezclar monedas) y los \`FILTER\` reparten ese universo en columnas. Son dos niveles de filtrado distintos y complementarios.

## Cuando ninguna fila cumple

\`count(*) FILTER (...)\` devuelve **0** si ninguna fila cumple. \`sum(...) FILTER (...)\` devuelve **NULL**, porque sumar un conjunto vacío no da cero: da «nada». Si ese NULL va a un reporte o a una división, envuélvelo: \`COALESCE(sum(...) FILTER (...), 0)\`.

## Resumen

- \`WHERE\` filtra la consulta entera; \`FILTER\` y \`CASE\` filtran una columna calculada.
- \`count(*) FILTER (WHERE c)\` equivale a \`count(CASE WHEN c THEN 1 END)\` y a \`sum(CASE WHEN c THEN 1 ELSE 0 END)\`.
- Un \`ELSE 0\` dentro de \`count\` cuenta todo; una suma sin filas que cumplan devuelve NULL, no cero.
`,
  },
  {
    slug: "agregacion-condicional-tablas-pivote",
    section,
    kind: "theory",
    title: "Pivotar filas en columnas",
    sort_order: 1,
    estimated_minutes: 9,
    is_free: false,
    is_published: true,
    prerequisites: ["agregacion-condicional-case-y-filter"],
    dataset: "tiendaviva",
    body_md: `## Por qué importa

Un \`GROUP BY\` con dos dimensiones devuelve el formato **largo**: una fila por combinación.

\`\`\`sql
SELECT c.country, o.channel, count(*) AS orders
FROM orders o
JOIN customers c ON c.id = o.customer_id
GROUP BY c.country, o.channel;
\`\`\`

Son 18 filas (6 países × 3 canales). Es perfecto para alimentar otra consulta, pero quien pidió el reporte quiere leer **6 filas y 3 columnas**: el formato ancho, la tabla pivote de siempre. Eso se arma con agregación condicional.

## La receta

1. En el \`GROUP BY\` va lo que quieres **como filas**.
2. Cada valor de la otra dimensión se convierte en **una columna** con su propio agregado condicional.

\`\`\`sql
SELECT
  c.country,
  count(*) FILTER (WHERE o.channel = 'app') AS app_orders,
  count(*) FILTER (WHERE o.channel = 'web') AS web_orders,
  count(*) FILTER (WHERE o.channel = 'marketplace_partner') AS partner_orders,
  count(*) AS total_orders
FROM orders o
JOIN customers c ON c.id = o.customer_id
GROUP BY c.country
ORDER BY c.country;
\`\`\`

El canal desapareció del \`GROUP BY\` y reapareció como tres columnas. La columna \`total_orders\` sin \`FILTER\` da el total de la fila y sirve de control: si las tres columnas no suman el total, hay un valor de \`channel\` que no contemplaste.

## El costo: las columnas son fijas

Una tabla pivote escrita a mano **congela** la lista de valores. Si mañana el marketplace agrega el canal \`retail\`, esos pedidos entran en \`total_orders\` pero no aparecen en ninguna columna propia, y nadie lo va a notar salvo que mires la diferencia. Por eso:

- Pivota solo dimensiones con pocos valores y estables (canal, estado, método de pago, trimestre).
- No pivotes dimensiones abiertas (ciudad, producto, cliente): deja el formato largo.
- Deja siempre una columna de total, o una columna «otros», como red de seguridad.

## Pivotar también sirve para comparar períodos

Las columnas no tienen que salir de una sola columna de la tabla: cualquier condición vale, incluidas las de fecha.

\`\`\`sql
SELECT
  c.country,
  sum(o.total_amount) FILTER (WHERE o.created_at >= DATE '2025-01-01') AS amount_2025,
  sum(o.total_amount) FILTER (WHERE o.created_at < DATE '2025-01-01') AS amount_2024
FROM orders o
JOIN customers c ON c.id = o.customer_id
WHERE o.currency = 'MXN' AND o.status = 'delivered'
GROUP BY c.country;
\`\`\`

Así obtienes el año actual y el anterior **uno al lado del otro**, listos para calcular la variación, sin unir dos consultas ni exportar nada.

## Lo contrario también existe

Pasar de ancho a largo (despivotar) se hace con \`UNION ALL\` o con \`unnest\`. Regla práctica: guarda y calcula en formato largo, presenta en formato ancho. El formato ancho es para el ojo humano; el largo es el que otras consultas pueden seguir usando.

## Resumen

- Pivotar es mover una dimensión del \`GROUP BY\` a columnas con agregados condicionales.
- La lista de columnas queda fija: agrega un total de control y evita dimensiones abiertas.
- Cualquier condición sirve como columna, incluidos los rangos de fechas para comparar períodos.
`,
  },
  {
    slug: "agregacion-condicional-tasas-y-proporciones",
    section,
    kind: "theory",
    title: "Tasas y proporciones sin división por cero",
    sort_order: 2,
    estimated_minutes: 9,
    is_free: false,
    is_published: true,
    prerequisites: ["agregacion-condicional-tablas-pivote", "null-coalesce-y-nullif"],
    dataset: "tiendaviva",
    body_md: `## Por qué importa

Los conteos absolutos engañan: México cancela más pedidos que Uruguay simplemente porque vende mucho más. Lo comparable es la **tasa**: cancelados sobre total. Con agregación condicional, el numerador y el denominador se calculan en la misma consulta y sobre exactamente las mismas filas.

## La forma canónica

\`\`\`sql
SELECT
  c.country,
  count(*) AS total_orders,
  count(*) FILTER (WHERE o.status = 'cancelled') AS cancelled_orders,
  round(
    100.0 * count(*) FILTER (WHERE o.status = 'cancelled') / nullif(count(*), 0),
    2
  ) AS cancellation_rate_pct
FROM orders o
JOIN customers c ON c.id = o.customer_id
GROUP BY c.country
ORDER BY cancellation_rate_pct DESC;
\`\`\`

Hay tres detalles que deciden si el número es correcto.

## 1. División entera

\`count(*)\` devuelve un entero. En PostgreSQL, un entero dividido por otro entero da un **entero**: \`706 / 5446\` da \`0\`, no \`0.1296\`. Multiplicar primero por \`100.0\` (con punto decimal) convierte la operación a numérica y salva el cálculo. Alternativas equivalentes: \`count(*)::numeric\` o \`cast(count(*) AS numeric)\`.

## 2. Denominador cero

Si un grupo pudiera quedar sin filas en el denominador —por ejemplo, la tasa de devolución sobre los pedidos entregados de un vendedor que todavía no entregó nada—, la división falla con un error que corta **toda** la consulta. \`nullif(denominador, 0)\` convierte el cero en NULL y la división devuelve NULL: el reporte muestra «sin dato», que es la verdad, en lugar de romperse.

## 3. Redondeo

\`round(x, 2)\` deja dos decimales. Redondea solo al final, nunca los valores intermedios, y acuerda con quien pide el reporte si la tasa se expresa en porcentaje (0 a 100) o en proporción (0 a 1). Nombrar la columna \`..._pct\` evita la mitad de las discusiones.

## Una tasa para cada pregunta

El mismo patrón sirve para la aprobación de pagos, la participación de un canal o la adopción de la app. Y cuando el negocio pregunta por **clientes distintos**, no por pedidos, el agregado también acepta la condición:

\`\`\`sql
SELECT
  c.country,
  count(DISTINCT o.customer_id) AS buying_customers,
  count(DISTINCT o.customer_id) FILTER (WHERE o.channel = 'app') AS app_customers
FROM orders o
JOIN customers c ON c.id = o.customer_id
GROUP BY c.country;
\`\`\`

Aquí \`sum(CASE ... THEN 1 ELSE 0 END)\` **no** sirve: contaría pedidos, no personas. La alternativa portable es \`count(DISTINCT CASE WHEN o.channel = 'app' THEN o.customer_id END)\`.

## Por qué no dos consultas separadas

Podrías calcular el total en una consulta, los cancelados en otra y dividir a mano. Tres problemas: recorres la tabla dos veces, los dos resultados pueden corresponder a momentos distintos, y la definición de «cancelado» queda escrita en dos lugares que tarde o temprano se desincronizan. Una sola consulta es más rápida, consistente y auditable.

## Resumen

- Multiplica por \`100.0\` antes de dividir: entero sobre entero trunca.
- \`nullif(denominador, 0)\` cambia un error fatal por un NULL honesto.
- \`count(DISTINCT ...) FILTER (...)\` cuenta personas, no filas; \`sum(CASE ...)\` no puede hacerlo.
`,
  },
];
