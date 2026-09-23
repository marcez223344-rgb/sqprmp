import type { LessonDef } from "../schemas/curriculum";

const section = "calidad-de-datos";

export const lessons: LessonDef[] = [
  {
    slug: "calidad-de-datos-perfilar-una-tabla",
    section,
    kind: "theory",
    title: "Perfilar una tabla que no conoces",
    sort_order: 0,
    estimated_minutes: 10,
    is_free: false,
    is_published: true,
    prerequisites: ["anatomia-de-una-tabla", "agregacion-count-sum-avg"],
    dataset: "ritmo",
    body_md: `## Por qué importa

Tu primer día en un equipo de datos casi nunca empieza con una pregunta de negocio: empieza con una tabla que nadie te explicó. Antes de calcular una sola métrica sobre ella tienes que responder cuatro preguntas propias del oficio: **qué representa una fila**, **cuánto abarca**, **qué falta** y **qué es imposible**. A eso se le llama perfilar (*profiling*), y son quince minutos de SQL que te ahorran semanas de reportes equivocados.

La tentación es saltear este paso porque «el dato viene del sistema y el sistema está bien». No lo está. Toda tabla de producción arrastra migraciones, reintentos, integraciones a medias y reglas que cambiaron en el camino.

## 1. El volumen y la ventana

La primera consulta de tu vida con una tabla nueva es siempre la misma:

\`\`\`sql
SELECT
  count(*) AS total_rows,
  min(played_at AT TIME ZONE 'UTC') AS first_played_at,
  max(played_at AT TIME ZONE 'UTC') AS last_played_at
FROM plays;
\`\`\`

Te dice si la tabla tiene el tamaño que te anunciaron y, sobre todo, **hasta cuándo llegan los datos**. Una carga que se cortó hace tres semanas se descubre aquí o no se descubre nunca.

Fíjate en el \`AT TIME ZONE 'UTC'\`: las marcas de tiempo son \`timestamptz\` y se muestran en el huso de la sesión. El sandbox fija la sesión en UTC para que el mismo perfilado dé siempre el mismo resultado, así que aquí no vas a ver la diferencia; en el servidor de tu trabajo la sesión puede estar en otra zona y «hasta cuándo llegan los datos» pasa a depender de esa configuración. Perfilar es dejar constancia: fija el huso y anota cuál usaste, porque un rango de fechas sin huso declarado no sirve como evidencia en una auditoría.

## 2. La granularidad: ¿qué es una fila?

Saber que hay 109 382 filas no sirve si no sabes qué cuenta cada una. Compara el total con los distintos de las columnas candidatas:

\`\`\`sql
SELECT
  count(*) AS total_rows,
  count(DISTINCT user_id) AS distinct_users,
  count(DISTINCT track_id) AS distinct_tracks
FROM plays;
\`\`\`

Con 4768 oyentes y 6203 canciones en 109 382 filas, una fila **no** es un oyente ni una canción: es un evento de reproducción. Ese razonamiento define de inmediato qué joins te van a multiplicar filas después.

El paso siguiente es probar la clave de negocio que crees que identifica una fila:

\`\`\`sql
SELECT user_id, track_id, played_at, count(*) AS copies
FROM plays
GROUP BY user_id, track_id, played_at
HAVING count(*) > 1;
\`\`\`

Si devuelve filas, esa combinación **no** es única y cualquier conteo que hagas sobre la tabla está inflado. En \`plays\` devuelve 340 combinaciones repetidas.

## 3. Lo que falta

\`count(*)\` cuenta filas; \`count(columna)\` cuenta valores no nulos. La resta entre ambos es, exactamente, la cantidad de nulos:

\`\`\`sql
SELECT
  count(*) - count(seconds_played) AS seconds_played_nulls,
  count(*) - count(device) AS device_nulls
FROM plays;
\`\`\`

Un nulo no es un error por sí mismo: la pregunta siempre es **por qué falta**. \`device\` nulo en el 1,6 % de las filas suele ser un cliente viejo que no manda el campo; \`seconds_played\` nulo es un evento que se cortó. Lo grave sería que faltara el 40 %, o que faltara solo en un país.

## 4. Lo imposible

El perfil cierra con los valores que el negocio prohíbe: segundos negativos, importes mayores que el total del pedido, fechas de entrega anteriores al envío. Se cuentan con agregación condicional y se comparan contra el total, porque un número suelto no dice nada:

\`\`\`sql
SELECT
  count(*) FILTER (WHERE seconds_played < 0) AS negative_seconds,
  round(100.0 * count(*) FILTER (WHERE seconds_played < 0) / count(*), 3) AS negative_pct
FROM plays;
\`\`\`

## El método, en orden

1. Volumen y ventana temporal (con el huso fijo).
2. Granularidad: qué representa una fila y qué combinación la identifica.
3. Completitud: nulos por columna, en cantidad y en porcentaje.
4. Validez: rangos, dominios y reglas de negocio imposibles.
5. Duplicados y huecos referenciales (las dos lecciones que siguen).

Guarda ese perfil como consulta, no como captura de pantalla: lo vas a volver a correr cada vez que el dato cambie.

## Resumen

- Perfilar es responder qué es una fila, cuánto abarca la tabla, qué falta y qué es imposible.
- \`count(*) - count(columna)\` cuenta nulos; \`GROUP BY ... HAVING count(*) > 1\` prueba la clave de negocio.
- Fija siempre el huso con \`AT TIME ZONE 'UTC'\`: una fecha sin huso no es evidencia auditable.
`,
  },
  {
    slug: "calidad-de-datos-nulos-y-categorias",
    section,
    kind: "theory",
    title: "Nulos, vacíos y categorías que no coinciden",
    sort_order: 1,
    estimated_minutes: 10,
    is_free: false,
    is_published: true,
    prerequisites: [
      "calidad-de-datos-perfilar-una-tabla",
      "null-coalesce-y-nullif",
      "texto-normalizar-y-limpiar",
    ],
    dataset: "ritmo",
    body_md: `## Por qué importa

«Falta el dato» tiene al menos tres formas distintas en una base real: \`NULL\`, la cadena vacía \`''\` y el texto que alguien escribió para decir que no sabe (\`'N/A'\`, \`'-'\`, \`'sin dato'\`). Las tres significan lo mismo para el negocio y **ninguna** se comporta igual en SQL. A eso se suma el problema gemelo: la misma categoría escrita de varias maneras, que parte un total en pedazos sin que nadie lo note.

## NULL se esconde de los GROUP BY que lees rápido

\`GROUP BY\` sí crea un grupo para \`NULL\`, pero ese grupo aparece con la celda vacía y se pierde de vista en una planilla. Haz el nulo explícito:

\`\`\`sql
SELECT
  coalesce(device, 'sin_dato') AS device,
  count(*) AS plays
FROM plays
GROUP BY coalesce(device, 'sin_dato')
ORDER BY plays DESC;
\`\`\`

Ahora \`sin_dato\` es una categoría con 1745 filas, visible y discutible. Si en cambio filtraras con \`WHERE device <> 'mobile'\`, esas 1745 filas **desaparecerían**: la comparación con \`NULL\` no da verdadero ni falso, da desconocido, y el \`WHERE\` solo deja pasar lo verdadero. Para incluirlas hay que escribirlo: \`WHERE device IS NULL OR device <> 'mobile'\`.

## La cadena vacía no es NULL

\`''\` es un valor: ocupa lugar, \`count(columna)\` lo cuenta y \`IS NULL\` devuelve falso. Un perfil honesto mide las dos cosas por separado y las unifica al reportar:

\`\`\`sql
SELECT
  count(*) FILTER (WHERE comment IS NULL) AS null_comments,
  count(*) FILTER (WHERE btrim(comment) = '') AS blank_comments
FROM ratings;
\`\`\`

\`nullif(btrim(comment), '')\` es el traductor entre los dos mundos: convierte el vacío (y el que solo tiene espacios) en \`NULL\`, para que el resto de la consulta trate un solo caso.

## Categorías que no coinciden

El clásico de todo CRM: el mismo correo cargado dos veces con distinta capitalización. En \`tiendaviva\`, \`customers\` tiene 3000 filas y 2998 correos distintos; al normalizar bajan a 2961. Es decir: 37 personas están cargadas más de una vez.

\`\`\`sql
SELECT lower(btrim(email)) AS normalized_email, count(*) AS people_rows
FROM customers
GROUP BY lower(btrim(email))
HAVING count(*) > 1;
\`\`\`

La normalización mínima que conviene aplicar antes de agrupar texto:

- \`btrim(x)\` quita espacios al inicio y al final (el error más frecuente de una carga desde una planilla).
- \`lower(x)\` iguala mayúsculas y minúsculas.
- \`regexp_replace(x, ' +', ' ', 'g')\` colapsa espacios internos repetidos.

Cuidado: normalizar sirve para **detectar y agrupar**, no para reescribir la tabla sin permiso. Que dos filas parezcan la misma persona no autoriza a fusionarlas; eso es una decisión de negocio con consecuencias legales y contables.

## Los nulos al agregar

Los agregados ignoran los nulos, y eso cambia el resultado según lo que preguntes:

\`\`\`sql
SELECT
  avg(seconds_played) AS avg_over_known,
  sum(seconds_played) / count(*) AS avg_over_all
FROM plays;
\`\`\`

La primera divide por las filas **con dato**; la segunda, por todas. Ninguna está mal: están respondiendo preguntas distintas. Lo que está mal es no saber cuál estás mostrando. Regla práctica: cuando reportes un promedio sobre una columna con nulos, reporta al lado cuántas filas quedaron fuera.

## Cómo se comunica esto

Un hallazgo de calidad se reporta siempre con tres datos: **qué regla se rompe**, **cuántas filas** y **sobre qué total**. «Hay nulos en \`device\`» no mueve a nadie; «1745 de 109 382 reproducciones (1,6 %) no tienen dispositivo» abre un ticket.

## Resumen

- \`NULL\`, \`''\` y \`'N/A'\` son tres cosas distintas para SQL y la misma para el negocio: mídelas por separado, únelas al reportar.
- \`coalesce\` hace visible el grupo nulo; \`nullif(btrim(x), '')\` convierte el vacío en nulo.
- Normaliza texto (\`lower\`, \`btrim\`) para detectar categorías duplicadas; detectar no es fusionar.
`,
  },
  {
    slug: "calidad-de-datos-validez-y-huecos",
    section,
    kind: "theory",
    title: "Reglas de validez, huecos referenciales y el reporte",
    sort_order: 2,
    estimated_minutes: 11,
    is_free: false,
    is_published: true,
    prerequisites: [
      "calidad-de-datos-nulos-y-categorias",
      "subconsultas-in-exists-y-null",
      "union-y-union-all",
    ],
    dataset: "ritmo",
    body_md: `## Por qué importa

Perfilar te dice cómo es la tabla. Auditar te dice **dónde incumple las reglas** que el negocio da por ciertas. La diferencia práctica: el perfil se mira una vez, la auditoría se convierte en una consulta que corre cada semana y que cualquiera puede repetir para llegar a tu mismo número.

## Reglas de dominio: un solo campo

Son las más baratas y las que más vergüenza ahorran. Cada columna tiene un conjunto de valores posibles, aunque la base no lo declare: \`seconds_played\` no puede ser negativo, un porcentaje vive entre 0 y 100, \`status\` solo toma cinco valores.

\`\`\`sql
SELECT count(*) FILTER (WHERE seconds_played < 0) AS negative_seconds
FROM plays;
\`\`\`

En \`plays\` hay 120 filas con segundos negativos. Son pocas, pero envenenan cualquier suma de tiempo escuchado.

## Reglas cruzadas: dos tablas que tienen que coincidir

El siguiente nivel compara una fila con la tabla que la define. Nadie puede escuchar una canción más tiempo del que dura:

\`\`\`sql
SELECT count(*) AS over_duration
FROM plays p
JOIN tracks t ON t.id = p.track_id
WHERE p.seconds_played > t.duration_seconds;
\`\`\`

Son 210 filas, y varias con proporciones absurdas: hasta 42 veces la duración de la canción. Estos son los **valores atípicos** que importan en calidad: no el dato alto y raro, sino el dato que ninguna interpretación del negocio puede justificar. El criterio para separarlos no es estadístico, es de dominio: existe una cota superior conocida (la duración) y hay filas que la superan.

## Huecos referenciales

Una clave foránea garantiza que un \`order_id\` exista; **no** garantiza que la relación que el negocio espera esté completa. El hueco típico es el inverso: el padre sin hijos. Un pedido sin ítems, un cliente sin dirección, un envío sin pedido.

\`\`\`sql
SELECT o.id, o.status, o.total
FROM orders o
WHERE NOT EXISTS (
  SELECT 1 FROM order_items i WHERE i.order_id = o.id
);
\`\`\`

Esa consulta —el **antijoin**— tiene dos formas equivalentes y una trampa:

- \`NOT EXISTS (...)\`: la más segura y legible.
- \`LEFT JOIN ... WHERE i.order_id IS NULL\`: igual de válida; la condición nula va en el \`WHERE\`, nunca en el \`ON\`, porque en el \`ON\` no filtra nada.
- \`NOT IN (SELECT order_id FROM order_items)\`: **la trampa**. Si la subconsulta devuelve aunque sea un \`NULL\`, el resultado es vacío siempre. Evítala en auditorías.

En \`pidelo\` ese antijoin devuelve 178 pedidos sin ítems, y 171 de ellos tienen importe mayor que cero: hay dinero registrado sin nada que lo explique.

## El reporte de chequeos

Un hallazgo suelto se pierde; un tablero de chequeos se revisa. El patrón es una fila por regla, con el conteo que falla y el total contra el que se compara:

\`\`\`sql
WITH total AS (SELECT count(*) AS rows_checked FROM plays),
fails AS (
  SELECT 'segundos_negativos' AS check_name, count(*) AS failing_rows
  FROM plays WHERE seconds_played < 0
  UNION ALL
  SELECT 'device_nulo', count(*) FROM plays WHERE device IS NULL
)
SELECT f.check_name, f.failing_rows, t.rows_checked
FROM fails f CROSS JOIN total t
ORDER BY f.failing_rows DESC;
\`\`\`

Tres detalles que lo vuelven profesional:

1. **\`UNION ALL\`, no \`UNION\`**: dos chequeos distintos pueden fallar la misma cantidad de filas y \`UNION\` te borraría uno.
2. **Los chequeos que pasan también se muestran**, con cero. Una regla que no aparece en la lista es una regla que nadie verificó.
3. **El total va al lado**: 340 filas son un desastre en una tabla de mil y ruido en una de un millón.

## Lo que un auditor no hace

No borra ni corrige las filas malas por su cuenta. Documenta la regla, cuantifica el impacto sobre la métrica afectada, propone el arreglo en el origen y, mientras tanto, deja el filtro explícito en la consulta con un comentario. La tabla es de alguien más; el diagnóstico es tuyo.

## Resumen

- Dominio (un campo), reglas cruzadas (dos tablas) y huecos referenciales (el padre sin hijos) son tres familias de chequeos distintas.
- El antijoin se escribe con \`NOT EXISTS\` o \`LEFT JOIN ... IS NULL\`; \`NOT IN\` con nulos devuelve vacío en silencio.
- Reporta una fila por regla con \`UNION ALL\`, incluye las que pasan y muestra siempre el total de referencia.
`,
  },
];
