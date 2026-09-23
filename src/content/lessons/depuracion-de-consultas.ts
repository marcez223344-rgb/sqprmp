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

Una consulta que se ejecuta no es una consulta correcta. El motor solo verifica que la sintaxis cierre y que los tipos combinen; nunca verifica que hayas medido lo que te pidieron. Los errores más caros de tu carrera no van a ser \`syntax error\`: van a ser números plausibles, con el signo correcto y el orden de magnitud correcto, que estaban mal.

Trabajas con **TiendaViva**, un marketplace en seis países: \`customers\`, \`sellers\`, \`products\`, \`orders\` (18 000 pedidos), \`order_items\` (30 067 líneas), \`payments\`, \`shipments\`, \`reviews\` y \`returns\`.

## La señal

No hay alarma automática. Lo que hay son señales que un analista con oficio aprende a no ignorar:

- Un total que no cierra con otra fuente (finanzas, el tablero viejo, el propio sistema).
- Un porcentaje de 100 % o de 0 % en todas las filas.
- Una cifra que cambió mucho sin que cambiara el negocio.
- Menos filas de las que esperabas, o muchísimas más.
- Un promedio demasiado parejo entre grupos que sabes que son distintos.

Cuando aparece una, la reacción correcta no es releer la consulta buscando el error a ojo. Es **descomponerla**.

## El método

Toda consulta compleja es una cadena de pasos. Depurar es ejecutar cada paso por separado y contar el resultado, comparándolo con un número que ya conoces.

**1. Cuenta el punto de partida.** \`SELECT count(*) FROM orders\` devuelve 18 000. Ese número es tu ancla: si al final del análisis tienes más pedidos que 18 000, algo los multiplicó.

**2. Convierte cada paso en una CTE y cuéntala.** Una consulta escrita como cadena de CTE se depura sola, porque cada eslabón tiene nombre y se puede ejecutar aislado:

\`\`\`sql
WITH base AS (
  SELECT id, customer_id, total_amount
  FROM orders
  WHERE status = 'delivered'
)
SELECT count(*) AS filas, count(DISTINCT id) AS pedidos
FROM base;
\`\`\`

Devuelve 13 156 y 13 156: una fila por pedido, como debe ser. Esa pareja \`count(*)\` / \`count(DISTINCT clave)\` es la herramienta de diagnóstico más útil que vas a usar. Mientras sean iguales, el grano se mantiene; cuando se separan, un join multiplicó filas.

**3. Agrega un paso y vuelve a contar.** Después de unir con \`order_items\`, esa misma pareja da 21 974 y 13 156. El grano cambió: ya no estás en «un pedido por fila», estás en «una línea por fila». Cualquier \`sum(o.total_amount)\` después de ese join está inflado.

**4. Compara contra algo conocido.** La suma de \`orders.total_amount\` de los pedidos entregados de Argentina da 1 705 368 745,77. Si tu consulta con cinco joins devuelve el doble, no tienes un problema de datos: tienes un join que duplica.

## Reducir el caso

Cuando el error no aparece, achica el problema:

- Filtra a **un** pedido conocido (\`WHERE o.id = 4211\`) y mira las filas crudas sin agregar. Un error que involucra 18 000 filas se ve mejor en 3.
- Quita el \`GROUP BY\` y mira el detalle. La agregación esconde: lo que sumó 40 puede ser 40 unos.
- Quita filtros de a uno. El que cambia el resultado de forma inesperada es el sospechoso.
- Reemplaza la lista del \`SELECT\` final por \`*\` sobre el join, con \`LIMIT 20\`. Ver las filas duplicadas es más rápido que deducirlas.

## Leer el error cuando sí hay error

A veces el motor sí habla, y conviene entenderlo en vez de probar al azar:

- \`column "x" must appear in the GROUP BY clause or be used in an aggregate function\`: seleccionaste una columna a un grano distinto del grupo. La pregunta correcta es «¿de qué grano es esta consulta?», no «¿cómo callo el error?».
- \`operator does not exist: text = integer\`: estás comparando tipos distintos; casi siempre el diagnóstico real es que una columna no guarda lo que creías.
- \`division by zero\`: un denominador vacío que no habías contemplado. Protégelo con \`nullif(x, 0)\` **y** entiende por qué estaba vacío.
- \`more than one row returned by a subquery used as an expression\`: tu subconsulta escalar no era escalar. Es un aviso gratis de un problema de grano.

Un error visible es un regalo. El peligro está en la consulta que no protesta.

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

El fan-out —un join que devuelve más filas de las que entró— es la causa número uno de totales inflados en informes reales. No produce ningún error, y el resultado tiene forma de resultado: mismas columnas, mismos grupos, números más grandes. Quien no lo busca, no lo encuentra.

## De dónde sale

Un join entre A y B devuelve, por cada fila de A, tantas filas como coincidencias tenga en B. Si esa relación es 1:1, el conteo se mantiene. Si es 1:N, se multiplica. Y en cuanto se multiplica, toda columna que venía de A aparece repetida **N veces**, así que sumarla la cuenta N veces.

En TiendaViva:

- \`orders\` a \`order_items\` es 1:N (1,67 líneas por pedido en promedio).
- \`orders\` a \`payments\` es 1:N: hay 18 050 pagos para 18 000 pedidos, y 1 251 pedidos tienen dos (un rechazo y un reintento aprobado).
- \`orders\` a \`returns\` es 1:0..1.

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

Lo traicionero es que el factor **no es constante**. Los pedidos de una línea se cuentan una vez y los de tres, tres veces, así que el sesgo favorece a los pedidos grandes. Por eso el ranking de categorías también cambia, no solo la escala.

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

**3. Desduplica con \`DISTINCT\` solo cuando la clave lo permite.** \`count(DISTINCT o.id)\` es correcto para contar pedidos. \`sum(DISTINCT o.total_amount)\` es una trampa: dos pedidos distintos con el mismo importe se convierten en uno. Para contar, \`DISTINCT\` sirve; para sumar importes, casi nunca.

## El join que filtra sin avisar

El otro lado de la moneda: un \`INNER JOIN\` no solo puede multiplicar, también **elimina**. Unir \`orders\` con \`shipments\` descarta en silencio los pedidos cancelados, que no tienen envío. Si tu informe era «todos los pedidos», ya no lo es.

Regla práctica: cada vez que agregues un join, hazte dos preguntas y respóndelas con una consulta, no con una intuición. ¿Puede multiplicar? ¿Puede eliminar? Si la respuesta a la segunda es sí y no quieres perder filas, es un \`LEFT JOIN\`.

## Cómo comprobarlo en un minuto

\`\`\`sql
SELECT order_id, count(*) AS filas
FROM payments
GROUP BY order_id
HAVING count(*) > 1
ORDER BY filas DESC
LIMIT 5;
\`\`\`

Si devuelve filas, esa tabla multiplica. Corre esa comprobación sobre la clave de cada join **antes** de escribir la consulta grande; son diez segundos que ahorran una reunión incómoda.

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

Tres fallas producen la mayoría de los resultados «correctos pero equivocados» que no vienen de un join que multiplica: un filtro puesto en el lugar equivocado, un NULL que se comporta distinto de como lo leíste, y una agregación hecha al grano que no era. Las tres se ejecutan sin una sola advertencia.

## El filtro que apaga un LEFT JOIN

\`\`\`sql
SELECT c.city, count(DISTINCT c.id) AS clientes
FROM customers AS c
LEFT JOIN orders AS o ON o.customer_id = c.id
WHERE o.status = 'delivered'
GROUP BY 1;
\`\`\`

Esta consulta no tiene ningún \`LEFT JOIN\`, aunque lo diga. El join conserva a los clientes sin pedidos, pero les deja \`o.status\` en NULL; después el \`WHERE\` evalúa \`NULL = 'delivered'\`, que da NULL, y la fila se descarta. El \`LEFT JOIN\` quedó convertido en \`INNER JOIN\`.

La diferencia está en **cuándo** se aplica la condición:

- En el \`ON\`: se aplica **antes** de completar con nulos, así que decide qué filas de la derecha se consideran coincidencias. Las filas de la izquierda sobreviven siempre.
- En el \`WHERE\`: se aplica **después**, sobre el resultado del join, e incluye las filas rellenadas con NULL.

Para una tabla opcional, la condición sobre la tabla de la derecha va en el \`ON\`:

\`\`\`sql
LEFT JOIN orders AS o ON o.customer_id = c.id AND o.status = 'delivered'
\`\`\`

La única excepción útil es el patrón *anti-join*: \`LEFT JOIN ... WHERE o.id IS NULL\` busca a propósito las filas sin coincidencia.

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

Con NULL hay más trampas del mismo linaje: \`count(columna)\` ignora nulos mientras \`count(*)\` no; \`avg\` los omite del promedio **y del divisor**; \`status <> 'cancelled'\` no devuelve las filas con \`status\` NULL; y \`sum\` de un conjunto vacío es NULL, no 0.

## El grano de la agregación

«Ticket promedio» tiene una sola definición de negocio y dos consultas posibles, que dan números distintos. Si promedias \`total_amount\` después de unir con \`order_items\`, cada pedido pesa tantas veces como líneas tiene: no es el ticket promedio, es el ticket promedio ponderado por cantidad de líneas. En TiendaViva, para los pedidos entregados de Argentina comprados por app, el ticket real es 431 786,43.

La regla es sencilla y hay que aplicarla siempre: **el grano del \`GROUP BY\` tiene que ser el grano de la cosa que estás midiendo**. Si mides pedidos, llega al grano de un pedido por fila antes de promediar; si mides líneas, agrupa por línea. Cuando dudes, escribe el grano de cada CTE en un comentario: \`-- una fila por pedido\`. Ese comentario de cuatro palabras previene más errores que cualquier revisión.

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
