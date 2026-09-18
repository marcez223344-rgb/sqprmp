import type { LessonDef } from "../schemas/curriculum";

const section = "left-right-full-join";

export const lessons: LessonDef[] = [
  {
    slug: "left-join-basico",
    section,
    kind: "theory",
    title: "LEFT JOIN: conservar lo que no tiene pareja",
    sort_order: 0,
    estimated_minutes: 10,
    is_free: false,
    is_published: true,
    prerequisites: ["inner-join-varias-tablas"],
    dataset: "pidelo",
    body_md: `## Por qué importa

«Clientes que **nunca** pidieron», «promociones que **nadie** usó», «pedidos **sin** calificación». Un INNER JOIN no puede responderlas: descarta justamente las filas sin correspondencia. Los OUTER JOIN las conservan.

## LEFT JOIN

\`\`\`sql
SELECT c.id, c.full_name, o.id AS order_id
FROM customers AS c
LEFT JOIN orders AS o ON o.customer_id = c.id;
\`\`\`

Devuelve **todas** las filas de la tabla izquierda (\`customers\`). Cuando un cliente tiene pedidos, aparece una fila por pedido; cuando no tiene ninguno, aparece **una** fila con las columnas de \`orders\` en **NULL**.

## El patrón «sin correspondencia»

Para quedarte solo con los clientes sin pedidos, filtra los NULL que produjo el JOIN:

\`\`\`sql
SELECT c.id, c.full_name
FROM customers AS c
LEFT JOIN orders AS o ON o.customer_id = c.id
WHERE o.id IS NULL;
\`\`\`

Usa una columna **NOT NULL** de la tabla derecha (la clave primaria es ideal): si es NULL, seguro que no hubo pareja.

## Contar incluyendo ceros

\`\`\`sql
SELECT p.code, count(o.id) AS usos
FROM promotions AS p
LEFT JOIN orders AS o ON o.promotion_id = p.id
GROUP BY p.code
ORDER BY usos DESC;
\`\`\`

\`count(o.id)\` ignora los NULL, así que una promoción sin uso da 0. \`count(*)\` daría 1 (la fila con NULL): es el error clásico.

## La trampa del WHERE

Poner una condición sobre la tabla derecha en \`WHERE\` **convierte el LEFT JOIN en INNER**, porque las filas sin pareja tienen NULL ahí y no pasan el filtro:

\`\`\`sql
-- MAL: pierde los restaurantes sin pedidos en agosto
LEFT JOIN orders AS o ON o.restaurant_id = r.id
WHERE o.placed_at >= '2025-08-01' AND o.placed_at < '2025-09-01'

-- BIEN: la condición viaja en el ON
LEFT JOIN orders AS o
  ON o.restaurant_id = r.id
 AND o.placed_at >= '2025-08-01' AND o.placed_at < '2025-09-01'
\`\`\`

Regla: las condiciones sobre la tabla **derecha** de un LEFT JOIN van en el \`ON\`; las de la tabla izquierda pueden ir en \`WHERE\`.

## Ejemplo resuelto

Pedido: «Pedidos entregados en agosto de 2025 que todavía no tienen calificación».

\`\`\`sql
SELECT o.id, o.placed_at
FROM orders AS o
LEFT JOIN ratings AS r ON r.order_id = o.id
WHERE o.status = 'delivered'
  AND o.placed_at >= '2025-08-01' AND o.placed_at < '2025-09-01'
  AND r.id IS NULL;
\`\`\`

Las condiciones sobre \`orders\` (izquierda) están bien en \`WHERE\`; la única sobre \`ratings\` es la prueba de NULL.
`,
  },
  {
    slug: "right-full-join-y-cardinalidad",
    section,
    kind: "theory",
    title: "RIGHT, FULL y cómo elegir el JOIN",
    sort_order: 1,
    estimated_minutes: 8,
    is_free: false,
    is_published: true,
    prerequisites: ["left-join-basico"],
    dataset: "bolsillo",
    body_md: `## RIGHT JOIN

Es un LEFT JOIN escrito al revés: conserva todas las filas de la tabla **derecha**. Cualquier RIGHT JOIN se puede reescribir como LEFT JOIN cambiando el orden de las tablas, y la mayoría de los equipos prefiere LEFT por consistencia. Reconócelo cuando lo leas; evita escribirlo.

## FULL JOIN

Conserva las filas de **ambas** tablas, con NULL donde falte pareja. Sirve para auditorías de conciliación: «qué hay en A y no en B, y qué hay en B y no en A», en una sola consulta.

\`\`\`sql
SELECT a.id AS account_id, t.id AS transaction_id
FROM accounts AS a
FULL JOIN transactions AS t ON t.account_id = a.id
WHERE a.id IS NULL OR t.id IS NULL;
\`\`\`

En **Bolsillo** esto lista cuentas sin movimientos y movimientos huérfanos (si los hubiera).

## Elegir el JOIN

| Pregunta | JOIN |
| --- | --- |
| Solo lo que coincide | INNER |
| Todo lo de la izquierda, aunque no coincida | LEFT |
| Todo lo de ambas | FULL |
| Lo que **no** coincide | LEFT + \`IS NULL\` (o \`NOT EXISTS\`, sección 21) |

## Cardinalidad, otra vez

Un LEFT JOIN con relación uno-a-muchos también multiplica filas. «Personas con sus tarjetas» devuelve una fila por tarjeta y una fila (con NULL) por persona sin tarjeta. Antes de contar personas, cuenta con \`count(DISTINCT u.id)\` o agrega en una subconsulta.

## Verificar

Después de un LEFT JOIN, la cantidad de filas nunca es menor que la de la tabla izquierda. Si lo es, alguna condición en \`WHERE\` lo convirtió en INNER.

## Ejemplo resuelto

Pedido: «Personas de Uruguay sin ninguna tarjeta emitida».

\`\`\`sql
SELECT u.id, u.full_name
FROM users AS u
LEFT JOIN cards AS c ON c.user_id = u.id
WHERE u.country = 'UY'
  AND c.id IS NULL;
\`\`\`

\`u.country = 'UY'\` es sobre la tabla izquierda: puede ir en \`WHERE\` sin romper el LEFT JOIN.
`,
  },
];
