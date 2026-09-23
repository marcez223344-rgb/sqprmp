import type { LessonDef } from "../schemas/curriculum";

const section = "totales-acumulados-promedios-moviles";

export const lessons: LessonDef[] = [
  {
    slug: "acumulados-por-periodo",
    section,
    kind: "theory",
    title: "Totales acumulados por período",
    sort_order: 0,
    estimated_minutes: 11,
    is_free: false,
    is_published: true,
    prerequisites: ["ventana-order-by-y-marcos"],
    dataset: "ritmo",
    body_md: `## Por qué importa

Casi todo tablero de negocio tiene una curva que sube: oyentes registrados hasta la fecha, ingresos del año, suscripciones netas. Esa curva es un **total acumulado**: en cada período, la suma de todo lo ocurrido hasta ese período inclusive. En SQL se resuelve con una función de ventana, sin unir la tabla consigo misma ni exportar nada a una planilla.

Trabajas con **Ritmo**, un servicio de streaming musical en seis mercados: \`users\` (oyentes), \`plays\` (reproducciones), \`tracks\`, \`albums\`, \`artists\` y \`subscriptions\`.

## El patrón de dos pasos

Un acumulado casi nunca se calcula sobre filas crudas: primero agregas por período, después acumulas. Separar ambos pasos con una CTE hace la consulta legible y evita el error clásico de mezclar niveles de agregación.

\`\`\`sql
WITH altas_por_mes AS (
  SELECT
    date_trunc('month', signup_at AT TIME ZONE 'UTC')::date AS mes,
    count(*) AS altas
  FROM users
  GROUP BY 1
)
SELECT
  mes,
  altas,
  sum(altas) OVER (ORDER BY mes) AS altas_acumuladas
FROM altas_por_mes
ORDER BY mes;
\`\`\`

La CTE produce una fila por mes. Luego \`sum(altas) OVER (ORDER BY mes)\` suma las filas **desde la primera hasta la actual** en ese orden. La última fila del resultado vale 5000: todos los oyentes registrados.

\`AT TIME ZONE 'UTC'\` fija el huso con el que se corta el calendario. Sin él, el mes de cada alta queda a merced de la zona de la sesión (UTC en el sandbox, para que tus resultados sean reproducibles; en un servidor real, la que haya configurado quien lo instaló). El total acumulado final no cambia, pero sí cambia en qué escalón sube: un acumulado que alguien más reproduce con otra configuración no coincide con el tuyo. Escríbelo explícito y di en el informe en qué huso están cortados los meses.

## El ORDER BY de la ventana no es el de la consulta

Son dos cosas distintas y conviene tenerlo muy claro:

- El \`ORDER BY\` **dentro de \`OVER\`** define en qué orden se acumula. Cambia los **valores**.
- El \`ORDER BY\` **final** define cómo se muestra el resultado. Cambia solo la **presentación**.

Puedes acumular por fecha y mostrar de mayor a menor; los acumulados no se alteran. Lo que no puedes es omitir el \`ORDER BY\` dentro de \`OVER\`: sin él la ventana no tiene noción de «hasta aquí» y \`sum\` devuelve el total completo repetido en cada fila.

## Acumular por grupo

Agrega \`PARTITION BY\` y el acumulado se **reinicia** en cada grupo:

\`\`\`sql
WITH mensual AS (
  SELECT
    u.country,
    date_trunc('month', p.played_at AT TIME ZONE 'UTC')::date AS mes,
    count(*) AS reproducciones
  FROM plays AS p
  INNER JOIN users AS u ON u.id = p.user_id
  GROUP BY 1, 2
)
SELECT
  country,
  mes,
  reproducciones,
  sum(reproducciones) OVER (PARTITION BY country ORDER BY mes) AS acumulado
FROM mensual
ORDER BY country, mes;
\`\`\`

Cada país arranca su propia curva desde cero. Es exactamente lo que necesitas para comparar mercados que empezaron en momentos distintos.

## Participación acumulada (curva de Pareto)

Combinando dos ventanas obtienes el porcentaje acumulado, la herramienta estándar para responder «¿cuántos artistas explican la mitad de las reproducciones?»:

\`\`\`sql
SELECT
  artista,
  reproducciones,
  round(
    100.0 * sum(reproducciones) OVER (ORDER BY reproducciones DESC, artista)
    / sum(reproducciones) OVER (),
    2
  ) AS pct_acumulado
FROM por_artista
ORDER BY reproducciones DESC, artista;
\`\`\`

El numerador acumula en orden descendente; el denominador, \`sum(...) OVER ()\` sin \`ORDER BY\`, es el gran total. Incluye un segundo criterio de desempate (\`artista\`) para que el resultado sea reproducible cuando dos artistas empatan.

## Errores comunes

- Olvidar el \`ORDER BY\` dentro de \`OVER\`: obtienes el total, no el acumulado.
- Acumular sobre filas crudas en vez de sobre el agregado por período.
- Usar \`PARTITION BY mes\`: eso agrupa por mes y el acumulado nunca avanza. El período va en el \`ORDER BY\`; el grupo, en el \`PARTITION BY\`.
- Empates sin criterio de desempate: dos filas con la misma clave de orden comparten valor acumulado (lo verás en detalle en la próxima lección).

## Resumen

1. Acumulado = \`sum(metrica) OVER (ORDER BY periodo)\`, casi siempre sobre una CTE ya agregada.
2. \`PARTITION BY\` reinicia la curva por grupo; el \`ORDER BY\` de la ventana define el avance.
3. \`sum(x) OVER ()\` es el gran total y sirve de denominador para la participación acumulada.
`,
  },
  {
    slug: "marcos-rows-range",
    section,
    kind: "theory",
    title: "El marco de ventana: ROWS, RANGE y GROUPS",
    sort_order: 1,
    estimated_minutes: 13,
    is_free: false,
    is_published: true,
    prerequisites: ["acumulados-por-periodo"],
    dataset: "ritmo",
    body_md: `## Por qué importa

Cuando escribes \`sum(x) OVER (ORDER BY mes)\` obtienes un acumulado sin haber pedido ningún marco. No es magia: Postgres aplicó un marco por omisión. Esta es la parte de las funciones de ventana que más resultados silenciosamente incorrectos produce, porque la consulta no falla: devuelve números plausibles pero equivocados.

## Las tres partes de OVER

\`\`\`text
OVER (
  PARTITION BY ...                    -- qué filas forman el grupo
  ORDER BY ...                        -- en qué orden se recorren
  <modo> BETWEEN <inicio> AND <fin>   -- el marco: qué subconjunto ve cada fila
)
\`\`\`

El marco se define **dentro** de cada partición y se recalcula para cada fila. Los límites posibles son \`UNBOUNDED PRECEDING\`, \`N PRECEDING\`, \`CURRENT ROW\`, \`N FOLLOWING\` y \`UNBOUNDED FOLLOWING\`, y el inicio nunca puede ser posterior al fin.

## Los valores por omisión

- **Sin \`ORDER BY\`**: el marco es toda la partición. Por eso \`avg(x) OVER (PARTITION BY country)\` da el promedio del país, igual en cada fila.
- **Con \`ORDER BY\` y sin marco explícito**: el marco es \`RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW\`. De ahí sale el acumulado.

Escribir ese marco a mano es válido y a veces aclara la intención:

\`\`\`sql
sum(altas) OVER (ORDER BY mes ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)
\`\`\`

## ROWS cuenta filas; RANGE compara valores

La diferencia aparece con **empates** en la clave de orden.

- \`ROWS\` cuenta posiciones físicas: \`ROWS BETWEEN 2 PRECEDING AND CURRENT ROW\` son siempre tres filas (menos al principio, donde el marco se recorta).
- \`RANGE\` trabaja sobre **valores** del \`ORDER BY\`: \`CURRENT ROW\` significa «todas las filas cuyo valor de orden es igual al mío». Las filas empatadas comparten marco y, por lo tanto, el mismo resultado.

Si tres oyentes se registraron el mismo día y acumulas con \`ORDER BY fecha\`, el marco \`RANGE\` por omisión les da a los tres el acumulado del día completo. Con \`ROWS\` verías 1, 2, 3. Ninguno está mal: son preguntas distintas. Lo que está mal es no saber cuál pediste.

**Regla práctica**: si tu clave de orden es única (un mes por fila, un día por fila), \`ROWS\` y \`RANGE\` coinciden y conviene \`ROWS\` por ser más barato y más explícito. Si hay empates, elige a conciencia.

## RANGE con desplazamiento: el marco por calendario

\`RANGE\` admite además un **desplazamiento tipado** cuando hay un solo \`ORDER BY\` de tipo numérico, fecha o timestamp:

\`\`\`sql
sum(reproducciones) OVER (
  ORDER BY dia
  RANGE BETWEEN INTERVAL '6 days' PRECEDING AND CURRENT ROW
) AS ultimos_7_dias
\`\`\`

Esto significa «todas las filas cuyo \`dia\` esté entre hoy − 6 días y hoy», **existan o no** las filas intermedias. Es la única forma correcta de una ventana de 7 días calendario cuando la serie tiene huecos: por ejemplo, un artista poco escuchado que solo tiene filas los días que sonó.

Compáralo con \`ROWS BETWEEN 6 PRECEDING AND CURRENT ROW\` sobre esa misma serie: toma las 7 filas anteriores, que pueden abarcar mes y medio. Mismo número de filas, ventana temporal completamente distinta.

## GROUPS

\`GROUPS BETWEEN 1 PRECEDING AND CURRENT ROW\` cuenta **grupos de empate** en lugar de filas o valores: el grupo actual más el anterior. Se usa poco, pero es la respuesta cuando piensas en «los dos días distintos más recientes» y hay varias filas por día.

## Errores comunes

- Creer que \`ORDER BY\` sin marco promedia toda la partición: no, acumula.
- Usar \`ROWS BETWEEN N PRECEDING\` en una serie con días faltantes y llamarlo «últimos N días».
- Usar \`ROWS\` con empates en la clave de orden sin desempatar: el resultado depende de un orden arbitrario y puede cambiar entre ejecuciones.
- Definir un marco con desplazamiento en una ventana sin \`ORDER BY\`: es un error de sintaxis.

## Resumen

1. El marco por omisión con \`ORDER BY\` es \`RANGE UNBOUNDED PRECEDING … CURRENT ROW\`; sin \`ORDER BY\`, toda la partición.
2. \`ROWS\` cuenta filas, \`RANGE\` compara valores (y admite desplazamientos de intervalo), \`GROUPS\` cuenta grupos de empate.
3. Con clave de orden única elige \`ROWS\`; con huecos de calendario y ventanas temporales, \`RANGE\` con \`INTERVAL\`.
`,
  },
  {
    slug: "promedios-moviles",
    section,
    kind: "theory",
    title: "Promedios móviles",
    sort_order: 2,
    estimated_minutes: 11,
    is_free: false,
    is_published: true,
    prerequisites: ["marcos-rows-range"],
    dataset: "ritmo",
    body_md: `## Por qué importa

Una serie diaria de negocio es ruidosa: los fines de semana suben, los feriados caen, un día cualquiera se dispara. El **promedio móvil** suaviza ese ruido y deja ver la tendencia. Es la métrica que aparece en todos los tableros de producto y la forma más común de usar un marco de ventana explícito.

## Media móvil de 7 días

«Siete días incluido el actual» son **seis filas anteriores más la actual**:

\`\`\`sql
WITH diario AS (
  SELECT
    (played_at AT TIME ZONE 'UTC')::date AS dia,
    count(*) AS reproducciones
  FROM plays
  GROUP BY 1
)
SELECT
  dia,
  reproducciones,
  round(avg(reproducciones) OVER (
    ORDER BY dia
    ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
  ), 2) AS media_7d
FROM diario
ORDER BY dia;
\`\`\`

El error más frecuente aquí es escribir \`7 PRECEDING\`: eso da una ventana de ocho días.

## El borde inicial

Las primeras seis filas de la serie no tienen seis días previos, así que el marco se **recorta** y promedian menos valores. No es un error de Postgres: es lo que pediste. Tienes dos opciones honestas:

1. Dejarlas así y advertirlo en el tablero.
2. Calcular la ventana sobre una serie que empiece **antes** del período que quieres mostrar y filtrar después.

La segunda es la profesional, y obliga a entender el orden de evaluación: \`WHERE\` se ejecuta **antes** que las ventanas, así que un filtro de fechas en el \`WHERE\` recorta los datos que la ventana puede ver. Para filtrar después hace falta otro nivel:

\`\`\`sql
WITH diario AS (
  SELECT (played_at AT TIME ZONE 'UTC')::date AS dia, count(*) AS reproducciones
  FROM plays
  WHERE played_at >= timestamptz '2025-07-01 00:00:00+00'
  GROUP BY 1
), con_media AS (
  SELECT
    dia,
    reproducciones,
    round(avg(reproducciones) OVER (
      ORDER BY dia ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ), 2) AS media_7d
  FROM diario
)
SELECT dia, reproducciones, media_7d
FROM con_media
WHERE dia >= DATE '2025-08-01'
ORDER BY dia;
\`\`\`

Julio entra en el cálculo y no se muestra: la media del 1 de agosto ya es una media de siete días reales.

## Media móvil centrada

Un marco puede mirar hacia adelante. La media centrada de 7 días toma tres días antes, el actual y tres después:

\`\`\`sql
avg(reproducciones) OVER (
  ORDER BY dia
  ROWS BETWEEN 3 PRECEDING AND 3 FOLLOWING
) AS media_centrada_7d
\`\`\`

Sigue mejor la forma de la curva porque no la desplaza hacia la derecha, pero **usa información futura**: no sirve para pronosticar ni para un tablero en vivo, y los últimos tres días quedan incompletos. Para análisis histórico es la mejor opción; para operación diaria, la móvil hacia atrás.

## Días sin datos

Si un día no tiene filas, no existe en la serie y \`ROWS BETWEEN 6 PRECEDING\` tomará siete días **con actividad**, no siete días de calendario. Dos soluciones:

- \`RANGE BETWEEN INTERVAL '6 days' PRECEDING AND CURRENT ROW\`: la ventana es temporal y los huecos simplemente aportan menos filas. El promedio se calcula sobre los días presentes.
- Construir un calendario completo (con \`generate_series\`) y unirlo con \`LEFT JOIN\` para que los días vacíos existan con valor 0. Solo así el **promedio** trata los huecos como ceros, que a veces es lo correcto y a veces no.

Decide cuál pide el negocio: «promedio de los días con actividad» y «promedio diario del período» no son la misma métrica.

## Errores comunes

- \`7 PRECEDING\` para una media de 7 días.
- Omitir el marco y publicar un promedio acumulado desde el inicio como si fuera móvil.
- Filtrar el período en el \`WHERE\` y sorprenderse de que los primeros días estén «mal».
- Usar una media centrada en un tablero operativo.

## Resumen

1. Media móvil de N días hacia atrás = \`ROWS BETWEEN N-1 PRECEDING AND CURRENT ROW\`.
2. Para que el primer día ya tenga una media completa, calcula sobre más historia y filtra después de la ventana.
3. Con huecos de calendario usa \`RANGE\` con \`INTERVAL\`, o rellena la serie con ceros si el negocio los cuenta.
`,
  },
];
