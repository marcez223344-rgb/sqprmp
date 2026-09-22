import type { QuestionDef } from "../schemas/question";

const section = "self-join";
const jerarquias = "self-join-jerarquias";
const emparejar = "self-join-emparejar-filas";
const comparar = "self-join-comparar-filas";

export const questions: QuestionDef[] = [
  {
    slug: "sj-q01-alias-obligatorios",
    section,
    lesson: jerarquias,
    type: "single",
    difficulty: "easy",
    topic: "Por qué los alias son obligatorios",
    tags: ["self_join", "alias"],
    estimated_seconds: 45,
    prompt_md:
      "En un self join, ¿por qué hay que ponerle un alias distinto a cada copia de la tabla?",
    options: [
      {
        key: "a",
        body_md:
          "Porque sin alias PostgreSQL no puede distinguir a cuál de las dos copias pertenece cada columna y rechaza la consulta.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Porque los alias hacen que la consulta se ejecute más rápido.",
        is_correct: false,
        why_incorrect_md:
          "Los alias son solo nombres: no cambian el plan de ejecución ni el rendimiento.",
      },
      {
        key: "c",
        body_md: "Porque PostgreSQL exige alias en todos los JOIN, sean o no sobre la misma tabla.",
        is_correct: false,
        why_incorrect_md:
          "En un join entre tablas distintas los alias son opcionales; solo se vuelven obligatorios cuando la misma tabla aparece dos veces.",
      },
      {
        key: "d",
        body_md: "Porque el alias define cuál de las dos copias se lee primero.",
        is_correct: false,
        why_incorrect_md:
          "El orden de lectura lo decide el planificador; el alias no influye en esa decisión.",
      },
    ],
    explanation_md:
      "Sin alias, `FROM categories INNER JOIN categories` produce «table name categories specified more than once». Con dos alias, cada copia es una fuente de datos independiente y `alias.columna` deja de ser ambiguo.",
    is_published: true,
  },
  {
    slug: "sj-q02-condicion-on-jerarquia",
    section,
    lesson: jerarquias,
    type: "fill_blank",
    difficulty: "easy",
    topic: "La condición de unión en una jerarquía",
    tags: ["self_join", "inner_join"],
    estimated_seconds: 40,
    prompt_md:
      "Completa la condición para emparejar cada subcategoría con su padre: `FROM categories AS hija INNER JOIN categories AS padre ON padre.id = hija.____;`",
    answer: { accepted: ["parent_id", "hija.parent_id"], case_sensitive: false },
    explanation_md:
      "`parent_id` es la clave foránea que apunta al `id` de otra fila de la misma tabla; por eso se compara con `padre.id`.",
    is_published: true,
  },
  {
    slug: "sj-q03-inner-descarta-raices",
    section,
    lesson: jerarquias,
    type: "true_false",
    difficulty: "easy",
    topic: "INNER JOIN y las filas raíz",
    tags: ["self_join", "inner_join", "null_handling"],
    estimated_seconds: 35,
    prompt_md:
      "Verdadero o falso: un INNER JOIN de `categories` consigo misma por `padre.id = hija.parent_id` incluye también las categorías raíz.",
    options: [
      {
        key: "a",
        body_md: "Verdadero",
        is_correct: false,
        why_incorrect_md:
          "Las raíces tienen `parent_id` en NULL y NULL nunca es igual a nada, así que no encuentran pareja y el INNER JOIN las descarta.",
      },
      { key: "b", body_md: "Falso", is_correct: true },
    ],
    explanation_md:
      "De las 30 categorías de TiendaViva, el INNER JOIN devuelve 24: quedan fuera las 6 raíces. Para conservarlas hay que usar LEFT JOIN.",
    is_published: true,
  },
  {
    slug: "sj-q04-left-self-join-lectura",
    section,
    lesson: jerarquias,
    type: "query_interpretation",
    difficulty: "intermediate",
    topic: "Leer un LEFT JOIN sobre la propia tabla",
    tags: ["self_join", "outer_join"],
    estimated_seconds: 60,
    prompt_md: "¿Qué devuelve esta consulta sobre las 30 categorías de TiendaViva?",
    code_md:
      "```sql\nSELECT c.name AS categoria, padre.name AS categoria_padre\nFROM categories AS c\nLEFT JOIN categories AS padre ON padre.id = c.parent_id;\n```",
    options: [
      {
        key: "a",
        body_md: "Las 30 categorías; las 6 raíces salen con `categoria_padre` en NULL.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Solo las 24 subcategorías, cada una con el nombre de su padre.",
        is_correct: false,
        why_incorrect_md:
          "Ese sería el resultado con INNER JOIN; LEFT conserva las filas sin padre.",
      },
      {
        key: "c",
        body_md: "Las 6 raíces con la lista de sus subcategorías.",
        is_correct: false,
        why_incorrect_md:
          "La condición está escrita desde la hija hacia el padre; para listar hijas por raíz habría que invertir el `ON` y empezar por la raíz.",
      },
      {
        key: "d",
        body_md: "900 filas: el producto de las 30 categorías por sí mismas.",
        is_correct: false,
        why_incorrect_md:
          "Eso ocurriría sin condición de unión; aquí el `ON` limita cada fila a su padre.",
      },
    ],
    explanation_md:
      "LEFT JOIN garantiza al menos una fila por cada fila de `c`. Cuando `c.parent_id` es NULL no hay pareja posible y las columnas de `padre` quedan en NULL.",
    is_published: true,
  },
  {
    slug: "sj-q05-pares-espejados",
    section,
    lesson: comparar,
    type: "error_diagnosis",
    difficulty: "intermediate",
    topic: "Pares duplicados en un self join",
    tags: ["self_join", "duplicates"],
    estimated_seconds: 70,
    prompt_md:
      "El reporte debía listar pares de productos del mismo vendedor y categoría, pero cada par aparece dos veces y además hay filas donde los dos productos son el mismo. ¿Qué le falta a la consulta?",
    code_md:
      "```sql\nSELECT a.id AS producto_a, b.id AS producto_b\nFROM products AS a\nINNER JOIN products AS b\n  ON b.seller_id = a.seller_id\n AND b.category_id = a.category_id;\n```",
    options: [
      {
        key: "a",
        body_md: "Una desigualdad entre los ids, por ejemplo `AND b.id > a.id`.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Un `SELECT DISTINCT`.",
        is_correct: false,
        why_incorrect_md:
          "`DISTINCT` no ayuda: (456, 684) y (684, 456) son filas distintas, así que las dos sobreviven.",
      },
      {
        key: "c",
        body_md: "Cambiar INNER JOIN por LEFT JOIN.",
        is_correct: false,
        why_incorrect_md:
          "El tipo de join no tiene relación con el problema: agregaría filas, no las quitaría.",
      },
      {
        key: "d",
        body_md: "Un `GROUP BY a.id, b.id`.",
        is_correct: false,
        why_incorrect_md:
          "Agrupar por las dos columnas deja exactamente las mismas combinaciones, incluidas las espejadas.",
      },
    ],
    explanation_md:
      "`b.id > a.id` es falso cuando ambas filas son la misma (elimina el auto-emparejamiento) y deja una sola versión de cada par espejado.",
    is_published: true,
  },
  {
    slug: "sj-q06-distinto-vs-menor",
    section,
    lesson: comparar,
    type: "single",
    difficulty: "intermediate",
    topic: "`<>` frente a `<` en la condición",
    tags: ["self_join", "duplicates"],
    estimated_seconds: 50,
    prompt_md:
      "En un self join que busca pares de filas parecidas, ¿qué pasa si usas `b.id <> a.id` en lugar de `b.id > a.id`?",
    options: [
      {
        key: "a",
        body_md:
          "Se evita que una fila se empareje consigo misma, pero cada par sigue apareciendo dos veces.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "El resultado es idéntico.",
        is_correct: false,
        why_incorrect_md:
          "No lo es: `<>` acepta tanto (a, b) como (b, a), y la desigualdad estricta se queda con una sola.",
      },
      {
        key: "c",
        body_md: "No devuelve ninguna fila.",
        is_correct: false,
        why_incorrect_md:
          "`<>` es verdadero para cualquier par de filas distintas, así que devuelve muchas filas.",
      },
      {
        key: "d",
        body_md: "Provoca un error de sintaxis.",
        is_correct: false,
        why_incorrect_md: "`<>` es un operador válido en cualquier condición de unión.",
      },
    ],
    explanation_md:
      "Cuando el par no tiene un orden propio, la desigualdad estricta es la que elimina los espejos. `<>` solo sirve cuando la dirección del par sí importa (por ejemplo, «un pago anterior a otro»).",
    is_published: true,
  },
  {
    slug: "sj-q07-alias-equivocado-reversos",
    section,
    lesson: emparejar,
    type: "scenario",
    difficulty: "intermediate",
    topic: "Filtrar el alias correcto",
    tags: ["self_join", "where"],
    estimated_seconds: 60,
    prompt_md:
      "En Bolsillo, un analista empareja cada reverso con su pago original (`FROM transactions AS rev INNER JOIN transactions AS orig ON orig.id = rev.reversal_of`) y agrega `WHERE rev.kind = 'card_payment'` para quedarse con los pagos con tarjeta. El resultado viene vacío. ¿Por qué?",
    options: [
      {
        key: "a",
        body_md:
          "Porque `rev` son los reversos y todos tienen `kind = 'reversal'`; el filtro debe aplicarse a `orig`.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Porque `reversal_of` está en NULL en todos los movimientos.",
        is_correct: false,
        why_incorrect_md:
          "Los 297 reversos del dataset tienen `reversal_of` cargado; el join funciona, lo que falla es el filtro.",
      },
      {
        key: "c",
        body_md: "Porque falta un LEFT JOIN para conservar los pagos sin reverso.",
        is_correct: false,
        why_incorrect_md:
          "El reporte solo quiere pagos reversados; el INNER JOIN es el join adecuado y no explica el resultado vacío.",
      },
      {
        key: "d",
        body_md: "Porque `WHERE` no puede filtrar columnas de un self join.",
        is_correct: false,
        why_incorrect_md:
          "Sí puede: cada alias se filtra igual que cualquier otra tabla del `FROM`.",
      },
    ],
    explanation_md:
      "Cada alias representa filas distintas. `rev.kind` siempre vale `'reversal'`; el tipo del pago devuelto vive en `orig.kind`.",
    is_published: true,
  },
  {
    slug: "sj-q08-afirmaciones-self-join",
    section,
    lesson: emparejar,
    type: "multiple",
    difficulty: "intermediate",
    topic: "Qué es y qué no es un self join",
    tags: ["self_join", "inner_join", "outer_join"],
    estimated_seconds: 80,
    prompt_md: "Selecciona todas las afirmaciones correctas sobre los self joins.",
    options: [
      {
        key: "a",
        body_md: "Usan la misma sintaxis que cualquier otro JOIN; lo único distinto son los alias.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Cada alias se puede filtrar y calcular de forma independiente en `WHERE`.",
        is_correct: true,
      },
      {
        key: "c",
        body_md: "Pueden ser INNER o LEFT según convenga conservar o no las filas sin pareja.",
        is_correct: true,
      },
      {
        key: "d",
        body_md: "Requieren que la tabla tenga una clave foránea hacia sí misma.",
        is_correct: false,
        why_incorrect_md:
          "No es necesario: comparar filas por atributos (mismo vendedor, misma categoría) también es un self join.",
      },
      {
        key: "e",
        body_md: "Solo sirven para jerarquías de tipo padre–hijo.",
        is_correct: false,
        why_incorrect_md:
          "También sirven para emparejar filas relacionadas y para comparar filas entre sí.",
      },
    ],
    explanation_md:
      "Un self join no es una construcción especial del lenguaje: es un JOIN cuyas dos fuentes son la misma tabla, con alias distintos para poder referirse a cada copia.",
    is_published: true,
  },
  {
    slug: "sj-q09-self-join-o-ventana",
    section,
    lesson: comparar,
    type: "matching",
    difficulty: "intermediate",
    topic: "Self join o función de ventana",
    tags: ["self_join", "window_function"],
    estimated_seconds: 80,
    prompt_md: "Relaciona cada necesidad con la herramienta más adecuada.",
    code_md: null,
    pairs: [
      {
        left: "Mostrar cada subcategoría junto al nombre de su categoría padre",
        right: "Self join",
      },
      {
        left: "Listar todos los pares de productos parecidos del mismo vendedor",
        right: "Self join con una desigualdad de ids",
      },
      {
        left: "Incluir también las categorías que no tienen padre",
        right: "LEFT JOIN sobre la propia tabla",
      },
      {
        left: "Comparar cada pago con el pago anterior de la misma cuenta",
        right: "Función de ventana (LAG)",
      },
      {
        left: "Numerar los movimientos de cada cuenta del más reciente al más antiguo",
        right: "Función de ventana (ROW_NUMBER)",
      },
    ],
    explanation_md:
      "El self join resuelve relaciones entre filas identificadas por claves o atributos. Cuando la relación es «la fila anterior/siguiente según un orden» o «la posición dentro de un grupo», las funciones de ventana hacen el trabajo en una sola pasada y sin duplicar filas.",
    is_published: true,
  },
  {
    slug: "sj-q10-explosion-de-filas",
    section,
    lesson: comparar,
    type: "single",
    difficulty: "advanced",
    topic: "Costo de un self join sin condición suficiente",
    tags: ["self_join", "performance"],
    estimated_seconds: 55,
    prompt_md:
      "Unes `products` (1500 filas) consigo misma y olvidas la condición del `ON`. ¿Cuántas filas intenta producir el motor?",
    options: [
      {
        key: "a",
        body_md: "2 250 000 filas: cada fila combinada con todas las demás.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "1500 filas: una por producto.",
        is_correct: false,
        why_incorrect_md:
          "Sin condición de unión no hay nada que limite las combinaciones a una por fila.",
      },
      {
        key: "c",
        body_md: "3000 filas: las dos copias apiladas.",
        is_correct: false,
        why_incorrect_md:
          "Apilar filas es lo que hace `UNION`; un JOIN combina filas, no las concatena.",
      },
      {
        key: "d",
        body_md: "0 filas: PostgreSQL rechaza la consulta.",
        is_correct: false,
        why_incorrect_md:
          "Con `CROSS JOIN` o con la sintaxis de comas no hay error: la consulta corre y devuelve el producto cartesiano.",
      },
    ],
    explanation_md:
      "1500 × 1500 = 2 250 000. Por eso conviene ejecutar `count(*)` antes de agregar columnas: si el número se parece al cuadrado del tamaño de la tabla, falta una condición en el `ON`.",
    is_published: true,
  },
];
