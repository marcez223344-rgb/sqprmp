import type { LessonDef } from "../schemas/curriculum";

const section = "calidad-de-datos";

export const lessons: LessonDef[] = [
  {
    slug: "calidad-de-datos-perfilar-una-tabla",
    section,
    kind: "theory",
    title: "Perfilar una tabla que no conoces",
    sort_order: 0,
    estimated_minutes: 10,
    is_free: false,
    is_published: true,
    prerequisites: ["anatomia-de-una-tabla", "agregacion-count-sum-avg"],
    dataset: "ritmo",
    body_md: `## Por qué importa

Tu primer día en un equipo de datos casi nunca empieza con una pregunta de negocio: empieza con una tabla que nadie te explicó. Antes de calcular una sola métrica sobre ella tienes que responder cuatro preguntas: **qué representa una fila**, **cuánto abarca la tabla**, **qué datos faltan** y **qué valores son imposibles**.

A ese trabajo se le llama **perfilar** una tabla (en inglés, *profiling*): describirla con consultas antes de usarla. Son quince minutos de SQL que te ahorran semanas de reportes equivocados.

La tentación es saltear este paso porque «el dato viene del sistema y el sistema está bien». No lo está. Toda tabla de producción arrastra migraciones a medio terminar, reintentos que dejaron filas repetidas, integraciones que se cortaron y reglas de negocio que cambiaron en algún momento sin que nadie lo documentara.

Trabajas sobre **Ritmo**, el servicio de streaming, y su tabla \`plays\`, que registra reproducciones.

## 1. El volumen y la ventana

La primera consulta de tu vida con una tabla nueva es siempre la misma:

\`\`\`sql
SELECT
  count(*) AS total_rows,
  min(played_at AT TIME ZONE 'UTC') AS first_played_at,
  max(played_at AT TIME ZONE 'UTC') AS last_played_at
FROM plays;
\`\`\`

Te dice si la tabla tiene el tamaño que te anunciaron y, sobre todo, **hasta qué fecha llegan los datos**. Una carga que dejó de actualizarse hace tres semanas se descubre en esta consulta o no se descubre nunca, y mientras tanto tus informes muestran una caída de actividad que en realidad no ocurrió.

Fíjate en el \`AT TIME ZONE 'UTC'\`. Las marcas de tiempo de esta columna son de tipo \`timestamptz\`, que guarda un instante absoluto y lo muestra convertido al huso horario de la sesión. El sandbox de la plataforma fija la sesión en UTC para que el mismo perfilado dé siempre el mismo resultado, así que aquí no vas a ver diferencia; en el servidor de tu trabajo la sesión puede estar configurada en otra zona y la respuesta a «hasta cuándo llegan los datos» cambiaría según esa configuración.

Perfilar es dejar constancia de lo que mediste: fija el huso en la consulta y anota cuál usaste, porque un rango de fechas sin huso declarado no sirve como evidencia en una auditoría.

## 2. La granularidad: ¿qué es una fila?

Saber que hay 109 382 filas no sirve de nada si no sabes qué cuenta cada una. La **granularidad** de una tabla es justamente eso: qué representa una fila. Para descubrirla, compara el total de filas con la cantidad de valores distintos de las columnas candidatas:

\`\`\`sql
SELECT
  count(*) AS total_rows,
  count(DISTINCT user_id) AS distinct_users,
  count(DISTINCT track_id) AS distinct_tracks
FROM plays;
\`\`\`

Con 4768 oyentes y 6203 canciones repartidos en 109 382 filas, una fila **no** es un oyente ni una canción: es un evento de reproducción, una escucha concreta. Ese razonamiento te dice de inmediato qué joins te van a multiplicar filas más adelante, porque cada oyente aparece en la tabla decenas de veces.

El paso siguiente es probar la clave de negocio, es decir, la combinación de columnas que tú crees que identifica una fila de forma única:

\`\`\`sql
SELECT user_id, track_id, played_at, count(*) AS copies
FROM plays
GROUP BY user_id, track_id, played_at
HAVING count(*) > 1;
\`\`\`

Si esa consulta devuelve filas, la combinación **no** es única y cualquier conteo que hagas sobre la tabla está inflado. En \`plays\` devuelve 340 combinaciones repetidas: hay 340 casos en los que el mismo usuario, la misma canción y el mismo instante están cargados más de una vez.

## 3. Lo que falta

\`count(*)\` cuenta todas las filas, mientras que \`count(columna)\` cuenta solo las filas donde esa columna tiene valor. La resta entre ambos números es, exactamente, la cantidad de valores faltantes:

\`\`\`sql
SELECT
  count(*) - count(seconds_played) AS seconds_played_nulls,
  count(*) - count(device) AS device_nulls
FROM plays;
\`\`\`

Un nulo no es un error por sí mismo; la pregunta siempre es **por qué falta**. Que \`device\` esté vacío en el 1,6 % de las filas suele explicarse por una versión vieja de la aplicación que no manda ese campo; que falte \`seconds_played\` indica un evento de reproducción que se cortó antes de terminar.

Lo que sí sería grave es que faltara el 40 % de los valores, o que faltara solo en un país: eso deja de ser ruido y pasa a invalidar cualquier comparación entre países.

## 4. Lo imposible

El perfil cierra con los valores que las reglas del negocio prohíben: segundos negativos, un importe de ítem mayor que el total del pedido, una fecha de entrega anterior a la de envío.

Se cuentan con agregación condicional y siempre se comparan contra el total de filas, porque un número suelto no dice nada: 120 filas malas son un desastre en una tabla de mil filas y son ruido en una de un millón.

\`\`\`sql
SELECT
  count(*) FILTER (WHERE seconds_played < 0) AS negative_seconds,
  round(100.0 * count(*) FILTER (WHERE seconds_played < 0) / count(*), 3) AS negative_pct
FROM plays;
\`\`\`

## El método, en orden

1. Volumen y ventana temporal, con el huso horario fijo y declarado.
2. Granularidad: qué representa una fila y qué combinación de columnas la identifica.
3. Completitud: valores faltantes por columna, en cantidad y en porcentaje.
4. Validez: rangos, listas de valores permitidos y reglas de negocio imposibles de cumplir.
5. Duplicados y huecos referenciales, que son el tema de las dos lecciones que siguen.

Guarda ese perfil como una consulta y no como una captura de pantalla, porque vas a necesitar volver a ejecutarlo cada vez que los datos cambien.

## Resumen

- Perfilar es responder qué representa una fila, cuánto abarca la tabla, qué falta y qué valores son imposibles.
- \`count(*) - count(columna)\` cuenta los valores faltantes; \`GROUP BY ... HAVING count(*) > 1\` prueba si la clave de negocio es única.
- Fija siempre el huso horario con \`AT TIME ZONE 'UTC'\`: una fecha sin huso declarado no es evidencia auditable.
`,
  },
  {
    slug: "calidad-de-datos-nulos-y-categorias",
    section,
    kind: "theory",
    title: "Nulos, vacíos y categorías que no coinciden",
    sort_order: 1,
    estimated_minutes: 10,
    is_free: false,
    is_published: true,
    prerequisites: [
      "calidad-de-datos-perfilar-una-tabla",
      "null-coalesce-y-nullif",
      "texto-normalizar-y-limpiar",
    ],
    dataset: "ritmo",
    body_md: `## Por qué importa

«Falta el dato» tiene al menos tres formas distintas en una base de datos real: el valor \`NULL\`, la cadena de texto vacía \`''\` y el texto que alguien escribió para decir que no sabe (\`'N/A'\`, \`'-'\`, \`'sin dato'\`).

Para el negocio las tres significan lo mismo, pero **ninguna** se comporta igual en SQL: una se descarta sola en los filtros, otra se cuenta como un valor más y la tercera aparece como una categoría con nombre propio en tus informes. A eso se suma un problema gemelo: la misma categoría escrita de varias maneras, que parte un total en pedazos sin que nadie lo note.

## NULL se esconde de los GROUP BY que lees rápido

\`GROUP BY\` sí arma un grupo para las filas con \`NULL\`, pero ese grupo aparece con la celda vacía y se pierde de vista cuando alguien mira la planilla por encima. Conviene hacerlo explícito:

\`\`\`sql
SELECT
  coalesce(device, 'sin_dato') AS device,
  count(*) AS plays
FROM plays
GROUP BY coalesce(device, 'sin_dato')
ORDER BY plays DESC;
\`\`\`

Ahora \`sin_dato\` es una categoría con nombre y con 1745 filas: se ve en el informe y se puede discutir en una reunión.

Cuidado con lo que pasa si en vez de eso filtras con \`WHERE device <> 'mobile'\`: esas 1745 filas **desaparecen del resultado**. La comparación de \`NULL\` con cualquier valor no da verdadero ni falso, da desconocido, y el \`WHERE\` solo deja pasar lo que es verdadero. Si las quieres incluir, tienes que escribirlo: \`WHERE device IS NULL OR device <> 'mobile'\`.

## La cadena vacía no es NULL

La cadena vacía \`''\` es un valor como cualquier otro: ocupa lugar, \`count(columna)\` la cuenta e \`IS NULL\` devuelve falso sobre ella. Por eso un perfil honesto mide las dos cosas por separado y recién las unifica al momento de reportar:

\`\`\`sql
SELECT
  count(*) FILTER (WHERE comment IS NULL) AS null_comments,
  count(*) FILTER (WHERE btrim(comment) = '') AS blank_comments
FROM ratings;
\`\`\`

La expresión \`nullif(btrim(comment), '')\` es el traductor entre los dos mundos: \`btrim\` saca los espacios de los extremos y \`nullif\` convierte en \`NULL\` lo que quedó vacío, de modo que el resto de la consulta tenga que tratar un solo caso de «sin comentario» en lugar de dos.

## Categorías que no coinciden

Es el problema clásico de todo sistema de gestión de clientes: el mismo correo cargado dos veces, una con mayúsculas y otra con minúsculas, y por lo tanto la misma persona contada dos veces.

En el dataset \`tiendaviva\`, la tabla \`customers\` tiene 3000 filas y 2998 correos distintos. Si antes de contarlos los pasas a minúsculas y les sacas los espacios sobrantes, los correos distintos bajan a 2961. Es decir, hay 37 personas cargadas más de una vez, y cualquier métrica «por cliente» sobre esa tabla está mal.

\`\`\`sql
SELECT lower(btrim(email)) AS normalized_email, count(*) AS people_rows
FROM customers
GROUP BY lower(btrim(email))
HAVING count(*) > 1;
\`\`\`

La normalización mínima que conviene aplicar antes de agrupar cualquier texto es esta:

- \`btrim(x)\` quita los espacios del principio y del final. Es el error más frecuente cuando los datos se cargaron desde una planilla.
- \`lower(x)\` iguala mayúsculas y minúsculas.
- \`regexp_replace(x, ' +', ' ', 'g')\` reemplaza cada grupo de espacios internos repetidos por uno solo.

Una advertencia importante: normalizar sirve para **detectar y agrupar**, no para reescribir la tabla por tu cuenta. Que dos filas parezcan la misma persona no te autoriza a fusionarlas; esa es una decisión del área dueña del dato, con consecuencias legales y contables.

## Los nulos al agregar

Las funciones de agregación ignoran los valores nulos, y eso cambia el resultado según lo que estés preguntando:

\`\`\`sql
SELECT
  avg(seconds_played) AS avg_over_known,
  sum(seconds_played) / count(*) AS avg_over_all
FROM plays;
\`\`\`

La primera expresión divide la suma por la cantidad de filas **que tienen dato**; la segunda la divide por todas las filas, tengan dato o no. Ninguna de las dos está mal: responden preguntas distintas, «cuánto dura en promedio una reproducción medida» y «cuánto tiempo de escucha registramos por evento».

Lo que sí está mal es no saber cuál de las dos estás mostrando. Regla práctica: cuando reportes un promedio sobre una columna que tiene nulos, informa al lado cuántas filas quedaron fuera del cálculo.

## Cómo se comunica esto

Un hallazgo de calidad se reporta siempre con tres datos: **qué regla se rompe**, **cuántas filas la rompen** y **sobre qué total**. Decir «hay nulos en \`device\`» no mueve a nadie, porque quien lo lee no puede saber si es urgente. Decir «1745 de 109 382 reproducciones (1,6 %) no tienen dispositivo registrado» le da a esa persona todo lo que necesita para decidir, y normalmente abre un ticket.

## Resumen

- \`NULL\`, \`''\` y \`'N/A'\` son tres cosas distintas para SQL y la misma para el negocio: mídelas por separado y únelas recién al reportar.
- \`coalesce\` hace visible el grupo de los nulos; \`nullif(btrim(x), '')\` convierte el texto vacío en nulo.
- Normaliza el texto con \`lower\` y \`btrim\` para detectar categorías duplicadas, y recuerda que detectar no es fusionar.
`,
  },
  {
    slug: "calidad-de-datos-validez-y-huecos",
    section,
    kind: "theory",
    title: "Reglas de validez, huecos referenciales y el reporte",
    sort_order: 2,
    estimated_minutes: 11,
    is_free: false,
    is_published: true,
    prerequisites: [
      "calidad-de-datos-nulos-y-categorias",
      "subconsultas-in-exists-y-null",
      "union-y-union-all",
    ],
    dataset: "ritmo",
    body_md: `## Por qué importa

Perfilar una tabla te dice cómo es. **Auditarla** te dice dónde incumple las reglas que el negocio da por ciertas.

La diferencia práctica está en el uso: el perfil se mira una vez, cuando conoces la tabla; la auditoría se convierte en una consulta guardada que corre cada semana y que cualquier persona del equipo puede volver a ejecutar para llegar exactamente a tu mismo número.

## Reglas de dominio: un solo campo

El **dominio** de una columna es el conjunto de valores que puede tomar legítimamente, aunque la base de datos no lo tenga declarado: \`seconds_played\` no puede ser negativo, un porcentaje vive entre 0 y 100, la columna \`status\` solo admite cinco textos posibles.

Estos chequeos son los más baratos de escribir y los que más vergüenzas evitan:

\`\`\`sql
SELECT count(*) FILTER (WHERE seconds_played < 0) AS negative_seconds
FROM plays;
\`\`\`

En la tabla \`plays\` de **Ritmo** hay 120 filas con segundos negativos. Son pocas sobre el total, pero envenenan cualquier suma de tiempo escuchado, porque restan tiempo que nadie escuchó.

## Reglas cruzadas: dos tablas que tienen que coincidir

El nivel siguiente compara una fila con la tabla que define sus límites. Nadie puede escuchar una canción durante más tiempo del que la canción dura:

\`\`\`sql
SELECT count(*) AS over_duration
FROM plays p
JOIN tracks t ON t.id = p.track_id
WHERE p.seconds_played > t.duration_seconds;
\`\`\`

Son 210 filas, y varias con proporciones absurdas: hay reproducciones que registran hasta 42 veces la duración de la canción.

Estos son los **valores atípicos** que importan en calidad de datos. No se trata del dato alto y llamativo, que puede ser perfectamente real, sino del dato que ninguna interpretación del negocio puede justificar. El criterio para separarlos no es estadístico sino de dominio: existe una cota superior conocida, que es la duración de la canción, y hay filas que la superan.

## Huecos referenciales

Una clave foránea (FK, por *foreign key*, su nombre en inglés) garantiza que el valor guardado exista en la otra tabla: si un ítem tiene \`order_id = 55\`, garantiza que el pedido 55 existe. Lo que **no** garantiza es que la relación esté completa en el otro sentido, y ese es el hueco típico: el padre sin hijos. Un pedido sin ítems, un cliente sin dirección, un envío sin pedido asociado.

\`\`\`sql
SELECT o.id, o.status, o.total
FROM orders o
WHERE NOT EXISTS (
  SELECT 1 FROM order_items i WHERE i.order_id = o.id
);
\`\`\`

Esa consulta se llama **antijoin**, porque devuelve las filas de una tabla que *no* tienen correspondencia en otra. Se puede escribir de dos formas equivalentes, y hay una tercera que es una trampa:

- \`NOT EXISTS (...)\`: la más segura y la más fácil de leer.
- \`LEFT JOIN ... WHERE i.order_id IS NULL\`: igual de válida. La condición sobre el nulo va en el \`WHERE\` y nunca en el \`ON\`, porque en el \`ON\` se evalúa antes de generar las filas sin correspondencia y no filtra nada.
- \`NOT IN (SELECT order_id FROM order_items)\`: **la trampa**. Si esa subconsulta devuelve aunque sea un \`NULL\`, el resultado es vacío siempre, sin error ni advertencia. Evítala en auditorías, donde un resultado vacío se interpreta como «todo está bien».

En el dataset \`pidelo\` ese antijoin devuelve 178 pedidos sin ningún ítem, y 171 de ellos tienen un importe mayor que cero: hay dinero registrado sin nada que lo explique.

## El reporte de chequeos

Un hallazgo suelto en un mensaje se pierde; un tablero de chequeos se revisa. El patrón es una fila por regla, con la cantidad de filas que falla y el total contra el que se compara:

\`\`\`sql
WITH total AS (SELECT count(*) AS rows_checked FROM plays),
fails AS (
  SELECT 'segundos_negativos' AS check_name, count(*) AS failing_rows
  FROM plays WHERE seconds_played < 0
  UNION ALL
  SELECT 'device_nulo', count(*) FROM plays WHERE device IS NULL
)
SELECT f.check_name, f.failing_rows, t.rows_checked
FROM fails f CROSS JOIN total t
ORDER BY f.failing_rows DESC;
\`\`\`

Tres detalles vuelven profesional a ese reporte:

1. **\`UNION ALL\` y no \`UNION\`**: dos chequeos distintos pueden fallar exactamente la misma cantidad de filas, y \`UNION\`, que elimina las filas repetidas, te borraría uno de los dos del informe.
2. **Los chequeos que pasan también se muestran**, con el valor cero. Una regla que no aparece en la lista es una regla que nadie verificó, y quien lee el reporte no tiene forma de distinguir esas dos situaciones.
3. **El total va al lado de cada conteo**: 340 filas con problemas son un desastre en una tabla de mil filas y son ruido en una de un millón.

## Lo que un auditor no hace

Un auditor no borra ni corrige las filas malas por su cuenta. Documenta la regla que se incumple, cuantifica el impacto sobre la métrica afectada, propone el arreglo en el sistema que originó el dato y, mientras tanto, deja el filtro escrito de forma explícita en la consulta, con un comentario que explique por qué está. La tabla es de otra área; el diagnóstico es tuyo.

## Resumen

- Las reglas de dominio (un campo), las reglas cruzadas (dos tablas) y los huecos referenciales (el padre sin hijos) son tres familias de chequeos distintas.
- El antijoin se escribe con \`NOT EXISTS\` o con \`LEFT JOIN ... IS NULL\`; \`NOT IN\` sobre columnas con nulos devuelve vacío en silencio.
- Reporta una fila por regla con \`UNION ALL\`, incluye también las reglas que pasan y muestra siempre el total de referencia.
`,
  },
];
