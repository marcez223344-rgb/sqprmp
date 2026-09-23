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
      "El departamento de CRM va a cargar la base de clientes de **TiendaViva** en la herramienta de envíos. Esa herramienta trata `ANA@EJEMPLO.LAT` y `ana@ejemplo.lat` como dos personas distintas, así que pide los correos siempre escritos en minúsculas. Te piden empezar por el mercado uruguayo, que es el próximo en migrarse.",
    business_question_md:
      "Debes generar un dataset que devuelva, para los clientes cuyo `country` es igual al texto `'UY'`, el `id`, el `full_name` y su correo pasado a minúsculas en una columna llamada `email_normalizado`. El orden de las filas no importa.",
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
          "Existe una función de texto que convierte cualquier cadena a minúsculas. No necesitas ordenar nada: son las mismas filas de los clientes uruguayos, con una sola columna transformada.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "Usa la función `LOWER()` sobre la columna `email` de la tabla `customers` y renómbrala con `AS` para que salga con el nombre que pide el departamento de CRM. Las otras dos columnas se devuelven tal como están.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT id,\n       full_name,\n       ___(___) AS ___\nFROM customers\nWHERE country = '___';\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "wrong_columns",
        description_md:
          "Devolver la columna calculada sin alias: queda con el nombre `lower` y la herramienta de CRM espera `email_normalizado`.",
      },
      {
        category: "wrong_columns",
        description_md:
          "Usar la función `UPPER` en lugar de `LOWER`: el pedido es explícito sobre el formato en minúsculas.",
      },
      {
        category: "missing_filter",
        description_md:
          "Agregar una condición extra para quedarte solo con los correos que hoy están escritos en mayúsculas: se piden todos los clientes uruguayos, ya estén bien o mal escritos.",
      },
      {
        category: "syntax",
        description_md:
          "Escribir `LOWER email` sin paréntesis: las funciones siempre reciben sus argumentos entre paréntesis.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 123 filas, una por cada cliente uruguayo. La función `LOWER` no modifica la tabla: transforma el valor solo en el resultado de la consulta, así que es una operación segura para explorar datos.\n\nNormalizar en el momento de leer es lo habitual cuando no puedes corregir el origen de los datos. Si el problema se repite, la solución definitiva es normalizar al escribir, o crear un índice sobre `LOWER(email)`, porque aplicar la función a millones de filas en cada consulta cuesta tiempo.\n\nUn detalle útil: la función `LOWER` respeta los acentos, de modo que `LOWER('CAFÉ')` devuelve `café`, pero no los elimina.",
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
      "Antes de migrar la base, el departamento de Datos quiere el listado exacto de los registros a corregir: los clientes cuyo correo **no** está guardado en minúsculas. Son los que generan cuentas duplicadas cuando alguien se registra dos veces escribiendo su correo de forma distinta. Te piden esa lista para corregirla antes de la migración.",
    business_question_md:
      "Debes generar un dataset que devuelva el `id`, el `full_name`, el correo tal como está guardado en la columna `email` y su versión en minúsculas en una columna `email_normalizado`, **solamente** para los clientes cuyo correo almacenado difiere de su versión en minúsculas. El orden de las filas no importa.",
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
          "Un texto que ya está escrito en minúsculas es idéntico a su propia versión en minúsculas. Los registros con problema son justamente aquellos en los que esa igualdad no se cumple.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "En la cláusula `WHERE` compara la columna `email` con el resultado de aplicarle la función `LOWER()`, usando el operador de desigualdad `<>`. En la lista de `SELECT` devuelve las dos versiones, para que el departamento de Datos pueda revisarlas una al lado de la otra.",
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
          "Omitir la cláusula `WHERE`: la consulta devuelve los 3000 clientes en lugar de los que hay que corregir.",
      },
      {
        category: "cell_values",
        description_md:
          "Filtrar con la condición `email = LOWER(email)`: obtienes exactamente el conjunto contrario, es decir, los correos que ya están bien guardados.",
      },
      {
        category: "wrong_columns",
        description_md:
          "Devolver solo el correo normalizado: sin el valor original, el departamento de Datos no puede identificar qué cambió en cada registro.",
      },
      {
        category: "null_handling",
        description_md:
          "Suponer que un correo en `NULL` aparecería en el resultado: la comparación `NULL <> LOWER(NULL)` da `NULL`, no verdadero, así que esas filas quedan fuera del filtro.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 39 filas. Son correos guardados íntegramente en mayúsculas, como `JULIETA.CASTRO109@EJEMPLO.LAT`, un patrón típico de formularios cargados desde una aplicación antigua.\n\nEl patrón `columna <> FUNCION(columna)` sirve para cualquier regla de normalización: la condición `city <> TRIM(city)` encuentra espacios sobrantes y la condición `name <> INITCAP(name)` encuentra nombres mal capitalizados. Es la base de los controles de calidad que vas a ver en la sección 32.\n\nUna aclaración importante: esta consulta detecta el formato incorrecto, no los duplicados. Saber **qué clientes comparten** el mismo correo normalizado requiere comparar filas entre sí, con agrupación o subconsultas, que son las secciones 15 y 21. Aquí el objetivo es aislar los registros sospechosos.",
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
      "El departamento de Seguridad quiere saber desde qué proveedores de correo se registran los clientes: si aparece un dominio inesperado, puede ser una señal de cuentas creadas de forma automática. Te piden ese desglose para la base uruguaya, que es la que están auditando ahora.",
    business_question_md:
      "Debes generar un dataset que, para los clientes cuyo `country` es igual al texto `'UY'`, devuelva el `id`, la parte del correo anterior al carácter `@` en una columna `usuario` y la parte posterior en una columna `dominio`. Debes trabajar siempre sobre el correo pasado a minúsculas, para que los registros mal guardados no generen dominios duplicados. El orden de las filas no importa.",
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
          "Un correo electrónico es un texto partido en dos por un separador conocido. PostgreSQL tiene una función que devuelve directamente el trozo número N de un texto partido por un carácter; también puedes ubicar la posición del carácter `@` y cortar alrededor de ella.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "La función `SPLIT_PART(texto, separador, n)` numera los trozos desde 1: el usuario es el trozo número 1 y el dominio es el número 2, usando el literal `'@'` como separador. Aplica primero la función `LOWER()` al correo, para que los 39 registros guardados en mayúsculas no produzcan un dominio distinto.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT id,\n       SPLIT_PART(___(email), '___', ___) AS usuario,\n       SPLIT_PART(___(email), '___', ___) AS dominio\nFROM customers\nWHERE country = '___';\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "cell_values",
        description_md:
          "Olvidar la función `LOWER`: los correos guardados en mayúsculas producen el dominio `EJEMPLO.LAT`, que en el reporte parece un proveedor distinto.",
      },
      {
        category: "cell_values",
        description_md:
          "Incluir el carácter `@` en alguna de las dos partes, por ejemplo cortando con `LEFT(email, POSITION('@' IN email))` sin restarle 1.",
      },
      {
        category: "cell_values",
        description_md:
          "Numerar los trozos desde 0: la expresión `SPLIT_PART(..., '@', 0)` produce un error, porque la numeración empieza en 1.",
      },
      {
        category: "wrong_columns",
        description_md:
          "Devolver también la columna `email`: la consigna pide exactamente tres columnas, y la herramienta de Seguridad las carga por posición.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 123 filas, una por cliente uruguayo. El hallazgo es que **todos** los dominios son `ejemplo.lat`: no hay proveedores externos ni variantes sospechosas, y eso es exactamente lo que Seguridad quería confirmar.\n\nLa función `SPLIT_PART` y la pareja formada por `POSITION` y `SUBSTRING` son equivalentes en este caso, y ninguna es la correcta por sí sola: `SPLIT_PART` se lee mejor y no falla si el separador no existe, porque devuelve una cadena vacía, mientras que `POSITION` te permite decidir qué hacer cuando el separador falta, porque en ese caso devuelve 0.\n\nCuidado con ese 0: si un texto no tuviera el carácter `@`, la expresión `LEFT(email, 0 - 1)` no da error, sino que devuelve el texto sin su último carácter. Un valor incorrecto que nadie nota es peor que un error que detiene la consulta.",
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
      "El departamento de Producto va a mostrar el nombre de cada tienda en la portada de la aplicación. Los nombres guardados terminan con un número interno, como en `Rincón Urbano 6`, que no debe verse. Además, el espacio disponible en el diseño es limitado, así que también te piden cuántos caracteres ocupa el nombre ya limpio.",
    business_question_md:
      "Debes generar un dataset que devuelva, para cada vendedor, su `id`, el `store_name` original, el nombre sin el número final ni el espacio que lo precede en una columna `nombre_comercial`, y la cantidad de caracteres de ese nombre limpio en una columna `largo`. El orden de las filas no importa.",
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
          "El número siempre está al final, pero no siempre tiene la misma cantidad de dígitos, así que cortar una cantidad fija de caracteres no sirve. Piensa en una limpieza que elimine desde el extremo derecho cualquier carácter que pertenezca a un conjunto, en este caso los dígitos y el espacio.",
        ...defaultHintMeta(1),
      },
      {
        level: 2,
        body_md:
          "La función `RTRIM(texto, caracteres)` elimina por la derecha todos los caracteres que aparezcan en el segundo argumento, hasta encontrar uno que no esté en esa lista. Arma ese conjunto con los diez dígitos y el espacio. Para la columna `largo`, aplica `LENGTH` sobre la misma expresión ya limpia, no sobre `store_name`.",
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
          "Usar `LEFT(store_name, LENGTH(store_name) - 2)`: funciona con los identificadores de un dígito y corta letras del nombre cuando el identificador tiene dos o tres.",
      },
      {
        category: "cell_values",
        description_md:
          "Calcular `LENGTH(store_name)`: mide el nombre con el número incluido, no el nombre que se va a mostrar en la portada.",
      },
      {
        category: "cell_values",
        description_md:
          "Usar `REPLACE(store_name, '0123456789', '')`: la función `REPLACE` busca la cadena completa y no cada carácter por separado, así que no elimina nada.",
      },
      {
        category: "wrong_columns",
        description_md:
          "Omitir la columna `store_name` original: el departamento de Producto la necesita para comparar antes y después de publicar el cambio.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 180 filas, una por vendedor. La expresión `RTRIM(store_name, ' 0123456789')` lee el nombre de derecha a izquierda y descarta caracteres mientras pertenezcan al conjunto indicado: primero los dígitos, después el espacio, y se detiene en la primera letra. Por eso funciona igual con `Bazar Urbano 3` y con `Rincón Tropical 124`.\n\nLas tres soluciones dan el mismo resultado en este dataset, pero no son igual de robustas: la variante que usa `LENGTH(id::text)` depende de que el sufijo sea exactamente el identificador, y la que usa `REPLACE` fallaría si el mismo número apareciera también en el medio del nombre. La función `RTRIM` solo asume que al final hay dígitos y espacios.\n\nMira el caso de `Rincón Urbano`: la función `LENGTH` devuelve 13 porque cuenta **caracteres**, y la letra `ó` es uno solo. La función `OCTET_LENGTH` devolvería 14, porque en la codificación UTF-8 esa letra ocupa dos bytes. Para validar un límite de diseño quieres contar caracteres; para dimensionar almacenamiento, bytes.",
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
      "En **Bolsillo**, cada movimiento de transferencia guarda en la columna `description` un texto del tipo `Transferencia #1841`, donde el número es la referencia que el usuario ve en el comprobante. El departamento de Soporte necesita esa referencia en una columna propia para poder buscarla, y quiere ver el tipo de movimiento con una palabra entendible en lugar de los códigos `transfer_in` y `transfer_out`. Te piden ese listado para las transferencias de importe alto, que son las que más consultas generan.",
    business_question_md:
      "Debes generar un dataset que, tomando los movimientos cuyo `kind` es `'transfer_in'` o `'transfer_out'` **y cuyo `amount` supera los 900 000 centavos**, devuelva el `id`, el `account_id`, la referencia numérica extraída de `description` en una columna `referencia`, como texto y sin el carácter `#`, y una columna `tipo` que valga `Enviada` para el tipo `'transfer_out'` y `Recibida` para el tipo `'transfer_in'`. El orden de las filas no importa.",
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
          "Para la referencia, parte la columna `description` por el literal `'#'` y quédate con el segundo trozo, o corta desde la posición del `#` más uno. Para el tipo, anida dos llamadas a `REPLACE`: el resultado de la primera es el argumento de la segunda. Filtra con la condición `kind IN (...)`.",
        ...defaultHintMeta(2),
      },
      {
        level: 3,
        body_md:
          "```sql\nSELECT id,\n       account_id,\n       SPLIT_PART(description, '___', ___) AS referencia,\n       ___(___(kind, '___', '___'), '___', '___') AS tipo\nFROM transactions\nWHERE kind ___ (___, ___)\n  AND amount > ___;\n```",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      {
        category: "missing_filter",
        description_md:
          "No filtrar por la columna `kind`: los movimientos de tipo `'topup'`, `'fee'` o `'reversal'` también tienen descripción, pero sin el carácter `#`, y producen referencias vacías.",
      },
      {
        category: "cell_values",
        description_md:
          "Dejar el carácter `#` dentro de la columna `referencia`, por ejemplo escribiendo `SUBSTRING(description FROM POSITION('#' IN description))` sin sumarle 1.",
      },
      {
        category: "cell_values",
        description_md:
          "Aplicar las dos llamadas a `REPLACE` por separado sobre `kind` en lugar de anidarlas: la segunda pierde el cambio que hizo la primera.",
      },
      {
        category: "cell_values",
        description_md:
          "Reemplazar primero el texto `'transfer_in'`: en este caso no afecta al valor `'transfer_out'`, pero conviene revisar siempre el orden cuando un texto buscado es prefijo de otro.",
      },
    ],
    expert_explanation_md:
      "El resultado de la consulta da 184 filas, que corresponden a 92 transferencias de importe alto: cada una aparece dos veces, una con su movimiento de salida y otra con su movimiento de entrada, así que cada referencia se repite exactamente dos veces.\n\nLa expresión `SPLIT_PART(description, '#', 2)` devuelve **texto** y no un número: si Soporte necesitara ordenarlo numéricamente habría que convertirlo con `CAST(... AS integer)`. Para buscar un comprobante, el texto alcanza.\n\nEl filtro por la columna `kind` y el filtro `description LIKE 'Transferencia #%'` devuelven las mismas 184 filas en este dataset, pero no son lo mismo: el primero se apoya en un campo controlado y el segundo en texto libre, que cualquier cambio de redacción rompería. Cuando existe una columna de estado o de tipo, conviene filtrar por ella.\n\nAnidar llamadas a `REPLACE` funciona bien para dos valores; con más reglas, la expresión `CASE`, que viste en la sección 12, es mucho más legible y no corre el riesgo de que un reemplazo pise al anterior.",
    reward: defaultReward("intermediate"),
    solution_unlock: defaultSolutionUnlock,
    is_published: true,
  },
];
