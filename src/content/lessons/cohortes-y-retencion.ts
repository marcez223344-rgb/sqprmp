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

«¿Cuánta gente nos sigue usando?» parece una pregunta simple y no lo es. Este es el tema donde una consulta puede ejecutarse sin errores, devolver porcentajes creíbles y estar mal: el SQL funciona, pero la definición era otra. Antes de escribir nada tienes que poder responder tres preguntas en una frase cada una.

Trabajas con **Ritmo**, un servicio de streaming musical en seis mercados: \`users\` (oyentes, con \`signup_at\` y \`churned_at\`), \`plays\` (reproducciones) y \`subscriptions\` (períodos pagos con \`started_on\` y \`ended_on\`).

## Las tres decisiones

**1. ¿Qué agrupa a la cohorte?** Una cohorte es un conjunto de personas que comparten un evento de origen en un período. Lo habitual es el alta (\`signup_at\`), pero podría ser la primera compra o la primera suscripción. El evento de origen se fija una vez y **no cambia**: alguien de la cohorte de marzo de 2024 sigue siendo de marzo de 2024 para siempre.

**2. ¿Qué significa «retenido»?** Es una definición de negocio, no de SQL. En Ritmo puede ser «reprodujo al menos una canción», «reprodujo en al menos tres días distintos» o «tenía una suscripción paga vigente». Cada una da un número distinto y ninguna es la verdadera; la que no sirve es la que no está escrita en ninguna parte.

**3. ¿Con qué grano de tiempo?** Mes calendario, semana calendario, o ventanas relativas al alta de cada persona (días 1 a 30). No son lo mismo y se confunden seguido: volvemos sobre eso en la tercera lección.

## Asignar la cohorte

\`\`\`sql
SELECT
  date_trunc('month', signup_at AT TIME ZONE 'UTC')::date AS cohorte,
  count(*) AS usuarios
FROM users
GROUP BY 1
ORDER BY 1;
\`\`\`

Devuelve 21 filas, de \`2024-01-01\` a \`2025-09-01\`: el tamaño de cada cohorte, que será el **denominador** de todas las tasas que calcules después.

\`AT TIME ZONE 'UTC'\` no es decoración. \`signup_at\` es \`timestamptz\`; sin fijar el huso, \`date_trunc\` usa la zona de la sesión, y un alta del 1 de marzo a las 00:30 UTC cae en febrero para una sesión configurada en Bogotá. La cohorte de esa persona cambia según cómo esté configurado el servidor, no según el dato.

El sandbox fija la sesión en UTC a propósito, para que tus resultados sean reproducibles, así que aquí las dos versiones coinciden. En el trabajo no tienes esa garantía. Fija el huso **siempre** y escribe en el informe cuál usaste.

## El denominador no se filtra

El error más caro de esta sección es calcular la tasa sobre la gente que quedó en vez de sobre la cohorte completa. Un \`INNER JOIN\` con la tabla de actividad **elimina** en silencio a quienes nunca hicieron nada, que son justamente las personas que quieres contar como perdidas.

El patrón correcto arma primero la cohorte completa y recién después le pega la actividad:

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

\`count(*)\` cuenta filas: la cohorte entera. \`count(a.user_id)\` ignora los nulos que deja el \`LEFT JOIN\`: los retenidos. La diferencia entre ambos es la métrica. Con \`EXISTS\` en lugar del \`LEFT JOIN\` obtienes lo mismo y evitas duplicar filas si la tabla de actividad tuviera más de una fila por persona.

## Ventanas de observación

La cohorte de septiembre de 2025 lleva dos semanas de vida y los datos terminan el 15 de septiembre. Compararla contra la de enero de 2024 no mide retención: mide cuánto tiempo tuvo cada cohorte para actuar. Toda tabla de cohortes necesita una regla explícita sobre qué períodos están **completamente observados**; las cohortes que no llegan se excluyen o se marcan.

## Errores comunes

- Recalcular la cohorte con la fecha de actividad en vez de la del alta: la gente «cambia» de cohorte y las curvas se aplanan.
- \`INNER JOIN\` contra la actividad: desaparece el denominador real.
- No fijar el huso horario y dejar que el servidor decida el corte del calendario.
- Mezclar cohortes con ventanas de observación distintas en la misma comparación.

## Resumen

1. Una cohorte se define por un evento de origen fijo, una definición escrita de «retenido» y un grano de tiempo.
2. El denominador es la cohorte completa: ármala primero y agrega la actividad con \`LEFT JOIN\` o \`EXISTS\`.
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

La matriz de cohortes es ese triángulo de porcentajes que aparece en todo tablero de producto: una fila por cohorte, una columna por período de vida y el porcentaje de la cohorte que seguía activo. Se lee en dos direcciones y cada una responde una pregunta distinta del negocio.

## El índice de período

La clave es dejar de pensar en meses de calendario y pensar en **meses de vida**: el mes 0 es el mes de alta, el mes 1 el siguiente, y así. Ese número se calcula restando año y mes:

\`\`\`sql
(12 * (date_part('year', mes) - date_part('year', cohorte))
    + (date_part('month', mes) - date_part('month', cohorte)))::int AS mes_indice
\`\`\`

Restar las fechas directamente (\`mes - cohorte\`) daría **días**, no meses, y los meses no duran todos lo mismo. La resta por año y mes es exacta porque ambas fechas ya están truncadas al primer día del mes.

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

Tres pasos, tres CTE: quién pertenece a qué cohorte, cuánto mide cada cohorte y en qué meses estuvo activa cada persona. El \`DISTINCT\` de \`actividad\` es obligatorio: sin él contarías reproducciones, no personas, y la «retención» pasaría del 100 %.

Aquí el \`INNER JOIN\` con \`plays\` sí es correcto, porque solo genera las celdas que existen; el denominador viene de \`tamano\`, calculado antes sobre la cohorte completa. Las celdas sin actividad no aparecen: si tu informe las necesita en cero, hay que generarlas con \`generate_series\`.

## Cómo se lee

- **Hacia la derecha (una fila)**: la curva de vida de una cohorte. Casi siempre cae fuerte al principio y después se aplana; si nunca se aplana, no hay base estable de clientes.
- **Hacia abajo (una columna)**: el mismo momento de vida en cohortes distintas. Es la única forma honesta de saber si el producto mejoró: comparar el mes 1 de enero contra el mes 1 de julio.
- **La diagonal**: cohortes distintas en el mismo mes de calendario. Ahí se ven los efectos externos (una campaña, una caída del servicio, diciembre).

## El escalón del mes 0

En Ritmo, promediando las cohortes con seis meses completos, el mes 0 da 53,80 % y el mes 1, 75,33 %: la retención **sube**. No es un error de la consulta. Quien se registra el 28 de marzo tiene tres días de marzo y treinta de abril. El mes 0 siempre es parcial, y por eso muchas empresas publican la curva desde el mes 1 o usan ventanas relativas al alta (próxima lección). Lo importante es saber por qué pasa y decirlo.

## El triángulo incompleto

La cohorte de enero de 2024 tiene 21 columnas; la de agosto de 2025, dos. No es que su retención se derrumbe en el mes 3: es que el mes 3 todavía no ocurrió. Nunca promedies una columna sin exigir que todas las cohortes incluidas hayan vivido ese mes completo.

## Errores comunes

- Olvidar el \`DISTINCT\` y contar reproducciones en lugar de personas.
- Dividir por el total de usuarios del servicio en vez de por el tamaño de esa cohorte.
- Restar fechas para obtener el índice de mes y terminar con días.
- Promediar columnas del triángulo sin recortar a las cohortes completamente observadas.

## Resumen

1. \`mes_indice\` = diferencia en meses entre el mes de actividad y el mes de la cohorte, calculada por año y mes.
2. El numerador cuenta personas distintas; el denominador es el tamaño de la cohorte, calculado aparte.
3. Se lee a lo ancho (curva de vida), a lo alto (¿mejoramos?) y en diagonal (efectos del calendario), siempre respetando el triángulo observado.
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

La matriz mensual es cómoda, pero castiga a quien se registró un día 28. La alternativa es medir el tiempo **desde el alta de cada persona**: día 1 a día 30, día 31 a día 60. Del otro lado está el churn, que no es simplemente «100 menos la retención». Confundirlos produce informes que no cierran con finanzas.

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

Cada persona tiene su propia ventana: el límite se compara contra **su** \`signup_at\`, no contra una fecha fija. Como \`signup_at\` es \`timestamptz\` y el intervalo se suma al instante exacto, ese filtro no depende del huso de la sesión. Sí lo necesita la columna \`cohorte\`, que es un corte de calendario.

Dos detalles que definen la métrica:

- El límite superior es **abierto** (\`< signup_at + INTERVAL '31 days'\`). Con \`BETWEEN\` sobre marcas de tiempo siempre pierdes o duplicas un borde.
- El límite inferior en \`+ INTERVAL '1 day'\` excluye la primera sesión, la del alta. Si no la excluyes estás midiendo activación, no retención: casi todo el mundo reproduce algo el primer día.

Y el \`WHERE\` de la cohorte no es opcional: solo pueden entrar las personas cuya ventana de 30 días ya terminó dentro de los datos disponibles. Incluir a alguien que se registró anteayer garantiza una retención artificialmente baja.

## Tres definiciones que conviven

- **Clásica**: activo dentro de la ventana exacta, del día 1 al 30. Es la de arriba.
- **Por rango**: activo en cualquier momento entre el día 1 y el 30; se generaliza bien a reportes semanales («entre el día 1 y el 7»).
- **Ilimitada**: activo en el día 30 **o después**. Nunca baja con el tiempo y siempre da el número más alto; es la favorita de las presentaciones optimistas.

Ninguna miente. Mienten los informes que no dicen cuál usaron.

## Churn

Churn es la proporción de la base **que estaba viva al inicio del período** y se fue durante él. Su denominador no es la cohorte de alta: es la base activa al comienzo del mes.

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

El \`CROSS JOIN\` contra un calendario de meses, con \`FILTER\` para cada condición, es el patrón estándar: cada suscripción se evalúa contra cada mes y se cuenta donde corresponde. La tasa es \`bajas / activas_inicio\`, y conviene protegerla con \`nullif(..., 0)\` para el mes en que la base todavía está vacía.

Dos advertencias. \`ended_on IS NULL\` significa «vigente», no «terminó en NULL»: toda comparación con \`ended_on\` necesita su rama explícita de nulos. Y el churn de cuentas no es el churn de ingresos: si se van diez cuentas chicas y se queda una grande, el primero se dispara y el segundo casi no se mueve.

## Errores comunes

- Comparar contra una fecha fija en vez de contra el \`signup_at\` de cada persona.
- Usar \`BETWEEN\` sobre marcas de tiempo para acotar la ventana.
- Calcular churn sobre el total histórico de clientes en lugar de la base activa al inicio.
- Olvidar \`ended_on IS NULL\` y contar como bajas a las suscripciones vigentes, o al revés.

## Resumen

1. La retención a N días usa ventanas relativas al \`signup_at\` de cada persona, con límite superior abierto.
2. Declara qué definición usas y excluye a quienes no completaron la ventana.
3. Churn = bajas del período / base activa al inicio del período; no es el complemento de la retención por cohorte.
`,
  },
];
