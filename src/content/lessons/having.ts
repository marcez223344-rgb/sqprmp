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

Con \`GROUP BY\` ya sabes responder «pedidos por restaurante». La pregunta que sigue casi siempre es otra: «¿qué restaurantes superaron los 60 pedidos entregados?». Eso no se filtra con \`WHERE\`: el número que quieres comparar todavía no existe cuando \`WHERE\` se ejecuta. Para eso está \`HAVING\`.

## El concepto

\`HAVING\` es el filtro que se aplica **a los grupos ya calculados**, después de \`GROUP BY\`.

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

Los 400 restaurantes se convierten en 400 grupos y \`HAVING\` deja 12. Sin \`HAVING\` tendrías que exportar las 400 filas y filtrar a mano en una planilla.

## Por qué WHERE no puede hacerlo

\`\`\`sql
SELECT restaurant_id, count(*)
FROM orders
WHERE count(*) >= 60     -- error
GROUP BY restaurant_id;
\`\`\`

PostgreSQL responde: *aggregate functions are not allowed in WHERE*. No es una restricción arbitraria. Cuando \`WHERE\` evalúa una fila, los grupos todavía no se formaron y \`count(*)\` no tiene ningún valor que devolver. \`HAVING\` corre más tarde, cuando cada grupo ya tiene sus agregados calculados.

## Los alias no funcionan en HAVING

\`\`\`sql
SELECT restaurant_id, count(*) AS entregados
FROM orders
GROUP BY restaurant_id
HAVING entregados >= 60;   -- column "entregados" does not exist
\`\`\`

\`GROUP BY\` y \`ORDER BY\` sí aceptan el alias del \`SELECT\`; \`HAVING\` no, porque se evalúa antes de que la lista del \`SELECT\` se materialice. Repite la expresión completa: \`HAVING count(*) >= 60\`. Es la fuente de error más frecuente al empezar.

## Qué puede ir en HAVING

Cualquier expresión que tenga sentido **por grupo**:

- un agregado: \`HAVING sum(total) > 100000\`
- varios agregados combinados: \`HAVING count(*) > count(DISTINCT customer_id)\`
- una columna del \`GROUP BY\`: \`HAVING payment_method <> 'cash'\` (válido, aunque ese filtro pertenece a \`WHERE\`)

Lo que **no** puede ir es una columna que no esté agrupada ni agregada: el motor no sabría qué valor del grupo usar.

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

- \`WHERE\` filtra filas antes de agrupar; \`HAVING\` filtra grupos después de agregar.
- En \`HAVING\` repites la expresión agregada, nunca su alias.
- Un agregado dentro de \`WHERE\` siempre es un error de sintaxis, no un problema de datos.
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

No compiten: se complementan. Es habitual usar las dos.

\`\`\`sql
SELECT category_id, count(*) AS productos
FROM products
WHERE is_active
GROUP BY category_id
HAVING count(*) >= 60
ORDER BY productos DESC, category_id;
\`\`\`

\`WHERE is_active\` define **qué filas entran** al conteo; \`HAVING count(*) >= 60\` define **qué categorías salen** en el reporte. Si movieras \`is_active\` a \`HAVING\`, el motor rechazaría la consulta (columna no agrupada); si intentaras el conteo en \`WHERE\`, también.

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

En A, un cliente con 10 pedidos cancelados y 2 entregados **no aparece**. En B sí, con \`entregados = 2\`. Ninguna es «la correcta»: responden preguntas distintas. Antes de escribir, define si el umbral se aplica al universo filtrado o al universo completo.

## Rendimiento y legibilidad

\`WHERE\` reduce el volumen **antes** de agrupar, así que el motor trabaja con menos filas. Cuando una condición puede ir en \`WHERE\`, ponla ahí: es más rápida y más clara. \`HAVING\` debería contener solo condiciones sobre agregados.

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

Devuelve una fila si hay más de 10 000 entregas y **cero filas** si no. Es poco frecuente, pero aparece en alertas y controles de calidad: «devuélveme algo solo si el umbral se rompió».

## Grupos que nunca existieron

\`HAVING\` filtra grupos que existen; no inventa los que faltan. Una categoría sin productos activos no produce un grupo con \`count(*) = 0\`: directamente no aparece. Para listar «categorías con menos de 5 productos, incluyendo las que tienen cero» necesitas un \`LEFT JOIN\` desde \`categories\` (sección 18).

## Resumen

- Condición sobre una fila → \`WHERE\`; condición sobre un agregado → \`HAVING\`.
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

Nota que el umbral se aplica a \`sum(quantity)\`, no a \`count(*)\`: un plato puede aparecer en pocos pedidos y vender muchas unidades.

## Umbral sobre un promedio, con mínimo de muestra

Un promedio calculado sobre una sola observación no es un promedio, es una anécdota. Por eso los rankings por calificación casi siempre combinan dos condiciones:

\`\`\`sql
SELECT product_id, count(*) AS resenas, round(avg(rating), 2) AS promedio
FROM reviews
GROUP BY product_id
HAVING count(*) >= 5 AND avg(rating) >= 4.4
ORDER BY promedio DESC, resenas DESC, product_id;
\`\`\`

Sin \`count(*) >= 5\`, el primer puesto se lo llevaría cualquier producto con una única reseña de 5 estrellas. El mínimo de muestra es una decisión de negocio: escríbela explícitamente y documéntala.

Cuidado con el desempate: \`promedio\` proviene de \`round(...)\`, así que hay empates reales. Agregar \`resenas DESC, product_id\` hace que el orden sea reproducible.

## Comparar dos agregados entre sí

\`HAVING\` no compara solo contra constantes:

\`\`\`sql
SELECT promotion_id, count(*) AS usos, count(DISTINCT customer_id) AS clientes
FROM orders
WHERE promotion_id IS NOT NULL
GROUP BY promotion_id
HAVING count(*) > count(DISTINCT customer_id);
\`\`\`

Devuelve las promociones donde hubo más usos que clientes distintos: alguien la usó más de una vez. Es una auditoría de una línea.

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

Cada fila es «esta persona usó esta promoción tantas veces». Con el tope declarado en \`promotions.max_uses_per_customer\` podrías separar el abuso real del uso legítimo (necesitas un join, sección 17).

## Errores frecuentes

- **Alias en \`HAVING\`**: \`HAVING usos >= 3\` falla; repite \`count(*) >= 3\`.
- **Agregado en \`WHERE\`**: error de sintaxis, no de datos.
- **Umbral mal ubicado**: filtrar \`status = 'delivered'\` en \`WHERE\` frente a contar todos los estados cambia quién supera el umbral.
- **Esperar grupos vacíos**: \`HAVING count(*) = 0\` nunca devuelve filas, porque un grupo sin filas no se forma.
- **NULL en los agregados**: \`avg(rating)\` ignora los NULL, así que un producto con 5 reseñas y 2 puntajes vacíos promedia sobre 3. Si eso importa, filtra los NULL en \`WHERE\` o usa \`count(rating)\` como mínimo de muestra.

## Resumen

- Umbral de volumen, umbral de promedio con muestra mínima y comparación entre agregados cubren la mayoría de los reportes reales.
- Un ranking con promedios necesita siempre un mínimo de observaciones y un desempate explícito.
- \`HAVING\` filtra lo que existe: los grupos vacíos se resuelven con joins, no con umbrales.
`,
  },
];
