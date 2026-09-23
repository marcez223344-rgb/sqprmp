import type { QuestionDef } from "../schemas/question";

const section = "funnels";
const definicion = "funnel-definicion-y-pasos";
const orden = "funnel-orden-estricto-o-cualquier-orden";
const abandono = "funnel-abandono-y-tiempo-de-conversion";

export const questions: QuestionDef[] = [
  {
    slug: "fn-q01-tres-decisiones",
    section,
    lesson: definicion,
    type: "single",
    difficulty: "easy",
    topic: "Definición de un funnel",
    tags: ["funnel", "metodologia"],
    estimated_seconds: 45,
    prompt_md:
      "Dos analistas miden el mismo funnel de compra sobre la misma base de datos y obtienen números distintos, sin errores de SQL en ninguna de las dos consultas. ¿Cuál es la causa más probable?",
    options: [
      {
        key: "a",
        body_md:
          "Eligieron unidades de conteo distintas (una contó pedidos y la otra, usuarios) o ventanas de observación distintas.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Una usó `JOIN` y la otra, subconsultas.",
        is_correct: false,
        why_incorrect_md:
          "Un `JOIN` y una subconsulta equivalentes devuelven lo mismo. La forma de escribir la consulta no cambia el resultado si la definición es la misma.",
      },
      {
        key: "c",
        body_md: "Una ordenó el resultado y la otra no.",
        is_correct: false,
        why_incorrect_md:
          "El `ORDER BY` final cambia la presentación de las filas, nunca los valores de cada paso.",
      },
      {
        key: "d",
        body_md: "Una usó alias de tabla y la otra no.",
        is_correct: false,
        why_incorrect_md:
          "Los alias son azúcar sintáctica: mejoran la lectura y no afectan a ningún valor del resultado.",
      },
    ],
    explanation_md:
      "Un funnel no se define en SQL sino antes: unidad de conteo, pasos y su orden, y ventana de observación. Dos definiciones distintas producen dos funnels correctos y contradictorios; por eso las tres decisiones se publican junto con el resultado.",
    is_published: true,
  },
  {
    slug: "fn-q02-left-join-obligatorio",
    section,
    lesson: definicion,
    type: "true_false",
    difficulty: "easy",
    topic: "Construcción de la tabla de hitos",
    tags: ["funnel", "outer_join"],
    estimated_seconds: 35,
    prompt_md:
      "Para construir la tabla de hitos de un funnel a partir de `orders` y `payments`, da lo mismo usar `INNER JOIN` que `LEFT JOIN`, porque los pedidos sin pago aportan NULL en cualquier caso.",
    options: [
      { key: "a", body_md: "Falso", is_correct: true },
      {
        key: "b",
        body_md: "Verdadero",
        is_correct: false,
        why_incorrect_md:
          "Con `INNER JOIN` los pedidos sin pago no aportan NULL: desaparecen de la consulta. La base del funnel se recorta y todas las tasas posteriores salen infladas.",
      },
    ],
    explanation_md:
      "El primer paso de un funnel es el universo completo. `LEFT JOIN` conserva las unidades que no alcanzaron el hito y las deja en NULL, que es exactamente lo que después cuentas (o no) en cada paso.",
    is_published: true,
  },
  {
    slug: "fn-q03-filtro-en-on-o-where",
    section,
    lesson: definicion,
    type: "error_diagnosis",
    difficulty: "intermediate",
    topic: "ON contra WHERE en un LEFT JOIN",
    tags: ["funnel", "outer_join", "null_handling"],
    estimated_seconds: 75,
    prompt_md:
      "La consulta debía contar cuántos de los 18 000 pedidos tienen un pago aprobado, pero `pedidos` devuelve 14 563 en lugar de 18 000. ¿Cuál es el error?",
    code_md:
      "```sql\nSELECT count(DISTINCT o.id) AS pedidos,\n       count(DISTINCT p.order_id) AS pagados\nFROM orders AS o\nLEFT JOIN payments AS p ON p.order_id = o.id\nWHERE p.status = 'approved';\n```",
    options: [
      {
        key: "a",
        body_md:
          "El filtro `p.status = 'approved'` está en el `WHERE`; al descartar las filas con `p.status` NULL, el `LEFT JOIN` se comporta como un `INNER JOIN`. Debe ir en el `ON`.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Falta un `GROUP BY o.id`.",
        is_correct: false,
        why_incorrect_md:
          "La consulta devuelve una sola fila con dos totales; agrupar por `o.id` daría una fila por pedido, que no es lo que se pide.",
      },
      {
        key: "c",
        body_md: "`count(DISTINCT o.id)` debería ser `count(*)`.",
        is_correct: false,
        why_incorrect_md:
          "`count(*)` contaría filas del join, no pedidos, y con varios pagos por pedido daría un número aún mayor. El `DISTINCT` está bien puesto.",
      },
      {
        key: "d",
        body_md: "El `LEFT JOIN` debería ser `RIGHT JOIN` para conservar todos los pedidos.",
        is_correct: false,
        why_incorrect_md:
          "`orders` está a la izquierda, así que `LEFT JOIN` ya es el lado correcto. Un `RIGHT JOIN` conservaría todos los pagos y perdería los pedidos sin pago.",
      },
    ],
    explanation_md:
      "En un `LEFT JOIN`, el `ON` decide qué filas de la tabla derecha se emparejan y el `WHERE` decide qué filas del resultado sobreviven. Una condición sobre una columna de la tabla derecha puesta en el `WHERE` elimina las filas no emparejadas, porque en ellas esa columna es NULL y `NULL = 'approved'` no es verdadero.",
    is_published: true,
  },
  {
    slug: "fn-q04-division-entera",
    section,
    lesson: definicion,
    type: "query_interpretation",
    difficulty: "easy",
    topic: "Cálculo de tasas de conversión",
    tags: ["funnel", "numeric_functions"],
    estimated_seconds: 50,
    prompt_md:
      "`pedidos` y su valor del paso anterior son ambos de tipo `integer`. ¿Qué devuelve la columna `conversion` para el paso 2, donde hay 13 843 pedidos sobre 14 437 del paso 1?",
    code_md:
      "```sql\nSELECT paso,\n       100 * pedidos / lag(pedidos) OVER (ORDER BY paso) AS conversion\nFROM por_paso;\n```",
    options: [
      {
        key: "a",
        body_md: "95, porque la división entera trunca los decimales.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "95.89, redondeado automáticamente a dos decimales.",
        is_correct: false,
        why_incorrect_md:
          "PostgreSQL no redondea por su cuenta; y con enteros no llega siquiera a calcular decimales.",
      },
      {
        key: "c",
        body_md: "0, porque la división entera de 13 843 entre 14 437 da 0.",
        is_correct: false,
        why_incorrect_md:
          "La multiplicación por 100 se evalúa **antes** que la división (misma precedencia, asociatividad de izquierda a derecha): se calcula `1384300 / 14437`, no `100 * (13843 / 14437)`.",
      },
      {
        key: "d",
        body_md: "Un error: no se puede dividir un entero por el resultado de `lag()`.",
        is_correct: false,
        why_incorrect_md:
          "`lag(pedidos)` devuelve el mismo tipo que su argumento, así que la división entre dos enteros es perfectamente válida.",
      },
    ],
    explanation_md:
      "`100 * pedidos / lag(pedidos)` se evalúa de izquierda a derecha: primero `100 * 13843 = 1384300`, después `1384300 / 14437 = 95` con división entera. Escribir `100.0` fuerza `numeric` desde el principio y da 95.8925…, listo para `round(..., 2)`.",
    is_published: true,
  },
  {
    slug: "fn-q05-dos-tasas",
    section,
    lesson: definicion,
    type: "matching",
    difficulty: "intermediate",
    topic: "Las dos tasas de conversión",
    tags: ["funnel", "window_function", "lag_lead"],
    estimated_seconds: 80,
    prompt_md:
      "Relaciona cada expresión, calculada sobre una serie de pasos ordenada por `paso`, con lo que mide.",
    pairs: [
      {
        left: "lag(pedidos) OVER (ORDER BY paso)",
        right: "El conteo del paso inmediatamente anterior; NULL en el primer paso",
      },
      {
        left: "first_value(pedidos) OVER (ORDER BY paso)",
        right: "El conteo del primer paso del funnel, repetido en todas las filas",
      },
      {
        left: "sum(pedidos) OVER (ORDER BY paso)",
        right:
          "La suma de los conteos desde el primer paso hasta el actual, que en un funnel no tiene sentido de negocio",
      },
      {
        left: "lead(pedidos) OVER (ORDER BY paso)",
        right: "El conteo del paso siguiente; NULL en el último paso",
      },
    ],
    explanation_md:
      "Las dos tasas de un funnel salen de `lag()` (conversión paso a paso) y `first_value()` (conversión desde el inicio). `sum(...) OVER (ORDER BY ...)` es un acumulado: correcto como función, pero suma conteos de pasos que comparten las mismas unidades y por eso no significa nada aquí.",
    is_published: true,
  },
  {
    slug: "fn-q06-estricto-vs-cualquier-orden",
    section,
    lesson: orden,
    type: "single",
    difficulty: "intermediate",
    topic: "Orden estricto contra cualquier orden",
    tags: ["funnel", "orden_temporal"],
    estimated_seconds: 60,
    prompt_md:
      "En Ritmo, 1225 usuarios tienen playlist y suscripción, pero solo 135 se suscribieron después de crear su primera playlist. ¿Qué afirmación es correcta?",
    options: [
      {
        key: "a",
        body_md:
          "Ambos números son válidos y miden cosas distintas; hay que decir cuál se publica y por qué.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "El 1225 está mal: un funnel siempre exige orden temporal.",
        is_correct: false,
        why_incorrect_md:
          "«Alcanzó el paso» es una definición legítima y muy usada, por ejemplo para medir adopción de funcionalidades. Lo incorrecto es publicarla sin decir que no verifica el orden.",
      },
      {
        key: "c",
        body_md: "El 135 está mal: excluye usuarios que sí hicieron las dos cosas.",
        is_correct: false,
        why_incorrect_md:
          "Los excluye a propósito, porque hicieron las dos cosas en el orden inverso. Esa exclusión es justamente lo que mide el funnel secuencial.",
      },
      {
        key: "d",
        body_md: "La diferencia se debe a usuarios con más de una playlist.",
        is_correct: false,
        why_incorrect_md:
          "Ambas cifras parten del mismo `min(created_at)` por usuario, así que tener varias playlists no cambia nada: la diferencia es puramente de orden temporal.",
      },
    ],
    explanation_md:
      "Los 1090 usuarios de diferencia se suscribieron antes de armar su primera playlist. Si la pregunta de negocio es «¿armar una playlist empuja a suscribirse?», el único número relevante es el estricto; el otro confunde coincidencia con secuencia.",
    is_published: true,
  },
  {
    slug: "fn-q07-min-no-max",
    section,
    lesson: orden,
    type: "fill_blank",
    difficulty: "intermediate",
    topic: "El hito de cada paso",
    tags: ["funnel", "aggregate"],
    estimated_seconds: 40,
    prompt_md:
      "Para construir la tabla de hitos de un funnel secuencial, la marca de tiempo de cada paso se obtiene con la función de agregación `___(columna_de_fecha)` agrupando por unidad. Escribe el nombre de la función.",
    answer: { accepted: ["min", "MIN", "min()"], case_sensitive: false },
    explanation_md:
      "Se usa `min()`: el **primer** momento en que la unidad alcanzó ese paso. Con `max()` medirías la última vez que hizo la acción, y un usuario que armó una playlist en enero y otra en agosto podría pasar de cumplir el orden a no cumplirlo sin haber cambiado de comportamiento.",
    is_published: true,
  },
  {
    slug: "fn-q08-condiciones-encadenadas",
    section,
    lesson: orden,
    type: "multiple",
    difficulty: "advanced",
    topic: "Condiciones de un funnel secuencial",
    tags: ["funnel", "orden_temporal", "conditional_aggregation"],
    estimated_seconds: 90,
    prompt_md:
      "Estás contando el paso 4 de un funnel secuencial de cuatro pasos con `count(*) FILTER (WHERE ...)`. ¿Qué debe cumplir la condición del filtro? Marca todas las afirmaciones correctas.",
    options: [
      {
        key: "a",
        body_md:
          "Debe repetir las condiciones de los pasos 2 y 3, no solo comparar el paso 4 con el 3.",
        is_correct: true,
      },
      {
        key: "b",
        body_md:
          "Si un hito es `date` y el otro `timestamptz`, hay que fijar el huso explícitamente antes de compararlos.",
        is_correct: true,
      },
      {
        key: "c",
        body_md:
          "No hace falta comprobar que los hitos no sean NULL: una comparación con NULL nunca es verdadera, así que esas filas ya quedan fuera.",
        is_correct: true,
      },
      {
        key: "d",
        body_md:
          "Debe usar `OR` entre las condiciones de los pasos, para no perder usuarios que se saltaron alguno.",
        is_correct: false,
        why_incorrect_md:
          "Con `OR` dejarías entrar caminos incompletos, que es exactamente lo que un funnel secuencial excluye. Las condiciones se combinan con `AND`.",
      },
      {
        key: "e",
        body_md: "Debe incluir siempre una ventana de conversión de 30 días.",
        is_correct: false,
        why_incorrect_md:
          "La ventana es una decisión de negocio, no un requisito. Puede no haberla; lo obligatorio es declarar si existe o no.",
      },
    ],
    explanation_md:
      "Un paso secuencial exige el camino completo: todas las condiciones anteriores combinadas con `AND`. Los NULL se descartan solos, porque cualquier comparación con NULL da NULL y `FILTER` solo cuenta las filas donde la condición es verdadera. Y al mezclar `date` con `timestamptz`, PostgreSQL usa el huso de la sesión si no se lo fijas, lo que hace el resultado dependiente de quién ejecuta la consulta.",
    is_published: true,
  },
  {
    slug: "fn-q09-date-vs-timestamptz",
    section,
    lesson: orden,
    type: "true_false",
    difficulty: "advanced",
    topic: "Determinismo del huso horario",
    tags: ["funnel", "date_functions"],
    estimated_seconds: 45,
    prompt_md:
      "`started_on` es `date` y `created_at` es `timestamptz`. La condición `started_on >= created_at::date` produce el mismo resultado para cualquier persona que la ejecute.",
    options: [
      { key: "a", body_md: "Falso", is_correct: true },
      {
        key: "b",
        body_md: "Verdadero",
        is_correct: false,
        why_incorrect_md:
          "`created_at::date` convierte usando el parámetro `TimeZone` de la sesión. Un evento del 1 de marzo a las 02:00 UTC cae el 28 de febrero para una sesión en `America/Argentina/Buenos_Aires` y el 1 de marzo para una en UTC.",
      },
    ],
    explanation_md:
      "Un `::date` o un `date_trunc` sobre `timestamptz` sin huso explícito es no determinista entre sesiones. La forma reproducible es `(created_at AT TIME ZONE 'UTC')::date`, que fija el calendario con el que se corta la fecha y deja el resultado igual para todo el mundo.",
    is_published: true,
  },
  {
    slug: "fn-q10-ultimo-paso-alcanzado",
    section,
    lesson: abandono,
    type: "query_interpretation",
    difficulty: "advanced",
    topic: "Punto de abandono",
    tags: ["funnel", "case", "aggregate"],
    estimated_seconds: 75,
    prompt_md:
      "¿Qué propiedad tiene el resultado de esta consulta, que el funnel clásico (un conteo por evento) no tiene?",
    code_md:
      "```sql\nWITH avance AS (\n  SELECT order_id,\n         max(CASE event WHEN 'placed' THEN 1 WHEN 'accepted' THEN 2\n                        WHEN 'preparing' THEN 3 WHEN 'picked_up' THEN 4\n                        WHEN 'delivered' THEN 5 ELSE 0 END) AS ultimo_paso\n  FROM order_events\n  GROUP BY order_id\n)\nSELECT ultimo_paso, count(*) AS pedidos\nFROM avance\nGROUP BY ultimo_paso;\n```",
    options: [
      {
        key: "a",
        body_md:
          "Cada pedido aparece en una sola fila, así que las categorías son excluyentes y `pedidos` suma el total de pedidos.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Excluye los pedidos cancelados del resultado.",
        is_correct: false,
        why_incorrect_md:
          "No los excluye: un pedido cancelado aparece con el número del último paso real que alcanzó, porque `cancelled` se mapea a 0 y `max()` se queda con el mayor.",
      },
      {
        key: "c",
        body_md: "Calcula la conversión paso a paso sin necesidad de `lag()`.",
        is_correct: false,
        why_incorrect_md:
          "No calcula ninguna conversión. Da el reparto de abandonos; para las tasas de conversión hace falta el funnel acumulado.",
      },
      {
        key: "d",
        body_md: "Ordena los pedidos cronológicamente por su último evento.",
        is_correct: false,
        why_incorrect_md:
          "No hay `ORDER BY` ni ninguna marca de tiempo en la consulta: `max()` opera sobre el número de paso, no sobre `event_at`.",
      },
    ],
    explanation_md:
      "Clasificar por el último paso alcanzado convierte el funnel en una partición: cada unidad cae en una sola categoría y las cantidades suman el total. Es la tabla que responde «¿dónde priorizo?», mientras que el funnel acumulado responde «¿cuánto llega al final?».",
    is_published: true,
  },
  {
    slug: "fn-q11-mediana-o-promedio",
    section,
    lesson: abandono,
    type: "scenario",
    difficulty: "advanced",
    topic: "Resumir duraciones",
    tags: ["funnel", "aggregate", "numeric_functions"],
    estimated_seconds: 70,
    prompt_md:
      "Operaciones te pide «cuánto tarda un pedido típico en entregarse». La mayoría se entrega entre 30 y 45 minutos, pero un puñado de pedidos quedó trabado varias horas. ¿Qué métrica entregas?",
    options: [
      {
        key: "a",
        body_md:
          "La mediana con `percentile_cont(0.5) WITHIN GROUP (ORDER BY minutos)`, y si quieren un compromiso de servicio, además el percentil 90.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "El promedio con `avg(minutos)`, porque usa todos los datos.",
        is_correct: false,
        why_incorrect_md:
          "Usar todos los datos no lo hace representativo: con cola larga, unos pocos pedidos trabados desplazan el promedio por encima de lo que vive el pedido típico.",
      },
      {
        key: "c",
        body_md: "El promedio después de eliminar los pedidos que tardaron más de dos horas.",
        is_correct: false,
        why_incorrect_md:
          "Recortar la cola con un umbral inventado esconde precisamente el problema que Operaciones necesita ver, y el umbral es imposible de justificar ante quien lea el informe.",
      },
      {
        key: "d",
        body_md: "`max(minutos)`, que muestra el peor caso.",
        is_correct: false,
        why_incorrect_md:
          "El máximo describe un caso extremo, no el típico. Es útil como alerta, no como respuesta a la pregunta que te hicieron.",
      },
    ],
    explanation_md:
      "Las duraciones casi siempre tienen cola larga, así que la mediana describe la experiencia típica mejor que el promedio. `percentile_cont` es una agregación de conjunto ordenado: el `ORDER BY` va dentro de `WITHIN GROUP`. El percentil 90 es el complemento habitual, porque es el lenguaje de los acuerdos de nivel de servicio.",
    is_published: true,
  },
  {
    slug: "fn-q12-sesgo-de-supervivencia",
    section,
    lesson: abandono,
    type: "single",
    difficulty: "advanced",
    topic: "Sesgo de supervivencia en tiempos de conversión",
    tags: ["funnel", "metodologia", "null_handling"],
    estimated_seconds: 60,
    prompt_md:
      "Calculas la mediana de minutos hasta la entrega filtrando `WHERE delivered_at IS NOT NULL`, porque los demás pedidos no tienen fecha de entrega. ¿Qué corresponde hacer con ese número?",
    options: [
      {
        key: "a",
        body_md:
          "Publicarlo junto con la tasa de entrega del paso, aclarando que solo incluye pedidos entregados.",
        is_correct: true,
      },
      {
        key: "b",
        body_md:
          "Reemplazar los `delivered_at` nulos por la fecha de hoy para que todos los pedidos entren.",
        is_correct: false,
        why_incorrect_md:
          "Inventa datos: un pedido cancelado hace un año pasaría a tener una duración de un año y la mediana dejaría de significar nada.",
      },
      {
        key: "c",
        body_md: "Quitar el filtro y dejar que los NULL entren en el cálculo.",
        is_correct: false,
        why_incorrect_md:
          "Las funciones de agregación ignoran los NULL, así que el resultado sería idéntico; lo único que cambiaría es que `count(*)` dejaría de referirse al mismo conjunto que la mediana.",
      },
      {
        key: "d",
        body_md: "Nada: el filtro ya deja el cálculo correcto y el número se publica tal cual.",
        is_correct: false,
        why_incorrect_md:
          "El cálculo es correcto, pero la lectura no. Sin la aclaración, quien lea el informe asumirá que el tiempo describe a todos los pedidos.",
      },
    ],
    explanation_md:
      "Medir el tiempo de conversión solo sobre las unidades que convirtieron es sesgo de supervivencia: las lentas y las trabadas quedan fuera por construcción y el número sale mejor que la realidad. No lo arregla el SQL; lo arregla publicar la duración junto a la tasa de conversión de ese paso.",
    is_published: true,
  },
];
