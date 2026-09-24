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

Un reporte no se entrega en el orden en que salieron las filas. El negocio pide «los pedidos más grandes primero», «el catálogo por vendedor y, dentro de cada vendedor, del más caro al más barato», «los clientes más nuevos arriba». Ese orden es parte de la respuesta, no una decisión estética.

Hay una segunda razón, más importante: **sin \`ORDER BY\` no hay ningún orden garantizado**. PostgreSQL devuelve las filas en el orden que le resulte más conveniente para ejecutar la consulta, y ese orden puede cambiar de una ejecución a otra, después de que alguien actualice la tabla o cuando el motor elige otro plan de ejecución. Si hoy «se ve bien» sin ordenar, es una coincidencia que puede romperse mañana sin que nadie toque la consulta. Cuando el orden importa, se escribe.

## El concepto

\`ORDER BY\` va al final de la consulta y recibe una lista de **claves de ordenamiento**, es decir, las columnas o expresiones por las que quieres ordenar, en orden de prioridad:

\`\`\`sql
SELECT id, full_name, country, signup_at
FROM customers
ORDER BY signup_at DESC;
\`\`\`

\`ASC\` (ascendente) es el valor por omisión, o sea, el que el motor aplica si no escribes nada: de menor a mayor, de la A a la Z y de la fecha más antigua a la más reciente. \`DESC\` (descendente) invierte ese sentido, y lo hace **en cada clave por separado**.

## Varias claves

Cuando dos filas tienen el mismo valor en la primera clave, decide la segunda:

\`\`\`sql
SELECT id, seller_id, name, list_price
FROM products
WHERE is_active
ORDER BY seller_id ASC, list_price DESC;
\`\`\`

Las claves se leen de izquierda a derecha: el resultado queda agrupado visualmente por vendedor y, dentro de cada vendedor, aparece primero el producto más caro. El \`ASC\` y el \`DESC\` van pegados a cada clave, de modo que \`ORDER BY a, b DESC\` ordena \`a\` de forma ascendente y \`b\` de forma descendente.

### Desempate determinista

Si dos filas tienen el mismo valor en **todas** las claves que escribiste, cuál va primero queda librado al motor y puede cambiar entre ejecuciones. En la práctica eso significa que el mismo reporte, corrido dos veces, entrega las filas en distinto orden y nadie puede comparar una versión con la otra.

Para evitarlo, cierra el \`ORDER BY\` con una clave que nunca se repita, normalmente la clave primaria (PK, por *primary key*, su nombre en inglés):

\`\`\`sql
ORDER BY list_price DESC, id ASC
\`\`\`

## Ordenar por alias o por expresión

\`ORDER BY\` se evalúa **después** del \`SELECT\`, así que en ese momento los alias ya existen y puedes usarlos:

\`\`\`sql
SELECT id, total_amount - shipping_fee AS net_amount
FROM orders
ORDER BY net_amount DESC;
\`\`\`

También acepta la expresión completa (\`ORDER BY total_amount - shipping_fee DESC\`) o incluso una columna que no aparece en el \`SELECT\`. Esta última forma es válida y a veces útil, pero dificulta la lectura: quien recibe el resultado ve las filas ordenadas y no encuentra en el reporte la columna que explica ese orden.

Existe una tercera forma, ordenar por la posición de la columna (\`ORDER BY 2 DESC\` se refiere a la segunda columna del \`SELECT\`). Funciona, pero cambia de significado sin avisar apenas alguien agrega o reordena una columna, y el reporte pasa a estar ordenado por otra cosa sin ningún error. Prefiere el alias.

## Textos, mayúsculas y acentos

El orden de los textos depende de la **colación** de la base (*collation* en inglés), que es la regla de comparación alfabética configurada en el servidor. En la configuración habitual, «árbol» queda junto a «arbol» y las mayúsculas no alteran el orden alfabético, pero eso no es igual en todos los motores ni en todas las instalaciones. Si necesitas un criterio explícito y estable, normaliza el texto dentro del ordenamiento: \`ORDER BY lower(name)\`.

## Resumen

- Sin \`ORDER BY\` el orden no está garantizado, aunque hoy se vea correcto.
- Las claves se evalúan de izquierda a derecha y cada una tiene su propio \`ASC\` o \`DESC\`.
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

Pides «los vendedores mejor calificados primero» y arriba del reporte aparecen doce tiendas **sin calificación**, es decir, tiendas cuya columna \`rating\` tiene NULL porque todavía nadie las evaluó. No es un error del motor: es la regla que PostgreSQL aplica por omisión cuando no le dices dónde poner los NULL. La consecuencia es un ranking equivocado que puede llegar a una reunión, encabezado justamente por las tiendas de las que no sabes nada.

## La regla

Para ordenar, PostgreSQL trata al NULL como si fuera **mayor que cualquier valor**. De ahí se deduce todo lo demás:

| Cláusula | Posición de los NULL |
| --- | --- |
| \`ORDER BY rating ASC\` | al final (equivale a \`NULLS LAST\`) |
| \`ORDER BY rating DESC\` | al principio (equivale a \`NULLS FIRST\`) |

El caso peligroso es \`DESC\`, y \`DESC\` es justamente el que usan casi todos los rankings, porque casi todos los rankings quieren el valor más alto arriba.

## Cómo controlarlo

Agrega \`NULLS FIRST\` o \`NULLS LAST\` después de la dirección, una vez por cada clave:

\`\`\`sql
SELECT id, store_name, rating
FROM sellers
ORDER BY rating DESC NULLS LAST, store_name ASC;
\`\`\`

Ahora el ranking empieza por la mejor calificación real y los vendedores sin ninguna reseña quedan al final, que es lo que pedía el negocio.

## Decide qué significa el NULL

Antes de escribir la cláusula, responde una pregunta de negocio: «sin calificación», ¿es lo mismo que «mala calificación»?

- Si **no** lo es, deja los NULL al final con \`NULLS LAST\`. También puedes excluirlos con \`WHERE rating IS NOT NULL\` si el reporte es solo de tiendas ya evaluadas.
- Si quieres verlos primero, porque son justamente los casos a revisar, escribe \`NULLS FIRST\` de forma explícita.

Cualquiera de las dos opciones es correcta. Lo que no es correcto es que la posición de los NULL quede decidida por omisión y nadie sepa por qué el reporte se ve así.

## Alternativas

\`NULLS LAST\` es la forma directa y la que conviene usar. Aun así, hay dos variantes que vas a encontrar en código heredado y conviene saber leer:

\`\`\`sql
ORDER BY (rating IS NULL) ASC, rating DESC   -- falso (0) antes que verdadero (1)
ORDER BY COALESCE(rating, -1) DESC           -- reemplaza el NULL por un valor extremo
\`\`\`

La primera hace exactamente lo mismo que \`NULLS LAST\` y funciona en cualquier motor. La segunda es riesgosa por dos motivos: te obliga a elegir un valor centinela, es decir, un valor inventado que representa «sin dato», y ese valor algún día puede aparecer de verdad en los datos, y si además muestras esa columna en el reporte, quien lo lea va a ver un \`-1\` donde debería ver «sin calificación».

## Los NULL y el desempate

Los NULL también participan del desempate. Si dos filas tienen NULL en \`rating\`, siguen empatadas y las ordena la clave siguiente. Por eso el ejemplo cierra con \`store_name\`: las tiendas sin calificación salen al final, pero en orden alfabético y siempre el mismo.

## Resumen

- En \`ASC\` los NULL van al final; con \`DESC\` van al principio.
- \`NULLS FIRST\` y \`NULLS LAST\` lo hacen explícito, clave por clave.
- La posición de los NULL es una decisión de negocio: escríbela en la consulta.
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

«Dame los 10 pedidos más grandes de México», «muéstrame la página 3 del listado», «quiero ver 5 filas para entender cómo es la tabla». Las tres son pedidos de recorte, y el recorte se hace con \`LIMIT\`, que indica cuántas filas devolver como máximo. Cuando ese recorte se combina con un orden para quedarte con los mejores, se lo llama **top-N**: las N primeras filas según un criterio.

## El concepto

\`\`\`sql
SELECT id, customer_id, total_amount
FROM orders
WHERE currency = 'MXN'
ORDER BY total_amount DESC, id ASC
LIMIT 10;
\`\`\`

El orden de ejecución es \`FROM\` → \`WHERE\` → \`SELECT\` → \`ORDER BY\` → \`LIMIT\`. Primero se filtra y se ordena **todo** el conjunto de filas, y recién al final se cortan las 10 primeras. Por eso \`LIMIT\` nunca cambia cuáles filas cumplen el filtro, solo cuántas de ellas ves.

## LIMIT sin ORDER BY: la advertencia

\`\`\`sql
SELECT id, total_amount FROM orders LIMIT 10;
\`\`\`

Esta consulta **no** devuelve «los primeros 10 pedidos» ni «los 10 más grandes»: devuelve 10 filas cualesquiera, las que el motor tenga más a mano en ese momento. Es aceptable para espiar la forma de una tabla mientras exploras. En un reporte es un error, porque el resultado no responde ninguna pregunta y además puede cambiar en la próxima ejecución. Si el recorte tiene que significar «los diez más grandes», hace falta un \`ORDER BY\` que lo diga.

## Paginar con OFFSET

\`OFFSET\` descarta una cantidad de filas antes de aplicar el límite, y con eso se arman las páginas de un listado. Con páginas de 10 filas:

\`\`\`sql
SELECT id, name, cuisine
FROM restaurants
WHERE is_active
ORDER BY name ASC, id ASC
LIMIT 10 OFFSET 20;   -- página 3
\`\`\`

La fórmula es \`OFFSET = (página - 1) * tamaño_de_página\`. La página 1 usa \`OFFSET 0\` y la página 3, con páginas de 10 filas, usa \`OFFSET 20\`.

Dos advertencias:

1. **El \`ORDER BY\` debe ser determinista**, o sea, tiene que dar siempre el mismo orden. Si hay empates sin una clave que los desempate, el motor puede ordenarlos distinto en cada página y entonces una misma fila aparece en dos páginas mientras otra no aparece en ninguna. Por eso el ejemplo cierra con \`id\`.
2. **Un \`OFFSET\` grande es caro.** El motor igual tiene que producir y descartar todas las filas que salta, así que \`OFFSET 100000\` lee cien mil filas para devolverte diez.

## Empates en el borde del top-N

\`LIMIT 10\` corta después de la fila 10 aunque la fila 11 tenga exactamente el mismo valor que la 10. Si el negocio necesita «todos los que empatan en el décimo puesto», \`LIMIT\` no alcanza y el problema se resuelve con funciones de ventana como \`RANK\` (sección 21). Mientras tanto, deja escrito en el reporte cuál fue el criterio: «10 primeros, desempate por id».

## La sintaxis estándar

\`LIMIT\` y \`OFFSET\` son la forma de PostgreSQL y MySQL. El estándar SQL usa \`FETCH FIRST n ROWS ONLY\`, que PostgreSQL también acepta:

\`\`\`sql
ORDER BY total_amount DESC, id ASC
OFFSET 20 FETCH NEXT 10 ROWS ONLY;
\`\`\`

Las dos formas son válidas y hacen lo mismo. En SQL Server vas a encontrar \`TOP n\` y en versiones antiguas de Oracle, \`ROWNUM\`.

## Resumen

- \`LIMIT\` corta después de ordenar, así que sin \`ORDER BY\` las filas que recibes son arbitrarias.
- \`OFFSET = (página - 1) * tamaño\`, y siempre con un orden determinista.
- \`LIMIT\` ignora los empates del borde; si esos empates importan, necesitas funciones de ranking.

## Próximos pasos

**Lo que ya puedes hacer:** Sabes ordenar por una o varias columnas, decidir dónde van los NULL, obtener los primeros N registros y paginar con LIMIT y OFFSET.

**Antes de seguir:** resuelve los ejercicios y el quiz de esta sección.

**Lo que sigue:** Sección 14 · Funciones de agregación. Empieza el nivel Agregar y combinar: vas a resumir filas en totales, promedios, mínimos y máximos.

**Para practicar (opcional):** ¿Cuáles son los 10 artistas de Ritmo con más oyentes mensuales? Ordena \`artists\` por \`monthly_listeners\` de mayor a menor y desempata por \`id\`.
`,
  },
];
