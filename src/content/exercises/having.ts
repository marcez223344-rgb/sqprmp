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
      "Operaciones de **Pídelo** quiere abrir una línea de soporte dedicada para los restaurantes que más entregan. El criterio acordado con negocio: 60 entregas o más en la historia del dataset.",
    business_question_md:
      "Devuelve `restaurant_id` y la cantidad de pedidos con `status = 'delivered'` como `entregados`, solo para los restaurantes que alcanzan **60 o más** entregas. Ordena por `entregados` descendente y, en caso de empate, por `restaurant_id` ascendente.",
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
          "El estado del pedido se ve en una sola fila, así que ese filtro va antes de agrupar. El umbral de 60 habla del grupo completo: necesita la cláusula que se ejecuta **después** de la agregación.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Agrupa por `restaurant_id` y escribe la condición del umbral en `HAVING`, repitiendo la expresión agregada (no el alias `entregados`, que ahí todavía no existe).",
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
          "Poner `count(*) >= 60` dentro del `WHERE`: PostgreSQL responde «aggregate functions are not allowed in WHERE».",
      },
      {
        category: "syntax",
        description_md:
          "Escribir `HAVING entregados >= 60`: `HAVING` no ve los alias del `SELECT`; hay que repetir `count(*)`.",
      },
      {
        category: "missing_filter",
        description_md:
          "Olvidar `WHERE status = 'delivered'` y contar también los cancelados: entran restaurantes que no cumplen el criterio real.",
      },
      {
        category: "wrong_order",
        description_md:
          "Ordenar solo por `entregados`: hay cuatro restaurantes con 60 entregas y el orden entre ellos quedaría indefinido.",
      },
    ],
    expert_explanation_md:
      "Doce restaurantes superan el umbral, de 60 a 72 entregas. La consulta forma 400 grupos (uno por restaurante con al menos una entrega) y `HAVING` descarta 388.\n\nEl reparto de trabajo entre las dos cláusulas es la idea central: `WHERE` decide **qué filas se cuentan**, `HAVING` decide **qué grupos se muestran**. Mantener el filtro de estado en `WHERE` también es lo más rápido, porque el motor agrega menos filas.\n\nEl mismo resultado se puede obtener envolviendo la agregación en una subconsulta o CTE y filtrando afuera con `WHERE entregados >= 60`; es útil cuando la expresión agregada es larga y no quieres repetirla. `HAVING` es la forma directa y la que se espera en un reporte de una sola pasada.",
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
      "El equipo de catálogo de **TiendaViva** prepara la portada de la app y quiere destacar solo las categorías con oferta suficiente: al menos 60 productos **activos**. Las publicaciones pausadas no cuentan.",
    business_question_md:
      "Devuelve `category_id` y la cantidad de productos con `is_active` verdadero como `productos`, solo para las categorías que llegan a **60 o más**. Ordena por `productos` descendente y, en caso de empate, por `category_id` ascendente.",
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
          "Hay dos condiciones de naturaleza distinta: «la publicación está activa» se responde mirando una fila; «la categoría tiene 60 productos» exige contar todo el grupo. Cada una va en su cláusula.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "`is_active` es booleano: puedes usarlo directo en `WHERE` sin comparar contra nada. El umbral de 60 se escribe repitiendo la expresión de conteo en `HAVING`.",
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
          "Contar todos los productos y no solo los activos: aparecen categorías que no cumplen el criterio de portada.",
      },
      {
        category: "syntax",
        description_md:
          "Mover `is_active` a `HAVING`: es una columna que no está agrupada ni agregada, y PostgreSQL rechaza la consulta.",
      },
      {
        category: "aggregation_level",
        description_md:
          "Agrupar por `seller_id` o por `category_id, seller_id`: el reporte deja de ser una fila por categoría.",
      },
      {
        category: "wrong_order",
        description_md:
          "No desempatar por `category_id` cuando dos categorías tienen 68 productos.",
      },
    ],
    expert_explanation_md:
      "Diez categorías de las 24 con productos activos superan el umbral; los extremos van de 60 a 68 productos.\n\nLa consulta ilustra la división de tareas: `WHERE is_active` define el universo, `GROUP BY` arma las categorías y `HAVING` aplica la regla de portada. Cambiar el filtro de lugar no es una cuestión de estilo: si contaras también los productos pausados, varias categorías cruzarían el umbral sin tener oferta real.\n\n`count(*)` y `count(id)` dan el mismo número porque `id` es la clave primaria y nunca es NULL. La diferencia aparecería con una columna opcional: `count(rating)` cuenta solo las filas donde `rating` no es NULL.",
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
      "El equipo comercial de **TiendaViva** arma una lista de cuentas clave en México. Un cliente entra en la lista si tiene volumen **y** facturación: al menos 8 pedidos entregados y más de 200 000 MXN gastados. Solo se comparan pedidos en pesos mexicanos, para no mezclar monedas.",
    business_question_md:
      "Para los pedidos con `currency = 'MXN'` y `status = 'delivered'`, devuelve `customer_id`, la cantidad de pedidos como `pedidos` y la suma de `total_amount` como `gasto`, solo para los clientes con **8 o más** pedidos y un gasto **mayor a 200000**. Ordena por `gasto` descendente y, en caso de empate, por `customer_id` ascendente.",
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
          "Moneda y estado se leen en cada fila; volumen y facturación solo existen una vez formado el grupo. Las dos condiciones agregadas pueden convivir en la misma cláusula unidas por `AND`.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Agrupa por `customer_id`. En `HAVING` repite las expresiones completas (`count(*)` y `sum(total_amount)`): los alias `pedidos` y `gasto` no están disponibles ahí, aunque sí en el `ORDER BY`.",
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
          'Usar los alias en `HAVING` (`HAVING pedidos >= 8`): error «column "pedidos" does not exist». En `ORDER BY` sí funcionan.',
      },
      {
        category: "missing_filter",
        description_md:
          "Omitir `currency = 'MXN'`: se suman importes de seis monedas distintas y el umbral de 200 000 deja de significar algo.",
      },
      {
        category: "aggregation_level",
        description_md:
          "Aplicar el umbral de 8 pedidos sobre todos los estados en lugar de solo los entregados: entran clientes con muchos pedidos cancelados.",
      },
      {
        category: "wrong_order",
        description_md:
          "Ordenar por `pedidos` en lugar de `gasto`: la lista comercial se arma por facturación.",
      },
    ],
    expert_explanation_md:
      "Quince clientes cumplen las dos condiciones; el primero acumula más de 620 000 MXN en 69 pedidos entregados.\n\nEste ejercicio muestra que `HAVING` admite varias condiciones agregadas con `AND`, igual que `WHERE` con las de fila. También muestra una asimetría útil de recordar: los alias del `SELECT` funcionan en `ORDER BY` y en `GROUP BY`, pero no en `HAVING`, porque esa cláusula se evalúa antes de que la lista del `SELECT` se materialice.\n\nLa alternativa con CTE es igual de válida y a veces preferible: al nombrar los agregados una sola vez, el filtro se lee como el del negocio (`pedidos >= 8 AND gasto > 200000`) y la consulta escala mejor cuando hay cuatro o cinco métricas. El plan de ejecución en PostgreSQL suele ser el mismo.\n\nFiltrar por `currency` en lugar de por el país del cliente es deliberado: sumar importes de monedas distintas produce un número sin significado. Cuando el negocio necesita comparar países, se convierte a una moneda común antes de agregar.",
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
      "Prevención de fraude de **Pídelo** sospecha que algunas cuentas repiten códigos promocionales pensados para un uso ocasional. Quieren la lista de pares cliente–promoción con uso repetido para revisarlos uno por uno.",
    business_question_md:
      "Para los pedidos con `promotion_id` distinto de NULL, devuelve `promotion_id`, `customer_id` y la cantidad de pedidos de esa combinación como `usos`, solo para los pares que llegan a **3 usos o más**. Ordena por `usos` descendente, luego por `promotion_id` y luego por `customer_id`, ambos ascendentes.",
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
          "El grupo que interesa no es la promoción ni el cliente por separado, sino la combinación de ambos: una fila por par. El umbral se aplica a ese par.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Agrupa por las dos columnas separadas por coma y filtra los pedidos sin promoción en `WHERE` con `IS NOT NULL`, para que no aparezca un grupo «sin promoción».",
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
          "Agrupar solo por `promotion_id`: obtienes 6 filas de totales por promoción, no los clientes concretos a revisar.",
      },
      {
        category: "null_handling",
        description_md:
          "Omitir `WHERE promotion_id IS NOT NULL`: los pedidos sin promoción forman sus propios grupos y ensucian la lista.",
      },
      {
        category: "null_handling",
        description_md:
          "Escribir `promotion_id <> NULL`: la comparación nunca es verdadera y la consulta devuelve cero filas.",
      },
      {
        category: "wrong_order",
        description_md:
          "Ordenar solo por `usos`: casi todas las filas empatan en 3 y el resultado deja de ser reproducible.",
      },
    ],
    expert_explanation_md:
      "Salen 47 pares. El caso más llamativo es un cliente con 6 usos de la misma promoción; el resto se concentra en 3 y 4 usos.\n\nDos ideas clave. La primera: cuando agrupas por varias columnas, cada grupo es una **combinación**, y `HAVING` habla de esa combinación, no de cada columna por separado. La segunda: el filtro de NULL pertenece a `WHERE` porque se responde fila por fila; dejarlo para después obligaría a arrastrar miles de pedidos sin promoción hasta la agregación.\n\nEsta lista todavía no prueba abuso: `promotions.max_uses_per_customer` puede ser 3, 5 o NULL según el código. Para separar el abuso real del uso legítimo hay que unir con `promotions` y comparar contra ese tope, algo que harás con `INNER JOIN` en la sección 17. Entregar la lista cruda como «fraude» sería un error de análisis, no de SQL.",
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
      "Marketing de **TiendaViva** quiere una sección «Los mejor calificados». El primer intento ordenaba por promedio y lo encabezaban productos con una sola reseña de 5 estrellas. Acordaron un mínimo de 5 reseñas y un promedio de 4.4 o más.",
    business_question_md:
      "Devuelve `product_id`, la cantidad de reseñas como `resenas` y el promedio de `rating` redondeado a 2 decimales como `promedio`, solo para los productos con **5 o más** reseñas y un promedio (sin redondear) de **4.4 o más**. Ordena por `promedio` descendente, luego por `resenas` descendente y luego por `product_id` ascendente.",
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
          "Son dos umbrales sobre el mismo grupo: uno mide confiabilidad (cuántas reseñas) y otro calidad (qué promedio). Ambos hablan del grupo, así que viven en la misma cláusula.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Agrupa por `product_id`. Filtra con el promedio **sin redondear** y redondea solo en el `SELECT` con `round(..., 2)`; si redondeas antes de comparar, un 4.395 pasaría el umbral.",
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
          "Omitir el mínimo de 5 reseñas: el ranking lo encabezan productos con una única reseña de 5 estrellas.",
      },
      {
        category: "cell_values",
        description_md:
          "Devolver el promedio sin redondear: las celdas traen muchos decimales y no coinciden con lo pedido.",
      },
      {
        category: "syntax",
        description_md:
          "Escribir `HAVING promedio >= 4.4` usando el alias: `HAVING` no reconoce los alias del `SELECT`.",
      },
      {
        category: "wrong_order",
        description_md:
          "Ordenar solo por `promedio`: hay nueve productos con 4.60 y el orden entre ellos quedaría indefinido sin los criterios de desempate.",
      },
    ],
    expert_explanation_md:
      "Treinta y siete productos cumplen ambos umbrales. El primero tiene 5 reseñas y promedio 5.00; el resto baja suavemente hasta 4.40.\n\nTres decisiones merecen atención. Primera: el mínimo de muestra es parte de la definición del indicador, no un detalle técnico; sin él, «mejor calificado» significa «tuvo suerte una vez». Segunda: el umbral se compara contra `avg(rating)` sin redondear y el redondeo se aplica solo a la presentación, para que la regla de negocio no dependa del formato. Tercera: como `round` genera empates visibles (nueve productos en 4.60), el orden necesita criterios adicionales; sin ellos, dos ejecuciones podrían devolver la lista en distinto orden.\n\nEn `reviews` la columna `rating` nunca es NULL, así que `count(*)` y `count(rating)` coinciden. Cuando el puntaje es opcional, `count(rating)` es el mínimo de muestra correcto, porque `avg` también ignora los NULL: usar `count(*)` mediría reseñas escritas, no reseñas puntuadas.\n\nEn la sección 26 verás cómo agregar la posición en el ranking con `rank()` sin repetir la agregación.",
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
