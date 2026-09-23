import type { LessonDef } from "../schemas/curriculum";

export const lessons: LessonDef[] = [
  {
    slug: "distinct-valores-unicos",
    section: "distinct",
    kind: "theory",
    title: "DISTINCT: valores únicos",
    sort_order: 0,
    estimated_minutes: 8,
    is_free: true,
    is_published: true,
    prerequisites: ["select-columnas"],
    dataset: "tiendaviva",
    body_md: `## Por qué importa

«¿En qué países vendemos?», «¿con qué transportistas trabajamos?», «¿qué estados puede tener un pedido?». Estas preguntas no son sobre cuántas filas hay, sino sobre **qué valores distintos aparecen** en una columna. \`DISTINCT\` responde exactamente eso: elimina las repeticiones y te deja la lista de valores que existen.

Además es la herramienta más rápida para conocer una tabla que nunca viste: antes de filtrar por \`status = 'delivered'\` conviene mirar qué estados existen de verdad en los datos, porque el nombre que usa el negocio y el que está guardado en la base no siempre coinciden.

## El concepto

\`\`\`sql
SELECT DISTINCT country
FROM customers;
\`\`\`

Esa consulta devuelve cada país **una sola vez**, aunque haya cientos de clientes en cada uno.

\`DISTINCT\` se escribe inmediatamente después de \`SELECT\` y se aplica a **toda la fila del resultado**, no solo a la primera columna. Es decir, dos filas del resultado se consideran repetidas únicamente cuando coinciden en todas las columnas que pediste:

\`\`\`sql
SELECT DISTINCT carrier, destination_city
FROM shipments;
\`\`\`

Aquí una fila se descarta por repetida solo si coinciden **ambos** valores, el transportista y la ciudad. El resultado es una fila por cada combinación de transportista y ciudad que realmente aparece en los envíos: si un mismo transportista entrega en Córdoba y en Rosario, vas a ver dos filas con ese transportista.

## DISTINCT y NULL

Para \`DISTINCT\`, todos los NULL se consideran iguales entre sí. Por eso, si la columna tiene valores faltantes, el resultado incluye **una sola** fila con NULL.

\`\`\`sql
SELECT DISTINCT parent_id
FROM categories;
\`\`\`

Esa consulta devuelve los identificadores de las categorías que son padre de alguna otra, **más** una fila con NULL, que corresponde a las categorías de primer nivel, las que no dependen de ninguna otra.

Conviene anotar esa excepción: en la sección 8 vas a ver que, al comparar dos valores, \`NULL = NULL\` no da verdadero. \`DISTINCT\` no compara con \`=\`: agrupa valores idénticos, y para agrupar sí trata a todos los NULL como un mismo caso.

## DISTINCT no arregla un resultado mal armado

Si una consulta devuelve filas repetidas que no esperabas, agregar \`DISTINCT\` hace desaparecer las repeticiones de la pantalla, pero el problema que las generó sigue ahí y puede estar alterando tus totales. Las causas habituales son dos:

- Un \`JOIN\` que multiplica filas porque la tabla de la derecha tiene varias filas por cada fila de la izquierda (sección 17).
- Datos realmente duplicados, por ejemplo el mismo correo cargado dos veces en \`customers\`, una vez con mayúsculas y otra con minúsculas.

En el primer caso, \`DISTINCT\` esconde las filas de más pero tus sumas siguen contando importes repetidos, y el informe queda mal sin que nada lo indique. En el segundo, hay un problema de calidad de datos que alguien debería conocer.

Antes de escribir \`DISTINCT\`, pregúntate si la pregunta del negocio es sobre valores únicos. Si la respuesta es que no, busca la causa de las repeticiones.

## Costo

Para eliminar duplicados, el motor necesita ordenar o agrupar todas las filas antes de devolverte el resultado. En tablas chicas no vas a notar la diferencia; sobre millones de filas sí se nota. Úsalo cuando la pregunta lo pide, no por precaución.

## Ejemplo resuelto

Pedido del área comercial: «¿Qué monedas se usan en el catálogo?».

\`\`\`sql
SELECT DISTINCT currency
FROM products
ORDER BY currency;
\`\`\`

\`ORDER BY\` se aplica después de eliminar los duplicados, así que el resultado queda ordenado alfabéticamente y sin repeticiones.
`,
  },
];
