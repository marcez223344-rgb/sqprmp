import type { QuestionDef } from "../schemas/question";

const section = "cohortes-y-retencion";
const definir = "definir-una-cohorte";
const matriz = "matriz-de-retencion";
const nDias = "retencion-n-dias-y-churn";

export const questions: QuestionDef[] = [
  {
    slug: "cr-q01-que-define-una-cohorte",
    section,
    lesson: definir,
    type: "single",
    difficulty: "easy",
    topic: "Definición de cohorte",
    tags: ["cohortes", "retencion"],
    estimated_seconds: 45,
    prompt_md:
      "En un análisis de cohortes de altas, ¿qué determina a qué cohorte pertenece una persona?",
    options: [
      {
        key: "a",
        body_md:
          "El período de su evento de origen (por ejemplo, el mes de su alta), fijado una sola vez.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "El período de su última actividad registrada.",
        is_correct: false,
        why_incorrect_md:
          "Si la cohorte se recalcula con la actividad, cada persona cambia de cohorte todos los meses y la matriz deja de medir el paso del tiempo desde el alta.",
      },
      {
        key: "c",
        body_md: "El país o el plan contratado.",
        is_correct: false,
        why_incorrect_md:
          "País y plan son segmentos: sirven para partir el análisis, pero no definen la cohorte, que siempre se ancla a un evento de origen en el tiempo.",
      },
      {
        key: "d",
        body_md: "El período en que se calcula el informe.",
        is_correct: false,
        why_incorrect_md:
          "La fecha del informe define hasta dónde llegan los datos observados, no a qué grupo pertenece cada persona.",
      },
    ],
    explanation_md:
      "Una cohorte agrupa a quienes comparten un evento de origen en un mismo período. Ese evento se fija una vez y no cambia: quien se dio de alta en marzo de 2024 pertenece a la cohorte de marzo de 2024 para siempre.",
    is_published: true,
  },
  {
    slug: "cr-q02-denominador-cohorte-completa",
    section,
    lesson: definir,
    type: "true_false",
    difficulty: "easy",
    topic: "Denominador de la retención",
    tags: ["cohortes", "retencion", "join"],
    estimated_seconds: 40,
    prompt_md:
      "Para calcular la tasa de retención de una cohorte alcanza con unir la cohorte a la tabla de actividad con `INNER JOIN` y dividir personas activas por filas del resultado.",
    options: [
      { key: "a", body_md: "Falso", is_correct: true },
      {
        key: "b",
        body_md: "Verdadero",
        is_correct: false,
        why_incorrect_md:
          "El `INNER JOIN` descarta a quienes nunca tuvieron actividad, que son justamente las personas perdidas. Numerador y denominador quedan filtrados por la misma condición y la tasa se acerca al 100 %.",
      },
    ],
    explanation_md:
      "El denominador tiene que ser la cohorte completa. Se arma primero la cohorte y después se agrega la actividad con `LEFT JOIN` (o se pregunta con `EXISTS`), de modo que quienes no hicieron nada sigan contando en el total.",
    is_published: true,
  },
  {
    slug: "cr-q03-error-inner-join",
    section,
    lesson: definir,
    type: "error_diagnosis",
    difficulty: "intermediate",
    topic: "Errores en el cálculo de retención",
    tags: ["cohortes", "retencion", "join"],
    estimated_seconds: 75,
    prompt_md:
      "Esta consulta debería devolver, por cohorte, el porcentaje de oyentes con alguna reproducción. Devuelve 100,00 en todas las filas. ¿Cuál es el problema?",
    code_md:
      "```sql\nWITH cohortes AS (\n  SELECT id, date_trunc('month', signup_at AT TIME ZONE 'UTC')::date AS cohorte\n  FROM users\n)\nSELECT\n  c.cohorte,\n  round(100.0 * count(DISTINCT c.id) / count(DISTINCT c.id), 2) AS retencion_pct\nFROM cohortes AS c\nINNER JOIN plays AS p ON p.user_id = c.id\nGROUP BY 1;\n```",
    options: [
      {
        key: "a",
        body_md:
          "El `INNER JOIN` deja fuera a los oyentes sin reproducciones, así que numerador y denominador cuentan exactamente al mismo conjunto.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Falta `AT TIME ZONE 'UTC'` en `played_at`.",
        is_correct: false,
        why_incorrect_md:
          "La consulta no agrupa por el mes de la reproducción, así que el huso de `played_at` no interviene. Fijar el huso es necesario, pero no explica el 100 %.",
      },
      {
        key: "c",
        body_md: "`count(DISTINCT c.id)` debería ser `count(*)`.",
        is_correct: false,
        why_incorrect_md:
          "Cambiar la función de conteo no repara nada: con `count(*)` en ambos lados la división sigue dando 1, porque el problema es que ambos lados miden lo mismo.",
      },
      {
        key: "d",
        body_md: "Falta un `HAVING` que excluya las cohortes sin actividad.",
        is_correct: false,
        why_incorrect_md:
          "Las cohortes sin actividad ya desaparecieron por el `INNER JOIN`; agregar un `HAVING` quitaría filas, no corregiría la tasa.",
      },
    ],
    explanation_md:
      "El denominador debe salir de la cohorte completa, calculada antes de mirar la actividad. La forma correcta arma la cohorte, arma aparte el conjunto de personas con actividad y las une con `LEFT JOIN`: `count(*)` da la cohorte y `count(a.id)` los retenidos.",
    is_published: true,
  },
  {
    slug: "cr-q04-lectura-matriz-sin-distinct",
    section,
    lesson: matriz,
    type: "query_interpretation",
    difficulty: "intermediate",
    topic: "Numerador de la matriz de cohortes",
    tags: ["cohortes", "matriz", "distinct"],
    estimated_seconds: 75,
    prompt_md:
      "`plays` tiene varias filas por oyente y mes. ¿Qué mide realmente la columna `usuarios_activos` de esta consulta?",
    code_md:
      "```sql\nSELECT\n  c.cohorte,\n  date_trunc('month', p.played_at AT TIME ZONE 'UTC')::date AS mes,\n  count(*) AS usuarios_activos\nFROM cohortes AS c\nINNER JOIN plays AS p ON p.user_id = c.id\nGROUP BY 1, 2;\n```",
    options: [
      {
        key: "a",
        body_md: "Reproducciones de esa cohorte en ese mes, no personas.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Personas distintas de esa cohorte activas en ese mes.",
        is_correct: false,
        why_incorrect_md:
          "Para eso haría falta `count(DISTINCT p.user_id)` o un `SELECT DISTINCT` previo. `count(*)` cuenta filas de `plays`, y quien escuchó 40 canciones aporta 40.",
      },
      {
        key: "c",
        body_md: "Personas de la cohorte, activas o no, en ese mes.",
        is_correct: false,
        why_incorrect_md:
          "El `INNER JOIN` solo produce filas cuando hubo reproducciones: quienes no escucharon nada no aparecen en ningún mes.",
      },
      {
        key: "d",
        body_md: "El tamaño de la cohorte repetido en cada mes.",
        is_correct: false,
        why_incorrect_md:
          "El tamaño de la cohorte se calcula sobre `users` sin unir con la actividad; aquí el valor cambia mes a mes según cuánto se escuchó.",
      },
    ],
    explanation_md:
      "Sin `DISTINCT`, el numerador de la matriz cuenta eventos. Al dividirlo por el tamaño de la cohorte se obtienen «retenciones» muy por encima del 100 %, que es la señal clásica de que se están contando reproducciones en lugar de personas.",
    is_published: true,
  },
  {
    slug: "cr-q05-truncar-mes-con-huso",
    section,
    lesson: definir,
    type: "fill_blank",
    difficulty: "easy",
    topic: "Cohorte determinista",
    tags: ["cohortes", "fechas", "timezone"],
    estimated_seconds: 50,
    prompt_md:
      "Completa la cláusula que hace determinista el cálculo de la cohorte, para que `date_trunc` no dependa de la zona horaria de la sesión:\n\n```sql\ndate_trunc('month', signup_at ______ 'UTC')::date AS cohorte\n```\n\nEscribe solo las palabras que faltan.",
    answer: { accepted: ["AT TIME ZONE", "at time zone"], case_sensitive: false },
    explanation_md:
      "`signup_at` es `timestamptz`. `AT TIME ZONE 'UTC'` lo convierte a una marca de tiempo sin huso en UTC, de modo que el corte del calendario es el mismo en cualquier máquina. Sin esa conversión, un alta del 1 de marzo a las 00:30 UTC cae en febrero para una sesión configurada en Bogotá.",
    is_published: true,
  },
  {
    slug: "cr-q06-vocabulario-de-cohortes",
    section,
    lesson: matriz,
    type: "matching",
    difficulty: "intermediate",
    topic: "Vocabulario de cohortes y retención",
    tags: ["cohortes", "retencion", "churn"],
    estimated_seconds: 90,
    prompt_md: "Relaciona cada término con su definición.",
    pairs: [
      {
        left: "Cohorte",
        right: "Conjunto de personas que comparten el período de su evento de origen",
      },
      {
        left: "mes_indice",
        right: "Cantidad de meses transcurridos entre el mes de actividad y el mes de alta",
      },
      {
        left: "Churn",
        right: "Bajas del período divididas por la base activa al inicio del período",
      },
      {
        left: "Ventana de observación",
        right: "Tiempo de vida que una cohorte alcanzó a tener dentro de los datos disponibles",
      },
    ],
    explanation_md:
      "Los cuatro términos se confunden con facilidad. La cohorte agrupa por origen; `mes_indice` mide tiempo de vida, no calendario; el churn usa como denominador la base viva al inicio del período, no la cohorte de alta; y la ventana de observación es la que decide qué celdas de la matriz se pueden comparar.",
    is_published: true,
  },
  {
    slug: "cr-q07-lecturas-de-la-matriz",
    section,
    lesson: matriz,
    type: "multiple",
    difficulty: "advanced",
    topic: "Lectura de la matriz de cohortes",
    tags: ["cohortes", "matriz", "interpretacion"],
    estimated_seconds: 100,
    prompt_md:
      "¿Cuáles de estas afirmaciones sobre una matriz de cohortes mensual son correctas? Marca todas las que correspondan.",
    options: [
      {
        key: "a",
        body_md:
          "Leer una columna (el mismo `mes_indice` en cohortes distintas) sirve para saber si el producto mejoró con el tiempo.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Leer una fila de izquierda a derecha muestra la curva de vida de una cohorte.",
        is_correct: true,
      },
      {
        key: "c",
        body_md: "Las cohortes recientes tienen menos columnas porque su retención cae más rápido.",
        is_correct: false,
        why_incorrect_md:
          "Tienen menos columnas porque todavía no vivieron esos meses. La matriz es triangular por la ventana de observación, no por el comportamiento de la gente.",
      },
      {
        key: "d",
        body_md:
          "Una diagonal reúne cohortes distintas en el mismo mes de calendario, útil para detectar efectos externos.",
        is_correct: true,
      },
      {
        key: "e",
        body_md:
          "El promedio de una columna es comparable aunque algunas cohortes no hayan vivido ese mes completo.",
        is_correct: false,
        why_incorrect_md:
          "Si una cohorte no vivió ese mes, no aporta numerador pero sí aportaría denominador en un promedio mal armado; la columna solo se promedia sobre cohortes completamente observadas.",
      },
    ],
    explanation_md:
      "La matriz se lee en tres direcciones: a lo ancho (curva de vida), a lo alto (comparación entre cohortes en el mismo momento de vida) y en diagonal (efectos del calendario). Las dos afirmaciones falsas confunden la forma triangular, que es un artefacto del tiempo observado, con una señal del producto.",
    is_published: true,
  },
  {
    slug: "cr-q08-cohorte-incompleta",
    section,
    lesson: definir,
    type: "scenario",
    difficulty: "advanced",
    topic: "Ventanas de observación",
    tags: ["cohortes", "retencion", "sesgo"],
    estimated_seconds: 90,
    prompt_md:
      "Los datos de Ritmo terminan el 15 de septiembre de 2025. Te piden la retención a 30 días por cohorte de alta e incluyes todas las cohortes, incluida la de septiembre de 2025. La cohorte de septiembre aparece con la mitad de retención que el resto y tu jefa pregunta qué pasó ese mes. ¿Cuál es la respuesta correcta?",
    options: [
      {
        key: "a",
        body_md:
          "Nada pasó: esa gente no llegó a tener 30 días de observación, así que la cohorte debe excluirse hasta que complete la ventana.",
        is_correct: true,
      },
      {
        key: "b",
        body_md:
          "La calidad del tráfico de septiembre fue peor; conviene revisar las campañas de ese mes.",
        is_correct: false,
        why_incorrect_md:
          "Puede ser cierto o no, pero este resultado no lo demuestra: el número está determinado por el tiempo observado, no por el comportamiento.",
      },
      {
        key: "c",
        body_md:
          "Hay que dividir la cohorte de septiembre por la mitad de su tamaño para compensar los días faltantes.",
        is_correct: false,
        why_incorrect_md:
          "Reescalar el denominador inventa una corrección que nadie puede auditar. Lo correcto es excluir o marcar explícitamente la cohorte incompleta.",
      },
      {
        key: "d",
        body_md:
          "Es esperable: la retención a 30 días siempre es más baja en la cohorte más reciente.",
        is_correct: false,
        why_incorrect_md:
          "No es una ley del negocio, es un sesgo de medición. Con la ventana completa esa cohorte puede terminar por encima o por debajo del promedio.",
      },
    ],
    explanation_md:
      "Una métrica a N días solo puede calcularse sobre quienes ya tuvieron N días dentro de los datos. El filtro `signup_at < <fin de datos> - N días` es parte de la definición de la métrica, no un detalle técnico.",
    is_published: true,
  },
  {
    slug: "cr-q09-escalon-del-mes-cero",
    section,
    lesson: matriz,
    type: "single",
    difficulty: "advanced",
    topic: "El mes 0 en la matriz mensual",
    tags: ["cohortes", "matriz", "interpretacion"],
    estimated_seconds: 70,
    prompt_md:
      "En la curva de retención de Ritmo, el mes 0 da 53,80 % y el mes 1, 75,33 %: la retención sube antes de empezar a bajar. ¿Cuál es la explicación?",
    options: [
      {
        key: "a",
        body_md:
          "El mes 0 es un mes parcial: quien se registra el día 28 solo tiene tres días de ese mes para ser contado como activo.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Hay reproducciones anteriores al alta que ensucian el mes 0.",
        is_correct: false,
        why_incorrect_md:
          "En este dataset no existen reproducciones anteriores al alta; el índice de mes mínimo observado es 0. Si existieran, aparecerían como índices negativos, no como un mes 0 bajo.",
      },
      {
        key: "c",
        body_md: "Falta el `DISTINCT`, y eso infla el mes 1.",
        is_correct: false,
        why_incorrect_md:
          "Sin `DISTINCT` se inflarían todas las celdas, no solo el mes 1, y los porcentajes superarían el 100 %.",
      },
      {
        key: "d",
        body_md: "El denominador del mes 0 usa el total de usuarios del servicio.",
        is_correct: false,
        why_incorrect_md:
          "El denominador es el mismo para toda la fila: el tamaño de esa cohorte. Si fuera el total del servicio, todas las celdas de la fila bajarían por igual.",
      },
    ],
    explanation_md:
      "Con cortes de calendario, el mes de alta siempre está incompleto y su porcentaje no es comparable con el resto de la fila. Por eso muchos tableros publican la curva desde el mes 1, o cambian a ventanas relativas al alta de cada persona.",
    is_published: true,
  },
  {
    slug: "cr-q10-denominador-del-churn",
    section,
    lesson: nDias,
    type: "single",
    difficulty: "intermediate",
    topic: "Cálculo del churn",
    tags: ["churn", "retencion"],
    estimated_seconds: 60,
    prompt_md: "¿Cuál es el denominador correcto de la tasa de churn mensual de suscripciones?",
    options: [
      {
        key: "a",
        body_md: "Las suscripciones activas al inicio del mes.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Todas las suscripciones creadas desde el lanzamiento del servicio.",
        is_correct: false,
        why_incorrect_md:
          "Ese denominador crece sin parar, así que el churn baja mes a mes aunque se vaya la misma cantidad de gente. Es la forma más común de disimular una fuga.",
      },
      {
        key: "c",
        body_md: "Las suscripciones activas al cierre del mes.",
        is_correct: false,
        why_incorrect_md:
          "La base de cierre ya excluye a quienes se fueron durante el mes, así que el denominador no contiene a todas las suscripciones que corrieron riesgo de irse.",
      },
      {
        key: "d",
        body_md: "La cohorte de alta del mes.",
        is_correct: false,
        why_incorrect_md:
          "Esa es la base de una tasa de retención por cohorte, no del churn: el churn mide toda la base viva, sin importar cuándo se dio de alta cada quien.",
      },
    ],
    explanation_md:
      "Churn = bajas del período / base activa al inicio del período. Por eso no es el complemento de la retención por cohorte: tienen denominadores distintos y responden preguntas distintas.",
    is_published: true,
  },
  {
    slug: "cr-q11-error-between-timestamps",
    section,
    lesson: nDias,
    type: "error_diagnosis",
    difficulty: "advanced",
    topic: "Ventanas relativas al alta",
    tags: ["retencion", "fechas", "between"],
    estimated_seconds: 85,
    prompt_md:
      "Esta CTE debería marcar a quienes reprodujeron algo entre el día 1 y el día 30 después de su alta. ¿Qué problema tiene?",
    code_md:
      "```sql\nSELECT DISTINCT c.id\nFROM cohortes AS c\nINNER JOIN plays AS p ON p.user_id = c.id\nWHERE p.played_at BETWEEN c.signup_at + INTERVAL '1 day'\n                      AND c.signup_at + INTERVAL '30 days';\n```",
    options: [
      {
        key: "a",
        body_md:
          "`BETWEEN` es cerrado en ambos extremos: la ventana termina en el instante exacto del día 30 y deja fuera casi todo ese día.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "`BETWEEN` no puede usarse con valores `timestamptz`.",
        is_correct: false,
        why_incorrect_md:
          "Sí puede: es sintácticamente válido y se ejecuta sin error. El problema es de significado, no de tipos, y por eso pasa desapercibido.",
      },
      {
        key: "c",
        body_md: "Falta `AT TIME ZONE 'UTC'` en las dos comparaciones.",
        is_correct: false,
        why_incorrect_md:
          "La suma de un intervalo a un `timestamptz` y la comparación entre dos `timestamptz` no dependen del huso de la sesión. El huso solo hace falta cuando se corta el calendario.",
      },
      {
        key: "d",
        body_md: "El `DISTINCT` sobra porque el `INNER JOIN` ya devuelve una fila por persona.",
        is_correct: false,
        why_incorrect_md:
          "El `INNER JOIN` devuelve una fila por reproducción, así que el `DISTINCT` es necesario. Quitarlo empeoraría la consulta.",
      },
    ],
    explanation_md:
      "Con marcas de tiempo, la forma segura de acotar una ventana es un intervalo semiabierto: `>= signup_at + INTERVAL '1 day' AND < signup_at + INTERVAL '31 days'`. Así el día 30 entra completo y ningún instante se cuenta dos veces.",
    is_published: true,
  },
  {
    slug: "cr-q12-indice-de-mes-restando-fechas",
    section,
    lesson: matriz,
    type: "query_interpretation",
    difficulty: "intermediate",
    topic: "Índice de período",
    tags: ["cohortes", "fechas", "matriz"],
    estimated_seconds: 60,
    prompt_md:
      "`mes` y `cohorte` son de tipo `date` y siempre valen el primer día de un mes. Si `cohorte` es `2024-01-01` y `mes` es `2024-03-01`, ¿qué devuelve `periodo`?",
    code_md: "```sql\nSELECT mes - cohorte AS periodo\nFROM actividad;\n```",
    options: [
      { key: "a", body_md: "60, porque la resta de dos `date` devuelve días.", is_correct: true },
      {
        key: "b",
        body_md: "2, el número de meses transcurridos.",
        is_correct: false,
        why_incorrect_md:
          "PostgreSQL no devuelve meses al restar fechas. Para meses hay que restar año y mes por separado, o usar `age()` y extraer los componentes.",
      },
      {
        key: "c",
        body_md: "Un `interval` de 2 meses.",
        is_correct: false,
        why_incorrect_md:
          "La resta de dos `date` devuelve un `integer` de días. El resultado sería un `interval` si los operandos fueran `timestamp`.",
      },
      {
        key: "d",
        body_md: "Un error: no se pueden restar dos columnas `date`.",
        is_correct: false,
        why_incorrect_md:
          "La operación es válida y no falla; ese es justamente el riesgo, porque el resultado parece un índice de período razonable hasta que alguien lo mira de cerca.",
      },
    ],
    explanation_md:
      "Enero a marzo de 2024 son 31 + 29 = 60 días. Un índice de período hecho con días no es comparable entre cohortes, porque los meses duran distinto: el mes 1 valdría 28, 29, 30 o 31 según el caso. La forma correcta es `12 * (año_mes - año_cohorte) + (mes_mes - mes_cohorte)`.",
    is_published: true,
  },
];
