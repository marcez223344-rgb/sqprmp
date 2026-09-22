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

Hasta acá cada consulta respondía la pregunta en una sola pasada: filtrar, unir, agrupar, ordenar. Desde esta sección el trabajo cambia: vas a **componer** consultas, es decir, usar el resultado de una consulta dentro de otra.

Lo que sube de dificultad no es la sintaxis, es el diseño. Antes de escribir tendrás que responderte dos preguntas: *¿qué dato intermedio necesito?* y *¿en qué parte de la consulta principal entra ese dato?*. Espera menos «una función nueva» y más «armar la consulta en capas». También conviene ejecutar la subconsulta sola primero: si esa pieza está bien, el resto se apoya en terreno firme.

Trabajas con **TiendaViva**, el marketplace: \`orders\`, \`order_items\`, \`products\`, \`customers\`, \`sellers\`, \`categories\`.

## Tres lugares donde vive una subconsulta

| Posición | Qué debe devolver | Para qué sirve |
| --- | --- | --- |
| \`SELECT\` | una fila y una columna (escalar) | mostrar un valor de referencia al lado de cada fila |
| \`WHERE\` | un valor escalar o una lista de valores | comparar o filtrar contra otro conjunto |
| \`FROM\` | una tabla completa (tabla derivada) | consultar sobre un resultado ya calculado |

## Subconsulta escalar

Una subconsulta **escalar** devuelve exactamente un valor y se usa donde iría una constante:

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

Cada fila muestra su importe y el ticket promedio del conjunto (14 377.35 UYU). Dos reglas:

- Si la subconsulta devuelve **más de una fila**, Postgres falla con \`more than one row returned by a subquery used as an expression\`.
- Si devuelve **cero filas**, el resultado es \`NULL\`: no hay error, y muchas veces ahí está el problema.

## Subconsulta escalar en WHERE

No puedes escribir \`WHERE total_amount > avg(total_amount)\`: una agregación no se evalúa en \`WHERE\`. La subconsulta resuelve el problema porque se calcula por separado:

\`\`\`sql
SELECT id, created_at, total_amount
FROM orders
WHERE currency = 'UYU'
  AND status = 'delivered'
  AND total_amount > (SELECT avg(total_amount)
                      FROM orders
                      WHERE currency = 'UYU' AND status = 'delivered');
\`\`\`

Devuelve 173 pedidos. Fíjate en el detalle importante: los filtros de la subconsulta definen **contra qué promedio** comparas. Si adentro no filtras por \`status\`, comparas contra el promedio de todos los pedidos, incluidos los cancelados. La misma pregunta de negocio con dos respuestas distintas: haz explícito cuál quieres.

## Tabla derivada en FROM

Cuando necesitas consultar sobre un resultado ya agregado, la subconsulta va en \`FROM\` y se comporta como una tabla temporal. Es la forma de aplicar un agregado sobre otro agregado, como el promedio de un conteo:

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

\`avg(count(*))\` no existe en SQL: primero cuentas pedidos por cliente (subconsulta) y después promedias esos conteos por país (consulta externa). Chile encabeza con 5.51 pedidos entregados por cliente.

Reglas de la tabla derivada: **necesita alias** (\`AS p\`), sus columnas calculadas **necesitan nombre** (\`AS pedidos\`) y desde afuera solo ves lo que la subconsulta expone en su \`SELECT\`.

## Errores comunes

- Usar una subconsulta que devuelve varias filas donde se espera un escalar.
- Olvidar el alias de la tabla derivada (\`subquery in FROM must have an alias\`).
- Filtrar distinto adentro y afuera sin querer: el resultado se ve razonable pero responde otra pregunta.

## Resumen

1. Una subconsulta escalar devuelve un valor y se usa como si fuera una constante.
2. En \`FROM\`, una subconsulta es una tabla derivada: necesita alias y nombres de columna.
3. Los filtros de la subconsulta definen el universo de comparación; escríbelos a propósito.
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

Cuando la subconsulta devuelve **una columna con varias filas**, la usas como lista con \`IN\`:

\`\`\`sql
SELECT a.id, a.currency, a.balance
FROM accounts AS a
WHERE a.status = 'active'
  AND a.id IN (SELECT t.to_account_id FROM transfers AS t WHERE t.status = 'completed');
\`\`\`

1774 cuentas activas recibieron al menos una transferencia completada. Ventaja sobre el join: \`IN\` **no multiplica filas**. Si una cuenta recibió 12 transferencias, aparece una sola vez; con \`INNER JOIN\` aparecería 12 veces y necesitarías \`DISTINCT\`.

## NOT IN y la trampa de NULL

Esta es la trampa que más consultas silenciosamente equivocadas produce. En **Bolsillo**, la columna \`transactions.card_id\` solo tiene valor en los pagos con tarjeta: en 20 613 de los 32 243 movimientos es \`NULL\`. Pregunta razonable: ¿qué tarjetas nunca se usaron?

\`\`\`sql
SELECT count(*)
FROM cards
WHERE id NOT IN (SELECT card_id FROM transactions);
\`\`\`

Devuelve **0**. No porque todas las tarjetas se hayan usado, sino por la lógica de tres valores. \`x NOT IN (a, b, NULL)\` equivale a \`NOT (x = a OR x = b OR x = NULL)\`. La comparación con \`NULL\` es \`UNKNOWN\`, así que el paréntesis nunca llega a ser \`FALSE\`: como máximo es \`UNKNOWN\`, y \`NOT UNKNOWN\` sigue siendo \`UNKNOWN\`. Ninguna fila pasa el filtro.

Basta **un solo NULL** en la lista para que \`NOT IN\` devuelva el conjunto vacío. Y no hay error ni advertencia: la consulta «funciona».

Dos formas de arreglarlo:

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

Ambas devuelven 1638 tarjetas sin uso. \`IN\` en su forma afirmativa no sufre el problema: con \`NULL\` en la lista puede dar \`UNKNOWN\` en vez de \`FALSE\`, pero las filas que sí coinciden siguen dando \`TRUE\`.

## EXISTS y NOT EXISTS

\`EXISTS\` no compara valores: pregunta **si la subconsulta devuelve al menos una fila**. Por eso es inmune a los \`NULL\`, y por eso el \`SELECT\` interno da igual; la convención es \`SELECT 1\`.

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

La subconsulta menciona \`a.id\`, una columna de la consulta externa: es una subconsulta **correlacionada** (la lección siguiente). El motor puede detenerse en la primera coincidencia, porque solo le importa si hay o no hay.

## Cuál usar

| Necesidad | Recomendado |
| --- | --- |
| «Está en esta lista de valores» | \`IN\` |
| «No está», y la columna admite \`NULL\` | \`NOT EXISTS\` |
| «Existe al menos un relacionado» | \`EXISTS\` |
| Necesitas columnas de la otra tabla | \`JOIN\` |
| La otra tabla puede duplicar filas | \`EXISTS\` o \`IN\` |

Ninguna es «la correcta» siempre. El planificador de Postgres reescribe \`IN\` y \`EXISTS\` a la misma operación (*semi join*) en la mayoría de los casos, así que elige por claridad y por seguridad frente a \`NULL\`.

## Errores comunes

- \`NOT IN\` sobre una columna que admite \`NULL\`: cero filas sin explicación.
- Seleccionar dos columnas dentro de un \`IN\` (\`subquery has too many columns\`).
- Usar \`JOIN\` solo para filtrar y duplicar filas sin darte cuenta.

## Resumen

1. \`IN\` filtra contra una lista sin multiplicar filas.
2. \`NOT IN\` con un \`NULL\` en la lista devuelve cero filas, siempre.
3. \`NOT EXISTS\` expresa «no tiene ninguno» sin sorpresas.
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

Una subconsulta es **correlacionada** cuando menciona una columna de la consulta externa. No puede ejecutarse sola: conceptualmente se evalúa una vez por cada fila externa.

Riesgo quiere un diagnóstico de las cuentas congeladas de **Bolsillo**: cuántos movimientos completados tiene cada una y cuándo fue el último.

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

126 cuentas, una fila por cuenta. Cada subconsulta se lee como una pregunta chica y completa: «para esta cuenta, ¿cuántos movimientos?».

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

Resultado idéntico. Dos detalles que no son opcionales: el filtro \`t.status = 'completed'\` va en el \`ON\` (si va en el \`WHERE\`, el \`LEFT JOIN\` se comporta como \`INNER\` y pierdes las cuentas sin movimientos) y \`count(t.id)\` cuenta filas reales, mientras que \`count(*)\` contaría 1 en una cuenta sin movimientos.

En este dataset todas las cuentas congeladas tienen historial, así que ambas versiones coinciden fila por fila. Con cuentas sin movimientos, la correlacionada devuelve \`0\` y \`NULL\`, y el \`LEFT JOIN\` con \`count(t.id)\` también: son equivalentes si las escribes con cuidado.

## Cuál se lee mejor

**Prefiere la correlacionada** cuando la tabla principal es la protagonista y solo quieres agregarle una o dos métricas. La consulta se lee de arriba abajo, no necesitas \`GROUP BY\` y no hay riesgo de multiplicar filas al sumar una segunda tabla relacionada.

**Prefiere el join con \`GROUP BY\`** cuando necesitas varias métricas de la misma tabla (cada subconsulta correlacionada es un recorrido adicional), cuando ya estás uniendo esa tabla por otro motivo o cuando además quieres columnas del detalle.

**Usa \`EXISTS\`** para preguntas de existencia: es más claro que un join con \`DISTINCT\` y no cambia la cardinalidad.

## Costo

El nombre del riesgo es *N+1*: una consulta principal más una subconsulta por fila. Postgres suele reescribir \`EXISTS\`, \`IN\` y muchas correlacionadas como *semi join* o *hash join*, así que el costo real rara vez es literal. Donde sí duele es cuando la subconsulta correlacionada contiene su propia agregación sobre una tabla grande y la externa devuelve miles de filas: ahí el agregado se recalcula una y otra vez, y conviene pasarlo a una tabla derivada, a un join o a una CTE (sección 22).

Regla práctica: escribe la versión que se entienda mejor, mide con \`EXPLAIN ANALYZE\` si el volumen es grande y recién entonces reescribe.

## Errores comunes

- Olvidar la condición de correlación (\`WHERE t.account_id = a.id\`): la subconsulta calcula el total global y lo repite en todas las filas, sin dar error.
- Escribir columnas sin calificar dentro de la subconsulta: si el nombre no existe en la tabla interna, Postgres lo resuelve contra la externa y el filtro se vuelve trivialmente verdadero.
- Repetir la misma subconsulta correlacionada cinco veces en el \`SELECT\` en lugar de resolverla con un join agrupado.

## Resumen

1. Correlacionada significa que menciona una columna de afuera; se evalúa por fila externa.
2. Correlacionada para una o dos métricas al lado de la tabla principal; join con \`GROUP BY\` para varias.
3. Califica siempre los nombres con alias: la correlación silenciosa es un error difícil de ver.
`,
  },
];
