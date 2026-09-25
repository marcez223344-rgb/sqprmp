import type { QuestionDef } from "../schemas/question";

const section = "totales-acumulados-promedios-moviles";
const acumulados = "acumulados-por-periodo";
const marcos = "marcos-rows-range";
const moviles = "promedios-moviles";

export const questions: QuestionDef[] = [
  {
    slug: "acum-q01-order-by-en-over",
    section,
    lesson: acumulados,
    type: "single",
    difficulty: "easy",
    topic: "Acumulado básico",
    tags: ["window_function", "acumulado"],
    estimated_seconds: 40,
    prompt_md:
      "Una consulta devuelve una fila por mes con la columna `altas`. ¿Qué diferencia hay entre `sum(altas) OVER ()` y `sum(altas) OVER (ORDER BY mes)`?",
    options: [
      {
        key: "a",
        body_md:
          "La primera repite el total general en cada fila; la segunda devuelve el acumulado hasta ese mes.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Las dos devuelven el acumulado; la segunda solo cambia el orden de salida.",
        is_correct: false,
        why_incorrect_md:
          "El `ORDER BY` dentro de `OVER` no ordena el resultado: hace que el marco por omisión vaya del inicio de la partición hasta la fila actual.",
      },
      {
        key: "c",
        body_md: "La primera devuelve el acumulado y la segunda, el total general.",
        is_correct: false,
        why_incorrect_md: "Es al revés: sin `ORDER BY`, el marco abarca toda la partición.",
      },
      {
        key: "d",
        body_md: "La segunda falla porque `OVER` no admite `ORDER BY`.",
        is_correct: false,
        why_incorrect_md:
          "`OVER` admite `PARTITION BY`, `ORDER BY` y una cláusula de marco; las tres son opcionales.",
      },
    ],
    explanation_md:
      "Sin `ORDER BY`, el marco por omisión es la partición completa. Con `ORDER BY` y sin marco explícito, el marco es `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`: de ahí sale el acumulado.",
    is_published: true,
  },
  {
    slug: "acum-q02-marco-por-omision",
    section,
    lesson: marcos,
    type: "fill_blank",
    difficulty: "intermediate",
    topic: "Marco por omisión",
    tags: ["window_function", "frame"],
    estimated_seconds: 45,
    prompt_md:
      "Cuando una ventana tiene `ORDER BY` y no declaras marco, PostgreSQL aplica `___ BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`. Escribe solo la palabra clave que falta (el modo del marco).",
    answer: { accepted: ["RANGE", "range"], case_sensitive: false },
    explanation_md:
      "El modo por omisión es `RANGE`, no `ROWS`. La diferencia solo se nota cuando hay empates en la clave de orden: con `RANGE`, la fila actual incluye a todas sus empatadas.",
    is_published: true,
  },
  {
    slug: "acum-q03-rows-vs-range-empates",
    section,
    lesson: marcos,
    type: "scenario",
    difficulty: "advanced",
    topic: "ROWS frente a RANGE",
    tags: ["window_function", "frame", "empates"],
    estimated_seconds: 75,
    prompt_md:
      "Una tabla tiene tres pagos del `2025-03-04` (de 100, 200 y 300) y uno del `2025-03-05` (de 50). Calculas `sum(monto) OVER (ORDER BY fecha)`. ¿Qué valor muestran las tres filas del 4 de marzo?",
    options: [
      { key: "a", body_md: "600 en las tres filas.", is_correct: true },
      {
        key: "b",
        body_md: "100, 300 y 600 respectivamente.",
        is_correct: false,
        why_incorrect_md:
          "Un acumulado que avanza fila por fila sale con `ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`, y aun así el orden entre los tres pagos empatados no está garantizado. Con el marco por omisión, las tres filas comparten el mismo valor.",
      },
      {
        key: "c",
        body_md: "650 en las tres filas.",
        is_correct: false,
        why_incorrect_md:
          "El marco llega hasta la fila actual y sus empatadas del mismo día; el pago del 5 de marzo es posterior y queda fuera.",
      },
      {
        key: "d",
        body_md: "100, 200 y 300: cada fila muestra su propio monto.",
        is_correct: false,
        why_incorrect_md:
          "Eso sería un marco `ROWS BETWEEN CURRENT ROW AND CURRENT ROW`, que hay que pedir explícitamente.",
      },
    ],
    explanation_md:
      "El marco por omisión es `RANGE`, y con `RANGE` «la fila actual» abarca todas las filas con el mismo valor de `fecha`. Las tres comparten el acumulado del día completo: 600. Con `ROWS` el acumulado avanzaría fila por fila (por ejemplo 100, 300 y 600), en un orden entre empatados que PostgreSQL no garantiza si no agregas un desempate.",
    is_published: true,
  },
  {
    slug: "acum-q04-media-movil-siete-dias",
    section,
    lesson: moviles,
    type: "single",
    difficulty: "intermediate",
    topic: "Media móvil",
    tags: ["window_function", "frame", "media_movil"],
    estimated_seconds: 45,
    prompt_md:
      "Tienes una serie con exactamente una fila por día. ¿Qué marco calcula la media móvil de 7 días **incluido el día actual**?",
    options: [
      { key: "a", body_md: "`ROWS BETWEEN 6 PRECEDING AND CURRENT ROW`", is_correct: true },
      {
        key: "b",
        body_md: "`ROWS BETWEEN 7 PRECEDING AND CURRENT ROW`",
        is_correct: false,
        why_incorrect_md: "Son ocho filas: siete anteriores más la actual.",
      },
      {
        key: "c",
        body_md: "`ROWS BETWEEN 7 PRECEDING AND 1 PRECEDING`",
        is_correct: false,
        why_incorrect_md:
          "Son siete filas, pero excluyen el día actual: es la media de los siete días previos, otra métrica.",
      },
      {
        key: "d",
        body_md: "`ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`",
        is_correct: false,
        why_incorrect_md: "Ese es el promedio acumulado desde el inicio de la serie.",
      },
    ],
    explanation_md:
      "Una ventana de N períodos que termina en el actual se escribe `N-1 PRECEDING AND CURRENT ROW`. Para 7 días: `6 PRECEDING`.",
    is_published: true,
  },
  {
    slug: "acum-q05-filtrar-antes-o-despues",
    section,
    lesson: moviles,
    type: "true_false",
    difficulty: "intermediate",
    topic: "Orden de evaluación",
    tags: ["window_function", "where"],
    estimated_seconds: 40,
    prompt_md:
      "Si filtras el período en el `WHERE` de la misma consulta que calcula una media móvil de 7 días, la media de los primeros días del período se calcula con menos de 7 valores.",
    options: [
      { key: "a", body_md: "Verdadero", is_correct: true },
      {
        key: "b",
        body_md: "Falso",
        is_correct: false,
        why_incorrect_md:
          "`WHERE` se evalúa antes que las funciones de ventana, así que la ventana nunca ve las filas descartadas y el marco se recorta al inicio del período.",
      },
    ],
    explanation_md:
      "Para que el primer día ya tenga una media completa hay que calcular la ventana sobre una serie más larga y recortar el período en un nivel externo (subconsulta o CTE).",
    is_published: true,
  },
  {
    slug: "acum-q06-partition-by-periodo",
    section,
    lesson: acumulados,
    type: "error_diagnosis",
    difficulty: "intermediate",
    topic: "PARTITION BY frente a ORDER BY",
    tags: ["window_function", "partition_by"],
    estimated_seconds: 60,
    prompt_md:
      "La tabla `mensual` tiene una fila por país y mes. Se pedía el acumulado de reproducciones de cada país mes a mes, pero la columna `acumulado` suma países distintos dentro de un mismo mes y nunca avanza de un mes al siguiente. ¿Cuál es el error?",
    code_md:
      "```sql\nSELECT\n  country,\n  mes,\n  reproducciones,\n  sum(reproducciones) OVER (PARTITION BY mes ORDER BY country) AS acumulado\nFROM mensual;\n```",
    options: [
      {
        key: "a",
        body_md:
          "Están intercambiados: el grupo es `country` y el avance es `mes`, o sea `PARTITION BY country ORDER BY mes`.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Falta un marco `ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`.",
        is_correct: false,
        why_incorrect_md:
          "Cambiar el marco no cambia qué filas forman cada partición: el acumulado seguiría recorriendo países dentro de cada mes. El problema es sobre qué columnas se particiona y se ordena.",
      },
      {
        key: "c",
        body_md: "Falta un `GROUP BY country, mes` en la consulta externa.",
        is_correct: false,
        why_incorrect_md:
          "La tabla `mensual` ya tiene una fila por país y mes; agrupar de nuevo no cambia nada y no arregla la ventana.",
      },
      {
        key: "d",
        body_md: "`sum` no puede usarse como función de ventana; debería ser `cumsum`.",
        is_correct: false,
        why_incorrect_md:
          "Cualquier función de agregación puede usarse con `OVER`; `cumsum` no existe en SQL.",
      },
    ],
    explanation_md:
      "Particionar por el período deja una partición por mes con una fila por país, así que el acumulado recorre países y nunca avanza en el tiempo. El período va en el `ORDER BY` de la ventana; la dimensión que reinicia la cuenta, en el `PARTITION BY`.",
    is_published: true,
  },
  {
    slug: "acum-q07-participacion-acumulada",
    section,
    lesson: acumulados,
    type: "query_interpretation",
    difficulty: "advanced",
    topic: "Participación acumulada",
    tags: ["window_function", "pareto"],
    estimated_seconds: 70,
    prompt_md: "¿Qué representa `pct_acumulado` en esta consulta?",
    code_md:
      "```sql\nSELECT\n  artista,\n  reproducciones,\n  round(100.0 * sum(reproducciones) OVER (ORDER BY reproducciones DESC, artista)\n        / sum(reproducciones) OVER (), 2) AS pct_acumulado\nFROM por_artista\nORDER BY reproducciones DESC, artista;\n```",
    options: [
      {
        key: "a",
        body_md:
          "El porcentaje del total de reproducciones que explican ese artista y todos los que lo superan.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "El porcentaje del total que explica ese artista por sí solo.",
        is_correct: false,
        why_incorrect_md:
          "Eso sería `100.0 * reproducciones / sum(reproducciones) OVER ()`, sin acumular en el numerador.",
      },
      {
        key: "c",
        body_md: "Siempre 100, porque numerador y denominador suman lo mismo.",
        is_correct: false,
        why_incorrect_md:
          "Solo el denominador abarca toda la partición; el numerador tiene `ORDER BY`, así que su marco llega hasta la fila actual.",
      },
      {
        key: "d",
        body_md: "El porcentaje acumulado del artista menos escuchado hacia arriba.",
        is_correct: false,
        why_incorrect_md: "El acumulado sigue el `ORDER BY ... DESC`: va de mayor a menor.",
      },
    ],
    explanation_md:
      "Es la curva de Pareto: el numerador acumula en orden descendente y el denominador es el gran total. La primera fila donde `pct_acumulado` cruza 50 marca cuántos artistas explican la mitad de la escucha.",
    is_published: true,
  },
  {
    slug: "acum-q08-modos-de-marco",
    section,
    lesson: marcos,
    type: "matching",
    difficulty: "intermediate",
    topic: "Modos de marco",
    tags: ["window_function", "frame"],
    estimated_seconds: 80,
    prompt_md: "Relaciona cada cláusula de marco con lo que calcula sobre una serie diaria.",
    pairs: [
      {
        left: "ROWS BETWEEN 1 PRECEDING AND CURRENT ROW",
        right: "Promedio o suma de la fila actual y la inmediatamente anterior",
      },
      {
        left: "ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW",
        right: "Acumulado desde el inicio, avanzando fila por fila",
      },
      {
        left: "RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW",
        right: "Acumulado desde el inicio en el que las filas empatadas comparten valor",
      },
      {
        left: "ROWS BETWEEN CURRENT ROW AND UNBOUNDED FOLLOWING",
        right: "Suma de lo que queda desde la fila actual hasta el final de la serie",
      },
      {
        left: "Ventana con PARTITION BY y sin ORDER BY",
        right: "Total del grupo repetido en cada una de sus filas",
      },
    ],
    explanation_md:
      "El modo (`ROWS`, `RANGE`, `GROUPS`) decide **cómo se cuentan** los límites, y los límites deciden **hasta dónde llega** el marco. Sin `ORDER BY` no hay noción de avance: el marco es la partición completa.",
    is_published: true,
  },
  {
    slug: "acum-q09-dias-faltantes",
    section,
    lesson: moviles,
    type: "scenario",
    difficulty: "advanced",
    topic: "Períodos faltantes",
    tags: ["window_function", "frame", "null_handling"],
    estimated_seconds: 80,
    prompt_md:
      "Un artista solo tiene filas los días en que alguien lo escuchó: de 46 días del período, 20 no aparecen en la serie. Calculas `avg(reproducciones) OVER (ORDER BY dia ROWS BETWEEN 6 PRECEDING AND CURRENT ROW)` y lo publicas como «media de 7 días». ¿Qué está mal?",
    options: [
      {
        key: "a",
        body_md:
          "Las «7 filas» pueden abarcar muchas más de 7 jornadas de calendario, así que la ventana no es de 7 días.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Nada: `ROWS` siempre cuenta días cuando la clave de orden es una fecha.",
        is_correct: false,
        why_incorrect_md:
          "`ROWS` cuenta filas presentes en el resultado, no unidades de tiempo. Los días ausentes simplemente no existen para la ventana.",
      },
      {
        key: "c",
        body_md: "El promedio da NULL porque faltan días.",
        is_correct: false,
        why_incorrect_md:
          "Los días faltantes no son filas con NULL: no son filas en absoluto. El promedio se calcula con las que hay.",
      },
      {
        key: "d",
        body_md: "Debería usarse `sum` en vez de `avg` para series con huecos.",
        is_correct: false,
        why_incorrect_md:
          "Cambiar la función no arregla el marco: la ventana seguiría abarcando un período temporal distinto del pedido.",
      },
    ],
    explanation_md:
      "Con huecos de calendario hay dos salidas: un marco temporal (`RANGE BETWEEN INTERVAL '6 days' PRECEDING AND CURRENT ROW`), que promedia los días con actividad dentro de la semana, o rellenar la serie con un calendario y `coalesce(..., 0)`, que cuenta los días vacíos como cero. Son métricas distintas: elige la que pide el negocio.",
    is_published: true,
  },
  {
    slug: "acum-q10-media-centrada",
    section,
    lesson: moviles,
    type: "multiple",
    difficulty: "advanced",
    topic: "Media móvil centrada",
    tags: ["window_function", "frame", "media_movil"],
    estimated_seconds: 80,
    prompt_md:
      "En una serie con una fila por día, calculas `avg(ventas) OVER (ORDER BY dia ROWS BETWEEN 3 PRECEDING AND 3 FOLLOWING)`. ¿Qué afirmaciones son correctas? Marca todas las correctas.",
    options: [
      {
        key: "a",
        body_md: "El marco abarca 7 filas cuando están todas disponibles.",
        is_correct: true,
      },
      {
        key: "b",
        body_md:
          "Las tres primeras y las tres últimas filas de la serie promedian menos de 7 valores.",
        is_correct: true,
      },
      {
        key: "c",
        body_md:
          "El valor de un día puede cambiar cuando se cargan los datos de los días siguientes.",
        is_correct: true,
      },
      {
        key: "d",
        body_md: "Es inválido: un marco no puede incluir filas posteriores a la actual.",
        is_correct: false,
        why_incorrect_md:
          "`FOLLOWING` es un límite válido; la única restricción es que el inicio del marco no sea posterior al fin.",
      },
      {
        key: "e",
        body_md: "Desplaza la curva suavizada hacia la derecha respecto de la serie original.",
        is_correct: false,
        why_incorrect_md:
          "Ese desplazamiento (el suavizado llega tarde a los cambios) es propio de la media hacia atrás, que solo mira días anteriores. La centrada mira tres días a cada lado, así que no se desplaza.",
      },
    ],
    explanation_md:
      "Una media centrada de 7 días toma tres días antes, el actual y tres después. Sigue mejor la forma de la curva, pero usa días posteriores: el valor de los días más recientes cambia a medida que llegan datos nuevos. Por eso, para seguir la operación día a día se usa la media hacia atrás.",
    is_published: true,
  },
  {
    slug: "acum-q11-filas-devueltas",
    section,
    lesson: acumulados,
    type: "single",
    difficulty: "easy",
    topic: "Ventanas y cantidad de filas",
    tags: ["window_function", "group_by"],
    estimated_seconds: 40,
    prompt_md:
      "Una CTE devuelve 21 filas (una por mes). Le agregas una columna `sum(altas) OVER (ORDER BY mes)`. ¿Cuántas filas devuelve la consulta?",
    options: [
      { key: "a", body_md: "21: la ventana agrega sin colapsar filas.", is_correct: true },
      {
        key: "b",
        body_md: "1: `sum` reduce el resultado a una sola fila.",
        is_correct: false,
        why_incorrect_md:
          "Con `OVER`, `sum` deja de ser una agregación que colapsa y pasa a ser una función de ventana.",
      },
      {
        key: "c",
        body_md: "42: una fila original y una acumulada por mes.",
        is_correct: false,
        why_incorrect_md:
          "La ventana agrega una **columna**, no filas. La cantidad de filas no cambia.",
      },
    ],
    explanation_md:
      "Las funciones de ventana se evalúan después de `GROUP BY` y `HAVING`, y devuelven un valor por cada fila que llega a esa fase: el número de filas no cambia.",
    is_published: true,
  },
  {
    slug: "acum-q12-division-entera",
    section,
    lesson: acumulados,
    type: "error_diagnosis",
    difficulty: "intermediate",
    topic: "Acumulado que se reinicia cada año",
    tags: ["window_function", "partition_by", "acumulado"],
    estimated_seconds: 60,
    prompt_md:
      "La tabla `ventas_mensuales` tiene una fila por mes, de enero de 2024 a junio de 2025, y la columna `mes` es de tipo `date`. Se pedía el acumulado del año en curso: en enero de 2025 la cuenta debía volver a empezar desde cero. Sin embargo, el acumulado de 2025 sigue sumando sobre el total de 2024. ¿Cómo se corrige?",
    code_md:
      "```sql\nSELECT\n  mes,\n  ventas,\n  sum(ventas) OVER (ORDER BY mes) AS acumulado_anual\nFROM ventas_mensuales;\n```",
    options: [
      {
        key: "a",
        body_md:
          "Agregando `PARTITION BY extract(year FROM mes)` a la ventana, para que cada año sea un grupo independiente.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Cambiando el `ORDER BY mes` por `ORDER BY extract(year FROM mes), mes`.",
        is_correct: false,
        why_incorrect_md:
          "El orden de las filas sería el mismo que antes. Ordenar no separa grupos: la cuenta solo se reinicia con `PARTITION BY`.",
      },
      {
        key: "c",
        body_md: "Agregando `WHERE mes >= DATE '2025-01-01'`.",
        is_correct: false,
        why_incorrect_md:
          "El acumulado de 2025 quedaría bien, pero los meses de 2024 desaparecerían del reporte, que debía mostrar los dos años.",
      },
      {
        key: "d",
        body_md: "Agregando el marco `ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`.",
        is_correct: false,
        why_incorrect_md:
          "Con una fila por mes no hay empates, así que ese marco da el mismo resultado que el marco por omisión: el acumulado seguiría arrastrando 2024.",
      },
    ],
    explanation_md:
      "El acumulado del año en curso (en inglés, _year to date_ o YTD) es un acumulado por grupo: el año va en el `PARTITION BY` y el mes en el `ORDER BY`. También sirve `PARTITION BY date_trunc('year', mes)`. Con esa partición, enero de cada año vuelve a empezar y los dos años se muestran en el mismo resultado.",
    is_published: true,
  },
];
