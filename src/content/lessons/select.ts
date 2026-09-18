import type { LessonDef } from "../schemas/curriculum";

export const lessons: LessonDef[] = [
  {
    slug: "select-columnas",
    section: "select",
    kind: "theory",
    title: "SELECT: elegir columnas de una tabla",
    sort_order: 0,
    estimated_minutes: 7,
    is_free: true,
    is_published: true,
    prerequisites: [],
    dataset: "tiendaviva",
    body_md: `## Por qué importa

Casi toda tarea de análisis empieza igual: mirar qué hay en una tabla. \`SELECT\` es la instrucción que devuelve columnas de una tabla y la base sobre la que se construye todo lo demás.

## El concepto

\`\`\`sql
SELECT full_name, country
FROM customers;
\`\`\`

Se lee: «dame las columnas \`full_name\` y \`country\` de la tabla \`customers\`». El resultado es una nueva tabla con esas dos columnas y **todas** las filas de \`customers\`. El orden de las columnas en el resultado es el orden en que las escribes.

Tres partes:

- \`SELECT\`: la lista de columnas que quieres ver.
- \`FROM\`: la tabla de donde salen.
- \`;\`: fin de la consulta (opcional cuando envías una sola, pero es buena costumbre).

## SELECT * con criterio

\`SELECT *\` devuelve todas las columnas. Es útil para explorar una tabla nueva:

\`\`\`sql
SELECT *
FROM sellers
LIMIT 5;
\`\`\`

Pero en reportes y en código que otros van a leer conviene listar columnas: el resultado es más claro, más liviano y no cambia si alguien agrega columnas a la tabla. En los ejercicios, la consigna te dirá qué columnas se esperan; \`SELECT *\` normalmente devolverá columnas de más y la validación lo marcará.

## Leer el resultado

Cada resultado muestra el nombre de las columnas, su tipo y las filas. Fíjate en tres cosas: cuántas filas volvieron, si alguna celda dice **NULL** (valor desconocido, lo verás en la sección 8) y si los números y fechas tienen el tipo esperado.

## Ejemplo resuelto

Pedido: «Necesito una lista con nombre y ciudad de los clientes para armar rutas de envío».

1. Tabla: \`customers\` (tiene \`full_name\` y \`city\`).
2. Columnas: \`full_name\`, \`city\`.
3. Filas: todas (no hay filtro pedido).

\`\`\`sql
SELECT full_name, city
FROM customers;
\`\`\`

## Formato que ayuda

- Palabras clave en mayúsculas (\`SELECT\`, \`FROM\`), nombres de columnas en minúsculas.
- Una cláusula por línea cuando la consulta crece.
- Nombres de columna separados por coma **sin** coma final antes de \`FROM\` (error clásico).

## Errores comunes

- Escribir mal el nombre de una columna: el motor responde \`column "nombre" does not exist\`. Revisa el esquema.
- Dejar una coma antes de \`FROM\`: \`SELECT full_name, FROM customers\` falla.
- Esperar que las filas vengan en un orden determinado: sin \`ORDER BY\` (sección 13) el orden no está garantizado.

## En resumen

- \`SELECT columnas FROM tabla;\` devuelve esas columnas para todas las filas.
- Usa \`SELECT *\` para explorar; lista columnas para entregar.
- El orden de columnas lo defines tú; el de filas, solo con \`ORDER BY\`.
`,
  },
  {
    slug: "select-buenas-practicas",
    section: "select",
    kind: "theory",
    title: "Escribir consultas que otros puedan leer",
    sort_order: 1,
    estimated_minutes: 5,
    is_free: true,
    is_published: true,
    prerequisites: ["select-columnas"],
    dataset: "tiendaviva",
    body_md: `## Por qué importa

En un equipo de datos, una consulta se lee muchas más veces de las que se escribe. Las consultas de un reporte mensual viven años. Escribir con claridad es parte del trabajo, no un adorno.

## Convenciones que usaremos

1. **Mayúsculas para palabras clave**, minúsculas para tablas y columnas.
2. **Una cláusula por línea**: \`SELECT\`, \`FROM\`, \`WHERE\`, \`GROUP BY\`, \`ORDER BY\` cada una en su línea.
3. **Una columna por línea** cuando hay más de tres, con la coma al final de cada línea.
4. **Nombres de columna descriptivos** en el resultado (lo verás con alias en la sección 4).
5. **Comentarios breves** cuando la regla de negocio no es obvia.

\`\`\`sql
-- Clientes de México con consentimiento de marketing
SELECT
  id,
  full_name,
  email
FROM customers
WHERE country = 'MX'
  AND marketing_opt_in = TRUE;
\`\`\`

Todavía no vimos \`WHERE\` (sección 6), pero fíjate en la forma: cualquier persona entiende qué hace esta consulta sin ejecutarla.

## Comentarios

- \`-- texto\` comenta hasta el fin de la línea.
- \`/* texto */\` comenta un bloque.

Úsalos para explicar el *por qué* («excluimos cancelados por definición de finanzas»), no el *qué* (el código ya lo dice).

## Ejemplo resuelto

Consulta difícil de leer:

\`\`\`sql
select ID,FULL_NAME,Email,COUNTRY from Customers
\`\`\`

Funciona (PostgreSQL ignora mayúsculas en nombres no entrecomillados), pero mezcla estilos. Versión legible:

\`\`\`sql
SELECT
  id,
  full_name,
  email,
  country
FROM customers;
\`\`\`

## Errores comunes

- Entrecomillar nombres con comillas dobles (\`"Full_Name"\`): PostgreSQL los vuelve sensibles a mayúsculas y la columna deja de encontrarse.
- Usar comillas dobles para texto: los literales de texto van con comillas **simples** (\`'MX'\`).
- Consultas de una sola línea de 200 caracteres.

## En resumen

- Mayúsculas para palabras clave, una cláusula por línea, columnas listadas.
- Comillas simples para texto; evita comillas dobles en nombres.
- Comenta el porqué de las reglas de negocio.
`,
  },
];
