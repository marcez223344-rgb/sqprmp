import {
  defaultHintMeta,
  defaultReward,
  defaultSolutionUnlock,
  type ExerciseDef,
} from "../schemas/exercise";

const section = "funciones-numericas";
const tiendaviva = { slug: "tiendaviva", version: 1 };
const bolsillo = { slug: "bolsillo", version: 1 };

const redondeo = "redondeo-y-truncamiento";
const division = "division-entera-y-porcentajes";
const utiles = "abs-mod-power-y-limites";

export const exercises: ExerciseDef[] = [
  {
    slug: "precios-para-el-catalogo-impreso",
    section,
    title: "Precios redondeados para el catálogo impreso",
    difficulty: "very_easy",
    estimated_minutes: 4,
    concepts: ["select", "where", "numeric_functions", "alias"],
    dataset: tiendaviva,
    tables_used: ["products"],
    scenario_md:
      "El departamento de Marketing está armando el catálogo impreso de la operación uruguaya de **TiendaViva**. En papel no entran los centavos: necesitan el precio redondeado al entero más cercano y, además, el precio que usaría el equipo de promociones, que siempre redondea **hacia arriba** para no vender por debajo del costo. Te piden las dos columnas calculadas para poder mandar el archivo a la imprenta.",
    business_question_md:
      "Debes generar un dataset que, tomando los productos que tienen la columna `is_active` en `true` y cuyo `currency` es igual al texto `'UYU'`, devuelva el `id`, el `name`, el `list_price`, el precio redondeado al entero más cercano bajo el encabezado `price_rounded` y el precio redondeado hacia arriba bajo el encabezado `price_ceiling`. El orden de las filas no importa.",
    learning_objective:
      "Aplicar ROUND y CEIL sobre una columna numeric y nombrar el resultado con alias.",
    theory_ref: redondeo,
    expected_columns: [
      { name: "id", type: "integer" },
      { name: "name", type: "text" },
      { name: "list_price", type: "numeric" },
      { name: "price_rounded", type: "numeric" },
      { name: "price_ceiling", type: "numeric" },
    ],
    validation_rules: { required_concepts: ["numeric_functions", "where", "alias"] },
    reference_solution:
      "SELECT id,\n       name,\n       list_price,\n       ROUND(list_price) AS price_rounded,\n       CEIL(list_price) AS price_ceiling\nFROM products\nWHERE currency = 'UYU'\n  AND is_active;",
    alternative_solutions: [
      {
        label: "ROUND con escala explícita y CEILING",
        sql: "SELECT id,\n       name,\n       list_price,\n       ROUND(list_price, 0) AS price_rounded,\n       CEILING(list_price) AS price_ceiling\nFROM products\nWHERE currency = 'UYU'\n  AND is_active = true;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Necesitas dos funciones distintas: una que elija el entero **más cercano** y otra que suba **siempre** al entero siguiente. No son la misma función.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "La función `ROUND(columna)` devuelve el entero más cercano y la función `CEIL(columna)` sube siempre. Cada expresión necesita su alias, `price_rounded` y `price_ceiling`, y el filtro combina la condición `currency = 'UYU'` con la columna booleana `is_active` en `true`.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT id,\n       name,\n       list_price,\n       ___(list_price) AS price_rounded,\n       ___(list_price) AS price_ceiling\nFROM products\nWHERE currency = ___\n  AND ___;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "wrong_columns",
        description_md:
          "Usar la función `ROUND` en las dos columnas: la columna `price_ceiling` debe subir siempre al entero siguiente, incluso cuando los centavos son `.20`.",
      },
      {
        category: "missing_filter",
        description_md:
          "Olvidar la condición sobre `is_active`: el catálogo incluiría publicaciones dadas de baja y el resultado tendría 41 filas en lugar de las 36 esperadas.",
      },
      {
        category: "readability",
        description_md:
          "No poner los alias: las columnas llegan con los nombres `round` y `ceil`, y el equipo de diseño no sabe cuál es cuál.",
      },
      {
        category: "wrong_columns",
        description_md:
          "Reemplazar la columna `list_price` por su versión redondeada: el reporte también pide ver el precio original.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 36 filas. Las expresiones `ROUND(list_price)` y `ROUND(list_price, 0)` son equivalentes: sin segundo argumento, la escala es 0. Las funciones `CEIL` y `CEILING` son la misma función con dos nombres, y el estándar SQL usa `CEILING`.\n\nLa diferencia entre las dos columnas se ve en un precio como `1207.20`: la función `ROUND` devuelve `1207` y la función `CEIL` devuelve `1208`. En los productos con precio terminado en `.00` las dos coinciden, y eso es exactamente lo que confunde a quien prueba la consulta mirando solo dos filas.\n\nLas dos funciones devuelven un valor de tipo `numeric` y no modifican la tabla: el catálogo se imprime con el valor redondeado, pero la columna `products.list_price` sigue teniendo sus centavos.",
    improvement_feedback: [
      { condition: "uses_select_star", message_key: "improve.uses_select_star" },
    ],
    reward: defaultReward("very_easy"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "peso-del-descuento-y-del-envio",
    section,
    title: "Peso del descuento y del envío en cada pedido",
    difficulty: "easy",
    estimated_minutes: 8,
    concepts: ["select", "where", "numeric_functions", "alias"],
    dataset: tiendaviva,
    tables_used: ["orders"],
    scenario_md:
      "El departamento de Finanzas está revisando la rentabilidad de la operación en Perú. Quiere ver, pedido por pedido, cuánto pesó el descuento sobre el subtotal y cuánto representa el envío dentro del total cobrado, con los porcentajes presentados con dos decimales. Te piden ese detalle para decidir si conviene recortar los descuentos.",
    business_question_md:
      "Debes generar un dataset que, tomando los pedidos cuyo `currency` es igual al texto `'PEN'` y que tuvieron descuento, es decir, con `discount` mayor que `0`, devuelva el `id`, el `subtotal`, el descuento expresado como porcentaje del subtotal bajo el encabezado `discount_percent` y el costo de envío expresado como porcentaje de `total_amount` bajo el encabezado `shipping_percent`. Los dos porcentajes van en escala de 0 a 100 y redondeados a dos decimales. El orden de las filas no importa.",
    learning_objective:
      "Calcular porcentajes sobre distintos denominadores y redondear el resultado al presentarlo.",
    theory_ref: division,
    expected_columns: [
      { name: "id", type: "integer" },
      { name: "subtotal", type: "numeric" },
      { name: "discount_percent", type: "numeric" },
      { name: "shipping_percent", type: "numeric" },
    ],
    validation_rules: {
      numeric_tolerance: 0.001,
      required_concepts: ["numeric_functions", "where", "alias"],
    },
    reference_solution:
      "SELECT id,\n       subtotal,\n       ROUND(discount * 100 / subtotal, 2) AS discount_percent,\n       ROUND(shipping_fee * 100 / total_amount, 2) AS shipping_percent\nFROM orders\nWHERE currency = 'PEN'\n  AND discount > 0;",
    alternative_solutions: [
      {
        label: "Multiplicador adelante",
        sql: "SELECT id,\n       subtotal,\n       ROUND(100 * discount / subtotal, 2) AS discount_percent,\n       ROUND(100 * shipping_fee / total_amount, 2) AS shipping_percent\nFROM orders\nWHERE currency = 'PEN'\n  AND discount <> 0;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Un porcentaje es una división multiplicada por 100. Lo importante acá es el denominador: cada una de las dos columnas se mide contra un importe distinto del mismo pedido.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "El descuento se mide contra la columna `subtotal` y el envío se mide contra la columna `total_amount`. Redondea cada expresión con `ROUND(..., 2)` y ponle el alias que pide el reporte.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT id,\n       subtotal,\n       ROUND(___ * 100 / ___, 2) AS discount_percent,\n       ROUND(___ * 100 / ___, 2) AS shipping_percent\nFROM orders\nWHERE currency = ___\n  AND ___ > 0;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "cell_values",
        description_md:
          "Devolver la proporción, como `0.18`, en lugar del porcentaje, como `18.00`: falta multiplicar por 100.",
      },
      {
        category: "cell_values",
        description_md:
          "Medir el envío contra la columna `subtotal` en lugar de `total_amount`: el cambio de denominador cambia la conclusión del análisis.",
      },
      {
        category: "missing_filter",
        description_md:
          "Omitir alguna de las dos condiciones, `currency = 'PEN'` o `discount > 0`: el pedido es sobre la operación peruana y solo sobre los pedidos que tuvieron descuento aplicado.",
      },
      {
        category: "cell_values",
        description_md:
          "Redondear antes de dividir, como en `ROUND(discount, 2) * 100 / subtotal`: primero se calcula la expresión completa y recién al final se redondea.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 247 filas. Las columnas `discount`, `subtotal` y `total_amount` son de tipo `numeric(12,2)`, así que la división ya es exacta y no hace falta convertir ningún tipo: el problema de la división entera aparece solamente cuando **los dos** operandos son enteros.\n\nVas a ver que la columna `discount_percent` cae en valores redondos, como 8.00, 13.00 o 18.00, porque el descuento se generó como un porcentaje del subtotal; la columna `shipping_percent`, en cambio, varía libremente e incluso vale `0.00` cuando el envío fue gratuito.\n\nHay dos detalles profesionales que conviene tener presentes. El primero: si algún pedido pudiera tener `subtotal` igual a `0`, la consulta fallaría con el error «division by zero», y la defensa estándar es escribir `NULLIF(subtotal, 0)` como denominador. El segundo: el sufijo `_percent` documenta la escala del número; si devolvieras la proporción, el nombre correcto sería `_ratio`.",
    improvement_feedback: [
      {
        condition: "missing_alias_on_aggregate",
        message_key: "improve.missing_alias_on_aggregate",
      },
    ],
    reward: defaultReward("easy"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "cajas-completas-y-unidades-sueltas",
    section,
    title: "Cajas completas y unidades sueltas",
    difficulty: "easy",
    estimated_minutes: 8,
    concepts: ["select", "where", "numeric_functions", "alias"],
    dataset: tiendaviva,
    tables_used: ["products"],
    scenario_md:
      "El depósito de Montevideo empaca la mercadería en cajas de 12 unidades. El departamento de Operaciones necesita saber, para cada producto activo que tenga stock, cuántas cajas completas puede armar y cuántas unidades quedarían sueltas fuera de caja. Te piden ese cálculo para planificar la compra de cajas del mes.",
    business_question_md:
      "Debes generar un dataset que, tomando los productos cuyo `currency` es igual al texto `'UYU'`, que tienen la columna `is_active` en `true` y cuyo `stock` es mayor que `0`, devuelva el `id`, el `name`, el `stock`, la cantidad de cajas completas de 12 unidades bajo el encabezado `full_boxes` y las unidades que sobran bajo el encabezado `loose_units`. Los dos valores calculados deben ser números enteros. El orden de las filas no importa.",
    learning_objective:
      "Usar la división entera y MOD de forma deliberada para repartir cantidades en grupos.",
    theory_ref: utiles,
    expected_columns: [
      { name: "id", type: "integer" },
      { name: "name", type: "text" },
      { name: "stock", type: "integer" },
      { name: "full_boxes", type: "integer" },
      { name: "loose_units", type: "integer" },
    ],
    validation_rules: { required_concepts: ["numeric_functions", "where"] },
    reference_solution:
      "SELECT id,\n       name,\n       stock,\n       stock / 12 AS full_boxes,\n       MOD(stock, 12) AS loose_units\nFROM products\nWHERE currency = 'UYU'\n  AND is_active\n  AND stock > 0;",
    alternative_solutions: [
      {
        label: "Operador % en lugar de MOD",
        sql: "SELECT id,\n       name,\n       stock,\n       stock / 12 AS full_boxes,\n       stock % 12 AS loose_units\nFROM products\nWHERE currency = 'UYU'\n  AND is_active = true\n  AND stock > 0;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Aquí la división entre dos números enteros descarta los decimales, y eso es justamente lo que quieres, porque no existen cajas llenas a medias. Falta una segunda operación que te devuelva **lo que sobra** de esa división.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "La expresión `stock / 12` ya te da las cajas completas, porque los dos valores son enteros. Para obtener el resto de esa división usa la función `MOD(columna, 12)`, o bien el operador `%`.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT id,\n       name,\n       stock,\n       stock ___ 12 AS full_boxes,\n       ___(stock, 12) AS loose_units\nFROM products\nWHERE currency = 'UYU'\n  AND ___\n  AND stock ___ 0;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "cell_values",
        description_md:
          "Usar `ROUND(stock / 12.0)` para calcular las cajas: con 107 unidades daría 9 cajas, pero en realidad solo se pueden armar 8 cajas completas.",
      },
      {
        category: "cell_values",
        description_md:
          "Calcular las unidades sueltas como `stock - full_boxes` en lugar de `stock - full_boxes * 12`: falta multiplicar por el tamaño de la caja.",
      },
      {
        category: "missing_filter",
        description_md:
          "Incluir los productos con `stock` igual a `0` o con `is_active` en `false`: el depósito solo empaca lo que está publicado y disponible.",
      },
      {
        category: "wrong_columns",
        description_md:
          "Devolver la columna `full_boxes` como decimal, por ejemplo `8.9166`: Operaciones necesita un conteo de cajas y no una fracción.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 30 filas. La expresión `stock / 12` es el único caso de esta sección en el que la división entera es la respuesta correcta y no una trampa: el cociente truncado son las cajas completas y la expresión `MOD(stock, 12)` son las unidades que quedan afuera. Siempre se cumple que `full_boxes * 12 + loose_units` es igual a `stock`.\n\nLa expresión `FLOOR(stock / 12.0)` da el mismo número, pero devuelve un valor de tipo `numeric` en lugar de `integer` y te obliga a pensar en el tipo del resultado; la función `div(stock, 12)` es la forma explícita, aunque también devuelve `numeric`.\n\nPresta atención al caso de los valores negativos: la división entera trunca **hacia cero** y no hacia abajo, de modo que `-7 / 2` da `-3`, y la función `MOD` conserva el signo del dividendo. En una columna de stock eso no ocurre, pero sí en columnas de saldos o de ajustes.",
    reward: defaultReward("easy"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "detalle-de-cuotas-aprobadas",
    section,
    title: "Detalle de cuotas de los pagos aprobados",
    difficulty: "intermediate",
    estimated_minutes: 12,
    concepts: ["select", "where", "numeric_functions", "alias"],
    dataset: tiendaviva,
    tables_used: ["payments"],
    scenario_md:
      "El departamento de Medios de Pago está preparando el resumen que ve el cliente en su tarjeta: cuánto paga por cuota y qué porcentaje del total representa cada cuota. El dato salió mal en el último envío, porque todas las compras en 12 cuotas informaban «8 %» en lugar de «8.33 %». Te piden rehacer el cálculo para los planes largos, que son los que más reclamos generaron.",
    business_question_md:
      "Debes generar un dataset que, tomando los pagos cuyo `status` es igual al texto `'approved'` y cuya columna `installments` es mayor o igual a `12`, devuelva el `id`, el `order_id`, el `amount`, el `installments`, el importe de cada cuota bajo el encabezado `installment_amount` y el porcentaje del total que representa **una** cuota bajo el encabezado `installment_share_percent`. Los dos cálculos van redondeados a dos decimales. El orden de las filas no importa.",
    learning_objective:
      "Reconocer la división entera entre dos enteros y forzar un resultado decimal convirtiendo un operando a numeric.",
    theory_ref: division,
    expected_columns: [
      { name: "id", type: "integer" },
      { name: "order_id", type: "integer" },
      { name: "amount", type: "numeric" },
      { name: "installments", type: "integer" },
      { name: "installment_amount", type: "numeric" },
      { name: "installment_share_percent", type: "numeric" },
    ],
    validation_rules: {
      numeric_tolerance: 0.001,
      required_concepts: ["numeric_functions", "where", "alias"],
    },
    reference_solution:
      "SELECT id,\n       order_id,\n       amount,\n       installments,\n       ROUND(amount / installments, 2) AS installment_amount,\n       ROUND(100.0 / installments, 2) AS installment_share_percent\nFROM payments\nWHERE status = 'approved'\n  AND installments >= 12;",
    alternative_solutions: [
      {
        label: "Conversiones de tipo explícitas con :: y CAST",
        sql: "SELECT id,\n       order_id,\n       amount,\n       installments,\n       ROUND(amount / installments::numeric, 2) AS installment_amount,\n       ROUND(CAST(100 AS numeric) / installments, 2) AS installment_share_percent\nFROM payments\nWHERE status = 'approved'\n  AND installments >= 12;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Que el reporte diga «8 %» en lugar de «8.33 %» no es un problema de redondeo: es el tipo de dato. Cuando los dos operandos de una división son enteros, PostgreSQL devuelve un entero y descarta los decimales.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "La columna `installments` es de tipo `integer`. Para que la división del porcentaje sea decimal alcanza con que el otro operando sea de tipo `numeric`: escribe el 100 con decimal o conviértelo con `::numeric`. El importe de la cuota no tiene ese problema, porque la columna `amount` ya es `numeric`.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT id,\n       order_id,\n       amount,\n       installments,\n       ROUND(amount / ___, 2) AS installment_amount,\n       ROUND(___ / ___, 2) AS installment_share_percent\nFROM payments\nWHERE status = ___\n  AND installments ___ ___;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "cell_values",
        description_md:
          "Escribir `ROUND(100 / installments, 2)`: la división entera devuelve 8 y la función `ROUND` posterior ya no puede recuperar los decimales que se perdieron.",
      },
      {
        category: "missing_filter",
        description_md:
          "Incluir los pagos con `status` igual a `'rejected'` o `'refunded'`: el resumen se emite solamente para los pagos aprobados.",
      },
      {
        category: "missing_filter",
        description_md:
          "Dejar entrar los planes de menos de 12 cuotas: la consigna acota el reporte a los planes largos, que son los que generaron los reclamos.",
      },
      {
        category: "cell_values",
        description_md:
          "Calcular el porcentaje como `installment_amount * 100 / amount` sin redondear al final: el valor es correcto, pero arrastra el redondeo de la cuota y puede diferir en centésimas.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 673 filas, todas con planes de 12 cuotas. La clave está en los tipos de dato: la columna `amount` es de tipo `numeric(12,2)`, así que la expresión `amount / installments` ya devuelve `numeric`, porque PostgreSQL promueve el entero. En cambio, la expresión `100 / installments` tiene dos enteros: el resultado es entero y se trunca hacia cero, y por eso el reporte anterior mostraba 8 en lugar de 8.33.\n\nLas tres formas de arreglarlo son equivalentes: `100.0 / installments`, `100::numeric / installments` y `CAST(100 AS numeric) / installments`. La primera es la más breve y la segunda es la que se lee mejor cuando la expresión crece.\n\nEl dataset solo admite planes de 1, 3, 6 y 12 cuotas, así que el porcentaje de una cuota vale 100.00, 33.33, 16.67 y 8.33 respectivamente. Que las doce cuotas de 8.33 sumen 99.96 en lugar de 100 es la razón por la que, en la vida real, la última cuota absorbe la diferencia de centavos.",
    improvement_feedback: [
      { condition: "uses_select_star", message_key: "improve.uses_select_star" },
    ],
    reward: defaultReward("intermediate"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "comision-de-retiro-con-minimo-y-tope",
    section,
    title: "Comisión de retiro con mínimo y tope",
    difficulty: "intermediate",
    estimated_minutes: 12,
    concepts: ["select", "where", "numeric_functions", "alias"],
    dataset: bolsillo,
    tables_used: ["transactions"],
    scenario_md:
      "**Bolsillo** está por lanzar una comisión por retiro de efectivo en Perú: **1.5 % del importe, con un mínimo de 5.00 y un tope de 12.00 soles**. El departamento de Producto quiere simular la regla sobre los retiros que ya se hicieron, antes de activarla, y te pide ese cálculo para estimar el ingreso.",
    business_question_md:
      "Debes generar un dataset que, tomando los movimientos cuyo `kind` es igual al texto `'withdrawal'`, cuyo `status` es igual al texto `'completed'` y cuyo `currency` es igual al texto `'PEN'`, devuelva el `id`, el `amount`, la comisión resultante bajo el encabezado `fee` y el importe que habría recibido la persona, es decir `amount - fee`, bajo el encabezado `net_amount`. La comisión es el 1.5 % del importe redondeado a dos decimales, y nunca puede ser menor que 5.00 ni mayor que 12.00. El orden de las filas no importa.",
    learning_objective:
      "Traducir una regla comercial con piso y techo a SQL combinando GREATEST, LEAST y ROUND.",
    theory_ref: utiles,
    expected_columns: [
      { name: "id", type: "integer" },
      { name: "amount", type: "numeric" },
      { name: "fee", type: "numeric" },
      { name: "net_amount", type: "numeric" },
    ],
    validation_rules: {
      numeric_tolerance: 0.001,
      required_concepts: ["numeric_functions", "where", "alias"],
    },
    reference_solution:
      "SELECT id,\n       amount,\n       LEAST(GREATEST(ROUND(amount * 0.015, 2), 5.00), 12.00) AS fee,\n       ROUND(amount - LEAST(GREATEST(ROUND(amount * 0.015, 2), 5.00), 12.00), 2) AS net_amount\nFROM transactions\nWHERE kind = 'withdrawal'\n  AND status = 'completed'\n  AND currency = 'PEN';",
    alternative_solutions: [
      {
        label: "Tope primero y tasa como 1.5/100",
        sql: "SELECT id,\n       amount,\n       GREATEST(5.00, LEAST(12.00, ROUND(amount * 1.5 / 100, 2))) AS fee,\n       ROUND(amount - GREATEST(5.00, LEAST(12.00, ROUND(amount * 1.5 / 100, 2))), 2) AS net_amount\nFROM transactions\nWHERE kind = 'withdrawal'\n  AND status = 'completed'\n  AND currency = 'PEN';",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "La regla tiene tres partes: un porcentaje, un piso y un techo. Existen dos funciones que comparan valores **dentro de la misma fila** y devuelven el mayor o el menor; con ellas aplicas el piso y el techo sin escribir ninguna condición.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "La función `GREATEST(expresión, 5.00)` impone el mínimo y la función `LEAST(expresión, 12.00)` impone el tope; se anidan una dentro de la otra. El 1.5 % se calcula como `amount * 0.015` y se redondea a dos decimales antes de aplicar los límites. La columna `net_amount` reutiliza esa misma expresión restándola del importe.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT id,\n       amount,\n       ___(___(ROUND(amount * ___, 2), 5.00), 12.00) AS fee,\n       ROUND(amount - <la misma expresión de fee>, 2) AS net_amount\nFROM transactions\nWHERE kind = ___\n  AND status = ___\n  AND currency = ___;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "cell_values",
        description_md:
          "Usar las funciones `MAX` y `MIN`: son funciones de agregación que comparan filas entre sí; aquí hay que comparar valores de una misma fila, y para eso están `GREATEST` y `LEAST`.",
      },
      {
        category: "cell_values",
        description_md:
          "Aplicar solamente uno de los dos límites: 48 retiros quedan por debajo del mínimo y 41 superan el tope, así que la falta de cualquiera de los dos se nota en el resultado.",
      },
      {
        category: "missing_filter",
        description_md:
          "Incluir los retiros con `status` igual a `'pending'` o `'failed'`: la simulación es sobre operaciones efectivamente completadas.",
      },
      {
        category: "cell_values",
        description_md:
          "Calcular la columna `net_amount` con la comisión sin límites: el neto debe restar la comisión que realmente se cobraría, ya acotada por el piso y el techo.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 153 filas. La expresión `LEAST(GREATEST(x, 5.00), 12.00)` se lee de adentro hacia afuera: primero el 1.5 % redondeado, después el piso y por último el techo. La versión `GREATEST(5.00, LEAST(12.00, x))` devuelve exactamente lo mismo mientras el mínimo sea menor que el máximo; ninguna de las dos es la correcta por sí sola, es una decisión de legibilidad que toma el equipo.\n\nEn el resultado se ven los tres tramos de la regla: los retiros chicos quedan con `fee` en 5.00, los retiros medianos con la comisión proporcional, por ejemplo 7.33, y los retiros grandes clavados en 12.00.\n\nHay dos advertencias que conviene recordar. Las funciones `GREATEST` y `LEAST` **ignoran** los valores `NULL`, así que un límite nulo no anula el cálculo, a diferencia de lo que pasa con una suma, donde el `NULL` se contagia al resultado. Y repetir la expresión de `fee` dentro de `net_amount` es el precio de no poder referenciar un alias dentro del mismo `SELECT`: con una subconsulta o con una expresión de tabla común, que vas a ver en las secciones 21 y 22, la escribirías una sola vez.",
    reward: defaultReward("intermediate"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
];
