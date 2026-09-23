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
    body_md: `## Por qué importa

Los datos crudos rara vez están en la forma que el negocio necesita. En TiendaViva, la tabla \`orders\` guarda por separado la columna \`subtotal\` (la suma de los productos del pedido) y la columna \`discount\` (el descuento aplicado). Un reporte de ventas no quiere esas dos columnas: quiere el **neto**, que es la resta de una menos la otra. Y una lista para el equipo de logística no debería encabezarse \`destination_city\`, sino «Ciudad».

Las dos cosas se resuelven en el \`SELECT\`: con **expresiones**, que calculan un valor nuevo a partir de las columnas, y con **alias**, que son los nombres que le pones a cada columna del resultado.

## Columnas calculadas

Dentro del \`SELECT\` puedes escribir expresiones, no solamente nombres de columna:

\`\`\`sql
SELECT
  id,
  subtotal,
  discount,
  subtotal - discount
FROM orders
LIMIT 5;
\`\`\`

La cuarta columna no existe en la tabla: PostgreSQL la calcula fila por fila, restando en cada pedido su propio descuento a su propio subtotal. Los operadores aritméticos disponibles son \`+\`, \`-\`, \`*\` y \`/\`.

Presta atención a la división entre enteros: PostgreSQL devuelve un entero y descarta los decimales, así que \`7 / 2\` da \`3\` y no \`3.5\`. Si necesitas decimales, haz que al menos uno de los dos valores lo sea, por ejemplo \`7 / 2.0\`.

## Alias: nombres para el resultado

La columna calculada del ejemplo anterior aparece con el encabezado \`?column?\`, porque el motor no tiene ningún nombre que darle. Para ponerle uno usa \`AS\`:

\`\`\`sql
SELECT
  id,
  subtotal - discount AS neto
FROM orders
LIMIT 5;
\`\`\`

Reglas prácticas:

- Usa \`snake_case\` en minúsculas (\`neto\`, \`envio_pct\`), sin espacios ni acentos. Si pones espacios vas a necesitar comillas dobles (\`"Total neto"\`) y tendrás que arrastrarlas en cada consulta que reutilice ese resultado, así que conviene evitarlo.
- \`AS\` es opcional en PostgreSQL, de modo que \`subtotal - discount neto\` también funciona. Escribirlo igual hace que la consulta se lea mejor, sobre todo cuando alguien la revisa rápido.
- Un alias **no** se puede usar en el \`WHERE\` de la misma consulta, porque el filtro se evalúa antes que la lista de columnas y en ese momento el alias todavía no existe. Lo verás en la sección 6.

También puedes ponerle un alias a una tabla (\`FROM orders AS o\`). Eso se vuelve necesario cuando combinas varias tablas en la misma consulta, en la sección 17.

## Texto: concatenar y dar formato

El operador \`||\` une dos textos en uno solo. Si una de las partes es un número, PostgreSQL lo convierte a texto automáticamente en la mayoría de los casos:

\`\`\`sql
SELECT
  'CAT-' || id AS codigo,
  name
FROM categories;
\`\`\`

Así, la categoría con \`id\` 7 sale como \`CAT-7\`, que es el formato que espera el catálogo impreso. Otras funciones útiles son \`upper()\` y \`lower()\`, que pasan un texto a mayúsculas o a minúsculas, y \`length()\`, que devuelve su cantidad de caracteres. Las verás en detalle en la sección 9.

Dos cosas sobre \`||\` que te van a servir fuera de este curso. La primera: si alguno de los operandos es NULL, todo el resultado es NULL (\`'CAT-' || NULL\` no es \`'CAT-'\`, es NULL). La función \`CONCAT()\` hace lo mismo pero trata los NULL como texto vacío. La segunda: \`||\` es el operador de concatenación del estándar ISO SQL y funciona igual en PostgreSQL, Oracle, SQLite y DB2, pero SQL Server usa \`+\` y MySQL interpreta \`||\` como el OR lógico. Si tu consulta tiene que correr en varios motores, escribe \`CONCAT()\`.

## Redondeo y precedencia

\`\`\`sql
SELECT
  id,
  ROUND(shipping_fee / total_amount * 100, 1) AS envio_pct
FROM orders
LIMIT 5;
\`\`\`

\`ROUND(valor, decimales)\` redondea el valor a la cantidad de decimales que le indiques, así que este cálculo devuelve qué porcentaje del total del pedido se fue en envío, con un decimal.

La precedencia de los operadores es la misma de la aritmética que ya conoces: primero se resuelven \`*\` y \`/\`, después \`+\` y \`-\`. Cuando tengas dudas, **usa paréntesis**: escribir \`(subtotal - discount) * 1.21\` deja explícito que el impuesto se aplica sobre el neto y no solo sobre el descuento.

## Ejemplo resuelto

Pedido: «Quiero ver los 20 pedidos más grandes con el neto (subtotal menos descuento) y qué porcentaje del total es el envío».

\`\`\`sql
SELECT
  id,
  subtotal - discount AS neto,
  ROUND(shipping_fee / total_amount * 100, 1) AS envio_pct
FROM orders
ORDER BY total_amount DESC
LIMIT 20;
\`\`\`

Fíjate en un detalle: el \`ORDER BY\` ordena por \`total_amount\` aunque esa columna no esté en la lista del \`SELECT\`. Eso es válido porque el ordenamiento se resuelve sobre las filas de la tabla, no sobre las columnas que elegiste mostrar.

## Errores comunes

- Olvidar el alias y entregar un reporte con una columna llamada \`?column?\`.
- Dividir dos enteros esperando decimales y recibir un resultado truncado.
- Usar el alias dentro del \`WHERE\`, que devuelve el error «column does not exist».
- Poner el alias entre comillas simples: \`AS 'neto'\` no define un alias, define un texto.
`,
  },
];
