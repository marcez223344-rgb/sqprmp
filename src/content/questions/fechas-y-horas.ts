import type { QuestionDef } from "../schemas/question";

const section = "fechas-y-horas";
const tipos = "fechas-tipos-y-partes";
const diferencias = "fechas-diferencias-e-intervalos";
const rangos = "fechas-rangos-sin-errores-de-borde";

export const questions: QuestionDef[] = [
  {
    slug: "fechas-q01-extract-vs-date-trunc",
    section,
    lesson: tipos,
    type: "single",
    difficulty: "easy",
    topic: "EXTRACT frente a DATE_TRUNC",
    tags: ["date_functions", "date_trunc", "extract"],
    estimated_seconds: 50,
    prompt_md:
      "Necesitas la cantidad de pedidos **mes a mes** desde enero de 2024 hasta agosto de 2025, para un gráfico de evolución. ¿Qué expresión define correctamente el período de cada fila?",
    code_md: null,
    options: [
      { key: "a", body_md: "`DATE_TRUNC('month', created_at)`", is_correct: true },
      {
        key: "b",
        body_md: "`EXTRACT(MONTH FROM created_at)`",
        is_correct: false,
        why_incorrect_md:
          "Devuelve solo el número de mes: enero de 2024 y enero de 2025 caerían en el mismo grupo `1` y el gráfico mezclaría años.",
      },
      {
        key: "c",
        body_md: "`EXTRACT(YEAR FROM created_at)`",
        is_correct: false,
        why_incorrect_md: "Agrupa por año: obtendrías dos filas, no una serie mensual.",
      },
      {
        key: "d",
        body_md: "`created_at::date`",
        is_correct: false,
        why_incorrect_md: "Recorta al día, no al mes: tendrías una fila por cada día del período.",
      },
    ],
    explanation_md:
      "`DATE_TRUNC('month', ...)` lleva cualquier instante al primer día del mes a las 00:00, así que todos los pedidos del mismo mes de un mismo año comparten un valor. `EXTRACT` responde «qué parte»; `DATE_TRUNC`, «qué período».",
    is_published: true,
  },
  {
    slug: "fechas-q02-between-timestamp",
    section,
    lesson: rangos,
    type: "error_diagnosis",
    difficulty: "intermediate",
    topic: "Límites de rango con timestamps",
    tags: ["date_boundary", "between", "where"],
    estimated_seconds: 60,
    prompt_md:
      "La consulta no produce ningún mensaje de error, pero el total de enero siempre queda por debajo del que informa facturación. `created_at` es de tipo `timestamptz`. ¿Cuál es la causa?",
    code_md:
      "```sql\nSELECT id, total_amount\nFROM orders\nWHERE created_at BETWEEN DATE '2025-01-01' AND DATE '2025-01-31';\n```",
    options: [
      {
        key: "a",
        body_md:
          "El extremo superior equivale a `2025-01-31 00:00:00`, así que se pierden casi todos los pedidos del 31 de enero.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "`BETWEEN` excluye los dos extremos, así que faltan el 1 y el 31 de enero.",
        is_correct: false,
        why_incorrect_md:
          "`BETWEEN a AND b` es equivalente a `>= a AND <= b`: incluye ambos extremos. El problema es qué instante representa el extremo superior.",
      },
      {
        key: "c",
        body_md: "`BETWEEN` no se puede usar con fechas y el motor las compara como texto.",
        is_correct: false,
        why_incorrect_md:
          "`BETWEEN` funciona con fechas y timestamps; la comparación es temporal, no alfabética.",
      },
      {
        key: "d",
        body_md: "Falta un `ORDER BY`, por eso el motor descarta filas.",
        is_correct: false,
        why_incorrect_md: "`ORDER BY` solo ordena; nunca cambia qué filas devuelve la consulta.",
      },
    ],
    explanation_md:
      "Una fecha sin hora equivale a ese día a las 00:00. El arreglo es el rango medio abierto: `created_at >= DATE '2025-01-01' AND created_at < DATE '2025-02-01'`.",
    is_published: true,
  },
  {
    slug: "fechas-q03-limite-superior",
    section,
    lesson: rangos,
    type: "fill_blank",
    difficulty: "easy",
    topic: "Rango medio abierto",
    tags: ["date_boundary", "where"],
    estimated_seconds: 45,
    prompt_md:
      "Quieres todos los pedidos de **agosto de 2025** sobre una columna `timestamptz`, usando el patrón `created_at >= DATE '2025-08-01' AND created_at < DATE '____'`. ¿Qué fecha completa el segundo límite? Escríbela en formato `AAAA-MM-DD`.",
    code_md: null,
    answer: { accepted: ["2025-09-01"], case_sensitive: false },
    explanation_md:
      "El límite superior es el primer instante del mes siguiente. Con `<` (estricto) se incluye todo el 31 de agosto y no se cuela ningún pedido de septiembre.",
    is_published: true,
  },
  {
    slug: "fechas-q04-date-trunc-semana",
    section,
    lesson: tipos,
    type: "true_false",
    difficulty: "easy",
    topic: "DATE_TRUNC por semana",
    tags: ["date_trunc", "date_functions"],
    estimated_seconds: 30,
    prompt_md:
      "Verdadero o falso: en PostgreSQL, `DATE_TRUNC('week', fecha)` devuelve el **lunes** de esa semana.",
    code_md: null,
    options: [
      { key: "a", body_md: "Verdadero", is_correct: true },
      {
        key: "b",
        body_md: "Falso",
        is_correct: false,
        why_incorrect_md:
          "PostgreSQL sigue el estándar ISO 8601, donde la semana empieza el lunes. Si el negocio necesita semanas que empiecen el domingo, hay que ajustarlo a mano (por ejemplo, truncando `fecha + INTERVAL '1 day'` y restando el día después).",
      },
    ],
    explanation_md:
      "Es una fuente habitual de discusiones entre reportes: conviene dejar el criterio de inicio de semana escrito en la definición de la métrica.",
    is_published: true,
  },
  {
    slug: "fechas-q05-resta-de-fechas",
    section,
    lesson: diferencias,
    type: "query_interpretation",
    difficulty: "easy",
    topic: "Diferencias entre fechas",
    tags: ["date_functions", "interval", "cast"],
    estimated_seconds: 50,
    prompt_md: "¿Qué devuelve exactamente la columna `delivery_days` de esta consulta?",
    code_md:
      "```sql\nSELECT order_id,\n       delivered_at::date - shipped_at::date AS delivery_days\nFROM shipments\nWHERE delivered_at IS NOT NULL;\n```",
    options: [
      {
        key: "a",
        body_md: "Un número entero: los días calendario entre el despacho y la entrega.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Un intervalo con días, horas y minutos de tránsito.",
        is_correct: false,
        why_incorrect_md:
          "Eso ocurriría restando los timestamps sin convertirlos. Al llevarlos a `date` primero, la resta devuelve un entero.",
      },
      {
        key: "c",
        body_md: "La cantidad de horas entre ambos momentos.",
        is_correct: false,
        why_incorrect_md:
          "Para horas habría que usar `EXTRACT(EPOCH FROM (delivered_at - shipped_at)) / 3600`.",
      },
      {
        key: "d",
        body_md: "NULL para todos los envíos, porque no se pueden restar fechas.",
        is_correct: false,
        why_incorrect_md:
          "Restar dos valores `date` es una operación válida en PostgreSQL y devuelve un entero.",
      },
    ],
    explanation_md:
      "`::date` recorta cada instante a su día; la resta entre dos `date` da días calendario. Un envío despachado el 1 a las 23:50 y entregado el 2 a las 00:10 cuenta como 1 día, aunque el tránsito real fuera de 20 minutos: es una decisión de negocio que conviene documentar.",
    is_published: true,
  },
  {
    slug: "fechas-q06-extract-day-interval",
    section,
    lesson: diferencias,
    type: "single",
    difficulty: "intermediate",
    topic: "EXTRACT sobre intervalos",
    tags: ["extract", "interval", "date_functions"],
    estimated_seconds: 50,
    prompt_md:
      "Un envío se despachó el `2025-09-01 20:00` y se entregó el `2025-09-10 08:00`. ¿Qué devuelve `EXTRACT(DAY FROM (delivered_at - shipped_at))`?",
    code_md: null,
    options: [
      {
        key: "a",
        body_md: "`8`, porque toma solo el componente de días del intervalo `8 days 12:00:00`.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "`9`, porque redondea hacia arriba los 8 días y medio.",
        is_correct: false,
        why_incorrect_md:
          "`EXTRACT` no redondea: lee el componente que le pides y descarta el resto.",
      },
      {
        key: "c",
        body_md: "`10`, porque devuelve el día del mes de la entrega.",
        is_correct: false,
        why_incorrect_md:
          "Eso haría `EXTRACT(DAY FROM delivered_at)`, sobre un timestamp. Aquí el argumento es un intervalo.",
      },
      {
        key: "d",
        body_md: "`8.5`, la duración exacta en días.",
        is_correct: false,
        why_incorrect_md:
          "Para la duración total con fracciones necesitas `EXTRACT(EPOCH FROM ...) / 86400`.",
      },
    ],
    explanation_md:
      "`EXTRACT(DAY FROM intervalo)` trunca por componente y pierde las 12 horas restantes. Si mides duraciones, usa `EPOCH` y divide por la unidad que necesites.",
    is_published: true,
  },
  {
    slug: "fechas-q07-afirmaciones-intervalos",
    section,
    lesson: diferencias,
    type: "multiple",
    difficulty: "intermediate",
    topic: "Intervalos y aritmética de fechas",
    tags: ["interval", "date_functions", "null_handling"],
    estimated_seconds: 70,
    prompt_md:
      "¿Cuáles de estas afirmaciones sobre la aritmética de fechas en PostgreSQL son correctas? Selecciona todas las que apliquen.",
    code_md: null,
    options: [
      {
        key: "a",
        body_md:
          "`placed_at + promised_minutes * INTERVAL '1 minute'` convierte un número de la tabla en una duración y la suma al instante del pedido.",
        is_correct: true,
      },
      {
        key: "b",
        body_md:
          "`EXTRACT(EPOCH FROM (delivered_at - placed_at)) / 60` da la duración total en minutos.",
        is_correct: true,
      },
      {
        key: "c",
        body_md: "Si `delivered_at` es NULL, `delivered_at - placed_at` devuelve NULL.",
        is_correct: true,
      },
      {
        key: "d",
        body_md: "`placed_at + 45` suma 45 minutos a un `timestamptz`.",
        is_correct: false,
        why_incorrect_md:
          "No se puede sumar un número suelto a un timestamp: hay que expresarlo como intervalo (`45 * INTERVAL '1 minute'` o `INTERVAL '45 minutes'`).",
      },
      {
        key: "e",
        body_md: "`AGE(fecha)` con un solo argumento es reproducible en cualquier momento.",
        is_correct: false,
        why_incorrect_md:
          "Con un argumento, `AGE` compara contra la fecha actual del servidor: el resultado cambia cada día. Para resultados reproducibles, escribe la fecha de referencia de forma explícita.",
      },
    ],
    explanation_md:
      "Un `interval` es el puente entre números y fechas: `número * INTERVAL '1 unidad'` para ir de número a duración, y `EXTRACT(EPOCH FROM ...)` para volver a número.",
    is_published: true,
  },
  {
    slug: "fechas-q08-emparejar-funciones",
    section,
    lesson: tipos,
    type: "matching",
    difficulty: "easy",
    topic: "Funciones de fecha y su uso",
    tags: ["date_functions", "to_char", "age"],
    estimated_seconds: 70,
    prompt_md: "Relaciona cada necesidad de reporte con la función más adecuada de PostgreSQL.",
    code_md: null,
    pairs: [
      { left: "Agrupar los pedidos por trimestre para una serie temporal", right: "DATE_TRUNC" },
      { left: "Saber en qué día de la semana se hicieron más pedidos", right: "EXTRACT" },
      { left: "Mostrar la fecha como 31/08/2025 en un PDF", right: "TO_CHAR" },
      { left: "Expresar la antigüedad de un vendedor en años y meses", right: "AGE" },
      { left: "Sumar 7 días a la fecha de un pedido", right: "INTERVAL" },
    ],
    explanation_md:
      "`DATE_TRUNC` arma períodos, `EXTRACT` saca partes, `TO_CHAR` da formato de presentación, `AGE` expresa antigüedades en años/meses/días e `INTERVAL` desplaza una fecha en el tiempo.",
    is_published: true,
  },
  {
    slug: "fechas-q09-filtro-y-rendimiento",
    section,
    lesson: rangos,
    type: "scenario",
    difficulty: "intermediate",
    topic: "Criterio de filtrado por fecha",
    tags: ["date_boundary", "performance", "where"],
    estimated_seconds: 60,
    prompt_md:
      "Un reporte diario corre sobre una tabla de pedidos con 80 millones de filas y un índice sobre `created_at`. Quien lo escribió filtró con `WHERE created_at::date = DATE '2025-08-31'`: el resultado es correcto, pero tarda varios minutos. ¿Qué conviene hacer?",
    code_md: null,
    options: [
      {
        key: "a",
        body_md:
          "Reescribirlo como `created_at >= DATE '2025-08-31' AND created_at < DATE '2025-09-01'`, que devuelve lo mismo y permite usar el índice.",
        is_correct: true,
      },
      {
        key: "b",
        body_md:
          "Dejarlo como está: si el resultado es correcto, el tiempo de ejecución no es un problema de SQL.",
        is_correct: false,
        why_incorrect_md:
          "Un reporte diario que tarda minutos por una expresión evitable sí es un problema de SQL, y la reescritura no cuesta nada.",
      },
      {
        key: "c",
        body_md: "Cambiarlo por `BETWEEN DATE '2025-08-31' AND DATE '2025-08-31'`.",
        is_correct: false,
        why_incorrect_md:
          "Además de no resolver nada, ese filtro solo captura los pedidos creados exactamente a las 00:00:00.",
      },
      {
        key: "d",
        body_md: "Agregar `LIMIT 1000` para que termine antes.",
        is_correct: false,
        why_incorrect_md:
          "`LIMIT` corta filas arbitrariamente y cambia el resultado del reporte: no es una optimización, es un error.",
      },
    ],
    explanation_md:
      "Aplicar una función o un cast sobre la columna filtrada impide que el motor aproveche un índice común sobre ella. El rango medio abierto expresa la misma condición dejando la columna «limpia» a la izquierda del operador.",
    is_published: true,
  },
  {
    slug: "fechas-q10-tipos",
    section,
    lesson: tipos,
    type: "single",
    difficulty: "very_easy",
    topic: "Tipos de fecha y hora",
    tags: ["tipos", "timestamptz"],
    estimated_seconds: 40,
    prompt_md:
      "En TiendaViva, `sellers.joined_at` es `date` y `orders.created_at` es `timestamptz`. ¿Qué implica esa diferencia al filtrar?",
    code_md: null,
    options: [
      {
        key: "a",
        body_md:
          "`created_at` guarda también la hora, así que comparar contra una fecha sin hora la trata como las 00:00 de ese día.",
        is_correct: true,
      },
      {
        key: "b",
        body_md:
          "Ninguna: PostgreSQL convierte ambos tipos al comparar y el resultado es el mismo.",
        is_correct: false,
        why_incorrect_md:
          "Sí hay conversión, y justamente por eso aparece el problema: la fecha se completa con la hora 00:00, no con el final del día.",
      },
      {
        key: "c",
        body_md: "`date` no se puede comparar con literales de fecha; hay que usar `TO_DATE`.",
        is_correct: false,
        why_incorrect_md: "`joined_at = DATE '2023-05-10'` es una comparación válida y directa.",
      },
      {
        key: "d",
        body_md: "`timestamptz` guarda la zona horaria de cada fila junto con el valor.",
        is_correct: false,
        why_incorrect_md:
          "`timestamptz` guarda un instante absoluto (internamente en UTC) y lo muestra según la zona horaria de la sesión; no almacena una zona por fila.",
      },
    ],
    explanation_md:
      "Con columnas `date` los filtros por día son directos; con `timestamptz` siempre conviene pensar en rangos de instantes: `>= inicio AND < siguiente inicio`.",
    is_published: true,
  },
];
