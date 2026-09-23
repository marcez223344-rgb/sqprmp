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

En **TiendaViva** hay vendedores que todavía no recibieron ninguna calificación, reseñas que el cliente dejó sin comentario y envíos que todavía no llegaron. En esos casos la columna no guarda un cero ni un texto vacío: no guarda nada, porque el valor **no se conoce** o **no aplica todavía**.

SQL representa esa ausencia con \`NULL\`. Aprender cómo se comporta es obligatorio porque una parte muy grande de los reportes incorrectos que vas a ver en tu carrera se explica por un NULL mal tratado, y el síntoma es siempre el mismo: la consulta no falla, simplemente devuelve menos filas de las que debería.

## Qué es NULL

\`NULL\` significa «no sabemos el valor». No es el número 0, no es la cadena de texto vacía \`''\` y no es \`FALSE\`.

La diferencia es de negocio, no de forma. Un vendedor con \`rating = 0\` es un vendedor al que sus clientes calificaron pésimo; un vendedor con \`rating\` en NULL es un vendedor al que todavía nadie calificó. Son dos situaciones distintas y conviene que el reporte las distinga.

Al definir una tabla se decide si cada columna admite la ausencia de valor (\`rating numeric\`) o la prohíbe (\`store_name text NOT NULL\`).

## La regla que rompe la intuición

Cualquier comparación con NULL devuelve **UNKNOWN** (desconocido), que no es ni verdadero ni falso:

\`\`\`sql
NULL = NULL      -- UNKNOWN
NULL <> 5        -- UNKNOWN
NULL > 4         -- UNKNOWN
\`\`\`

La razón es la misma en los tres casos: si no sabes cuál es el valor, tampoco puedes saber si cumple la comparación. «¿El vendedor sin calificación tiene más de 4 estrellas?» no tiene respuesta, y eso es exactamente lo que devuelve SQL.

Fíjate en el primero, porque es el que más sorprende: comparar NULL con NULL usando \`=\` tampoco da verdadero. Dos valores desconocidos no son «iguales»; siguen siendo dos incógnitas.

\`WHERE\` solo deja pasar las filas cuya condición resulta **TRUE**. Una condición UNKNOWN se descarta igual que una FALSE. Las consecuencias prácticas son estas:

- \`WHERE rating = NULL\` no devuelve ninguna fila, nunca, ni siquiera las que tienen NULL.
- \`WHERE rating <> 4.5\` **no** incluye a los vendedores sin calificación, aunque es evidente que su calificación no es 4.5.
- \`WHERE rating > 4\` devuelve 70 filas y \`WHERE rating <= 4\` devuelve 82, pero entre las dos no suman los 180 vendedores de la tabla: faltan los 28 que tienen NULL, que ninguna de las dos condiciones deja pasar.

Ese tercer caso es el peligroso. Si publicas los dos grupos como «vendedores buenos» y «vendedores regulares», tu informe pierde 28 vendedores sin avisarte.

## IS NULL e IS NOT NULL

Como \`=\` no sirve para preguntar por la ausencia de valor, SQL tiene un operador específico:

\`\`\`sql
SELECT id, store_name
FROM sellers
WHERE rating IS NULL;
\`\`\`

\`IS NULL\` es verdadero cuando la columna no tiene valor, e \`IS NOT NULL\` es verdadero cuando sí lo tiene. Estas dos formas sí devuelven TRUE o FALSE, nunca UNKNOWN. Nunca escribas \`= NULL\` ni \`<> NULL\`.

## NOT y NULL

Negar un valor desconocido deja un valor desconocido: \`NOT UNKNOWN\` sigue siendo UNKNOWN. Por eso \`WHERE NOT (rating > 4)\` **tampoco** incluye a los vendedores sin calificación, aunque a primera vista parezca que debería incluir «todo lo demás».

Si lo que quieres es «los que no superan 4 estrellas, incluidos los que todavía no tienen calificación», tienes que pedirlo de forma explícita:

\`\`\`sql
WHERE rating <= 4
   OR rating IS NULL
\`\`\`

## NOT IN con NULL: la trampa clásica

Si la lista que le pasas a \`NOT IN\` contiene aunque sea un NULL, la condición resulta UNKNOWN para **todas** las filas y la consulta devuelve cero resultados. No hay error ni advertencia: la consulta «funciona» y el resultado es una tabla vacía.

Esto aparece sobre todo al usar subconsultas (sección 21) sobre columnas que admiten NULL. La solución es filtrar los NULL de la lista o reescribir la condición con \`NOT EXISTS\`.

## Ejemplo resuelto

Pedido del área de atención al cliente: «Quiero las reseñas negativas, de 1 o 2 estrellas, que no dejaron comentario, para contactar al cliente y entender qué pasó».

\`\`\`sql
SELECT id, product_id, customer_id, rating
FROM reviews
WHERE rating <= 2
  AND comment IS NULL;
\`\`\`

La condición \`comment IS NULL\` es la única forma de pedir «sin comentario». Escribirla como \`comment = NULL\` habría devuelto una tabla vacía y te habría hecho creer que todas las reseñas negativas tienen comentario.
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

\`COALESCE(a, b, c, ...)\` recorre sus argumentos de izquierda a derecha y devuelve el primero que no sea NULL. Es la forma estándar de mostrar un valor con sentido de negocio donde la tabla tiene un hueco:

\`\`\`sql
SELECT
  id,
  store_name,
  COALESCE(rating, 0) AS rating_o_cero
FROM sellers;
\`\`\`

Ahí, cada vendedor sin calificación aparece con un 0 en lugar de una celda vacía.

Ten cuidado con lo que ese 0 significa. Es un valor que inventaste tú, no un dato: si después calculas el promedio de esa columna, los vendedores que todavía nadie calificó van a bajar el promedio como si los hubieran calificado pésimo. Para un reporte que solo se lee está bien; para un cálculo, muchas veces conviene dejar el NULL y que la función de agregación lo ignore por su cuenta (sección 14).

Con texto funciona igual:

\`\`\`sql
COALESCE(comment, '(sin comentario)') AS comentario
\`\`\`

Todos los argumentos tienen que ser del mismo tipo de dato, o al menos de tipos que PostgreSQL pueda convertir entre sí.

## NULLIF: convertir un valor en NULL

\`NULLIF(a, b)\` hace lo contrario: devuelve NULL si \`a\` es igual a \`b\`, y en cualquier otro caso devuelve \`a\`. Sirve para declarar que cierto valor concreto en realidad significa «no hay dato». Dos usos habituales:

- **Limpiar cadenas vacías**: \`NULLIF(trim(comment), '')\` convierte en NULL los comentarios que quedaron vacíos o que solo tienen espacios, para que el resto de la consulta tenga que tratar un solo caso de «sin comentario» en lugar de dos.
- **Evitar divisiones por cero**: \`total / NULLIF(cantidad, 0)\` devuelve NULL cuando la cantidad es cero, en lugar de cortar la consulta con un error.

## NULL en operaciones

- **Aritmética**: \`NULL + 1\` es NULL. Si el descuento de un pedido es NULL, el total calculado a partir de él también queda en NULL, y esa fila desaparece de cualquier suma.
- **Concatenación de texto**: \`'Hola ' || NULL\` es NULL, así que basta un dato faltante para vaciar toda la cadena. La función \`concat()\` no tiene ese problema porque ignora los NULL.
- **Orden**: en PostgreSQL los NULL se ubican al final cuando ordenas de menor a mayor y al principio cuando ordenas de mayor a menor. Puedes cambiarlo con \`NULLS FIRST\` o \`NULLS LAST\`.
- **Agregaciones**: \`count(columna)\` cuenta solo los valores presentes, mientras que \`count(*)\` cuenta todas las filas; la resta entre ambos es la cantidad de NULL. \`avg\` y \`sum\` también ignoran los NULL (sección 14).

## Ejemplo resuelto

Pedido: «Dame la lista de vendedores con su calificación; los que no tienen calificación que muestren 0, y que aparezcan primero los mejor calificados».

\`\`\`sql
SELECT
  id,
  store_name,
  COALESCE(rating, 0) AS rating_o_cero
FROM sellers
ORDER BY rating_o_cero DESC, id;
\`\`\`

Dos detalles de esa consulta. El alias \`rating_o_cero\` sí se puede usar dentro de \`ORDER BY\`, aunque no se pueda usar en \`WHERE\`. Y el segundo criterio de orden, \`id\`, existe para que el resultado sea siempre el mismo: cuando varios vendedores tienen la misma calificación, sin un criterio de desempate el motor puede devolverlos en cualquier orden y la lista cambia de una ejecución a otra.
`,
  },
];
