import {
  defaultHintMeta,
  defaultReward,
  defaultSolutionUnlock,
  type ExerciseDef,
} from "../schemas/exercise";

const section = "case";
const tiendaviva = { slug: "tiendaviva", version: 1 };
const bolsillo = { slug: "bolsillo", version: 1 };

export const exercises: ExerciseDef[] = [
  {
    slug: "regiones-comerciales-de-vendedores",
    section,
    title: "Regiones comerciales de los vendedores",
    difficulty: "very_easy",
    estimated_minutes: 5,
    concepts: ["select", "case", "alias"],
    dataset: tiendaviva,
    tables_used: ["sellers"],
    scenario_md:
      "El equipo comercial de **TiendaViva** organiza su trabajo por regiones, no por país. México se atiende como **Norteamérica**; Colombia y Perú, como **Región Andina**; el resto de los países (Argentina, Chile y Uruguay), como **Cono Sur**.",
    business_question_md:
      "Devuelve, para cada vendedor, su `id`, `store_name`, `country` y una columna `region` con la etiqueta que le corresponde según esa clasificación. El orden no importa.",
    learning_objective:
      "Escribir una expresión CASE que traduzca códigos a etiquetas de negocio, con rama ELSE.",
    theory_ref: "case-simple-y-buscada",
    expected_columns: [
      { name: "id", type: "integer" },
      { name: "store_name", type: "text" },
      { name: "country", type: "text" },
      { name: "region", type: "text" },
    ],
    validation_rules: { required_concepts: ["case"] },
    reference_solution:
      "SELECT\n  id,\n  store_name,\n  country,\n  CASE country\n    WHEN 'MX' THEN 'Norteamérica'\n    WHEN 'CO' THEN 'Región Andina'\n    WHEN 'PE' THEN 'Región Andina'\n    ELSE 'Cono Sur'\n  END AS region\nFROM sellers;",
    alternative_solutions: [
      {
        label: "CASE buscada con IN",
        sql: "SELECT\n  id,\n  store_name,\n  country,\n  CASE\n    WHEN country = 'MX' THEN 'Norteamérica'\n    WHEN country IN ('CO', 'PE') THEN 'Región Andina'\n    ELSE 'Cono Sur'\n  END AS region\nFROM sellers;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "No necesitas una tabla de regiones: la clasificación la define el negocio y la construyes como una columna calculada, con una expresión condicional que devuelve un texto por fila.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Trabaja sobre `sellers` y usa la columna `country`. Como todas las condiciones son comparaciones por igualdad, puedes usar la forma simple (`CASE country WHEN ... THEN ...`). Cierra con `END` y ponle el alias `region`.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT\n  id,\n  store_name,\n  country,\n  CASE ___\n    WHEN ___ THEN ___\n    ...\n    ELSE ___\n  END AS region\nFROM sellers;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "wrong_columns",
        description_md:
          "Olvidar el alias `AS region`: la columna llega al reporte con un nombre generado por el motor y la validación no la reconoce.",
      },
      {
        category: "syntax",
        description_md:
          "Cerrar la expresión con un paréntesis o con `THEN` en lugar de `END`. Toda expresión `CASE` termina en `END`.",
      },
      {
        category: "cell_values",
        description_md:
          "Omitir el `ELSE`: los vendedores de AR, CL y UY quedarían en NULL en vez de «Cono Sur».",
      },
      {
        category: "missing_filter",
        description_md:
          "Agregar un `WHERE` para quedarte solo con algunos países: se piden los 180 vendedores, clasificados.",
      },
    ],
    expert_explanation_md:
      "180 filas: 55 en «Norteamérica», 40 en «Región Andina» y 85 en «Cono Sur».\n\nLa forma simple (`CASE country WHEN 'MX' ...`) es la más corta cuando todas las condiciones son igualdades. La alternativa con `CASE WHEN country IN ('CO','PE')` agrupa los dos países andinos en una sola rama y suele ser más fácil de mantener: si mañana se suma Ecuador, tocas una sola línea.\n\nEl `ELSE` hace de red de seguridad. Si el marketplace incorpora un país nuevo, esos vendedores aparecerán como «Cono Sur» aunque no lo sean; por eso, en un reporte productivo, muchos equipos prefieren `ELSE 'Sin región asignada'` para que el dato faltante sea visible en lugar de quedar escondido.",
    improvement_feedback: [
      { condition: "uses_select_star", message_key: "improve.uses_select_star" },
    ],
    reward: defaultReward("very_easy"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "segmento-de-vendedores-por-calificacion",
    section,
    title: "Segmento de vendedores por calificación",
    difficulty: "easy",
    estimated_minutes: 8,
    concepts: ["select", "case", "null_handling", "alias"],
    dataset: tiendaviva,
    tables_used: ["sellers"],
    scenario_md:
      "El área de calidad quiere clasificar a los vendedores por su calificación promedio: **Destacado** desde 4.5, **Confiable** desde 4.0 y hasta menos de 4.5, y **A mejorar** por debajo de 4.0. Hay vendedores que todavía no recibieron ninguna reseña y su `rating` es NULL: no pueden mezclarse con los de mala calificación, deben quedar como **Sin calificación**.",
    business_question_md:
      "Devuelve `id`, `store_name`, `rating` y una columna `segmento` con una de estas cuatro etiquetas: `Destacado`, `Confiable`, `A mejorar` o `Sin calificación`. Incluye a todos los vendedores. El orden no importa.",
    learning_objective:
      "Construir tramos con CASE buscada respetando el orden de las ramas y dando a NULL una categoría propia.",
    theory_ref: "case-simple-y-buscada",
    expected_columns: [
      { name: "id", type: "integer" },
      { name: "store_name", type: "text" },
      { name: "rating", type: "numeric" },
      { name: "segmento", type: "text" },
    ],
    validation_rules: { required_concepts: ["case"] },
    reference_solution:
      "SELECT\n  id,\n  store_name,\n  rating,\n  CASE\n    WHEN rating IS NULL THEN 'Sin calificación'\n    WHEN rating >= 4.5 THEN 'Destacado'\n    WHEN rating >= 4.0 THEN 'Confiable'\n    ELSE 'A mejorar'\n  END AS segmento\nFROM sellers;",
    alternative_solutions: [
      {
        label: "NULL atendido en el ELSE",
        sql: "SELECT\n  id,\n  store_name,\n  rating,\n  CASE\n    WHEN rating >= 4.5 THEN 'Destacado'\n    WHEN rating >= 4.0 THEN 'Confiable'\n    WHEN rating IS NOT NULL THEN 'A mejorar'\n    ELSE 'Sin calificación'\n  END AS segmento\nFROM sellers;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Aquí las condiciones no son igualdades sino umbrales, así que necesitas la forma buscada (`WHEN condición THEN etiqueta`). Las ramas se evalúan de arriba hacia abajo y gana la primera que sea verdadera.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Trabaja sobre `sellers` y la columna `rating`. Cuidado con dos cosas: escribe primero el umbral más exigente (4.5) y recuerda que un NULL no cumple ninguna comparación numérica, así que sin una rama `IS NULL` esos vendedores terminarían en el `ELSE`.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT\n  id,\n  store_name,\n  rating,\n  CASE\n    WHEN rating ___ THEN 'Sin calificación'\n    WHEN rating ___ ___ THEN ___\n    WHEN rating ___ ___ THEN ___\n    ELSE ___\n  END AS segmento\nFROM sellers;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "null_handling",
        description_md:
          "No darle una rama propia a `rating IS NULL`: los 28 vendedores sin reseñas caen en el `ELSE` y aparecen como «A mejorar».",
      },
      {
        category: "cell_values",
        description_md:
          "Poner `WHEN rating >= 4.0` antes que `WHEN rating >= 4.5`: la etiqueta `Destacado` no aparece nunca porque gana la primera coincidencia.",
      },
      {
        category: "row_count",
        description_md:
          "Filtrar con `WHERE rating IS NOT NULL`: se piden los 180 vendedores, incluidos los que no tienen calificación.",
      },
      {
        category: "wrong_columns",
        description_md:
          "Devolver solo `segmento` y olvidar `rating`: el área de calidad necesita ver el valor que originó la etiqueta.",
      },
    ],
    expert_explanation_md:
      "180 filas: 41 `Destacado`, 29 `Confiable`, 82 `A mejorar` y 28 `Sin calificación`.\n\nEl orden de las ramas es lo que hace correcta la solución. Como el motor se detiene en la primera condición verdadera, alcanza con escribir un solo límite por tramo (`>= 4.5`, después `>= 4.0`) en vez de rangos completos con `AND`.\n\nLa rama de NULL puede ir en cualquier posición antes del `ELSE` —NULL nunca coincide con una comparación numérica—, pero ponerla primera deja la intención a la vista. La solución alternativa resuelve lo mismo al revés: usa `WHEN rating IS NOT NULL THEN 'A mejorar'` y reserva el `ELSE` para los NULL. Ambas son válidas; elige la que explique mejor la regla de negocio a quien lea la consulta.\n\nEvita `COALESCE(rating, 0)` aquí: convertiría «sin datos» en «puntaje cero», que es una afirmación distinta y peligrosa si después alguien promedia esa columna.",
    improvement_feedback: [
      { condition: "uses_select_star", message_key: "improve.uses_select_star" },
    ],
    reward: defaultReward("easy"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "tramos-de-pedido-uruguay",
    section,
    title: "Tramos de tamaño de pedido en Uruguay",
    difficulty: "easy",
    estimated_minutes: 8,
    concepts: ["select", "where", "case", "alias"],
    dataset: tiendaviva,
    tables_used: ["orders"],
    scenario_md:
      "Finanzas analiza la operación uruguaya y necesita clasificar cada pedido en pesos uruguayos (`currency = 'UYU'`) según su importe total. Los tramos acordados son: **Chico** por debajo de 2000, **Mediano** desde 2000 y por debajo de 10000, **Grande** desde 10000 y por debajo de 40000, y **Premium** desde 40000. Los límites inferiores son inclusivos.",
    business_question_md:
      "Devuelve `id`, `total_amount` y una columna `tramo` con la etiqueta correspondiente, solo para los pedidos con `currency = 'UYU'`. El orden no importa.",
    learning_objective:
      "Crear tramos numéricos con CASE usando un único límite por rama y una rama ELSE final.",
    theory_ref: "case-segmentos-de-negocio",
    expected_columns: [
      { name: "id", type: "integer" },
      { name: "total_amount", type: "numeric" },
      { name: "tramo", type: "text" },
    ],
    validation_rules: { required_concepts: ["case", "where"] },
    reference_solution:
      "SELECT\n  id,\n  total_amount,\n  CASE\n    WHEN total_amount < 2000 THEN 'Chico'\n    WHEN total_amount < 10000 THEN 'Mediano'\n    WHEN total_amount < 40000 THEN 'Grande'\n    ELSE 'Premium'\n  END AS tramo\nFROM orders\nWHERE currency = 'UYU';",
    alternative_solutions: [
      {
        label: "Umbrales de mayor a menor",
        sql: "SELECT\n  id,\n  total_amount,\n  CASE\n    WHEN total_amount >= 40000 THEN 'Premium'\n    WHEN total_amount >= 10000 THEN 'Grande'\n    WHEN total_amount >= 2000 THEN 'Mediano'\n    ELSE 'Chico'\n  END AS tramo\nFROM orders\nWHERE currency = 'UYU';",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Son dos cosas independientes: un filtro que deja solo los pedidos de una moneda y una columna calculada que clasifica el importe en cuatro tramos.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Filtra `orders` por `currency = 'UYU'` y clasifica `total_amount`. Como las ramas se evalúan en orden, no necesitas escribir los dos límites de cada tramo: si la fila llegó a la segunda rama es porque ya no cumplió la primera.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT\n  id,\n  total_amount,\n  CASE\n    WHEN total_amount ___ ___ THEN ___\n    WHEN total_amount ___ ___ THEN ___\n    WHEN total_amount ___ ___ THEN ___\n    ELSE ___\n  END AS tramo\nFROM orders\nWHERE ___;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "missing_filter",
        description_md:
          "Olvidar `WHERE currency = 'UYU'`: mezclarías pesos uruguayos con pesos colombianos y los tramos dejarían de tener sentido.",
      },
      {
        category: "cell_values",
        description_md:
          "Escribir los umbrales desordenados (por ejemplo, `< 40000` antes que `< 2000`): todos los pedidos chicos saldrían etiquetados como «Grande».",
      },
      {
        category: "cell_values",
        description_md:
          "Usar `<=` en los límites: con `<= 2000`, un pedido de exactamente 2000 sería «Chico», pero el acuerdo dice que el límite inferior del tramo Mediano es inclusivo.",
      },
      {
        category: "cell_values",
        description_md:
          "Omitir el `ELSE` final: los pedidos de 40000 o más quedarían en NULL en lugar de «Premium».",
      },
    ],
    expert_explanation_md:
      "684 pedidos en UYU: 110 `Chico`, 261 `Mediano`, 264 `Grande` y 49 `Premium`.\n\nEscribir un solo límite por rama funciona porque gana la primera coincidencia: cuando el motor evalúa `total_amount < 10000`, ya sabe que el importe no es menor que 2000. La versión alternativa recorre los umbrales de mayor a menor y produce exactamente el mismo resultado; lo que no debes hacer es mezclar los dos criterios en la misma expresión.\n\nDos cuidados profesionales. Primero, los tramos dependen de la moneda: un importe de 40000 es enorme en UYU y modesto en COP, por eso el filtro no es opcional. Segundo, deja documentado si el límite es inclusivo o exclusivo; «hasta 2000» y «menos de 2000» son reglas distintas y la diferencia aparece justo en los casos de borde.\n\nMás adelante verás cómo contar pedidos por tramo en una sola fila combinando `CASE` con funciones de agregación.",
    improvement_feedback: [
      { condition: "uses_select_star", message_key: "improve.uses_select_star" },
    ],
    reward: defaultReward("easy"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "cumplimiento-de-entregas-de-septiembre",
    section,
    title: "Cumplimiento de entregas de septiembre",
    difficulty: "intermediate",
    estimated_minutes: 12,
    concepts: ["select", "where", "case", "null_handling", "date_functions", "alias"],
    dataset: tiendaviva,
    tables_used: ["shipments"],
    scenario_md:
      "Logística revisa el compromiso de entrega: un envío se considera **A tiempo** si se entregó dentro de los 5 días posteriores al despacho, y **Tarde** si tardó más. Los paquetes que todavía no tienen fecha de entrega (`delivered_at` NULL) no son tardíos: siguen **En tránsito**. El análisis se limita a los envíos despachados desde el 1 de septiembre de 2025.",
    business_question_md:
      "Devuelve `id`, `carrier`, `destination_city` y una columna `cumplimiento` con los valores `A tiempo`, `Tarde` o `En tránsito`, para los envíos con `shipped_at` a partir del 2025-09-01. El orden no importa.",
    learning_objective:
      "Combinar una condición temporal y una rama para NULL dentro de una misma expresión CASE.",
    theory_ref: "case-segmentos-de-negocio",
    expected_columns: [
      { name: "id", type: "integer" },
      { name: "carrier", type: "text" },
      { name: "destination_city", type: "text" },
      { name: "cumplimiento", type: "text" },
    ],
    validation_rules: { required_concepts: ["case", "where"] },
    reference_solution:
      "SELECT\n  id,\n  carrier,\n  destination_city,\n  CASE\n    WHEN delivered_at IS NULL THEN 'En tránsito'\n    WHEN delivered_at <= shipped_at + INTERVAL '5 days' THEN 'A tiempo'\n    ELSE 'Tarde'\n  END AS cumplimiento\nFROM shipments\nWHERE shipped_at >= DATE '2025-09-01';",
    alternative_solutions: [
      {
        label: "Diferencia entre timestamps",
        sql: "SELECT\n  id,\n  carrier,\n  destination_city,\n  CASE\n    WHEN delivered_at IS NULL THEN 'En tránsito'\n    WHEN delivered_at - shipped_at <= INTERVAL '5 days' THEN 'A tiempo'\n    ELSE 'Tarde'\n  END AS cumplimiento\nFROM shipments\nWHERE shipped_at >= DATE '2025-09-01';",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Hay tres situaciones posibles y una de ellas no se decide comparando fechas, sino detectando la ausencia de fecha. Piensa cuál de las tres conviene evaluar primero.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Trabaja sobre `shipments` con un filtro sobre `shipped_at`. Para el compromiso de 5 días puedes comparar `delivered_at` contra `shipped_at` más un intervalo. La rama de los paquetes sin entregar necesita `IS NULL`: si la dejas para el `ELSE`, esos envíos se contarían como tardíos.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT\n  id,\n  carrier,\n  destination_city,\n  CASE\n    WHEN delivered_at ___ THEN 'En tránsito'\n    WHEN delivered_at ___ shipped_at + INTERVAL ___ THEN ___\n    ELSE ___\n  END AS cumplimiento\nFROM shipments\nWHERE shipped_at ___ DATE '2025-09-01';\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "null_handling",
        description_md:
          "No tratar `delivered_at IS NULL` en su propia rama: como NULL no cumple ninguna comparación, esos 116 envíos caen en el `ELSE` y se reportan como «Tarde». Es el error más caro del ejercicio: culpa al transportista por paquetes que todavía están en camino.",
      },
      {
        category: "date_boundary",
        description_md:
          "Usar `shipped_at > DATE '2025-09-01'`: dejarías fuera los envíos despachados exactamente a la medianoche del 1 de septiembre. El pedido dice «a partir del», así que el límite es inclusivo.",
      },
      {
        category: "cell_values",
        description_md:
          "Invertir la comparación de 5 días (`>=` en lugar de `<=`): las etiquetas «A tiempo» y «Tarde» quedan intercambiadas.",
      },
      {
        category: "missing_filter",
        description_md:
          "Omitir el filtro de fecha: devolverías los 15 201 envíos históricos, muy por encima del límite de filas del entorno.",
      },
    ],
    expert_explanation_md:
      "403 envíos despachados desde el 2025-09-01: 121 `A tiempo`, 166 `Tarde` y 116 `En tránsito`.\n\nEl orden de las ramas es deliberado. Poner `delivered_at IS NULL` primero separa «todavía no sabemos» de «sabemos que tardó», que es la confusión clásica cuando se mide cumplimiento con datos incompletos. Si dejaras esa rama para el final, el reporte diría que el 70 % de los envíos llegó tarde.\n\nLas dos versiones de la comparación son equivalentes: `delivered_at <= shipped_at + INTERVAL '5 days'` suma el intervalo a la fecha de despacho, y `delivered_at - shipped_at <= INTERVAL '5 days'` calcula la duración. La primera suele ser preferible en tablas grandes porque deja la columna sola de un lado de la comparación, lo que permite al motor usar un índice sobre `delivered_at`.\n\nOjo con una tercera variante: `delivered_at::date - shipped_at::date <= 5` cuenta días de calendario, no horas. Un envío despachado a las 23:50 y entregado cinco días después a las 01:00 daría un resultado distinto. Cuando el compromiso se mide en días corridos, trabaja con timestamps completos.",
    improvement_feedback: [
      {
        condition: "uses_between_for_timestamps",
        message_key: "improve.uses_between_for_timestamps",
      },
    ],
    reward: defaultReward("intermediate"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "riesgo-de-movimientos-marcados",
    section,
    title: "Riesgo de los movimientos marcados por antifraude",
    difficulty: "intermediate",
    estimated_minutes: 12,
    concepts: ["select", "where", "case", "null_handling", "order_by", "alias"],
    dataset: bolsillo,
    tables_used: ["transactions"],
    scenario_md:
      "El equipo de riesgo de **Bolsillo** revisa manualmente los movimientos que el motor antifraude marcó (`is_flagged`) y trabaja la cola de lo más nuevo a lo más viejo: una alerta de hace un mes ya no se puede frenar, la de hoy sí. Para clasificar cada caso traduce el estado del movimiento a un nivel de riesgo: `reversed` es **Fraude confirmado**, `failed` es **Bloqueado**, `pending` es **En revisión** y cualquier otro estado es **Alerta sin bloqueo**. Además, la columna `description` viene vacía en la mayoría de los casos y en la planilla debe leerse `sin detalle`.",
    business_question_md:
      "Devuelve `id`, `account_id`, `kind`, `amount`, `currency`, `created_at`, una columna `nivel_riesgo` con la etiqueta correspondiente y una columna `detalle` con la descripción del movimiento o el texto `sin detalle` cuando no haya ninguna. Incluye solo los movimientos marcados y ordena de la alerta **más reciente a la más antigua**, desempatando por `id` ascendente.",
    learning_objective:
      "Combinar una expresión CASE de clasificación con COALESCE para presentar datos ausentes.",
    theory_ref: "case-coalesce-y-nullif",
    expected_columns: [
      { name: "id", type: "integer" },
      { name: "account_id", type: "integer" },
      { name: "kind", type: "text" },
      { name: "amount", type: "numeric" },
      { name: "currency", type: "text" },
      { name: "created_at", type: "timestamp" },
      { name: "nivel_riesgo", type: "text" },
      { name: "detalle", type: "text" },
    ],
    validation_rules: {
      order_matters: true,
      required_concepts: ["case", "where", "order_by"],
    },
    reference_solution:
      "SELECT\n  id,\n  account_id,\n  kind,\n  amount,\n  currency,\n  created_at,\n  CASE status\n    WHEN 'reversed' THEN 'Fraude confirmado'\n    WHEN 'failed' THEN 'Bloqueado'\n    WHEN 'pending' THEN 'En revisión'\n    ELSE 'Alerta sin bloqueo'\n  END AS nivel_riesgo,\n  COALESCE(description, 'sin detalle') AS detalle\nFROM transactions\nWHERE is_flagged\nORDER BY created_at DESC, id ASC;",
    alternative_solutions: [
      {
        label: "CASE buscada y CASE en lugar de COALESCE",
        sql: "SELECT\n  id,\n  account_id,\n  kind,\n  amount,\n  currency,\n  created_at,\n  CASE\n    WHEN status = 'reversed' THEN 'Fraude confirmado'\n    WHEN status = 'failed' THEN 'Bloqueado'\n    WHEN status = 'pending' THEN 'En revisión'\n    ELSE 'Alerta sin bloqueo'\n  END AS nivel_riesgo,\n  CASE WHEN description IS NULL THEN 'sin detalle' ELSE description END AS detalle\nFROM transactions\nWHERE is_flagged = true\nORDER BY created_at DESC, id;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "El ejercicio pide dos columnas calculadas distintas: una clasifica un código en cuatro etiquetas y la otra solo reemplaza la ausencia de dato por un texto. Para la segunda existe un atajo más corto que una expresión condicional completa.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Trabaja sobre `transactions`. El filtro es sobre la columna booleana `is_flagged`, que puedes usar directamente en el `WHERE` sin compararla con nada. Para `nivel_riesgo` alcanza la forma simple de `CASE` sobre `status`; para `detalle`, usa `COALESCE` con dos argumentos. El orden lleva dos claves: `created_at` en dirección descendente y después `id`.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT\n  id,\n  account_id,\n  kind,\n  amount,\n  currency,\n  created_at,\n  CASE ___\n    WHEN ___ THEN ___\n    ...\n    ELSE ___\n  END AS nivel_riesgo,\n  ___(description, ___) AS detalle\nFROM transactions\nWHERE ___\nORDER BY ___ ___, id ASC;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "missing_filter",
        description_md:
          "Olvidar `WHERE is_flagged`: devolverías los 32 243 movimientos de la billetera, no los 193 que el equipo de riesgo debe revisar.",
      },
      {
        category: "null_handling",
        description_md:
          "Devolver `description` tal cual: las 152 filas sin descripción llegan como NULL a la planilla en lugar del texto acordado.",
      },
      {
        category: "cell_values",
        description_md:
          "Usar `COALESCE(status, 'Alerta sin bloqueo')` para el nivel de riesgo: `status` nunca es NULL, así que esa expresión no clasifica nada; la traducción de cuatro categorías necesita `CASE`.",
      },
      {
        category: "wrong_order",
        description_md:
          "Ordenar de forma ascendente por `created_at`: la cola arranca por las alertas más viejas, justo las que ya no tienen remedio. Y sin `ORDER BY` alguno, PostgreSQL no garantiza ninguna secuencia.",
      },
    ],
    expert_explanation_md:
      "193 movimientos marcados: 183 `Alerta sin bloqueo`, 5 `En revisión`, 4 `Bloqueado` y 1 `Fraude confirmado`.\n\nEl orden por `created_at DESC` es parte de la respuesta, no un adorno: una cola de antifraude se trabaja por antigüedad de la alerta, porque el margen para revertir un movimiento se cierra con el tiempo. Ordenar por `amount` sería tentador, pero `transactions` mezcla monedas y un ranking de importes nominales pondría arriba a los países con más ceros en los precios.\n\nEl ejercicio muestra la división de tareas entre las tres herramientas. `CASE` clasifica cuando hay varias categorías; `COALESCE` solo responde «si esto es NULL, muestra aquello». `COALESCE(description, 'sin detalle')` es idéntico a `CASE WHEN description IS NULL THEN 'sin detalle' ELSE description END`, como se ve en la solución alternativa, pero se lee de un vistazo.\n\nDos detalles de estilo. `WHERE is_flagged` y `WHERE is_flagged = true` son equivalentes: una columna booleana ya es una condición. Y en la forma simple `CASE status WHEN 'reversed' ...`, el `ELSE` cubre `completed` y cualquier estado que se agregue en el futuro; si prefieres que un estado nuevo salte a la vista, escribe `ELSE 'Estado no clasificado'`.\n\nLa distribución del resultado dice algo del negocio: casi todos los movimientos marcados terminaron completándose. El motor antifraude prioriza no perder casos sospechosos a costa de muchas falsas alarmas, y esta consulta es el primer paso para medir ese costo.",
    improvement_feedback: [
      { condition: "uses_select_star", message_key: "improve.uses_select_star" },
    ],
    reward: defaultReward("intermediate"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
];
