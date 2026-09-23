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

A esta altura ya sabes escribir cada pieza por separado. El salto profesional no consiste en aprender una función más, sino en **ordenar una consulta larga** para que otra persona, o tú dentro de seis meses, pueda leerla, probarla por partes y confiar en su resultado.

La técnica central es simple: una consulta compleja se escribe como una **secuencia de capas**. Cada capa es una CTE (por *common table expression*, su nombre en inglés: la consulta con nombre que defines en el \`WITH\`) con un contrato claro, es decir, con un grano y unas columnas declaradas. La última capa solo presenta el resultado.

## Una capa, un grano

El **grano** de una capa es qué representa una fila suya: un comercio, un rubro, una transacción. En **Bolsillo**, la billetera digital, queremos los comercios con más operaciones de cada rubro, junto con su participación sobre el total del rubro:

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

Escribe el grano en un comentario arriba de cada CTE, como en el ejemplo. Cuando una consulta larga devuelve números equivocados, la causa más frecuente es que dos capas tienen granos distintos y alguien las unió como si fueran iguales, con lo que una de las dos multiplicó filas.

## Dónde se evalúa cada cosa

Las funciones de ventana se calculan **después** de \`WHERE\`, \`GROUP BY\` y \`HAVING\`, y **antes** de \`ORDER BY\` y \`LIMIT\`. De ese orden salen dos reglas que ahorran horas de depuración:

- No puedes filtrar por el resultado de una ventana en el \`WHERE\` de la misma consulta, porque en ese momento todavía no se calculó. Necesitas una capa más.
- Sí puedes aplicar una ventana **sobre un agregado**, porque el agregado ya ocurrió: \`sum(count(*)) OVER ()\` es válido y devuelve el total general al lado de cada grupo.

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

Esa combinación, agregar y comparar contra el total en la misma pasada, reemplaza una subconsulta entera y evita recorrer los datos dos veces.

## LATERAL: una subconsulta que ve la fila actual

Una subconsulta escrita en el \`FROM\` normalmente no puede mencionar columnas de las tablas que están a su izquierda, porque se calcula de forma independiente. La palabra \`LATERAL\` levanta esa restricción, y eso habilita el patrón «para cada fila de A, calcula esto en B»:

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

Léelo como un bucle: para cada rubro, PostgreSQL ejecuta la subconsulta con \`c.category\` ya reemplazado por el valor de esa fila y pega las filas que devuelve. El \`LIMIT\` vive **adentro** de la subconsulta, así que limita a tres comercios por rubro y no a tres filas en total. Eso es exactamente lo que una subconsulta común no puede hacer.

## Variantes

- \`CROSS JOIN LATERAL\` descarta las filas de la izquierda cuya subconsulta no devuelve nada, igual que un INNER JOIN. Si quieres conservarlas, usa \`LEFT JOIN LATERAL (...) AS x ON true\`.
- El mismo top-N por grupo se resuelve con \`row_number()\` y un filtro en la capa siguiente. Las dos formas son correctas: la función de ventana suele leerse mejor cuando ya tienes la capa agregada armada, y \`LATERAL\` conviene cuando el cálculo por fila es caro y solo necesitas unas pocas filas de cada grupo.
- \`LATERAL\` también acepta la forma con coma (\`FROM a, LATERAL (...) AS x\`), que equivale a \`CROSS JOIN LATERAL\`.

## Errores comunes

- Filtrar con \`WHERE puesto = 1\` en el mismo nivel donde se calcula \`row_number()\`.
- Poner el \`LIMIT\` afuera de la subconsulta lateral cuando lo que querías era un top-N por grupo.
- Olvidar el alias de la subconsulta lateral: PostgreSQL lo exige y devuelve un error de sintaxis.
- Encadenar diez CTE sin declarar el grano de ninguna. El resultado es tan difícil de leer como una consulta de cien líneas sin cortes.

## Resumen

1. Una capa, un grano, declarado en una línea de comentario.
2. Las ventanas corren después de agregar. Por eso \`sum(count(*)) OVER ()\` funciona y filtrar una ventana en el mismo \`WHERE\` no.
3. \`LATERAL\` significa «para cada fila de la izquierda, ejecuta esta consulta», y el \`LIMIT\` queda adentro.
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

Todo reporte de negocio termina pidiendo lo mismo: el detalle, **más** los subtotales por cada dimensión, **más** el total general. La respuesta ingenua es escribir la consulta tres veces y unir los resultados con \`UNION ALL\`. Eso hace que el motor recorra los mismos datos tres veces y, sobre todo, deja tres lugares donde el filtro puede quedar desalineado cuando alguien lo modifique.

PostgreSQL resuelve el problema en una sola pasada con \`ROLLUP\` y \`CUBE\`.

## ROLLUP: subtotales jerárquicos

En **TiendaViva**, los pedidos entregados por país y por canal de venta:

\`\`\`sql
SELECT c.country, o.channel, count(*) AS pedidos
FROM orders AS o
INNER JOIN customers AS c ON c.id = o.customer_id
WHERE o.status = 'delivered'
GROUP BY ROLLUP (c.country, o.channel);
\`\`\`

\`ROLLUP (a, b)\` calcula tres niveles de agregación en la misma consulta: por la combinación \`(a, b)\`, por \`(a)\` sola y el total general. Va quitando columnas **de derecha a izquierda**, así que el orden en que las escribes cambia el reporte: \`ROLLUP (country, channel)\` da un subtotal por país, y \`ROLLUP (channel, country)\` da un subtotal por canal. Es la jerarquía natural de un informe, de lo más detallado a lo más general.

## El NULL ambiguo y la función GROUPING

En las filas de subtotal, las columnas que se agregaron vienen con valor \`NULL\`, porque esa fila ya no corresponde a un solo país ni a un solo canal. El problema aparece si la columna además puede tener \`NULL\` en los datos reales: a simple vista no hay forma de distinguir un subtotal de un dato faltante.

Para eso existe \`grouping()\`, que devuelve 1 cuando la columna **fue agregada** por el subtotal y 0 cuando el valor es un dato real:

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

Tiene dos usos que valen mucho en producción:

- \`grouping()\` también sirve para **ordenar**. Si lo pones primero en el \`ORDER BY\`, cada subtotal queda debajo de su bloque de detalle y el total general queda al final, que es como se lee un reporte impreso.
- Con \`HAVING grouping(c.country) = 1\` te quedas únicamente con las filas de subtotal.

## CUBE: todos los cortes

\`CUBE (a, b)\` calcula las cuatro combinaciones posibles: \`(a, b)\`, \`(a)\`, \`(b)\` y el total general. Úsalo cuando las dos dimensiones son independientes entre sí, por ejemplo tipo de cocina y medio de pago, y quieres los márgenes de la tabla en los dos sentidos. Ten en cuenta que con *n* columnas genera 2 elevado a *n* niveles: con cuatro dimensiones son 16 niveles, y el resultado se vuelve ilegible para quien lo recibe mucho antes de volverse lento para el motor.

**Nota del entorno de práctica:** la forma explícita \`GROUP BY GROUPING SETS ((a, b), (a), ())\` no está disponible en el simulador, y \`ROLLUP\` con \`CUBE\` cubren los mismos casos. En un PostgreSQL real, \`GROUPING SETS\` existe y te permite elegir exactamente qué niveles calcular.

## Pivotes a escala

El otro pedido eterno es la tabla cruzada: una fila por categoría y una columna por período o por canal. Se arma con agregación condicional, y la cláusula \`FILTER\` la hace legible:

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

Un pivote tiene columnas fijas, escritas a mano en la consulta. Si mañana la empresa agrega un canal nuevo, ese canal no aparece hasta que alguien edite el SQL, y el total deja de coincidir con la suma de las columnas visibles. Cuando las categorías cambian solas, conviene entregar el resultado en formato largo, con una fila por combinación, y dejar que la herramienta de visualización arme el pivote.

## Errores comunes

- Leer el \`NULL\` de una fila de subtotal como si fuera un dato faltante.
- Sumar importes de varios países en el total general cuando cada país tiene su propia moneda. Ese número no significa nada; cuenta operaciones o convierte todo con un tipo de cambio antes de sumar.
- Invertir el orden de las columnas de \`ROLLUP\` y obtener el subtotal de la dimensión equivocada.
- Ordenar solo por las etiquetas, con lo que los subtotales quedan mezclados alfabéticamente entre las filas de detalle.

## Resumen

1. \`ROLLUP\` genera la jerarquía de subtotales quitando columnas de derecha a izquierda; \`CUBE\` genera todos los cortes posibles.
2. \`grouping()\` distingue el \`NULL\` de subtotal del \`NULL\` de los datos, y sirve para etiquetar y para ordenar.
3. El pivote con \`FILTER\` es legible, pero sus columnas son fijas: decídelas sabiendo que hay que mantenerlas.
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

Hay preguntas que no se responden bien con una tabla plana. «¿Qué secuencia de estados siguió cada pedido?» no cabe en una columna, porque la respuesta es una **lista ordenada** de valores. Y cuando el resultado va a alimentar una API o un tablero, lo que piden no es una grilla de filas y columnas sino un **documento**, es decir, un objeto con claves y valores.

PostgreSQL trae los dos tipos: los **arrays**, que son listas de valores del mismo tipo guardadas en una sola celda, y JSON (por *JavaScript Object Notation*), el formato estándar para documentos. Usarlos en el lugar correcto acorta consultas enteras.

## Armar una lista: array_agg

En **Pídelo**, la plataforma de delivery, la tabla \`order_events\` guarda un evento por fila, con el estado y el momento en que ocurrió. La trayectoria completa de cada pedido es entonces un array:

\`\`\`sql
SELECT e.order_id,
       array_agg(e.event ORDER BY e.event_at, e.id) AS eventos
FROM order_events AS e
GROUP BY e.order_id;
\`\`\`

El \`ORDER BY\` escrito **dentro** del agregado no es decorativo: sin él, el orden de los elementos de la lista no está garantizado y dos ejecuciones pueden devolver la misma trayectoria en distinto orden, con lo que el reporte deja de ser comparable. Agrega un segundo criterio (\`e.id\`) para los eventos que comparten el mismo instante.

Con la lista ya armada, tres herramientas resuelven casi todo:

- \`array_to_string(eventos, ' > ')\` convierte la lista en un texto legible, como \`creado > asignado > entregado\`.
- \`cardinality(eventos)\` devuelve cuántos elementos tiene.
- \`GROUP BY eventos\` agrupa por la lista completa, de modo que dos pedidos con exactamente la misma secuencia caen en el mismo grupo. Así cuentas cuántas trayectorias distintas existen sin escribir un \`CASE\` por cada camino posible.

También puedes ir en el sentido inverso con \`unnest(arreglo)\` en el \`FROM\`, que convierte cada elemento de la lista en una fila, y preguntar si un valor pertenece a la lista con \`valor = ANY (arreglo)\`.

Si solo necesitas el texto y nunca vas a usar la lista como lista, \`string_agg(e.event, ' > ' ORDER BY e.event_at, e.id)\` hace el mismo trabajo en un solo paso. Elige el array cuando además vayas a contar elementos, mirar una posición concreta o agrupar por la lista completa.

## Armar un documento: JSON

\`jsonb_build_object('clave', valor, ...)\` construye un objeto a partir de pares de clave y valor, y \`json_agg\` o \`jsonb_agg\` arman un arreglo de documentos. Para leer un documento existente, el operador \`->\` devuelve el valor como JSON y \`->>\` lo devuelve como texto plano:

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

Hay dos tipos y la diferencia importa. \`json\` guarda el texto exactamente como lo escribiste, con sus espacios y el orden original de las claves. \`jsonb\` lo guarda ya interpretado, **ordena las claves** y elimina las duplicadas. Para obtener un resultado reproducible, donde dos personas que escriben las claves en distinto orden obtienen el mismo texto, usa \`jsonb\`.

## Cuándo no usarlos

Un array o un JSON dentro de una columna es cómodo para **presentar** y caro para **consultar**. Filtrar por un elemento de la lista no aprovecha los índices habituales, y cualquier análisis posterior tiene que empezar desarmando la estructura para volver a tener filas. La regla práctica: modela en tablas normales y arma las listas o los documentos **al final**, en la capa que entrega el resultado.

## Jerarquías, otra vez

El otro caso que no cabe en una tabla plana es el árbol, y ya lo resolviste con \`WITH RECURSIVE\`: un caso base, un \`UNION ALL\` y un paso recursivo que se apoya en el resultado anterior. Dos detalles del simulador conviene tenerlos a mano: la CTE recursiva necesita su **lista de columnas** declarada (\`WITH RECURSIVE arbol(id, raiz) AS ...\`) y debe ser la **única** CTE de la consulta. Si necesitas más pasos, escríbelos en el \`SELECT\` final o en subconsultas.

Un uso frecuente en analítica es reasignar cada fila a su categoría **raíz**, para reportar por categoría de primer nivel sin que importe cuántos niveles tenga el árbol en este momento.

## Errores comunes

- Usar \`array_agg\` sin \`ORDER BY\`: la lista puede cambiar de orden entre ejecuciones y el reporte deja de ser reproducible.
- Confundir \`->\` con \`->>\`: el primero devuelve JSON, así que el texto llega entre comillas, y el segundo devuelve texto plano.
- Usar \`json\` cuando necesitas que el orden de las claves sea siempre el mismo; para eso está \`jsonb\`.
- Guardar listas en la base para evitarse una tabla de detalle. Ese ahorro se paga en cada consulta posterior.

## Resumen

1. \`array_agg(... ORDER BY ...)\` construye listas reproducibles, y \`array_to_string\`, \`cardinality\` y el \`GROUP BY\` sobre el array hacen el resto.
2. \`jsonb_build_object\` arma documentos y ordena las claves; \`->>\` extrae un valor como texto.
3. Las listas y los documentos son para la capa de presentación, no para reemplazar el modelo de datos.
`,
  },
];
