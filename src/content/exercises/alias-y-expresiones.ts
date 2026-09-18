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
        label: "Con concat()",
        sql: "SELECT concat('CAT-', id) AS codigo, name AS nombre FROM categories;",
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
        description_md: "Usar `+` para unir textos: en PostgreSQL produce un error de operador.",
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
      "30 filas, con códigos `CAT-1` a `CAT-30`. PostgreSQL convierte `id` a texto al concatenarlo con `||`; en otros motores necesitarías `CAST(id AS varchar)`.\n\n`concat()` es una alternativa que además ignora los NULL (los trata como texto vacío), algo que `||` no hace: `'A' || NULL` es NULL.",
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
      "Finanzas revisa los pedidos más grandes para entender cuánto pesa el costo de envío. En `orders`, `subtotal` es la suma de productos, `discount` el descuento aplicado, `shipping_fee` el envío y `total_amount` el total cobrado.",
    business_question_md:
      "Para los **20 pedidos con mayor `total_amount`**, muestra `id`, el neto como `neto` (`subtotal - discount`) y el porcentaje que representa el envío sobre el total como `envio_pct`, redondeado a **1 decimal**. Ordena de mayor a menor `total_amount`.",
    learning_objective: "Combinar expresiones aritméticas, `ROUND` y alias en un reporte ordenado.",
    theory_ref,
    expected_columns: [
      { name: "id", type: "integer" },
      { name: "neto", type: "numeric" },
      { name: "envio_pct", type: "numeric" },
    ],
    validation_rules: { order_matters: true, required_concepts: ["alias", "order_by", "limit"] },
    reference_solution:
      "SELECT\n  id,\n  subtotal - discount AS neto,\n  ROUND(shipping_fee / total_amount * 100, 1) AS envio_pct\nFROM orders\nORDER BY total_amount DESC\nLIMIT 20;",
    alternative_solutions: [
      {
        label: "Porcentaje con paréntesis",
        sql: "SELECT id, (subtotal - discount) AS neto, ROUND((shipping_fee * 100) / total_amount, 1) AS envio_pct FROM orders ORDER BY total_amount DESC LIMIT 20;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Son tres columnas: una directa, una resta y una división multiplicada por 100 y redondeada. `ORDER BY` puede usar una columna que no está en el `SELECT`.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "`ROUND(expresion, 1)` deja un decimal. El porcentaje es `shipping_fee / total_amount * 100`. Ordena por `total_amount DESC` y limita a 20.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT id,\n       subtotal - ___ AS neto,\n       ROUND(___ / total_amount * 100, 1) AS envio_pct\nFROM orders\nORDER BY ___ DESC\nLIMIT ___;\n```",
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
        description_md: "Ordenar por `neto` o por `id` en vez de por `total_amount` descendente.",
      },
      {
        category: "cell_values",
        description_md: "Calcular el porcentaje sobre `subtotal` en lugar de `total_amount`.",
      },
      {
        category: "row_count",
        description_md: "Olvidar `LIMIT 20` y devolver los 18 000 pedidos.",
      },
    ],
    expert_explanation_md:
      "Las columnas monetarias son `numeric`, así que la división conserva decimales sin conversiones. `ROUND(x, 1)` produce valores como `5.3`.\n\nObserva que en los pedidos más grandes el envío pesa poco (pocos puntos porcentuales): el costo de envío crece menos que el subtotal. Ese tipo de lectura es lo que Finanzas espera junto con la tabla.",
    reward: defaultReward("easy"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
];
