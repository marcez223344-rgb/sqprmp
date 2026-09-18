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
      "El equipo de catálogo de **TiendaViva** quiere revisar cómo están organizadas las categorías de productos (tienen dos niveles: categorías raíz y subcategorías).",
    business_question_md:
      "Muestra `id`, `name` y `parent_id` de **todas** las categorías. El orden de las filas no importa.",
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
        body_md: "Es la forma más simple de consulta: elegir columnas de una tabla, sin filtros.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "La tabla es `categories`. Lista las tres columnas después de `SELECT`, separadas por comas, y cierra con `FROM categories`.",
        ...defaultHintMeta(2),
      },
      { level: 3, body_md: "```sql\nSELECT ___, ___, ___\nFROM ___;\n```", ...defaultHintMeta(3) },
    ],
    common_mistakes: [
      {
        category: "wrong_columns",
        description_md:
          "Escribir `SELECT *`: devuelve las mismas tres columnas aquí, pero la consigna pide nombrarlas; en tablas más anchas devolvería de más.",
      },
      {
        category: "syntax",
        description_md:
          "Dejar una coma después de la última columna (`parent_id, FROM`) produce un error de sintaxis.",
      },
      {
        category: "wrong_columns",
        description_md:
          "Escribir `parent` en lugar de `parent_id`: el nombre debe coincidir con el esquema.",
      },
    ],
    expert_explanation_md:
      "`SELECT id, name, parent_id FROM categories` devuelve las 30 categorías. Las seis con `parent_id` **NULL** son las raíces (Tecnología, Hogar, …); el resto apunta a su categoría padre.\n\nFíjate en cómo se muestra NULL en el resultado: no es cero ni texto vacío, es «desconocido/no aplica». Lo estudiarás a fondo en la sección 8.",
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
      "El área comercial prepara una campaña y necesita una lista simple de las tiendas del marketplace con su país y su calificación.",
    business_question_md:
      "Muestra `store_name`, `country` y `rating` de todos los vendedores. El orden no importa.",
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
          "Misma estructura que el ejercicio anterior: columnas concretas de una sola tabla.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "La tabla se llama `sellers` (vendedores). Las columnas pedidas son exactamente `store_name`, `country` y `rating`.",
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
        description_md: "Consultar `customers` (clientes) en lugar de `sellers` (vendedores).",
      },
      {
        category: "wrong_columns",
        description_md: "Pedir `name` en vez de `store_name`; el esquema manda.",
      },
      {
        category: "null_handling",
        description_md:
          "Sorprenderse por los `rating` en NULL: son vendedores sin reseñas todavía, no un error.",
      },
    ],
    expert_explanation_md:
      "Consulta directa sobre `sellers`. Observa que unos 15 % de los vendedores tienen `rating` NULL: todavía no recibieron reseñas. Un reporte serio debería explicar ese NULL (o reemplazarlo con `COALESCE`, que verás más adelante) en lugar de mostrarlo como si fuera un cero.",
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
      "Operaciones va a pegar tu resultado en una plantilla que espera las columnas en un orden fijo: primero el país, luego el nombre de la tienda y por último si está verificada.",
    business_question_md:
      "Muestra, **en este orden de columnas**, `country`, `store_name` e `is_verified` de todos los vendedores.",
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
          "El orden de las columnas en el resultado es el orden en que las escribes después de `SELECT`.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Escribe primero `country`, después `store_name` y al final `is_verified`, todas de `sellers`.",
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
          "Escribir las columnas en el orden de la tabla (`store_name, country, …`) en lugar del orden pedido.",
      },
      {
        category: "wrong_columns",
        description_md:
          "Usar `SELECT *`: devuelve columnas extra y en el orden físico de la tabla.",
      },
      { category: "wrong_columns", description_md: "Olvidar `is_verified`." },
    ],
    expert_explanation_md:
      "La lista de `SELECT` define las columnas **y su orden**. Esto importa cuando otro sistema consume el resultado por posición (plantillas, cargas masivas, hojas de cálculo). Un `SELECT *` te haría depender del orden físico de la tabla, que puede cambiar si alguien agrega columnas.",
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
      "Marketing quiere ver una muestra del catálogo para entender cómo se llaman los productos y en qué moneda están sus precios antes de diseñar una campaña regional.",
    business_question_md:
      "Muestra `id`, `name`, `list_price` y `currency` de los **20 productos con menor `id`**, ordenados por `id` ascendente.",
    learning_objective:
      "Combinar SELECT con ORDER BY y LIMIT para obtener una muestra determinista.",
    theory_ref: "select-columnas",
    expected_columns: [
      { name: "id", type: "integer" },
      { name: "name", type: "text" },
      { name: "list_price", type: "numeric" },
      { name: "currency", type: "text" },
    ],
    validation_rules: { order_matters: true },
    reference_solution:
      "SELECT id, name, list_price, currency\nFROM products\nORDER BY id\nLIMIT 20;",
    hints: [
      {
        level: 1,
        body_md: "«Los 20 con menor id» = ordenar por `id` y quedarte con las primeras 20 filas.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "En `products`: `ORDER BY id` seguido de `LIMIT 20`. Recuerda listar las cuatro columnas en el orden pedido.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md: "```sql\nSELECT id, name, ___, ___\nFROM products\nORDER BY ___\nLIMIT ___;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "wrong_order",
        description_md: "`LIMIT 20` sin `ORDER BY id` devuelve 20 productos cualesquiera.",
      },
      { category: "row_count", description_md: "Olvidar `LIMIT` devuelve los 1500 productos." },
      {
        category: "wrong_columns",
        description_md: "Incluir `stock` o `seller_id`, que no fueron pedidos.",
      },
    ],
    expert_explanation_md:
      "`ORDER BY id LIMIT 20` es el patrón canónico para una muestra reproducible: siempre devuelve las mismas 20 filas. Observa que `currency` varía por producto (ARS, MXN, COP…): un análisis de precios entre países necesitará convertir monedas, tema de secciones posteriores.",
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
      "La dirección quiere reconocer a las tiendas que llevan más tiempo en **TiendaViva** con un programa de fidelidad. Te piden la lista de los vendedores con mayor antigüedad.",
    business_question_md:
      "Muestra `store_name`, `country` y `joined_at` de los **15 vendedores más antiguos** (fecha de alta más temprana primero). En caso de empate en la fecha, ordena por `id` ascendente.",
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
          "«Más antiguos» significa fecha de alta más pequeña: orden ascendente por esa fecha. El desempate es un segundo criterio de orden.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "`ORDER BY joined_at, id` ordena primero por fecha y, dentro de la misma fecha, por `id`. Luego `LIMIT 15`. Puedes ordenar por `id` aunque no lo muestres.",
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
        description_md: "Ordenar `DESC`: eso da los más nuevos, no los más antiguos.",
      },
      {
        category: "wrong_order",
        description_md:
          "Omitir el desempate por `id`: con fechas repetidas el orden de esas filas no está garantizado.",
      },
      {
        category: "wrong_columns",
        description_md:
          "Incluir `id` en el resultado: se usa para ordenar, pero la consigna no lo pide como columna.",
      },
    ],
    expert_explanation_md:
      "1. `ORDER BY joined_at` pone primero las fechas más tempranas (ascendente es el valor por defecto).\n2. `, id` desempata de forma determinista cuando dos tiendas se dieron de alta el mismo día.\n3. `LIMIT 15` corta la lista.\n\nPuedes ordenar por columnas que no aparecen en `SELECT`. Definir siempre un desempate hace que el reporte sea reproducible, algo que agradecerás cuando alguien pregunte «¿por qué cambió la lista?».",
    reward: defaultReward("intermediate"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
];
