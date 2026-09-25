import type { QuestionDef } from "../schemas/question";

const section = "distinct";
const lesson = "distinct-valores-unicos";

export const questions: QuestionDef[] = [
  {
    slug: "distinct-q01-fila-completa",
    section,
    lesson,
    type: "single",
    difficulty: "easy",
    topic: "Alcance de DISTINCT",
    tags: ["distinct"],
    estimated_seconds: 40,
    prompt_md: "¿Qué filas elimina esta consulta?",
    code_md: "```sql\nSELECT DISTINCT carrier, destination_city\nFROM shipments;\n```",
    options: [
      {
        key: "a",
        body_md: "Las que repiten la **misma combinación** de transportista y ciudad.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Las que repiten el transportista, sin importar la ciudad.",
        is_correct: false,
        why_incorrect_md:
          "`DISTINCT` compara la fila completa del resultado, no solo la primera columna.",
      },
      {
        key: "c",
        body_md: "Ninguna; `DISTINCT` solo funciona con una columna.",
        is_correct: false,
        why_incorrect_md: "`DISTINCT` acepta cualquier cantidad de columnas.",
      },
    ],
    explanation_md:
      "`DISTINCT` se aplica a todas las columnas listadas: dos filas son duplicadas solo si coinciden en todas.",
    is_published: true,
  },
  {
    slug: "distinct-q02-null",
    section,
    lesson,
    type: "single",
    difficulty: "easy",
    topic: "DISTINCT y NULL",
    tags: ["distinct", "null_handling"],
    estimated_seconds: 40,
    prompt_md:
      "En `categories`, 6 categorías tienen `parent_id` NULL y las demás apuntan a 6 padres distintos. ¿Cuántas filas devuelve `SELECT DISTINCT parent_id FROM categories;`?",
    options: [
      { key: "a", body_md: "7", is_correct: true },
      {
        key: "b",
        body_md: "6",
        is_correct: false,
        why_incorrect_md: "Los NULL también aparecen en el resultado, agrupados en una sola fila.",
      },
      {
        key: "c",
        body_md: "12",
        is_correct: false,
        why_incorrect_md:
          "`DISTINCT` considera iguales a todos los NULL: aparece una única fila NULL.",
      },
    ],
    explanation_md:
      "6 padres distintos + 1 fila NULL = 7. Para `DISTINCT` (y para `GROUP BY`), los NULL se agrupan entre sí.",
    is_published: true,
  },
  {
    slug: "distinct-q03-posicion",
    section,
    lesson,
    type: "query_interpretation",
    difficulty: "intermediate",
    topic: "Posición de DISTINCT",
    tags: ["distinct", "sintaxis"],
    estimated_seconds: 50,
    prompt_md:
      "Alguien quiere la lista de países sin repetir y escribe `DISTINCT` al final. `customers` tiene 3 000 filas y 6 países distintos. La consulta corre **sin error**. ¿Qué devuelve?",
    code_md: "```sql\nSELECT country DISTINCT\nFROM customers;\n```",
    options: [
      {
        key: "a",
        body_md:
          "Las 3 000 filas, con países repetidos, en una columna llamada `distinct`: PostgreSQL leyó la palabra como un alias de `country`.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Los 6 países sin repetir, igual que `SELECT DISTINCT country`.",
        is_correct: false,
        why_incorrect_md:
          "`DISTINCT` solo elimina repetidos cuando va inmediatamente después de `SELECT`. Escrito después de la columna, PostgreSQL lo toma como el nombre de la columna en el resultado.",
      },
      {
        key: "c",
        body_md: "Un error de sintaxis, porque `DISTINCT` está en el lugar equivocado.",
        is_correct: false,
        why_incorrect_md:
          "Es lo que uno esperaría, pero PostgreSQL acepta casi cualquier palabra como alias aunque no lleve `AS`, incluida `DISTINCT`. Por eso no hay ningún aviso.",
      },
    ],
    explanation_md:
      "`DISTINCT` se escribe inmediatamente después de `SELECT`: `SELECT DISTINCT country FROM customers;` devuelve 6 filas. Como `AS` es opcional, una palabra escrita después de una columna se lee como su alias, y la consulta corre sin eliminar ningún repetido. Si el resultado tiene tantas filas como la tabla y una columna con un nombre raro, revisa la posición de `DISTINCT`.",
    is_published: true,
  },
  {
    slug: "distinct-q04-cuando-usar",
    section,
    lesson,
    type: "scenario",
    difficulty: "intermediate",
    topic: "Criterio de uso",
    tags: ["distinct", "readability"],
    estimated_seconds: 50,
    prompt_md:
      "Una consulta que lista pedidos con su pago devuelve más filas que pedidos existen. Alguien propone agregar `DISTINCT`. ¿Qué conviene hacer primero?",
    options: [
      {
        key: "a",
        body_md:
          "Investigar por qué se multiplican las filas (por ejemplo, pedidos con más de un pago).",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Agregar `DISTINCT`: el resultado quedará correcto.",
        is_correct: false,
        why_incorrect_md:
          "Esconde el síntoma. Si un pedido tiene dos pagos con montos distintos, `DISTINCT` no los une y además puedes perder información relevante.",
      },
      {
        key: "c",
        body_md: "Agregar `LIMIT` para que coincida con la cantidad de pedidos.",
        is_correct: false,
        why_incorrect_md: "`LIMIT` corta filas arbitrariamente; no corrige la lógica.",
      },
    ],
    explanation_md:
      "Filas de más suelen indicar una relación uno-a-muchos en un `JOIN`. Entender la causa evita reportes incorrectos.",
    is_published: true,
  },
  {
    slug: "distinct-q05-order-by",
    section,
    lesson,
    type: "true_false",
    difficulty: "easy",
    topic: "DISTINCT con ORDER BY",
    tags: ["distinct", "order_by"],
    estimated_seconds: 30,
    prompt_md:
      "Verdadero o falso: `SELECT DISTINCT currency FROM products ORDER BY currency;` devuelve las monedas sin repetir y ordenadas.",
    options: [
      { key: "a", body_md: "Verdadero", is_correct: true },
      {
        key: "b",
        body_md: "Falso",
        is_correct: false,
        why_incorrect_md:
          "`ORDER BY` se aplica sobre el resultado ya sin duplicados; ambas cláusulas conviven sin problema.",
      },
    ],
    explanation_md:
      "El orden lógico es: `FROM` → `SELECT DISTINCT` → `ORDER BY`. Primero se eliminan duplicados, luego se ordena.",
    is_published: true,
  },
  {
    slug: "distinct-q06-filas",
    section,
    lesson,
    type: "fill_blank",
    difficulty: "very_easy",
    topic: "Explorar valores existentes",
    tags: ["distinct"],
    estimated_seconds: 30,
    prompt_md:
      "Antes de filtrar por estado, quieres ver qué valores de `status` existen en la tabla `orders`, cada uno una sola vez. Completa la palabra clave que falta: `SELECT ___ status FROM orders;`. Escribe solo la palabra clave.",
    answer: {
      accepted: [
        "DISTINCT",
        "SELECT DISTINCT",
        "SELECT DISTINCT status",
        "SELECT DISTINCT status FROM orders",
      ],
      case_sensitive: false,
    },
    explanation_md:
      "`SELECT DISTINCT status FROM orders;` devuelve cada estado una sola vez. Es la forma más rápida de comprobar cómo están escritos los valores en la base (por ejemplo, `delivered` en minúsculas) antes de usarlos en un filtro.",
    is_published: true,
  },
  {
    slug: "distinct-q07-costo",
    section,
    lesson,
    type: "multiple",
    difficulty: "intermediate",
    topic: "Criterio de uso",
    tags: ["distinct", "performance"],
    estimated_seconds: 50,
    prompt_md:
      "¿Cuáles de estas afirmaciones sobre `DISTINCT` son correctas? Selecciona todas las que apliquen.",
    options: [
      {
        key: "a",
        body_md:
          "Obliga al motor a comparar todas las filas del resultado para eliminar repetidas.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Es una forma adecuada de responder «qué valores existen en una columna».",
        is_correct: true,
      },
      {
        key: "c",
        body_md: "Cambia los valores de las filas que devuelve.",
        is_correct: false,
        why_incorrect_md: "Solo elimina repeticiones; nunca modifica valores.",
      },
      {
        key: "d",
        body_md: "Ignora las filas con NULL.",
        is_correct: false,
        why_incorrect_md: "Los NULL se conservan, agrupados en una única fila.",
      },
    ],
    explanation_md:
      "Para eliminar repetidos, el motor tiene que ordenar o agrupar las filas, y ese trabajo crece con la cantidad de filas. `DISTINCT` es una herramienta adecuada para listar valores únicos; no modifica valores ni descarta NULL.",
    is_published: true,
  },
  {
    slug: "distinct-q08-interpretar",
    section,
    lesson,
    type: "query_interpretation",
    difficulty: "easy",
    topic: "Lectura de consultas",
    tags: ["distinct"],
    estimated_seconds: 40,
    prompt_md: "¿Qué pregunta de negocio responde esta consulta?",
    code_md: "```sql\nSELECT DISTINCT customer_id\nFROM orders;\n```",
    options: [
      { key: "a", body_md: "Qué clientes hicieron al menos un pedido.", is_correct: true },
      {
        key: "b",
        body_md: "Cuántos pedidos hizo cada cliente.",
        is_correct: false,
        why_incorrect_md:
          "Eso requiere contar por cliente (`GROUP BY`, sección 15); aquí solo se listan ids únicos.",
      },
      {
        key: "c",
        body_md: "Todos los clientes registrados.",
        is_correct: false,
        why_incorrect_md:
          "Solo aparecen los clientes presentes en `orders`; quienes nunca compraron no están.",
      },
    ],
    explanation_md:
      "Listar `customer_id` únicos de `orders` equivale a «clientes con al menos un pedido».",
    is_published: true,
  },
  {
    slug: "distinct-q09-parentesis",
    section,
    lesson,
    type: "single",
    difficulty: "intermediate",
    topic: "DISTINCT no es una función",
    tags: ["distinct", "sintaxis"],
    estimated_seconds: 50,
    prompt_md:
      "Alguien escribe `SELECT DISTINCT(country), city FROM customers;` creyendo que así elimina los países repetidos y deja la ciudad como dato extra. La consulta corre sin error. ¿Qué devuelve?",
    options: [
      {
        key: "a",
        body_md:
          "Lo mismo que `SELECT DISTINCT country, city`: una fila por combinación distinta de país y ciudad. Los paréntesis solo agrupan la expresión `country`.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Una fila por país, con la primera ciudad que encuentre para cada uno.",
        is_correct: false,
        why_incorrect_md:
          "`DISTINCT` no elige una fila por país: compara las filas completas del resultado, y dos filas con el mismo país y distinta ciudad son distintas. Para quedarte con una fila por país necesitas decir con qué criterio, y eso ya no es trabajo de `DISTINCT`.",
      },
      {
        key: "c",
        body_md: "Una fila por país, con la ciudad en blanco.",
        is_correct: false,
        why_incorrect_md:
          "Ninguna cláusula vacía columnas del resultado. Si `city` está en el `SELECT`, cada fila trae su valor y esa columna participa de la comparación.",
      },
      {
        key: "d",
        body_md: "Un error, porque `DISTINCT` no acepta paréntesis.",
        is_correct: false,
        why_incorrect_md:
          "Los acepta, y ese es el problema: se leen como los paréntesis de cualquier expresión, la consulta corre y el resultado no es el que quien la escribió esperaba.",
      },
    ],
    explanation_md:
      "`DISTINCT` no es una función que se aplique a una columna: es una cláusula que se aplica a toda la fila del resultado. Escribirlo con paréntesis produce una consulta válida cuyo significado no coincide con la intención, que es la peor combinación posible. Si de verdad necesitas una fila por país, el camino es agrupar y decidir qué hacer con la ciudad.",
    is_published: true,
  },
  {
    slug: "distinct-q10-duplicados-que-no-lo-son",
    section,
    lesson,
    type: "scenario",
    difficulty: "intermediate",
    topic: "Lo que DISTINCT no puede unir",
    tags: ["distinct", "calidad_de_datos"],
    estimated_seconds: 55,
    prompt_md:
      "En una tabla `contactos` cargada desde un formulario de texto libre, `SELECT DISTINCT city FROM contactos;` devuelve, entre otras filas, `Bogotá`, `bogota` y `Bogotá ` (con un espacio al final). Te piden la lista de ciudades donde hay contactos. ¿Qué corresponde?",
    options: [
      {
        key: "a",
        body_md:
          "Reportar que la columna tiene la misma ciudad escrita de varias maneras: `DISTINCT` compara textos exactos y no puede saber que las tres son la misma ciudad.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Volver a ejecutar la consulta: `DISTINCT` falló en eliminar los duplicados.",
        is_correct: false,
        why_incorrect_md:
          "`DISTINCT` hizo exactamente lo que define: para el motor, tres textos que difieren en una tilde, una mayúscula o un espacio son tres valores distintos. No hay nada que reintentar.",
      },
      {
        key: "c",
        body_md: "Entregar la lista tal cual: es lo que hay en la base.",
        is_correct: false,
        why_incorrect_md:
          "Es lo que hay en la base, pero la pregunta era por ciudades, no por escrituras. Entregar 3 filas donde hay 1 ciudad hace que quien lo lea cuente mal sus mercados.",
      },
      {
        key: "d",
        body_md: "Borrar las filas repetidas de la tabla para que la consulta quede limpia.",
        is_correct: false,
        why_incorrect_md:
          "No son filas repetidas: son contactos distintos con la ciudad mal escrita. Y un análisis no modifica los datos de origen; el arreglo se acuerda con quien es responsable de esa tabla.",
      },
    ],
    explanation_md:
      "`DISTINCT` elimina filas idénticas, no filas equivalentes. Encontrar variantes de escritura es uno de los usos más valiosos que tiene: no te da la lista limpia, te muestra que la columna necesita normalizarse. En el informe conviene entregar la lista normalizada y, aparte, las variantes encontradas.",
    is_published: true,
  },
];
