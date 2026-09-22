import type { LessonDef } from "../schemas/curriculum";

export const lessons: LessonDef[] = [
  {
    slug: "fechas-tipos-y-partes",
    section: "fechas-y-horas",
    kind: "theory",
    title: "Fechas y horas: tipos, EXTRACT y DATE_TRUNC",
    sort_order: 0,
    estimated_minutes: 10,
    is_free: false,
    is_published: true,
    prerequisites: [],
    dataset: "tiendaviva",
    body_md: `## Por qué importa

Casi todo reporte de negocio tiene una dimensión temporal: ventas del mes, tiempo de entrega, antigüedad de un cliente. Si te equivocas con el tipo de dato o con el borde de un rango, el número que entregas queda mal por poco... y nadie lo nota hasta que alguien audita.

## DATE, TIMESTAMP y TIMESTAMPTZ

PostgreSQL distingue tres tipos que se ven parecidos:

- \`date\` guarda **solo el día**: \`2025-09-15\`.
- \`timestamp\` guarda día y hora, **sin zona horaria**: \`2025-09-15 23:54:47\`.
- \`timestamptz\` guarda un instante absoluto y lo **muestra** en la zona horaria de la sesión.

En TiendaViva, \`sellers.joined_at\` es \`date\` (solo interesa el día del alta), mientras que \`orders.created_at\`, \`payments.paid_at\` y \`shipments.delivered_at\` son \`timestamptz\`: un pedido ocurre en un instante, no en un día.

Esa diferencia es la fuente número uno de errores en reportes. Un valor \`date\` equivale a ese día **a las 00:00**, así que \`created_at <= DATE '2025-08-31'\` deja fuera casi todo el 31 de agosto. Lo veremos en detalle en la tercera lección.

Con \`timestamptz\` el motor convierte al mostrar: el mismo instante se ve como \`2025-09-13 22:43\` en UTC y como \`2025-09-13 19:43\` en Buenos Aires. El dataset se ejecuta en UTC, así que todos los ejemplos son directos, pero en producción conviene fijar la zona horaria con \`AT TIME ZONE\` cuando el reporte es «por día local».

## EXTRACT: obtener una parte

\`EXTRACT\` devuelve un número a partir de una fecha:

\`\`\`sql
SELECT store_name,
       EXTRACT(YEAR FROM joined_at)  AS joined_year,
       EXTRACT(MONTH FROM joined_at) AS joined_month
FROM sellers;
\`\`\`

Campos habituales: \`YEAR\`, \`MONTH\`, \`DAY\`, \`HOUR\`, \`MINUTE\`, \`DOW\` (día de la semana, 0 = domingo), \`DOY\` (día del año), \`QUARTER\`, \`EPOCH\` (segundos desde 1970). \`DATE_PART('year', joined_at)\` hace exactamente lo mismo con otra sintaxis; usa la que prefieras y sé consistente.

Detalle importante: \`EXTRACT(MONTH FROM created_at)\` devuelve \`8\` tanto para agosto de 2024 como para agosto de 2025. Sirve para analizar estacionalidad, no para armar una serie mensual.

## DATE_TRUNC: quedarse con el período

\`DATE_TRUNC\` recorta la fecha a la unidad que le pidas y **conserva el resto en ceros**:

\`\`\`sql
SELECT DATE_TRUNC('month', TIMESTAMP '2025-08-31 22:10:05');
-- 2025-08-01 00:00:00
\`\`\`

Unidades típicas: \`'hour'\`, \`'day'\`, \`'week'\` (la semana empieza el lunes), \`'month'\`, \`'quarter'\`, \`'year'\`.

Como el resultado sigue siendo una fecha completa, todos los pedidos de agosto de 2025 comparten el valor \`2025-08-01\`: por eso \`DATE_TRUNC\` es la forma natural de armar series mensuales, semanales u horarias. Si el reporte no necesita la hora, conviértelo a \`date\`:

\`\`\`sql
SELECT DATE_TRUNC('month', created_at)::date AS month
FROM orders;
\`\`\`

## EXTRACT o DATE_TRUNC: cómo elegir

| Pregunta | Herramienta |
| --- | --- |
| ¿En qué mes del año vendemos más, mirando todos los años juntos? | \`EXTRACT(MONTH ...)\` |
| ¿Cómo evolucionaron las ventas mes a mes? | \`DATE_TRUNC('month', ...)\` |
| ¿Qué días de la semana hay más pedidos? | \`EXTRACT(DOW ...)\` |
| ¿Cuántos pedidos hubo cada semana? | \`DATE_TRUNC('week', ...)\` |

La regla corta: \`EXTRACT\` responde «qué parte»; \`DATE_TRUNC\` responde «qué período».

## Errores comunes

- Usar \`EXTRACT(MONTH ...)\` para una serie temporal: enero de 2024 y enero de 2025 se mezclan en un solo \`1\`.
- Suponer que \`DATE_TRUNC('week', ...)\` empieza el domingo: en PostgreSQL empieza el lunes (ISO).
- Comparar el resultado de \`EXTRACT\` con un texto: devuelve un número, así que compara con \`2025\`, no con \`'2025'\`.

## Resumen

1. \`date\` es un día; \`timestamptz\` es un instante, y esa diferencia cambia tus filtros.
2. \`EXTRACT\` saca una parte numérica; \`DATE_PART\` es su sinónimo.
3. \`DATE_TRUNC\` recorta al período y es la base de cualquier serie mensual o semanal.
`,
  },
  {
    slug: "fechas-diferencias-e-intervalos",
    section: "fechas-y-horas",
    kind: "theory",
    title: "Diferencias, intervalos y formato",
    sort_order: 1,
    estimated_minutes: 10,
    is_free: false,
    is_published: true,
    prerequisites: ["fechas-tipos-y-partes"],
    dataset: "tiendaviva",
    body_md: `## Por qué importa

«¿Cuántos días tardamos en entregar?», «¿cuántos pedidos llegaron después de lo prometido?», «¿qué vendedores cumplen tres años con nosotros?». Todas son restas entre fechas, y el resultado cambia según el tipo de dato que restes.

## Restar fechas

Restar dos \`date\` devuelve un **entero**: la cantidad de días calendario.

\`\`\`sql
SELECT DATE '2025-09-10' - DATE '2025-09-01';  -- 9
\`\`\`

Restar dos \`timestamptz\` devuelve un **interval**, que conserva horas, minutos y segundos:

\`\`\`sql
SELECT TIMESTAMP '2025-09-10 08:00' - TIMESTAMP '2025-09-01 20:00';
-- 8 days 12:00:00
\`\`\`

Las dos respuestas son correctas, pero miden cosas distintas: 9 días calendario frente a 8 días y medio reales. Antes de escribir la consulta, define qué pide el negocio. Para «días de entrega» en TiendaViva usamos días calendario, así que llevamos ambos extremos a \`date\`:

\`\`\`sql
SELECT order_id,
       delivered_at::date - shipped_at::date AS delivery_days
FROM shipments
WHERE delivered_at IS NOT NULL;
\`\`\`

El \`::date\` es la sintaxis corta de \`CAST(delivered_at AS date)\`. Y el filtro \`IS NOT NULL\` importa: 1110 envíos todavía no se entregaron, y cualquier operación con NULL devuelve NULL.

## Convertir un interval en un número

Un \`interval\` no se promedia ni se grafica cómodamente. Para obtener un número, extrae los segundos y divide:

\`\`\`sql
SELECT ROUND(EXTRACT(EPOCH FROM (delivered_at - shipped_at)) / 3600) AS delivery_hours
FROM shipments
WHERE delivered_at IS NOT NULL;
\`\`\`

\`EPOCH\` sobre un interval devuelve su duración total en segundos: divide entre 60 para minutos, 3600 para horas, 86 400 para días.

Cuidado con \`EXTRACT(DAY FROM ...)\`: devuelve **solo el componente de días** del interval. Para \`8 days 12:00:00\` da \`8\` y descarta las 12 horas restantes; no es un redondeo, es un truncamiento por componente.

## AGE: la diferencia «humana»

\`AGE(fecha_mayor, fecha_menor)\` devuelve un interval expresado en años, meses y días:

\`\`\`sql
SELECT AGE(DATE '2025-09-15', DATE '2022-02-06');  -- 3 years 7 mons 9 days
\`\`\`

Es ideal para antigüedades. Combinado con \`EXTRACT\` te da los años cumplidos:

\`\`\`sql
SELECT store_name,
       EXTRACT(YEAR FROM AGE(DATE '2025-09-15', joined_at)) AS years_active
FROM sellers;
\`\`\`

Con un solo argumento, \`AGE(fecha)\` compara contra la fecha actual del servidor. En este curso los datasets tienen un «hoy» fijo (2025-09-15), así que siempre escribimos la fecha de referencia de forma explícita: los resultados deben ser reproducibles.

## Sumar y restar tiempo con INTERVAL

\`\`\`sql
SELECT created_at + INTERVAL '7 days'  AS deadline,
       created_at - INTERVAL '1 month' AS mes_anterior
FROM orders;
\`\`\`

Y cuando la cantidad está en una columna, multiplica el intervalo unitario:

\`\`\`sql
SELECT id
FROM orders
WHERE delivered_at > placed_at + promised_minutes * INTERVAL '1 minute';
\`\`\`

Ese patrón (\`columna * INTERVAL '1 unidad'\`) es la forma estándar de usar un número guardado en la tabla como duración.

## Formato con TO_CHAR

\`TO_CHAR\` convierte una fecha en texto con el formato que definas:

\`\`\`sql
SELECT TO_CHAR(created_at, 'YYYY-MM')            AS periodo,     -- 2025-08
       TO_CHAR(created_at, 'DD/MM/YYYY')         AS fecha_local, -- 31/08/2025
       TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI') AS momento
FROM orders;
\`\`\`

Úsalo para presentar, no para ordenar ni comparar: el resultado es texto, y \`'31/08/2025'\` se ordena alfabéticamente. \`'YYYY-MM'\` es la excepción práctica, porque su orden alfabético coincide con el cronológico.

## Errores comunes

- Restar timestamps cuando el negocio pide días calendario (o al revés).
- Usar \`EXTRACT(DAY FROM ...)\` creyendo que redondea la duración total.
- Olvidar \`IS NOT NULL\` y perder filas silenciosamente.
- Ordenar por una fecha formateada con \`TO_CHAR\` en vez de por la columna original.

## Resumen

1. \`date - date\` da días enteros; \`timestamp - timestamp\` da un interval.
2. \`EXTRACT(EPOCH FROM ...)\` convierte cualquier duración en un número que puedes dividir.
3. \`AGE\` sirve para antigüedades e \`INTERVAL\` para sumar o restar tiempo; \`TO_CHAR\` solo para presentar.
`,
  },
  {
    slug: "fechas-rangos-sin-errores-de-borde",
    section: "fechas-y-horas",
    kind: "theory",
    title: "Rangos de fechas sin errores de borde",
    sort_order: 2,
    estimated_minutes: 8,
    is_free: false,
    is_published: true,
    prerequisites: ["fechas-diferencias-e-intervalos"],
    dataset: "tiendaviva",
    body_md: `## Por qué importa

Este es el error más caro de toda la sección, porque no falla: devuelve un número creíble, apenas más bajo que el correcto. Filtrar «agosto» con \`BETWEEN\` sobre una columna \`timestamptz\` pierde casi todo el último día del mes.

## Qué hace realmente BETWEEN

\`BETWEEN a AND b\` equivale a \`>= a AND <= b\`: incluye los dos extremos. El problema no es \`BETWEEN\`, es que el extremo \`DATE '2025-08-31'\` se convierte a \`2025-08-31 00:00:00\`.

\`\`\`sql
-- Intención: todos los pedidos de agosto de 2025
SELECT id, created_at
FROM orders
WHERE created_at BETWEEN DATE '2025-08-01' AND DATE '2025-08-31';
\`\`\`

En TiendaViva esa consulta devuelve **1172** pedidos. Los pedidos reales de agosto son **1208**: faltan los 36 que se crearon el 31 de agosto después de la medianoche, es decir, prácticamente todos los de ese día. Un 3 % de la facturación evaporado sin un solo mensaje de error.

## El patrón correcto: rango medio abierto

Usa un rango **cerrado al inicio y abierto al final**: \`>= inicio AND < día siguiente\`.

\`\`\`sql
SELECT id, created_at
FROM orders
WHERE created_at >= DATE '2025-08-01'
  AND created_at <  DATE '2025-09-01';
\`\`\`

Ventajas de este patrón:

- Incluye todo el último día, sin importar la hora ni los milisegundos.
- No te obliga a saber cuántos días tiene el mes ni si el año es bisiesto.
- Sirve igual para \`date\`, \`timestamp\` y \`timestamptz\`.
- Meses consecutivos no se pisan ni dejan huecos: el 1 de septiembre pertenece a un solo período.

Para un solo día es la misma idea:

\`\`\`sql
WHERE created_at >= DATE '2025-08-31'
  AND created_at <  DATE '2025-09-01'
\`\`\`

## Alternativas y cuándo usarlas

\`\`\`sql
WHERE created_at::date = DATE '2025-08-31'                 -- legible
WHERE DATE_TRUNC('month', created_at) = DATE '2025-08-01'  -- período completo
\`\`\`

Ambas son correctas y se leen muy bien. Su desventaja es de rendimiento: al aplicar una función a la columna, el motor no puede aprovechar un índice común sobre \`created_at\` y termina recorriendo la tabla entera. En tablas chicas da igual; en millones de filas, el rango medio abierto gana.

¿Y \`BETWEEN\`? Es perfectamente válido con columnas \`date\`, con enteros o con importes, donde ambos extremos significan lo que aparentan. El problema es exclusivo de las columnas que llevan hora.

## Errores comunes

- \`BETWEEN '2025-01-01' AND '2025-01-31'\` sobre un \`timestamptz\`: pierde el último día.
- «Arreglarlo» con \`<= DATE '2025-08-31' + INTERVAL '1 day' - INTERVAL '1 second'\`: falla con milisegundos y es ilegible.
- Mezclar criterios entre reportes: si un tablero usa \`<=\` y otro \`<\`, los totales nunca cuadran.
- Filtrar por \`shipped_at\` cuando la pregunta es sobre entregas: revisa **qué** columna de fecha responde la pregunta.

## Resumen

1. Con columnas que tienen hora, \`BETWEEN\` recorta el último día a su primer instante.
2. Escribe siempre \`>= inicio AND < siguiente inicio\`.
3. \`created_at::date = ...\` es legible y correcto, pero renuncia al índice.
`,
  },
];
