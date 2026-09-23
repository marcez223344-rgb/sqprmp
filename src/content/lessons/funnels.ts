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

Cuando el negocio pregunta «¿dónde estamos perdiendo pedidos?», la respuesta casi nunca es un número: es una **secuencia**. Un funnel (embudo) mide cuántas unidades llegan a cada paso de un proceso y cuántas se caen entre paso y paso. Es la herramienta con la que Producto prioriza, Operaciones detecta cuellos de botella y Marketing justifica presupuesto.

Trabajas con **Pídelo**, una app de delivery en ocho ciudades. La tabla \`order_events\` guarda un evento por pedido y por etapa: \`placed\`, \`accepted\`, \`preparing\`, \`picked_up\`, \`delivered\` y \`cancelled\`.

## Un funnel se define antes de escribirlo

Tres decisiones van primero, y ninguna es técnica:

1. **La unidad**: ¿cuentas pedidos, usuarios o sesiones? Un usuario puede tener cinco pedidos; un funnel de pedidos y uno de usuarios dan números distintos y responden preguntas distintas.
2. **Los pasos y su orden**: qué eventos forman el embudo y cuál es la secuencia esperada. \`cancelled\` no es un paso del funnel de Pídelo: es una salida.
3. **La ventana de observación**: qué período miras y en qué huso horario lo cortas.

Escribe esas tres decisiones en el propio informe. Dos analistas con definiciones distintas producirán dos funnels correctos y contradictorios.

## Contar cada paso

Con una tabla de eventos, el paso más simple es contar unidades distintas por evento y asignarle a cada evento su posición:

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

\`count(DISTINCT order_id)\` y no \`count(*)\`: si un pedido registrara dos veces el mismo evento (un reintento, una corrección), \`count(*)\` lo contaría dos veces e inflaría el paso. En Pídelo hay un solo evento por etapa y ambos coinciden, pero la costumbre te salva en las tablas que no están tan limpias.

El resultado es 14 437 → 13 843 → 13 573 → 13 434 → 13 284.

## Las dos tasas de conversión

Un funnel se lee con **dos** porcentajes y conviene mostrar ambos:

- **Paso a paso**: qué fracción del paso anterior llegó al actual. Responde «¿dónde está la fuga?».
- **Desde el inicio** (acumulada): qué fracción del primer paso llegó hasta aquí. Responde «¿cuánto llega al final?».

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

\`lag()\` trae el valor del paso anterior; \`first_value()\` trae el del primer paso. La primera fila tiene \`pct_vs_anterior\` en NULL, porque no hay paso anterior: es correcto y honesto dejarlo así, no reemplazarlo por 100.

El \`100.0\` no es decorativo. Con dos enteros, \`pedidos / lag(pedidos)\` hace división entera y devuelve 0. Multiplicar por un literal con decimales fuerza el cálculo en \`numeric\`.

## Cuando no hay tabla de eventos

Muchos funnels no viven en una tabla de eventos sino repartidos en varias tablas de negocio: en **TiendaViva**, \`orders\` → \`payments\` → \`shipments\` → \`returns\`. El patrón es construir primero una fila por unidad con el instante de cada hito:

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

Los \`LEFT JOIN\` son obligatorios: un \`INNER JOIN\` borraría de la base del funnel a los pedidos que nunca pagaron, que son justamente los que quieres medir. Y el filtro del estado va **en el \`ON\`**, no en el \`WHERE\`: en el \`WHERE\` convertiría el \`LEFT JOIN\` en un \`INNER JOIN\` de hecho.

Sobre esa tabla de hitos, contar un paso es contar valores no nulos: \`count(pagado_at)\` ignora los NULL.

## Errores comunes

- Usar \`INNER JOIN\` y perder la base del embudo.
- Filtrar el estado del hito en el \`WHERE\` en vez del \`ON\`.
- \`count(*)\` donde hacía falta \`count(DISTINCT ...)\`.
- División entera: \`pedidos / total\` devuelve 0.

## Resumen

1. Define unidad, pasos y ventana antes de escribir SQL, y publícalas con el resultado.
2. Cuenta unidades distintas por paso; con tablas de negocio, arma primero una fila por unidad con los hitos.
3. Muestra las dos tasas: paso a paso y desde el inicio.
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

El funnel de la lección anterior cuenta, en cada paso, **cuántas unidades tienen ese hito**. No comprueba en qué orden ocurrieron. Esa es una forma legítima de contar, pero no es la única, y la diferencia entre ambas puede ser enorme.

En **Ritmo**, el servicio de streaming, el funnel de activación es: alta → primera escucha → primera playlist → primera suscripción. Contado de las dos maneras da esto:

| Paso | Cualquier orden | Orden estricto |
| --- | --- | --- |
| Alta | 5000 | 5000 |
| Primera escucha | 4768 | 4768 |
| Primera playlist | 2010 | 2010 |
| Primera suscripción | 1225 | **135** |

No hay error en ninguna columna. Son dos preguntas distintas.

## Las dos definiciones

**Cualquier orden** (también «alcanzó el paso»): la unidad hizo el evento del paso *k*, sin importar cuándo. Se implementa contando hitos no nulos.

> «1225 usuarios se suscribieron y además habían creado una playlist.»

**Orden estricto** (o «secuencial»): la unidad hizo todos los eventos hasta el paso *k* y cada uno **después** del anterior. Se implementa comparando marcas de tiempo.

> «135 usuarios siguieron el camino escuchar → armar playlist → suscribirse, en ese orden.»

Los otros 1090 se suscribieron **antes** de armar su primera playlist. Para Marketing, que quiere saber si armar playlists empuja a suscribirse, la columna estricta es la única relevante: la otra confunde coincidencia con secuencia.

## Cómo se escribe cada una

Partimos siempre de una tabla de hitos, una fila por usuario:

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

Dos detalles que deciden el número:

- Se usa **\`min()\`**: el *primer* hito de cada tipo. Con \`max()\` medirías la última vez que el usuario hizo algo, y alguien que armó una playlist en enero y otra en agosto cambiaría de lado.
- La condición estricta es **encadenada**: cada paso exige todos los anteriores. Comparar solo el paso *k* con el *k−1* dejaría pasar caminos que se saltaron un paso.

## Comparar un date con un timestamptz

En Ritmo, \`subscriptions.started_on\` es \`date\` y \`playlists.created_at\` es \`timestamptz\`. Comparar los dos directamente hace que Postgres convierta la fecha a medianoche **en el huso de la sesión**. Aquí ese huso es UTC —el sandbox lo fija para que la tasa de conversión que obtengas sea reproducible—, pero en un servidor configurado en otra zona esa medianoche se corre y algunos usuarios del borde cruzan de lado. No dejes la decisión en manos de la configuración: baja el timestamp a fecha fijando el huso.

\`\`\`sql
primera_suscripcion_on >= (primera_playlist_at AT TIME ZONE 'UTC')::date
\`\`\`

Y usa \`>=\`, no \`>\`: con granularidad de día, suscribirse el mismo día en que creaste la playlist sí cuenta como «después».

## Ventana de conversión

Una tercera variante frecuente agrega un límite de tiempo: «convirtió **dentro de los 30 días**». Es la más exigente y la más útil para comparar cohortes, porque no premia a los usuarios antiguos por haber tenido más tiempo.

\`\`\`sql
AND primera_playlist_at < signup_at + INTERVAL '30 days'
\`\`\`

Si no pones ventana, di explícitamente «sin límite de tiempo»: quien lea el informe asumirá lo que le convenga.

## Errores comunes

- Publicar el funnel de cualquier orden llamándolo «camino de conversión».
- Usar \`max()\` en vez de \`min()\` para el hito de cada paso.
- Comparar \`date\` con \`timestamptz\` sin fijar el huso.
- Encadenar solo con el paso anterior y no con todos los anteriores.

## Resumen

1. «Alcanzó el paso» y «lo alcanzó en orden» son dos métricas distintas; ambas son válidas y hay que decir cuál publicas.
2. El orden estricto se implementa comparando los \`min()\` de cada hito y encadenando todas las condiciones.
3. Fija el huso al comparar fechas con marcas de tiempo, y declara si hay ventana de conversión.
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

Un funnel te dice cuántos llegan a cada paso. Dos preguntas más convierten ese cuadro en un plan de acción: **dónde se cae cada unidad** y **cuánto tarda en avanzar**. La primera prioriza el trabajo; la segunda detecta cuellos de botella que el conteo no muestra, porque un paso puede convertir al 99 % y aun así tardar cuarenta minutos.

## El último paso alcanzado

El abandono no se deduce restando pasos consecutivos: esa resta dice cuántos se cayeron *entre* dos pasos, pero no clasifica a cada unidad. Para eso, asigna a cada unidad el número del paso más alto que alcanzó:

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

Cada pedido aparece **exactamente una vez**: las categorías son excluyentes y las cantidades suman el total. Un funnel normal no tiene esa propiedad, porque un pedido entregado aparece en los cinco pasos.

El \`ELSE 0\` mapea \`cancelled\` fuera de la escala para que un pedido cancelado no parezca haber avanzado. Y \`sum(count(*)) OVER ()\` es una agregación dentro de una ventana: primero se agrupa, después la ventana suma todos los grupos. Es la forma corta de obtener el gran total sin una segunda consulta.

En Pídelo el resultado es claro: 594 pedidos (4,11 %) no pasan de \`placed\`. Ahí, y no en el reparto, está el problema.

## Tiempo hasta convertir

Con una tabla de hitos, el tiempo entre dos pasos es una resta de marcas de tiempo. El resultado es un \`interval\`; para promediar o graficar conviene pasarlo a minutos:

\`\`\`sql
extract(epoch FROM h.accepted_at - h.placed_at) / 60 AS minutos_hasta_aceptar
\`\`\`

\`extract(epoch FROM ...)\` devuelve segundos; dividir por 60 da minutos con decimales.

## Promedio o mediana

El promedio de una duración es casi siempre la métrica equivocada. Las duraciones tienen cola larga: un pedido que quedó dos horas trabado mueve el promedio de toda la ciudad. La **mediana** describe la experiencia típica:

\`\`\`sql
percentile_cont(0.5) WITHIN GROUP (ORDER BY minutos) AS mediana
\`\`\`

\`percentile_cont\` es una **función de agregación ordenada**: la lista dentro de \`WITHIN GROUP\` define sobre qué se calcula el percentil. \`percentile_cont(0.9)\` da el percentil 90, la métrica con la que se escriben los acuerdos de nivel de servicio: «el 90 % de los pedidos se entrega en menos de X minutos».

Existe también \`percentile_disc\`, que devuelve un valor realmente presente en los datos en vez de interpolar. Para duraciones, \`percentile_cont\` suele ser lo que quieres; para valores que deben existir (un identificador, un precio de lista), \`percentile_disc\`.

## El sesgo de supervivencia

Aquí está la trampa principal. Si calculas el tiempo de entrega solo sobre los pedidos entregados —y no queda alternativa, porque los demás no tienen \`delivered_at\`—, estás midiendo a los que llegaron. Los pedidos trabados o cancelados, que son los lentos, no entran. El número saldrá mejor que la realidad.

No lo resuelve el SQL: lo resuelve la nota al pie. Publica el tiempo **junto con** la tasa de conversión del paso. «Mediana de 37 minutos sobre el 92 % de pedidos entregados» es una afirmación honesta; «mediana de 37 minutos» sola, no.

## Errores comunes

- Deducir el abandono restando pasos en lugar de clasificar por último paso alcanzado.
- Publicar el promedio de una duración con cola larga.
- Restar \`max()\` en vez de \`min()\` de cada hito y medir de más.
- Informar el tiempo de conversión sin la tasa de conversión que lo acompaña.

## Resumen

1. El último paso alcanzado clasifica cada unidad una sola vez y suma el total: es lo que prioriza el trabajo.
2. Duración = \`extract(epoch FROM fin - inicio) / 60\`; resume con mediana o percentil 90, no con promedio.
3. Todo tiempo de conversión se publica junto a la tasa de conversión de ese paso.
`,
  },
];
