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
          "El `ORDER BY` dentro de `OVER` no ordena el resultado: define el marco por omisión, que va del inicio a la fila actual.",
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
      "Cuando una ventana tiene `ORDER BY` y no declaras marco, Postgres aplica `___ BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`. Escribe la palabra clave que falta (el modo del marco).",
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
          "Ese sería el resultado con `ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`, que cuenta filas físicas.",
      },
      {
        key: "c",
        body_md: "650 en las tres filas.",
        is_correct: false,
        why_incorrect_md:
          "El marco llega hasta la fila actual; el pago del 5 de marzo es posterior y queda fuera.",
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
      "El marco por omisión es `RANGE`, y con `RANGE` «la fila actual» abarca todas las filas con el mismo valor de `fecha`. Las tres comparten el acumulado del día completo: 600. Con `ROWS` verías 100, 300 y 600.",
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
      "Si filtras el período en el `WHERE` de la misma consulta que calcula la media móvil, los primeros días del período promedian menos valores de los pedidos.",
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
      "Se pedía el acumulado de reproducciones de cada país mes a mes, pero la columna `acumulado` siempre repite el valor de `reproducciones`. ¿Cuál es el error?",
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
          "Ese marco ya es el que se aplica por omisión; el problema es sobre qué columnas se particiona y se ordena.",
      },
      {
        key: "c",
        body_md: "Falta un `GROUP BY country, mes` en la consulta externa.",
        is_correct: false,
        why_incorrect_md:
          "La CTE `mensual` ya viene agregada; agrupar de nuevo colapsaría las filas que se quieren mostrar.",
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
      "Particionar por el período deja una partición por mes con una fila por país, así que el acumulado nunca avanza en el tiempo. El período va en el `ORDER BY` de la ventana; la dimensión que reinicia la curva, en el `PARTITION BY`.",
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
        left: "ROWS BETWEEN 6 PRECEDING AND CURRENT ROW",
        right: "Promedio o suma de las 7 filas que terminan en la actual",
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
        left: "ROWS BETWEEN 3 PRECEDING AND 3 FOLLOWING",
        right: "Media centrada que también mira días posteriores",
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
      "Sobre `ROWS BETWEEN 3 PRECEDING AND 3 FOLLOWING`, ¿qué afirmaciones son correctas? Selecciona todas las que correspondan.",
    options: [
      {
        key: "a",
        body_md: "El marco abarca 7 filas cuando están todas disponibles.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Las últimas tres filas de la serie promedian menos valores.",
        is_correct: true,
      },
      {
        key: "c",
        body_md:
          "No sirve para un tablero en vivo, porque usa información posterior al día actual.",
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
          "Ese desplazamiento es el defecto de la media hacia atrás. La centrada lo evita, y por eso se prefiere en análisis histórico.",
      },
    ],
    explanation_md:
      "Una media centrada de 7 días toma tres días antes, el actual y tres después. Sigue mejor la forma de la curva, pero mira al futuro: para operación diaria se usa la media hacia atrás.",
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
    topic: "Porcentajes acumulados",
    tags: ["window_function", "numeric_functions"],
    estimated_seconds: 60,
    prompt_md:
      "La columna `pct_acumulado` devuelve 0 en todas las filas, aunque los acumulados son correctos. ¿Cuál es la causa?",
    code_md:
      "```sql\nSELECT\n  artista,\n  sum(reproducciones) OVER (ORDER BY reproducciones DESC, artista)\n    / sum(reproducciones) OVER () * 100 AS pct_acumulado\nFROM por_artista;\n```",
    options: [
      {
        key: "a",
        body_md:
          "La división entre dos enteros es entera y trunca a 0; hay que multiplicar por `100.0` antes de dividir o convertir a `numeric`.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Falta `PARTITION BY artista` en la primera ventana.",
        is_correct: false,
        why_incorrect_md:
          "Eso dejaría una fila por partición y rompería el acumulado; no tiene relación con el 0.",
      },
      {
        key: "c",
        body_md: "El denominador vale 0 y Postgres devuelve 0 en vez de error.",
        is_correct: false,
        why_incorrect_md:
          "Dividir por cero lanza un error en Postgres, no devuelve 0; y el total de reproducciones no es cero.",
      },
      {
        key: "d",
        body_md: "`round` es obligatorio para que el resultado no se trunque.",
        is_correct: false,
        why_incorrect_md:
          "`round` solo redondea un valor que ya es decimal; el truncamiento ocurre antes, en la división entera.",
      },
    ],
    explanation_md:
      "`count(*)` y `sum` sobre enteros devuelven `bigint`, y `bigint / bigint` es división entera. Escribir `100.0 * numerador / denominador` fuerza aritmética decimal desde el primer operador.",
    is_published: true,
  },
];
