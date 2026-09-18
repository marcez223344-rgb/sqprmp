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

Los datos crudos rara vez están en la forma que el negocio necesita. Un reporte de ventas no muestra \`subtotal\` y \`discount\`: muestra el **neto**. Una lista para el equipo de logística no dice \`destination_city\`, dice «Ciudad». Con expresiones y alias transformas columnas en respuestas.

## Columnas calculadas

Dentro de \`SELECT\` puedes escribir expresiones, no solo nombres de columna:

\`\`\`sql
SELECT
  id,
  subtotal,
  discount,
  subtotal - discount
FROM orders
LIMIT 5;
\`\`\`

La cuarta columna se calcula fila por fila. Operadores aritméticos: \`+\`, \`-\`, \`*\`, \`/\`. Cuidado con la división entre enteros: \`7 / 2\` da \`3\` en PostgreSQL; \`7 / 2.0\` da \`3.5\`.

## Alias: nombres para el resultado

La columna calculada de arriba se llamaría \`?column?\`. Ponle nombre con \`AS\`:

\`\`\`sql
SELECT
  id,
  subtotal - discount AS neto
FROM orders
LIMIT 5;
\`\`\`

Reglas prácticas:

- Usa \`snake_case\` en minúsculas (\`neto\`, \`envio_pct\`), sin espacios ni acentos. Si necesitas espacios tendrás que usar comillas dobles (\`"Total neto"\`) y arrastrarlas en cada consulta que reutilice el resultado. Evítalo.
- \`AS\` es opcional en PostgreSQL (\`subtotal - discount neto\` funciona), pero escribirlo hace la consulta más legible.
- Un alias **no** se puede usar en el \`WHERE\` de la misma consulta (lo verás en la sección 6): el filtro se evalúa antes que la lista de columnas.

También puedes renombrar tablas (\`FROM orders AS o\`), útil cuando combinas varias tablas en la sección 17.

## Texto: concatenar y dar formato

El operador \`||\` une textos. Si una parte es número, PostgreSQL la convierte a texto automáticamente en la mayoría de los casos:

\`\`\`sql
SELECT
  'CAT-' || id AS codigo,
  name
FROM categories;
\`\`\`

Funciones útiles: \`upper()\`, \`lower()\`, \`length()\`. Las verás en detalle en la sección 9.

## Redondeo y precedencia

\`\`\`sql
SELECT
  id,
  ROUND(shipping_fee / total_amount * 100, 1) AS envio_pct
FROM orders
LIMIT 5;
\`\`\`

\`ROUND(valor, decimales)\` redondea. La precedencia es la de la aritmética escolar: \`*\` y \`/\` antes que \`+\` y \`-\`. Cuando dudes, **usa paréntesis**: \`(subtotal - discount) * 1.21\` deja claro qué se multiplica.

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

Fíjate: \`ORDER BY\` puede usar \`total_amount\` aunque no esté en el \`SELECT\`.

## Errores comunes

- Olvidar el alias y entregar una columna llamada \`?column?\`.
- Dividir dos enteros esperando decimales.
- Usar el alias dentro de \`WHERE\` (error «column does not exist»).
- Poner el alias entre comillas simples: \`AS 'neto'\` no es un alias, es un texto.
`,
  },
];
