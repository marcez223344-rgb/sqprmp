import type { QuestionDef } from "../schemas/question";

const section = "lag-y-lead";
const basico = "lag-y-lead-basico";
const variaciones = "variaciones-entre-periodos";
const brechas = "brechas-y-valores-de-referencia";

export const questions: QuestionDef[] = [
  {
    slug: "laglead-q01-que-devuelve-lag",
    section,
    lesson: basico,
    type: "single",
    difficulty: "easy",
    topic: "Qué devuelve LAG",
    tags: ["lag_lead", "window_function"],
    estimated_seconds: 40,
    prompt_md:
      "Una consulta devuelve una fila por mes con la columna `ventas` y calcula `lag(ventas) OVER (ORDER BY mes)`. ¿Qué valor muestra esa columna en la **primera** fila del resultado?",
    code_md: null,
    options: [
      { key: "a", body_md: "`NULL`, porque no existe una fila anterior.", is_correct: true },
      {
        key: "b",
        body_md: "`0`, porque PostgreSQL rellena con cero cuando no hay fila anterior.",
        is_correct: false,
        why_incorrect_md:
          "El valor por omisión es `NULL`. Solo obtienes `0` si lo pides explícitamente con el tercer argumento: `lag(ventas, 1, 0)`.",
      },
      {
        key: "c",
        body_md: "El mismo valor de `ventas` de esa fila.",
        is_correct: false,
        why_incorrect_md:
          "`lag` nunca devuelve la fila actual; para eso alcanza con nombrar la columna. Devuelve la fila desplazada hacia atrás, y si no existe, `NULL`.",
      },
      {
        key: "d",
        body_md: "El valor de la última fila de la partición, cerrando el círculo.",
        is_correct: false,
        why_incorrect_md:
          "Las ventanas no son circulares: antes de la primera fila no hay nada, y la función devuelve el valor por omisión.",
      },
    ],
    explanation_md:
      "`lag(x)` mira una fila hacia atrás dentro de la partición, según el `ORDER BY` de la ventana. En la primera fila no hay nada que mirar, así que devuelve el valor por omisión, que es `NULL` salvo que indiques otro con el tercer argumento.",
    is_published: true,
  },
  {
    slug: "laglead-q02-lead-fill-blank",
    section,
    lesson: basico,
    type: "fill_blank",
    difficulty: "very_easy",
    topic: "LAG frente a LEAD",
    tags: ["lag_lead", "sintaxis"],
    estimated_seconds: 30,
    prompt_md:
      "Para traer el valor de la fila **siguiente** dentro de la partición usas la función `___`. Escribe solo el nombre de la función.",
    code_md: null,
    answer: { accepted: ["LEAD", "lead()"], case_sensitive: false },
    explanation_md:
      "`LEAD` mira hacia adelante y `LAG` hacia atrás. Ambas aceptan el desplazamiento como segundo argumento y un valor por omisión como tercero.",
    is_published: true,
  },
  {
    slug: "laglead-q03-partition-obligatorio",
    section,
    lesson: basico,
    type: "scenario",
    difficulty: "intermediate",
    topic: "PARTITION BY en comparaciones",
    tags: ["lag_lead", "partition_by"],
    estimated_seconds: 60,
    prompt_md:
      "Tienes una serie mensual de reproducciones por país, ordenada por país y por mes. Calculas `reproducciones - lag(reproducciones) OVER (ORDER BY country, mes)` y entregas el informe. ¿Qué problema tiene ese resultado?",
    code_md: null,
    options: [
      {
        key: "a",
        body_md:
          "La primera fila de cada país se compara con la última del país anterior, y esa variación es falsa.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Ninguno: incluir `country` en el `ORDER BY` equivale a particionar por país.",
        is_correct: false,
        why_incorrect_md:
          "Ordenar agrupa las filas visualmente, pero la ventana sigue siendo una sola partición: `lag` cruza el límite entre países sin avisar.",
      },
      {
        key: "c",
        body_md: "La consulta falla porque `lag` no admite dos columnas en su `ORDER BY`.",
        is_correct: false,
        why_incorrect_md:
          "El `ORDER BY` de una ventana admite varias columnas sin problema. El error es de significado, no de sintaxis.",
      },
      {
        key: "d",
        body_md: "Todas las filas devuelven `NULL` porque falta `PARTITION BY`.",
        is_correct: false,
        why_incorrect_md:
          "Sin `PARTITION BY` la ventana trata toda la tabla como una sola partición: devuelve valores, y ahí está el peligro.",
      },
    ],
    explanation_md:
      "`PARTITION BY country` es lo único que reinicia la comparación en cada país. Con solo ordenar, una fila de Chile puede tomar como «mes anterior» una de Brasil; el número resultante parece plausible y por eso el error sobrevive a las revisiones.",
    is_published: true,
  },
  {
    slug: "laglead-q04-division-entera",
    section,
    lesson: variaciones,
    type: "error_diagnosis",
    difficulty: "intermediate",
    topic: "Variación porcentual",
    tags: ["lag_lead", "numeric", "division"],
    estimated_seconds: 60,
    prompt_md:
      "La columna `ventas` es `integer`, la serie tiene una fila por mes y ningún mes tiene ventas en cero. La consulta corre sin error, pero `variacion_pct` muestra `0` en casi todos los meses. ¿Cuál es la causa?",
    code_md:
      "```sql\nSELECT\n  mes,\n  ventas,\n  (ventas - lag(ventas) OVER (ORDER BY mes))\n    / lag(ventas) OVER (ORDER BY mes) * 100 AS variacion_pct\nFROM ventas_mensuales\nORDER BY mes;\n```",
    options: [
      {
        key: "a",
        body_md:
          "La diferencia y el mes anterior son enteros, así que la división es entera: descarta los decimales antes de multiplicar por 100. Hay que forzar `numeric`, por ejemplo escribiendo `100.0 *` al principio.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Falta `PARTITION BY` en la ventana.",
        is_correct: false,
        why_incorrect_md:
          "La serie es única (no hay grupos), así que no hace falta particionar. El problema está en los tipos.",
      },
      {
        key: "c",
        body_md: "`lag` no puede usarse dos veces en la misma expresión.",
        is_correct: false,
        why_incorrect_md:
          "Puedes repetir la misma llamada a `lag` tantas veces como quieras: es válido y cada una devuelve el mismo valor.",
      },
      {
        key: "d",
        body_md: "Falta `round`, y sin redondeo PostgreSQL devuelve 0.",
        is_correct: false,
        why_incorrect_md:
          "`round` solo redondea un número que ya tiene decimales; aquí los decimales se perdieron antes, en la división.",
      },
    ],
    explanation_md:
      "En PostgreSQL, `integer / integer` devuelve `integer`: si las ventas pasan de 100 a 110, `(110 - 100) / 100` da `0`, y `0 * 100` sigue siendo `0`. Solo una variación de 100 % o más sobrevive a la división entera. La corrección es `100.0 * (ventas - lag(ventas) OVER (ORDER BY mes)) / lag(ventas) OVER (ORDER BY mes)`: el `100.0` convierte la cuenta a decimal desde el primer paso.",
    is_published: true,
  },
  {
    slug: "laglead-q05-nullif-division-cero",
    section,
    lesson: variaciones,
    type: "single",
    difficulty: "intermediate",
    topic: "División por cero",
    tags: ["lag_lead", "null_handling"],
    estimated_seconds: 45,
    prompt_md:
      "En una variación porcentual, ¿qué logra escribir el divisor como `nullif(lag(ventas) OVER (ORDER BY mes), 0)`?",
    code_md: null,
    options: [
      {
        key: "a",
        body_md:
          "Que un mes anterior en cero produzca `NULL` en esa fila en lugar de hacer fallar toda la consulta.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Que los meses con valor cero se excluyan del resultado.",
        is_correct: false,
        why_incorrect_md:
          "`nullif` no filtra filas: la fila sigue ahí, solo que su variación queda en `NULL`. Para excluirla necesitas un `WHERE` en un nivel externo.",
      },
      {
        key: "c",
        body_md: "Que el cero se reemplace por 1 para que la división sea posible.",
        is_correct: false,
        why_incorrect_md:
          "Eso sería `coalesce(nullif(x, 0), 1)`, y además inventaría un porcentaje. `nullif` solo convierte el cero en `NULL`.",
      },
      {
        key: "d",
        body_md: "Que la división entera se convierta en decimal.",
        is_correct: false,
        why_incorrect_md:
          "El tipo no cambia: `nullif` devuelve el mismo tipo de su primer argumento. Para el decimal necesitas `100.0` o un `::numeric`.",
      },
    ],
    explanation_md:
      "`nullif(x, 0)` devuelve `NULL` cuando `x` vale 0. Dividir por `NULL` da `NULL`, y eso es exactamente lo que quieres reportar: «no se puede calcular». Sin esa protección, un solo mes en cero aborta la consulta completa con *division by zero*.",
    is_published: true,
  },
  {
    slug: "laglead-q06-lag-12-serie-incompleta",
    section,
    lesson: variaciones,
    type: "true_false",
    difficulty: "advanced",
    topic: "Comparación interanual",
    tags: ["lag_lead", "offset", "series"],
    estimated_seconds: 45,
    prompt_md:
      "«`lag(ventas, 12) OVER (ORDER BY mes)` siempre devuelve el valor del mismo mes del año anterior.» ¿Verdadero o falso?",
    code_md: null,
    options: [
      {
        key: "a",
        body_md: "Falso: retrocede doce **filas**, y si a la serie le falta un mes se desalinea.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Verdadero: el desplazamiento se calcula sobre la fecha del `ORDER BY`.",
        is_correct: false,
        why_incorrect_md:
          "El segundo argumento de `lag` cuenta filas, no unidades de tiempo. La ventana no sabe que tu clave de orden son meses.",
      },
    ],
    explanation_md:
      "`lag(x, 12)` toma la fila que está doce posiciones atrás dentro de la partición. Coincide con «hace un año» solo si la serie tiene todos los meses. Si un mes no tuvo actividad y por eso no existe la fila, comparas contra el mes equivocado sin ningún aviso. Para comparar por calendario, une la serie consigo misma con `mes = otro.mes + interval '1 year'`.",
    is_published: true,
  },
  {
    slug: "laglead-q07-interpretar-brechas",
    section,
    lesson: brechas,
    type: "query_interpretation",
    difficulty: "intermediate",
    topic: "Brechas entre eventos",
    tags: ["lag_lead", "date_functions"],
    estimated_seconds: 70,
    prompt_md: "¿Qué mide la columna `d` de esta consulta?",
    code_md:
      "```sql\nSELECT\n  user_id,\n  played_at,\n  extract(epoch FROM played_at\n    - lag(played_at) OVER (PARTITION BY user_id ORDER BY played_at)) / 86400 AS d\nFROM plays;\n```",
    options: [
      {
        key: "a",
        body_md:
          "Los días transcurridos entre cada reproducción y la reproducción anterior del mismo oyente.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Los días transcurridos desde la primera reproducción de ese oyente.",
        is_correct: false,
        why_incorrect_md:
          "Eso requeriría `first_value(played_at)` o `min(played_at)` sobre la partición; `lag` solo mira una fila hacia atrás.",
      },
      {
        key: "c",
        body_md: "Los segundos entre reproducciones consecutivas de cualquier oyente.",
        is_correct: false,
        why_incorrect_md:
          "`extract(epoch ...)` da segundos, pero la división entre 86 400 los convierte en días; y `PARTITION BY user_id` impide mezclar oyentes.",
      },
      {
        key: "d",
        body_md: "La cantidad de reproducciones que el oyente hizo ese día.",
        is_correct: false,
        why_incorrect_md:
          "No hay ninguna agregación por día; la consulta devuelve una fila por reproducción, no un conteo.",
      },
    ],
    explanation_md:
      "`played_at - lag(played_at)` da un `interval`; `extract(epoch FROM ...)` lo pasa a segundos y dividir entre 86 400 lo convierte en días. `PARTITION BY user_id` garantiza que la comparación sea contra la reproducción anterior de la misma persona. La primera reproducción de cada oyente devuelve `NULL`.",
    is_published: true,
  },
  {
    slug: "laglead-q08-last-value-marco",
    section,
    lesson: brechas,
    type: "error_diagnosis",
    difficulty: "advanced",
    topic: "LAST_VALUE y el marco",
    tags: ["lag_lead", "first_value", "last_value", "frame"],
    estimated_seconds: 75,
    prompt_md:
      "La tabla `serie_mensual` tiene una fila por país y mes. Esta consulta debería mostrar, en cada fila, el total del último mes de ese país. En cambio, `ultimo` siempre coincide con `total`. ¿Por qué?",
    code_md:
      "```sql\nSELECT\n  country,\n  mes,\n  total,\n  last_value(total) OVER (PARTITION BY country ORDER BY mes) AS ultimo\nFROM serie_mensual;\n```",
    options: [
      {
        key: "a",
        body_md:
          "Con `ORDER BY` y sin marco explícito, la ventana termina en la fila actual; hay que abrirla con `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING`.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "`last_value` no admite `PARTITION BY` y por eso ignora el país.",
        is_correct: false,
        why_incorrect_md:
          "Sí lo admite, y de hecho aquí funciona: el problema no es la partición sino hasta dónde llega el marco dentro de ella.",
      },
      {
        key: "c",
        body_md: "Falta ordenar la consulta externa por `country, mes`.",
        is_correct: false,
        why_incorrect_md:
          "El `ORDER BY` final solo cambia la presentación; los valores calculados por la ventana serían los mismos.",
      },
      {
        key: "d",
        body_md: "`last_value` devuelve siempre la fila actual: es su comportamiento definido.",
        is_correct: false,
        why_incorrect_md:
          "Devuelve la última fila **del marco**. Como el marco por omisión termina en la fila actual, parece hacer eso; con el marco abierto devuelve la última de la partición.",
      },
    ],
    explanation_md:
      "Con `ORDER BY` y sin cláusula de marco, PostgreSQL aplica `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`. La «última fila» de ese marco es la fila actual. Abrir el marco hasta `UNBOUNDED FOLLOWING` resuelve el problema; una alternativa igual de válida y más legible es `first_value(total) OVER (PARTITION BY country ORDER BY mes DESC)`.",
    is_published: true,
  },
  {
    slug: "laglead-q09-filtrar-por-lag",
    section,
    lesson: basico,
    type: "single",
    difficulty: "advanced",
    topic: "Orden de evaluación",
    tags: ["lag_lead", "where", "cte"],
    estimated_seconds: 55,
    prompt_md:
      "Sobre una serie con una fila por mes, quieres quedarte solo con los meses cuyas ventas cayeron respecto del mes anterior. ¿Cuál es la forma correcta de filtrar?",
    code_md: null,
    options: [
      {
        key: "a",
        body_md:
          "Calcular el `lag` en una CTE o subconsulta y aplicar el `WHERE` en la consulta externa.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Escribir `WHERE ventas < lag(ventas) OVER (ORDER BY mes)` en la misma consulta.",
        is_correct: false,
        why_incorrect_md:
          "No es válido: el `WHERE` se evalúa antes que las funciones de ventana, así que PostgreSQL rechaza la consulta con «window functions are not allowed in WHERE».",
      },
      {
        key: "c",
        body_md: "Usar `HAVING ventas < lag(ventas) OVER (ORDER BY mes)`.",
        is_correct: false,
        why_incorrect_md:
          "`HAVING` también se evalúa antes que las ventanas, y además está pensado para condiciones sobre agregados de un `GROUP BY`.",
      },
      {
        key: "d",
        body_md: "Agregar `FILTER (WHERE ventas < 0)` a la llamada de `lag`.",
        is_correct: false,
        why_incorrect_md:
          "`FILTER` solo se aplica a funciones de agregación: con `lag`, PostgreSQL responde «FILTER is not implemented for non-aggregate window functions». Además, `ventas < 0` no expresa «cayó respecto del mes anterior».",
      },
    ],
    explanation_md:
      "El orden lógico es `FROM` → `WHERE` → `GROUP BY` → `HAVING` → funciones de ventana → `SELECT` → `ORDER BY`. Para filtrar por el resultado de una ventana necesitas un nivel más: CTE o subconsulta, y el `WHERE` afuera.",
    is_published: true,
  },
  {
    slug: "laglead-q10-emparejar-funciones",
    section,
    lesson: brechas,
    type: "matching",
    difficulty: "intermediate",
    topic: "Funciones de posición",
    tags: ["lag_lead", "first_value", "last_value"],
    estimated_seconds: 80,
    prompt_md:
      "Relaciona cada función de ventana con lo que devuelve dentro de su partición (asumiendo el marco por omisión salvo que se indique otra cosa).",
    code_md: null,
    pairs: [
      { left: "lag(x)", right: "El valor de x en la fila anterior" },
      { left: "lead(x)", right: "El valor de x en la fila siguiente" },
      { left: "first_value(x)", right: "El valor de x en la primera fila de la partición" },
      {
        left: "last_value(x) con marco hasta UNBOUNDED FOLLOWING",
        right: "El valor de x en la última fila de la partición",
      },
      { left: "nth_value(x, 3)", right: "El valor de x en la tercera fila del marco" },
    ],
    explanation_md:
      "`lag` y `lead` son relativas a la fila actual; `first_value`, `last_value` y `nth_value` son absolutas dentro del marco. Por eso `last_value` depende tanto de la cláusula de marco: sin abrirla, «la última del marco» es la fila actual.",
    is_published: true,
  },
  {
    slug: "laglead-q11-sesiones-null",
    section,
    lesson: brechas,
    type: "multiple",
    difficulty: "advanced",
    topic: "Detección de sesiones",
    tags: ["lag_lead", "null_handling", "case"],
    estimated_seconds: 90,
    prompt_md:
      "Marcas el inicio de sesión con `CASE WHEN played_at - lag(played_at) OVER (PARTITION BY user_id ORDER BY played_at) > interval '30 minutes' THEN 1 ELSE 0 END`. ¿Qué afirmaciones sobre esa expresión son correctas? (Puede haber más de una.)",
    code_md: null,
    options: [
      {
        key: "a",
        body_md:
          "La primera reproducción de cada oyente queda marcada con 0, porque comparar con `NULL` no da verdadero.",
        is_correct: true,
      },
      {
        key: "b",
        body_md:
          "Para que la primera reproducción de cada oyente abra una sesión, basta con agregar antes de la comparación una rama `WHEN lag(played_at) OVER (PARTITION BY user_id ORDER BY played_at) IS NULL THEN 1`.",
        is_correct: true,
      },
      {
        key: "c",
        body_md:
          "La consulta falla con error porque no se puede restar `NULL` de un `timestamptz`.",
        is_correct: false,
        why_incorrect_md:
          "No falla: la resta devuelve `NULL` y la comparación también. El problema es silencioso, que es lo que lo hace peligroso.",
      },
      {
        key: "d",
        body_md:
          "Sin `PARTITION BY user_id`, la brecha se mediría contra la reproducción de otra persona.",
        is_correct: true,
      },
      {
        key: "e",
        body_md: "Usar `>=` en lugar de `>` no cambiaría ningún resultado.",
        is_correct: false,
        why_incorrect_md:
          "Cambia el caso límite: una pausa de exactamente 30 minutos pasaría a contar como sesión nueva. Con datos al segundo es raro, pero la definición del negocio debe decidirlo.",
      },
    ],
    explanation_md:
      "En lógica de tres valores, `NULL > interval '30 minutes'` es `NULL`, y `CASE` solo toma la rama cuando la condición es verdadera. Por eso el patrón correcto es `WHEN anterior IS NULL OR played_at - anterior > interval '30 minutes' THEN 1`: la primera actividad de cada persona siempre abre sesión.",
    is_published: true,
  },
  {
    slug: "laglead-q12-periodo-incompleto",
    section,
    lesson: variaciones,
    type: "scenario",
    difficulty: "intermediate",
    topic: "Períodos incompletos",
    tags: ["lag_lead", "date_boundary", "reporting"],
    estimated_seconds: 60,
    prompt_md:
      "Hoy es 15 de septiembre. Tu informe de variación mensual de ventas muestra septiembre con −54 % contra agosto, y la dirección de la empresa pregunta qué pasó. ¿Cuál es la respuesta correcta y qué conviene hacer?",
    code_md: null,
    options: [
      {
        key: "a",
        body_md:
          "El mes está a la mitad: hay que excluirlo del informe o marcarlo como incompleto, no compararlo como si fuera un mes cerrado.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Multiplicar el valor de septiembre por 2 para dejarlo comparable.",
        is_correct: false,
        why_incorrect_md:
          "Proyectar puede tener sentido como estimación **declarada**, pero nunca sustituyendo el dato real en la misma columna: mezcla un hecho con un supuesto.",
      },
      {
        key: "c",
        body_md: "Cambiar `lag(x)` por `lag(x, 2)` para comparar contra julio.",
        is_correct: false,
        why_incorrect_md:
          "Comparar medio septiembre contra julio completo tiene el mismo defecto, y además cambia la métrica sin avisar a quien la lee.",
      },
      {
        key: "d",
        body_md: "Es una caída real del negocio y hay que investigar el producto.",
        is_correct: false,
        why_incorrect_md:
          "Con medio mes transcurrido, una caída cercana al 50 % es exactamente lo que produce comparar medio mes contra un mes completo. Antes de hablar de una caída del negocio hay que comparar períodos equivalentes.",
      },
    ],
    explanation_md:
      "Un período en curso casi siempre se ve como una caída enorme, porque todavía no terminó. Las dos salidas honestas son filtrarlo (por ejemplo, `fecha < date_trunc('month', current_date)`) o marcarlo con una bandera de «incompleto» para que la variación no se lea como un hecho del negocio.",
    is_published: true,
  },
  {
    slug: "laglead-q13-empates-en-el-orden",
    section,
    lesson: basico,
    type: "scenario",
    difficulty: "advanced",
    topic: "Empates en el ORDER BY de la ventana",
    tags: ["lag_lead", "order_by", "determinismo"],
    estimated_seconds: 80,
    prompt_md:
      "Calculas la diferencia contra el pago anterior con `lag(amount) OVER (PARTITION BY order_id ORDER BY paid_at)`. En esta tabla hay pedidos con dos pagos registrados exactamente en el mismo instante. Ejecutas la consulta dos veces y algunos valores cambian. ¿Por qué?",
    code_md: null,
    options: [
      {
        key: "a",
        body_md:
          "Cuando dos filas empatan en la clave de orden, cuál queda antes no está definido, así que `lag` puede tomar una u otra en cada ejecución. Hay que agregar un criterio de desempate, por ejemplo `ORDER BY paid_at, id`.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Porque los datos cambian entre una ejecución y otra.",
        is_correct: false,
        why_incorrect_md:
          "El planteo es sobre los mismos datos. Aunque la tabla estuviera congelada, el resultado seguiría pudiendo variar: la causa está en la consulta, no en la base.",
      },
      {
        key: "c",
        body_md: "Porque falta `ROWS BETWEEN 1 PRECEDING AND 1 PRECEDING` para fijar el marco.",
        is_correct: false,
        why_incorrect_md:
          "`lag` no se apoya en el marco: se define por la posición dentro de la partición ordenada. Agregar una cláusula de marco no cambia nada aquí.",
      },
      {
        key: "d",
        body_md: "Porque `PARTITION BY order_id` obliga a ordenar por `order_id` también.",
        is_correct: false,
        why_incorrect_md:
          "La partición ya separa por pedido; repetir `order_id` en el `ORDER BY` es redundante y no desempata dos pagos del mismo pedido con la misma marca de tiempo.",
      },
    ],
    explanation_md:
      "Un `ORDER BY` con empates deja el orden de las filas empatadas a criterio del motor, y ese criterio puede cambiar con el plan de ejecución o el paralelismo. Toda ventana que vaya a un informe necesita una clave de orden única: agrega una columna de desempate estable (el identificador, por ejemplo). Es el mismo cuidado que exige `row_number()`, y acá el síntoma es peor, porque el número sale distinto sin ningún error.",
    is_published: true,
  },
  {
    slug: "laglead-q14-marco-no-afecta-a-lag",
    section,
    lesson: brechas,
    type: "single",
    difficulty: "advanced",
    topic: "El marco y las funciones de desplazamiento",
    tags: ["lag_lead", "frame", "window_function"],
    estimated_seconds: 70,
    prompt_md:
      "Alguien agrega `ROWS BETWEEN 2 PRECEDING AND CURRENT ROW` a una ventana que usa `lag(ventas)` y a otra que usa `avg(ventas)`, ambas con el mismo `PARTITION BY` y el mismo `ORDER BY`. ¿Qué cambia?",
    code_md: null,
    options: [
      {
        key: "a",
        body_md:
          "Cambia el `avg`, que pasa a promediar solo las tres últimas filas; el `lag` devuelve lo mismo, porque las funciones de desplazamiento no miran el marco.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Cambian las dos: el marco define qué filas ve cualquier función de ventana.",
        is_correct: false,
        why_incorrect_md:
          "El marco define qué filas ve una función de agregación dentro de la ventana, y también `first_value`, `last_value` y `nth_value`. `lag` y `lead` se definen por posición dentro de la partición y lo ignoran.",
      },
      {
        key: "c",
        body_md: "No cambia ninguna: el marco solo se aplica cuando se escribe `RANGE`.",
        is_correct: false,
        why_incorrect_md:
          "`ROWS` y `RANGE` son dos maneras de expresar el marco, no la diferencia entre tenerlo y no tenerlo. Con `ORDER BY` siempre hay un marco: si no lo escribes, es `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`.",
      },
      {
        key: "d",
        body_md: "Cambia el `lag`, que pasa a mirar dos filas hacia atrás en lugar de una.",
        is_correct: false,
        why_incorrect_md:
          "Cuántas filas retrocede `lag` lo decide su segundo argumento (`lag(ventas, 2)`), no el marco. La cláusula de marco no altera el desplazamiento.",
      },
    ],
    explanation_md:
      "Una ventana tiene tres partes: la partición, el orden y el marco. `lag`, `lead`, `row_number` y `rank` usan solo las dos primeras; las agregaciones de ventana (`sum`, `avg`, `count`) y `first_value` / `last_value` / `nth_value` usan las tres. Saber cuál es cuál te ahorra el error inverso, que es mucho más común: esperar que `last_value` devuelva la última fila de la partición cuando el marco por omisión la corta en la fila actual.",
    is_published: true,
  },
];
