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

«¿En qué países vendemos?», «¿qué transportistas usamos?», «¿qué estados puede tener un pedido?». Son preguntas sobre **qué valores existen**, no sobre cuántas filas hay. \`DISTINCT\` responde exactamente eso y es, además, la herramienta más rápida para conocer una tabla nueva.

## El concepto

\`\`\`sql
SELECT DISTINCT country
FROM customers;
\`\`\`

Devuelve cada país **una sola vez**, aunque haya cientos de clientes por país. \`DISTINCT\` va inmediatamente después de \`SELECT\` y se aplica a **toda la fila del resultado**, no a una columna en particular:

\`\`\`sql
SELECT DISTINCT carrier, destination_city
FROM shipments;
\`\`\`

Aquí una fila se repite solo si coinciden **ambos** valores. Habrá una fila por cada combinación transportista–ciudad que realmente aparezca en los envíos.

## DISTINCT y NULL

Para \`DISTINCT\`, todos los NULL son «iguales entre sí»: si una columna tiene valores NULL, el resultado incluye **una** fila NULL.

\`\`\`sql
SELECT DISTINCT parent_id
FROM categories;
\`\`\`

Devuelve los ids de las categorías que son padre de alguna otra **y** una fila NULL (las categorías raíz no tienen padre). En la sección 8 verás que en comparaciones \`NULL = NULL\` no es verdadero; \`DISTINCT\` es una de las excepciones donde NULL se agrupa.

## DISTINCT no es un arreglo

Si una consulta devuelve filas repetidas que no esperabas, agregar \`DISTINCT\` esconde el síntoma pero no la causa. Las causas típicas:

- Un \`JOIN\` que multiplica filas (sección 17).
- Datos duplicados de verdad (por ejemplo, correos con distinta capitalización en \`customers\`).

Antes de escribir \`DISTINCT\`, pregúntate: ¿la pregunta del negocio es sobre valores únicos? Si la respuesta es no, busca la causa.

## Costo

Para eliminar duplicados el motor debe ordenar o agrupar todas las filas. En tablas pequeñas no se nota; en millones de filas, sí. Úsalo cuando la pregunta lo pide, no «por si acaso».

## Ejemplo resuelto

Pedido: «¿Qué monedas se usan en el catálogo?».

\`\`\`sql
SELECT DISTINCT currency
FROM products
ORDER BY currency;
\`\`\`

\`ORDER BY\` se aplica después de eliminar duplicados, así que el resultado queda ordenado y sin repeticiones.
`,
  },
];
