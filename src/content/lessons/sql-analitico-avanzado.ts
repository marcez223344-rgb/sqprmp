import type { LessonDef } from "../schemas/curriculum";

const section = "sql-analitico-avanzado";

export const lessons: LessonDef[] = [
  {
    slug: "avanzado-consultas-en-capas",
    section,
    kind: "theory",
    title: "Consultas en capas: CTE, ventanas y LATERAL",
    sort_order: 0,
    estimated_minutes: 13,
    is_free: false,
    is_published: true,
    prerequisites: ["cte-with-pasos", "ventana-over-partition"],
    dataset: "bolsillo",
    body_md: `## Por qué importa

A esta altura ya sabes escribir cada pieza por separado. El salto profesional no es aprender una función más: es **ordenar una consulta larga** para que otra persona (o tú dentro de seis meses) pueda leerla, probarla por partes y confiar en ella.

La técnica central es simple: una consulta compleja se escribe como una **secuencia de capas**, cada una con un contrato claro —qué grano tiene y qué columnas entrega—, y la última capa solo presenta.

## Una capa, un grano

En **Bolsillo** (billetera digital) queremos, por rubro de comercio, los comercios con más operaciones y su participación:

\`\`\`sql
WITH pagos AS (                      -- grano: comercio
  SELECT m.category, m.name, count(*) AS operaciones
  FROM transactions AS t
  INNER JOIN merchants AS m ON m.id = t.merchant_id
  WHERE t.status = 'completed'
  GROUP BY m.category, m.name
),
totales AS (                         -- grano: rubro
  SELECT category, sum(operaciones) AS operaciones_rubro
  FROM pagos
  GROUP BY category
)
SELECT p.category, p.name, p.operaciones,
       round(100.0 * p.operaciones / t.operaciones_rubro, 2) AS participacion
FROM pagos AS p
INNER JOIN totales AS t ON t.category = p.category
ORDER BY p.category, p.operaciones DESC;
\`\`\`

Escribe el grano en un comentario arriba de cada CTE. Cuando una consulta da mal, la mayoría de las veces el problema es que dos capas tienen granos distintos y alguien las unió como si fueran iguales.

## Dónde se evalúa cada cosa

Las funciones de ventana se calculan **después** de \`WHERE\`, \`GROUP BY\` y \`HAVING\`, y **antes** de \`ORDER BY\` y \`LIMIT\`. De ahí salen dos reglas que ahorran horas:

- No puedes filtrar por el resultado de una ventana en el mismo \`WHERE\`: necesitas una capa más.
- Sí puedes usar una ventana **sobre un agregado**, porque el agregado ya ocurrió: \`sum(count(*)) OVER ()\` es válido y devuelve el total general junto a cada grupo.

\`\`\`sql
SELECT m.category,
       count(*) AS operaciones,
       round(100.0 * count(*) / sum(count(*)) OVER (), 2) AS porcentaje
FROM transactions AS t
INNER JOIN merchants AS m ON m.id = t.merchant_id
WHERE t.status = 'completed'
GROUP BY m.category
ORDER BY operaciones DESC;
\`\`\`

Esa combinación —agregar y, en la misma pasada, comparar contra el total— reemplaza una subconsulta entera.

## LATERAL: una subconsulta que ve la fila actual

Una subconsulta en el \`FROM\` normalmente no puede mencionar columnas de las tablas que están a su izquierda. Con \`LATERAL\` sí puede, y eso habilita el patrón «para cada fila de A, calcula esto en B»:

\`\`\`sql
SELECT c.category, top.name, top.operaciones
FROM totales AS c
CROSS JOIN LATERAL (
  SELECT p.name, p.operaciones
  FROM pagos AS p
  WHERE p.category = c.category
  ORDER BY p.operaciones DESC, p.name
  LIMIT 3
) AS top;
\`\`\`

Léelo como un bucle: por cada rubro, PostgreSQL ejecuta la subconsulta con \`c.category\` ya resuelto y pega las filas que devuelve. El \`LIMIT\` vive **adentro**, así que limita por rubro y no el resultado final: eso es lo que una subconsulta común no puede hacer.

## Variantes

- \`CROSS JOIN LATERAL\` descarta las filas de la izquierda cuya subconsulta no devuelve nada. Si quieres conservarlas, usa \`LEFT JOIN LATERAL (...) AS x ON true\`.
- El mismo top-N por grupo se resuelve con \`row_number()\` y un filtro en una capa siguiente. Las dos formas son correctas: la ventana suele leerse mejor cuando ya tienes la capa armada; \`LATERAL\` gana cuando el cálculo por fila es caro y solo necesitas unas pocas filas de cada grupo.
- \`LATERAL\` también acepta la forma con coma (\`FROM a, LATERAL (...) AS x\`), equivalente a \`CROSS JOIN LATERAL\`.

## Errores comunes

- Filtrar \`WHERE puesto = 1\` en el mismo nivel donde se calcula \`row_number()\`.
- Poner el \`LIMIT\` afuera cuando querías top-N por grupo.
- Olvidar el alias de la subconsulta lateral: PostgreSQL lo exige.
- Encadenar diez CTE sin decir el grano de ninguna: es tan ilegible como una consulta de cien líneas.

## Resumen

1. Una capa, un grano, documentado en una línea.
2. Las ventanas corren después de agregar: por eso \`sum(count(*)) OVER ()\` funciona y filtrar una ventana en el mismo \`WHERE\`, no.
3. \`LATERAL\` es «por cada fila de la izquierda, corre esta consulta»: el \`LIMIT\` queda adentro.
`,
  },
  {
    slug: "avanzado-subtotales-rollup-cube",
    section,
    kind: "theory",
    title: "Subtotales en una sola pasada: ROLLUP y CUBE",
    sort_order: 1,
    estimated_minutes: 12,
    is_free: false,
    is_published: true,
    prerequisites: ["group-by-reportes", "agregacion-condicional-case-y-filter"],
    dataset: "tiendaviva",
    body_md: `## Por qué importa

Todo reporte de negocio termina pidiendo lo mismo: el detalle **y** los subtotales **y** el total general. La respuesta ingenua es repetir la consulta tres veces y unirla con \`UNION ALL\`: tres pasadas sobre los mismos datos y tres lugares donde el filtro puede quedar desalineado.

PostgreSQL resuelve eso en una sola pasada con \`ROLLUP\` y \`CUBE\`.

## ROLLUP: subtotales jerárquicos

En **TiendaViva**, pedidos entregados por país y canal:

\`\`\`sql
SELECT c.country, o.channel, count(*) AS pedidos
FROM orders AS o
INNER JOIN customers AS c ON c.id = o.customer_id
WHERE o.status = 'delivered'
GROUP BY ROLLUP (c.country, o.channel);
\`\`\`

\`ROLLUP (a, b)\` calcula tres niveles: por \`(a, b)\`, por \`(a)\` y el total general. Va sacando columnas **de derecha a izquierda**, así que el orden importa: \`ROLLUP (country, channel)\` da subtotal por país y \`ROLLUP (channel, country)\` da subtotal por canal. Es la jerarquía natural de un reporte.

## El NULL ambiguo y la función GROUPING

En las filas de subtotal, las columnas agrupadas vienen en \`NULL\`. ¿Y si la columna ya tenía \`NULL\` en los datos? A simple vista no se distingue. Para eso existe \`grouping()\`, que devuelve 1 cuando la columna **fue agregada** por el subtotal y 0 cuando es un valor real:

\`\`\`sql
SELECT
  CASE WHEN grouping(c.country) = 1 THEN 'TOTAL' ELSE c.country END AS pais,
  CASE WHEN grouping(o.channel) = 1 THEN 'TOTAL' ELSE o.channel END AS canal,
  count(*) AS pedidos
FROM orders AS o
INNER JOIN customers AS c ON c.id = o.customer_id
WHERE o.status = 'delivered'
GROUP BY ROLLUP (c.country, o.channel)
ORDER BY grouping(c.country), pais, grouping(o.channel), canal;
\`\`\`

Dos usos que valen oro en producción:

- \`grouping()\` también sirve para **ordenar**: poniéndolo primero en el \`ORDER BY\`, cada subtotal cae debajo de su bloque y el total general queda al final.
- Con \`HAVING grouping(c.country) = 1\` te quedas solo con las filas de subtotal.

## CUBE: todos los cortes

\`CUBE (a, b)\` calcula las cuatro combinaciones: \`(a, b)\`, \`(a)\`, \`(b)\` y el total. Úsalo cuando las dos dimensiones son independientes —cocina y medio de pago, por ejemplo— y quieres los márgenes de la tabla en los dos sentidos. Con *n* columnas genera 2 elevado a *n* niveles: con cuatro dimensiones son 16, y el resultado se vuelve ilegible antes de volverse lento.

**Nota del entorno de práctica:** la forma explícita \`GROUP BY GROUPING SETS ((a, b), (a), ())\` no está disponible en el simulador; \`ROLLUP\` y \`CUBE\` cubren los mismos casos. En un PostgreSQL real, \`GROUPING SETS\` existe y te deja elegir exactamente qué niveles calcular.

## Pivotes a escala

El otro pedido eterno es la tabla cruzada: una fila por categoría y una columna por período. Se arma con agregación condicional, y \`FILTER\` la hace legible:

\`\`\`sql
SELECT c.country,
       count(*) FILTER (WHERE o.channel = 'app') AS app,
       count(*) FILTER (WHERE o.channel = 'web') AS web,
       count(*) AS total
FROM orders AS o
INNER JOIN customers AS c ON c.id = o.customer_id
WHERE o.status = 'delivered'
GROUP BY c.country;
\`\`\`

Un pivote tiene columnas fijas: si mañana aparece un canal nuevo, hay que editar la consulta. Cuando las categorías cambian solas, entrega el resultado largo (una fila por combinación) y deja que la herramienta de visualización pivotee.

## Errores comunes

- Leer el \`NULL\` de un subtotal como un dato faltante.
- Sumar dinero de varios países en el total general cuando cada país tiene su moneda: el número no significa nada. Cuenta operaciones o convierte antes con un tipo de cambio.
- Invertir el orden de \`ROLLUP\` y obtener el subtotal de la dimensión equivocada.
- Ordenar solo por las etiquetas: los subtotales quedan mezclados alfabéticamente con el detalle.

## Resumen

1. \`ROLLUP\` da la jerarquía de subtotales de derecha a izquierda; \`CUBE\`, todos los cortes.
2. \`grouping()\` distingue el \`NULL\` de subtotal del \`NULL\` de datos, etiqueta y ordena.
3. El pivote con \`FILTER\` es legible pero de columnas fijas: piénsalo antes de fijarlas.
`,
  },
  {
    slug: "avanzado-arrays-y-json",
    section,
    kind: "theory",
    title: "Listas y documentos: arrays y JSON",
    sort_order: 2,
    estimated_minutes: 12,
    is_free: false,
    is_published: true,
    prerequisites: ["avanzado-consultas-en-capas", "cte-recursiva-jerarquias"],
    dataset: "pidelo",
    body_md: `## Por qué importa

Hay preguntas que no se responden bien con una tabla plana. «¿Qué secuencia de estados siguió cada pedido?» no es una columna: es una **lista ordenada**. Y cuando el resultado va a alimentar una API o un tablero, lo que piden no es una grilla sino un **documento**. PostgreSQL trae los dos tipos, y usarlos en el lugar correcto acorta consultas enteras.

## Armar una lista: array_agg

En **Pídelo** (delivery), \`order_events\` guarda un evento por fila. La trayectoria de cada pedido es un array:

\`\`\`sql
SELECT e.order_id,
       array_agg(e.event ORDER BY e.event_at, e.id) AS eventos
FROM order_events AS e
GROUP BY e.order_id;
\`\`\`

El \`ORDER BY\` **dentro** del agregado no es decorativo: sin él, el orden de los elementos no está garantizado y la lista deja de ser reproducible. Agrega un segundo criterio (\`e.id\`) para los empates de tiempo.

Con la lista armada, tres herramientas resuelven casi todo:

- \`array_to_string(eventos, ' > ')\` la vuelve texto legible.
- \`cardinality(eventos)\` cuenta los elementos.
- \`GROUP BY eventos\` agrupa por la lista completa: dos pedidos con la misma secuencia caen en el mismo grupo. Así se cuentan las trayectorias distintas sin escribir un \`CASE\` por cada camino posible.

También puedes ir en el sentido inverso con \`unnest(arreglo)\` en el \`FROM\`, que convierte cada elemento en una fila, y preguntar por pertenencia con \`valor = ANY (arreglo)\`.

Si solo necesitas el texto y nunca la lista, \`string_agg(e.event, ' > ' ORDER BY e.event_at, e.id)\` hace el mismo trabajo en un paso. Elige array cuando además vayas a contar elementos, mirar una posición o agrupar por la lista completa.

## Armar un documento: JSON

\`jsonb_build_object('clave', valor, ...)\` construye un objeto y \`json_agg\` / \`jsonb_agg\` arman un arreglo de documentos. Para leer, \`->\` devuelve JSON y \`->>\` devuelve texto:

\`\`\`sql
SELECT o.id,
       jsonb_build_object(
         'estado', o.status,
         'total', o.total,
         'minutos_prometidos', o.promised_minutes
       ) AS ficha
FROM orders AS o
LIMIT 5;
\`\`\`

Hay dos tipos y la diferencia importa: \`json\` guarda el texto tal cual lo escribiste; \`jsonb\` lo guarda ya interpretado, **ordena las claves** y elimina duplicadas. Para un resultado reproducible —dos personas escriben las claves en distinto orden y obtienen el mismo texto— usa \`jsonb\`.

## Cuándo no usarlos

Un array o un JSON dentro de una columna es cómodo para **presentar** y caro para **consultar**: filtrar por un elemento no aprovecha los índices habituales y cualquier análisis posterior empieza desarmando la estructura. La regla práctica: modela en tablas y agrupa en listas o documentos **al final**, en la capa de presentación.

## Jerarquías, otra vez

El otro caso que no cabe en una tabla plana es el árbol, y ya lo resolviste con \`WITH RECURSIVE\`: caso base, \`UNION ALL\`, paso recursivo. Dos detalles del simulador conviene tenerlos a mano: la CTE recursiva necesita su **lista de columnas** (\`WITH RECURSIVE arbol(id, raiz) AS ...\`) y debe ser la **única** CTE de la consulta. Si necesitas más pasos, ponlos en el \`SELECT\` final o en subconsultas.

Un uso frecuente en analítica: reasignar cada fila a su **raíz** para reportar por categoría de primer nivel sin importar cuántos niveles tenga el árbol hoy.

## Errores comunes

- \`array_agg\` sin \`ORDER BY\`: la lista puede cambiar entre ejecuciones y el reporte deja de ser reproducible.
- Confundir \`->\` con \`->>\`: el primero devuelve JSON (el texto queda entre comillas), el segundo devuelve texto plano.
- Usar \`json\` donde hace falta reproducibilidad de claves; para eso está \`jsonb\`.
- Guardar listas en la base para evitarse una tabla de detalle: se paga en cada consulta posterior.

## Resumen

1. \`array_agg(... ORDER BY ...)\` construye listas reproducibles; \`array_to_string\`, \`cardinality\` y \`GROUP BY\` sobre el array hacen el resto.
2. \`jsonb_build_object\` arma documentos y ordena las claves; \`->>\` extrae texto.
3. Listas y documentos son para la capa de presentación, no para reemplazar el modelo.
`,
  },
];
