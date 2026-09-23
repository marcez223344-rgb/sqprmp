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
      "El departamento de Catálogo de **TiendaViva** está armando el menú de navegación del sitio y necesita ver el árbol de categorías en dos columnas legibles, y no como una lista de valores de `parent_id`. Te piden ese listado para pasárselo al equipo de diseño.",
    business_question_md:
      "Debes generar un dataset con una fila por subcategoría, con el nombre de la categoría padre bajo el encabezado `categoria` y el nombre de la subcategoría bajo el encabezado `subcategoria`. Las categorías raíz no deben aparecer en el resultado. Ordena por `categoria` y después por `subcategoria`, las dos en forma ascendente.",
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
          "El nombre del padre y el de la hija están en la misma tabla, pero en filas distintas. Necesitas dos copias de esa tabla, cada una con su propio alias.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Une la tabla `categories` consigo misma: la columna `parent_id` de la copia que representa a la hija apunta al `id` de la copia que representa al padre. Un `INNER JOIN` deja fuera las categorías raíz de forma automática, porque su `parent_id` está en `NULL`.",
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
          "Escribir la tabla dos veces sin darle alias: PostgreSQL responde con el error «table name categories specified more than once».",
      },
      {
        category: "join_condition",
        description_md:
          "Invertir la condición del cruce, escribiendo `ON padre.parent_id = hija.id`: no hay ningún error, pero el reporte muestra la jerarquía al revés.",
      },
      {
        category: "wrong_columns",
        description_md:
          "Devolver la columna `name` sin alias en las dos columnas: los dos encabezados se llaman igual y el reporte se vuelve ambiguo.",
      },
      {
        category: "wrong_order",
        description_md:
          "Ordenar solamente por `categoria` y dejar las subcategorías de cada rama en orden arbitrario.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 24 filas: las 30 categorías de la tabla menos las 6 categorías raíz, que tienen `parent_id` en `NULL` y por eso no encuentran pareja en un `INNER JOIN`.\n\nEl motor trata cada alias como si fuera una tabla independiente: el alias `hija` recorre las 30 filas y, para cada una, busca en el alias `padre` la fila cuyo `id` coincide con su `parent_id`. Da lo mismo empezar por la hija o por el padre, como se ve en la solución alternativa; elige el orden que haga más legible la lista de `SELECT`.\n\nEn términos de rendimiento, una autounión sobre la clave primaria usa el mismo índice que cualquier otro cruce: no hay ningún costo extra por tratarse de la misma tabla.",
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
      "La misma persona del departamento de Catálogo ahora quiere auditar el árbol completo: necesita ver **todas** las categorías y distinguir de un vistazo cuáles son raíz, es decir, cuáles no cuelgan de ninguna otra. Te piden ese listado para detectar categorías mal ubicadas.",
    business_question_md:
      "Debes generar un dataset que devuelva el `id`, el nombre de la categoría bajo el encabezado `categoria` y el nombre de su categoría padre bajo el encabezado `categoria_padre`, que debe quedar en `NULL` cuando la categoría es raíz, para las 30 categorías de la tabla. Ordena por `id` ascendente.",
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
          "Con un `INNER JOIN` las categorías sin padre desaparecen del resultado. Necesitas el tipo de cruce que conserva todas las filas de la tabla de la izquierda.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Parte de la tabla `categories` con un alias, por ejemplo `c`, y agrega un `LEFT JOIN` a la misma tabla con otro alias, por ejemplo `padre`, usando la condición `padre.id = c.parent_id`. Las categorías raíz van a quedar con el nombre del padre en `NULL`: no las filtres.",
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
          "Usar un `INNER JOIN`: el resultado trae 24 filas en lugar de 30, porque descarta justamente las categorías raíz que había que auditar.",
      },
      {
        category: "null_handling",
        description_md:
          "Reemplazar el valor `NULL` por un texto sin que el pedido lo solicite: el reporte pidió explícitamente `NULL` para las categorías raíz.",
      },
      {
        category: "missing_filter",
        description_md:
          "Agregar la condición `WHERE padre.id IS NOT NULL` y volver a perder las categorías raíz que el reporte quería mostrar.",
      },
      {
        category: "wrong_order",
        description_md:
          "Omitir la cláusula `ORDER BY c.id` y devolver el árbol en un orden arbitrario.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 30 filas, 6 de ellas con la columna `categoria_padre` en `NULL`. El `LEFT JOIN` conserva cada fila del alias `c` aunque la copia `padre` no encuentre pareja, y rellena sus columnas con `NULL`.\n\nLa alternativa con `RIGHT JOIN` devuelve exactamente lo mismo: es el mismo cruce escrito desde la otra tabla. La mayoría de los equipos prefiere `LEFT JOIN` por consistencia de lectura.\n\nSi además quisieras quedarte solamente con las categorías raíz, el patrón de la sección 18, que usa `WHERE padre.id IS NULL`, funciona; en esta tabla la condición `WHERE c.parent_id IS NULL` responde lo mismo sin necesidad de ningún cruce, y es la forma más directa.",
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
      "El departamento de Disputas de **Bolsillo** está revisando cuánto demora la devolución del dinero cuando se reversa un pago con tarjeta. Cada reverso es un movimiento cuyo `kind` es igual al texto `'reversal'` y cuya columna `reversal_of` apunta al `id` del pago original. Te piden ese detalle para poder comprometer un plazo con los clientes.",
    business_question_md:
      "Debes generar un dataset que, para cada reverso cuyo pago original es de tipo `'card_payment'`, devuelva el identificador del reverso bajo el encabezado `reversal_id`, el identificador del pago original bajo el encabezado `original_id`, el importe del pago original bajo el encabezado `amount` y la diferencia entre la creación del reverso y la del pago original, expresada en horas enteras, bajo el encabezado `horas_hasta_reverso`. Ordena por `horas_hasta_reverso` descendente y, si dos reversos empatan, debes desempatar usando `reversal_id` ascendente.",
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
          "Las dos filas que necesitas, el reverso y el pago devuelto, están en la misma tabla. Únela consigo misma usando la columna que relaciona una fila con otra.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Usa dos alias, por ejemplo `rev` y `orig`, y únelos con la condición `orig.id = rev.reversal_of`. El filtro `kind = 'card_payment'` se aplica sobre el pago original y no sobre el reverso. Para las horas, resta las dos columnas `created_at` y convierte el intervalo con `extract(epoch FROM ...) / 3600`.",
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
          "Unir con la condición `rev.id = orig.reversal_of`: la relación apunta en el sentido contrario y el resultado queda vacío.",
      },
      {
        category: "missing_filter",
        description_md:
          "Aplicar la condición `kind = 'card_payment'` al alias del reverso: todos los reversos tienen `kind` igual a `'reversal'`, así que no vuelve ninguna fila.",
      },
      {
        category: "cell_values",
        description_md:
          "Restar las marcas de tiempo al revés, escribiendo `orig.created_at - rev.created_at`: las horas salen con signo negativo.",
      },
      {
        category: "date_boundary",
        description_md:
          "Usar `date_part('hour', ...)` sobre el intervalo: devuelve solamente la parte de horas y pierde los días completos.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 120 filas, que son los reversos cuyo pago original se hizo con tarjeta. El `INNER JOIN` alcanza como filtro implícito, porque solo los reversos tienen la columna `reversal_of` con valor y la igualdad nunca se cumple para los demás movimientos.\n\nCada alias se filtra por separado: `orig.kind` describe el pago devuelto y las columnas del alias `rev` describen la devolución. Esa independencia es justamente lo que hace útil a la autounión.\n\nRestar dos valores de tipo `timestamptz` produce un `interval`; la expresión `extract(epoch FROM intervalo)` lo pasa a segundos y la división lo lleva a horas. En este dataset las demoras son múltiplos exactos de una hora, así que la conversión a entero no pierde información; con datos reales conviene decidir de forma explícita si redondeas con `round` o truncas con `trunc`.\n\nUna alternativa equivalente es empezar por el alias `orig` e invertir la condición del `ON`: el plan de ejecución es el mismo y solo cambia la lectura.",
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
      "El departamento de Calidad de Catálogo sospecha que algunos vendedores publican el mismo artículo dos veces para ocupar más lugar en los resultados de búsqueda. La señal acordada con el negocio es encontrar dos productos del mismo vendedor, en la misma categoría y con precios casi iguales. Te piden esa lista de pares sospechosos para revisarla a mano.",
    business_question_md:
      "Debes generar un dataset que devuelva los pares de productos que comparten el mismo `seller_id` y la misma `category_id` y cuya diferencia de precio no supera el 5 % del menor de los dos precios. Las columnas son el `seller_id`, los dos identificadores bajo los encabezados `producto_a` y `producto_b`, con `producto_a` siempre menor que `producto_b`, y los dos precios bajo los encabezados `precio_a` y `precio_b`. Cada par debe aparecer **una sola vez**. Ordena por `seller_id`, después por `producto_a` y después por `producto_b`.",
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
          "Compara la tabla de productos consigo misma. Piensa qué condición evita que una fila se empareje con ella misma y que cada pareja aparezca dos veces, una en cada orden.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Une la tabla `products` con ella misma por las columnas `seller_id` y `category_id`, y agrega una desigualdad entre los identificadores para quedarte con una sola versión de cada par. Para expresar «precios casi iguales» usa la función `abs()` sobre la resta y compárala con el 5 % del menor de los dos precios, que obtienes con la función `least`.",
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
          "Omitir la desigualdad entre los identificadores: cada par aparece dos veces, una en cada orden, y además cada producto se empareja consigo mismo.",
      },
      {
        category: "join_condition",
        description_md:
          "Usar la condición `b.id <> a.id`: elimina el emparejamiento de una fila consigo misma, pero deja los pares espejados, así que el conteo queda al doble.",
      },
      {
        category: "cell_values",
        description_md:
          "Comparar la diferencia contra el 5 % de `a.list_price` en lugar del menor de los dos precios: el resultado cambia según cuál producto quedó del lado `a`.",
      },
      {
        category: "missing_filter",
        description_md:
          "Olvidar la columna `category_id` en la condición del cruce y traer pares del mismo vendedor que pertenecen a categorías distintas.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 19 pares. La clave está en la condición `b.id > a.id`: con ella una fila nunca se une consigo misma, porque ningún identificador es mayor que sí mismo, y de cada par espejado sobrevive solamente la versión ordenada, lo que además garantiza que `producto_a` sea menor que `producto_b` sin trabajo extra.\n\nLa condición `abs(a.list_price - b.list_price) <= 0.05 * least(a.list_price, b.list_price)` hace que la comparación sea simétrica: usar `a.list_price` como referencia daría resultados distintos según cuál producto ocupó cada lado del cruce.\n\nCon un `INNER JOIN` da lo mismo poner la condición de precio dentro del `ON` o dentro del `WHERE`, como se ve en la solución alternativa; con un `LEFT JOIN` las dos formas no serían equivalentes.\n\nAntes de agregar columnas a una autounión de comparación, ejecuta un `count(*)`: sin condiciones suficientes, 1500 productos producirían más de dos millones de filas.",
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
      "El departamento de Riesgo de **Bolsillo** quiere una lista corta de comercios para revisar: aquellos que acumulan tres o más pagos reversados, con el tiempo promedio que tardó la devolución. Te piden ese resumen para priorizar las auditorías del mes.",
    business_question_md:
      "Debes generar un dataset que devuelva el nombre del comercio bajo el encabezado `merchant_name`, su `category`, la cantidad de pagos reversados de ese comercio bajo el encabezado `reversos` y el promedio de horas entre la creación del pago original y la del reverso, redondeado a un decimal, bajo el encabezado `horas_promedio`. Debes incluir solamente los comercios con 3 o más reversos. Ordena por `reversos` descendente y, si dos comercios empatan, debes desempatar usando `merchant_name` ascendente.",
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
          "Primero empareja cada reverso con su pago original, tal como hiciste en el ejercicio anterior; recién después agrega los datos del comercio y agrupa. El comercio se conoce a través del pago original.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Necesitas tres cruces: la tabla `transactions` consigo misma por la columna `reversal_of`, y después la tabla `merchants` por la columna `merchant_id` del pago original. Agrupa por el comercio, cuenta las filas y filtra ese conteo con la cláusula `HAVING`. El promedio de horas se calcula sobre la misma resta de `created_at` del ejercicio anterior.",
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
          "Tomar el comercio desde el reverso, con `rev.merchant_id`, sin verificarlo: el criterio del reporte es el comercio donde ocurrió el pago original.",
      },
      {
        category: "aggregation_level",
        description_md:
          "Filtrar el conteo en la cláusula `WHERE` en lugar de la cláusula `HAVING`: el `WHERE` se evalúa antes de agrupar y no puede usar la función `count(*)`.",
      },
      {
        category: "duplicates",
        description_md:
          "Agrupar solamente por `m.name` cuando dos comercios distintos pueden compartir el mismo nombre; agrupar también por `m.id` mantiene una fila por comercio real.",
      },
      {
        category: "cell_values",
        description_md:
          "Sumar la columna `amount` en lugar de contar las filas: Bolsillo tiene cuentas en varias monedas y una suma mezclada no significa nada.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 24 comercios. La consulta encadena tres cruces: la autounión empareja el reverso con el pago original, y el tercer cruce trae los datos del comercio a partir de `orig.merchant_id`.\n\nLas expresiones `count(*)` y `count(rev.id)` dan lo mismo en este caso, porque el `INNER JOIN` garantiza que ninguna fila del grupo tiene el reverso en `NULL`; con un `LEFT JOIN` habría que contar la columna y no las filas.\n\nLa cláusula `HAVING` filtra después de agrupar, así que puede usar el resultado de `count(*)`; la cláusula `WHERE` no puede. Agrupar por `m.id` además de por `m.name` es una costumbre defensiva: protege contra nombres repetidos y sigue siendo válido porque `m.id` es la clave primaria.\n\nEl promedio se calcula sobre horas ya convertidas. Promediar intervalos también funciona en PostgreSQL, porque la función `avg` acepta valores de tipo `interval`, pero devuelve un intervalo que es más difícil de ordenar y de comparar en un tablero.",
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
