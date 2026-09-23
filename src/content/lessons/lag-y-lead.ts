import type { LessonDef } from "../schemas/curriculum";

const section = "lag-y-lead";

export const lessons: LessonDef[] = [
  {
    slug: "lag-y-lead-basico",
    section,
    kind: "theory",
    title: "LAG y LEAD: mirar la fila anterior y la siguiente",
    sort_order: 0,
    estimated_minutes: 10,
    is_free: false,
    is_published: true,
    prerequisites: ["marcos-rows-range"],
    dataset: "ritmo",
    body_md: `## Por qué importa

Muchísimas preguntas de negocio se responden comparando una fila con su vecina: ¿vendimos más que el mes pasado?, ¿cuánto tardó este cliente en volver?, ¿cambió de plan? Sin funciones de ventana, esa comparación exige unir la tabla consigo misma con una condición de «la fila inmediatamente anterior», que es incómoda de escribir y lenta de ejecutar.

\`LAG\` y \`LEAD\` resuelven eso en una línea: traen el valor de otra fila de la misma partición, sin agrupar y sin perder ninguna fila.

Seguimos con **Ritmo**, el servicio de streaming: \`users\` (oyentes), \`plays\` (reproducciones), \`albums\`, \`artists\` y \`subscriptions\`.

## La forma básica

\`\`\`sql
WITH mensual AS (
  SELECT
    date_trunc('month', played_at AT TIME ZONE 'UTC')::date AS mes,
    count(*) AS reproducciones
  FROM plays
  GROUP BY 1
)
SELECT
  mes,
  reproducciones,
  lag(reproducciones) OVER (ORDER BY mes) AS mes_anterior,
  lead(reproducciones) OVER (ORDER BY mes) AS mes_siguiente
FROM mensual
ORDER BY mes;
\`\`\`

\`lag(x)\` devuelve el valor de \`x\` en la fila **anterior** según el \`ORDER BY\` de la ventana; \`lead(x)\`, el de la fila **siguiente**. En la primera fila no hay anterior, así que \`lag\` devuelve \`NULL\`; en la última pasa lo mismo con \`lead\`.

El \`AT TIME ZONE 'UTC'\` fija el huso con el que se corta el calendario: sin él, el mes al que cae cada marca de tiempo depende de la zona de la sesión (UTC en el sandbox, pero lo que el administrador haya configurado en un servidor real). Aquí no vas a notar la diferencia porque el sandbox fija UTC justamente para que los resultados sean reproducibles; en producción, una reproducción del 1 de marzo a las 00:30 UTC se le suma a febrero si la sesión corre en Bogotá, y con \`lag\` ese corrimiento arrastra toda la columna de comparación.

## El ORDER BY de la ventana es obligatorio

\`LAG\` y \`LEAD\` responden «la fila anterior **en qué orden**». Sin \`ORDER BY\` dentro de \`OVER\` no hay un orden definido y el resultado queda a merced del plan de ejecución. Postgres no te avisa: simplemente devuelve algo. Considéralo obligatorio.

Ese \`ORDER BY\` es independiente del \`ORDER BY\` final de la consulta. Puedes mirar hacia atrás por fecha y mostrar el resultado de mayor a menor; los valores de \`lag\` no cambian.

## Desplazamiento y valor por omisión

Ambas funciones aceptan dos argumentos más:

\`\`\`sql
lag(reproducciones, 12) OVER (ORDER BY mes)        -- el mismo mes del año pasado
lag(reproducciones, 1, 0) OVER (ORDER BY mes)      -- 0 en lugar de NULL en la primera fila
\`\`\`

El segundo argumento es cuántas filas retroceder (o avanzar); el tercero, qué devolver cuando esa fila no existe. Cuidado con el valor por omisión: poner \`0\` es cómodo para restar, pero convierte «no hay dato» en «había cero», y eso puede mentir en un informe. Úsalo solo cuando el cero sea verdad en el negocio.

Y una advertencia importante sobre \`lag(x, 12)\`: retrocede **doce filas**, no doce meses. Si a la serie le falta un mes porque no hubo actividad, la comparación se desalinea sin avisar.

## Partir por grupo

\`PARTITION BY\` hace que la comparación se reinicie en cada grupo, que es casi siempre lo que quieres:

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
  lag(reproducciones) OVER (PARTITION BY country ORDER BY mes) AS mes_anterior
FROM mensual
ORDER BY country, mes;
\`\`\`

Sin \`PARTITION BY\`, la primera fila de Chile se compararía con la última de Brasil: un número sin ningún sentido que además parece plausible.

## Dónde no se puede usar

Como toda función de ventana, \`LAG\` se evalúa **después** de \`WHERE\`, \`GROUP BY\` y \`HAVING\`. Por eso:

- No puedes filtrar por \`lag(...)\` en el \`WHERE\` de la misma consulta. Calcúlalo en una CTE o subconsulta y filtra en el nivel de afuera.
- Lo que el \`WHERE\` descarta, la ventana no lo ve. Si filtras un mes y pides el mes anterior, la primera fila devuelve \`NULL\`: el dato existía, pero lo quitaste antes.

## Errores comunes

- Omitir \`ORDER BY\` dentro de \`OVER\`.
- Olvidar \`PARTITION BY\` y comparar filas de grupos distintos.
- Filtrar el período antes de la ventana y luego extrañarse del \`NULL\` inicial.
- Confundir \`lag(x, 2)\` (dos filas atrás) con «dos meses atrás».

## Resumen

1. \`lag\` mira hacia atrás y \`lead\` hacia adelante dentro de la partición, según el \`ORDER BY\` de la ventana.
2. \`ORDER BY\` dentro de \`OVER\` es obligatorio; \`PARTITION BY\` evita mezclar grupos.
3. Las ventanas corren después del \`WHERE\`: para filtrar por su resultado necesitas otro nivel.
`,
  },
  {
    slug: "variaciones-entre-periodos",
    section,
    kind: "theory",
    title: "Variaciones entre períodos",
    sort_order: 1,
    estimated_minutes: 11,
    is_free: false,
    is_published: true,
    prerequisites: ["lag-y-lead-basico"],
    dataset: "ritmo",
    body_md: `## Por qué importa

«Creció 12 % contra el mes anterior» es probablemente la frase más repetida en cualquier reunión de resultados. Detrás hay una cuenta simple —valor actual contra valor anterior— y varias trampas que arruinan el número sin que nadie lo note.

## Variación absoluta y porcentual

\`\`\`sql
WITH mensual AS (
  SELECT
    date_trunc('month', played_at AT TIME ZONE 'UTC')::date AS mes,
    count(*) AS reproducciones
  FROM plays
  GROUP BY 1
)
SELECT
  mes,
  reproducciones,
  reproducciones - lag(reproducciones) OVER (ORDER BY mes) AS variacion,
  round(
    100.0 * (reproducciones - lag(reproducciones) OVER (ORDER BY mes))
      / nullif(lag(reproducciones) OVER (ORDER BY mes), 0),
    1
  ) AS variacion_pct
FROM mensual
ORDER BY mes;
\`\`\`

Tres detalles que hacen la diferencia:

- **\`100.0\` y no \`100\`.** Con dos enteros, la división en Postgres es entera: \`3 / 4\` da \`0\`. Basta con que un operando sea \`numeric\` para que la cuenta sea decimal.
- **\`nullif(..., 0)\`.** Si el mes anterior fue 0, la división falla con *division by zero*. \`nullif\` la convierte en \`NULL\`, que es la respuesta honesta: «no se puede calcular».
- **\`round(..., 1)\`.** Redondea al final, nunca en pasos intermedios.

Repetir tres veces la misma expresión \`lag(...)\` funciona, pero se lee mal. Una CTE intermedia deja la fórmula limpia:

\`\`\`sql
WITH mensual AS (
  SELECT
    date_trunc('month', played_at AT TIME ZONE 'UTC')::date AS mes,
    count(*) AS reproducciones
  FROM plays
  GROUP BY 1
),
con_anterior AS (
  SELECT
    mes,
    reproducciones,
    lag(reproducciones) OVER (ORDER BY mes) AS anterior
  FROM mensual
)
SELECT
  mes,
  reproducciones,
  anterior,
  round(100.0 * (reproducciones - anterior) / nullif(anterior, 0), 1) AS variacion_pct
FROM con_anterior
ORDER BY mes;
\`\`\`

## Contra el mes anterior o contra el mismo mes del año pasado

No son la misma pregunta. La variación mes a mes mezcla crecimiento real con estacionalidad: diciembre casi siempre sube y febrero casi siempre baja. La variación interanual compara períodos comparables y aísla la tendencia.

\`\`\`sql
lag(reproducciones, 12) OVER (ORDER BY mes) AS mismo_mes_ano_pasado
\`\`\`

Solo es correcto si la serie tiene **todos** los meses. Si falta uno, \`lag(x, 12)\` retrocede doce filas y compara contra el mes equivocado. Cuando no puedas garantizar la serie completa, une la tabla consigo misma por \`mes = otro.mes + interval '1 year'\`, que compara por calendario y no por posición.

## Períodos incompletos

El último período casi siempre está a medio llenar: si el corte de datos es el 15 de septiembre, ese mes muestra medio mes. La variación contra agosto dará una caída enorme que no existe.

Dos salidas honestas: excluir el período en curso con un filtro, o marcarlo con una bandera para que quien lea el informe sepa que no es comparable. Lo que nunca conviene es publicarlo como si fuera una caída real.

## Bases pequeñas y números negativos

Un porcentaje sobre una base chica es ruido: pasar de 2 a 6 es «+200 %» y no significa nada. En los tableros se suele ocultar la variación cuando la base está por debajo de un mínimo acordado con el negocio.

Y si la base puede ser negativa (resultados, márgenes), la variación porcentual cambia de signo y deja de ser interpretable. Ahí se reporta la diferencia absoluta.

## Errores comunes

- Dividir enteros y obtener siempre 0.
- No proteger la división con \`nullif\` y hacer fallar todo el informe por un solo mes en cero.
- Comparar contra «doce filas atrás» en una serie con huecos.
- Publicar la caída del período en curso como si fuera real.
- Redondear en pasos intermedios y arrastrar el error.

## Resumen

1. Variación = actual − anterior; porcentual = (actual − anterior) / anterior, siempre con \`100.0\` y \`nullif\`.
2. Mes a mes mide movimiento reciente; interanual aísla la estacionalidad.
3. El período incompleto se excluye o se marca, nunca se compara en silencio.
`,
  },
  {
    slug: "brechas-y-valores-de-referencia",
    section,
    kind: "theory",
    title: "Brechas entre eventos y valores de referencia",
    sort_order: 2,
    estimated_minutes: 11,
    is_free: false,
    is_published: true,
    prerequisites: ["variaciones-entre-periodos"],
    dataset: "ritmo",
    body_md: `## Por qué importa

\`LAG\` no sirve solo para series mensuales. Aplicado a una tabla de eventos responde preguntas que el negocio hace todo el tiempo: ¿cuánto pasa entre una compra y la siguiente?, ¿cuándo se corta una sesión?, ¿en qué momento cambió de plan este cliente?

## Tiempo entre eventos consecutivos

\`\`\`sql
SELECT
  played_at,
  lag(played_at) OVER (PARTITION BY user_id ORDER BY played_at) AS anterior,
  round(
    (extract(epoch FROM played_at
       - lag(played_at) OVER (PARTITION BY user_id ORDER BY played_at)) / 3600)::numeric,
    2
  ) AS horas_desde_anterior
FROM plays
WHERE user_id = 496
ORDER BY played_at;
\`\`\`

Restar dos \`timestamptz\` da un \`interval\`. Un intervalo se muestra bien pero se agrega mal, así que para promediar o comparar conviene pasarlo a un número: \`extract(epoch FROM ...)\` devuelve segundos, y divides por 3600 para horas o por 86400 para días.

Con fechas (\`date\`) es más simple todavía: \`released_on - lag(released_on) OVER (...)\` devuelve directamente un entero de días.

La primera fila de cada partición no tiene anterior: su brecha es \`NULL\`, y eso es correcto. Rellenarla con 0 diría «volvió al instante», que es falso.

## Sesionizar: agrupar eventos cercanos

Un patrón clásico: una sesión termina cuando pasan más de N minutos sin actividad. Se marca cada evento como inicio de sesión o continuación:

\`\`\`sql
WITH marcadas AS (
  SELECT
    user_id,
    played_at,
    lag(played_at) OVER (PARTITION BY user_id ORDER BY played_at) AS anterior
  FROM plays
)
SELECT
  user_id,
  played_at,
  CASE
    WHEN anterior IS NULL OR played_at - anterior > interval '30 minutes' THEN 1
    ELSE 0
  END AS inicia_sesion
FROM marcadas;
\`\`\`

\`anterior IS NULL\` cubre la primera reproducción de cada oyente, que siempre abre sesión. A partir de ahí, contar sesiones es sumar esa bandera; y si necesitas un identificador de sesión, un \`sum(inicia_sesion) OVER (PARTITION BY user_id ORDER BY played_at)\` numera las sesiones de cada persona.

El mismo patrón detecta cambios de estado: si \`lag(plan)\` es distinto del plan actual, esa fila es un cambio de plan. Compáralo con \`IS DISTINCT FROM\` en vez de \`<>\` para que un \`NULL\` cuente como diferencia y no desaparezca.

## FIRST_VALUE y LAST_VALUE

A veces no quieres la fila vecina sino un punto de referencia de toda la partición: el primer mes de la serie, el nivel actual, el precio inicial del cliente.

\`\`\`sql
first_value(reproducciones) OVER (PARTITION BY country ORDER BY mes) AS primer_mes
\`\`\`

\`FIRST_VALUE\` funciona como esperas. \`LAST_VALUE\` **no**, y es una de las trampas más frecuentes de SQL: con \`ORDER BY\` y sin marco explícito, la ventana llega hasta la fila actual, así que \`last_value\` devuelve el valor de la fila actual, no el último de la partición. Hay que abrir el marco:

\`\`\`sql
last_value(reproducciones) OVER (
  PARTITION BY country
  ORDER BY mes
  ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
) AS ultimo_mes
\`\`\`

Una alternativa que muchos prefieren por lo explícita: \`first_value(...) OVER (PARTITION BY country ORDER BY mes DESC)\`. Da lo mismo y no depende de recordar el marco.

Con esa referencia, un índice base 100 sale solo: \`round(100.0 * reproducciones / ultimo_mes, 1)\`.

## Errores comunes

- Usar \`last_value\` sin abrir el marco y obtener la fila actual.
- Olvidar \`PARTITION BY\` y medir la brecha contra el evento de otra persona.
- Rellenar con 0 la primera brecha de cada partición.
- Restar marcas de tiempo y promediar intervalos sin convertirlos a número.
- Comparar estados con \`<>\` cuando alguno puede ser \`NULL\`.

## Resumen

1. \`LAG\` sobre una tabla de eventos mide el tiempo entre hechos consecutivos; convierte el intervalo a número para agregarlo.
2. Marcar «empieza algo nuevo» con \`CASE\` sobre \`lag\` sesionaliza y detecta cambios de estado.
3. \`FIRST_VALUE\` es directo; \`LAST_VALUE\` necesita \`ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING\`.
`,
  },
];
