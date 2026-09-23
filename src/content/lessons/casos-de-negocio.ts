import type { LessonDef } from "../schemas/curriculum";

const section = "casos-de-negocio";

export const lessons: LessonDef[] = [
  {
    slug: "de-un-pedido-vago-a-una-especificacion",
    section,
    kind: "theory",
    title: "De un pedido vago a una especificación",
    sort_order: 0,
    estimated_minutes: 14,
    is_free: false,
    is_published: true,
    prerequisites: ["calidad-de-datos-validez-y-huecos"],
    dataset: "tiendaviva",
    body_md: `## Por qué importa

Nadie te va a pedir «un \`GROUP BY\` por mes con \`FILTER\` sobre el estado». Te van a escribir «¿por qué cayeron las ventas en México el mes pasado?» y van a esperar una respuesta el jueves. Todo lo que aprendiste hasta aquí es la parte fácil: la parte difícil es convertir esa frase en una consulta que responda algo concreto y defendible.

Un pedido así no tiene una única respuesta correcta. Tiene una **respuesta especificada**, es decir, una respuesta en la que alguien decidió qué se cuenta, en qué período y contra qué se compara. Esas decisiones las vas a tomar tú, y si las tomas sin decirlas, entregas un número que nadie puede interpretar ni verificar.

## Las cuatro preguntas

Antes de escribir SQL, respóndete estas cuatro preguntas. Si no puedes responderlas, el problema no es de SQL: el pedido todavía no está definido y definirlo es el primer paso del trabajo.

**1. ¿Cuál es la unidad de análisis, también llamada grano?** El **grano** es qué representa una fila de tu resultado: ¿una fila por pedido, por cliente, por producto, por mes, o por mes y país? «Ventas en México» puede ser una sola cifra, una serie mensual o una tabla con un canal por columna. El grano define el \`GROUP BY\` y, con él, la mayor parte de la consulta.

**2. ¿Qué cuenta y qué no?** En \`orders\` de **TiendaViva** hay seis estados. ¿Una venta es un pedido creado, uno pagado o uno entregado? ¿Las devoluciones se restan? Cada opción da un número distinto y ninguna es falsa. La que sirve es la que coincide con lo que hace el resto de la empresa.

**3. ¿Qué período, medido en qué huso horario?** «El mes pasado» todavía no es una fecha. \`created_at\` es la columna de \`orders\` que guarda cuándo se creó el pedido, y su tipo es \`timestamptz\`, un instante que se interpreta según un huso horario. Si no fijas ese huso, el corte entre un mes y el siguiente se mueve según la zona horaria de quien ejecuta la consulta, y los pedidos de las últimas horas del mes cambian de bando. Escribe siempre \`AT TIME ZONE 'UTC'\` —UTC, por *coordinated universal time*, es el huso de referencia mundial— o el huso del negocio, declarado en el informe. Y usa siempre un límite superior abierto: mayor o igual que el primer día del mes y menor que el primer día del mes siguiente.

**4. ¿Contra qué se compara?** «Cayeron» implica una comparación. ¿Contra julio? ¿Contra agosto del año pasado? ¿Contra el plan? Sin base de comparación no hay caída, hay un número suelto.

## Una respuesta que sirve para decidir

Compara estas dos entregas para el mismo pedido:

\`\`\`sql
-- A: responde "cuánto", no "por qué"
SELECT round(sum(o.total_amount), 2) AS ingresos
FROM orders AS o
INNER JOIN customers AS c ON c.id = o.customer_id
WHERE c.country = 'MX'
  AND o.status = 'delivered'
  AND o.created_at >= timestamptz '2025-08-01 00:00:00+00'
  AND o.created_at <  timestamptz '2025-09-01 00:00:00+00';
\`\`\`

\`\`\`sql
-- B: descompone la métrica en sus factores
SELECT
  date_trunc('month', o.created_at AT TIME ZONE 'UTC')::date AS mes,
  count(*) AS pedidos,
  count(DISTINCT o.customer_id) AS clientes,
  round(sum(o.total_amount), 2) AS ingresos,
  round(avg(o.total_amount), 2) AS ticket_promedio
FROM orders AS o
INNER JOIN customers AS c ON c.id = o.customer_id
WHERE c.country = 'MX'
  AND o.status = 'delivered'
  AND o.created_at >= timestamptz '2025-07-01 00:00:00+00'
  AND o.created_at <  timestamptz '2025-09-01 00:00:00+00'
GROUP BY 1
ORDER BY 1;
\`\`\`

La consulta A devuelve 1 879 865,71. El número es verdadero y al mismo tiempo inservible, porque por sí solo no dice si ese mes fue bueno o malo. La consulta B devuelve dos filas y, con ellas, la respuesta: los ingresos pasaron de 2 075 796,94 a 1 879 865,71 (−9,4 %), con 306 pedidos contra 281 (−8,2 %) y un ticket promedio casi idéntico (6783,65 contra 6689,91). Como el ticket casi no se movió y la cantidad de pedidos sí, la caída es de **volumen** y no de precio. Eso ya le dice al equipo comercial dónde buscar.

El patrón se repite en casi cualquier pedido de negocio: **descompón la métrica en los factores que la multiplican**. Los ingresos son pedidos × ticket promedio. Los pedidos son clientes × frecuencia de compra. El volumen es usuarios activos × transacciones por usuario × monto medio. Cuando la métrica total se mueve, casi siempre uno de esos factores explica el movimiento y los demás se quedan quietos, y ese factor es el que hay que informar.

## Lo que sí conviene preguntar

No todas las ambigüedades las puedes resolver por tu cuenta. Conviene hacer una pregunta corta cuando la elección cambia la conclusión: qué estado del pedido cuenta como venta, si «México» es el país del cliente o el del vendedor, si el mes es el mes calendario o los últimos 30 días. El resto —el formato, el orden de las filas, si el porcentaje lleva dos decimales— lo decides tú y lo dejas escrito en la entrega.

Una regla práctica: pregunta una sola vez, en una lista de tres puntos, con tu propuesta ya escrita («voy a contar pedidos \`delivered\` por país del cliente, mes calendario UTC; avísame si prefieres otra cosa»). Es mucho más probable que te respondan eso que un cuestionario abierto.

## Errores comunes

- Empezar a escribir SQL antes de definir el grano, y descubrir a mitad de camino que el \`GROUP BY\` era otro.
- Entregar una cifra sin comparación: nadie puede saber si está bien.
- Usar «el mes pasado» sin fijar el huso horario ni el límite superior abierto.
- Mezclar monedas en una suma porque la tabla no lo impide.

## Resumen

1. Un pedido de negocio se responde especificándolo: grano, qué cuenta, período con huso y base de comparación.
2. Descomponer la métrica en factores convierte un «cuánto» en un «por qué».
3. Pregunta solo lo que cambia la respuesta, y llega con una propuesta escrita.
`,
  },
  {
    slug: "supuestos-que-se-escriben",
    section,
    kind: "theory",
    title: "Supuestos que se escriben",
    sort_order: 1,
    estimated_minutes: 13,
    is_free: false,
    is_published: true,
    prerequisites: ["de-un-pedido-vago-a-una-especificacion"],
    dataset: "bolsillo",
    body_md: `## Por qué importa

Toda consulta de negocio contiene decisiones que no estaban en el pedido: esas decisiones son los **supuestos**. Un análisis profesional no tiene menos supuestos que uno que se cae en la primera reunión; tiene los mismos, pero escritos al lado del número y en el lenguaje de quien pregunta, no en el de la consulta.

Un supuesto escrito se puede discutir y corregir. Un supuesto implícito se descubre tres semanas después, cuando alguien compara tu tabla con la de otro equipo y no cierran.

## Dónde se esconden

**En el filtro.** ¿Cuentas solo \`status = 'completed'\` o también los \`pending\`? En **Bolsillo**, los pagos con tarjeta pasan por cuatro estados, y los que quedaron en \`reversed\` son pagos cuyo dinero ya volvió al cliente. Si los cuentas como ventas, el volumen que le muestras a Finanzas queda inflado y no va a coincidir con el suyo.

**En el join.** Un \`INNER JOIN\` con \`merchants\` (la tabla de comercios) conserva solo los movimientos que tienen un comercio asociado y descarta en silencio las recargas, las comisiones y las transferencias entre personas. Esa exclusión es correcta si lo que mediste son «pagos en comercios», y es un error que nadie ve si dijiste «movimientos».

**En el NULL.** Un NULL es la ausencia de dato, y qué significa esa ausencia lo define el negocio en cada columna. En una suscripción, \`ended_on IS NULL\` —la fecha de baja vacía— significa que la suscripción sigue vigente, no que se desconozca cuándo terminó. En cambio, un \`rating\` nulo no es una calificación de cero: es un restaurante que nadie calificó. Si lo promedias como cero, la media baja y ningún error te avisa.

**En la unidad.** En Ritmo, la columna \`amount_minor\` de la tabla \`subscriptions\` guarda el importe en unidades menores, es decir, en centavos: leerla como si fueran pesos multiplica todo por cien. En Bolsillo, además, cada movimiento está en la moneda de su cuenta, así que sumar ARS (pesos argentinos) con MXN (pesos mexicanos) da un número que no corresponde a ninguna cantidad real de dinero.

**En la ventana de tiempo.** «Últimos 30 días» no dice desde qué día se cuentan ni si el último día entra completo. Dos analistas con el mismo pedido pueden entregar dos cifras distintas y las dos ser defendibles.

## Convertir, y decir cómo

Cuando hay que sumar entre monedas no hay forma de evitar el supuesto; hay que elegirlo:

\`\`\`sql
SELECT
  date_trunc('month', t.created_at AT TIME ZONE 'UTC')::date AS mes,
  round(sum(t.amount / coalesce(f.usd_rate, 1)), 2) AS volumen_usd
FROM transactions AS t
LEFT JOIN fx_rates AS f
  ON f.currency = t.currency
 AND f.rate_date = (t.created_at AT TIME ZONE 'UTC')::date
WHERE t.kind IN ('card_payment', 'qr_payment')
  AND t.status = 'completed'
GROUP BY 1
ORDER BY 1;
\`\`\`

Hay tres supuestos en seis líneas, y los tres tienen que aparecer en la entrega. Primero: se cuentan solo los pagos completados en comercios. Segundo: la conversión a dólares usa el tipo de cambio **del día de la operación**, que está en la tabla \`fx_rates\` (por *foreign exchange rates*, tipos de cambio); si usaras el de hoy, la historia se reescribiría cada vez que alguien ejecutara la consulta. Tercero: las cuentas en USD no figuran en \`fx_rates\`, y el \`LEFT JOIN\` junto con \`coalesce\` hace que se tomen con tasa 1, tal cual están.

Ese \`coalesce\` es justamente el tipo de decisión que se vuelve invisible si no la anotas. Con un \`INNER JOIN\` en lugar del \`LEFT JOIN\`, los pagos en dólares habrían quedado fuera del informe sin ningún mensaje de error y el total sería menor sin que nadie supiera por qué.

## Cómo se escribe

Tres o cuatro líneas alcanzan. Van **arriba** del resultado, no en un anexo:

> **Definiciones.** Pago = movimiento \`card_payment\` o \`qr_payment\` en estado \`completed\`. Volumen convertido a USD con el tipo de cambio del día de la operación; las cuentas en USD se toman 1:1. Mes calendario en UTC. Excluye reversos y comisiones.
>
> **Limitaciones.** Agosto de 2025 cierra el 31; los movimientos posteriores al 15 de septiembre no están en los datos.

Fíjate en lo que no dice. No menciona el \`LEFT JOIN\`, ni las CTE (por *common table expression*, los bloques \`WITH\` que nombran pasos intermedios de una consulta), ni el \`coalesce\`. Quien pregunta no necesita leer tu SQL: necesita saber qué entra en el número y qué queda afuera.

## Reversible y reproducible

Dos costumbres que hacen que los supuestos valgan:

- **Parámetros arriba.** Las fechas y los umbrales van juntos en una CTE inicial o en las primeras líneas de la consulta, en lugar de repetidos dentro de cinco \`WHERE\` distintos. Así, pasar de «30 días» a «60 días» se hace editando un solo lugar y no seis, y ninguno queda sin actualizar.
- **Sin «hoy» implícito.** Una consulta que usa \`now()\` devuelve un resultado distinto cada día, así que nadie puede volver a obtener el número que entregaste. Para un informe que alguien va a revisar, escribe la fecha de corte como una constante y dila en el texto.

## Errores comunes

- Entregar el número sin las definiciones, y descubrir en la reunión que «cliente activo» significaba otra cosa.
- Documentar el SQL en vez del criterio de negocio.
- Convertir monedas con el tipo de cambio de hoy y cambiar el pasado en cada ejecución.
- Tratar NULL como cero en promedios, o dejar que un \`INNER JOIN\` elimine filas que el negocio esperaba ver.

## Resumen

1. Los supuestos existen siempre; lo único opcional es escribirlos.
2. Se esconden en el filtro, el join, los NULL, las unidades y la ventana de tiempo.
3. Escríbelos en lenguaje de negocio, arriba del resultado, junto con las limitaciones conocidas.
`,
  },
  {
    slug: "revisar-antes-de-enviar",
    section,
    kind: "theory",
    title: "Revisar antes de enviar",
    sort_order: 2,
    estimated_minutes: 13,
    is_free: false,
    is_published: true,
    prerequisites: ["supuestos-que-se-escriben"],
    dataset: "pidelo",
    body_md: `## Por qué importa

Una consulta que se ejecuta sin errores todavía puede estar mal. Los errores que llegan a una reunión no son de sintaxis: son filas duplicadas por un join, un denominador equivocado o un porcentaje calculado sobre nueve casos. Ninguno de los tres se nota leyendo el SQL. Se notan mirando el resultado con desconfianza y comparándolo con cifras que ya conoces.

Antes de enviar cualquier tabla, dedícale cinco minutos a estas comprobaciones. Son las mismas que va a hacer quien te quiera corregir.

## 1. El total tiene que cerrar

Si desagregaste por ciudad, la suma de las ciudades debe dar el total sin desagregar. Si no da, hay filas que se duplicaron en un join o que se perdieron en uno interno.

\`\`\`sql
SELECT count(*) AS pedidos FROM orders WHERE status = 'delivered';
\`\`\`

Guarda ese número y compáralo con el \`sum()\` de tu tabla final. Es la prueba más barata que existe y atrapa la mitad de los errores reales.

## 2. Contar filas antes de agregar

La duplicación que provoca un join deja de verse en cuanto agregas: un \`sum()\` inflado tiene el mismo aspecto que uno correcto. En **Pídelo**, unir \`orders\` con \`order_items\` hace que cada pedido aparezca tantas veces como ítems tenga, porque a una fila de pedido le corresponden varias líneas de detalle. Si después sumas la columna \`total\` de \`orders\`, cada importe se suma varias veces y el resultado se dispara.

\`\`\`sql
SELECT count(*) AS filas, count(DISTINCT o.id) AS pedidos
FROM orders AS o
INNER JOIN order_items AS oi ON oi.order_id = o.id;
\`\`\`

Cuando \`filas\` supera a \`pedidos\`, cualquier métrica que se refiera al pedido y se calcule sobre ese join está mal. Hay dos salidas: agregar primero los ítems en una CTE (por *common table expression*, el bloque \`WITH\` que da nombre a un paso intermedio) para volver a una fila por pedido, o contar con \`count(DISTINCT o.id)\` en lugar de \`count(*)\`.

## 3. Mirar los extremos, no el promedio

Ordena tu resultado por la métrica, hacia arriba y hacia abajo, y mira las cinco primeras filas de cada lado. Los valores absurdos viven en los bordes: una ciudad con 400 % de crecimiento, un restaurante con calificación 5,0, un género con −50 %.

Casi siempre la causa es un denominador chico. Un restaurante con dos pedidos, los dos tardíos, tiene 100 % de tardanza, y ese 100 % no describe su desempeño: describe dos casos. Por eso los rankings de negocio llevan un **umbral mínimo de volumen**, declarado en la consulta y en la entrega:

\`\`\`sql
HAVING count(*) >= 30
\`\`\`

El umbral es un supuesto más. Elígelo antes de ver los resultados y no después, porque si lo ajustas mirando la tabla estás eligiendo qué filas quedan arriba, es decir, estás eligiendo la conclusión.

## 4. Revisar los nulos y los ceros

¿Hay filas con \`NULL\` donde esperabas un valor? En Pídelo, \`restaurant_rating\` es nulo en el 11 % de las calificaciones y \`courier_id\` falta en los pedidos cancelados. Un \`avg()\` los ignora —lo cual suele ser correcto—, pero entonces el promedio se calcula sobre menos filas de las que muestra tu columna de conteo. Si esas dos columnas van juntas en la tabla, aclara cuál es cuál.

Revisa también los ceros. Una división por cero corta la consulta con un error, y un cero en el lugar equivocado puede devolver un resultado que parece válido. \`nullif(denominador, 0)\` convierte ese cero en \`NULL\`, de modo que la celda dice «no se puede calcular» en lugar de mostrar un número inventado.

## 5. ¿La magnitud es creíble?

Este chequeo no es técnico, sino de sentido común sobre el negocio. ¿Un 45 % de recompra es plausible para una app de delivery? ¿La caída de 9 % en agosto coincide con algo que efectivamente pasó? Si tu número contradice lo que la organización cree saber, es mucho más probable que tengas un error a que hayas descubierto algo nuevo. Revisa otra vez los filtros antes de escribir el correo.

Cuando sí es un hallazgo real, el chequeo previo te va a servir igual: la primera pregunta que te van a hacer es «¿estás seguro?».

## 6. Lo que va en el mensaje

Resultado, definiciones, limitaciones y **una** conclusión en una frase. Si la tabla tiene 11 filas, señala cuál mirar primero. Si la muestra es chica, dilo antes de que lo encuentren. Nunca envíes una tabla sin una frase que diga qué hay que ver en ella.

## Errores comunes

- Confiar en que «corrió sin errores» equivale a «está bien».
- Publicar porcentajes con denominadores de una o dos filas.
- Elegir el umbral mínimo después de mirar el resultado.
- Enviar una tabla sin conclusión y dejar que cada lector invente la suya.

## Resumen

1. Cierra los totales y verifica que ningún join haya duplicado filas antes de agregar.
2. Mira los extremos, pon un umbral mínimo de volumen y decláralo de antemano.
3. Entrega el número con sus definiciones, sus limitaciones y una conclusión escrita.
`,
  },
];
