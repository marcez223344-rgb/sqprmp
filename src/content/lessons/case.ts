import type { LessonDef } from "../schemas/curriculum";

const section = "case";

export const lessons: LessonDef[] = [
  {
    slug: "case-simple-y-buscada",
    section,
    kind: "theory",
    title: "CASE: decidir dentro de la consulta",
    sort_order: 0,
    estimated_minutes: 9,
    is_free: false,
    is_published: true,
    prerequisites: ["alias-y-expresiones-basico"],
    dataset: "tiendaviva",
    body_md: `## Por qué importa

La base de datos guarda códigos: \`status = 'delivered'\`, \`country = 'MX'\`, \`rating = 4.7\`. El negocio habla en etiquetas: «entregado», «Norteamérica», «vendedor destacado». \`CASE\` es la expresión que traduce una cosa en la otra **dentro de la consulta**, sin exportar a una planilla y sin pedirle un cambio al equipo de sistemas.

## CASE buscada: condiciones libres

Es la forma más usada. Cada \`WHEN\` lleva una condición completa:

\`\`\`sql
SELECT
  id,
  store_name,
  rating,
  CASE
    WHEN rating >= 4.5 THEN 'Destacado'
    WHEN rating >= 4.0 THEN 'Confiable'
    ELSE 'A mejorar'
  END AS segmento
FROM sellers;
\`\`\`

\`CASE\` es una **expresión**: produce un valor por fila, igual que \`rating * 2\` o \`upper(store_name)\`. Por eso vive en la lista del \`SELECT\`, termina con \`END\` y casi siempre lleva un alias.

## CASE simple: comparar un valor contra una lista

Cuando todas las condiciones son «esta columna es igual a…», existe una forma más corta:

\`\`\`sql
SELECT
  id,
  status,
  CASE status
    WHEN 'delivered' THEN 'Entregado'
    WHEN 'shipped'   THEN 'En camino'
    WHEN 'cancelled' THEN 'Cancelado'
    ELSE 'Otro estado'
  END AS estado
FROM orders;
\`\`\`

La expresión va **una sola vez**, después de \`CASE\`, y cada \`WHEN\` solo indica el valor a comparar. Es equivalente a escribir \`WHEN status = 'delivered' THEN ...\`. La forma simple únicamente compara por igualdad: si necesitas \`>\`, \`<\`, \`IN\`, \`LIKE\` o \`IS NULL\`, usa la forma buscada.

## La primera coincidencia gana

PostgreSQL evalúa los \`WHEN\` **en orden** y se detiene en el primero que sea verdadero. El resto ni se mira. Por eso este \`CASE\` está mal escrito:

\`\`\`sql
CASE
  WHEN rating >= 4.0 THEN 'Confiable'
  WHEN rating >= 4.5 THEN 'Destacado'   -- nunca se alcanza
  ELSE 'A mejorar'
END
\`\`\`

Un vendedor con 4.8 cumple la primera condición y sale como «Confiable». La segunda rama es código muerto. Regla práctica: ordena los umbrales de más exigente a menos exigente (o al revés, de forma consistente), nunca mezclados.

## Sin ELSE el resultado es NULL

\`ELSE\` es opcional. Si ninguna rama coincide y no hay \`ELSE\`, el resultado de la fila es **NULL**:

\`\`\`sql
CASE WHEN status = 'delivered' THEN 'Entregado' END
\`\`\`

Un pedido cancelado devuelve NULL en esa columna. A veces es lo que quieres; la mayoría de las veces es un olvido que después aparece como huecos en un reporte. Escribe siempre el \`ELSE\`, aunque sea \`ELSE 'Otro'\`.

## Todas las ramas, el mismo tipo

Los resultados de los \`THEN\` y del \`ELSE\` deben ser de tipos compatibles. Esto falla:

\`\`\`sql
CASE WHEN rating >= 4.5 THEN 'Destacado' ELSE 0 END
\`\`\`

PostgreSQL intenta unificar texto con número y devuelve un error. Decide si la columna es texto (etiqueta) o número (puntaje) y sé consistente en todas las ramas.

## Resumen

- \`CASE\` es una expresión que devuelve un valor por fila; la forma simple compara por igualdad y la buscada acepta cualquier condición.
- Se evalúa de arriba hacia abajo y **gana la primera coincidencia**.
- Sin \`ELSE\`, las filas que no coinciden quedan en NULL; todas las ramas deben devolver el mismo tipo.
`,
  },
  {
    slug: "case-segmentos-de-negocio",
    section,
    kind: "theory",
    title: "Crear segmentos y tramos con CASE",
    sort_order: 1,
    estimated_minutes: 9,
    is_free: false,
    is_published: true,
    prerequisites: ["case-simple-y-buscada"],
    dataset: "tiendaviva",
    body_md: `## Por qué importa

Casi todo análisis empieza agrupando: pedidos chicos y grandes, clientes nuevos y recurrentes, entregas a tiempo y tarde. Esos cortes rara vez existen como columna en la base: los define el negocio y los construye quien analiza. \`CASE\` es la herramienta para escribirlos una vez y que todo el equipo use la misma definición.

## Tramos numéricos sin huecos ni solapamientos

Aprovecha que gana la primera coincidencia: escribe solo el límite que cambia.

\`\`\`sql
SELECT
  id,
  total_amount,
  CASE
    WHEN total_amount < 2000  THEN 'Chico'
    WHEN total_amount < 10000 THEN 'Mediano'
    WHEN total_amount < 40000 THEN 'Grande'
    ELSE 'Premium'
  END AS tramo
FROM orders
WHERE currency = 'UYU';
\`\`\`

No hace falta escribir \`WHEN total_amount >= 2000 AND total_amount < 10000\`: si la fila llegó a la segunda rama es porque ya no cumplió la primera. Escribir los dos límites no está mal, pero es más largo y más fácil de romper.

Define siempre si el límite es inclusivo o exclusivo y déjalo documentado en el nombre de la etiqueta o en el pedido. «Hasta 2000» y «menos de 2000» son cosas distintas para quien recibe el reporte.

## NULL no cumple ninguna condición

Un NULL no es mayor, ni menor, ni igual a nada: la comparación da «desconocido», que no es verdadero. Entonces una fila con \`rating\` NULL **cae en el \`ELSE\`**:

\`\`\`sql
CASE
  WHEN rating >= 4.5 THEN 'Destacado'
  WHEN rating >= 4.0 THEN 'Confiable'
  ELSE 'A mejorar'          -- aquí caen también los vendedores sin reseñas
END
\`\`\`

Eso etiqueta como «a mejorar» a vendedores que nunca fueron calificados: un error de negocio, no de sintaxis. La solución es una rama explícita:

\`\`\`sql
CASE
  WHEN rating IS NULL THEN 'Sin calificación'
  WHEN rating >= 4.5  THEN 'Destacado'
  WHEN rating >= 4.0  THEN 'Confiable'
  ELSE 'A mejorar'
END
\`\`\`

Como NULL nunca coincide con las comparaciones numéricas, esa rama puede ir en cualquier posición antes del \`ELSE\`; ponerla primera hace la intención evidente.

## CASE también sirve fuera del SELECT

Al ser una expresión, \`CASE\` se puede usar en \`WHERE\` y en \`ORDER BY\`. El uso más útil es un orden de negocio a medida:

\`\`\`sql
SELECT id, status
FROM orders
ORDER BY
  CASE status
    WHEN 'pending'   THEN 1
    WHEN 'paid'      THEN 2
    WHEN 'shipped'   THEN 3
    WHEN 'delivered' THEN 4
    ELSE 5
  END,
  id;
\`\`\`

Alfabéticamente, \`cancelled\` iría antes que \`paid\`; con \`CASE\` defines el orden real del ciclo de vida del pedido. También puedes ordenar por el alias de una columna calculada, que suele ser más legible.

## Lo que viene después

Cuando combinas \`CASE\` con funciones de agregación obtienes «conteos por categoría en una sola fila» (por ejemplo, cuántos pedidos hay en cada tramo). Eso se llama agregación condicional y tiene su propia sección más adelante; por ahora quédate con la idea de clasificar fila por fila.

## Resumen

- Los tramos se escriben con un solo límite por rama, aprovechando que gana la primera coincidencia.
- NULL no cumple ninguna condición: si no le das una rama propia, termina en el \`ELSE\`.
- \`CASE\` también funciona en \`ORDER BY\` para imponer un orden de negocio.
`,
  },
  {
    slug: "case-coalesce-y-nullif",
    section,
    kind: "theory",
    title: "COALESCE y NULLIF: los CASE abreviados",
    sort_order: 2,
    estimated_minutes: 6,
    is_free: false,
    is_published: true,
    prerequisites: ["case-segmentos-de-negocio", "null-coalesce-y-nullif"],
    dataset: "bolsillo",
    body_md: `## Por qué importa

Dos de los \`CASE\` que más se escriben son siempre iguales: «si esto es NULL, muestra otra cosa» y «si esto vale X, trátalo como NULL». SQL tiene un atajo para cada uno. Conocerlos hace tus consultas más cortas y, sobre todo, más fáciles de leer para quien las revise.

## COALESCE: el primer valor no nulo

\`\`\`sql
SELECT
  id,
  COALESCE(description, 'sin detalle') AS detalle
FROM transactions;
\`\`\`

Es exactamente equivalente a:

\`\`\`sql
CASE WHEN description IS NULL THEN 'sin detalle' ELSE description END
\`\`\`

\`COALESCE\` acepta varios argumentos y devuelve el primero que no sea NULL, así que reemplaza a una cadena de \`CASE\` anidados:

\`\`\`sql
COALESCE(note, description, 'sin concepto')
\`\`\`

Recuerda que rellenar con un valor tiene consecuencias: \`COALESCE(rating, 0)\` está bien para un listado, pero convierte «sin datos» en «puntaje cero» y arruina cualquier promedio posterior.

## NULLIF: producir un NULL a propósito

\`NULLIF(a, b)\` devuelve NULL cuando \`a = b\` y, si no, devuelve \`a\`. Equivale a \`CASE WHEN a = b THEN NULL ELSE a END\`. Sus dos usos clásicos:

\`\`\`sql
-- Tratar la cadena vacía como ausencia de dato
NULLIF(trim(description), '')

-- Evitar la división por cero
amount / NULLIF(installments, 0)
\`\`\`

En el segundo caso el resultado es NULL en lugar de un error que corta toda la consulta.

## Cuándo usar cada uno

- Un solo caso NULL → \`COALESCE\`.
- Un solo valor que debe volverse NULL → \`NULLIF\`.
- Tres o más categorías, rangos, condiciones con \`AND\`/\`OR\` → \`CASE\`.

Se combinan sin problema. Este ejemplo clasifica el riesgo de un movimiento marcado por antifraude y, además, deja legible el campo libre:

\`\`\`sql
SELECT
  id,
  amount,
  CASE status
    WHEN 'reversed' THEN 'Fraude confirmado'
    WHEN 'failed'   THEN 'Bloqueado'
    WHEN 'pending'  THEN 'En revisión'
    ELSE 'Alerta sin bloqueo'
  END AS nivel_riesgo,
  COALESCE(description, 'sin detalle') AS detalle
FROM transactions
WHERE is_flagged;
\`\`\`

## Resumen

- \`COALESCE\` y \`NULLIF\` son \`CASE\` especializados en NULL; no agregan poder, agregan claridad.
- Rellenar NULL cambia el significado del dato: hazlo para mostrar, piénsalo dos veces para calcular.
- Con tres o más categorías, vuelve a \`CASE\`.
`,
  },
];
