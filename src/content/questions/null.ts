import type { QuestionDef } from "../schemas/question";

const section = "null";
const logica = "null-logica-de-tres-valores";
const coalesce = "null-coalesce-y-nullif";

export const questions: QuestionDef[] = [
  {
    slug: "null-q01-igual-null",
    section,
    lesson: logica,
    type: "single",
    difficulty: "easy",
    topic: "Comparar con NULL",
    tags: ["null_handling"],
    estimated_seconds: 35,
    prompt_md:
      "¿Cuántas filas devuelve `SELECT id FROM sellers WHERE rating = NULL;` si 28 vendedores no tienen calificación?",
    options: [
      { key: "a", body_md: "0", is_correct: true },
      {
        key: "b",
        body_md: "28",
        is_correct: false,
        why_incorrect_md: "`= NULL` nunca es verdadero; para eso existe `IS NULL`.",
      },
      {
        key: "c",
        body_md: "Da error de sintaxis.",
        is_correct: false,
        why_incorrect_md:
          "Es sintácticamente válido; simplemente evalúa UNKNOWN en todas las filas.",
      },
    ],
    explanation_md:
      "Cualquier comparación con NULL es UNKNOWN y `WHERE` la descarta. Usa `rating IS NULL`.",
    is_published: true,
  },
  {
    slug: "null-q02-distinto",
    section,
    lesson: logica,
    type: "single",
    difficulty: "intermediate",
    topic: "Lógica de tres valores",
    tags: ["null_handling"],
    estimated_seconds: 50,
    prompt_md:
      "`sellers` tiene 180 filas; 28 tienen `rating` NULL y 1 tiene exactamente 4.5. ¿Cuántas devuelve `WHERE rating <> 4.5`?",
    options: [
      { key: "a", body_md: "151", is_correct: true },
      {
        key: "b",
        body_md: "179",
        is_correct: false,
        why_incorrect_md: "Los 28 NULL no pasan el filtro: `NULL <> 4.5` es UNKNOWN.",
      },
      {
        key: "c",
        body_md: "152",
        is_correct: false,
        why_incorrect_md: "180 − 28 (NULL) − 1 (igual a 4.5) = 151.",
      },
    ],
    explanation_md:
      "`<>` tampoco «ve» los NULL. Si debes incluirlos: `rating <> 4.5 OR rating IS NULL`.",
    is_published: true,
  },
  {
    slug: "null-q03-is-null",
    section,
    lesson: logica,
    type: "fill_blank",
    difficulty: "very_easy",
    topic: "Operador IS NULL",
    tags: ["null_handling"],
    estimated_seconds: 25,
    prompt_md:
      "Completa: `SELECT id FROM shipments WHERE delivered_at ___ NULL;` para obtener los envíos no entregados. Escribe solo la palabra clave.",
    answer: {
      accepted: ["IS", "IS NULL", "delivered_at IS NULL", "WHERE delivered_at IS NULL"],
      case_sensitive: false,
    },
    explanation_md:
      "`IS NULL` es el operador correcto para detectar NULL. `delivered_at = NULL` no daría error, pero nunca es verdadero y devolvería 0 filas.",
    is_published: true,
  },
  {
    slug: "null-q04-not-in",
    section,
    lesson: logica,
    type: "error_diagnosis",
    difficulty: "advanced",
    topic: "NOT IN con NULL",
    tags: ["null_handling", "subquery"],
    estimated_seconds: 70,
    prompt_md:
      "En `categories`, la columna `parent_id` guarda el `id` de la categoría padre y es NULL en las categorías de primer nivel. Esta consulta debería listar las categorías que no son padre de ninguna otra, pero devuelve 0 filas aunque existen 24. ¿Por qué?",
    code_md:
      "```sql\nSELECT id, name\nFROM categories\nWHERE id NOT IN (SELECT parent_id FROM categories);\n```",
    options: [
      {
        key: "a",
        body_md:
          "La subconsulta incluye un NULL (las raíces), y `NOT IN` con un NULL en la lista es UNKNOWN para todas las filas.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "`NOT IN` no acepta subconsultas.",
        is_correct: false,
        why_incorrect_md:
          "Sí las acepta; el problema es el NULL dentro del resultado de la subconsulta.",
      },
      {
        key: "c",
        body_md: "Falta `DISTINCT` en la subconsulta.",
        is_correct: false,
        why_incorrect_md: "Los duplicados no afectan a `IN`/`NOT IN`; el NULL sí.",
      },
    ],
    explanation_md:
      "Agrega `WHERE parent_id IS NOT NULL` en la subconsulta o usa `NOT EXISTS`. Es uno de los errores silenciosos más frecuentes en SQL.",
    is_published: true,
  },
  {
    slug: "null-q05-coalesce",
    section,
    lesson: coalesce,
    type: "single",
    difficulty: "easy",
    topic: "COALESCE",
    tags: ["null_handling", "coalesce"],
    estimated_seconds: 35,
    prompt_md: "¿Qué devuelve `SELECT COALESCE(NULL, NULL, 'b', 'c');`?",
    options: [
      { key: "a", body_md: "`'b'`", is_correct: true },
      {
        key: "b",
        body_md: "`NULL`",
        is_correct: false,
        why_incorrect_md: "`COALESCE` devuelve el **primer** argumento no nulo, que es `'b'`.",
      },
      {
        key: "c",
        body_md: "`'c'`",
        is_correct: false,
        why_incorrect_md: "`'b'` aparece antes y no es NULL.",
      },
    ],
    explanation_md:
      "`COALESCE` recorre los argumentos en orden y se detiene en el primero que no es NULL.",
    is_published: true,
  },
  {
    slug: "null-q06-nullif",
    section,
    lesson: coalesce,
    type: "query_interpretation",
    difficulty: "intermediate",
    topic: "NULLIF",
    tags: ["null_handling", "nullif"],
    estimated_seconds: 50,
    prompt_md: "¿Para qué sirve `NULLIF(quantity, 0)` en esta expresión?",
    code_md:
      "```sql\nSELECT unit_price * quantity / NULLIF(quantity, 0) AS check_price\nFROM order_items;\n```",
    options: [
      {
        key: "a",
        body_md:
          "Evita el error de división por cero: si `quantity` es 0, el divisor pasa a ser NULL y el resultado es NULL.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Reemplaza los NULL de `quantity` por 0.",
        is_correct: false,
        why_incorrect_md:
          "Eso lo haría `COALESCE(quantity, 0)`. `NULLIF` hace lo contrario: produce NULL.",
      },
      {
        key: "c",
        body_md: "Filtra las filas con `quantity` igual a 0.",
        is_correct: false,
        why_incorrect_md: "No filtra filas; solo cambia el valor del divisor.",
      },
    ],
    explanation_md:
      "`NULLIF(a, b)` devuelve NULL cuando `a = b`. Es el patrón estándar para divisiones seguras.",
    is_published: true,
  },
  {
    slug: "null-q07-aritmetica",
    section,
    lesson: coalesce,
    type: "true_false",
    difficulty: "easy",
    topic: "NULL en operaciones",
    tags: ["null_handling"],
    estimated_seconds: 30,
    prompt_md:
      "Verdadero o falso: si `discount` es NULL, `subtotal - discount` devuelve el valor de `subtotal`.",
    options: [
      {
        key: "a",
        body_md: "Verdadero",
        is_correct: false,
        why_incorrect_md:
          "Cualquier operación aritmética con NULL da NULL. Usa `subtotal - COALESCE(discount, 0)`.",
      },
      { key: "b", body_md: "Falso", is_correct: true },
    ],
    explanation_md:
      "NULL «contagia» las operaciones. Protege los cálculos con `COALESCE` cuando 0 sea el valor de negocio correcto.",
    is_published: true,
  },
  {
    slug: "null-q08-orden",
    section,
    lesson: coalesce,
    type: "single",
    difficulty: "easy",
    topic: "NULL en ORDER BY",
    tags: ["null_handling", "order_by"],
    estimated_seconds: 35,
    prompt_md: "En PostgreSQL, `ORDER BY rating DESC` coloca a los vendedores sin calificación…",
    options: [
      { key: "a", body_md: "Al principio del resultado.", is_correct: true },
      {
        key: "b",
        body_md: "Al final del resultado.",
        is_correct: false,
        why_incorrect_md:
          "En descendente los NULL se consideran «mayores» y quedan primero; en ascendente, al final.",
      },
      {
        key: "c",
        body_md: "Los excluye.",
        is_correct: false,
        why_incorrect_md: "`ORDER BY` nunca elimina filas.",
      },
    ],
    explanation_md:
      "Por defecto, PostgreSQL trata NULL como el valor más alto. Usa `NULLS LAST` para enviarlos al final en `DESC`.",
    is_published: true,
  },
  {
    slug: "null-q09-count",
    section,
    lesson: coalesce,
    type: "single",
    difficulty: "intermediate",
    topic: "NULL en agregaciones",
    tags: ["null_handling", "aggregate"],
    estimated_seconds: 45,
    prompt_md:
      "`reviews` tiene 3985 filas y 1391 tienen `comment` NULL. ¿Qué devuelve `SELECT count(comment) FROM reviews;`?",
    options: [
      { key: "a", body_md: "2594", is_correct: true },
      {
        key: "b",
        body_md: "3985",
        is_correct: false,
        why_incorrect_md: "Eso devuelve `count(*)`. `count(columna)` ignora los NULL.",
      },
      {
        key: "c",
        body_md: "1391",
        is_correct: false,
        why_incorrect_md: "Ese es el número de NULL, que `count(comment)` precisamente no cuenta.",
      },
    ],
    explanation_md:
      "`count(columna)` cuenta valores no nulos: 3985 − 1391 = 2594. `count(*)` cuenta filas.",
    is_published: true,
  },
  {
    slug: "null-q10-escenario",
    section,
    lesson: coalesce,
    type: "scenario",
    difficulty: "intermediate",
    topic: "Criterio de negocio",
    tags: ["null_handling", "coalesce"],
    estimated_seconds: 55,
    prompt_md:
      "Te piden la calificación promedio de los vendedores que ya tienen calificación. La tabla `sellers` tiene 180 vendedores y 28 tienen `rating` NULL porque todavía no recibieron reseñas. ¿Qué expresión da ese promedio?",
    options: [
      {
        key: "a",
        body_md:
          "`avg(rating)`: la función ignora los NULL y promedia solo a los 152 vendedores calificados.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "`avg(COALESCE(rating, 0))`",
        is_correct: false,
        why_incorrect_md:
          "Convierte a los 28 vendedores sin reseñas en vendedores con calificación 0 y los incluye en el promedio, que baja. «Sin calificación» no significa «pésimo».",
      },
      {
        key: "c",
        body_md: "`sum(rating) / count(*)`",
        is_correct: false,
        why_incorrect_md:
          "`sum` ignora los NULL, pero `count(*)` cuenta las 180 filas. Divide la suma de 152 calificaciones entre 180 y da un promedio más bajo que el real, igual que la opción con `COALESCE`.",
      },
    ],
    explanation_md:
      "NULL significa «no sabemos». Las funciones de agregación como `avg` lo ignoran por diseño; reemplazarlo por 0 o dividir por todas las filas cambia el significado del resultado. En el informe conviene aclarar aparte cuántos vendedores todavía no tienen calificación.",
    is_published: true,
  },
  {
    slug: "null-q11-group-by-agrupa-nulos",
    section,
    lesson: logica,
    type: "single",
    difficulty: "intermediate",
    topic: "NULL en GROUP BY y DISTINCT",
    tags: ["null_handling", "group_by", "distinct"],
    estimated_seconds: 60,
    prompt_md:
      "En una tabla `envios` hay 40 filas cuyo `transportista` quedó sin cargar. `SELECT transportista, count(*) FROM envios GROUP BY transportista` devuelve una fila con `transportista` en NULL y el conteo 40: los 40 NULL quedaron en un mismo grupo. Sin embargo, `WHERE transportista = transportista` descarta esas mismas 40 filas. ¿Cómo conviven las dos cosas?",
    options: [
      {
        key: "a",
        body_md:
          "Son dos reglas distintas del estándar: `GROUP BY` y `DISTINCT` juntan los NULL porque comparan por «no ser distintos», mientras que el operador `=` devuelve UNKNOWN y el `WHERE` solo deja pasar lo verdadero.",
        is_correct: true,
      },
      {
        key: "b",
        body_md:
          "`GROUP BY` reemplaza los NULL por un valor interno antes de agrupar, así que después de agrupar ya se pueden comparar con `=`.",
        is_correct: false,
        why_incorrect_md:
          "No los reemplaza por nada: el valor de la columna sigue siendo NULL en el resultado y compararlo con `=` vuelve a dar UNKNOWN. Lo que cambia es el criterio de comparación que usa cada operación, no el dato.",
      },
      {
        key: "c",
        body_md:
          "Es una particularidad de PostgreSQL; en otros motores el grupo de los NULL no aparece en el resultado.",
        is_correct: false,
        why_incorrect_md:
          "Agrupar los NULL en un solo grupo es comportamiento del estándar SQL y lo hacen todos los motores usuales. No es una diferencia entre motores.",
      },
      {
        key: "d",
        body_md:
          "El grupo aparece porque `count(*)` cuenta filas; con `count(transportista)` la fila de los NULL desaparecería del resultado.",
        is_correct: false,
        why_incorrect_md:
          "`count(transportista)` cambiaría el número a 0, pero la fila del grupo seguiría ahí. La agregación que elijas no decide qué grupos existen; eso lo decide el `GROUP BY`.",
      },
    ],
    explanation_md:
      "Conviene tenerlo separado en la cabeza: para comparar (`=`, `<>`, `IN`, `JOIN ... ON`), dos NULL no son iguales y el resultado es UNKNOWN; para juntar filas (`GROUP BY`, `DISTINCT`, `UNION`), dos NULL van al mismo lugar. Ese grupo de NULL en un `GROUP BY` suele ser la primera señal de un problema de carga.",
    is_published: true,
  },
  {
    slug: "null-q12-is-distinct-from",
    section,
    lesson: logica,
    type: "error_diagnosis",
    difficulty: "advanced",
    topic: "Detectar cambios con IS DISTINCT FROM",
    tags: ["null_handling", "comparacion"],
    estimated_seconds: 80,
    prompt_md:
      "Un control diario compara el precio de hoy con el de ayer para listar los productos que cambiaron. Todos los productos tienen una fila en `precios_ayer` y otra en `precios_hoy`. Los que ayer tenían la columna `price` en NULL (sin precio cargado) y hoy ya tienen un precio nunca aparecen en el resultado. ¿Cuál es la causa?",
    code_md:
      "```sql\nSELECT h.product_id\nFROM precios_hoy AS h\nINNER JOIN precios_ayer AS a ON a.product_id = h.product_id\nWHERE h.price <> a.price;\n```",
    options: [
      {
        key: "a",
        body_md:
          "Si alguno de los dos precios es NULL, `<>` devuelve UNKNOWN y la fila no pasa el filtro. `h.price IS DISTINCT FROM a.price` compara tratando a NULL como un valor más y sí marca el cambio.",
        is_correct: true,
      },
      {
        key: "b",
        body_md:
          "El `INNER JOIN` descarta esos productos porque ayer no tenían fila en `precios_ayer`.",
        is_correct: false,
        why_incorrect_md:
          "La fila de ayer existe: lo que falta es el precio dentro de esa fila, no la fila. El join encuentra la pareja sin problema, y es después, en el `WHERE`, donde falla la comparación.",
      },
      {
        key: "c",
        body_md: "Hay que envolver ambos lados en `coalesce(price, 0)` antes de compararlos.",
        is_correct: false,
        why_incorrect_md:
          "Funciona mientras 0 no sea un precio real. El día que un producto pase de costar 0 a no tener precio, el control lo leerá como «sin cambio». `IS DISTINCT FROM` no necesita inventar ningún valor.",
      },
      {
        key: "d",
        body_md: "`<>` no compara columnas de tablas distintas; para eso hay que usar `!=`.",
        is_correct: false,
        why_incorrect_md:
          "`<>` y `!=` son el mismo operador en PostgreSQL y ambos comparan columnas de cualquier tabla. El problema no es cuál elijas, sino lo que hacen los dos frente a NULL.",
      },
    ],
    explanation_md:
      "`a IS DISTINCT FROM b` es la comparación que nunca devuelve UNKNOWN: es verdadera cuando los valores difieren o cuando uno es NULL y el otro no, y falsa cuando ambos son NULL. Es la herramienta correcta para detectar cambios entre dos versiones de un dato, porque «pasó de vacío a tener valor» es justamente uno de los cambios que te interesa ver. Su opuesta es `IS NOT DISTINCT FROM`.",
    is_published: true,
  },
  {
    slug: "null-q13-vacio-contra-null",
    section,
    lesson: coalesce,
    type: "scenario",
    difficulty: "intermediate",
    topic: "NULL frente a cadena vacía",
    tags: ["null_handling", "calidad_de_datos"],
    estimated_seconds: 65,
    prompt_md:
      "En la tabla `contactos` de un sistema interno, la columna `phone` tiene filas con NULL y filas con la cadena vacía, según por qué formulario entró cada persona. Te piden cuántos contactos no dejaron teléfono. ¿Qué corresponde hacer?",
    options: [
      {
        key: "a",
        body_md:
          "Contar los dos casos (`phone IS NULL OR phone = ''`), entregar el total y avisar que el sistema guarda «sin teléfono» de dos formas distintas.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Usar `count(phone)` y restarlo del total de contactos.",
        is_correct: false,
        why_incorrect_md:
          "`count(phone)` solo ignora los NULL. La cadena vacía es un valor como cualquier otro y se cuenta como si fuera un teléfono, así que el resultado queda corto.",
      },
      {
        key: "c",
        body_md: "Filtrar con `phone IS NULL`: en SQL una cadena vacía es NULL.",
        is_correct: false,
        why_incorrect_md:
          "En PostgreSQL una cadena vacía es un texto de longitud cero, un valor perfectamente conocido, y no es NULL. La confusión viene de Oracle, que sí los trata igual; en el resto de los motores no es así.",
      },
      {
        key: "d",
        body_md: "Filtrar con `phone = ''`, porque ese filtro también alcanza a los NULL.",
        is_correct: false,
        why_incorrect_md:
          "Comparar NULL con la cadena vacía da UNKNOWN, así que esas filas no pasan el filtro. Es el mismo error que la opción anterior, con los casos invertidos.",
      },
    ],
    explanation_md:
      "NULL significa «no sabemos»; la cadena vacía significa «sabemos que está vacío». Que las dos convivan en una columna casi siempre indica dos caminos de carga distintos, y eso es parte de la respuesta que entregas: el número por sí solo esconde que la base representa lo mismo de dos maneras.",
    is_published: true,
  },
  {
    slug: "null-q14-tabla-de-verdad",
    section,
    lesson: logica,
    type: "matching",
    difficulty: "advanced",
    topic: "Lógica de tres valores en AND y OR",
    tags: ["null_handling", "logica"],
    estimated_seconds: 85,
    prompt_md:
      "Una fila tiene `is_active` en NULL. Relaciona cada condición del `WHERE` con lo que el motor decide para esa fila.",
    pairs: [
      { left: "is_active OR true", right: "Verdadero: la fila pasa el filtro" },
      { left: "is_active AND false", right: "Falso: la fila no pasa el filtro" },
      { left: "is_active AND true", right: "UNKNOWN: la fila no pasa el filtro" },
      { left: "NOT is_active", right: "UNKNOWN: la fila no pasa el filtro" },
      { left: "is_active IS NULL", right: "Verdadero: la fila pasa el filtro" },
    ],
    explanation_md:
      "`OR` con algo verdadero da verdadero aunque el otro lado sea desconocido, y `AND` con algo falso da falso por el mismo motivo: en esos dos casos el valor que falta ya no cambia nada. En el resto, el UNKNOWN se propaga, y `NOT UNKNOWN` sigue siendo UNKNOWN: no se puede negar algo que no sabes si es cierto. Como el `WHERE` deja pasar solo lo verdadero, UNKNOWN y falso terminan en el mismo lugar, y por eso el error es tan difícil de ver.",
    is_published: true,
  },
];
