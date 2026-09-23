import type { LessonDef } from "../schemas/curriculum";

const section = "funnels";

export const lessons: LessonDef[] = [
  {
    slug: "funnel-definicion-y-pasos",
    section,
    kind: "theory",
    title: "Qué es un funnel y cómo se definen sus pasos",
    sort_order: 0,
    estimated_minutes: 11,
    is_free: false,
    is_published: true,
    prerequisites: ["agregacion-condicional-tasas-y-proporciones"],
    dataset: "pidelo",
    body_md: `## Por qué importa

Cuando el negocio pregunta «¿dónde estamos perdiendo pedidos?», la respuesta no es un número: es una **secuencia**.

Un **funnel** (embudo) es una forma de medir un proceso por etapas: cuenta cuántas unidades llegan a cada paso y cuántas se caen entre un paso y el siguiente. Se llama embudo porque, como en un embudo, en cada etapa queda menos que en la anterior.

Sirve para que producto decida qué arreglar primero, operaciones detecte dónde se traba el proceso y marketing justifique su presupuesto: muestra en qué punto se pierde la gente.

Trabajas con **Pídelo**, una app de delivery que opera en ocho ciudades. Su tabla \`order_events\` guarda un evento por cada pedido y cada etapa por la que pasó: \`placed\` (hecho), \`accepted\` (aceptado por el restaurante), \`preparing\` (en preparación), \`picked_up\` (retirado por el repartidor), \`delivered\` (entregado) y \`cancelled\` (cancelado).

## Un funnel se define antes de escribirlo

Hay tres decisiones que van primero, y ninguna es técnica:

1. **La unidad**: ¿cuentas pedidos, usuarios o sesiones? Un usuario puede tener cinco pedidos, así que un funnel de pedidos y uno de usuarios dan números distintos y responden preguntas distintas.
2. **Los pasos y su orden**: qué eventos forman el embudo y cuál es la secuencia esperada. En Pídelo, \`cancelled\` no es un paso del funnel: es una salida del proceso, y mezclarlo con los demás rompe la lógica de que cada paso contiene al anterior.
3. **La ventana de observación**: qué período miras y en qué huso horario lo cortas.

Escribe esas tres decisiones en el propio informe. Si no lo haces, dos analistas que usen definiciones distintas van a producir dos funnels igualmente correctos y contradictorios, y nadie va a poder explicar la diferencia.

## Contar cada paso

Con una tabla de eventos, la forma más simple de armar el funnel es contar unidades distintas por evento y asignarle a cada evento su número de paso:

\`\`\`sql
SELECT
  CASE event
    WHEN 'placed' THEN 1
    WHEN 'accepted' THEN 2
    WHEN 'preparing' THEN 3
    WHEN 'picked_up' THEN 4
    WHEN 'delivered' THEN 5
  END AS paso,
  event AS etapa,
  count(DISTINCT order_id) AS pedidos
FROM order_events
WHERE event <> 'cancelled'
GROUP BY 1, 2
ORDER BY paso;
\`\`\`

Fíjate en que se usa \`count(DISTINCT order_id)\` y no \`count(*)\`. Si un pedido registrara dos veces el mismo evento, por un reintento del sistema o una corrección manual, \`count(*)\` lo contaría dos veces e inflaría ese paso. En Pídelo hay un solo evento por etapa y los dos conteos coinciden, pero tomar la costumbre te protege en las tablas que no están tan limpias.

El resultado es 14 437 → 13 843 → 13 573 → 13 434 → 13 284 pedidos.

## Las dos tasas de conversión

Un funnel se lee con **dos** porcentajes distintos, y conviene mostrar los dos:

- **Paso a paso**: qué fracción del paso anterior llegó al paso actual. Responde «¿dónde está la fuga más grande?».
- **Desde el inicio**, también llamada acumulada: qué fracción del primer paso llegó hasta aquí. Responde «¿cuánto llega al final del proceso?».

\`\`\`sql
SELECT
  paso,
  etapa,
  pedidos,
  round(100.0 * pedidos / lag(pedidos) OVER (ORDER BY paso), 2) AS pct_vs_anterior,
  round(100.0 * pedidos / first_value(pedidos) OVER (ORDER BY paso), 2) AS pct_vs_inicio
FROM por_paso
ORDER BY paso;
\`\`\`

La función \`lag()\` trae el valor de la fila anterior según el orden indicado, o sea el conteo del paso previo; \`first_value()\` trae el valor de la primera fila, o sea el conteo del primer paso.

En la primera fila, \`pct_vs_anterior\` queda en NULL porque no existe un paso anterior. Déjalo así: es correcto y es honesto. Reemplazarlo por 100 sugiere que hubo una conversión perfecta desde algo, cuando en realidad no hay nada antes.

El \`100.0\` tampoco es decorativo. Si divides dos números enteros, PostgreSQL hace división entera y \`pedidos / lag(pedidos)\` devuelve 0. Multiplicar por un literal con decimales obliga a que el cálculo se haga en \`numeric\` y conserve los decimales.

## Cuando no hay tabla de eventos

Muchos funnels no viven en una tabla de eventos, sino repartidos entre varias tablas de negocio. En **TiendaViva**, el recorrido de un pedido es \`orders\` → \`payments\` → \`shipments\` → \`returns\`, con una tabla por etapa.

El patrón en ese caso es construir primero una tabla de **hitos**: una fila por unidad, con el instante en que alcanzó cada etapa.

\`\`\`sql
SELECT
  o.id AS order_id,
  min(pay.paid_at) AS pagado_at,
  min(shp.shipped_at) AS enviado_at
FROM orders AS o
LEFT JOIN payments AS pay
  ON pay.order_id = o.id AND pay.status IN ('approved', 'refunded')
LEFT JOIN shipments AS shp ON shp.order_id = o.id
GROUP BY o.id
\`\`\`

Los \`LEFT JOIN\` son obligatorios aquí: con un \`INNER JOIN\` desaparecerían de la base del funnel los pedidos que nunca llegaron a pagarse, que son justamente los que quieres medir, y la tasa de conversión del primer paso daría 100 %.

Y el filtro por estado del pago va **en el \`ON\`** y no en el \`WHERE\`, por la misma razón: en el \`WHERE\` descartaría las filas sin pago y convertiría el \`LEFT JOIN\` en un \`INNER JOIN\` de hecho.

Sobre esa tabla de hitos, contar un paso es contar valores no nulos: \`count(pagado_at)\` ignora los NULL y devuelve la cantidad de pedidos que efectivamente se pagaron.

## Errores comunes

- Usar \`INNER JOIN\` y perder la base del embudo, con lo que todas las tasas quedan infladas.
- Filtrar el estado del hito en el \`WHERE\` en lugar del \`ON\`, que produce el mismo efecto.
- Usar \`count(*)\` donde hacía falta \`count(DISTINCT ...)\` y contar dos veces la misma unidad.
- Dividir dos enteros y obtener 0 por división entera.

## Resumen

1. Define la unidad, los pasos y la ventana antes de escribir SQL, y publícalas junto con el resultado.
2. Cuenta unidades distintas por paso; cuando el funnel vive en tablas de negocio, arma primero una fila por unidad con sus hitos.
3. Muestra las dos tasas de conversión: la de paso a paso y la acumulada desde el inicio.
`,
  },
  {
    slug: "funnel-orden-estricto-o-cualquier-orden",
    section,
    kind: "theory",
    title: "Orden estricto o cualquier orden: dos funnels honestos",
    sort_order: 1,
    estimated_minutes: 12,
    is_free: false,
    is_published: true,
    prerequisites: ["funnel-definicion-y-pasos"],
    dataset: "ritmo",
    body_md: `## Por qué importa

El funnel de la lección anterior cuenta, en cada paso, **cuántas unidades tienen ese hito**, sin comprobar en qué orden ocurrieron los hitos. Es una forma legítima de contar, pero no es la única, y la diferencia entre una y otra puede ser enorme.

En **Ritmo**, el servicio de streaming, el funnel de activación tiene cuatro pasos: alta → primera escucha → primera playlist → primera suscripción. Contado de las dos maneras da esto:

| Paso | Cualquier orden | Orden estricto |
| --- | --- | --- |
| Alta | 5000 | 5000 |
| Primera escucha | 4768 | 4768 |
| Primera playlist | 2010 | 2010 |
| Primera suscripción | 1225 | **135** |

Ninguna de las dos columnas tiene un error de cálculo. Están respondiendo dos preguntas distintas.

## Las dos definiciones

**Cualquier orden**, también llamado «alcanzó el paso»: la unidad hizo el evento del paso *k* en algún momento, sin importar cuándo. Se calcula contando los hitos que no son nulos.

> «1225 usuarios se suscribieron y además, en algún momento, habían creado una playlist.»

**Orden estricto**, también llamado secuencial: la unidad hizo todos los eventos hasta el paso *k* y cada uno **después** del anterior. Se calcula comparando las marcas de tiempo de cada hito.

> «135 usuarios siguieron el camino escuchar → armar playlist → suscribirse, en ese orden.»

Los otros 1090 usuarios se suscribieron **antes** de armar su primera playlist, así que la playlist no pudo haber influido en la suscripción. Para el equipo de marketing, que quiere saber si armar playlists empuja a suscribirse, la columna estricta es la única que sirve: la otra mezcla lo que ocurrió junto con lo que ocurrió por causa del paso anterior.

## Cómo se escribe cada una

El punto de partida es siempre una tabla de hitos, con una fila por usuario:

\`\`\`sql
WITH escuchas AS (
  SELECT user_id, min(played_at) AS primera_escucha_at FROM plays GROUP BY user_id
), listas AS (
  SELECT user_id, min(created_at) AS primera_playlist_at FROM playlists GROUP BY user_id
), hitos AS (
  SELECT u.id, u.signup_at, e.primera_escucha_at, l.primera_playlist_at
  FROM users AS u
  LEFT JOIN escuchas AS e ON e.user_id = u.id
  LEFT JOIN listas AS l ON l.user_id = u.id
)
SELECT
  count(primera_playlist_at) AS cualquier_orden,
  count(*) FILTER (
    WHERE primera_escucha_at > signup_at
      AND primera_playlist_at > primera_escucha_at
  ) AS orden_estricto
FROM hitos;
\`\`\`

Dos detalles deciden el número final:

- Se usa **\`min()\`** para quedarse con el *primer* hito de cada tipo. Con \`max()\` estarías midiendo la última vez que el usuario hizo esa acción, y alguien que armó una playlist en enero y otra en agosto podría pasar de cumplir la secuencia a no cumplirla según cuál de las dos fechas tomes.
- La condición del orden estricto es **encadenada**: cada paso exige que se hayan cumplido todos los anteriores. Si compararas solo el paso *k* con el *k−1*, dejarías pasar usuarios que se saltearon un paso intermedio.

## Comparar un date con un timestamptz

En Ritmo, la columna \`started_on\` de la tabla \`subscriptions\` es de tipo \`date\` (guarda solo el día) y la columna \`created_at\` de la tabla \`playlists\` es de tipo \`timestamptz\` (guarda el instante exacto).

Si las comparas directamente, PostgreSQL convierte la fecha a la medianoche de ese día **en el huso horario de la sesión**. En esta plataforma ese huso es UTC, fijado a propósito para que la tasa de conversión que obtengas sea siempre la misma; en un servidor configurado en otra zona, esa medianoche se corre varias horas y algunos usuarios que están justo en el borde cambian de lado.

La consecuencia es que el mismo informe daría números distintos según dónde se ejecute. No dejes esa decisión en manos de la configuración del servidor: convierte el instante a fecha fijando el huso de forma explícita.

\`\`\`sql
primera_suscripcion_on >= (primera_playlist_at AT TIME ZONE 'UTC')::date
\`\`\`

Y usa \`>=\` en lugar de \`>\`: cuando la comparación es a nivel de día, suscribirse el mismo día en que se creó la playlist sí cuenta como «después».

## Ventana de conversión

Una tercera variante muy usada agrega un límite de tiempo: «convirtió **dentro de los 30 días** desde el alta». Es la más exigente y la más útil para comparar cohortes entre sí, porque no premia a los usuarios más antiguos por el simple hecho de haber tenido más tiempo disponible para convertir.

\`\`\`sql
AND primera_playlist_at < signup_at + INTERVAL '30 days'
\`\`\`

Si decides no poner ninguna ventana, dilo de forma explícita en el informe: «sin límite de tiempo». Quien lo lea va a asumir alguna ventana, y va a asumir la que le convenga.

## Errores comunes

- Publicar el funnel de cualquier orden llamándolo «camino de conversión», que es lo que describe el estricto.
- Usar \`max()\` en lugar de \`min()\` para el hito de cada paso.
- Comparar una columna \`date\` con una \`timestamptz\` sin fijar el huso horario.
- Encadenar la condición solo con el paso anterior y no con todos los anteriores.

## Resumen

1. «Alcanzó el paso» y «lo alcanzó en orden» son dos métricas distintas; las dos son válidas y hay que declarar cuál estás publicando.
2. El orden estricto se calcula comparando los \`min()\` de cada hito y encadenando todas las condiciones.
3. Fija el huso horario al comparar fechas con marcas de tiempo, y declara si hay ventana de conversión.
`,
  },
  {
    slug: "funnel-abandono-y-tiempo-de-conversion",
    section,
    kind: "theory",
    title: "Abandono y tiempo hasta convertir",
    sort_order: 2,
    estimated_minutes: 11,
    is_free: false,
    is_published: true,
    prerequisites: ["funnel-orden-estricto-o-cualquier-orden"],
    dataset: "pidelo",
    body_md: `## Por qué importa

Un funnel te dice cuántas unidades llegan a cada paso. Hay dos preguntas más que convierten ese cuadro en un plan de acción: **dónde se queda cada unidad** y **cuánto tarda en avanzar**.

La primera te dice qué arreglar primero. La segunda detecta trabas que el conteo no muestra: un paso puede convertir al 99 % y aun así tardar cuarenta minutos, y ese tiempo de espera es exactamente lo que hace que el cliente no vuelva.

## El último paso alcanzado

El abandono no se deduce restando pasos consecutivos. Esa resta dice cuántas unidades se cayeron *entre* dos pasos, pero no clasifica a cada unidad en un solo grupo, y por eso no puedes sumar los grupos ni calcular porcentajes sobre el total.

Para lograrlo, asigna a cada unidad el número del paso más alto que alcanzó:

\`\`\`sql
WITH avance AS (
  SELECT
    order_id,
    max(CASE event
      WHEN 'placed' THEN 1
      WHEN 'accepted' THEN 2
      WHEN 'preparing' THEN 3
      WHEN 'picked_up' THEN 4
      WHEN 'delivered' THEN 5
      ELSE 0
    END) AS ultimo_paso
  FROM order_events
  GROUP BY order_id
)
SELECT
  ultimo_paso,
  count(*) AS pedidos,
  round(100.0 * count(*) / sum(count(*)) OVER (), 2) AS pct_del_total
FROM avance
GROUP BY ultimo_paso
ORDER BY ultimo_paso;
\`\`\`

En este resultado cada pedido aparece **exactamente una vez**: las categorías son excluyentes y las cantidades suman el total de pedidos. Un funnel común no tiene esa propiedad, porque un pedido entregado aparece contado en los cinco pasos.

Dos piezas de la consulta merecen explicación. El \`ELSE 0\` deja a \`cancelled\` fuera de la escala, para que un pedido cancelado no figure como si hubiera avanzado hasta alguna etapa. Y \`sum(count(*)) OVER ()\` es una agregación calculada sobre una ventana: primero el \`GROUP BY\` arma los grupos y después la ventana suma los conteos de todos ellos. Es la forma corta de obtener el gran total sin escribir una segunda consulta.

En Pídelo el resultado es claro: 594 pedidos, el 4,11 % del total, no pasan de \`placed\`. El problema está ahí, en el momento en que el restaurante debería aceptar el pedido, y no en el reparto.

## Tiempo hasta convertir

Sobre una tabla de hitos, el tiempo entre dos pasos es simplemente la resta de dos marcas de tiempo. El resultado de esa resta es un valor de tipo \`interval\`, que no se puede promediar ni graficar cómodamente, así que conviene convertirlo a minutos:

\`\`\`sql
extract(epoch FROM h.accepted_at - h.placed_at) / 60 AS minutos_hasta_aceptar
\`\`\`

\`extract(epoch FROM ...)\` devuelve la duración del intervalo en segundos; dividir por 60 da los minutos con decimales.

## Promedio o mediana

El promedio de una duración es casi siempre la métrica equivocada. Las duraciones tienen **cola larga**, es decir, la mayoría de los casos se concentra en valores bajos y unos pocos casos extremos se van muy lejos: un solo pedido que quedó trabado dos horas mueve el promedio de toda la ciudad y hace parecer lento un servicio que funciona bien.

La **mediana** —el valor que deja la mitad de los casos por debajo y la mitad por encima— describe mucho mejor la experiencia típica:

\`\`\`sql
percentile_cont(0.5) WITHIN GROUP (ORDER BY minutos) AS mediana
\`\`\`

\`percentile_cont\` es una **función de agregación ordenada**: necesita saber sobre qué orden calcular el percentil, y eso es lo que declara la cláusula \`WITHIN GROUP (ORDER BY ...)\`. Cambiando el parámetro obtienes otros percentiles: \`percentile_cont(0.9)\` da el percentil 90, que es la métrica con la que se escriben los acuerdos de nivel de servicio, del tipo «el 90 % de los pedidos se entrega en menos de X minutos».

Existe también \`percentile_disc\`, que devuelve un valor que está realmente presente en los datos en lugar de interpolar entre dos. Para duraciones, \`percentile_cont\` suele ser lo que quieres; para valores que tienen que existir de verdad, como un identificador o un precio de lista, usa \`percentile_disc\`.

## El sesgo de supervivencia

Aquí está la trampa principal de esta lección. Si calculas el tiempo de entrega solo sobre los pedidos entregados —y no queda alternativa, porque los demás no tienen fecha en \`delivered_at\`—, estás midiendo únicamente a los que llegaron. Los pedidos que quedaron trabados o se cancelaron, que son precisamente los más lentos, no entran en el cálculo.

La consecuencia es concreta: el número te va a dar mejor que la realidad, y cuanto peor funcione el servicio, mejor se va a ver la métrica, porque más pedidos lentos quedan afuera.

Esto no lo resuelve el SQL, lo resuelve la nota al pie. Publica el tiempo **junto con** la tasa de conversión de ese paso. «Mediana de 37 minutos sobre el 92 % de pedidos que se entregaron» es una afirmación honesta; «mediana de 37 minutos», sola, no lo es.

## Errores comunes

- Deducir el abandono restando pasos consecutivos en lugar de clasificar cada unidad por el último paso que alcanzó.
- Publicar el promedio de una duración que tiene cola larga.
- Restar el \`max()\` de cada hito en lugar del \`min()\` y terminar midiendo de más.
- Informar el tiempo de conversión sin la tasa de conversión que lo acompaña.

## Resumen

1. El último paso alcanzado clasifica cada unidad una sola vez y suma el total: es el cuadro que permite priorizar el trabajo.
2. La duración se calcula con \`extract(epoch FROM fin - inicio) / 60\` y se resume con la mediana o el percentil 90, nunca con el promedio.
3. Todo tiempo de conversión se publica junto a la tasa de conversión de ese paso, porque solo se mide a los que llegaron.
`,
  },
];
