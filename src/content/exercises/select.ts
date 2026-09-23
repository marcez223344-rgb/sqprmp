import {
  defaultHintMeta,
  defaultReward,
  defaultSolutionUnlock,
  type ExerciseDef,
} from "../schemas/exercise";

const section = "select";
const dataset = { slug: "tiendaviva", version: 1 };

export const exercises: ExerciseDef[] = [
  {
    slug: "catalogo-de-categorias",
    section,
    title: "El catálogo de categorías",
    difficulty: "very_easy",
    estimated_minutes: 3,
    concepts: ["select"],
    dataset,
    tables_used: ["categories"],
    scenario_md:
      "El departamento de Catálogo de **TiendaViva** quiere revisar cómo están organizadas las categorías de productos, que tienen dos niveles: las categorías raíz y las subcategorías que cuelgan de ellas. Te piden ese listado completo para poder revisarlo en una reunión.",
    business_question_md:
      "Debes generar un dataset que devuelva el `id`, el `name` y el `parent_id` de **todas** las categorías de la tabla `categories`. El orden de las filas no importa.",
    learning_objective: "Escribir una consulta SELECT básica con columnas explícitas.",
    theory_ref: "select-columnas",
    expected_columns: [
      { name: "id", type: "integer" },
      { name: "name", type: "text" },
      { name: "parent_id", type: "integer" },
    ],
    validation_rules: {},
    reference_solution: "SELECT id, name, parent_id\nFROM categories;",
    hints: [
      {
        level: 1,
        body_md:
          "Esta es la forma más simple de consulta que existe: elegir algunas columnas de una tabla, sin ningún filtro.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "La tabla que debes consultar es `categories`. Escribe las tres columnas después de `SELECT`, separadas por comas, y cierra la consulta con `FROM categories`.",
        ...defaultHintMeta(2),
      },
      { level: 3, body_md: "```sql\nSELECT ___, ___, ___\nFROM ___;\n```", ...defaultHintMeta(3) },
    ],
    common_mistakes: [
      {
        category: "wrong_columns",
        description_md:
          "Escribir `SELECT *`: en esta tabla devuelve las mismas tres columnas, pero la consigna pide nombrarlas una por una; en tablas más anchas devolvería columnas de más.",
      },
      {
        category: "syntax",
        description_md:
          "Dejar una coma después de la última columna, como en `parent_id, FROM`: PostgreSQL devuelve un error de sintaxis.",
      },
      {
        category: "wrong_columns",
        description_md:
          "Escribir `parent` en lugar de `parent_id`: el nombre de la columna debe coincidir exactamente con el del esquema.",
      },
    ],
    expert_explanation_md:
      "La sentencia `SELECT id, name, parent_id FROM categories` devuelve las 30 categorías de la tabla. Las seis que tienen `parent_id` en `NULL` son las categorías raíz, como Tecnología u Hogar; el resto apunta con ese valor a su categoría padre.\n\nFíjate en cómo se muestra el valor `NULL` en el resultado: no es un cero ni un texto vacío, significa «desconocido o no aplica». Lo vas a estudiar a fondo en la sección 8.",
    reward: defaultReward("very_easy"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "vendedores-basico",
    section,
    title: "Lista de vendedores",
    difficulty: "very_easy",
    estimated_minutes: 3,
    concepts: ["select"],
    dataset,
    tables_used: ["sellers"],
    scenario_md:
      "El departamento Comercial está preparando una campaña y necesita una lista simple de las tiendas del marketplace con su país y su calificación. Te piden esos datos para decidir a qué tiendas invitar.",
    business_question_md:
      "Debes generar un dataset que devuelva el `store_name`, el `country` y el `rating` de todos los vendedores de la tabla `sellers`. El orden de las filas no importa.",
    learning_objective:
      "Seleccionar columnas de una tabla y reconocer valores NULL en el resultado.",
    theory_ref: "select-columnas",
    expected_columns: [
      { name: "store_name", type: "text" },
      { name: "country", type: "text" },
      { name: "rating", type: "numeric" },
    ],
    validation_rules: {},
    reference_solution: "SELECT store_name, country, rating\nFROM sellers;",
    hints: [
      {
        level: 1,
        body_md:
          "La estructura es la misma que la del ejercicio anterior: columnas concretas tomadas de una sola tabla.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "La tabla se llama `sellers`, que en español son los vendedores. Las columnas pedidas son exactamente `store_name`, `country` y `rating`.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md: "```sql\nSELECT store_name, ___, ___\nFROM ___;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "wrong_columns",
        description_md:
          "Consultar la tabla `customers`, que guarda los clientes, en lugar de la tabla `sellers`, que guarda los vendedores.",
      },
      {
        category: "wrong_columns",
        description_md:
          "Pedir la columna `name` en vez de `store_name`: los nombres los define el esquema de la tabla.",
      },
      {
        category: "null_handling",
        description_md:
          "Sorprenderse al ver valores `NULL` en la columna `rating`: son vendedores que todavía no recibieron ninguna reseña, no un error de los datos.",
      },
    ],
    expert_explanation_md:
      "La consulta es una lectura directa de la tabla `sellers`. Observa que alrededor del 15 % de los vendedores tiene `rating` en `NULL`, porque todavía no recibieron reseñas. Un reporte serio debería explicar ese `NULL`, o reemplazarlo con la función `COALESCE`, que vas a ver más adelante, en lugar de mostrarlo como si fuera un cero.",
    reward: defaultReward("very_easy"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "columnas-en-orden",
    section,
    title: "Columnas en el orden que pide el negocio",
    difficulty: "easy",
    estimated_minutes: 4,
    concepts: ["select"],
    dataset,
    tables_used: ["sellers"],
    scenario_md:
      "El departamento de Operaciones va a pegar tu resultado en una plantilla que espera las columnas en un orden fijo: primero el país, después el nombre de la tienda y por último si la tienda está verificada. Te piden el dataset ya en ese orden para no tener que reacomodarlo a mano.",
    business_question_md:
      "Debes generar un dataset que devuelva, **en este orden de columnas**, el `country`, el `store_name` y el `is_verified` de todos los vendedores de la tabla `sellers`.",
    learning_objective:
      "Controlar el orden de las columnas del resultado desde la lista de SELECT.",
    theory_ref: "select-columnas",
    expected_columns: [
      { name: "country", type: "text" },
      { name: "store_name", type: "text" },
      { name: "is_verified", type: "boolean" },
    ],
    validation_rules: {},
    reference_solution: "SELECT country, store_name, is_verified\nFROM sellers;",
    hints: [
      {
        level: 1,
        body_md:
          "El orden de las columnas en el resultado es exactamente el orden en que las escribes después de `SELECT`.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Escribe primero `country`, después `store_name` y al final `is_verified`, las tres tomadas de la tabla `sellers`.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md: "```sql\nSELECT ___, store_name, ___\nFROM sellers;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "wrong_column_order",
        description_md:
          "Escribir las columnas en el orden en que aparecen en la tabla, como `store_name, country, ...`, en lugar del orden que pidió Operaciones.",
      },
      {
        category: "wrong_columns",
        description_md:
          "Escribir `SELECT *`: la consulta devuelve columnas de más y en el orden físico de la tabla, que no es el pedido.",
      },
      {
        category: "wrong_columns",
        description_md:
          "Olvidar la columna `is_verified`, que es la tercera columna que espera la plantilla.",
      },
    ],
    expert_explanation_md:
      "La lista que escribes después de `SELECT` define qué columnas devuelve la consulta **y en qué orden**. Eso importa cuando otro sistema consume el resultado por posición: plantillas, cargas masivas o una hoja de cálculo con fórmulas fijas.\n\nUsar `SELECT *` te haría depender del orden físico de la tabla, que puede cambiar el día en que alguien agregue una columna nueva.",
    reward: defaultReward("easy"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "explorar-productos",
    section,
    title: "Explorar el catálogo de productos",
    difficulty: "easy",
    estimated_minutes: 4,
    concepts: ["select", "order_by", "limit"],
    dataset,
    tables_used: ["products"],
    scenario_md:
      "El departamento de Operaciones está haciendo el inventario del depósito de **TiendaViva** y quiere saber de qué productos hay más unidades guardadas. Le interesan todos los productos, publicados y pausados, porque cada unidad ocupa lugar y es dinero inmovilizado sin importar si la publicación está activa. Te piden ese ranking para planificar el espacio del depósito.",
    business_question_md:
      "Debes generar un dataset que devuelva el `id`, el `name`, el `list_price`, el `currency` y el `stock` de los **20 productos con más unidades en stock**, del stock más alto al más bajo y **sin filtrar por estado de publicación**. Si dos productos tienen el mismo stock, debes desempatar usando `id` ascendente.",
    learning_objective: "Combinar SELECT con ORDER BY y LIMIT para obtener un top-N determinista.",
    theory_ref: "select-columnas",
    expected_columns: [
      { name: "id", type: "integer" },
      { name: "name", type: "text" },
      { name: "list_price", type: "numeric" },
      { name: "currency", type: "text" },
      { name: "stock", type: "integer" },
    ],
    validation_rules: { order_matters: true },
    reference_solution:
      "SELECT id, name, list_price, currency, stock\nFROM products\nORDER BY stock DESC, id ASC\nLIMIT 20;",
    alternative_solutions: [
      {
        label: "Con DESC explícito en la primera clave y el desempate implícito",
        sql: "SELECT id, name, list_price, currency, stock FROM products ORDER BY stock DESC, id LIMIT 20;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "«Los 20 productos con más stock» son las 20 primeras filas de un orden descendente por esa columna. El desempate se escribe como una segunda clave de ordenamiento.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "En la tabla `products`, ordena por `stock` en dirección descendente y agrega `id` como segunda clave; después recorta el resultado con `LIMIT 20`. Escribe las cinco columnas en el orden que pide la consigna.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT id, name, ___, ___, ___\nFROM products\nORDER BY ___ ___, id ASC\nLIMIT ___;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "wrong_order",
        description_md:
          "Escribir `LIMIT 20` sin una cláusula `ORDER BY`: la consulta devuelve 20 productos cualesquiera, porque sin orden explícito el motor entrega las filas como le resulte más conveniente.",
      },
      {
        category: "wrong_order",
        description_md:
          "Ordenar por `stock` en forma ascendente: la consulta devuelve los productos casi agotados, que es lo contrario de lo que pidió Operaciones.",
      },
      {
        category: "missing_filter",
        description_md:
          "Agregar la condición `WHERE is_active`: parece prudente, pero deja fuera 5 de los 20 productos con más stock. Las publicaciones pausadas también ocupan depósito, y por eso la consigna aclara que no se filtra por estado.",
      },
      {
        category: "row_count",
        description_md:
          "Olvidar la cláusula `LIMIT`: la consulta devuelve los 1500 productos del catálogo.",
      },
      {
        category: "wrong_columns",
        description_md:
          "Incluir las columnas `seller_id` o `category_id`, que la consigna no pidió.",
      },
    ],
    expert_explanation_md:
      "La combinación `ORDER BY stock DESC` con `LIMIT 20` es el patrón llamado top-N: ordenas todo el conjunto y te quedas con la cabeza de la lista. El stock máximo del catálogo es de 250 unidades y cuatro productos llegan a ese tope, así que sin la segunda clave de ordenamiento (`id`) el motor podría devolverlos en cualquier orden y la lista cambiaría entre una ejecución y otra.\n\nObserva que la columna `currency` varía por producto, con valores como `'ARS'`, `'MXN'`, `'COP'`, `'CLP'` y `'PEN'`. Por eso el ranking se arma por `stock`, que son unidades y se comparan entre países, y no por `list_price`. Comparar precios de monedas distintas exige convertirlos primero, y ese es tema de secciones posteriores.",
    reward: defaultReward("easy"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "reto-vendedores-antiguos",
    section,
    title: "Desafío: los vendedores más antiguos",
    difficulty: "intermediate",
    estimated_minutes: 6,
    concepts: ["select", "order_by", "limit"],
    dataset,
    tables_used: ["sellers"],
    scenario_md:
      "La dirección de **TiendaViva** quiere reconocer con un programa de fidelidad a las tiendas que llevan más tiempo en el marketplace. Te piden la lista de los vendedores con mayor antigüedad para poder invitarlos.",
    business_question_md:
      "Debes generar un dataset que devuelva el `store_name`, el `country` y el `joined_at` de los **15 vendedores más antiguos**, es decir, los de fecha de alta más temprana primero. Si dos vendedores se dieron de alta el mismo día, debes desempatar usando `id` ascendente.",
    learning_objective:
      "Ordenar por varias columnas con criterio de desempate y limitar el resultado.",
    theory_ref: "select-buenas-practicas",
    expected_columns: [
      { name: "store_name", type: "text" },
      { name: "country", type: "text" },
      { name: "joined_at", type: "date" },
    ],
    validation_rules: { order_matters: true },
    reference_solution:
      "SELECT store_name, country, joined_at\nFROM sellers\nORDER BY joined_at, id\nLIMIT 15;",
    alternative_solutions: [
      {
        label: "ASC explícito",
        sql: "SELECT store_name, country, joined_at FROM sellers ORDER BY joined_at ASC, id ASC LIMIT 15",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "«Más antiguos» significa fecha de alta más pequeña, así que el orden por esa fecha es ascendente. El desempate se escribe como un segundo criterio de ordenamiento.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "La cláusula `ORDER BY joined_at, id` ordena primero por fecha y, dentro de una misma fecha, por `id`. Después recorta con `LIMIT 15`. Puedes ordenar por `id` aunque no lo muestres entre las columnas del resultado.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT store_name, country, joined_at\nFROM sellers\nORDER BY ___, ___\nLIMIT ___;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "wrong_order",
        description_md:
          "Ordenar en forma descendente con `DESC`: eso devuelve los vendedores más nuevos, no los más antiguos.",
      },
      {
        category: "wrong_order",
        description_md:
          "Omitir el desempate por `id`: cuando varias tiendas comparten la misma fecha de alta, el orden de esas filas no está garantizado y puede cambiar entre ejecuciones.",
      },
      {
        category: "wrong_columns",
        description_md:
          "Incluir la columna `id` en el resultado: se usa para ordenar, pero la consigna no la pide como columna de salida.",
      },
    ],
    expert_explanation_md:
      "La consulta se apoya en tres decisiones.\n\n1. La cláusula `ORDER BY joined_at` pone primero las fechas más tempranas, porque el orden ascendente es el valor por omisión.\n2. El agregado de `, id` desempata de forma determinista cuando dos tiendas se dieron de alta el mismo día.\n3. La cláusula `LIMIT 15` corta la lista en los quince primeros.\n\nPuedes ordenar por columnas que no aparecen en la lista de `SELECT`. Definir siempre un desempate hace que el reporte sea reproducible, algo que vas a agradecer cuando alguien pregunte por qué cambió la lista de un día para el otro.",
    reward: defaultReward("intermediate"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
];
