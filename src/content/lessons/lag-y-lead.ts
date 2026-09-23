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

Muchísimas preguntas de negocio se responden comparando una fila con la que tiene al lado: ¿vendimos más que el mes pasado?, ¿cuánto tardó este cliente en volver a comprar?, ¿cambió de plan? Sin funciones de ventana, esa comparación exige unir la tabla consigo misma con una condición que describa «la fila inmediatamente anterior», algo incómodo de escribir y lento de ejecutar.

\`LAG\` («retraso» en inglés) y \`LEAD\` («adelanto») son funciones de ventana, es decir, funciones que miran otras filas relacionadas con la fila actual sin agruparlas. Traen a tu fila el valor de otra fila del mismo grupo, y el resultado conserva todas las filas originales.

Seguimos con **Ritmo**, el servicio de streaming musical. Sus tablas son \`users\` (los oyentes), \`plays\` (una fila por reproducción), \`albums\`, \`artists\` y \`subscriptions\` (las suscripciones pagas).

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

\`lag(x)\` devuelve el valor que tiene \`x\` en la fila **anterior**, según el \`ORDER BY\` escrito dentro de \`OVER\`. \`lead(x)\` devuelve el valor de esa misma columna en la fila **siguiente**. La primera fila no tiene ninguna anterior, así que su \`lag\` es \`NULL\`, y a la última le pasa lo mismo con \`lead\`.

El \`AT TIME ZONE 'UTC'\` fija el huso horario con el que se corta el calendario. UTC (por *coordinated universal time*) es el huso de referencia mundial, y sin esa indicación el mes al que cae cada marca de tiempo depende de la zona horaria configurada en la sesión. En este sandbox no vas a notar la diferencia, porque la sesión está fijada en UTC justamente para que los resultados sean reproducibles. En un servidor real, en cambio, una reproducción del 1 de marzo a las 00:30 UTC se cuenta en febrero si la sesión corre en Bogotá. Y como \`lag\` compara cada mes con el anterior, ese corrimiento de unas pocas filas desplaza toda la columna de comparación.

## El ORDER BY de la ventana es obligatorio

\`LAG\` y \`LEAD\` tienen que saber «la fila anterior **en qué orden**». Si no escribes \`ORDER BY\` dentro de \`OVER\`, no existe ningún orden definido y el valor que devuelven depende de cómo el motor haya decidido leer las filas esa vez. Postgres no emite ninguna advertencia: devuelve un número, y ese número puede cambiar entre ejecuciones. Trátalo como obligatorio.

Ese \`ORDER BY\` es independiente del \`ORDER BY\` final de la consulta. Puedes mirar hacia atrás por fecha y mostrar el resultado de mayor a menor; los valores de \`lag\` no cambian.

## Desplazamiento y valor por omisión

Ambas funciones aceptan dos argumentos más:

\`\`\`sql
lag(reproducciones, 12) OVER (ORDER BY mes)        -- el mismo mes del año pasado
lag(reproducciones, 1, 0) OVER (ORDER BY mes)      -- 0 en lugar de NULL en la primera fila
\`\`\`

El segundo argumento indica cuántas filas hay que retroceder o avanzar. El tercero indica qué valor devolver cuando esa fila no existe. Ten cuidado con ese tercer argumento: poner \`0\` es cómodo porque permite restar sin obtener NULL, pero convierte «no tenemos dato de ese período» en «ese período valió cero», y quien lea el informe va a interpretar lo segundo. Úsalo solo cuando el cero sea cierto en términos del negocio.

Una advertencia importante sobre \`lag(x, 12)\`: retrocede **doce filas**, no doce meses. Si a la serie le falta un mes porque en ese período no hubo actividad, la función compara contra un mes equivocado y no hay ningún aviso de que eso ocurrió.

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

Sin \`PARTITION BY\`, todas las filas forman una sola secuencia y la primera fila de Chile se compara con la última de Brasil. El resultado es una variación entre dos países distintos, que no significa nada y que además tiene el aspecto de un número razonable.

## Dónde no se puede usar

Como toda función de ventana, \`LAG\` se evalúa **después** de \`WHERE\`, \`GROUP BY\` y \`HAVING\`. Por eso:

- No puedes filtrar por \`lag(...)\` en el \`WHERE\` de la misma consulta, porque en ese momento el valor todavía no está calculado. Calcúlalo dentro de una CTE (por *common table expression*, el bloque \`WITH\` que nombra un paso intermedio) o de una subconsulta, y filtra en el nivel de afuera.
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

«Creció 12 % contra el mes anterior» es probablemente la frase más repetida en cualquier reunión de resultados. Detrás hay una cuenta simple, el valor actual comparado con el valor anterior, y varias trampas que arruinan el número sin que nadie lo note en la reunión.

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

- **\`100.0\` y no \`100\`.** Cuando los dos operandos son enteros, Postgres hace una división entera y corta los decimales: \`3 / 4\` da \`0\`. Basta con que uno de los dos sea \`numeric\` para que la cuenta se resuelva con decimales.
- **\`nullif(..., 0)\`.** Si el mes anterior fue 0, la división falla con *division by zero*. \`nullif\` la convierte en \`NULL\`, que es la respuesta honesta: «no se puede calcular».
- **\`round(..., 1)\`.** Redondea al final, nunca en pasos intermedios.

Repetir tres veces la misma expresión \`lag(...)\` funciona y da el resultado correcto, pero obliga a quien lee a verificar que las tres copias sean idénticas. Calcular el valor anterior una sola vez en una CTE intermedia deja la fórmula a la vista:

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

No son la misma pregunta. La variación mes a mes mezcla el crecimiento real con la **estacionalidad**, que es el patrón que se repite todos los años por el calendario: diciembre casi siempre sube y febrero casi siempre baja, sin que el negocio haya cambiado. La variación interanual compara cada mes contra el mismo mes del año anterior, así que la estacionalidad afecta por igual a los dos valores y lo que queda a la vista es la tendencia.

\`\`\`sql
lag(reproducciones, 12) OVER (ORDER BY mes) AS mismo_mes_ano_pasado
\`\`\`

Eso solo es correcto si la serie tiene **todos** los meses. Si falta uno, \`lag(x, 12)\` retrocede doce filas y termina comparando contra un mes que no corresponde. Cuando no puedas garantizar que la serie esté completa, une la tabla consigo misma con la condición \`mes = otro.mes + interval '1 year'\`, que empareja por fecha de calendario en lugar de por posición en la lista.

## Períodos incompletos

El último período casi siempre está a medio llenar. Si los datos llegan hasta el 15 de septiembre, ese mes contiene quince días y agosto contiene treinta y uno. La variación entre ambos va a mostrar una caída enorme que no ocurrió: solo refleja que estás comparando medio mes contra un mes entero.

Dos salidas honestas: excluir el período en curso con un filtro, o marcarlo con una bandera para que quien lea el informe sepa que no es comparable. Lo que nunca conviene es publicarlo como si fuera una caída real.

## Bases pequeñas y números negativos

Un porcentaje calculado sobre una base chica no informa nada útil: pasar de 2 reproducciones a 6 es «+200 %», y ese titular describe cuatro reproducciones de diferencia. Por eso en los tableros se suele ocultar la variación cuando la base está por debajo de un mínimo acordado con el negocio.

Y si la base puede ser negativa, como ocurre con resultados o márgenes, la variación porcentual cambia de signo y deja de poder interpretarse: pasar de −100 a −50 da «−50 %» aunque la situación mejoró. En esos casos se informa la diferencia absoluta, no el porcentaje.

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

\`LAG\` no sirve solo para series mensuales. Aplicado a una tabla de eventos, donde cada fila es algo que pasó en un instante, responde preguntas que el negocio hace todo el tiempo: ¿cuánto tiempo pasa entre una compra y la siguiente?, ¿en qué punto se corta una sesión?, ¿en qué momento cambió de plan este cliente?

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

Restar dos valores \`timestamptz\` devuelve un \`interval\`, que es una duración. Un intervalo se muestra bien en pantalla, pero es incómodo de promediar y de comparar, así que conviene convertirlo a número: \`extract(epoch FROM ...)\` devuelve la duración en segundos, y a partir de ahí divides entre 3600 para obtener horas o entre 86400 para obtener días.

Con fechas (\`date\`) es más simple todavía: \`released_on - lag(released_on) OVER (...)\` devuelve directamente un entero de días.

La primera fila de cada partición no tiene ninguna fila anterior, así que su brecha es \`NULL\`, y ese NULL es la respuesta correcta: no hubo un evento previo que medir. Rellenarlo con 0 afirmaría que la persona volvió de inmediato, y además bajaría cualquier promedio que calcules después.

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

La condición \`anterior IS NULL\` cubre la primera reproducción de cada oyente, que siempre abre una sesión porque no hay nada antes. A partir de ahí, contar sesiones es simplemente sumar esa bandera. Y si necesitas un identificador de sesión para agrupar los eventos de cada una, \`sum(inicia_sesion) OVER (PARTITION BY user_id ORDER BY played_at)\` va numerando las sesiones de cada persona: el número solo avanza cuando empieza una nueva.

El mismo patrón detecta cambios de estado: si el plan que devuelve \`lag(plan)\` es distinto del plan de la fila actual, esa fila marca un cambio de plan. Compáralos con \`IS DISTINCT FROM\` en lugar de \`<>\`, porque \`<>\` devuelve NULL cuando alguno de los dos valores es NULL y ese cambio quedaría sin detectar; \`IS DISTINCT FROM\` trata el NULL como un valor más y responde verdadero o falso siempre.

## FIRST_VALUE y LAST_VALUE

A veces no quieres la fila vecina sino un punto de referencia de toda la partición: el primer mes de la serie, el nivel actual, el precio inicial del cliente.

\`\`\`sql
first_value(reproducciones) OVER (PARTITION BY country ORDER BY mes) AS primer_mes
\`\`\`

\`FIRST_VALUE\` devuelve el primer valor de la partición, que es lo que uno espera. \`LAST_VALUE\` **no** devuelve el último, y esa es una de las trampas más frecuentes de SQL. Cuando la ventana tiene \`ORDER BY\` y no declaras un marco, el marco por omisión llega solo hasta la fila actual, así que \`last_value\` devuelve el valor de esa misma fila en lugar del último de la partición. Para obtener el último hay que abrir el marco hasta el final:

\`\`\`sql
last_value(reproducciones) OVER (
  PARTITION BY country
  ORDER BY mes
  ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
) AS ultimo_mes
\`\`\`

Hay una alternativa que muchos equipos prefieren por ser más explícita: \`first_value(...) OVER (PARTITION BY country ORDER BY mes DESC)\`, es decir, pedir el primer valor de la serie invertida. Devuelve exactamente lo mismo y no depende de recordar la regla del marco.

Con una referencia de ese tipo se arma un índice base 100, que expresa cada período como un porcentaje del período de referencia y permite comparar series de tamaños muy distintos: \`round(100.0 * reproducciones / ultimo_mes, 1)\`.

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
