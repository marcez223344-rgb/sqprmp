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

Te piden «cuántos pedidos se entregaron, cuántos se cancelaron y cuántos se devolvieron». La salida ingenua son tres consultas con tres \`WHERE\` distintos, tres resultados sueltos y una planilla para pegarlos. La **agregación condicional** —contar o sumar aplicando una condición propia a cada columna del resultado— resuelve las tres métricas en **una sola pasada** por la tabla, en una sola fila y con una sola definición de negocio.

La idea es simple y conviene fijarla antes de ver la sintaxis. El \`WHERE\` decide qué filas entran al cálculo **completo** de la consulta. La condición que va dentro de cada función de agregación decide, entre esas filas, cuáles cuentan **para esa columna en particular**. Las filas que una columna descarta siguen disponibles para las demás columnas.

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

Los cuatro agregados recorren las mismas 18 000 filas de \`orders\`, y cada uno suma o cuenta solamente las que cumplen su propia condición. El resultado es una fila con cuatro columnas que se pueden comparar entre sí sin aclaraciones, porque salieron del mismo recorte de datos y del mismo momento.

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

Con \`ELSE 0\`, las filas que no cumplen la condición devuelven cero, y el cero **no es NULL**: es un valor como cualquier otro, así que \`count\` lo cuenta igual. Obtienes el total de pedidos en lugar de los cancelados, y como ese número es plausible nadie lo cuestiona. La regla para recordarlo: cuando el agregado es \`count\`, el \`CASE\` va sin \`ELSE\`; cuando el agregado es \`sum\`, el \`CASE\` lleva \`ELSE 0\`.

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

Fíjate en el \`WHERE\`. Recorta el universo de la consulta y deja solo los pedidos en pesos mexicanos, para que ningún promedio mezcle dos monedas. Los \`FILTER\` reparten después ese mismo universo entre las columnas. Son dos niveles de filtrado distintos que se complementan, y equivocarse de nivel cambia el resultado sin producir ningún error.

## Cuando ninguna fila cumple

\`count(*) FILTER (...)\` devuelve **0** si ninguna fila cumple. \`sum(...) FILTER (...)\` devuelve **NULL**, porque sumar un conjunto vacío no da cero: da «nada». Si ese NULL va a un reporte o a una división, envuélvelo: \`COALESCE(sum(...) FILTER (...), 0)\`.

## Resumen

- El \`WHERE\` filtra la consulta entera. El \`FILTER\` y el \`CASE\` dentro de un agregado filtran una sola columna calculada.
- \`count(*) FILTER (WHERE c)\` equivale a \`count(CASE WHEN c THEN 1 END)\` y a \`sum(CASE WHEN c THEN 1 ELSE 0 END)\`.
- Un \`ELSE 0\` dentro de \`count\` hace que se cuenten todas las filas. Y una suma sobre la que ninguna fila cumple la condición devuelve NULL, no cero.
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

Un \`GROUP BY\` con dos dimensiones —dos columnas por las que agrupas, por ejemplo el país del cliente y el canal de compra— devuelve el resultado en formato **largo**: una fila por cada combinación de valores.

\`\`\`sql
SELECT c.country, o.channel, count(*) AS orders
FROM orders o
JOIN customers c ON c.id = o.customer_id
GROUP BY c.country, o.channel;
\`\`\`

Son 18 filas (6 países × 3 canales). Ese formato es ideal para alimentar otra consulta, porque cada fila lleva sus propias etiquetas. Pero quien pidió el reporte quiere leerlo como **6 filas y 3 columnas**, con un país por fila y un canal por columna: es el formato **ancho**, lo que en una planilla se llama tabla dinámica o tabla pivote. Eso se arma con agregación condicional.

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

El canal salió del \`GROUP BY\` y reapareció como tres columnas. La columna \`total_orders\`, que no lleva \`FILTER\`, da el total de la fila y sirve de control: si las tres columnas de canal no suman ese total, existe algún valor de \`channel\` —la columna de \`orders\` que indica por dónde entró el pedido— que no contemplaste al escribir la consulta.

## El costo: las columnas son fijas

Una tabla pivote escrita a mano **congela** la lista de valores el día que la escribes. Si mañana el marketplace agrega el canal \`retail\`, esos pedidos se cuentan en \`total_orders\` pero no aparecen en ninguna columna propia. La consulta sigue corriendo sin ningún error y el reporte queda incompleto; solo lo notas si comparas la suma de las columnas contra el total. Por eso:

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

Así obtienes el año actual y el anterior **uno al lado del otro**, en la misma fila y listos para restarlos y calcular la variación, sin escribir dos consultas ni exportar nada a una planilla.

## Lo contrario también existe

Pasar de ancho a largo, es decir, despivotar, se hace con \`UNION ALL\` o con \`unnest\`. Regla práctica: guarda y calcula en formato largo, y pivota solo al final, para presentar. El formato ancho está pensado para que una persona lo lea. El formato largo es el que otras consultas pueden seguir procesando, porque cada valor viene acompañado de su etiqueta en la misma fila.

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

Los conteos absolutos llevan a conclusiones equivocadas cuando los grupos tienen tamaños distintos: México cancela más pedidos que Uruguay simplemente porque vende mucho más, no porque cancele peor. Lo que sí se puede comparar es la **tasa**, es decir, los pedidos cancelados divididos por el total de pedidos de ese mismo país. Con agregación condicional, el numerador (los cancelados) y el denominador (el total) se calculan en la misma consulta y sobre exactamente las mismas filas.

## La forma habitual

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

\`count(*)\` devuelve un entero. En PostgreSQL, un entero dividido por otro entero da un **entero**, con los decimales cortados: \`706 / 5446\` da \`0\`, no \`0.1296\`. Multiplicar primero por \`100.0\`, escrito con punto decimal, alcanza para que toda la operación se resuelva con decimales, porque basta con que uno de los operandos sea numérico. Dos formas equivalentes de conseguir lo mismo son \`count(*)::numeric\` y \`cast(count(*) AS numeric)\`. Cualquiera de las tres es correcta.

## 2. Denominador cero

Si un grupo pudiera quedar sin filas en el denominador —por ejemplo, la tasa de devolución sobre los pedidos entregados de un vendedor que todavía no entregó nada—, la división falla con un error que corta **toda** la consulta. \`nullif(denominador, 0)\` convierte el cero en NULL y la división devuelve NULL: el reporte muestra «sin dato», que es la verdad, en lugar de romperse.

## 3. Redondeo

\`round(x, 2)\` deja dos decimales. Redondea solo al final y nunca los valores intermedios, porque los redondeos encadenados se acumulan y el total deja de cerrar. Acuerda además con quien pide el reporte si la tasa se expresa en porcentaje (de 0 a 100) o en proporción (de 0 a 1): nombrar la columna con el sufijo \`_pct\` deja esa escala escrita en el propio resultado y evita buena parte de las discusiones.

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

Aquí \`sum(CASE ... THEN 1 ELSE 0 END)\` **no** sirve, porque sumaría un 1 por cada pedido y una misma persona con cuatro pedidos quedaría contada cuatro veces. La alternativa portable, para motores que no admiten \`FILTER\`, es \`count(DISTINCT CASE WHEN o.channel = 'app' THEN o.customer_id END)\`.

## Por qué no dos consultas separadas

Podrías calcular el total en una consulta, los cancelados en otra y dividir a mano. Eso trae tres problemas. Recorres la tabla dos veces, así que la consulta tarda el doble. Los dos resultados pueden corresponder a momentos distintos, y entonces la tasa mezcla dos fotos diferentes de los datos. Y la definición de «cancelado» queda escrita en dos lugares que tarde o temprano dejan de coincidir. Una sola consulta es más rápida, da un número consistente y deja la definición en un único sitio que cualquiera puede revisar.

## Resumen

- Multiplica por \`100.0\` antes de dividir: entero sobre entero trunca.
- \`nullif(denominador, 0)\` cambia un error fatal por un NULL honesto.
- \`count(DISTINCT ...) FILTER (...)\` cuenta personas distintas en lugar de filas. Un \`sum(CASE ...)\` no puede hacer eso, porque cuenta cada pedido por separado.
`,
  },
];
