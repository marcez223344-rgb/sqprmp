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

Un filtro mal combinado no da error: devuelve **más o menos filas de las correctas** y nadie lo nota hasta que el reporte llega a la gerencia. Esta sección es sobre escribir condiciones que dicen exactamente lo que quieres.

## Precedencia: AND antes que OR

SQL evalúa \`NOT\` primero, luego \`AND\`, luego \`OR\`. Esta consulta **no** hace lo que parece:

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

Regla práctica: cuando mezclas \`AND\` y \`OR\`, **siempre** paréntesis, aunque la precedencia por defecto coincida con tu intención. Quien lea después no tendrá que recordarla.

## IN: pertenencia a una lista

\`\`\`sql
WHERE status IN ('cancelled', 'returned')
\`\`\`

Equivale a \`status = 'cancelled' OR status = 'returned'\`, pero es más corto, más legible y evita el problema de precedencia. \`NOT IN\` invierte la condición… con una trampa con NULL que verás en la sección 8.

## BETWEEN: rangos inclusivos

\`\`\`sql
WHERE list_price BETWEEN 100000 AND 200000
\`\`\`

Equivale a \`list_price >= 100000 AND list_price <= 200000\`: **ambos extremos incluidos**. Es ideal para números y fechas sin hora. Para \`timestamptz\` prefiere el rango semiabierto (\`>=\` y \`<\`) que viste en la sección 6.

## NOT y sus equivalentes

\`NOT (a AND b)\` equivale a \`NOT a OR NOT b\` (leyes de De Morgan). En la práctica:

- \`NOT status = 'delivered'\` → escribe \`status <> 'delivered'\`.
- \`NOT (status IN (...))\` → escribe \`status NOT IN (...)\`.
- \`NOT is_active\` está bien: es claro para booleanos.

## Elegir la forma más legible

Estas condiciones son equivalentes; la segunda se lee de un vistazo:

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

\`IN\` elimina la ambigüedad y los paréntesis dejan de ser necesarios.
`,
  },
];
