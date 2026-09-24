import type { LessonDef } from "../schemas/curriculum";

const section = "cte";

export const lessons: LessonDef[] = [
  {
    slug: "cte-with-pasos",
    section,
    kind: "theory",
    title: "WITH: nombrar los pasos de una consulta",
    sort_order: 0,
    estimated_minutes: 11,
    is_free: false,
    is_published: true,
    prerequisites: ["group-by-reportes"],
    dataset: "tiendaviva",
    body_md: `## Por qué importa

Hay preguntas de negocio que se responden en varios pasos: «primero calculo cuánto gastó cada cliente, después saco el promedio de ese gasto por país». Si escribes eso con subconsultas, una dentro de otra, la consulta queda anidada y hay que leerla de adentro hacia afuera, al revés del orden en que la pensaste. Quien la revise después va a tardar varios minutos en entenderla, y muchas veces esa persona vas a ser tú.

Una **CTE** (por *common table expression*, expresión de tabla común, su nombre en inglés) le pone **nombre** a cada paso intermedio. La consulta pasa a leerse de arriba hacia abajo, en el mismo orden en que razonaste el problema.

Trabajas con **TiendaViva**, el marketplace, y sus tablas \`orders\`, \`order_items\`, \`products\`, \`categories\`, \`customers\` y \`sellers\`.

## La sintaxis

\`\`\`sql
WITH gasto_por_cliente AS (
  SELECT c.id AS customer_id, c.country, sum(o.total_amount) AS gasto
  FROM orders AS o
  INNER JOIN customers AS c ON c.id = o.customer_id
  WHERE o.status = 'delivered'
  GROUP BY c.id, c.country
)
SELECT country, round(avg(gasto), 2) AS gasto_promedio
FROM gasto_por_cliente
GROUP BY country
ORDER BY country;
\`\`\`

El bloque \`WITH nombre AS (...)\` define un resultado temporal que existe **solo mientras se ejecuta esa consulta**: no se guarda en la base de datos y desaparece al terminar. Dentro de la consulta lo usas en el \`FROM\` como si fuera una tabla, porque para todo efecto práctico lo es: tiene nombre, tiene columnas y puede llevar alias.

En el ejemplo, \`gasto_por_cliente\` deja una fila por cliente con su país y su gasto total; el \`SELECT\` de abajo promedia ese gasto dentro de cada país.

Dos detalles de sintaxis que ahorran errores:

- El \`WITH\` va **antes** del \`SELECT\` principal, y entre el paréntesis que cierra la CTE y ese \`SELECT\` no se escribe punto y coma.
- Puedes declarar los nombres de las columnas junto al nombre de la CTE: \`WITH gasto (customer_id, country, total) AS (...)\`.

## Encadenar varias CTE

Las CTE se separan con comas, y **cada una puede usar las anteriores** como si fueran tablas:

\`\`\`sql
WITH entregas AS (
  SELECT o.id, o.customer_id, o.total_amount
  FROM orders AS o
  WHERE o.status = 'delivered'
),
por_cliente AS (
  SELECT customer_id, count(*) AS pedidos, sum(total_amount) AS gasto
  FROM entregas
  GROUP BY customer_id
)
SELECT count(*) AS clientes, round(avg(gasto), 2) AS gasto_promedio
FROM por_cliente
WHERE pedidos >= 3;
\`\`\`

Fíjate en que \`por_cliente\` lee de \`entregas\` y no de \`orders\`: gracias a eso, el filtro por estado entregado se escribió una sola vez y no puede quedar desactualizado en la mitad de la consulta.

La dependencia va en un solo sentido: una CTE **no puede** referirse a otra que se declara más abajo. La única excepción es la CTE recursiva, que se refiere a sí misma y que verás en la tercera lección de esta sección.

## Reutilizar la misma CTE

Una misma CTE se puede nombrar **varias veces** dentro de la consulta. Con una subconsulta escrita dentro del \`FROM\` esto no es posible: tendrías que copiar y pegar el mismo bloque, y cada vez que cambiaras un filtro tendrías que acordarte de cambiarlo en las dos copias.

\`\`\`sql
WITH ventas AS (
  SELECT cat.name AS category, sum(oi.quantity * oi.unit_price) AS ingresos
  FROM order_items AS oi
  INNER JOIN orders AS o ON o.id = oi.order_id
  INNER JOIN products AS p ON p.id = oi.product_id
  INNER JOIN categories AS cat ON cat.id = p.category_id
  WHERE o.status = 'delivered' AND o.currency = 'MXN'
  GROUP BY cat.name
)
SELECT category, ingresos
FROM ventas
WHERE ingresos > (SELECT avg(ingresos) FROM ventas)
ORDER BY ingresos DESC;
\`\`\`

El nombre \`ventas\` aparece dos veces: una en el \`FROM\`, para listar las categorías, y otra dentro de la subconsulta que calcula el promedio de ingresos contra el que se comparan. Una sola definición y dos usos.

## Cómo nombrar

Los nombres son la mitad del beneficio de usar CTE. Usa sustantivos del negocio en minúsculas: \`entregas\`, \`gasto_por_cliente\`, \`categorias_activas\`. Evita \`t1\`, \`tmp\` o \`cte2\`, porque no le dicen nada a quien revise la consulta dentro de seis meses y obligan a leer el bloque entero para entender qué contiene.

## Errores comunes

- Poner punto y coma después del paréntesis que cierra la CTE: el motor entiende que la instrucción terminó ahí y falla porque la consulta quedó incompleta.
- Olvidar la coma entre dos CTE, o escribirla también antes del \`SELECT\` final, donde no va.
- Referirse desde una CTE a otra que está declarada más abajo: el nombre todavía no existe en ese punto.
- Creer que la CTE queda guardada para consultas posteriores. Desaparece al terminar la consulta. Si necesitas esa definición todos los días, lo que te sirve es una vista.

## Resumen

\`WITH nombre AS (...)\` le da nombre a un paso intermedio de la consulta. Varias CTE se encadenan con comas y cada una puede leer las anteriores. La misma CTE puede usarse varias veces, algo que una subconsulta no permite sin duplicar el código.
`,
  },
  {
    slug: "cte-vs-subconsulta-y-vista",
    section,
    kind: "theory",
    title: "CTE, subconsulta o vista: cuándo usar cada una",
    sort_order: 1,
    estimated_minutes: 9,
    is_free: false,
    is_published: true,
    prerequisites: ["cte-with-pasos"],
    dataset: "pidelo",
    body_md: `## Tres formas de escribir lo mismo

Estas tres versiones, escritas sobre **Pídelo**, la app de delivery, describen exactamente el mismo conjunto de filas:

\`\`\`sql
-- 1) Subconsulta derivada
SELECT city_id, count(*) AS restaurantes
FROM (SELECT id, city_id FROM restaurants WHERE is_active) AS activos
GROUP BY city_id;

-- 2) CTE
WITH activos AS (
  SELECT id, city_id FROM restaurants WHERE is_active
)
SELECT city_id, count(*) AS restaurantes
FROM activos
GROUP BY city_id;

-- 3) Vista (objeto permanente, creado una vez)
CREATE VIEW restaurantes_activos AS
  SELECT id, city_id FROM restaurants WHERE is_active;
\`\`\`

Ninguna de las tres es «la correcta». El resultado es idéntico; lo que cambia es qué tan fácil es leerlas y hasta dónde vive la definición.

## Cómo elegir

| Necesitas | Herramienta |
| --- | --- |
| Un paso corto, usado una sola vez | Subconsulta |
| Varios pasos con nombre, o un paso usado dos veces | CTE |
| La misma definición en muchas consultas, compartida con el equipo | Vista |

La diferencia de alcance es concreta. Una CTE vive dentro de una sola consulta y desaparece cuando esta termina. Una **vista** es un objeto guardado en la base de datos: queda con nombre propio y cualquier persona del equipo puede consultarla después, igual que a una tabla. En esta plataforma solo ejecutas consultas de lectura, así que la vista aparece como concepto que vas a encontrar en tu trabajo, no como ejercicio.

## Anidar menos, leer mejor

La diferencia se vuelve evidente cuando hay tres pasos. Con subconsultas anidadas se ve así:

\`\`\`sql
SELECT city, round(100.0 * tardias / entregas, 2) AS pct
FROM (
  SELECT city, count(*) AS entregas,
         count(*) FILTER (WHERE minutos > promised_minutes) AS tardias
  FROM (
    SELECT ci.name AS city, o.promised_minutes,
           EXTRACT(EPOCH FROM (o.delivered_at - o.placed_at)) / 60 AS minutos
    FROM orders AS o
    INNER JOIN restaurants AS r ON r.id = o.restaurant_id
    INNER JOIN cities AS ci ON ci.id = r.city_id
    WHERE o.status = 'delivered'
  ) AS entregas_detalle
  GROUP BY city
) AS resumen;
\`\`\`

Para entenderla hay que empezar por el paréntesis más interno y subir. La versión equivalente con dos CTE encadenadas —una llamada \`entregas\` y otra llamada \`por_ciudad\`— dice lo mismo en el orden en que lo pensaste.

Además, cada paso se puede probar por separado mientras escribes: reemplazas el \`SELECT\` final por \`SELECT * FROM entregas LIMIT 20\` y revisas ese paso aislado, sin tocar el resto. Esa es la mejor técnica de depuración que te da una CTE, y es la razón práctica por la que conviene usarlas aunque el resultado no cambie.

## ¿La CTE es más lenta?

Durante años circuló una regla: «en PostgreSQL la CTE es una barrera de optimización». Hoy hay que matizarla.

- Hasta PostgreSQL 11, toda CTE se **materializaba**, es decir, se calculaba completa y se guardaba en un resultado temporal antes de seguir, aunque el filtro de la consulta externa hubiera permitido leer muchas menos filas.
- Desde PostgreSQL 12 (esta plataforma usa la versión 17), el planificador **puede integrarla** dentro de la consulta principal, igual que hace con una subconsulta, siempre que se use una sola vez, no sea recursiva y no tenga efectos secundarios.
- Puedes forzar cualquiera de los dos comportamientos de forma explícita: \`WITH activos AS MATERIALIZED (...)\` o \`AS NOT MATERIALIZED (...)\`.

La recomendación honesta es esta: escribe primero la versión legible. Si una CTE costosa se usa varias veces, \`MATERIALIZED\` evita recalcularla en cada uso; si una CTE simple impide que un filtro llegue hasta la tabla, \`NOT MATERIALIZED\` ayuda. Decídelo mirando el plan que devuelve \`EXPLAIN\`, no por costumbre.

## Errores comunes

- Partir una consulta de dos líneas en cinco CTE: el resultado tiene más nombres que lógica y se lee peor que el original.
- Suponer que la CTE queda disponible para las consultas siguientes: se borra al terminar la consulta que la definió.
- Repetir la misma subconsulta tres veces en lugar de definirla una vez como CTE y nombrarla tres veces.

## Resumen

Usa una subconsulta para un paso simple, una CTE para una secuencia de pasos con nombre o para un paso que se repite, y una vista para compartir la definición con el equipo. En PostgreSQL moderno la CTE ya no es automáticamente una barrera de optimización, y \`MATERIALIZED\` / \`NOT MATERIALIZED\` te dejan decidir cuando importa.
`,
  },
  {
    slug: "cte-recursiva-jerarquias",
    section,
    kind: "theory",
    title: "CTE recursiva: recorrer jerarquías",
    sort_order: 2,
    estimated_minutes: 12,
    is_free: false,
    is_published: true,
    prerequisites: ["cte-with-pasos"],
    dataset: "tiendaviva",
    body_md: `## Por qué importa

Categorías que contienen subcategorías, organigramas donde cada persona tiene un jefe, respuestas que responden a otras respuestas, piezas armadas con otras piezas: todo eso son **jerarquías**, estructuras donde cada fila apunta a otra fila de la misma tabla.

La tabla guarda esa relación en una columna \`parent_id\`, que contiene el identificador de la fila de la que depende. Recorrer la jerarquía completa exige repetir el mismo join tantas veces como niveles haya, y esa cantidad de niveles normalmente no la conoces al momento de escribir la consulta. La **CTE recursiva** resuelve exactamente eso: recorre todos los niveles sin que tengas que saber de antemano cuántos son.

En **TiendaViva**, la tabla \`categories\` tiene tres columnas relevantes: \`id\`, \`name\` y \`parent_id\`, esta última con el \`id\` de la categoría que la contiene, o NULL si es una categoría de primer nivel.

## La estructura

\`\`\`sql
WITH RECURSIVE arbol(id, name, parent_id, nivel, ruta) AS (
  -- caso base: las raíces
  SELECT id, name, parent_id, 1, name
  FROM categories
  WHERE parent_id IS NULL

  UNION ALL

  -- paso recursivo: hijos de lo que ya está en arbol
  SELECT c.id, c.name, c.parent_id, a.nivel + 1, a.ruta || ' > ' || c.name
  FROM categories AS c
  INNER JOIN arbol AS a ON a.id = c.parent_id
)
SELECT id, name, nivel, ruta
FROM arbol
ORDER BY ruta;
\`\`\`

Una CTE recursiva tiene tres partes obligatorias:

1. La palabra **\`RECURSIVE\`** justo después de \`WITH\`. Se escribe una sola vez, aunque después declares varias CTE.
2. Un **caso base**, que es la consulta que no se refiere a la CTE y define desde dónde arranca el recorrido. Aquí son las categorías sin padre.
3. Un **paso recursivo**, unido al anterior con \`UNION ALL\` (o \`UNION\`), que sí menciona la CTE y busca los hijos de lo que ya se encontró.

Las dos ramas deben devolver la misma cantidad de columnas, con tipos compatibles entre sí.

Fíjate en la **lista de columnas** declarada junto al nombre, \`arbol(id, name, parent_id, nivel, ruta)\`. Es la forma que usa la documentación de PostgreSQL, evita tener que repetir los alias en las dos ramas y, en esta plataforma, es la única que acepta el analizador de consultas cuando la CTE es recursiva.

## Cómo se ejecuta

El motor evalúa primero el caso base y guarda esas filas. Después ejecuta el paso recursivo usando **solo las filas nuevas** que aparecieron en la vuelta anterior, y guarda las que encuentre. Repite esa operación una y otra vez. Cuando una vuelta no produce ninguna fila nueva, se detiene y devuelve la unión de todas las filas acumuladas.

Ese «no produce ninguna fila nueva» es la **condición de terminación**, y depende de ti que llegue a cumplirse. En este ejemplo se cumple porque el árbol de categorías es finito y ninguna categoría es ancestro de sí misma: llega un momento en que las categorías encontradas no tienen hijos y la búsqueda se agota.

## El riesgo real: recursión infinita

Si los datos contienen un ciclo, por ejemplo una categoría A que es padre de B y una B que a su vez figura como padre de A, el paso recursivo siempre encuentra filas nuevas y la consulta nunca termina: sigue generando filas hasta agotar el tiempo disponible o la memoria del servidor. Es la forma más común de dejar una consulta colgada.

Hay dos defensas, y conviene usar las dos juntas. La primera es poner un límite explícito de profundidad:

\`\`\`sql
-- 1) Cota de profundidad explícita
  ...
  FROM categories AS c
  INNER JOIN arbol AS a ON a.id = c.parent_id
  WHERE a.nivel < 10
\`\`\`

La segunda es ir guardando el camino recorrido y no volver a entrar a una fila por la que ya pasaste:

\`\`\`sql
-- 2) Guardar el camino y no volver a entrar
WITH RECURSIVE arbol(id, name, visitados) AS (
  SELECT id, name, ARRAY[id]
  FROM categories
  WHERE parent_id IS NULL
  UNION ALL
  SELECT c.id, c.name, a.visitados || c.id
  FROM categories AS c
  INNER JOIN arbol AS a ON a.id = c.parent_id
  WHERE NOT c.id = ANY(a.visitados)
)
SELECT id, name FROM arbol;
\`\`\`

La columna \`visitados\` acumula los identificadores por los que ya pasó ese camino, y la condición del \`WHERE\` descarta los que ya están adentro.

En esta plataforma cada consulta tiene un tiempo máximo de ejecución, así que una recursión sin control falla por tiempo agotado y no bloquea nada. En un servidor de producción ese límite puede no existir, de modo que la consulta puede consumir recursos hasta afectar a otras personas: pon siempre una cota.

Usar \`UNION\` en lugar de \`UNION ALL\` elimina las filas repetidas en cada vuelta y ayuda con los ciclos más simples, pero cuesta más tiempo de proceso y no protege cuando las filas repetidas difieren en alguna columna, por ejemplo en el nivel.

## Otro uso: generar series

La recursión no solo sirve para recorrer árboles; también genera secuencias de valores. Es útil para armar un calendario sin huecos y después comparar contra él los días en los que sí hubo ventas:

\`\`\`sql
WITH RECURSIVE dias(dia) AS (
  SELECT DATE '2025-09-01'
  UNION ALL
  SELECT dia + 1 FROM dias WHERE dia < DATE '2025-09-30'
)
SELECT dia FROM dias;
\`\`\`

La condición \`dia < DATE '2025-09-30'\` es lo único que evita que la consulta siga sumando días para siempre. Para este caso concreto PostgreSQL ofrece la función \`generate_series\`, que es más corta; el ejemplo está aquí para que veas con claridad dónde vive la condición de terminación.

## Resumen

\`WITH RECURSIVE\` se compone de un caso base, un \`UNION ALL\` y un paso recursivo que se refiere a sí mismo. Termina cuando una vuelta deja de agregar filas nuevas. Agrega siempre un límite de profundidad o un registro del camino recorrido: los datos con ciclos aparecen más seguido de lo que uno esperaría.

## Próximos pasos

**Lo que ya puedes hacer:** Sabes dividir una consulta compleja en CTE (por _common table expression_) con nombres claros y recorrer jerarquías con una CTE recursiva.

**Antes de seguir:** resuelve los ejercicios y el quiz de esta sección.

**Lo que sigue:** Sección 23 · Operaciones de conjuntos. Vas a apilar o comparar resultados completos de consultas distintas.

**Para practicar (opcional):** ¿Qué comercios de Bolsillo tuvieron más movimientos que el promedio de su rubro? Cuenta \`transactions\` por \`merchant_id\` en una CTE y promedia por \`category\` de \`merchants\` en otra.
`,
  },
];
