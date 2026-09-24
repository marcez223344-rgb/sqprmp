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

Un join pone dos tablas **lado a lado**, de modo que el resultado tiene más columnas. A veces necesitas lo contrario: poner dos resultados **uno debajo del otro**, de modo que el resultado tenga más filas. Es lo que pide un directorio que junte clientes y vendedores, un reporte que reúna los movimientos de dos fuentes o una lista que combine dos filtros distintos. Para eso existen las operaciones de conjuntos, y \`UNION\` es la primera.

Trabajas con **TiendaViva**, el marketplace: \`customers\` (clientes), \`sellers\` (vendedores), \`orders\` (pedidos), \`order_items\` (las líneas de cada pedido), \`products\` (productos), \`payments\` (intentos de pago) y \`returns\` (devoluciones).

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

Son dos consultas completas, un operador entre ellas y un único resultado. A cada una de esas consultas la llamamos **rama**. La columna \`tipo\` no viene de ninguna tabla: es un texto fijo que agregaste tú en cada rama para poder distinguirlas, porque una vez apiladas las filas no traen ninguna marca de origen.

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

Quien compró por los dos canales aparece **una sola vez**. Con \`UNION ALL\` aparecería una vez por cada pedido que hizo, y entonces el resultado ya no sería una lista de clientes sino una lista de pedidos con el nombre del cliente repetido.

Dos filas se consideran duplicadas cuando **todas** sus columnas coinciden. Si agregas \`o.id\` al \`SELECT\` —la columna \`id\` de la tabla \`orders\`, que identifica cada pedido—, ya no queda ningún duplicado por eliminar, porque cada pedido tiene un identificador distinto. Por eso, elegir qué columnas proyectas es también elegir qué vas a considerar «repetido».

## Cuál elegir

Regla práctica: **usa \`UNION ALL\` salvo que necesites deduplicar**.

Eliminar duplicados cuesta: el motor tiene que ordenar o construir una tabla hash con todas las filas antes de devolver la primera. \`UNION ALL\` no compara nada y puede empezar a entregar filas de inmediato. En un reporte de movimientos contables, además, \`UNION\` sería un error de negocio: dos cobros idénticos del mismo monto el mismo día son dos cobros reales, y \`UNION\` los convertiría en uno.

El caso opuesto también existe: si vas a enviar un correo a una lista de clientes, usar \`UNION ALL\` hace que la misma persona reciba dos mensajes.

## Reglas de compatibilidad

Las ramas no necesitan venir de la misma tabla, pero sí deben **encajar**:

1. **Misma cantidad de columnas** en todas las ramas.
2. **Tipos compatibles** posición por posición: la primera columna de una rama con la primera de la otra, la segunda con la segunda. \`integer\` y \`numeric\` conviven; \`text\` y \`integer\` no.
3. Los **nombres** del resultado los define la **primera rama**. Los alias de las demás se ignoran, así que conviene escribirlos igual para que nadie se confunda al leer.

El orden de las columnas importa y el motor no lo corrige por ti: si una rama proyecta \`(nombre, país)\` y la otra \`(país, nombre)\`, y las cuatro columnas son de tipo texto, la consulta se ejecuta sin error y devuelve países en la columna de nombres y nombres en la de países. Es el error más caro de esta sección, justamente porque nada avisa de que ocurrió.

## ORDER BY y LIMIT van al final

\`ORDER BY\` y \`LIMIT\` se aplican al **resultado combinado**, no a una rama, y por eso se escriben una sola vez al final:

\`\`\`sql
SELECT full_name AS nombre FROM customers WHERE country = 'CL'
UNION ALL
SELECT store_name FROM sellers WHERE country = 'CL'
ORDER BY nombre
LIMIT 10;
\`\`\`

En ese \`ORDER BY\` final solo puedes nombrar columnas de la **primera** rama, porque de ahí salen los nombres del resultado; también puedes usar la posición, como en \`ORDER BY 1\`. Si necesitas ordenar o limitar una rama por separado, enciérrala entre paréntesis: \`(SELECT ... ORDER BY x LIMIT 5) UNION ALL (SELECT ... LIMIT 5)\`.

## Errores comunes

- Usar \`UNION\` «por las dudas» y perder filas legítimas: en un reporte de montos, dos cobros reales del mismo importe se convierten en uno solo.
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

Muchas preguntas de negocio son comparaciones entre dos listas: quiénes usan los dos medios de pago, qué clientes compraron el año pasado y no volvieron, qué cuentas envían dinero pero nunca reciben. \`INTERSECT\` devuelve lo que está en las dos listas y \`EXCEPT\` lo que está en la primera y falta en la segunda, así que la consulta termina pareciéndose mucho a la pregunta original.

Trabajas con **Bolsillo**, la billetera digital: \`users\` (las personas usuarias), \`accounts\` (sus cuentas), \`transactions\` (los movimientos de dinero), \`transfers\` (las transferencias entre cuentas), \`cards\` (las tarjetas), \`merchants\` (los comercios) y \`kyc_events\` (los intentos de verificación de identidad).

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

\`INTERSECT\` devuelve las filas que aparecen en **las dos** ramas. Fíjate en la «y» de la pregunta: no se puede resolver con \`WHERE kind = 'qr_payment' AND kind = 'card_payment'\`, porque \`kind\` es la columna de \`transactions\` que guarda el tipo de movimiento y ninguna fila puede tener dos tipos a la vez. La condición no es sobre una fila, es sobre una **persona** que tiene filas de los dos tipos.

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

\`EXCEPT\` **no es simétrico**, es decir, el orden de las ramas cambia el resultado: si las inviertes, la consulta responde otra pregunta, la de qué cuentas recibieron transferencias y nunca enviaron ninguna. \`UNION\` e \`INTERSECT\` sí son simétricos: da lo mismo cuál rama escribas primero.

## Los dos eliminan duplicados

\`INTERSECT\` y \`EXCEPT\` devuelven filas **distintas**, igual que \`UNION\`. Si una cuenta envió 40 transferencias, aparece una sola vez. Por eso el \`DISTINCT\` dentro de cada rama casi nunca hace falta: no cambia el resultado y sí agrega trabajo.

Existen también \`INTERSECT ALL\` y \`EXCEPT ALL\`, que conservan las repeticiones: si una fila aparece 3 veces en la primera rama y 1 vez en la segunda, \`EXCEPT ALL\` devuelve las 2 copias restantes. Se usan poco, así que cuando los necesites deja escrita la intención en un comentario para que nadie los tome por un error de tipeo.

## La comparación usa todas las columnas

Una fila de la primera rama se «encuentra» en la segunda solo si **todas** sus columnas coinciden. Esto es la fuente número uno de resultados vacíos inesperados:

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

Ese patrón —calcular primero el conjunto de claves y agregar los detalles después— es el que vas a repetir una y otra vez en el trabajo real.

## NULL cuenta como un valor

En un \`WHERE\`, \`NULL = NULL\` no es verdadero. En las operaciones de conjuntos, en cambio, dos filas que tienen \`NULL\` en la misma columna **se consideran iguales**, así que \`EXCEPT\` descarta esa fila e \`INTERSECT\` la conserva. Es el mismo criterio que usan \`GROUP BY\` y \`DISTINCT\`. También es una de las razones por las que \`EXCEPT\` es más seguro que \`NOT IN\`: si la lista con la que compara \`NOT IN\` contiene un solo \`NULL\`, la condición nunca da verdadero y la consulta devuelve cero filas sin ningún aviso.

## Errores comunes

- Esperar que \`EXCEPT\` funcione en cualquier orden: la primera rama manda.
- Arrastrar columnas descriptivas (montos, fechas) y no encontrar coincidencias nunca.
- Agregar \`DISTINCT\` en cada rama creyendo que hace falta.
- Traducir «A y B» a un \`AND\` sobre la misma columna cuando la pregunta es sobre la entidad, no sobre la fila.

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

En una consulta real rara vez aparece un solo operador. Un pedido como «las cuentas marcadas por antifraude o con la verificación de identidad rechazada, menos las que ya están bloqueadas» combina dos operaciones de conjuntos. Además, casi siempre existe otra forma de escribir lo mismo con \`JOIN\` o con \`EXISTS\`, así que conviene saber en qué caso conviene cada una.

Esa verificación de identidad se conoce como KYC (por *Know Your Customer*, «conoce a tu cliente»): es el proceso con el que una billetera confirma quién es la persona detrás de una cuenta, y en Bolsillo cada intento queda registrado en la tabla \`kyc_events\`.

## Precedencia: INTERSECT primero

Cuando mezclas operadores sin paréntesis, PostgreSQL aplica estas reglas:

1. \`INTERSECT\` se evalúa **antes** que \`UNION\` y \`EXCEPT\`.
2. \`UNION\` y \`EXCEPT\` tienen la misma prioridad y se evalúan **de izquierda a derecha**.

Entonces \`A UNION B EXCEPT C\` equivale a \`(A UNION B) EXCEPT C\`, mientras que \`A UNION B INTERSECT C\` equivale a \`A UNION (B INTERSECT C)\`: dos consultas que se escriben casi igual y devuelven conjuntos distintos.

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

## Operaciones de conjuntos dentro de otra consulta

Una combinación de ramas es una consulta como cualquier otra, así que puede ir dentro de una CTE (por *Common Table Expression*, expresión de tabla común: una consulta con nombre que se define con \`WITH\` y se usa después como si fuera una tabla), en el \`FROM\` o dentro de un \`IN (...)\`.

\`\`\`sql
WITH activas AS (
  SELECT account_id FROM transactions WHERE kind = 'topup'
  INTERSECT
  SELECT account_id FROM transactions WHERE kind = 'card_payment'
)
SELECT count(*) AS cuentas_activas FROM activas;
\`\`\`

Es la forma natural de contar cuántos elementos tiene un conjunto o de seguir calculando sobre él.

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

Ninguna es «la correcta». Elige así:

| Situación | Mejor opción |
| --- | --- |
| Comparas dos listas por su clave, la pregunta suena a conjuntos | \`INTERSECT\` / \`EXCEPT\` |
| Necesitas columnas de la segunda tabla en el resultado | \`JOIN\` |
| La condición es «existe alguna fila que…» y no quieres duplicar filas | \`EXISTS\` / \`NOT EXISTS\` |
| Hay que contar coincidencias, no solo saber si hay | \`JOIN\` + \`GROUP BY\` |

Dos advertencias que valen para el trabajo real. La primera: un \`INNER JOIN\` **no** equivale a un \`INTERSECT\` cuando la clave se repite, porque el join devuelve una fila por cada coincidencia mientras que el \`INTERSECT\` deduplica. La segunda: \`NOT IN\` con una subconsulta que puede devolver \`NULL\` termina devolviendo cero filas sin ningún aviso; \`EXCEPT\` y \`NOT EXISTS\` no tienen ese problema.

## Rendimiento

\`UNION ALL\` es el más barato: no compara nada. \`UNION\`, \`INTERSECT\` y \`EXCEPT\` necesitan ordenar o armar una tabla hash para deduplicar, un costo que crece con el volumen. Cuando cada rama repite el mismo escaneo pesado sobre la misma tabla, suele ser mejor una sola pasada con agregación condicional (\`count(*) FILTER (WHERE ...)\` y un \`HAVING\`), la técnica de la sección siguiente.

Como siempre, escribe primero la versión que se lee mejor y revisa los planes de ejecución con \`EXPLAIN\` solo si la consulta llega a ser lenta de verdad.

## Errores comunes

- Mezclar \`UNION\` e \`INTERSECT\` sin paréntesis y obtener un conjunto distinto del que esperabas.
- Reemplazar un \`INTERSECT\` por un \`INNER JOIN\` y duplicar filas.
- Escribir tres ramas casi iguales sobre la misma tabla en vez de una pasada con filtros condicionales.

## Resumen

\`INTERSECT\` se evalúa antes que \`UNION\` y \`EXCEPT\`; estos dos van de izquierda a derecha. Usa paréntesis aunque no cambien el resultado. \`EXISTS\`/\`NOT EXISTS\` y los joins son alternativas legítimas: elige por lo que necesitas en el resultado y por cómo se lee.

## Próximos pasos

**Lo que ya puedes hacer:** Sabes apilar resultados con UNION y UNION ALL, compararlos con INTERSECT y EXCEPT y alinear columnas y tipos entre las consultas que combinas.

**Antes de seguir:** resuelve los ejercicios y el quiz de esta sección.

**Lo que sigue:** Sección 24 · Agregación condicional. Vas a obtener varias métricas por segmento en una sola consulta.

**Para practicar (opcional):** ¿Qué oyentes de Ritmo siguen a algún artista pero nunca crearon una lista de reproducción? Con EXCEPT, quita de los \`user_id\` de \`follows\` los \`user_id\` de \`playlists\`.
`,
  },
];
