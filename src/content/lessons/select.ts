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

Casi toda tarea de análisis empieza de la misma forma: mirar qué hay guardado en una tabla. Una **tabla** es un conjunto de datos organizado como una planilla dentro de la base de datos: tiene columnas con nombre (por ejemplo \`full_name\`, el nombre completo del cliente) y una fila por cada registro. Para pedirle datos a esa tabla escribes una **consulta**, es decir, una instrucción en SQL (por *Structured Query Language*, lenguaje estructurado de consultas) que describe qué quieres ver. \`SELECT\` es la palabra con la que empieza esa instrucción, y todo lo que aprendas más adelante se apoya en ella.

## El concepto

\`\`\`sql
SELECT full_name, country
FROM customers;
\`\`\`

Esa consulta se lee así: «dame las columnas \`full_name\` y \`country\` de la tabla \`customers\`». En TiendaViva, \`customers\` es la tabla de clientes: \`full_name\` guarda el nombre completo de la persona y \`country\` el país donde vive. El resultado es una tabla nueva, que existe solo mientras miras el resultado, con esas dos columnas y **todas** las filas de \`customers\`. Las columnas salen en el mismo orden en que las escribiste.

La consulta tiene tres partes:

- \`SELECT\`: la lista de columnas que quieres ver, separadas por comas.
- \`FROM\`: la tabla de donde salen esas columnas.
- \`;\`: el punto y coma marca el final de la consulta. Puedes omitirlo cuando envías una sola, pero conviene escribirlo desde la primera vez.

## SELECT * con criterio

El asterisco \`*\` significa «todas las columnas», así que \`SELECT *\` devuelve la tabla completa sin que tengas que escribir un nombre por columna. Es útil cuando estás explorando una tabla que todavía no conoces:

\`\`\`sql
SELECT *
FROM sellers
LIMIT 5;
\`\`\`

En un reporte, o en código que otras personas van a leer, conviene escribir la lista de columnas. El resultado queda más claro, viaja menos información y la consulta sigue devolviendo lo mismo aunque mañana alguien agregue una columna nueva a la tabla. En los ejercicios de este curso la consigna te dirá qué columnas se esperan, así que \`SELECT *\` normalmente devolverá columnas de más y la validación lo marcará como incorrecto.

## Leer el resultado

Cada resultado muestra el nombre de las columnas, su tipo de dato y las filas encontradas. Fíjate en tres cosas: cuántas filas volvieron, si alguna celda dice **NULL**, que es la forma en que SQL representa un valor ausente o desconocido (lo trabajarás en la sección 8), y si los números y las fechas tienen el tipo que esperabas.

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
- Nombres de columna separados por coma, **sin** dejar una coma suelta antes de \`FROM\`. Es uno de los errores más frecuentes y el motor responde con un error de sintaxis.

## Errores comunes

- Escribir mal el nombre de una columna: el motor responde \`column "nombre" does not exist\`, que significa «la columna "nombre" no existe». Revisa el esquema y corrige el nombre.
- Dejar una coma antes de \`FROM\`: \`SELECT full_name, FROM customers\` falla.
- Esperar que las filas vengan en un orden determinado: sin \`ORDER BY\`, la cláusula que ordena el resultado (sección 13), el motor devuelve las filas en el orden que le resulte más conveniente y ese orden puede cambiar entre una ejecución y otra.

## Resumen

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

En un equipo de datos, una consulta se lee muchas más veces de las que se escribe: la escribes una vez y después la revisan tus colegas, la audita el área de finanzas y tú mismo vuelves a ella meses más tarde. Las consultas de un reporte mensual suelen seguir en uso durante años. Por eso escribir con claridad no es un detalle estético: es lo que evita que alguien interprete mal el número que entregaste.

## Convenciones que usaremos

1. **Mayúsculas para palabras clave**, minúsculas para tablas y columnas.
2. **Una cláusula por línea**: \`SELECT\`, \`FROM\`, \`WHERE\`, \`GROUP BY\`, \`ORDER BY\` cada una en su línea.
3. **Una columna por línea** cuando hay más de tres, con la coma al final de cada línea.
4. **Nombres de columna descriptivos** en el resultado. Se consiguen con un alias, es decir, un nombre alternativo que le das a una columna de la salida (sección 4).
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

Todavía no vimos \`WHERE\`, la cláusula que se queda solo con las filas que cumplen una condición (sección 6), pero fíjate en la forma: cualquier persona entiende qué hace esta consulta sin necesidad de ejecutarla.

## Comentarios

- \`-- texto\` comenta hasta el fin de la línea.
- \`/* texto */\` comenta un bloque.

Úsalos para explicar el *por qué* («excluimos cancelados por definición de finanzas»), no el *qué* (el código ya lo dice).

## Ejemplo resuelto

Consulta difícil de leer:

\`\`\`sql
select ID,FULL_NAME,Email,COUNTRY from Customers
\`\`\`

Funciona, porque PostgreSQL trata igual las mayúsculas y las minúsculas en los nombres escritos sin comillas, pero mezcla estilos y obliga a leer con más atención. Versión legible:

\`\`\`sql
SELECT
  id,
  full_name,
  email,
  country
FROM customers;
\`\`\`

## Errores comunes

- Usar comillas dobles en los nombres de columna (\`"Full_Name"\`): PostgreSQL los vuelve sensibles a mayúsculas y la columna deja de encontrarse.
- Usar comillas dobles para texto: los literales de texto van con comillas **simples** (\`'MX'\`).
- Escribir toda la consulta en una sola línea de 200 caracteres: quien la revise tiene que recorrerla entera para encontrar la cláusula que le interesa.

## Resumen

- Mayúsculas para palabras clave, una cláusula por línea, columnas listadas.
- Comillas simples para texto; evita comillas dobles en nombres.
- Comenta el porqué de las reglas de negocio.
`,
  },
];
