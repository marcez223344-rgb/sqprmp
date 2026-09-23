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
      "El departamento Comercial de **TiendaViva** organiza su trabajo por regiones y no por país. México se atiende como **Norteamérica**; Colombia y Perú, como **Región Andina**; y el resto de los países, que son Argentina, Chile y Uruguay, como **Cono Sur**. Te piden el listado de vendedores ya clasificado con esas etiquetas para poder repartir las cuentas entre los equipos.",
    business_question_md:
      "Debes generar un dataset que devuelva, para cada vendedor, su `id`, su `store_name`, su `country` y una columna `region` con la etiqueta que le corresponde según esa clasificación. El orden de las filas no importa.",
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
          "No necesitas una tabla de regiones: la clasificación la define el negocio y la construyes como una columna calculada, con una expresión condicional que devuelve un texto distinto en cada fila.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Trabaja sobre la tabla `sellers` y usa la columna `country`, cuyos valores son los literales `'MX'`, `'CO'`, `'PE'`, `'AR'`, `'CL'` y `'UY'`. Como todas las condiciones son comparaciones por igualdad, puedes usar la forma simple `CASE country WHEN ... THEN ...`. Cierra la expresión con `END` y ponle el alias `region`.",
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
          "Cerrar la expresión con un paréntesis o con `THEN` en lugar de `END`: toda expresión `CASE` termina con la palabra clave `END`.",
      },
      {
        category: "cell_values",
        description_md:
          "Omitir la rama `ELSE`: los vendedores de Argentina, Chile y Uruguay quedan con `NULL` en la columna en lugar de la etiqueta «Cono Sur».",
      },
      {
        category: "missing_filter",
        description_md:
          "Agregar una cláusula `WHERE` para quedarte solo con algunos países: la consigna pide los 180 vendedores, todos clasificados.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 180 filas: 55 vendedores quedan en «Norteamérica», 40 en «Región Andina» y 85 en «Cono Sur».\n\nLa forma simple, que se escribe `CASE country WHEN 'MX' ...`, es la más corta cuando todas las condiciones son igualdades. La alternativa con `CASE WHEN country IN ('CO','PE')` agrupa los dos países andinos en una sola rama y suele ser más fácil de mantener: si mañana se suma Ecuador, tocas una sola línea.\n\nLa rama `ELSE` funciona como red de seguridad. Si el marketplace incorpora un país nuevo, esos vendedores van a aparecer como «Cono Sur» aunque no lo sean; por eso, en un reporte productivo, muchos equipos prefieren escribir `ELSE 'Sin región asignada'`, para que el dato faltante quede a la vista en lugar de esconderse dentro de una categoría existente.",
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
      "El departamento de Calidad quiere clasificar a los vendedores según su calificación promedio: **Destacado** desde 4.5, **Confiable** desde 4.0 y hasta menos de 4.5, y **A mejorar** por debajo de 4.0. Hay vendedores que todavía no recibieron ninguna reseña y tienen la columna `rating` en `NULL`: no pueden mezclarse con los de mala calificación y deben quedar como **Sin calificación**. Te piden ese listado clasificado para armar el plan de mejora del trimestre.",
    business_question_md:
      "Debes generar un dataset que devuelva el `id`, el `store_name`, el `rating` y una columna `segmento` con una de estas cuatro etiquetas: `Destacado`, `Confiable`, `A mejorar` o `Sin calificación`. Debes incluir a todos los vendedores y el orden de las filas no importa.",
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
          "Aquí las condiciones no son igualdades sino umbrales, así que necesitas la forma buscada, que se escribe `WHEN condición THEN etiqueta`. Las ramas se evalúan de arriba hacia abajo y gana la primera que resulta verdadera.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Trabaja sobre la tabla `sellers` y la columna `rating`. Ten cuidado con dos cosas: escribe primero el umbral más exigente, que es 4.5, y recuerda que un valor `NULL` no cumple ninguna comparación numérica, así que sin una rama con `IS NULL` esos vendedores terminan en el `ELSE`.",
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
          "No darle una rama propia a la condición `rating IS NULL`: los 28 vendedores sin reseñas caen en el `ELSE` y aparecen etiquetados como «A mejorar», que es una afirmación falsa sobre su desempeño.",
      },
      {
        category: "cell_values",
        description_md:
          "Escribir `WHEN rating >= 4.0` antes que `WHEN rating >= 4.5`: la etiqueta `Destacado` no aparece nunca, porque gana siempre la primera coincidencia.",
      },
      {
        category: "row_count",
        description_md:
          "Filtrar con `WHERE rating IS NOT NULL`: la consigna pide los 180 vendedores, incluidos los que todavía no tienen calificación.",
      },
      {
        category: "wrong_columns",
        description_md:
          "Devolver solo la columna `segmento` y olvidar `rating`: Calidad necesita ver el valor que originó cada etiqueta para poder discutirla.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 180 filas: 41 vendedores quedan como `Destacado`, 29 como `Confiable`, 82 como `A mejorar` y 28 como `Sin calificación`.\n\nEl orden de las ramas es lo que hace correcta la solución. Como el motor se detiene en la primera condición verdadera, alcanza con escribir un solo límite por tramo, primero `>= 4.5` y después `>= 4.0`, en lugar de escribir rangos completos unidos con `AND`.\n\nLa rama que atiende a `NULL` puede ir en cualquier posición antes del `ELSE`, porque `NULL` nunca coincide con una comparación numérica, pero ponerla primera deja la intención a la vista. La solución alternativa resuelve lo mismo al revés: usa `WHEN rating IS NOT NULL THEN 'A mejorar'` y reserva el `ELSE` para los valores `NULL`. Las dos son válidas; elige la que explique mejor la regla de negocio a quien lea la consulta.\n\nEvita usar `COALESCE(rating, 0)` en este caso: convertiría «sin datos» en «puntaje cero», que es una afirmación distinta y peligrosa si después alguien promedia esa columna.",
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
      "El departamento de Finanzas está analizando la operación uruguaya y necesita clasificar cada pedido expresado en pesos uruguayos, es decir, con `currency` igual al texto `'UYU'`, según su importe total. Los tramos acordados son: **Chico** por debajo de 2000, **Mediano** desde 2000 y por debajo de 10000, **Grande** desde 10000 y por debajo de 40000, y **Premium** desde 40000. Los límites inferiores son inclusivos. Te piden ese listado clasificado para presentarlo en la reunión de cierre.",
    business_question_md:
      "Debes generar un dataset que devuelva el `id`, el `total_amount` y una columna `tramo` con la etiqueta correspondiente, tomando únicamente los pedidos cuyo `currency` es igual al texto `'UYU'`. El orden de las filas no importa.",
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
          "Son dos cosas independientes: un filtro que deja solamente los pedidos de una moneda y una columna calculada que clasifica el importe en cuatro tramos.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Filtra la tabla `orders` con la condición `currency = 'UYU'` y clasifica la columna `total_amount`. Como las ramas se evalúan en orden, no necesitas escribir los dos límites de cada tramo: si la fila llegó a la segunda rama es porque ya no cumplió la primera.",
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
          "Olvidar la condición `WHERE currency = 'UYU'`: se mezclan pesos uruguayos con pesos colombianos y los tramos dejan de tener cualquier sentido.",
      },
      {
        category: "cell_values",
        description_md:
          "Escribir los umbrales desordenados, por ejemplo `< 40000` antes que `< 2000`: todos los pedidos chicos salen etiquetados como «Grande».",
      },
      {
        category: "cell_values",
        description_md:
          "Usar el operador `<=` en los límites: con `<= 2000`, un pedido de exactamente 2000 sería «Chico», pero el acuerdo dice que el límite inferior del tramo Mediano es inclusivo.",
      },
      {
        category: "cell_values",
        description_md:
          "Omitir la rama `ELSE` final: los pedidos de 40000 o más quedan con `NULL` en lugar de la etiqueta «Premium».",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 684 pedidos en pesos uruguayos: 110 quedan como `Chico`, 261 como `Mediano`, 264 como `Grande` y 49 como `Premium`.\n\nEscribir un solo límite por rama funciona porque gana la primera coincidencia: cuando el motor evalúa la condición `total_amount < 10000`, ya sabe que el importe no es menor que 2000. La versión alternativa recorre los umbrales de mayor a menor y produce exactamente el mismo resultado; lo que no debes hacer es mezclar los dos criterios dentro de la misma expresión.\n\nHay dos cuidados profesionales. Primero, los tramos dependen de la moneda: un importe de 40000 es enorme en pesos uruguayos y modesto en pesos colombianos, y por eso el filtro no es opcional. Segundo, deja documentado si cada límite es inclusivo o exclusivo, porque «hasta 2000» y «menos de 2000» son reglas distintas y la diferencia aparece justo en los casos de borde.\n\nMás adelante vas a ver cómo contar los pedidos de cada tramo en una sola fila, combinando la expresión `CASE` con funciones de agregación.",
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
      "El departamento de Logística está revisando el cumplimiento del compromiso de entrega: un envío se considera **A tiempo** si se entregó dentro de los 5 días posteriores al despacho, y **Tarde** si tardó más. Los paquetes que todavía no tienen fecha de entrega, es decir, los que tienen la columna `delivered_at` en `NULL`, no son tardíos: siguen **En tránsito**. El análisis se limita a los envíos despachados desde el 1 de septiembre de 2025. Te piden ese reporte para la reunión mensual con los transportistas.",
    business_question_md:
      "Debes generar un dataset que devuelva el `id`, el `carrier`, el `destination_city` y una columna `cumplimiento` con uno de estos tres valores: `A tiempo`, `Tarde` o `En tránsito`, tomando los envíos cuya columna `shipped_at` es igual o posterior al `'2025-09-01'`. El orden de las filas no importa.",
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
          "Hay tres situaciones posibles, y una de ellas no se decide comparando fechas sino detectando la ausencia de fecha. Piensa cuál de las tres conviene evaluar primero.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Trabaja sobre la tabla `shipments` con un filtro sobre la columna `shipped_at`. Para el compromiso de 5 días puedes comparar `delivered_at` contra `shipped_at` más un intervalo. La rama de los paquetes sin entregar necesita la condición `IS NULL`: si la dejas para el `ELSE`, esos envíos se cuentan como tardíos.",
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
          "No tratar la condición `delivered_at IS NULL` en su propia rama: como `NULL` no cumple ninguna comparación, esos 116 envíos caen en el `ELSE` y se reportan como «Tarde». Es el error más caro del ejercicio, porque culpa al transportista por paquetes que todavía están en camino.",
      },
      {
        category: "date_boundary",
        description_md:
          "Escribir `shipped_at > DATE '2025-09-01'`: quedan fuera los envíos despachados exactamente a la medianoche del 1 de septiembre. La consigna dice «desde», así que el límite es inclusivo.",
      },
      {
        category: "cell_values",
        description_md:
          "Invertir la comparación de los 5 días, usando `>=` en lugar de `<=`: las etiquetas «A tiempo» y «Tarde» quedan intercambiadas.",
      },
      {
        category: "missing_filter",
        description_md:
          "Omitir el filtro de fecha: la consulta devuelve los 15 201 envíos históricos, muy por encima del límite de filas del entorno de práctica.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 403 envíos despachados desde el 1 de septiembre de 2025: 121 quedan como `A tiempo`, 166 como `Tarde` y 116 como `En tránsito`.\n\nEl orden de las ramas es deliberado. Poner primero la condición `delivered_at IS NULL` separa «todavía no sabemos» de «sabemos que tardó», que es la confusión clásica cuando se mide cumplimiento con datos incompletos. Si dejaras esa rama para el final, el reporte diría que el 70 % de los envíos llegó tarde.\n\nLas dos versiones de la comparación son equivalentes: la expresión `delivered_at <= shipped_at + INTERVAL '5 days'` suma el intervalo a la fecha de despacho, y la expresión `delivered_at - shipped_at <= INTERVAL '5 days'` calcula la duración transcurrida. La primera suele ser preferible en tablas grandes, porque deja la columna sola de un lado de la comparación y eso le permite al motor usar un índice sobre `delivered_at`.\n\nCuidado con una tercera variante: la expresión `delivered_at::date - shipped_at::date <= 5` cuenta días de calendario y no horas. Un envío despachado a las 23:50 y entregado cinco días después a la 01:00 daría un resultado distinto. Cuando el compromiso se mide en días corridos, conviene trabajar con las marcas de tiempo completas.",
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
      "El departamento de Riesgo de **Bolsillo** revisa manualmente los movimientos que el motor antifraude dejó marcados, es decir, aquellos que tienen la columna `is_flagged` en `true`, y trabaja la cola de lo más nuevo a lo más viejo: una alerta de hace un mes ya no se puede frenar, la de hoy sí. Para clasificar cada caso traduce el estado del movimiento a un nivel de riesgo: el estado `'reversed'` es **Fraude confirmado**, el estado `'failed'` es **Bloqueado**, el estado `'pending'` es **En revisión** y cualquier otro estado es **Alerta sin bloqueo**. Además, la columna `description` viene sin valor en la mayoría de los casos y en la planilla debe leerse `sin detalle`. Te piden esa planilla para poder repartir la revisión entre los analistas.",
    business_question_md:
      "Debes generar un dataset que devuelva el `id`, el `account_id`, el `kind`, el `amount`, el `currency`, el `created_at`, una columna `nivel_riesgo` con la etiqueta correspondiente y una columna `detalle` con la descripción del movimiento o el texto `'sin detalle'` cuando la columna `description` está en `NULL`. Debes incluir solamente los movimientos que tienen la columna `is_flagged` en `true`, ordenados de la alerta **más reciente a la más antigua**, y si dos alertas comparten el mismo instante debes desempatar usando `id` ascendente.",
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
          "El ejercicio pide dos columnas calculadas distintas: una clasifica un código en cuatro etiquetas y la otra solamente reemplaza la ausencia de dato por un texto. Para la segunda existe un atajo más corto que una expresión condicional completa.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Trabaja sobre la tabla `transactions`. El filtro es sobre la columna booleana `is_flagged`, que debe estar en `true` y que puedes escribir directamente en la cláusula `WHERE` sin compararla con nada. Para la columna `nivel_riesgo` alcanza con la forma simple de `CASE` sobre `status`; para la columna `detalle`, usa la función `COALESCE` con dos argumentos. El orden lleva dos claves: `created_at` en dirección descendente y después `id`.",
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
          "Olvidar la condición `WHERE is_flagged`: la consulta devuelve los 32 243 movimientos de la billetera y no los 193 que el equipo de Riesgo tiene que revisar.",
      },
      {
        category: "null_handling",
        description_md:
          "Devolver la columna `description` tal como está: las 152 filas sin descripción llegan a la planilla con `NULL` en lugar del texto acordado.",
      },
      {
        category: "cell_values",
        description_md:
          "Usar `COALESCE(status, 'Alerta sin bloqueo')` para el nivel de riesgo: la columna `status` nunca está en `NULL`, así que esa expresión no clasifica nada; la traducción de cuatro categorías necesita una expresión `CASE`.",
      },
      {
        category: "wrong_order",
        description_md:
          "Ordenar en forma ascendente por `created_at`: la cola arranca por las alertas más viejas, que son justamente las que ya no tienen remedio. Y sin ninguna cláusula `ORDER BY`, PostgreSQL no garantiza ninguna secuencia.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 193 movimientos marcados: 183 quedan como `Alerta sin bloqueo`, 5 como `En revisión`, 4 como `Bloqueado` y 1 como `Fraude confirmado`.\n\nEl orden por `created_at DESC` es parte de la respuesta y no un adorno: una cola de antifraude se trabaja por antigüedad de la alerta, porque el margen para revertir un movimiento se cierra con el tiempo. Ordenar por `amount` sería tentador, pero la tabla `transactions` mezcla monedas y un ranking de importes nominales pondría arriba a los países con más ceros en los precios.\n\nEl ejercicio muestra la división de tareas entre las herramientas disponibles. La expresión `CASE` clasifica cuando hay varias categorías; la función `COALESCE` solo responde «si esto está en `NULL`, muestra aquello». La expresión `COALESCE(description, 'sin detalle')` es idéntica a `CASE WHEN description IS NULL THEN 'sin detalle' ELSE description END`, como se ve en la solución alternativa, pero se lee de un vistazo.\n\nDos detalles de estilo. Las formas `WHERE is_flagged` y `WHERE is_flagged = true` son equivalentes, porque una columna booleana ya es una condición en sí misma. Y en la forma simple `CASE status WHEN 'reversed' ...`, la rama `ELSE` cubre el estado `'completed'` y cualquier estado que se agregue en el futuro; si prefieres que un estado nuevo salte a la vista, escribe `ELSE 'Estado no clasificado'`.\n\nLa distribución del resultado dice algo del negocio: casi todos los movimientos marcados terminaron completándose. El motor antifraude prioriza no perder casos sospechosos a costa de generar muchas falsas alarmas, y esta consulta es el primer paso para medir ese costo.",
    improvement_feedback: [
      { condition: "uses_select_star", message_key: "improve.uses_select_star" },
    ],
    reward: defaultReward("intermediate"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
];
