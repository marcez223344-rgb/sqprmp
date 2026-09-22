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
      "El equipo de onboarding de **TiendaViva** envía cada lunes un mensaje de bienvenida manual a las cuentas más nuevas y necesita la lista al inicio de la semana.",
    business_question_md:
      "Devuelve los **10 clientes registrados más recientemente**, con `id`, `full_name`, `country` y `signup_at`, del más nuevo al más antiguo. Si dos clientes se registraron en el mismo instante, muestra primero el `id` menor.",
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
          "«Más reciente primero» es un orden descendente sobre la fecha de registro; «solo 10» es un recorte que se aplica al final.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Ordena por `signup_at` en dirección descendente y agrega `id` como segunda clave para que el desempate sea reproducible. Recién después corta el resultado.",
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
          "Usar `ASC` (o no escribir dirección) en `signup_at`: obtienes los clientes más antiguos, el resultado opuesto al pedido.",
      },
      {
        category: "row_count",
        description_md:
          "Olvidar `LIMIT 10`: la consulta devuelve los 3000 clientes en el orden correcto, pero no es lo que pidió onboarding.",
      },
      {
        category: "wrong_order",
        description_md:
          "Omitir el desempate por `id`: si dos registros comparten instante, el orden entre ellos puede cambiar de una ejecución a otra.",
      },
      {
        category: "wrong_columns",
        description_md:
          "Devolver `SELECT *`: aparecen columnas que el reporte no necesita, como `email` o `marketing_opt_in`.",
      },
    ],
    expert_explanation_md:
      "`ORDER BY signup_at DESC` ordena todo el conjunto y `LIMIT 10` recorta al final: el orden de ejecución es `FROM` → `SELECT` → `ORDER BY` → `LIMIT`, nunca al revés.\n\nLa segunda clave (`id ASC`) parece innecesaria hasta que hay empates. `signup_at` está redondeado a la hora en este dataset, así que los empates son posibles: sin desempate, dos ejecuciones podrían devolver conjuntos distintos y nadie sabría por qué.\n\nTambién es válido `ORDER BY 4 DESC, 1 ASC` (posición de columna), pero se rompe en silencio si alguien agrega una columna al `SELECT`. Prefiere nombrar la columna o su alias.",
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
      "El equipo de catálogo audita las publicaciones activas en pesos argentinos. Quiere recorrerlas vendedor por vendedor, empezando por los artículos más caros de cada tienda, y arranca la revisión con las primeras 20 filas.",
    business_question_md:
      "Devuelve `id`, `seller_id`, `name` y `list_price` de los productos **activos** con `currency = 'ARS'`, ordenados por `seller_id` de menor a mayor y, dentro de cada vendedor, del precio más alto al más bajo. Desempata por `id` ascendente y devuelve solo las primeras **20** filas.",
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
          "`ORDER BY` acepta varias claves separadas por coma y las evalúa de izquierda a derecha; cada una lleva su propia dirección.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Primero filtra por `currency` y por la bandera `is_active` en `products`. Luego ordena con tres claves en este orden: vendedor, precio y `id`. Solo una de las tres es descendente.",
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
          "Escribir `ORDER BY seller_id, list_price` sin `DESC`: dentro de cada vendedor verías primero lo más barato.",
      },
      {
        category: "wrong_order",
        description_md:
          "Aplicar `DESC` a las dos claves (`ORDER BY seller_id DESC, list_price DESC`): la dirección se define por clave, no para toda la cláusula.",
      },
      {
        category: "missing_filter",
        description_md:
          "Olvidar `is_active` o el filtro de moneda: entran publicaciones pausadas y precios de otros países que no son comparables.",
      },
      {
        category: "row_count",
        description_md:
          "Devolver todas las filas: la auditoría pidió arrancar con las primeras 20 del listado ordenado.",
      },
    ],
    expert_explanation_md:
      "Las claves de `ORDER BY` funcionan como un desempate en cascada: `seller_id` agrupa visualmente el catálogo, `list_price DESC` responde «lo más caro primero» dentro de cada tienda y `id` garantiza que dos productos con el mismo precio salgan siempre en el mismo orden.\n\nEl filtro por `currency` no es decorativo: los precios de TiendaViva están en la moneda del vendedor, y comparar ARS con CLP o COP produce rankings sin sentido. Antes de ordenar importes, asegúrate de que sean comparables.\n\n`LIMIT 20` y `FETCH FIRST 20 ROWS ONLY` son equivalentes; la segunda es la forma del estándar SQL y la verás en Oracle y DB2.",
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
      "Finanzas analiza los tickets más altos de México. Le interesa el importe **sin el costo de envío**, porque el envío se le paga al transportista y no forma parte del ingreso por mercadería.",
    business_question_md:
      "Devuelve los **10 pedidos de mayor importe neto** entre los pedidos con `currency = 'MXN'` y `status = 'delivered'`. El importe neto es `total_amount - shipping_fee` y debe llamarse `net_amount`. Muestra `id`, `customer_id` y `net_amount`, del mayor al menor, desempatando por `id` ascendente.",
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
          "Un top-N tiene tres piezas: el filtro del negocio, el orden correcto y el recorte. Además, aquí la columna que ordena no existe en la tabla: la calculas tú.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Define la resta en el `SELECT` con un alias. Como `ORDER BY` se evalúa después del `SELECT`, puedes ordenar por ese alias (en el `WHERE` no podrías: allí habría que repetir la expresión).",
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
          "Ordenar por `total_amount` en lugar del neto: el ranking cambia cuando dos pedidos tienen costos de envío distintos.",
      },
      {
        category: "missing_filter",
        description_md:
          "No filtrar la moneda: los importes en COP o CLP tienen otra escala nominal y coparían todo el top-10.",
      },
      {
        category: "missing_filter",
        description_md:
          "Olvidar `status = 'delivered'`: entrarían pedidos cancelados o pendientes, que no representan ingreso realizado.",
      },
      {
        category: "syntax",
        description_md:
          "Usar el alias `net_amount` dentro del `WHERE`: ese alias todavía no existe cuando se evalúa el filtro.",
      },
    ],
    expert_explanation_md:
      "El resultado encabeza con el pedido 4786 (58 612.82 MXN). Ordenar por el alias `net_amount` funciona porque `ORDER BY` es la última cláusula lógica: `FROM` → `WHERE` → `SELECT` (nacen los alias) → `ORDER BY` → `LIMIT`.\n\nRepetir la expresión en el `ORDER BY` da exactamente el mismo resultado y es lo que debes hacer cuando el criterio de orden **no** aparece en el `SELECT`. Con el alias el reporte se lee mejor: quien lo recibe ve la columna por la que está ordenado.\n\nUna advertencia de negocio: `LIMIT 10` corta en la décima fila aunque la undécima tenga el mismo importe. Si «todos los que empatan en el décimo puesto» importa, necesitas `RANK()` (sección 21), no `LIMIT`.",
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
      "Marketing quiere destacar en la portada a los vendedores mejor calificados. En `sellers` hay 28 tiendas **sin calificación** (`rating` NULL) porque todavía no recibieron reseñas: no son las mejores ni las peores, simplemente no tienen dato, y no deben ocupar la portada.",
    business_question_md:
      "Devuelve los **12 vendedores con mejor `rating`**, con `id`, `store_name`, `country` y `rating`, de mayor a menor. Los vendedores sin calificación deben quedar **al final** del ordenamiento (no al principio). Desempata por `store_name` ascendente.",
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
          "En PostgreSQL, ordenar de mayor a menor coloca los NULL **antes** que cualquier valor. Si no dices nada, tu portada se llena de tiendas sin calificación.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Cada clave de `ORDER BY` admite una cláusula extra después de la dirección para fijar dónde van los NULL. Aplícala a `rating` y deja `store_name` como segunda clave.",
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
          "Escribir solo `ORDER BY rating DESC`: las 12 filas devueltas son vendedores **sin** calificación, porque en `DESC` los NULL van primero.",
      },
      {
        category: "null_handling",
        description_md:
          "Usar `NULLS FIRST`: es la cláusula correcta pero la decisión opuesta a la que pidió marketing.",
      },
      {
        category: "missing_filter",
        description_md:
          "Agregar `WHERE rating IS NOT NULL`: en este caso devuelve las mismas 12 filas, pero cambia la pregunta (elimina a las tiendas sin dato en vez de ordenarlas al final). Úsalo solo si el negocio pide excluirlas.",
      },
      {
        category: "wrong_order",
        description_md:
          "Omitir el desempate por `store_name`: hay vendedores con el mismo `rating` (por ejemplo, tres con 4.96) y el orden entre ellos quedaría indefinido.",
      },
    ],
    expert_explanation_md:
      "Para ordenar, PostgreSQL trata a NULL como el valor más alto. Por eso quedan últimos en `ASC` y **primeros** en `DESC`, que es justo la dirección de casi todos los rankings. `NULLS LAST` lo corrige de forma explícita, clave por clave.\n\nCon la solución correcta el ranking empieza en «Mercado Urbano 129» con 4.97. Sin `NULLS LAST` verías doce tiendas con `rating` vacío: el mismo SQL, una respuesta de negocio equivocada.\n\nLa alternativa `ORDER BY (rating IS NULL) ASC, rating DESC` da el mismo resultado (`false` ordena antes que `true`) y es portable a motores sin `NULLS LAST`. Evita `COALESCE(rating, -1)`: funciona hasta que aparece un dato real fuera del rango esperado.\n\nOrdenar y filtrar son decisiones distintas. `NULLS LAST` conserva a las tiendas sin reseñas al final del listado; `WHERE rating IS NOT NULL` las borra del reporte. Elige según lo que el negocio necesite explicar.",
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
      "El equipo de producto de **Pídelo** arma un directorio alfabético de restaurantes activos, paginado de 10 en 10. Con la versión anterior, que ordenaba por calificación, soporte reportó que algunos locales aparecían en dos páginas distintas: había demasiados empates y el orden no era reproducible.",
    business_question_md:
      "Devuelve la **página 3** (10 restaurantes por página) del directorio de restaurantes **activos**, ordenado por `name` ascendente y desempatado por `id` ascendente. Muestra `id`, `name`, `cuisine` y `rating`.",
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
          "Paginar es saltar las filas de las páginas anteriores y quedarse con las siguientes. La cantidad a saltar sale de una fórmula con el número de página y el tamaño de página.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Filtra por `is_active`, ordena por `name` y luego por `id`, y combina el recorte con el salto: la página 3 con páginas de 10 filas salta las 20 primeras.",
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
          "Usar `OFFSET 30`: esa fórmula (`página * tamaño`) salta una página entera. La correcta es `(página - 1) * tamaño = 20`.",
      },
      {
        category: "wrong_order",
        description_md:
          "Ordenar solo por `name`: hoy los nombres no se repiten, pero basta que se den de alta dos locales con el mismo nombre para que vuelva el bug de filas repetidas entre páginas. El desempate por `id` es la garantía.",
      },
      {
        category: "missing_filter",
        description_md:
          "Olvidar `is_active`: el directorio mostraría locales dados de baja que igualmente conservan pedidos históricos.",
      },
      {
        category: "row_count",
        description_md:
          "Invertir el recorte (`LIMIT 20 OFFSET 10`): devuelve 20 filas a partir de la undécima, no la tercera página.",
      },
    ],
    expert_explanation_md:
      "`OFFSET = (página - 1) * tamaño_de_página`, así que la página 3 con páginas de 10 empieza en `OFFSET 20`. La página arranca en «Casa Ledesma 58» y en ella conviven restaurantes con `rating` NULL: en Pídelo cerca del 12 % no tiene calificación publicada, y eso no afecta a este orden porque ordenamos por nombre.\n\nEl desempate por `id` es el corazón del ejercicio. Sin un orden total, el motor puede recorrer las filas de otra forma en cada consulta y una misma fila cae en dos páginas mientras otra desaparece. Con `ORDER BY name, id` el orden es único y la paginación, estable.\n\nNota de rendimiento: `OFFSET` produce y descarta las filas saltadas, así que su costo crece con el número de página. Para listados profundos se usa paginación por cursor (`WHERE (name, id) > ('Casa Ledesma 58', 58) ORDER BY name, id LIMIT 10`), que aprovecha el índice y no degrada.",
    improvement_feedback: [
      { condition: "uses_select_star", message_key: "improve.uses_select_star" },
    ],
    reward: defaultReward("intermediate"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
];
