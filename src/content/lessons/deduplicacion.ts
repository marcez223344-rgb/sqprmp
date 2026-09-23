import type { LessonDef } from "../schemas/curriculum";

const section = "deduplicacion";

export const lessons: LessonDef[] = [
  {
    slug: "dedup-que-es-un-duplicado",
    section,
    kind: "theory",
    title: "Qué cuenta como duplicado",
    sort_order: 0,
    estimated_minutes: 11,
    is_free: false,
    is_published: true,
    prerequisites: ["distinct-valores-unicos", "having-filtrar-grupos"],
    dataset: "ritmo",
    body_md: `## Por qué importa

«Tenemos filas duplicadas» es una de las frases más peligrosas de una reunión de datos, porque suena técnica y no lo es. Antes de escribir una sola línea de SQL hay que responder una pregunta de negocio: **¿qué columnas definen la identidad de una fila?** Sin esa respuesta, deduplicar es adivinar.

Trabajas con **Ritmo**, un servicio de streaming musical. La tabla \`plays\` registra reproducciones: \`id\`, \`user_id\`, \`track_id\`, \`played_at\`, \`seconds_played\`, \`device\`, \`completed\`.

## El duplicado no es un hecho técnico

Mira dos filas con el mismo \`user_id\` y el mismo \`track_id\`:

- Si \`played_at\` es distinto, la misma persona escuchó la canción dos veces. **No es un duplicado**: es fidelidad, y borrarla destruye una métrica.
- Si \`played_at\` es idéntico al segundo, es casi seguro que el evento se registró dos veces por un reintento del cliente móvil. **Sí es un duplicado.**

La diferencia no la decide el motor: la decide alguien que entiende el producto. Tu trabajo es **escribir esa decisión** en forma de lista de columnas —la clave de identidad— y dejarla documentada en la consulta.

En \`plays\`, el acuerdo es: una reproducción queda identificada por \`(user_id, track_id, played_at)\`. La columna \`id\` no sirve como clave de identidad porque es un correlativo: dos filas duplicadas tienen ids distintos justamente porque se insertaron dos veces.

## Detectar: agrupar por la clave y contar

El patrón de detección es siempre el mismo, cambie el dataset que cambie:

\`\`\`sql
SELECT user_id, track_id, played_at, count(*) AS veces
FROM plays
GROUP BY user_id, track_id, played_at
HAVING count(*) > 1
ORDER BY veces DESC, user_id;
\`\`\`

Devuelve 340 grupos, todos con \`veces = 2\`. Cada grupo aporta una fila de más: **340 filas sobrantes sobre 109 382**.

Léelo así: \`GROUP BY\` arma los grupos según tu definición de identidad; \`HAVING count(*) > 1\` deja solo los grupos que tienen más de un integrante. Si cambias la lista de columnas del \`GROUP BY\`, cambia lo que llamas duplicado. Esa es toda la idea.

## Cuantificar antes de tocar nada

Nunca deduplicas a ciegas. Primero mides:

\`\`\`sql
SELECT
  count(*) AS filas_totales,
  count(DISTINCT (user_id, track_id, played_at)) AS combinaciones_unicas,
  count(*) - count(DISTINCT (user_id, track_id, played_at)) AS filas_sobrantes
FROM plays;
\`\`\`

\`109382\`, \`109042\`, \`340\`. Los paréntesis alrededor de las tres columnas construyen un **valor compuesto**: \`count(DISTINCT ...)\` cuenta cuántos valores compuestos distintos hay.

Un 0,3 % de sobrante puede parecer despreciable, pero no se reparte igual: si esos duplicados se concentran en un artista o en un país, el ranking cambia. Por eso la medición se hace **también por segmento**, no solo en total.

## Duplicado exacto vs. duplicado de negocio

Hay dos familias y conviene no confundirlas:

- **Duplicado exacto**: todas las columnas coinciden (salvo el id técnico). Es el caso de \`plays\`. Cualquiera de las copias sirve; da igual cuál conserves.
- **Duplicado por clave de negocio**: las filas representan la misma entidad del mundo real pero **difieren** en otras columnas. Dos cuentas con el mismo correo escrito distinto, con nombres y fechas de alta distintas. Aquí sí importa cuál conservas, y esa es la lección siguiente.

## DISTINCT: útil y limitado

\`SELECT DISTINCT user_id, track_id, played_at FROM plays\` devuelve las 109 042 combinaciones únicas y resuelve el caso exacto en una línea. Su límite es que **solo puede proyectar las columnas por las que deduplica**: en cuanto necesitas arrastrar \`id\` o \`device\`, las filas vuelven a ser distintas entre sí y \`DISTINCT\` deja de descartar nada.

## Errores comunes

- Incluir el id técnico en el \`GROUP BY\` de detección: todos los grupos quedan de tamaño 1 y concluyes que no hay duplicados.
- Usar \`SELECT DISTINCT *\` como respuesta automática: con un id autoincremental nunca elimina nada.
- Deduplicar antes de acordar la clave de identidad: borras reproducciones legítimas y nadie lo nota hasta el cierre de mes.

## Resumen

1. La clave de identidad es una decisión de negocio; el SQL solo la ejecuta.
2. Detección = \`GROUP BY\` por esa clave + \`HAVING count(*) > 1\`.
3. Mide el impacto (total y por segmento) antes de eliminar una sola fila.
`,
  },
  {
    slug: "dedup-clave-de-negocio",
    section,
    kind: "theory",
    title: "Duplicados por clave de negocio",
    sort_order: 1,
    estimated_minutes: 11,
    is_free: false,
    is_published: true,
    prerequisites: ["dedup-que-es-un-duplicado", "texto-normalizar-y-limpiar"],
    dataset: "tiendaviva",
    body_md: `## El caso difícil

En **TiendaViva**, el marketplace, la tabla \`customers\` tiene una restricción de unicidad sobre \`email\`. Aun así, hay 39 cuentas de más: el registro aceptó \`Ana.Ruiz@ejemplo.lat\` y \`ana.ruiz@ejemplo.lat\` como correos distintos. Para la base de datos son distintos; para la persona detrás de la pantalla, es la misma cuenta.

Esto es un **duplicado por clave de negocio**: filas que la restricción técnica no ve, pero que representan la misma entidad del mundo real.

## Normalizar antes de agrupar

La clave de identidad no es la columna cruda: es la columna **normalizada**. Decides una forma canónica y agrupas por ella.

\`\`\`sql
SELECT lower(btrim(email)) AS correo, count(*) AS cuentas
FROM customers
GROUP BY lower(btrim(email))
HAVING count(*) > 1
ORDER BY cuentas DESC, correo;
\`\`\`

37 grupos: 35 con dos cuentas y 2 con tres. En total 76 filas donde el negocio ve 37 personas.

Las normalizaciones más usadas, y el criterio para elegirlas:

| Técnica | Para qué | Riesgo |
| --- | --- | --- |
| \`lower(...)\` | Correos, códigos, siglas | Ninguno en correos; sí en contraseñas o hashes |
| \`btrim(...)\` | Espacios pegados al copiar y pegar | Ninguno |
| \`regexp_replace(tel, '[^0-9]', '', 'g')\` | Teléfonos con guiones y paréntesis | Pierde el prefijo internacional si no está escrito |
| \`unaccent(...)\` | Nombres con tildes | Requiere una extensión; no siempre disponible |

Todas comparten la misma regla de oro: **normalizas para comparar, no para guardar**. El dato original se conserva; la forma canónica vive en la consulta o en una columna calculada aparte.

## La clave puede ser compuesta

Pocas veces alcanza con una columna. En un padrón de proveedores, la identidad puede ser \`(tax_id)\`; en una tabla de contactos sin identificador fiscal, quizá \`(lower(email), country)\`; en un catálogo, \`(seller_id, lower(name))\`.

\`\`\`sql
SELECT seller_id, lower(btrim(name)) AS producto, count(*) AS publicaciones
FROM products
GROUP BY seller_id, lower(btrim(name))
HAVING count(*) > 1;
\`\`\`

Cada combinación que propongas es una hipótesis de negocio distinta. Escribir dos o tres y comparar cuántos grupos devuelve cada una es una forma honesta de discutirlo con el área dueña del dato.

## Cuando la coincidencia no es exacta

«Juan Pérez» y «Juan Perez Gómez» probablemente sean la misma persona, y ningún \`GROUP BY\` los junta. Ahí entra el emparejamiento aproximado: comparar por un prefijo, por una similitud de texto o por la coincidencia de varias columnas débiles a la vez (nombre + ciudad + año de nacimiento).

Ese terreno es resbaladizo: siempre cambias falsos positivos por falsos negativos. La regla práctica es no automatizar una fusión aproximada sin revisión humana; en cambio, sí es muy útil **producir la lista de sospechosos** para que alguien la revise.

## Duplicados que no están en la tabla

Ojo con un caso que se confunde todo el tiempo: un join mal planteado **crea** filas repetidas que no existen en ningún lado. Si unes \`orders\` con \`payments\` y un pedido tiene tres intentos de pago, cada pedido aparece tres veces y el total se triplica.

Eso no se arregla con \`DISTINCT\`: se arregla agregando \`payments\` a una fila por pedido **antes** de unir, o eligiendo un solo intento. Si tu reflejo ante un total inflado es agregar \`DISTINCT\`, casi siempre estás tapando un error de cardinalidad.

## Errores comunes

- Agrupar por la columna cruda y concluir que no hay duplicados porque la restricción \`UNIQUE\` «ya los evita».
- Guardar el dato normalizado encima del original: pierdes cómo lo escribió la persona y no puedes auditar la decisión.
- Usar \`DISTINCT\` para tapar filas multiplicadas por un join en lugar de corregir la cardinalidad.

## Resumen

1. Normaliza (\`lower\`, \`btrim\`, limpieza de símbolos) y agrupa por la forma canónica.
2. La clave de identidad suele ser compuesta; cada versión es una hipótesis que se discute con el negocio.
3. Filas repetidas por un join no son duplicados de datos: son un problema de cardinalidad.
`,
  },
  {
    slug: "dedup-elegir-la-fila-ganadora",
    section,
    kind: "theory",
    title: "Elegir la fila que se conserva",
    sort_order: 2,
    estimated_minutes: 12,
    is_free: false,
    is_published: true,
    prerequisites: ["dedup-clave-de-negocio", "ranking-top-n-por-grupo"],
    dataset: "tiendaviva",
    body_md: `## La segunda decisión de negocio

Ya sabes qué filas forman un grupo duplicado. Falta la segunda pregunta, igual de poco técnica: **¿cuál de ellas sobrevive?** La más reciente, la más completa, la que tiene actividad asociada. También esto lo decide el negocio y también se escribe explícito.

## ROW_NUMBER: el patrón general

\`\`\`sql
WITH numeradas AS (
  SELECT
    id,
    order_id,
    status,
    row_number() OVER (PARTITION BY order_id ORDER BY id DESC) AS copia
  FROM payments
)
SELECT id, order_id, status
FROM numeradas
WHERE copia = 1;
\`\`\`

\`PARTITION BY\` es tu clave de identidad. El \`ORDER BY\` de la ventana es **tu regla de negocio**: quien queda primero se conserva. Con \`WHERE copia = 1\` te quedas con las ganadoras; con \`WHERE copia > 1\` obtienes exactamente la lista de filas a eliminar, que es lo que le entregas a quien vaya a hacer la limpieza.

Este patrón funciona siempre, incluso cuando las filas del grupo difieren entre sí, y es la razón por la que \`DISTINCT\` no lo reemplaza.

## DISTINCT ON: la versión corta de PostgreSQL

\`\`\`sql
SELECT DISTINCT ON (p.order_id)
  p.order_id, p.id AS payment_id, p.status, p.amount
FROM payments AS p
ORDER BY p.order_id, p.id DESC;
\`\`\`

\`DISTINCT ON (expr)\` conserva **la primera fila de cada grupo** según el \`ORDER BY\`. Dos reglas que no se negocian:

1. El \`ORDER BY\` debe **empezar** por las mismas expresiones del \`DISTINCT ON\`; si no, PostgreSQL rechaza la consulta.
2. Lo que viene después del primer criterio es lo que decide quién gana.

Es más corto que la CTE y suele ser más rápido, pero es **específico de PostgreSQL**: en otros motores tendrás que volver a \`ROW_NUMBER\`. Además, el orden de salida queda atado al \`ORDER BY\` del \`DISTINCT ON\`; si necesitas presentar el resultado en otro orden, envuélvelo en una subconsulta.

## El desempate tiene que ser total

Si tu regla es «la más reciente» y dos filas comparten el instante, el ganador queda **indeterminado**: la misma consulta puede devolver una u otra en ejecuciones distintas. Un reporte que cambia solo se vuelve imposible de defender.

Agrega siempre un criterio final único, normalmente la clave primaria:

\`\`\`sql
ORDER BY p.order_id, p.paid_at DESC, p.id DESC
\`\`\`

## La trampa de los NULL al ordenar

En PostgreSQL, \`ORDER BY col DESC\` coloca los NULL **primero**. En \`payments\`, los 2414 intentos rechazados tienen \`paid_at\` nulo: ordenar por \`paid_at DESC\` te haría conservar justamente los rechazos. La corrección es explícita:

\`\`\`sql
ORDER BY p.order_id, p.paid_at DESC NULLS LAST, p.id DESC
\`\`\`

Revisa esto **cada vez** que la columna de desempate admita nulos. Es de lejos el error más frecuente de esta sección.

## Un tercer camino: agregar en lugar de elegir

A veces no quieres una fila existente sino una fila **consolidada**: el correo de la cuenta más nueva, la fecha de alta más antigua y la suma de pedidos de todas. Eso no es elegir, es fusionar:

\`\`\`sql
SELECT
  lower(email) AS correo,
  min(signup_at) AS primera_alta,
  max(id) AS id_mas_nuevo,
  count(*) AS cuentas
FROM customers
GROUP BY lower(email);
\`\`\`

Es legítimo y a menudo lo correcto, pero deja de existir una fila «original» que puedas señalar. Decide con el negocio si quieren un sobreviviente o un consolidado.

## Y lo que casi nadie hace

Antes de eliminar: ¿qué cuelga de las filas que se van? Si borras una cuenta duplicada, sus pedidos quedan huérfanos. La secuencia sana es elegir ganadora → **repuntar** las filas dependientes → recién entonces eliminar.

## Errores comunes

- Desempatar solo por una fecha que se repite: el resultado no es reproducible.
- Ordenar por una columna con nulos sin \`NULLS LAST\` y conservar la fila vacía.
- Filtrar \`row_number() = 1\` en el mismo \`WHERE\`: las ventanas se calculan después del \`WHERE\`, necesitas una CTE o subconsulta.
- Eliminar sin repuntar las filas dependientes.

## Resumen

1. \`ROW_NUMBER\` con \`PARTITION BY\` (identidad) y \`ORDER BY\` (regla) sirve en cualquier motor.
2. \`DISTINCT ON\` es la versión breve de PostgreSQL y exige que el \`ORDER BY\` empiece por sus expresiones.
3. Desempate único y \`NULLS LAST\` cuando corresponda; revisa las dependencias antes de borrar.
`,
  },
];
