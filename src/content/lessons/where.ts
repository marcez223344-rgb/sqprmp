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

Casi ninguna pregunta de negocio se responde con la tabla completa. Lo que te piden siempre es un recorte: los clientes de Uruguay, los productos sin stock, los pedidos cancelados. La cláusula \`WHERE\` es la parte de la consulta que hace ese recorte, porque le indica al motor qué filas conservar y cuáles descartar. Con ella, una tabla de miles de filas se convierte en la respuesta a una pregunta concreta.

## El concepto

\`\`\`sql
SELECT id, full_name, city
FROM customers
WHERE country = 'UY';
\`\`\`

\`WHERE\` va después de \`FROM\` y contiene una **condición**, es decir, una comparación que da como resultado verdadero o falso. PostgreSQL la evalúa una vez por cada fila de la tabla y conserva solo las filas donde el resultado es verdadero. En este ejemplo, de todas las filas de \`customers\` quedan únicamente aquellas cuya columna \`country\` contiene el texto \`'UY'\`, o sea, los clientes de Uruguay.

Las comparaciones que puedes usar son \`=\` (igual), \`<>\` (distinto, que también se escribe \`!=\`), \`<\` (menor), \`<=\` (menor o igual), \`>\` (mayor) y \`>=\` (mayor o igual).

## Texto, números y booleanos

- Los textos van entre **comillas simples** y distinguen mayúsculas de minúsculas, así que \`'UY'\` y \`'uy'\` son dos valores diferentes para el motor.
- Los números van sin comillas: \`stock = 0\`.
- Los **booleanos** son columnas que solo pueden valer verdadero o falso. Puedes compararlas con \`TRUE\` o \`FALSE\`, o escribir la columna sola: \`WHERE is_active\` significa exactamente lo mismo que \`WHERE is_active = TRUE\`.

\`\`\`sql
SELECT id, name, stock
FROM products
WHERE stock = 0
  AND is_active;
\`\`\`

## Combinar condiciones

- \`AND\`: ambas condiciones deben cumplirse en la misma fila.
- \`OR\`: alcanza con que se cumpla una de las dos.
- \`NOT\`: invierte la condición, de verdadero a falso y al revés.

Escribe cada condición en su propia línea, con sangría, para que la lista se lea de un vistazo. En la sección 7 verás por qué, cuando mezclas \`AND\` y \`OR\` en la misma consulta, hacen falta paréntesis para que el resultado sea el que esperas.

## Alias en WHERE

Un **alias** es el nombre que le das a una columna del resultado con \`AS\`, por ejemplo \`subtotal - discount AS neto\`. PostgreSQL evalúa el \`WHERE\` antes de armar la lista de columnas del \`SELECT\`, así que en ese momento el alias todavía no existe y no puedes usarlo para filtrar. Cuando necesites filtrar por una expresión, repítela completa dentro del \`WHERE\`:

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

- Comparar texto usando comillas dobles (\`"UY"\`). PostgreSQL interpreta las comillas dobles como el nombre de una columna, no como un texto, y la consulta falla.
- Escribir \`WHERE country = UY\` sin comillas. El motor busca una columna llamada \`uy\` y responde «column uy does not exist».
- Comparar con NULL usando \`=\`. NULL significa «valor desconocido», y una comparación contra un valor desconocido nunca da verdadero, así que la fila nunca pasa el filtro (lo vemos en detalle en la sección 8).
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

Cuando no conoces el valor exacto que buscas, en lugar de \`=\` usas \`LIKE\` con un **patrón**, es decir, un texto que incluye caracteres comodín:

- \`%\` representa cualquier secuencia de caracteres, incluida la secuencia vacía.
- \`_\` representa exactamente un carácter.

\`\`\`sql
SELECT id, store_name
FROM sellers
WHERE store_name LIKE 'Bazar%';
\`\`\`

Ese patrón encuentra todas las tiendas cuyo nombre empieza con «Bazar», sin importar cómo siga.

\`LIKE\` distingue mayúsculas de minúsculas, así que el patrón \`'bazar%'\` no encontraría «Bazar del Sur». Para ignorar esa diferencia existe \`ILIKE\`, una extensión propia de PostgreSQL que no está en otros motores y que hace la misma búsqueda sin distinguir mayúsculas de minúsculas.

Un patrón que empieza con \`%\`, como \`'%urbano%'\`, encuentra el texto en cualquier posición, y por eso resulta cómodo. El costo aparece en tablas grandes: el motor no puede usar el **índice** de la columna, que es una estructura auxiliar ordenada que le permite saltar directo a los valores buscados en lugar de leer toda la tabla. Sin índice tiene que revisar fila por fila y la consulta se vuelve lenta.

## Fechas: el problema de los bordes

\`orders.created_at\` es la columna \`created_at\` de la tabla \`orders\`, y guarda el instante en que se creó cada pedido. Su tipo es \`timestamptz\`, que significa fecha **y hora** con zona horaria. Comparar una columna que tiene hora contra una fecha sola esconde una trampa:

\`\`\`sql
-- MAL: excluye casi todo el 31 de marzo
WHERE created_at BETWEEN '2025-03-01' AND '2025-03-31'
\`\`\`

El texto \`'2025-03-31'\` se convierte en las **00:00:00** de ese día. Un pedido creado a las 15:00 del 31 de marzo es posterior a ese límite superior y queda afuera del resultado. Pierdes casi un día entero de ventas y el motor no te avisa con ningún error.

La forma robusta es usar un rango **semiabierto**: mayor o igual al primer instante del período y **menor** que el primer instante del período siguiente.

\`\`\`sql
-- BIEN: todo marzo, sin importar la hora
WHERE created_at >= '2025-03-01'
  AND created_at <  '2025-04-01'
\`\`\`

Este rango funciona igual con columnas de tipo \`date\` (fecha sin hora) y te evita escribir límites como «23:59:59», que además dejarían afuera los microsegundos posteriores.

## Funciones de fecha útiles

- \`created_at::date\` convierte el valor a fecha y descarta la hora.
- \`date_trunc('month', created_at)\` devuelve el primer instante del mes al que pertenece esa fecha, por ejemplo \`2025-03-01 00:00\` para cualquier pedido de marzo.
- \`extract(year from created_at)\` devuelve el año como número.

Filtrar así tiene un costo: si aplicas una función a la columna dentro del \`WHERE\`, como en \`WHERE created_at::date = '2025-03-15'\`, la consulta se lee bien, pero el motor tiene que calcular esa función en cada fila y no puede usar el índice de la columna. Para acotar períodos, prefiere la comparación directa por rango.

## Zonas horarias

Un valor \`timestamptz\` guarda un instante absoluto, el mismo momento para todo el mundo. Qué día del calendario es ese instante depende de la zona horaria desde la que lo mires: un pedido de las 23:30 en Buenos Aires ya pertenece al día siguiente si lo miras en UTC. En este curso el simulador trabaja siempre en UTC, de modo que tus resultados son reproducibles. En tu empresa, acuerda con el equipo cuál es la zona de referencia de los reportes y déjala escrita.

## Ejemplo resuelto

Pedido: «Pedidos de la primera quincena de marzo de 2025 (del 1 al 15 inclusive)».

\`\`\`sql
SELECT id, created_at, total_amount
FROM orders
WHERE created_at >= '2025-03-01'
  AND created_at <  '2025-03-16';
\`\`\`

El límite superior es el día **16** a las 00:00 y está excluido, así que entran todos los pedidos del día 15 a cualquier hora.

## Próximos pasos

**Lo que ya puedes hacer:** Sabes filtrar filas por igualdad, rango y patrón, combinar condiciones con AND, OR y NOT y filtrar fechas sin perder registros en los bordes.

**Antes de seguir:** resuelve los ejercicios y el quiz de esta sección.

**Lo que sigue:** Sección 7 · Operadores de comparación y lógicos. Vas a ver en qué orden se evalúan AND y OR, y a usar IN y BETWEEN.

**Para practicar (opcional):** ¿Qué transferencias de Bolsillo fallaron en agosto de 2025? En \`transfers\`, filtra \`status\` igual a \`'failed'\` y \`created_at\` en ese mes.
`,
  },
];
