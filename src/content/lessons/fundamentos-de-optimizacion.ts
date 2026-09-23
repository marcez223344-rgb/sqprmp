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

Una consulta lenta casi nunca es lenta por el motor: es lenta porque **le pediste que tocara más filas de las necesarias**. Optimizar, en el día a día de un analista, es sobre todo aprender a contar el trabajo que tu consulta genera antes de ejecutarla.

Trabajas con **Pídelo**, la plataforma de delivery. \`orders\` tiene 14 437 filas, \`order_items\` 35 589 y \`order_events\` 69 724. Son tablas chicas, así que todo te va a responder rápido; el objetivo de esta sección no es ganar milisegundos aquí, es que salgas con el criterio que necesitas cuando la misma consulta corra contra 400 millones de filas en el trabajo.

## El orden lógico manda

PostgreSQL evalúa una consulta en este orden conceptual:

\`FROM\` y los joins → \`WHERE\` → \`GROUP BY\` → \`HAVING\` → funciones de ventana → \`SELECT\` → \`DISTINCT\` → \`ORDER BY\` → \`LIMIT\`.

De ahí salen casi todas las reglas prácticas de esta sección. Si \`WHERE\` corre antes de agrupar, cada fila que descartas ahí es una fila que el \`GROUP BY\` no ordena ni acumula. Si \`HAVING\` corre después, un filtro puesto en \`HAVING\` que podría haber ido en \`WHERE\` obliga al motor a formar grupos que después tira a la basura.

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

Las dos devuelven lo mismo. La primera agrupa 13 284 filas; la segunda agrupa 14 437 y arma grupos de más para descartarlos. El planificador de PostgreSQL es lo bastante bueno como para arreglar varios casos así por su cuenta, pero **no siempre puede**, y el hábito de escribir el filtro donde corresponde no te cuesta nada.

## Medir el trabajo: contar filas en cada paso

La herramienta real de un analista, la que sirve incluso sin acceso a las métricas del servidor, es esta: **descompón tu consulta y cuenta cuántas filas produce cada paso**.

\`\`\`sql
SELECT count(*) FROM orders;                                    -- 14 437
SELECT count(*) FROM orders WHERE status = 'delivered';         -- 13 284
SELECT count(*) FROM order_items;                               -- 35 589
\`\`\`

Si unes \`orders\` con \`order_items\`, el resultado intermedio tiene ~35 589 filas, no 14 437: cada pedido se repite una vez por ítem. Saber ese número **antes** de escribir el \`SELECT\` final te dice dos cosas: cuánto trabajo va a hacer el motor, y —más importante— si tu \`count(*)\` va a contar pedidos o va a contar ítems. En esta sección el costo y la corrección son el mismo tema una y otra vez.

## \`SELECT *\` no es gratis

\`SELECT *\` sobre una tabla ancha lee y transporta columnas que nadie va a mirar. En una tabla con textos largos o JSON, la diferencia entre traer tres columnas y traerlas todas puede ser de un orden de magnitud, porque el motor tiene que leer bloques completos y mandarlos por la red.

Hay un segundo efecto, menos conocido y más valioso: si una consulta pide solo columnas que están en un índice, PostgreSQL puede responder **sin tocar la tabla**. Ese atajo desaparece en cuanto agregas una columna de más. Pide lo que necesitas; \`SELECT *\` es para explorar, no para producir.

## \`LIMIT\` sin \`ORDER BY\` no significa nada

\`\`\`sql
SELECT id, total FROM orders LIMIT 10;
\`\`\`

Esta consulta no devuelve «los primeros diez pedidos»: devuelve diez pedidos cualesquiera, los que el motor tenga más a mano. Mañana, con la tabla reorganizada o con otro plan, pueden ser otros diez. Si \`LIMIT\` responde una pregunta de negocio, necesita un \`ORDER BY\` **con desempate único**: \`ORDER BY total DESC, id\`. Sin el \`id\` final, dos pedidos con el mismo total se alternan entre ejecuciones y tu reporte deja de ser defendible.

## Y sí, existe \`EXPLAIN\`

En un servidor PostgreSQL real, \`EXPLAIN\` y \`EXPLAIN ANALYZE\` te muestran el plan que eligió el motor y cuántas filas pasó por cada nodo. Es la herramienta definitiva y la vas a usar en tu trabajo; la sección siguiente del curso está dedicada a leerla. **En este entorno de práctica no está disponible**, y es a propósito: todo lo de esta sección se decide antes de mirar un plan, contando filas y leyendo tu propia consulta. Si solo sabes optimizar con un plan delante, no sabes optimizar.

## Errores comunes

- Suponer que «anda rápido en mi muestra» significa que anda rápido en producción: los costos crecen con las filas, no con tu paciencia.
- Filtrar en \`HAVING\` algo que no depende de una agregación.
- Dejar \`SELECT *\` en una consulta que va a un reporte o a un panel.

## Resumen

1. El orden lógico (\`WHERE\` antes de \`GROUP BY\`, \`HAVING\` después) explica dónde poner cada filtro.
2. Cuenta las filas de cada paso: es tu medición y también tu control de cardinalidad.
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

Un índice es una estructura ordenada por el **valor de una columna**. Solo sirve si tu filtro habla de ese valor. En cuanto envuelves la columna en una función, el motor ya no puede usar el orden del índice: tiene que calcular la función en cada fila para saber si pasa. Un filtro que el motor puede aprovechar se llama **sargable**; uno que no, obliga a recorrer todo.

Esto no es un detalle de ingeniería: es la diferencia más frecuente entre una consulta de 200 ms y una de 40 segundos, y la escribes tú.

## El caso de las fechas

Quieres los pedidos de julio de 2025 (en UTC). La forma intuitiva:

\`\`\`sql
-- No sargable
SELECT count(*)
FROM orders
WHERE date_trunc('month', placed_at AT TIME ZONE 'UTC') = DATE '2025-07-01';
\`\`\`

El motor no tiene forma de saltar directo a julio: para cada una de las 14 437 filas tiene que calcular \`date_trunc\` y comparar. Con un índice sobre \`placed_at\`, ese índice queda inutilizado.

La forma sargable dice exactamente lo mismo con un rango:

\`\`\`sql
-- Sargable
SELECT count(*)
FROM orders
WHERE placed_at >= TIMESTAMPTZ '2025-07-01 00:00:00+00'
  AND placed_at <  TIMESTAMPTZ '2025-08-01 00:00:00+00';
\`\`\`

Las dos devuelven 1214. La segunda le permite al motor ubicar el comienzo del rango en el índice y leer en orden hasta el final. La regla se generaliza: **la columna sola de un lado, la expresión constante del otro**.

| En vez de | Escribe |
| --- | --- |
| \`extract(year FROM placed_at) = 2025\` | \`placed_at >= '2025-01-01' AND placed_at < '2026-01-01'\` |
| \`date_trunc('day', placed_at) = DATE '2025-07-04'\` | \`placed_at >= '2025-07-04' AND placed_at < '2025-07-05'\` |
| \`to_char(placed_at, 'YYYY-MM') = '2025-07'\` | rango de un mes |
| \`total * 1.21 > 1000\` | \`total > 1000 / 1.21\` |
| \`upper(name) = 'PIZZA'\` | \`name ILIKE 'pizza'\` o un índice sobre \`upper(name)\` |

Usa siempre rangos **semiabiertos** (\`>= inicio\` y \`< fin\`): así no dependes de si el instante final incluye o no los microsegundos del último segundo del mes.

## Cuándo la función sí está bien

No se trata de prohibir \`date_trunc\`. La regla es sobre **el filtro**, no sobre la consulta entera. Agrupar por mes está perfecto:

\`\`\`sql
SELECT date_trunc('month', placed_at AT TIME ZONE 'UTC') AS mes, count(*) AS pedidos
FROM orders
WHERE placed_at >= TIMESTAMPTZ '2025-01-01 00:00:00+00'
GROUP BY 1
ORDER BY 1;
\`\`\`

Acá \`date_trunc\` se aplica solo a las filas que el rango ya dejó pasar, y no se está usando para decidir cuáles leer. Además, si de verdad necesitas filtrar por una expresión, un DBA puede crear un **índice por expresión** sobre \`date_trunc('month', placed_at)\`. Saber pedir eso con fundamento también es parte del trabajo.

## \`LIKE\`, comodines y el orden del índice

\`name LIKE 'Pizza%'\` puede usar un índice: el prefijo fija por dónde empezar a leer. \`name LIKE '%Pizza'\` y \`name LIKE '%Pizza%'\` no pueden: el valor buscado puede estar en cualquier parte y no hay orden que ayude. Para búsquedas de texto libre existen herramientas específicas (índices de texto completo, trigramas); no las resuelve un \`LIKE\` con comodín inicial.

## \`OR\` entre columnas distintas

\`\`\`sql
SELECT id FROM orders
WHERE payment_method = 'cash' OR promotion_id = 12;
\`\`\`

Un índice sobre \`payment_method\` no dice nada sobre \`promotion_id\`. Ante un \`OR\` entre columnas distintas, el motor suele terminar recorriendo toda la tabla. La reescritura clásica es dos consultas, cada una con su filtro aprovechable, unidas:

\`\`\`sql
SELECT id FROM orders WHERE payment_method = 'cash'
UNION
SELECT id FROM orders WHERE promotion_id = 12;
\`\`\`

Dos advertencias que no se negocian. Primero: \`UNION\` elimina duplicados, así que un pedido que cumple ambas condiciones aparece una sola vez, igual que con \`OR\`; si usas \`UNION ALL\` aparece dos veces y cambiaste el resultado. Segundo: esta reescritura vale la pena cuando hay índices y cada rama es selectiva; sin índices es simplemente más código. No la apliques como reflejo.

Ojo: \`OR\` sobre **la misma** columna (\`status = 'a' OR status = 'b'\`) sí es aprovechable, y se escribe mejor como \`status IN ('a','b')\`.

## Errores comunes

- Filtrar con \`date_trunc\`, \`extract\` o \`to_char\` sobre la columna de fecha por costumbre.
- Comparar una columna \`timestamptz\` contra un texto sin zona y descubrir que el borde del mes se corrió unas horas.
- Reescribir todo \`OR\` como \`UNION\` sin preguntarse si hay índices detrás.

## Resumen

1. Sargable = la columna sola de un lado del operador; el motor puede usar el índice.
2. Los filtros de fecha se escriben como rangos semiabiertos, no con funciones sobre la columna.
3. \`LIKE 'x%'\` sirve, \`LIKE '%x'\` no; \`OR\` entre columnas distintas a veces se reescribe con \`UNION\`.
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

De todas las decisiones de esta sección, una sola explica la mayoría de las consultas lentas: **cuántas filas entran al join**. Un join es la operación cara, y su costo depende del tamaño de lo que unes. Reducir antes de unir es casi siempre la mejora más grande y la más fácil de defender.

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

La segunda agrupa 1200 filas y une 330 con 400. La primera une 1200 filas contra \`restaurants\` y agrupa después. Con estas tablas la diferencia es imperceptible; con cientos de millones de pedidos es la diferencia entre un panel que carga y uno que no. El planificador suele **bajar** los filtros por su cuenta, pero no puede adivinar una pre-agregación: eso lo escribes tú.

## El join que multiplica y la agregación que miente

Necesitas, por restaurante: unidades vendidas (de \`order_items\`) y cantidad de calificaciones (de \`ratings\`). El reflejo es unir las tres tablas:

\`\`\`sql
-- Incorrecta
SELECT o.restaurant_id, sum(oi.quantity) AS unidades, count(rt.id) AS calificaciones
FROM orders AS o
JOIN order_items AS oi ON oi.order_id = o.id
LEFT JOIN ratings AS rt ON rt.order_id = o.id
GROUP BY o.restaurant_id;
\`\`\`

Un pedido con 3 ítems y 1 calificación produce 3 filas. \`sum(quantity)\` sobrevive, pero \`count(rt.id)\` cuenta la calificación tres veces. Y si un pedido tuviera dos calificaciones, también se multiplicarían las unidades. **El error de performance y el error de cardinalidad son el mismo error**: estás generando filas que no representan nada.

La forma correcta agrega cada rama por separado y une resultados que ya están al grano de restaurante:

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

Cuando un total sale inflado, agregar \`DISTINCT\` lo hace parecer correcto. Es una venda: el motor igual generó todas las filas de más y después las ordenó para descartarlas —trabajo puro— y además \`DISTINCT\` no arregla las sumas, solo las repeticiones exactas. Si tu reflejo ante un número raro es \`DISTINCT\`, frena y cuenta filas: casi siempre hay un join al grano equivocado.

## Existencia: \`EXISTS\`, \`IN\`, \`JOIN\`

Para «restaurantes activos que tuvieron al menos un pedido entregado en agosto», tres caminos:

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

Las tres dan lo mismo y PostgreSQL suele planificar 1 y 2 igual (como *semi join*). La tercera es la peor de las tres: materializa una fila por pedido y recién ahí deduplica. Y si además necesitaras una columna de \`orders\`, el \`DISTINCT\` dejaría de alcanzar.

Para la negación, la elección **sí** cambia el resultado: \`NOT IN\` contra una subconsulta que puede devolver \`NULL\` no devuelve ninguna fila, nunca. \`NOT EXISTS\` no tiene ese problema. Usa \`NOT EXISTS\`.

## Errores comunes

- Unir todas las tablas «por las dudas» y filtrar al final.
- Unir dos tablas hijas al mismo padre en una sola consulta y creer los conteos.
- Tapar un total inflado con \`DISTINCT\` en lugar de corregir el grano.
- Usar \`NOT IN\` sobre una columna que admite nulos.

## Resumen

1. Filtra y agrega antes de unir: el costo del join depende de cuántas filas entran.
2. Dos tablas hijas del mismo padre se agregan por separado y después se unen.
3. Para existencia usa \`EXISTS\` o \`IN\`; para no-existencia usa siempre \`NOT EXISTS\`.
`,
  },
];
