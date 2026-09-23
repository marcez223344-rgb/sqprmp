import type { QuestionDef } from "../schemas/question";

const section = "casos-de-negocio";
const especificar = "de-un-pedido-vago-a-una-especificacion";
const supuestos = "supuestos-que-se-escriben";
const revisar = "revisar-antes-de-enviar";

export const questions: QuestionDef[] = [
  {
    slug: "cn-q01-primera-decision",
    section,
    lesson: especificar,
    type: "single",
    difficulty: "easy",
    topic: "Especificar un pedido de negocio",
    tags: ["casos-de-negocio", "especificacion"],
    estimated_seconds: 45,
    prompt_md:
      "Un colega te pide «las ventas de México del mes pasado». ¿Cuál de estas decisiones determina la estructura de la consulta (el `GROUP BY`) y por lo tanto conviene resolver primero?",
    options: [
      {
        key: "a",
        body_md:
          "La unidad de análisis: si el resultado es una cifra, una serie mensual o una tabla por canal.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Cuántos decimales lleva el importe en la tabla final.",
        is_correct: false,
        why_incorrect_md:
          "El formato se decide al final y no cambia qué mide la consulta. Es una decisión tuya que basta con aplicar de forma consistente.",
      },
      {
        key: "c",
        body_md: "Si conviene usar una CTE o una subconsulta.",
        is_correct: false,
        why_incorrect_md:
          "Es una elección de estilo entre formas equivalentes. No cambia el resultado ni depende del pedido de negocio.",
      },
      {
        key: "d",
        body_md: "Qué índices existen sobre la tabla de pedidos.",
        is_correct: false,
        why_incorrect_md:
          "Afecta cuánto tarda la consulta, no qué responde. La especificación se decide antes de pensar en rendimiento.",
      },
    ],
    explanation_md:
      "El grano —una fila por qué cosa— define el `GROUP BY` y con él la mayor parte de la consulta. Formato, estilo y rendimiento se ajustan después, sin cambiar la pregunta que se responde.",
    is_published: true,
  },
  {
    slug: "cn-q02-cifra-sin-comparacion",
    section,
    lesson: especificar,
    type: "true_false",
    difficulty: "easy",
    topic: "Base de comparación",
    tags: ["casos-de-negocio", "metricas"],
    estimated_seconds: 40,
    prompt_md:
      "Ante la pregunta «¿por qué cayeron las ventas?», entregar el total de ventas del mes en cuestión es una respuesta completa.",
    options: [
      { key: "a", body_md: "Falso", is_correct: true },
      {
        key: "b",
        body_md: "Verdadero",
        is_correct: false,
        why_incorrect_md:
          "Un total suelto no permite saber si hubo caída ni de qué tamaño. La palabra «cayeron» ya implica una comparación que la respuesta tiene que incluir.",
      },
    ],
    explanation_md:
      "Toda pregunta sobre un cambio necesita una base de comparación explícita: el mes anterior, el mismo mes del año pasado o el plan. Sin ella, el número es verdadero e inútil.",
    is_published: true,
  },
  {
    slug: "cn-q03-descomponer-ingresos",
    section,
    lesson: especificar,
    type: "scenario",
    difficulty: "intermediate",
    topic: "Descomposición de métricas",
    tags: ["casos-de-negocio", "metricas", "diagnostico"],
    estimated_seconds: 70,
    prompt_md:
      "Los ingresos de agosto cayeron 9 % contra julio. Calculaste que los pedidos bajaron 8 % y que el ticket promedio quedó prácticamente igual. ¿Cuál es la conclusión que se desprende de esos números?",
    options: [
      {
        key: "a",
        body_md:
          "La caída es de volumen: se vendieron menos pedidos, no más baratos. Hay que investigar demanda, tráfico o disponibilidad.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Hubo una guerra de precios y conviene revisar los descuentos.",
        is_correct: false,
        why_incorrect_md:
          "Una caída de precios se vería en el ticket promedio, que en este caso no se movió. Los descuentos no explican una baja de pedidos.",
      },
      {
        key: "c",
        body_md: "Los datos están mal: si el ticket no cambió, los ingresos no podían caer.",
        is_correct: false,
        why_incorrect_md:
          "Los ingresos son pedidos por ticket. Con el ticket estable, una caída de 8 % en pedidos produce casi exactamente una caída de 9 % en ingresos: los números son coherentes.",
      },
      {
        key: "d",
        body_md: "Se perdieron clientes grandes, porque el ticket promedio se mantuvo.",
        is_correct: false,
        why_incorrect_md:
          "Si se hubieran ido los clientes de mayor ticket, el promedio de los que quedan habría bajado. Un promedio estable sugiere que se perdieron pedidos de todos los tamaños.",
      },
    ],
    explanation_md:
      "Descomponer ingresos en pedidos × ticket permite ver cuál de los dos factores se movió. Aquí el ticket queda quieto y los pedidos caen: el problema es de volumen, y esa es una conversación distinta a la de precios.",
    is_published: true,
  },
  {
    slug: "cn-q04-mes-pasado-huso",
    section,
    lesson: especificar,
    type: "fill_blank",
    difficulty: "intermediate",
    topic: "Cortes de calendario con timestamptz",
    tags: ["casos-de-negocio", "fechas", "timestamptz"],
    estimated_seconds: 60,
    prompt_md:
      "`orders.created_at` es `timestamptz`. Para que el mes de calendario no dependa de la zona horaria de quien ejecuta la consulta, hay que fijar el huso: `date_trunc('month', created_at AT TIME ZONE '____')::date`. Escribe el valor que hace el corte reproducible cuando el informe se declara en hora universal.",
    code_md: null,
    answer: { accepted: ["UTC", "utc"], case_sensitive: false },
    explanation_md:
      "Sin `AT TIME ZONE`, `date_trunc` usa el huso de la sesión y un pedido del 1 de marzo a las 00:30 UTC cae en febrero para una sesión en Bogotá. Fijar `'UTC'` (o el huso del negocio, declarándolo) hace que el resultado sea igual en cualquier máquina.",
    is_published: true,
  },
  {
    slug: "cn-q05-que-preguntar",
    section,
    lesson: especificar,
    type: "multiple",
    difficulty: "intermediate",
    topic: "Qué consultar con quien pide",
    tags: ["casos-de-negocio", "especificacion", "comunicacion"],
    estimated_seconds: 80,
    prompt_md:
      "Te piden «cuántos clientes activos tenemos en México». ¿Qué ambigüedades justifican preguntarle a quien pidió el dato, porque cambian el resultado de forma material? Marca todas las que correspondan.",
    options: [
      {
        key: "a",
        body_md: "Qué significa «activo»: con una compra en 30 días, en 90 días o alguna vez.",
        is_correct: true,
      },
      {
        key: "b",
        body_md:
          "Si «México» es el país del cliente, el del vendedor o la ciudad de entrega del pedido.",
        is_correct: true,
      },
      {
        key: "c",
        body_md: "Si los pedidos cancelados cuentan como actividad.",
        is_correct: true,
      },
      {
        key: "d",
        body_md: "Si la columna del resultado se llama `clientes_activos` o `activos`.",
        is_correct: false,
        why_incorrect_md:
          "El nombre de la columna no cambia el número. Es una decisión tuya: elígela con criterio y sé consistente, pero no ocupes con eso la única pregunta que te van a contestar.",
      },
      {
        key: "e",
        body_md: "Si conviene resolverlo con `EXISTS` o con `INNER JOIN` más `DISTINCT`.",
        is_correct: false,
        why_incorrect_md:
          "Son formas equivalentes de escribir lo mismo. Quien pide el dato no tiene cómo opinar y el resultado es idéntico.",
      },
    ],
    explanation_md:
      "Vale la pena preguntar solo aquello que cambia la respuesta: la definición de la métrica, el criterio geográfico y qué estados cuentan. El formato y la técnica los decides tú y los escribes junto al resultado.",
    is_published: true,
  },
  {
    slug: "cn-q06-inner-join-supuesto",
    section,
    lesson: supuestos,
    type: "query_interpretation",
    difficulty: "intermediate",
    topic: "Supuestos escondidos en el join",
    tags: ["casos-de-negocio", "join", "supuestos"],
    estimated_seconds: 75,
    prompt_md:
      "Te pidieron «el volumen mensual de movimientos de la billetera». Escribiste esto. ¿Qué supuesto introduce la consulta sin decirlo?",
    code_md:
      "```sql\nSELECT\n  date_trunc('month', t.created_at AT TIME ZONE 'UTC')::date AS mes,\n  round(sum(t.amount), 2) AS volumen\nFROM transactions AS t\nINNER JOIN merchants AS m ON m.id = t.merchant_id\nWHERE t.status = 'completed'\nGROUP BY 1\nORDER BY 1;\n```",
    options: [
      {
        key: "a",
        body_md:
          "Que «movimiento» significa solo los que tienen comercio asociado: el `INNER JOIN` descarta recargas, retiros, comisiones y transferencias.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Que todos los movimientos están en la misma moneda.",
        is_correct: false,
        why_incorrect_md:
          "Ese también es un problema real de la consulta, pero no lo introduce el join: lo introduce el `sum()` sobre importes de monedas distintas. La pregunta es por el supuesto que agrega esta línea de más.",
      },
      {
        key: "c",
        body_md: "Que el mes se calcula en la zona horaria de la sesión.",
        is_correct: false,
        why_incorrect_md:
          "Justamente no: `AT TIME ZONE 'UTC'` fija el huso, que es lo correcto. Esa parte de la consulta está bien.",
      },
      {
        key: "d",
        body_md: "Que los movimientos `pending` se cuentan como completados.",
        is_correct: false,
        why_incorrect_md:
          "El `WHERE t.status = 'completed'` los excluye explícitamente. Es un supuesto declarado en el código, no uno escondido.",
      },
    ],
    explanation_md:
      "Un `INNER JOIN` es un filtro disfrazado: elimina en silencio las filas que no tienen pareja. Aquí convierte «movimientos» en «pagos en comercios» sin que el nombre de la métrica lo diga.",
    is_published: true,
  },
  {
    slug: "cn-q07-tipo-de-cambio-del-dia",
    section,
    lesson: supuestos,
    type: "single",
    difficulty: "advanced",
    topic: "Conversión de monedas",
    tags: ["casos-de-negocio", "supuestos", "fx"],
    estimated_seconds: 70,
    prompt_md:
      "Preparas un informe mensual histórico que convierte importes locales a dólares. ¿Por qué conviene usar la cotización del día de cada operación en lugar de la cotización de hoy?",
    options: [
      {
        key: "a",
        body_md:
          "Porque con la cotización del día el informe es reproducible: enero da lo mismo hoy y dentro de seis meses.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Porque la cotización del día siempre da un volumen más alto.",
        is_correct: false,
        why_incorrect_md:
          "No hay una dirección garantizada: puede dar más o menos según cómo se haya movido la moneda. El motivo no es el nivel del número, sino su estabilidad.",
      },
      {
        key: "c",
        body_md: "Porque usar una sola cotización para todo el período es un error de SQL.",
        is_correct: false,
        why_incorrect_md:
          "Es una decisión de negocio perfectamente válida (a veces se busca justamente aislar el efecto del tipo de cambio). Lo que no es válido es no declarar cuál usaste.",
      },
      {
        key: "d",
        body_md: "Porque `fx_rates` solo permite unir por fecha exacta.",
        is_correct: false,
        why_incorrect_md:
          "Técnicamente podrías unir por cualquier fecha, incluida la más reciente. La razón para elegir el día de la operación es de análisis, no de esquema.",
      },
    ],
    explanation_md:
      "Convertir con la cotización de hoy reescribe el pasado en cada ejecución: la serie cambia sin que haya cambiado ningún dato. La cotización del día de la operación congela la historia y hace auditable el informe.",
    is_published: true,
  },
  {
    slug: "cn-q08-ended-on-null",
    section,
    lesson: supuestos,
    type: "error_diagnosis",
    difficulty: "intermediate",
    topic: "NULL como estado de negocio",
    tags: ["casos-de-negocio", "null", "supuestos"],
    estimated_seconds: 80,
    prompt_md:
      "Esta consulta debería contar las suscripciones vigentes al 31 de agosto de 2025. Devuelve un número muchísimo más chico que el esperado y sin ningún error. ¿Por qué?",
    code_md:
      "```sql\nSELECT count(*) AS vigentes\nFROM subscriptions\nWHERE started_on <= DATE '2025-08-31'\n  AND ended_on > DATE '2025-08-31';\n```",
    options: [
      {
        key: "a",
        body_md:
          "Las suscripciones abiertas tienen `ended_on` nulo, y `NULL > fecha` no es verdadero, así que quedan fuera del conteo.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "`count(*)` no cuenta las filas con algún valor nulo.",
        is_correct: false,
        why_incorrect_md:
          "`count(*)` cuenta filas, tengan o no nulos. La pérdida ocurre antes, en el `WHERE`, que descarta las filas cuya condición no es verdadera.",
      },
      {
        key: "c",
        body_md: "Falta `AT TIME ZONE 'UTC'` en las comparaciones de fecha.",
        is_correct: false,
        why_incorrect_md:
          "`started_on` y `ended_on` son de tipo `date`, no `timestamptz`: no tienen hora ni huso, así que la zona horaria no interviene.",
      },
      {
        key: "d",
        body_md: "El operador correcto sería `>=` en lugar de `>`.",
        is_correct: false,
        why_incorrect_md:
          "Cambiar el operador mueve el resultado en una sola fila por período que termina exactamente ese día; no explica una diferencia grande, y sigue perdiendo todas las filas con `ended_on` nulo.",
      },
    ],
    explanation_md:
      "En estos datos, `ended_on IS NULL` significa «vigente». Cualquier comparación con `NULL` da `NULL`, que el `WHERE` trata como no verdadero. La condición necesita su rama explícita: `(ended_on IS NULL OR ended_on > DATE '2025-08-31')`.",
    is_published: true,
  },
  {
    slug: "cn-q09-donde-se-esconden",
    section,
    lesson: supuestos,
    type: "matching",
    difficulty: "intermediate",
    topic: "Dónde se esconden los supuestos",
    tags: ["casos-de-negocio", "supuestos"],
    estimated_seconds: 90,
    prompt_md:
      "Relaciona cada decisión silenciosa de una consulta con el supuesto de negocio que introduce.",
    code_md: null,
    pairs: [
      {
        left: "`INNER JOIN` con la tabla de comercios",
        right: "Solo cuentan los pagos en comercios",
      },
      {
        left: "`status = 'completed'`",
        right: "Los pagos pendientes no forman parte de la métrica",
      },
      {
        left: "`sum(amount)` sobre varias monedas",
        right: "Los importes de distintas monedas son sumables",
      },
      {
        left: "`coalesce(rating, 0)` en un promedio",
        right: "No tener calificación equivale a tener cero",
      },
      {
        left: "`created_at >= now() - INTERVAL '30 days'`",
        right: "El resultado cambia cada día que se ejecuta",
      },
    ],
    explanation_md:
      "Cada línea de una consulta de negocio codifica una definición. Filtros, joins, tratamiento de nulos, unidades y ventanas de tiempo son los cinco lugares donde más seguido se esconde un supuesto que nadie escribió.",
    is_published: true,
  },
  {
    slug: "cn-q10-join-duplica-filas",
    section,
    lesson: revisar,
    type: "error_diagnosis",
    difficulty: "advanced",
    topic: "Duplicación por join antes de agregar",
    tags: ["casos-de-negocio", "join", "duplicados"],
    estimated_seconds: 90,
    prompt_md:
      "Esta consulta debería dar la facturación entregada por ciudad. Los importes son varias veces más altos que los del sistema contable. ¿Cuál es la causa?",
    code_md:
      "```sql\nSELECT\n  ci.name AS ciudad,\n  round(sum(o.total), 2) AS facturacion\nFROM orders AS o\nINNER JOIN order_items AS oi ON oi.order_id = o.id\nINNER JOIN restaurants AS r ON r.id = o.restaurant_id\nINNER JOIN cities AS ci ON ci.id = r.city_id\nWHERE o.status = 'delivered'\nGROUP BY ci.name;\n```",
    options: [
      {
        key: "a",
        body_md:
          "El join con `order_items` repite cada pedido una vez por ítem, así que `o.total` se suma tantas veces como líneas tenga el pedido.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Falta un `DISTINCT` en el `SELECT` para eliminar las ciudades repetidas.",
        is_correct: false,
        why_incorrect_md:
          "El `GROUP BY` ya deja una fila por ciudad. `DISTINCT` no repararía la suma, porque las filas duplicadas se consumen dentro del agregado antes de llegar al resultado.",
      },
      {
        key: "c",
        body_md: "El `INNER JOIN` con `cities` multiplica los pedidos por la cantidad de ciudades.",
        is_correct: false,
        why_incorrect_md:
          "Cada restaurante pertenece a una sola ciudad, así que ese join no agrega filas. El que multiplica es el de los ítems.",
      },
      {
        key: "d",
        body_md: "Hay que sumar `oi.quantity * oi.unit_price` en lugar de `o.total`.",
        is_correct: false,
        why_incorrect_md:
          "Es una alternativa válida y da un resultado correcto, pero cambia la definición (deja fuera envío y descuento). La pregunta es por la causa del número inflado, que es la duplicación de filas.",
      },
    ],
    explanation_md:
      "Unir a un grano más fino multiplica las filas del grano original. Si no necesitas los ítems, no los unas; si los necesitas, agrégalos en una CTE antes de unirlos, o suma con `sum(DISTINCT ...)` solo cuando el identificador lo permita. El chequeo preventivo es comparar `count(*)` con `count(DISTINCT o.id)`.",
    is_published: true,
  },
  {
    slug: "cn-q11-umbral-minimo",
    section,
    lesson: revisar,
    type: "scenario",
    difficulty: "advanced",
    topic: "Umbrales de volumen en rankings",
    tags: ["casos-de-negocio", "having", "revision"],
    estimated_seconds: 85,
    prompt_md:
      "Tu tabla de crecimiento por género encabeza con `samba`: 4 oyentes en la ventana previa y 9 en la actual, +125 %. El resto de los géneros se mueve entre −14 % y +18 %. ¿Cuál es la forma profesional de manejarlo?",
    options: [
      {
        key: "a",
        body_md:
          "Fijar un umbral mínimo de volumen antes de mirar los resultados, aplicarlo en `HAVING` y declararlo junto a la tabla.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Sacar `samba` de la tabla porque el número no parece razonable.",
        is_correct: false,
        why_incorrect_md:
          "Eliminar una fila puntual porque no gusta el resultado es elegir la conclusión. La regla tiene que ser una sola, definida de antemano y aplicada a todos por igual.",
      },
      {
        key: "c",
        body_md: "Dejarlo tal cual: el dato es correcto y quien lee sabrá interpretarlo.",
        is_correct: false,
        why_incorrect_md:
          "El dato es correcto y la lectura es engañosa igual: la primera fila de una tabla ordenada se lee como la conclusión. Con cuatro casos, el porcentaje no es interpretable.",
      },
      {
        key: "d",
        body_md: "Reemplazar el porcentaje por la diferencia absoluta de oyentes en toda la tabla.",
        is_correct: false,
        why_incorrect_md:
          "La diferencia absoluta es información útil y conviene mostrarla, pero por sí sola favorece siempre a los géneros grandes. No sustituye al umbral: lo complementa.",
      },
    ],
    explanation_md:
      "Los porcentajes con denominadores chicos son la trampa más común de los rankings de negocio. La solución es un umbral mínimo de volumen elegido antes de ver los datos, aplicado con `HAVING` y escrito en la entrega junto con las columnas de volumen absoluto.",
    is_published: true,
  },
  {
    slug: "cn-q12-correlacion-no-es-causa",
    section,
    lesson: revisar,
    type: "scenario",
    difficulty: "advanced",
    topic: "Qué se puede concluir de una comparación",
    tags: ["casos-de-negocio", "interpretacion", "revision"],
    estimated_seconds: 90,
    prompt_md:
      "Mediste que quienes estrenaron la app con el cupón de bienvenida recompran 45,20 % (177 clientes) contra 40,12 % de quienes estrenaron sin promoción (2777 clientes). Marketing quiere titular «el cupón aumenta la fidelidad 5 puntos». ¿Qué corresponde responder?",
    options: [
      {
        key: "a",
        body_md:
          "Que los grupos no se formaron al azar —quien busca un cupón ya es distinto— y que con 177 casos la diferencia puede ser ruido: hay que reportarla como asociación, no como efecto.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Que el titular es correcto porque la consulta está bien escrita.",
        is_correct: false,
        why_incorrect_md:
          "Que el SQL sea correcto garantiza que los números son los que pediste, no que la interpretación causal sea válida. Son dos cosas independientes.",
      },
      {
        key: "c",
        body_md: "Que hay que repetir la medición con una ventana de 90 días para confirmar.",
        is_correct: false,
        why_incorrect_md:
          "Ampliar la ventana cambia el número pero no el problema: los dos grupos siguen siendo distintos entre sí por razones ajenas al cupón.",
      },
      {
        key: "d",
        body_md: "Que la diferencia se debe a que el grupo con cupón es mucho más chico.",
        is_correct: false,
        why_incorrect_md:
          "El tamaño desigual no sesga la estimación por sí mismo; sí la hace menos precisa. El problema de fondo es cómo se formaron los grupos, no cuántos son.",
      },
    ],
    explanation_md:
      "Cuando los grupos se autoseleccionan, la diferencia observada mezcla el efecto de la intervención con el de quién la eligió. Lo que se entrega es la asociación, el tamaño de la muestra y la propuesta de medirlo bien: asignación aleatoria en la próxima campaña.",
    is_published: true,
  },
];
