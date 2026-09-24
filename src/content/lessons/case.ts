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

La base de datos guarda códigos: \`status = 'delivered'\`, \`country = 'MX'\`, \`rating = 4.7\`. Quien lee el reporte habla en etiquetas: «entregado», «Norteamérica», «vendedor destacado». \`CASE\` es la construcción de SQL que traduce lo primero en lo segundo **dentro de la misma consulta**, así que no necesitas exportar los datos a una planilla ni pedirle al equipo de sistemas que agregue una columna a la tabla.

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

PostgreSQL evalúa los \`WHEN\` **en orden**, de arriba hacia abajo, y se detiene en el primero que resulta verdadero; las ramas siguientes ni siquiera se evalúan. Por eso este \`CASE\` está mal escrito:

\`\`\`sql
CASE
  WHEN rating >= 4.0 THEN 'Confiable'
  WHEN rating >= 4.5 THEN 'Destacado'   -- nunca se alcanza
  ELSE 'A mejorar'
END
\`\`\`

Un vendedor con 4.8 cumple la primera condición y sale etiquetado como «Confiable». La segunda rama no se alcanza nunca, para ninguna fila, así que la etiqueta «Destacado» jamás aparece en el reporte. Regla práctica: ordena los umbrales de más exigente a menos exigente, o al revés, pero siempre de forma consistente y nunca mezclados.

## Sin ELSE el resultado es NULL

\`ELSE\` es opcional. Si ninguna rama coincide y no hay \`ELSE\`, el resultado de la fila es **NULL**:

\`\`\`sql
CASE WHEN status = 'delivered' THEN 'Entregado' END
\`\`\`

Un pedido cancelado devuelve NULL en esa columna. A veces ese NULL es justamente lo que buscas; la mayoría de las veces es un olvido que después aparece como celdas vacías en el reporte y obliga a rehacerlo. Escribe siempre el \`ELSE\`, aunque sea \`ELSE 'Otro'\`.

## Todas las ramas, el mismo tipo

Los resultados de los \`THEN\` y del \`ELSE\` deben ser de tipos compatibles. Esto falla:

\`\`\`sql
CASE WHEN rating >= 4.5 THEN 'Destacado' ELSE 0 END
\`\`\`

PostgreSQL intenta encontrar un tipo común entre texto y número, no lo encuentra y devuelve un error que corta la consulta. Decide antes de escribir si esa columna va a ser texto (una etiqueta) o número (un puntaje) y mantén esa decisión en todas las ramas, incluido el \`ELSE\`.

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

Casi todo análisis empieza agrupando: pedidos chicos y grandes, clientes nuevos y recurrentes, entregas a tiempo y entregas tarde. Esos cortes rara vez existen como una columna de la base de datos: los define el área de negocio y los construye quien analiza, consulta por consulta. \`CASE\` es la herramienta para escribirlos una sola vez, de modo que todo el equipo use la misma definición y los reportes cierren entre sí.

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

No hace falta escribir \`WHEN total_amount >= 2000 AND total_amount < 10000\`: si la fila llegó a la segunda rama es porque ya no cumplió la primera. Escribir los dos límites tampoco está mal, pero es más largo y, cuando alguien ajusta un umbral, es fácil corregir un solo lado y dejar un hueco o un solapamiento entre tramos.

Define siempre si el límite es inclusivo o exclusivo y déjalo documentado en el nombre de la etiqueta o en el pedido. «Hasta 2000» y «menos de 2000» son cosas distintas para quien recibe el reporte.

## NULL no cumple ninguna condición

Un NULL es un valor ausente: no es mayor, ni menor, ni igual a nada, ni siquiera a otro NULL. Cualquier comparación con él devuelve «desconocido», y «desconocido» no es verdadero, así que ningún \`WHEN\` lo acepta. El resultado es que una fila con \`rating\` en NULL **cae en el \`ELSE\`**:

\`\`\`sql
CASE
  WHEN rating >= 4.5 THEN 'Destacado'
  WHEN rating >= 4.0 THEN 'Confiable'
  ELSE 'A mejorar'          -- aquí caen también los vendedores sin reseñas
END
\`\`\`

Eso etiqueta como «a mejorar» a vendedores que nunca recibieron una calificación, lo que pone un dato falso en el reporte: la consulta se ejecuta sin error, pero la conclusión que sacará quien la lea es incorrecta. La solución es darles una rama propia:

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

Si ordenaras directamente por \`status\`, el resultado saldría alfabético y \`cancelled\` aparecería antes que \`paid\`, un orden que no le dice nada a quien lee el reporte. Con \`CASE\` defines el orden real del ciclo de vida del pedido. También puedes ordenar por el alias de una columna calculada, que suele leerse mejor.

## Lo que viene después

Cuando combinas \`CASE\` con funciones de agregación puedes obtener varios conteos por categoría en una sola fila de resultado, por ejemplo cuántos pedidos hay en cada tramo, uno al lado del otro. Esa técnica se llama agregación condicional y tiene su propia sección más adelante; por ahora quédate con la idea de clasificar fila por fila.

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

Dos de los \`CASE\` que más se escriben repiten siempre la misma forma: «si esto es NULL, muestra otra cosa» y «si esto vale tal valor, trátalo como si fuera NULL». SQL tiene un atajo para cada uno: \`COALESCE\` y \`NULLIF\`. Conocerlos acorta tus consultas y, sobre todo, hace más fácil entenderlas para quien las revise.

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

Rellenar un NULL con un valor tiene consecuencias. \`COALESCE(rating, 0)\` está bien para un listado que solo se mira, pero convierte «sin datos» en «puntaje cero»: si después calculas un promedio, esos ceros lo bajan y el número deja de ser cierto.

## NULLIF: producir un NULL a propósito

\`NULLIF(a, b)\` devuelve NULL cuando \`a = b\` y, si no, devuelve \`a\`. Equivale a \`CASE WHEN a = b THEN NULL ELSE a END\`. Sus dos usos clásicos:

\`\`\`sql
-- Tratar la cadena vacía como ausencia de dato
NULLIF(trim(description), '')

-- Evitar la división por cero
amount / NULLIF(installments, 0)
\`\`\`

En el segundo caso, cuando \`installments\` vale 0 el divisor se convierte en NULL y la división devuelve NULL, en lugar de provocar el error «division by zero» («división por cero») que cortaría toda la consulta.

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

- \`COALESCE\` y \`NULLIF\` son \`CASE\` especializados en NULL: no permiten hacer nada que \`CASE\` no haga, pero se leen mucho mejor.
- Rellenar un NULL cambia el significado del dato: hazlo cuando solo vas a mostrarlo y piénsalo dos veces si ese valor va a entrar en un cálculo.
- Con tres o más categorías, vuelve a \`CASE\`.

## Próximos pasos

**Lo que ya puedes hacer:** Sabes escribir expresiones CASE que convierten códigos en etiquetas y rangos numéricos en segmentos, sin olvidar la rama ELSE.

**Antes de seguir:** resuelve los ejercicios y el quiz de esta sección.

**Lo que sigue:** Sección 13 · Ordenar y limitar resultados. Vas a ordenar los resultados como pide el negocio y quedarte con los primeros.

**Para practicar (opcional):** ¿Qué canciones de Ritmo son cortas, medianas o largas? En \`tracks\`, según \`duration_seconds\`, menos de 180 es corta, más de 300 es larga y el resto es mediana.
`,
  },
];
