import type { LessonDef } from "../schemas/curriculum";

const section = "funciones-de-ranking";

export const lessons: LessonDef[] = [
  {
    slug: "ranking-row-number-rank-dense-rank",
    section,
    kind: "theory",
    title: "ROW_NUMBER, RANK y DENSE_RANK",
    sort_order: 0,
    estimated_minutes: 11,
    is_free: false,
    is_published: true,
    prerequisites: ["ventana-over-partition"],
    dataset: "ritmo",
    body_md: `## Por qué importa

Buena parte de las preguntas de negocio termina siendo la misma pregunta: **quién va primero**. El artista más escuchado del mes, las tres canciones que sostienen una lista de reproducción, el puesto de cada vendedor dentro de su región.

\`ORDER BY\` ordena las filas, pero no te entrega un **número de puesto** que puedas mostrar en el reporte, filtrar («quiero del primero al tercero») o comparar contra el puesto del mes pasado. Para obtener ese número están las funciones de ranking.

Trabajas con **Ritmo**, un servicio de streaming musical. Sus tablas son \`artists\`, \`albums\`, \`tracks\`, \`plays\`, \`users\`, \`playlists\`, \`subscriptions\` y \`follows\`.

## Las tres funciones

Las tres son **funciones de ventana**, es decir, funciones que calculan un valor para cada fila mirando además un conjunto de filas relacionadas. No reciben argumentos entre paréntesis y **exigen** una cláusula \`OVER (ORDER BY ...)\`, que es la que define en qué orden se numeran las filas.

\`\`\`sql
SELECT
  name,
  monthly_listeners,
  row_number() OVER (ORDER BY monthly_listeners DESC) AS fila,
  rank()       OVER (ORDER BY monthly_listeners DESC) AS puesto,
  dense_rank() OVER (ORDER BY monthly_listeners DESC) AS puesto_denso
FROM artists
WHERE genre = 'reguetón';
\`\`\`

Las tres se diferencian únicamente ante los **empates**, o sea, cuando dos filas tienen el mismo valor en la columna que ordena:

| monthly_listeners | row_number | rank | dense_rank |
| ----------------- | ---------- | ---- | ---------- |
| 3113              | 11         | 11   | 11         |
| 2938              | 12         | 12   | 12         |
| 2938              | 13         | 12   | 12         |
| 2288              | 14         | 14   | 13         |

- \`row_number\` numera de forma correlativa (1, 2, 3…) y **nunca repite un número**, aunque los valores empaten.
- \`rank\` da el mismo puesto a los empatados y después **salta** tantos números como empates hubo, igual que en una competencia deportiva: 12, 12 y luego 14.
- \`dense_rank\` da el mismo puesto a los empatados y **no salta** ningún número: 12, 12 y luego 13.

Elige según lo que pida el negocio. Si necesitas un puesto distinto por fila, usa \`row_number\`. Si necesitas el puesto deportivo clásico, usa \`rank\`. Si lo que cuentas son niveles de valor distintos, por ejemplo «los tres niveles de consumo más altos», usa \`dense_rank\`.

## Empates y determinismo

Cuando dos filas empatan, \`row_number\` decide cuál va antes de forma **arbitraria**, y la misma consulta puede devolver el orden contrario en otra ejecución. Si ese puesto se muestra en un reporte o se compara con el del período anterior, tu reporte cambia sin que hayan cambiado los datos. Agrega un criterio de desempate estable:

\`\`\`sql
row_number() OVER (ORDER BY monthly_listeners DESC, name) AS posicion
\`\`\`

Un buen desempate es una columna única, como un \`id\`, o al menos una que puedas explicarle al negocio, como la fecha de alta o el nombre.

## Dos ORDER BY distintos

En este tipo de consultas hay dos \`ORDER BY\` y cada uno hace una cosa diferente. El que está dentro del \`OVER\` define **cómo se numera**. El que está al final de la consulta define **cómo se muestran las filas**. Pueden ser distintos:

\`\`\`sql
SELECT
  name,
  country,
  row_number() OVER (ORDER BY monthly_listeners DESC, name) AS posicion
FROM artists
WHERE genre = 'cumbia'
ORDER BY country, posicion;
\`\`\`

Sin el \`ORDER BY\` final, los puestos serían correctos igual, pero el orden en que aparecen las filas del resultado no está garantizado.

## Errores comunes

- Escribir \`row_number()\` sin \`OVER\`. PostgreSQL responde \`window function row_number requires an OVER clause\`.
- Ordenar la ventana de forma ascendente cuando el negocio pide «los más escuchados». El puesto 1 queda para el artista con menos oyentes y el ranking sale al revés.
- Filtrar por el puesto en el \`WHERE\` de la misma consulta. No se puede, porque el \`WHERE\` se evalúa antes de calcular la ventana; lo resolvemos en la lección siguiente.

## Resumen

1. \`row_number\`, \`rank\` y \`dense_rank\` numeran las filas según el \`ORDER BY\` de la ventana.
2. Se diferencian solo ante empates: correlativo, con saltos y sin saltos.
3. Agrega un desempate estable cuando el puesto se muestra o se compara.
`,
  },
  {
    slug: "ranking-top-n-por-grupo",
    section,
    kind: "theory",
    title: "Top-N por grupo",
    sort_order: 1,
    estimated_minutes: 12,
    is_free: false,
    is_published: true,
    prerequisites: ["ranking-row-number-rank-dense-rank", "cte-with-pasos"],
    dataset: "ritmo",
    body_md: `## El problema

«Las tres canciones más escuchadas **de cada género**» no se resuelve con \`LIMIT\`. \`LIMIT 3\` corta el resultado completo y te devuelve tres filas en total, que van a ser las tres canciones más escuchadas del género más popular. La respuesta correcta consiste en numerar las canciones dentro de cada género y quedarte con las primeras de cada uno.

## PARTITION BY reinicia la numeración

\`\`\`sql
row_number() OVER (PARTITION BY genre ORDER BY reproducciones DESC) AS puesto
\`\`\`

\`PARTITION BY\` divide las filas en grupos según el valor de una columna, y la numeración **vuelve a empezar en 1** en cada grupo. Es el mismo \`PARTITION BY\` que ya usaste con \`avg\` o \`sum\`, solo que ahora en lugar de un promedio por grupo obtienes un puesto por grupo.

## Por qué hace falta una CTE

Las funciones de ventana se calculan **después** de \`WHERE\` y de \`HAVING\`, así que cuando el \`WHERE\` se evalúa, el puesto todavía no existe. Esta consulta no compila:

\`\`\`sql
-- Error: window functions are not allowed in WHERE
SELECT title, row_number() OVER (PARTITION BY genre ORDER BY n DESC) AS puesto
FROM catalogo
WHERE row_number() OVER (PARTITION BY genre ORDER BY n DESC) <= 3;
\`\`\`

El patrón correcto tiene dos pasos: una CTE (por *common table expression*, su nombre en inglés; es la consulta con nombre que escribes en el \`WITH\`) calcula el puesto, y la consulta externa filtra por ese puesto ya calculado.

\`\`\`sql
WITH reproducciones_por_cancion AS (
  SELECT ar.genre, t.id AS track_id, t.title, count(*) AS reproducciones
  FROM plays AS p
  INNER JOIN tracks AS t ON t.id = p.track_id
  INNER JOIN albums AS al ON al.id = t.album_id
  INNER JOIN artists AS ar ON ar.id = al.artist_id
  GROUP BY ar.genre, t.id, t.title
),
ranking AS (
  SELECT
    genre,
    title,
    reproducciones,
    row_number() OVER (PARTITION BY genre ORDER BY reproducciones DESC, track_id) AS puesto
  FROM reproducciones_por_cancion
)
SELECT genre, puesto, title, reproducciones
FROM ranking
WHERE puesto <= 3
ORDER BY genre, puesto;
\`\`\`

Son tres pasos y cada uno se lee por separado: contar las reproducciones de cada canción, numerar dentro de cada género y quedarse con los tres primeros. Una subconsulta escrita en el \`FROM\` produce exactamente el mismo resultado; la CTE solo se lee mejor y te deja probar cada paso por su cuenta.

## ¿Y si hay empates?

Con \`row_number\` siempre obtienes **exactamente N filas** por grupo. Si dos canciones tienen la misma cantidad de reproducciones en el puesto 3, una de las dos queda afuera y cuál de ellas es una decisión arbitraria del motor. Si el negocio quiere ver a todos los empatados, cambia la función:

- \`rank() ... <= 3\` devuelve los tres primeros puestos con todos sus empatados, así que un grupo puede traer más de tres filas.
- \`dense_rank() ... <= 3\` devuelve los tres **niveles** de valor más altos, también con todos sus empatados.

Definir esto es parte de entender el pedido: «top 3» casi nunca es una instrucción completa, y conviene preguntar antes de escribir la consulta.

## Un caso especial: quedarte con la primera fila

El mismo patrón, filtrando por \`puesto = 1\`, resuelve una tarea muy frecuente: dejar **una sola fila por entidad**, la más reciente o la más antigua.

\`\`\`sql
WITH primeras AS (
  SELECT
    user_id,
    played_at,
    track_id,
    row_number() OVER (PARTITION BY user_id ORDER BY played_at, id) AS puesto
  FROM plays
)
SELECT user_id, played_at, track_id
FROM primeras
WHERE puesto = 1;
\`\`\`

Así obtienes la primera reproducción de cada oyente, que es el dato con el que se arma, por ejemplo, la fecha de activación de cada persona. Es la forma más clara de elegir **cuál** fila conservar cuando hay varias por entidad.

## Errores comunes

- Usar \`LIMIT 3\` en lugar de numerar por grupo: devuelve tres filas en total, no tres por grupo.
- Olvidar el \`PARTITION BY\`: obtienes un único ranking global y no uno por grupo.
- Numerar antes de agregar: si el conteo se calcula después, el puesto queda ordenado por la columna equivocada.

## Resumen

1. Top-N por grupo se arma con \`PARTITION BY\`, una función de ranking y un filtro en una capa externa.
2. \`row_number\` da exactamente N filas por grupo; \`rank\` y \`dense_rank\` conservan a los empatados.
3. \`puesto = 1\` es el patrón estándar para quedarte con una sola fila por entidad.
`,
  },
  {
    slug: "ranking-ntile-y-segmentos",
    section,
    kind: "theory",
    title: "NTILE: cuartiles, deciles y segmentos",
    sort_order: 2,
    estimated_minutes: 9,
    is_free: false,
    is_published: true,
    prerequisites: ["ranking-row-number-rank-dense-rank"],
    dataset: "ritmo",
    body_md: `## Para qué sirve

A veces el negocio no pregunta quién es el primero, sino **cómo se reparte la base de usuarios**: cuánto consume el grupo más activo comparado con el resto. Para esa pregunta el puesto exacto de cada persona no aporta nada; lo que necesitas son segmentos comparables entre sí.

\`ntile(n)\` ordena las filas y las reparte en \`n\` bloques de tamaño casi igual, y devuelve para cada fila el número de bloque al que le tocó. Con \`n = 4\` esos bloques se llaman **cuartiles**, con \`n = 10\` **deciles** y con \`n = 100\` **percentiles**.

\`\`\`sql
ntile(4) OVER (ORDER BY reproducciones DESC) AS cuartil
\`\`\`

Con \`DESC\`, el cuartil 1 contiene a los oyentes de mayor consumo. Con \`ASC\` sería exactamente al revés. El sentido lo eliges tú, y conviene dejarlo escrito en el nombre de la columna o en la documentación del reporte, porque quien lo lea no puede deducirlo del número.

## Ejemplo: cuartiles de consumo

\`\`\`sql
WITH escuchas AS (
  SELECT p.user_id, count(*) AS reproducciones
  FROM plays AS p
  INNER JOIN users AS u ON u.id = p.user_id
  WHERE u.country = 'CL'
  GROUP BY p.user_id
),
segmentos AS (
  SELECT
    user_id,
    reproducciones,
    ntile(4) OVER (ORDER BY reproducciones DESC, user_id) AS cuartil
  FROM escuchas
)
SELECT
  cuartil,
  count(*) AS oyentes,
  min(reproducciones) AS minimo,
  max(reproducciones) AS maximo
FROM segmentos
GROUP BY cuartil
ORDER BY cuartil;
\`\`\`

Con 454 oyentes, los bloques quedan de 114, 114, 113 y 113 personas: cuando la división no da exacta, **los primeros bloques reciben una fila más** que los últimos.

## La trampa de los empates

\`ntile\` reparte las filas por **cantidad**, no por valor. Dos oyentes con exactamente 9 reproducciones pueden terminar en cuartiles distintos si el corte del bloque cae justo entre ellos. Es el comportamiento esperado de la función, pero produce una situación incómoda: alguien mira el reporte, encuentra dos personas idénticas en segmentos distintos y deja de confiar en el resto de la tabla.

Cuando el corte tiene que depender del valor y no de la posición, hay alternativas:

- \`percent_rank()\` y \`cume_dist()\` devuelven la posición relativa de cada fila como un número entre 0 y 1, y las filas empatadas comparten ese número.
- Umbrales de negocio explícitos con \`CASE\`, por ejemplo «más de 50 reproducciones es consumo intensivo».
- \`dense_rank()\` cuando lo que importa son los niveles de valor distintos.

Agregar un desempate estable (\`, user_id\`) no resuelve el problema de fondo, pero hace que el resultado sea **reproducible**, es decir, que la misma consulta reparta a las mismas personas en los mismos bloques cada vez que se ejecuta. Eso es imprescindible en un reporte que alguien va a comparar mes a mes.

## Menos filas que bloques

Si la consulta devuelve 3 filas y pides \`ntile(4)\`, obtienes los bloques 1, 2 y 3 con una fila cada uno, y el bloque 4 no aparece. No es un error, pero conviene revisarlo antes de publicar un reporte que promete cuatro segmentos y muestra tres.

## Errores comunes

- Aplicar \`ntile\` sobre el detalle cuando el negocio quiere segmentar entidades. Si segmentas la tabla \`plays\` estás repartiendo reproducciones; primero agrega por oyente y después segmenta.
- Olvidar el \`DESC\` y presentar el cuartil 1 como «el mejor» cuando en realidad es el de menor consumo.
- Suponer que todos los bloques tienen exactamente la misma cantidad de filas.

## Resumen

1. \`ntile(n)\` reparte las filas ordenadas en \`n\` bloques de tamaño casi igual.
2. Los bloques se llenan por posición y no por valor, así que dos filas empatadas pueden quedar separadas.
3. Agrega a la entidad correcta antes de segmentar y fija siempre un desempate estable.

## Próximos pasos

**Lo que ya puedes hacer:** Sabes diferenciar ROW_NUMBER, RANK y DENSE_RANK cuando hay empates, obtener los primeros N de cada grupo y armar cuartiles con NTILE.

**Antes de seguir:** resuelve los ejercicios y el quiz de esta sección.

**Lo que sigue:** Sección 27 · Totales acumulados y promedios móviles. Vas a usar marcos de ventana para sumar y promediar a lo largo del tiempo.

**Para practicar (opcional):** ¿Cuáles son los tres platos más caros de cada restaurante de Pídelo? Numera \`menu_items\` con ROW_NUMBER por \`restaurant_id\`, de mayor a menor \`price\`.
`,
  },
];
