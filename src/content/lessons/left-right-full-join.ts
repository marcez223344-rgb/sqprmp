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

Hay una familia de preguntas de negocio que se trata justamente de lo que **no** pasó: «clientes que nunca pidieron», «promociones que nadie usó», «pedidos entregados sin calificación». Son las preguntas que alimentan una campaña de reactivación o una revisión de calidad.

Un INNER JOIN no puede responderlas. Un INNER JOIN devuelve solo las filas que encuentran pareja en la otra tabla, así que un cliente sin ningún pedido desaparece del resultado, que es exactamente el cliente que querías listar. Los OUTER JOIN existen para conservar esas filas sin pareja, y el más usado de los tres es \`LEFT JOIN\`.

## LEFT JOIN

\`\`\`sql
SELECT c.id, c.full_name, o.id AS order_id
FROM customers AS c
LEFT JOIN orders AS o ON o.customer_id = c.id;
\`\`\`

La condición \`ON o.customer_id = c.id\` empareja la columna \`customer_id\` de la tabla \`orders\` —que guarda quién hizo cada pedido— con la columna \`id\` de la tabla \`customers\`.

\`LEFT JOIN\` devuelve **todas** las filas de la tabla de la izquierda, que es la que está en el \`FROM\`, en este caso \`customers\`. Cuando un cliente tiene pedidos, aparece una fila por cada pedido. Cuando un cliente no tiene ninguno, aparece igual, en **una** fila, y las columnas que vienen de \`orders\` traen **NULL**, es decir, el marcador de «no hay valor».

## El patrón «sin correspondencia»

Como las filas sin pareja son las únicas que traen NULL en las columnas de la tabla derecha, filtrar por ese NULL te deja exactamente los clientes que nunca pidieron:

\`\`\`sql
SELECT c.id, c.full_name
FROM customers AS c
LEFT JOIN orders AS o ON o.customer_id = c.id
WHERE o.id IS NULL;
\`\`\`

Para esa prueba elige una columna de la tabla derecha que nunca pueda ser NULL en los datos reales; la clave primaria (PK, por *primary key*, su nombre en inglés) es la mejor opción. Así, si ves un NULL ahí, la única explicación posible es que no hubo pareja.

## Contar incluyendo ceros

\`\`\`sql
SELECT p.code, count(o.id) AS usos
FROM promotions AS p
LEFT JOIN orders AS o ON o.promotion_id = p.id
GROUP BY p.code
ORDER BY usos DESC;
\`\`\`

\`count(o.id)\` cuenta solo los valores que no son NULL, así que una promoción que nadie usó da 0, que es la respuesta correcta. Si escribieras \`count(*)\` obtendrías 1 para esa promoción, porque \`count(*)\` cuenta filas y la fila con NULL sigue siendo una fila. Es el error clásico de este patrón, y produce un reporte donde toda promoción parece haberse usado al menos una vez.

## La trampa del WHERE

Si pones una condición sobre una columna de la tabla derecha en el \`WHERE\`, el LEFT JOIN se comporta como un INNER JOIN y vuelves a perder las filas sin pareja. La razón es que esas filas traen NULL en la columna que estás filtrando, y una comparación contra NULL nunca da verdadero, así que no pasan el filtro:

\`\`\`sql
-- MAL: pierde los restaurantes sin pedidos en agosto
LEFT JOIN orders AS o ON o.restaurant_id = r.id
WHERE o.placed_at >= '2025-08-01' AND o.placed_at < '2025-09-01'

-- BIEN: la condición viaja en el ON
LEFT JOIN orders AS o
  ON o.restaurant_id = r.id
 AND o.placed_at >= '2025-08-01' AND o.placed_at < '2025-09-01'
\`\`\`

La diferencia es cuándo se aplica la condición. En el \`ON\` se usa para decidir qué filas de \`orders\` se emparejan, y los restaurantes sin pedidos de agosto quedan igual en el resultado con NULL. En el \`WHERE\` se aplica después de unir y los elimina.

La regla práctica: las condiciones sobre la tabla **derecha** de un LEFT JOIN van en el \`ON\`, y las condiciones sobre la tabla izquierda pueden ir en el \`WHERE\` sin problema.

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

Las dos condiciones sobre \`orders\`, que es la tabla izquierda, están bien en el \`WHERE\`. La única condición sobre \`ratings\` es la prueba de NULL, que es justamente la que necesita que el LEFT JOIN ya se haya aplicado.
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

\`RIGHT JOIN\` es un LEFT JOIN escrito al revés: conserva todas las filas de la tabla **derecha**, la que está después del \`JOIN\`, y completa con NULL cuando no encuentra pareja en la izquierda. Cualquier RIGHT JOIN se puede reescribir como LEFT JOIN intercambiando el orden de las dos tablas, y la mayoría de los equipos prefiere escribir siempre LEFT para no tener que cambiar de dirección mentalmente al leer. Necesitas reconocerlo cuando lo encuentres en código de otra persona, pero no hace falta que lo escribas.

## FULL JOIN

\`FULL JOIN\` conserva las filas de **ambas** tablas y pone NULL del lado donde falta la pareja. Sirve para las auditorías de conciliación, donde la pregunta es «qué hay en A que no está en B, y qué hay en B que no está en A», y quieres las dos respuestas en una sola consulta.

\`\`\`sql
SELECT a.id AS account_id, t.id AS transaction_id
FROM accounts AS a
FULL JOIN transactions AS t ON t.account_id = a.id
WHERE a.id IS NULL OR t.id IS NULL;
\`\`\`

En **Bolsillo**, la billetera digital, esta consulta lista dos cosas a la vez: las cuentas que no tienen ningún movimiento y los movimientos huérfanos, es decir, los que apuntan a una cuenta que no existe, si los hubiera.

## Elegir el JOIN

| Pregunta | JOIN |
| --- | --- |
| Solo lo que coincide | INNER |
| Todo lo de la izquierda, aunque no coincida | LEFT |
| Todo lo de ambas | FULL |
| Lo que **no** coincide | LEFT + \`IS NULL\` (o \`NOT EXISTS\`, sección 21) |

## Cardinalidad, otra vez

Un LEFT JOIN también multiplica filas cuando la relación es uno a muchos, o sea, cuando una fila de la izquierda puede emparejarse con varias de la derecha. Si unes personas con sus tarjetas, obtienes una fila por cada tarjeta, así que alguien con tres tarjetas aparece tres veces, y una fila con NULL por cada persona sin ninguna tarjeta.

La consecuencia es que \`count(*)\` sobre ese resultado cuenta tarjetas, no personas, y el reporte va a decir que tienes más clientes de los que tienes. Para contar personas usa \`count(DISTINCT u.id)\`, que cuenta identificadores distintos, o agrega primero en una subconsulta y después une.

## Verificar

Después de un LEFT JOIN, la cantidad de filas del resultado nunca puede ser menor que la cantidad de filas de la tabla izquierda. Si te da menos, alguna condición del \`WHERE\` sobre la tabla derecha lo convirtió en un INNER JOIN y estás perdiendo filas sin darte cuenta. Es una verificación de diez segundos que conviene hacer siempre.

## Ejemplo resuelto

Pedido: «Personas de Uruguay sin ninguna tarjeta emitida».

\`\`\`sql
SELECT u.id, u.full_name
FROM users AS u
LEFT JOIN cards AS c ON c.user_id = u.id
WHERE u.country = 'UY'
  AND c.id IS NULL;
\`\`\`

La condición \`u.country = 'UY'\` es sobre \`users\`, que es la tabla izquierda, así que puede ir en el \`WHERE\` sin romper el LEFT JOIN: esas filas existen con valor propio, no dependen de la unión.
`,
  },
];
