import {
  defaultHintMeta,
  defaultReward,
  defaultSolutionUnlock,
  type ExerciseDef,
} from "../schemas/exercise";

const section = "having";
const pidelo = { slug: "pidelo", version: 1 };
const tiendaviva = { slug: "tiendaviva", version: 1 };
const basico = "having-filtrar-grupos";
const decidir = "having-vs-where";
const patrones = "having-patrones";

export const exercises: ExerciseDef[] = [
  {
    slug: "restaurantes-de-alto-volumen",
    section,
    title: "Restaurantes de alto volumen",
    difficulty: "easy",
    estimated_minutes: 5,
    concepts: ["group_by", "having", "aggregate", "where", "order_by"],
    dataset: pidelo,
    tables_used: ["orders"],
    scenario_md:
      "El departamento de Operaciones de **Pídelo** quiere abrir una línea de soporte dedicada para los restaurantes que más entregan. El criterio acordado con el negocio es tener 60 entregas o más en toda la historia de los datos. Te piden esa lista para dar de alta las cuentas en la herramienta de soporte.",
    business_question_md:
      "Debes generar un dataset que devuelva el `restaurant_id` y la cantidad de pedidos cuyo `status` es igual al texto `'delivered'` bajo el encabezado `entregados`, tomando únicamente los restaurantes que alcanzan **60 o más** entregas. Ordena por `entregados` descendente y, si dos restaurantes empatan, debes desempatar usando `restaurant_id` ascendente.",
    learning_objective:
      "Filtrar grupos con HAVING sobre un conteo, combinándolo con un WHERE que filtra filas.",
    theory_ref: basico,
    expected_columns: [
      { name: "restaurant_id", type: "integer" },
      { name: "entregados", type: "integer" },
    ],
    validation_rules: {
      order_matters: true,
      required_concepts: ["group_by", "having", "aggregate"],
    },
    reference_solution:
      "SELECT restaurant_id, count(*) AS entregados\nFROM orders\nWHERE status = 'delivered'\nGROUP BY restaurant_id\nHAVING count(*) >= 60\nORDER BY entregados DESC, restaurant_id;",
    alternative_solutions: [
      {
        label: "Umbral expresado con >",
        sql: "SELECT restaurant_id, count(*) AS entregados FROM orders WHERE status = 'delivered' GROUP BY restaurant_id HAVING count(*) > 59 ORDER BY entregados DESC, restaurant_id;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "El estado del pedido se ve mirando una sola fila, así que ese filtro va antes de agrupar. El umbral de 60 habla del grupo completo, de modo que necesita la cláusula que se ejecuta **después** de la agregación.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Agrupa por `restaurant_id` y escribe la condición del umbral en la cláusula `HAVING`, repitiendo allí la expresión agregada completa y no el alias `entregados`, que en ese punto todavía no existe.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT restaurant_id, count(*) AS entregados\nFROM orders\nWHERE status = '___'\nGROUP BY restaurant_id\nHAVING ___ ___ 60\nORDER BY entregados DESC, restaurant_id;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "syntax",
        description_md:
          "Poner la condición `count(*) >= 60` dentro de la cláusula `WHERE`: PostgreSQL responde con el error «aggregate functions are not allowed in WHERE».",
      },
      {
        category: "syntax",
        description_md:
          "Escribir `HAVING entregados >= 60`: la cláusula `HAVING` no ve los alias del `SELECT`, así que hay que repetir la expresión `count(*)`.",
      },
      {
        category: "missing_filter",
        description_md:
          "Olvidar la condición `WHERE status = 'delivered'` y contar también los pedidos cancelados: entran restaurantes que no cumplen el criterio real acordado con el negocio.",
      },
      {
        category: "wrong_order",
        description_md:
          "Ordenar solo por `entregados`: hay cuatro restaurantes con exactamente 60 entregas y el orden entre ellos quedaría indefinido.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da doce restaurantes por encima del umbral, con entre 60 y 72 entregas. La consulta forma 400 grupos, uno por restaurante con al menos una entrega, y la cláusula `HAVING` descarta 388 de ellos.\n\nEl reparto de trabajo entre las dos cláusulas es la idea central de la sección: la cláusula `WHERE` decide **qué filas se cuentan** y la cláusula `HAVING` decide **qué grupos se muestran**. Mantener el filtro de estado en el `WHERE` también es lo más rápido, porque el motor tiene que agregar menos filas.\n\nEl mismo resultado se puede obtener envolviendo la agregación en una subconsulta o en una expresión de tabla común y filtrando afuera con `WHERE entregados >= 60`; eso es útil cuando la expresión agregada es larga y no quieres repetirla. La cláusula `HAVING` es la forma directa y la que se espera en un reporte de una sola pasada.",
    improvement_feedback: [
      { condition: "uses_select_star", message_key: "improve.uses_select_star" },
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
    slug: "categorias-con-catalogo-amplio",
    section,
    title: "Categorías con catálogo amplio",
    difficulty: "easy",
    estimated_minutes: 5,
    concepts: ["group_by", "having", "aggregate", "where", "order_by"],
    dataset: tiendaviva,
    tables_used: ["products"],
    scenario_md:
      "El departamento de Catálogo de **TiendaViva** está preparando la portada de la aplicación y quiere destacar solamente las categorías con oferta suficiente: al menos 60 productos publicados, es decir, con la columna `is_active` en `true`. Las publicaciones pausadas no cuentan. Te piden esa lista para armar la portada.",
    business_question_md:
      "Debes generar un dataset que devuelva el `category_id` y la cantidad de productos que tienen la columna `is_active` en `true` bajo el encabezado `productos`, tomando únicamente las categorías que llegan a **60 o más** productos. Ordena por `productos` descendente y, si dos categorías empatan, debes desempatar usando `category_id` ascendente.",
    learning_objective:
      "Decidir qué condición va en WHERE y cuál en HAVING dentro de una misma consulta.",
    theory_ref: decidir,
    expected_columns: [
      { name: "category_id", type: "integer" },
      { name: "productos", type: "integer" },
    ],
    validation_rules: {
      order_matters: true,
      required_concepts: ["group_by", "having", "aggregate"],
    },
    reference_solution:
      "SELECT category_id, count(*) AS productos\nFROM products\nWHERE is_active\nGROUP BY category_id\nHAVING count(*) >= 60\nORDER BY productos DESC, category_id;",
    alternative_solutions: [
      {
        label: "Comparación booleana explícita y count sobre la clave",
        sql: "SELECT category_id, count(id) AS productos FROM products WHERE is_active = true GROUP BY category_id HAVING count(id) >= 60 ORDER BY productos DESC, category_id;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Hay dos condiciones de naturaleza distinta: «la publicación está activa» se responde mirando una sola fila, mientras que «la categoría tiene 60 productos» exige contar todo el grupo. Cada una va en su propia cláusula.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "La columna `is_active` es booleana: puedes usarla directamente en la cláusula `WHERE`, sin compararla contra nada, y así filtras las que están en `true`. El umbral de 60 se escribe repitiendo la expresión de conteo dentro de `HAVING`.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT category_id, count(*) AS productos\nFROM products\nWHERE ___\nGROUP BY ___\nHAVING ___\nORDER BY productos DESC, category_id;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "missing_filter",
        description_md:
          "Contar todos los productos y no solo los que están en `true`: aparecen categorías que no cumplen el criterio de portada.",
      },
      {
        category: "syntax",
        description_md:
          "Mover la condición sobre `is_active` a la cláusula `HAVING`: es una columna que no está agrupada ni agregada, y PostgreSQL rechaza la consulta.",
      },
      {
        category: "aggregation_level",
        description_md:
          "Agrupar por `seller_id`, o por `category_id` junto con `seller_id`: el reporte deja de tener una fila por categoría.",
      },
      {
        category: "wrong_order",
        description_md:
          "No desempatar por `category_id` cuando dos categorías tienen los mismos 68 productos: el orden entre ellas queda indefinido.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da diez categorías, de las 24 que tienen productos activos, por encima del umbral; los extremos van de 60 a 68 productos.\n\nLa consulta ilustra la división de tareas: la condición `WHERE is_active` define el universo de filas, la cláusula `GROUP BY` arma las categorías y la cláusula `HAVING` aplica la regla de portada. Cambiar el filtro de lugar no es una cuestión de estilo: si contaras también los productos pausados, varias categorías cruzarían el umbral sin tener oferta real para mostrar.\n\nLas expresiones `count(*)` y `count(id)` dan el mismo número, porque la columna `id` es la clave primaria y nunca está en `NULL`. La diferencia aparecería con una columna opcional: `count(rating)` cuenta solamente las filas en las que `rating` tiene valor.",
    improvement_feedback: [
      { condition: "uses_select_star", message_key: "improve.uses_select_star" },
    ],
    reward: defaultReward("easy"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "clientes-mayoristas-mexico",
    section,
    title: "Clientes mayoristas en México",
    difficulty: "intermediate",
    estimated_minutes: 8,
    concepts: ["group_by", "having", "aggregate", "where", "order_by"],
    dataset: tiendaviva,
    tables_used: ["orders"],
    scenario_md:
      "El departamento Comercial de **TiendaViva** está armando una lista de cuentas clave en México. Un cliente entra en la lista si tiene volumen **y** facturación: al menos 8 pedidos entregados y más de 200 000 pesos mexicanos gastados. Solo se comparan pedidos expresados en pesos mexicanos, para no mezclar monedas. Te piden esa lista para asignar un ejecutivo de cuenta a cada cliente.",
    business_question_md:
      "Debes generar un dataset que, tomando los pedidos cuyo `currency` es igual al texto `'MXN'` y cuyo `status` es igual al texto `'delivered'`, devuelva el `customer_id`, la cantidad de pedidos bajo el encabezado `pedidos` y la suma de `total_amount` bajo el encabezado `gasto`, tomando únicamente los clientes con **8 o más** pedidos y un gasto **mayor que 200000**. Ordena por `gasto` descendente y, si dos clientes empatan, debes desempatar usando `customer_id` ascendente.",
    learning_objective:
      "Combinar dos condiciones agregadas en un mismo HAVING junto con filtros de fila en WHERE.",
    theory_ref: decidir,
    expected_columns: [
      { name: "customer_id", type: "integer" },
      { name: "pedidos", type: "integer" },
      { name: "gasto", type: "numeric" },
    ],
    validation_rules: {
      order_matters: true,
      numeric_tolerance: 0.01,
      required_concepts: ["group_by", "aggregate"],
    },
    reference_solution:
      "SELECT customer_id, count(*) AS pedidos, sum(total_amount) AS gasto\nFROM orders\nWHERE currency = 'MXN' AND status = 'delivered'\nGROUP BY customer_id\nHAVING count(*) >= 8 AND sum(total_amount) > 200000\nORDER BY gasto DESC, customer_id;",
    alternative_solutions: [
      {
        label: "CTE y filtro con WHERE sobre los agregados",
        sql: "WITH por_cliente AS (SELECT customer_id, count(*) AS pedidos, sum(total_amount) AS gasto FROM orders WHERE currency = 'MXN' AND status = 'delivered' GROUP BY customer_id) SELECT customer_id, pedidos, gasto FROM por_cliente WHERE pedidos >= 8 AND gasto > 200000 ORDER BY gasto DESC, customer_id;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "La moneda y el estado se leen en cada fila; el volumen y la facturación solo existen una vez formado el grupo. Las dos condiciones agregadas pueden convivir en la misma cláusula, unidas con `AND`.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Agrupa por `customer_id`. Dentro de la cláusula `HAVING` repite las expresiones completas, `count(*)` y `sum(total_amount)`: los alias `pedidos` y `gasto` no están disponibles ahí, aunque sí lo están en la cláusula `ORDER BY`.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT customer_id, count(*) AS pedidos, sum(___) AS gasto\nFROM orders\nWHERE currency = '___' AND status = '___'\nGROUP BY customer_id\nHAVING ___ AND ___\nORDER BY gasto DESC, customer_id;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "syntax",
        description_md:
          'Usar los alias dentro de la cláusula `HAVING`, como en `HAVING pedidos >= 8`: PostgreSQL devuelve el error «column "pedidos" does not exist». En la cláusula `ORDER BY` los alias sí funcionan.',
      },
      {
        category: "missing_filter",
        description_md:
          "Omitir la condición `currency = 'MXN'`: se suman importes de seis monedas distintas y el umbral de 200 000 deja de significar algo.",
      },
      {
        category: "aggregation_level",
        description_md:
          "Aplicar el umbral de 8 pedidos sobre todos los estados en lugar de hacerlo solo sobre los entregados: entran clientes con muchos pedidos cancelados.",
      },
      {
        category: "wrong_order",
        description_md:
          "Ordenar por `pedidos` en lugar de por `gasto`: la lista comercial se arma por facturación, no por cantidad de pedidos.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da quince clientes que cumplen las dos condiciones; el primero acumula más de 620 000 pesos mexicanos en 69 pedidos entregados.\n\nEste ejercicio muestra que la cláusula `HAVING` admite varias condiciones agregadas unidas con `AND`, igual que la cláusula `WHERE` con las condiciones de fila. También muestra una asimetría útil de recordar: los alias del `SELECT` funcionan en `ORDER BY` y en `GROUP BY`, pero no en `HAVING`, porque esa cláusula se evalúa antes de que la lista del `SELECT` se materialice.\n\nLa alternativa con una expresión de tabla común es igual de válida y a veces preferible: al nombrar los agregados una sola vez, el filtro se lee como lo diría el negocio, con `pedidos >= 8 AND gasto > 200000`, y la consulta escala mejor cuando hay cuatro o cinco métricas. El plan de ejecución que arma PostgreSQL suele ser el mismo.\n\nFiltrar por la columna `currency` en lugar de por el país del cliente es una decisión deliberada: sumar importes de monedas distintas produce un número sin significado. Cuando el negocio necesita comparar países, primero se convierte todo a una moneda común y recién después se agrega.",
    improvement_feedback: [
      { condition: "uses_select_star", message_key: "improve.uses_select_star" },
      {
        condition: "missing_alias_on_aggregate",
        message_key: "improve.missing_alias_on_aggregate",
      },
    ],
    reward: defaultReward("intermediate"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "abuso-de-promociones-por-cliente",
    section,
    title: "Abuso de promociones por cliente",
    difficulty: "intermediate",
    estimated_minutes: 9,
    concepts: ["group_by", "having", "aggregate", "where", "null_handling", "order_by"],
    dataset: pidelo,
    tables_used: ["orders"],
    scenario_md:
      "El departamento de Prevención de Fraude de **Pídelo** sospecha que algunas cuentas repiten códigos promocionales pensados para un uso ocasional. Quieren la lista de pares formados por cliente y promoción con uso repetido, para poder revisarlos uno por uno, y te piden que la obtengas de la base.",
    business_question_md:
      "Debes generar un dataset que, tomando los pedidos cuya columna `promotion_id` no está en `NULL`, devuelva el `promotion_id`, el `customer_id` y la cantidad de pedidos de esa combinación bajo el encabezado `usos`, tomando únicamente los pares que llegan a **3 usos o más**. Ordena por `usos` descendente, después por `promotion_id` ascendente y después por `customer_id` ascendente.",
    learning_objective:
      "Aplicar HAVING sobre grupos definidos por más de una columna y excluir el grupo NULL en WHERE.",
    theory_ref: patrones,
    expected_columns: [
      { name: "promotion_id", type: "integer" },
      { name: "customer_id", type: "integer" },
      { name: "usos", type: "integer" },
    ],
    validation_rules: {
      order_matters: true,
      required_concepts: ["group_by", "having", "aggregate", "null_handling"],
    },
    reference_solution:
      "SELECT promotion_id, customer_id, count(*) AS usos\nFROM orders\nWHERE promotion_id IS NOT NULL\nGROUP BY promotion_id, customer_id\nHAVING count(*) >= 3\nORDER BY usos DESC, promotion_id, customer_id;",
    alternative_solutions: [
      {
        label: "Conteo sobre la clave primaria",
        sql: "SELECT promotion_id, customer_id, count(id) AS usos FROM orders WHERE promotion_id IS NOT NULL GROUP BY promotion_id, customer_id HAVING count(id) >= 3 ORDER BY usos DESC, promotion_id, customer_id;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "El grupo que interesa no es la promoción ni el cliente por separado, sino la combinación de los dos: una fila por par. El umbral se aplica a ese par.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Agrupa por las dos columnas separadas por coma y filtra los pedidos sin promoción en la cláusula `WHERE` con la condición `IS NOT NULL`, para que no aparezca un grupo que junte todos los pedidos sin promoción.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT promotion_id, customer_id, count(*) AS usos\nFROM orders\nWHERE promotion_id ___ ___ ___\nGROUP BY ___, ___\nHAVING ___\nORDER BY usos DESC, promotion_id, customer_id;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "aggregation_level",
        description_md:
          "Agrupar solamente por `promotion_id`: el resultado son 6 filas con totales por promoción y no los clientes concretos que hay que revisar.",
      },
      {
        category: "null_handling",
        description_md:
          "Omitir la condición `WHERE promotion_id IS NOT NULL`: los pedidos sin promoción forman sus propios grupos y ensucian la lista de revisión.",
      },
      {
        category: "null_handling",
        description_md:
          "Escribir `promotion_id <> NULL`: esa comparación nunca puede dar verdadero y la consulta devuelve cero filas.",
      },
      {
        category: "wrong_order",
        description_md:
          "Ordenar solamente por `usos`: casi todas las filas empatan en 3 y el resultado deja de ser reproducible entre ejecuciones.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 47 pares. El caso más llamativo es un cliente con 6 usos de la misma promoción; el resto se concentra en 3 y 4 usos.\n\nHay dos ideas clave. La primera: cuando agrupas por varias columnas, cada grupo es una **combinación**, y la cláusula `HAVING` habla de esa combinación y no de cada columna por separado. La segunda: el filtro de valores `NULL` pertenece a la cláusula `WHERE`, porque se responde fila por fila; dejarlo para después obligaría a arrastrar miles de pedidos sin promoción hasta la agregación.\n\nEsta lista todavía no prueba que haya abuso: la columna `promotions.max_uses_per_customer` puede valer 3, 5 o estar en `NULL` según el código promocional. Para separar el abuso real del uso legítimo hay que unir con la tabla `promotions` y comparar contra ese tope, algo que vas a hacer con `INNER JOIN` en la sección 17. Entregar la lista cruda como si fuera fraude sería un error de análisis, no de SQL.",
    improvement_feedback: [
      { condition: "uses_select_star", message_key: "improve.uses_select_star" },
    ],
    reward: defaultReward("intermediate"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "productos-mejor-calificados",
    section,
    title: "Productos mejor calificados con reseñas suficientes",
    difficulty: "intermediate",
    estimated_minutes: 10,
    concepts: ["group_by", "having", "aggregate", "numeric_functions", "order_by"],
    dataset: tiendaviva,
    tables_used: ["reviews"],
    scenario_md:
      "El departamento de Marketing de **TiendaViva** quiere armar una sección llamada «Los mejor calificados». El primer intento ordenaba por promedio y lo encabezaban productos con una sola reseña de 5 estrellas, así que acordaron un mínimo de 5 reseñas y un promedio de 4.4 o más. Te piden la lista que cumple ese criterio para publicarla en la aplicación.",
    business_question_md:
      "Debes generar un dataset que devuelva el `product_id`, la cantidad de reseñas bajo el encabezado `resenas` y el promedio de `rating` redondeado a 2 decimales bajo el encabezado `promedio`, tomando únicamente los productos con **5 o más** reseñas y un promedio, calculado sin redondear, de **4.4 o más**. Ordena por `promedio` descendente, después por `resenas` descendente y después por `product_id` ascendente.",
    learning_objective:
      "Combinar un umbral de muestra mínima y un umbral de promedio en HAVING, con un orden determinista.",
    theory_ref: patrones,
    expected_columns: [
      { name: "product_id", type: "integer" },
      { name: "resenas", type: "integer" },
      { name: "promedio", type: "numeric" },
    ],
    validation_rules: {
      order_matters: true,
      numeric_tolerance: 0.01,
      required_concepts: ["group_by", "having", "aggregate"],
    },
    reference_solution:
      "SELECT product_id, count(*) AS resenas, round(avg(rating), 2) AS promedio\nFROM reviews\nGROUP BY product_id\nHAVING count(*) >= 5 AND avg(rating) >= 4.4\nORDER BY promedio DESC, resenas DESC, product_id;",
    alternative_solutions: [
      {
        label: "Promedio calculado como suma sobre conteo",
        sql: "SELECT product_id, count(rating) AS resenas, round(sum(rating)::numeric / count(rating), 2) AS promedio FROM reviews GROUP BY product_id HAVING count(rating) >= 5 AND avg(rating) >= 4.4 ORDER BY promedio DESC, resenas DESC, product_id;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Son dos umbrales sobre el mismo grupo: uno mide confiabilidad, que es cuántas reseñas hay, y el otro mide calidad, que es qué promedio alcanzan. Los dos hablan del grupo, así que viven en la misma cláusula.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Agrupa por `product_id`. Filtra usando el promedio **sin redondear** y redondea solamente en la lista de `SELECT` con `round(..., 2)`; si redondearas antes de comparar, un promedio de 4.395 pasaría el umbral sin merecerlo.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT product_id, count(*) AS resenas, round(___, 2) AS promedio\nFROM reviews\nGROUP BY product_id\nHAVING ___ AND ___\nORDER BY promedio DESC, ___ DESC, product_id;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "missing_filter",
        description_md:
          "Omitir el mínimo de 5 reseñas: el ranking lo encabezan productos con una única reseña de 5 estrellas, que es el problema que el negocio quería resolver.",
      },
      {
        category: "cell_values",
        description_md:
          "Devolver el promedio sin redondear: las celdas traen muchos decimales y no coinciden con lo que pide la consigna.",
      },
      {
        category: "syntax",
        description_md:
          "Escribir `HAVING promedio >= 4.4` usando el alias: la cláusula `HAVING` no reconoce los alias definidos en el `SELECT`.",
      },
      {
        category: "wrong_order",
        description_md:
          "Ordenar solamente por `promedio`: hay nueve productos con 4.60 y el orden entre ellos quedaría indefinido sin los criterios de desempate.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da treinta y siete productos que cumplen los dos umbrales. El primero tiene 5 reseñas y un promedio de 5.00; el resto baja suavemente hasta 4.40.\n\nHay tres decisiones que merecen atención. La primera: el mínimo de muestra es parte de la definición del indicador y no un detalle técnico, porque sin él «mejor calificado» significa «tuvo suerte una vez». La segunda: el umbral se compara contra `avg(rating)` sin redondear y el redondeo se aplica solo a la presentación, para que la regla de negocio no dependa del formato. La tercera: como la función `round` genera empates visibles, con nueve productos en 4.60, el orden necesita criterios adicionales; sin ellos, dos ejecuciones podrían devolver la lista en distinto orden.\n\nEn la tabla `reviews` la columna `rating` nunca está en `NULL`, así que `count(*)` y `count(rating)` coinciden. Cuando el puntaje es opcional, `count(rating)` es el mínimo de muestra correcto, porque la función `avg` también ignora los valores `NULL`: usar `count(*)` mediría reseñas escritas y no reseñas puntuadas.\n\nEn la sección 26 vas a ver cómo agregar la posición en el ranking con la función `rank()` sin repetir la agregación.",
    improvement_feedback: [
      { condition: "uses_select_star", message_key: "improve.uses_select_star" },
      {
        condition: "missing_alias_on_aggregate",
        message_key: "improve.missing_alias_on_aggregate",
      },
    ],
    reward: defaultReward("intermediate"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
];
