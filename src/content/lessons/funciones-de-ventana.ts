import type { LessonDef } from "../schemas/curriculum";

const section = "funciones-de-ventana";

export const lessons: LessonDef[] = [
  {
    slug: "ventana-over-partition",
    section,
    kind: "theory",
    title: "OVER: agregar sin colapsar filas",
    sort_order: 0,
    estimated_minutes: 11,
    is_free: false,
    is_published: true,
    prerequisites: ["group-by-reportes"],
    dataset: "bolsillo",
    body_md: `## Por qué importa

\`GROUP BY\` responde «cuánto por grupo», pero pierde el detalle: una fila por grupo y nada más. Muchas preguntas necesitan **las dos cosas a la vez**: cada movimiento **y** el promedio de su tipo; cada categoría **y** su participación en el total; cada pago **y** el saldo acumulado hasta ese momento. Las **funciones de ventana** calculan un agregado «al lado» de cada fila, sin colapsarla.

Trabajas con **Bolsillo**, una billetera digital: \`transactions\` (movimientos), \`accounts\`, \`merchants\`, \`fx_rates\`.

## La sintaxis

\`\`\`sql
SELECT
  id,
  kind,
  amount,
  round(avg(amount) OVER (PARTITION BY kind), 2) AS promedio_del_tipo
FROM transactions
WHERE account_id = 2364;
\`\`\`

\`OVER (...)\` convierte \`avg\` en función de ventana. \`PARTITION BY kind\` define la **ventana**: todas las filas con el mismo \`kind\`. Cada movimiento sigue siendo una fila y recibe el promedio de su partición.

Sin \`PARTITION BY\` (\`OVER ()\`), la ventana es **toda** la consulta:

\`\`\`sql
round(100 * amount / sum(amount) OVER (), 2) AS pct_del_total
\`\`\`

## Ventana sobre un GROUP BY

Las funciones de ventana se evalúan **después** de \`GROUP BY\`, así que pueden operar sobre agregados:

\`\`\`sql
SELECT
  m.category,
  sum(t.amount) AS total,
  round(100 * sum(t.amount) / sum(sum(t.amount)) OVER (), 2) AS pct
FROM transactions AS t
INNER JOIN merchants AS m ON m.id = t.merchant_id
WHERE t.status = 'completed'
GROUP BY m.category;
\`\`\`

\`sum(sum(t.amount)) OVER ()\` se lee de adentro hacia afuera: primero el total por categoría (\`GROUP BY\`), luego la suma de esos totales sobre toda la ventana.

## Orden de evaluación

\`FROM\` → \`WHERE\` → \`GROUP BY\` → \`HAVING\` → **ventanas** → \`SELECT\` (alias) → \`ORDER BY\` → \`LIMIT\`.

Consecuencias: una ventana **ve las filas ya filtradas** por \`WHERE\` (para «participación sobre el total general» no filtres antes), y **no puedes usar el resultado de una ventana en \`WHERE\`** de la misma consulta; necesitas una subconsulta o CTE (secciones 21–22).

## Ejemplo resuelto

Pedido: «Cada pago con QR de la cuenta 2364, junto con el promedio de los pagos con QR de esa cuenta y la diferencia».

\`\`\`sql
SELECT
  id,
  created_at,
  amount,
  round(avg(amount) OVER (), 2) AS promedio,
  round(amount - avg(amount) OVER (), 2) AS diferencia
FROM transactions
WHERE account_id = 2364
  AND kind = 'qr_payment'
  AND status = 'completed';
\`\`\`

Como el \`WHERE\` ya deja solo los pagos con QR, \`OVER ()\` promedia exactamente ese conjunto.
`,
  },
  {
    slug: "ventana-order-by-y-marcos",
    section,
    kind: "theory",
    title: "ORDER BY dentro de la ventana: acumulados y marcos",
    sort_order: 1,
    estimated_minutes: 10,
    is_free: false,
    is_published: true,
    prerequisites: ["ventana-over-partition"],
    dataset: "bolsillo",
    body_md: `## Acumulados

Con \`ORDER BY\` dentro de \`OVER\`, el agregado se calcula **hasta la fila actual** en ese orden:

\`\`\`sql
SELECT
  id,
  created_at,
  direction,
  amount,
  sum(CASE WHEN direction = 'credit' THEN amount ELSE -amount END)
    OVER (ORDER BY created_at, id) AS saldo
FROM transactions
WHERE account_id = 2364
  AND status IN ('completed', 'reversed')
ORDER BY created_at, id;
\`\`\`

Cada fila muestra el saldo de la cuenta **después** de ese movimiento. El \`CASE\` da signo a los débitos. Incluir \`id\` en el \`ORDER BY\` de la ventana evita ambigüedad si dos movimientos comparten timestamp.

## PARTITION BY + ORDER BY

Combinados, reinician el acumulado por grupo: saldo por cuenta, acumulado por mes, etc.

\`\`\`sql
sum(...) OVER (PARTITION BY account_id ORDER BY created_at, id)
\`\`\`

## Marcos de ventana

\`ORDER BY\` implica por defecto el marco \`RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW\`. Puedes definir otro marco, por ejemplo una **media móvil de 7 días**:

\`\`\`sql
SELECT
  rate_date,
  usd_rate,
  round(avg(usd_rate) OVER (
    ORDER BY rate_date
    ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
  ), 4) AS media_7d
FROM fx_rates
WHERE currency = 'ARS'
  AND rate_date >= '2025-08-01' AND rate_date < '2025-09-01'
ORDER BY rate_date;
\`\`\`

\`ROWS\` cuenta filas físicas; \`RANGE\` agrupa valores iguales del \`ORDER BY\`. Para series diarias sin huecos, \`ROWS\` es lo esperado. Las primeras 6 filas promedian menos de 7 valores (el marco se recorta al inicio).

## Ventanas con nombre

Cuando repites la misma ventana en varias columnas, nómbrala con \`WINDOW\`:

\`\`\`sql
SELECT
  id,
  amount,
  sum(amount) OVER w AS acumulado,
  count(*) OVER w AS n
FROM transactions
WHERE account_id = 2364
WINDOW w AS (ORDER BY created_at, id);
\`\`\`

## Rendimiento

Cada ventana con \`ORDER BY\` distinto implica un ordenamiento. Reutiliza ventanas y filtra en \`WHERE\` lo que no necesites antes de calcular.

## Ejemplo resuelto

Pedido: «Para cada intento KYC de las personas de Uruguay, cuántos intentos totales tuvo esa persona».

\`\`\`sql
SELECT
  k.user_id,
  k.event_at,
  k.outcome,
  count(*) OVER (PARTITION BY k.user_id) AS intentos
FROM kyc_events AS k
INNER JOIN users AS u ON u.id = k.user_id
WHERE u.country = 'UY'
ORDER BY k.user_id, k.event_at;
\`\`\`

\`count(*) OVER (PARTITION BY ...)\` sin \`ORDER BY\` da el total de la partición en cada fila; con \`ORDER BY\` daría el acumulado.
`,
  },
];
