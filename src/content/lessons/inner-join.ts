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

Los datos útiles están repartidos: \`products\` tiene el nombre del producto y \`sellers\` el de la tienda. Hasta ahora respondías preguntas sobre una tabla; la mayoría de las preguntas reales cruzan dos o más. \`JOIN\` es la herramienta central del análisis relacional.

## Claves que conectan tablas

\`products.seller_id\` guarda el \`id\` del vendedor. Esa columna es una **clave foránea**: apunta a la **clave primaria** de \`sellers\`. Un JOIN une cada fila de una tabla con las filas de la otra que cumplen una condición, casi siempre la igualdad entre esas claves.

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

- \`FROM products AS p\`: la primera tabla, con alias \`p\`.
- \`INNER JOIN sellers AS s\`: la segunda, con alias \`s\`.
- \`ON s.id = p.seller_id\`: la condición de unión.

Los alias de tabla evitan escribir el nombre completo y **resuelven ambigüedades**: ambas tablas tienen \`id\`, así que \`id\` a secas produce «column reference is ambiguous». Escribe siempre \`alias.columna\`.

\`INNER JOIN\` y \`JOIN\` son sinónimos. \`INNER\` es explícito y se recomienda mientras aprendes.

## Qué filas salen

Un INNER JOIN devuelve **solo las combinaciones que cumplen la condición**. Un producto cuyo \`seller_id\` no exista en \`sellers\` desaparecería del resultado; un vendedor sin productos tampoco aparece. Para conservar filas «huérfanas» existen los OUTER JOIN (sección 18).

## JOIN + WHERE

El \`WHERE\` se aplica después de unir, y puede usar columnas de cualquiera de las dos tablas:

\`\`\`sql
SELECT p.id, p.name, s.store_name
FROM products AS p
INNER JOIN sellers AS s ON s.id = p.seller_id
WHERE s.country = 'UY';
\`\`\`

## Filas que se multiplican

Si un pedido tiene **dos** pagos (uno rechazado y uno aprobado), \`orders JOIN payments\` devuelve **dos filas** para ese pedido. No es un error del JOIN: es la relación uno-a-muchos. Antes de sumar montos de \`orders\` en una consulta con JOIN, pregúntate si la unión duplicó filas. En este dataset, 2502 pedidos tienen más de un pago.

## Ejemplo resuelto

Pedido: «Productos de vendedores uruguayos, con el nombre de la tienda».

1. Tablas: \`products\` (nombre) y \`sellers\` (tienda, país).
2. Conexión: \`products.seller_id = sellers.id\`.
3. Filtro: \`sellers.country = 'UY'\`.

\`\`\`sql
SELECT p.id, p.name, s.store_name
FROM products AS p
INNER JOIN sellers AS s ON s.id = p.seller_id
WHERE s.country = 'UY';
\`\`\`

## Errores comunes

- Olvidar el \`ON\`: PostgreSQL exige la condición (o produce un producto cartesiano con la sintaxis antigua de comas).
- Unir por columnas equivocadas (\`ON s.id = p.id\`): filas sin sentido, sin error.
- Referenciar columnas sin alias en tablas que comparten nombres.
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

Para llegar del cliente al producto que reseñó hay que pasar por \`reviews\`: \`customers → reviews → products\`. Cada flecha es un JOIN:

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

Empieza por la tabla «central» (la que tiene las claves foráneas) y agrega un JOIN por cada tabla que necesites. El orden de los JOIN no cambia el resultado de un INNER JOIN; elige el que se lea mejor.

## La misma tabla dos veces

\`categories\` se referencia a sí misma: \`parent_id\` apunta a otra categoría. Para mostrar la subcategoría y su padre, únela dos veces con **alias distintos**:

\`\`\`sql
SELECT
  p.name,
  sub.name AS subcategoria,
  raiz.name AS categoria
FROM products AS p
INNER JOIN categories AS sub  ON sub.id = p.category_id
INNER JOIN categories AS raiz ON raiz.id = sub.parent_id;
\`\`\`

Sin alias distintos, PostgreSQL no puede saber a cuál \`categories\` te refieres. Este patrón se llama self join y tiene su sección (19).

## Elegir columnas con criterio

Con tres tablas, \`SELECT *\` devuelve decenas de columnas, varias con el mismo nombre (\`id\`, \`name\`, \`created_at\`). Lista las columnas y ponles alias cuando el nombre se repita.

## Verificar el resultado

Después de un JOIN múltiple, comprueba el número de filas contra lo que esperas: ¿hay una fila por reseña? ¿por producto? Si hay más, alguna relación es uno-a-muchos y multiplicó filas.

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

Un pedido con dos intentos de pago aprobados (no ocurre aquí) aparecería dos veces; \`WHERE pay.status = 'approved'\` acota la relación a un pago por pedido.
`,
  },
];
