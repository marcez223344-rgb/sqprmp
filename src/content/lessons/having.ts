import type { LessonDef } from "../schemas/curriculum";

const section = "having";

export const lessons: LessonDef[] = [
  {
    slug: "having-filtrar-grupos",
    section,
    kind: "theory",
    title: "HAVING: filtrar después de agregar",
    sort_order: 0,
    estimated_minutes: 10,
    is_free: false,
    is_published: true,
    prerequisites: ["group-by-reportes"],
    dataset: "pidelo",
    body_md: `## Por qué importa

Con \`GROUP BY\` ya sabes responder «pedidos por restaurante». La pregunta que sigue casi siempre es otra: «¿qué restaurantes superaron los 60 pedidos entregados?». Esa segunda pregunta no se puede responder con \`WHERE\`, porque el número que quieres comparar —la cantidad de pedidos de cada restaurante— todavía no está calculado en el momento en que \`WHERE\` revisa las filas. Para filtrar usando un resultado ya calculado existe \`HAVING\`.

## El concepto

\`HAVING\` es el filtro que se aplica **a los grupos ya calculados**, después de \`GROUP BY\`. Es decir, descarta grupos completos, no filas sueltas: un restaurante entero entra o queda afuera del reporte.

\`\`\`sql
SELECT restaurant_id, count(*) AS entregados
FROM orders
WHERE status = 'delivered'
GROUP BY restaurant_id
HAVING count(*) >= 60
ORDER BY entregados DESC, restaurant_id;
\`\`\`

Lee la consulta como una línea de producción:

1. \`FROM orders\` toma las filas.
2. \`WHERE status = 'delivered'\` descarta **filas** sueltas.
3. \`GROUP BY restaurant_id\` arma un grupo por restaurante y calcula \`count(*)\`.
4. \`HAVING count(*) >= 60\` descarta **grupos** completos.
5. \`ORDER BY\` ordena lo que quedó.

Los 400 restaurantes se convierten en 400 grupos, uno por restaurante, y \`HAVING\` deja pasar solo 12. Sin \`HAVING\` tendrías que exportar las 400 filas y filtrarlas a mano en una planilla, un paso manual que nadie puede auditar después.

## Por qué WHERE no puede hacerlo

\`\`\`sql
SELECT restaurant_id, count(*)
FROM orders
WHERE count(*) >= 60     -- error
GROUP BY restaurant_id;
\`\`\`

PostgreSQL responde *aggregate functions are not allowed in WHERE*, es decir, «no se permiten funciones de agregación en WHERE». No es una restricción arbitraria. Cuando \`WHERE\` evalúa una fila, los grupos todavía no se formaron, así que \`count(*)\` no tiene ningún valor que devolver para esa fila. \`HAVING\` corre más tarde, cuando cada grupo ya tiene sus agregados calculados.

## Los alias no funcionan en HAVING

\`\`\`sql
SELECT restaurant_id, count(*) AS entregados
FROM orders
GROUP BY restaurant_id
HAVING entregados >= 60;   -- column "entregados" does not exist
\`\`\`

Un **alias** es el nombre que le pones a una columna calculada con \`AS\`, como \`entregados\` en el ejemplo. \`GROUP BY\` y \`ORDER BY\` aceptan ese alias, pero \`HAVING\` no, porque se evalúa antes de que la lista del \`SELECT\` —y con ella el alias— llegue a existir. En \`HAVING\` tienes que repetir la expresión completa: \`HAVING count(*) >= 60\`. Es el error más frecuente al empezar con esta cláusula.

## Qué puede ir en HAVING

Cualquier expresión que tenga sentido **por grupo**:

- un agregado: \`HAVING sum(total) > 100000\`
- varios agregados combinados: \`HAVING count(*) > count(DISTINCT customer_id)\`
- una columna del \`GROUP BY\`: \`HAVING payment_method <> 'cash'\` (válido, aunque ese filtro pertenece a \`WHERE\`)

Lo que **no** puede ir es una columna que no esté ni en el \`GROUP BY\` ni dentro de un agregado. Si escribieras \`HAVING total > 1000\` sobre la columna \`total\` de \`orders\`, el motor no sabría qué pedido del grupo mirar, porque el grupo tiene muchos totales distintos, y rechaza la consulta.

## Varias condiciones

\`HAVING\` acepta \`AND\`, \`OR\` y paréntesis igual que \`WHERE\`:

\`\`\`sql
SELECT customer_id, count(*) AS pedidos, sum(total_amount) AS gasto
FROM orders
WHERE currency = 'MXN' AND status = 'delivered'
GROUP BY customer_id
HAVING count(*) >= 8 AND sum(total_amount) > 200000;
\`\`\`

## Resumen

- \`WHERE\` filtra filas antes de agrupar. \`HAVING\` filtra grupos ya formados, después de agregar.
- En \`HAVING\` repites la expresión agregada completa, nunca su alias.
- Un agregado dentro de \`WHERE\` siempre produce un error de sintaxis: el problema está en la consulta, no en los datos.
`,
  },
  {
    slug: "having-vs-where",
    section,
    kind: "theory",
    title: "WHERE o HAVING: cómo decidir",
    sort_order: 1,
    estimated_minutes: 9,
    is_free: false,
    is_published: true,
    prerequisites: ["having-filtrar-grupos"],
    dataset: "tiendaviva",
    body_md: `## La pregunta que resuelve la duda

Ante cualquier filtro, pregúntate: **¿esta condición se puede responder mirando una sola fila?**

- «El pedido está entregado» → sí, se ve en la fila → \`WHERE\`.
- «El cliente hizo más de 8 pedidos» → no, hay que contar varias filas → \`HAVING\`.

Esa única pregunta resuelve casi todos los casos.

## Las dos cláusulas en la misma consulta

Las dos cláusulas no compiten entre sí, porque trabajan en momentos distintos de la consulta. Lo habitual es usar las dos juntas.

\`\`\`sql
SELECT category_id, count(*) AS productos
FROM products
WHERE is_active
GROUP BY category_id
HAVING count(*) >= 60
ORDER BY productos DESC, category_id;
\`\`\`

\`is_active\` es la columna booleana de \`products\` que indica si el producto sigue publicado. El \`WHERE is_active\` define **qué filas entran** al conteo: solo los productos vigentes. El \`HAVING count(*) >= 60\` define **qué categorías aparecen** en el reporte: solo las que llegaron a 60 productos vigentes. Las dos condiciones son necesarias y no se pueden intercambiar: si movieras \`is_active\` al \`HAVING\`, el motor rechazaría la consulta porque esa columna no está agrupada, y si intentaras el conteo en el \`WHERE\`, la rechazaría también.

## El orden importa para el resultado, no solo para la sintaxis

Compara estas dos lecturas del mismo negocio:

\`\`\`sql
-- A: clientes con 5 o más pedidos entregados
SELECT customer_id, count(*) AS pedidos
FROM orders
WHERE status = 'delivered'
GROUP BY customer_id
HAVING count(*) >= 5;
\`\`\`

\`\`\`sql
-- B: clientes con 5 o más pedidos en total, y cuántos de ellos se entregaron
SELECT customer_id, count(*) FILTER (WHERE status = 'delivered') AS entregados
FROM orders
GROUP BY customer_id
HAVING count(*) >= 5;
\`\`\`

En la consulta A, un cliente con 10 pedidos cancelados y 2 entregados **no aparece**, porque el umbral se mide solo sobre los entregados. En la B sí aparece, con \`entregados = 2\`, porque el umbral se mide sobre todos sus pedidos. Ninguna de las dos es la correcta en abstracto: responden preguntas distintas y el negocio decide cuál necesita. Antes de escribir la consulta, define si el umbral se aplica al universo ya filtrado o al universo completo.

## Rendimiento y legibilidad

\`WHERE\` reduce el volumen de datos **antes** de agrupar, así que el motor forma los grupos con menos filas y la consulta termina antes. Cuando una condición puede ir en \`WHERE\`, ponla ahí: se ejecuta más rápido y además le dice a quien lea la consulta que esa condición habla de filas individuales. Deja en \`HAVING\` únicamente las condiciones sobre agregados.

Esto funciona, pero confunde a quien lo lea:

\`\`\`sql
SELECT status, count(*) FROM orders
GROUP BY status
HAVING status <> 'cancelled';   -- válido, pero pertenece a WHERE
\`\`\`

## HAVING sin GROUP BY

Sin \`GROUP BY\`, toda la tabla es un único grupo y \`HAVING\` decide si esa fila única se devuelve o no:

\`\`\`sql
SELECT count(*) AS entregados
FROM orders
WHERE status = 'delivered'
HAVING count(*) > 10000;
\`\`\`

Devuelve una fila si hay más de 10 000 entregas y **cero filas** si no las hay. Es poco frecuente, pero resulta útil en alertas y controles de calidad, donde lo que quieres es recibir un resultado solamente cuando se cruzó el umbral: si la consulta no devuelve nada, todo está en orden.

## Grupos que nunca existieron

\`HAVING\` solo puede filtrar grupos que se formaron, y un grupo se forma únicamente cuando hay al menos una fila que le corresponde. Una categoría sin productos activos no produce un grupo con \`count(*) = 0\`: simplemente no aparece en el resultado. Para listar «categorías con menos de 5 productos, incluidas las que tienen cero» necesitas partir de la tabla \`categories\` y traer los productos con un \`LEFT JOIN\` (sección 18), que conserva las categorías sin coincidencias.

## Resumen

- Si la condición se puede responder mirando una sola fila, va en \`WHERE\`. Si necesita un valor agregado del grupo, va en \`HAVING\`.
- Mover un filtro de \`WHERE\` a \`HAVING\` cambia el resultado cuando el umbral se calcula sobre otro universo.
- \`HAVING\` sin \`GROUP BY\` evalúa la tabla entera como un solo grupo.
`,
  },
  {
    slug: "having-patrones",
    section,
    kind: "theory",
    title: "Patrones de negocio con HAVING",
    sort_order: 2,
    estimated_minutes: 8,
    is_free: false,
    is_published: true,
    prerequisites: ["having-vs-where"],
    dataset: "pidelo",
    body_md: `## Umbral sobre un volumen

El patrón más común: «solo me interesan los grupos con suficiente masa».

\`\`\`sql
SELECT menu_item_id, sum(quantity) AS unidades
FROM order_items
GROUP BY menu_item_id
HAVING sum(quantity) >= 40
ORDER BY unidades DESC, menu_item_id;
\`\`\`

Fíjate en que el umbral se aplica a \`sum(quantity)\` y no a \`count(*)\`. \`quantity\` es la columna de \`order_items\` con las unidades de ese plato dentro de un pedido, así que un plato puede aparecer en pocos pedidos y aun así vender muchas unidades, porque cada pedido se lleva varias. Contar pedidos y sumar unidades dan rankings diferentes.

## Umbral sobre un promedio, con mínimo de muestra

Un promedio calculado sobre una sola observación no describe nada: es el valor de esa única observación con apariencia de estadística. Por eso los rankings por calificación casi siempre combinan dos condiciones, una sobre el promedio y otra sobre la cantidad de datos que lo respaldan:

\`\`\`sql
SELECT product_id, count(*) AS resenas, round(avg(rating), 2) AS promedio
FROM reviews
GROUP BY product_id
HAVING count(*) >= 5 AND avg(rating) >= 4.4
ORDER BY promedio DESC, resenas DESC, product_id;
\`\`\`

Sin la condición \`count(*) >= 5\`, el primer puesto se lo llevaría cualquier producto con una sola reseña de 5 estrellas. Ese mínimo de reseñas es una decisión de negocio, no una regla de SQL: acuérdalo con quien pide el reporte, escríbelo en la consulta y menciónalo en la entrega.

Cuidado también con el desempate. La columna \`promedio\` sale de \`round(...)\`, que recorta a dos decimales, así que varios productos terminan con el mismo valor. Si ordenas solo por \`promedio\`, esos empates quedan en un orden arbitrario que puede cambiar entre ejecuciones. Agregar \`resenas DESC, product_id\` fija un orden que siempre se reproduce igual.

## Comparar dos agregados entre sí

\`HAVING\` no compara solo contra constantes:

\`\`\`sql
SELECT promotion_id, count(*) AS usos, count(DISTINCT customer_id) AS clientes
FROM orders
WHERE promotion_id IS NOT NULL
GROUP BY promotion_id
HAVING count(*) > count(DISTINCT customer_id);
\`\`\`

Devuelve las promociones en las que hubo más usos que clientes distintos, lo que significa que al menos una persona la usó más de una vez. Es una auditoría completa escrita en una sola condición, y no necesita ninguna consulta previa para saber a quién mirar.

## Agrupar por varias columnas y filtrar la combinación

Si el grupo es un par, el filtro también habla del par:

\`\`\`sql
SELECT promotion_id, customer_id, count(*) AS usos
FROM orders
WHERE promotion_id IS NOT NULL
GROUP BY promotion_id, customer_id
HAVING count(*) >= 3
ORDER BY usos DESC, promotion_id, customer_id;
\`\`\`

Cada fila del resultado dice «esta persona usó esta promoción tantas veces». Para saber si ese número es un abuso o un uso legítimo hay que compararlo con el límite permitido, que está en \`max_uses_per_customer\`, la columna de la tabla \`promotions\` que guarda cuántas veces puede usar cada cliente esa promoción. Traerla exige un join, tema de la sección 17.

## Errores frecuentes

- **Alias en \`HAVING\`.** \`HAVING usos >= 3\` falla porque el alias todavía no existe. Repite la expresión: \`HAVING count(*) >= 3\`.
- **Agregado en \`WHERE\`.** PostgreSQL lo rechaza siempre: es un error de escritura de la consulta y no tiene nada que ver con los datos.
- **Umbral mal ubicado**: filtrar \`status = 'delivered'\` en \`WHERE\` frente a contar todos los estados cambia quién supera el umbral.
- **Esperar grupos vacíos**: \`HAVING count(*) = 0\` nunca devuelve filas, porque un grupo sin filas no se forma.
- **NULL en los agregados**: \`avg(rating)\` ignora los NULL, así que un producto con 5 reseñas y 2 puntajes vacíos promedia sobre 3. Si eso importa, filtra los NULL en \`WHERE\` o usa \`count(rating)\` como mínimo de muestra.

## Resumen

- Umbral de volumen, umbral de promedio con muestra mínima y comparación entre agregados cubren la mayoría de los reportes reales.
- Un ranking con promedios necesita siempre un mínimo de observaciones y un desempate explícito.
- \`HAVING\` solo filtra los grupos que se formaron. Para que aparezcan los grupos vacíos hay que traerlos con un join, no con un umbral.
`,
  },
];
