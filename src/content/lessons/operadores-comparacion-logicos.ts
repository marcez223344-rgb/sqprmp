import type { LessonDef } from "../schemas/curriculum";

export const lessons: LessonDef[] = [
  {
    slug: "operadores-precedencia-in-between",
    section: "operadores-comparacion-logicos",
    kind: "theory",
    title: "AND, OR, NOT, IN y BETWEEN sin sorpresas",
    sort_order: 0,
    estimated_minutes: 10,
    is_free: true,
    is_published: true,
    prerequisites: ["where-filtros-basicos"],
    dataset: "tiendaviva",
    body_md: `## Por qué importa

Un filtro mal combinado no produce ningún mensaje de error. La consulta corre, devuelve una tabla con buen aspecto y entrega **más filas o menos filas de las correctas**, así que el número que informas está mal y nada lo señala. El problema suele aparecer semanas después, cuando alguien compara tu reporte con otra fuente. Esta sección trata de escribir condiciones que digan exactamente lo que quieres decir.

## Precedencia: AND antes que OR

Cuando una condición mezcla varios operadores lógicos sin paréntesis, SQL los resuelve en un orden fijo que se llama **precedencia**: primero \`NOT\`, después \`AND\` y al final \`OR\`. Por eso esta consulta **no** hace lo que parece:

\`\`\`sql
-- Parece: (AR o UY) con marketing
-- Es:     AR, o bien (UY con marketing)
SELECT id
FROM customers
WHERE country = 'AR' OR country = 'UY' AND marketing_opt_in;
\`\`\`

Con paréntesis queda claro y correcto:

\`\`\`sql
WHERE (country = 'AR' OR country = 'UY')
  AND marketing_opt_in
\`\`\`

Regla práctica: cuando mezcles \`AND\` con \`OR\`, escribe **siempre** los paréntesis, incluso cuando la precedencia por omisión coincida con lo que querías. Así el resultado deja de depender de que quien lea la consulta —incluido tú dentro de seis meses— recuerde el orden de evaluación.

## IN: pertenencia a una lista

\`\`\`sql
WHERE status IN ('cancelled', 'returned')
\`\`\`

\`IN\` significa «el valor está en esta lista». La condición de arriba equivale a \`status = 'cancelled' OR status = 'returned'\`, pero es más corta, se lee mejor y evita el problema de precedencia, porque toda la lista cuenta como una sola condición. \`NOT IN\` invierte la pregunta y devuelve las filas cuyo valor no está en la lista; tiene una trampa cuando la lista contiene NULL, y la verás en la sección 8.

## BETWEEN: rangos inclusivos

\`\`\`sql
WHERE list_price BETWEEN 100000 AND 200000
\`\`\`

Equivale a \`list_price >= 100000 AND list_price <= 200000\`, con **los dos extremos incluidos**. Es cómodo para números y para fechas sin hora. Para columnas de tipo \`timestamptz\` (un instante con fecha, hora y huso horario) conviene el rango semiabierto que viste en la sección 6, con \`>=\` para el inicio y \`<\` para el fin: si escribes \`BETWEEN\` con dos fechas, del último día solo entran las filas cuya hora es exactamente 00:00:00 y pierdes el resto de la jornada.

## NOT y sus equivalentes

Negar una condición compuesta también invierte el conector: \`NOT (a AND b)\` equivale a \`NOT a OR NOT b\`, que es una de las leyes de De Morgan. En la práctica conviene escribir la negación pegada a la comparación, no delante de todo:

- \`NOT status = 'delivered'\` → escribe \`status <> 'delivered'\`.
- \`NOT (status IN (...))\` → escribe \`status NOT IN (...)\`.
- \`NOT is_active\` está bien: es claro para booleanos.

## Elegir la forma más legible

Estas dos condiciones devuelven exactamente las mismas filas. La segunda se entiende en una sola lectura, y por eso es la que conviene escribir:

\`\`\`sql
WHERE status = 'cancelled' OR status = 'returned' OR status = 'pending'
WHERE status IN ('cancelled', 'returned', 'pending')
\`\`\`

## Diagnosticar un filtro

Si un filtro devuelve un número inesperado de filas:

1. Ejecuta cada condición por separado y cuenta filas.
2. Combínalas de a una, con paréntesis.
3. Compara con lo que esperas del negocio.

## Ejemplo resuelto

Pedido: «Clientes de Argentina o Uruguay que aceptaron marketing».

\`\`\`sql
SELECT id, full_name, country
FROM customers
WHERE country IN ('AR', 'UY')
  AND marketing_opt_in;
\`\`\`

Con \`IN\`, la lista de países es una sola condición, así que ya no hay ninguna mezcla de \`AND\` con \`OR\` que se pueda interpretar de dos maneras y los paréntesis dejan de ser necesarios.
`,
  },
];
