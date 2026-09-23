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

Media analítica de negocio termina en la misma pregunta: **quién va primero**. El artista más escuchado del mes, las tres canciones que sostienen una lista, el puesto de cada vendedor en su región. \`ORDER BY\` ordena, pero no te da un **número de puesto** que puedas mostrar, filtrar o comparar. Para eso están las funciones de ranking.

Trabajas con **Ritmo**, un servicio de streaming musical: \`artists\`, \`albums\`, \`tracks\`, \`plays\`, \`users\`, \`playlists\`, \`subscriptions\`, \`follows\`.

## Las tres funciones

Las tres son funciones de ventana: no reciben argumentos y **exigen** \`OVER (ORDER BY ...)\`.

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

Se diferencian solo ante **empates**:

| monthly_listeners | row_number | rank | dense_rank |
| ----------------- | ---------- | ---- | ---------- |
| 3113              | 11         | 11   | 11         |
| 2938              | 12         | 12   | 12         |
| 2938              | 13         | 12   | 12         |
| 2288              | 14         | 14   | 13         |

- \`row_number\`: numeración correlativa 1, 2, 3… **siempre distinta**, aunque los valores empaten.
- \`rank\`: mismo puesto para los empatados y **salta** los siguientes (12, 12, 14).
- \`dense_rank\`: mismo puesto para los empatados y **no salta** (12, 12, 13).

Elige según lo que pida el negocio: «un puesto por fila» → \`row_number\`; «puesto deportivo» → \`rank\`; «niveles de valor distintos» → \`dense_rank\`.

## Empates y determinismo

\`row_number\` decide el orden entre empatados de forma **arbitraria**: la misma consulta puede devolver otro orden en otra ejecución. Si el puesto se muestra o se compara, agrega un criterio de desempate estable:

\`\`\`sql
row_number() OVER (ORDER BY monthly_listeners DESC, name) AS posicion
\`\`\`

Un buen desempate es único (un \`id\`) o al menos explicable para el negocio (la fecha de alta, el nombre).

## Dos ORDER BY distintos

El \`ORDER BY\` de la ventana define **cómo se numera**; el \`ORDER BY\` final define **cómo se muestra**. Pueden ser distintos:

\`\`\`sql
SELECT
  name,
  country,
  row_number() OVER (ORDER BY monthly_listeners DESC, name) AS posicion
FROM artists
WHERE genre = 'cumbia'
ORDER BY country, posicion;
\`\`\`

Sin el \`ORDER BY\` final, el orden de las filas no está garantizado, aunque los puestos sí sean correctos.

## Errores comunes

- Escribir \`row_number()\` sin \`OVER\`: PostgreSQL responde \`window function row_number requires an OVER clause\`.
- Usar \`ORDER BY monthly_listeners\` ascendente cuando el negocio pide «los más escuchados»: el puesto 1 queda para el peor.
- Filtrar por el puesto en el \`WHERE\` de la misma consulta: no se puede, y lo resolvemos en la lección siguiente.

## Resumen

1. \`row_number\`, \`rank\` y \`dense_rank\` numeran filas según el \`ORDER BY\` de la ventana.
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

«Las tres canciones más escuchadas **de cada género**» no se resuelve con \`LIMIT\`: \`LIMIT 3\` corta el resultado completo, no cada grupo. La respuesta canónica es **numerar dentro de cada grupo y quedarte con los primeros**.

## PARTITION BY reinicia la numeración

\`\`\`sql
row_number() OVER (PARTITION BY genre ORDER BY reproducciones DESC) AS puesto
\`\`\`

\`PARTITION BY\` divide las filas en grupos y la numeración **vuelve a 1** en cada uno. Es el mismo \`PARTITION BY\` que ya usaste con \`avg\` o \`sum\`.

## Por qué hace falta una CTE

Las ventanas se calculan **después** de \`WHERE\` y \`HAVING\`, así que esto no compila:

\`\`\`sql
-- Error: window functions are not allowed in WHERE
SELECT title, row_number() OVER (PARTITION BY genre ORDER BY n DESC) AS puesto
FROM catalogo
WHERE row_number() OVER (PARTITION BY genre ORDER BY n DESC) <= 3;
\`\`\`

El patrón correcto tiene dos pasos: una CTE (o subconsulta) calcula el puesto y la consulta externa filtra.

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

Tres pasos, cada uno legible: agregar → numerar → filtrar. Una subconsulta en el \`FROM\` produce exactamente lo mismo; la CTE solo se lee mejor.

## ¿Y si hay empates?

Con \`row_number\` siempre obtienes **exactamente N filas** por grupo: si dos canciones empatan en el puesto 3, una queda afuera de forma arbitraria. Si el negocio quiere ver a todos los empatados, cambia a \`rank\` o \`dense_rank\`:

- \`rank() ... <= 3\`: los tres primeros puestos, incluidos los empatados; un grupo puede devolver más de tres filas.
- \`dense_rank() ... <= 3\`: los tres **niveles** de valor más altos, con todos sus empatados.

Definir esto es parte de entender el pedido: «top 3» rara vez es una instrucción completa.

## Un caso especial: quedarte con la primera fila

El mismo patrón con \`puesto = 1\` resuelve una tarea muy frecuente: **una fila por grupo**, la más reciente o la más antigua.

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

Así obtienes la primera reproducción de cada oyente. Es la forma más clara de elegir **cuál** fila conservar cuando hay varias por entidad.

## Errores comunes

- \`LIMIT 3\` en lugar de numerar por grupo: devuelve tres filas en total.
- Olvidar \`PARTITION BY\`: un único ranking global, no uno por grupo.
- Numerar antes de agregar: si el conteo se calcula después, el puesto ordena por la columna equivocada.

## Resumen

1. Top-N por grupo = \`PARTITION BY\` + ranking + filtro en una capa externa.
2. \`row_number\` da N filas exactas; \`rank\` y \`dense_rank\` respetan empates.
3. \`puesto = 1\` es el patrón estándar para quedarte con una fila por grupo.
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

Cuando el negocio no pregunta «quién es el primero» sino «**cómo se reparte la base**», el puesto exacto sobra: lo que quieres son segmentos comparables. \`ntile(n)\` reparte las filas ordenadas en \`n\` bloques de tamaño casi igual y devuelve el número de bloque.

\`\`\`sql
ntile(4) OVER (ORDER BY reproducciones DESC) AS cuartil
\`\`\`

Con \`DESC\`, el cuartil 1 es el de mayor consumo. Con \`ASC\` sería al revés: el sentido lo eliges tú y conviene dejarlo escrito en el nombre de la columna o en la documentación del reporte.

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

Con 454 oyentes, los bloques quedan de 114, 114, 113 y 113: cuando la división no es exacta, **los primeros bloques reciben una fila más**. Cambiar \`4\` por \`10\` te da deciles, y por \`100\`, percentiles.

## La trampa de los empates

\`ntile\` reparte por **cantidad de filas**, no por valor. Dos oyentes con 9 reproducciones pueden terminar en cuartiles distintos si el corte cae justo entre ellos. Es esperable, pero si alguien pregunta «¿por qué este oyente está en el cuartil 3 y ese otro, idéntico, en el 2?», la respuesta no es cómoda.

Cuando el corte debe depender del valor y no de la posición, tienes alternativas:

- \`percent_rank()\` y \`cume_dist()\`: posición relativa entre 0 y 1, donde los empates comparten valor.
- Umbrales de negocio explícitos con \`CASE\` (por ejemplo, «más de 50 reproducciones = intensivo»).
- \`dense_rank()\` cuando lo que importa son niveles de valor distintos.

Agregar un desempate estable (\`, user_id\`) no elimina el problema, pero hace que el resultado sea **reproducible**, que es imprescindible para un reporte.

## Menos filas que bloques

Si la consulta devuelve 3 filas y pides \`ntile(4)\`, obtienes bloques 1, 2 y 3 con una fila cada uno: el bloque 4 simplemente no aparece. No es un error, pero conviene revisarlo antes de publicar un reporte que promete cuatro segmentos.

## Errores comunes

- Usar \`ntile\` sobre el detalle cuando el negocio segmenta entidades: primero agrega por oyente, luego segmenta.
- Olvidar \`DESC\` y presentar el cuartil 1 como «el mejor» cuando es el peor.
- Suponer que todos los bloques tienen exactamente el mismo tamaño.

## Resumen

1. \`ntile(n)\` reparte las filas ordenadas en \`n\` bloques casi iguales.
2. Los bloques se llenan por posición, no por valor: los empates pueden separarse.
3. Agrega siempre a la entidad correcta antes de segmentar, y fija un desempate estable.
`,
  },
];
