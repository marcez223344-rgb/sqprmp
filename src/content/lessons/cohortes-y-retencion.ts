import type { LessonDef } from "../schemas/curriculum";

const section = "cohortes-y-retencion";

export const lessons: LessonDef[] = [
  {
    slug: "definir-una-cohorte",
    section,
    kind: "theory",
    title: "Qué define una cohorte",
    sort_order: 0,
    estimated_minutes: 12,
    is_free: false,
    is_published: true,
    prerequisites: ["promedios-moviles"],
    dataset: "ritmo",
    body_md: `## Por qué importa

«¿Cuánta gente nos sigue usando?» parece una pregunta simple y no lo es. Este es el tema donde una consulta puede ejecutarse sin ningún error, devolver porcentajes creíbles y estar mal igual, porque el SQL funciona pero la definición que mide no es la que el negocio pedía. Antes de escribir la primera línea tienes que poder responder tres preguntas, cada una en una frase.

Trabajas con **Ritmo**, un servicio de streaming musical presente en seis mercados. Vas a usar tres tablas: \`users\` (los oyentes, con \`signup_at\`, el instante del alta, y \`churned_at\`, el de la baja), \`plays\` (una fila por reproducción) y \`subscriptions\` (los períodos pagos, con \`started_on\` y \`ended_on\`).

## Las tres decisiones

**1. ¿Qué agrupa a la cohorte?** Una **cohorte** es un conjunto de personas que comparten un mismo evento de origen ocurrido en un mismo período, por ejemplo todas las que se registraron en marzo de 2024. Lo habitual es usar el alta (\`signup_at\`), pero podría ser la primera compra o la primera suscripción. El evento de origen se fija una sola vez y **no cambia nunca**: quien pertenece a la cohorte de marzo de 2024 sigue perteneciendo a ella para siempre, haga lo que haga después.

**2. ¿Qué significa «retenido»?** Es una definición de negocio, no una función de SQL. En Ritmo puede ser «reprodujo al menos una canción», «reprodujo en al menos tres días distintos» o «tenía una suscripción paga vigente». Cada una devuelve un número distinto y ninguna es más verdadera que las otras. El problema aparece cuando la definición usada no está escrita en ninguna parte, porque entonces dos informes dan cifras diferentes y nadie puede explicar por qué.

**3. ¿Con qué grano de tiempo?** Puede ser el mes calendario, la semana calendario o una ventana relativa al alta de cada persona (los días 1 a 30 contados desde su propio registro). No son lo mismo y se confunden con frecuencia; volvemos sobre eso en la tercera lección.

## Asignar la cohorte

\`\`\`sql
SELECT
  date_trunc('month', signup_at AT TIME ZONE 'UTC')::date AS cohorte,
  count(*) AS usuarios
FROM users
GROUP BY 1
ORDER BY 1;
\`\`\`

Devuelve 21 filas, de \`2024-01-01\` a \`2025-09-01\`, con el tamaño de cada cohorte. Ese tamaño es el **denominador** de todas las tasas de retención que calcules después.

\`AT TIME ZONE 'UTC'\` no es decoración. \`signup_at\` es de tipo \`timestamptz\`, es decir, guarda un instante absoluto. Si no fijas el huso horario, \`date_trunc\` corta el calendario según la zona configurada en la sesión, y un alta del 1 de marzo a las 00:30 UTC cae en febrero para una sesión configurada en Bogotá. Dicho de otro modo: la cohorte de esa persona cambiaría según cómo esté configurado el servidor, no según lo que dice el dato.

El simulador fija la sesión en UTC justamente para que tus resultados sean reproducibles, así que aquí las dos versiones coinciden. En el trabajo no tienes esa garantía. Fija el huso **siempre** y escribe en el informe cuál usaste.

## El denominador no se filtra

El error más caro de esta sección es calcular la tasa sobre la gente que quedó en lugar de sobre la cohorte completa. Un \`INNER JOIN\` con la tabla de actividad **elimina** en silencio a quienes nunca hicieron nada, y esas personas son precisamente las que tienes que contar como perdidas. El resultado es una retención que parece altísima y que no mide nada.

El patrón correcto arma primero la cohorte completa y recién después le agrega la actividad:

\`\`\`sql
WITH cohortes AS (
  SELECT id, date_trunc('month', signup_at AT TIME ZONE 'UTC')::date AS cohorte
  FROM users
),
activos AS (
  SELECT DISTINCT user_id FROM plays
)
SELECT
  c.cohorte,
  count(*) AS usuarios,
  count(a.user_id) AS con_actividad
FROM cohortes AS c
LEFT JOIN activos AS a ON a.user_id = c.id
GROUP BY 1
ORDER BY 1;
\`\`\`

\`count(*)\` cuenta filas, y como el \`LEFT JOIN\` conserva a todos, ese número es la cohorte entera. \`count(a.user_id)\` cuenta solo los valores que no son nulos, así que ignora a las personas sin actividad y devuelve los retenidos. La diferencia entre ambos números es la métrica que te pidieron.

Con \`EXISTS\` en lugar del \`LEFT JOIN\` obtienes lo mismo, y además te proteges de duplicar filas si la tabla de actividad tuviera más de una fila por persona.

## Ventanas de observación

La cohorte de septiembre de 2025 lleva dos semanas de vida y los datos terminan el 15 de septiembre. Compararla contra la de enero de 2024 no mide la retención del producto: mide cuánto tiempo tuvo cada cohorte para actuar, y la más nueva siempre va a salir peor.

Por eso toda tabla de cohortes necesita una regla explícita sobre qué períodos están **completamente observados**. Las cohortes que no alcanzan a cubrir el período se excluyen del cálculo o se marcan en el reporte como incompletas.

## Errores comunes

- Recalcular la cohorte usando la fecha de actividad en lugar de la del alta. Las personas «cambian» de cohorte cada vez que usan el producto y las curvas se aplanan artificialmente.
- Usar \`INNER JOIN\` contra la actividad: desaparece el denominador real.
- No fijar el huso horario y dejar que la configuración del servidor decida dónde corta el calendario.
- Mezclar en una misma comparación cohortes con ventanas de observación distintas.

## Resumen

1. Una cohorte se define por un evento de origen fijo, una definición escrita de «retenido» y un grano de tiempo.
2. El denominador es la cohorte completa: ármala primero y agrégale la actividad con \`LEFT JOIN\` o \`EXISTS\`.
3. Fija el huso con \`AT TIME ZONE 'UTC'\` y excluye los períodos que todavía no terminaron de observarse.
`,
  },
  {
    slug: "matriz-de-retencion",
    section,
    kind: "theory",
    title: "La matriz de retención",
    sort_order: 1,
    estimated_minutes: 13,
    is_free: false,
    is_published: true,
    prerequisites: ["definir-una-cohorte"],
    dataset: "ritmo",
    body_md: `## Por qué importa

La matriz de cohortes es ese triángulo de porcentajes que aparece en todo tablero de producto: una fila por cohorte, una columna por período de vida y, en cada celda, el porcentaje de esa cohorte que seguía activo en ese período. Se lee en dos direcciones y cada una responde una pregunta distinta del negocio.

## El índice de período

La clave está en dejar de pensar en meses de calendario y pensar en **meses de vida** de cada cohorte: el mes 0 es el mes en que esas personas se dieron de alta, el mes 1 es el siguiente y así sucesivamente. Ese número se calcula restando el año y el mes por separado:

\`\`\`sql
(12 * (date_part('year', mes) - date_part('year', cohorte))
    + (date_part('month', mes) - date_part('month', cohorte)))::int AS mes_indice
\`\`\`

Restar las dos fechas directamente (\`mes - cohorte\`) daría una cantidad de **días**, no de meses, y como los meses no duran todos lo mismo no podrías dividir ese número para convertirlo. La resta por año y por mes es exacta porque ambas fechas ya están truncadas al primer día de su mes.

## La consulta completa

\`\`\`sql
WITH cohortes AS (
  SELECT id, date_trunc('month', signup_at AT TIME ZONE 'UTC')::date AS cohorte
  FROM users
),
tamano AS (
  SELECT cohorte, count(*) AS usuarios_cohorte FROM cohortes GROUP BY 1
),
actividad AS (
  SELECT DISTINCT
    c.cohorte,
    c.id,
    date_trunc('month', p.played_at AT TIME ZONE 'UTC')::date AS mes
  FROM cohortes AS c
  INNER JOIN plays AS p ON p.user_id = c.id
)
SELECT
  a.cohorte,
  (12 * (date_part('year', a.mes) - date_part('year', a.cohorte))
      + (date_part('month', a.mes) - date_part('month', a.cohorte)))::int AS mes_indice,
  t.usuarios_cohorte,
  count(*) AS usuarios_activos,
  round(100.0 * count(*) / t.usuarios_cohorte, 2) AS retencion_pct
FROM actividad AS a
INNER JOIN tamano AS t ON t.cohorte = a.cohorte
GROUP BY a.cohorte, 2, t.usuarios_cohorte
ORDER BY a.cohorte, 2;
\`\`\`

Son tres pasos, uno por cada CTE (por *common table expression*, la consulta con nombre que se define en el \`WITH\`): quién pertenece a qué cohorte, cuántas personas tiene cada cohorte y en qué meses estuvo activa cada persona.

El \`DISTINCT\` de la CTE \`actividad\` es obligatorio. Sin él, una persona que reprodujo cuarenta canciones en marzo aportaría cuarenta filas, el numerador contaría reproducciones en lugar de personas y la «retención» superaría el 100 %.

Aquí el \`INNER JOIN\` con \`plays\` sí es correcto, porque solo se usa para generar las celdas que existen. El denominador no sale de ese join: viene de la CTE \`tamano\`, calculada antes sobre la cohorte completa. Las celdas sin ninguna actividad no aparecen en el resultado, así que si tu informe necesita mostrarlas en cero hay que generarlas aparte con \`generate_series\`.

## Cómo se lee

- **Hacia la derecha, siguiendo una fila**: la curva de vida de una cohorte. Casi siempre cae fuerte en los primeros períodos y después se aplana. Si nunca se aplana, significa que el producto no tiene una base estable de clientes.
- **Hacia abajo, siguiendo una columna**: el mismo momento de vida en cohortes distintas. Es la forma honesta de saber si el producto mejoró, porque compara el mes 1 de enero contra el mes 1 de julio, dos períodos equivalentes.
- **En diagonal**: cohortes distintas atravesando el mismo mes de calendario. Ahí se ven los efectos externos, como una campaña, una caída del servicio o el efecto de diciembre.

## El escalón del mes 0

En Ritmo, promediando las cohortes de enero de 2024 a marzo de 2025, que son las que ya vivieron seis meses completos, el mes 0 da 53,40 % y el mes 1 da 74,77 %: la retención **sube** en lugar de bajar. No es un error de la consulta. Quien se registra el 28 de marzo tiene solo tres días de marzo para reproducir algo, y treinta días completos de abril. El mes 0 siempre es un mes parcial y por eso queda artificialmente bajo.

Muchas empresas resuelven esto publicando la curva desde el mes 1, o usando ventanas relativas al alta de cada persona, que es el tema de la próxima lección. Lo importante es entender por qué ocurre y dejarlo dicho en el reporte.

## El triángulo incompleto

La cohorte de enero de 2024 tiene 21 columnas y la de agosto de 2025 tiene dos. Eso no significa que la retención de la cohorte de agosto se derrumbe en el mes 3: significa que para esa cohorte el mes 3 todavía no ocurrió. Nunca promedies una columna sin exigir antes que todas las cohortes incluidas hayan vivido ese mes completo.

## Errores comunes

- Olvidar el \`DISTINCT\` y terminar contando reproducciones en lugar de personas.
- Dividir por el total de usuarios del servicio en lugar de por el tamaño de esa cohorte.
- Restar fechas para obtener el índice de mes y terminar con una cantidad de días.
- Promediar columnas del triángulo sin recortar el cálculo a las cohortes completamente observadas.

## Resumen

1. \`mes_indice\` es la diferencia en meses entre el mes de actividad y el mes de la cohorte, calculada por año y por mes.
2. El numerador cuenta personas distintas y el denominador es el tamaño de la cohorte, calculado aparte.
3. La matriz se lee a lo ancho (curva de vida), a lo alto (si mejoramos) y en diagonal (efectos del calendario), siempre dentro del triángulo observado.
`,
  },
  {
    slug: "retencion-n-dias-y-churn",
    section,
    kind: "theory",
    title: "Retención a N días y churn",
    sort_order: 2,
    estimated_minutes: 12,
    is_free: false,
    is_published: true,
    prerequisites: ["matriz-de-retencion"],
    dataset: "ritmo",
    body_md: `## Por qué importa

La matriz mensual es cómoda de armar, pero castiga a quien se registró un día 28, porque le da apenas dos días de vida en su mes 0. La alternativa es medir el tiempo **desde el alta de cada persona**: del día 1 al día 30, del día 31 al día 60.

Del otro lado de la misma moneda está el **churn**, la proporción de clientes que se dan de baja en un período. No es simplemente «100 menos la retención», porque se calcula sobre otro denominador, y confundirlos produce informes que no cierran con los números de finanzas.

## Ventanas relativas al alta

\`\`\`sql
WITH cohortes AS (
  SELECT id, signup_at,
         date_trunc('month', signup_at AT TIME ZONE 'UTC')::date AS cohorte
  FROM users
  WHERE signup_at < timestamptz '2025-08-01 00:00:00+00'
),
retenidos AS (
  SELECT DISTINCT c.id
  FROM cohortes AS c
  INNER JOIN plays AS p ON p.user_id = c.id
  WHERE p.played_at >= c.signup_at + INTERVAL '1 day'
    AND p.played_at <  c.signup_at + INTERVAL '31 days'
)
SELECT
  c.cohorte,
  count(*) AS usuarios,
  count(r.id) AS retenidos_30d,
  round(100.0 * count(r.id) / count(*), 2) AS retencion_30d_pct
FROM cohortes AS c
LEFT JOIN retenidos AS r ON r.id = c.id
GROUP BY 1
ORDER BY 1;
\`\`\`

Cada persona tiene su propia ventana de 30 días, porque el límite se compara contra **su** \`signup_at\` y no contra una fecha fija del calendario. Como \`signup_at\` es de tipo \`timestamptz\` y el intervalo se suma a ese instante exacto, ese filtro no depende del huso de la sesión. La que sí lo necesita es la columna \`cohorte\`, porque ahí sí estás cortando un calendario.

Dos detalles definen la métrica:

- El límite superior es **abierto** (\`< signup_at + INTERVAL '31 days'\`), es decir, excluye el instante final. Con \`BETWEEN\` sobre marcas de tiempo siempre terminas perdiendo o duplicando un borde.
- El límite inferior en \`+ INTERVAL '1 day'\` excluye la primera sesión, la del día del alta. Si no la excluyes estás midiendo activación y no retención, porque casi todo el mundo reproduce algo el mismo día en que se registra y el número sale cerca del 100 %.

El \`WHERE\` de la cohorte tampoco es opcional: solo pueden entrar las personas cuya ventana de 30 días ya terminó dentro de los datos disponibles. Incluir a alguien que se registró anteayer garantiza una retención artificialmente baja, porque todavía le quedan 28 días para reproducir algo.

## Tres definiciones que conviven

- **Clásica**: activo dentro de la ventana exacta, del día 1 al día 30. Es la de la consulta de arriba.
- **Por rango**: activo en cualquier momento entre el día 1 y el 30. Se generaliza bien a reportes semanales, como «entre el día 1 y el 7».
- **Ilimitada**: activo en el día 30 **o en cualquier momento posterior**. Nunca baja con el paso del tiempo y siempre da el número más alto de las tres, por eso es la preferida de las presentaciones optimistas.

Las tres son definiciones legítimas. El problema no está en cuál elijas, sino en publicar un número sin decir cuál usaste.

## Churn

El churn es la proporción de la base **que estaba viva al inicio del período** y se dio de baja durante ese período. Su denominador no es la cohorte de alta: es la cantidad de suscripciones activas al comienzo del mes.

\`\`\`sql
SELECT
  m.mes,
  count(*) FILTER (
    WHERE s.started_on < m.mes AND (s.ended_on IS NULL OR s.ended_on >= m.mes)
  ) AS activas_inicio,
  count(*) FILTER (
    WHERE s.ended_on >= m.mes AND s.ended_on < (m.mes + INTERVAL '1 month')::date
  ) AS bajas
FROM meses AS m
CROSS JOIN subscriptions AS s
GROUP BY m.mes
ORDER BY m.mes;
\`\`\`

El \`CROSS JOIN\` contra un calendario de meses combina cada suscripción con cada mes, y el \`FILTER\` de cada conteo decide en qué meses esa suscripción cuenta como activa y en cuál cuenta como baja. Es el patrón estándar para este cálculo. La tasa de churn es \`bajas / activas_inicio\`, y conviene envolver el divisor en \`nullif(..., 0)\` para el primer mes, cuando la base todavía está vacía y la división daría error.

Dos advertencias. La primera: \`ended_on IS NULL\` significa «la suscripción sigue vigente», no «terminó en una fecha desconocida», así que toda comparación con \`ended_on\` necesita su rama explícita para los nulos. La segunda: el churn de cuentas no es el churn de ingresos. Si en un mes se van diez cuentas chicas y se queda la más grande, el churn de cuentas se dispara y el de ingresos casi no se mueve; son dos métricas distintas y hay que decir cuál estás informando.

## Errores comunes

- Comparar contra una fecha fija del calendario en lugar del \`signup_at\` de cada persona.
- Usar \`BETWEEN\` sobre marcas de tiempo para acotar la ventana y quedarte con un borde de más o de menos.
- Calcular el churn sobre el total histórico de clientes en lugar de la base activa al inicio del período.
- Olvidar la rama \`ended_on IS NULL\` y contar como bajas a las suscripciones vigentes, o al revés.

## Resumen

1. La retención a N días usa ventanas relativas al \`signup_at\` de cada persona, con el límite superior abierto.
2. Declara qué definición estás usando y excluye a quienes todavía no completaron la ventana.
3. Churn = bajas del período dividido por la base activa al inicio del período, y no es el complemento de la retención por cohorte.

## Próximos pasos

**Lo que ya puedes hacer:** Sabes definir cohortes, es decir, grupos de usuarios según su mes de alta, y medir cuántos siguen activos y cuántos abandonan.

**Antes de seguir:** resuelve los ejercicios y el quiz de esta sección.

**Lo que sigue:** Sección 30 · Análisis de funnels. Vas a medir, con un embudo de conversión (_funnel_), cuántos usuarios completan cada paso.

**Para practicar (opcional):** ¿Qué parte de cada cohorte mensual de clientes de Pídelo pidió algo el mes siguiente? Toma la cohorte de \`signup_at\` en \`customers\` y la actividad de \`placed_at\` en \`orders\`.
`,
  },
];
