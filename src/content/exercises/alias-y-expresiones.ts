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
      "El equipo comercial de **TiendaViva** exporta la lista de vendedores a una planilla y quiere encabezados en español.",
    business_question_md:
      "Muestra `id`, el nombre de la tienda como `tienda` y el país como `pais` para **todos** los vendedores. El orden no importa.",
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
          "Un alias cambia el nombre de la columna en el resultado: `columna AS nuevo_nombre`.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Las columnas originales son `store_name` y `country`, en la tabla `sellers`. Solo `id` conserva su nombre.",
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
          "Devolver `store_name` y `country` sin alias: el contenido es correcto, pero los encabezados no son los pedidos.",
      },
      {
        category: "syntax",
        description_md:
          "Escribir el alias entre comillas simples (`AS 'tienda'`): eso es un texto, no un nombre.",
      },
      {
        category: "wrong_columns",
        description_md:
          "Poner acentos en el alias (`país`): funciona con comillas dobles, pero la consigna pide `pais`.",
      },
    ],
    expert_explanation_md:
      "Los 180 vendedores aparecen con encabezados `id`, `tienda`, `pais`. El alias solo afecta al nombre del resultado; los datos son idénticos.\n\nEn reportes reales conviene fijar alias en `snake_case` desde el principio: las herramientas de visualización y las consultas posteriores dependen de esos nombres.",
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
      "El equipo de catálogo quiere imprimir etiquetas con un código legible por categoría, con el formato `CAT-<id>` (por ejemplo, `CAT-7`).",
    business_question_md:
      "Devuelve, para **todas** las categorías, el código como `codigo` (texto `CAT-` seguido del `id`) y el nombre como `nombre`. El orden no importa.",
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
          "El operador `||` une textos; un número a un lado se convierte a texto automáticamente.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "El texto fijo va entre comillas simples: `'CAT-'`. Luego `|| id`. No olvides el alias `codigo` y renombrar `name`.",
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
          "Usar `+` para unir textos: en PostgreSQL produce un error de operador. `+` concatena en SQL Server, no acá.",
      },
      {
        category: "cell_values",
        description_md: "Escribir `'CAT-' || ' ' || id` agrega un espacio que la consigna no pide.",
      },
      {
        category: "wrong_columns",
        description_md: "Olvidar renombrar `name` como `nombre`.",
      },
    ],
    expert_explanation_md:
      "30 filas, con códigos `CAT-1` a `CAT-30`. PostgreSQL convierte `id` a texto al concatenarlo con `||`; en otros motores necesitarías `CAST(id AS varchar)`.\n\nLa diferencia que importa en la práctica es cómo cada forma trata los NULL. En PostgreSQL, `||` devuelve NULL si alguno de los operandos es NULL: `'A' || NULL` es NULL, no `'A'`. `CONCAT()` ignora los NULL y los trata como texto vacío, así que `CONCAT('A', NULL)` es `'A'`. Aquí da lo mismo porque `categories.id` es clave primaria y nunca es NULL, pero al concatenar columnas opcionales (un segundo apellido, un piso de dirección) la elección decide si obtienes una fila vacía o un texto útil.\n\nSobre portabilidad: `||` es el operador de concatenación del estándar ISO SQL y funciona igual en PostgreSQL, Oracle, SQLite y DB2. SQL Server no lo acepta: usa `+` para unir texto y necesita `CONCAT()` si quieres el comportamiento portable. MySQL, por omisión, interpreta `||` como el OR lógico (solo se comporta como concatenación si el servidor tiene activado el modo `PIPES_AS_CONCAT`), por lo que allí se usa `CONCAT()`. Si tu consulta tiene que correr en varios motores, `CONCAT()` es la apuesta segura.",
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
      "Finanzas sospecha que en los pedidos chicos el envío se come el margen y quiere ver los casos más extremos. En `orders`, una fila es un pedido y todos sus importes están en la moneda de `currency`: `subtotal` es el valor de los productos del pedido antes de descuentos y envío (la suma de precio unitario por cantidad de cada ítem), `discount` es el descuento aplicado al pedido, `shipping_fee` es el costo de envío y `total_amount` es el total cobrado (`subtotal - discount + shipping_fee`).",
    business_question_md:
      "Devuelve los **20 pedidos donde el envío representa el mayor porcentaje del total cobrado**. Muestra `id`, `currency`, el neto como `neto` (`subtotal - discount`) y ese porcentaje como `envio_pct` (`shipping_fee` sobre `total_amount`, en porcentaje), redondeado a **1 decimal**. Ordena de mayor a menor `envio_pct` y desempata por `id` ascendente.",
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
          "Son cuatro columnas: dos directas, una resta y una división multiplicada por 100 y redondeada. La pregunta ordena por esa última columna calculada, así que te conviene darle un alias y reutilizarlo.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "`ROUND(expresion, 1)` deja un decimal. El porcentaje es `shipping_fee / total_amount * 100`. `ORDER BY` se evalúa después del `SELECT`, así que puedes ordenar por el alias `envio_pct` en dirección descendente; agrega `id` como segunda clave y recorta a 20 filas.",
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
          "Redondear a 2 decimales o no redondear: los valores no coinciden con lo pedido (1 decimal).",
      },
      {
        category: "wrong_order",
        description_md:
          "Ordenar por `total_amount` descendente: devuelve los pedidos más caros, que son justo aquellos donde el envío pesa poco. Y como `orders` mezcla seis monedas, ese ranking compara importes que no son comparables.",
      },
      {
        category: "cell_values",
        description_md:
          "Calcular el porcentaje sobre `subtotal` en lugar de `total_amount`: cambia el denominador y el ranking, porque `subtotal` no incluye el envío.",
      },
      {
        category: "wrong_order",
        description_md:
          "Omitir el desempate por `id`: al redondear a 1 decimal hay pedidos con el mismo `envio_pct` (hay dos con 62.7), y sin segunda clave el orden entre ellos puede cambiar en cada ejecución.",
      },
    ],
    expert_explanation_md:
      "El resultado encabeza con el pedido 7964 (en ARS), donde el envío es el 63.4 % del total cobrado, y la fila 20 todavía está en 56.5 %. Son pedidos de un solo artículo barato con envío pago: el flete no baja con el tamaño del pedido, así que en los tickets chicos se lleva más de la mitad de la venta. Esa es la lectura que Finanzas espera junto con la tabla, y el argumento habitual para fijar un mínimo de compra o cobrar el envío aparte.\n\nLas columnas monetarias son `numeric`, así que la división conserva decimales sin conversiones. `ROUND(x, 1)` produce valores como `63.4`.\n\nOrdenar por un porcentaje, y no por un importe, es lo que hace comparable el ranking: `orders` mezcla seis monedas y un top por `total_amount` solo te diría cuál moneda tiene los números nominales más grandes. `envio_pct` no tiene unidad y se puede comparar entre países; `currency` va en el resultado para que quien lea `neto` sepa en qué moneda está.\n\nPuedes ordenar por el alias `envio_pct` porque `ORDER BY` es la última cláusula lógica: `FROM` → `SELECT` (nacen los alias) → `ORDER BY` → `LIMIT`. Repetir la expresión completa da el mismo resultado y es lo que necesitarías en el `WHERE`, donde el alias todavía no existe.",
    reward: defaultReward("easy"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
];
