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
      "Marketing arma el catálogo impreso de la operación uruguaya de **TiendaViva**. En papel no entran centavos: necesitan el precio redondeado al entero más cercano y, además, el precio que usaría el equipo de promociones, que siempre redondea **hacia arriba** para no vender por debajo del costo.",
    business_question_md:
      "Para los productos **activos** (`is_active`) con moneda `UYU`, devuelve `id`, `name`, `list_price`, el precio redondeado al entero más cercano como `price_rounded` y el precio redondeado hacia arriba como `price_ceiling`. El orden no importa.",
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
          "Necesitas dos funciones distintas: una que elija el entero **más cercano** y otra que suba **siempre** al entero siguiente. No son la misma.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "`ROUND(columna)` devuelve el entero más cercano; `CEIL(columna)` sube. Cada expresión necesita su alias (`price_rounded`, `price_ceiling`) y el filtro combina `currency = 'UYU'` con `is_active`.",
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
          "Usar `ROUND` en las dos columnas: `price_ceiling` debe subir siempre, incluso con `.20`.",
      },
      {
        category: "missing_filter",
        description_md:
          "Olvidar `is_active`: el catálogo incluiría publicaciones dadas de baja (36 filas esperadas, no 41).",
      },
      {
        category: "readability",
        description_md:
          "No poner alias: las columnas llegarían como `round` y `ceil`, y el equipo de diseño no sabría cuál es cuál.",
      },
      {
        category: "wrong_columns",
        description_md:
          "Reemplazar `list_price` por su versión redondeada: el reporte también pide el precio original.",
      },
    ],
    expert_explanation_md:
      "36 filas. `ROUND(list_price)` y `ROUND(list_price, 0)` son equivalentes: sin segundo argumento, la escala es 0. `CEIL` y `CEILING` son la misma función con dos nombres (el estándar SQL usa `CEILING`).\n\nLa diferencia se ve en `1207.20`: `ROUND` devuelve `1207` y `CEIL` devuelve `1208`. En productos con precio terminado en `.00` ambos coinciden, y eso es exactamente lo que confunde a quien prueba la consulta con dos filas.\n\nAmbas funciones devuelven `numeric` y no modifican la tabla: el catálogo se imprime con el valor redondeado, pero `products.list_price` sigue teniendo sus centavos.",
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
      "Finanzas revisa la rentabilidad de la operación en Perú. Quiere ver, pedido por pedido, cuánto pesó el descuento sobre el subtotal y cuánto representa el envío dentro del total cobrado. Los porcentajes se presentan con dos decimales.",
    business_question_md:
      "Para los pedidos en `PEN` que tuvieron descuento (`discount > 0`), devuelve `id`, `subtotal`, el descuento como porcentaje del subtotal en `discount_percent` y el costo de envío como porcentaje de `total_amount` en `shipping_percent`. Ambos porcentajes en escala 0–100 y redondeados a dos decimales. El orden no importa.",
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
          "Un porcentaje es una división multiplicada por 100. Lo importante es el denominador: cada una de las dos columnas se mide contra un importe distinto del mismo pedido.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "El descuento se mide contra `subtotal`; el envío, contra `total_amount`. Redondea cada expresión con `ROUND(..., 2)` y ponle el alias que pide el reporte.",
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
          "Devolver la proporción (`0.18`) en vez del porcentaje (`18.00`): falta multiplicar por 100.",
      },
      {
        category: "cell_values",
        description_md:
          "Medir el envío contra `subtotal` en lugar de `total_amount`: el denominador cambia la conclusión del análisis.",
      },
      {
        category: "missing_filter",
        description_md:
          "Omitir `currency = 'PEN'` o `discount > 0`: el pedido es sobre la operación peruana con descuento aplicado.",
      },
      {
        category: "cell_values",
        description_md:
          "Redondear antes de dividir (`ROUND(discount, 2) * 100 / subtotal` no es lo pedido): primero se calcula, al final se redondea.",
      },
    ],
    expert_explanation_md:
      "247 filas. `discount`, `subtotal` y `total_amount` son `numeric(12,2)`, así que la división ya es exacta y no hace falta convertir ningún tipo: el problema de la división entera aparece solo cuando **ambos** operandos son enteros.\n\nVerás que `discount_percent` cae en valores redondos (8.00, 13.00, 18.00) porque el descuento se generó como un porcentaje del subtotal; `shipping_percent`, en cambio, varía libremente e incluso vale `0.00` cuando el envío fue gratis.\n\nDos detalles profesionales: (1) si algún pedido pudiera tener `subtotal = 0`, la consulta fallaría con *division by zero*, y la defensa estándar es `NULLIF(subtotal, 0)`; (2) el nombre `_percent` documenta la escala; si devolvieras la proporción, el nombre correcto sería `_ratio`.",
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
      "El depósito de Montevideo empaca en cajas de 12 unidades. Operaciones necesita saber, para cada producto activo con stock, cuántas cajas completas puede armar y cuántas unidades quedarían sueltas fuera de caja.",
    business_question_md:
      "Para los productos con `currency = 'UYU'`, `is_active` verdadero y `stock > 0`, devuelve `id`, `name`, `stock`, la cantidad de cajas completas de 12 unidades en `full_boxes` y las unidades que sobran en `loose_units`. Ambos valores deben ser números enteros. El orden no importa.",
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
          "Aquí la división entre dos enteros descarta los decimales, y eso es justo lo que quieres: no existen cajas a medio llenar. Falta una segunda operación que te devuelva **lo que sobra**.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "`stock / 12` ya te da las cajas completas porque ambos valores son enteros. Para el resto de esa división usa `MOD(columna, 12)` (o el operador `%`).",
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
          "Usar `ROUND(stock / 12.0)` para las cajas: con 107 unidades daría 9 cajas, pero solo se pueden armar 8.",
      },
      {
        category: "cell_values",
        description_md:
          "Calcular las sueltas como `stock - full_boxes` en vez de `stock - full_boxes * 12`: falta multiplicar por el tamaño de la caja.",
      },
      {
        category: "missing_filter",
        description_md:
          "Incluir productos con `stock = 0` o inactivos: el depósito solo empaca lo que está publicado y disponible.",
      },
      {
        category: "wrong_columns",
        description_md:
          "Devolver `full_boxes` como decimal (`8.9166`): Operaciones necesita un conteo de cajas, no una fracción.",
      },
    ],
    expert_explanation_md:
      "30 filas. `stock / 12` es el único caso de la sección donde la división entera es la respuesta correcta y no una trampa: el cociente truncado son las cajas completas y `MOD(stock, 12)` son las unidades que quedan afuera. Se cumple siempre que `full_boxes * 12 + loose_units = stock`.\n\n`FLOOR(stock / 12.0)` da el mismo número, pero devuelve `numeric` en vez de `integer` y obliga a pensar en el tipo del resultado; `div(stock, 12)` es la forma explícita, aunque también devuelve `numeric`.\n\nAtención con valores negativos: la división entera trunca **hacia cero**, no hacia abajo (`-7 / 2` es `-3`), y `MOD` conserva el signo del dividendo. En un stock eso no ocurre, pero sí en columnas de saldos o ajustes.",
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
      "El área de medios de pago prepara el resumen que ve el cliente en su tarjeta: cuánto paga por cuota y qué porcentaje del total representa cada cuota. El dato salió mal en el último envío: todas las compras en 3 cuotas informaban «33 %» y las de 12 cuotas, «8 %».",
    business_question_md:
      "Para los pagos con `status = 'approved'` y más de una cuota, devuelve `id`, `order_id`, `amount`, `installments`, el importe de cada cuota en `installment_amount` y el porcentaje del total que representa **una** cuota en `installment_share_percent`. Ambos cálculos redondeados a dos decimales. El orden no importa.",
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
          "«33 %» en vez de «33.33 %» no es un problema de redondeo: es el tipo de dato. Cuando los dos operandos de una división son enteros, PostgreSQL devuelve un entero y descarta los decimales.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "`installments` es `integer`. Para que la división del porcentaje sea decimal, alcanza con que el otro operando sea `numeric`: escribe el 100 con decimal o castea con `::numeric`. El importe de la cuota no tiene ese problema porque `amount` ya es `numeric`.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT id,\n       order_id,\n       amount,\n       installments,\n       ROUND(amount / ___, 2) AS installment_amount,\n       ROUND(___ / ___, 2) AS installment_share_percent\nFROM payments\nWHERE status = ___\n  AND installments > ___;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "cell_values",
        description_md:
          "Escribir `ROUND(100 / installments, 2)`: la división entera devuelve 33 y el `ROUND` posterior ya no puede recuperar los decimales perdidos.",
      },
      {
        category: "missing_filter",
        description_md:
          "Incluir pagos `rejected` o `refunded`: el resumen se emite solo para pagos aprobados.",
      },
      {
        category: "missing_filter",
        description_md:
          "Dejar los pagos de una sola cuota: no tienen plan de cuotas que informar (serían 11 028 filas de más).",
      },
      {
        category: "cell_values",
        description_md:
          "Calcular el porcentaje como `installment_amount * 100 / amount` sin redondear al final: el valor es correcto, pero arrastra el redondeo de la cuota y puede diferir en centésimas.",
      },
    ],
    expert_explanation_md:
      "3535 filas. La clave está en los tipos: `amount` es `numeric(12,2)`, así que `amount / installments` ya devuelve `numeric` (Postgres promueve el entero). En cambio `100 / installments` son dos enteros: el resultado es entero y se trunca hacia cero, por eso el reporte anterior mostraba 33 y 8.\n\nLas tres formas de arreglarlo son equivalentes: `100.0 / installments`, `100::numeric / installments` y `CAST(100 AS numeric) / installments`. La primera es la más breve; la segunda es la que se lee mejor cuando la expresión crece.\n\nLos valores esperados son fijos, porque el dataset solo admite planes de 1, 3, 6 y 12 cuotas: 33.33, 16.67 y 8.33. Que sumen 99.99 en vez de 100 es la razón por la que, en la vida real, la última cuota absorbe la diferencia de centavos.",
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
      "**Bolsillo** lanza una comisión por retiro de efectivo en Perú: **1.5 % del importe, con un mínimo de 5.00 PEN y un tope de 12.00 PEN**. Producto quiere simular la regla sobre los retiros que ya se hicieron, antes de activarla.",
    business_question_md:
      "Para los movimientos con `kind = 'withdrawal'`, `status = 'completed'` y `currency = 'PEN'`, devuelve `id`, `amount`, la comisión resultante en `fee` y el importe que habría recibido la persona (`amount - fee`) en `net_amount`. La comisión es el 1.5 % del importe redondeado a dos decimales, nunca menor que 5.00 ni mayor que 12.00. El orden no importa.",
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
          "La regla tiene tres partes: un porcentaje, un piso y un techo. Existen dos funciones que comparan valores **dentro de la misma fila** y devuelven el mayor o el menor; con ellas aplicas el piso y el techo sin escribir condiciones.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "`GREATEST(expresión, 5.00)` impone el mínimo y `LEAST(expresión, 12.00)` impone el tope; se anidan una dentro de la otra. El 1.5 % se calcula como `amount * 0.015` y se redondea a dos decimales antes de aplicar los límites. `net_amount` reutiliza esa misma expresión restándola del importe.",
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
          "Usar `MAX` y `MIN`: son funciones de agregación que comparan filas; aquí se comparan valores de una misma fila con `GREATEST` y `LEAST`.",
      },
      {
        category: "cell_values",
        description_md:
          "Aplicar solo uno de los dos límites: 48 retiros quedan por debajo del mínimo y 41 superan el tope, así que ambos se notan en el resultado.",
      },
      {
        category: "missing_filter",
        description_md:
          "Incluir retiros `pending` o `failed`: la simulación es sobre operaciones efectivamente completadas.",
      },
      {
        category: "cell_values",
        description_md:
          "Calcular `net_amount` con la comisión sin límites: el neto debe restar la comisión que realmente se cobraría.",
      },
    ],
    expert_explanation_md:
      "153 filas. `LEAST(GREATEST(x, 5.00), 12.00)` se lee de adentro hacia afuera: primero el 1.5 % redondeado, después el piso, por último el techo. La versión `GREATEST(5.00, LEAST(12.00, x))` devuelve exactamente lo mismo mientras el mínimo sea menor que el máximo; ninguna es «la correcta», es una decisión de legibilidad del equipo.\n\nEn el resultado se ven los tres tramos: retiros chicos con `fee = 5.00`, retiros medianos con la comisión proporcional (por ejemplo 7.33) y retiros grandes clavados en 12.00.\n\nDos advertencias: `GREATEST` y `LEAST` **ignoran** los NULL, así que un límite nulo no anula el cálculo (a diferencia de una suma, que sí se contagia); y repetir la expresión de `fee` dentro de `net_amount` es el precio de no poder referenciar un alias del mismo `SELECT`. Con una subconsulta o un CTE (secciones 21 y 22) la escribirías una sola vez.",
    reward: defaultReward("intermediate"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
];
