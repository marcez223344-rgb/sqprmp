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

Antes de consultar los datos necesitas leer su **esquema**, es decir, cómo están estructurados: qué tablas existen, cuáles son las columnas de cada tabla y cómo se conectan entre sí. Un analista que entiende el modelo escribe consultas correctas desde la primera vez; uno que no lo entiende comete errores que producen resultados incorrectos o inesperados, muchas veces sin darse cuenta.

## El concepto

Una **tabla** tiene un nombre (\`customers\`, la tabla de clientes), **columnas** que a su vez tienen nombre y tipo de dato (\`email text\` es la columna \`email\`, que guarda texto; \`signup_at timestamptz\` es la columna \`signup_at\`, que guarda el instante del alta) y **filas**: una por cada registro, en este caso una por cada cliente.

| id | full_name | country | signup_at |
|---|---|---|---|
| 1 | Valentina Rojas | CO | 2024-03-02 10:15 |
| 2 | Mateo Fernández | AR | 2024-03-02 11:40 |

Las tablas tienen dos tipos de columnas especiales que sirven para definir relaciones entre ellas:

- **Clave primaria** (PK, por *primary key*, su nombre en inglés): es la columna que identifica de forma única cada fila. En TiendaViva es \`id\` en todas las tablas. Su valor nunca se repite y nunca es NULL. Funciona como el número de documento de identidad de la fila.
- **Clave foránea** (FK, por *foreign key*): es una columna que guarda la clave primaria de otra tabla, y de esa forma relaciona las dos. Por ejemplo, \`orders.customer_id\` es la columna \`customer_id\` de la tabla \`orders\`, y apunta a la columna \`id\` de la tabla \`customers\`. En términos de negocio eso significa: «este pedido lo hizo este cliente».

## Cardinalidad: uno a muchos

Un cliente puede tener muchos pedidos, y cada pedido pertenece a un solo cliente. Esa forma de relación se llama **uno a muchos** y es la más frecuente en cualquier base de datos. Tiene una consecuencia que conviene tener presente desde ahora: si combinas la tabla \`customers\` con la tabla \`orders\`, cada cliente aparecerá en el resultado **tantas veces como pedidos tenga**. Si después sumas importes sobre esas filas, estarás sumando varias veces el mismo dato y el total quedará más alto que el real.

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

En cada ejercicio verás el panel **Esquema** con las tablas disponibles. Para cada columna se indica su tipo de dato y una descripción en español, y en cada clave foránea se indica a qué tabla apunta. Léelo antes de escribir la consulta: ahí está qué tablas existen, cómo se llama cada columna y qué significa en términos de negocio.

## Errores comunes

- Suponer que dos tablas se unen por columnas que «se llaman parecido», en lugar de usar la clave foránea que indica el esquema. El resultado trae filas que no se corresponden entre sí.
- Usar \`full_name\`, el nombre completo, como identificador de un cliente: dos personas distintas pueden llamarse igual, mientras que el valor de \`id\` nunca se repite.
- Olvidar que una relación uno a muchos repite filas al combinar tablas, y entregar totales más altos que los reales.

## En resumen

- Una tabla son columnas con tipo de dato más filas. La clave primaria (PK) identifica cada fila y la clave foránea (FK) conecta una tabla con otra.
- La relación uno a muchos es la más común y la causa de la mayoría de las filas repetidas que aparecen por accidente.
- Lee el esquema antes de escribir la consulta.
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

Cada columna tiene un **tipo de dato**, es decir, la clase de valor que puede guardar: texto, número entero, fecha, verdadero o falso. Ese tipo determina qué operaciones tienen sentido: puedes sumar importes porque son números, pero no puedes sumar direcciones de correo. También explica errores que no muestran ningún mensaje: si un precio se guardó como texto en lugar de como número, al ordenar se compara carácter por carácter y «1000» aparece antes que «200», porque el primer carácter «1» va antes que el «2».

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

- **El dinero se guarda en \`numeric\`**, nunca en \`double precision\`. \`numeric\` guarda los decimales de forma exacta; \`double precision\` los aproxima en binario, y esas aproximaciones se acumulan hasta que una suma larga cierra con algunos centavos de diferencia.
- **\`timestamptz\`** (por *timestamp with time zone*, marca de tiempo con zona horaria) guarda un instante absoluto y lo muestra en la zona horaria de la sesión desde la que consultas. Un pedido creado a las 23:30 en Buenos Aires figura como del día siguiente si lo miras en UTC (por *Coordinated Universal Time*, el tiempo universal coordinado), porque allí ya son las 02:30. Volveremos a esto en la sección de fechas.

## Ejemplo ejecutable

Un **literal** es un valor escrito directamente en la consulta, en lugar de tomarlo de una columna. Cada tipo se escribe de una forma distinta:

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

A veces necesitas cambiar el tipo de un valor. Eso se llama conversión (en inglés, *cast*) y se escribe \`CAST(list_price AS integer)\` o, en la forma abreviada de PostgreSQL, \`list_price::integer\`. Úsalo con criterio: si el texto que conviertes a número trae símbolos o espacios, la conversión falla y corta la consulta; y convertir un importe a entero descarta los centavos, así que el total deja de coincidir con la contabilidad.

## Errores comunes

- Comparar un número con un texto (\`quantity = '3'\` funciona por conversión implícita, pero \`quantity = 'tres'\` falla).
- Guardar fechas como texto en formato local (\`'02/03/2025'\`: ¿es 2 de marzo o 3 de febrero?). Usa siempre el formato ISO 8601, la norma internacional que escribe año-mes-día: \`'2025-03-02'\`.
- Sumar importes financieros guardados en \`double precision\` y entregar un total con centavos de diferencia.

## En resumen

- Cada columna tiene un tipo; el tipo define qué operaciones son válidas.
- El dinero va en \`numeric\`, los instantes en \`timestamptz\` y las fechas se escriben en formato ISO (año-mes-día).
- Convierte tipos solo cuando lo necesitas y sabiendo qué puede fallar.
`,
  },
];
