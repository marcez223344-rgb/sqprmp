import type { QuestionDef } from "../schemas/question";

const section = "proyectos-finales";
const l1 = "proyectos-finales-planificar-antes-de-escribir";
const l2 = "proyectos-finales-revisar-tu-propio-trabajo";
const l3 = "proyectos-finales-del-curso-al-trabajo";

export const questions: QuestionDef[] = [
  {
    slug: "pf-q01-pregunta-lista-para-escribir",
    section,
    lesson: l1,
    type: "scenario",
    difficulty: "intermediate",
    topic: "Cuándo un pedido está listo para convertirse en SQL",
    tags: ["planificacion", "granularidad", "definiciones"],
    estimated_seconds: 60,
    prompt_md:
      "Marketing te escribe: «necesito saber cómo viene la retención». ¿Cuál es el primer paso antes de abrir el editor?",
    code_md: null,
    options: [
      {
        key: "a",
        body_md:
          "Acordar qué devuelve cada fila del resultado y con qué definición (por ejemplo: una fila por mes de alta, con el porcentaje de personas que volvieron a comprar entre el día 30 y el 60).",
        is_correct: true,
      },
      {
        key: "b",
        body_md:
          "Escribir una consulta exploratoria sobre la tabla más grande para ver qué columnas hay disponibles y decidir a partir de eso.",
        is_correct: false,
        why_incorrect_md:
          "Explorar el esquema es útil, pero no reemplaza la definición. Si dejas que las columnas disponibles definan la métrica, terminas respondiendo la pregunta que los datos permiten y no la que el negocio hizo.",
      },
      {
        key: "c",
        body_md:
          "Calcular la retención con la definición estándar de la industria y entregarla; si no les sirve, la ajustas después.",
        is_correct: false,
        why_incorrect_md:
          "No existe una definición estándar única de retención: cambia el evento que cuenta, la ventana y el denominador. Entregar un número sin acordar la definición es la forma más rápida de que alguien decida con la métrica equivocada.",
      },
      {
        key: "d",
        body_md:
          "Pedir acceso a más tablas, porque una sola tabla nunca alcanza para calcular retención.",
        is_correct: false,
        why_incorrect_md:
          "La cantidad de tablas es una consecuencia de la definición, no un paso previo. Con una tabla de eventos y una fecha de alta ya se puede calcular retención.",
      },
    ],
    explanation_md:
      "Una pregunta está lista cuando puedes escribir en una línea qué es una fila del resultado. Esa frase fija la granularidad, el universo y la métrica de una sola vez, y es lo que después te permite revisar el resultado: si sabes que debería haber una fila por mes, sabes cuántas filas esperar.",
    is_published: true,
  },
  {
    slug: "pf-q02-rango-semiabierto",
    section,
    lesson: l1,
    type: "single",
    difficulty: "intermediate",
    topic: "Rangos de fechas sobre marcas de tiempo",
    tags: ["fechas", "rangos", "timestamptz"],
    estimated_seconds: 60,
    prompt_md:
      "`orders.placed_at` es `timestamptz`, es decir, fecha y hora con zona horaria (parecido al `datetime` de otras bases de datos). Quieres los pedidos del primer semestre de 2025 en UTC, sin perder ninguno y de forma que el motor pueda usar el índice sobre `placed_at`. ¿Cuál condición es correcta?",
    code_md: null,
    options: [
      {
        key: "a",
        body_md:
          "`placed_at >= TIMESTAMPTZ '2025-01-01 00:00:00+00' AND placed_at < TIMESTAMPTZ '2025-07-01 00:00:00+00'`",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "`placed_at AT TIME ZONE 'UTC' BETWEEN '2025-01-01' AND '2025-06-30'`",
        is_correct: false,
        why_incorrect_md:
          "`BETWEEN` es inclusivo de los dos lados, y `'2025-06-30'` se interpreta como `2025-06-30 00:00:00`. Se pierden todos los pedidos de las 24 horas del 30 de junio salvo los de la medianoche exacta. Además, aplicar `AT TIME ZONE` sobre la columna impide usar el índice.",
      },
      {
        key: "c",
        body_md: "`date_trunc('month', placed_at) BETWEEN '2025-01-01' AND '2025-06-01'`",
        is_correct: false,
        why_incorrect_md:
          "Trunca sin fijar el huso, así que el mes de los pedidos de fin de mes depende de la zona de la sesión. Además aplica una función sobre la columna filtrada, lo que impide usar el índice sobre `placed_at`.",
      },
      {
        key: "d",
        body_md: "`extract(year FROM placed_at) = 2025 AND extract(month FROM placed_at) <= 6`",
        is_correct: false,
        why_incorrect_md:
          "Devuelve el semestre correcto solo si la zona de la sesión es UTC, porque `extract` sobre un `timestamptz` usa el huso actual. También impide el uso de índices.",
      },
    ],
    explanation_md:
      "La forma segura de acotar un período sobre marcas de tiempo es el rango semiabierto: `>=` el inicio y `<` el inicio del período siguiente. No depende de la precisión de la columna (segundos, milisegundos) y nunca deja horas fuera. Sobre `timestamptz` hay que fijar además el huso, o el resultado cambia según quién ejecute la consulta: escribir los extremos como `TIMESTAMPTZ` con `+00` lo fija en los propios valores y deja la columna sola, así que el índice sigue sirviendo. `placed_at AT TIME ZONE 'UTC' >= '2025-01-01'` devuelve las mismas filas, pero como transforma la columna, el índice ya no sirve.",
    is_published: true,
  },
  {
    slug: "pf-q03-at-time-zone-reproducible",
    section,
    lesson: l1,
    type: "true_false",
    difficulty: "intermediate",
    topic: "Reproducibilidad de un informe con timestamptz",
    tags: ["timestamptz", "husos", "reproducibilidad"],
    estimated_seconds: 45,
    prompt_md:
      "Dos personas ejecutan `SELECT date_trunc('month', created_at), count(*) FROM orders GROUP BY 1` sobre la misma base y el mismo dato, una con la sesión en `America/Bogota` y otra en `UTC`. Pueden obtener conteos mensuales distintos.",
    code_md: null,
    options: [
      { key: "a", body_md: "Verdadero", is_correct: true },
      {
        key: "b",
        body_md: "Falso",
        is_correct: false,
        why_incorrect_md:
          "`date_trunc` sobre un `timestamptz` convierte primero al huso de la sesión. Un pedido de las 22:00 del 31 de enero en Bogotá es el 1 de febrero en UTC, así que cae en meses distintos y los conteos difieren.",
      },
    ],
    explanation_md:
      "Un `timestamptz` guarda un instante absoluto, pero se muestra y se trunca según el huso de la sesión. Por eso todo informe por período fija el huso explícitamente con `AT TIME ZONE 'UTC'` (o el huso de negocio que se haya acordado) y lo declara junto al resultado.",
    is_published: true,
  },
  {
    slug: "pf-q04-coalesce-en-la-resta",
    section,
    lesson: l2,
    type: "fill_blank",
    difficulty: "intermediate",
    topic: "Neutralizar NULL antes de una resta",
    tags: ["null", "coalesce", "left_join"],
    estimated_seconds: 45,
    prompt_md:
      "Un informe resta las devoluciones al bruto, pero los meses sin devoluciones quedan en `NULL` porque el `LEFT JOIN` no encontró filas. Completa la función que falta para que esos meses den 0:\n\n`sum(p.amount) - ______(sum(r.refund_amount), 0) AS net_amount`\n\nEscribe solo el nombre de la función.",
    code_md: null,
    answer: {
      accepted: ["coalesce", "coalesce(sum(r.refund_amount), 0)"],
      case_sensitive: false,
    },
    explanation_md:
      "`coalesce` devuelve el primer argumento no nulo, así que `coalesce(sum(r.refund_amount), 0)` convierte la ausencia de devoluciones en un cero. Sin ella, cualquier operación aritmética con `NULL` devuelve `NULL`, y esos meses quedan con `net_amount` vacío aunque sí haya habido ventas.",
    is_published: true,
  },
  {
    slug: "pf-q05-cuantas-filas-esperar",
    section,
    lesson: l2,
    type: "query_interpretation",
    difficulty: "advanced",
    topic: "Predecir la cantidad de filas de un informe",
    tags: ["revision", "granularidad", "cardinalidad"],
    estimated_seconds: 75,
    prompt_md:
      "El dataset tiene clientes en 6 países y pedidos cobrados en los 21 meses que van de enero de 2024 a septiembre de 2025, con actividad en todos los países todos los meses. ¿Cuántas filas debería devolver esta consulta si está bien escrita?",
    code_md:
      "SELECT c.country,\n       date_trunc('month', o.created_at AT TIME ZONE 'UTC')::date AS month,\n       count(*) AS paid_orders,\n       sum(p.amount) AS gross_amount\nFROM orders o\nJOIN customers c ON c.id = o.customer_id\nJOIN payments p ON p.order_id = o.id AND p.status IN ('approved', 'refunded')\nGROUP BY c.country, month;",
    options: [
      { key: "a", body_md: "126 filas: una por cada combinación de país y mes.", is_correct: true },
      {
        key: "b",
        body_md: "21 filas: una por mes, porque `GROUP BY` colapsa los países.",
        is_correct: false,
        why_incorrect_md:
          "`GROUP BY c.country, month` forma un grupo por cada combinación distinta de las dos columnas, no por la segunda sola.",
      },
      {
        key: "c",
        body_md: "6 filas: una por país, porque el mes es una columna derivada.",
        is_correct: false,
        why_incorrect_md:
          "Una expresión derivada agrupa igual que una columna: `date_trunc(...)` participa del `GROUP BY` y multiplica los grupos.",
      },
      {
        key: "d",
        body_md:
          "Una fila por pedido cobrado, porque el join a `payments` está al nivel del pedido.",
        is_correct: false,
        why_incorrect_md:
          "El join define qué filas entran a la agregación, pero el nivel del resultado lo fija el `GROUP BY`. Sin `GROUP BY` habría una fila por pedido; con él, una por grupo.",
      },
    ],
    explanation_md:
      "Predecir la cantidad de filas antes de ejecutar es el chequeo más barato que existe: 6 países × 21 meses = 126 filas como máximo. Si el resultado trae 1200, hay un join que multiplica; si trae 40, hay un filtro que borró grupos enteros. El número esperado sale de la granularidad que declaraste al planificar.",
    is_published: true,
  },
  {
    slug: "pf-q06-diagnostico-inner-join-ratings",
    section,
    lesson: l2,
    type: "error_diagnosis",
    difficulty: "advanced",
    topic: "Un join interno que cambia el universo del informe",
    tags: ["left_join", "inner_join", "denominador"],
    estimated_seconds: 90,
    prompt_md:
      "Este informe debía mostrar, por restaurante, todos los pedidos entregados y su calificación promedio. Devuelve muchos menos pedidos de los que hay. ¿Cuál es el error?",
    code_md:
      "SELECT r.name AS restaurant,\n       count(*) AS delivered_orders,\n       round(avg(ra.restaurant_rating), 2) AS avg_rating\nFROM orders o\nJOIN restaurants r ON r.id = o.restaurant_id\nJOIN ratings ra ON ra.order_id = o.id\nWHERE o.status = 'delivered'\nGROUP BY r.id, r.name;",
    options: [
      {
        key: "a",
        body_md:
          "El join a `ratings` es interno: descarta los pedidos entregados que nadie calificó, así que `delivered_orders` cuenta pedidos calificados y no pedidos entregados. Debe ser `LEFT JOIN`.",
        is_correct: true,
      },
      {
        key: "b",
        body_md:
          "Falta `HAVING count(*) > 0`, porque los restaurantes sin calificaciones producen grupos vacíos que el motor descarta mal.",
        is_correct: false,
        why_incorrect_md:
          "Un grupo vacío no existe: si no hay filas, no hay grupo. `HAVING count(*) > 0` no cambia nada, y el problema es de qué filas llegan a la agregación, no de cómo se filtran los grupos.",
      },
      {
        key: "c",
        body_md:
          "`avg` no puede usarse junto a `count(*)` en el mismo `SELECT` cuando una de las tablas tiene valores nulos.",
        is_correct: false,
        why_incorrect_md:
          "Sí puede: `avg` ignora los `NULL` y `count(*)` cuenta todas las filas del grupo. Convivir en el mismo `SELECT` es justamente lo que permite reportar ambos números.",
      },
      {
        key: "d",
        body_md:
          "El `WHERE o.status = 'delivered'` debería estar en el `ON` del join a `ratings` para no perder filas.",
        is_correct: false,
        why_incorrect_md:
          "Mover ese filtro al `ON` de `ratings` no recupera ningún pedido: el filtro es sobre `orders` y con un join interno los pedidos sin calificación se pierden igual.",
      },
    ],
    explanation_md:
      "Cuando una tabla solo cubre una parte del universo —calificaciones, devoluciones, reembolsos—, unirla con `INNER JOIN` redefine en silencio el conjunto que estás midiendo. El síntoma es siempre el mismo: un conteo menor al esperado. Con `LEFT JOIN`, `count(*)` sigue contando pedidos y `avg` calcula el promedio sobre las calificaciones que existen.",
    is_published: true,
  },
  {
    slug: "pf-q07-pedido-de-negocio-y-tecnica",
    section,
    lesson: l3,
    type: "matching",
    difficulty: "intermediate",
    topic: "Del pedido de negocio a la técnica adecuada",
    tags: ["cohortes", "funnels", "ranking", "calidad"],
    estimated_seconds: 90,
    prompt_md: "Relaciona cada pedido tal como llega en el trabajo con la técnica que lo resuelve.",
    code_md: null,
    pairs: [
      {
        left: "«¿La gente que se registró en marzo sigue usando el producto?»",
        right: "Cohortes por mes de alta con ventanas relativas a la fecha de registro",
      },
      {
        left: "«¿En qué paso del registro se nos cae la gente?»",
        right: "Funnel con pasos ordenados en el tiempo y denominador fijo",
      },
      {
        left: "«Dame los 5 vendedores más grandes de cada país»",
        right: "ROW_NUMBER con PARTITION BY país y un criterio de desempate explícito",
      },
      {
        left: "«Este total no coincide con el informe de finanzas»",
        right: "Reconciliación: recalcular la métrica sin joins y comparar dos caminos",
      },
      {
        left: "«La misma persona aparece dos veces en el listado»",
        right: "Deduplicación por clave de negocio con una regla de fila ganadora",
      },
    ],
    explanation_md:
      "Casi todos los pedidos de una vacante de analista caen en unas pocas familias. Reconocer a cuál pertenece un pedido en los primeros treinta segundos es lo que separa una tarde de trabajo de una semana: la técnica ya la sabes, lo que hay que entrenar es el mapeo.",
    is_published: true,
  },
  {
    slug: "pf-q08-chequeos-antes-de-entregar",
    section,
    lesson: l2,
    type: "multiple",
    difficulty: "advanced",
    topic: "Revisión previa a la entrega",
    tags: ["revision", "calidad", "entrega"],
    estimated_seconds: 90,
    prompt_md:
      "Terminaste un informe mensual por país y va a ir a finanzas. ¿Cuáles de estos chequeos aportan evidencia de que el resultado es correcto? Selecciona todos los que correspondan.",
    code_md: null,
    options: [
      {
        key: "a",
        body_md:
          "Comparar la cantidad de filas obtenida con la que predijiste a partir de la granularidad declarada.",
        is_correct: true,
      },
      {
        key: "b",
        body_md:
          "Recalcular el total de la métrica principal directamente sobre la tabla base, sin joins, y compararlo con la suma del informe.",
        is_correct: true,
      },
      {
        key: "c",
        body_md:
          "Verificar que agregar el último `LEFT JOIN` no aumentó la cantidad de filas de la tabla principal.",
        is_correct: true,
      },
      {
        key: "d",
        body_md:
          "Confirmar que la consulta corre sin errores y devuelve resultados en menos de un segundo.",
        is_correct: false,
        why_incorrect_md:
          "Que corra rápido y sin errores no dice nada sobre si el número es correcto. Los errores que importan en un informe son silenciosos: filas multiplicadas, filtros que borran grupos, definiciones equivocadas.",
      },
      {
        key: "e",
        body_md:
          "Ajustar la definición de la métrica hasta que el total coincida con el informe que circula hoy en la empresa.",
        is_correct: false,
        why_incorrect_md:
          "Eso es acomodar la métrica al resultado esperado. Si tu número difiere del que circula, el trabajo es explicar la diferencia, no hacerla desaparecer: muchas veces el informe viejo es el que está mal.",
      },
    ],
    explanation_md:
      "Los tres chequeos correctos comparten una idea: contrastar el resultado contra algo calculado por otro camino. La cantidad de filas contra la granularidad declarada, el total contra la tabla base, la cardinalidad antes y después de cada join. Es lo que convierte «la consulta anda» en «esto se puede entregar».",
    is_published: true,
  },
  {
    slug: "pf-q09-conversion-con-tipo-de-cambio",
    section,
    lesson: l1,
    type: "single",
    difficulty: "advanced",
    topic: "Convertir importes con una tabla de tipos de cambio",
    tags: ["multimoneda", "fx", "left_join"],
    estimated_seconds: 75,
    prompt_md:
      "`fx_rates(rate_date, currency, usd_rate)` guarda cuántas unidades de moneda local equivalen a un dólar (por ejemplo, `ARS` con `usd_rate = 1200`). Necesitas el importe en dólares de cada transacción, incluidas las que ya están en `USD`, que no tienen fila en esa tabla. ¿Qué expresión es correcta?",
    code_md: null,
    options: [
      {
        key: "a",
        body_md:
          "`LEFT JOIN fx_rates f ON f.currency = t.currency AND f.rate_date = (t.created_at AT TIME ZONE 'UTC')::date`, y en el `SELECT`: `t.amount / CASE WHEN t.currency = 'USD' THEN 1 ELSE f.usd_rate END`",
        is_correct: true,
      },
      {
        key: "b",
        body_md:
          "El mismo join, pero en el `SELECT`: `t.amount * CASE WHEN t.currency = 'USD' THEN 1 ELSE f.usd_rate END`",
        is_correct: false,
        why_incorrect_md:
          "Multiplicar va en la dirección contraria: 120 000 ARS con una cotización de 1200 darían 144 millones de dólares. Como `usd_rate` son unidades locales por dólar, se divide.",
      },
      {
        key: "c",
        body_md:
          "`JOIN fx_rates f ON f.currency = t.currency AND f.rate_date = (t.created_at AT TIME ZONE 'UTC')::date`, y en el `SELECT`: `t.amount / f.usd_rate`",
        is_correct: false,
        why_incorrect_md:
          "La división es correcta, pero el join interno elimina las transacciones en `USD`, que no tienen cotización. Desaparecen del informe sin ningún aviso.",
      },
      {
        key: "d",
        body_md:
          "Unir por moneda solamente y usar la cotización más reciente: `t.amount / (SELECT max(usd_rate) FROM fx_rates f WHERE f.currency = t.currency)`",
        is_correct: false,
        why_incorrect_md:
          "Convierte todo el período con una sola cotización, y encima con la más alta. Para monedas volátiles el resultado no se parece al valor real de cada operación en su momento.",
      },
    ],
    explanation_md:
      "Una conversión multimoneda tiene tres decisiones: la dirección (dividir o multiplicar, según cómo esté expresada la cotización), la fecha (la del evento, no la de hoy) y el caso sin cotización (la propia moneda de referencia). El `LEFT JOIN` conserva las transacciones en `USD` y el `CASE` las divide por 1.\n\nUn atajo frecuente es `coalesce(f.usd_rate, 1)`. Da lo mismo mientras toda moneda local tenga cotización en todas las fechas, pero cuando falta una cotización también pone 1 y trata esos pesos como si fueran dólares, sin ningún aviso. En Bolsillo pasa con 12 transacciones del 16 y el 17 de septiembre de 2025, posteriores a la última fecha de `fx_rates`. Con el `CASE`, esas filas quedan en NULL, y un NULL se ve.",
    is_published: true,
  },
  {
    slug: "pf-q10-ventana-de-observacion-comparable",
    section,
    lesson: l3,
    type: "scenario",
    difficulty: "advanced",
    topic: "Cohortes con ventanas de observación desiguales",
    tags: ["cohortes", "retencion", "sesgo"],
    estimated_seconds: 90,
    prompt_md:
      "Entregas un informe de retención a 60 días por mes de alta. Los datos llegan hasta el 15 de septiembre de 2025 e incluiste todas las cohortes, hasta la de agosto de 2025. El directorio concluye que «el producto viene empeorando mes a mes». ¿Qué pasó?",
    code_md: null,
    options: [
      {
        key: "a",
        body_md:
          "Las cohortes más recientes no tuvieron 60 días completos dentro de los datos, así que su retención sale artificialmente baja. Hay que excluir toda cohorte cuya ventana de observación no haya cerrado.",
        is_correct: true,
      },
      {
        key: "b",
        body_md:
          "Las cohortes recientes tienen menos personas, y con menos personas la retención siempre baja.",
        is_correct: false,
        why_incorrect_md:
          "El tamaño de la cohorte afecta la precisión del porcentaje, no su valor esperado. Una cohorte chica puede dar una retención alta o baja; lo que la hunde sistemáticamente es la ventana incompleta.",
      },
      {
        key: "c",
        body_md:
          "Falta ordenar por mes de alta: sin `ORDER BY`, el motor devuelve las cohortes en un orden que simula una tendencia.",
        is_correct: false,
        why_incorrect_md:
          "El orden de las filas cambia cómo se lee la tabla, pero no los valores. La caída sería visible igual al ordenar correctamente.",
      },
      {
        key: "d",
        body_md:
          "Hay que usar el promedio de retención de todas las cohortes en lugar de mostrarlas por separado.",
        is_correct: false,
        why_incorrect_md:
          "Promediar cohortes con ventanas desiguales esconde el problema en vez de resolverlo, y además elimina la comparación mes a mes, que es el objetivo del informe.",
      },
    ],
    explanation_md:
      "Una cohorte solo se compara con otra si todas tuvieron la misma oportunidad de mostrar el comportamiento que mides. Con datos hasta el 15 de septiembre, la última cohorte con 60 días completos es la de junio: las de julio y agosto se ven peor por construcción. La regla práctica es excluir toda cohorte cuya ventana no haya cerrado dentro del alcance de los datos, y decirlo en la entrega.",
    is_published: true,
  },
  {
    slug: "pf-q11-mediana-o-promedio",
    section,
    lesson: l1,
    type: "single",
    difficulty: "advanced",
    topic: "Elegir la medida de posición según la decisión",
    tags: ["percentiles", "mediana", "promedio", "distribuciones"],
    estimated_seconds: 75,
    prompt_md:
      "Producto va a fijar un límite por transferencia y quiere que el 95 % de las transferencias habituales quede por debajo de ese límite. Los importes tienen una cola larga: unas pocas transferencias son cientos de veces mayores que el resto. ¿Qué número le entregas?",
    code_md: null,
    options: [
      {
        key: "a",
        body_md:
          "El percentil 95, con `percentile_cont(0.95) WITHIN GROUP (ORDER BY amount)`: es el importe por debajo del cual queda el 95 % de las transferencias.",
        is_correct: true,
      },
      {
        key: "b",
        body_md:
          "La mediana, con `percentile_cont(0.5) WITHIN GROUP (ORDER BY amount)`, porque describe el importe típico y no se mueve por unas pocas transferencias enormes.",
        is_correct: false,
        why_incorrect_md:
          "La mediana describe bien el importe típico, pero por definición la mitad de las transferencias queda por encima de ella. Un límite fijado en la mediana frenaría a una de cada dos, muy lejos del 95 % pedido.",
      },
      {
        key: "c",
        body_md:
          "El promedio con `avg(amount)`, porque usa todos los datos y no descarta información.",
        is_correct: false,
        why_incorrect_md:
          "El promedio no dice qué parte de las transferencias queda por debajo: con una cola larga, las pocas transferencias enormes lo empujan hacia arriba, y su posición en la distribución depende de esos casos extremos. Puede dejar debajo al 70 % o al 90 %; no hay forma de saberlo sin medirlo.",
      },
      {
        key: "d",
        body_md:
          "El máximo con `max(amount)`, para asegurarte de que ninguna transferencia legítima quede bloqueada.",
        is_correct: false,
        why_incorrect_md:
          "Un límite igual al máximo observado no limita nada: por definición ninguna operación pasada lo supera y el control pierde su propósito.",
      },
    ],
    explanation_md:
      "La medida de posición se elige por la decisión que va a sostener, no por costumbre. «Que el 95 % quede por debajo» es, literalmente, la definición del percentil 95, y como un percentil depende del orden de los valores y no de su tamaño, las transferencias enormes no lo arrastran. La mediana es el percentil 50: responde «cuál es el importe típico», no «qué límite deja pasar a casi todos». El promedio sirve cuando el total importa, como la facturación o el costo agregado, porque `avg × cantidad` reconstruye la suma; ningún percentil tiene esa propiedad.",
    is_published: true,
  },
  {
    slug: "pf-q12-fan-out-al-sumar-totales",
    section,
    lesson: l2,
    type: "query_interpretation",
    difficulty: "expert",
    topic: "Importes multiplicados por una relación uno a muchos",
    tags: ["fan_out", "nivel_de_detalle", "join"],
    estimated_seconds: 100,
    prompt_md:
      "Hay dos pedidos: uno de 1000 con 3 filas en `order_items` y otro de 500 con 1 fila. ¿Qué devuelve `gmv` en esta consulta y por qué?",
    code_md:
      "SELECT sum(o.total_amount) AS gmv,\n       sum(oi.quantity) AS units\nFROM orders o\nJOIN order_items oi ON oi.order_id = o.id;",
    options: [
      {
        key: "a",
        body_md:
          "3500: el join produce una fila por ítem, así que el total de 1000 se suma tres veces y el de 500 una vez. `units` sí es correcto, porque vive al nivel del ítem.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "1500: `sum` reconoce los pedidos repetidos y los cuenta una sola vez.",
        is_correct: false,
        why_incorrect_md:
          "`sum` suma todas las filas que recibe; no tiene forma de saber que dos filas corresponden al mismo pedido. Para contar cada pedido una vez hay que agregar antes de unir.",
      },
      {
        key: "c",
        body_md: "1500: el join es por clave primaria, así que no puede multiplicar filas.",
        is_correct: false,
        why_incorrect_md:
          "El join es por la clave foránea `order_id`, que en `order_items` se repite una vez por ítem. La relación es uno a muchos y sí multiplica filas.",
      },
      {
        key: "d",
        body_md: "4000: cada total se suma tantas veces como ítems tenga el pedido más grande.",
        is_correct: false,
        why_incorrect_md:
          "La multiplicación es por pedido, no global: cada total se repite según los ítems de su propio pedido, dando 1000×3 + 500×1 = 3500.",
      },
    ],
    explanation_md:
      "Es el error de agregación más caro y el más difícil de ver, porque el resultado parece razonable. La regla: un importe que vive al nivel del pedido no se suma después de unir una tabla de detalle. O agregas `order_items` en una CTE antes de unir, o calculas el importe al nivel del ítem (`quantity * unit_price`), que es la métrica que corresponde a ese nivel de detalle.",
    is_published: true,
  },
  {
    slug: "pf-q13-la-pregunta-no-se-puede-responder",
    section,
    lesson: l3,
    type: "scenario",
    difficulty: "advanced",
    topic: "Cuando los datos no pueden responder la pregunta",
    tags: ["alcance", "supuestos", "entrega"],
    estimated_seconds: 85,
    prompt_md:
      "Te piden «cuántas personas intentaron pagar y no pudieron» durante el último trimestre. La tabla `payments` solo guarda una fila cuando el cobro se acreditó: los intentos rechazados nunca llegan a la base. ¿Qué haces?",
    code_md: null,
    options: [
      {
        key: "a",
        body_md:
          "Avisar que con estos datos la pregunta no se puede responder, explicar qué sí se puede medir (por ejemplo, pedidos creados que nunca llegaron a tener pago acreditado) y qué haría falta registrar para responderla de verdad.",
        is_correct: true,
      },
      {
        key: "b",
        body_md:
          "Entregar los pedidos sin pago acreditado como si fueran intentos fallidos: es la mejor aproximación disponible.",
        is_correct: false,
        why_incorrect_md:
          "Es una buena aproximación, pero entregarla con la etiqueta de la pregunta original la convierte en otra cosa. Un pedido sin pago puede ser alguien que abandonó antes de intentar, y quien lo lea va a decidir creyendo que mide rechazos.",
      },
      {
        key: "c",
        body_md:
          "Estimar los rechazos aplicando la tasa que se suele ver en la industria sobre la cantidad de pedidos.",
        is_correct: false,
        why_incorrect_md:
          "Eso no es una medición, es un supuesto disfrazado de dato. Si hace falta una estimación, se entrega declarada como tal y con su fuente, nunca en la misma columna que un número calculado sobre los datos.",
      },
      {
        key: "d",
        body_md:
          "Devolver el pedido sin respuesta hasta que el equipo de sistemas empiece a registrar los intentos fallidos.",
        is_correct: false,
        why_incorrect_md:
          "Dejar a quien pregunta sin nada tampoco es la salida. Casi siempre hay una métrica cercana que sirve hoy; lo que no se puede es entregarla sin decir en qué se diferencia de lo que se pidió.",
      },
    ],
    explanation_md:
      "Buena parte del trabajo de analista es reconocer qué no está en los datos. Un resultado solo habla de lo que quedó registrado, y nunca muestra lo que el sistema no guarda: intentos rechazados, personas que no llegaron al formulario, eventos perdidos. La entrega profesional nombra el límite, propone la métrica más cercana y deja claro qué habría que instrumentar.",
    is_published: true,
  },
  {
    slug: "pf-q14-ventana-relativa-a-hoy",
    section,
    lesson: l2,
    type: "single",
    difficulty: "advanced",
    topic: "Informes que no se pueden reproducir",
    tags: ["reproducibilidad", "current_date", "entrega"],
    estimated_seconds: 70,
    prompt_md:
      "Guardas una consulta con `WHERE created_at >= current_date - interval '30 days'` y la compartes como «el informe de los últimos 30 días». Dos semanas después, finanzas la corre y los números no coinciden con los que entregaste. ¿Cuál es el diagnóstico correcto?",
    code_md: null,
    options: [
      {
        key: "a",
        body_md:
          "La consulta mide un período distinto en cada ejecución, así que no hay nada que reconciliar: para comparar entregas hay que fijar el rango con fechas explícitas y dejar `current_date` solo en informes que se leen siempre al día.",
        is_correct: true,
      },
      {
        key: "b",
        body_md:
          "Alguien modificó datos viejos; una consulta con el mismo texto siempre devuelve el mismo resultado.",
        is_correct: false,
        why_incorrect_md:
          "El mismo texto no significa el mismo resultado: `current_date` se evalúa en cada ejecución y mueve el rango. Las cargas tardías existen, pero aquí no hacen falta para explicar la diferencia.",
      },
      {
        key: "c",
        body_md: "Falta `AT TIME ZONE 'UTC'`: sin fijar el huso el rango se corre un día.",
        is_correct: false,
        why_incorrect_md:
          "Fijar el huso es necesario y evita un desfase de horas, pero no explica una diferencia de dos semanas. Son dos problemas distintos y conviene no confundirlos.",
      },
      {
        key: "d",
        body_md: "Hay que reemplazar `>=` por `>` para no contar dos veces el día de corte.",
        is_correct: false,
        why_incorrect_md:
          "Cambiar el operador mueve el límite un día, no explica la diferencia, y además rompe el rango semiabierto, que es la forma correcta de acotar un período.",
      },
    ],
    explanation_md:
      "Un informe que va a ser auditado tiene que devolver lo mismo el día que lo entregas y seis meses después. Eso implica fechas explícitas en el rango, huso declarado y, si hace falta, la fecha en que se ejecutó como columna del resultado. `current_date` es cómodo para un tablero que se mira siempre al día, y es exactamente lo que impide reconciliar dos entregas.",
    is_published: true,
  },
];
