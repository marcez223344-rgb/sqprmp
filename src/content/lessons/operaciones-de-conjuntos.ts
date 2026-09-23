import type { LessonDef } from "../schemas/curriculum";

const section = "operaciones-de-conjuntos";

export const lessons: LessonDef[] = [
  {
    slug: "union-y-union-all",
    section,
    kind: "theory",
    title: "UNION y UNION ALL: apilar resultados",
    sort_order: 0,
    estimated_minutes: 10,
    is_free: false,
    is_published: true,
    prerequisites: ["cte-with-pasos"],
    dataset: "tiendaviva",
    body_md: `## Por qué importa

Un join pone tablas **lado a lado**: agrega columnas. A veces necesitas lo contrario, poner resultados **uno debajo del otro**: agregar filas. Un directorio que junte clientes y vendedores, un reporte que sume los movimientos de dos fuentes, una lista que combine dos filtros distintos. Para eso existen las operaciones de conjuntos, y \`UNION\` es la primera.

Trabajas con **TiendaViva**: \`customers\`, \`sellers\`, \`orders\`, \`order_items\`, \`products\`, \`payments\`, \`returns\`.

## La sintaxis

\`\`\`sql
SELECT 'cliente' AS tipo, full_name AS nombre
FROM customers
WHERE country = 'UY'

UNION ALL

SELECT 'vendedor' AS tipo, store_name AS nombre
FROM sellers
WHERE country = 'UY'

ORDER BY tipo, nombre;
\`\`\`

Dos consultas completas, un operador entre ellas y un resultado único. Cada consulta se llama **rama**. La columna \`tipo\` es un texto fijo que agregaste tú: sin esa etiqueta, al ver el resultado no sabrías de qué rama viene cada fila.

## UNION elimina duplicados, UNION ALL no

Esa es toda la diferencia, y decide cuál usar:

- \`UNION ALL\` apila y devuelve **todas** las filas, repetidas incluidas.
- \`UNION\` apila y después **elimina las filas duplicadas** del resultado completo, como si aplicara un \`DISTINCT\` al final.

\`\`\`sql
-- Clientes uruguayos que compraron por web o por marketplace (sin repetir a nadie)
SELECT c.id AS customer_id, c.full_name
FROM orders AS o
INNER JOIN customers AS c ON c.id = o.customer_id
WHERE c.country = 'UY' AND o.channel = 'web'

UNION

SELECT c.id AS customer_id, c.full_name
FROM orders AS o
INNER JOIN customers AS c ON c.id = o.customer_id
WHERE c.country = 'UY' AND o.channel = 'marketplace_partner'

ORDER BY customer_id;
\`\`\`

Quien compró por los dos canales aparece **una sola vez**. Con \`UNION ALL\` aparecería una vez por cada pedido: el resultado sería una lista de pedidos disfrazada de lista de clientes.

Dos filas son duplicadas cuando **todas** sus columnas coinciden. Si agregas \`o.id\` al \`SELECT\`, ya no hay duplicados que eliminar, porque cada pedido tiene un id distinto. Elegir las columnas es elegir qué significa "repetido".

## Cuál elegir

Regla práctica: **usa \`UNION ALL\` salvo que necesites deduplicar**.

Eliminar duplicados cuesta: el motor tiene que ordenar o construir una tabla hash con todas las filas antes de devolver la primera. \`UNION ALL\` no compara nada y puede empezar a entregar filas de inmediato. En un reporte de movimientos contables, además, \`UNION\` sería un error de negocio: dos cobros idénticos del mismo monto el mismo día son dos cobros reales, y \`UNION\` los convertiría en uno.

Al revés: si vas a mandar un correo a una lista de clientes, \`UNION ALL\` significa escribirle dos veces a la misma persona.

## Reglas de compatibilidad

Las ramas no necesitan venir de la misma tabla, pero sí deben **encajar**:

1. **Misma cantidad de columnas** en todas las ramas.
2. **Tipos compatibles** posición por posición: la primera columna de una rama con la primera de la otra, la segunda con la segunda. \`integer\` y \`numeric\` conviven; \`text\` y \`integer\` no.
3. Los **nombres** del resultado los define la **primera rama**. Los alias de las demás se ignoran, así que conviene escribirlos igual para que nadie se confunda al leer.

El orden importa y no se corrige solo: si una rama proyecta \`(nombre, país)\` y la otra \`(país, nombre)\`, ambas de tipo texto, la consulta corre sin error y mezcla los datos. Es el error más caro de esta sección porque no avisa.

## ORDER BY y LIMIT van al final

\`ORDER BY\` y \`LIMIT\` se aplican al **resultado combinado**, no a una rama, y por eso se escriben una sola vez al final:

\`\`\`sql
SELECT full_name AS nombre FROM customers WHERE country = 'CL'
UNION ALL
SELECT store_name FROM sellers WHERE country = 'CL'
ORDER BY nombre
LIMIT 10;
\`\`\`

Ahí solo puedes ordenar por los nombres de la **primera** rama (o por posición: \`ORDER BY 1\`). Si necesitas ordenar o limitar una rama por separado, enciérrala entre paréntesis: \`(SELECT ... ORDER BY x LIMIT 5) UNION ALL (SELECT ... LIMIT 5)\`.

## Errores comunes

- Usar \`UNION\` "por las dudas" y perder filas legítimas en un reporte de montos.
- Ramas con distinta cantidad de columnas: PostgreSQL responde que cada rama debe tener el mismo número de columnas.
- Confiar en que el nombre de la columna alinea los datos: alinea la **posición**.
- Poner \`ORDER BY\` en medio de las ramas sin paréntesis.

## Resumen

\`UNION ALL\` apila filas tal cual; \`UNION\` apila y deduplica. Las ramas deben tener la misma cantidad de columnas, tipos compatibles y el mismo orden; los nombres salen de la primera. \`ORDER BY\` y \`LIMIT\` se escriben una sola vez, al final.
`,
  },
  {
    slug: "intersect-y-except",
    section,
    kind: "theory",
    title: "INTERSECT y EXCEPT: comparar conjuntos",
    sort_order: 1,
    estimated_minutes: 11,
    is_free: false,
    is_published: true,
    prerequisites: ["union-y-union-all"],
    dataset: "bolsillo",
    body_md: `## Por qué importa

Muchas preguntas de negocio son comparaciones entre dos listas: quiénes usan los dos métodos de pago, qué clientes compraron el año pasado y no volvieron, qué cuentas envían dinero pero nunca reciben. \`INTERSECT\` y \`EXCEPT\` responden exactamente eso, y se leen casi como la pregunta.

Trabajas con **Bolsillo**, la billetera digital: \`users\`, \`accounts\`, \`transactions\`, \`transfers\`, \`cards\`, \`merchants\`, \`kyc_events\`.

## INTERSECT: lo que está en las dos listas

\`\`\`sql
-- Personas de Perú que pagaron con QR y también con tarjeta
SELECT u.id AS user_id, u.full_name
FROM transactions AS t
INNER JOIN accounts AS a ON a.id = t.account_id
INNER JOIN users AS u ON u.id = a.user_id
WHERE u.country = 'PE' AND t.status = 'completed' AND t.kind = 'qr_payment'

INTERSECT

SELECT u.id AS user_id, u.full_name
FROM transactions AS t
INNER JOIN accounts AS a ON a.id = t.account_id
INNER JOIN users AS u ON u.id = a.user_id
WHERE u.country = 'PE' AND t.status = 'completed' AND t.kind = 'card_payment'

ORDER BY user_id;
\`\`\`

Devuelve las filas que aparecen en **ambas** ramas. Fíjate en la "y" de la pregunta: no se puede resolver con \`WHERE kind = 'qr_payment' AND kind = 'card_payment'\`, porque ninguna transacción tiene dos tipos a la vez. La condición no es sobre una fila, es sobre una **persona** que tiene filas de los dos tipos.

## EXCEPT: lo que está en la primera y no en la segunda

\`\`\`sql
-- Cuentas que enviaron transferencias y nunca recibieron ninguna
SELECT t.from_account_id AS account_id
FROM transfers AS t
WHERE t.status = 'completed'

EXCEPT

SELECT t.to_account_id
FROM transfers AS t
WHERE t.status = 'completed'

ORDER BY account_id;
\`\`\`

\`EXCEPT\` **no es simétrico**: invertir las ramas responde otra pregunta (las que reciben y nunca envían). \`UNION\` e \`INTERSECT\` sí lo son.

## Los dos eliminan duplicados

\`INTERSECT\` y \`EXCEPT\` devuelven filas **distintas**, igual que \`UNION\`. Si una cuenta envió 40 transferencias, aparece una sola vez. Por eso el \`DISTINCT\` dentro de cada rama casi nunca hace falta: no cambia el resultado y sí agrega trabajo.

Existen \`INTERSECT ALL\` y \`EXCEPT ALL\`, que conservan multiplicidades (si algo está 3 veces en la primera rama y 1 en la segunda, \`EXCEPT ALL\` devuelve 2 copias). Se usan poco; cuando los necesites, escríbelos con esa intención declarada en un comentario.

## La comparación usa todas las columnas

Una fila de la primera rama se "encuentra" en la segunda solo si **todas** sus columnas coinciden. Esto es la fuente número uno de resultados vacíos inesperados:

\`\`\`sql
-- Casi siempre devuelve todo: created_at nunca coincide entre ramas
SELECT account_id, amount, created_at FROM transactions WHERE kind = 'topup'
EXCEPT
SELECT account_id, amount, created_at FROM transactions WHERE is_flagged;
\`\`\`

Proyecta **solo las columnas que definen la identidad** de lo que comparas (normalmente la clave: \`user_id\`, \`account_id\`, \`product_id\`). Los datos descriptivos los agregas después, con un join sobre el resultado:

\`\`\`sql
WITH solo_emisoras AS (
  SELECT from_account_id AS account_id FROM transfers WHERE status = 'completed'
  EXCEPT
  SELECT to_account_id FROM transfers WHERE status = 'completed'
)
SELECT s.account_id, u.full_name, a.currency
FROM solo_emisoras AS s
INNER JOIN accounts AS a ON a.id = s.account_id
INNER JOIN users AS u ON u.id = a.user_id
ORDER BY s.account_id;
\`\`\`

Ese patrón —conjunto primero, detalles después— es el que vas a repetir en el trabajo real.

## NULL cuenta como un valor

En un \`WHERE\`, \`NULL = NULL\` no es verdadero. En las operaciones de conjuntos, en cambio, dos filas con \`NULL\` en la misma columna **se consideran iguales**, así que \`EXCEPT\` descarta la fila e \`INTERSECT\` la conserva. Es el mismo criterio de \`GROUP BY\` y \`DISTINCT\`, y una de las razones por las que \`EXCEPT\` es más seguro que \`NOT IN\`, que con un solo \`NULL\` en la lista devuelve cero filas.

## Errores comunes

- Esperar que \`EXCEPT\` funcione en cualquier orden: la primera rama manda.
- Arrastrar columnas descriptivas (montos, fechas) y no encontrar coincidencias nunca.
- Agregar \`DISTINCT\` en cada rama creyendo que hace falta.
- Traducir "A y B" a un \`AND\` sobre la misma columna cuando la pregunta es sobre la entidad, no sobre la fila.

## Resumen

\`INTERSECT\` devuelve lo que está en las dos ramas; \`EXCEPT\` lo que está en la primera y no en la segunda, y no es simétrico. Ambos deduplican y comparan **todas** las columnas, así que proyecta solo la clave y trae los detalles con un join posterior.
`,
  },
  {
    slug: "conjuntos-precedencia-y-alternativas",
    section,
    kind: "theory",
    title: "Combinar operadores y elegir la alternativa correcta",
    sort_order: 2,
    estimated_minutes: 10,
    is_free: false,
    is_published: true,
    prerequisites: ["intersect-y-except"],
    dataset: "bolsillo",
    body_md: `## Por qué importa

En una consulta real rara vez aparece un solo operador. "Las cuentas marcadas o con KYC rechazado, menos las ya bloqueadas" combina dos. Y casi siempre existe una alternativa con \`JOIN\` o \`EXISTS\`: conviene saber cuándo cada una es la mejor opción.

## Precedencia: INTERSECT primero

Cuando mezclas operadores sin paréntesis, PostgreSQL aplica estas reglas:

1. \`INTERSECT\` se evalúa **antes** que \`UNION\` y \`EXCEPT\`.
2. \`UNION\` y \`EXCEPT\` tienen la misma prioridad y se evalúan **de izquierda a derecha**.

Entonces \`A UNION B EXCEPT C\` es \`(A UNION B) EXCEPT C\`, pero \`A UNION B INTERSECT C\` es \`A UNION (B INTERSECT C)\`: el mismo texto, distinto resultado.

\`\`\`sql
-- Usuarias y usuarios de Uruguay para revisar: marcados o con KYC rechazado,
-- salvo los que ya están bloqueados.
(
  SELECT u.id AS user_id, u.full_name
  FROM transactions AS t
  INNER JOIN accounts AS a ON a.id = t.account_id
  INNER JOIN users AS u ON u.id = a.user_id
  WHERE u.country = 'UY' AND t.is_flagged

  UNION

  SELECT u.id AS user_id, u.full_name
  FROM kyc_events AS k
  INNER JOIN users AS u ON u.id = k.user_id
  WHERE u.country = 'UY' AND k.outcome = 'rejected'
)
EXCEPT
SELECT id AS user_id, full_name
FROM users
WHERE country = 'UY' AND is_blocked

ORDER BY user_id;
\`\`\`

Aquí los paréntesis coinciden con la precedencia por defecto, así que no cambian el resultado. Igual conviene escribirlos: quien lea la consulta no tiene que recordar la regla, y si alguien agrega un \`INTERSECT\` mañana, la intención queda fijada.

## Set operations dentro de otra consulta

Una combinación de ramas es una consulta como cualquier otra: puede ir en una CTE, en un \`FROM\` o dentro de \`IN (...)\`.

\`\`\`sql
WITH activas AS (
  SELECT account_id FROM transactions WHERE kind = 'topup'
  INTERSECT
  SELECT account_id FROM transactions WHERE kind = 'card_payment'
)
SELECT count(*) AS cuentas_activas FROM activas;
\`\`\`

Es la forma natural de contar el tamaño de un conjunto o de seguir calculando sobre él.

## Las alternativas: JOIN, EXISTS, NOT EXISTS

Casi todo \`INTERSECT\` se puede escribir con \`EXISTS\` y casi todo \`EXCEPT\` con \`NOT EXISTS\`:

\`\`\`sql
-- EXCEPT
SELECT from_account_id AS account_id FROM transfers WHERE status = 'completed'
EXCEPT
SELECT to_account_id FROM transfers WHERE status = 'completed';

-- NOT EXISTS (equivalente)
SELECT DISTINCT t.from_account_id AS account_id
FROM transfers AS t
WHERE t.status = 'completed'
  AND NOT EXISTS (
    SELECT 1 FROM transfers AS r
    WHERE r.status = 'completed' AND r.to_account_id = t.from_account_id
  );
\`\`\`

Ninguna es "la correcta". Elige así:

| Situación | Mejor opción |
| --- | --- |
| Comparas dos listas por su clave, la pregunta suena a conjuntos | \`INTERSECT\` / \`EXCEPT\` |
| Necesitas columnas de la segunda tabla en el resultado | \`JOIN\` |
| La condición es "existe alguna fila que…" y no quieres duplicar filas | \`EXISTS\` / \`NOT EXISTS\` |
| Hay que contar coincidencias, no solo saber si hay | \`JOIN\` + \`GROUP BY\` |

Dos avisos de campo. Primero: un \`INNER JOIN\` **no** equivale a \`INTERSECT\` si la clave se repite, porque el join multiplica filas y el \`INTERSECT\` deduplica. Segundo: \`NOT IN\` con una subconsulta que puede devolver \`NULL\` da cero filas sin avisar; \`EXCEPT\` y \`NOT EXISTS\` no tienen ese problema.

## Rendimiento

\`UNION ALL\` es el más barato: no compara nada. \`UNION\`, \`INTERSECT\` y \`EXCEPT\` necesitan ordenar o armar una tabla hash para deduplicar, un costo que crece con el volumen. Cuando cada rama repite el mismo escaneo pesado sobre la misma tabla, suele ser mejor una sola pasada con agregación condicional (\`count(*) FILTER (WHERE ...)\` y un \`HAVING\`), la técnica de la sección siguiente.

Como siempre: escribe primero la versión que se lee mejor y compara planes con \`EXPLAIN\` solo si la consulta se vuelve lenta de verdad.

## Errores comunes

- Mezclar \`UNION\` e \`INTERSECT\` sin paréntesis y obtener otro conjunto del esperado.
- Reemplazar un \`INTERSECT\` por un \`INNER JOIN\` y duplicar filas.
- Escribir tres ramas casi iguales sobre la misma tabla en vez de una pasada con filtros condicionales.

## Resumen

\`INTERSECT\` se evalúa antes que \`UNION\` y \`EXCEPT\`; estos dos van de izquierda a derecha. Usa paréntesis aunque no cambien el resultado. \`EXISTS\`/\`NOT EXISTS\` y los joins son alternativas legítimas: elige por lo que necesitas en el resultado y por cómo se lee.
`,
  },
];
