import type { LessonDef } from "../schemas/curriculum";

const section = "joins-multiples-tablas";

export const lessons: LessonDef[] = [
  {
    slug: "planificar-el-camino-de-joins",
    section,
    kind: "theory",
    title: "Planificar el camino entre tablas",
    sort_order: 0,
    estimated_minutes: 11,
    is_free: false,
    is_published: true,
    prerequisites: ["right-full-join-y-cardinalidad"],
    dataset: "tiendaviva",
    body_md: `## Por qué importa

Ya sabes unir dos tablas. Las preguntas reales suelen necesitar tres, cuatro o cinco: «unidades vendidas por tienda y categoría», «bebidas pedidas por ciudad». Ninguna tabla guarda todas esas columnas juntas, así que hay que recorrer un **camino**: una secuencia de tablas conectadas entre sí por sus claves, desde la que tiene el dato que ya conoces hasta la que tiene el dato que te falta.

## Dibuja el camino antes de escribir

En TiendaViva, para llegar del vendedor a la línea de pedido el camino es:

\`sellers → products → order_items → orders\`

Cada flecha es una clave foránea (FK, por *foreign key*) que ya existe en el modelo:

- \`products.seller_id\` es la columna \`seller_id\` de la tabla \`products\` y apunta a la columna \`id\` de la tabla \`sellers\`: dice qué vendedor publicó ese producto.
- \`order_items.product_id\` es la columna \`product_id\` de la tabla \`order_items\` y apunta a la columna \`id\` de la tabla \`products\`: dice qué producto se vendió en esa línea del pedido.
- \`order_items.order_id\` es la columna \`order_id\` de la tabla \`order_items\` y apunta a la columna \`id\` de la tabla \`orders\`: dice a qué pedido pertenece esa línea.

Escribe el camino completo en una línea antes de tocar el teclado; después, cada flecha se convierte en un \`INNER JOIN ... ON\`.

Si no encuentras una flecha entre dos tablas, no puedes unirlas directamente porque falta una tabla intermedia. \`sellers\` y \`orders\` no comparten ninguna columna que las relacione: se comunican a través de \`products\` y \`order_items\`.

## La tabla conductora

La **tabla conductora** es la que escribes en el \`FROM\`, la primera de la cadena. No cambia el resultado, pero sí cambia cómo se lee la consulta: «parto de las líneas de pedido y les voy agregando información» se entiende distinto que «parto de los vendedores y busco sus ventas», aunque las dos versiones devuelvan exactamente las mismas filas.

Dos criterios prácticos:

1. Empieza por la tabla que define el **grano** del resultado, es decir, qué representa cada fila de la salida: una línea de pedido, un pedido completo o un cliente.
2. O empieza por la tabla que llevará el filtro más restrictivo; se lee mejor tener el \`WHERE\` cerca de la tabla que filtra.

\`\`\`sql
SELECT
  o.id        AS order_id,
  s.store_name,
  p.name      AS product_name,
  oi.quantity
FROM orders AS o
INNER JOIN order_items AS oi ON oi.order_id = o.id
INNER JOIN products    AS p  ON p.id = oi.product_id
INNER JOIN sellers     AS s  ON s.id = p.seller_id
WHERE s.country = 'UY'
  AND o.created_at >= '2025-08-01'
  AND o.created_at <  '2025-09-01';
\`\`\`

Las mismas cuatro tablas, empezando por \`sellers\`, dan **exactamente las mismas 68 filas**:

\`\`\`sql
FROM sellers AS s
INNER JOIN products    AS p  ON p.seller_id = s.id
INNER JOIN order_items AS oi ON oi.product_id = p.id
INNER JOIN orders      AS o  ON o.id = oi.order_id
\`\`\`

## El orden no cambia el resultado (con INNER)

Cuando todas las uniones son \`INNER JOIN\`, reordenarlas **no** cambia el conjunto de filas que sale. La unión interna es conmutativa y asociativa: da lo mismo cuál tabla pongas primero y cómo agrupes las uniones entre sí. Además, el planificador de PostgreSQL —el componente que decide cómo ejecutar la consulta— elige su propio orden de ejecución sin importar el orden en que la escribiste.

Lo que sí cambia es la legibilidad. Una regla que funciona: **cada tabla nueva se une a algo que ya está arriba**. Si el \`ON\` de la cuarta tabla menciona una tabla que aparece dos líneas más abajo, reordena.

Con un \`LEFT JOIN\` en el medio, el orden **sí** importa: eso es la lección siguiente.

## Claves que no son la primaria

Un \`ON\` no está obligado a usar claves primarias. Es válido —y a veces necesario— unir por otra columna:

\`\`\`sql
-- Productos y pedidos que comparten moneda (no hay clave foránea entre ellos)
INNER JOIN orders AS o ON o.currency = p.currency
\`\`\`

Cuidado con esto: si el valor de esa columna se repite en las dos tablas, la unión combina cada fila de un lado con cada fila del otro y devuelve muchas más filas de las que corresponde, sin ningún mensaje de error. Antes de unir por una columna que no es clave, verifica que sus valores no se repitan al menos en una de las dos tablas.

También puedes unir por más de una columna (\`ON a.city = b.city AND a.day = b.day\`) o agregar condiciones fijas al \`ON\` (\`AND pay.status = 'approved'\`).

## Alias y formato

Con cuatro tablas los alias dejan de ser una comodidad y pasan a ser necesarios. Un **alias** es un nombre corto que le das a una tabla dentro de la consulta (\`orders AS o\`) para después referirte a sus columnas como \`o.id\`. Hace falta porque columnas como \`id\`, \`name\` y \`created_at\` existen en casi todas las tablas y, sin alias, el motor no sabe a cuál te refieres. Usa alias cortos y estables (\`o\`, \`oi\`, \`p\`, \`s\`), alinea los \`ON\` y escribe una tabla por línea: la consulta queda legible para quien la revise, incluido tú dentro de un mes.

## Resumen

- Escribe el camino de tablas antes que el SQL; cada flecha es un JOIN.
- La tabla conductora define cómo se lee la consulta, no el resultado.
- Con INNER JOIN el orden es libre; elige el más legible.
`,
  },
  {
    slug: "mezclar-inner-y-left",
    section,
    kind: "theory",
    title: "Mezclar INNER y LEFT en una misma consulta",
    sort_order: 1,
    estimated_minutes: 10,
    is_free: false,
    is_published: true,
    prerequisites: ["planificar-el-camino-de-joins"],
    dataset: "tiendaviva",
    body_md: `## Una cadena con dos tipos de unión

Casi todo reporte real mezcla los dos tipos de unión que ya conoces. Hay tablas **obligatorias**, sin las cuales la fila no tiene sentido (un pedido siempre tiene cliente, un producto siempre tiene vendedor), y tablas **opcionales**, que aportan un dato que puede no existir (la devolución, la reseña, la calificación). Para las primeras se usa \`INNER JOIN\`, que descarta la fila si no encuentra pareja; para las segundas, \`LEFT JOIN\`, que conserva la fila y deja en NULL las columnas de la tabla que faltó.

\`\`\`sql
SELECT o.id AS order_id, c.full_name, sh.carrier, sh.delivered_at, r.refund_amount
FROM orders AS o
INNER JOIN customers AS c  ON c.id = o.customer_id
INNER JOIN shipments AS sh ON sh.order_id = o.id
LEFT  JOIN returns   AS r  ON r.order_id = o.id
WHERE c.country = 'PE'
  AND o.status IN ('delivered', 'returned');
\`\`\`

Regla de lectura: **INNER cuando la fila no tiene sentido sin la otra tabla; LEFT cuando la otra tabla es un dato extra que puede faltar.**

## Aquí el orden sí importa

Con un \`LEFT JOIN\`, la consulta se evalúa por pasos, y «la izquierda» no es la tabla del \`FROM\` sino el resultado acumulado hasta ese punto de la cadena. De ahí salen dos consecuencias:

- Un \`INNER JOIN\` escrito **después** de un LEFT JOIN, si su \`ON\` apunta a la tabla opcional, elimina las filas sin pareja: el LEFT queda anulado.
- Un \`LEFT JOIN\` cuyo \`ON\` apunta a una tabla que ya había llegado por otro \`LEFT JOIN\` encadena dos opcionalidades: cuando falta la primera tabla, la segunda tampoco encuentra pareja. Revisa qué valores quedan en esas filas antes de darlas por buenas.

Ubica los LEFT JOIN al final de la cadena siempre que puedas: primero el esqueleto obligatorio, después los agregados opcionales.

## La trampa del WHERE, ahora en cadena

Ya la viste con dos tablas: si escribes en el \`WHERE\` una condición sobre la tabla derecha, la opcional, el \`LEFT JOIN\` pasa a comportarse como un \`INNER JOIN\` y pierdes las filas que no tenían pareja. Ocurre porque en esas filas las columnas de la tabla derecha valen NULL, y una comparación como \`NULL = 'algo'\` nunca da verdadero.

\`\`\`sql
-- MAL: quedan solo los 336 pedidos que sí tienen una devolución por daño
FROM orders AS o
LEFT JOIN returns AS r ON r.order_id = o.id
WHERE r.reason = 'damaged'

-- BIEN: los 18 000 pedidos; la condición viaja al ON
FROM orders AS o
LEFT JOIN returns AS r
  ON r.order_id = o.id
 AND r.reason = 'damaged'
\`\`\`

En una consulta de cinco tablas esto es más difícil de ver, porque el \`WHERE\` está lejos del \`ON\`. Truco de revisión: para cada condición del \`WHERE\`, pregúntate de qué tabla es y si esa tabla entró por un LEFT JOIN. Si es así, muévela al \`ON\`… salvo que sea exactamente lo que quieres (\`r.id IS NULL\` para «sin devolución» es la excepción deliberada).

## INNER: ON o WHERE dan lo mismo

En un INNER JOIN, poner \`pay.status = 'approved'\` en el \`ON\` o en el \`WHERE\` produce el mismo resultado. Muchos equipos prefieren el \`ON\` para las condiciones que definen **qué fila se une** y el \`WHERE\` para las que filtran el reporte. Es una convención de legibilidad, no una regla del motor.

Esa equivalencia existe **solo** con \`INNER JOIN\`. En un \`LEFT JOIN\`, poner la misma condición en el \`ON\` o en el \`WHERE\` devuelve resultados distintos, como acabas de ver.

## Verificar

Después de escribir la cadena, cuenta filas:

- Si esperabas una fila por pedido y tienes más, algo se multiplicó (lección siguiente).
- Si tienes menos que la tabla conductora filtrada, un LEFT se convirtió en INNER o un INNER descartó filas sin pareja.

Comparar el \`count(*)\` del resultado contra la cantidad de filas de la tabla conductora ya filtrada es la verificación más rápida que puedes hacer, y detecta la mayoría de los errores de una cadena de joins.

## Resumen

- INNER para lo obligatorio, LEFT para lo opcional; los LEFT al final de la cadena.
- Con LEFT, las condiciones sobre la tabla derecha van en el \`ON\`.
- Con INNER, \`ON\` y \`WHERE\` son equivalentes: elige por claridad.
`,
  },
  {
    slug: "duplicacion-de-filas-en-cadenas",
    section,
    kind: "theory",
    title: "Cuando la cadena duplica filas",
    sort_order: 2,
    estimated_minutes: 11,
    is_free: false,
    is_published: true,
    prerequisites: ["mezclar-inner-y-left"],
    dataset: "tiendaviva",
    body_md: `## El error más caro del análisis

Una consulta que suma de más no da error: se ejecuta sin problemas y devuelve un número creíble pero equivocado, que nadie detecta hasta que alguien audita el reporte. En TiendaViva, los pedidos entregados de clientes de Chile en agosto de 2025 suman **21 513 788 CLP**. Si unes esos mismos pedidos con \`order_items\` y sumas \`o.total_amount\`, el resultado es **47 823 913 CLP**: más del doble, porque los 80 pedidos se convirtieron en 134 líneas y cada total se contó una vez por línea.

## Por qué pasa

En una relación uno a muchos —un pedido tiene muchas líneas, pero cada línea pertenece a un solo pedido— la tabla \`orders\` es el lado «uno» y \`order_items\` el lado «muchos». Al unirlas, el JOIN **repite** cada fila del lado «uno» una vez por cada fila que le corresponde del lado «muchos». Un pedido con tres ítems aparece tres veces, y en cada copia \`total_amount\` —la columna \`total_amount\` de la tabla \`orders\`, el importe total del pedido— sigue teniendo el mismo valor. Sumar esa columna cuenta el mismo importe tres veces.

Regla: **una columna del lado «uno» no se puede sumar ni promediar después de haberla unido con el lado «muchos»**, porque sus valores quedaron repetidos.

## Dos veces uno-a-muchos: multiplicación

Peor todavía cuando cuelgan dos relaciones uno-a-muchos del mismo pedido:

\`\`\`sql
FROM orders AS o
INNER JOIN order_items AS oi ON oi.order_id = o.id   -- 3 ítems
INNER JOIN payments    AS pay ON pay.order_id = o.id  -- 2 intentos de pago
\`\`\`

El resultado no es 3 + 2 = 5 filas, es 3 × 2 = **6**: cada ítem se combina con cada pago. En este dataset hay 1251 pedidos con más de un intento de pago, así que esta trampa no es teórica; se dispara en cuanto unes las dos tablas.

## Cómo evitarla

**1. Filtra la relación hasta volverla uno-a-uno.** Un pedido tiene varios pagos, pero como máximo un pago aprobado:

\`\`\`sql
INNER JOIN payments AS pay
  ON pay.order_id = o.id
 AND pay.status = 'approved'
\`\`\`

Con ese \`AND\`, la multiplicación desaparece y \`sum(oi.quantity)\` vuelve a ser correcto.

**2. Cuenta con \`DISTINCT\`.** Si necesitas «cuántos pedidos» dentro de una consulta que se multiplicó, \`count(o.id)\` cuenta líneas, no pedidos:

\`\`\`sql
SELECT s.store_name,
       count(DISTINCT o.id) AS pedidos,
       sum(oi.quantity)     AS unidades
FROM orders AS o
INNER JOIN order_items AS oi ON oi.order_id = o.id
INNER JOIN products    AS p  ON p.id = oi.product_id
INNER JOIN sellers     AS s  ON s.id = p.seller_id
WHERE s.country = 'AR'
GROUP BY s.store_name;
\`\`\`

\`sum(oi.quantity)\` está bien (es del lado «muchos»); \`count(DISTINCT o.id)\` corrige el conteo del lado «uno».

**3. Agrega antes de unir.** La solución general es calcular cada agregación en su propia consulta y unir los resultados ya resumidos. Eso se hace con subconsultas o CTE (secciones 21 y 23); por ahora quédate con las dos primeras técnicas.

## Diagnóstico rápido

1. ¿Cuántas filas debería tener el resultado? Dilo en voz alta: «una por línea de pedido».
2. Ejecuta \`count(*)\` y compáralo con \`count(DISTINCT o.id)\`. Si difieren, la consulta está al nivel de detalle del lado «muchos».
3. Revisa cada \`sum()\`: ¿la columna pertenece a la tabla más detallada de la consulta? Si no, sospecha.

## Resumen

- Un JOIN uno-a-muchos repite filas; sumar columnas del lado «uno» infla el total.
- Dos relaciones uno-a-muchos se multiplican entre sí (3 × 2 = 6 filas).
- Filtra la relación hasta hacerla única, o usa \`count(DISTINCT ...)\`.
`,
  },
];
