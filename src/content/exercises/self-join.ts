import {
  defaultHintMeta,
  defaultReward,
  defaultSolutionUnlock,
  type ExerciseDef,
} from "../schemas/exercise";

const section = "self-join";
const tiendaviva = { slug: "tiendaviva", version: 1 };
const bolsillo = { slug: "bolsillo", version: 1 };
const jerarquias = "self-join-jerarquias";
const emparejar = "self-join-emparejar-filas";
const comparar = "self-join-comparar-filas";

export const exercises: ExerciseDef[] = [
  {
    slug: "subcategorias-con-su-categoria-padre",
    section,
    title: "Subcategorías con su categoría padre",
    difficulty: "easy",
    estimated_minutes: 7,
    concepts: ["self_join", "inner_join", "alias", "order_by"],
    dataset: tiendaviva,
    tables_used: ["categories"],
    scenario_md:
      "El equipo de catálogo de **TiendaViva** arma el menú de navegación del sitio y necesita ver el árbol de categorías en dos columnas legibles, no como una lista de `parent_id`.",
    business_question_md:
      "Devuelve una fila por subcategoría con `categoria` (nombre de la categoría padre) y `subcategoria` (nombre de la subcategoría). Las categorías raíz no deben aparecer. Ordena por `categoria` y luego por `subcategoria`.",
    learning_objective:
      "Unir una tabla consigo misma con dos alias distintos para resolver una jerarquía padre–hijo.",
    theory_ref: jerarquias,
    expected_columns: [
      { name: "categoria", type: "text" },
      { name: "subcategoria", type: "text" },
    ],
    validation_rules: { order_matters: true, required_concepts: ["self_join", "inner_join"] },
    reference_solution:
      "SELECT padre.name AS categoria, hija.name AS subcategoria\nFROM categories AS hija\nINNER JOIN categories AS padre ON padre.id = hija.parent_id\nORDER BY categoria, subcategoria;",
    alternative_solutions: [
      {
        label: "Partiendo de la categoría padre",
        sql: "SELECT padre.name AS categoria, hija.name AS subcategoria\nFROM categories AS padre\nINNER JOIN categories AS hija ON hija.parent_id = padre.id\nORDER BY 1, 2;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "El nombre del padre y el de la hija están en la misma tabla, en filas distintas. Necesitas dos «copias» de esa tabla, cada una con su propio alias.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Une `categories` consigo misma: la columna `parent_id` de la copia «hija» apunta al `id` de la copia «padre». Un INNER JOIN deja fuera las raíces automáticamente, porque su `parent_id` es NULL.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT ___.name AS categoria, ___.name AS subcategoria\nFROM categories AS hija\nINNER JOIN categories AS padre\n  ON ___ = ___\nORDER BY categoria, subcategoria;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "syntax",
        description_md:
          "Escribir la tabla dos veces sin alias: PostgreSQL responde «table name categories specified more than once».",
      },
      {
        category: "join_condition",
        description_md:
          "Invertir la condición (`ON padre.parent_id = hija.id`): no hay error, pero el reporte muestra la jerarquía al revés.",
      },
      {
        category: "wrong_columns",
        description_md:
          "Devolver `name` sin alias en ambas columnas: los dos encabezados se llaman igual y el reporte se vuelve ambiguo.",
      },
      {
        category: "wrong_order",
        description_md:
          "Ordenar solo por `categoria` y dejar las subcategorías en orden aleatorio.",
      },
    ],
    expert_explanation_md:
      "24 filas: las 30 categorías menos las 6 raíces, que tienen `parent_id` en NULL y por eso no encuentran pareja en un INNER JOIN.\n\nEl motor trata cada alias como una tabla independiente: `hija` recorre las 30 filas y, para cada una, busca en `padre` la fila cuyo `id` coincide con su `parent_id`. Da lo mismo empezar por `hija` o por `padre` (ver la solución alternativa); elige el orden que haga más legible el `SELECT`.\n\nEn términos de rendimiento, un self join sobre la clave primaria usa el mismo índice que cualquier join: no hay costo extra por ser la misma tabla.",
    improvement_feedback: [
      { condition: "no_table_alias_in_join", message_key: "improve.no_table_alias_in_join" },
    ],
    reward: defaultReward("easy"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "arbol-completo-de-categorias",
    section,
    title: "Árbol completo de categorías, con las raíces",
    difficulty: "easy",
    estimated_minutes: 7,
    concepts: ["self_join", "outer_join", "alias", "order_by"],
    dataset: tiendaviva,
    tables_used: ["categories"],
    scenario_md:
      "La misma persona del equipo de catálogo ahora quiere auditar el árbol completo: necesita ver **todas** las categorías y distinguir de un vistazo cuáles son raíz (no cuelgan de ninguna otra).",
    business_question_md:
      "Devuelve `id`, `categoria` (el nombre de la categoría) y `categoria_padre` (el nombre de su padre, o NULL si es una raíz) para las 30 categorías. Ordena por `id`.",
    learning_objective:
      "Usar LEFT JOIN sobre la propia tabla para conservar las filas que no tienen fila padre.",
    theory_ref: jerarquias,
    expected_columns: [
      { name: "id", type: "integer" },
      { name: "categoria", type: "text" },
      { name: "categoria_padre", type: "text" },
    ],
    validation_rules: {
      order_matters: true,
      required_concepts: ["self_join", "outer_join"],
    },
    reference_solution:
      "SELECT c.id, c.name AS categoria, padre.name AS categoria_padre\nFROM categories AS c\nLEFT JOIN categories AS padre ON padre.id = c.parent_id\nORDER BY c.id;",
    alternative_solutions: [
      {
        label: "RIGHT JOIN (el mismo LEFT JOIN escrito al revés)",
        sql: "SELECT c.id, c.name AS categoria, padre.name AS categoria_padre\nFROM categories AS padre\nRIGHT JOIN categories AS c ON padre.id = c.parent_id\nORDER BY c.id;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Con INNER JOIN las categorías sin padre desaparecen. Necesitas el tipo de join que conserva todas las filas de la tabla de la izquierda.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Parte de `categories` con un alias (por ejemplo `c`) y agrega un LEFT JOIN a `categories` con otro alias (`padre`) por `padre.id = c.parent_id`. Las raíces quedarán con el nombre del padre en NULL: no lo filtres.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT c.id, c.name AS categoria, ___.name AS categoria_padre\nFROM categories AS c\n___ JOIN categories AS ___\n  ON ___ = c.parent_id\nORDER BY c.id;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "join_condition",
        description_md:
          "Usar INNER JOIN: el resultado trae 24 filas en lugar de 30 porque descarta las raíces.",
      },
      {
        category: "null_handling",
        description_md:
          "Reemplazar el NULL por un texto sin que el pedido lo solicite: el reporte pidió NULL para las raíces.",
      },
      {
        category: "missing_filter",
        description_md:
          "Agregar `WHERE padre.id IS NOT NULL` y volver a perder las raíces que el reporte quería mostrar.",
      },
      {
        category: "wrong_order",
        description_md: "Omitir `ORDER BY c.id` y devolver el árbol en orden arbitrario.",
      },
    ],
    expert_explanation_md:
      "30 filas, 6 de ellas con `categoria_padre` en NULL. El LEFT JOIN conserva cada fila de `c` aunque la copia `padre` no encuentre pareja, y rellena sus columnas con NULL.\n\nLa alternativa con RIGHT JOIN devuelve exactamente lo mismo: es el mismo join escrito desde la otra tabla. La mayoría de los equipos prefiere LEFT por consistencia de lectura.\n\nSi además quisieras quedarte solo con las raíces, el patrón de la sección 18 (`WHERE padre.id IS NULL`) funciona; en esta tabla `WHERE c.parent_id IS NULL` responde lo mismo sin join y es la forma más directa.",
    improvement_feedback: [
      { condition: "uses_select_star", message_key: "improve.uses_select_star" },
    ],
    reward: defaultReward("easy"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "reversos-con-su-pago-original",
    section,
    title: "Cada reverso junto a su pago original",
    difficulty: "intermediate",
    estimated_minutes: 12,
    concepts: ["self_join", "inner_join", "date_functions", "where", "order_by"],
    dataset: bolsillo,
    tables_used: ["transactions"],
    scenario_md:
      "El equipo de disputas de **Bolsillo** revisa cuánto demora la devolución del dinero cuando se reversa un pago con tarjeta. Cada reverso es un movimiento con `kind = 'reversal'` cuya columna `reversal_of` apunta al `id` del pago original.",
    business_question_md:
      "Para cada reverso cuyo pago original sea de tipo `card_payment`, devuelve `reversal_id` (id del reverso), `original_id` (id del pago original), `amount` (importe del pago original) y `horas_hasta_reverso`, la diferencia entre la creación del reverso y la del pago original expresada en horas enteras. Ordena por `horas_hasta_reverso` descendente y, ante empates, por `reversal_id` ascendente.",
    learning_objective:
      "Emparejar dos filas relacionadas de la misma tabla y calcular una diferencia de tiempo entre ellas.",
    theory_ref: emparejar,
    expected_columns: [
      { name: "reversal_id", type: "integer" },
      { name: "original_id", type: "integer" },
      { name: "amount", type: "numeric" },
      { name: "horas_hasta_reverso", type: "integer" },
    ],
    validation_rules: {
      order_matters: true,
      required_concepts: ["self_join", "inner_join"],
    },
    reference_solution:
      "SELECT\n  rev.id AS reversal_id,\n  orig.id AS original_id,\n  orig.amount,\n  (extract(epoch FROM (rev.created_at - orig.created_at)) / 3600)::int AS horas_hasta_reverso\nFROM transactions AS rev\nINNER JOIN transactions AS orig ON orig.id = rev.reversal_of\nWHERE orig.kind = 'card_payment'\nORDER BY horas_hasta_reverso DESC, reversal_id;",
    alternative_solutions: [
      {
        label: "Partiendo del pago original",
        sql: "SELECT\n  rev.id AS reversal_id,\n  orig.id AS original_id,\n  orig.amount,\n  (extract(epoch FROM (rev.created_at - orig.created_at)) / 3600)::int AS horas_hasta_reverso\nFROM transactions AS orig\nINNER JOIN transactions AS rev ON rev.reversal_of = orig.id\nWHERE orig.kind = 'card_payment'\nORDER BY horas_hasta_reverso DESC, reversal_id;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Las dos filas que necesitas (el reverso y el pago devuelto) están en la misma tabla. Únela consigo misma usando la columna que relaciona una fila con otra.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Usa dos alias, por ejemplo `rev` y `orig`, y une por `orig.id = rev.reversal_of`. El filtro `kind = 'card_payment'` es sobre el pago original, no sobre el reverso. Para las horas, resta los dos `created_at` y convierte el intervalo con `extract(epoch FROM ...) / 3600`.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT\n  rev.id AS reversal_id,\n  ___ AS original_id,\n  ___,\n  (extract(epoch FROM (___ - ___)) / ___)::int AS horas_hasta_reverso\nFROM transactions AS rev\nINNER JOIN transactions AS orig ON ___\nWHERE ___.kind = 'card_payment'\nORDER BY horas_hasta_reverso DESC, reversal_id;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "join_condition",
        description_md:
          "Unir por `rev.id = orig.reversal_of`: la relación apunta en el otro sentido y el resultado queda vacío.",
      },
      {
        category: "missing_filter",
        description_md:
          "Aplicar `kind = 'card_payment'` al alias del reverso: todos los reversos tienen `kind = 'reversal'`, así que no vuelve ninguna fila.",
      },
      {
        category: "cell_values",
        description_md:
          "Restar los `created_at` al revés (`orig.created_at - rev.created_at`) y obtener horas negativas.",
      },
      {
        category: "date_boundary",
        description_md:
          "Usar `date_part('hour', ...)` sobre el intervalo: devuelve solo la parte de horas y pierde los días completos.",
      },
    ],
    expert_explanation_md:
      "120 filas: los reversos cuyo pago original fue con tarjeta. El INNER JOIN alcanza como filtro implícito, porque solo los reversos tienen `reversal_of` distinto de NULL y la igualdad nunca se cumple para los demás movimientos.\n\nCada alias se filtra por separado: `orig.kind` describe el pago devuelto y `rev.*` la devolución. Esa independencia es justamente lo que hace útil al self join.\n\nRestar dos `timestamptz` produce un `interval`; `extract(epoch FROM intervalo)` lo pasa a segundos y la división lo lleva a horas. En este dataset las demoras son múltiplos exactos de una hora, así que el cast a entero no pierde información; con datos reales conviene decidir explícitamente si redondeas (`round`) o truncas (`trunc`).\n\nUna alternativa equivalente es empezar por `orig` e invertir el `ON`: mismo plan de ejecución, distinta lectura.",
    improvement_feedback: [
      { condition: "uses_select_star", message_key: "improve.uses_select_star" },
    ],
    reward: defaultReward("intermediate"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "posibles-publicaciones-duplicadas",
    section,
    title: "Posibles publicaciones duplicadas",
    difficulty: "intermediate",
    estimated_minutes: 14,
    concepts: ["self_join", "inner_join", "where", "numeric_functions", "order_by"],
    dataset: tiendaviva,
    tables_used: ["products"],
    scenario_md:
      "Calidad de catálogo sospecha que algunos vendedores publican el mismo artículo dos veces para ocupar más lugar en los resultados de búsqueda. La señal acordada: dos productos del mismo vendedor, en la misma categoría, con precios casi iguales.",
    business_question_md:
      "Devuelve los pares de productos del mismo `seller_id` y la misma `category_id` cuya diferencia de precio no supere el 5 % del menor de los dos precios. Columnas: `seller_id`, `producto_a`, `producto_b` (los `id`, con `producto_a` menor que `producto_b`), `precio_a` y `precio_b`. Cada par debe aparecer **una sola vez**. Ordena por `seller_id`, `producto_a` y `producto_b`.",
    learning_objective:
      "Comparar filas de una misma tabla entre sí evitando auto-emparejamientos y pares espejados.",
    theory_ref: comparar,
    expected_columns: [
      { name: "seller_id", type: "integer" },
      { name: "producto_a", type: "integer" },
      { name: "producto_b", type: "integer" },
      { name: "precio_a", type: "numeric" },
      { name: "precio_b", type: "numeric" },
    ],
    validation_rules: {
      order_matters: true,
      required_concepts: ["self_join", "inner_join"],
    },
    reference_solution:
      "SELECT\n  a.seller_id,\n  a.id AS producto_a,\n  b.id AS producto_b,\n  a.list_price AS precio_a,\n  b.list_price AS precio_b\nFROM products AS a\nINNER JOIN products AS b\n  ON b.seller_id = a.seller_id\n AND b.category_id = a.category_id\n AND b.id > a.id\nWHERE abs(a.list_price - b.list_price) <= 0.05 * least(a.list_price, b.list_price)\nORDER BY a.seller_id, producto_a, producto_b;",
    alternative_solutions: [
      {
        label: "Toda la condición dentro del ON",
        sql: "SELECT\n  a.seller_id,\n  a.id AS producto_a,\n  b.id AS producto_b,\n  a.list_price AS precio_a,\n  b.list_price AS precio_b\nFROM products AS a\nINNER JOIN products AS b\n  ON b.seller_id = a.seller_id\n AND b.category_id = a.category_id\n AND b.id > a.id\n AND abs(a.list_price - b.list_price) <= 0.05 * least(a.list_price, b.list_price)\nORDER BY 1, 2, 3;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Compara la tabla de productos consigo misma. Piensa qué condición evita que una fila se empareje con ella misma y que cada pareja aparezca dos veces (una en cada orden).",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Une `products` con `products` por `seller_id` y `category_id`, y agrega una desigualdad entre los `id` para quedarte con una sola versión de cada par. Para «precios casi iguales» usa `abs()` sobre la resta y compárala con el 5 % del menor precio (`least`).",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT a.seller_id, a.id AS producto_a, b.id AS producto_b,\n       a.list_price AS precio_a, b.list_price AS precio_b\nFROM products AS a\nINNER JOIN products AS b\n  ON b.seller_id = ___\n AND b.category_id = ___\n AND b.id ___ a.id\nWHERE abs(___) <= ___ * least(a.list_price, b.list_price)\nORDER BY a.seller_id, producto_a, producto_b;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "duplicates",
        description_md:
          "Omitir la desigualdad: cada par aparece dos veces (espejado) y además cada producto se empareja consigo mismo.",
      },
      {
        category: "join_condition",
        description_md:
          "Usar `b.id <> a.id`: elimina el auto-emparejamiento pero deja los pares espejados, así que el conteo queda al doble.",
      },
      {
        category: "cell_values",
        description_md:
          "Comparar la diferencia contra el 5 % de `a.list_price` en lugar del menor de los dos precios: el resultado cambia según cuál producto quedó como `a`.",
      },
      {
        category: "missing_filter",
        description_md:
          "Olvidar `category_id` en la condición y traer pares del mismo vendedor en categorías distintas.",
      },
    ],
    expert_explanation_md:
      "19 pares. La clave es `b.id > a.id`: con ella una fila nunca se une consigo misma (ningún id es mayor que sí mismo) y de cada par espejado sobrevive solo la versión ordenada, que además garantiza `producto_a < producto_b` sin trabajo extra.\n\n`abs(a.list_price - b.list_price) <= 0.05 * least(a.list_price, b.list_price)` hace la comparación simétrica: usar `a.list_price` como referencia daría resultados distintos según cuál producto ocupó cada lado.\n\nCon INNER JOIN da lo mismo poner la condición de precio en el `ON` o en el `WHERE` (ver la alternativa); en un LEFT JOIN no serían equivalentes.\n\nAntes de agregar columnas a un self join de comparación, ejecuta `count(*)`: sin condiciones suficientes, 1500 productos producirían más de dos millones de filas.",
    improvement_feedback: [
      { condition: "uses_implicit_join", message_key: "improve.uses_implicit_join" },
    ],
    reward: defaultReward("intermediate"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "comercios-con-mas-reversos",
    section,
    title: "Comercios con más pagos reversados",
    difficulty: "advanced",
    estimated_minutes: 16,
    concepts: ["self_join", "inner_join", "group_by", "having", "aggregate", "date_functions"],
    dataset: bolsillo,
    tables_used: ["transactions", "merchants"],
    scenario_md:
      "Riesgo de **Bolsillo** quiere una lista corta de comercios para revisar: aquellos con tres o más pagos reversados, con el tiempo promedio que tardó la devolución.",
    business_question_md:
      "Devuelve `merchant_name`, `category`, `reversos` (cantidad de pagos reversados del comercio) y `horas_promedio` (promedio de horas entre la creación del pago original y la del reverso, redondeado a un decimal). Incluye solo comercios con 3 o más reversos. Ordena por `reversos` descendente y luego por `merchant_name` ascendente.",
    learning_objective:
      "Combinar un self join con un join a otra tabla y una agregación con HAVING.",
    theory_ref: emparejar,
    expected_columns: [
      { name: "merchant_name", type: "text" },
      { name: "category", type: "text" },
      { name: "reversos", type: "integer" },
      { name: "horas_promedio", type: "numeric" },
    ],
    validation_rules: {
      order_matters: true,
      numeric_tolerance: 0.05,
      required_concepts: ["self_join", "inner_join", "group_by", "having"],
    },
    reference_solution:
      "SELECT\n  m.name AS merchant_name,\n  m.category,\n  count(*) AS reversos,\n  round(avg(extract(epoch FROM (rev.created_at - orig.created_at)) / 3600)::numeric, 1) AS horas_promedio\nFROM transactions AS rev\nINNER JOIN transactions AS orig ON orig.id = rev.reversal_of\nINNER JOIN merchants AS m ON m.id = orig.merchant_id\nGROUP BY m.id, m.name, m.category\nHAVING count(*) >= 3\nORDER BY reversos DESC, merchant_name;",
    alternative_solutions: [
      {
        label: "Partiendo del pago original",
        sql: "SELECT\n  m.name AS merchant_name,\n  m.category,\n  count(rev.id) AS reversos,\n  round(avg(extract(epoch FROM (rev.created_at - orig.created_at)) / 3600)::numeric, 1) AS horas_promedio\nFROM transactions AS orig\nINNER JOIN transactions AS rev ON rev.reversal_of = orig.id\nINNER JOIN merchants AS m ON m.id = orig.merchant_id\nGROUP BY m.id, m.name, m.category\nHAVING count(rev.id) >= 3\nORDER BY reversos DESC, merchant_name;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Primero empareja cada reverso con su pago original (como en el ejercicio anterior); recién después agrega el comercio y agrupa. El comercio se conoce por el pago original.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Tres joins: `transactions` con `transactions` por `reversal_of`, y luego `merchants` por `merchant_id` del pago original. Agrupa por el comercio, cuenta filas y filtra el conteo con `HAVING`. El promedio de horas se calcula sobre la misma resta de `created_at` del ejercicio anterior.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT m.name AS merchant_name, m.category,\n       count(*) AS reversos,\n       round(avg(___)::numeric, 1) AS horas_promedio\nFROM transactions AS rev\nINNER JOIN transactions AS orig ON ___\nINNER JOIN merchants AS m ON m.id = ___.merchant_id\nGROUP BY ___\nHAVING ___ >= 3\nORDER BY reversos DESC, merchant_name;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "join_condition",
        description_md:
          "Tomar el comercio del reverso (`rev.merchant_id`) sin verificar: el criterio del reporte es el comercio donde ocurrió el pago original.",
      },
      {
        category: "aggregation_level",
        description_md:
          "Filtrar el conteo en `WHERE` en lugar de `HAVING`: `WHERE` se evalúa antes de agrupar y no puede usar `count(*)`.",
      },
      {
        category: "duplicates",
        description_md:
          "Agrupar solo por `m.name` cuando dos comercios distintos pueden compartir nombre; agrupar por `m.id` mantiene la fila por comercio real.",
      },
      {
        category: "cell_values",
        description_md:
          "Sumar `amount` en lugar de contar: Bolsillo tiene cuentas en varias monedas y una suma mezclada no significa nada.",
      },
    ],
    expert_explanation_md:
      "24 comercios. La consulta encadena tres joins: el self join empareja reverso y pago original, y el tercer join trae los datos del comercio desde `orig.merchant_id`.\n\n`count(*)` y `count(rev.id)` dan lo mismo aquí porque el INNER JOIN garantiza que ninguna fila del grupo tiene el reverso en NULL; con un LEFT JOIN habría que contar la columna.\n\n`HAVING` filtra después de agrupar, así que puede usar el resultado de `count(*)`; `WHERE` no. Agrupar por `m.id` además de `m.name` es una costumbre defensiva: protege contra nombres repetidos y sigue siendo válido porque `m.id` es clave primaria.\n\nEl promedio se calcula sobre horas ya convertidas: promediar intervalos también funciona en PostgreSQL (`avg` acepta `interval`), pero devuelve un intervalo que es más difícil de ordenar y comparar en un tablero.",
    improvement_feedback: [
      {
        condition: "missing_alias_on_aggregate",
        message_key: "improve.missing_alias_on_aggregate",
      },
    ],
    reward: defaultReward("advanced"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
];
