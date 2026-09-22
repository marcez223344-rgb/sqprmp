import type { QuestionDef } from "../schemas/question";

const section = "funciones-de-texto";
const normalizar = "texto-normalizar-y-limpiar";
const extraer = "texto-extraer-y-combinar";

export const questions: QuestionDef[] = [
  {
    slug: "texto-q01-detectar-mayusculas",
    section,
    lesson: normalizar,
    type: "single",
    difficulty: "easy",
    topic: "Normalización de texto",
    tags: ["text_functions", "calidad-de-datos"],
    estimated_seconds: 45,
    prompt_md:
      "En `customers` hay correos guardados en mayúsculas. ¿Cuál de estas condiciones devuelve **solo** esos registros?",
    code_md: null,
    options: [
      { key: "a", body_md: "`WHERE email <> LOWER(email)`", is_correct: true },
      {
        key: "b",
        body_md: "`WHERE email = LOWER(email)`",
        is_correct: false,
        why_incorrect_md:
          "Devuelve el conjunto contrario: los correos que **ya** están correctamente guardados en minúsculas.",
      },
      {
        key: "c",
        body_md: "`WHERE LOWER(email) <> LOWER(email)`",
        is_correct: false,
        why_incorrect_md:
          "Ambos lados son idénticos, así que la condición nunca es verdadera y el resultado queda vacío.",
      },
      {
        key: "d",
        body_md: "`WHERE email ILIKE LOWER(email)`",
        is_correct: false,
        why_incorrect_md:
          "`ILIKE` ignora la capitalización, por lo que coincide con todos los correos, estén bien o mal guardados.",
      },
    ],
    explanation_md:
      "Un texto ya normalizado es igual a su versión en minúsculas. La desigualdad `columna <> FUNCION(columna)` aísla justamente las filas que no cumplen la regla, y sirve igual con `TRIM` o `INITCAP`.",
    is_published: true,
  },
  {
    slug: "texto-q02-acentos",
    section,
    lesson: normalizar,
    type: "true_false",
    difficulty: "intermediate",
    topic: "Acentos y comparaciones",
    tags: ["text_functions", "acentos"],
    estimated_seconds: 40,
    prompt_md:
      "Verdadero o falso: aplicar `LOWER()` a los dos lados de una comparación hace que `'José'` y `'Jose'` se consideren iguales.",
    code_md: null,
    options: [
      {
        key: "a",
        body_md: "Falso: `LOWER('José') = LOWER('Jose')` sigue siendo falso.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Verdadero: al normalizar la capitalización también se normalizan los acentos.",
        is_correct: false,
        why_incorrect_md:
          "Son dos problemas distintos. `LOWER` cambia mayúsculas por minúsculas y conserva la tilde: `é` y `e` siguen siendo caracteres diferentes.",
      },
    ],
    explanation_md:
      "`LOWER('José')` devuelve `josé`, no `jose`. Para tratar ambas escrituras como iguales hay que quitar las tildes explícitamente (por ejemplo con `TRANSLATE`), y esa decisión debe acordarse con el negocio: en español la tilde puede cambiar el significado.",
    is_published: true,
  },
  {
    slug: "texto-q03-length-caracteres",
    section,
    lesson: normalizar,
    type: "fill_blank",
    difficulty: "easy",
    topic: "LENGTH",
    tags: ["text_functions", "length"],
    estimated_seconds: 40,
    prompt_md: "¿Qué devuelve `SELECT LENGTH('Rincón');` en PostgreSQL? Escribe solo el número.",
    code_md: null,
    answer: { accepted: ["6"], case_sensitive: false },
    explanation_md:
      "`LENGTH` cuenta **caracteres**, y `ó` es un solo carácter: el resultado es 6. `OCTET_LENGTH('Rincón')` devolvería 7, porque en UTF-8 la `ó` ocupa dos bytes. Usa caracteres para validar límites de texto y bytes para dimensionar almacenamiento.",
    is_published: true,
  },
  {
    slug: "texto-q04-replace-conjunto",
    section,
    lesson: extraer,
    type: "error_diagnosis",
    difficulty: "intermediate",
    topic: "REPLACE vs TRIM",
    tags: ["text_functions", "replace", "trim"],
    estimated_seconds: 60,
    prompt_md:
      "Se quiere quitar el número final de nombres como `Rincón Urbano 6`, pero la consulta devuelve los nombres sin cambios. ¿Por qué?",
    code_md:
      "```sql\nSELECT store_name,\n       REPLACE(store_name, '0123456789', '') AS nombre_comercial\nFROM sellers;\n```",
    options: [
      {
        key: "a",
        body_md:
          "`REPLACE` busca la cadena completa `'0123456789'`, que nunca aparece; no interpreta el argumento como un conjunto de caracteres.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "`REPLACE` solo reemplaza la primera aparición y por eso no alcanza.",
        is_correct: false,
        why_incorrect_md:
          "`REPLACE` reemplaza **todas** las apariciones; el problema es qué está buscando, no cuántas veces.",
      },
      {
        key: "c",
        body_md: "Falta convertir `store_name` a texto antes de reemplazar.",
        is_correct: false,
        why_incorrect_md: "`store_name` ya es `text`; no hay ninguna conversión pendiente.",
      },
      {
        key: "d",
        body_md: "`REPLACE` no puede recibir una cadena vacía como tercer argumento.",
        is_correct: false,
        why_incorrect_md:
          "Sí puede: reemplazar por cadena vacía es la forma habitual de eliminar texto.",
      },
    ],
    explanation_md:
      "Para eliminar cualquiera de varios caracteres en un extremo se usa `RTRIM(store_name, ' 0123456789')`, donde el segundo argumento sí es un conjunto. `REPLACE` trabaja con la cadena completa que le pasas.",
    is_published: true,
  },
  {
    slug: "texto-q05-split-part-dominio",
    section,
    lesson: extraer,
    type: "query_interpretation",
    difficulty: "easy",
    topic: "SPLIT_PART",
    tags: ["text_functions", "split_part"],
    estimated_seconds: 45,
    prompt_md: "¿Qué devuelve esta consulta?",
    code_md:
      "```sql\nSELECT DISTINCT SPLIT_PART(LOWER(email), '@', 2) AS dominio\nFROM customers;\n```",
    options: [
      {
        key: "a",
        body_md: "Los dominios de correo distintos usados por los clientes.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "El nombre de usuario de cada correo, sin repetir.",
        is_correct: false,
        why_incorrect_md:
          "El usuario es el trozo 1. El trozo 2 es lo que está después de la `@`, es decir, el dominio.",
      },
      {
        key: "c",
        body_md: "Los correos completos, en minúsculas y sin duplicados.",
        is_correct: false,
        why_incorrect_md:
          "`SPLIT_PART` devuelve solo una parte del texto; el correo completo se perdería.",
      },
      {
        key: "d",
        body_md: "La cantidad de clientes por dominio.",
        is_correct: false,
        why_incorrect_md:
          "No hay ningún conteo: contar por grupo requiere agregación (`GROUP BY`, sección 15).",
      },
    ],
    explanation_md:
      "`SPLIT_PART(texto, '@', 2)` toma el segundo trozo al partir por `@`. El `LOWER` previo evita que un correo guardado en mayúsculas genere un dominio «distinto» (`EJEMPLO.LAT` frente a `ejemplo.lat`).",
    is_published: true,
  },
  {
    slug: "texto-q06-funciones-y-usos",
    section,
    lesson: extraer,
    type: "matching",
    difficulty: "easy",
    topic: "Catálogo de funciones de texto",
    tags: ["text_functions"],
    estimated_seconds: 90,
    prompt_md: "Relaciona cada función con lo que hace.",
    code_md: null,
    pairs: [
      { left: "TRIM", right: "Elimina espacios (u otros caracteres) en los extremos del texto" },
      { left: "INITCAP", right: "Deja en mayúscula la primera letra de cada palabra" },
      {
        left: "POSITION",
        right: "Indica en qué carácter aparece un texto buscado, o 0 si no está",
      },
      { left: "SPLIT_PART", right: "Devuelve el trozo n del texto partido por un separador" },
      { left: "LENGTH", right: "Cuenta la cantidad de caracteres" },
      { left: "||", right: "Une dos textos en uno solo" },
    ],
    explanation_md:
      "Son las seis herramientas que cubren casi toda la limpieza de texto: normalizar extremos, normalizar capitalización, ubicar, cortar, medir y unir.",
    is_published: true,
  },
  {
    slug: "texto-q07-concatenar-null",
    section,
    lesson: extraer,
    type: "multiple",
    difficulty: "intermediate",
    topic: "Concatenación",
    tags: ["text_functions", "null_handling", "concat"],
    estimated_seconds: 60,
    prompt_md:
      "¿Cuáles de estas afirmaciones sobre concatenar texto en PostgreSQL son correctas? Selecciona todas las que apliquen.",
    code_md: null,
    options: [
      {
        key: "a",
        body_md: "`'Pedido ' || NULL` devuelve NULL, no `'Pedido '`.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "`CONCAT('a', NULL, 'b')` devuelve `'ab'`: trata el NULL como cadena vacía.",
        is_correct: true,
      },
      {
        key: "c",
        body_md: "`'Pedido ' || id` funciona aunque `id` sea un número.",
        is_correct: true,
      },
      {
        key: "d",
        body_md: "`||` elimina automáticamente los espacios sobrantes de los textos que une.",
        is_correct: false,
        why_incorrect_md:
          "No modifica nada: pega los textos tal cual. Si quieres limpiar los extremos, aplica `TRIM` antes.",
      },
      {
        key: "e",
        body_md: "`||` solo acepta dos operandos.",
        is_correct: false,
        why_incorrect_md:
          "Puedes encadenar tantos como necesites: `country || ' · ' || city || ' · ' || email`.",
      },
    ],
    explanation_md:
      "La diferencia clave es cómo tratan el NULL: `||` lo propaga (una sola columna vacía anula toda la etiqueta) y `CONCAT` lo ignora. Si usas `||` con columnas que pueden faltar, protégelas con `COALESCE`.",
    is_published: true,
  },
  {
    slug: "texto-q08-filtro-con-espacio",
    section,
    lesson: normalizar,
    type: "scenario",
    difficulty: "intermediate",
    topic: "Diagnóstico de filtros de texto",
    tags: ["text_functions", "trim", "missing_filter"],
    estimated_seconds: 60,
    prompt_md:
      "Un filtro `WHERE city = 'Lima'` devuelve menos filas de las esperadas, aunque en la tabla se ven muchas ciudades «Lima». ¿Cuál es el primer diagnóstico razonable?",
    code_md: null,
    options: [
      {
        key: "a",
        body_md:
          "Que algunos valores tengan espacios invisibles o distinta capitalización: conviene revisar con `LENGTH(city)` y comparar contra `TRIM(city)` y `LOWER(city)`.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Que la columna `city` sea NULL en esas filas.",
        is_correct: false,
        why_incorrect_md:
          "Si fuera NULL no se vería «Lima» en la tabla. Además, NULL no coincide con ningún valor, pero tampoco se muestra como texto.",
      },
      {
        key: "c",
        body_md: "Que haga falta usar `LIKE '%Lima%'` para que la igualdad funcione.",
        is_correct: false,
        why_incorrect_md:
          "Esconde el problema y además trae falsos positivos (cualquier ciudad que contenga «Lima»). Primero hay que entender por qué los valores no coinciden.",
      },
      {
        key: "d",
        body_md: "Que PostgreSQL ignora mayúsculas en `=` y por eso el resultado es impredecible.",
        is_correct: false,
        why_incorrect_md:
          "Es al revés: `=` distingue mayúsculas de minúsculas de forma totalmente predecible.",
      },
    ],
    explanation_md:
      "`'Lima ' = 'Lima'` es falso y `'LIMA' = 'Lima'` también. Medir con `LENGTH` y comparar contra la versión normalizada muestra el problema en segundos; después decides si normalizas en la consulta o corriges el origen.",
    is_published: true,
  },
  {
    slug: "texto-q09-position-cero",
    section,
    lesson: extraer,
    type: "single",
    difficulty: "intermediate",
    topic: "POSITION",
    tags: ["text_functions", "position"],
    estimated_seconds: 50,
    prompt_md:
      "¿Qué ocurre con `LEFT(codigo, POSITION('-' IN codigo) - 1)` cuando el valor de `codigo` **no** contiene ningún guion?",
    code_md: null,
    options: [
      {
        key: "a",
        body_md:
          "`POSITION` devuelve 0, el corte queda `LEFT(codigo, -1)` y se obtiene el texto sin su último carácter: un valor incorrecto, sin error.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "La consulta falla con un error de rango.",
        is_correct: false,
        why_incorrect_md:
          "PostgreSQL acepta longitudes negativas en `LEFT`; no hay error que te avise.",
      },
      {
        key: "c",
        body_md: "`POSITION` devuelve NULL y toda la expresión queda en NULL.",
        is_correct: false,
        why_incorrect_md:
          "`POSITION` devuelve 0 cuando no encuentra el texto buscado; solo devuelve NULL si alguno de sus argumentos es NULL.",
      },
      {
        key: "d",
        body_md: "Devuelve el texto completo, porque no hay nada que cortar.",
        is_correct: false,
        why_incorrect_md:
          "`LEFT` con un valor negativo quita caracteres desde el final; no devuelve el texto intacto.",
      },
    ],
    explanation_md:
      "Es una de las trampas más silenciosas del trabajo con texto. `SPLIT_PART` evita el problema (devuelve cadena vacía si el separador no aparece); con `POSITION`, valida antes que el separador exista.",
    is_published: true,
  },
  {
    slug: "texto-q10-split-part-indice",
    section,
    lesson: extraer,
    type: "fill_blank",
    difficulty: "easy",
    topic: "SPLIT_PART",
    tags: ["text_functions", "split_part"],
    estimated_seconds: 40,
    prompt_md:
      "Completa el índice que falta para quedarte con la referencia numérica de `'Transferencia #1841'`: `SPLIT_PART(description, '#', ___)`. Escribe solo el número.",
    code_md: null,
    answer: { accepted: ["2"], case_sensitive: false },
    explanation_md:
      "`SPLIT_PART` numera los trozos desde 1: el trozo 1 es `'Transferencia '` y el 2 es `'1841'`. El resultado es texto; si necesitas ordenarlo como número, conviértelo con `CAST(... AS integer)`.",
    is_published: true,
  },
];
