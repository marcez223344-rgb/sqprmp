import type { LessonDef } from "../schemas/curriculum";

export const lessons: LessonDef[] = [
  {
    slug: "alias-y-expresiones-basico",
    section: "alias-y-expresiones",
    kind: "theory",
    title: "Alias y columnas calculadas",
    sort_order: 0,
    estimated_minutes: 9,
    is_free: true,
    is_published: true,
    prerequisites: ["select-columnas"],
    dataset: "tiendaviva",
    body_md: `\`\`\`objetivos
Calcular columnas nuevas dentro del \`SELECT\` con los operadores aritméticos.
Ponerle a cada columna del resultado el nombre con el que la va a leer el negocio.
Esquivar las tres trampas clásicas: la división entre enteros, el alias dentro del \`WHERE\` y el NULL que se propaga al concatenar.
\`\`\`

## Por qué importa

Los datos crudos rara vez están en la forma que el negocio necesita. En TiendaViva, la tabla \`orders\` guarda por separado la columna \`subtotal\` (la suma de los productos del pedido) y la columna \`discount\` (el descuento aplicado). Un reporte de ventas no quiere esas dos columnas: quiere el **neto**, que es la resta de una menos la otra. Y una lista para el equipo de logística no debería encabezarse \`destination_city\`, sino «Ciudad».

Las dos cosas se resuelven en el \`SELECT\`: con **expresiones**, que calculan un valor nuevo a partir de las columnas, y con **alias**, que son los nombres que le pones a cada columna del resultado.

## Columnas calculadas

Dentro del \`SELECT\` puedes escribir expresiones, no solamente nombres de columna:

\`\`\`sql Los operadores disponibles son +, -, * y /
SELECT
  id,
  subtotal,
  discount,
  subtotal - discount
FROM orders
ORDER BY id
LIMIT 4;
\`\`\`

\`\`\`resultado La cuarta columna no existe en la tabla y sale sin nombre
id | subtotal | discount | ?column?
1 | 88293.00 | 15009.81 | 73283.19
2 | 31881.26 | 0.00 | 31881.26
3 | 406802.00 | 0.00 | 406802.00
4 | 97657.92 | 0.00 | 97657.92
\`\`\`

PostgreSQL calcula esa columna fila por fila, restando en cada pedido su propio descuento a su propio subtotal.

Presta atención a la división entre enteros: cuando los dos valores son enteros, PostgreSQL devuelve un entero y descarta los decimales.

\`\`\`sql-mal Los dos valores son enteros, así que el resultado es 3
SELECT 7 / 2;
\`\`\`

\`\`\`sql-bien Basta con que uno de los dos tenga decimales: el resultado es 3.5
SELECT 7 / 2.0;
\`\`\`

## Alias: nombres para el resultado

El encabezado \`?column?\` del ejemplo anterior aparece porque el motor no tiene ningún nombre que darle a una columna calculada. Para ponerle uno usa \`AS\`:

\`\`\`sql El mismo cálculo, ahora con un encabezado que el negocio entiende
SELECT
  id,
  subtotal - discount AS neto
FROM orders
ORDER BY id
LIMIT 4;
\`\`\`

\`\`\`resultado
id | neto
1 | 73283.19
2 | 31881.26
3 | 406802.00
4 | 97657.92
\`\`\`

Reglas prácticas:

- Usa \`snake_case\` en minúsculas (\`neto\`, \`envio_pct\`), sin espacios ni acentos. Si pones espacios vas a necesitar comillas dobles (\`"Total neto"\`) y tendrás que arrastrarlas en cada consulta que reutilice ese resultado.
- \`AS\` es opcional en PostgreSQL, de modo que \`subtotal - discount neto\` también funciona. Escribirlo igual hace que la consulta se lea mejor.
- Ponerlo entre comillas simples no define un alias: \`AS 'neto'\` define un texto.

También puedes ponerle un alias a una tabla (\`FROM orders AS o\`). Eso se vuelve necesario cuando combinas varias tablas en la misma consulta, en la sección 17.

## Dónde se puede usar un alias

\`\`\`clave
Un alias es el nombre que la columna tendrá **en el resultado**, no una variable. Nace en el paso del \`SELECT\`, casi al final, así que el \`WHERE\` todavía no lo conoce.
\`\`\`

\`\`\`diagrama orden-de-ejecucion#where,select
PostgreSQL no resuelve la consulta en el orden en que la escribes. El orden real es: 1 \`FROM\`, 2 \`WHERE\`, 3 \`GROUP BY\`, 4 \`HAVING\`, 5 las funciones de ventana (\`OVER\`), 6 \`SELECT\` —que es donde nacen los alias—, 7 \`ORDER BY\` y 8 \`LIMIT\`. El paso 2 ocurre cuatro pasos antes del 6: por eso el \`WHERE\` no puede nombrar un alias, y el \`ORDER BY\`, que viene después, sí puede.
\`\`\`

\`\`\`sql-mal El filtro se evalúa antes que la lista de columnas: «column "neto" does not exist»
SELECT subtotal - discount AS neto
FROM orders
WHERE neto > 100000;
\`\`\`

\`\`\`sql-bien Repite la expresión en el WHERE; el ORDER BY sí acepta el alias
SELECT subtotal - discount AS neto
FROM orders
WHERE subtotal - discount > 100000
ORDER BY neto DESC;
\`\`\`

## Texto: concatenar y dar formato

El operador \`||\` une dos textos en uno solo. Si una de las partes es un número, PostgreSQL lo convierte a texto automáticamente en la mayoría de los casos:

\`\`\`sql El formato que espera el catálogo impreso
SELECT
  'CAT-' || id AS codigo,
  name
FROM categories
ORDER BY id
LIMIT 4;
\`\`\`

\`\`\`resultado
codigo | name
CAT-1 | Tecnología
CAT-2 | Celulares
CAT-3 | Audio
CAT-4 | Computación
\`\`\`

Otras funciones útiles son \`upper()\` y \`lower()\`, que pasan un texto a mayúsculas o a minúsculas, y \`length()\`, que devuelve su cantidad de caracteres. Las verás en detalle en la sección 9.

Dos cosas sobre \`||\` que te van a servir fuera de este curso. La primera: si alguno de los operandos es NULL, todo el resultado es NULL (\`'CAT-' || NULL\` no es \`'CAT-'\`, es NULL), mientras que \`CONCAT()\` trata los NULL como texto vacío. La segunda: \`||\` es el operador de concatenación del estándar ISO SQL y funciona igual en PostgreSQL, Oracle, SQLite y DB2, pero SQL Server usa \`+\` y MySQL interpreta \`||\` como el OR lógico. Si tu consulta tiene que correr en varios motores, escribe \`CONCAT()\`.

## Redondeo y precedencia

\`ROUND(valor, decimales)\` redondea el valor a la cantidad de decimales que le indiques. La precedencia de los operadores es la misma de la aritmética que ya conoces: primero se resuelven \`*\` y \`/\`, después \`+\` y \`-\`. Cuando tengas dudas, **usa paréntesis**: escribir \`(subtotal - discount) * 1.21\` deja explícito que el impuesto se aplica sobre el neto y no solo sobre el descuento.

## Ejemplo resuelto

Pedido: «Quiero ver los pedidos más grandes con el neto (subtotal menos descuento) y qué porcentaje del total es el envío».

\`\`\`sql El ORDER BY ordena por total_amount aunque esa columna no esté en el SELECT
SELECT
  id,
  subtotal - discount AS neto,
  ROUND(shipping_fee / total_amount * 100, 1) AS envio_pct
FROM orders
ORDER BY total_amount DESC
LIMIT 4;
\`\`\`

\`\`\`resultado El envío pesa menos del 1 % en los pedidos grandes
id | neto | envio_pct
10661 | 18872300.00 | 0.1
10122 | 15942637.62 | 0.2
7908 | 13898508.00 | 0.2
1257 | 13506233.94 | 0.3
\`\`\`

Ordenar por una columna que no está en la lista del \`SELECT\` es válido porque el ordenamiento se resuelve sobre las filas de la tabla, no sobre las columnas que elegiste mostrar.

## Errores comunes

- Olvidar el alias y entregar un reporte con una columna llamada \`?column?\`.
- Dividir dos enteros esperando decimales y recibir un resultado truncado.
- Usar el alias dentro del \`WHERE\`, que devuelve el error «column does not exist».
- Poner el alias entre comillas simples: \`AS 'neto'\` no define un alias, define un texto.
`,
  },
];
