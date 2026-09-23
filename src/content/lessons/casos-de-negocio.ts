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

Un pedido así no tiene una respuesta correcta; tiene una **respuesta especificada**. Especificar es elegir, y elegir mal en silencio es la manera más común de entregar un número que nadie puede usar.

## Las cuatro preguntas

Antes de escribir SQL, respóndete estas cuatro. Si no puedes, no te falta SQL: te falta pedido.

**1. ¿Cuál es la unidad de análisis (el grano)?** ¿Una fila por pedido, por cliente, por producto, por mes, por mes y país? «Ventas en México» puede ser una sola cifra, una serie mensual o una tabla por canal. El grano define el \`GROUP BY\` y, con él, el 80 % de la consulta.

**2. ¿Qué cuenta y qué no?** En \`orders\` de **TiendaViva** hay seis estados. ¿Una venta es un pedido creado, uno pagado o uno entregado? ¿Las devoluciones se restan? Cada opción da un número distinto y ninguna es falsa. La que sirve es la que coincide con lo que hace el resto de la empresa.

**3. ¿Qué período, en qué huso?** «El mes pasado» no es una fecha. \`created_at\` es \`timestamptz\`: si no fijas el huso, el corte del mes se mueve según la zona horaria de quien ejecuta la consulta. Siempre \`AT TIME ZONE 'UTC'\` (o el huso del negocio, declarado), y siempre con límite superior abierto.

**4. ¿Contra qué se compara?** «Cayeron» implica una comparación. ¿Contra julio? ¿Contra agosto del año pasado? ¿Contra el plan? Sin base de comparación no hay caída, hay un número suelto.

## Una respuesta que se puede accionar

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

La consulta A devuelve 1 879 865,71. Verdadero e inútil: no dice si es mucho o poco. La B devuelve dos filas y, con ellas, la respuesta: los ingresos pasaron de 2 075 796,94 a 1 879 865,71 (−9,4 %), con 306 pedidos contra 281 (−8,2 %) y un ticket casi idéntico (6783,65 contra 6689,91). La caída es de **volumen**, no de precio. Eso ya es una pista para el equipo comercial.

El patrón se repite en casi todo pedido de negocio: **descompón la métrica en factores multiplicativos**. Ingresos = pedidos × ticket. Pedidos = clientes × frecuencia. Volumen = usuarios activos × transacciones por usuario × monto medio. Cuando una métrica se mueve, uno de los factores explica el movimiento y los demás se quedan quietos.

## Lo que sí conviene preguntar

No todas las ambigüedades se resuelven solas. Vale la pena una pregunta corta cuando la elección cambia el signo de la respuesta: qué estado cuenta como venta, si «México» es el país del cliente o el del vendedor, si el mes es calendario o los últimos 30 días. El resto —el formato, el orden de las filas, si el porcentaje lleva dos decimales— lo decides tú y lo escribes.

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

Toda consulta de negocio contiene decisiones que no estaban en el pedido. La diferencia entre un análisis profesional y uno que se cae en la primera reunión no es que el primero no tenga supuestos: es que están escritos, al lado del número, en el idioma del que pregunta.

Un supuesto escrito se puede discutir y corregir. Un supuesto implícito se descubre tres semanas después, cuando alguien compara tu tabla con la de otro equipo y no cierran.

## Dónde se esconden

**En el filtro.** ¿\`status = 'completed'\` o también \`pending\`? En **Bolsillo**, los pagos con tarjeta tienen cuatro estados y los \`reversed\` ya se devolvieron al cliente. Contarlos infla el volumen que le muestras a Finanzas.

**En el join.** Un \`INNER JOIN\` con \`merchants\` descarta los movimientos sin comercio (recargas, comisiones, transferencias). Es correcto si mediste «pagos en comercios» y es un error silencioso si dijiste «movimientos».

**En el NULL.** \`ended_on IS NULL\` significa «vigente», no «desconocido». \`rating\` nulo en un restaurante no es un rating cero: es un restaurante sin calificar. Promediarlos como cero baja la media y nadie lo ve.

**En la unidad.** \`amount_minor\` está en unidades menores. Los montos de Bolsillo están en la moneda de la cuenta. Sumar ARS con MXN produce un número con muchos dígitos y cero significado.

**En la ventana.** «Últimos 30 días» desde qué día, y si el último día está incluido.

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

Tres supuestos en seis líneas, y los tres hay que escribirlos en la entrega: solo pagos completados en comercios; conversión a dólares con el tipo de cambio **del día de la operación** (no el de hoy, que reescribiría la historia cada vez que corras la consulta); y las cuentas en USD, que no figuran en \`fx_rates\`, se toman con tasa 1 gracias al \`LEFT JOIN\` con \`coalesce\`.

Ese \`coalesce\` es justamente el tipo de decisión que desaparece si no la anotas. Con \`INNER JOIN\` los pagos en dólares se habrían esfumado del informe sin ningún mensaje de error.

## Cómo se escribe

Tres o cuatro líneas alcanzan. Van **arriba** del resultado, no en un anexo:

> **Definiciones.** Pago = movimiento \`card_payment\` o \`qr_payment\` en estado \`completed\`. Volumen convertido a USD con el tipo de cambio del día de la operación; las cuentas en USD se toman 1:1. Mes calendario en UTC. Excluye reversos y comisiones.
>
> **Limitaciones.** Agosto de 2025 cierra el 31; los movimientos posteriores al 15 de septiembre no están en los datos.

Fíjate en lo que no dice: no menciona \`LEFT JOIN\`, ni CTE, ni \`coalesce\`. Quien pregunta no quiere leer tu SQL, quiere saber qué entra y qué queda afuera.

## Reversible y reproducible

Dos costumbres que hacen que los supuestos valgan:

- **Parámetros arriba.** Las fechas y los umbrales van en una CTE o en las primeras líneas, no dispersos en cinco \`WHERE\`. Cambiar «30 días» por «60 días» debería ser una edición, no seis.
- **Sin «hoy» implícito.** Una consulta con \`now()\` da un resultado distinto cada día y no se puede auditar. Para un informe que alguien va a revisar, fija la fecha de corte como constante y decláralo.

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

Una consulta que se ejecuta sin errores no es una consulta correcta. Los errores que llegan a una reunión no son de sintaxis: son filas duplicadas por un join, un denominador equivocado, un porcentaje calculado sobre nueve casos. Nada de eso se ve mirando el SQL; se ve mirando el resultado con desconfianza.

Antes de enviar cualquier tabla, dedícale cinco minutos a estas comprobaciones. Son las mismas que va a hacer quien te quiera corregir.

## 1. El total tiene que cerrar

Si desagregaste por ciudad, la suma de las ciudades debe dar el total sin desagregar. Si no da, hay filas que se duplicaron en un join o que se perdieron en uno interno.

\`\`\`sql
SELECT count(*) AS pedidos FROM orders WHERE status = 'delivered';
\`\`\`

Guarda ese número y compáralo con el \`sum()\` de tu tabla final. Es la prueba más barata que existe y atrapa la mitad de los errores reales.

## 2. Contar filas antes de agregar

La duplicación por join no se nota después del \`GROUP BY\`: un \`sum()\` inflado sigue pareciendo un número. En **Pídelo**, unir \`orders\` con \`order_items\` multiplica cada pedido por su cantidad de ítems. Si después sumas \`total\`, el importe se dispara.

\`\`\`sql
SELECT count(*) AS filas, count(DISTINCT o.id) AS pedidos
FROM orders AS o
INNER JOIN order_items AS oi ON oi.order_id = o.id;
\`\`\`

Cuando \`filas\` supera a \`pedidos\`, cualquier métrica a nivel pedido calculada sobre ese join está mal. La salida es agregar los ítems en una CTE antes de unirlos, o usar \`count(DISTINCT o.id)\`.

## 3. Mirar los extremos, no el promedio

Ordena tu resultado por la métrica, hacia arriba y hacia abajo, y mira las cinco primeras filas de cada lado. Los valores absurdos viven en los bordes: una ciudad con 400 % de crecimiento, un restaurante con calificación 5,0, un género con −50 %.

Casi siempre es un denominador chico. Un restaurante con dos pedidos y ambos tardíos tiene 100 % de tardanza y no significa nada. Por eso los rankings de negocio llevan un **umbral mínimo de volumen**, declarado:

\`\`\`sql
HAVING count(*) >= 30
\`\`\`

El umbral es un supuesto más: elígelo antes de ver los resultados, no después, o estarás eligiendo la conclusión.

## 4. Revisar los nulos y los ceros

¿Hay filas con \`NULL\` donde esperabas un valor? En Pídelo, \`restaurant_rating\` es nulo en el 12 % de las calificaciones y \`courier_id\` falta en los pedidos cancelados. Un \`avg()\` los ignora —lo cual suele ser correcto—, pero entonces el promedio se calcula sobre menos filas de las que muestra tu columna de conteo. Si esas dos columnas van juntas en la tabla, aclara cuál es cuál.

Y los ceros: una división puede fallar o, peor, devolver un resultado engañoso. \`nullif(denominador, 0)\` convierte el error en \`NULL\`, que es honesto.

## 5. ¿La magnitud es creíble?

Este es el chequeo que no es técnico. ¿El 45 % de recompra es plausible para un delivery? ¿La caída de 9 % en agosto coincide con algo que pasó? Si tu número contradice lo que la organización cree saber, es mucho más probable que el error sea tuyo a que hayas descubierto algo. Vuelve a los filtros antes de escribir el correo.

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
