import type { LessonDef } from "../schemas/curriculum";

const section = "depuracion-de-consultas";

export const lessons: LessonDef[] = [
  {
    slug: "depuracion-descomponer-y-contar",
    section,
    kind: "theory",
    title: "Descomponer y contar",
    sort_order: 0,
    estimated_minutes: 12,
    is_free: false,
    is_published: true,
    prerequisites: ["calidad-de-datos-validez-y-huecos"],
    dataset: "tiendaviva",
    body_md: `## Por qué importa

Una consulta que se ejecuta no es necesariamente una consulta correcta. El motor verifica dos cosas: que la sintaxis cierre y que los tipos de datos combinen. No verifica que hayas medido lo que te pidieron. Por eso los errores más caros de tu carrera no van a ser un \`syntax error\`, sino números plausibles, con el signo y el orden de magnitud correctos, que estaban equivocados.

Trabajas con **TiendaViva**, un marketplace en seis países. Sus tablas son \`customers\` (clientes), \`sellers\` (vendedores), \`products\`, \`orders\` (18 000 pedidos, uno por fila), \`order_items\` (30 067 líneas, una por producto dentro de un pedido), \`payments\`, \`shipments\`, \`reviews\` y \`returns\`.

## La señal

No hay alarma automática. Lo que hay son señales que un analista con oficio aprende a no ignorar:

- Un total que no cierra con otra fuente (finanzas, el tablero viejo, el propio sistema).
- Un porcentaje de 100 % o de 0 % en todas las filas.
- Una cifra que cambió mucho sin que cambiara el negocio.
- Menos filas de las que esperabas, o muchísimas más.
- Un promedio demasiado parejo entre grupos que sabes que son distintos.

Cuando aparece una de esas señales, releer la consulta a simple vista no sirve: te parece bien, por eso la escribiste así. Lo que corresponde es **descomponerla** en pasos y verificar cada uno con un número.

## El método

Toda consulta compleja es una cadena de pasos. Depurar es ejecutar cada paso por separado y contar el resultado, comparándolo con un número que ya conoces.

**1. Cuenta el punto de partida.** \`SELECT count(*) FROM orders\` devuelve 18 000. Ese número es tu ancla: si al final del análisis tienes más pedidos que 18 000, algo los multiplicó.

**2. Convierte cada paso en una CTE y cuéntala.** Una CTE (por *common table expression*) es el bloque \`WITH nombre AS (...)\` que le pone nombre a un paso intermedio. Una cadena de CTE es fácil de depurar: cada eslabón tiene nombre y se ejecuta por separado.

\`\`\`sql
WITH base AS (
  SELECT id, customer_id, total_amount
  FROM orders
  WHERE status = 'delivered'
)
SELECT count(*) AS filas, count(DISTINCT id) AS pedidos
FROM base;
\`\`\`

Devuelve 13 156 y 13 156. Los dos números coinciden, así que hay una fila por pedido, como corresponde. Esa pareja de conteos, \`count(*)\` contra \`count(DISTINCT clave)\`, es tu herramienta de diagnóstico más útil. Mientras los dos valores sean iguales, el **grano** —lo que representa una fila— se mantiene. En cuanto se separan, algún join multiplicó filas.

**3. Agrega un paso y vuelve a contar.** Después de unir con \`order_items\`, esa misma pareja de conteos da 21 974 y 13 156. El grano cambió: ya no tienes un pedido por fila, sino una línea de detalle, y cada pedido aparece repetido tantas veces como productos tenga. A partir de ahí, cualquier \`sum(o.total_amount)\` suma el total del pedido varias veces y queda inflado.

**4. Compara contra algo conocido.** La suma de \`orders.total_amount\` de los pedidos entregados de Argentina da 1 705 368 745,77. Si tu consulta con cinco joins devuelve el doble, no tienes un problema de datos: tienes un join que duplica.

## Reducir el caso

Cuando el error no aparece, achica el problema:

- Filtra a **un** pedido conocido (\`WHERE o.id = 4211\`) y mira las filas crudas sin agregar. Un error que involucra 18 000 filas se ve mejor en 3.
- Quita el \`GROUP BY\` y mira el detalle. La agregación tapa el problema: un grupo que suma 40 puede ser un pedido de 40 unidades o cuarenta filas de una unidad, y agrupados se ven igual.
- Quita filtros de a uno. El que cambia el resultado de forma inesperada es el sospechoso.
- Reemplaza la lista del \`SELECT\` final por \`*\` sobre el join, con \`LIMIT 20\`. Ver las filas duplicadas es más rápido que deducirlas.

## Leer el error cuando sí hay error

A veces el motor sí habla, y conviene entenderlo en vez de probar al azar:

- \`column "x" must appear in the GROUP BY clause or be used in an aggregate function\`: seleccionaste una columna a un grano distinto del grupo. La pregunta correcta es «¿de qué grano es esta consulta?», no «¿cómo callo el error?».
- \`operator does not exist: text = integer\`: estás comparando tipos distintos; casi siempre el diagnóstico real es que una columna no guarda lo que creías.
- \`division by zero\`: un denominador vacío que no habías contemplado. Protégelo con \`nullif(x, 0)\` **y** entiende por qué estaba vacío.
- \`more than one row returned by a subquery used as an expression\`: tu subconsulta escalar no era escalar. Es un aviso gratis de un problema de grano.

Un mensaje de error es información gratis: te dice dónde mirar. La consulta peligrosa es la que no protesta y devuelve un número equivocado.

## Errores comunes

- Corregir a ojo, cambiando varias cosas a la vez, sin volver a contar entre cambio y cambio.
- Confiar en que «el resultado se ve razonable» sin ninguna cifra externa que lo confirme.
- Depurar sobre el resultado agregado, donde el problema ya está escondido.
- Dejar el diagnóstico sin escribir: al mes siguiente alguien vuelve a cometer el mismo error.

## Resumen

1. Una consulta que corre puede estar mal; la única forma de saberlo es verificarla contra números conocidos.
2. Descompón en CTE y cuenta cada paso con \`count(*)\` y \`count(DISTINCT clave)\`.
3. Reduce el caso a un pedido, quita la agregación y lee el mensaje del motor antes de tocar nada.
`,
  },
  {
    slug: "depuracion-joins-que-multiplican",
    section,
    kind: "theory",
    title: "Joins que multiplican",
    sort_order: 1,
    estimated_minutes: 13,
    is_free: false,
    is_published: true,
    prerequisites: ["depuracion-descomponer-y-contar"],
    dataset: "tiendaviva",
    body_md: `## Por qué importa

El **fan-out** —término en inglés, «abanico», que nombra a un join que devuelve más filas de las que entraron— es la causa número uno de totales inflados en informes reales. No produce ningún error y el resultado tiene toda la apariencia de estar bien: las mismas columnas, los mismos grupos, solo que con números más grandes. Nada te avisa, así que hay que buscarlo a propósito en cada join que escribes.

## De dónde sale

Un join entre A y B devuelve, por cada fila de A, tantas filas como coincidencias tenga en B. Si la relación es uno a uno (1:1, cada fila de A con una sola de B), el conteo se mantiene. Si es uno a muchos (1:N, cada fila de A con varias de B), el conteo se multiplica. Y en cuanto se multiplica, cada columna que venía de A aparece repetida **N veces**, de modo que sumarla la cuenta N veces.

En TiendaViva:

- De \`orders\` a \`order_items\` la relación es 1:N: cada pedido tiene una línea por producto comprado, 1,67 líneas en promedio.
- De \`orders\` a \`payments\` también es 1:N. Hay 18 050 pagos para 18 000 pedidos, porque 1 251 pedidos tienen dos filas de pago: un intento rechazado y un reintento aprobado.
- De \`orders\` a \`returns\` la relación es 1:0..1, es decir, cada pedido tiene una devolución o ninguna. Ese caso no multiplica filas.

Basta un solo join 1:N para arruinar un total.

## Verlo con números

\`\`\`sql
SELECT
  count(*) AS filas,
  count(DISTINCT o.id) AS pedidos,
  round(sum(o.total_amount), 2) AS suma_inflada
FROM orders AS o
INNER JOIN order_items AS oi ON oi.order_id = o.id
WHERE o.status = 'delivered';
\`\`\`

21 974 filas para 13 156 pedidos entregados. El total de Argentina pasa de 1 705 368 745,77 a 3 631 177 874,05. No es «más o menos el doble por casualidad»: es exactamente la suma de cada pedido repetida una vez por línea.

Lo más engañoso es que el factor de inflación **no es constante**. Un pedido de una sola línea se cuenta una vez y uno de tres líneas se cuenta tres veces, así que los pedidos grandes pesan más de lo que les corresponde. Por eso no cambia solo la escala del total: también cambia el orden del ranking de categorías, y el error deja de ser fácil de detectar.

## Las tres salidas

**1. Agrega antes de unir.** Lleva la tabla de detalle a un grano de una fila por clave y recién entonces únela:

\`\`\`sql
WITH items AS (
  SELECT order_id, sum(quantity * unit_price) AS valor_items, count(*) AS lineas
  FROM order_items
  GROUP BY order_id
)
SELECT o.id, o.total_amount, i.lineas
FROM orders AS o
INNER JOIN items AS i ON i.order_id = o.id;
\`\`\`

Es la solución por defecto y la más legible: cada CTE declara su grano.

**2. Suma en el grano correcto.** Si ya estás en el grano de línea, suma columnas de línea (\`quantity * unit_price\`), no columnas de pedido. El problema no es el join, es sumar una columna de cabecera desde el detalle.

**3. Desduplica con \`DISTINCT\` solo cuando la clave lo permite.** \`count(DISTINCT o.id)\` es correcto para contar pedidos, porque \`id\` identifica a cada pedido sin repetirse. \`sum(DISTINCT o.total_amount)\` es una trampa, en cambio, porque dos pedidos distintos que casualmente valen lo mismo se cuentan como uno solo y el total queda por debajo del real. Para contar, \`DISTINCT\` sirve. Para sumar importes, casi nunca.

## El join que filtra sin avisar

El otro lado de la moneda: un \`INNER JOIN\` no solo puede multiplicar, también **elimina**. Unir \`orders\` con \`shipments\` descarta en silencio los pedidos cancelados, que no tienen envío. Si tu informe era «todos los pedidos», ya no lo es.

Regla práctica: cada vez que agregues un join, hazte dos preguntas y respóndelas ejecutando una consulta, no con una intuición. ¿Puede multiplicar filas? ¿Puede eliminarlas? Si puede eliminarlas y no quieres perder esas filas, el join tiene que ser un \`LEFT JOIN\`, que conserva todas las filas de la tabla de la izquierda aunque no encuentren pareja.

## Cómo comprobarlo en un minuto

\`\`\`sql
SELECT order_id, count(*) AS filas
FROM payments
GROUP BY order_id
HAVING count(*) > 1
ORDER BY filas DESC
LIMIT 5;
\`\`\`

Si esa consulta devuelve alguna fila, significa que hay valores de \`order_id\` repetidos y que unir por esa columna multiplicará filas. Ejecútala sobre la clave de cada join **antes** de escribir la consulta grande: son diez segundos que evitan tener que corregir un informe ya enviado.

## Errores comunes

- Sumar \`orders.total_amount\` después de unir con \`order_items\` o con \`payments\`.
- Usar \`sum(DISTINCT ...)\` para tapar un fan-out en vez de corregir el grano.
- Suponer que una clave foránea es única sin verificarlo.
- Encadenar tres o cuatro joins de detalle y confiar en que ninguno multiplica.

## Resumen

1. Un join 1:N repite las columnas del lado 1 y todo lo que sumes de ese lado queda multiplicado.
2. Diagnostícalo con \`count(*)\` contra \`count(DISTINCT clave)\`; corrígelo agregando el detalle antes de unir.
3. Un \`INNER JOIN\` también puede borrar filas: pregúntate siempre si multiplica y si elimina.
`,
  },
  {
    slug: "depuracion-filtros-nulos-y-grano",
    section,
    kind: "theory",
    title: "Filtros, NULL y grano",
    sort_order: 2,
    estimated_minutes: 13,
    is_free: false,
    is_published: true,
    prerequisites: ["depuracion-joins-que-multiplican"],
    dataset: "tiendaviva",
    body_md: `## Por qué importa

Cuando un resultado es «correcto pero equivocado» y la causa no es un join que multiplica filas, casi siempre se trata de una de estas tres fallas: un filtro puesto en el lugar equivocado, un NULL que se comporta de una manera distinta de la que esperabas, o una agregación hecha sobre un grano que no era el de la pregunta. Las tres se ejecutan sin una sola advertencia del motor.

## El filtro que apaga un LEFT JOIN

\`\`\`sql
SELECT c.city, count(DISTINCT c.id) AS clientes
FROM customers AS c
LEFT JOIN orders AS o ON o.customer_id = c.id
WHERE o.status = 'delivered'
GROUP BY 1;
\`\`\`

Esta consulta dice \`LEFT JOIN\`, pero se comporta exactamente como un \`INNER JOIN\`. El join sí conserva a los clientes que no tienen pedidos, y a esas filas les deja la columna \`status\` de \`orders\` en NULL, porque no hay ningún pedido de donde tomarla. Después, el \`WHERE\` evalúa \`NULL = 'delivered'\`, que no da ni verdadero ni falso sino NULL, y la fila se descarta. Los clientes sin pedidos, que eran justamente los que querías contar como cero, desaparecen del resultado.

La diferencia está en **cuándo** se aplica la condición:

- En el \`ON\`: se aplica **antes** de completar con nulos, así que decide qué filas de la derecha se consideran coincidencias. Las filas de la izquierda sobreviven siempre.
- En el \`WHERE\`: se aplica **después**, sobre el resultado del join, e incluye las filas rellenadas con NULL.

Para una tabla opcional, la condición sobre la tabla de la derecha va en el \`ON\`:

\`\`\`sql
LEFT JOIN orders AS o ON o.customer_id = c.id AND o.status = 'delivered'
\`\`\`

La excepción útil es el patrón llamado *anti-join* (en inglés, «join inverso»): \`LEFT JOIN ... WHERE o.id IS NULL\` busca a propósito las filas de la izquierda que no encontraron ninguna coincidencia, por ejemplo los clientes que nunca compraron.

## NOT IN y el NULL que se lleva todo

\`\`\`sql
SELECT count(*) FROM categories AS c
WHERE c.id NOT IN (SELECT parent_id FROM categories);
\`\`\`

Devuelve 0. No porque todas las categorías tengan subcategorías —solo 6 de las 30 las tienen— sino porque \`parent_id\` es NULL en las 6 categorías raíz. \`x NOT IN (1, 2, NULL)\` equivale a \`x <> 1 AND x <> 2 AND x <> NULL\`, y esa última comparación nunca es verdadera: devuelve NULL, y el \`AND\` completo nunca puede dar verdadero. Resultado: cero filas, siempre.

\`IN\` no sufre este problema (le alcanza con que una comparación sea verdadera); \`NOT IN\` sí. Las salidas:

- \`NOT EXISTS (SELECT 1 FROM categories AS h WHERE h.parent_id = c.id)\` — la forma preferida: dice literalmente «no existe ninguna que lo tenga como padre» y es inmune a los nulos.
- \`LEFT JOIN ... WHERE h.id IS NULL\` — el anti-join clásico, equivalente.
- \`NOT IN (SELECT parent_id FROM categories WHERE parent_id IS NOT NULL)\` — funciona, pero depende de que nadie borre ese filtro.

Los NULL tienen otras trampas de la misma familia, y conviene tenerlas presentes todas:

- \`count(columna)\` no cuenta las filas donde esa columna es NULL, mientras que \`count(*)\` las cuenta todas.
- \`avg\` ignora los NULL en el promedio **y también en el divisor**, así que promedia sobre menos filas de las que parece.
- \`status <> 'cancelled'\` no devuelve las filas donde \`status\` es NULL, porque comparar con NULL nunca da verdadero.
- \`sum\` sobre un conjunto vacío devuelve NULL, no 0.

## El grano de la agregación

«Ticket promedio» tiene una sola definición de negocio —cuánto gasta en promedio un pedido— y dos consultas posibles que devuelven números distintos. Si promedias \`total_amount\`, la columna de \`orders\` con el importe del pedido, después de haber unido con \`order_items\`, cada pedido pesa tantas veces como líneas tenga. Ese número no es el ticket promedio: es el ticket promedio ponderado por la cantidad de líneas, y siempre queda más alto porque los pedidos grandes se repiten más. En TiendaViva, para los pedidos entregados de Argentina comprados por la app, el ticket promedio real es 431 786,43.

La regla es sencilla y hay que aplicarla siempre: **el grano del \`GROUP BY\` tiene que coincidir con el grano de lo que estás midiendo**. Si mides pedidos, vuelve a una fila por pedido antes de promediar. Si mides líneas de detalle, agrupa por línea. Cuando dudes, escribe el grano de cada CTE en un comentario, por ejemplo \`-- una fila por pedido\`. Ese comentario corto obliga a decidir el grano en voz alta y evita la mayoría de estos errores.

Y una vez que tengas el número, verifícalo: promedio por cantidad debería reconstruir el total conocido. Si no lo reconstruye, el grano no era el que creías.

## Errores comunes

- Filtrar la tabla opcional en el \`WHERE\` y perder exactamente las filas que querías contar en cero.
- Usar \`NOT IN\` contra una subconsulta con nulos y recibir cero filas sin ninguna advertencia.
- Promediar o sumar después de un join que cambió el grano.
- Confundir \`count(*)\` con \`count(columna)\` cuando hay nulos de por medio.

## Resumen

1. Sobre la tabla opcional de un \`LEFT JOIN\`, la condición va en el \`ON\`; en el \`WHERE\` lo convierte en \`INNER JOIN\`.
2. \`NOT IN\` con un NULL en la lista devuelve cero filas: usa \`NOT EXISTS\`.
3. Declara el grano de cada paso y agrega solo en el grano de lo que mides.
`,
  },
];
