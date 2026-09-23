import {
  defaultHintMeta,
  defaultReward,
  defaultSolutionUnlock,
  type ExerciseDef,
} from "../schemas/exercise";

const section = "funciones-de-texto";
const tiendaviva = { slug: "tiendaviva", version: 1 };
const bolsillo = { slug: "bolsillo", version: 1 };
const normalizar = "texto-normalizar-y-limpiar";
const extraer = "texto-extraer-y-combinar";

export const exercises: ExerciseDef[] = [
  {
    slug: "correos-normalizados",
    section,
    title: "Correos en un formato único",
    difficulty: "very_easy",
    estimated_minutes: 3,
    concepts: ["select", "alias", "text_functions"],
    dataset: tiendaviva,
    tables_used: ["customers"],
    scenario_md:
      "El equipo de CRM va a cargar la base de clientes de **TiendaViva** en la herramienta de envíos. Esa herramienta trata `ANA@EJEMPLO.LAT` y `ana@ejemplo.lat` como dos personas distintas, así que pide los correos siempre en minúsculas.",
    business_question_md:
      "Devuelve, para los clientes de Uruguay (`country = 'UY'`), `id`, `full_name` y su correo pasado a minúsculas en una columna llamada `email_normalizado`. El orden no importa.",
    learning_objective: "Aplicar LOWER a una columna de texto y nombrar el resultado con un alias.",
    theory_ref: normalizar,
    expected_columns: [
      { name: "id", type: "integer" },
      { name: "full_name", type: "text" },
      { name: "email_normalizado", type: "text" },
    ],
    validation_rules: { required_concepts: ["text_functions", "alias"] },
    reference_solution:
      "SELECT id,\n       full_name,\n       LOWER(email) AS email_normalizado\nFROM customers\nWHERE country = 'UY';",
    alternative_solutions: [
      {
        label: "Con TRIM defensivo (mismo resultado en este dataset)",
        sql: "SELECT id,\n       full_name,\n       LOWER(TRIM(email)) AS email_normalizado\nFROM customers\nWHERE country = 'UY';",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Existe una función de texto que convierte cualquier cadena a minúsculas. No necesitas filtrar ni ordenar nada: son las mismas filas de la tabla, con una columna transformada.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Usa `LOWER()` sobre la columna `email` de `customers` y renómbrala con `AS` para que salga con el nombre que pide CRM. Las otras dos columnas se devuelven tal cual.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT id,\n       full_name,\n       ___(___) AS ___\nFROM customers;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "wrong_columns",
        description_md:
          "Devolver la columna sin alias: queda como `lower` y CRM espera `email_normalizado`.",
      },
      {
        category: "wrong_columns",
        description_md:
          "Usar `UPPER` en lugar de `LOWER`: el pedido es explícito sobre el formato en minúsculas.",
      },
      {
        category: "missing_filter",
        description_md:
          "Agregar un `WHERE` para quedarte solo con los correos que hoy están en mayúsculas: se pide la lista completa de clientes.",
      },
      {
        category: "syntax",
        description_md:
          "Escribir `LOWER email` sin paréntesis. Las funciones siempre reciben sus argumentos entre paréntesis.",
      },
    ],
    expert_explanation_md:
      "3000 filas, una por cliente. `LOWER` no modifica la tabla: transforma el valor solo en el resultado de la consulta, así que es una operación segura para explorar.\n\nNormalizar al momento de leer es lo habitual cuando no puedes corregir el origen. Si el problema se repite, la solución definitiva es normalizar al escribir (o crear un índice sobre `LOWER(email)`), porque aplicar la función a millones de filas en cada consulta cuesta tiempo.\n\nDetalle útil: `LOWER` respeta los acentos (`LOWER('CAFÉ')` devuelve `café`), pero no los elimina.",
    reward: defaultReward("very_easy"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "correos-con-mayusculas",
    section,
    title: "Auditoría: correos mal guardados",
    difficulty: "easy",
    estimated_minutes: 6,
    concepts: ["select", "where", "alias", "text_functions"],
    dataset: tiendaviva,
    tables_used: ["customers"],
    scenario_md:
      "Antes de migrar la base, Datos quiere el listado exacto de los registros a corregir: clientes cuyo correo **no** está guardado en minúsculas. Son los que generan cuentas duplicadas cuando alguien se registra dos veces escribiendo distinto.",
    business_question_md:
      "Devuelve `id`, `full_name`, el correo tal como está guardado (`email`) y su versión en minúsculas en una columna `email_normalizado`, **solo** para los clientes cuyo correo almacenado difiere de su versión en minúsculas. El orden no importa.",
    learning_objective:
      "Comparar una columna de texto con su versión normalizada para detectar problemas de calidad.",
    theory_ref: normalizar,
    expected_columns: [
      { name: "id", type: "integer" },
      { name: "full_name", type: "text" },
      { name: "email", type: "text" },
      { name: "email_normalizado", type: "text" },
    ],
    validation_rules: { required_concepts: ["text_functions", "where"] },
    reference_solution:
      "SELECT id,\n       full_name,\n       email,\n       LOWER(email) AS email_normalizado\nFROM customers\nWHERE email <> LOWER(email);",
    alternative_solutions: [
      {
        label: "Con NOT ... =",
        sql: "SELECT id,\n       full_name,\n       email,\n       LOWER(email) AS email_normalizado\nFROM customers\nWHERE NOT (email = LOWER(email));",
      },
      {
        label: "Comparando la versión en minúsculas con la original",
        sql: "SELECT id,\n       full_name,\n       email,\n       LOWER(email) AS email_normalizado\nFROM customers\nWHERE LOWER(email) <> email;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Un texto ya escrito en minúsculas es idéntico a su versión en minúsculas. Los registros con problema son justamente aquellos donde esa igualdad no se cumple.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "En el `WHERE` compara la columna `email` con el resultado de aplicarle `LOWER()`, usando el operador de desigualdad `<>`. En el `SELECT` devuelve las dos versiones para que Datos pueda revisarlas lado a lado.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT id,\n       full_name,\n       email,\n       ___(email) AS email_normalizado\nFROM customers\nWHERE ___ ___ ___;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "missing_filter",
        description_md:
          "Omitir el `WHERE`: devuelves los 3000 clientes en vez de los que hay que corregir.",
      },
      {
        category: "cell_values",
        description_md:
          "Filtrar con `email = LOWER(email)`: obtienes exactamente el conjunto contrario, los correos que ya están bien.",
      },
      {
        category: "wrong_columns",
        description_md:
          "Devolver solo el correo normalizado: sin el valor original, Datos no puede identificar qué cambió.",
      },
      {
        category: "null_handling",
        description_md:
          "Suponer que un correo NULL aparecería en el resultado: `NULL <> LOWER(NULL)` es NULL, no verdadero, así que quedaría fuera del filtro.",
      },
    ],
    expert_explanation_md:
      "39 filas. Son correos guardados íntegramente en mayúsculas (`JULIETA.CASTRO109@EJEMPLO.LAT`), un patrón típico de formularios cargados desde una app antigua.\n\nEl truco `columna <> FUNCION(columna)` sirve para cualquier regla de normalización: `city <> TRIM(city)` encuentra espacios sobrantes, `name <> INITCAP(name)` encuentra nombres mal capitalizados. Es la base de los controles de calidad que verás en la sección 32.\n\nUna aclaración importante: esta consulta detecta el formato incorrecto, no los duplicados. Saber **qué clientes comparten** el mismo correo normalizado requiere comparar filas entre sí (agrupar o subconsultas, secciones 15 y 21). Aquí el objetivo es aislar los registros sospechosos.",
    reward: defaultReward("easy"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "usuario-y-dominio-del-correo",
    section,
    title: "Usuario y dominio de cada correo",
    difficulty: "easy",
    estimated_minutes: 7,
    concepts: ["select", "alias", "text_functions"],
    dataset: tiendaviva,
    tables_used: ["customers"],
    scenario_md:
      "Seguridad quiere saber desde qué proveedores de correo se registran los clientes: si aparece un dominio inesperado, puede indicar cuentas creadas de forma automática.",
    business_question_md:
      "Para los clientes de Uruguay (`country = 'UY'`), devuelve `id`, la parte del correo anterior a la `@` en una columna `usuario` y la parte posterior en una columna `dominio`. Trabaja siempre sobre el correo en minúsculas, para que los registros mal guardados no generen dominios duplicados. El orden no importa.",
    learning_objective:
      "Extraer partes de un texto separadas por un carácter usando SPLIT_PART (o POSITION con LEFT y SUBSTRING).",
    theory_ref: extraer,
    expected_columns: [
      { name: "id", type: "integer" },
      { name: "usuario", type: "text" },
      { name: "dominio", type: "text" },
    ],
    validation_rules: { required_concepts: ["text_functions", "alias"] },
    reference_solution:
      "SELECT id,\n       SPLIT_PART(LOWER(email), '@', 1) AS usuario,\n       SPLIT_PART(LOWER(email), '@', 2) AS dominio\nFROM customers\nWHERE country = 'UY';",
    alternative_solutions: [
      {
        label: "Con POSITION, LEFT y SUBSTRING",
        sql: "SELECT id,\n       LEFT(LOWER(email), POSITION('@' IN LOWER(email)) - 1) AS usuario,\n       SUBSTRING(LOWER(email) FROM POSITION('@' IN LOWER(email)) + 1) AS dominio\nFROM customers\nWHERE country = 'UY';",
      },
      {
        label: "Con POSITION y SUBSTRING en ambas partes",
        sql: "SELECT id,\n       SUBSTRING(LOWER(email) FROM 1 FOR POSITION('@' IN LOWER(email)) - 1) AS usuario,\n       SUBSTRING(LOWER(email) FROM POSITION('@' IN LOWER(email)) + 1) AS dominio\nFROM customers\nWHERE country = 'UY';",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Un correo es un texto partido en dos por un separador conocido. PostgreSQL tiene una función que devuelve directamente el trozo número N de un texto partido por un carácter; también puedes ubicar la `@` y cortar alrededor de esa posición.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "`SPLIT_PART(texto, separador, n)` numera los trozos desde 1: el usuario es el trozo 1 y el dominio el 2, usando `'@'` como separador. Aplica primero `LOWER()` al correo para que los 39 registros en mayúsculas no produzcan un dominio distinto.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT id,\n       SPLIT_PART(___(email), '___', ___) AS usuario,\n       SPLIT_PART(___(email), '___', ___) AS dominio\nFROM customers;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "cell_values",
        description_md:
          "Olvidar `LOWER`: los correos guardados en mayúsculas producen el dominio `EJEMPLO.LAT`, que parece un proveedor distinto.",
      },
      {
        category: "cell_values",
        description_md:
          "Incluir la `@` en alguna de las dos partes, por ejemplo cortando con `LEFT(email, POSITION('@' IN email))` sin restar 1.",
      },
      {
        category: "cell_values",
        description_md:
          "Numerar los trozos desde 0: `SPLIT_PART(..., '@', 0)` produce un error; la numeración empieza en 1.",
      },
      {
        category: "wrong_columns",
        description_md:
          "Devolver también `email`: la consigna pide exactamente tres columnas, y la herramienta de Seguridad las carga por posición.",
      },
    ],
    expert_explanation_md:
      "3000 filas. El hallazgo es que **todos** los dominios son `ejemplo.lat`: no hay proveedores externos ni variantes sospechosas, y eso es exactamente lo que Seguridad quería confirmar.\n\n`SPLIT_PART` y la pareja `POSITION` + `SUBSTRING` son equivalentes aquí y ninguna es «la correcta»: `SPLIT_PART` se lee mejor y no falla si el separador no existe (devuelve cadena vacía), mientras que `POSITION` te permite decidir qué hacer cuando el separador falta, porque devuelve 0.\n\nCuidado con ese 0: si un texto no tuviera `@`, `LEFT(email, 0 - 1)` no da error, devuelve el texto sin su último carácter. Un valor incorrecto que nadie nota es peor que un error.",
    reward: defaultReward("easy"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "nombre-comercial-sin-numero",
    section,
    title: "Nombre comercial listo para mostrar",
    difficulty: "intermediate",
    estimated_minutes: 10,
    concepts: ["select", "alias", "text_functions"],
    dataset: tiendaviva,
    tables_used: ["sellers"],
    scenario_md:
      "Producto va a mostrar el nombre de cada tienda en la portada de la app. Los nombres guardados terminan con un número interno (`Rincón Urbano 6`) que no debe verse. Además, el espacio disponible en el diseño es limitado, así que piden también cuántos caracteres ocupa el nombre limpio.",
    business_question_md:
      "Devuelve, para cada vendedor, su `id`, el `store_name` original, el nombre sin el número final ni el espacio que lo precede en una columna `nombre_comercial`, y la cantidad de caracteres de ese nombre limpio en una columna `largo`. El orden no importa.",
    learning_objective:
      "Limpiar el final de un texto con TRIM sobre un conjunto de caracteres y medir el resultado con LENGTH.",
    theory_ref: normalizar,
    expected_columns: [
      { name: "id", type: "integer" },
      { name: "store_name", type: "text" },
      { name: "nombre_comercial", type: "text" },
      { name: "largo", type: "integer" },
    ],
    validation_rules: { required_concepts: ["text_functions", "alias"] },
    reference_solution:
      "SELECT id,\n       store_name,\n       RTRIM(store_name, ' 0123456789') AS nombre_comercial,\n       LENGTH(RTRIM(store_name, ' 0123456789')) AS largo\nFROM sellers;",
    alternative_solutions: [
      {
        label: "Cortando por longitud del id",
        sql: "SELECT id,\n       store_name,\n       LEFT(store_name, LENGTH(store_name) - LENGTH(id::text) - 1) AS nombre_comercial,\n       LENGTH(LEFT(store_name, LENGTH(store_name) - LENGTH(id::text) - 1)) AS largo\nFROM sellers;",
      },
      {
        label: "Reemplazando el sufijo y limpiando espacios",
        sql: "SELECT id,\n       store_name,\n       TRIM(REPLACE(store_name, ' ' || id, '')) AS nombre_comercial,\n       LENGTH(TRIM(REPLACE(store_name, ' ' || id, ''))) AS largo\nFROM sellers;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "El número siempre está al final, pero no siempre tiene la misma cantidad de dígitos, así que cortar una cantidad fija de caracteres no sirve. Piensa en una limpieza que elimine del extremo derecho cualquier carácter que pertenezca a un conjunto (dígitos y espacio).",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "`RTRIM(texto, caracteres)` elimina por la derecha todos los caracteres que aparezcan en el segundo argumento, hasta encontrar uno que no esté en la lista. Arma ese conjunto con los diez dígitos y el espacio. Para `largo`, aplica `LENGTH` sobre la misma expresión ya limpia, no sobre `store_name`.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT id,\n       store_name,\n       RTRIM(store_name, '___') AS nombre_comercial,\n       ___(RTRIM(store_name, '___')) AS largo\nFROM sellers;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "cell_values",
        description_md:
          "Usar `LEFT(store_name, LENGTH(store_name) - 2)`: funciona con los ids de un dígito y corta letras cuando el id tiene dos o tres.",
      },
      {
        category: "cell_values",
        description_md:
          "Calcular `LENGTH(store_name)`: mide el nombre con el número incluido, no el que se va a mostrar.",
      },
      {
        category: "cell_values",
        description_md:
          "Usar `REPLACE(store_name, '0123456789', '')`: `REPLACE` busca la cadena completa, no cada carácter por separado, así que no elimina nada.",
      },
      {
        category: "wrong_columns",
        description_md:
          "Omitir `store_name` original: Producto lo necesita para comparar antes de publicar el cambio.",
      },
    ],
    expert_explanation_md:
      "180 filas, una por vendedor. `RTRIM(store_name, ' 0123456789')` lee el nombre de derecha a izquierda y descarta caracteres mientras pertenezcan al conjunto indicado: primero los dígitos, después el espacio, y se detiene en la primera letra. Por eso funciona igual con `Bazar Urbano 3` y con `Rincón Tropical 124`.\n\nLas tres soluciones dan el mismo resultado en este dataset, pero no son igual de robustas: la variante con `LENGTH(id::text)` depende de que el sufijo sea exactamente el `id`, y la de `REPLACE` fallaría si el número también apareciera en el medio del nombre. `RTRIM` solo asume «al final hay dígitos y espacios».\n\nMira `Rincón Urbano`: `LENGTH` devuelve 13 porque cuenta **caracteres**, y la `ó` es uno solo. `OCTET_LENGTH` devolvería 14, porque en UTF-8 esa letra ocupa dos bytes. Para validar un límite de diseño quieres caracteres; para dimensionar almacenamiento, bytes.",
    reward: defaultReward("intermediate"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
  {
    slug: "referencia-de-transferencia",
    section,
    title: "Referencia de transferencia para soporte",
    difficulty: "intermediate",
    estimated_minutes: 10,
    concepts: ["select", "where", "alias", "text_functions"],
    dataset: bolsillo,
    tables_used: ["transactions"],
    scenario_md:
      "En **Bolsillo**, cada movimiento de transferencia guarda en `description` un texto del tipo `Transferencia #1841`, donde el número es la referencia que el usuario ve en el comprobante. Soporte necesita esa referencia en una columna propia para poder buscarla, y quiere ver el tipo de movimiento con una palabra entendible en lugar de `transfer_in` / `transfer_out`.",
    business_question_md:
      "Para los movimientos cuyo `kind` es `transfer_in` o `transfer_out` **y cuyo importe supera los 900 000 centavos**, devuelve `id`, `account_id`, la referencia numérica extraída de `description` en una columna `referencia` (como texto, sin el `#`) y una columna `tipo` que valga `Enviada` para `transfer_out` y `Recibida` para `transfer_in`. El orden no importa.",
    learning_objective:
      "Combinar extracción por separador y reemplazo de valores para convertir texto técnico en información legible.",
    theory_ref: extraer,
    expected_columns: [
      { name: "id", type: "integer" },
      { name: "account_id", type: "integer" },
      { name: "referencia", type: "text" },
      { name: "tipo", type: "text" },
    ],
    validation_rules: { required_concepts: ["text_functions", "where"] },
    reference_solution:
      "SELECT id,\n       account_id,\n       SPLIT_PART(description, '#', 2) AS referencia,\n       REPLACE(REPLACE(kind, 'transfer_out', 'Enviada'), 'transfer_in', 'Recibida') AS tipo\nFROM transactions\nWHERE kind IN ('transfer_in', 'transfer_out')\n  AND amount > 900000;",
    alternative_solutions: [
      {
        label: "Con SUBSTRING y POSITION, filtrando por el patrón del texto",
        sql: "SELECT id,\n       account_id,\n       SUBSTRING(description FROM POSITION('#' IN description) + 1) AS referencia,\n       REPLACE(REPLACE(kind, 'transfer_out', 'Enviada'), 'transfer_in', 'Recibida') AS tipo\nFROM transactions\nWHERE description LIKE 'Transferencia #%'\n  AND amount > 900000;",
      },
      {
        label: "Con REPLACE sobre el prefijo completo",
        sql: "SELECT id,\n       account_id,\n       REPLACE(description, 'Transferencia #', '') AS referencia,\n       REPLACE(REPLACE(kind, 'transfer_out', 'Enviada'), 'transfer_in', 'Recibida') AS tipo\nFROM transactions\nWHERE kind IN ('transfer_in', 'transfer_out')\n  AND amount > 900000;",
      },
    ],
    hints: [
      {
        level: 1,
        body_md:
          "Son dos transformaciones independientes sobre la misma fila: de un texto con separador tienes que quedarte con el trozo de la derecha, y de un código técnico tienes que obtener una etiqueta legible. Además, solo te interesan dos de los ocho tipos de movimiento.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Para la referencia, parte `description` por `'#'` y quédate con el segundo trozo (o corta desde la posición del `#` más uno). Para el tipo, anida dos `REPLACE`: el resultado del primero es el argumento del segundo. Filtra con `kind IN (...)`.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT id,\n       account_id,\n       SPLIT_PART(description, '___', ___) AS referencia,\n       ___(___(kind, '___', '___'), '___', '___') AS tipo\nFROM transactions\nWHERE kind ___ (___, ___);\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "missing_filter",
        description_md:
          "No filtrar por `kind`: los movimientos de tipo `topup`, `fee` o `reversal` también tienen `description`, pero sin `#`, y producen referencias vacías.",
      },
      {
        category: "cell_values",
        description_md:
          "Dejar el `#` dentro de `referencia` (por ejemplo con `SUBSTRING(description FROM POSITION('#' IN description))`, sin sumar 1).",
      },
      {
        category: "cell_values",
        description_md:
          "Aplicar los dos `REPLACE` por separado sobre `kind` en vez de anidarlos: el segundo pierde el cambio del primero.",
      },
      {
        category: "cell_values",
        description_md:
          "Reemplazar primero `'transfer_in'`: no afecta a `transfer_out`, pero conviene revisar siempre el orden cuando un texto buscado es prefijo de otro.",
      },
    ],
    expert_explanation_md:
      "8646 filas: 4323 transferencias, cada una con su movimiento de salida y su movimiento de entrada, por lo que cada referencia aparece exactamente dos veces.\n\n`SPLIT_PART(description, '#', 2)` devuelve **texto**, no un número: si Soporte necesitara ordenarlo numéricamente habría que convertirlo con `CAST(... AS integer)`. Para buscar un comprobante, el texto alcanza.\n\nEl filtro por `kind` y el filtro `description LIKE 'Transferencia #%'` devuelven las mismas 8646 filas en este dataset, pero no son lo mismo: el primero se apoya en un campo controlado y el segundo en texto libre, que cualquier cambio de redacción rompería. Cuando existe una columna de estado o tipo, filtra por ella.\n\nAnidar `REPLACE` funciona bien para dos valores; con más reglas, `CASE` (sección 12) es mucho más legible y no corre el riesgo de que un reemplazo pise al anterior.",
    reward: defaultReward("intermediate"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
];
