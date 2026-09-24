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
    body_md: `\`\`\`objetivos
Agregar una columna calculada sobre un grupo de filas sin perder el detalle de cada fila.
Definir la ventana con \`PARTITION BY\` y entender qué cambia cuando escribes \`OVER ()\` vacío.
Ubicar las funciones de ventana en el orden de evaluación, que es lo que explica por qué no puedes filtrarlas en el \`WHERE\`.
\`\`\`

## Por qué importa

\`GROUP BY\` responde «cuánto por grupo», pero para lograrlo descarta el detalle: deja una sola fila por grupo y las filas originales desaparecen del resultado. Muchas preguntas de negocio necesitan **las dos cosas a la vez**: cada movimiento **y** el promedio de los movimientos de su tipo; cada categoría **y** cuánto representa dentro del total; cada pago **y** el saldo acumulado hasta ese momento.

Para eso existen las **funciones de ventana**: calculan un valor agregado mirando un conjunto de filas relacionadas con la fila actual y escriben ese resultado en una columna nueva, al lado de esa misma fila, sin eliminarla ni fusionarla con las demás. Piénsalo como una planilla en la que, junto a cada movimiento, agregas a mano una columna con el promedio de su categoría: la planilla conserva todas sus líneas y gana una columna. Eso es una función de ventana.

Trabajas con **Bolsillo**, una billetera digital. Sus tablas principales son \`transactions\` (un movimiento de dinero por fila), \`accounts\` (las cuentas), \`merchants\` (los comercios donde se paga) y \`fx_rates\` (las cotizaciones de cada moneda, una por día).

\`\`\`clave
\`GROUP BY\` **reemplaza** las filas por un resumen; una función de ventana **agrega una columna** y deja las filas donde estaban.
\`\`\`

\`\`\`diagrama agrupar-vs-ventana
Con las mismas cuatro filas de entrada, \`GROUP BY kind\` devuelve dos filas —una por tipo de movimiento— y el detalle de cada movimiento se pierde. \`avg(amount) OVER (PARTITION BY kind)\` devuelve las cuatro filas originales y les suma una columna con el promedio del tipo al que pertenece cada una: el mismo cálculo, sin descartar nada.
\`\`\`

## La sintaxis

\`\`\`sql El promedio del tipo, al lado de cada movimiento
SELECT
  id,
  kind,
  amount,
  round(avg(amount) OVER (PARTITION BY kind), 2) AS promedio_del_tipo
FROM transactions
WHERE account_id = 2364
ORDER BY kind, id
LIMIT 5;
\`\`\`

\`\`\`resultado Las cinco filas conservan su importe y repiten el promedio de su tipo
id | kind | amount | promedio_del_tipo
16905 | fee | 2011.50 | 1722.60
16922 | fee | 1876.50 | 1722.60
16931 | fee | 1647.00 | 1722.60
16961 | fee | 2052.00 | 1722.60
16991 | fee | 931.50 | 1722.60
\`\`\`

La palabra \`OVER\` es la que convierte a \`avg\` en función de ventana. Sin ella, \`avg(amount)\` resumiría todas las filas en un único promedio y el detalle se perdería; con ella, \`avg\` se calcula para cada fila sobre el conjunto de filas que \`OVER\` describe entre paréntesis.

Ese conjunto es la **ventana**, y \`PARTITION BY\` es lo que la define. \`PARTITION BY kind\` —\`kind\` es la columna \`kind\` de la tabla \`transactions\`, que indica el tipo de movimiento: recarga, pago con QR, pago con tarjeta— parte la tabla en bloques, uno por cada tipo, y para cada fila la ventana es su propio bloque. Así, cada movimiento sigue apareciendo como una fila y recibe en la columna nueva el promedio de los movimientos de su mismo tipo.

Si escribes \`OVER ()\` sin \`PARTITION BY\`, no hay bloques: la ventana son **todas** las filas que devuelve la consulta.

\`\`\`sql
round(100 * amount / sum(amount) OVER (), 2) AS pct_del_total
\`\`\`

## Ventana sobre un GROUP BY

Las funciones de ventana se evalúan **después** de \`GROUP BY\`, así que pueden operar sobre agregados:

\`\`\`sql La participación de cada rubro sobre el total general
SELECT
  m.category,
  sum(t.amount) AS total,
  round(100 * sum(t.amount) / sum(sum(t.amount)) OVER (), 2) AS pct
FROM transactions AS t
INNER JOIN merchants AS m ON m.id = t.merchant_id
WHERE t.status = 'completed'
GROUP BY m.category
ORDER BY total DESC
LIMIT 4;
\`\`\`

\`\`\`resultado Los cuatro rubros con más gasto; el pct se calcula sobre el total general, no sobre estas cuatro filas
category | total | pct
transporte | 85730379.78 | 12.08
restaurante | 82458171.94 | 11.62
servicios | 77998616.41 | 10.99
entretenimiento | 72693151.55 | 10.24
\`\`\`

En esa consulta, \`m.category\` es la columna \`category\` de la tabla \`merchants\`, el rubro del comercio (supermercado, transporte, entretenimiento), y \`t.merchant_id\` es la columna \`merchant_id\` de la tabla \`transactions\`, que apunta a \`merchants.id\` e indica en qué comercio se hizo el movimiento.

\`sum(sum(t.amount)) OVER ()\` se lee de adentro hacia afuera: el \`sum\` interno calcula el total gastado en cada categoría, porque hay un \`GROUP BY m.category\`; el \`sum\` externo, con su \`OVER ()\`, suma esos totales de categoría y obtiene el total general. Al dividir uno por otro sale la participación de cada categoría, que es lo que muestra la columna \`pct\`.

## Orden de evaluación

\`\`\`diagrama orden-de-ejecucion#where,over
Las funciones de ventana se evalúan en el paso 5, después del \`FROM\`, el \`WHERE\`, el \`GROUP BY\` y el \`HAVING\`, y antes del \`SELECT\`, el \`ORDER BY\` y el \`LIMIT\`.
\`\`\`

De ese orden salen dos consecuencias prácticas. La primera: una ventana solo **ve las filas que sobrevivieron al \`WHERE\`**, así que si necesitas la participación sobre el total general no puedes filtrar antes de calcularla. La segunda: **no puedes usar el resultado de una ventana dentro del \`WHERE\`** de la misma consulta, porque cuando el \`WHERE\` se evalúa la ventana todavía no se calculó. Para filtrar por ese resultado hay que envolver la consulta en una subconsulta o en una CTE (por *Common Table Expression*, expresión de tabla común: una consulta con nombre que se escribe con \`WITH\` y se usa después como si fuera una tabla; secciones 21–22).

## Ejemplo resuelto

Pedido: «Cada pago con QR de la cuenta 2364, junto con el promedio de los pagos con QR de esa cuenta y la diferencia».

\`\`\`sql El WHERE ya dejó solo los pagos con QR, así que OVER () promedia exactamente ese conjunto
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

Cuando escribes un \`ORDER BY\` dentro del \`OVER\`, la ventana deja de ser el bloque completo y pasa a ser «desde la primera fila hasta la fila actual» según ese orden. El agregado se convierte entonces en un acumulado:

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

Cada fila muestra el saldo de la cuenta **después** de ese movimiento. El \`CASE\` le pone signo a cada importe: suma los créditos (el dinero que entra) y resta los débitos (el dinero que sale), porque en \`transactions\` la columna \`amount\` siempre guarda un número positivo y el sentido lo indica la columna \`direction\`. Incluir \`id\` como segundo criterio del \`ORDER BY\` de la ventana evita que el acumulado quede indefinido cuando dos movimientos tienen exactamente el mismo valor en \`created_at\`.

## PARTITION BY + ORDER BY

Usados juntos, \`PARTITION BY\` arma los bloques y \`ORDER BY\` acumula dentro de cada bloque, de modo que el acumulado vuelve a empezar en cada grupo: un saldo por cuenta, un total acumulado por mes.

\`\`\`sql
sum(...) OVER (PARTITION BY account_id ORDER BY created_at, id)
\`\`\`

## Marcos de ventana

\`\`\`diagrama marco-de-ventana
Las filas de la partición, en el orden que fija el \`ORDER BY\` de la ventana. El marco por omisión abarca desde la primera fila hasta la fila actual, marcada con el recuadro: para esa fila el cálculo usa las cinco barras llenas y todavía no ve las tres punteadas que vienen después. Una fila más abajo, el marco crece en una barra, y por eso el resultado es un acumulado.
\`\`\`

El **marco** es la porción de la partición que entra en el cálculo de cada fila. Cuando escribes un \`ORDER BY\` dentro del \`OVER\` y no indicas nada más, PostgreSQL usa el marco \`RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW\`, es decir, «desde el comienzo de la partición hasta la fila actual»: por eso el resultado es un acumulado. Puedes escribir otro marco, por ejemplo uno que mire solo las últimas siete filas para calcular una **media móvil de 7 días**:

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

\`ROWS\` cuenta las filas una por una, tal como están; \`RANGE\` trata como una sola unidad a todas las filas que comparten el mismo valor en el \`ORDER BY\`. En una serie diaria sin días faltantes, \`ROWS\` es lo que esperas. Ten presente que las primeras seis filas promedian menos de siete valores, porque el marco se recorta al comienzo de la serie: antes de la primera fecha no hay filas que incluir.

## Ventanas con nombre

Cuando repites la misma ventana en varias columnas, dale un nombre con la cláusula \`WINDOW\` y reutilízalo; así la definición vive en un solo lugar y no corres el riesgo de cambiar una copia y olvidar la otra:

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

Cada ventana con un \`ORDER BY\` distinto obliga al motor a ordenar las filas otra vez, y ordenar es una de las operaciones más costosas. Reutiliza la misma ventana cuando puedas y descarta en el \`WHERE\` las filas que no necesitas antes de calcular.

## Ejemplo resuelto

Pedido: «Para cada intento de verificación de identidad (KYC, por *Know Your Customer*, el proceso con el que una billetera confirma quién es su cliente) de las personas de Uruguay, cuántos intentos totales tuvo esa persona».

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

Como el \`OVER\` no lleva \`ORDER BY\`, la ventana es la partición completa y cada fila recibe el total de intentos de esa persona. Si le agregaras un \`ORDER BY\`, cada fila mostraría en cambio cuántos intentos llevaba hasta ese momento.

## Próximos pasos

**Lo que ya puedes hacer:** Sabes usar OVER con PARTITION BY y ORDER BY para calcular promedios por grupo y participaciones sobre el total sin perder el detalle de cada fila.

**Antes de seguir:** resuelve los ejercicios y el quiz de esta sección.

**Lo que sigue:** Sección 26 · Funciones de ranking. Vas a asignar a cada fila un puesto dentro de su grupo.

**Para practicar (opcional):** ¿Cuánto se aleja el precio de cada plato de Pídelo del promedio de su restaurante? En \`menu_items\`, compara \`price\` con \`AVG(price) OVER (PARTITION BY restaurant_id)\`.
`,
  },
];
