import {
  defaultHintMeta,
  defaultReward,
  defaultSolutionUnlock,
  type ExerciseDef,
} from "../schemas/exercise";

const section = "where";
const dataset = { slug: "tiendaviva", version: 1 };

export const exercises: ExerciseDef[] = [
  {
    slug: "clientes-de-uruguay",
    section,
    title: "Clientes de Uruguay",
    difficulty: "very_easy",
    estimated_minutes: 3,
    concepts: ["select", "where"],
    dataset,
    tables_used: ["customers"],
    scenario_md:
      "El equipo de **TiendaViva** está por abrir un centro de distribución en Montevideo y quiere contactar a los clientes que viven en Uruguay. El departamento de Operaciones necesita ese listado para preparar la comunicación y por eso te pide que lo obtengas de la base.",
    business_question_md:
      "Debes generar un dataset que devuelva el `id`, el `full_name` y el `city` de los clientes cuyo país, guardado en la columna `country`, es exactamente el texto `'UY'`. El orden de las filas no importa.",
    learning_objective: "Filtrar filas por igualdad de texto con WHERE.",
    theory_ref: "where-filtros-basicos",
    expected_columns: [
      { name: "id", type: "integer" },
      { name: "full_name", type: "text" },
      { name: "city", type: "text" },
    ],
    validation_rules: { required_concepts: ["where"] },
    reference_solution: "SELECT id, full_name, city\nFROM customers\nWHERE country = 'UY';",
    hints: [
      {
        level: 1,
        body_md:
          "La cláusula `WHERE` va escrita después de `FROM` y contiene la condición que cada fila debe cumplir para aparecer en el resultado.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "El país es un valor de texto, así que debes compararlo con el literal `'UY'`: entre comillas simples y en mayúsculas, tal como está guardado en la tabla.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md: "```sql\nSELECT id, full_name, city\nFROM customers\nWHERE ___ = '___';\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "missing_filter",
        description_md:
          "Olvidar la cláusula `WHERE` por completo: la consulta devuelve los 3000 clientes de la tabla en lugar de los de Uruguay.",
      },
      {
        category: "syntax",
        description_md:
          "Escribir la condición como `country = UY`, sin comillas, o con comillas dobles: PostgreSQL interpreta esas formas como un nombre de columna y no como un texto.",
      },
      {
        category: "row_count",
        description_md:
          "Escribir el literal en minúsculas, como `'uy'`: la comparación de texto distingue mayúsculas de minúsculas y el resultado sale con 0 filas.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 123 clientes. La condición de país, que debe escribirse como `country = 'UY'`, se evalúa fila por fila y solo pasan al resultado las filas para las que la condición es verdadera.\n\nSi no estás seguro de cómo están escritos los valores de esa columna, primero explora los datos con la siguiente sentencia: `SELECT DISTINCT country FROM customers` (sección 5).",
    reward: defaultReward("very_easy"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "productos-agotados-activos",
    section,
    title: "Agotados pero publicados",
    difficulty: "easy",
    estimated_minutes: 5,
    concepts: ["select", "where"],
    dataset,
    tables_used: ["products"],
    scenario_md:
      "Debes tener en cuenta que ver publicado un producto que ya no tiene unidades disponibles puede generar frustración en la persona que quiere comprarlo. El departamento de Catálogo quiere avisar de esa situación a los vendedores y por eso te pide un reporte que muestre esos productos.",
    business_question_md:
      "Debes generar un dataset que devuelva el `id`, el `seller_id` y el `name` de los productos que cumplen dos condiciones a la vez: la columna `stock` vale `0` **y** la columna `is_active` está en `true`. El orden de las filas no importa.",
    learning_objective: "Combinar una condición numérica y una booleana con AND.",
    theory_ref: "where-filtros-basicos",
    expected_columns: [
      { name: "id", type: "integer" },
      { name: "seller_id", type: "integer" },
      { name: "name", type: "text" },
    ],
    validation_rules: { required_concepts: ["where"] },
    reference_solution:
      "SELECT id, seller_id, name\nFROM products\nWHERE stock = 0\n  AND is_active;",
    alternative_solutions: [
      {
        label: "Booleano explícito",
        sql: "SELECT id, seller_id, name FROM products WHERE stock = 0 AND is_active = TRUE;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Son dos condiciones que deben cumplirse al mismo tiempo en la misma fila, así que debes unirlas con el operador `AND`.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "La condición `stock = 0` es numérica, por lo que el cero se escribe sin comillas. La columna `is_active` es de tipo booleano: puedes nombrarla sola, porque ya vale `true` o `false`, o escribirla de forma explícita como `is_active = TRUE`.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT id, seller_id, name\nFROM products\nWHERE stock = ___\n  AND ___;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "row_count",
        description_md:
          "Unir las condiciones con `OR` en lugar de `AND`: el resultado trae todos los productos que están en `true` más todos los que tienen `stock` en `0`, sin exigir las dos cosas juntas.",
      },
      {
        category: "syntax",
        description_md:
          "Escribir `stock = '0'` con comillas: funciona por conversión implícita de tipos, pero los valores numéricos se escriben sin comillas y conviene acostumbrarse a eso.",
      },
      {
        category: "missing_filter",
        description_md:
          "Filtrar solo por `stock = 0` y no incluir la condición sobre `is_active`: entran también los productos que ya fueron dados de baja del catálogo.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 89 productos que están en `true` en `is_active` y no tienen stock. La columna `is_active` es booleana, así que nombrarla sola ya funciona como condición; escribir `is_active = TRUE` es opcional y solo agrega claridad para quien lea la consulta.\n\nEn un marketplace real, esta lista alimentaría una alerta automática a cada vendedor: SQL suele ser el primer paso de un proceso operativo, no el último.",
    reward: defaultReward("easy"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "tiendas-bazar",
    section,
    title: "Las tiendas «Bazar»",
    difficulty: "easy",
    estimated_minutes: 5,
    concepts: ["select", "where", "order_by"],
    dataset,
    tables_used: ["sellers"],
    scenario_md:
      "El departamento Comercial está armando un programa de fidelización para las tiendas cuyo nombre comienza con «Bazar» y necesita tu ayuda para obtener esos datos de la base.",
    business_question_md:
      "Debes generar un dataset que devuelva el `id` y el `store_name` de los comercios cuyo nombre **empieza** con el texto `Bazar`, ordenados alfabéticamente por `store_name` y, si dos tiendas se llaman igual, debes desempatar usando `id` ascendente.",
    learning_objective: "Filtrar texto por patrón con LIKE y el comodín %.",
    theory_ref: "where-texto-y-fechas",
    expected_columns: [
      { name: "id", type: "integer" },
      { name: "store_name", type: "text" },
    ],
    validation_rules: { order_matters: true, required_concepts: ["where", "order_by"] },
    reference_solution:
      "SELECT id, store_name\nFROM sellers\nWHERE store_name LIKE 'Bazar%'\nORDER BY store_name ASC, id ASC;",
    alternative_solutions: [
      {
        label: "Con ILIKE",
        sql: "SELECT id, store_name FROM sellers WHERE store_name ILIKE 'bazar%' ORDER BY store_name, id;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "La idea de «empieza con» se expresa en SQL con el operador `LIKE` y un patrón de texto que termina en el comodín `%`, que representa cualquier cantidad de caracteres.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "El patrón que necesitas es el literal `'Bazar%'`, con la B en mayúscula si usas `LIKE`. Para el orden, escribe primero `store_name` y agrega `id` como segunda clave de ordenamiento.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT id, store_name\nFROM sellers\nWHERE store_name LIKE '___%'\nORDER BY ___, ___;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "row_count",
        description_md:
          "Usar el patrón `'%Bazar%'`: en estos datos devuelve lo mismo, pero en general también incluye los nombres que llevan la palabra en el medio, que no es lo que pidió el negocio.",
      },
      {
        category: "row_count",
        description_md:
          "Escribir el patrón en minúsculas, como `LIKE 'bazar%'`: el operador `LIKE` distingue mayúsculas de minúsculas y el resultado sale con 0 filas.",
      },
      {
        category: "wrong_order",
        description_md:
          "Ordenar únicamente por `id`: el listado sale en el orden en que se dieron de alta las tiendas, y quien busque un nombre concreto en la planilla no lo va a encontrar con facilidad.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 20 tiendas, que van desde «Bazar Artesanal 49» hasta «Bazar Urbano 9» en orden alfabético. El patrón `LIKE 'Bazar%'` compara desde el inicio del texto, lo que además permite que el motor use un índice; el patrón `'%Bazar%'` lo obliga a recorrer todas las filas de la tabla.\n\nEl orden alfabético no es un detalle estético: quien reciba la planilla va a buscar las tiendas por nombre. La columna `id` queda como segunda clave de ordenamiento para que el resultado sea reproducible si algún día se repite un nombre de tienda.\n\nEl operador `ILIKE` es cómodo cuando los datos vienen con capitalización inconsistente, algo frecuente en campos que se cargan a mano.",
    reward: defaultReward("easy"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "pedidos-primera-quincena-marzo",
    section,
    title: "Primera quincena de marzo",
    difficulty: "intermediate",
    estimated_minutes: 8,
    concepts: ["select", "where", "date_functions"],
    dataset,
    tables_used: ["orders"],
    scenario_md:
      "El departamento de Finanzas está cerrando la primera quincena de marzo de 2025 y necesita todos los pedidos creados entre el 1 y el 15 de marzo inclusive, sin importar la hora del día. La columna `created_at` es de tipo `timestamptz`, es decir, guarda fecha y hora con zona horaria. Te piden ese listado para poder conciliar los importes del período.",
    business_question_md:
      "Debes generar un dataset que devuelva el `id`, el `created_at` y el `total_amount` de los pedidos creados desde el `'2025-03-01'` hasta el `'2025-03-15'` **inclusive**, contando el día 15 completo, de las 00:00 a las 23:59. El orden de las filas no importa.",
    learning_objective:
      "Filtrar rangos de fecha sobre timestamps sin perder los registros del último día.",
    theory_ref: "where-texto-y-fechas",
    expected_columns: [
      { name: "id", type: "integer" },
      { name: "created_at", type: "timestamp" },
      { name: "total_amount", type: "numeric" },
    ],
    validation_rules: { required_concepts: ["where"] },
    reference_solution:
      "SELECT id, created_at, total_amount\nFROM orders\nWHERE created_at >= '2025-03-01'\n  AND created_at < '2025-03-16';",
    alternative_solutions: [
      {
        label: "Convertir a fecha",
        sql: "SELECT id, created_at, total_amount FROM orders WHERE created_at::date BETWEEN '2025-03-01' AND '2025-03-15';",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "La columna `created_at` incluye la hora además de la fecha. Compararla con el literal `'2025-03-15'` equivale a compararla con las 00:00 de ese día, no con el día entero.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Usa un rango semiabierto: mayor o igual que el literal `'2025-03-01'` y **menor** que el literal `'2025-03-16'`, es decir, el día siguiente al último que quieres incluir.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT id, created_at, total_amount\nFROM orders\nWHERE created_at >= '2025-03-01'\n  AND created_at < '___';\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "date_boundary",
        description_md:
          "Escribir `BETWEEN '2025-03-01' AND '2025-03-15'`: deja afuera casi todo el día 15, porque solo incluye los pedidos creados exactamente a las 00:00:00.",
      },
      {
        category: "date_boundary",
        description_md:
          "Escribir `created_at <= '2025-03-16'`: incluye de más, porque entra también el instante exacto de las 00:00 del día 16.",
      },
      {
        category: "date_boundary",
        description_md:
          "Escribir `created_at < '2025-03-15'`: excluye el día 15 completo, que el negocio pidió incluir.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 510 pedidos. Si hubieras usado `BETWEEN` hasta el literal `'2025-03-15'` obtendrías 479: los 31 pedidos del 15 de marzo con hora posterior a las 00:00 desaparecen del reporte sin que el motor devuelva ningún error.\n\nLa alternativa `created_at::date BETWEEN ...` es correcta y se lee bien, pero al aplicar una conversión de tipo sobre la columna el índice de `created_at` deja de usarse. En tablas grandes conviene el rango semiabierto.",
    reward: defaultReward("intermediate"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
];
