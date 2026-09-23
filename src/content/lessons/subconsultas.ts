import type { LessonDef } from "../schemas/curriculum";

const section = "subconsultas";

export const lessons: LessonDef[] = [
  {
    slug: "subconsultas-escalares-y-derivadas",
    section,
    kind: "theory",
    title: "Subconsultas escalares y tablas derivadas",
    sort_order: 0,
    estimated_minutes: 12,
    is_free: false,
    is_published: true,
    prerequisites: ["inner-join-varias-tablas"],
    dataset: "tiendaviva",
    body_md: `## Empieza el nivel avanzado

Hasta acá cada consulta respondía su pregunta en una sola pasada: filtrar, unir, agrupar, ordenar. Desde esta sección el trabajo cambia: vas a **componer** consultas, es decir, a usar el resultado de una consulta dentro de otra. A esa consulta interna se la llama **subconsulta**.

Lo que sube de dificultad no es la sintaxis, es el diseño. Antes de escribir nada tendrás que responderte dos preguntas: *¿qué dato intermedio necesito?* y *¿en qué parte de la consulta principal entra ese dato?*. Espera menos «una función nueva que memorizar» y más «armar la consulta por capas».

Un hábito que ahorra mucho tiempo: ejecuta primero la subconsulta sola y revisa su resultado. Si esa pieza devuelve lo que esperabas, el resto se apoya en terreno firme y cualquier error posterior está en la capa de afuera.

Trabajas con **TiendaViva**, el marketplace, y sus tablas \`orders\`, \`order_items\`, \`products\`, \`customers\`, \`sellers\` y \`categories\`.

## Tres lugares donde vive una subconsulta

| Posición | Qué debe devolver | Para qué sirve |
| --- | --- | --- |
| \`SELECT\` | una fila y una columna (escalar) | mostrar un valor de referencia al lado de cada fila |
| \`WHERE\` | un valor escalar o una lista de valores | comparar o filtrar contra otro conjunto |
| \`FROM\` | una tabla completa (tabla derivada) | consultar sobre un resultado ya calculado |

## Subconsulta escalar

Una subconsulta **escalar** es la que devuelve exactamente una fila con una sola columna, es decir, un único valor. Se puede escribir en cualquier lugar donde iría una constante:

\`\`\`sql
SELECT
  id,
  total_amount,
  (SELECT round(avg(total_amount), 2)
   FROM orders
   WHERE currency = 'UYU' AND status = 'delivered') AS ticket_promedio
FROM orders
WHERE currency = 'UYU' AND status = 'delivered'
LIMIT 10;
\`\`\`

Cada fila del resultado muestra el importe de su pedido y, al lado, el ticket promedio de todo el conjunto (14 377,35 UYU), que es el mismo valor en todas las filas y sirve como referencia para comparar.

Dos reglas de esta forma:

- Si la subconsulta devuelve **más de una fila**, la consulta falla con el mensaje \`more than one row returned by a subquery used as an expression\`. Es un error visible y fácil de corregir.
- Si devuelve **cero filas**, el resultado es \`NULL\`. No hay error ni advertencia, y esa columna en NULL suele ser la primera señal de que el filtro de la subconsulta está mal escrito.

## Subconsulta escalar en WHERE

No puedes escribir \`WHERE total_amount > avg(total_amount)\`, porque una función de agregación no se puede evaluar dentro de \`WHERE\`: el filtro se aplica fila por fila, antes de que exista el promedio. La subconsulta resuelve el problema porque se calcula por separado y entrega un valor ya listo:

\`\`\`sql
SELECT id, created_at, total_amount
FROM orders
WHERE currency = 'UYU'
  AND status = 'delivered'
  AND total_amount > (SELECT avg(total_amount)
                      FROM orders
                      WHERE currency = 'UYU' AND status = 'delivered');
\`\`\`

Devuelve 173 pedidos. Fíjate en un detalle que decide el resultado: los filtros que escribas **dentro** de la subconsulta definen contra qué promedio estás comparando. Si adentro no filtras por \`status\`, comparas cada pedido contra el promedio de todos los pedidos, incluidos los cancelados, y obtienes otra cantidad de filas.

Las dos consultas son correctas y responden preguntas distintas. Decide cuál quieres y escríbelo de forma explícita, porque el resultado no te va a avisar cuál elegiste.

## Tabla derivada en FROM

Cuando necesitas consultar sobre un resultado que ya viene agregado, la subconsulta se escribe dentro del \`FROM\` y se comporta como una tabla temporal. A eso se le llama **tabla derivada**. Es la forma de aplicar una agregación sobre otra agregación, por ejemplo el promedio de un conteo:

\`\`\`sql
SELECT
  c.country,
  count(*) AS clientes_con_pedidos,
  round(avg(p.pedidos), 2) AS pedidos_promedio
FROM (
  SELECT customer_id, count(*) AS pedidos
  FROM orders
  WHERE status = 'delivered'
  GROUP BY customer_id
) AS p
INNER JOIN customers AS c ON c.id = p.customer_id
GROUP BY c.country;
\`\`\`

En SQL no existe \`avg(count(*))\`: no puedes anidar una agregación dentro de otra en el mismo nivel. Por eso el cálculo va en dos capas: la subconsulta cuenta los pedidos de cada cliente y deja una fila por cliente, y la consulta externa promedia esos conteos dentro de cada país. En este dataset, Chile encabeza con 5,51 pedidos entregados por cliente.

La tabla derivada tiene tres reglas propias: **necesita un alias** (\`AS p\`), sus columnas calculadas **necesitan un nombre** (\`AS pedidos\`) para poder usarlas desde afuera, y desde la consulta externa solo ves las columnas que la subconsulta expone en su \`SELECT\`.

## Errores comunes

- Usar en un lugar donde se espera un valor único una subconsulta que devuelve varias filas.
- Olvidar el alias de la tabla derivada, lo que produce el error \`subquery in FROM must have an alias\`.
- Aplicar filtros distintos adentro y afuera sin darte cuenta: el resultado se ve razonable pero responde otra pregunta.

## Resumen

1. Una subconsulta escalar devuelve un solo valor y se usa como si fuera una constante.
2. En \`FROM\`, una subconsulta es una tabla derivada: necesita alias y nombres para sus columnas calculadas.
3. Los filtros de la subconsulta definen el universo contra el que comparas; escríbelos a propósito y déjalos documentados.
`,
  },
  {
    slug: "subconsultas-in-exists-y-null",
    section,
    kind: "theory",
    title: "IN, NOT IN y EXISTS: la trampa de NULL",
    sort_order: 1,
    estimated_minutes: 12,
    is_free: false,
    is_published: true,
    prerequisites: ["subconsultas-escalares-y-derivadas", "null-logica-de-tres-valores"],
    dataset: "bolsillo",
    body_md: `## Filtrar contra una lista

Cuando la subconsulta devuelve **una sola columna pero varias filas**, la usas como una lista de valores con el operador \`IN\`:

\`\`\`sql
SELECT a.id, a.currency, a.balance
FROM accounts AS a
WHERE a.status = 'active'
  AND a.id IN (SELECT t.to_account_id FROM transfers AS t WHERE t.status = 'completed');
\`\`\`

En **Bolsillo**, la billetera digital, esa consulta devuelve 1774 cuentas activas que recibieron al menos una transferencia completada.

La ventaja frente a resolverlo con un join es que \`IN\` **no multiplica filas**. Si una cuenta recibió 12 transferencias, aparece una sola vez en el resultado; con \`INNER JOIN\` aparecería 12 veces y tendrías que agregar \`DISTINCT\` para corregirlo.

## NOT IN y la trampa de NULL

Esta es la trampa que produce más consultas equivocadas en silencio. En Bolsillo, la columna \`card_id\` de la tabla \`transactions\` indica con qué tarjeta se hizo el movimiento, y solo tiene valor en los pagos con tarjeta: en 20 613 de los 32 243 movimientos está en \`NULL\`.

La pregunta de negocio es razonable: ¿qué tarjetas nunca se usaron?

\`\`\`sql
SELECT count(*)
FROM cards
WHERE id NOT IN (SELECT card_id FROM transactions);
\`\`\`

Devuelve **0**, y no porque todas las tarjetas se hayan usado. La causa es la lógica de tres valores que viste en la sección 8.

\`x NOT IN (a, b, NULL)\` equivale a \`NOT (x = a OR x = b OR x = NULL)\`. La comparación con \`NULL\` no da verdadero ni falso: da \`UNKNOWN\`. Por eso el paréntesis nunca llega a ser \`FALSE\`; como mucho queda en \`UNKNOWN\`, y \`NOT UNKNOWN\` sigue siendo \`UNKNOWN\`. Como \`WHERE\` solo deja pasar lo que es verdadero, ninguna fila pasa el filtro.

Basta **un solo NULL** en la lista para que \`NOT IN\` devuelva el conjunto vacío. Y no hay error ni advertencia: la consulta se ejecuta bien y el resultado es «ninguna tarjeta sin usar», que es una conclusión falsa.

Hay dos formas de arreglarlo:

\`\`\`sql
-- 1) Excluir los NULL de la lista
SELECT count(*)
FROM cards
WHERE id NOT IN (SELECT card_id FROM transactions WHERE card_id IS NOT NULL);

-- 2) Usar NOT EXISTS
SELECT count(*)
FROM cards AS c
WHERE NOT EXISTS (SELECT 1 FROM transactions AS t WHERE t.card_id = c.id);
\`\`\`

Ambas devuelven la respuesta correcta: 1638 tarjetas sin uso.

Conviene aclarar que \`IN\` en su forma afirmativa no sufre este problema. Si hay un \`NULL\` en la lista, la comparación contra ese valor da \`UNKNOWN\` en lugar de \`FALSE\`, pero las filas que sí coinciden con algún valor real siguen dando \`TRUE\` y pasan el filtro.

## EXISTS y NOT EXISTS

\`EXISTS\` no compara valores: pregunta únicamente **si la subconsulta devuelve al menos una fila**, y responde verdadero o falso. Como nunca compara nada con \`NULL\`, no puede caer en la trampa anterior. Por la misma razón da igual qué columnas pidas dentro; la convención es escribir \`SELECT 1\` para dejar claro que el contenido no importa.

\`\`\`sql
SELECT a.id, a.currency, a.balance
FROM accounts AS a
WHERE a.status = 'active'
  AND EXISTS (SELECT 1
              FROM transactions AS t
              WHERE t.account_id = a.id
                AND t.kind = 'qr_payment'
                AND t.status = 'completed');
\`\`\`

La subconsulta menciona \`a.id\`, que es la columna \`id\` de la tabla \`accounts\` de la consulta externa: eso la convierte en una subconsulta **correlacionada**, el tema de la lección siguiente. El motor puede detenerse apenas encuentra la primera coincidencia, porque solo necesita saber si hay o no hay.

## Cuál usar

| Necesidad | Recomendado |
| --- | --- |
| «Está en esta lista de valores» | \`IN\` |
| «No está», y la columna admite \`NULL\` | \`NOT EXISTS\` |
| «Existe al menos un relacionado» | \`EXISTS\` |
| Necesitas columnas de la otra tabla | \`JOIN\` |
| La otra tabla puede duplicar filas | \`EXISTS\` o \`IN\` |

Ninguna opción es la correcta en todos los casos. El planificador de PostgreSQL reescribe \`IN\` y \`EXISTS\` como la misma operación interna (llamada *semi join*) en la mayoría de las situaciones, así que el rendimiento rara vez decide: elige por claridad de lectura y por seguridad frente a los \`NULL\`.

## Errores comunes

- Usar \`NOT IN\` sobre una columna que admite \`NULL\`: la consulta devuelve cero filas y nada explica por qué.
- Seleccionar dos columnas dentro de un \`IN\`, lo que produce el error \`subquery has too many columns\`.
- Usar \`JOIN\` solo para filtrar y terminar con filas duplicadas que inflan los totales.

## Resumen

1. \`IN\` filtra contra una lista de valores sin multiplicar filas.
2. \`NOT IN\` con un solo \`NULL\` en la lista devuelve cero filas, siempre y sin avisar.
3. \`NOT EXISTS\` expresa «no tiene ninguno» sin sorpresas, y es la forma recomendada para ese caso.
`,
  },
  {
    slug: "subconsultas-correlacionadas",
    section,
    kind: "theory",
    title: "Subconsultas correlacionadas o join: cuándo cada una",
    sort_order: 2,
    estimated_minutes: 11,
    is_free: false,
    is_published: true,
    prerequisites: ["subconsultas-in-exists-y-null"],
    dataset: "bolsillo",
    body_md: `## Qué la hace correlacionada

Una subconsulta es **correlacionada** cuando adentro menciona una columna de la consulta externa. Esa referencia hace que no pueda ejecutarse por separado: le falta un dato que solo existe en la consulta de afuera. Conceptualmente se evalúa una vez por cada fila externa, tomando el valor de esa fila.

El área de riesgo de **Bolsillo** pide un diagnóstico de las cuentas congeladas: para cada una, cuántos movimientos completados tiene y cuándo fue el último.

\`\`\`sql
SELECT
  a.id,
  a.currency,
  a.balance,
  (SELECT count(*)
   FROM transactions AS t
   WHERE t.account_id = a.id AND t.status = 'completed') AS movimientos,
  (SELECT max(t.created_at)
   FROM transactions AS t
   WHERE t.account_id = a.id AND t.status = 'completed') AS ultimo_movimiento
FROM accounts AS a
WHERE a.status = 'frozen';
\`\`\`

El resultado son 126 cuentas, una fila por cuenta. La condición \`t.account_id = a.id\` es la que correlaciona: dice que los movimientos contados son los de *esa* cuenta y no los de todas. Cada subconsulta se lee como una pregunta chica y completa: «para esta cuenta, ¿cuántos movimientos hubo?».

## La misma pregunta con un join

\`\`\`sql
SELECT
  a.id,
  a.currency,
  a.balance,
  count(t.id) AS movimientos,
  max(t.created_at) AS ultimo_movimiento
FROM accounts AS a
LEFT JOIN transactions AS t
  ON t.account_id = a.id AND t.status = 'completed'
WHERE a.status = 'frozen'
GROUP BY a.id, a.currency, a.balance;
\`\`\`

El resultado es idéntico. Dos detalles de esta versión no son opcionales:

- El filtro \`t.status = 'completed'\` va en la cláusula \`ON\`. Si lo pones en el \`WHERE\`, las cuentas sin ningún movimiento completado quedan con la columna en NULL, el \`WHERE\` las descarta y el \`LEFT JOIN\` termina comportándose como un \`INNER JOIN\`: pierdes justamente las cuentas que no tienen movimientos.
- \`count(t.id)\` cuenta las filas que existen de verdad en la tabla de la derecha. \`count(*)\` devolvería 1 en una cuenta sin movimientos, porque el \`LEFT JOIN\` igual genera una fila con las columnas en NULL.

En este dataset todas las cuentas congeladas tienen historial, así que las dos versiones coinciden fila por fila. Si hubiera cuentas sin movimientos, la versión correlacionada devolvería \`0\` y \`NULL\`, y el \`LEFT JOIN\` con \`count(t.id)\` también: escritas con ese cuidado, son equivalentes.

## Cuál se lee mejor

**Prefiere la subconsulta correlacionada** cuando la tabla principal es la protagonista del informe y solo quieres agregarle una o dos métricas. La consulta se lee de arriba hacia abajo, no necesitas \`GROUP BY\` y no corres riesgo de multiplicar filas al sumar otra tabla relacionada.

**Prefiere el join con \`GROUP BY\`** cuando necesitas varias métricas de la misma tabla, porque cada subconsulta correlacionada obliga al motor a recorrer esa tabla otra vez; cuando ya estás uniendo esa tabla por otro motivo; o cuando además quieres mostrar columnas del detalle.

**Usa \`EXISTS\`** para las preguntas de existencia, del tipo «cuáles tienen al menos uno». Se lee mejor que un join con \`DISTINCT\` y no cambia la cantidad de filas del resultado.

## Costo

El riesgo tiene nombre propio: *N+1*, que describe una consulta principal más una subconsulta ejecutada por cada fila que esta devuelve. En la práctica, PostgreSQL suele reescribir \`EXISTS\`, \`IN\` y muchas correlacionadas como un *semi join* o un *hash join*, así que ese costo rara vez se paga de forma literal.

Donde sí duele es en un caso concreto: cuando la subconsulta correlacionada contiene su propia agregación sobre una tabla grande y la consulta externa devuelve miles de filas. Ahí el agregado se recalcula una y otra vez y la consulta se vuelve lenta; la solución es pasarlo a una tabla derivada, a un join agrupado o a una CTE (sección 22).

Regla práctica: escribe primero la versión que se entienda mejor, mide con \`EXPLAIN ANALYZE\` si el volumen de datos es grande y reescribe solo si la medición lo justifica.

## Errores comunes

- Olvidar la condición de correlación (\`WHERE t.account_id = a.id\`): la subconsulta calcula el total global y repite ese mismo número en todas las filas, sin dar ningún error.
- Escribir dentro de la subconsulta nombres de columna sin calificar con el alias de su tabla. Si ese nombre no existe en la tabla interna, PostgreSQL lo resuelve contra la tabla externa, la condición se vuelve siempre verdadera y el filtro deja de filtrar.
- Repetir cinco veces la misma subconsulta correlacionada en el \`SELECT\` en lugar de resolver todo con un join agrupado.

## Resumen

1. Correlacionada significa que la subconsulta menciona una columna de afuera, y por eso se evalúa por cada fila externa.
2. Usa la correlacionada para una o dos métricas al lado de la tabla principal, y el join con \`GROUP BY\` cuando son varias.
3. Califica siempre los nombres de columna con el alias de su tabla: la correlación involuntaria es un error difícil de detectar.
`,
  },
];
