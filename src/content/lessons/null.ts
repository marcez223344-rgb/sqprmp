import type { LessonDef } from "../schemas/curriculum";

const section = "null";

export const lessons: LessonDef[] = [
  {
    slug: "null-logica-de-tres-valores",
    section,
    kind: "theory",
    title: "NULL y la lógica de tres valores",
    sort_order: 0,
    estimated_minutes: 10,
    is_free: true,
    is_published: true,
    prerequisites: ["operadores-precedencia-in-between"],
    dataset: "tiendaviva",
    body_md: `## Por qué importa

En **TiendaViva** hay vendedores sin calificación, reseñas sin comentario y envíos que todavía no llegaron. Eso no es «cero» ni «texto vacío»: es **desconocido** o **no aplica**. SQL lo representa con \`NULL\`, y casi todos los reportes incorrectos que verás en tu carrera involucran un NULL mal tratado.

## Qué es NULL

\`NULL\` es la ausencia de valor. No es 0, no es \`''\`, no es \`FALSE\`. Una columna puede admitirlo (\`rating numeric\`) o prohibirlo (\`store_name text NOT NULL\`).

## La regla que rompe la intuición

Cualquier comparación con NULL devuelve **UNKNOWN** (desconocido), no verdadero ni falso:

\`\`\`sql
NULL = NULL      -- UNKNOWN
NULL <> 5        -- UNKNOWN
NULL > 4         -- UNKNOWN
\`\`\`

\`WHERE\` solo deja pasar filas cuya condición es **TRUE**. UNKNOWN se descarta igual que FALSE. Consecuencias:

- \`WHERE rating = NULL\` no devuelve nada, nunca.
- \`WHERE rating <> 4.5\` **no** incluye a los vendedores sin calificación.
- \`WHERE rating > 4\` (70 filas) y \`WHERE rating <= 4\` (82 filas) **no** suman los 180 vendedores: faltan los 28 con NULL.

## IS NULL e IS NOT NULL

Para preguntar por NULL hay operadores específicos:

\`\`\`sql
SELECT id, store_name
FROM sellers
WHERE rating IS NULL;
\`\`\`

\`IS NOT NULL\` filtra los que sí tienen valor. Nunca uses \`= NULL\` o \`<> NULL\`.

## NOT y NULL

\`NOT UNKNOWN\` sigue siendo UNKNOWN. Por eso \`WHERE NOT (rating > 4)\` **tampoco** incluye los NULL. Si quieres «los que no superan 4, incluidos los sin calificación», dilo explícitamente:

\`\`\`sql
WHERE rating <= 4
   OR rating IS NULL
\`\`\`

## NOT IN con NULL: la trampa clásica

Si la lista de \`NOT IN\` contiene un NULL, la condición es UNKNOWN para **todas** las filas y la consulta no devuelve nada. Ocurre al usar subconsultas (sección 21) sobre columnas que admiten NULL. Filtra los NULL de la lista o usa \`NOT EXISTS\`.

## Ejemplo resuelto

Pedido: «Reseñas negativas (1 o 2 estrellas) que no dejaron comentario, para contactar al cliente».

\`\`\`sql
SELECT id, product_id, customer_id, rating
FROM reviews
WHERE rating <= 2
  AND comment IS NULL;
\`\`\`
`,
  },
  {
    slug: "null-coalesce-y-nullif",
    section,
    kind: "theory",
    title: "Reemplazar y producir NULL: COALESCE y NULLIF",
    sort_order: 1,
    estimated_minutes: 8,
    is_free: true,
    is_published: true,
    prerequisites: ["null-logica-de-tres-valores"],
    dataset: "tiendaviva",
    body_md: `## COALESCE: el primer valor no nulo

\`COALESCE(a, b, c, ...)\` devuelve el primer argumento que no sea NULL. Es la forma estándar de mostrar un valor de negocio en lugar de un hueco:

\`\`\`sql
SELECT
  id,
  store_name,
  COALESCE(rating, 0) AS rating_o_cero
FROM sellers;
\`\`\`

Cuidado con el significado: un 0 «inventado» puede arruinar un promedio. Para un reporte legible está bien; para un cálculo, muchas veces conviene dejar el NULL y que la agregación lo ignore (sección 14).

Con texto:

\`\`\`sql
COALESCE(comment, '(sin comentario)') AS comentario
\`\`\`

Todos los argumentos deben ser del mismo tipo (o convertibles).

## NULLIF: convertir un valor en NULL

\`NULLIF(a, b)\` devuelve NULL si \`a = b\`; si no, devuelve \`a\`. Dos usos típicos:

- Limpiar cadenas vacías: \`NULLIF(trim(comment), '')\`.
- Evitar divisiones por cero: \`total / NULLIF(cantidad, 0)\` devuelve NULL en lugar de fallar.

## NULL en operaciones

- Aritmética: \`NULL + 1\` es NULL. Un descuento NULL vuelve NULL a todo el total.
- Concatenación: \`'Hola ' || NULL\` es NULL. \`concat()\` ignora los NULL.
- \`ORDER BY\`: en PostgreSQL los NULL van al final en ascendente y al principio en descendente; ajusta con \`NULLS FIRST\` / \`NULLS LAST\`.
- Agregaciones: \`count(columna)\` ignora NULL; \`count(*)\` no. \`avg\` y \`sum\` ignoran NULL (sección 14).

## Ejemplo resuelto

Pedido: «Lista de vendedores con su calificación; los que no tienen, que muestren 0, y que aparezcan primero los mejor calificados».

\`\`\`sql
SELECT
  id,
  store_name,
  COALESCE(rating, 0) AS rating_o_cero
FROM sellers
ORDER BY rating_o_cero DESC, id;
\`\`\`

El alias sí puede usarse en \`ORDER BY\`. El segundo criterio (\`id\`) vuelve el orden determinista cuando hay empates.
`,
  },
];
