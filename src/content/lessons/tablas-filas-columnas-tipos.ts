import type { LessonDef } from "../schemas/curriculum";

export const lessons: LessonDef[] = [
  {
    slug: "anatomia-de-una-tabla",
    section: "tablas-filas-columnas-tipos",
    kind: "theory",
    title: "Anatomía de una tabla: filas, columnas y claves",
    sort_order: 0,
    estimated_minutes: 7,
    is_free: true,
    is_published: true,
    prerequisites: [],
    dataset: "tiendaviva",
    body_md: `## Por qué importa

Antes de consultar datos necesitas leer su **esquema**: qué tablas existen, qué columnas tienen y cómo se conectan. Un analista que entiende el modelo escribe consultas correctas a la primera; uno que no, multiplica filas sin darse cuenta.

## El concepto

Una **tabla** tiene un nombre (\`customers\`), **columnas** con nombre y tipo (\`email text\`, \`signup_at timestamptz\`) y **filas**, una por registro.

| id | full_name | country | signup_at |
|---|---|---|---|
| 1 | Valentina Rojas | CO | 2024-03-02 10:15 |
| 2 | Mateo Fernández | AR | 2024-03-02 11:40 |

Dos tipos de columnas especiales sostienen las relaciones:

- **Clave primaria (PK)**: identifica de forma única cada fila. En TiendaViva es \`id\` en todas las tablas. Nunca se repite y nunca es NULL.
- **Clave foránea (FK)**: guarda la clave primaria de otra tabla para relacionarlas. \`orders.customer_id\` apunta a \`customers.id\`: «este pedido lo hizo este cliente».

## Cardinalidad: uno a muchos

Un cliente puede tener muchos pedidos; un pedido pertenece a un solo cliente. Esa relación **uno a muchos** es la más común. Implica algo crucial: si combinas \`customers\` con \`orders\`, cada cliente aparecerá **tantas veces como pedidos tenga**. Si además sumas importes, cuidado con contar de más.

## Ejemplo ejecutable

Explora el esquema desde la consulta misma:

\`\`\`sql
SELECT id, full_name, country, signup_at
FROM customers
LIMIT 5;
\`\`\`

Y comprueba que una clave primaria no se repite (el resultado debe ser 0 filas):

\`\`\`sql
SELECT id, COUNT(*)
FROM customers
GROUP BY id
HAVING COUNT(*) > 1;
\`\`\`

## Cómo leer el panel de esquema

En cada ejercicio verás el panel **Esquema** con las tablas disponibles. Para cada columna se indica el tipo y una descripción; las FK muestran a qué tabla apuntan. Léelo antes de escribir: te dice qué existe, cómo se llama y qué significa.

## Errores comunes

- Suponer que dos tablas se unen por columnas que «se llaman parecido» en lugar de por la FK documentada.
- Usar \`full_name\` como identificador: dos personas pueden llamarse igual; el \`id\` no.
- Olvidar que una relación uno a muchos multiplica filas al combinar tablas.

## En resumen

- Tabla = columnas con tipo + filas. La PK identifica cada fila; la FK conecta tablas.
- Uno a muchos es la relación más común y la fuente de la mayoría de duplicados accidentales.
- Lee el esquema antes de consultar.
`,
  },
  {
    slug: "tipos-de-datos",
    section: "tablas-filas-columnas-tipos",
    kind: "theory",
    title: "Tipos de datos: texto, números, fechas y booleanos",
    sort_order: 1,
    estimated_minutes: 8,
    is_free: true,
    is_published: true,
    prerequisites: ["anatomia-de-una-tabla"],
    dataset: "tiendaviva",
    body_md: `## Por qué importa

El tipo de una columna determina qué operaciones tienen sentido: puedes sumar importes, pero no correos; puedes restar fechas, pero no nombres. También determina errores silenciosos: un «precio» guardado como texto se ordena alfabéticamente («1000» antes que «200»).

## Los tipos que usarás a diario

| Familia | Tipos en PostgreSQL | Ejemplo en TiendaViva |
|---|---|---|
| Texto | \`text\`, \`varchar(n)\`, \`char(n)\` | \`customers.email\`, \`orders.status\`, \`country char(2)\` |
| Enteros | \`integer\`, \`bigint\`, \`smallint\` | \`order_items.quantity\`, \`customers.id\` |
| Decimales exactos | \`numeric(12,2)\` | \`orders.total_amount\`, \`products.list_price\` |
| Decimales aproximados | \`double precision\` | promedios, tasas |
| Fecha y hora | \`date\`, \`timestamp\`, \`timestamptz\` | \`sellers.joined_at\`, \`orders.created_at\` |
| Booleano | \`boolean\` | \`products.is_active\`, \`customers.marketing_opt_in\` |

Dos detalles que importan en el trabajo real:

- **Dinero va en \`numeric\`**, nunca en \`double precision\`: los decimales binarios acumulan errores de redondeo en sumas largas.
- **\`timestamptz\`** guarda un instante absoluto y lo muestra en la zona horaria de la sesión. Un pedido creado a las 23:30 en Buenos Aires puede aparecer al día siguiente si lo miras en UTC. Volveremos a esto en la sección de fechas.

## Ejemplo ejecutable

Los literales se escriben distinto según el tipo:

\`\`\`sql
SELECT
  'MX'            AS texto,
  42              AS entero,
  1999.90         AS decimal,
  DATE '2025-08-01' AS fecha,
  TRUE            AS booleano;
\`\`\`

Comparar tipos incompatibles falla o da resultados inesperados. Esta consulta funciona porque \`country\` es texto y comparamos con un literal de texto:

\`\`\`sql
SELECT full_name, country
FROM customers
WHERE country = 'MX'
LIMIT 5;
\`\`\`

## Conversión de tipos

A veces necesitas cambiar el tipo: \`CAST(list_price AS integer)\` o la forma corta de PostgreSQL \`list_price::integer\`. Úsalo con criterio: convertir texto sucio a número puede fallar, y redondear dinero cambia cifras.

## Errores comunes

- Comparar un número con un texto (\`quantity = '3'\` funciona por conversión implícita, pero \`quantity = 'tres'\` falla).
- Guardar fechas como texto en formato local (\`'02/03/2025'\`: ¿febrero o marzo?). Usa siempre ISO: \`'2025-03-02'\`.
- Sumar \`double precision\` para importes financieros.

## En resumen

- Cada columna tiene un tipo; el tipo define qué operaciones son válidas.
- Dinero en \`numeric\`; instantes en \`timestamptz\`; fechas en formato ISO.
- Convierte tipos solo cuando lo necesitas y sabiendo qué puede fallar.
`,
  },
];
