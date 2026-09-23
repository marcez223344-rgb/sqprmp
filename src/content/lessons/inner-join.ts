import type { LessonDef } from "../schemas/curriculum";

const section = "inner-join";

export const lessons: LessonDef[] = [
  {
    slug: "inner-join-basico",
    section,
    kind: "theory",
    title: "INNER JOIN: combinar dos tablas",
    sort_order: 0,
    estimated_minutes: 11,
    is_free: false,
    is_published: true,
    prerequisites: ["where-filtros-basicos"],
    dataset: "tiendaviva",
    body_md: `## Por qué importa

En una base relacional los datos están repartidos en varias tablas a propósito, para no repetir información. En TiendaViva, la tabla \`products\` guarda el nombre y el precio de cada producto, y la tabla \`sellers\` guarda el nombre de la tienda que lo vende. Si te piden «el catálogo con el nombre de la tienda», ninguna de las dos tablas alcanza por sí sola.

Hasta ahora respondías preguntas que vivían en una sola tabla. La mayoría de las preguntas de negocio reales necesitan datos de dos o más, y la operación que las combina se llama \`JOIN\`. Es la herramienta central del análisis relacional.

## Claves que conectan tablas

\`products.seller_id\` es la columna \`seller_id\` de la tabla \`products\`, y guarda el identificador del vendedor que publicó ese producto. Ese valor es el mismo que aparece en la columna \`id\` de la tabla \`sellers\`. En términos de negocio, esa columna dice: «este producto lo vende esta tienda».

Una columna así se llama **clave foránea** (FK, por *foreign key*, su nombre en inglés): es una columna que guarda el valor de la **clave primaria** de otra tabla (PK, por *primary key*), que es la columna que identifica de forma única cada fila. Un JOIN une cada fila de una tabla con las filas de la otra que cumplen una condición, y esa condición es casi siempre la igualdad entre la clave foránea de una y la clave primaria de la otra.

## La sintaxis

\`\`\`sql
SELECT
  p.id,
  p.name,
  s.store_name
FROM products AS p
INNER JOIN sellers AS s
  ON s.id = p.seller_id;
\`\`\`

- \`FROM products AS p\`: la primera tabla, a la que le damos el alias \`p\`.
- \`INNER JOIN sellers AS s\`: la segunda tabla, con el alias \`s\`.
- \`ON s.id = p.seller_id\`: la condición de unión, que empareja la columna \`id\` de \`sellers\` con la columna \`seller_id\` de \`products\`.

Un **alias de tabla** es un nombre corto que reemplaza al nombre completo dentro de la consulta. Además de ahorrarte escritura, resuelve las ambigüedades: las dos tablas tienen una columna llamada \`id\`, así que si escribes \`id\` a secas PostgreSQL no sabe a cuál te refieres y responde «column reference is ambiguous». Escribe siempre \`alias.columna\`.

\`INNER JOIN\` y \`JOIN\` significan exactamente lo mismo en PostgreSQL. Conviene escribir \`INNER\` mientras aprendes, porque deja explícito qué tipo de unión elegiste.

## Qué filas salen

Un INNER JOIN devuelve **solo las combinaciones de filas que cumplen la condición del \`ON\`**. Todo lo que no encuentra pareja desaparece del resultado, y desaparece en silencio: no hay error ni advertencia.

Dos casos concretos en TiendaViva. Si un producto tuviera un \`seller_id\` que no existe en \`sellers\`, ese producto no aparecería en el catálogo que entregas. Y un vendedor que todavía no publicó ningún producto tampoco aparece, porque no hay ninguna fila de \`products\` con la que emparejarlo. Eso importa para la respuesta de negocio: si te piden «cuántos vendedores tenemos por país», contar sobre un INNER JOIN con \`products\` te va a dar un número más bajo que el real, porque deja afuera a los vendedores sin catálogo.

Cuando necesites conservar esas filas sin pareja, existen los OUTER JOIN, que verás en la sección 18.

## JOIN + WHERE

El \`WHERE\` se aplica después de unir las tablas, y puede usar columnas de cualquiera de las dos:

\`\`\`sql
SELECT p.id, p.name, s.store_name
FROM products AS p
INNER JOIN sellers AS s ON s.id = p.seller_id
WHERE s.country = 'UY';
\`\`\`

## Filas que se multiplican

Si un pedido tiene **dos** pagos registrados, por ejemplo uno rechazado y uno aprobado, entonces \`orders JOIN payments\` devuelve **dos filas** para ese pedido, una por cada pago. No es un error del JOIN: es la consecuencia de que la relación sea uno a muchos, o sea, un pedido puede tener varios pagos.

La consecuencia práctica es que sumar \`orders.total_amount\` sobre ese resultado cuenta el importe del pedido dos veces y el total del reporte queda inflado. Antes de sumar montos en una consulta con JOIN, verifica si la unión multiplicó filas. En este dataset, 1251 pedidos tienen más de un pago.

## Ejemplo resuelto

Pedido: «Productos de vendedores uruguayos, con el nombre de la tienda».

1. Tablas: \`products\` (nombre del producto) y \`sellers\` (nombre de la tienda y país).
2. Conexión: la columna \`seller_id\` de \`products\` contra la columna \`id\` de \`sellers\`.
3. Filtro: la columna \`country\` de \`sellers\` igual a \`'UY'\`.

\`\`\`sql
SELECT p.id, p.name, s.store_name
FROM products AS p
INNER JOIN sellers AS s ON s.id = p.seller_id
WHERE s.country = 'UY';
\`\`\`

## Errores comunes

- Olvidar el \`ON\`. PostgreSQL exige la condición de unión, y con la sintaxis antigua de comas produce un producto cartesiano, es decir, combina cada fila de una tabla con todas las filas de la otra.
- Unir por las columnas equivocadas, como \`ON s.id = p.id\`. El motor no da ningún error y el resultado son filas que emparejan productos con vendedores que no tienen nada que ver.
- Escribir columnas sin el alias de su tabla cuando las dos tablas comparten ese nombre de columna.
`,
  },
  {
    slug: "inner-join-varias-tablas",
    section,
    kind: "theory",
    title: "Encadenar varios JOIN",
    sort_order: 1,
    estimated_minutes: 9,
    is_free: false,
    is_published: true,
    prerequisites: ["inner-join-basico"],
    dataset: "tiendaviva",
    body_md: `## Un JOIN por relación

Una consulta puede unir más de dos tablas, y necesita un \`JOIN\` por cada relación que atraviesa. Para llegar desde el cliente hasta el producto que reseñó hay que pasar por la tabla \`reviews\`, que guarda una fila por reseña con la columna \`customer_id\` (quién la escribió) y la columna \`product_id\` (sobre qué producto). El camino es \`customers → reviews → products\`, y cada flecha es un JOIN:

\`\`\`sql
SELECT
  c.full_name,
  p.name AS product_name,
  r.rating
FROM reviews AS r
INNER JOIN customers AS c ON c.id = r.customer_id
INNER JOIN products AS p ON p.id = r.product_id
WHERE r.rating = 1;
\`\`\`

Empieza por la tabla «central», que es la que tiene las claves foráneas (FK, por *foreign key*) hacia las demás, y agrega un JOIN por cada tabla que necesites. En un INNER JOIN el orden en que escribes los JOIN no cambia el resultado, así que elige el orden que se lea mejor.

## La misma tabla dos veces

La tabla \`categories\` se referencia a sí misma: su columna \`parent_id\` guarda el \`id\` de otra fila de \`categories\`, que es la categoría padre. Así se representa que «Zapatillas» está dentro de «Calzado».

Para mostrar en la misma fila la subcategoría y su categoría padre necesitas unir \`categories\` dos veces, y darle a cada copia un **alias distinto**:

\`\`\`sql
SELECT
  p.name,
  sub.name AS subcategoria,
  raiz.name AS categoria
FROM products AS p
INNER JOIN categories AS sub  ON sub.id = p.category_id
INNER JOIN categories AS raiz ON raiz.id = sub.parent_id;
\`\`\`

Sin alias distintos, PostgreSQL no tiene forma de saber a cuál de las dos copias de \`categories\` te refieres en cada columna. Este patrón se llama self join, o autounión, y tiene su propia sección (19).

## Elegir columnas con criterio

Con tres tablas unidas, \`SELECT *\` devuelve decenas de columnas, y varias se llaman igual porque cada tabla tiene su \`id\`, su \`name\` y su \`created_at\`. Quien lea el resultado no puede saber de qué tabla vino cada una. Escribe la lista de columnas que necesitas y ponles un alias cuando el nombre se repita.

## Verificar el resultado

Después de un JOIN múltiple, compara la cantidad de filas que obtuviste con la que esperabas. Pregúntate qué representa una fila del resultado: ¿una reseña?, ¿un producto? Si obtuviste más filas de las que esperabas, alguna de las relaciones es uno a muchos y multiplicó filas, y cualquier suma o conteo sobre ese resultado va a estar inflado.

## Ejemplo resuelto

Pedido: «Pedidos en pesos argentinos pagados en 12 cuotas y aprobados, con el monto del pago».

\`\`\`sql
SELECT o.id, o.total_amount, pay.amount
FROM orders AS o
INNER JOIN payments AS pay ON pay.order_id = o.id
WHERE o.currency = 'ARS'
  AND pay.installments = 12
  AND pay.status = 'approved';
\`\`\`

Un pedido con dos intentos de pago aprobados aparecería dos veces en el resultado. En este dataset eso no ocurre, y además el filtro \`pay.status = 'approved'\` reduce la relación a un pago aprobado por pedido.
`,
  },
];
