import {
  defaultHintMeta,
  defaultReward,
  defaultSolutionUnlock,
  type ExerciseDef,
} from "../schemas/exercise";

const section = "ordenar-y-limitar";
const tiendaviva = { slug: "tiendaviva", version: 1 };
const pidelo = { slug: "pidelo", version: 1 };

export const exercises: ExerciseDef[] = [
  {
    slug: "ultimos-clientes-registrados",
    section,
    title: "Los últimos clientes que se registraron",
    difficulty: "very_easy",
    estimated_minutes: 4,
    concepts: ["select", "order_by", "limit"],
    dataset: tiendaviva,
    tables_used: ["customers"],
    scenario_md:
      "El departamento de Onboarding de **TiendaViva** envía cada lunes un mensaje de bienvenida manual a las cuentas más nuevas y necesita tener la lista al inicio de la semana. Te piden esa consulta para poder generarla ellos mismos cada lunes.",
    business_question_md:
      "Debes generar un dataset que devuelva los **10 clientes registrados más recientemente**, con el `id`, el `full_name`, el `country` y el `signup_at`, ordenados del más nuevo al más antiguo. Si dos clientes se registraron en el mismo instante, debes desempatar usando `id` ascendente.",
    learning_objective:
      "Ordenar de forma descendente por una fecha y recortar el resultado con LIMIT.",
    theory_ref: "order-by-varias-claves",
    expected_columns: [
      { name: "id", type: "integer" },
      { name: "full_name", type: "text" },
      { name: "country", type: "text" },
      { name: "signup_at", type: "timestamp" },
    ],
    validation_rules: { order_matters: true, required_concepts: ["order_by", "limit"] },
    reference_solution:
      "SELECT id, full_name, country, signup_at\nFROM customers\nORDER BY signup_at DESC, id ASC\nLIMIT 10;",
    alternative_solutions: [
      {
        label: "Ordenando por posición de columna",
        sql: "SELECT id, full_name, country, signup_at\nFROM customers\nORDER BY 4 DESC, 1 ASC\nLIMIT 10;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "«Más reciente primero» es un orden descendente sobre la fecha de registro, y «solo 10» es un recorte que se aplica al final, una vez que el conjunto ya está ordenado.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Ordena por `signup_at` en dirección descendente y agrega `id` como segunda clave para que el desempate sea siempre igual. Recién después recorta el resultado.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT id, full_name, country, signup_at\nFROM customers\nORDER BY ___ ___, ___ ___\n___ 10;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "wrong_order",
        description_md:
          "Usar `ASC`, o no escribir ninguna dirección, en la clave `signup_at`: el resultado son los clientes más antiguos, es decir, lo opuesto a lo que pidió el negocio.",
      },
      {
        category: "row_count",
        description_md:
          "Olvidar la cláusula `LIMIT 10`: la consulta devuelve los 3000 clientes en el orden correcto, pero no es la lista que pidió Onboarding.",
      },
      {
        category: "wrong_order",
        description_md:
          "Omitir el desempate por `id`: si dos registros comparten el mismo instante, el orden entre ellos puede cambiar de una ejecución a otra.",
      },
      {
        category: "wrong_columns",
        description_md:
          "Escribir `SELECT *`: aparecen columnas que el reporte no necesita, como `email` o `marketing_opt_in`, y en un envío manual eso es exponer datos sin motivo.",
      },
    ],
    expert_explanation_md:
      "La cláusula `ORDER BY signup_at DESC` ordena todo el conjunto y la cláusula `LIMIT 10` recorta al final: el orden de ejecución lógico es `FROM`, después `SELECT`, después `ORDER BY` y por último `LIMIT`, nunca al revés.\n\nLa segunda clave de ordenamiento, `id ASC`, parece innecesaria hasta que aparecen los empates. En este dataset la columna `signup_at` está redondeada a la hora, así que los empates son posibles: sin desempate, dos ejecuciones podrían devolver conjuntos distintos y nadie sabría explicar por qué.\n\nTambién es válido escribir `ORDER BY 4 DESC, 1 ASC`, usando la posición de la columna, pero esa forma se rompe en silencio si alguien agrega una columna al `SELECT`. Es preferible nombrar la columna o su alias.",
    improvement_feedback: [
      { condition: "uses_select_star", message_key: "improve.uses_select_star" },
    ],
    reward: defaultReward("very_easy"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "catalogo-por-vendedor-y-precio",
    section,
    title: "Catálogo argentino por vendedor",
    difficulty: "easy",
    estimated_minutes: 7,
    concepts: ["select", "where", "order_by", "limit"],
    dataset: tiendaviva,
    tables_used: ["products"],
    scenario_md:
      "El departamento de Catálogo está auditando las publicaciones activas en pesos argentinos. Quiere recorrerlas vendedor por vendedor, empezando por los artículos más caros de cada tienda, y arranca la revisión con las primeras 20 filas. Te piden ese listado ordenado para poder trabajarlo de arriba hacia abajo.",
    business_question_md:
      "Debes generar un dataset que devuelva el `id`, el `seller_id`, el `name` y el `list_price` de los productos que tengan la columna `is_active` en `true` y cuyo `currency` sea igual al texto `'ARS'`, ordenados por `seller_id` de menor a mayor y, dentro de cada vendedor, del precio más alto al más bajo. Si dos productos del mismo vendedor tienen el mismo precio, debes desempatar usando `id` ascendente, y el resultado debe traer solo las primeras **20** filas.",
    learning_objective:
      "Combinar varias claves de ordenamiento con direcciones distintas y recortar el resultado.",
    theory_ref: "order-by-varias-claves",
    expected_columns: [
      { name: "id", type: "integer" },
      { name: "seller_id", type: "integer" },
      { name: "name", type: "text" },
      { name: "list_price", type: "numeric" },
    ],
    validation_rules: { order_matters: true, required_concepts: ["order_by", "limit", "where"] },
    reference_solution:
      "SELECT id, seller_id, name, list_price\nFROM products\nWHERE currency = 'ARS'\n  AND is_active\nORDER BY seller_id ASC, list_price DESC, id ASC\nLIMIT 20;",
    alternative_solutions: [
      {
        label: "Con la sintaxis estándar FETCH FIRST",
        sql: "SELECT id, seller_id, name, list_price\nFROM products\nWHERE currency = 'ARS'\n  AND is_active = true\nORDER BY seller_id, list_price DESC, id\nFETCH FIRST 20 ROWS ONLY;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "La cláusula `ORDER BY` acepta varias claves separadas por coma y las evalúa de izquierda a derecha; cada clave lleva su propia dirección.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Primero filtra por la columna `currency` y por la columna booleana `is_active`, que debe estar en `true`. Después ordena con tres claves en este orden: vendedor, precio e identificador. Solo una de las tres es descendente.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT id, seller_id, name, list_price\nFROM products\nWHERE ___ = 'ARS'\n  AND ___\nORDER BY ___, ___ ___, ___\nLIMIT ___;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "wrong_order",
        description_md:
          "Escribir `ORDER BY seller_id, list_price` sin `DESC`: dentro de cada vendedor aparecen primero los productos más baratos.",
      },
      {
        category: "wrong_order",
        description_md:
          "Aplicar `DESC` a las dos primeras claves, como en `ORDER BY seller_id DESC, list_price DESC`: la dirección se define clave por clave, no para toda la cláusula.",
      },
      {
        category: "missing_filter",
        description_md:
          "Olvidar la condición sobre `is_active` o el filtro de moneda: entran publicaciones pausadas y precios de otros países, que no son comparables entre sí.",
      },
      {
        category: "row_count",
        description_md:
          "Devolver todas las filas: la auditoría pidió arrancar con las primeras 20 del listado ya ordenado.",
      },
    ],
    expert_explanation_md:
      "Las claves de la cláusula `ORDER BY` funcionan como un desempate en cascada: `seller_id` agrupa visualmente el catálogo tienda por tienda, `list_price DESC` responde «lo más caro primero» dentro de cada tienda, e `id` garantiza que dos productos con el mismo precio salgan siempre en el mismo orden.\n\nEl filtro por `currency` no es decorativo: los precios de TiendaViva están expresados en la moneda del vendedor, y comparar pesos argentinos con pesos chilenos o colombianos produce rankings sin sentido. Antes de ordenar importes, asegúrate de que sean comparables.\n\nLas formas `LIMIT 20` y `FETCH FIRST 20 ROWS ONLY` son equivalentes; la segunda es la del estándar SQL y la vas a encontrar en Oracle y DB2.",
    improvement_feedback: [
      { condition: "uses_select_star", message_key: "improve.uses_select_star" },
    ],
    reward: defaultReward("easy"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "top-pedidos-mexico-por-neto",
    section,
    title: "Top 10 de pedidos entregados en México",
    difficulty: "easy",
    estimated_minutes: 8,
    concepts: ["select", "where", "alias", "order_by", "limit"],
    dataset: tiendaviva,
    tables_used: ["orders"],
    scenario_md:
      "El departamento de Finanzas está analizando los tickets más altos de México. Le interesa el importe **sin el costo de envío**, porque ese costo se le paga al transportista y no forma parte del ingreso por mercadería. Te piden ese ranking para entender qué tan concentradas están las ventas grandes.",
    business_question_md:
      "Debes generar un dataset que devuelva los **10 pedidos de mayor importe neto** entre los pedidos cuyo `currency` es igual al texto `'MXN'` y cuyo `status` es igual al texto `'delivered'`. El importe neto se calcula como `total_amount - shipping_fee` y debe salir bajo el encabezado `net_amount`. Devuelve el `id`, el `customer_id` y el `net_amount`, ordenados de mayor a menor, y si dos pedidos empatan debes desempatar usando `id` ascendente.",
    learning_objective:
      "Ordenar por una expresión calculada usando su alias y obtener un top-N con LIMIT.",
    theory_ref: "order-by-varias-claves",
    expected_columns: [
      { name: "id", type: "integer" },
      { name: "customer_id", type: "integer" },
      { name: "net_amount", type: "numeric" },
    ],
    validation_rules: {
      order_matters: true,
      required_concepts: ["order_by", "limit", "alias", "where"],
    },
    reference_solution:
      "SELECT id, customer_id, total_amount - shipping_fee AS net_amount\nFROM orders\nWHERE currency = 'MXN'\n  AND status = 'delivered'\nORDER BY net_amount DESC, id ASC\nLIMIT 10;",
    alternative_solutions: [
      {
        label: "Repitiendo la expresión en el ORDER BY",
        sql: "SELECT id, customer_id, total_amount - shipping_fee AS net_amount\nFROM orders\nWHERE currency = 'MXN'\n  AND status = 'delivered'\nORDER BY total_amount - shipping_fee DESC, id ASC\nLIMIT 10;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Un ranking de los primeros N tiene tres piezas: el filtro del negocio, el orden correcto y el recorte final. Además, aquí la columna por la que se ordena no existe en la tabla: tienes que calcularla tú.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Define la resta en la lista de `SELECT` y ponle un alias. Como la cláusula `ORDER BY` se evalúa después del `SELECT`, puedes ordenar por ese alias; en la cláusula `WHERE` no podrías, porque allí habría que repetir la expresión completa.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT id, customer_id, ___ - ___ AS net_amount\nFROM orders\nWHERE ___ = 'MXN'\n  AND ___ = 'delivered'\nORDER BY ___ ___, id ASC\nLIMIT ___;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "wrong_columns",
        description_md:
          "Ordenar por `total_amount` en lugar de por el importe neto: el ranking cambia en cuanto dos pedidos tienen costos de envío distintos.",
      },
      {
        category: "missing_filter",
        description_md:
          "No filtrar por moneda: los importes en pesos colombianos o chilenos tienen otra escala nominal y coparían todo el ranking.",
      },
      {
        category: "missing_filter",
        description_md:
          "Olvidar la condición `status = 'delivered'`: entran pedidos cancelados o pendientes, que no representan ingreso realizado.",
      },
      {
        category: "syntax",
        description_md:
          "Usar el alias `net_amount` dentro de la cláusula `WHERE`: ese alias todavía no existe cuando el motor evalúa el filtro.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta encabeza con el pedido 4786, con 58 612.82 pesos mexicanos. Ordenar por el alias `net_amount` funciona porque `ORDER BY` es la última cláusula del orden lógico: primero `FROM`, después `WHERE`, después `SELECT`, donde nacen los alias, después `ORDER BY` y por último `LIMIT`.\n\nRepetir la expresión completa dentro del `ORDER BY` da exactamente el mismo resultado, y es lo que tienes que hacer cuando el criterio de orden **no** aparece en la lista de `SELECT`. Con el alias el reporte se lee mejor, porque quien lo recibe ve la columna por la que está ordenado.\n\nUna advertencia de negocio: la cláusula `LIMIT 10` corta en la décima fila aunque la undécima tenga exactamente el mismo importe. Si «todos los que empatan en el décimo puesto» importa, necesitas la función `RANK()`, que vas a ver en la sección 21, y no `LIMIT`.",
    reward: defaultReward("easy"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "ranking-vendedores-con-nulos",
    section,
    title: "Ranking de vendedores sin ensuciarlo con NULL",
    difficulty: "intermediate",
    estimated_minutes: 10,
    concepts: ["select", "order_by", "limit", "null_handling"],
    dataset: tiendaviva,
    tables_used: ["sellers"],
    scenario_md:
      "El departamento de Marketing quiere destacar en la portada del sitio a los vendedores mejor calificados. En la tabla `sellers` hay 28 tiendas **sin calificación**, es decir, con la columna `rating` en `NULL`, porque todavía no recibieron ninguna reseña: no son las mejores ni las peores, simplemente no tienen dato, y no deben ocupar la portada. Te piden el ranking resolviendo ese detalle.",
    business_question_md:
      "Debes generar un dataset que devuelva los **12 vendedores con mejor `rating`**, con el `id`, el `store_name`, el `country` y el `rating`, ordenados de mayor a menor calificación. Los vendedores cuya columna `rating` está en `NULL` deben quedar **al final** del ordenamiento y no al principio. Si dos vendedores tienen la misma calificación, debes desempatar usando `store_name` ascendente.",
    learning_objective:
      "Controlar la posición de los NULL en un ordenamiento descendente con NULLS LAST.",
    theory_ref: "order-by-y-nulos",
    expected_columns: [
      { name: "id", type: "integer" },
      { name: "store_name", type: "text" },
      { name: "country", type: "text" },
      { name: "rating", type: "numeric" },
    ],
    // `null_handling` no se exige como concepto: el detector lo reconoce en IS NULL/COALESCE,
    // y la solución canónica de este ejercicio resuelve los NULL con NULLS LAST.
    validation_rules: { order_matters: true, required_concepts: ["order_by", "limit"] },
    reference_solution:
      "SELECT id, store_name, country, rating\nFROM sellers\nORDER BY rating DESC NULLS LAST, store_name ASC\nLIMIT 12;",
    alternative_solutions: [
      {
        label: "Con una expresión booleana como primera clave",
        sql: "SELECT id, store_name, country, rating\nFROM sellers\nORDER BY (rating IS NULL) ASC, rating DESC, store_name ASC\nLIMIT 12;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "En PostgreSQL, ordenar de mayor a menor coloca los valores `NULL` **antes** que cualquier otro valor. Si no indicas nada al respecto, la portada se llena de tiendas sin calificación.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Cada clave de la cláusula `ORDER BY` admite una indicación extra después de la dirección para fijar dónde van los valores `NULL`. Aplícala a la clave `rating` y deja `store_name` como segunda clave.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT id, store_name, country, rating\nFROM sellers\nORDER BY rating ___ ___ ___, store_name ASC\nLIMIT ___;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "null_handling",
        description_md:
          "Escribir solo `ORDER BY rating DESC`: las 12 filas que devuelve la consulta son vendedores **sin** calificación, porque en orden descendente los valores `NULL` van primero.",
      },
      {
        category: "null_handling",
        description_md:
          "Escribir `NULLS FIRST`: es la cláusula correcta, pero expresa la decisión opuesta a la que pidió Marketing.",
      },
      {
        category: "missing_filter",
        description_md:
          "Agregar la condición `WHERE rating IS NOT NULL`: en este caso devuelve las mismas 12 filas, pero cambia la pregunta, porque elimina a las tiendas sin dato en lugar de ordenarlas al final. Úsalo solo si el negocio pide excluirlas.",
      },
      {
        category: "wrong_order",
        description_md:
          "Omitir el desempate por `store_name`: hay vendedores con la misma calificación, por ejemplo tres con 4.96, y el orden entre ellos quedaría indefinido.",
      },
    ],
    expert_explanation_md:
      "Para ordenar, PostgreSQL trata al valor `NULL` como el más alto de todos. Por eso los `NULL` quedan últimos en orden ascendente y **primeros** en orden descendente, que es justamente la dirección de casi todos los rankings de negocio. La cláusula `NULLS LAST` lo corrige de forma explícita, clave por clave.\n\nCon la solución correcta el ranking empieza en «Mercado Urbano 129» con 4.97. Sin `NULLS LAST` verías doce tiendas con la calificación vacía: el mismo SQL, una respuesta de negocio equivocada.\n\nLa alternativa `ORDER BY (rating IS NULL) ASC, rating DESC` da el mismo resultado, porque el valor `false` ordena antes que `true`, y es portable a motores que no tienen `NULLS LAST`. Evita en cambio `COALESCE(rating, -1)`: funciona hasta el día en que aparezca un dato real fuera del rango esperado.\n\nOrdenar y filtrar son decisiones distintas. La cláusula `NULLS LAST` conserva a las tiendas sin reseñas al final del listado; la condición `WHERE rating IS NOT NULL` las borra del reporte. Elige según lo que el negocio necesite explicar.",
    reward: defaultReward("intermediate"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "pagina-tres-de-restaurantes",
    section,
    title: "Página 3 del directorio de restaurantes",
    difficulty: "intermediate",
    estimated_minutes: 9,
    concepts: ["select", "where", "order_by", "limit"],
    dataset: pidelo,
    tables_used: ["restaurants"],
    scenario_md:
      "El departamento de Producto de **Pídelo** está armando un directorio alfabético de restaurantes activos, paginado de 10 en 10. Con la versión anterior, que ordenaba por calificación, el equipo de soporte reportó que algunos locales aparecían en dos páginas distintas: había demasiados empates y el orden no era reproducible. Te piden la consulta de una página concreta para verificar que el problema quedó resuelto.",
    business_question_md:
      "Debes generar un dataset que devuelva la **página 3** del directorio, con 10 restaurantes por página, tomando únicamente los restaurantes que tienen la columna `is_active` en `true`, ordenados por `name` ascendente y desempatados por `id` ascendente. Devuelve el `id`, el `name`, el `cuisine` y el `rating`.",
    learning_objective:
      "Paginar un resultado con LIMIT y OFFSET sobre un ordenamiento determinista.",
    theory_ref: "limit-offset-y-top-n",
    expected_columns: [
      { name: "id", type: "integer" },
      { name: "name", type: "text" },
      { name: "cuisine", type: "text" },
      { name: "rating", type: "numeric" },
    ],
    validation_rules: { order_matters: true, required_concepts: ["order_by", "limit", "where"] },
    reference_solution:
      "SELECT id, name, cuisine, rating\nFROM restaurants\nWHERE is_active\nORDER BY name ASC, id ASC\nLIMIT 10 OFFSET 20;",
    alternative_solutions: [
      {
        label: "Con la sintaxis estándar OFFSET ... FETCH NEXT",
        sql: "SELECT id, name, cuisine, rating\nFROM restaurants\nWHERE is_active = true\nORDER BY name, id\nOFFSET 20 FETCH NEXT 10 ROWS ONLY;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Paginar consiste en saltar las filas de las páginas anteriores y quedarse con las siguientes. La cantidad de filas a saltar sale de una fórmula que combina el número de página con el tamaño de página.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Filtra por la columna `is_active` en `true`, ordena por `name` y después por `id`, y combina el recorte con el salto: la página 3, con páginas de 10 filas, salta las 20 primeras.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT id, name, cuisine, rating\nFROM restaurants\nWHERE ___\nORDER BY ___, ___\nLIMIT ___ OFFSET ___;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "row_count",
        description_md:
          "Escribir `OFFSET 30`: esa fórmula, que multiplica página por tamaño, salta una página entera. La correcta es `(página - 1) * tamaño`, que aquí da 20.",
      },
      {
        category: "wrong_order",
        description_md:
          "Ordenar solo por `name`: hoy los nombres no se repiten, pero basta con que se den de alta dos locales con el mismo nombre para que vuelva el problema de filas repetidas entre páginas. El desempate por `id` es la garantía.",
      },
      {
        category: "missing_filter",
        description_md:
          "Olvidar la condición sobre `is_active`: el directorio muestra locales dados de baja, que igualmente conservan sus pedidos históricos en la base.",
      },
      {
        category: "row_count",
        description_md:
          "Invertir el recorte y el salto, escribiendo `LIMIT 20 OFFSET 10`: la consulta devuelve 20 filas a partir de la undécima, que no es la tercera página.",
      },
    ],
    expert_explanation_md:
      "La fórmula del salto es `OFFSET = (página - 1) * tamaño_de_página`, así que la página 3 con páginas de 10 filas empieza en `OFFSET 20`. Esa página arranca en «Casa Ledesma 58», y en ella conviven restaurantes con la columna `rating` en `NULL`: en Pídelo cerca del 12 % de los locales no tiene calificación publicada, y eso no afecta a este ordenamiento porque estamos ordenando por nombre.\n\nEl desempate por `id` es el corazón del ejercicio. Sin un orden total, el motor puede recorrer las filas de otra forma en cada consulta, y entonces una misma fila cae en dos páginas mientras otra desaparece. Con `ORDER BY name, id` el orden es único y la paginación queda estable.\n\nUna nota de rendimiento: la cláusula `OFFSET` produce y descarta las filas saltadas, así que su costo crece con el número de página. Para listados profundos se usa la paginación por cursor, que se escribe como `WHERE (name, id) > ('Casa Ledesma 58', 58) ORDER BY name, id LIMIT 10`, aprovecha el índice y no se degrada a medida que avanzas.",
    improvement_feedback: [
      { condition: "uses_select_star", message_key: "improve.uses_select_star" },
    ],
    reward: defaultReward("intermediate"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
];
