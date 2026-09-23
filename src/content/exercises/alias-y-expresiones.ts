import {
  defaultHintMeta,
  defaultReward,
  defaultSolutionUnlock,
  type ExerciseDef,
} from "../schemas/exercise";

const section = "alias-y-expresiones";
const dataset = { slug: "tiendaviva", version: 1 };
const theory_ref = "alias-y-expresiones-basico";

export const exercises: ExerciseDef[] = [
  {
    slug: "tiendas-en-espanol",
    section,
    title: "Encabezados en español",
    difficulty: "very_easy",
    estimated_minutes: 3,
    concepts: ["select", "alias"],
    dataset,
    tables_used: ["sellers"],
    scenario_md:
      "El departamento Comercial de **TiendaViva** exporta la lista de vendedores a una planilla y necesita que los encabezados de las columnas estén en español. Te piden la consulta con esos nombres ya resueltos, para no tener que renombrar las columnas a mano cada vez.",
    business_question_md:
      "Debes generar un dataset que devuelva el `id`, el nombre de la tienda bajo el encabezado `tienda` y el país bajo el encabezado `pais`, para **todos** los vendedores de la tabla `sellers`. El orden de las filas no importa.",
    learning_objective: "Renombrar columnas con alias sin cambiar su contenido.",
    theory_ref,
    expected_columns: [
      { name: "id", type: "integer" },
      { name: "tienda", type: "text" },
      { name: "pais", type: "text" },
    ],
    validation_rules: { required_concepts: ["alias"] },
    reference_solution: "SELECT id, store_name AS tienda, country AS pais\nFROM sellers;",
    alternative_solutions: [
      { label: "Sin AS", sql: "SELECT id, store_name tienda, country pais FROM sellers;" },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Un alias cambia el nombre con el que aparece la columna en el resultado, y se escribe con la forma `columna AS nuevo_nombre`.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Las columnas originales se llaman `store_name` y `country`, y están en la tabla `sellers`. Solo la columna `id` conserva su nombre tal como está.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md: "```sql\nSELECT id, store_name AS ___, ___ AS pais\nFROM ___;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "wrong_columns",
        description_md:
          "Devolver `store_name` y `country` sin alias: el contenido de las celdas es correcto, pero los encabezados no son los que pidió el negocio.",
      },
      {
        category: "syntax",
        description_md:
          "Escribir el alias entre comillas simples, como `AS 'tienda'`: en PostgreSQL las comillas simples delimitan un texto, no un nombre de columna.",
      },
      {
        category: "wrong_columns",
        description_md:
          "Escribir el alias con acento, como `país`: funciona si lo encierras entre comillas dobles, pero la consigna pide exactamente `pais`, sin acento.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da los 180 vendedores con los encabezados `id`, `tienda` y `pais`. El alias afecta únicamente al nombre que se muestra en el resultado; los datos que salen son idénticos a los de la tabla.\n\nEn reportes reales conviene fijar los alias en formato `snake_case`, es decir, en minúsculas y con guion bajo entre palabras, desde el principio: las herramientas de visualización y las consultas que se construyan encima dependen de esos nombres.",
    reward: defaultReward("very_easy"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "codigos-de-categoria",
    section,
    title: "Códigos de categoría",
    difficulty: "easy",
    estimated_minutes: 5,
    concepts: ["select", "alias", "text_functions"],
    dataset,
    tables_used: ["categories"],
    scenario_md:
      "El departamento de Catálogo quiere imprimir etiquetas con un código legible para cada categoría, con el formato `CAT-<id>`; por ejemplo, la categoría 7 debe salir como `CAT-7`. Te piden la consulta que arma ese código para poder mandar el archivo a la imprenta.",
    business_question_md:
      "Debes generar un dataset que devuelva, para **todas** las categorías, el código bajo el encabezado `codigo`, formado por el texto `'CAT-'` seguido del valor de `id`, y el nombre bajo el encabezado `nombre`. El orden de las filas no importa.",
    learning_objective: "Concatenar texto y números con `||` y nombrar la columna resultante.",
    theory_ref,
    expected_columns: [
      { name: "codigo", type: "text" },
      { name: "nombre", type: "text" },
    ],
    validation_rules: { required_concepts: ["alias"] },
    reference_solution: "SELECT 'CAT-' || id AS codigo, name AS nombre\nFROM categories;",
    alternative_solutions: [
      {
        label: "Con conversión explícita",
        sql: "SELECT 'CAT-' || id::text AS codigo, name AS nombre FROM categories;",
      },
      {
        label: "Con CONCAT(), la forma que también corre en SQL Server y MySQL",
        sql: "SELECT CONCAT('CAT-', id) AS codigo, name AS nombre FROM categories;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "El operador `||` une dos textos, y si uno de los lados es un número PostgreSQL lo convierte a texto automáticamente.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "El texto fijo se escribe entre comillas simples, como `'CAT-'`, y después va `|| id`. No olvides el alias `codigo` ni renombrar la columna `name` como `nombre`.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md: "```sql\nSELECT 'CAT-' || ___ AS codigo, ___ AS nombre\nFROM categories;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "syntax",
        description_md:
          "Usar el signo `+` para unir textos: en PostgreSQL produce un error de operador. El signo `+` concatena en SQL Server, no en este motor.",
      },
      {
        category: "cell_values",
        description_md:
          "Escribir `'CAT-' || ' ' || id`: se agrega un espacio en el medio del código que la consigna no pidió.",
      },
      {
        category: "wrong_columns",
        description_md:
          "Olvidar renombrar la columna `name` como `nombre`: el encabezado no coincide con el pedido.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 30 filas, con los códigos que van de `CAT-1` a `CAT-30`. PostgreSQL convierte el valor de `id` a texto al concatenarlo con el operador `||`; en otros motores necesitarías escribir `CAST(id AS varchar)`.\n\nLa diferencia que importa en la práctica es cómo trata cada forma a los valores `NULL`. En PostgreSQL, el operador `||` devuelve `NULL` si alguno de los dos operandos es `NULL`: la expresión `'A' || NULL` da `NULL`, no `'A'`. La función `CONCAT()` ignora los `NULL` y los trata como texto vacío, así que `CONCAT('A', NULL)` da `'A'`. Aquí da lo mismo porque `categories.id` es clave primaria y nunca está en `NULL`, pero al concatenar columnas opcionales, como un segundo apellido o el piso de una dirección, esa elección decide si obtienes una celda vacía o un texto útil.\n\nSobre portabilidad: el operador `||` es el de concatenación del estándar ISO SQL y funciona igual en PostgreSQL, Oracle, SQLite y DB2. SQL Server no lo acepta: usa el signo `+` para unir texto y necesita `CONCAT()` si quieres un comportamiento portable. MySQL, por omisión, interpreta `||` como el operador lógico OR, y solo lo trata como concatenación si el servidor tiene activado el modo `PIPES_AS_CONCAT`, por lo que allí se usa `CONCAT()`. Si tu consulta tiene que correr en varios motores, `CONCAT()` es la apuesta segura.",
    reward: defaultReward("easy"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "neto-y-porcentaje-de-envio",
    section,
    title: "Neto y peso del envío",
    difficulty: "easy",
    estimated_minutes: 7,
    concepts: ["select", "alias", "numeric_functions", "order_by", "limit"],
    dataset,
    tables_used: ["orders"],
    scenario_md:
      "El departamento de Finanzas sospecha que en los pedidos chicos el costo de envío se come el margen y quiere ver los casos más extremos. En la tabla `orders`, cada fila es un pedido y todos sus importes están expresados en la moneda que indica la columna `currency`: la columna `subtotal` es el valor de los productos antes de descuentos y envío, es decir, la suma del precio unitario por la cantidad de cada ítem; la columna `discount` es el descuento aplicado al pedido; la columna `shipping_fee` es el costo de envío, y la columna `total_amount` es el total cobrado, que equivale a `subtotal - discount + shipping_fee`. Te piden ese ranking para decidir si conviene fijar un monto mínimo de compra.",
    business_question_md:
      "Debes generar un dataset que devuelva los **20 pedidos en los que el envío representa el mayor porcentaje del total cobrado**, con el `id`, el `currency`, el neto bajo el encabezado `neto`, calculado como `subtotal - discount`, y ese porcentaje bajo el encabezado `envio_pct`, calculado como `shipping_fee` sobre `total_amount` expresado en porcentaje y redondeado a **1 decimal**. Ordena de mayor a menor `envio_pct` y, si dos pedidos empatan, debes desempatar usando `id` ascendente.",
    learning_objective: "Combinar expresiones aritméticas, `ROUND` y alias en un reporte ordenado.",
    theory_ref,
    expected_columns: [
      { name: "id", type: "integer" },
      { name: "currency", type: "text" },
      { name: "neto", type: "numeric" },
      { name: "envio_pct", type: "numeric" },
    ],
    validation_rules: { order_matters: true, required_concepts: ["alias", "order_by", "limit"] },
    reference_solution:
      "SELECT\n  id,\n  currency,\n  subtotal - discount AS neto,\n  ROUND(shipping_fee / total_amount * 100, 1) AS envio_pct\nFROM orders\nORDER BY envio_pct DESC, id ASC\nLIMIT 20;",
    alternative_solutions: [
      {
        label: "Porcentaje con paréntesis y la expresión repetida en el ORDER BY",
        sql: "SELECT id, currency, (subtotal - discount) AS neto, ROUND((shipping_fee * 100) / total_amount, 1) AS envio_pct FROM orders ORDER BY ROUND((shipping_fee * 100) / total_amount, 1) DESC, id ASC LIMIT 20;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Son cuatro columnas: dos se toman directamente de la tabla, una es una resta y la última es una división multiplicada por 100 y redondeada. Como el resultado se ordena por esa última columna calculada, te conviene darle un alias y reutilizarlo.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "La función `ROUND(expresion, 1)` deja un solo decimal. El porcentaje se calcula como `shipping_fee / total_amount * 100`. La cláusula `ORDER BY` se evalúa después del `SELECT`, así que puedes ordenar por el alias `envio_pct` en dirección descendente; agrega `id` como segunda clave y recorta el resultado a 20 filas.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT id,\n       currency,\n       subtotal - ___ AS neto,\n       ROUND(___ / ___ * 100, 1) AS envio_pct\nFROM orders\nORDER BY ___ DESC, id ASC\nLIMIT ___;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "cell_values",
        description_md:
          "Redondear a 2 decimales, o directamente no redondear: los valores dejan de coincidir con lo pedido, que es 1 decimal.",
      },
      {
        category: "wrong_order",
        description_md:
          "Ordenar por `total_amount` descendente: el resultado devuelve los pedidos más caros, que son justamente aquellos en los que el envío pesa poco. Y como la tabla `orders` mezcla seis monedas, ese ranking compara importes que no son comparables entre sí.",
      },
      {
        category: "cell_values",
        description_md:
          "Calcular el porcentaje sobre `subtotal` en lugar de sobre `total_amount`: cambia el denominador y cambia el ranking, porque `subtotal` no incluye el costo de envío.",
      },
      {
        category: "wrong_order",
        description_md:
          "Omitir el desempate por `id`: al redondear a 1 decimal hay pedidos que quedan con el mismo valor de `envio_pct`, por ejemplo dos pedidos con 62.7, y sin una segunda clave el orden entre ellos puede cambiar en cada ejecución.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta encabeza con el pedido 7964, expresado en pesos argentinos, donde el envío representa el 63.4 % del total cobrado, y la fila número 20 todavía está en 56.5 %. Son pedidos de un solo artículo barato con envío pago: el flete no baja con el tamaño del pedido, así que en los tickets chicos se lleva más de la mitad de la venta. Esa es la lectura que Finanzas espera junto con la tabla, y es el argumento habitual para fijar un monto mínimo de compra o para cobrar el envío aparte.\n\nLas columnas monetarias son de tipo `numeric`, así que la división conserva los decimales sin necesidad de conversiones. La función `ROUND(x, 1)` produce valores como `63.4`.\n\nOrdenar por un porcentaje, y no por un importe, es lo que hace comparable el ranking: la tabla `orders` mezcla seis monedas y un ranking por `total_amount` solo te diría cuál de las monedas tiene los números nominales más grandes. La columna `envio_pct` no tiene unidad y se puede comparar entre países; la columna `currency` va en el resultado para que quien lea la columna `neto` sepa en qué moneda está expresada.\n\nPuedes ordenar por el alias `envio_pct` porque `ORDER BY` es la última cláusula en el orden lógico de evaluación: primero `FROM`, después `SELECT`, donde nacen los alias, después `ORDER BY` y por último `LIMIT`. Repetir la expresión completa da el mismo resultado y es lo que necesitarías en la cláusula `WHERE`, donde el alias todavía no existe.",
    reward: defaultReward("easy"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
];
