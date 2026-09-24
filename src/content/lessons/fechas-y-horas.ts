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

Casi todo reporte de negocio tiene una dimensión temporal: las ventas del mes, el tiempo de entrega, la antigüedad de un cliente. Si te equivocas con el tipo de dato o con el extremo de un rango de fechas, el número que entregas queda mal por poco: lo bastante parecido al correcto como para que nadie lo note hasta que alguien audite el reporte.

## DATE, TIMESTAMP y TIMESTAMPTZ

PostgreSQL distingue tres tipos que se ven parecidos:

- \`date\` guarda **solo el día**: \`2025-09-15\`.
- \`timestamp\` guarda día y hora, **sin zona horaria**: \`2025-09-15 23:54:47\`.
- \`timestamptz\` (por *timestamp with time zone*, marca de tiempo con zona horaria) guarda un instante absoluto y lo **muestra** en la zona horaria de la sesión desde la que consultas.

En TiendaViva, \`sellers.joined_at\` es \`date\` (solo interesa el día del alta), mientras que \`orders.created_at\`, \`payments.paid_at\` y \`shipments.delivered_at\` son \`timestamptz\`: un pedido ocurre en un instante, no en un día.

Esa diferencia es la causa número uno de errores en los reportes. Cuando comparas un \`timestamptz\` con un valor \`date\`, ese \`date\` se entiende como el **primer instante** de ese día, las 00:00, así que \`created_at <= DATE '2025-08-31'\` deja fuera todo lo que ocurrió el 31 de agosto después de la medianoche, o sea casi todo el día. Lo veremos en detalle en la tercera lección.

Con \`timestamptz\` el motor hace la conversión al mostrar el valor: el mismo instante se ve como \`2025-09-13 22:43\` en UTC (por *Coordinated Universal Time*, el tiempo universal coordinado, la referencia horaria mundial) y como \`2025-09-13 19:43\` en Buenos Aires. El entorno de práctica trabaja siempre en UTC, así que todos los ejemplos dan el mismo resultado para cualquier persona. En un sistema real, cuando el reporte se pide «por día local», conviene fijar la zona horaria de forma explícita con \`AT TIME ZONE\` en lugar de confiar en la de la sesión.

## EXTRACT: obtener una parte

\`EXTRACT\` devuelve un número a partir de una fecha:

\`\`\`sql
SELECT store_name,
       EXTRACT(YEAR FROM joined_at)  AS joined_year,
       EXTRACT(MONTH FROM joined_at) AS joined_month
FROM sellers;
\`\`\`

Campos habituales: \`YEAR\` (año), \`MONTH\` (mes), \`DAY\` (día), \`HOUR\` (hora), \`MINUTE\` (minuto), \`DOW\` (por *day of week*, el día de la semana, donde 0 es domingo), \`DOY\` (por *day of year*, el día del año), \`QUARTER\` (el trimestre) y \`EPOCH\` (la cantidad de segundos transcurridos desde el 1 de enero de 1970, la referencia de tiempo que usan los sistemas informáticos). \`DATE_PART('year', joined_at)\` hace exactamente lo mismo con otra sintaxis; elige una y úsala de forma consistente.

Detalle importante: \`EXTRACT(MONTH FROM created_at)\` devuelve \`8\` tanto para agosto de 2024 como para agosto de 2025, porque solo mira el número de mes. Sirve para analizar la estacionalidad, o sea, en qué meses del año se vende más sin importar el año; no sirve para armar una serie mensual, donde cada mes de cada año tiene que ser un punto distinto.

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

La regla corta es esta: \`EXTRACT\` responde «qué parte de la fecha es» y \`DATE_TRUNC\` responde «a qué período pertenece esta fecha».

## Errores comunes

- Usar \`EXTRACT(MONTH ...)\` para una serie temporal: enero de 2024 y enero de 2025 se mezclan en un solo \`1\`.
- Suponer que \`DATE_TRUNC('week', ...)\` empieza el domingo: en PostgreSQL empieza el lunes (ISO).
- Comparar el resultado de \`EXTRACT\` con un texto: \`EXTRACT\` devuelve un número, así que compara con \`2025\` y no con \`'2025'\`, que es texto.

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

Las dos respuestas son correctas, pero miden cosas distintas: 9 días de calendario frente a 8 días y medio de tiempo real transcurrido. Antes de escribir la consulta, define cuál de las dos pide quien te hizo el pedido. Para los «días de entrega» en TiendaViva usamos días de calendario, así que convertimos los dos extremos a \`date\`:

\`\`\`sql
SELECT order_id,
       delivered_at::date - shipped_at::date AS delivery_days
FROM shipments
WHERE delivered_at IS NOT NULL;
\`\`\`

El \`::date\` es la forma abreviada de \`CAST(delivered_at AS date)\`, que convierte el instante en una fecha sin hora. El filtro \`IS NOT NULL\` también importa: hay 1110 envíos que todavía no se entregaron y tienen \`delivered_at\` en NULL. Como cualquier operación que incluye un NULL devuelve NULL, esas filas aparecerían con la columna \`delivery_days\` vacía y ensuciarían el reporte.

## Convertir un interval en un número

Un \`interval\` no se promedia ni se grafica cómodamente. Para obtener un número, extrae los segundos y divide:

\`\`\`sql
SELECT ROUND(EXTRACT(EPOCH FROM (delivered_at - shipped_at)) / 3600) AS delivery_hours
FROM shipments
WHERE delivered_at IS NOT NULL;
\`\`\`

\`EPOCH\` aplicado a un interval devuelve su duración total en segundos. A partir de ahí divides según la unidad que necesites: entre 60 para minutos, entre 3600 para horas y entre 86 400 para días.

Cuidado con \`EXTRACT(DAY FROM ...)\`: devuelve **solo el componente de días** del interval. Para \`8 days 12:00:00\` devuelve \`8\` y descarta las 12 horas restantes. No las redondea ni las suma: simplemente lee el componente «días» y olvida el resto, así que tu promedio de entrega sale más bajo que el real.

## AGE: la diferencia «humana»

\`AGE(fecha_mayor, fecha_menor)\` devuelve un interval expresado en años, meses y días:

\`\`\`sql
SELECT AGE(DATE '2025-09-15', DATE '2022-02-06');  -- 3 years 7 mons 9 days
\`\`\`

Es la función indicada para calcular antigüedades. Combinada con \`EXTRACT\` te da los años cumplidos:

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

Úsalo solo para presentar el dato, nunca para ordenarlo ni compararlo. El resultado es texto, y el texto se ordena carácter por carácter: con el formato \`'DD/MM/YYYY'\`, la fecha \`'01/09/2025'\` queda antes que \`'31/08/2025'\` aunque sea un día posterior. El formato \`'YYYY-MM'\` es la excepción práctica, porque al empezar por el año su orden alfabético coincide con el cronológico.

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

Este es el error más caro de toda la sección, justamente porque la consulta no falla: se ejecuta sin un solo mensaje y devuelve un número creíble, apenas más bajo que el correcto. Filtrar «agosto» con \`BETWEEN\` sobre una columna \`timestamptz\` deja fuera casi todo el último día del mes.

## Qué hace realmente BETWEEN

\`BETWEEN a AND b\` equivale a \`>= a AND <= b\`, así que incluye los dos extremos. El problema no está en \`BETWEEN\` sino en el extremo: al compararlo con una columna que tiene hora, \`DATE '2025-08-31'\` se convierte en \`2025-08-31 00:00:00\`, la medianoche con la que empieza ese día.

\`\`\`sql
-- Intención: todos los pedidos de agosto de 2025
SELECT id, created_at
FROM orders
WHERE created_at BETWEEN DATE '2025-08-01' AND DATE '2025-08-31';
\`\`\`

En TiendaViva esa consulta devuelve **1172** pedidos, pero los pedidos reales de agosto son **1208**. Faltan los 36 que se crearon el 31 de agosto después de la medianoche, es decir, prácticamente todos los de ese día. Es un 2 % de la facturación que desaparece del reporte sin que el motor avise de nada.

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

Ambas son correctas y se leen muy bien. Su desventaja es de rendimiento: al aplicar una función sobre la columna, el motor ya no puede usar el índice de \`created_at\` —un índice es la estructura auxiliar que le permite encontrar filas sin leer la tabla completa— y termina recorriendo todas las filas. En una tabla chica no se nota; con millones de filas, el rango medio abierto es claramente más rápido.

¿Y \`BETWEEN\`? Es perfectamente válido con columnas \`date\`, con enteros o con importes, donde ambos extremos significan lo que aparentan. El problema es exclusivo de las columnas que llevan hora.

## Errores comunes

- \`BETWEEN '2025-01-01' AND '2025-01-31'\` sobre un \`timestamptz\`: pierde el último día.
- «Arreglarlo» con \`<= DATE '2025-08-31' + INTERVAL '1 day' - INTERVAL '1 second'\`: además de ser difícil de leer, deja fuera lo que haya ocurrido en el último segundo del día, porque los instantes se guardan con milisegundos.
- Mezclar criterios entre reportes: si un tablero filtra con \`<=\` y otro con \`<\`, los dos totales se diferencian en un día y nunca terminan de cuadrar.
- Filtrar por \`shipped_at\` cuando la pregunta es sobre entregas: revisa **qué** columna de fecha responde la pregunta.

## Resumen

1. Con columnas que tienen hora, \`BETWEEN\` recorta el último día a su primer instante.
2. Escribe siempre \`>= inicio AND < siguiente inicio\`.
3. \`created_at::date = ...\` es legible y correcto, pero renuncia al índice.

## Próximos pasos

**Lo que ya puedes hacer:** Sabes extraer año, mes y día de una fecha, truncarla por período con DATE_TRUNC, calcular diferencias e intervalos y explicar el efecto de la zona horaria.

**Antes de seguir:** resuelve los ejercicios y el quiz de esta sección.

**Lo que sigue:** Sección 12 · CASE: lógica condicional. Vas a clasificar registros en categorías de negocio, por ejemplo por antigüedad.

**Para practicar (opcional):** ¿Cuánto tiempo pasó entre el alta y el abandono de cada oyente de Ritmo? En \`users\`, resta \`signup_at\` a \`churned_at\` donde \`churned_at\` no está en \`NULL\`.
`,
  },
];
