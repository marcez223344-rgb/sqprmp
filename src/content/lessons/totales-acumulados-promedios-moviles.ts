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

Casi todo tablero de negocio tiene una curva que sube: oyentes registrados hasta la fecha, ingresos del año, suscripciones netas. Esa curva es un **total acumulado**, es decir, una serie en la que cada período muestra la suma de todo lo ocurrido desde el principio hasta ese período inclusive. En SQL se calcula con una función de ventana, una función que mira varias filas relacionadas con la actual sin agruparlas, así que no hace falta unir la tabla consigo misma ni exportar nada a una planilla.

Trabajas con **Ritmo**, un servicio de streaming musical presente en seis mercados. Sus tablas son \`users\` (los oyentes), \`plays\` (una fila por reproducción), \`tracks\` (las canciones), \`albums\`, \`artists\` y \`subscriptions\` (las suscripciones pagas).

## El patrón de dos pasos

Un acumulado casi nunca se calcula sobre las filas originales. Primero agrupas por período para obtener una fila por mes, y recién después acumulas esas filas. Separar los dos pasos con una CTE (por *common table expression*, el bloque \`WITH\` que le pone nombre a un paso intermedio) deja la consulta legible y evita el error clásico de mezclar dos niveles de agregación en la misma línea.

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

La CTE produce una fila por mes, con la cantidad de altas de ese mes. Después, \`sum(altas) OVER (ORDER BY mes)\` suma las filas **desde la primera hasta la actual** siguiendo ese orden, y por eso cada fila muestra el total acumulado hasta su mes. La última fila del resultado vale 5000, que es el total de oyentes registrados en la plataforma.

\`AT TIME ZONE 'UTC'\` fija el huso horario con el que se corta el calendario. UTC (por *coordinated universal time*) es el huso de referencia mundial. Sin esa indicación, el mes al que se asigna cada alta depende de la zona horaria de la sesión: en este sandbox siempre es UTC, para que tus resultados sean reproducibles, pero en un servidor real es la que haya configurado quien lo instaló. El total acumulado al final de la serie no cambia, porque las altas son las mismas; lo que cambia es en qué mes sube cada escalón, así que dos personas con configuraciones distintas obtienen curvas distintas. Escribe el huso de forma explícita y aclara en el informe con qué huso están cortados los meses.

## El ORDER BY de la ventana no es el de la consulta

Son dos cosas distintas y conviene tenerlo muy claro:

- El \`ORDER BY\` **dentro de \`OVER\`** define en qué orden se acumula. Cambia los **valores**.
- El \`ORDER BY\` **final** define cómo se muestra el resultado. Cambia solo la **presentación**.

Puedes acumular por fecha y mostrar el resultado de mayor a menor: los valores acumulados no se alteran, solo cambia el orden en que se ven. Lo que no puedes es omitir el \`ORDER BY\` dentro de \`OVER\`. Sin él, la ventana no tiene ninguna noción de «hasta aquí», así que \`sum\` toma todas las filas del grupo y devuelve el total completo repetido en cada fila.

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

Cada país arranca su propia curva desde cero y el acumulado de un país nunca incluye reproducciones de otro. Es exactamente lo que necesitas para comparar mercados que empezaron a operar en momentos distintos.

## Participación acumulada (curva de Pareto)

Combinando dos ventanas obtienes el porcentaje acumulado, también llamado curva de Pareto: cada fila indica qué parte del total explican esa fila y todas las anteriores. Es la herramienta estándar para responder «¿cuántos artistas explican la mitad de las reproducciones?». El ejemplo parte de \`por_artista\`, una CTE previa con una fila por artista y su cantidad de reproducciones:

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

El numerador acumula las reproducciones en orden descendente, empezando por el artista más escuchado. El denominador es \`sum(...) OVER ()\`, una ventana sin \`ORDER BY\` y sin \`PARTITION BY\`, que por eso abarca todas las filas y da el gran total. El segundo criterio de orden, \`artista\`, desempata a quienes tienen la misma cantidad de reproducciones, de modo que la consulta devuelva siempre el mismo resultado.

## Errores comunes

- Olvidar el \`ORDER BY\` dentro de \`OVER\`: obtienes el total, no el acumulado.
- Acumular sobre filas crudas en vez de sobre el agregado por período.
- Usar \`PARTITION BY mes\`. Eso crea un grupo por cada mes, y como cada grupo tiene una sola fila, el acumulado nunca avanza y repite el valor del mes. El período va en el \`ORDER BY\` de la ventana. El grupo por el que se reinicia la curva va en el \`PARTITION BY\`.
- Empates sin criterio de desempate: dos filas con la misma clave de orden comparten valor acumulado (lo verás en detalle en la próxima lección).

## Resumen

1. Acumulado = \`sum(metrica) OVER (ORDER BY periodo)\`, casi siempre sobre una CTE ya agregada.
2. \`PARTITION BY\` reinicia la curva en cada grupo. El \`ORDER BY\` de la ventana define en qué orden avanza la suma.
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

Cuando escribes \`sum(x) OVER (ORDER BY mes)\` obtienes un acumulado aunque no hayas pedido ningún marco. Lo que ocurre es que Postgres aplicó un **marco** por omisión: el marco es el subconjunto de filas que la función mira para calcular el valor de la fila actual. Esta es la parte de las funciones de ventana que más resultados incorrectos produce en silencio, porque la consulta no falla nunca: devuelve números plausibles que responden otra pregunta.

## Las tres partes de OVER

\`\`\`text
OVER (
  PARTITION BY ...                    -- qué filas forman el grupo
  ORDER BY ...                        -- en qué orden se recorren
  <modo> BETWEEN <inicio> AND <fin>   -- el marco: qué subconjunto ve cada fila
)
\`\`\`

El marco se define **dentro** de cada partición y se vuelve a calcular para cada fila, así que la fila 3 y la fila 40 miran conjuntos distintos. Los límites disponibles son \`UNBOUNDED PRECEDING\` (desde el comienzo de la partición), \`N PRECEDING\` (N filas o N unidades hacia atrás), \`CURRENT ROW\` (la fila actual), \`N FOLLOWING\` (hacia adelante) y \`UNBOUNDED FOLLOWING\` (hasta el final de la partición). El límite de inicio nunca puede quedar después del de fin.

## Los valores por omisión

- **Sin \`ORDER BY\`**, el marco es la partición completa. Por eso \`avg(x) OVER (PARTITION BY country)\` devuelve el promedio del país entero, repetido igual en todas las filas de ese país.
- **Con \`ORDER BY\` y sin marco escrito**, el marco es \`RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW\`, es decir, desde el comienzo de la partición hasta la fila actual. De ese valor por omisión sale el total acumulado.

Escribir ese marco a mano es válido y a veces aclara la intención:

\`\`\`sql
sum(altas) OVER (ORDER BY mes ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)
\`\`\`

## ROWS cuenta filas; RANGE compara valores

La diferencia aparece con **empates** en la clave de orden.

- \`ROWS\` cuenta posiciones físicas. \`ROWS BETWEEN 2 PRECEDING AND CURRENT ROW\` son siempre tres filas, salvo al principio de la partición, donde todavía no hay dos filas anteriores y el marco se recorta.
- \`RANGE\` trabaja sobre los **valores** de la columna del \`ORDER BY\`. Ahí \`CURRENT ROW\` significa «todas las filas cuyo valor de orden es igual al mío», así que las filas empatadas comparten el mismo marco y obtienen el mismo resultado.

Si tres oyentes se registraron el mismo día y acumulas con \`ORDER BY fecha\`, el marco \`RANGE\` por omisión les asigna a los tres el acumulado del día completo, porque los tres comparten la misma fecha. Con \`ROWS\` verías 1, 2 y 3, un valor distinto para cada uno según su posición. Ninguno de los dos comportamientos es incorrecto: responden preguntas diferentes. El problema aparece cuando no sabes cuál de las dos pediste.

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

\`GROUPS BETWEEN 1 PRECEDING AND CURRENT ROW\` cuenta **grupos de filas empatadas** en lugar de filas sueltas o de valores: toma el grupo de la fila actual más el grupo anterior completo. Se usa poco, pero es la respuesta exacta cuando quieres «los dos días distintos más recientes» y cada día tiene varias filas.

## Errores comunes

- Creer que un \`ORDER BY\` sin marco hace que la función mire toda la partición. No la mira: acumula desde el comienzo hasta la fila actual.
- Usar \`ROWS BETWEEN N PRECEDING\` en una serie con días faltantes y llamarlo «últimos N días».
- Usar \`ROWS\` con empates en la clave de orden sin desempatar: el resultado depende de un orden arbitrario y puede cambiar entre ejecuciones.
- Definir un marco con desplazamiento en una ventana sin \`ORDER BY\`: es un error de sintaxis.

## Resumen

1. El marco por omisión con \`ORDER BY\` es \`RANGE UNBOUNDED PRECEDING … CURRENT ROW\`; sin \`ORDER BY\`, toda la partición.
2. \`ROWS\` cuenta filas. \`RANGE\` compara valores del \`ORDER BY\` y admite desplazamientos con \`INTERVAL\`. \`GROUPS\` cuenta grupos de filas empatadas.
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

Una serie diaria de negocio es ruidosa: los fines de semana suben, los feriados caen y un día cualquiera se dispara por una campaña. El **promedio móvil** reemplaza el valor de cada día por el promedio de ese día y los anteriores, de modo que las variaciones sueltas se compensan y queda a la vista la tendencia. Es la métrica que aparece en todos los tableros de producto y el uso más común de un marco de ventana escrito de forma explícita.

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

El error más frecuente es escribir \`7 PRECEDING\`, que toma siete días anteriores más el actual y da una ventana de ocho días. Para una media de N días hacia atrás, el marco siempre lleva \`N-1 PRECEDING\`.

## El borde inicial

Las primeras seis filas de la serie no tienen seis días anteriores disponibles, así que el marco se **recorta** y esas filas promedian menos valores de los que indica el nombre de la columna. No es un error de Postgres: es exactamente lo que pediste. Tienes dos opciones honestas:

1. Dejarlas así y advertirlo en el tablero.
2. Calcular la ventana sobre una serie que empiece **antes** del período que quieres mostrar y filtrar después.

La segunda opción es la que se usa en un informe serio, y obliga a tener presente el orden de evaluación. El \`WHERE\` se ejecuta **antes** que las funciones de ventana, así que un filtro de fechas escrito ahí también recorta los datos que la ventana puede mirar hacia atrás. Para filtrar después de calcular la media hace falta otro nivel de consulta:

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

Julio participa del cálculo pero no aparece en el resultado, porque el filtro final lo descarta. Gracias a eso, la media del 1 de agosto ya está calculada sobre siete días reales y es comparable con la del resto del mes.

## Media móvil centrada

Un marco puede mirar hacia adelante. La media centrada de 7 días toma tres días antes, el actual y tres después:

\`\`\`sql
avg(reproducciones) OVER (
  ORDER BY dia
  ROWS BETWEEN 3 PRECEDING AND 3 FOLLOWING
) AS media_centrada_7d
\`\`\`

La media centrada sigue mejor la forma de la curva porque no la desplaza hacia la derecha, pero para calcular el valor de un día **usa información de días posteriores**. Eso la vuelve inservible para pronosticar y para un tablero en vivo, y además deja incompletos los últimos tres días de la serie. Para un análisis histórico es la mejor opción; para el seguimiento diario de la operación, usa la media móvil hacia atrás.

## Días sin datos

Si un día no tuvo ninguna reproducción, ese día no aparece como fila en la serie, así que \`ROWS BETWEEN 6 PRECEDING\` toma siete días **con actividad**, que pueden estar repartidos en dos semanas o en un mes. No son siete días de calendario. Hay dos soluciones:

- \`RANGE BETWEEN INTERVAL '6 days' PRECEDING AND CURRENT ROW\`: la ventana es temporal y los huecos simplemente aportan menos filas. El promedio se calcula sobre los días presentes.
- Construir un calendario completo (con \`generate_series\`) y unirlo con \`LEFT JOIN\` para que los días vacíos existan con valor 0. Solo así el **promedio** trata los huecos como ceros, que a veces es lo correcto y a veces no.

Decide con el negocio cuál de las dos corresponde, porque «promedio de los días con actividad» y «promedio diario del período» son métricas distintas y la segunda siempre da un número menor cuando hay días vacíos.

## Errores comunes

- \`7 PRECEDING\` para una media de 7 días.
- Omitir el marco y publicar un promedio acumulado desde el inicio como si fuera móvil.
- Filtrar el período en el \`WHERE\` y sorprenderse de que los primeros días estén «mal».
- Usar una media centrada en un tablero operativo.

## Resumen

1. Media móvil de N días hacia atrás = \`ROWS BETWEEN N-1 PRECEDING AND CURRENT ROW\`.
2. Para que el primer día ya tenga una media completa, calcula sobre más historia y filtra después de la ventana.
3. Con huecos de calendario usa \`RANGE\` con \`INTERVAL\`, o rellena la serie con ceros si el negocio los cuenta.

## Próximos pasos

**Lo que ya puedes hacer:** Sabes calcular totales acumulados, promedios móviles con marcos ROWS y detectar errores causados por períodos sin datos.

**Antes de seguir:** resuelve los ejercicios y el quiz de esta sección.

**Lo que sigue:** Sección 28 · LAG y LEAD. Vas a comparar cada fila con la anterior o la siguiente.

**Para practicar (opcional):** ¿Cuántos pedidos acumuló Pídelo día a día en agosto de 2025, y con qué promedio móvil de 7 días? Cuenta los pedidos por día de \`placed_at\` y aplica ventanas sobre ese conteo.
`,
  },
];
