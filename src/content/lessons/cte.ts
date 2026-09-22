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

Cuando una pregunta de negocio tiene varios pasos («primero el gasto de cada cliente, después el promedio por país»), la consulta se llena de subconsultas anidadas que se leen de adentro hacia afuera. Una **CTE** (Common Table Expression, o expresión de tabla común) le pone **nombre** a cada paso y deja que la consulta se lea de arriba hacia abajo, igual que el razonamiento que hiciste.

Trabajas con **TiendaViva**: \`orders\`, \`order_items\`, \`products\`, \`categories\`, \`customers\`, \`sellers\`.

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

El bloque \`WITH nombre AS (...)\` define un resultado temporal que existe **solo durante esa consulta**. Después lo usas en el \`FROM\` como si fuera una tabla: tiene nombre, columnas y alias propios.

Dos detalles de sintaxis que ahorran errores:

- El \`WITH\` va **antes** del \`SELECT\` principal, y entre la CTE y ese \`SELECT\` no hay punto y coma.
- Puedes declarar los nombres de las columnas: \`WITH gasto (customer_id, country, total) AS (...)\`.

## Encadenar varias CTE

Separas las CTE con comas y **cada una puede usar las anteriores**:

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

\`por_cliente\` lee de \`entregas\`, no de \`orders\`: el filtro de estado se escribió una sola vez. La dependencia va en un solo sentido; una CTE **no puede** referirse a otra declarada después (salvo en el caso recursivo de la lección 3).

## Reutilizar la misma CTE

Una CTE se puede nombrar **varias veces** en la misma consulta. Eso es imposible con una subconsulta en \`FROM\`, que tendrías que copiar y pegar:

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

El nombre \`ventas\` aparece dos veces: una en el \`FROM\` y otra dentro de la subconsulta escalar que calcula el promedio. Una definición, dos usos.

## Cómo nombrar

Los nombres son la mitad del beneficio. Usa sustantivos del negocio en minúsculas: \`entregas\`, \`gasto_por_cliente\`, \`categorias_activas\`. Evita \`t1\`, \`tmp\`, \`cte2\`: no le dicen nada a quien revise la consulta dentro de seis meses (muchas veces, tú).

## Errores comunes

- Poner punto y coma al cerrar la CTE: la consulta queda incompleta.
- Olvidar la coma entre dos CTE, o ponerla también antes del \`SELECT\` final.
- Referirse a una CTE desde otra declarada más abajo.
- Creer que la CTE queda guardada: desaparece al terminar la consulta. Si la necesitas todos los días, lo que quieres es una vista.

## Resumen

\`WITH nombre AS (...)\` le da nombre a un paso intermedio. Varias CTE se encadenan con comas y cada una puede leer las anteriores. La misma CTE puede usarse varias veces, algo que una subconsulta no permite sin duplicar código.
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

Estas tres versiones de **Pídelo** describen el mismo conjunto de filas:

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

Ninguna es «la correcta». Cambian la **legibilidad** y el **alcance**, no el resultado.

## Cómo elegir

| Necesitas | Herramienta |
| --- | --- |
| Un paso corto, usado una sola vez | Subconsulta |
| Varios pasos con nombre, o un paso usado dos veces | CTE |
| La misma definición en muchas consultas, compartida con el equipo | Vista |

Una CTE vive dentro de la consulta; una vista es un objeto de la base de datos que otras personas pueden consultar. En esta plataforma solo ejecutas \`SELECT\`, así que la vista aparece como concepto, no como ejercicio.

## Anidar menos, leer mejor

La diferencia se nota con tres pasos. Con subconsultas:

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

Se lee de adentro hacia afuera. La versión con dos CTE encadenadas (\`entregas\` y luego \`por_ciudad\`) dice lo mismo en el orden en que lo pensaste, y cada paso se puede probar por separado mientras escribes: cambias el \`SELECT\` final por \`SELECT * FROM entregas LIMIT 20\` y revisas ese paso aislado. Es la mejor técnica de depuración que te da una CTE.

## ¿La CTE es más lenta?

Hubo una regla popular: «en PostgreSQL la CTE es una barrera de optimización». Hoy hay que matizarla.

- Hasta PostgreSQL 11, toda CTE se **materializaba**: se calculaba completa y se guardaba en un resultado temporal, aunque el filtro externo hubiera permitido leer menos filas.
- Desde PostgreSQL 12 (esta plataforma usa 17), el planificador **puede integrarla** en la consulta principal, igual que una subconsulta, cuando se usa una sola vez, no es recursiva y no tiene efectos secundarios.
- Puedes forzar cualquiera de los dos comportamientos: \`WITH activos AS MATERIALIZED (...)\` o \`AS NOT MATERIALIZED (...)\`.

Regla honesta: escribe primero la versión legible. Si una CTE cara se usa varias veces, \`MATERIALIZED\` evita recalcularla; si una CTE simple impide que un filtro baje hasta la tabla, \`NOT MATERIALIZED\` ayuda. Decídelo mirando \`EXPLAIN\`, no por costumbre.

## Errores comunes

- Partir una consulta de dos líneas en cinco CTE: más nombres que lógica.
- Suponer que la CTE queda «en memoria» para consultas posteriores.
- Repetir la misma subconsulta tres veces en vez de nombrarla una vez.

## Resumen

Subconsulta para un paso simple, CTE para una secuencia de pasos con nombre o reutilizados, vista para compartir la definición. En PostgreSQL moderno la CTE ya no es automáticamente una barrera de optimización, y \`MATERIALIZED\` / \`NOT MATERIALIZED\` te dejan decidir.
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

Categorías con subcategorías, organigramas, respuestas a comentarios, piezas compuestas por piezas: son **jerarquías**. La tabla guarda \`parent_id\` y recorrerla exige repetir el mismo join tantas veces como niveles haya, un número que normalmente no conoces al escribir la consulta. La **CTE recursiva** hace ese recorrido sin saber la profundidad de antemano.

En **TiendaViva**, \`categories\` tiene \`id\`, \`name\` y \`parent_id\` (NULL en las categorías raíz).

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

Tres partes obligatorias:

1. **\`RECURSIVE\`** justo después de \`WITH\` (se escribe una sola vez aunque haya varias CTE).
2. Un **caso base** que no se refiere a la CTE: de dónde arranca el recorrido.
3. Un **paso recursivo**, unido con \`UNION ALL\` (o \`UNION\`), que sí menciona la CTE.

Las dos ramas deben tener la misma cantidad de columnas y tipos compatibles.

Fíjate en la **lista de columnas** declarada junto al nombre: \`arbol(id, name, parent_id, nivel, ruta)\`. Es la forma que usa la documentación de PostgreSQL, evita repetir alias en las dos ramas y, en esta plataforma, es la única que acepta el analizador de consultas para una CTE recursiva.

## Cómo se ejecuta

El motor evalúa el caso base y guarda esas filas. Luego ejecuta el paso recursivo usando **solo las filas nuevas** de la vuelta anterior, y repite. Cuando una vuelta no produce ninguna fila nueva, se detiene y devuelve la unión de todo.

Ese «no produce filas nuevas» es la **condición de terminación**, y depende de ti que llegue a cumplirse. Aquí se cumple porque el árbol de categorías es finito y ninguna categoría es ancestro de sí misma: en algún momento no quedan hijos por agregar.

## El riesgo real: recursión infinita

Si los datos tienen un ciclo (A es padre de B y B es padre de A), el paso recursivo siempre encuentra filas nuevas y la consulta no termina: crece hasta agotar el tiempo o la memoria. Es la forma clásica de colgar una consulta.

Dos defensas, y conviene usar las dos:

\`\`\`sql
-- 1) Cota de profundidad explícita
  ...
  FROM categories AS c
  INNER JOIN arbol AS a ON a.id = c.parent_id
  WHERE a.nivel < 10
\`\`\`

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

En este entorno cada consulta tiene un tiempo máximo de ejecución, así que una recursión sin control falla por tiempo agotado en lugar de bloquear algo. En producción ese límite puede no existir: pon siempre una cota.

\`UNION\` en lugar de \`UNION ALL\` elimina filas repetidas en cada vuelta y ayuda con ciclos simples, pero cuesta más y no protege cuando las filas difieren en alguna columna (por ejemplo, el nivel).

## Otro uso: generar series

La recursión no solo recorre árboles; también genera secuencias, útil para armar calendarios sin huecos:

\`\`\`sql
WITH RECURSIVE dias(dia) AS (
  SELECT DATE '2025-09-01'
  UNION ALL
  SELECT dia + 1 FROM dias WHERE dia < DATE '2025-09-30'
)
SELECT dia FROM dias;
\`\`\`

La condición \`dia < DATE '2025-09-30'\` es lo único que evita que siga sumando días para siempre. Para este caso puntual PostgreSQL ofrece \`generate_series\`; el ejemplo sirve para ver la terminación.

## Resumen

\`WITH RECURSIVE\` = caso base + \`UNION ALL\` + paso recursivo que se refiere a sí mismo. Termina cuando una vuelta no agrega filas nuevas. Agrega siempre una cota de profundidad o un registro del camino recorrido: los datos con ciclos son más frecuentes de lo que parece.
`,
  },
];
