import type { LessonDef } from "../schemas/curriculum";

export const lessons: LessonDef[] = [
  {
    slug: "order-by-varias-claves",
    section: "ordenar-y-limitar",
    kind: "theory",
    title: "ORDER BY: una o varias claves",
    sort_order: 0,
    estimated_minutes: 10,
    is_free: false,
    is_published: true,
    prerequisites: ["alias-y-expresiones-basico"],
    dataset: "tiendaviva",
    body_md: `## Por qué importa

Un reporte no se entrega «como salga». El negocio pide «los pedidos más grandes primero», «el catálogo por vendedor y dentro de cada vendedor del más caro al más barato», «los clientes más nuevos arriba». Ese orden es parte de la respuesta, no un detalle estético.

Y hay algo más importante: **sin \`ORDER BY\` no hay orden garantizado**. PostgreSQL devuelve las filas en el orden que le resulte conveniente, y ese orden puede cambiar entre ejecuciones, después de un \`UPDATE\` o al cambiar el plan de ejecución. Si el orden importa, se escribe.

## El concepto

\`ORDER BY\` va al final de la consulta y recibe una lista de claves de ordenamiento:

\`\`\`sql
SELECT id, full_name, country, signup_at
FROM customers
ORDER BY signup_at DESC;
\`\`\`

\`ASC\` (ascendente) es el valor por omisión: de menor a mayor, de la A a la Z, de la fecha más antigua a la más reciente. \`DESC\` invierte cada clave **por separado**.

## Varias claves

Cuando la primera clave empata, decide la segunda:

\`\`\`sql
SELECT id, seller_id, name, list_price
FROM products
WHERE is_active
ORDER BY seller_id ASC, list_price DESC;
\`\`\`

Se leen de izquierda a derecha: primero agrupa visualmente por vendedor y, dentro de cada vendedor, muestra primero el producto más caro. Nota que \`ASC\` y \`DESC\` se aplican a cada clave: \`ORDER BY a, b DESC\` ordena \`a\` ascendente y \`b\` descendente.

### Desempate determinista

Si dos filas empatan en **todas** las claves, su orden relativo es arbitrario y puede variar entre ejecuciones. Para que un reporte sea reproducible, cierra el \`ORDER BY\` con una clave única (normalmente la clave primaria):

\`\`\`sql
ORDER BY list_price DESC, id ASC
\`\`\`

## Ordenar por alias o por expresión

\`ORDER BY\` se evalúa **después** del \`SELECT\`, así que puede usar los alias definidos allí:

\`\`\`sql
SELECT id, total_amount - shipping_fee AS net_amount
FROM orders
ORDER BY net_amount DESC;
\`\`\`

También acepta la expresión completa (\`ORDER BY total_amount - shipping_fee DESC\`) o una columna que ni siquiera aparece en el \`SELECT\`. Esto último es válido y a veces útil, aunque dificulta la lectura: quien mira el resultado no ve por qué está ordenado así.

Existe una tercera forma, ordenar por posición (\`ORDER BY 2 DESC\`, la segunda columna del \`SELECT\`). Funciona, pero se rompe en silencio apenas alguien agrega o reordena una columna. Prefiere el alias.

## Textos, mayúsculas y acentos

El orden de los textos depende de la colación de la base. En la configuración habitual, «árbol» queda junto a «arbol» y las mayúsculas no alteran el orden alfabético, pero no lo des por sentado entre motores distintos. Si necesitas un criterio explícito, normaliza: \`ORDER BY lower(name)\`.

## Resumen

- Sin \`ORDER BY\` el orden no está garantizado, aunque hoy «se vea bien».
- Las claves se evalúan de izquierda a derecha y cada una tiene su propio \`ASC\`/\`DESC\`.
- Cierra con una columna única para que el reporte sea reproducible.
`,
  },
  {
    slug: "order-by-y-nulos",
    section: "ordenar-y-limitar",
    kind: "theory",
    title: "NULL en el ordenamiento",
    sort_order: 1,
    estimated_minutes: 8,
    is_free: false,
    is_published: true,
    prerequisites: ["order-by-varias-claves", "null-logica-de-tres-valores"],
    dataset: "tiendaviva",
    body_md: `## Por qué importa

Pides «los vendedores mejor calificados primero» y arriba del reporte aparecen doce tiendas **sin calificación**. No es un error del motor: es la regla por omisión de PostgreSQL, y desconocerla produce rankings equivocados que llegan a una reunión.

## La regla

Para ordenar, PostgreSQL trata a NULL como **mayor que cualquier valor**. De ahí se deduce todo:

| Cláusula | Posición de los NULL |
| --- | --- |
| \`ORDER BY rating ASC\` | al final (equivale a \`NULLS LAST\`) |
| \`ORDER BY rating DESC\` | al principio (equivale a \`NULLS FIRST\`) |

Es decir: el caso peligroso es \`DESC\`, que es justamente el que usan casi todos los rankings.

## Cómo controlarlo

Agrega \`NULLS FIRST\` o \`NULLS LAST\` después de la dirección, por cada clave:

\`\`\`sql
SELECT id, store_name, rating
FROM sellers
ORDER BY rating DESC NULLS LAST, store_name ASC;
\`\`\`

Ahora el ranking empieza por la mejor calificación real y los vendedores sin reseñas quedan al final, que es lo que pedía el negocio.

## Decide qué significa el NULL

Antes de escribir la cláusula, responde una pregunta de negocio: ¿«sin calificación» es lo mismo que «mala calificación»?

- Si **no** lo es, deja los NULL al final con \`NULLS LAST\` (o exclúyelos con \`WHERE rating IS NOT NULL\` si el reporte es solo de tiendas evaluadas).
- Si quieres verlos primero porque son los casos a revisar, usa \`NULLS FIRST\` de forma explícita.

Cualquiera de las dos es correcta; lo que no es correcto es que la posición de los NULL sea un accidente.

## Alternativas

\`NULLS LAST\` es la forma directa y la que debes preferir. Conviene conocer dos variantes que aparecen en código heredado:

\`\`\`sql
ORDER BY (rating IS NULL) ASC, rating DESC   -- falso (0) antes que verdadero (1)
ORDER BY COALESCE(rating, -1) DESC           -- reemplaza el NULL por un valor extremo
\`\`\`

La primera es equivalente y portable. La segunda es riesgosa: elige un valor centinela que puede colisionar con datos reales y cambia el valor mostrado si olvidas separar la columna del criterio de orden.

## Un detalle útil

Los NULL también participan del desempate. Si dos filas tienen \`rating\` NULL, siguen compitiendo por la segunda clave: por eso el ejemplo cierra con \`store_name\`.

## Resumen

- En \`ASC\` los NULL van al final; en \`DESC\`, al principio.
- \`NULLS FIRST\` / \`NULLS LAST\` lo hacen explícito, clave por clave.
- La posición de los NULL es una decisión de negocio; documéntala en la consulta.
`,
  },
  {
    slug: "limit-offset-y-top-n",
    section: "ordenar-y-limitar",
    kind: "theory",
    title: "LIMIT, OFFSET y top-N",
    sort_order: 2,
    estimated_minutes: 9,
    is_free: false,
    is_published: true,
    prerequisites: ["order-by-varias-claves"],
    dataset: "tiendaviva",
    body_md: `## Por qué importa

«Dame los 10 pedidos más grandes de México», «muéstrame la página 3 del listado», «quiero espiar 5 filas para entender la tabla». Las tres son pedidos de recorte, y el recorte se hace con \`LIMIT\`.

## El concepto

\`\`\`sql
SELECT id, customer_id, total_amount
FROM orders
WHERE currency = 'MXN'
ORDER BY total_amount DESC, id ASC
LIMIT 10;
\`\`\`

El orden de ejecución es: \`FROM\` → \`WHERE\` → \`SELECT\` → \`ORDER BY\` → \`LIMIT\`. Primero se filtra y se ordena **todo** el conjunto; recién al final se cortan las 10 primeras filas. Por eso \`LIMIT\` nunca cambia qué filas cumplen el filtro, solo cuántas ves.

## LIMIT sin ORDER BY: la advertencia

\`\`\`sql
SELECT id, total_amount FROM orders LIMIT 10;
\`\`\`

Esto **no** devuelve «los primeros 10 pedidos» ni «los 10 más grandes»: devuelve 10 filas cualesquiera, las que el motor tenga a mano. Es aceptable para mirar la forma de una tabla; es un error si el resultado va a un reporte. Un top-N sin \`ORDER BY\` no es un top-N.

## Paginar con OFFSET

\`OFFSET\` descarta filas antes de aplicar el límite. Con páginas de 10 filas:

\`\`\`sql
SELECT id, name, cuisine
FROM restaurants
WHERE is_active
ORDER BY name ASC, id ASC
LIMIT 10 OFFSET 20;   -- página 3
\`\`\`

La fórmula es \`OFFSET = (página - 1) * tamaño_de_página\`. Página 1 → \`OFFSET 0\`; página 3 con páginas de 10 → \`OFFSET 20\`.

Dos advertencias:

1. **El \`ORDER BY\` debe ser determinista.** Si hay empates sin desempate, una misma fila puede aparecer en dos páginas y otra en ninguna. Por eso el ejemplo cierra con \`id\`.
2. **\`OFFSET\` grande es caro.** El motor igual produce y descarta las filas saltadas: \`OFFSET 100000\` lee cien mil filas para devolver diez.

## Empates en el borde del top-N

\`LIMIT 10\` corta en la fila 10 aunque la 11 tenga exactamente el mismo valor. Si el negocio necesita «todos los que empatan en el décimo puesto», \`LIMIT\` no alcanza: eso se resuelve con funciones de ventana (\`RANK\`, sección 21). Mientras tanto, sé explícito en el reporte: «10 primeros, desempate por id».

## La sintaxis estándar

\`LIMIT\`/\`OFFSET\` es la forma de PostgreSQL y MySQL. El estándar SQL usa \`FETCH FIRST n ROWS ONLY\`, que PostgreSQL también acepta:

\`\`\`sql
ORDER BY total_amount DESC, id ASC
OFFSET 20 FETCH NEXT 10 ROWS ONLY;
\`\`\`

Ambas son válidas. En SQL Server verás \`TOP n\` y en Oracle antiguo, \`ROWNUM\`.

## Resumen

- \`LIMIT\` corta después de ordenar: sin \`ORDER BY\`, las filas son arbitrarias.
- \`OFFSET = (página - 1) * tamaño\`, y siempre con un orden determinista.
- \`LIMIT\` ignora los empates del borde; si importan, necesitas ranking.
`,
  },
];
