import type { LessonDef } from "../schemas/curriculum";

const section = "where";

export const lessons: LessonDef[] = [
  {
    slug: "where-filtros-basicos",
    section,
    kind: "theory",
    title: "WHERE: quedarse con las filas que importan",
    sort_order: 0,
    estimated_minutes: 9,
    is_free: true,
    is_published: true,
    prerequisites: ["select-columnas"],
    dataset: "tiendaviva",
    body_md: `## Por qué importa

Casi ninguna pregunta de negocio es sobre «todo». Es sobre los clientes de Uruguay, los productos sin stock, los pedidos cancelados. \`WHERE\` convierte una tabla en la respuesta a una pregunta concreta.

## El concepto

\`\`\`sql
SELECT id, full_name, city
FROM customers
WHERE country = 'UY';
\`\`\`

\`WHERE\` va después de \`FROM\` y contiene una **condición** que se evalúa fila por fila. Solo pasan las filas donde la condición es verdadera.

Comparaciones disponibles: \`=\`, \`<>\` (distinto; también \`!=\`), \`<\`, \`<=\`, \`>\`, \`>=\`.

## Texto, números y booleanos

- Los textos van entre **comillas simples** y distinguen mayúsculas: \`'UY'\` no es \`'uy'\`.
- Los números van sin comillas: \`stock = 0\`.
- Los booleanos se comparan con \`TRUE\` / \`FALSE\`, o simplemente se usan: \`WHERE is_active\` equivale a \`WHERE is_active = TRUE\`.

\`\`\`sql
SELECT id, name, stock
FROM products
WHERE stock = 0
  AND is_active;
\`\`\`

## Combinar condiciones

- \`AND\`: ambas deben cumplirse.
- \`OR\`: basta con una.
- \`NOT\`: invierte la condición.

Escribe cada condición en su propia línea, con sangría, para que se lea como una lista. En la sección 7 verás por qué \`AND\` y \`OR\` mezclados necesitan paréntesis.

## Alias en WHERE

Los alias del \`SELECT\` **no existen** todavía cuando se evalúa \`WHERE\`. Si filtras por una expresión, repítela:

\`\`\`sql
SELECT id, subtotal - discount AS neto
FROM orders
WHERE subtotal - discount > 100000;
\`\`\`

## Ejemplo resuelto

Pedido: «Necesito los productos activos que están agotados para avisar a los vendedores».

1. Tabla: \`products\`.
2. Condiciones: \`stock = 0\` **y** \`is_active\`.
3. Columnas útiles: \`id\`, \`seller_id\`, \`name\`.

\`\`\`sql
SELECT id, seller_id, name
FROM products
WHERE stock = 0
  AND is_active;
\`\`\`

## Errores comunes

- Comparar texto con comillas dobles (\`"UY"\`): PostgreSQL lo interpreta como nombre de columna.
- Escribir \`WHERE country = UY\` sin comillas: error «column uy does not exist».
- Usar \`=\` con NULL: nunca es verdadero (sección 8).
`,
  },
  {
    slug: "where-texto-y-fechas",
    section,
    kind: "theory",
    title: "Filtrar por patrón de texto y por fechas",
    sort_order: 1,
    estimated_minutes: 10,
    is_free: true,
    is_published: true,
    prerequisites: ["where-filtros-basicos"],
    dataset: "tiendaviva",
    body_md: `## Patrones con LIKE e ILIKE

Cuando no conoces el valor exacto, usa patrones:

- \`%\` representa cualquier secuencia de caracteres (incluida la vacía).
- \`_\` representa exactamente un carácter.

\`\`\`sql
SELECT id, store_name
FROM sellers
WHERE store_name LIKE 'Bazar%';
\`\`\`

\`LIKE\` distingue mayúsculas; \`ILIKE\` (específico de PostgreSQL) no. \`'%urbano%'\` encuentra el texto en cualquier posición, pero impide usar índices: en tablas grandes es lento.

## Fechas: el problema de los bordes

\`orders.created_at\` es un \`timestamptz\`: fecha **y hora**. Comparar con una fecha sola tiene una trampa:

\`\`\`sql
-- MAL: excluye casi todo el 31 de marzo
WHERE created_at BETWEEN '2025-03-01' AND '2025-03-31'
\`\`\`

\`'2025-03-31'\` se interpreta como las **00:00:00** de ese día; los pedidos de las 15:00 quedan afuera. La forma robusta es un rango **semiabierto**: mayor o igual al inicio y **menor** que el día siguiente.

\`\`\`sql
-- BIEN: todo marzo, sin importar la hora
WHERE created_at >= '2025-03-01'
  AND created_at <  '2025-04-01'
\`\`\`

Funciona igual con fechas sin hora (\`date\`) y evita pensar en «23:59:59».

## Funciones de fecha útiles

- \`created_at::date\` convierte a fecha (descarta la hora).
- \`date_trunc('month', created_at)\` devuelve el primer instante del mes.
- \`extract(year from created_at)\` devuelve el año como número.

Cuidado: aplicar una función a la columna en el \`WHERE\` (\`WHERE created_at::date = '2025-03-15'\`) es legible, pero impide usar el índice de la columna. Para rangos, prefiere la comparación directa.

## Zonas horarias

Un \`timestamptz\` guarda un instante absoluto. «El 15 de marzo» depende de la zona horaria desde la que se mira; en este curso el sandbox trabaja en UTC. En tu empresa, acuerda con el equipo la zona de referencia para los reportes.

## Ejemplo resuelto

Pedido: «Pedidos de la primera quincena de marzo de 2025 (del 1 al 15 inclusive)».

\`\`\`sql
SELECT id, created_at, total_amount
FROM orders
WHERE created_at >= '2025-03-01'
  AND created_at <  '2025-03-16';
\`\`\`

El límite superior es el **16** a las 00:00, excluido: así entra todo el día 15.
`,
  },
];
