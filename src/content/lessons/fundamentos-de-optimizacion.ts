import type { LessonDef } from "../schemas/curriculum";

const section = "fundamentos-de-optimizacion";

export const lessons: LessonDef[] = [
  {
    slug: "optimizacion-el-trabajo-que-hace-el-motor",
    section,
    kind: "theory",
    title: "El trabajo que hace el motor",
    sort_order: 0,
    estimated_minutes: 12,
    is_free: false,
    is_published: true,
    prerequisites: ["group-by-basico", "having-vs-where", "limit-offset-y-top-n"],
    dataset: "pidelo",
    body_md: `## Por qué importa

Una consulta lenta casi nunca es lenta por culpa del motor: es lenta porque **le pediste que tocara más filas de las necesarias**. Optimizar, en el día a día de un analista, consiste sobre todo en aprender a estimar cuánto trabajo genera tu consulta antes de ejecutarla.

Trabajas con **Pídelo**, la plataforma de delivery. La tabla \`orders\` tiene 14 437 filas, \`order_items\` tiene 35 589 y \`order_events\` tiene 69 724. Son tablas chicas, así que todo lo que escribas aquí va a responder rápido. El objetivo de esta sección no es ganar milisegundos en el simulador: es que salgas con el criterio que vas a necesitar cuando la misma consulta corra contra 400 millones de filas en tu trabajo.

## El orden lógico manda

PostgreSQL evalúa una consulta en este orden conceptual:

\`FROM\` y los joins → \`WHERE\` → \`GROUP BY\` → \`HAVING\` → funciones de ventana → \`SELECT\` → \`DISTINCT\` → \`ORDER BY\` → \`LIMIT\`.

De ese orden salen casi todas las reglas prácticas de esta sección. Como el \`WHERE\` corre antes de agrupar, cada fila que descartas ahí es una fila que el \`GROUP BY\` ya no tiene que ordenar ni acumular. Como el \`HAVING\` corre después, un filtro puesto en \`HAVING\` que podría haber ido en \`WHERE\` obliga al motor a formar grupos completos para descartarlos enseguida.

Mismo resultado, distinto trabajo:

\`\`\`sql
-- Forma A: el filtro descarta filas antes de agrupar
SELECT restaurant_id, count(*) AS pedidos
FROM orders
WHERE status = 'delivered'
GROUP BY restaurant_id;

-- Forma B: agrupa todo y recién después filtra
SELECT restaurant_id, count(*) AS pedidos
FROM orders
GROUP BY restaurant_id, status
HAVING status = 'delivered';
\`\`\`

Las dos devuelven lo mismo. La primera agrupa 13 284 filas, y la segunda agrupa las 14 437 y arma grupos de más que después tira. El **planificador** de PostgreSQL, que es el componente que decide cómo ejecutar cada consulta, es lo bastante bueno como para corregir varios casos así por su cuenta, pero **no siempre puede**, y escribir el filtro donde corresponde no te cuesta nada.

## Medir el trabajo: contar filas en cada paso

La herramienta real de un analista, la que sirve incluso sin acceso a las métricas del servidor, es esta: **descompón tu consulta y cuenta cuántas filas produce cada paso**.

\`\`\`sql
SELECT count(*) FROM orders;                                    -- 14 437
SELECT count(*) FROM orders WHERE status = 'delivered';         -- 13 284
SELECT count(*) FROM order_items;                               -- 35 589
\`\`\`

Si unes \`orders\` con \`order_items\`, el resultado intermedio tiene alrededor de 35 589 filas y no 14 437, porque cada pedido se repite una vez por cada ítem que contiene. Conocer ese número **antes** de escribir el \`SELECT\` final te dice dos cosas: cuánto trabajo va a hacer el motor y, más importante todavía, si tu \`count(*)\` va a contar pedidos o va a contar ítems. En esta sección el costo y la corrección del resultado son el mismo tema una y otra vez.

## \`SELECT *\` no es gratis

\`SELECT *\` sobre una tabla ancha lee y transporta columnas que nadie va a mirar. En una tabla con textos largos o documentos JSON, la diferencia entre traer tres columnas y traerlas todas puede ser de diez veces, porque el motor tiene que leer bloques completos del disco y mandarlos por la red.

Hay un segundo efecto, menos conocido y más valioso. Un **índice** es una estructura auxiliar ordenada que guarda algunas columnas de la tabla. Si la consulta pide únicamente columnas que están en el índice, PostgreSQL puede responder **sin tocar la tabla**, y eso es mucho más rápido. Ese atajo desaparece en cuanto agregas una columna que el índice no tiene. Pide las columnas que necesitas; \`SELECT *\` sirve para explorar, no para producir un reporte.

## \`LIMIT\` sin \`ORDER BY\` no significa nada

\`\`\`sql
SELECT id, total FROM orders LIMIT 10;
\`\`\`

Esta consulta no devuelve «los primeros diez pedidos»: devuelve diez pedidos cualesquiera, los que el motor tenga más a mano en ese momento. Mañana, con la tabla reorganizada o con otro plan de ejecución, pueden ser otros diez distintos. Si el \`LIMIT\` responde una pregunta de negocio, necesita un \`ORDER BY\` **con desempate único**, por ejemplo \`ORDER BY total DESC, id\`. Sin ese \`id\` final, dos pedidos con el mismo total se alternan entre ejecuciones y no puedes explicarle a nadie por qué el reporte cambió.

## Y sí, existe \`EXPLAIN\`

En un servidor PostgreSQL real, \`EXPLAIN\` y \`EXPLAIN ANALYZE\` te muestran el plan que eligió el motor y cuántas filas pasaron por cada paso de ese plan. Es la herramienta definitiva y la vas a usar en tu trabajo; la sección siguiente del curso está dedicada a leerla. **En este entorno de práctica no está disponible**, y es a propósito: todo lo de esta sección se decide antes de mirar un plan, contando filas y leyendo tu propia consulta. Si solo puedes detectar un problema cuando tienes el plan delante, se te van a escapar la mayoría de los casos, porque la mayoría se ven en el SQL.

## Errores comunes

- Suponer que «anda rápido en mi muestra» significa que va a andar rápido en producción. El costo crece con la cantidad de filas, no con tu paciencia.
- Poner en \`HAVING\` un filtro que no depende de ninguna agregación.
- Dejar un \`SELECT *\` en una consulta que alimenta un reporte o un panel.

## Resumen

1. El orden lógico (\`WHERE\` antes de \`GROUP BY\`, \`HAVING\` después) explica dónde poner cada filtro.
2. Cuenta las filas de cada paso: es tu medición del costo y también tu control de cuántas filas genera cada join.
3. Pide solo las columnas que usas y nunca uses \`LIMIT\` sin un \`ORDER BY\` con desempate único.
`,
  },
  {
    slug: "optimizacion-predicados-sargables",
    section,
    kind: "theory",
    title: "Filtros que el motor puede aprovechar",
    sort_order: 1,
    estimated_minutes: 12,
    is_free: false,
    is_published: true,
    prerequisites: [
      "optimizacion-el-trabajo-que-hace-el-motor",
      "fechas-rangos-sin-errores-de-borde",
      "union-y-union-all",
    ],
    dataset: "pidelo",
    body_md: `## Por qué importa

Un índice es una estructura auxiliar ordenada por el **valor de una columna**, y solo sirve si tu filtro habla de ese valor tal cual está guardado. En cuanto envuelves la columna en una función, el motor pierde la posibilidad de usar ese orden: tiene que calcular la función en cada fila de la tabla para saber cuáles pasan el filtro.

Un filtro que el motor puede aprovechar con un índice se llama **sargable** (del inglés *search argument able*, es decir, «apto como argumento de búsqueda»). Uno que no lo es obliga a recorrer la tabla entera. Esto no es un detalle de ingeniería: es la diferencia más frecuente entre una consulta que tarda 200 milisegundos y una que tarda 40 segundos, y la decide cómo escribes tú el \`WHERE\`.

## El caso de las fechas

Quieres los pedidos de julio de 2025, cortando el mes en UTC. La forma intuitiva es esta:

\`\`\`sql
-- No sargable
SELECT count(*)
FROM orders
WHERE date_trunc('month', placed_at AT TIME ZONE 'UTC') = DATE '2025-07-01';
\`\`\`

El motor no tiene forma de saltar directo a julio, porque el índice guarda los valores de \`placed_at\` y no los resultados de \`date_trunc\`. Para cada una de las 14 437 filas tiene que calcular la función y comparar, así que el índice queda sin usar.

La forma sargable dice exactamente lo mismo, pero como un rango de valores:

\`\`\`sql
-- Sargable
SELECT count(*)
FROM orders
WHERE placed_at >= TIMESTAMPTZ '2025-07-01 00:00:00+00'
  AND placed_at <  TIMESTAMPTZ '2025-08-01 00:00:00+00';
\`\`\`

Las dos devuelven 1214. La segunda le permite al motor ubicar el comienzo del rango dentro del índice y leer en orden hasta el final, sin mirar el resto de la tabla. La regla se generaliza así: **la columna sola de un lado del operador y la expresión constante del otro**.

| En vez de | Escribe |
| --- | --- |
| \`extract(year FROM placed_at) = 2025\` | \`placed_at >= '2025-01-01' AND placed_at < '2026-01-01'\` |
| \`date_trunc('day', placed_at) = DATE '2025-07-04'\` | \`placed_at >= '2025-07-04' AND placed_at < '2025-07-05'\` |
| \`to_char(placed_at, 'YYYY-MM') = '2025-07'\` | rango de un mes |
| \`total * 1.21 > 1000\` | \`total > 1000 / 1.21\` |
| \`upper(name) = 'PIZZA'\` | \`name ILIKE 'pizza'\` o un índice sobre \`upper(name)\` |

Usa siempre rangos **semiabiertos**, es decir, \`>= inicio\` y \`< fin\`. Así no tienes que preguntarte si el instante final incluye o no los microsegundos del último segundo del mes.

## Cuándo la función sí está bien

No se trata de prohibir \`date_trunc\`. La regla es sobre **el filtro**, no sobre la consulta entera. Agrupar por mes está perfecto:

\`\`\`sql
SELECT date_trunc('month', placed_at AT TIME ZONE 'UTC') AS mes, count(*) AS pedidos
FROM orders
WHERE placed_at >= TIMESTAMPTZ '2025-01-01 00:00:00+00'
GROUP BY 1
ORDER BY 1;
\`\`\`

Aquí \`date_trunc\` se aplica solo a las filas que el rango del \`WHERE\` ya dejó pasar, y no se usa para decidir cuáles leer. Además, si de verdad necesitas filtrar por una expresión, un DBA (por *database administrator*, la persona que administra la base de datos) puede crear un **índice por expresión** sobre \`date_trunc('month', placed_at)\`, que guarda ya calculado ese valor. Saber pedir eso con fundamento también es parte del trabajo.

## \`LIKE\`, comodines y el orden del índice

\`name LIKE 'Pizza%'\` puede usar un índice, porque el prefijo fijo le dice al motor desde qué punto del orden alfabético empezar a leer. \`name LIKE '%Pizza'\` y \`name LIKE '%Pizza%'\` no pueden, porque el texto buscado puede estar en cualquier posición y no hay ningún orden que ayude a descartar filas. Para las búsquedas de texto libre existen herramientas específicas, como los índices de texto completo o los de trigramas (que indexan fragmentos de tres caracteres); un \`LIKE\` con comodín al principio no las reemplaza.

## \`OR\` entre columnas distintas

\`\`\`sql
SELECT id FROM orders
WHERE payment_method = 'cash' OR promotion_id = 12;
\`\`\`

Un índice sobre \`payment_method\` no dice nada sobre \`promotion_id\`, así que ante un \`OR\` entre columnas distintas el motor suele terminar recorriendo la tabla completa. La reescritura clásica consiste en separar la consulta en dos, cada una con un filtro que sí puede aprovechar su índice, y unir los resultados:

\`\`\`sql
SELECT id FROM orders WHERE payment_method = 'cash'
UNION
SELECT id FROM orders WHERE promotion_id = 12;
\`\`\`

Dos advertencias que no se negocian. La primera: \`UNION\` elimina los duplicados, así que un pedido que cumple las dos condiciones aparece una sola vez, igual que con \`OR\`. Si usas \`UNION ALL\` ese pedido aparece dos veces y cambiaste el resultado. La segunda: esta reescritura vale la pena cuando hay índices y cada rama descarta muchas filas. Sin índices detrás es solamente más código para el mismo trabajo, así que no la apliques como reflejo.

Un \`OR\` sobre **la misma** columna (\`status = 'a' OR status = 'b'\`) sí se puede aprovechar, y se escribe mejor como \`status IN ('a','b')\`.

## Errores comunes

- Filtrar con \`date_trunc\`, \`extract\` o \`to_char\` sobre la columna de fecha por costumbre.
- Comparar una columna \`timestamptz\` contra un texto sin zona horaria y descubrir después que el borde del mes se corrió unas horas.
- Reescribir todo \`OR\` como \`UNION\` sin preguntarse si hay índices que lo justifiquen.

## Resumen

1. Sargable significa que la columna aparece sola de un lado del operador, y por eso el motor puede usar el índice.
2. Los filtros de fecha se escriben como rangos semiabiertos, no con funciones aplicadas sobre la columna.
3. \`LIKE 'x%'\` aprovecha el índice y \`LIKE '%x'\` no; un \`OR\` entre columnas distintas a veces conviene reescribirlo con \`UNION\`.
`,
  },
  {
    slug: "optimizacion-reducir-antes-de-unir",
    section,
    kind: "theory",
    title: "Reducir filas antes de unir y de agregar",
    sort_order: 2,
    estimated_minutes: 12,
    is_free: false,
    is_published: true,
    prerequisites: [
      "optimizacion-predicados-sargables",
      "duplicacion-de-filas-en-cadenas",
      "subconsultas-in-exists-y-null",
      "cte-with-pasos",
    ],
    dataset: "pidelo",
    body_md: `## La regla más rentable

De todas las decisiones de esta sección, hay una que explica la mayoría de las consultas lentas: **cuántas filas entran al join**. Unir tablas es la operación cara, y su costo depende del tamaño de lo que unes. Reducir antes de unir suele ser la mejora más grande y también la más fácil de explicar en una revisión de código.

\`\`\`sql
-- Une todo y filtra después
SELECT r.name, count(*) AS pedidos
FROM orders AS o
JOIN restaurants AS r ON r.id = o.restaurant_id
WHERE o.status = 'delivered'
  AND o.placed_at >= TIMESTAMPTZ '2025-08-01 00:00:00+00'
  AND o.placed_at <  TIMESTAMPTZ '2025-09-01 00:00:00+00'
GROUP BY r.name;
\`\`\`

\`\`\`sql
-- Reduce primero, une un resultado chico
WITH entregados AS (
  SELECT restaurant_id, count(*) AS pedidos
  FROM orders
  WHERE status = 'delivered'
    AND placed_at >= TIMESTAMPTZ '2025-08-01 00:00:00+00'
    AND placed_at <  TIMESTAMPTZ '2025-09-01 00:00:00+00'
  GROUP BY restaurant_id
)
SELECT r.name, e.pedidos
FROM entregados AS e
JOIN restaurants AS r ON r.id = e.restaurant_id;
\`\`\`

La segunda versión agrupa 1200 filas y después une 330 filas con 400. La primera une las 1200 filas contra \`restaurants\` y recién entonces agrupa. Con estas tablas la diferencia es imperceptible; con cientos de millones de pedidos es la diferencia entre un panel que carga y uno que se queda esperando. El planificador suele **bajar** los filtros por su cuenta hasta antes del join, pero no puede adivinar una agregación previa: esa la escribes tú.

## El join que multiplica y la agregación que miente

Necesitas, para cada restaurante, dos números: las unidades vendidas, que están en \`order_items\`, y la cantidad de calificaciones, que están en \`ratings\`. El reflejo es unir las tres tablas:

\`\`\`sql
-- Incorrecta
SELECT o.restaurant_id, sum(oi.quantity) AS unidades, count(rt.id) AS calificaciones
FROM orders AS o
JOIN order_items AS oi ON oi.order_id = o.id
LEFT JOIN ratings AS rt ON rt.order_id = o.id
GROUP BY o.restaurant_id;
\`\`\`

Un pedido con 3 ítems y 1 calificación produce 3 filas, una por ítem. La suma de unidades sigue siendo correcta, pero \`count(rt.id)\` cuenta esa única calificación tres veces y el informe muestra el triple de calificaciones que las que existen. Y si un pedido tuviera dos calificaciones, también se multiplicarían las unidades.

Fíjate en lo que acaba de pasar: **el problema de rendimiento y el problema de resultado son el mismo problema**, porque en los dos casos estás generando filas que no representan nada real.

La forma correcta agrega cada rama por separado y después une resultados que ya están al grano de restaurante, es decir, con una sola fila por restaurante:

\`\`\`sql
WITH base AS (
  SELECT id, restaurant_id FROM orders WHERE status = 'delivered'
),
unidades AS (
  SELECT b.restaurant_id, sum(oi.quantity) AS unidades
  FROM base AS b JOIN order_items AS oi ON oi.order_id = b.id
  GROUP BY b.restaurant_id
),
calif AS (
  SELECT b.restaurant_id, count(*) AS calificaciones
  FROM base AS b JOIN ratings AS rt ON rt.order_id = b.id
  GROUP BY b.restaurant_id
)
SELECT u.restaurant_id, u.unidades, coalesce(c.calificaciones, 0) AS calificaciones
FROM unidades AS u
LEFT JOIN calif AS c ON c.restaurant_id = u.restaurant_id;
\`\`\`

## \`DISTINCT\` casi nunca es la respuesta

Cuando un total sale inflado, agregar \`DISTINCT\` hace que el resultado parezca correcto. Es un parche por dos motivos. Primero, el motor igual generó todas las filas de más y después tuvo que ordenarlas para descartarlas, o sea que el trabajo extra lo hizo igual. Segundo, \`DISTINCT\` elimina filas repetidas por completo, pero no corrige una suma que ya contó el mismo importe varias veces. Si tu reflejo ante un número raro es escribir \`DISTINCT\`, frena y cuenta filas: casi siempre hay un join hecho al grano equivocado.

## Existencia: \`EXISTS\`, \`IN\`, \`JOIN\`

Para responder «restaurantes activos que tuvieron al menos un pedido entregado en agosto» hay tres caminos:

\`\`\`sql
-- 1. EXISTS: se detiene en la primera coincidencia
SELECT r.id, r.name FROM restaurants AS r
WHERE r.is_active
  AND EXISTS (SELECT 1 FROM orders AS o
              WHERE o.restaurant_id = r.id AND o.status = 'delivered');

-- 2. IN con subconsulta: equivalente y legible
SELECT r.id, r.name FROM restaurants AS r
WHERE r.is_active
  AND r.id IN (SELECT o.restaurant_id FROM orders AS o WHERE o.status = 'delivered');

-- 3. JOIN + DISTINCT: genera duplicados y después los borra
SELECT DISTINCT r.id, r.name FROM restaurants AS r
JOIN orders AS o ON o.restaurant_id = r.id AND o.status = 'delivered'
WHERE r.is_active;
\`\`\`

Las tres devuelven lo mismo, y PostgreSQL suele ejecutar la primera y la segunda de la misma manera, como una *semi join*, que es el tipo de unión que se detiene apenas encuentra una coincidencia. La tercera es la peor de las tres, porque genera una fila por pedido y recién después elimina los duplicados. Además, si más adelante necesitaras mostrar una columna de \`orders\`, el \`DISTINCT\` dejaría de alcanzar y tendrías que reescribir la consulta entera.

Para la negación, en cambio, la elección **sí** cambia el resultado: \`NOT IN\` contra una subconsulta que puede devolver \`NULL\` no devuelve ninguna fila, nunca. \`NOT EXISTS\` no tiene ese problema, así que úsalo siempre.

## Errores comunes

- Unir todas las tablas «por las dudas» y filtrar recién al final.
- Unir dos tablas hijas al mismo padre en una sola consulta y creerles a los conteos.
- Tapar un total inflado con \`DISTINCT\` en lugar de corregir el grano del join.
- Usar \`NOT IN\` sobre una columna que admite nulos.

## Resumen

1. Filtra y agrega antes de unir, porque el costo del join depende de cuántas filas entran.
2. Dos tablas hijas del mismo padre se agregan por separado y después se unen.
3. Para preguntar por existencia usa \`EXISTS\` o \`IN\`; para preguntar por no-existencia usa siempre \`NOT EXISTS\`.
`,
  },
];
